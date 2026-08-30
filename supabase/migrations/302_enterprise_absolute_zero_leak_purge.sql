-- ==============================================================================
-- MIGRATION 302: ENTERPRISE ABSOLUTE ZERO-LEAK RLS PURGE
-- Campus-Groovelab Tier-1 SaaS Enterprise+ Hermetic Isolation
-- ==============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. DROP ALL REMAINING 'true' POLICIES ACROSS ALL PUBLIC TABLES
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND (qual = 'true' OR qual LIKE '%IS NULL%' OR qual LIKE '%OR true%')
          AND policyname NOT IN ('schools_insert', 'audit_logs_insert_scoped')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE 'Dropped insecure policy % on table %', r.policyname, r.tablename;
    END LOOP;
END $$;

-- 2. SECURE SERVER METRICS & MASTER BILLING SETTINGS (Master Admin Only)
ALTER TABLE IF EXISTS public.server_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "server_metrics_admin_only" ON public.server_metrics;
CREATE POLICY "server_metrics_admin_only" ON public.server_metrics
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin())
WITH CHECK (public.is_master_admin());

ALTER TABLE IF EXISTS public.master_billing_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "master_billing_settings_admin_only" ON public.master_billing_settings;
CREATE POLICY "master_billing_settings_admin_only" ON public.master_billing_settings
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin())
WITH CHECK (public.is_master_admin());

-- 3. SECURE CRISIS NOTIFICATIONS
ALTER TABLE IF EXISTS public.crisis_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crisis_notifications_tenant_scoped" ON public.crisis_notifications;
CREATE POLICY "crisis_notifications_tenant_scoped" ON public.crisis_notifications
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (
        public.get_current_authenticated_user_id() IS NOT NULL 
        AND (teacher_id = public.get_current_authenticated_user_id() OR student_id = public.get_current_authenticated_user_id())
    )
)
WITH CHECK (
    public.is_master_admin()
    OR (
        public.get_current_authenticated_user_id() IS NOT NULL 
        AND (teacher_id = public.get_current_authenticated_user_id() OR student_id = public.get_current_authenticated_user_id())
    )
);

-- 4. SECURE EMAIL SHARDS (Encrypted Email Components)
ALTER TABLE IF EXISTS public.email_prefixes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_prefixes_scoped" ON public.email_prefixes;
CREATE POLICY "email_prefixes_scoped" ON public.email_prefixes
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR public.get_current_user_role() IN ('admin', 'secretary'));

ALTER TABLE IF EXISTS public.email_suffixes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_suffixes_scoped" ON public.email_suffixes;
CREATE POLICY "email_suffixes_scoped" ON public.email_suffixes
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR public.get_current_user_role() IN ('admin', 'secretary'));

ALTER TABLE IF EXISTS public.user_email_prefixes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_email_prefixes_scoped" ON public.user_email_prefixes;
CREATE POLICY "user_email_prefixes_scoped" ON public.user_email_prefixes
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR user_id = public.get_current_authenticated_user_id() OR public.get_current_user_role() IN ('admin', 'secretary'));

ALTER TABLE IF EXISTS public.user_email_suffixes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_email_suffixes_scoped" ON public.user_email_suffixes;
CREATE POLICY "user_email_suffixes_scoped" ON public.user_email_suffixes
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR user_id = public.get_current_authenticated_user_id() OR public.get_current_user_role() IN ('admin', 'secretary'));

ALTER TABLE IF EXISTS public.parent_email_prefixes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parent_email_prefixes_scoped" ON public.parent_email_prefixes;
CREATE POLICY "parent_email_prefixes_scoped" ON public.parent_email_prefixes
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR student_id = public.get_current_authenticated_user_id() OR public.get_current_user_role() IN ('admin', 'secretary'));

ALTER TABLE IF EXISTS public.parent_email_suffixes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parent_email_suffixes_scoped" ON public.parent_email_suffixes;
CREATE POLICY "parent_email_suffixes_scoped" ON public.parent_email_suffixes
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR student_id = public.get_current_authenticated_user_id() OR public.get_current_user_role() IN ('admin', 'secretary'));

-- 5. SECURE BANDS & ENSEMBLES (Tenant & Authenticated Scoped)
ALTER TABLE IF EXISTS public.bands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bands_scoped" ON public.bands;
CREATE POLICY "bands_scoped" ON public.bands
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (
        public.get_current_user_school_id() IS NOT NULL 
        AND school_id = public.get_current_user_school_id()
    )
    OR (
        public.get_kiosk_school_id() IS NOT NULL 
        AND school_id = public.get_kiosk_school_id()
    )
);

ALTER TABLE IF EXISTS public.ensembles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ensembles_scoped" ON public.ensembles;
CREATE POLICY "ensembles_scoped" ON public.ensembles
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (
        public.get_current_user_school_id() IS NOT NULL 
        AND school_id = public.get_current_user_school_id()
    )
    OR (
        public.get_kiosk_school_id() IS NOT NULL 
        AND school_id = public.get_kiosk_school_id()
    )
);

-- 6. SECURE LOGS & AUDIT TRAILS (Zero Anonymous Exposure)
ALTER TABLE IF EXISTS public.magic_link_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "magic_link_logs_scoped" ON public.magic_link_logs;
CREATE POLICY "magic_link_logs_scoped" ON public.magic_link_logs
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin());

ALTER TABLE IF EXISTS public.onboarding_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "onboarding_attempts_scoped" ON public.onboarding_attempts;
CREATE POLICY "onboarding_attempts_scoped" ON public.onboarding_attempts
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin());

ALTER TABLE IF EXISTS public.parent_consent_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parent_consent_logs_scoped" ON public.parent_consent_logs;
CREATE POLICY "parent_consent_logs_scoped" ON public.parent_consent_logs
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR student_id = public.get_current_authenticated_user_id() OR public.get_current_user_role() IN ('admin', 'secretary'));

ALTER TABLE IF EXISTS public.dpa_agreements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dpa_agreements_scoped" ON public.dpa_agreements;
CREATE POLICY "dpa_agreements_scoped" ON public.dpa_agreements
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR (public.get_current_user_school_id() IS NOT NULL AND school_id = public.get_current_user_school_id() AND public.get_current_user_role() IN ('admin', 'secretary')));

ALTER TABLE IF EXISTS public.pilot_agreements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pilot_agreements_scoped" ON public.pilot_agreements;
CREATE POLICY "pilot_agreements_scoped" ON public.pilot_agreements
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR (public.get_current_user_school_id() IS NOT NULL AND school_id = public.get_current_user_school_id() AND public.get_current_user_role() IN ('admin', 'secretary')));

ALTER TABLE IF EXISTS public.school_contract_signatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "school_contract_signatures_scoped" ON public.school_contract_signatures;
CREATE POLICY "school_contract_signatures_scoped" ON public.school_contract_signatures
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR (public.get_current_user_school_id() IS NOT NULL AND school_id = public.get_current_user_school_id() AND public.get_current_user_role() IN ('admin', 'secretary')));

-- 7. SECURE NOTIFICATIONS & PUSH SUBSCRIPTIONS
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_scoped" ON public.notifications;
CREATE POLICY "notifications_scoped" ON public.notifications
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR (public.get_current_authenticated_user_id() IS NOT NULL AND user_id = public.get_current_authenticated_user_id()));

ALTER TABLE IF EXISTS public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_subscriptions_scoped" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_scoped" ON public.push_subscriptions
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR (public.get_current_authenticated_user_id() IS NOT NULL AND user_id = public.get_current_authenticated_user_id()));

ALTER TABLE IF EXISTS public.system_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "system_alerts_scoped" ON public.system_alerts;
CREATE POLICY "system_alerts_scoped" ON public.system_alerts
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR public.get_current_authenticated_user_id() IS NOT NULL);

ALTER TABLE IF EXISTS public.teacher_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teacher_invitations_scoped" ON public.teacher_invitations;
CREATE POLICY "teacher_invitations_scoped" ON public.teacher_invitations
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR (public.get_current_user_school_id() IS NOT NULL AND school_id = public.get_current_user_school_id() AND public.get_current_user_role() IN ('admin', 'secretary')));

-- 8. SECURE STUDENT DATA & STATS
ALTER TABLE IF EXISTS public.student_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_tasks_scoped" ON public.student_tasks;
CREATE POLICY "student_tasks_scoped" ON public.student_tasks
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR (public.get_current_authenticated_user_id() IS NOT NULL AND student_id = public.get_current_authenticated_user_id()));

ALTER TABLE IF EXISTS public.student_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_stats_scoped" ON public.student_stats;
CREATE POLICY "student_stats_scoped" ON public.student_stats
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR (public.get_current_authenticated_user_id() IS NOT NULL AND student_id = public.get_current_authenticated_user_id()));

ALTER TABLE IF EXISTS public.student_cascades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_cascades_scoped" ON public.student_cascades;
CREATE POLICY "student_cascades_scoped" ON public.student_cascades
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR (public.get_current_authenticated_user_id() IS NOT NULL AND teacher_id = public.get_current_authenticated_user_id()) OR (public.get_current_user_school_id() IS NOT NULL AND school_id = public.get_current_user_school_id() AND public.get_current_user_role() IN ('teacher', 'admin', 'secretary')));

ALTER TABLE IF EXISTS public.student_onboarding_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_onboarding_tokens_scoped" ON public.student_onboarding_tokens;
CREATE POLICY "student_onboarding_tokens_scoped" ON public.student_onboarding_tokens
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR (public.get_current_authenticated_user_id() IS NOT NULL AND student_id = public.get_current_authenticated_user_id()));

ALTER TABLE IF EXISTS public.fokus_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fokus_logs_scoped" ON public.fokus_logs;
CREATE POLICY "fokus_logs_scoped" ON public.fokus_logs
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR (public.get_current_authenticated_user_id() IS NOT NULL AND user_id = public.get_current_authenticated_user_id()));

ALTER TABLE IF EXISTS public.user_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_progress_scoped" ON public.user_progress;
CREATE POLICY "user_progress_scoped" ON public.user_progress
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR (public.get_current_authenticated_user_id() IS NOT NULL AND user_id = public.get_current_authenticated_user_id()));

ALTER TABLE IF EXISTS public.user_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_availability_scoped" ON public.user_availability;
CREATE POLICY "user_availability_scoped" ON public.user_availability
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR (public.get_current_authenticated_user_id() IS NOT NULL AND user_id = public.get_current_authenticated_user_id()));

ALTER TABLE IF EXISTS public.user_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_devices_scoped" ON public.user_devices;
CREATE POLICY "user_devices_scoped" ON public.user_devices
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR (public.get_current_authenticated_user_id() IS NOT NULL AND user_id = public.get_current_authenticated_user_id()));

ALTER TABLE IF EXISTS public.user_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_credentials_scoped" ON public.user_credentials;
CREATE POLICY "user_credentials_scoped" ON public.user_credentials
FOR ALL TO authenticated, anon, service_role
USING (public.is_master_admin() OR (public.get_current_authenticated_user_id() IS NOT NULL AND user_id = public.get_current_authenticated_user_id()));

-- Reload schema
NOTIFY pgrst, 'reload schema';
