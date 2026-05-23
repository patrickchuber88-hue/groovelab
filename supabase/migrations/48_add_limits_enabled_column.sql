-- Add limits_enabled flag to schools table to explicitly control if limits should be enforced
ALTER TABLE schools ADD COLUMN IF NOT EXISTS limits_enabled BOOLEAN DEFAULT false;
