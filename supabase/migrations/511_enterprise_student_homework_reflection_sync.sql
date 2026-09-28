-- Migration: 511_enterprise_student_homework_reflection_sync.sql
-- Description: Revisionssichere Speicherung & Synchronisation von didaktischen Schüler-Reflexionen
-- (🟢 Läuft super / 🟡 Noch wackelig / 🔴 Brauche Hilfe) über alle Geräte (Tablet, Web, Handy) hinweg.
-- Ermöglicht Lehrkräften die sofortige Einsicht in Schülerfeedback im TeacherStudentDetailModal.

CREATE OR REPLACE FUNCTION public.save_student_task_reflection(
  p_student_id UUID,
  p_task_id TEXT,
  p_status TEXT, -- 'super', 'wackelig', 'hilfe' or ''/NULL to remove
  p_label TEXT DEFAULT NULL
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
  v_clean_task_id TEXT;
  v_clean_status TEXT;
  v_clean_label TEXT;
  v_tag TEXT;
  v_prefix TEXT;
  v_iso_now TEXT;
  v_school_id UUID;
  v_caller_id UUID;
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
    RAISE EXCEPTION 'Access denied to student task reflection' USING ERRCODE = '42501';
  END IF;

  v_clean_task_id := substring(trim(regexp_replace(COALESCE(p_task_id, ''), '[\x00-\x1F\x7F]', '', 'g')) from 1 for 200);
  IF length(v_clean_task_id) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task ID is empty');
  END IF;

  v_clean_status := lower(trim(COALESCE(p_status, '')));
  v_clean_label := substring(trim(regexp_replace(COALESCE(p_label, ''), '[\x00-\x1F\x7F]', '', 'g')) from 1 for 200);
  v_prefix := 'TASK_REFL:' || v_clean_task_id || '|';

  v_iso_now := to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  IF v_clean_status IN ('super', 'wackelig', 'hilfe') THEN
    v_tag := v_prefix || v_clean_status || '|' || v_iso_now || '|' || v_clean_label;
  ELSE
    v_tag := NULL;
  END IF;

  -- Find active current homework row
  SELECT id, homework_notes INTO v_hw_row
  FROM public.progress_matrix
  WHERE student_id = p_student_id
    AND is_current_homework = true
  ORDER BY updated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT id, homework_notes INTO v_hw_row
    FROM public.progress_matrix
    WHERE student_id = p_student_id
    ORDER BY updated_at DESC
    LIMIT 1;
  END IF;

  IF FOUND THEN
    BEGIN
      v_notes_json := v_hw_row.homework_notes::jsonb;
      IF jsonb_typeof(v_notes_json) <> 'array' THEN
        v_notes_json := jsonb_build_array(v_hw_row.homework_notes);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      IF v_hw_row.homework_notes IS NOT NULL AND length(trim(v_hw_row.homework_notes)) > 0 THEN
        v_notes_json := jsonb_build_array(v_hw_row.homework_notes);
      ELSE
        v_notes_json := '[]'::jsonb;
      END IF;
    END;

    -- Remove any old reflection for THIS specific taskId
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_notes_json)
    LOOP
      v_elem_text := v_elem #>> '{}';
      IF NOT (v_elem_text LIKE v_prefix || '%') THEN
        v_new_notes := v_new_notes || jsonb_build_array(v_elem_text);
      END IF;
    END LOOP;

    -- Prepend updated reflection tag if active
    IF v_tag IS NOT NULL THEN
      v_new_notes := jsonb_build_array(v_tag) || v_new_notes;
    END IF;

    UPDATE public.progress_matrix
    SET homework_notes = v_new_notes::text,
        updated_at = NOW()
    WHERE id = v_hw_row.id;
  ELSE
    IF v_tag IS NOT NULL THEN
      INSERT INTO public.progress_matrix (
        student_id,
        topic_name,
        status,
        is_current_homework,
        homework_notes,
        updated_at
      ) VALUES (
        p_student_id,
        'Hausaufgabe',
        'IN_PROGRESS',
        true,
        jsonb_build_array(v_tag)::text,
        NOW()
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'task_id', v_clean_task_id,
    'status', v_clean_status,
    'tag', v_tag
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_student_task_reflection(UUID, TEXT, TEXT, TEXT) TO authenticated, anon;
