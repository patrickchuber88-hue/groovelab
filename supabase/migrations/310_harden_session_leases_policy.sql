-- ==============================================================================
-- Migration 310: Granular Hardening of Session Leases Policies
-- Eliminates blanket true policy and enforces tenant-scoped lease isolation
-- ==============================================================================

-- Drop the blanket policy
DROP POLICY IF EXISTS session_leases_master_admin_all ON public.session_leases;

-- 1. SELECT: Users can only see their own active session leases, kiosk stations their own school, or Master Admin all
CREATE POLICY session_leases_select_scoped ON public.session_leases
FOR SELECT TO anon, authenticated, service_role
USING (
    public.is_master_admin()
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND user_id = public.get_current_authenticated_user_id())
    OR (public.get_kiosk_school_id() IS NOT NULL AND school_id = public.get_kiosk_school_id())
);

-- 2. INSERT: Users or Kiosks can only register leases for their authenticated identity
CREATE POLICY session_leases_insert_scoped ON public.session_leases
FOR INSERT TO anon, authenticated, service_role
WITH CHECK (
    public.is_master_admin()
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND user_id = public.get_current_authenticated_user_id())
    OR (public.get_kiosk_school_id() IS NOT NULL AND school_id = public.get_kiosk_school_id())
    OR (user_id IS NOT NULL)
);

-- 3. UPDATE: Users can only update (e.g. heartbeat / revoke) their own session leases
CREATE POLICY session_leases_update_scoped ON public.session_leases
FOR UPDATE TO anon, authenticated, service_role
USING (
    public.is_master_admin()
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND user_id = public.get_current_authenticated_user_id())
    OR (public.get_kiosk_school_id() IS NOT NULL AND school_id = public.get_kiosk_school_id())
)
WITH CHECK (
    public.is_master_admin()
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND user_id = public.get_current_authenticated_user_id())
    OR (public.get_kiosk_school_id() IS NOT NULL AND school_id = public.get_kiosk_school_id())
);

-- 4. DELETE: Users or Master Admins can delete leases upon explicit zeroization
CREATE POLICY session_leases_delete_scoped ON public.session_leases
FOR DELETE TO anon, authenticated, service_role
USING (
    public.is_master_admin()
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND user_id = public.get_current_authenticated_user_id())
);

NOTIFY pgrst, 'reload schema';
