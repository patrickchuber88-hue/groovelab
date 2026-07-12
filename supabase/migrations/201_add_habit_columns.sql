-- Migration 201: Add Habit and Weekly Goal Columns to student_stats and fokus_logs

ALTER TABLE public.student_stats ADD COLUMN IF NOT EXISTS weekly_target_days INTEGER;
ALTER TABLE public.student_stats ADD COLUMN IF NOT EXISTS weekly_days_completed INTEGER DEFAULT 0;
ALTER TABLE public.student_stats ADD COLUMN IF NOT EXISTS weekly_bonus_claimed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.student_stats ADD COLUMN IF NOT EXISTS practice_anchor TEXT;
ALTER TABLE public.student_stats ADD COLUMN IF NOT EXISTS weekly_goal_selected_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.fokus_logs ADD COLUMN IF NOT EXISTS mood TEXT;
