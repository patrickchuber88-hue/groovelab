-- Migration 343: Deprecate and drop legacy cooperations table
-- Cooperations board has been completely removed from the platform.

DROP POLICY IF EXISTS "cooperations_all_policy" ON public.cooperations;
DROP POLICY IF EXISTS "cooperations_select" ON public.cooperations;
DROP POLICY IF EXISTS "cooperations_insert" ON public.cooperations;
DROP POLICY IF EXISTS "cooperations_update" ON public.cooperations;
DROP POLICY IF EXISTS "cooperations_delete" ON public.cooperations;
DROP POLICY IF EXISTS "cooperations_modify" ON public.cooperations;
DROP POLICY IF EXISTS "cooperations_all" ON public.cooperations;

DROP TABLE IF EXISTS public.cooperations CASCADE;
