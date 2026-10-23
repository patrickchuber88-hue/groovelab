-- ==============================================================================
-- 🛡️ Migration 604: Enterprise Zero-Knowledge Step-Up Lease & Zero-Client-PIN Architecture
-- Standards: NIST SP 800-63B Section 7.2, BSI TR-02102-1, OWASP ASVS Level 3
--
-- 1. [DDL] private_auth.step_up_leases: Kryptografische Kurzzeit-Leases für Klarnamen-Reveals (300s TTL).
-- 2. [RPC] private_auth.mint_step_up_lease: Sicheres Erzeugen von Step-Up Tokens nach verifizierter PIN.
-- 3. [RPC] public.revoke_step_up_lease: Vorzeitiges serverseitiges Invalidieren bei Vorhang-Schließen.
-- 4. [RPC-Härtung] reveal_class_roster_names: Dual-Auth (p_step_up_token OR p_pin) + Rückgabe des Step-Up Tokens.
-- 5. [RPC-Härtung] reveal_student_full_name: Dual-Auth (p_step_up_token OR p_pin) + Rückgabe des Step-Up Tokens.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. DDL: private_auth.step_up_leases (Flüchtige kryptografische Step-Up Leases)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS private_auth.step_up_leases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    school_id UUID NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'REVEAL_STUDENT_NAMES',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_step_up_leases_active 
    ON private_auth.step_up_leases (id, user_id, expires_at) 
    WHERE is_revoked = FALSE;

-- Hermetische Berechtigung: Kein Zugriff für reguläre Clients
REVOKE ALL ON TABLE private_auth.step_up_leases FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 2. HELPER: private_auth.mint_step_up_lease
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private_auth.mint_step_up_lease(
    p_user_id UUID,
    p_school_id UUID,
    p_duration_seconds INT DEFAULT 300
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private_auth, public, pg_temp
AS $$
DECLARE
    v_lease_id UUID := gen_random_uuid();
    v_expires TIMESTAMPTZ;
BEGIN
    v_expires := clock_timestamp() + (COALESCE(p_duration_seconds, 300) || ' seconds')::INTERVAL;
    
    -- Opportunistische Selbstbereinigung abgelaufener Leases älter als 24 Stunden
    DELETE FROM private_auth.step_up_leases
    WHERE expires_at < (clock_timestamp() - INTERVAL '24 hours');

    INSERT INTO private_auth.step_up_leases (
        id, user_id, school_id, purpose, expires_at, created_at, is_revoked
    ) VALUES (
        v_lease_id, p_user_id, p_school_id, 'REVEAL_STUDENT_NAMES', v_expires, clock_timestamp(), FALSE
    );

    RETURN v_lease_id;
END;
$$;

REVOKE ALL ON FUNCTION private_auth.mint_step_up_lease(UUID, UUID, INT) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 3. HELPER: public.revoke_step_up_lease
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_step_up_lease(
    p_token UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    IF v_caller_id IS NULL OR p_token IS NULL THEN
        RETURN FALSE;
    END IF;

    UPDATE private_auth.step_up_leases
    SET is_revoked = TRUE
    WHERE id = p_token AND user_id = v_caller_id;

    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_step_up_lease(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_step_up_lease(UUID) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. RPC: public.reveal_class_roster_names (Dual-Auth: Token OR PIN)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.reveal_class_roster_names(TEXT, UUID[]);

CREATE OR REPLACE FUNCTION public.reveal_class_roster_names(
    p_pin TEXT DEFAULT NULL,
    p_student_ids UUID[] DEFAULT NULL,
    p_step_up_token UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_roles TEXT[];
    v_caller_school UUID;
    v_is_master BOOLEAN;
    v_is_school_admin BOOLEAN := FALSE;
    v_token_valid BOOLEAN := FALSE;
    v_pin_valid BOOLEAN := FALSE;
    v_active_token UUID := NULL;
    v_results JSONB := '[]'::JSONB;
    v_rec RECORD;
    v_hmac TEXT;
    v_enc_bytes BYTEA;
    v_decrypted_last TEXT;
    v_student_count INT := 0;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school := public.get_current_user_school_id();
    v_is_master := public.is_master_admin();

    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Nicht authentifiziert.');
    END IF;

    -- Rollen-Array laden zur Erkennung von Dual-Role Schulleitern
    SELECT roles INTO v_caller_roles 
    FROM public.users_raw 
    WHERE id = v_caller_id;

    v_is_school_admin := (
        v_is_master 
        OR v_caller_role IN ('admin', 'secretary')
        OR (v_caller_roles IS NOT NULL AND ('admin' = ANY(v_caller_roles) OR 'secretary' = ANY(v_caller_roles)))
    );

    -- Zugriffskontrolle: Master Admin ODER Schulleitung/Sekretariat/Dozent der Schule
    IF NOT v_is_master THEN
        IF v_caller_school IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Keine Schulzuweisung.');
        END IF;

        IF v_caller_role NOT IN ('teacher', 'admin', 'secretary') AND NOT v_is_school_admin THEN
            RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Nur autorisierte Lehrkräfte und Schulverwaltung dürfen Klarnamen einsehen.');
        END IF;
    END IF;

    -- 🛡️ 0,1% Step-Up Dual-Verifikation (NIST SP 800-63B / BSI TR-02102-1):
    -- 1. Prüfung: Existiert ein valides Step-Up Lease Token im RAM?
    IF p_step_up_token IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM private_auth.step_up_leases
            WHERE id = p_step_up_token
              AND user_id = v_caller_id
              AND expires_at > clock_timestamp()
              AND is_revoked = FALSE
        ) INTO v_token_valid;
    END IF;

    IF v_token_valid THEN
        v_active_token := p_step_up_token;
    -- 2. Prüfung: Wurde eine persönliche 4-stellige PIN übergeben?
    ELSIF p_pin IS NOT NULL AND TRIM(p_pin) <> '' THEN
        v_pin_valid := public.verify_personal_pin(v_caller_id, p_pin);
        IF NOT v_pin_valid THEN
            RETURN jsonb_build_object('success', false, 'error', 'INVALID_PIN', 'message', 'Ungültige PIN. Zugriff verweigert.');
        END IF;
        -- PIN ist valide -> Erzeuge frisches Step-Up Lease Token (300s TTL)
        v_active_token := private_auth.mint_step_up_lease(
            v_caller_id, 
            COALESCE(v_caller_school, (SELECT school_id FROM public.users_raw WHERE id = v_caller_id)), 
            300
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'PIN_REQUIRED', 
            'message', 'Sicherheitsnachweis: Bitte persönliche 4-stellige PIN oder aktives Step-Up Token zur Klarnamen-Freigabe übergeben.'
        );
    END IF;

    -- Kandidaten selektieren (Dual-Role Schulleiter sehen alle Schüler der Schule, reine Dozenten nur eigene)
    FOR v_rec IN 
        SELECT u.id, u.school_id, u.first_name
        FROM public.users_raw u
        WHERE u.role = 'student'
          AND (v_is_master OR u.school_id = v_caller_school)
          AND (v_is_school_admin OR u.teacher_id = v_caller_id)
          AND (p_student_ids IS NULL OR u.id = ANY(p_student_ids))
    LOOP
        v_hmac := encode(
            extensions.hmac(
                v_rec.id::text || ':' || v_rec.school_id::text,
                public.get_encryption_key(),
                'sha256'
            ),
            'hex'
        );

        SELECT encrypted_lastname INTO v_enc_bytes
        FROM private_auth.blind_student_lastname_vault
        WHERE blind_link_hmac = v_hmac;

        IF v_enc_bytes IS NOT NULL THEN
            v_decrypted_last := public.safe_pgp_sym_decrypt(v_enc_bytes, public.get_encryption_key());
        ELSE
            v_decrypted_last := '';
        END IF;

        v_results := v_results || jsonb_build_object(
            'student_id', v_rec.id,
            'first_name', v_rec.first_name,
            'last_name', v_decrypted_last,
            'full_name', TRIM(v_rec.first_name || ' ' || COALESCE(v_decrypted_last, ''))
        );
        v_student_count := v_student_count + 1;
    END LOOP;

    -- 1 aggregiertes Audit-Log (WORM)
    IF v_student_count > 0 THEN
        INSERT INTO public.audit_logs (
            school_id, table_name, operation, action, record_id, changed_by, user_id, details
        ) VALUES (
            COALESCE(v_caller_school, (SELECT school_id FROM public.users_raw WHERE id = v_caller_id)),
            'blind_student_lastname_vault',
            'REVEAL_CLASS_ROSTER_NAMES',
            'REVEAL_CLASS_ROSTER_NAMES',
            v_caller_id,
            v_caller_id,
            v_caller_id,
            jsonb_build_object(
                'student_count', v_student_count,
                'caller_role', v_caller_role,
                'auth_mode', CASE WHEN v_token_valid THEN 'STEP_UP_TOKEN' ELSE 'VERIFIED_PIN' END,
                'duration_seconds', 60,
                'timestamp', clock_timestamp()
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'count', v_student_count,
        'step_up_token', v_active_token,
        'students', v_results
    );
END;
$$;

REVOKE ALL ON FUNCTION public.reveal_class_roster_names(TEXT, UUID[], UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reveal_class_roster_names(TEXT, UUID[], UUID) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 5. RPC: public.reveal_student_full_name (Dual-Auth: Token OR PIN)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.reveal_student_full_name(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.reveal_student_full_name(
    p_student_id UUID,
    p_pin TEXT DEFAULT NULL,
    p_step_up_token UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_roles TEXT[];
    v_caller_school UUID;
    v_student_school UUID;
    v_student_teacher UUID;
    v_is_master BOOLEAN;
    v_is_school_admin BOOLEAN := FALSE;
    v_token_valid BOOLEAN := FALSE;
    v_pin_valid BOOLEAN := FALSE;
    v_active_token UUID := NULL;
    v_hmac TEXT;
    v_enc_bytes BYTEA;
    v_decrypted_last TEXT;
    v_first_name TEXT;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school := public.get_current_user_school_id();
    v_is_master := public.is_master_admin();

    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Nicht authentifiziert.');
    END IF;

    IF p_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_PARAM', 'message', 'Schüler-ID fehlt.');
    END IF;

    SELECT school_id, teacher_id, first_name 
    INTO v_student_school, v_student_teacher, v_first_name
    FROM public.users_raw 
    WHERE id = p_student_id AND role = 'student';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Schüler nicht gefunden.');
    END IF;

    SELECT roles INTO v_caller_roles 
    FROM public.users_raw 
    WHERE id = v_caller_id;

    v_is_school_admin := (
        v_is_master 
        OR v_caller_role IN ('admin', 'secretary')
        OR (v_caller_roles IS NOT NULL AND ('admin' = ANY(v_caller_roles) OR 'secretary' = ANY(v_caller_roles)))
    );

    IF NOT v_is_master THEN
        IF v_caller_school IS NULL OR v_caller_school <> v_student_school THEN
            RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Schulfremder Zugriff verweigert.');
        END IF;

        IF NOT v_is_school_admin AND (v_student_teacher IS NULL OR v_student_teacher <> v_caller_id) THEN
            RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Keine Berechtigung für diesen Schüler.');
        END IF;
    END IF;

    -- 🛡️ 0,1% Step-Up Dual-Verifikation (NIST SP 800-63B / BSI TR-02102-1):
    IF p_step_up_token IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM private_auth.step_up_leases
            WHERE id = p_step_up_token
              AND user_id = v_caller_id
              AND expires_at > clock_timestamp()
              AND is_revoked = FALSE
        ) INTO v_token_valid;
    END IF;

    IF v_token_valid THEN
        v_active_token := p_step_up_token;
    ELSIF p_pin IS NOT NULL AND TRIM(p_pin) <> '' THEN
        v_pin_valid := public.verify_personal_pin(v_caller_id, p_pin);
        IF NOT v_pin_valid THEN
            RETURN jsonb_build_object('success', false, 'error', 'INVALID_PIN', 'message', 'Ungültige PIN. Zugriff verweigert.');
        END IF;
        v_active_token := private_auth.mint_step_up_lease(
            v_caller_id, 
            COALESCE(v_caller_school, (SELECT school_id FROM public.users_raw WHERE id = v_caller_id)), 
            300
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'PIN_REQUIRED', 
            'message', 'Sicherheitsnachweis: Bitte persönliche 4-stellige PIN oder aktives Step-Up Token zur Klarnamen-Freigabe übergeben.'
        );
    END IF;

    v_hmac := encode(
        extensions.hmac(
            p_student_id::text || ':' || v_student_school::text,
            public.get_encryption_key(),
            'sha256'
        ),
        'hex'
    );

    SELECT encrypted_lastname INTO v_enc_bytes
    FROM private_auth.blind_student_lastname_vault
    WHERE blind_link_hmac = v_hmac;

    IF v_enc_bytes IS NOT NULL THEN
        v_decrypted_last := public.safe_pgp_sym_decrypt(v_enc_bytes, public.get_encryption_key());
    ELSE
        v_decrypted_last := '';
    END IF;

    INSERT INTO public.audit_logs (
        school_id, table_name, operation, action, record_id, changed_by, user_id, details
    ) VALUES (
        v_student_school,
        'blind_student_lastname_vault',
        'REVEAL_STUDENT_FULL_NAME',
        'REVEAL_STUDENT_FULL_NAME',
        p_student_id,
        v_caller_id,
        v_caller_id,
        jsonb_build_object(
            'student_id', p_student_id,
            'caller_role', v_caller_role,
            'auth_mode', CASE WHEN v_token_valid THEN 'STEP_UP_TOKEN' ELSE 'VERIFIED_PIN' END,
            'timestamp', clock_timestamp()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'student_id', p_student_id,
        'first_name', v_first_name,
        'last_name', v_decrypted_last,
        'full_name', TRIM(v_first_name || ' ' || COALESCE(v_decrypted_last, '')),
        'step_up_token', v_active_token
    );
END;
$$;

REVOKE ALL ON FUNCTION public.reveal_student_full_name(UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reveal_student_full_name(UUID, TEXT, UUID) TO authenticated, service_role;

COMMIT;
