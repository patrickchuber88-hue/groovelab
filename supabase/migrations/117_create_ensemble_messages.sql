-- Create ensemble_messages table
CREATE TABLE IF NOT EXISTS public.ensemble_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ensemble_id UUID NOT NULL REFERENCES public.ensembles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable Row Level Security
ALTER TABLE public.ensemble_messages DISABLE ROW LEVEL SECURITY;

-- Grant access
GRANT ALL ON public.ensemble_messages TO authenticated, anon, service_role;
