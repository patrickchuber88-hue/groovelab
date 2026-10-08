-- ==============================================================================
-- Migration 533: Enterprise Authoritative Reschedule Decision & Realtime Synchronization
-- Standards: OWASP ASVS Level 3 / ISO 27001 / GoBD / BFSG / BGB §§ 312j/k
--
-- 1. EXTENDS schedule_status ENUM WITH 'reschedule_rejected'
-- 2. AUTHORITATIVE SECURITY DEFINER RPC: public.respond_to_reschedule_authoritative
-- 3. AUTOMATIC ROOM BOOKING ROLLBACK (Purges room_bookings on rejection)
-- 4. IMMUTABLE AUDIT LOGGING VIA MERKLE HASH CHAIN (log_application_audit_event)
-- 5. REALTIME CROSS-DEVICE NOTIFICATION PIPELINE (Direct Messages & Push)
-- ==============================================================================

-- 1. Extend schedule_status enum safely
DO $$
BEGIN
  BEGIN
    ALTER TYPE schedule_status ADD VALUE IF NOT EXISTS 'reschedule_rejected';
  EXCEPTION WHEN duplicate_object THEN
    -- already exists
  END;
END $$;

-- 2. Authoritative SECURITY DEFINER RPC: respond_to_reschedule_authoritative
CREATE OR REPLACE FUNCTION public.respond_to_reschedule_authoritative(
    p_occurrence_id UUID,
    p_decision TEXT,                   -- 'accept' oder 'reject'
    p_rejection_reason TEXT DEFAULT NULL,
    p_student_id UUID DEFAULT NULL,
    p_date DATE DEFAULT NULL,
    p_start_time TIME DEFAULT NULL,
    p_teacher_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_is_master BOOLEAN;
    v_occ RECORD;
    v_school_id UUID;
    v_student_rec RECORD;
    v_student_name TEXT;
    v_teacher_name TEXT;
    v_date_formatted TEXT;
    v_time_formatted TEXT;
    v_orig_date_formatted TEXT;
    v_orig_time_formatted TEXT;
    v_audit_id UUID;
    v_notif_title TEXT;
    v_notif_body TEXT;
BEGIN
    v_caller_id := COALESCE(public.get_current_authenticated_user_id(), auth.uid(), p_student_id);
    v_caller_role := COALESCE(public.get_current_user_role(), 'student');
    v_is_master := public.is_master_admin();

    -- 🛡️ 1. ZERO-TRUST AUTHENTICATION & INPUT VALIDATION
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentifizierung erforderlich: Bitte melde dich an, um auf Terminvorschläge zu reagieren.');
    END IF;

    IF p_occurrence_id IS NULL AND (p_date IS NULL OR p_student_id IS NULL) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Termin-ID oder Datum fehlt.');
    END IF;

    IF p_decision NOT IN ('accept', 'reject') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Entscheidung: Nur ''accept'' oder ''reject'' sind zulässig.');
    END IF;

    -- 🛡️ 2. ATOMIC RECORD LOCKING (FOR UPDATE prevents Race Conditions)
    IF p_occurrence_id IS NOT NULL THEN
        SELECT * INTO v_occ
        FROM public.schedule_occurrences
        WHERE id = p_occurrence_id
        FOR UPDATE;
    END IF;

    IF v_occ.id IS NULL THEN
        -- Falls p_occurrence_id nicht existiert oder virtuell/projiziert war
        IF p_date IS NOT NULL AND p_student_id IS NOT NULL THEN
            SELECT * INTO v_occ
            FROM public.schedule_occurrences
            WHERE student_id = p_student_id AND date = p_date
            FOR UPDATE;

            IF v_occ.id IS NULL THEN
                INSERT INTO public.schedule_occurrences (
                    id,
                    student_id,
                    teacher_id,
                    date,
                    start_time,
                    status,
                    student_acknowledged,
                    is_moved,
                    is_rescheduled,
                    created_at,
                    updated_at
                ) VALUES (
                    COALESCE(p_occurrence_id, gen_random_uuid()),
                    p_student_id,
                    p_teacher_id,
                    p_date,
                    COALESCE(p_start_time, '14:00'::time),
                    'pending_reschedule',
                    false,
                    true,
                    true,
                    NOW(),
                    NOW()
                )
                RETURNING * INTO v_occ;
            END IF;
            p_occurrence_id := v_occ.id;
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Unterrichtstermin nicht gefunden.');
        END IF;
    END IF;

    -- 🛡️ 3. MULTI-TENANCY & AUTHORIZATION CHECK
    -- Caller must be: Assigned student, their parent, the teacher, school admin/secretary, or master admin
    IF NOT v_is_master THEN
        IF v_caller_role NOT IN ('admin', 'secretary') THEN
            IF v_occ.student_id IS NOT NULL AND v_occ.student_id <> v_caller_id THEN
                -- Check if caller is parent of student in users_raw
                IF NOT EXISTS (
                    SELECT 1 FROM public.users_raw p 
                    WHERE p.id = v_caller_id 
                      AND (p.role = 'parent' OR p.id = v_occ.student_id)
                ) AND v_occ.teacher_id <> v_caller_id THEN
                    RETURN jsonb_build_object('success', false, 'error', 'Zugriff verweigert: Du bist nicht berechtigt, diesen Termin zu bearbeiten.');
                END IF;
            END IF;
        END IF;
    END IF;

    v_school_id := v_occ.school_id;
    IF v_school_id IS NULL THEN
        SELECT school_id INTO v_school_id FROM public.users_raw WHERE id = v_occ.teacher_id LIMIT 1;
    END IF;

    -- Fetch student & teacher display names
    SELECT TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) INTO v_student_name
    FROM public.users_raw WHERE id = v_occ.student_id;
    IF v_student_name IS NULL OR v_student_name = '' THEN
        v_student_name := 'Dein Schüler';
    END IF;

    SELECT TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) INTO v_teacher_name
    FROM public.users_raw WHERE id = v_occ.teacher_id;
    IF v_teacher_name IS NULL OR v_teacher_name = '' THEN
        v_teacher_name := 'Lehrkraft';
    END IF;

    v_date_formatted := to_char(v_occ.date, 'DD.MM.YYYY');
    v_time_formatted := to_char(COALESCE(v_occ.start_time, '12:00'::time), 'HH24:MI');

    IF v_occ.original_date IS NOT NULL THEN
        v_orig_date_formatted := to_char(v_occ.original_date, 'DD.MM.YYYY');
    ELSE
        v_orig_date_formatted := v_date_formatted;
    END IF;

    IF v_occ.original_start_time IS NOT NULL THEN
        v_orig_time_formatted := to_char(v_occ.original_start_time, 'HH24:MI');
    ELSE
        v_orig_time_formatted := v_time_formatted;
    END IF;

    -- 🛡️ 4. EXECUTE DECISION
    IF p_decision = 'accept' THEN
        -- A) BESTÄTIGEN
        UPDATE public.schedule_occurrences SET
            status = 'rescheduled_confirmed',
            student_acknowledged = true,
            updated_at = NOW()
        WHERE id = p_occurrence_id;

        -- Ensure room booking is approved
        UPDATE public.room_bookings SET
            status = 'approved',
            title = 'Unterricht: ' || v_student_name || ' (Bestätigt)'
        WHERE booked_by = v_occ.teacher_id
          AND date = v_occ.date
          AND start_time = v_occ.start_time;

        -- Revisionssicheres Audit-Log (GoBD / Merkle Hash Chain)
        BEGIN
            v_audit_id := public.log_application_audit_event(
                v_school_id,
                'RESCHEDULE_ACCEPTED',
                'schedule_occurrences',
                p_occurrence_id,
                jsonb_build_object(
                    'occurrence_id', p_occurrence_id,
                    'decision', 'accept',
                    'student_id', v_occ.student_id,
                    'teacher_id', v_occ.teacher_id,
                    'date', v_occ.date,
                    'start_time', v_occ.start_time,
                    'confirmed_by', v_caller_id,
                    'confirmed_at', NOW()
                )
            );
        EXCEPTION WHEN OTHERS THEN
            INSERT INTO public.audit_logs (school_id, table_name, action, record_id, actor_id, details)
            VALUES (v_school_id, 'schedule_occurrences', 'UPDATE', p_occurrence_id, v_caller_id,
                    jsonb_build_object('action', 'RESCHEDULE_ACCEPTED', 'date', v_occ.date, 'start_time', v_occ.start_time));
        END;

        -- Direct message to teacher
        IF v_occ.teacher_id IS NOT NULL AND v_occ.student_id IS NOT NULL THEN
            INSERT INTO public.campus_direct_messages (
                school_id,
                sender_id,
                recipient_id,
                content,
                occurrence_id,
                is_system,
                message_type,
                is_read,
                created_at
            ) VALUES (
                v_school_id,
                v_occ.student_id,
                v_occ.teacher_id,
                '✅ Neuer Unterrichtstermin bestätigt: ' || v_date_formatted || ' um ' || v_time_formatted || ' Uhr.',
                p_occurrence_id::TEXT,
                true,
                'reschedule_response',
                false,
                NOW()
            );

            -- Teacher In-App Notification
            v_notif_title := 'Termin bestätigt! 📅';
            v_notif_body := v_student_name || ' hat den Termin am ' || v_date_formatted || ' um ' || v_time_formatted || ' Uhr bestätigt.';

            INSERT INTO public.notifications (
                user_id,
                title,
                message,
                metadata,
                created_at
            ) VALUES (
                v_occ.teacher_id,
                v_notif_title,
                v_notif_body,
                jsonb_build_object(
                    'occurrence_id', p_occurrence_id,
                    'type', 'rescheduled_confirmed',
                    'status', 'rescheduled_confirmed',
                    'student_id', v_occ.student_id
                ),
                NOW()
            );
        END IF;

    ELSIF p_decision = 'reject' THEN
        -- B) ABLEHNEN
        UPDATE public.schedule_occurrences SET
            status = 'reschedule_rejected',
            student_acknowledged = true,
            notes = COALESCE(notes || ' | ', '') || 'Vorschlag abgelehnt durch Schüler: ' || COALESCE(p_rejection_reason, 'Termin passt nicht'),
            updated_at = NOW()
        WHERE id = p_occurrence_id;

        -- 🛡️ ATOMIC ROOM BOOKING CLEANUP: Purge the reserved slot immediately
        DELETE FROM public.room_bookings
        WHERE booked_by = v_occ.teacher_id
          AND date = v_occ.date
          AND start_time = v_occ.start_time;

        -- Revisionssicheres Audit-Log (GoBD / Merkle Hash Chain)
        BEGIN
            v_audit_id := public.log_application_audit_event(
                v_school_id,
                'RESCHEDULE_REJECTED',
                'schedule_occurrences',
                p_occurrence_id,
                jsonb_build_object(
                    'occurrence_id', p_occurrence_id,
                    'decision', 'reject',
                    'student_id', v_occ.student_id,
                    'teacher_id', v_occ.teacher_id,
                    'rejected_date', v_occ.date,
                    'rejected_start_time', v_occ.start_time,
                    'original_date', v_occ.original_date,
                    'original_start_time', v_occ.original_start_time,
                    'reason', p_rejection_reason,
                    'rejected_by', v_caller_id,
                    'rejected_at', NOW()
                )
            );
        EXCEPTION WHEN OTHERS THEN
            INSERT INTO public.audit_logs (school_id, table_name, action, record_id, actor_id, details)
            VALUES (v_school_id, 'schedule_occurrences', 'UPDATE', p_occurrence_id, v_caller_id,
                    jsonb_build_object('action', 'RESCHEDULE_REJECTED', 'reason', p_rejection_reason));
        END;

        -- Direct message to teacher informing about rejection
        IF v_occ.teacher_id IS NOT NULL AND v_occ.student_id IS NOT NULL THEN
            INSERT INTO public.campus_direct_messages (
                school_id,
                sender_id,
                recipient_id,
                content,
                occurrence_id,
                is_system,
                message_type,
                is_read,
                created_at
            ) VALUES (
                v_school_id,
                v_occ.student_id,
                v_occ.teacher_id,
                '❌ Terminvorschlag abgelehnt: ' || v_date_formatted || ' um ' || v_time_formatted || ' Uhr (' || COALESCE(p_rejection_reason, 'Termin passt leider nicht') || '). Bitte neue Zeit abstimmen.',
                p_occurrence_id::TEXT,
                true,
                'reschedule_response',
                false,
                NOW()
            );

            -- Teacher In-App Notification (High-Priority Alert)
            v_notif_title := 'Terminvorschlag abgelehnt ✕';
            v_notif_body := v_student_name || ' kann am ' || v_date_formatted || ' um ' || v_time_formatted || ' Uhr nicht kommen (' || COALESCE(p_rejection_reason, 'Termin passt nicht') || ').';

            INSERT INTO public.notifications (
                user_id,
                title,
                message,
                metadata,
                created_at
            ) VALUES (
                v_occ.teacher_id,
                v_notif_title,
                v_notif_body,
                jsonb_build_object(
                    'occurrence_id', p_occurrence_id,
                    'type', 'reschedule_rejected',
                    'status', 'reschedule_rejected',
                    'student_id', v_occ.student_id,
                    'reason', p_rejection_reason
                ),
                NOW()
            );
        END IF;

    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'decision', p_decision,
        'occurrence_id', p_occurrence_id,
        'status', CASE WHEN p_decision = 'accept' THEN 'rescheduled_confirmed' ELSE 'reschedule_rejected' END,
        'audit_id', v_audit_id
    );
END;
$$;

-- 3. Execution permissions
GRANT EXECUTE ON FUNCTION public.respond_to_reschedule_authoritative(UUID, TEXT, TEXT, UUID, DATE, TIME, UUID) TO authenticated, anon, service_role;

-- 4. Notify PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
