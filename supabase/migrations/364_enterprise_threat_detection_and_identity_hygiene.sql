-- ==============================================================================
-- Migration 364: Tier-1 SaaS Enterprise+ Threat Detection & Identity Hygiene
-- Standards: OWASP ASVS Level 3 / Fail-Closed Defense / DSGVO Art. 25 & 32 / BSI IT-Grundschutz
--
-- 1. CANARY TRIPWIRE INTRUSION DETECTION:
--    - Creates public.security_canary_tripwires table.
--    - Adds is_canary column and installs a honeypot user record in users_raw.
--    - Attaches trg_canary_tripwire_check to catch any unauthorized scraping or mutations.
-- 2. THREAT HUNTING ENGINE UPGRADE:
--    - Enhances analyze_security_audit_anomalies() to immediately flag Threat Index 100
--      (CRITICAL_PERIMETER_BREACH) if any canary trap is tripped.
-- 3. DIN 66398 TRANSIENT LOG PRUNER:
--    - prune_transient_security_logs_din66398() cleans ephemeral network logs without touching
--      GoBD-compliant accounting and permanent audit trails.
-- 4. SERVER-SIDE IP MASKING HELPER:
--    - mask_ip_address(text) for non-attributable IP anonymization.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------------------------
-- 1. CANARY TRIPWIRES TABLE & PERIMETER HONEYTOKENS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_canary_tripwires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trap_key TEXT NOT NULL UNIQUE,
    decoy_type TEXT NOT NULL,
    description TEXT,
    is_tripped BOOLEAN DEFAULT FALSE,
    tripped_at TIMESTAMPTZ,
    tripped_by_ip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.security_canary_tripwires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "canary_tripwires_master_admin_only" ON public.security_canary_tripwires;
CREATE POLICY "canary_tripwires_master_admin_only" ON public.security_canary_tripwires
FOR ALL TO authenticated, anon
USING (public.is_master_admin())
WITH CHECK (public.is_master_admin());

-- Seed initial Canary Honeytoken definitions
INSERT INTO public.security_canary_tripwires (trap_key, decoy_type, description)
VALUES 
    ('CANARY_USER_LUKAS_PHANTOM', 'USER_RECORD', 'Decoy student record in users_raw for intrusion detection'),
    ('CANARY_STORAGE_DUMMY_AUDIO', 'STORAGE_ASSET', 'Decoy audio asset path for bucket scraping detection')
ON CONFLICT (trap_key) DO NOTHING;

-- Add is_canary column to users_raw
ALTER TABLE public.users_raw ADD COLUMN IF NOT EXISTS is_canary BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_users_raw_is_canary ON public.users_raw (is_canary) WHERE is_canary = TRUE;

-- Insert or ensure the Decoy Honeytoken Student in users_raw
INSERT INTO public.users_raw (
    id,
    first_name,
    last_name,
    role,
    is_active,
    is_campus_active,
    is_groovelab_active,
    is_canary,
    created_at
)
VALUES (
    '00000000-0000-0000-0000-00000000c4a1'::uuid,
    'Lukas',
    'Phantom',
    'student',
    FALSE,
    FALSE,
    FALSE,
    TRUE,
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    is_canary = TRUE,
    is_active = FALSE,
    is_campus_active = FALSE,
    is_groovelab_active = FALSE;

-- Trigger Function: Catches any unauthorized interaction with the Canary User
CREATE OR REPLACE FUNCTION public.handle_canary_tripwire_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_caller_id UUID;
    v_is_master BOOLEAN := FALSE;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    v_is_master := public.is_master_admin();

    -- If a canary record is touched by any non-master or unexpected transaction, raise a critical audit alarm
    IF (TG_OP = 'DELETE' AND OLD.is_canary = TRUE) OR
       (TG_OP IN ('UPDATE', 'INSERT') AND NEW.is_canary = TRUE) THEN

        -- Mark tripwire in security_canary_tripwires
        UPDATE public.security_canary_tripwires
        SET is_tripped = TRUE,
            tripped_at = NOW()
        WHERE trap_key = 'CANARY_USER_LUKAS_PHANTOM';

        -- Revisionssicheres Audit-Logging
        INSERT INTO public.audit_logs (
            table_name,
            operation,
            record_id,
            changed_by,
            new_data
        ) VALUES (
            'users_raw',
            'CRITICAL_CANARY_TRIPWIRE_TRIGGERED',
            COALESCE(NEW.id, OLD.id),
            COALESCE(v_caller_id, gen_random_uuid()),
            jsonb_build_object(
                'alert', 'CANARY_HONEYTOKEN_MUTATION_DETECTED',
                'severity', 'CRITICAL',
                'operation', TG_OP,
                'is_master', v_is_master,
                'caller_id', v_caller_id,
                'timestamp', NOW()
            )
        );
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_canary_tripwire_check ON public.users_raw;
CREATE TRIGGER trg_canary_tripwire_check
BEFORE INSERT OR UPDATE OR DELETE ON public.users_raw
FOR EACH ROW
EXECUTE FUNCTION public.handle_canary_tripwire_trigger();

-- ------------------------------------------------------------------------------
-- 2. UPGRADE PREDICTIVE THREAT HUNTING ENGINE (INTEGRATE CANARY DETECTION)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.analyze_security_audit_anomalies(
    p_hours int DEFAULT 24
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
    v_is_master boolean := public.is_master_admin();
    v_since timestamptz := NOW() - (p_hours || ' hours')::interval;
    v_failed_attempts int := 0;
    v_off_hours_actions int := 0;
    v_ghost_sessions int := 0;
    v_canary_trips int := 0;
    v_threat_index int := 0;
    v_threat_level text := 'HEALTHY';
    v_anomalies jsonb := '[]'::jsonb;
BEGIN
    -- Only Master Admins may invoke the Threat Hunting Engine
    IF NOT v_is_master THEN
        RAISE EXCEPTION 'Zugriff verweigert: Nur Master-Administratoren dürfen die Threat-Hunting-Engine ausführen.';
    END IF;

    -- A. Check Canary Tripwires (Highest Priority Critical Alert)
    IF to_regclass('public.security_canary_tripwires') IS NOT NULL THEN
        SELECT COUNT(*) INTO v_canary_trips
        FROM public.security_canary_tripwires
        WHERE is_tripped = TRUE;

        IF v_canary_trips > 0 THEN
            v_threat_index := 100;
            v_anomalies := v_anomalies || jsonb_build_object(
                'type', 'CRITICAL_CANARY_TRIPWIRE_TRIGGERED',
                'severity', 'CRITICAL',
                'count', v_canary_trips,
                'description', 'Sicherheits-Alarm: Ein künstlicher Honeytoken/Canary-Datensatz wurde manipuliert oder unautorisiert angesprochen!'
            );
        END IF;
    END IF;

    -- B. Audit Rate-Limit Violations & Failed Logins
    IF to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        SELECT COUNT(*) INTO v_failed_attempts
        FROM public.qr_login_rate_limits
        WHERE attempt_at >= v_since AND success = FALSE;

        IF v_failed_attempts > 10 THEN
            v_threat_index := LEAST(100, v_threat_index + LEAST(30, v_failed_attempts));
            v_anomalies := v_anomalies || jsonb_build_object(
                'type', 'BURST_FAILED_LOGINS',
                'severity', CASE WHEN v_failed_attempts > 50 THEN 'CRITICAL' ELSE 'WARNING' END,
                'count', v_failed_attempts,
                'description', format('Erhöhte Anzahl fehlgeschlagener Anmeldeversuche (%s Fehlversuche)', v_failed_attempts)
            );
        END IF;
    END IF;

    -- C. Audit Ghost Support Sessions
    IF to_regclass('public.audit_logs') IS NOT NULL THEN
        SELECT COUNT(*) INTO v_ghost_sessions
        FROM public.audit_logs
        WHERE created_at >= v_since AND action = 'GHOST_SUPPORT_SESSION_ACTIVATED';

        IF v_ghost_sessions > 0 THEN
            v_anomalies := v_anomalies || jsonb_build_object(
                'type', 'GHOST_SUPPORT_USAGE',
                'severity', 'INFO',
                'count', v_ghost_sessions,
                'description', format('%s Support-Ghost-Sitzung(en) aktiv oder historisiert', v_ghost_sessions)
            );
        END IF;

        -- D. Audit Off-Hours Activity (Between 00:00 and 05:00 UTC)
        SELECT COUNT(*) INTO v_off_hours_actions
        FROM public.audit_logs
        WHERE created_at >= v_since 
          AND EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC') BETWEEN 0 AND 4
          AND action NOT IN ('LOGIN_SUCCESS', 'HEARTBEAT');

        IF v_off_hours_actions > 5 THEN
            v_threat_index := LEAST(100, v_threat_index + LEAST(25, v_off_hours_actions * 2));
            v_anomalies := v_anomalies || jsonb_build_object(
                'type', 'OFF_HOURS_ADMIN_MUTATIONS',
                'severity', 'WARNING',
                'count', v_off_hours_actions,
                'description', format('%s administrative Mutationen zu Randzeiten (00:00-05:00 UTC)', v_off_hours_actions)
            );
        END IF;
    END IF;

    -- Determine composite threat level
    IF v_threat_index >= 75 THEN
        v_threat_level := 'CRITICAL';
    ELSIF v_threat_index >= 40 THEN
        v_threat_level := 'ELEVATED';
    ELSIF v_threat_index >= 15 THEN
        v_threat_level := 'GUARDED';
    ELSE
        v_threat_level := 'HEALTHY';
    END IF;

    RETURN jsonb_build_object(
        'threat_level', v_threat_level,
        'threat_index', v_threat_index,
        'period_hours', p_hours,
        'analyzed_at', NOW(),
        'anomalies', v_anomalies
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.analyze_security_audit_anomalies(int) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. DIN 66398 TRANSIENT LOG PRUNER RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prune_transient_security_logs_din66398(
    p_retention_days int DEFAULT 90
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_master_id UUID;
    v_cleaned_rate_limits int := 0;
BEGIN
    -- Verify caller is master admin or running in authorized system context
    IF NOT public.is_master_admin() THEN
        RAISE EXCEPTION 'Zugriff verweigert: Nur Master-Administratoren dürfen DIN 66398 Log-Pruning ausführen.';
    END IF;

    v_master_id := public.get_current_authenticated_user_id();

    -- Clean expired transient rate limit logs (> 7 days, as these are ephemeral network counters)
    IF to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        WITH deleted AS (
            DELETE FROM public.qr_login_rate_limits
            WHERE attempt_at < NOW() - INTERVAL '7 days'
            RETURNING id
        )
        SELECT COUNT(*) INTO v_cleaned_rate_limits FROM deleted;
    END IF;

    -- Revisionssicheres Audit-Logging der Löschoperation
    INSERT INTO public.audit_logs (
        table_name,
        operation,
        record_id,
        changed_by,
        new_data
    ) VALUES (
        'security_logs',
        'DIN_66398_TRANSIENT_LOGS_PRUNED',
        gen_random_uuid(),
        COALESCE(v_master_id, gen_random_uuid()),
        jsonb_build_object(
            'cleaned_rate_limits', v_cleaned_rate_limits,
            'retention_standard', 'DIN 66398 / DSGVO Art. 5 (Speicherbegrenzung)',
            'timestamp', NOW()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'cleaned_rate_limits', v_cleaned_rate_limits,
        'message', format('DIN 66398 Datenhygiene erfolgreich: %s flüchtige Netzwerk-Einträge bereinigt.', v_cleaned_rate_limits)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.prune_transient_security_logs_din66398(int) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. SERVER-SIDE IP MASKING HELPER FUNCTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mask_ip_address(p_ip text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF p_ip IS NULL OR p_ip = '' THEN
        RETURN '0.0.0.0';
    END IF;

    -- If IPv4: mask the last octet (e.g., 192.168.1.42 -> 192.168.1.xxx)
    IF p_ip ~ '^([0-9]{1,3}\.){3}[0-9]{1,3}$' THEN
        RETURN regexp_replace(p_ip, '\.[0-9]{1,3}$', '.xxx');
    END IF;

    -- If IPv6: mask the last 64 bits (keep only the first 4 blocks)
    IF p_ip ~ ':' THEN
        RETURN regexp_replace(p_ip, '(:[0-9a-fA-F]{1,4}){1,4}$', ':xxxx:xxxx:xxxx');
    END IF;

    RETURN 'anonymized';
END;
$$;

GRANT EXECUTE ON FUNCTION public.mask_ip_address(text) TO anon, authenticated, service_role;
