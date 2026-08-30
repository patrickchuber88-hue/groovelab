-- ==============================================================================
-- MIGRATION 298: Enterprise Incident Response, WAF Shield & GDPR Lifecycle Engine
-- Campus-Groovelab Tier-1 SaaS Enterprise+ Goldstandard Fortification
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BRUTE-FORCE SHIELD & AUTO-JAIL (Rate Limiting & Intrusion Defense)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_lockouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL, -- IP address, username or device key
    failed_attempts INT DEFAULT 1,
    locked_until TIMESTAMPTZ,
    last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_lockouts_identifier ON public.security_lockouts(identifier, last_attempt_at);

ALTER TABLE public.security_lockouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "security_lockouts_admin" ON public.security_lockouts;
CREATE POLICY "security_lockouts_admin" ON public.security_lockouts
FOR ALL TO authenticated, service_role
USING (
    public.is_master_admin()
    OR (school_id = public.get_current_user_school_id() AND public.get_current_user_role() IN ('admin', 'secretary'))
);

-- Function to record failed login attempts and trigger 15-min lockout after 5 fails in 2 minutes
CREATE OR REPLACE FUNCTION public.record_failed_auth_attempt(
    p_identifier TEXT,
    p_school_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_clean_id TEXT := LOWER(TRIM(p_identifier));
    v_record RECORD;
    v_locked_until TIMESTAMPTZ := NULL;
    v_is_locked BOOLEAN := FALSE;
BEGIN
    IF v_clean_id IS NULL OR v_clean_id = '' THEN
        RETURN jsonb_build_object('is_locked', false);
    END IF;

    -- Fetch recent attempt record
    SELECT * INTO v_record
    FROM public.security_lockouts
    WHERE identifier = v_clean_id
      AND last_attempt_at > (NOW() - INTERVAL '2 minutes')
    ORDER BY last_attempt_at DESC
    LIMIT 1;

    IF v_record.id IS NOT NULL THEN
        -- Check if already locked
        IF v_record.locked_until IS NOT NULL AND v_record.locked_until > NOW() THEN
            RETURN jsonb_build_object('is_locked', true, 'locked_until', v_record.locked_until);
        END IF;

        -- Increment attempts
        IF v_record.failed_attempts + 1 >= 5 THEN
            v_locked_until := NOW() + INTERVAL '15 minutes';
            v_is_locked := TRUE;
        END IF;

        UPDATE public.security_lockouts
        SET failed_attempts = failed_attempts + 1,
            locked_until = v_locked_until,
            last_attempt_at = NOW()
        WHERE id = v_record.id;
    ELSE
        INSERT INTO public.security_lockouts (identifier, failed_attempts, last_attempt_at, school_id)
        VALUES (v_clean_id, 1, NOW(), p_school_id);
    END IF;

    RETURN jsonb_build_object(
        'is_locked', v_is_locked,
        'locked_until', v_locked_until
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_failed_auth_attempt(TEXT, UUID) TO anon, authenticated, service_role;

-- Function to check if a client/IP is currently locked
CREATE OR REPLACE FUNCTION public.check_is_client_locked(p_identifier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_clean_id TEXT := LOWER(TRIM(p_identifier));
    v_is_locked BOOLEAN := FALSE;
BEGIN
    IF v_clean_id IS NULL OR v_clean_id = '' THEN
        RETURN FALSE;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.security_lockouts
        WHERE identifier = v_clean_id
          AND locked_until IS NOT NULL
          AND locked_until > NOW()
    ) INTO v_is_locked;

    RETURN v_is_locked;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_is_client_locked(TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2. 1-CLICK INCIDENT RESET (Master Token & Session Lease Rotation)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_incident_reset(
    p_new_master_password TEXT DEFAULT NULL,
    p_reason TEXT DEFAULT 'Emergency Security Incident Reset'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_catalog
AS $$
DECLARE
    v_caller_id UUID := public.get_current_authenticated_user_id();
    v_admin_id UUID;
    v_revoked_sessions_count INT := 0;
    v_rotated_kiosks_count INT := 0;
    v_new_kiosk_root TEXT;
BEGIN
    -- Only authorized Master Admins can trigger global incident reset
    IF NOT public.is_master_admin() THEN
        RAISE EXCEPTION 'Unberechtigter Zugriff: Nur autorisierte Master-Administratoren dürfen einen Incident-Reset ausführen.';
    END IF;

    -- 1. Revoke ALL active user and admin session leases immediately
    UPDATE public.session_leases
    SET is_revoked = TRUE
    WHERE is_revoked = FALSE;
    GET DIAGNOSTICS v_revoked_sessions_count = ROW_COUNT;

    -- 2. Rotate all kiosk secret tokens to unpredictable random tokens
    UPDATE public.kiosks
    SET secret_token = 'KIOSK_' || encode(extensions.gen_random_bytes(16), 'hex')
    WHERE id IS NOT NULL;
    GET DIAGNOSTICS v_rotated_kiosks_count = ROW_COUNT;

    -- 3. Update master admin credentials if provided
    SELECT id INTO v_admin_id FROM public.users_raw WHERE is_master_admin = TRUE LIMIT 1;
    IF v_admin_id IS NOT NULL AND p_new_master_password IS NOT NULL AND p_new_master_password <> '' THEN
        INSERT INTO private_auth.user_secrets (user_id, master_admin_password, updated_at)
        VALUES (v_admin_id, p_new_master_password, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            master_admin_password = EXCLUDED.master_admin_password,
            updated_at = NOW();
    END IF;

    -- 4. Rotate Master Admin QR/Kiosk token
    v_new_kiosk_root := 'ROOT_KIOSK_' || encode(extensions.gen_random_bytes(12), 'hex');
    IF v_admin_id IS NOT NULL THEN
        UPDATE public.users_raw
        SET qr_token = v_new_kiosk_root
        WHERE id = v_admin_id;
    END IF;

    -- 5. Clear all lockout tables to reset clean state
    DELETE FROM public.security_lockouts;

    RETURN jsonb_build_object(
        'success', true,
        'revoked_sessions_count', v_revoked_sessions_count,
        'rotated_kiosks_count', v_rotated_kiosks_count,
        'new_root_kiosk_token', v_new_kiosk_root,
        'executed_at', NOW(),
        'reason', p_reason
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_incident_reset(TEXT, TEXT) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. AUTOMATED GDPR 30-DAY RETENTION CLEANER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_expired_gdpr_retention()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_deleted_leases INT := 0;
    v_deleted_lockouts INT := 0;
BEGIN
    -- Delete inactive session leases older than 30 days
    DELETE FROM public.session_leases
    WHERE is_revoked = TRUE 
       OR last_active_at < (NOW() - INTERVAL '30 days');
    GET DIAGNOSTICS v_deleted_leases = ROW_COUNT;

    -- Delete old lockout records older than 24 hours
    DELETE FROM public.security_lockouts
    WHERE last_attempt_at < (NOW() - INTERVAL '24 hours');
    GET DIAGNOSTICS v_deleted_lockouts = ROW_COUNT;

    RETURN jsonb_build_object(
        'deleted_session_leases', v_deleted_leases,
        'deleted_lockouts', v_deleted_lockouts,
        'cleaned_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_gdpr_retention() TO authenticated, service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
