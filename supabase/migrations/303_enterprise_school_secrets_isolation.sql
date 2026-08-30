-- ==============================================================================
-- MIGRATION 303: ENTERPRISE SCHOOL SECRETS ISOLATION & ZERO-LEAK HARDENING
-- Campus-Groovelab Tier-1 SaaS Enterprise+ Multi-Tenant Vault
-- ==============================================================================

-- 1. CREATE ISOLATED VAULT FOR SCHOOL SECRETS
CREATE TABLE IF NOT EXISTS private_auth.school_secrets (
    school_id UUID PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE,
    admin_pin TEXT,
    secretary_onboarding_token TEXT,
    groovelab_kiosk_token TEXT,
    campus_login_token TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrate existing tokens into isolated vault
INSERT INTO private_auth.school_secrets (school_id, admin_pin, secretary_onboarding_token, groovelab_kiosk_token, campus_login_token, updated_at)
SELECT id, admin_pin, secretary_onboarding_token, groovelab_kiosk_token, campus_login_token, NOW()
FROM public.schools
WHERE admin_pin IS NOT NULL 
   OR secretary_onboarding_token IS NOT NULL 
   OR groovelab_kiosk_token IS NOT NULL 
   OR campus_login_token IS NOT NULL
ON CONFLICT (school_id) DO UPDATE SET
    admin_pin = COALESCE(EXCLUDED.admin_pin, private_auth.school_secrets.admin_pin),
    secretary_onboarding_token = COALESCE(EXCLUDED.secretary_onboarding_token, private_auth.school_secrets.secretary_onboarding_token),
    groovelab_kiosk_token = COALESCE(EXCLUDED.groovelab_kiosk_token, private_auth.school_secrets.groovelab_kiosk_token),
    campus_login_token = COALESCE(EXCLUDED.campus_login_token, private_auth.school_secrets.campus_login_token),
    updated_at = NOW();

-- 2. HARDEN SCHOOLS RLS (Zero Anonymous Bulk Table Scraping)
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schools_select_public" ON public.schools;
DROP POLICY IF EXISTS "schools_select_tenant_scoped" ON public.schools;

CREATE POLICY "schools_select_tenant_scoped" ON public.schools
FOR SELECT TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (public.get_current_user_school_id() IS NOT NULL AND id = public.get_current_user_school_id())
    OR (public.get_kiosk_school_id() IS NOT NULL AND id = public.get_kiosk_school_id())
);

-- 3. HARDENED ADMIN PIN VALIDATION RPC
CREATE OR REPLACE FUNCTION public.verify_school_admin_pin(p_school_id UUID, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_catalog
AS $$
DECLARE
    v_stored_pin TEXT;
    v_clean_pin TEXT := TRIM(p_pin);
BEGIN
    IF p_school_id IS NULL OR v_clean_pin IS NULL OR v_clean_pin = '' THEN
        RETURN FALSE;
    END IF;

    SELECT admin_pin INTO v_stored_pin
    FROM private_auth.school_secrets
    WHERE school_id = p_school_id
    LIMIT 1;

    -- Fallback to schools table if not yet migrated
    IF v_stored_pin IS NULL THEN
        SELECT admin_pin INTO v_stored_pin
        FROM public.schools
        WHERE id = p_school_id
        LIMIT 1;
    END IF;

    RETURN (v_stored_pin IS NOT NULL AND v_stored_pin = v_clean_pin);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_school_admin_pin(UUID, TEXT) TO anon, authenticated, service_role;

-- Reload schema
NOTIFY pgrst, 'reload schema';
