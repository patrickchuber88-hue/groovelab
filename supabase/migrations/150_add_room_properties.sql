-- Migration: Add room properties (acoustics, present instruments, custom comments)
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS unsuitable_instruments TEXT[] DEFAULT '{}';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS room_instruments JSONB DEFAULT '[]';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS sonstiges TEXT DEFAULT '';

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
