-- Add subject and teacher_id to cooperations table
ALTER TABLE cooperations ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT NULL;
ALTER TABLE cooperations ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
