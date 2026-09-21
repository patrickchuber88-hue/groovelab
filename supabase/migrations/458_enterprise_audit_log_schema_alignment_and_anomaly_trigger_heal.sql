-- ==============================================================================
-- Migration 458: Enterprise Audit Log Schema Alignment & Anomaly Trigger Heal
-- Aligns trg_detect_login_anomaly with public.audit_logs real schema
-- Prevents PostgreSQL error 42703 (undefined_column: target_entity/new_values)
-- and wraps audit execution in resilient block to guarantee zero-fail auth RPCs.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.trg_detect_login_anomaly()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_recent_failures int;
    v_school_id uuid;
BEGIN
    -- Only inspect failed login attempts
    IF NEW.success IS FALSE THEN
        SELECT COUNT(*) INTO v_recent_failures
        FROM public.qr_login_rate_limits
        WHERE ip_hash = NEW.ip_hash
          AND success IS FALSE
          AND COALESCE(attempt_at, NOW()) > (NOW() - INTERVAL '5 minutes');

        IF v_recent_failures >= 5 THEN
            IF to_regclass('public.audit_logs') IS NOT NULL THEN
                BEGIN
                    -- Extract school_id safely if column exists on record
                    BEGIN
                        v_school_id := NEW.school_id;
                    EXCEPTION WHEN OTHERS THEN
                        v_school_id := NULL;
                    END;

                    INSERT INTO public.audit_logs (
                        table_name,
                        record_id,
                        action,
                        details,
                        school_id
                    ) VALUES (
                        'qr_login_rate_limits',
                        NEW.id,
                        'SECURITY_INCIDENT_BRUTE_FORCE_BURST',
                        jsonb_build_object(
                            'incident_level', 'CRITICAL',
                            'target_entity', 'network_ip:' || COALESCE(NEW.ip_hash, 'UNKNOWN'),
                            'recent_failures_count', v_recent_failures,
                            'timestamp', NOW()
                        ),
                        v_school_id
                    );
                EXCEPTION WHEN OTHERS THEN
                    -- Resilient Audit: Incident logging must NEVER crash authentication flow
                    NULL;
                END;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Ensure trigger is active on public.qr_login_rate_limits
DO $$
BEGIN
    IF to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_alert_login_anomalies ON public.qr_login_rate_limits;
        CREATE TRIGGER trg_alert_login_anomalies
        AFTER INSERT ON public.qr_login_rate_limits
        FOR EACH ROW
        EXECUTE FUNCTION public.trg_detect_login_anomaly();
    END IF;
END $$;
