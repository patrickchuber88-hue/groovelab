-- Migration: 169_allow_anonymous_qr_land_rls
-- Description: Update RLS policies to allow anonymous users with valid x-qr-token header to read student schedules, progress_matrix (homework), and schedule_occurrences.

DROP POLICY IF EXISTS schedules_select ON public.schedules;
CREATE POLICY schedules_select ON public.schedules FOR SELECT USING (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = student_id AND (u.qr_token::text = public.get_qr_token() OR u.teacher_qr_token = public.get_qr_token())
  )
);

DROP POLICY IF EXISTS progress_matrix_all ON public.progress_matrix;
CREATE POLICY progress_matrix_all ON public.progress_matrix FOR ALL USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = student_id AND public.check_school_access(u.school_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = student_id AND (u.qr_token::text = public.get_qr_token() OR u.teacher_qr_token = public.get_qr_token())
  )
);

DROP POLICY IF EXISTS schedule_occurrences_select ON public.schedule_occurrences;
CREATE POLICY schedule_occurrences_select ON public.schedule_occurrences FOR SELECT USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = teacher_id AND public.check_school_access(u.school_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = student_id AND (u.qr_token::text = public.get_qr_token() OR u.teacher_qr_token = public.get_qr_token())
  )
);
