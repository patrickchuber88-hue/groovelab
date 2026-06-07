-- Migration: Anonymisiertes Onboarding mit 5-Tabellen-Schema und Verification/Rate-Limiting

-- 1. Core-Schülertabelle (Völlig anonymisiert)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    instrument VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ausstehend', -- ausstehend, in_bearbeitung, verplant
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Namens-Fragment (Isoliert)
CREATE TABLE IF NOT EXISTS public.student_names (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL
);

-- 3. E-Mail-Präfix (Isoliert)
CREATE TABLE IF NOT EXISTS public.email_prefixes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    prefix VARCHAR(255) NOT NULL
);

-- 4. E-Mail-Suffix (Isoliert)
CREATE TABLE IF NOT EXISTS public.email_suffixes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    suffix VARCHAR(255) NOT NULL
);

-- 5. Auth-Sperre / Aktivierungs-Tag (Isoliert)
CREATE TABLE IF NOT EXISTS public.activation_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    day_of_birth INTEGER NOT NULL CHECK (day_of_birth >= 1 AND day_of_birth <= 31)
);

-- Rate-Limiting-Tabelle für Onboarding-Versuche
CREATE TABLE IF NOT EXISTS public.onboarding_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Logs für Magic Links
CREATE TABLE IF NOT EXISTS public.magic_link_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Deaktivieren
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_names DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_prefixes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suffixes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_days DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.magic_link_logs DISABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON public.students TO authenticated, anon, service_role;
GRANT ALL ON public.student_names TO authenticated, anon, service_role;
GRANT ALL ON public.email_prefixes TO authenticated, anon, service_role;
GRANT ALL ON public.email_suffixes TO authenticated, anon, service_role;
GRANT ALL ON public.activation_days TO authenticated, anon, service_role;
GRANT ALL ON public.onboarding_attempts TO authenticated, anon, service_role;
GRANT ALL ON public.magic_link_logs TO authenticated, anon, service_role;


-- RPC 1: import_student (CSV-Import des Sekretariats)
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

    -- Vor-/Nachname fragmentieren
    INSERT INTO public.student_names (student_id, first_name, last_name)
    VALUES (new_student_id, first_name, last_name);

    -- Geburtstagstag (Day of Birth) speichern
    INSERT INTO public.activation_days (student_id, day_of_birth)
    VALUES (new_student_id, day_part);

    RETURN new_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC 2: verify_onboarding (Onboarding-Verifikation)
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

    -- Blinde Suche
    SELECT s.id INTO matched_student_id
    FROM public.students s
    JOIN public.student_names sn ON s.id = sn.student_id
    JOIN public.activation_days ad ON s.id = ad.student_id
    WHERE sn.first_name ILIKE input_first_name
      AND sn.last_name ILIKE input_last_name
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


-- RPC 3: complete_onboarding (Onboarding abschließen)
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

    -- Vor-/Nachname holen
    SELECT first_name, last_name INTO target_first_name, target_last_name
    FROM public.student_names
    WHERE student_id = input_student_id;

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


-- RPC 4: request_magic_link (Magic Link Anfordern)
CREATE OR REPLACE FUNCTION public.request_magic_link(
    input_email TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    email_parts TEXT[];
    email_prefix TEXT;
    email_suffix TEXT;
    recent_requests INT;
    matched_student_id UUID;
    temp_jwt_token TEXT;
BEGIN
    email_parts := regexp_split_to_array(input_email, '@');
    IF array_length(email_parts, 1) != 2 THEN
        RETURN QUERY SELECT FALSE, 'Ungültiges E-Mail-Format.';
        RETURN;
    END IF;

    email_prefix := email_parts[1];
    email_suffix := email_parts[2];

    -- Veraltete Logs aufräumen
    DELETE FROM public.magic_link_logs WHERE requested_at < NOW() - INTERVAL '15 minutes';

    -- Spam-Schutz per E-Mail-Adresse
    SELECT COUNT(*)::INT INTO recent_requests
    FROM public.magic_link_logs
    WHERE email = input_email;

    IF recent_requests > 0 THEN
        -- Lautloser Abbruch zum Schutz vor E-Mail-Ausspähung
        RETURN QUERY SELECT TRUE, 'Wenn die E-Mail registriert ist, wurde ein Magic Link gesendet.';
        RETURN;
    END IF;

    -- Request protokollieren
    INSERT INTO public.magic_link_logs (email) VALUES (input_email);

    -- Passenden Schüler ermitteln
    SELECT ep.student_id INTO matched_student_id
    FROM public.email_prefixes ep
    JOIN public.email_suffixes es ON ep.student_id = es.student_id
    WHERE ep.prefix = email_prefix AND es.suffix = email_suffix
    LIMIT 1;

    -- SMTP E-Mail Senden / Token Generieren
    -- In einer reinen DB-Funktion geben wir einfach Erfolg zurück.
    -- Da wir auf dem Hetzner-Server sind, loggt die API-Schicht den Magic Link Event.
    
    RETURN QUERY SELECT TRUE, 'Wenn die E-Mail registriert ist, wurde ein Magic Link gesendet.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
