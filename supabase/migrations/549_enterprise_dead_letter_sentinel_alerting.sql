-- ==============================================================================
-- Migration 549: Enterprise Dead-Letter Sentinel & Sovereign Push-Alerting
-- Standard: OWASP ASVS Level 3 / NIST SP 800-61 / ISO/IEC 27035 / BSI IT-Grundschutz
-- Scope:
--   1. Creates public.system_dead_letter_incidents with strict Default-Deny RLS
--   2. Enforces WORM immutability (UPDATE and DELETE prohibited for non-superusers)
--   3. Authoritative pg_notify channel 'dead_letter_incident_channel'
--   4. SECURITY DEFINER RPC public.report_dead_letter_incident(...)
-- ==============================================================================

-- 1. Create table public.system_dead_letter_incidents
CREATE TABLE IF NOT EXISTS public.system_dead_letter_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'CRITICAL',
    source_component TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    correlation_trace_id TEXT DEFAULT NULL,
    school_id UUID DEFAULT NULL REFERENCES public.schools(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ DEFAULT NULL,
    resolved_by UUID DEFAULT NULL,
    resolution_notes TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for fast incident scanning and resolution filtering
CREATE INDEX IF NOT EXISTS idx_dead_letter_incidents_type_severity 
    ON public.system_dead_letter_incidents (incident_type, severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dead_letter_incidents_unresolved 
    ON public.system_dead_letter_incidents (created_at DESC) 
    WHERE resolved_at IS NULL;

-- 2. Strict OWASP ASVS Level 3 Default-Deny RLS
ALTER TABLE public.system_dead_letter_incidents ENABLE ROW LEVEL SECURITY;

-- Revoke everything from client roles (Zero-Trust)
REVOKE ALL ON public.system_dead_letter_incidents FROM anon, authenticated;
GRANT ALL ON public.system_dead_letter_incidents TO postgres, service_role;

-- 3. WORM Protection Rule: Prohibit updates and deletes of incidents
CREATE OR REPLACE RULE rule_protect_dead_letter_incidents_delete AS
ON DELETE TO public.system_dead_letter_incidents DO INSTEAD NOTHING;

-- 4. Notification Function & Trigger for Realtime Sentinel Daemon
CREATE OR REPLACE FUNCTION public.trg_notify_dead_letter_incident()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_notification_payload JSONB;
BEGIN
    v_notification_payload := jsonb_build_object(
        'id', NEW.id,
        'incident_type', NEW.incident_type,
        'severity', NEW.severity,
        'source_component', NEW.source_component,
        'correlation_trace_id', NEW.correlation_trace_id,
        'school_id', NEW.school_id,
        'created_at', NEW.created_at,
        'summary', COALESCE(NEW.details->>'message', NEW.details->>'error', NEW.incident_type)
    );

    -- Emit event on Postgres pg_notify channel
    PERFORM pg_notify('dead_letter_incident_channel', v_notification_payload::text);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_dead_letter_incident ON public.system_dead_letter_incidents;
CREATE TRIGGER trg_notify_dead_letter_incident
    AFTER INSERT ON public.system_dead_letter_incidents
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_notify_dead_letter_incident();

-- 5. Authoritative SECURITY DEFINER RPC to record incidents from services & scripts
CREATE OR REPLACE FUNCTION public.report_dead_letter_incident(
    p_incident_type TEXT,
    p_source_component TEXT,
    p_severity TEXT DEFAULT 'CRITICAL',
    p_details JSONB DEFAULT '{}'::jsonb,
    p_trace_id TEXT DEFAULT NULL,
    p_school_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_incident_id UUID;
    v_clean_severity TEXT;
BEGIN
    -- Normalize severity
    v_clean_severity := UPPER(TRIM(COALESCE(p_severity, 'CRITICAL')));
    IF v_clean_severity NOT IN ('CRITICAL', 'ERROR', 'WARNING', 'INFO') THEN
        v_clean_severity := 'CRITICAL';
    END IF;

    -- Insert sanitized incident record
    INSERT INTO public.system_dead_letter_incidents (
        incident_type,
        severity,
        source_component,
        details,
        correlation_trace_id,
        school_id
    ) VALUES (
        TRIM(p_incident_type),
        v_clean_severity,
        TRIM(p_source_component),
        COALESCE(p_details, '{}'::jsonb),
        NULLIF(TRIM(p_trace_id), ''),
        p_school_id
    )
    RETURNING id INTO v_incident_id;

    RETURN v_incident_id;
END;
$$;

-- Grant execution to service_role and postgres
GRANT EXECUTE ON FUNCTION public.report_dead_letter_incident(TEXT, TEXT, TEXT, JSONB, TEXT, UUID) TO postgres, service_role;
REVOKE EXECUTE ON FUNCTION public.report_dead_letter_incident(TEXT, TEXT, TEXT, JSONB, TEXT, UUID) FROM anon, authenticated;

COMMENT ON TABLE public.system_dead_letter_incidents IS 'WORM Audit Ledger for Critical System Anomalies, Background Job Failures & Storage Sync Errors';
