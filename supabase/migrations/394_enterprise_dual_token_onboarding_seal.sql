-- ============================================================================
-- Migration 394: Enterprise Dual-Token Onboarding & Governance Seal
-- OWASP ASVS Level 3 / DSGVO Art. 5, 8, 25, 32 / BSI TR-03107
-- 
-- 1. Duale Architektur:
--    - Weg A: Physischer Schülerausweis / QR-Code (Dauerhaftes Authentifizierungsmerkmal)
--    - Weg B: Digitaler Einladungslink (Einmal-Token mit 30 Tagen TTL)
-- 2. Autorisierung über get_current_authenticated_user_id() (kein auth.uid() Mismatch)
-- 3. PostgREST-Execute Rechte für anon, authenticated, service_role
-- ============================================================================

-- ============================================================================
-- 1. RPC: generate_student_onboarding_token
--    Generiert einen Einmal-Token für den digitalen Versand (PWA-Link).
--    Nur für Lehrer, Admins oder Sekretariat der eigenen Schule.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_student_onboarding_token(
    p_student_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $$
DECLARE
    v_caller_id     UUID;
    v_caller_role   TEXT;
    v_caller_school UUID;
    v_student_school UUID;
    v_new_token     UUID := gen_random_uuid();
BEGIN
    -- ── 1. Caller-Identifikation über Zero-Trust Session-Leases ──────────────
    v_caller_id := public.get_current_authenticated_user_id();
    IF v_caller_id IS NULL THEN
        -- Fallback: Supabase Auth falls vorhanden
        BEGIN
            v_caller_id := auth.uid();
        EXCEPTION WHEN OTHERS THEN
            v_caller_id := NULL;
        END;
    END IF;

    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Nicht authentifiziert. Bitte logge dich erneut ein.'
        );
    END IF;

    SELECT role, school_id
    INTO v_caller_role, v_caller_school
    FROM public.users_raw
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('teacher', 'admin', 'secretary') AND NOT public.is_master_admin() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Keine Berechtigung zum Erstellen von Einladungs-Links.'
        );
    END IF;

    -- ── 2. Schüler und Mandantenprüfung ──────────────────────────────────────
    SELECT school_id INTO v_student_school
    FROM public.users_raw
    WHERE id = p_student_user_id;

    IF v_student_school IS NULL THEN
        SELECT school_id INTO v_student_school
        FROM public.students
        WHERE id = p_student_user_id;
    END IF;

    IF v_student_school IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Schülerprofil nicht gefunden.');
    END IF;

    IF NOT public.is_master_admin() AND v_student_school != v_caller_school THEN
        RETURN jsonb_build_object('success', false, 'error', 'Zugriff verweigert (andere Schule).');
    END IF;

    -- ── 3. Frühere unbenutzte Tokens des Schülers ungültig machen ────────────
    UPDATE public.student_onboarding_tokens
    SET used_at = NOW()
    WHERE student_id = p_student_user_id
      AND used_at IS NULL
      AND created_at > (NOW() - INTERVAL '30 days');

    -- ── 4. Neuen Einmal-Token eintragen ──────────────────────────────────────
    INSERT INTO public.student_onboarding_tokens (id, student_id, token, created_at)
    VALUES (gen_random_uuid(), p_student_user_id, v_new_token, NOW());

    RETURN jsonb_build_object(
        'success', true,
        'token', v_new_token,
        'expires_at', (NOW() + INTERVAL '30 days')
    );
END;
$$;

-- Rechte sauber an alle Rollen vergeben (PostgREST über anon zugänglich, Autorisierung intern)
REVOKE ALL ON FUNCTION public.generate_student_onboarding_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_student_onboarding_token(UUID) TO anon, authenticated, service_role;


-- ============================================================================
-- 2. RPC: get_student_onboarding_preview
--    Liefert eine datensparsame, anonymisierte Vorschau für das Onboarding.
--    Unterstützt DUAL:
--      - Einmal-Token aus student_onboarding_tokens
--      - Physischen Ausweis-QR-Token / Schüler-UUID
--    Erkennt bereits aktivierte Profile und signalisiert is_already_activated.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_student_onboarding_preview(
    p_token UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'pg_temp'
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
            -- Schüler dennoch laden, um den Schüler und die Schule für den Login-Button zu kennen
            SELECT u.id, u.school_id, u.is_pin_activated
            INTO v_user_rec
            FROM public.users_raw u
            WHERE u.id = v_target_user_id;

            -- Namen entschlüsseln
            BEGIN
                SELECT pgp_sym_decrypt(sfn.first_name, public.get_encryption_key())
                INTO v_first_name
                FROM public.student_first_names sfn
                WHERE sfn.student_id = v_target_user_id
                LIMIT 1;
            EXCEPTION WHEN OTHERS THEN
                v_first_name := NULL;
            END;

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
    BEGIN
        SELECT pgp_sym_decrypt(sfn.first_name, public.get_encryption_key())
        INTO v_first_name
        FROM public.student_first_names sfn
        WHERE sfn.student_id = v_user_rec.id
        LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        v_first_name := NULL;
    END;

    IF v_first_name IS NULL OR v_first_name = '' THEN
        v_first_name := COALESCE(v_user_rec.first_name, '');
    END IF;

    BEGIN
        SELECT LEFT(sln.last_name, 1) || '.'
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


-- ============================================================================
-- 3. RPC: complete_student_onboarding_v2
--    Schließt die Aktivierung ab (Eltern-PIN setzen, Freigaben speichern).
--    Unterstützt sowohl Einmal-Tokens als auch Ausweis-QR-Tokens.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.complete_student_onboarding_v2(
    p_token             UUID,
    p_parent_pin_6      TEXT,
    p_student_pin_4     TEXT,
    p_campus_usage_mode TEXT,
    p_parent_permissions JSONB,
    p_parent_name       TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $$
DECLARE
    v_token_rec   RECORD;
    v_user_id     UUID := NULL;
    v_school_id   UUID;
    v_is_already  BOOLEAN := false;
BEGIN
    IF p_token IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kein Token angegeben.');
    END IF;

    IF p_parent_pin_6 IS NULL OR length(trim(p_parent_pin_6)) != 6 OR trim(p_parent_pin_6) !~ '^\d{6}$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Die Eltern-PIN muss genau 6 Ziffern enthalten.');
    END IF;

    -- 1. Prüfen ob Einmal-Token
    SELECT * INTO v_token_rec
    FROM public.student_onboarding_tokens
    WHERE token = p_token
    LIMIT 1;

    IF v_token_rec.id IS NOT NULL THEN
        IF v_token_rec.used_at IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', false, 
                'is_already_activated', true,
                'error', 'Dieser Einladungs-Link wurde bereits verwendet. Das Profil ist bereits aktiv.'
            );
        END IF;
        IF v_token_rec.created_at < (NOW() - INTERVAL '30 days') THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Dieser Einladungs-Link ist nach 30 Tagen abgelaufen.'
            );
        END IF;
        v_user_id := v_token_rec.student_id;
    END IF;

    -- 2. Falls kein Einmal-Token: Suche über users_raw (Ausweis-QR-Token / ID)
    IF v_user_id IS NULL THEN
        SELECT id, is_pin_activated INTO v_user_id, v_is_already
        FROM public.users_raw
        WHERE (qr_token = p_token OR id = p_token) AND role = 'student'
        LIMIT 1;

        IF v_is_already THEN
            RETURN jsonb_build_object(
                'success', false, 
                'is_already_activated', true,
                'error', 'Dieses Schülerprofil ist bereits aktiviert. Keine PIN-Neuvergabe über den Ausweis möglich.'
            );
        END IF;
    END IF;

    -- 3. Fallback: students-Tabelle
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id
        FROM public.students
        WHERE id = p_token
        LIMIT 1;
    END IF;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiger oder abgelaufener Token.');
    END IF;

    SELECT school_id INTO v_school_id FROM public.users_raw WHERE id = v_user_id;

    -- 4. Eltern-PIN serverseitig hashen (bcrypt) und Freigaben speichern
    UPDATE public.users
    SET
        parent_pin       = crypt(trim(p_parent_pin_6), gen_salt('bf', 10)),
        personal_pin     = CASE
                             WHEN p_student_pin_4 IS NOT NULL AND trim(p_student_pin_4) ~ '^\d{4}$'
                             THEN crypt(trim(p_student_pin_4), gen_salt('bf', 10))
                             ELSE personal_pin
                           END,
        is_pin_activated = true,
        is_active        = true,
        app_usage_mode   = COALESCE(p_campus_usage_mode, 'selbstnutzer'),
        is_campus_active = true,
        parental_consent_given_at = NOW(),
        parent_permissions = COALESCE(p_parent_permissions, '{}'::jsonb),
        parent_allow_chat   = COALESCE((p_parent_permissions->>'allow_chat')::boolean, false),
        parent_allow_timer  = COALESCE((p_parent_permissions->>'allow_timer')::boolean, false),
        parent_allow_audio  = COALESCE((p_parent_permissions->>'allow_student_audio')::boolean, false),
        parent_allow_absences = COALESCE((p_parent_permissions->>'allow_absences')::boolean, false)
    WHERE id = v_user_id;

    -- 5. Falls Einmal-Token verwendet wurde: als verbraucht markieren
    IF v_token_rec.id IS NOT NULL THEN
        UPDATE public.student_onboarding_tokens
        SET used_at = NOW()
        WHERE id = v_token_rec.id;
    END IF;

    -- 6. Revisionssicheres Audit-Log schreiben
    INSERT INTO public.audit_logs (
        action, school_id, target_id, performed_by, metadata, created_at
    ) VALUES (
        'STUDENT_ONBOARDING_COMPLETED_V2',
        v_school_id,
        v_user_id,
        v_user_id,
        jsonb_build_object(
            'consent_version', 'v2.0',
            'campus_usage_mode', p_campus_usage_mode,
            'token_type', CASE WHEN v_token_rec.id IS NOT NULL THEN 'single_use_invitation' ELSE 'id_badge_qr' END,
            'timestamp', NOW()::text
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'student_id', v_user_id,
        'message', 'Onboarding erfolgreich abgeschlossen.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_student_onboarding_v2(UUID, TEXT, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_student_onboarding_v2(UUID, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated, service_role;
