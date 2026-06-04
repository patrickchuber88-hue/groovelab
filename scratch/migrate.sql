ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "groovelab_räume" JSONB DEFAULT '[]';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "campus_räume" JSONB DEFAULT '[]';

-- Sync existing planned_boards to groovelab_räume as initial migration
UPDATE public.users 
SET "groovelab_räume" = planned_boards 
WHERE planned_boards IS NOT NULL AND ("groovelab_räume" IS NULL OR "groovelab_räume" = '[]'::jsonb);

NOTIFY pgrst, 'reload schema';
