-- Migration 247: Strict Teacher-Student RLS & Isolation (Hardened Version)
-- Ensures unassigned students (without a teacher) or students of other teachers do not leak into another teacher's profile.

-- 1. Clean up stray schedule_occurrences and schedules for unassigned students (teacher_id IS NULL in students)
DELETE FROM public.schedule_occurrences
WHERE student_id IN (
  SELECT s.id FROM public.students s WHERE s.teacher_id IS NULL
  UNION
  SELECT u.id FROM public.users u WHERE u.role = 'student' AND u.teacher_id IS NULL
);

DELETE FROM public.schedules
WHERE student_id IN (
  SELECT s.id FROM public.students s WHERE s.teacher_id IS NULL
  UNION
  SELECT u.id FROM public.users u WHERE u.role = 'student' AND u.teacher_id IS NULL
);

-- 2. Update RLS on public.students to enforce multi-tenancy AND teacher-student boundaries
DROP POLICY IF EXISTS "students_strict_school_isolation" ON public.students;
DROP POLICY IF EXISTS "students_all" ON public.students;
DROP POLICY IF EXISTS "students_teacher_school_isolation" ON public.students;

CREATE POLICY "students_teacher_school_isolation" ON public.students
FOR ALL USING (
  is_master_admin() 
  OR (
    check_school_access(school_id) AND (
      get_current_user_role() IN ('admin', 'secretary')
      OR teacher_id = auth.uid()
      OR id = auth.uid()
    )
  )
);

-- 3. Strict RLS on public.schedule_occurrences enforcing multi-tenancy & teacher boundaries
DROP POLICY IF EXISTS "schedule_occurrences_select" ON public.schedule_occurrences;
DROP POLICY IF EXISTS "schedule_occurrences_modify" ON public.schedule_occurrences;

CREATE POLICY "schedule_occurrences_select" ON public.schedule_occurrences FOR SELECT USING (
  is_master_admin()
  OR (
    check_school_access(get_user_school_id()) AND (
      get_current_user_role() IN ('admin', 'secretary')
      OR teacher_id = auth.uid()
      OR student_id = auth.uid()
    )
  )
);

CREATE POLICY "schedule_occurrences_modify" ON public.schedule_occurrences FOR ALL USING (
  is_master_admin()
  OR (
    check_school_access(get_user_school_id()) AND (
      get_current_user_role() IN ('admin', 'secretary')
      OR teacher_id = auth.uid()
    )
  )
);

NOTIFY pgrst, 'reload schema';
