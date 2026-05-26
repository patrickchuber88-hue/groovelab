CREATE TABLE IF NOT EXISTS public.student_cascades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    token UUID UNIQUE DEFAULT uuid_generate_v4(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.student_cascades DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.student_cascades TO authenticated, anon, service_role;
NOTIFY pgrst, 'reload schema';
