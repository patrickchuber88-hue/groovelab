-- Add zip_code and city columns to schools table
ALTER TABLE schools ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS city TEXT;
