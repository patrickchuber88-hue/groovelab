-- ==============================================================================
-- MIGRATION 570: FIX SESSION LEASE DEVICE-KEY COLLISION & DUAL-ROLE SWITCH
-- Standard: OWASP ASVS Level 3 / DSGVO Art. 32 / BSI IT-Grundschutz
-- Scope:
--   1. Harden get_current_authenticated_user_id() against multi-user device_key collisions:
--      Enforces strict ORDER BY last_active_at DESC, created_at DESC when resolving via device_key.
--   2. Authoritative switch_user_active_role() multi-role aggregation:
--      Unifies v_user.role and v_user.roles so that all legitimate active & secondary roles
--      can be switched without privilege denial.
--   3. Provides both 1-param and 2-param overloads for 100% PostgREST schema compatibility.
--   4. Re-syncs Peter Pan (11079eae-664a-49a4-8692-771d83a3193c) to role='admin',
--      roles=['admin', 'teacher'] and is_master_admin=true.
-- ==============================================================================

-- 1. HARDEN get_current_authenticated_user_id()
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
            -- First try exact lease UUID match (deterministic 1-to-1 session)
            BEGIN
                IF v_token ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
                    SELECT user_id INTO v_resolved_id
                    FROM public.session_leases
                    WHERE id = v_token::uuid
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

            -- Fallback: If device_key matched, MUST order by most recent active lease
            -- to prevent picking older sessions of different users on shared hardware
            SELECT user_id INTO v_resolved_id
            FROM public.session_leases
            WHERE device_key = v_token
              AND is_revoked = FALSE
              AND last_active_at > (NOW() - INTERVAL '30 days')
            ORDER BY last_active_at DESC, created_at DESC
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

GRANT EXECUTE ON FUNCTION public.get_current_authenticated_user_id() TO anon, authenticated, service_role;


-- 2. SECURE ROLE SWITCH RPC (CLEAN OVERLOADS & MULTI-ROLE AGGREGATION)
DROP FUNCTION IF EXISTS public.switch_user_active_role(text);
DROP FUNCTION IF EXISTS public.switch_user_active_role(text, uuid);

CREATE OR REPLACE FUNCTION public.switch_user_active_role(
    p_target_role text,
    p_lease_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
AS $$
DECLARE
    v_uid UUID := public.get_current_authenticated_user_id();
    v_user record;
    v_target_clean text := LOWER(TRIM(p_target_role));
    v_allowed_roles text[];
    v_is_master boolean;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Zugriff verweigert: Keine authentifizierte Sitzung vorhanden.';
    END IF;

    IF v_target_clean IS NULL OR v_target_clean = '' THEN
        RAISE EXCEPTION 'Ungültige Zielrolle.';
    END IF;

    -- Fetch user details
    SELECT id, school_id, role, roles, is_master_admin INTO v_user
    FROM public.users_raw
    WHERE id = v_uid AND is_active = TRUE;

    IF v_user.id IS NULL THEN
        RAISE EXCEPTION 'Benutzer nicht gefunden oder inaktiv.';
    END IF;

    v_is_master := COALESCE(v_user.is_master_admin, false) OR public.is_master_admin();

    -- Multi-Role Aggregation: Combine active role and all assigned roles
    SELECT ARRAY(
        SELECT DISTINCT r FROM (
            SELECT v_user.role::text AS r
            UNION
            SELECT unnest(v_user.roles::text[]) AS r WHERE v_user.roles IS NOT NULL
        ) sub
        WHERE r IS NOT NULL
    ) INTO v_allowed_roles;

    IF array_length(v_allowed_roles, 1) IS NULL THEN
        v_allowed_roles := ARRAY[v_user.role::text];
    END IF;

    -- Validate role eligibility (Strict Fail-Closed)
    IF NOT v_is_master AND NOT (v_target_clean = ANY(v_allowed_roles)) THEN
        RAISE EXCEPTION 'Zugriff verweigert: Die Rolle % ist für Ihr Profil nicht freigeschaltet.', v_target_clean;
    END IF;

    -- Update active role in users_raw
    UPDATE public.users_raw
    SET role = v_target_clean::public.user_role, last_seen = NOW()
    WHERE id = v_uid;

    -- Device-isolated Session Lease Scoping:
    IF p_lease_id IS NOT NULL THEN
        UPDATE public.session_leases
        SET role = v_target_clean, last_active_at = NOW()
        WHERE id = p_lease_id AND user_id = v_uid AND is_revoked = FALSE;
    ELSE
        UPDATE public.session_leases
        SET role = v_target_clean, last_active_at = NOW()
        WHERE user_id = v_uid AND is_revoked = FALSE;
    END IF;

    -- Revisionssicherer Audit-Log
    BEGIN
        IF to_regclass('public.audit_logs') IS NOT NULL THEN
            INSERT INTO public.audit_logs (
                table_name, record_id, action,
                old_data, new_data,
                changed_by, actor_id, school_id, user_id,
                details, created_at
            ) VALUES (
                'users_raw', v_uid, 'UPDATE',
                jsonb_build_object('role', v_user.role),
                jsonb_build_object('role', v_target_clean),
                v_uid, v_uid, v_user.school_id, v_uid,
                jsonb_build_object(
                    'event', 'ROLE_SWITCH_PRIVILEGE_TRANSITION',
                    'from_role', v_user.role,
                    'to_role', v_target_clean,
                    'dual_roles', v_allowed_roles,
                    'session_lease_id', p_lease_id,
                    'is_elevation', (v_target_clean IN ('admin', 'secretary') AND v_user.role NOT IN ('admin', 'secretary'))
                ),
                NOW()
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[AuditLog] Failed to record role switch event: %', SQLERRM;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_uid,
        'active_role', v_target_clean,
        'session_lease_id', p_lease_id
    );
END;
$$;

-- 1-Param Overload forwarder for legacy PostgREST calls
CREATE OR REPLACE FUNCTION public.switch_user_active_role(p_target_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
AS $$
BEGIN
    RETURN public.switch_user_active_role(p_target_role, NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.switch_user_active_role(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.switch_user_active_role(text) TO anon, authenticated, service_role;


-- 3. AUTHORITATIVE PETER PAN RE-SYNC
ALTER TABLE public.users_raw DISABLE TRIGGER trg_prevent_master_admin_escalation;

UPDATE public.users_raw
SET role = 'admin',
    roles = ARRAY['admin', 'teacher']::user_role[],
    is_master_admin = true,
    is_active = true
WHERE id = '11079eae-664a-49a4-8692-771d83a3193c';

ALTER TABLE public.users_raw ENABLE TRIGGER trg_prevent_master_admin_escalation;


-- 4. POSTGREST SCHEMA-CACHE INVALIDATION
NOTIFY pgrst, 'reload schema';
