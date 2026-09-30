-- ==============================================================================
-- Migration 514: Enterprise Dual-Encryption & Cryptographic Blind Index Identity Vault
-- Standards: OWASP ASVS Level 3 / DSGVO Art. 25 (Privacy by Design) & Art. 32 / BSI TR-02102
-- Zweck: Beseitigung der historischen Asymmetrie im 6-Tabellen-Schema (Migration 135/136).
--        Vollständige AES-256 At-Rest Verschlüsselung beider Namensbestandteile
--        (student_first_names UND student_last_names als bytea).
--        Einführung eines deterministischen HMAC-SHA256 Blind Index (bidx_last_name)
--        mit B-Tree-Index O(1) für schnelle, datenschutzkonforme Suchen ohne Klartext-Leak.
-- ==============================================================================

-- 1. Sicherstellen, dass pgcrypto im extensions-Schema existiert
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- 2. Deterministische Blind-Index-Berechnungsfunktion (HMAC-SHA256)
CREATE OR REPLACE FUNCTION public.compute_name_blind_index(p_name text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF p_name IS NULL OR TRIM(p_name) = '' THEN
        RETURN NULL;
    END IF;
    -- Normalisierung: Trim, Lowercase
    -- HMAC-SHA256 mit autoritativem Datenbankschlüssel
    RETURN encode(
        extensions.hmac(
            lower(trim(p_name)), 
            public.get_encryption_key(), 
            'sha256'
        ), 
        'hex'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.compute_name_blind_index(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_name_blind_index(text) TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.compute_name_blind_index(text) IS 'Berechnet einen deterministischen HMAC-SHA256 Blind Index für sichere Namenssuchen ohne Klartext-Leck (DSGVO Art. 25 & 32 / BSI TR-02102).';


-- 3. Schema-Evolution auf public.student_last_names
-- 3a. Spalte bidx_last_name hinzufügen
ALTER TABLE public.student_last_names 
  ADD COLUMN IF NOT EXISTS bidx_last_name text;

-- 3b. Spalte last_name auf bytea umstellen und bestehende Klartexte verschlüsseln
DO $$
DECLARE
    v_data_type text;
BEGIN
    SELECT data_type INTO v_data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'student_last_names' 
      AND column_name = 'last_name';

    IF v_data_type IN ('character varying', 'text') THEN
        -- Bestehende Plaintext-Werte mit PGP-AES verschlüsseln
        ALTER TABLE public.student_last_names 
          ALTER COLUMN last_name TYPE bytea 
          USING extensions.pgp_sym_encrypt(last_name, public.get_encryption_key());
    END IF;
END $$;

-- 3c. Blind-Index für alle vorhandenen Datensätze initial befüllen
UPDATE public.student_last_names 
SET bidx_last_name = public.compute_name_blind_index(
    public.safe_pgp_sym_decrypt(last_name, public.get_encryption_key())
)
WHERE bidx_last_name IS NULL AND last_name IS NOT NULL;

-- 3d. B-Tree Index auf Blind Index erstellen für O(1) Suche
CREATE INDEX IF NOT EXISTS idx_student_last_names_bidx 
  ON public.student_last_names (bidx_last_name);


-- 4. Automatischer Konsistenz-Trigger für student_last_names
CREATE OR REPLACE FUNCTION public.trg_student_last_names_blind_index_maintenance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_decrypted text;
BEGIN
    -- Falls bidx_last_name noch nicht gesetzt wurde, aber last_name vorhanden ist
    IF NEW.last_name IS NOT NULL AND (NEW.bidx_last_name IS NULL OR NEW.bidx_last_name = '') THEN
        v_decrypted := public.safe_pgp_sym_decrypt(NEW.last_name, public.get_encryption_key());
        IF v_decrypted IS NOT NULL AND v_decrypted <> '' THEN
            NEW.bidx_last_name := public.compute_name_blind_index(v_decrypted);
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_last_names_bidx ON public.student_last_names;
CREATE TRIGGER trg_student_last_names_bidx
BEFORE INSERT OR UPDATE ON public.student_last_names
FOR EACH ROW
EXECUTE FUNCTION public.trg_student_last_names_blind_index_maintenance();


-- 5. RPC import_student härten (Dual-Encryption & Blind Index)
CREATE OR REPLACE FUNCTION public.import_student(
    first_name text,
    last_name text,
    birth_date text,
    instrument text,
    school_id uuid,
    teacher_id uuid,
    lesson_duration integer DEFAULT 30
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions, pg_temp
AS $$
DECLARE
    v_caller_id UUID := get_current_authenticated_user_id();
    v_caller_role TEXT := get_current_user_role();
    v_caller_school UUID := get_current_user_school_id();
    v_is_master BOOLEAN := is_master_admin();
    new_student_id UUID;
    day_part INT;
    v_sanitized_last text;
BEGIN
    -- Strikter Mandantencheck: Nur Master-Admin oder Admin/Sekretariat/Dozent der Zielschule
    IF NOT (v_is_master OR (v_caller_school IS NOT NULL AND v_caller_school = school_id AND v_caller_role = ANY(ARRAY['admin', 'secretary', 'teacher']))) THEN
        RAISE EXCEPTION 'Zugriff verweigert: Unberechtigter Schüler-Import für diese Musikschule.';
    END IF;

    BEGIN
        IF birth_date IS NOT NULL AND birth_date <> '' THEN
            day_part := split_part(birth_date, '.', 1)::integer;
            IF day_part < 1 OR day_part > 31 THEN
                day_part := 1;
            END IF;
        ELSE
            day_part := 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        day_part := 1;
    END;

    INSERT INTO public.students (school_id, teacher_id, instrument, status, lesson_duration)
    VALUES (school_id, teacher_id, instrument, 'ausstehend', COALESCE(lesson_duration, 30))
    RETURNING id INTO new_student_id;

    -- 1. Vorname verschlüsselt speichern (AES-256)
    INSERT INTO public.student_first_names (student_id, first_name)
    VALUES (new_student_id, extensions.pgp_sym_encrypt(COALESCE(first_name, 'Schüler'), public.get_encryption_key()));

    -- 2. Nachname verschlüsselt speichern (AES-256) & Blind Index setzen
    v_sanitized_last := COALESCE(last_name, '');
    INSERT INTO public.student_last_names (student_id, last_name, bidx_last_name)
    VALUES (
        new_student_id, 
        extensions.pgp_sym_encrypt(v_sanitized_last, public.get_encryption_key()),
        public.compute_name_blind_index(v_sanitized_last)
    );

    -- 3. Geburtstagstag speichern
    INSERT INTO public.activation_days (student_id, day_of_birth)
    VALUES (new_student_id, day_part);

    RETURN new_student_id;
END;
$$;


-- 6. RPC verify_onboarding aktualisieren (Blind-Index-Support für Nachnamen)
CREATE OR REPLACE FUNCTION public.verify_onboarding(
    input_first_name TEXT,
    input_last_name TEXT,
    input_instrument TEXT,
    input_day INT
)
RETURNS TABLE (
    success BOOLEAN,
    student_id UUID,
    message TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions, pg_temp
AS $$
DECLARE
    client_ip TEXT;
    recent_attempts INT;
    matched_student_id UUID;
    v_target_bidx TEXT;
BEGIN
    -- Client-IP bestimmen
    client_ip := COALESCE(
        current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
        '127.0.0.1'
    );

    -- Veraltete Versuche löschen (> 15 Min)
    DELETE FROM public.onboarding_attempts WHERE attempted_at < NOW() - INTERVAL '15 minutes';

    -- Fehlversuche zählen
    SELECT COUNT(*)::INT INTO recent_attempts
    FROM public.onboarding_attempts
    WHERE ip_address = client_ip;

    IF recent_attempts >= 3 THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Zu viele Fehlversuche. Bitte versuche es in 15 Minuten erneut.';
        RETURN;
    END IF;

    -- Blind Index des gesuchten Nachnamens berechnen
    v_target_bidx := public.compute_name_blind_index(input_last_name);

    -- Blinde Suche über getrennte Vor- und Nachnamens-Tabellen
    -- Nutzt primär den indizierten Blind-Index O(1) mit resilientem Fallback
    SELECT s.id INTO matched_student_id
    FROM public.students s
    JOIN public.student_first_names sfn ON s.id = sfn.student_id
    JOIN public.student_last_names sln ON s.id = sln.student_id
    JOIN public.activation_days ad ON s.id = ad.student_id
    WHERE (
        public.safe_pgp_sym_decrypt(sfn.first_name, public.get_encryption_key()) ILIKE input_first_name
    )
    AND (
        (v_target_bidx IS NOT NULL AND sln.bidx_last_name = v_target_bidx)
        OR public.safe_pgp_sym_decrypt(sln.last_name, public.get_encryption_key()) ILIKE input_last_name
    )
    AND s.instrument = input_instrument
    AND ad.day_of_birth = input_day
    LIMIT 1;

    IF matched_student_id IS NOT NULL THEN
        -- Erfolg: IP freischalten
        DELETE FROM public.onboarding_attempts WHERE ip_address = client_ip;
        RETURN QUERY SELECT TRUE, matched_student_id, 'Verifiziert';
    ELSE
        -- Fehlschlag: IP registrieren
        INSERT INTO public.onboarding_attempts (ip_address) VALUES (client_ip);
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Eingabe überprüfen';
    END IF;
END;
$$;


-- 7. View pending_students_decrypted aktualisieren (Just-in-Time Entschlüsselung beider Namen)
CREATE OR REPLACE VIEW public.pending_students_decrypted 
WITH (security_barrier = true, security_invoker = true) AS
SELECT 
    s.id,
    s.school_id,
    s.teacher_id,
    s.instrument,
    s.status,
    s.created_at,
    s.lesson_duration,
    s.group_id,
    COALESCE(
        public.safe_pgp_sym_decrypt(sfn.first_name, public.get_encryption_key()),
        'Schüler'
    ) AS first_name,
    COALESCE(
        public.safe_pgp_sym_decrypt(sln.last_name, public.get_encryption_key()),
        ''
    ) AS last_name,
    sln.bidx_last_name,
    ad.day_of_birth
FROM public.students s
LEFT JOIN public.student_first_names sfn ON s.id = sfn.student_id
LEFT JOIN public.student_last_names sln ON s.id = sln.student_id
LEFT JOIN public.activation_days ad ON s.id = ad.student_id
WHERE s.status::text = 'ausstehend'::text
  AND (
      public.is_master_admin() 
      OR (
          public.get_current_user_school_id() IS NOT NULL 
          AND s.school_id = public.get_current_user_school_id()
          AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
      )
  );

REVOKE ALL ON public.pending_students_decrypted FROM anon;
GRANT SELECT ON public.pending_students_decrypted TO authenticated, service_role;


-- 8. RPC get_student_onboarding_preview aktualisieren (Dual-Token Entschlüsselung)
CREATE OR REPLACE FUNCTION public.get_student_onboarding_preview(
    p_token UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions', 'pg_temp'
AS $$
DECLARE
    v_token_rec      RECORD;
    v_user_rec       RECORD;
    v_school_rec     RECORD;
    v_target_user_id UUID := NULL;
    v_is_single_use  BOOLEAN := false;
    v_first_name     TEXT;
    v_last_initial   TEXT;
BEGIN
    IF p_token IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kein Token übergeben.');
    END IF;

    -- ── WEG 1: Prüfung auf digitalen Einmal-Token ────────────────────────────
    SELECT * INTO v_token_rec
    FROM public.student_onboarding_tokens
    WHERE token = p_token
    LIMIT 1;

    IF v_token_rec.id IS NOT NULL THEN
        v_is_single_use := true;
        v_target_user_id := v_token_rec.student_id;

        -- Prüfen ob bereits verwendet
        IF v_token_rec.used_at IS NOT NULL THEN
            SELECT u.id, u.school_id, u.is_pin_activated
            INTO v_user_rec
            FROM public.users_raw u
            WHERE u.id = v_target_user_id;

            -- Namen sicher entschlüsseln
            v_first_name := public.safe_pgp_sym_decrypt(
                (SELECT sfn.first_name FROM public.student_first_names sfn WHERE sfn.student_id = v_target_user_id LIMIT 1),
                public.get_encryption_key()
            );

            IF v_first_name IS NULL OR v_first_name = '' THEN
                v_first_name := COALESCE(v_user_rec.first_name, '');
            END IF;

            SELECT name, logo_url, primary_color, subdomain
            INTO v_school_rec
            FROM public.schools
            WHERE id = v_user_rec.school_id;

            RETURN jsonb_build_object(
                'success', true,
                'is_already_activated', true,
                'message', 'Dieser Einladungs-Link wurde bereits verwendet. Das Profil ist aktiv.',
                'student', jsonb_build_object(
                    'id', v_user_rec.id,
                    'school_id', v_user_rec.school_id,
                    'first_name', COALESCE(v_first_name, ''),
                    'school_name', COALESCE(v_school_rec.name, ''),
                    'school_logo', COALESCE(v_school_rec.logo_url, ''),
                    'school_color', COALESCE(v_school_rec.primary_color, '#34a853'),
                    'school_subdomain', COALESCE(v_school_rec.subdomain, '')
                )
            );
        END IF;

        -- Prüfen ob älter als 30 Tage
        IF v_token_rec.created_at < (NOW() - INTERVAL '30 days') THEN
            RETURN jsonb_build_object(
                'success', false,
                'is_expired', true,
                'error', 'Dieser Einladungs-Link ist abgelaufen (30 Tage Gültigkeit). Bitte fordere eine neue Einladung an.'
            );
        END IF;
    END IF;

    -- ── WEG 2: Prüfung auf Ausweis-QR-Token oder Schüler-UUID ────────────────
    IF v_target_user_id IS NULL THEN
        SELECT id INTO v_target_user_id
        FROM public.users_raw
        WHERE (qr_token = p_token OR id = p_token) AND role = 'student'
        LIMIT 1;
    END IF;

    IF v_target_user_id IS NULL THEN
        SELECT id INTO v_target_user_id
        FROM public.students
        WHERE id = p_token
        LIMIT 1;
    END IF;

    IF v_target_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiger oder nicht gefundener Einladungs-Link.');
    END IF;

    -- ── Schüler-Stammdaten laden (Zero-Secret-Prinzip) ────────────────────────
    SELECT
        u.id,
        u.school_id,
        u.instrument,
        u.is_pin_activated,
        u.is_campus_active,
        u.is_groovelab_active,
        u.campus_ui_level,
        u.app_usage_mode,
        u.photo_url,
        u.first_name,
        u.last_name
    INTO v_user_rec
    FROM public.users_raw u
    WHERE u.id = v_target_user_id;

    IF v_user_rec.id IS NULL THEN
        -- Fallback falls noch in students-Tabelle
        SELECT
            s.id,
            s.school_id,
            s.instrument,
            false AS is_pin_activated,
            true AS is_campus_active,
            false AS is_groovelab_active,
            'standard' AS campus_ui_level,
            'selbstnutzer' AS app_usage_mode,
            NULL AS photo_url,
            '' AS first_name,
            '' AS last_name
        INTO v_user_rec
        FROM public.students s
        WHERE s.id = v_target_user_id;
    END IF;

    IF v_user_rec.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Schülerprofil konnte nicht geladen werden.');
    END IF;

    -- ── Namen entschlüsseln (DSGVO Art. 25 & 32: serverseitig mit Key) ───────
    v_first_name := public.safe_pgp_sym_decrypt(
        (SELECT sfn.first_name FROM public.student_first_names sfn WHERE sfn.student_id = v_user_rec.id LIMIT 1),
        public.get_encryption_key()
    );

    IF v_first_name IS NULL OR v_first_name = '' THEN
        v_first_name := COALESCE(v_user_rec.first_name, '');
    END IF;

    -- Nachnamen-Initial sicher ableiten (aus verschlüsseltem bytea)
    BEGIN
        SELECT LEFT(public.safe_pgp_sym_decrypt(sln.last_name, public.get_encryption_key()), 1) || '.'
        INTO v_last_initial
        FROM public.student_last_names sln
        WHERE sln.student_id = v_user_rec.id
        LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        v_last_initial := NULL;
    END;

    IF v_last_initial IS NULL OR v_last_initial = '.' OR v_last_initial = '' THEN
        IF v_user_rec.last_name IS NOT NULL AND v_user_rec.last_name <> '' THEN
            v_last_initial := LEFT(v_user_rec.last_name, 1) || '.';
        ELSE
            v_last_initial := '';
        END IF;
    END IF;

    -- Schuldaten laden
    SELECT name, logo_url, primary_color, subdomain
    INTO v_school_rec
    FROM public.schools
    WHERE id = v_user_rec.school_id;

    -- ── Falls Profil bereits aktiv ist (PIN vergeben): Status-Rückgabe ───────
    IF COALESCE(v_user_rec.is_pin_activated, false) = true THEN
        RETURN jsonb_build_object(
            'success', true,
            'is_already_activated', true,
            'message', 'Dieses Schülerprofil ist bereits aktiviert.',
            'student', jsonb_build_object(
                'id', v_user_rec.id,
                'school_id', v_user_rec.school_id,
                'first_name', COALESCE(v_first_name, ''),
                'last_initial', COALESCE(v_last_initial, ''),
                'instrument', COALESCE(v_user_rec.instrument, ''),
                'photo_url', COALESCE(v_user_rec.photo_url, ''),
                'school_name', COALESCE(v_school_rec.name, ''),
                'school_logo', COALESCE(v_school_rec.logo_url, ''),
                'school_color', COALESCE(v_school_rec.primary_color, '#34a853'),
                'school_subdomain', COALESCE(v_school_rec.subdomain, '')
            )
        );
    END IF;

    -- ── Profil noch nicht aktiv: Reguläre Vorschau für Onboarding ────────────
    RETURN jsonb_build_object(
        'success', true,
        'is_already_activated', false,
        'is_single_use', v_is_single_use,
        'student', jsonb_build_object(
            'id', v_user_rec.id,
            'school_id', v_user_rec.school_id,
            'first_name', COALESCE(v_first_name, ''),
            'last_initial', COALESCE(v_last_initial, ''),
            'instrument', COALESCE(v_user_rec.instrument, ''),
            'campus_ui_level', COALESCE(v_user_rec.campus_ui_level, 'standard'),
            'is_pin_activated', false,
            'is_campus_active', COALESCE(v_user_rec.is_campus_active, false),
            'campus_usage_mode', COALESCE(v_user_rec.app_usage_mode, 'selbstnutzer'),
            'photo_url', COALESCE(v_user_rec.photo_url, ''),
            'school_name', COALESCE(v_school_rec.name, ''),
            'school_logo', COALESCE(v_school_rec.logo_url, ''),
            'school_color', COALESCE(v_school_rec.primary_color, '#34a853'),
            'school_subdomain', COALESCE(v_school_rec.subdomain, '')
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_onboarding_preview(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_onboarding_preview(UUID) TO anon, authenticated, service_role;


-- 9. RPC verify_onboarding_token aktualisieren (Migration 315 Parität)
CREATE OR REPLACE FUNCTION public.verify_onboarding_token(input_token uuid)
RETURNS TABLE(success boolean, student_id uuid, first_name text, last_name text, instrument text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions, pg_temp
AS $$
DECLARE
    tok_rec RECORD;
    target_first TEXT;
    target_last TEXT;
    target_instr TEXT;
BEGIN
    -- Only allow tokens that are unused and not older than 30 days
    SELECT * INTO tok_rec
    FROM public.student_onboarding_tokens
    WHERE token = input_token 
      AND used_at IS NULL
      AND created_at > (NOW() - INTERVAL '30 days');

    IF tok_rec.id IS NULL THEN
        -- Check if it expired or was already used
        SELECT * INTO tok_rec FROM public.student_onboarding_tokens WHERE token = input_token LIMIT 1;
        IF tok_rec.id IS NOT NULL THEN
            IF tok_rec.used_at IS NOT NULL THEN
                RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, 'Dieser Einladungs-Link wurde bereits verwendet.';
                RETURN;
            ELSE
                RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, 'Dieser Einladungs-Link ist nach 30 Tagen abgelaufen. Bitte fordere eine neue Einladung an.';
                RETURN;
            END IF;
        END IF;

        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, 'Ungültiger oder nicht gefundener Einladungs-Link.';
        RETURN;
    END IF;

    SELECT public.safe_pgp_sym_decrypt(sfn.first_name, public.get_encryption_key()) INTO target_first
    FROM public.student_first_names sfn WHERE sfn.student_id = tok_rec.student_id;

    SELECT public.safe_pgp_sym_decrypt(sln.last_name, public.get_encryption_key()) INTO target_last
    FROM public.student_last_names sln WHERE sln.student_id = tok_rec.student_id;

    SELECT s.instrument INTO target_instr
    FROM public.students s WHERE s.id = tok_rec.student_id;

    RETURN QUERY SELECT TRUE, tok_rec.student_id, target_first, target_last, target_instr, 'Token erfolgreich verifiziert';
END;
$$;

REVOKE ALL ON FUNCTION public.verify_onboarding_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_onboarding_token(UUID) TO anon, authenticated, service_role;


-- 10. PostgREST Schema Cache neu laden
NOTIFY pgrst, 'reload schema';
