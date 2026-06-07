-- Migration: Wunschtermine & Sperrzeiten Preferences

CREATE TABLE IF NOT EXISTS public.student_schedule_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7), -- 1 = Montag, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    preference_type VARCHAR(20) NOT NULL CHECK (preference_type IN ('wunsch', 'gesperrt')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS deaktivieren & Berechtigungen erteilen
ALTER TABLE public.student_schedule_preferences DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.student_schedule_preferences TO authenticated, anon, service_role;

-- RPC Function zum sicheren Speichern der Präferenzen
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
BEGIN
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
            day_of_week,
            start_time,
            end_time,
            preference_type
        ) VALUES (
            input_student_id,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.save_schedule_preferences(UUID, JSONB) TO anon, authenticated, service_role;

-- Schema-Cache neu laden
NOTIFY pgrst, 'reload schema';
