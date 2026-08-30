-- Migration 293: Zero-Trust Session Leases, Remote Logout & Security Management Suite
-- Implements:
-- 1. Atomic session_leases table for tracking active device sessions per school
-- 2. RPC register_session_lease
-- 3. RPC revoke_session_lease & revoke_all_user_session_leases
-- 4. RPC get_school_security_overview for Admin Security Dashboard
-- 5. Full RLS isolation

-- 1. Create session_leases table
CREATE TABLE IF NOT EXISTS public.session_leases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    device_key TEXT NOT NULL,
    user_agent TEXT,
    role TEXT NOT NULL DEFAULT 'student',
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_leases_user_id ON public.session_leases(user_id);
CREATE INDEX IF NOT EXISTS idx_session_leases_school_id ON public.session_leases(school_id);
CREATE INDEX IF NOT EXISTS idx_session_leases_device_key ON public.session_leases(device_key);

-- 2. RLS for session_leases
ALTER TABLE public.session_leases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_leases_select" ON public.session_leases;
CREATE POLICY "session_leases_select" ON public.session_leases
FOR SELECT TO authenticated, anon
USING (
    public.is_master_admin()
    OR user_id = public.get_current_user_id()
    OR (
        public.check_school_access(school_id)
        AND public.get_current_user_role() IN ('admin', 'secretary')
    )
);

DROP POLICY IF EXISTS "session_leases_insert" ON public.session_leases;
CREATE POLICY "session_leases_insert" ON public.session_leases
FOR INSERT TO authenticated, anon
WITH CHECK (true);

DROP POLICY IF EXISTS "session_leases_update" ON public.session_leases;
CREATE POLICY "session_leases_update" ON public.session_leases
FOR UPDATE TO authenticated, anon
USING (
    public.is_master_admin()
    OR user_id = public.get_current_user_id()
    OR (
        public.check_school_access(school_id)
        AND public.get_current_user_role() IN ('admin', 'secretary')
    )
);

-- 3. Register or Touch Session Lease RPC
CREATE OR REPLACE FUNCTION public.register_session_lease(
    p_user_id UUID,
    p_school_id UUID,
    p_device_name TEXT,
    p_device_key TEXT,
    p_role TEXT,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_lease_id UUID;
    v_is_revoked BOOLEAN;
BEGIN
    -- Check if an active lease already exists for this device_key + user_id
    SELECT id, is_revoked INTO v_lease_id, v_is_revoked
    FROM public.session_leases
    WHERE user_id = p_user_id AND device_key = p_device_key
    LIMIT 1;

    IF v_lease_id IS NOT NULL THEN
        IF v_is_revoked = TRUE THEN
            RETURN jsonb_build_object(
                'success', false,
                'revoked', true,
                'message', 'Diese Gerätesitzung wurde von der Schulleitung widerrufen.'
            );
        END IF;

        UPDATE public.session_leases
        SET last_active_at = NOW(),
            device_name = COALESCE(NULLIF(p_device_name, ''), device_name),
            user_agent = COALESCE(NULLIF(p_user_agent, ''), user_agent)
        WHERE id = v_lease_id;

        RETURN jsonb_build_object(
            'success', true,
            'lease_id', v_lease_id,
            'is_new', false
        );
    ELSE
        INSERT INTO public.session_leases (
            user_id, school_id, device_name, device_key, role, user_agent, last_active_at
        ) VALUES (
            p_user_id, p_school_id, COALESCE(NULLIF(p_device_name, ''), 'Unbekanntes Gerät'),
            p_device_key, p_role, p_user_agent, NOW()
        )
        RETURNING id INTO v_lease_id;

        RETURN jsonb_build_object(
            'success', true,
            'lease_id', v_lease_id,
            'is_new', true
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_session_lease(UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- 4. Revoke Single Session Lease RPC (1-Click Remote Logout)
CREATE OR REPLACE FUNCTION public.revoke_session_lease(
    p_lease_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_lease public.session_leases%ROWTYPE;
    v_caller_role TEXT := public.get_current_user_role();
    v_caller_school_id UUID := public.current_school_id();
BEGIN
    SELECT * INTO v_lease FROM public.session_leases WHERE id = p_lease_id;
    IF v_lease.id IS NULL THEN
        RETURN false;
    END IF;

    IF NOT (public.is_master_admin() OR (v_caller_school_id = v_lease.school_id AND v_caller_role IN ('admin', 'secretary')) OR public.get_current_user_id() = v_lease.user_id) THEN
        RAISE EXCEPTION 'Keine Berechtigung zum Widerrufen dieser Sitzung.';
    END IF;

    UPDATE public.session_leases
    SET is_revoked = TRUE,
        revoked_at = NOW()
    WHERE id = p_lease_id;

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_session_lease(UUID) TO anon, authenticated, service_role;

-- 5. Revoke All Sessions For A Target User RPC
CREATE OR REPLACE FUNCTION public.revoke_all_user_session_leases(
    p_target_user_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_target_school_id UUID;
    v_caller_role TEXT := public.get_current_user_role();
    v_caller_school_id UUID := public.current_school_id();
    v_count INT;
BEGIN
    SELECT school_id INTO v_target_school_id FROM public.users_raw WHERE id = p_target_user_id;
    IF v_target_school_id IS NULL THEN
        RETURN 0;
    END IF;

    IF NOT (public.is_master_admin() OR (v_caller_school_id = v_target_school_id AND v_caller_role IN ('admin', 'secretary')) OR public.get_current_user_id() = p_target_user_id) THEN
        RAISE EXCEPTION 'Keine Berechtigung zum Beenden aller Sitzungen.';
    END IF;

    UPDATE public.session_leases
    SET is_revoked = TRUE,
        revoked_at = NOW()
    WHERE user_id = p_target_user_id AND is_revoked = FALSE;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- Also close active sessions in sessions table
    UPDATE public.sessions
    SET check_out_time = NOW()
    WHERE user_id = p_target_user_id AND check_out_time IS NULL;

    RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_all_user_session_leases(UUID) TO anon, authenticated, service_role;

-- 6. Get School Security Overview RPC for Schulleitung Dashboard
CREATE OR REPLACE FUNCTION public.get_school_security_overview(
    p_school_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_caller_role TEXT := public.get_current_user_role();
    v_caller_school_id UUID := public.current_school_id();
    v_active_devices JSONB;
    v_blocked_count INT;
BEGIN
    IF NOT (public.is_master_admin() OR (v_caller_school_id = p_school_id AND v_caller_role IN ('admin', 'secretary'))) THEN
        RAISE EXCEPTION 'Keine Berechtigung zur Anzeige der Sicherheitsübersicht.';
    END IF;

    -- Aggregate active session leases with user info
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', sl.id,
            'user_id', sl.user_id,
            'user_name', ur.first_name || ' ' || COALESCE(substring(ur.last_name from 1 for 1) || '.', ''),
            'role', sl.role,
            'device_name', sl.device_name,
            'device_key', sl.device_key,
            'last_active_at', sl.last_active_at,
            'created_at', sl.created_at,
            'is_revoked', sl.is_revoked
        ) ORDER BY sl.last_active_at DESC
    ), '[]'::JSONB)
    INTO v_active_devices
    FROM public.session_leases sl
    JOIN public.users_raw ur ON sl.user_id = ur.id
    WHERE sl.school_id = p_school_id
    AND sl.last_active_at > (NOW() - INTERVAL '30 days');

    -- Count active rate-limited locks
    SELECT COUNT(*)::INT INTO v_blocked_count
    FROM public.auth_rate_limits
    WHERE locked_until > NOW();

    RETURN jsonb_build_object(
        'success', true,
        'school_id', p_school_id,
        'active_devices', v_active_devices,
        'blocked_attempts_count', v_blocked_count,
        'total_tracked_devices', jsonb_array_length(v_active_devices)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_school_security_overview(UUID) TO anon, authenticated, service_role;
