-- Migration 144: Add notification preferences to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_notif_schedule_changes BOOLEAN DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_notif_homework BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_notif_all_features BOOLEAN DEFAULT FALSE;

NOTIFY pgrst, 'reload schema';
