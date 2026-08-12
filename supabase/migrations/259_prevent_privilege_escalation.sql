-- Migration 259: Privilege Escalation Prevention
-- Verhindert, dass Schüler/Lehrer ihre eigene Rolle hochsetzen können.

-- ============================================================
-- 1. ROLE CHANGE GUARD — Blockiert nicht-autorisierte Rollenänderungen
-- ============================================================

DROP POLICY IF EXISTS "users_update" ON public.users_raw;

CREATE POLICY "users_update" ON public.users_raw
FOR UPDATE
USING (
    public.is_master_admin()
    OR (
        public.check_school_access(school_id)
        AND (
            public.is_teacher_or_admin()
            OR id = public.get_current_user_id()
        )
    )
)
WITH CHECK (
    public.is_master_admin()
    OR (
        public.check_school_access(school_id)
        AND (
            public.is_teacher_or_admin()
            OR (
                id = public.get_current_user_id()
                AND (
                    public.is_teacher_or_admin()
                    OR role::text NOT IN ('admin')
                )
            )
        )
    )
);

-- ============================================================
-- 2. is_master_admin FLAG PROTECTION via DB Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_master_admin_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Wenn is_master_admin geändert wird UND der aufrufende User kein Master-Admin ist:
    IF OLD.is_master_admin IS DISTINCT FROM NEW.is_master_admin THEN
        IF NOT public.is_master_admin() THEN
            RAISE EXCEPTION 'Unauthorized: is_master_admin flag can only be changed by a Master Admin.';
        END IF;
    END IF;

    -- role-Eskalation zu admin durch Nicht-Admins blockieren
    IF OLD.role IS DISTINCT FROM NEW.role AND NEW.role::text = 'admin' THEN
        IF NOT public.is_master_admin() AND NOT public.is_teacher_or_admin() THEN
            RAISE EXCEPTION 'Unauthorized: role cannot be set to admin by non-admin users.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_master_admin_escalation ON public.users_raw;
CREATE TRIGGER trg_prevent_master_admin_escalation
    BEFORE UPDATE ON public.users_raw
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_master_admin_escalation();

-- ============================================================
-- 3. RATE LIMIT TABLE für QR-Token-Login
-- ============================================================

CREATE TABLE IF NOT EXISTS public.qr_login_rate_limits (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_hash     TEXT NOT NULL,
    attempt_at  TIMESTAMPTZ DEFAULT NOW(),
    success     BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_qr_rate_limits_ip_time
    ON public.qr_login_rate_limits(ip_hash, attempt_at DESC);

ALTER TABLE public.qr_login_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_rate_limit" ON public.qr_login_rate_limits;
CREATE POLICY "anon_insert_rate_limit"
    ON public.qr_login_rate_limits
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "master_admin_read_rate_limits" ON public.qr_login_rate_limits;
CREATE POLICY "master_admin_read_rate_limits"
    ON public.qr_login_rate_limits
    FOR SELECT
    USING (public.is_master_admin());

CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
    DELETE FROM public.qr_login_rate_limits
    WHERE attempt_at < NOW() - INTERVAL '24 hours';
$$;

NOTIFY pgrst, 'reload schema';
