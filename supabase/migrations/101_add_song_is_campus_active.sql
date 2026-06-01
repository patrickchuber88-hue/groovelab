-- Migration: 101_add_song_is_campus_active.sql
-- Description: Add is_campus_active column to songs table to isolate Campus-only custom songs.

ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS is_campus_active BOOLEAN DEFAULT FALSE;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
