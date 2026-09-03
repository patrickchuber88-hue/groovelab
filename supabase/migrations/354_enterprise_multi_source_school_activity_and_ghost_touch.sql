-- ==============================================================================
-- Migration 354: Enterprise Multi-Source School Activity & Ghost Mode Touch
-- 
-- 1. Upgrades get_master_schools_overview() with Multi-Source Activity Aggregation
--    (users_raw.last_seen, session_leases.last_active_at, focus_sessions.created_at,
--     sessions.check_in_time, audit_logs.created_at).
-- 2. Eliminates 'Inaktiv (59d)' false positives for schools where admins or 
--    support engineers have active sessions.
-- 3. Provides public.touch_school_activity(p_school_id UUID) RPC.
-- 4. Provides public.terminate_support_ghost_session(p_lease_id, p_school_id) RPC
--    for atomic lease revocation and dual-audit-logging (DSGVO Art. 28/32).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_master_schools_overview()
RETURNS TABLE (
  school_id UUID,
  name TEXT,
  legal_name TEXT,
  zip_code TEXT,
  city TEXT,
  street TEXT,
  house_number TEXT,
  phone_number TEXT,
  billing_email TEXT,
  billing_contact_person TEXT,
  status TEXT,
  is_trial BOOLEAN,
  trial_until TIMESTAMPTZ,
  has_campus_subscription BOOLEAN,
  has_groovelab_subscription BOOLEAN,
  is_paused BOOLEAN,
  subscription_bypass BOOLEAN,
  storage_addon_gb INT,
  storage_addon_monthly_fee NUMERIC,
  created_at TIMESTAMPTZ,
  operator_notes TEXT,
  invite_token UUID,
  invite_expires_at TIMESTAMPTZ,
  avv_signed_at TIMESTAMPTZ,
  avv_signee_name TEXT,
  teacher_count BIGINT,
  campus_active_students BIGINT,
  groovelab_active_students BIGINT,
  total_students BIGINT,
  storage_used_bytes BIGINT,
  last_session_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Strict Fail-Closed Master Admin Authorization
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Access Denied: Master Admin authorization required.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      u.school_id,
      COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'teacher' AND (u.is_active IS NULL OR u.is_active = TRUE)) AS teachers,
      COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'student' AND (u.is_campus_active = TRUE OR (u.roles IS NOT NULL AND 'campus' = ANY(u.roles)))) AS campus_students,
      COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'student' AND (u.is_groovelab_active = TRUE OR (u.roles IS NOT NULL AND 'groovelab' = ANY(u.roles)))) AS groovelab_students,
      COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'student') AS total_students_cnt,
      MAX(GREATEST(u.last_seen, u.created_at)) AS latest_user_seen
    FROM public.users_raw u
    GROUP BY u.school_id
  ),
  lease_stats AS (
    SELECT 
      sl.school_id, 
      MAX(GREATEST(sl.last_active_at, sl.created_at)) AS latest_lease_at
    FROM public.session_leases sl
    WHERE sl.school_id IS NOT NULL
    GROUP BY sl.school_id
  ),
  session_stats AS (
    SELECT 
      u.school_id, 
      MAX(s.check_in_time) AS latest_session_at
    FROM public.sessions s
    JOIN public.users_raw u ON u.id = s.user_id
    WHERE u.school_id IS NOT NULL
    GROUP BY u.school_id
  ),
  focus_stats AS (
    SELECT 
      fs.school_id, 
      MAX(GREATEST(fs.created_at, fs.started_at)) AS latest_focus_at
    FROM public.focus_sessions fs
    WHERE fs.school_id IS NOT NULL
    GROUP BY fs.school_id
  ),
  audit_raw AS (
    SELECT 
      (details->>'school_id')::UUID AS school_id,
      MAX(created_at) AS latest_audit_at
    FROM public.audit_logs
    WHERE details->>'school_id' IS NOT NULL 
      AND details->>'school_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    GROUP BY (details->>'school_id')::UUID
    UNION ALL
    SELECT 
      target_id::UUID AS school_id,
      MAX(created_at) AS latest_audit_at
    FROM public.audit_logs
    WHERE target_type = 'schools' 
      AND target_id IS NOT NULL 
      AND target_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    GROUP BY target_id::UUID
  ),
  audit_agg AS (
    SELECT 
      ar.school_id, 
      MAX(ar.latest_audit_at) AS latest_audit_at
    FROM audit_raw ar
    WHERE ar.school_id IS NOT NULL
    GROUP BY ar.school_id
  )
  SELECT 
    s.id AS school_id,
    s.name::TEXT,
    s.legal_name::TEXT,
    s.zip_code::TEXT,
    s.city::TEXT,
    s.street::TEXT,
    s.house_number::TEXT,
    s.phone_number::TEXT,
    s.billing_email::TEXT,
    s.billing_contact_person::TEXT,
    COALESCE(s.status, 'active')::TEXT AS status,
    COALESCE(s.is_trial, FALSE) AS is_trial,
    COALESCE(s.trial_until, s.trial_ends_at) AS trial_until,
    COALESCE(s.has_campus_subscription, FALSE) AS has_campus_subscription,
    COALESCE(s.has_groovelab_subscription, FALSE) AS has_groovelab_subscription,
    COALESCE(s.is_paused, FALSE) AS is_paused,
    COALESCE(s.subscription_bypass, FALSE) AS subscription_bypass,
    COALESCE(s.storage_addon_gb, 0)::INT AS storage_addon_gb,
    COALESCE(s.storage_addon_monthly_fee, 0.00)::NUMERIC AS storage_addon_monthly_fee,
    s.created_at,
    s.operator_notes::TEXT,
    s.invite_token,
    s.invite_expires_at,
    s.avv_signed_at,
    s.avv_signee_name::TEXT,
    COALESCE(us.teachers, 0)::BIGINT AS teacher_count,
    COALESCE(us.campus_students, 0)::BIGINT AS campus_active_students,
    COALESCE(us.groovelab_students, 0)::BIGINT AS groovelab_active_students,
    COALESCE(us.total_students_cnt, 0)::BIGINT AS total_students,
    COALESCE(s.storage_used_bytes, 0)::BIGINT AS storage_used_bytes,
    GREATEST(
      COALESCE(us.latest_user_seen, s.created_at),
      COALESCE(ls.latest_lease_at, s.created_at),
      COALESCE(ss.latest_session_at, s.created_at),
      COALESCE(fs.latest_focus_at, s.created_at),
      COALESCE(aa.latest_audit_at, s.created_at),
      s.created_at
    ) AS last_session_at
  FROM public.schools s
  LEFT JOIN user_stats us ON us.school_id = s.id
  LEFT JOIN lease_stats ls ON ls.school_id = s.id
  LEFT JOIN session_stats ss ON ss.school_id = s.id
  LEFT JOIN focus_stats fs ON fs.school_id = s.id
  LEFT JOIN audit_agg aa ON aa.school_id = s.id
  ORDER BY s.name ASC;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. RPC: touch_school_activity (Updates school activity timestamp)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_school_activity(p_school_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := public.get_current_authenticated_user_id();
BEGIN
  IF NOT (public.is_master_admin() OR public.get_current_user_school_id() = p_school_id) THEN
    RAISE EXCEPTION 'Access Denied: Authorization required to touch school activity.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.audit_logs (
    user_id,
    action,
    target_type,
    target_id,
    details,
    created_at
  ) VALUES (
    v_caller_id,
    'SCHOOL_ACTIVITY_TOUCH',
    'schools',
    p_school_id,
    jsonb_build_object('touched_at', NOW()),
    NOW()
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. RPC: terminate_support_ghost_session (Atomic Revocation & Dual-Audit)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.terminate_support_ghost_session(
  p_lease_id UUID,
  p_school_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp
AS $$
DECLARE
  v_lease RECORD;
  v_school_id UUID := p_school_id;
  v_duration_minutes INT := 1;
BEGIN
  SELECT * INTO v_lease
  FROM public.session_leases
  WHERE id = p_lease_id;

  IF v_lease.id IS NOT NULL THEN
    v_school_id := COALESCE(v_school_id, v_lease.school_id);
    v_duration_minutes := GREATEST(1, ROUND(EXTRACT(EPOCH FROM (NOW() - v_lease.created_at)) / 60));

    -- Revoke session lease
    UPDATE public.session_leases
    SET is_revoked = TRUE,
        last_active_at = NOW()
    WHERE id = p_lease_id;
  END IF;

  -- Dual Audit Logging:
  -- 1. Master Audit Trail
  -- 2. School Audit Trail (accessible by principal in privacy portal)
  IF v_school_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      target_type,
      target_id,
      details,
      created_at
    ) VALUES (
      public.get_current_authenticated_user_id(),
      'GHOST_SUPPORT_SESSION_COMPLETED',
      'schools',
      v_school_id,
      jsonb_build_object(
        'lease_id', p_lease_id,
        'school_id', v_school_id,
        'duration_minutes', v_duration_minutes,
        'completed_at', NOW()
      ),
      NOW()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'duration_minutes', v_duration_minutes,
    'lease_id', p_lease_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_master_schools_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_school_activity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.terminate_support_ghost_session(UUID, UUID) TO authenticated;
