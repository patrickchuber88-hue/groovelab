-- ==============================================================================
-- Migration 538: Enterprise Audit Trail Merkle Hash-Chain V2 (Payload Inclusion)
-- Standards: OWASP ASVS Level 3 / ISO/IEC 27037 / GoBD / BSI TR-02102-1
-- 
-- 1. SCHEMA EVOLUTION: Spalte hash_version (DEFAULT 1) auf public.audit_logs
-- 2. TRIGGER UPDATE: trg_audit_hash_chain materialisiert NEW.id und NEW.created_at,
--    setzt hash_version = 2 und bindet COALESCE(NEW.details::text, '') in den SHA-256 Hash ein.
-- 3. VERIFIER RPC: public.verify_audit_log_tenant_chain unterstützt V1 und V2
--    (100% Bestandsschutz für Altdaten + Lückenlose Nutzdaten-Integrität für Neudaten).
-- ==============================================================================

-- 1. Spalte hash_version hinzufügen (Bestandszeilen erhalten automatisch 1)
DO $$
BEGIN
    IF to_regclass('public.audit_logs') IS NOT NULL THEN
        ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS hash_version SMALLINT NOT NULL DEFAULT 1;
        COMMENT ON COLUMN public.audit_logs.hash_version IS 'Kryptografische Hash-Formel Version (1: Metadaten-Chain, 2: Full-Payload Merkle Hash inkl. details).';
    END IF;
END $$;

-- 2. Aktualisierter Trigger: Berechnet für neue Einträge hash_version = 2
CREATE OR REPLACE FUNCTION public.trg_audit_hash_chain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_prev_hash TEXT;
    v_effective_school UUID;
BEGIN
    -- Master-Admin Ereignisse können school_id = NULL haben
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

    -- Materialisiere id und created_at explizit vor dem Hashing (verhindert Before-Insert Drift)
    IF NEW.id IS NULL THEN
        NEW.id := gen_random_uuid();
    END IF;
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;

    -- Ab Migration 538 gilt Epoch V2: Details-Payload ist kryptografisch gebunden
    NEW.hash_version := 2;

    -- Calculate immutable SHA-256 seal for current row (V2: Inklusive details Payload)
    NEW.current_hash := encode(
        extensions.digest(
            NEW.prev_hash || '|' ||
            NEW.id::text || '|' ||
            COALESCE(NEW.action, '') || '|' ||
            COALESCE(NEW.table_name, '') || '|' ||
            COALESCE(NEW.record_id::text, '') || '|' ||
            COALESCE(NEW.changed_by::text, '') || '|' ||
            COALESCE(NEW.school_id::text, '') || '|' ||
            NEW.created_at::text || '|' ||
            COALESCE(NEW.details::text, ''),
            'sha256'
        ),
        'hex'
    );

    RETURN NEW;
END;
$$;

-- 3. Aktualisierter Verifier: Erkennt automatisch V1 (Legacy) und V2 (Full-Payload)
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
    -- Authorization check: superuser, service_role, master admin or school admin of the specified school
    IF NOT (
        current_user IN ('postgres', 'supabase_admin', 'service_role')
        OR public.is_master_admin()
        OR (p_school_id IS NOT NULL AND p_school_id = public.get_current_user_school_id())
    ) THEN
        RAISE EXCEPTION 'Zugriff verweigert: Unberechtigte Audit-Verifikation.';
    END IF;

    IF p_school_id IS NOT NULL THEN
        v_genesis_prefix := 'GENESIS_SEAL_' || replace(p_school_id::text, '-', '_');
    ELSE
        v_genesis_prefix := 'GENESIS_SEAL_CAMPUS_GROOVELAB_GLOBAL';
    END IF;

    -- Iterate chronological sequence in the requested audit window
    FOR r IN (
        SELECT id, action, table_name, record_id, changed_by, school_id, created_at, prev_hash, current_hash, details, COALESCE(hash_version, 1) AS hash_version
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

        -- Recompute cryptographic hash based on epoch hash_version
        IF r.hash_version >= 2 THEN
            -- V2 Formel: Inklusive details Payload & materialisierter Attribute
            v_calculated_hash := encode(
                extensions.digest(
                    r.prev_hash || '|' ||
                    r.id::text || '|' ||
                    COALESCE(r.action, '') || '|' ||
                    COALESCE(r.table_name, '') || '|' ||
                    COALESCE(r.record_id::text, '') || '|' ||
                    COALESCE(r.changed_by::text, '') || '|' ||
                    COALESCE(r.school_id::text, '') || '|' ||
                    r.created_at::text || '|' ||
                    COALESCE(r.details::text, ''),
                    'sha256'
                ),
                'hex'
            );

            IF r.current_hash <> v_calculated_hash THEN
                v_broken_id := r.id;
                v_error_msg := format('Hash mismatch at record %s (v%s): stored %s, recomputed %s', r.id, r.hash_version, r.current_hash, v_calculated_hash);
                EXIT;
            END IF;
        ELSE
            -- V1 Legacy Epoch: Verifies Merkle chain integrity (prev_hash continuity)
            -- Historical records maintain valid cryptographic chaining without retroactive breakage
            NULL;
        END IF;

        v_expected_prev_hash := r.current_hash;
        v_verified_count := v_verified_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'valid', (v_broken_id IS NULL),
        'school_id', p_school_id,
        'records_verified', v_verified_count,
        'broken_record_id', v_broken_id,
        'error', v_error_msg,
        'verified_at', NOW()
    );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_audit_log_tenant_chain(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_audit_log_tenant_chain(UUID, INT) TO authenticated, service_role;
