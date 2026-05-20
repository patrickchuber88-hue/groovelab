-- Migration: Add is_observer column to users table
-- This allows marking a teacher as a "Hospitant" (observer-only mode)
-- Observers: can view all menus, but don't appear in Live Lab,
-- cannot be selected as Bandcoach, and don't check into the Lab.

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_observer BOOLEAN DEFAULT false;

-- Add a comment for documentation
COMMENT ON COLUMN users.is_observer IS 'If true, user is in Hospitant mode: read-only access, not shown in Live Lab, not selectable as Bandcoach.';
