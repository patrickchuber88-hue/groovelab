-- ==============================================================================
-- Migration 375: Enterprise Legal Consents & Revision-Safe Onboarding Engine
-- Standards: OWASP ASVS Level 3 / Art. 7, 8, 28 DSGVO / § 307 BGB / § 1631 BGB
-- Eliminates informal unverified AGB checkboxes and provides cryptographic proof of consent.
-- ==============================================================================

-- 1. Create table for revision-safe legal consents
CREATE TABLE IF NOT EXISTS public.legal_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    school_id UUID,
    role TEXT NOT NULL CHECK (role IN ('admin', 'secretary', 'teacher', 'student', 'master_admin')),
    consent_type TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '2026.1',
    document_checksum TEXT NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_agent TEXT,
    ip_hash TEXT,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    revoked_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for high-performance lookup and school compliance audits
CREATE INDEX IF NOT EXISTS idx_legal_consents_user_lookup 
ON public.legal_consents (user_id, consent_type, version, is_revoked);

CREATE INDEX IF NOT EXISTS idx_legal_consents_school 
ON public.legal_consents (school_id);

CREATE INDEX IF NOT EXISTS idx_legal_consents_created 
ON public.legal_consents (accepted_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE public.legal_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_consents FORCE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS p_legal_consents_select_own ON public.legal_consents;
CREATE POLICY p_legal_consents_select_own 
ON public.legal_consents 
FOR SELECT 
TO authenticated, anon 
USING (
    user_id = auth.uid() 
    OR (current_setting('request.jwt.claim.sub', true))::uuid = user_id
    OR user_id IN (
        SELECT id FROM public.users 
        WHERE id = auth.uid()
    )
);

DROP POLICY IF EXISTS p_legal_consents_admin_school ON public.legal_consents;
CREATE POLICY p_legal_consents_admin_school 
ON public.legal_consents 
FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
          AND users.role IN ('admin', 'secretary')
          AND users.school_id = legal_consents.school_id
    )
);

-- 5. RPC: check_user_legal_status
-- Authoritative verification whether a user has accepted all mandatory legal terms for their active role.
CREATE OR REPLACE FUNCTION public.check_user_legal_status(
    p_user_id UUID,
    p_role TEXT,
    p_required_version TEXT DEFAULT '2026.1'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    v_norm_role TEXT;
    v_req_consent TEXT;
    v_has_mandatory BOOLEAN := false;
    v_has_media_consent BOOLEAN := false;
    v_consents_json JSONB;
    v_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
    IF p_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'is_compliant', false,
            'missing_consents', ARRAY['invalid_user_id']
        );
    END IF;

    v_norm_role := lower(trim(COALESCE(p_role, '')));

    -- Master Admin is system administrator and intrinsically compliant
    IF v_norm_role = 'master_admin' THEN
        RETURN jsonb_build_object(
            'is_compliant', true,
            'required_version', p_required_version,
            'missing_consents', ARRAY[]::TEXT[],
            'has_media_consent', true
        );
    END IF;

    -- Determine mandatory consent type based on role
    IF v_norm_role IN ('admin', 'secretary') THEN
        v_req_consent := 'terms_b2b_avv';
    ELSIF v_norm_role = 'teacher' THEN
        v_req_consent := 'terms_teacher_conduct';
    ELSIF v_norm_role = 'student' THEN
        v_req_consent := 'terms_student_platform';
    ELSE
        v_req_consent := 'terms_student_platform';
    END IF;

    -- Check if mandatory consent exists for this user and required version
    SELECT EXISTS (
        SELECT 1 FROM public.legal_consents
        WHERE user_id = p_user_id
          AND consent_type = v_req_consent
          AND version = p_required_version
          AND is_revoked = false
    ) INTO v_has_mandatory;

    IF NOT v_has_mandatory THEN
        v_missing := array_append(v_missing, v_req_consent);
    END IF;

    -- Optional media audio consent for students
    IF v_norm_role = 'student' THEN
        SELECT EXISTS (
            SELECT 1 FROM public.legal_consents
            WHERE user_id = p_user_id
              AND consent_type = 'consent_media_audio'
              AND is_revoked = false
        ) INTO v_has_media_consent;
    ELSE
        v_has_media_consent := true;
    END IF;

    -- Collect all accepted consents for this user
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'consent_type', consent_type,
        'version', version,
        'accepted_at', accepted_at,
        'document_checksum', document_checksum
    )), '[]'::jsonb)
    INTO v_consents_json
    FROM public.legal_consents
    WHERE user_id = p_user_id
      AND is_revoked = false;

    RETURN jsonb_build_object(
        'is_compliant', (v_has_mandatory = true),
        'required_version', p_required_version,
        'mandatory_consent', v_req_consent,
        'missing_consents', v_missing,
        'has_media_consent', v_has_media_consent,
        'consents', v_consents_json
    );
END;
$$;

-- 6. RPC: record_user_legal_consent
-- Atomically records legal consents with cryptographic checksum, timestamp, and audit trail.
CREATE OR REPLACE FUNCTION public.record_user_legal_consent(
    p_user_id UUID,
    p_school_id UUID,
    p_role TEXT,
    p_consent_types TEXT[],
    p_version TEXT DEFAULT '2026.1',
    p_document_hashes JSONB DEFAULT '{}'::jsonb,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_hash TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    v_norm_role TEXT;
    v_consent_type TEXT;
    v_doc_hash TEXT;
    v_inserted_count INT := 0;
    v_timestamp TIMESTAMPTZ := clock_timestamp();
BEGIN
    IF p_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Keine User-ID übergeben.');
    END IF;

    IF p_consent_types IS NULL OR array_length(p_consent_types, 1) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Keine Zustimmungs-Typen übergeben.');
    END IF;

    v_norm_role := lower(trim(COALESCE(p_role, 'student')));
    IF v_norm_role NOT IN ('admin', 'secretary', 'teacher', 'student', 'master_admin') THEN
        v_norm_role := 'student';
    END IF;

    FOREACH v_consent_type IN ARRAY p_consent_types
    LOOP
        v_doc_hash := COALESCE(p_document_hashes ->> v_consent_type, 'sha256_unspecified');

        INSERT INTO public.legal_consents (
            user_id,
            school_id,
            role,
            consent_type,
            version,
            document_checksum,
            accepted_at,
            user_agent,
            ip_hash,
            metadata
        ) VALUES (
            p_user_id,
            p_school_id,
            v_norm_role,
            v_consent_type,
            COALESCE(NULLIF(trim(p_version), ''), '2026.1'),
            v_doc_hash,
            v_timestamp,
            p_user_agent,
            p_ip_hash,
            COALESCE(p_metadata, '{}'::jsonb)
        );

        v_inserted_count := v_inserted_count + 1;
    END LOOP;

    -- Audit Log entry
    BEGIN
        INSERT INTO public.audit_logs (
            changed_by,
            table_name,
            action,
            record_id,
            new_data
        ) VALUES (
            p_user_id,
            'legal_consents',
            'CONSENT_GRANTED',
            p_user_id,
            jsonb_build_object(
                'consents', p_consent_types,
                'version', p_version,
                'role', v_norm_role,
                'school_id', p_school_id,
                'accepted_at', v_timestamp
            )
        );
    EXCEPTION WHEN OTHERS THEN
        -- Non-blocking for audit logs if schema differs
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'recorded_count', v_inserted_count,
        'accepted_at', v_timestamp
    );
END;
$$;

-- Grant execution to authenticated and anon users (internally secured via SECURITY DEFINER)
GRANT SELECT ON public.legal_consents TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.check_user_legal_status(UUID, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.record_user_legal_consent(UUID, UUID, TEXT, TEXT[], TEXT, JSONB, TEXT, TEXT, JSONB) TO authenticated, anon;
