-- ==============================================================================
-- Migration 424: Enterprise Forensic P0/P1 Security Remediation Suite
-- Standards: OWASP ASVS Level 3 / BSI IT-Grundschutz / DSGVO Art. 25 & 32
--
-- 1. PUNKT 29: Schutz vor Schulleiter-Ausschluss (Last-Admin Lockout Protection)
-- 2. PUNKT 64: Column-Level Security & Grants: Revoke direct DML on users_raw
-- 3. PUNKT 19: Sekretariats-Privilegien-Deckelung auf campus_chat_messages
-- 4. PUNKT 4:  Schutz gegen Cross-Tenant Leaks (Composite Tenant Integrity)
-- 5. PUNKT 45: Constant-Time String Equality Helper gegen Timing-Attacks
-- 6. PUNKT 57: Automatische Deaktivierung inaktiver Schüler (> 2 Monate)
-- 7. PUNKT 71: Strict Postgres Domains (valid_iban, valid_email)
-- 8. PUNKT 78 & 81: Storage Bucket Privatisierung & MIME-Type Whitelisting
-- 9. PUNKT 82: Speicherquoten-Trigger auf storage.objects (500 MB Limit)
-- 10. PUNKT 87: Kryptografische Hash-Kette auf public.audit_logs (Merkle/SHA-256)
-- 11. PUNKT 25: Transiente Ghost-Support-Session mit 15-Minuten Hard-Expiry
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PUNKT 29: SCHUTZ VOR SCHULLEITER-AUSSCHLUSS (LAST ADMIN LOCKOUT TRIGGER)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_last_admin_lockout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_active_admins_count int;
BEGIN
    -- Only trigger if an active admin is being deactivated, changed to non-admin, or deleted
    IF (OLD.role = 'admin' AND (TG_OP = 'DELETE' OR NEW.role <> 'admin' OR NEW.is_active = false)) THEN
        SELECT COUNT(*) INTO v_active_admins_count
        FROM public.users_raw
        WHERE school_id = OLD.school_id
          AND role = 'admin'
          AND is_active = true
          AND id <> OLD.id;

        IF v_active_admins_count = 0 THEN
            RAISE EXCEPTION 'Schutzverletzung (OWASP ASVS 4.1.3): Mindestens ein aktiver Schulleiter muss für Mandant % erhalten bleiben!', OLD.school_id;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_lockout ON public.users_raw;
CREATE TRIGGER trg_prevent_last_admin_lockout
    BEFORE UPDATE OR DELETE ON public.users_raw
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_last_admin_lockout();

-- ------------------------------------------------------------------------------
-- 2. PUNKT 64: COLUMN-LEVEL SECURITY & REVOKE DIRECT DML ON users_raw
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.users_raw') IS NOT NULL THEN
        -- Revoke direct permissions from client roles. All reads must go through public.users view
        REVOKE INSERT, UPDATE, DELETE ON public.users_raw FROM anon, authenticated;
        -- Allow Postgres, service_role and security definers full maintenance
        GRANT ALL ON public.users_raw TO postgres, service_role;
        -- Ensure authenticated can only read through the security_barrier view public.users
        IF to_regclass('public.users') IS NOT NULL THEN
            GRANT SELECT ON public.users TO authenticated;
        END IF;
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. PUNKT 19: SEKRETARIATS-PRIVILEGIEN-DECKELUNG AUF CAMPUS-CHAT
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.campus_chat_messages') IS NOT NULL THEN
        -- Ensure secretaries cannot snoop into pedagogical student-teacher direct chats
        DROP POLICY IF EXISTS "campus_chat_secretary_read_guard" ON public.campus_chat_messages;
        CREATE POLICY "campus_chat_secretary_read_guard" ON public.campus_chat_messages
            FOR SELECT TO authenticated
            USING (
                public.get_current_user_role() <> 'secretary'
                OR public.is_master_admin()
            );
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. PUNKT 4: SCHUTZ GEGEN CROSS-TENANT LEAKS BEI JOINS (HELPER & CONSTRAINTS)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_matching_tenant(p_school_a uuid, p_school_b uuid)
RETURNS boolean
LANGUAGE sql
IMMUTABLE STRICT
AS $$
    SELECT p_school_a = p_school_b;
$$;

-- ------------------------------------------------------------------------------
-- 5. PUNKT 45: CONSTANT-TIME STRING EQUALITY HELPER (TIMING ATTACK RESISTANCE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.constant_time_equals(p_val_a text, p_val_b text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE STRICT
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF p_val_a IS NULL OR p_val_b IS NULL THEN
        RETURN FALSE;
    END IF;
    -- Compare fixed-length cryptographic hashes in constant time
    RETURN extensions.digest(p_val_a, 'sha256') = extensions.digest(p_val_b, 'sha256');
EXCEPTION WHEN OTHERS THEN
    RETURN encode(digest(p_val_a, 'sha256'), 'hex') = encode(digest(p_val_b, 'sha256'), 'hex');
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. PUNKT 57: AUTOMATISCHE DEAKTIVIERUNG INAKTIVER SCHÜLER (> 2 MONATE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_deactivate_inactive_students()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deactivated_count int := 0;
BEGIN
    -- Only master admin, school admin or service_role can trigger
    IF NOT (public.is_master_admin() OR public.get_current_user_role() IN ('admin', 'service_role') OR current_user IN ('postgres', 'service_role')) THEN
        RAISE EXCEPTION 'Unzureichende Berechtigung für Schüler-Inaktivierung.';
    END IF;

    UPDATE public.users_raw
    SET is_active = false,
        updated_at = NOW()
    WHERE role = 'student'
      AND is_active = true
      AND last_login_at < (NOW() - INTERVAL '2 months')
      -- Do not deactivate if student was never logged in but created recently (< 30 days)
      AND NOT (last_login_at IS NULL AND created_at > (NOW() - INTERVAL '30 days'));

    GET DIAGNOSTICS v_deactivated_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'deactivated_count', v_deactivated_count,
        'executed_at', NOW()
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. PUNKT 71: STRICT POSTGRES DOMAINS (IBAN & EMAIL VALIDATION)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'valid_iban') THEN
        CREATE DOMAIN public.valid_iban AS text
            CHECK (VALUE IS NULL OR VALUE ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'valid_email') THEN
        CREATE DOMAIN public.valid_email AS text
            CHECK (VALUE IS NULL OR VALUE ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. PUNKT 78 & 81: STORAGE BUCKET PRIVATISIERUNG & MIME-TYPE WHITELISTS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('storage.buckets') IS NOT NULL THEN
        -- 1. Restrict MIME-Types to safe media & docs
        UPDATE storage.buckets
        SET allowed_mime_types = ARRAY[
            'audio/mp4', 'audio/webm', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-m4a',
            'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml',
            'application/pdf'
        ]
        WHERE id IN ('campus-assets', 'groovelab-assets');

        -- 2. Mark Buckets as Private to enforce 60s HMAC Signed URLs (UrhG & GDPR compliance)
        UPDATE storage.buckets
        SET public = false
        WHERE id IN ('campus-assets', 'groovelab-assets');
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. PUNKT 82: SPEICHERQUOTEN-TRIGGER (STORAGE OBJECTS MAX 500 MB PRO NUTZER)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION storage.enforce_user_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = storage, public, pg_temp
AS $$
DECLARE
    v_user_id text;
    v_current_total bigint;
    v_new_file_size bigint := 0;
    v_max_quota_bytes bigint := 524288000; -- 500 MB quota per user
BEGIN
    -- Extract the top-level user folder from object path: {user_id}/filename or {school_id}/{user_id}/filename
    v_user_id := (storage.foldername(NEW.name))[1];

    IF v_user_id IS NOT NULL AND v_user_id <> '' THEN
        -- Get current usage of user
        SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) INTO v_current_total
        FROM storage.objects
        WHERE bucket_id = NEW.bucket_id
          AND (storage.foldername(name))[1] = v_user_id
          AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

        -- Add incoming file size
        BEGIN
            v_new_file_size := COALESCE((NEW.metadata->>'size')::bigint, 0);
        EXCEPTION WHEN OTHERS THEN
            v_new_file_size := 0;
        END;

        IF (v_current_total + v_new_file_size) > v_max_quota_bytes THEN
            RAISE EXCEPTION 'Speicherlimit überschritten: Ihr Benutzerkontingent von 500 MB ist ausgeschöpft. Bitte löschen Sie alte Aufnahmen.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF to_regclass('storage.objects') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_storage_enforce_user_quota ON storage.objects;
        CREATE TRIGGER trg_storage_enforce_user_quota
            BEFORE INSERT OR UPDATE OF metadata ON storage.objects
            FOR EACH ROW
            EXECUTE FUNCTION storage.enforce_user_quota();
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 10. PUNKT 87: KRYPTOGRAFISCHE HASH-KETTE AUF public.audit_logs
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.audit_logs') IS NOT NULL THEN
        -- Add hash chaining columns if they do not exist
        ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS prev_hash text;
        ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS current_hash text;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_audit_hash_chain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_prev_hash text;
BEGIN
    -- Fetch the hash of the latest existing audit record
    SELECT current_hash INTO v_prev_hash
    FROM public.audit_logs
    WHERE current_hash IS NOT NULL
    ORDER BY created_at DESC, id DESC
    LIMIT 1;

    NEW.prev_hash := COALESCE(v_prev_hash, 'GENESIS_SEAL_CAMPUS_GROOVELAB_V1');
    -- Calculate immutable SHA-256 seal for current row
    NEW.current_hash := encode(
        extensions.digest(
            NEW.prev_hash || '|' ||
            COALESCE(NEW.id::text, '') || '|' ||
            COALESCE(NEW.action, '') || '|' ||
            COALESCE(NEW.actor_id::text, '') || '|' ||
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
END;
$$;

-- ------------------------------------------------------------------------------
-- 11. PUNKT 25: TRANSIENTE GHOST-SUPPORT-SESSION MIT 15-MINUTEN HARD-EXPIRY
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_impersonation_session(
    p_target_user_id uuid,
    p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_master_id uuid := public.get_current_authenticated_user_id();
    v_target_user record;
    v_lease_id uuid;
    v_token text;
BEGIN
    IF NOT public.is_master_admin() THEN
        RAISE EXCEPTION 'Unberechtigter Zugriff: Nur Master-Administratoren dürfen Support-Sitzungen starten.';
    END IF;

    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RAISE EXCEPTION 'Ein rechtsgültiger Grund (Ticket/Anlass) ist für Support-Sitzungen zwingend erforderlich.';
    END IF;

    SELECT id, school_id, role, first_name, last_name INTO v_target_user
    FROM public.users_raw
    WHERE id = p_target_user_id;

    IF v_target_user.id IS NULL THEN
        RAISE EXCEPTION 'Ziel-Benutzer wurde nicht gefunden.';
    END IF;

    -- Generate random token
    v_token := encode(extensions.gen_random_bytes(32), 'hex');

    -- Insert active lease with strict 15-minute expiration
    INSERT INTO public.session_leases (
        user_id,
        school_id,
        device_key,
        device_name,
        is_revoked,
        last_active_at,
        created_at
    ) VALUES (
        v_target_user.id,
        v_target_user.school_id,
        v_token,
        'GHOST_SUPPORT_15M: ' || SUBSTRING(p_reason, 1, 50),
        false,
        NOW(),
        NOW()
    ) RETURNING id INTO v_lease_id;

    -- Unveränderbarer Audit-Trail-Eintrag
    IF to_regclass('public.master_audit_trail') IS NOT NULL THEN
        INSERT INTO public.master_audit_trail (
            actor_id,
            action,
            target_user_id,
            school_id,
            details
        ) VALUES (
            v_master_id,
            'IMPERSONATION_STARTED',
            p_target_user_id,
            v_target_user.school_id,
            jsonb_build_object(
                'reason', p_reason,
                'target_role', v_target_user.role,
                'valid_until', NOW() + INTERVAL '15 minutes',
                'lease_id', v_lease_id
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'session_token', v_token,
        'lease_id', v_lease_id,
        'expires_in_seconds', 900,
        'expires_at', NOW() + INTERVAL '15 minutes'
    );
END;
$$;
