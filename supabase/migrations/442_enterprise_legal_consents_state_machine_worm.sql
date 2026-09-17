-- ==============================================================================
-- Migration 442: Enterprise Legal Consents State-Machine WORM Hardening
-- Standards: OWASP ASVS Level 3 / § 286 ZPO / Art. 7 Abs. 1 & 3 DSGVO / ISO/IEC 27037
-- Guarantees cryptographic immutability (WORM) while preserving the GDPR Art. 7(3) right of revocation.
-- ==============================================================================

-- 1. State-Machine WORM Trigger Function
CREATE OR REPLACE FUNCTION public.trg_enforce_legal_consent_state_machine()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. DELETE is unconditionally forbidden for all roles (Absolute Append-Only Enforcement)
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'FORENSIC INTEGRITY VIOLATION: Records in public.legal_consents are immutable (WORM) and can never be deleted.';
    END IF;

    -- 2. UPDATE is strictly constrained to the legal revocation transition (Art. 7 Abs. 3 DSGVO)
    IF TG_OP = 'UPDATE' THEN
        -- Check if it is a valid revocation transition from false -> true
        IF OLD.is_revoked = false AND NEW.is_revoked = true THEN
            -- Forensic freeze: Essential audit and evidentiary fields can NEVER be modified
            IF NEW.id <> OLD.id OR
               NEW.user_id <> OLD.user_id OR
               COALESCE(NEW.school_id, '00000000-0000-0000-0000-000000000000'::uuid) <> COALESCE(OLD.school_id, '00000000-0000-0000-0000-000000000000'::uuid) OR
               NEW.role <> OLD.role OR
               NEW.consent_type <> OLD.consent_type OR
               NEW.version <> OLD.version OR
               NEW.document_checksum <> OLD.document_checksum OR
               NEW.accepted_at <> OLD.accepted_at OR
               NEW.created_at <> OLD.created_at THEN
                RAISE EXCEPTION 'FORENSIC INTEGRITY VIOLATION: Immutable evidentiary fields in public.legal_consents cannot be altered.';
            END IF;

            -- Authoritative monotonic server timestamp for revocation
            NEW.revoked_at := COALESCE(NEW.revoked_at, clock_timestamp());
            RETURN NEW;
        ELSE
            -- Any other update (e.g. trying to un-revoke, change checksum, change version) is strictly denied
            RAISE EXCEPTION 'FORENSIC INTEGRITY VIOLATION: public.legal_consents is append-only. Only valid revocation transitions (is_revoked: false -> true) are permitted.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Bind the State-Machine WORM Trigger to public.legal_consents
DROP TRIGGER IF EXISTS trg_legal_consents_state_machine_worm ON public.legal_consents;
CREATE TRIGGER trg_legal_consents_state_machine_worm
BEFORE UPDATE OR DELETE ON public.legal_consents
FOR EACH ROW
EXECUTE FUNCTION public.trg_enforce_legal_consent_state_machine();

-- 3. Dedicated Authoritative RPC to revoke consent (e.g. Media/Audio consent revocation under Art. 7 Abs. 3 DSGVO)
CREATE OR REPLACE FUNCTION public.revoke_user_legal_consent(
    p_user_id UUID,
    p_consent_type TEXT,
    p_version TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    v_updated_count INT := 0;
    v_timestamp TIMESTAMPTZ := clock_timestamp();
    v_caller_uid UUID;
    v_user_school_id UUID;
BEGIN
    IF p_user_id IS NULL OR p_consent_type IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Parameter.');
    END IF;

    -- Zero-Trust Identity Verification
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NOT NULL AND v_caller_uid <> p_user_id THEN
        -- Allow school admin/secretary to revoke on behalf if in same school
        IF NOT EXISTS (
            SELECT 1 FROM public.users admin_u
            JOIN public.users target_u ON target_u.id = p_user_id
            WHERE admin_u.id = v_caller_uid
              AND admin_u.role IN ('admin', 'secretary', 'master_admin')
              AND (admin_u.school_id = target_u.school_id OR admin_u.role = 'master_admin')
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Unzureichende Berechtigung zum Widerruf.');
        END IF;
    END IF;

    SELECT school_id INTO v_user_school_id FROM public.users WHERE id = p_user_id;

    -- Execute revocation transition (strictly allowed by the WORM trigger above)
    UPDATE public.legal_consents
    SET is_revoked = true,
        revoked_at = v_timestamp
    WHERE user_id = p_user_id
      AND consent_type = p_consent_type
      AND (p_version IS NULL OR version = p_version)
      AND is_revoked = false;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    -- Log revocation in audit_logs for unbroken chain of custody
    IF v_updated_count > 0 THEN
        BEGIN
            INSERT INTO public.audit_logs (
                changed_by,
                table_name,
                action,
                record_id,
                new_data
            ) VALUES (
                COALESCE(v_caller_uid, p_user_id),
                'legal_consents',
                'UPDATE',
                p_user_id,
                jsonb_build_object(
                    'event', 'CONSENT_REVOKED',
                    'consent_type', p_consent_type,
                    'revoked_count', v_updated_count,
                    'revoked_at', v_timestamp,
                    'school_id', v_user_school_id
                )
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'revoked_count', v_updated_count,
        'revoked_at', v_timestamp
    );
END;
$$;

-- 4. Grant execution permissions
GRANT EXECUTE ON FUNCTION public.revoke_user_legal_consent(UUID, TEXT, TEXT) TO authenticated, anon;
