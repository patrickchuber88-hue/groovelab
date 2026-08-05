-- Migration: Add substitute teacher columns to schedule_occurrences
ALTER TABLE schedule_occurrences 
ADD COLUMN IF NOT EXISTS substitute_teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_substitute BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS substitute_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_substitute 
ON schedule_occurrences(substitute_teacher_id, date);
