-- Run this SQL in your Supabase Dashboard SQL Editor to add the preferred_room_ids column:

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS preferred_room_ids TEXT[] DEFAULT '{}';

-- Force PostgREST schema cache reload to make the new column immediately accessible via API
NOTIFY pgrst, 'reload schema';
