-- Create ensembles tables

CREATE TABLE IF NOT EXISTS public.ensembles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    school_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('band', 'ensemble'))
);

CREATE TABLE IF NOT EXISTS public.ensemble_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ensemble_id UUID NOT NULL REFERENCES public.ensembles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    instrument TEXT NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ensemble_songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ensemble_id UUID NOT NULL REFERENCES public.ensembles(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
    status TEXT,
    notes TEXT
);

-- Disable Row Level Security for these tables to match the existing bands configuration
ALTER TABLE public.ensembles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ensemble_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ensemble_songs DISABLE ROW LEVEL SECURITY;
