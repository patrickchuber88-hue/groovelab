-- Migration 265: Per-user locked and custom student pricing columns
-- Enables Enterprise SaaS Per-Profile Price Locking and Custom Rate Overrides

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS locked_student_price NUMERIC(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_student_price NUMERIC(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS price_locked_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.users.locked_student_price IS 'Locked rate at time of student profile registration (Bestandsschutz-Tarif)';
COMMENT ON COLUMN public.users.custom_student_price IS 'Individual manual rate override set by admin/secretary (Sondertarif)';
COMMENT ON COLUMN public.users.price_locked_at IS 'Timestamp when the profile price lock was established';
