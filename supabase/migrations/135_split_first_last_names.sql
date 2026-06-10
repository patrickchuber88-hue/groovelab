-- Migration: Trennung von Vor- und Nachnamen in student_first_names und student_last_names (6-Tabellen-Schema)

-- 1. Tabellen erstellen
CREATE TABLE IF NOT EXISTS public.student_first_names (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    first_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_last_names (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    last_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bestehende Daten migrieren (falls vorhanden)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'student_names' AND schemaname = 'public') THEN
        INSERT INTO public.student_first_names (student_id, first_name)
        SELECT student_id, first_name FROM public.student_names
        ON CONFLICT DO NOTHING;

        INSERT INTO public.student_last_names (student_id, last_name)
        SELECT student_id, last_name FROM public.student_names
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 3. RLS deaktivieren (passend zum MVP-Muster)
ALTER TABLE public.student_first_names DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_last_names DISABLE ROW LEVEL SECURITY;

-- 4. Berechtigungen vergeben
GRANT ALL ON public.student_first_names TO authenticated, anon, service_role;
GRANT ALL ON public.student_last_names TO authenticated, anon, service_role;

-- 5. Alte Tabelle student_names löschen
DROP TABLE IF EXISTS public.student_names CASCADE;

-- 6. RPC 1: import_student neu definieren (mit zwei Tabellen)
DROP FUNCTION IF EXISTS public.import_student(TEXT, TEXT, TEXT, TEXT, UUID, UUID);

CREATE OR REPLACE FUNCTION public.import_student(
    first_name TEXT,
    last_name TEXT,
    birth_date TEXT,
    instrument TEXT,
    school_id UUID,
    teacher_id UUID
)
RETURNS UUID AS $$
DECLARE
    new_student_id UUID;
    day_part INT;
BEGIN
    -- Tag (DD) extrahieren
    BEGIN
        day_part := split_part(birth_date, '.', 1)::integer;
        IF day_part < 1 OR day_part > 31 THEN
            RAISE EXCEPTION 'Tag nicht im Bereich 1-31';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Ungültiges Datumsformat. Bitte DD.MM.YYYY verwenden.';
    END;

    -- Core student einfügen
    INSERT INTO public.students (school_id, teacher_id, instrument, status)
    VALUES (school_id, teacher_id, instrument, 'ausstehend')
    RETURNING id INTO new_student_id;

    -- Vorname separat speichern
    INSERT INTO public.student_first_names (student_id, first_name)
    VALUES (new_student_id, first_name);

    -- Nachname separat speichern
    INSERT INTO public.student_last_names (student_id, last_name)
    VALUES (new_student_id, last_name);

    -- Geburtstagstag (Day of Birth) speichern
    INSERT INTO public.activation_days (student_id, day_of_birth)
    VALUES (new_student_id, day_part);

    RETURN new_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. RPC 2: verify_onboarding neu definieren
DROP FUNCTION IF EXISTS public.verify_onboarding(TEXT, TEXT, TEXT, INT);

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

    -- Fehlversuche zählen
    SELECT COUNT(*)::INT INTO recent_attempts
    FROM public.onboarding_attempts
    WHERE ip_address = client_ip;

    IF recent_attempts >= 3 THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Zu viele Fehlversuche. Bitte versuche es in 15 Minuten erneut.';
        RETURN;
    END IF;

    -- Blinde Suche über getrennte Vor- und Nachnamens-Tabellen
    SELECT s.id INTO matched_student_id
    FROM public.students s
    JOIN public.student_first_names sfn ON s.id = sfn.student_id
    JOIN public.student_last_names sln ON s.id = sln.student_id
    JOIN public.activation_days ad ON s.id = ad.student_id
    WHERE sfn.first_name ILIKE input_first_name
      AND sln.last_name ILIKE input_last_name
      AND s.instrument = input_instrument
      AND ad.day_of_birth = input_day
      AND s.status = 'ausstehend'
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


-- 8. RPC 3: complete_onboarding neu definieren
DROP FUNCTION IF EXISTS public.complete_onboarding(UUID, TEXT);

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

    -- Vorname und Nachname aus getrennten Tabellen holen
    SELECT sfn.first_name INTO target_first_name
    FROM public.student_first_names sfn
    WHERE sfn.student_id = input_student_id;

    SELECT sln.last_name INTO target_last_name
    FROM public.student_last_names sln
    WHERE sln.student_id = input_student_id;

    -- Kompatibilität mit dem restlichen System herstellen (Student in public.users anlegen)
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
