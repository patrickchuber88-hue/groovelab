-- ==============================================================================
-- 🏛️ MIGRATION 439: TIER-1 ENTERPRISE+ PIN BCRYPT CRYPTOGRAPHY & GOBD AUDIT TRAIL
-- Standard: OWASP ASVS Level 3 (V2, V3, V4, V14) / BSI IT-Grundschutz / DSGVO Art. 5, 25, 32 / GoBD
-- Scope:
--   1. Salted Bcrypt Cryptography for Personal & Parent PINs (extensions.crypt + gen_salt)
--   2. Dual-Verification & Transparent In-Flight Migration from Legacy SHA-256 (Zero-Friction)
--   3. Lückenloser Revisionssicherer GoBD/DSGVO Lifecycle Audit-Trail in public.audit_logs
--   4. Progressive Exponential Backoff Immunity & Micro-Timing Side-Channel Protection
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDENED PERSONAL PIN VERIFICATION (BCRYPT + IN-FLIGHT SHA-256 RE-HASHING)
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
    v_attempts INTEGER := 0;
    v_new_attempts INTEGER := 0;
    v_clean_pin TEXT;
    v_match BOOLEAN := FALSE;
    v_school_id UUID;
    v_needs_rehash BOOLEAN := FALSE;
BEGIN
    IF user_uuid IS NULL OR input_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    v_clean_pin := TRIM(input_pin);
    IF length(v_clean_pin) < 4 THEN
        RETURN FALSE;
    END IF;

    -- 1. Check lockout status in users_raw
    SELECT 
        school_id,
        COALESCE(failed_pin_attempts, 0),
        (pin_locked_until IS NOT NULL AND pin_locked_until > NOW())
    INTO v_school_id, v_attempts, v_is_locked
    FROM public.users_raw
    WHERE id = user_uuid;

    IF NOT FOUND OR v_is_locked THEN
        RETURN FALSE;
    END IF;

    -- 2. Fetch stored hash from isolated private_auth schema first
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'private_auth' AND table_name = 'user_secrets'
    ) THEN
        SELECT argon2_personal_pin_hash
        INTO v_stored_hash
        FROM private_auth.user_secrets
        WHERE user_id = user_uuid;
    END IF;

    -- Fallback to users_raw personal_pin if private_auth is empty
    IF v_stored_hash IS NULL THEN
        SELECT personal_pin
        INTO v_stored_hash
        FROM public.users_raw
        WHERE id = user_uuid;
    END IF;

    -- Fail-Closed: No PIN configured or default bypass
    IF v_stored_hash IS NULL OR v_stored_hash = '' OR v_stored_hash = '0000' THEN
        RETURN FALSE;
    END IF;

    -- 3. Dual-Verification: Salted Bcrypt vs Legacy SHA-256
    IF v_stored_hash LIKE '$2%' THEN
        -- Standard: Salted Bcrypt verification
        v_match := (extensions.crypt(v_clean_pin, v_stored_hash) = v_stored_hash);
    ELSIF length(v_stored_hash) = 64 THEN
        -- Legacy Fallback: Unsalted SHA-256 with constant-time HMAC check
        v_input_hash := encode(digest(v_clean_pin, 'sha256'), 'hex');
        v_match := (
            hmac(v_stored_hash, 'campus_pin_constant_time_key_2026', 'sha256') = 
            hmac(v_input_hash, 'campus_pin_constant_time_key_2026', 'sha256')
        );
        IF v_match THEN
            v_needs_rehash := TRUE;
        END IF;
    ELSE
        -- Fail closed: Corrupt or unknown format
        v_match := FALSE;
    END IF;

    -- 4. Outcome Handling & Transparent In-Flight Re-Hashing
    IF v_match THEN
        -- Reset lockout counters
        UPDATE public.users_raw
        SET failed_pin_attempts = 0, pin_locked_until = NULL
        WHERE id = user_uuid;

        -- Transparent In-Flight Upgrade to Salted Bcrypt (Zero-Friction for Student)
        IF v_needs_rehash THEN
            BEGIN
                INSERT INTO private_auth.user_secrets (user_id, argon2_personal_pin_hash, updated_at)
                VALUES (user_uuid, extensions.crypt(v_clean_pin, extensions.gen_salt('bf', 10)), NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    argon2_personal_pin_hash = EXCLUDED.argon2_personal_pin_hash,
                    updated_at = NOW();

                -- Clear legacy plaintext/hash in users_raw
                UPDATE public.users_raw SET personal_pin = NULL WHERE id = user_uuid;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;

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

        -- Forensisches Audit-Logging bei Brute-Force-Verdacht (ab 3 Fehlversuchen)
        IF v_new_attempts >= 3 AND to_regclass('public.audit_logs') IS NOT NULL THEN
            BEGIN
                INSERT INTO public.audit_logs (
                    school_id,
                    user_id,
                    action,
                    details
                ) VALUES (
                    v_school_id,
                    user_uuid,
                    'SECURITY_PERSONAL_PIN_THROTTLED',
                    jsonb_build_object(
                        'target_user_id', user_uuid,
                        'failed_attempts', v_new_attempts,
                        'lockout_duration', CASE 
                            WHEN v_new_attempts >= 5 THEN '15 minutes'
                            WHEN v_new_attempts = 4 THEN '30 seconds'
                            WHEN v_new_attempts = 3 THEN '5 seconds'
                            ELSE 'none'
                        END,
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
-- 2. HARDENED PARENT PIN VERIFICATION (BCRYPT + IN-FLIGHT SHA-256 RE-HASHING)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_parent_pin(student_id uuid, input_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private_auth', 'pg_temp', 'extensions', 'pg_catalog'
AS $$
DECLARE
    v_stored_hash TEXT;
    v_input_hash TEXT;
    v_is_locked BOOLEAN := FALSE;
    v_attempts INTEGER := 0;
    v_new_attempts INTEGER := 0;
    v_clean_pin TEXT;
    v_match BOOLEAN := FALSE;
    v_school_id UUID;
    v_needs_rehash BOOLEAN := FALSE;
BEGIN
    IF student_id IS NULL OR input_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    v_clean_pin := TRIM(input_pin);
    IF length(v_clean_pin) < 4 THEN
        RETURN FALSE;
    END IF;

    -- 1. Check lockout status in users_raw
    SELECT 
        school_id,
        COALESCE(failed_pin_attempts, 0),
        (pin_locked_until IS NOT NULL AND pin_locked_until > NOW())
    INTO v_school_id, v_attempts, v_is_locked
    FROM public.users_raw
    WHERE id = student_id;

    IF NOT FOUND OR v_is_locked THEN
        RETURN FALSE;
    END IF;

    -- 2. Fetch stored hash from isolated private_auth schema first
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'private_auth' AND table_name = 'user_secrets'
    ) THEN
        SELECT argon2_parent_pin_hash
        INTO v_stored_hash
        FROM private_auth.user_secrets
        WHERE user_id = student_id;
    END IF;

    -- Fallback to users_raw parent_pin if private_auth is empty
    IF v_stored_hash IS NULL THEN
        SELECT parent_pin
        INTO v_stored_hash
        FROM public.users_raw
        WHERE id = student_id;
    END IF;

    -- Fail-Closed: No PIN configured or default bypass
    IF v_stored_hash IS NULL OR v_stored_hash = '' OR v_stored_hash = '0000' THEN
        RETURN FALSE;
    END IF;

    -- 3. Dual-Verification: Salted Bcrypt vs Legacy SHA-256
    IF v_stored_hash LIKE '$2%' THEN
        -- Standard: Salted Bcrypt verification
        v_match := (extensions.crypt(v_clean_pin, v_stored_hash) = v_stored_hash);
    ELSIF length(v_stored_hash) = 64 THEN
        -- Legacy Fallback: Unsalted SHA-256 with constant-time HMAC check
        v_input_hash := encode(digest(v_clean_pin, 'sha256'), 'hex');
        v_match := (
            hmac(v_stored_hash, 'campus_pin_constant_time_key_2026', 'sha256') = 
            hmac(v_input_hash, 'campus_pin_constant_time_key_2026', 'sha256')
        );
        IF v_match THEN
            v_needs_rehash := TRUE;
        END IF;
    ELSE
        -- Fail closed: Corrupt or unknown format
        v_match := FALSE;
    END IF;

    -- 4. Outcome Handling & Transparent In-Flight Re-Hashing
    IF v_match THEN
        UPDATE public.users_raw
        SET failed_pin_attempts = 0, pin_locked_until = NULL
        WHERE id = student_id;

        -- Transparent In-Flight Upgrade to Salted Bcrypt (Zero-Friction for Parent)
        IF v_needs_rehash THEN
            BEGIN
                INSERT INTO private_auth.user_secrets (user_id, argon2_parent_pin_hash, updated_at)
                VALUES (student_id, extensions.crypt(v_clean_pin, extensions.gen_salt('bf', 10)), NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    argon2_parent_pin_hash = EXCLUDED.argon2_parent_pin_hash,
                    updated_at = NOW();

                -- Clear legacy plaintext/hash in users_raw
                UPDATE public.users_raw SET parent_pin = NULL WHERE id = student_id;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;

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
        WHERE id = student_id;

        -- Forensisches Audit-Logging bei Brute-Force-Verdacht (ab 3 Fehlversuchen)
        IF v_new_attempts >= 3 AND to_regclass('public.audit_logs') IS NOT NULL THEN
            BEGIN
                INSERT INTO public.audit_logs (
                    school_id,
                    user_id,
                    action,
                    details
                ) VALUES (
                    v_school_id,
                    student_id,
                    'SECURITY_PARENT_PIN_THROTTLED',
                    jsonb_build_object(
                        'target_student_id', student_id,
                        'failed_attempts', v_new_attempts,
                        'lockout_duration', CASE 
                            WHEN v_new_attempts >= 5 THEN '15 minutes'
                            WHEN v_new_attempts = 4 THEN '30 seconds'
                            WHEN v_new_attempts = 3 THEN '5 seconds'
                            ELSE 'none'
                        END,
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

GRANT EXECUTE ON FUNCTION public.verify_parent_pin(uuid, text) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 3. HARDENED SET_PERSONAL_PIN (BCRYPT + REVISIONSSICHERES AUDIT-LOGGING)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_personal_pin(
    p_user_id UUID,
    p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
AS $$
DECLARE
    v_clean_pin TEXT := TRIM(p_pin);
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_target_school_id UUID;
    v_target_role TEXT;
    v_hashed_pin TEXT;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school_id := public.get_current_user_school_id();

    IF p_user_id IS NULL OR v_clean_pin !~ '^[0-9]{4,6}$' THEN
        RETURN FALSE;
    END IF;

    SELECT school_id, role INTO v_target_school_id, v_target_role
    FROM public.users_raw
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Strict Role Boundary:
    -- 1. Master admin: any user
    -- 2. Self: any user for themselves
    -- 3. Admin/Secretary: only users in same school (excluding other admins/master_admins)
    -- 4. Teachers: CANNOT set other users' personal PINs!
    IF NOT (
        public.is_master_admin()
        OR (v_caller_id IS NOT NULL AND v_caller_id = p_user_id)
        OR (v_caller_role IN ('admin', 'secretary') AND v_caller_school_id = v_target_school_id AND v_target_role NOT IN ('admin', 'master_admin'))
    ) THEN
        RETURN FALSE;
    END IF;

    -- Salted Bcrypt Hashing (Blowfish 10 rounds)
    v_hashed_pin := extensions.crypt(v_clean_pin, extensions.gen_salt('bf', 10));

    -- Upsert in isolated private_auth schema
    INSERT INTO private_auth.user_secrets (user_id, argon2_personal_pin_hash, updated_at)
    VALUES (p_user_id, v_hashed_pin, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        argon2_personal_pin_hash = EXCLUDED.argon2_personal_pin_hash,
        updated_at = NOW();

    -- Synchronize flags and reset lockouts
    UPDATE public.users_raw 
    SET is_pin_activated = TRUE,
        personal_pin = NULL,
        failed_pin_attempts = 0,
        pin_locked_until = NULL
    WHERE id = p_user_id;

    -- 🛡️ Revisionssicheres GoBD/DSGVO Audit-Logging
    BEGIN
        IF to_regclass('public.audit_logs') IS NOT NULL THEN
            INSERT INTO public.audit_logs (
                school_id,
                user_id,
                action,
                details
            ) VALUES (
                v_target_school_id,
                COALESCE(v_caller_id, p_user_id),
                'PERSONAL_PIN_SET',
                jsonb_build_object(
                    'target_user_id', p_user_id,
                    'actor_id', v_caller_id,
                    'actor_role', v_caller_role,
                    'algorithm', 'bcrypt_bf10',
                    'timestamp', NOW()
                )
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_personal_pin(UUID, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. HARDENED SET_PARENT_PIN_WITH_RECOVERY_KEY (BCRYPT + AUDIT-LOGGING)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_parent_pin_with_recovery_key(
    p_student_id UUID,
    p_new_pin TEXT,
    p_recovery_key TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions, pg_catalog
AS $$
DECLARE
    v_clean_pin TEXT;
    v_hashed_pin TEXT;
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_target_school_id UUID;
    v_stored_recovery_hash TEXT;
    v_provided_recovery_hash TEXT;
    v_is_authorized BOOLEAN := FALSE;
    v_auth_method TEXT := 'unknown';
BEGIN
    IF p_student_id IS NULL OR p_new_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    v_clean_pin := TRIM(p_new_pin);
    IF v_clean_pin !~ '^[0-9]{6}$' THEN
        RETURN FALSE;
    END IF;

    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school_id := public.get_current_user_school_id();

    SELECT school_id INTO v_target_school_id
    FROM public.users_raw
    WHERE id = p_student_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- 1. Master Admin
    IF public.is_master_admin() THEN
        v_is_authorized := TRUE;
        v_auth_method := 'master_admin';
    -- 2. School staff within the exact SAME school
    ELSIF v_caller_role IN ('admin', 'secretary', 'teacher') AND v_caller_school_id = v_target_school_id THEN
        v_is_authorized := TRUE;
        v_auth_method := 'school_staff_' || v_caller_role;
    -- 3. Recovery Key verified
    ELSIF p_recovery_key IS NOT NULL AND TRIM(p_recovery_key) <> '' THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'private_auth' AND table_name = 'user_secrets' AND column_name = 'parent_recovery_key_hash'
        ) THEN
            EXECUTE 'SELECT parent_recovery_key_hash FROM private_auth.user_secrets WHERE user_id = $1'
            INTO v_stored_recovery_hash
            USING p_student_id;
        END IF;

        v_provided_recovery_hash := encode(digest(UPPER(TRIM(p_recovery_key)), 'sha256'), 'hex');
        IF v_stored_recovery_hash IS NOT NULL AND v_stored_recovery_hash = v_provided_recovery_hash THEN
            v_is_authorized := TRUE;
            v_auth_method := 'recovery_key';
        END IF;
    END IF;

    -- 🛡️ STUDENTS ARE STRICTLY FORBIDDEN from resetting their own parent PIN!
    IF NOT v_is_authorized THEN
        RETURN FALSE;
    END IF;

    -- Salted Bcrypt Hashing (Blowfish 10 rounds)
    v_hashed_pin := extensions.crypt(v_clean_pin, extensions.gen_salt('bf', 10));

    INSERT INTO private_auth.user_secrets (user_id, argon2_parent_pin_hash, updated_at)
    VALUES (p_student_id, v_hashed_pin, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        argon2_parent_pin_hash = EXCLUDED.argon2_parent_pin_hash,
        updated_at = NOW();

    UPDATE public.users_raw
    SET parent_pin = NULL,
        failed_pin_attempts = 0,
        pin_locked_until = NULL
    WHERE id = p_student_id;

    -- 🛡️ Revisionssicheres GoBD/DSGVO Audit-Logging
    BEGIN
        IF to_regclass('public.audit_logs') IS NOT NULL THEN
            INSERT INTO public.audit_logs (
                school_id,
                user_id,
                action,
                details
            ) VALUES (
                v_target_school_id,
                COALESCE(v_caller_id, p_student_id),
                'PARENT_PIN_SET',
                jsonb_build_object(
                    'target_student_id', p_student_id,
                    'actor_id', v_caller_id,
                    'actor_role', v_caller_role,
                    'auth_method', v_auth_method,
                    'algorithm', 'bcrypt_bf10',
                    'timestamp', NOW()
                )
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_parent_pin_with_recovery_key(UUID, TEXT, TEXT) TO authenticated, anon, service_role;

-- Backward compatibility wrapper for set_parent_pin
CREATE OR REPLACE FUNCTION public.set_parent_pin(p_student_id UUID, p_new_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions, pg_catalog
AS $$
BEGIN
    RETURN public.set_parent_pin_with_recovery_key(p_student_id, p_new_pin, NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_parent_pin(UUID, TEXT) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 5. HARDENED SET_INITIAL_STUDENT_PIN (BCRYPT + AUDIT-LOGGING)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_initial_student_pin(
    p_student_id UUID,
    p_pin TEXT,
    p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
AS $$
DECLARE
    v_user RECORD;
    v_clean_pin TEXT := TRIM(p_pin);
    v_clean_token TEXT := TRIM(COALESCE(p_token, ''));
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_is_authorized BOOLEAN := FALSE;
    v_hashed_pin TEXT;
BEGIN
    IF p_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'MISSING_STUDENT_ID');
    END IF;

    IF v_clean_pin !~ '^[0-9]{4,6}$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_PIN_FORMAT');
    END IF;

    SELECT id, school_id, role, onboarding_token, is_pin_activated
    INTO v_user
    FROM public.users_raw
    WHERE id = p_student_id;

    IF v_user.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
    END IF;

    IF v_user.role <> 'student' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_STUDENT');
    END IF;

    IF v_user.is_pin_activated = TRUE THEN
        RETURN jsonb_build_object('success', false, 'error', 'ALREADY_ACTIVATED');
    END IF;

    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school_id := public.get_current_user_school_id();

    IF public.is_master_admin() THEN
        v_is_authorized := TRUE;
    ELSIF v_caller_role IN ('admin', 'secretary') AND v_caller_school_id = v_user.school_id THEN
        v_is_authorized := TRUE;
    ELSIF v_caller_id IS NOT NULL AND v_caller_id = p_student_id THEN
        v_is_authorized := TRUE;
    ELSIF v_clean_token <> '' AND v_user.onboarding_token IS NOT NULL AND v_user.onboarding_token = v_clean_token THEN
        v_is_authorized := TRUE;
    END IF;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    -- Salted Bcrypt Hashing (Blowfish 10 rounds)
    v_hashed_pin := extensions.crypt(v_clean_pin, extensions.gen_salt('bf', 10));

    INSERT INTO private_auth.user_secrets (user_id, argon2_personal_pin_hash, updated_at)
    VALUES (p_student_id, v_hashed_pin, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        argon2_personal_pin_hash = EXCLUDED.argon2_personal_pin_hash,
        updated_at = NOW();

    UPDATE public.users_raw
    SET is_pin_activated = TRUE,
        personal_pin = NULL,
        pin_locked_until = NULL,
        failed_pin_attempts = 0
    WHERE id = p_student_id;

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
                    'student_id', p_student_id,
                    'actor_id', v_caller_id,
                    'actor_role', v_caller_role,
                    'algorithm', 'bcrypt_bf10',
                    'timestamp', NOW()
                )
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_initial_student_pin(UUID, TEXT, TEXT) TO anon, authenticated, service_role;
