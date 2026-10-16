-- ==============================================================================
-- MIGRATION 576: ENTERPRISE SCHOOL DUNNING KULANZ & SUMMER MORATORIUM SCHEMA
-- Standard: OWASP ASVS Level 3 / GoBD §§ 146, 147 AO / BGB § 286 Abs. 3
-- Scope:
--   1. Adds summer_moratorium_active (BOOLEAN) to public.schools & public.schools_raw
--   2. Adds dunning_kulanz_until (TIMESTAMPTZ) to public.schools & public.schools_raw
--   3. Guarantees PostgREST schema parity for Master-Admin Tenant Drawer & Dunning Engine
-- ==============================================================================

-- 1. ADD COLUMNS TO public.schools
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS summer_moratorium_active BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dunning_kulanz_until TIMESTAMPTZ DEFAULT NULL;

-- 2. ADD COLUMNS TO public.schools_raw (FOR AIRGAP & RAW REPLICA PARITY)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schools_raw') THEN
        ALTER TABLE public.schools_raw
          ADD COLUMN IF NOT EXISTS summer_moratorium_active BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS dunning_kulanz_until TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

-- 3. JURIDICAL & ARCHITECTURAL COMMENTS
COMMENT ON COLUMN public.schools.summer_moratorium_active IS
'Extends municipal dunning grace period to 42 days (6 weeks) during school summer holidays (GoBD / BGB § 286).';

COMMENT ON COLUMN public.schools.dunning_kulanz_until IS
'Individual dunning grace deadline; suspends late fees and writing locks until specified date.';
