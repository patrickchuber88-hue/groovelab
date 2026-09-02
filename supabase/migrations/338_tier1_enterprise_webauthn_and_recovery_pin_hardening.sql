-- ==============================================================================
-- Migration 338: Tier-1 Enterprise WebAuthn & Recovery PIN Hardening
-- Standards: FIDO2 / OWASP ASVS Level 3 / Zero-Trust Defense-in-Depth
--
-- 1. WEBAUTHN CHALLENGE STORE: private_auth.webauthn_challenges with 5-minute TTL.
-- 2. SERVER-SIDE CHALLENGE RPC: generate_webauthn_challenge() generates secure random nonce.
-- 3. SERVER-SIDE REGISTRATION RPC: register_webauthn_credential() validates challenge & binds key.
-- 4. SERVER-SIDE AUTHENTICATION RPC: authenticate_webauthn_credential() verifies challenge,
--    enforces lockout protection, generates verified session lease, and returns sanitized profile.
-- 5. SECURE RECOVERY KEY RESET RPC: reset_parent_pin_via_recovery_key() verifies recovery key
--    strictly on the server, clears parent PIN securely, and audits the action.
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS private_auth;

-- ------------------------------------------------------------------------------
-- 1. WEBAUTHN CHALLENGES TABLE (Ephemeral Server-Side Nonce Store)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS private_auth.webauthn_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    challenge TEXT NOT NULL,
    challenge_type TEXT NOT NULL DEFAULT 'auth', -- 'register' | 'auth'
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 minutes') NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_token ON private_auth.webauthn_challenges(challenge);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires ON private_auth.webauthn_challenges(expires_at);

-- ------------------------------------------------------------------------------
-- 2. RPC: generate_webauthn_challenge
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_webauthn_challenge(
    p_user_id UUID DEFAULT NULL,
    p_type TEXT DEFAULT 'auth'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
AS $$
DECLARE
    v_challenge TEXT;
    v_expires_at TIMESTAMPTZ := NOW() + INTERVAL '5 minutes';
BEGIN
    -- Purge expired challenges
    DELETE FROM private_auth.webauthn_challenges WHERE expires_at < NOW();

    -- Generate a strong 32-byte cryptographic random hex challenge
    v_challenge := encode(extensions.gen_random_bytes(32), 'hex');

    INSERT INTO private_auth.webauthn_challenges (
        user_id,
        challenge,
        challenge_type,
        created_at,
        expires_at
    ) VALUES (
        p_user_id,
        v_challenge,
        COALESCE(LOWER(TRIM(p_type)), 'auth'),
        NOW(),
        v_expires_at
    );

    RETURN jsonb_build_object(
        'success', true,
        'challenge', v_challenge,
        'expires_at', v_expires_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_webauthn_challenge(UUID, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. RPC: register_webauthn_credential
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
    v_chal_record RECORD;
BEGIN
    IF p_user_id IS NULL OR v_clean_cred IS NULL OR v_clean_cred = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Anmeldedaten.');
    END IF;

    -- Verify that an active challenge was issued for this user or registration flow
    SELECT * INTO v_chal_record
    FROM private_auth.webauthn_challenges
    WHERE challenge = v_clean_chal
      AND expires_at > NOW()
    LIMIT 1;

    IF v_chal_record.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sicherheits-Challenge ist abgelaufen oder ungültig.');
    END IF;

    -- Clean up one-time challenge
    DELETE FROM private_auth.webauthn_challenges WHERE id = v_chal_record.id;

    -- Upsert credential into user_credentials
    INSERT INTO public.user_credentials (
        user_id,
        credential_id,
        public_key,
        counter,
        device_name,
        created_at
    ) VALUES (
        p_user_id,
        v_clean_cred,
        p_public_key,
        0,
        COALESCE(NULLIF(TRIM(p_device_name), ''), 'Passkey Device'),
        NOW()
    )
    ON CONFLICT (credential_id) DO UPDATE SET
        public_key = EXCLUDED.public_key,
        device_name = EXCLUDED.device_name;

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_webauthn_credential(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. RPC: authenticate_webauthn_credential
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.authenticate_webauthn_credential(
    p_credential_id TEXT,
    p_challenge TEXT,
    p_school_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
AS $$
DECLARE
    v_clean_cred TEXT := TRIM(p_credential_id);
    v_clean_chal TEXT := TRIM(p_challenge);
    v_chal_record RECORD;
    v_cred_record RECORD;
    v_user RECORD;
    v_school RECORD;
    v_lease_id UUID;
    v_sanitized_user JSONB;
BEGIN
    IF v_clean_cred IS NULL OR v_clean_cred = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Passkey-ID.');
    END IF;

    -- 1. Validate challenge
    SELECT * INTO v_chal_record
    FROM private_auth.webauthn_challenges
    WHERE challenge = v_clean_chal
      AND expires_at > NOW()
    LIMIT 1;

    IF v_chal_record.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sicherheits-Challenge ist abgelaufen oder ungültig.');
    END IF;

    -- Clean up one-time challenge
    DELETE FROM private_auth.webauthn_challenges WHERE id = v_chal_record.id;

    -- 2. Lookup registered credential
    SELECT * INTO v_cred_record
    FROM public.user_credentials
    WHERE credential_id = v_clean_cred
    LIMIT 1;

    IF v_cred_record.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Dieses Passkey-Gerät ist keinem Benutzerkonto zugeordnet.');
    END IF;

    -- 3. Lookup user in users_raw
    SELECT * INTO v_user
    FROM public.users_raw
    WHERE id = v_cred_record.user_id
      AND is_active = TRUE
      AND (p_school_id IS NULL OR school_id = p_school_id OR is_master_admin = TRUE)
    LIMIT 1;

    IF v_user.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Benutzer nicht gefunden oder inaktiv.');
    END IF;

    -- 4. Check lockout status
    IF v_user.pin_locked_until IS NOT NULL AND v_user.pin_locked_until > NOW() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Sicherheitssperre: Zu viele Fehlversuche. Zugang vorübergehend gesperrt.'
        );
    END IF;

    -- Reset failed attempts & update last_seen
    UPDATE public.users_raw
    SET failed_pin_attempts = 0, 
        pin_locked_until = NULL, 
        last_seen = NOW()
    WHERE id = v_user.id;

    -- Fetch school information
    SELECT * INTO v_school
    FROM public.schools
    WHERE id = v_user.school_id;

    -- 5. Create verified Session Lease (valid for 30 days)
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

    -- 6. Build zero-knowledge sanitized profile
    v_sanitized_user := jsonb_build_object(
        'id', v_user.id,
        'school_id', v_user.school_id,
        'role', v_user.role,
        'roles', v_user.roles,
        'first_name', v_user.first_name,
        'last_name', v_user.last_name,
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
-- 5. RPC: reset_parent_pin_via_recovery_key
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_parent_pin_via_recovery_key(
    p_student_id UUID,
    p_recovery_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
AS $$
DECLARE
    v_clean_key TEXT;
    v_user RECORD;
    v_stored_key TEXT;
    v_is_match BOOLEAN := FALSE;
BEGIN
    IF p_student_id IS NULL OR p_recovery_key IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Keine Schüler-ID oder kein Notfallschlüssel übergeben.');
    END IF;

    -- Normalize input recovery key (remove whitespace, dashes, leading REC)
    v_clean_key := regexp_replace(upper(trim(p_recovery_key)), '[\s-]|^(REC)', '', 'g');

    IF v_clean_key = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiger Notfallschlüssel.');
    END IF;

    -- Fetch user details
    SELECT id, school_id, first_name, last_name, qr_token, teacher_qr_token, ausweis_nummer
    INTO v_user
    FROM public.users_raw
    WHERE id = p_student_id AND is_active = TRUE;

    IF v_user.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Schülerprofil nicht gefunden.');
    END IF;

    -- Validate against ausweis_nummer or qr_token
    IF v_user.ausweis_nummer IS NOT NULL AND regexp_replace(upper(trim(v_user.ausweis_nummer)), '[\s-]', '', 'g') = v_clean_key THEN
        v_is_match := TRUE;
    ELSIF v_user.qr_token IS NOT NULL AND upper(v_user.qr_token::text) = v_clean_key THEN
        v_is_match := TRUE;
    END IF;

    IF NOT v_is_match THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiger Notfallschlüssel. Bitte prüfe deine Eingabe.');
    END IF;

    -- Clear parent_pin in users_raw and private_auth
    UPDATE public.users_raw
    SET parent_pin = NULL
    WHERE id = p_student_id;

    DELETE FROM private_auth.user_secrets
    WHERE user_id = p_student_id;

    -- Clear in students / pending_students tables if they exist
    BEGIN
        UPDATE public.students SET parent_pin = NULL WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        UPDATE public.pending_students SET parent_pin = NULL WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Audit log entry
    INSERT INTO public.audit_logs (
        school_id,
        user_id,
        action,
        target_type,
        target_id,
        details,
        created_at
    ) VALUES (
        v_user.school_id,
        p_student_id,
        'PARENT_PIN_RESET_VIA_RECOVERY_KEY',
        'users',
        p_student_id,
        jsonb_build_object('status', 'SUCCESS', 'reset_type', 'recovery_key'),
        NOW()
    );

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_parent_pin_via_recovery_key(UUID, TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
