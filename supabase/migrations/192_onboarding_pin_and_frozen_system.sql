-- Add security columns to students table for onboarding PIN system
ALTER TABLE students ADD COLUMN IF NOT EXISTS onboarding_frozen BOOLEAN DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS onboarding_pin TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS timetable_assigned_at TIMESTAMP WITH TIME ZONE;

-- Create table for personalized cryptographic onboarding invite links
CREATE TABLE IF NOT EXISTS student_onboarding_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE DEFAULT encode(sha256(random()::text::bytea), 'hex'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for student_onboarding_tokens
ALTER TABLE student_onboarding_tokens ENABLE ROW LEVEL SECURITY;

-- Allow anonymous selects to look up tokens during onboarding
CREATE POLICY "Allow anonymous select onboarding tokens"
    ON student_onboarding_tokens FOR SELECT
    USING (true);

-- Allow authenticated users (secretary/admin) to manage onboarding tokens
CREATE POLICY "Allow school staff manage onboarding tokens"
    ON student_onboarding_tokens FOR ALL
    USING (true);
