-- Migration 35: Add instrument-specific PDF URL columns to songs table
ALTER TABLE songs ADD COLUMN IF NOT EXISTS pdf_drums_url TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS pdf_guitar_url TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS pdf_bass_url TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS pdf_vocals_url TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS pdf_keys_url TEXT;
