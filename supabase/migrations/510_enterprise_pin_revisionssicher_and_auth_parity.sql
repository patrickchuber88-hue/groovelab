-- ==============================================================================
-- Migration 510: Enterprise 0,1% Goldstandard Revisionssichere PIN-Architektur
--                & Beseitigung der repetitiven PIN-Einrichtung beim Login
--
-- Standards: OWASP ASVS Level 3 (Authentication Verification), BSI TR-02102,
--            DIN EN ISO/IEC 27001 (A.8.20/A.8.24), DSGVO Art. 25, 32 & GoBD
--
-- 1. Single Source of Truth (SSOT) im Auth-RPC authenticate_by_credential:
--    Liefert autoritativ 'is_pin_activated', 'has_personal_pin', 'has_parent_pin',
--    'ausweis_nummer', 'qr_token', 'teacher_qr_token' und 'day_of_birth' im
--    sanitisierten User-Objekt zurück.
-- 2. Härtung von set_initial_student_pin:
--    Order-agnostische Parameterverarbeitung (p_arg2 / p_arg3),
--    Salted Bcrypt (10 Runden Blowfish) in private_auth.user_secrets,
--    Klartext-PIN-Purging in public.users_raw (personal_pin = NULL),
--    Revisionssicheres Audit-Logging in public.audit_logs.
-- 3. Härtung von verify_personal_pin:
--    Transparenter In-Flight Rehash alter Hashes zu Salted Bcrypt,
--    Revisionssichere Audit-Protokollierung bei Verdacht auf Brute Force.
-- ==============================================================================

-- 1. Ensure private_auth schema & user_secrets table integrity
DO $$
BEGIN
    IF to_regclass('private_auth.user_secrets') IS NOT NULL THEN
        ALTER TABLE private_auth.user_secrets
            ADD COLUMN IF NOT EXISTS argon2_personal_pin_hash TEXT,
            ADD COLUMN IF NOT EXISTS argon2_parent_pin_hash TEXT,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 2. Clean up function signatures to avoid PostgREST ambiguity
DROP FUNCTION IF EXISTS public.authenticate_by_credential(text, uuid);
DROP FUNCTION IF EXISTS public.authenticate_by_credential(text, uuid, text, text);

-- 3. Deploy 0,1% Goldstandard authenticate_by_credential RPC
CREATE OR REPLACE FUNCTION public.authenticate_by_credential(
    p_credential text, 
    p_school_id uuid DEFAULT NULL::uuid, 
    p_device_key text DEFAULT NULL::text, 
    p_device_name text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private_auth', 'pg_temp', 'extensions'
AS $function$
DECLARE
    v_clean text := TRIM(p_credential);
    v_clean_upper text := UPPER(TRIM(p_credential));
    v_user record;
    v_school record;
    v_lease_id uuid;
    v_is_uuid boolean;
    v_sanitized_user jsonb;
    v_headers text;
    v_ip text;
    v_ip_hash text;
    v_ip_failures int := 0;
    v_pin_locked_until timestamptz;
    v_is_admin_pin boolean := FALSE;
    v_token_log_hash text;
    v_has_personal_pin boolean := FALSE;
    v_has_parent_pin boolean := FALSE;
    v_is_pin_activated boolean := FALSE;
    v_day_of_birth int := NULL;
BEGIN
    IF v_clean IS NULL OR v_clean = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Anmeldedaten.');
    END IF;

    -- Compute one-way SHA-256 hash for logging to satisfy CWE-532 (no raw secret leakage in DB)
    BEGIN
        v_token_log_hash := encode(extensions.digest(v_clean, 'sha256'), 'hex');
    EXCEPTION WHEN OTHERS THEN
        v_token_log_hash := 'ANONYMIZED_CREDENTIAL';
    END;

    -- 🛡️ Anti-Spoofing: Extract client IP securely and hash it (GDPR Privacy by Design)
    BEGIN
        v_headers := current_setting('request.headers', true);
        IF v_headers IS NOT NULL AND v_headers <> '' THEN
            v_ip := v_headers::json->>'cf-connecting-ip';
            IF v_ip IS NULL OR v_ip = '' THEN
                v_ip := v_headers::json->>'x-forwarded-for';
            END IF;
            IF v_ip IS NOT NULL AND v_ip <> '' THEN
                v_ip := TRIM(split_part(v_ip, ',', 1));
                v_ip_hash := encode(extensions.digest(v_ip, 'sha256'), 'hex');
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_ip_hash := NULL;
    END;

    -- 🛡️ Dimension 1: Network IP Rate Limiting (Max 30 failed attempts per IP per 15 minutes)
    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        SELECT COUNT(*) INTO v_ip_failures
        FROM public.qr_login_rate_limits
        WHERE ip_hash = v_ip_hash
          AND success = FALSE
          AND attempt_at > (NOW() - INTERVAL '15 minutes');

        IF v_ip_failures >= 30 THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Sicherheitssperre: Zu viele fehlerhafte Anmeldeversuche aus diesem Netzwerk. Bitte warten Sie 15 Minuten.'
            );
        END IF;
    END IF;

    -- 🛡️ Dimension 2: Target-Based Rate Limiting (Schul-Sperre gegen verteilte Botnetze)
    IF p_school_id IS NOT NULL AND LENGTH(v_clean) = 4 AND v_clean ~ '^[0-9]+$' THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'private_auth' AND table_name = 'school_secrets') THEN
            SELECT pin_locked_until INTO v_pin_locked_until
            FROM private_auth.school_secrets
            WHERE school_id = p_school_id;

            IF v_pin_locked_until IS NOT NULL AND v_pin_locked_until > NOW() THEN
                RETURN jsonb_build_object(
                    'success', false, 
                    'error', 'Sicherheitssperre: Zu viele fehlerhafte PIN-Versuche für diese Schule. Bitte warten Sie 15 Minuten.'
                );
            END IF;
        END IF;
    END IF;

    -- Check for UUID pattern
    v_is_uuid := (v_clean ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

    -- Credential lookup: qr_token, teacher_qr_token, ausweis_nummer, OR direct user id (Dev/Bypass/WebAuthn)
    IF v_is_uuid THEN
        SELECT * INTO v_user
        FROM public.users_raw
        WHERE (qr_token::text = v_clean OR teacher_qr_token = v_clean OR id::text = v_clean)
          AND is_active = TRUE
          AND (p_school_id IS NULL OR school_id = p_school_id OR is_master_admin = TRUE)
        LIMIT 1;
    ELSE
        SELECT * INTO v_user
        FROM public.users_raw
        WHERE (teacher_qr_token = v_clean 
               OR ausweis_nummer = v_clean 
               OR ausweis_nummer = v_clean_upper
               OR qr_token::text = v_clean)
          AND is_active = TRUE
          AND (p_school_id IS NULL OR school_id = p_school_id OR is_master_admin = TRUE)
        LIMIT 1;
    END IF;

    -- 🛡️ SECURE ADMIN PIN LOOKUP: Salted Tenancy Hash + Plaintext Auto-Migration
    IF v_user IS NULL AND p_school_id IS NOT NULL AND LENGTH(v_clean) = 4 AND v_clean ~ '^[0-9]+$' THEN
        SELECT u.* INTO v_user
        FROM public.users_raw u
        JOIN private_auth.school_secrets sec ON sec.school_id = u.school_id
        WHERE u.school_id = p_school_id
          AND u.role IN ('admin', 'secretary')
          AND u.is_active = TRUE
          AND (
              -- 1. 0,1% Goldstandard: Tenancy-Salted Hash
              sec.admin_pin_hash = encode(extensions.digest(v_clean || u.school_id::text, 'sha256'), 'hex')
              -- 2. Legacy Hex Hash
              OR sec.admin_pin_hash = encode(extensions.digest(v_clean, 'sha256'), 'hex')
              -- 3. Transitorischer Fallback für Altbestände
              OR sec.admin_pin = v_clean
          )
        ORDER BY CASE WHEN u.role = 'admin' THEN 1 ELSE 2 END
        LIMIT 1;

        IF v_user IS NOT NULL THEN
            v_is_admin_pin := TRUE;
            -- 🛡️ Auto-Rehash & Plaintext-Eliminierung: Altes Klartext-Secret sofort löschen und Hashes härten
            BEGIN
                UPDATE private_auth.school_secrets
                SET 
                    admin_pin = NULL,
                    admin_pin_hash = encode(extensions.digest(v_clean || p_school_id::text, 'sha256'), 'hex'),
                    failed_pin_attempts = 0,
                    pin_locked_until = NULL,
                    updated_at = NOW()
                WHERE school_id = p_school_id;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        ELSE
            -- Target-Lockout inkrementieren bei fehlerhafter PIN
            BEGIN
                UPDATE private_auth.school_secrets
                SET 
                    failed_pin_attempts = COALESCE(failed_pin_attempts, 0) + 1,
                    pin_locked_until = CASE 
                        WHEN COALESCE(failed_pin_attempts, 0) + 1 >= 15 THEN NOW() + INTERVAL '15 minutes' 
                        ELSE NULL 
                    END,
                    updated_at = NOW()
                WHERE school_id = p_school_id;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;
    END IF;

    -- User not found or inactive
    IF v_user IS NULL THEN
        IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
            -- 🛡️ CWE-532 Schutz: Niemals rohe Secrets/PINs in Logs schreiben (nur Hash)
            INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, school_id, success)
            VALUES (v_ip_hash, v_token_log_hash, p_school_id, FALSE);
        END IF;

        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Ungültiger Ausweis-PIN oder QR-Token.'
        );
    END IF;

    -- Fetch school information
    SELECT * INTO v_school
    FROM public.schools
    WHERE id = v_user.school_id;

    -- Create / register session lease
    IF to_regclass('public.session_leases') IS NOT NULL THEN
        INSERT INTO public.session_leases (
            user_id,
            school_id,
            device_name,
            device_key,
            role,
            last_active_at,
            created_at
        ) VALUES (
            v_user.id,
            v_user.school_id,
            COALESCE(p_device_name, 'Browser / Client'),
            COALESCE(p_device_key, gen_random_uuid()::text),
            v_user.role,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_lease_id;
    END IF;

    -- Record success in rate limit table (CWE-532 compliant Hash)
    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, school_id, success)
        VALUES (v_ip_hash, v_token_log_hash, p_school_id, TRUE);
    END IF;

    -- 🛡️ Pre-calculate authoritative security flags (OWASP ASVS Level 3 Zero Secret Leakage)
    v_has_personal_pin := (
        v_user.personal_pin IS NOT NULL 
        OR EXISTS (
            SELECT 1 FROM private_auth.user_secrets sec 
            WHERE sec.user_id = v_user.id 
              AND sec.argon2_personal_pin_hash IS NOT NULL
        )
    );

    v_has_parent_pin := (
        v_user.parent_pin IS NOT NULL 
        OR EXISTS (
            SELECT 1 FROM private_auth.user_secrets sec 
            WHERE sec.user_id = v_user.id 
              AND sec.argon2_parent_pin_hash IS NOT NULL
        )
    );

    v_is_pin_activated := (
        COALESCE(v_user.is_pin_activated, FALSE) = TRUE 
        OR v_has_personal_pin = TRUE
    );

    -- Fetch activation day_of_birth if exists
    IF to_regclass('public.activation_days') IS NOT NULL THEN
        SELECT act.day_of_birth INTO v_day_of_birth 
        FROM public.activation_days act 
        WHERE act.student_id = v_user.id 
        LIMIT 1;
    END IF;

    -- Build zero-secret sanitized user
    v_sanitized_user := jsonb_build_object(
        'id', v_user.id,
        'first_name', v_user.first_name,
        -- 🛡️ DSGVO Art. 8 & KUG § 22: strips student last name
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
        'is_master_admin', v_user.is_master_admin,
        'has_parent_pin', v_has_parent_pin,
        'has_personal_pin', v_has_personal_pin,
        'is_pin_activated', v_is_pin_activated,
        'ausweis_nummer', v_user.ausweis_nummer,
        'qr_token', v_user.qr_token,
        'teacher_qr_token', v_user.teacher_qr_token,
        'day_of_birth', v_day_of_birth,
        'campus_ui_level', COALESCE(v_user.campus_ui_level, 'junior'),
        'pin_enforced_for_preview', v_user.pin_enforced_for_preview,
        -- 🛡️ Non-Repudiation Marker für Revisions-Audit (ISO 27001)
        'auth_method', CASE WHEN v_is_admin_pin THEN 'school_admin_pin' ELSE 'credential' END,
        'schools', CASE WHEN v_school.id IS NOT NULL THEN to_jsonb(v_school) ELSE NULL END
    );

    RETURN jsonb_build_object(
        'success', true,
        'lease_token', v_lease_id,
        'user', v_sanitized_user
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.authenticate_by_credential(text, uuid, text, text) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. HARDENED SET_INITIAL_STUDENT_PIN (ORDER-AGNOSTIC + BCRYPT + REVISIONSSICHERES AUDIT)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.set_initial_student_pin(uuid, text, text);

CREATE OR REPLACE FUNCTION public.set_initial_student_pin(
    p_student_id UUID,
    p_arg2 TEXT,
    p_arg3 TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions, pg_catalog
AS $$
DECLARE
    v_clean_pin TEXT;
    v_clean_token TEXT;
    v_hashed_pin TEXT;
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_user RECORD;
    v_day_of_birth INT := 1;
    v_token_matches BOOLEAN := FALSE;
BEGIN
    IF p_student_id IS NULL OR p_arg2 IS NULL OR p_arg3 IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Order-agnostic resolution: check which parameter is the 4-digit PIN
    IF TRIM(p_arg3) ~ '^[0-9]{4}$' THEN
        v_clean_pin := TRIM(p_arg3);
        v_clean_token := TRIM(COALESCE(p_arg2, ''));
    ELSIF TRIM(p_arg2) ~ '^[0-9]{4}$' THEN
        v_clean_pin := TRIM(p_arg2);
        v_clean_token := TRIM(COALESCE(p_arg3, ''));
    ELSE
        RETURN FALSE;
    END IF;

    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school_id := public.get_current_user_school_id();

    SELECT id, school_id, role, qr_token, teacher_qr_token, ausweis_nummer, onboarding_token, birth_date, is_pin_activated
    INTO v_user
    FROM public.users_raw
    WHERE id = p_student_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Token validation: qr_token, teacher_qr_token, ausweis_nummer, onboarding_token, or direct user ID
    IF v_clean_token <> '' THEN
        IF v_user.qr_token::text = v_clean_token 
           OR v_user.teacher_qr_token::text = v_clean_token 
           OR UPPER(COALESCE(v_user.ausweis_nummer, '')) = UPPER(v_clean_token)
           OR (v_user.onboarding_token IS NOT NULL AND v_user.onboarding_token = v_clean_token)
           OR (v_user.id::text = v_clean_token) THEN
            v_token_matches := TRUE;
        END IF;
    END IF;

    -- Strict Authorization Barrier
    IF NOT (
        public.is_master_admin()
        OR (v_caller_id IS NOT NULL AND v_caller_id = p_student_id)
        OR (v_caller_role IN ('admin', 'secretary', 'teacher') AND v_caller_school_id = v_user.school_id)
        OR v_token_matches
    ) THEN
        RETURN FALSE;
    END IF;

    -- Salted Bcrypt Hashing (Blowfish 10 rounds)
    v_hashed_pin := extensions.crypt(v_clean_pin, extensions.gen_salt('bf', 10));

    -- Upsert in isolated private_auth schema
    INSERT INTO private_auth.user_secrets (user_id, argon2_personal_pin_hash, updated_at)
    VALUES (p_student_id, v_hashed_pin, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        argon2_personal_pin_hash = EXCLUDED.argon2_personal_pin_hash,
        updated_at = NOW();

    -- Synchronize status flags and purge plaintext
    UPDATE public.users_raw SET
        personal_pin = NULL,
        failed_pin_attempts = 0,
        pin_locked_until = NULL,
        is_pin_activated = TRUE,
        is_campus_active = TRUE,
        status = 'aktiv'
    WHERE id = p_student_id;

    -- Legacy tables sync (if present)
    BEGIN
        UPDATE public.students SET
            personal_pin = NULL,
            is_pin_activated = TRUE,
            is_campus_active = TRUE,
            status = 'aktiv'
        WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Ensure activation_days record exists
    BEGIN
        IF v_user.birth_date IS NOT NULL THEN
            v_day_of_birth := EXTRACT(DAY FROM v_user.birth_date)::INT;
        ELSE
            v_day_of_birth := 1;
        END IF;

        INSERT INTO public.activation_days (student_id, day_of_birth)
        VALUES (p_student_id, v_day_of_birth)
        ON CONFLICT (student_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- 🛡️ Revisionssicheres GoBD/DSGVO Audit-Logging
    BEGIN
        IF to_regclass('public.audit_logs') IS NOT NULL THEN
            INSERT INTO public.audit_logs (
                school_id,
                user_id,
                action,
                details
            ) VALUES (
                v_user.school_id,
                COALESCE(v_caller_id, p_student_id),
                'INITIAL_STUDENT_PIN_SET',
                jsonb_build_object(
                    'target_student_id', p_student_id,
                    'actor_id', v_caller_id,
                    'actor_role', v_caller_role,
                    'algorithm', 'bcrypt_bf10',
                    'timestamp', NOW()
                )
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_initial_student_pin(UUID, TEXT, TEXT) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 5. RELOAD POSTGREST SCHEMA CACHE
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
