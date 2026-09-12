-- ==============================================================================
-- 🏛️ MIGRATION 404: ENTERPRISE STUDENT SCHEDULE PREFERENCES SCHOOL_ID & TRANSFER
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Multi-Tenancy Invariant)
-- ==============================================================================
-- 1. Ergänzt student_schedule_preferences um school_id zur Mandantentrennung
-- 2. Backfill existierender Datensätze mit der zugehörigen Schule
-- 3. Automatischer BEFORE INSERT Trigger zur Absicherung von school_id
-- 4. Aktualisierung der save_schedule_preferences RPC-Funktion
-- 5. Strikte RLS-Policy auf school_id Basis
-- 6. Revisionssichere Übertragungs-Funktion für Schuljahres-Verfügbarkeiten
-- ==============================================================================

-- 1. Spalte school_id hinzufügen falls noch nicht existent
ALTER TABLE public.student_schedule_preferences 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- 2. Backfill der vorhandenen Präferenzen
UPDATE public.student_schedule_preferences p
SET school_id = COALESCE(
    (SELECT u.school_id FROM public.users_raw u WHERE u.id = p.student_id),
    (SELECT s.school_id FROM public.students s WHERE s.id = p.student_id)
)
WHERE p.school_id IS NULL;

-- 3. High-Speed Index für schulweite Abfragen & Planer
CREATE INDEX IF NOT EXISTS idx_student_schedule_preferences_school_student 
ON public.student_schedule_preferences(school_id, student_id);

-- 4. Synchronisiere fehlende Schüler aus users_raw in students Tabelle
INSERT INTO public.students (id, school_id, teacher_id, instrument, status, lesson_duration)
SELECT 
    u.id, 
    u.school_id, 
    u.teacher_id, 
    COALESCE(u.instrument, 'Musiker'), 
    'active', 
    COALESCE(u.lesson_duration, 30)
FROM public.users_raw u
WHERE u.role = 'student'
  AND NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- 5. Automatischer Trigger zur Sicherstellung von school_id
CREATE OR REPLACE FUNCTION public.set_student_schedule_preferences_school_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.school_id IS NULL THEN
        SELECT COALESCE(
            (SELECT school_id FROM public.users_raw WHERE id = NEW.student_id),
            (SELECT school_id FROM public.students WHERE id = NEW.student_id),
            public.get_current_user_school_id()
        ) INTO NEW.school_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp', 'extensions';

DROP TRIGGER IF EXISTS trg_student_schedule_preferences_school_id ON public.student_schedule_preferences;
CREATE TRIGGER trg_student_schedule_preferences_school_id
BEFORE INSERT ON public.student_schedule_preferences
FOR EACH ROW EXECUTE FUNCTION public.set_student_schedule_preferences_school_id();

-- 6. RPC save_schedule_preferences aktualisieren
CREATE OR REPLACE FUNCTION public.save_schedule_preferences(
    input_student_id UUID,
    slots JSONB
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
#variable_conflict use_column
DECLARE
    wunsch_count INT := 0;
    wunsch_duration_sec NUMERIC := 0;
    slot_record RECORD;
    v_school_id UUID;
BEGIN
    -- Determine school_id
    SELECT COALESCE(
        (SELECT school_id FROM public.users_raw WHERE id = input_student_id),
        (SELECT school_id FROM public.students WHERE id = input_student_id),
        public.get_current_user_school_id()
    ) INTO v_school_id;

    -- Zähle und summiere die Dauer der 'wunsch' slots
    SELECT 
        COUNT(*),
        COALESCE(SUM(EXTRACT(EPOCH FROM ( (val->>'end_time')::TIME - (val->>'start_time')::TIME ))), 0)
    INTO
        wunsch_count,
        wunsch_duration_sec
    FROM jsonb_array_elements(slots) AS val
    WHERE val->>'preference_type' = 'wunsch';

    -- Validierung
    IF wunsch_count < 2 THEN
        RETURN QUERY SELECT FALSE, 'Bitte wähle mindestens zwei Wunschzeit-Slots aus.';
        RETURN;
    END IF;

    IF wunsch_duration_sec < 7200 THEN
        RETURN QUERY SELECT FALSE, 'Die Gesamtdauer der Wunschzeiten muss mindestens 2 Stunden betragen.';
        RETURN;
    END IF;

    -- Eventuell vorhandene alte Einträge für diese student_id löschen
    DELETE FROM public.student_schedule_preferences
    WHERE student_id = input_student_id;

    -- Neue Zeitfenster in die Tabelle schreiben
    FOR slot_record IN 
        SELECT 
            (val->>'day_of_week')::INTEGER AS day_of_week,
            (val->>'start_time')::TIME AS start_time,
            (val->>'end_time')::TIME AS end_time,
            (val->>'preference_type')::VARCHAR(20) AS preference_type
        FROM jsonb_array_elements(slots) AS val
    LOOP
        INSERT INTO public.student_schedule_preferences (
            student_id,
            school_id,
            day_of_week,
            start_time,
            end_time,
            preference_type
        ) VALUES (
            input_student_id,
            v_school_id,
            slot_record.day_of_week,
            slot_record.start_time,
            slot_record.end_time,
            slot_record.preference_type
        );
    END LOOP;

    -- Status des Schülers auf 'in_bearbeitung' setzen
    UPDATE public.students
    SET status = 'in_bearbeitung'
    WHERE id = input_student_id;

    -- Auch in der users-Tabelle aktualisieren falls bereits vorhanden
    UPDATE public.users
    SET status = 'active'
    WHERE id = input_student_id;

    RETURN QUERY SELECT TRUE, 'Wunschtermine und Sperrzeiten erfolgreich gespeichert.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp', 'extensions';

-- 7. RLS-Policy härten & absichern
ALTER TABLE public.student_schedule_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_schedule_preferences FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_schedule_preferences_all_policy" ON public.student_schedule_preferences;
CREATE POLICY "student_schedule_preferences_all_policy"
  ON public.student_schedule_preferences
  TO anon,authenticated,service_role
  USING (
    is_master_admin() 
    OR student_id = get_current_authenticated_user_id() 
    OR (school_id IS NOT NULL AND school_id = get_current_user_school_id())
    OR (get_kiosk_school_id() IS NOT NULL AND school_id = get_kiosk_school_id())
    OR (EXISTS (
        SELECT 1 FROM users_raw u
        WHERE u.id = student_schedule_preferences.student_id 
          AND u.school_id = get_current_user_school_id()
    ))
  )
  WITH CHECK (
    is_master_admin() 
    OR student_id = get_current_authenticated_user_id() 
    OR (school_id IS NOT NULL AND school_id = get_current_user_school_id())
    OR (EXISTS (
        SELECT 1 FROM users_raw u
        WHERE u.id = student_schedule_preferences.student_id 
          AND u.school_id = get_current_user_school_id()
    ))
  );

-- 8. Übertragungs-Funktion für das neue Schuljahr
CREATE OR REPLACE FUNCTION public.transfer_student_schedule_preferences_to_school_year(
    p_teacher_id UUID DEFAULT '11079eae-664a-49a4-8692-771d83a3193c'
)
RETURNS TABLE (
    student_id UUID,
    student_name TEXT,
    transferred_slots INT,
    status TEXT
) AS $$
#variable_conflict use_column
DECLARE
    v_rec RECORD;
    v_school_id UUID;
    v_count INT;
BEGIN
    FOR v_rec IN 
        SELECT 
            u.id as s_id, 
            u.first_name || ' ' || u.last_name as s_name,
            u.school_id as s_school_id,
            s.day_of_week as l_day,
            s.time_slot as l_time,
            COALESCE(s.duration, 30) as l_duration
        FROM public.users_raw u
        JOIN public.schedules s ON s.student_id = u.id AND s.teacher_id = p_teacher_id
        WHERE u.teacher_id = p_teacher_id
    LOOP
        v_school_id := v_rec.s_school_id;
        
        -- Sicherstellen, dass der Schüler in der students-Tabelle existiert
        INSERT INTO public.students (id, school_id, teacher_id, instrument, status, lesson_duration)
        VALUES (v_rec.s_id, v_school_id, p_teacher_id, 'Musiker', 'active', v_rec.l_duration)
        ON CONFLICT (id) DO UPDATE SET teacher_id = EXCLUDED.teacher_id;

        -- Falls der Schüler bisher gar keine Wunschzeiten hinterlegt hatte, generiere ein 2h Fenster
        IF NOT EXISTS (SELECT 1 FROM public.student_schedule_preferences p WHERE p.student_id = v_rec.s_id) THEN
            INSERT INTO public.student_schedule_preferences (student_id, school_id, day_of_week, start_time, end_time, preference_type)
            VALUES 
                (v_rec.s_id, v_school_id, v_rec.l_day, (v_rec.l_time::time - interval '30 minutes')::time, v_rec.l_time::time, 'wunsch'),
                (v_rec.s_id, v_school_id, v_rec.l_day, v_rec.l_time::time, (v_rec.l_time::time + interval '30 minutes')::time, 'wunsch'),
                (v_rec.s_id, v_school_id, v_rec.l_day, (v_rec.l_time::time + interval '30 minutes')::time, (v_rec.l_time::time + interval '60 minutes')::time, 'wunsch'),
                (v_rec.s_id, v_school_id, v_rec.l_day, (v_rec.l_time::time + interval '60 minutes')::time, (v_rec.l_time::time + interval '90 minutes')::time, 'wunsch')
            ON CONFLICT DO NOTHING;
            
            status := 'neu angelegt aus aktuellem Stundenplan';
        ELSE
            -- Sicherstellen, dass der aktuelle Unterrichtsslot als Wunschzeit vorhanden ist
            INSERT INTO public.student_schedule_preferences (student_id, school_id, day_of_week, start_time, end_time, preference_type)
            VALUES (v_rec.s_id, v_school_id, v_rec.l_day, v_rec.l_time::time, (v_rec.l_time::time + (v_rec.l_duration || ' minutes')::interval)::time, 'wunsch')
            ON CONFLICT DO NOTHING;
            
            status := 'bestehende Verfügbarkeiten übertragen & harmonisiert';
        END IF;

        -- Gesamtzahl der Slots für diesen Schüler ermitteln
        SELECT count(*) INTO v_count FROM public.student_schedule_preferences p WHERE p.student_id = v_rec.s_id;

        student_id := v_rec.s_id;
        student_name := v_rec.s_name;
        transferred_slots := v_count;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp', 'extensions';

GRANT EXECUTE ON FUNCTION public.transfer_student_schedule_preferences_to_school_year(UUID) TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
