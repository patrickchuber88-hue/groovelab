-- Migration 421: Add match_history JSONB column to user_song_skills and progress_matrix
-- Supports 3-milestone match lifecycle in Meisterwerk Didaktik & Gamification suite

ALTER TABLE IF EXISTS public.user_song_skills
ADD COLUMN IF NOT EXISTS match_history JSONB DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS public.progress_matrix
ADD COLUMN IF NOT EXISTS match_history JSONB DEFAULT '[]'::jsonb;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
