-- ==============================================================================
-- Migration 441: Enterprise Tier-1 Legal Consent Decoupling & Semantic Versioning
-- Standards: OWASP ASVS Level 3 / Art. 7, 8, 28 DSGVO / § 307 BGB / § 1631 BGB
-- Decouples active version from minimum enforced version to eliminate accidental lockouts.
-- ==============================================================================

-- 1. Drop historical 3-parameter function to prevent Postgres signature ambiguity
DROP FUNCTION IF EXISTS public.check_user_legal_status(UUID, TEXT, TEXT);

-- 2. Create updated 4-parameter function with minimum enforced version support
CREATE OR REPLACE FUNCTION public.check_user_legal_status(
    p_user_id UUID,
    p_role TEXT,
    p_required_version TEXT DEFAULT '2026.2',
    p_minimum_enforced_version TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    v_norm_role TEXT;
    v_req_consent TEXT;
    v_min_version TEXT;
    v_has_mandatory BOOLEAN := false;
    v_has_media_consent BOOLEAN := false;
    v_consents_json JSONB;
    v_missing TEXT[] := ARRAY[]::TEXT[];
    v_latest_version TEXT := NULL;
    v_has_latest BOOLEAN := false;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'is_compliant', false,
            'missing_consents', ARRAY['invalid_user_id']
        );
    END IF;

    v_norm_role := lower(trim(COALESCE(p_role, '')));
    v_min_version := COALESCE(NULLIF(trim(p_minimum_enforced_version), ''), p_required_version);

    -- Master Admin is system administrator and intrinsically compliant
    IF v_norm_role = 'master_admin' THEN
        RETURN jsonb_build_object(
            'is_compliant', true,
            'has_latest_version', true,
            'latest_accepted_version', p_required_version,
            'required_version', p_required_version,
            'minimum_enforced_version', v_min_version,
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

    -- Find the latest accepted version for this mandatory consent
    SELECT version INTO v_latest_version
    FROM public.legal_consents
    WHERE user_id = p_user_id
      AND consent_type = v_req_consent
      AND is_revoked = false
    ORDER BY accepted_at DESC
    LIMIT 1;

    -- Check compliance against minimum enforced version OR required version
    IF v_latest_version IS NOT NULL THEN
        IF v_latest_version = p_required_version THEN
            v_has_mandatory := true;
            v_has_latest := true;
        ELSIF v_latest_version >= v_min_version THEN
            v_has_mandatory := true;
            v_has_latest := false;
        ELSE
            v_has_mandatory := false;
            v_has_latest := false;
        END IF;
    ELSE
        v_has_mandatory := false;
        v_has_latest := false;
    END IF;

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
        'has_latest_version', v_has_latest,
        'latest_accepted_version', v_latest_version,
        'required_version', p_required_version,
        'minimum_enforced_version', v_min_version,
        'mandatory_consent', v_req_consent,
        'missing_consents', v_missing,
        'has_media_consent', v_has_media_consent,
        'consents', v_consents_json
    );
END;
$$;

-- 3. Grants & Schema Reload
GRANT EXECUTE ON FUNCTION public.check_user_legal_status(UUID, TEXT, TEXT, TEXT) TO authenticated, anon;
NOTIFY pgrst, 'reload schema';
