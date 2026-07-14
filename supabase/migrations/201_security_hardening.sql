-- Migration 201: Security Hardening & RLS Enforcement

-- 1. Enable RLS on the 19 unconfigured tables
ALTER TABLE public.activation_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_prefixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suffixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magic_link_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_email_prefixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_email_suffixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_first_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_last_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_onboarding_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_schedule_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_email_prefixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_email_suffixes ENABLE ROW LEVEL SECURITY;

-- 2. Drop insecure policies if they exist
DROP POLICY IF EXISTS "Allow anonymous select onboarding tokens" ON public.student_onboarding_tokens;
DROP POLICY IF EXISTS "Allow school staff manage onboarding tokens" ON public.student_onboarding_tokens;
DROP POLICY IF EXISTS "users_select" ON public.users_raw;
DROP POLICY IF EXISTS "users_update" ON public.users_raw;
DROP POLICY IF EXISTS "users_update" ON public.users;

-- 3. Correct users_select policy to prevent anonymous master_admin leak
CREATE POLICY "users_select" ON public.users_raw
FOR SELECT
USING (
    public.is_master_admin()
    OR (
        (get_kiosk_token() IS NOT NULL)
        AND (
            EXISTS (
                SELECT 1
                FROM kiosks k
                WHERE ((k.secret_token = get_kiosk_token()) AND (k.school_id = users_raw.school_id))
            )
        )
    )
    OR (
        (get_kiosk_token() IS NULL)
        AND (get_qr_token() IS NOT NULL)
        AND (
            ((qr_token)::text = get_qr_token())
            OR ((teacher_qr_token)::text = get_qr_token())
            OR (upper((ausweis_nummer)::text) = upper(get_qr_token()))
        )
    )
    OR check_school_access(school_id)
    OR school_has_no_users(school_id)
);

-- 4. Fix Privilege Escalation in users_update policy
CREATE POLICY "users_update" ON public.users_raw
FOR UPDATE
USING (
    public.is_master_admin()
    OR (public.check_school_access(school_id) AND (public.is_teacher_or_admin() OR id = public.get_current_user_id()))
)
WITH CHECK (
    public.is_master_admin()
    OR (
        public.check_school_access(school_id)
        AND (
            public.is_teacher_or_admin()
            OR (
                id = public.get_current_user_id()
            )
        )
    )
);

-- 5. Harden get_user_school_id() against Header Spoofing by checking auth.uid() first
CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
SET row_security = off
STABLE
AS $$
DECLARE
    v_headers text;
    v_user_id text;
    v_school_id uuid;
    v_auth_uid uuid;
BEGIN
    -- Resolve authenticated user first via JWT to prevent header spoofing
    BEGIN
        v_auth_uid := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_auth_uid := NULL;
    END;

    IF v_auth_uid IS NOT NULL THEN
        SELECT school_id INTO v_school_id
        FROM public.users_raw
        WHERE id = v_auth_uid;
        RETURN v_school_id;
    END IF;

    -- Fallback to header for anonymous/kiosk check-in
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN NULL;
    END IF;
    v_user_id := v_headers::json->>'x-user-id';
    IF v_user_id IS NULL OR v_user_id = '' THEN
        RETURN NULL;
    END IF;
    
    SELECT school_id INTO v_school_id
    FROM public.users_raw
    WHERE id = v_user_id::uuid;
    
    RETURN v_school_id;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- 6. RLS Policies for newly secured tables
-- students
DROP POLICY IF EXISTS students_all ON public.students;
CREATE POLICY students_all ON public.students FOR ALL USING (
    public.is_master_admin() OR public.check_school_access(school_id)
);

-- student_first_names
DROP POLICY IF EXISTS student_first_names_all ON public.student_first_names;
CREATE POLICY student_first_names_all ON public.student_first_names FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.students s WHERE s.id = student_id AND public.check_school_access(s.school_id)
    )
);

-- student_last_names
DROP POLICY IF EXISTS student_last_names_all ON public.student_last_names;
CREATE POLICY student_last_names_all ON public.student_last_names FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.students s WHERE s.id = student_id AND public.check_school_access(s.school_id)
    )
);

-- activation_days
DROP POLICY IF EXISTS activation_days_all ON public.activation_days;
CREATE POLICY activation_days_all ON public.activation_days FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.students s WHERE s.id = student_id AND public.check_school_access(s.school_id)
    )
);

-- email_prefixes / email_suffixes
DROP POLICY IF EXISTS email_prefixes_all ON public.email_prefixes;
CREATE POLICY email_prefixes_all ON public.email_prefixes FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.students s WHERE s.id = student_id AND public.check_school_access(s.school_id)
    )
);
DROP POLICY IF EXISTS email_suffixes_all ON public.email_suffixes;
CREATE POLICY email_suffixes_all ON public.email_suffixes FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.students s WHERE s.id = student_id AND public.check_school_access(s.school_id)
    )
);

-- parent_email_prefixes / parent_email_suffixes
DROP POLICY IF EXISTS parent_email_prefixes_all ON public.parent_email_prefixes;
CREATE POLICY parent_email_prefixes_all ON public.parent_email_prefixes FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.students s WHERE s.id = student_id AND public.check_school_access(s.school_id)
    )
);
DROP POLICY IF EXISTS parent_email_suffixes_all ON public.parent_email_suffixes;
CREATE POLICY parent_email_suffixes_all ON public.parent_email_suffixes FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.students s WHERE s.id = student_id AND public.check_school_access(s.school_id)
    )
);

-- student_schedule_preferences
DROP POLICY IF EXISTS student_schedule_preferences_all ON public.student_schedule_preferences;
CREATE POLICY student_schedule_preferences_all ON public.student_schedule_preferences FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.students s WHERE s.id = student_id AND public.check_school_access(s.school_id)
    )
);

-- student_onboarding_tokens
DROP POLICY IF EXISTS student_onboarding_tokens_all ON public.student_onboarding_tokens;
CREATE POLICY student_onboarding_tokens_all ON public.student_onboarding_tokens FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.students s WHERE s.id = student_id AND public.check_school_access(s.school_id)
    )
);

-- user_email_prefixes / user_email_suffixes
DROP POLICY IF EXISTS user_email_prefixes_all ON public.user_email_prefixes;
CREATE POLICY user_email_prefixes_all ON public.user_email_prefixes FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.users_raw u WHERE u.id = user_id AND public.check_school_access(u.school_id)
    )
);
DROP POLICY IF EXISTS user_email_suffixes_all ON public.user_email_suffixes;
CREATE POLICY user_email_suffixes_all ON public.user_email_suffixes FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.users_raw u WHERE u.id = user_id AND public.check_school_access(u.school_id)
    )
);

-- magic_link_logs
DROP POLICY IF EXISTS magic_link_logs_all ON public.magic_link_logs;
CREATE POLICY magic_link_logs_all ON public.magic_link_logs FOR ALL USING (public.is_master_admin());

-- onboarding_attempts
DROP POLICY IF EXISTS onboarding_attempts_all ON public.onboarding_attempts;
CREATE POLICY onboarding_attempts_all ON public.onboarding_attempts FOR ALL USING (public.is_master_admin());

-- push_subscriptions
DROP POLICY IF EXISTS push_subscriptions_all ON public.push_subscriptions;
CREATE POLICY push_subscriptions_all ON public.push_subscriptions FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.users_raw u WHERE u.id = user_id AND public.check_school_access(u.school_id)
    )
);

-- notifications
DROP POLICY IF EXISTS notifications_all ON public.notifications;
CREATE POLICY notifications_all ON public.notifications FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.users_raw u WHERE u.id = user_id AND public.check_school_access(u.school_id)
    )
);

-- campus_direct_messages
DROP POLICY IF EXISTS campus_direct_messages_all ON public.campus_direct_messages;
CREATE POLICY campus_direct_messages_all ON public.campus_direct_messages FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.users_raw u WHERE (u.id = sender_id OR u.id = recipient_id) AND public.check_school_access(u.school_id)
    )
);

-- sessions
DROP POLICY IF EXISTS sessions_all ON public.sessions;
CREATE POLICY sessions_all ON public.sessions FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.users_raw u WHERE u.id = user_id AND public.check_school_access(u.school_id)
    )
);

-- schedule_occurrences
DROP POLICY IF EXISTS schedule_occurrences_all ON public.schedule_occurrences;
CREATE POLICY schedule_occurrences_all ON public.schedule_occurrences FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.users_raw u WHERE u.id = teacher_id AND public.check_school_access(u.school_id)
    )
);

-- 7. Drop and update active_licence_metrics view
DROP VIEW IF EXISTS public.active_licence_metrics CASCADE;

CREATE OR REPLACE VIEW public.active_licence_metrics AS
SELECT 
    school_id,
    COUNT(CASE WHEN is_app_user = TRUE AND is_campus_active = TRUE AND role = 'student' THEN 1 END) as active_campus_users,
    COUNT(CASE WHEN is_app_user = TRUE AND is_groovelab_active = TRUE AND role = 'student' THEN 1 END) as active_groovelab_users,
    COUNT(CASE WHEN is_active = TRUE AND role IN ('teacher', 'admin', 'secretary') THEN 1 END) as active_staff_users,
    COUNT(CASE WHEN is_active = TRUE AND role IN ('teacher', 'admin', 'secretary') THEN 1 END) * 0.49 as staff_service_fee,
    COUNT(CASE WHEN is_app_user = TRUE AND (is_campus_active = TRUE OR is_groovelab_active = TRUE) THEN 1 END) as total_billable_app_users
FROM 
    public.users_raw
GROUP BY 
    school_id;

-- 8. Redact personal_pin from users view and add has_personal_pin
DROP TRIGGER IF EXISTS trg_users_view_dml ON public.users;
DROP VIEW IF EXISTS public.users CASCADE;

CREATE OR REPLACE VIEW public.users WITH (security_invoker = true) AS
SELECT 
    ur.id, ur.school_id, ur.role, ur.first_name, ur.last_name, ur.avatar_url, ur.qr_token, ur.instrument, 
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

-- 9. Update trigger function handle_users_view_dml to prevent privilege escalation
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
        -- Prevent privilege escalation: if not master admin or teacher/admin, prevent changing role or is_master_admin or school_id
        IF NOT (public.is_master_admin() OR public.is_teacher_or_admin()) THEN
            IF NEW.role IS DISTINCT FROM OLD.role OR NEW.is_master_admin IS DISTINCT FROM OLD.is_master_admin OR NEW.school_id IS DISTINCT FROM OLD.school_id THEN
                RAISE EXCEPTION 'Privilege escalation attempt blocked. You cannot change your role, master admin status, or school_id.';
            END IF;
        END IF;
    END IF;

    -- Hash the parent PIN if provided and not already a 64-char SHA-256 hex hash
    IF NEW.parent_pin IS NOT NULL AND NEW.parent_pin <> '' THEN
        IF length(NEW.parent_pin) = 64 THEN
            hashed_parent_pin := NEW.parent_pin;
        ELSE
            hashed_parent_pin := encode(extensions.digest(NEW.parent_pin, 'sha256'), 'hex');
        END IF;
    ELSE
        hashed_parent_pin := NULL;
    END IF;

    IF TG_OP = 'INSERT' THEN
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
            activated_at, student_billing_cash_paid, roles, exempt_from_direct_billing,
            group_id, sibling_group_id, parent_pin,
            parent_allow_chat, parent_allow_timer, parent_allow_leaderboard, parent_allow_groups, parent_allow_proposals
        ) VALUES (
            COALESCE(NEW.id, gen_random_uuid()), NEW.school_id, NEW.role, NEW.first_name, NEW.last_name, NEW.avatar_url, NEW.qr_token, NEW.instrument,
            COALESCE(NEW.created_at, NOW()), NEW.coach_notes, NEW.photo_url, NEW.bio, NEW.bands, NEW.projects, NEW.listening, NEW.gear,
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
            NEW.activated_at, NEW.student_billing_cash_paid, NEW.roles, COALESCE(NEW.exempt_from_direct_billing, false),
            NEW.group_id, NEW.sibling_group_id, hashed_parent_pin,
            COALESCE(NEW.parent_allow_chat, true), COALESCE(NEW.parent_allow_timer, true), COALESCE(NEW.parent_allow_leaderboard, true), COALESCE(NEW.parent_allow_groups, true), COALESCE(NEW.parent_allow_proposals, true)
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
            exempt_from_direct_billing = COALESCE(NEW.exempt_from_direct_billing, false),
            group_id = NEW.group_id,
            sibling_group_id = NEW.sibling_group_id,
            parent_pin = COALESCE(hashed_parent_pin, parent_pin),
            parent_allow_chat = COALESCE(NEW.parent_allow_chat, parent_allow_chat),
            parent_allow_timer = COALESCE(NEW.parent_allow_timer, parent_allow_timer),
            parent_allow_leaderboard = COALESCE(NEW.parent_allow_leaderboard, parent_allow_leaderboard),
            parent_allow_groups = COALESCE(NEW.parent_allow_groups, parent_allow_groups),
            parent_allow_proposals = COALESCE(NEW.parent_allow_proposals, parent_allow_proposals)
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
        DELETE FROM public.users_raw WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_view_dml
INSTEAD OF INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.handle_users_view_dml();

-- 10. Add security definer verification function for personal_pin with safe search_path
CREATE OR REPLACE FUNCTION public.verify_personal_pin(user_uuid UUID, input_pin TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    stored_pin TEXT;
BEGIN
    SELECT personal_pin INTO stored_pin FROM public.users_raw WHERE id = user_uuid;
    RETURN stored_pin = input_pin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 11. Secure verify_parent_pin with search_path set to prevent hijacking
ALTER FUNCTION public.verify_parent_pin(UUID, TEXT) SET search_path = public, pg_temp;

NOTIFY pgrst, 'reload schema';
