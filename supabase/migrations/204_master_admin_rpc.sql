-- 🚀 Secure Master Admin Authentication RPC

CREATE OR REPLACE FUNCTION public.login_master_admin(p_username text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
SET row_security = off
AS $$
DECLARE
    v_user record;
BEGIN
    SELECT id, role, is_master_admin, first_name, last_name
    INTO v_user
    FROM public.users_raw
    WHERE is_master_admin = true 
      AND master_admin_username = p_username 
      AND master_admin_password = p_password;

    IF v_user.id IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'id', v_user.id,
        'role', v_user.role,
        'is_master_admin', v_user.is_master_admin,
        'first_name', v_user.first_name,
        'last_name', v_user.last_name
    );
END;
$$;

-- Grant execute rights to public roles
GRANT EXECUTE ON FUNCTION public.login_master_admin(text, text) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
