-- Migration 295: Blind Indexing, FIDO2 Signature Counter & Enterprise PIN Hardening
-- Implements:
-- 1. phone_blind_index column on public.users_raw with deterministic lookup index
-- 2. fido2_sign_counter tracking on users_raw and session_leases to prevent credential cloning
-- 3. verify_fido2_counter RPC for hardware replay protection

-- 1. Add phone_blind_index to users_raw
ALTER TABLE public.users_raw ADD COLUMN IF NOT EXISTS phone_blind_index TEXT;
CREATE INDEX IF NOT EXISTS idx_users_raw_phone_blind_index ON public.users_raw(phone_blind_index);

-- 2. Add FIDO2 Signature Counter to users_raw and session_leases
ALTER TABLE public.users_raw ADD COLUMN IF NOT EXISTS fido2_sign_counter INT DEFAULT 0;
ALTER TABLE public.session_leases ADD COLUMN IF NOT EXISTS fido2_sign_counter INT DEFAULT 0;

-- 3. RPC: Verify FIDO2 Signature Counter (Detects Cloned Authenticator Chips)
CREATE OR REPLACE FUNCTION public.verify_fido2_counter(
    p_user_id UUID,
    p_device_key TEXT,
    p_new_counter INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_stored_counter INT;
    v_lease_id UUID;
BEGIN
    SELECT fido2_sign_counter, id INTO v_stored_counter, v_lease_id
    FROM public.session_leases
    WHERE user_id = p_user_id AND device_key = p_device_key
    LIMIT 1;

    -- If counter is provided and not strictly incrementing -> Potential cloned device attack!
    IF v_stored_counter IS NOT NULL AND p_new_counter > 0 AND p_new_counter <= v_stored_counter THEN
        -- Revoke the compromised session lease immediately!
        UPDATE public.session_leases
        SET is_revoked = TRUE,
            revoked_at = NOW()
        WHERE id = v_lease_id;

        RETURN jsonb_build_object(
            'valid', false,
            'cloned_device_detected', true,
            'message', 'Sicherheitswarnung: Verdacht auf geklonten Authenticator. Sitzung wurde gesperrt.'
        );
    END IF;

    -- Update to the latest counter value
    IF v_lease_id IS NOT NULL THEN
        UPDATE public.session_leases
        SET fido2_sign_counter = p_new_counter,
            last_active_at = NOW()
        WHERE id = v_lease_id;
    END IF;

    UPDATE public.users_raw
    SET fido2_sign_counter = GREATEST(COALESCE(fido2_sign_counter, 0), p_new_counter)
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'valid', true,
        'cloned_device_detected', false,
        'counter', p_new_counter
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_fido2_counter(UUID, TEXT, INT) TO anon, authenticated, service_role;
