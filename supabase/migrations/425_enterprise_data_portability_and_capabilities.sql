-- ==============================================================================
-- Migration 425: Enterprise Data Portability, Matrix Capabilities & Retention
-- Standards: OWASP ASVS Level 3 / DSGVO Art. 17 & 20 / BSI IT-Grundschutz
--
-- 1. PUNKT 26: Matrix-basierte Capabilities (role_capabilities & has_capability)
-- 2. PUNKT 49: DSGVO Art. 20 Datenübertragbarkeits-Export (request_gdpr_data_export)
-- 3. PUNKT 50: Fristenkonformes automatisiertes Shreddern (purge_expired_retention_records)
-- 4. PUNKT 91: Forensisches Alerting bei Brute-Force-Anomalien
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PUNKT 26: MATRIX-BASIERTE CAPABILITIES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_capabilities (
    role text NOT NULL,
    capability text NOT NULL,
    description text,
    created_at timestamptz DEFAULT NOW(),
    PRIMARY KEY (role, capability)
);

ALTER TABLE public.role_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_capabilities FORCE ROW LEVEL SECURITY;

-- Everyone authenticated can read capabilities (needed for client permission queries)
DROP POLICY IF EXISTS "role_capabilities_read_policy" ON public.role_capabilities;
CREATE POLICY "role_capabilities_read_policy" ON public.role_capabilities
    FOR SELECT TO authenticated
    USING (true);

-- Only master_admin can modify capabilities
DROP POLICY IF EXISTS "role_capabilities_modify_policy" ON public.role_capabilities;
CREATE POLICY "role_capabilities_modify_policy" ON public.role_capabilities
    FOR ALL TO authenticated
    USING (public.is_master_admin())
    WITH CHECK (public.is_master_admin());

-- Seed baseline capabilities
INSERT INTO public.role_capabilities (role, capability, description)
VALUES
    ('admin', 'can_manage_school_settings', 'Schulstammdaten und Semester konfigurieren'),
    ('admin', 'can_manage_teachers', 'Lehrkräfte anlegen und bearbeiten'),
    ('admin', 'can_manage_billing', 'Schulgebühren und Rechnungen verwalten'),
    ('admin', 'can_view_all_chats', 'Schulweite Ankündigungskanäle verwalten'),
    ('secretary', 'can_manage_students_enrollment', 'Schülerstammdaten und Verträge pflegen'),
    ('secretary', 'can_view_rooms_and_schedules', 'Raumbelegungen einsehen und koordinieren'),
    ('secretary', 'can_export_csv_rosters', 'Schülerlisten exportieren'),
    ('teacher', 'can_grade_students', 'Noten und Leistungsfeedback erfassen'),
    ('teacher', 'can_chat_with_students', 'Didaktischer Einzel- und Gruppenchat'),
    ('teacher', 'can_manage_homework', 'Hausaufgaben und Übeempfehlungen zuweisen'),
    ('student', 'can_record_practice_audio', 'Übeaufnahmen im GrooveLab anfertigen'),
    ('student', 'can_view_own_progress', 'Eigene Fortschrittsmatrix einsehen'),
    ('parent', 'can_manage_parental_controls', 'PIN-gesicherte Elterneinstellungen verwalten')
ON CONFLICT (role, capability) DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_capability(p_capability text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role text := public.get_current_user_role();
BEGIN
    IF v_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Master Admin implicitly holds all capabilities
    IF public.is_master_admin() THEN
        RETURN TRUE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.role_capabilities
        WHERE role = v_role AND capability = p_capability
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. PUNKT 49: DSGVO ART. 20 DATENÜBERTRAGBARKEITS-EXPORT
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_gdpr_data_export(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_auth_uid uuid := public.get_current_authenticated_user_id();
    v_user_role text := public.get_current_user_role();
    v_school_id uuid := public.get_current_user_school_id();
    v_target_student record;
    v_lessons jsonb;
    v_progress jsonb;
    v_missions jsonb;
    v_assets jsonb;
    v_export_payload jsonb;
BEGIN
    IF v_auth_uid IS NULL THEN
        RAISE EXCEPTION 'Unautorisierter Zugriff: Bitte einloggen.';
    END IF;

    -- Student can export own data; Admin/Master can export for compliance
    IF NOT (v_auth_uid = p_student_id OR v_user_role IN ('admin', 'secretary') OR public.is_master_admin()) THEN
        RAISE EXCEPTION 'Zugriff verweigert: Sie dürfen nur Ihre eigenen Daten exportieren.';
    END IF;

    -- Retrieve sanitized student identity
    SELECT id, school_id, first_name, last_name, instrument, created_at, campus_ui_level
    INTO v_target_student
    FROM public.users_raw
    WHERE id = p_student_id;

    IF v_target_student.id IS NULL THEN
        RAISE EXCEPTION 'Schülerprofil wurde nicht gefunden.';
    END IF;

    -- Aggregate Lessons
    SELECT COALESCE(jsonb_agg(to_jsonb(l)), '[]'::jsonb) INTO v_lessons
    FROM (
        SELECT id, scheduled_start, scheduled_end, status, notes
        FROM public.lessons
        WHERE student_id = p_student_id
        ORDER BY scheduled_start DESC
    ) l;

    -- Aggregate Progress Matrix
    SELECT COALESCE(jsonb_agg(to_jsonb(p)), '[]'::jsonb) INTO v_progress
    FROM (
        SELECT id, skill_name, category, level, updated_at
        FROM public.progress_matrix
        WHERE student_id = p_student_id
    ) p;

    -- Aggregate Student Missions & Badges
    SELECT COALESCE(jsonb_agg(to_jsonb(m)), '[]'::jsonb) INTO v_missions
    FROM (
        SELECT id, mission_id, status, points_awarded, completed_at
        FROM public.student_missions
        WHERE student_id = p_student_id
    ) m;

    -- Aggregate Storage Asset References (Private paths)
    IF to_regclass('storage.objects') IS NOT NULL THEN
        SELECT COALESCE(jsonb_agg(to_jsonb(a)), '[]'::jsonb) INTO v_assets
        FROM (
            SELECT name, bucket_id, created_at, (metadata->>'size')::bigint as size_bytes
            FROM storage.objects
            WHERE (storage.foldername(name))[1] = p_student_id::text
        ) a;
    ELSE
        v_assets := '[]'::jsonb;
    END IF;

    v_export_payload := jsonb_build_object(
        'standard', 'DSGVO Art. 20 / Portability Export',
        'generated_at', NOW(),
        'student_profile', to_jsonb(v_target_student),
        'lessons', v_lessons,
        'progress_matrix', v_progress,
        'missions_and_badges', v_missions,
        'stored_assets', v_assets
    );

    -- Log compliance export in audit_logs
    IF to_regclass('public.audit_logs') IS NOT NULL THEN
        INSERT INTO public.audit_logs (actor_id, school_id, action, target_entity, new_values)
        VALUES (v_auth_uid, v_target_student.school_id, 'GDPR_DATA_EXPORT_REQUESTED', 'users_raw:' || p_student_id::text, jsonb_build_object('student_id', p_student_id));
    END IF;

    RETURN v_export_payload;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. PUNKT 50: FRISTENKONFORMES AUTOMATISIERTES SHREDDERN
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_expired_retention_records()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_purged_rate_limits int := 0;
    v_purged_expired_leases int := 0;
BEGIN
    IF NOT (public.is_master_admin() OR current_user IN ('postgres', 'service_role')) THEN
        RAISE EXCEPTION 'Nur Superuser / Master-Admin dürfen die DSGVO-Fristenbereinigung anstoßen.';
    END IF;

    -- 1. Purge rate limit IP tracking older than 14 days (DSGVO Datensparsamkeit)
    IF to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        DELETE FROM public.qr_login_rate_limits
        WHERE attempted_at < (NOW() - INTERVAL '14 days');
        GET DIAGNOSTICS v_purged_rate_limits = ROW_COUNT;
    END IF;

    -- 2. Purge revoked or orphaned session leases older than 60 days
    IF to_regclass('public.session_leases') IS NOT NULL THEN
        DELETE FROM public.session_leases
        WHERE is_revoked = true AND last_active_at < (NOW() - INTERVAL '60 days');
        GET DIAGNOSTICS v_purged_expired_leases = ROW_COUNT;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'purged_rate_limit_rows', v_purged_rate_limits,
        'purged_stale_leases', v_purged_expired_leases,
        'executed_at', NOW()
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. PUNKT 91: FORENSISCHES ALERTING BEI BRUTE-FORCE ANOMALIEN
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_detect_login_anomaly()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_recent_failures int;
BEGIN
    -- Check if this IP has suffered more than 5 consecutive failures in the last 5 minutes
    SELECT COUNT(*) INTO v_recent_failures
    FROM public.qr_login_rate_limits
    WHERE ip_hash = NEW.ip_hash
      AND attempted_at > (NOW() - INTERVAL '5 minutes');

    IF v_recent_failures >= 5 THEN
        -- Write immediate priority security incident to audit_logs
        IF to_regclass('public.audit_logs') IS NOT NULL THEN
            INSERT INTO public.audit_logs (
                action,
                school_id,
                target_entity,
                new_values
            ) VALUES (
                'SECURITY_INCIDENT_BRUTE_FORCE_BURST',
                NEW.school_id,
                'network_ip:' || COALESCE(NEW.ip_hash, 'UNKNOWN'),
                jsonb_build_object(
                    'incident_level', 'CRITICAL',
                    'recent_failures_count', v_recent_failures,
                    'timestamp', NOW()
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_alert_login_anomalies ON public.qr_login_rate_limits;
        CREATE TRIGGER trg_alert_login_anomalies
            AFTER INSERT ON public.qr_login_rate_limits
            FOR EACH ROW
            EXECUTE FUNCTION public.trg_detect_login_anomaly();
    END IF;
END;
$$;
