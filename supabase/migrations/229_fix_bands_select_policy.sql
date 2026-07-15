-- Migration 229: Fix bands and band_members select policies to use check_school_access
DROP POLICY IF EXISTS "bands_select" ON public.bands;
DROP POLICY IF EXISTS "band_members_select" ON public.band_members;

CREATE POLICY "bands_select" 
ON public.bands FOR SELECT USING (
  public.check_school_access(school_id)
);

CREATE POLICY "band_members_select" 
ON public.band_members FOR SELECT USING (
  public.check_school_access(public.get_band_school_id(band_id))
);
