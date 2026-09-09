-- ==============================================================================
-- MIGRATION 392: ENTERPRISE RESCHEDULE PUSH DEEPLINK & TEACHER FEEDBACK LOOP
-- Tier-1 Push Notification & Mobile Synchronization:
-- 1. Sets deep-link url '/?reschedule_id=[ID]' for rescheduled appointments so 
--    students tapping the notification are routed directly to the bottom-sheet.
-- 2. Sends immediate push notification to teacher when student acknowledges/confirms.
-- ==============================================================================

-- 1. Occurrence Push Trigger for Real-Time Teacher Confirmation Feedback
CREATE OR REPLACE FUNCTION public.trigger_push_on_occurrence_confirmation()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
  v_body TEXT;
  v_url TEXT := '/';
  v_notification_id UUID;
  v_student_name TEXT;
  v_teacher_name TEXT;
  v_time_formatted TEXT;
  v_date_formatted TEXT;
BEGIN
  -- Trigger when student confirms / acknowledges a rescheduled occurrence
  IF (TG_OP = 'UPDATE' AND (
      (NEW.status = 'rescheduled_confirmed' AND OLD.status IS DISTINCT FROM 'rescheduled_confirmed') OR
      (NEW.student_acknowledged = TRUE AND COALESCE(OLD.student_acknowledged, FALSE) = FALSE)
     )) THEN

    IF NEW.teacher_id IS NOT NULL THEN
      -- Get student name
      SELECT COALESCE(first_name, 'Dein Schüler') INTO v_student_name 
      FROM public.users WHERE id = NEW.student_id;

      -- Format date and time
      v_date_formatted := to_char(NEW.date, 'DD.MM.YYYY');
      v_time_formatted := substring(COALESCE(NEW.start_time, '12:00') from 1 for 5);

      v_title := 'Termin bestätigt! 📅';
      v_body := COALESCE(v_student_name, 'Dein Schüler') || ' hat den Termin am ' || v_date_formatted || ' um ' || v_time_formatted || ' Uhr bestätigt.';

      INSERT INTO public.notifications (user_id, title, message, metadata)
      VALUES (NEW.teacher_id, v_title, v_body, jsonb_build_object('occurrence_id', NEW.id, 'status', NEW.status, 'type', 'rescheduled_confirmed'))
      RETURNING id INTO v_notification_id;

      -- Fire Web-Push
      BEGIN
        PERFORM net.http_post(
          'http://kong:8000/functions/v1/send-push',
          jsonb_build_object('userId', NEW.teacher_id, 'title', v_title, 'body', v_body, 'url', v_url, 'notificationId', v_notification_id),
          '{}'::jsonb,
          jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true), 'Content-Type', 'application/json')
        );
      EXCEPTION WHEN OTHERS THEN
        NULL; -- fail-safe
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to schedule_occurrences
DROP TRIGGER IF EXISTS trg_push_on_occurrence_confirmation ON public.schedule_occurrences;
CREATE TRIGGER trg_push_on_occurrence_confirmation
  AFTER UPDATE ON public.schedule_occurrences
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_on_occurrence_confirmation();

-- 2. Enhanced Schedule Push Trigger with Deep-Link URL
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
          jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true), 'Content-Type', 'application/json')
        );
      END IF;
    END IF;

    -- Case 2: Cancelled by student -> Notify Teacher
    IF NEW.status = 'canceled_by_student' THEN
      IF NEW.teacher_id IS NOT NULL THEN
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
          jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true), 'Content-Type', 'application/json')
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
          jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true), 'Content-Type', 'application/json')
        );
      END IF;
    END IF;

    -- Case 4: Rescheduled confirmed -> Notify Student & Teacher
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
          jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true), 'Content-Type', 'application/json')
        );
      END IF;
    END IF;

    -- Case 5: Direct reschedule/change of time or day by teacher -> DEEP-LINK URL TO STUDENT WITH APPLE-LEVEL RICH COPYWRITING
    IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND (OLD.time_slot IS DISTINCT FROM NEW.time_slot OR OLD.day_of_week IS DISTINCT FROM NEW.day_of_week) THEN
      IF NEW.student_id IS NOT NULL AND v_is_campus_active = TRUE THEN
        SELECT first_name INTO v_recipient_name FROM public.users WHERE id = NEW.student_id;
        v_day_old := CASE OLD.day_of_week
          WHEN 1 THEN 'Mo.' WHEN 2 THEN 'Di.' WHEN 3 THEN 'Mi.' WHEN 4 THEN 'Do.' WHEN 5 THEN 'Fr.' WHEN 6 THEN 'Sa.' WHEN 7 THEN 'So.' ELSE ''
        END;
        v_day_new := CASE NEW.day_of_week
          WHEN 1 THEN 'Mo.' WHEN 2 THEN 'Di.' WHEN 3 THEN 'Mi.' WHEN 4 THEN 'Do.' WHEN 5 THEN 'Fr.' WHEN 6 THEN 'Sa.' WHEN 7 THEN 'So.' ELSE ''
        END;

        -- Resolve subject/instrument or fallback to Unterricht
        v_subject := COALESCE(NULLIF(NEW.subject, ''), 'Unterricht');

        -- Apple-Level Rich Copywriting
        v_title := v_subject || ' verschoben 📅';
        v_body := COALESCE(v_sender_name, 'Dein Lehrer') || ' schlägt vor: ' || v_day_new || ', ' || substring(NEW.time_slot from 1 for 5) || ' Uhr (statt ' || v_day_old || ', ' || substring(OLD.time_slot from 1 for 5) || ' Uhr). Tippen zum Prüfen ➔';
        -- Deep-Link to open Mobile Bottom-Sheet directly
        v_url := '/?reschedule_id=' || NEW.id;

        INSERT INTO public.notifications (user_id, title, message, metadata)
        VALUES (
          NEW.student_id,
          v_title,
          v_body,
          jsonb_build_object(
            'schedule_id', NEW.id,
            'type', 'rescheduled',
            'actions', jsonb_build_array(jsonb_build_object('action', 'review', 'title', 'Termin prüfen 📱'))
          )
        )
        RETURNING id INTO v_notification_id;

        PERFORM net.http_post(
          'http://kong:8000/functions/v1/send-push',
          jsonb_build_object(
            'userId', NEW.student_id,
            'title', v_title,
            'body', v_body,
            'url', v_url,
            'notificationId', v_notification_id,
            'actions', jsonb_build_array(jsonb_build_object('action', 'review', 'title', 'Termin prüfen 📱'))
          ),
          '{}'::jsonb,
          jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true), 'Content-Type', 'application/json')
        );
      END IF;
    END IF;

    -- Case 6: Room changes
    IF TG_OP = 'UPDATE' AND OLD.room_id IS DISTINCT FROM NEW.room_id THEN
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
          jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true), 'Content-Type', 'application/json')
        );
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
