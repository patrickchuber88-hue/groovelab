-- Migration: Add parent notes to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_notes TEXT;

-- Schema cache reset
NOTIFY pgrst, 'reload schema';
