-- ==============================================================================
-- 🏛️ MIGRATION 554: ENTERPRISE SCHOOL SPONSOR SETTINGS SSOT
-- Campus-Groovelab Enterprise+ Architecture / ADM-47 Sponsoring Governance
-- Standard: OWASP ASVS Level 3 / § 8 MStV Compliance / Multi-Tenant SSOT
-- ==============================================================================

-- 1. ADD SPONSOR_SETTINGS TO PUBLIC.SCHOOLS
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS sponsor_settings JSONB DEFAULT NULL;

COMMENT ON COLUMN public.schools.sponsor_settings IS 
'Authoritative Single Source of Truth (SSOT) for school sponsors, patronage tiers, and toast configurations according to ADM-47.';

-- 2. SEED CANONICAL FLAGSHIP DATA FOR MUSÄK BAD SÄCKINGEN
UPDATE public.schools
SET sponsor_settings = jsonb_build_object(
    'mode', 'school_funded',
    'allowCoSponsorsWithMain', true,
    'sponsors', jsonb_build_array(
        jsonb_build_object(
            'id', 'musaek-sponsor-1',
            'companyName', 'sameday',
            'industrySubline', 'Logistik & Fulfillment',
            'city', 'Bad Säckingen',
            'tier', 'haupt',
            'isMainSponsor', true,
            'isActive', true,
            'createdAt', '2026-01-01T00:00:00.000Z'
        ),
        jsonb_build_object(
            'id', 'musaek-sponsor-2',
            'companyName', 'Patrick Huber',
            'industrySubline', 'Bildungsstiftung',
            'city', 'Rheinfelden',
            'tier', 'partner',
            'isMainSponsor', false,
            'isActive', true,
            'createdAt', '2026-01-01T00:00:00.000Z'
        ),
        jsonb_build_object(
            'id', 'musaek-sponsor-3',
            'companyName', 'Jasna',
            'industrySubline', 'Tollste Frau der Welt',
            'city', 'Bad Säckingen',
            'tier', 'foerderer',
            'isMainSponsor', false,
            'isActive', true,
            'createdAt', '2026-01-01T00:00:00.000Z'
        )
    )
)
WHERE id = '53e83805-1d5a-4ed8-988e-1fb0b8200b9c'
   OR name ILIKE '%Musäk Bad Säckingen%';

-- 3. UPDATE GET_PUBLIC_SCHOOL_THEME TO RETURN SPONSOR_SETTINGS AUTHORITATIVELY
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
    SELECT id, name, primary_color, logo_url, has_campus_subscription, has_groovelab_subscription, sponsor_settings
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
        'is_groovelab_active', COALESCE(v_school.has_groovelab_subscription, false),
        'sponsor_settings', v_school.sponsor_settings
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_school_theme(TEXT) TO anon, authenticated, service_role;

-- 4. RELOAD POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
