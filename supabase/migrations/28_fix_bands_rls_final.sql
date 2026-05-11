-- Migration 28: Final RLS Fix for Bands and related tables
-- This migration ensures that RLS is truly disabled for all band-related tables 
-- to prevent "new row violates row-level security policy" errors during band founding.

ALTER TABLE IF EXISTS public.bands DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.band_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.band_songs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.band_song_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.band_shoutbox DISABLE ROW LEVEL SECURITY;

-- Also grant all permissions to all roles as a fallback
GRANT ALL ON public.bands TO authenticated, anon, service_role;
GRANT ALL ON public.band_members TO authenticated, anon, service_role;
GRANT ALL ON public.band_songs TO authenticated, anon, service_role;
GRANT ALL ON public.band_song_slots TO authenticated, anon, service_role;
GRANT ALL ON public.band_shoutbox TO authenticated, anon, service_role;
