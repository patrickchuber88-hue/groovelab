-- Migration 64: Customizable practice streaks per student
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS streak_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS streak_flame1_mins INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS streak_flame2_mins INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS streak_flame3_mins INTEGER DEFAULT 10;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
