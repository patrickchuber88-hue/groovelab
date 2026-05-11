-- Migration to allow students to play multiple instruments in a band and in a song project
-- This is necessary to support the Vocal-Finder functionality where existing members can also join as singers.

-- 1. Remove the unique constraint on band_members (band_id, user_id)
-- We first need to find the name of the constraint if it's not the default one, but in migration 14 it was defined as UNIQUE(band_id, user_id).
-- Usually Postgres names this band_members_band_id_user_id_key.
ALTER TABLE public.band_members DROP CONSTRAINT IF EXISTS band_members_band_id_user_id_key;

-- 2. Remove the unique constraint on band_song_slots (band_song_id, user_id)
-- In migration 25 it was defined as UNIQUE(band_song_id, user_id).
ALTER TABLE public.band_song_slots DROP CONSTRAINT IF EXISTS band_song_slots_band_song_id_user_id_key;

-- Note: We keep the UNIQUE(band_song_id, instrument, part_number) constraint 
-- because a specific slot (e.g. Lead Guitar) should still only be filled by one person.
