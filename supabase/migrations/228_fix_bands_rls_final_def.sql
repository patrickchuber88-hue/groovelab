-- Migration 228: Fix bands and band_members RLS recursion once and for all using SECURITY DEFINER functions

-- 1. Drop ALL existing policies on bands and band_members to ensure no leftovers
DROP POLICY IF EXISTS "Bands are visible to school members" ON public.bands;
DROP POLICY IF EXISTS "Band members can update their band" ON public.bands;
DROP POLICY IF EXISTS "bands_select" ON public.bands;
DROP POLICY IF EXISTS "bands_modify" ON public.bands;
DROP POLICY IF EXISTS "Band members can manage their bands" ON public.bands;
DROP POLICY IF EXISTS "Band members can update their bands" ON public.bands;
DROP POLICY IF EXISTS "Band members can delete their bands" ON public.bands;
DROP POLICY IF EXISTS "Band members can insert their bands" ON public.bands;
DROP POLICY IF EXISTS "Users can see bands from their own school" ON public.bands;

DROP POLICY IF EXISTS "Band members are visible to school members" ON public.band_members;
DROP POLICY IF EXISTS "band_members_all" ON public.band_members;
DROP POLICY IF EXISTS "Users can see band members from their own school" ON public.band_members;

-- 2. Create helper functions with SECURITY DEFINER (runs as database owner, bypassing RLS)
CREATE OR REPLACE FUNCTION public.is_band_member(p_band_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.band_members 
    WHERE band_id = p_band_id AND user_id = p_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_band_school_id(p_band_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id UUID;
BEGIN
  SELECT school_id INTO v_school_id FROM public.bands WHERE id = p_band_id;
  RETURN v_school_id;
END;
$$;

-- 3. Define clean, non-recursive policies for bands
CREATE POLICY "bands_select" 
ON public.bands FOR SELECT USING (
  school_id = (auth.jwt()->>'school_id')::uuid
);

CREATE POLICY "bands_insert" 
ON public.bands FOR INSERT WITH CHECK (
  public.check_school_access(school_id)
);

CREATE POLICY "bands_update" 
ON public.bands FOR UPDATE USING (
  public.is_band_member(id, auth.uid()) OR public.is_teacher_or_admin() OR public.is_master_admin()
);

CREATE POLICY "bands_delete" 
ON public.bands FOR DELETE USING (
  public.is_band_member(id, auth.uid()) OR public.is_teacher_or_admin() OR public.is_master_admin()
);

-- 4. Define clean, non-recursive policies for band_members
CREATE POLICY "band_members_select" 
ON public.band_members FOR SELECT USING (
  public.get_band_school_id(band_id) = (auth.jwt()->>'school_id')::uuid
);

CREATE POLICY "band_members_modify" 
ON public.band_members FOR ALL USING (
  public.is_band_member(band_id, auth.uid()) OR public.is_teacher_or_admin() OR public.is_master_admin() OR public.check_school_access(public.get_band_school_id(band_id))
);
