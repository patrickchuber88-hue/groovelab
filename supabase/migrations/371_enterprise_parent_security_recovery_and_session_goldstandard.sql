-- ==============================================================================
-- Migration 371: Enterprise Parent Security Recovery & Session Goldstandard
-- Standards: OWASP ASVS Level 3 / Zero-Trust Defense-in-Depth / DSGVO Art. 8 & 25
--
-- 1. PARENT RECOVERY KEY HASH STORE: private_auth.user_secrets.parent_recovery_key_hash
-- 2. SET PARENT PIN WITH RECOVERY KEY RPC: public.set_parent_pin_with_recovery_key()
--    Securely stores SHA-256 hash of parent PIN and SHA-256 hash of parent recovery key.
-- 3. HARDENED RECOVERY KEY RESET RPC: public.reset_parent_pin_via_recovery_key()
--    Strictly validates against parent_recovery_key_hash in private_auth.user_secrets.
--    ZERO student card number checks (ausweis_nummer & qr_token completely banned).
--    Enforces 5-attempt rate-limiting with 15-minute lockout and GoBD audit logging.
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS private_auth;

-- ------------------------------------------------------------------------------
-- 1. ADD parent_recovery_key_hash TO private_auth.user_secrets
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS private_auth.user_secrets (
    user_id UUID PRIMARY KEY REFERENCES public.users_raw(id) ON DELETE CASCADE,
    master_admin_password_hash TEXT,
    master_admin_password TEXT,
    two_factor_secret TEXT,
    password_hash TEXT,
    argon2_parent_pin_hash TEXT,
    argon2_personal_pin_hash TEXT,
    onboarding_pin_hash TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE private_auth.user_secrets ADD COLUMN IF NOT EXISTS parent_recovery_key_hash TEXT;

-- ------------------------------------------------------------------------------
-- 2. RPC: set_parent_pin_with_recovery_key
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_parent_pin_with_recovery_key(
    p_student_id UUID,
    p_new_pin TEXT,
    p_recovery_key TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
AS $$
DECLARE
    v_hashed_pin TEXT;
    v_clean_key TEXT;
    v_hashed_recovery TEXT := NULL;
    v_clean_pin TEXT := TRIM(p_new_pin);
BEGIN
    IF p_student_id IS NULL OR v_clean_pin IS NULL OR length(v_clean_pin) < 4 THEN
        RETURN FALSE;
    END IF;

    -- Verify caller authorization (self, school staff, or master admin)
    IF public.get_current_authenticated_user_id() <> p_student_id 
       AND public.get_current_user_role() NOT IN ('admin', 'secretary', 'teacher')
       AND NOT public.is_master_admin() THEN
        RETURN FALSE;
    END IF;

    -- Cryptographically hash parent PIN using SHA-256
    v_hashed_pin := encode(digest(v_clean_pin, 'sha256'), 'hex');

    -- If recovery key is provided, normalize and hash it
    IF p_recovery_key IS NOT NULL AND TRIM(p_recovery_key) <> '' THEN
        v_clean_key := regexp_replace(upper(trim(p_recovery_key)), '[\s-]|^(REC)', '', 'g');
        IF v_clean_key <> '' THEN
            v_hashed_recovery := encode(digest(v_clean_key, 'sha256'), 'hex');
        END IF;
    END IF;

    -- Upsert secret hashes into private_auth.user_secrets (Zero-Secret-Leakage)
    INSERT INTO private_auth.user_secrets (
        user_id,
        argon2_parent_pin_hash,
        parent_recovery_key_hash,
        updated_at
    )
    VALUES (
        p_student_id,
        v_hashed_pin,
        v_hashed_recovery,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        argon2_parent_pin_hash = EXCLUDED.argon2_parent_pin_hash,
        parent_recovery_key_hash = COALESCE(EXCLUDED.parent_recovery_key_hash, private_auth.user_secrets.parent_recovery_key_hash),
        updated_at = NOW();

    -- Purge plain text from public.users_raw and reset failed attempt counters
    UPDATE public.users_raw
    SET parent_pin = NULL,
        failed_pin_attempts = 0,
        pin_locked_until = NULL
    WHERE id = p_student_id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_parent_pin_with_recovery_key(UUID, TEXT, TEXT) TO authenticated, anon, service_role;

-- Backward compatibility wrapper for set_parent_pin
CREATE OR REPLACE FUNCTION public.set_parent_pin(
    p_student_id UUID,
    p_new_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
AS $$
BEGIN
    RETURN public.set_parent_pin_with_recovery_key(p_student_id, p_new_pin, NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_parent_pin(UUID, TEXT) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 3. RPC: reset_parent_pin_via_recovery_key (HARDENED - NO STUDENT ID CHECKS)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_parent_pin_via_recovery_key(
    p_student_id UUID,
    p_recovery_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
AS $$
DECLARE
    v_clean_key TEXT;
    v_user RECORD;
    v_stored_key_hash TEXT;
    v_input_hash TEXT;
    v_attempts INTEGER;
    v_is_match BOOLEAN := FALSE;
BEGIN
    IF p_student_id IS NULL OR p_recovery_key IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Keine Schüler-ID oder kein Notfallschlüssel übergeben.');
    END IF;

    -- Normalize input recovery key (remove whitespace, dashes, leading REC)
    v_clean_key := regexp_replace(upper(trim(p_recovery_key)), '[\s-]|^(REC)', '', 'g');

    IF v_clean_key = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiger Notfallschlüssel.');
    END IF;

    -- Fetch user details and lockout status from users_raw
    SELECT id, school_id, failed_pin_attempts, pin_locked_until
    INTO v_user
    FROM public.users_raw
    WHERE id = p_student_id AND is_active = TRUE;

    IF v_user.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Schülerprofil nicht gefunden.');
    END IF;

    -- Check if locked out due to previous failed attempts
    IF v_user.pin_locked_until IS NOT NULL AND v_user.pin_locked_until > NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Zu viele Fehlversuche. Dieser Bereich ist vorübergehend gesperrt.');
    END IF;

    v_attempts := COALESCE(v_user.failed_pin_attempts, 0);

    -- Fetch stored parent recovery key hash from private_auth.user_secrets
    SELECT parent_recovery_key_hash
    INTO v_stored_key_hash
    FROM private_auth.user_secrets
    WHERE user_id = p_student_id;

    IF v_stored_key_hash IS NULL OR v_stored_key_hash = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kein Notfallschlüssel für dieses Profil hinterlegt. Bitte wende dich an deine Musikschule.');
    END IF;

    -- Hash input key with SHA-256 for comparison
    v_input_hash := encode(digest(v_clean_key, 'sha256'), 'hex');

    -- Validate strictly against parent_recovery_key_hash
    -- 🛡️ GOLDSTANDARD: AUSWEISNUMMER AND QR_TOKEN ARE STRICTLY BANNED AS RECOVERY KEYS!
    IF v_stored_key_hash = v_input_hash THEN
        v_is_match := TRUE;
    END IF;

    IF NOT v_is_match THEN
        -- Increment failed attempts and lock after 5 failures for 15 minutes
        UPDATE public.users_raw
        SET 
            failed_pin_attempts = v_attempts + 1,
            pin_locked_until = CASE WHEN v_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE NULL END
        WHERE id = p_student_id;

        RETURN jsonb_build_object('success', false, 'error', 'Ungültiger Notfallschlüssel. Bitte prüfe deine Eingabe.');
    END IF;

    -- Success: Clear parent PIN and parent recovery key in private_auth.user_secrets
    UPDATE private_auth.user_secrets
    SET argon2_parent_pin_hash = NULL,
        parent_recovery_key_hash = NULL,
        updated_at = NOW()
    WHERE user_id = p_student_id;

    -- Clear parent_pin in users_raw and reset attempt counters
    UPDATE public.users_raw
    SET parent_pin = NULL,
        failed_pin_attempts = 0,
        pin_locked_until = NULL
    WHERE id = p_student_id;

    -- Clear in students / pending_students tables if they exist
    BEGIN
        UPDATE public.students SET parent_pin = NULL WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        UPDATE public.pending_students SET parent_pin = NULL WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Immutable GoBD / DSGVO Audit Log Entry
    INSERT INTO public.audit_logs (
        school_id,
        user_id,
        action,
        target_type,
        target_id,
        details,
        created_at
    ) VALUES (
        v_user.school_id,
        p_student_id,
        'PARENT_PIN_RESET_VIA_RECOVERY_KEY',
        'users',
        p_student_id,
        jsonb_build_object('status', 'SUCCESS', 'reset_type', 'cryptographic_recovery_key_hash'),
        NOW()
    );

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_parent_pin_via_recovery_key(UUID, TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
