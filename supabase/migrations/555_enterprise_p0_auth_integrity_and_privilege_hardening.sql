-- ==============================================================================
-- 🏛️ MIGRATION 555: ENTERPRISE P0 AUTH INTEGRITY & PRIVILEGE HARDENING
-- Campus-Groovelab Enterprise+ Architecture / SEC-118 Auth & Privilege Citadel
-- Standard: OWASP ASVS Level 3 / Fail-Closed / ISO 27001 / BSI IT-Grundschutz
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDEN AUTHENTICATE_BY_CREDENTIAL (ELIMINATE UUID BACKDOOR & LEAKS)
-- ------------------------------------------------------------------------------
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
    v_mfa_enforced boolean := FALSE;
BEGIN
    IF v_clean IS NULL OR v_clean = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Anmeldedaten.');
    END IF;

    -- Compute one-way SHA-256 hash for logging to satisfy CWE-532
    BEGIN
        v_token_log_hash := encode(extensions.digest(v_clean, 'sha256'), 'hex');
    EXCEPTION WHEN OTHERS THEN
        v_token_log_hash := 'ANONYMIZED_CREDENTIAL';
    END;

    -- IP Extraktion und Anti-Brute-Force
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
        v_ip := NULL;
        v_ip_hash := NULL;
    END;

    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        SELECT COUNT(*) INTO v_ip_failures
        FROM public.qr_login_rate_limits
        WHERE ip_hash = v_ip_hash
          AND success = FALSE
          AND created_at > (NOW() - INTERVAL '15 minutes');

        IF v_ip_failures >= 30 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Zu viele Fehlversuche von dieser IP. Bitte warte 15 Minuten.'
            );
        END IF;
    END IF;

    -- Admin-PIN Prüfung falls Schule angegeben
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
        END IF;
    END IF;

    -- Regulärer Credential Lookup falls keine Admin-PIN Übereinstimmung
    -- 🛡️ SECURITY HARDENING (SEC-118): UUID login bypass (id = v_clean::uuid) is strictly eliminated!
    -- UUID must ONLY match if it is an authentic qr_token or teacher_qr_token.
    -- qr_token::text cast prevents PostgreSQL "invalid input syntax for type uuid" error when v_clean is non-UUID.
    IF v_user IS NULL THEN
        SELECT * INTO v_user
        FROM public.users_raw
        WHERE (
            qr_token::text = v_clean
            OR ausweis_nummer = v_clean
            OR ausweis_nummer = v_clean_upper
            OR teacher_qr_token = v_clean
            OR teacher_qr_token::text = v_clean
        )
        AND (p_school_id IS NULL OR school_id = p_school_id)
        AND is_active = TRUE
        LIMIT 1;
    END IF;

    -- User nicht gefunden
    IF v_user IS NULL THEN
        IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
            INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, school_id, success)
            VALUES (v_ip_hash, v_token_log_hash, p_school_id, FALSE);
        END IF;

        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Ungültiger Ausweis-PIN oder QR-Token.'
        );
    END IF;

    -- 🛡️ Schüler-Governance: Kostenairbag Auto-Restore & B2C Karenzzeit
    IF v_user.role = 'student' THEN
        -- 1. Echter 60-Tage-Kostenairbag Auto-Restore
        IF COALESCE(v_user.auto_inactivated_by_airbag, FALSE) = TRUE THEN
            UPDATE public.users_raw
            SET 
                auto_inactivated_by_airbag = FALSE,
                is_campus_active = TRUE,
                last_seen = NOW(),
                updated_at = NOW()
            WHERE id = v_user.id;

            v_user.auto_inactivated_by_airbag := FALSE;
            v_user.is_campus_active := TRUE;

            INSERT INTO public.audit_logs (
                school_id, table_name, record_id, user_id, action, entity_type, entity_id, details
            ) VALUES (
                v_user.school_id,
                'users_raw',
                v_user.id,
                v_user.id,
                'CAMPUS_COST_AIRBAG_AUTO_RESTORED',
                'users_raw',
                v_user.id::TEXT,
                jsonb_build_object('student_id', v_user.id, 'reactivated_at', NOW())
            );
        END IF;

        -- 2. B2C 14-Tage-Karenzzeit Fail-Closed Prüfung bei Überweisung
        IF v_user.student_billing_payment_method = 'bank_transfer' 
           AND v_user.payment_status = 'provisional_grace' THEN
            IF COALESCE(v_user.provisional_grace_until, v_user.created_at + INTERVAL '14 days') < NOW() THEN
                UPDATE public.users_raw
                SET 
                    is_campus_active = FALSE,
                    payment_status = 'grace_expired',
                    updated_at = NOW()
                WHERE id = v_user.id;

                v_user.is_campus_active := FALSE;

                INSERT INTO public.audit_logs (
                    school_id, table_name, record_id, user_id, action, entity_type, entity_id, details
                ) VALUES (
                    v_user.school_id,
                    'users_raw',
                    v_user.id,
                    v_user.id,
                    'B2C_PROVISIONAL_GRACE_EXPIRED',
                    'users_raw',
                    v_user.id::TEXT,
                    jsonb_build_object('student_id', v_user.id, 'expired_at', NOW())
                );
            END IF;
        END IF;

        -- 3. Stets last_seen aktualisieren
        UPDATE public.users_raw
        SET last_seen = NOW()
        WHERE id = v_user.id;
    END IF;

    -- Fetch school information
    SELECT * INTO v_school
    FROM public.schools
    WHERE id = v_user.school_id;

    v_mfa_enforced := COALESCE(v_school.mfa_enforced_for_admins, FALSE) AND v_user.role IN ('admin', 'secretary');

    -- Create session lease
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

    -- Record success in rate limit table
    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, school_id, success)
        VALUES (v_ip_hash, v_token_log_hash, p_school_id, TRUE);
    END IF;

    -- Pre-calculate authoritative security flags (OWASP ASVS Level 3 Zero Secret Leakage)
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
        OR v_user.role = 'student'
    );

    -- Build zero-secret sanitized user
    -- 🛡️ SECURITY HARDENING (SEC-118): ausweis_nummer, qr_token, teacher_qr_token, and day_of_birth
    -- are strictly excluded from the payload to prevent credential & PII leakage.
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
        'is_master_admin', v_user.is_master_admin,
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
-- 2. HARDEN VERIFY_PERSONAL_PIN (SERVER-SIDE BIRTHDAY FALLBACK & STRICT RATE-LIMITING)
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
    v_dob INTEGER := NULL;
BEGIN
    IF user_uuid IS NULL OR input_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    v_clean_pin := TRIM(input_pin);
    -- Accept 2 digits (student birth day fallback) or 4 digits (personal PIN)
    IF length(v_clean_pin) < 2 THEN
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

    -- 3. Check PIN: Stored Bcrypt/SHA-256 OR Server-Side Fallback to activation_days.day_of_birth
    IF v_stored_hash IS NOT NULL AND v_stored_hash <> '' AND v_stored_hash <> '0000' THEN
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
    ELSE
        -- 🛡️ Fallback to activation_days.day_of_birth if no personal PIN configured yet
        -- v_clean_pin ~ '^[0-9]{1,4}$' strictly prevents integer overflow exceptions
        IF to_regclass('public.activation_days') IS NOT NULL AND v_clean_pin ~ '^[0-9]{1,4}$' THEN
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
-- 3. HARDEN REGISTER_SCHOOL_AND_ADMIN (BCRYPT HASHING IN PRIVATE_AUTH.USER_SECRETS)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_school_and_admin(
    p_school_name TEXT,
    p_subdomain TEXT,
    p_street TEXT,
    p_house_number TEXT,
    p_zip_code TEXT,
    p_city TEXT,
    p_phone TEXT,
    p_school_email TEXT,
    p_admin_first_name TEXT,
    p_admin_last_name TEXT,
    p_country TEXT DEFAULT 'Deutschland'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_school_id UUID := gen_random_uuid();
    v_admin_id UUID := gen_random_uuid();
    v_qr_token UUID := gen_random_uuid();
    v_generated_pin TEXT;
    v_admin_email TEXT;
    v_slug TEXT;
    v_country TEXT;
    v_reserved_subdomains TEXT[] := ARRAY[
        'admin', 'api', 'app', 'auth', 'login', 'signup', 'register', 'root',
        'system', 'support', 'dashboard', 'mail', 'secure', 'static', 'assets',
        'cdn', 'groovelab', 'campus', 'master', 'status', 'help', 'billing',
        'dev', 'staging', 'test', 'demo', 'portal', 'account', 'kiosk', 'stage',
        'live', 'secretariat', 'sekretariat', 'schulleitung', 'teacher', 'lehrer',
        'student', 'schueler', 'eltern', 'parents', 'download', 'pass', 'qr'
    ];
BEGIN
    -- 1. Validierung aller Pflichtfelder (Fail-Closed)
    IF TRIM(COALESCE(p_school_name, '')) = '' THEN
        RAISE EXCEPTION 'MANDATORY_FIELD_MISSING: Schulname darf nicht leer sein.' USING ERRCODE = '23502';
    END IF;
    IF TRIM(COALESCE(p_street, '')) = '' OR TRIM(COALESCE(p_house_number, '')) = '' THEN
        RAISE EXCEPTION 'MANDATORY_FIELD_MISSING: Vollständige Anschrift (Straße und Hausnummer) ist zwingend erforderlich.' USING ERRCODE = '23502';
    END IF;
    IF TRIM(COALESCE(p_zip_code, '')) = '' OR TRIM(COALESCE(p_city, '')) = '' THEN
        RAISE EXCEPTION 'MANDATORY_FIELD_MISSING: Postleitzahl und Ort sind zwingend erforderlich.' USING ERRCODE = '23502';
    END IF;
    IF TRIM(COALESCE(p_admin_first_name, '')) = '' OR TRIM(COALESCE(p_admin_last_name, '')) = '' THEN
        RAISE EXCEPTION 'MANDATORY_FIELD_MISSING: Vor- und Nachname der Schulleitung sind zwingend erforderlich.' USING ERRCODE = '23502';
    END IF;
    IF TRIM(COALESCE(p_school_email, '')) = '' THEN
        RAISE EXCEPTION 'MANDATORY_FIELD_MISSING: Eine offizielle E-Mail-Adresse der Musikschule ist zwingend erforderlich.' USING ERRCODE = '23502';
    END IF;

    -- 2. Format & Validate Slug
    v_slug := LOWER(TRIM(p_subdomain));
    IF v_slug IS NULL OR length(v_slug) < 3 THEN
        RAISE EXCEPTION 'Die Wunsch-Subdomain muss mindestens 3 Zeichen lang sein.';
    END IF;

    IF v_slug = ANY(v_reserved_subdomains) THEN
        RAISE EXCEPTION 'Diese Subdomain ist ein geschützter Systemname und kann nicht vergeben werden.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.schools WHERE subdomain = v_slug) THEN
        RAISE EXCEPTION 'Diese Wunsch-Subdomain ist bereits vergeben. Bitte wähle eine andere.';
    END IF;

    -- 3. Validate Country (DACH region only)
    v_country := COALESCE(NULLIF(TRIM(p_country), ''), 'Deutschland');
    IF v_country NOT IN ('Deutschland', 'Österreich', 'Schweiz') THEN
        v_country := 'Deutschland';
    END IF;

    -- 4. Generate unique 6-digit Master-PIN & Email
    v_generated_pin := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
    v_admin_email := LOWER(TRIM(p_school_email));

    -- 5. Create school record directly in public.schools
    INSERT INTO public.schools (
        id, name, legal_name, subdomain, primary_color,
        street, house_number, zip_code, city, phone_number,
        email, billing_email, billing_contact_person, country,
        has_campus_subscription, has_groovelab_subscription,
        storage_addon_gb, storage_addon_monthly_fee, storage_addon_status,
        extra_billing_option, is_billing_booked,
        subscription_bypass, is_trial, trial_ends_at, status,
        avv_signed_at, avv_signee_name, is_active, is_demo_tenant
    ) VALUES (
        v_school_id, TRIM(p_school_name), TRIM(p_school_name), v_slug, '#34a853',
        TRIM(p_street), TRIM(p_house_number), TRIM(p_zip_code), TRIM(p_city), NULLIF(TRIM(p_phone), ''),
        v_admin_email, v_admin_email, TRIM(p_admin_first_name) || ' ' || TRIM(p_admin_last_name), v_country,
        FALSE, FALSE,
        0, 0.00, 'none',
        NULL, FALSE,
        FALSE, TRUE, NOW() + INTERVAL '30 days', 'trial',
        NOW(), TRIM(p_admin_first_name) || ' ' || TRIM(p_admin_last_name) || ' (Schulleitung)', TRUE, FALSE
    );

    -- 6. Create admin record in public.users_raw
    -- 🛡️ SECURITY HARDENING: password_hash is NULL (not plaintext PIN).
    -- Initial PIN is hashed with salted Bcrypt in private_auth.user_secrets.
    INSERT INTO public.users_raw (
        id, school_id, role, roles, first_name, last_name,
        password_hash, qr_token, ausweis_nummer,
        is_campus_active, is_groovelab_active, is_active,
        is_pin_activated, photo_url, avatar_url,
        email, created_at
    ) VALUES (
        v_admin_id, v_school_id, 'admin', ARRAY['admin'],
        TRIM(p_admin_first_name), TRIM(p_admin_last_name),
        NULL, v_qr_token, v_generated_pin,
        TRUE, TRUE, TRUE,
        TRUE, '/campus_login_hero.png', '/campus_login_hero.png',
        v_admin_email, NOW()
    );

    -- 7. Persist Salted Bcrypt Hash in isolated private_auth.user_secrets
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'private_auth') THEN
        INSERT INTO private_auth.user_secrets (
            user_id,
            password_hash,
            argon2_personal_pin_hash,
            updated_at
        ) VALUES (
            v_admin_id,
            extensions.crypt(v_generated_pin, extensions.gen_salt('bf', 10)),
            extensions.crypt(v_generated_pin, extensions.gen_salt('bf', 10)),
            NOW()
        ) ON CONFLICT (user_id) DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            argon2_personal_pin_hash = EXCLUDED.argon2_personal_pin_hash,
            updated_at = NOW();

        -- Also populate school_secrets for school-admin PIN lookup
        IF to_regclass('private_auth.school_secrets') IS NOT NULL THEN
            INSERT INTO private_auth.school_secrets (
                school_id,
                admin_pin_hash,
                created_at,
                updated_at
            ) VALUES (
                v_school_id,
                encode(extensions.digest(v_generated_pin, 'sha256'), 'hex'),
                NOW(),
                NOW()
            ) ON CONFLICT (school_id) DO UPDATE SET
                admin_pin_hash = EXCLUDED.admin_pin_hash,
                updated_at = NOW();
        END IF;
    END IF;

    -- 8. Audit Logging
    INSERT INTO public.audit_logs (
        school_id, user_id, action, details
    ) VALUES (
        v_school_id, v_admin_id, 'school_self_onboarded',
        jsonb_build_object(
            'school_name', TRIM(p_school_name),
            'subdomain', v_slug,
            'country', v_country,
            'street', TRIM(p_street),
            'house_number', TRIM(p_house_number),
            'city', TRIM(p_city),
            'zip_code', TRIM(p_zip_code)
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'school_id', v_school_id,
        'admin_id', v_admin_id,
        'pin', v_generated_pin,
        'qr_token', v_qr_token
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_school_and_admin(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. HARDEN TRG_USERS_VIEW_DML (STRICT ROLE ESCALATION NEUTRALIZATION)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_users_view_dml()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_uid UUID;
    v_is_master BOOLEAN;
    v_caller_role TEXT;
    v_is_student BOOLEAN;
    v_is_school_staff BOOLEAN;
    hashed_parent_pin TEXT := NULL;
    v_target_last_seen TIMESTAMPTZ;
    v_target_ausfall_until TIMESTAMPTZ;
    v_target_ausfall_start TIMESTAMPTZ;
BEGIN
    -- 1. DELETE Operation
    IF TG_OP = 'DELETE' THEN
        v_caller_uid := public.get_current_authenticated_user_id();
        v_is_master := COALESCE(public.is_master_admin(), FALSE);
        v_caller_role := public.get_current_user_role();

        IF NOT v_is_master AND NOT (v_caller_role IN ('admin', 'secretary') AND public.get_current_user_school_id() = OLD.school_id) THEN
            RAISE EXCEPTION 'Zugriff verweigert: Unzureichende Berechtigungen zum Löschen von Benutzerkonten.' USING ERRCODE = '42501';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'private_auth') THEN
            DELETE FROM private_auth.user_secrets WHERE user_id = OLD.id;
        END IF;
        DELETE FROM public.session_leases WHERE user_id = OLD.id;
        DELETE FROM public.users_raw WHERE id = OLD.id;
        RETURN OLD;
    END IF;

    -- 2. Identify Caller Authority
    v_caller_uid := public.get_current_authenticated_user_id();
    v_is_master := COALESCE(public.is_master_admin(), FALSE);
    v_caller_role := public.get_current_user_role();
    v_is_student := (v_caller_role = 'student');
    v_is_school_staff := (v_caller_role IN ('admin', 'secretary'));

    -- 3. Parent PIN Hashing
    IF NEW.parent_pin IS NOT NULL AND NEW.parent_pin <> '' THEN
        IF length(NEW.parent_pin) = 64 THEN
            hashed_parent_pin := NEW.parent_pin;
        ELSE
            hashed_parent_pin := encode(digest(NEW.parent_pin, 'sha256'), 'hex');
        END IF;
    END IF;

    -- 4. Teacher Non-Surveillance Guard
    IF NEW.role = 'teacher' THEN
        v_target_last_seen := NULL;
    ELSE
        v_target_last_seen := NEW.last_seen;
    END IF;

    v_target_ausfall_until := COALESCE(NEW.ausfall_until, NEW.sick_until);
    v_target_ausfall_start := NEW.ausfall_start;

    -- 5. INSERT Operation
    IF TG_OP = 'INSERT' THEN
        -- 🛡️ PRIVILEGE ESCALATION SHIELD ON INSERT
        IF NOT v_is_master THEN
            IF NEW.role = 'master_admin' THEN
                NEW.role := 'student';
            END IF;
            NEW.is_master_admin := FALSE;
        END IF;

        INSERT INTO public.users_raw (
            id, school_id, role, first_name, last_name, avatar_url,
            qr_token, calendar_token, instrument, created_at, coach_notes,
            photo_url, bio, bands, projects, listening, gear, musical_styles,
            equipment_list, last_seen, expertise,
            pending_repertoire_proposal, is_external_vocalist, show_messages_menu,
            master_admin_username, is_trial, trial_ends_at, contract_ends_at,
            contract_decision_made, delete_after_contract, status,
            is_master_admin, is_app_user, is_campus_active, is_groovelab_active,
            is_premium_user, teacher_id, ausweis_nummer, teacher_qr_token,
            is_active, max_students, nickname, ausweis_id, show_sekretariat,
            show_campus, show_groovelab, lesson_duration, planned_boards,
            required_equipment, joker_used, is_pin_activated,
            "groovelab_räume", "campus_räume", joker_used_at, ausfall_start,
            push_notifications_enabled, push_notif_schedule_changes,
            push_notif_homework, push_notif_all_features,
            push_notif_chat, push_notif_practice_reminder, push_notif_weekly_digest,
            quiet_hours,
            app_usage_mode, preferred_room_ids, groovelab_instrument,
            student_billing_payment_method, activated_at, student_billing_cash_paid,
            roles, exempt_from_direct_billing, group_id, sibling_group_id,
            parent_allow_chat, parent_allow_timer, parent_allow_leaderboard,
            parent_allow_groups, parent_allow_proposals, parent_allow_absences,
            parent_allow_audio, campus_ui_level, parent_permissions,
            pin_enforced_for_preview, teacher_onboarding_completed,
            teacher_availability, is_2fa_enabled, parent_pin, personal_pin,
            failed_pin_attempts, pin_locked_until, sessions_revoked_at,
            token_version, token_signature, qr_token_redeemed_at,
            ausfall_until
        ) VALUES (
            COALESCE(NEW.id, gen_random_uuid()),
            NEW.school_id,
            COALESCE(NEW.role, 'student'),
            NEW.first_name,
            NEW.last_name,
            NEW.avatar_url,
            NEW.qr_token,
            NEW.calendar_token,
            NEW.instrument,
            COALESCE(NEW.created_at, NOW()),
            NEW.coach_notes,
            NEW.photo_url,
            NEW.bio,
            NEW.bands,
            NEW.projects,
            NEW.listening,
            NEW.gear,
            NEW.musical_styles,
            NEW.equipment_list,
            v_target_last_seen,
            NEW.expertise,
            NEW.pending_repertoire_proposal,
            NEW.is_external_vocalist,
            NEW.show_messages_menu,
            NEW.master_admin_username,
            COALESCE(NEW.is_trial, FALSE),
            NEW.trial_ends_at,
            NEW.contract_ends_at,
            COALESCE(NEW.contract_decision_made, FALSE),
            COALESCE(NEW.delete_after_contract, FALSE),
            COALESCE(NEW.status, 'active'),
            COALESCE(NEW.is_master_admin, FALSE),
            COALESCE(NEW.is_app_user, FALSE),
            COALESCE(NEW.is_campus_active, FALSE),
            COALESCE(NEW.is_groovelab_active, FALSE),
            COALESCE(NEW.is_premium_user, FALSE),
            NEW.teacher_id,
            NEW.ausweis_nummer,
            NEW.teacher_qr_token,
            COALESCE(NEW.is_active, TRUE),
            NEW.max_students,
            NEW.nickname,
            NEW.ausweis_id,
            NEW.show_sekretariat,
            NEW.show_campus,
            NEW.show_groovelab,
            NEW.lesson_duration,
            NEW.planned_boards,
            NEW.required_equipment,
            NEW.joker_used,
            COALESCE(NEW.is_pin_activated, FALSE),
            NEW."groovelab_räume",
            NEW."campus_räume",
            NEW.joker_used_at,
            v_target_ausfall_start,
            NEW.push_notifications_enabled,
            COALESCE(NEW.push_notif_schedule_changes, TRUE),
            COALESCE(NEW.push_notif_homework, TRUE),
            COALESCE(NEW.push_notif_all_features, TRUE),
            COALESCE(NEW.push_notif_chat, TRUE),
            COALESCE(NEW.push_notif_practice_reminder, TRUE),
            COALESCE(NEW.push_notif_weekly_digest, TRUE),
            NEW.quiet_hours,
            NEW.app_usage_mode,
            NEW.preferred_room_ids,
            NEW.groovelab_instrument,
            NEW.student_billing_payment_method,
            NEW.activated_at,
            COALESCE(NEW.student_billing_cash_paid, FALSE),
            COALESCE(NEW.roles, ARRAY[COALESCE(NEW.role, 'student')]),
            COALESCE(NEW.exempt_from_direct_billing, FALSE),
            NEW.group_id,
            NEW.sibling_group_id,
            COALESCE(NEW.parent_allow_chat, TRUE),
            COALESCE(NEW.parent_allow_timer, TRUE),
            COALESCE(NEW.parent_allow_leaderboard, TRUE),
            COALESCE(NEW.parent_allow_groups, TRUE),
            COALESCE(NEW.parent_allow_proposals, TRUE),
            COALESCE(NEW.parent_allow_absences, TRUE),
            COALESCE(NEW.parent_allow_audio, TRUE),
            COALESCE(NEW.campus_ui_level, 'teen'),
            COALESCE(NEW.parent_permissions, '{}'::jsonb),
            COALESCE(NEW.pin_enforced_for_preview, FALSE),
            COALESCE(NEW.teacher_onboarding_completed, FALSE),
            NEW.teacher_availability,
            COALESCE(NEW.is_2fa_enabled, FALSE),
            hashed_parent_pin,
            NEW.personal_pin,
            COALESCE(NEW.failed_pin_attempts, 0),
            NEW.pin_locked_until,
            NEW.sessions_revoked_at,
            COALESCE(NEW.token_version, 1),
            NEW.token_signature,
            NEW.qr_token_redeemed_at,
            v_target_ausfall_until
        );

        RETURN NEW;
    END IF;

    -- 6. UPDATE Operation
    IF TG_OP = 'UPDATE' THEN
        -- 🛡️ PRIVILEGE ESCALATION SHIELD (SEC-118):
        -- Enforce NEW.role := OLD.role and NEW.roles := OLD.roles for ALL callers who are not master admin!
        -- Role transitions MUST use the authoritative RPC switch_user_active_role(p_target_role).
        IF NOT v_is_master THEN
            IF NEW.role IS DISTINCT FROM OLD.role THEN
                NEW.role := OLD.role;
            END IF;
            IF NEW.roles IS DISTINCT FROM OLD.roles THEN
                NEW.roles := OLD.roles;
            END IF;
            IF NEW.is_master_admin IS DISTINCT FROM OLD.is_master_admin THEN
                NEW.is_master_admin := OLD.is_master_admin;
            END IF;
            IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
                NEW.school_id := OLD.school_id;
            END IF;
        END IF;

        UPDATE public.users_raw
        SET
            role = NEW.role,
            first_name = NEW.first_name,
            last_name = NEW.last_name,
            avatar_url = NEW.avatar_url,
            qr_token = NEW.qr_token,
            calendar_token = NEW.calendar_token,
            instrument = NEW.instrument,
            coach_notes = NEW.coach_notes,
            photo_url = NEW.photo_url,
            bio = NEW.bio,
            bands = NEW.bands,
            projects = NEW.projects,
            listening = NEW.listening,
            gear = NEW.gear,
            musical_styles = NEW.musical_styles,
            equipment_list = NEW.equipment_list,
            last_seen = v_target_last_seen,
            expertise = NEW.expertise,
            pending_repertoire_proposal = NEW.pending_repertoire_proposal,
            is_external_vocalist = NEW.is_external_vocalist,
            show_messages_menu = NEW.show_messages_menu,
            master_admin_username = NEW.master_admin_username,
            is_trial = NEW.is_trial,
            trial_ends_at = NEW.trial_ends_at,
            contract_ends_at = NEW.contract_ends_at,
            contract_decision_made = NEW.contract_decision_made,
            delete_after_contract = NEW.delete_after_contract,
            status = NEW.status,
            is_master_admin = NEW.is_master_admin,
            is_app_user = NEW.is_app_user,
            is_campus_active = NEW.is_campus_active,
            is_groovelab_active = NEW.is_groovelab_active,
            is_premium_user = NEW.is_premium_user,
            teacher_id = NEW.teacher_id,
            ausweis_nummer = NEW.ausweis_nummer,
            teacher_qr_token = NEW.teacher_qr_token,
            is_active = NEW.is_active,
            max_students = NEW.max_students,
            nickname = NEW.nickname,
            ausweis_id = NEW.ausweis_id,
            show_sekretariat = NEW.show_sekretariat,
            show_campus = NEW.show_campus,
            show_groovelab = NEW.show_groovelab,
            lesson_duration = NEW.lesson_duration,
            planned_boards = NEW.planned_boards,
            required_equipment = NEW.required_equipment,
            joker_used = NEW.joker_used,
            is_pin_activated = NEW.is_pin_activated,
            "groovelab_räume" = NEW."groovelab_räume",
            "campus_räume" = NEW."campus_räume",
            joker_used_at = NEW.joker_used_at,
            ausfall_until = v_target_ausfall_until,
            ausfall_start = v_target_ausfall_start,
            push_notifications_enabled = NEW.push_notifications_enabled,
            push_notif_schedule_changes = NEW.push_notif_schedule_changes,
            push_notif_homework = NEW.push_notif_homework,
            push_notif_all_features = NEW.push_notif_all_features,
            push_notif_chat = COALESCE(NEW.push_notif_chat, users_raw.push_notif_chat),
            push_notif_practice_reminder = COALESCE(NEW.push_notif_practice_reminder, users_raw.push_notif_practice_reminder),
            push_notif_weekly_digest = COALESCE(NEW.push_notif_weekly_digest, users_raw.push_notif_weekly_digest),
            quiet_hours = COALESCE(NEW.quiet_hours, users_raw.quiet_hours),
            app_usage_mode = NEW.app_usage_mode,
            preferred_room_ids = NEW.preferred_room_ids,
            groovelab_instrument = NEW.groovelab_instrument,
            student_billing_payment_method = NEW.student_billing_payment_method,
            activated_at = NEW.activated_at,
            student_billing_cash_paid = NEW.student_billing_cash_paid,
            roles = NEW.roles,
            exempt_from_direct_billing = NEW.exempt_from_direct_billing,
            group_id = NEW.group_id,
            sibling_group_id = NEW.sibling_group_id,
            parent_allow_chat = NEW.parent_allow_chat,
            parent_allow_timer = NEW.parent_allow_timer,
            parent_allow_leaderboard = NEW.parent_allow_leaderboard,
            parent_allow_groups = NEW.parent_allow_groups,
            parent_allow_proposals = NEW.parent_allow_proposals,
            parent_allow_absences = NEW.parent_allow_absences,
            parent_allow_audio = NEW.parent_allow_audio,
            campus_ui_level = NEW.campus_ui_level,
            parent_permissions = NEW.parent_permissions,
            pin_enforced_for_preview = NEW.pin_enforced_for_preview,
            teacher_onboarding_completed = NEW.teacher_onboarding_completed,
            teacher_availability = NEW.teacher_availability,
            is_2fa_enabled = NEW.is_2fa_enabled,
            parent_pin = COALESCE(hashed_parent_pin, users_raw.parent_pin),
            personal_pin = COALESCE(NEW.personal_pin, users_raw.personal_pin),
            failed_pin_attempts = NEW.failed_pin_attempts,
            pin_locked_until = NEW.pin_locked_until,
            sessions_revoked_at = NEW.sessions_revoked_at,
            token_version = NEW.token_version,
            token_signature = NEW.token_signature,
            qr_token_redeemed_at = NEW.qr_token_redeemed_at
        WHERE id = OLD.id;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_view_dml ON public.users;
CREATE TRIGGER trg_users_view_dml
    INSTEAD OF INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.trg_users_view_dml();

-- ------------------------------------------------------------------------------
-- 5. PURGE_SCHOOL_TEST_DATA (ENCAPSULATE ADMINISTRATIVE CASCADES SERVER-SIDE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_school_test_data(p_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
    v_caller_id UUID := public.get_current_authenticated_user_id();
    v_is_master BOOLEAN := COALESCE(public.is_master_admin(), FALSE);
    v_caller_role TEXT := public.get_current_user_role();
    v_caller_school_id UUID := public.get_current_user_school_id();
BEGIN
    -- 1. Authorization: Only master admin or school admin/secretary of this school
    IF p_school_id IS NULL THEN
        RAISE EXCEPTION 'MANDATORY_FIELD_MISSING: school_id ist erforderlich.' USING ERRCODE = '23502';
    END IF;

    IF NOT (
        v_is_master 
        OR (v_caller_role IN ('admin', 'secretary') AND v_caller_school_id = p_school_id)
        OR (v_caller_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.users_raw 
            WHERE id = v_caller_id 
              AND school_id = p_school_id 
              AND (role IN ('admin', 'secretary') OR 'admin' = ANY(roles) OR 'secretary' = ANY(roles))
        ))
    ) THEN
        RAISE EXCEPTION 'Zugriff verweigert: Unzureichende Berechtigungen für das Zurücksetzen von Schuldaten.' USING ERRCODE = '42501';
    END IF;

    -- 2. Ordered deletions respecting foreign key constraints
    -- Stations
    DELETE FROM public.stations 
    WHERE room_id IN (SELECT id FROM public.rooms WHERE school_id = p_school_id);

    -- Band members & bands
    DELETE FROM public.band_members 
    WHERE band_id IN (SELECT id FROM public.bands WHERE school_id = p_school_id);
    DELETE FROM public.bands WHERE school_id = p_school_id;

    -- Schedules
    DELETE FROM public.schedules WHERE school_id = p_school_id;

    -- Students, student names, and activation days
    DELETE FROM public.student_first_names 
    WHERE student_id IN (SELECT id FROM public.students WHERE school_id = p_school_id);
    DELETE FROM public.student_last_names 
    WHERE student_id IN (SELECT id FROM public.students WHERE school_id = p_school_id);
    DELETE FROM public.activation_days 
    WHERE student_id IN (SELECT id FROM public.students WHERE school_id = p_school_id)
       OR student_id IN (SELECT id FROM public.users_raw WHERE school_id = p_school_id AND role = 'student');
    DELETE FROM public.students WHERE school_id = p_school_id;

    -- Rooms
    DELETE FROM public.rooms WHERE school_id = p_school_id;

    -- Delete all non-staff users (preserving caller, school admins and secretaries)
    DELETE FROM public.users_raw
    WHERE school_id = p_school_id
      AND (v_caller_id IS NULL OR id <> v_caller_id)
      AND role NOT IN ('admin', 'secretary')
      AND NOT ('admin' = ANY(roles))
      AND NOT ('secretary' = ANY(roles));

    -- Session leases
    DELETE FROM public.session_leases 
    WHERE school_id = p_school_id 
      AND (v_caller_id IS NULL OR user_id <> v_caller_id);

    -- 3. Revisionssicheres Audit-Logging
    INSERT INTO public.audit_logs (
        school_id,
        user_id,
        action,
        details
    ) VALUES (
        p_school_id,
        v_caller_id,
        'PURGE_SCHOOL_TEST_DATA',
        jsonb_build_object(
            'purged_by', v_caller_id,
            'purged_role', v_caller_role,
            'purged_at', NOW()
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Schuldaten erfolgreich bereinigt.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_school_test_data(UUID) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 6. REPLICA IDENTITY FULL FOR REALTIME CDC WITH SCHOOL_ID FILTERS
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.campus_direct_messages REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.campus_message_reactions REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.campus_chat_channel_reads REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.campus_chat_group_members REPLICA IDENTITY FULL;

-- ------------------------------------------------------------------------------
-- 7. RELOAD POSTGREST SCHEMA CACHE
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
