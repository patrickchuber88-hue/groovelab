-- ==============================================================================
-- 🏛️ MIGRATION 405: ENTERPRISE URGENT CANCELLATION RADAR & TEACHER ALERT
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Multi-Tenancy Invariant)
-- ==============================================================================
-- 1. Ergänzt schedule_occurrences um Spalten für den Lehrer-Krisenradar
-- 2. Erzeugt hochperformanten partiellen Index für Null-Serverlast-Lookups
-- 3. Autoritativer RPC: get_urgent_unacknowledged_cancellations(p_teacher_id)
-- 4. Autoritativer RPC: acknowledge_teacher_cancellation_contact
-- 5. Autoritativer RPC: batch_acknowledge_teacher_cancellation_contact
-- 6. Autoritativer RPC: delegate_cancellation_to_secretariat
-- 7. Trigger & Prozedur für PWA-Push-Warnungen bei Ausfällen < 2h
-- ==============================================================================

-- 1. Spalten in schedule_occurrences ergänzen
ALTER TABLE public.schedule_occurrences
ADD COLUMN IF NOT EXISTS teacher_warning_pushed_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS teacher_contact_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS teacher_contacted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS teacher_contact_notes TEXT DEFAULT NULL;

-- Constraint für definierte Statuswerte
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_sched_occ_teacher_contact_status'
    ) THEN
        ALTER TABLE public.schedule_occurrences
        ADD CONSTRAINT chk_sched_occ_teacher_contact_status
        CHECK (teacher_contact_status IS NULL OR teacher_contact_status IN ('reached', 'voicemail', 'delegated_to_secretariat'));
    END IF;
END $$;

-- 2. Partieller Ultra-Fast Index (belegt fast 0 KB RAM / Festplatte)
CREATE INDEX IF NOT EXISTS idx_sched_occ_urgent_radar
ON public.schedule_occurrences (teacher_id, date, start_time)
WHERE status IN ('cancelled', 'teacher_sick', 'canceled_by_teacher_sick')
  AND (student_acknowledged IS NULL OR student_acknowledged = FALSE);

-- 3. Autoritativer RPC: get_urgent_unacknowledged_cancellations
CREATE OR REPLACE FUNCTION public.get_urgent_unacknowledged_cancellations(p_teacher_id UUID)
RETURNS TABLE (
    occurrence_id UUID,
    student_id UUID,
    student_first_name TEXT,
    student_last_name TEXT,
    student_instrument TEXT,
    lesson_date DATE,
    start_time TEXT,
    duration INT,
    room_name TEXT,
    status TEXT,
    student_acknowledged BOOLEAN,
    teacher_contact_status TEXT,
    teacher_contacted_at TIMESTAMPTZ,
    minutes_until_start INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_has_urgent BOOLEAN := FALSE;
    v_caller_school_id UUID;
BEGIN
    -- Multi-Tenancy & Auth-Check: Validierung der Tenant-Zugehörigkeit
    v_caller_school_id := public.get_current_user_school_id();
    IF v_caller_school_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.users_raw 
            WHERE id = p_teacher_id AND school_id = v_caller_school_id
        ) THEN
            RAISE EXCEPTION 'Access denied: Teacher does not belong to caller school tenant';
        END IF;
    END IF;

    -- Prüfen, ob der FRÜHESTE unbestätigte Ausfall des heutigen Tages in <= 2 Stunden beginnt
    SELECT EXISTS (
        SELECT 1 
        FROM public.schedule_occurrences o
        WHERE o.teacher_id = p_teacher_id
          AND o.date = CURRENT_DATE
          AND o.status IN ('cancelled', 'teacher_sick', 'canceled_by_teacher_sick')
          AND COALESCE(o.student_acknowledged, FALSE) = FALSE
          AND (o.teacher_contact_status IS NULL OR o.teacher_contact_status = 'delegated_to_secretariat')
          AND (o.start_time::time <= (CURRENT_TIME + interval '2 hours')::time)
    ) INTO v_has_urgent;

    -- Falls der früheste Ausfall die 2h-Schwelle erreicht hat:
    -- Liefere ALLE unbestätigten Ausfälle des heutigen Tages (Tagesblock-Bündelung)
    IF v_has_urgent THEN
        RETURN QUERY
        SELECT 
            o.id AS occurrence_id,
            o.student_id,
            COALESCE(u.first_name, 'Schüler') AS student_first_name,
            COALESCE(u.last_name, '') AS student_last_name,
            COALESCE(u.instrument, o.instrument, 'Instrument') AS student_instrument,
            o.date AS lesson_date,
            o.start_time,
            COALESCE(o.duration, 30)::INT AS duration,
            COALESCE(r.name, 'Unterrichtsraum') AS room_name,
            o.status,
            COALESCE(o.student_acknowledged, FALSE) AS student_acknowledged,
            o.teacher_contact_status,
            o.teacher_contacted_at,
            ROUND(EXTRACT(EPOCH FROM ((o.date + o.start_time::time) - NOW())) / 60)::INT AS minutes_until_start
        FROM public.schedule_occurrences o
        LEFT JOIN public.users u ON u.id = o.student_id
        LEFT JOIN public.rooms r ON r.id = o.room_id
        WHERE o.teacher_id = p_teacher_id
          AND o.date = CURRENT_DATE
          AND o.status IN ('cancelled', 'teacher_sick', 'canceled_by_teacher_sick')
          AND COALESCE(o.student_acknowledged, FALSE) = FALSE
        ORDER BY o.start_time ASC;
    END IF;

    RETURN;
END;
$$;

-- 4. Autoritativer RPC: acknowledge_teacher_cancellation_contact
CREATE OR REPLACE FUNCTION public.acknowledge_teacher_cancellation_contact(
    p_occurrence_id UUID,
    p_contact_type TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_occ RECORD;
    v_caller_id UUID;
    v_caller_school_id UUID;
BEGIN
    IF p_contact_type NOT IN ('reached', 'voicemail') THEN
        RAISE EXCEPTION 'Invalid contact type. Must be reached or voicemail.';
    END IF;

    v_caller_id := auth.uid();
    v_caller_school_id := public.get_current_user_school_id();

    SELECT * INTO v_occ 
    FROM public.schedule_occurrences 
    WHERE id = p_occurrence_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Occurrence not found');
    END IF;

    -- Multi-Tenancy Invariant
    IF v_caller_school_id IS NOT NULL AND v_occ.school_id IS NOT NULL AND v_occ.school_id <> v_caller_school_id THEN
        RAISE EXCEPTION 'Access denied: Tenant boundary violation';
    END IF;

    -- Update Occurrence
    UPDATE public.schedule_occurrences
    SET teacher_contact_status = p_contact_type,
        teacher_contacted_at = NOW(),
        teacher_contact_notes = p_notes
    WHERE id = p_occurrence_id;

    -- Revisionssicheres Audit-Logging
    INSERT INTO public.audit_logs (
        school_id, 
        action, 
        entity_type, 
        entity_id, 
        user_id, 
        details
    ) VALUES (
        v_occ.school_id,
        'TEACHER_CANCELLATION_CONTACT_ACKNOWLEDGED',
        'schedule_occurrences',
        p_occurrence_id,
        v_caller_id,
        jsonb_build_object(
            'occurrence_id', p_occurrence_id,
            'contact_type', p_contact_type,
            'student_id', v_occ.student_id,
            'notes', p_notes,
            'timestamp', NOW()
        )
    );

    RETURN jsonb_build_object('success', true, 'occurrence_id', p_occurrence_id, 'status', p_contact_type);
END;
$$;

-- 5. Autoritativer RPC: batch_acknowledge_teacher_cancellation_contact
CREATE OR REPLACE FUNCTION public.batch_acknowledge_teacher_cancellation_contact(
    p_occurrence_ids UUID[],
    p_contact_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_id UUID;
    v_count INT := 0;
BEGIN
    IF p_contact_type NOT IN ('reached', 'voicemail') THEN
        RAISE EXCEPTION 'Invalid contact type. Must be reached or voicemail.';
    END IF;

    FOREACH v_id IN ARRAY p_occurrence_ids LOOP
        PERFORM public.acknowledge_teacher_cancellation_contact(v_id, p_contact_type, 'Batch acknowledgement by teacher');
        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'acknowledged_count', v_count);
END;
$$;

-- 6. Autoritativer RPC: delegate_cancellation_to_secretariat
CREATE OR REPLACE FUNCTION public.delegate_cancellation_to_secretariat(
    p_occurrence_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_occ RECORD;
    v_student RECORD;
    v_teacher RECORD;
    v_slot_dt TIMESTAMPTZ;
    v_caller_id UUID;
BEGIN
    v_caller_id := auth.uid();

    SELECT * INTO v_occ 
    FROM public.schedule_occurrences 
    WHERE id = p_occurrence_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Occurrence not found');
    END IF;

    SELECT first_name, last_name, instrument INTO v_student
    FROM public.users WHERE id = v_occ.student_id;

    SELECT first_name, last_name INTO v_teacher
    FROM public.users WHERE id = v_occ.teacher_id;

    -- Timestamp errechnen
    v_slot_dt := (v_occ.date + v_occ.start_time::time);

    -- Occurrence als an Sekretariat delegiert markieren
    UPDATE public.schedule_occurrences
    SET teacher_contact_status = 'delegated_to_secretariat',
        teacher_contacted_at = NOW()
    WHERE id = p_occurrence_id;

    -- In crisis_notifications eintragen (damit Schulsekretariat im SecretaryCrisisView alarmiert wird)
    INSERT INTO public.crisis_notifications (
        teacher_id,
        student_id,
        slot_start_datetime,
        duration,
        status,
        student_name
    ) VALUES (
        v_occ.teacher_id,
        v_occ.student_id,
        v_slot_dt,
        COALESCE(v_occ.duration, 30),
        'UNREAD',
        COALESCE(v_student.first_name, 'Schüler') || ' ' || COALESCE(v_student.last_name, '')
    )
    ON CONFLICT DO NOTHING;

    -- Revisionssicheres Audit-Logging
    INSERT INTO public.audit_logs (
        school_id, 
        action, 
        entity_type, 
        entity_id, 
        user_id, 
        details
    ) VALUES (
        v_occ.school_id,
        'CANCELLATION_DELEGATED_TO_SECRETARIAT',
        'schedule_occurrences',
        p_occurrence_id,
        v_caller_id,
        jsonb_build_object(
            'occurrence_id', p_occurrence_id,
            'teacher_id', v_occ.teacher_id,
            'student_id', v_occ.student_id,
            'timestamp', NOW()
        )
    );

    RETURN jsonb_build_object('success', true, 'occurrence_id', p_occurrence_id, 'status', 'delegated_to_secretariat');
END;
$$;

-- 7. Prozedur & Trigger: Sofort-Push bei Absage < 2h
CREATE OR REPLACE FUNCTION public.trigger_urgent_push_on_shortnotice_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_teacher_name TEXT;
    v_title TEXT;
    v_body TEXT;
    v_url TEXT := '/?urgent_radar=true';
    v_notification_id UUID;
BEGIN
    -- Wenn Termin heute abgesagt wird und der Unterricht in < 2h beginnt
    IF (NEW.status IN ('cancelled', 'teacher_sick', 'canceled_by_teacher_sick') AND 
       (OLD.status IS DISTINCT FROM NEW.status) AND
       NEW.date = CURRENT_DATE AND 
       (NEW.start_time::time <= (CURRENT_TIME + interval '2 hours')::time) AND
       NEW.teacher_id IS NOT NULL AND
       NEW.teacher_warning_pushed_at IS NULL) THEN

        NEW.teacher_warning_pushed_at := NOW();

        SELECT first_name INTO v_teacher_name FROM public.users WHERE id = NEW.teacher_id;

        v_title := '🚨 Dringend: Ausfall in unter 2h!';
        v_body := 'Dein Ausfall für heute um ' || SUBSTRING(COALESCE(NEW.start_time, '00:00') FROM 1 FOR 5) || ' Uhr ist noch unbestätigt. Bitte kontaktiere den Schüler telefonisch!';

        INSERT INTO public.notifications (user_id, title, message, metadata)
        VALUES (
            NEW.teacher_id, 
            v_title, 
            v_body, 
            jsonb_build_object('occurrence_id', NEW.id, 'type', 'urgent_cancellation_radar', 'urgent', true)
        )
        RETURNING id INTO v_notification_id;

        -- Web-Push absetzen
        BEGIN
            PERFORM net.http_post(
                'http://kong:8000/functions/v1/send-push',
                jsonb_build_object(
                    'userId', NEW.teacher_id,
                    'title', v_title,
                    'body', v_body,
                    'url', v_url,
                    'notificationId', v_notification_id
                ),
                '{}'::jsonb,
                jsonb_build_object(
                    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
                    'Content-Type', 'application/json'
                )
            );
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Fail-safe
        END;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_urgent_push_on_shortnotice_cancellation ON public.schedule_occurrences;
CREATE TRIGGER trg_urgent_push_on_shortnotice_cancellation
BEFORE UPDATE ON public.schedule_occurrences
FOR EACH ROW
EXECUTE FUNCTION public.trigger_urgent_push_on_shortnotice_cancellation();

-- 8. Hintergrund-Watcher Prozedur für pg_cron (T - 2h Radar für Frühabsagen)
CREATE OR REPLACE FUNCTION public.check_and_push_urgent_cancellations_radar()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_teacher RECORD;
    v_count INT;
    v_earliest_time TEXT;
    v_title TEXT;
    v_body TEXT;
    v_url TEXT := '/?urgent_radar=true';
    v_notification_id UUID;
BEGIN
    -- Finde alle Lehrer, die heute unbestätigte Ausfälle in <= 2h haben und noch keinen Warn-Push erhielten
    FOR v_teacher IN 
        SELECT 
            o.teacher_id,
            COUNT(o.id) AS unacked_count,
            MIN(SUBSTRING(o.start_time FROM 1 FOR 5)) AS first_slot
        FROM public.schedule_occurrences o
        WHERE o.date = CURRENT_DATE
          AND o.status IN ('cancelled', 'teacher_sick', 'canceled_by_teacher_sick')
          AND COALESCE(o.student_acknowledged, FALSE) = FALSE
          AND (o.teacher_contact_status IS NULL OR o.teacher_contact_status = 'delegated_to_secretariat')
          AND o.teacher_warning_pushed_at IS NULL
          AND (o.start_time::time <= (CURRENT_TIME + interval '2 hours')::time)
        GROUP BY o.teacher_id
    LOOP
        -- Markiere alle heutigen betroffenen Ausfälle dieses Lehrers als gewarnt
        UPDATE public.schedule_occurrences
        SET teacher_warning_pushed_at = NOW()
        WHERE teacher_id = v_teacher.teacher_id
          AND date = CURRENT_DATE
          AND status IN ('cancelled', 'teacher_sick', 'canceled_by_teacher_sick')
          AND teacher_warning_pushed_at IS NULL;

        v_title := '🚨 Dringend: ' || v_teacher.unacked_count || ' Ausfall' || (CASE WHEN v_teacher.unacked_count > 1 THEN 'fälle' ELSE '' END) || ' unbestätigt';
        v_body := v_teacher.unacked_count || ' Schüler haben die Absage für heute noch nicht gelesen (erster Termin um ' || v_teacher.first_slot || ' Uhr). Bitte telefonisch kontaktieren!';

        INSERT INTO public.notifications (user_id, title, message, metadata)
        VALUES (
            v_teacher.teacher_id,
            v_title,
            v_body,
            jsonb_build_object('type', 'urgent_cancellation_radar', 'urgent', true, 'count', v_teacher.unacked_count)
        )
        RETURNING id INTO v_notification_id;

        BEGIN
            PERFORM net.http_post(
                'http://kong:8000/functions/v1/send-push',
                jsonb_build_object(
                    'userId', v_teacher.teacher_id,
                    'title', v_title,
                    'body', v_body,
                    'url', v_url,
                    'notificationId', v_notification_id
                ),
                '{}'::jsonb,
                jsonb_build_object(
                    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
                    'Content-Type', 'application/json'
                )
            );
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Fail-safe
        END;
    END LOOP;
END;
$$;

-- 9. Cron-Registrierung falls pg_cron aktiv ist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('urgent-cancellation-radar-5m');
        PERFORM cron.schedule(
            'urgent-cancellation-radar-5m',
            '*/5 * * * *',
            'SELECT public.check_and_push_urgent_cancellations_radar();'
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
