-- Migration 348: Tier-1 Enterprise+ Mid-Term Subscription Upgrade Engine
-- Authoritative RPC for mid-term module expansion (Campus / GrooveLab / Kombi) with full audit trail.

CREATE OR REPLACE FUNCTION public.upgrade_school_subscription(
    p_school_id UUID,
    p_target_module TEXT, -- 'campus', 'groovelab', or 'both'
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
    v_school RECORD;
    v_new_campus BOOLEAN;
    v_new_groovelab BOOLEAN;
    v_upgrade_id TEXT;
BEGIN
    IF p_simulated_date IS NOT NULL AND p_simulated_date <> '' THEN
        v_now := p_simulated_date::TIMESTAMPTZ;
    ELSE
        v_now := clock_timestamp();
    END IF;

    -- Fetch current school subscription state
    SELECT id, has_campus_subscription, has_groovelab_subscription, contract_ends_at
    INTO v_school
    FROM public.schools
    WHERE id = p_school_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'School with ID % not found.', p_school_id;
    END IF;

    v_new_campus := v_school.has_campus_subscription;
    v_new_groovelab := v_school.has_groovelab_subscription;

    IF p_target_module = 'campus' THEN
        v_new_campus := true;
    ELSIF p_target_module = 'groovelab' THEN
        v_new_groovelab := true;
    ELSIF p_target_module = 'both' OR p_target_module = 'kombi' THEN
        v_new_campus := true;
        v_new_groovelab := true;
    ELSE
        RAISE EXCEPTION 'Invalid target module: %. Expected campus, groovelab, or both.', p_target_module;
    END IF;

    v_upgrade_id := 'UPG-' || SUBSTRING(p_school_id::TEXT, 1, 8) || '-' || TO_CHAR(v_now, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');

    -- Atomically update school record
    UPDATE public.schools
    SET
        has_campus_subscription = v_new_campus,
        has_groovelab_subscription = v_new_groovelab,
        is_billing_booked = true
    WHERE id = p_school_id;

    -- Append immutable audit trail
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
        jsonb_build_object(
            'has_campus_subscription', v_school.has_campus_subscription,
            'has_groovelab_subscription', v_school.has_groovelab_subscription
        ),
        jsonb_build_object(
            'event', 'SUBSCRIPTION_UPGRADED',
            'upgrade_id', v_upgrade_id,
            'target_module', p_target_module,
            'has_campus_subscription', v_new_campus,
            'has_groovelab_subscription', v_new_groovelab,
            'effective_at', v_now
        ),
        p_actor_id,
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'school_id', p_school_id,
        'upgrade_id', v_upgrade_id,
        'has_campus_subscription', v_new_campus,
        'has_groovelab_subscription', v_new_groovelab,
        'upgraded_at', v_now
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.upgrade_school_subscription(UUID, TEXT, UUID, TEXT) TO anon, authenticated, service_role;
