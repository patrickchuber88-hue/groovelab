-- ==============================================================================
-- MIGRATION 340: FIX ROLE SWITCH & USERS VIEW DML TYPE CASTING
-- Fixes: "COALESCE could not convert type user_role[] to text[]" in switch_user_active_role
-- ==============================================================================

-- 1. FIX SECURE ROLE SWITCH RPC (TYPE-SAFE ROLES ARRAY CASTING)
CREATE OR REPLACE FUNCTION public.switch_user_active_role(p_target_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
AS $$
DECLARE
    v_uid UUID := public.get_current_authenticated_user_id();
    v_user record;
    v_target_clean text := LOWER(TRIM(p_target_role));
    v_allowed_roles text[];
    v_is_master boolean;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Zugriff verweigert: Keine authentifizierte Sitzung vorhanden.';
    END IF;

    IF v_target_clean IS NULL OR v_target_clean = '' THEN
        RAISE EXCEPTION 'Ungültige Zielrolle.';
    END IF;

    -- Fetch user details
    SELECT id, role, roles, is_master_admin INTO v_user
    FROM public.users_raw
    WHERE id = v_uid AND is_active = TRUE;

    IF v_user.id IS NULL THEN
        RAISE EXCEPTION 'Benutzer nicht gefunden oder inaktiv.';
    END IF;

    v_is_master := COALESCE(v_user.is_master_admin, false) OR public.is_master_admin();

    -- Safe array extraction without COALESCE type mismatch between user_role[] and text[]
    IF v_user.roles IS NOT NULL THEN
        v_allowed_roles := v_user.roles::text[];
    ELSE
        v_allowed_roles := ARRAY[v_user.role::text];
    END IF;

    -- Validate role eligibility
    IF NOT v_is_master AND NOT (v_target_clean = ANY(v_allowed_roles)) THEN
        RAISE EXCEPTION 'Zugriff verweigert: Die Rolle % ist für Ihr Profil nicht freigeschaltet.', v_target_clean;
    END IF;

    -- Update active role in users_raw
    UPDATE public.users_raw
    SET role = v_target_clean::public.user_role, last_seen = NOW()
    WHERE id = v_uid;

    -- Update active session leases for this user
    UPDATE public.session_leases
    SET role = v_target_clean, last_active_at = NOW()
    WHERE user_id = v_uid AND is_revoked = FALSE;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_uid,
        'active_role', v_target_clean
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.switch_user_active_role(text) TO anon, authenticated, service_role;

-- 2. FIX USERS VIEW DML TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_users_view_dml()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_caller_uid uuid;
    v_is_master boolean := false;
    hashed_parent_pin text := NULL;
    v_allowed_roles text[];
BEGIN
    v_caller_uid := public.get_current_authenticated_user_id();

    -- Determine if caller has master admin authority
    IF public.is_master_admin() THEN
        v_is_master := true;
    END IF;

    -- Parent PIN hashing if supplied
    IF NEW.parent_pin IS NOT NULL AND NEW.parent_pin <> '' THEN
        IF length(NEW.parent_pin) = 64 THEN
            hashed_parent_pin := NEW.parent_pin;
        ELSE
            hashed_parent_pin := encode(extensions.digest(NEW.parent_pin, 'sha256'), 'hex');
        END IF;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Prevent unauthorized creation of master admin accounts via normal view INSERT
        IF NOT v_is_master THEN
            NEW.is_master_admin := FALSE;
        END IF;

        INSERT INTO public.users_raw (
            id, school_id, role, first_name, last_name, avatar_url, qr_token, instrument,
            created_at, coach_notes, photo_url, bio, bands, projects, listening, gear,
            musical_styles, equipment_list, last_seen, expertise, age, birth_date,
            pending_repertoire_proposal, is_external_vocalist, show_messages_menu,
            master_admin_username, is_trial, trial_ends_at,
            contract_ends_at, contract_decision_made, delete_after_contract,
            status, is_master_admin, is_app_user, is_campus_active,
            is_groovelab_active, is_premium_user, teacher_id, ausweis_nummer,
            teacher_qr_token, is_active, max_students, nickname,
            ausweis_id, show_sekretariat, show_campus, show_groovelab,
            lesson_duration, planned_boards, required_equipment, sick_until, phone,
            joker_used, is_pin_activated, "groovelab_räume", "campus_räume", joker_used_at,
            sick_start, push_notifications_enabled, push_notif_schedule_changes,
            push_notif_homework, push_notif_all_features,
            app_usage_mode, preferred_room_ids, groovelab_instrument,
            student_billing_payment_method, activated_at, student_billing_cash_paid,
            roles, exempt_from_direct_billing, group_id, sibling_group_id,
            parent_allow_chat, parent_allow_timer, parent_allow_leaderboard,
            parent_allow_groups, parent_allow_proposals, pin_enforced_for_preview,
            teacher_onboarding_completed, teacher_availability, is_2fa_enabled,
            parent_pin, personal_pin, failed_pin_attempts, pin_locked_until,
            sessions_revoked_at, token_version, token_signature, qr_token_redeemed_at
        ) VALUES (
            COALESCE(NEW.id, gen_random_uuid()), NEW.school_id, NEW.role, NEW.first_name, NEW.last_name, NEW.avatar_url, NEW.qr_token, NEW.instrument,
            COALESCE(NEW.created_at, NOW()), NEW.coach_notes, NEW.photo_url, NEW.bio, NEW.bands, NEW.projects, NEW.listening, NEW.gear,
            NEW.musical_styles, NEW.equipment_list, NEW.last_seen, NEW.expertise, NEW.age, NEW.birth_date,
            NEW.pending_repertoire_proposal, COALESCE(NEW.is_external_vocalist, false), COALESCE(NEW.show_messages_menu, false),
            NEW.master_admin_username, COALESCE(NEW.is_trial, false), NEW.trial_ends_at,
            NEW.contract_ends_at, COALESCE(NEW.contract_decision_made, true), COALESCE(NEW.delete_after_contract, false),
            COALESCE(NEW.status, 'active'), COALESCE(NEW.is_master_admin, false), COALESCE(NEW.is_app_user, true), COALESCE(NEW.is_campus_active, true),
            COALESCE(NEW.is_groovelab_active, true), COALESCE(NEW.is_premium_user, false), NEW.teacher_id, NEW.ausweis_nummer,
            NEW.teacher_qr_token, COALESCE(NEW.is_active, true), COALESCE(NEW.max_students, 30), NEW.nickname,
            NEW.ausweis_id, COALESCE(NEW.show_sekretariat, false), COALESCE(NEW.show_campus, true), COALESCE(NEW.show_groovelab, true),
            NEW.lesson_duration, NEW.planned_boards, NEW.required_equipment, NEW.sick_until, NEW.phone,
            COALESCE(NEW.joker_used, false), COALESCE(NEW.is_pin_activated, false), NEW."groovelab_räume", NEW."campus_räume", NEW.joker_used_at,
            NEW.sick_start, COALESCE(NEW.push_notifications_enabled, true), COALESCE(NEW.push_notif_schedule_changes, true),
            COALESCE(NEW.push_notif_homework, true), COALESCE(NEW.push_notif_all_features, true),
            NEW.app_usage_mode, NEW.preferred_room_ids, NEW.groovelab_instrument,
            NEW.student_billing_payment_method, NEW.activated_at, COALESCE(NEW.student_billing_cash_paid, false),
            NEW.roles, COALESCE(NEW.exempt_from_direct_billing, false), NEW.group_id, NEW.sibling_group_id,
            COALESCE(NEW.parent_allow_chat, true), COALESCE(NEW.parent_allow_timer, true), COALESCE(NEW.parent_allow_leaderboard, true),
            COALESCE(NEW.parent_allow_groups, true), COALESCE(NEW.parent_allow_proposals, true), COALESCE(NEW.pin_enforced_for_preview, false),
            COALESCE(NEW.teacher_onboarding_completed, false), NEW.teacher_availability, COALESCE(NEW.is_2fa_enabled, false),
            hashed_parent_pin, NEW.personal_pin, COALESCE(NEW.failed_pin_attempts, 0), NEW.pin_locked_until,
            NEW.sessions_revoked_at, COALESCE(NEW.token_version, 1), NEW.token_signature, NEW.qr_token_redeemed_at
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- ZERO-TRUST PRIVILEGE-ESCALATION GUARDS:
        IF NOT v_is_master THEN
            NEW.school_id := OLD.school_id;
            NEW.is_master_admin := OLD.is_master_admin;
            NEW.roles := OLD.roles;
            -- Only allow role change if target role exists in OLD.roles
            IF NEW.role IS DISTINCT FROM OLD.role THEN
                IF OLD.roles IS NOT NULL THEN
                    v_allowed_roles := OLD.roles::text[];
                ELSE
                    v_allowed_roles := ARRAY[OLD.role::text];
                END IF;

                IF NOT (NEW.role::text = ANY(v_allowed_roles)) THEN
                    NEW.role := OLD.role;
                END IF;
            END IF;
        END IF;

        UPDATE public.users_raw SET
            school_id = COALESCE(NEW.school_id, users_raw.school_id),
            role = COALESCE(NEW.role, users_raw.role),
            first_name = COALESCE(NEW.first_name, users_raw.first_name),
            last_name = COALESCE(NEW.last_name, users_raw.last_name),
            avatar_url = COALESCE(NEW.avatar_url, users_raw.avatar_url),
            qr_token = COALESCE(NEW.qr_token, users_raw.qr_token),
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
            last_seen = COALESCE(NEW.last_seen, users_raw.last_seen),
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
            is_master_admin = COALESCE(NEW.is_master_admin, users_raw.is_master_admin),
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
            parent_allow_chat = COALESCE(NEW.parent_allow_chat, users_raw.parent_allow_chat),
            parent_allow_timer = COALESCE(NEW.parent_allow_timer, users_raw.parent_allow_timer),
            parent_allow_leaderboard = COALESCE(NEW.parent_allow_leaderboard, users_raw.parent_allow_leaderboard),
            parent_allow_groups = COALESCE(NEW.parent_allow_groups, users_raw.parent_allow_groups),
            parent_allow_proposals = COALESCE(NEW.parent_allow_proposals, users_raw.parent_allow_proposals),
            pin_enforced_for_preview = COALESCE(NEW.pin_enforced_for_preview, users_raw.pin_enforced_for_preview),
            teacher_onboarding_completed = COALESCE(NEW.teacher_onboarding_completed, users_raw.teacher_onboarding_completed),
            teacher_availability = COALESCE(NEW.teacher_availability, users_raw.teacher_availability),
            is_2fa_enabled = COALESCE(NEW.is_2fa_enabled, users_raw.is_2fa_enabled),
            parent_pin = COALESCE(hashed_parent_pin, users_raw.parent_pin),
            personal_pin = COALESCE(NEW.personal_pin, users_raw.personal_pin),
            failed_pin_attempts = COALESCE(NEW.failed_pin_attempts, users_raw.failed_pin_attempts),
            pin_locked_until = COALESCE(NEW.pin_locked_until, users_raw.pin_locked_until),
            sessions_revoked_at = COALESCE(NEW.sessions_revoked_at, users_raw.sessions_revoked_at),
            token_version = COALESCE(NEW.token_version, users_raw.token_version),
            token_signature = COALESCE(NEW.token_signature, users_raw.token_signature),
            qr_token_redeemed_at = COALESCE(NEW.qr_token_redeemed_at, users_raw.qr_token_redeemed_at)
        WHERE id = OLD.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.users_raw WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

NOTIFY pgrst, 'reload schema';
