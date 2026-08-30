-- Migration 292: Security Audit Logging Helper & Alert Notification Function
-- Automatically logs security events and allows real-time monitoring of sensitive logins.

CREATE OR REPLACE FUNCTION public.log_security_event(
    p_event_type text,
    p_actor_id text DEFAULT NULL,
    p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
SET row_security = off
AS $$
DECLARE
    v_log_id uuid;
BEGIN
    INSERT INTO public.security_audit_logs (
        event_type,
        actor_id,
        details
    ) VALUES (
        p_event_type,
        p_actor_id,
        p_details
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_security_event(text, text, jsonb) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
