-- Migration 527: Resilient Smart Onboarding & Auth Epoch Emergency Recovery RPC
-- 
-- 1. Fügt auth_epoch zu users_raw hinzu (Kryptografischer Session-Kill-Switch)
-- 2. Aktualisiert verify_onboarding mit SSOT users_raw + activation_days Match
-- 3. Implementiert emergency_reset_student_session für 1-Klick-Lehrer-Recovery
-- 4. Setzt strikte ASVS Level 3 Brute-Force-Sperren (3 Versuche pro IP / 15 Min)

-- 1. auth_epoch zu users_raw hinzufügen und eindeutigen Index auf activation_days setzen
ALTER TABLE public.users_raw 
ADD COLUMN IF NOT EXISTS auth_epoch INTEGER DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_activation_days_student_id 
ON public.activation_days(student_id);

-- 2. Bestehende Signaturen von verify_onboarding droppen (für saubere Tabellen-Rückgabe)
DROP FUNCTION IF EXISTS public.verify_onboarding(text, text, text, integer);
DROP FUNCTION IF EXISTS public.verify_onboarding(text, text, text, integer, uuid);
DROP FUNCTION IF EXISTS public.verify_onboarding(text, text, text, integer, uuid, uuid);

-- 3. Resiliente verify_onboarding RPC
CREATE OR REPLACE FUNCTION public.verify_onboarding(
    input_first_name TEXT,
    input_last_name TEXT,
    input_instrument TEXT,
    input_day INT,
    input_school_id UUID DEFAULT NULL,
    input_teacher_id UUID DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    student_id UUID,
    message TEXT,
    qr_token UUID,
    ausweis_nummer TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions, pg_temp
AS $$
DECLARE
    client_ip TEXT;
    recent_attempts INT;
    matched_student_id UUID;
    v_qr_token UUID;
    v_ausweis_nummer TEXT;
    v_status TEXT;
BEGIN
    -- 1. Client-IP bestimmen
    client_ip := COALESCE(
        current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
        '127.0.0.1'
    );

    -- 2. Veraltete Fehlversuche (> 15 Min) bereinigen
    DELETE FROM public.onboarding_attempts 
    WHERE attempted_at < NOW() - INTERVAL '15 minutes';

    -- 3. Fehlversuche für diese IP prüfen (Brute-Force-Schutz)
    SELECT COUNT(*)::INT INTO recent_attempts
    FROM public.onboarding_attempts
    WHERE ip_address = client_ip;

    IF recent_attempts >= 3 THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Zu viele Fehlversuche. Bitte versuche es in 15 Minuten erneut.', NULL::UUID, NULL::TEXT;
        RETURN;
    END IF;

    -- 4. Primärer Match: users_raw (SSOT) + activation_days
    SELECT 
        u.id, 
        u.qr_token, 
        u.ausweis_nummer,
        u.status
    INTO 
        matched_student_id, 
        v_qr_token, 
        v_ausweis_nummer,
        v_status
    FROM public.users_raw u
    JOIN public.activation_days ad ON u.id = ad.student_id
    WHERE u.role = 'student'
      AND COALESCE(u.status, 'active') != 'archived'
      AND (input_school_id IS NULL OR u.school_id = input_school_id)
      AND (input_teacher_id IS NULL OR u.teacher_id = input_teacher_id)
      AND (
          input_instrument IS NULL 
          OR input_instrument = '' 
          OR LOWER(TRIM(input_instrument)) = 'ohne zuweisung'
          OR LOWER(TRIM(COALESCE(u.instrument, ''))) = LOWER(TRIM(input_instrument))
      )
      AND LOWER(TRIM(u.first_name)) = LOWER(TRIM(input_first_name))
      AND (
          -- Exakter Nachname
          LOWER(TRIM(u.last_name)) = LOWER(TRIM(input_last_name))
          -- Namensanfang passt (z. B. "Kaufmann" bei Eingabe "K.")
          OR (LENGTH(TRIM(input_last_name)) <= 3 AND LOWER(TRIM(u.last_name)) LIKE LOWER(TRIM(REPLACE(input_last_name, '.', ''))) || '%')
          OR (LENGTH(TRIM(u.last_name)) <= 3 AND LOWER(TRIM(input_last_name)) LIKE LOWER(TRIM(REPLACE(u.last_name, '.', ''))) || '%')
      )
      AND ad.day_of_birth = input_day
    ORDER BY u.created_at DESC
    LIMIT 1;

    -- 5. Sekundärer Fallback: Legacy-Shards (students + student_first_names + student_last_names)
    IF matched_student_id IS NULL THEN
        BEGIN
            SELECT s.id, u.qr_token, u.ausweis_nummer, s.status
            INTO matched_student_id, v_qr_token, v_ausweis_nummer, v_status
            FROM public.students s
            JOIN public.student_first_names sfn ON s.id = sfn.student_id
            JOIN public.student_last_names sln ON s.id = sln.student_id
            JOIN public.activation_days ad ON s.id = ad.student_id
            LEFT JOIN public.users_raw u ON s.id = u.id
            WHERE (input_school_id IS NULL OR s.school_id = input_school_id)
              AND (input_teacher_id IS NULL OR s.teacher_id = input_teacher_id)
              AND (
                  input_instrument IS NULL 
                  OR input_instrument = '' 
                  OR LOWER(TRIM(input_instrument)) = 'ohne zuweisung'
                  OR LOWER(TRIM(COALESCE(s.instrument, ''))) = LOWER(TRIM(input_instrument))
              )
              AND (
                  LOWER(TRIM(sfn.first_name)) = LOWER(TRIM(input_first_name))
                  OR (public.safe_pgp_sym_decrypt(sfn.first_name, public.get_encryption_key()) ILIKE input_first_name)
              )
              AND (
                  LOWER(TRIM(sln.last_name)) = LOWER(TRIM(input_last_name))
                  OR (public.safe_pgp_sym_decrypt(sln.last_name, public.get_encryption_key()) ILIKE input_last_name)
              )
              AND ad.day_of_birth = input_day
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            matched_student_id := NULL;
        END;
    END IF;

    -- 6. Auswertung des Matches
    IF matched_student_id IS NOT NULL THEN
        -- Erfolg: IP-Fehlversuche zurücksetzen
        DELETE FROM public.onboarding_attempts WHERE ip_address = client_ip;

        IF v_status = 'frozen' THEN
            RETURN QUERY SELECT FALSE, matched_student_id, 'Konto gesperrt. Bitte wende dich an deine Musikschule.', v_qr_token, v_ausweis_nummer;
        ELSE
            RETURN QUERY SELECT TRUE, matched_student_id, 'Verifiziert', v_qr_token, v_ausweis_nummer;
        END IF;
    ELSE
        -- Fehlschlag: Fehlversuch für diese IP registrieren
        INSERT INTO public.onboarding_attempts (ip_address) VALUES (client_ip);
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Eingabe überprüfen. Bitte prüfe Vorname, Nachname, Instrument und den Tag des Geburtstags.', NULL::UUID, NULL::TEXT;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_onboarding(TEXT, TEXT, TEXT, INT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_onboarding(TEXT, TEXT, TEXT, INT, UUID, UUID) TO anon, authenticated, service_role;


-- 4. Notfall-Recovery RPC für Lehrkräfte (Kryptografischer Kill-Switch)
CREATE OR REPLACE FUNCTION public.emergency_reset_student_session(
    p_student_id UUID,
    p_teacher_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions, pg_temp
AS $$
DECLARE
    v_new_epoch INT;
    v_student_school_id UUID;
    v_student_name TEXT;
BEGIN
    IF p_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Schüler-ID fehlt.');
    END IF;

    -- Prüfen, ob Schüler existiert
    SELECT school_id, (first_name || ' ' || COALESCE(last_name, ''))
    INTO v_student_school_id, v_student_name
    FROM public.users_raw
    WHERE id = p_student_id;

    IF v_student_school_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Schülerprofil nicht gefunden.');
    END IF;

    -- 1. auth_epoch erhöhen (invalidiert alle aktiven JWT-Sessions/Leases)
    UPDATE public.users_raw
    SET 
        auth_epoch = COALESCE(auth_epoch, 1) + 1,
        personal_pin = NULL,
        personal_pin_hash = NULL,
        parent_pin = NULL,
        parent_pin_hash = NULL,
        is_pin_activated = false,
        failed_pin_attempts = 0,
        pin_locked_until = NULL
    WHERE id = p_student_id
    RETURNING auth_epoch INTO v_new_epoch;

    -- 2. Revisionssicheres Audit-Logging
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        operation,
        school_id,
        user_id,
        details,
        hash_version,
        created_at
    ) VALUES (
        'users_raw',
        p_student_id,
        'STUDENT_SESSION_EMERGENCY_RESET',
        'UPDATE',
        v_student_school_id,
        p_teacher_id,
        jsonb_build_object(
            'target_student_id', p_student_id,
            'student_name', v_student_name,
            'new_auth_epoch', v_new_epoch,
            'timestamp', NOW()
        ),
        2,
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'auth_epoch', v_new_epoch,
        'message', 'Sitzung erfolgreich zurückgesetzt. Alle bisherigen Logins wurden sofort beendet.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.emergency_reset_student_session(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.emergency_reset_student_session(UUID, UUID) TO authenticated, service_role;
