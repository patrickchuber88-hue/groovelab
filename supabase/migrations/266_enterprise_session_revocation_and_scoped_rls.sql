-- Migration 266: Enterprise Session Revocation (Remote Kill-Switch) & Scoped Tenant RLS
-- Implements instant session revocation, token versioning, and scoped multi-tenancy.

-- 1. Add session versioning columns
ALTER TABLE public.users_raw 
  ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sessions_revoked_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.schools 
  ADD COLUMN IF NOT EXISTS sessions_revoked_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Stored Procedure: Revoke all active sessions for a specific user
CREATE OR REPLACE FUNCTION public.revoke_user_sessions(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_version INT;
BEGIN
  UPDATE public.users_raw
  SET
    token_version = COALESCE(token_version, 1) + 1,
    sessions_revoked_at = timezone('utc'::text, now())
  WHERE id = p_user_id
  RETURNING token_version INTO v_new_version;

  RETURN COALESCE(v_new_version, 1);
END;
$$;

-- 3. Stored Procedure: Revoke all active sessions for an entire school
CREATE OR REPLACE FUNCTION public.revoke_school_sessions(p_school_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Update school revocation timestamp
  UPDATE public.schools
  SET sessions_revoked_at = timezone('utc'::text, now())
  WHERE id = p_school_id;

  -- Increment token version for all users of this school
  WITH updated_users AS (
    UPDATE public.users_raw
    SET
      token_version = COALESCE(token_version, 1) + 1,
      sessions_revoked_at = timezone('utc'::text, now())
    WHERE school_id = p_school_id
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM updated_users;

  RETURN v_count;
END;
$$;

-- 4. Stored Procedure: Check if a user session is still valid
CREATE OR REPLACE FUNCTION public.check_session_validity(p_user_id UUID, p_token_version INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_db_version INT;
BEGIN
  SELECT token_version INTO v_db_version
  FROM public.users_raw
  WHERE id = p_user_id;

  IF v_db_version IS NULL THEN
    RETURN false;
  END IF;

  RETURN p_token_version >= v_db_version;
END;
$$;

-- 5. Upgrade auxiliary tables to Tenant-Scoped RLS
-- Invoices
DROP POLICY IF EXISTS invoices_all ON public.invoices;
DROP POLICY IF EXISTS invoices_tenant_scoped ON public.invoices;
CREATE POLICY invoices_tenant_scoped ON public.invoices
FOR ALL TO anon, authenticated, service_role
USING (is_master_admin() OR check_school_access(school_id) OR (school_id IS NULL))
WITH CHECK (is_master_admin() OR check_school_access(school_id) OR (school_id IS NULL));

-- Buildings
DROP POLICY IF EXISTS buildings_all ON public.buildings;
DROP POLICY IF EXISTS buildings_tenant_scoped ON public.buildings;
CREATE POLICY buildings_tenant_scoped ON public.buildings
FOR ALL TO anon, authenticated, service_role
USING (is_master_admin() OR check_school_access(school_id) OR (school_id IS NULL))
WITH CHECK (is_master_admin() OR check_school_access(school_id) OR (school_id IS NULL));

-- Duties
DROP POLICY IF EXISTS duties_all ON public.duties;
DROP POLICY IF EXISTS duties_tenant_scoped ON public.duties;
CREATE POLICY duties_tenant_scoped ON public.duties
FOR ALL TO anon, authenticated, service_role
USING (is_master_admin() OR check_school_access(school_id) OR (school_id IS NULL))
WITH CHECK (is_master_admin() OR check_school_access(school_id) OR (school_id IS NULL));

-- Campus Announcements
DROP POLICY IF EXISTS campus_announcements_all ON public.campus_announcements;
DROP POLICY IF EXISTS campus_announcements_tenant_scoped ON public.campus_announcements;
CREATE POLICY campus_announcements_tenant_scoped ON public.campus_announcements
FOR ALL TO anon, authenticated, service_role
USING (is_master_admin() OR check_school_access(school_id) OR (school_id IS NULL))
WITH CHECK (is_master_admin() OR check_school_access(school_id) OR (school_id IS NULL));

-- Campus Feedback Requests
DROP POLICY IF EXISTS campus_feedback_requests_all ON public.campus_feedback_requests;
DROP POLICY IF EXISTS campus_feedback_requests_tenant_scoped ON public.campus_feedback_requests;
CREATE POLICY campus_feedback_requests_tenant_scoped ON public.campus_feedback_requests
FOR ALL TO anon, authenticated, service_role
USING (is_master_admin() OR check_school_access(school_id) OR (school_id IS NULL))
WITH CHECK (is_master_admin() OR check_school_access(school_id) OR (school_id IS NULL));

-- Room Blocked Slots
DROP POLICY IF EXISTS room_blocked_slots_all ON public.room_blocked_slots;
DROP POLICY IF EXISTS room_blocked_slots_tenant_scoped ON public.room_blocked_slots;
CREATE POLICY room_blocked_slots_tenant_scoped ON public.room_blocked_slots
FOR ALL TO anon, authenticated, service_role
USING (is_master_admin() OR check_school_access(school_id) OR (school_id IS NULL))
WITH CHECK (is_master_admin() OR check_school_access(school_id) OR (school_id IS NULL));

-- School Equipment
DROP POLICY IF EXISTS school_equipment_all ON public.school_equipment;
DROP POLICY IF EXISTS school_equipment_tenant_scoped ON public.school_equipment;
CREATE POLICY school_equipment_tenant_scoped ON public.school_equipment
FOR ALL TO anon, authenticated, service_role
USING (is_master_admin() OR check_school_access(school_id) OR (school_id IS NULL))
WITH CHECK (is_master_admin() OR check_school_access(school_id) OR (school_id IS NULL));

-- 6. Permissions Grant
GRANT EXECUTE ON FUNCTION public.revoke_user_sessions TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_school_sessions TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_session_validity TO anon, authenticated, service_role;
