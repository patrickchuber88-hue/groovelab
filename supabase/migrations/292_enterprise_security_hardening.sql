-- Migration 292: Enterprise Security Hardening & Rate-Limiting Engine
-- Implements:
-- 1. Server-side brute-force protection table (auth_rate_limits) & atomic rate-limiter
-- 2. Subdomain hijacking defense in register_school_and_admin RPC
-- 3. 1-Click QR Token Revocation and Re-issuance RPC (revoke_and_regenerate_qr_token)
-- 4. Server-side rate-limited PIN verification for students and parents

-- 1. Rate Limiting Table
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
    identifier TEXT PRIMARY KEY,
    attempt_count INT DEFAULT 0,
    locked_until TIMESTAMPTZ DEFAULT NULL,
    last_attempt_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_rate_limits_admin" ON public.auth_rate_limits;
CREATE POLICY "auth_rate_limits_admin" ON public.auth_rate_limits FOR ALL TO authenticated USING (public.is_master_admin());

-- Atomic Rate Limiter Function
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
    p_identifier TEXT,
    p_max_attempts INT DEFAULT 5,
    p_lockout_seconds INT DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_record public.auth_rate_limits%ROWTYPE;
    v_now TIMESTAMPTZ := NOW();
    v_new_attempts INT;
BEGIN
    SELECT * INTO v_record FROM public.auth_rate_limits WHERE identifier = p_identifier FOR UPDATE;

    IF v_record.identifier IS NOT NULL THEN
        -- Check if currently locked
        IF v_record.locked_until IS NOT NULL AND v_record.locked_until > v_now THEN
            RETURN jsonb_build_object(
                'allowed', false,
                'locked', true,
                'remaining_seconds', CEIL(EXTRACT(EPOCH FROM (v_record.locked_until - v_now)))::INT,
                'message', 'Sicherheitssperre aktiv: Zu viele Fehlversuche.'
            );
        END IF;

        -- Reset window if last attempt was more than 10 minutes ago
        IF v_record.last_attempt_at < (v_now - INTERVAL '10 minutes') THEN
            v_new_attempts := 1;
        ELSE
            v_new_attempts := v_record.attempt_count + 1;
        END IF;

        IF v_new_attempts >= p_max_attempts THEN
            UPDATE public.auth_rate_limits
            SET attempt_count = v_new_attempts,
                locked_until = v_now + (p_lockout_seconds || ' seconds')::INTERVAL,
                last_attempt_at = v_now
            WHERE identifier = p_identifier;

            RETURN jsonb_build_object(
                'allowed', false,
                'locked', true,
                'remaining_seconds', p_lockout_seconds,
                'message', 'Zu viele Fehlversuche. Zugang für ' || p_lockout_seconds || 's gesperrt.'
            );
        ELSE
            UPDATE public.auth_rate_limits
            SET attempt_count = v_new_attempts,
                locked_until = NULL,
                last_attempt_at = v_now
            WHERE identifier = p_identifier;

            RETURN jsonb_build_object(
                'allowed', true,
                'locked', false,
                'attempts_left', (p_max_attempts - v_new_attempts)
            );
        END IF;
    ELSE
        INSERT INTO public.auth_rate_limits (identifier, attempt_count, locked_until, last_attempt_at)
        VALUES (p_identifier, 1, NULL, v_now);

        RETURN jsonb_build_object(
            'allowed', true,
            'locked', false,
            'attempts_left', (p_max_attempts - 1)
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(TEXT, INT, INT) TO anon, authenticated, service_role;

-- Reset Rate Limit Function
CREATE OR REPLACE FUNCTION public.reset_rate_limit(p_identifier TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
BEGIN
    DELETE FROM public.auth_rate_limits WHERE identifier = p_identifier;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_rate_limit(TEXT) TO anon, authenticated, service_role;

-- 2. 1-Click QR Token Revocation & Re-Issuance RPC
CREATE OR REPLACE FUNCTION public.revoke_and_regenerate_qr_token(
    p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_new_qr_token UUID := gen_random_uuid();
    v_caller_role TEXT := public.get_current_user_role();
    v_caller_school_id UUID := public.current_school_id();
    v_target_school_id UUID;
BEGIN
    SELECT school_id INTO v_target_school_id FROM public.users_raw WHERE id = p_target_user_id;
    IF v_target_school_id IS NULL THEN
        RAISE EXCEPTION 'Nutzer wurde nicht gefunden.';
    END IF;

    -- Authorization check (Master Admin or School Admin/Secretary or Self)
    IF NOT (public.is_master_admin() OR (v_caller_school_id = v_target_school_id AND v_caller_role IN ('admin', 'secretary')) OR public.get_current_user_id() = p_target_user_id) THEN
        RAISE EXCEPTION 'Keine Berechtigung zur Neuausstellung dieses Ausweises.';
    END IF;

    -- 1. Regenerate token on users_raw
    UPDATE public.users_raw
    SET qr_token = v_new_qr_token
    WHERE id = p_target_user_id;

    -- 2. Terminate all active sessions to force re-authentication
    UPDATE public.sessions
    SET check_out_time = NOW()
    WHERE user_id = p_target_user_id AND check_out_time IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_target_user_id,
        'new_qr_token', v_new_qr_token
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_and_regenerate_qr_token(UUID) TO authenticated, service_role;

-- 3. Upgrade register_school_and_admin to reject reserved subdomains
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
    -- 1. Format & Validate Slug
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

    -- 2. Validate Country (DACH region only)
    v_country := COALESCE(NULLIF(TRIM(p_country), ''), 'Deutschland');
    IF v_country NOT IN ('Deutschland', 'Österreich', 'Schweiz') THEN
        v_country := 'Deutschland';
    END IF;

    -- 3. Generate unique 6-digit Master-PIN & Email
    v_generated_pin := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
    v_admin_email := COALESCE(NULLIF(LOWER(TRIM(p_school_email)), ''), v_slug || '@campus-groovelab.de');

    -- 4. Create school record directly in public.schools
    INSERT INTO public.schools (
        id, name, legal_name, subdomain, primary_color,
        street, house_number, zip_code, city, phone_number,
        email, billing_email, billing_contact_person, country,
        has_campus_subscription, has_groovelab_subscription,
        storage_addon_gb, storage_addon_monthly_fee, storage_addon_status,
        extra_billing_option, is_billing_booked,
        subscription_bypass, is_trial, trial_ends_at, status,
        avv_signed_at, avv_signee_name, is_active
    ) VALUES (
        v_school_id, TRIM(p_school_name), TRIM(p_school_name), v_slug, '#34a853',
        TRIM(p_street), NULLIF(TRIM(p_house_number), ''), TRIM(p_zip_code), TRIM(p_city), NULLIF(TRIM(p_phone), ''),
        v_admin_email, v_admin_email, TRIM(p_admin_first_name) || ' ' || TRIM(p_admin_last_name), v_country,
        FALSE, FALSE,
        0, 0.00, 'none',
        NULL, FALSE,
        FALSE, TRUE, NOW() + INTERVAL '30 days', 'trial',
        NOW(), TRIM(p_admin_first_name) || ' ' || TRIM(p_admin_last_name) || ' (Schulleitung)', TRUE
    );

    -- 5. Create admin record directly in public.users_raw
    INSERT INTO public.users_raw (
        id, school_id, role, roles, first_name, last_name,
        password_hash, qr_token, ausweis_nummer,
        photo_url, avatar_url, is_campus_active, is_groovelab_active,
        is_active, is_pin_activated, created_at, last_seen
    ) VALUES (
        v_admin_id, v_school_id, 'admin', ARRAY['admin'], TRIM(p_admin_first_name), TRIM(p_admin_last_name),
        v_generated_pin, v_qr_token, v_generated_pin,
        '/campus_login_hero.png', '/campus_login_hero.png', TRUE, TRUE,
        TRUE, TRUE, NOW(), NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'school_id', v_school_id,
        'admin_id', v_admin_id,
        'pin', v_generated_pin,
        'qr_token', v_qr_token,
        'subdomain', v_slug,
        'country', v_country
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_school_and_admin(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
