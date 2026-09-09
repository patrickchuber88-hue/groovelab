-- ==============================================================================
-- 🏛️ MIGRATION 392: ENTERPRISE DATA LIFECYCLE & HOUSEKEEPING MAINTENANCE RPC
-- Standard: OWASP ASVS Level 3 / Defense-in-Depth / Zero-Bloat Scaling
-- Target Tables: session_leases, qr_login_rate_limits
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_stale_security_records()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_deleted_leases integer := 0;
    v_deleted_rate_limits integer := 0;
BEGIN
    -- 1. Authorization Check: Restricted to Master Admin or Service Role
    IF NOT (public.is_master_admin() OR CURRENT_USER = ANY (ARRAY['postgres', 'supabase_admin', 'service_role'])) THEN
        RAISE EXCEPTION 'Access denied: Security housekeeping requires master_admin or service_role.';
    END IF;

    -- 2. Clean up revoked session leases older than 30 days or inactive leases older than 90 days
    WITH deleted_leases AS (
        DELETE FROM public.session_leases
        WHERE (is_revoked = true AND COALESCE(revoked_at, last_active_at) < NOW() - INTERVAL '30 days')
           OR (last_active_at < NOW() - INTERVAL '90 days')
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_leases FROM deleted_leases;

    -- 3. Clean up rate limit bucket entries older than 24 hours
    WITH deleted_limits AS (
        DELETE FROM public.qr_login_rate_limits
        WHERE attempt_at < NOW() - INTERVAL '24 hours'
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_rate_limits FROM deleted_limits;

    RETURN jsonb_build_object(
        'cleaned_at', NOW(),
        'deleted_leases', v_deleted_leases,
        'deleted_rate_limits', v_deleted_rate_limits
    );
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_stale_security_records() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_security_records() TO authenticated, service_role;

COMMENT ON FUNCTION public.cleanup_stale_security_records() IS 
'Enterprise+ automated housekeeping RPC to purge expired session leases and rate limit buckets.';

-- Notify PostgREST to refresh schema cache
NOTIFY pgrst, 'reload schema';
