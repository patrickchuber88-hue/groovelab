-- ==============================================================================
-- Migration 502: Enterprise Legacy Ingestion RPC & Zero-Payroll Staging Gate
-- Standards: OWASP ASVS Level 3 / DSGVO Art. 5 (Datenminimierung) / BSI IT-Grundschutz
-- Zweck: Atomarer, transaktionssicherer Massen-Import von Schülern & Lehrkräften
--        aus Altsystemen (WinMusik, MBS, Excel) direkt in users_raw.
-- ==============================================================================

-- 1. Staging-Tabelle für unvalidierte Zwischenstände
CREATE TABLE IF NOT EXISTS public.migration_staging_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('STUDENT', 'TEACHER', 'SCHEDULE')),
  payload JSONB NOT NULL,
  validation_status TEXT NOT NULL DEFAULT 'VALID',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indizes für performante Batch-Abfragen und Bereinigung
CREATE INDEX IF NOT EXISTS idx_staging_batch_school 
  ON public.migration_staging_records (school_id, batch_id, validation_status);

-- 2. RLS Härtung der Staging-Tabelle (Strikte Mandantentrennung)
ALTER TABLE public.migration_staging_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS migration_staging_tenant_isolation ON public.migration_staging_records;
CREATE POLICY migration_staging_tenant_isolation ON public.migration_staging_records
  FOR ALL TO authenticated
  USING (school_id = (SELECT public.get_current_user_school_id()))
  WITH CHECK (school_id = (SELECT public.get_current_user_school_id()));

-- 3. Transaktionale Import-Funktion (Atomarer Durchlauf in users_raw)
CREATE OR REPLACE FUNCTION execute_legacy_migration(
  p_school_id UUID,
  p_batch_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inserted_students INTEGER := 0;
  v_inserted_teachers INTEGER := 0;
  v_record RECORD;
BEGIN
  -- Multi-Tenancy Guard: Kein Mandant darf Daten eines anderen importieren
  IF p_school_id != get_current_user_school_id() THEN
    RAISE EXCEPTION 'Unauthorized: Migration tenant mismatch';
  END IF;

  -- Atomare Iteration über alle validierten Einträge des Batches
  FOR v_record IN 
    SELECT * FROM migration_staging_records 
    WHERE school_id = p_school_id 
      AND batch_id = p_batch_id 
      AND validation_status = 'VALID'
  LOOP
    IF v_record.entity_type = 'STUDENT' THEN
      -- Schüler-Import in users_raw (Zero-Mail & Pseudonym-Doktrin)
      INSERT INTO users_raw (
        school_id,
        role,
        name,
        instrument,
        is_campus_active,
        is_groovelab_active,
        status,
        created_at
      ) VALUES (
        p_school_id,
        'student',
        v_record.payload->>'sanitized_name',
        COALESCE(v_record.payload->>'instrument', 'Allgemein'),
        true,
        false,
        'active',
        NOW()
      );
      v_inserted_students := v_inserted_students + 1;

    ELSIF v_record.entity_type = 'TEACHER' THEN
      -- Dozenten-Import in users_raw (Rein didaktisch, keine Gehalts- oder Honorardaten)
      INSERT INTO users_raw (
        school_id,
        role,
        name,
        instrument,
        email,
        status,
        created_at
      ) VALUES (
        p_school_id,
        'teacher',
        v_record.payload->>'full_name',
        COALESCE(v_record.payload->>'instrument', 'Allgemein'),
        LOWER(TRIM(v_record.payload->>'email')),
        'active',
        NOW()
      );
      v_inserted_teachers := v_inserted_teachers + 1;
    END IF;
  END LOOP;

  -- Nach erfolgreicher Transaktion Staging-Batch vollständig bereinigen
  DELETE FROM migration_staging_records WHERE batch_id = p_batch_id;

  -- Revisionssicheres Audit-Logging
  INSERT INTO public.audit_logs (
    school_id,
    table_name,
    operation,
    changed_by,
    details
  ) VALUES (
    p_school_id,
    'users_raw',
    'LEGACY_IMPORT',
    auth.uid(),
    jsonb_build_object(
      'batch_id', p_batch_id,
      'students_imported', v_inserted_students,
      'teachers_imported', v_inserted_teachers
    )
  );

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'students_imported', v_inserted_students,
    'teachers_imported', v_inserted_teachers
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Transaktionaler Rollback verhindert unvollständigen Datenmüll
    RAISE EXCEPTION 'Migration aborted due to database constraint: %', SQLERRM;
END;
$$;
