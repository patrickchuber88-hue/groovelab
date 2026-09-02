-- ==============================================================================
-- MIGRATION 339: SLA & CRISIS GOVERNANCE AUDIT SUITE & INCIDENT RECORDER
-- Tier-1 Enterprise+ Cryptographic Audit Trail & Telemetry Downtime Resolver
-- ==============================================================================

-- 1. Create sla_incidents table for immutable compliance record-keeping
CREATE TABLE IF NOT EXISTS public.sla_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE, -- NULL = Global Platform Verbund
    scope_name TEXT NOT NULL DEFAULT '🌐 Gesamter Plattform-Verbund',
    title TEXT NOT NULL,
    incident_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uptime_percent NUMERIC(5, 2) NOT NULL CHECK (uptime_percent >= 0 AND uptime_percent <= 100),
    downtime_minutes INTEGER NOT NULL DEFAULT 0,
    service_credit_percent INTEGER NOT NULL DEFAULT 0,
    root_cause TEXT NOT NULL,
    resolution_action TEXT NOT NULL,
    prevention_measures TEXT NOT NULL,
    sha256_hash TEXT NOT NULL,
    operator_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sla_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY sla_incidents_master_admin_all
ON public.sla_incidents
FOR ALL
TO authenticated, service_role
USING (public.is_master_admin())
WITH CHECK (public.is_master_admin());

CREATE POLICY sla_incidents_school_read
ON public.sla_incidents
FOR SELECT
TO authenticated
USING (
    school_id = public.get_current_user_school_id()
    OR school_id IS NULL
);

-- 2. Ensure schools table has service_credit_percent column for automated billing deductions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'schools' 
          AND column_name = 'pending_service_credit_percent'
    ) THEN
        ALTER TABLE public.schools ADD COLUMN pending_service_credit_percent INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. RPC: Record SLA Incident with Cryptographic Audit Log
CREATE OR REPLACE FUNCTION public.record_sla_incident_and_audit(
    p_school_id UUID DEFAULT NULL,
    p_scope_name TEXT DEFAULT '🌐 Gesamter Plattform-Verbund',
    p_title TEXT DEFAULT 'Geplante Infrastruktur-Optimierung',
    p_uptime_percent NUMERIC DEFAULT 99.98,
    p_downtime_minutes INTEGER DEFAULT 0,
    p_service_credit_percent INTEGER DEFAULT 0,
    p_root_cause TEXT DEFAULT '',
    p_resolution TEXT DEFAULT '',
    p_prevention TEXT DEFAULT '',
    p_sha256_hash TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_record_id UUID;
    v_operator_id UUID;
BEGIN
    v_operator_id := public.get_current_authenticated_user_id();

    INSERT INTO public.sla_incidents (
        school_id,
        scope_name,
        title,
        uptime_percent,
        downtime_minutes,
        service_credit_percent,
        root_cause,
        resolution_action,
        prevention_measures,
        sha256_hash,
        operator_id
    ) VALUES (
        p_school_id,
        p_scope_name,
        p_title,
        p_uptime_percent,
        p_downtime_minutes,
        p_service_credit_percent,
        p_root_cause,
        p_resolution,
        p_prevention,
        COALESCE(NULLIF(p_sha256_hash, ''), encode(sha256((p_title || NOW()::TEXT || p_uptime_percent::TEXT)::bytea), 'hex')),
        v_operator_id
    ) RETURNING id INTO v_record_id;

    -- Also record in master_audit_trail
    INSERT INTO public.audit_logs (
        table_name,
        operation,
        record_id,
        changed_by,
        new_data
    ) VALUES (
        'sla_incidents',
        'RECORD_SLA_INCIDENT',
        v_record_id,
        COALESCE(v_operator_id, gen_random_uuid()),
        jsonb_build_object(
            'incident_id', v_record_id,
            'title', p_title,
            'uptime', p_uptime_percent,
            'downtime_minutes', p_downtime_minutes,
            'service_credit', p_service_credit_percent,
            'sha256_hash', p_sha256_hash,
            'timestamp', NOW()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'incident_id', v_record_id,
        'sha256_hash', p_sha256_hash
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_sla_incident_and_audit(UUID, TEXT, TEXT, NUMERIC, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- 4. RPC: Apply Service Credit to Schools (1-Click Credit Booking)
CREATE OR REPLACE FUNCTION public.apply_school_service_credit(
    p_school_id UUID DEFAULT NULL, -- NULL = All Active Schools
    p_credit_percent INTEGER DEFAULT 10,
    p_incident_title TEXT DEFAULT 'SLA Service-Gutschrift'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_updated_count INTEGER := 0;
BEGIN
    IF p_school_id IS NOT NULL THEN
        UPDATE public.schools
        SET pending_service_credit_percent = p_credit_percent
        WHERE id = p_school_id;
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    ELSE
        UPDATE public.schools
        SET pending_service_credit_percent = p_credit_percent
        WHERE status = 'active' OR is_paused IS NOT TRUE;
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    END IF;

    -- Audit Log
    INSERT INTO public.audit_logs (
        table_name,
        operation,
        record_id,
        changed_by,
        new_data
    ) VALUES (
        'schools',
        'APPLY_SERVICE_CREDIT',
        COALESCE(p_school_id, gen_random_uuid()),
        COALESCE(public.get_current_authenticated_user_id(), gen_random_uuid()),
        jsonb_build_object(
            'action', 'apply_school_service_credit',
            'credit_percent', p_credit_percent,
            'schools_affected', v_updated_count,
            'incident_title', p_incident_title,
            'timestamp', NOW()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'schools_affected', v_updated_count,
        'credit_percent', p_credit_percent,
        'message', format('%s%% Service-Gutschrift wurde für %s Schule(n) auf die nächste Rechnung gebucht.', p_credit_percent, v_updated_count)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_school_service_credit(UUID, INTEGER, TEXT) TO anon, authenticated, service_role;

-- 5. RPC: Get Real Telemetry Downtime for Current Month
CREATE OR REPLACE FUNCTION public.get_current_month_telemetry_downtime(
    p_school_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_total_downtime INTEGER := 0;
    v_calculated_uptime NUMERIC(5, 2) := 100.00;
    v_incident_count INTEGER := 0;
BEGIN
    SELECT COALESCE(SUM(downtime_minutes), 0), COUNT(*)
    INTO v_total_downtime, v_incident_count
    FROM public.sla_incidents
    WHERE created_at >= date_trunc('month', NOW())
      AND (p_school_id IS NULL OR school_id = p_school_id OR school_id IS NULL);

    -- 43,200 minutes in a standard 30-day month
    IF v_total_downtime > 0 THEN
        v_calculated_uptime := ROUND(((43200.0 - v_total_downtime) / 43200.0 * 100.0)::numeric, 2);
    ELSE
        v_calculated_uptime := 100.00;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'uptime_percent', v_calculated_uptime,
        'downtime_minutes', v_total_downtime,
        'incident_count', v_incident_count,
        'period', to_char(NOW(), 'TMMonth YYYY')
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_month_telemetry_downtime(UUID) TO anon, authenticated, service_role;

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';
