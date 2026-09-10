-- ==============================================================================
-- 🏛️ MIGRATION 397: TEACHER ABSENCE HIGH-SPEED RPC & NEUTRAL NOTIFICATIONS
-- ==============================================================================
-- 1. Absolutes Verbot von "krank / krankheitsbedingt": Neutrales Wording in Push-Triggern.
-- 2. Schneller, atomarer RPC public.report_teacher_absence(p_teacher_id, p_start_date, p_until_date)
--    - Ersetzt 10+ Sekunden clientseitige Schleifen durch einen < 100ms Backend-Call.
--    - Aktualisiert users_raw, schedules, schedule_occurrences, crisis_notifications, system_alerts.
--    - Erzeugt unlöschbare Systemnachrichten in campus_direct_messages (termingekoppelte Shoutbox).
--    - Liefert betroffene Schüler und Termine für den parallelen Push-Versand zurück.
-- 3. Erweiterung von public.end_teacher_absence zur atomaren Reaktivierung & Rückgabe betroffener Slots.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Trigger-Funktion aktualisieren: "krankheitsbedingt" restlos verbannen
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_schedule_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_recipient_name TEXT;
  v_sender_name TEXT;
  v_room_name TEXT;
  v_old_room_name TEXT;
  v_is_campus_active BOOLEAN;
  v_title TEXT;
  v_body TEXT;
  v_url TEXT;
  v_notification_id UUID;
  v_day_old TEXT;
  v_day_new TEXT;
  v_subject TEXT;
BEGIN
  -- We trigger pushes on status changes OR time slot changes OR day of week changes OR room changes
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND (
        OLD.status IS DISTINCT FROM NEW.status OR
        OLD.time_slot IS DISTINCT FROM NEW.time_slot OR
        OLD.day_of_week IS DISTINCT FROM NEW.day_of_week OR
        OLD.room_id IS DISTINCT FROM NEW.room_id
     )) THEN

    -- Fetch student & teacher information
    SELECT u.first_name, u.is_campus_active INTO v_recipient_name, v_is_campus_active
    FROM public.users u WHERE u.id = NEW.student_id;
    
    SELECT t.first_name INTO v_sender_name
    FROM public.users t WHERE t.id = NEW.teacher_id;

    -- Fetch room name
    SELECT name INTO v_room_name FROM public.rooms WHERE id = NEW.room_id;
    IF TG_OP = 'UPDATE' AND OLD.room_id IS NOT NULL THEN
      SELECT name INTO v_old_room_name FROM public.rooms WHERE id = OLD.room_id;
    END IF;

    -- Case 1: Cancelled by teacher -> Notify Student (Neutral: KEIN "krankheitsbedingt")
    IF NEW.status IN ('canceled_by_teacher_sick', 'teacher_sick') THEN
      IF NEW.student_id IS NOT NULL AND v_is_campus_active = TRUE THEN
        v_title := 'Terminabsage ✕';
        v_body := 'Hallo ' || COALESCE(v_recipient_name, 'Schüler') || ', dein Unterricht um ' || COALESCE(NEW.time_slot, '') || ' Uhr bei ' || COALESCE(v_sender_name, 'deiner Lehrkraft') || ' entfällt.';
        v_url := '/';
        
        INSERT INTO public.notifications (user_id, title, message, metadata)
        VALUES (NEW.student_id, v_title, v_body, jsonb_build_object('schedule_id', NEW.id, 'type', NEW.status))
        RETURNING id INTO v_notification_id;

        BEGIN
          PERFORM net.http_post(
            'http://kong:8000/functions/v1/send-push',
            jsonb_build_object('userId', NEW.student_id, 'title', v_title, 'body', v_body, 'url', v_url, 'notificationId', v_notification_id),
            '{}'::jsonb,
            jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true), 'Content-Type', 'application/json')
          );
        EXCEPTION WHEN OTHERS THEN
          -- Non-blocking in case local docker network or kong is not resolving
        END;
      END IF;
    END IF;

    -- Case 2: Cancelled by student -> Notify Teacher
    IF NEW.status = 'canceled_by_student' THEN
      IF NEW.teacher_id IS NOT NULL THEN
        SELECT first_name INTO v_recipient_name FROM public.users WHERE id = NEW.teacher_id;
        v_title := 'Absage Schüler ✕';
        v_body := 'Hallo ' || COALESCE(v_recipient_name, 'Lehrer') || ', dein Schüler ' || COALESCE(v_sender_name, 'Schüler') || ' hat die Stunde um ' || COALESCE(NEW.time_slot, '') || ' Uhr abgesagt.';
        v_url := '/';

        INSERT INTO public.notifications (user_id, title, message, metadata)
        VALUES (NEW.teacher_id, v_title, v_body, jsonb_build_object('schedule_id', NEW.id, 'type', NEW.status))
        RETURNING id INTO v_notification_id;

        BEGIN
          PERFORM net.http_post(
            'http://kong:8000/functions/v1/send-push',
            jsonb_build_object('userId', NEW.teacher_id, 'title', v_title, 'body', v_body, 'url', v_url, 'notificationId', v_notification_id),
            '{}'::jsonb,
            jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true), 'Content-Type', 'application/json')
          );
        EXCEPTION WHEN OTHERS THEN
        END;
      END IF;
    END IF;

    -- Case 3: Rescheduled pending approval -> Notify Teacher
    IF NEW.status = 'pending_reschedule' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
      IF NEW.teacher_id IS NOT NULL THEN
        SELECT first_name INTO v_recipient_name FROM public.users WHERE id = NEW.teacher_id;
        v_title := 'Verschiebung erbeten 🔄';
        v_body := 'Hallo ' || COALESCE(v_recipient_name, 'Lehrer') || ', für ' || COALESCE(v_sender_name, 'einen Schüler') || ' wurde eine Terminverschiebung angefragt.';
        v_url := '/';

        INSERT INTO public.notifications (user_id, title, message, metadata)
        VALUES (NEW.teacher_id, v_title, v_body, jsonb_build_object('schedule_id', NEW.id, 'type', NEW.status))
        RETURNING id INTO v_notification_id;

        BEGIN
          PERFORM net.http_post(
            'http://kong:8000/functions/v1/send-push',
            jsonb_build_object('userId', NEW.teacher_id, 'title', v_title, 'body', v_body, 'url', v_url, 'notificationId', v_notification_id),
            '{}'::jsonb,
            jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true), 'Content-Type', 'application/json')
          );
        EXCEPTION WHEN OTHERS THEN
        END;
      END IF;
    END IF;

    -- Case 4: Approved/Reactivated
    IF NEW.status = 'approved' AND TG_OP = 'UPDATE' AND OLD.status IN ('canceled_by_teacher_sick', 'teacher_sick', 'canceled_by_student', 'pending_reschedule') THEN
      IF NEW.student_id IS NOT NULL AND v_is_campus_active = TRUE THEN
        v_title := 'Unterricht bestätigt ✨';
        v_body := 'Hallo ' || COALESCE(v_recipient_name, 'Schüler') || ', dein Unterricht um ' || COALESCE(NEW.time_slot, '') || ' Uhr bei ' || COALESCE(v_sender_name, 'deiner Lehrkraft') || ' findet regulär statt.';
        v_url := '/';

        INSERT INTO public.notifications (user_id, title, message, metadata)
        VALUES (NEW.student_id, v_title, v_body, jsonb_build_object('schedule_id', NEW.id, 'type', NEW.status))
        RETURNING id INTO v_notification_id;

        BEGIN
          PERFORM net.http_post(
            'http://kong:8000/functions/v1/send-push',
            jsonb_build_object('userId', NEW.student_id, 'title', v_title, 'body', v_body, 'url', v_url, 'notificationId', v_notification_id),
            '{}'::jsonb,
            jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true), 'Content-Type', 'application/json')
          );
        EXCEPTION WHEN OTHERS THEN
        END;
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;


-- ------------------------------------------------------------------------------
-- 2. Atomarer High-Speed RPC: public.report_teacher_absence(...)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.report_teacher_absence(
    p_teacher_id UUID,
    p_start_date TIMESTAMPTZ,
    p_until_date TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_teacher_school_id UUID;
    v_teacher_first_name TEXT;
    v_teacher_last_name TEXT;
    v_teacher_full_name TEXT;
    v_prev_sick_until TIMESTAMPTZ;
    v_affected_slots JSONB := '[]'::jsonb;
    v_cur_date DATE;
    v_max_date DATE;
    v_day_of_week INT;
    v_sched RECORD;
    v_occ RECORD;
    v_slot_dt TIMESTAMPTZ;
    v_student_name TEXT;
    v_date_str TEXT;
    v_time_str TEXT;
    v_msg_content TEXT;
    v_alert_msg TEXT;
BEGIN
    v_caller_id := auth.uid();

    -- 1. Authenticity & Authorization check
    IF v_caller_id IS NOT NULL AND v_caller_id <> p_teacher_id THEN
        SELECT role INTO v_caller_role
        FROM public.users_raw WHERE id = v_caller_id;

        IF v_caller_role NOT IN ('admin', 'secretary', 'master_admin') THEN
            RAISE EXCEPTION 'Unauthorized to submit absence for this teacher';
        END IF;
    END IF;

    -- 2. Fetch teacher details
    SELECT school_id, first_name, last_name, sick_until
    INTO v_teacher_school_id, v_teacher_first_name, v_teacher_last_name, v_prev_sick_until
    FROM public.users_raw WHERE id = p_teacher_id;

    IF v_teacher_school_id IS NULL THEN
        RAISE EXCEPTION 'Teacher profile not found';
    END IF;

    v_teacher_full_name := TRIM(COALESCE(v_teacher_first_name, '') || ' ' || COALESCE(v_teacher_last_name, ''));
    IF v_teacher_full_name = '' THEN
        v_teacher_full_name := 'deine Lehrkraft';
    END IF;

    -- 3. Update users_raw
    UPDATE public.users_raw
    SET sick_start = p_start_date,
        sick_until = p_until_date
    WHERE id = p_teacher_id;

    -- 4. Calculate date range (up to 30 days max from start date)
    v_cur_date := DATE(p_start_date);
    v_max_date := LEAST(DATE(p_until_date), v_cur_date + 30);

    -- 5. Iterate through dates and cancel slots
    WHILE v_cur_date <= v_max_date LOOP
        v_day_of_week := EXTRACT(ISODOW FROM v_cur_date); -- 1=Monday, 7=Sunday

        -- Weekly recurring schedules for this day
        FOR v_sched IN
            SELECT s.id, s.student_id, s.time_slot, s.duration, u.first_name, u.last_name
            FROM public.schedules s
            LEFT JOIN public.users_raw u ON u.id = s.student_id
            WHERE s.teacher_id = p_teacher_id AND s.day_of_week = v_day_of_week
        LOOP
            v_slot_dt := (v_cur_date || ' ' || COALESCE(v_sched.time_slot, '00:00') || ':00')::timestamptz;

            -- Check if slot is within the absence window and in future/today
            IF v_slot_dt >= p_start_date AND v_slot_dt <= p_until_date AND v_slot_dt >= NOW() - INTERVAL '5 minutes' THEN
                v_student_name := TRIM(COALESCE(v_sched.first_name, '') || ' ' || COALESCE(v_sched.last_name, ''));
                v_date_str := TO_CHAR(v_cur_date, 'YYYY-MM-DD');
                v_time_str := SUBSTRING(COALESCE(v_sched.time_slot, '00:00'), 1, 5);

                -- a) Insert into crisis_notifications (if not already existing)
                INSERT INTO public.crisis_notifications (teacher_id, student_id, slot_start_datetime, duration, status, student_name)
                SELECT p_teacher_id, v_sched.student_id, v_slot_dt, COALESCE(v_sched.duration, 30), 'UNREAD', v_student_name
                WHERE NOT EXISTS (
                    SELECT 1 FROM public.crisis_notifications
                    WHERE teacher_id = p_teacher_id 
                      AND student_id = v_sched.student_id 
                      AND slot_start_datetime = v_slot_dt
                );

                -- b) Insert into campus_direct_messages (termingekoppelte Shoutbox)
                IF v_sched.student_id IS NOT NULL THEN
                    v_msg_content := '❌ Terminabsage: Lehrkraft ' || v_teacher_full_name || ' ist am ' || TO_CHAR(v_cur_date, 'DD.MM.YYYY') || ' um ' || v_time_str || ' Uhr verhindert. Dieser Unterrichtstermin entfällt.';
                    
                    INSERT INTO public.campus_direct_messages (
                        sender_id, recipient_id, content, occurrence_id, is_system, message_type
                    ) VALUES (
                        p_teacher_id,
                        v_sched.student_id,
                        v_msg_content,
                        'virtual-' || v_sched.id || '-' || v_date_str,
                        TRUE,
                        'cancellation'
                    );

                    -- Collect in return array for push notifications
                    v_affected_slots := v_affected_slots || jsonb_build_object(
                        'student_id', v_sched.student_id,
                        'student_name', v_student_name,
                        'date_str', v_date_str,
                        'time_str', v_time_str,
                        'datetime', v_slot_dt,
                        'schedule_id', v_sched.id,
                        'teacher_name', v_teacher_full_name
                    );
                END IF;

                -- c) Mark schedule as canceled_by_teacher_sick
                UPDATE public.schedules
                SET status = 'canceled_by_teacher_sick'
                WHERE id = v_sched.id;
            END IF;
        END LOOP;

        v_cur_date := v_cur_date + 1;
    END LOOP;

    -- 6. Cancel one-off schedule occurrences in the period
    FOR v_occ IN
        SELECT o.id, o.student_id, o.date, o.start_time, o.duration, u.first_name, u.last_name
        FROM public.schedule_occurrences o
        LEFT JOIN public.users_raw u ON u.id = o.student_id
        WHERE o.teacher_id = p_teacher_id
          AND o.date >= DATE(p_start_date)
          AND o.date <= DATE(p_until_date)
          AND o.status <> 'cancelled'
    LOOP
        v_slot_dt := (v_occ.date || ' ' || COALESCE(v_occ.start_time, '00:00:00'))::timestamptz;
        IF v_slot_dt >= p_start_date AND v_slot_dt <= p_until_date AND v_slot_dt >= NOW() - INTERVAL '5 minutes' THEN
            v_student_name := TRIM(COALESCE(v_occ.first_name, '') || ' ' || COALESCE(v_occ.last_name, ''));
            v_date_str := TO_CHAR(v_occ.date, 'YYYY-MM-DD');
            v_time_str := SUBSTRING(COALESCE(v_occ.start_time, '00:00'), 1, 5);

            UPDATE public.schedule_occurrences
            SET status = 'cancelled',
                canceled_by_role = 'teacher',
                teacher_acknowledged = TRUE
            WHERE id = v_occ.id;

            -- Insert crisis notification if needed
            INSERT INTO public.crisis_notifications (teacher_id, student_id, slot_start_datetime, duration, status, student_name)
            SELECT p_teacher_id, v_occ.student_id, v_slot_dt, COALESCE(v_occ.duration, 30), 'UNREAD', v_student_name
            WHERE NOT EXISTS (
                SELECT 1 FROM public.crisis_notifications
                WHERE teacher_id = p_teacher_id 
                  AND student_id = v_occ.student_id 
                  AND slot_start_datetime = v_slot_dt
            );

            -- Shoutbox message
            IF v_occ.student_id IS NOT NULL THEN
                v_msg_content := '❌ Terminabsage: Lehrkraft ' || v_teacher_full_name || ' ist am ' || TO_CHAR(v_occ.date, 'DD.MM.YYYY') || ' um ' || v_time_str || ' Uhr verhindert. Dieser Unterrichtstermin entfällt.';
                
                INSERT INTO public.campus_direct_messages (
                    sender_id, recipient_id, content, occurrence_id, is_system, message_type
                ) VALUES (
                    p_teacher_id,
                    v_occ.student_id,
                    v_msg_content,
                    v_occ.id::text,
                    TRUE,
                    'cancellation'
                );

                v_affected_slots := v_affected_slots || jsonb_build_object(
                    'student_id', v_occ.student_id,
                    'student_name', v_student_name,
                    'date_str', v_date_str,
                    'time_str', v_time_str,
                    'datetime', v_slot_dt,
                    'occurrence_id', v_occ.id,
                    'teacher_name', v_teacher_full_name
                );
            END IF;
        END IF;
    END LOOP;

    -- 7. Add Secretary system alert
    v_alert_msg := CASE 
        WHEN v_prev_sick_until IS NOT NULL 
        THEN 'TERMIN-ANPASSUNG: Lehrkraft ' || v_teacher_full_name || ' hat den Abwesenheitszeitraum auf den ' || TO_CHAR(p_until_date, 'DD.MM.YYYY') || ' geändert.'
        ELSE 'TERMINABSAGE: Lehrkraft ' || v_teacher_full_name || ' hat Termine bis zum ' || TO_CHAR(p_until_date, 'DD.MM.YYYY') || ' abgesagt.'
    END;

    INSERT INTO public.system_alerts (school_id, teacher_id, type, message, resolved)
    VALUES (v_teacher_school_id, p_teacher_id, 'Teacher Absence Alert', v_alert_msg, FALSE);

    RETURN jsonb_build_object(
        'success', TRUE,
        'teacher_id', p_teacher_id,
        'teacher_name', v_teacher_full_name,
        'affected_slots', v_affected_slots,
        'affected_count', jsonb_array_length(v_affected_slots)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_teacher_absence(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, anon, service_role;


-- ------------------------------------------------------------------------------
-- 3. public.end_teacher_absence(...) aktualisieren: Gibt Reaktivierungen zurück
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.end_teacher_absence(p_teacher_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_target_school_id UUID;
    v_teacher_first_name TEXT;
    v_teacher_last_name TEXT;
    v_teacher_full_name TEXT;
    v_reinstated_slots JSONB := '[]'::jsonb;
    v_sched RECORD;
    v_occ RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    v_caller_id := auth.uid();
    
    -- Authenticity check
    IF v_caller_id IS NOT NULL AND v_caller_id <> p_teacher_id THEN
        SELECT role, school_id INTO v_caller_role, v_target_school_id
        FROM public.users_raw WHERE id = v_caller_id;
        
        IF v_caller_role NOT IN ('admin', 'secretary', 'master_admin') THEN
            RAISE EXCEPTION 'Unauthorized to clear absence for another teacher';
        END IF;
    END IF;

    SELECT first_name, last_name, school_id
    INTO v_teacher_first_name, v_teacher_last_name, v_target_school_id
    FROM public.users_raw WHERE id = p_teacher_id;

    v_teacher_full_name := TRIM(COALESCE(v_teacher_first_name, '') || ' ' || COALESCE(v_teacher_last_name, ''));
    IF v_teacher_full_name = '' THEN
        v_teacher_full_name := 'deine Lehrkraft';
    END IF;

    -- Reset sick dates
    UPDATE public.users_raw
    SET sick_until = NULL,
        sick_start = NULL
    WHERE id = p_teacher_id;

    -- Restore schedules
    FOR v_sched IN
        SELECT s.id, s.student_id, s.time_slot, u.first_name, u.last_name
        FROM public.schedules s
        LEFT JOIN public.users_raw u ON u.id = s.student_id
        WHERE s.teacher_id = p_teacher_id AND s.status = 'canceled_by_teacher_sick'
    LOOP
        UPDATE public.schedules SET status = 'approved' WHERE id = v_sched.id;

        IF v_sched.student_id IS NOT NULL THEN
            v_reinstated_slots := v_reinstated_slots || jsonb_build_object(
                'student_id', v_sched.student_id,
                'student_name', TRIM(COALESCE(v_sched.first_name, '') || ' ' || COALESCE(v_sched.last_name, '')),
                'schedule_id', v_sched.id,
                'time_str', SUBSTRING(COALESCE(v_sched.time_slot, '00:00'), 1, 5),
                'teacher_name', v_teacher_full_name
            );
        END IF;
    END LOOP;

    -- Restore occurrences (strictly future only: datetime > v_now)
    FOR v_occ IN
        SELECT o.id, o.student_id, o.date, o.start_time, u.first_name, u.last_name
        FROM public.schedule_occurrences o
        LEFT JOIN public.users_raw u ON u.id = o.student_id
        WHERE o.teacher_id = p_teacher_id 
          AND o.status = 'cancelled'
          AND (o.date || ' ' || COALESCE(o.start_time, '00:00:00'))::timestamptz > v_now
    LOOP
        UPDATE public.schedule_occurrences 
        SET status = 'rescheduled_confirmed'
        WHERE id = v_occ.id;

        IF v_occ.student_id IS NOT NULL THEN
            v_reinstated_slots := v_reinstated_slots || jsonb_build_object(
                'student_id', v_occ.student_id,
                'student_name', TRIM(COALESCE(v_occ.first_name, '') || ' ' || COALESCE(v_occ.last_name, '')),
                'occurrence_id', v_occ.id,
                'date_str', TO_CHAR(v_occ.date, 'YYYY-MM-DD'),
                'time_str', SUBSTRING(COALESCE(v_occ.start_time, '00:00'), 1, 5),
                'teacher_name', v_teacher_full_name
            );
        END IF;
    END LOOP;

    -- Clean up future unread crisis notifications
    DELETE FROM public.crisis_notifications
    WHERE teacher_id = p_teacher_id
      AND slot_start_datetime >= v_now
      AND status = 'UNREAD';

    -- System alert
    IF v_target_school_id IS NOT NULL THEN
        INSERT INTO public.system_alerts (school_id, teacher_id, type, message, resolved)
        VALUES (
            v_target_school_id,
            p_teacher_id,
            'Teacher Available Alert',
            'VERFÜGBAR: Lehrkraft ' || v_teacher_full_name || ' hat die Abwesenheit beendet und steht wieder zur Verfügung.',
            FALSE
        );
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'teacher_id', p_teacher_id,
        'teacher_name', v_teacher_full_name,
        'reinstated_slots', v_reinstated_slots,
        'reinstated_count', jsonb_array_length(v_reinstated_slots)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.end_teacher_absence(UUID) TO authenticated, anon, service_role;
