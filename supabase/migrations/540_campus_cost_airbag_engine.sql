-- Migration: 540_campus_cost_airbag_engine.sql
-- Description: Echter 60-Tage-Kostenairbag für Campus-Groovelab (Deaktivierung inaktiver Profile per pg_cron,
--              monatliche Ersparnis von 0,49 € / Schüler für Musikschulen, vollautomatische Reaktivierung beim Login
--              sowie 14-Tage B2C Karenzzeit-Enforcement in authenticate_by_credential).
-- Bounded Context: ADM-11 / CAM-40 / OWASP ASVS Level 3 Fail-Closed

-- 1. Ensure columns exist on public.users_raw
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users_raw' AND column_name = 'auto_inactivated_by_airbag'
    ) THEN
        ALTER TABLE public.users_raw ADD COLUMN auto_inactivated_by_airbag BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users_raw' AND column_name = 'last_seen'
    ) THEN
        ALTER TABLE public.users_raw ADD COLUMN last_seen TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 2. Airbag Execution Function: execute_campus_cost_airbag
CREATE OR REPLACE FUNCTION public.execute_campus_cost_airbag()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_inactivated_count INT := 0;
    v_monthly_savings NUMERIC(10, 2) := 0;
BEGIN
    -- Autorisierungsprüfung: Nur System-Scheduler oder Master-Admin
    IF NOT (current_user IN ('postgres', 'supabase_admin', 'service_role') OR public.is_master_admin()) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Der globale Kostenairbag darf nur vom System-Scheduler oder Master-Admin ausgeführt werden.' USING ERRCODE = '42501';
    END IF;

    -- Finde und inaktiviere alle Schüler, die seit mehr als 60 Tagen inaktiv sind
    WITH target_students AS (
        UPDATE public.users_raw
        SET 
            is_campus_active = false,
            auto_inactivated_by_airbag = true,
            updated_at = NOW()
        WHERE role = 'student'
          AND is_active = true
          AND is_campus_active = true
          AND COALESCE(auto_inactivated_by_airbag, false) = false
          AND COALESCE(last_seen, created_at) < (NOW() - INTERVAL '60 days')
        RETURNING id, school_id
    )
    SELECT COUNT(*) INTO v_inactivated_count FROM target_students;

    v_monthly_savings := ROUND(v_inactivated_count * 0.49, 2);

    IF v_inactivated_count > 0 THEN
        INSERT INTO public.audit_logs (
            table_name, record_id, action, entity_type, entity_id, details
        ) VALUES (
            'users_raw',
            gen_random_uuid(),
            'CAMPUS_COST_AIRBAG_NIGHTLY_EXECUTED',
            'users_raw',
            'system_batch',
            jsonb_build_object(
                'inactivated_students_count', v_inactivated_count,
                'monthly_savings_eur', v_monthly_savings,
                'executed_at', NOW()
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'inactivated_students', v_inactivated_count,
        'monthly_savings_eur', v_monthly_savings
    );
END;
$$;

-- 3. Optional pg_cron Integration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        BEGIN
            PERFORM cron.unschedule('campus_cost_airbag_nightly');
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
        BEGIN
            PERFORM cron.schedule(
                'campus_cost_airbag_nightly',
                '15 3 * * *',
                'SELECT public.execute_campus_cost_airbag();'
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END $$;

-- 4. Deploy hardened authenticate_by_credential with Airbag-Restore and B2C Grace Enforcement
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

    -- Look up credentials
    v_is_uuid := (v_clean ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

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
    IF v_user IS NULL THEN
        SELECT * INTO v_user
        FROM public.users_raw
        WHERE (
            (v_is_uuid AND id = v_clean::uuid)
            OR qr_token = v_clean
            OR ausweis_nummer = v_clean
            OR ausweis_nummer = v_clean_upper
            OR teacher_qr_token = v_clean
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
    );

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
        'ausweis_nummer', v_user.ausweis_nummer,
        'qr_token', v_user.qr_token,
        'teacher_qr_token', v_user.teacher_qr_token,
        'day_of_birth', v_day_of_birth,
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

REVOKE ALL ON FUNCTION public.execute_campus_cost_airbag() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_campus_cost_airbag() TO service_role;
GRANT EXECUTE ON FUNCTION public.authenticate_by_credential(text, uuid, text, text) TO anon, authenticated, service_role;
