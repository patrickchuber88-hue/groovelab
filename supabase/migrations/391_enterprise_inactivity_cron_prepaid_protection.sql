-- ==============================================================================
-- MIGRATION 391: ENTERPRISE INACTIVITY CRON PREPAID & DIRECT BILLING PROTECTION
-- Tier-1 FinOps Autopilot Hardening:
-- Guarantees that students with prepaid annual packages (September 20% discount,
-- annual 10% discount, or parent direct-billing) are NEVER prematurely deactivated
-- due to 60 days of inactivity (e.g. during summer breaks or illness).
-- Inactivity deactivation is strictly scoped to variable monthly billing.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.auto_deactivate_inactive_students()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_rec RECORD;
    v_deactivated_count INT := 0;
    v_cutoff_time TIMESTAMPTZ := NOW() - INTERVAL '60 days';
BEGIN
    -- Iterate over active students whose effective activity is older than 60 days
    -- AND whose school is on variable monthly billing (not prepaid annual packages)
    -- AND who are not directly paid by parents for the school year.
    FOR v_rec IN 
        SELECT 
            u.id,
            u.school_id,
            u.first_name,
            u.last_name,
            u.is_campus_active,
            u.is_groovelab_active,
            GREATEST(
                u.last_seen,
                u.created_at,
                (SELECT MAX(fl.created_at) FROM public.fokus_logs fl WHERE fl.user_id = u.id),
                (SELECT MAX(sl.last_active_at) FROM public.session_leases sl WHERE sl.user_id = u.id)
            ) AS effective_last_active
        FROM public.users_raw u
        LEFT JOIN public.schools s ON s.id = u.school_id
        WHERE u.role = 'student'
          AND (u.is_campus_active = true OR u.is_groovelab_active = true)
          -- Tier-1 Protection: Only deactivate students under variable monthly billing
          AND (s.billing_discount_type IS NULL OR s.billing_discount_type = 'monthly')
          -- Protect students whose parents have already paid the annual fee directly
          AND COALESCE(u.student_billing_payment_method, '') NOT IN ('bank_transfer', 'debit')
          AND COALESCE(u.payment_status, '') != 'paid'
    LOOP
        -- Check if student was inactive for longer than 60 days
        IF v_rec.effective_last_active IS NULL OR v_rec.effective_last_active < v_cutoff_time THEN
            -- Inactivate modules atomically
            UPDATE public.users_raw
            SET 
                is_campus_active = false,
                is_groovelab_active = false
            WHERE id = v_rec.id;

            -- Revisionssicheres Audit-Logging
            INSERT INTO public.audit_logs (
                school_id,
                table_name,
                record_id,
                action,
                old_data,
                new_data,
                changed_by
            ) VALUES (
                v_rec.school_id,
                'users_raw',
                v_rec.id,
                'UPDATE',
                jsonb_build_object(
                    'is_campus_active', v_rec.is_campus_active,
                    'is_groovelab_active', v_rec.is_groovelab_active,
                    'reason', 'auto_inactivity_60d_cutoff_monthly_variable'
                ),
                jsonb_build_object(
                    'is_campus_active', false,
                    'is_groovelab_active', false,
                    'auto_deactivated_at', NOW(),
                    'effective_last_active', v_rec.effective_last_active
                ),
                NULL -- System automated action
            );

            v_deactivated_count := v_deactivated_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'deactivated_count', v_deactivated_count,
        'cutoff_time', v_cutoff_time,
        'executed_at', NOW()
    );
END;
$$;

-- Grant execution to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.auto_deactivate_inactive_students() TO authenticated, service_role;

-- Safe scheduling / re-scheduling of the cron job (runs monthly on the 1st at 03:00 UTC)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        BEGIN
            PERFORM cron.unschedule('auto-deactivate-inactive-students');
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        BEGIN
            PERFORM cron.schedule(
                'auto-deactivate-inactive-students', 
                '0 3 1 * *', 
                'SELECT public.auto_deactivate_inactive_students();'
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END;
$$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
