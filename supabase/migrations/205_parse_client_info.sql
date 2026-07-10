-- 🛡️ Fallback parser for custom parameters inside x-client-info to bypass CORS preflight blocks
-- Updates RLS helper functions get_qr_token, get_current_user_id, and get_kiosk_token

CREATE OR REPLACE FUNCTION public.get_qr_token()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
    v_headers text;
    v_token text;
    v_client_info text;
BEGIN
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN NULL;
    END IF;
    
    -- 1. Try to read the direct header first
    v_token := v_headers::json->>'x-qr-token';
    IF v_token IS NOT NULL AND v_token <> '' THEN
        RETURN v_token;
    END IF;
    
    -- 2. Fallback: Parse from x-client-info
    v_client_info := v_headers::json->>'x-client-info';
    IF v_client_info IS NOT NULL AND v_client_info <> '' THEN
        v_token := substring(v_client_info from ';qr_token=([^;]+)');
        IF v_token IS NOT NULL AND v_token <> '' THEN
            RETURN v_token;
        END IF;
    END IF;
    
    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;


CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
    v_headers text;
    v_user_id text;
    v_client_info text;
BEGIN
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN NULL;
    END IF;
    
    -- 1. Try to read the direct header first
    v_user_id := v_headers::json->>'x-user-id';
    IF v_user_id IS NOT NULL AND v_user_id <> '' THEN
        RETURN v_user_id::uuid;
    END IF;
    
    -- 2. Fallback: Parse from x-client-info
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


CREATE OR REPLACE FUNCTION public.get_kiosk_token()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
    v_headers text;
    v_token text;
    v_client_info text;
BEGIN
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN NULL;
    END IF;
    
    -- 1. Try to read the direct header first
    v_token := v_headers::json->>'x-kiosk-token';
    IF v_token IS NOT NULL AND v_token <> '' THEN
        RETURN v_token::uuid;
    END IF;
    
    -- 2. Fallback: Parse from x-client-info
    v_client_info := v_headers::json->>'x-client-info';
    IF v_client_info IS NOT NULL AND v_client_info <> '' THEN
        v_token := substring(v_client_info from ';kiosk_token=([^;]+)');
        IF v_token IS NOT NULL AND v_token <> '' THEN
            RETURN v_token::uuid;
        END IF;
    END IF;
    
    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;
