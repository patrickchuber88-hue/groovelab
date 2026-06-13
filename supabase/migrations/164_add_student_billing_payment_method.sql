-- Migration: 164_add_student_billing_payment_method.sql
-- Description: Add student_billing_payment_method to users table to store activation payment choices (debit or cash)

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS student_billing_payment_method TEXT;

NOTIFY pgrst, 'reload schema';
