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
