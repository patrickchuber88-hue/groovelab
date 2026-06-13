-- Migration: 163_add_billing_booked_columns.sql
-- Description: Add is_billing_booked, contract_start_date and extra_billing_option to schools table to prevent browser cache clearing from resetting billing

ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS is_billing_booked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS contract_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS extra_billing_option TEXT DEFAULT 'option1';

NOTIFY pgrst, 'reload schema';
