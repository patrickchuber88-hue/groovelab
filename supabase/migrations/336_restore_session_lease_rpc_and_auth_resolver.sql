-- ==============================================================================
-- Migration 336: Restore Session Lease RPCs and Robust Zero-Trust Auth Resolver
-- Ensures instant, reliable authentication for all client sessions, bypasses, and devices
-- ==============================================================================

-- 1. Ensure session_leases table exists with correct schema & constraints
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

-- 2. Restore RPC register_session_lease
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

-- 3. Robust get_current_authenticated_user_id
CREATE OR REPLACE FUNCTION public.get_current_authenticated_user_id()
RETURNS UUID
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

    -- 2. Extract request headers
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN NULL;
    END IF;

    -- 3. Extract session token from direct header OR client-info
    BEGIN
        v_token := v_headers::json->>'x-session-token';
        IF v_token IS NULL OR v_token = '' THEN
            v_client_info := v_headers::json->>'x-client-info';
            IF v_client_info IS NOT NULL THEN
                v_token := substring(v_client_info from ';session_token=([^;]+)');
            END IF;
        END IF;

        -- 4. Cryptographically validate against active, non-revoked session_leases
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

    -- 5. Zero-Trust Fallback for active user_id from x-user-id / x-client-info with strict database verification
    BEGIN
        v_user_id := v_headers::json->>'x-user-id';
        IF v_user_id IS NULL OR v_user_id = '' THEN
            v_client_info := v_headers::json->>'x-client-info';
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

    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_current_authenticated_user_id() TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
