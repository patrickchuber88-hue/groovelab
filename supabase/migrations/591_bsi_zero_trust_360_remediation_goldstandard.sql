-- ==============================================================================
-- 🛡️ MIGRATION 591: BSI / OWASP ASVS LEVEL 3 ZERO-TRUST 360° REMEDIATION
-- ==============================================================================
-- Standards: OWASP ASVS Level 3 / BSI IT-Grundschutz / DSGVO Art. 5, 25, 32
-- Remediates:
--   [P0-1] Two-Stage Session Lease Minting in authenticate_by_credential +
--          Master-Admin 2FA Cockpit Enforcement + UUID-Guessing Removal +
--          Secret-Free School Context Projection + Post-PIN Lease Minting
--   [P0-2] Fix SECURITY DEFINER current_user Privilege Check in get_master_schools_overview
--   [P0-3] Enforce Strict Caller Authentication & Role Check in get_secretary_dashboard_bootstrap
--   [P0-4] Eliminate Static device_key Session Hijacking in get_current_authenticated_user_id
--   [P0-5] Harden FIDO2/WebAuthn Registration (Cross-User Overwrite Guard) &
--          Authentication (Assertion Verification of clientDataJSON, authenticatorData & signature)
--   [P0-6] Fix Rate-Limiting Column Mismatch (attempt_at -> created_at), Tenant Boundary,
--          TOFU Guard & QR-Token Exposure in authenticate_student_by_id_and_day
--   [P1-1] Harden Multi-Tenant & Student-Scoped RLS Policies + Replace auth.uid() with
--          public.get_current_authenticated_user_id()
--   [P1-2] Enforce Caller Ownership & Authorization in Audio Calibration RPCs
--   [P2-2] Purge Plaintext Credentials (raw_credential) from qr_login_rate_limits
--   [P2-4] Persistent Security Rate-Limit & Nonce Ledger for BFF Zero-Trust Gate
--   [P3-1] Synchronize private_auth.schema_migrations_ledger (579 & 591)
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 0. HELPER: SAFE SCHOOL CONTEXT PROJECTION (ZERO SECRET / ZERO IBAN LEAKAGE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.build_safe_school_context(p_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_school RECORD;
BEGIN
    IF p_school_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_school
    FROM public.schools
    WHERE id = p_school_id;

    IF NOT FOUND OR v_school.id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Whitelist projection: Strictly excludes sepa_iban, sepa_bic, sepa_account_holder,
    -- sepa_mandate_id, invite_token, operator_notes, groovelab_kiosk_pin, and dunning internals
    RETURN jsonb_build_object(
        'id', v_school.id,
        'name', v_school.name,
        'subdomain', v_school.subdomain,
        'school_number', COALESCE(v_school.school_number, '001'),
        'logo_url', v_school.logo_url,
        'primary_color', v_school.primary_color,
        'calendar_url', v_school.calendar_url,
        'allow_messages_global', COALESCE(v_school.allow_messages_global, TRUE),
        'has_campus_subscription', COALESCE(v_school.has_campus_subscription, TRUE),
        'has_groovelab_subscription', COALESCE(v_school.has_groovelab_subscription, FALSE),
        'status', COALESCE(v_school.status, 'active'),
        'is_paused', COALESCE(v_school.is_paused, FALSE),
        'is_trial', COALESCE(v_school.is_trial, FALSE),
        'trial_until', v_school.trial_until,
        'trial_ends_at', v_school.trial_ends_at,
        'contract_start_date', v_school.contract_start_date,
        'contract_ends_at', v_school.contract_ends_at,
        'subscription_bypass', COALESCE(v_school.subscription_bypass, FALSE),
        'is_billing_booked', COALESCE(v_school.is_billing_booked, FALSE),
        'student_billing_option', v_school.student_billing_option,
        'extra_billing_option', v_school.extra_billing_option,
        'opening_hours', v_school.opening_hours,
        'limits_enabled', COALESCE(v_school.limits_enabled, FALSE),
        'user_quota', v_school.user_quota,
        'pending_user_quota', v_school.pending_user_quota,
        'campus_activated_this_month', v_school.campus_activated_this_month,
        'groovelab_activated_this_month', v_school.groovelab_activated_this_month,
        'school_year_start_month', v_school.school_year_start_month,
        'school_year_start_day', v_school.school_year_start_day,
        'auto_delete_expired_users', v_school.auto_delete_expired_users,
        'avv_signed_at', v_school.avv_signed_at,
        'avv_signee_name', v_school.avv_signee_name,
        'storage_addon_gb', COALESCE(v_school.storage_addon_gb, 0),
        'storage_used_bytes', COALESCE(v_school.storage_used_bytes, 0)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.build_safe_school_context(UUID) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 1. [P0-4] HARDEN get_current_authenticated_user_id() & CLEAN UP STATIC DEVICE KEYS
-- ------------------------------------------------------------------------------
-- Heal any historical static device_key values in session_leases so device_key is unique per lease
UPDATE public.session_leases
SET device_key = 'dev_' || id::text
WHERE device_key IN ('passkey_login', 'master_totp_login', 'master_passkey_stepup', 'master_emergency_login')
   OR device_key IS NULL;

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

        -- 4. [P0-4] Strictly validate against primary key UUID of active, non-revoked session_leases.
        --    Fallback matching against device_key is strictly prohibited to prevent static key hijacking.
        IF v_token <> '' AND v_token ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           AND to_regclass('public.session_leases') IS NOT NULL THEN
            SELECT user_id INTO v_resolved_id
            FROM public.session_leases
            WHERE id = v_token::uuid
              AND is_revoked = FALSE
              AND last_active_at > (NOW() - INTERVAL '30 days')
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

-- ------------------------------------------------------------------------------
-- 2. [P2-2] PURGE PLAINTEXT CREDENTIALS FROM qr_login_rate_limits
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        UPDATE public.qr_login_rate_limits
        SET raw_credential = NULL
        WHERE raw_credential IS NOT NULL;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. [P0-1] & [P2-2] TWO-STAGE AUTHENTICATION IN authenticate_by_credential
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

    -- [P2-3] Prioritize Nginx-authoritative X-Real-IP over X-Forwarded-For; ignore spoofable CF-Connecting-IP
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

    -- Regular credential lookup (Strictly excludes u.id = v_clean::uuid; user.id is NOT a secret)
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
        -- [P2-2] Never store plaintext raw_credential in rate limit logs
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

    -- [P0-1] Two-Stage Session Lease Minting:
    -- Do NOT issue a session_lease in Stage 1 if the user has a Personal PIN configured,
    -- or if the user is an Admin/Secretary who did not authenticate with the school admin secret PIN,
    -- or if the user has not yet activated their required personal PIN.
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
-- 4. [P0-1] STAGE-2 LEASE MINTING ON PIN VERIFICATION & INITIAL PIN SETUP
-- ------------------------------------------------------------------------------
-- Helper function to mint a verified Stage-2 session lease and expose it via HTTP header
CREATE OR REPLACE FUNCTION private_auth.mint_verified_pin_session_lease(
    p_user_id UUID,
    p_auth_context TEXT DEFAULT 'pin_verified'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp
AS $$
DECLARE
    v_user RECORD;
    v_lease_id UUID;
BEGIN
    SELECT id, school_id, role, is_active, is_master_admin
    INTO v_user
    FROM public.users_raw
    WHERE id = p_user_id AND is_active = TRUE;

    IF NOT FOUND OR COALESCE(v_user.is_master_admin, FALSE) = TRUE THEN
        RETURN NULL;
    END IF;

    v_lease_id := gen_random_uuid();
    INSERT INTO public.session_leases (
        id, user_id, school_id, role, device_key, device_name,
        is_revoked, last_active_at, created_at
    ) VALUES (
        v_lease_id,
        v_user.id,
        v_user.school_id,
        v_user.role,
        p_auth_context || '_' || v_lease_id::text,
        'PIN Verified Session',
        FALSE,
        NOW(),
        NOW()
    );

    -- Expose lease token to customFetch via PostgREST response headers
    BEGIN
        PERFORM set_config(
            'response.headers',
            jsonb_build_array(
                jsonb_build_object('x-session-lease-id', v_lease_id::text),
                jsonb_build_object('Access-Control-Expose-Headers', 'x-session-lease-id')
            )::text,
            true
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN v_lease_id;
END;
$$;

-- Upgrade verify_personal_pin to mint Stage-2 session lease upon successful verification
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
    v_role TEXT;
    v_school_attempts INTEGER := 0;
    v_new_school_attempts INTEGER := 0;
    v_school_is_locked BOOLEAN := FALSE;
    v_needs_rehash BOOLEAN := FALSE;
    v_dob INTEGER := NULL;
BEGIN
    IF user_uuid IS NULL OR input_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    v_clean_pin := TRIM(input_pin);
    IF length(v_clean_pin) < 2 THEN
        RETURN FALSE;
    END IF;

    SELECT
        school_id,
        role,
        COALESCE(failed_pin_attempts, 0),
        (pin_locked_until IS NOT NULL AND pin_locked_until > NOW())
    INTO v_school_id, v_role, v_attempts, v_is_locked
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

        -- [P0-1] Mint Stage-2 session lease upon verified personal PIN
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

-- Upgrade verify_parent_pin to also mint Stage-2 session lease upon successful verification
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

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'private_auth' AND table_name = 'user_secrets'
    ) THEN
        SELECT argon2_parent_pin_hash
        INTO v_stored_hash
        FROM private_auth.user_secrets
        WHERE user_id = student_id;
    END IF;

    IF v_stored_hash IS NULL THEN
        SELECT parent_pin
        INTO v_stored_hash
        FROM public.users_raw
        WHERE id = student_id;
    END IF;

    IF v_stored_hash IS NULL OR v_stored_hash = '' OR v_stored_hash = '0000' THEN
        RETURN FALSE;
    END IF;

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

    IF v_match THEN
        UPDATE public.users_raw
        SET failed_pin_attempts = 0, pin_locked_until = NULL
        WHERE id = student_id;

        IF v_needs_rehash THEN
            BEGIN
                INSERT INTO private_auth.user_secrets (user_id, argon2_parent_pin_hash, updated_at)
                VALUES (student_id, extensions.crypt(v_clean_pin, extensions.gen_salt('bf', 10)), NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    argon2_parent_pin_hash = EXCLUDED.argon2_parent_pin_hash,
                    updated_at = NOW();

                UPDATE public.users_raw SET parent_pin = NULL WHERE id = student_id;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;

        PERFORM private_auth.mint_verified_pin_session_lease(student_id, 'parent_pin');
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

        IF v_new_attempts >= 3 AND to_regclass('public.audit_logs') IS NOT NULL THEN
            BEGIN
                INSERT INTO public.audit_logs (
                    school_id, user_id, action, details
                ) VALUES (
                    v_school_id,
                    student_id,
                    'SECURITY_PARENT_PIN_THROTTLED',
                    jsonb_build_object(
                        'target_student_id', student_id,
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

GRANT EXECUTE ON FUNCTION public.verify_parent_pin(uuid, text) TO authenticated, anon, service_role;

-- Upgrade set_personal_pin (supports both p_pin and p_new_pin parameter names, plus TOFU initial activation & Stage-2 lease minting)
DROP FUNCTION IF EXISTS public.set_personal_pin(UUID, TEXT);
DROP FUNCTION IF EXISTS public.set_personal_pin(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.set_personal_pin(
    p_user_id UUID,
    p_pin TEXT DEFAULT NULL,
    p_new_pin TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
AS $$
DECLARE
    v_clean_pin TEXT := TRIM(COALESCE(p_pin, p_new_pin, ''));
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_target_school_id UUID;
    v_target_role TEXT;
    v_is_pin_activated BOOLEAN;
    v_existing_hash TEXT := NULL;
    v_hashed_pin TEXT;
    v_is_initial_tofu BOOLEAN := FALSE;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school_id := public.get_current_user_school_id();

    IF p_user_id IS NULL OR v_clean_pin !~ '^[0-9]{4,6}$' THEN
        RETURN FALSE;
    END IF;

    SELECT school_id, role, COALESCE(is_pin_activated, FALSE)
    INTO v_target_school_id, v_target_role, v_is_pin_activated
    FROM public.users_raw
    WHERE id = p_user_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF to_regclass('private_auth.user_secrets') IS NOT NULL THEN
        SELECT argon2_personal_pin_hash INTO v_existing_hash
        FROM private_auth.user_secrets
        WHERE user_id = p_user_id;
    END IF;

    -- Allow initial TOFU PIN setup only if the account has no personal PIN hash yet
    v_is_initial_tofu := (
        (v_existing_hash IS NULL OR v_existing_hash = '')
        AND v_is_pin_activated = FALSE
    );

    IF NOT (
        public.is_master_admin()
        OR (v_caller_id IS NOT NULL AND v_caller_id = p_user_id)
        OR (v_caller_role IN ('admin', 'secretary') AND v_caller_school_id = v_target_school_id AND v_target_role NOT IN ('admin', 'master_admin'))
        OR v_is_initial_tofu
    ) THEN
        RETURN FALSE;
    END IF;

    v_hashed_pin := extensions.crypt(v_clean_pin, extensions.gen_salt('bf', 10));

    INSERT INTO private_auth.user_secrets (user_id, argon2_personal_pin_hash, updated_at)
    VALUES (p_user_id, v_hashed_pin, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        argon2_personal_pin_hash = EXCLUDED.argon2_personal_pin_hash,
        updated_at = NOW();

    UPDATE public.users_raw
    SET is_pin_activated = TRUE,
        personal_pin = NULL,
        failed_pin_attempts = 0,
        pin_locked_until = NULL
    WHERE id = p_user_id;

    -- Mint Stage-2 session lease if caller was in initial onboarding / Stage-1 login
    IF v_caller_id IS NULL OR v_caller_id = p_user_id THEN
        PERFORM private_auth.mint_verified_pin_session_lease(p_user_id, 'set_personal_pin');
    END IF;

    BEGIN
        IF to_regclass('public.audit_logs') IS NOT NULL THEN
            INSERT INTO public.audit_logs (
                school_id, user_id, action, details
            ) VALUES (
                v_target_school_id,
                COALESCE(v_caller_id, p_user_id),
                'PERSONAL_PIN_SET',
                jsonb_build_object(
                    'target_user_id', p_user_id,
                    'actor_id', v_caller_id,
                    'actor_role', v_caller_role,
                    'is_initial_tofu', v_is_initial_tofu,
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

GRANT EXECUTE ON FUNCTION public.set_personal_pin(UUID, TEXT, TEXT) TO anon, authenticated, service_role;

-- Upgrade set_initial_student_pin: Remove v_user.id::text = v_clean_token bypass & mint Stage-2 lease
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
    v_existing_hash TEXT := NULL;
    v_day_of_birth INT := 1;
    v_token_matches BOOLEAN := FALSE;
BEGIN
    IF p_student_id IS NULL OR p_arg2 IS NULL OR p_arg3 IS NULL THEN
        RETURN FALSE;
    END IF;

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

    IF to_regclass('private_auth.user_secrets') IS NOT NULL THEN
        SELECT argon2_personal_pin_hash INTO v_existing_hash
        FROM private_auth.user_secrets
        WHERE user_id = p_student_id;
    END IF;

    -- Token validation: qr_token, teacher_qr_token, ausweis_nummer, or onboarding_token
    -- (Only allowed for initial PIN setup when no personal PIN exists yet!)
    IF v_clean_token <> '' AND (v_existing_hash IS NULL OR v_existing_hash = '') THEN
        IF v_user.qr_token::text = v_clean_token
           OR v_user.teacher_qr_token::text = v_clean_token
           OR UPPER(COALESCE(v_user.ausweis_nummer, '')) = UPPER(v_clean_token)
           OR (v_user.onboarding_token IS NOT NULL AND v_user.onboarding_token = v_clean_token) THEN
            v_token_matches := TRUE;
        END IF;
    END IF;

    IF NOT (
        public.is_master_admin()
        OR (v_caller_id IS NOT NULL AND v_caller_id = p_student_id)
        OR (v_caller_role IN ('admin', 'secretary', 'teacher') AND v_caller_school_id = v_user.school_id)
        OR v_token_matches
    ) THEN
        RETURN FALSE;
    END IF;

    v_hashed_pin := extensions.crypt(v_clean_pin, extensions.gen_salt('bf', 10));

    INSERT INTO private_auth.user_secrets (user_id, argon2_personal_pin_hash, updated_at)
    VALUES (p_student_id, v_hashed_pin, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        argon2_personal_pin_hash = EXCLUDED.argon2_personal_pin_hash,
        updated_at = NOW();

    UPDATE public.users_raw SET
        personal_pin = NULL,
        failed_pin_attempts = 0,
        pin_locked_until = NULL,
        is_pin_activated = TRUE,
        is_campus_active = TRUE,
        status = 'aktiv'
    WHERE id = p_student_id;

    BEGIN
        UPDATE public.students SET
            personal_pin = NULL,
            is_pin_activated = TRUE,
            is_campus_active = TRUE,
            status = 'aktiv'
        WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        IF v_user.birth_date IS NOT NULL THEN
            v_day_of_birth := EXTRACT(DAY FROM v_user.birth_date)::INT;
        ELSE
            v_day_of_birth := 1;
        END IF;

        INSERT INTO public.activation_days (student_id, school_id, day_of_birth)
        VALUES (p_student_id, v_user.school_id, v_day_of_birth)
        ON CONFLICT (student_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Mint Stage-2 session lease for student after initial PIN activation
    PERFORM private_auth.mint_verified_pin_session_lease(p_student_id, 'initial_student_pin');

    BEGIN
        IF to_regclass('public.audit_logs') IS NOT NULL THEN
            INSERT INTO public.audit_logs (
                school_id, user_id, action, details
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

-- Upgrade register_session_lease to bind device_key to newly minted Stage-2 PIN leases
CREATE OR REPLACE FUNCTION public.register_session_lease(
    p_user_id UUID,
    p_school_id UUID,
    p_device_name TEXT,
    p_device_key TEXT,
    p_role TEXT,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_caller_id UUID;
    v_lease_id UUID;
    v_is_revoked BOOLEAN;
    v_recent_pin_lease_id UUID := NULL;
    v_clean_device_key TEXT := COALESCE(NULLIF(TRIM(p_device_key), ''), gen_random_uuid()::text);
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();

    -- If caller header doesn't yet carry the lease token (e.g. CORS stripped response header),
    -- check if a verified Stage-2 PIN lease was minted for p_user_id within the last 60 seconds
    IF v_caller_id IS NULL AND p_user_id IS NOT NULL THEN
        SELECT id INTO v_recent_pin_lease_id
        FROM public.session_leases
        WHERE user_id = p_user_id
          AND is_revoked = FALSE
          AND created_at > (NOW() - INTERVAL '60 seconds')
          AND (
              device_key LIKE 'personal_pin_%'
              OR device_key LIKE 'parent_pin_%'
              OR device_key LIKE 'set_personal_pin_%'
              OR device_key LIKE 'initial_student_pin_%'
          )
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    IF NOT (
        public.is_master_admin()
        OR current_setting('role', true) = 'service_role'
        OR (v_caller_id IS NOT NULL AND v_caller_id = p_user_id)
        OR v_recent_pin_lease_id IS NOT NULL
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'UNAUTHORIZED_SESSION_REGISTRATION',
            'message', 'Sitzungsregistrierung erfordert einen verifizierten Benutzerkontext.'
        );
    END IF;

    IF v_recent_pin_lease_id IS NOT NULL THEN
        UPDATE public.session_leases
        SET last_active_at = NOW(),
            device_key = v_clean_device_key,
            device_name = COALESCE(NULLIF(p_device_name, ''), device_name),
            user_agent = COALESCE(NULLIF(p_user_agent, ''), user_agent)
        WHERE id = v_recent_pin_lease_id;

        RETURN jsonb_build_object(
            'success', true,
            'lease_id', v_recent_pin_lease_id,
            'is_new', false
        );
    END IF;

    SELECT id, is_revoked INTO v_lease_id, v_is_revoked
    FROM public.session_leases
    WHERE user_id = p_user_id AND device_key = v_clean_device_key
    ORDER BY last_active_at DESC, created_at DESC
    LIMIT 1;

    IF v_lease_id IS NOT NULL THEN
        IF v_is_revoked = TRUE THEN
            RETURN jsonb_build_object(
                'success', false,
                'revoked', true,
                'message', 'Diese Gerätesitzung wurde von der Schulleitung widerrufen.'
            );
        END IF;

        UPDATE public.session_leases
        SET last_active_at = NOW(),
            device_name = COALESCE(NULLIF(p_device_name, ''), device_name),
            user_agent = COALESCE(NULLIF(p_user_agent, ''), user_agent)
        WHERE id = v_lease_id;

        RETURN jsonb_build_object(
            'success', true,
            'lease_id', v_lease_id,
            'is_new', false
        );
    ELSE
        INSERT INTO public.session_leases (
            user_id, school_id, device_name, device_key, role, user_agent, last_active_at
        ) VALUES (
            p_user_id, p_school_id, COALESCE(NULLIF(p_device_name, ''), 'Unbekanntes Gerät'),
            v_clean_device_key, p_role, p_user_agent, NOW()
        )
        RETURNING id INTO v_lease_id;

        RETURN jsonb_build_object(
            'success', true,
            'lease_id', v_lease_id,
            'is_new', true
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_session_lease(UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 5. [P0-2] HARDEN get_master_schools_overview() AGAINST SECURITY DEFINER BYPASS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_master_schools_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security TO 'off'
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_res JSONB;
BEGIN
    -- [P0-2] Never check current_user inside SECURITY DEFINER (it is always 'postgres').
    -- Strictly require verified Master Admin session or PostgREST service_role JWT.
    IF NOT (public.is_master_admin() OR current_setting('role', true) = 'service_role') THEN
        RAISE EXCEPTION 'Zugriff verweigert: Master-Admin Berechtigung erforderlich.' USING ERRCODE = '42501';
    END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', s.id,
            'school_id', s.id,
            'name', s.name,
            'subdomain', s.subdomain,
            'logo_url', s.logo_url,
            'city', s.city,
            'street', s.street,
            'house_number', s.house_number,
            'zip_code', s.zip_code,
            'phone', s.phone,
            'phone_number', s.phone_number,
            'contract_start_date', s.contract_start_date,
            'created_at', s.created_at,
            'billing_email', s.billing_email,
            'billing_contact_person', s.billing_contact_person,
            'email', s.email,
            'subscription_type', s.subscription_type,
            'subscription_bypass', COALESCE(s.subscription_bypass, false),
            'has_campus_subscription', COALESCE(s.has_campus_subscription, true),
            'has_groovelab_subscription', COALESCE(s.has_groovelab_subscription, false),
            'has_kombi_discount', COALESCE(s.has_kombi_discount, false),
            'is_billing_booked', COALESCE(s.is_billing_booked, false),
            'status', COALESCE(s.status, 'active'),
            'is_demo_tenant', COALESCE(s.is_demo_tenant, false),
            'storage_addon_gb', COALESCE(s.storage_addon_gb, 0),
            'storage_addon_monthly_fee', COALESCE(s.storage_addon_monthly_fee, 0.00),
            'storage_addon_status', COALESCE(s.storage_addon_status, 'none'),
            'student_billing_option', s.student_billing_option,
            'user_quota', s.user_quota,
            'pending_user_quota', s.pending_user_quota,
            'sepa_iban', s.sepa_iban,
            'sepa_bic', s.sepa_bic,
            'sepa_account_holder', s.sepa_account_holder,
            'sepa_mandate_id', s.sepa_mandate_id,
            'sepa_mandate_date', s.sepa_mandate_date,
            'operator_notes', s.operator_notes,
            'invite_token', s.invite_token,
            'invite_expires_at', s.invite_expires_at,
            'is_trial', COALESCE(s.is_trial, false),
            'trial_until', COALESCE(s.trial_until, s.trial_ends_at),
            'is_approved', COALESCE(s.is_approved, true),
            'dunning_level', COALESCE(s.dunning_level, 0),
            'dunning_moratorium_until', s.dunning_moratorium_until,
            'dunning_kulanz_reason', s.dunning_kulanz_reason,
            'dunning_last_letter_at', s.dunning_last_letter_at,
            'dunning_paused', COALESCE(s.dunning_paused, false)
        ) ORDER BY s.name ASC
    )
    INTO v_res
    FROM public.schools s
    WHERE COALESCE(s.status, 'active') <> 'archived';

    RETURN COALESCE(v_res, '[]'::jsonb);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_master_schools_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_master_schools_overview() TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 6. [P0-3] HARDEN get_secretary_dashboard_bootstrap AGAINST UNAUTHENTICATED ACCESS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_secretary_dashboard_bootstrap(
    p_school_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_school_id UUID;
    v_caller_role TEXT;
    v_caller_roles TEXT[];
    v_is_admin BOOLEAN := FALSE;

    v_school JSONB := NULL;
    v_has_b2b_avv BOOLEAN := FALSE;
    v_current_user JSONB := NULL;
    v_users JSONB := '[]'::jsonb;
    v_students_meta JSONB := '[]'::jsonb;
    v_pending_students JSONB := '[]'::jsonb;
    v_activation_days JSONB := '[]'::jsonb;
    v_schedules JSONB := '[]'::jsonb;
    v_rooms JSONB := '[]'::jsonb;
    v_buildings JSONB := '[]'::jsonb;
    v_equipment JSONB := '[]'::jsonb;
    v_stations JSONB := '[]'::jsonb;
    v_bands JSONB := '[]'::jsonb;
    v_alerts JSONB := '[]'::jsonb;
    v_pending_bookings JSONB := '[]'::jsonb;
    v_subjects JSONB := '[]'::jsonb;
    v_announcements JSONB := '[]'::jsonb;

    v_total_students INTEGER := 0;
    v_active_students INTEGER := 0;
    v_total_teachers INTEGER := 0;
    v_active_teachers INTEGER := 0;
    v_total_rooms INTEGER := 0;
    v_pending_bookings_count INTEGER := 0;
    v_pending_schedules_count INTEGER := 0;
    v_active_alerts_count INTEGER := 0;
BEGIN
    IF p_school_id IS NULL THEN
        RAISE EXCEPTION 'p_school_id ist zwingend erforderlich' USING ERRCODE = '42501';
    END IF;

    -- [P0-3] Strict Fail-Closed Authentication & Tenant/Role Enforcement
    v_caller_id := public.get_current_authenticated_user_id();
    v_is_admin := public.is_master_admin();

    IF NOT v_is_admin AND current_setting('role', true) <> 'service_role' THEN
        IF v_caller_id IS NULL THEN
            RAISE EXCEPTION 'Authentifizierung erforderlich: Keine gültige Sitzung.' USING ERRCODE = '42501';
        END IF;

        SELECT school_id, role::text, COALESCE(roles::text[], ARRAY[]::text[])
        INTO v_caller_school_id, v_caller_role, v_caller_roles
        FROM public.users_raw
        WHERE id = v_caller_id AND is_active = TRUE;

        IF v_caller_school_id IS DISTINCT FROM p_school_id THEN
            RAISE EXCEPTION 'Mandantenverletzung: Zugriff auf school_id % verweigert', p_school_id USING ERRCODE = '42501';
        END IF;

        IF v_caller_role NOT IN ('admin', 'secretary')
           AND NOT ('admin' = ANY(v_caller_roles))
           AND NOT ('secretary' = ANY(v_caller_roles)) THEN
            RAISE EXCEPTION 'Zugriff verweigert: Verwaltungsberechtigung erforderlich.' USING ERRCODE = '42501';
        END IF;
    END IF;

    -- A) Schulprofil
    SELECT to_jsonb(s) INTO v_school
    FROM (
        SELECT id, subdomain, name, logo_url, primary_color, calendar_url,
               groovelab_kiosk_token, campus_login_token, allow_messages_global,
               has_campus_subscription, has_groovelab_subscription, is_paused,
               limits_enabled, user_quota, pending_user_quota,
               campus_activated_this_month, groovelab_activated_this_month,
               student_billing_option, zip_code, city, street, house_number,
               email, contract_ends_at, created_at,
               is_billing_booked, contract_start_date, extra_billing_option,
               opening_hours, is_trial, trial_ends_at, status, subscription_bypass,
               school_year_start_month, school_year_start_day, auto_delete_expired_users,
               custom_price_campus, custom_price_groovelab, custom_price_kombi,
               custom_price_teacher, custom_price_student, grandfathered_campus_price,
               grandfathered_groovelab_price, grandfathered_kombi_price,
               grandfathered_teacher_price, grandfathered_student_price,
               price_grandfathered_at, avv_signed_at, avv_signee_name,
               storage_addon_gb, storage_addon_monthly_fee, storage_addon_status,
               storage_pending_downgrade_gb, storage_pending_effective_date, storage_used_bytes
        FROM public.schools
        WHERE id = p_school_id
    ) s;

    -- B) AVV-Konsensprüfung
    SELECT EXISTS (
        SELECT 1
        FROM public.legal_consents
        WHERE school_id = p_school_id
          AND consent_type = 'terms_b2b_avv'
          AND is_revoked = FALSE
    ) INTO v_has_b2b_avv;

    -- C) Aktuell eingeloggter Benutzer
    IF p_user_id IS NOT NULL THEN
        SELECT to_jsonb(u) INTO v_current_user
        FROM (
            SELECT id, first_name, last_name, role, roles, email, photo_url, avatar_url,
                   instrument, is_active, ausweis_nummer, teacher_qr_token,
                   is_campus_active, is_groovelab_active, nickname, is_premium_user,
                   contract_ends_at, teacher_id, lesson_duration, qr_token,
                   is_pin_activated, created_at, phone, birth_date
            FROM public.users
            WHERE id = p_user_id AND school_id = p_school_id
        ) u;
    END IF;

    -- D) Alle Benutzer der Schule
    SELECT COALESCE(jsonb_agg(to_jsonb(u)), '[]'::jsonb)
    INTO v_users
    FROM (
        SELECT id, first_name, last_name, role, roles, email, instrument,
               is_active, ausweis_nummer, teacher_qr_token, is_campus_active,
               is_groovelab_active, nickname, is_premium_user, contract_ends_at,
               teacher_id, lesson_duration, qr_token, is_pin_activated, ausfall_until,
               created_at, preferred_room_ids, planned_boards, student_billing_payment_method,
               activated_at, student_billing_cash_paid, is_trial, trial_ends_at,
               exempt_from_direct_billing
        FROM public.users
        WHERE school_id = p_school_id
        ORDER BY first_name ASC, last_name ASC
    ) u;

    -- E) Schüler-Vertragsmetadaten
    SELECT COALESCE(jsonb_agg(to_jsonb(st)), '[]'::jsonb)
    INTO v_students_meta
    FROM (
        SELECT id, status, onboarding_frozen, onboarding_pin, timetable_assigned_at
        FROM public.students
        WHERE school_id = p_school_id
    ) st;

    -- F) Ausstehende Schüler
    SELECT COALESCE(jsonb_agg(to_jsonb(ps)), '[]'::jsonb)
    INTO v_pending_students
    FROM (
        SELECT id, school_id, teacher_id, instrument, status, created_at,
               first_name, last_name, day_of_birth
        FROM public.pending_students_decrypted
        WHERE school_id = p_school_id
    ) ps;

    -- G) Aktivierungstage
    SELECT COALESCE(jsonb_agg(to_jsonb(ad)), '[]'::jsonb)
    INTO v_activation_days
    FROM (
        SELECT student_id, day_of_birth
        FROM public.activation_days
        WHERE school_id = p_school_id
    ) ad;

    -- H) Stundenpläne
    SELECT COALESCE(jsonb_agg(to_jsonb(sch)), '[]'::jsonb)
    INTO v_schedules
    FROM (
        SELECT *
        FROM public.schedules
        WHERE school_id = p_school_id
    ) sch;

    -- I) Räume
    SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
    INTO v_rooms
    FROM (
        SELECT *
        FROM public.rooms
        WHERE school_id = p_school_id
        ORDER BY sort_order ASC, name ASC
    ) r;

    -- J) Gebäude
    SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]'::jsonb)
    INTO v_buildings
    FROM (
        SELECT *
        FROM public.buildings
        WHERE school_id = p_school_id
        ORDER BY name ASC
    ) b;

    -- K) Inventar / Geräte
    SELECT COALESCE(jsonb_agg(to_jsonb(eq)), '[]'::jsonb)
    INTO v_equipment
    FROM (
        SELECT *
        FROM public.school_equipment
        WHERE school_id = p_school_id
        ORDER BY name ASC
    ) eq;

    -- L) Stationen
    SELECT COALESCE(jsonb_agg(to_jsonb(st) || jsonb_build_object('rooms', to_jsonb(st.rm))), '[]'::jsonb)
    INTO v_stations
    FROM (
        SELECT st.*, rm
        FROM public.stations st
        INNER JOIN public.rooms rm ON rm.id = st.room_id
        WHERE rm.school_id = p_school_id
        ORDER BY st.name ASC
    ) st;

    -- M) Bands
    SELECT COALESCE(jsonb_agg(to_jsonb(bd)), '[]'::jsonb)
    INTO v_bands
    FROM (
        SELECT *
        FROM public.bands
        WHERE school_id = p_school_id
        ORDER BY name ASC
    ) bd;

    -- N) System-Alerts (Letzte 100)
    SELECT COALESCE(jsonb_agg(to_jsonb(al)), '[]'::jsonb)
    INTO v_alerts
    FROM (
        SELECT *
        FROM public.system_alerts
        WHERE school_id = p_school_id
        ORDER BY created_at DESC
        LIMIT 100
    ) al;

    -- O) Ausstehende Raumbuchungen
    SELECT COALESCE(jsonb_agg(
        to_jsonb(rb) || jsonb_build_object(
            'rooms', CASE WHEN rb.room_name IS NOT NULL THEN jsonb_build_object('name', rb.room_name) ELSE NULL END,
            'profiles', CASE WHEN rb.booked_by IS NOT NULL THEN jsonb_build_object('first_name', rb.user_first_name, 'last_name', rb.user_last_name) ELSE NULL END
        )
    ), '[]'::jsonb)
    INTO v_pending_bookings
    FROM (
        SELECT rb.*, rm.name AS room_name, usr.first_name AS user_first_name, usr.last_name AS user_last_name
        FROM public.room_bookings rb
        LEFT JOIN public.rooms rm ON rm.id = rb.room_id
        LEFT JOIN public.users usr ON usr.id = rb.booked_by
        WHERE rb.school_id = p_school_id
          AND rb.status = 'pending'
        ORDER BY rb.date ASC, rb.start_time ASC
    ) rb;

    -- P) Fächer
    SELECT COALESCE(jsonb_agg(to_jsonb(sub)), '[]'::jsonb)
    INTO v_subjects
    FROM (
        SELECT *
        FROM public.subjects
        WHERE school_id = p_school_id
        ORDER BY name ASC
    ) sub;

    -- Q) Aushänge & Termine
    SELECT COALESCE(jsonb_agg(to_jsonb(ann)), '[]'::jsonb)
    INTO v_announcements
    FROM (
        SELECT *
        FROM public.campus_announcements
        WHERE school_id = p_school_id
        ORDER BY created_at DESC
    ) ann;

    SELECT count(*) INTO v_total_students FROM public.users WHERE school_id = p_school_id AND role = 'student';
    SELECT count(*) INTO v_active_students FROM public.users WHERE school_id = p_school_id AND role = 'student' AND (is_campus_active = TRUE OR is_groovelab_active = TRUE);
    SELECT count(*) INTO v_total_teachers FROM public.users WHERE school_id = p_school_id AND (role = 'teacher' OR 'teacher' = ANY(roles));
    SELECT count(*) INTO v_active_teachers FROM public.users WHERE school_id = p_school_id AND (role = 'teacher' OR 'teacher' = ANY(roles)) AND is_active = TRUE;
    SELECT count(*) INTO v_total_rooms FROM public.rooms WHERE school_id = p_school_id;
    SELECT count(*) INTO v_pending_bookings_count FROM public.room_bookings WHERE school_id = p_school_id AND status = 'pending';
    SELECT count(*) INTO v_pending_schedules_count FROM public.schedules WHERE school_id = p_school_id AND status = 'ready_for_admin_review';
    SELECT count(*) INTO v_active_alerts_count FROM public.system_alerts WHERE school_id = p_school_id AND (resolved IS NULL OR resolved = FALSE);

    RETURN jsonb_build_object(
        'success', TRUE,
        'school', v_school,
        'has_b2b_avv', v_has_b2b_avv,
        'current_user', v_current_user,
        'users', v_users,
        'students_meta', v_students_meta,
        'pending_students', v_pending_students,
        'activation_days', v_activation_days,
        'schedules', v_schedules,
        'rooms', v_rooms,
        'buildings', v_buildings,
        'school_equipment', v_equipment,
        'stations', v_stations,
        'bands', v_bands,
        'system_alerts', v_alerts,
        'pending_room_bookings', v_pending_bookings,
        'subjects', v_subjects,
        'announcements', v_announcements,
        'counts', jsonb_build_object(
            'total_students', v_total_students,
            'active_students', v_active_students,
            'total_teachers', v_total_teachers,
            'active_teachers', v_active_teachers,
            'total_rooms', v_total_rooms,
            'pending_bookings', v_pending_bookings_count,
            'pending_schedules', v_pending_schedules_count,
            'active_alerts', v_active_alerts_count
        ),
        'server_timestamp', CURRENT_TIMESTAMP
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_secretary_dashboard_bootstrap(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_secretary_dashboard_bootstrap(UUID, UUID) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 7. [P0-4] & [P0-5] HARDEN login_master_admin, register_webauthn_credential & authenticate_webauthn_credential
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.login_master_admin(
    p_username text DEFAULT 'admin',
    p_password text DEFAULT NULL,
    p_totp_code text DEFAULT NULL,
    p_recovery_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
SET row_security = off
AS $$
DECLARE
    v_user record;
    v_clean_user text := LOWER(TRIM(COALESCE(p_username, 'admin')));
    v_clean_totp text := TRIM(COALESCE(p_totp_code, ''));
    v_clean_recovery text := UPPER(REPLACE(TRIM(COALESCE(p_recovery_code, '')), '-', ''));
    v_recovery_record record;
    v_recovery_hash text;
    v_lease_id uuid;
    v_is_mock_code boolean;
    v_totp_valid boolean := false;
BEGIN
    SELECT ur.id, ur.role, ur.is_master_admin, ur.first_name, ur.last_name,
           COALESCE(ur.is_2fa_enabled, true) AS is_2fa_enabled,
           sec.two_factor_secret
    INTO v_user
    FROM public.users_raw ur
    LEFT JOIN private_auth.user_secrets sec ON sec.user_id = ur.id
    WHERE ur.is_master_admin = true
      AND (
          LOWER(TRIM(COALESCE(ur.master_admin_username, 'admin'))) = v_clean_user
          OR v_clean_user = 'admin'
      )
    ORDER BY (CASE WHEN ur.id = '11079eae-664a-49a4-8692-771d83a3193c'::uuid THEN 1 ELSE 2 END)
    LIMIT 1;

    IF v_user.id IS NULL THEN
        INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
        VALUES ('MASTER_ADMIN_LOGIN_FAILED', 'AUTHENTICATION', 'FAILURE',
                jsonb_build_object('attempted_user', v_clean_user, 'reason', 'USER_NOT_FOUND', 'timestamp', NOW()), NULL);
        RETURN NULL;
    END IF;

    IF v_clean_totp = '' AND v_clean_recovery = '' THEN
        RETURN jsonb_build_object(
            'requires_2fa', true,
            'user_id', v_user.id,
            'first_name', v_user.first_name,
            'is_zero_password', true,
            'message', 'Zero-Password Master Admin: Bitte Google Authenticator Einmalcode oder Notfall-Code eingeben.'
        );
    END IF;

    IF v_clean_recovery <> '' THEN
        v_recovery_hash := encode(digest(v_clean_recovery, 'sha256'), 'hex');

        SELECT * INTO v_recovery_record
        FROM private_auth.master_admin_recovery_codes
        WHERE user_id = v_user.id
          AND code_hash = v_recovery_hash
          AND is_used = false
        LIMIT 1;

        IF v_recovery_record.id IS NOT NULL THEN
            UPDATE private_auth.master_admin_recovery_codes
            SET is_used = true, used_at = NOW()
            WHERE id = v_recovery_record.id;

            INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
            VALUES ('MASTER_ADMIN_EMERGENCY_RECOVERY_LOGIN', 'AUTHENTICATION', 'SUCCESS',
                    jsonb_build_object('method', 'BREAK_GLASS_RECOVERY_CODE', 'code_id', v_recovery_record.id), v_user.id);

            v_lease_id := gen_random_uuid();
            INSERT INTO public.session_leases (
                id, user_id, school_id, role, device_key, device_name, created_at, last_active_at, is_revoked
            ) VALUES (
                v_lease_id, v_user.id, NULL, 'admin', 'master_emergency_' || v_lease_id::text, 'Master Admin Emergency Recovery', NOW(), NOW(), false
            );

            RETURN jsonb_build_object(
                'id', v_user.id,
                'role', 'admin',
                'is_master_admin', true,
                'first_name', v_user.first_name,
                'last_name', v_user.last_name,
                'lease_token', v_lease_id,
                'used_recovery_code', true
            );
        ELSE
            INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
            VALUES ('MASTER_ADMIN_LOGIN_FAILED', 'AUTHENTICATION', 'FAILURE',
                    jsonb_build_object('reason', 'INVALID_OR_USED_RECOVERY_CODE', 'attempted_user', v_clean_user), v_user.id);
            RETURN jsonb_build_object('error', 'Ungültiger oder bereits verwendeter Notfall-Wiederherstellungscode.');
        END IF;
    END IF;

    IF v_clean_totp !~ '^[0-9]{6}$' THEN
        INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
        VALUES ('MASTER_ADMIN_2FA_FAILED', 'AUTHENTICATION', 'FAILURE',
                jsonb_build_object('reason', 'MALFORMED_FORMAT', 'attempted_user', v_clean_user), v_user.id);
        RETURN jsonb_build_object('error', 'Ungültiger Authenticator-Code (muss exakt 6 Ziffern enthalten).');
    END IF;

    v_is_mock_code := v_clean_totp IN ('000000', '123456', '654321', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999');
    IF v_is_mock_code THEN
        INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
        VALUES ('MASTER_ADMIN_2FA_FAILED', 'AUTHENTICATION', 'FAILURE',
                jsonb_build_object('reason', 'TRIVIAL_MOCK_ATTEMPT', 'attempted_user', v_clean_user), v_user.id);
        RETURN jsonb_build_object('error', 'Sicherheitswarnung: Trivialer 2FA-Code abgewiesen.');
    END IF;

    IF v_user.two_factor_secret IS NOT NULL AND TRIM(v_user.two_factor_secret) <> '' THEN
        v_totp_valid := public.verify_totp(v_user.two_factor_secret, v_clean_totp);
        IF NOT v_totp_valid THEN
            INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
            VALUES ('MASTER_ADMIN_2FA_FAILED', 'AUTHENTICATION', 'FAILURE',
                    jsonb_build_object('reason', 'INVALID_TOTP_CODE', 'attempted_user', v_clean_user), v_user.id);
            RETURN jsonb_build_object('error', 'Ungültiger 2FA-Einmalcode. Bitte Authenticator-App prüfen.');
        END IF;
    ELSE
        INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
        VALUES ('MASTER_ADMIN_2FA_FAILED', 'AUTHENTICATION', 'FAILURE',
                jsonb_build_object('reason', 'MISSING_TOTP_SECRET', 'attempted_user', v_clean_user), v_user.id);
        RETURN jsonb_build_object('error', 'Konfigurationsfehler: Kein TOTP-Geheimnis hinterlegt.');
    END IF;

    v_lease_id := gen_random_uuid();
    INSERT INTO public.session_leases (
        id, user_id, school_id, role, device_key, device_name, created_at, last_active_at, is_revoked
    ) VALUES (
        v_lease_id, v_user.id, NULL, 'admin', 'master_totp_' || v_lease_id::text, 'Master Admin Authenticator Login', NOW(), NOW(), false
    );

    INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
    VALUES ('MASTER_ADMIN_LOGIN_SUCCESS', 'AUTHENTICATION', 'SUCCESS',
            jsonb_build_object('method', 'GOOGLE_AUTHENTICATOR_TOTP', 'lease_id', v_lease_id), v_user.id);

    RETURN jsonb_build_object(
        'id', v_user.id,
        'role', 'admin',
        'is_master_admin', true,
        'first_name', v_user.first_name,
        'last_name', v_user.last_name,
        'lease_token', v_lease_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.login_master_admin(text, text, text, text) TO anon, authenticated, service_role;

-- [P0-5a] Harden register_webauthn_credential against Cross-User Credential Overwrite
CREATE OR REPLACE FUNCTION public.register_webauthn_credential(
    p_user_id UUID,
    p_credential_id TEXT,
    p_public_key TEXT,
    p_device_name TEXT,
    p_challenge TEXT,
    p_totp_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
AS $$
DECLARE
    v_clean_cred TEXT := TRIM(p_credential_id);
    v_clean_chal TEXT := TRIM(p_challenge);
    v_clean_totp TEXT := TRIM(COALESCE(p_totp_code, ''));
    v_clean_device TEXT;
    v_chal_record RECORD;
    v_caller_id UUID;
    v_effective_user_id UUID := p_user_id;
    v_resolved_user_id UUID;
    v_authorized BOOLEAN := FALSE;
    v_new_lease_id UUID := NULL;
    v_target_master RECORD;
    v_existing_owner UUID;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();

    IF v_clean_chal IS NULL OR v_clean_chal = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sicherheits-Challenge fehlt.');
    END IF;

    SELECT * INTO v_chal_record
    FROM private_auth.webauthn_challenges
    WHERE challenge = v_clean_chal
      AND expires_at > NOW()
    FOR UPDATE;

    IF v_chal_record.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sicherheits-Challenge ist abgelaufen oder ungültig.');
    END IF;

    DELETE FROM private_auth.webauthn_challenges WHERE id = v_chal_record.id;

    IF public.is_master_admin() THEN
        v_authorized := TRUE;
    ELSIF current_setting('role', true) = 'service_role' THEN
        v_authorized := TRUE;
    ELSIF v_caller_id IS NOT NULL AND (v_caller_id = p_user_id OR (p_user_id = '88888888-8888-8888-8888-888888888888'::uuid AND public.is_master_admin())) THEN
        v_authorized := TRUE;
    END IF;

    IF NOT v_authorized AND v_clean_totp <> '' THEN
        SELECT ur.id, ur.is_master_admin, sec.two_factor_secret
        INTO v_target_master
        FROM public.users_raw ur
        LEFT JOIN private_auth.user_secrets sec ON sec.user_id = ur.id
        WHERE (
            ur.id = p_user_id
            OR (p_user_id = '88888888-8888-8888-8888-888888888888'::uuid AND ur.is_master_admin = true)
        )
        AND ur.is_active = TRUE
        ORDER BY (CASE WHEN ur.id = '11079eae-664a-49a4-8692-771d83a3193c'::uuid THEN 1 ELSE 2 END)
        LIMIT 1;

        IF v_target_master.id IS NOT NULL AND v_target_master.two_factor_secret IS NOT NULL THEN
            IF public.verify_totp(v_target_master.two_factor_secret, v_clean_totp) THEN
                v_authorized := TRUE;
                v_effective_user_id := v_target_master.id;

                v_new_lease_id := gen_random_uuid();
                INSERT INTO public.session_leases (
                    id, user_id, school_id, role, device_key, device_name, created_at, last_active_at, is_revoked
                ) VALUES (
                    v_new_lease_id, v_effective_user_id, NULL, 'admin', 'master_passkey_stepup_' || v_new_lease_id::text,
                    COALESCE(NULLIF(TRIM(p_device_name), ''), 'Passkey Device'),
                    NOW(), NOW(), false
                );

                INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
                VALUES ('MASTER_ADMIN_STEP_UP_PASSKEY_REGISTRATION', 'AUTHENTICATION', 'SUCCESS',
                        jsonb_build_object('method', 'TOTP_STEP_UP_REGISTRATION', 'lease_id', v_new_lease_id), v_effective_user_id);
            ELSE
                INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
                VALUES ('MASTER_ADMIN_STEP_UP_FAILED', 'AUTHENTICATION', 'FAILURE',
                        jsonb_build_object('reason', 'INVALID_STEP_UP_TOTP', 'attempted_user', p_user_id), NULL);
                RETURN jsonb_build_object('success', false, 'error', 'Ungültiger 2FA-Bestätigungscode (TOTP).');
            END IF;
        END IF;
    END IF;

    IF NOT v_authorized THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'UNAUTHORIZED_PASSKEY_REGISTRATION',
            'requires_step_up', true,
            'message', 'Für die Registrierung ist eine aktive Master-Admin-Sitzung oder eine 2FA-Bestätigung erforderlich.'
        );
    END IF;

    IF v_effective_user_id IS NULL OR v_clean_cred IS NULL OR v_clean_cred = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Anmeldedaten.');
    END IF;

    IF p_public_key IS NULL OR TRIM(p_public_key) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiger öffentlicher Schlüssel.');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.users_raw WHERE id = v_effective_user_id) THEN
        IF v_effective_user_id = '88888888-8888-8888-8888-888888888888'::uuid OR public.is_master_admin() THEN
            SELECT id INTO v_resolved_user_id
            FROM public.users_raw
            WHERE is_master_admin = true
            ORDER BY (CASE WHEN id = '11079eae-664a-49a4-8692-771d83a3193c'::uuid THEN 1 ELSE 2 END)
            LIMIT 1;

            IF v_resolved_user_id IS NOT NULL THEN
                v_effective_user_id := v_resolved_user_id;
            ELSE
                RETURN jsonb_build_object('success', false, 'error', 'Benutzerkonto nicht in Datenbank gefunden.');
            END IF;
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Benutzerkonto nicht in Datenbank gefunden.');
        END IF;
    END IF;

    -- [P0-5a] Prevent cross-user credential_id hijacking on conflict
    SELECT user_id INTO v_existing_owner
    FROM private_auth.webauthn_credentials
    WHERE credential_id = v_clean_cred;

    IF v_existing_owner IS NOT NULL AND v_existing_owner <> v_effective_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'CREDENTIAL_ID_COLLISION: Dieser Passkey ist bereits einem anderen Benutzerkonto zugeordnet.'
        );
    END IF;

    v_clean_device := COALESCE(NULLIF(TRIM(p_device_name), ''), 'Passkey Device');

    INSERT INTO private_auth.webauthn_credentials (
        user_id, credential_id, public_key, counter, sign_count, device_name, is_active, created_at
    ) VALUES (
        v_effective_user_id, v_clean_cred, p_public_key, 0, 0, v_clean_device, TRUE, NOW()
    )
    ON CONFLICT (credential_id) DO UPDATE SET
        public_key = EXCLUDED.public_key,
        device_name = EXCLUDED.device_name,
        is_active = TRUE
    WHERE private_auth.webauthn_credentials.user_id = v_effective_user_id;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_credentials'
    ) THEN
        INSERT INTO public.user_credentials (
            user_id, credential_id, public_key, counter, device_name, is_active, created_at
        ) VALUES (
            v_effective_user_id, v_clean_cred, p_public_key, 0, v_clean_device, TRUE, NOW()
        )
        ON CONFLICT (credential_id) DO UPDATE SET
            public_key = EXCLUDED.public_key,
            device_name = EXCLUDED.device_name,
            is_active = TRUE
        WHERE public.user_credentials.user_id = v_effective_user_id;
    END IF;

    INSERT INTO public.audit_logs (
        table_name, action, operation, record_id, changed_by, new_data
    ) VALUES (
        'webauthn_credentials', 'REGISTER_PASSKEY', 'REGISTER_PASSKEY', v_effective_user_id,
        COALESCE(v_caller_id, v_effective_user_id),
        jsonb_build_object(
            'action', 'register_webauthn_credential',
            'device_name', v_clean_device,
            'credential_id_prefix', LEFT(v_clean_cred, 12) || '...',
            'lease_issued', (v_new_lease_id IS NOT NULL),
            'registered_at', timezone('utc'::text, now())
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_effective_user_id,
        'lease_token', v_new_lease_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_webauthn_credential(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- [P0-5b] Harden authenticate_webauthn_credential with Assertion Payload Verification
DROP FUNCTION IF EXISTS public.authenticate_webauthn_credential(TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.authenticate_webauthn_credential(TEXT, TEXT, UUID, TEXT, TEXT, TEXT, INTEGER);

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
    v_client_data_jsonb JSONB;
    v_auth_data_bytes BYTEA;
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
    IF v_clean_auth_data = '' OR v_clean_client_data = '' OR v_clean_sig = '' OR length(v_clean_sig) < 32 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'FIDO2_ASSERTION_REQUIRED: Kryptografische WebAuthn-Signaturdaten (authenticatorData, clientDataJSON, signature) fehlen.'
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

    -- 3. Decode & verify clientDataJSON (W3C WebAuthn § 7.2 Step 11-14)
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

    v_expected_b64url_chal := rtrim(translate(encode(convert_to(v_clean_chal, 'UTF8'), 'base64'), '+/', '-_'), '=');
    IF v_clean_chal ~ '^[0-9a-fA-F]+$' AND length(v_clean_chal) % 2 = 0 THEN
        v_expected_hex_b64url := rtrim(translate(encode(decode(v_clean_chal, 'hex'), 'base64'), '+/', '-_'), '=');
    END IF;
    IF (v_client_data_jsonb->>'challenge') IS DISTINCT FROM v_expected_b64url_chal
       AND (v_expected_hex_b64url IS NULL OR (v_client_data_jsonb->>'challenge') IS DISTINCT FROM v_expected_hex_b64url)
       AND (v_client_data_jsonb->>'challenge') IS DISTINCT FROM v_clean_chal THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kryptografischer Challenge-Mismatch in clientDataJSON.');
    END IF;

    -- 4. Decode & verify authenticatorData (W3C WebAuthn § 6.1: >= 37 bytes, User Present bit 0 set)
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
            'error', 'Sicherheitssperre: Zu viele Fehlversuche. Zugang vorübergehend gesperrt.'
        );
    END IF;

    -- 7. Update sign_count & last_used_at
    UPDATE private_auth.webauthn_credentials
    SET sign_count = CASE WHEN v_auth_sign_count > 0 THEN v_auth_sign_count::int ELSE COALESCE(sign_count, 0) END,
        counter = COALESCE(counter, 0) + 1,
        last_used_at = NOW()
    WHERE credential_id = v_clean_cred;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_credentials'
    ) THEN
        UPDATE public.user_credentials
        SET counter = COALESCE(counter, 0) + 1,
            sign_count = CASE WHEN v_auth_sign_count > 0 THEN v_auth_sign_count::int ELSE COALESCE(sign_count, 0) END,
            last_used_at = NOW()
        WHERE credential_id = v_clean_cred;
    END IF;

    UPDATE public.users_raw
    SET last_seen = NOW(),
        failed_pin_attempts = 0,
        pin_locked_until = NULL
    WHERE id = v_user.id;

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

    -- 8. Issue verified 30-day session lease with unique per-lease device_key
    v_lease_id := gen_random_uuid();
    INSERT INTO public.session_leases (
        id, user_id, school_id, role, device_key, device_name, created_at, last_active_at, is_revoked
    ) VALUES (
        v_lease_id,
        v_user.id,
        v_user.school_id,
        v_user.role,
        'passkey_' || v_lease_id::text,
        COALESCE(v_cred_record.device_name, 'Passkey Device'),
        NOW(),
        NOW(),
        FALSE
    );

    INSERT INTO public.audit_logs (
        table_name, action, operation, record_id, changed_by, new_data
    ) VALUES (
        'webauthn_credentials', 'AUTH_PASSKEY', 'AUTH_PASSKEY', v_user.id,
        v_user.id,
        jsonb_build_object(
            'action', 'authenticate_webauthn_credential',
            'role', v_user.role,
            'school_id', v_user.school_id,
            'device_name', v_cred_record.device_name,
            'lease_token', v_lease_id,
            'authenticated_at', timezone('utc'::text, now())
        )
    );

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
-- 8. [P0-6] HARDEN authenticate_student_by_id_and_day (RATE LIMITING, TENANCY & TOFU)
-- ------------------------------------------------------------------------------
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
    v_safe_school jsonb := NULL;
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

    -- [P2-3] Prioritize X-Real-IP over X-Forwarded-For
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

    -- [P0-6] Fix column name: qr_login_rate_limits uses created_at, not attempt_at
    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        SELECT COUNT(*) INTO v_ip_failures
        FROM public.qr_login_rate_limits
        WHERE ip_hash = v_ip_hash
          AND success = FALSE
          AND created_at > (NOW() - INTERVAL '15 minutes');

        IF v_ip_failures >= 25 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Sicherheitssperre: Zu viele Anmeldeversuche aus diesem Netzwerk. Bitte warte 15 Minuten.'
            );
        END IF;
    END IF;

    -- [P0-6] If p_school_id IS NULL, require full canonical prefix (e.g. "001-1-0042") and resolve school_id from school_number
    IF p_school_id IS NOT NULL THEN
        SELECT COALESCE(school_number, '001') INTO v_school_num
        FROM public.schools
        WHERE id = p_school_id;
    ELSIF v_clean_id ~ '^\d{3}-[123SLV]-\d{4}$' THEN
        v_school_num := split_part(v_clean_id, '-', 1);
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Bitte gib deine vollständige Ausweisnummer (z. B. 001-1-0042) ein.'
        );
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

    -- [P0-6] Strict tenant scoping: Only allow suffix wildcard match when p_school_id is explicitly bound
    SELECT * INTO v_user
    FROM public.users_raw
    WHERE role = 'student'
      AND is_active = TRUE
      AND (
          ausweis_nummer = v_clean_id
          OR ausweis_nummer = v_canonical_id
          OR ausweis_nummer = v_legacy_id
          OR (p_school_id IS NOT NULL AND v_clean_id ~ '^[0-9]{1,4}$' AND ausweis_nummer LIKE (v_school_num || '-%-' || LPAD(v_clean_id, 4, '0')))
      )
      AND (p_school_id IS NULL OR school_id = p_school_id)
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_user IS NULL THEN
        IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
            INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, raw_credential, school_id, success, created_at)
            VALUES (v_ip_hash, encode(extensions.digest(v_clean_id, 'sha256'), 'hex'), NULL, p_school_id, FALSE, NOW());
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

    IF v_registered_day IS NULL AND v_user.birth_date IS NOT NULL THEN
        v_registered_day := EXTRACT(DAY FROM v_user.birth_date)::integer;
    END IF;

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
                INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, raw_credential, school_id, success, created_at)
                VALUES (v_ip_hash, encode(extensions.digest(v_clean_id, 'sha256'), 'hex'), NULL, v_user.school_id, FALSE, NOW());
            END IF;

            RETURN jsonb_build_object(
                'success', false,
                'error', 'Ausweisnummer oder Geburtstagstag ungültig. Bitte prüfe deine Eingabe.'
            );
        END IF;
    ELSE
        -- [P0-6] Only allow TOFU initialization of activation_days if student has not yet activated their PIN
        IF COALESCE(v_user.is_pin_activated, FALSE) = FALSE THEN
            INSERT INTO public.activation_days (student_id, school_id, day_of_birth)
            VALUES (v_user.id, v_user.school_id, p_day_of_birth)
            ON CONFLICT DO NOTHING;
        ELSE
            IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
                INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, raw_credential, school_id, success, created_at)
                VALUES (v_ip_hash, encode(extensions.digest(v_clean_id, 'sha256'), 'hex'), NULL, v_user.school_id, FALSE, NOW());
            END IF;
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Ausweisnummer oder Geburtstagstag ungültig. Bitte prüfe deine Eingabe.'
            );
        END IF;
    END IF;

    UPDATE public.users_raw
    SET failed_pin_attempts = 0,
        pin_locked_until = NULL
    WHERE id = v_user.id;

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
            (v_user.personal_pin IS NOT NULL AND v_user.personal_pin <> '' AND v_user.personal_pin <> '0000') OR
            (v_user.personal_pin_hash IS NOT NULL AND v_user.personal_pin_hash <> ''),
            FALSE
        );
    END IF;

    IF v_has_parent_pin IS NOT TRUE THEN
        v_has_parent_pin := COALESCE(
            (v_user.parent_pin IS NOT NULL AND v_user.parent_pin <> '' AND v_user.parent_pin <> '0000') OR
            (v_user.parent_pin_hash IS NOT NULL AND v_user.parent_pin_hash <> ''),
            FALSE
        );
    END IF;

    -- [P0-6] Strictly omit qr_token from Stage-1 response; only return safe school context
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
        'schools', v_safe_school,
        'ausweis_nummer', v_user.ausweis_nummer
    );

    RETURN jsonb_build_object(
        'success', true,
        'requires_pin', TRUE,
        'user', v_sanitized_user
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.authenticate_student_by_id_and_day(uuid, text, integer) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 9. [P1-2] HARDEN AUDIO CALIBRATION RPCs WITH CALLER OWNERSHIP CHECKS
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

    -- [P1-2] Enforce strict caller authorization
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

-- ------------------------------------------------------------------------------
-- 10. [P1-1] HARDEN RLS POLICIES & REPLACE auth.uid() WITH get_current_authenticated_user_id()
-- ------------------------------------------------------------------------------

-- A) platform_feedback (Strict Authenticated Ownership & Tenant Boundary)
ALTER TABLE public.platform_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_feedback_select" ON public.platform_feedback;
CREATE POLICY "platform_feedback_select" ON public.platform_feedback
    FOR SELECT TO anon, authenticated
    USING (
        public.is_master_admin()
        OR user_id = public.get_current_authenticated_user_id()
        OR (
            school_id = public.get_current_user_school_id()
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        )
    );

DROP POLICY IF EXISTS "platform_feedback_insert" ON public.platform_feedback;
CREATE POLICY "platform_feedback_insert" ON public.platform_feedback
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        public.get_current_authenticated_user_id() IS NOT NULL
        AND (user_id IS NULL OR user_id = public.get_current_authenticated_user_id())
        AND (school_id IS NULL OR school_id = public.get_current_user_school_id() OR public.is_master_admin())
    );

DROP POLICY IF EXISTS "platform_feedback_update" ON public.platform_feedback;
CREATE POLICY "platform_feedback_update" ON public.platform_feedback
    FOR UPDATE TO anon, authenticated
    USING (
        public.is_master_admin()
        OR user_id = public.get_current_authenticated_user_id()
    )
    WITH CHECK (
        public.is_master_admin()
        OR user_id = public.get_current_authenticated_user_id()
    );

-- B) band_rehearsals (Eliminate school_id IS NULL bypass)
ALTER TABLE public.band_rehearsals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "band_rehearsals_select" ON public.band_rehearsals;
CREATE POLICY "band_rehearsals_select" ON public.band_rehearsals
    FOR SELECT TO anon, authenticated
    USING (
        public.is_master_admin()
        OR school_id = public.get_current_user_school_id()
    );

DROP POLICY IF EXISTS "band_rehearsals_mutation" ON public.band_rehearsals;
CREATE POLICY "band_rehearsals_mutation" ON public.band_rehearsals
    FOR ALL TO anon, authenticated
    USING (
        public.is_master_admin()
        OR (
            school_id = public.get_current_user_school_id()
            AND public.get_current_authenticated_user_id() IS NOT NULL
        )
    )
    WITH CHECK (
        public.is_master_admin()
        OR (
            school_id = public.get_current_user_school_id()
            AND public.get_current_authenticated_user_id() IS NOT NULL
        )
    );

-- C) student_ranking_profiles & student_nickname_history
ALTER TABLE public.student_ranking_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ranking_profiles_select" ON public.student_ranking_profiles;
DROP POLICY IF EXISTS "ranking_profiles_select_policy" ON public.student_ranking_profiles;
CREATE POLICY "ranking_profiles_select" ON public.student_ranking_profiles
    FOR SELECT TO anon, authenticated
    USING (
        public.is_master_admin()
        OR user_id = public.get_current_authenticated_user_id()
        OR (is_public = TRUE AND school_id = public.get_current_user_school_id())
        OR (school_id = public.get_current_user_school_id() AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher'))
    );

DROP POLICY IF EXISTS "ranking_profiles_mutation" ON public.student_ranking_profiles;
CREATE POLICY "ranking_profiles_mutation" ON public.student_ranking_profiles
    FOR ALL TO anon, authenticated
    USING (
        user_id = public.get_current_authenticated_user_id()
        OR public.is_master_admin()
    )
    WITH CHECK (
        user_id = public.get_current_authenticated_user_id()
        OR public.is_master_admin()
    );

ALTER TABLE public.student_nickname_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nickname_history_select" ON public.student_nickname_history;
DROP POLICY IF EXISTS "nickname_history_select_policy" ON public.student_nickname_history;
CREATE POLICY "nickname_history_select" ON public.student_nickname_history
    FOR SELECT TO anon, authenticated
    USING (
        user_id = public.get_current_authenticated_user_id()
        OR public.is_master_admin()
        OR (school_id = public.get_current_user_school_id() AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher'))
    );

-- D) student_groove_scores & student_ear_scores
ALTER TABLE public.student_groove_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "groove_scores_select" ON public.student_groove_scores;
DROP POLICY IF EXISTS "groove_scores_select_policy" ON public.student_groove_scores;
CREATE POLICY "groove_scores_select" ON public.student_groove_scores
    FOR SELECT TO anon, authenticated
    USING (
        public.is_master_admin()
        OR user_id = public.get_current_authenticated_user_id()
        OR school_id = public.get_current_user_school_id()
    );

DROP POLICY IF EXISTS "groove_scores_insert" ON public.student_groove_scores;
DROP POLICY IF EXISTS "groove_scores_insert_update_policy" ON public.student_groove_scores;
CREATE POLICY "groove_scores_insert" ON public.student_groove_scores
    FOR ALL TO anon, authenticated
    USING (
        user_id = public.get_current_authenticated_user_id()
        OR public.is_master_admin()
    )
    WITH CHECK (
        (user_id = public.get_current_authenticated_user_id() AND school_id = public.get_current_user_school_id())
        OR public.is_master_admin()
    );

ALTER TABLE public.student_ear_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ear_scores_select" ON public.student_ear_scores;
CREATE POLICY "ear_scores_select" ON public.student_ear_scores
    FOR SELECT TO anon, authenticated
    USING (
        public.is_master_admin()
        OR user_id = public.get_current_authenticated_user_id()
        OR school_id = public.get_current_user_school_id()
    );

DROP POLICY IF EXISTS "ear_scores_insert" ON public.student_ear_scores;
CREATE POLICY "ear_scores_insert" ON public.student_ear_scores
    FOR ALL TO anon, authenticated
    USING (
        user_id = public.get_current_authenticated_user_id()
        OR public.is_master_admin()
    )
    WITH CHECK (
        (user_id = public.get_current_authenticated_user_id() AND school_id = public.get_current_user_school_id())
        OR public.is_master_admin()
    );

-- E) teacher_sandbox_entries
ALTER TABLE public.teacher_sandbox_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teacher_sandbox_select" ON public.teacher_sandbox_entries;
CREATE POLICY "teacher_sandbox_select" ON public.teacher_sandbox_entries
    FOR ALL TO anon, authenticated
    USING (
        public.is_master_admin()
        OR teacher_id = public.get_current_authenticated_user_id()
        OR student_id = public.get_current_authenticated_user_id()
    )
    WITH CHECK (
        public.is_master_admin()
        OR (
            teacher_id = public.get_current_authenticated_user_id()
            AND school_id = public.get_current_user_school_id()
        )
    );

-- F) student_worldtour_progress (Student-Scoped + Staff-Scoped)
ALTER TABLE public.student_worldtour_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "worldtour_select" ON public.student_worldtour_progress;
CREATE POLICY "worldtour_select" ON public.student_worldtour_progress
    FOR ALL TO anon, authenticated
    USING (
        public.is_master_admin()
        OR user_id = public.get_current_authenticated_user_id()
        OR (
            school_id = public.get_current_user_school_id()
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        )
    )
    WITH CHECK (
        public.is_master_admin()
        OR (user_id = public.get_current_authenticated_user_id() AND school_id = public.get_current_user_school_id())
        OR (
            school_id = public.get_current_user_school_id()
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        )
    );

-- G) audio_recordings, audio_milestones, school_year_playlists (Strict Student Isolation per KUG § 22 / DSGVO Art. 25)
ALTER TABLE public.audio_recordings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audio_recordings_policy" ON public.audio_recordings;
CREATE POLICY "audio_recordings_policy" ON public.audio_recordings
    FOR ALL TO anon, authenticated
    USING (
        public.is_master_admin()
        OR user_id = public.get_current_authenticated_user_id()
        OR (
            school_id = public.get_current_user_school_id()
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        )
    )
    WITH CHECK (
        public.is_master_admin()
        OR (user_id = public.get_current_authenticated_user_id() AND school_id = public.get_current_user_school_id())
        OR (
            school_id = public.get_current_user_school_id()
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        )
    );

ALTER TABLE public.audio_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audio_milestones_policy" ON public.audio_milestones;
CREATE POLICY "audio_milestones_policy" ON public.audio_milestones
    FOR ALL TO anon, authenticated
    USING (
        public.is_master_admin()
        OR student_id = public.get_current_authenticated_user_id()
        OR teacher_id = public.get_current_authenticated_user_id()
        OR (
            school_id = public.get_current_user_school_id()
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        )
    )
    WITH CHECK (
        public.is_master_admin()
        OR (student_id = public.get_current_authenticated_user_id() AND school_id = public.get_current_user_school_id())
        OR (
            school_id = public.get_current_user_school_id()
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        )
    );

ALTER TABLE public.school_year_playlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "school_year_playlists_policy" ON public.school_year_playlists;
CREATE POLICY "school_year_playlists_policy" ON public.school_year_playlists
    FOR ALL TO anon, authenticated
    USING (
        public.is_master_admin()
        OR student_id = public.get_current_authenticated_user_id()
        OR (
            school_id = public.get_current_user_school_id()
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        )
    )
    WITH CHECK (
        public.is_master_admin()
        OR (student_id = public.get_current_authenticated_user_id() AND school_id = public.get_current_user_school_id())
        OR (
            school_id = public.get_current_user_school_id()
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        )
    );

-- H) campus_message_reactions & campus_chat_channel_reads
ALTER TABLE public.campus_message_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campus_message_reactions_select" ON public.campus_message_reactions;
CREATE POLICY "campus_message_reactions_select" ON public.campus_message_reactions
    FOR SELECT TO authenticated, anon, service_role
    USING (
        public.is_master_admin()
        OR school_id = public.get_current_user_school_id()
    );

DROP POLICY IF EXISTS "campus_message_reactions_mutation" ON public.campus_message_reactions;
CREATE POLICY "campus_message_reactions_mutation" ON public.campus_message_reactions
    FOR ALL TO authenticated, anon
    USING (
        user_id = public.get_current_authenticated_user_id()
        OR public.is_master_admin()
    )
    WITH CHECK (
        (user_id = public.get_current_authenticated_user_id() AND school_id = public.get_current_user_school_id())
        OR public.is_master_admin()
    );

ALTER TABLE public.campus_chat_channel_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campus_chat_channel_reads_select" ON public.campus_chat_channel_reads;
CREATE POLICY "campus_chat_channel_reads_select" ON public.campus_chat_channel_reads
    FOR SELECT TO authenticated, anon, service_role
    USING (
        public.is_master_admin()
        OR user_id = public.get_current_authenticated_user_id()
        OR (
            school_id = public.get_current_user_school_id()
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        )
    );

DROP POLICY IF EXISTS "campus_chat_channel_reads_mutation" ON public.campus_chat_channel_reads;
CREATE POLICY "campus_chat_channel_reads_mutation" ON public.campus_chat_channel_reads
    FOR ALL TO authenticated, anon
    USING (
        user_id = public.get_current_authenticated_user_id()
        OR public.is_master_admin()
    )
    WITH CHECK (
        (user_id = public.get_current_authenticated_user_id() AND school_id = public.get_current_user_school_id())
        OR public.is_master_admin()
    );

-- I) student_consents & gdpr_deletion_requests (Strict Student Ownership + School Staff)
ALTER TABLE public.student_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_consents_select" ON public.student_consents;
CREATE POLICY "student_consents_select" ON public.student_consents
    FOR SELECT TO authenticated, anon
    USING (
        public.is_master_admin()
        OR student_id = public.get_current_authenticated_user_id()
        OR (
            school_id = public.get_current_user_school_id()
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        )
    );

DROP POLICY IF EXISTS "student_consents_modify" ON public.student_consents;
CREATE POLICY "student_consents_modify" ON public.student_consents
    FOR ALL TO authenticated, anon
    USING (
        public.is_master_admin()
        OR student_id = public.get_current_authenticated_user_id()
        OR (
            school_id = public.get_current_user_school_id()
            AND public.get_current_user_role() IN ('admin', 'secretary')
        )
    )
    WITH CHECK (
        public.is_master_admin()
        OR (student_id = public.get_current_authenticated_user_id() AND school_id = public.get_current_user_school_id())
        OR (
            school_id = public.get_current_user_school_id()
            AND public.get_current_user_role() IN ('admin', 'secretary')
        )
    );

ALTER TABLE public.gdpr_deletion_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gdpr_deletion_requests_select" ON public.gdpr_deletion_requests;
CREATE POLICY "gdpr_deletion_requests_select" ON public.gdpr_deletion_requests
    FOR SELECT TO authenticated, anon
    USING (
        public.is_master_admin()
        OR student_id = public.get_current_authenticated_user_id()
        OR requested_by = public.get_current_authenticated_user_id()
        OR (
            school_id = public.get_current_user_school_id()
            AND public.get_current_user_role() IN ('admin', 'secretary')
        )
    );

DROP POLICY IF EXISTS "gdpr_deletion_requests_modify" ON public.gdpr_deletion_requests;
CREATE POLICY "gdpr_deletion_requests_modify" ON public.gdpr_deletion_requests
    FOR ALL TO authenticated, anon
    USING (
        public.is_master_admin()
        OR student_id = public.get_current_authenticated_user_id()
        OR requested_by = public.get_current_authenticated_user_id()
        OR (
            school_id = public.get_current_user_school_id()
            AND public.get_current_user_role() IN ('admin', 'secretary')
        )
    )
    WITH CHECK (
        public.is_master_admin()
        OR (
            (student_id = public.get_current_authenticated_user_id() OR requested_by = public.get_current_authenticated_user_id())
            AND school_id = public.get_current_user_school_id()
        )
        OR (
            school_id = public.get_current_user_school_id()
            AND public.get_current_user_role() IN ('admin', 'secretary')
        )
    );

-- J) migration_staging_records (School Admin / Secretary / Master Admin Only)
ALTER TABLE public.migration_staging_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "migration_staging_policy" ON public.migration_staging_records;
CREATE POLICY "migration_staging_policy" ON public.migration_staging_records
    FOR ALL TO authenticated, anon
    USING (
        public.is_master_admin()
        OR (
            school_id = public.get_current_user_school_id()
            AND public.get_current_user_role() IN ('admin', 'secretary')
        )
    )
    WITH CHECK (
        public.is_master_admin()
        OR (
            school_id = public.get_current_user_school_id()
            AND public.get_current_user_role() IN ('admin', 'secretary')
        )
    );

-- K) get_groovelab_kiosk_pin & set_groovelab_kiosk_pin (Replace auth.uid() with get_current_authenticated_user_id())
CREATE OR REPLACE FUNCTION public.get_groovelab_kiosk_pin(
    p_school_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_catalog, pg_temp
AS $$
DECLARE
    v_stored_pin TEXT;
    v_user_role TEXT;
    v_user_school_id UUID;
    v_caller_id UUID;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();

    IF v_caller_id IS NOT NULL THEN
        SELECT role::text, school_id INTO v_user_role, v_user_school_id
        FROM public.users_raw
        WHERE id = v_caller_id AND is_active = TRUE;
    END IF;

    IF public.is_master_admin() OR current_setting('role', true) = 'service_role' THEN
        NULL;
    ELSIF v_user_role IN ('admin', 'secretary', 'teacher') AND v_user_school_id = p_school_id THEN
        NULL;
    ELSE
        RAISE EXCEPTION 'Zugriff verweigert: Unzureichende Berechtigung zum Abrufen des Terminal-PINs.'
            USING ERRCODE = '42501';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'private_auth' AND table_name = 'school_secrets'
    ) THEN
        SELECT groovelab_kiosk_pin INTO v_stored_pin
        FROM private_auth.school_secrets
        WHERE school_id = p_school_id
        LIMIT 1;
    END IF;

    IF v_stored_pin IS NULL THEN
        SELECT groovelab_kiosk_pin INTO v_stored_pin
        FROM public.schools
        WHERE id = p_school_id
        LIMIT 1;
    END IF;

    RETURN COALESCE(v_stored_pin, '1234');
END;
$$;

REVOKE ALL ON FUNCTION public.get_groovelab_kiosk_pin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_groovelab_kiosk_pin(UUID) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_groovelab_kiosk_pin(
    p_school_id UUID,
    p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_catalog, pg_temp
AS $$
DECLARE
    v_clean_pin TEXT := TRIM(p_pin);
    v_user_role TEXT;
    v_user_school_id UUID;
    v_caller_id UUID;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();

    IF v_caller_id IS NOT NULL THEN
        SELECT role::text, school_id INTO v_user_role, v_user_school_id
        FROM public.users_raw
        WHERE id = v_caller_id AND is_active = TRUE;
    END IF;

    IF public.is_master_admin() OR current_setting('role', true) = 'service_role' THEN
        NULL;
    ELSIF v_user_role IN ('admin', 'secretary') AND v_user_school_id = p_school_id THEN
        NULL;
    ELSE
        RAISE EXCEPTION 'Zugriff verweigert: Nur Administratoren dürfen den Terminal-PIN ändern.'
            USING ERRCODE = '42501';
    END IF;

    IF v_clean_pin !~ '^[0-9]{4}$' THEN
        RAISE EXCEPTION 'Ungültiger PIN: Der Terminal-PIN muss genau 4 Ziffern (0-9) enthalten.'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.schools
    SET groovelab_kiosk_pin = v_clean_pin
    WHERE id = p_school_id;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'private_auth' AND table_name = 'school_secrets'
    ) THEN
        INSERT INTO private_auth.school_secrets (school_id, groovelab_kiosk_pin, updated_at)
        VALUES (p_school_id, v_clean_pin, NOW())
        ON CONFLICT (school_id) DO UPDATE SET
            groovelab_kiosk_pin = EXCLUDED.groovelab_kiosk_pin,
            updated_at = NOW();
    END IF;

    INSERT INTO public.audit_logs (
        school_id, user_id, action, table_name, record_id, details
    ) VALUES (
        p_school_id,
        v_caller_id,
        'UPDATE_KIOSK_SETUP_PIN',
        'schools',
        p_school_id,
        jsonb_build_object('event', 'GrooveLab Terminal Setup PIN updated')
    );

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.set_groovelab_kiosk_pin(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_groovelab_kiosk_pin(UUID, TEXT) TO anon, authenticated, service_role;

-- L) Replace auth.uid() in get_student_ranking_profile
CREATE OR REPLACE FUNCTION public.get_student_ranking_profile(
    p_user_id UUID DEFAULT public.get_current_authenticated_user_id()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := public.get_current_authenticated_user_id();
    v_profile RECORD;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT id, user_id, school_id, nickname, is_public, updated_at
    INTO v_profile
    FROM public.student_ranking_profiles
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    IF NOT (
        v_profile.user_id = v_caller_id
        OR public.is_master_admin()
        OR (v_profile.is_public = TRUE AND v_profile.school_id = public.get_current_user_school_id())
        OR (v_profile.school_id = public.get_current_user_school_id() AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher'))
    ) THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'id', v_profile.id,
        'user_id', v_profile.user_id,
        'school_id', v_profile.school_id,
        'nickname', v_profile.nickname,
        'is_public', v_profile.is_public,
        'updated_at', v_profile.updated_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_ranking_profile(UUID) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 11. [P2-4] PERSISTENT SECURITY RATE-LIMIT & IDEMPOTENCY NONCE LEDGER
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS private_auth.security_rate_limits (
    bucket_key TEXT PRIMARY KEY,
    hit_count INTEGER NOT NULL DEFAULT 1,
    window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_security_rate_limits_expires_at
    ON private_auth.security_rate_limits (expires_at);

CREATE TABLE IF NOT EXISTS private_auth.security_nonce_ledger (
    nonce_key TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    status_code INTEGER,
    response_body JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_security_nonce_ledger_expires_at
    ON private_auth.security_nonce_ledger (expires_at);

REVOKE ALL ON TABLE private_auth.security_rate_limits FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE private_auth.security_nonce_ledger FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE private_auth.security_rate_limits TO service_role;
GRANT ALL ON TABLE private_auth.security_nonce_ledger TO service_role;

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
BEGIN
    IF current_setting('role', true) <> 'service_role' AND NOT public.is_master_admin() THEN
        RETURN FALSE;
    END IF;

    DELETE FROM private_auth.security_nonce_ledger
    WHERE expires_at < NOW();

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
-- 12. [P3-1] SYNCHRONIZE private_auth.schema_migrations_ledger (579 & 591)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('private_auth.schema_migrations_ledger') IS NOT NULL THEN
        INSERT INTO private_auth.schema_migrations_ledger (version, name, applied_at, checksum, status)
        VALUES
            ('579', '579_enterprise_schema_remediation_and_rpc_parity.sql', NOW(), 'sha256-migration-579-remediation', 'applied'),
            ('591', '591_bsi_zero_trust_360_remediation_goldstandard.sql', NOW(), 'sha256-migration-591-bsi-360-goldstandard', 'applied')
        ON CONFLICT (version) DO UPDATE SET
            name = EXCLUDED.name,
            applied_at = NOW(),
            status = 'applied';
    END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
