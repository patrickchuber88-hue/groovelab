-- Migration: Security & Performance Hardening
-- 🚀 Optimize User Email Decryption View (Prevents N+1 Sequential Scans)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email_prefixes_user_id ON public.user_email_prefixes(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email_suffixes_user_id ON public.user_email_suffixes(user_id);

-- 🛡️ Secure DML Trigger & Onboarding Functions with explicit search path
ALTER FUNCTION public.handle_users_view_dml() SET search_path = public, pg_catalog, extensions;
ALTER FUNCTION public.complete_onboarding(UUID, TEXT) SET search_path = public, pg_catalog, extensions;
ALTER FUNCTION public.import_student(TEXT, TEXT, TEXT, TEXT, UUID, UUID) SET search_path = public, pg_catalog, extensions;
ALTER FUNCTION public.get_kiosk_school_id() SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_user_school_id() SET search_path = public, pg_catalog;

-- 🛡️ Restore secretary role to administrative status checks
CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
RETURNS BOOLEAN AS $$
DECLARE
    v_role public.user_role;
BEGIN
    v_role := public.get_current_user_role();
    RETURN v_role IN ('teacher', 'admin', 'secretary');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog;
