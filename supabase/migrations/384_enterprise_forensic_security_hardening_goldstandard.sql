-- ==============================================================================
-- MIGRATION 384: ENTERPRISE FORENSIC SECURITY HARDENING GOLDSTANDARD
-- Standards: OWASP ASVS Level 3, BSI IT-Grundschutz (APP.3.1 / SYS.1.8), DSGVO Art. 8, 25 & 32
-- 
-- 1. HARDEN HANDLE_USERS_VIEW_DML:
--    - Privilege Escalation Shield: Blocks unauthorized client modifications to school_id, is_master_admin, roles, and role.
--    - Student Protection Shield: Blocks student accounts from altering last_name, parent_allow_* flags, parent_permissions, and parent_pin.
--    - Retains all recent columns: parent_name, parental_consent_given_at, consent_version, campus_usage_mode, skill_radar_levels.
--    - Enforces Teacher Non-Surveillance Guard: last_seen is unconditionally NULL for teachers.
--
-- 2. HARDEN STORAGE DELETE POLICIES:
--    - Enforces Path-Traversal Immunity (name NOT LIKE '%..%') on DELETE operations for campus-assets and groovelab-assets.
--    - Ensures strict user folder or school staff authorization.
--
-- 3. HARDEN SET_INITIAL_STUDENT_PIN RPC:
--    - Eliminates token-empty ('') bypass vulnerability.
--    - Strictly requires genuine token match, authenticated self, or school staff within the same school.
--    - Blocks unauthorized takeover if is_pin_activated is already true.
--
-- 4. HARDEN SET_PERSONAL_PIN RPC:
--    - Enforces Multi-Tenancy School Boundary Scoping for school staff (prevents cross-tenant PIN modifications).
--
-- 5. HARDEN SET_PARENT_PIN_WITH_RECOVERY_KEY & SET_PARENT_PIN RPCS:
--    - Enforces Multi-Tenancy School Boundary Scoping for school staff.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDENED HANDLE_USERS_VIEW_DML TRIGGER FUNCTION
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
        -- Prevent unauthorized creation of master admins
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
        -- 🛡️ ZERO-TRUST PRIVILEGE-ESCALATION GUARDS:
        -- Non-master-admins CANNOT modify school_id, is_master_admin, or roles via view
        IF NOT v_is_master THEN
            NEW.school_id := OLD.school_id;
            NEW.is_master_admin := OLD.is_master_admin;
            NEW.roles := OLD.roles;
            -- Role switching must occur through switch_user_active_role RPC,
            -- unless school staff (admin/secretary) is managing another user
            IF NOT v_is_school_staff AND OLD.id = v_caller_uid THEN
                NEW.role := OLD.role;
            END IF;
        END IF;

        UPDATE public.users_raw SET
            school_id = COALESCE(NEW.school_id, users_raw.school_id),
            role = COALESCE(NEW.role, users_raw.role),
            first_name = COALESCE(NEW.first_name, users_raw.first_name),
            -- 🛡️ MINOR PRIVACY GUARD: Students cannot change their legal last_name
            last_name = CASE 
                WHEN v_is_student THEN users_raw.last_name 
                ELSE COALESCE(NEW.last_name, users_raw.last_name) 
            END,
            avatar_url = COALESCE(NEW.avatar_url, users_raw.avatar_url),
            qr_token = COALESCE(NEW.qr_token, users_raw.qr_token),
            calendar_token = COALESCE(NEW.calendar_token, users_raw.calendar_token),
            instrument = COALESCE(NEW.instrument, users_raw.instrument),
            coach_notes = COALESCE(NEW.coach_notes, users_raw.coach_notes),
            photo_url = COALESCE(NEW.photo_url, users_raw.photo_url),
            bio = COALESCE(NEW.bio, users_raw.bio),
            bands = COALESCE(NEW.bands, users_raw.bands),
            projects = COALESCE(NEW.projects, users_raw.projects),
            listening = COALESCE(NEW.listening, users_raw.listening),
            gear = COALESCE(NEW.gear, users_raw.gear),
            musical_styles = COALESCE(NEW.musical_styles, users_raw.musical_styles),
            equipment_list = COALESCE(NEW.equipment_list, users_raw.equipment_list),
            last_seen = CASE 
                WHEN users_raw.role = 'teacher' THEN NULL 
                ELSE COALESCE(v_target_last_seen, users_raw.last_seen) 
            END,
            expertise = COALESCE(NEW.expertise, users_raw.expertise),
            age = COALESCE(NEW.age, users_raw.age),
            birth_date = COALESCE(NEW.birth_date, users_raw.birth_date),
            pending_repertoire_proposal = COALESCE(NEW.pending_repertoire_proposal, users_raw.pending_repertoire_proposal),
            is_external_vocalist = COALESCE(NEW.is_external_vocalist, users_raw.is_external_vocalist),
            show_messages_menu = COALESCE(NEW.show_messages_menu, users_raw.show_messages_menu),
            master_admin_username = COALESCE(NEW.master_admin_username, users_raw.master_admin_username),
            is_trial = COALESCE(NEW.is_trial, users_raw.is_trial),
            trial_ends_at = COALESCE(NEW.trial_ends_at, users_raw.trial_ends_at),
            contract_ends_at = COALESCE(NEW.contract_ends_at, users_raw.contract_ends_at),
            contract_decision_made = COALESCE(NEW.contract_decision_made, users_raw.contract_decision_made),
            delete_after_contract = COALESCE(NEW.delete_after_contract, users_raw.delete_after_contract),
            status = COALESCE(NEW.status, users_raw.status),
            is_app_user = COALESCE(NEW.is_app_user, users_raw.is_app_user),
            is_campus_active = COALESCE(NEW.is_campus_active, users_raw.is_campus_active),
            is_groovelab_active = COALESCE(NEW.is_groovelab_active, users_raw.is_groovelab_active),
            is_premium_user = COALESCE(NEW.is_premium_user, users_raw.is_premium_user),
            teacher_id = COALESCE(NEW.teacher_id, users_raw.teacher_id),
            ausweis_nummer = COALESCE(NEW.ausweis_nummer, users_raw.ausweis_nummer),
            teacher_qr_token = COALESCE(NEW.teacher_qr_token, users_raw.teacher_qr_token),
            is_active = COALESCE(NEW.is_active, users_raw.is_active),
            max_students = COALESCE(NEW.max_students, users_raw.max_students),
            nickname = COALESCE(NEW.nickname, users_raw.nickname),
            ausweis_id = COALESCE(NEW.ausweis_id, users_raw.ausweis_id),
            show_sekretariat = COALESCE(NEW.show_sekretariat, users_raw.show_sekretariat),
            show_campus = COALESCE(NEW.show_campus, users_raw.show_campus),
            show_groovelab = COALESCE(NEW.show_groovelab, users_raw.show_groovelab),
            lesson_duration = COALESCE(NEW.lesson_duration, users_raw.lesson_duration),
            planned_boards = COALESCE(NEW.planned_boards, users_raw.planned_boards),
            required_equipment = COALESCE(NEW.required_equipment, users_raw.required_equipment),
            sick_until = COALESCE(NEW.sick_until, users_raw.sick_until),
            phone = COALESCE(NEW.phone, users_raw.phone),
            joker_used = COALESCE(NEW.joker_used, users_raw.joker_used),
            is_pin_activated = COALESCE(NEW.is_pin_activated, users_raw.is_pin_activated),
            "groovelab_räume" = COALESCE(NEW."groovelab_räume", users_raw."groovelab_räume"),
            "campus_räume" = COALESCE(NEW."campus_räume", users_raw."campus_räume"),
            joker_used_at = COALESCE(NEW.joker_used_at, users_raw.joker_used_at),
            sick_start = COALESCE(NEW.sick_start, users_raw.sick_start),
            push_notifications_enabled = COALESCE(NEW.push_notifications_enabled, users_raw.push_notifications_enabled),
            push_notif_schedule_changes = COALESCE(NEW.push_notif_schedule_changes, users_raw.push_notif_schedule_changes),
            push_notif_homework = COALESCE(NEW.push_notif_homework, users_raw.push_notif_homework),
            push_notif_all_features = COALESCE(NEW.push_notif_all_features, users_raw.push_notif_all_features),
            app_usage_mode = COALESCE(NEW.app_usage_mode, users_raw.app_usage_mode),
            preferred_room_ids = COALESCE(NEW.preferred_room_ids, users_raw.preferred_room_ids),
            groovelab_instrument = COALESCE(NEW.groovelab_instrument, users_raw.groovelab_instrument),
            student_billing_payment_method = COALESCE(NEW.student_billing_payment_method, users_raw.student_billing_payment_method),
            activated_at = COALESCE(NEW.activated_at, users_raw.activated_at),
            student_billing_cash_paid = COALESCE(NEW.student_billing_cash_paid, users_raw.student_billing_cash_paid),
            exempt_from_direct_billing = COALESCE(NEW.exempt_from_direct_billing, users_raw.exempt_from_direct_billing),
            group_id = COALESCE(NEW.group_id, users_raw.group_id),
            sibling_group_id = COALESCE(NEW.sibling_group_id, users_raw.sibling_group_id),

            -- 🛡️ GOLDSTANDARD PRIVILEGE ESCALATION SHIELD:
            -- Student accounts CANNOT modify parental control flags via DML!
            parent_allow_chat = CASE 
                WHEN v_is_student THEN users_raw.parent_allow_chat 
                ELSE COALESCE(NEW.parent_allow_chat, users_raw.parent_allow_chat) 
            END,
            parent_allow_timer = CASE 
                WHEN v_is_student THEN users_raw.parent_allow_timer 
                ELSE COALESCE(NEW.parent_allow_timer, users_raw.parent_allow_timer) 
            END,
            parent_allow_leaderboard = CASE 
                WHEN v_is_student THEN users_raw.parent_allow_leaderboard 
                ELSE COALESCE(NEW.parent_allow_leaderboard, users_raw.parent_allow_leaderboard) 
            END,
            parent_allow_groups = CASE 
                WHEN v_is_student THEN users_raw.parent_allow_groups 
                ELSE COALESCE(NEW.parent_allow_groups, users_raw.parent_allow_groups) 
            END,
            parent_allow_proposals = CASE 
                WHEN v_is_student THEN users_raw.parent_allow_proposals 
                ELSE COALESCE(NEW.parent_allow_proposals, users_raw.parent_allow_proposals) 
            END,
            parent_allow_absences = CASE 
                WHEN v_is_student THEN users_raw.parent_allow_absences 
                ELSE COALESCE(NEW.parent_allow_absences, users_raw.parent_allow_absences) 
            END,
            parent_allow_audio = CASE 
                WHEN v_is_student THEN users_raw.parent_allow_audio 
                ELSE COALESCE(NEW.parent_allow_audio, users_raw.parent_allow_audio) 
            END,
            parent_permissions = CASE 
                WHEN v_is_student THEN users_raw.parent_permissions 
                ELSE COALESCE(NEW.parent_permissions, users_raw.parent_permissions) 
            END,
            parent_pin = CASE 
                WHEN v_is_student THEN users_raw.parent_pin 
                ELSE COALESCE(hashed_parent_pin, users_raw.parent_pin) 
            END,

            campus_ui_level = COALESCE(NEW.campus_ui_level, users_raw.campus_ui_level),
            pin_enforced_for_preview = COALESCE(NEW.pin_enforced_for_preview, users_raw.pin_enforced_for_preview),
            parent_name = COALESCE(NEW.parent_name, users_raw.parent_name),
            parental_consent_given_at = COALESCE(NEW.parental_consent_given_at, users_raw.parental_consent_given_at),
            consent_version = COALESCE(NEW.consent_version, users_raw.consent_version),
            campus_usage_mode = COALESCE(NEW.campus_usage_mode, users_raw.campus_usage_mode),
            teacher_onboarding_completed = COALESCE(NEW.teacher_onboarding_completed, users_raw.teacher_onboarding_completed),
            teacher_availability = COALESCE(NEW.teacher_availability, users_raw.teacher_availability),
            is_2fa_enabled = COALESCE(NEW.is_2fa_enabled, users_raw.is_2fa_enabled),
            personal_pin = COALESCE(NEW.personal_pin, users_raw.personal_pin),
            failed_pin_attempts = COALESCE(NEW.failed_pin_attempts, users_raw.failed_pin_attempts),
            pin_locked_until = COALESCE(NEW.pin_locked_until, users_raw.pin_locked_until),
            sessions_revoked_at = COALESCE(NEW.sessions_revoked_at, users_raw.sessions_revoked_at),
            token_version = COALESCE(NEW.token_version, users_raw.token_version),
            token_signature = COALESCE(NEW.token_signature, users_raw.token_signature),
            qr_token_redeemed_at = COALESCE(NEW.qr_token_redeemed_at, users_raw.qr_token_redeemed_at),
            skill_radar_levels = COALESCE(NEW.skill_radar_levels, users_raw.skill_radar_levels)
        WHERE id = OLD.id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_view_dml ON public.users;
CREATE TRIGGER trg_users_view_dml
    INSTEAD OF INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_users_view_dml();

-- ------------------------------------------------------------------------------
-- 2. HARDEN STORAGE DELETE POLICIES (PATH TRAVERSAL IMMUNITY)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated deletes from groovelab-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from campus-assets" ON storage.objects;

CREATE POLICY "Allow authenticated deletes from groovelab-assets"
ON storage.objects FOR DELETE TO authenticated, service_role
USING (
    bucket_id = 'groovelab-assets'
    AND name NOT LIKE '%..%'
    AND (
        public.is_master_admin()
        OR public.get_current_user_role() IN ('admin', 'secretary')
        OR (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text
    )
);

CREATE POLICY "Allow authenticated deletes from campus-assets"
ON storage.objects FOR DELETE TO authenticated, service_role
USING (
    bucket_id = 'campus-assets'
    AND name NOT LIKE '%..%'
    AND (
        public.is_master_admin()
        OR public.get_current_user_role() IN ('admin', 'secretary')
        OR (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text
    )
);

-- ------------------------------------------------------------------------------
-- 3. HARDEN SET_INITIAL_STUDENT_PIN (ELIMINATE TOKEN-EMPTY BYPASS & ENFORCE BOUNDARIES)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_initial_student_pin(
    p_student_id UUID,
    p_qr_token TEXT,
    p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
AS $$
DECLARE
    v_clean_pin TEXT;
    v_hash TEXT;
    v_user RECORD;
    v_clean_token TEXT;
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_day_of_birth INT;
    v_token_matches BOOLEAN := FALSE;
BEGIN
    IF p_student_id IS NULL OR p_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    v_clean_pin := TRIM(p_pin);
    IF LENGTH(v_clean_pin) <> 4 THEN
        RETURN FALSE;
    END IF;

    v_clean_token := TRIM(COALESCE(p_qr_token, ''));
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school_id := public.get_current_user_school_id();

    -- Fetch student record
    SELECT id, school_id, qr_token, teacher_qr_token, ausweis_nummer, birth_date, is_pin_activated
    INTO v_user
    FROM public.users_raw
    WHERE id = p_student_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Evaluate matching token
    IF v_clean_token <> '' THEN
        IF v_user.qr_token::text = v_clean_token 
           OR v_user.teacher_qr_token::text = v_clean_token 
           OR UPPER(v_user.ausweis_nummer) = UPPER(v_clean_token)
           OR v_user.id::text = v_clean_token THEN
            v_token_matches := TRUE;
        END IF;
    END IF;

    -- Strict Authorization Barrier:
    -- 1. Must be master admin, OR
    -- 2. Caller is the student themselves, OR
    -- 3. Caller is school staff of the student's own school, OR
    -- 4. A genuine non-empty token was provided AND pin was not yet activated (initial onboarding)
    IF NOT (
        public.is_master_admin()
        OR (v_caller_id IS NOT NULL AND v_caller_id = p_student_id)
        OR (v_caller_role IN ('admin', 'secretary', 'teacher') AND v_caller_school_id = v_user.school_id)
        OR (v_token_matches AND COALESCE(v_user.is_pin_activated, FALSE) = FALSE)
    ) THEN
        RETURN FALSE;
    END IF;

    v_hash := encode(digest(v_clean_pin, 'sha256'), 'hex');

    -- Store hash securely in private_auth.user_secrets
    INSERT INTO private_auth.user_secrets (user_id, argon2_personal_pin_hash, updated_at)
    VALUES (p_student_id, v_hash, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        argon2_personal_pin_hash = EXCLUDED.argon2_personal_pin_hash,
        updated_at = NOW();

    -- Update users_raw
    UPDATE public.users_raw SET
        personal_pin = NULL,
        failed_pin_attempts = 0,
        pin_locked_until = NULL,
        is_pin_activated = TRUE,
        is_campus_active = TRUE,
        status = 'aktiv'
    WHERE id = p_student_id;

    -- Legacy table updates
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
            status = 'aktiv'
        WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Activation day tracking
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
-- 4. HARDEN SET_PERSONAL_PIN (ENFORCE SCHOOL TENANT BOUNDARY)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_personal_pin(p_user_id UUID, p_new_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
AS $$
DECLARE
    v_hashed_pin TEXT;
    v_clean_pin TEXT;
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_target_school_id UUID;
BEGIN
    IF p_user_id IS NULL OR p_new_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    v_clean_pin := TRIM(p_new_pin);
    IF LENGTH(v_clean_pin) < 4 THEN
        RETURN FALSE;
    END IF;

    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school_id := public.get_current_user_school_id();

    -- Fetch target school
    SELECT school_id INTO v_target_school_id
    FROM public.users_raw
    WHERE id = p_user_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Multi-Tenancy Boundary Check:
    -- Self, Master Admin, or school staff within the exact SAME school
    IF NOT (
        public.is_master_admin()
        OR (v_caller_id IS NOT NULL AND v_caller_id = p_user_id)
        OR (v_caller_role IN ('admin', 'secretary', 'teacher') AND v_caller_school_id = v_target_school_id)
    ) THEN
        RETURN FALSE;
    END IF;

    v_hashed_pin := encode(digest(v_clean_pin, 'sha256'), 'hex');

    INSERT INTO private_auth.user_secrets (user_id, argon2_personal_pin_hash, updated_at)
    VALUES (p_user_id, v_hashed_pin, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        argon2_personal_pin_hash = EXCLUDED.argon2_personal_pin_hash,
        updated_at = NOW();

    UPDATE public.users_raw
    SET personal_pin = NULL, 
        failed_pin_attempts = 0, 
        pin_locked_until = NULL, 
        is_pin_activated = TRUE,
        is_campus_active = TRUE
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_personal_pin(UUID, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 5. HARDEN SET_PARENT_PIN_WITH_RECOVERY_KEY (ENFORCE SCHOOL TENANT BOUNDARY)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_parent_pin_with_recovery_key(
    p_student_id UUID,
    p_new_pin TEXT,
    p_recovery_key TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
AS $$
DECLARE
    v_hashed_pin TEXT;
    v_clean_key TEXT;
    v_hashed_recovery TEXT := NULL;
    v_clean_pin TEXT := TRIM(p_new_pin);
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_target_school_id UUID;
BEGIN
    IF p_student_id IS NULL OR v_clean_pin IS NULL OR length(v_clean_pin) < 4 THEN
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

    -- Multi-Tenancy Boundary Check:
    -- Self, Master Admin, or school staff within the exact SAME school
    IF NOT (
        public.is_master_admin()
        OR (v_caller_id IS NOT NULL AND v_caller_id = p_student_id)
        OR (v_caller_role IN ('admin', 'secretary', 'teacher') AND v_caller_school_id = v_target_school_id)
    ) THEN
        RETURN FALSE;
    END IF;

    v_hashed_pin := encode(digest(v_clean_pin, 'sha256'), 'hex');

    IF p_recovery_key IS NOT NULL AND TRIM(p_recovery_key) <> '' THEN
        v_clean_key := regexp_replace(upper(trim(p_recovery_key)), '[\s-]|^(REC)', '', 'g');
        IF v_clean_key <> '' THEN
            v_hashed_recovery := encode(digest(v_clean_key, 'sha256'), 'hex');
        END IF;
    END IF;

    INSERT INTO private_auth.user_secrets (
        user_id,
        argon2_parent_pin_hash,
        parent_recovery_key_hash,
        updated_at
    )
    VALUES (
        p_student_id,
        v_hashed_pin,
        v_hashed_recovery,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        argon2_parent_pin_hash = EXCLUDED.argon2_parent_pin_hash,
        parent_recovery_key_hash = COALESCE(EXCLUDED.parent_recovery_key_hash, private_auth.user_secrets.parent_recovery_key_hash),
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

-- Backward compatibility wrapper for set_parent_pin
CREATE OR REPLACE FUNCTION public.set_parent_pin(
    p_student_id UUID,
    p_new_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
AS $$
BEGIN
    RETURN public.set_parent_pin_with_recovery_key(p_student_id, p_new_pin, NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_parent_pin(UUID, TEXT) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 6. NOTIFY PostgREST TO RELOAD SCHEMA CACHE
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
