ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS campus_activated_this_month BOOLEAN DEFAULT FALSE;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS groovelab_activated_this_month BOOLEAN DEFAULT FALSE;
NOTIFY pgrst, 'reload schema';
