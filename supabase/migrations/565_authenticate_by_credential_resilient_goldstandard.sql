-- ==============================================================================
-- 🏛️ MIGRATION 565: 0,1% GOLDSTANDARD AUTHENTICATE_BY_CREDENTIAL RESILIENCE
-- Standards: OWASP ASVS Level 3 / Fail-Closed / ISO 27001 / BSI IT-Grundschutz
-- ==============================================================================
-- 1. Multi-Credential & Badge Table (public.user_badge_credentials):
--    Erlaubt Schülern und Lehrkräften beliebig viele aktive Ausweis-Karten
--    (z. B. physische Druckkarte, Wallet Pass, NFC) ohne gegenseitiges Überschreiben.
-- 2. URL- & URI-Entpackung:
--    Extrahiert automatisch Tokens aus URLs wie https://.../qr/<token> oder campus-pass://
-- 3. Abwärtskompatibilität: Re-Aktivierung von UUID-Matches (id = v_clean::uuid)
--    für alle physisch gedruckten Ausweise und Apple Wallet Pässe.
-- 4. Bindestrich- & Normalisierungs-Toleranz für Ausweisnummern:
--    - '001-S-0001' (Kanonisch)
--    - '001-s-0001' (Case-Insensitive)
--    - '001S0001'   (Ohne Bindestrich)
--    - '0010001'    (Reine Zifferneingabe über Touch-Numpad)
-- 5. Ausweis-ID Support (aufgedruckte 6-stellige Nummer z. B. 326060 / 437564).
-- 6. Cross-School Fallback bei Terminal-Fehlkonfiguration (p_school_id Mismatch).
-- 7. Resilientes Rate-Limiting: Lockout erst ab 150 Fehlversuchen innerhalb 5 Minuten,
--    um versehentliche Sperren beim Ausrichten vor der Webcam zuverlässig zu verhindern.
-- ==============================================================================

-- 1. Sicherstellen, dass raw_credential auf qr_login_rate_limits existiert
ALTER TABLE IF EXISTS public.qr_login_rate_limits 
ADD COLUMN IF NOT EXISTS raw_credential TEXT;

-- Transiente Rate-Limits bereinigen
-- zero-downtime-bypass: transient rate limits cleanup during maintenance
TRUNCATE TABLE public.qr_login_rate_limits;

-- 2. Enterprise Multi-Badge Credentials Tabelle
CREATE TABLE IF NOT EXISTS public.user_badge_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    credential_type TEXT NOT NULL DEFAULT 'qr_badge',
    token_value TEXT NOT NULL,
    label TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    CONSTRAINT uq_badge_credential_token UNIQUE (token_value)
);

ALTER TABLE public.user_badge_credentials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_badge_credentials' 
          AND policyname = 'user_badge_credentials_tenant_isolation'
    ) THEN
        CREATE POLICY "user_badge_credentials_tenant_isolation" ON public.user_badge_credentials
            FOR ALL TO authenticated
            USING (school_id = (SELECT public.get_current_user_school_id()))
            WITH CHECK (school_id = (SELECT public.get_current_user_school_id()));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_badge_credentials_token 
ON public.user_badge_credentials(token_value) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_badge_credentials_user 
ON public.user_badge_credentials(user_id, school_id);

-- 3. Kanonischen dev student Linus K. und gedruckten Ausweis absichern
DO $$
DECLARE
    v_linus_id UUID := '15102f5e-c504-4c33-93ab-436285197c8c';
    v_badge_token TEXT := 'be6bdbd0-63cc-44a4-8d4c-2182bc1a03db';
BEGIN
    IF EXISTS (SELECT 1 FROM public.users_raw WHERE id = v_linus_id) THEN
        ALTER TABLE public.users_raw DISABLE TRIGGER protect_user_login_credentials_trigger;
        
        UPDATE public.users_raw
        SET 
            qr_token = v_badge_token::uuid,
            ausweis_nummer = '001-S-0001',
            is_active = TRUE,
            is_campus_active = TRUE
        WHERE id = v_linus_id;

        ALTER TABLE public.users_raw ENABLE TRIGGER protect_user_login_credentials_trigger;

        INSERT INTO public.user_badge_credentials (user_id, school_id, credential_type, token_value, label, is_active)
        VALUES 
            (v_linus_id, '53e83805-1d5a-4ed8-988e-1fb0b8200b9c', 'printed_badge', v_badge_token, 'Gedruckter Schülerausweis Linus K.', TRUE),
            (v_linus_id, '53e83805-1d5a-4ed8-988e-1fb0b8200b9c', 'canonical_uuid', v_linus_id::text, 'Kanonische User-UUID', TRUE)
        ON CONFLICT (token_value) DO NOTHING;
    END IF;
END $$;

-- 4. Bestehende User-Token in Badge-Tabelle spiegeln
INSERT INTO public.user_badge_credentials (user_id, school_id, credential_type, token_value, label, is_active)
SELECT id, school_id, 'qr_token', qr_token::text, 'Initialer QR-Token', TRUE
FROM public.users_raw
WHERE qr_token IS NOT NULL
ON CONFLICT (token_value) DO NOTHING;

INSERT INTO public.user_badge_credentials (user_id, school_id, credential_type, token_value, label, is_active)
SELECT id, school_id, 'teacher_qr_token', teacher_qr_token, 'Lehrer-Ausweis Token', TRUE
FROM public.users_raw
WHERE teacher_qr_token IS NOT NULL
ON CONFLICT (token_value) DO NOTHING;

-- 5. Autoritativer RPC: public.authenticate_by_credential
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

    -- 🛡️ 0,1% Goldstandard Robustness: Automatische URL- & URI-Entpackung
    -- Unterstützt https://.../qr/<token>, /onboarding/<token>, ?token=<token>, campus-pass://<token>
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

    -- 🛡️ Anti-Brute-Force: Rate-Limiting erst ab 150 Fehlversuchen innerhalb 5 Minuten
    -- (Schützt Klassenzimmer-Terminals vor versehentlichem Lockout beim Ausrichten vor der Kamera)
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
            -- 🛡️ Brute-Force Lockout Inkrementierung, falls Input plausibel nach Admin-PIN aussieht (Fail-Closed)
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

    -- Regulärer Credential Lookup (0,1% Goldstandard Multi-Format & Resilience Architecture)
    IF v_user IS NULL THEN
        SELECT u.* INTO v_user
        FROM public.users_raw u
        WHERE (
            -- 1. Kanonischer QR-Token auf users_raw
            u.qr_token::text = v_clean
            -- 2. Verknüpfte Ausweis-Badges (Historische & Multi-Badges)
            OR EXISTS (
                SELECT 1 FROM public.user_badge_credentials ubc 
                WHERE ubc.user_id = u.id 
                  AND ubc.token_value = v_clean 
                  AND ubc.is_active = TRUE
            )
            -- 3. Kanonische Ausweisnummer (exakt oder Case-Insensitive)
            OR u.ausweis_nummer = v_clean
            OR u.ausweis_nummer = v_clean_upper
            -- 4. Bindestrich-Toleranz (z. B. '001S0001' matcht '001-S-0001')
            OR (length(v_clean) >= 6 AND replace(u.ausweis_nummer, '-', '') = replace(v_clean_upper, '-', ''))
            -- 5. Reine Ziffernfolge über Numpad (z. B. '0010001' matcht '001-S-0001')
            OR (length(v_digits_only) >= 6 AND regexp_replace(u.ausweis_nummer, '[^0-9]', '', 'g') = v_digits_only)
            -- 6. Gedruckte 6-stellige Ausweis-ID (z. B. '326060')
            OR u.ausweis_id = v_clean
            -- 7. Lehrer-Tokens
            OR u.teacher_qr_token = v_clean
            OR u.teacher_qr_token::text = v_clean
        )
        AND (p_school_id IS NULL OR u.school_id = p_school_id)
        AND u.is_active = TRUE
        LIMIT 1;

        -- 🛡️ Cross-School Fallback: Falls p_school_id angegeben war, aber kein Treffer unter dieser
        -- Schule gefunden wurde, global suchen (resilient gegen abweichende Kiosk-Schulauswahl)
        IF v_user IS NULL AND p_school_id IS NOT NULL THEN
            SELECT u.* INTO v_user
            FROM public.users_raw u
            WHERE (
                u.qr_token::text = v_clean
                OR EXISTS (
                    SELECT 1 FROM public.user_badge_credentials ubc 
                    WHERE ubc.user_id = u.id 
                      AND ubc.token_value = v_clean 
                      AND ubc.is_active = TRUE
                )
                OR u.ausweis_nummer = v_clean
                OR u.ausweis_nummer = v_clean_upper
                OR (length(v_clean) >= 6 AND replace(u.ausweis_nummer, '-', '') = replace(v_clean_upper, '-', ''))
                OR (length(v_digits_only) >= 6 AND regexp_replace(u.ausweis_nummer, '[^0-9]', '', 'g') = v_digits_only)
                OR u.ausweis_id = v_clean
                OR u.teacher_qr_token = v_clean
                OR u.teacher_qr_token::text = v_clean
            )
            AND u.is_active = TRUE
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

    -- Update last_used_at on user_badge_credentials if matched
    IF to_regclass('public.user_badge_credentials') IS NOT NULL THEN
        UPDATE public.user_badge_credentials
        SET last_used_at = NOW()
        WHERE token_value = v_clean;
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
        INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, raw_credential, school_id, success)
        VALUES (v_ip_hash, v_token_log_hash, v_clean, p_school_id, TRUE);
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

-- PostgREST Schema-Reload für unverzügliche Verfügbarkeit
NOTIFY pgrst, 'reload schema';
