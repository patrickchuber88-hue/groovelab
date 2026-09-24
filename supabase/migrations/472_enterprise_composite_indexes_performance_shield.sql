-- ==============================================================================
-- 🚀 Migration 472: Enterprise Composite Indexes & Performance Shield
-- Platform: Campus-Groovelab (https://campus-groovelab.de)
-- Purpose:
--   1. Eliminates in-memory sorting on progress_matrix (student_id, updated_at DESC)
--   2. Enables Index-Only Scans on schedules via covering index (teacher_id, day_of_week)
--   3. Accelerates schedule_occurrences status and date lookups
-- Standard: OWASP ASVS Level 3 / ISO 27001 High-Throughput Relational Engine
-- ==============================================================================

-- 1. Index-Only & Fast Sorting on progress_matrix (Student Practice & Homework Feed)
CREATE INDEX IF NOT EXISTS idx_progress_matrix_student_updated 
  ON public.progress_matrix (student_id, updated_at DESC);

-- 2. Covering Index on schedules (Eliminates Table Heap Fetches on > 288k queries)
CREATE INDEX IF NOT EXISTS idx_schedules_teacher_day_covering 
  ON public.schedules (teacher_id, day_of_week) 
  INCLUDE (id, student_id, room_id, time_slot, duration, status);

-- 3. High-Performance Index on schedule_occurrences for calendar & crisis dashboard
CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_perf_covering
  ON public.schedule_occurrences (teacher_id, date, status)
  INCLUDE (id, student_id, start_time, duration);

-- 4. Analyze tables to update PostgreSQL query planner statistics immediately
ANALYZE public.progress_matrix;
ANALYZE public.schedules;
ANALYZE public.schedule_occurrences;
