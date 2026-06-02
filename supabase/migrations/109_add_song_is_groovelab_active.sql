-- Migration: 109_add_song_is_groovelab_active.sql
-- Description: Add is_groovelab_active column to songs table to isolate GrooveLab custom songs.

ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS is_groovelab_active BOOLEAN DEFAULT TRUE;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
