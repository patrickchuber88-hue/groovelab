-- ==============================================================================
-- 🎧 MIGRATION 590: 0,1% ENTERPRISE+ MULTI-DEVICE AUDIO CALIBRATION SSOT
-- ==============================================================================
-- Standards: OWASP ASVS Level 3 / Fail-Closed / Zero-Trust / Multi-Device Sync
-- Purpose:
--   1. Adds `audio_calibrations` (JSONB map for multiple devices & routes per user)
--      and `device_calibration` (latest active device object) to `public.users_raw`
--      and `public.students` (if table exists).
--   2. Provides authoritative RPCs:
--      - `public.save_user_audio_calibration`
--      - `public.get_user_audio_calibrations`
--      - `public.delete_user_audio_calibration`
--   3. Upgrades `public.authenticate_by_credential` and
--      `public.authenticate_student_by_id_and_day` so `audio_calibrations` is
--      delivered directly upon login for instant device matching & hydration.
-- ==============================================================================

BEGIN;

-- 1. ADD MULTI-DEVICE AUDIO CALIBRATION COLUMNS (IDEMPOTENT)
ALTER TABLE public.users_raw
    ADD COLUMN IF NOT EXISTS audio_calibrations JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS device_calibration JSONB DEFAULT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'students'
          AND table_type = 'BASE TABLE'
    ) THEN
        ALTER TABLE public.students
            ADD COLUMN IF NOT EXISTS audio_calibrations JSONB NOT NULL DEFAULT '{}'::jsonb,
            ADD COLUMN IF NOT EXISTS device_calibration JSONB DEFAULT NULL;
    END IF;
END $$;

-- 2. AUTHORITATIVE RPC: SAVE USER AUDIO CALIBRATION (MULTI-DEVICE MAP UPSERT)
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

    -- Validate latency range (-300ms .. +600ms)
    v_latency_ms := COALESCE((p_calibration->>'latency_ms')::integer, 70);
    IF v_latency_ms < -300 OR v_latency_ms > 600 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Latenzwert außerhalb des zulässigen Bereichs (-300 ms bis +600 ms).'
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

    -- Enforce strict caller authorization (OWASP ASVS Level 3)
    IF NOT (
        v_caller_id = p_user_id
        OR public.is_master_admin()
        OR current_setting('role', true) = 'service_role'
        OR (
            v_caller_id IS NOT NULL
            AND public.get_current_user_school_id() = v_target_school_id
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        )
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Zugriff verweigert: Keine Berechtigung für dieses Audioprofil.'
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

    -- Keep legacy base table `public.students` synchronized if present
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

-- 3. AUTHORITATIVE RPC: GET USER AUDIO CALIBRATIONS
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
        OR (
            v_caller_id IS NOT NULL
            AND public.get_current_user_school_id() = v_target_school_id
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
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

-- 4. AUTHORITATIVE RPC: DELETE / RESET SPECIFIC DEVICE CALIBRATION
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

    IF NOT (
        v_caller_id = p_user_id
        OR public.is_master_admin()
        OR current_setting('role', true) = 'service_role'
        OR (
            v_caller_id IS NOT NULL
            AND public.get_current_user_school_id() = v_target_school_id
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        )
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

-- 5. UPGRADE authenticate_by_credential TO DELIVER audio_calibrations ON LOGIN
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

    -- Bidirektionale Äquivalenz: Ziffer (1/2/3) <-> Buchstabe (S/L/V)
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

    IF v_user IS NULL THEN
        SELECT u.* INTO v_user
        FROM public.users_raw u
        WHERE (
            (v_is_uuid AND u.id = v_clean::uuid)
            OR u.ausweis_nummer = v_clean
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
        AND (p_school_id IS NULL OR u.school_id = p_school_id)
        AND u.is_active = TRUE
        ORDER BY
            CASE
                WHEN v_is_uuid AND u.id = v_clean::uuid THEN 0
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

        IF v_user IS NULL AND p_school_id IS NOT NULL THEN
            SELECT u.* INTO v_user
            FROM public.users_raw u
            WHERE (
                (v_is_uuid AND u.id = v_clean::uuid)
                OR u.ausweis_nummer = v_clean
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
                    WHEN v_is_uuid AND u.id = v_clean::uuid THEN 0
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

    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, raw_credential, school_id, success)
        VALUES (v_ip_hash, v_token_log_hash, v_clean, v_user.school_id, TRUE);
    END IF;

    IF v_user.school_id IS NOT NULL THEN
        SELECT * INTO v_school FROM public.schools WHERE id = v_user.school_id;
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
        v_has_personal_pin := COALESCE(v_user.personal_pin_hash IS NOT NULL AND v_user.personal_pin_hash <> '', FALSE);
    END IF;
    IF v_has_parent_pin IS NOT TRUE THEN
        v_has_parent_pin := COALESCE(v_user.parent_pin_hash IS NOT NULL AND v_user.parent_pin_hash <> '', FALSE);
    END IF;

    IF v_user.role IN ('admin', 'secretary') THEN
        v_mfa_enforced := TRUE;
    END IF;

    v_lease_id := gen_random_uuid();
    INSERT INTO public.session_leases (
        id, user_id, school_id, role, device_key, device_name,
        is_revoked, last_active_at, created_at
    ) VALUES (
        v_lease_id, v_user.id, v_user.school_id, v_user.role, p_device_key, COALESCE(p_device_name, 'Web Browser'),
        FALSE, NOW(), NOW()
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
        'audio_calibrations', COALESCE(v_user.audio_calibrations, '{}'::jsonb),
        'device_calibration', v_user.device_calibration,
        'auth_method', CASE WHEN v_is_admin_pin THEN 'school_admin_pin' ELSE 'credential' END,
        'schools', CASE WHEN v_school.id IS NOT NULL THEN to_jsonb(v_school) ELSE NULL END
    );

    RETURN jsonb_build_object('success', true, 'lease_token', v_lease_id, 'user', v_sanitized_user);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.authenticate_by_credential(TEXT, UUID, TEXT, TEXT) TO anon, authenticated, service_role;

-- 6. UPGRADE authenticate_student_by_id_and_day TO DELIVER audio_calibrations ON LOGIN
CREATE OR REPLACE FUNCTION public.authenticate_student_by_id_and_day(
    p_school_id uuid,
    p_ausweis_nummer text,
    p_day_of_birth integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
AS $$
DECLARE
    v_clean_id text;
    v_school_num text := '001';
    v_canonical_id text;
    v_legacy_id text;
    v_seq_padded text;
    v_user record;
    v_school record;
    v_registered_day integer;
    v_headers text;
    v_ip text;
    v_ip_hash text;
    v_ip_failures integer := 0;
    v_has_personal_pin boolean := FALSE;
    v_has_parent_pin boolean := FALSE;
    v_sanitized_user jsonb;
BEGIN
    v_clean_id := TRIM(UPPER(COALESCE(p_ausweis_nummer, '')));
    IF v_clean_id = '' OR p_day_of_birth IS NULL OR p_day_of_birth < 1 OR p_day_of_birth > 31 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Bitte gib eine gültige Ausweisnummer und deinen Geburtstagstag (1–31) ein.'
        );
    END IF;

    BEGIN
        v_headers := current_setting('request.headers', true);
        IF v_headers IS NOT NULL AND v_headers <> '' THEN
            v_ip := v_headers::json->>'x-forwarded-for';
            IF v_ip IS NULL OR v_ip = '' THEN
                v_ip := v_headers::json->>'cf-connecting-ip';
            END IF;
            IF v_ip IS NOT NULL AND v_ip <> '' THEN
                v_ip := TRIM(split_part(v_ip, ',', 1));
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
          AND attempt_at > (NOW() - INTERVAL '15 minutes');

        IF v_ip_failures >= 25 THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Sicherheitssperre: Zu viele Anmeldeversuche aus diesem Netzwerk. Bitte warte 15 Minuten.'
            );
        END IF;
    END IF;

    IF p_school_id IS NOT NULL THEN
        SELECT COALESCE(school_number, '001') INTO v_school_num
        FROM public.schools
        WHERE id = p_school_id;
    END IF;
    IF v_school_num IS NULL OR v_school_num = '' THEN
        v_school_num := '001';
    END IF;

    IF v_clean_id ~ '^[0-9]{1,4}$' THEN
        v_seq_padded := LPAD(v_clean_id, 4, '0');
        v_canonical_id := v_school_num || '-1-' || v_seq_padded;
        v_legacy_id := v_school_num || '-S-' || v_seq_padded;
    ELSIF v_clean_id ~ '^[123]-[0-9]{1,4}$' THEN
        v_seq_padded := LPAD(split_part(v_clean_id, '-', 2), 4, '0');
        v_canonical_id := v_school_num || '-1-' || v_seq_padded;
        v_legacy_id := v_school_num || '-S-' || v_seq_padded;
    ELSE
        v_canonical_id := v_clean_id;
        v_legacy_id := regexp_replace(v_clean_id, '-1-', '-S-');
    END IF;

    SELECT * INTO v_user
    FROM public.users_raw
    WHERE role = 'student'
      AND is_active = TRUE
      AND (
          ausweis_nummer = v_clean_id 
          OR ausweis_nummer = v_canonical_id 
          OR ausweis_nummer = v_legacy_id
          OR ausweis_nummer LIKE ('%-' || LPAD(v_clean_id, 4, '0'))
      )
      AND (p_school_id IS NULL OR school_id = p_school_id)
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_user IS NULL THEN
        IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
            BEGIN
                INSERT INTO public.qr_login_rate_limits (ip_hash, attempt_at, success)
                VALUES (v_ip_hash, NOW(), FALSE);
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Ausweisnummer oder Geburtstagstag ungültig. Bitte prüfe deine Eingabe.'
        );
    END IF;

    IF v_user.pin_locked_until IS NOT NULL AND v_user.pin_locked_until > NOW() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Sicherheitssperre: Dieses Konto ist vorübergehend gesperrt. Bitte warte 15 Minuten.'
        );
    END IF;

    SELECT day_of_birth INTO v_registered_day
    FROM public.activation_days
    WHERE student_id = v_user.id
    LIMIT 1;

    IF v_registered_day IS NOT NULL THEN
        IF v_registered_day <> p_day_of_birth THEN
            UPDATE public.users_raw
            SET failed_pin_attempts = COALESCE(failed_pin_attempts, 0) + 1,
                pin_locked_until = CASE 
                    WHEN COALESCE(failed_pin_attempts, 0) + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
                    ELSE pin_locked_until 
                END
            WHERE id = v_user.id;

            IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
                BEGIN
                    INSERT INTO public.qr_login_rate_limits (ip_hash, attempt_at, success)
                    VALUES (v_ip_hash, NOW(), FALSE);
                EXCEPTION WHEN OTHERS THEN NULL;
                END;
            END IF;

            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Ausweisnummer oder Geburtstagstag ungültig. Bitte prüfe deine Eingabe.'
            );
        END IF;
    ELSE
        INSERT INTO public.activation_days (student_id, school_id, day_of_birth)
        VALUES (v_user.id, v_user.school_id, p_day_of_birth)
        ON CONFLICT DO NOTHING;
    END IF;

    UPDATE public.users_raw
    SET failed_pin_attempts = 0,
        pin_locked_until = NULL
    WHERE id = v_user.id;

    IF v_user.school_id IS NOT NULL THEN
        SELECT * INTO v_school FROM public.schools WHERE id = v_user.school_id;
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
            (v_user.personal_pin IS NOT NULL AND v_user.personal_pin <> '') OR 
            (v_user.personal_pin_hash IS NOT NULL AND v_user.personal_pin_hash <> ''), 
            FALSE
        );
    END IF;

    IF v_has_parent_pin IS NOT TRUE THEN
        v_has_parent_pin := COALESCE(
            (v_user.parent_pin IS NOT NULL AND v_user.parent_pin <> '') OR 
            (v_user.parent_pin_hash IS NOT NULL AND v_user.parent_pin_hash <> ''), 
            FALSE
        );
    END IF;

    v_sanitized_user := jsonb_build_object(
        'id', v_user.id,
        'first_name', v_user.first_name,
        'last_name', NULL,
        'name', v_user.first_name,
        'role', v_user.role,
        'roles', COALESCE(to_jsonb(v_user.roles), jsonb_build_array('student')),
        'school_id', v_user.school_id,
        'instrument', v_user.instrument,
        'avatar_url', v_user.avatar_url,
        'photo_url', v_user.photo_url,
        'is_active', COALESCE(v_user.is_active, TRUE),
        'is_campus_active', COALESCE(v_user.is_campus_active, TRUE),
        'is_groovelab_active', COALESCE(v_user.is_groovelab_active, FALSE),
        'is_master_admin', FALSE,
        'has_parent_pin', v_has_parent_pin,
        'has_personal_pin', v_has_personal_pin,
        'is_pin_activated', COALESCE(v_user.is_pin_activated, TRUE),
        'campus_ui_level', COALESCE(v_user.campus_ui_level, 'junior'),
        'audio_calibrations', COALESCE(v_user.audio_calibrations, '{}'::jsonb),
        'device_calibration', v_user.device_calibration,
        'schools', CASE WHEN v_school.id IS NOT NULL THEN to_jsonb(v_school) ELSE NULL END,
        'ausweis_nummer', v_user.ausweis_nummer,
        'qr_token', v_user.qr_token
    );

    RETURN jsonb_build_object(
        'success', true,
        'user', v_sanitized_user
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.authenticate_student_by_id_and_day(uuid, text, integer) TO anon, authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
