-- ==============================================================================
-- Migration 372: Enterprise Parent Consent & GDPR Deletion Governance
-- Standards: DSGVO Art. 7, 8, 17, 25 & OWASP ASVS Level 3
-- ==============================================================================

-- 1. Student Consent Ledger (Einwilligungs-Management)
CREATE TABLE IF NOT EXISTS public.student_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    school_id UUID NOT NULL,
    consent_type TEXT NOT NULL, -- 'photo_internal', 'photo_social_media', 'concert_program', 'newsletter'
    granted BOOLEAN NOT NULL DEFAULT FALSE,
    granted_by_role TEXT NOT NULL DEFAULT 'parent',
    granted_by_user_id UUID,
    ip_hash TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_consent UNIQUE (student_id, consent_type)
);

-- RLS for student_consents
ALTER TABLE public.student_consents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student_consents_select') THEN
        CREATE POLICY "student_consents_select" ON public.student_consents
            FOR SELECT
            USING (
                student_id = public.get_current_authenticated_user_id()
                OR public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
                OR public.is_master_admin()
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student_consents_modify') THEN
        CREATE POLICY "student_consents_modify" ON public.student_consents
            FOR ALL
            USING (
                student_id = public.get_current_authenticated_user_id()
                OR public.get_current_user_role() IN ('admin', 'secretary')
                OR public.is_master_admin()
            );
    END IF;
END $$;

-- 2. GDPR Art. 17 Deletion Requests (Recht auf Vergessenwerden)
CREATE TABLE IF NOT EXISTS public.gdpr_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    school_id UUID NOT NULL,
    requested_by UUID NOT NULL,
    scope TEXT NOT NULL DEFAULT 'media_and_profile', -- 'media_only', 'full_account'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'rejected'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- RLS for gdpr_deletion_requests
ALTER TABLE public.gdpr_deletion_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gdpr_deletion_requests_select') THEN
        CREATE POLICY "gdpr_deletion_requests_select" ON public.gdpr_deletion_requests
            FOR SELECT
            USING (
                student_id = public.get_current_authenticated_user_id()
                OR public.get_current_user_role() IN ('admin', 'secretary')
                OR public.is_master_admin()
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gdpr_deletion_requests_insert') THEN
        CREATE POLICY "gdpr_deletion_requests_insert" ON public.gdpr_deletion_requests
            FOR INSERT
            WITH CHECK (
                student_id = public.get_current_authenticated_user_id()
                OR public.is_master_admin()
            );
    END IF;
END $$;

-- RPC to update or insert consent with audit trail
CREATE OR REPLACE FUNCTION public.save_student_consent(
    p_student_id UUID,
    p_consent_type TEXT,
    p_granted BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_school_id UUID;
    v_caller_id UUID;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    IF v_caller_id <> p_student_id 
       AND public.get_current_user_role() NOT IN ('admin', 'secretary')
       AND NOT public.is_master_admin() THEN
        RETURN FALSE;
    END IF;

    SELECT school_id INTO v_school_id FROM public.users_raw WHERE id = p_student_id;
    IF v_school_id IS NULL THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.student_consents (
        student_id,
        school_id,
        consent_type,
        granted,
        granted_by_role,
        granted_by_user_id,
        updated_at
    )
    VALUES (
        p_student_id,
        v_school_id,
        p_consent_type,
        p_granted,
        'parent',
        v_caller_id,
        NOW()
    )
    ON CONFLICT (student_id, consent_type) DO UPDATE SET
        granted = EXCLUDED.granted,
        updated_at = NOW();

    -- Audit log
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        INSERT INTO public.audit_logs (
            event_type,
            school_id,
            user_id,
            payload,
            created_at
        ) VALUES (
            'PARENT_CONSENT_CHANGE',
            v_school_id,
            p_student_id,
            jsonb_build_object('consent_type', p_consent_type, 'granted', p_granted),
            NOW()
        );
    END IF;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_student_consent(UUID, TEXT, BOOLEAN) TO authenticated, anon, service_role;
