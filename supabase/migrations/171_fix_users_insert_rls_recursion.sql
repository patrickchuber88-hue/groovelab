-- Fix infinite recursion in users_insert RLS policy by wrapping the EXISTS subquery in a SECURITY DEFINER function

CREATE OR REPLACE FUNCTION public.school_has_no_users(p_school_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM public.users WHERE school_id = p_school_id
    );
END;
$$;

DROP POLICY IF EXISTS users_insert ON public.users;

CREATE POLICY users_insert ON public.users
FOR INSERT
WITH CHECK (
    is_master_admin()
    OR ((get_user_school_id() = school_id) AND is_teacher_or_admin())
    OR school_has_no_users(school_id)
    OR (((current_setting('request.headers'::text, true))::json ->> 'x-invite-school-id'::text) = (school_id)::text)
);
