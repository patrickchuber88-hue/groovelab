-- Migration 190: Add buildings table and link rooms
-- This migration supports defining buildings with names and addresses for schools, and links rooms to buildings.

-- 1. Create buildings table
CREATE TABLE IF NOT EXISTS public.buildings (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on buildings
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS buildings_select ON public.buildings;
DROP POLICY IF EXISTS buildings_modify ON public.buildings;

-- Define RLS policies
CREATE POLICY buildings_select ON public.buildings
FOR SELECT USING (
    public.check_school_access(school_id)
);

CREATE POLICY buildings_modify ON public.buildings
FOR ALL USING (
    public.check_school_access(school_id) AND public.is_teacher_or_admin()
);

-- 2. Link rooms table to buildings
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
