-- ==============================================================================
-- MIGRATION 285: Strict Teacher & Student Schedule Isolation in Row Level Security (RLS)
-- Restricts teachers from querying or modifying schedules and schedule_occurrences
-- belonging to other teachers in the same school.
-- School administrators and secretaries maintain full school-wide visibility.
-- ==============================================================================

-- 1. Schedules Table Policy
DROP POLICY IF EXISTS "schedules_all" ON public.schedules;
DROP POLICY IF EXISTS "Strict_MultiTenant_Schedules_All" ON public.schedules;
DROP POLICY IF EXISTS schedules_select ON public.schedules;
DROP POLICY IF EXISTS schedules_modify ON public.schedules;

CREATE POLICY "schedules_all" ON public.schedules
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR (
    (public.get_current_user_role() IN ('admin', 'secretary'))
    AND (
      public.check_school_access(school_id)
      OR school_id = public.get_current_user_school_id()
    )
  )
  OR (
    (public.get_current_user_role() = 'teacher')
    AND (
      teacher_id = public.get_current_user_id()
      OR teacher_id = auth.uid()
    )
  )
  OR (
    (public.get_current_user_role() = 'student')
    AND (
      student_id = public.get_current_user_id()
      OR student_id = auth.uid()
      OR public.check_student_progress_access(student_id)
    )
  )
  OR (
    -- Fallback for anonymous kiosk / QR / parent token sessions
    public.get_current_user_role() IS NULL
    AND (
      public.check_school_access(school_id)
      OR student_id = public.get_current_user_id()
      OR public.check_student_progress_access(student_id)
    )
  )
)
WITH CHECK (
  public.is_master_admin()
  OR (
    (public.get_current_user_role() IN ('admin', 'secretary'))
    AND (
      public.check_school_access(school_id)
      OR school_id = public.get_current_user_school_id()
    )
  )
  OR (
    (public.get_current_user_role() = 'teacher')
    AND (
      teacher_id = public.get_current_user_id()
      OR teacher_id = auth.uid()
    )
  )
  OR (
    (public.get_current_user_role() = 'student')
    AND (
      student_id = public.get_current_user_id()
      OR student_id = auth.uid()
    )
  )
);

-- 2. Schedule Occurrences Table Policy
DROP POLICY IF EXISTS "schedule_occurrences_all" ON public.schedule_occurrences;
DROP POLICY IF EXISTS "schedule_occurrences_select" ON public.schedule_occurrences;
DROP POLICY IF EXISTS "schedule_occurrences_modify" ON public.schedule_occurrences;
DROP POLICY IF EXISTS schedule_occurrences_student_modify ON public.schedule_occurrences;

CREATE POLICY "schedule_occurrences_all" ON public.schedule_occurrences
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR (
    (public.get_current_user_role() IN ('admin', 'secretary'))
    AND (
      public.check_school_access(school_id)
      OR school_id = public.get_current_user_school_id()
    )
  )
  OR (
    (public.get_current_user_role() = 'teacher')
    AND (
      teacher_id = public.get_current_user_id()
      OR teacher_id = auth.uid()
    )
  )
  OR (
    (public.get_current_user_role() = 'student')
    AND (
      student_id = public.get_current_user_id()
      OR student_id = auth.uid()
      OR public.check_student_progress_access(student_id)
    )
  )
  OR (
    -- Fallback for anonymous kiosk / QR / parent token sessions
    public.get_current_user_role() IS NULL
    AND (
      public.check_school_access(school_id)
      OR student_id = public.get_current_user_id()
      OR public.check_student_progress_access(student_id)
    )
  )
)
WITH CHECK (
  public.is_master_admin()
  OR (
    (public.get_current_user_role() IN ('admin', 'secretary'))
    AND (
      public.check_school_access(school_id)
      OR school_id = public.get_current_user_school_id()
    )
  )
  OR (
    (public.get_current_user_role() = 'teacher')
    AND (
      teacher_id = public.get_current_user_id()
      OR teacher_id = auth.uid()
    )
  )
  OR (
    (public.get_current_user_role() = 'student')
    AND (
      student_id = public.get_current_user_id()
      OR student_id = auth.uid()
    )
  )
);
