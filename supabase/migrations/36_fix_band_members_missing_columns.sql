-- Migration 36: Fix Band Members Missing Columns and Constraints
-- Adds the missing 'role' and 'external_name' columns to 'band_members',
-- adds 'external_name' to 'band_song_slots', and relaxes uniqueness constraints.

-- 1. Alter band_members table
ALTER TABLE public.band_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
ALTER TABLE public.band_members ADD COLUMN IF NOT EXISTS external_name TEXT;

-- 2. Alter band_song_slots table
ALTER TABLE public.band_song_slots ADD COLUMN IF NOT EXISTS external_name TEXT;

-- 3. Relax uniqueness constraints to support multiple roles/parts
ALTER TABLE public.band_members DROP CONSTRAINT IF EXISTS band_members_band_id_user_id_key;
ALTER TABLE public.band_song_slots DROP CONSTRAINT IF EXISTS band_song_slots_band_song_id_user_id_key;

-- 4. Disable RLS for ease of real-time collaboration
ALTER TABLE public.band_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_song_slots DISABLE ROW LEVEL SECURITY;
