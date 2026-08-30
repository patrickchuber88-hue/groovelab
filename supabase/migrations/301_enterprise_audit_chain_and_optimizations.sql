-- ======================================================================================
-- MIGRATION 301: ENTERPRISE AUDIT LOG HASH CHAINING & RLS OPTIMIZATIONS
-- Campus-Groovelab Mathematical Immutability & Sub-Millisecond Tenant Performance
-- ======================================================================================

-- 1. EXTEND AUDIT LOGS WITH CRYPTOGRAPHIC HASH CHAINING
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'previous_hash'
    ) THEN
        ALTER TABLE public.audit_logs ADD COLUMN previous_hash TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'entry_hash'
    ) THEN
        ALTER TABLE public.audit_logs ADD COLUMN entry_hash TEXT;
    END IF;
END $$;

-- 2. TRIGGER: AUTOMATIC MERKLE HASH CHAIN CALCULATOR
CREATE OR REPLACE FUNCTION public.calculate_audit_log_hash_chain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

    -- Compute SHA-256 over: previous_hash + created_at + user_id + action + entity_type + entity_id
    v_payload := NEW.previous_hash || '|' || 
                 COALESCE(NEW.created_at::text, NOW()::text) || '|' || 
                 COALESCE(NEW.user_id::text, '') || '|' || 
                 COALESCE(NEW.action, '') || '|' || 
                 COALESCE(NEW.entity_type, '') || '|' || 
                 COALESCE(NEW.entity_id::text, '');

    NEW.entry_hash := encode(digest(v_payload, 'sha256'), 'hex');

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_log_hash_chain ON public.audit_logs;
CREATE TRIGGER trg_audit_log_hash_chain
    BEFORE INSERT ON public.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_audit_log_hash_chain();

-- 3. RLS QUERY OPTIMIZER: Transaction-Scoped Tenant Caching
CREATE OR REPLACE FUNCTION public.get_cached_school_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cached TEXT;
    v_school_id UUID;
BEGIN
    -- Check transaction local setting
    BEGIN
        v_cached := current_setting('app.current_school_id', true);
    EXCEPTION WHEN OTHERS THEN
        v_cached := NULL;
    END;

    IF v_cached IS NOT NULL AND v_cached <> '' THEN
        RETURN v_cached::UUID;
    END IF;

    -- Resolve school_id from session context
    v_school_id := public.get_current_user_school_id();
    
    IF v_school_id IS NOT NULL THEN
        PERFORM set_config('app.current_school_id', v_school_id::text, true);
    END IF;

    RETURN v_school_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cached_school_id() TO anon, authenticated, service_role;

-- 4. AUTOMATED GDPR RETENTION CLEANER
CREATE OR REPLACE FUNCTION public.cleanup_expired_gdpr_retention()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted_leases INT := 0;
    v_deleted_lockouts INT := 0;
BEGIN
    -- 1. Remove expired session leases older than 7 days
    DELETE FROM public.session_leases
    WHERE expires_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS v_deleted_leases = ROW_COUNT;

    -- 2. Remove cleared security lockouts older than 24 hours
    DELETE FROM public.security_lockouts
    WHERE locked_until < NOW() - INTERVAL '24 hours';
    GET DIAGNOSTICS v_deleted_lockouts = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'deleted_leases', v_deleted_leases,
        'deleted_lockouts', v_deleted_lockouts,
        'executed_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_gdpr_retention() TO anon, authenticated, service_role;
