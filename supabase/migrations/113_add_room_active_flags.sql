-- Migration: 113_add_room_active_flags.sql
-- Description: Add is_campus_active and is_groovelab_active columns to rooms table to isolate platform rooms.

ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS is_campus_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS is_groovelab_active BOOLEAN DEFAULT TRUE;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
