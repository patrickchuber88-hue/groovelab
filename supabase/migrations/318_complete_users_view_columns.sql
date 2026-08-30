-- ==============================================================================
-- Migration 318: Complete users view columns (contract_decision_made, etc.)
-- Standard: PostgREST View Synchronization & Tier-1 Contract Lifecycle
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_users_view_dml ON public.users;
DROP VIEW IF EXISTS public.users CASCADE;

CREATE OR REPLACE VIEW public.users WITH (security_invoker = true) AS
SELECT 
    ur.id, ur.school_id, ur.role, ur.first_name, 
    CASE 
      WHEN (public.get_current_authenticated_user_id() = ur.id) 
           OR public.is_master_admin() 
           OR public.get_current_user_role() IN ('teacher', 'admin', 'secretary') 
      THEN ur.last_name
      ELSE COALESCE(substring(ur.last_name from 1 for 1) || '.', '')
    END AS last_name,
    ur.avatar_url, ur.qr_token, ur.instrument, 
    ur.created_at, ur.coach_notes, ur.photo_url, ur.bio, ur.bands, ur.projects, ur.listening, ur.gear, 
    ur.musical_styles, ur.equipment_list, ur.last_seen, ur.expertise, ur.age, ur.birth_date, 
    ur.pending_repertoire_proposal, ur.is_external_vocalist, ur.show_messages_menu, 
    ur.master_admin_username, 
    CAST(NULL AS TEXT) AS master_admin_password, -- HARDENED: Zero Secret Exposure
    ur.is_trial, ur.trial_ends_at, 
    ur.contract_ends_at, ur.contract_decision_made, ur.delete_after_contract,
    ur.status, ur.is_master_admin, ur.is_app_user, ur.is_campus_active, 
    ur.is_groovelab_active, ur.is_premium_user, ur.teacher_id, ur.ausweis_nummer, 
    ur.teacher_qr_token, ur.is_active, ur.max_students, ur.nickname, 
    CAST(NULL AS TEXT) AS password_hash, -- HARDENED: Zero Hash Exposure
    ur.ausweis_id, ur.show_sekretariat, ur.show_campus, ur.show_groovelab, 
    ur.lesson_duration, ur.planned_boards, ur.required_equipment, ur.sick_until, ur.phone, 
    ur.joker_used, ur.is_pin_activated, ur.groovelab_räume, ur.campus_räume, ur.joker_used_at, 
    ur.sick_start, ur.push_notifications_enabled, ur.push_notif_schedule_changes, 
    ur.push_notif_homework, ur.push_notif_all_features, 
    ur.app_usage_mode, 
    ur.preferred_room_ids, ur.groovelab_instrument, ur.student_billing_payment_method, 
    ur.activated_at, ur.student_billing_cash_paid, ur.roles, ur.exempt_from_direct_billing, 
    ur.group_id, ur.sibling_group_id, 
    ur.parent_allow_chat, ur.parent_allow_timer, ur.parent_allow_leaderboard, ur.parent_allow_groups, ur.parent_allow_proposals, 
    ur.pin_enforced_for_preview, 
    ur.teacher_onboarding_completed, ur.teacher_availability,
    ur.is_2fa_enabled, 
    CAST(NULL AS TEXT) AS two_factor_secret, -- HARDENED: Zero TOTP Seed Exposure
    CAST(NULL AS TEXT) AS parent_pin, 
    CAST(NULL AS TEXT) AS personal_pin, 
    (ur.parent_pin IS NOT NULL AND ur.parent_pin <> '0000') AS has_parent_pin, 
    (ur.personal_pin IS NOT NULL AND ur.personal_pin <> '') AS has_personal_pin, 
    ur.sessions_revoked_at, ur.token_version, ur.token_signature, ur.qr_token_redeemed_at,
    (
        SELECT extensions.pgp_sym_decrypt(uep.prefix, public.get_encryption_key()) || '@' || ues.suffix
        FROM public.user_email_prefixes uep
        JOIN public.user_email_suffixes ues ON uep.user_id = ues.user_id
        WHERE uep.user_id = ur.id
        LIMIT 1
    ) AS email
FROM public.users_raw ur;

-- Re-attach DML trigger
CREATE OR REPLACE FUNCTION public.handle_users_view_dml()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    email_parts TEXT[];
    email_prefix TEXT;
    email_suffix TEXT;
    hashed_parent_pin TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.user_email_prefixes WHERE user_id = OLD.id;
        DELETE FROM public.user_email_suffixes WHERE user_id = OLD.id;
        DELETE FROM private_auth.user_secrets WHERE user_id = OLD.id;
        DELETE FROM public.users_raw WHERE id = OLD.id;
        RETURN OLD;
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
            parent_pin, personal_pin, sessions_revoked_at, token_version, token_signature, qr_token_redeemed_at
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
            hashed_parent_pin, NEW.personal_pin, NEW.sessions_revoked_at, COALESCE(NEW.token_version, 1), NEW.token_signature, NEW.qr_token_redeemed_at
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
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

CREATE TRIGGER trg_users_view_dml
INSTEAD OF INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_users_view_dml();

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon, authenticated, service_role;
