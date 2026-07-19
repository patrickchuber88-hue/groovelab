-- Migration: 234_allow_anonymous_modify_schedule_occurrences
-- Description: Update schedule_occurrences modify policy to allow anonymous users with valid QR token to confirm/cancel occurrences.

DROP POLICY IF EXISTS schedule_occurrences_modify ON public.schedule_occurrences;

CREATE POLICY schedule_occurrences_modify ON public.schedule_occurrences FOR ALL USING (
  public.is_master_admin()
  OR (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = schedule_occurrences.teacher_id AND public.check_school_access(u.school_id)
    )
    AND public.is_teacher_or_admin()
  )
  OR student_id = (nullif(current_setting('request.headers', true)::json->>'x-user-id', '')::uuid)
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = schedule_occurrences.student_id AND (
      u.qr_token::text = public.get_qr_token() 
      OR u.teacher_qr_token = public.get_qr_token()
      OR u.id::text = public.get_qr_token() -- Support developer bypass token and student UUID lookup
    )
  )
);

NOTIFY pgrst, 'reload schema';
