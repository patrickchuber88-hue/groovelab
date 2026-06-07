-- Migration: 128_fix_campus_events_visibility_rls
-- Description: Updates the SELECT policy for campus_events to allow teachers to view events with visibility = 'students'.

DROP POLICY IF EXISTS campus_events_select ON public.campus_events;

CREATE POLICY campus_events_select ON public.campus_events FOR SELECT USING (
  public.is_master_admin()
  OR (
    public.check_school_access(school_id)
    AND (
      -- Creator can see it
      created_by = public.get_current_user_id()
      -- Assigned students can see it
      OR (assigned_student_ids IS NOT NULL AND public.get_current_user_id() = ANY(assigned_student_ids))
      -- Otherwise, check visibility settings
      OR (
        (visibility = 'all')
        OR (visibility = 'teachers' AND public.get_current_user_role() IN ('teacher', 'admin', 'secretary'))
        OR (visibility = 'students' AND public.get_current_user_role() IN ('student', 'teacher', 'admin', 'secretary'))
      )
    )
  )
);

NOTIFY pgrst, 'reload schema';
