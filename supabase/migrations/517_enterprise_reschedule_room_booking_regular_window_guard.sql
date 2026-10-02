-- ==============================================================================
-- Migration 517: Enterprise Reschedule Room Booking Regular Window Guard & Cleanup
-- Standards: OWASP ASVS Level 3 / Multi-Tenancy / Fail-Closed
--
-- 1. Aktualisiert public.reschedule_lesson_authoritative:
--    Verhindert das Anlegen separater Raumbuchungen, wenn ein verschobener Termin
--    innerhalb der regulären Unterrichtszeit der Lehrkraft im Stammraum liegt.
-- 2. Retroaktive Bereinigung redundanter Raumbuchungen im regulären Zeitfenster.
-- ==============================================================================

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
    v_is_inside_regular BOOLEAN := false;
    v_dow INTEGER;
    v_reg_start TIME WITHOUT TIME ZONE;
    v_reg_end TIME WITHOUT TIME ZONE;
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

    -- Check if target slot is inside the teacher's regular recurring schedule window in that specific room
    v_is_inside_regular := false;
    v_dow := EXTRACT(ISODOW FROM p_date); -- 1 = Monday, ..., 7 = Sunday
    
    SELECT 
        MIN(time_slot::TIME), 
        MAX((time_slot::TIME + (COALESCE(duration, 45) || ' minutes')::INTERVAL)::TIME)
    INTO v_reg_start, v_reg_end
    FROM public.schedules
    WHERE teacher_id = v_teacher_id
      AND day_of_week = v_dow
      AND room_id = v_effective_room_id;

    IF v_reg_start IS NOT NULL AND v_reg_end IS NOT NULL THEN
        IF p_start_time >= v_reg_start AND v_end_time <= v_reg_end THEN
            v_is_inside_regular := true;
        END IF;
    END IF;

    -- Ensure room booking is registered for effective room ONLY if outside regular window or in a different room
    IF v_effective_room_id IS NOT NULL THEN
        -- Remove any conflicting entry by same teacher on this slot
        DELETE FROM public.room_bookings
        WHERE booked_by = v_teacher_id
          AND date = p_date
          AND start_time = p_start_time;

        IF NOT v_is_inside_regular THEN
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
                'is_inside_regular', v_is_inside_regular,
                'status', 'pending_reschedule',
                'rescheduled_at', NOW()
            )
        );
    EXCEPTION WHEN OTHERS THEN
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
                'new_start_time', p_start_time,
                'is_inside_regular', v_is_inside_regular
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
        'is_inside_regular', v_is_inside_regular,
        'audit_id', v_audit_id
    );
END;
$$;

-- Retroaktive Bereinigung redundanter room_bookings, die im regulären Zeitfenster der Lehrkraft im Stammraum liegen
DELETE FROM public.room_bookings rb
WHERE rb.title LIKE 'Unterricht:%'
  AND EXISTS (
      SELECT 1 
      FROM public.schedules s
      WHERE s.teacher_id = rb.booked_by
        AND s.day_of_week = EXTRACT(ISODOW FROM rb.date)
        AND s.room_id = rb.room_id
      HAVING rb.start_time >= MIN(s.time_slot::TIME)
         AND rb.end_time <= MAX((s.time_slot::TIME + (COALESCE(s.duration, 45) || ' minutes')::INTERVAL)::TIME)
  );

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.reschedule_lesson_authoritative(TEXT, UUID, UUID, DATE, TIME WITHOUT TIME ZONE, DATE, TIME WITHOUT TIME ZONE, INTEGER, UUID, UUID, UUID, TEXT) TO authenticated, service_role;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
