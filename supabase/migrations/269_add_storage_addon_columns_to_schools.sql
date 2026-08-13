-- Migration 269: Add storage addon and storage tracking columns to schools table
ALTER TABLE public.schools 
  ADD COLUMN IF NOT EXISTS storage_addon_gb INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS storage_addon_monthly_fee NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS storage_addon_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0;
