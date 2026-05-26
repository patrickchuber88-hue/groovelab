-- Migration to link students to their creating/managing teachers
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Create index for performance when fetching a teacher's students
CREATE INDEX IF NOT EXISTS users_teacher_id_idx ON public.users(teacher_id);

COMMENT ON COLUMN public.users.teacher_id IS 'References the teacher who created and manages this student profile.';
