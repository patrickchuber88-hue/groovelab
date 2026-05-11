-- 27: Band Founding Process
-- This migration adds support for tracking consent and founding details for new bands.

-- 1. Add status and founder flag to band_song_slots
ALTER TABLE public.band_song_slots ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'joined'; -- 'joined', 'accepted', 'rejected'
ALTER TABLE public.band_song_slots ADD COLUMN IF NOT EXISTS is_founder BOOLEAN DEFAULT false;

-- 2. Add temporary founding info to band_songs
ALTER TABLE public.band_songs ADD COLUMN IF NOT EXISTS founding_name TEXT;
ALTER TABLE public.band_songs ADD COLUMN IF NOT EXISTS founding_photo_url TEXT;

-- 3. Comment on columns for clarity
COMMENT ON COLUMN public.band_song_slots.status IS 'Status of the member in the potential band: joined (waiting for full group), accepted (ready to found), rejected (slot released)';
COMMENT ON COLUMN public.band_song_slots.is_founder IS 'True if this student opened the formation';
