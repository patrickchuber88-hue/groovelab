-- ==============================================================================
-- ⚖️ Migration 454: Dynamic Academic Year Purge & Schema (DIN 66398 / DSGVO Art. 17)
-- Standards:
-- - DIN 66398 Löschklasse LK 3: Jahresbezogene didaktische Daten
-- - DSGVO Art. 5 Abs. 1 lit. e (Speicherbegrenzung) & Art. 17 (Recht auf Vergessenwerden)
-- - Multi-Tenant-fähige Konfiguration des individuellen Schuljahres-Startmonats (1–12)
-- - Automatische Karenzzeit (Löschung am Monatsletzten des individuellen Startmonats)
-- ==============================================================================

-- 1. Schuljahres-Startmonat konfigurierbar pro Mandant (Default: 9 = September)
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS academic_year_start_month SMALLINT DEFAULT 9 
CHECK (academic_year_start_month BETWEEN 1 AND 12);

-- 2. Automatische Bereinigungsfunktion für das jeweilige Schuljahr
CREATE OR REPLACE FUNCTION public.cron_enforce_academic_year_audio_purge()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
  v_current_month INT := EXTRACT(MONTH FROM CURRENT_DATE);
  v_school RECORD;
  v_school_purged INT := 0;
  v_total_purged INT := 0;
  v_processed_schools INT := 0;
BEGIN
  -- Iteriere über alle Schulen, deren Schuljahr im aktuellen Monat begonnen hat
  -- (Ende der 1-monatigen Eltern-Export- und Download-Karenz nach Art. 20 DSGVO)
  FOR v_school IN 
    SELECT id, name 
    FROM public.schools 
    WHERE COALESCE(academic_year_start_month, 9) = v_current_month
  LOOP
    v_processed_schools := v_processed_schools + 1;

    -- Physisches Löschen verwaister/abgelaufener Audio-Referenzen dieser Schule
    -- Schutz: Nur Datensätze bereinigen, die älter als 45 Tage sind (Schutz des neuen Schuljahres)
    WITH target_records AS (
      SELECT pm.id
      FROM public.progress_matrix pm
      WHERE pm.school_id = v_school.id
        AND pm.audio_url IS NOT NULL
        AND pm.created_at < (CURRENT_DATE - INTERVAL '45 days')
    )
    UPDATE public.progress_matrix
    SET audio_url = NULL,
        homework_notes = COALESCE(homework_notes, '') || ' [DIN66398_SCHULJAHRES_PURGE]'
    WHERE id IN (SELECT id FROM target_records);

    GET DIAGNOSTICS v_school_purged = ROW_COUNT;
    v_total_purged := v_total_purged + v_school_purged;

    -- Revisionssicheres WORM-Audit-Logging pro Mandant
    IF v_school_purged > 0 THEN
      INSERT INTO public.audit_logs (table_name, operation, record_id, changed_by, new_data)
      VALUES (
        'progress_matrix',
        'DIN66398_ACADEMIC_YEAR_PURGE',
        v_school.id,
        '00000000-0000-0000-0000-000000000000'::UUID,
        jsonb_build_object(
          'school_id', v_school.id,
          'school_name', v_school.name,
          'academic_year_start_month', v_current_month,
          'purged_audio_records', v_school_purged,
          'executed_at', NOW()
        )
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'current_month', v_current_month,
    'processed_schools', v_processed_schools,
    'total_purged_records', v_total_purged
  );
END;
$$;

-- Berechtigungen vergeben
GRANT EXECUTE ON FUNCTION public.cron_enforce_academic_year_audio_purge() TO postgres, service_role;
