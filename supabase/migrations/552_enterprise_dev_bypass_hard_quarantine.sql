-- ==============================================================================
-- Migration 552: Enterprise Dev Bypass Hard Quarantine (OWASP ASVS Level 3)
-- Standard: Zero-Trust / Fail-Closed / DSGVO Art. 32 & 33 Immunität
-- Scope:
--   1. Revokes execution of get_dev_bypass_users_for_school from anon and authenticated.
--   2. Restricts function execution strictly to service_role and verified master admin.
--   3. Enforces an immediate exception (42501) if called by unauthorized callers.
-- ==============================================================================

-- 1. Hard Revoke from public, anon, and authenticated
REVOKE ALL ON FUNCTION public.get_dev_bypass_users_for_school(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_dev_bypass_users_for_school(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.get_dev_bypass_users_for_school(UUID) FROM authenticated;

-- 2. Grant exclusively to service_role (backend/seed scripts only)
GRANT EXECUTE ON FUNCTION public.get_dev_bypass_users_for_school(UUID) TO service_role;

-- 3. Redefine function with strict fail-closed enforcement
CREATE OR REPLACE FUNCTION public.get_dev_bypass_users_for_school(p_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_admin JSONB;
    v_teacher JSONB;
    v_student JSONB;
    v_school_name TEXT;
BEGIN
    -- Strikte Fail-Closed Quarantäne: Verhindert anonyme API-Exfiltration
    IF current_user NOT IN ('postgres', 'service_role') AND NOT (public.is_master_admin()) THEN
        RAISE EXCEPTION 'PERMISSION DENIED: get_dev_bypass_users_for_school is quarantined to administrative context.' 
        USING ERRCODE = '42501';
    END IF;

    SELECT name INTO v_school_name FROM public.schools WHERE id = p_school_id;
    
    -- 1. Admin / Secretary
    SELECT jsonb_build_object(
        'id', id, 
        'name', TRIM(first_name || ' ' || COALESCE(last_name, '')), 
        'role', role,
        'school_id', school_id
    )
    INTO v_admin
    FROM public.users_raw
    WHERE school_id = p_school_id 
      AND (role IN ('admin', 'secretary') OR 'admin' = ANY(roles))
      AND is_active = true
    ORDER BY CASE WHEN LOWER(first_name) LIKE '%peter%' THEN 0 ELSE 1 END, created_at ASC
    LIMIT 1;

    -- 2. Teacher
    SELECT jsonb_build_object(
        'id', id, 
        'name', TRIM(first_name || ' ' || COALESCE(last_name, '')), 
        'role', role,
        'school_id', school_id
    )
    INTO v_teacher
    FROM public.users_raw
    WHERE school_id = p_school_id 
      AND role = 'teacher' 
      AND (v_admin IS NULL OR id != (v_admin->>'id')::uuid)
      AND is_active = true
    ORDER BY CASE WHEN LOWER(first_name) LIKE '%mateo%' THEN 0 ELSE 1 END, created_at ASC
    LIMIT 1;

    IF v_teacher IS NULL THEN
        SELECT jsonb_build_object(
            'id', id, 
            'name', TRIM(first_name || ' ' || COALESCE(last_name, '')), 
            'role', role,
            'school_id', school_id
        )
        INTO v_teacher
        FROM public.users_raw
        WHERE school_id = p_school_id AND (role = 'teacher' OR 'teacher' = ANY(roles)) AND is_active = true
        LIMIT 1;
    END IF;

    -- 3. Student (Scoped to current school; no cross-school search)
    SELECT jsonb_build_object(
        'id', id, 
        'name', TRIM(first_name || ' ' || COALESCE(last_name, '')), 
        'role', role,
        'school_id', school_id
    )
    INTO v_student
    FROM public.users_raw
    WHERE school_id = p_school_id AND role = 'student' AND is_active = true
    ORDER BY CASE WHEN LOWER(first_name) LIKE '%linus%' THEN 0 ELSE 1 END, created_at ASC
    LIMIT 1;

    RETURN jsonb_build_object(
        'school_id', p_school_id,
        'school_name', v_school_name,
        'admin', v_admin,
        'teacher', v_teacher,
        'student', v_student
    );
END;
$$;

COMMENT ON FUNCTION public.get_dev_bypass_users_for_school(UUID) IS 
'Enterprise+ Quarantined internal seed resolver. Denied to anon/authenticated to prevent user enumeration.';
