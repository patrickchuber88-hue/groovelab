-- ==============================================================================
-- Migration 451: Enterprise Student Soft-Delete, 30-Day Recycle Bin & Session Leases
-- Standard: OWASP ASVS L3 / DIN 66398 / GDPR Privacy by Design
-- ==============================================================================

-- 1. Add deleted_at columns for reversible soft-deletes
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.users_raw 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON public.students(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_raw_deleted_at ON public.users_raw(deleted_at);

-- 2. Authoritative RPC: soft_delete_student
CREATE OR REPLACE FUNCTION public.soft_delete_student(
    p_student_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_school_id UUID;
    v_caller_role TEXT := public.get_current_user_role();
    v_caller_school_id UUID := public.current_school_id();
    v_user_id UUID;
    v_first_name TEXT;
    v_last_name TEXT;
BEGIN
    -- Check caller permissions
    IF NOT (public.is_master_admin() OR v_caller_role IN ('admin', 'secretary')) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Keine administrative Berechtigung zum Verschieben in den Papierkorb.');
    END IF;

    -- Lookup student
    SELECT school_id, user_id, first_name, last_name 
    INTO v_school_id, v_user_id, v_first_name, v_last_name
    FROM public.students 
    WHERE id = p_student_id;

    IF v_school_id IS NULL THEN
        -- Check if student ID corresponds to users_raw directly
        SELECT school_id, id, first_name, last_name
        INTO v_school_id, v_user_id, v_first_name, v_last_name
        FROM public.users_raw
        WHERE id = p_student_id AND role = 'student';
    END IF;

    IF v_school_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Schülerprofil nicht gefunden.');
    END IF;

    -- Tenant separation check
    IF NOT (public.is_master_admin() OR v_caller_school_id = v_school_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Zugriff verweigert: Mandantentrennung verletzt.');
    END IF;

    -- Perform soft-delete
    UPDATE public.students
    SET deleted_at = NOW()
    WHERE id = p_student_id OR user_id = p_student_id;

    IF v_user_id IS NOT NULL THEN
        UPDATE public.users_raw
        SET deleted_at = NOW()
        WHERE id = v_user_id;
    END IF;

    -- Revoke all active sessions of this student
    UPDATE public.session_leases
    SET is_revoked = TRUE,
        revoked_at = NOW()
    WHERE (user_id = v_user_id OR user_id = p_student_id) AND is_revoked = FALSE;

    -- Audit log
    INSERT INTO public.audit_logs (
        school_id, user_id, action, details
    ) VALUES (
        v_school_id,
        public.get_current_user_id(),
        'STUDENT_MOVED_TO_RECYCLE_BIN',
        jsonb_build_object(
            'student_id', p_student_id,
            'student_name', v_first_name || ' ' || COALESCE(substring(v_last_name from 1 for 1) || '.', ''),
            'timestamp', NOW()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'student_id', p_student_id,
        'message', 'Schüler wurde in den 30-Tage-Papierkorb verschoben.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_student(UUID) TO authenticated, anon, service_role;

-- 3. Authoritative RPC: restore_student
CREATE OR REPLACE FUNCTION public.restore_student(
    p_student_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_school_id UUID;
    v_caller_role TEXT := public.get_current_user_role();
    v_caller_school_id UUID := public.current_school_id();
    v_user_id UUID;
    v_first_name TEXT;
    v_last_name TEXT;
BEGIN
    IF NOT (public.is_master_admin() OR v_caller_role IN ('admin', 'secretary')) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Keine administrative Berechtigung zum Wiederherstellen.');
    END IF;

    SELECT school_id, user_id, first_name, last_name 
    INTO v_school_id, v_user_id, v_first_name, v_last_name
    FROM public.students 
    WHERE id = p_student_id;

    IF v_school_id IS NULL THEN
        SELECT school_id, id, first_name, last_name
        INTO v_school_id, v_user_id, v_first_name, v_last_name
        FROM public.users_raw
        WHERE id = p_student_id AND role = 'student';
    END IF;

    IF v_school_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Schülerprofil nicht gefunden.');
    END IF;

    IF NOT (public.is_master_admin() OR v_caller_school_id = v_school_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Zugriff verweigert: Mandantentrennung verletzt.');
    END IF;

    -- Restore records
    UPDATE public.students
    SET deleted_at = NULL
    WHERE id = p_student_id OR user_id = p_student_id;

    IF v_user_id IS NOT NULL THEN
        UPDATE public.users_raw
        SET deleted_at = NULL
        WHERE id = v_user_id;
    END IF;

    -- Audit log
    INSERT INTO public.audit_logs (
        school_id, user_id, action, details
    ) VALUES (
        v_school_id,
        public.get_current_user_id(),
        'STUDENT_RESTORED_FROM_RECYCLE_BIN',
        jsonb_build_object(
            'student_id', p_student_id,
            'student_name', v_first_name || ' ' || COALESCE(substring(v_last_name from 1 for 1) || '.', ''),
            'timestamp', NOW()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'student_id', p_student_id,
        'message', 'Schüler wurde erfolgreich wiederhergestellt.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_student(UUID) TO authenticated, anon, service_role;

-- 4. Authoritative RPC: purge_expired_deleted_students (DIN 66398 / 30-day retention)
CREATE OR REPLACE FUNCTION public.purge_expired_deleted_students()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_purged_count INT := 0;
BEGIN
    -- Only master admin or automated pg_cron can execute purge
    IF NOT (public.is_master_admin() OR CURRENT_USER = 'postgres') THEN
        RAISE EXCEPTION 'Nur Master-Admin oder System-Dämon darf endgültige Bereinigungen durchführen.';
    END IF;

    -- Delete students deleted more than 30 days ago
    DELETE FROM public.students
    WHERE deleted_at IS NOT NULL AND deleted_at < (NOW() - INTERVAL '30 days');

    GET DIAGNOSTICS v_purged_count = ROW_COUNT;

    DELETE FROM public.users_raw
    WHERE role = 'student' AND deleted_at IS NOT NULL AND deleted_at < (NOW() - INTERVAL '30 days');

    RETURN v_purged_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_expired_deleted_students() TO service_role;

-- 5. Authoritative RPC: get_user_session_leases for Remote Session Kill in Parent Portal
CREATE OR REPLACE FUNCTION public.get_user_session_leases(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_caller_id UUID := public.get_current_user_id();
    v_caller_role TEXT := public.get_current_user_role();
    v_target_school_id UUID;
    v_leases JSONB;
BEGIN
    SELECT school_id INTO v_target_school_id FROM public.users_raw WHERE id = p_user_id;

    -- Permission: User themselves, school admin, or master admin
    IF NOT (
        public.is_master_admin() 
        OR v_caller_id = p_user_id 
        OR (public.check_school_access(v_target_school_id) AND v_caller_role IN ('admin', 'secretary'))
    ) THEN
        RETURN '[]'::JSONB;
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', sl.id,
            'device_name', sl.device_name,
            'device_key', sl.device_key,
            'role', sl.role,
            'last_active_at', sl.last_active_at,
            'created_at', sl.created_at,
            'is_current', (sl.device_key = COALESCE(current_setting('request.headers', true)::json->>'x-device-key', ''))
        ) ORDER BY sl.last_active_at DESC
    ), '[]'::JSONB)
    INTO v_leases
    FROM public.session_leases sl
    WHERE sl.user_id = p_user_id
      AND sl.is_revoked = FALSE
      AND sl.last_active_at > (NOW() - INTERVAL '14 days');

    RETURN v_leases;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_session_leases(UUID) TO authenticated, anon, service_role;
