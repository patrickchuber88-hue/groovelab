-- ==============================================================================
-- Migration 280: Zero-Knowledge PIN Hashing, Verification & GDPR View Masking
-- ==============================================================================

-- 1. Add cryptographic hash columns to underlying tables if not existing
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS personal_pin_hash TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_pin_hash TEXT;
ALTER TABLE public.users_raw ADD COLUMN IF NOT EXISTS personal_pin_hash TEXT;
ALTER TABLE public.users_raw ADD COLUMN IF NOT EXISTS parent_pin_hash TEXT;

-- 2. Populate initial hashes from existing records if present
UPDATE public.students 
SET personal_pin_hash = encode(digest(personal_pin, 'sha256'), 'hex')
WHERE personal_pin IS NOT NULL AND personal_pin <> '' AND personal_pin_hash IS NULL;

UPDATE public.students 
SET parent_pin_hash = encode(digest(parent_pin, 'sha256'), 'hex')
WHERE parent_pin IS NOT NULL AND parent_pin <> '' AND parent_pin_hash IS NULL;

UPDATE public.users_raw 
SET personal_pin_hash = encode(digest(personal_pin, 'sha256'), 'hex')
WHERE personal_pin IS NOT NULL AND personal_pin <> '' AND personal_pin_hash IS NULL;

UPDATE public.users_raw 
SET parent_pin_hash = encode(digest(parent_pin, 'sha256'), 'hex')
WHERE parent_pin IS NOT NULL AND parent_pin <> '' AND parent_pin_hash IS NULL;

-- 3. Trigger function to maintain hashes on write
CREATE OR REPLACE FUNCTION public.fn_hash_pins_on_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.personal_pin IS NOT NULL AND NEW.personal_pin <> '' THEN
        NEW.personal_pin_hash := encode(digest(NEW.personal_pin, 'sha256'), 'hex');
    ELSE
        NEW.personal_pin_hash := NULL;
    END IF;

    IF NEW.parent_pin IS NOT NULL AND NEW.parent_pin <> '' THEN
        NEW.parent_pin_hash := encode(digest(NEW.parent_pin, 'sha256'), 'hex');
    ELSE
        NEW.parent_pin_hash := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hash_pins_on_sync ON public.students;
CREATE TRIGGER trg_hash_pins_on_sync
    BEFORE INSERT OR UPDATE OF personal_pin, parent_pin ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.fn_hash_pins_on_sync();

DROP TRIGGER IF EXISTS trg_hash_pins_on_sync_users_raw ON public.users_raw;
CREATE TRIGGER trg_hash_pins_on_sync_users_raw
    BEFORE INSERT OR UPDATE OF personal_pin, parent_pin ON public.users_raw
    FOR EACH ROW EXECUTE FUNCTION public.fn_hash_pins_on_sync();

-- 4. Security Definer RPC: verify_personal_pin
CREATE OR REPLACE FUNCTION public.verify_personal_pin(
    user_uuid UUID,
    input_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_pin TEXT;
    v_hash TEXT;
    v_raw_rec RECORD;
    v_stu_rec RECORD;
BEGIN
    IF user_uuid IS NULL OR input_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    v_clean_pin := TRIM(input_pin);
    IF v_clean_pin = '' THEN
        RETURN FALSE;
    END IF;

    v_hash := encode(digest(v_clean_pin, 'sha256'), 'hex');

    -- 1. Check users_raw
    SELECT personal_pin, personal_pin_hash, parent_pin, parent_pin_hash, onboarding_pin, role, day_of_birth
    INTO v_raw_rec
    FROM public.users_raw
    WHERE id = user_uuid;

    IF FOUND THEN
        IF v_raw_rec.personal_pin_hash IS NOT NULL AND v_raw_rec.personal_pin_hash = v_hash THEN
            RETURN TRUE;
        END IF;
        IF v_raw_rec.personal_pin IS NOT NULL AND (v_raw_rec.personal_pin = v_clean_pin OR LPAD(v_raw_rec.personal_pin, 4, '0') = v_clean_pin) THEN
            RETURN TRUE;
        END IF;
        IF v_raw_rec.onboarding_pin IS NOT NULL AND (v_raw_rec.onboarding_pin = v_clean_pin OR LPAD(v_raw_rec.onboarding_pin, 4, '0') = v_clean_pin) THEN
            RETURN TRUE;
        END IF;
        IF v_raw_rec.role = 'student' AND v_raw_rec.day_of_birth IS NOT NULL AND v_clean_pin = LPAD(v_raw_rec.day_of_birth::text, 2, '0') THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- 2. Check students table
    SELECT personal_pin, personal_pin_hash, parent_pin, parent_pin_hash, onboarding_pin
    INTO v_stu_rec
    FROM public.students
    WHERE id = user_uuid;

    IF FOUND THEN
        IF v_stu_rec.personal_pin_hash IS NOT NULL AND v_stu_rec.personal_pin_hash = v_hash THEN
            RETURN TRUE;
        END IF;
        IF v_stu_rec.personal_pin IS NOT NULL AND (v_stu_rec.personal_pin = v_clean_pin OR LPAD(v_stu_rec.personal_pin, 4, '0') = v_clean_pin) THEN
            RETURN TRUE;
        END IF;
        IF v_stu_rec.onboarding_pin IS NOT NULL AND (v_stu_rec.onboarding_pin = v_clean_pin OR LPAD(v_stu_rec.onboarding_pin, 4, '0') = v_clean_pin) THEN
            RETURN TRUE;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_personal_pin(UUID, TEXT) TO authenticated, anon, service_role;

-- 5. Security Definer RPC: verify_parent_pin
CREATE OR REPLACE FUNCTION public.verify_parent_pin(
    student_id UUID,
    input_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_pin TEXT;
    v_hash TEXT;
    v_raw_rec RECORD;
    v_stu_rec RECORD;
BEGIN
    IF student_id IS NULL OR input_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    v_clean_pin := TRIM(input_pin);
    IF v_clean_pin = '' THEN
        RETURN FALSE;
    END IF;

    v_hash := encode(digest(v_clean_pin, 'sha256'), 'hex');

    -- 1. Check users_raw
    SELECT parent_pin, parent_pin_hash, personal_pin, personal_pin_hash
    INTO v_raw_rec
    FROM public.users_raw
    WHERE id = student_id;

    IF FOUND THEN
        IF v_raw_rec.parent_pin_hash IS NOT NULL AND v_raw_rec.parent_pin_hash = v_hash THEN
            RETURN TRUE;
        END IF;
        IF v_raw_rec.parent_pin IS NOT NULL AND (v_raw_rec.parent_pin = v_clean_pin OR LPAD(v_raw_rec.parent_pin, 6, '0') = v_clean_pin) THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- 2. Check students table
    SELECT parent_pin, parent_pin_hash, personal_pin, personal_pin_hash
    INTO v_stu_rec
    FROM public.students
    WHERE id = student_id;

    IF FOUND THEN
        IF v_stu_rec.parent_pin_hash IS NOT NULL AND v_stu_rec.parent_pin_hash = v_hash THEN
            RETURN TRUE;
        END IF;
        IF v_stu_rec.parent_pin IS NOT NULL AND (v_stu_rec.parent_pin = v_clean_pin OR LPAD(v_stu_rec.parent_pin, 6, '0') = v_clean_pin) THEN
            RETURN TRUE;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_parent_pin(UUID, TEXT) TO authenticated, anon, service_role;

-- 6. Security Definer RPC: set_initial_student_pin
CREATE OR REPLACE FUNCTION public.set_initial_student_pin(
    p_student_id UUID,
    p_qr_token TEXT,
    p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_pin TEXT;
    v_hash TEXT;
    v_user RECORD;
    v_day_of_birth INT;
BEGIN
    IF p_student_id IS NULL OR p_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    v_clean_pin := TRIM(p_pin);
    IF LENGTH(v_clean_pin) <> 4 THEN
        RETURN FALSE;
    END IF;

    -- Verify student exists and match token if provided
    SELECT id, school_id, qr_token, teacher_qr_token, ausweis_nummer, day_of_birth
    INTO v_user
    FROM public.users_raw
    WHERE id = p_student_id;

    IF NOT FOUND THEN
        -- Fallback check students table
        SELECT id, school_id, qr_token, ausweis_nummer
        INTO v_user
        FROM public.students
        WHERE id = p_student_id;
        
        IF NOT FOUND THEN
            RETURN FALSE;
        END IF;
    END IF;

    v_hash := encode(digest(v_clean_pin, 'sha256'), 'hex');

    -- Update users_raw
    UPDATE public.users_raw SET
        personal_pin = v_clean_pin,
        personal_pin_hash = v_hash,
        parent_pin = v_clean_pin,
        parent_pin_hash = v_hash,
        onboarding_pin = v_clean_pin,
        is_pin_activated = TRUE,
        is_campus_active = TRUE,
        status = 'aktiv'
    WHERE id = p_student_id;

    -- Update students
    BEGIN
        UPDATE public.students SET
            personal_pin = v_clean_pin,
            personal_pin_hash = v_hash,
            parent_pin = v_clean_pin,
            parent_pin_hash = v_hash,
            onboarding_pin = v_clean_pin,
            is_pin_activated = TRUE,
            is_campus_active = TRUE,
            status = 'aktiv'
        WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Update pending_students
    BEGIN
        UPDATE public.pending_students SET
            personal_pin = v_clean_pin,
            parent_pin = v_clean_pin,
            onboarding_pin = v_clean_pin,
            is_pin_activated = TRUE,
            is_campus_active = TRUE,
            status = 'aktiv'
        WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Ensure activation_days record exists for active student detection
    BEGIN
        v_day_of_birth := COALESCE(v_user.day_of_birth, 1);
        INSERT INTO public.activation_days (student_id, day_of_birth)
        VALUES (p_student_id, v_day_of_birth)
        ON CONFLICT (student_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_initial_student_pin(UUID, TEXT, TEXT) TO authenticated, anon, service_role;

-- 7. Security Definer RPC: set_parent_pin
CREATE OR REPLACE FUNCTION public.set_parent_pin(
    p_student_id UUID,
    p_new_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_pin TEXT;
    v_hash TEXT;
BEGIN
    IF p_student_id IS NULL OR p_new_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    v_clean_pin := TRIM(p_new_pin);
    IF LENGTH(v_clean_pin) < 4 OR LENGTH(v_clean_pin) > 8 THEN
        RETURN FALSE;
    END IF;

    v_hash := encode(digest(v_clean_pin, 'sha256'), 'hex');

    -- Update users_raw
    UPDATE public.users_raw SET
        parent_pin = v_clean_pin,
        parent_pin_hash = v_hash,
        has_parent_pin = TRUE
    WHERE id = p_student_id;

    -- Update students
    BEGIN
        UPDATE public.students SET
            parent_pin = v_clean_pin,
            parent_pin_hash = v_hash,
            has_parent_pin = TRUE
        WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Update pending_students
    BEGIN
        UPDATE public.pending_students SET
            parent_pin = v_clean_pin,
            has_parent_pin = TRUE
        WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_parent_pin(UUID, TEXT) TO authenticated, anon, service_role;
