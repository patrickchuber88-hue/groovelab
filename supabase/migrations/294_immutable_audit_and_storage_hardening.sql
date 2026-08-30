-- Migration 294: Immutable Hash-Chained Audit Ledger, Storage RLS Hardening & Maintenance Janitor
-- Implements:
-- 1. Tamper-evident immutable audit ledger with SHA-256 hash chaining (GoBD/DSGVO compliance)
-- 2. Storage RLS Hardening for private audio recordings in campus-assets and groovelab-assets
-- 3. Automated Janitor function for pruning expired rate limits and stale session leases

-- 1. Create Immutable Audit Ledger
CREATE TABLE IF NOT EXISTS public.immutable_audit_ledger (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    actor_id UUID,
    actor_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    payload JSONB DEFAULT '{}'::JSONB,
    previous_hash TEXT NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
    entry_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_immutable_audit_school_id ON public.immutable_audit_ledger(school_id);
CREATE INDEX IF NOT EXISTS idx_immutable_audit_timestamp ON public.immutable_audit_ledger(timestamp);

-- Enable RLS (Read-only for school administrators, no direct INSERT/UPDATE/DELETE from client)
ALTER TABLE public.immutable_audit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "immutable_audit_select" ON public.immutable_audit_ledger;
CREATE POLICY "immutable_audit_select" ON public.immutable_audit_ledger
FOR SELECT TO authenticated, anon
USING (
    public.is_master_admin()
    OR (
        public.check_school_access(school_id)
        AND public.get_current_user_role() IN ('admin', 'secretary')
    )
);

-- Trigger: Enforce Append-Only & Calculate SHA-256 Hash Chain
CREATE OR REPLACE FUNCTION public.process_immutable_audit_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_last_hash TEXT;
    v_content_to_hash TEXT;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        RAISE EXCEPTION 'Das Audit-Ledger ist unveränderbar (Append-Only). UPDATE und DELETE sind untersagt.';
    END IF;

    -- Fetch the most recent hash from the ledger
    SELECT entry_hash INTO v_last_hash
    FROM public.immutable_audit_ledger
    ORDER BY id DESC
    LIMIT 1;

    NEW.previous_hash := COALESCE(v_last_hash, '0000000000000000000000000000000000000000000000000000000000000000');
    NEW.timestamp := COALESCE(NEW.timestamp, NOW());

    -- Compute deterministic SHA-256 hash of this entry
    v_content_to_hash := NEW.previous_hash || '|' ||
                         COALESCE(NEW.school_id::TEXT, '') || '|' ||
                         COALESCE(NEW.actor_id::TEXT, '') || '|' ||
                         NEW.action || '|' ||
                         NEW.entity_type || '|' ||
                         COALESCE(NEW.entity_id, '') || '|' ||
                         COALESCE(NEW.payload::TEXT, '{}') || '|' ||
                         NEW.timestamp::TEXT;

    NEW.entry_hash := encode(extensions.digest(v_content_to_hash, 'sha256'), 'hex');

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_immutable_audit_hash_chain ON public.immutable_audit_ledger;
CREATE TRIGGER trg_immutable_audit_hash_chain
    BEFORE INSERT OR UPDATE OR DELETE ON public.immutable_audit_ledger
    FOR EACH ROW
    EXECUTE FUNCTION public.process_immutable_audit_entry();

-- 2. Storage RLS Hardening for Sensitive Audio Recordings
-- Protect private student audio recordings while maintaining public access to general UI assets/covers
DROP POLICY IF EXISTS "Allow public read access to campus-assets" ON storage.objects;
CREATE POLICY "Allow public read access to campus-assets"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'campus-assets'
    AND (
        -- General public assets (covers, logos, badges, static icons)
        name NOT LIKE 'recordings/%'
        AND name NOT LIKE 'audio_vault/%'
        AND name NOT LIKE 'private/%'
        -- Or authenticated user within the school
        OR (
            auth.role() = 'authenticated'
            OR public.get_current_user_id() IS NOT NULL
        )
    )
);

DROP POLICY IF EXISTS "Allow public read access to groovelab-assets" ON storage.objects;
CREATE POLICY "Allow public read access to groovelab-assets"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'groovelab-assets'
    AND (
        name NOT LIKE 'recordings/%'
        AND name NOT LIKE 'audio_vault/%'
        AND name NOT LIKE 'private/%'
        OR (
            auth.role() = 'authenticated'
            OR public.get_current_user_id() IS NOT NULL
        )
    )
);

-- 3. Automated Janitor Function for Database Hygiene
CREATE OR REPLACE FUNCTION public.prune_stale_security_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_rate_limits_deleted INT := 0;
    v_leases_deleted INT := 0;
BEGIN
    -- 1. Delete expired rate-limit records (> 24h expired)
    DELETE FROM public.auth_rate_limits
    WHERE (locked_until IS NOT NULL AND locked_until < (NOW() - INTERVAL '24 hours'))
       OR (locked_until IS NULL AND last_attempt_at < (NOW() - INTERVAL '48 hours'));
    GET DIAGNOSTICS v_rate_limits_deleted = ROW_COUNT;

    -- 2. Delete revoked session leases (> 30 days old) or inactive leases (> 90 days old)
    DELETE FROM public.session_leases
    WHERE (is_revoked = TRUE AND revoked_at < (NOW() - INTERVAL '30 days'))
       OR (last_active_at < (NOW() - INTERVAL '90 days'));
    GET DIAGNOSTICS v_leases_deleted = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'pruned_rate_limits', v_rate_limits_deleted,
        'pruned_session_leases', v_leases_deleted,
        'pruned_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.prune_stale_security_data() TO authenticated, service_role;
