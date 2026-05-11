-- Migration 26: Fix missing profile columns in users and bands tables
-- This migration addresses the "Could not find column" errors when saving teacher or band profiles.

-- 1. Add missing expertise, age, and birth_date columns to users table and increase instrument column size
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS expertise TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.users ALTER COLUMN instrument TYPE TEXT;

-- 2. Ensure other profile columns exist in users table (redundancy check)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bands TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gear TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS listening TEXT;

-- Standardize types
ALTER TABLE public.users ALTER COLUMN bands TYPE TEXT;
ALTER TABLE public.users ALTER COLUMN gear TYPE TEXT;
ALTER TABLE public.users ALTER COLUMN listening TYPE TEXT;

-- 3. Add missing columns to bands table for social links and appointments
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS soundcloud_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS youtube_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS appointments JSONB DEFAULT '[]'::jsonb;

-- 4. Disable RLS for these tables to ensure admin/teacher access (as per existing project patterns)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bands DISABLE ROW LEVEL SECURITY;
