-- Create campus_feedback_requests table
CREATE TABLE IF NOT EXISTS public.campus_feedback_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campus_feedback_responses table
CREATE TABLE IF NOT EXISTS public.campus_feedback_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.campus_feedback_requests(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    response_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(request_id, teacher_id)
);

-- Disable Row Level Security
ALTER TABLE public.campus_feedback_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_feedback_responses DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.campus_feedback_requests TO authenticated, anon, service_role;
GRANT ALL ON public.campus_feedback_responses TO authenticated, anon, service_role;
