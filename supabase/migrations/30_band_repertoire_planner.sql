-- 30: Band Repertoire Planner Support
-- This migration adds support for exclusive band repertoire proposals and multi-band logic.

-- 1. Add status to band_songs
-- 'active': Song is in official band repertoire
-- 'planned': Song is in the private Repertoire Planner for the band
ALTER TABLE public.band_songs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. Add is_exclusive to band_song_slots
-- If true, this slot is only claimable by existing members of the band associated via band_songs
ALTER TABLE public.band_song_slots ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN DEFAULT false;

-- 3. Add pending_repertoire_proposal to users
-- Stores temporary info about a newly approved challenge that could be proposed to a band
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pending_repertoire_proposal JSONB DEFAULT NULL;
