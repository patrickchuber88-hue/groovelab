-- Migration 103: Add focus_sessions table for Display-Down Focus Mode.

CREATE TABLE IF NOT EXISTS public.focus_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Dynamic Habit Scaling Parameters
    goal_level INTEGER NOT NULL CHECK (goal_level IN (1, 2, 3, 0)), -- 0 represents custom goal
    flame_tier VARCHAR(10) NOT NULL CHECK (flame_tier IN ('small', 'medium', 'large', 'custom')),
    target_duration_seconds INTEGER NOT NULL, -- Target streak duration in seconds
    
    -- Post-Session Tracking Data
    streak_time_mastered INTEGER NOT NULL DEFAULT 0, -- Time spent in Stufe 1 (maxed out at target_duration_seconds)
    additional_practice_minutes NUMERIC(6, 2) NOT NULL DEFAULT 0.00, -- Time spent in Stufe 2 in minutes
    completed_streak BOOLEAN NOT NULL DEFAULT FALSE, -- Flag indicating if Stufe 1 was fully completed
    
    -- Temporal Boundaries
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for high-performance tenant partition and student lookups
CREATE INDEX IF NOT EXISTS idx_focus_sessions_student_school ON public.focus_sessions(student_id, school_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON public.focus_sessions(started_at);

-- Disable Row Level Security matching the application pattern for local dev
ALTER TABLE public.focus_sessions DISABLE ROW LEVEL SECURITY;

-- Grant access rights
GRANT ALL ON public.focus_sessions TO authenticated, anon, service_role;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
