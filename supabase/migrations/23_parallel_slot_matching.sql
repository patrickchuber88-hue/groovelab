-- 23: Support for Parallel Slot Matching and Band Naming

-- 1. Create band_songs table if it doesn't exist (Fixes "relation does not exist" error)
CREATE TABLE IF NOT EXISTS public.band_songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    band_id UUID REFERENCES public.bands(id) ON DELETE CASCADE,
    song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(band_id, song_id)
);

-- 2. Add formation_group to user_song_skills to support multi-slot matching
ALTER TABLE public.user_song_skills ADD COLUMN IF NOT EXISTS formation_group TEXT;

-- 3. Enhance bands table for naming and status
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 4. Ensure RLS is disabled for the MVP (following the project pattern)
ALTER TABLE public.user_song_skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bands DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_songs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs DISABLE ROW LEVEL SECURITY;
