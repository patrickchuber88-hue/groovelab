-- Migration: 239_fix_progress_matrix_teacher_rls.sql
-- Description: Creates a SECURITY DEFINER helper function to check student progress access bypassing RLS, and drops/re-creates progress_matrix_all policy.

-- 1. Create check_student_progress_access helper function
CREATE OR REPLACE FUNCTION public.check_student_progress_access(target_student_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security = off
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
    v_student_school uuid;
BEGIN
    -- Query the raw users table directly without row-level security checks
    SELECT school_id INTO v_student_school
    FROM public.users_raw
    WHERE id = target_student_id;
    
    IF v_student_school IS NULL THEN
        RETURN false;
    END IF;

    -- Leverage existing check_school_access helper
    RETURN public.check_school_access(v_student_school);
END;
$$;

-- 2. Drop and re-create the progress_matrix_all RLS policy
DROP POLICY IF EXISTS progress_matrix_all ON public.progress_matrix;

CREATE POLICY progress_matrix_all ON public.progress_matrix FOR ALL USING (
  public.is_master_admin()
  OR student_id = public.get_current_user_id()
  OR public.check_student_progress_access(student_id)
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = student_id AND (
      u.qr_token::text = public.get_qr_token() 
      OR u.teacher_qr_token = public.get_qr_token()
      OR u.id::text = public.get_qr_token()
    )
  )
);
