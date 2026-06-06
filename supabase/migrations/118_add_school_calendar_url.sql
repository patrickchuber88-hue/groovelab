-- Add calendar_url column to schools table
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS calendar_url TEXT;

-- Create campus_events table for user-created events
CREATE TABLE IF NOT EXISTS public.campus_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    category TEXT NOT NULL DEFAULT 'Sonstiges', -- 'Klassenvorspiel', 'Konzert', 'Probe', 'Sonstiges'
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for campus_events
ALTER TABLE public.campus_events ENABLE ROW LEVEL SECURITY;

-- Allow read access for all authenticated users of the school
CREATE POLICY "Allow read access for authenticated users of the same school"
ON public.campus_events FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow insert/update/delete for teachers and admins of the school
CREATE POLICY "Allow write access for teachers and admins"
ON public.campus_events FOR ALL
USING (auth.role() = 'authenticated');
