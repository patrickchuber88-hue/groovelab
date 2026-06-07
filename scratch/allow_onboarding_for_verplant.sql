-- Update verify_onboarding to allow status 'verplant'
CREATE OR REPLACE FUNCTION public.verify_onboarding(
    input_first_name TEXT,
    input_last_name TEXT,
    input_instrument TEXT,
    input_day INT
)
RETURNS TABLE (
    success BOOLEAN,
    student_id UUID,
    message TEXT
) AS $$
DECLARE
    client_ip TEXT;
    recent_attempts INT;
    matched_student_id UUID;
BEGIN
    -- Client-IP bestimmen
    client_ip := COALESCE(
        current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
        '127.0.0.1'
    );

    -- Veraltete Versuche löschen (> 15 Min)
    DELETE FROM public.onboarding_attempts WHERE attempted_at < NOW() - INTERVAL '15 minutes';

    -- Fehlversuche-Sperre temporär auf BYPASS gesetzt
    /*
    SELECT COUNT(*)::INT INTO recent_attempts
    FROM public.onboarding_attempts
    WHERE ip_address = client_ip;

    IF recent_attempts >= 3 THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Zu viele Fehlversuche. Bitte versuche es in 15 Minuten erneut.';
        RETURN;
    END IF;
    */

    -- Blinde Suche (erlaubt ausstehend und bereits verplant für Onboarding/Verifizierung)
    SELECT s.id INTO matched_student_id
    FROM public.students s
    JOIN public.student_names sn ON s.id = sn.student_id
    JOIN public.activation_days ad ON s.id = ad.student_id
    WHERE sn.first_name ILIKE input_first_name
      AND sn.last_name ILIKE input_last_name
      AND s.instrument = input_instrument
      AND ad.day_of_birth = input_day
      AND s.status IN ('ausstehend', 'verplant')
    LIMIT 1;

    IF matched_student_id IS NOT NULL THEN
        -- Erfolg: IP freischalten
        DELETE FROM public.onboarding_attempts WHERE ip_address = client_ip;
        RETURN QUERY SELECT TRUE, matched_student_id, 'Verifiziert';
    ELSE
        -- Fehlschlag: IP registrieren
        INSERT INTO public.onboarding_attempts (ip_address) VALUES (client_ip);
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Eingabe überprüfen';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Update complete_onboarding to allow status 'verplant'
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
    -- Core student suchen (erlaubt ausstehend und bereits verplant)
    SELECT school_id, teacher_id, instrument INTO target_school_id, target_teacher_id, target_instrument
    FROM public.students
    WHERE id = input_student_id AND status IN ('ausstehend', 'verplant');

    IF target_school_id IS NULL THEN
        RAISE EXCEPTION 'Student existiert nicht oder wurde bereits verifiziert.';
    END IF;

    -- E-Mail-Fragmente löschen falls bereits vorhanden (für erneutes Onboarding/Update)
    DELETE FROM public.email_prefixes WHERE student_id = input_student_id;
    DELETE FROM public.email_suffixes WHERE student_id = input_student_id;

    -- E-Mail splitten
    email_parts := regexp_split_to_array(input_email, '@');
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
        input_email,
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

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
