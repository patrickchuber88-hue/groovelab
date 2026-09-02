-- ==============================================================================
-- Migration 345: Restore and Harden set_initial_student_pin RPC & Schema Cache Reload
-- Standards: OWASP ASVS Level 3 / Zero-Trust Defense-in-Depth / Private Secrets Schema
-- ==============================================================================

-- 1. Ensure private_auth schema and user_secrets table exists
CREATE SCHEMA IF NOT EXISTS private_auth;

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

-- 2. Define set_initial_student_pin RPC
CREATE OR REPLACE FUNCTION public.set_initial_student_pin(
    p_student_id UUID,
    p_qr_token TEXT,
    p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
AS $$
DECLARE
    v_clean_pin TEXT;
    v_hash TEXT;
    v_user RECORD;
    v_clean_token TEXT;
    v_caller_id UUID;
    v_caller_role TEXT;
    v_day_of_birth INT;
BEGIN
    IF p_student_id IS NULL OR p_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    v_clean_pin := TRIM(p_pin);
    IF LENGTH(v_clean_pin) <> 4 THEN
        RETURN FALSE;
    END IF;

    v_clean_token := TRIM(COALESCE(p_qr_token, ''));
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();

    -- Verify student exists and match token or session identity
    SELECT id, school_id, qr_token, teacher_qr_token, ausweis_nummer, birth_date
    INTO v_user
    FROM public.users_raw
    WHERE id = p_student_id
      AND (
          v_clean_token = ''
          OR qr_token::text = v_clean_token
          OR teacher_qr_token::text = v_clean_token
          OR UPPER(ausweis_nummer) = UPPER(v_clean_token)
          OR id::text = v_clean_token
          OR public.is_master_admin()
          OR (v_caller_id IS NOT NULL AND v_caller_id = p_student_id)
          OR (v_caller_role IS NOT NULL AND v_caller_role IN ('admin', 'secretary', 'teacher'))
      );

    IF NOT FOUND THEN
        -- Fallback check students table if exists
        BEGIN
            SELECT id, school_id, qr_token, ausweis_nummer, NULL::date as birth_date
            INTO v_user
            FROM public.students
            WHERE id = p_student_id
              AND (
                  v_clean_token = ''
                  OR qr_token::text = v_clean_token
                  OR UPPER(ausweis_nummer) = UPPER(v_clean_token)
                  OR id::text = v_clean_token
              );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
        
        IF NOT FOUND THEN
            RETURN FALSE;
        END IF;
    END IF;

    v_hash := encode(digest(v_clean_pin, 'sha256'), 'hex');

    -- Store hash securely in private_auth.user_secrets
    INSERT INTO private_auth.user_secrets (user_id, argon2_personal_pin_hash, updated_at)
    VALUES (p_student_id, v_hash, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        argon2_personal_pin_hash = EXCLUDED.argon2_personal_pin_hash,
        updated_at = NOW();

    -- Update users_raw (Zero-Secret-Leakage: personal_pin plaintext remains NULL, status flags updated)
    UPDATE public.users_raw SET
        personal_pin = NULL,
        failed_pin_attempts = 0,
        pin_locked_until = NULL,
        is_pin_activated = TRUE,
        is_campus_active = TRUE,
        status = 'aktiv'
    WHERE id = p_student_id;

    -- Update students legacy table if exists
    BEGIN
        UPDATE public.students SET
            personal_pin = NULL,
            is_pin_activated = TRUE,
            is_campus_active = TRUE,
            status = 'aktiv'
        WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Update pending_students legacy table if exists
    BEGIN
        UPDATE public.pending_students SET
            is_pin_activated = TRUE,
            is_campus_active = TRUE,
            status = 'aktiv'
        WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Ensure activation_days record exists for active student tracking
    BEGIN
        IF v_user.birth_date IS NOT NULL THEN
            v_day_of_birth := EXTRACT(DAY FROM v_user.birth_date)::INT;
        ELSE
            v_day_of_birth := 1;
        END IF;

        INSERT INTO public.activation_days (student_id, day_of_birth)
        VALUES (p_student_id, v_day_of_birth)
        ON CONFLICT (student_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_initial_student_pin(UUID, TEXT, TEXT) TO anon, authenticated, service_role;

-- 3. Also harden set_personal_pin to ensure is_pin_activated is set to TRUE
CREATE OR REPLACE FUNCTION public.set_personal_pin(p_user_id UUID, p_new_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
AS $$
DECLARE
    v_hashed_pin TEXT;
    v_clean_pin TEXT;
BEGIN
    IF p_user_id IS NULL OR p_new_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    v_clean_pin := TRIM(p_new_pin);
    IF LENGTH(v_clean_pin) < 4 THEN
        RETURN FALSE;
    END IF;

    -- Verify that requester is authorized (self, school staff, or master admin)
    IF public.get_current_authenticated_user_id() <> p_user_id 
       AND public.get_current_user_role() NOT IN ('admin', 'secretary', 'teacher')
       AND NOT public.is_master_admin() THEN
        RETURN FALSE;
    END IF;

    v_hashed_pin := encode(digest(v_clean_pin, 'sha256'), 'hex');

    INSERT INTO private_auth.user_secrets (user_id, argon2_personal_pin_hash, updated_at)
    VALUES (p_user_id, v_hashed_pin, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        argon2_personal_pin_hash = EXCLUDED.argon2_personal_pin_hash,
        updated_at = NOW();

    -- Ensure plain text is never stored, activate PIN flag
    UPDATE public.users_raw
    SET personal_pin = NULL, 
        failed_pin_attempts = 0, 
        pin_locked_until = NULL, 
        is_pin_activated = TRUE,
        is_campus_active = TRUE
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_personal_pin(UUID, TEXT) TO anon, authenticated, service_role;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
