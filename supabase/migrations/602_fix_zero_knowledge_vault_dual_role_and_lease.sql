-- ==============================================================================
-- 🛡️ Migration 602: Fix Zero-Knowledge Vault Dual-Role Scoping & Session Lease Parity
-- Standards: BSI TR-02102-1, OWASP ASVS Level 3, EuGH C-413/23 P
--
-- 1. Ermöglicht aktive Session-Lease-Nutzung (< 15 min) für Dozenten & Schulleitung
-- 2. Erweitert Dozenten-Scoping um Dual-Role Schulleitungsrechte (roles = ['admin', 'teacher'])
-- 3. Fixt NOT-NULL record_id & action im audit_logs WORM Insert
-- 4. Stellt sicher, dass reveal_class_roster_names alle berechtigten Schüler entschlüsselt
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. AUTORITATIVER BATCH-RPC: reveal_class_roster_names
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reveal_class_roster_names(
    p_pin TEXT DEFAULT NULL,
    p_student_ids UUID[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_roles TEXT[];
    v_caller_school UUID;
    v_is_master BOOLEAN;
    v_pin_valid BOOLEAN := FALSE;
    v_has_active_lease BOOLEAN := FALSE;
    v_results JSONB := '[]'::JSONB;
    v_rec RECORD;
    v_hmac TEXT;
    v_enc_bytes BYTEA;
    v_decrypted_last TEXT;
    v_student_count INT := 0;
    v_is_school_admin BOOLEAN := FALSE;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school := public.get_current_user_school_id();
    v_is_master := public.is_master_admin();

    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Nicht authentifiziert.');
    END IF;

    -- Rollen des Callers auflösen
    SELECT roles INTO v_caller_roles FROM public.users_raw WHERE id = v_caller_id;

    v_is_school_admin := v_is_master 
                         OR v_caller_role IN ('admin', 'secretary') 
                         OR ('admin' = ANY(v_caller_roles)) 
                         OR ('secretary' = ANY(v_caller_roles));

    -- Zugriffskontrolle: Master Admin ODER Schulleitung/Sekretariat/Dozent der Schule
    IF NOT v_is_master THEN
        IF v_caller_school IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Keine Schulzuweisung.');
        END IF;

        IF v_caller_role NOT IN ('teacher', 'admin', 'secretary') 
           AND NOT ('teacher' = ANY(v_caller_roles)) 
           AND NOT ('admin' = ANY(v_caller_roles)) 
           AND NOT ('secretary' = ANY(v_caller_roles)) THEN
            RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Nur autorisierte Lehrkräfte und Schulverwaltung dürfen Klarnamen einsehen.');
        END IF;
    END IF;

    -- Aktive Session-Lease (< 15 Min) prüfen
    SELECT EXISTS (
        SELECT 1 FROM public.session_leases 
        WHERE user_id = v_caller_id 
          AND is_revoked = FALSE 
          AND last_active_at > NOW() - INTERVAL '15 minutes'
    ) INTO v_has_active_lease;

    -- 0,1% Step-Up PIN-Verifikation (NIST SP 800-63B Section 7.2 / BSI TR-02102-1):
    IF p_pin IS NOT NULL AND TRIM(p_pin) <> '' THEN
        v_pin_valid := public.verify_personal_pin(v_caller_id, p_pin);
        IF NOT v_pin_valid THEN
            RETURN jsonb_build_object('success', false, 'error', 'INVALID_PIN', 'message', 'Ungültige PIN. Zugriff verweigert.');
        END IF;
    ELSIF v_has_active_lease THEN
        v_pin_valid := TRUE;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'PIN_REQUIRED', 'message', 'Bitte persönliche PIN zur Klarnamen-Freigabe eingeben.');
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
                'is_school_admin', v_is_school_admin,
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
-- 2. AUTORITATIVER EINZEL-RPC: reveal_student_full_name
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reveal_student_full_name(
    p_student_id UUID,
    p_pin TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_roles TEXT[];
    v_caller_school UUID;
    v_is_master BOOLEAN;
    v_target_student RECORD;
    v_hmac TEXT;
    v_enc_bytes BYTEA;
    v_decrypted_last TEXT;
    v_pin_valid BOOLEAN := FALSE;
    v_has_active_lease BOOLEAN := FALSE;
    v_is_school_admin BOOLEAN := FALSE;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school := public.get_current_user_school_id();
    v_is_master := public.is_master_admin();

    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Nicht authentifiziert.');
    END IF;

    -- Schüler laden
    SELECT id, school_id, teacher_id, first_name, role 
    INTO v_target_student
    FROM public.users_raw 
    WHERE id = p_student_id;

    IF v_target_student.id IS NULL OR v_target_student.role <> 'student' THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Schüler nicht gefunden.');
    END IF;

    -- Rollen des Callers auflösen
    SELECT roles INTO v_caller_roles FROM public.users_raw WHERE id = v_caller_id;

    v_is_school_admin := v_is_master 
                         OR v_caller_role IN ('admin', 'secretary') 
                         OR ('admin' = ANY(v_caller_roles)) 
                         OR ('secretary' = ANY(v_caller_roles));

    -- Mandantenprüfung
    IF NOT v_is_master THEN
        IF v_caller_school IS NULL OR v_caller_school <> v_target_student.school_id THEN
            RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Mandantentrennung: Kein Zugriff auf diese Musikschule.');
        END IF;

        IF NOT v_is_school_admin 
           AND v_caller_role <> 'teacher' 
           AND NOT ('teacher' = ANY(v_caller_roles)) THEN
            RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Nur autorisierte Lehrkräfte und Schulverwaltung dürfen Klarnamen einsehen.');
        END IF;

        -- Falls Dozent ohne Admin-Rechte: Nur eigene Schüler
        IF NOT v_is_school_admin AND v_target_student.teacher_id <> v_caller_id THEN
            RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Lehrkräfte dürfen nur Klarnamen ihrer eigenen Schüler einsehen.');
        END IF;
    END IF;

    -- Aktive Session-Lease prüfen
    SELECT EXISTS (
        SELECT 1 FROM public.session_leases 
        WHERE user_id = v_caller_id 
          AND is_revoked = FALSE 
          AND last_active_at > NOW() - INTERVAL '15 minutes'
    ) INTO v_has_active_lease;

    IF p_pin IS NOT NULL AND TRIM(p_pin) <> '' THEN
        v_pin_valid := public.verify_personal_pin(v_caller_id, p_pin);
        IF NOT v_pin_valid THEN
            RETURN jsonb_build_object('success', false, 'error', 'INVALID_PIN', 'message', 'Ungültige PIN. Zugriff verweigert.');
        END IF;
    ELSIF v_has_active_lease THEN
        v_pin_valid := TRUE;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'PIN_REQUIRED', 'message', 'Sicherheitsnachweis: Bitte persönliche PIN eingeben.');
    END IF;

    -- HMAC für Vault-Abfrage berechnen
    v_hmac := encode(
        extensions.hmac(
            v_target_student.id::text || ':' || v_target_student.school_id::text,
            public.get_encryption_key(),
            'sha256'
        ),
        'hex'
    );

    -- Aus Vault abrufen
    SELECT encrypted_lastname INTO v_enc_bytes
    FROM private_auth.blind_student_lastname_vault
    WHERE blind_link_hmac = v_hmac;

    IF v_enc_bytes IS NOT NULL THEN
        v_decrypted_last := public.safe_pgp_sym_decrypt(v_enc_bytes, public.get_encryption_key());
    ELSE
        v_decrypted_last := '';
    END IF;

    -- Audit Log (revisionssicher) mit validem record_id
    INSERT INTO public.audit_logs (
        school_id, table_name, operation, action, record_id, changed_by, user_id, details
    ) VALUES (
        v_target_student.school_id,
        'blind_student_lastname_vault',
        'REVEAL_STUDENT_FULL_NAME',
        'REVEAL_STUDENT_FULL_NAME',
        v_target_student.id,
        v_caller_id,
        v_caller_id,
        jsonb_build_object(
            'student_id', v_target_student.id,
            'caller_role', v_caller_role,
            'is_school_admin', v_is_school_admin,
            'timestamp', clock_timestamp()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'student_id', v_target_student.id,
        'first_name', v_target_student.first_name,
        'last_name', v_decrypted_last,
        'full_name', TRIM(v_target_student.first_name || ' ' || COALESCE(v_decrypted_last, ''))
    );
END;
$$;

REVOKE ALL ON FUNCTION public.reveal_student_full_name(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reveal_student_full_name(UUID, TEXT) TO authenticated, service_role;

COMMIT;
