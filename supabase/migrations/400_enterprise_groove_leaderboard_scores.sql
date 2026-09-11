-- ==============================================================================
-- 🏛️ MIGRATION 400: ENTERPRISE GROOVE LEADERBOARD SCORES (ZERO DUMMY ARCHITECTURE)
-- ==============================================================================
-- 1. Tabelle public.student_groove_scores (Echte Highscores pro Schüler & Rhythmus-Stufe)
-- 2. Autoritativer RPC public.record_student_groove_score(...)
-- 3. Autoritativer RPC public.get_school_groove_leaderboard(...) mit Filter auf Schule & Instrument
-- 4. RLS-Policies für strikte Mandantentrennung und Datenschutz (Art. 25 Abs. 2 DSGVO)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Tabelle: student_groove_scores
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_groove_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    school_id BIGINT NOT NULL,
    level TEXT NOT NULL,
    accuracy INTEGER NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
    max_streak INTEGER NOT NULL DEFAULT 0,
    bpm INTEGER NOT NULL DEFAULT 80,
    instrument TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_groove_score UNIQUE (user_id, level)
);

CREATE INDEX IF NOT EXISTS idx_student_groove_scores_lookup 
    ON public.student_groove_scores(school_id, level, accuracy DESC, max_streak DESC);

CREATE INDEX IF NOT EXISTS idx_student_groove_scores_user 
    ON public.student_groove_scores(user_id);

-- ------------------------------------------------------------------------------
-- 2. Row Level Security (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.student_groove_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "groove_scores_select_policy" ON public.student_groove_scores;
CREATE POLICY "groove_scores_select_policy" ON public.student_groove_scores
    FOR SELECT
    TO authenticated
    USING (
        -- Eigener Datensatz
        user_id = auth.uid()
        -- ODER Schulinterner Zugriff für registrierte Schüler mit öffentlichem Ranking
        OR (
            school_id = (SELECT ur.school_id FROM public.users_raw ur WHERE ur.id = auth.uid())
            AND EXISTS (
                SELECT 1 FROM public.student_ranking_profiles srp 
                WHERE srp.user_id = student_groove_scores.user_id 
                  AND srp.is_public = TRUE
            )
        )
        -- ODER Lehrkraft / Verwaltung der Schule
        OR (
            school_id = (SELECT ur.school_id FROM public.users_raw ur WHERE ur.id = auth.uid())
            AND (SELECT ur.role FROM public.users_raw ur WHERE ur.id = auth.uid()) IN ('admin', 'secretary', 'teacher')
        )
    );

DROP POLICY IF EXISTS "groove_scores_insert_update_policy" ON public.student_groove_scores;
CREATE POLICY "groove_scores_insert_update_policy" ON public.student_groove_scores
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 3. Autoritativer RPC: record_student_groove_score
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_student_groove_score(
    p_level TEXT,
    p_accuracy INTEGER,
    p_streak INTEGER,
    p_bpm INTEGER,
    p_instrument TEXT DEFAULT NULL
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
    v_existing_accuracy INTEGER;
    v_existing_streak INTEGER;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Nicht authentifiziert.';
    END IF;

    -- Benutzer-Informationen laden
    SELECT ur.school_id, COALESCE(p_instrument, ur.instrument, 'Musiker')
    INTO v_school_id, v_instrument
    FROM public.users_raw ur
    WHERE ur.id = v_caller_id;

    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'Benutzerprofil nicht gefunden.';
    END IF;

    -- Bestehenden Score prüfen (nur PR überschreiben oder bei besserem Streak)
    SELECT accuracy, max_streak 
    INTO v_existing_accuracy, v_existing_streak
    FROM public.student_groove_scores
    WHERE user_id = v_caller_id AND level = p_level;

    IF NOT FOUND THEN
        INSERT INTO public.student_groove_scores (
            user_id, school_id, level, accuracy, max_streak, bpm, instrument, updated_at
        ) VALUES (
            v_caller_id, v_school_id, p_level, p_accuracy, p_streak, p_bpm, v_instrument, NOW()
        );
    ELSE
        -- Update nur wenn neue Genauigkeit höher ist, oder gleiche Genauigkeit mit höherem Streak
        IF p_accuracy > v_existing_accuracy OR (p_accuracy = v_existing_accuracy AND p_streak > v_existing_streak) THEN
            UPDATE public.student_groove_scores
            SET accuracy = p_accuracy,
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
        'accuracy', p_accuracy,
        'streak', p_streak
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Autoritativer RPC: get_school_groove_leaderboard
-- Liefert nur echte User mit öffentlichem Nickname (Zero Dummy)
-- ------------------------------------------------------------------------------
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
    
    -- Ermittle Schule des Callers falls nicht übergeben
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
            'rank', ROW_NUMBER() OVER (ORDER BY sgs.accuracy DESC, sgs.max_streak DESC, sgs.updated_at ASC),
            'name', srp.nickname,
            'instrument', COALESCE(sgs.instrument, 'Musiker'),
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
        ORDER BY sgs.accuracy DESC, sgs.max_streak DESC, sgs.updated_at ASC
        LIMIT 10
    ) sub;

    RETURN v_results;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_student_groove_score TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_school_groove_leaderboard TO authenticated, anon;
