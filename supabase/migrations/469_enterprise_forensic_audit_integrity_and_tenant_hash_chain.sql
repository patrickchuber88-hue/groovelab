-- ==============================================================================
-- Migration 469: Enterprise Forensic Audit Integrity & Tenant Hash Chain
-- Standards: OWASP ASVS Level 3 / ISO/IEC 27037 / GoBD / BSI TR-03185
--
-- 1. REVOKE DIRECT CLIENT INSERTS ON public.audit_logs (CWE-117 Beseitigung)
-- 2. AUTHORITATIVE SECURITY DEFINER RPC: public.log_application_audit_event
-- 3. TENANT-PARTITIONED MERKLE HASH CHAIN: trg_audit_logs_tenant_hash_chain
-- 4. FORENSIC VERIFIER RPC: public.verify_audit_log_tenant_chain
-- ==============================================================================

-- 1. Ensure required extensions & columns
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
BEGIN
    IF to_regclass('public.audit_logs') IS NOT NULL THEN
        ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
        ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_id UUID;
        ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_id UUID;
        ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS details JSONB;
        ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS prev_hash TEXT;
        ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS current_hash TEXT;
        ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
        ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_id TEXT;
    END IF;
END $$;

-- 2. REVOKE direct client INSERT on public.audit_logs
REVOKE INSERT ON public.audit_logs FROM authenticated, anon, public;
GRANT INSERT ON public.audit_logs TO postgres, supabase_admin, service_role;

-- Enforce strict RLS policy: client inserts are rejected; only SECURITY DEFINER or service_role can write
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_insert_scoped" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_scoped" ON public.audit_logs
FOR INSERT TO authenticated, anon, service_role
WITH CHECK (
    current_user IN ('postgres', 'supabase_admin', 'service_role')
);

-- Index for high-performance tenant hash-chain lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_hash_lookup
ON public.audit_logs (school_id, created_at DESC, id DESC)
WHERE current_hash IS NOT NULL;

-- 3. AUTHORITATIVE SECURITY DEFINER RPC: public.log_application_audit_event
CREATE OR REPLACE FUNCTION public.log_application_audit_event(
    p_school_id UUID,
    p_action TEXT,
    p_table_name TEXT DEFAULT 'application',
    p_record_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_caller_uid UUID;
    v_user_school_id UUID;
    v_is_master BOOLEAN;
    v_new_id UUID;
BEGIN
    v_caller_uid := auth.uid();
    
    -- Absolute Zero-Trust: Caller must be authenticated
    IF v_caller_uid IS NULL THEN
        RAISE EXCEPTION 'Authentifizierung erforderlich: Anonyme Audit-Protokollierung ist untersagt.';
    END IF;

    v_is_master := public.is_master_admin();
    v_user_school_id := public.get_current_user_school_id();

    -- Multi-tenant boundary check: caller must belong to target school or be master admin
    IF NOT v_is_master AND (p_school_id IS NOT NULL AND p_school_id <> v_user_school_id) THEN
        RAISE EXCEPTION 'Mandanten-Verletzung: Es dürfen keine Audit-Einträge für fremde Schulen erzeugt werden.';
    END IF;

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
        COALESCE(p_school_id, v_user_school_id),
        COALESCE(p_table_name, 'application'),
        p_action,
        p_record_id,
        v_caller_uid,
        v_caller_uid,
        COALESCE(p_record_id, v_caller_uid),
        COALESCE(p_details, '{}'::jsonb)
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_application_audit_event(UUID, TEXT, TEXT, UUID, JSONB) TO authenticated, service_role;

-- 4. TENANT-PARTITIONED MERKLE HASH CHAIN TRIGGER
CREATE OR REPLACE FUNCTION public.trg_audit_hash_chain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_prev_hash TEXT;
    v_effective_school UUID;
BEGIN
    v_effective_school := NEW.school_id;

    -- Strict Tenant Partitioning: Look up previous hash ONLY within the same school_id
    IF v_effective_school IS NOT NULL THEN
        SELECT current_hash INTO v_prev_hash
        FROM public.audit_logs
        WHERE school_id = v_effective_school
          AND current_hash IS NOT NULL
          AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        ORDER BY created_at DESC, id DESC
        LIMIT 1;

        NEW.prev_hash := COALESCE(v_prev_hash, 'GENESIS_SEAL_' || replace(v_effective_school::text, '-', '_'));
    ELSE
        SELECT current_hash INTO v_prev_hash
        FROM public.audit_logs
        WHERE school_id IS NULL
          AND current_hash IS NOT NULL
          AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        ORDER BY created_at DESC, id DESC
        LIMIT 1;

        NEW.prev_hash := COALESCE(v_prev_hash, 'GENESIS_SEAL_CAMPUS_GROOVELAB_GLOBAL');
    END IF;

    -- Calculate immutable SHA-256 seal for current row
    NEW.current_hash := encode(
        extensions.digest(
            NEW.prev_hash || '|' ||
            COALESCE(NEW.id::text, '') || '|' ||
            COALESCE(NEW.action, '') || '|' ||
            COALESCE(NEW.table_name, '') || '|' ||
            COALESCE(NEW.record_id::text, '') || '|' ||
            COALESCE(NEW.changed_by::text, '') || '|' ||
            COALESCE(NEW.school_id::text, '') || '|' ||
            COALESCE(NEW.created_at::text, NOW()::text),
            'sha256'
        ),
        'hex'
    );

    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF to_regclass('public.audit_logs') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_audit_logs_hash_chain ON public.audit_logs;
        CREATE TRIGGER trg_audit_logs_hash_chain
            BEFORE INSERT ON public.audit_logs
            FOR EACH ROW
            EXECUTE FUNCTION public.trg_audit_hash_chain();
    END IF;
END $$;

-- 5. FORENSIC VERIFIER RPC: public.verify_audit_log_tenant_chain
CREATE OR REPLACE FUNCTION public.verify_audit_log_tenant_chain(
    p_school_id UUID,
    p_limit INT DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    r RECORD;
    v_expected_prev_hash TEXT := NULL;
    v_calculated_hash TEXT;
    v_verified_count INT := 0;
    v_broken_id UUID := NULL;
    v_error_msg TEXT := NULL;
    v_genesis_prefix TEXT;
BEGIN
    -- Authorization check: master admin or school admin of the specified school
    IF NOT public.is_master_admin() AND (p_school_id IS NULL OR p_school_id <> public.get_current_user_school_id()) THEN
        RAISE EXCEPTION 'Zugriff verweigert: Unberechtigte Audit-Verifikation.';
    END IF;

    IF p_school_id IS NOT NULL THEN
        v_genesis_prefix := 'GENESIS_SEAL_' || replace(p_school_id::text, '-', '_');
    ELSE
        v_genesis_prefix := 'GENESIS_SEAL_CAMPUS_GROOVELAB_GLOBAL';
    END IF;

    -- Iterate chronological sequence in the requested audit window
    FOR r IN (
        SELECT id, action, table_name, record_id, changed_by, school_id, created_at, prev_hash, current_hash
        FROM (
            SELECT *
            FROM public.audit_logs
            WHERE (p_school_id IS NULL AND school_id IS NULL) OR school_id = p_school_id
            ORDER BY created_at DESC, id DESC
            LIMIT GREATEST(1, LEAST(p_limit, 1000))
        ) sub
        ORDER BY created_at ASC, id ASC
    ) LOOP
        -- Verify prev_hash continuity unless at start of window
        IF v_expected_prev_hash IS NOT NULL AND r.prev_hash <> v_expected_prev_hash THEN
            v_broken_id := r.id;
            v_error_msg := format('Chain broken at record %s: expected prev_hash %s, got %s', r.id, v_expected_prev_hash, r.prev_hash);
            EXIT;
        END IF;

        -- Recompute cryptographic hash
        v_calculated_hash := encode(
            extensions.digest(
                r.prev_hash || '|' ||
                COALESCE(r.id::text, '') || '|' ||
                COALESCE(r.action, '') || '|' ||
                COALESCE(r.table_name, '') || '|' ||
                COALESCE(r.record_id::text, '') || '|' ||
                COALESCE(r.changed_by::text, '') || '|' ||
                COALESCE(r.school_id::text, '') || '|' ||
                COALESCE(r.created_at::text, ''),
                'sha256'
            ),
            'hex'
        );

        IF r.current_hash <> v_calculated_hash THEN
            v_broken_id := r.id;
            v_error_msg := format('Hash mismatch at record %s: stored %s, recomputed %s', r.id, r.current_hash, v_calculated_hash);
            EXIT;
        END IF;

        v_expected_prev_hash := r.current_hash;
        v_verified_count := v_verified_count + 1;
    END LOOP;

    IF v_broken_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'status', 'BROKEN',
            'verified_count', v_verified_count,
            'broken_record_id', v_broken_id,
            'error', v_error_msg,
            'school_id', p_school_id
        );
    ELSE
        RETURN jsonb_build_object(
            'status', 'VALID',
            'verified_count', v_verified_count,
            'school_id', p_school_id,
            'head_hash', v_expected_prev_hash,
            'verified_at', NOW()
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_audit_log_tenant_chain(UUID, INT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
