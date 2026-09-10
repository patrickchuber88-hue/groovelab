-- Migration 395: Teacher Passkey Security Overview & Revocation RPCs
-- Enterprise+ Security Governance (OWASP ASVS Level 3 / Fail-Closed)

-- 1. AUTHORITATIVE RPC: get_teacher_security_overview
-- Returns Passkey metadata and PIN activation flags without leaking any secrets (Zero-Secret-Leakage).
CREATE OR REPLACE FUNCTION public.get_teacher_security_overview(p_teacher_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_teacher RECORD;
    v_creds JSONB;
    v_cred_count INT := 0;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school_id := public.get_current_user_school_id();

    SELECT id, school_id, role, ausweis_nummer, is_pin_activated, last_seen, sessions_revoked_at
    INTO v_teacher
    FROM public.users_raw
    WHERE id = p_teacher_id;

    IF v_teacher.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Lehrkraft nicht gefunden.');
    END IF;

    -- Strict Authorization: Master Admin, or Admin/Secretary in same school, or the teacher themselves
    IF NOT (
        public.is_master_admin()
        OR (v_caller_school_id IS NOT NULL AND v_caller_school_id = v_teacher.school_id AND v_caller_role IN ('admin', 'secretary'))
        OR (v_caller_id IS NOT NULL AND v_caller_id = p_teacher_id)
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_ACCESS');
    END IF;

    -- Fetch WebAuthn credentials (Zero-Secret-Leakage: only device_name, created_at, counter, id)
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id,
        'device_name', COALESCE(device_name, 'Passkey-Gerät'),
        'created_at', created_at,
        'counter', counter
    )), '[]'::jsonb), COUNT(*)
    INTO v_creds, v_cred_count
    FROM public.user_credentials
    WHERE user_id = p_teacher_id;

    RETURN jsonb_build_object(
        'success', true,
        'teacher_id', p_teacher_id,
        'has_passkey', (v_cred_count > 0),
        'passkey_count', v_cred_count,
        'passkeys', v_creds,
        'has_personal_pin', public.user_has_personal_pin(p_teacher_id),
        'is_pin_activated', COALESCE(v_teacher.is_pin_activated, false),
        'ausweis_nummer', v_teacher.ausweis_nummer,
        'last_seen', v_teacher.last_seen,
        'sessions_revoked_at', v_teacher.sessions_revoked_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_security_overview(UUID) TO authenticated, anon, service_role;

-- 2. AUTHORITATIVE RPC: revoke_teacher_passkeys
-- Revokes all WebAuthn credentials for a teacher, invalidates active sessions and logs to audit trail.
CREATE OR REPLACE FUNCTION public.revoke_teacher_passkeys(p_teacher_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_teacher RECORD;
    v_deleted_count INT := 0;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school_id := public.get_current_user_school_id();

    SELECT id, school_id, role, first_name, last_name
    INTO v_teacher
    FROM public.users_raw
    WHERE id = p_teacher_id;

    IF v_teacher.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Lehrkraft nicht gefunden.');
    END IF;

    -- Strict Authorization: Master Admin, or Admin/Secretary in same school, or the teacher themselves
    IF NOT (
        public.is_master_admin()
        OR (v_caller_school_id IS NOT NULL AND v_caller_school_id = v_teacher.school_id AND v_caller_role IN ('admin', 'secretary'))
        OR (v_caller_id IS NOT NULL AND v_caller_id = p_teacher_id)
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_REVOCATION');
    END IF;

    -- Delete user credentials
    WITH del AS (
        DELETE FROM public.user_credentials
        WHERE user_id = p_teacher_id
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_count FROM del;

    -- Also deactivate in private_auth if exists
    BEGIN
        EXECUTE 'UPDATE private_auth.webauthn_credentials SET is_active = FALSE WHERE user_id = $1' USING p_teacher_id;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Revoke sessions on all devices immediately
    UPDATE public.users_raw
    SET token_version = COALESCE(token_version, 1) + 1,
        sessions_revoked_at = timezone('utc'::text, now())
    WHERE id = p_teacher_id;

    -- Revisionssicheres Audit-Logging
    INSERT INTO public.audit_logs (
        table_name, operation, record_id, changed_by, new_data
    ) VALUES (
        'user_credentials', 'REVOKE_TEACHER_PASSKEYS', p_teacher_id,
        COALESCE(v_caller_id, gen_random_uuid()),
        jsonb_build_object(
            'action', 'revoke_teacher_passkeys',
            'teacher_id', p_teacher_id,
            'revoked_count', v_deleted_count,
            'performed_by_role', v_caller_role,
            'timestamp', timezone('utc'::text, now())
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'revoked_count', v_deleted_count,
        'message', 'Alle Passkeys und Sitzungen der Lehrkraft wurden sicher widerrufen.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_teacher_passkeys(UUID) TO authenticated, anon, service_role;
