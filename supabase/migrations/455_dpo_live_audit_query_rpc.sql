-- ==============================================================================
-- ⚖️ Migration 455: DPO Live Audit Query RPC (DSGVO Art. 28 Abs. 3 lit. h / Art. 24)
-- Standards:
-- - DSGVO Art. 28 Abs. 3 lit. h: Kontroll- & Inspektionsrechte kommunaler Träger & DSBs
-- - OWASP ASVS Level 3: Fail-Closed Tenant Scoping
-- - Liefert autoritative Live-Einträge aus public.audit_logs für das DPO-Portal
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_tenant_dpo_audit_trail(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  table_name TEXT,
  operation TEXT,
  actor_id UUID,
  record_id UUID,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
  v_school_id UUID := get_current_user_school_id();
  v_limit INT := LEAST(GREATEST(p_limit, 1), 100);
  v_offset INT := GREATEST(p_offset, 0);
BEGIN
  -- 1. Fail-Closed: Keine Mandantenüberschreitung
  IF v_school_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    al.id,
    al.created_at,
    al.table_name,
    COALESCE(al.new_data->>'action', al.new_data->>'event_type', al.table_name) AS operation,
    al.changed_by AS actor_id,
    al.record_id,
    al.new_data AS details
  FROM public.audit_logs al
  WHERE 
    al.record_id = v_school_id
    OR (al.new_data->>'school_id')::TEXT = v_school_id::TEXT
    OR (al.new_data->>'schoolId')::TEXT = v_school_id::TEXT
    OR (al.new_data->'metadata'->>'schoolId')::TEXT = v_school_id::TEXT
    OR al.changed_by IN (SELECT u.id FROM public.users u WHERE u.school_id = v_school_id)
  ORDER BY al.created_at DESC
  LIMIT v_limit OFFSET v_offset;
END;
$$;

-- Berechtigungen vergeben
GRANT EXECUTE ON FUNCTION public.get_tenant_dpo_audit_trail(INT, INT) TO authenticated;
