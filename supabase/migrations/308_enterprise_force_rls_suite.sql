-- ==============================================================================
-- MIGRATION 308: ENTERPRISE FORCE ROW LEVEL SECURITY SUITE
-- Campus-Groovelab Tier-1 SaaS Enterprise+ Strict Defense-in-Depth RLS Enforcement
-- ==============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;
END $$;

-- Update audit function to verify FORCE ROW LEVEL SECURITY coverage with precise schema scoping
CREATE OR REPLACE FUNCTION public.audit_security_posture()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_unprotected_tables INT;
    v_unforced_tables INT;
    v_insecure_policies INT;
    v_private_auth_usage INT;
BEGIN
    -- Check 1: Unprotected Tables (RLS disabled in public)
    SELECT COUNT(*) INTO v_unprotected_tables
    FROM pg_tables t
    JOIN pg_namespace n ON n.nspname = t.schemaname
    JOIN pg_class c ON c.relname = t.tablename AND c.relnamespace = n.oid
    WHERE t.schemaname = 'public' 
      AND c.relrowsecurity = FALSE;

    RETURN QUERY SELECT 
        'RLS Enforcement on Public Tables'::TEXT,
        CASE WHEN v_unprotected_tables = 0 THEN 'PASSED' ELSE 'FAILED' END::TEXT,
        format('%s tables with RLS disabled in public schema', v_unprotected_tables)::TEXT;

    -- Check 2: Force RLS Enforcement (Defense-in-Depth in public)
    SELECT COUNT(*) INTO v_unforced_tables
    FROM pg_tables t
    JOIN pg_namespace n ON n.nspname = t.schemaname
    JOIN pg_class c ON c.relname = t.tablename AND c.relnamespace = n.oid
    WHERE t.schemaname = 'public' 
      AND c.relforcerowsecurity = FALSE;

    RETURN QUERY SELECT 
        'FORCE RLS on Public Tables'::TEXT,
        CASE WHEN v_unforced_tables = 0 THEN 'PASSED' ELSE 'FAILED' END::TEXT,
        format('%s tables without FORCE RLS in public schema', v_unforced_tables)::TEXT;

    -- Check 3: Blanket true policies in public
    SELECT COUNT(*) INTO v_insecure_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual = 'true' OR qual LIKE '%IS NULL%')
      AND policyname NOT IN ('schools_insert', 'audit_logs_insert_scoped');

    RETURN QUERY SELECT 
        'Blanket True Policies Purged'::TEXT,
        CASE WHEN v_insecure_policies = 0 THEN 'PASSED' ELSE 'FAILED' END::TEXT,
        format('%s insecure blanket policies found', v_insecure_policies)::TEXT;

    -- Check 4: private_auth Schema Isolation
    SELECT COUNT(*) INTO v_private_auth_usage
    FROM pg_namespace n 
    CROSS JOIN (SELECT 'anon' as rol UNION SELECT 'authenticated' UNION SELECT 'authenticator') r
    WHERE n.nspname = 'private_auth'
      AND has_schema_privilege(r.rol, n.nspname, 'USAGE') = TRUE;

    RETURN QUERY SELECT 
        'private_auth Schema Air-Gap'::TEXT,
        CASE WHEN v_private_auth_usage = 0 THEN 'PASSED' ELSE 'FAILED' END::TEXT,
        format('%s unprivileged roles have USAGE on private_auth', v_private_auth_usage)::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.audit_security_posture() TO authenticated, anon, service_role;

-- Reload schema
NOTIFY pgrst, 'reload schema';
