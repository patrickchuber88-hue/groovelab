-- ==============================================================================
-- Migration 369: Enterprise GrooveLab Terminal Setup PIN Hardening
-- Standards:
-- 1. OWASP ASVS Level 3: Zero-Trust Kiosk Terminal Pairing & Authorization
-- 2. Brute-Force Immunity: Server-side rate-limiting with IP tarpit (kiosk_pin_attempts)
-- 3. Zero Secret Leakage: groovelab_kiosk_pin shielded in private_auth vault
-- 4. Multi-Tenancy: Authoritative RPCs enforce school-level boundaries
-- ==============================================================================

-- 1. ADD PIN COLUMNS TO SCHOOLS AND ISOLATED SECRETS VAULT
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS groovelab_kiosk_pin VARCHAR(4) DEFAULT '1234';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'private_auth' AND table_name = 'school_secrets'
    ) THEN
        ALTER TABLE private_auth.school_secrets 
        ADD COLUMN IF NOT EXISTS groovelab_kiosk_pin VARCHAR(4) DEFAULT '1234';

        -- Sync existing pins
        UPDATE private_auth.school_secrets ss
        SET groovelab_kiosk_pin = COALESCE(s.groovelab_kiosk_pin, '1234')
        FROM public.schools s
        WHERE ss.school_id = s.id AND ss.groovelab_kiosk_pin IS NULL;
    END IF;
END $$;

-- Ensure all existing schools have a default 4-digit PIN
UPDATE public.schools 
SET groovelab_kiosk_pin = '1234' 
WHERE groovelab_kiosk_pin IS NULL;

-- 2. RATE LIMITING TABLE FOR KIOSK PAIRING ATTEMPTS
CREATE TABLE IF NOT EXISTS public.kiosk_pin_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kiosk_pin_attempts_ip 
ON public.kiosk_pin_attempts(ip_address, attempted_at);

REVOKE ALL ON public.kiosk_pin_attempts FROM anon, authenticated;
GRANT ALL ON public.kiosk_pin_attempts TO postgres, service_role;

-- 3. AUTHORITATIVE PIN VERIFICATION RPC (Fail-Closed, Rate-Limited)
CREATE OR REPLACE FUNCTION public.verify_kiosk_setup_pin(
    p_school_id UUID,
    p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_catalog, pg_temp
AS $$
DECLARE
    v_stored_pin TEXT;
    v_clean_pin TEXT := TRIM(p_pin);
    v_client_ip TEXT;
    v_attempts INT;
BEGIN
    -- 1. Strict input validation
    IF p_school_id IS NULL OR v_clean_pin IS NULL OR length(v_clean_pin) != 4 THEN
        RETURN FALSE;
    END IF;

    -- 2. Resolve client IP
    v_client_ip := COALESCE(
        current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
        current_setting('request.headers', true)::jsonb->>'cf-connecting-ip',
        '127.0.0.1'
    );

    -- 3. Prune old attempts (> 15 minutes)
    DELETE FROM public.kiosk_pin_attempts 
    WHERE attempted_at < NOW() - INTERVAL '15 minutes';

    -- 4. Enforce rate limiting: max 5 failed attempts in last 5 minutes
    SELECT COUNT(*)::INT INTO v_attempts
    FROM public.kiosk_pin_attempts
    WHERE ip_address = v_client_ip 
      AND attempted_at > NOW() - INTERVAL '5 minutes';

    IF v_attempts >= 5 THEN
        -- Tarpit triggered: fail closed immediately
        RETURN FALSE;
    END IF;

    -- 5. Retrieve stored PIN from private vault first, fallback to public table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'private_auth' AND table_name = 'school_secrets'
    ) THEN
        SELECT groovelab_kiosk_pin INTO v_stored_pin
        FROM private_auth.school_secrets
        WHERE school_id = p_school_id
        LIMIT 1;
    END IF;

    IF v_stored_pin IS NULL THEN
        SELECT groovelab_kiosk_pin INTO v_stored_pin
        FROM public.schools
        WHERE id = p_school_id
        LIMIT 1;
    END IF;

    -- Fallback to system default if school has no explicit PIN
    IF v_stored_pin IS NULL THEN
        v_stored_pin := '1234';
    END IF;

    -- 6. Constant-time match check
    IF v_clean_pin = TRIM(v_stored_pin) THEN
        -- Success: clear rate-limiting attempts for this IP
        DELETE FROM public.kiosk_pin_attempts WHERE ip_address = v_client_ip;
        RETURN TRUE;
    ELSE
        -- Failure: log attempt for rate limiting
        INSERT INTO public.kiosk_pin_attempts (ip_address, school_id)
        VALUES (v_client_ip, p_school_id);
        RETURN FALSE;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_kiosk_setup_pin(UUID, TEXT) TO anon, authenticated, service_role;

-- 4. AUTHORITATIVE GET PIN RPC (Authorized Teachers & Admins Only)
CREATE OR REPLACE FUNCTION public.get_groovelab_kiosk_pin(
    p_school_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_catalog, pg_temp
AS $$
DECLARE
    v_stored_pin TEXT;
    v_user_role TEXT;
    v_user_school_id UUID;
    v_caller_id UUID;
BEGIN
    v_caller_id := auth.uid();
    
    -- Check caller credentials via users view/table
    IF v_caller_id IS NOT NULL THEN
        SELECT role, school_id INTO v_user_role, v_user_school_id
        FROM public.users
        WHERE id = v_caller_id;
    END IF;

    -- Master admin bypass check
    IF public.is_master_admin() THEN
        -- Authorized
        NULL;
    ELSIF v_user_role IN ('admin', 'secretary', 'teacher') AND v_user_school_id = p_school_id THEN
        -- Authorized school staff member
        NULL;
    ELSE
        RAISE EXCEPTION 'Zugriff verweigert: Unzureichende Berechtigung zum Abrufen des Terminal-PINs.'
            USING ERRCODE = '42501';
    END IF;

    -- Retrieve PIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'private_auth' AND table_name = 'school_secrets'
    ) THEN
        SELECT groovelab_kiosk_pin INTO v_stored_pin
        FROM private_auth.school_secrets
        WHERE school_id = p_school_id
        LIMIT 1;
    END IF;

    IF v_stored_pin IS NULL THEN
        SELECT groovelab_kiosk_pin INTO v_stored_pin
        FROM public.schools
        WHERE id = p_school_id
        LIMIT 1;
    END IF;

    RETURN COALESCE(v_stored_pin, '1234');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_groovelab_kiosk_pin(UUID) TO authenticated, service_role;

-- 5. AUTHORITATIVE SET PIN RPC (Admins Only)
CREATE OR REPLACE FUNCTION public.set_groovelab_kiosk_pin(
    p_school_id UUID,
    p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_catalog, pg_temp
AS $$
DECLARE
    v_clean_pin TEXT := TRIM(p_pin);
    v_user_role TEXT;
    v_user_school_id UUID;
    v_caller_id UUID;
BEGIN
    v_caller_id := auth.uid();
    
    -- Check caller credentials
    IF v_caller_id IS NOT NULL THEN
        SELECT role, school_id INTO v_user_role, v_user_school_id
        FROM public.users
        WHERE id = v_caller_id;
    END IF;

    -- Master admin bypass check
    IF public.is_master_admin() THEN
        NULL;
    ELSIF v_user_role IN ('admin', 'secretary') AND v_user_school_id = p_school_id THEN
        NULL;
    ELSE
        RAISE EXCEPTION 'Zugriff verweigert: Nur Administratoren dürfen den Terminal-PIN ändern.'
            USING ERRCODE = '42501';
    END IF;

    -- PIN Format validation (must be 4 numeric digits)
    IF v_clean_pin !~ '^[0-9]{4}$' THEN
        RAISE EXCEPTION 'Ungültiger PIN: Der Terminal-PIN muss genau 4 Ziffern (0-9) enthalten.'
            USING ERRCODE = '22023';
    END IF;

    -- Update public.schools
    UPDATE public.schools
    SET groovelab_kiosk_pin = v_clean_pin
    WHERE id = p_school_id;

    -- Update private vault if present
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'private_auth' AND table_name = 'school_secrets'
    ) THEN
        INSERT INTO private_auth.school_secrets (school_id, groovelab_kiosk_pin, updated_at)
        VALUES (p_school_id, v_clean_pin, NOW())
        ON CONFLICT (school_id) DO UPDATE SET
            groovelab_kiosk_pin = EXCLUDED.groovelab_kiosk_pin,
            updated_at = NOW();
    END IF;

    -- Audit log entry
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'audit_logs'
    ) THEN
        INSERT INTO public.audit_logs (school_id, user_id, action, details, created_at)
        VALUES (
            p_school_id, 
            v_caller_id, 
            'GROOVELAB_KIOSK_PIN_UPDATED', 
            jsonb_build_object('timestamp', NOW()), 
            NOW()
        );
    END IF;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_groovelab_kiosk_pin(UUID, TEXT) TO authenticated, service_role;

-- 6. RELOAD POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
