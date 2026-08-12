-- Migration 238: Trigger push notifications on new Class-Feed posts

CREATE OR REPLACE FUNCTION public.trigger_push_on_new_class_feed_post()
RETURNS TRIGGER AS $$
DECLARE
  v_teacher_name TEXT;
  v_title TEXT;
  v_body TEXT;
  v_url TEXT;
  v_notification_id UUID;
  v_student_rec RECORD;
BEGIN
  -- Get the teacher's name
  SELECT COALESCE(first_name || ' ' || last_name, 'Dein Coach')
  INTO v_teacher_name
  FROM public.users_raw
  WHERE id = NEW.teacher_id;

  v_title := 'Neuer Beitrag im Klassen-Feed 📣';
  v_body := v_teacher_name || ' hat einen neuen Beitrag gepostet: ' || COALESCE(NEW.title, '');
  v_url := '/';

  -- Case A: Targeted to an individual student
  IF NEW.student_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, metadata)
    VALUES (NEW.student_id, v_title, v_body, jsonb_build_object('post_id', NEW.id, 'type', 'class_feed'))
    RETURNING id INTO v_notification_id;

    PERFORM net.http_post(
      'http://kong:8000/functions/v1/send-push',
      jsonb_build_object(
        'userId', NEW.student_id,
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
  
  -- Case B: Targeted generally (all active students of this teacher)
  ELSE
    FOR v_student_rec IN 
      SELECT id FROM public.users_raw 
      WHERE teacher_id = NEW.teacher_id 
        AND role = 'student' 
        AND is_campus_active = true
    LOOP
      INSERT INTO public.notifications (user_id, title, message, metadata)
      VALUES (v_student_rec.id, v_title, v_body, jsonb_build_object('post_id', NEW.id, 'type', 'class_feed'))
      RETURNING id INTO v_notification_id;

      PERFORM net.http_post(
        'http://kong:8000/functions/v1/send-push',
        jsonb_build_object(
          'userId', v_student_rec.id,
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
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger binding
DROP TRIGGER IF EXISTS trigger_class_feed_post_push ON public.class_feed_posts;
CREATE TRIGGER trigger_class_feed_post_push
AFTER INSERT ON public.class_feed_posts
FOR EACH ROW EXECUTE FUNCTION public.trigger_push_on_new_class_feed_post();

NOTIFY pgrst, 'reload schema';
