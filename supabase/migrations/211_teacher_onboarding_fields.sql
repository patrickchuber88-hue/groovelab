-- Migration: 211_teacher_onboarding_fields
-- Description: Add teacher_onboarding_completed and teacher_availability to users_raw and users view.

-- 1. Add columns to users_raw
ALTER TABLE public.users_raw ADD COLUMN IF NOT EXISTS teacher_onboarding_completed BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.users_raw ADD COLUMN IF NOT EXISTS teacher_availability JSONB DEFAULT '{}'::jsonb NOT NULL;

-- 2. Recreate public.users view
DROP TRIGGER IF EXISTS trg_users_view_dml ON public.users;
DROP VIEW IF EXISTS public.users CASCADE;

CREATE OR REPLACE VIEW public.users WITH (security_invoker = true) AS
SELECT 
    ur.id, ur.school_id, ur.role, ur.first_name, 
    -- Mask last name for public QR preview if not authenticated as this user or higher role
    CASE 
      WHEN (public.get_current_user_id() = ur.id) 
           OR public.is_master_admin() 
           OR public.get_current_user_role() IN ('teacher', 'admin', 'secretary') 
      THEN ur.last_name
      ELSE COALESCE(substring(ur.last_name from 1 for 1) || '.', '')
    END AS last_name,
    ur.avatar_url, ur.qr_token, ur.instrument, 
    ur.created_at, ur.coach_notes, ur.photo_url, ur.bio, ur.bands, ur.projects, ur.listening, ur.gear, 
    ur.musical_styles, ur.equipment_list, ur.last_seen, ur.expertise, ur.age, ur.birth_date, 
    ur.pending_repertoire_proposal, ur.is_external_vocalist, ur.show_messages_menu, 
    ur.master_admin_username, ur.master_admin_password, ur.is_trial, ur.trial_ends_at, 
    ur.contract_ends_at, ur.status, ur.is_master_admin, ur.is_app_user, ur.is_campus_active, 
    ur.is_groovelab_active, ur.is_premium_user, ur.teacher_id, ur.ausweis_nummer, 
    ur.teacher_qr_token, ur.is_active, ur.max_students, ur.nickname, ur.password_hash, 
    ur.ausweis_id, ur.show_sekretariat, ur.show_campus, ur.show_groovelab, 
    ur.lesson_duration, ur.planned_boards, ur.required_equipment, ur.sick_until, ur.phone, 
    ur.joker_used, ur.is_pin_activated, ur.groovelab_räume, ur.campus_räume, ur.joker_used_at, 
    ur.sick_start, ur.push_notifications_enabled, ur.push_notif_schedule_changes, 
    ur.push_notif_homework, ur.push_notif_all_features, ur.app_usage_mode, 
    ur.preferred_room_ids, ur.groovelab_instrument, ur.student_billing_payment_method, 
    ur.activated_at, ur.student_billing_cash_paid, ur.roles, ur.exempt_from_direct_billing,
    ur.group_id, ur.sibling_group_id,
    ur.parent_allow_chat, ur.parent_allow_timer, ur.parent_allow_leaderboard, ur.parent_allow_groups, ur.parent_allow_proposals,
    ur.pin_enforced_for_preview,
    ur.teacher_onboarding_completed, ur.teacher_availability,
    CAST(NULL AS TEXT) AS parent_pin,
    CAST(NULL AS TEXT) AS personal_pin,
    (ur.parent_pin IS NOT NULL AND ur.parent_pin <> '0000') AS has_parent_pin,
    (ur.personal_pin IS NOT NULL AND ur.personal_pin <> '') AS has_personal_pin,
    (
        SELECT extensions.pgp_sym_decrypt(uep.prefix, public.get_encryption_key()) || '@' || ues.suffix
        FROM public.user_email_prefixes uep
        JOIN public.user_email_suffixes ues ON uep.user_id = ues.user_id
        WHERE uep.user_id = ur.id
        LIMIT 1
    ) AS email
FROM public.users_raw ur;

-- 3. Recreate DML trigger function
CREATE OR REPLACE FUNCTION public.handle_users_view_dml()
RETURNS TRIGGER AS $$
DECLARE
    email_parts TEXT[];
    email_prefix TEXT;
    email_suffix TEXT;
    r_id UUID;
    hashed_parent_pin TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Secure update checks
        IF OLD.is_master_admin <> NEW.is_master_admin AND NOT public.is_master_admin() THEN
            RAISE EXCEPTION 'Unauthorized to modify is_master_admin';
        END IF;

        -- Hash parent_pin if modified
        IF NEW.parent_pin IS NOT NULL AND NEW.parent_pin <> '' THEN
            IF length(NEW.parent_pin) = 64 THEN
                hashed_parent_pin := NEW.parent_pin;
            ELSE
                hashed_parent_pin := encode(extensions.digest(NEW.parent_pin, 'sha256'), 'hex');
            END IF;
        ELSE
            hashed_parent_pin := NULL;
        END IF;

        UPDATE public.users_raw
        SET
            school_id = NEW.school_id,
            role = NEW.role,
            first_name = NEW.first_name,
            last_name = NEW.last_name,
            avatar_url = NEW.avatar_url,
            qr_token = NEW.qr_token,
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
            last_seen = NEW.last_seen,
            expertise = NEW.expertise,
            age = NEW.age,
            birth_date = NEW.birth_date,
            pending_repertoire_proposal = NEW.pending_repertoire_proposal,
            is_external_vocalist = NEW.is_external_vocalist,
            show_messages_menu = NEW.show_messages_menu,
            is_trial = NEW.is_trial,
            trial_ends_at = NEW.trial_ends_at,
            contract_ends_at = NEW.contract_ends_at,
            status = NEW.status,
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
            password_hash = NEW.password_hash,
            ausweis_id = NEW.ausweis_id,
            personal_pin = NEW.personal_pin,
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
            groovelab_räume = NEW.groovelab_räume,
            campus_räume = NEW.campus_räume,
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
            parent_allow_chat = COALESCE(NEW.parent_allow_chat, parent_allow_chat),
            parent_allow_timer = COALESCE(NEW.parent_allow_timer, parent_allow_timer),
            parent_allow_leaderboard = COALESCE(NEW.parent_allow_leaderboard, parent_allow_leaderboard),
            parent_allow_groups = COALESCE(NEW.parent_allow_groups, parent_allow_groups),
            parent_allow_proposals = COALESCE(NEW.parent_allow_proposals, parent_allow_proposals),
            parent_pin = COALESCE(hashed_parent_pin, parent_pin),
            pin_enforced_for_preview = COALESCE(NEW.pin_enforced_for_preview, pin_enforced_for_preview),
            teacher_onboarding_completed = COALESCE(NEW.teacher_onboarding_completed, teacher_onboarding_completed),
            teacher_availability = COALESCE(NEW.teacher_availability, teacher_availability)
        WHERE id = OLD.id;

        -- Handle email updates if provided
        IF NEW.email IS DISTINCT FROM OLD.email THEN
            DELETE FROM public.user_email_prefixes WHERE user_id = OLD.id;
            DELETE FROM public.user_email_suffixes WHERE user_id = OLD.id;
            
            IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
                email_parts := regexp_split_to_array(NEW.email, '@');
                IF array_length(email_parts, 1) = 2 THEN
                    email_prefix := email_parts[1];
                    email_suffix := email_parts[2];
                    
                    INSERT INTO public.user_email_prefixes (user_id, prefix)
                    VALUES (OLD.id, extensions.pgp_sym_encrypt(email_prefix, public.get_encryption_key()));
                    
                    INSERT INTO public.user_email_suffixes (user_id, suffix)
                    VALUES (OLD.id, email_suffix);
                END IF;
            END IF;
        END IF;

        RETURN NEW;

    ELSIF TG_OP = 'INSERT' THEN
        r_id := COALESCE(NEW.id, gen_random_uuid());
        
        -- Hash parent_pin if provided
        IF NEW.parent_pin IS NOT NULL AND NEW.parent_pin <> '' THEN
            hashed_parent_pin := encode(extensions.digest(NEW.parent_pin, 'sha256'), 'hex');
        ELSE
            hashed_parent_pin := NULL;
        END IF;

        INSERT INTO public.users_raw (
            id, school_id, role, first_name, last_name, avatar_url, qr_token, instrument, 
            coach_notes, photo_url, bio, bands, projects, listening, gear, 
            musical_styles, equipment_list, last_seen, expertise, age, birth_date, 
            pending_repertoire_proposal, is_external_vocalist, show_messages_menu, 
            is_trial, trial_ends_at, contract_ends_at, status, is_master_admin, is_app_user, is_campus_active, 
            is_groovelab_active, is_premium_user, teacher_id, ausweis_nummer, 
            teacher_qr_token, is_active, max_students, nickname, password_hash, 
            ausweis_id, personal_pin, show_sekretariat, show_campus, show_groovelab, 
            lesson_duration, planned_boards, required_equipment, sick_until, phone, 
            joker_used, is_pin_activated, groovelab_räume, campus_räume, joker_used_at, 
            sick_start, push_notifications_enabled, push_notif_schedule_changes, 
            push_notif_homework, push_notif_all_features, app_usage_mode, 
            preferred_room_ids, groovelab_instrument, student_billing_payment_method, 
            activated_at, student_billing_cash_paid, roles, exempt_from_direct_billing,
            group_id, sibling_group_id,
            parent_allow_chat, parent_allow_timer, parent_allow_leaderboard, parent_allow_groups, parent_allow_proposals,
            parent_pin, pin_enforced_for_preview, teacher_onboarding_completed, teacher_availability
        ) VALUES (
            r_id, NEW.school_id, NEW.role, NEW.first_name, NEW.last_name, NEW.avatar_url, NEW.qr_token, NEW.instrument, 
            NEW.coach_notes, NEW.photo_url, NEW.bio, NEW.bands, NEW.projects, NEW.listening, NEW.gear, 
            NEW.musical_styles, NEW.equipment_list, NEW.last_seen, NEW.expertise, NEW.age, NEW.birth_date, 
            NEW.pending_repertoire_proposal, NEW.is_external_vocalist, NEW.show_messages_menu, 
            NEW.is_trial, NEW.trial_ends_at, NEW.contract_ends_at, NEW.status, NEW.is_master_admin, NEW.is_app_user, NEW.is_campus_active, 
            NEW.is_groovelab_active, NEW.is_premium_user, NEW.teacher_id, NEW.ausweis_nummer, 
            NEW.teacher_qr_token, NEW.is_active, NEW.max_students, NEW.nickname, NEW.password_hash, 
            NEW.ausweis_id, NEW.personal_pin, NEW.show_sekretariat, NEW.show_campus, NEW.show_groovelab, 
            NEW.lesson_duration, NEW.planned_boards, NEW.required_equipment, NEW.sick_until, NEW.phone, 
            NEW.joker_used, NEW.is_pin_activated, NEW.groovelab_räume, NEW.campus_räume, NEW.joker_used_at, 
            NEW.sick_start, NEW.push_notifications_enabled, NEW.push_notif_schedule_changes, 
            NEW.push_notif_homework, NEW.push_notif_all_features, NEW.app_usage_mode, 
            NEW.preferred_room_ids, NEW.groovelab_instrument, NEW.student_billing_payment_method, 
            NEW.activated_at, NEW.student_billing_cash_paid, NEW.roles, NEW.exempt_from_direct_billing,
            NEW.group_id, NEW.sibling_group_id,
            COALESCE(NEW.parent_allow_chat, true), COALESCE(NEW.parent_allow_timer, true), COALESCE(NEW.parent_allow_leaderboard, true), COALESCE(NEW.parent_allow_groups, true), COALESCE(NEW.parent_allow_proposals, true),
            hashed_parent_pin, COALESCE(NEW.pin_enforced_for_preview, false),
            COALESCE(NEW.teacher_onboarding_completed, false), COALESCE(NEW.teacher_availability, '{}'::jsonb)
        );

        -- Handle email insert
        IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
            email_parts := regexp_split_to_array(NEW.email, '@');
            IF array_length(email_parts, 1) = 2 THEN
                email_prefix := email_parts[1];
                email_suffix := email_parts[2];
                
                INSERT INTO public.user_email_prefixes (user_id, prefix)
                VALUES (r_id, extensions.pgp_sym_encrypt(email_prefix, public.get_encryption_key()));
                
                INSERT INTO public.user_email_suffixes (user_id, suffix)
                VALUES (r_id, email_suffix);
            END IF;
        END IF;

        NEW.id := r_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_view_dml
INSTEAD OF INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.handle_users_view_dml();

NOTIFY pgrst, 'reload schema';
