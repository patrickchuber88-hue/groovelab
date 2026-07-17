-- Migration: 232_transaction_cache_rls.sql
-- Optimiert get_user_school_id und is_master_admin mittels Transaktions-Level-Caching (set_config),
-- um N+1-Abfragen in den RLS-Policies pro Request vollständig zu eliminieren.

CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'pg_temp'
SET row_security TO 'off'
AS $$
DECLARE
    v_cached text;
    v_headers text;
    v_user_id text;
    v_school_id uuid;
    v_auth_uid uuid;
    v_client_info text;
BEGIN
    -- 1. Transaktions-Cache prüfen
    v_cached := current_setting('app.current_user_school_id', true);
    IF v_cached IS NOT NULL AND v_cached <> '' THEN
        IF v_cached = 'null' THEN
            RETURN NULL;
        ELSE
            RETURN v_cached::uuid;
        END IF;
    END IF;

    -- 2. Authentifizierten User über JWT ermitteln (Schutz vor Header-Spoofing)
    BEGIN
        v_auth_uid := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_auth_uid := NULL;
    END;
                                                                          
    IF v_auth_uid IS NOT NULL THEN
        SELECT school_id INTO v_school_id
        FROM public.users_raw
        WHERE id = v_auth_uid;
        
        -- Wert im Transaktions-Cache ablegen
        PERFORM set_config('app.current_user_school_id', COALESCE(v_school_id::text, 'null'), true);
        RETURN v_school_id;
    END IF;
                                                                          
    -- 3. Fallback auf Header für Kiosk/Anonyme Tests
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        PERFORM set_config('app.current_user_school_id', 'null', true);
        RETURN NULL;
    END IF;
    
    -- Versuchen, x-user-id direkt zu lesen
    v_user_id := v_headers::json->>'x-user-id';
    
    -- Fallback: Aus x-client-info parsen
    IF v_user_id IS NULL OR v_user_id = '' THEN
        v_client_info := v_headers::json->>'x-client-info';
        IF v_client_info IS NOT NULL AND v_client_info <> '' THEN
            v_user_id := substring(v_client_info from ';user_id=([^;]+)');
        END IF;
    END IF;
    
    IF v_user_id IS NULL OR v_user_id = '' THEN
        PERFORM set_config('app.current_user_school_id', 'null', true);
        RETURN NULL;
    END IF;
                                                                          
    SELECT school_id INTO v_school_id
    FROM public.users_raw
    WHERE id = v_user_id::uuid;
                                                                          
    PERFORM set_config('app.current_user_school_id', COALESCE(v_school_id::text, 'null'), true);
    RETURN v_school_id;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;


CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'pg_temp'
SET row_security TO 'off'
AS $$
DECLARE
    v_cached text;
    v_headers text;
    v_user_id text;
    v_is_master boolean;
    v_client_info text;
BEGIN
    -- 1. Transaktions-Cache prüfen
    v_cached := current_setting('app.is_master_admin', true);
    IF v_cached IS NOT NULL AND v_cached <> '' THEN
        RETURN v_cached = 'true';
    END IF;

    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        PERFORM set_config('app.is_master_admin', 'false', true);
        RETURN false;
    END IF;
    
    -- Versuchen, x-user-id direkt zu lesen
    v_user_id := v_headers::json->>'x-user-id';
    
    -- Fallback: Aus x-client-info parsen
    IF v_user_id IS NULL OR v_user_id = '' THEN
        v_client_info := v_headers::json->>'x-client-info';
        IF v_client_info IS NOT NULL AND v_client_info <> '' THEN
            v_user_id := substring(v_client_info from ';user_id=([^;]+)');
        END IF;
    END IF;
    
    IF v_user_id IS NULL OR v_user_id = '' THEN
        PERFORM set_config('app.is_master_admin', 'false', true);
        RETURN false;
    END IF;
                                                           
    SELECT is_master_admin INTO v_is_master
    FROM public.users_raw
    WHERE id = v_user_id::uuid;
                                                           
    v_is_master := COALESCE(v_is_master, false);
    PERFORM set_config('app.is_master_admin', CASE WHEN v_is_master THEN 'true' ELSE 'false' END, true);
    RETURN v_is_master;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;
