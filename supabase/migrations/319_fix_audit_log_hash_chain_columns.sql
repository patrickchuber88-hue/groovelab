-- ==============================================================================
-- Migration 319: Fix calculate_audit_log_hash_chain column references
-- Standard: Merkle Audit Chain Tier-1 Enterprise Integrity
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.calculate_audit_log_hash_chain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp', 'extensions'
AS $$
DECLARE
    v_last_hash TEXT;
    v_payload TEXT;
BEGIN
    -- Get hash of previous log entry
    SELECT entry_hash INTO v_last_hash
    FROM public.audit_logs
    WHERE id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ORDER BY created_at DESC
    LIMIT 1;

    NEW.previous_hash := COALESCE(v_last_hash, 'GENESIS_BLOCK_CAMPUS_GROOVELAB_ROOT');

    -- Compute SHA-256 over: previous_hash + created_at + changed_by + action + table_name + record_id
    v_payload := NEW.previous_hash || '|' ||
                 COALESCE(NEW.created_at::text, NOW()::text) || '|' ||
                 COALESCE(NEW.changed_by::text, '') || '|' ||
                 COALESCE(NEW.action, '') || '|' ||
                 COALESCE(NEW.table_name, '') || '|' ||
                 COALESCE(NEW.record_id::text, '');

    NEW.entry_hash := encode(digest(v_payload, 'sha256'), 'hex');

    RETURN NEW;
END;
$$;
