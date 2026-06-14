ALTER TABLE public.users ADD COLUMN IF NOT EXISTS roles text[];

-- Initialise roles array with the current role
UPDATE public.users SET roles = ARRAY[role::text] WHERE roles IS NULL OR roles = '{}'::text[];