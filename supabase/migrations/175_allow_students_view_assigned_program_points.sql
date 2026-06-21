-- Migration: Allow students to select program points where they are assigned.
-- Author: teamwork_preview_worker_m5_1

DROP POLICY IF EXISTS campus_event_program_points_select ON public.campus_event_program_points;

CREATE POLICY campus_event_program_points_select ON public.campus_event_program_points 
FOR SELECT USING (
  public.is_master_admin()
  OR (
    public.check_school_access(school_id)
    AND (
      public.get_current_user_role() IN ('admin', 'secretary')
      OR (
        public.get_current_user_role() = 'teacher'
        AND EXISTS (
          SELECT 1 FROM public.campus_events ce
          WHERE ce.id = event_id
            AND (
              ce.visibility IS DISTINCT FROM 'private'
              OR ce.created_by = public.get_current_user_id()
              OR teacher_id = public.get_current_user_id()
            )
        )
      )
      OR (
        public.get_current_user_role() = 'student'
        AND (
          additional_feedback_responses->'assigned_students' ? public.get_current_user_id()::text
        )
      )
    )
  )
);
