-- ==============================================================================
-- 🏛️ MIGRATION 401: ENTERPRISE GROOVE SPEED MULTIPLIER & LEADERBOARD RANKING
-- ==============================================================================
-- 1. Ergänzung Spalte public.student_groove_scores.score (Speed-Weighted Score)
-- 2. Aktualisierung public.record_student_groove_score(...) mit Tempo-Multiplikator
-- 3. Aktualisierung public.get_school_groove_leaderboard(...) mit Sortierung nach Score & BPM
-- ==============================================================================

-- 1. Spalte hinzufügen (falls noch nicht existent)
ALTER TABLE public.student_groove_scores 
ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_student_groove_scores_speed_rank 
ON public.student_groove_scores(school_id, level, score DESC, accuracy DESC, bpm DESC);

-- 2. Autoritativer RPC: record_student_groove_score mit Tempobewertung
CREATE OR REPLACE FUNCTION public.record_student_groove_score(
    p_level TEXT,
    p_accuracy INTEGER,
    p_streak INTEGER,
    p_bpm INTEGER,
    p_instrument TEXT DEFAULT NULL,
    p_score INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_school_id BIGINT;
    v_instrument TEXT;
    v_existing_score INTEGER;
    v_existing_accuracy INTEGER;
    v_existing_streak INTEGER;
    v_calculated_score INTEGER;
    v_base_bpm INTEGER;
    v_level_multiplier NUMERIC;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Nicht authentifiziert.';
    END IF;

    -- Ermittle Basis-BPM und Multiplikator für die Stufe falls p_score nicht übergeben wurde
    v_base_bpm := CASE p_level
        WHEN 'viertel' THEN 80
        WHEN 'rock_mix' THEN 85
        WHEN 'synkopen' THEN 90
        WHEN 'galopp' THEN 85
        WHEN 'latin_bossa' THEN 90
        WHEN 'funk_master' THEN 95
        WHEN 'shuffle' THEN 75
        WHEN 'random_groove' THEN 85
        ELSE 85
    END;

    v_level_multiplier := CASE p_level
        WHEN 'viertel' THEN 1.0
        WHEN 'rock_mix' THEN 1.2
        WHEN 'synkopen' THEN 1.3
        WHEN 'galopp' THEN 1.4
        WHEN 'latin_bossa' THEN 1.5
        WHEN 'funk_master' THEN 1.6
        WHEN 'shuffle' THEN 1.6
        WHEN 'random_groove' THEN 1.8
        ELSE 1.0
    END;

    -- Speed-Weighted Formel: round(Accuracy * (BPM / Basis-BPM) * LevelMultiplier)
    IF p_score IS NOT NULL AND p_score > 0 THEN
        v_calculated_score := p_score;
    ELSE
        v_calculated_score := ROUND(p_accuracy::NUMERIC * (GREATEST(40, p_bpm)::NUMERIC / v_base_bpm::NUMERIC) * v_level_multiplier)::INTEGER;
    END IF;

    -- Benutzer-Informationen laden
    SELECT ur.school_id, COALESCE(p_instrument, ur.instrument, 'Musiker')
    INTO v_school_id, v_instrument
    FROM public.users_raw ur
    WHERE ur.id = v_caller_id;

    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'Benutzerprofil nicht gefunden.';
    END IF;

    -- Bestehenden Score prüfen
    SELECT score, accuracy, max_streak 
    INTO v_existing_score, v_existing_accuracy, v_existing_streak
    FROM public.student_groove_scores
    WHERE user_id = v_caller_id AND level = p_level;

    IF NOT FOUND THEN
        INSERT INTO public.student_groove_scores (
            user_id, school_id, level, score, accuracy, max_streak, bpm, instrument, updated_at
        ) VALUES (
            v_caller_id, v_school_id, p_level, v_calculated_score, p_accuracy, p_streak, p_bpm, v_instrument, NOW()
        );
    ELSE
        -- Update wenn neuer Speed-Score höher ist, oder bei gleichem Score bessere Accuracy/Streak
        IF v_calculated_score > v_existing_score 
           OR (v_calculated_score = v_existing_score AND p_accuracy > v_existing_accuracy)
           OR (v_calculated_score = v_existing_score AND p_accuracy = v_existing_accuracy AND p_streak > v_existing_streak) THEN
            UPDATE public.student_groove_scores
            SET score = v_calculated_score,
                accuracy = p_accuracy,
                max_streak = p_streak,
                bpm = p_bpm,
                instrument = v_instrument,
                updated_at = NOW()
            WHERE user_id = v_caller_id AND level = p_level;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'level', p_level,
        'score', v_calculated_score,
        'accuracy', p_accuracy,
        'streak', p_streak,
        'bpm', p_bpm
    );
END;
$$;

-- 3. Autoritativer RPC: get_school_groove_leaderboard mit Score und Ranking
CREATE OR REPLACE FUNCTION public.get_school_groove_leaderboard(
    p_level TEXT,
    p_instrument TEXT DEFAULT NULL,
    p_school_id BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_school_id BIGINT;
    v_results JSONB;
BEGIN
    v_caller_id := auth.uid();
    
    IF p_school_id IS NOT NULL THEN
        v_school_id := p_school_id;
    ELSIF v_caller_id IS NOT NULL THEN
        SELECT school_id INTO v_school_id FROM public.users_raw WHERE id = v_caller_id;
    END IF;

    IF v_school_id IS NULL THEN
        RETURN jsonb_build_array();
    END IF;

    -- Lade nur echte Schüler, deren Profil 'is_public = TRUE' ist
    SELECT COALESCE(jsonb_agg(sub.entry), jsonb_build_array())
    INTO v_results
    FROM (
        SELECT jsonb_build_object(
            'id', sgs.id,
            'rank', ROW_NUMBER() OVER (ORDER BY sgs.score DESC, sgs.accuracy DESC, sgs.bpm DESC, sgs.updated_at ASC),
            'name', srp.nickname,
            'instrument', COALESCE(sgs.instrument, 'Musiker'),
            'score', sgs.score,
            'accuracy', sgs.accuracy,
            'maxStreak', sgs.max_streak,
            'bpm', sgs.bpm,
            'isCurrentUser', (sgs.user_id = v_caller_id)
        ) AS entry
        FROM public.student_groove_scores sgs
        INNER JOIN public.student_ranking_profiles srp 
            ON srp.user_id = sgs.user_id 
           AND srp.is_public = TRUE
        WHERE sgs.school_id = v_school_id
          AND sgs.level = p_level
          AND (
              p_instrument IS NULL 
              OR p_instrument = 'all' 
              OR LOWER(TRIM(sgs.instrument)) = LOWER(TRIM(p_instrument))
          )
        ORDER BY sgs.score DESC, sgs.accuracy DESC, sgs.bpm DESC, sgs.updated_at ASC
        LIMIT 10
    ) sub;

    RETURN v_results;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_student_groove_score TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_school_groove_leaderboard TO authenticated, anon;
