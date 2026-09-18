-- ==============================================================================
-- Migration 420: Enterprise GDPR Deletion Request Management (Art. 17 DSGVO)
-- Standards: DSGVO Art. 12 Abs. 3, Art. 17, OWASP ASVS Level 3
-- ==============================================================================

-- 1. Enable Update / Modify policy on gdpr_deletion_requests
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gdpr_deletion_requests_modify') THEN
        CREATE POLICY "gdpr_deletion_requests_modify" ON public.gdpr_deletion_requests
            FOR UPDATE
            USING (
                public.get_current_user_role() IN ('admin', 'secretary')
                OR public.is_master_admin()
            )
            WITH CHECK (
                public.get_current_user_role() IN ('admin', 'secretary')
                OR public.is_master_admin()
            );
    END IF;
END $$;

-- 2. Authoritative RPC to resolve (complete or reject) GDPR deletion requests
CREATE OR REPLACE FUNCTION public.resolve_gdpr_deletion_request(
    p_request_id UUID,
    p_status TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_school_id UUID;
    v_caller_role TEXT;
    v_caller_id UUID;
    v_req RECORD;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    
    IF v_caller_role NOT IN ('admin', 'secretary') AND NOT public.is_master_admin() THEN
        RAISE EXCEPTION 'Unauthorized: only admin or secretary can resolve GDPR deletion requests';
    END IF;

    SELECT * INTO v_req FROM public.gdpr_deletion_requests WHERE id = p_request_id;
    IF v_req.id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- School scoping
    IF NOT public.is_master_admin() AND v_req.school_id <> public.get_current_user_school_id() THEN
        RAISE EXCEPTION 'Forbidden: cross-tenant GDPR resolution denied';
    END IF;

    UPDATE public.gdpr_deletion_requests
    SET 
        status = p_status,
        completed_at = NOW(),
        notes = COALESCE(p_notes, notes)
    WHERE id = p_request_id;

    -- Audit log
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        INSERT INTO public.audit_logs (
            event_type,
            school_id,
            user_id,
            payload,
            created_at
        ) VALUES (
            'GDPR_DELETION_RESOLVED',
            v_req.school_id,
            v_req.student_id,
            jsonb_build_object(
                'request_id', p_request_id,
                'status', p_status,
                'resolved_by', v_caller_id,
                'notes', p_notes
            ),
            NOW()
        );
    END IF;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_gdpr_deletion_request(UUID, TEXT, TEXT) TO authenticated, anon, service_role;
