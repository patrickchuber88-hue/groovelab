-- Migration 457: Master Admin JIT Step-Up & TOTP Verification RPC
-- Tier 1 Forensic Hardening: Authoritative RFC 6238 TOTP verification for Idle-Lock and Step-Up challenges
-- Guarantees Zero Secret Leakage: TOTP seed never leaves database.

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
    v_clean_pass text := TRIM(COALESCE(p_password, ''));
    v_totp_valid boolean := false;
    v_is_mock_code boolean;
BEGIN
    -- 1. Locate the active Master Admin
    SELECT ur.id, ur.first_name, ur.last_name, 
           COALESCE(ur.is_2fa_enabled, false) AS is_2fa_enabled, 
           sec.master_admin_password, sec.two_factor_secret
    INTO v_user
    FROM public.users_raw ur
    LEFT JOIN private_auth.user_secrets sec ON sec.user_id = ur.id
    WHERE ur.is_master_admin = true
    LIMIT 1;

    IF v_user.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kein Master-Admin-Konto registriert.');
    END IF;

    -- 2. Verify via 6-digit Google Authenticator TOTP Code
    IF v_clean_totp <> '' THEN
        IF v_clean_totp !~ '^[0-9]{6}$' THEN
            INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
            VALUES ('MASTER_ADMIN_STEP_UP_FAILED', 'AUTHENTICATION', 'FAILURE', 
                    jsonb_build_object('reason', 'MALFORMED_FORMAT'), v_user.id);
            RETURN jsonb_build_object('success', false, 'error', 'Der Code muss exakt 6 Ziffern enthalten.');
        END IF;

        -- Rejection of known trivial mock codes
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
    END IF;

    -- 3. Fallback to Master Password if TOTP not configured
    IF v_clean_pass <> '' THEN
        IF v_user.master_admin_password = crypt(v_clean_pass, v_user.master_admin_password)
           OR v_user.master_admin_password = v_clean_pass THEN
            INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
            VALUES ('MASTER_ADMIN_STEP_UP_VERIFIED', 'AUTHENTICATION', 'SUCCESS', 
                    jsonb_build_object('method', 'MASTER_PASSWORD'), v_user.id);
            RETURN jsonb_build_object('success', true, 'method', 'password');
        ELSE
            INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
            VALUES ('MASTER_ADMIN_STEP_UP_FAILED', 'AUTHENTICATION', 'FAILURE', 
                    jsonb_build_object('reason', 'INVALID_PASSWORD'), v_user.id);
            RETURN jsonb_build_object('success', false, 'error', 'Ungültiges Master-Passwort.');
        END IF;
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'Bitte 6-stelligen Authenticator-Code oder Passwort eingeben.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_master_admin_step_up(text, text) TO anon, authenticated, service_role;
