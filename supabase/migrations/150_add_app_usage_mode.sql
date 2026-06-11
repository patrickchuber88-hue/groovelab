-- Migration 150: Add app_usage_mode to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS app_usage_mode VARCHAR(50) DEFAULT 'student_only';
