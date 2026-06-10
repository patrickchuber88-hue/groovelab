-- Migration: Verschlüsselung von Vornamen und E-Mail-Präfixen (pgcrypto)

-- 1. Sicherstellen, dass pgcrypto installiert ist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Hilfsfunktion für den Verschlüsselungsschlüssel erstellen
CREATE OR REPLACE FUNCTION public.get_encryption_key()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        NULLIF(current_setting('app.settings.encryption_key', true), ''),
        'groovelab-default-local-encryption-key-123!'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Spalte first_name in student_first_names auf bytea umstellen und verschlüsseln
ALTER TABLE public.student_first_names 
ALTER COLUMN first_name TYPE bytea 
USING pgp_sym_encrypt(first_name, public.get_encryption_key());

-- 4. Spalte prefix in email_prefixes auf bytea umstellen und verschlüsseln
ALTER TABLE public.email_prefixes 
ALTER COLUMN prefix TYPE bytea 
USING pgp_sym_encrypt(prefix, public.get_encryption_key());

-- 5. RPC 1: import_student neu definieren (mit Verschlüsselung)
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

    -- Vorname verschlüsselt speichern
    INSERT INTO public.student_first_names (student_id, first_name)
    VALUES (new_student_id, pgp_sym_encrypt(first_name, public.get_encryption_key()));

    -- Nachname separat speichern
    INSERT INTO public.student_last_names (student_id, last_name)
    VALUES (new_student_id, last_name);

    -- Geburtstagstag (Day of Birth) speichern
    INSERT INTO public.activation_days (student_id, day_of_birth)
    VALUES (new_student_id, day_part);

    RETURN new_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. RPC 2: verify_onboarding neu definieren (mit Entschlüsselung)
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
    WHERE pgp_sym_decrypt(sfn.first_name, public.get_encryption_key()) ILIKE input_first_name
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


-- 7. RPC 3: complete_onboarding neu definieren (mit Ent- und Verschlüsselung)
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

    -- Vorherige Fragmente löschen, falls vorhanden
    DELETE FROM public.email_prefixes WHERE student_id = input_student_id;
    DELETE FROM public.email_suffixes WHERE student_id = input_student_id;

    -- E-Mail-Fragmente speichern (Präfix verschlüsselt)
    INSERT INTO public.email_prefixes (student_id, prefix)
    VALUES (input_student_id, pgp_sym_encrypt(email_prefix, public.get_encryption_key()));

    INSERT INTO public.email_suffixes (student_id, suffix)
    VALUES (input_student_id, email_suffix);

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


-- 8. RPC 4: request_magic_link neu definieren (mit Entschlüsselung)
DROP FUNCTION IF EXISTS public.request_magic_link(TEXT);

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

    -- Passenden Schüler ermitteln (mit Entschlüsselung des Präfixes)
    SELECT ep.student_id INTO matched_student_id
    FROM public.email_prefixes ep
    JOIN public.email_suffixes es ON ep.student_id = es.student_id
    WHERE pgp_sym_decrypt(ep.prefix, public.get_encryption_key()) = email_prefix 
      AND es.suffix = email_suffix
    LIMIT 1;

    RETURN QUERY SELECT TRUE, 'Wenn die E-Mail registriert ist, wurde ein Magic Link gesendet.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 9. View für ausstehende Studenten erstellen (entschlüsselt für das Sekretariat)
DROP VIEW IF EXISTS public.pending_students_decrypted;

CREATE OR REPLACE VIEW public.pending_students_decrypted AS
SELECT 
    s.id,
    s.school_id,
    s.teacher_id,
    s.instrument,
    s.status,
    s.created_at,
    pgp_sym_decrypt(sfn.first_name, public.get_encryption_key()) AS first_name,
    sln.last_name,
    ad.day_of_birth
FROM public.students s
LEFT JOIN public.student_first_names sfn ON s.id = sfn.student_id
LEFT JOIN public.student_last_names sln ON s.id = sln.student_id
LEFT JOIN public.activation_days ad ON s.id = ad.student_id
WHERE s.status = 'ausstehend';

-- Berechtigungen für die View vergeben
GRANT SELECT ON public.pending_students_decrypted TO authenticated, anon, service_role;
