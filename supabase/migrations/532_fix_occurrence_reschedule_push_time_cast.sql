-- ==============================================================================
-- MIGRATION 532: FIX OCCURRENCE RESCHEDULE PUSH TRIGGER TIME CASTING
-- Enterprise Goldstandard Fix:
-- Casts NEW.start_time (TIME WITHOUT TIME ZONE) to text / formatted time string
-- preventing PostgreSQL error 42883: function pg_catalog.substring(time, int, int) does not exist.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.trigger_push_on_occurrence_confirmation()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
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

      -- Format date and time safely (guarantees TIME type compatibility)
      v_date_formatted := to_char(NEW.date, 'DD.MM.YYYY');
      v_time_formatted := to_char(COALESCE(NEW.start_time, '12:00'::time), 'HH24:MI');

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
$$;

DROP TRIGGER IF EXISTS trg_push_on_occurrence_confirmation ON public.schedule_occurrences;
CREATE TRIGGER trg_push_on_occurrence_confirmation
  AFTER UPDATE ON public.schedule_occurrences
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_on_occurrence_confirmation();

NOTIFY pgrst, 'reload schema';
