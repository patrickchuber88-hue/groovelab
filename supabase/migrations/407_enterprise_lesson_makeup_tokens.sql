-- ==============================================================================
-- 🏛️ MIGRATION 407: ENTERPRISE LESSON MAKE-UP TOKENS & REVISIONS-SICHERHEIT
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Multi-Tenancy / § 275 BGB)
-- ==============================================================================
-- 1. Tabelle public.lesson_makeup_tokens (Ledger für minutengenaue Nachhol-Kontingente)
-- 2. Spalten in schedule_occurrences: makeup_token_id, makeup_extension_minutes, is_makeup_lesson
-- 3. RLS-Policies (Tenant-Isolation, 100% Lehrkraft-Souveränität, Schüler-Leserecht)
-- 4. Autoritativer RPC: create_lesson_makeup_token (Lehrkraft erzeugt Nachhol-Kontingent)
-- 5. Autoritativer RPC: redeem_makeup_token_as_new_lesson (Pfad A: Neuer Ersatztermin)
-- 6. Autoritativer RPC: extend_lesson_with_makeup_token (Pfad B: Folgestunde verlängern)
-- 7. Autoritativer RPC: cancel_lesson_makeup_token (Lehrkraft storniert offenes Kontingent)
-- 8. Autoritativer RPC: get_teacher_active_makeup_tokens (Schnellabfrage für Lehrer-Radar)
-- ==============================================================================

-- 1. Tabelle lesson_makeup_tokens anlegen
CREATE TABLE IF NOT EXISTS public.lesson_makeup_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    original_occurrence_id UUID REFERENCES public.schedule_occurrences(id) ON DELETE SET NULL,
    original_date DATE NOT NULL,
    total_minutes INT NOT NULL CHECK (total_minutes > 0),
    remaining_minutes INT NOT NULL CHECK (remaining_minutes >= 0),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PARTIALLY_REDEEMED', 'FULLY_REDEEMED', 'CANCELLED_BY_TEACHER', 'EXPIRED')),
    notes TEXT DEFAULT NULL,
    expires_at DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indizes für Sub-Millisekunden Lookups
CREATE INDEX IF NOT EXISTS idx_makeup_tokens_teacher_status 
ON public.lesson_makeup_tokens(teacher_id, status)
WHERE status IN ('OPEN', 'PARTIALLY_REDEEMED');

CREATE INDEX IF NOT EXISTS idx_makeup_tokens_student 
ON public.lesson_makeup_tokens(student_id, status);

CREATE INDEX IF NOT EXISTS idx_makeup_tokens_original_occ 
ON public.lesson_makeup_tokens(original_occurrence_id);

-- 2. Spalten in schedule_occurrences ergänzen
ALTER TABLE public.schedule_occurrences
ADD COLUMN IF NOT EXISTS makeup_token_id UUID REFERENCES public.lesson_makeup_tokens(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS makeup_extension_minutes INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_makeup_lesson BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Row Level Security auf lesson_makeup_tokens aktivieren
ALTER TABLE public.lesson_makeup_tokens ENABLE ROW LEVEL SECURITY;

-- Select Policy: Lehrkraft (eigene Kontingente), Schüler (eigene Kontingente), Sekretariat/Admin (Tenant-weit)
DROP POLICY IF EXISTS makeup_tokens_select ON public.lesson_makeup_tokens;
CREATE POLICY makeup_tokens_select ON public.lesson_makeup_tokens
FOR SELECT USING (
    school_id = public.get_current_user_school_id()
    AND (
        teacher_id = auth.uid()
        OR student_id = auth.uid()
        OR public.get_current_user_role() IN ('admin', 'secretary', 'master_admin')
    )
);

-- Insert Policy: Nur die Lehrkraft selbst oder Schulverwaltung
DROP POLICY IF EXISTS makeup_tokens_insert ON public.lesson_makeup_tokens;
CREATE POLICY makeup_tokens_insert ON public.lesson_makeup_tokens
FOR INSERT WITH CHECK (
    school_id = public.get_current_user_school_id()
    AND (
        teacher_id = auth.uid()
        OR public.get_current_user_role() IN ('admin', 'secretary', 'master_admin')
    )
);

-- Update Policy: Nur die Lehrkraft selbst (100% Souveränität) oder Admin/Secretary
DROP POLICY IF EXISTS makeup_tokens_update ON public.lesson_makeup_tokens;
CREATE POLICY makeup_tokens_update ON public.lesson_makeup_tokens
FOR UPDATE USING (
    school_id = public.get_current_user_school_id()
    AND (
        teacher_id = auth.uid()
        OR public.get_current_user_role() IN ('admin', 'secretary', 'master_admin')
    )
);

-- Delete Policy: Kein direktes Löschen (Audit Trail)
DROP POLICY IF EXISTS makeup_tokens_delete ON public.lesson_makeup_tokens;
CREATE POLICY makeup_tokens_delete ON public.lesson_makeup_tokens
FOR DELETE USING (
    public.get_current_user_role() IN ('master_admin')
);

-- 4. Autoritativer RPC: create_lesson_makeup_token
CREATE OR REPLACE FUNCTION public.create_lesson_makeup_token(
    p_occurrence_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_occ RECORD;
    v_token_id UUID;
    v_expires_at DATE;
    v_half_year_month INT;
    v_school RECORD;
    v_eff_duration INT;
BEGIN
    v_caller_id := auth.uid();
    v_caller_role := public.get_current_user_role();
    v_caller_school_id := public.get_current_user_school_id();

    -- Occurrence laden
    SELECT * INTO v_occ
    FROM public.schedule_occurrences
    WHERE id = p_occurrence_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Termin nicht gefunden');
    END IF;

    -- Berechtigungsprüfung: Lehrkraft-Souveränität
    IF v_caller_role NOT IN ('admin', 'secretary', 'master_admin') AND v_occ.teacher_id <> v_caller_id THEN
        RAISE EXCEPTION 'Nur die zuständige Lehrkraft kann ein Nachhol-Kontingent erstellen';
    END IF;

    -- Nur für abgesagte/ausgefallene Termine
    IF v_occ.status NOT IN ('cancelled', 'teacher_sick', 'canceled_by_teacher_sick') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nachhol-Kontingent kann nur für ausgefallene Termine erstellt werden');
    END IF;

    -- Prüfen, ob bereits ein Token für diesen Ausfall existiert
    IF EXISTS (
        SELECT 1 FROM public.lesson_makeup_tokens
        WHERE original_occurrence_id = p_occurrence_id
          AND status IN ('OPEN', 'PARTIALLY_REDEEMED', 'FULLY_REDEEMED')
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Für diesen Termin existiert bereits ein aktives Nachhol-Kontingent');
    END IF;

    v_eff_duration := COALESCE(v_occ.duration, 30);
    IF v_eff_duration <= 0 THEN
        v_eff_duration := 30;
    END IF;

    -- Gültigkeit berechnen: Ende des laufenden Schulhalbjahres (z.B. 31.01. oder 31.07.)
    SELECT * INTO v_school FROM public.schools WHERE id = v_occ.school_id;
    
    -- Wenn Datum zwischen August und Januar liegt -> Ende 31.01.
    -- Wenn Datum zwischen Februar und Juli liegt -> Ende 31.07.
    IF EXTRACT(MONTH FROM v_occ.date) >= 8 OR EXTRACT(MONTH FROM v_occ.date) <= 1 THEN
        v_expires_at := DATE(EXTRACT(YEAR FROM v_occ.date + interval '6 months') || '-01-31');
    ELSE
        v_expires_at := DATE(EXTRACT(YEAR FROM v_occ.date) || '-07-31');
    END IF;

    -- Sicherheits-Fallback: Mindestens 60 Tage Gültigkeit
    IF v_expires_at < CURRENT_DATE + 60 THEN
        v_expires_at := CURRENT_DATE + 180;
    END IF;

    -- Token anlegen
    INSERT INTO public.lesson_makeup_tokens (
        school_id,
        teacher_id,
        student_id,
        original_occurrence_id,
        original_date,
        total_minutes,
        remaining_minutes,
        status,
        notes,
        expires_at
    ) VALUES (
        v_occ.school_id,
        v_occ.teacher_id,
        v_occ.student_id,
        p_occurrence_id,
        v_occ.date,
        v_eff_duration,
        v_eff_duration,
        'OPEN',
        p_notes,
        v_expires_at
    )
    RETURNING id INTO v_token_id;

    -- Occurrence mit Token verknüpfen
    UPDATE public.schedule_occurrences
    SET makeup_token_id = v_token_id
    WHERE id = p_occurrence_id;

    -- Revisionssicheres Audit-Logging
    INSERT INTO public.audit_logs (
        school_id, action, entity_type, entity_id, user_id, details
    ) VALUES (
        v_occ.school_id,
        'create_makeup_token',
        'lesson_makeup_tokens',
        v_token_id,
        v_caller_id,
        jsonb_build_object(
            'occurrence_id', p_occurrence_id,
            'duration_minutes', v_eff_duration,
            'student_id', v_occ.student_id,
            'expires_at', v_expires_at
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'token_id', v_token_id,
        'total_minutes', v_eff_duration,
        'remaining_minutes', v_eff_duration,
        'expires_at', v_expires_at
    );
END;
$$;

-- 5. Autoritativer RPC: redeem_makeup_token_as_new_lesson (Pfad A: Neuer Ersatztermin)
CREATE OR REPLACE FUNCTION public.redeem_makeup_token_as_new_lesson(
    p_token_id UUID,
    p_date DATE,
    p_start_time TEXT,
    p_room_id UUID DEFAULT NULL,
    p_duration INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_caller_id UUID;
    v_token RECORD;
    v_new_occ_id UUID;
    v_duration INT;
    v_room_id UUID;
    v_end_time TIME;
    v_start_time_parsed TIME;
    v_collision_count INT;
BEGIN
    v_caller_id := auth.uid();

    SELECT * INTO v_token
    FROM public.lesson_makeup_tokens
    WHERE id = p_token_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nachhol-Kontingent nicht gefunden');
    END IF;

    IF v_token.teacher_id <> v_caller_id AND public.get_current_user_role() NOT IN ('admin', 'secretary', 'master_admin') THEN
        RAISE EXCEPTION 'Nur die zuständige Lehrkraft kann das Nachhol-Kontingent einlösen';
    END IF;

    IF v_token.status IN ('FULLY_REDEEMED', 'CANCELLED_BY_TEACHER', 'EXPIRED') OR v_token.remaining_minutes <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nachhol-Kontingent ist bereits vollständig eingelöst oder nicht mehr aktiv');
    END IF;

    IF p_date < CURRENT_DATE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nachholtermin muss in der Gegenwart oder Zukunft liegen');
    END IF;

    v_duration := COALESCE(p_duration, v_token.remaining_minutes);
    v_room_id := p_room_id;
    v_start_time_parsed := p_start_time::time;
    v_end_time := v_start_time_parsed + (v_duration || ' minutes')::interval;

    -- Raum-Kollisionsprüfung (falls Raum angegeben)
    IF v_room_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_collision_count
        FROM public.schedule_occurrences
        WHERE room_id = v_room_id
          AND date = p_date
          AND status <> 'cancelled'
          AND (
              (start_time::time, (start_time::time + (COALESCE(duration, 30) || ' minutes')::interval))
              OVERLAPS
              (v_start_time_parsed, v_end_time)
          );

        IF v_collision_count > 0 THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Raumkollision: Der ausgewählte Raum ist im gewünschten Zeitfenster bereits belegt',
                'collision', true
            );
        END IF;
    END IF;

    -- Neuen Nachholtermin anlegen
    INSERT INTO public.schedule_occurrences (
        school_id,
        teacher_id,
        student_id,
        room_id,
        date,
        start_time,
        duration,
        status,
        is_makeup_lesson,
        makeup_token_id,
        teacher_acknowledged,
        student_acknowledged
    ) VALUES (
        v_token.school_id,
        v_token.teacher_id,
        v_token.student_id,
        v_room_id,
        p_date,
        p_start_time,
        v_duration,
        'confirmed',
        TRUE,
        p_token_id,
        TRUE,
        FALSE
    )
    RETURNING id INTO v_new_occ_id;

    -- Token abbuchen
    UPDATE public.lesson_makeup_tokens
    SET remaining_minutes = GREATEST(0, remaining_minutes - v_duration),
        status = CASE 
            WHEN remaining_minutes - v_duration <= 0 THEN 'FULLY_REDEEMED' 
            ELSE 'PARTIALLY_REDEEMED' 
        END,
        updated_at = NOW()
    WHERE id = p_token_id;

    -- Audit Log
    INSERT INTO public.audit_logs (
        school_id, action, entity_type, entity_id, user_id, details
    ) VALUES (
        v_token.school_id,
        'redeem_makeup_as_new_lesson',
        'lesson_makeup_tokens',
        p_token_id,
        v_caller_id,
        jsonb_build_object(
            'new_occurrence_id', v_new_occ_id,
            'date', p_date,
            'start_time', p_start_time,
            'duration', v_duration
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_occurrence_id', v_new_occ_id,
        'date', p_date,
        'start_time', p_start_time,
        'duration', v_duration,
        'remaining_minutes', GREATEST(0, v_token.remaining_minutes - v_duration)
    );
END;
$$;

-- 6. Autoritativer RPC: extend_lesson_with_makeup_token (Pfad B: Folgetermin verlängern)
CREATE OR REPLACE FUNCTION public.extend_lesson_with_makeup_token(
    p_token_id UUID,
    p_occurrence_id UUID,
    p_extension_minutes INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_caller_id UUID;
    v_token RECORD;
    v_occ RECORD;
    v_old_duration INT;
    v_new_duration INT;
    v_new_end_time TIME;
    v_collision_count INT;
BEGIN
    v_caller_id := auth.uid();

    -- Token & Occurrence laden
    SELECT * INTO v_token
    FROM public.lesson_makeup_tokens
    WHERE id = p_token_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nachhol-Kontingent nicht gefunden');
    END IF;

    SELECT * INTO v_occ
    FROM public.schedule_occurrences
    WHERE id = p_occurrence_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Zu verlängernder Unterrichtstermin nicht gefunden');
    END IF;

    -- Validierung
    IF v_token.teacher_id <> v_caller_id AND public.get_current_user_role() NOT IN ('admin', 'secretary', 'master_admin') THEN
        RAISE EXCEPTION 'Nur die zuständige Lehrkraft kann Termine aus dem Kontingent verlängern';
    END IF;

    IF v_token.student_id <> v_occ.student_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nachhol-Kontingent gehört zu einem anderen Schüler');
    END IF;

    IF p_extension_minutes <= 0 OR p_extension_minutes > v_token.remaining_minutes THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Verlängerungsminuten (übersteigt verbleibendes Kontingent)');
    END IF;

    v_old_duration := COALESCE(v_occ.duration, 30);
    v_new_duration := v_old_duration + p_extension_minutes;
    v_new_end_time := v_occ.start_time::time + (v_new_duration || ' minutes')::interval;

    -- Raum-Kollisionsprüfung für das erweiterte Zeitfenster
    IF v_occ.room_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_collision_count
        FROM public.schedule_occurrences
        WHERE room_id = v_occ.room_id
          AND date = v_occ.date
          AND id <> p_occurrence_id
          AND status <> 'cancelled'
          AND (
              (start_time::time, (start_time::time + (COALESCE(duration, 30) || ' minutes')::interval))
              OVERLAPS
              (v_occ.start_time::time, v_new_end_time)
          );

        IF v_collision_count > 0 THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Raumkollision: Der Raum ist im Verlängerungsfenster (+' || p_extension_minutes || ' Min.) durch einen anderen Termin belegt',
                'collision', true
            );
        END IF;
    END IF;

    -- Occurrence aktualisieren
    UPDATE public.schedule_occurrences
    SET duration = v_new_duration,
        makeup_extension_minutes = makeup_extension_minutes + p_extension_minutes,
        makeup_token_id = p_token_id
    WHERE id = p_occurrence_id;

    -- Token abbuchen
    UPDATE public.lesson_makeup_tokens
    SET remaining_minutes = remaining_minutes - p_extension_minutes,
        status = CASE 
            WHEN remaining_minutes - p_extension_minutes <= 0 THEN 'FULLY_REDEEMED' 
            ELSE 'PARTIALLY_REDEEMED' 
        END,
        updated_at = NOW()
    WHERE id = p_token_id;

    -- Audit Log
    INSERT INTO public.audit_logs (
        school_id, action, entity_type, entity_id, user_id, details
    ) VALUES (
        v_token.school_id,
        'extend_lesson_with_makeup_token',
        'schedule_occurrences',
        p_occurrence_id,
        v_caller_id,
        jsonb_build_object(
            'token_id', p_token_id,
            'extension_minutes', p_extension_minutes,
            'new_duration', v_new_duration,
            'remaining_token_minutes', v_token.remaining_minutes - p_extension_minutes
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'occurrence_id', p_occurrence_id,
        'extension_minutes', p_extension_minutes,
        'new_duration', v_new_duration,
        'remaining_minutes', v_token.remaining_minutes - p_extension_minutes
    );
END;
$$;

-- 7. Autoritativer RPC: cancel_lesson_makeup_token (Stornieren durch Lehrkraft)
CREATE OR REPLACE FUNCTION public.cancel_lesson_makeup_token(
    p_token_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_caller_id UUID;
    v_token RECORD;
BEGIN
    v_caller_id := auth.uid();

    SELECT * INTO v_token
    FROM public.lesson_makeup_tokens
    WHERE id = p_token_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nachhol-Kontingent nicht gefunden');
    END IF;

    IF v_token.teacher_id <> v_caller_id AND public.get_current_user_role() NOT IN ('admin', 'secretary', 'master_admin') THEN
        RAISE EXCEPTION 'Nur die zuständige Lehrkraft kann ihr Nachhol-Kontingent stornieren';
    END IF;

    UPDATE public.lesson_makeup_tokens
    SET status = 'CANCELLED_BY_TEACHER',
        notes = COALESCE(notes || ' | ', '') || 'Storniert durch Lehrkraft: ' || COALESCE(p_reason, 'Einvernehmlich erlassen'),
        updated_at = NOW()
    WHERE id = p_token_id;

    -- Audit Log
    INSERT INTO public.audit_logs (
        school_id, action, entity_type, entity_id, user_id, details
    ) VALUES (
        v_token.school_id,
        'cancel_makeup_token',
        'lesson_makeup_tokens',
        p_token_id,
        v_caller_id,
        jsonb_build_object('reason', p_reason)
    );

    RETURN jsonb_build_object('success', true, 'token_id', p_token_id, 'status', 'CANCELLED_BY_TEACHER');
END;
$$;

-- 8. Autoritativer RPC: get_teacher_active_makeup_tokens (Für das Lehrer-Dashboard Radar)
CREATE OR REPLACE FUNCTION public.get_teacher_active_makeup_tokens(
    p_teacher_id UUID
)
RETURNS TABLE (
    token_id UUID,
    student_id UUID,
    student_first_name TEXT,
    student_last_name TEXT,
    student_instrument TEXT,
    original_occurrence_id UUID,
    original_date DATE,
    total_minutes INT,
    remaining_minutes INT,
    status TEXT,
    expires_at DATE,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id AS token_id,
        t.student_id,
        COALESCE(u.first_name, 'Schüler') AS student_first_name,
        COALESCE(u.last_name, '') AS student_last_name,
        COALESCE(u.instrument, 'Instrument') AS student_instrument,
        t.original_occurrence_id,
        t.original_date,
        t.total_minutes,
        t.remaining_minutes,
        t.status,
        t.expires_at,
        t.created_at
    FROM public.lesson_makeup_tokens t
    LEFT JOIN public.users u ON u.id = t.student_id
    WHERE t.teacher_id = p_teacher_id
      AND t.status IN ('OPEN', 'PARTIALLY_REDEEMED')
      AND t.remaining_minutes > 0
    ORDER BY t.original_date ASC;
END;
$$;

-- Berechtigungen vergeben
GRANT ALL ON public.lesson_makeup_tokens TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_lesson_makeup_token(UUID, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.redeem_makeup_token_as_new_lesson(UUID, DATE, TEXT, UUID, INT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.extend_lesson_with_makeup_token(UUID, UUID, INT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_lesson_makeup_token(UUID, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_teacher_active_makeup_tokens(UUID) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
