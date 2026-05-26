-- Migration 54: Meisterwerk Protokoll & Progress Matrix

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'progress_status') THEN
        CREATE TYPE progress_status AS ENUM ('IN_PROGRESS', 'THEORY_DONE', 'MASTERED');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.progress_matrix (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    topic_name VARCHAR(255) NOT NULL,
    status progress_status DEFAULT 'IN_PROGRESS',
    is_current_homework BOOLEAN DEFAULT FALSE,
    teacher_notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.progress_matrix DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.progress_matrix TO authenticated, anon, service_role;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
