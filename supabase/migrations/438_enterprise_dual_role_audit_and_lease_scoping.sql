-- ==============================================================================
-- MIGRATION 438: ENTERPRISE+ DUAL-ROLE AUDIT LOGGING & SESSION LEASE SCOPING
-- Standard: OWASP ASVS Level 3 / DSGVO Art. 5(2), 30, 32 / BSI IT-Grundschutz
-- Enforces: Non-repudiation on role switches and device-isolated session leases
-- ==============================================================================

-- 1. SECURE ROLE SWITCH RPC WITH LEASE SCOPING AND REVISIONSSICHEREM AUDIT TRAIL
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

    -- Safe array extraction without COALESCE type mismatch between user_role[] and text[]
    IF v_user.roles IS NOT NULL THEN
        v_allowed_roles := v_user.roles::text[];
    ELSE
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
    -- If p_lease_id is provided, only mutate the lease of the requesting device.
    -- Otherwise safely update active leases for this user.
    IF p_lease_id IS NOT NULL THEN
        UPDATE public.session_leases
        SET role = v_target_clean, last_active_at = NOW()
        WHERE id = p_lease_id AND user_id = v_uid AND is_revoked = FALSE;
    ELSE
        UPDATE public.session_leases
        SET role = v_target_clean, last_active_at = NOW()
        WHERE user_id = v_uid AND is_revoked = FALSE;
    END IF;

    -- 🛡️ REVISIONSSICHERER AUDIT-LOG (DSGVO Art. 30, 32 / Non-Repudiation)
    BEGIN
        IF to_regclass('public.audit_logs') IS NOT NULL THEN
            INSERT INTO public.audit_logs (
                table_name,
                record_id,
                action,
                old_data,
                new_data,
                changed_by,
                actor_id,
                school_id,
                user_id,
                details,
                created_at
            ) VALUES (
                'users_raw',
                v_uid,
                'UPDATE',
                jsonb_build_object('role', v_user.role),
                jsonb_build_object('role', v_target_clean),
                v_uid,
                v_uid,
                v_user.school_id,
                v_uid,
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
        -- Fail-Safe Audit: Logging exception should never block legitimate role transitions,
        -- but emit warning to postgres log.
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

-- 2. BACKWARDS-COMPATIBILITY WRAPPER (1 Parameter Signature)
CREATE OR REPLACE FUNCTION public.switch_user_active_role(p_target_role text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
AS $$
    SELECT public.switch_user_active_role(p_target_role, NULL::uuid);
$$;

GRANT EXECUTE ON FUNCTION public.switch_user_active_role(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.switch_user_active_role(text) TO anon, authenticated, service_role;
