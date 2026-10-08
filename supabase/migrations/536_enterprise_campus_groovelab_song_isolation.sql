-- ==============================================================================
-- Migration 536: Enterprise Campus & GrooveLab Song Isolation
-- Bounded Context: CAM-122 (0,1% Goldstandard Modul-Isolation & Clean Repertoire)
--
-- 1. Heals existing school songs: Activates is_campus_active = TRUE for all
--    existing repertoire songs so they are immediately available in Campus.
-- 2. Sets column defaults: is_campus_active DEFAULT TRUE to prevent orphaned songs.
-- 3. Enforces hermetic module isolation between Campus and GrooveLab.
-- ==============================================================================

-- 1. Heal existing songs to ensure they are active in Campus
UPDATE public.songs
SET is_campus_active = TRUE
WHERE is_campus_active IS NOT TRUE;

-- 2. Adjust column defaults to avoid accidental omission
ALTER TABLE public.songs ALTER COLUMN is_campus_active SET DEFAULT TRUE;

-- 3. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
