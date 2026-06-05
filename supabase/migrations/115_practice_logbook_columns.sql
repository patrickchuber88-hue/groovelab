-- Migration 115: Add logbook columns to public.fokus_logs table
ALTER TABLE public.fokus_logs ADD COLUMN IF NOT EXISTS is_extra BOOLEAN DEFAULT FALSE;
ALTER TABLE public.fokus_logs ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;
ALTER TABLE public.fokus_logs ADD COLUMN IF NOT EXISTS flame_level VARCHAR(50);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
