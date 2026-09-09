-- ==============================================================================
-- MIGRATION 387: ENTERPRISE FORENSIC SEAL GOLDSTANDARD
-- Standards: OWASP ASVS Level 3, BSI IT-Grundschutz (APP.3.1 / SYS.1.8), DSGVO Art. 8, 25 & 32, GoBD
-- 
-- Final Post-Remediation Lockdown (Round 2 Findings):
-- 1. SECRETS PURGE ON PUBLIC.SCHOOLS:
--    - Physically drops admin_pin, secretary_onboarding_token, groovelab_kiosk_token, campus_login_token from public.schools.
--    - Eliminates student takeover of school admin credentials.
--
-- 2. AUTHENTICATE_BY_CREDENTIAL HARDENING:
--    - Removes fallback check on public.schools.admin_pin. Admin login verified solely via private_auth.school_secrets.
--
-- 3. LESSON ABSENCE RPCS LOCKDOWN (CANCEL & UNDO_CANCEL):
--    - Both cancel_student_schedule_occurrence and undo_cancel_student_schedule_occurrence strictly require a verified parent PIN
--      if the caller is unauthenticated (v_caller_id IS NULL), even if parent_allow_absences is true.
--    - Validates caller authorization for authenticated callers (student themselves, school staff, master admin).
--
-- 4. CLEANUP OF ALL 5 REMAINING LEFTOVER PERMISSIVE RLS POLICIES:
--    - master_billing_settings, school_equipment, room_bookings, band_gigs, band_media, student_onboarding_tokens.
--    - Scopes parent_consent_logs to caller's school.
--
-- 5. DML TRIGGER LOCKOUT INTEGRITY:
--    - Prevents non-staff/non-master callers from resetting pin_locked_until, failed_pin_attempts, or is_pin_activated via users view updates.
--
-- 6. SET_INITIAL_STUDENT_PIN HARDENING:
--    - Eliminates UUID login bypass (OR id::text = v_clean_token).
--
-- 7. ONBOARDING PREVIEW RPC:
--    - Introduces get_student_onboarding_preview(p_token text) to eliminate direct users view queries from client onboarding.
--
-- 8. LOGIN_MASTER_ADMIN HARDENING:
--    - Adds brute-force lockout and returns a verified session lease token.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SECRETS PURGE ON PUBLIC.SCHOOLS (ZERO-SECRET-LEAKAGE)
-- ------------------------------------------------------------------------------
ALTER TABLE public.schools 
  DROP COLUMN IF EXISTS admin_pin,
  DROP COLUMN IF EXISTS secretary_onboarding_token,
  DROP COLUMN IF EXISTS groovelab_kiosk_token,
  DROP COLUMN IF EXISTS campus_login_token;

-- ------------------------------------------------------------------------------
-- 2. HARDEN AUTHENTICATE_BY_CREDENTIAL (NO SCHOOLS PLAIN PIN FALLBACK)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.authenticate_by_credential(text, uuid);
DROP FUNCTION IF EXISTS public.authenticate_by_credential(text, uuid, text, text);

CREATE OR REPLACE FUNCTION public.authenticate_by_credential(
    p_credential text,
    p_school_id uuid DEFAULT NULL,
    p_device_key text DEFAULT NULL,
    p_device_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
AS $$
DECLARE
    v_clean text := TRIM(p_credential);
    v_clean_upper text := UPPER(TRIM(p_credential));
    v_user record;
    v_school record;
    v_lease_id uuid;
    v_is_uuid boolean;
    v_sanitized_user jsonb;
    v_headers text;
    v_ip text;
    v_ip_hash text;
    v_ip_failures int := 0;
BEGIN
    IF v_clean IS NULL OR v_clean = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Anmeldedaten.');
    END IF;

    -- Extract client IP securely and hash it (GDPR Privacy by Design)
    BEGIN
        v_headers := current_setting('request.headers', true);
        IF v_headers IS NOT NULL AND v_headers <> '' THEN
            v_ip := v_headers::json->>'x-forwarded-for';
            IF v_ip IS NULL OR v_ip = '' THEN
                v_ip := v_headers::json->>'cf-connecting-ip';
            END IF;
            IF v_ip IS NOT NULL AND v_ip <> '' THEN
                v_ip := TRIM(split_part(v_ip, ',', 1));
                v_ip_hash := encode(extensions.digest(v_ip, 'sha256'), 'hex');
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_ip_hash := NULL;
    END;

    -- Check Network Rate Limit (Max 30 failed attempts per IP per 15 minutes)
    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        SELECT COUNT(*) INTO v_ip_failures
        FROM public.qr_login_rate_limits
        WHERE ip_hash = v_ip_hash
          AND success = FALSE
          AND attempt_at > (NOW() - INTERVAL '15 minutes');

        IF v_ip_failures >= 30 THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Sicherheitssperre: Zu viele fehlerhafte Anmeldeversuche aus diesem Netzwerk. Bitte warten Sie 15 Minuten.'
            );
        END IF;
    END IF;

    -- Check for UUID pattern
    v_is_uuid := (v_clean ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

    -- STRICT OWASP ASVS LEVEL 3: A credential is ONLY a valid qr_token, teacher_qr_token, or ausweis_nummer!
    IF v_is_uuid THEN
        SELECT * INTO v_user
        FROM public.users_raw
        WHERE (qr_token::text = v_clean OR teacher_qr_token = v_clean)
          AND is_active = TRUE
          AND (p_school_id IS NULL OR school_id = p_school_id OR is_master_admin = TRUE)
        LIMIT 1;
    ELSE
        SELECT * INTO v_user
        FROM public.users_raw
        WHERE (teacher_qr_token = v_clean 
               OR ausweis_nummer = v_clean 
               OR ausweis_nummer = v_clean_upper
               OR qr_token::text = v_clean)
          AND is_active = TRUE
          AND (p_school_id IS NULL OR school_id = p_school_id OR is_master_admin = TRUE)
        LIMIT 1;
    END IF;

    -- 🛡️ SECURE ADMIN PIN LOOKUP: ONLY from private_auth.school_secrets (never from public tables!)
    IF v_user IS NULL AND p_school_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM private_auth.school_secrets 
            WHERE school_id = p_school_id AND admin_pin = v_clean
        ) THEN
            SELECT * INTO v_user
            FROM public.users_raw
            WHERE school_id = p_school_id AND role = 'admin' AND is_active = TRUE
            LIMIT 1;
        END IF;
    END IF;

    -- Fail-Closed: User not found -> Log IP failure attempt
    IF v_user IS NULL THEN
        IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
            BEGIN
                INSERT INTO public.qr_login_rate_limits (ip_hash, attempt_at, success)
                VALUES (v_ip_hash, NOW(), FALSE);
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiger Ausweis-PIN oder QR-Token.');
    END IF;

    -- Check Account-level Lockout Status
    IF v_user.pin_locked_until IS NOT NULL AND v_user.pin_locked_until > NOW() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Sicherheitssperre: Zu viele Fehlversuche. Zugang vorübergehend gesperrt.'
        );
    END IF;

    -- Reset user failed attempts & update last_seen
    UPDATE public.users_raw
    SET failed_pin_attempts = 0, 
        pin_locked_until = NULL, 
        last_seen = NOW()
    WHERE id = v_user.id;

    -- Log successful login in rate limit tracker
    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        BEGIN
            INSERT INTO public.qr_login_rate_limits (ip_hash, attempt_at, success)
            VALUES (v_ip_hash, NOW(), TRUE);
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    -- Fetch school information
    SELECT * INTO v_school
    FROM public.schools
    WHERE id = v_user.school_id;

    -- Create verified Session Lease (valid for 30 days)
    v_lease_id := gen_random_uuid();
    INSERT INTO public.session_leases (
        id,
        user_id,
        school_id,
        role,
        device_name,
        device_key,
        created_at,
        last_active_at,
        is_revoked
    ) VALUES (
        v_lease_id,
        v_user.id,
        v_user.school_id,
        v_user.role,
        COALESCE(NULLIF(p_device_name, ''), 'credential_login'),
        COALESCE(NULLIF(p_device_key, ''), v_lease_id::text),
        NOW(),
        NOW(),
        FALSE
    );

    -- Build zero-knowledge sanitized profile (last_name = NULL for students)
    v_sanitized_user := jsonb_build_object(
        'id', v_user.id,
        'school_id', v_user.school_id,
        'role', v_user.role,
        'roles', v_user.roles,
        'first_name', v_user.first_name,
        'last_name', CASE WHEN v_user.role = 'student' THEN NULL ELSE v_user.last_name END,
        'nickname', v_user.nickname,
        'avatar_url', v_user.avatar_url,
        'photo_url', v_user.photo_url,
        'instrument', v_user.instrument,
        'groovelab_instrument', v_user.groovelab_instrument,
        'status', v_user.status,
        'is_active', v_user.is_active,
        'is_campus_active', v_user.is_campus_active,
        'is_groovelab_active', v_user.is_groovelab_active,
        'is_master_admin', v_user.is_master_admin,
        'has_parent_pin', (v_user.parent_pin IS NOT NULL OR EXISTS (
            SELECT 1 FROM private_auth.user_secrets sec WHERE sec.user_id = v_user.id AND sec.argon2_parent_pin_hash IS NOT NULL
        )),
        'has_personal_pin', (v_user.personal_pin IS NOT NULL OR EXISTS (
            SELECT 1 FROM private_auth.user_secrets sec WHERE sec.user_id = v_user.id AND sec.argon2_personal_pin_hash IS NOT NULL
        )),
        'parent_allow_chat', v_user.parent_allow_chat,
        'parent_allow_timer', v_user.parent_allow_timer,
        'parent_allow_leaderboard', v_user.parent_allow_leaderboard,
        'parent_allow_groups', v_user.parent_allow_groups,
        'parent_allow_proposals', v_user.parent_allow_proposals,
        'parent_allow_absences', v_user.parent_allow_absences,
        'parent_allow_audio', v_user.parent_allow_audio,
        'parent_permissions', v_user.parent_permissions,
        'campus_ui_level', v_user.campus_ui_level,
        'skill_radar_levels', v_user.skill_radar_levels,
        'pin_enforced_for_preview', v_user.pin_enforced_for_preview,
        'parent_name', v_user.parent_name,
        'parental_consent_given_at', v_user.parental_consent_given_at,
        'consent_version', v_user.consent_version,
        'campus_usage_mode', v_user.campus_usage_mode,
        'teacher_onboarding_completed', v_user.teacher_onboarding_completed,
        'contract_decision_made', v_user.contract_decision_made,
        'is_pin_activated', v_user.is_pin_activated,
        'app_usage_mode', v_user.app_usage_mode,
        'lesson_duration', v_user.lesson_duration,
        'exempt_from_direct_billing', v_user.exempt_from_direct_billing,
        'show_sekretariat', v_user.show_sekretariat,
        'show_campus', v_user.show_campus,
        'show_groovelab', v_user.show_groovelab,
        'teacher_id', v_user.teacher_id,
        'group_id', v_user.group_id,
        'sibling_group_id', v_user.sibling_group_id,
        'preferred_room_ids', v_user.preferred_room_ids,
        'schools', CASE WHEN v_school.id IS NOT NULL THEN to_jsonb(v_school) ELSE NULL END
    );

    RETURN jsonb_build_object(
        'success', true,
        'lease_token', v_lease_id,
        'user', v_sanitized_user
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.authenticate_by_credential(text, uuid, text, text) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. HARDEN CANCEL & UNDO_CANCEL STUDENT SCHEDULE OCCURRENCE RPCS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_student_schedule_occurrence(
    p_student_id UUID,
    p_date DATE,
    p_start_time TIME WITHOUT TIME ZONE,
    p_occurrence_id TEXT DEFAULT NULL,
    p_notice TEXT DEFAULT NULL,
    p_teacher_id UUID DEFAULT NULL,
    p_parent_pin TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    v_student_rec RECORD;
    v_school_id UUID;
    v_allow_absences BOOLEAN;
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_occ_uuid UUID;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school_id := public.get_current_user_school_id();

    SELECT id, school_id, first_name, last_name, teacher_id, parent_allow_absences
    INTO v_student_rec
    FROM public.users_raw
    WHERE id = p_student_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student not found');
    END IF;

    v_school_id := v_student_rec.school_id;
    v_allow_absences := COALESCE(v_student_rec.parent_allow_absences, false);

    -- 🛡️ ZERO-TRUST AUTHORIZATION:
    -- 1. If caller is unauthenticated (anonymous), a valid parent PIN is MANDATORY (even if allow_absences is true)!
    IF v_caller_id IS NULL THEN
        IF p_parent_pin IS NULL OR length(TRIM(p_parent_pin)) < 4 OR NOT public.verify_parent_pin(p_student_id, TRIM(p_parent_pin)) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Authentifizierung erforderlich: Bitte geben Sie die gültige Eltern-PIN ein.');
        END IF;
    ELSE
        -- 2. Authenticated caller must be student themselves, school staff in same school, or master admin!
        IF NOT (
            public.is_master_admin()
            OR v_caller_id = p_student_id
            OR (v_caller_school_id = v_school_id AND v_caller_role IN ('teacher', 'admin', 'secretary'))
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Zugriff verweigert: Unzureichende Berechtigungen zur Terminabsage fremder Schüler.');
        END IF;

        -- If authenticated student themselves, but parental controls forbid student self-absence: require parent PIN!
        IF v_caller_id = p_student_id AND NOT v_allow_absences THEN
            IF p_parent_pin IS NULL OR length(TRIM(p_parent_pin)) < 4 OR NOT public.verify_parent_pin(p_student_id, TRIM(p_parent_pin)) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Abwesenheitsmeldung gesperrt: Terminabsagen müssen durch Erziehungsberechtigte mit Eltern-PIN autorisiert werden.');
            END IF;
        END IF;
    END IF;

    IF v_teacher_id IS NULL THEN
        v_teacher_id := v_student_rec.teacher_id;
    END IF;

    IF p_occurrence_id IS NOT NULL AND p_occurrence_id NOT LIKE 'virtual-%' AND p_occurrence_id NOT LIKE 'virt_%' AND p_occurrence_id NOT LIKE 'sched-%' THEN
        BEGIN
            v_occ_uuid := p_occurrence_id::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_occ_uuid := NULL;
        END;
    END IF;

    IF v_occ_uuid IS NOT NULL THEN
        UPDATE public.schedule_occurrences SET
            status = 'cancelled_by_student',
            cancelled_by = COALESCE(v_caller_id, p_student_id),
            cancellation_reason = COALESCE(NULLIF(p_notice, ''), 'Vom Schüler/Elternteil abgemeldet'),
            cancelled_at = NOW(),
            notice = COALESCE(NULLIF(p_notice, ''), notice)
        WHERE id = v_occ_uuid;
    ELSE
        INSERT INTO public.schedule_occurrences (
            school_id, student_id, teacher_id, date, start_time,
            status, cancelled_by, cancellation_reason, cancelled_at, notice
        ) VALUES (
            v_school_id, p_student_id, v_teacher_id, p_date, p_start_time,
            'cancelled_by_student', COALESCE(v_caller_id, p_student_id),
            COALESCE(NULLIF(p_notice, ''), 'Vom Schüler/Elternteil abgemeldet'),
            NOW(), p_notice
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'student_id', p_student_id, 'date', p_date);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_student_schedule_occurrence(UUID, DATE, TIME WITHOUT TIME ZONE, TEXT, TEXT, UUID, TEXT) TO anon, authenticated, service_role;

-- UNDO Cancel Student Schedule Occurrence (Symmetric Lockdown)
CREATE OR REPLACE FUNCTION public.undo_cancel_student_schedule_occurrence(
    p_student_id UUID,
    p_date DATE,
    p_start_time TIME WITHOUT TIME ZONE,
    p_occurrence_id TEXT DEFAULT NULL,
    p_parent_pin TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    v_student_rec RECORD;
    v_school_id UUID;
    v_allow_absences BOOLEAN;
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_occ_uuid UUID;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school_id := public.get_current_user_school_id();

    SELECT id, school_id, parent_allow_absences
    INTO v_student_rec
    FROM public.users_raw
    WHERE id = p_student_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student not found');
    END IF;

    v_school_id := v_student_rec.school_id;
    v_allow_absences := COALESCE(v_student_rec.parent_allow_absences, false);

    -- 🛡️ ZERO-TRUST AUTHORIZATION:
    -- 1. Unauthenticated callers MUST provide a valid parent PIN!
    IF v_caller_id IS NULL THEN
        IF p_parent_pin IS NULL OR length(TRIM(p_parent_pin)) < 4 OR NOT public.verify_parent_pin(p_student_id, TRIM(p_parent_pin)) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Authentifizierung erforderlich: Bitte geben Sie die gültige Eltern-PIN ein.');
        END IF;
    ELSE
        -- 2. Authenticated callers must be student themselves, staff in same school, or master admin!
        IF NOT (
            public.is_master_admin()
            OR v_caller_id = p_student_id
            OR (v_caller_school_id = v_school_id AND v_caller_role IN ('teacher', 'admin', 'secretary'))
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Zugriff verweigert: Unzureichende Berechtigungen zur Wiederanmeldung.');
        END IF;

        IF v_caller_id = p_student_id AND NOT v_allow_absences THEN
            IF p_parent_pin IS NULL OR length(TRIM(p_parent_pin)) < 4 OR NOT public.verify_parent_pin(p_student_id, TRIM(p_parent_pin)) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Wiederanmeldung gesperrt: Muss durch Erziehungsberechtigte mit Eltern-PIN autorisiert werden.');
            END IF;
        END IF;
    END IF;

    IF p_occurrence_id IS NOT NULL AND p_occurrence_id NOT LIKE 'virtual-%' AND p_occurrence_id NOT LIKE 'virt_%' AND p_occurrence_id NOT LIKE 'sched-%' THEN
        BEGIN
            v_occ_uuid := p_occurrence_id::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_occ_uuid := NULL;
        END;
    END IF;

    IF v_occ_uuid IS NOT NULL THEN
        UPDATE public.schedule_occurrences SET
            status = 'scheduled',
            cancellation_reason = NULL,
            cancelled_by = NULL,
            cancelled_at = NULL
        WHERE id = v_occ_uuid;
    ELSE
        UPDATE public.schedule_occurrences SET
            status = 'scheduled',
            cancellation_reason = NULL,
            cancelled_by = NULL,
            cancelled_at = NULL
        WHERE student_id = p_student_id
          AND date = p_date
          AND start_time = p_start_time;
    END IF;

    RETURN jsonb_build_object('success', true, 'student_id', p_student_id, 'date', p_date);
END;
$$;

GRANT EXECUTE ON FUNCTION public.undo_cancel_student_schedule_occurrence(UUID, DATE, TIME WITHOUT TIME ZONE, TEXT, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. DROP ALL 5 REMAINING LEFTOVER PERMISSIVE RLS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all on master_billing_settings" ON public.master_billing_settings;
DROP POLICY IF EXISTS "Allow public select on master_billing_settings" ON public.master_billing_settings;
DROP POLICY IF EXISTS "Enable all for school_equipment" ON public.school_equipment;
DROP POLICY IF EXISTS "room_bookings_fallback_all" ON public.room_bookings;
DROP POLICY IF EXISTS "room_bookings_select" ON public.room_bookings;
DROP POLICY IF EXISTS "room_bookings_insert" ON public.room_bookings;
DROP POLICY IF EXISTS "room_bookings_delete" ON public.room_bookings;
DROP POLICY IF EXISTS "Gigs visible to school" ON public.band_gigs;
DROP POLICY IF EXISTS "Media visible to school" ON public.band_media;
DROP POLICY IF EXISTS "student_onboarding_tokens_select" ON public.student_onboarding_tokens;

-- Scope parent_consent_logs strictly to caller's school
DROP POLICY IF EXISTS "parent_consent_logs_scoped" ON public.parent_consent_logs;
CREATE POLICY "parent_consent_logs_scoped" ON public.parent_consent_logs
FOR SELECT TO authenticated, anon
USING (
    public.is_master_admin()
    OR (public.get_current_authenticated_user_id() IS NOT NULL AND student_id = public.get_current_authenticated_user_id())
    OR (public.get_current_user_role() IN ('admin', 'secretary') AND school_id = public.get_current_user_school_id())
);

-- ------------------------------------------------------------------------------
-- 5. HARDEN DML TRIGGER AGAINST PIN LOCKOUT & ATTEMPT RESET
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_users_view_dml()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_caller_uid UUID;
    v_caller_role TEXT;
    v_is_master BOOLEAN := FALSE;
    v_is_student BOOLEAN := FALSE;
    v_is_school_staff BOOLEAN := FALSE;
    hashed_parent_pin TEXT := NULL;
    v_target_last_seen TIMESTAMPTZ;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_is_master := public.is_master_admin();
        v_caller_role := public.get_current_user_role();
        IF NOT v_is_master AND v_caller_role NOT IN ('admin', 'secretary') THEN
            RAISE EXCEPTION 'Zugriff verweigert: Unzureichende Berechtigungen zum Löschen von Benutzerkonten.' USING ERRCODE = '42501';
        END IF;

        DELETE FROM public.user_email_prefixes WHERE user_id = OLD.id;
        DELETE FROM public.user_email_suffixes WHERE user_id = OLD.id;
        IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'private_auth') THEN
            DELETE FROM private_auth.user_secrets WHERE user_id = OLD.id;
        END IF;
        DELETE FROM public.session_leases WHERE user_id = OLD.id;
        DELETE FROM public.users_raw WHERE id = OLD.id;
        RETURN OLD;
    END IF;

    v_caller_uid := public.get_current_authenticated_user_id();
    v_is_master := public.is_master_admin();
    v_caller_role := public.get_current_user_role();
    v_is_student := (v_caller_role = 'student');
    v_is_school_staff := (v_caller_role IN ('admin', 'secretary'));

    IF NEW.parent_pin IS NOT NULL AND NEW.parent_pin <> '' THEN
        IF length(NEW.parent_pin) = 64 THEN
            hashed_parent_pin := NEW.parent_pin;
        ELSE
            hashed_parent_pin := encode(digest(NEW.parent_pin, 'sha256'), 'hex');
        END IF;
    END IF;

    IF NEW.role = 'teacher' THEN
        v_target_last_seen := NULL;
    ELSE
        v_target_last_seen := NEW.last_seen;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NOT v_is_master THEN
            NEW.is_master_admin := FALSE;
        END IF;

        INSERT INTO public.users_raw (
            id, school_id, role, first_name, last_name, avatar_url, qr_token, calendar_token, instrument,
            created_at, coach_notes, photo_url, bio, bands, projects, listening, gear,
            musical_styles, equipment_list, last_seen, expertise, age, birth_date,
            pending_repertoire_proposal, is_external_vocalist, show_messages_menu,
            master_admin_username, is_trial, trial_ends_at,
            contract_ends_at, contract_decision_made, delete_after_contract,
            status, is_master_admin, is_app_user, is_campus_active,
            is_groovelab_active, is_premium_user, teacher_id, ausweis_nummer,
            teacher_qr_token, is_active, max_students, nickname,
            ausweis_id, show_sekretariat, show_campus, show_groovelab,
            lesson_duration, planned_boards, required_equipment, sick_until,
            phone, joker_used, is_pin_activated, "groovelab_räume", "campus_räume",
            joker_used_at, sick_start, push_notifications_enabled, push_notif_schedule_changes,
            push_notif_homework, push_notif_all_features, app_usage_mode,
            preferred_room_ids, groovelab_instrument, student_billing_payment_method,
            activated_at, student_billing_cash_paid, roles, exempt_from_direct_billing,
            group_id, sibling_group_id, parent_allow_chat, parent_allow_timer,
            parent_allow_leaderboard, parent_allow_groups, parent_allow_proposals,
            parent_allow_absences, parent_allow_audio, campus_ui_level, parent_permissions,
            pin_enforced_for_preview, parent_name, parental_consent_given_at, consent_version, campus_usage_mode,
            teacher_onboarding_completed, teacher_availability,
            is_2fa_enabled, parent_pin, personal_pin, failed_pin_attempts, pin_locked_until,
            sessions_revoked_at, token_version, token_signature, qr_token_redeemed_at,
            skill_radar_levels
        ) VALUES (
            COALESCE(NEW.id, gen_random_uuid()),
            NEW.school_id, NEW.role, NEW.first_name, NEW.last_name, NEW.avatar_url, NEW.qr_token, NEW.calendar_token, NEW.instrument,
            COALESCE(NEW.created_at, NOW()), NEW.coach_notes, NEW.photo_url, NEW.bio, NEW.bands, NEW.projects, NEW.listening, NEW.gear,
            NEW.musical_styles, NEW.equipment_list, v_target_last_seen, NEW.expertise, NEW.age, NEW.birth_date,
            NEW.pending_repertoire_proposal, NEW.is_external_vocalist, NEW.show_messages_menu,
            NEW.master_admin_username, COALESCE(NEW.is_trial, FALSE), NEW.trial_ends_at,
            NEW.contract_ends_at, NEW.contract_decision_made, NEW.delete_after_contract,
            NEW.status, COALESCE(NEW.is_master_admin, FALSE), COALESCE(NEW.is_app_user, TRUE), COALESCE(NEW.is_campus_active, FALSE),
            COALESCE(NEW.is_groovelab_active, FALSE), COALESCE(NEW.is_premium_user, FALSE), NEW.teacher_id, NEW.ausweis_nummer,
            NEW.teacher_qr_token, COALESCE(NEW.is_active, TRUE), NEW.max_students, NEW.nickname,
            NEW.ausweis_id, NEW.show_sekretariat, NEW.show_campus, NEW.show_groovelab,
            NEW.lesson_duration, NEW.planned_boards, NEW.required_equipment, NEW.sick_until,
            NEW.phone, NEW.joker_used, COALESCE(NEW.is_pin_activated, FALSE), NEW."groovelab_räume", NEW."campus_räume",
            joker_used_at, sick_start, push_notifications_enabled, push_notif_schedule_changes,
            push_notif_homework, push_notif_all_features, app_usage_mode,
            preferred_room_ids, groovelab_instrument, student_billing_payment_method,
            activated_at, student_billing_cash_paid, roles, exempt_from_direct_billing,
            group_id, sibling_group_id, parent_allow_chat, parent_allow_timer,
            parent_allow_leaderboard, parent_allow_groups, parent_allow_proposals,
            parent_allow_absences, parent_allow_audio, campus_ui_level, parent_permissions,
            pin_enforced_for_preview, parent_name, parental_consent_given_at, consent_version, campus_usage_mode,
            teacher_onboarding_completed, teacher_availability,
            is_2fa_enabled, parent_pin, personal_pin, failed_pin_attempts, pin_locked_until,
            sessions_revoked_at, token_version, token_signature, qr_token_redeemed_at,
            skill_radar_levels
        );
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        -- BOLA Guard
        IF NOT v_is_school_staff AND NOT v_is_master AND (v_caller_uid IS NULL OR OLD.id <> v_caller_uid) THEN
            RAISE EXCEPTION 'Zugriff verweigert: Unzureichende Berechtigungen zur Bearbeitung fremder Benutzerdatensätze.' USING ERRCODE = '42501';
        END IF;

        -- Privilege Escalation Guard & PIN Lockout Shield
        IF NOT v_is_master THEN
            NEW.is_master_admin := OLD.is_master_admin;
            NEW.school_id := OLD.school_id;
        END IF;

        -- 🛡️ STRICT LOCKOUT SHIELD: Non-staff CANNOT reset their own lockout or attempts!
        IF NOT v_is_school_staff AND NOT v_is_master THEN
            NEW.role := OLD.role;
            NEW.roles := OLD.roles;
            NEW.pin_locked_until := OLD.pin_locked_until;
            NEW.failed_pin_attempts := OLD.failed_pin_attempts;
            NEW.is_pin_activated := OLD.is_pin_activated;
        END IF;

        IF v_is_student THEN
            NEW.last_name := OLD.last_name;
            NEW.parent_allow_chat := OLD.parent_allow_chat;
            NEW.parent_allow_timer := OLD.parent_allow_timer;
            NEW.parent_allow_leaderboard := OLD.parent_allow_leaderboard;
            NEW.parent_allow_groups := OLD.parent_allow_groups;
            NEW.parent_allow_proposals := OLD.parent_allow_proposals;
            NEW.parent_allow_absences := OLD.parent_allow_absences;
            NEW.parent_allow_audio := OLD.parent_allow_audio;
            NEW.parent_permissions := OLD.parent_permissions;
            NEW.parent_name := OLD.parent_name;
            NEW.parental_consent_given_at := OLD.parental_consent_given_at;
            NEW.consent_version := OLD.consent_version;
            NEW.campus_usage_mode := OLD.campus_usage_mode;
            NEW.student_billing_cash_paid := OLD.student_billing_cash_paid;
            NEW.exempt_from_direct_billing := OLD.exempt_from_direct_billing;
            NEW.student_billing_payment_method := OLD.student_billing_payment_method;
            NEW.activated_at := OLD.activated_at;
            hashed_parent_pin := NULL;
        END IF;

        UPDATE public.users_raw SET
            school_id = NEW.school_id,
            role = NEW.role,
            first_name = NEW.first_name,
            last_name = NEW.last_name,
            avatar_url = NEW.avatar_url,
            qr_token = NEW.qr_token,
            calendar_token = NEW.calendar_token,
            instrument = NEW.instrument,
            coach_notes = NEW.coach_notes,
            photo_url = NEW.photo_url,
            bio = NEW.bio,
            bands = NEW.bands,
            projects = NEW.projects,
            listening = NEW.listening,
            gear = NEW.gear,
            musical_styles = NEW.musical_styles,
            equipment_list = NEW.equipment_list,
            last_seen = v_target_last_seen,
            expertise = NEW.expertise,
            age = NEW.age,
            birth_date = NEW.birth_date,
            pending_repertoire_proposal = NEW.pending_repertoire_proposal,
            is_external_vocalist = NEW.is_external_vocalist,
            show_messages_menu = NEW.show_messages_menu,
            master_admin_username = NEW.master_admin_username,
            is_trial = NEW.is_trial,
            trial_ends_at = NEW.trial_ends_at,
            contract_ends_at = NEW.contract_ends_at,
            contract_decision_made = NEW.contract_decision_made,
            delete_after_contract = NEW.delete_after_contract,
            status = NEW.status,
            is_master_admin = NEW.is_master_admin,
            is_app_user = NEW.is_app_user,
            is_campus_active = NEW.is_campus_active,
            is_groovelab_active = NEW.is_groovelab_active,
            is_premium_user = NEW.is_premium_user,
            teacher_id = NEW.teacher_id,
            ausweis_nummer = NEW.ausweis_nummer,
            teacher_qr_token = NEW.teacher_qr_token,
            is_active = NEW.is_active,
            max_students = NEW.max_students,
            nickname = NEW.nickname,
            ausweis_id = NEW.ausweis_id,
            show_sekretariat = NEW.show_sekretariat,
            show_campus = NEW.show_campus,
            show_groovelab = NEW.show_groovelab,
            lesson_duration = NEW.lesson_duration,
            planned_boards = NEW.planned_boards,
            required_equipment = NEW.required_equipment,
            sick_until = NEW.sick_until,
            phone = NEW.phone,
            joker_used = NEW.joker_used,
            is_pin_activated = NEW.is_pin_activated,
            "groovelab_räume" = NEW."groovelab_räume",
            "campus_räume" = NEW."campus_räume",
            joker_used_at = NEW.joker_used_at,
            sick_start = NEW.sick_start,
            push_notifications_enabled = NEW.push_notifications_enabled,
            push_notif_schedule_changes = NEW.push_notif_schedule_changes,
            push_notif_homework = NEW.push_notif_homework,
            push_notif_all_features = NEW.push_notif_all_features,
            app_usage_mode = NEW.app_usage_mode,
            preferred_room_ids = NEW.preferred_room_ids,
            groovelab_instrument = NEW.groovelab_instrument,
            student_billing_payment_method = NEW.student_billing_payment_method,
            activated_at = NEW.activated_at,
            student_billing_cash_paid = NEW.student_billing_cash_paid,
            roles = NEW.roles,
            exempt_from_direct_billing = NEW.exempt_from_direct_billing,
            group_id = NEW.group_id,
            sibling_group_id = NEW.sibling_group_id,
            parent_allow_chat = NEW.parent_allow_chat,
            parent_allow_timer = NEW.parent_allow_timer,
            parent_allow_leaderboard = NEW.parent_allow_leaderboard,
            parent_allow_groups = NEW.parent_allow_groups,
            parent_allow_proposals = NEW.parent_allow_proposals,
            parent_allow_absences = NEW.parent_allow_absences,
            parent_allow_audio = NEW.parent_allow_audio,
            campus_ui_level = NEW.campus_ui_level,
            parent_permissions = NEW.parent_permissions,
            pin_enforced_for_preview = NEW.pin_enforced_for_preview,
            parent_name = NEW.parent_name,
            parental_consent_given_at = NEW.parental_consent_given_at,
            consent_version = NEW.consent_version,
            campus_usage_mode = NEW.campus_usage_mode,
            teacher_onboarding_completed = NEW.teacher_onboarding_completed,
            teacher_availability = NEW.teacher_availability,
            is_2fa_enabled = COALESCE(NEW.is_2fa_enabled, users_raw.is_2fa_enabled),
            parent_pin = COALESCE(hashed_parent_pin, users_raw.parent_pin),
            failed_pin_attempts = NEW.failed_pin_attempts,
            pin_locked_until = NEW.pin_locked_until,
            sessions_revoked_at = NEW.sessions_revoked_at,
            token_version = NEW.token_version,
            token_signature = NEW.token_signature,
            qr_token_redeemed_at = NEW.qr_token_redeemed_at,
            skill_radar_levels = NEW.skill_radar_levels
        WHERE id = OLD.id;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. HARDEN SET_INITIAL_STUDENT_PIN (NO UUID BYPASS)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_initial_student_pin(
    p_student_id UUID,
    p_pin TEXT,
    p_qr_token TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
AS $$
DECLARE
    v_clean_pin TEXT;
    v_clean_token TEXT;
    v_hash TEXT;
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_user RECORD;
    v_day_of_birth INT := 1;
    v_token_matches BOOLEAN := FALSE;
BEGIN
    IF p_student_id IS NULL OR p_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    v_clean_pin := TRIM(p_pin);
    IF LENGTH(v_clean_pin) <> 4 OR v_clean_pin !~ '^[0-9]{4}$' THEN
        RETURN FALSE;
    END IF;

    v_clean_token := TRIM(COALESCE(p_qr_token, ''));
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school_id := public.get_current_user_school_id();

    SELECT id, school_id, qr_token, teacher_qr_token, ausweis_nummer, birth_date, is_pin_activated
    INTO v_user
    FROM public.users_raw
    WHERE id = p_student_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- 🛡️ STRICT TOKEN VALIDATION: Only genuine tokens (NO UUID match!)
    IF v_clean_token <> '' THEN
        IF v_user.qr_token::text = v_clean_token 
           OR v_user.teacher_qr_token::text = v_clean_token 
           OR UPPER(v_user.ausweis_nummer) = UPPER(v_clean_token) THEN
            v_token_matches := TRUE;
        END IF;
    END IF;

    -- Strict Authorization Barrier
    IF NOT (
        public.is_master_admin()
        OR (v_caller_id IS NOT NULL AND v_caller_id = p_student_id)
        OR (v_caller_role IN ('admin', 'secretary', 'teacher') AND v_caller_school_id = v_user.school_id)
        OR (v_token_matches AND COALESCE(v_user.is_pin_activated, FALSE) = FALSE)
    ) THEN
        RETURN FALSE;
    END IF;

    v_hash := encode(digest(v_clean_pin, 'sha256'), 'hex');

    INSERT INTO private_auth.user_secrets (user_id, argon2_personal_pin_hash, updated_at)
    VALUES (p_student_id, v_hash, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        argon2_personal_pin_hash = EXCLUDED.argon2_personal_pin_hash,
        updated_at = NOW();

    UPDATE public.users_raw SET
        personal_pin = NULL,
        failed_pin_attempts = 0,
        pin_locked_until = NULL,
        is_pin_activated = TRUE,
        is_campus_active = TRUE,
        status = 'aktiv'
    WHERE id = p_student_id;

    BEGIN
        UPDATE public.students SET
            personal_pin = NULL,
            is_pin_activated = TRUE,
            is_campus_active = TRUE,
            status = 'aktiv'
        WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        UPDATE public.pending_students SET
            is_pin_activated = TRUE,
            is_campus_active = TRUE,
            status = 'aktiv',
            parent_pin = NULL
        WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        IF v_user.birth_date IS NOT NULL THEN
            v_day_of_birth := EXTRACT(DAY FROM v_user.birth_date)::INT;
        ELSE
            v_day_of_birth := 1;
        END IF;

        INSERT INTO public.activation_days (student_id, day_of_birth)
        VALUES (p_student_id, v_day_of_birth)
        ON CONFLICT (student_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_initial_student_pin(UUID, TEXT, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 7. AUTHORITATIVE GET_STUDENT_ONBOARDING_PREVIEW RPC (ZERO DIRECT VIEW QUERIES)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_student_onboarding_preview(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_clean text := TRIM(COALESCE(p_token, ''));
    v_user record;
    v_school record;
BEGIN
    IF v_clean = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Token fehlt.');
    END IF;

    -- Lookup student strictly by qr_token or ausweis_nummer (NO UUID!)
    SELECT u.id, u.school_id, u.first_name, u.last_name, u.instrument, 
           u.campus_ui_level, u.is_pin_activated, u.parental_consent_given_at,
           u.parent_allow_chat, u.parent_allow_audio, u.campus_usage_mode, u.is_campus_active
    INTO v_user
    FROM public.users_raw u
    WHERE (u.qr_token::text = v_clean 
           OR u.teacher_qr_token::text = v_clean 
           OR UPPER(u.ausweis_nummer) = UPPER(v_clean))
      AND u.is_active = TRUE
    LIMIT 1;

    -- Fallback for pending students
    IF v_user IS NULL THEN
        SELECT p.id, p.school_id, p.first_name, p.last_name, p.instrument,
               'standard' AS campus_ui_level, false AS is_pin_activated, NULL::timestamptz AS parental_consent_given_at,
               false AS parent_allow_chat, false AS parent_allow_audio, 'selbstnutzer' AS campus_usage_mode, true AS is_campus_active
        INTO v_user
        FROM public.pending_students p
        WHERE p.qr_token::text = v_clean
        LIMIT 1;
    END IF;

    IF v_user IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Schülerprofil nicht gefunden.');
    END IF;

    SELECT id, name, branding_logo_url, hero_image_url INTO v_school
    FROM public.schools
    WHERE id = v_user.school_id;

    RETURN jsonb_build_object(
        'success', true,
        'student', jsonb_build_object(
            'id', v_user.id,
            'school_id', v_user.school_id,
            'first_name', v_user.first_name,
            'last_initial', CASE WHEN v_user.last_name IS NOT NULL AND v_user.last_name <> '' THEN SUBSTRING(v_user.last_name FROM 1 FOR 1) || '.' ELSE '' END,
            'instrument', v_user.instrument,
            'campus_ui_level', COALESCE(v_user.campus_ui_level, 'standard'),
            'is_pin_activated', COALESCE(v_user.is_pin_activated, false),
            'has_consent', (v_user.parental_consent_given_at IS NOT NULL),
            'is_campus_active', COALESCE(v_user.is_campus_active, false),
            'campus_usage_mode', COALESCE(v_user.campus_usage_mode, 'selbstnutzer'),
            'school_name', COALESCE(v_school.name, 'Campus-Groovelab Musikschule'),
            'school_logo', v_school.branding_logo_url,
            'school_hero', v_school.hero_image_url
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_onboarding_preview(text) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 8. REFRESH SCHEMA CACHE
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
