-- Migration: 123_fix_occurrence_rls
-- Description: Fixes scope resolution bug in schedule_occurrences RLS policies where unqualified teacher_id resolved to public.users.teacher_id.

-- 1. Drop existing policies
DROP POLICY IF EXISTS schedule_occurrences_select ON public.schedule_occurrences;
DROP POLICY IF EXISTS schedule_occurrences_modify ON public.schedule_occurrences;

-- 2. Define corrected policies with qualified table name
CREATE POLICY schedule_occurrences_select ON public.schedule_occurrences FOR SELECT USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = schedule_occurrences.teacher_id AND public.check_school_access(u.school_id)
  )
);

CREATE POLICY schedule_occurrences_modify ON public.schedule_occurrences FOR ALL USING (
  public.is_master_admin()
  OR (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = schedule_occurrences.teacher_id AND public.check_school_access(u.school_id)
    )
    AND public.is_teacher_or_admin()
  )
);

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
