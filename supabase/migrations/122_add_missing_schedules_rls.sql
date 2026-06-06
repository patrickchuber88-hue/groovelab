-- Migration: 122_add_missing_schedules_rls
-- Description: Defines Row Level Security (RLS) policies for schedules and schedule_occurrences.

-- 1. Drop existing policies
DROP POLICY IF EXISTS schedules_select ON public.schedules;
DROP POLICY IF EXISTS schedules_modify ON public.schedules;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.schedule_occurrences;
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON public.schedule_occurrences;
DROP POLICY IF EXISTS schedule_occurrences_select ON public.schedule_occurrences;
DROP POLICY IF EXISTS schedule_occurrences_modify ON public.schedule_occurrences;

-- 2. Define policies for schedules
CREATE POLICY schedules_select ON public.schedules FOR SELECT USING (
  public.is_master_admin()
  OR public.check_school_access(school_id)
);

CREATE POLICY schedules_modify ON public.schedules FOR ALL USING (
  public.is_master_admin()
  OR (public.check_school_access(school_id) AND public.is_teacher_or_admin())
);

-- 3. Define policies for schedule_occurrences
CREATE POLICY schedule_occurrences_select ON public.schedule_occurrences FOR SELECT USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = teacher_id AND public.check_school_access(u.school_id)
  )
);

CREATE POLICY schedule_occurrences_modify ON public.schedule_occurrences FOR ALL USING (
  public.is_master_admin()
  OR (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = teacher_id AND public.check_school_access(u.school_id)
    )
    AND public.is_teacher_or_admin()
  )
);

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
