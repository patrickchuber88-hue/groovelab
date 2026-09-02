-- Migration 347: Tier-1 Enterprise+ Subscription Cancellation Engine
-- Provides authoritative RPCs for cancelling and reactivating school subscriptions with full auditability.

-- 1. Create the atomic cancellation RPC
CREATE OR REPLACE FUNCTION public.cancel_school_subscription(
    p_school_id UUID,
    p_reason TEXT DEFAULT NULL,
    p_actor_id UUID DEFAULT NULL,
    p_simulated_date TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_now TIMESTAMPTZ;
    v_year INT;
    v_month INT;
    v_target_year INT;
    v_effective_end_date TIMESTAMPTZ;
    v_cancellation_id TEXT;
    v_old_ends_at TIMESTAMPTZ;
BEGIN
    -- Resolve effective current time
    IF p_simulated_date IS NOT NULL AND p_simulated_date <> '' THEN
        v_now := p_simulated_date::TIMESTAMPTZ;
    ELSE
        v_now := clock_timestamp();
    END IF;

    v_year := EXTRACT(YEAR FROM v_now)::INT;
    v_month := EXTRACT(MONTH FROM v_now)::INT;

    -- Calculate standard school year end (August 31st):
    -- Deadline is 1 month notice before Aug 31 (i.e. July 31).
    -- If current month is August or later (e.g. Sep 2026), notice applies to August 31 of NEXT year (2027-08-31).
    -- If current month is Jan..July (e.g. May 2027), notice applies to August 31 of CURRENT year (2027-08-31).
    IF v_month >= 8 THEN
        v_target_year := v_year + 1;
    ELSE
        v_target_year := v_year;
    END IF;

    -- Set to 23:59:59 Central European Time on August 31 (21:59:59 UTC during CEST)
    v_effective_end_date := (v_target_year || '-08-31 21:59:59+00')::TIMESTAMPTZ;

    -- Generate human-readable legal cancellation ID
    v_cancellation_id := 'KD-' || SUBSTRING(p_school_id::TEXT, 1, 8) || '-' || TO_CHAR(v_now, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');

    -- Get current status
    SELECT contract_ends_at INTO v_old_ends_at FROM public.schools WHERE id = p_school_id;

    -- Update school record
    UPDATE public.schools
    SET contract_ends_at = v_effective_end_date
    WHERE id = p_school_id;

    -- Append audit log entry (matching check constraints)
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        changed_by,
        created_at
    ) VALUES (
        'schools',
        p_school_id,
        'UPDATE',
        jsonb_build_object('contract_ends_at', v_old_ends_at),
        jsonb_build_object(
            'contract_ends_at', v_effective_end_date,
            'event', 'SUBSCRIPTION_CANCELLED',
            'cancellation_id', v_cancellation_id,
            'reason', p_reason,
            'effective_date_iso', v_effective_end_date
        ),
        p_actor_id,
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'school_id', p_school_id,
        'contract_ends_at', v_effective_end_date,
        'cancellation_id', v_cancellation_id,
        'cancelled_at', v_now,
        'effective_year', v_target_year
    );
END;
$$;

-- 2. Create the atomic reactivation RPC
CREATE OR REPLACE FUNCTION public.reactivate_school_subscription(
    p_school_id UUID,
    p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_old_ends_at TIMESTAMPTZ;
BEGIN
    SELECT contract_ends_at INTO v_old_ends_at FROM public.schools WHERE id = p_school_id;

    UPDATE public.schools
    SET contract_ends_at = NULL
    WHERE id = p_school_id;

    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        changed_by,
        created_at
    ) VALUES (
        'schools',
        p_school_id,
        'UPDATE',
        jsonb_build_object('contract_ends_at', v_old_ends_at),
        jsonb_build_object(
            'contract_ends_at', NULL,
            'event', 'SUBSCRIPTION_REACTIVATED'
        ),
        p_actor_id,
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'school_id', p_school_id,
        'contract_ends_at', NULL,
        'reactivated_at', NOW()
    );
END;
$$;

-- 3. Grants
GRANT EXECUTE ON FUNCTION public.cancel_school_subscription(UUID, TEXT, UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reactivate_school_subscription(UUID, UUID) TO anon, authenticated, service_role;
