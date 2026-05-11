-- Migration 30: Band Coach and Verification Schema
-- This migration adds support for tracking which teacher verified a student's skill 
-- and identifying the primary "Band Coach" based on these verifications.

-- 1. Add verified_by_id to user_song_skills
ALTER TABLE public.user_song_skills ADD COLUMN IF NOT EXISTS verified_by_id UUID REFERENCES public.users(id);

-- 2. Add coach_id and coach_is_manual to bands
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES public.users(id);
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS coach_is_manual BOOLEAN DEFAULT FALSE;

-- 3. Ensure RLS is disabled as per project pattern
ALTER TABLE public.user_song_skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bands DISABLE ROW LEVEL SECURITY;
