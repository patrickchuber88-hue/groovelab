-- ==============================================================================
-- 🌍 MIGRATION 507: ENTERPRISE WORLD TOUR CHALLENGE MASTERY & HARMONIZED XP
-- ==============================================================================
-- Refines public.save_worldtour_country_mastery:
-- 1. Drops legacy 5-parameter signature to prevent PostgREST ambiguous function errors.
-- 2. Supports optional p_student_id for teacher/admin progress documentation.
-- 3. Removes the forced 1-star floor (allows 0 stars on failed attempts).
-- 4. Sets is_unlocked = (v_final_stars >= 1).
-- 5. Atomically credits XP to public.student_stats(current_xp) and public.avatars(xp).
-- 6. Harmonized XP Scale: 1★ = +50 XP, 2★ = +100 XP, 3★ = +150 XP.
-- ==============================================================================

-- 1. Clean up legacy 5-parameter signature from Migration 467
DROP FUNCTION IF EXISTS public.save_worldtour_country_mastery(TEXT, INTEGER, INTEGER, INTEGER, TEXT);

-- 2. Create authoritative 6-parameter signature
CREATE OR REPLACE FUNCTION public.save_worldtour_country_mastery(
    p_country_code TEXT,
    p_stars INTEGER,
    p_score_percent INTEGER,
    p_tempo_bpm INTEGER,
    p_instrument TEXT DEFAULT '',
    p_student_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_user_id UUID;
    v_school_id UUID;
    v_clean_country TEXT;
    v_existing_stars INTEGER := 0;
    v_existing_score INTEGER := 0;
    v_final_stars INTEGER;
    v_final_score INTEGER;
    v_xp_awarded INTEGER := 0;
    v_now TIMESTAMPTZ := now();
    v_record public.student_worldtour_progress%ROWTYPE;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    v_school_id := public.get_current_user_school_id();
    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'Active school tenant context required.' USING ERRCODE = '42501';
    END IF;

    -- Target student authorization: If documenting for another student, caller must be teacher or admin
    IF p_student_id IS NOT NULL AND p_student_id <> v_caller_id THEN
        IF NOT public.is_current_user_admin_or_teacher() THEN
            RAISE EXCEPTION 'Only teachers and administrators can record progress for other students.' USING ERRCODE = '42501';
        END IF;
        v_user_id := p_student_id;
    ELSE
        v_user_id := v_caller_id;
    END IF;

    -- Verify target student belongs to current school tenant
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = v_user_id AND school_id = v_school_id
    ) THEN
        RAISE EXCEPTION 'Target student does not belong to active school tenant.' USING ERRCODE = '42501';
    END IF;

    v_clean_country := UPPER(TRIM(COALESCE(p_country_code, '')));
    IF LENGTH(v_clean_country) < 2 THEN
        RAISE EXCEPTION 'Invalid country code.' USING ERRCODE = '22023';
    END IF;

    -- Fetch existing progress
    SELECT stars, best_score_percent 
    INTO v_existing_stars, v_existing_score
    FROM public.student_worldtour_progress
    WHERE student_id = v_user_id AND country_code = v_clean_country;

    v_existing_stars := COALESCE(v_existing_stars, 0);
    v_existing_score := COALESCE(v_existing_score, 0);

    -- Mastery calculation: Allow 0 stars (no forced 1-star floor); score and stars never degrade
    v_final_stars := GREATEST(v_existing_stars, LEAST(3, GREATEST(0, p_stars)));
    v_final_score := GREATEST(v_existing_score, LEAST(100, GREATEST(0, p_score_percent)));

    -- Harmonized XP Differential: 1★ = +50 XP, 2★ = +100 XP, 3★ = +150 XP
    IF v_final_stars > v_existing_stars THEN
        v_xp_awarded := (v_final_stars - v_existing_stars) * 50;
    END IF;

    -- Upsert record
    INSERT INTO public.student_worldtour_progress (
        school_id,
        student_id,
        country_code,
        stars,
        best_score_percent,
        best_tempo_bpm,
        instrument,
        is_unlocked,
        unlocked_at,
        created_at,
        updated_at
    )
    VALUES (
        v_school_id,
        v_user_id,
        v_clean_country,
        v_final_stars,
        v_final_score,
        GREATEST(0, p_tempo_bpm),
        COALESCE(p_instrument, ''),
        (v_final_stars >= 1),
        CASE WHEN v_final_stars >= 1 THEN v_now ELSE NULL END,
        v_now,
        v_now
    )
    ON CONFLICT (student_id, country_code)
    DO UPDATE SET
        stars = v_final_stars,
        best_score_percent = v_final_score,
        best_tempo_bpm = GREATEST(student_worldtour_progress.best_tempo_bpm, EXCLUDED.best_tempo_bpm),
        instrument = CASE WHEN EXCLUDED.instrument <> '' THEN EXCLUDED.instrument ELSE student_worldtour_progress.instrument END,
        is_unlocked = (v_final_stars >= 1 OR student_worldtour_progress.is_unlocked),
        unlocked_at = CASE 
            WHEN student_worldtour_progress.unlocked_at IS NOT NULL THEN student_worldtour_progress.unlocked_at
            WHEN v_final_stars >= 1 THEN v_now
            ELSE NULL
        END,
        updated_at = v_now
    RETURNING * INTO v_record;

    -- Atomically credit XP to avatars and student_stats
    IF v_xp_awarded > 0 THEN
        UPDATE public.avatars
        SET xp = COALESCE(xp, 0) + v_xp_awarded,
            updated_at = v_now
        WHERE user_id = v_user_id;

        UPDATE public.student_stats
        SET current_xp = COALESCE(current_xp, 0) + v_xp_awarded,
            updated_at = v_now
        WHERE student_id = v_user_id;
    END IF;

    -- Revisionssicheres Audit-Logging
    BEGIN
        INSERT INTO public.audit_logs (
            school_id,
            user_id,
            action,
            entity,
            entity_id,
            details,
            created_at
        ) VALUES (
            v_school_id,
            v_caller_id,
            'WORLD_TOUR_COUNTRY_MASTERED',
            'student_worldtour_progress',
            v_record.id,
            jsonb_build_object(
                'country_code', v_clean_country,
                'student_id', v_user_id,
                'stars', v_final_stars,
                'score_percent', v_final_score,
                'xp_awarded', v_xp_awarded,
                'instrument', p_instrument
            ),
            v_now
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'country_code', v_clean_country,
        'student_id', v_user_id,
        'stars', v_final_stars,
        'best_score_percent', v_final_score,
        'best_tempo_bpm', v_record.best_tempo_bpm,
        'xp_awarded', v_xp_awarded,
        'is_unlocked', (v_final_stars >= 1),
        'unlocked_at', v_record.unlocked_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_worldtour_country_mastery(TEXT, INTEGER, INTEGER, INTEGER, TEXT, UUID) TO authenticated, anon;
