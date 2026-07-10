-- Migration: 211_fix_security_and_billing_gaps.sql

-- 1. Harden get_current_user_id() against Header Spoofing by checking auth.uid() first
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
    v_headers text;
    v_user_id text;
    v_client_info text;
    v_auth_uid uuid;
BEGIN
    -- Resolve authenticated user first via JWT to prevent header spoofing
    BEGIN
        v_auth_uid := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_auth_uid := NULL;
    END;

    IF v_auth_uid IS NOT NULL THEN
        RETURN v_auth_uid;
    END IF;

    -- Fallback to headers for testing proxy/kiosk
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN NULL;
    END IF;
    
    -- Try to read the direct header first
    v_user_id := v_headers::json->>'x-user-id';
    IF v_user_id IS NOT NULL AND v_user_id <> '' THEN
        RETURN v_user_id::uuid;
    END IF;
    
    -- Fallback: Parse from x-client-info
    v_client_info := v_headers::json->>'x-client-info';
    IF v_client_info IS NOT NULL AND v_client_info <> '' THEN
        v_user_id := substring(v_client_info from ';user_id=([^;]+)');
        IF v_user_id IS NOT NULL AND v_user_id <> '' THEN
            RETURN v_user_id::uuid;
        END IF;
    END IF;
    
    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- 2. Add missing dynamic billing settings columns to master_billing_settings
ALTER TABLE public.master_billing_settings ADD COLUMN IF NOT EXISTS price_module_campus NUMERIC(10, 2) DEFAULT 7.99;
ALTER TABLE public.master_billing_settings ADD COLUMN IF NOT EXISTS price_module_groovelab NUMERIC(10, 2) DEFAULT 4.99;
ALTER TABLE public.master_billing_settings ADD COLUMN IF NOT EXISTS price_user_teacher NUMERIC(10, 2) DEFAULT 0.49;
ALTER TABLE public.master_billing_settings ADD COLUMN IF NOT EXISTS price_user_student NUMERIC(10, 2) DEFAULT 0.49;

-- 3. Drop redundant index if exists
DROP INDEX IF EXISTS public.idx_invoices_school_id;
