-- Add last_practiced_at to track real-time activity in the lab
ALTER TABLE user_song_skills ADD COLUMN IF NOT EXISTS last_practiced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
