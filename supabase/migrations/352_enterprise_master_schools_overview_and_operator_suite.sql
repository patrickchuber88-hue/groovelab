-- ==============================================================================
-- 352_enterprise_master_schools_overview_and_operator_suite.sql
-- Enterprise+ Security Governance: Authoritative Master Admin Schools Suite
-- ==============================================================================

-- 1. Schema Enhancements on public.schools
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS operator_notes TEXT,
ADD COLUMN IF NOT EXISTS invite_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
ADD COLUMN IF NOT EXISTS avv_signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS avv_signee_name TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Indexing for fast token lookups and operator filtering
CREATE INDEX IF NOT EXISTS idx_schools_invite_token ON public.schools(invite_token);
CREATE INDEX IF NOT EXISTS idx_schools_status ON public.schools(status);

-- ------------------------------------------------------------------------------
-- 2. Authoritative PostgreSQL RPC: get_master_schools_overview
-- Zero-Trust / Data Minimization: Calculates all aggregates server-side.
-- Zero PII / raw student data is sent across the wire to the Master Admin browser.
-- ------------------------------------------------------------------------------
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
  -- Strict Fail-Closed Authorization
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
    us.latest_user_seen AS last_session_at
  FROM public.schools s
  LEFT JOIN user_stats us ON us.school_id = s.id
  ORDER BY s.name ASC;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. RPC: update_school_operator_notes
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_school_operator_notes(
  p_school_id UUID,
  p_notes TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Access Denied: Master Admin authorization required.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.schools
  SET operator_notes = p_notes
  WHERE id = p_school_id;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. RPC: extend_school_trial
-- 1-Click Goodwill Trial Extension with Audit Logging
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.extend_school_trial(
  p_school_id UUID,
  p_days INT
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_trial TIMESTAMPTZ;
  v_new_trial TIMESTAMPTZ;
  v_school_name TEXT;
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Access Denied: Master Admin authorization required.' USING ERRCODE = '42501';
  END IF;

  IF p_days <= 0 OR p_days > 180 THEN
    RAISE EXCEPTION 'Invalid trial extension days (must be between 1 and 180).' USING ERRCODE = '22023';
  END IF;

  SELECT name, COALESCE(trial_until, trial_ends_at, NOW()) INTO v_school_name, v_current_trial 
  FROM public.schools 
  WHERE id = p_school_id;

  IF v_current_trial < NOW() THEN
    v_new_trial := NOW() + (p_days || ' days')::INTERVAL;
  ELSE
    v_new_trial := v_current_trial + (p_days || ' days')::INTERVAL;
  END IF;

  UPDATE public.schools
  SET 
    is_trial = TRUE,
    trial_until = v_new_trial,
    trial_ends_at = v_new_trial,
    status = 'active',
    is_paused = FALSE
  WHERE id = p_school_id;

  -- Append to Master Audit Trail
  INSERT INTO public.master_audit_trail (
    user_id,
    action,
    status,
    details
  ) VALUES (
    auth.uid(),
    'EXTEND_TRIAL',
    'SUCCESS',
    jsonb_build_object(
      'school_id', p_school_id,
      'school_name', v_school_name,
      'extension_days', p_days,
      'previous_trial', v_current_trial,
      'new_trial', v_new_trial
    )
  );

  RETURN v_new_trial;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. RPC: regenerate_school_invite_token
-- Generates fresh cryptographic 14-day token
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.regenerate_school_invite_token(
  p_school_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_token UUID;
  v_expires TIMESTAMPTZ;
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Access Denied: Master Admin authorization required.' USING ERRCODE = '42501';
  END IF;

  v_new_token := gen_random_uuid();
  v_expires := NOW() + INTERVAL '14 days';

  UPDATE public.schools
  SET 
    invite_token = v_new_token,
    invite_expires_at = v_expires
  WHERE id = p_school_id;

  RETURN jsonb_build_object(
    'invite_token', v_new_token,
    'invite_expires_at', v_expires
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. RPC: suspend_school_with_audit
-- Fail-closed tenant suspension with mandatory reason, instant session revocation
-- and audit trail entry.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.suspend_school_with_audit(
  p_school_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_name TEXT;
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Access Denied: Master Admin authorization required.' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'Pflichtangabe fehlt: Bitte geben Sie einen Grund für die Sperrung an.' USING ERRCODE = '22023';
  END IF;

  SELECT name INTO v_school_name FROM public.schools WHERE id = p_school_id;

  -- 1. Suspend tenant
  UPDATE public.schools 
  SET 
    status = 'suspended',
    is_paused = TRUE
  WHERE id = p_school_id;

  -- 2. Revoke all active sessions for this school
  PERFORM public.revoke_school_sessions(p_school_id);

  -- 3. Audit trail
  INSERT INTO public.master_audit_trail (
    user_id,
    action,
    status,
    details
  ) VALUES (
    auth.uid(),
    'SUSPEND_SCHOOL',
    'SUCCESS',
    jsonb_build_object(
      'school_id', p_school_id,
      'school_name', v_school_name,
      'reason', TRIM(p_reason),
      'suspended_at', NOW()
    )
  );
END;
$$;

-- Grant permissions to authenticated users (functions internally enforce is_master_admin)
GRANT EXECUTE ON FUNCTION public.get_master_schools_overview() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_school_operator_notes(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.extend_school_trial(UUID, INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.regenerate_school_invite_token(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.suspend_school_with_audit(UUID, TEXT) TO authenticated, anon;
