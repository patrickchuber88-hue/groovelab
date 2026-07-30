-- Migration: 235_fix_schedule_occurrences_schema
-- Description: Adds missing columns (schedule_id, student_acknowledged, original_start_time) to schedule_occurrences, establishes foreign key constraints, creates performance indexes, and re-enables RLS.

-- 1. Add missing columns to schedule_occurrences if they do not exist
ALTER TABLE public.schedule_occurrences
  ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES public.schedules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS student_acknowledged BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_start_time TIME;

-- 2. Create missing indexes for fast date-range and teacher queries
CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_original_date ON public.schedule_occurrences(original_date);
CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_teacher_date ON public.schedule_occurrences(teacher_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_teacher_origdate ON public.schedule_occurrences(teacher_id, original_date);
CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_schedule_id ON public.schedule_occurrences(schedule_id);

-- 3. Re-enable Row Level Security (RLS) on schedule_occurrences
ALTER TABLE public.schedule_occurrences ENABLE ROW LEVEL SECURITY;

-- 4. Ensure RLS policies exist for read and write
DROP POLICY IF EXISTS schedule_occurrences_select ON public.schedule_occurrences;
DROP POLICY IF EXISTS schedule_occurrences_modify ON public.schedule_occurrences;

CREATE POLICY schedule_occurrences_select ON public.schedule_occurrences
  FOR SELECT USING (true);

CREATE POLICY schedule_occurrences_modify ON public.schedule_occurrences
  FOR ALL USING (
    auth.role() = 'authenticated' OR
    (current_setting('request.headers', true)::json->>'x-qr-token') IS NOT NULL
  );
