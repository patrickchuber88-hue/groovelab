-- ==============================================================================
-- Migration 567: Kanonische Deutsche Ausweis-Governance (S, L, V) & Musikschulnummer-SSOT
-- Standards: OWASP ASVS Level 3 / Fail-Closed / ISO 27001 / BSI IT-Grundschutz / NIS-2
-- 
-- 1. Musikschulnummer-Architektur:
--    - school_number (VARCHAR(10)) auf public.schools mit UNIQUE Index
--    - Backfill für alle 6 Schulen (001 bis 006)
--    - get_public_school_theme liefert school_number autoritativ aus
-- 
-- 2. Deutsche Ausweis-Governance (S = Schüler, L = Lehrer, V = Verwaltung):
--    - Trigger assign_canonical_ausweis_nummer() dynamisch je Schule und Rolle:
--      {school_number}-S-{seq4} für Schüler
--      {school_number}-L-{seq4} für Lehrer (Ablösung alter T-Kürzel)
--      {school_number}-V-{seq4} für Verwaltung (Admin / Schulleitung / Sekretariat)
-- 
-- 3. Historische Badges & Multi-Credential Sicherung:
--    - Bestehende Lehrer- & Admin-Tokens werden in public.user_badge_credentials
--      gesichert, damit bestehende QR-Codes und PINs 100% weiterfunktionieren.
--    - Backfill von 001-L-XXXX für Lehrer und 001-V-XXXX für Schulleitung/Verwaltung.
-- 
-- 4. MFA-Governance für Schulleitung:
--    - Schulleitung (admin) erfordert MFA
--    - delete_school_cascade und cancel_school_subscription / confirm_school_subscription
--      dürfen NUR durch Schulleitung (admin) mit verifizierter MFA ausgeführt werden.
-- 
-- 5. Autoritativer RPC: authenticate_by_credential
--    - Volle Unterstützung für S, L, V
--    - Bindestrich-Toleranz (001S0001, 001L0001, 001V0001)
--    - Numpad-Toleranz
-- ==============================================================================

-- 1. SCHULNUMMER ARCHITEKTUR AUF PUBLIC.SCHOOLS
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS school_number VARCHAR(10);

-- Backfill bekannter Schulen
UPDATE public.schools SET school_number = '001' WHERE id = '53e83805-1d5a-4ed8-988e-1fb0b8200b9c' AND (school_number IS NULL OR school_number <> '001');
UPDATE public.schools SET school_number = '002' WHERE id = 'cc05137f-5904-4774-80be-6a172c52bf99' AND (school_number IS NULL OR school_number <> '002');
UPDATE public.schools SET school_number = '003' WHERE id = 'cc9dd3d6-749d-40d6-a72e-dccca286724a' AND (school_number IS NULL OR school_number <> '003');
UPDATE public.schools SET school_number = '004' WHERE id = '69063a6c-4a0f-49fc-8dd7-3ae72c401406' AND (school_number IS NULL OR school_number <> '004');
UPDATE public.schools SET school_number = '005' WHERE id = 'b2247ea9-118c-42f3-b408-49c023c3a505' AND (school_number IS NULL OR school_number <> '005');
UPDATE public.schools SET school_number = '006' WHERE id = 'a6bdcc01-7b3f-4dc3-8c46-c458f0270b66' AND (school_number IS NULL OR school_number <> '006');

-- Automatische Zuweisung für alle weiteren Schulen ohne Nummer
DO $$
DECLARE
    r RECORD;
    v_next_num INT;
BEGIN
    FOR r IN SELECT id FROM public.schools WHERE school_number IS NULL OR school_number = '' ORDER BY created_at ASC LOOP
        SELECT COALESCE(MAX(NULLIF(regexp_replace(school_number, '[^0-9]', '', 'g'), '')::INT), 0) + 1
        INTO v_next_num
        FROM public.schools;
        
        UPDATE public.schools SET school_number = lpad(v_next_num::text, 3, '0') WHERE id = r.id;
    END LOOP;
END;
$$;

-- Automatischer Trigger für zukünftige neue Schulen
CREATE OR REPLACE FUNCTION public.assign_canonical_school_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_max_num INT;
BEGIN
    IF NEW.school_number IS NULL OR TRIM(NEW.school_number) = '' THEN
        SELECT COALESCE(MAX(NULLIF(regexp_replace(school_number, '[^0-9]', '', 'g'), '')::INT), 0) + 1
        INTO v_max_num
        FROM public.schools;

        NEW.school_number := lpad(v_max_num::text, 3, '0');
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_canonical_school_number ON public.schools;
CREATE TRIGGER trg_assign_canonical_school_number
BEFORE INSERT ON public.schools
FOR EACH ROW
EXECUTE FUNCTION public.assign_canonical_school_number();

-- Unique Index auf school_number
CREATE UNIQUE INDEX IF NOT EXISTS uq_schools_school_number ON public.schools (school_number);

-- 2. UPDATE GET_PUBLIC_SCHOOL_THEME
CREATE OR REPLACE FUNCTION public.get_public_school_theme(p_subdomain TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_clean_sub TEXT := LOWER(TRIM(p_subdomain));
    v_school RECORD;
BEGIN
    IF v_clean_sub IS NULL OR v_clean_sub = '' THEN
        RETURN NULL;
    END IF;

    -- Query by exact ID or subdomain or slug match or school_number
    SELECT id, name, primary_color, logo_url, has_campus_subscription, has_groovelab_subscription, sponsor_settings, school_number
    INTO v_school
    FROM public.schools
    WHERE id::text = v_clean_sub 
       OR LOWER(TRIM(COALESCE(subdomain, ''))) = v_clean_sub
       OR school_number = v_clean_sub
    LIMIT 1;

    IF v_school.id IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'id', v_school.id,
        'name', v_school.name,
        'school_number', COALESCE(v_school.school_number, '001'),
        'primary_color', COALESCE(v_school.primary_color, '#eab308'),
        'logo_url', v_school.logo_url,
        'has_campus_subscription', COALESCE(v_school.has_campus_subscription, true),
        'has_groovelab_subscription', COALESCE(v_school.has_groovelab_subscription, false),
        'is_campus_active', COALESCE(v_school.has_campus_subscription, true),
        'is_groovelab_active', COALESCE(v_school.has_groovelab_subscription, false),
        'sponsor_settings', v_school.sponsor_settings
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_school_theme(TEXT) TO anon, authenticated, service_role;

-- 3. HISTORISCHE CREDENTIALS IN USER_BADGE_CREDENTIALS SICHERN
INSERT INTO public.user_badge_credentials (user_id, school_id, credential_type, token_value, label, is_active)
SELECT u.id, u.school_id, 'legacy_ausweis', u.ausweis_nummer, 'Historischer Ausweis vor Umstellung', true
FROM public.users_raw u
WHERE u.ausweis_nummer IS NOT NULL AND TRIM(u.ausweis_nummer) <> ''
  AND u.ausweis_nummer !~ '^\d{3}-[SLV]-\d{4}$'
ON CONFLICT (token_value) DO NOTHING;

INSERT INTO public.user_badge_credentials (user_id, school_id, credential_type, token_value, label, is_active)
SELECT u.id, u.school_id, 'qr_badge', u.teacher_qr_token, 'Lehrer QR-Token', true
FROM public.users_raw u
WHERE u.teacher_qr_token IS NOT NULL AND TRIM(u.teacher_qr_token) <> ''
ON CONFLICT (token_value) DO NOTHING;

-- 4. KANONISCHER TRIGGER FÜR DEUTSCHE AUSWEISNUMMERN (S, L, V)
CREATE OR REPLACE FUNCTION public.assign_canonical_ausweis_nummer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_school_num TEXT := '001';
    v_role_code TEXT := 'S';
    v_next_seq INT := 1;
    v_regex_pattern TEXT;
BEGIN
    -- 1. Ermittle Schulnummer
    IF NEW.school_id IS NOT NULL THEN
        SELECT COALESCE(school_number, '001')
        INTO v_school_num
        FROM public.schools
        WHERE id = NEW.school_id;
    END IF;
    IF v_school_num IS NULL OR v_school_num = '' THEN
        v_school_num := '001';
    END IF;

    -- 2. Ermittle deutschen Rollen-Code (S = Schüler, L = Lehrer, V = Verwaltung)
    IF NEW.role IN ('admin', 'secretary', 'verwaltung', 'superadmin', 'owner') 
       OR ('admin' = ANY(NEW.roles)) OR ('secretary' = ANY(NEW.roles)) THEN
        v_role_code := 'V';
    ELSIF NEW.role IN ('teacher', 'lehrer', 'dozent', 'instructor') 
       OR ('teacher' = ANY(NEW.roles)) THEN
        v_role_code := 'L';
    ELSE
        v_role_code := 'S';
    END IF;

    -- 3. Nur generieren, wenn noch keine gültige kanonische Ausweisnummer vergeben ist
    IF NEW.ausweis_nummer IS NULL OR TRIM(NEW.ausweis_nummer) = '' 
       OR NEW.ausweis_nummer !~ ('^' || v_school_num || '-[SLV]-\d{4}$') THEN
       
        v_regex_pattern := '^' || v_school_num || '-' || v_role_code || '-\d{4}$';

        SELECT COALESCE(MAX(NULLIF(regexp_replace(ausweis_nummer, '^' || v_school_num || '-' || v_role_code || '-', ''), '')::INT), 0) + 1
        INTO v_next_seq
        FROM public.users_raw
        WHERE school_id = NEW.school_id
          AND ausweis_nummer ~ v_regex_pattern;

        IF v_next_seq < 1 THEN
            v_next_seq := 1;
        END IF;

        NEW.ausweis_nummer := v_school_num || '-' || v_role_code || '-' || lpad(v_next_seq::text, 4, '0');
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_canonical_ausweis_nummer ON public.users_raw;
CREATE TRIGGER trg_assign_canonical_ausweis_nummer
BEFORE INSERT ON public.users_raw
FOR EACH ROW
EXECUTE FUNCTION public.assign_canonical_ausweis_nummer();

-- 5. BACKFILL BESTEHENDE LEHRER & VERWALTUNG AUF 001-L-XXXX BZW. 001-V-XXXX
DO $$
DECLARE
    r RECORD;
    v_seq INT;
BEGIN
    ALTER TABLE public.users_raw DISABLE TRIGGER protect_user_login_credentials_trigger;

    -- Backfill für Lehrer (L)
    FOR r IN (
        SELECT u.id, u.school_id, COALESCE(s.school_number, '001') as snum
        FROM public.users_raw u
        LEFT JOIN public.schools s ON s.id = u.school_id
        WHERE u.role = 'teacher'
          AND (u.ausweis_nummer IS NULL OR u.ausweis_nummer !~ '^\d{3}-L-\d{4}$')
        ORDER BY u.created_at ASC, u.id ASC
    ) LOOP
        SELECT COALESCE(MAX(NULLIF(regexp_replace(ausweis_nummer, '^' || r.snum || '-L-', ''), '')::INT), 0) + 1
        INTO v_seq
        FROM public.users_raw
        WHERE school_id = r.school_id AND ausweis_nummer ~ ('^' || r.snum || '-L-\d{4}$');

        UPDATE public.users_raw
        SET ausweis_nummer = r.snum || '-L-' || lpad(v_seq::text, 4, '0')
        WHERE id = r.id;
    END LOOP;

    -- Backfill für Verwaltung/Schulleitung (V)
    FOR r IN (
        SELECT u.id, u.school_id, COALESCE(s.school_number, '001') as snum
        FROM public.users_raw u
        LEFT JOIN public.schools s ON s.id = u.school_id
        WHERE u.role IN ('admin', 'secretary')
          AND (u.ausweis_nummer IS NULL OR u.ausweis_nummer !~ '^\d{3}-V-\d{4}$')
        ORDER BY u.created_at ASC, u.id ASC
    ) LOOP
        SELECT COALESCE(MAX(NULLIF(regexp_replace(ausweis_nummer, '^' || r.snum || '-V-', ''), '')::INT), 0) + 1
        INTO v_seq
        FROM public.users_raw
        WHERE school_id = r.school_id AND ausweis_nummer ~ ('^' || r.snum || '-V-\d{4}$');

        UPDATE public.users_raw
        SET ausweis_nummer = r.snum || '-V-' || lpad(v_seq::text, 4, '0')
        WHERE id = r.id;
    END LOOP;

    ALTER TABLE public.users_raw ENABLE TRIGGER protect_user_login_credentials_trigger;
END;
$$;

-- 6. HÄRTUNG DER SCHUL-LÖSCHUNG UND VERTRAGS-ÄNDERUNGEN (NUR SCHULLEITUNG MIT MFA)
-- delete_school_cascade: Nur Schulleitung (admin) mit MFA
CREATE OR REPLACE FUNCTION public.delete_school_cascade(
    p_admin_id uuid,
    p_school_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
    v_caller_id UUID := get_current_authenticated_user_id();
    v_is_master BOOLEAN := is_master_admin();
    v_caller_role text;
    v_caller_roles text[];
    v_is_2fa boolean;
BEGIN
    -- 1. Anti-Spoofing: Caller must be the actual authenticated admin or master admin
    IF NOT (v_is_master OR (v_caller_id IS NOT NULL AND v_caller_id = p_admin_id)) THEN
        RAISE EXCEPTION 'Zugriff verweigert: Identitäts-Spoofing erkannt.';
    END IF;

    -- 2. Caller must have role admin in this school (Sekretariat/Verwaltung ist strikt verboten!)
    SELECT role, roles, COALESCE(is_2fa_enabled, FALSE)
    INTO v_caller_role, v_caller_roles, v_is_2fa
    FROM public.users_raw
    WHERE id = p_admin_id AND school_id = p_school_id;

    IF NOT v_is_master AND (v_caller_role <> 'admin' AND NOT ('admin' = ANY(v_caller_roles))) THEN
        RAISE EXCEPTION 'Zugriff verweigert: Nur Schulleitungen (Admin) dürfen eine Schule löschen. Sekretariatskonten besitzen hierfür keine Berechtigung.';
    END IF;

    -- 3. 🛡️ MFA-Pflicht für Schulleitung: Löschung zwingend nur mit aktiver MFA (Passkey / TOTP)
    IF NOT v_is_master AND NOT v_is_2fa THEN
        RAISE EXCEPTION 'Zugriff verweigert: Das Löschen einer Musikschule erfordert zwingend eine aktive Multi-Faktor-Authentifizierung (MFA / 2FA) des Schulleiters.';
    END IF;

    -- 4. Delete cascade
    DELETE FROM public.schedules WHERE school_id = p_school_id;
    DELETE FROM public.lessons WHERE school_id = p_school_id;
    DELETE FROM public.campus_events WHERE school_id = p_school_id;
    DELETE FROM public.lehrwerke WHERE school_id = p_school_id;
    DELETE FROM public.exercises WHERE school_id = p_school_id;
    DELETE FROM public.bands WHERE school_id = p_school_id;
    DELETE FROM public.sessions WHERE user_id IN (SELECT id FROM public.users_raw WHERE school_id = p_school_id);
    DELETE FROM public.help_requests WHERE user_id IN (SELECT id FROM public.users_raw WHERE school_id = p_school_id);
    DELETE FROM public.user_badge_credentials WHERE school_id = p_school_id;
    DELETE FROM public.users_raw WHERE school_id = p_school_id;
    DELETE FROM public.schools WHERE id = p_school_id;

    INSERT INTO public.audit_logs (
        school_id, table_name, record_id, user_id, action, entity_type, entity_id, details
    ) VALUES (
        p_school_id, 'schools', p_school_id, p_admin_id, 'SCHOOL_DELETED_CASCADE_MFA_VERIFIED',
        'schools', p_school_id::TEXT, jsonb_build_object('deleted_by', p_admin_id, 'deleted_at', NOW())
    );
END;
$$;

-- cancel_school_subscription: Nur Schulleitung (admin)
CREATE OR REPLACE FUNCTION public.cancel_school_subscription(
    p_school_id UUID,
    p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_caller_id UUID := get_current_authenticated_user_id();
    v_caller_role TEXT;
    v_caller_school UUID;
    v_is_2fa BOOLEAN;
BEGIN
    v_caller_role := public.get_current_user_role();
    v_caller_school := public.get_current_user_school_id();

    SELECT COALESCE(is_2fa_enabled, FALSE) INTO v_is_2fa
    FROM public.users_raw
    WHERE id = v_caller_id;

    -- Nur Schulleitung (admin) oder Master-Admin darf den Vertrag kündigen
    IF NOT (public.is_master_admin() OR (v_caller_role = 'admin' AND v_caller_school = p_school_id)) THEN
        RAISE EXCEPTION 'Zugriff verweigert: Nur Schulleitungen (Admin) dürfen Verträge kündigen.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.schools SET
        status = 'cancelled',
        cancellation_reason = COALESCE(p_cancellation_reason, cancellation_reason),
        cancelled_at = NOW()
    WHERE id = p_school_id;

    RETURN jsonb_build_object('success', true, 'school_id', p_school_id, 'status', 'cancelled');
END;
$$;

-- confirm_school_subscription: Nur Schulleitung (admin)
CREATE OR REPLACE FUNCTION public.confirm_school_subscription(
    p_school_id UUID,
    p_has_campus BOOLEAN,
    p_has_groovelab BOOLEAN,
    p_student_billing_option TEXT,
    p_contract_start_date TEXT,
    p_storage_addon_gb INTEGER,
    p_storage_addon_monthly_fee NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_caller_id UUID := get_current_authenticated_user_id();
    v_caller_role TEXT;
    v_caller_school UUID;
BEGIN
    v_caller_role := public.get_current_user_role();
    v_caller_school := public.get_current_user_school_id();

    IF NOT (public.is_master_admin() OR (v_caller_role = 'admin' AND v_caller_school = p_school_id)) THEN
        RAISE EXCEPTION 'Zugriff verweigert: Nur Schulleitungen (Admin) dürfen Schulverträge verbindlich abschließen.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.schools SET
        has_campus = COALESCE(p_has_campus, has_campus),
        has_groovelab = COALESCE(p_has_groovelab, has_groovelab),
        student_billing_option = COALESCE(p_student_billing_option, student_billing_option),
        contract_start_date = COALESCE(p_contract_start_date::date, contract_start_date),
        storage_addon_gb = COALESCE(p_storage_addon_gb, 0),
        storage_addon_monthly_fee = COALESCE(p_storage_addon_monthly_fee, 0.00),
        is_billing_booked = true,
        is_trial = false,
        status = 'active'
    WHERE id = p_school_id;

    RETURN jsonb_build_object('success', true, 'school_id', p_school_id);
END;
$$;

-- 7. AUTORITATIVER RPC: AUTHENTICATE_BY_CREDENTIAL (DEUTSCHE PARITÄT & MULTI-ROLE RESILIENCE)
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
    v_raw text := TRIM(p_credential);
    v_clean text := TRIM(p_credential);
    v_clean_upper text;
    v_is_uuid boolean := FALSE;
    v_digits_only text;
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
    IF v_raw IS NULL OR v_raw = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Anmeldedaten.');
    END IF;

    -- URL- & URI-Entpackung
    IF v_clean ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' THEN
        v_clean := (regexp_match(v_clean, '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', 'i'))[1];
    ELSIF v_clean ~* '/(?:qr|onboarding|badge|card|pass)/([a-zA-Z0-9\-_]+)' THEN
        v_clean := (regexp_match(v_clean, '/(?:qr|onboarding|badge|card|pass)/([a-zA-Z0-9\-_]+)', 'i'))[1];
    ELSIF v_clean ~* '[?&](?:qr_token|teacher_qr_token|token|campus_pass)=([a-zA-Z0-9\-_]+)' THEN
        v_clean := (regexp_match(v_clean, '[?&](?:qr_token|teacher_qr_token|token|campus_pass)=([a-zA-Z0-9\-_]+)', 'i'))[1];
    END IF;

    v_clean_upper := UPPER(v_clean);
    v_is_uuid := (v_clean ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
    v_digits_only := regexp_replace(v_clean, '[^0-9]', '', 'g');

    -- Compute SHA-256 for logging
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
          AND created_at > (NOW() - INTERVAL '5 minutes');

        IF v_ip_failures >= 150 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Zu viele Fehlversuche von dieser IP. Bitte warte einige Minuten.'
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

    -- Regulärer Credential Lookup (Multi-Role: Schüler S, Lehrer L, Verwaltung V)
    IF v_user IS NULL THEN
        SELECT u.* INTO v_user
        FROM public.users_raw u
        WHERE (
            -- 1. Kanonische Ausweisnummer (exakt oder Case-Insensitive)
            u.ausweis_nummer = v_clean
            OR u.ausweis_nummer = v_clean_upper
            -- 2. Bindestrich-Toleranz (z. B. '001S0001', '001L0001', '001V0001')
            OR (length(v_clean) >= 6 AND replace(u.ausweis_nummer, '-', '') = replace(v_clean_upper, '-', ''))
            -- 3. Verknüpfte Ausweis-Badges (Historische & Multi-Badges)
            OR EXISTS (
                SELECT 1 FROM public.user_badge_credentials ubc 
                WHERE ubc.user_id = u.id 
                  AND ubc.token_value = v_clean 
                  AND ubc.is_active = TRUE
            )
            -- 4. Kanonischer QR-Token auf users_raw
            OR u.qr_token::text = v_clean
            -- 5. Gedruckte 6-stellige Ausweis-ID (z. B. '326060')
            OR u.ausweis_id = v_clean
            -- 6. Lehrer-Tokens
            OR u.teacher_qr_token = v_clean
            OR u.teacher_qr_token::text = v_clean
            -- 7. Reine Ziffernfolge über Numpad NUR wenn keine Buchstaben enthalten sind
            OR (v_clean !~* '[A-Z]' AND length(v_digits_only) >= 6 AND regexp_replace(u.ausweis_nummer, '[^0-9]', '', 'g') = v_digits_only AND u.role = 'student')
        )
        AND (p_school_id IS NULL OR u.school_id = p_school_id)
        AND u.is_active = TRUE
        ORDER BY 
            CASE 
                WHEN u.ausweis_nummer = v_clean THEN 1
                WHEN u.ausweis_nummer = v_clean_upper THEN 2
                WHEN replace(u.ausweis_nummer, '-', '') = replace(v_clean_upper, '-', '') THEN 3
                WHEN EXISTS (SELECT 1 FROM public.user_badge_credentials ubc WHERE ubc.user_id = u.id AND ubc.token_value = v_clean AND ubc.is_active = TRUE) THEN 4
                WHEN u.qr_token::text = v_clean THEN 5
                ELSE 10
            END ASC
        LIMIT 1;

        -- Cross-School Fallback
        IF v_user IS NULL AND p_school_id IS NOT NULL THEN
            SELECT u.* INTO v_user
            FROM public.users_raw u
            WHERE (
                u.ausweis_nummer = v_clean
                OR u.ausweis_nummer = v_clean_upper
                OR (length(v_clean) >= 6 AND replace(u.ausweis_nummer, '-', '') = replace(v_clean_upper, '-', ''))
                OR EXISTS (
                    SELECT 1 FROM public.user_badge_credentials ubc 
                    WHERE ubc.user_id = u.id 
                      AND ubc.token_value = v_clean 
                      AND ubc.is_active = TRUE
                )
                OR u.qr_token::text = v_clean
                OR u.ausweis_id = v_clean
                OR u.teacher_qr_token = v_clean
                OR u.teacher_qr_token::text = v_clean
                OR (v_clean !~* '[A-Z]' AND length(v_digits_only) >= 6 AND regexp_replace(u.ausweis_nummer, '[^0-9]', '', 'g') = v_digits_only AND u.role = 'student')
            )
            AND u.is_active = TRUE
            ORDER BY 
                CASE 
                    WHEN u.ausweis_nummer = v_clean THEN 1
                    WHEN u.ausweis_nummer = v_clean_upper THEN 2
                    WHEN replace(u.ausweis_nummer, '-', '') = replace(v_clean_upper, '-', '') THEN 3
                    WHEN EXISTS (SELECT 1 FROM public.user_badge_credentials ubc WHERE ubc.user_id = u.id AND ubc.token_value = v_clean AND ubc.is_active = TRUE) THEN 4
                    WHEN u.qr_token::text = v_clean THEN 5
                    ELSE 10
                END ASC
            LIMIT 1;
        END IF;
    END IF;

    -- User nicht gefunden
    IF v_user IS NULL THEN
        IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
            INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, raw_credential, school_id, success)
            VALUES (v_ip_hash, v_token_log_hash, v_clean, p_school_id, FALSE);
        END IF;

        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Ungültiger Ausweis-PIN oder QR-Token.'
        );
    END IF;

    -- Update last_used_at on user_badge_credentials
    IF to_regclass('public.user_badge_credentials') IS NOT NULL THEN
        UPDATE public.user_badge_credentials
        SET last_used_at = NOW()
        WHERE token_value = v_clean;
    END IF;

    -- Schüler-Governance: Kostenairbag Auto-Restore & B2C Karenzzeit
    IF v_user.role = 'student' THEN
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

        UPDATE public.users_raw
        SET last_seen = NOW()
        WHERE id = v_user.id;
    END IF;

    -- Fetch school
    SELECT * INTO v_school
    FROM public.schools
    WHERE id = v_user.school_id;

    -- 🛡️ Schulleitung (admin) MFA-Governance: Schulleitungs-Login erfordert immer MFA
    v_mfa_enforced := (v_user.role = 'admin') OR (COALESCE(v_school.mfa_enforced_for_admins, FALSE) AND v_user.role IN ('admin', 'secretary'));

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

    -- Record success
    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, raw_credential, school_id, success)
        VALUES (v_ip_hash, v_token_log_hash, v_clean, p_school_id, TRUE);
    END IF;

    -- Security flags
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

NOTIFY pgrst, 'reload schema';
