-- Migration 241: Fix complete_onboarding RPC overload ambiguity
-- Drops existing 2-parameter and 3-parameter overload variants and creates a single unified definition with default parameters.

DROP FUNCTION IF EXISTS public.complete_onboarding(UUID, TEXT);
DROP FUNCTION IF EXISTS public.complete_onboarding(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.complete_onboarding(
    input_student_id UUID,
    input_email TEXT DEFAULT '',
    input_pin TEXT DEFAULT ''
)
RETURNS BOOLEAN AS $$
DECLARE
    email_parts TEXT[];
    email_prefix TEXT;
    email_suffix TEXT;
    target_school_id UUID;
    target_teacher_id UUID;
    target_instrument TEXT;
    target_first_name TEXT;
    target_last_name TEXT;
    new_qr_token UUID;
BEGIN
    -- Core student suchen
    SELECT school_id, teacher_id, instrument INTO target_school_id, target_teacher_id, target_instrument
    FROM public.students
    WHERE id = input_student_id AND status = 'ausstehend';

    IF target_school_id IS NULL THEN
        -- Fallback: check if already active user
        IF EXISTS (SELECT 1 FROM public.users WHERE id = input_student_id) THEN
            RETURN TRUE;
        END IF;
        RAISE EXCEPTION 'Student existiert nicht oder wurde bereits verifiziert.';
    END IF;

    -- E-Mail verarbeiten falls angegeben
    IF input_email IS NOT NULL AND input_email != '' AND position('@' in input_email) > 0 THEN
        email_parts := regexp_split_to_array(input_email, '@');
        IF array_length(email_parts, 1) = 2 THEN
            email_prefix := email_parts[1];
            email_suffix := email_parts[2];

            DELETE FROM public.email_prefixes WHERE student_id = input_student_id;
            DELETE FROM public.email_suffixes WHERE student_id = input_student_id;

            INSERT INTO public.email_prefixes (student_id, prefix)
            VALUES (input_student_id, pgp_sym_encrypt(email_prefix, public.get_encryption_key()));

            INSERT INTO public.email_suffixes (student_id, suffix)
            VALUES (input_student_id, email_suffix);
        END IF;
    END IF;

    -- Status aktualisieren
    UPDATE public.students
    SET status = 'verplant'
    WHERE id = input_student_id;

    -- Vorname entschlüsseln und Nachname holen
    SELECT pgp_sym_decrypt(sfn.first_name, public.get_encryption_key()) INTO target_first_name
    FROM public.student_first_names sfn
    WHERE sfn.student_id = input_student_id;

    SELECT sln.last_name INTO target_last_name
    FROM public.student_last_names sln
    WHERE sln.student_id = input_student_id;

    -- PIN verarbeiten, falls übergeben
    IF input_pin IS NOT NULL AND input_pin != '' THEN
        UPDATE public.students
        SET pin = pgp_sym_encrypt(input_pin, public.get_encryption_key())
        WHERE id = input_student_id;
    END IF;

    new_qr_token := gen_random_uuid();
    
    INSERT INTO public.users_raw (
        id,
        school_id,
        teacher_id,
        role,
        first_name,
        last_name,
        instrument,
        qr_token,
        is_active,
        is_app_user,
        is_campus_active,
        is_groovelab_active,
        status,
        ausweis_nummer
    )
    VALUES (
        input_student_id,
        target_school_id,
        target_teacher_id,
        'student',
        target_first_name,
        target_last_name,
        target_instrument,
        new_qr_token,
        TRUE,
        TRUE,
        TRUE,
        FALSE,
        'active',
        'GL-' || floor(1000 + random() * 9000)::text
    )
    ON CONFLICT (id) DO UPDATE SET
        qr_token = COALESCE(users_raw.qr_token, EXCLUDED.qr_token),
        is_active = TRUE,
        is_app_user = TRUE,
        is_campus_active = TRUE,
        status = 'active';

    INSERT INTO public.avatars (user_id, avatar_style, instrument_type, evolution_level, asset_path)
    VALUES (
        input_student_id,
        'Standard_Silhouette',
        target_instrument,
        1,
        '/avatars/silhouette_default.png'
    ) ON CONFLICT (user_id) DO NOTHING;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.complete_onboarding(UUID, TEXT, TEXT) TO anon, authenticated, service_role;
ALTER FUNCTION public.complete_onboarding(UUID, TEXT, TEXT) SET search_path = public, pg_catalog, extensions;

NOTIFY pgrst, 'reload schema';
