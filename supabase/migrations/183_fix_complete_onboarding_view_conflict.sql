-- Migration: Fix complete_onboarding ON CONFLICT error on public.users view
-- Since public.users is a view (backed by users_raw), ON CONFLICT is not supported.
-- We use a conditional IF EXISTS check to INSERT or UPDATE instead.

CREATE OR REPLACE FUNCTION public.complete_onboarding(
    input_student_id UUID,
    input_email TEXT
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
        RAISE EXCEPTION 'Student existiert nicht oder wurde bereits verifiziert.';
    END IF;

    -- E-Mail verarbeiten, falls angegeben
    IF input_email IS NOT NULL AND TRIM(input_email) != '' THEN
        -- E-Mail splitten
        email_parts := regexp_split_to_array(TRIM(input_email), '@');
        IF array_length(email_parts, 1) != 2 THEN
            RAISE EXCEPTION 'Ungültiges E-Mail-Format.';
        END IF;

        email_prefix := email_parts[1];
        email_suffix := email_parts[2];

        -- Vorherige Fragmente löschen, falls vorhanden
        DELETE FROM public.email_prefixes WHERE student_id = input_student_id;
        DELETE FROM public.email_suffixes WHERE student_id = input_student_id;

        -- E-Mail-Fragmente speichern (Präfix verschlüsselt)
        INSERT INTO public.email_prefixes (student_id, prefix)
        VALUES (input_student_id, pgp_sym_encrypt(email_prefix, public.get_encryption_key()));

        INSERT INTO public.email_suffixes (student_id, suffix)
        VALUES (input_student_id, email_suffix);
    ELSE
        -- Falls leer, lösche eventuell vorhandene Fragmente
        DELETE FROM public.email_prefixes WHERE student_id = input_student_id;
        DELETE FROM public.email_suffixes WHERE student_id = input_student_id;
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

    -- Kompatibilität mit dem restlichen System herstellen (Student in public.users anlegen)
    new_qr_token := gen_random_uuid();
    
    -- Check if user already exists to avoid ON CONFLICT on view
    IF EXISTS (SELECT 1 FROM public.users WHERE id = input_student_id) THEN
        UPDATE public.users SET
            email = NULL,
            qr_token = COALESCE(users.qr_token, new_qr_token),
            is_active = TRUE,
            is_app_user = TRUE,
            is_campus_active = TRUE,
            is_groovelab_active = TRUE,
            status = 'active'
        WHERE id = input_student_id;
    ELSE
        INSERT INTO public.users (
            id,
            school_id,
            teacher_id,
            role,
            first_name,
            last_name,
            email, -- will be NULL
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
            NULL, -- set email to NULL to remove it from user profiles
            target_instrument,
            new_qr_token,
            TRUE,
            TRUE,
            TRUE,
            TRUE,
            'active',
            'GL-' || floor(1000 + random() * 9000)::text
        );
    END IF;

    -- Standard-Avatar hinzufügen
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

ALTER FUNCTION public.complete_onboarding(UUID, TEXT) SET search_path = public, pg_catalog, extensions;

NOTIFY pgrst, 'reload schema';
