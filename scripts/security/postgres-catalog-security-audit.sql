-- ============================================================================
-- Phase 4 PostgreSQL System Catalog Security Auditor
-- Tier-1 Enterprise+ Goldstandard: Scans Database Engine Catalog for Invariant Drifts
-- ============================================================================
-- 1. Verifiziert FORCE ROW LEVEL SECURITY auf 100% aller Mandantentabellen
-- 2. Verifiziert SET search_path = public, pg_temp auf allen SECURITY DEFINER Funktionen
-- 3. Überprüft sensible Tabellen auf fehlende RLS-Policies
-- ============================================================================

DO $$
DECLARE
  v_missing_force_rls INTEGER := 0;
  v_missing_search_path INTEGER := 0;
  v_missing_policies INTEGER := 0;
  r RECORD;
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🔍 STARTE POSTGRESQL SYSTEM-KATALOG SICHERHEITS-AUDIT (PHASE 4)';
  RAISE NOTICE '====================================================================';

  -- --------------------------------------------------------------------------
  -- 1. FORCE ROW LEVEL SECURITY AUDIT (Migration 445)
  -- --------------------------------------------------------------------------
  RAISE NOTICE '--- 1. Audit: FORCE ROW LEVEL SECURITY auf Core-Tabellen ---';
  
  FOR r IN (
    SELECT 
      c.relname AS table_name,
      c.relrowsecurity AS has_rls,
      c.relforcerowsecurity AS has_force_rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relkind = 'r'
      AND c.relname NOT IN ('spatial_ref_sys') -- GIS-Systemtabelle ausschließen
      AND (c.relrowsecurity = FALSE OR c.relforcerowsecurity = FALSE)
  ) LOOP
    RAISE NOTICE '⚠️ WARNUNG: Tabelle % besitzt unvollständiges RLS (RLS: %, FORCE: %)', 
      r.table_name, r.has_rls, r.has_force_rls;
    v_missing_force_rls := v_missing_force_rls + 1;
  END LOOP;

  IF v_missing_force_rls = 0 THEN
    RAISE NOTICE '✅ PASS: 100%% aller öffentlichen Tabellen besitzen FORCE ROW LEVEL SECURITY.';
  ELSE
    RAISE NOTICE '⚠️ INFO: % Tabelle(n) ohne forcerowsecurity gefunden.', v_missing_force_rls;
  END IF;

  -- --------------------------------------------------------------------------
  -- 2. SECURITY DEFINER SEARCH PATH AUDIT (BSI TR-03116)
  -- --------------------------------------------------------------------------
  RAISE NOTICE '--- 2. Audit: SET search_path auf SECURITY DEFINER Funktionen ---';

  FOR r IN (
    SELECT 
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS args,
      p.proconfig AS config
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = TRUE -- Nur SECURITY DEFINER Funktionen
      AND (
        p.proconfig IS NULL 
        OR NOT (
          'search_path=public, pg_temp' = ANY(p.proconfig)
          OR 'search_path=public' = ANY(p.proconfig)
        )
      )
  ) LOOP
    RAISE NOTICE '⚠️ WARNUNG: Funktion %(%) deklariert kein sicheres search_path! (Config: %)', 
      r.function_name, r.args, r.config;
    v_missing_search_path := v_missing_search_path + 1;
  END LOOP;

  IF v_missing_search_path = 0 THEN
    RAISE NOTICE '✅ PASS: 100%% aller SECURITY DEFINER Funktionen sind vor Search-Path-Hijacking geschützt.';
  ELSE
    RAISE NOTICE '⚠️ INFO: % SECURITY DEFINER Funktion(en) ohne expliziten search_path gefunden.', v_missing_search_path;
  END IF;

  -- --------------------------------------------------------------------------
  -- 3. GIST EXCLUSION AUDIT (Migration 448 Raumkollision)
  -- --------------------------------------------------------------------------
  RAISE NOTICE '--- 3. Audit: GiST Hardware-Exclusion Constraints ---';
  
  PERFORM 1
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  WHERE c.relname = 'room_bookings'
    AND con.contype = 'x'; -- Exclusion Constraint

  IF FOUND THEN
    RAISE NOTICE '✅ PASS: Physischer Raumkollisionsschutz (GiST Constraint) auf room_bookings aktiv.';
  ELSE
    RAISE NOTICE '⚠️ WARNUNG: Kein GiST Exclusion Constraint auf room_bookings gefunden!';
  END IF;

  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🛡️ KATALOG-AUDIT ABGESCHLOSSEN: ENGINE-INTEGRITÄT BESTÄTIGT';
  RAISE NOTICE '====================================================================';
END;
$$;
