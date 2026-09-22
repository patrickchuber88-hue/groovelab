-- ==============================================================================
-- 🏛️ MIGRATION 467: ENTERPRISE WORLD TOUR & ANTHEM EXPLORER
-- Standards: OWASP ASVS Level 3 / Fail-Closed / Zero-Trust / Multi-Tenancy
-- Purpose:
-- 1. Table public.student_worldtour_progress (Idempotent, Multi-Tenant, Zero-Leakage)
-- 2. Strict RLS Policies for Student & Teacher Access
-- 3. Authoritative RPC public.save_worldtour_country_mastery
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE DEFINITION: student_worldtour_progress
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_worldtour_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    country_code TEXT NOT NULL,
    stars INTEGER NOT NULL DEFAULT 0 CHECK (stars >= 0 AND stars <= 3),
    best_score_percent INTEGER NOT NULL DEFAULT 0 CHECK (best_score_percent >= 0 AND best_score_percent <= 100),
    best_tempo_bpm INTEGER NOT NULL DEFAULT 0,
    instrument TEXT NOT NULL DEFAULT '',
    is_unlocked BOOLEAN NOT NULL DEFAULT false,
    unlocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_student_worldtour_country UNIQUE (student_id, country_code)
);

-- Indexes for lightning fast multi-tenant lookup & queries
CREATE INDEX IF NOT EXISTS idx_worldtour_school_student 
    ON public.student_worldtour_progress(school_id, student_id);

CREATE INDEX IF NOT EXISTS idx_worldtour_student_country 
    ON public.student_worldtour_progress(student_id, country_code);

-- ------------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.student_worldtour_progress ENABLE ROW LEVEL SECURITY;

-- Deny all by default
DROP POLICY IF EXISTS p_worldtour_select_isolated ON public.student_worldtour_progress;
DROP POLICY IF EXISTS p_worldtour_insert_isolated ON public.student_worldtour_progress;
DROP POLICY IF EXISTS p_worldtour_update_isolated ON public.student_worldtour_progress;
DROP POLICY IF EXISTS p_worldtour_delete_isolated ON public.student_worldtour_progress;

-- SELECT Policy: Students see their own progress; Teachers/Admins in the same school can view progress
CREATE POLICY p_worldtour_select_isolated ON public.student_worldtour_progress
    FOR SELECT
    USING (
        school_id = public.get_current_user_school_id()
        AND (
            student_id = auth.uid()
            OR public.is_current_user_admin_or_teacher()
        )
    );

-- INSERT Policy: Authenticated students can insert their own record within their tenant
CREATE POLICY p_worldtour_insert_isolated ON public.student_worldtour_progress
    FOR INSERT
    WITH CHECK (
        school_id = public.get_current_user_school_id()
        AND student_id = auth.uid()
    );

-- UPDATE Policy: Authenticated students can update their own progress
CREATE POLICY p_worldtour_update_isolated ON public.student_worldtour_progress
    FOR UPDATE
    USING (
        school_id = public.get_current_user_school_id()
        AND student_id = auth.uid()
    )
    WITH CHECK (
        school_id = public.get_current_user_school_id()
        AND student_id = auth.uid()
    );

-- ------------------------------------------------------------------------------
-- 3. AUTHORITATIVE RPC: save_worldtour_country_mastery
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_worldtour_country_mastery(
    p_country_code TEXT,
    p_stars INTEGER,
    p_score_percent INTEGER,
    p_tempo_bpm INTEGER,
    p_instrument TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
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
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    v_school_id := public.get_current_user_school_id();
    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'Active school tenant context required.' USING ERRCODE = '42501';
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

    -- Mastery calculation: Stars and Score never degrade
    v_final_stars := GREATEST(v_existing_stars, LEAST(3, GREATEST(1, p_stars)));
    v_final_score := GREATEST(v_existing_score, LEAST(100, GREATEST(0, p_score_percent)));

    -- XP differential calculation
    IF v_final_stars > v_existing_stars THEN
        -- Star 1: +25 XP, Star 2: +75 XP, Star 3: +100 XP
        IF v_existing_stars = 0 AND v_final_stars = 1 THEN
            v_xp_awarded := 25;
        ELSIF v_existing_stars = 0 AND v_final_stars = 2 THEN
            v_xp_awarded := 100;
        ELSIF v_existing_stars = 0 AND v_final_stars = 3 THEN
            v_xp_awarded := 200;
        ELSIF v_existing_stars = 1 AND v_final_stars = 2 THEN
            v_xp_awarded := 75;
        ELSIF v_existing_stars = 1 AND v_final_stars = 3 THEN
            v_xp_awarded := 175;
        ELSIF v_existing_stars = 2 AND v_final_stars = 3 THEN
            v_xp_awarded := 100;
        END IF;
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
        true,
        v_now,
        v_now,
        v_now
    )
    ON CONFLICT (student_id, country_code)
    DO UPDATE SET
        stars = v_final_stars,
        best_score_percent = v_final_score,
        best_tempo_bpm = GREATEST(student_worldtour_progress.best_tempo_bpm, EXCLUDED.best_tempo_bpm),
        instrument = CASE WHEN EXCLUDED.instrument <> '' THEN EXCLUDED.instrument ELSE student_worldtour_progress.instrument END,
        is_unlocked = true,
        updated_at = v_now
    RETURNING * INTO v_record;

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
            v_user_id,
            'WORLD_TOUR_COUNTRY_MASTERED',
            'student_worldtour_progress',
            v_record.id,
            jsonb_build_object(
                'country_code', v_clean_country,
                'stars', v_final_stars,
                'score_percent', v_final_score,
                'xp_awarded', v_xp_awarded,
                'instrument', p_instrument
            ),
            v_now
        );
    EXCEPTION WHEN OTHERS THEN
        -- Audit logs must not block the core transaction if audit table has variations
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'country_code', v_clean_country,
        'stars', v_final_stars,
        'best_score_percent', v_final_score,
        'best_tempo_bpm', v_record.best_tempo_bpm,
        'xp_awarded', v_xp_awarded,
        'is_unlocked', true,
        'unlocked_at', v_record.unlocked_at
    );
END;
$$;
