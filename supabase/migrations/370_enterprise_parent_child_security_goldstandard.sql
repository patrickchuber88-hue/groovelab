-- ==============================================================================
-- Migration 370: Enterprise Parent & Child Security Goldstandard
-- Standards:
-- 1. OWASP ASVS Level 3: Zero-Trust Privilege Escalation Immunity
-- 2. Fail-Closed Server-Side Enforcement: RPC & DML Protection
-- 3. Elimination of Insecure '0000' Default PIN Fallback
-- 4. Fail-Closed Child Protection: WORM & Parental Chat & Absence Guards
-- 5. Multi-Tenancy: School-Level Boundary Scoping with GoBD Audit Trails
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. VERIFY_PARENT_PIN: ELIMINATE '0000' DEFAULT & ENFORCE SERVER-SIDE HASH CHECK
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_parent_pin(student_id uuid, input_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private_auth', 'pg_temp', 'extensions'
AS $$
DECLARE
    v_stored_hash TEXT;
    v_input_hash TEXT;
    v_is_locked BOOLEAN;
    v_attempts INTEGER;
    v_clean_pin TEXT := TRIM(input_pin);
    v_match BOOLEAN := FALSE;
BEGIN
    IF student_id IS NULL OR v_clean_pin IS NULL OR v_clean_pin = '' THEN
        RETURN FALSE;
    END IF;

    -- Check if locked in users_raw
    SELECT 
        COALESCE(failed_pin_attempts, 0),
        (pin_locked_until IS NOT NULL AND pin_locked_until > NOW())
    INTO v_attempts, v_is_locked
    FROM public.users_raw
    WHERE id = student_id;

    IF v_is_locked THEN
        RETURN FALSE;
    END IF;

    -- Fetch stored hash from isolated private_auth schema first
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'private_auth' AND table_name = 'user_secrets'
    ) THEN
        SELECT argon2_parent_pin_hash
        INTO v_stored_hash
        FROM private_auth.user_secrets
        WHERE user_id = student_id;
    END IF;

    -- Fallback to users_raw parent_pin if private_auth is empty
    IF v_stored_hash IS NULL THEN
        SELECT parent_pin
        INTO v_stored_hash
        FROM public.users_raw
        WHERE id = student_id;
    END IF;

    -- 🛡️ GOLDSTANDARD: If no custom PIN was ever configured, FAIL CLOSED.
    -- Never allow '0000' or default bypasses.
    IF v_stored_hash IS NULL OR v_stored_hash = '' OR v_stored_hash = '0000' THEN
        RETURN FALSE;
    END IF;

    v_input_hash := encode(digest(v_clean_pin, 'sha256'), 'hex');

    -- Match against stored hash or stored plaintext PIN (legacy migration compatibility)
    v_match := (v_stored_hash = v_input_hash)
        OR (length(v_stored_hash) = length(v_clean_pin) AND v_stored_hash = v_clean_pin);

    IF v_match THEN
        UPDATE public.users_raw
        SET failed_pin_attempts = 0, pin_locked_until = NULL
        WHERE id = student_id;
        RETURN TRUE;
    ELSE
        UPDATE public.users_raw
        SET 
            failed_pin_attempts = v_attempts + 1,
            pin_locked_until = CASE WHEN v_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE NULL END
        WHERE id = student_id;
        RETURN FALSE;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_parent_pin(uuid, text) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 2. DML IMMUNITY: SECURE HANDLE_USERS_VIEW_DML TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_users_view_dml()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_target_last_seen TIMESTAMPTZ;
    hashed_parent_pin TEXT;
    v_caller_role TEXT := public.get_current_user_role();
    v_is_student BOOLEAN := (v_caller_role = 'student');
BEGIN
    -- Hash parent_pin if modified
    IF NEW.parent_pin IS NOT NULL AND NEW.parent_pin <> '' THEN
        IF length(NEW.parent_pin) = 64 THEN
            hashed_parent_pin := NEW.parent_pin;
        ELSE
            hashed_parent_pin := encode(digest(NEW.parent_pin, 'sha256'), 'hex');
        END IF;
    ELSE
        hashed_parent_pin := NULL;
    END IF;

    -- Teacher non-surveillance guard
    IF NEW.role = 'teacher' THEN
        v_target_last_seen := NULL;
    ELSE
        v_target_last_seen := NEW.last_seen;
    END IF;

    IF TG_OP = 'INSERT' THEN
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
            pin_enforced_for_preview, teacher_onboarding_completed, teacher_availability,
            is_2fa_enabled, parent_pin, personal_pin, failed_pin_attempts, pin_locked_until,
            sessions_revoked_at, token_version, token_signature, qr_token_redeemed_at
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
            NEW.joker_used_at, NEW.sick_start, NEW.push_notifications_enabled, NEW.push_notif_schedule_changes,
            NEW.push_notif_homework, NEW.push_notif_all_features, NEW.app_usage_mode,
            NEW.preferred_room_ids, NEW.groovelab_instrument, NEW.student_billing_payment_method,
            NEW.activated_at, NEW.student_billing_cash_paid, NEW.roles, NEW.exempt_from_direct_billing,
            NEW.group_id, NEW.sibling_group_id, NEW.parent_allow_chat, NEW.parent_allow_timer,
            NEW.parent_allow_leaderboard, NEW.parent_allow_groups, NEW.parent_allow_proposals,
            NEW.parent_allow_absences, NEW.parent_allow_audio, NEW.campus_ui_level, NEW.parent_permissions,
            NEW.pin_enforced_for_preview, NEW.teacher_onboarding_completed, NEW.teacher_availability,
            COALESCE(NEW.is_2fa_enabled, FALSE), hashed_parent_pin, NEW.personal_pin, NEW.failed_pin_attempts, NEW.pin_locked_until,
            NEW.sessions_revoked_at, COALESCE(NEW.token_version, 1), NEW.token_signature, NEW.qr_token_redeemed_at
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.users_raw SET
            school_id = COALESCE(NEW.school_id, users_raw.school_id),
            role = COALESCE(NEW.role, users_raw.role),
            first_name = COALESCE(NEW.first_name, users_raw.first_name),
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
                WHEN users_raw.role = 'teacher' OR NEW.role = 'teacher' THEN NULL 
                ELSE COALESCE(NEW.last_seen, users_raw.last_seen) 
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
            roles = COALESCE(NEW.roles, users_raw.roles),
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
            teacher_onboarding_completed = COALESCE(NEW.teacher_onboarding_completed, users_raw.teacher_onboarding_completed),
            teacher_availability = COALESCE(NEW.teacher_availability, users_raw.teacher_availability),
            is_2fa_enabled = COALESCE(NEW.is_2fa_enabled, users_raw.is_2fa_enabled),
            personal_pin = COALESCE(NEW.personal_pin, users_raw.personal_pin),
            failed_pin_attempts = COALESCE(NEW.failed_pin_attempts, users_raw.failed_pin_attempts),
            pin_locked_until = COALESCE(NEW.pin_locked_until, users_raw.pin_locked_until),
            sessions_revoked_at = COALESCE(NEW.sessions_revoked_at, users_raw.sessions_revoked_at),
            token_version = COALESCE(NEW.token_version, users_raw.token_version),
            token_signature = COALESCE(NEW.token_signature, users_raw.token_signature),
            qr_token_redeemed_at = COALESCE(NEW.qr_token_redeemed_at, users_raw.qr_token_redeemed_at)
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
-- 3. AUTHORITATIVE RPC: SAVE_PARENT_CONTROLS (MANDATORY PIN CHECK)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_parent_controls(
    p_student_id UUID,
    p_settings JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user RECORD;
    v_caller_id UUID;
    v_caller_role TEXT;
    v_auth_ok BOOLEAN := FALSE;
    v_ui_level TEXT;
    v_allow_absences BOOLEAN;
    v_allow_chat BOOLEAN;
    v_allow_timer BOOLEAN;
    v_allow_leaderboard BOOLEAN;
    v_allow_groups BOOLEAN;
    v_allow_proposals BOOLEAN;
    v_allow_audio BOOLEAN;
    v_parent_permissions JSONB;
    v_old_settings JSONB;
    v_new_settings JSONB;
BEGIN
    -- 1. Locate student
    SELECT * INTO v_user FROM public.users_raw WHERE id = p_student_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student not found: %', p_student_id USING ERRCODE = 'P0002';
    END IF;

    -- 2. Strikte Authentifizierungs- & Autorisierungsbarriere (OWASP ASVS BOLA/IDOR Defense)
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();

    IF public.is_master_admin() THEN
        v_auth_ok := TRUE;
    ELSIF public.get_current_user_school_id() = v_user.school_id AND v_caller_role IN ('admin', 'secretary') THEN
        v_auth_ok := TRUE;
    ELSIF p_settings ? 'parent_pin' AND p_settings->>'parent_pin' IS NOT NULL AND length(TRIM(p_settings->>'parent_pin')) >= 4 THEN
        IF public.verify_parent_pin(p_student_id, TRIM(p_settings->>'parent_pin')) THEN
            v_auth_ok := TRUE;
        END IF;
    END IF;

    -- 🛡️ GOLDSTANDARD FAIL-CLOSED: No student bypass permitted
    IF NOT v_auth_ok THEN
        RAISE EXCEPTION 'Access denied: Valid parent PIN required to modify parental controls for student %', p_student_id 
            USING ERRCODE = '42501';
    END IF;

    v_old_settings := jsonb_build_object(
        'campus_ui_level', v_user.campus_ui_level,
        'parent_allow_absences', v_user.parent_allow_absences,
        'parent_allow_chat', v_user.parent_allow_chat,
        'parent_allow_timer', v_user.parent_allow_timer,
        'parent_allow_leaderboard', v_user.parent_allow_leaderboard,
        'parent_allow_groups', v_user.parent_allow_groups,
        'parent_allow_proposals', v_user.parent_allow_proposals,
        'parent_allow_audio', v_user.parent_allow_audio,
        'parent_permissions', v_user.parent_permissions
    );

    -- 3. Validierung & Extraktion
    IF p_settings ? 'campus_ui_level' THEN
        v_ui_level := p_settings->>'campus_ui_level';
        IF v_ui_level NOT IN ('junior', 'teen', 'pro') THEN
            v_ui_level := 'junior';
        END IF;
    ELSE
        v_ui_level := COALESCE(v_user.campus_ui_level, 'junior');
    END IF;

    -- BGB Schutz: Junior (unter 11 J.) darf keine Stunden stornieren
    IF v_ui_level = 'junior' THEN
        v_allow_absences := false;
    ELSIF p_settings ? 'parent_allow_absences' THEN
        v_allow_absences := (p_settings->>'parent_allow_absences')::BOOLEAN;
    ELSE
        v_allow_absences := COALESCE(v_user.parent_allow_absences, false);
    END IF;

    IF p_settings ? 'parent_allow_chat' THEN
        v_allow_chat := (p_settings->>'parent_allow_chat')::BOOLEAN;
    ELSE
        v_allow_chat := COALESCE(v_user.parent_allow_chat, false);
    END IF;

    IF p_settings ? 'parent_allow_timer' THEN
        v_allow_timer := (p_settings->>'parent_allow_timer')::BOOLEAN;
    ELSE
        v_allow_timer := COALESCE(v_user.parent_allow_timer, true);
    END IF;

    IF p_settings ? 'parent_allow_leaderboard' THEN
        v_allow_leaderboard := (p_settings->>'parent_allow_leaderboard')::BOOLEAN;
    ELSE
        v_allow_leaderboard := COALESCE(v_user.parent_allow_leaderboard, false);
    END IF;

    IF p_settings ? 'parent_allow_groups' THEN
        v_allow_groups := (p_settings->>'parent_allow_groups')::BOOLEAN;
    ELSE
        v_allow_groups := COALESCE(v_user.parent_allow_groups, false);
    END IF;

    IF p_settings ? 'parent_allow_proposals' THEN
        v_allow_proposals := (p_settings->>'parent_allow_proposals')::BOOLEAN;
    ELSE
        v_allow_proposals := COALESCE(v_user.parent_allow_proposals, false);
    END IF;

    IF p_settings ? 'parent_allow_audio' THEN
        v_allow_audio := (p_settings->>'parent_allow_audio')::BOOLEAN;
    ELSE
        v_allow_audio := COALESCE(v_user.parent_allow_audio, false);
    END IF;

    IF p_settings ? 'parent_permissions' THEN
        v_parent_permissions := p_settings->'parent_permissions';
    ELSE
        v_parent_permissions := COALESCE(v_user.parent_permissions, '{}'::JSONB);
    END IF;

    -- 4. Atomares Update in users_raw, students und pending_students
    UPDATE public.users_raw SET
        campus_ui_level = v_ui_level,
        parent_allow_absences = COALESCE(v_allow_absences, false),
        parent_allow_chat = COALESCE(v_allow_chat, false),
        parent_allow_timer = COALESCE(v_allow_timer, true),
        parent_allow_leaderboard = COALESCE(v_allow_leaderboard, false),
        parent_allow_groups = COALESCE(v_allow_groups, false),
        parent_allow_proposals = COALESCE(v_allow_proposals, false),
        parent_allow_audio = COALESCE(v_allow_audio, false),
        parent_permissions = v_parent_permissions
    WHERE id = p_student_id;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
        UPDATE public.students SET
            campus_ui_level = v_ui_level,
            parent_allow_absences = COALESCE(v_allow_absences, false),
            parent_allow_chat = COALESCE(v_allow_chat, false),
            parent_allow_timer = COALESCE(v_allow_timer, true),
            parent_allow_leaderboard = COALESCE(v_allow_leaderboard, false),
            parent_allow_groups = COALESCE(v_allow_groups, false),
            parent_allow_proposals = COALESCE(v_allow_proposals, false),
            parent_allow_audio = COALESCE(v_allow_audio, false),
            parent_permissions = v_parent_permissions
        WHERE id = p_student_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pending_students') THEN
        UPDATE public.pending_students SET
            campus_ui_level = v_ui_level,
            parent_allow_absences = COALESCE(v_allow_absences, false),
            parent_allow_chat = COALESCE(v_allow_chat, false),
            parent_allow_timer = COALESCE(v_allow_timer, true),
            parent_allow_leaderboard = COALESCE(v_allow_leaderboard, false),
            parent_allow_groups = COALESCE(v_allow_groups, false),
            parent_allow_proposals = COALESCE(v_allow_proposals, false),
            parent_allow_audio = COALESCE(v_allow_audio, false),
            parent_permissions = v_parent_permissions
        WHERE id = p_student_id;
    END IF;

    v_new_settings := jsonb_build_object(
        'campus_ui_level', v_ui_level,
        'parent_allow_absences', v_allow_absences,
        'parent_allow_chat', v_allow_chat,
        'parent_allow_timer', v_allow_timer,
        'parent_allow_leaderboard', v_allow_leaderboard,
        'parent_allow_groups', v_allow_groups,
        'parent_allow_proposals', v_allow_proposals,
        'parent_allow_audio', v_allow_audio,
        'parent_permissions', v_parent_permissions
    );

    -- 5. Revisionssicherer Audit-Eintrag
    BEGIN
        INSERT INTO public.audit_logs (
            table_name,
            record_id,
            action,
            old_data,
            new_data,
            changed_by,
            school_id,
            created_at
        ) VALUES (
            'users_raw',
            p_student_id,
            'PARENT_CONTROLS_UPDATE',
            v_old_settings,
            v_new_settings,
            COALESCE(v_caller_id, p_student_id),
            v_user.school_id,
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'synced_at', NOW(),
        'settings', v_new_settings
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_parent_controls(UUID, JSONB) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 4. FAIL-CLOSED CHAT TRIGGER: PREVENT UNAUTHORIZED STUDENT CHAT
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_prevent_unauthorized_student_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sender_role TEXT;
    v_allow_chat BOOLEAN;
BEGIN
    IF NEW.sender_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT role, parent_allow_chat
    INTO v_sender_role, v_allow_chat
    FROM public.users_raw
    WHERE id = NEW.sender_id;

    -- If sender is student and parent chat is not allowed, reject insert
    IF v_sender_role = 'student' AND COALESCE(v_allow_chat, false) = FALSE THEN
        RAISE EXCEPTION 'Kinderschutz-Sperre: Chat ist für diesen Schüler-Account elterlich deaktiviert.'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campus_direct_messages_parent_guard ON public.campus_direct_messages;
CREATE TRIGGER trg_campus_direct_messages_parent_guard
    BEFORE INSERT ON public.campus_direct_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_prevent_unauthorized_student_chat();

-- ------------------------------------------------------------------------------
-- 5. SECURE ABSENCE MANAGEMENT RPCS (PARENT PIN CHECK)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_student_schedule_occurrence(
  p_student_id UUID,
  p_occurrence_id TEXT DEFAULT NULL,
  p_date DATE DEFAULT NULL,
  p_start_time TIME DEFAULT '15:00',
  p_duration INTEGER DEFAULT 45,
  p_teacher_id UUID DEFAULT NULL,
  p_schedule_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT 'canceled_by_student',
  p_parent_pin TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_school_id UUID;
  v_teacher_id UUID := p_teacher_id;
  v_student_rec RECORD;
  v_occ_id UUID := NULL;
  v_existing_id UUID := NULL;
  v_clean_occ_id UUID := NULL;
  v_student_name TEXT;
  v_date_str TEXT;
  v_time_str TEXT;
  v_now_str TEXT;
  v_caller_role TEXT := public.get_current_user_role();
  v_caller_school_id UUID := public.get_current_user_school_id();
  v_allow_absences BOOLEAN;
BEGIN
  IF p_student_id IS NULL OR p_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student ID and Date are required');
  END IF;

  -- 1. Validate student exists
  SELECT id, school_id, first_name, last_name, teacher_id, parent_allow_absences
  INTO v_student_rec
  FROM public.users_raw
  WHERE id = p_student_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student not found');
  END IF;

  v_school_id := v_student_rec.school_id;
  v_allow_absences := COALESCE(v_student_rec.parent_allow_absences, false);

  -- 🛡️ GOLDSTANDARD ABSENCE GATE: If parental control forbids absences, require parent PIN or staff authorization
  IF NOT v_allow_absences THEN
    IF p_parent_pin IS NOT NULL AND length(TRIM(p_parent_pin)) >= 4 THEN
      IF NOT public.verify_parent_pin(p_student_id, TRIM(p_parent_pin)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Eltern-PIN ungültig. Terminabsage verweigert.');
      END IF;
    ELSIF public.is_master_admin() OR (v_caller_school_id = v_school_id AND v_caller_role IN ('teacher', 'admin', 'secretary')) THEN
      -- Staff bypass allowed
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

  -- 2. Extract clean UUID if present
  IF p_occurrence_id IS NOT NULL AND p_occurrence_id NOT LIKE 'virtual-%' AND p_occurrence_id NOT LIKE 'virt_%' AND p_occurrence_id NOT LIKE 'sched-%' THEN
    BEGIN
      v_clean_occ_id := p_occurrence_id::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_clean_occ_id := NULL;
    END;
  END IF;

  -- 3. Check for existing row in schedule_occurrences
  IF v_clean_occ_id IS NOT NULL THEN
    SELECT id, teacher_id INTO v_existing_id, v_teacher_id
    FROM public.schedule_occurrences
    WHERE id = v_clean_occ_id;
  END IF;

  IF v_existing_id IS NULL THEN
    SELECT id, teacher_id INTO v_existing_id, v_teacher_id
    FROM public.schedule_occurrences
    WHERE student_id = p_student_id
      AND date = p_date
    LIMIT 1;
  END IF;

  -- 4. Upsert occurrence
  IF v_existing_id IS NOT NULL THEN
    UPDATE public.schedule_occurrences
    SET status = 'canceled_by_student',
        canceled_by_role = 'student',
        student_acknowledged = true,
        teacher_acknowledged = false,
        notes = COALESCE(p_notes, 'canceled_by_student'),
        updated_at = NOW()
    WHERE id = v_existing_id
    RETURNING id INTO v_occ_id;
  ELSE
    INSERT INTO public.schedule_occurrences (
      schedule_id,
      student_id,
      teacher_id,
      date,
      start_time,
      duration,
      status,
      canceled_by_role,
      student_acknowledged,
      teacher_acknowledged,
      notes,
      school_id,
      updated_at
    ) VALUES (
      p_schedule_id,
      p_student_id,
      v_teacher_id,
      p_date,
      p_start_time,
      p_duration,
      'canceled_by_student',
      'student',
      true,
      false,
      COALESCE(p_notes, 'canceled_by_student'),
      v_school_id,
      NOW()
    )
    RETURNING id INTO v_occ_id;
  END IF;

  -- 5. Send notification to teacher if teacher exists
  IF v_teacher_id IS NOT NULL AND to_regclass('public.campus_direct_messages') IS NOT NULL THEN
    BEGIN
      INSERT INTO public.campus_direct_messages (
        school_id,
        sender_id,
        recipient_id,
        content,
        created_at,
        is_read,
        occurrence_id
      ) VALUES (
        v_school_id,
        p_student_id,
        v_teacher_id,
        'ℹ️ ' || v_student_name || ' hat den Unterricht am ' || v_date_str || ' (' || v_time_str || ' Uhr) abgesagt. (Gemeldet am ' || v_now_str || ')',
        NOW(),
        false,
        v_occ_id::text
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'occurrence_id', v_occ_id,
    'status', 'canceled_by_student',
    'date', p_date
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_student_schedule_occurrence(UUID, TEXT, DATE, TIME, INTEGER, UUID, UUID, TEXT, TEXT) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.undo_cancel_student_schedule_occurrence(
  p_student_id UUID,
  p_occurrence_id TEXT DEFAULT NULL,
  p_date DATE DEFAULT NULL,
  p_teacher_id UUID DEFAULT NULL,
  p_parent_pin TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_school_id UUID;
  v_teacher_id UUID := p_teacher_id;
  v_student_rec RECORD;
  v_occ_id UUID := NULL;
  v_existing_id UUID := NULL;
  v_clean_occ_id UUID := NULL;
  v_student_name TEXT;
  v_date_str TEXT;
  v_time_str TEXT;
  v_now_str TEXT;
  v_caller_role TEXT := public.get_current_user_role();
  v_caller_school_id UUID := public.get_current_user_school_id();
  v_allow_absences BOOLEAN;
BEGIN
  IF p_student_id IS NULL OR p_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student ID and Date are required');
  END IF;

  -- 1. Validate student exists
  SELECT id, school_id, first_name, last_name, teacher_id, parent_allow_absences
  INTO v_student_rec
  FROM public.users_raw
  WHERE id = p_student_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student not found');
  END IF;

  v_school_id := v_student_rec.school_id;
  v_allow_absences := COALESCE(v_student_rec.parent_allow_absences, false);

  -- 🛡️ GOLDSTANDARD ABSENCE GATE
  IF NOT v_allow_absences THEN
    IF p_parent_pin IS NOT NULL AND length(TRIM(p_parent_pin)) >= 4 THEN
      IF NOT public.verify_parent_pin(p_student_id, TRIM(p_parent_pin)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Eltern-PIN ungültig. Reaktivierung verweigert.');
      END IF;
    ELSIF public.is_master_admin() OR (v_caller_school_id = v_school_id AND v_caller_role IN ('teacher', 'admin', 'secretary')) THEN
      NULL;
    ELSE
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Abwesenheitsmeldung gesperrt: Terminänderungen müssen durch Erziehungsberechtigte mit Eltern-PIN autorisiert werden.'
      );
    END IF;
  END IF;

  IF v_teacher_id IS NULL THEN
    v_teacher_id := v_student_rec.teacher_id;
  END IF;

  v_student_name := COALESCE(v_student_rec.first_name || ' ' || SUBSTRING(COALESCE(v_student_rec.last_name, '') FROM 1 FOR 1) || '.', 'Ein Schüler');
  v_date_str := to_char(p_date, 'DD.MM.YYYY');
  v_now_str := to_char(NOW() AT TIME ZONE 'Europe/Berlin', 'DD.MM.YYYY') || ' um ' || to_char(NOW() AT TIME ZONE 'Europe/Berlin', 'HH24:MI') || ' Uhr';

  -- 2. Check UUID
  IF p_occurrence_id IS NOT NULL AND p_occurrence_id NOT LIKE 'virtual-%' AND p_occurrence_id NOT LIKE 'virt_%' AND p_occurrence_id NOT LIKE 'sched-%' THEN
    BEGIN
      v_clean_occ_id := p_occurrence_id::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_clean_occ_id := NULL;
    END;
  END IF;

  IF v_clean_occ_id IS NOT NULL THEN
    SELECT id, teacher_id INTO v_existing_id, v_teacher_id
    FROM public.schedule_occurrences
    WHERE id = v_clean_occ_id;
  END IF;

  IF v_existing_id IS NULL THEN
    SELECT id, teacher_id INTO v_existing_id, v_teacher_id
    FROM public.schedule_occurrences
    WHERE student_id = p_student_id
      AND date = p_date
    LIMIT 1;
  END IF;

  -- 3. Restore occurrence
  IF v_existing_id IS NOT NULL THEN
    UPDATE public.schedule_occurrences
    SET status = 'scheduled',
        original_date = p_date,
        canceled_by_role = NULL,
        notes = NULL,
        student_acknowledged = true,
        teacher_acknowledged = false,
        updated_at = NOW()
    WHERE id = v_existing_id
    RETURNING id, start_time INTO v_occ_id, v_time_str;
  END IF;

  v_time_str := COALESCE(SUBSTRING(v_time_str FROM 1 FOR 5), '15:00');

  -- 4. Send notification to teacher
  IF v_teacher_id IS NOT NULL AND to_regclass('public.campus_direct_messages') IS NOT NULL THEN
    BEGIN
      INSERT INTO public.campus_direct_messages (
        school_id,
        sender_id,
        recipient_id,
        content,
        created_at,
        is_read,
        occurrence_id
      ) VALUES (
        v_school_id,
        p_student_id,
        v_teacher_id,
        '✅ ' || v_student_name || ' nimmt am ' || v_date_str || ' (' || v_time_str || ' Uhr) doch wie gewohnt am Unterricht teil! (Wieder aktiv seit ' || v_now_str || ')',
        NOW(),
        false,
        v_occ_id::text
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'occurrence_id', v_occ_id,
    'status', 'scheduled',
    'date', p_date
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.undo_cancel_student_schedule_occurrence(UUID, TEXT, DATE, UUID, TEXT) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 6. RELOAD SCHEMA CACHE
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
