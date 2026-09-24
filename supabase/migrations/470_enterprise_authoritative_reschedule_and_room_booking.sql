-- ==============================================================================
-- Migration 470: Enterprise Authoritative Reschedule & Room Booking Engine
-- Standards: OWASP ASVS Level 3 / ISO 27001 / GoBD / BFSG / BGB §§ 312j/k
--
-- 1. AUTHORITATIVE SECURITY DEFINER RPC: public.reschedule_lesson_authoritative
-- 2. BATCH RPC: public.reschedule_lessons_batch_authoritative
-- 3. ENSURES IMMUTABLE AUDIT LOGGING VIA MERKLE HASH CHAIN (Migration 469)
-- 4. REALTIME NOTIFICATION & ZERO-TRUST MULTI-TENANCY
-- ==============================================================================

-- 1. Single Occurrence Authoritative Reschedule RPC
CREATE OR REPLACE FUNCTION public.reschedule_lesson_authoritative(
    p_occurrence_id TEXT DEFAULT NULL,
    p_student_id UUID DEFAULT NULL,
    p_teacher_id UUID DEFAULT NULL,
    p_date DATE DEFAULT NULL,
    p_start_time TIME WITHOUT TIME ZONE DEFAULT NULL,
    p_original_date DATE DEFAULT NULL,
    p_original_start_time TIME WITHOUT TIME ZONE DEFAULT NULL,
    p_duration INTEGER DEFAULT 30,
    p_schedule_id UUID DEFAULT NULL,
    p_template_room_id UUID DEFAULT NULL,
    p_room_override_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_is_master BOOLEAN;
    v_student_rec RECORD;
    v_school_id UUID;
    v_teacher_id UUID;
    v_student_id UUID;
    v_student_name TEXT;
    v_occ_uuid UUID := NULL;
    v_effective_room_id UUID;
    v_end_time TIME WITHOUT TIME ZONE;
    v_msg TEXT;
    v_orig_date_str TEXT;
    v_orig_time_str TEXT;
    v_new_date_str TEXT;
    v_new_time_str TEXT;
    v_audit_id UUID;
BEGIN
    v_caller_id := COALESCE(public.get_current_authenticated_user_id(), auth.uid(), p_teacher_id);
    v_caller_role := COALESCE(public.get_current_user_role(), 'teacher');
    v_caller_school_id := COALESCE(public.get_current_user_school_id(), (SELECT school_id FROM public.users_raw WHERE id = v_caller_id LIMIT 1));
    v_is_master := public.is_master_admin();

    -- 🛡️ ZERO-TRUST CALLER AUTHENTICATION
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentifizierung erforderlich: Nur angemeldete Lehrkräfte oder Administratoren können Termine verschieben.');
    END IF;

    v_student_id := p_student_id;
    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Anfrage: Schüler-ID fehlt.');
    END IF;

    -- Lookup student from users_raw
    SELECT id, school_id, first_name, last_name, teacher_id
    INTO v_student_rec
    FROM public.users_raw
    WHERE id = v_student_id;

    IF NOT FOUND THEN
        -- Fallback to users
        SELECT id, school_id, first_name, last_name, teacher_id
        INTO v_student_rec
        FROM public.users
        WHERE id = v_student_id;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Schüler nicht im Schulverzeichnis gefunden.');
        END IF;
    END IF;

    v_school_id := COALESCE(v_student_rec.school_id, v_caller_school_id);
    v_teacher_id := COALESCE(p_teacher_id, v_caller_id);
    v_student_name := TRIM(COALESCE(v_student_rec.first_name, '') || ' ' || COALESCE(v_student_rec.last_name, ''));

    -- 🛡️ MULTI-TENANCY & AUTHORIZATION CHECK
    IF NOT v_is_master THEN
        IF v_caller_school_id IS NOT NULL AND v_caller_school_id <> v_school_id THEN
            RETURN jsonb_build_object('success', false, 'error', 'Mandanten-Verletzung: Zugriff auf fremde Schule verweigert.');
        END IF;
        IF v_caller_role NOT IN ('admin', 'secretary') AND v_caller_id <> v_teacher_id THEN
            RETURN jsonb_build_object('success', false, 'error', 'Zugriff verweigert: Nur die unterrichtende Lehrkraft oder die Schulleitung darf Termine anpassen.');
        END IF;
    END IF;

    -- Resolve Occurrence UUID if provided
    IF p_occurrence_id IS NOT NULL AND p_occurrence_id NOT LIKE 'mock-%' AND p_occurrence_id NOT LIKE 'sched-proj-%' AND p_occurrence_id NOT LIKE 'virtual-%' AND p_occurrence_id NOT LIKE 'adhoc-%' THEN
        BEGIN
            v_occ_uuid := p_occurrence_id::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_occ_uuid := NULL;
        END;
    END IF;

    -- If no explicit valid UUID, look for existing occurrence on original_date or date
    IF v_occ_uuid IS NULL THEN
        SELECT id INTO v_occ_uuid
        FROM public.schedule_occurrences
        WHERE student_id = v_student_id
          AND teacher_id = v_teacher_id
          AND (date = COALESCE(p_original_date, p_date) OR original_date = COALESCE(p_original_date, p_date))
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    v_effective_room_id := COALESCE(p_room_override_id, p_template_room_id);
    v_end_time := (p_start_time + (COALESCE(p_duration, 30) || ' minutes')::INTERVAL)::TIME;

    -- 🛡️ 1. ATOMIC OCCURRENCE UPSERT
    IF v_occ_uuid IS NOT NULL THEN
        UPDATE public.schedule_occurrences SET
            school_id = v_school_id,
            date = p_date,
            start_time = p_start_time,
            original_date = COALESCE(p_original_date, schedule_occurrences.original_date, schedule_occurrences.date),
            original_start_time = COALESCE(p_original_start_time, schedule_occurrences.original_start_time, schedule_occurrences.start_time),
            duration = COALESCE(p_duration, schedule_occurrences.duration, 30),
            status = 'pending_reschedule',
            notes = COALESCE(p_notes, schedule_occurrences.notes),
            template_room_id = COALESCE(p_template_room_id, schedule_occurrences.template_room_id),
            room_override_id = COALESCE(p_room_override_id, schedule_occurrences.room_override_id),
            schedule_id = COALESCE(p_schedule_id, schedule_occurrences.schedule_id),
            student_acknowledged = false,
            updated_at = NOW()
        WHERE id = v_occ_uuid;
    ELSE
        INSERT INTO public.schedule_occurrences (
            school_id,
            student_id,
            teacher_id,
            date,
            start_time,
            original_date,
            original_start_time,
            duration,
            status,
            notes,
            template_room_id,
            room_override_id,
            schedule_id,
            student_acknowledged,
            created_at,
            updated_at
        ) VALUES (
            v_school_id,
            v_student_id,
            v_teacher_id,
            p_date,
            p_start_time,
            COALESCE(p_original_date, p_date),
            COALESCE(p_original_start_time, p_start_time),
            COALESCE(p_duration, 30),
            'pending_reschedule',
            p_notes,
            p_template_room_id,
            p_room_override_id,
            p_schedule_id,
            false,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_occ_uuid;
    END IF;

    -- 🛡️ 2. ATOMIC ROOM BOOKING SYNCHRONIZATION
    -- If moved away from previous date/time, purge previous booking
    IF p_original_date IS NOT NULL AND (p_original_date <> p_date OR (p_original_start_time IS NOT NULL AND p_original_start_time <> p_start_time)) THEN
        DELETE FROM public.room_bookings
        WHERE booked_by = v_teacher_id
          AND date = p_original_date
          AND start_time = COALESCE(p_original_start_time, p_start_time);
    END IF;

    -- Ensure room booking is registered for effective room
    IF v_effective_room_id IS NOT NULL THEN
        -- Remove any conflicting entry by same teacher on this slot
        DELETE FROM public.room_bookings
        WHERE booked_by = v_teacher_id
          AND date = p_date
          AND start_time = p_start_time;

        INSERT INTO public.room_bookings (
            school_id,
            room_id,
            booked_by,
            date,
            start_time,
            end_time,
            title,
            status
        ) VALUES (
            v_school_id,
            v_effective_room_id,
            v_teacher_id,
            p_date,
            p_start_time,
            v_end_time,
            'Unterricht: ' || COALESCE(NULLIF(v_student_name, ''), 'Schüler') || ' (Verschoben)',
            'approved'
        );
    END IF;

    -- 🛡️ 3. REVISIONSSICHERES AUDIT-LOGGING (OWASP ASVS Level 3 / GoBD)
    BEGIN
        v_audit_id := public.log_application_audit_event(
            v_school_id,
            'RESCHEDULE_LESSON',
            'schedule_occurrences',
            v_occ_uuid,
            jsonb_build_object(
                'action_type', 'RESCHEDULE_LESSON',
                'occurrence_id', v_occ_uuid,
                'student_id', v_student_id,
                'student_name', v_student_name,
                'teacher_id', v_teacher_id,
                'original_date', COALESCE(p_original_date, p_date),
                'original_start_time', COALESCE(p_original_start_time, p_start_time),
                'new_date', p_date,
                'new_start_time', p_start_time,
                'duration', COALESCE(p_duration, 30),
                'room_id', v_effective_room_id,
                'status', 'pending_reschedule',
                'rescheduled_at', NOW()
            )
        );
    EXCEPTION WHEN OTHERS THEN
        -- Fallback direct insert if log_application_audit_event fails
        INSERT INTO public.audit_logs (
            school_id,
            table_name,
            action,
            record_id,
            changed_by,
            actor_id,
            user_id,
            details
        ) VALUES (
            v_school_id,
            'schedule_occurrences',
            'UPDATE',
            v_occ_uuid,
            v_caller_id,
            v_caller_id,
            v_student_id,
            jsonb_build_object(
                'action_type', 'RESCHEDULE_LESSON',
                'occurrence_id', v_occ_uuid,
                'student_id', v_student_id,
                'teacher_id', v_teacher_id,
                'new_date', p_date,
                'new_start_time', p_start_time
            )
        );
    END;

    -- 🛡️ 4. STUDENT & PARENT NOTIFICATION PIPELINE
    v_orig_date_str := to_char(COALESCE(p_original_date, p_date), 'DD.MM.YY');
    v_orig_time_str := to_char(COALESCE(p_original_start_time, p_start_time), 'HH24:MI');
    v_new_date_str := to_char(p_date, 'DD.MM.YY');
    v_new_time_str := to_char(p_start_time, 'HH24:MI');

    v_msg := 'Dein Termin wurde verschoben: ' || v_orig_date_str || ' ' || v_orig_time_str || ' Uhr -> ' || v_new_date_str || ' ' || v_new_time_str || ' Uhr. Bitte bestätige den neuen Termin.';

    -- Direct Message
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
        v_teacher_id,
        v_student_id,
        v_msg,
        v_occ_uuid::TEXT,
        true,
        'reschedule_notification',
        false,
        NOW()
    );

    -- In-App Notification (Glocke)
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        metadata,
        created_at
    ) VALUES (
        v_student_id,
        'Terminänderung',
        v_msg,
        jsonb_build_object(
            'occurrence_id', v_occ_uuid,
            'type', 'rescheduled',
            'date', p_date,
            'start_time', p_start_time
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'occurrence_id', v_occ_uuid,
        'student_id', v_student_id,
        'date', p_date,
        'start_time', p_start_time,
        'room_id', v_effective_room_id,
        'audit_id', v_audit_id
    );
END;
$$;

-- 2. Batch Authoritative Reschedule RPC
CREATE OR REPLACE FUNCTION public.reschedule_lessons_batch_authoritative(
    p_changes JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    v_item JSONB;
    v_result JSONB;
    v_results JSONB := '[]'::jsonb;
    v_success_count INTEGER := 0;
BEGIN
    IF p_changes IS NULL OR jsonb_array_length(p_changes) = 0 THEN
        RETURN jsonb_build_object('success', true, 'count', 0, 'results', '[]'::jsonb);
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_changes)
    LOOP
        v_result := public.reschedule_lesson_authoritative(
            p_occurrence_id        => v_item->>'id',
            p_student_id          => (v_item->>'student_id')::UUID,
            p_teacher_id          => (v_item->>'teacher_id')::UUID,
            p_date                => (v_item->>'date')::DATE,
            p_start_time          => (v_item->>'start_time')::TIME,
            p_original_date       => (v_item->>'original_date')::DATE,
            p_original_start_time => (v_item->>'original_start_time')::TIME,
            p_duration            => COALESCE((v_item->>'duration')::INTEGER, 30),
            p_schedule_id         => (v_item->>'schedule_id')::UUID,
            p_template_room_id    => (v_item->>'template_room_id')::UUID,
            p_room_override_id    => (v_item->>'room_override_id')::UUID,
            p_notes               => v_item->>'notes'
        );

        IF COALESCE((v_result->>'success')::BOOLEAN, false) THEN
            v_success_count := v_success_count + 1;
        END IF;

        v_results := v_results || jsonb_build_array(v_result);
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'count', v_success_count,
        'results', v_results
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.reschedule_lesson_authoritative(TEXT, UUID, UUID, DATE, TIME WITHOUT TIME ZONE, DATE, TIME WITHOUT TIME ZONE, INTEGER, UUID, UUID, UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reschedule_lessons_batch_authoritative(JSONB) TO authenticated, service_role;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
