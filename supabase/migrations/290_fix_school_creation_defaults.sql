-- Migration 290: Fix School Creation Defaults & Storage Addon Initialization
-- Ensures newly created schools start strictly unbooked (has_campus_subscription = FALSE, has_groovelab_subscription = FALSE, extra storage = 0 GB)
-- Module and storage booking is strictly deferred to the "Abrechnung & Infrastruktur" board.

-- 1. Adjust column defaults on public.schools table
ALTER TABLE public.schools
  ALTER COLUMN has_campus_subscription SET DEFAULT FALSE,
  ALTER COLUMN has_groovelab_subscription SET DEFAULT FALSE,
  ALTER COLUMN extra_billing_option SET DEFAULT NULL,
  ALTER COLUMN storage_addon_gb SET DEFAULT 0,
  ALTER COLUMN storage_addon_monthly_fee SET DEFAULT 0.00,
  ALTER COLUMN storage_addon_status SET DEFAULT 'none',
  ALTER COLUMN is_billing_booked SET DEFAULT FALSE;

-- 2. Update register_school_and_admin RPC to initialize schools with unbooked modules and 0 GB extra storage
CREATE OR REPLACE FUNCTION public.register_school_and_admin(
    p_school_name TEXT,
    p_subdomain TEXT,
    p_street TEXT,
    p_house_number TEXT,
    p_zip_code TEXT,
    p_city TEXT,
    p_phone TEXT,
    p_school_email TEXT,
    p_admin_first_name TEXT,
    p_admin_last_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_school_id UUID := gen_random_uuid();
    v_admin_id UUID := gen_random_uuid();
    v_qr_token UUID := gen_random_uuid();
    v_generated_pin TEXT;
    v_admin_email TEXT;
    v_slug TEXT;
BEGIN
    -- 1. Format & Validate Slug
    v_slug := LOWER(TRIM(p_subdomain));
    IF v_slug IS NULL OR length(v_slug) < 3 THEN
        RAISE EXCEPTION 'Die Wunsch-Subdomain muss mindestens 3 Zeichen lang sein.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.schools WHERE subdomain = v_slug) THEN
        RAISE EXCEPTION 'Diese Wunsch-Subdomain ist bereits vergeben. Bitte wähle eine andere.';
    END IF;

    -- 2. Generate unique 6-digit Master-PIN & Email
    v_generated_pin := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
    v_admin_email := COALESCE(NULLIF(LOWER(TRIM(p_school_email)), ''), v_slug || '@campus-groovelab.de');

    -- 3. Create school record directly in public.schools (Unbooked modules, 0 GB extra storage, 1 GB included base)
    INSERT INTO public.schools (
        id, name, legal_name, subdomain, primary_color,
        street, house_number, zip_code, city, phone_number,
        email, billing_email, billing_contact_person, country,
        has_campus_subscription, has_groovelab_subscription,
        storage_addon_gb, storage_addon_monthly_fee, storage_addon_status,
        extra_billing_option, is_billing_booked,
        subscription_bypass, is_trial, trial_ends_at, status,
        avv_signed_at, avv_signee_name, is_active
    ) VALUES (
        v_school_id, TRIM(p_school_name), TRIM(p_school_name), v_slug, '#34a853',
        TRIM(p_street), NULLIF(TRIM(p_house_number), ''), TRIM(p_zip_code), TRIM(p_city), NULLIF(TRIM(p_phone), ''),
        v_admin_email, v_admin_email, TRIM(p_admin_first_name) || ' ' || TRIM(p_admin_last_name), 'Deutschland',
        FALSE, FALSE,
        0, 0.00, 'none',
        NULL, FALSE,
        FALSE, TRUE, NOW() + INTERVAL '30 days', 'trial',
        NOW(), TRIM(p_admin_first_name) || ' ' || TRIM(p_admin_last_name) || ' (Schulleitung)', TRUE
    );

    -- 4. Create admin record directly in public.users_raw (Chalkboard hero image /campus_login_hero.png)
    INSERT INTO public.users_raw (
        id, school_id, role, roles, first_name, last_name,
        password_hash, qr_token, ausweis_nummer,
        photo_url, avatar_url, is_campus_active, is_groovelab_active,
        is_active, is_pin_activated, created_at, last_seen
    ) VALUES (
        v_admin_id, v_school_id, 'admin', ARRAY['admin'], TRIM(p_admin_first_name), TRIM(p_admin_last_name),
        v_generated_pin, v_qr_token, v_generated_pin,
        '/campus_login_hero.png', '/campus_login_hero.png', TRUE, TRUE,
        TRUE, TRUE, NOW(), NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'school_id', v_school_id,
        'admin_id', v_admin_id,
        'pin', v_generated_pin,
        'qr_token', v_qr_token,
        'subdomain', v_slug
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_school_and_admin(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
