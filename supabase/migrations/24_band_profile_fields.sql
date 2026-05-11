-- 24: Band Profile Enhancements

-- 1. Add bio and photo_url to bands table
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. Ensure RLS is disabled for these new columns
ALTER TABLE public.bands DISABLE ROW LEVEL SECURITY;
