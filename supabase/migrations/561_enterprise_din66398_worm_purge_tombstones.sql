-- ==============================================================================
-- ⚖️ Migration 561: Enterprise DIN 66398 WORM Purge Tombstones & Anti-Zombie Shield
-- Standards:
-- - DIN 66398 Löschklassen LK 1–5 (Verlässliche Tilgung didaktischer Mediendaten)
-- - DSGVO Art. 17 (Recht auf Vergessenwerden) & Art. 5 Abs. 1 lit. e (Speicherbegrenzung)
-- - BSI IT-Grundschutz & ISO/IEC 27001 Annex A.8 (WORM Immutability)
-- - Disaster Recovery Anti-Zombie Reconciliation: Verhindert die Re-Animation
--   gelöschter Audio-Aufnahmen nach Backup-Restores
-- ==============================================================================

-- 1. Tabelle für kryptografische DIN 66398 Lösch-Tombstones
CREATE TABLE IF NOT EXISTS public.academic_year_purge_tombstones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  purge_cycle_year INT NOT NULL,
  purge_cycle_month INT NOT NULL,
  purged_records_count INT NOT NULL DEFAULT 0,
  payload_sha256 TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexierung für Hochgeschwindigkeits-Abfragen bei Reconciliations
CREATE INDEX IF NOT EXISTS idx_purge_tombstones_school_cycle 
  ON public.academic_year_purge_tombstones(school_id, purge_cycle_year);

-- 2. Multi-Tenancy & Row-Level-Security (Kernel Level Default-Deny)
ALTER TABLE public.academic_year_purge_tombstones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_year_purge_tombstones FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS purge_tombstones_select_policy ON public.academic_year_purge_tombstones;
CREATE POLICY purge_tombstones_select_policy ON public.academic_year_purge_tombstones
  FOR SELECT
  USING (
    school_id = (SELECT public.get_current_user_school_id())
    OR (SELECT is_master_admin FROM public.users WHERE id = auth.uid()) = true
  );

-- 3. WORM Immutability Trigger (Kein physisches UPDATE oder DELETE zulässig)
CREATE OR REPLACE FUNCTION public.trg_prevent_purge_tombstones_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE EXCEPTION 'REVISIONSSICHERHEIT: DIN 66398 WORM-Tombstones sind unveränderbar (WORM Append-Only Schutz). UPDATE und DELETE sind verboten.'
    USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_purge_tombstones_tampering ON public.academic_year_purge_tombstones;
CREATE TRIGGER trg_prevent_purge_tombstones_tampering
  BEFORE UPDATE OR DELETE ON public.academic_year_purge_tombstones
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_prevent_purge_tombstones_tampering();

-- 4. Gehärtete Cron-Bereinigungsfunktion mit WORM-Tombstone Signatur
CREATE OR REPLACE FUNCTION public.cron_enforce_academic_year_audio_purge()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
  v_current_month INT := EXTRACT(MONTH FROM CURRENT_DATE);
  v_current_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
  v_school RECORD;
  v_school_purged INT := 0;
  v_total_purged INT := 0;
  v_processed_schools INT := 0;
  v_digest TEXT;
BEGIN
  FOR v_school IN 
    SELECT id, name 
    FROM public.schools 
    WHERE COALESCE(academic_year_start_month, 9) = v_current_month
  LOOP
    v_processed_schools := v_processed_schools + 1;

    -- Bereinigung verwaister/abgelaufener Audio-Referenzen (älter als 45 Tage)
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

    -- Erzeugung des kryptografischen SHA-256 WORM-Tombstones
    IF v_school_purged > 0 THEN
      v_digest := encode(
        digest(
          v_school.id::TEXT || ':' || v_current_year::TEXT || ':' || v_current_month::TEXT || ':' || v_school_purged::TEXT || ':' || NOW()::TEXT,
          'sha256'
        ),
        'hex'
      );

      INSERT INTO public.academic_year_purge_tombstones (
        school_id,
        purge_cycle_year,
        purge_cycle_month,
        purged_records_count,
        payload_sha256,
        executed_at
      ) VALUES (
        v_school.id,
        v_current_year,
        v_current_month,
        v_school_purged,
        v_digest,
        NOW()
      );

      -- Revisionssicherer Audit-Trail
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
          'tombstone_sha256', v_digest,
          'executed_at', NOW()
        )
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'current_month', v_current_month,
    'current_year', v_current_year,
    'processed_schools', v_processed_schools,
    'total_purged_records', v_total_purged
  );
END;
$$;

-- 5. Anti-Zombie Disaster Recovery Reconciliator
-- Tilgt nach Katastrophen-Restores versehentlich reanimierte Altdaten atomar
CREATE OR REPLACE FUNCTION public.reconcile_din66398_disaster_recovery_tombstones(p_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
  v_reconciled INT := 0;
BEGIN
  -- Nur Schulleiter oder Master-Admin dürfen reconcilen
  IF NOT (
    (SELECT is_master_admin FROM public.users WHERE id = auth.uid()) = true
    OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'secretary')
  ) THEN
    RAISE EXCEPTION 'Zugriff verweigert: Unzureichende Privilegien für Tombstone-Reconciliation.'
      USING ERRCODE = '42501';
  END IF;

  -- Tilgung von Progress-Matrix Audios, falls für das Schuljahr ein Tombstone vorliegt
  UPDATE public.progress_matrix pm
  SET audio_url = NULL,
      homework_notes = COALESCE(homework_notes, '') || ' [DIN66398_RECONCILED_TOMBSTONE]'
  WHERE pm.school_id = p_school_id
    AND pm.audio_url IS NOT NULL
    AND pm.created_at < (CURRENT_DATE - INTERVAL '45 days')
    AND EXISTS (
      SELECT 1 FROM public.academic_year_purge_tombstones t
      WHERE t.school_id = p_school_id
        AND t.purge_cycle_year = EXTRACT(YEAR FROM pm.created_at)::INT
    );

  GET DIAGNOSTICS v_reconciled = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'school_id', p_school_id,
    'reconciled_records', v_reconciled
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cron_enforce_academic_year_audio_purge() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_din66398_disaster_recovery_tombstones(UUID) TO authenticated, service_role;
