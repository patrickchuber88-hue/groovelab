-- Migration 220: Add School Year Customization Columns to Schools Table
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS school_year_start_month INT DEFAULT 9;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS school_year_start_day INT DEFAULT 1;
