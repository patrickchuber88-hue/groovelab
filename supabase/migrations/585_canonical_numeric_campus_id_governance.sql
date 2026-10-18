-- ==============================================================================
-- 🛡️ MIGRATION 585: 0,1% CANONICAL NUMERIC CAMPUS-ID GOVERNANCE & BIDIRECTIONAL PARITY
-- ==============================================================================
-- 1. Standardisiert die Kanonische Campus-ID auf das reine Ziffernschema:
--    - {school_number}-1-{seq4} für Schüler (Ablösung des Buchstabens 'S')
--    - {school_number}-2-{seq4} für Lehrer (Ablösung des Buchstabens 'L')
--    - {school_number}-3-{seq4} für Verwaltung / Admin (Ablösung des Buchstabens 'V')
-- 2. Aktualisiert den Trigger assign_canonical_ausweis_nummer() auf das 1/2/3-Schema.
-- 3. Backfill bestehende users_raw.ausweis_nummer von Buchstaben auf Ziffern.
-- 4. Härtet authenticate_by_credential für bidirektionale Äquivalenz (Ziffer <-> Buchstabe).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TRIGGER FUNCTION: assign_canonical_ausweis_nummer()
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_canonical_ausweis_nummer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_school_num TEXT := '001';
    v_role_code TEXT := '1';
    v_next_seq INT := 1;
    v_regex_pattern TEXT;
BEGIN
    -- 1. Ermittle Schulnummer
    IF NEW.school_id IS NOT NULL THEN
        SELECT COALESCE(school_number, '001')
        INTO v_school_num
        FROM public.schools
        WHERE id = NEW.school_id;
    END IF;
    IF v_school_num IS NULL OR v_school_num = '' THEN
        v_school_num := '001';
    END IF;

    -- 2. Ermittle numerischen Rollen-Code (1 = Schüler, 2 = Lehrer, 3 = Verwaltung)
    IF NEW.role::text IN ('admin', 'secretary', 'verwaltung', 'superadmin', 'owner') 
       OR ('admin' = ANY(NEW.roles)) OR ('secretary' = ANY(NEW.roles)) THEN
        v_role_code := '3';
    ELSIF NEW.role::text IN ('teacher', 'lehrer', 'dozent', 'instructor') 
       OR ('teacher' = ANY(NEW.roles)) THEN
        v_role_code := '2';
    ELSE
        v_role_code := '1';
    END IF;

    -- 3. Nur generieren, wenn noch keine gültige kanonische Ausweisnummer vergeben ist
    IF NEW.ausweis_nummer IS NULL OR TRIM(NEW.ausweis_nummer) = '' 
       OR NEW.ausweis_nummer !~ ('^' || v_school_num || '-[123SLV]-\d{4}$') THEN
       
        v_regex_pattern := '^' || v_school_num || '-(' || v_role_code || '|' || 
            CASE WHEN v_role_code = '1' THEN 'S' WHEN v_role_code = '2' THEN 'L' ELSE 'V' END || ')-\d{4}$';

        SELECT COALESCE(MAX(NULLIF(regexp_replace(ausweis_nummer, '^' || v_school_num || '-[123SLV]-', ''), '')::INT), 0) + 1
        INTO v_next_seq
        FROM public.users_raw
        WHERE school_id = NEW.school_id
          AND ausweis_nummer ~ v_regex_pattern;

        IF v_next_seq < 1 THEN
            v_next_seq := 1;
        END IF;

        NEW.ausweis_nummer := v_school_num || '-' || v_role_code || '-' || lpad(v_next_seq::text, 4, '0');
    ELSIF NEW.ausweis_nummer ~ ('^' || v_school_num || '-[SLV]-\d{4}$') THEN
        -- Normalisiere bestehende Buchstaben-IDs auf den neuen Ziffernstandard
        NEW.ausweis_nummer := regexp_replace(
            regexp_replace(
                regexp_replace(NEW.ausweis_nummer, '-S-', '-1-'),
            '-L-', '-2-'),
        '-V-', '-3-');
    END IF;

    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. BACKFILL BESTEHENDE USERS_RAW AUF DAS REINE ZIFFERNSCHEMA (001-1-XXXX)
-- ------------------------------------------------------------------------------
UPDATE public.users_raw
SET ausweis_nummer = regexp_replace(ausweis_nummer, '-S-', '-1-')
WHERE ausweis_nummer ~ '^\d{3}-S-\d{4}$';

UPDATE public.users_raw
SET ausweis_nummer = regexp_replace(ausweis_nummer, '-L-', '-2-')
WHERE ausweis_nummer ~ '^\d{3}-L-\d{4}$';

UPDATE public.users_raw
SET ausweis_nummer = regexp_replace(ausweis_nummer, '-V-', '-3-')
WHERE ausweis_nummer ~ '^\d{3}-V-\d{4}$';

-- ------------------------------------------------------------------------------
-- 3. AUTORITATIVER RPC: authenticate_by_credential MIT DUAL-FORMAT ÄQUIVALENZ
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
    v_is_uuid BOOLEAN := FALSE;
    v_digits_only TEXT;
    v_user RECORD;
    v_school RECORD;
    v_lease_id UUID;
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
    v_is_uuid := (v_clean ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
    v_digits_only := regexp_replace(v_clean, '[^0-9]', '', 'g');

    -- 🛡️ Bidirektionale Äquivalenz: Ziffer (1/2/3) <-> Buchstabe (S/L/V)
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

    -- Compute SHA-256 for logging
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
          AND created_at > (NOW() - INTERVAL '5 minutes');

        IF v_ip_failures >= 150 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Zu viele Fehlversuche von dieser IP. Bitte warte einige Minuten.'
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

    -- Regulärer Credential Lookup (Multi-Role: 1/S, 2/L, 3/V)
    IF v_user IS NULL THEN
        SELECT u.* INTO v_user
        FROM public.users_raw u
        WHERE (
            -- 1. Kanonische Ausweisnummer (exakt, Upper oder Alt-Repräsentation)
            u.ausweis_nummer = v_clean
            OR u.ausweis_nummer = v_clean_upper
            OR u.ausweis_nummer = v_clean_alt
            -- 2. Bindestrich-Toleranz
            OR (length(v_clean) >= 6 AND replace(u.ausweis_nummer, '-', '') = replace(v_clean_upper, '-', ''))
            OR (length(v_clean_alt) >= 6 AND replace(u.ausweis_nummer, '-', '') = replace(v_clean_alt, '-', ''))
            -- 3. Verknüpfte Ausweis-Badges (Historische & Multi-Badges)
            OR EXISTS (SELECT 1 FROM public.user_badge_credentials ubc WHERE ubc.user_id = u.id AND (ubc.token_value = v_clean OR ubc.token_value = v_clean_alt) AND ubc.is_active = TRUE)
            -- 4. Kanonischer QR-Token auf users_raw
            OR u.qr_token::text = v_clean
            -- 5. Gedruckte 6-stellige Ausweis-ID (z. B. '326060')
            OR u.ausweis_id = v_clean
            -- 6. Lehrer-Tokens
            OR u.teacher_qr_token = v_clean
            OR u.teacher_qr_token::text = v_clean
            -- 7. Reine Ziffernfolge über Numpad NUR wenn keine Buchstaben enthalten sind
            OR (v_clean !~* '[A-Z]' AND length(v_digits_only) >= 6 AND (
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

        -- Cross-School Fallback
        IF v_user IS NULL AND p_school_id IS NOT NULL THEN
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
                OR (v_clean !~* '[A-Z]' AND length(v_digits_only) >= 6 AND (
                    regexp_replace(u.ausweis_nummer, '[^0-9]', '', 'g') = v_digits_only
                    OR regexp_replace(replace(replace(replace(u.ausweis_nummer, '-S-', '-1-'), '-L-', '-2-'), '-V-', '-3-'), '[^0-9]', '', 'g') = v_digits_only
                ) AND u.role = 'student')
            )
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
    END IF;

    IF v_user IS NULL THEN
        IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
            INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, raw_credential, school_id, success)
            VALUES (v_ip_hash, v_token_log_hash, v_clean, p_school_id, FALSE);
        END IF;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ungültige Anmeldedaten. Bitte überprüfe deine Ausweisnummer oder deinen QR-Code.'
        );
    END IF;

    -- Erfolgreiche Authentifizierung
    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, raw_credential, school_id, success)
        VALUES (v_ip_hash, v_token_log_hash, v_clean, v_user.school_id, TRUE);
    END IF;

    IF v_user.school_id IS NOT NULL THEN
        SELECT * INTO v_school FROM public.schools WHERE id = v_user.school_id;
    END IF;

    IF to_regclass('private_auth.user_secrets') IS NOT NULL THEN
        SELECT 
            (personal_pin_hash IS NOT NULL AND personal_pin_hash <> ''),
            (parent_pin_hash IS NOT NULL AND parent_pin_hash <> '')
        INTO v_has_personal_pin, v_has_parent_pin
        FROM private_auth.user_secrets
        WHERE user_id = v_user.id;
    END IF;

    IF v_user.role IN ('admin', 'secretary') THEN
        v_mfa_enforced := TRUE;
    END IF;

    v_lease_id := gen_random_uuid();
    INSERT INTO public.session_leases (
        id, user_id, school_id, role, device_key, device_name,
        expires_at, is_active, created_at, updated_at
    ) VALUES (
        v_lease_id, v_user.id, v_user.school_id, v_user.role, p_device_key, p_device_name,
        NOW() + INTERVAL '30 days', TRUE, NOW(), NOW()
    );
    v_is_pin_activated := (COALESCE(v_user.is_pin_activated, FALSE) = TRUE OR v_has_personal_pin = TRUE OR v_user.role = 'student');

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

    RETURN jsonb_build_object('success', true, 'lease_token', v_lease_id, 'user', v_sanitized_user);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.authenticate_by_credential(TEXT, UUID, TEXT, TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
