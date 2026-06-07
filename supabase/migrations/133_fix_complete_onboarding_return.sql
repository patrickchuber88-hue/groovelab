-- Drop the old complete_onboarding function first to avoid signature mismatch
DROP FUNCTION IF EXISTS public.complete_onboarding(UUID, TEXT);

-- Create updated function returning the user profile table row
CREATE OR REPLACE FUNCTION public.complete_onboarding(
    input_student_id UUID,
    input_email TEXT
)
RETURNS TABLE (
    id UUID,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    instrument TEXT,
    qr_token UUID,
    status TEXT,
    ausweis_nummer TEXT
) AS $$
#variable_conflict use_column
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
    clean_email TEXT;
BEGIN
    -- Clean email
    clean_email := NULLIF(TRIM(input_email), '');

    -- Core student suchen
    SELECT school_id, teacher_id, instrument INTO target_school_id, target_teacher_id, target_instrument
    FROM public.students
    WHERE id = input_student_id AND status IN ('ausstehend', 'verplant');

    IF target_school_id IS NULL THEN
        RAISE EXCEPTION 'Student existiert nicht oder wurde bereits verifiziert.';
    END IF;

    -- E-Mail-Fragmente löschen falls bereits vorhanden (für erneutes Onboarding/Update)
    DELETE FROM public.email_prefixes WHERE student_id = input_student_id;
    DELETE FROM public.email_suffixes WHERE student_id = input_student_id;

    -- E-Mail splitten falls vorhanden
    IF clean_email IS NOT NULL THEN
        email_parts := regexp_split_to_array(clean_email, '@');
        IF array_length(email_parts, 1) != 2 THEN
            RAISE EXCEPTION 'Ungültiges E-Mail-Format.';
        END IF;

        email_prefix := email_parts[1];
        email_suffix := email_parts[2];

        -- E-Mail-Fragmente speichern
        INSERT INTO public.email_prefixes (student_id, prefix)
        VALUES (input_student_id, email_prefix);

        INSERT INTO public.email_suffixes (student_id, suffix)
        VALUES (input_student_id, email_suffix);
    END IF;

    -- Status aktualisieren
    UPDATE public.students
    SET status = 'verplant'
    WHERE id = input_student_id;

    -- Vor-/Nachname holen
    SELECT first_name, last_name INTO target_first_name, target_last_name
    FROM public.student_names
    WHERE student_id = input_student_id;

    -- Kompatibilität mit dem restlichen System herstellen (Student in public.users anlegen / aktualisieren)
    new_qr_token := gen_random_uuid();
    
    INSERT INTO public.users (
        id,
        school_id,
        teacher_id,
        role,
        first_name,
        last_name,
        email,
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
        clean_email,
        target_instrument,
        new_qr_token,
        TRUE,
        TRUE,
        TRUE,
        TRUE,
        'active',
        'GL-' || floor(1000 + random() * 9000)::text
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        qr_token = COALESCE(users.qr_token, EXCLUDED.qr_token),
        is_active = TRUE,
        is_app_user = TRUE,
        is_campus_active = TRUE,
        is_groovelab_active = TRUE,
        status = 'active';

    -- Standard-Avatar hinzufügen
    INSERT INTO public.avatars (user_id, avatar_style, instrument_type, evolution_level, asset_path)
    VALUES (
        input_student_id,
        'Standard_Silhouette',
        target_instrument,
        1,
        '/avatars/silhouette_default.png'
    ) ON CONFLICT (user_id) DO NOTHING;

    -- Rückgabe des erstellten bzw. aktualisierten Benutzerprofils (mit expliziten Casts auf TEXT)
    RETURN QUERY
    SELECT 
        u.id, 
        u.first_name::text, 
        u.last_name::text, 
        u.email::text, 
        u.instrument::text, 
        u.qr_token, 
        u.status::text, 
        u.ausweis_nummer::text
    FROM public.users u
    WHERE u.id = input_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.complete_onboarding(UUID, TEXT) TO anon, authenticated, service_role;
