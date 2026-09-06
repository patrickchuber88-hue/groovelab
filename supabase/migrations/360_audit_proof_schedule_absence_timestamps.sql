-- Migration: 360_audit_proof_schedule_absence_timestamps.sql
-- Description: Revisionssichere Ausweisung von Ereignis-Datum & -Uhrzeit für Terminabsagen und Reaktivierungen in RPCs

-- 1. Authoritative RPC: cancel_student_schedule_occurrence
CREATE OR REPLACE FUNCTION public.cancel_student_schedule_occurrence(
  p_student_id UUID,
  p_occurrence_id TEXT DEFAULT NULL,
  p_date DATE DEFAULT NULL,
  p_start_time TIME DEFAULT '15:00',
  p_duration INTEGER DEFAULT 45,
  p_teacher_id UUID DEFAULT NULL,
  p_schedule_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT 'canceled_by_student'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id UUID;
  v_teacher_id UUID := p_teacher_id;
  v_student_rec RECORD;
  v_occ_id UUID := NULL;
  v_existing_id UUID := NULL;
  v_clean_occ_id UUID := NULL;
  v_student_name TEXT;
  v_date_str TEXT;
  v_time_str TEXT;
  v_now_str TEXT;
BEGIN
  IF p_student_id IS NULL OR p_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student ID and Date are required');
  END IF;

  -- 1. Validate student exists
  SELECT id, school_id, first_name, last_name, teacher_id
  INTO v_student_rec
  FROM public.users_raw
  WHERE id = p_student_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student not found');
  END IF;

  v_school_id := v_student_rec.school_id;
  IF v_teacher_id IS NULL THEN
    v_teacher_id := v_student_rec.teacher_id;
  END IF;

  v_student_name := COALESCE(v_student_rec.first_name || ' ' || SUBSTRING(COALESCE(v_student_rec.last_name, '') FROM 1 FOR 1) || '.', 'Ein Schüler');
  v_date_str := to_char(p_date, 'DD.MM.YYYY');
  v_time_str := SUBSTRING(p_start_time::text FROM 1 FOR 5);
  v_now_str := to_char(NOW() AT TIME ZONE 'Europe/Berlin', 'DD.MM.YYYY') || ' um ' || to_char(NOW() AT TIME ZONE 'Europe/Berlin', 'HH24:MI') || ' Uhr';

  -- 2. Extract clean UUID if present
  IF p_occurrence_id IS NOT NULL AND p_occurrence_id NOT LIKE 'virtual-%' AND p_occurrence_id NOT LIKE 'virt_%' AND p_occurrence_id NOT LIKE 'sched-%' THEN
    BEGIN
      v_clean_occ_id := p_occurrence_id::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_clean_occ_id := NULL;
    END;
  END IF;

  -- 3. Check for existing row in schedule_occurrences
  IF v_clean_occ_id IS NOT NULL THEN
    SELECT id, teacher_id INTO v_existing_id, v_teacher_id
    FROM public.schedule_occurrences
    WHERE id = v_clean_occ_id;
  END IF;

  IF v_existing_id IS NULL THEN
    SELECT id, teacher_id INTO v_existing_id, v_teacher_id
    FROM public.schedule_occurrences
    WHERE student_id = p_student_id
      AND date = p_date
    LIMIT 1;
  END IF;

  -- 4. Upsert occurrence
  IF v_existing_id IS NOT NULL THEN
    UPDATE public.schedule_occurrences
    SET status = 'canceled_by_student',
        canceled_by_role = 'student',
        student_acknowledged = true,
        teacher_acknowledged = false,
        notes = COALESCE(p_notes, 'canceled_by_student'),
        updated_at = NOW()
    WHERE id = v_existing_id
    RETURNING id INTO v_occ_id;
  ELSE
    INSERT INTO public.schedule_occurrences (
      schedule_id,
      student_id,
      teacher_id,
      date,
      start_time,
      duration,
      status,
      canceled_by_role,
      student_acknowledged,
      teacher_acknowledged,
      school_id,
      notes
    ) VALUES (
      p_schedule_id,
      p_student_id,
      COALESCE(v_teacher_id, v_student_rec.teacher_id),
      p_date,
      p_start_time,
      p_duration,
      'canceled_by_student',
      'student',
      true,
      false,
      v_school_id,
      COALESCE(p_notes, 'canceled_by_student')
    )
    RETURNING id INTO v_occ_id;
  END IF;

  -- 5. Send system alert to teacher
  IF v_teacher_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.system_alerts (
        school_id,
        teacher_id,
        type,
        message
      ) VALUES (
        v_school_id,
        v_teacher_id,
        'Termin abgesagt',
        '❌ Absage durch Schüler: ' || v_student_name || ' hat den Termin am ' || v_date_str || ' um ' || v_time_str || ' Uhr abgesagt (Eingang: ' || v_now_str || '). Eltern wurden benachrichtigt.'
      );
    EXCEPTION WHEN OTHERS THEN
      -- Silently handle if system_alerts table is temporarily locked
    END;

    -- 6. Insert direct system message
    BEGIN
      INSERT INTO public.campus_direct_messages (
        sender_id,
        recipient_id,
        content,
        occurrence_id,
        is_system,
        message_type
      ) VALUES (
        p_student_id,
        v_teacher_id,
        '❌ Terminabsage: Dein Unterrichtstermin am ' || v_date_str || ' um ' || v_time_str || ' Uhr fällt aus.' || E'\n' ||
        '🕒 Abgemeldet am: ' || v_now_str || ' durch Schüler:in (' || v_student_name || ').',
        COALESCE(v_occ_id::text, p_occurrence_id),
        true,
        'reschedule_notification'
      );
    EXCEPTION WHEN OTHERS THEN
      -- Silently handle if campus_direct_messages fails
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'occurrence_id', v_occ_id,
    'status', 'canceled_by_student'
  );
END;
$$;

-- 2. Authoritative RPC: undo_cancel_student_schedule_occurrence
CREATE OR REPLACE FUNCTION public.undo_cancel_student_schedule_occurrence(
  p_student_id UUID,
  p_occurrence_id TEXT DEFAULT NULL,
  p_date DATE DEFAULT NULL,
  p_start_time TIME DEFAULT '15:00',
  p_duration INTEGER DEFAULT 45,
  p_teacher_id UUID DEFAULT NULL,
  p_schedule_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id UUID;
  v_teacher_id UUID := p_teacher_id;
  v_student_rec RECORD;
  v_occ_id UUID := NULL;
  v_existing_id UUID := NULL;
  v_clean_occ_id UUID := NULL;
  v_student_name TEXT;
  v_date_str TEXT;
  v_time_str TEXT;
  v_now_str TEXT;
BEGIN
  IF p_student_id IS NULL OR p_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student ID and Date are required');
  END IF;

  -- 1. Validate student exists
  SELECT id, school_id, first_name, last_name, teacher_id
  INTO v_student_rec
  FROM public.users_raw
  WHERE id = p_student_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student not found');
  END IF;

  v_school_id := v_student_rec.school_id;
  IF v_teacher_id IS NULL THEN
    v_teacher_id := v_student_rec.teacher_id;
  END IF;

  v_student_name := COALESCE(v_student_rec.first_name || ' ' || SUBSTRING(COALESCE(v_student_rec.last_name, '') FROM 1 FOR 1) || '.', 'Ein Schüler');
  v_date_str := to_char(p_date, 'DD.MM.YYYY');
  v_time_str := SUBSTRING(p_start_time::text FROM 1 FOR 5);
  v_now_str := to_char(NOW() AT TIME ZONE 'Europe/Berlin', 'DD.MM.YYYY') || ' um ' || to_char(NOW() AT TIME ZONE 'Europe/Berlin', 'HH24:MI') || ' Uhr';

  -- 2. Check UUID
  IF p_occurrence_id IS NOT NULL AND p_occurrence_id NOT LIKE 'virtual-%' AND p_occurrence_id NOT LIKE 'virt_%' AND p_occurrence_id NOT LIKE 'sched-%' THEN
    BEGIN
      v_clean_occ_id := p_occurrence_id::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_clean_occ_id := NULL;
    END;
  END IF;

  IF v_clean_occ_id IS NOT NULL THEN
    SELECT id, teacher_id INTO v_existing_id, v_teacher_id
    FROM public.schedule_occurrences
    WHERE id = v_clean_occ_id;
  END IF;

  IF v_existing_id IS NULL THEN
    SELECT id, teacher_id INTO v_existing_id, v_teacher_id
    FROM public.schedule_occurrences
    WHERE student_id = p_student_id
      AND date = p_date
    LIMIT 1;
  END IF;

  -- 3. Restore occurrence
  IF v_existing_id IS NOT NULL THEN
    UPDATE public.schedule_occurrences
    SET status = 'scheduled',
        original_date = p_date,
        canceled_by_role = NULL,
        student_acknowledged = true,
        teacher_acknowledged = false,
        notes = NULL,
        updated_at = NOW()
    WHERE id = v_existing_id
    RETURNING id INTO v_occ_id;
  ELSE
    INSERT INTO public.schedule_occurrences (
      schedule_id,
      student_id,
      teacher_id,
      date,
      original_date,
      start_time,
      duration,
      status,
      canceled_by_role,
      student_acknowledged,
      teacher_acknowledged,
      school_id,
      notes
    ) VALUES (
      p_schedule_id,
      p_student_id,
      COALESCE(v_teacher_id, v_student_rec.teacher_id),
      p_date,
      p_date,
      p_start_time,
      p_duration,
      'scheduled',
      NULL,
      true,
      false,
      v_school_id,
      NULL
    )
    RETURNING id INTO v_occ_id;
  END IF;

  -- 4. Send system alert to teacher
  IF v_teacher_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.system_alerts (
        school_id,
        teacher_id,
        type,
        message
      ) VALUES (
        v_school_id,
        v_teacher_id,
        'Termin wiederhergestellt',
        '✅ Reaktiviert: ' || v_student_name || ' hat den Termin am ' || v_date_str || ' um ' || v_time_str || ' Uhr wieder reaktiviert (Eingang: ' || v_now_str || ').'
      );
    EXCEPTION WHEN OTHERS THEN
    END;

    BEGIN
      INSERT INTO public.campus_direct_messages (
        sender_id,
        recipient_id,
        content,
        occurrence_id,
        is_system,
        message_type
      ) VALUES (
        p_student_id,
        v_teacher_id,
        '🔄 Termin reaktiviert: Dein Unterrichtstermin am ' || v_date_str || ' um ' || v_time_str || ' Uhr findet regulär statt.' || E'\n' ||
        '🕒 Reaktiviert am: ' || v_now_str || ' durch Schüler:in (' || v_student_name || ').',
        COALESCE(v_occ_id::text, p_occurrence_id),
        true,
        'cancellation_reset'
      );
    EXCEPTION WHEN OTHERS THEN
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'occurrence_id', v_occ_id,
    'status', 'scheduled'
  );
END;
$$;

-- 3. Permissions
GRANT EXECUTE ON FUNCTION public.cancel_student_schedule_occurrence TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.undo_cancel_student_schedule_occurrence TO authenticated, anon, service_role;
