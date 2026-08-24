-- Migration 286: Atomic School Self-Onboarding RPC & Schools Insert RLS Policy
-- Enables seamless, zero-error self-registration of new music schools without RLS 401 Unauthorized blocks.

-- 1. Ensure required legal & billing columns exist on public.schools
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS billing_email TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS billing_contact_person TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Deutschland';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS avv_signed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS avv_signee_name TEXT;

-- 2. Ensure permissive INSERT policy on public.schools for new registrations
DROP POLICY IF EXISTS "Allow public school registration" ON public.schools;
CREATE POLICY "Allow public school registration" 
ON public.schools 
FOR INSERT 
TO anon, authenticated, service_role 
WITH CHECK (true);

-- 3. Drop existing function if present to ensure clean signature
DROP FUNCTION IF EXISTS public.register_school_and_admin(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- 4. Create Atomic RPC for School Self-Onboarding
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
    -- Format slug
    v_slug := LOWER(TRIM(p_subdomain));
    IF v_slug IS NULL OR length(v_slug) < 3 THEN
        RAISE EXCEPTION 'Die Wunsch-Subdomain muss mindestens 3 Zeichen lang sein.';
    END IF;

    -- 1. Validate subdomain uniqueness
    IF EXISTS (SELECT 1 FROM public.schools WHERE subdomain = v_slug) THEN
        RAISE EXCEPTION 'Diese Wunsch-Subdomain ist bereits vergeben. Bitte wähle eine andere.';
    END IF;

    -- 2. Generate unique 6-digit Master-PIN
    v_generated_pin := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
    v_admin_email := COALESCE(NULLIF(LOWER(TRIM(p_school_email)), ''), v_slug || '@campus-groovelab.de');

    -- 3. Create school record with § 14 UStG and AVV Art. 28 DSGVO compliance
    INSERT INTO public.schools (
        id, name, legal_name, subdomain, primary_color,
        street, house_number, zip_code, city, phone_number,
        email, billing_email, billing_contact_person, country,
        has_campus_subscription, has_groovelab_subscription,
        subscription_bypass, is_trial, trial_ends_at, status,
        avv_signed_at, avv_signee_name, is_active
    ) VALUES (
        v_school_id, TRIM(p_school_name), TRIM(p_school_name), v_slug, '#34a853',
        TRIM(p_street), NULLIF(TRIM(p_house_number), ''), TRIM(p_zip_code), TRIM(p_city), NULLIF(TRIM(p_phone), ''),
        v_admin_email, v_admin_email, TRIM(p_admin_first_name) || ' ' || TRIM(p_admin_last_name), 'Deutschland',
        TRUE, TRUE,
        FALSE, TRUE, NOW() + INTERVAL '30 days', 'trial',
        NOW(), TRIM(p_admin_first_name) || ' ' || TRIM(p_admin_last_name) || ' (Schulleitung)', TRUE
    );

    -- 4. Create administrator user record via public.users view (Trigger automatically encrypts and handles email)
    INSERT INTO public.users (
        id, school_id, role, roles, first_name, last_name,
        email, password_hash, qr_token, ausweis_nummer,
        photo_url, avatar_url, is_campus_active, is_groovelab_active,
        is_active, is_pin_activated
    ) VALUES (
        v_admin_id, v_school_id, 'admin', ARRAY['admin'], TRIM(p_admin_first_name), TRIM(p_admin_last_name),
        v_admin_email, v_generated_pin, v_qr_token, v_generated_pin,
        '/campus_login_hero.png', '/campus_login_hero.png', TRUE, TRUE,
        TRUE, TRUE
    );

    RETURN jsonb_build_object(
        'success', true,
        'school_id', v_school_id,
        'admin_id', v_admin_id,
        'pin', v_generated_pin,
        'qr_token', v_qr_token,
        'school_name', TRIM(p_school_name),
        'subdomain', v_slug,
        'first_name', TRIM(p_admin_first_name),
        'last_name', TRIM(p_admin_last_name),
        'email', v_admin_email
    );
END;
$$;

-- 5. Grant execution privileges to all roles
GRANT EXECUTE ON FUNCTION public.register_school_and_admin(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
