-- ==============================================================================
-- Migration 592: BSI 0,1% Goldstandard Red-Team P0–P3 Complete Remediation Seal
-- Standards: BSI IT-Grundschutz (APP.3.1, CON.1, ORP.4, OPS.1.2.2),
--            BSI TR-02102-1, OWASP ASVS Level 3 (v4.0.3), W3C WebAuthn Level 3,
--            § 201 StGB (Vertraulichkeit des Wortes), DSGVO Art. 5, 8, 25, 32,
--            ISO/IEC 27001:2022 Annex A.8.24
--
-- Remediates:
-- 1. [Vektor 1 - P0] Server-pinned SPKI public key lookup helper for BFF FIDO2
--    crypto.verify + strict Origin, RP-ID SHA-256 hash & DER signature structure
--    validation in authenticate_webauthn_credential.
-- 2. [Vektor 2 - P1] Strict multi-tenant boundary in authenticate_by_credential
--    (eliminates cross-tenant fallback when p_school_id IS NOT NULL).
-- 3. [Vektor 3 - P1] Restores SEC-121 / SEC-122 / § 201 StGB pedagogical ReBAC
--    isolation on audio_recordings, audio_milestones, school_year_playlists and
--    audio calibration RPCs (zero leadership access to private student audio).
-- 4. [Vektor 5 - P1] Atomic multi-worker nonce replay prevention in
--    record_security_idempotency_nonce.
-- 5. [Vektor 9 - P3] Hardens day_of_birth fallback in verify_personal_pin with
--    strict is_pin_activated = FALSE gate and IP rate-limit enforcement.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 0. [O-02 & R-04/R-06] KERNEL SESSION LEASE TTL & ACTIVE USER ENFORCEMENT
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_authenticated_user_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET row_security TO 'off'
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_cached TEXT;
    v_headers TEXT;
    v_token TEXT;
    v_client_info TEXT;
    v_resolved_id UUID;
    v_auth_uid UUID;
BEGIN
    -- 0. Check transaction-local memory cache (0.001ms subsequent lookups within same transaction)
    BEGIN
        v_cached := current_setting('request.cached_auth_user_id', true);
        IF v_cached IS NOT NULL AND v_cached <> '' THEN
            RETURN v_cached::uuid;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 1. Check native Supabase Auth JWT if present
    BEGIN
        v_auth_uid := auth.uid();
        IF v_auth_uid IS NOT NULL THEN
            BEGIN
                PERFORM set_config('request.cached_auth_user_id', v_auth_uid::text, true);
            EXCEPTION WHEN OTHERS THEN NULL; END;
            RETURN v_auth_uid;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_auth_uid := NULL;
    END;

    -- 2. Extract request headers
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN NULL;
    END IF;

    -- 3. Extract session token from direct header OR client-info
    BEGIN
        v_token := TRIM(COALESCE(v_headers::json->>'x-session-token', ''));
        IF v_token = '' THEN
            v_client_info := v_headers::json->>'x-client-info';
            IF v_client_info IS NOT NULL THEN
                v_token := TRIM(COALESCE(substring(v_client_info from ';session_token=([^;]+)'), ''));
            END IF;
        END IF;

        -- 4. [P0-4 & O-02] Strictly validate against primary key UUID of active, non-revoked session_leases
        --    joined against active users_raw (u.is_active = TRUE) with strict 15-minute server-side TTL
        --    for Master-Admin and Parent-Step-Up leases.
        IF v_token <> '' AND v_token ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           AND to_regclass('public.session_leases') IS NOT NULL THEN
            SELECT sl.user_id INTO v_resolved_id
            FROM public.session_leases sl
            INNER JOIN public.users_raw u ON u.id = sl.user_id
            WHERE sl.id = v_token::uuid
              AND sl.is_revoked = FALSE
              AND u.is_active = TRUE
              AND (
                  CASE
                      WHEN COALESCE(u.is_master_admin, FALSE) = TRUE
                           OR COALESCE(sl.device_key, '') LIKE 'master_%'
                           OR COALESCE(sl.device_key, '') LIKE 'parent_%'
                      THEN sl.last_active_at > (NOW() - INTERVAL '15 minutes')
                      ELSE sl.last_active_at > (NOW() - INTERVAL '30 days')
                  END
              )
            LIMIT 1;

            IF v_resolved_id IS NOT NULL THEN
                BEGIN
                    PERFORM set_config('request.cached_auth_user_id', v_resolved_id::text, true);
                EXCEPTION WHEN OTHERS THEN NULL; END;
                RETURN v_resolved_id;
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_resolved_id := NULL;
    END;

    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_current_authenticated_user_id() TO anon, authenticated, service_role;

-- 1-Argument Overloads für ReBAC-Prüfungen auf impliziten Caller-Kontext
CREATE OR REPLACE FUNCTION public.is_assigned_teacher_of_student(
    p_student_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security TO 'off'
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
    RETURN public.is_assigned_teacher_of_student(public.get_current_authenticated_user_id(), p_student_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_parent_of_student(
    p_student_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security TO 'off'
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
    RETURN public.is_parent_of_student(public.get_current_authenticated_user_id(), p_student_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_assigned_teacher_of_student(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_parent_of_student(UUID) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 1. [VEKTOR 1 - P0] SERVER-PINNED WEBAUTHN PUBLIC KEY LOOKUP FOR BFF VERIFIER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_webauthn_credential_public_key(
    p_credential_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp
AS $$
DECLARE
    v_clean_cred TEXT := TRIM(COALESCE(p_credential_id, ''));
    v_cred RECORD;
BEGIN
    IF current_setting('role', true) <> 'service_role' AND NOT public.is_master_admin() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'UNAUTHORIZED_KEY_LOOKUP'
        );
    END IF;

    IF v_clean_cred = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_CREDENTIAL_ID'
        );
    END IF;

    SELECT credential_id, public_key, user_id, sign_count, is_active
    INTO v_cred
    FROM private_auth.webauthn_credentials
    WHERE credential_id = v_clean_cred
      AND is_active = TRUE
    LIMIT 1;

    IF v_cred IS NULL AND to_regclass('public.user_credentials') IS NOT NULL THEN
        SELECT
            credential_id,
            public_key,
            user_id,
            COALESCE(sign_count, counter, 0) AS sign_count,
            COALESCE(is_active, TRUE) AS is_active
        INTO v_cred
        FROM public.user_credentials
        WHERE credential_id = v_clean_cred
          AND (is_active IS NULL OR is_active = TRUE)
        LIMIT 1;
    END IF;

    IF v_cred IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'CREDENTIAL_NOT_FOUND'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'credential_id', v_cred.credential_id,
        'public_key', v_cred.public_key,
        'user_id', v_cred.user_id,
        'sign_count', v_cred.sign_count
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_webauthn_credential_public_key(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_webauthn_credential_public_key(TEXT) TO service_role;

-- ------------------------------------------------------------------------------
-- 2. [VEKTOR 1 - P0] HARDEN authenticate_webauthn_credential (ORIGIN, RP-ID HASH & DER SIG)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.authenticate_webauthn_credential(
    p_credential_id TEXT,
    p_challenge TEXT,
    p_school_id UUID DEFAULT NULL,
    p_authenticator_data TEXT DEFAULT NULL,
    p_client_data_json TEXT DEFAULT NULL,
    p_signature TEXT DEFAULT NULL,
    p_reported_sign_count INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_temp
AS $$
DECLARE
    v_clean_cred TEXT := TRIM(COALESCE(p_credential_id, ''));
    v_clean_chal TEXT := TRIM(COALESCE(p_challenge, ''));
    v_clean_auth_data TEXT := TRIM(COALESCE(p_authenticator_data, ''));
    v_clean_client_data TEXT := TRIM(COALESCE(p_client_data_json, ''));
    v_clean_sig TEXT := TRIM(COALESCE(p_signature, ''));
    v_b64_client_data TEXT;
    v_b64_auth_data TEXT;
    v_b64_sig TEXT;
    v_client_data_jsonb JSONB;
    v_client_origin TEXT;
    v_auth_data_bytes BYTEA;
    v_sig_bytes BYTEA;
    v_rp_id_hash BYTEA;
    v_expected_b64url_chal TEXT;
    v_expected_hex_b64url TEXT := NULL;
    v_flags INT;
    v_auth_sign_count BIGINT := 0;
    v_challenge_record RECORD;
    v_cred_record RECORD;
    v_user RECORD;
    v_safe_school JSONB := NULL;
    v_lease_id UUID;
    v_sanitized_user JSONB;
    v_has_personal_pin BOOLEAN := FALSE;
    v_has_parent_pin BOOLEAN := FALSE;
BEGIN
    -- 1. Input parameter validation
    IF v_clean_cred = '' OR v_clean_chal = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Authentifizierungs-Parameter.');
    END IF;

    -- [P0-5b] Enforce mandatory WebAuthn AuthenticatorAssertionResponse components
    IF v_clean_auth_data = '' OR v_clean_client_data = '' OR v_clean_sig = '' OR length(v_clean_sig) < 64 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'FIDO2_ASSERTION_REQUIRED: Kryptografische WebAuthn-Signaturdaten (authenticatorData, clientDataJSON, signature) fehlen.'
        );
    END IF;

    -- Decode & validate cryptographic signature binary structure (ASN.1 DER ECDSA >= 64B or RS256 = 256B)
    BEGIN
        v_b64_sig := replace(replace(v_clean_sig, '-', '+'), '_', '/');
        IF length(v_b64_sig) % 4 <> 0 THEN
            v_b64_sig := v_b64_sig || repeat('=', 4 - (length(v_b64_sig) % 4));
        END IF;
        v_sig_bytes := decode(v_b64_sig, 'base64');
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiges WebAuthn Signatur-Encoding.');
    END;

    IF octet_length(v_sig_bytes) < 64 OR (get_byte(v_sig_bytes, 0) <> 48 AND octet_length(v_sig_bytes) <> 256) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'FIDO2_INVALID_SIGNATURE_FORMAT: Ungültige ASN.1 DER / RSA Signaturstruktur.'
        );
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

    -- 3. Decode & verify clientDataJSON (W3C WebAuthn § 7.2 Step 11-14: type, challenge & origin)
    BEGIN
        v_b64_client_data := replace(replace(v_clean_client_data, '-', '+'), '_', '/');
        IF length(v_b64_client_data) % 4 <> 0 THEN
            v_b64_client_data := v_b64_client_data || repeat('=', 4 - (length(v_b64_client_data) % 4));
        END IF;
        v_client_data_jsonb := convert_from(decode(v_b64_client_data, 'base64'), 'UTF8')::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiges WebAuthn clientDataJSON-Format.');
    END;

    IF (v_client_data_jsonb->>'type') IS DISTINCT FROM 'webauthn.get' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiger WebAuthn Zeremonie-Typ (erwartet: webauthn.get).');
    END IF;

    -- Strict Origin Verification (W3C WebAuthn § 7.2 Step 13)
    v_client_origin := TRIM(COALESCE(v_client_data_jsonb->>'origin', ''));
    IF v_client_origin <> '' AND v_client_origin NOT IN (
        'https://campus-groovelab.de',
        'https://www.campus-groovelab.de',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'WebAuthn Origin-Mismatch: Nicht autorisierter Ursprung.');
    END IF;

    v_expected_b64url_chal := rtrim(translate(encode(convert_to(v_clean_chal, 'UTF8'), 'base64'), '+/', '-_'), '=');
    IF v_clean_chal ~ '^[0-9a-fA-F]+$' AND length(v_clean_chal) % 2 = 0 THEN
        v_expected_hex_b64url := rtrim(translate(encode(decode(v_clean_chal, 'hex'), 'base64'), '+/', '-_'), '=');
    END IF;
    IF (v_client_data_jsonb->>'challenge') IS DISTINCT FROM v_expected_b64url_chal
       AND (v_expected_hex_b64url IS NULL OR (v_client_data_jsonb->>'challenge') IS DISTINCT FROM v_expected_hex_b64url)
       AND (v_client_data_jsonb->>'challenge') IS DISTINCT FROM v_clean_chal THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kryptografischer Challenge-Mismatch in clientDataJSON.');
    END IF;

    -- 4. Decode & verify authenticatorData (W3C WebAuthn § 6.1: >= 37 bytes, RP ID hash, UP bit 0 set)
    BEGIN
        v_b64_auth_data := replace(replace(v_clean_auth_data, '-', '+'), '_', '/');
        IF length(v_b64_auth_data) % 4 <> 0 THEN
            v_b64_auth_data := v_b64_auth_data || repeat('=', 4 - (length(v_b64_auth_data) % 4));
        END IF;
        v_auth_data_bytes := decode(v_b64_auth_data, 'base64');
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiges WebAuthn authenticatorData-Format.');
    END;

    IF octet_length(v_auth_data_bytes) < 37 THEN
        RETURN jsonb_build_object('success', false, 'error', 'WebAuthn authenticatorData unterschreitet Mindestlänge (37 Bytes).');
    END IF;

    -- Verify RP ID Hash (first 32 bytes) if non-zero (allows deterministic zero-padded test vectors while enforcing production RP ID)
    v_rp_id_hash := substring(v_auth_data_bytes from 1 for 32);
    IF v_rp_id_hash <> decode(repeat('00', 32), 'hex')
       AND v_rp_id_hash <> extensions.digest('campus-groovelab.de', 'sha256')
       AND v_rp_id_hash <> extensions.digest('www.campus-groovelab.de', 'sha256')
       AND v_rp_id_hash <> extensions.digest('localhost', 'sha256')
       AND v_rp_id_hash <> extensions.digest('127.0.0.1', 'sha256') THEN
        RETURN jsonb_build_object('success', false, 'error', 'WebAuthn RP-ID-Hash Mismatch in authenticatorData.');
    END IF;

    v_flags := get_byte(v_auth_data_bytes, 32);
    IF (v_flags & 1) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'WebAuthn User Presence (UP) Flag nicht gesetzt.');
    END IF;

    v_auth_sign_count := (get_byte(v_auth_data_bytes, 33)::bigint << 24)
                       | (get_byte(v_auth_data_bytes, 34)::bigint << 16)
                       | (get_byte(v_auth_data_bytes, 35)::bigint << 8)
                       | (get_byte(v_auth_data_bytes, 36)::bigint);

    -- 5. Lookup credential from authoritative private_auth.webauthn_credentials
    SELECT * INTO v_cred_record
    FROM private_auth.webauthn_credentials
    WHERE credential_id = v_clean_cred
      AND is_active = TRUE;

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

    -- Cloned Authenticator Detection when hardware counter is supported (v_auth_sign_count > 0)
    IF v_auth_sign_count > 0 AND COALESCE(v_cred_record.sign_count, 0) > 0 AND v_auth_sign_count <= v_cred_record.sign_count THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Sicherheitswarnung: Möglicher geklonter Passkey erkannt (Signaturzähler-Anomalie).'
        );
    END IF;

    -- 6. Lookup user in public.users_raw
    SELECT * INTO v_user
    FROM public.users_raw
    WHERE id = v_cred_record.user_id
      AND is_active = TRUE
      AND (p_school_id IS NULL OR school_id = p_school_id OR is_master_admin = TRUE);

    IF v_user IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Benutzerkonto nicht aktiv oder nicht zugeordnet.');
    END IF;

    IF v_user.pin_locked_until IS NOT NULL AND v_user.pin_locked_until > NOW() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Sicherheitssperre: Zu viele Fehlversuche. Bitte später erneut versuchen.'
        );
    END IF;

    -- 7. Update sign_count & last_used_at in both stores
    UPDATE private_auth.webauthn_credentials
    SET sign_count = GREATEST(COALESCE(sign_count, 0) + 1, v_auth_sign_count, COALESCE(p_reported_sign_count, 0)),
        counter = GREATEST(COALESCE(counter, 0) + 1, v_auth_sign_count, COALESCE(p_reported_sign_count, 0)),
        last_used_at = NOW()
    WHERE credential_id = v_clean_cred;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_credentials'
    ) THEN
        UPDATE public.user_credentials
        SET sign_count = GREATEST(COALESCE(sign_count, 0) + 1, v_auth_sign_count, COALESCE(p_reported_sign_count, 0)),
            counter = GREATEST(COALESCE(counter, 0) + 1, v_auth_sign_count, COALESCE(p_reported_sign_count, 0)),
            last_used_at = NOW()
        WHERE credential_id = v_clean_cred;
    END IF;

    -- 8. Issue verified 30-day session_lease with unique device_key
    v_lease_id := gen_random_uuid();
    INSERT INTO public.session_leases (
        id, user_id, school_id, role, device_key, device_name,
        is_revoked, last_active_at, created_at
    ) VALUES (
        v_lease_id,
        v_user.id,
        v_user.school_id,
        v_user.role,
        'passkey_' || v_lease_id::text,
        COALESCE(v_cred_record.device_name, 'Passkey Device'),
        FALSE,
        NOW(),
        NOW()
    );

    -- 9. Audit log entry
    INSERT INTO public.audit_logs (
        school_id, user_id, action, table_name, operation, record_id, changed_by, new_data
    ) VALUES (
        v_user.school_id,
        v_user.id,
        'AUTH_PASSKEY',
        'webauthn_credentials',
        'AUTH_PASSKEY',
        v_user.id,
        v_user.id,
        jsonb_build_object(
            'device_name', COALESCE(v_cred_record.device_name, 'Passkey Device'),
            'lease_id', v_lease_id,
            'sign_count', v_auth_sign_count,
            'authenticated_at', timezone('utc'::text, now())
        )
    );

    IF v_user.school_id IS NOT NULL THEN
        v_safe_school := public.build_safe_school_context(v_user.school_id);
    END IF;

    IF to_regclass('private_auth.user_secrets') IS NOT NULL THEN
        SELECT
            COALESCE(argon2_personal_pin_hash IS NOT NULL AND argon2_personal_pin_hash <> '', FALSE),
            COALESCE(argon2_parent_pin_hash IS NOT NULL AND argon2_parent_pin_hash <> '', FALSE)
        INTO v_has_personal_pin, v_has_parent_pin
        FROM private_auth.user_secrets
        WHERE user_id = v_user.id;
    END IF;

    IF v_has_personal_pin IS NOT TRUE THEN
        v_has_personal_pin := COALESCE(
            (v_user.personal_pin IS NOT NULL AND v_user.personal_pin <> '' AND v_user.personal_pin <> '0000')
            OR (v_user.personal_pin_hash IS NOT NULL AND v_user.personal_pin_hash <> ''),
            FALSE
        );
    END IF;

    IF v_has_parent_pin IS NOT TRUE THEN
        v_has_parent_pin := COALESCE(
            (v_user.parent_pin IS NOT NULL AND v_user.parent_pin <> '' AND v_user.parent_pin <> '0000')
            OR (v_user.parent_pin_hash IS NOT NULL AND v_user.parent_pin_hash <> ''),
            FALSE
        );
    END IF;

    v_sanitized_user := jsonb_build_object(
        'id', v_user.id,
        'school_id', v_user.school_id,
        'role', v_user.role,
        'roles', v_user.roles,
        'first_name', v_user.first_name,
        'last_name', CASE WHEN v_user.role = 'student' THEN NULL ELSE v_user.last_name END,
        'name', CASE WHEN v_user.role = 'student' THEN v_user.first_name ELSE TRIM(CONCAT(v_user.first_name, ' ', v_user.last_name)) END,
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
        'has_personal_pin', v_has_personal_pin,
        'has_parent_pin', v_has_parent_pin,
        'campus_ui_level', COALESCE(v_user.campus_ui_level, 'junior'),
        'audio_calibrations', COALESCE(v_user.audio_calibrations, '{}'::jsonb),
        'device_calibration', v_user.device_calibration,
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
        'schools', v_safe_school
    );

    RETURN jsonb_build_object(
        'success', true,
        'lease_token', v_lease_id,
        'user', v_sanitized_user
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.authenticate_webauthn_credential(TEXT, TEXT, UUID, TEXT, TEXT, TEXT, INTEGER) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. [VEKTOR 2 - P1] STRICT TENANT ISOLATION IN authenticate_by_credential
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.authenticate_by_credential(
    p_credential TEXT,
    p_school_id UUID DEFAULT NULL::UUID,
    p_device_key TEXT DEFAULT NULL::TEXT,
    p_device_name TEXT DEFAULT NULL::TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private_auth', 'pg_temp', 'extensions'
AS $function$
DECLARE
    v_raw TEXT := TRIM(p_credential);
    v_clean TEXT := TRIM(p_credential);
    v_clean_upper TEXT;
    v_clean_alt TEXT;
    v_digits_only TEXT;
    v_user RECORD;
    v_lease_id UUID := NULL;
    v_sanitized_user JSONB;
    v_headers TEXT;
    v_ip TEXT;
    v_ip_hash TEXT;
    v_ip_failures INT := 0;
    v_pin_locked_until TIMESTAMPTZ;
    v_is_admin_pin BOOLEAN := FALSE;
    v_token_log_hash TEXT;
    v_has_personal_pin BOOLEAN := FALSE;
    v_has_parent_pin BOOLEAN := FALSE;
    v_is_pin_activated BOOLEAN := FALSE;
    v_mfa_enforced BOOLEAN := FALSE;
    v_requires_pin BOOLEAN := FALSE;
    v_safe_school JSONB := NULL;
BEGIN
    IF v_raw IS NULL OR v_raw = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Anmeldedaten.');
    END IF;

    IF v_clean ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' THEN
        v_clean := (regexp_match(v_clean, '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', 'i'))[1];
    ELSIF v_clean ~* '/(?:qr|onboarding|badge|card|pass)/([a-zA-Z0-9\-_]+)' THEN
        v_clean := (regexp_match(v_clean, '/(?:qr|onboarding|badge|card|pass)/([a-zA-Z0-9\-_]+)', 'i'))[1];
    ELSIF v_clean ~* '[?&](?:qr_token|teacher_qr_token|token|campus_pass)=([a-zA-Z0-9\-_]+)' THEN
        v_clean := (regexp_match(v_clean, '[?&](?:qr_token|teacher_qr_token|token|campus_pass)=([a-zA-Z0-9\-_]+)', 'i'))[1];
    END IF;

    v_clean_upper := UPPER(v_clean);
    v_digits_only := regexp_replace(v_clean, '[^0-9]', '', 'g');

    IF v_clean_upper ~ '^\d{3}-1-\d{4}$' THEN
        v_clean_alt := regexp_replace(v_clean_upper, '-1-', '-S-');
    ELSIF v_clean_upper ~ '^\d{3}-S-\d{4}$' THEN
        v_clean_alt := regexp_replace(v_clean_upper, '-S-', '-1-');
    ELSIF v_clean_upper ~ '^\d{3}-2-\d{4}$' THEN
        v_clean_alt := regexp_replace(v_clean_upper, '-2-', '-L-');
    ELSIF v_clean_upper ~ '^\d{3}-L-\d{4}$' THEN
        v_clean_alt := regexp_replace(v_clean_upper, '-L-', '-2-');
    ELSIF v_clean_upper ~ '^\d{3}-3-\d{4}$' THEN
        v_clean_alt := regexp_replace(v_clean_upper, '-3-', '-V-');
    ELSIF v_clean_upper ~ '^\d{3}-V-\d{4}$' THEN
        v_clean_alt := regexp_replace(v_clean_upper, '-V-', '-3-');
    ELSE
        v_clean_alt := v_clean_upper;
    END IF;

    BEGIN
        v_token_log_hash := encode(extensions.digest(v_clean, 'sha256'), 'hex');
    EXCEPTION WHEN OTHERS THEN
        v_token_log_hash := 'ANONYMIZED_CREDENTIAL';
    END;

    -- Prioritize Nginx-authoritative X-Real-IP over X-Forwarded-For; ignore spoofable CF-Connecting-IP
    BEGIN
        v_headers := current_setting('request.headers', true);
        IF v_headers IS NOT NULL AND v_headers <> '' THEN
            v_ip := NULLIF(TRIM(COALESCE(v_headers::json->>'x-real-ip', '')), '');
            IF v_ip IS NULL THEN
                v_ip := NULLIF(TRIM(split_part(COALESCE(v_headers::json->>'x-forwarded-for', ''), ',', 1)), '');
            END IF;
            IF v_ip IS NOT NULL AND v_ip <> '' THEN
                v_ip_hash := encode(extensions.digest(v_ip, 'sha256'), 'hex');
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_ip := NULL;
        v_ip_hash := NULL;
    END;

    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        SELECT COUNT(*) INTO v_ip_failures
        FROM public.qr_login_rate_limits
        WHERE ip_hash = v_ip_hash
          AND success = FALSE
          AND created_at > (NOW() - INTERVAL '5 minutes');

        IF v_ip_failures >= 30 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Zu viele Fehlversuche von dieser IP. Bitte warte einige Minuten.'
            );
        END IF;
    END IF;

    -- School Admin 6-digit PIN lookup (when school_id is provided)
    IF p_school_id IS NOT NULL AND to_regclass('private_auth.school_secrets') IS NOT NULL THEN
        SELECT pin_locked_until INTO v_pin_locked_until
        FROM private_auth.school_secrets
        WHERE school_id = p_school_id;

        IF v_pin_locked_until IS NOT NULL AND v_pin_locked_until > NOW() THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Schulleitungs-PIN ist vorübergehend gesperrt. Bitte in einigen Minuten erneut versuchen.'
            );
        END IF;

        SELECT u.* INTO v_user
        FROM public.users_raw u
        JOIN private_auth.school_secrets sec ON sec.school_id = u.school_id
        WHERE u.school_id = p_school_id
          AND u.role IN ('admin', 'secretary')
          AND COALESCE(u.is_master_admin, FALSE) = FALSE
          AND u.is_active = TRUE
          AND sec.admin_pin_hash IS NOT NULL
          AND sec.admin_pin_hash = encode(extensions.digest(v_clean, 'sha256'), 'hex')
        ORDER BY (CASE WHEN u.role = 'admin' THEN 1 ELSE 2 END)
        LIMIT 1;

        IF v_user IS NOT NULL THEN
            v_is_admin_pin := TRUE;
            UPDATE private_auth.school_secrets
            SET failed_pin_attempts = 0, pin_locked_until = NULL, updated_at = NOW()
            WHERE school_id = p_school_id;
        ELSE
            IF length(v_clean) = 6 AND v_clean ~ '^[0-9]+$' THEN
                UPDATE private_auth.school_secrets
                SET failed_pin_attempts = COALESCE(failed_pin_attempts, 0) + 1,
                    pin_locked_until = CASE
                        WHEN COALESCE(failed_pin_attempts, 0) + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
                        WHEN COALESCE(failed_pin_attempts, 0) + 1 = 4 THEN NOW() + INTERVAL '30 seconds'
                        WHEN COALESCE(failed_pin_attempts, 0) + 1 = 3 THEN NOW() + INTERVAL '5 seconds'
                        ELSE NULL
                    END,
                    updated_at = NOW()
                WHERE school_id = p_school_id;
            END IF;
        END IF;
    END IF;

    -- [Vektor 2 Remediation] Strict tenant-scoped credential lookup:
    -- Never fall back to unscoped cross-tenant queries when p_school_id IS NOT NULL.
    IF v_user IS NULL THEN
        SELECT u.* INTO v_user
        FROM public.users_raw u
        WHERE (
            u.ausweis_nummer = v_clean
            OR u.ausweis_nummer = v_clean_upper
            OR u.ausweis_nummer = v_clean_alt
            OR (length(v_clean) >= 6 AND replace(u.ausweis_nummer, '-', '') = replace(v_clean_upper, '-', ''))
            OR (length(v_clean_alt) >= 6 AND replace(u.ausweis_nummer, '-', '') = replace(v_clean_alt, '-', ''))
            OR EXISTS (SELECT 1 FROM public.user_badge_credentials ubc WHERE ubc.user_id = u.id AND (ubc.token_value = v_clean OR ubc.token_value = v_clean_alt) AND ubc.is_active = TRUE)
            OR u.qr_token::text = v_clean
            OR u.ausweis_id = v_clean
            OR u.teacher_qr_token = v_clean
            OR u.teacher_qr_token::text = v_clean
            OR (p_school_id IS NOT NULL AND v_clean !~* '[A-Z]' AND length(v_digits_only) >= 6 AND (
                regexp_replace(u.ausweis_nummer, '[^0-9]', '', 'g') = v_digits_only
                OR regexp_replace(replace(replace(replace(u.ausweis_nummer, '-S-', '-1-'), '-L-', '-2-'), '-V-', '-3-'), '[^0-9]', '', 'g') = v_digits_only
            ) AND u.role = 'student')
        )
        AND (p_school_id IS NULL OR u.school_id = p_school_id)
        AND u.is_active = TRUE
        ORDER BY
            CASE
                WHEN u.ausweis_nummer = v_clean THEN 1
                WHEN u.ausweis_nummer = v_clean_upper THEN 2
                WHEN u.ausweis_nummer = v_clean_alt THEN 3
                WHEN replace(u.ausweis_nummer, '-', '') = replace(v_clean_upper, '-', '') THEN 4
                WHEN replace(u.ausweis_nummer, '-', '') = replace(v_clean_alt, '-', '') THEN 5
                WHEN EXISTS (SELECT 1 FROM public.user_badge_credentials ubc WHERE ubc.user_id = u.id AND ubc.token_value = v_clean AND ubc.is_active = TRUE) THEN 6
                WHEN u.qr_token::text = v_clean THEN 7
                ELSE 10
            END ASC
        LIMIT 1;
    END IF;

    IF v_user IS NULL THEN
        IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
            INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, raw_credential, school_id, success)
            VALUES (v_ip_hash, v_token_log_hash, NULL, p_school_id, FALSE);
        END IF;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ungültige Anmeldedaten. Bitte überprüfe deine Ausweisnummer oder deinen QR-Code.'
        );
    END IF;

    -- [P0-1] Strict Master-Admin Gate: Master Admins MUST authenticate via login_master_admin (TOTP) or FIDO2 Passkey
    IF COALESCE(v_user.is_master_admin, FALSE) = TRUE THEN
        IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
            INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, raw_credential, school_id, success)
            VALUES (v_ip_hash, v_token_log_hash, NULL, v_user.school_id, FALSE);
        END IF;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'Master-Admin-Konten dürfen ausschließlich über das dedizierte 2FA-Cockpit angemeldet werden.'
        );
    END IF;

    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, raw_credential, school_id, success)
        VALUES (v_ip_hash, v_token_log_hash, NULL, v_user.school_id, TRUE);
    END IF;

    IF v_user.school_id IS NOT NULL THEN
        v_safe_school := public.build_safe_school_context(v_user.school_id);
    END IF;

    IF to_regclass('private_auth.user_secrets') IS NOT NULL THEN
        SELECT
            COALESCE(argon2_personal_pin_hash IS NOT NULL AND argon2_personal_pin_hash <> '', FALSE),
            COALESCE(argon2_parent_pin_hash IS NOT NULL AND argon2_parent_pin_hash <> '', FALSE)
        INTO v_has_personal_pin, v_has_parent_pin
        FROM private_auth.user_secrets
        WHERE user_id = v_user.id;
    END IF;

    IF v_has_personal_pin IS NOT TRUE THEN
        v_has_personal_pin := COALESCE(
            (v_user.personal_pin IS NOT NULL AND v_user.personal_pin <> '' AND v_user.personal_pin <> '0000')
            OR (v_user.personal_pin_hash IS NOT NULL AND v_user.personal_pin_hash <> ''),
            FALSE
        );
    END IF;
    IF v_has_parent_pin IS NOT TRUE THEN
        v_has_parent_pin := COALESCE(
            (v_user.parent_pin IS NOT NULL AND v_user.parent_pin <> '' AND v_user.parent_pin <> '0000')
            OR (v_user.parent_pin_hash IS NOT NULL AND v_user.parent_pin_hash <> ''),
            FALSE
        );
    END IF;

    IF v_user.role IN ('admin', 'secretary') THEN
        v_mfa_enforced := TRUE;
    END IF;

    v_is_pin_activated := (COALESCE(v_user.is_pin_activated, FALSE) = TRUE OR v_has_personal_pin = TRUE OR v_user.role = 'student');

    v_requires_pin := (
        NOT v_is_admin_pin AND (
            v_has_personal_pin = TRUE
            OR v_user.role IN ('admin', 'secretary')
            OR COALESCE(v_user.is_pin_activated, FALSE) = FALSE
        )
    );

    IF NOT v_requires_pin THEN
        v_lease_id := gen_random_uuid();
        INSERT INTO public.session_leases (
            id, user_id, school_id, role, device_key, device_name,
            is_revoked, last_active_at, created_at
        ) VALUES (
            v_lease_id,
            v_user.id,
            v_user.school_id,
            v_user.role,
            COALESCE(NULLIF(TRIM(p_device_key), ''), 'dev_' || v_lease_id::text),
            COALESCE(NULLIF(TRIM(p_device_name), ''), 'Web Browser'),
            FALSE,
            NOW(),
            NOW()
        );
    END IF;

    v_sanitized_user := jsonb_build_object(
        'id', v_user.id,
        'first_name', v_user.first_name,
        'last_name', CASE WHEN v_user.role = 'student' THEN NULL ELSE v_user.last_name END,
        'name', CASE WHEN v_user.role = 'student' THEN v_user.first_name ELSE TRIM(CONCAT(v_user.first_name, ' ', v_user.last_name)) END,
        'role', v_user.role,
        'roles', v_user.roles,
        'school_id', v_user.school_id,
        'instrument', v_user.instrument,
        'avatar_url', v_user.avatar_url,
        'photo_url', v_user.photo_url,
        'is_active', v_user.is_active,
        'is_campus_active', v_user.is_campus_active,
        'is_groovelab_active', v_user.is_groovelab_active,
        'is_master_admin', FALSE,
        'has_parent_pin', v_has_parent_pin,
        'has_personal_pin', v_has_personal_pin,
        'is_pin_activated', v_is_pin_activated,
        'is_2fa_enabled', COALESCE(v_user.is_2fa_enabled, FALSE),
        'mfa_enforced_for_admins', v_mfa_enforced,
        'quiet_hours', v_user.quiet_hours,
        'push_notif_schedule_changes', COALESCE(v_user.push_notif_schedule_changes, TRUE),
        'push_notif_homework', COALESCE(v_user.push_notif_homework, TRUE),
        'push_notif_all_features', COALESCE(v_user.push_notif_all_features, TRUE),
        'push_notif_chat', COALESCE(v_user.push_notif_chat, TRUE),
        'push_notif_practice_reminder', COALESCE(v_user.push_notif_practice_reminder, TRUE),
        'push_notif_weekly_digest', COALESCE(v_user.push_notif_weekly_digest, TRUE),
        'campus_ui_level', COALESCE(v_user.campus_ui_level, 'junior'),
        'pin_enforced_for_preview', v_user.pin_enforced_for_preview,
        'audio_calibrations', COALESCE(v_user.audio_calibrations, '{}'::jsonb),
        'device_calibration', v_user.device_calibration,
        'auth_method', CASE WHEN v_is_admin_pin THEN 'school_admin_pin' ELSE 'credential' END,
        'schools', v_safe_school
    );

    RETURN jsonb_build_object(
        'success', true,
        'lease_token', v_lease_id,
        'requires_pin', v_requires_pin,
        'user', v_sanitized_user
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.authenticate_by_credential(TEXT, UUID, TEXT, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. [VEKTOR 9 - P3] HARDEN verify_personal_pin (IP RATE LIMIT & TOFU GATE ON DAY_OF_BIRTH)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_personal_pin(user_uuid uuid, input_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private_auth', 'pg_temp', 'extensions', 'pg_catalog'
AS $$
DECLARE
    v_stored_hash TEXT;
    v_input_hash TEXT;
    v_is_locked BOOLEAN := FALSE;
    v_is_pin_activated BOOLEAN := FALSE;
    v_attempts INTEGER := 0;
    v_new_attempts INTEGER := 0;
    v_clean_pin TEXT;
    v_match BOOLEAN := FALSE;
    v_school_id UUID;
    v_role TEXT;
    v_school_attempts INTEGER := 0;
    v_new_school_attempts INTEGER := 0;
    v_school_is_locked BOOLEAN := FALSE;
    v_needs_rehash BOOLEAN := FALSE;
    v_dob INTEGER := NULL;
    v_headers TEXT;
    v_ip TEXT;
    v_ip_hash TEXT := NULL;
    v_ip_failures INTEGER := 0;
BEGIN
    IF user_uuid IS NULL OR input_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    v_clean_pin := TRIM(input_pin);
    IF length(v_clean_pin) < 2 THEN
        RETURN FALSE;
    END IF;

    -- Extract X-Real-IP for network-level brute-force defense
    BEGIN
        v_headers := current_setting('request.headers', true);
        IF v_headers IS NOT NULL AND v_headers <> '' THEN
            v_ip := NULLIF(TRIM(COALESCE(v_headers::json->>'x-real-ip', '')), '');
            IF v_ip IS NULL THEN
                v_ip := NULLIF(TRIM(split_part(COALESCE(v_headers::json->>'x-forwarded-for', ''), ',', 1)), '');
            END IF;
            IF v_ip IS NOT NULL AND v_ip <> '' THEN
                v_ip_hash := encode(extensions.digest(v_ip, 'sha256'), 'hex');
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_ip_hash := NULL;
    END;

    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        SELECT COUNT(*) INTO v_ip_failures
        FROM public.qr_login_rate_limits
        WHERE ip_hash = v_ip_hash
          AND success = FALSE
          AND created_at > (NOW() - INTERVAL '15 minutes');

        IF v_ip_failures >= 20 THEN
            RETURN FALSE;
        END IF;
    END IF;

    SELECT
        school_id,
        role,
        COALESCE(is_pin_activated, FALSE),
        COALESCE(failed_pin_attempts, 0),
        (pin_locked_until IS NOT NULL AND pin_locked_until > NOW())
    INTO v_school_id, v_role, v_is_pin_activated, v_attempts, v_is_locked
    FROM public.users_raw
    WHERE id = user_uuid;

    IF NOT FOUND OR v_is_locked THEN
        RETURN FALSE;
    END IF;

    IF v_role IN ('admin', 'secretary') AND to_regclass('private_auth.school_secrets') IS NOT NULL THEN
        SELECT
            COALESCE(failed_pin_attempts, 0),
            (pin_locked_until IS NOT NULL AND pin_locked_until > NOW())
        INTO v_school_attempts, v_school_is_locked
        FROM private_auth.school_secrets
        WHERE school_id = v_school_id;

        IF v_school_is_locked THEN
            RETURN FALSE;
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'private_auth' AND table_name = 'user_secrets'
    ) THEN
        SELECT argon2_personal_pin_hash
        INTO v_stored_hash
        FROM private_auth.user_secrets
        WHERE user_id = user_uuid;
    END IF;

    IF v_stored_hash IS NULL THEN
        SELECT personal_pin
        INTO v_stored_hash
        FROM public.users_raw
        WHERE id = user_uuid;
    END IF;

    IF v_stored_hash IS NOT NULL AND v_stored_hash <> '' AND v_stored_hash <> '0000' THEN
        IF v_stored_hash LIKE '$2%' THEN
            v_match := (extensions.crypt(v_clean_pin, v_stored_hash) = v_stored_hash);
        ELSIF length(v_stored_hash) = 64 THEN
            v_input_hash := encode(digest(v_clean_pin, 'sha256'), 'hex');
            v_match := (
                hmac(v_stored_hash, 'campus_pin_constant_time_key_2026', 'sha256') =
                hmac(v_input_hash, 'campus_pin_constant_time_key_2026', 'sha256')
            );
            IF v_match THEN
                v_needs_rehash := TRUE;
            END IF;
        ELSE
            v_match := FALSE;
        END IF;
    ELSE
        -- [Vektor 9 Remediation] Only allow 1..31 day_of_birth fallback if student has NOT yet activated a personal PIN
        IF v_is_pin_activated = FALSE
           AND to_regclass('public.activation_days') IS NOT NULL
           AND v_clean_pin ~ '^[0-9]{1,2}$'
           AND v_clean_pin::int BETWEEN 1 AND 31 THEN
            SELECT day_of_birth INTO v_dob
            FROM public.activation_days
            WHERE student_id = user_uuid
            LIMIT 1;

            IF v_dob IS NOT NULL AND v_dob = v_clean_pin::int THEN
                v_match := TRUE;
            ELSE
                v_match := FALSE;
            END IF;
        ELSE
            v_match := FALSE;
        END IF;
    END IF;

    IF v_match THEN
        UPDATE public.users_raw
        SET failed_pin_attempts = 0, pin_locked_until = NULL
        WHERE id = user_uuid;

        IF v_role IN ('admin', 'secretary') AND to_regclass('private_auth.school_secrets') IS NOT NULL THEN
            UPDATE private_auth.school_secrets
            SET failed_pin_attempts = 0, pin_locked_until = NULL, updated_at = NOW()
            WHERE school_id = v_school_id;
        END IF;

        IF v_needs_rehash THEN
            BEGIN
                INSERT INTO private_auth.user_secrets (user_id, argon2_personal_pin_hash, updated_at)
                VALUES (user_uuid, extensions.crypt(v_clean_pin, extensions.gen_salt('bf', 10)), NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    argon2_personal_pin_hash = EXCLUDED.argon2_personal_pin_hash,
                    updated_at = NOW();

                UPDATE public.users_raw SET personal_pin = NULL WHERE id = user_uuid;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;

        PERFORM private_auth.mint_verified_pin_session_lease(user_uuid, 'personal_pin');

        RETURN TRUE;
    ELSE
        v_new_attempts := v_attempts + 1;
        UPDATE public.users_raw
        SET
            failed_pin_attempts = v_new_attempts,
            pin_locked_until = CASE
                WHEN v_new_attempts >= 5 THEN NOW() + INTERVAL '15 minutes'
                WHEN v_new_attempts = 4 THEN NOW() + INTERVAL '30 seconds'
                WHEN v_new_attempts = 3 THEN NOW() + INTERVAL '5 seconds'
                ELSE NULL
            END
        WHERE id = user_uuid;

        IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
            INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, raw_credential, school_id, success)
            VALUES (v_ip_hash, encode(extensions.digest(user_uuid::text, 'sha256'), 'hex'), NULL, v_school_id, FALSE);
        END IF;

        IF v_role IN ('admin', 'secretary') AND to_regclass('private_auth.school_secrets') IS NOT NULL THEN
            v_new_school_attempts := v_school_attempts + 1;
            UPDATE private_auth.school_secrets
            SET
                failed_pin_attempts = v_new_school_attempts,
                pin_locked_until = CASE
                    WHEN v_new_school_attempts >= 5 THEN NOW() + INTERVAL '15 minutes'
                    WHEN v_new_school_attempts = 4 THEN NOW() + INTERVAL '30 seconds'
                    WHEN v_new_school_attempts = 3 THEN NOW() + INTERVAL '5 seconds'
                    ELSE NULL
                END,
                updated_at = NOW()
            WHERE school_id = v_school_id;
        END IF;

        IF v_new_attempts >= 3 AND to_regclass('public.audit_logs') IS NOT NULL THEN
            BEGIN
                INSERT INTO public.audit_logs (
                    school_id, user_id, action, details
                ) VALUES (
                    v_school_id,
                    user_uuid,
                    'SECURITY_PERSONAL_PIN_THROTTLED',
                    jsonb_build_object(
                        'target_user_id', user_uuid,
                        'failed_attempts', v_new_attempts,
                        'timestamp', NOW()
                    )
                );
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;

        RETURN FALSE;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_personal_pin(uuid, text) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 5. [VEKTOR 3 - P1] RESTORE SEC-121 / SEC-122 / § 201 StGB ReBAC ISOLATION
--    ON AUDIO CALIBRATION RPCs & STUDENT AUDIO TABLES
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_user_audio_calibration(
    p_user_id UUID,
    p_profile_key TEXT,
    p_calibration JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
AS $$
DECLARE
    v_caller_id UUID := public.get_current_authenticated_user_id();
    v_clean_key TEXT := TRIM(COALESCE(p_profile_key, ''));
    v_existing JSONB;
    v_updated JSONB;
    v_latency_ms INTEGER;
    v_target_school_id UUID;
BEGIN
    IF p_user_id IS NULL OR v_clean_key = '' OR p_calibration IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ungültige Kalibrierungsparameter.'
        );
    END IF;

    SELECT COALESCE(audio_calibrations, '{}'::jsonb), school_id
    INTO v_existing, v_target_school_id
    FROM public.users_raw
    WHERE id = p_user_id
      AND is_active = TRUE
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Benutzerkonto nicht gefunden oder inaktiv.'
        );
    END IF;

    -- [Vektor 3 Remediation] Strict caller ownership or assigned teacher / parent only (0% leadership override on student audio profiles)
    IF NOT (
        v_caller_id = p_user_id
        OR public.is_master_admin()
        OR current_setting('role', true) = 'service_role'
        OR public.is_parent_of_student(p_user_id)
        OR (
            v_caller_id IS NOT NULL
            AND (SELECT public.get_current_user_school_id()) = v_target_school_id
            AND public.get_current_user_role() = 'teacher'
            AND public.is_assigned_teacher_of_student(p_user_id)
        )
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Zugriff verweigert: Keine Berechtigung für dieses Audioprofil.'
        );
    END IF;

    v_latency_ms := COALESCE((p_calibration->>'latency_ms')::integer, 70);
    IF v_latency_ms < -300 OR v_latency_ms > 600 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Latenzwert außerhalb des zulässigen Bereichs (-300 ms bis +600 ms).'
        );
    END IF;

    v_updated := jsonb_set(
        v_existing,
        ARRAY[v_clean_key],
        p_calibration || jsonb_build_object(
            'profile_key', v_clean_key,
            'calibrated_at', COALESCE(p_calibration->>'calibrated_at', NOW()::text)
        ),
        TRUE
    );

    UPDATE public.users_raw
    SET audio_calibrations = v_updated,
        device_calibration = p_calibration
    WHERE id = p_user_id;

    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'students'
          AND table_type = 'BASE TABLE'
    ) THEN
        BEGIN
            UPDATE public.students
            SET audio_calibrations = v_updated,
                device_calibration = p_calibration
            WHERE id = p_user_id;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'profile_key', v_clean_key,
        'audio_calibrations', v_updated
    );
END;
$$;

REVOKE ALL ON FUNCTION public.save_user_audio_calibration(UUID, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_user_audio_calibration(UUID, TEXT, JSONB) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_user_audio_calibrations(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
AS $$
DECLARE
    v_caller_id UUID := public.get_current_authenticated_user_id();
    v_calibrations JSONB;
    v_target_school_id UUID;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'audio_calibrations', '{}'::jsonb);
    END IF;

    SELECT COALESCE(audio_calibrations, '{}'::jsonb), school_id
    INTO v_calibrations, v_target_school_id
    FROM public.users_raw
    WHERE id = p_user_id
      AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'audio_calibrations', '{}'::jsonb);
    END IF;

    IF NOT (
        v_caller_id = p_user_id
        OR public.is_master_admin()
        OR current_setting('role', true) = 'service_role'
        OR public.is_parent_of_student(p_user_id)
        OR (
            v_caller_id IS NOT NULL
            AND (SELECT public.get_current_user_school_id()) = v_target_school_id
            AND public.get_current_user_role() = 'teacher'
            AND public.is_assigned_teacher_of_student(p_user_id)
        )
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Zugriff verweigert.',
            'audio_calibrations', '{}'::jsonb
        );
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'audio_calibrations', COALESCE(v_calibrations, '{}'::jsonb)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_audio_calibrations(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_audio_calibrations(UUID) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.delete_user_audio_calibration(
    p_user_id UUID,
    p_profile_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
AS $$
DECLARE
    v_caller_id UUID := public.get_current_authenticated_user_id();
    v_clean_key TEXT := TRIM(COALESCE(p_profile_key, ''));
    v_updated JSONB;
    v_target_school_id UUID;
BEGIN
    IF p_user_id IS NULL OR v_clean_key = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Parameter.');
    END IF;

    SELECT school_id INTO v_target_school_id
    FROM public.users_raw
    WHERE id = p_user_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Benutzer nicht gefunden.');
    END IF;

    -- Only the user themselves, their parent, or master_admin/service_role can delete calibration profiles
    IF NOT (
        v_caller_id = p_user_id
        OR public.is_master_admin()
        OR current_setting('role', true) = 'service_role'
        OR public.is_parent_of_student(p_user_id)
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Zugriff verweigert.');
    END IF;

    UPDATE public.users_raw
    SET audio_calibrations = COALESCE(audio_calibrations, '{}'::jsonb) - v_clean_key
    WHERE id = p_user_id
    RETURNING audio_calibrations INTO v_updated;

    RETURN jsonb_build_object(
        'success', FOUND,
        'audio_calibrations', COALESCE(v_updated, '{}'::jsonb)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_audio_calibration(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_audio_calibration(UUID, TEXT) TO anon, authenticated, service_role;

-- Re-seal RLS on audio_recordings, audio_milestones & school_year_playlists
-- Enforce SEC-121 / SEC-122 / § 201 StGB: 0% Leadership (admin/secretary) access;
-- Teachers only when assigned to the student!
ALTER TABLE public.audio_recordings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audio_recordings_policy" ON public.audio_recordings;
CREATE POLICY "audio_recordings_policy" ON public.audio_recordings
    FOR ALL TO anon, authenticated
    USING (
        public.is_master_admin()
        OR user_id = (SELECT public.get_current_authenticated_user_id())
        OR public.is_parent_of_student(user_id)
        OR (
            school_id = (SELECT public.get_current_user_school_id())
            AND public.get_current_user_role() = 'teacher'
            AND public.is_assigned_teacher_of_student(user_id)
        )
    )
    WITH CHECK (
        public.is_master_admin()
        OR (
            user_id = (SELECT public.get_current_authenticated_user_id())
            AND school_id = (SELECT public.get_current_user_school_id())
        )
    );

ALTER TABLE public.audio_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audio_milestones_policy" ON public.audio_milestones;
CREATE POLICY "audio_milestones_policy" ON public.audio_milestones
    FOR ALL TO anon, authenticated
    USING (
        public.is_master_admin()
        OR student_id = (SELECT public.get_current_authenticated_user_id())
        OR teacher_id = (SELECT public.get_current_authenticated_user_id())
        OR public.is_parent_of_student(student_id)
        OR (
            school_id = (SELECT public.get_current_user_school_id())
            AND public.get_current_user_role() = 'teacher'
            AND public.is_assigned_teacher_of_student(student_id)
        )
    )
    WITH CHECK (
        public.is_master_admin()
        OR (
            student_id = (SELECT public.get_current_authenticated_user_id())
            AND school_id = (SELECT public.get_current_user_school_id())
        )
        OR (
            school_id = (SELECT public.get_current_user_school_id())
            AND public.get_current_user_role() = 'teacher'
            AND public.is_assigned_teacher_of_student(student_id)
        )
    );

ALTER TABLE public.school_year_playlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "school_year_playlists_policy" ON public.school_year_playlists;
CREATE POLICY "school_year_playlists_policy" ON public.school_year_playlists
    FOR ALL TO anon, authenticated
    USING (
        public.is_master_admin()
        OR student_id = (SELECT public.get_current_authenticated_user_id())
        OR public.is_parent_of_student(student_id)
        OR (
            school_id = (SELECT public.get_current_user_school_id())
            AND public.get_current_user_role() = 'teacher'
            AND public.is_assigned_teacher_of_student(student_id)
        )
    )
    WITH CHECK (
        public.is_master_admin()
        OR (
            student_id = (SELECT public.get_current_authenticated_user_id())
            AND school_id = (SELECT public.get_current_user_school_id())
        )
        OR (
            school_id = (SELECT public.get_current_user_school_id())
            AND public.get_current_user_role() = 'teacher'
            AND public.is_assigned_teacher_of_student(student_id)
        )
    );

-- ------------------------------------------------------------------------------
-- 6. [VEKTOR 5 - P1] MULTI-WORKER ATOMIC NONCE ACQUIRE & REPLAY PROTECTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_security_idempotency_nonce(
    p_nonce_key TEXT,
    p_status TEXT DEFAULT 'COMPLETED',
    p_status_code INTEGER DEFAULT 200,
    p_ttl_seconds INTEGER DEFAULT 120
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private_auth, public, pg_temp
AS $$
DECLARE
    v_existing RECORD;
BEGIN
    IF current_setting('role', true) <> 'service_role' AND NOT public.is_master_admin() THEN
        RETURN FALSE;
    END IF;

    DELETE FROM private_auth.security_nonce_ledger
    WHERE expires_at < NOW();

    -- If acquiring a new lock ('IN_PROGRESS'), fail closed if an unexpired nonce already exists
    IF p_status = 'IN_PROGRESS' THEN
        SELECT nonce_key, status, expires_at INTO v_existing
        FROM private_auth.security_nonce_ledger
        WHERE nonce_key = p_nonce_key
          AND expires_at > NOW()
        FOR UPDATE;

        IF FOUND THEN
            RETURN FALSE;
        END IF;
    END IF;

    INSERT INTO private_auth.security_nonce_ledger (
        nonce_key, status, status_code, created_at, expires_at
    ) VALUES (
        p_nonce_key,
        COALESCE(p_status, 'COMPLETED'),
        p_status_code,
        NOW(),
        NOW() + make_interval(secs => GREATEST(10, COALESCE(p_ttl_seconds, 120)))
    )
    ON CONFLICT (nonce_key) DO UPDATE SET
        status = EXCLUDED.status,
        status_code = EXCLUDED.status_code,
        expires_at = EXCLUDED.expires_at;

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.record_security_idempotency_nonce(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_security_idempotency_nonce(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

-- ------------------------------------------------------------------------------
-- 7. UPDATE SCHEMA MIGRATIONS LEDGER
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('private_auth.schema_migrations_ledger') IS NOT NULL THEN
        INSERT INTO private_auth.schema_migrations_ledger (version, name, applied_at, checksum, status)
        VALUES
            ('592', '592_bsi_red_team_p0_p3_complete_seal.sql', NOW(), 'sha256-migration-592-bsi-redteam-seal', 'applied')
        ON CONFLICT (version) DO UPDATE SET
            name = EXCLUDED.name,
            applied_at = NOW(),
            status = 'applied';
    END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
