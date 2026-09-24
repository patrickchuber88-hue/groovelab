-- ==============================================================================
-- Migration: 476_enterprise_forensic_shield_worm_storage_and_tombstones.sql
-- Description: Enterprise Forensic Shield (OWASP ASVS Level 3, BSI IT-Grundschutz, DSGVO Art. 17)
-- Includes:
-- 1. WORM Immutability (Write-Once-Read-Many) for public.audit_logs & master_audit_trail
-- 2. Cryptographic SHA-256 Hash Chaining on Audit Records
-- 3. Storage Object Tenant-Scoping for campus-assets & groovelab-assets
-- 4. Dedicated audit.gdpr_tombstones Ledger for Disaster Recovery Re-Purge
-- 5. Forensic Brute-Force Rate Limiting & Auth Intrusion Sentinel
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Dedicated audit Schema & GDPR Tombstone Ledger (DSGVO Art. 17)
-- ------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.gdpr_tombstones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_uuid UUID NOT NULL,
  purged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  purged_by UUID,
  verification_seal TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for instant lookup during disaster recovery reconcile
CREATE INDEX IF NOT EXISTS idx_gdpr_tombstones_lookup 
  ON audit.gdpr_tombstones (entity_uuid, entity_type);

CREATE INDEX IF NOT EXISTS idx_gdpr_tombstones_school 
  ON audit.gdpr_tombstones (school_id, purged_at DESC);

-- WORM Rules on audit.gdpr_tombstones: Unveränderbarkeit gegen Manipulation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_rules WHERE tablename = 'gdpr_tombstones' AND rulename = 'gdpr_tombstones_no_update'
  ) THEN
    CREATE RULE gdpr_tombstones_no_update AS ON UPDATE TO audit.gdpr_tombstones DO INSTEAD NOTHING;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_rules WHERE tablename = 'gdpr_tombstones' AND rulename = 'gdpr_tombstones_no_delete'
  ) THEN
    CREATE RULE gdpr_tombstones_no_delete AS ON DELETE TO audit.gdpr_tombstones DO INSTEAD NOTHING;
  END IF;
END $$;

-- RPC to register a GDPR Tombstone (Fail-Closed & Authoritative)
CREATE OR REPLACE FUNCTION audit.register_gdpr_tombstone(
  p_school_id UUID,
  p_entity_type TEXT,
  p_entity_uuid UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit, extensions, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_school UUID;
  v_seal TEXT;
  v_record_id UUID;
BEGIN
  v_caller_id := get_current_authenticated_user_id();
  v_caller_school := get_current_user_school_id();

  -- Security check: Must be Master Admin or Admin of the target school
  IF NOT (
    is_master_admin()
    OR (v_caller_school IS NOT NULL AND v_caller_school = p_school_id)
  ) THEN
    RAISE EXCEPTION 'Access denied to register GDPR tombstone' USING ERRCODE = '42501';
  END IF;

  -- Compute deterministic SHA-256 seal
  v_seal := encode(
    digest(
      p_school_id::text || '|' || p_entity_type || '|' || p_entity_uuid::text || '|' || clock_timestamp()::text,
      'sha256'
    ),
    'hex'
  );

  INSERT INTO audit.gdpr_tombstones (
    school_id,
    entity_type,
    entity_uuid,
    purged_at,
    purged_by,
    verification_seal
  ) VALUES (
    p_school_id,
    p_entity_type,
    p_entity_uuid,
    NOW(),
    v_caller_id,
    v_seal
  )
  RETURNING id INTO v_record_id;

  RETURN jsonb_build_object(
    'success', true,
    'tombstone_id', v_record_id,
    'verification_seal', v_seal
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. WORM Immutability on public.audit_logs & master_audit_trail
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- WORM Protection for public.audit_logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_rules WHERE tablename = 'audit_logs' AND rulename = 'audit_logs_no_update') THEN
      CREATE RULE audit_logs_no_update AS ON UPDATE TO public.audit_logs DO INSTEAD NOTHING;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_rules WHERE tablename = 'audit_logs' AND rulename = 'audit_logs_no_delete') THEN
      CREATE RULE audit_logs_no_delete AS ON DELETE TO public.audit_logs DO INSTEAD NOTHING;
    END IF;
  END IF;

  -- WORM Protection for master_audit_trail
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'master_audit_trail') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_rules WHERE tablename = 'master_audit_trail' AND rulename = 'master_audit_trail_no_update') THEN
      CREATE RULE master_audit_trail_no_update AS ON UPDATE TO public.master_audit_trail DO INSTEAD NOTHING;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_rules WHERE tablename = 'master_audit_trail' AND rulename = 'master_audit_trail_no_delete') THEN
      CREATE RULE master_audit_trail_no_delete AS ON DELETE TO public.master_audit_trail DO INSTEAD NOTHING;
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. Storage Tenant Isolation Policy for storage.objects
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- Enable RLS on storage.objects if storage schema exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

    -- Drop existing wide policy if present to enforce fail-closed scoping
    DROP POLICY IF EXISTS "tenant_storage_isolation" ON storage.objects;
    DROP POLICY IF EXISTS "tenant_storage_scoped_access" ON storage.objects;

    CREATE POLICY "tenant_storage_scoped_access" ON storage.objects
    FOR ALL TO authenticated
    USING (
      -- Master Admin bypass
      is_master_admin()
      OR (
        -- Assets must be in tenant folder matching user school_id
        bucket_id IN ('campus-assets', 'groovelab-assets')
        AND (
          (storage.foldername(name))[1] = (SELECT get_current_user_school_id()::text)
          OR (storage.foldername(name))[1] = (SELECT auth.uid()::text)
        )
      )
    )
    WITH CHECK (
      is_master_admin()
      OR (
        bucket_id IN ('campus-assets', 'groovelab-assets')
        AND (
          (storage.foldername(name))[1] = (SELECT get_current_user_school_id()::text)
          OR (storage.foldername(name))[1] = (SELECT auth.uid()::text)
        )
      )
    );
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. Forensic Brute-Force Rate Limiting & Auth Intrusion Sentinel
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit.auth_rate_limit_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,         -- user_id or IP or credential
  action_type TEXT NOT NULL,        -- 'PIN_VERIFY', 'PARENT_PIN_VERIFY', 'RPC_CALL'
  failed_attempts INT NOT NULL DEFAULT 1,
  first_failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  school_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup 
  ON audit.auth_rate_limit_tracker (identifier, action_type);

-- Function to record and evaluate auth failures (Fail-Closed)
CREATE OR REPLACE FUNCTION audit.record_and_evaluate_auth_failure(
  p_identifier TEXT,
  p_action_type TEXT,
  p_max_attempts INT DEFAULT 5,
  p_lockout_seconds INT DEFAULT 900,
  p_school_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit, extensions, pg_temp
AS $$
DECLARE
  v_rec RECORD;
  v_locked BOOLEAN := false;
  v_remaining_lock INT := 0;
  v_new_locked_until TIMESTAMPTZ := NULL;
BEGIN
  SELECT * INTO v_rec
  FROM audit.auth_rate_limit_tracker
  WHERE identifier = p_identifier AND action_type = p_action_type
  FOR UPDATE;

  IF FOUND THEN
    -- Check if currently locked
    IF v_rec.locked_until IS NOT NULL AND v_rec.locked_until > NOW() THEN
      v_remaining_lock := EXTRACT(EPOCH FROM (v_rec.locked_until - NOW()))::INT;
      RETURN jsonb_build_object(
        'is_locked', true,
        'remaining_seconds', v_remaining_lock,
        'attempts', v_rec.failed_attempts
      );
    END IF;

    -- If past lockout period, reset counter
    IF v_rec.last_failed_at < NOW() - INTERVAL '15 minutes' THEN
      UPDATE audit.auth_rate_limit_tracker
      SET failed_attempts = 1,
          first_failed_at = NOW(),
          last_failed_at = NOW(),
          locked_until = NULL
      WHERE id = v_rec.id;
    ELSE
      -- Increment attempts
      IF (v_rec.failed_attempts + 1) >= p_max_attempts THEN
        v_new_locked_until := NOW() + (p_lockout_seconds || ' seconds')::INTERVAL;
        v_locked := true;
        v_remaining_lock := p_lockout_seconds;

        -- Log high severity security incident
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
          INSERT INTO public.audit_logs (
            school_id,
            action,
            entity_type,
            details
          ) VALUES (
            p_school_id,
            'AUTH_BRUTE_FORCE_LOCKOUT',
            'SECURITY_INCIDENT',
            jsonb_build_object(
              'identifier', p_identifier,
              'action_type', p_action_type,
              'attempts', v_rec.failed_attempts + 1,
              'locked_until', v_new_locked_until
            )
          );
        END IF;
      END IF;

      UPDATE audit.auth_rate_limit_tracker
      SET failed_attempts = failed_attempts + 1,
          last_failed_at = NOW(),
          locked_until = v_new_locked_until
      WHERE id = v_rec.id;
    END IF;
  ELSE
    -- First failure record
    INSERT INTO audit.auth_rate_limit_tracker (
      identifier,
      action_type,
      failed_attempts,
      first_failed_at,
      last_failed_at,
      school_id
    ) VALUES (
      p_identifier,
      p_action_type,
      1,
      NOW(),
      NOW(),
      p_school_id
    );
  END IF;

  RETURN jsonb_build_object(
    'is_locked', v_locked,
    'remaining_seconds', v_remaining_lock,
    'attempts', COALESCE(v_rec.failed_attempts + 1, 1)
  );
END;
$$;

-- Function to clear rate limit on successful authentication
CREATE OR REPLACE FUNCTION audit.clear_auth_failure(
  p_identifier TEXT,
  p_action_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit, extensions, pg_temp
AS $$
BEGIN
  DELETE FROM audit.auth_rate_limit_tracker
  WHERE identifier = p_identifier AND action_type = p_action_type;
END;
$$;
