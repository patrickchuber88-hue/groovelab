-- Migration: 148_student_schedule_occurrences_rls
-- Description: Updates public.schedule_occurrences RLS policies to allow students to view and modify/update their own schedule occurrences (e.g. for confirming reschedules and acknowledging cancellations).

-- 1. Drop existing policies
DROP POLICY IF EXISTS schedule_occurrences_select ON public.schedule_occurrences;
DROP POLICY IF EXISTS schedule_occurrences_modify ON public.schedule_occurrences;

-- 2. Define corrected select policy allowing master admins, teachers/admins of same school, and the student themselves
CREATE POLICY schedule_occurrences_select ON public.schedule_occurrences FOR SELECT USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = schedule_occurrences.teacher_id AND public.check_school_access(u.school_id)
  )
  OR student_id = (nullif(current_setting('request.headers', true)::json->>'x-user-id', '')::uuid)
);

-- 3. Define corrected modify policy allowing master admins, teachers/admins of same school, and the student themselves
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
);

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
