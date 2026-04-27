-- Add highlighted_at column to track today's highlights
ALTER TABLE user_song_skills ADD COLUMN IF NOT EXISTS highlighted_at TIMESTAMP WITH TIME ZONE;
