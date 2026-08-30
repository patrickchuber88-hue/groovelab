-- ==============================================================================
-- Migration 311: Include Trial & Active Schools in Public Discovery RPC
-- Standard: Zero-PII Public Directory Architecture
-- ==============================================================================

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
            'is_trial', COALESCE(s.is_trial, s.status = 'trial', false)
        ) ORDER BY s.name ASC)
        INTO v_results
        FROM public.schools s
        WHERE COALESCE(s.is_paused, false) = FALSE
          AND COALESCE(s.is_active, true) = TRUE
          AND (s.status IS NULL OR s.status NOT IN ('suspended', 'archived', 'deleted'))
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
            'is_trial', COALESCE(s.is_trial, s.status = 'trial', false)
        ) ORDER BY s.name ASC)
        INTO v_results
        FROM public.schools s
        WHERE (LOWER(s.name) LIKE '%' || v_clean || '%' OR LOWER(COALESCE(s.subdomain, '')) LIKE '%' || v_clean || '%' OR LOWER(COALESCE(s.city, '')) LIKE '%' || v_clean || '%')
          AND COALESCE(s.is_paused, false) = FALSE
          AND COALESCE(s.is_active, true) = TRUE
          AND (s.status IS NULL OR s.status NOT IN ('suspended', 'archived', 'deleted'))
        LIMIT 20;
    END IF;

    RETURN COALESCE(v_results, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_public_schools(TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
