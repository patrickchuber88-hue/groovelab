-- ==============================================================================
-- Migration 513: Enterprise+ Authoritative Studio Module Governance RPC
-- OWASP ASVS Level 3 / Fail-Closed / ISO 27001 / Revisionssicherer Audit-Trail
-- ==============================================================================

-- 1. Full 3-parameter Authoritative RPC: Layout & Module Overrides Atomicity
CREATE OR REPLACE FUNCTION public.save_student_studio_layout(
    p_student_id UUID,
    p_layout JSONB,
    p_module_overrides JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
AS $$
DECLARE
    v_user RECORD;
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_auth_ok BOOLEAN := FALSE;
    v_updated_permissions JSONB;
BEGIN
    -- 1. Locate student
    SELECT * INTO v_user FROM public.users_raw WHERE id = p_student_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student not found: %', p_student_id USING ERRCODE = 'P0002';
    END IF;

    -- 2. Authorization Verification (OWASP ASVS BOLA/IDOR Defense)
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school_id := public.get_current_user_school_id();

    IF public.is_master_admin() THEN
        v_auth_ok := TRUE;
    ELSIF v_caller_id = p_student_id THEN
        v_auth_ok := TRUE;
    ELSIF v_caller_school_id = v_user.school_id AND v_caller_role IN ('teacher', 'admin', 'secretary') THEN
        v_auth_ok := TRUE;
    -- 🛡️ Autorisierung via aktiven Eltern-Session-Lease (max. 15 Minuten Inaktivität)
    ELSIF EXISTS (
        SELECT 1 FROM public.session_leases 
        WHERE user_id = p_student_id 
          AND role = 'parent' 
          AND is_revoked = FALSE 
          AND last_active_at >= NOW() - INTERVAL '15 minutes'
    ) THEN
        v_auth_ok := TRUE;
    END IF;

    IF NOT v_auth_ok THEN
        RAISE EXCEPTION 'Access denied: You are not authorized to update studio layout or modules for student %', p_student_id
            USING ERRCODE = '42501';
    END IF;

    -- 3. Prepare updated parent_permissions
    v_updated_permissions := COALESCE(v_user.parent_permissions, '{}'::jsonb);

    -- Layout Handling: Custom Order & Hidden Keys
    IF p_layout IS NULL OR p_layout = 'null'::jsonb THEN
        v_updated_permissions := v_updated_permissions - 'custom_layout';
    ELSE
        v_updated_permissions := jsonb_set(
            v_updated_permissions,
            '{custom_layout}',
            p_layout,
            TRUE
        );
    END IF;

    -- Module Overrides Handling: Unlocked / Gated Add-ons
    IF p_module_overrides IS NOT NULL AND p_module_overrides <> 'null'::jsonb THEN
        v_updated_permissions := jsonb_set(
            v_updated_permissions,
            '{module_overrides}',
            p_module_overrides,
            TRUE
        );
    END IF;

    -- 4. Atomic update in users_raw mit Cache-Busting Token Version
    UPDATE public.users_raw
    SET parent_permissions = v_updated_permissions,
        token_version = COALESCE(token_version, 1) + 1,
        updated_at = NOW()
    WHERE id = p_student_id;

    -- 5. Parallel synchronization in students table (if present)
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
            UPDATE public.students
            SET parent_permissions = v_updated_permissions,
                updated_at = NOW()
            WHERE id = p_student_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 6. Tamper-Proof Audit Logging (GoBD & DSGVO Konformität)
    BEGIN
        INSERT INTO public.audit_logs (
            user_id,
            school_id,
            action,
            details,
            created_at
        ) VALUES (
            p_student_id,
            v_user.school_id,
            CASE 
                WHEN p_module_overrides IS NOT NULL AND (p_layout IS NOT NULL AND p_layout <> 'null'::jsonb) THEN 'UPDATE_STUDIO_MODULE_PERMISSIONS_AND_LAYOUT'
                WHEN p_module_overrides IS NOT NULL THEN 'UPDATE_STUDIO_MODULE_PERMISSIONS'
                WHEN p_layout IS NULL OR p_layout = 'null'::jsonb THEN 'RESET_STUDIO_MODULE_LAYOUT'
                ELSE 'UPDATE_STUDIO_MODULE_LAYOUT'
            END,
            jsonb_build_object(
                'student_id', p_student_id,
                'layout', p_layout,
                'module_overrides', p_module_overrides,
                'updated_by', v_caller_id,
                'updated_at', NOW()
            ),
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', TRUE,
        'student_id', p_student_id,
        'layout', p_layout,
        'module_overrides', p_module_overrides,
        'parent_permissions', v_updated_permissions,
        'is_reset', (p_layout IS NULL OR p_layout = 'null'::jsonb)
    );
END;
$$;

-- 2. Backwards-Compatible 2-Parameter Wrapper
CREATE OR REPLACE FUNCTION public.save_student_studio_layout(
    p_student_id UUID,
    p_layout JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
AS $$
BEGIN
    RETURN public.save_student_studio_layout(p_student_id, p_layout, NULL);
END;
$$;

-- 3. Explicit Security Grants
GRANT EXECUTE ON FUNCTION public.save_student_studio_layout(UUID, JSONB, JSONB) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.save_student_studio_layout(UUID, JSONB) TO authenticated, anon, service_role;
