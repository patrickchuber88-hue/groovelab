-- Migration: Fix import_student RPC overloads to always encrypt first_name with pgp_sym_encrypt

-- 1. Ensure pgcrypto extension exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop existing overloads of import_student to prevent type mismatch / bytea collisions
DROP FUNCTION IF EXISTS public.import_student(TEXT, TEXT, TEXT, TEXT, UUID, UUID, INT);
DROP FUNCTION IF EXISTS public.import_student(TEXT, TEXT, TEXT, TEXT, UUID, UUID);

-- 3. Define primary 7-argument import_student RPC function (with encrypted first_name)
CREATE OR REPLACE FUNCTION public.import_student(
    first_name TEXT,
    last_name TEXT,
    birth_date TEXT,
    instrument TEXT,
    school_id UUID,
    teacher_id UUID,
    lesson_duration INT DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
    new_student_id UUID;
    day_part INT;
BEGIN
    -- Extract birth day (DD)
    BEGIN
        IF birth_date IS NOT NULL AND birth_date <> '' THEN
            day_part := split_part(birth_date, '.', 1)::integer;
            IF day_part < 1 OR day_part > 31 THEN
                day_part := 1;
            END IF;
        ELSE
            day_part := 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        day_part := 1;
    END;

    -- Insert core student record
    INSERT INTO public.students (school_id, teacher_id, instrument, status, lesson_duration)
    VALUES (school_id, teacher_id, instrument, 'ausstehend', COALESCE(lesson_duration, 30))
    RETURNING id INTO new_student_id;

    -- Store encrypted first_name into student_first_names
    INSERT INTO public.student_first_names (student_id, first_name)
    VALUES (new_student_id, extensions.pgp_sym_encrypt(COALESCE(first_name, 'Schüler'), public.get_encryption_key()));

    -- Store last_name into student_last_names
    INSERT INTO public.student_last_names (student_id, last_name)
    VALUES (new_student_id, COALESCE(last_name, ''));

    -- Store activation day of birth
    INSERT INTO public.activation_days (student_id, day_of_birth)
    VALUES (new_student_id, day_part);

    RETURN new_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Define 6-argument overload for backwards compatibility calling the 7-argument function
CREATE OR REPLACE FUNCTION public.import_student(
    first_name TEXT,
    last_name TEXT,
    birth_date TEXT,
    instrument TEXT,
    school_id UUID,
    teacher_id UUID
)
RETURNS UUID AS $$
BEGIN
    RETURN public.import_student(
        first_name,
        last_name,
        birth_date,
        instrument,
        school_id,
        teacher_id,
        30
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Harden search_path and permissions
ALTER FUNCTION public.import_student(TEXT, TEXT, TEXT, TEXT, UUID, UUID, INT) SET search_path = public, pg_catalog, extensions;
ALTER FUNCTION public.import_student(TEXT, TEXT, TEXT, TEXT, UUID, UUID) SET search_path = public, pg_catalog, extensions;

GRANT EXECUTE ON FUNCTION public.import_student(TEXT, TEXT, TEXT, TEXT, UUID, UUID, INT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.import_student(TEXT, TEXT, TEXT, TEXT, UUID, UUID) TO authenticated, anon, service_role;
