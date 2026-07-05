-- Migration 199: Add delete_school_cascade RPC function
CREATE OR REPLACE FUNCTION public.delete_school_cascade(p_school_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = 0
AS $$
BEGIN
  -- Security check: only master admins (or database service_role / superuser) are allowed to delete schools
  IF current_user <> 'postgres' AND auth.role() <> 'service_role' AND NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Zugriff verweigert: Nur Master-Admins dürfen Schulen löschen.';
  END IF;

  -- 1. Delete users first to satisfy the audit_logs foreign key constraint
  DELETE FROM public.users WHERE school_id = p_school_id;

  -- 2. Delete the school itself
  DELETE FROM public.schools WHERE id = p_school_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_school_cascade(UUID) TO authenticated, service_role;
