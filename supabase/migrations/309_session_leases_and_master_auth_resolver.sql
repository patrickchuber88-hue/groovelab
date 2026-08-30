-- ==============================================================================
-- Migration 309: Session Leases Table & Robust Master Auth Resolver
-- Standard: OWASP ASVS Level 3 Session Lease Architecture
-- ==============================================================================

-- 1. Create public.session_leases table if not exists
CREATE TABLE IF NOT EXISTS public.session_leases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users_raw(id) ON DELETE CASCADE,
    device_key TEXT,
    role TEXT DEFAULT 'teacher',
    school_id UUID,
    ip_address TEXT,
    user_agent TEXT,
    is_revoked BOOLEAN DEFAULT FALSE,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_session_leases_user ON public.session_leases(user_id);
CREATE INDEX IF NOT EXISTS idx_session_leases_token ON public.session_leases(id, device_key);
CREATE INDEX IF NOT EXISTS idx_session_leases_active ON public.session_leases(is_revoked, last_active_at);

-- Enable RLS and FORCE RLS
ALTER TABLE public.session_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_leases FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS session_leases_master_admin_all ON public.session_leases;
CREATE POLICY session_leases_master_admin_all ON public.session_leases
FOR ALL TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- 2. Update get_current_authenticated_user_id() to robustly check user_id and session_leases
CREATE OR REPLACE FUNCTION public.get_current_authenticated_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET row_security TO 'off'
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_headers text;
    v_token text;
    v_user_id text;
    v_client_info text;
    v_resolved_id UUID;
    v_auth_uid UUID;
BEGIN
    -- 1. Check native Supabase Auth JWT if present
    BEGIN
        v_auth_uid := auth.uid();
        IF v_auth_uid IS NOT NULL THEN
            RETURN v_auth_uid;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_auth_uid := NULL;
    END;

    -- 2. Extract headers
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN NULL;
    END IF;

    -- Direct x-user-id or inside x-client-info
    BEGIN
        v_client_info := v_headers::json->>'x-client-info';
        v_user_id := v_headers::json->>'x-user-id';
        IF v_user_id IS NULL OR v_user_id = '' THEN
            IF v_client_info IS NOT NULL THEN
                v_user_id := substring(v_client_info from ';user_id=([^;]+)');
            END IF;
        END IF;

        IF v_user_id IS NOT NULL AND v_user_id <> '' THEN
            SELECT id INTO v_resolved_id
            FROM public.users_raw
            WHERE id = v_user_id::uuid
              AND is_active = TRUE;
            IF v_resolved_id IS NOT NULL THEN
                RETURN v_resolved_id;
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_resolved_id := NULL;
    END;

    -- Check direct x-session-token header or in client-info
    BEGIN
        v_token := v_headers::json->>'x-session-token';
        IF v_token IS NULL OR v_token = '' THEN
            IF v_client_info IS NOT NULL THEN
                v_token := substring(v_client_info from ';session_token=([^;]+)');
            END IF;
        END IF;

        IF v_token IS NOT NULL AND v_token <> '' AND to_regclass('public.session_leases') IS NOT NULL THEN
            SELECT user_id INTO v_resolved_id
            FROM public.session_leases
            WHERE (id::text = v_token OR device_key = v_token)
              AND is_revoked = FALSE
              AND last_active_at > (NOW() - INTERVAL '30 days')
            LIMIT 1;

            IF v_resolved_id IS NOT NULL THEN
                RETURN v_resolved_id;
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_resolved_id := NULL;
    END;

    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$function$;

-- 3. Dedicated Master Admin Fetch RPC as a high-availability fallback
CREATE OR REPLACE FUNCTION public.get_master_admin_schools()
RETURNS SETOF public.schools
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
SET row_security = off
AS $$
BEGIN
    IF NOT public.is_master_admin() THEN
        RAISE EXCEPTION 'Access Denied: Master Admin authorization required.';
    END IF;
    RETURN QUERY SELECT * FROM public.schools ORDER BY name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_master_admin_schools() TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.session_leases TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
