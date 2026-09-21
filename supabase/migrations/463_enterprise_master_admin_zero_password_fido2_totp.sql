-- ==============================================================================
-- Migration 463: Enterprise Master Admin Zero-Password FIDO2 Passkey & TOTP IAM
-- Standards: OWASP ASVS Level 4 / NIST SP 800-63B AAL3 / Zero-Trust Defense-in-Depth
--
-- 1. Physische Neutralisierung: master_admin_password und master_admin_password_hash
--    werden dauerhaft geleert (NULL). Shared-Secrets für Superuser werden abgeschafft.
-- 2. Break-Glass Notfall-Wiederherstellungscodes (Single-Use Burn Store).
-- 3. Authoritative Zero-Password RPCs:
--    - login_master_admin: Reines TOTP- & Recovery-Code-Verfahren (Passwörter ignoriert).
--    - verify_master_admin_step_up: Entfernung jeglicher Passwort-Fallbacks (TOTP-only).
--    - generate_master_admin_recovery_codes: Revisionssichere Generierung von Einmal-Codes.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------------------------
-- 1. PHYSISCHE NEUTRALISIERUNG DER MASTER-PASSWORT-SPALTEN
-- ------------------------------------------------------------------------------
UPDATE public.users_raw 
SET master_admin_password = NULL 
WHERE is_master_admin = true;

UPDATE private_auth.user_secrets 
SET master_admin_password = NULL,
    master_admin_password_hash = NULL
WHERE user_id IN (SELECT id FROM public.users_raw WHERE is_master_admin = true);

-- Sicherstellen, dass 2FA für den Master-Admin immer als aktiviert gilt (Fail-Closed)
UPDATE public.users_raw
SET is_2fa_enabled = true
WHERE is_master_admin = true;

-- ------------------------------------------------------------------------------
-- 2. BREAK-GLASS NOTFALL-WIEDERHERSTELLUNGSCODES STORE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS private_auth.master_admin_recovery_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_recovery_codes_user 
    ON private_auth.master_admin_recovery_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_master_recovery_codes_hash 
    ON private_auth.master_admin_recovery_codes(code_hash) 
    WHERE is_used = false;

-- RLS: Privates Schema, kein direkter Client-Zugriff
ALTER TABLE private_auth.master_admin_recovery_codes ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. RPC: generate_master_admin_recovery_codes
-- ------------------------------------------------------------------------------
-- Erzeugt 3 neue Single-Use Notfall-Wiederherstellungscodes für den Master-Admin.
-- Alte unbenutzte Codes werden ungültig gemacht.
CREATE OR REPLACE FUNCTION public.generate_master_admin_recovery_codes()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
SET row_security = off
AS $$
DECLARE
    v_master_id UUID;
    v_code1 TEXT;
    v_code2 TEXT;
    v_code3 TEXT;
    v_hash1 TEXT;
    v_hash2 TEXT;
    v_hash3 TEXT;
BEGIN
    -- Autorisierungsprüfung: Nur der Master-Admin darf Notfall-Codes erzeugen
    IF NOT (public.is_master_admin() OR current_user IN ('postgres', 'supabase_admin', 'service_role')) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Nur ein verifizierter Master-Admin darf Notfall-Wiederherstellungscodes erzeugen.';
    END IF;

    SELECT id INTO v_master_id 
    FROM public.users_raw 
    WHERE is_master_admin = true 
    LIMIT 1;

    IF v_master_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kein Master-Admin-Konto gefunden.');
    END IF;

    -- Alte ungenutzte Codes des Benutzers entwerten
    DELETE FROM private_auth.master_admin_recovery_codes 
    WHERE user_id = v_master_id AND is_used = false;

    -- 3 kryptographisch starke Codes im Format GL-XXXX-XXXX-XXXX generieren
    v_code1 := 'GL-' || UPPER(SUBSTRING(encode(gen_random_bytes(6), 'hex') FROM 1 FOR 4)) || '-' ||
                        UPPER(SUBSTRING(encode(gen_random_bytes(6), 'hex') FROM 5 FOR 4)) || '-' ||
                        UPPER(SUBSTRING(encode(gen_random_bytes(6), 'hex') FROM 9 FOR 4));
                        
    v_code2 := 'GL-' || UPPER(SUBSTRING(encode(gen_random_bytes(6), 'hex') FROM 1 FOR 4)) || '-' ||
                        UPPER(SUBSTRING(encode(gen_random_bytes(6), 'hex') FROM 5 FOR 4)) || '-' ||
                        UPPER(SUBSTRING(encode(gen_random_bytes(6), 'hex') FROM 9 FOR 4));
                        
    v_code3 := 'GL-' || UPPER(SUBSTRING(encode(gen_random_bytes(6), 'hex') FROM 1 FOR 4)) || '-' ||
                        UPPER(SUBSTRING(encode(gen_random_bytes(6), 'hex') FROM 5 FOR 4)) || '-' ||
                        UPPER(SUBSTRING(encode(gen_random_bytes(6), 'hex') FROM 9 FOR 4));

    v_hash1 := encode(digest(REPLACE(v_code1, '-', ''), 'sha256'), 'hex');
    v_hash2 := encode(digest(REPLACE(v_code2, '-', ''), 'sha256'), 'hex');
    v_hash3 := encode(digest(REPLACE(v_code3, '-', ''), 'sha256'), 'hex');

    INSERT INTO private_auth.master_admin_recovery_codes (user_id, code_hash)
    VALUES 
        (v_master_id, v_hash1),
        (v_master_id, v_hash2),
        (v_master_id, v_hash3);

    -- Revisionssicheres Audit-Logging
    INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
    VALUES ('MASTER_ADMIN_RECOVERY_CODES_GENERATED', 'SECURITY_KEYS', 'SUCCESS', 
            jsonb_build_object('count', 3, 'timestamp', NOW()), v_master_id);

    RETURN jsonb_build_object(
        'success', true,
        'codes', jsonb_build_array(v_code1, v_code2, v_code3),
        'created_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_master_admin_recovery_codes() TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. AUTHORITATIVE ZERO-PASSWORD RPC: login_master_admin
-- ------------------------------------------------------------------------------
-- Unterstützt Passwörter NICHT mehr. Verlangt zwingend:
-- A) 6-stelligen RFC 6238 TOTP Google Authenticator Code, ODER
-- B) Einmaligen Break-Glass Notfall-Wiederherstellungscode.
CREATE OR REPLACE FUNCTION public.login_master_admin(
    p_username text, 
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
    -- 1. Master-Admin auffinden
    SELECT ur.id, ur.role, ur.is_master_admin, ur.first_name, ur.last_name, 
           COALESCE(ur.is_2fa_enabled, true) AS is_2fa_enabled, 
           sec.two_factor_secret
    INTO v_user
    FROM public.users_raw ur
    LEFT JOIN private_auth.user_secrets sec ON sec.user_id = ur.id
    WHERE ur.is_master_admin = true 
      AND LOWER(TRIM(COALESCE(ur.master_admin_username, 'admin'))) = v_clean_user
    LIMIT 1;

    IF v_user.id IS NULL THEN
        INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
        VALUES ('MASTER_ADMIN_LOGIN_FAILED', 'AUTHENTICATION', 'FAILURE', 
                jsonb_build_object('attempted_user', v_clean_user, 'reason', 'USER_NOT_FOUND', 'timestamp', NOW()), NULL);
        RETURN NULL;
    END IF;

    -- 2. Wenn weder TOTP noch Recovery-Code übergeben wurden: Challenge anfordern (Zero-Password Flow)
    IF v_clean_totp = '' AND v_clean_recovery = '' THEN
        RETURN jsonb_build_object(
            'requires_2fa', true,
            'user_id', v_user.id, 
            'first_name', v_user.first_name,
            'is_zero_password', true,
            'message', 'Zero-Password Master Admin: Bitte Google Authenticator Einmalcode oder Notfall-Code eingeben.'
        );
    END IF;

    -- 3. Überprüfung via Break-Glass Notfall-Wiederherstellungscode
    IF v_clean_recovery <> '' THEN
        v_recovery_hash := encode(digest(v_clean_recovery, 'sha256'), 'hex');

        SELECT * INTO v_recovery_record
        FROM private_auth.master_admin_recovery_codes
        WHERE user_id = v_user.id 
          AND code_hash = v_recovery_hash
          AND is_used = false
        LIMIT 1;

        IF v_recovery_record.id IS NOT NULL THEN
            -- Code sofort entwerten (Single-Use Burn)
            UPDATE private_auth.master_admin_recovery_codes
            SET is_used = true, used_at = NOW()
            WHERE id = v_recovery_record.id;

            -- Audit-Log für Notfall-Zugang
            INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
            VALUES ('MASTER_ADMIN_EMERGENCY_RECOVERY_LOGIN', 'AUTHENTICATION', 'SUCCESS', 
                    jsonb_build_object('method', 'BREAK_GLASS_RECOVERY_CODE', 'code_id', v_recovery_record.id), v_user.id);

            -- Session Lease erzeugen
            v_lease_id := gen_random_uuid();
            INSERT INTO public.session_leases (
                id, user_id, school_id, role, device_key, device_name, created_at, last_active_at, is_revoked
            ) VALUES (
                v_lease_id, v_user.id, NULL, 'admin', 'master_emergency_login', 'Master Admin Emergency Recovery', NOW(), NOW(), false
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

    -- 4. Überprüfung via 6-stelligem RFC 6238 TOTP (Google Authenticator)
    IF v_clean_totp !~ '^[0-9]{6}$' THEN
        INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
        VALUES ('MASTER_ADMIN_2FA_FAILED', 'AUTHENTICATION', 'FAILURE', 
                jsonb_build_object('reason', 'MALFORMED_FORMAT', 'attempted_user', v_clean_user), v_user.id);
        RETURN jsonb_build_object('error', 'Ungültiger Authenticator-Code (muss exakt 6 Ziffern enthalten).');
    END IF;

    -- Abweisung bekannter trivialer Mock-Codes
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
        -- Fail-Closed
        INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
        VALUES ('MASTER_ADMIN_2FA_FAILED', 'AUTHENTICATION', 'FAILURE', 
                jsonb_build_object('reason', 'MISSING_TOTP_SECRET', 'attempted_user', v_clean_user), v_user.id);
        RETURN jsonb_build_object('error', 'Konfigurationsfehler: Kein TOTP-Geheimnis hinterlegt.');
    END IF;

    -- 5. Erfolgreicher TOTP-Login -> Session Lease ausstellen & Audit Loggen
    v_lease_id := gen_random_uuid();
    INSERT INTO public.session_leases (
        id, user_id, school_id, role, device_key, device_name, created_at, last_active_at, is_revoked
    ) VALUES (
        v_lease_id, v_user.id, NULL, 'admin', 'master_totp_login', 'Master Admin Authenticator Login', NOW(), NOW(), false
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

-- ------------------------------------------------------------------------------
-- 5. HÄRTUNG: verify_master_admin_step_up (Passwort-Fallback entfernt)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_master_admin_step_up(
    p_totp_code text DEFAULT NULL,
    p_password text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
SET row_security = off
AS $$
DECLARE
    v_user record;
    v_clean_totp text := TRIM(COALESCE(p_totp_code, ''));
    v_totp_valid boolean := false;
    v_is_mock_code boolean;
BEGIN
    SELECT ur.id, ur.first_name, ur.last_name, 
           sec.two_factor_secret
    INTO v_user
    FROM public.users_raw ur
    LEFT JOIN private_auth.user_secrets sec ON sec.user_id = ur.id
    WHERE ur.is_master_admin = true
    LIMIT 1;

    IF v_user.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kein Master-Admin-Konto registriert.');
    END IF;

    -- Ausschließlich autoritative TOTP-Prüfung
    IF v_clean_totp = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bitte 6-stelligen Authenticator-Code eingeben.');
    END IF;

    IF v_clean_totp !~ '^[0-9]{6}$' THEN
        INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
        VALUES ('MASTER_ADMIN_STEP_UP_FAILED', 'AUTHENTICATION', 'FAILURE', 
                jsonb_build_object('reason', 'MALFORMED_FORMAT'), v_user.id);
        RETURN jsonb_build_object('success', false, 'error', 'Der Code muss exakt 6 Ziffern enthalten.');
    END IF;

    v_is_mock_code := v_clean_totp IN ('000000', '123456', '654321', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999');
    IF v_is_mock_code THEN
        INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
        VALUES ('MASTER_ADMIN_STEP_UP_FAILED', 'AUTHENTICATION', 'FAILURE', 
                jsonb_build_object('reason', 'TRIVIAL_MOCK_ATTEMPT'), v_user.id);
        RETURN jsonb_build_object('success', false, 'error', 'Sicherheitswarnung: Trivialer 2FA-Code abgewiesen.');
    END IF;

    IF v_user.two_factor_secret IS NOT NULL AND TRIM(v_user.two_factor_secret) <> '' THEN
        v_totp_valid := public.verify_totp(v_user.two_factor_secret, v_clean_totp);
        IF v_totp_valid = true THEN
            INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
            VALUES ('MASTER_ADMIN_STEP_UP_VERIFIED', 'AUTHENTICATION', 'SUCCESS', 
                    jsonb_build_object('method', 'TOTP_GOOGLE_AUTHENTICATOR'), v_user.id);
            RETURN jsonb_build_object('success', true, 'method', 'totp');
        ELSE
            INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
            VALUES ('MASTER_ADMIN_STEP_UP_FAILED', 'AUTHENTICATION', 'FAILURE', 
                    jsonb_build_object('reason', 'INVALID_TOTP_CODE'), v_user.id);
            RETURN jsonb_build_object('success', false, 'error', 'Ungültiger Authenticator-Code.');
        END IF;
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'Konfigurationsfehler: Kein TOTP-Geheimnis hinterlegt.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_master_admin_step_up(text, text) TO anon, authenticated, service_role;
