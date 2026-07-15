-- Migration 227: Fix infinite recursion in bands RLS policies
DROP POLICY IF EXISTS "Band members can manage their bands" ON public.bands;
DROP POLICY IF EXISTS "Band members can update their bands" ON public.bands;
DROP POLICY IF EXISTS "Band members can delete their bands" ON public.bands;
DROP POLICY IF EXISTS "Band members can insert their bands" ON public.bands;

CREATE POLICY "Band members can update their bands" 
ON public.bands FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.band_members WHERE band_id = id AND user_id = auth.uid())
);

CREATE POLICY "Band members can delete their bands" 
ON public.bands FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.band_members WHERE band_id = id AND user_id = auth.uid())
);

CREATE POLICY "Band members can insert their bands" 
ON public.bands FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.band_members WHERE band_id = id AND user_id = auth.uid())
);
