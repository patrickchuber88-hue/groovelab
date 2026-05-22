-- Add trial, contract, limits, and bypass (status) fields to schools table
ALTER TABLE schools ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS contract_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS max_teachers INTEGER;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS max_students INTEGER;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS max_songs INTEGER;
