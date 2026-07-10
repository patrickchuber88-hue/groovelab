-- 🛡️ Fallback parser for is_master_admin to support x-client-info parsing fallback

CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET row_security TO 'off'
AS $$
DECLARE
    v_headers text;
    v_user_id text;
    v_is_master boolean;
    v_client_info text;
BEGIN
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN false;
    END IF;
    
    -- 1. Try direct header
    v_user_id := v_headers::json->>'x-user-id';
    
    -- 2. Fallback to x-client-info parsing
    IF v_user_id IS NULL OR v_user_id = '' THEN
        v_client_info := v_headers::json->>'x-client-info';
        IF v_client_info IS NOT NULL AND v_client_info <> '' THEN
            v_user_id := substring(v_client_info from ';user_id=([^;]+)');
        END IF;
    END IF;
    
    IF v_user_id IS NULL OR v_user_id = '' THEN
        RETURN false;
    END IF;
                                                           
    SELECT is_master_admin INTO v_is_master
    FROM public.users_raw
    WHERE id = v_user_id::uuid;
                                                           
    RETURN COALESCE(v_is_master, false);
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;
