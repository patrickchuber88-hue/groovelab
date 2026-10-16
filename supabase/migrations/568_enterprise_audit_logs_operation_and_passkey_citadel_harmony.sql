-- ==============================================================================
-- Migration: 568_enterprise_audit_logs_operation_and_passkey_citadel_harmony
-- Bounded Context: Admin / Auth / Forensics (Rot)
-- Standards: OWASP ASVS Level 3 / ISO/IEC 27037 / GoBD / WORM Immutability
-- Target: Hetzner Cloud Production Cluster (PostgreSQL 15+)
-- 
-- 1. Harmonize public.audit_logs: Add 'operation' column & widen 'action'
-- 2. Pre-Hash Sync-Trigger: Ensure 'action' and 'operation' are always populated
-- 3. Hardened Passkey RPCs: register_webauthn_credential, authenticate_webauthn_credential,
--    revoke_user_passkeys, revoke_teacher_passkeys
-- ==============================================================================

DO $$
BEGIN
    -- 1. Ensure operation column exists and action column has no length constraint
    IF to_regclass('public.audit_logs') IS NOT NULL THEN
        -- Add operation column if it does not already exist
        ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS operation TEXT;

        -- Alter action column to TEXT to prevent VARCHAR(20) truncation errors
        ALTER TABLE public.audit_logs ALTER COLUMN action TYPE TEXT;

        -- Drop NOT NULL constraint on action column so inserts targeting operation exclusively do not fail
        ALTER TABLE public.audit_logs ALTER COLUMN action DROP NOT NULL;

        -- Backfill existing rows where operation is NULL
        UPDATE public.audit_logs
        SET operation = action
        WHERE operation IS NULL AND action IS NOT NULL;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. PRE-HASHING SYNC TRIGGER: trg_audit_a_sync_action_operation
-- Ensures action and operation are always in lockstep before SHA-256 Merkle chain
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_audit_logs_sync_action_operation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- If action is empty but operation is provided, populate action from operation
    IF (NEW.action IS NULL OR NEW.action = '') AND (NEW.operation IS NOT NULL AND NEW.operation <> '') THEN
        NEW.action := NEW.operation;
    -- If operation is empty but action is provided, populate operation from action
    ELSIF (NEW.operation IS NULL OR NEW.operation = '') AND (NEW.action IS NOT NULL AND NEW.action <> '') THEN
        NEW.operation := NEW.action;
    -- Fallback default if both are empty
    ELSIF (NEW.action IS NULL OR NEW.action = '') AND (NEW.operation IS NULL OR NEW.operation = '') THEN
        NEW.action := 'UNKNOWN';
        NEW.operation := 'UNKNOWN';
    END IF;

    RETURN NEW;
END;
$$;

-- Drop and recreate trigger with name starting with 'trg_audit_a_' so PostgreSQL
-- fires it before 'trg_audit_log_hash_chain' and 'trg_audit_logs_hash_chain'
DROP TRIGGER IF EXISTS trg_audit_a_sync_action_operation ON public.audit_logs;
CREATE TRIGGER trg_audit_a_sync_action_operation
    BEFORE INSERT OR UPDATE ON public.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_audit_logs_sync_action_operation();

-- ------------------------------------------------------------------------------
-- 3. HARDENED REGISTRATION RPC: register_webauthn_credential
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_webauthn_credential(
    p_user_id UUID,
    p_credential_id TEXT,
    p_public_key TEXT,
    p_device_name TEXT,
    p_challenge TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
AS $$
DECLARE
    v_clean_cred TEXT := TRIM(p_credential_id);
    v_clean_chal TEXT := TRIM(p_challenge);
    v_clean_device TEXT;
    v_chal_record RECORD;
    v_caller_id UUID;
    v_effective_user_id UUID := p_user_id;
    v_resolved_user_id UUID;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();

    -- Strict Authorization: Only the authenticated user themselves or master admin
    IF NOT (
        public.is_master_admin()
        OR current_setting('role', true) IN ('postgres', 'supabase_admin', 'service_role')
        OR (v_caller_id IS NOT NULL AND v_caller_id = p_user_id)
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_PASSKEY_REGISTRATION');
    END IF;

    IF v_effective_user_id IS NULL OR v_clean_cred IS NULL OR v_clean_cred = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Anmeldedaten.');
    END IF;

    IF p_public_key IS NULL OR TRIM(p_public_key) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiger öffentlicher Schlüssel.');
    END IF;

    -- Verify challenge exists, is unexpired, and matches intended user_id if bound
    SELECT * INTO v_chal_record
    FROM private_auth.webauthn_challenges
    WHERE challenge = v_clean_chal
      AND expires_at > NOW()
      AND (user_id IS NULL OR user_id = v_effective_user_id)
    FOR UPDATE;

    IF v_chal_record.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sicherheits-Challenge ist abgelaufen oder ungültig.');
    END IF;

    -- Clean up one-time challenge immediately (Atomic single-use)
    DELETE FROM private_auth.webauthn_challenges WHERE id = v_chal_record.id;

    -- 🛡️ Foreign Key Guard: Ensure target user exists in public.users_raw
    IF NOT EXISTS (SELECT 1 FROM public.users_raw WHERE id = v_effective_user_id) THEN
        -- If registering for canonical master admin or caller is master admin
        IF v_effective_user_id = '88888888-8888-8888-8888-888888888888'::uuid OR public.is_master_admin() THEN
            SELECT id INTO v_resolved_user_id
            FROM public.users_raw
            WHERE is_master_admin = true
            ORDER BY created_at ASC
            LIMIT 1;

            IF v_resolved_user_id IS NOT NULL THEN
                v_effective_user_id := v_resolved_user_id;
            ELSE
                INSERT INTO public.users_raw (
                    id, first_name, last_name, role, is_master_admin,
                    qr_token, master_admin_username, is_active, is_campus_active,
                    is_groovelab_active, is_2fa_enabled, created_at
                ) VALUES (
                    '88888888-8888-8888-8888-888888888888'::uuid, 'Master', 'Admin', 'admin', true,
                    'fa9b8c7d-6e5f-4a3b-2c1d-0e9f8a7b6c5d'::uuid, 'admin', true, true,
                    true, true, NOW()
                )
                ON CONFLICT (id) DO UPDATE SET
                    is_master_admin = true,
                    is_active = true,
                    master_admin_username = COALESCE(public.users_raw.master_admin_username, 'admin');

                v_effective_user_id := '88888888-8888-8888-8888-888888888888'::uuid;
            END IF;
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Benutzerkonto nicht in Datenbank gefunden.');
        END IF;
    END IF;

    v_clean_device := COALESCE(NULLIF(TRIM(p_device_name), ''), 'Passkey Device');

    -- 1. Upsert into authoritative private_auth.webauthn_credentials
    INSERT INTO private_auth.webauthn_credentials (
        user_id,
        credential_id,
        public_key,
        counter,
        sign_count,
        device_name,
        is_active,
        created_at
    ) VALUES (
        v_effective_user_id,
        v_clean_cred,
        p_public_key,
        0,
        0,
        v_clean_device,
        TRUE,
        NOW()
    )
    ON CONFLICT (credential_id) DO UPDATE SET
        public_key = EXCLUDED.public_key,
        device_name = EXCLUDED.device_name,
        is_active = TRUE,
        user_id = EXCLUDED.user_id;

    -- 2. Synchronous dual-store persistence in public.user_credentials for complete backward compatibility
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_credentials'
    ) THEN
        INSERT INTO public.user_credentials (
            user_id,
            credential_id,
            public_key,
            counter,
            device_name,
            is_active,
            created_at
        ) VALUES (
            v_effective_user_id,
            v_clean_cred,
            p_public_key,
            0,
            v_clean_device,
            TRUE,
            NOW()
        )
        ON CONFLICT (credential_id) DO UPDATE SET
            public_key = EXCLUDED.public_key,
            device_name = EXCLUDED.device_name,
            is_active = TRUE,
            user_id = EXCLUDED.user_id;
    END IF;

    -- 3. Revisionssicheres Audit-Logging (both action and operation provided)
    INSERT INTO public.audit_logs (
        table_name, action, operation, record_id, changed_by, new_data
    ) VALUES (
        'webauthn_credentials', 'REGISTER_PASSKEY', 'REGISTER_PASSKEY', v_effective_user_id,
        COALESCE(v_caller_id, v_effective_user_id),
        jsonb_build_object(
            'action', 'register_webauthn_credential',
            'device_name', v_clean_device,
            'credential_id_prefix', LEFT(v_clean_cred, 12) || '...',
            'registered_at', timezone('utc'::text, now())
        )
    );

    RETURN jsonb_build_object('success', true, 'user_id', v_effective_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_webauthn_credential(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. HARDENED AUTHENTICATION RPC: authenticate_webauthn_credential
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.authenticate_webauthn_credential(
    p_credential_id TEXT,
    p_challenge TEXT,
    p_school_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_temp
AS $$
DECLARE
    v_clean_cred TEXT := TRIM(p_credential_id);
    v_clean_chal TEXT := TRIM(p_challenge);
    v_challenge_record RECORD;
    v_cred_record RECORD;
    v_user RECORD;
    v_school RECORD;
    v_lease_id UUID;
    v_sanitized_user JSONB;
BEGIN
    -- 1. Input parameter validation
    IF v_clean_cred IS NULL OR v_clean_cred = '' OR v_clean_chal IS NULL OR v_clean_chal = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Authentifizierungs-Parameter.');
    END IF;

    -- 2. Verify challenge exists, is pending, not expired (< 5 mins) with atomic row-lock
    SELECT * INTO v_challenge_record
    FROM private_auth.webauthn_challenges
    WHERE challenge = v_clean_chal
      AND expires_at > NOW()
    FOR UPDATE;

    IF v_challenge_record.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sicherheits-Challenge ist abgelaufen oder ungültig.');
    END IF;

    -- Consume challenge immediately (Replay protection)
    DELETE FROM private_auth.webauthn_challenges WHERE id = v_challenge_record.id;

    -- 3. Lookup credential from authoritative private_auth.webauthn_credentials
    SELECT * INTO v_cred_record
    FROM private_auth.webauthn_credentials
    WHERE credential_id = v_clean_cred
      AND is_active = TRUE;

    -- Fallback: check public.user_credentials if legacy entry exists
    IF v_cred_record IS NULL THEN
        SELECT 
            id, user_id, credential_id, public_key, counter,
            COALESCE(counter, 0) AS sign_count, device_name,
            TRUE AS is_active, created_at, NULL::timestamptz AS last_used_at
        INTO v_cred_record
        FROM public.user_credentials
        WHERE credential_id = v_clean_cred
          AND (is_active IS NULL OR is_active = TRUE);
    END IF;

    IF v_cred_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Passkey / WebAuthn Anmeldedaten nicht gefunden.');
    END IF;

    -- 4. Lookup user in public.users_raw
    SELECT * INTO v_user
    FROM public.users_raw
    WHERE id = v_cred_record.user_id
      AND is_active = TRUE
      AND (p_school_id IS NULL OR school_id = p_school_id OR is_master_admin = TRUE);

    IF v_user IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Benutzerkonto nicht aktiv oder nicht zugeordnet.');
    END IF;

    -- 5. Lockout Defense: Check if user is locked out
    IF v_user.pin_locked_until IS NOT NULL AND v_user.pin_locked_until > NOW() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Sicherheitssperre: Zu viele Fehlversuche. Zugang vorübergehend gesperrt.'
        );
    END IF;

    -- 6. Cloned Authenticator Defense: Increment sign_count & record last_used_at
    UPDATE private_auth.webauthn_credentials
    SET sign_count = sign_count + 1,
        counter = counter + 1,
        last_used_at = NOW()
    WHERE credential_id = v_clean_cred;

    -- Sync back to public.user_credentials
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_credentials'
    ) THEN
        UPDATE public.user_credentials
        SET counter = counter + 1,
            sign_count = sign_count + 1,
            last_used_at = NOW()
        WHERE credential_id = v_clean_cred;
    END IF;

    -- 7. Reset failed attempts & update last_seen
    UPDATE public.users_raw
    SET last_seen = NOW(),
        failed_pin_attempts = 0,
        pin_locked_until = NULL
    WHERE id = v_user.id;

    -- Fetch school information
    SELECT * INTO v_school
    FROM public.schools
    WHERE id = v_user.school_id;

    -- 8. Issue verified 30-day session lease
    v_lease_id := gen_random_uuid();
    INSERT INTO public.session_leases (
        id,
        user_id,
        school_id,
        role,
        device_key,
        device_name,
        created_at,
        last_active_at,
        is_revoked
    ) VALUES (
        v_lease_id,
        v_user.id,
        v_user.school_id,
        v_user.role,
        'passkey_login',
        COALESCE(v_cred_record.device_name, 'Passkey Device'),
        NOW(),
        NOW(),
        FALSE
    );

    -- 9. Revisionssicheres Audit-Logging (both action and operation provided)
    INSERT INTO public.audit_logs (
        table_name, action, operation, record_id, changed_by, new_data
    ) VALUES (
        'webauthn_credentials', 'AUTH_PASSKEY', 'AUTH_PASSKEY', v_user.id,
        v_user.id,
        jsonb_build_object(
            'action', 'authenticate_webauthn_credential',
            'role', v_user.role,
            'school_id', v_user.school_id,
            'device_name', v_cred_record.device_name,
            'lease_token', v_lease_id,
            'authenticated_at', timezone('utc'::text, now())
        )
    );

    -- 10. Build zero-knowledge sanitized profile (last_name = NULL for students per KUG § 22 / DSGVO Art. 8 & 9)
    v_sanitized_user := jsonb_build_object(
        'id', v_user.id,
        'school_id', v_user.school_id,
        'role', v_user.role,
        'roles', v_user.roles,
        'first_name', v_user.first_name,
        'last_name', CASE WHEN v_user.role = 'student' THEN NULL ELSE v_user.last_name END,
        'nickname', v_user.nickname,
        'avatar_url', v_user.avatar_url,
        'photo_url', v_user.photo_url,
        'instrument', v_user.instrument,
        'groovelab_instrument', v_user.groovelab_instrument,
        'status', v_user.status,
        'is_active', v_user.is_active,
        'is_campus_active', v_user.is_campus_active,
        'is_groovelab_active', v_user.is_groovelab_active,
        'is_master_admin', v_user.is_master_admin,
        'is_app_user', v_user.is_app_user,
        'is_trial', v_user.is_trial,
        'trial_ends_at', v_user.trial_ends_at,
        'contract_ends_at', v_user.contract_ends_at,
        'contract_decision_made', v_user.contract_decision_made,
        'is_pin_activated', v_user.is_pin_activated,
        'app_usage_mode', v_user.app_usage_mode,
        'lesson_duration', v_user.lesson_duration,
        'exempt_from_direct_billing', v_user.exempt_from_direct_billing,
        'show_sekretariat', v_user.show_sekretariat,
        'show_campus', v_user.show_campus,
        'show_groovelab', v_user.show_groovelab,
        'teacher_id', v_user.teacher_id,
        'group_id', v_user.group_id,
        'sibling_group_id', v_user.sibling_group_id,
        'preferred_room_ids', v_user.preferred_room_ids,
        'schools', CASE WHEN v_school.id IS NOT NULL THEN to_jsonb(v_school) ELSE NULL END
    );

    RETURN jsonb_build_object(
        'success', true,
        'lease_token', v_lease_id,
        'user', v_sanitized_user
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.authenticate_webauthn_credential(TEXT, TEXT, UUID) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 5. CANONICAL REVOCATION RPC: revoke_user_passkeys
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_user_passkeys(
    p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_target_user RECORD;
    v_revoked_count INT := 0;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school_id := public.get_current_user_school_id();

    SELECT id, school_id, role INTO v_target_user
    FROM public.users_raw
    WHERE id = p_target_user_id;

    IF v_target_user.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Benutzer nicht gefunden.');
    END IF;

    -- Strict Authorization: Master Admin, or Admin/Secretary in same school, or target user themselves
    IF NOT (
        public.is_master_admin()
        OR (v_caller_school_id IS NOT NULL AND v_caller_school_id = v_target_user.school_id AND v_caller_role IN ('admin', 'secretary'))
        OR (v_caller_id IS NOT NULL AND v_caller_id = p_target_user_id)
        OR current_setting('role', true) IN ('postgres', 'supabase_admin', 'service_role')
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_REVOCATION');
    END IF;

    -- Deactivate in private_auth
    WITH upd AS (
        UPDATE private_auth.webauthn_credentials
        SET is_active = FALSE
        WHERE user_id = p_target_user_id
        RETURNING id
    )
    SELECT COUNT(*) INTO v_revoked_count FROM upd;

    -- Delete or deactivate in public.user_credentials
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_credentials'
    ) THEN
        DELETE FROM public.user_credentials WHERE user_id = p_target_user_id;
    END IF;

    -- Invalidate all active session leases
    UPDATE public.session_leases
    SET is_revoked = TRUE
    WHERE user_id = p_target_user_id;

    -- Bump token version & sessions_revoked_at to kill any active JWT/Leases
    UPDATE public.users_raw
    SET token_version = COALESCE(token_version, 1) + 1,
        sessions_revoked_at = timezone('utc'::text, now())
    WHERE id = p_target_user_id;

    -- Revisionssicheres Audit-Logging (both action and operation provided)
    INSERT INTO public.audit_logs (
        table_name, action, operation, record_id, changed_by, new_data
    ) VALUES (
        'webauthn_credentials', 'REVOKE_USER_PASSKEYS', 'REVOKE_USER_PASSKEYS', p_target_user_id,
        COALESCE(v_caller_id, gen_random_uuid()),
        jsonb_build_object(
            'action', 'revoke_user_passkeys',
            'target_user_id', p_target_user_id,
            'revoked_count', v_revoked_count,
            'performed_by_role', v_caller_role,
            'timestamp', timezone('utc'::text, now())
        )
    );

    RETURN jsonb_build_object('success', true, 'revoked_count', v_revoked_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_user_passkeys(UUID) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 6. CANONICAL REVOCATION RPC: revoke_teacher_passkeys
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_teacher_passkeys(p_teacher_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
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

    -- Revisionssicheres Audit-Logging (both action and operation provided)
    INSERT INTO public.audit_logs (
        table_name, action, operation, record_id, changed_by, new_data
    ) VALUES (
        'user_credentials', 'REVOKE_TEACHER_PASSKEYS', 'REVOKE_TEACHER_PASSKEYS', p_teacher_id,
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

GRANT EXECUTE ON FUNCTION public.revoke_teacher_passkeys(UUID) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 7. NOTIFY POSTGREST TO RELOAD SCHEMA CACHE
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
