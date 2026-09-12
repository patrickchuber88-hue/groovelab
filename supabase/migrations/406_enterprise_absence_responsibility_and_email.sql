-- ==============================================================================
-- 🏛️ MIGRATION 406: ENTERPRISE ABSENCE RESPONSIBILITY & DEDICATED ABSENCE EMAIL
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Multi-Tenancy Invariant)
-- ==============================================================================
-- 1. Ergänzt public.schools um absence_email (dezidierte E-Mail für Ausfallmeldungen)
-- 2. Ergänzt public.crisis_notifications und schedule_occurrences um handling_owner
--    ('secretariat' | 'teacher') zur klaren Zuständigkeitstrennung ohne Doppel-Anrufe
-- 3. Aktualisiert report_teacher_absence(p_teacher_id, p_start_date, p_until_date, p_handling_owner)
-- 4. Autoritativer RPC: claim_crisis_ticket_by_secretariat(p_ticket_id)
-- 5. Strikte Einhaltung des Verbots von "krank / Krankmeldung"
-- ==============================================================================

-- 1. Spalte absence_email auf schools ergänzen
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS absence_email TEXT DEFAULT NULL;

COMMENT ON COLUMN public.schools.absence_email IS 'Dezidierte E-Mail-Adresse für Unterrichtsausfälle und Abwesenheiten (z.B. ausfall@musikschule-stadt.de)';

-- 2. Spalte handling_owner auf crisis_notifications ergänzen
ALTER TABLE public.crisis_notifications
ADD COLUMN IF NOT EXISTS handling_owner TEXT NOT NULL DEFAULT 'secretariat';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_crisis_notifs_handling_owner'
    ) THEN
        ALTER TABLE public.crisis_notifications
        ADD CONSTRAINT chk_crisis_notifs_handling_owner
        CHECK (handling_owner IN ('secretariat', 'teacher'));
    END IF;
END $$;

-- Spalte handling_owner auf schedule_occurrences ergänzen
ALTER TABLE public.schedule_occurrences
ADD COLUMN IF NOT EXISTS handling_owner TEXT NOT NULL DEFAULT 'secretariat';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_sched_occ_handling_owner'
    ) THEN
        ALTER TABLE public.schedule_occurrences
        ADD CONSTRAINT chk_sched_occ_handling_owner
        CHECK (handling_owner IN ('secretariat', 'teacher'));
    END IF;
END $$;

-- 3. report_teacher_absence aktualisieren (mit optionalem p_handling_owner Parameter)
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
    v_caller_id := auth.uid();

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
    SELECT school_id, first_name, last_name, sick_until
    INTO v_teacher_school_id, v_teacher_first_name, v_teacher_last_name, v_prev_sick_until
    FROM public.users_raw WHERE id = p_teacher_id;

    IF v_teacher_school_id IS NULL THEN
        RAISE EXCEPTION 'Teacher profile not found';
    END IF;

    v_teacher_full_name := TRIM(COALESCE(v_teacher_first_name, '') || ' ' || COALESCE(v_teacher_last_name, ''));
    IF v_teacher_full_name = '' THEN
        v_teacher_full_name := 'deine Lehrkraft';
    END IF;

    -- 3. Update users_raw
    UPDATE public.users_raw
    SET sick_start = p_start_date,
        sick_until = p_until_date
    WHERE id = p_teacher_id;

    -- 4. Calculate date range (up to 30 days max from start date)
    v_cur_date := DATE(p_start_date);
    v_max_date := LEAST(DATE(p_until_date), v_cur_date + 30);

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
            v_slot_dt := (v_cur_date || ' ' || COALESCE(v_sched.time_slot, '00:00') || ':00')::timestamptz;

            -- Check if slot is within the absence window and in future/today
            IF v_slot_dt >= p_start_date AND v_slot_dt <= p_until_date AND v_slot_dt >= NOW() - INTERVAL '5 minutes' THEN
                v_student_name := TRIM(COALESCE(v_sched.first_name, '') || ' ' || COALESCE(v_sched.last_name, ''));
                v_date_str := TO_CHAR(v_cur_date, 'YYYY-MM-DD');
                v_time_str := SUBSTRING(COALESCE(v_sched.time_slot, '00:00'), 1, 5);

                -- a) Insert into crisis_notifications (mit handling_owner)
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
                    
                    INSERT INTO public.campus_direct_messages (
                        sender_id, recipient_id, content, occurrence_id, is_system, message_type
                    ) VALUES (
                        p_teacher_id,
                        v_sched.student_id,
                        v_msg_content,
                        'virtual-' || v_sched.id || '-' || v_date_str,
                        TRUE,
                        'cancellation'
                    );

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

                -- c) Mark schedule as canceled_by_teacher_sick
                UPDATE public.schedules
                SET status = 'canceled_by_teacher_sick'
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
          AND o.date >= DATE(p_start_date)
          AND o.date <= DATE(p_until_date)
          AND o.status <> 'cancelled'
    LOOP
        v_slot_dt := (v_occ.date || ' ' || COALESCE(v_occ.start_time, '00:00:00'))::timestamptz;
        IF v_slot_dt >= p_start_date AND v_slot_dt <= p_until_date AND v_slot_dt >= NOW() - INTERVAL '5 minutes' THEN
            v_student_name := TRIM(COALESCE(v_occ.first_name, '') || ' ' || COALESCE(v_occ.last_name, ''));
            v_date_str := TO_CHAR(v_occ.date, 'YYYY-MM-DD');
            v_time_str := SUBSTRING(COALESCE(v_occ.start_time, '00:00'), 1, 5);

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
                
                INSERT INTO public.campus_direct_messages (
                    sender_id, recipient_id, content, occurrence_id, is_system, message_type
                ) VALUES (
                    p_teacher_id,
                    v_occ.student_id,
                    v_msg_content,
                    v_occ.id::text,
                    TRUE,
                    'cancellation'
                );

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
        THEN 'TERMIN-ANPASSUNG: Lehrkraft ' || v_teacher_full_name || ' hat den Abwesenheitszeitraum auf den ' || TO_CHAR(p_until_date, 'DD.MM.YYYY') || ' geändert. Zuständigkeit: ' || CASE WHEN v_effective_handling_owner = 'secretariat' THEN 'Sekretariat übernimmt' ELSE 'Lehrkraft informiert selbst' END
        ELSE 'TERMINABSAGE: Lehrkraft ' || v_teacher_full_name || ' hat Termine bis zum ' || TO_CHAR(p_until_date, 'DD.MM.YYYY') || ' abgesagt. Zuständigkeit: ' || CASE WHEN v_effective_handling_owner = 'secretariat' THEN 'Sekretariat übernimmt' ELSE 'Lehrkraft informiert selbst' END
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

-- 4. Autoritativer RPC: claim_crisis_ticket_by_secretariat
CREATE OR REPLACE FUNCTION public.claim_crisis_ticket_by_secretariat(
    p_ticket_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_ticket RECORD;
BEGIN
    v_caller_id := auth.uid();

    SELECT role INTO v_caller_role
    FROM public.users_raw WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('admin', 'secretary', 'master_admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only secretariat can claim tickets';
    END IF;

    SELECT * INTO v_ticket
    FROM public.crisis_notifications
    WHERE id = p_ticket_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ticket not found');
    END IF;

    UPDATE public.crisis_notifications
    SET handling_owner = 'secretariat'
    WHERE id = p_ticket_id;

    -- Revisionssicheres Audit-Logging
    INSERT INTO public.audit_logs (
        school_id, action, entity_type, entity_id, user_id, details
    ) VALUES (
        (SELECT school_id FROM public.users_raw WHERE id = v_ticket.teacher_id),
        'claim_crisis_ticket',
        'crisis_notifications',
        p_ticket_id,
        v_caller_id,
        jsonb_build_object('previous_owner', v_ticket.handling_owner, 'new_owner', 'secretariat')
    );

    RETURN jsonb_build_object('success', true, 'ticket_id', p_ticket_id, 'handling_owner', 'secretariat');
END;
$$;

-- Berechtigungen gewähren
GRANT EXECUTE ON FUNCTION public.report_teacher_absence(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.claim_crisis_ticket_by_secretariat(UUID) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
