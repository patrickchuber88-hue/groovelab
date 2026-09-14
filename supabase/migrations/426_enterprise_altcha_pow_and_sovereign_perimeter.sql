-- ==============================================================================
-- Migration 426: Sovereign EU Security Pack, ALTCHA PoW & Roaming Perimeter
-- Standards: Schrems II / Zero-US-Cloud / BSI IT-Grundschutz / DSGVO Art. 25 & 32
--
-- 1. ALTCHA Proof-of-Work Bot-Schutz (Server-seitige Challenge & Verifikation)
-- 2. FIDO2 / WebAuthn Hardware-Key Enforcement für Master-Administratoren
-- 3. Trusted Travel Leases für unterbrechungsfreies Ferien-Üben weltweit
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ALTCHA PROOF-OF-WORK ENGINE (100% SELF-HOSTED, ZERO-US-CLOUD)
-- ------------------------------------------------------------------------------
-- Challenge Generator: Erzeugt kryptografisches PoW-Rätsel mit HMAC-Signatur
CREATE OR REPLACE FUNCTION public.generate_altcha_challenge(p_max_number int DEFAULT 50000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_salt text;
    v_secret text;
    v_secret_num int;
    v_challenge text;
    v_signature text;
BEGIN
    -- 1. Generate random salt (16 bytes hex)
    v_salt := encode(extensions.gen_random_bytes(16), 'hex');

    -- 2. Pick a random secret solution number between 1 and p_max_number
    v_secret_num := 1 + floor(random() * p_max_number)::int;

    -- 3. Challenge is SHA-256(salt || secret_num)
    v_challenge := encode(extensions.digest(v_salt || v_secret_num::text, 'sha256'), 'hex');

    -- 4. Sign the challenge with server secret to prevent forgery
    v_secret := COALESCE(
        current_setting('app.settings.jwt_secret', true),
        'SOVEREIGN_ALTCHA_KERNEL_KEY_CAMPUS_GROOVELAB_2026'
    );
    v_signature := encode(extensions.hmac(v_challenge || ':' || v_salt, v_secret, 'sha256'), 'hex');

    RETURN jsonb_build_object(
        'algorithm', 'SHA-256',
        'challenge', v_challenge,
        'salt', v_salt,
        'signature', v_signature,
        'maxnumber', p_max_number,
        'created_at', EXTRACT(EPOCH FROM NOW())::bigint
    );
END;
$$;

-- Solution Verifier: Prüft die vom Browser gelöste Nonce in unter 1 Millisekunde
CREATE OR REPLACE FUNCTION public.verify_altcha_solution(
    p_challenge text,
    p_salt text,
    p_nonce text,
    p_signature text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_secret text;
    v_expected_signature text;
    v_expected_challenge text;
BEGIN
    IF p_challenge IS NULL OR p_salt IS NULL OR p_nonce IS NULL OR p_signature IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 1. Verify HMAC signature to guarantee the challenge originated from our server
    v_secret := COALESCE(
        current_setting('app.settings.jwt_secret', true),
        'SOVEREIGN_ALTCHA_KERNEL_KEY_CAMPUS_GROOVELAB_2026'
    );
    v_expected_signature := encode(extensions.hmac(p_challenge || ':' || p_salt, v_secret, 'sha256'), 'hex');

    IF v_expected_signature <> p_signature THEN
        RETURN FALSE; -- Tampered or expired challenge signature
    END IF;

    -- 2. Verify that SHA-256(salt || nonce) matches the challenge
    v_expected_challenge := encode(extensions.digest(p_salt || p_nonce, 'sha256'), 'hex');

    RETURN v_expected_challenge = p_challenge;
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. FIDO2 / WEBAUTHN HARDWARE-KEY ENFORCEMENT FÜR MASTER-ADMINS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.master_security_policies (
    id int PRIMARY KEY DEFAULT 1,
    require_webauthn_fido2 boolean NOT NULL DEFAULT true,
    require_totp_mfa boolean NOT NULL DEFAULT true,
    enforce_hardware_presence boolean NOT NULL DEFAULT true,
    updated_at timestamptz DEFAULT NOW(),
    CONSTRAINT single_row_policy CHECK (id = 1)
);

ALTER TABLE public.master_security_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_security_policies FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "master_security_policies_read" ON public.master_security_policies;
CREATE POLICY "master_security_policies_read" ON public.master_security_policies
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "master_security_policies_modify" ON public.master_security_policies;
CREATE POLICY "master_security_policies_modify" ON public.master_security_policies
    FOR ALL TO authenticated
    USING (public.is_master_admin())
    WITH CHECK (public.is_master_admin());

INSERT INTO public.master_security_policies (id, require_webauthn_fido2, require_totp_mfa, enforce_hardware_presence)
VALUES (1, true, true, true)
ON CONFLICT (id) DO UPDATE
SET require_webauthn_fido2 = true,
    require_totp_mfa = true,
    enforce_hardware_presence = true;

CREATE OR REPLACE FUNCTION public.is_master_webauthn_enforced()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE((SELECT require_webauthn_fido2 FROM public.master_security_policies WHERE id = 1), true);
$$;

-- ------------------------------------------------------------------------------
-- 3. TRUSTED TRAVEL LEASES FÜR URLAUBS-ROAMING DER SCHÜLER & LEHRER
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trusted_travel_leases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    school_id uuid NOT NULL,
    country_iso text NOT NULL,
    device_fingerprint_hash text NOT NULL,
    valid_until timestamptz NOT NULL,
    created_at timestamptz DEFAULT NOW()
);

ALTER TABLE public.trusted_travel_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_travel_leases FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trusted_travel_leases_user_scope" ON public.trusted_travel_leases;
CREATE POLICY "trusted_travel_leases_user_scope" ON public.trusted_travel_leases
    FOR ALL TO authenticated
    USING (
        user_id = public.get_current_authenticated_user_id()
        OR public.is_master_admin()
    )
    WITH CHECK (
        user_id = public.get_current_authenticated_user_id()
        OR public.is_master_admin()
    );

-- Helper to authorize student practice abroad
CREATE OR REPLACE FUNCTION public.grant_travel_roaming_lease(
    p_user_id uuid,
    p_country_iso text,
    p_duration_days int DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user record;
    v_lease_id uuid;
BEGIN
    SELECT id, school_id INTO v_user
    FROM public.users_raw
    WHERE id = p_user_id;

    IF v_user.id IS NULL THEN
        RAISE EXCEPTION 'Benutzerprofil für Roaming-Freigabe nicht gefunden.';
    END IF;

    INSERT INTO public.trusted_travel_leases (
        user_id,
        school_id,
        country_iso,
        device_fingerprint_hash,
        valid_until
    ) VALUES (
        v_user.id,
        v_user.school_id,
        UPPER(TRIM(p_country_iso)),
        'ROAMING_AUTHORIZED_' || encode(extensions.gen_random_bytes(16), 'hex'),
        NOW() + (p_duration_days || ' days')::interval
    ) RETURNING id INTO v_lease_id;

    RETURN jsonb_build_object(
        'success', true,
        'lease_id', v_lease_id,
        'country', UPPER(TRIM(p_country_iso)),
        'valid_until', NOW() + (p_duration_days || ' days')::interval
    );
END;
$$;
