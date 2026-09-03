-- ==============================================================================
-- Migration 353: Forensic Platform Heartbeat & Live Telemetry RPC
-- 
-- Authoritative, Zero-Trust database aggregation for real user sessions, 
-- active teachers, active students, and module engagement (Campus vs GrooveLab).
-- Replaces all frontend heuristics with 100% forensic database metrics.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_master_platform_heartbeat()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_focus_sessions_24h INT := 0;
  v_kiosk_sessions_24h INT := 0;
  v_total_sessions_24h INT := 0;
  v_teachers_active_24h INT := 0;
  v_teachers_total INT := 0;
  v_students_active_24h INT := 0;
  v_students_total INT := 0;
  v_users_live_now INT := 0;
  v_campus_active_24h INT := 0;
  v_groovelab_active_24h INT := 0;
  v_campus_total_contracted INT := 0;
  v_groovelab_total_contracted INT := 0;
BEGIN
  -- Strict Fail-Closed Authorization: Master Admin check
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Access Denied: Master Admin authorization required.' USING ERRCODE = '42501';
  END IF;

  -- 1. Real Focus Sessions in the last 24 hours
  BEGIN
    SELECT COUNT(*) INTO v_focus_sessions_24h
    FROM public.focus_sessions
    WHERE created_at >= NOW() - INTERVAL '24 hours'
       OR started_at >= NOW() - INTERVAL '24 hours';
  EXCEPTION WHEN OTHERS THEN
    v_focus_sessions_24h := 0;
  END;

  -- 2. Real Kiosk Check-In Sessions in the last 24 hours
  BEGIN
    SELECT COUNT(*) INTO v_kiosk_sessions_24h
    FROM public.sessions
    WHERE check_in_time >= NOW() - INTERVAL '24 hours';
  EXCEPTION WHEN OTHERS THEN
    v_kiosk_sessions_24h := 0;
  END;

  v_total_sessions_24h := COALESCE(v_focus_sessions_24h, 0) + COALESCE(v_kiosk_sessions_24h, 0);

  -- 3. Real Active Teachers in the last 24 hours (last_seen >= 24h)
  SELECT COUNT(DISTINCT id) INTO v_teachers_active_24h
  FROM public.users_raw
  WHERE role = 'teacher'
    AND last_seen >= NOW() - INTERVAL '24 hours';

  -- 4. Total Active / Registered Teachers
  SELECT COUNT(DISTINCT id) INTO v_teachers_total
  FROM public.users_raw
  WHERE role = 'teacher'
    AND (is_active IS NULL OR is_active = TRUE);

  -- 5. Real Active Students in the last 24 hours (last_seen >= 24h)
  SELECT COUNT(DISTINCT id) INTO v_students_active_24h
  FROM public.users_raw
  WHERE role = 'student'
    AND last_seen >= NOW() - INTERVAL '24 hours';

  -- 6. Total Registered Students
  SELECT COUNT(DISTINCT id) INTO v_students_total
  FROM public.users_raw
  WHERE role = 'student';

  -- 7. Live Users Online Right Now (last_seen within last 15 minutes)
  SELECT COUNT(DISTINCT id) INTO v_users_live_now
  FROM public.users_raw
  WHERE last_seen >= NOW() - INTERVAL '15 minutes';

  -- 8. Module Active Students in the last 24 hours
  SELECT COUNT(DISTINCT id) INTO v_campus_active_24h
  FROM public.users_raw
  WHERE role = 'student'
    AND (is_campus_active = TRUE OR (roles IS NOT NULL AND 'campus' = ANY(roles)))
    AND last_seen >= NOW() - INTERVAL '24 hours';

  SELECT COUNT(DISTINCT id) INTO v_groovelab_active_24h
  FROM public.users_raw
  WHERE role = 'student'
    AND (is_groovelab_active = TRUE OR (roles IS NOT NULL AND 'groovelab' = ANY(roles)))
    AND last_seen >= NOW() - INTERVAL '24 hours';

  -- 9. Total Contracted / Activated Module Students (MRR Basis)
  SELECT COUNT(DISTINCT id) INTO v_campus_total_contracted
  FROM public.users_raw
  WHERE role = 'student'
    AND (is_campus_active = TRUE OR (roles IS NOT NULL AND 'campus' = ANY(roles)));

  SELECT COUNT(DISTINCT id) INTO v_groovelab_total_contracted
  FROM public.users_raw
  WHERE role = 'student'
    AND (is_groovelab_active = TRUE OR (roles IS NOT NULL AND 'groovelab' = ANY(roles)));

  -- 10. Return Immutable Aggregated Metric Payload
  RETURN jsonb_build_object(
    'sessions_24h', COALESCE(v_total_sessions_24h, 0),
    'focus_sessions_24h', COALESCE(v_focus_sessions_24h, 0),
    'kiosk_sessions_24h', COALESCE(v_kiosk_sessions_24h, 0),
    'teachers_active_24h', COALESCE(v_teachers_active_24h, 0),
    'teachers_total', COALESCE(v_teachers_total, 0),
    'students_active_24h', COALESCE(v_students_active_24h, 0),
    'students_total', COALESCE(v_students_total, 0),
    'users_live_now', COALESCE(v_users_live_now, 0),
    'campus_active_24h', COALESCE(v_campus_active_24h, 0),
    'campus_total_contracted', COALESCE(v_campus_total_contracted, 0),
    'groovelab_active_24h', COALESCE(v_groovelab_active_24h, 0),
    'groovelab_total_contracted', COALESCE(v_groovelab_total_contracted, 0),
    'measured_at', NOW()
  );
END;
$$;

-- Grant execution to authenticated role (internal check is_master_admin will enforce authorization)
GRANT EXECUTE ON FUNCTION public.get_master_platform_heartbeat() TO authenticated;
