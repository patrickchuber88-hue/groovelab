-- Migration: 129_fix_is_teacher_or_admin_for_secretary
-- Description: Updates public.is_teacher_or_admin() to include the 'secretary' role.

CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_headers text;
    v_user_id text;
    v_role public.user_role;
BEGIN
    IF public.is_master_admin() THEN
        RETURN true;
    END IF;

    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN false;
    END IF;
    v_user_id := v_headers::json->>'x-user-id';
    IF v_user_id IS NULL OR v_user_id = '' THEN
        RETURN false;
    END IF;
    
    SELECT role INTO v_role
    FROM public.users
    WHERE id = v_user_id::uuid;
    
    RETURN v_role IN ('teacher', 'admin', 'secretary');
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

NOTIFY pgrst, 'reload schema';
