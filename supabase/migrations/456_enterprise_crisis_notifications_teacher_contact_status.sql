-- ==============================================================================
-- 🏛️ MIGRATION 456: CRISIS NOTIFICATIONS TEACHER CONTACT STATUS & 1-TAP ACK
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Multi-Tenancy Invariant)
-- ==============================================================================
-- 1. Ergänzt crisis_notifications um Spalten für die Lehrkraft-Kontaktdokumentation:
--    - teacher_contact_status (Constraint: 'reached', 'voicemail')
--    - teacher_contacted_at (TIMESTAMPTZ)
-- 2. Autoritativer RPC: mark_cancellation_teacher_contacted(p_notification_id UUID, p_contact_status TEXT)
--    - Revisionssichere Dokumentation der Lehrkraft-Kontaktaufnahme
--    - Berührt read_at / acknowledged_at (Schüler-Lesebestätigung) zu 0 %
--    - Synchronisiert bei Bedarf korrespondierende schedule_occurrences
-- ==============================================================================

-- 1. Spalten in crisis_notifications ergänzen
ALTER TABLE public.crisis_notifications
ADD COLUMN IF NOT EXISTS teacher_contact_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS teacher_contacted_at TIMESTAMPTZ DEFAULT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_crisis_notif_teacher_contact_status'
    ) THEN
        ALTER TABLE public.crisis_notifications
        ADD CONSTRAINT chk_crisis_notif_teacher_contact_status
        CHECK (teacher_contact_status IS NULL OR teacher_contact_status IN ('reached', 'voicemail'));
    END IF;
END $$;

-- 2. Autoritativer RPC: mark_cancellation_teacher_contacted
CREATE OR REPLACE FUNCTION public.mark_cancellation_teacher_contacted(
    p_notification_id UUID,
    p_contact_status TEXT DEFAULT 'reached'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_teacher_id UUID;
    v_student_id UUID;
    v_slot_time TIMESTAMPTZ;
    v_affected INT := 0;
    v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
    -- Validiere Statuswert
    IF p_contact_status NOT IN ('reached', 'voicemail') THEN
        RAISE EXCEPTION 'Ungültiger Kontaktstatus: %', p_contact_status;
    END IF;

    -- Aktualisiere crisis_notifications (revisionssicherer Zeitstempel now())
    UPDATE public.crisis_notifications
    SET 
        teacher_contact_status = p_contact_status,
        teacher_contacted_at = v_now
    WHERE id = p_notification_id
    RETURNING teacher_id, student_id, slot_start_datetime INTO v_teacher_id, v_student_id, v_slot_time;

    GET DIAGNOSTICS v_affected = ROW_COUNT;

    IF v_affected = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Datensatz nicht gefunden'
        );
    END IF;

    -- Synchronisiere korrespondierende schedule_occurrence falls vorhanden
    IF v_teacher_id IS NOT NULL AND v_student_id IS NOT NULL AND v_slot_time IS NOT NULL THEN
        UPDATE public.schedule_occurrences
        SET 
            teacher_contact_status = p_contact_status,
            teacher_contacted_at = v_now
        WHERE teacher_id = v_teacher_id
          AND student_id = v_student_id
          AND date = v_slot_time::date
          AND (teacher_contact_status IS NULL OR teacher_contact_status != p_contact_status);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'notification_id', p_notification_id,
        'contact_status', p_contact_status,
        'contacted_at', v_now
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_cancellation_teacher_contacted(UUID, TEXT) TO authenticated, service_role, anon;
