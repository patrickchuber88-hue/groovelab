-- Migration: 512_enterprise_archive_and_question_retention.sql
-- Description: Revisionssichere Archivierungs-Invariante für Schülerfragen (Zero-Loss Didaktik).
-- Stellt sicher, dass das Auflösen einer Frage für die laufende Unterrichtsstunde (resolve_student_homework_question)
-- die Frage nur aus dem aktiven Hausaufgaben-Header (is_current_homework = true) austrägt,
-- historische Wochen-Archive (Hausaufgabe KW % oder abgeschlossene Snapshots) jedoch unberührt lässt.
-- Garantiert 100% didaktische Nachvollziehbarkeit im Unterrichtsarchiv.

CREATE OR REPLACE FUNCTION public.resolve_student_homework_question(
  p_student_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_hw_row RECORD;
  v_notes_json JSONB;
  v_new_notes JSONB := '[]'::jsonb;
  v_elem JSONB;
  v_elem_text TEXT;
  v_school_id UUID;
  v_caller_id UUID;
  v_resolved_questions TEXT[] := ARRAY[]::TEXT[];
BEGIN
  v_caller_id := get_current_authenticated_user_id();
  v_school_id := get_current_user_school_id();
  
  -- Tenant & role authorization check
  IF NOT (
    is_master_admin()
    OR v_caller_id = p_student_id
    OR EXISTS (
      SELECT 1 FROM public.users_raw u
      WHERE u.id = p_student_id
        AND (v_school_id IS NULL OR u.school_id = v_school_id)
    )
  ) THEN
    RAISE EXCEPTION 'Access denied to student homework question' USING ERRCODE = '42501';
  END IF;

  -- 🏛️ Zero-Loss Invariante: Nur aktive / laufende Hausaufgabenzeilen leeren.
  -- Historische Wochenzeilen (z.B. "Hausaufgabe KW 38") behalten ihre Fragen im Archiv!
  FOR v_hw_row IN 
    SELECT id, topic_name, homework_notes
    FROM public.progress_matrix
    WHERE student_id = p_student_id
      AND is_current_homework = true
      AND NOT (topic_name LIKE 'Hausaufgabe KW %')
      AND (homework_notes LIKE '%STUDENT_QUESTION:%' OR homework_notes LIKE '%❓ Frage für den Unterricht:%')
  LOOP
    v_new_notes := '[]'::jsonb;
    BEGIN
      v_notes_json := v_hw_row.homework_notes::jsonb;
      IF jsonb_typeof(v_notes_json) = 'array' THEN
        FOR v_elem IN SELECT * FROM jsonb_array_elements(v_notes_json)
        LOOP
          v_elem_text := v_elem #>> '{}';
          IF (v_elem_text LIKE 'STUDENT_QUESTION:%' OR v_elem_text LIKE '❓ Frage für den Unterricht:%') THEN
            v_resolved_questions := array_append(v_resolved_questions, v_elem_text);
          ELSE
            v_new_notes := v_new_notes || jsonb_build_array(v_elem_text);
          END IF;
        END LOOP;
        
        UPDATE public.progress_matrix
        SET homework_notes = v_new_notes::text,
            updated_at = NOW()
        WHERE id = v_hw_row.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  -- Falls keine dedizierte Nicht-KW Zeile gefunden wurde, aber eine aktive KW-Zeile die Frage trägt,
  -- konvertiere den Token in der aktiven Zeile zu einem archivierten Token, statt ihn zu vernichten:
  IF array_length(v_resolved_questions, 1) IS NULL OR array_length(v_resolved_questions, 1) = 0 THEN
    FOR v_hw_row IN 
      SELECT id, topic_name, homework_notes
      FROM public.progress_matrix
      WHERE student_id = p_student_id
        AND is_current_homework = true
        AND (homework_notes LIKE '%STUDENT_QUESTION:%' OR homework_notes LIKE '%❓ Frage für den Unterricht:%')
    LOOP
      v_new_notes := '[]'::jsonb;
      BEGIN
        v_notes_json := v_hw_row.homework_notes::jsonb;
        IF jsonb_typeof(v_notes_json) = 'array' THEN
          FOR v_elem IN SELECT * FROM jsonb_array_elements(v_notes_json)
          LOOP
            v_elem_text := v_elem #>> '{}';
            IF (v_elem_text LIKE 'STUDENT_QUESTION:%' OR v_elem_text LIKE '❓ Frage für den Unterricht:%') THEN
              v_resolved_questions := array_append(v_resolved_questions, v_elem_text);
              -- Im Archiv als besprochener historischer Snapshot behalten
              v_new_notes := v_new_notes || jsonb_build_array(v_elem_text);
            ELSE
              v_new_notes := v_new_notes || jsonb_build_array(v_elem_text);
            END IF;
          END LOOP;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END LOOP;
  END IF;

  -- 🛡️ Revisionssicheres Audit-Logging: Protokolliere den Erledigungsvorgang
  BEGIN
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
      'progress_matrix',
      'UPDATE',
      p_student_id,
      v_caller_id,
      v_caller_id,
      p_student_id,
      jsonb_build_object(
        'event', 'resolve_student_homework_question_retention',
        'student_id', p_student_id,
        'resolved_questions', to_jsonb(v_resolved_questions),
        'resolved_count', COALESCE(array_length(v_resolved_questions, 1), 0),
        'timestamp', NOW()
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'resolved_count', COALESCE(array_length(v_resolved_questions, 1), 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_student_homework_question(UUID) TO authenticated, anon;
