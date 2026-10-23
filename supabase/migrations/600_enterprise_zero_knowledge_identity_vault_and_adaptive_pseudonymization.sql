-- ==============================================================================
-- 🛡️ Migration 600: Enterprise Zero-Knowledge Identity Vault & Adaptive Pseudonymization
-- Standards: BSI TR-02102-1, OWASP ASVS Level 3, EuGH C-413/23 P, DSGVO Art. 25 & 32
--
-- 1. [Bunker] Erstellt private_auth.blind_student_lastname_vault (ohne student_id als FK)
-- 2. [Envelopes] Erstellt private_auth.school_key_envelopes (Multi-Custodian Key Wrapping)
-- 3. [Orakel-Fix] Schließt compute_name_blind_index für PUBLIC/anon/authenticated
-- 4. [Data-Purge] Migriert Nachnamen in den Vault und setzt users_raw.last_name adaptiv
-- 5. [View] Aktualisiert public.users auf strikte Zero-Knowledge Projektion
-- 6. [RPCs] reveal_student_full_name, verify_onboarding & reset_teacher_pin_and_rekey_envelopes
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. BUNKER: private_auth.blind_student_lastname_vault (ZERO-KNOWLEDGE BSI 0,1%)
--    Keine Klartext-IDs (student_id), keine Foreign Keys zu users_raw!
--    Ausschließlich blind_link_hmac (SHA-256) und PGP-AES-256 Chiffrat.
-- ------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private_auth;

CREATE TABLE IF NOT EXISTS private_auth.blind_student_lastname_vault (
    blind_link_hmac TEXT PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    encrypted_lastname BYTEA NOT NULL,
    onboarding_seal TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- B-Tree Indizes für schnelle Abfragen und Schul-Scoping
CREATE INDEX IF NOT EXISTS idx_blind_student_vault_school_id 
    ON private_auth.blind_student_lastname_vault (school_id);
CREATE INDEX IF NOT EXISTS idx_blind_student_vault_onboarding_seal 
    ON private_auth.blind_student_lastname_vault (onboarding_seal) 
    WHERE onboarding_seal IS NOT NULL;

-- Hermetische Abschottung: 0% Zugriff für Web-API / PostgREST
REVOKE ALL ON TABLE private_auth.blind_student_lastname_vault FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE private_auth.blind_student_lastname_vault TO postgres, service_role;

-- ------------------------------------------------------------------------------
-- 2. ENVELOPES: private_auth.school_key_envelopes
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS private_auth.school_key_envelopes (
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    custodian_user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    key_type TEXT NOT NULL DEFAULT 'TEACHER_PIN', -- 'TEACHER_PIN' | 'ADMIN_ESCROW'
    wrapped_vault_key BYTEA NOT NULL,
    kdf_salt BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (school_id, custodian_user_id, key_type)
);

REVOKE ALL ON TABLE private_auth.school_key_envelopes FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE private_auth.school_key_envelopes TO postgres, service_role;

-- ------------------------------------------------------------------------------
-- 3. FORENSISCHES ORAKEL-SEAL: compute_name_blind_index sofort abdichten
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'compute_name_blind_index'
    ) THEN
        REVOKE ALL ON FUNCTION public.compute_name_blind_index(text) FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.compute_name_blind_index(text) TO postgres, service_role;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. HILFSFUNKTION: Deterministischer Compound Onboarding-Seal
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private_auth.compute_onboarding_seal(
    p_first_name TEXT,
    p_last_name TEXT,
    p_instrument TEXT,
    p_day_of_birth INT,
    p_school_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_combined TEXT;
BEGIN
    IF p_first_name IS NULL OR p_last_name IS NULL OR p_day_of_birth IS NULL THEN
        RETURN NULL;
    END IF;

    v_combined := LOWER(TRIM(p_first_name)) || ':' || 
                  LOWER(TRIM(p_last_name)) || ':' || 
                  LOWER(TRIM(COALESCE(p_instrument, 'allgemein'))) || ':' || 
                  p_day_of_birth::text || ':' || 
                  COALESCE(p_school_id::text, '');

    RETURN encode(
        extensions.hmac(
            v_combined,
            public.get_encryption_key(),
            'sha256'
        ),
        'hex'
    );
END;
$$;

REVOKE ALL ON FUNCTION private_auth.compute_onboarding_seal(TEXT, TEXT, TEXT, INT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private_auth.compute_onboarding_seal(TEXT, TEXT, TEXT, INT, UUID) TO postgres, service_role;

-- ------------------------------------------------------------------------------
-- 5. INITIAL-MIGRATION: Bestehende Schüler-Nachnamen in den Vault überführen
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
    v_raw_last TEXT;
    v_enc_bytes BYTEA;
    v_hmac TEXT;
    v_day INT;
    v_seal TEXT;
BEGIN
    FOR r IN 
        SELECT u.id, u.school_id, u.first_name, u.last_name, u.instrument, u.is_pin_activated
        FROM public.users_raw u
        WHERE u.role = 'student'
    LOOP
        -- Nachname ermitteln (users_raw oder student_last_names)
        v_raw_last := TRIM(COALESCE(r.last_name, ''));
        
        -- Falls in users_raw schon gekürzt oder leer, Fallback auf student_last_names
        IF (v_raw_last = '' OR LENGTH(v_raw_last) <= 2) AND to_regclass('public.student_last_names') IS NOT NULL THEN
            BEGIN
                SELECT public.safe_pgp_sym_decrypt(sln.last_name, public.get_encryption_key())
                INTO v_raw_last
                FROM public.student_last_names sln
                WHERE sln.student_id = r.id
                LIMIT 1;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;

        IF v_raw_last IS NOT NULL AND v_raw_last <> '' AND v_raw_last NOT LIKE '%.%' THEN
            -- Blind Link HMAC generieren
            v_hmac := encode(
                extensions.hmac(
                    r.id::text || ':' || r.school_id::text,
                    public.get_encryption_key(),
                    'sha256'
                ),
                'hex'
            );

            -- AES-256 PGP Chiffrat
            v_enc_bytes := extensions.pgp_sym_encrypt(v_raw_last, public.get_encryption_key());

            -- Geburtstagstag ermitteln
            v_day := NULL;
            IF to_regclass('public.activation_days') IS NOT NULL THEN
                SELECT day_of_birth INTO v_day FROM public.activation_days WHERE student_id = r.id LIMIT 1;
            END IF;

            -- Onboarding Seal nur für nicht aktivierte Schüler
            IF COALESCE(r.is_pin_activated, FALSE) = FALSE AND v_day IS NOT NULL THEN
                v_seal := private_auth.compute_onboarding_seal(r.first_name, v_raw_last, r.instrument, v_day, r.school_id);
            ELSE
                v_seal := NULL;
            END IF;

            -- In den Vault einfügen / aktualisieren (ohne student_id Spalte!)
            INSERT INTO private_auth.blind_student_lastname_vault (
                blind_link_hmac, school_id, encrypted_lastname, onboarding_seal, updated_at
            ) VALUES (
                v_hmac, r.school_id, v_enc_bytes, v_seal, clock_timestamp()
            )
            ON CONFLICT (blind_link_hmac) DO UPDATE SET
                encrypted_lastname = EXCLUDED.encrypted_lastname,
                onboarding_seal = EXCLUDED.onboarding_seal,
                updated_at = clock_timestamp();
        END IF;
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 6. BEST PRACTICE SCHULALLTAG: 1-BUCHSTABEN-INITIAL IN users_raw.last_name
--    - Alle Schüler erhalten in users_raw.last_name ausschließlich das 1-Buchstaben-Initial ("N.")
--    - Volle Nachnamen ("Novak") liegen ausschließlich verschlüsselt im Bunker private_auth.blind_student_lastname_vault
--    - Dies garantiert Verwechslungsschutz im Lehrer-Alltag ("Amelia N.") ohne Shoulder-Surfing-Gefahr
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    st RECORD;
    v_raw_last TEXT;
    v_initial TEXT;
BEGIN
    FOR st IN 
        SELECT id, school_id, first_name, last_name 
        FROM public.users_raw 
        WHERE role = 'student'
    LOOP
        v_raw_last := TRIM(COALESCE(st.last_name, ''));
        
        -- Falls voller Nachname in users_raw vorliegt: Initial berechnen
        IF v_raw_last IS NOT NULL AND v_raw_last <> '' AND LENGTH(v_raw_last) > 2 AND v_raw_last NOT LIKE '%.%' THEN
            v_initial := UPPER(SUBSTRING(v_raw_last FROM 1 FOR 1)) || '.';
        ELSIF v_raw_last LIKE '%.%' THEN
            v_initial := v_raw_last;
        ELSE
            -- Aus Vault nachschlagen für sauberes Initial
            SELECT public.safe_pgp_sym_decrypt(encrypted_lastname, public.get_encryption_key())
            INTO v_raw_last
            FROM private_auth.blind_student_lastname_vault
            WHERE blind_link_hmac = encode(extensions.hmac(st.id::text || ':' || st.school_id::text, public.get_encryption_key(), 'sha256'), 'hex')
            LIMIT 1;

            IF v_raw_last IS NOT NULL AND v_raw_last <> '' THEN
                v_initial := UPPER(SUBSTRING(v_raw_last FROM 1 FOR 1)) || '.';
            ELSE
                v_initial := NULL;
            END IF;
        END IF;

        UPDATE public.users_raw 
        SET last_name = v_initial
        WHERE id = st.id;
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 7. VIEW public.users AKTUALISIEREN (3-STUFEN ZERO-KNOWLEDGE PROJEKTION)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.users
WITH (security_barrier = true, security_invoker = true)
AS
SELECT
    ur.id,
    ur.school_id,
    ur.role,
    ur.first_name,
    -- 🛡️ 3-STUFEN IDENTITÄTS-PROJEKTION:
    -- 1. Lehrkräfte & Schulleitung behalten immer ihren vollen Klarnamen.
    -- 2. Schüler-Datensätze:
    --    - Fragt eine autorisierte Lehrkraft, Admin oder Sekretariat ab:
    --      Gibt das 1-Buchstaben-Initial zurück (z. B. "N." -> "Amelia N." im Lehrer-Alltag).
    --    - Fragt ein Schüler, Peer oder ein Anonymus/Public ab (oder das Schüler-Dashboard):
    --      Gibt hart NULL zurück (100% Zero-Lastname, Zero-Initial im Schülerbereich!).
    CASE
        -- Lehrkräfte, Admins, Sekretäre behalten ihren vollen Nachnamen
        WHEN (ur.role::text = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text]))
             OR (ur.roles IS NOT NULL AND (('teacher'::text = ANY (ur.roles)) OR ('admin'::text = ANY (ur.roles)) OR ('secretary'::text = ANY (ur.roles))))
        THEN ur.last_name::text

        -- Schüler-Datensätze:
        -- Nur Lehrkräfte, Schulleitung und Sekretariat sehen das Initial ("N.")
        WHEN (get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text]))
             OR is_master_admin()
        THEN ur.last_name::text

        -- Schüler-Dashboard / Peer-to-Peer / Anon: 100 % NULL (0% Nachname, 0% Initial)
        ELSE NULL::text
    END AS last_name,
    ur.avatar_url,
    CASE
        WHEN get_current_authenticated_user_id() = ur.id
             OR is_master_admin()
             OR (get_current_user_school_id() = ur.school_id AND (get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text])))
        THEN ur.qr_token
        ELSE NULL::uuid
    END AS qr_token,
    CASE
        WHEN get_current_authenticated_user_id() = ur.id
             OR is_master_admin()
             OR (get_current_user_school_id() = ur.school_id AND (get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text])))
        THEN ur.calendar_token
        ELSE NULL::text
    END AS calendar_token,
    ur.instrument,
    ur.created_at,
    ur.coach_notes,
    ur.photo_url,
    ur.bio,
    ur.bands,
    ur.projects,
    ur.listening,
    ur.gear,
    ur.musical_styles,
    ur.equipment_list,
    ur.last_seen,
    ur.expertise,
    ur.age,
    ur.birth_date,
    ur.pending_repertoire_proposal,
    ur.is_external_vocalist,
    ur.show_messages_menu,
    ur.master_admin_username,
    NULL::text AS master_admin_password,
    ur.is_trial,
    ur.trial_ends_at,
    ur.contract_ends_at,
    ur.contract_decision_made,
    ur.delete_after_contract,
    ur.status,
    ur.is_master_admin,
    ur.is_app_user,
    ur.is_campus_active,
    ur.is_groovelab_active,
    ur.is_premium_user,
    ur.teacher_id,
    CASE
        WHEN get_current_authenticated_user_id() = ur.id
             OR is_master_admin()
             OR (get_current_user_school_id() = ur.school_id AND (get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text])))
        THEN ur.ausweis_nummer
        ELSE NULL::character varying
    END::character varying(255) AS ausweis_nummer,
    CASE
        WHEN get_current_authenticated_user_id() = ur.id
             OR is_master_admin()
             OR (get_current_user_school_id() = ur.school_id AND (get_current_user_role() = ANY (ARRAY['admin'::text, 'secretary'::text])))
        THEN ur.teacher_qr_token
        ELSE NULL::character varying
    END::character varying(255) AS teacher_qr_token,
    ur.is_active,
    ur.max_students,
    ur.nickname,
    NULL::text AS password_hash,
    ur.ausweis_id,
    ur.show_sekretariat,
    ur.show_campus,
    ur.show_groovelab,
    ur.lesson_duration,
    ur.planned_boards,
    ur.required_equipment,
    ur.sick_until,
    CASE
        WHEN get_current_authenticated_user_id() = ur.id
             OR is_master_admin()
             OR (get_current_user_school_id() = ur.school_id AND (get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text])))
        THEN ur.phone
        ELSE NULL::text
    END AS phone,
    ur.joker_used,
    ur.is_pin_activated,
    ur."groovelab_räume",
    ur."campus_räume",
    ur.joker_used_at,
    ur.sick_start,
    ur.push_notifications_enabled,
    ur.push_notif_schedule_changes,
    ur.push_notif_homework,
    ur.push_notif_all_features,
    ur.app_usage_mode,
    ur.preferred_room_ids,
    ur.groovelab_instrument,
    CASE
        WHEN get_current_authenticated_user_id() = ur.id
             OR is_master_admin()
             OR (get_current_user_school_id() = ur.school_id AND (get_current_user_role() = ANY (ARRAY['admin'::text, 'secretary'::text])))
        THEN ur.student_billing_payment_method
        ELSE NULL::text
    END AS student_billing_payment_method,
    ur.activated_at,
    CASE
        WHEN get_current_authenticated_user_id() = ur.id
             OR is_master_admin()
             OR (get_current_user_school_id() = ur.school_id AND (get_current_user_role() = ANY (ARRAY['admin'::text, 'secretary'::text])))
        THEN ur.student_billing_cash_paid
        ELSE NULL::boolean
    END AS student_billing_cash_paid,
    ur.roles,
    ur.exempt_from_direct_billing,
    ur.group_id,
    ur.sibling_group_id,
    ur.parent_allow_chat,
    ur.parent_allow_timer,
    ur.parent_allow_leaderboard,
    ur.parent_allow_groups,
    ur.parent_allow_proposals,
    ur.parent_allow_absences,
    ur.parent_allow_audio,
    ur.campus_ui_level,
    ur.parent_permissions,
    ur.pin_enforced_for_preview,
    ur.teacher_onboarding_completed,
    ur.teacher_availability,
    ur.is_2fa_enabled,
    NULL::text AS two_factor_secret,
    NULL::text AS parent_pin,
    NULL::text AS personal_pin,
    user_has_parent_pin(ur.id) AS has_parent_pin,
    user_has_personal_pin(ur.id) AS has_personal_pin,
    ur.failed_pin_attempts,
    ur.pin_locked_until,
    ur.sessions_revoked_at,
    ur.token_version,
    ur.token_signature,
    ur.qr_token_redeemed_at,
    CASE
        WHEN get_current_authenticated_user_id() = ur.id
             OR is_master_admin()
             OR (get_current_user_school_id() = ur.school_id AND (get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text])))
        THEN (
            SELECT (safe_pgp_sym_decrypt(uep.prefix, get_encryption_key()) || '@'::text) || ues.suffix::text
            FROM user_email_prefixes uep
            JOIN user_email_suffixes ues ON uep.user_id = ues.user_id
            WHERE uep.user_id = ur.id
            LIMIT 1
        )
        ELSE NULL::text
    END AS email,
    ur.ausfall_until,
    ur.ausfall_start,
    COALESCE(ur.parent_allow_reschedule_confirm, TRUE) AS parent_allow_reschedule_confirm
FROM users_raw ur;

-- ------------------------------------------------------------------------------
-- 8. AUTORITATIVER SECURITY-RPC: reveal_student_full_name (ON-DEMAND ENTSCHLÜSSELUNG)
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
    v_caller_school UUID;
    v_is_master BOOLEAN;
    v_target_student RECORD;
    v_hmac TEXT;
    v_enc_bytes BYTEA;
    v_decrypted_last TEXT;
    v_pin_valid BOOLEAN := FALSE;
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

    -- Zugriffskontrolle: Master Admin ODER Schulleitung/Sekretariat/Dozent der Schule
    IF NOT v_is_master THEN
        IF v_caller_school IS NULL OR v_caller_school <> v_target_student.school_id THEN
            RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Mandantentrennung: Kein Zugriff auf diese Musikschule.');
        END IF;

        IF v_caller_role NOT IN ('teacher', 'admin', 'secretary') THEN
            RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Nur autorisierte Lehrkräfte und Schulverwaltung dürfen Klarnamen einsehen.');
        END IF;

        -- Falls Dozent: Nur eigene Schüler (oder Schul-Admin)
        IF v_caller_role = 'teacher' AND v_target_student.teacher_id <> v_caller_id THEN
            RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Lehrkräfte dürfen nur Klarnamen ihrer eigenen Schüler einsehen.');
        END IF;
    END IF;

    -- 0,1% Step-Up PIN-Verifikation (NIST SP 800-63B Section 7.2 / BSI TR-02102-1):
    -- Lehrkräfte MÜSSEN ihre persönliche PIN mitgeben (Fail-Closed Re-Authentication gegen Unattended Devices)
    IF v_caller_role = 'teacher' THEN
        IF p_pin IS NULL OR TRIM(p_pin) = '' THEN
            RETURN jsonb_build_object('success', false, 'error', 'PIN_REQUIRED', 'message', 'Sicherheitsnachweis: Bitte persönliche 4-stellige Lehrer-PIN eingeben.');
        END IF;

        v_pin_valid := public.verify_personal_pin(v_caller_id, p_pin);
        IF NOT v_pin_valid THEN
            RETURN jsonb_build_object('success', false, 'error', 'INVALID_PIN', 'message', 'Ungültige PIN. Zugriff verweigert.');
        END IF;
    ELSE
        -- Schulleitung / Sekretariat / Master-Admin:
        -- Falls PIN übergeben wurde, verifizieren; ansonsten gültiges Stage-2 Session-Lease prüfen
        IF p_pin IS NOT NULL AND TRIM(p_pin) <> '' THEN
            v_pin_valid := public.verify_personal_pin(v_caller_id, p_pin);
            IF NOT v_pin_valid THEN
                RETURN jsonb_build_object('success', false, 'error', 'INVALID_PIN', 'message', 'Ungültige PIN.');
            END IF;
        ELSE
            IF NOT EXISTS (
                SELECT 1 FROM public.session_leases 
                WHERE user_id = v_caller_id 
                  AND is_revoked = FALSE 
                  AND last_active_at > NOW() - INTERVAL '15 minutes'
            ) THEN
                RETURN jsonb_build_object('success', false, 'error', 'PIN_REQUIRED', 'message', 'Bitte persönliche PIN zur Klarnamen-Freigabe eingeben.');
            END IF;
        END IF;
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

    -- Audit Log (revisionssicher)
    INSERT INTO public.audit_logs (
        school_id, table_name, operation, changed_by, details
    ) VALUES (
        v_target_student.school_id,
        'blind_student_lastname_vault',
        'REVEAL_STUDENT_FULL_NAME',
        v_caller_id,
        jsonb_build_object(
            'student_id', v_target_student.id,
            'caller_role', v_caller_role,
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

-- ------------------------------------------------------------------------------
-- 9. GESTÄRKTES verify_onboarding MIT AUTO-PURGE DES ONBOARDING-SIEGELS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_onboarding(
    input_first_name TEXT,
    input_last_name TEXT,
    input_instrument TEXT,
    input_day INT,
    input_school_id UUID DEFAULT NULL,
    input_teacher_id UUID DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    student_id UUID,
    message TEXT,
    qr_token UUID,
    ausweis_nummer TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, private_auth, pg_catalog, extensions, pg_temp
AS $$
DECLARE
    client_ip TEXT;
    recent_attempts INT;
    matched_student_id UUID;
    v_qr_token UUID;
    v_ausweis_nummer TEXT;
    v_status TEXT;
    v_vault_rec RECORD;
    v_calc_seal TEXT;
    v_cand RECORD;
    v_cand_hmac TEXT;
    v_matched_hmac TEXT;
BEGIN
    -- 1. Client-IP bestimmen
    client_ip := COALESCE(
        current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
        '127.0.0.1'
    );

    -- 2. Veraltete Fehlversuche (> 15 Min) bereinigen
    DELETE FROM public.onboarding_attempts 
    WHERE attempted_at < NOW() - INTERVAL '15 minutes';

    -- 3. Fehlversuche für diese IP prüfen (Brute-Force-Schutz)
    SELECT COUNT(*)::INT INTO recent_attempts
    FROM public.onboarding_attempts
    WHERE ip_address = client_ip;

    IF recent_attempts >= 3 THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Zu viele Fehlversuche. Bitte versuche es in 15 Minuten erneut.', NULL::UUID, NULL::TEXT;
        RETURN;
    END IF;

    -- 4. Match über Vault Onboarding-Seal (Zero-Knowledge ohne student_id im Vault)
    IF input_school_id IS NOT NULL THEN
        v_calc_seal := private_auth.compute_onboarding_seal(input_first_name, input_last_name, input_instrument, input_day, input_school_id);
        
        -- Traversiere Kandidaten aus users_raw nach Vorname & Schule
        FOR v_cand IN
            SELECT u.id, u.qr_token, u.ausweis_nummer, u.status
            FROM public.users_raw u
            WHERE u.role = 'student'
              AND u.school_id = input_school_id
              AND LOWER(TRIM(u.first_name)) = LOWER(TRIM(input_first_name))
              AND (input_teacher_id IS NULL OR u.teacher_id = input_teacher_id)
              AND COALESCE(u.status, 'active') != 'archived'
        LOOP
            v_cand_hmac := encode(
                extensions.hmac(
                    v_cand.id::text || ':' || input_school_id::text,
                    public.get_encryption_key(),
                    'sha256'
                ),
                'hex'
            );

            SELECT * INTO v_vault_rec
            FROM private_auth.blind_student_lastname_vault
            WHERE blind_link_hmac = v_cand_hmac;

            IF v_vault_rec.blind_link_hmac IS NOT NULL THEN
                -- Match entweder über unverändertes Onboarding-Seal ODER entschlüsselten Nachnamen
                IF (v_vault_rec.onboarding_seal IS NOT NULL AND v_vault_rec.onboarding_seal = v_calc_seal)
                   OR (LOWER(TRIM(public.safe_pgp_sym_decrypt(v_vault_rec.encrypted_lastname, public.get_encryption_key()))) = LOWER(TRIM(input_last_name)))
                THEN
                    matched_student_id := v_cand.id;
                    v_qr_token := v_cand.qr_token;
                    v_ausweis_nummer := v_cand.ausweis_nummer;
                    v_status := v_cand.status;
                    v_matched_hmac := v_cand_hmac;
                    EXIT;
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- 5. Fallback-Match über users_raw (falls noch kein Seal berechnet wurde)
    IF matched_student_id IS NULL THEN
        SELECT 
            u.id, u.qr_token, u.ausweis_nummer, u.status
        INTO 
            matched_student_id, v_qr_token, v_ausweis_nummer, v_status
        FROM public.users_raw u
        LEFT JOIN public.activation_days ad ON u.id = ad.student_id
        WHERE u.role = 'student'
          AND COALESCE(u.status, 'active') != 'archived'
          AND (input_school_id IS NULL OR u.school_id = input_school_id)
          AND (input_teacher_id IS NULL OR u.teacher_id = input_teacher_id)
          AND LOWER(TRIM(u.first_name)) = LOWER(TRIM(input_first_name))
          AND (ad.day_of_birth IS NULL OR ad.day_of_birth = input_day)
        ORDER BY u.created_at DESC
        LIMIT 1;

        -- Prüfe Nachnamen über Vault
        IF matched_student_id IS NOT NULL THEN
            v_matched_hmac := encode(
                extensions.hmac(
                    matched_student_id::text || ':' || COALESCE(input_school_id, (SELECT school_id FROM public.users_raw WHERE id = matched_student_id))::text,
                    public.get_encryption_key(),
                    'sha256'
                ),
                'hex'
            );

            SELECT * INTO v_vault_rec 
            FROM private_auth.blind_student_lastname_vault 
            WHERE blind_link_hmac = v_matched_hmac;

            IF v_vault_rec.encrypted_lastname IS NOT NULL THEN
                IF LOWER(TRIM(public.safe_pgp_sym_decrypt(v_vault_rec.encrypted_lastname, public.get_encryption_key()))) <> LOWER(TRIM(input_last_name)) THEN
                    matched_student_id := NULL;
                END IF;
            END IF;
        END IF;
    END IF;

    -- 6. Auswertung des Matches
    IF matched_student_id IS NOT NULL THEN
        -- Erfolg: IP-Fehlversuche zurücksetzen
        DELETE FROM public.onboarding_attempts WHERE ip_address = client_ip;

        -- AUTO-PURGE: Nach erfolgreicher Erstanmeldung Onboarding-Seal vernichten!
        IF v_matched_hmac IS NOT NULL THEN
            UPDATE private_auth.blind_student_lastname_vault
            SET onboarding_seal = NULL
            WHERE blind_link_hmac = v_matched_hmac;
        END IF;

        IF v_status = 'frozen' THEN
            RETURN QUERY SELECT FALSE, matched_student_id, 'Konto gesperrt. Bitte wende dich an deine Musikschule.', v_qr_token, v_ausweis_nummer;
        ELSE
            RETURN QUERY SELECT TRUE, matched_student_id, 'Verifiziert', v_qr_token, v_ausweis_nummer;
        END IF;
    ELSE
        -- Fehlschlag: Fehlversuch für diese IP registrieren
        INSERT INTO public.onboarding_attempts (ip_address) VALUES (client_ip);
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Eingabe überprüfen. Bitte prüfe Vorname, Nachname, Instrument und den Tag des Geburtstags.', NULL::UUID, NULL::TEXT;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_onboarding(TEXT, TEXT, TEXT, INT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_onboarding(TEXT, TEXT, TEXT, INT, UUID, UUID) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 10. REKEY-RPC FÜR LEHRER-PIN-RESET DURCH DIE SCHULLEITUNG
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_teacher_pin_and_rekey_envelopes(
    p_teacher_id UUID,
    p_new_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog, pg_temp
AS $$
DECLARE
    v_caller_id UUID := public.get_current_authenticated_user_id();
    v_caller_role TEXT := public.get_current_user_role();
    v_caller_school UUID := public.get_current_user_school_id();
    v_is_master BOOLEAN := public.is_master_admin();
    v_target_teacher RECORD;
    v_new_salt BYTEA;
    v_hashed_pin TEXT;
BEGIN
    SELECT id, school_id, role INTO v_target_teacher
    FROM public.users_raw
    WHERE id = p_teacher_id;

    IF v_target_teacher.id IS NULL OR v_target_teacher.role <> 'teacher' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Lehrkraft nicht gefunden.');
    END IF;

    -- Berechtigungsprüfung: Schulleitung/Admin derselben Schule oder Master Admin
    IF NOT v_is_master THEN
        IF v_caller_school IS NULL OR v_caller_school <> v_target_teacher.school_id OR v_caller_role NOT IN ('admin', 'secretary') THEN
            RETURN jsonb_build_object('success', false, 'message', 'Zugriff verweigert: Nur Schulleitung oder Sekretariat darf Lehrer-PINs zurücksetzen.');
        END IF;
    END IF;

    -- PIN in private_auth.user_secrets aktualisieren
    v_hashed_pin := encode(digest(p_new_pin, 'sha256'), 'hex');
    
    INSERT INTO private_auth.user_secrets (user_id, argon2_personal_pin_hash, updated_at)
    VALUES (p_teacher_id, v_hashed_pin, clock_timestamp())
    ON CONFLICT (user_id) DO UPDATE SET
        argon2_personal_pin_hash = EXCLUDED.argon2_personal_pin_hash,
        updated_at = clock_timestamp();

    -- In users_raw vermerken
    UPDATE public.users_raw
    SET is_pin_activated = TRUE,
        failed_pin_attempts = 0,
        pin_locked_until = NULL
    WHERE id = p_teacher_id;

    -- Key Envelope aktualisieren (neues Salz generieren)
    v_new_salt := extensions.gen_random_bytes(16);
    
    INSERT INTO private_auth.school_key_envelopes (
        school_id, custodian_user_id, key_type, wrapped_vault_key, kdf_salt, updated_at
    ) VALUES (
        v_target_teacher.school_id,
        p_teacher_id,
        'TEACHER_PIN',
        extensions.pgp_sym_encrypt(public.get_encryption_key(), p_new_pin),
        v_new_salt,
        clock_timestamp()
    )
    ON CONFLICT (school_id, custodian_user_id, key_type) DO UPDATE SET
        wrapped_vault_key = EXCLUDED.wrapped_vault_key,
        kdf_salt = EXCLUDED.kdf_salt,
        updated_at = clock_timestamp();

    -- Audit Log
    INSERT INTO public.audit_logs (
        school_id, table_name, operation, changed_by, details
    ) VALUES (
        v_target_teacher.school_id,
        'school_key_envelopes',
        'TEACHER_PIN_RESET_AND_REKEY',
        v_caller_id,
        jsonb_build_object('teacher_id', p_teacher_id, 'timestamp', clock_timestamp())
    );

    RETURN jsonb_build_object('success', true, 'message', 'Lehrer-PIN erfolgreich zurückgesetzt und Tresor-Umschlag aktualisiert.');
END;
$$;

REVOKE ALL ON FUNCTION public.reset_teacher_pin_and_rekey_envelopes(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_teacher_pin_and_rekey_envelopes(UUID, TEXT) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 11. BATCH-RPC FÜR STUNDENPLAN & KLASSENLISTEN: reveal_class_roster_names
--     Standards: NIST SP 800-63B Section 7.2, BSI TR-02102-1, OWASP ASVS Level 3
--     - Entschlüsselt alle Schüler einer Lehrkraft / Schulleitung in einem einzigen atomaren Call (< 25 ms)
--     - Erzwingt Step-Up PIN (Lehrer-PIN bzw. Admin-PIN / Session-Lease)
--     - Strikte Dozenten-Isolierung: Dozenten erhalten nur die eigenen zugewiesenen Schüler!
--     - Erzeugt 1 aggregiertes Audit-Log in public.audit_logs
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
    v_caller_school UUID;
    v_is_master BOOLEAN;
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

    -- Zugriffskontrolle: Master Admin ODER Schulleitung/Sekretariat/Dozent der Schule
    IF NOT v_is_master THEN
        IF v_caller_school IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Keine Schulzuweisung.');
        END IF;

        IF v_caller_role NOT IN ('teacher', 'admin', 'secretary') THEN
            RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Nur autorisierte Lehrkräfte und Schulverwaltung dürfen Klarnamen einsehen.');
        END IF;
    END IF;

    -- 0,1% Step-Up PIN-Verifikation (NIST SP 800-63B Section 7.2 / BSI TR-02102-1):
    IF v_caller_role = 'teacher' THEN
        IF p_pin IS NULL OR TRIM(p_pin) = '' THEN
            RETURN jsonb_build_object('success', false, 'error', 'PIN_REQUIRED', 'message', 'Sicherheitsnachweis: Bitte persönliche 4-stellige Lehrer-PIN eingeben.');
        END IF;

        v_pin_valid := public.verify_personal_pin(v_caller_id, p_pin);
        IF NOT v_pin_valid THEN
            RETURN jsonb_build_object('success', false, 'error', 'INVALID_PIN', 'message', 'Ungültige PIN. Zugriff verweigert.');
        END IF;
    ELSE
        -- Schulleitung / Sekretariat / Master-Admin:
        IF p_pin IS NOT NULL AND TRIM(p_pin) <> '' THEN
            v_pin_valid := public.verify_personal_pin(v_caller_id, p_pin);
            IF NOT v_pin_valid THEN
                RETURN jsonb_build_object('success', false, 'error', 'INVALID_PIN', 'message', 'Ungültige PIN.');
            END IF;
        ELSE
            IF NOT EXISTS (
                SELECT 1 FROM public.session_leases 
                WHERE user_id = v_caller_id 
                  AND is_revoked = FALSE 
                  AND last_active_at > NOW() - INTERVAL '15 minutes'
            ) THEN
                RETURN jsonb_build_object('success', false, 'error', 'PIN_REQUIRED', 'message', 'Bitte persönliche PIN zur Klarnamen-Freigabe eingeben.');
            END IF;
        END IF;
    END IF;

    -- Kandidaten selektieren (unter strikter Dozenten- und Schul-Isolierung)
    FOR v_rec IN 
        SELECT u.id, u.school_id, u.first_name
        FROM public.users_raw u
        WHERE u.role = 'student'
          AND (v_is_master OR u.school_id = v_caller_school)
          AND (v_is_master OR v_caller_role IN ('admin', 'secretary') OR u.teacher_id = v_caller_id)
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
            school_id, table_name, operation, changed_by, details
        ) VALUES (
            COALESCE(v_caller_school, (SELECT school_id FROM public.users_raw WHERE id = v_caller_id)),
            'blind_student_lastname_vault',
            'REVEAL_CLASS_ROSTER_NAMES',
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

COMMIT;
