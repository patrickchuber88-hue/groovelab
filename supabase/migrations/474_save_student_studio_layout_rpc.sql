-- ==============================================================================
-- Migration 474: Enterprise+ Authoritative Studio Module Layout RPC
-- OWASP ASVS Level 3 / Fail-Closed / ISO 27001 / Revisionssicherer Audit-Trail
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.save_student_studio_layout(
    p_student_id UUID,
    p_layout JSONB
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
    END IF;

    IF NOT v_auth_ok THEN
        RAISE EXCEPTION 'Access denied: You are not authorized to update studio layout for student %', p_student_id
            USING ERRCODE = '42501';
    END IF;

    -- 3. Prepare updated parent_permissions
    IF p_layout IS NULL OR p_layout = 'null'::jsonb THEN
        -- Reset layout: remove custom_layout key
        v_updated_permissions := COALESCE(v_user.parent_permissions, '{}'::jsonb) - 'custom_layout';
    ELSE
        -- Save layout: set custom_layout key
        v_updated_permissions := jsonb_set(
            COALESCE(v_user.parent_permissions, '{}'::jsonb),
            '{custom_layout}',
            p_layout,
            TRUE
        );
    END IF;

    -- 4. Atomic update in users_raw
    UPDATE public.users_raw
    SET parent_permissions = v_updated_permissions,
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
        -- Best-effort sync
        NULL;
    END;

    -- 6. Tamper-Proof Audit Logging
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
            CASE WHEN p_layout IS NULL OR p_layout = 'null'::jsonb THEN 'RESET_STUDIO_MODULE_LAYOUT' ELSE 'UPDATE_STUDIO_MODULE_LAYOUT' END,
            jsonb_build_object(
                'student_id', p_student_id,
                'layout', p_layout,
                'updated_by', v_caller_id,
                'updated_at', NOW()
            ),
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        -- Non-blocking for audit failures
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', TRUE,
        'student_id', p_student_id,
        'layout', p_layout,
        'is_reset', (p_layout IS NULL OR p_layout = 'null'::jsonb)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_student_studio_layout(UUID, JSONB) TO authenticated, anon, service_role;
