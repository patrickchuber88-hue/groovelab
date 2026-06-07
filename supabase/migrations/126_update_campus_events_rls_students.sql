-- Migration: 126_update_campus_events_rls_students
-- Description: Allow students who are assigned to a private event to read (select) it.

DROP POLICY IF EXISTS campus_events_select ON public.campus_events;

CREATE POLICY campus_events_select ON public.campus_events FOR SELECT USING (
  public.is_master_admin()
  OR (
    public.check_school_access(school_id)
    AND (
      is_public = true 
      OR created_by = public.get_current_user_id()
      OR (assigned_student_ids IS NOT NULL AND public.get_current_user_id() = ANY(assigned_student_ids))
    )
  )
);

NOTIFY pgrst, 'reload schema';
