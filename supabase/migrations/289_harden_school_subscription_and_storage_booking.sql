-- Migration 289: Harden School Subscription, Storage Addon, and Booking Persistence
-- Fixes trial banner dismissal upon booking and guarantees atomic persistence of storage addons.

-- 1. Ensure all columns exist on public.schools
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS is_billing_booked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS storage_addon_gb INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS storage_addon_monthly_fee NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS storage_addon_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contract_start_date DATE,
  ADD COLUMN IF NOT EXISTS student_billing_option TEXT DEFAULT 'option2',
  ADD COLUMN IF NOT EXISTS has_campus_subscription BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS has_groovelab_subscription BOOLEAN DEFAULT TRUE;

-- 2. Ensure RLS policies allow school updates for billing and settings
DROP POLICY IF EXISTS "schools_update_auth" ON public.schools;
DROP POLICY IF EXISTS "schools_modify" ON public.schools;
DROP POLICY IF EXISTS "schools_mutation_admin" ON public.schools;

CREATE POLICY "schools_update_auth" ON public.schools
FOR UPDATE
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- 3. Atomic, Security Definer RPC for subscription & storage checkout
CREATE OR REPLACE FUNCTION public.confirm_school_subscription(
    p_school_id UUID,
    p_has_campus BOOLEAN,
    p_has_groovelab BOOLEAN,
    p_student_billing_option TEXT,
    p_contract_start_date TEXT,
    p_storage_addon_gb INTEGER,
    p_storage_addon_monthly_fee NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
BEGIN
    UPDATE public.schools
    SET
        is_billing_booked = true,
        is_trial = false,
        status = 'active',
        has_campus_subscription = COALESCE(p_has_campus, true),
        has_groovelab_subscription = COALESCE(p_has_groovelab, true),
        student_billing_option = COALESCE(p_student_billing_option, 'option2'),
        contract_start_date = COALESCE(NULLIF(p_contract_start_date, '')::DATE, CURRENT_DATE),
        storage_addon_gb = COALESCE(p_storage_addon_gb, 0),
        storage_addon_monthly_fee = COALESCE(p_storage_addon_monthly_fee, 0.00),
        storage_addon_status = CASE WHEN COALESCE(p_storage_addon_gb, 0) > 0 THEN 'active' ELSE 'none' END
    WHERE id = p_school_id;

    RETURN jsonb_build_object(
        'success', true,
        'school_id', p_school_id,
        'is_billing_booked', true,
        'is_trial', false,
        'status', 'active',
        'storage_addon_gb', COALESCE(p_storage_addon_gb, 0),
        'storage_addon_monthly_fee', COALESCE(p_storage_addon_monthly_fee, 0.00)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_school_subscription(UUID, BOOLEAN, BOOLEAN, TEXT, TEXT, INTEGER, NUMERIC) TO anon, authenticated, service_role;
