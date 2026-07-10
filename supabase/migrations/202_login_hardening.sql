-- 🚀 Campus-Groovelab Hardening & Performance Optimization

-- 1. Optimize is_master_admin() and prevent search path hijacking
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
SET row_security = off
STABLE
AS $$
DECLARE
    v_headers text;
    v_user_id text;
    v_is_master boolean;
BEGIN
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN false;
    END IF;
    v_user_id := v_headers::json->>'x-user-id';
    IF v_user_id IS NULL OR v_user_id = '' THEN
        RETURN false;
    END IF;
    
    -- Query users_raw directly to avoid view join/decryption overhead
    SELECT is_master_admin INTO v_is_master
    FROM public.users_raw
    WHERE id = v_user_id::uuid;
    
    RETURN COALESCE(v_is_master, false);
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- 2. Optimize get_current_user_role() and prevent search path hijacking
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
SET row_security = off
STABLE
AS $$
DECLARE
    v_role public.user_role;
BEGIN
    -- Query users_raw directly to avoid view join/decryption overhead
    SELECT role INTO v_role
    FROM public.users_raw
    WHERE id = public.get_current_user_id();
    RETURN v_role;
END;
$$;

-- 3. Secure check_school_access() against search path hijacking
ALTER FUNCTION public.check_school_access(uuid) SET search_path = public, pg_catalog;

-- 4. Secure get_current_user_id() against search path hijacking
ALTER FUNCTION public.get_current_user_id() SET search_path = public, pg_catalog;

-- 5. Secure get_encryption_key() against search path hijacking
ALTER FUNCTION public.get_encryption_key() SET search_path = public, pg_catalog;

-- 6. Secure get_kiosk_token() against search path hijacking
ALTER FUNCTION public.get_kiosk_token() SET search_path = public, pg_catalog;

-- 7. Secure get_qr_token() against search path hijacking
ALTER FUNCTION public.get_qr_token() SET search_path = public, pg_catalog;

-- 8. Add performance indexes for RLS user and admin checking
CREATE INDEX IF NOT EXISTS idx_users_raw_role ON public.users_raw(role);
CREATE INDEX IF NOT EXISTS idx_users_raw_is_master_admin ON public.users_raw(is_master_admin) WHERE is_master_admin = true;

NOTIFY pgrst, 'reload schema';
