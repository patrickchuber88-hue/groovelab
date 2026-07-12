-- Migration 202: Anti-Cheat Database Trigger for fokus_logs
CREATE OR REPLACE FUNCTION public.check_fokus_logs_cheating()
RETURNS TRIGGER AS $$
DECLARE
  v_usage_mode VARCHAR(50);
BEGIN
  -- Fetch user's app_usage_mode
  SELECT app_usage_mode INTO v_usage_mode FROM public.users WHERE id = NEW.user_id;

  -- Only apply anti-cheat trigger to student_only users
  IF v_usage_mode = 'student_only' THEN
    -- Overwrite created_at on INSERT to prevent spoofing the start time
    IF TG_OP = 'INSERT' THEN
      NEW.created_at := NOW();
      -- Allow initial insert of up to 15 seconds
      IF NEW.duration_seconds > 15 THEN
        RAISE EXCEPTION 'Initial duration_seconds too large';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Prevent changing created_at
      NEW.created_at := OLD.created_at;
      -- Ensure duration_seconds does not exceed the time elapsed since creation
      IF NEW.duration_seconds > EXTRACT(EPOCH FROM (NOW() - OLD.created_at)) + 15 THEN
        RAISE EXCEPTION 'duration_seconds exceeds elapsed time since session start';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_fokus_logs_cheating ON public.fokus_logs;

CREATE TRIGGER trg_check_fokus_logs_cheating
BEFORE INSERT OR UPDATE ON public.fokus_logs
FOR EACH ROW
EXECUTE FUNCTION public.check_fokus_logs_cheating();
