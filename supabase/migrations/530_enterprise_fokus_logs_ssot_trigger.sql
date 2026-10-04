-- Migration 530: Enterprise Fokus Logs SSOT Trigger & Data Healing
-- Fixes desync between fokus_logs, student_stats (total_focus_minutes), and avatars (xp).
-- Replaces frontend manual calculations with a rigid database trigger.

-- 0. Schema-Erweiterung für explizite XP-Vergabe in fokus_logs
ALTER TABLE public.fokus_logs ADD COLUMN IF NOT EXISTS xp_earned INTEGER;

-- 1. Create the SSOT Trigger Function
CREATE OR REPLACE FUNCTION public.handle_fokus_log_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
  v_duration_mins INTEGER := 0;
  v_xp_to_add INTEGER := 0;
  v_target_user_id UUID;
BEGIN
  -- Calculate effective minutes for this log
  IF TG_OP = 'INSERT' THEN
    v_duration_mins := COALESCE(NEW.duration_minutes, FLOOR(NEW.duration_seconds / 60), 0);
    v_xp_to_add := COALESCE(NEW.xp_earned, v_duration_mins); -- Use explicit XP if provided, otherwise 1 XP per minute
    v_target_user_id := NEW.user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_duration_mins := COALESCE(NEW.duration_minutes, FLOOR(NEW.duration_seconds / 60), 0) - COALESCE(OLD.duration_minutes, FLOOR(OLD.duration_seconds / 60), 0);
    v_xp_to_add := COALESCE(NEW.xp_earned, COALESCE(NEW.duration_minutes, FLOOR(NEW.duration_seconds / 60), 0)) - COALESCE(OLD.xp_earned, COALESCE(OLD.duration_minutes, FLOOR(OLD.duration_seconds / 60), 0));
    v_target_user_id := NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_duration_mins := -COALESCE(OLD.duration_minutes, FLOOR(OLD.duration_seconds / 60), 0);
    v_xp_to_add := -COALESCE(OLD.xp_earned, COALESCE(OLD.duration_minutes, FLOOR(OLD.duration_seconds / 60), 0));
    v_target_user_id := OLD.user_id;
  END IF;

  -- Update student_stats as the Single Source of Truth
  IF v_duration_mins <> 0 OR v_xp_to_add <> 0 THEN
    UPDATE public.student_stats
    SET 
        total_focus_minutes = GREATEST(0, COALESCE(total_focus_minutes, 0) + v_duration_mins),
        current_xp = GREATEST(0, COALESCE(current_xp, 0) + v_xp_to_add)
    WHERE student_id = v_target_user_id;

    -- Sync avatars table to ensure consistency
    UPDATE public.avatars
    SET xp = GREATEST(0, COALESCE(xp, 0) + v_xp_to_add)
    WHERE user_id = v_target_user_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Bind the Trigger
DROP TRIGGER IF EXISTS trg_fokus_logs_stats_sync ON public.fokus_logs;
CREATE TRIGGER trg_fokus_logs_stats_sync
AFTER INSERT OR UPDATE OR DELETE ON public.fokus_logs
FOR EACH ROW
EXECUTE FUNCTION public.handle_fokus_log_changes();

-- 3. Healing Script for Existing Data
DO $$
BEGIN
    -- 3a. Re-aggregate total_focus_minutes precisely from fokus_logs
    UPDATE public.student_stats ss
    SET total_focus_minutes = COALESCE((
        SELECT COALESCE(SUM(COALESCE(fl.duration_minutes, FLOOR(fl.duration_seconds / 60), 0)), 0)
        FROM public.fokus_logs fl
        WHERE fl.user_id = ss.student_id
    ), 0);

    -- 3b. Force consistency between avatars.xp and student_stats.current_xp (using avatars as the baseline for existing XP since frontend was manually mutating it)
    UPDATE public.student_stats ss
    SET current_xp = COALESCE((SELECT xp FROM public.avatars WHERE user_id = ss.student_id LIMIT 1), 0)
    WHERE current_xp <> COALESCE((SELECT xp FROM public.avatars WHERE user_id = ss.student_id LIMIT 1), 0);

    -- 3c. Ensure any missing student_stats rows are created
    INSERT INTO public.student_stats (student_id, total_focus_minutes, current_xp)
    SELECT 
        u.id,
        COALESCE((SELECT COALESCE(SUM(COALESCE(fl.duration_minutes, FLOOR(fl.duration_seconds / 60), 0)), 0) FROM public.fokus_logs fl WHERE fl.user_id = u.id), 0),
        COALESCE((SELECT xp FROM public.avatars a WHERE a.user_id = u.id LIMIT 1), 0)
    FROM public.users_raw u
    WHERE u.role = 'student'
      AND NOT EXISTS (SELECT 1 FROM public.student_stats ss WHERE ss.student_id = u.id);

END $$;
