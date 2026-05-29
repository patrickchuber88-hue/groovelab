-- Migration: 100_schedule_occurrences
-- Description: Adds tables for interactive calendar features (schedule occurrences and reschedule requests).

-- Create enum for occurrence status
CREATE TYPE schedule_status AS ENUM ('scheduled', 'pending_reschedule', 'rescheduled_confirmed', 'cancelled');

-- Table: schedule_occurrences
-- Stores individual calendar occurrences for students and teachers.
CREATE TABLE IF NOT EXISTS public.schedule_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    status schedule_status NOT NULL DEFAULT 'scheduled',
    original_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: reschedule_requests
-- Stores requests sent from a teacher to a student when rescheduling a cancelled appointment.
CREATE TABLE IF NOT EXISTS public.reschedule_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occurrence_id UUID NOT NULL REFERENCES public.schedule_occurrences(id) ON DELETE CASCADE,
    proposed_date DATE NOT NULL,
    proposed_start_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX idx_schedule_occurrences_date ON public.schedule_occurrences(date);
CREATE INDEX idx_schedule_occurrences_student ON public.schedule_occurrences(student_id);
CREATE INDEX idx_schedule_occurrences_teacher ON public.schedule_occurrences(teacher_id);
CREATE INDEX idx_reschedule_requests_occurrence ON public.reschedule_requests(occurrence_id);

-- RLS Policies
ALTER TABLE public.schedule_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reschedule_requests ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read occurrences (simplification for MVP; can be restricted later)
CREATE POLICY "Allow read access for authenticated users" 
ON public.schedule_occurrences FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users" 
ON public.reschedule_requests FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow inserts and updates for authenticated users (teachers/admins)
CREATE POLICY "Allow full access for authenticated users" 
ON public.schedule_occurrences FOR ALL 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow full access for authenticated users" 
ON public.reschedule_requests FOR ALL 
USING (auth.role() = 'authenticated');
