-- Migration: 57_billing_and_quota_adjustments.sql
-- Description: Add fields for B2B user quota controls and B2C two-class premium upgrades

-- 1. Add is_premium_user to users table (default False)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_premium_user BOOLEAN DEFAULT FALSE;

-- 2. Add billing/quota columns to schools table
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS user_quota INTEGER DEFAULT 150;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS pending_user_quota INTEGER DEFAULT NULL;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS quota_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 3. Force schema reload for PostgREST
NOTIFY pgrst, 'reload schema';
