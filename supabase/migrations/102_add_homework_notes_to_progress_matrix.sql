-- Migration: 102_add_homework_notes_to_progress_matrix.sql
-- Description: Add homework_notes column to progress_matrix table for student-facing homework text.

ALTER TABLE public.progress_matrix ADD COLUMN IF NOT EXISTS homework_notes TEXT;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
