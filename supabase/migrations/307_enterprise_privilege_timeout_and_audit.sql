-- ==============================================================================
-- MIGRATION 307: ENTERPRISE PRIVILEGE HARDENING & STATEMENT TIMEOUTS
-- Campus-Groovelab Tier-1 SaaS Enterprise+ Gateway & Resource Protection
-- ==============================================================================

-- 1. SET DEFENSIVE STATEMENT TIMEOUTS PER ROLE (Anti-DoS Protection)
-- Terminate long-running unauthenticated queries after 5 seconds
ALTER ROLE anon SET statement_timeout = '5s';

-- Terminate authenticated tenant queries after 15 seconds
ALTER ROLE authenticated SET statement_timeout = '15s';

-- Terminate gateway authenticator queries after 15 seconds
ALTER ROLE authenticator SET statement_timeout = '15s';

-- 2. HARDEN SCHEMA USAGE (Re-verify Zero-Access on private_auth)
REVOKE ALL ON SCHEMA private_auth FROM anon, authenticated, authenticator, public;
GRANT USAGE ON SCHEMA private_auth TO postgres, service_role;

-- Ensure public schema does not allow unauthorized table creation
REVOKE CREATE ON SCHEMA public FROM anon, authenticated, authenticator, public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, authenticator, postgres, service_role;

-- 3. AUDIT FUNCTION TO DETECT ANY UNPROTECTED TABLES OR PRIVILEGE DRIFT
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
    v_insecure_policies INT;
    v_private_auth_usage INT;
BEGIN
    -- Check 1: Unprotected Tables (RLS disabled)
    SELECT COUNT(*) INTO v_unprotected_tables
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.schemaname = 'public' 
      AND c.relrowsecurity = FALSE;

    RETURN QUERY SELECT 
        'RLS Enforcement on Public Tables'::TEXT,
        CASE WHEN v_unprotected_tables = 0 THEN 'PASSED' ELSE 'FAILED' END::TEXT,
        format('%s tables with RLS disabled in public schema', v_unprotected_tables)::TEXT;

    -- Check 2: Blanket true policies
    SELECT COUNT(*) INTO v_insecure_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual = 'true' OR qual LIKE '%IS NULL%')
      AND policyname NOT IN ('schools_insert', 'audit_logs_insert_scoped');

    RETURN QUERY SELECT 
        'Blanket True Policies Purged'::TEXT,
        CASE WHEN v_insecure_policies = 0 THEN 'PASSED' ELSE 'FAILED' END::TEXT,
        format('%s insecure blanket policies found', v_insecure_policies)::TEXT;

    -- Check 3: private_auth Schema Isolation
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
