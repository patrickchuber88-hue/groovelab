-- 29: Fix Band Members Schema and Clean Up Empty Bands
-- This migration adds the missing 'role' column and removes corrupted band entries.

-- 1. Add role column to band_members
ALTER TABLE public.band_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member'; -- 'leader', 'member'

-- 2. Clean up corrupted bands (bands with no members often caused by the schema error)
DELETE FROM public.bands 
WHERE id NOT IN (SELECT band_id FROM public.band_members);

-- 3. Ensure RLS is still disabled (just in case)
ALTER TABLE public.band_members DISABLE ROW LEVEL SECURITY;
