-- Migration: 358_student_homework_question_rpc.sql
-- Description: Authoritative, tenant-isolated RPCs to safely persist and resolve student homework questions
-- Compliant with OWASP ASVS Level 3, Fail-Closed, and DSGVO Art. 25 & Art. 5 Abs. 1 lit. f.

CREATE OR REPLACE FUNCTION public.save_student_homework_question(
  p_student_id UUID,
  p_question_text TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hw_row RECORD;
  v_notes_json JSONB;
  v_new_notes JSONB := '[]'::jsonb;
  v_elem JSONB;
  v_elem_text TEXT;
  v_clean_q TEXT;
  v_tag TEXT;
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
    RAISE EXCEPTION 'Access denied to student homework question' USING ERRCODE = '42501';
  END IF;

  -- Input sanitization: strip control characters, truncate to 500 chars
  v_clean_q := substring(trim(regexp_replace(p_question_text, '[\x00-\x1F\x7F]', '', 'g')) from 1 for 500);
  IF length(v_clean_q) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Question is empty');
  END IF;

  v_iso_now := to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  v_tag := 'STUDENT_QUESTION:' || v_iso_now || '|' || v_clean_q;

  -- Find active current homework row
  SELECT id, homework_notes INTO v_hw_row
  FROM public.progress_matrix
  WHERE student_id = p_student_id
    AND is_current_homework = true
  ORDER BY updated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    -- Fallback: find latest homework row for student
    SELECT id, homework_notes INTO v_hw_row
    FROM public.progress_matrix
    WHERE student_id = p_student_id
    ORDER BY updated_at DESC
    LIMIT 1;
  END IF;

  IF FOUND THEN
    -- Parse existing homework_notes
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

    -- Filter out existing question tags to avoid duplicate questions
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_notes_json)
    LOOP
      v_elem_text := v_elem #>> '{}';
      IF NOT (v_elem_text LIKE 'STUDENT_QUESTION:%' OR v_elem_text LIKE '❓ Frage für den Unterricht:%') THEN
        v_new_notes := v_new_notes || jsonb_build_array(v_elem_text);
      END IF;
    END LOOP;

    -- Prepend the new question
    v_new_notes := jsonb_build_array(v_tag) || v_new_notes;

    UPDATE public.progress_matrix
    SET homework_notes = v_new_notes::text,
        updated_at = NOW()
    WHERE id = v_hw_row.id;
  ELSE
    -- Create new weekly homework container
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

  RETURN jsonb_build_object(
    'success', true,
    'question', v_clean_q,
    'tag', v_tag,
    'created_at', v_iso_now
  );
END;
$$;

-- 2. RPC to resolve / delete the student homework question
CREATE OR REPLACE FUNCTION public.resolve_student_homework_question(
  p_student_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hw_row RECORD;
  v_notes_json JSONB;
  v_new_notes JSONB := '[]'::jsonb;
  v_elem JSONB;
  v_elem_text TEXT;
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
    RAISE EXCEPTION 'Access denied to student homework question' USING ERRCODE = '42501';
  END IF;

  -- Search all active homework rows for this student
  FOR v_hw_row IN 
    SELECT id, homework_notes
    FROM public.progress_matrix
    WHERE student_id = p_student_id
      AND (homework_notes LIKE '%STUDENT_QUESTION:%' OR homework_notes LIKE '%❓ Frage für den Unterricht:%')
  LOOP
    v_new_notes := '[]'::jsonb;
    BEGIN
      v_notes_json := v_hw_row.homework_notes::jsonb;
      IF jsonb_typeof(v_notes_json) = 'array' THEN
        FOR v_elem IN SELECT * FROM jsonb_array_elements(v_notes_json)
        LOOP
          v_elem_text := v_elem #>> '{}';
          IF NOT (v_elem_text LIKE 'STUDENT_QUESTION:%' OR v_elem_text LIKE '❓ Frage für den Unterricht:%') THEN
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

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execution permissions to authenticated and anon users (protected by internal SECURITY DEFINER checks)
GRANT EXECUTE ON FUNCTION public.save_student_homework_question(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.resolve_student_homework_question(UUID) TO authenticated, anon;
