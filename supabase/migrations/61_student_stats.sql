-- Migration 61: Student stats table for tracking focus minutes, streaks, and XP.

CREATE TABLE IF NOT EXISTS public.student_stats (
    student_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    total_focus_minutes INTEGER DEFAULT 0,
    monthly_focus_minutes INTEGER DEFAULT 0,
    streak_flame INTEGER DEFAULT 0,
    last_practice_date DATE,
    current_xp INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable Row Level Security
ALTER TABLE public.student_stats DISABLE ROW LEVEL SECURITY;

-- Grant permissions to users
GRANT ALL ON public.student_stats TO authenticated, anon, service_role;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
