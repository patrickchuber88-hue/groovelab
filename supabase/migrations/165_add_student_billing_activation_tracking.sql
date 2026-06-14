-- Migration: 165_add_student_billing_activation_tracking.sql
-- Description: Add activated_at and student_billing_cash_paid columns to users table and set up trigger to auto-populate activated_at

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS student_billing_cash_paid BOOLEAN DEFAULT FALSE;

-- Trigger logic to automatically set activated_at
CREATE OR REPLACE FUNCTION public.set_user_activation_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'student' AND (NEW.is_campus_active = TRUE OR NEW.is_groovelab_active = TRUE) THEN
    IF NEW.activated_at IS NULL THEN
      NEW.activated_at := NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_user_activation_date ON public.users;

CREATE TRIGGER trigger_set_user_activation_date
BEFORE INSERT OR UPDATE OF is_campus_active, is_groovelab_active ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_user_activation_date();

-- Update existing active students to have activated_at set to their created_at if it's currently null
UPDATE public.users
SET activated_at = created_at
WHERE role = 'student' 
  AND (is_campus_active = TRUE OR is_groovelab_active = TRUE) 
  AND activated_at IS NULL;

NOTIFY pgrst, 'reload schema';
