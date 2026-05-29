-- Migration 64: Teacher Setup Fields for Match Engine

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS start_anchor TEXT DEFAULT '13:00';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS break_times JSONB DEFAULT '[]';

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
