-- Add missing columns to avatars if they don't exist
ALTER TABLE public.avatars ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.avatars ADD COLUMN IF NOT EXISTS streak_flame INTEGER DEFAULT 0;
ALTER TABLE public.avatars ADD COLUMN IF NOT EXISTS last_focus_date DATE;

-- Create student_progress_matrix table
CREATE TABLE IF NOT EXISTS public.student_progress_matrix (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress' (Yellow), 'read' (Purple), 'mastered' (Green)
    notes TEXT,
    is_current_homework BOOLEAN DEFAULT FALSE,
    cover_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, song_id)
);

-- Create fokus_logs table
CREATE TABLE IF NOT EXISTS public.fokus_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE,
    duration_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable Row Level Security for MVP setup
ALTER TABLE public.student_progress_matrix DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fokus_logs DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.student_progress_matrix TO authenticated, anon, service_role;
GRANT ALL ON public.fokus_logs TO authenticated, anon, service_role;
