-- Migration 237: Add reset_school_data RPC function for factory resetting a school
CREATE OR REPLACE FUNCTION public.reset_school_data(p_school_id UUID, p_admin_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = 0
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_roles TEXT[];
BEGIN
  -- 1. Security Check: the calling user must be an admin of this school
  SELECT role, roles INTO v_caller_role, v_caller_roles
  FROM public.users_raw
  WHERE id = p_admin_id AND school_id = p_school_id;

  IF v_caller_role <> 'admin' AND NOT ('admin' = ANY(v_caller_roles)) THEN
    RAISE EXCEPTION 'Zugriff verweigert: Nur Administratoren dürfen die Schule zurücksetzen.';
  END IF;

  -- 2. Delete educational and scheduling records first
  DELETE FROM public.schedules WHERE school_id = p_school_id;
  DELETE FROM public.lessons WHERE school_id = p_school_id;
  DELETE FROM public.campus_events WHERE school_id = p_school_id;
  DELETE FROM public.lehrwerke WHERE school_id = p_school_id;
  DELETE FROM public.exercises WHERE school_id = p_school_id;
  DELETE FROM public.bands WHERE school_id = p_school_id;
  
  -- 3. Delete check-ins, help requests, etc. for all users in this school
  DELETE FROM public.sessions WHERE user_id IN (SELECT id FROM public.users_raw WHERE school_id = p_school_id);
  DELETE FROM public.help_requests WHERE user_id IN (SELECT id FROM public.users_raw WHERE school_id = p_school_id);

  -- 4. Delete all users of this school except the admins
  DELETE FROM public.users_raw
  WHERE school_id = p_school_id
    AND id <> p_admin_id
    AND role <> 'admin'
    AND NOT ('admin' = ANY(roles));

END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_school_data(UUID, UUID) TO authenticated, service_role;
