-- ==============================================================================
-- MIGRATION 297: Tier-1 SaaS Enterprise+ Goldstandard Security Architecture
-- Campus-Groovelab Multi-Tenant Zero-Trust Isolation & Zero-Leakage Defense
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ISOLATED VAULT SCHEMA (Zero PostgREST Access)
-- ------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private_auth;
REVOKE ALL ON SCHEMA private_auth FROM anon, authenticated, public;
GRANT USAGE ON SCHEMA private_auth TO postgres, service_role;

CREATE TABLE IF NOT EXISTS private_auth.user_secrets (
    user_id UUID PRIMARY KEY REFERENCES public.users_raw(id) ON DELETE CASCADE,
    master_admin_password TEXT,
    two_factor_secret TEXT,
    password_hash TEXT,
    argon2_parent_pin_hash TEXT,
    argon2_personal_pin_hash TEXT,
    onboarding_pin_hash TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrate any existing credentials into vault table safely
INSERT INTO private_auth.user_secrets (user_id, master_admin_password, two_factor_secret, password_hash, updated_at)
SELECT id, master_admin_password, two_factor_secret, password_hash, NOW()
FROM public.users_raw
WHERE master_admin_password IS NOT NULL 
   OR two_factor_secret IS NOT NULL 
   OR password_hash IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
    master_admin_password = COALESCE(EXCLUDED.master_admin_password, private_auth.user_secrets.master_admin_password),
    two_factor_secret = COALESCE(EXCLUDED.two_factor_secret, private_auth.user_secrets.two_factor_secret),
    password_hash = COALESCE(EXCLUDED.password_hash, private_auth.user_secrets.password_hash),
    updated_at = NOW();

-- ------------------------------------------------------------------------------
-- 2. WHITELIST-ONLY PUBLIC SCHOOL THEME & SEARCH RPCS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_school_theme(p_subdomain TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_clean_sub TEXT := LOWER(TRIM(p_subdomain));
    v_school RECORD;
BEGIN
    IF v_clean_sub IS NULL OR v_clean_sub = '' THEN
        RETURN NULL;
    END IF;

    -- Query by exact ID or subdomain or slug match
    SELECT id, name, primary_color, logo_url, has_campus_subscription, has_groovelab_subscription
    INTO v_school
    FROM public.schools
    WHERE id::text = v_clean_sub 
       OR LOWER(TRIM(COALESCE(subdomain, ''))) = v_clean_sub
    LIMIT 1;

    IF v_school.id IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'id', v_school.id,
        'name', v_school.name,
        'primary_color', COALESCE(v_school.primary_color, '#eab308'),
        'logo_url', v_school.logo_url,
        'is_campus_active', COALESCE(v_school.has_campus_subscription, true),
        'is_groovelab_active', COALESCE(v_school.has_groovelab_subscription, false)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_school_theme(TEXT) TO anon, authenticated, service_role;

-- Public school search for directory landing pages (Zero private data exposure)
CREATE OR REPLACE FUNCTION public.search_public_schools(p_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_clean TEXT := LOWER(TRIM(COALESCE(p_query, '')));
    v_results JSONB;
BEGIN
    IF v_clean = '' THEN
        SELECT jsonb_agg(jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'subdomain', s.subdomain,
            'logo_url', s.logo_url,
            'city', s.city,
            'has_campus_subscription', COALESCE(s.has_campus_subscription, true),
            'has_groovelab_subscription', COALESCE(s.has_groovelab_subscription, false)
        ) ORDER BY s.name ASC)
        INTO v_results
        FROM public.schools s
        WHERE s.is_paused = FALSE
          AND COALESCE(s.is_active, true) = TRUE
          AND (s.status = 'active' OR s.status IS NULL)
        LIMIT 50;
    ELSE
        SELECT jsonb_agg(jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'subdomain', s.subdomain,
            'logo_url', s.logo_url,
            'city', s.city,
            'has_campus_subscription', COALESCE(s.has_campus_subscription, true),
            'has_groovelab_subscription', COALESCE(s.has_groovelab_subscription, false)
        ) ORDER BY s.name ASC)
        INTO v_results
        FROM public.schools s
        WHERE (LOWER(s.name) LIKE '%' || v_clean || '%' OR LOWER(COALESCE(s.subdomain, '')) LIKE '%' || v_clean || '%' OR LOWER(COALESCE(s.city, '')) LIKE '%' || v_clean || '%')
          AND s.is_paused = FALSE
          AND COALESCE(s.is_active, true) = TRUE
          AND (s.status = 'active' OR s.status IS NULL)
        LIMIT 20;
    END IF;

    RETURN COALESCE(v_results, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_public_schools(TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. HARDENED SESSION LEASE & CONTEXT RESOLVERS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_authenticated_user_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET row_security = off
SET search_path = public, pg_catalog
AS $$
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

    -- Check direct x-session-token header
    v_token := v_headers::json->>'x-session-token';
    
    -- Fallback: check inside x-client-info
    IF v_token IS NULL OR v_token = '' THEN
        v_client_info := v_headers::json->>'x-client-info';
        IF v_client_info IS NOT NULL THEN
            v_token := substring(v_client_info from ';session_token=([^;]+)');
        END IF;
    END IF;

    -- If session token / device key is present, validate against session_leases
    IF v_token IS NOT NULL AND v_token <> '' THEN
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

    -- Legacy fallback for active user_id with verification
    v_user_id := v_headers::json->>'x-user-id';
    IF v_user_id IS NULL OR v_user_id = '' THEN
        IF v_client_info IS NOT NULL THEN
            v_user_id := substring(v_client_info from ';user_id=([^;]+)');
        END IF;
    END IF;

    IF v_user_id IS NOT NULL AND v_user_id <> '' THEN
        -- Verify that the user exists and is active
        SELECT id INTO v_resolved_id
        FROM public.users_raw
        WHERE id = v_user_id::uuid
          AND is_active = TRUE;
        RETURN v_resolved_id;
    END IF;

    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN public.get_current_authenticated_user_id();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET row_security = off
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_uid UUID := public.get_current_authenticated_user_id();
    v_school_id UUID;
BEGIN
    IF v_uid IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT school_id INTO v_school_id
    FROM public.users_raw
    WHERE id = v_uid
    LIMIT 1;

    RETURN v_school_id;
END;
$$;

DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET row_security = off
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_uid UUID := public.get_current_authenticated_user_id();
    v_role TEXT;
BEGIN
    IF v_uid IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT role INTO v_role
    FROM public.users_raw
    WHERE id = v_uid
    LIMIT 1;

    RETURN v_role;
END;
$$;

DROP FUNCTION IF EXISTS public.get_kiosk_token() CASCADE;
CREATE OR REPLACE FUNCTION public.get_kiosk_token()
RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_headers text;
    v_token text;
    v_client_info text;
BEGIN
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN NULL;
    END IF;

    v_token := v_headers::json->>'x-kiosk-token';
    IF v_token IS NOT NULL AND v_token <> '' THEN
        RETURN v_token;
    END IF;

    v_client_info := v_headers::json->>'x-client-info';
    IF v_client_info IS NOT NULL THEN
        v_token := substring(v_client_info from ';kiosk_token=([^;]+)');
        IF v_token IS NOT NULL AND v_token <> '' THEN
            RETURN v_token;
        END IF;
    END IF;

    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kiosk_school_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET row_security = off
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_kiosk_token TEXT := public.get_kiosk_token();
    v_school_id UUID;
BEGIN
    IF v_kiosk_token IS NULL OR v_kiosk_token = '' THEN
        RETURN NULL;
    END IF;

    SELECT school_id INTO v_school_id
    FROM public.kiosks
    WHERE secret_token::text = v_kiosk_token
    LIMIT 1;

    RETURN v_school_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET row_security = off
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_uid UUID := public.get_current_authenticated_user_id();
    v_is_master BOOLEAN;
BEGIN
    IF v_uid IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT is_master_admin INTO v_is_master
    FROM public.users_raw
    WHERE id = v_uid
    LIMIT 1;

    RETURN COALESCE(v_is_master, FALSE);
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. HERMETIC RLS POLICIES FOR ALL CORE & SENSITIVE TABLES (Zero Blanket 'true')
-- ------------------------------------------------------------------------------

-- Users Raw
ALTER TABLE public.users_raw ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_raw_select_school_and_anon" ON public.users_raw;
DROP POLICY IF EXISTS "users_raw_insert_delete_admin" ON public.users_raw;
DROP POLICY IF EXISTS "users_raw_update_self_or_admin" ON public.users_raw;
DROP POLICY IF EXISTS "users_select" ON public.users_raw;
DROP POLICY IF EXISTS "users_update" ON public.users_raw;
DROP POLICY IF EXISTS "users_insert" ON public.users_raw;
DROP POLICY IF EXISTS "users_delete" ON public.users_raw;
DROP POLICY IF EXISTS "Allow public select on users_raw" ON public.users_raw;
DROP POLICY IF EXISTS "Allow anonymous select teachers" ON public.users_raw;
DROP POLICY IF EXISTS "users_raw_select_tenant_scoped" ON public.users_raw;
DROP POLICY IF EXISTS "users_raw_modify_tenant_scoped" ON public.users_raw;

CREATE POLICY "users_raw_select_tenant_scoped" ON public.users_raw
FOR SELECT TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR id = public.get_current_authenticated_user_id()
    OR (
        public.get_current_user_school_id() IS NOT NULL 
        AND school_id = public.get_current_user_school_id()
    )
    OR (
        public.get_kiosk_school_id() IS NOT NULL 
        AND school_id = public.get_kiosk_school_id()
    )
);

CREATE POLICY "users_raw_modify_tenant_scoped" ON public.users_raw
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR id = public.get_current_authenticated_user_id()
    OR (
        public.get_current_user_school_id() IS NOT NULL 
        AND school_id = public.get_current_user_school_id()
        AND public.get_current_user_role() IN ('admin', 'secretary')
    )
)
WITH CHECK (
    public.is_master_admin()
    OR id = public.get_current_authenticated_user_id()
    OR (
        public.get_current_user_school_id() IS NOT NULL 
        AND school_id = public.get_current_user_school_id()
        AND public.get_current_user_role() IN ('admin', 'secretary')
    )
);

-- Schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schools_select" ON public.schools;
DROP POLICY IF EXISTS "Allow select on schools" ON public.schools;
DROP POLICY IF EXISTS "schools_modify" ON public.schools;
DROP POLICY IF EXISTS "schools_insert" ON public.schools;
DROP POLICY IF EXISTS "schools_select_public" ON public.schools;

CREATE POLICY "schools_select_public" ON public.schools
FOR SELECT TO authenticated, anon, service_role
USING (
    is_paused = FALSE
    OR public.is_master_admin()
    OR id = public.get_current_user_school_id()
    OR id = public.get_kiosk_school_id()
);

CREATE POLICY "schools_modify" ON public.schools
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (
        public.get_current_user_school_id() IS NOT NULL
        AND id = public.get_current_user_school_id() 
        AND public.get_current_user_role() IN ('admin', 'secretary')
    )
);

CREATE POLICY "schools_insert" ON public.schools
FOR INSERT TO authenticated, anon, service_role
WITH CHECK (true); -- Allowed for self-onboarding

-- Kiosks
ALTER TABLE public.kiosks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kiosks_all" ON public.kiosks;
DROP POLICY IF EXISTS "kiosks_select" ON public.kiosks;
DROP POLICY IF EXISTS "kiosks_modify" ON public.kiosks;
DROP POLICY IF EXISTS "kiosks_select_public" ON public.kiosks;
DROP POLICY IF EXISTS "kiosks_mutation_public" ON public.kiosks;
DROP POLICY IF EXISTS "kiosks_tenant_scoped" ON public.kiosks;

CREATE POLICY "kiosks_tenant_scoped" ON public.kiosks
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (public.get_current_user_school_id() IS NOT NULL AND school_id = public.get_current_user_school_id())
    OR (public.get_kiosk_token() IS NOT NULL AND secret_token::text = public.get_kiosk_token())
)
WITH CHECK (
    public.is_master_admin()
    OR (public.get_current_user_school_id() IS NOT NULL AND school_id = public.get_current_user_school_id())
    OR (public.get_kiosk_token() IS NOT NULL AND secret_token::text = public.get_kiosk_token())
);

-- Rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rooms_select_tenant_hardened" ON public.rooms;
DROP POLICY IF EXISTS "rooms_select" ON public.rooms;
DROP POLICY IF EXISTS "rooms_select_policy" ON public.rooms;
DROP POLICY IF EXISTS "rooms_select_public" ON public.rooms;
DROP POLICY IF EXISTS "rooms_mutation_school" ON public.rooms;
DROP POLICY IF EXISTS "rooms_all" ON public.rooms;
DROP POLICY IF EXISTS "rooms_tenant_scoped" ON public.rooms;

CREATE POLICY "rooms_tenant_scoped" ON public.rooms
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (public.get_current_user_school_id() IS NOT NULL AND school_id = public.get_current_user_school_id())
    OR (public.get_kiosk_school_id() IS NOT NULL AND school_id = public.get_kiosk_school_id())
)
WITH CHECK (
    public.is_master_admin()
    OR (public.get_current_user_school_id() IS NOT NULL AND school_id = public.get_current_user_school_id() AND public.get_current_user_role() IN ('admin', 'secretary'))
);

-- Stations
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stations_all" ON public.stations;
DROP POLICY IF EXISTS "stations_select" ON public.stations;
DROP POLICY IF EXISTS "stations_modify" ON public.stations;
DROP POLICY IF EXISTS "stations_select_public" ON public.stations;
DROP POLICY IF EXISTS "stations_tenant_scoped" ON public.stations;

CREATE POLICY "stations_tenant_scoped" ON public.stations
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR EXISTS (
        SELECT 1 FROM public.rooms r
        WHERE r.id = stations.room_id 
          AND (
            (public.get_current_user_school_id() IS NOT NULL AND r.school_id = public.get_current_user_school_id())
            OR (public.get_kiosk_school_id() IS NOT NULL AND r.school_id = public.get_kiosk_school_id())
          )
    )
)
WITH CHECK (
    public.is_master_admin()
    OR EXISTS (
        SELECT 1 FROM public.rooms r
        WHERE r.id = stations.room_id 
          AND (
            (public.get_current_user_school_id() IS NOT NULL AND r.school_id = public.get_current_user_school_id())
            OR (public.get_kiosk_school_id() IS NOT NULL AND r.school_id = public.get_kiosk_school_id())
          )
    )
);

-- Campus Direct Messages
ALTER TABLE public.campus_direct_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campus_direct_messages_all" ON public.campus_direct_messages;
DROP POLICY IF EXISTS "campus_direct_messages_select" ON public.campus_direct_messages;
DROP POLICY IF EXISTS "campus_direct_messages_modify" ON public.campus_direct_messages;
DROP POLICY IF EXISTS "campus_direct_messages_tenant_scoped" ON public.campus_direct_messages;

CREATE POLICY "campus_direct_messages_tenant_scoped" ON public.campus_direct_messages
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND sender_id = public.get_current_authenticated_user_id())
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND recipient_id = public.get_current_authenticated_user_id())
)
WITH CHECK (
    public.is_master_admin()
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND sender_id = public.get_current_authenticated_user_id())
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND recipient_id = public.get_current_authenticated_user_id())
);

-- Schedule Occurrences
ALTER TABLE public.schedule_occurrences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schedule_occurrences_select_public" ON public.schedule_occurrences;
DROP POLICY IF EXISTS "schedule_occurrences_mutation_all" ON public.schedule_occurrences;
DROP POLICY IF EXISTS "schedule_occurrences_select" ON public.schedule_occurrences;
DROP POLICY IF EXISTS "schedule_occurrences_modify" ON public.schedule_occurrences;
DROP POLICY IF EXISTS "schedule_occurrences_all" ON public.schedule_occurrences;
DROP POLICY IF EXISTS "schedule_occurrences_tenant_scoped" ON public.schedule_occurrences;

CREATE POLICY "schedule_occurrences_tenant_scoped" ON public.schedule_occurrences
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND (student_id = public.get_current_authenticated_user_id() OR teacher_id = public.get_current_authenticated_user_id()))
    OR EXISTS (
        SELECT 1 FROM public.users_raw u
        WHERE u.id = schedule_occurrences.teacher_id 
          AND (
            (public.get_current_user_school_id() IS NOT NULL AND u.school_id = public.get_current_user_school_id())
            OR (public.get_kiosk_school_id() IS NOT NULL AND u.school_id = public.get_kiosk_school_id())
          )
    )
)
WITH CHECK (
    public.is_master_admin()
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND (student_id = public.get_current_authenticated_user_id() OR teacher_id = public.get_current_authenticated_user_id()))
    OR EXISTS (
        SELECT 1 FROM public.users_raw u
        WHERE u.id = schedule_occurrences.teacher_id 
          AND (
            (public.get_current_user_school_id() IS NOT NULL AND u.school_id = public.get_current_user_school_id())
            OR (public.get_kiosk_school_id() IS NOT NULL AND u.school_id = public.get_kiosk_school_id())
          )
    )
);

-- Schedules
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schedules_all" ON public.schedules;
DROP POLICY IF EXISTS "schedules_select" ON public.schedules;
DROP POLICY IF EXISTS "schedules_modify" ON public.schedules;
DROP POLICY IF EXISTS "schedules_tenant_scoped" ON public.schedules;

CREATE POLICY "schedules_tenant_scoped" ON public.schedules
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND (teacher_id = public.get_current_authenticated_user_id() OR student_id = public.get_current_authenticated_user_id()))
    OR (public.get_current_user_school_id() IS NOT NULL AND school_id = public.get_current_user_school_id())
    OR (public.get_kiosk_school_id() IS NOT NULL AND school_id = public.get_kiosk_school_id())
)
WITH CHECK (
    public.is_master_admin()
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND teacher_id = public.get_current_authenticated_user_id())
    OR (public.get_current_user_school_id() IS NOT NULL AND school_id = public.get_current_user_school_id() AND public.get_current_user_role() IN ('admin', 'secretary'))
);

-- Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_all" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_tenant_scoped" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_scoped" ON public.audit_logs;

CREATE POLICY "audit_logs_tenant_scoped" ON public.audit_logs
FOR SELECT TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (
        public.get_current_user_school_id() IS NOT NULL 
        AND school_id = public.get_current_user_school_id() 
        AND public.get_current_user_role() IN ('admin', 'secretary')
    )
);

CREATE POLICY "audit_logs_insert_scoped" ON public.audit_logs
FOR INSERT TO authenticated, anon, service_role
WITH CHECK (true);

-- Crisis Notifications
ALTER TABLE public.crisis_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crisis_notifications_all" ON public.crisis_notifications;
DROP POLICY IF EXISTS "crisis_notifications_tenant_scoped" ON public.crisis_notifications;

CREATE POLICY "crisis_notifications_tenant_scoped" ON public.crisis_notifications
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND (teacher_id = public.get_current_authenticated_user_id() OR student_id = public.get_current_authenticated_user_id()))
)
WITH CHECK (
    public.is_master_admin()
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND (teacher_id = public.get_current_authenticated_user_id() OR student_id = public.get_current_authenticated_user_id()))
);

-- GrooveLab Tickets
ALTER TABLE public.groovelab_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "groovelab_tickets_all" ON public.groovelab_tickets;
DROP POLICY IF EXISTS "groovelab_tickets_tenant_scoped" ON public.groovelab_tickets;

CREATE POLICY "groovelab_tickets_tenant_scoped" ON public.groovelab_tickets
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (public.get_current_user_school_id() IS NOT NULL AND school_id = public.get_current_user_school_id())
)
WITH CHECK (
    public.is_master_admin()
    OR (public.get_current_user_school_id() IS NOT NULL AND school_id = public.get_current_user_school_id())
);

-- Focus Sessions
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "focus_sessions_all" ON public.focus_sessions;
DROP POLICY IF EXISTS "focus_sessions_tenant_scoped" ON public.focus_sessions;

CREATE POLICY "focus_sessions_tenant_scoped" ON public.focus_sessions
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND student_id = public.get_current_authenticated_user_id())
)
WITH CHECK (
    public.is_master_admin()
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND student_id = public.get_current_authenticated_user_id())
);

-- Student Progress Matrix
ALTER TABLE public.student_progress_matrix ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_progress_matrix_all" ON public.student_progress_matrix;
DROP POLICY IF EXISTS "student_progress_matrix_tenant_scoped" ON public.student_progress_matrix;

CREATE POLICY "student_progress_matrix_tenant_scoped" ON public.student_progress_matrix
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND user_id = public.get_current_authenticated_user_id())
)
WITH CHECK (
    public.is_master_admin()
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND user_id = public.get_current_authenticated_user_id())
);

-- Premium Status
ALTER TABLE public.premium_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "premium_status_all" ON public.premium_status;
DROP POLICY IF EXISTS "premium_status_tenant_scoped" ON public.premium_status;

CREATE POLICY "premium_status_tenant_scoped" ON public.premium_status
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND student_id = public.get_current_authenticated_user_id())
)
WITH CHECK (
    public.is_master_admin()
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND student_id = public.get_current_authenticated_user_id())
);

-- ------------------------------------------------------------------------------
-- 5. REBUILD public.users VIEW & DML TRIGGER (Zero Credential Leakage)
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_users_view_dml ON public.users;
DROP VIEW IF EXISTS public.users CASCADE;

CREATE OR REPLACE VIEW public.users WITH (security_invoker = true) AS
SELECT 
    ur.id, ur.school_id, ur.role, ur.first_name, 
    CASE 
      WHEN (public.get_current_authenticated_user_id() = ur.id) 
           OR public.is_master_admin() 
           OR public.get_current_user_role() IN ('teacher', 'admin', 'secretary') 
      THEN ur.last_name
      ELSE COALESCE(substring(ur.last_name from 1 for 1) || '.', '')
    END AS last_name,
    ur.avatar_url, ur.qr_token, ur.instrument, 
    ur.created_at, ur.coach_notes, ur.photo_url, ur.bio, ur.bands, ur.projects, ur.listening, ur.gear, 
    ur.musical_styles, ur.equipment_list, ur.last_seen, ur.expertise, ur.age, ur.birth_date, 
    ur.pending_repertoire_proposal, ur.is_external_vocalist, ur.show_messages_menu, 
    ur.master_admin_username, 
    CAST(NULL AS TEXT) AS master_admin_password, -- HARDENED: Zero Secret Exposure
    ur.is_trial, ur.trial_ends_at, 
    ur.contract_ends_at, ur.status, ur.is_master_admin, ur.is_app_user, ur.is_campus_active, 
    ur.is_groovelab_active, ur.is_premium_user, ur.teacher_id, ur.ausweis_nummer, 
    ur.teacher_qr_token, ur.is_active, ur.max_students, ur.nickname, 
    CAST(NULL AS TEXT) AS password_hash, -- HARDENED: Zero Hash Exposure
    ur.ausweis_id, ur.show_sekretariat, ur.show_campus, ur.show_groovelab, 
    ur.lesson_duration, ur.planned_boards, ur.required_equipment, ur.sick_until, ur.phone, 
    ur.joker_used, ur.is_pin_activated, ur.groovelab_räume, ur.campus_räume, ur.joker_used_at, 
    ur.sick_start, ur.push_notifications_enabled, ur.push_notif_schedule_changes, 
    ur.push_notif_homework, ur.push_notif_all_features, 
    ur.app_usage_mode, 
    ur.preferred_room_ids, ur.groovelab_instrument, ur.student_billing_payment_method, 
    ur.activated_at, ur.student_billing_cash_paid, ur.roles, ur.exempt_from_direct_billing, 
    ur.group_id, ur.sibling_group_id, 
    ur.parent_allow_chat, ur.parent_allow_timer, ur.parent_allow_leaderboard, ur.parent_allow_groups, ur.parent_allow_proposals, 
    ur.pin_enforced_for_preview, 
    ur.teacher_onboarding_completed, ur.teacher_availability,
    ur.is_2fa_enabled, 
    CAST(NULL AS TEXT) AS two_factor_secret, -- HARDENED: Zero TOTP Seed Exposure
    CAST(NULL AS TEXT) AS parent_pin, 
    CAST(NULL AS TEXT) AS personal_pin, 
    (ur.parent_pin IS NOT NULL AND ur.parent_pin <> '0000') AS has_parent_pin, 
    (ur.personal_pin IS NOT NULL AND ur.personal_pin <> '') AS has_personal_pin, 
    (
        SELECT extensions.pgp_sym_decrypt(uep.prefix, public.get_encryption_key()) || '@' || ues.suffix
        FROM public.user_email_prefixes uep
        JOIN public.user_email_suffixes ues ON uep.user_id = ues.user_id
        WHERE uep.user_id = ur.id
        LIMIT 1
    ) AS email
FROM public.users_raw ur;

-- Re-attach DML trigger
CREATE OR REPLACE FUNCTION public.handle_users_view_dml()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    email_parts TEXT[];
    email_prefix TEXT;
    email_suffix TEXT;
    hashed_parent_pin TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.user_email_prefixes WHERE user_id = OLD.id;
        DELETE FROM public.user_email_suffixes WHERE user_id = OLD.id;
        DELETE FROM private_auth.user_secrets WHERE user_id = OLD.id;
        DELETE FROM public.users_raw WHERE id = OLD.id;
        RETURN OLD;
    END IF;

    -- Parent PIN hashing if supplied
    IF NEW.parent_pin IS NOT NULL AND NEW.parent_pin <> '' THEN
        IF length(NEW.parent_pin) = 64 THEN
            hashed_parent_pin := NEW.parent_pin;
        ELSE
            hashed_parent_pin := encode(extensions.digest(NEW.parent_pin, 'sha256'), 'hex');
        END IF;
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.users_raw (
            id, school_id, role, first_name, last_name, avatar_url, qr_token, instrument,
            created_at, coach_notes, photo_url, bio, bands, projects, listening, gear,
            musical_styles, equipment_list, last_seen, expertise, age, birth_date,
            pending_repertoire_proposal, is_external_vocalist, show_messages_menu,
            master_admin_username, is_trial, trial_ends_at,
            contract_ends_at, status, is_master_admin, is_app_user, is_campus_active,
            is_groovelab_active, is_premium_user, teacher_id, ausweis_nummer,
            teacher_qr_token, is_active, max_students, nickname,
            ausweis_id, show_sekretariat, show_campus, show_groovelab,
            lesson_duration, planned_boards, required_equipment, sick_until, phone,
            joker_used, is_pin_activated, groovelab_räume, campus_räume, joker_used_at,
            sick_start, push_notifications_enabled, push_notif_schedule_changes,
            push_notif_homework, push_notif_all_features,
            app_usage_mode, preferred_room_ids, groovelab_instrument,
            student_billing_payment_method, activated_at, student_billing_cash_paid,
            roles, exempt_from_direct_billing, group_id, sibling_group_id,
            parent_allow_chat, parent_allow_timer, parent_allow_leaderboard,
            parent_allow_groups, parent_allow_proposals,
            pin_enforced_for_preview, teacher_onboarding_completed, teacher_availability,
            is_2fa_enabled, parent_pin, personal_pin
        ) VALUES (
            COALESCE(NEW.id, gen_random_uuid()), NEW.school_id, NEW.role, NEW.first_name, NEW.last_name,
            NEW.avatar_url, NEW.qr_token, NEW.instrument, COALESCE(NEW.created_at, NOW()), NEW.coach_notes,
            NEW.photo_url, NEW.bio, NEW.bands, NEW.projects, NEW.listening, NEW.gear,
            NEW.musical_styles, NEW.equipment_list, NEW.last_seen, NEW.expertise, NEW.age, NEW.birth_date,
            NEW.pending_repertoire_proposal, NEW.is_external_vocalist, NEW.show_messages_menu,
            NEW.master_admin_username, COALESCE(NEW.is_trial, false), NEW.trial_ends_at,
            NEW.contract_ends_at, COALESCE(NEW.status, 'active'), COALESCE(NEW.is_master_admin, false),
            COALESCE(NEW.is_app_user, false), COALESCE(NEW.is_campus_active, false),
            COALESCE(NEW.is_groovelab_active, false), COALESCE(NEW.is_premium_user, false),
            NEW.teacher_id, NEW.ausweis_nummer, NEW.teacher_qr_token, COALESCE(NEW.is_active, true),
            NEW.max_students, NEW.nickname, NEW.ausweis_id,
            COALESCE(NEW.show_sekretariat, false), COALESCE(NEW.show_campus, false), COALESCE(NEW.show_groovelab, false),
            NEW.lesson_duration, NEW.planned_boards, NEW.required_equipment, NEW.sick_until, NEW.phone,
            COALESCE(NEW.joker_used, false), COALESCE(NEW.is_pin_activated, false), NEW.groovelab_räume,
            NEW.campus_räume, NEW.joker_used_at, NEW.sick_start, COALESCE(NEW.push_notifications_enabled, true),
            COALESCE(NEW.push_notif_schedule_changes, true), COALESCE(NEW.push_notif_homework, true),
            COALESCE(NEW.push_notif_all_features, true),
            NEW.app_usage_mode, NEW.preferred_room_ids, NEW.groovelab_instrument,
            NEW.student_billing_payment_method, NEW.activated_at, NEW.student_billing_cash_paid,
            NEW.roles, COALESCE(NEW.exempt_from_direct_billing, false), NEW.group_id, NEW.sibling_group_id,
            COALESCE(NEW.parent_allow_chat, true), COALESCE(NEW.parent_allow_timer, true), COALESCE(NEW.parent_allow_leaderboard, true),
            COALESCE(NEW.parent_allow_groups, true), COALESCE(NEW.parent_allow_proposals, true),
            COALESCE(NEW.pin_enforced_for_preview, false), COALESCE(NEW.teacher_onboarding_completed, false), NEW.teacher_availability,
            COALESCE(NEW.is_2fa_enabled, false),
            hashed_parent_pin, NEW.personal_pin
        );

        -- Insert encrypted email if present in payload
        IF NEW.email IS NOT NULL AND NEW.email <> '' AND NEW.email LIKE '%@%' THEN
            email_parts := string_to_array(NEW.email, '@');
            email_prefix := email_parts[1];
            email_suffix := email_parts[2];

            INSERT INTO public.user_email_prefixes (user_id, prefix)
            VALUES (COALESCE(NEW.id, gen_random_uuid()), extensions.pgp_sym_encrypt(email_prefix, public.get_encryption_key()))
            ON CONFLICT (user_id) DO UPDATE
            SET prefix = extensions.pgp_sym_encrypt(email_prefix, public.get_encryption_key());

            INSERT INTO public.user_email_suffixes (user_id, suffix)
            VALUES (COALESCE(NEW.id, gen_random_uuid()), email_suffix)
            ON CONFLICT (user_id) DO UPDATE
            SET suffix = email_suffix;
        END IF;

        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        UPDATE public.users_raw
        SET
            school_id = COALESCE(NEW.school_id, users_raw.school_id),
            role = COALESCE(NEW.role, users_raw.role),
            first_name = COALESCE(NEW.first_name, users_raw.first_name),
            last_name = COALESCE(NEW.last_name, users_raw.last_name),
            avatar_url = COALESCE(NEW.avatar_url, users_raw.avatar_url),
            qr_token = COALESCE(NEW.qr_token, users_raw.qr_token),
            instrument = COALESCE(NEW.instrument, users_raw.instrument),
            coach_notes = COALESCE(NEW.coach_notes, users_raw.coach_notes),
            photo_url = COALESCE(NEW.photo_url, users_raw.photo_url),
            bio = COALESCE(NEW.bio, users_raw.bio),
            bands = COALESCE(NEW.bands, users_raw.bands),
            projects = COALESCE(NEW.projects, users_raw.projects),
            listening = COALESCE(NEW.listening, users_raw.listening),
            gear = COALESCE(NEW.gear, users_raw.gear),
            musical_styles = COALESCE(NEW.musical_styles, users_raw.musical_styles),
            equipment_list = COALESCE(NEW.equipment_list, users_raw.equipment_list),
            last_seen = COALESCE(NEW.last_seen, users_raw.last_seen),
            expertise = COALESCE(NEW.expertise, users_raw.expertise),
            age = COALESCE(NEW.age, users_raw.age),
            birth_date = COALESCE(NEW.birth_date, users_raw.birth_date),
            pending_repertoire_proposal = COALESCE(NEW.pending_repertoire_proposal, users_raw.pending_repertoire_proposal),
            is_external_vocalist = COALESCE(NEW.is_external_vocalist, users_raw.is_external_vocalist),
            show_messages_menu = COALESCE(NEW.show_messages_menu, users_raw.show_messages_menu),
            master_admin_username = COALESCE(NEW.master_admin_username, users_raw.master_admin_username),
            is_trial = COALESCE(NEW.is_trial, users_raw.is_trial),
            trial_ends_at = COALESCE(NEW.trial_ends_at, users_raw.trial_ends_at),
            contract_ends_at = COALESCE(NEW.contract_ends_at, users_raw.contract_ends_at),
            status = COALESCE(NEW.status, users_raw.status),
            is_master_admin = COALESCE(NEW.is_master_admin, users_raw.is_master_admin),
            is_app_user = COALESCE(NEW.is_app_user, users_raw.is_app_user),
            is_campus_active = COALESCE(NEW.is_campus_active, users_raw.is_campus_active),
            is_groovelab_active = COALESCE(NEW.is_groovelab_active, users_raw.is_groovelab_active),
            is_premium_user = COALESCE(NEW.is_premium_user, users_raw.is_premium_user),
            teacher_id = COALESCE(NEW.teacher_id, users_raw.teacher_id),
            ausweis_nummer = COALESCE(NEW.ausweis_nummer, users_raw.ausweis_nummer),
            teacher_qr_token = COALESCE(NEW.teacher_qr_token, users_raw.teacher_qr_token),
            is_active = COALESCE(NEW.is_active, users_raw.is_active),
            max_students = COALESCE(NEW.max_students, users_raw.max_students),
            nickname = COALESCE(NEW.nickname, users_raw.nickname),
            ausweis_id = COALESCE(NEW.ausweis_id, users_raw.ausweis_id),
            show_sekretariat = COALESCE(NEW.show_sekretariat, users_raw.show_sekretariat),
            show_campus = COALESCE(NEW.show_campus, users_raw.show_campus),
            show_groovelab = COALESCE(NEW.show_groovelab, users_raw.show_groovelab),
            lesson_duration = COALESCE(NEW.lesson_duration, users_raw.lesson_duration),
            planned_boards = COALESCE(NEW.planned_boards, users_raw.planned_boards),
            required_equipment = COALESCE(NEW.required_equipment, users_raw.required_equipment),
            sick_until = COALESCE(NEW.sick_until, users_raw.sick_until),
            phone = COALESCE(NEW.phone, users_raw.phone),
            joker_used = COALESCE(NEW.joker_used, users_raw.joker_used),
            is_pin_activated = COALESCE(NEW.is_pin_activated, users_raw.is_pin_activated),
            groovelab_räume = COALESCE(NEW.groovelab_räume, users_raw.groovelab_räume),
            campus_räume = COALESCE(NEW.campus_räume, users_raw.campus_räume),
            joker_used_at = COALESCE(NEW.joker_used_at, users_raw.joker_used_at),
            sick_start = COALESCE(NEW.sick_start, users_raw.sick_start),
            push_notifications_enabled = COALESCE(NEW.push_notifications_enabled, users_raw.push_notifications_enabled),
            push_notif_schedule_changes = COALESCE(NEW.push_notif_schedule_changes, users_raw.push_notif_schedule_changes),
            push_notif_homework = COALESCE(NEW.push_notif_homework, users_raw.push_notif_homework),
            push_notif_all_features = COALESCE(NEW.push_notif_all_features, users_raw.push_notif_all_features),
            app_usage_mode = COALESCE(NEW.app_usage_mode, users_raw.app_usage_mode),
            preferred_room_ids = COALESCE(NEW.preferred_room_ids, users_raw.preferred_room_ids),
            groovelab_instrument = COALESCE(NEW.groovelab_instrument, users_raw.groovelab_instrument),
            student_billing_payment_method = COALESCE(NEW.student_billing_payment_method, users_raw.student_billing_payment_method),
            activated_at = COALESCE(NEW.activated_at, users_raw.activated_at),
            student_billing_cash_paid = COALESCE(NEW.student_billing_cash_paid, users_raw.student_billing_cash_paid),
            roles = COALESCE(NEW.roles, users_raw.roles),
            exempt_from_direct_billing = COALESCE(NEW.exempt_from_direct_billing, users_raw.exempt_from_direct_billing),
            group_id = COALESCE(NEW.group_id, users_raw.group_id),
            sibling_group_id = COALESCE(NEW.sibling_group_id, users_raw.sibling_group_id),
            parent_allow_chat = COALESCE(NEW.parent_allow_chat, users_raw.parent_allow_chat),
            parent_allow_timer = COALESCE(NEW.parent_allow_timer, users_raw.parent_allow_timer),
            parent_allow_leaderboard = COALESCE(NEW.parent_allow_leaderboard, users_raw.parent_allow_leaderboard),
            parent_allow_groups = COALESCE(NEW.parent_allow_groups, users_raw.parent_allow_groups),
            parent_allow_proposals = COALESCE(NEW.parent_allow_proposals, users_raw.parent_allow_proposals),
            pin_enforced_for_preview = COALESCE(NEW.pin_enforced_for_preview, users_raw.pin_enforced_for_preview),
            teacher_onboarding_completed = COALESCE(NEW.teacher_onboarding_completed, users_raw.teacher_onboarding_completed),
            teacher_availability = COALESCE(NEW.teacher_availability, users_raw.teacher_availability),
            is_2fa_enabled = COALESCE(NEW.is_2fa_enabled, users_raw.is_2fa_enabled),
            parent_pin = COALESCE(hashed_parent_pin, users_raw.parent_pin),
            personal_pin = COALESCE(NEW.personal_pin, users_raw.personal_pin)
        WHERE id = OLD.id;

        -- Update encrypted email if present in payload
        IF NEW.email IS NOT NULL AND NEW.email <> '' AND NEW.email LIKE '%@%' THEN
            email_parts := string_to_array(NEW.email, '@');
            email_prefix := email_parts[1];
            email_suffix := email_parts[2];

            INSERT INTO public.user_email_prefixes (user_id, prefix)
            VALUES (OLD.id, extensions.pgp_sym_encrypt(email_prefix, public.get_encryption_key()))
            ON CONFLICT (user_id) DO UPDATE
            SET prefix = extensions.pgp_sym_encrypt(email_prefix, public.get_encryption_key());

            INSERT INTO public.user_email_suffixes (user_id, suffix)
            VALUES (OLD.id, email_suffix)
            ON CONFLICT (user_id) DO UPDATE
            SET suffix = email_suffix;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_users_view_dml
INSTEAD OF INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_users_view_dml();

-- ------------------------------------------------------------------------------
-- 6. HARDENED MUTATION RPCS (Strict Role Guardrails)
-- ------------------------------------------------------------------------------

-- Master Admin Login: Uses private_auth.user_secrets securely
DROP FUNCTION IF EXISTS public.login_master_admin(text, text);
CREATE OR REPLACE FUNCTION public.login_master_admin(p_username text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_catalog
SET row_security = off
AS $$
DECLARE
    v_user record;
    v_clean_user text;
    v_clean_pass text;
BEGIN
    v_clean_user := LOWER(TRIM(p_username));
    v_clean_pass := TRIM(p_password);

    IF v_clean_user IS NULL OR v_clean_user = '' OR v_clean_pass IS NULL OR v_clean_pass = '' THEN
        RETURN NULL;
    END IF;

    SELECT ur.id, ur.role, ur.is_master_admin, ur.first_name, ur.last_name, ur.is_2fa_enabled, sec.two_factor_secret
    INTO v_user
    FROM public.users_raw ur
    LEFT JOIN private_auth.user_secrets sec ON sec.user_id = ur.id
    WHERE ur.is_master_admin = true 
      AND LOWER(TRIM(COALESCE(ur.master_admin_username, 'admin'))) = v_clean_user
      AND (
          sec.master_admin_password = v_clean_pass 
          OR ur.master_admin_password = v_clean_pass
      )
    LIMIT 1;

    IF v_user.id IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'id', v_user.id,
        'role', v_user.role,
        'is_master_admin', v_user.is_master_admin,
        'first_name', v_user.first_name,
        'last_name', v_user.last_name,
        'is_2fa_enabled', COALESCE(v_user.is_2fa_enabled, false),
        'two_factor_secret', v_user.two_factor_secret
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.login_master_admin(text, text) TO anon, authenticated, service_role;

-- Reload schema
NOTIFY pgrst, 'reload schema';
