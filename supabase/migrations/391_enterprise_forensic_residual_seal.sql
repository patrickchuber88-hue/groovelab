-- ==============================================================================
-- 🏛️ MIGRATION 391: ENTERPRISE FORENSIC RESIDUAL SEAL
-- Standard: OWASP ASVS Level 3 / DSGVO Art. 25, 32 / CIS PostgreSQL Benchmark 6.2
-- Remediates Findings 11 & 12 of the Comprehensive Forensic IT Audit:
-- 1. Finding 11: Cross-Tenant Multi-Tenancy Metric Leakage in active_licence_metrics & school_user_statistics
-- 2. Finding 12: Missing search_path on 15 remaining SECURITY DEFINER functions
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REMEDIATE FINDING 11: MULTI-TENANCY VIEW ISOLATION (METRIC VIEWS)
-- ------------------------------------------------------------------------------

-- A. SCHOOL_USER_STATISTICS
CREATE OR REPLACE VIEW public.school_user_statistics
WITH (security_barrier = true, security_invoker = true) AS
SELECT 
    users_raw.school_id,
    (count(
        CASE
            WHEN (users_raw.role = ANY (ARRAY['teacher'::user_role, 'admin'::user_role])) THEN 1
            ELSE NULL::integer
        END))::integer AS teachers,
    (count(
        CASE
            WHEN (users_raw.role = 'student'::user_role) THEN 1
            ELSE NULL::integer
        END))::integer AS students,
    (count(
        CASE
            WHEN ((users_raw.role = ANY (ARRAY['teacher'::user_role, 'admin'::user_role])) AND users_raw.is_campus_active) THEN 1
            ELSE NULL::integer
        END))::integer AS teachers_campus,
    (count(
        CASE
            WHEN ((users_raw.role = ANY (ARRAY['teacher'::user_role, 'admin'::user_role])) AND users_raw.is_groovelab_active) THEN 1
            ELSE NULL::integer
        END))::integer AS teachers_groovelab,
    (count(
        CASE
            WHEN ((users_raw.role = 'student'::user_role) AND users_raw.is_campus_active) THEN 1
            ELSE NULL::integer
        END))::integer AS students_campus,
    (count(
        CASE
            WHEN ((users_raw.role = 'student'::user_role) AND users_raw.is_groovelab_active) THEN 1
            ELSE NULL::integer
        END))::integer AS students_groovelab
FROM public.users_raw
WHERE (
    public.is_master_admin() 
    OR (
        public.get_current_user_school_id() IS NOT NULL 
        AND users_raw.school_id = public.get_current_user_school_id()
        AND public.get_current_user_role() IN ('admin', 'secretary')
    )
)
GROUP BY users_raw.school_id;

REVOKE ALL ON public.school_user_statistics FROM anon;
GRANT SELECT ON public.school_user_statistics TO authenticated, service_role;
COMMENT ON VIEW public.school_user_statistics IS 'Tier-1 Enterprise+ multi-tenant protected view for school user aggregates.';

-- B. ACTIVE_LICENCE_METRICS
CREATE OR REPLACE VIEW public.active_licence_metrics
WITH (security_barrier = true, security_invoker = true) AS
SELECT 
    users_raw.school_id,
    count(
        CASE
            WHEN ((users_raw.is_app_user = true) AND (users_raw.is_campus_active = true) AND (users_raw.role = 'student'::user_role)) THEN 1
            ELSE NULL::integer
        END) AS active_campus_users,
    count(
        CASE
            WHEN ((users_raw.is_app_user = true) AND (users_raw.is_groovelab_active = true) AND (users_raw.role = 'student'::user_role)) THEN 1
            ELSE NULL::integer
        END) AS active_groovelab_users,
    count(
        CASE
            WHEN ((users_raw.is_active = true) AND (users_raw.role = ANY (ARRAY['teacher'::user_role, 'admin'::user_role, 'secretary'::user_role]))) THEN 1
            ELSE NULL::integer
        END) AS active_staff_users,
    ((count(
        CASE
            WHEN ((users_raw.is_active = true) AND (users_raw.role = ANY (ARRAY['teacher'::user_role, 'admin'::user_role, 'secretary'::user_role]))) THEN 1
            ELSE NULL::integer
        END))::numeric * 0.49) AS staff_service_fee,
    count(
        CASE
            WHEN ((users_raw.is_app_user = true) AND ((users_raw.is_campus_active = true) OR (users_raw.is_groovelab_active = true))) THEN 1
            ELSE NULL::integer
        END) AS total_billable_app_users
FROM public.users_raw
WHERE (
    public.is_master_admin() 
    OR (
        public.get_current_user_school_id() IS NOT NULL 
        AND users_raw.school_id = public.get_current_user_school_id()
        AND public.get_current_user_role() IN ('admin', 'secretary')
    )
)
GROUP BY users_raw.school_id;

REVOKE ALL ON public.active_licence_metrics FROM anon;
GRANT SELECT ON public.active_licence_metrics TO authenticated, service_role;
COMMENT ON VIEW public.active_licence_metrics IS 'Tier-1 Enterprise+ multi-tenant protected view for school billing and license metrics.';

-- ------------------------------------------------------------------------------
-- 2. REMEDIATE FINDING 12: PIN SEARCH_PATH ON 15 REMAINING SECURITY DEFINER FUNCTIONS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'assign_default_avatar' AND pronargs = 0) THEN
        ALTER FUNCTION public.assign_default_avatar() SET search_path = public, pg_temp, extensions;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_school_id' AND pronargs = 0) THEN
        ALTER FUNCTION public.current_school_id() SET search_path = public, pg_temp, extensions;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_school_cascade' AND pronargs = 1) THEN
        ALTER FUNCTION public.delete_school_cascade(uuid) SET search_path = public, pg_temp, extensions;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_unique_ausweis_id' AND pronargs = 0) THEN
        ALTER FUNCTION public.generate_unique_ausweis_id() SET search_path = public, pg_temp, extensions;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_active_subjects' AND pronargs = 1) THEN
        ALTER FUNCTION public.get_active_subjects(uuid) SET search_path = public, pg_temp, extensions;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_active_subjects' AND pronargs = 0) THEN
        ALTER FUNCTION public.get_active_subjects() SET search_path = public, pg_temp, extensions;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_users_raw_insert_after' AND pronargs = 0) THEN
        ALTER FUNCTION public.handle_users_raw_insert_after() SET search_path = public, pg_temp, extensions;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_audit_log' AND pronargs = 0) THEN
        ALTER FUNCTION public.process_audit_log() SET search_path = public, pg_temp, extensions;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'request_magic_link' AND pronargs = 1) THEN
        ALTER FUNCTION public.request_magic_link(text) SET search_path = public, pg_temp, extensions;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'reset_expired_streaks' AND pronargs = 0) THEN
        ALTER FUNCTION public.reset_expired_streaks() SET search_path = public, pg_temp, extensions;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'save_schedule_preferences' AND pronargs = 2) THEN
        ALTER FUNCTION public.save_schedule_preferences(uuid, jsonb) SET search_path = public, pg_temp, extensions;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'seed_default_subjects' AND pronargs = 0) THEN
        ALTER FUNCTION public.seed_default_subjects() SET search_path = public, pg_temp, extensions;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'seed_default_subjects' AND pronargs = 1) THEN
        ALTER FUNCTION public.seed_default_subjects(uuid) SET search_path = public, pg_temp, extensions;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_user_activation_date' AND pronargs = 0) THEN
        ALTER FUNCTION public.set_user_activation_date() SET search_path = public, pg_temp, extensions;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trigger_push_on_new_class_feed_post' AND pronargs = 0) THEN
        ALTER FUNCTION public.trigger_push_on_new_class_feed_post() SET search_path = public, pg_temp, extensions;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trigger_push_on_schedule_change' AND pronargs = 0) THEN
        ALTER FUNCTION public.trigger_push_on_schedule_change() SET search_path = public, pg_temp, extensions;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
