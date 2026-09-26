-- ==============================================================================
-- 🏛️ MIGRATION 506: ENTERPRISE EAR LEADERBOARD SCORES & HALL OF EAR 2027
-- ==============================================================================
-- 1. Tabelle public.student_ear_scores (Echte Highscores pro Schüler, Disziplin & VdM-Stufe)
-- 2. Covering-Index idx_student_ear_scores_rank
-- 3. RLS-Policies für strikte Mandantentrennung & DSGVO Art. 25 Abs. 2 Ghost-Mode
-- 4. Autoritativer RPC public.record_ear_training_session(...) mit XP-Gutschrift
-- 5. Autoritativer RPC public.get_school_ear_leaderboard(...) mit Nickname & Ranking
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Tabelle: student_ear_scores
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_ear_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    school_id BIGINT NOT NULL,
    discipline TEXT NOT NULL CHECK (discipline IN ('intervals', 'chords', 'pitch_match', 'all')),
    vdm_level TEXT NOT NULL CHECK (vdm_level IN ('d1', 'd2', 'd3')),
    score INTEGER NOT NULL DEFAULT 0,
    accuracy INTEGER NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
    max_streak INTEGER NOT NULL DEFAULT 0,
    avg_response_time_ms INTEGER NOT NULL DEFAULT 0,
    instrument TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_ear_score UNIQUE (user_id, discipline, vdm_level)
);

-- ------------------------------------------------------------------------------
-- 2. Covering Indexe für sub-10ms Leaderboard-Abfragen
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_student_ear_scores_rank 
    ON public.student_ear_scores(school_id, discipline, vdm_level, score DESC, accuracy DESC, updated_at ASC);

CREATE INDEX IF NOT EXISTS idx_student_ear_scores_user 
    ON public.student_ear_scores(user_id);

-- ------------------------------------------------------------------------------
-- 3. Row Level Security (RLS) & Multi-Tenancy Guard
-- ------------------------------------------------------------------------------
ALTER TABLE public.student_ear_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_ear_scores FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ear_scores_select_policy" ON public.student_ear_scores;
CREATE POLICY "ear_scores_select_policy" ON public.student_ear_scores
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
                WHERE srp.user_id = student_ear_scores.user_id 
                  AND srp.is_public = TRUE
            )
        )
        -- ODER Lehrkraft / Verwaltung der Schule
        OR (
            school_id = (SELECT ur.school_id FROM public.users_raw ur WHERE ur.id = auth.uid())
            AND (SELECT ur.role FROM public.users_raw ur WHERE ur.id = auth.uid()) IN ('admin', 'secretary', 'teacher')
        )
    );

DROP POLICY IF EXISTS "ear_scores_insert_update_policy" ON public.student_ear_scores;
CREATE POLICY "ear_scores_insert_update_policy" ON public.student_ear_scores
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 4. Autoritativer RPC: record_ear_training_session
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_ear_training_session(
    p_discipline TEXT,
    p_vdm_level TEXT,
    p_accuracy INTEGER,
    p_streak INTEGER,
    p_avg_response_time_ms INTEGER DEFAULT 0,
    p_instrument TEXT DEFAULT NULL,
    p_score INTEGER DEFAULT NULL,
    p_xp INTEGER DEFAULT 0,
    p_student_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id BIGINT;
    v_target_user_id UUID;
    v_target_school_id BIGINT;
    v_instrument TEXT;
    v_existing_score INTEGER;
    v_existing_accuracy INTEGER;
    v_existing_streak INTEGER;
    v_calculated_score INTEGER;
    v_speed_factor NUMERIC;
    v_level_multiplier NUMERIC;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Nicht authentifiziert.';
    END IF;

    -- Caller-Informationen laden
    SELECT ur.school_id, ur.role
    INTO v_caller_school_id, v_caller_role
    FROM public.users_raw ur
    WHERE ur.id = v_caller_id;

    IF v_caller_school_id IS NULL THEN
        RAISE EXCEPTION 'Benutzerprofil des Aufrufers nicht gefunden.';
    END IF;

    -- Zielbenutzer ermitteln (Schüler selbst oder via Lehrkraft/Admin)
    IF p_student_id IS NOT NULL AND p_student_id <> v_caller_id THEN
        -- Nur Lehrkraft, Verwaltung oder Master-Admin dürfen für Schüler buchen
        IF v_caller_role NOT IN ('admin', 'secretary', 'teacher') THEN
            RAISE EXCEPTION 'Keine Berechtigung zur Score-Erfassung für andere Schüler.';
        END IF;

        SELECT ur.school_id, COALESCE(NULLIF(TRIM(p_instrument), ''), ur.instrument, 'Musiker')
        INTO v_target_school_id, v_instrument
        FROM public.users_raw ur
        WHERE ur.id = p_student_id;

        IF v_target_school_id IS NULL OR v_target_school_id <> v_caller_school_id THEN
            RAISE EXCEPTION 'Schüler existiert nicht oder gehört nicht zur gleichen Schule.';
        END IF;

        v_target_user_id := p_student_id;
    ELSE
        v_target_user_id := v_caller_id;
        v_target_school_id := v_caller_school_id;
        SELECT COALESCE(NULLIF(TRIM(p_instrument), ''), ur.instrument, 'Musiker')
        INTO v_instrument
        FROM public.users_raw ur
        WHERE ur.id = v_caller_id;
    END IF;

    -- Speed & VdM Multiplier Berechnung
    v_level_multiplier := CASE p_vdm_level
        WHEN 'd1' THEN 1.0
        WHEN 'd2' THEN 1.25
        WHEN 'd3' THEN 1.5
        ELSE 1.0
    END;

    -- Antwortzeit-Faktor: schneller als 3s gibt Speed-Bonus (max 2.0x, min 0.5x)
    IF p_avg_response_time_ms > 0 THEN
        v_speed_factor := GREATEST(0.5, LEAST(2.0, 3000.0 / GREATEST(600, p_avg_response_time_ms)::NUMERIC));
    ELSE
        v_speed_factor := 1.0;
    END IF;

    -- Score berechnen falls nicht explizit übergeben
    IF p_score IS NOT NULL AND p_score > 0 THEN
        v_calculated_score := p_score;
    ELSE
        v_calculated_score := ROUND((p_accuracy::NUMERIC * v_speed_factor * v_level_multiplier) + (p_streak * 5))::INTEGER;
    END IF;

    -- Bestehenden Score prüfen (nur PR überschreiben oder bei besserem Streak/Accuracy)
    SELECT score, accuracy, max_streak 
    INTO v_existing_score, v_existing_accuracy, v_existing_streak
    FROM public.student_ear_scores
    WHERE user_id = v_target_user_id 
      AND discipline = p_discipline 
      AND vdm_level = p_vdm_level;

    IF NOT FOUND THEN
        INSERT INTO public.student_ear_scores (
            user_id, school_id, discipline, vdm_level, score, accuracy, max_streak, avg_response_time_ms, instrument, updated_at
        ) VALUES (
            v_target_user_id, v_target_school_id, p_discipline, p_vdm_level, v_calculated_score, p_accuracy, p_streak, p_avg_response_time_ms, v_instrument, NOW()
        );
    ELSE
        -- Update nur wenn neuer Score höher ist, oder gleicher Score mit höherer Genauigkeit
        IF v_calculated_score > v_existing_score OR (v_calculated_score = v_existing_score AND p_accuracy > v_existing_accuracy) THEN
            UPDATE public.student_ear_scores
            SET score = v_calculated_score,
                accuracy = p_accuracy,
                max_streak = GREATEST(p_streak, v_existing_streak),
                avg_response_time_ms = p_avg_response_time_ms,
                instrument = v_instrument,
                updated_at = NOW()
            WHERE user_id = v_target_user_id 
              AND discipline = p_discipline 
              AND vdm_level = p_vdm_level;
        END IF;
    END IF;

    -- XP Belohnung direkt atomar buchen (falls übergeben)
    IF p_xp > 0 THEN
        UPDATE public.avatars
        SET xp = COALESCE(xp, 0) + p_xp,
            updated_at = NOW()
        WHERE user_id = v_target_user_id;

        UPDATE public.student_stats
        SET current_xp = COALESCE(current_xp, 0) + p_xp,
            updated_at = NOW()
        WHERE student_id = v_target_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'userId', v_target_user_id,
        'discipline', p_discipline,
        'vdm_level', p_vdm_level,
        'score', v_calculated_score,
        'accuracy', p_accuracy,
        'streak', p_streak,
        'xpAwarded', p_xp
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. Autoritativer RPC: get_school_ear_leaderboard
-- Liefert nur echte User mit öffentlichem Nickname (Zero Dummy Doktrin)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_school_ear_leaderboard(
    p_discipline TEXT,
    p_vdm_level TEXT,
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
    v_caller_school_id BIGINT;
    v_is_master BOOLEAN := FALSE;
    v_school_id BIGINT;
    v_results JSONB;
BEGIN
    v_caller_id := auth.uid();
    
    -- Ermittle Schule des Callers falls authentifiziert
    IF v_caller_id IS NOT NULL THEN
        SELECT ur.school_id, COALESCE(ur.is_master_admin, FALSE)
        INTO v_caller_school_id, v_is_master
        FROM public.users_raw ur 
        WHERE ur.id = v_caller_id;

        -- Tenant-Schutz (BOLA Guard): Authentifizierte User dürfen nicht fremde Schulen einsehen
        IF NOT v_is_master AND v_caller_school_id IS NOT NULL THEN
            v_school_id := v_caller_school_id;
        ELSE
            v_school_id := COALESCE(p_school_id, v_caller_school_id);
        END IF;
    ELSE
        -- Anonyme Abfrage (z. B. Kiosk / Showcase): Verlangt explizite School-ID
        v_school_id := p_school_id;
    END IF;

    IF v_school_id IS NULL THEN
        RETURN jsonb_build_array();
    END IF;

    -- Lade echte Ranglisten-Einträge mit aktivem Public Nickname
    SELECT COALESCE(jsonb_agg(sub.entry), jsonb_build_array())
    INTO v_results
    FROM (
        SELECT jsonb_build_object(
            'id', ses.id,
            'rank', ROW_NUMBER() OVER (ORDER BY ses.score DESC, ses.accuracy DESC, ses.max_streak DESC, ses.updated_at ASC),
            'name', srp.nickname,
            'instrument', COALESCE(ses.instrument, 'Musiker'),
            'score', ses.score,
            'accuracy', ses.accuracy,
            'maxStreak', ses.max_streak,
            'avgResponseTimeMs', ses.avg_response_time_ms,
            'isCurrentUser', (ses.user_id = v_caller_id)
        ) AS entry
        FROM public.student_ear_scores ses
        INNER JOIN public.student_ranking_profiles srp 
            ON srp.user_id = ses.user_id 
           AND srp.is_public = TRUE
        WHERE ses.school_id = v_school_id
          AND ses.discipline = p_discipline
          AND ses.vdm_level = p_vdm_level
          AND (
              p_instrument IS NULL 
              OR p_instrument = 'all' 
              OR LOWER(TRIM(ses.instrument)) = LOWER(TRIM(p_instrument))
          )
        ORDER BY ses.score DESC, ses.accuracy DESC, ses.max_streak DESC, ses.updated_at ASC
        LIMIT 10
    ) sub;

    RETURN v_results;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_ear_training_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_school_ear_leaderboard TO authenticated, anon;
