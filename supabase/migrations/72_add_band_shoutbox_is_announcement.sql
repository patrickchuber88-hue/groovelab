-- Migration 72: Create campus_announcements table
-- Fixes: "Fehler beim Einreichen einer Campus-Mitteilung"
-- The old code tried to use band_shoutbox (which didn't exist) with is_announcement column.
-- The new code uses a dedicated campus_announcements table.

-- 1. Create campus_announcements table
CREATE TABLE IF NOT EXISTS public.campus_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_type TEXT DEFAULT 'all' CHECK (target_type IN ('all', 'students', 'teachers')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Disable RLS (following project pattern)
ALTER TABLE public.campus_announcements DISABLE ROW LEVEL SECURITY;

-- 3. Grant permissions to all roles
GRANT ALL ON public.campus_announcements TO authenticated, anon, service_role;

-- 4. Create index for performance
CREATE INDEX IF NOT EXISTS campus_announcements_school_id_idx ON public.campus_announcements(school_id);
CREATE INDEX IF NOT EXISTS campus_announcements_created_at_idx ON public.campus_announcements(created_at DESC);
