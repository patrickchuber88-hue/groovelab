-- Migration 153: Secure Student and Parent Email Input and Display
-- Adds tables for parent email prefixes and suffixes (with prefix encrypted).
-- Adds RPC functions to safely retrieve and update decrypted emails.

-- 1. Create tables for parent email prefixes and suffixes
CREATE TABLE IF NOT EXISTS public.parent_email_prefixes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    prefix BYTEA NOT NULL
);

CREATE TABLE IF NOT EXISTS public.parent_email_suffixes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    suffix VARCHAR(255) NOT NULL
);

-- 2. Disable Row Level Security (RLS) for parent email tables
ALTER TABLE public.parent_email_prefixes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_email_suffixes DISABLE ROW LEVEL SECURITY;

-- 3. Grant permissions on the new tables
GRANT ALL ON public.parent_email_prefixes TO authenticated, anon, service_role;
GRANT ALL ON public.parent_email_suffixes TO authenticated, anon, service_role;

-- 4. Create function to retrieve decrypted student and parent emails
CREATE OR REPLACE FUNCTION public.get_student_emails(student_id_param UUID)
RETURNS TABLE (
    email TEXT,
    parent_email TEXT
) AS $$
DECLARE
    decrypted_email TEXT;
    decrypted_parent_email TEXT;
BEGIN
    -- Authorization check: user must be authenticated and requesting their own email,
    -- or they must be a teacher, admin, or secretary.
    IF auth.uid() IS NULL THEN
        RETURN;
    END IF;

    IF auth.uid() != student_id_param AND NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'secretary')
    ) THEN
        RAISE EXCEPTION 'Nicht berechtigt.';
    END IF;

    -- Fetch and decrypt student email
    SELECT pgp_sym_decrypt(ep.prefix, public.get_encryption_key()) || '@' || es.suffix
    INTO decrypted_email
    FROM public.email_prefixes ep
    JOIN public.email_suffixes es ON ep.student_id = es.student_id
    WHERE ep.student_id = student_id_param;

    -- Fetch and decrypt parent email
    SELECT pgp_sym_decrypt(pep.prefix, public.get_encryption_key()) || '@' || pes.suffix
    INTO decrypted_parent_email
    FROM public.parent_email_prefixes pep
    JOIN public.parent_email_suffixes pes ON pep.student_id = pes.student_id
    WHERE pep.student_id = student_id_param;

    RETURN QUERY SELECT decrypted_email, decrypted_parent_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to update student and parent emails securely
CREATE OR REPLACE FUNCTION public.update_student_emails(
    student_id_param UUID,
    input_student_email TEXT,
    input_parent_email TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    email_parts TEXT[];
    email_prefix TEXT;
    email_suffix TEXT;
BEGIN
    -- Authorization check: user must be authenticated and updating their own email,
    -- or they must be a teacher, admin, or secretary.
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Nicht authentifiziert.';
    END IF;

    IF auth.uid() != student_id_param AND NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'secretary')
    ) THEN
        RAISE EXCEPTION 'Nicht berechtigt.';
    END IF;

    -- Update student email if provided (or delete if empty)
    IF input_student_email IS NULL OR trim(input_student_email) = '' THEN
        DELETE FROM public.email_prefixes WHERE student_id = student_id_param;
        DELETE FROM public.email_suffixes WHERE student_id = student_id_param;
    ELSE
        -- Split email
        email_parts := regexp_split_to_array(input_student_email, '@');
        IF array_length(email_parts, 1) != 2 THEN
            RAISE EXCEPTION 'Ungültiges E-Mail-Format für Schüler.';
        END IF;
        email_prefix := email_parts[1];
        email_suffix := email_parts[2];

        -- Delete existing to avoid duplicates
        DELETE FROM public.email_prefixes WHERE student_id = student_id_param;
        DELETE FROM public.email_suffixes WHERE student_id = student_id_param;

        -- Insert prefix and suffix
        INSERT INTO public.email_prefixes (student_id, prefix)
        VALUES (student_id_param, pgp_sym_encrypt(email_prefix, public.get_encryption_key()));

        INSERT INTO public.email_suffixes (student_id, suffix)
        VALUES (student_id_param, email_suffix);
    END IF;

    -- Update parent email if provided (or delete if empty)
    IF input_parent_email IS NULL OR trim(input_parent_email) = '' THEN
        DELETE FROM public.parent_email_prefixes WHERE student_id = student_id_param;
        DELETE FROM public.parent_email_suffixes WHERE student_id = student_id_param;
    ELSE
        -- Split email
        email_parts := regexp_split_to_array(input_parent_email, '@');
        IF array_length(email_parts, 1) != 2 THEN
            RAISE EXCEPTION 'Ungültiges E-Mail-Format für Eltern.';
        END IF;
        email_prefix := email_parts[1];
        email_suffix := email_parts[2];

        -- Delete existing to avoid duplicates
        DELETE FROM public.parent_email_prefixes WHERE student_id = student_id_param;
        DELETE FROM public.parent_email_suffixes WHERE student_id = student_id_param;

        -- Insert prefix and suffix
        INSERT INTO public.parent_email_prefixes (student_id, prefix)
        VALUES (student_id_param, pgp_sym_encrypt(email_prefix, public.get_encryption_key()));

        INSERT INTO public.parent_email_suffixes (student_id, suffix)
        VALUES (student_id_param, email_suffix);
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
