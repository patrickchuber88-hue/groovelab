-- Migration: Allow verify_onboarding to verify students with any status (not just 'ausstehend')
-- This enables parents/students to re-onboard or update their timetable preferences.

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

    -- Blinde Suche über getrennte Vor- und Nachnamens-Tabellen (Statusfilter entfernt, um Re-Entry zu erlauben)
    SELECT s.id INTO matched_student_id
    FROM public.students s
    JOIN public.student_first_names sfn ON s.id = sfn.student_id
    JOIN public.student_last_names sln ON s.id = sln.student_id
    JOIN public.activation_days ad ON s.id = ad.student_id
    WHERE pgp_sym_decrypt(sfn.first_name, public.get_encryption_key()) ILIKE input_first_name
      AND sln.last_name ILIKE input_last_name
      AND s.instrument = input_instrument
      AND ad.day_of_birth = input_day
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

ALTER FUNCTION public.verify_onboarding(TEXT, TEXT, TEXT, INT) SET search_path = public, pg_catalog, extensions;

NOTIFY pgrst, 'reload schema';
