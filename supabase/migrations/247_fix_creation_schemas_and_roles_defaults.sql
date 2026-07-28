-- Migration 247: Fix Dataset Creation Schemas, Missing Columns & Roles Defaults
-- 1. Fix rooms table missing color column
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';

-- 2. Fix cooperations table missing partner_name and notes columns
ALTER TABLE public.cooperations ADD COLUMN IF NOT EXISTS partner_name TEXT DEFAULT NULL;
ALTER TABLE public.cooperations ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- 3. Create missing duties table (referencing users_raw for foreign key)
CREATE TABLE IF NOT EXISTS public.duties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_user_id UUID REFERENCES public.users_raw(id) ON DELETE SET NULL,
  due_date DATE,
  status TEXT DEFAULT 'offen',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.duties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS duties_select ON public.duties;
DROP POLICY IF EXISTS duties_modify ON public.duties;
CREATE POLICY duties_select ON public.duties FOR SELECT USING (public.check_school_access(school_id));
CREATE POLICY duties_modify ON public.duties FOR ALL USING (public.check_school_access(school_id));
GRANT ALL ON public.duties TO authenticated, anon, service_role;

-- 4. Fix band_members table missing role column
ALTER TABLE public.band_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';

-- 5. Update handle_users_view_dml trigger function to ensure roles array is NEVER NULL
CREATE OR REPLACE FUNCTION public.handle_users_view_dml()
RETURNS TRIGGER AS $$
DECLARE
    email_parts TEXT[];
    email_prefix TEXT;
    email_suffix TEXT;
    r_id UUID;
    hashed_parent_pin TEXT;
    final_roles TEXT[];
BEGIN
    -- Ensure roles array is populated if NULL or empty
    IF NEW.roles IS NULL OR array_length(NEW.roles, 1) IS NULL THEN
        final_roles := ARRAY[NEW.role];
    ELSE
        final_roles := NEW.roles;
    END IF;

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
            roles = final_roles,
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
            NEW.activated_at, NEW.student_billing_cash_paid, final_roles, NEW.exempt_from_direct_billing,
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

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Backfill existing users_raw with NULL roles
UPDATE public.users_raw
SET roles = ARRAY[role]
WHERE roles IS NULL OR array_length(roles, 1) IS NULL;
