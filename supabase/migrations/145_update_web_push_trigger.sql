-- Migration 145: Update Web Push Notification Trigger to capture direct slot shifts (reschedules)
-- Erstellt: 2026-06-10

CREATE OR REPLACE FUNCTION public.trigger_push_on_schedule_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_title TEXT;
  v_body TEXT;
  v_url TEXT;
  v_notification_id UUID;
  v_recipient_name TEXT;
  v_sender_name TEXT;
  v_instrument TEXT;
  v_slot_time TEXT;
  v_is_campus_active BOOLEAN;
BEGIN
  -- We trigger pushes on status changes OR time slot changes OR day of week changes
  IF (TG_OP = 'UPDATE' AND (
        OLD.status IS DISTINCT FROM NEW.status OR
        OLD.time_slot IS DISTINCT FROM NEW.time_slot OR
        OLD.day_of_week IS DISTINCT FROM NEW.day_of_week
     )) OR (TG_OP = 'INSERT') THEN
    
    -- Case 1: Canceled by teacher (sick) -> Notify Student (if Premium)
    IF NEW.status IN ('canceled_by_teacher_sick', 'teacher_sick') THEN
      SELECT u.id, u.first_name, u.is_campus_active, t.first_name, NEW.time_slot
      INTO v_user_id, v_recipient_name, v_is_campus_active, v_sender_name, v_slot_time
      FROM public.users u
      JOIN public.users t ON t.id = NEW.teacher_id
      WHERE u.id = NEW.student_id;

      IF v_user_id IS NOT NULL AND v_is_campus_active = TRUE THEN
        v_title := 'Unterricht fällt aus ☕';
        v_body := 'Hallo ' || v_recipient_name || ', dein Unterricht heute um ' || COALESCE(v_slot_time, '') || ' Uhr bei ' || COALESCE(v_sender_name, '') || ' fällt krankheitsbedingt aus.';
        v_url := '/';
        
        INSERT INTO public.notifications (user_id, title, message, metadata)
        VALUES (v_user_id, v_title, v_body, jsonb_build_object('schedule_id', NEW.id, 'type', NEW.status))
        RETURNING id INTO v_notification_id;

        PERFORM net.http_post(
          'http://kong:8000/functions/v1/send-push',
          jsonb_build_object(
            'userId', v_user_id,
            'title', v_title,
            'body', v_body,
            'url', v_url,
            'notificationId', v_notification_id
          ),
          '{}'::jsonb,
          jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true) || '',
            'Content-Type', 'application/json'
          )
        );
      END IF;
    END IF;

    -- Case 2: Canceled by student -> Notify Teacher
    IF NEW.status = 'canceled_by_student' THEN
      SELECT t.id, t.first_name, t.is_campus_active, u.first_name, NEW.time_slot
      INTO v_user_id, v_recipient_name, v_is_campus_active, v_sender_name, v_slot_time
      FROM public.users t
      JOIN public.users u ON u.id = NEW.student_id
      WHERE t.id = NEW.teacher_id;

      IF v_user_id IS NOT NULL THEN
        v_title := 'Absage Schüler ✕';
        v_body := 'Hallo ' || v_recipient_name || ', dein Schüler ' || COALESCE(v_sender_name, '') || ' hat die Stunde heute um ' || COALESCE(v_slot_time, '') || ' Uhr abgesagt.';
        v_url := '/';

        INSERT INTO public.notifications (user_id, title, message, metadata)
        VALUES (v_user_id, v_title, v_body, jsonb_build_object('schedule_id', NEW.id, 'type', NEW.status))
        RETURNING id INTO v_notification_id;

        PERFORM net.http_post(
          'http://kong:8000/functions/v1/send-push',
          jsonb_build_object(
            'userId', v_user_id,
            'title', v_title,
            'body', v_body,
            'url', v_url,
            'notificationId', v_notification_id
          ),
          '{}'::jsonb,
          jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true) || '',
            'Content-Type', 'application/json'
          )
        );
      END IF;
    END IF;

    -- Case 3: Rescheduled pending approval -> Notify Teacher
    IF NEW.status = 'pending_reschedule' THEN
      SELECT t.id, t.first_name, u.first_name, NEW.time_slot
      INTO v_user_id, v_recipient_name, v_sender_name, v_slot_time
      FROM public.users t
      JOIN public.users u ON u.id = NEW.student_id
      WHERE t.id = NEW.teacher_id;

      IF v_user_id IS NOT NULL THEN
        v_title := 'Verschiebung erbeten 🔄';
        v_body := 'Hallo ' || v_recipient_name || ', dein Schüler ' || COALESCE(v_sender_name, '') || ' bittet um eine Verschiebung für die Stunde um ' || COALESCE(v_slot_time, '') || ' Uhr.';
        v_url := '/';

        INSERT INTO public.notifications (user_id, title, message, metadata)
        VALUES (v_user_id, v_title, v_body, jsonb_build_object('schedule_id', NEW.id, 'type', NEW.status))
        RETURNING id INTO v_notification_id;

        PERFORM net.http_post(
          'http://kong:8000/functions/v1/send-push',
          jsonb_build_object(
            'userId', v_user_id,
            'title', v_title,
            'body', v_body,
            'url', v_url,
            'notificationId', v_notification_id
          ),
          '{}'::jsonb,
          jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true) || '',
            'Content-Type', 'application/json'
          )
        );
      END IF;
    END IF;

    -- Case 4: Rescheduled confirmed -> Notify Student (if Premium)
    IF NEW.status = 'rescheduled_confirmed' THEN
      SELECT u.id, u.first_name, u.is_campus_active, t.first_name, NEW.time_slot
      INTO v_user_id, v_recipient_name, v_is_campus_active, v_sender_name, v_slot_time
      FROM public.users u
      JOIN public.users t ON t.id = NEW.teacher_id
      WHERE u.id = NEW.student_id;

      IF v_user_id IS NOT NULL AND v_is_campus_active = TRUE THEN
        v_title := 'Terminänderung bestätigt! 📅';
        v_body := 'Hallo ' || v_recipient_name || ', deine Verschiebung wurde von ' || COALESCE(v_sender_name, '') || ' bestätigt. Neuer Termin ist heute um ' || COALESCE(v_slot_time, '') || ' Uhr.';
        v_url := '/';

        INSERT INTO public.notifications (user_id, title, message, metadata)
        VALUES (v_user_id, v_title, v_body, jsonb_build_object('schedule_id', NEW.id, 'type', NEW.status))
        RETURNING id INTO v_notification_id;

        PERFORM net.http_post(
          'http://kong:8000/functions/v1/send-push',
          jsonb_build_object(
            'userId', v_user_id,
            'title', v_title,
            'body', v_body,
            'url', v_url,
            'notificationId', v_notification_id
          ),
          '{}'::jsonb,
          jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true) || '',
            'Content-Type', 'application/json'
          )
        );
      END IF;
    END IF;

    -- Case 5: Direct reschedule by teacher (time/day changed and status is approved) -> Notify Student (if Premium)
    IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND (OLD.time_slot IS DISTINCT FROM NEW.time_slot OR OLD.day_of_week IS DISTINCT FROM NEW.day_of_week) THEN
      SELECT u.id, u.first_name, u.is_campus_active, t.first_name, NEW.time_slot
      INTO v_user_id, v_recipient_name, v_is_campus_active, v_sender_name, v_slot_time
      FROM public.users u
      JOIN public.users t ON t.id = NEW.teacher_id
      WHERE u.id = NEW.student_id;

      IF v_user_id IS NOT NULL AND v_is_campus_active = TRUE THEN
        v_title := 'Unterricht verschoben 📅';
        v_body := 'Hallo ' || v_recipient_name || ', dein Unterricht bei ' || COALESCE(v_sender_name, '') || ' wurde verschoben auf ' || 
          CASE NEW.day_of_week
            WHEN 1 THEN 'Montag'
            WHEN 2 THEN 'Dienstag'
            WHEN 3 THEN 'Mittwoch'
            WHEN 4 THEN 'Donnerstag'
            WHEN 5 THEN 'Freitag'
            WHEN 6 THEN 'Samstag'
            WHEN 7 THEN 'Sonntag'
            ELSE 'einen anderen Tag'
          END || ' um ' || COALESCE(v_slot_time, '') || ' Uhr.';
        v_url := '/';

        INSERT INTO public.notifications (user_id, title, message, metadata)
        VALUES (v_user_id, v_title, v_body, jsonb_build_object('schedule_id', NEW.id, 'type', 'rescheduled'))
        RETURNING id INTO v_notification_id;

        PERFORM net.http_post(
          'http://kong:8000/functions/v1/send-push',
          jsonb_build_object(
            'userId', v_user_id,
            'title', v_title,
            'body', v_body,
            'url', v_url,
            'notificationId', v_notification_id
          ),
          '{}'::jsonb,
          jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true) || '',
            'Content-Type', 'application/json'
          )
        );
      END IF;
    END IF;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
