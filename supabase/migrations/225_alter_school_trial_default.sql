-- Migration: 225_alter_school_trial_default.sql
-- Description: Alters trial column defaults on schools table to make sure the 30-day trial is correctly applied.

ALTER TABLE public.schools ALTER COLUMN trial_ends_at SET DEFAULT (NOW() + INTERVAL '30 days');
ALTER TABLE public.schools ALTER COLUMN is_trial SET DEFAULT true;
