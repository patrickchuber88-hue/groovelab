-- ==============================================================================
-- Migration 317: Ensure get_encryption_key() execute privilege for users view
-- Standard: PostgREST View Integration & Zero-Knowledge Architecture
-- ==============================================================================

GRANT EXECUTE ON FUNCTION public.get_encryption_key() TO anon, authenticated, service_role;
