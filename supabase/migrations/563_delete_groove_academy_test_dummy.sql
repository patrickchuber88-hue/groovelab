-- ==============================================================================
-- Migration 563: Forensic Elimination of 'Groove Academy' Test Dummy
-- Standards: OWASP ASVS Level 3 / Zero-Fake Axiom / Zero-Demo-Leakage
-- ==============================================================================

-- 1. Chirurgische Löschung der verwaisten Test-Referenzen
DELETE FROM public.campus_event_program_points 
WHERE event_id IN (
    SELECT id FROM public.campus_events WHERE school_id = '11111111-1111-1111-1111-111111111111'
);

DELETE FROM public.campus_events 
WHERE school_id = '11111111-1111-1111-1111-111111111111';

DELETE FROM public.subjects 
WHERE school_id = '11111111-1111-1111-1111-111111111111';

DELETE FROM public.school_tariff_bookings 
WHERE school_id = '11111111-1111-1111-1111-111111111111';

-- 2. Vollständige, physische Löschung des Test-Mandanten
DELETE FROM public.schools 
WHERE id = '11111111-1111-1111-1111-111111111111' 
   OR name ILIKE '%groove academy%';

-- 3. Härtung des Public-Discovery-RPCs: Striktes Verbot von Demo- und Test-Mandanten
CREATE OR REPLACE FUNCTION public.search_public_schools(p_query TEXT DEFAULT '')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_clean TEXT := LOWER(TRIM(COALESCE(p_query, '')));
    v_results JSONB;
BEGIN
    IF v_clean = '' THEN
        SELECT jsonb_agg(jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'subdomain', s.subdomain,
            'logo_url', s.logo_url,
            'city', s.city,
            'street', s.street,
            'zip_code', s.zip_code,
            'has_campus_subscription', COALESCE(s.has_campus_subscription, true),
            'has_groovelab_subscription', COALESCE(s.has_groovelab_subscription, false),
            'is_trial', COALESCE(s.is_trial, s.status = 'trial', false),
            'is_demo_tenant', COALESCE(s.is_demo_tenant, false)
        ) ORDER BY s.name ASC)
        INTO v_results
        FROM public.schools s
        WHERE COALESCE(s.is_paused, false) = FALSE
          AND COALESCE(s.is_active, true) = TRUE
          AND COALESCE(s.is_demo_tenant, false) = FALSE
          AND (s.status IS NULL OR s.status IN ('active', 'trial'))
        LIMIT 50;
    ELSE
        SELECT jsonb_agg(jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'subdomain', s.subdomain,
            'logo_url', s.logo_url,
            'city', s.city,
            'street', s.street,
            'zip_code', s.zip_code,
            'has_campus_subscription', COALESCE(s.has_campus_subscription, true),
            'has_groovelab_subscription', COALESCE(s.has_groovelab_subscription, false),
            'is_trial', COALESCE(s.is_trial, s.status = 'trial', false),
            'is_demo_tenant', COALESCE(s.is_demo_tenant, false)
        ) ORDER BY s.name ASC)
        INTO v_results
        FROM public.schools s
        WHERE (LOWER(s.name) LIKE '%' || v_clean || '%' OR LOWER(COALESCE(s.subdomain, '')) LIKE '%' || v_clean || '%' OR LOWER(COALESCE(s.city, '')) LIKE '%' || v_clean || '%')
          AND COALESCE(s.is_paused, false) = FALSE
          AND COALESCE(s.is_active, true) = TRUE
          AND COALESCE(s.is_demo_tenant, false) = FALSE
          AND (s.status IS NULL OR s.status IN ('active', 'trial'))
        LIMIT 20;
    END IF;

    RETURN COALESCE(v_results, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_public_schools(TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
