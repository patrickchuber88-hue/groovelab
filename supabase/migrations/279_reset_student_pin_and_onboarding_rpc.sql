-- Migration 279: PIN Reset & Onboarding Reclaim Architecture
-- Provides atomic, security-definer RPCs for teachers/secretariat to reset a student's PIN
-- and for students/parents to reclaim and set a new PIN using their Day of Birth (TT: 1-31).

-- 1. RPC: Teacher or Secretariat triggers PIN reset and returns the active QR token
CREATE OR REPLACE FUNCTION public.request_student_pin_reset(
    p_student_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_user RECORD;
    v_qr_token TEXT;
BEGIN
    IF p_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Keine Schüler-ID übergeben.');
    END IF;

    -- Security check: Must be master admin or teacher/admin/secretary
    IF NOT (public.is_master_admin() OR public.is_teacher_or_admin()) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Keine Berechtigung zum Zurücksetzen der PIN.');
    END IF;

    -- Fetch user details
    SELECT id, school_id, first_name, last_name, qr_token, teacher_qr_token, ausweis_nummer, day_of_birth
    INTO v_user
    FROM public.users_raw
    WHERE id = p_student_id;

    IF v_user.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Schülerprofil nicht gefunden.');
    END IF;

    -- Resolve token: prioritize qr_token, then teacher_qr_token, then ausweis_nummer, then id
    v_qr_token := COALESCE(v_user.qr_token, v_user.teacher_qr_token, v_user.ausweis_nummer, v_user.id::text);

    -- 1. Reset PIN status in users_raw
    UPDATE public.users_raw SET
        is_pin_activated = FALSE,
        parent_pin = NULL,
        personal_pin = NULL,
        onboarding_pin = NULL,
        status = 'offen'
    WHERE id = p_student_id;

    -- 2. Update students table if exists
    BEGIN
        UPDATE public.students SET
            is_pin_activated = FALSE,
            parent_pin = NULL,
            personal_pin = NULL,
            onboarding_pin = NULL,
            status = 'offen'
        WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 3. Update pending_students table if exists
    BEGIN
        UPDATE public.pending_students SET
            is_pin_activated = FALSE,
            parent_pin = NULL,
            personal_pin = NULL,
            onboarding_pin = NULL,
            status = 'offen'
        WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 4. Revisionssicheres Audit-Logging
    INSERT INTO public.audit_logs (school_id, user_id, action, details)
    VALUES (v_user.school_id, p_student_id, 'STUDENT_PIN_RESET_TRIGGERED', 'PIN wurde durch Lehrkraft/Sekretariat zurückgesetzt. Neuer Onboarding-Link generiert.');

    RETURN jsonb_build_object(
        'success', true,
        'student_id', v_user.id,
        'first_name', v_user.first_name,
        'last_name', v_user.last_name,
        'qr_token', v_qr_token,
        'day_of_birth', v_user.day_of_birth
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

-- 2. RPC: Reclaim PIN via Day of Birth (TT 1-31) and set new 4-digit PIN
CREATE OR REPLACE FUNCTION public.reset_student_pin_via_birth_day(
    p_student_id UUID,
    p_qr_token TEXT,
    p_birth_day INTEGER,
    p_new_pin TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_user RECORD;
    v_stored_day INTEGER;
    v_hashed_pin TEXT;
    v_clean_token TEXT;
BEGIN
    IF p_student_id IS NULL OR p_new_pin IS NULL OR length(trim(p_new_pin)) <> 4 OR trim(p_new_pin) = '0000' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Die PIN muss genau 4 Ziffern lang sein und darf nicht „0000“ lauten.');
    END IF;

    IF p_birth_day IS NULL OR p_birth_day < 1 OR p_birth_day > 31 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bitte gib einen gültigen Tag zwischen 1 und 31 ein.');
    END IF;

    v_clean_token := trim(COALESCE(p_qr_token, ''));

    -- Find student and verify token coupling
    SELECT id, school_id, birth_date, is_campus_active, is_groovelab_active 
    INTO v_user
    FROM public.users_raw
    WHERE id = p_student_id
      AND (
          v_clean_token = ''
          OR qr_token = v_clean_token
          OR teacher_qr_token = v_clean_token
          OR upper(ausweis_nummer) = upper(v_clean_token)
          OR id::text = v_clean_token
      );

    IF v_user.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiger QR-Token für dieses Schülerprofil.');
    END IF;

    -- Load day_of_birth from activation_days or users_raw
    SELECT day_of_birth INTO v_stored_day
    FROM public.activation_days
    WHERE student_id = p_student_id;

    IF v_stored_day IS NULL THEN
        SELECT (day_of_birth)::integer INTO v_stored_day
        FROM public.users_raw
        WHERE id = p_student_id;
    END IF;

    -- Validate day of birth if configured
    IF v_stored_day IS NOT NULL AND v_stored_day <> p_birth_day THEN
        RETURN jsonb_build_object('success', false, 'error', 'Der eingegebene Geburtstagstag stimmt nicht mit den Schuldaten überein.');
    END IF;

    -- Hash PIN with SHA-256
    v_hashed_pin := encode(extensions.digest(trim(p_new_pin), 'sha256'), 'hex');

    -- Update users_raw
    UPDATE public.users_raw SET
        parent_pin = v_hashed_pin,
        personal_pin = trim(p_new_pin),
        onboarding_pin = trim(p_new_pin),
        is_pin_activated = TRUE,
        status = 'aktiv'
    WHERE id = p_student_id;

    -- Update students table if exists
    BEGIN
        UPDATE public.students SET
            parent_pin = v_hashed_pin,
            personal_pin = trim(p_new_pin),
            onboarding_pin = trim(p_new_pin),
            is_pin_activated = TRUE,
            status = 'aktiv'
        WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Update pending_students table if exists
    BEGIN
        UPDATE public.pending_students SET
            parent_pin = v_hashed_pin,
            personal_pin = trim(p_new_pin),
            onboarding_pin = trim(p_new_pin),
            is_pin_activated = TRUE,
            status = 'aktiv'
        WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Upsert activation_days record
    INSERT INTO public.activation_days (student_id, day_of_birth)
    VALUES (p_student_id, p_birth_day)
    ON CONFLICT (student_id) DO UPDATE SET day_of_birth = p_birth_day;

    -- Log to audit
    INSERT INTO public.audit_logs (school_id, user_id, action, details)
    VALUES (v_user.school_id, p_student_id, 'STUDENT_PIN_RECLAIM_SUCCESS', 'Schüler hat über Geburtstagstag-Onboarding erfolgreich eine neue PIN vergeben.');

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.request_student_pin_reset(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.reset_student_pin_via_birth_day(UUID, TEXT, INTEGER, TEXT) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
