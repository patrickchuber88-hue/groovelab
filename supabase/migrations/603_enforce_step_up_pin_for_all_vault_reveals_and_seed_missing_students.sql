-- ==============================================================================
-- 🛡️ Migration 603: Enforce 0,1% Step-Up PIN for All Vault Reveals & Populate Canonical Students
-- Standards: NIST SP 800-63B Section 7.2, BSI TR-02102-1, OWASP ASVS Level 3
--
-- 1. [Vault-Seed] Garantiert, dass Amelia Novak, Linus König und Aurora Dominguez im Vault liegen.
-- 2. [RPC-Härtung] reveal_class_roster_names verlangt strikt p_pin & verify_personal_pin (kein Session-Lease Bypass).
-- 3. [RPC-Härtung] reveal_student_full_name verlangt strikt p_pin & verify_personal_pin (kein Session-Lease Bypass).
-- 4. [SSOT-PIN] Sichert Peter Pan mit kanonischer PIN 1234 ab.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. VAULT-SEED: Fehlende Schüler-Nachnamen chifffrieren und in den Tresor einbetten
-- ------------------------------------------------------------------------------
-- Amelia Novak
INSERT INTO private_auth.blind_student_lastname_vault (
    blind_link_hmac, school_id, encrypted_lastname, updated_at
) VALUES (
    encode(extensions.hmac('dc8bdabf-4b87-4519-94d5-6cd49c91691e:53e83805-1d5a-4ed8-988e-1fb0b8200b9c', public.get_encryption_key(), 'sha256'), 'hex'),
    '53e83805-1d5a-4ed8-988e-1fb0b8200b9c',
    extensions.pgp_sym_encrypt('Novak', public.get_encryption_key()),
    clock_timestamp()
) ON CONFLICT (blind_link_hmac) DO UPDATE SET 
    encrypted_lastname = EXCLUDED.encrypted_lastname,
    updated_at = clock_timestamp();

-- Linus König
INSERT INTO private_auth.blind_student_lastname_vault (
    blind_link_hmac, school_id, encrypted_lastname, updated_at
) VALUES (
    encode(extensions.hmac('15102f5e-c504-4c33-93ab-436285197c8c:53e83805-1d5a-4ed8-988e-1fb0b8200b9c', public.get_encryption_key(), 'sha256'), 'hex'),
    '53e83805-1d5a-4ed8-988e-1fb0b8200b9c',
    extensions.pgp_sym_encrypt('König', public.get_encryption_key()),
    clock_timestamp()
) ON CONFLICT (blind_link_hmac) DO UPDATE SET 
    encrypted_lastname = EXCLUDED.encrypted_lastname,
    updated_at = clock_timestamp();

-- Aurora Dominguez
INSERT INTO private_auth.blind_student_lastname_vault (
    blind_link_hmac, school_id, encrypted_lastname, updated_at
) VALUES (
    encode(extensions.hmac('3ee43f29-5ee4-436f-870f-90e4a7ecf3f4:53e83805-1d5a-4ed8-988e-1fb0b8200b9c', public.get_encryption_key(), 'sha256'), 'hex'),
    '53e83805-1d5a-4ed8-988e-1fb0b8200b9c',
    extensions.pgp_sym_encrypt('Dominguez', public.get_encryption_key()),
    clock_timestamp()
) ON CONFLICT (blind_link_hmac) DO UPDATE SET 
    encrypted_lastname = EXCLUDED.encrypted_lastname,
    updated_at = clock_timestamp();

-- ------------------------------------------------------------------------------
-- 2. SSOT-PIN: Peter Pan mit persönlicher PIN 1110 absichern
-- ------------------------------------------------------------------------------
INSERT INTO private_auth.user_secrets (user_id, argon2_personal_pin_hash, updated_at)
VALUES (
    '11079eae-664a-49a4-8692-771d83a3193c',
    extensions.crypt('1110', extensions.gen_salt('bf', 10)),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
    argon2_personal_pin_hash = EXCLUDED.argon2_personal_pin_hash,
    updated_at = NOW();

UPDATE public.users_raw
SET is_pin_activated = TRUE,
    failed_pin_attempts = 0,
    pin_locked_until = NULL
WHERE id = '11079eae-664a-49a4-8692-771d83a3193c';

-- ------------------------------------------------------------------------------
-- 3. RPC: public.reveal_class_roster_names (Strikter Step-Up PIN Zwang)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reveal_class_roster_names(
    p_pin TEXT DEFAULT NULL,
    p_student_ids UUID[] DEFAULT NULL
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
    v_pin_valid BOOLEAN := FALSE;
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

    -- 🛡️ 0,1% Step-Up PIN-Verifikation (NIST SP 800-63B Section 7.2 / BSI TR-02102-1):
    -- Klarnamen-Entschlüsselung erfordert IMMER die Verifikation der persönlichen 4-stelligen PIN!
    IF p_pin IS NULL OR TRIM(p_pin) = '' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'PIN_REQUIRED', 
            'message', 'Sicherheitsnachweis: Bitte persönliche 4-stellige PIN zur Klarnamen-Freigabe eingeben.'
        );
    END IF;

    v_pin_valid := public.verify_personal_pin(v_caller_id, p_pin);
    IF NOT v_pin_valid THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_PIN', 'message', 'Ungültige PIN. Zugriff verweigert.');
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

    -- 1 aggregiertes Audit-Log (WORM) mit validem record_id
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
                'duration_seconds', 60,
                'timestamp', clock_timestamp()
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'count', v_student_count,
        'students', v_results
    );
END;
$$;

REVOKE ALL ON FUNCTION public.reveal_class_roster_names(TEXT, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reveal_class_roster_names(TEXT, UUID[]) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. RPC: public.reveal_student_full_name (Strikter Step-Up PIN Zwang)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reveal_student_full_name(
    p_student_id UUID,
    p_pin TEXT DEFAULT NULL
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
    v_pin_valid BOOLEAN := FALSE;
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

    -- 🛡️ 0,1% Step-Up PIN-Verifikation (NIST SP 800-63B Section 7.2 / BSI TR-02102-1):
    IF p_pin IS NULL OR TRIM(p_pin) = '' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'PIN_REQUIRED', 
            'message', 'Sicherheitsnachweis: Bitte persönliche 4-stellige PIN zur Klarnamen-Freigabe eingeben.'
        );
    END IF;

    v_pin_valid := public.verify_personal_pin(v_caller_id, p_pin);
    IF NOT v_pin_valid THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_PIN', 'message', 'Ungültige PIN. Zugriff verweigert.');
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
            'timestamp', clock_timestamp()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'student_id', p_student_id,
        'first_name', v_first_name,
        'last_name', v_decrypted_last,
        'full_name', TRIM(v_first_name || ' ' || COALESCE(v_decrypted_last, ''))
    );
END;
$$;

REVOKE ALL ON FUNCTION public.reveal_student_full_name(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reveal_student_full_name(UUID, TEXT) TO authenticated, service_role;

COMMIT;
