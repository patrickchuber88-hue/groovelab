-- Migration 149: Trigger pushes on all schedule changes (cancellations, reschedules, room changes, resets)
-- Erstellt: 2026-06-11

CREATE OR REPLACE FUNCTION public.trigger_push_on_schedule_change()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
  v_body TEXT;
  v_url TEXT;
  v_notification_id UUID;
  v_recipient_name TEXT;
  v_sender_name TEXT;
  v_is_campus_active BOOLEAN;
  v_room_name TEXT;
  v_old_room_name TEXT;
  v_day_old TEXT;
  v_day_new TEXT;
BEGIN
  -- We trigger pushes on status changes OR time slot changes OR day of week changes OR room changes
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND (
        OLD.status IS DISTINCT FROM NEW.status OR
        OLD.time_slot IS DISTINCT FROM NEW.time_slot OR
        OLD.day_of_week IS DISTINCT FROM NEW.day_of_week OR
        OLD.room_id IS DISTINCT FROM NEW.room_id
     )) THEN

    -- Fetch basic student and teacher information
    -- Student info
    SELECT u.first_name, u.is_campus_active INTO v_recipient_name, v_is_campus_active
    FROM public.users u WHERE u.id = NEW.student_id;
    
    -- Teacher info
    SELECT t.first_name INTO v_sender_name
    FROM public.users t WHERE t.id = NEW.teacher_id;

    -- Room info
    SELECT name INTO v_room_name FROM public.rooms WHERE id = NEW.room_id;
    IF TG_OP = 'UPDATE' AND OLD.room_id IS NOT NULL THEN
      SELECT name INTO v_old_room_name FROM public.rooms WHERE id = OLD.room_id;
    END IF;

    -- Case 1: Cancelled by teacher (sick) -> Notify Student
    IF NEW.status IN ('canceled_by_teacher_sick', 'teacher_sick') THEN
      IF NEW.student_id IS NOT NULL AND v_is_campus_active = TRUE THEN
        v_title := 'Unterricht fällt aus ☕';
        v_body := 'Hallo ' || COALESCE(v_recipient_name, 'Schüler') || ', dein Unterricht heute um ' || COALESCE(NEW.time_slot, '') || ' Uhr bei ' || COALESCE(v_sender_name, 'deinem Lehrer') || ' fällt krankheitsbedingt aus.';
        v_url := '/';
        
        INSERT INTO public.notifications (user_id, title, message, metadata)
        VALUES (NEW.student_id, v_title, v_body, jsonb_build_object('schedule_id', NEW.id, 'type', NEW.status))
        RETURNING id INTO v_notification_id;

        PERFORM net.http_post(
          'http://kong:8000/functions/v1/send-push',
          jsonb_build_object('userId', NEW.student_id, 'title', v_title, 'body', v_body, 'url', v_url, 'notificationId', v_notification_id),
          '{}'::jsonb,
          jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true) || '', 'Content-Type', 'application/json')
        );
      END IF;
    END IF;

    -- Case 2: Cancelled by student -> Notify Teacher
    IF NEW.status = 'canceled_by_student' THEN
      IF NEW.teacher_id IS NOT NULL THEN
        -- Fetch teacher name as recipient
        SELECT first_name INTO v_recipient_name FROM public.users WHERE id = NEW.teacher_id;
        v_title := 'Absage Schüler ✕';
        v_body := 'Hallo ' || COALESCE(v_recipient_name, 'Lehrer') || ', dein Schüler ' || COALESCE(v_sender_name, 'Schüler') || ' hat die Stunde heute um ' || COALESCE(NEW.time_slot, '') || ' Uhr abgesagt.';
        v_url := '/';

        INSERT INTO public.notifications (user_id, title, message, metadata)
        VALUES (NEW.teacher_id, v_title, v_body, jsonb_build_object('schedule_id', NEW.id, 'type', NEW.status))
        RETURNING id INTO v_notification_id;

        PERFORM net.http_post(
          'http://kong:8000/functions/v1/send-push',
          jsonb_build_object('userId', NEW.teacher_id, 'title', v_title, 'body', v_body, 'url', v_url, 'notificationId', v_notification_id),
          '{}'::jsonb,
          jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true) || '', 'Content-Type', 'application/json')
        );
      END IF;
    END IF;

    -- Case 3: Rescheduled pending approval -> Notify Teacher
    IF NEW.status = 'pending_reschedule' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
      IF NEW.teacher_id IS NOT NULL THEN
        SELECT first_name INTO v_recipient_name FROM public.users WHERE id = NEW.teacher_id;
        v_title := 'Verschiebung erbeten 🔄';
        v_body := 'Hallo ' || COALESCE(v_recipient_name, 'Lehrer') || ', dein Schüler ' || COALESCE(v_sender_name, 'Schüler') || ' bittet um eine Verschiebung für die Stunde um ' || COALESCE(NEW.time_slot, '') || ' Uhr.';
        v_url := '/';

        INSERT INTO public.notifications (user_id, title, message, metadata)
        VALUES (NEW.teacher_id, v_title, v_body, jsonb_build_object('schedule_id', NEW.id, 'type', NEW.status))
        RETURNING id INTO v_notification_id;

        PERFORM net.http_post(
          'http://kong:8000/functions/v1/send-push',
          jsonb_build_object('userId', NEW.teacher_id, 'title', v_title, 'body', v_body, 'url', v_url, 'notificationId', v_notification_id),
          '{}'::jsonb,
          jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true) || '', 'Content-Type', 'application/json')
        );
      END IF;
    END IF;

    -- Case 4: Rescheduled confirmed -> Notify Student
    IF NEW.status = 'rescheduled_confirmed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
      IF NEW.student_id IS NOT NULL AND v_is_campus_active = TRUE THEN
        SELECT first_name INTO v_recipient_name FROM public.users WHERE id = NEW.student_id;
        v_title := 'Terminänderung bestätigt! 📅';
        v_body := 'Hallo ' || COALESCE(v_recipient_name, 'Schüler') || ', deine Verschiebung wurde von ' || COALESCE(v_sender_name, 'deinem Lehrer') || ' bestätigt. Neuer Termin ist heute um ' || COALESCE(NEW.time_slot, '') || ' Uhr.';
        v_url := '/';

        INSERT INTO public.notifications (user_id, title, message, metadata)
        VALUES (NEW.student_id, v_title, v_body, jsonb_build_object('schedule_id', NEW.id, 'type', NEW.status))
        RETURNING id INTO v_notification_id;

        PERFORM net.http_post(
          'http://kong:8000/functions/v1/send-push',
          jsonb_build_object('userId', NEW.student_id, 'title', v_title, 'body', v_body, 'url', v_url, 'notificationId', v_notification_id),
          '{}'::jsonb,
          jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true) || '', 'Content-Type', 'application/json')
        );
      END IF;
    END IF;

    -- Case 5: Direct reschedule/change of time or day of week by teacher (when approved)
    IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND (OLD.time_slot IS DISTINCT FROM NEW.time_slot OR OLD.day_of_week IS DISTINCT FROM NEW.day_of_week) THEN
      IF NEW.student_id IS NOT NULL AND v_is_campus_active = TRUE THEN
        SELECT first_name INTO v_recipient_name FROM public.users WHERE id = NEW.student_id;
        v_day_old := CASE OLD.day_of_week
          WHEN 1 THEN 'Mo.' WHEN 2 THEN 'Di.' WHEN 3 THEN 'Mi.' WHEN 4 THEN 'Do.' WHEN 5 THEN 'Fr.' WHEN 6 THEN 'Sa.' WHEN 7 THEN 'So.' ELSE ''
        END;
        v_day_new := CASE NEW.day_of_week
          WHEN 1 THEN 'Mo.' WHEN 2 THEN 'Di.' WHEN 3 THEN 'Mi.' WHEN 4 THEN 'Do.' WHEN 5 THEN 'Fr.' WHEN 6 THEN 'Sa.' WHEN 7 THEN 'So.' ELSE ''
        END;

        v_title := 'Terminänderung 🔄';
        v_body := 'Dein Termin wurde verschoben: ' || v_day_old || ' ' || substring(OLD.time_slot from 1 for 5) || ' Uhr -> ' || v_day_new || ' ' || substring(NEW.time_slot from 1 for 5) || ' Uhr. Bitte bestätige den neuen Termin.';
        v_url := '/';

        INSERT INTO public.notifications (user_id, title, message, metadata)
        VALUES (NEW.student_id, v_title, v_body, jsonb_build_object('schedule_id', NEW.id, 'type', 'rescheduled'))
        RETURNING id INTO v_notification_id;

        PERFORM net.http_post(
          'http://kong:8000/functions/v1/send-push',
          jsonb_build_object('userId', NEW.student_id, 'title', v_title, 'body', v_body, 'url', v_url, 'notificationId', v_notification_id),
          '{}'::jsonb,
          jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true) || '', 'Content-Type', 'application/json')
        );
      END IF;
    END IF;

    -- Case 6: Room changes (room_id has changed)
    IF TG_OP = 'UPDATE' AND OLD.room_id IS DISTINCT FROM NEW.room_id THEN
      -- Notify Student
      IF NEW.student_id IS NOT NULL AND v_is_campus_active = TRUE THEN
        SELECT first_name INTO v_recipient_name FROM public.users WHERE id = NEW.student_id;
        v_title := 'Raumänderung 🚪';
        v_body := 'Hallo ' || COALESCE(v_recipient_name, 'Schüler') || ', dein Unterricht bei ' || COALESCE(v_sender_name, 'deinem Lehrer') || ' findet jetzt in Raum "' || COALESCE(v_room_name, 'neuem Raum') || '" statt.';
        v_url := '/';

        INSERT INTO public.notifications (user_id, title, message, metadata)
        VALUES (NEW.student_id, v_title, v_body, jsonb_build_object('schedule_id', NEW.id, 'type', 'room_change'))
        RETURNING id INTO v_notification_id;

        PERFORM net.http_post(
          'http://kong:8000/functions/v1/send-push',
          jsonb_build_object('userId', NEW.student_id, 'title', v_title, 'body', v_body, 'url', v_url, 'notificationId', v_notification_id),
          '{}'::jsonb,
          jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true) || '', 'Content-Type', 'application/json')
        );
      END IF;

      -- Notify Teacher
      IF NEW.teacher_id IS NOT NULL THEN
        SELECT first_name INTO v_recipient_name FROM public.users WHERE id = NEW.teacher_id;
        SELECT first_name INTO v_sender_name FROM public.users WHERE id = NEW.student_id;
        v_title := 'Raumänderung 🚪';
        v_body := 'Hallo ' || COALESCE(v_recipient_name, 'Lehrer') || ', dein Unterricht mit ' || COALESCE(v_sender_name, 'Schüler') || ' findet jetzt in Raum "' || COALESCE(v_room_name, 'neuem Raum') || '" statt.';
        v_url := '/';

        INSERT INTO public.notifications (user_id, title, message, metadata)
        VALUES (NEW.teacher_id, v_title, v_body, jsonb_build_object('schedule_id', NEW.id, 'type', 'room_change'))
        RETURNING id INTO v_notification_id;

        PERFORM net.http_post(
          'http://kong:8000/functions/v1/send-push',
          jsonb_build_object('userId', NEW.teacher_id, 'title', v_title, 'body', v_body, 'url', v_url, 'notificationId', v_notification_id),
          '{}'::jsonb,
          jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true) || '', 'Content-Type', 'application/json')
        );
      END IF;
    END IF;

    -- Case 7: Reset of rescheduled/proposed change back to approved (status changes to approved, and old status was pending_reschedule or similar)
    IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status IN ('pending_reschedule', 'rescheduled_confirmed') AND (OLD.time_slot = NEW.time_slot AND OLD.day_of_week = NEW.day_of_week) THEN
      -- Reschedule canceled or reset
      IF NEW.student_id IS NOT NULL AND v_is_campus_active = TRUE THEN
        SELECT first_name INTO v_recipient_name FROM public.users WHERE id = NEW.student_id;
        v_title := 'Termin-Update 📅';
        v_body := 'Hallo ' || COALESCE(v_recipient_name, 'Schüler') || ', die angefragte Verschiebung wurde zurückgesetzt. Der Unterricht findet zum ursprünglichen Termin statt.';
        v_url := '/';

        INSERT INTO public.notifications (user_id, title, message, metadata)
        VALUES (NEW.student_id, v_title, v_body, jsonb_build_object('schedule_id', NEW.id, 'type', 'reschedule_reset'))
        RETURNING id INTO v_notification_id;

        PERFORM net.http_post(
          'http://kong:8000/functions/v1/send-push',
          jsonb_build_object('userId', NEW.student_id, 'title', v_title, 'body', v_body, 'url', v_url, 'notificationId', v_notification_id),
          '{}'::jsonb,
          jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true) || '', 'Content-Type', 'application/json')
        );
      END IF;
    END IF;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
