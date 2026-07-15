-- Migration 226: Update kiosks RLS policies to allow device onboarding using school-wide kiosk token
DROP POLICY IF EXISTS "kiosks_modify" ON public.kiosks;

CREATE POLICY "kiosks_modify" ON public.kiosks FOR ALL USING (
    public.is_master_admin() 
    OR public.check_school_access(school_id)
);
