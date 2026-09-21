-- Migration 462: Enterprise Public School Theme Subscription Parity
-- Ensures get_public_school_theme provides both has_campus_subscription and is_campus_active for resilient client bootstrapping

CREATE OR REPLACE FUNCTION public.get_public_school_theme(p_subdomain TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_clean_sub TEXT := LOWER(TRIM(p_subdomain));
    v_school RECORD;
BEGIN
    IF v_clean_sub IS NULL OR v_clean_sub = '' THEN
        RETURN NULL;
    END IF;

    -- Query by exact ID or subdomain or slug match
    SELECT id, name, primary_color, logo_url, has_campus_subscription, has_groovelab_subscription
    INTO v_school
    FROM public.schools
    WHERE id::text = v_clean_sub 
       OR LOWER(TRIM(COALESCE(subdomain, ''))) = v_clean_sub
    LIMIT 1;

    IF v_school.id IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'id', v_school.id,
        'name', v_school.name,
        'primary_color', COALESCE(v_school.primary_color, '#eab308'),
        'logo_url', v_school.logo_url,
        'has_campus_subscription', COALESCE(v_school.has_campus_subscription, true),
        'has_groovelab_subscription', COALESCE(v_school.has_groovelab_subscription, false),
        'is_campus_active', COALESCE(v_school.has_campus_subscription, true),
        'is_groovelab_active', COALESCE(v_school.has_groovelab_subscription, false)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_school_theme(TEXT) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_public_school_theme(TEXT) IS 'Returns public branding and active module subscription flags for school login pages with dual attribute naming parity.';
