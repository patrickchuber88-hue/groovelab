-- ==============================================================================
-- MIGRATION 305: ENTERPRISE IDEMPOTENCY VAULT & RFC 7807 ERROR SUPPORT
-- Campus-Groovelab Tier-1 SaaS Enterprise+ Mutation Reliability
-- ==============================================================================

-- 1. ISOLATED IDEMPOTENCY KEY VAULT
CREATE TABLE IF NOT EXISTS private_auth.idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT NOT NULL UNIQUE,
    user_id UUID,
    school_id UUID,
    endpoint TEXT NOT NULL,
    request_hash TEXT,
    response_payload JSONB,
    status_code INTEGER DEFAULT 200,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_lookup 
ON private_auth.idempotency_keys(idempotency_key, endpoint);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires 
ON private_auth.idempotency_keys(expires_at);

-- 2. IDEMPOTENCY CHECK & ACQUIRE RPC
CREATE OR REPLACE FUNCTION public.acquire_idempotency_lock(
    p_key TEXT,
    p_endpoint TEXT,
    p_request_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_catalog
AS $$
DECLARE
    v_user_id UUID := public.get_current_authenticated_user_id();
    v_school_id UUID := public.get_current_user_school_id();
    v_existing RECORD;
BEGIN
    IF p_key IS NULL OR TRIM(p_key) = '' THEN
        RETURN jsonb_build_object('status', 'proceed', 'is_cached', false);
    END IF;

    -- Cleanup expired keys
    DELETE FROM private_auth.idempotency_keys WHERE expires_at < NOW();

    -- Check if key already exists
    SELECT * INTO v_existing 
    FROM private_auth.idempotency_keys 
    WHERE idempotency_key = TRIM(p_key) AND endpoint = TRIM(p_endpoint)
    LIMIT 1;

    IF v_existing.id IS NOT NULL THEN
        -- If response is already stored, return cached payload
        IF v_existing.response_payload IS NOT NULL THEN
            RETURN jsonb_build_object(
                'status', 'completed',
                'is_cached', true,
                'status_code', v_existing.status_code,
                'response', v_existing.response_payload
            );
        ELSE
            -- Request is currently in-flight
            RETURN jsonb_build_object(
                'status', 'in_flight',
                'is_cached', false,
                'message', 'Request currently being processed'
            );
        END IF;
    END IF;

    -- Insert lock record
    INSERT INTO private_auth.idempotency_keys (
        idempotency_key,
        user_id,
        school_id,
        endpoint,
        request_hash,
        created_at,
        expires_at
    ) VALUES (
        TRIM(p_key),
        v_user_id,
        v_school_id,
        TRIM(p_endpoint),
        p_request_hash,
        NOW(),
        NOW() + INTERVAL '24 hours'
    );

    RETURN jsonb_build_object('status', 'proceed', 'is_cached', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.acquire_idempotency_lock(TEXT, TEXT, TEXT) TO authenticated, anon, service_role;

-- 3. STORE IDEMPOTENT RESPONSE RPC
CREATE OR REPLACE FUNCTION public.save_idempotent_response(
    p_key TEXT,
    p_endpoint TEXT,
    p_response JSONB,
    p_status_code INTEGER DEFAULT 200
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_catalog
AS $$
BEGIN
    IF p_key IS NULL OR TRIM(p_key) = '' THEN
        RETURN FALSE;
    END IF;

    UPDATE private_auth.idempotency_keys
    SET response_payload = p_response,
        status_code = p_status_code
    WHERE idempotency_key = TRIM(p_key) AND endpoint = TRIM(p_endpoint);

    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_idempotent_response(TEXT, TEXT, JSONB, INTEGER) TO authenticated, anon, service_role;

-- 4. RFC 7807 STRUCTURED ERROR BUILDER FUNCTION
CREATE OR REPLACE FUNCTION public.build_rfc7807_error(
    p_type TEXT,
    p_title TEXT,
    p_status INTEGER,
    p_detail TEXT,
    p_code TEXT,
    p_instance TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN jsonb_build_object(
        'type', COALESCE(p_type, 'about:blank'),
        'title', p_title,
        'status', p_status,
        'detail', p_detail,
        'code', p_code,
        'instance', p_instance,
        'timestamp', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.build_rfc7807_error(TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT) TO authenticated, anon, service_role;

-- Reload Schema
NOTIFY pgrst, 'reload schema';
