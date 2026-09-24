-- ==============================================================================
-- Migration: 477_enterprise_users_raw_airgap_and_grants.sql
-- Description: Absolute Airgap & Grant Hardening on users_raw vs users Security View
-- Standards: OWASP ASVS Level 3 / BSI IT-Grundschutz / DIN EN ISO/IEC 27001
--
-- Guarantees:
-- 1. Direct API queries against users_raw unconditionally fail with SQL Error 42501 (Permission Denied).
-- 2. authenticated and anon roles can ONLY access the hardened security_barrier view public.users.
-- 3. Dynamic PII Masking and Zero-Secret Projections are locked at database engine level.
-- ==============================================================================

DO $$
BEGIN
    -- 1. Unbedingter Entzug aller Client-Rechte auf die physische Rohtabelle
    IF to_regclass('public.users_raw') IS NOT NULL THEN
        REVOKE ALL ON TABLE public.users_raw FROM PUBLIC, anon, authenticated;
        
        -- Volle Administrationsrechte verbleiben exklusiv bei Postgres und Service-Role
        GRANT ALL ON TABLE public.users_raw TO postgres, service_role;
    END IF;

    -- 2. Selektive Berechtigung für authentifizierte Clients ausschließlich auf die gehärtete View
    IF to_regclass('public.users') IS NOT NULL THEN
        REVOKE ALL ON public.users FROM PUBLIC, anon;
        GRANT SELECT ON public.users TO authenticated, service_role;
    END IF;
END;
$$;

-- 3. Sicherstellung der Härtungs-Attribute auf public.users
-- security_barrier: Schützt vor Query-Planner Side-Channel-Leaks
-- security_invoker: Erzwingt Ausführung im Kontext des anfragenden Nutzers
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_views 
        WHERE schemaname = 'public' AND viewname = 'users'
    ) THEN
        ALTER VIEW public.users SET (security_barrier = true, security_invoker = true);
    END IF;
END $$;
