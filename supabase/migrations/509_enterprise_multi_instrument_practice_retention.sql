-- Migration 509: Enterprise Multi-Instrument Practice Retention & Repertoire Protection Standard (GRV-39)
-- Enables dual presence for partially mastered songs, prevents destructive repertoire wipes on deletion from "Üben",
-- and provides persistent state tracking for practice dismissal.

ALTER TABLE public.user_song_skills 
ADD COLUMN IF NOT EXISTS is_practice_dismissed BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_user_song_skills_practice_status 
ON public.user_song_skills (user_id, song_id, is_practice_dismissed);
