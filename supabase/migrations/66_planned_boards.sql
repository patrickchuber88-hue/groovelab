-- Migration 66: Add planned_boards JSONB column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS planned_boards JSONB DEFAULT '[]';

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
