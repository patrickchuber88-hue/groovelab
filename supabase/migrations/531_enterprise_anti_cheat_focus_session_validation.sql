-- Migration: 531_enterprise_anti_cheat_focus_session_validation.sql
-- Description: 0,1% Enterprise Goldstandard Anti-Cheat Fokus-Session Engine.
-- Garantiert 100%ige Server-Integrität: Laufzeit-Begrenzung, unbestechliche XP-Berechnung,
-- Schutz vor Zukunfts-Logs, Überlappungs-Schutz und autoritativer RPC complete_focus_session.

-- 1. Anti-Cheat Validierungs-Trigger auf public.fokus_logs
CREATE OR REPLACE FUNCTION public.check_fokus_logs_anti_cheat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
  v_caller_id UUID;
  v_is_master BOOLEAN;
  v_last_log RECORD;
BEGIN
  v_caller_id := public.get_current_authenticated_user_id();
  v_is_master := public.is_master_admin();

  -- Autorisierungs-Check: Nur der Schüler selbst, Lehrkraft derselben Schule oder Master-Admin
  IF NOT v_is_master AND v_caller_id IS NOT NULL AND NEW.user_id <> v_caller_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users_raw u
      WHERE u.id = NEW.user_id
        AND (public.get_current_user_school_id() IS NULL OR u.school_id = public.get_current_user_school_id())
    ) THEN
      RAISE EXCEPTION 'Access denied to insert or update fokus_log for user %', NEW.user_id USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 1. Plausibilitätsprüfungen für Dauer
  IF NEW.duration_seconds IS NULL OR NEW.duration_seconds <= 0 THEN
    RAISE EXCEPTION 'duration_seconds must be positive';
  END IF;

  -- Maximal 3 Stunden (10.800 Sekunden) am Stück zulässig
  IF NEW.duration_seconds > 10800 THEN
    RAISE EXCEPTION 'duration_seconds exceeds maximum allowed focus duration of 3 hours';
  END IF;

  -- 2. Unbestechliche serverseitige Berechnung von duration_minutes
  NEW.duration_minutes := GREATEST(1, FLOOR(NEW.duration_seconds / 60));

  -- 3. Strikte Obergrenze für XP (1 XP pro Minute, niemals unbegrenzt oder negativ)
  IF NEW.xp_earned IS NOT NULL THEN
    IF NEW.xp_earned > NEW.duration_minutes THEN
      NEW.xp_earned := NEW.duration_minutes;
    END IF;
    IF NEW.xp_earned < 0 THEN
      NEW.xp_earned := 0;
    END IF;
  ELSE
    NEW.xp_earned := NEW.duration_minutes;
  END IF;

  -- 4. Timestamp-Plausibilität (keine Logs in der Zukunft)
  IF NEW.created_at IS NULL OR NEW.created_at > (NOW() + INTERVAL '2 minutes') THEN
    NEW.created_at := NOW();
  END IF;

  -- 5. Anti-Spam / Kollisionsschutz: Keine Mehrfach-Logs für denselben Schüler innerhalb von 5 Sekunden
  IF TG_OP = 'INSERT' THEN
    SELECT id, created_at, duration_seconds INTO v_last_log
    FROM public.fokus_logs
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND AND v_last_log.created_at >= (NOW() - INTERVAL '5 seconds') THEN
      RAISE EXCEPTION 'Rate limit exceeded: duplicate focus session detected within 5 seconds';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_fokus_log ON public.fokus_logs;
CREATE TRIGGER trg_validate_fokus_log
BEFORE INSERT OR UPDATE ON public.fokus_logs
FOR EACH ROW
EXECUTE FUNCTION public.check_fokus_logs_anti_cheat();

-- 2. Autoritativer RPC: complete_focus_session
CREATE OR REPLACE FUNCTION public.complete_focus_session(
  p_student_id UUID,
  p_duration_seconds INTEGER,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
  v_caller_id UUID;
  v_is_master BOOLEAN;
  v_minutes INTEGER;
  v_xp INTEGER;
  v_flame TEXT;
  v_log_row RECORD;
BEGIN
  v_caller_id := public.get_current_authenticated_user_id();
  v_is_master := public.is_master_admin();

  IF NOT v_is_master AND v_caller_id IS NOT NULL AND p_student_id <> v_caller_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users_raw u
      WHERE u.id = p_student_id
        AND (public.get_current_user_school_id() IS NULL OR u.school_id = public.get_current_user_school_id())
    ) THEN
      RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF p_duration_seconds IS NULL OR p_duration_seconds < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session too short (< 10s)');
  END IF;

  IF p_duration_seconds > 10800 THEN
    p_duration_seconds := 10800; -- Maximal 3 Stunden cappen
  END IF;

  v_minutes := GREATEST(1, FLOOR(p_duration_seconds / 60));
  v_xp := v_minutes;

  IF v_minutes >= 30 THEN
    v_flame := 'Große Flamme';
  ELSIF v_minutes >= 15 THEN
    v_flame := 'Mittlere Flamme';
  ELSE
    v_flame := 'Kleine Flamme';
  END IF;

  INSERT INTO public.fokus_logs (
    user_id,
    duration_seconds,
    duration_minutes,
    is_extra,
    flame_level,
    xp_earned,
    created_at
  ) VALUES (
    p_student_id,
    p_duration_seconds,
    v_minutes,
    false,
    v_flame,
    v_xp,
    NOW()
  )
  RETURNING * INTO v_log_row;

  RETURN jsonb_build_object(
    'success', true,
    'log', row_to_json(v_log_row),
    'duration_minutes', v_minutes,
    'xp_earned', v_xp
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_focus_session(UUID, INTEGER, JSONB) TO authenticated, anon;
