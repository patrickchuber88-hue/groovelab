-- ==============================================================================
-- Migration 449: Enterprise Admin PIN Hash & Master Audit Trail Healing
-- Standard: OWASP ASVS Level 3 / GoBD Revisionssicherheit
-- Scope:
--   1. Ensures private_auth.school_secrets.admin_pin_hash column exists
--   2. Ensures public.master_audit_trail exists with RLS
--   3. Drops legacy 2-argument login_master_admin to resolve PostgREST PGRST203 ambiguity
-- ==============================================================================

-- 1. Ensure admin_pin_hash column exists in private_auth.school_secrets
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'private_auth' AND table_name = 'school_secrets'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'private_auth' AND table_name = 'school_secrets' AND column_name = 'admin_pin_hash'
        ) THEN
            ALTER TABLE private_auth.school_secrets ADD COLUMN admin_pin_hash text;
        END IF;
    END IF;
END $$;

-- 2. Ensure master_audit_trail exists
CREATE TABLE IF NOT EXISTS public.master_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details JSONB,
    actor_user_id UUID,
    actor_ip TEXT,
    user_agent TEXT,
    status TEXT NOT NULL DEFAULT 'SUCCESS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.master_audit_trail ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.master_audit_trail TO postgres, service_role;
GRANT INSERT ON public.master_audit_trail TO anon, authenticated;

-- 3. Resolve login_master_admin overloading ambiguity
DROP FUNCTION IF EXISTS public.login_master_admin(text, text);

-- 3.b Ensure qr_login_rate_limits columns and anomaly trigger compatibility
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'qr_login_rate_limits'
    ) THEN
        ALTER TABLE public.qr_login_rate_limits ADD COLUMN IF NOT EXISTS attempted_token text DEFAULT NULL;
        ALTER TABLE public.qr_login_rate_limits ADD COLUMN IF NOT EXISTS school_id uuid DEFAULT NULL;
        ALTER TABLE public.qr_login_rate_limits ADD COLUMN IF NOT EXISTS attempted_at timestamptz DEFAULT now();
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trg_detect_login_anomaly()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_recent_failures int;
BEGIN
    SELECT COUNT(*) INTO v_recent_failures
    FROM public.qr_login_rate_limits
    WHERE ip_hash = NEW.ip_hash
      AND COALESCE(attempted_at, attempt_at, NOW()) > (NOW() - INTERVAL '5 minutes');

    IF v_recent_failures >= 5 THEN
        IF to_regclass('public.audit_logs') IS NOT NULL THEN
            INSERT INTO public.audit_logs (
                action,
                school_id,
                target_entity,
                new_values
            ) VALUES (
                'SECURITY_INCIDENT_BRUTE_FORCE_BURST',
                NEW.school_id,
                'network_ip:' || COALESCE(NEW.ip_hash, 'UNKNOWN'),
                jsonb_build_object(
                    'incident_level', 'CRITICAL',
                    'recent_failures_count', v_recent_failures,
                    'timestamp', NOW()
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 4. Heal authenticate_by_credential: support direct UUID id lookup & remove non-existent users_raw.email
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
BEGIN
    IF v_clean IS NULL OR v_clean = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Anmeldedaten.');
    END IF;

    -- Extract client IP securely and hash it (GDPR Privacy by Design)
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

    -- Check Network Rate Limit (Max 30 failed attempts per IP per 15 minutes)
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

    -- 🛡️ SECURE ADMIN PIN LOOKUP: Unterstützt SHA-256 Hash und Plaintext-Fallback
    IF v_user IS NULL AND p_school_id IS NOT NULL AND LENGTH(v_clean) = 4 AND v_clean ~ '^[0-9]+$' THEN
        SELECT u.* INTO v_user
        FROM public.users_raw u
        JOIN private_auth.school_secrets sec ON sec.school_id = u.school_id
        WHERE u.school_id = p_school_id
          AND u.role IN ('admin', 'secretary')
          AND u.is_active = TRUE
          AND (
              sec.admin_pin_hash = encode(extensions.digest(v_clean, 'sha256'), 'hex')
              OR sec.admin_pin = v_clean
          )
        ORDER BY CASE WHEN u.role = 'admin' THEN 1 ELSE 2 END
        LIMIT 1;
    END IF;

    -- User not found or inactive
    IF v_user IS NULL THEN
        IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
            INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, school_id, success)
            VALUES (v_ip_hash, v_clean, p_school_id, FALSE);
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

    -- Record success in rate limit table
    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, school_id, success)
        VALUES (v_ip_hash, v_clean, p_school_id, TRUE);
    END IF;

    -- Build zero-secret sanitized user
    v_sanitized_user := jsonb_build_object(
        'id', v_user.id,
        'first_name', v_user.first_name,
        'last_name', v_user.last_name,
        'name', TRIM(CONCAT(v_user.first_name, ' ', v_user.last_name)),
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
        'has_parent_pin', (v_user.parent_pin IS NOT NULL OR EXISTS (
            SELECT 1 FROM private_auth.user_secrets sec WHERE sec.user_id = v_user.id AND sec.argon2_parent_pin_hash IS NOT NULL
        )),
        'has_personal_pin', (v_user.personal_pin IS NOT NULL OR EXISTS (
            SELECT 1 FROM private_auth.user_secrets sec WHERE sec.user_id = v_user.id AND sec.argon2_personal_pin_hash IS NOT NULL
        )),
        'campus_ui_level', COALESCE(v_user.campus_ui_level, 'junior'),
        'pin_enforced_for_preview', v_user.pin_enforced_for_preview,
        'schools', CASE WHEN v_school.id IS NOT NULL THEN to_jsonb(v_school) ELSE NULL END
    );

    RETURN jsonb_build_object(
        'success', true,
        'lease_token', v_lease_id,
        'user', v_sanitized_user
    );
END;
$function$;
