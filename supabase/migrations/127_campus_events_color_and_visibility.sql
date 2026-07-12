-- Migration: 127_campus_events_color_and_visibility
-- Description: Adds color and visibility columns to campus_events and updates RLS policies to enforce role-based visibility.

-- 1. Add color and visibility columns
ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'all';

-- 2. Create get_current_user_role helper function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_role public.user_role;
BEGIN
    SELECT role INTO v_role
    FROM public.users
    WHERE id = public.get_current_user_id();
    RETURN v_role;
END;
$$;

-- 3. Drop existing select policy
DROP POLICY IF EXISTS campus_events_select ON public.campus_events;

-- 4. Create updated select policy
CREATE POLICY campus_events_select ON public.campus_events FOR SELECT USING (
  public.is_master_admin()
  OR (
    public.check_school_access(school_id)
    AND (
      -- Creator can see it
      created_by = public.get_current_user_id()
      -- Assigned students can see it
      OR (assigned_student_ids IS NOT NULL AND public.get_current_user_id() = ANY(assigned_student_ids))
      -- Otherwise, check visibility settings
      OR (
        (visibility = 'all')
        OR (visibility = 'teachers' AND public.get_current_user_role() IN ('teacher', 'admin', 'secretary'))
        OR (visibility = 'students' AND public.get_current_user_role() IN ('student', 'admin', 'secretary'))
      )
    )
  )
);

NOTIFY pgrst, 'reload schema';
