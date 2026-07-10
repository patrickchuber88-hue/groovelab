-- 🛡️ Fallback parser for get_user_school_id to support x-client-info parsing fallback

CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'pg_temp'
SET row_security TO 'off'
AS $$
DECLARE
    v_headers text;
    v_user_id text;
    v_school_id uuid;
    v_auth_uid uuid;
    v_client_info text;
BEGIN
    -- Resolve authenticated user first via JWT to prevent header spoofing
    BEGIN
        v_auth_uid := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_auth_uid := NULL;
    END;
                                                                          
    IF v_auth_uid IS NOT NULL THEN
        SELECT school_id INTO v_school_id
        FROM public.users_raw
        WHERE id = v_auth_uid;
        RETURN v_school_id;
    END IF;
                                                                          
    -- Fallback to header for anonymous/kiosk check-in
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN NULL;
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
        RETURN NULL;
    END IF;
                                                                          
    SELECT school_id INTO v_school_id
    FROM public.users_raw
    WHERE id = v_user_id::uuid;
                                                                          
    RETURN v_school_id;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;
