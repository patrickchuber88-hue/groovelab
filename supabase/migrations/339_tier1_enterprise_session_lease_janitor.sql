-- ==============================================================================
-- Migration 339: Tier-1 Enterprise Session Lease & Challenge Janitor
-- Standard: OWASP ASVS Level 3 / Data Minimization / Hygiene
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_session_leases_and_challenges()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_catalog
AS $$
DECLARE
    v_deleted_challenges INT := 0;
    v_deleted_leases INT := 0;
    v_revoked_ghosts INT := 0;
BEGIN
    -- 1. Purge expired WebAuthn challenges
    DELETE FROM private_auth.webauthn_challenges
    WHERE expires_at < NOW();
    GET DIAGNOSTICS v_deleted_challenges = ROW_COUNT;

    -- 2. Revoke expired Support Ghost session leases (> 2 hours old)
    UPDATE public.session_leases
    SET is_revoked = TRUE
    WHERE device_key LIKE 'support_ghost_%'
      AND created_at < NOW() - INTERVAL '2 hours'
      AND is_revoked = FALSE;
    GET DIAGNOSTICS v_revoked_ghosts = ROW_COUNT;

    -- 3. Purge inactive session leases older than 60 days
    DELETE FROM public.session_leases
    WHERE last_active_at < NOW() - INTERVAL '60 days'
       OR (is_revoked = TRUE AND last_active_at < NOW() - INTERVAL '7 days');
    GET DIAGNOSTICS v_deleted_leases = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'purged_challenges', v_deleted_challenges,
        'revoked_ghost_sessions', v_revoked_ghosts,
        'purged_stale_leases', v_deleted_leases,
        'executed_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_session_leases_and_challenges() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
