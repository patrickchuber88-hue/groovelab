-- Migration 189: Harden users_raw, system_alerts, and crisis_notifications RLS
-- This migration fixes the multi-tenancy update vulnerability in users_raw trigger and restricts alert/notification access.

-- 1. Redefine handle_users_view_dml trigger function to perform explicit permission checks
CREATE OR REPLACE FUNCTION public.handle_users_view_dml()
RETURNS TRIGGER AS $$
DECLARE
    email_parts TEXT[];
    email_prefix TEXT;
    email_suffix TEXT;
    r_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Verify authorization before insert
        IF NOT (
            public.is_master_admin()
            OR (public.get_user_school_id() = NEW.school_id AND public.is_teacher_or_admin())
            OR public.school_has_no_users(NEW.school_id)
            OR (NULLIF(current_setting('request.headers', true)::json->>'x-invite-school-id', ''))::text = NEW.school_id::text
        ) THEN
            RAISE EXCEPTION 'RLS violation: Unauthorized insert on users';
        END IF;

        -- Einfügen in die echte Tabelle users_raw
        INSERT INTO public.users_raw (
            id, school_id, role, first_name, last_name, avatar_url, qr_token, instrument, 
            created_at, coach_notes, photo_url, bio, bands, projects, listening, gear, 
            musical_styles, equipment_list, last_seen, expertise, age, birth_date, 
            pending_repertoire_proposal, is_external_vocalist, show_messages_menu, 
            master_admin_username, master_admin_password, is_trial, trial_ends_at, 
            contract_ends_at, status, is_master_admin, is_app_user, is_campus_active, 
            is_groovelab_active, is_premium_user, teacher_id, ausweis_nummer, 
            teacher_qr_token, is_active, max_students, nickname, password_hash, 
            ausweis_id, personal_pin, show_sekretariat, show_campus, show_groovelab, 
            lesson_duration, planned_boards, required_equipment, sick_until, phone, 
            joker_used, is_pin_activated, groovelab_räume, campus_räume, joker_used_at, 
            sick_start, push_notifications_enabled, push_notif_schedule_changes, 
            push_notif_homework, push_notif_all_features, app_usage_mode, 
            preferred_room_ids, groovelab_instrument, student_billing_payment_method, 
            activated_at, student_billing_cash_paid, roles, exempt_from_direct_billing
        ) VALUES (
            COALESCE(NEW.id, gen_random_uuid()), NEW.school_id, NEW.role, NEW.first_name, NEW.last_name, NEW.avatar_url, NEW.qr_token, NEW.instrument, 
            COALESCE(NEW.created_at, now()), NEW.coach_notes, NEW.photo_url, NEW.bio, NEW.bands, NEW.projects, NEW.listening, NEW.gear, 
            NEW.musical_styles, NEW.equipment_list, NEW.last_seen, NEW.expertise, NEW.age, NEW.birth_date, 
            NEW.pending_repertoire_proposal, NEW.is_external_vocalist, NEW.show_messages_menu, 
            NEW.master_admin_username, NEW.master_admin_password, NEW.is_trial, NEW.trial_ends_at, 
            NEW.contract_ends_at, NEW.status, NEW.is_master_admin, NEW.is_app_user, NEW.is_campus_active, 
            NEW.is_groovelab_active, NEW.is_premium_user, NEW.teacher_id, NEW.ausweis_nummer, 
            NEW.teacher_qr_token, NEW.is_active, NEW.max_students, NEW.nickname, NEW.password_hash, 
            NEW.ausweis_id, NEW.personal_pin, NEW.show_sekretariat, NEW.show_campus, NEW.show_groovelab, 
            NEW.lesson_duration, NEW.planned_boards, NEW.required_equipment, NEW.sick_until, NEW.phone, 
            NEW.joker_used, NEW.is_pin_activated, NEW.groovelab_räume, NEW.campus_räume, NEW.joker_used_at, 
            NEW.sick_start, NEW.push_notifications_enabled, NEW.push_notif_schedule_changes, 
            NEW.push_notif_homework, NEW.push_notif_all_features, NEW.app_usage_mode, 
            NEW.preferred_room_ids, NEW.groovelab_instrument, NEW.student_billing_payment_method, 
            NEW.activated_at, NEW.student_billing_cash_paid, NEW.roles, COALESCE(NEW.exempt_from_direct_billing, false)
        ) RETURNING id INTO r_id;

        IF NEW.email IS NOT NULL AND NEW.email LIKE '%@%' THEN
            email_parts := string_to_array(NEW.email, '@');
            email_prefix := email_parts[1];
            email_suffix := email_parts[2];
            
            INSERT INTO public.user_email_prefixes (user_id, prefix)
            VALUES (r_id, extensions.pgp_sym_encrypt(email_prefix, public.get_encryption_key()));
            
            INSERT INTO public.user_email_suffixes (user_id, suffix)
            VALUES (r_id, email_suffix);
        END IF;

        SELECT * INTO NEW FROM public.users WHERE id = r_id;
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Verify authorization before update (multi-tenancy check)
        IF NOT (
            public.is_master_admin()
            OR (
                public.check_school_access(OLD.school_id) 
                AND (
                    public.is_teacher_or_admin() 
                    OR OLD.id = (NULLIF(current_setting('request.headers', true)::json->>'x-user-id', ''))::uuid
                )
            )
        ) THEN
            RAISE EXCEPTION 'RLS violation: Unauthorized update on users';
        END IF;

        -- users_raw aktualisieren
        UPDATE public.users_raw SET
            school_id = NEW.school_id,
            role = NEW.role,
            first_name = NEW.first_name,
            last_name = NEW.last_name,
            avatar_url = NEW.avatar_url,
            qr_token = NEW.qr_token,
            instrument = NEW.instrument,
            created_at = NEW.created_at,
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
            master_admin_username = NEW.master_admin_username,
            master_admin_password = NEW.master_admin_password,
            is_trial = NEW.is_trial,
            trial_ends_at = NEW.trial_ends_at,
            contract_ends_at = NEW.contract_ends_at,
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
            exempt_from_direct_billing = COALESCE(NEW.exempt_from_direct_billing, false)
        WHERE id = OLD.id;

        IF NEW.email IS DISTINCT FROM OLD.email THEN
            DELETE FROM public.user_email_prefixes WHERE user_id = OLD.id;
            DELETE FROM public.user_email_suffixes WHERE user_id = OLD.id;
            
            IF NEW.email IS NOT NULL AND NEW.email LIKE '%@%' THEN
                email_parts := string_to_array(NEW.email, '@');
                email_prefix := email_parts[1];
                email_suffix := email_parts[2];
                
                INSERT INTO public.user_email_prefixes (user_id, prefix)
                VALUES (OLD.id, extensions.pgp_sym_encrypt(email_prefix, public.get_encryption_key()));
                
                INSERT INTO public.user_email_suffixes (user_id, suffix)
                VALUES (OLD.id, email_suffix);
            END IF;
        END IF;

        SELECT * INTO NEW FROM public.users WHERE id = OLD.id;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        -- Verify authorization before delete
        IF NOT (
            public.is_master_admin()
            OR (
                public.check_school_access(OLD.school_id) 
                AND public.is_teacher_or_admin()
            )
        ) THEN
            RAISE EXCEPTION 'RLS violation: Unauthorized delete on users';
        END IF;

        DELETE FROM public.users_raw WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Secure public.system_alerts table
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS system_alerts_all ON public.system_alerts;
DROP POLICY IF EXISTS system_alerts_select ON public.system_alerts;
DROP POLICY IF EXISTS system_alerts_modify ON public.system_alerts;

CREATE POLICY system_alerts_select ON public.system_alerts
FOR SELECT USING (
    public.is_master_admin()
    OR (public.check_school_access(school_id) AND public.is_teacher_or_admin())
    OR teacher_id = (NULLIF(current_setting('request.headers', true)::json->>'x-user-id', ''))::uuid
);

CREATE POLICY system_alerts_modify ON public.system_alerts
FOR ALL USING (
    public.is_master_admin()
    OR (public.check_school_access(school_id) AND public.is_teacher_or_admin())
);

-- 3. Secure public.crisis_notifications table
ALTER TABLE public.crisis_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crisis_notifications_all ON public.crisis_notifications;
DROP POLICY IF EXISTS crisis_notifications_select ON public.crisis_notifications;
DROP POLICY IF EXISTS crisis_notifications_insert ON public.crisis_notifications;
DROP POLICY IF EXISTS crisis_notifications_update ON public.crisis_notifications;
DROP POLICY IF EXISTS crisis_notifications_delete ON public.crisis_notifications;

CREATE POLICY crisis_notifications_select ON public.crisis_notifications
FOR SELECT USING (
    public.is_master_admin()
    OR (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = crisis_notifications.teacher_id AND public.check_school_access(u.school_id)
        )
        AND public.is_teacher_or_admin()
    )
    OR student_id = (NULLIF(current_setting('request.headers', true)::json->>'x-user-id', ''))::uuid
);

CREATE POLICY crisis_notifications_insert ON public.crisis_notifications
FOR INSERT WITH CHECK (
    public.is_master_admin()
    OR (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = crisis_notifications.teacher_id AND public.check_school_access(u.school_id)
        )
        AND public.is_teacher_or_admin()
    )
);

CREATE POLICY crisis_notifications_update ON public.crisis_notifications
FOR UPDATE USING (
    public.is_master_admin()
    OR (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = crisis_notifications.teacher_id AND public.check_school_access(u.school_id)
        )
        AND public.is_teacher_or_admin()
    )
    OR student_id = (NULLIF(current_setting('request.headers', true)::json->>'x-user-id', ''))::uuid
) WITH CHECK (
    public.is_master_admin()
    OR (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = crisis_notifications.teacher_id AND public.check_school_access(u.school_id)
        )
        AND public.is_teacher_or_admin()
    )
    OR (
        student_id = (NULLIF(current_setting('request.headers', true)::json->>'x-user-id', ''))::uuid
        AND status = 'READ'
    )
);

CREATE POLICY crisis_notifications_delete ON public.crisis_notifications
FOR DELETE USING (
    public.is_master_admin()
    OR (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = crisis_notifications.teacher_id AND public.check_school_access(u.school_id)
        )
        AND public.is_teacher_or_admin()
    )
);

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
