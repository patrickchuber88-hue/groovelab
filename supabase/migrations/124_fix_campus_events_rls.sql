-- Migration: 124_fix_campus_events_rls
-- Description: Adds is_public column to campus_events, defines the get_current_user_id helper, and aligns campus_events RLS policies with request-header session architecture.

-- 1. Add is_public column if missing
ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

-- 2. Create get_current_user_id helper function
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_headers text;
    v_user_id text;
BEGIN
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN NULL;
    END IF;
    v_user_id := v_headers::json->>'x-user-id';
    IF v_user_id IS NULL OR v_user_id = '' THEN
        RETURN NULL;
    END IF;
    RETURN v_user_id::uuid;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- 3. Drop old campus_events policies
DROP POLICY IF EXISTS "Allow read access for authenticated users of the same school" ON public.campus_events;
DROP POLICY IF EXISTS "Allow write access for teachers and admins" ON public.campus_events;
DROP POLICY IF EXISTS campus_events_select ON public.campus_events;
DROP POLICY IF EXISTS campus_events_modify ON public.campus_events;

-- 4. Create new RLS policies for campus_events
CREATE POLICY campus_events_select ON public.campus_events FOR SELECT USING (
  public.is_master_admin()
  OR (
    public.check_school_access(school_id)
    AND (is_public = true OR created_by = public.get_current_user_id())
  )
);

CREATE POLICY campus_events_modify ON public.campus_events FOR ALL USING (
  public.is_master_admin()
  OR (
    public.check_school_access(school_id)
    AND (
      public.is_teacher_or_admin()
      OR created_by = public.get_current_user_id()
    )
  )
);

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
