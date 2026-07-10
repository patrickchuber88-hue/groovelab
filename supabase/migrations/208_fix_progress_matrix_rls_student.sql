-- Migration: 208_fix_progress_matrix_rls_student
-- Description: Update progress_matrix_all RLS policy to explicitly allow students to insert/update their own homework notes.

DROP POLICY IF EXISTS progress_matrix_all ON public.progress_matrix;
CREATE POLICY progress_matrix_all ON public.progress_matrix FOR ALL USING (
  public.is_master_admin()
  OR student_id = public.get_current_user_id()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = student_id AND public.check_school_access(u.school_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = student_id AND (
      u.qr_token::text = public.get_qr_token() 
      OR u.teacher_qr_token = public.get_qr_token()
      OR u.id::text = public.get_qr_token()
    )
  )
);

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
