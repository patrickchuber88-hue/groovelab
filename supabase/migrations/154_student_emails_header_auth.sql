-- Migration 154: Support custom x-user-id header in student email functions
-- Allows QR code/PIN authenticated users to retrieve and update their emails safely.
-- Sets explicit search_path for security definer functions to resolve extensions.

-- 1. Helper function to extract user ID from auth.uid() or request.headers
CREATE OR REPLACE FUNCTION public.get_auth_user_id_or_header()
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_headers TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NOT NULL THEN
        RETURN v_user_id;
    END IF;

    v_headers := current_setting('request.headers', true);
    IF v_headers IS NOT NULL AND v_headers != '' THEN
        v_user_id := nullif(v_headers::json->>'x-user-id', '')::UUID;
    END IF;
    RETURN v_user_id;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_auth_user_id_or_header() TO authenticated, anon, service_role;

-- 2. Redefine public.get_student_emails with get_auth_user_id_or_header() support
CREATE OR REPLACE FUNCTION public.get_student_emails(student_id_param UUID)
RETURNS TABLE (
    email TEXT,
    parent_email TEXT
) AS $$
DECLARE
    current_user_id UUID;
    decrypted_email TEXT;
    decrypted_parent_email TEXT;
BEGIN
    current_user_id := public.get_auth_user_id_or_header();
    IF current_user_id IS NULL THEN
        RETURN;
    END IF;

    IF current_user_id != student_id_param AND NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = current_user_id AND role IN ('teacher', 'admin', 'secretary')
    ) THEN
        RAISE EXCEPTION 'Nicht berechtigt.';
    END IF;

    -- Fetch and decrypt student email
    SELECT extensions.pgp_sym_decrypt(ep.prefix, public.get_encryption_key()) || '@' || es.suffix
    INTO decrypted_email
    FROM public.email_prefixes ep
    JOIN public.email_suffixes es ON ep.student_id = es.student_id
    WHERE ep.student_id = student_id_param;

    -- Fetch and decrypt parent email
    SELECT extensions.pgp_sym_decrypt(pep.prefix, public.get_encryption_key()) || '@' || pes.suffix
    INTO decrypted_parent_email
    FROM public.parent_email_prefixes pep
    JOIN public.parent_email_suffixes pes ON pep.student_id = pes.student_id
    WHERE pep.student_id = student_id_param;

    RETURN QUERY SELECT decrypted_email, decrypted_parent_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.get_student_emails(UUID) TO authenticated, anon, service_role;

-- 3. Redefine public.update_student_emails with get_auth_user_id_or_header() support
CREATE OR REPLACE FUNCTION public.update_student_emails(
    student_id_param UUID,
    input_student_email TEXT,
    input_parent_email TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    email_parts TEXT[];
    email_prefix TEXT;
    email_suffix TEXT;
BEGIN
    current_user_id := public.get_auth_user_id_or_header();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Nicht authentifiziert.';
    END IF;

    IF current_user_id != student_id_param AND NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = current_user_id AND role IN ('teacher', 'admin', 'secretary')
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
        VALUES (student_id_param, extensions.pgp_sym_encrypt(email_prefix, public.get_encryption_key()));

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
        VALUES (student_id_param, extensions.pgp_sym_encrypt(email_prefix, public.get_encryption_key()));

        INSERT INTO public.parent_email_suffixes (student_id, suffix)
        VALUES (student_id_param, email_suffix);
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.update_student_emails(UUID, TEXT, TEXT) TO authenticated, anon, service_role;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
