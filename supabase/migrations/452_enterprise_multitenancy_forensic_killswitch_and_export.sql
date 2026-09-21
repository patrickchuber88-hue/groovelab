-- ==============================================================================
-- 🏛️ MIGRATION 452: ENTERPRISE MULTITENANCY FORENSIC KILLSWITCH & COURT-PROOF EXPORT
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Forensic Non-Repudiation)
-- ==============================================================================
-- 1. Sicherstellung der pgcrypto Extension für kryptografische SHA-256 Hashes
-- 2. Append-Only Immutability Shield auf public.master_audit_trail
-- 3. Autoritativer Instant Tenant Kill Switch: emergency_quarantine_school
-- 4. Revisionssicherer, gerichtsverwertbarer Schul-Export: export_school_forensic_dossier
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------------------------
-- 1. Append-Only Immutability Shield auf public.master_audit_trail
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_master_audit_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'MASTER FORENSIC INTEGRITY VIOLATION: Master audit trail is strictly append-only and cannot be updated or deleted.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_master_audit_tampering ON public.master_audit_trail;
CREATE TRIGGER trg_prevent_master_audit_tampering
BEFORE UPDATE OR DELETE ON public.master_audit_trail
FOR EACH ROW
EXECUTE FUNCTION public.prevent_master_audit_tampering();

-- ------------------------------------------------------------------------------
-- 2. Autoritativer Instant Tenant Kill Switch RPC (Emergency Quarantine)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.emergency_quarantine_school(
    p_school_id UUID,
    p_reason TEXT DEFAULT 'Forensic Security Quarantine'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_revoked_leases_count INT := 0;
    v_closed_sessions_count INT := 0;
    v_affected_users_count INT := 0;
    v_school_name TEXT;
    v_caller_id UUID := auth.uid();
BEGIN
    -- 1. Nur autorisierte Master-Admins dürfen den Notfall-Kill-Switch auslösen
    IF NOT public.is_master_admin() THEN
        RAISE EXCEPTION 'FORENSIC ACCESS VIOLATION: Only Master-Admins can trigger emergency tenant quarantine.';
    END IF;

    -- 2. Prüfen ob Schule existiert
    SELECT name INTO v_school_name FROM public.schools WHERE id = p_school_id;
    IF v_school_name IS NULL THEN
        RAISE EXCEPTION 'TARGET NOT FOUND: School % does not exist.', p_school_id;
    END IF;

    -- 3. Schule auf Status 'suspended' und 'is_paused' setzen
    UPDATE public.schools
    SET status = 'suspended',
        is_paused = TRUE
    WHERE id = p_school_id;

    -- 4. Alle aktiven Session-Leases aller Benutzer dieser Schule sofort atomar invalidieren
    UPDATE public.session_leases
    SET is_revoked = TRUE,
        revoked_at = NOW()
    WHERE user_id IN (SELECT id FROM public.users_raw WHERE school_id = p_school_id)
      AND is_revoked = FALSE;
    GET DIAGNOSTICS v_revoked_leases_count = ROW_COUNT;

    -- 5. Alle aktiven Check-ins in public.sessions sofort auschecken
    UPDATE public.sessions
    SET check_out_time = NOW()
    WHERE user_id IN (SELECT id FROM public.users_raw WHERE school_id = p_school_id)
      AND check_out_time IS NULL;
    GET DIAGNOSTICS v_closed_sessions_count = ROW_COUNT;

    -- 6. Anzahl betroffener Nutzer ermitteln
    SELECT COUNT(*) INTO v_affected_users_count FROM public.users_raw WHERE school_id = p_school_id;

    -- 7. Unveränderbarer Revisions-Eintrag in master_audit_trail
    INSERT INTO public.master_audit_trail (
        action,
        target_type,
        status,
        details,
        actor_user_id
    ) VALUES (
        'EMERGENCY_TENANT_QUARANTINE',
        'school',
        'EXECUTED',
        jsonb_build_object(
            'school_id', p_school_id,
            'school_name', v_school_name,
            'reason', p_reason,
            'revoked_leases', v_revoked_leases_count,
            'closed_sessions', v_closed_sessions_count,
            'affected_users', v_affected_users_count,
            'executed_at_utc', NOW()
        ),
        v_caller_id
    );

    -- 8. Zusätzlicher Eintrag im Schul-Audit-Log
    IF to_regclass('public.audit_logs') IS NOT NULL THEN
        INSERT INTO public.audit_logs (
            table_name,
            record_id,
            action,
            new_data,
            changed_by
        ) VALUES (
            'schools',
            p_school_id,
            'UPDATE',
            jsonb_build_object(
                'action', 'EMERGENCY_QUARANTINE',
                'reason', p_reason,
                'revoked_leases', v_revoked_leases_count
            ),
            v_caller_id
        );
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'school_id', p_school_id,
        'school_name', v_school_name,
        'status', 'suspended',
        'revoked_leases_count', v_revoked_leases_count,
        'closed_sessions_count', v_closed_sessions_count,
        'affected_users_count', v_affected_users_count,
        'timestamp', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.emergency_quarantine_school(UUID, TEXT) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. Revisionssicherer, gerichtsverwertbarer Schul-Export mit SHA-256 Manifest
-- (DSGVO Art. 20 Datenübertragbarkeit & Art. 28 Abs. 3 lit. g AVV)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.export_school_forensic_dossier(
    p_school_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_school_id UUID := public.get_current_user_school_id();
    v_caller_role TEXT := public.get_current_user_role();
    v_caller_id UUID := auth.uid();
    v_is_master BOOLEAN := public.is_master_admin();

    v_school_obj JSONB;
    v_rooms_arr JSONB;
    v_students_arr JSONB;
    v_teachers_arr JSONB;
    v_schedule_count INT;
    v_payload JSONB;
    v_payload_text TEXT;
    v_hash TEXT;
    v_manifest JSONB;
BEGIN
    -- 1. Autorisierungsprüfung: Nur Schulleiter/Sekretariat der Schule ODER Master-Admin
    IF NOT v_is_master THEN
        IF v_caller_school_id IS NULL OR v_caller_school_id <> p_school_id OR v_caller_role NOT IN ('admin', 'secretary') THEN
            RAISE EXCEPTION 'ACCESS DENIED: Insufficient permissions to export forensic dossier for school %.', p_school_id;
        END IF;
    END IF;

    -- 2. Stammdaten der Musikschule
    SELECT row_to_json(s)::jsonb INTO v_school_obj
    FROM (
        SELECT id, name, legal_name, zip_code, city, street, house_number, phone_number, billing_email, status, is_trial, created_at
        FROM public.schools
        WHERE id = p_school_id
    ) s;

    IF v_school_obj IS NULL THEN
        RAISE EXCEPTION 'NOT FOUND: School % does not exist.', p_school_id;
    END IF;

    -- 3. Raum- und Stationsstruktur
    SELECT COALESCE(json_agg(r)::jsonb, '[]'::jsonb) INTO v_rooms_arr
    FROM (
        SELECT id, name
        FROM public.rooms
        WHERE school_id = p_school_id
        ORDER BY name
    ) r;

    -- 4. Schüler-Metadaten (Ausnahmslos OHNE PINs, Hashes, QR-Secrets oder Passwörter)
    SELECT COALESCE(json_agg(st)::jsonb, '[]'::jsonb) INTO v_students_arr
    FROM (
        SELECT id, first_name, last_name, instrument, lesson_duration, status, created_at
        FROM public.users_raw
        WHERE school_id = p_school_id
          AND role = 'student'
          AND deleted_at IS NULL
        ORDER BY last_name, first_name
    ) st;

    -- 5. Lehrkräfte-Metadaten (Ausnahmslos OHNE Secrets/Hashes)
    SELECT COALESCE(json_agg(tc)::jsonb, '[]'::jsonb) INTO v_teachers_arr
    FROM (
        SELECT id, first_name, last_name, instrument, role, created_at
        FROM public.users_raw
        WHERE school_id = p_school_id
          AND role IN ('teacher', 'coach')
          AND deleted_at IS NULL
        ORDER BY last_name, first_name
    ) tc;

    -- 6. Anzahl Unterrichtseinheiten / Belegungen
    SELECT COUNT(*) INTO v_schedule_count
    FROM public.schedule_occurrences so
    JOIN public.users_raw u ON u.id = so.student_id
    WHERE u.school_id = p_school_id;

    -- 7. Assemblierung des deterministischen Payloads
    v_payload := jsonb_build_object(
        'school', v_school_obj,
        'rooms', v_rooms_arr,
        'students', v_students_arr,
        'teachers', v_teachers_arr,
        'summary', jsonb_build_object(
            'room_count', jsonb_array_length(v_rooms_arr),
            'student_count', jsonb_array_length(v_students_arr),
            'teacher_count', jsonb_array_length(v_teachers_arr),
            'schedule_occurrences_count', v_schedule_count
        )
    );

    -- 8. Kryptografische SHA-256 Prüfsummenberechnung (Non-Repudiation)
    v_payload_text := v_payload::text;
    v_hash := encode(digest(v_payload_text, 'sha256'), 'hex');

    -- 9. Digitales Manifest / Gerichtsverwertbares Zertifikat
    v_manifest := jsonb_build_object(
        'school_id', p_school_id,
        'export_timestamp_utc', NOW(),
        'exported_by_user_id', v_caller_id,
        'caller_role', v_caller_role,
        'digest_algorithm', 'SHA-256',
        'payload_sha256', v_hash,
        'legal_basis', 'DSGVO Art. 20 (Datenübertragbarkeit) & Art. 28 Abs. 3 lit. g (AVV Abschluss)',
        'certified_by', 'Campus-Groovelab Tier-1 Forensic Engine (OWASP ASVS L3)'
    );

    -- 10. Revisionssicheres Logging in public.audit_logs
    IF to_regclass('public.audit_logs') IS NOT NULL THEN
        INSERT INTO public.audit_logs (
            table_name,
            record_id,
            action,
            new_data,
            changed_by
        ) VALUES (
            'schools',
            p_school_id,
            'INSERT',
            jsonb_build_object(
                'type', 'COURT_PROOF_FORENSIC_EXPORT',
                'sha256', v_hash,
                'manifest', v_manifest
            ),
            v_caller_id
        );
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'manifest', v_manifest,
        'data', v_payload,
        'sha256', v_hash
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.export_school_forensic_dossier(UUID) TO authenticated, service_role;
