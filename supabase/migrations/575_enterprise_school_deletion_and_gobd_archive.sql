-- ==============================================================================
-- Migration 575: Enterprise 0,1% School Deletion & GoBD Archive Citadel
-- Standards: OWASP ASVS Level 3, GoBD § 147 AO, DSGVO Art. 17, Zero US-Cloud
--
-- Remediation:
-- 1. Heals prevent_last_admin_lockout() with Master Admin / Tenant-Purge bypass.
-- 2. Heals process_audit_log() to safely handle deleted parent schools (prevents FK violation).
-- 3. Heals purge_school_test_data() audit log inserts (table_name, record_id NOT NULL).
-- 4. Heals calculate_master_audit_hash_chain() (created_at DESC & extensions.digest).
-- 5. Provides authoritative, atomic delete_school_cascade(p_school_id, p_archive_only)
--    with automatic GoBD invoice detection and tamper-evident audit logging.
-- ==============================================================================

-- 1. HEAL prevent_last_admin_lockout TRIGGER
CREATE OR REPLACE FUNCTION public.prevent_last_admin_lockout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_old_has_admin boolean;
    v_new_has_admin boolean;
    v_active_admins_count int;
BEGIN
    -- 0. Null-Tenant Guard: Master Admins and system accounts without school_id
    IF OLD.school_id IS NULL THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;

    -- 0b. Master Admin & Tenant Deletion Bypass:
    -- When a Master Admin deletes a school or the tenant itself is being purged/deleted,
    -- the single-admin preservation invariant does not apply.
    IF current_setting('app.is_deleting_school', true) = 'true'
       OR public.is_master_admin()
       OR current_user IN ('postgres', 'supabase_admin') THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;

    -- 1. Check if the user record previously possessed administrative authority
    v_old_has_admin := (
        OLD.role = 'admin' OR 
        (OLD.roles IS NOT NULL AND 'admin' = ANY(OLD.roles::text[]))
    );

    IF NOT v_old_has_admin THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;

    -- 2. Check if the user record retains administrative authority AFTER this operation
    IF TG_OP = 'DELETE' THEN
        v_new_has_admin := false;
    ELSE
        v_new_has_admin := (
            NEW.is_active = true AND (
                NEW.role = 'admin' OR 
                (NEW.roles IS NOT NULL AND 'admin' = ANY(NEW.roles::text[]))
            )
        );
    END IF;

    -- 3. Invariant Enforcement: Only trigger when administrative capability is ACTUALLY destroyed
    IF NOT v_new_has_admin THEN
        PERFORM 1 FROM public.schools WHERE id = OLD.school_id FOR UPDATE;

        SELECT COUNT(*) INTO v_active_admins_count
        FROM public.users_raw
        WHERE school_id = OLD.school_id
          AND is_active = true
          AND id <> OLD.id
          AND (
              role = 'admin' OR 
              (roles IS NOT NULL AND 'admin' = ANY(roles::text[]))
          );

        IF v_active_admins_count = 0 THEN
            RAISE EXCEPTION 'Schutzverletzung (OWASP ASVS 4.1.3): Mindestens ein aktiver Schulleiter muss für Mandant % erhalten bleiben!', OLD.school_id;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_lockout ON public.users_raw;
CREATE TRIGGER trg_prevent_last_admin_lockout
    BEFORE UPDATE OR DELETE ON public.users_raw
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_last_admin_lockout();

-- 2. HEAL process_audit_log (FOREIGN KEY RESILIENCE DURING SCHOOL CASCADE)
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := NULL;
    v_school_id UUID := NULL;
    v_old JSONB := '{}'::JSONB;
    v_new JSONB := '{}'::JSONB;
BEGIN
    BEGIN
        v_user_id := nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    IF v_user_id IS NULL THEN
        BEGIN
            v_user_id := nullif(current_setting('request.headers', true)::jsonb->>'x-user-id', '')::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_user_id := NULL;
        END;
    END IF;

    IF v_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users_raw WHERE id = v_user_id) THEN
        v_user_id := NULL;
    END IF;

    IF TG_OP = 'DELETE' THEN
        v_school_id := OLD.school_id;
    ELSE
        v_school_id := NEW.school_id;
    END IF;

    -- Safety check: ensure school_id exists in public.schools to prevent audit_logs_school_id_fkey violation
    IF v_school_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.schools WHERE id = v_school_id) THEN
        v_school_id := NULL;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_new := to_jsonb(NEW) - 'password' - 'personal_pin' - 'password_hash' - 'last_seen';
        INSERT INTO public.audit_logs (changed_by, school_id, table_name, action, record_id, new_data)
        VALUES (v_user_id, v_school_id, TG_TABLE_NAME::TEXT, TG_OP, NEW.id, v_new);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_old := public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW)) - 'password' - 'personal_pin' - 'password_hash' - 'last_seen';
        v_new := public.jsonb_diff(to_jsonb(NEW), to_jsonb(OLD)) - 'password' - 'personal_pin' - 'password_hash' - 'last_seen';
        IF v_old != '{}'::JSONB OR v_new != '{}'::JSONB THEN
            INSERT INTO public.audit_logs (changed_by, school_id, table_name, action, record_id, old_data, new_data)
            VALUES (v_user_id, v_school_id, TG_TABLE_NAME::TEXT, TG_OP, NEW.id, v_old, v_new);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        v_old := to_jsonb(OLD) - 'password' - 'personal_pin' - 'password_hash' - 'last_seen';
        INSERT INTO public.audit_logs (changed_by, school_id, table_name, action, record_id, old_data)
        VALUES (v_user_id, v_school_id, TG_TABLE_NAME::TEXT, TG_OP, OLD.id, v_old);
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

-- 3. HEAL purge_school_test_data() (FIX NOT NULL AUDIT_LOGS COLUMNS)
CREATE OR REPLACE FUNCTION public.purge_school_test_data(p_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_is_master BOOLEAN;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_is_master := COALESCE(public.is_master_admin(), FALSE);

    -- 🛡️ STRICT AUTHORIZATION: Caller must be a school admin of this school OR master admin
    IF NOT (
        v_is_master
        OR (v_caller_id IS NOT NULL AND v_caller_role IN ('admin', 'secretary') AND public.get_current_user_school_id() = p_school_id)
        OR current_user IN ('postgres', 'supabase_admin')
    ) THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'UNAUTHORIZED_DATA_PURGE',
            'message', 'Nur Schulleitungen oder Master-Administratoren dürfen Schuldaten bereinigen.'
        );
    END IF;

    PERFORM set_config('app.is_deleting_school', 'true', true);

    -- Didaktische Medien, Übungen & Stunden
    DELETE FROM public.campus_events WHERE school_id = p_school_id;
    DELETE FROM public.student_audio_shares WHERE school_id = p_school_id;
    DELETE FROM public.lessons WHERE school_id = p_school_id;
    DELETE FROM public.campus_direct_messages WHERE school_id = p_school_id;
    DELETE FROM public.campus_chat_groups WHERE school_id = p_school_id;

    -- Räume & Kioske
    DELETE FROM public.room_bookings WHERE room_id IN (SELECT id FROM public.rooms WHERE school_id = p_school_id);
    DELETE FROM public.room_blocked_slots WHERE room_id IN (SELECT id FROM public.rooms WHERE school_id = p_school_id);

    -- Bands
    DELETE FROM public.band_members WHERE band_id IN (SELECT id FROM public.bands WHERE school_id = p_school_id);
    DELETE FROM public.bands WHERE school_id = p_school_id;

    -- Schedules
    DELETE FROM public.schedules WHERE school_id = p_school_id;

    -- Students
    DELETE FROM public.student_first_names WHERE student_id IN (SELECT id FROM public.students WHERE school_id = p_school_id);
    DELETE FROM public.student_last_names WHERE student_id IN (SELECT id FROM public.students WHERE school_id = p_school_id);
    DELETE FROM public.activation_days WHERE student_id IN (SELECT id FROM public.students WHERE school_id = p_school_id)
       OR student_id IN (SELECT id FROM public.users_raw WHERE school_id = p_school_id AND role = 'student');
    DELETE FROM public.students WHERE school_id = p_school_id;

    -- Rooms
    DELETE FROM public.rooms WHERE school_id = p_school_id;

    -- Non-staff users
    DELETE FROM public.users_raw
    WHERE school_id = p_school_id
      AND (v_caller_id IS NULL OR id <> v_caller_id)
      AND role NOT IN ('admin', 'secretary')
      AND NOT ('admin' = ANY(roles))
      AND NOT ('secretary' = ANY(roles));

    -- Session leases
    DELETE FROM public.session_leases
    WHERE school_id = p_school_id
      AND (v_caller_id IS NULL OR user_id <> v_caller_id);

    -- Audit Logging mit validen NOT NULL Feldern
    INSERT INTO public.audit_logs (
        school_id,
        table_name,
        record_id,
        user_id,
        action,
        details
    ) VALUES (
        p_school_id,
        'schools',
        p_school_id,
        v_caller_id,
        'PURGE_SCHOOL_TEST_DATA',
        jsonb_build_object(
            'purged_by', v_caller_id,
            'purged_role', v_caller_role,
            'purged_at', NOW()
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Schuldaten erfolgreich bereinigt.'
    );
END;
$$;

-- 4. HEAL calculate_master_audit_hash_chain() (created_at DESC & extensions.digest)
CREATE OR REPLACE FUNCTION public.calculate_master_audit_hash_chain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_prev_hash TEXT;
    v_genesis_hash CONSTANT TEXT := '0000000000000000000000000000000000000000000000000000000000000000';
    v_trace_id TEXT;
    v_payload_raw TEXT;
BEGIN
    SELECT record_hash INTO v_prev_hash
    FROM public.master_audit_trail
    WHERE record_hash IS NOT NULL AND record_hash <> ''
    ORDER BY created_at DESC, id DESC
    LIMIT 1;

    NEW.previous_record_hash := COALESCE(v_prev_hash, v_genesis_hash);

    v_trace_id := current_setting('campus.current_trace_id', true);
    IF v_trace_id IS NOT NULL AND v_trace_id <> '' THEN
        NEW.w3c_trace_id := COALESCE(NEW.w3c_trace_id, v_trace_id);
    END IF;

    v_payload_raw := concat(
        NEW.previous_record_hash, '|',
        NEW.action, '|',
        COALESCE(NEW.target_type, ''), '|',
        COALESCE(NEW.status, ''), '|',
        COALESCE(NEW.details::text, '{}'), '|',
        COALESCE(NEW.actor_user_id::text, ''), '|',
        COALESCE(NEW.w3c_trace_id, '')
    );

    NEW.record_hash := encode(extensions.digest(v_payload_raw::bytea, 'sha256'), 'hex');

    RETURN NEW;
END;
$$;

-- 5. AUTHORITATIVE delete_school_cascade RPC (OWASP ASVS L3 / GoBD § 147 AO / DSGVO Art. 17)
DROP FUNCTION IF EXISTS public.delete_school_cascade(UUID);
DROP FUNCTION IF EXISTS public.delete_school_cascade(UUID, UUID);

CREATE OR REPLACE FUNCTION public.delete_school_cascade(
    p_school_id UUID,
    p_archive_only BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_is_master BOOLEAN;
    v_has_invoices BOOLEAN;
    v_school_name TEXT;
    v_school_status TEXT;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    v_is_master := COALESCE(public.is_master_admin(), FALSE);

    -- 🛡️ Master Admin Authorization Guard
    IF NOT v_is_master AND current_user NOT IN ('postgres', 'supabase_admin') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'UNAUTHORIZED',
            'message', 'Zugriff verweigert: Nur Master-Admins dürfen Schulen löschen oder archivieren.'
        );
    END IF;

    SELECT name, status INTO v_school_name, v_school_status 
    FROM public.schools 
    WHERE id = p_school_id;

    IF v_school_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Schule nicht gefunden.');
    END IF;

    -- Check if GoBD invoices exist (§ 147 AO - 10-jährige Aufbewahrungspflicht)
    SELECT (
        EXISTS (SELECT 1 FROM public.invoices WHERE school_id = p_school_id)
        OR EXISTS (SELECT 1 FROM public.school_invoice_dispatches WHERE school_id = p_school_id)
    ) INTO v_has_invoices;

    -- Set session flag to bypass last-admin lockout trigger during deletion
    PERFORM set_config('app.is_deleting_school', 'true', true);

    IF p_archive_only = TRUE OR v_has_invoices = TRUE THEN
        -- 🏛️ GoBD-Archivierung (§ 147 AO) & DSGVO Art. 17 Daten-Purge
        -- 1. Schüler, didaktische Daten und Audio-Takes physisch löschen (DSGVO Art. 17)
        DELETE FROM public.schedules WHERE school_id = p_school_id;
        DELETE FROM public.lessons WHERE school_id = p_school_id;
        DELETE FROM public.campus_events WHERE school_id = p_school_id;
        DELETE FROM public.campus_direct_messages WHERE school_id = p_school_id;
        DELETE FROM public.campus_chat_groups WHERE school_id = p_school_id;
        DELETE FROM public.bands WHERE school_id = p_school_id;
        DELETE FROM public.rooms WHERE school_id = p_school_id;
        DELETE FROM public.kiosks WHERE school_id = p_school_id;
        DELETE FROM public.student_audio_shares WHERE school_id = p_school_id;
        DELETE FROM public.help_requests WHERE school_id = p_school_id;
        DELETE FROM public.session_leases WHERE school_id = p_school_id;
        DELETE FROM public.user_badge_credentials WHERE school_id = p_school_id;
        DELETE FROM public.students WHERE school_id = p_school_id;
        DELETE FROM public.users_raw WHERE school_id = p_school_id AND role NOT IN ('admin');

        -- 2. Schule archivieren und sperren (Rechnungen bleiben WORM-versiegelt)
        UPDATE public.schools
        SET status = 'archived',
            is_paused = TRUE,
            is_active = FALSE
        WHERE id = p_school_id;

        -- 3. Revisionssicheres Audit Logging in master_audit_trail
        INSERT INTO public.master_audit_trail (
            actor_user_id, action, target_type, target_id, details
        ) VALUES (
            v_caller_id, 'SCHOOL_ARCHIVED_GOBD', 'schools', p_school_id::text,
            jsonb_build_object('school_name', v_school_name, 'has_invoices', v_has_invoices, 'archived_at', NOW())
        );

        RETURN jsonb_build_object(
            'success', true,
            'action', 'archived',
            'has_invoices', v_has_invoices,
            'message', 'Schule wurde DSGVO-bereinigt und GoBD-konform archiviert (Rechnungsbelege bleiben 10 Jahre gesetzlich versiegelt).'
        );
    ELSE
        -- 💣 Vollständiges Hard-Delete (Keine Rechnungen vorhanden)
        DELETE FROM public.schedules WHERE school_id = p_school_id;
        DELETE FROM public.lessons WHERE school_id = p_school_id;
        DELETE FROM public.campus_events WHERE school_id = p_school_id;
        DELETE FROM public.campus_direct_messages WHERE school_id = p_school_id;
        DELETE FROM public.campus_chat_groups WHERE school_id = p_school_id;
        DELETE FROM public.bands WHERE school_id = p_school_id;
        DELETE FROM public.rooms WHERE school_id = p_school_id;
        DELETE FROM public.kiosks WHERE school_id = p_school_id;
        DELETE FROM public.student_audio_shares WHERE school_id = p_school_id;
        DELETE FROM public.help_requests WHERE school_id = p_school_id;
        DELETE FROM public.session_leases WHERE school_id = p_school_id;
        DELETE FROM public.user_badge_credentials WHERE school_id = p_school_id;
        DELETE FROM public.students WHERE school_id = p_school_id;
        DELETE FROM public.users_raw WHERE school_id = p_school_id;
        DELETE FROM public.schools WHERE id = p_school_id;

        INSERT INTO public.master_audit_trail (
            actor_user_id, action, target_type, target_id, details
        ) VALUES (
            v_caller_id, 'SCHOOL_PERMANENTLY_DELETED', 'schools', p_school_id::text,
            jsonb_build_object('school_name', v_school_name, 'deleted_at', NOW())
        );

        RETURN jsonb_build_object(
            'success', true,
            'action', 'deleted',
            'has_invoices', false,
            'message', 'Schule und alle verknüpften Daten wurden endgültig gelöscht.'
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_school_cascade(UUID, BOOLEAN) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.purge_school_test_data(UUID) TO anon, authenticated, service_role;
