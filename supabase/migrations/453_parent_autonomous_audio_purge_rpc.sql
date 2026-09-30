-- ==============================================================================
-- ⚖️ Migration 453: Parent Autonomous Audio Purge RPC (DSGVO Art. 17 / Recht auf Vergessenwerden)
-- Standards:
-- - DSGVO Art. 17 Abs. 1 (Recht auf unverzügliche Löschung ohne Behinderungsverzögerung)
-- - OWASP ASVS Level 3 / Fail-Closed Tenant-Isolation
-- - Revisionssicheres WORM-Audit-Logging in public.audit_logs
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.purge_student_recordings_by_parent(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
  v_school_id UUID := get_current_user_school_id();
  v_purged_count INT := 0;
  v_student_exists BOOLEAN := FALSE;
BEGIN
  -- 1. Fail-Closed Tenant-Verifikation: Keine Ausführung ohne autorisierte Schul-Session
  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Zugriff verweigert (Fail-Closed): Keine autorisierte Schul-Session ermittelt.';
  END IF;

  -- 2. Prüfe, ob der Schüler zum Mandanten gehört
  SELECT TRUE INTO v_student_exists
  FROM public.students
  WHERE id = p_student_id AND school_id = v_school_id;

  IF NOT FOUND OR v_student_exists IS NOT TRUE THEN
    RAISE EXCEPTION 'Zugriff verweigert: Schüler existiert nicht im aktuellen Mandanten.';
  END IF;

  -- 3. Physisches Tilgen der Audio-Referenzen in progress_matrix
  UPDATE public.progress_matrix
  SET audio_url = NULL,
      homework_notes = COALESCE(homework_notes, '') || ' [AUDIO_GELÖSCHT_DURCH_ELTERN_ART17]'
  WHERE student_id = p_student_id 
    AND school_id = v_school_id
    AND audio_url IS NOT NULL;

  GET DIAGNOSTICS v_purged_count = ROW_COUNT;

  -- 4. Revisionssicheres WORM-Audit-Logging
  INSERT INTO public.audit_logs (table_name, operation, record_id, changed_by, new_data)
  VALUES (
    'progress_matrix',
    'PARENT_AUDIO_PURGE_ART17',
    p_student_id,
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
    jsonb_build_object(
      'action', 'IMMEDIATE_AUDIO_PURGE_EXECUTED',
      'student_id', p_student_id,
      'school_id', v_school_id,
      'purged_recordings_count', v_purged_count,
      'executed_at', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'purged_count', v_purged_count,
    'message', 'Alle Übe-Aufnahmen wurden gemäß Art. 17 DSGVO unverzüglich gelöscht.'
  );
END;
$$;

-- Berechtigungen vergeben
GRANT EXECUTE ON FUNCTION public.purge_student_recordings_by_parent(UUID) TO authenticated, anon;
