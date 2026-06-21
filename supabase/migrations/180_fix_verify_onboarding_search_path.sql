-- Migration: Fix verify_onboarding search path to resolve pgcrypto extensions
ALTER FUNCTION public.verify_onboarding(TEXT, TEXT, TEXT, INT) SET search_path = public, pg_catalog, extensions;

-- Schema cache reload
NOTIFY pgrst, 'reload schema';
