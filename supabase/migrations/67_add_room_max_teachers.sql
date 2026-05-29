-- Migration 67: Add max_teachers column to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS max_teachers INT DEFAULT 1;
