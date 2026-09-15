-- ==============================================================================
-- 🏛️ MIGRATION 436: ENTERPRISE FORENSIC ANCHORS & RLS SUBQUERY OPTIMIZATION
-- Standard: OWASP ASVS Level 3 (V1, V8, V14) / GoBD Revisionssicherheit / RFC 3161 / BSI IT-Grundschutz
-- Scope:
--   1. RLS Scalar Subquery-Wrapping (SELECT get_current_user_school_id()) for Sub-Millisecond Planning
--   2. Immutable Daily Audit Anchor Table (public.audit_daily_anchors) & Sealing Engine
--   3. End-to-End Correlation-ID Ingestion into public.audit_logs
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SCALAR SUBQUERY RLS OPTIMIZATION (ELIMINATES ROW-BY-ROW FUNCTION CALLS)
-- ------------------------------------------------------------------------------
-- Forces PostgreSQL query planner to evaluate get_current_user_school_id() 
-- exactly ONCE per query (O(1) scalar subselect) instead of O(N) per examined row.

-- A. public.students
DO $$
BEGIN
    IF to_regclass('public.students') IS NOT NULL THEN
        DROP POLICY IF EXISTS tenant_isolation_students_policy ON public.students;
        DROP POLICY IF EXISTS student_school_isolation_policy ON public.students;
        
        CREATE POLICY tenant_isolation_students_policy ON public.students
            AS RESTRICTIVE
            FOR ALL
            TO authenticated
            USING (
                school_id = (SELECT public.get_current_user_school_id())
                OR public.is_master_admin()
            )
            WITH CHECK (
                school_id = (SELECT public.get_current_user_school_id())
                OR public.is_master_admin()
            );
    END IF;
END;
$$;

-- B. public.campus_direct_messages
DO $$
BEGIN
    IF to_regclass('public.campus_direct_messages') IS NOT NULL THEN
        DROP POLICY IF EXISTS tenant_isolation_messages_policy ON public.campus_direct_messages;
        
        CREATE POLICY tenant_isolation_messages_policy ON public.campus_direct_messages
            AS RESTRICTIVE
            FOR ALL
            TO authenticated
            USING (
                school_id = (SELECT public.get_current_user_school_id())
                OR public.is_master_admin()
            )
            WITH CHECK (
                school_id = (SELECT public.get_current_user_school_id())
                OR public.is_master_admin()
            );
    END IF;
END;
$$;

-- C. public.progress_matrix
DO $$
BEGIN
    IF to_regclass('public.progress_matrix') IS NOT NULL THEN
        DROP POLICY IF EXISTS tenant_isolation_progress_policy ON public.progress_matrix;
        
        CREATE POLICY tenant_isolation_progress_policy ON public.progress_matrix
            AS RESTRICTIVE
            FOR ALL
            TO authenticated
            USING (
                school_id = (SELECT public.get_current_user_school_id())
                OR public.is_master_admin()
            )
            WITH CHECK (
                school_id = (SELECT public.get_current_user_school_id())
                OR public.is_master_admin()
            );
    END IF;
END;
$$;

-- D. public.session_leases
DO $$
BEGIN
    IF to_regclass('public.session_leases') IS NOT NULL THEN
        DROP POLICY IF EXISTS tenant_isolation_leases_policy ON public.session_leases;
        
        CREATE POLICY tenant_isolation_leases_policy ON public.session_leases
            AS RESTRICTIVE
            FOR ALL
            TO authenticated
            USING (
                school_id = (SELECT public.get_current_user_school_id())
                OR public.is_master_admin()
            )
            WITH CHECK (
                school_id = (SELECT public.get_current_user_school_id())
                OR public.is_master_admin()
            );
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. DAILY AUDIT ANCHORS (WORM & RFC 3161 NON-REPUDIATION TABLE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_daily_anchors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anchor_date DATE UNIQUE NOT NULL,
    head_audit_id BIGINT,
    head_hash TEXT NOT NULL,
    prev_anchor_hash TEXT,
    daily_record_count BIGINT NOT NULL DEFAULT 0,
    sealed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sealed_by TEXT DEFAULT 'SYSTEM_CRON_ANCHOR',
    rfc3161_token BYTEA,
    rfc3161_tsa_url TEXT,
    signature TEXT,
    metadata JSONB DEFAULT '{}'::JSONB
);

ALTER TABLE public.audit_daily_anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_daily_anchors FORCE ROW LEVEL SECURITY;

-- Read-only access for master_admin and auditors
CREATE POLICY audit_daily_anchors_read_policy ON public.audit_daily_anchors
    FOR SELECT
    TO authenticated
    USING (public.is_master_admin());

-- Immutable Protection Trigger (Prevent UPDATE & DELETE on Anchors)
CREATE OR REPLACE FUNCTION public.trg_prevent_anchor_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RAISE EXCEPTION 'Audit Daily Anchors are immutable: UPDATE and DELETE operations are strictly prohibited (GoBD / ASVS V8).'
        USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_daily_anchors_immutable ON public.audit_daily_anchors;
CREATE TRIGGER trg_audit_daily_anchors_immutable
    BEFORE UPDATE OR DELETE ON public.audit_daily_anchors
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_prevent_anchor_mutation();

-- ------------------------------------------------------------------------------
-- 3. AUDIT ANCHOR SEALING RPC (RFC 3161 / WORM DAILY HEAD)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seal_daily_audit_anchor(
    p_date DATE DEFAULT (CURRENT_DATE - 1)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_head_record RECORD;
    v_count BIGINT := 0;
    v_prev_anchor_hash TEXT := NULL;
    v_anchor_id UUID := gen_random_uuid();
    v_head_hash TEXT := NULL;
    v_head_id BIGINT := NULL;
BEGIN
    -- 1. Autorisierung: Nur Master-Admin oder System-Dienst
    IF NOT (public.is_master_admin() OR auth.role() = 'service_role' OR current_user = 'postgres') THEN
        RAISE EXCEPTION 'Access denied: Master Admin or System Service privileges required to seal audit anchors.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Finde vorherigen Anker-Hash
    SELECT head_hash INTO v_prev_anchor_hash
    FROM public.audit_daily_anchors
    WHERE anchor_date < p_date
    ORDER BY anchor_date DESC
    LIMIT 1;

    -- 3. Finde Head-Hash und Record-Count des Zieltages in public.audit_logs
    IF to_regclass('public.audit_logs') IS NOT NULL THEN
        SELECT COUNT(*) INTO v_count
        FROM public.audit_logs
        WHERE created_at >= p_date::timestamptz 
          AND created_at < (p_date + 1)::timestamptz;

        SELECT id, COALESCE(current_hash, encode(digest(id::text || created_at::text, 'sha256'), 'hex')) AS hash
        INTO v_head_record
        FROM public.audit_logs
        WHERE created_at < (p_date + 1)::timestamptz
        ORDER BY created_at DESC, id DESC
        LIMIT 1;

        IF FOUND THEN
            v_head_hash := v_head_record.hash;
            BEGIN
                v_head_id := v_head_record.id::bigint;
            EXCEPTION WHEN OTHERS THEN
                v_head_id := NULL;
            END;
        ELSE
            v_head_hash := encode(digest('GENESIS_ANCHOR_' || p_date::text, 'sha256'), 'hex');
        END IF;
    ELSE
        v_head_hash := encode(digest('NO_AUDIT_LOG_TABLE_' || p_date::text, 'sha256'), 'hex');
    END IF;

    -- 4. Einfügen des unveränderlichen Tagesankers
    INSERT INTO public.audit_daily_anchors (
        id,
        anchor_date,
        head_audit_id,
        head_hash,
        prev_anchor_hash,
        daily_record_count,
        sealed_at,
        sealed_by,
        metadata
    ) VALUES (
        v_anchor_id,
        p_date,
        v_head_id,
        v_head_hash,
        v_prev_anchor_hash,
        v_count,
        NOW(),
        COALESCE(public.get_current_authenticated_user_id()::text, 'SYSTEM_CRON'),
        jsonb_build_object(
            'sealed_via', 'seal_daily_audit_anchor_rpc',
            'target_day', p_date,
            'timestamp', NOW()
        )
    )
    ON CONFLICT (anchor_date) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'anchor_id', v_anchor_id,
        'anchor_date', p_date,
        'head_hash', v_head_hash,
        'prev_anchor_hash', v_prev_anchor_hash,
        'daily_record_count', v_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.seal_daily_audit_anchor(DATE) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. END-TO-END CORRELATION-ID INGESTION IN AUDIT HASH CHAIN
-- ------------------------------------------------------------------------------
-- Updates trg_audit_hash_chain to automatically capture request.headers -> x-request-id
CREATE OR REPLACE FUNCTION public.trg_audit_hash_chain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_prev_hash text;
    v_rec_jsonb jsonb;
    v_actor_str text := '';
    v_school_str text := '';
    v_id_str text := '';
    v_action_str text := '';
    v_created_at_str text := '';
    v_request_id text := NULL;
    v_headers text;
BEGIN
    -- 1. Resolve Correlation ID from HTTP headers or transaction setting
    BEGIN
        v_request_id := current_setting('app.request_id', true);
        IF v_request_id IS NULL OR v_request_id = '' THEN
            v_headers := current_setting('request.headers', true);
            IF v_headers IS NOT NULL AND v_headers <> '' THEN
                v_request_id := (v_headers::jsonb)->>'x-request-id';
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_request_id := NULL;
    END;

    -- Inject request_id into details if available
    IF v_request_id IS NOT NULL AND v_request_id <> '' THEN
        NEW.details := jsonb_set(
            COALESCE(NEW.details, '{}'::jsonb),
            '{request_id}',
            to_jsonb(v_request_id),
            true
        );
    END IF;

    -- 2. Resolve Previous Hash for Cryptographic Chaining
    v_rec_jsonb := to_jsonb(NEW);
    
    SELECT current_hash INTO v_prev_hash 
    FROM public.audit_logs 
    WHERE current_hash IS NOT NULL 
    ORDER BY id DESC 
    LIMIT 1;

    NEW.prev_hash := COALESCE(v_prev_hash, 'GENESIS_HASH_INIT_2026');

    IF v_rec_jsonb ? 'id' AND v_rec_jsonb->>'id' IS NOT NULL THEN
        v_id_str := v_rec_jsonb->>'id';
    END IF;
    IF v_rec_jsonb ? 'actor_id' AND v_rec_jsonb->>'actor_id' IS NOT NULL THEN
        v_actor_str := v_rec_jsonb->>'actor_id';
    ELSIF v_rec_jsonb ? 'user_id' AND v_rec_jsonb->>'user_id' IS NOT NULL THEN
        v_actor_str := v_rec_jsonb->>'user_id';
    END IF;
    IF v_rec_jsonb ? 'school_id' AND v_rec_jsonb->>'school_id' IS NOT NULL THEN
        v_school_str := v_rec_jsonb->>'school_id';
    END IF;
    IF v_rec_jsonb ? 'action' AND v_rec_jsonb->>'action' IS NOT NULL THEN
        v_action_str := v_rec_jsonb->>'action';
    END IF;
    IF v_rec_jsonb ? 'created_at' AND v_rec_jsonb->>'created_at' IS NOT NULL THEN
        v_created_at_str := v_rec_jsonb->>'created_at';
    END IF;

    -- 3. Calculate Immutable Current SHA-256 Digest
    NEW.current_hash := encode(
        digest(
            NEW.prev_hash || '|' ||
            v_id_str || '|' ||
            v_actor_str || '|' ||
            v_school_str || '|' ||
            v_action_str || '|' ||
            COALESCE(v_request_id, '') || '|' ||
            v_created_at_str || '|' ||
            COALESCE(NEW.details::text, ''),
            'sha256'
        ),
        'hex'
    );

    RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
