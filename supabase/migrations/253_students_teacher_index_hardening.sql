-- Migration 253: Performance Indexes for Teacher-Student Queries
-- Optimizes queries filtering students by school_id and teacher_id in Schüler-Board and Teacher Dashboard

CREATE INDEX IF NOT EXISTS idx_students_school_teacher ON public.students(school_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_users_raw_school_teacher ON public.users_raw(school_id, teacher_id) WHERE role = 'student';

NOTIFY pgrst, 'reload schema';
