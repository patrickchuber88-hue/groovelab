-- Migration 251: Hardened Schedule Occurrences DB & High-Performance Indexes (Remediated)
-- Establishes 100% reliable database schema, unique constraints, performance indexes, and strict multi-tenancy RLS for Campus-Groovelab schedule occurrences.

-- 1. Ensure all essential columns exist on public.schedule_occurrences with proper FKs
ALTER TABLE public.schedule_occurrences
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS student_id UUID,
  ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES public.schedules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS room_override_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_date DATE,
  ADD COLUMN IF NOT EXISTS original_start_time TIME,
  ADD COLUMN IF NOT EXISTS student_acknowledged BOOLEAN NOT NULL DEFAULT false;

-- 2. Add Unique Index to prevent duplicate occurrences for same schedule & date
CREATE UNIQUE INDEX IF NOT EXISTS idx_sched_occ_unique_schedule_date 
  ON public.schedule_occurrences(schedule_id, date) 
  WHERE schedule_id IS NOT NULL;

-- 3. Create high-performance compound indexes for date range queries, teacher filtering, and multi-tenancy
CREATE INDEX IF NOT EXISTS idx_sched_occ_school_teacher_date 
  ON public.schedule_occurrences(school_id, teacher_id, date);

CREATE INDEX IF NOT EXISTS idx_sched_occ_school_teacher_origdate 
  ON public.schedule_occurrences(school_id, teacher_id, original_date);

CREATE INDEX IF NOT EXISTS idx_sched_occ_student_date 
  ON public.schedule_occurrences(student_id, date);

CREATE INDEX IF NOT EXISTS idx_sched_occ_student_origdate 
  ON public.schedule_occurrences(student_id, original_date);

-- 4. Hardened Multi-Tenancy RLS policies for schedule_occurrences
ALTER TABLE public.schedule_occurrences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedule_occurrences_select" ON public.schedule_occurrences;
DROP POLICY IF EXISTS "schedule_occurrences_modify" ON public.schedule_occurrences;

CREATE POLICY "schedule_occurrences_select" ON public.schedule_occurrences FOR SELECT USING (
  is_master_admin()
  OR (
    check_school_access(school_id) AND (
      get_current_user_role() IN ('admin', 'secretary')
      OR teacher_id = auth.uid()
      OR student_id = auth.uid()
      OR student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    )
  )
);

CREATE POLICY "schedule_occurrences_modify" ON public.schedule_occurrences FOR ALL USING (
  is_master_admin()
  OR (
    check_school_access(school_id) AND (
      get_current_user_role() IN ('admin', 'secretary')
      OR teacher_id = auth.uid()
    )
  )
);

NOTIFY pgrst, 'reload schema';
