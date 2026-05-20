-- Migration 43: Add Playback/Playalong audio track column to songs table
ALTER TABLE songs ADD COLUMN IF NOT EXISTS playalong_url TEXT;

COMMENT ON COLUMN songs.playalong_url IS 'Direct URL or Dropbox stream URL to the audio playalong / playback track for this song';
