-- Phase 13: Asynchroner Approval Workflow

-- Füge is_pending_approval Spalte zu user_song_skills hinzu
ALTER TABLE user_song_skills ADD COLUMN IF NOT EXISTS is_pending_approval BOOLEAN DEFAULT FALSE;
