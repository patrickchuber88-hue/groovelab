-- Migration 246: Enforce Strict Multi-Tenancy RLS across all student and user tables
-- Ensures data of one school is NEVER accessible from another school's session.

-- 1. Secure view pending_students_decrypted with explicit school access check
CREATE OR REPLACE VIEW public.pending_students_decrypted AS
SELECT 
  s.id,
  s.school_id,
  s.teacher_id,
  s.instrument,
  s.status,
  s.created_at,
  s.lesson_duration,
  s.group_id,
  pgp_sym_decrypt(sfn.first_name, get_encryption_key()) AS first_name,
  sln.last_name,
  ad.day_of_birth
FROM students s
LEFT JOIN student_first_names sfn ON s.id = sfn.student_id
LEFT JOIN student_last_names sln ON s.id = sln.student_id
LEFT JOIN activation_days ad ON s.id = ad.student_id
WHERE s.status::text = 'ausstehend'::text
  AND (is_master_admin() OR check_school_access(s.school_id));

-- 2. Enforce strict RLS on core student tables
ALTER TABLE public.student_first_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_last_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_strict_school_isolation" ON public.students;
DROP POLICY IF EXISTS "students_all" ON public.students;
DROP POLICY IF EXISTS "students_select_school_scoped" ON public.students;
DROP POLICY IF EXISTS "Allow anon select students" ON public.students;

CREATE POLICY "students_strict_school_isolation" ON public.students
FOR ALL USING (
  is_master_admin() OR check_school_access(school_id)
);
