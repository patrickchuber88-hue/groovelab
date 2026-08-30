-- ==============================================================================
-- Migration 316: Dev Bypass School Users Resolver (Localhost / Testing Only)
-- Scope: Returns safe user summaries (id, name, role) per school for Dev Bypass
-- Standard: Zero-Trust & No PII/Secret exposure
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_dev_bypass_users_for_school(p_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin JSONB;
    v_teacher JSONB;
    v_student JSONB;
    v_school_name TEXT;
BEGIN
    SELECT name INTO v_school_name FROM schools WHERE id = p_school_id;
    
    -- 1. Admin / Secretary
    SELECT jsonb_build_object(
        'id', id, 
        'name', TRIM(first_name || ' ' || COALESCE(last_name, '')), 
        'role', role,
        'school_id', school_id
    )
    INTO v_admin
    FROM users_raw
    WHERE school_id = p_school_id AND role IN ('admin', 'secretary') AND is_active = true
    LIMIT 1;

    -- 2. Teacher
    SELECT jsonb_build_object(
        'id', id, 
        'name', TRIM(first_name || ' ' || COALESCE(last_name, '')), 
        'role', role,
        'school_id', school_id
    )
    INTO v_teacher
    FROM users_raw
    WHERE school_id = p_school_id AND role = 'teacher' AND is_active = true
    LIMIT 1;

    -- 3. Student
    SELECT jsonb_build_object(
        'id', id, 
        'name', TRIM(first_name || ' ' || COALESCE(last_name, '')), 
        'role', role,
        'school_id', school_id
    )
    INTO v_student
    FROM users_raw
    WHERE school_id = p_school_id AND role = 'student'
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

GRANT EXECUTE ON FUNCTION public.get_dev_bypass_users_for_school(UUID) TO anon, authenticated, service_role;
