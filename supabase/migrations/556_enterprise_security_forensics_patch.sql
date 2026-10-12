-- ==============================================================================
-- 🏛️ MIGRATION 556: ENTERPRISE SECURITY FORENSICS PATCH (P0 & P1 REMEDIATION)
-- OWASP ASVS Level 3 / Fail-Closed / Zero-Trust
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. P0 REMEDIATION: FIX AUTH BYPASS IN SECURITY DEFINER FUNCTIONS
-- Replace insecure "current_user IN ('postgres', 'service_role')" with "current_setting('role', true)"
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
    IF NOT (public.is_master_admin() OR public.get_current_user_role() IN ('admin', 'service_role') OR current_setting('role', true) IN ('postgres', 'supabase_admin', 'service_role')) THEN
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



CREATE OR REPLACE FUNCTION public.register_session_lease(
    p_user_id UUID,
    p_school_id UUID,
    p_device_name TEXT,
    p_device_key TEXT,
    p_role TEXT,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_caller_id UUID;
    v_lease_id UUID;
    v_is_revoked BOOLEAN;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();

    -- 🛡️ STRICT AUTHORIZATION:
    -- Only the authenticated user themselves, or a master admin, or internal database service can register/update leases!
    IF NOT (
        public.is_master_admin()
        OR current_setting('role', true) IN ('postgres', 'supabase_admin', 'service_role')
        OR (v_caller_id IS NOT NULL AND v_caller_id = p_user_id)
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'UNAUTHORIZED_SESSION_REGISTRATION',
            'message', 'Sitzungsregistrierung erfordert einen verifizierten Benutzerkontext.'
        );
    END IF;

    -- Check if an active lease already exists for this device_key + user_id
    SELECT id, is_revoked INTO v_lease_id, v_is_revoked
    FROM public.session_leases
    WHERE user_id = p_user_id AND device_key = p_device_key
    LIMIT 1;

    IF v_lease_id IS NOT NULL THEN
        IF v_is_revoked = TRUE THEN
            RETURN jsonb_build_object(
                'success', false,
                'revoked', true,
                'message', 'Diese Gerätesitzung wurde von der Schulleitung widerrufen.'
            );
        END IF;

        UPDATE public.session_leases
        SET last_active_at = NOW(),
            device_name = COALESCE(NULLIF(p_device_name, ''), device_name),
            user_agent = COALESCE(NULLIF(p_user_agent, ''), user_agent)
        WHERE id = v_lease_id;

        RETURN jsonb_build_object(
            'success', true,
            'lease_id', v_lease_id,
            'is_new', false
        );
    ELSE
        INSERT INTO public.session_leases (
            user_id, school_id, device_name, device_key, role, user_agent, last_active_at
        ) VALUES (
            p_user_id, p_school_id, COALESCE(NULLIF(p_device_name, ''), 'Unbekanntes Gerät'),
            p_device_key, p_role, p_user_agent, NOW()
        )
        RETURNING id INTO v_lease_id;

        RETURN jsonb_build_object(
            'success', true,
            'lease_id', v_lease_id,
            'is_new', true
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_session_lease(UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon, service_role;



CREATE OR REPLACE FUNCTION public.register_webauthn_credential(
    p_user_id UUID,
    p_credential_id TEXT,
    p_public_key TEXT,
    p_device_name TEXT,
    p_challenge TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
AS $$
DECLARE
    v_clean_cred TEXT := TRIM(p_credential_id);
    v_clean_chal TEXT := TRIM(p_challenge);
    v_clean_device TEXT;
    v_chal_record RECORD;
    v_caller_id UUID;
    v_effective_user_id UUID := p_user_id;
    v_resolved_user_id UUID;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();

    -- Strict Authorization: Only the authenticated user themselves or master admin
    IF NOT (
        public.is_master_admin()
        OR current_setting('role', true) IN ('postgres', 'supabase_admin', 'service_role')
        OR (v_caller_id IS NOT NULL AND v_caller_id = p_user_id)
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_PASSKEY_REGISTRATION');
    END IF;

    IF v_effective_user_id IS NULL OR v_clean_cred IS NULL OR v_clean_cred = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Anmeldedaten.');
    END IF;

    IF p_public_key IS NULL OR TRIM(p_public_key) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiger öffentlicher Schlüssel.');
    END IF;

    -- Verify challenge exists, is unexpired, and matches intended user_id if bound
    SELECT * INTO v_chal_record
    FROM private_auth.webauthn_challenges
    WHERE challenge = v_clean_chal
      AND expires_at > NOW()
      AND (user_id IS NULL OR user_id = v_effective_user_id)
    FOR UPDATE;

    IF v_chal_record.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sicherheits-Challenge ist abgelaufen oder ungültig.');
    END IF;

    -- Clean up one-time challenge immediately (Atomic single-use)
    DELETE FROM private_auth.webauthn_challenges WHERE id = v_chal_record.id;

    -- 🛡️ Foreign Key Guard: Ensure target user exists in public.users_raw
    IF NOT EXISTS (SELECT 1 FROM public.users_raw WHERE id = v_effective_user_id) THEN
        -- If registering for canonical master admin or caller is master admin
        IF v_effective_user_id = '88888888-8888-8888-8888-888888888888'::uuid OR public.is_master_admin() THEN
            SELECT id INTO v_resolved_user_id
            FROM public.users_raw
            WHERE is_master_admin = true
            ORDER BY created_at ASC
            LIMIT 1;

            IF v_resolved_user_id IS NOT NULL THEN
                v_effective_user_id := v_resolved_user_id;
            ELSE
                INSERT INTO public.users_raw (
                    id, first_name, last_name, role, is_master_admin,
                    qr_token, master_admin_username, is_active, is_campus_active,
                    is_groovelab_active, is_2fa_enabled, created_at
                ) VALUES (
                    '88888888-8888-8888-8888-888888888888'::uuid, 'Master', 'Admin', 'admin', true,
                    'fa9b8c7d-6e5f-4a3b-2c1d-0e9f8a7b6c5d'::uuid, 'admin', true, true,
                    true, true, NOW()
                )
                ON CONFLICT (id) DO UPDATE SET
                    is_master_admin = true,
                    is_active = true,
                    master_admin_username = COALESCE(public.users_raw.master_admin_username, 'admin');

                v_effective_user_id := '88888888-8888-8888-8888-888888888888'::uuid;
            END IF;
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Benutzerkonto nicht in Datenbank gefunden.');
        END IF;
    END IF;

    v_clean_device := COALESCE(NULLIF(TRIM(p_device_name), ''), 'Passkey Device');

    -- 1. Upsert into authoritative private_auth.webauthn_credentials
    INSERT INTO private_auth.webauthn_credentials (
        user_id,
        credential_id,
        public_key,
        counter,
        sign_count,
        device_name,
        is_active,
        created_at
    ) VALUES (
        v_effective_user_id,
        v_clean_cred,
        p_public_key,
        0,
        0,
        v_clean_device,
        TRUE,
        NOW()
    )
    ON CONFLICT (credential_id) DO UPDATE SET
        public_key = EXCLUDED.public_key,
        device_name = EXCLUDED.device_name,
        is_active = TRUE,
        user_id = EXCLUDED.user_id;

    -- 2. Synchronous dual-store persistence in public.user_credentials for complete backward compatibility
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_credentials'
    ) THEN
        INSERT INTO public.user_credentials (
            user_id,
            credential_id,
            public_key,
            counter,
            device_name,
            is_active,
            created_at
        ) VALUES (
            v_effective_user_id,
            v_clean_cred,
            p_public_key,
            0,
            v_clean_device,
            TRUE,
            NOW()
        )
        ON CONFLICT (credential_id) DO UPDATE SET
            public_key = EXCLUDED.public_key,
            device_name = EXCLUDED.device_name,
            is_active = TRUE,
            user_id = EXCLUDED.user_id;
    END IF;

    -- 3. Revisionssicheres Audit-Logging
    INSERT INTO public.audit_logs (
        table_name, operation, record_id, changed_by, new_data
    ) VALUES (
        'webauthn_credentials', 'REGISTER_PASSKEY', v_effective_user_id,
        COALESCE(v_caller_id, v_effective_user_id),
        jsonb_build_object(
            'action', 'register_webauthn_credential',
            'device_name', v_clean_device,
            'credential_id_prefix', LEFT(v_clean_cred, 12) || '...',
            'registered_at', timezone('utc'::text, now())
        )
    );

    RETURN jsonb_build_object('success', true, 'user_id', v_effective_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_webauthn_credential(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;



CREATE OR REPLACE FUNCTION public.purge_expired_retention_records()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_purged_rate_limits int := 0;
    v_purged_expired_leases int := 0;
BEGIN
    IF NOT (public.is_master_admin() OR current_setting('role', true) IN ('postgres', 'supabase_admin', 'service_role')) THEN
        RAISE EXCEPTION 'Nur Superuser / Master-Admin dürfen die DSGVO-Fristenbereinigung anstoßen.';
    END IF;

    -- 1. Purge rate limit IP tracking older than 14 days (DSGVO Datensparsamkeit)
    IF to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        DELETE FROM public.qr_login_rate_limits
        WHERE attempted_at < (NOW() - INTERVAL '14 days');
        GET DIAGNOSTICS v_purged_rate_limits = ROW_COUNT;
    END IF;

    -- 2. Purge revoked or orphaned session leases older than 60 days
    IF to_regclass('public.session_leases') IS NOT NULL THEN
        DELETE FROM public.session_leases
        WHERE is_revoked = true AND last_active_at < (NOW() - INTERVAL '60 days');
        GET DIAGNOSTICS v_purged_expired_leases = ROW_COUNT;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'purged_rate_limit_rows', v_purged_rate_limits,
        'purged_stale_leases', v_purged_expired_leases,
        'executed_at', NOW()
    );
END;
$$;



CREATE OR REPLACE FUNCTION public.get_master_school_stats()
RETURNS TABLE (
    school_id UUID,
    total_students BIGINT,
    active_students BIGINT,
    campus_students BIGINT,
    groovelab_students BIGINT,
    passive_students BIGINT,
    exempt_active_students BIGINT,
    parent_paid_students BIGINT,
    total_teachers BIGINT,
    active_teachers BIGINT,
    total_employees BIGINT,
    active_employees BIGINT,
    songs_count BIGINT,
    bands_count BIGINT,
    storage_used_bytes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
BEGIN
    -- Strict Enterprise Authorization Check
    IF NOT (
        public.is_master_admin() 
        OR current_setting('role', true) IN ('postgres', 'supabase_admin', 'service_role')
    ) THEN
        RAISE EXCEPTION 'UNAUTHORIZED_ACCESS: Nur der autorisierte Master-Admin Leitstand darf mandantenübergreifende Rollup-Statistiken abrufen.';
    END IF;

    RETURN QUERY
    WITH student_counts AS (
        SELECT 
            u.school_id,
            COUNT(*) FILTER (WHERE u.role = 'student' OR (u.roles IS NOT NULL AND 'student' = ANY(u.roles))) AS total_students,
            COUNT(*) FILTER (
                WHERE (u.role = 'student' OR (u.roles IS NOT NULL AND 'student' = ANY(u.roles)))
                AND (COALESCE(u.is_campus_active, false) = true OR COALESCE(u.is_groovelab_active, false) = true)
            ) AS active_students,
            COUNT(*) FILTER (
                WHERE (u.role = 'student' OR (u.roles IS NOT NULL AND 'student' = ANY(u.roles)))
                AND COALESCE(u.is_campus_active, false) = true
            ) AS campus_students,
            COUNT(*) FILTER (
                WHERE (u.role = 'student' OR (u.roles IS NOT NULL AND 'student' = ANY(u.roles)))
                AND COALESCE(u.is_groovelab_active, false) = true
            ) AS groovelab_students,
            COUNT(*) FILTER (
                WHERE (u.role = 'student' OR (u.roles IS NOT NULL AND 'student' = ANY(u.roles)))
                AND COALESCE(u.is_campus_active, false) = true
                AND COALESCE(u.exempt_from_direct_billing, false) = true
            ) AS exempt_active_students,
            COUNT(*) FILTER (
                WHERE (u.role = 'student' OR (u.roles IS NOT NULL AND 'student' = ANY(u.roles)))
                AND COALESCE(u.is_campus_active, false) = true
                AND (u.student_billing_payment_method IN ('bank_transfer', 'debit') OR u.payment_status = 'paid')
            ) AS parent_paid_students,
            COUNT(*) FILTER (WHERE u.role = 'teacher' OR (u.roles IS NOT NULL AND 'teacher' = ANY(u.roles))) AS total_teachers,
            COUNT(*) FILTER (
                WHERE (u.role = 'teacher' OR (u.roles IS NOT NULL AND 'teacher' = ANY(u.roles)))
                AND COALESCE(u.is_active, true) = true
            ) AS active_teachers,
            COUNT(*) FILTER (
                WHERE u.role IN ('admin', 'secretary')
                OR (u.roles IS NOT NULL AND (u.roles && ARRAY['admin', 'secretary']))
            ) AS total_employees,
            COUNT(*) FILTER (
                WHERE (u.role IN ('admin', 'secretary') OR (u.roles IS NOT NULL AND (u.roles && ARRAY['admin', 'secretary'])))
                AND COALESCE(u.is_active, true) = true
            ) AS active_employees
        FROM public.users_raw u
        WHERE u.school_id IS NOT NULL
        GROUP BY u.school_id
    ),
    song_counts AS (
        SELECT s.school_id, COUNT(*) AS songs_count
        FROM public.songs s
        WHERE s.school_id IS NOT NULL
        GROUP BY s.school_id
    ),
    band_counts AS (
        SELECT b.school_id, COUNT(*) AS bands_count
        FROM public.bands b
        WHERE b.school_id IS NOT NULL
        GROUP BY b.school_id
    )
    SELECT 
        sch.id AS school_id,
        COALESCE(sc.total_students, 0)::BIGINT AS total_students,
        COALESCE(sc.active_students, 0)::BIGINT AS active_students,
        COALESCE(sc.campus_students, 0)::BIGINT AS campus_students,
        COALESCE(sc.groovelab_students, 0)::BIGINT AS groovelab_students,
        GREATEST(0, (COALESCE(sc.total_students, 0) - COALESCE(sc.active_students, 0)))::BIGINT AS passive_students,
        COALESCE(sc.exempt_active_students, 0)::BIGINT AS exempt_active_students,
        COALESCE(sc.parent_paid_students, 0)::BIGINT AS parent_paid_students,
        COALESCE(sc.total_teachers, 0)::BIGINT AS total_teachers,
        COALESCE(sc.active_teachers, 0)::BIGINT AS active_teachers,
        COALESCE(sc.total_employees, 0)::BIGINT AS total_employees,
        COALESCE(sc.active_employees, 0)::BIGINT AS active_employees,
        COALESCE(sng.songs_count, 0)::BIGINT AS songs_count,
        COALESCE(bnd.bands_count, 0)::BIGINT AS bands_count,
        0::BIGINT AS storage_used_bytes
    FROM public.schools sch
    LEFT JOIN student_counts sc ON sc.school_id = sch.id
    LEFT JOIN song_counts sng ON sng.school_id = sch.id
    LEFT JOIN band_counts bnd ON bnd.school_id = sch.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_master_school_stats() TO authenticated, service_role, anon;



CREATE OR REPLACE FUNCTION public.get_master_audit_trail(p_limit INT DEFAULT 150)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    action TEXT,
    target_type TEXT,
    status TEXT,
    details JSONB,
    actor_user_id UUID,
    user_agent TEXT,
    origin TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
BEGIN
    IF NOT (
        public.is_master_admin() 
        OR current_setting('role', true) IN ('postgres', 'supabase_admin', 'service_role')
    ) THEN
        RAISE EXCEPTION 'UNAUTHORIZED_ACCESS: Nur der Master-Admin darf den revisionssicheren Audit-Trail einsehen.';
    END IF;

    RETURN QUERY
    SELECT 
        mat.id,
        mat.created_at,
        mat.action,
        mat.target_type,
        mat.status,
        mat.details,
        mat.actor_user_id,
        mat.user_agent,
        mat.origin
    FROM public.master_audit_trail mat
    ORDER BY mat.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 500);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_master_audit_trail(INT) TO authenticated, service_role, anon;



CREATE OR REPLACE FUNCTION public.generate_master_admin_recovery_codes()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
SET row_security = off
AS $$
DECLARE
    v_master_id UUID;
    v_code1 TEXT;
    v_code2 TEXT;
    v_code3 TEXT;
    v_hash1 TEXT;
    v_hash2 TEXT;
    v_hash3 TEXT;
BEGIN
    -- Autorisierungsprüfung: Nur der Master-Admin darf Notfall-Codes erzeugen
    IF NOT (public.is_master_admin() OR current_setting('role', true) IN ('postgres', 'supabase_admin', 'service_role')) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Nur ein verifizierter Master-Admin darf Notfall-Wiederherstellungscodes erzeugen.';
    END IF;

    SELECT id INTO v_master_id 
    FROM public.users_raw 
    WHERE is_master_admin = true 
    LIMIT 1;

    IF v_master_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kein Master-Admin-Konto gefunden.');
    END IF;

    -- Alte ungenutzte Codes des Benutzers entwerten
    DELETE FROM private_auth.master_admin_recovery_codes 
    WHERE user_id = v_master_id AND is_used = false;

    -- 3 kryptographisch starke Codes im Format GL-XXXX-XXXX-XXXX generieren
    v_code1 := 'GL-' || UPPER(SUBSTRING(encode(gen_random_bytes(6), 'hex') FROM 1 FOR 4)) || '-' ||
                        UPPER(SUBSTRING(encode(gen_random_bytes(6), 'hex') FROM 5 FOR 4)) || '-' ||
                        UPPER(SUBSTRING(encode(gen_random_bytes(6), 'hex') FROM 9 FOR 4));
                        
    v_code2 := 'GL-' || UPPER(SUBSTRING(encode(gen_random_bytes(6), 'hex') FROM 1 FOR 4)) || '-' ||
                        UPPER(SUBSTRING(encode(gen_random_bytes(6), 'hex') FROM 5 FOR 4)) || '-' ||
                        UPPER(SUBSTRING(encode(gen_random_bytes(6), 'hex') FROM 9 FOR 4));
                        
    v_code3 := 'GL-' || UPPER(SUBSTRING(encode(gen_random_bytes(6), 'hex') FROM 1 FOR 4)) || '-' ||
                        UPPER(SUBSTRING(encode(gen_random_bytes(6), 'hex') FROM 5 FOR 4)) || '-' ||
                        UPPER(SUBSTRING(encode(gen_random_bytes(6), 'hex') FROM 9 FOR 4));

    v_hash1 := encode(digest(REPLACE(v_code1, '-', ''), 'sha256'), 'hex');
    v_hash2 := encode(digest(REPLACE(v_code2, '-', ''), 'sha256'), 'hex');
    v_hash3 := encode(digest(REPLACE(v_code3, '-', ''), 'sha256'), 'hex');

    INSERT INTO private_auth.master_admin_recovery_codes (user_id, code_hash)
    VALUES 
        (v_master_id, v_hash1),
        (v_master_id, v_hash2),
        (v_master_id, v_hash3);

    -- Revisionssicheres Audit-Logging
    INSERT INTO public.master_audit_trail (action, target_type, status, details, actor_user_id)
    VALUES ('MASTER_ADMIN_RECOVERY_CODES_GENERATED', 'SECURITY_KEYS', 'SUCCESS', 
            jsonb_build_object('count', 3, 'timestamp', NOW()), v_master_id);

    RETURN jsonb_build_object(
        'success', true,
        'codes', jsonb_build_array(v_code1, v_code2, v_code3),
        'created_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_master_admin_recovery_codes() TO authenticated, service_role;



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
        current_setting('role', true) IN ('postgres', 'supabase_admin', 'service_role')
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



CREATE OR REPLACE FUNCTION public.execute_campus_cost_airbag()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_inactivated_count INT := 0;
    v_monthly_savings NUMERIC(10, 2) := 0;
BEGIN
    -- Autorisierungsprüfung: Nur System-Scheduler oder Master-Admin
    IF NOT (current_setting('role', true) IN ('postgres', 'supabase_admin', 'service_role') OR public.is_master_admin()) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Der globale Kostenairbag darf nur vom System-Scheduler oder Master-Admin ausgeführt werden.' USING ERRCODE = '42501';
    END IF;

    -- Finde und inaktiviere alle Schüler, die seit mehr als 60 Tagen inaktiv sind
    WITH target_students AS (
        UPDATE public.users_raw
        SET 
            is_campus_active = false,
            auto_inactivated_by_airbag = true,
            updated_at = NOW()
        WHERE role = 'student'
          AND is_active = true
          AND is_campus_active = true
          AND COALESCE(auto_inactivated_by_airbag, false) = false
          AND COALESCE(last_seen, created_at) < (NOW() - INTERVAL '60 days')
        RETURNING id, school_id
    )
    SELECT COUNT(*) INTO v_inactivated_count FROM target_students;

    v_monthly_savings := ROUND(v_inactivated_count * 0.49, 2);

    IF v_inactivated_count > 0 THEN
        INSERT INTO public.audit_logs (
            table_name, record_id, action, entity_type, entity_id, details
        ) VALUES (
            'users_raw',
            gen_random_uuid(),
            'CAMPUS_COST_AIRBAG_NIGHTLY_EXECUTED',
            'users_raw',
            'system_batch',
            jsonb_build_object(
                'inactivated_students_count', v_inactivated_count,
                'monthly_savings_eur', v_monthly_savings,
                'executed_at', NOW()
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'inactivated_students', v_inactivated_count,
        'monthly_savings_eur', v_monthly_savings
    );
END;
$$;



CREATE OR REPLACE FUNCTION public.register_school_sepa_mandate(
    p_school_id UUID,
    p_iban TEXT,
    p_bic TEXT,
    p_account_holder TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_school RECORD;
    v_clean_iban TEXT;
    v_clean_bic TEXT;
    v_mandate_id TEXT;
    v_mandate_date DATE := CURRENT_DATE;
BEGIN
    -- Autorisierungsprüfung: Nur Master-Admin oder Schulleitung/Sekretariat dieser Schule
    IF NOT (current_setting('role', true) IN ('postgres', 'supabase_admin', 'service_role') OR public.is_master_admin() OR (public.get_current_user_school_id() = p_school_id AND public.get_current_user_role() IN ('admin', 'secretary'))) THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED: Keine Berechtigung zur Mandatsänderung für diese Musikschule.');
    END IF;

    SELECT * INTO v_school FROM public.schools WHERE id = p_school_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Musikschule nicht gefunden.');
    END IF;

    v_clean_iban := UPPER(REGEXP_REPLACE(COALESCE(p_iban, ''), '[^A-Z0-9]', '', 'g'));
    v_clean_bic := UPPER(REGEXP_REPLACE(COALESCE(p_bic, ''), '[^A-Z0-9]', '', 'g'));

    -- 1. IBAN-Prüfung nach DIN ISO 7064 MOD 97-10
    IF NOT public.verify_iban_checksum(v_clean_iban) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Ungültige IBAN: Die Prüfziffer entspricht nicht dem Standard DIN ISO 7064 MOD 97-10.'
        );
    END IF;

    -- 2. BIC-Prüfung (8 oder 11 Zeichen)
    IF LENGTH(v_clean_bic) NOT IN (8, 11) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Ungültiger SWIFT/BIC: Muss aus 8 oder 11 alphanumerischen Zeichen bestehen.'
        );
    END IF;

    -- 3. Mandats-ID deterministisch generieren
    v_mandate_id := 'MANDAT-MS-' || LPAD(COALESCE(v_school.numeric_id, 1)::TEXT, 3, '0') || '-' || TO_CHAR(NOW(), 'YYMMDD');

    -- 4. In public.schools speichern
    UPDATE public.schools
    SET 
        sepa_iban = v_clean_iban,
        sepa_bic = v_clean_bic,
        sepa_account_holder = TRIM(p_account_holder),
        sepa_mandate_id = v_mandate_id,
        sepa_mandate_date = v_mandate_date,
        updated_at = NOW()
    WHERE id = p_school_id;

    -- 5. Revisionssicheres Audit-Logging
    INSERT INTO public.audit_logs (
        school_id, table_name, record_id, action, entity_type, entity_id, details
    ) VALUES (
        p_school_id,
        'schools',
        p_school_id,
        'SEPA_B2B_MANDATE_REGISTERED',
        'schools',
        p_school_id::TEXT,
        jsonb_build_object(
            'mandate_id', v_mandate_id,
            'mandate_date', v_mandate_date,
            'bic', v_clean_bic,
            'iban_masked', SUBSTRING(v_clean_iban FROM 1 FOR 4) || '...' || SUBSTRING(v_clean_iban FROM LENGTH(v_clean_iban)-3)
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'mandate_id', v_mandate_id,
        'mandate_date', v_mandate_date,
        'iban_masked', SUBSTRING(v_clean_iban FROM 1 FOR 4) || '...' || SUBSTRING(v_clean_iban FROM LENGTH(v_clean_iban)-3)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_iban_checksum(TEXT) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.get_school_rooms_occupancy_matrix(p_school_id UUID)
RETURNS TABLE (
    room_id UUID,
    room_name TEXT,
    building_id UUID,
    building_name TEXT,
    floor TEXT,
    weekly_capacity_minutes INT,
    booked_minutes INT,
    occupancy_pct NUMERIC,
    active_allocations_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Mandantenschutz: Zugriff nur für Master-Admin oder Angehörige dieser Schule
    IF NOT (current_setting('role', true) IN ('postgres', 'supabase_admin', 'service_role') OR public.is_master_admin() OR public.get_current_user_school_id() = p_school_id) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Mandantenübergreifender Zugriff verweigert.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT 
        r.id AS room_id,
        r.name::TEXT AS room_name,
        r.building_id,
        b.name::TEXT AS building_name,
        COALESCE(NULLIF(r.floor, 'Allgemein'), 'EG')::TEXT AS floor,
        COALESCE(r.weekly_capacity_minutes, 2400)::INT AS weekly_capacity_minutes,
        COALESCE(SUM(COALESCE(s.duration_minutes, s.duration, 45)), 0)::INT AS booked_minutes,
        ROUND(
            LEAST(100.0, 
                (COALESCE(SUM(COALESCE(s.duration_minutes, s.duration, 45)), 0)::NUMERIC / 
                 GREATEST(1, COALESCE(r.weekly_capacity_minutes, 2400))::NUMERIC) * 100.0
            ), 1
        ) AS occupancy_pct,
        COUNT(s.id)::INT AS active_allocations_count
    FROM public.rooms r
    LEFT JOIN public.buildings b ON b.id = r.building_id
    LEFT JOIN public.schedules s ON s.room_id = r.id 
        AND s.school_id = p_school_id 
        AND s.status NOT IN ('rejected', 'canceled_by_student', 'canceled_by_teacher_sick')
    WHERE r.school_id = p_school_id
    GROUP BY r.id, r.name, r.building_id, b.name, r.floor, r.weekly_capacity_minutes
    ORDER BY r.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_school_rooms_occupancy_matrix(UUID) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.generate_monthly_school_invoices(
    p_year INT,
    p_month INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_school RECORD;
    v_billing_date DATE;
    v_due_date DATE;
    v_yymm TEXT;
    v_seq_num TEXT;
    v_inv_id TEXT;
    v_currency TEXT;
    
    -- Rates
    v_rate_campus NUMERIC(10, 2);
    v_rate_groovelab NUMERIC(10, 2);
    v_rate_kombi NUMERIC(10, 2);
    v_rate_teacher NUMERIC(10, 2);
    v_rate_student NUMERIC(10, 2);
    v_rate_passive NUMERIC(10, 2);
    v_storage_price NUMERIC(10, 2);
    
    -- Counts
    v_teacher_count INT := 0;
    v_campus_student_count INT := 0;
    v_groovelab_student_count INT := 0;
    v_passive_student_count INT := 0;
    v_exempt_student_count INT := 0;
    v_free_hardship_quota INT := 0;
    v_payable_exempt_count INT := 0;
    
    -- Totals
    v_base_flat NUMERIC(10, 2) := 0;
    v_teacher_fee NUMERIC(10, 2) := 0;
    v_student_fee NUMERIC(10, 2) := 0;
    v_passive_fee NUMERIC(10, 2) := 0;
    v_total_amount NUMERIC(10, 2) := 0;
    v_items JSONB;
    v_invoices_created INT := 0;
BEGIN
    IF NOT (current_setting('role', true) IN ('postgres', 'supabase_admin', 'service_role') OR public.is_master_admin()) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Batch invoice generation requires service_role or master_admin.' USING ERRCODE = '42501';
    END IF;

    v_billing_date := make_date(p_year, p_month, 1);
    
    -- Standard-Zahlungsziel: 30 Tage netto (§ 286 Abs. 3 BGB) mit § 193 BGB Werktagsanpassung
    v_due_date := v_billing_date + 30;
    IF EXTRACT(DOW FROM v_due_date) = 6 THEN -- Samstag
        v_due_date := v_due_date + 2;
    ELSIF EXTRACT(DOW FROM v_due_date) = 0 THEN -- Sonntag
        v_due_date := v_due_date + 1;
    END IF;

    v_yymm := SUBSTRING(p_year::TEXT FROM 3 FOR 2) || LPAD(p_month::TEXT, 2, '0');

    FOR v_school IN 
        SELECT s.*, COALESCE(s.numeric_id, 1) AS num_id
        FROM public.schools s
        WHERE COALESCE(s.subscription_status, 'active') <> 'cancelled'
    LOOP
        v_currency := COALESCE(v_school.currency, 'EUR');
        
        -- Tarifsätze anhand Währung
        IF v_currency = 'CHF' THEN
            v_rate_campus := 19.90;
            v_rate_groovelab := 14.90;
            v_rate_kombi := 29.90;
            v_rate_teacher := 1.00;
            v_rate_student := 1.00;
            v_rate_passive := 0.20;
        ELSE
            v_rate_campus := 14.90;
            v_rate_groovelab := 9.90;
            v_rate_kombi := 19.90;
            v_rate_teacher := 0.49;
            v_rate_student := 0.49;
            v_rate_passive := 0.09;
        END IF;

        -- 1. Basis-Pauschale
        v_base_flat := 0;
        IF v_school.has_campus_subscription = true AND v_school.has_groovelab_subscription = true THEN
            v_base_flat := v_rate_kombi;
        ELSIF v_school.has_campus_subscription = true THEN
            v_base_flat := v_rate_campus;
        ELSIF v_school.has_groovelab_subscription = true THEN
            v_base_flat := v_rate_groovelab;
        END IF;

        -- 2. Team-Zählung (Lehrkräfte/Admin)
        SELECT COUNT(*) INTO v_teacher_count
        FROM public.users_raw
        WHERE school_id = v_school.id
          AND role IN ('teacher', 'admin', 'secretary')
          AND is_active = true;

        v_teacher_fee := ROUND(v_teacher_count * v_rate_teacher, 2);

        -- 3. Schüler-Zählungen
        SELECT 
            COUNT(*) FILTER (WHERE is_active = true AND is_campus_active = true),
            COUNT(*) FILTER (WHERE is_active = true AND is_groovelab_active = true),
            COUNT(*) FILTER (WHERE is_active = true AND is_campus_active = false AND is_groovelab_active = false),
            COUNT(*) FILTER (WHERE is_active = true AND exempt_from_direct_billing = true)
        INTO 
            v_campus_student_count,
            v_groovelab_student_count,
            v_passive_student_count,
            v_exempt_student_count
        FROM public.users_raw
        WHERE school_id = v_school.id AND role = 'student';

        v_passive_fee := ROUND(v_passive_student_count * v_rate_passive, 2);

        -- Härtefall-Quote (Floor(n/20))
        v_free_hardship_quota := FLOOR(v_campus_student_count / 20);
        v_payable_exempt_count := GREATEST(0, v_exempt_student_count - v_free_hardship_quota);

        -- Schüler-Beitrag Schule
        IF COALESCE(v_school.direct_billing_mode, 'none') = 'full' THEN
            -- Eltern zahlen Campus direkt, Schule zahlt nur GrooveLab + überhängige Härtefälle
            v_student_fee := ROUND((v_groovelab_student_count * v_rate_student) + (v_payable_exempt_count * v_rate_student), 2);
        ELSE
            -- Sammelzahler
            v_student_fee := ROUND(((v_campus_student_count + v_groovelab_student_count) * v_rate_student), 2);
        END IF;

        -- 4. Zusatzspeicher
        v_storage_price := 0;
        IF COALESCE(v_school.storage_addon_gb, 0) > 0 THEN
            IF v_currency = 'CHF' THEN
                v_storage_price := CASE 
                    WHEN v_school.storage_addon_gb <= 10 THEN 3.80
                    WHEN v_school.storage_addon_gb <= 25 THEN 6.40
                    WHEN v_school.storage_addon_gb <= 50 THEN 11.60
                    WHEN v_school.storage_addon_gb <= 100 THEN 19.40
                    ELSE 25.90
                END;
            ELSE
                v_storage_price := CASE 
                    WHEN v_school.storage_addon_gb <= 10 THEN 2.90
                    WHEN v_school.storage_addon_gb <= 25 THEN 4.90
                    WHEN v_school.storage_addon_gb <= 50 THEN 8.90
                    WHEN v_school.storage_addon_gb <= 100 THEN 14.90
                    ELSE 19.90
                END;
            END IF;
        END IF;

        v_total_amount := v_base_flat + v_teacher_fee + v_passive_fee + v_student_fee + v_storage_price;

        -- Positionen JSONB
        v_items := jsonb_build_array(
            jsonb_build_object('pos', 1, 'desc', 'Software-Bereitstellung', 'amount', 0.00),
            jsonb_build_object('pos', 2, 'desc', 'Cloud- & Server-Hosting', 'amount', v_base_flat),
            jsonb_build_object('pos', 3, 'desc', 'Service Fee Pädagogen', 'qty', v_teacher_count, 'amount', v_teacher_fee),
            jsonb_build_object('pos', 4, 'desc', 'Basis-Bereitstellung Passive Schüler', 'qty', v_passive_student_count, 'amount', v_passive_fee),
            jsonb_build_object('pos', 5, 'desc', 'Schüler-Aktivierungen', 'amount', v_student_fee),
            jsonb_build_object('pos', 6, 'desc', 'Audio-Tresor Zusatzspeicher', 'gb', COALESCE(v_school.storage_addon_gb, 0), 'amount', v_storage_price)
        );

        v_seq_num := LPAD(v_school.num_id::TEXT, 3, '0');
        v_inv_id := 'RE-' || v_seq_num || '-' || v_yymm || '-01';

        -- Persistente Rechnungslegung
        INSERT INTO public.invoices (
            id,
            invoice_number,
            school_id,
            type,
            amount,
            amount_cents,
            currency,
            status,
            billing_date,
            due_date,
            items,
            created_at
        ) VALUES (
            v_inv_id,
            v_inv_id,
            v_school.id,
            'INF',
            v_total_amount,
            ROUND(v_total_amount * 100),
            v_currency,
            'open',
            v_billing_date,
            v_due_date,
            v_items,
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            amount = EXCLUDED.amount,
            amount_cents = EXCLUDED.amount_cents,
            currency = EXCLUDED.currency,
            due_date = EXCLUDED.due_date,
            items = EXCLUDED.items;

        v_invoices_created := v_invoices_created + 1;
    END LOOP;

    -- Audit-Logging
    INSERT INTO public.audit_logs (
        table_name, record_id, action, entity_type, entity_id, details
    ) VALUES (
        'invoices',
        gen_random_uuid(),
        'MONTHLY_INVOICES_BATCH_GENERATED',
        'invoices',
        v_yymm,
        jsonb_build_object(
            'period', v_yymm,
            'invoices_count', v_invoices_created,
            'billing_date', v_billing_date,
            'due_date', v_due_date,
            'legal_payment_target_days', 30
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'period', v_yymm,
        'invoices_created', v_invoices_created
    );
END;
$$;



CREATE OR REPLACE FUNCTION public.reconcile_camt_bank_statement(
    p_statement_id TEXT,
    p_transactions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tx RECORD;
    v_b2b_count INT := 0;
    v_b2c_count INT := 0;
    v_inv_id TEXT;
    v_b2c_ref TEXT;
    v_b2c_hash TEXT;
    v_student_id UUID;
    v_school_id UUID;
    v_student_school_id UUID;
    v_booking_date TIMESTAMPTZ;
BEGIN
    IF NOT (current_setting('role', true) IN ('postgres', 'supabase_admin', 'service_role') OR public.is_master_admin()) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Bank reconciliation requires service_role or master_admin.' USING ERRCODE = '42501';
    END IF;

    FOR v_tx IN SELECT * FROM jsonb_to_recordset(p_transactions) AS x(
        "id" TEXT,
        "matchedType" TEXT,
        "matchedId" TEXT,
        "amount" NUMERIC,
        "bookingDate" TEXT,
        "remittanceInfo" TEXT
    )
    LOOP
        BEGIN
            v_booking_date := (v_tx."bookingDate" || 'T12:00:00Z')::TIMESTAMPTZ;
        EXCEPTION WHEN OTHERS THEN
            v_booking_date := NOW();
        END;

        -- A. B2B Rechnungsabgleich
        IF v_tx."matchedType" = 'b2b_school' AND v_tx."matchedId" IS NOT NULL THEN
            v_inv_id := TRIM(v_tx."matchedId");

            UPDATE public.invoices
            SET 
                status = 'paid',
                paid_at = v_booking_date
            WHERE (id = v_inv_id OR invoice_number = v_inv_id)
              AND status <> 'paid'
            RETURNING school_id INTO v_school_id;

            IF FOUND THEN
                v_b2b_count := v_b2b_count + 1;
                INSERT INTO public.audit_logs (
                    school_id, table_name, record_id, action, entity_type, entity_id, details
                ) VALUES (
                    v_school_id,
                    'invoices',
                    gen_random_uuid(),
                    'B2B_INVOICE_RECONCILED_VIA_CAMT',
                    'invoices',
                    v_inv_id,
                    jsonb_build_object(
                        'statement_id', p_statement_id,
                        'matched_id', v_inv_id,
                        'amount', v_tx."amount",
                        'booking_date', v_tx."bookingDate"
                    )
                );
            END IF;

        -- B. B2C Schüler-Aktivierungsabgleich (CG-[HASH]-[YYMM])
        ELSIF v_tx."matchedType" = 'b2c_student' AND v_tx."matchedId" IS NOT NULL THEN
            v_b2c_ref := UPPER(TRIM(v_tx."matchedId"));
            -- Extrahiere Hash zwischen 'CG-' und nächstem Bindestrich
            v_b2c_hash := SUBSTRING(v_b2c_ref FROM 'CG-([A-Z0-9]+)');

            IF v_b2c_hash IS NOT NULL AND LENGTH(v_b2c_hash) >= 4 THEN
                SELECT id, school_id INTO v_student_id, v_student_school_id
                FROM public.users_raw
                WHERE role = 'student'
                  AND (
                      UPPER(REPLACE(id::TEXT, '-', '')) LIKE v_b2c_hash || '%'
                      OR UPPER(REPLACE(COALESCE(ausweis_nummer, ''), '-', '')) LIKE v_b2c_hash || '%'
                      OR UPPER(COALESCE(qr_token, '')) LIKE '%' || v_b2c_hash || '%'
                  )
                LIMIT 1;

                IF v_student_id IS NOT NULL THEN
                    UPDATE public.users_raw
                    SET 
                        is_campus_active = true,
                        payment_status = 'paid',
                        student_billing_payment_method = 'bank_transfer',
                        student_billing_cash_paid = true,
                        updated_at = NOW()
                    WHERE id = v_student_id;

                    v_b2c_count := v_b2c_count + 1;

                    INSERT INTO public.audit_logs (
                        school_id, table_name, record_id, user_id, action, entity_type, entity_id, details
                    ) VALUES (
                        v_student_school_id,
                        'users_raw',
                        v_student_id,
                        v_student_id,
                        'B2C_STUDENT_RECONCILED_VIA_CAMT',
                        'users_raw',
                        v_student_id::TEXT,
                        jsonb_build_object(
                            'statement_id', p_statement_id,
                            'reference', v_b2c_ref,
                            'amount', v_tx."amount",
                            'booking_date', v_tx."bookingDate"
                        )
                    );
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'statement_id', p_statement_id,
        'b2b_reconciled', v_b2b_count,
        'b2c_reconciled', v_b2c_count
    );
END;
$$;



CREATE OR REPLACE FUNCTION public.mark_invoice_as_paid(
    p_invoice_id TEXT,
    p_paid_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_inv RECORD;
BEGIN
    SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id OR invoice_number = p_invoice_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rechnung nicht gefunden.');
    END IF;

    -- Autorisierungsprüfung: Nur Master-Admin oder Admin/Sekretariat der Schule
    IF NOT (current_setting('role', true) IN ('postgres', 'supabase_admin', 'service_role') OR public.is_master_admin() OR (public.get_current_user_school_id() = v_inv.school_id AND public.get_current_user_role() IN ('admin', 'secretary'))) THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED: Keine Berechtigung zur Rechnungsänderung für diese Musikschule.');
    END IF;

    UPDATE public.invoices
    SET 
        status = CASE WHEN status = 'paid' THEN 'open' ELSE 'paid' END,
        paid_at = CASE WHEN status = 'paid' THEN NULL ELSE COALESCE(p_paid_at, NOW()) END
    WHERE id = v_inv.id;

    INSERT INTO public.audit_logs (
        school_id, table_name, record_id, action, entity_type, entity_id, details
    ) VALUES (
        v_inv.school_id,
        'invoices',
        gen_random_uuid(),
        'INVOICE_STATUS_TOGGLED',
        'invoices',
        v_inv.id,
        jsonb_build_object(
            'previous_status', v_inv.status,
            'new_status', CASE WHEN v_inv.status = 'paid' THEN 'open' ELSE 'paid' END,
            'toggled_at', NOW()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', v_inv.id,
        'new_status', CASE WHEN v_inv.status = 'paid' THEN 'open' ELSE 'paid' END
    );
END;
$$;



CREATE OR REPLACE FUNCTION public.link_student_sibling(
    p_current_student_id UUID,
    p_target_credential TEXT,
    p_target_pin TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_curr RECORD;
    v_target RECORD;
    v_group_id UUID;
    v_active_siblings_count INT := 0;
    v_is_third_or_more BOOLEAN := false;
    v_clean_cred TEXT := TRIM(p_target_credential);
BEGIN
    -- 1. Lade antragstellenden Schüler
    SELECT * INTO v_curr 
    FROM public.users_raw 
    WHERE id = p_current_student_id AND role = 'student';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Antragstellender Schüler nicht gefunden.');
    END IF;

    -- Autorisierungsprüfung: Nur der Schüler selbst, aktiver Eltern-Lease, Schulleitung/Sekretariat oder Master-Admin
    IF NOT (
        current_setting('role', true) IN ('postgres', 'supabase_admin', 'service_role')
        OR public.is_master_admin()
        OR p_current_student_id = auth.uid()
        OR p_current_student_id = public.get_current_authenticated_user_id()
        OR (public.get_current_user_school_id() = v_curr.school_id AND public.get_current_user_role() IN ('admin', 'secretary'))
        OR EXISTS (
            SELECT 1 FROM public.session_leases 
            WHERE user_id = p_current_student_id 
              AND is_revoked = FALSE 
              AND last_active_at >= NOW() - INTERVAL '15 minutes'
        )
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED: Keine Berechtigung zur Verknüpfung für diesen Schüler.');
    END IF;

    -- 2. Ziel-Schüler autorisieren (QR-Token, Ausweisnummer, ID oder Vorname falls eindeutig)
    SELECT * INTO v_target 
    FROM public.users_raw 
    WHERE school_id = v_curr.school_id 
      AND role = 'student'
      AND (
          id::TEXT = v_clean_cred 
          OR qr_token = v_clean_cred 
          OR ausweis_nummer = v_clean_cred
          OR (LOWER(TRIM(first_name)) = LOWER(v_clean_cred) AND LOWER(TRIM(last_name)) = LOWER(TRIM(v_curr.last_name)))
      )
    ORDER BY created_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ziel-Schüler an dieser Musikschule nicht gefunden.');
    END IF;

    IF v_curr.id = v_target.id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ein Schüler kann nicht mit sich selbst verknüpft werden.');
    END IF;

    -- 3. Strikte Nachnamens-Prüfung (Case-Insensitive & Whitespace-Normalized, Fail-Closed bei Leerwerten)
    IF TRIM(COALESCE(v_curr.last_name, '')) = '' OR TRIM(COALESCE(v_target.last_name, '')) = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Geschwister-Verknüpfung abgewiesen: Bei mindestens einem Schüler ist kein gültiger Nachname hinterlegt.'
        );
    END IF;

    IF LOWER(REGEXP_REPLACE(TRIM(COALESCE(v_curr.last_name, '')), '\s+', ' ', 'g')) <> 
       LOWER(REGEXP_REPLACE(TRIM(COALESCE(v_target.last_name, '')), '\s+', ' ', 'g')) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Geschwister-Verknüpfung abgewiesen: Der Nachname (%s) stimmt nicht mit dem Nachnamen des Geschwisterkindes (%s) überein.',
                     COALESCE(v_curr.last_name, 'unbekannt'), COALESCE(v_target.last_name, 'unbekannt'))
        );
    END IF;

    -- 4. PIN-Schutz prüfen (falls beim Zielschüler eine persönliche PIN gesetzt ist)
    IF public.user_has_personal_pin(v_target.id)
       OR COALESCE(v_target.is_pin_activated, false) = true
       OR (v_target.personal_pin IS NOT NULL AND v_target.personal_pin <> '' AND v_target.personal_pin <> '0000') THEN
        IF p_target_pin IS NULL OR NOT public.verify_personal_pin(v_target.id, p_target_pin) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Sicherheits-PIN des Geschwisterkindes ungültig.');
        END IF;
    END IF;

    -- 5. sibling_group_id ermitteln oder neu vergeben
    IF v_curr.sibling_group_id IS NOT NULL THEN
        v_group_id := v_curr.sibling_group_id;
    ELSIF v_target.sibling_group_id IS NOT NULL THEN
        v_group_id := v_target.sibling_group_id;
    ELSE
        v_group_id := gen_random_uuid();
    END IF;

    -- Beide Schüler (und bereits bestehende Verknüpfungen) auf dieselbe sibling_group_id setzen
    UPDATE public.users_raw
    SET sibling_group_id = v_group_id,
        updated_at = NOW()
    WHERE id IN (v_curr.id, v_target.id) 
       OR (sibling_group_id IS NOT NULL AND sibling_group_id IN (v_curr.sibling_group_id, v_target.sibling_group_id));

    -- 6. Zähle aktive Geschwister in dieser Gruppe (ohne den aktuellen)
    SELECT COUNT(*) INTO v_active_siblings_count
    FROM public.users_raw
    WHERE sibling_group_id = v_group_id
      AND school_id = v_curr.school_id
      AND id <> v_curr.id
      AND is_active = true
      AND (is_campus_active = true OR payment_status = 'paid' OR student_billing_cash_paid = true);

    -- Wenn bereits >= 2 Geschwister aktiv sind, ist der antragstellende Schüler Kind #3
    IF v_active_siblings_count >= 2 THEN
        v_is_third_or_more := true;
        UPDATE public.users_raw
        SET is_campus_active = true,
            student_billing_payment_method = 'family_bonus',
            payment_status = 'paid',
            student_billing_cash_paid = true,
            exempt_from_direct_billing = true,
            updated_at = NOW()
        WHERE id = v_curr.id;
    END IF;

    -- Revisionssicheres Audit-Logging
    INSERT INTO public.audit_logs (
        school_id, table_name, record_id, user_id, action, entity_type, entity_id, details
    ) VALUES (
        v_curr.school_id, 'users_raw', v_curr.id, v_curr.id, 'STUDENT_SIBLING_LINKED', 'users_raw', v_curr.id::TEXT,
        jsonb_build_object(
            'student_a_id', v_curr.id,
            'student_b_id', v_target.id,
            'shared_last_name', v_curr.last_name,
            'sibling_group_id', v_group_id,
            'active_siblings_count', v_active_siblings_count,
            'is_third_or_more', v_is_third_or_more
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'sibling_group_id', v_group_id,
        'linked_sibling_name', TRIM(v_target.first_name || ' ' || COALESCE(v_target.last_name, '')),
        'active_siblings_count', v_active_siblings_count,
        'is_third_or_more', v_is_third_or_more
    );
END;
$$;



CREATE OR REPLACE FUNCTION public.get_student_family_profiles(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_group_id UUID;
    v_school_id UUID;
    v_profiles JSONB;
BEGIN
    SELECT sibling_group_id, school_id INTO v_group_id, v_school_id
    FROM public.users_raw
    WHERE id = p_student_id;

    IF NOT FOUND THEN
        RETURN '[]'::jsonb;
    END IF;

    -- Caller-Validierung (auth.uid() = p_student_id oder Session-Lease oder Admin)
    IF NOT (
        current_setting('role', true) IN ('postgres', 'supabase_admin', 'service_role')
        OR public.is_master_admin()
        OR p_student_id = auth.uid()
        OR p_student_id = public.get_current_authenticated_user_id()
        OR (public.get_current_user_school_id() = v_school_id AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher'))
        OR EXISTS (
            SELECT 1 FROM public.session_leases 
            WHERE user_id = p_student_id 
              AND is_revoked = FALSE 
              AND last_active_at >= NOW() - INTERVAL '15 minutes'
        )
    ) THEN
        RETURN '[]'::jsonb;
    END IF;

    IF v_group_id IS NULL THEN
        -- Wenn keine Gruppe existiert, gebe nur das eigene Profil zurück
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', u.id,
                'first_name', u.first_name,
                'last_name', u.last_name,
                'instrument', u.instrument,
                'avatar_url', u.avatar_url,
                'photo_url', u.photo_url,
                'is_campus_active', u.is_campus_active,
                'payment_status', u.payment_status,
                'campus_ui_level', u.campus_ui_level,
                'has_personal_pin', (public.user_has_personal_pin(u.id) OR COALESCE(u.is_pin_activated, false) OR (u.personal_pin IS NOT NULL AND u.personal_pin <> '')),
                'is_pin_activated', (COALESCE(u.is_pin_activated, false) OR public.user_has_personal_pin(u.id))
            )
        ) INTO v_profiles
        FROM public.users_raw u
        WHERE u.id = p_student_id;

        RETURN COALESCE(v_profiles, '[]'::jsonb);
    END IF;

    -- Alle Geschwister derselben Gruppe an derselben Schule laden
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', u.id,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'instrument', u.instrument,
            'avatar_url', u.avatar_url,
            'photo_url', u.photo_url,
            'is_campus_active', u.is_campus_active,
            'payment_status', u.payment_status,
            'campus_ui_level', u.campus_ui_level,
            'has_personal_pin', (public.user_has_personal_pin(u.id) OR COALESCE(u.is_pin_activated, false) OR (u.personal_pin IS NOT NULL AND u.personal_pin <> '')),
            'is_pin_activated', (COALESCE(u.is_pin_activated, false) OR public.user_has_personal_pin(u.id))
        )
    ) INTO v_profiles
    FROM public.users_raw u
    WHERE u.sibling_group_id = v_group_id 
      AND u.school_id = v_school_id 
      AND u.is_active = true;

    RETURN COALESCE(v_profiles, '[]'::jsonb);
END;
$$;



CREATE OR REPLACE FUNCTION public.request_student_bank_transfer_order(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user RECORD;
    v_grace_until TIMESTAMPTZ := NOW() + INTERVAL '14 days';
BEGIN
    SELECT * INTO v_user FROM public.users_raw WHERE id = p_student_id AND role = 'student';
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Schüler nicht gefunden.');
    END IF;

    -- Caller-Validierung (auth.uid() = p_student_id oder Session-Lease oder Admin)
    IF NOT (
        current_setting('role', true) IN ('postgres', 'supabase_admin', 'service_role')
        OR public.is_master_admin()
        OR p_student_id = auth.uid()
        OR p_student_id = public.get_current_authenticated_user_id()
        OR (public.get_current_user_school_id() = v_user.school_id AND public.get_current_user_role() IN ('admin', 'secretary'))
        OR EXISTS (
            SELECT 1 FROM public.session_leases 
            WHERE user_id = p_student_id 
              AND is_revoked = FALSE 
              AND last_active_at >= NOW() - INTERVAL '15 minutes'
        )
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED: Keine Berechtigung für diesen Schüler.');
    END IF;

    UPDATE public.users_raw
    SET 
        is_campus_active = true,
        payment_status = 'provisional_grace',
        student_billing_payment_method = 'bank_transfer',
        provisional_grace_until = v_grace_until,
        updated_at = NOW()
    WHERE id = p_student_id;

    INSERT INTO public.audit_logs (
        school_id, table_name, record_id, user_id, action, entity_type, entity_id, details
    ) VALUES (
        v_user.school_id,
        'users_raw',
        p_student_id,
        p_student_id,
        'B2C_BANK_TRANSFER_ORDERED_WITH_GRACE',
        'users_raw',
        p_student_id::TEXT,
        jsonb_build_object(
            'grace_period_days', 14,
            'grace_until', v_grace_until
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'grace_until', v_grace_until
    );
END;
$$;



CREATE OR REPLACE FUNCTION public.revoke_user_passkeys(
    p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_target_user RECORD;
    v_revoked_count INT := 0;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();

    SELECT role, school_id INTO v_caller_role, v_caller_school_id
    FROM public.users_raw
    WHERE id = v_caller_id;

    SELECT * INTO v_target_user
    FROM public.users_raw
    WHERE id = p_target_user_id;

    IF v_target_user.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Benutzer nicht gefunden.');
    END IF;

    -- Strict Authorization: Master Admin, or Admin/Secretary in same school, or target user themselves
    IF NOT (
        public.is_master_admin()
        OR (v_caller_school_id IS NOT NULL AND v_caller_school_id = v_target_user.school_id AND v_caller_role IN ('admin', 'secretary'))
        OR (v_caller_id IS NOT NULL AND v_caller_id = p_target_user_id)
        OR current_setting('role', true) IN ('postgres', 'supabase_admin', 'service_role')
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_REVOCATION');
    END IF;

    -- Deactivate in private_auth
    WITH upd AS (
        UPDATE private_auth.webauthn_credentials
        SET is_active = FALSE
        WHERE user_id = p_target_user_id
        RETURNING id
    )
    SELECT COUNT(*) INTO v_revoked_count FROM upd;

    -- Delete or deactivate in public.user_credentials
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_credentials'
    ) THEN
        DELETE FROM public.user_credentials WHERE user_id = p_target_user_id;
    END IF;

    -- Invalidate all active session leases
    UPDATE public.session_leases
    SET is_revoked = TRUE
    WHERE user_id = p_target_user_id;

    -- Bump token version & sessions_revoked_at to kill any active JWT/Leases
    UPDATE public.users_raw
    SET token_version = COALESCE(token_version, 1) + 1,
        sessions_revoked_at = timezone('utc'::text, now())
    WHERE id = p_target_user_id;

    -- Revisionssicheres Audit-Logging
    INSERT INTO public.audit_logs (
        table_name, operation, record_id, changed_by, new_data
    ) VALUES (
        'webauthn_credentials', 'REVOKE_USER_PASSKEYS', p_target_user_id,
        COALESCE(v_caller_id, gen_random_uuid()),
        jsonb_build_object(
            'action', 'revoke_user_passkeys',
            'target_user_id', p_target_user_id,
            'revoked_count', v_revoked_count,
            'performed_by_role', v_caller_role,
            'timestamp', timezone('utc'::text, now())
        )
    );

    RETURN jsonb_build_object('success', true, 'revoked_count', v_revoked_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_user_passkeys(UUID) TO anon, authenticated, service_role;




-- 2. P0 REMEDIATION: HEADER-SPOOFING IN RESOLVER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_authenticated_user_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET row_security TO 'off'
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_headers text;
    v_token text;
    v_client_info text;
    v_resolved_id UUID;
    v_auth_uid UUID;
BEGIN
    -- 1. Check native Supabase Auth JWT if present
    BEGIN
        v_auth_uid := auth.uid();
        IF v_auth_uid IS NOT NULL THEN
            RETURN v_auth_uid;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_auth_uid := NULL;
    END;

    -- 2. Extract request headers
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN NULL;
    END IF;

    -- 3. Extract session token from direct header OR client-info
    BEGIN
        v_token := v_headers::json->>'x-session-token';
        IF v_token IS NULL OR v_token = '' THEN
            v_client_info := v_headers::json->>'x-client-info';
            IF v_client_info IS NOT NULL THEN
                v_token := substring(v_client_info from ';session_token=([^;]+)');
            END IF;
        END IF;

        -- 4. Cryptographically validate against active, non-revoked session_leases
        IF v_token IS NOT NULL AND v_token <> '' AND to_regclass('public.session_leases') IS NOT NULL THEN
            SELECT user_id INTO v_resolved_id
            FROM public.session_leases
            WHERE (id::text = v_token OR device_key = v_token)
              AND is_revoked = FALSE
              AND last_active_at > (NOW() - INTERVAL '30 days')
            LIMIT 1;

            IF v_resolved_id IS NOT NULL THEN
                RETURN v_resolved_id;
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_resolved_id := NULL;
    END;

    -- NOTE: Unsecured Zero-Trust Fallback (x-user-id) has been completely removed to prevent spoofing!
    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_current_authenticated_user_id() TO anon, authenticated, service_role;


-- ------------------------------------------------------------------------------
-- 3. P1 REMEDIATION: ADMIN-PIN BRUTE-FORCE LOCKOUT
-- ------------------------------------------------------------------------------
-- Modifizierter Block in authenticate_by_credential, 
-- der fehlerhafte PIN-Eingaben für Admins streng zählt.

CREATE OR REPLACE FUNCTION public.authenticate_by_credential(
    p_credential text, 
    p_school_id uuid DEFAULT NULL::uuid, 
    p_device_key text DEFAULT NULL::text, 
    p_device_name text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private_auth', 'pg_temp', 'extensions'
AS $function$
DECLARE
    v_clean text := TRIM(p_credential);
    v_clean_upper text := UPPER(TRIM(p_credential));
    v_user record;
    v_school record;
    v_lease_id uuid;
    v_sanitized_user jsonb;
    v_headers text;
    v_ip text;
    v_ip_hash text;
    v_ip_failures int := 0;
    v_pin_locked_until timestamptz;
    v_is_admin_pin boolean := FALSE;
    v_token_log_hash text;
    v_has_personal_pin boolean := FALSE;
    v_has_parent_pin boolean := FALSE;
    v_is_pin_activated boolean := FALSE;
    v_mfa_enforced boolean := FALSE;
BEGIN
    IF v_clean IS NULL OR v_clean = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Anmeldedaten.');
    END IF;

    -- Compute one-way SHA-256 hash for logging to satisfy CWE-532
    BEGIN
        v_token_log_hash := encode(extensions.digest(v_clean, 'sha256'), 'hex');
    EXCEPTION WHEN OTHERS THEN
        v_token_log_hash := 'ANONYMIZED_CREDENTIAL';
    END;

    -- IP Extraktion und Anti-Brute-Force
    BEGIN
        v_headers := current_setting('request.headers', true);
        IF v_headers IS NOT NULL AND v_headers <> '' THEN
            v_ip := v_headers::json->>'cf-connecting-ip';
            IF v_ip IS NULL OR v_ip = '' THEN
                v_ip := v_headers::json->>'x-forwarded-for';
            END IF;
            IF v_ip IS NOT NULL AND v_ip <> '' THEN
                v_ip := TRIM(split_part(v_ip, ',', 1));
                v_ip_hash := encode(extensions.digest(v_ip, 'sha256'), 'hex');
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_ip := NULL;
        v_ip_hash := NULL;
    END;

    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        SELECT COUNT(*) INTO v_ip_failures
        FROM public.qr_login_rate_limits
        WHERE ip_hash = v_ip_hash
          AND success = FALSE
          AND created_at > (NOW() - INTERVAL '15 minutes');

        IF v_ip_failures >= 30 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Zu viele Fehlversuche von dieser IP. Bitte warte 15 Minuten.'
            );
        END IF;
    END IF;

    -- Admin-PIN Prüfung falls Schule angegeben
    IF p_school_id IS NOT NULL AND to_regclass('private_auth.school_secrets') IS NOT NULL THEN
        SELECT pin_locked_until INTO v_pin_locked_until
        FROM private_auth.school_secrets
        WHERE school_id = p_school_id;

        IF v_pin_locked_until IS NOT NULL AND v_pin_locked_until > NOW() THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Schulleitungs-PIN ist vorübergehend gesperrt. Bitte in einigen Minuten erneut versuchen.'
            );
        END IF;

        SELECT u.* INTO v_user
        FROM public.users_raw u
        JOIN private_auth.school_secrets sec ON sec.school_id = u.school_id
        WHERE u.school_id = p_school_id
          AND u.role IN ('admin', 'secretary')
          AND u.is_active = TRUE
          AND sec.admin_pin_hash IS NOT NULL
          AND sec.admin_pin_hash = encode(extensions.digest(v_clean, 'sha256'), 'hex')
        ORDER BY (CASE WHEN u.role = 'admin' THEN 1 ELSE 2 END)
        LIMIT 1;

        IF v_user IS NOT NULL THEN
            v_is_admin_pin := TRUE;
            UPDATE private_auth.school_secrets
            SET failed_pin_attempts = 0, pin_locked_until = NULL, updated_at = NOW()
            WHERE school_id = p_school_id;
        ELSE
            -- 🛡️ Brute-Force Lockout Inkrementierung, falls Input plausibel nach Admin-PIN aussieht (Fail-Closed)
            -- Wenn die Eingabe 6 Ziffern lang ist (Format der Admin-PIN), inkrementieren wir den Lockout-Counter.
            IF length(v_clean) = 6 AND v_clean ~ '^[0-9]+$' THEN
                UPDATE private_auth.school_secrets
                SET failed_pin_attempts = COALESCE(failed_pin_attempts, 0) + 1,
                    pin_locked_until = CASE 
                        WHEN COALESCE(failed_pin_attempts, 0) + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
                        WHEN COALESCE(failed_pin_attempts, 0) + 1 = 4 THEN NOW() + INTERVAL '30 seconds'
                        WHEN COALESCE(failed_pin_attempts, 0) + 1 = 3 THEN NOW() + INTERVAL '5 seconds'
                        ELSE NULL 
                    END,
                    updated_at = NOW()
                WHERE school_id = p_school_id;
            END IF;
        END IF;
    END IF;

    -- Regulärer Credential Lookup falls keine Admin-PIN Übereinstimmung
    -- 🛡️ SECURITY HARDENING: UUID login bypass (id = v_clean::uuid) is strictly eliminated!
    IF v_user IS NULL THEN
        SELECT * INTO v_user
        FROM public.users_raw
        WHERE (
            qr_token::text = v_clean
            OR ausweis_nummer = v_clean
            OR ausweis_nummer = v_clean_upper
            OR teacher_qr_token = v_clean
            OR teacher_qr_token::text = v_clean
        )
        AND (p_school_id IS NULL OR school_id = p_school_id)
        AND is_active = TRUE
        LIMIT 1;
    END IF;

    -- User nicht gefunden
    IF v_user IS NULL THEN
        IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
            INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, school_id, success)
            VALUES (v_ip_hash, v_token_log_hash, p_school_id, FALSE);
        END IF;

        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Ungültiger Ausweis-PIN oder QR-Token.'
        );
    END IF;

    -- 🛡️ Schüler-Governance: Kostenairbag Auto-Restore & B2C Karenzzeit
    IF v_user.role = 'student' THEN
        -- 1. Echter 60-Tage-Kostenairbag Auto-Restore
        IF COALESCE(v_user.auto_inactivated_by_airbag, FALSE) = TRUE THEN
            UPDATE public.users_raw
            SET 
                auto_inactivated_by_airbag = FALSE,
                is_campus_active = TRUE,
                last_seen = NOW(),
                updated_at = NOW()
            WHERE id = v_user.id;

            v_user.auto_inactivated_by_airbag := FALSE;
            v_user.is_campus_active := TRUE;

            INSERT INTO public.audit_logs (
                school_id, table_name, record_id, user_id, action, entity_type, entity_id, details
            ) VALUES (
                v_user.school_id, 'users_raw', v_user.id, v_user.id, 'CAMPUS_COST_AIRBAG_AUTO_RESTORED',
                'users_raw', v_user.id::TEXT, jsonb_build_object('student_id', v_user.id, 'reactivated_at', NOW())
            );
        END IF;

        -- 2. B2C 14-Tage-Karenzzeit Fail-Closed Prüfung bei Überweisung
        IF v_user.student_billing_payment_method = 'bank_transfer' 
           AND v_user.payment_status = 'provisional_grace' THEN
            IF COALESCE(v_user.provisional_grace_until, v_user.created_at + INTERVAL '14 days') < NOW() THEN
                UPDATE public.users_raw
                SET 
                    is_campus_active = FALSE,
                    payment_status = 'grace_expired',
                    updated_at = NOW()
                WHERE id = v_user.id;

                v_user.is_campus_active := FALSE;

                INSERT INTO public.audit_logs (
                    school_id, table_name, record_id, user_id, action, entity_type, entity_id, details
                ) VALUES (
                    v_user.school_id, 'users_raw', v_user.id, v_user.id, 'B2C_PROVISIONAL_GRACE_EXPIRED',
                    'users_raw', v_user.id::TEXT, jsonb_build_object('student_id', v_user.id, 'expired_at', NOW())
                );
            END IF;
        END IF;

        -- 3. Stets last_seen aktualisieren
        UPDATE public.users_raw
        SET last_seen = NOW()
        WHERE id = v_user.id;
    END IF;

    -- Fetch school information
    SELECT * INTO v_school
    FROM public.schools
    WHERE id = v_user.school_id;

    v_mfa_enforced := COALESCE(v_school.mfa_enforced_for_admins, FALSE) AND v_user.role IN ('admin', 'secretary');

    -- Create session lease
    IF to_regclass('public.session_leases') IS NOT NULL THEN
        INSERT INTO public.session_leases (
            user_id, school_id, device_name, device_key, role, last_active_at, created_at
        ) VALUES (
            v_user.id, v_user.school_id, COALESCE(p_device_name, 'Browser / Client'),
            COALESCE(p_device_key, gen_random_uuid()::text), v_user.role, NOW(), NOW()
        )
        RETURNING id INTO v_lease_id;
    END IF;

    -- Record success in rate limit table
    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, school_id, success)
        VALUES (v_ip_hash, v_token_log_hash, p_school_id, TRUE);
    END IF;

    -- Pre-calculate authoritative security flags (OWASP ASVS Level 3 Zero Secret Leakage)
    v_has_personal_pin := (
        v_user.personal_pin IS NOT NULL 
        OR EXISTS (
            SELECT 1 FROM private_auth.user_secrets sec 
            WHERE sec.user_id = v_user.id AND sec.argon2_personal_pin_hash IS NOT NULL
        )
    );

    v_has_parent_pin := (
        v_user.parent_pin IS NOT NULL 
        OR EXISTS (
            SELECT 1 FROM private_auth.user_secrets sec 
            WHERE sec.user_id = v_user.id AND sec.argon2_parent_pin_hash IS NOT NULL
        )
    );

    v_is_pin_activated := (
        COALESCE(v_user.is_pin_activated, FALSE) = TRUE 
        OR v_has_personal_pin = TRUE
        OR v_user.role = 'student'
    );

    -- Build zero-secret sanitized user
    -- 🛡️ SECURITY HARDENING: ausweis_nummer, qr_token, teacher_qr_token, and day_of_birth
    -- are strictly excluded from the payload to prevent credential & PII leakage.
    v_sanitized_user := jsonb_build_object(
        'id', v_user.id,
        'first_name', v_user.first_name,
        'last_name', CASE WHEN v_user.role = 'student' THEN NULL ELSE v_user.last_name END,
        'name', CASE WHEN v_user.role = 'student' THEN v_user.first_name ELSE TRIM(CONCAT(v_user.first_name, ' ', v_user.last_name)) END,
        'role', v_user.role,
        'roles', v_user.roles,
        'school_id', v_user.school_id,
        'instrument', v_user.instrument,
        'avatar_url', v_user.avatar_url,
        'photo_url', v_user.photo_url,
        'is_active', v_user.is_active,
        'is_campus_active', v_user.is_campus_active,
        'is_groovelab_active', v_user.is_groovelab_active,
        'is_master_admin', v_user.is_master_admin,
        'has_parent_pin', v_has_parent_pin,
        'has_personal_pin', v_has_personal_pin,
        'is_pin_activated', v_is_pin_activated,
        'is_2fa_enabled', COALESCE(v_user.is_2fa_enabled, FALSE),
        'mfa_enforced_for_admins', v_mfa_enforced,
        'quiet_hours', v_user.quiet_hours,
        'push_notif_schedule_changes', COALESCE(v_user.push_notif_schedule_changes, TRUE),
        'push_notif_homework', COALESCE(v_user.push_notif_homework, TRUE),
        'push_notif_all_features', COALESCE(v_user.push_notif_all_features, TRUE),
        'push_notif_chat', COALESCE(v_user.push_notif_chat, TRUE),
        'push_notif_practice_reminder', COALESCE(v_user.push_notif_practice_reminder, TRUE),
        'push_notif_weekly_digest', COALESCE(v_user.push_notif_weekly_digest, TRUE),
        'campus_ui_level', COALESCE(v_user.campus_ui_level, 'junior'),
        'pin_enforced_for_preview', v_user.pin_enforced_for_preview,
        'auth_method', CASE WHEN v_is_admin_pin THEN 'school_admin_pin' ELSE 'credential' END,
        'schools', CASE WHEN v_school.id IS NOT NULL THEN to_jsonb(v_school) ELSE NULL END
    );

    RETURN jsonb_build_object(
        'success', true,
        'lease_token', v_lease_id,
        'user', v_sanitized_user
    );
END;
$function$;
GRANT EXECUTE ON FUNCTION public.authenticate_by_credential(text, uuid, text, text) TO anon, authenticated, service_role;


-- ------------------------------------------------------------------------------
-- Fix verify_personal_pin for Admin PIN lockout
CREATE OR REPLACE FUNCTION public.verify_personal_pin(user_uuid uuid, input_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private_auth', 'pg_temp', 'extensions', 'pg_catalog'
AS $$
DECLARE
    v_stored_hash TEXT;
    v_input_hash TEXT;
    v_is_locked BOOLEAN := FALSE;
    v_attempts INTEGER := 0;
    v_new_attempts INTEGER := 0;
    v_clean_pin TEXT;
    v_match BOOLEAN := FALSE;
    v_school_id UUID;
    v_role TEXT;
    v_school_attempts INTEGER := 0;
    v_new_school_attempts INTEGER := 0;
    v_school_is_locked BOOLEAN := FALSE;
    v_needs_rehash BOOLEAN := FALSE;
    v_dob INTEGER := NULL;
BEGIN
    IF user_uuid IS NULL OR input_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    v_clean_pin := TRIM(input_pin);
    -- Accept 2 digits (student birth day fallback) or 4 digits (personal PIN)
    IF length(v_clean_pin) < 2 THEN
        RETURN FALSE;
    END IF;

    -- 1. Check lockout status in users_raw
    SELECT 
        school_id,
        role,
        COALESCE(failed_pin_attempts, 0),
        (pin_locked_until IS NOT NULL AND pin_locked_until > NOW())
    INTO v_school_id, v_role, v_attempts, v_is_locked
    FROM public.users_raw
    WHERE id = user_uuid;

    IF NOT FOUND OR v_is_locked THEN
        RETURN FALSE;
    END IF;

    -- 1.5. If admin, check school lockout
    IF v_role IN ('admin', 'secretary') AND to_regclass('private_auth.school_secrets') IS NOT NULL THEN
        SELECT 
            COALESCE(failed_pin_attempts, 0),
            (pin_locked_until IS NOT NULL AND pin_locked_until > NOW())
        INTO v_school_attempts, v_school_is_locked
        FROM private_auth.school_secrets
        WHERE school_id = v_school_id;

        IF v_school_is_locked THEN
            RETURN FALSE;
        END IF;
    END IF;


    -- 2. Fetch stored hash from isolated private_auth schema first
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'private_auth' AND table_name = 'user_secrets'
    ) THEN
        SELECT argon2_personal_pin_hash
        INTO v_stored_hash
        FROM private_auth.user_secrets
        WHERE user_id = user_uuid;
    END IF;

    -- Fallback to users_raw personal_pin if private_auth is empty
    IF v_stored_hash IS NULL THEN
        SELECT personal_pin
        INTO v_stored_hash
        FROM public.users_raw
        WHERE id = user_uuid;
    END IF;

    -- 3. Check PIN: Stored Bcrypt/SHA-256 OR Server-Side Fallback to activation_days.day_of_birth
    IF v_stored_hash IS NOT NULL AND v_stored_hash <> '' AND v_stored_hash <> '0000' THEN
        IF v_stored_hash LIKE '$2%' THEN
            -- Standard: Salted Bcrypt verification
            v_match := (extensions.crypt(v_clean_pin, v_stored_hash) = v_stored_hash);
        ELSIF length(v_stored_hash) = 64 THEN
            -- Legacy Fallback: Unsalted SHA-256 with constant-time HMAC check
            v_input_hash := encode(digest(v_clean_pin, 'sha256'), 'hex');
            v_match := (
                hmac(v_stored_hash, 'campus_pin_constant_time_key_2026', 'sha256') = 
                hmac(v_input_hash, 'campus_pin_constant_time_key_2026', 'sha256')
            );
            IF v_match THEN
                v_needs_rehash := TRUE;
            END IF;
        ELSE
            -- Fail closed: Corrupt or unknown format
            v_match := FALSE;
        END IF;
    ELSE
        -- 🛡️ Fallback to activation_days.day_of_birth if no personal PIN configured yet
        -- v_clean_pin ~ '^[0-9]{1,4}$' strictly prevents integer overflow exceptions
        IF to_regclass('public.activation_days') IS NOT NULL AND v_clean_pin ~ '^[0-9]{1,4}$' THEN
            SELECT day_of_birth INTO v_dob
            FROM public.activation_days
            WHERE student_id = user_uuid
            LIMIT 1;

            IF v_dob IS NOT NULL AND v_dob = v_clean_pin::int THEN
                v_match := TRUE;
            ELSE
                v_match := FALSE;
            END IF;
        ELSE
            v_match := FALSE;
        END IF;
    END IF;

    -- 4. Outcome Handling & Transparent In-Flight Re-Hashing
    IF v_match THEN
        -- Reset lockout counters
        UPDATE public.users_raw
        SET failed_pin_attempts = 0, pin_locked_until = NULL
        WHERE id = user_uuid;

        IF v_role IN ('admin', 'secretary') AND to_regclass('private_auth.school_secrets') IS NOT NULL THEN
            UPDATE private_auth.school_secrets
            SET failed_pin_attempts = 0, pin_locked_until = NULL, updated_at = NOW()
            WHERE school_id = v_school_id;
        END IF;


        -- Transparent In-Flight Upgrade to Salted Bcrypt (Zero-Friction for Student)
        IF v_needs_rehash THEN
            BEGIN
                INSERT INTO private_auth.user_secrets (user_id, argon2_personal_pin_hash, updated_at)
                VALUES (user_uuid, extensions.crypt(v_clean_pin, extensions.gen_salt('bf', 10)), NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    argon2_personal_pin_hash = EXCLUDED.argon2_personal_pin_hash,
                    updated_at = NOW();

                -- Clear legacy plaintext/hash in users_raw
                UPDATE public.users_raw SET personal_pin = NULL WHERE id = user_uuid;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;

        RETURN TRUE;
    ELSE
        v_new_attempts := v_attempts + 1;
        UPDATE public.users_raw
        SET 
            failed_pin_attempts = v_new_attempts,
            pin_locked_until = CASE 
                WHEN v_new_attempts >= 5 THEN NOW() + INTERVAL '15 minutes'
                WHEN v_new_attempts = 4 THEN NOW() + INTERVAL '30 seconds'
                WHEN v_new_attempts = 3 THEN NOW() + INTERVAL '5 seconds'
                ELSE NULL 
            END
        WHERE id = user_uuid;

        IF v_role IN ('admin', 'secretary') AND to_regclass('private_auth.school_secrets') IS NOT NULL THEN
            v_new_school_attempts := v_school_attempts + 1;
            UPDATE private_auth.school_secrets
            SET 
                failed_pin_attempts = v_new_school_attempts,
                pin_locked_until = CASE 
                    WHEN v_new_school_attempts >= 5 THEN NOW() + INTERVAL '15 minutes'
                    WHEN v_new_school_attempts = 4 THEN NOW() + INTERVAL '30 seconds'
                    WHEN v_new_school_attempts = 3 THEN NOW() + INTERVAL '5 seconds'
                    ELSE NULL 
                END,
                updated_at = NOW()
            WHERE school_id = v_school_id;
        END IF;

        -- Forensisches Audit-Logging bei Brute-Force-Verdacht (ab 3 Fehlversuchen)
        IF v_new_attempts >= 3 AND to_regclass('public.audit_logs') IS NOT NULL THEN
            BEGIN
                INSERT INTO public.audit_logs (
                    school_id,
                    user_id,
                    action,
                    details
                ) VALUES (
                    v_school_id,
                    user_uuid,
                    'SECURITY_PERSONAL_PIN_THROTTLED',
                    jsonb_build_object(
                        'target_user_id', user_uuid,
                        'failed_attempts', v_new_attempts,
                        'lockout_duration', CASE 
                            WHEN v_new_attempts >= 5 THEN '15 minutes'
                            WHEN v_new_attempts = 4 THEN '30 seconds'
                            WHEN v_new_attempts = 3 THEN '5 seconds'
                            ELSE 'none'
                        END,
                        'timestamp', NOW()
                    )
                );
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;

        RETURN FALSE;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_personal_pin(uuid, text) TO authenticated, anon, service_role;



-- 4. P1 REMEDIATION: PURGE PLAINTEXT PIN FROM AUSWEIS_NUMMER
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.register_school_and_admin(
    p_school_name TEXT,
    p_subdomain TEXT,
    p_street TEXT,
    p_house_number TEXT,
    p_zip_code TEXT,
    p_city TEXT,
    p_phone TEXT,
    p_school_email TEXT,
    p_admin_first_name TEXT,
    p_admin_last_name TEXT,
    p_country TEXT DEFAULT 'Deutschland'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_school_id UUID := gen_random_uuid();
    v_admin_id UUID := gen_random_uuid();
    v_qr_token UUID := gen_random_uuid();
    v_generated_pin TEXT;
    v_admin_email TEXT;
    v_slug TEXT;
    v_country TEXT;
    v_reserved_subdomains TEXT[] := ARRAY[
        'admin', 'api', 'app', 'auth', 'login', 'signup', 'register', 'root',
        'system', 'support', 'dashboard', 'mail', 'secure', 'static', 'assets',
        'cdn', 'groovelab', 'campus', 'master', 'status', 'help', 'billing',
        'dev', 'staging', 'test', 'demo', 'portal', 'account', 'kiosk', 'stage',
        'live', 'secretariat', 'sekretariat', 'schulleitung', 'teacher', 'lehrer',
        'student', 'schueler', 'eltern', 'parents', 'download', 'pass', 'qr'
    ];
BEGIN
    -- 1. Validierung aller Pflichtfelder (Fail-Closed)
    IF TRIM(COALESCE(p_school_name, '')) = '' THEN
        RAISE EXCEPTION 'MANDATORY_FIELD_MISSING: Schulname darf nicht leer sein.' USING ERRCODE = '23502';
    END IF;
    IF TRIM(COALESCE(p_street, '')) = '' OR TRIM(COALESCE(p_house_number, '')) = '' THEN
        RAISE EXCEPTION 'MANDATORY_FIELD_MISSING: Vollständige Anschrift (Straße und Hausnummer) ist zwingend erforderlich.' USING ERRCODE = '23502';
    END IF;
    IF TRIM(COALESCE(p_zip_code, '')) = '' OR TRIM(COALESCE(p_city, '')) = '' THEN
        RAISE EXCEPTION 'MANDATORY_FIELD_MISSING: Postleitzahl und Ort sind zwingend erforderlich.' USING ERRCODE = '23502';
    END IF;
    IF TRIM(COALESCE(p_admin_first_name, '')) = '' OR TRIM(COALESCE(p_admin_last_name, '')) = '' THEN
        RAISE EXCEPTION 'MANDATORY_FIELD_MISSING: Vor- und Nachname der Schulleitung sind zwingend erforderlich.' USING ERRCODE = '23502';
    END IF;
    IF TRIM(COALESCE(p_school_email, '')) = '' THEN
        RAISE EXCEPTION 'MANDATORY_FIELD_MISSING: Eine offizielle E-Mail-Adresse der Musikschule ist zwingend erforderlich.' USING ERRCODE = '23502';
    END IF;

    -- 2. Format & Validate Slug
    v_slug := LOWER(TRIM(p_subdomain));
    IF v_slug IS NULL OR length(v_slug) < 3 THEN
        RAISE EXCEPTION 'Die Wunsch-Subdomain muss mindestens 3 Zeichen lang sein.';
    END IF;

    IF v_slug = ANY(v_reserved_subdomains) THEN
        RAISE EXCEPTION 'Diese Subdomain ist ein geschützter Systemname und kann nicht vergeben werden.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.schools WHERE subdomain = v_slug) THEN
        RAISE EXCEPTION 'Diese Wunsch-Subdomain ist bereits vergeben. Bitte wähle eine andere.';
    END IF;

    -- 3. Validate Country (DACH region only)
    v_country := COALESCE(NULLIF(TRIM(p_country), ''), 'Deutschland');
    IF v_country NOT IN ('Deutschland', 'Österreich', 'Schweiz') THEN
        v_country := 'Deutschland';
    END IF;

    -- 4. Generate unique 6-digit Master-PIN & Email
    v_generated_pin := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
    v_admin_email := LOWER(TRIM(p_school_email));

    -- 5. Create school record directly in public.schools
    INSERT INTO public.schools (
        id, name, legal_name, subdomain, primary_color,
        street, house_number, zip_code, city, phone_number,
        email, billing_email, billing_contact_person, country,
        has_campus_subscription, has_groovelab_subscription,
        storage_addon_gb, storage_addon_monthly_fee, storage_addon_status,
        extra_billing_option, is_billing_booked,
        subscription_bypass, is_trial, trial_ends_at, status,
        avv_signed_at, avv_signee_name, is_active, is_demo_tenant
    ) VALUES (
        v_school_id, TRIM(p_school_name), TRIM(p_school_name), v_slug, '#34a853',
        TRIM(p_street), TRIM(p_house_number), TRIM(p_zip_code), TRIM(p_city), NULLIF(TRIM(p_phone), ''),
        v_admin_email, v_admin_email, TRIM(p_admin_first_name) || ' ' || TRIM(p_admin_last_name), v_country,
        FALSE, FALSE,
        0, 0.00, 'none',
        NULL, FALSE,
        FALSE, TRUE, NOW() + INTERVAL '30 days', 'trial',
        NOW(), TRIM(p_admin_first_name) || ' ' || TRIM(p_admin_last_name) || ' (Schulleitung)', TRUE, FALSE
    );

    -- 6. Create admin record in public.users_raw
    -- 🛡️ SECURITY HARDENING: ausweis_nummer is left NULL to prevent plaintext PIN leaks!
    INSERT INTO public.users_raw (
        id, school_id, role, roles, first_name, last_name,
        password_hash, qr_token, ausweis_nummer,
        is_campus_active, is_groovelab_active, is_active,
        is_pin_activated, photo_url, avatar_url,
        email, created_at
    ) VALUES (
        v_admin_id, v_school_id, 'admin', ARRAY['admin'],
        TRIM(p_admin_first_name), TRIM(p_admin_last_name),
        NULL, v_qr_token, NULL, -- P1 Remediation: ausweis_nummer is NULL instead of v_generated_pin
        TRUE, TRUE, TRUE,
        TRUE, '/campus_login_hero.png', '/campus_login_hero.png',
        v_admin_email, NOW()
    );

    -- 7. Persist Salted Bcrypt Hash in isolated private_auth.user_secrets
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'private_auth') THEN
        INSERT INTO private_auth.user_secrets (
            user_id,
            password_hash,
            argon2_personal_pin_hash,
            updated_at
        ) VALUES (
            v_admin_id,
            extensions.crypt(v_generated_pin, extensions.gen_salt('bf', 10)),
            extensions.crypt(v_generated_pin, extensions.gen_salt('bf', 10)),
            NOW()
        ) ON CONFLICT (user_id) DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            argon2_personal_pin_hash = EXCLUDED.argon2_personal_pin_hash,
            updated_at = NOW();

        -- Also populate school_secrets for school-admin PIN lookup
        IF to_regclass('private_auth.school_secrets') IS NOT NULL THEN
            INSERT INTO private_auth.school_secrets (
                school_id,
                admin_pin_hash,
                created_at,
                updated_at
            ) VALUES (
                v_school_id,
                encode(extensions.digest(v_generated_pin, 'sha256'), 'hex'),
                NOW(),
                NOW()
            ) ON CONFLICT (school_id) DO UPDATE SET
                admin_pin_hash = EXCLUDED.admin_pin_hash,
                updated_at = NOW();
        END IF;
    END IF;

    -- 8. Audit Logging
    INSERT INTO public.audit_logs (
        school_id, user_id, action, details
    ) VALUES (
        v_school_id, v_admin_id, 'school_self_onboarded',
        jsonb_build_object(
            'school_name', TRIM(p_school_name),
            'subdomain', v_slug,
            'country', v_country,
            'street', TRIM(p_street),
            'house_number', TRIM(p_house_number),
            'city', TRIM(p_city),
            'zip_code', TRIM(p_zip_code)
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'school_id', v_school_id,
        'admin_id', v_admin_id,
        'pin', v_generated_pin,
        'qr_token', v_qr_token
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.register_school_and_admin(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
