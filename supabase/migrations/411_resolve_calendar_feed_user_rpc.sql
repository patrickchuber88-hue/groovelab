-- ==============================================================================
-- MIGRATION 411: RESOLVE CALENDAR FEED USER RPC (OWASP ASVS LEVEL 3 GOLDSTANDARD)
-- ==============================================================================
-- Eliminates direct PostgREST table queries to users_raw in Deno Edge Functions.
-- Exposes minimal GDPR-compliant data necessary for iCal calendar generation.

CREATE OR REPLACE FUNCTION public.resolve_calendar_feed_user(
    p_calendar_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_user RECORD;
    v_clean_token TEXT;
BEGIN
    IF p_calendar_token IS NULL OR length(trim(p_calendar_token)) < 16 THEN
        RETURN NULL;
    END IF;

    v_clean_token := trim(p_calendar_token);

    -- Strictly lookup in users_raw by calendar_token (Zero-Credential-Leakage)
    SELECT 
        id,
        school_id,
        role,
        first_name,
        last_name,
        instrument
    INTO v_user
    FROM public.users_raw
    WHERE calendar_token = v_clean_token
    LIMIT 1;

    IF v_user.id IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'id', v_user.id,
        'school_id', v_user.school_id,
        'role', v_user.role,
        'first_name', v_user.first_name,
        'last_name', v_user.last_name,
        'instrument', v_user.instrument
    );
END;
$$;

-- Grant execution permissions
REVOKE ALL ON FUNCTION public.resolve_calendar_feed_user(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_calendar_feed_user(TEXT) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.resolve_calendar_feed_user(TEXT) IS 
'Authoritative RPC for resolving iCal calendar feed token without exposing users_raw or credentials.';
