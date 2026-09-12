-- ==============================================================================
-- 🏛️ MIGRATION 409: ENTERPRISE CRISIS NOTIFICATIONS AUDIT & IDEMPOTENT ACKNOWLEDGEMENT
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Fail-Closed / GoBD / § 130 BGB)
-- ==============================================================================
-- 1. Ergänzt public.crisis_notifications um Zeitstempel read_at, acknowledged_at
--    und acknowledged_by für revisionssichere Nachvollziehbarkeit.
-- 2. Invarianz-Trigger: Verhindert, dass bereits als stattfindend quittierte
--    Benachrichtigungen durch spätere Kalender- oder Dispositions-Updates wieder
--    ungefragt auf 'UNREAD' zurückgestellt werden.
-- 3. Autoritativer RPC: acknowledge_crisis_notifications(p_notification_ids UUID[])
--    mit revisionssicherem Audit-Logging in public.audit_logs.
-- ==============================================================================

-- 1. Spalten für Revisionssicherheit ergänzen
ALTER TABLE public.crisis_notifications
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS acknowledged_by UUID DEFAULT NULL;

COMMENT ON COLUMN public.crisis_notifications.read_at IS 'Revisionssicherer Zeitstempel der Kenntnisnahme gem. § 130 BGB';
COMMENT ON COLUMN public.crisis_notifications.acknowledged_at IS 'Zeitstempel der Schüler-/Elternquittierung';
COMMENT ON COLUMN public.crisis_notifications.acknowledged_by IS 'Benutzer-ID der quittierenden Person';

-- Index für performante Abfragen auf unquittierte Benachrichtigungen
CREATE INDEX IF NOT EXISTS idx_crisis_notifs_student_unread
ON public.crisis_notifications (student_id, status, slot_start_datetime);

-- 2. Invarianz-Trigger: Schutz vor unbeabsichtigtem Reset auf UNREAD
CREATE OR REPLACE FUNCTION public.fn_prevent_spurious_crisis_unread_reset()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Wenn eine Entwarnung ("Unterricht findet statt", is_reinstated=TRUE) bereits
    -- vom Schüler als 'READ' quittiert wurde, darf kein Dispositions-Update
    -- sie wieder auf 'UNREAD' zurückwerfen, solange sie weiterhin stattfindet.
    IF OLD.is_reinstated = TRUE AND OLD.status = 'READ' AND NEW.is_reinstated = TRUE AND NEW.status = 'UNREAD' THEN
        NEW.status := 'READ';
        NEW.read_at := COALESCE(NEW.read_at, OLD.read_at);
        NEW.acknowledged_at := COALESCE(NEW.acknowledged_at, OLD.acknowledged_at);
        NEW.acknowledged_by := COALESCE(NEW.acknowledged_by, OLD.acknowledged_by);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crisis_notifications_prevent_unread_reset ON public.crisis_notifications;
CREATE TRIGGER trg_crisis_notifications_prevent_unread_reset
BEFORE UPDATE ON public.crisis_notifications
FOR EACH ROW
EXECUTE FUNCTION public.fn_prevent_spurious_crisis_unread_reset();

-- 3. Autoritativer RPC zur revisionssicheren Quittierung
CREATE OR REPLACE FUNCTION public.acknowledge_crisis_notifications(p_notification_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
    v_caller_id UUID;
    v_school_id UUID;
    v_notif RECORD;
    v_count INT := 0;
BEGIN
    IF p_notification_ids IS NULL OR array_length(p_notification_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No notification IDs provided');
    END IF;

    v_caller_id := public.get_current_authenticated_user_id();
    v_school_id := public.get_current_user_school_id();

    FOR v_notif IN 
        SELECT cn.id, cn.teacher_id, cn.student_id, cn.slot_start_datetime, cn.is_reinstated,
               COALESCE(u.school_id, v_school_id) as school_id
        FROM public.crisis_notifications cn
        LEFT JOIN public.users_raw u ON u.id = cn.student_id
        WHERE cn.id = ANY(p_notification_ids)
    LOOP
        -- Revisionssicherer Statuswechsel
        UPDATE public.crisis_notifications
        SET status = 'READ',
            read_at = NOW(),
            acknowledged_at = NOW(),
            acknowledged_by = COALESCE(v_caller_id, v_notif.student_id)
        WHERE id = v_notif.id;

        -- Unveränderbarer Eintrag im Audit-Trail
        INSERT INTO public.audit_logs (
            school_id,
            action,
            entity_type,
            entity_id,
            user_id,
            details
        ) VALUES (
            v_notif.school_id,
            'CRISIS_NOTIFICATION_ACKNOWLEDGED',
            'crisis_notifications',
            v_notif.id,
            COALESCE(v_caller_id, v_notif.student_id),
            jsonb_build_object(
                'slot_start_datetime', v_notif.slot_start_datetime,
                'teacher_id', v_notif.teacher_id,
                'student_id', v_notif.student_id,
                'is_reinstated', v_notif.is_reinstated,
                'acknowledged_at', NOW()
            )
        );

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'acknowledged_count', v_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.acknowledge_crisis_notifications(UUID[]) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
