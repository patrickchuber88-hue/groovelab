-- Migration: 263_school_pricing_and_grandfathering.sql
-- Description: Add custom pricing, grandfathered rates and price change policy columns

-- 1. Add custom prices and grandfathered rate columns to public.schools
ALTER TABLE public.schools 
  ADD COLUMN IF NOT EXISTS custom_price_campus NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_price_groovelab NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_price_kombi NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_price_teacher NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_price_student NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS grandfathered_campus_price NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS grandfathered_groovelab_price NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS grandfathered_kombi_price NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS grandfathered_teacher_price NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS grandfathered_student_price NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_grandfathered_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add price change scope and announcement tracking to public.master_billing_settings
ALTER TABLE public.master_billing_settings 
  ADD COLUMN IF NOT EXISTS price_change_scope TEXT DEFAULT 'new_only',
  ADD COLUMN IF NOT EXISTS price_change_announced_at TIMESTAMPTZ DEFAULT NULL;
