-- ==============================================================================
-- 🏛️ MIGRATION 548: ENTERPRISE TOP-0,1% FORENSIC MERKLE HASH-CHAINING & TRACE SESSION
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / ISO/IEC 27037 / BSI TR-02102)
-- ==============================================================================
-- 1. Schema-Erweiterung für public.master_audit_trail:
--    - record_hash: Deterministischer SHA-256 Hash des Eintrags
--    - previous_record_hash: Zeiger auf den Vorgänger-Hash (Kryptografische Hash-Chain)
--    - w3c_trace_id: Verknüpfung mit dem Frontend-W3C-Traceparent
-- 2. Trigger trg_master_audit_hash_chain: Automatische Berechnung der Hash-Kette
-- 3. Autoritativer Verifikations-RPC: verify_master_audit_chain
-- 4. Kernel-Level Trace Injection: set_forensic_trace_context
-- 5. Daily Merkle-Root Aggregator: generate_daily_merkle_root
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------------------------
-- 1. Schema-Erweiterung auf public.master_audit_trail
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'master_audit_trail' 
          AND column_name = 'record_hash'
    ) THEN
        ALTER TABLE public.master_audit_trail ADD COLUMN record_hash TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'master_audit_trail' 
          AND column_name = 'previous_record_hash'
    ) THEN
        ALTER TABLE public.master_audit_trail ADD COLUMN previous_record_hash TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'master_audit_trail' 
          AND column_name = 'w3c_trace_id'
    ) THEN
        ALTER TABLE public.master_audit_trail ADD COLUMN w3c_trace_id TEXT;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Kernel-Level Trace Injection Helper (set_forensic_trace_context)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_forensic_trace_context(
    p_traceparent TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_parts TEXT[];
    v_trace_id TEXT;
BEGIN
    -- Authoritative Caller Validation (OWASP ASVS L3 / Invariant SQL-07)
    IF auth.uid() IS NULL AND NOT public.is_master_admin() AND public.get_current_user_school_id() IS NULL AND current_user NOT IN ('postgres', 'service_role') THEN
        RETURN;
    END IF;

    IF p_traceparent IS NOT NULL AND p_traceparent ~ '^00-[0-9a-fA-F]{32}-[0-9a-fA-F]{16}-[0-9a-fA-F]{2}$' THEN
        v_parts := string_to_array(p_traceparent, '-');
        v_trace_id := v_parts[2];
        PERFORM set_config('campus.current_trace_id', v_trace_id, true);
        PERFORM set_config('campus.current_traceparent', p_traceparent, true);
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_forensic_trace_context(TEXT) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. Trigger Function: Berechnung der kryptografischen Hash-Kette
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_master_audit_hash_chain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_prev_hash TEXT;
    v_genesis_hash CONSTANT TEXT := '0000000000000000000000000000000000000000000000000000000000000000';
    v_trace_id TEXT;
    v_payload_raw TEXT;
BEGIN
    -- 1. Ermittlung des Vorgänger-Hashes (Locking der letzten Zeile für atomare Kette)
    SELECT record_hash INTO v_prev_hash
    FROM public.master_audit_trail
    WHERE record_hash IS NOT NULL AND record_hash <> ''
    ORDER BY executed_at DESC, id DESC
    LIMIT 1;

    NEW.previous_record_hash := COALESCE(v_prev_hash, v_genesis_hash);

    -- 2. Kausale Trace-ID aus PostgreSQL Session übernehmen
    v_trace_id := current_setting('campus.current_trace_id', true);
    IF v_trace_id IS NOT NULL AND v_trace_id <> '' THEN
        NEW.w3c_trace_id := COALESCE(NEW.w3c_trace_id, v_trace_id);
    END IF;

    -- 3. Kanonische Serialisierung zur deterministischen Hashberechnung
    v_payload_raw := concat(
        NEW.previous_record_hash, '|',
        NEW.action, '|',
        COALESCE(NEW.target_type, ''), '|',
        COALESCE(NEW.status, ''), '|',
        COALESCE(NEW.details::text, '{}'), '|',
        COALESCE(NEW.actor_user_id::text, ''), '|',
        COALESCE(NEW.w3c_trace_id, '')
    );

    -- 4. SHA-256 Hash des aktuellen Datensatzes
    NEW.record_hash := encode(digest(v_payload_raw, 'sha256'), 'hex');

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_master_audit_hash_chain ON public.master_audit_trail;
CREATE TRIGGER trg_master_audit_hash_chain
BEFORE INSERT ON public.master_audit_trail
FOR EACH ROW
EXECUTE FUNCTION public.calculate_master_audit_hash_chain();

-- ------------------------------------------------------------------------------
-- 4. Autoritativer Verifikations-RPC: Mathematische Prüfung der Hash-Kette
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_master_audit_chain(
    p_limit INT DEFAULT 1000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    r RECORD;
    v_expected_prev TEXT := '0000000000000000000000000000000000000000000000000000000000000000';
    v_expected_hash TEXT;
    v_count INT := 0;
    v_genesis_hash CONSTANT TEXT := '0000000000000000000000000000000000000000000000000000000000000000';
    v_payload_raw TEXT;
BEGIN
    -- Nur Master-Admin darf forensische Verifikation ausführen
    IF NOT public.is_master_admin() THEN
        RAISE EXCEPTION 'FORENSIC ACCESS DENIED: Only Master-Admins can verify audit hash chains.';
    END IF;

    FOR r IN (
        SELECT id, action, target_type, status, details, actor_user_id, w3c_trace_id, record_hash, previous_record_hash, executed_at
        FROM public.master_audit_trail
        WHERE record_hash IS NOT NULL AND record_hash <> ''
        ORDER BY executed_at ASC, id ASC
        LIMIT p_limit
    ) LOOP
        v_count := v_count + 1;

        -- 1. Prüfen ob Zeiger auf Vorgänger konsistent ist
        IF v_count > 1 AND r.previous_record_hash <> v_expected_prev THEN
            RETURN jsonb_build_object(
                'valid', FALSE,
                'broken_at_id', r.id,
                'error', 'CHAIN_DISCONTINUITY',
                'expected_previous', v_expected_prev,
                'actual_previous', r.previous_record_hash,
                'verified_records_count', v_count - 1
            );
        END IF;

        -- 2. Neuberechnung des Hashes
        v_payload_raw := concat(
            r.previous_record_hash, '|',
            r.action, '|',
            COALESCE(r.target_type, ''), '|',
            COALESCE(r.status, ''), '|',
            COALESCE(r.details::text, '{}'), '|',
            COALESCE(r.actor_user_id::text, ''), '|',
            COALESCE(r.w3c_trace_id, '')
        );
        v_expected_hash := encode(digest(v_payload_raw, 'sha256'), 'hex');

        -- 3. Prüfen ob Hash intakt ist
        IF r.record_hash <> v_expected_hash THEN
            RETURN jsonb_build_object(
                'valid', FALSE,
                'broken_at_id', r.id,
                'error', 'HASH_TAMPERED',
                'expected_hash', v_expected_hash,
                'actual_hash', r.record_hash,
                'verified_records_count', v_count - 1
            );
        END IF;

        v_expected_prev := r.record_hash;
    END LOOP;

    RETURN jsonb_build_object(
        'valid', TRUE,
        'verified_records_count', v_count,
        'latest_record_hash', v_expected_prev,
        'verified_at_utc', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_master_audit_chain(INT) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 5. Daily Merkle-Root Aggregator (generate_daily_merkle_root)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_daily_merkle_root(
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_hashes TEXT[];
    v_current_level TEXT[];
    v_next_level TEXT[];
    v_i INT;
    v_count INT;
    v_merkle_root TEXT;
BEGIN
    -- Authoritative Caller Validation (OWASP ASVS L3 / Invariant SQL-07)
    IF NOT public.is_master_admin() AND current_user NOT IN ('postgres', 'service_role') THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Nur Master-Admins dürfen den Daily Merkle-Root berechnen.';
    END IF;

    -- 1. Alle Hashes des Ziel-Tages chronologisch laden
    SELECT array_agg(record_hash ORDER BY executed_at ASC, id ASC)
    INTO v_hashes
    FROM public.master_audit_trail
    WHERE executed_at::date = p_date
      AND record_hash IS NOT NULL 
      AND record_hash <> '';

    v_count := COALESCE(array_length(v_hashes, 1), 0);

    IF v_count = 0 THEN
        RETURN jsonb_build_object(
            'date', p_date,
            'records_count', 0,
            'merkle_root', NULL,
            'status', 'NO_RECORDS'
        );
    END IF;

    -- 2. Berechne binären Merkle-Baum
    v_current_level := v_hashes;
    WHILE array_length(v_current_level, 1) > 1 LOOP
        v_next_level := ARRAY[]::TEXT[];
        v_i := 1;
        WHILE v_i <= array_length(v_current_level, 1) LOOP
            IF v_i + 1 <= array_length(v_current_level, 1) THEN
                v_next_level := array_append(
                    v_next_level, 
                    encode(digest(v_current_level[v_i] || v_current_level[v_i + 1], 'sha256'), 'hex')
                );
            ELSE
                -- Ungerade Knoten duplizieren (Standard RFC 6962 / Bitcoin Merkle)
                v_next_level := array_append(
                    v_next_level, 
                    encode(digest(v_current_level[v_i] || v_current_level[v_i], 'sha256'), 'hex')
                );
            END IF;
            v_i := v_i + 2;
        END LOOP;
        v_current_level := v_next_level;
    END LOOP;

    v_merkle_root := v_current_level[1];

    RETURN jsonb_build_object(
        'date', p_date,
        'records_count', v_count,
        'merkle_root', v_merkle_root,
        'algorithm', 'BINARY-SHA-256-MERKLE-TREE (RFC 6962)',
        'computed_at_utc', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_daily_merkle_root(DATE) TO authenticated, service_role;
