-- Migration: Add sick_until to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sick_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;
