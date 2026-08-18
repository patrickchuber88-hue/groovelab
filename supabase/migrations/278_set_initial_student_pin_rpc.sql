-- Migration 278: Atomic Student Onboarding PIN Registration & Verification RPC
-- Purpose: Provides atomic, security-definer RPCs to persistently register and verify 4-digit PINs during QR onboarding without relying on client-side RLS mutations.

-- 1. Atomic function to set initial PIN during onboarding
CREATE OR REPLACE FUNCTION public.set_initial_student_pin(
    p_student_id UUID,
    p_qr_token TEXT,
    p_pin TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user RECORD;
    v_hashed_pin TEXT;
    v_clean_token TEXT;
BEGIN
    IF p_student_id IS NULL OR p_pin IS NULL OR length(trim(p_pin)) <> 4 THEN
        RAISE EXCEPTION 'Ungültige PIN oder Schüler-ID.';
    END IF;

    v_clean_token := trim(COALESCE(p_qr_token, ''));

    -- Find student and verify token coupling
    SELECT id, school_id, birth_date, is_campus_active, is_groovelab_active 
    INTO v_user
    FROM public.users_raw
    WHERE id = p_student_id
      AND (
          v_clean_token = ''
          OR qr_token = v_clean_token
          OR teacher_qr_token = v_clean_token
          OR upper(ausweis_nummer) = upper(v_clean_token)
          OR id::text = v_clean_token
      );

    IF v_user.id IS NULL THEN
        -- Fallback check: Allow if caller is master admin or teacher/admin of the school
        IF NOT (public.is_master_admin() OR public.is_teacher_or_admin()) THEN
            RAISE EXCEPTION 'Berechtigung verweigert: Ungültiger QR-Token für dieses Schülerprofil.';
        END IF;
        
        SELECT id, school_id, birth_date, is_campus_active, is_groovelab_active 
        INTO v_user
        FROM public.users_raw
        WHERE id = p_student_id;
    END IF;

    IF v_user.id IS NULL THEN
        RAISE EXCEPTION 'Schülerprofil nicht gefunden.';
    END IF;

    -- Hash PIN with SHA-256 for secure parent verification
    v_hashed_pin := encode(extensions.digest(trim(p_pin), 'sha256'), 'hex');

    -- 1. Update users_raw
    UPDATE public.users_raw SET
        parent_pin = v_hashed_pin,
        personal_pin = trim(p_pin),
        onboarding_pin = trim(p_pin),
        is_pin_activated = TRUE,
        status = 'aktiv'
    WHERE id = p_student_id;

    -- 2. Update students table if exists
    BEGIN
        UPDATE public.students SET
            parent_pin = v_hashed_pin,
            personal_pin = trim(p_pin),
            onboarding_pin = trim(p_pin),
            is_pin_activated = TRUE,
            status = 'aktiv'
        WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 3. Update pending_students table if exists
    BEGIN
        UPDATE public.pending_students SET
            parent_pin = v_hashed_pin,
            personal_pin = trim(p_pin),
            onboarding_pin = trim(p_pin),
            is_pin_activated = TRUE,
            status = 'aktiv'
        WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 4. Ensure activation_days record exists for billing and presence display
    BEGIN
        INSERT INTO public.activation_days (student_id, day_of_birth)
        VALUES (p_student_id, COALESCE(EXTRACT(DAY FROM v_user.birth_date)::integer, 1))
        ON CONFLICT (student_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

-- 2. Universal verification function for student/parent PIN
CREATE OR REPLACE FUNCTION public.verify_student_pin(
    p_student_id UUID,
    p_pin TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_parent_hash TEXT;
    v_personal_pin TEXT;
    v_onboarding_pin TEXT;
    v_input_hash TEXT;
    v_clean_pin TEXT;
BEGIN
    IF p_student_id IS NULL OR p_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    v_clean_pin := trim(p_pin);
    v_input_hash := encode(extensions.digest(v_clean_pin, 'sha256'), 'hex');

    SELECT parent_pin, personal_pin, onboarding_pin 
    INTO v_parent_hash, v_personal_pin, v_onboarding_pin
    FROM public.users_raw
    WHERE id = p_student_id;

    IF v_parent_hash IS NOT NULL AND v_parent_hash = v_input_hash THEN
        RETURN TRUE;
    END IF;

    IF v_personal_pin IS NOT NULL AND trim(v_personal_pin) = v_clean_pin THEN
        RETURN TRUE;
    END IF;

    IF v_onboarding_pin IS NOT NULL AND trim(v_onboarding_pin) = v_clean_pin THEN
        RETURN TRUE;
    END IF;

    -- Fallback for unconfigured PIN
    IF (v_parent_hash IS NULL OR v_parent_hash = '' OR v_parent_hash = encode(extensions.digest('0000', 'sha256'), 'hex')) 
       AND v_clean_pin = '0000' THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.set_initial_student_pin(UUID, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_student_pin(UUID, TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
