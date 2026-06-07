-- Migration: Fix RLS recursion by setting row_security = off on SECURITY DEFINER helper functions

CREATE OR REPLACE FUNCTION public.get_kiosk_school_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security = off
STABLE
AS $$
DECLARE
    v_token uuid;
    v_school_id uuid;
BEGIN
    v_token := public.get_kiosk_token();
    IF v_token IS NULL THEN
        RETURN NULL;
    END IF;
    
    SELECT school_id INTO v_school_id
    FROM public.kiosks
    WHERE secret_token = v_token;
    
    RETURN v_school_id;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security = off
STABLE
AS $$
DECLARE
    v_headers text;
    v_user_id text;
    v_school_id uuid;
BEGIN
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN NULL;
    END IF;
    v_user_id := v_headers::json->>'x-user-id';
    IF v_user_id IS NULL OR v_user_id = '' THEN
        RETURN NULL;
    END IF;
    
    SELECT school_id INTO v_school_id
    FROM public.users
    WHERE id = v_user_id::uuid;
    
    RETURN v_school_id;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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
    
    SELECT is_master_admin INTO v_is_master
    FROM public.users
    WHERE id = v_user_id::uuid;
    
    RETURN COALESCE(v_is_master, false);
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security = off
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
    
    RETURN v_role IN ('teacher', 'admin');
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_school_access(target_school_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security = off
STABLE
AS $$
DECLARE
    v_kiosk_school uuid;
    v_user_school uuid;
BEGIN
    -- Master admin bypass
    IF public.is_master_admin() THEN
        RETURN true;
    END IF;

    v_kiosk_school := public.get_kiosk_school_id();
    v_user_school := public.get_user_school_id();

    -- If both are present, both must match the school
    IF v_kiosk_school IS NOT NULL AND v_user_school IS NOT NULL THEN
        RETURN v_kiosk_school = target_school_id AND v_user_school = target_school_id;
    END IF;

    -- If only kiosk is present
    IF v_kiosk_school IS NOT NULL THEN
        RETURN v_kiosk_school = target_school_id;
    END IF;

    -- If only user is present
    IF v_user_school IS NOT NULL THEN
        RETURN v_user_school = target_school_id;
    END IF;

    RETURN false;
END;
$$;

-- Also fix the users_insert policy NOT EXISTS loop by specifying table alias correctly
-- to avoid referencing the outer relation column name locally.
-- Instead of users_1.school_id = users_1.school_id, it should compare against the target row's school_id:
DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users FOR INSERT WITH CHECK (
    public.is_master_admin()
    OR (public.get_user_school_id() = school_id AND public.is_teacher_or_admin())
    -- New school admin during onboarding (when school is empty)
    OR NOT EXISTS (SELECT 1 FROM public.users u WHERE u.school_id = users.school_id)
    -- Coach registering via invite link
    OR (current_setting('request.headers', true)::json->>'x-invite-school-id' = school_id::text)
);

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
