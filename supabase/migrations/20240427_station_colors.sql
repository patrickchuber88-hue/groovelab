-- Migration to add a 'color' column to the stations table
ALTER TABLE stations ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#e5e7eb';
