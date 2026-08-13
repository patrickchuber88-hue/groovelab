-- Migration: 262_master_billing_kombi_and_months
-- Description: Adds price_module_kombi and free_months_per_year to master_billing_settings

ALTER TABLE public.master_billing_settings 
  ADD COLUMN IF NOT EXISTS price_module_kombi NUMERIC(10, 2) DEFAULT 9.99,
  ADD COLUMN IF NOT EXISTS free_months_per_year INTEGER DEFAULT 0;
