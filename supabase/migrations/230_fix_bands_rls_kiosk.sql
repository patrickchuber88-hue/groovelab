-- Migration 230: Update bands and band_members policies to support kiosk/header-based authentication
DROP POLICY IF EXISTS "bands_update" ON public.bands;
DROP POLICY IF EXISTS "bands_delete" ON public.bands;
DROP POLICY IF EXISTS "band_members_modify" ON public.band_members;

CREATE POLICY "bands_update" 
ON public.bands FOR UPDATE USING (
  public.is_band_member(id, public.get_current_user_id()) OR public.is_teacher_or_admin() OR public.is_master_admin()
);

CREATE POLICY "bands_delete" 
ON public.bands FOR DELETE USING (
  public.is_band_member(id, public.get_current_user_id()) OR public.is_teacher_or_admin() OR public.is_master_admin()
);

CREATE POLICY "band_members_modify" 
ON public.band_members FOR ALL USING (
  public.is_band_member(band_id, public.get_current_user_id()) OR public.is_teacher_or_admin() OR public.is_master_admin() OR public.check_school_access(public.get_band_school_id(band_id))
);
