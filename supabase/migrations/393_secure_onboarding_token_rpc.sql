-- ============================================================================
-- Migration 393: Rechtskonforme Einmal-Onboarding-Token-Architektur
-- DSGVO Art. 25 (Privacy by Design), Art. 32 (Sicherheit der Verarbeitung)
-- BSI TR-03107 (Authentisierungsniveaus für Minderjährige)
-- § 8 DSGVO i.V.m. § 8a SGB VIII (Schutz Minderjähriger)
-- ============================================================================

-- ============================================================================
-- 1. RPC: generate_student_onboarding_token
--    Erzeugt einen sicheren Einmaltoken in student_onboarding_tokens.
--    Ersetzt die bisherige Praxis, den permanenten qr_token als URL zu verteilen.
--    Darf nur von authentifizierten Lehrern / Admins der eigenen Schule aufgerufen werden.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_student_onboarding_token(
    p_student_user_id UUID  -- Die user.id des Schülers (NICHT der qr_token)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $$
DECLARE
    v_caller_id    UUID := auth.uid();
    v_caller_role  TEXT;
    v_caller_school UUID;
    v_student_school UUID;
    v_new_token    UUID := gen_random_uuid();
    v_existing_token UUID;
BEGIN
    -- ── Caller-Identität sicherstellen ──────────────────────────────────────
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nicht authentifiziert.');
    END IF;

    SELECT role, school_id
    INTO v_caller_role, v_caller_school
    FROM public.users_raw
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('teacher', 'admin', 'secretary') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Keine Berechtigung.');
    END IF;

    -- ── Schüler muss zur gleichen Schule gehören (Mandantentrennung) ─────────
    SELECT school_id INTO v_student_school
    FROM public.users_raw
    WHERE id = p_student_user_id AND role = 'student';

    IF v_student_school IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Schüler nicht gefunden.');
    END IF;

    IF v_student_school != v_caller_school THEN
        RETURN jsonb_build_object('success', false, 'error', 'Zugriff verweigert (andere Schule).');
    END IF;

    -- ── Noch nicht abgelaufene, unbenutzte Tokens für diesen Schüler ungültig machen ──
    -- Verhindert Token-Akkumulation (DSGVO Datensparsamkeit Art. 5 Abs. 1 lit. c)
    UPDATE public.student_onboarding_tokens
    SET used_at = NOW()
    WHERE student_id = p_student_user_id
      AND used_at IS NULL
      AND created_at > (NOW() - INTERVAL '30 days');

    -- ── Neuen Einmaltoken anlegen ────────────────────────────────────────────
    INSERT INTO public.student_onboarding_tokens (id, student_id, token, created_at)
    VALUES (gen_random_uuid(), p_student_user_id, v_new_token, NOW());

    RETURN jsonb_build_object(
        'success', true,
        'token',   v_new_token,
        'expires_at', (NOW() + INTERVAL '30 days')
    );
END;
$$;

-- Revoke any accidental public execute
REVOKE ALL ON FUNCTION public.generate_student_onboarding_token(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_student_onboarding_token(UUID) TO authenticated;

-- ============================================================================
-- 2. RPC: get_student_onboarding_preview
--    Liest Schülerdaten über den Einmaltoken aus.
--    Zero-Trust: Kein direkter Tabellenzugriff vom Client.
--    Zero-PII: Gibt nur Vorname, Nachname-Initial, Instrument, Schulname, Logo zurück.
--    Schlägt der Token fehl → NULL (Fail-Closed).
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
    v_token_rec   RECORD;
    v_user_rec    RECORD;
    v_school_rec  RECORD;
    v_first_name  TEXT;
    v_last_initial TEXT;
BEGIN
    IF p_token IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kein Token angegeben.');
    END IF;

    -- ── Token validieren (Einmalig, max. 30 Tage, unbenutzt) ─────────────────
    SELECT * INTO v_token_rec
    FROM public.student_onboarding_tokens
    WHERE token = p_token
      AND used_at IS NULL
      AND created_at > (NOW() - INTERVAL '30 days');

    IF v_token_rec.id IS NULL THEN
        -- Prüfen ob bereits verwendet oder abgelaufen für sprechende Fehlermeldung
        PERFORM 1 FROM public.student_onboarding_tokens WHERE token = p_token AND used_at IS NOT NULL;
        IF FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Dieser Einladungs-Link wurde bereits verwendet.');
        END IF;
        PERFORM 1 FROM public.student_onboarding_tokens WHERE token = p_token;
        IF FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Dieser Einladungs-Link ist abgelaufen (30 Tage). Bitte eine neue Einladung anfordern.');
        END IF;
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiger Einladungs-Link.');
    END IF;

    -- ── Schülerdaten laden (Zero-Secret: nur nicht-sensible Felder) ───────────
    SELECT
        u.id,
        u.school_id,
        u.instrument,
        u.is_pin_activated,
        u.is_campus_active,
        u.is_groovelab_active,
        u.campus_ui_level,
        u.app_usage_mode,
        u.qr_token
    INTO v_user_rec
    FROM public.users_raw u
    WHERE u.id = v_token_rec.student_id AND u.role = 'student';

    IF v_user_rec.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Schüler nicht gefunden.');
    END IF;

    -- ── Verschlüsselten Vornamen entschlüsseln (serverseitig) ──────────────
    BEGIN
        SELECT pgp_sym_decrypt(sfn.first_name, public.get_encryption_key())
        INTO v_first_name
        FROM public.student_first_names sfn
        WHERE sfn.student_id = v_user_rec.id
        LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        v_first_name := NULL;
    END;

    -- ── Nachnamen-Initial (nur 1. Buchstabe + Punkt) ──────────────────────
    BEGIN
        SELECT LEFT(sln.last_name, 1) || '.'
        INTO v_last_initial
        FROM public.student_last_names sln
        WHERE sln.student_id = v_user_rec.id
        LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        v_last_initial := NULL;
    END;

    -- ── Schuldaten (öffentlich) ───────────────────────────────────────────
    SELECT
        s.name,
        s.logo_url,
        s.primary_color
    INTO v_school_rec
    FROM public.schools s
    WHERE s.id = v_user_rec.school_id;

    -- ── Erfolg: Nur anonymisierte, nicht-sensible Daten zurückgeben ────────
    -- NIEMALS: qr_token, password_hash, parent_pin, personal_pin, two_factor_secret
    RETURN jsonb_build_object(
        'success',          true,
        'student', jsonb_build_object(
            'id',               v_user_rec.id,
            'school_id',        v_user_rec.school_id,
            'first_name',       COALESCE(v_first_name, ''),
            'last_initial',     COALESCE(v_last_initial, ''),
            'instrument',       COALESCE(v_user_rec.instrument, ''),
            'campus_ui_level',  COALESCE(v_user_rec.campus_ui_level, 'standard'),
            'is_pin_activated', COALESCE(v_user_rec.is_pin_activated, false),
            'is_campus_active', COALESCE(v_user_rec.is_campus_active, false),
            'campus_usage_mode', COALESCE(v_user_rec.app_usage_mode, 'selbstnutzer'),
            'school_name',      COALESCE(v_school_rec.name, ''),
            'school_logo',      COALESCE(v_school_rec.logo_url, ''),
            'school_color',     COALESCE(v_school_rec.primary_color, '#34a853'),
            -- Einmal-Token-Metadaten für UI-Feedback
            'onboarding_token', p_token,
            'token_expires_at', (v_token_rec.created_at + INTERVAL '30 days')
        )
    );
END;
$$;

-- Öffentlich aufrufbar (anon + authenticated) — kein Login nötig für Eltern-Onboarding
REVOKE ALL ON FUNCTION public.get_student_onboarding_preview(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_onboarding_preview(UUID) TO anon, authenticated;

-- ============================================================================
-- 3. RPC: complete_student_onboarding_v2
--    Schließt das Onboarding ab: setzt PIN, Eltern-Freigaben, markiert Token als benutzt.
--    Idempotent: Kann mehrfach aufgerufen werden ohne Schaden.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.complete_student_onboarding_v2(
    p_token             UUID,        -- Einmaltoken aus student_onboarding_tokens
    p_parent_pin_6      TEXT,        -- 6-stellige Eltern-PIN
    p_student_pin_4     TEXT,        -- Optional: 4-stellige Schüler-PIN
    p_campus_usage_mode TEXT,        -- 'selbstnutzer' | 'eltern_geführt'
    p_parent_permissions JSONB,      -- Granulare Freigaben
    p_parent_name       TEXT         -- Optional: Vorname des Elternteils
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $$
DECLARE
    v_token_rec   RECORD;
    v_user_id     UUID;
    v_school_id   UUID;
    v_timestamp   TEXT := NOW()::TEXT;
BEGIN
    -- ── Input-Validierung ─────────────────────────────────────────────────
    IF p_token IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Token fehlt.');
    END IF;

    IF p_parent_pin_6 IS NULL OR length(trim(p_parent_pin_6)) != 6 OR trim(p_parent_pin_6) !~ '^\d{6}$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Eltern-PIN muss exakt 6 Ziffern haben.');
    END IF;

    -- ── Token validieren ─────────────────────────────────────────────────
    SELECT * INTO v_token_rec
    FROM public.student_onboarding_tokens
    WHERE token = p_token
      AND used_at IS NULL
      AND created_at > (NOW() - INTERVAL '30 days');

    IF v_token_rec.id IS NULL THEN
        PERFORM 1 FROM public.student_onboarding_tokens WHERE token = p_token AND used_at IS NOT NULL;
        IF FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Onboarding bereits abgeschlossen. Bitte einloggen.');
        END IF;
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiger oder abgelaufener Onboarding-Link.');
    END IF;

    v_user_id := v_token_rec.student_id;

    SELECT school_id INTO v_school_id FROM public.users_raw WHERE id = v_user_id;

    -- ── PIN serverseitig hashen und setzen (Zero-Trust: kein Plaintext-Vergleich im Client) ──
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

    -- ── Token als benutzt markieren (Einmalig-Garantie) ─────────────────
    UPDATE public.student_onboarding_tokens
    SET used_at = NOW()
    WHERE token = p_token AND student_id = v_user_id;

    -- ── Audit-Log (unveränderbar) ─────────────────────────────────────────
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
            'permissions', p_parent_permissions,
            'token_invalidated', p_token,
            'timestamp', v_timestamp
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
GRANT EXECUTE ON FUNCTION public.complete_student_onboarding_v2(UUID, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated;

-- ============================================================================
-- 4. Sicherheitsindex: Token-Lookup performant machen
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_student_onboarding_tokens_token
    ON public.student_onboarding_tokens (token)
    WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_student_onboarding_tokens_student_active
    ON public.student_onboarding_tokens (student_id, created_at DESC)
    WHERE used_at IS NULL;

-- ============================================================================
-- 5. DSGVO Art. 17 / Datensparsamkeit: Abgelaufene Tokens automatisch bereinigen
--    (Tokens > 30 Tage, bereits verwendet oder abgelaufen)
-- ============================================================================
-- Wird durch den bestehenden enterprise_data_lifecycle_maintenance Cronjob abgedeckt.
-- Sicherheitshalber zusätzliche Cleanup-Funktion:
CREATE OR REPLACE FUNCTION public.cleanup_expired_onboarding_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM public.student_onboarding_tokens
    WHERE used_at IS NOT NULL
       OR created_at < (NOW() - INTERVAL '31 days');
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_onboarding_tokens() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_onboarding_tokens() TO authenticated;
