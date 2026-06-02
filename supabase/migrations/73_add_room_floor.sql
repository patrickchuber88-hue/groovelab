-- Migration 73: Add floor to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS floor TEXT DEFAULT 'Allgemein';
