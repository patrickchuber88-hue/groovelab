-- Migration 293: Security Audit Log Retention Janitor
-- Compliance: DSGVO Art. 5 Abs. 1 lit. e (Speicherbegrenzung & automatische Löschung nach 90 Tagen)

CREATE OR REPLACE FUNCTION public.cleanup_expired_security_logs(p_retention_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
SET row_security = off
AS $$
DECLARE
    v_deleted_count integer;
BEGIN
    DELETE FROM public.security_audit_logs
    WHERE created_at < (NOW() - (p_retention_days || ' days')::interval);

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN v_deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_security_logs(integer) TO service_role;

NOTIFY pgrst, 'reload schema';
