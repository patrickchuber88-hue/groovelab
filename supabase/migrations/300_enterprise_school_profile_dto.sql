-- ======================================================================================
-- MIGRATION 300: ENTERPRISE SCHOOL PROFILE DTO RPC
-- Campus-Groovelab Pure-UI & Zero-Trust Backend Domain Core
-- ======================================================================================

CREATE OR REPLACE FUNCTION public.get_school_profile_dto(p_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_school RECORD;
BEGIN
    SELECT id, name, subdomain, logo_url, city, street, zip_code, email,
           represented_by, has_campus_subscription, has_groovelab_subscription
    INTO v_school
    FROM public.schools
    WHERE id = p_school_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'id', v_school.id,
        'name', v_school.name,
        'subdomain', v_school.subdomain,
        'logoUrl', v_school.logo_url,
        'city', v_school.city,
        'street', v_school.street,
        'zipCode', v_school.zip_code,
        'email', v_school.email,
        'representedBy', v_school.represented_by,
        'hasCampusSubscription', COALESCE(v_school.has_campus_subscription, false),
        'hasGroovelabSubscription', COALESCE(v_school.has_groovelab_subscription, false)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_school_profile_dto(UUID) TO anon, authenticated, service_role;
