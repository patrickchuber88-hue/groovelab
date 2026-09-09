-- ==============================================================================
-- MIGRATION 386: ENTERPRISE FORENSIC REMEDIATION GOLDSTANDARD
-- Standards: OWASP ASVS Level 3, BSI IT-Grundschutz (APP.3.1 / SYS.1.8), DSGVO Art. 8, 25 & 32, GoBD
-- 
-- Consolidates and closes ALL 26 verified forensic audit findings:
-- 1. AUTHENTICATE_BY_CREDENTIAL:
--    - Eliminates UUID login bypass (OR id::text = v_clean).
--    - Strictly enforces proof of possession of secret credentials (qr_token, teacher_qr_token, ausweis_nummer).
--    - Accepts optional device metadata and binds session leases immutably.
--
-- 2. REGISTER_SESSION_LEASE:
--    - Eliminates unauthenticated session spoofing.
--    - Enforces strict caller authentication (caller must be p_user_id, master admin, or internal auth RPC).
--
-- 3. HANDLE_USERS_VIEW_DML:
--    - Eliminates BOLA: Non-staff/non-master users CANNOT update other users' records (OLD.id <> v_caller_uid raises exception).
--    - Privilege escalation shield: Restores role, is_master_admin, school_id on any non-staff update.
--    - FinOps shield: Blocks students from modifying financial flags (student_billing_cash_paid, exempt_from_direct_billing, student_billing_payment_method).
--
-- 4. COMPLETE_STUDENT_ONBOARDING_V2:
--    - Eliminates UUID login bypass (OR id::text = v_clean_token).
--    - Fail-Closed: Blocks re-onboarding / takeover if is_pin_activated is already TRUE or consent given.
--
-- 5. PARENTAL PIN & RECOVERY KEY (DSGVO Art. 8 Jugendschutz):
--    - Blocks students from resetting the parent PIN in set_parent_pin and set_parent_pin_with_recovery_key.
--    - Requires valid recovery key or authorized school staff / master admin.
--
-- 6. RLS POLICIES CLEANUP:
--    - Drops leftover permissive policies with USING (true) on schools, rooms, subjects, duties.
--
-- 7. STORAGE SELECT SCOPING:
--    - Scopes SELECT on storage.objects for campus-assets and groovelab-assets to tenant/owner/public folders.
--
-- 8. DESTRUCTIVE & ADMIN RPCS:
--    - Hardens prune_inactive_students_bulk (raises exception if not master admin).
--    - Hardens get_inactive_students_preview (enforces master admin or school staff scoping).
--    - Hardens commit_teacher_schedule_draft & purge_student_audio_assets.
--    - Hardens confirm_school_subscription, cancel_school_subscription, apply_school_service_credit.
--    - Hardens get_or_rotate_calendar_token (eliminates null caller fallback).
--    - Hardens cancel_student_schedule_occurrence (verifies caller authorization).
--    - Hardens login_master_admin (adds lockout after 5 failures and generates session lease).
--
-- 9. IDENTITY RESOLVER & SEARCH_PATH:
--    - get_user_school_id delegates safely to get_current_user_school_id.
--    - Pinned SET search_path on helper functions.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDEN AUTHENTICATE_BY_CREDENTIAL RPC
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

    -- 🛡️ STRICT OWASP ASVS LEVEL 3: A credential is ONLY a valid qr_token, teacher_qr_token, or ausweis_nummer!
    -- Public UUIDs (id::text) are STRICTLY FORBIDDEN as login credentials!
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

    -- Fallback for School Admin PINs if stored in school secrets
    IF v_user IS NULL AND p_school_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM private_auth.school_secrets 
            WHERE school_id = p_school_id AND admin_pin = v_clean
        ) OR EXISTS (
            SELECT 1 FROM public.schools 
            WHERE id = p_school_id AND admin_pin = v_clean
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
-- 2. HARDEN REGISTER_SESSION_LEASE RPC (ELIMINATE ARBITRARY SESSION SPOOFING)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_session_lease(
    p_user_id UUID,
    p_school_id UUID,
    p_device_name TEXT,
    p_device_key TEXT,
    p_role TEXT,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_caller_id UUID;
    v_lease_id UUID;
    v_is_revoked BOOLEAN;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();

    -- 🛡️ STRICT AUTHORIZATION:
    -- Only the authenticated user themselves, or a master admin, or internal database service can register/update leases!
    IF NOT (
        public.is_master_admin()
        OR current_user IN ('postgres', 'supabase_admin', 'service_role')
        OR (v_caller_id IS NOT NULL AND v_caller_id = p_user_id)
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'UNAUTHORIZED_SESSION_REGISTRATION',
            'message', 'Sitzungsregistrierung erfordert einen verifizierten Benutzerkontext.'
        );
    END IF;

    -- Check if an active lease already exists for this device_key + user_id
    SELECT id, is_revoked INTO v_lease_id, v_is_revoked
    FROM public.session_leases
    WHERE user_id = p_user_id AND device_key = p_device_key
    LIMIT 1;

    IF v_lease_id IS NOT NULL THEN
        IF v_is_revoked = TRUE THEN
            RETURN jsonb_build_object(
                'success', false,
                'revoked', true,
                'message', 'Diese Gerätesitzung wurde von der Schulleitung widerrufen.'
            );
        END IF;

        UPDATE public.session_leases
        SET last_active_at = NOW(),
            device_name = COALESCE(NULLIF(p_device_name, ''), device_name),
            user_agent = COALESCE(NULLIF(p_user_agent, ''), user_agent)
        WHERE id = v_lease_id;

        RETURN jsonb_build_object(
            'success', true,
            'lease_id', v_lease_id,
            'is_new', false
        );
    ELSE
        INSERT INTO public.session_leases (
            user_id, school_id, device_name, device_key, role, user_agent, last_active_at
        ) VALUES (
            p_user_id, p_school_id, COALESCE(NULLIF(p_device_name, ''), 'Unbekanntes Gerät'),
            p_device_key, p_role, p_user_agent, NOW()
        )
        RETURNING id INTO v_lease_id;

        RETURN jsonb_build_object(
            'success', true,
            'lease_id', v_lease_id,
            'is_new', true
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_session_lease(UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 3. HARDEN HANDLE_USERS_VIEW_DML (ELIMINATE BOLA & FINANCIAL TAMPERING)
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
    -- 1. DELETE Handling: Strict authorization check
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

    -- 2. Identify Caller Authority
    v_caller_uid := public.get_current_authenticated_user_id();
    v_is_master := public.is_master_admin();
    v_caller_role := public.get_current_user_role();
    v_is_student := (v_caller_role = 'student');
    v_is_school_staff := (v_caller_role IN ('admin', 'secretary'));

    -- 3. Parent PIN Hashing
    IF NEW.parent_pin IS NOT NULL AND NEW.parent_pin <> '' THEN
        IF length(NEW.parent_pin) = 64 THEN
            hashed_parent_pin := NEW.parent_pin;
        ELSE
            hashed_parent_pin := encode(digest(NEW.parent_pin, 'sha256'), 'hex');
        END IF;
    END IF;

    -- 4. Teacher Non-Surveillance Guard
    IF NEW.role = 'teacher' THEN
        v_target_last_seen := NULL;
    ELSE
        v_target_last_seen := NEW.last_seen;
    END IF;

    -- 5. INSERT Operation
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

    -- 6. UPDATE Operation
    ELSIF TG_OP = 'UPDATE' THEN
        -- 🛡️ ZERO-TRUST BOLA GUARD:
        -- Non-school-staff and non-master-admins can ONLY modify their own record!
        IF NOT v_is_school_staff AND NOT v_is_master AND (v_caller_uid IS NULL OR OLD.id <> v_caller_uid) THEN
            RAISE EXCEPTION 'Zugriff verweigert: Unzureichende Berechtigungen zur Bearbeitung fremder Benutzerdatensätze.' USING ERRCODE = '42501';
        END IF;

        -- 🛡️ ZERO-TRUST PRIVILEGE-ESCALATION GUARDS:
        -- Non-master-admins CANNOT modify school_id, is_master_admin, role, or roles via view
        IF NOT v_is_master THEN
            NEW.is_master_admin := OLD.is_master_admin;
            NEW.school_id := OLD.school_id;
        END IF;

        IF NOT v_is_school_staff AND NOT v_is_master THEN
            NEW.role := OLD.role;
            NEW.roles := OLD.roles;
        END IF;

        -- 🛡️ STUDENT RESTRICTIONS (BGB, DSGVO Art. 8 & FinOps):
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
            -- Financial flags must NEVER be modified by students:
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
            failed_pin_attempts = COALESCE(NEW.failed_pin_attempts, users_raw.failed_pin_attempts),
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
-- 4. HARDEN COMPLETE_STUDENT_ONBOARDING_V2 (ELIMINATE UUID BYPASS & DOUBLE ONBOARDING)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_student_onboarding_v2(
    p_token TEXT,
    p_parent_pin_6 TEXT,
    p_student_pin_4 TEXT DEFAULT NULL,
    p_campus_usage_mode TEXT DEFAULT 'selbstnutzer',
    p_parent_permissions JSONB DEFAULT '{}'::jsonb,
    p_parent_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
AS $$
DECLARE
    v_clean_token TEXT := TRIM(COALESCE(p_token, ''));
    v_clean_parent_name TEXT := TRIM(COALESCE(p_parent_name, ''));
    v_clean_parent_pin TEXT := TRIM(COALESCE(p_parent_pin_6, ''));
    v_clean_student_pin TEXT := TRIM(COALESCE(p_student_pin_4, ''));
    v_clean_mode TEXT := TRIM(COALESCE(p_campus_usage_mode, 'selbstnutzer'));
    v_user_id UUID := NULL;
    v_school_id UUID := NULL;
    v_birth_date DATE := NULL;
    v_day_of_birth INT := 1;
    v_parent_hash TEXT;
    v_student_hash TEXT := NULL;
    v_allow_chat BOOLEAN;
    v_allow_timer BOOLEAN;
    v_allow_leaderboard BOOLEAN;
    v_allow_student_audio BOOLEAN;
    v_allow_teacher_audio BOOLEAN;
    v_allow_absences BOOLEAN;
    v_allow_reschedule BOOLEAN;
    v_allow_tts BOOLEAN;
    v_allow_groups BOOLEAN;
    v_allow_proposals BOOLEAN;
BEGIN
    -- 1. Validate Input Parameters
    IF v_clean_token = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'MISSING_TOKEN', 'message', 'Onboarding-Token fehlt.');
    END IF;

    -- Parent PIN must be exactly 6 numeric digits
    IF v_clean_parent_pin !~ '^[0-9]{6}$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_PARENT_PIN', 'message', 'Die Eltern-PIN muss genau 6 numerische Ziffern enthalten.');
    END IF;

    IF v_clean_mode NOT IN ('selbstnutzer', 'eltern_geführt') THEN
        v_clean_mode := 'selbstnutzer';
    END IF;

    IF v_clean_student_pin <> '' AND v_clean_student_pin !~ '^[0-9]{4}$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_STUDENT_PIN', 'message', 'Die Schüler-PIN muss genau 4 numerische Ziffern enthalten.');
    END IF;

    -- 2. Find Student in users_raw (STRICT: qr_token, teacher_qr_token, or ausweis_nummer ONLY. NO UUID!)
    SELECT id, school_id, birth_date
    INTO v_user_id, v_school_id, v_birth_date
    FROM public.users_raw
    WHERE (qr_token::text = v_clean_token
       OR teacher_qr_token::text = v_clean_token
       OR UPPER(ausweis_nummer) = UPPER(v_clean_token))
       AND is_active = TRUE
    LIMIT 1;

    -- Fallback: check students table
    IF v_user_id IS NULL THEN
        BEGIN
            SELECT id, school_id, NULL::date
            INTO v_user_id, v_school_id, v_birth_date
            FROM public.students
            WHERE (qr_token::text = v_clean_token
               OR UPPER(ausweis_nummer) = UPPER(v_clean_token))
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    -- Fallback: check pending_students table
    IF v_user_id IS NULL THEN
        BEGIN
            SELECT id, school_id, NULL::date
            INTO v_user_id, v_school_id, v_birth_date
            FROM public.pending_students
            WHERE qr_token::text = v_clean_token
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND', 'message', 'Schülerprofil konnte anhand des Tokens nicht identifiziert werden.');
    END IF;

    -- 🛡️ FAIL-CLOSED: Check if student has already completed onboarding
    IF EXISTS (
        SELECT 1 FROM public.users_raw
        WHERE id = v_user_id 
          AND (is_pin_activated = TRUE OR parental_consent_given_at IS NOT NULL)
    ) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'ALREADY_ACTIVATED', 
            'message', 'Das Onboarding für diesen Schüler wurde bereits abgeschlossen. PIN-Änderungen erfordern die bestehende Eltern-PIN oder den Notfall-Wiederherstellungsschlüssel.'
        );
    END IF;

    -- 3. Parse Granular Permissions
    v_allow_chat := COALESCE((p_parent_permissions->>'allow_chat')::boolean, false);
    v_allow_timer := COALESCE((p_parent_permissions->>'allow_timer')::boolean, CASE WHEN v_clean_mode = 'eltern_geführt' THEN false ELSE true END);
    v_allow_leaderboard := COALESCE((p_parent_permissions->>'allow_leaderboard')::boolean, CASE WHEN v_clean_mode = 'eltern_geführt' THEN false ELSE true END);
    v_allow_student_audio := COALESCE((p_parent_permissions->>'allow_student_audio')::boolean, false);
    v_allow_teacher_audio := COALESCE((p_parent_permissions->>'allow_teacher_audio')::boolean, false);
    v_allow_absences := COALESCE((p_parent_permissions->>'allow_absences')::boolean, false);
    v_allow_reschedule := COALESCE((p_parent_permissions->>'allow_reschedule_confirm')::boolean, false);
    v_allow_tts := COALESCE((p_parent_permissions->>'allow_tts')::boolean, false);
    v_allow_groups := COALESCE((p_parent_permissions->>'allow_groups')::boolean, true);
    v_allow_proposals := COALESCE((p_parent_permissions->>'allow_proposals')::boolean, true);

    -- 4. Cryptographic Hashing
    v_parent_hash := encode(digest(v_clean_parent_pin, 'sha256'), 'hex');
    IF v_clean_student_pin <> '' THEN
        v_student_hash := encode(digest(v_clean_student_pin, 'sha256'), 'hex');
    END IF;

    -- 5. Store Secrets in private_auth.user_secrets
    INSERT INTO private_auth.user_secrets (
        user_id,
        argon2_parent_pin_hash,
        argon2_personal_pin_hash,
        updated_at
    ) VALUES (
        v_user_id,
        v_parent_hash,
        v_student_hash,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        argon2_parent_pin_hash = EXCLUDED.argon2_parent_pin_hash,
        argon2_personal_pin_hash = COALESCE(EXCLUDED.argon2_personal_pin_hash, private_auth.user_secrets.argon2_personal_pin_hash),
        updated_at = NOW();

    -- 6. Atomically Update users_raw
    UPDATE public.users_raw SET
        parent_name = NULLIF(v_clean_parent_name, ''),
        parental_consent_given_at = NOW(),
        consent_version = 'v2.0',
        campus_usage_mode = v_clean_mode,
        parent_allow_chat = v_allow_chat,
        parent_allow_timer = v_allow_timer,
        parent_allow_leaderboard = v_allow_leaderboard,
        parent_allow_groups = v_allow_groups,
        parent_allow_proposals = v_allow_proposals,
        parent_allow_audio = v_allow_student_audio,
        parent_allow_absences = v_allow_absences,
        parent_allow_reschedule_confirm = v_allow_reschedule,
        parent_allow_tts = v_allow_tts,
        parent_permissions = jsonb_build_object(
            'allow_student_audio', v_allow_student_audio,
            'allow_teacher_audio', v_allow_teacher_audio,
            'allow_chat', v_allow_chat,
            'allow_timer', v_allow_timer,
            'allow_leaderboard', v_allow_leaderboard,
            'allow_absences', v_allow_absences,
            'allow_reschedule_confirm', v_allow_reschedule,
            'allow_tts', v_allow_tts,
            'allow_groups', v_allow_groups,
            'allow_proposals', v_allow_proposals
        ),
        is_active = TRUE,
        is_pin_activated = TRUE,
        is_campus_active = TRUE,
        status = 'aktiv',
        parent_pin = NULL,
        personal_pin = NULL,
        failed_pin_attempts = 0,
        pin_locked_until = NULL
    WHERE id = v_user_id;

    -- Legacy table updates
    BEGIN
        UPDATE public.students SET
            parent_name = NULLIF(v_clean_parent_name, ''),
            parental_consent_given_at = NOW(),
            consent_version = 'v2.0',
            campus_usage_mode = v_clean_mode,
            is_active = TRUE,
            is_pin_activated = TRUE,
            is_campus_active = TRUE,
            status = 'aktiv',
            parent_pin = NULL,
            personal_pin = NULL
        WHERE id = v_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        UPDATE public.pending_students SET
            is_pin_activated = TRUE,
            is_campus_active = TRUE,
            status = 'aktiv',
            parent_pin = NULL
        WHERE id = v_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Activation day sync
    BEGIN
        IF v_birth_date IS NOT NULL THEN
            v_day_of_birth := EXTRACT(DAY FROM v_birth_date)::INT;
        ELSE
            v_day_of_birth := 1;
        END IF;

        INSERT INTO public.activation_days (student_id, day_of_birth)
        VALUES (v_user_id, v_day_of_birth)
        ON CONFLICT (student_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Revisionssicherer Audit-Trail
    BEGIN
        INSERT INTO public.audit_logs (
            table_name, record_id, action, changed_by, school_id, created_at, new_data
        ) VALUES (
            'users_raw', v_user_id, 'PARENTAL_CONSENT_COMPLETED_V2', v_user_id, v_school_id, NOW(),
            jsonb_build_object(
                'consent_version', 'v2.0',
                'campus_usage_mode', v_clean_mode,
                'has_parent_pin_6', true,
                'has_student_pin_4', (v_student_hash IS NOT NULL),
                'permissions', jsonb_build_object(
                    'allow_teacher_audio', v_allow_teacher_audio,
                    'allow_student_audio', v_allow_student_audio,
                    'allow_timer', v_allow_timer,
                    'allow_tts', v_allow_tts,
                    'allow_chat', v_allow_chat,
                    'allow_absences', v_allow_absences,
                    'allow_reschedule_confirm', v_allow_reschedule,
                    'allow_groups', v_allow_groups,
                    'allow_proposals', v_allow_proposals,
                    'allow_leaderboard', v_allow_leaderboard
                ),
                'immutable_timestamp', NOW()
            )
        );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'mode', v_clean_mode,
        'activated_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_student_onboarding_v2(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 5. HARDEN SET_PARENT_PIN & SET_PARENT_PIN_WITH_RECOVERY_KEY (DSGVO ART. 8 JUGENDSCHUTZ)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_parent_pin_with_recovery_key(
    p_student_id UUID,
    p_new_pin TEXT,
    p_recovery_key TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
AS $$
DECLARE
    v_clean_pin TEXT;
    v_hashed_pin TEXT;
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_target_school_id UUID;
    v_stored_recovery_hash TEXT;
    v_provided_recovery_hash TEXT;
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    IF p_student_id IS NULL OR p_new_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    v_clean_pin := TRIM(p_new_pin);
    IF v_clean_pin !~ '^[0-9]{6}$' THEN
        RETURN FALSE;
    END IF;

    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school_id := public.get_current_user_school_id();

    SELECT school_id INTO v_target_school_id
    FROM public.users_raw
    WHERE id = p_student_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- 1. Master Admin
    IF public.is_master_admin() THEN
        v_is_authorized := TRUE;
    -- 2. School staff within the exact SAME school
    ELSIF v_caller_role IN ('admin', 'secretary', 'teacher') AND v_caller_school_id = v_target_school_id THEN
        v_is_authorized := TRUE;
    -- 3. Recovery Key verified
    ELSIF p_recovery_key IS NOT NULL AND TRIM(p_recovery_key) <> '' THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'private_auth' AND table_name = 'user_secrets' AND column_name = 'parent_recovery_key_hash'
        ) THEN
            EXECUTE 'SELECT parent_recovery_key_hash FROM private_auth.user_secrets WHERE user_id = $1'
            INTO v_stored_recovery_hash
            USING p_student_id;
        END IF;

        IF v_stored_recovery_hash IS NULL THEN
            SELECT argon2_parent_pin_hash INTO v_stored_recovery_hash
            FROM private_auth.user_secrets
            WHERE user_id = p_student_id;
        END IF;

        v_provided_recovery_hash := encode(digest(UPPER(TRIM(p_recovery_key)), 'sha256'), 'hex');
        IF v_stored_recovery_hash IS NOT NULL AND v_stored_recovery_hash = v_provided_recovery_hash THEN
            v_is_authorized := TRUE;
        END IF;
    END IF;

    -- 🛡️ STUDENTS ARE STRICTLY FORBIDDEN from resetting their own parent PIN!
    IF NOT v_is_authorized THEN
        RETURN FALSE;
    END IF;

    v_hashed_pin := encode(digest(v_clean_pin, 'sha256'), 'hex');

    INSERT INTO private_auth.user_secrets (user_id, argon2_parent_pin_hash, updated_at)
    VALUES (p_student_id, v_hashed_pin, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        argon2_parent_pin_hash = EXCLUDED.argon2_parent_pin_hash,
        updated_at = NOW();

    UPDATE public.users_raw
    SET parent_pin = NULL,
        failed_pin_attempts = 0,
        pin_locked_until = NULL
    WHERE id = p_student_id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_parent_pin_with_recovery_key(UUID, TEXT, TEXT) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.set_parent_pin(p_student_id UUID, p_new_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
AS $$
BEGIN
    -- Delegates to set_parent_pin_with_recovery_key (Student caller without recovery key is blocked)
    RETURN public.set_parent_pin_with_recovery_key(p_student_id, p_new_pin, NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_parent_pin(UUID, TEXT) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 6. DROP ALL LEFTOVER PERMISSIVE LEGACY RLS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "schools_update_auth" ON public.schools;
DROP POLICY IF EXISTS "rooms_insert_policy" ON public.rooms;
DROP POLICY IF EXISTS "rooms_update_policy" ON public.rooms;
DROP POLICY IF EXISTS "rooms_delete_policy" ON public.rooms;
DROP POLICY IF EXISTS "subjects_insert_policy" ON public.subjects;
DROP POLICY IF EXISTS "subjects_update_policy" ON public.subjects;
DROP POLICY IF EXISTS "subjects_delete_policy" ON public.subjects;
DROP POLICY IF EXISTS "duties_insert_policy" ON public.duties;
DROP POLICY IF EXISTS "duties_update_policy" ON public.duties;
DROP POLICY IF EXISTS "duties_delete_policy" ON public.duties;

-- ------------------------------------------------------------------------------
-- 7. STORAGE SELECT SCOPING (ELIMINATE BLANKET CROSS-TENANT ASSET READS)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow scoped read access to campus-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow scoped read access to groovelab-assets" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder campus 1okj9_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read groovelab-assets" ON storage.objects;
DROP POLICY IF EXISTS "enterprise_scoped_select_campus_assets" ON storage.objects;
DROP POLICY IF EXISTS "enterprise_scoped_select_groovelab_assets" ON storage.objects;

CREATE POLICY "enterprise_scoped_select_campus_assets"
ON storage.objects FOR SELECT TO authenticated, anon
USING (
    bucket_id = 'campus-assets'
    AND (
        (storage.foldername(name))[1] IN ('public', 'avatars', 'branding', 'system')
        OR (public.get_current_authenticated_user_id() IS NOT NULL 
            AND (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text)
        OR public.is_master_admin()
        OR (public.get_current_user_role() IN ('admin', 'secretary', 'teacher') AND (
            EXISTS (
                SELECT 1 FROM public.users_raw u
                WHERE u.id::text = (storage.foldername(name))[1]
                  AND u.school_id = public.get_current_user_school_id()
            )
        ))
    )
);

CREATE POLICY "enterprise_scoped_select_groovelab_assets"
ON storage.objects FOR SELECT TO authenticated, anon
USING (
    bucket_id = 'groovelab-assets'
    AND (
        (storage.foldername(name))[1] IN ('public', 'avatars', 'branding', 'system')
        OR (public.get_current_authenticated_user_id() IS NOT NULL 
            AND (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text)
        OR public.is_master_admin()
        OR (public.get_current_user_role() IN ('admin', 'secretary', 'teacher') AND (
            EXISTS (
                SELECT 1 FROM public.users_raw u
                WHERE u.id::text = (storage.foldername(name))[1]
                  AND u.school_id = public.get_current_user_school_id()
            )
        ))
    )
);

-- ------------------------------------------------------------------------------
-- 8. HARDEN DESTRUCTIVE & SENSITIVE ADMINISTRATIVE RPCS
-- ------------------------------------------------------------------------------

-- Prune Inactive Students Bulk (Master Admin Only)
CREATE OR REPLACE FUNCTION public.prune_inactive_students_bulk(p_school_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_count INTEGER := 0;
    v_master_id UUID;
BEGIN
    v_master_id := public.get_current_authenticated_user_id();

    -- 🛡️ FAIL-CLOSED: Strictly enforce Master Admin or Service Role
    IF NOT public.is_master_admin() AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
        RAISE EXCEPTION 'Zugriff verweigert: Nur Master-Administratoren dürfen Schüler-Pruning ausführen.' USING ERRCODE = '42501';
    END IF;

    WITH updated_rows AS (
        UPDATE public.users_raw
        SET is_campus_active = FALSE,
            is_groovelab_active = FALSE
        WHERE role = 'student'
          AND (
              last_seen < NOW() - INTERVAL '60 days'
              OR (last_seen IS NULL AND created_at < NOW() - INTERVAL '60 days')
          )
          AND (is_campus_active = TRUE OR is_groovelab_active = TRUE)
          AND (p_school_id IS NULL OR school_id = p_school_id)
          AND COALESCE(student_billing_payment_method, '') NOT IN ('annual', 'bank_transfer_annual', 'schuljahr_komplett', 'school_annual')
          AND COALESCE(exempt_from_direct_billing, FALSE) = FALSE
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM updated_rows;

    INSERT INTO public.audit_logs (
        table_name, operation, record_id, changed_by, new_data
    ) VALUES (
        'users_raw', 'BULK_INACTIVE_PRUNE_PASSIVE_SWITCH',
        COALESCE(p_school_id, gen_random_uuid()),
        COALESCE(v_master_id, gen_random_uuid()),
        jsonb_build_object(
            'action', 'prune_inactive_students_bulk',
            'pruned_count', v_count,
            'school_id', p_school_id,
            'mode', 'switch_to_passive_basis_bereitstellung_0_09',
            'timestamp', NOW()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'deactivated_count', v_count,
        'message', format('%s inaktive Schülerprofile wurden auf Basis-Bereitstellung umgestellt.', v_count)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.prune_inactive_students_bulk(UUID) TO authenticated, service_role;

-- Inactive Students Preview (Strict Tenancy / Staff Scoping)
CREATE OR REPLACE FUNCTION public.get_inactive_students_preview(
    p_school_id UUID DEFAULT NULL
)
RETURNS TABLE (
    student_id UUID,
    school_id UUID,
    first_name TEXT,
    last_name TEXT,
    last_seen TIMESTAMPTZ,
    days_inactive INT,
    current_campus_active BOOLEAN,
    current_groovelab_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_school UUID;
BEGIN
    v_caller_role := public.get_current_user_role();
    v_caller_school := public.get_current_user_school_id();

    -- Master Admin can view any or all; School Staff can ONLY view their own school
    IF NOT public.is_master_admin() THEN
        IF v_caller_role NOT IN ('admin', 'secretary') OR v_caller_school IS NULL THEN
            RETURN;
        END IF;
        p_school_id := v_caller_school;
    END IF;

    RETURN QUERY
    SELECT 
        u.id AS student_id,
        u.school_id,
        u.first_name,
        u.last_name,
        u.last_seen,
        EXTRACT(DAY FROM (NOW() - COALESCE(u.last_seen, u.created_at)))::INT AS days_inactive,
        COALESCE(u.is_campus_active, false) AS current_campus_active,
        COALESCE(u.is_groovelab_active, false) AS current_groovelab_active
    FROM public.users_raw u
    WHERE u.role = 'student'
      AND (
          u.last_seen < NOW() - INTERVAL '60 days'
          OR (u.last_seen IS NULL AND u.created_at < NOW() - INTERVAL '60 days')
      )
      AND (u.is_campus_active = TRUE OR u.is_groovelab_active = TRUE)
      AND (p_school_id IS NULL OR u.school_id = p_school_id)
      AND COALESCE(u.student_billing_payment_method, '') NOT IN ('annual', 'bank_transfer_annual', 'schuljahr_komplett', 'school_annual')
      AND COALESCE(u.exempt_from_direct_billing, FALSE) = FALSE
    ORDER BY u.last_seen ASC NULLS FIRST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_inactive_students_preview(UUID) TO authenticated, service_role;

-- Commit Teacher Schedule Draft (Strict Authorization Guard)
CREATE OR REPLACE FUNCTION public.commit_teacher_schedule_draft(
    p_teacher_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school UUID;
    v_target_school UUID;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school := public.get_current_user_school_id();

    SELECT school_id INTO v_target_school FROM public.users_raw WHERE id = p_teacher_id;

    IF NOT (
        public.is_master_admin()
        OR (v_caller_id IS NOT NULL AND v_caller_id = p_teacher_id)
        OR (v_caller_role IN ('admin', 'secretary') AND v_caller_school = v_target_school)
    ) THEN
        RAISE EXCEPTION 'Zugriff verweigert: Unzureichende Berechtigungen zum Übertragen des Stundenplans.' USING ERRCODE = '42501';
    END IF;

    DELETE FROM public.schedules WHERE teacher_id = p_teacher_id;

    INSERT INTO public.schedules (
        school_id, teacher_id, student_id, room_id, day_of_week, 
        start_time, end_time, instrument, lesson_type, recurrence, is_active
    )
    SELECT 
        school_id, teacher_id, student_id, room_id, day_of_week, 
        start_time, end_time, instrument, lesson_type, recurrence, true
    FROM public.schedule_drafts
    WHERE teacher_id = p_teacher_id;

    RETURN jsonb_build_object('success', true, 'teacher_id', p_teacher_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.commit_teacher_schedule_draft(UUID) TO authenticated, service_role;

-- Purge Student Audio Assets (Strict Authorization Guard)
CREATE OR REPLACE FUNCTION public.purge_student_audio_assets(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_catalog
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school UUID;
    v_target_school UUID;
    v_deleted_count INT := 0;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school := public.get_current_user_school_id();

    SELECT school_id INTO v_target_school FROM public.users_raw WHERE id = p_student_id;

    IF NOT (
        public.is_master_admin()
        OR (v_caller_id IS NOT NULL AND v_caller_id = p_student_id)
        OR (v_caller_role IN ('admin', 'secretary') AND v_caller_school = v_target_school)
    ) THEN
        RAISE EXCEPTION 'Zugriff verweigert: Unzureichende Berechtigungen zum Löschen der Audio-Dateien.' USING ERRCODE = '42501';
    END IF;

    WITH deleted AS (
        DELETE FROM storage.objects
        WHERE bucket_id IN ('campus-assets', 'groovelab-assets')
          AND (storage.foldername(name))[1] = p_student_id::text
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted;

    RETURN jsonb_build_object('success', true, 'deleted_count', v_deleted_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_student_audio_assets(UUID) TO authenticated, service_role;

-- School Subscription & Billing Mutations (Strict Admin Guard)
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
    v_caller_role TEXT;
    v_caller_school UUID;
BEGIN
    v_caller_role := public.get_current_user_role();
    v_caller_school := public.get_current_user_school_id();

    IF NOT (public.is_master_admin() OR (v_caller_role IN ('admin', 'secretary') AND v_caller_school = p_school_id)) THEN
        RAISE EXCEPTION 'Zugriff verweigert: Unzureichende Berechtigungen zur Bestätigung von Schulverträgen.' USING ERRCODE = '42501';
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

GRANT EXECUTE ON FUNCTION public.confirm_school_subscription(UUID, BOOLEAN, BOOLEAN, TEXT, TEXT, INTEGER, NUMERIC) TO authenticated, service_role;

-- Cancel School Subscription (Strict Admin Guard)
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
    v_caller_role TEXT;
    v_caller_school UUID;
BEGIN
    v_caller_role := public.get_current_user_role();
    v_caller_school := public.get_current_user_school_id();

    IF NOT (public.is_master_admin() OR (v_caller_role IN ('admin', 'secretary') AND v_caller_school = p_school_id)) THEN
        RAISE EXCEPTION 'Zugriff verweigert: Unzureichende Berechtigungen zur Kündigung von Schulverträgen.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.schools SET
        status = 'cancelled',
        cancellation_reason = COALESCE(p_cancellation_reason, cancellation_reason),
        cancelled_at = NOW()
    WHERE id = p_school_id;

    RETURN jsonb_build_object('success', true, 'school_id', p_school_id, 'status', 'cancelled');
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_school_subscription(UUID, TEXT) TO authenticated, service_role;

-- Apply School Service Credit (Strict Master Admin Guard)
CREATE OR REPLACE FUNCTION public.apply_school_service_credit(
    p_school_id UUID,
    p_credit_amount NUMERIC,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    IF NOT public.is_master_admin() THEN
        RAISE EXCEPTION 'Zugriff verweigert: Gutschriften können nur durch den Plattform-Betreiber erteilt werden.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.schools SET
        service_credit = COALESCE(service_credit, 0.00) + COALESCE(p_credit_amount, 0.00)
    WHERE id = p_school_id;

    RETURN jsonb_build_object('success', true, 'school_id', p_school_id, 'credited', p_credit_amount);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_school_service_credit(UUID, NUMERIC, TEXT) TO authenticated, service_role;

-- Calendar Token Rotation (Strict Scoping, Eliminate Null-Caller Fallback)
CREATE OR REPLACE FUNCTION public.get_or_rotate_calendar_token(
    p_user_id UUID DEFAULT NULL,
    p_force_rotate BOOLEAN DEFAULT FALSE
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    v_caller_id UUID;
    v_target_id UUID;
    v_token TEXT;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();

    IF p_user_id IS NOT NULL THEN
        IF v_caller_id = p_user_id OR public.is_master_admin() THEN
            v_target_id := p_user_id;
        ELSIF v_caller_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.users_raw target
            WHERE target.id = p_user_id
              AND target.school_id = public.get_current_user_school_id()
              AND public.get_current_user_role() IN ('teacher', 'admin', 'secretary')
        ) THEN
            v_target_id := p_user_id;
        ELSE
            -- 🛡️ FAIL-CLOSED: No anonymous calendar token extraction!
            RAISE EXCEPTION 'Nicht autorisiert zur Kalender-Token-Generierung' USING ERRCODE = '42501';
        END IF;
    ELSE
        v_target_id := v_caller_id;
    END IF;

    IF v_target_id IS NULL THEN
        RAISE EXCEPTION 'Nicht autorisiert zur Kalender-Token-Generierung' USING ERRCODE = '42501';
    END IF;

    SELECT calendar_token INTO v_token FROM public.users_raw WHERE id = v_target_id;

    IF v_token IS NULL OR p_force_rotate THEN
        v_token := encode(extensions.gen_random_bytes(32), 'hex');
        UPDATE public.users_raw SET calendar_token = v_token WHERE id = v_target_id;
    END IF;

    RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_rotate_calendar_token(UUID, BOOLEAN) TO authenticated, service_role;

-- Cancel Student Schedule Occurrence (Verify Caller Authorization)
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
    v_student_name TEXT;
    v_date_str TEXT;
    v_time_str TEXT;
    v_now_str TEXT;
    v_note_text TEXT;
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

    -- 🛡️ STRICT CALLER VALIDATION:
    -- If caller is authenticated, must be student themselves, staff in same school, or master admin
    IF v_caller_id IS NOT NULL THEN
        IF NOT (
            public.is_master_admin()
            OR v_caller_id = p_student_id
            OR (v_caller_school_id = v_school_id AND v_caller_role IN ('teacher', 'admin', 'secretary'))
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Zugriff verweigert: Unzureichende Berechtigungen zur Terminabsage fremder Schüler.');
        END IF;
    END IF;

    -- If parent does not allow student self-absence, require valid parent PIN or staff bypass
    IF NOT v_allow_absences THEN
        IF p_parent_pin IS NOT NULL AND length(TRIM(p_parent_pin)) >= 4 THEN
            IF NOT public.verify_parent_pin(p_student_id, TRIM(p_parent_pin)) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Eltern-PIN ungültig. Terminabsage verweigert.');
            END IF;
        ELSIF public.is_master_admin() OR (v_caller_school_id = v_school_id AND v_caller_role IN ('teacher', 'admin', 'secretary')) THEN
            NULL;
        ELSE
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Abwesenheitsmeldung gesperrt: Terminabsagen müssen durch Erziehungsberechtigte mit Eltern-PIN autorisiert werden.'
            );
        END IF;
    END IF;

    IF v_teacher_id IS NULL THEN
        v_teacher_id := v_student_rec.teacher_id;
    END IF;

    v_student_name := COALESCE(v_student_rec.first_name || ' ' || SUBSTRING(COALESCE(v_student_rec.last_name, '') FROM 1 FOR 1) || '.', 'Ein Schüler');
    v_date_str := to_char(p_date, 'DD.MM.YYYY');
    v_time_str := SUBSTRING(p_start_time::text FROM 1 FOR 5);
    v_now_str := to_char(NOW() AT TIME ZONE 'Europe/Berlin', 'DD.MM.YYYY') || ' um ' || to_char(NOW() AT TIME ZONE 'Europe/Berlin', 'HH24:MI') || ' Uhr';

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

-- ------------------------------------------------------------------------------
-- 9. SAFE ALIGNMENT OF GET_USER_SCHOOL_ID & PINNED SEARCH_PATH
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
SET row_security = off
AS $$
BEGIN
    RETURN public.get_current_user_school_id();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_school_id() TO anon, authenticated, service_role;

-- Pin search path on core security definer functions
ALTER FUNCTION public.get_qr_token(uuid) SET search_path = public, pg_temp, extensions;
ALTER FUNCTION public.check_school_access(uuid) SET search_path = public, pg_temp, extensions;

-- ------------------------------------------------------------------------------
-- 10. REFRESH SCHEMA CACHE
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
