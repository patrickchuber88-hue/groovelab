-- 25: Band Expansion & Song Proposal System

-- 1. Enhance band_songs table
ALTER TABLE public.band_songs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'proposal'; -- 'proposal' or 'active'
ALTER TABLE public.band_songs ADD COLUMN IF NOT EXISTS suggested_by UUID REFERENCES public.users(id);
ALTER TABLE public.band_songs ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'original';

-- 2. Create band_song_slots to track specific orchestration per song
CREATE TABLE IF NOT EXISTS public.band_song_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    band_song_id UUID REFERENCES public.band_songs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    instrument TEXT NOT NULL,
    part_number INTEGER DEFAULT 1,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(band_song_id, user_id), -- A user can only take one slot per song
    UNIQUE(band_song_id, instrument, part_number) -- A specific slot can only be taken by one person
);

-- 3. Disable RLS for new table
ALTER TABLE public.band_song_slots DISABLE ROW LEVEL SECURITY;
