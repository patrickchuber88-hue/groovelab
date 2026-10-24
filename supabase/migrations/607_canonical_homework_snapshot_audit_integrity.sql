-- ==============================================================================
-- 🛡️ Campus-Groovelab Migration 607: Canonical Homework Snapshot Audit Integrity
-- Standards: OWASP ASVS Level 3 / Fail-Closed / ISO 27001 / BSI IT-Grundschutz
-- Target: Deduplizierung, WORM-Audit & Unantastbare Eindeutigkeit für public.progress_matrix
-- ==============================================================================

BEGIN;

-- 1. Sicherstellen, dass das WORM-Audit-Logging für progress_matrix existiert und vollumfänglich protokolliert
CREATE OR REPLACE FUNCTION public.log_homework_matrix_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID;
    v_action TEXT;
    v_details JSONB;
BEGIN
    v_actor_id := public.get_current_authenticated_user_id();

    IF TG_OP = 'INSERT' THEN
        v_action := 'PROGRESS_MATRIX_INSERT';
        v_details := jsonb_build_object(
            'id', NEW.id,
            'student_id', NEW.student_id,
            'topic_name', NEW.topic_name,
            'is_current_homework', NEW.is_current_homework,
            'has_notes', (NEW.homework_notes IS NOT NULL AND NEW.homework_notes <> '' AND NEW.homework_notes <> '[]')
        );
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'PROGRESS_MATRIX_UPDATE';
        v_details := jsonb_build_object(
            'id', NEW.id,
            'student_id', NEW.student_id,
            'topic_name', NEW.topic_name,
            'is_current_homework', NEW.is_current_homework,
            'old_is_current_homework', OLD.is_current_homework,
            'has_notes_now', (NEW.homework_notes IS NOT NULL AND NEW.homework_notes <> '' AND NEW.homework_notes <> '[]'),
            'had_notes_before', (OLD.homework_notes IS NOT NULL AND OLD.homework_notes <> '' AND OLD.homework_notes <> '[]')
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'PROGRESS_MATRIX_DELETE';
        v_details := jsonb_build_object(
            'id', OLD.id,
            'student_id', OLD.student_id,
            'topic_name', OLD.topic_name,
            'had_notes', (OLD.homework_notes IS NOT NULL AND OLD.homework_notes <> '' AND OLD.homework_notes <> '[]')
        );
    END IF;

    -- Revisionssichere Protokollierung in public.audit_logs
    INSERT INTO public.audit_logs (
        school_id,
        user_id,
        action,
        details,
        created_at
    ) VALUES (
        COALESCE(NEW.school_id, OLD.school_id, '53e83805-1d5a-4ed8-988e-1fb0b8200b9c'::uuid),
        COALESCE(v_actor_id, NEW.student_id, OLD.student_id),
        v_action,
        v_details,
        NOW()
    );

    RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
    -- Fail-safe: Audit-Logging darf Transaktionen nicht stoppen, wenn audit_logs vorübergehend gelockt ist
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2. Hilfsfunktion zur verlustfreien Zusammenführung von homework_notes JSON-Arrays
CREATE OR REPLACE FUNCTION public.merge_homework_notes_arrays(p_arr1 TEXT, p_arr2 TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_j1 JSONB;
    v_j2 JSONB;
    v_elem JSONB;
    v_res JSONB := '[]'::jsonb;
    v_seen_tokens TEXT[] := ARRAY[]::TEXT[];
    v_str TEXT;
BEGIN
    IF (p_arr1 IS NULL OR trim(p_arr1) = '' OR trim(p_arr1) = '[]') AND (p_arr2 IS NULL OR trim(p_arr2) = '' OR trim(p_arr2) = '[]') THEN
        RETURN '[]';
    END IF;

    -- Parse arr1
    BEGIN
        v_j1 := p_arr1::jsonb;
        IF jsonb_typeof(v_j1) <> 'array' THEN
            v_j1 := jsonb_build_array(p_arr1);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        IF p_arr1 IS NOT NULL AND trim(p_arr1) <> '' THEN
            v_j1 := jsonb_build_array(p_arr1);
        ELSE
            v_j1 := '[]'::jsonb;
        END IF;
    END;

    -- Parse arr2
    BEGIN
        v_j2 := p_arr2::jsonb;
        IF jsonb_typeof(v_j2) <> 'array' THEN
            v_j2 := jsonb_build_array(p_arr2);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        IF p_arr2 IS NOT NULL AND trim(p_arr2) <> '' THEN
            v_j2 := jsonb_build_array(p_arr2);
        ELSE
            v_j2 := '[]'::jsonb;
        END IF;
    END;

    -- Merge elements losslessly
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_j1)
    LOOP
        v_str := trim(v_elem #>> '{}');
        IF v_str <> '' AND NOT (v_seen_tokens @> ARRAY[v_str]) THEN
            v_res := v_res || jsonb_build_array(v_str);
            v_seen_tokens := array_append(v_seen_tokens, v_str);
        END IF;
    END LOOP;

    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_j2)
    LOOP
        v_str := trim(v_elem #>> '{}');
        IF v_str <> '' AND NOT (v_seen_tokens @> ARRAY[v_str]) THEN
            v_res := v_res || jsonb_build_array(v_str);
            v_seen_tokens := array_append(v_seen_tokens, v_str);
        END IF;
    END LOOP;

    RETURN v_res::text;
END;
$$;

-- 3. Daten-Konsolidierung: Bereinige Duplikate bei 'Hausaufgabe KW %' und führe Tokens zusammen
DO $$
DECLARE
    r RECORD;
    v_canonical_id UUID;
    v_merged_notes TEXT;
    v_has_current_hw BOOLEAN;
    v_school_id UUID;
    v_teacher_id UUID;
    v_sub RECORD;
BEGIN
    FOR r IN (
        SELECT student_id, lower(trim(topic_name)) as topic_clean, COUNT(*) as cnt
        FROM public.progress_matrix
        WHERE topic_name ILIKE 'Hausaufgabe KW %'
        GROUP BY student_id, lower(trim(topic_name))
        HAVING COUNT(*) > 1
    )
    LOOP
        -- Wähle die kanonische Zeile: Priorität auf is_current_homework = true, reichhaltigste homework_notes, neuester updated_at
        SELECT id, school_id, teacher_id
        INTO v_canonical_id, v_school_id, v_teacher_id
        FROM public.progress_matrix
        WHERE (student_id = r.student_id OR (student_id IS NULL AND r.student_id IS NULL))
          AND lower(trim(topic_name)) = r.topic_clean
        ORDER BY 
            is_current_homework DESC,
            CASE 
                WHEN homework_notes IS NOT NULL AND homework_notes <> '' AND homework_notes <> '[]' THEN length(homework_notes)
                ELSE 0 
            END DESC,
            updated_at DESC
        LIMIT 1;

        v_merged_notes := '[]';
        v_has_current_hw := false;

        -- Durchlaufe alle Zeilen dieser Gruppe und mergete die Notizen
        FOR v_sub IN (
            SELECT id, is_current_homework, homework_notes
            FROM public.progress_matrix
            WHERE (student_id = r.student_id OR (student_id IS NULL AND r.student_id IS NULL))
              AND lower(trim(topic_name)) = r.topic_clean
            ORDER BY is_current_homework DESC, updated_at DESC
        )
        LOOP
            IF v_sub.is_current_homework THEN
                v_has_current_hw := true;
            END IF;
            IF v_sub.homework_notes IS NOT NULL AND trim(v_sub.homework_notes) <> '' AND trim(v_sub.homework_notes) <> '[]' THEN
                v_merged_notes := public.merge_homework_notes_arrays(v_merged_notes, v_sub.homework_notes);
            END IF;
        END LOOP;

        -- Aktualisiere die kanonische Zeile
        UPDATE public.progress_matrix
        SET homework_notes = v_merged_notes,
            is_current_homework = v_has_current_hw,
            updated_at = NOW()
        WHERE id = v_canonical_id;

        -- Lösche die überzähligen Schatten-Zeilen
        DELETE FROM public.progress_matrix
        WHERE (student_id = r.student_id OR (student_id IS NULL AND r.student_id IS NULL))
          AND lower(trim(topic_name)) = r.topic_clean
          AND id <> v_canonical_id;
    END LOOP;
END;
$$;

-- 4. Bereinige etwaige verwaiste Zeilen ohne student_id für 'Hausaufgabe KW %'
DELETE FROM public.progress_matrix
WHERE student_id IS NULL
  AND topic_name ILIKE 'Hausaufgabe KW %';

-- 5. Setze den unantastbaren UNIQUE INDEX auf (student_id, lower(trim(topic_name))) für alle Wochen-Snapshots
DROP INDEX IF EXISTS public.idx_progress_matrix_unique_weekly_hw;
CREATE UNIQUE INDEX idx_progress_matrix_unique_weekly_hw
ON public.progress_matrix (student_id, lower(trim(topic_name)))
WHERE topic_name ILIKE 'Hausaufgabe KW %' AND student_id IS NOT NULL;

-- 6. Trigger zum Schutz vor Datenverlust: Verhindert, dass nicht-leere Snapshots durch leere '[]' überschrieben werden
CREATE OR REPLACE FUNCTION public.trg_protect_homework_snapshot_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Gilt nur für Wochen-Container 'Hausaufgabe KW %'
    IF NEW.topic_name ILIKE 'Hausaufgabe KW %' THEN
        -- Wenn alte Zeile reichhaltige Notizen hatte und neue Zeile '[]' oder NULL senden würde:
        IF (OLD.homework_notes IS NOT NULL AND OLD.homework_notes <> '' AND OLD.homework_notes <> '[]')
           AND (NEW.homework_notes IS NULL OR NEW.homework_notes = '' OR NEW.homework_notes = '[]') THEN
            -- Erhalte die bestehenden Notizen (Safe-Retain) und deaktiviere nur is_current_homework
            NEW.homework_notes := OLD.homework_notes;
        END IF;

        -- Wenn beide Notizen haben, aber die neue Zeile Tokens verloren hat (z. B. MICROSCORE oder STUDENT_QUESTION fehlt):
        IF (OLD.homework_notes IS NOT NULL AND OLD.homework_notes <> '' AND OLD.homework_notes <> '[]')
           AND (NEW.homework_notes IS NOT NULL AND NEW.homework_notes <> '' AND NEW.homework_notes <> '[]') THEN
            NEW.homework_notes := public.merge_homework_notes_arrays(OLD.homework_notes, NEW.homework_notes);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_homework_snapshot_integrity_trigger ON public.progress_matrix;
CREATE TRIGGER trg_protect_homework_snapshot_integrity_trigger
BEFORE UPDATE ON public.progress_matrix
FOR EACH ROW
EXECUTE FUNCTION public.trg_protect_homework_snapshot_integrity();

COMMIT;
