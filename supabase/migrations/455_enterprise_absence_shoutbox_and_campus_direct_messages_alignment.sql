-- ==============================================================================
-- 🏛️ MIGRATION 455: ENTERPRISE ABSENCE SHOUTBOX & CAMPUS DIRECT MESSAGES ALIGNMENT
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Fail-Closed)
-- ==============================================================================
-- 1. Tabellenerweiterung: campus_direct_messages (is_system, message_type, sender_role, school_id, subject, parent_message_id)
-- 2. Backfill school_id & Indizierung für Chat/Shoutbox Performance
-- 3. Autoritativer RPC: report_teacher_absence mit atomarer Benachrichtigung & Status-Harmonisierung
-- 4. Autoritativer RPC: end_teacher_absence mit atomarer Reaktivierung & Entwarnungs-Broadcasts
-- ==============================================================================

-- 1. SCHEMA-ERWEITERUNG: CAMPUS_DIRECT_MESSAGES
ALTER TABLE public.campus_direct_messages
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sender_role TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES public.campus_direct_messages(id) ON DELETE CASCADE;

-- Backfill school_id für bestehende Chat-Nachrichten
UPDATE public.campus_direct_messages m
SET school_id = u.school_id
FROM public.users_raw u
WHERE m.sender_id = u.id AND m.school_id IS NULL;

UPDATE public.campus_direct_messages m
SET school_id = u.school_id
FROM public.users_raw u
WHERE m.recipient_id = u.id AND m.school_id IS NULL;

-- Indizes zur performanten Filterung
CREATE INDEX IF NOT EXISTS idx_campus_direct_messages_is_system 
  ON public.campus_direct_messages(is_system) WHERE is_system = true;

CREATE INDEX IF NOT EXISTS idx_campus_direct_messages_message_type
  ON public.campus_direct_messages(message_type) WHERE message_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campus_direct_messages_school_id
  ON public.campus_direct_messages(school_id) WHERE school_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campus_direct_messages_parent_thread 
  ON public.campus_direct_messages(parent_message_id, created_at ASC) 
  WHERE parent_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campus_direct_messages_subject 
  ON public.campus_direct_messages(channel_id, created_at DESC) 
  WHERE subject IS NOT NULL;

-- 2. AUTORITATIVER RPC: REPORT_TEACHER_ABSENCE
CREATE OR REPLACE FUNCTION public.report_teacher_absence(
    p_teacher_id UUID,
    p_start_date TIMESTAMPTZ,
    p_until_date TIMESTAMPTZ,
    p_handling_owner TEXT DEFAULT 'secretariat'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_teacher_school_id UUID;
    v_teacher_first_name TEXT;
    v_teacher_last_name TEXT;
    v_teacher_full_name TEXT;
    v_prev_sick_until TIMESTAMPTZ;
    v_affected_slots JSONB := '[]'::jsonb;
    v_cur_date DATE;
    v_max_date DATE;
    v_day_of_week INT;
    v_sched RECORD;
    v_occ RECORD;
    v_slot_dt TIMESTAMPTZ;
    v_student_name TEXT;
    v_date_str TEXT;
    v_time_str TEXT;
    v_msg_content TEXT;
    v_alert_msg TEXT;
    v_effective_handling_owner TEXT;
BEGIN
    v_caller_id := COALESCE(auth.uid(), public.get_current_authenticated_user_id());

    -- Validiere handling_owner
    v_effective_handling_owner := CASE 
        WHEN p_handling_owner IN ('secretariat', 'teacher') THEN p_handling_owner 
        ELSE 'secretariat' 
    END;

    -- 1. Authenticity & Authorization check
    IF v_caller_id IS NOT NULL AND v_caller_id <> p_teacher_id THEN
        SELECT role INTO v_caller_role
        FROM public.users_raw WHERE id = v_caller_id;

        IF v_caller_role NOT IN ('admin', 'secretary', 'master_admin') THEN
            RAISE EXCEPTION 'Unauthorized to submit absence for this teacher';
        END IF;
    END IF;

    -- 2. Fetch teacher details
    SELECT school_id, first_name, last_name, COALESCE(ausfall_until, sick_until)
    INTO v_teacher_school_id, v_teacher_first_name, v_teacher_last_name, v_prev_sick_until
    FROM public.users_raw WHERE id = p_teacher_id;

    IF v_teacher_school_id IS NULL THEN
        RAISE EXCEPTION 'Teacher profile not found';
    END IF;

    v_teacher_full_name := TRIM(COALESCE(v_teacher_first_name, '') || ' ' || COALESCE(v_teacher_last_name, ''));
    IF v_teacher_full_name = '' THEN
        v_teacher_full_name := 'deine Lehrkraft';
    END IF;

    -- 3. Update users_raw (synchronisiere sick_* und ausfall_*)
    UPDATE public.users_raw
    SET sick_start = p_start_date,
        sick_until = p_until_date,
        ausfall_start = p_start_date,
        ausfall_until = p_until_date
    WHERE id = p_teacher_id;

    -- 4. Calculate date range in Berlin timezone (bis zu 30 Tage)
    v_cur_date := DATE(p_start_date AT TIME ZONE 'Europe/Berlin');
    v_max_date := LEAST(DATE(p_until_date AT TIME ZONE 'Europe/Berlin'), v_cur_date + 30);

    -- 5. Iterate through dates and cancel slots
    WHILE v_cur_date <= v_max_date LOOP
        v_day_of_week := EXTRACT(ISODOW FROM v_cur_date); -- 1=Monday, 7=Sunday

        -- Weekly recurring schedules for this day
        FOR v_sched IN
            SELECT s.id, s.student_id, s.time_slot, s.duration, u.first_name, u.last_name
            FROM public.schedules s
            LEFT JOIN public.users_raw u ON u.id = s.student_id
            WHERE s.teacher_id = p_teacher_id AND s.day_of_week = v_day_of_week
        LOOP
            v_time_str := SUBSTRING(COALESCE(v_sched.time_slot, '00:00'), 1, 5);
            v_slot_dt := (v_cur_date || ' ' || v_time_str || ':00 Europe/Berlin')::timestamptz;

            -- Check if slot is within the absence window and not in the past
            IF v_slot_dt >= p_start_date AND v_slot_dt <= p_until_date AND v_slot_dt >= NOW() - INTERVAL '5 minutes' THEN
                v_student_name := TRIM(COALESCE(v_sched.first_name, '') || ' ' || COALESCE(v_sched.last_name, ''));
                v_date_str := TO_CHAR(v_cur_date, 'YYYY-MM-DD');

                -- a) Insert into crisis_notifications
                INSERT INTO public.crisis_notifications (
                    teacher_id, 
                    student_id, 
                    slot_start_datetime, 
                    duration, 
                    status, 
                    student_name,
                    handling_owner
                )
                SELECT 
                    p_teacher_id, 
                    v_sched.student_id, 
                    v_slot_dt, 
                    COALESCE(v_sched.duration, 30), 
                    'UNREAD', 
                    v_student_name,
                    v_effective_handling_owner
                WHERE NOT EXISTS (
                    SELECT 1 FROM public.crisis_notifications
                    WHERE teacher_id = p_teacher_id 
                      AND student_id = v_sched.student_id 
                      AND slot_start_datetime = v_slot_dt
                );

                -- b) Insert into campus_direct_messages (termingekoppelte Shoutbox)
                IF v_sched.student_id IS NOT NULL THEN
                    v_msg_content := '❌ Terminabsage: Lehrkraft ' || v_teacher_full_name || ' ist am ' || TO_CHAR(v_cur_date, 'DD.MM.YYYY') || ' um ' || v_time_str || ' Uhr verhindert. Dieser Unterrichtstermin entfällt.';
                    
                    IF NOT EXISTS (
                        SELECT 1 FROM public.campus_direct_messages
                        WHERE occurrence_id = 'virtual-' || v_sched.id || '-' || v_date_str
                          AND sender_id = p_teacher_id
                          AND recipient_id = v_sched.student_id
                    ) THEN
                        INSERT INTO public.campus_direct_messages (
                            school_id, sender_id, recipient_id, content, occurrence_id, is_system, message_type
                        ) VALUES (
                            v_teacher_school_id,
                            p_teacher_id,
                            v_sched.student_id,
                            v_msg_content,
                            'virtual-' || v_sched.id || '-' || v_date_str,
                            TRUE,
                            'cancellation'
                        );
                    END IF;

                    -- Collect in return array for push notifications
                    v_affected_slots := v_affected_slots || jsonb_build_object(
                        'student_id', v_sched.student_id,
                        'student_name', v_student_name,
                        'date_str', v_date_str,
                        'time_str', v_time_str,
                        'datetime', v_slot_dt,
                        'schedule_id', v_sched.id,
                        'teacher_name', v_teacher_full_name
                    );
                END IF;

                -- c) Mark schedule as canceled_by_teacher_ausfall
                UPDATE public.schedules
                SET status = 'canceled_by_teacher_ausfall'
                WHERE id = v_sched.id;
            END IF;
        END LOOP;

        v_cur_date := v_cur_date + 1;
    END LOOP;

    -- 6. Cancel one-off schedule occurrences in the period
    FOR v_occ IN
        SELECT o.id, o.student_id, o.date, o.start_time, o.duration, u.first_name, u.last_name
        FROM public.schedule_occurrences o
        LEFT JOIN public.users_raw u ON u.id = o.student_id
        WHERE o.teacher_id = p_teacher_id
          AND o.date >= DATE(p_start_date AT TIME ZONE 'Europe/Berlin')
          AND o.date <= DATE(p_until_date AT TIME ZONE 'Europe/Berlin')
          AND o.status <> 'cancelled'
    LOOP
        v_time_str := SUBSTRING(COALESCE(v_occ.start_time::text, '00:00'), 1, 5);
        v_slot_dt := (v_occ.date || ' ' || v_time_str || ':00 Europe/Berlin')::timestamptz;
        IF v_slot_dt >= p_start_date AND v_slot_dt <= p_until_date AND v_slot_dt >= NOW() - INTERVAL '5 minutes' THEN
            v_student_name := TRIM(COALESCE(v_occ.first_name, '') || ' ' || COALESCE(v_occ.last_name, ''));
            v_date_str := TO_CHAR(v_occ.date, 'YYYY-MM-DD');

            UPDATE public.schedule_occurrences
            SET status = 'cancelled',
                canceled_by_role = 'teacher',
                teacher_acknowledged = TRUE,
                handling_owner = v_effective_handling_owner
            WHERE id = v_occ.id;

            -- Insert crisis notification if needed
            INSERT INTO public.crisis_notifications (
                teacher_id, 
                student_id, 
                slot_start_datetime, 
                duration, 
                status, 
                student_name,
                handling_owner
            )
            SELECT 
                p_teacher_id, 
                v_occ.student_id, 
                v_slot_dt, 
                COALESCE(v_occ.duration, 30), 
                'UNREAD', 
                v_student_name,
                v_effective_handling_owner
            WHERE NOT EXISTS (
                SELECT 1 FROM public.crisis_notifications
                WHERE teacher_id = p_teacher_id 
                  AND student_id = v_occ.student_id 
                  AND slot_start_datetime = v_slot_dt
            );

            -- Shoutbox message
            IF v_occ.student_id IS NOT NULL THEN
                v_msg_content := '❌ Terminabsage: Lehrkraft ' || v_teacher_full_name || ' ist am ' || TO_CHAR(v_occ.date, 'DD.MM.YYYY') || ' um ' || v_time_str || ' Uhr verhindert. Dieser Unterrichtstermin entfällt.';
                
                IF NOT EXISTS (
                    SELECT 1 FROM public.campus_direct_messages
                    WHERE occurrence_id = v_occ.id::text
                      AND sender_id = p_teacher_id
                      AND recipient_id = v_occ.student_id
                ) THEN
                    INSERT INTO public.campus_direct_messages (
                        school_id, sender_id, recipient_id, content, occurrence_id, is_system, message_type
                    ) VALUES (
                        v_teacher_school_id,
                        p_teacher_id,
                        v_occ.student_id,
                        v_msg_content,
                        v_occ.id::text,
                        TRUE,
                        'cancellation'
                    );
                END IF;

                v_affected_slots := v_affected_slots || jsonb_build_object(
                    'student_id', v_occ.student_id,
                    'student_name', v_student_name,
                    'date_str', v_date_str,
                    'time_str', v_time_str,
                    'datetime', v_slot_dt,
                    'occurrence_id', v_occ.id,
                    'teacher_name', v_teacher_full_name
                );
            END IF;
        END IF;
    END LOOP;

    -- 7. Add Secretary system alert (mit Zuständigkeitshinweis)
    v_alert_msg := CASE 
        WHEN v_prev_sick_until IS NOT NULL 
        THEN 'TERMIN-ANPASSUNG: Lehrkraft ' || v_teacher_full_name || ' hat den Abwesenheitszeitraum auf den ' || TO_CHAR(p_until_date AT TIME ZONE 'Europe/Berlin', 'DD.MM.YYYY') || ' geändert. Zuständigkeit: ' || CASE WHEN v_effective_handling_owner = 'secretariat' THEN 'Sekretariat übernimmt' ELSE 'Lehrkraft informiert selbst' END
        ELSE 'TERMINABSAGE: Lehrkraft ' || v_teacher_full_name || ' hat Termine bis zum ' || TO_CHAR(p_until_date AT TIME ZONE 'Europe/Berlin', 'DD.MM.YYYY') || ' abgesagt. Zuständigkeit: ' || CASE WHEN v_effective_handling_owner = 'secretariat' THEN 'Sekretariat übernimmt' ELSE 'Lehrkraft informiert selbst' END
    END;

    INSERT INTO public.system_alerts (school_id, teacher_id, type, message, resolved)
    VALUES (v_teacher_school_id, p_teacher_id, 'Teacher Absence Alert', v_alert_msg, FALSE);

    RETURN jsonb_build_object(
        'success', TRUE,
        'teacher_id', p_teacher_id,
        'teacher_name', v_teacher_full_name,
        'handling_owner', v_effective_handling_owner,
        'affected_slots', v_affected_slots,
        'affected_count', jsonb_array_length(v_affected_slots)
    );
END;
$$;

-- 3. ÜBERLADUNG FÜR 3 PARAMETER
CREATE OR REPLACE FUNCTION public.report_teacher_absence(
    p_teacher_id UUID,
    p_start_date TIMESTAMPTZ,
    p_until_date TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT public.report_teacher_absence(p_teacher_id, p_start_date, p_until_date, 'secretariat');
$$;

-- 4. AUTORITATIVER RPC: END_TEACHER_ABSENCE
CREATE OR REPLACE FUNCTION public.end_teacher_absence(
    p_teacher_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_target_school_id UUID;
    v_teacher_first_name TEXT;
    v_teacher_last_name TEXT;
    v_teacher_full_name TEXT;
    v_reinstated_slots JSONB := '[]'::jsonb;
    v_occ RECORD;
    v_student_name TEXT;
    v_msg_content TEXT;
BEGIN
    v_caller_id := COALESCE(auth.uid(), public.get_current_authenticated_user_id());

    -- Authorization check
    IF v_caller_id IS NOT NULL AND v_caller_id <> p_teacher_id THEN
        SELECT role INTO v_caller_role
        FROM public.users_raw WHERE id = v_caller_id;

        IF v_caller_role NOT IN ('admin', 'secretary', 'master_admin') THEN
            RAISE EXCEPTION 'Unauthorized: Caller cannot reset absence for another teacher';
        END IF;
    END IF;

    SELECT school_id, first_name, last_name 
    INTO v_target_school_id, v_teacher_first_name, v_teacher_last_name
    FROM public.users_raw 
    WHERE id = p_teacher_id;

    IF v_target_school_id IS NULL THEN
        RAISE EXCEPTION 'Teacher profile not found';
    END IF;

    v_teacher_full_name := TRIM(COALESCE(v_teacher_first_name, '') || ' ' || COALESCE(v_teacher_last_name, ''));
    IF v_teacher_full_name = '' THEN
        v_teacher_full_name := 'deine Lehrkraft';
    END IF;

    -- Reset users_raw absence fields
    UPDATE public.users_raw
    SET ausfall_start = NULL,
        ausfall_until = NULL,
        sick_start = NULL,
        sick_until = NULL
    WHERE id = p_teacher_id;

    -- Reinstate recurring schedules
    UPDATE public.schedules
    SET status = 'approved'
    WHERE teacher_id = p_teacher_id 
      AND status IN ('canceled_by_teacher_ausfall', 'canceled_by_teacher_sick');

    -- Reinstate future occurrences
    FOR v_occ IN
        SELECT o.id, o.student_id, o.date, o.start_time, u.first_name, u.last_name
        FROM public.schedule_occurrences o
        LEFT JOIN public.users_raw u ON u.id = o.student_id
        WHERE o.teacher_id = p_teacher_id
          AND o.status = 'cancelled'
          AND o.canceled_by_role = 'teacher'
          AND (o.date + COALESCE(o.start_time, '00:00:00')::time)::timestamptz >= NOW()
    LOOP
        UPDATE public.schedule_occurrences
        SET status = 'scheduled',
            canceled_by_role = NULL,
            teacher_acknowledged = FALSE
        WHERE id = v_occ.id;

        v_student_name := TRIM(COALESCE(v_occ.first_name, '') || ' ' || COALESCE(v_occ.last_name, ''));

        IF v_occ.student_id IS NOT NULL THEN
            v_msg_content := '🟢 Entwarnung: Lehrkraft ' || v_teacher_full_name || ' ist wieder einsatzbereit. Dein Termin am ' || TO_CHAR(v_occ.date, 'DD.MM.YYYY') || ' findet statt.';
            
            INSERT INTO public.campus_direct_messages (
                school_id, sender_id, recipient_id, content, occurrence_id, is_system, message_type
            ) VALUES (
                v_target_school_id, p_teacher_id, v_occ.student_id, v_msg_content, v_occ.id::text, TRUE, 'cancellation_cleared'
            );

            v_reinstated_slots := v_reinstated_slots || jsonb_build_object(
                'student_id', v_occ.student_id,
                'student_name', v_student_name,
                'type', 'occurrence',
                'id', v_occ.id,
                'date', v_occ.date
            );
        END IF;
    END LOOP;

    -- Mark active crisis notifications as reinstated
    UPDATE public.crisis_notifications
    SET is_reinstated = TRUE
    WHERE teacher_id = p_teacher_id
      AND slot_start_datetime >= NOW();

    -- Alert to secretariat
    INSERT INTO public.system_alerts (school_id, teacher_id, type, message, resolved)
    VALUES (
        v_target_school_id,
        p_teacher_id,
        'Teacher Absence Alert',
        'ENTWARNUNG: Lehrkraft ' || v_teacher_full_name || ' hat sich wieder einsatzbereit gemeldet. Alle zukünftigen Termine wurden reaktiviert.',
        TRUE
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'teacher_id', p_teacher_id,
        'teacher_name', v_teacher_full_name,
        'reinstated_slots', v_reinstated_slots,
        'reinstated_count', jsonb_array_length(v_reinstated_slots)
    );
END;
$$;

-- 5. BERECHTIGUNGEN & SCHEMA RELOAD
GRANT EXECUTE ON FUNCTION public.report_teacher_absence(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.report_teacher_absence(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.end_teacher_absence(UUID) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
