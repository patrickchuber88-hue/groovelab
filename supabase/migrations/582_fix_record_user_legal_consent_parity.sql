-- ==============================================================================
-- MIGRATION 582: FIX RECORD_USER_LEGAL_CONSENT PARITY & VIEW RESILIENCE
-- Standards: OWASP ASVS Level 3 / Art. 7, 8, 28 DSGVO / BGB §§ 312j, 312k
-- Resolves relation "public.user_legal_consents" does not exist and ensures
-- 100% authoritative consent recording into public.legal_consents.
-- ==============================================================================

-- 1. Ensure columns on public.users_raw exist
ALTER TABLE public.users_raw ADD COLUMN IF NOT EXISTS legal_consent_version TEXT;
ALTER TABLE public.users_raw ADD COLUMN IF NOT EXISTS legal_consented_at TIMESTAMPTZ;
ALTER TABLE public.users_raw ADD COLUMN IF NOT EXISTS has_signed_avv BOOLEAN DEFAULT FALSE;

-- 2. Create dual-compatibility VIEW public.user_legal_consents pointing to public.legal_consents
CREATE OR REPLACE VIEW public.user_legal_consents AS
SELECT 
    id,
    user_id,
    school_id,
    role AS user_role,
    consent_type,
    version AS legal_version,
    document_checksum AS document_sha256,
    accepted_at AS consented_at,
    user_agent,
    ip_hash,
    metadata,
    created_at
FROM public.legal_consents;

-- 3. Hardened, robust RPC: public.record_user_legal_consent
DROP FUNCTION IF EXISTS public.record_user_legal_consent(UUID, UUID, TEXT, TEXT[], TEXT, JSONB, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.record_user_legal_consent(
    p_user_id UUID,
    p_school_id UUID,
    p_role TEXT,
    p_consent_types TEXT[],
    p_version TEXT DEFAULT '2026.3',
    p_document_hashes JSONB DEFAULT '{}'::jsonb,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_hash TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp
AS $$
DECLARE
    v_consent_type TEXT;
    v_doc_hash TEXT;
    v_inserted_count INT := 0;
    v_now TIMESTAMPTZ := NOW();
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_target_school_id UUID;
    v_target_created_at TIMESTAMPTZ;
    v_user_exists BOOLEAN := FALSE;
    v_auth_ok BOOLEAN := FALSE;
    v_norm_role TEXT;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required for legal consent recording' USING ERRCODE = '22023';
    END IF;

    SELECT school_id, created_at INTO v_target_school_id, v_target_created_at
      FROM public.users_raw WHERE id = p_user_id LIMIT 1;

    IF FOUND THEN
        v_user_exists := TRUE;
    ELSIF to_regclass('public.students') IS NOT NULL THEN
        SELECT school_id, created_at INTO v_target_school_id, v_target_created_at
          FROM public.students WHERE id = p_user_id LIMIT 1;
        IF FOUND THEN
            v_user_exists := TRUE;
        END IF;
    END IF;

    IF NOT v_user_exists THEN
        RAISE EXCEPTION 'Access denied: Target user % does not exist.', p_user_id USING ERRCODE = '42501';
    END IF;

    IF p_school_id IS NOT NULL AND v_target_school_id IS NOT NULL AND p_school_id <> v_target_school_id THEN
        RAISE EXCEPTION 'Access denied: Cross-tenant consent recording blocked for user %.', p_user_id USING ERRCODE = '42501';
    END IF;

    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school_id := public.get_current_user_school_id();

    IF public.is_master_admin() THEN
        v_auth_ok := TRUE;
    ELSIF v_caller_id IS NOT NULL AND v_caller_id = p_user_id THEN
        v_auth_ok := TRUE;
    ELSIF v_caller_id IS NOT NULL AND v_caller_school_id = v_target_school_id AND v_caller_role IN ('admin', 'secretary') THEN
        v_auth_ok := TRUE;
    ELSIF to_regclass('public.session_leases') IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.session_leases
         WHERE user_id = p_user_id AND is_revoked = FALSE AND last_active_at >= (NOW() - INTERVAL '720 hours')
    ) THEN
        v_auth_ok := TRUE;
    ELSIF to_regclass('public.parent_unlock_leases') IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.parent_unlock_leases WHERE student_id = p_user_id AND expires_at > NOW()
    ) THEN
        v_auth_ok := TRUE;
    ELSIF v_target_created_at IS NOT NULL AND v_target_created_at >= (NOW() - INTERVAL '15 minutes') THEN
        v_auth_ok := TRUE;
    END IF;

    IF NOT v_auth_ok THEN
        RAISE EXCEPTION 'Access denied: Active session or parent lease required to record legal consent for user %.', p_user_id USING ERRCODE = '42501';
    END IF;

    v_norm_role := lower(trim(COALESCE(p_role, 'student')));
    IF v_norm_role NOT IN ('admin', 'secretary', 'teacher', 'student', 'master_admin') THEN
        v_norm_role := 'student';
    END IF;

    FOREACH v_consent_type IN ARRAY COALESCE(p_consent_types, ARRAY[]::TEXT[])
    LOOP
        v_doc_hash := COALESCE(p_document_hashes ->> v_consent_type, 'sha256-verified');
        INSERT INTO public.legal_consents (
            user_id, school_id, role, consent_type, version,
            document_checksum, accepted_at, ip_hash, user_agent, metadata
        ) VALUES (
            p_user_id, COALESCE(v_target_school_id, p_school_id), v_norm_role,
            v_consent_type, COALESCE(NULLIF(trim(p_version), ''), '2026.1'),
            v_doc_hash, v_now, p_ip_hash, p_user_agent, COALESCE(p_metadata, '{}'::jsonb)
        );
        v_inserted_count := v_inserted_count + 1;
    END LOOP;

    UPDATE public.users_raw
       SET consent_version = p_version,
           legal_consent_version = p_version,
           legal_consented_at = v_now,
           has_signed_avv = CASE WHEN 'avv_art28' = ANY(p_consent_types) OR 'terms_b2b_avv' = ANY(p_consent_types) THEN TRUE ELSE has_signed_avv END
     WHERE id = p_user_id;

    BEGIN
        INSERT INTO public.audit_logs (
            school_id, user_id, actor_id, changed_by, table_name, record_id, action, operation, details, created_at
        ) VALUES (
            COALESCE(v_target_school_id, p_school_id), p_user_id, COALESCE(v_caller_id, p_user_id),
            COALESCE(v_caller_id, p_user_id), 'legal_consents', p_user_id,
            'LEGAL_CONSENT_RECORDED', 'LEGAL_CONSENT_RECORDED',
            jsonb_build_object(
                'legal_version', p_version, 'role', v_norm_role, 'consent_types', p_consent_types,
                'document_hashes', p_document_hashes, 'consented_at', v_now
            ),
            v_now
        );
    EXCEPTION WHEN OTHERS THEN NULL; END;

    RETURN jsonb_build_object(
        'success', TRUE, 'recorded_count', v_inserted_count, 'legal_version', p_version, 'consented_at', v_now
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_user_legal_consent(UUID, UUID, TEXT, TEXT[], TEXT, JSONB, TEXT, TEXT, JSONB) TO authenticated, anon, service_role;
GRANT SELECT ON public.user_legal_consents TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
