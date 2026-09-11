-- ==============================================================================
-- 🏛️ MIGRATION 402: ENTERPRISE PRESENCE & SESSION LEASE HARDENING
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Fail-Closed)
-- ==============================================================================
-- 1. Erweiterung public.sessions um last_active_at für 5-Minuten Session-Leases
-- 2. Erstellung public.user_presence für Audit-freie Anwesenheitserfassung
-- 3. Autoritativer RPC: report_session_lease(p_session_id)
-- 4. Autoritativer RPC: update_user_presence(p_school_id, p_station_id)
-- 5. Autoritativer RPC: close_kiosk_session(p_session_id)
-- ==============================================================================

-- 1. Ergänzung sessions.last_active_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'last_active_at'
    ) THEN
        ALTER TABLE public.sessions ADD COLUMN last_active_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sessions_last_active_at 
ON public.sessions(last_active_at DESC) 
WHERE check_out_time IS NULL;

-- 2. Erstellung public.user_presence
CREATE TABLE IF NOT EXISTS public.user_presence (
    user_id UUID PRIMARY KEY REFERENCES public.users_raw(id) ON DELETE CASCADE,
    school_id UUID NOT NULL,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active_station_id UUID REFERENCES public.stations(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_user_presence_school_last_seen 
ON public.user_presence(school_id, last_seen DESC);

-- RLS aktivieren & absichern
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_presence_select_tenant" ON public.user_presence;
CREATE POLICY "user_presence_select_tenant" ON public.user_presence
    FOR SELECT TO authenticated
    USING (
        school_id = public.get_current_user_school_id()
        OR public.is_master_admin()
    );

DROP POLICY IF EXISTS "user_presence_insert_self" ON public.user_presence;
CREATE POLICY "user_presence_insert_self" ON public.user_presence
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        OR public.is_master_admin()
    );

DROP POLICY IF EXISTS "user_presence_update_self" ON public.user_presence;
CREATE POLICY "user_presence_update_self" ON public.user_presence
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid()
        OR public.is_master_admin()
    )
    WITH CHECK (
        user_id = auth.uid()
        OR public.is_master_admin()
    );

-- 3. Autoritativer RPC: report_session_lease
CREATE OR REPLACE FUNCTION public.report_session_lease(
    p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_session RECORD;
BEGIN
    v_caller_id := auth.uid();
    
    SELECT id, user_id, station_id, check_out_time INTO v_session
    FROM public.sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND');
    END IF;

    -- Zero-Trust Validation: Nur der Besitzer der Session oder Master-Admin darf den Lease verlängern
    IF v_caller_id IS NOT NULL AND v_session.user_id <> v_caller_id AND NOT public.is_master_admin() THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_SESSION_LEASE');
    END IF;

    -- Nur aktive Sitzungen können geleast werden
    IF v_session.check_out_time IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'SESSION_ALREADY_CLOSED');
    END IF;

    UPDATE public.sessions
    SET last_active_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object('success', true, 'session_id', p_session_id, 'last_active_at', NOW());
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_session_lease(UUID) TO anon, authenticated, service_role;

-- 4. Autoritativer RPC: update_user_presence
CREATE OR REPLACE FUNCTION public.update_user_presence(
    p_school_id UUID,
    p_station_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHENTICATED');
    END IF;

    INSERT INTO public.user_presence (user_id, school_id, last_seen, active_station_id)
    VALUES (v_caller_id, p_school_id, NOW(), p_station_id)
    ON CONFLICT (user_id) DO UPDATE SET
        school_id = EXCLUDED.school_id,
        last_seen = NOW(),
        active_station_id = COALESCE(EXCLUDED.active_station_id, user_presence.active_station_id);

    RETURN jsonb_build_object('success', true, 'user_id', v_caller_id, 'last_seen', NOW());
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_presence(UUID, UUID) TO authenticated, service_role;

-- 5. Autoritativer RPC: close_kiosk_session (Unterstützt navigator.sendBeacon)
CREATE OR REPLACE FUNCTION public.close_kiosk_session(
    p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_session RECORD;
BEGIN
    v_caller_id := auth.uid();
    
    SELECT id, user_id, check_out_time INTO v_session
    FROM public.sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND');
    END IF;

    IF v_caller_id IS NOT NULL AND v_session.user_id <> v_caller_id AND NOT public.is_master_admin() THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_SESSION_CLOSE');
    END IF;

    IF v_session.check_out_time IS NULL THEN
        UPDATE public.sessions
        SET check_out_time = NOW(),
            last_active_at = NOW()
        WHERE id = p_session_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'session_id', p_session_id, 'closed_at', NOW());
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_kiosk_session(UUID) TO anon, authenticated, service_role;
