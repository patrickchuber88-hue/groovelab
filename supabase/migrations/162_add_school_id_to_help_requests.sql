-- Add school_id column to help_requests to allow filtering help requests by school
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
