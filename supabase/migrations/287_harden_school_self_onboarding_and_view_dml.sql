-- Migration 287: Harden School Self-Onboarding RPC & View DML Trigger
-- Eliminates RLS 401/403 Unauthorized blocks for guest music school self-registrations.

-- ============================================================================
-- 1. Ensure permissive INSERT policies on schools, user_email_prefixes & suffixes
-- ============================================================================

DROP POLICY IF EXISTS "Allow public school registration" ON public.schools;
CREATE POLICY "Allow public school registration" 
ON public.schools 
FOR INSERT 
TO anon, authenticated, service_role 
WITH CHECK (true);

DROP POLICY IF EXISTS "user_email_prefixes_insert" ON public.user_email_prefixes;
CREATE POLICY "user_email_prefixes_insert"
ON public.user_email_prefixes
FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "user_email_suffixes_insert" ON public.user_email_suffixes;
CREATE POLICY "user_email_suffixes_insert"
ON public.user_email_suffixes
FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (true);


-- ============================================================================
-- 2. Harden handle_users_view_dml() with SECURITY DEFINER
-- ============================================================================

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
    r_id UUID;
    hashed_parent_pin TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.user_email_prefixes WHERE user_id = OLD.id;
        DELETE FROM public.user_email_suffixes WHERE user_id = OLD.id;
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
            push_notif_homework, push_notif_all_features, push_notif_weekly_digest,
            push_notif_chat, push_notif_practice_reminder,
            app_usage_mode, 
            preferred_room_ids, groovelab_instrument, student_billing_payment_method, 
            activated_at, student_billing_cash_paid, roles, exempt_from_direct_billing,
            group_id, sibling_group_id, parent_pin,
            parent_allow_absences,
            parent_allow_chat, parent_allow_timer, parent_allow_leaderboard, parent_allow_groups, parent_allow_proposals,
            parent_allow_audio,
            parent_permissions,
            campus_ui_level,
            pin_enforced_for_preview, onboarding_pin
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
            NEW.push_notif_homework, NEW.push_notif_all_features,
            COALESCE(NEW.push_notif_weekly_digest, true),
            COALESCE(NEW.push_notif_chat, true),
            COALESCE(NEW.push_notif_practice_reminder, true),
            NEW.app_usage_mode,
            NEW.preferred_room_ids, NEW.groovelab_instrument, NEW.student_billing_payment_method,
            NEW.activated_at, NEW.student_billing_cash_paid, NEW.roles, NEW.exempt_from_direct_billing,
            NEW.group_id, NEW.sibling_group_id, hashed_parent_pin,
            COALESCE(NEW.parent_allow_absences, false),
            COALESCE(NEW.parent_allow_chat, true), COALESCE(NEW.parent_allow_timer, true), COALESCE(NEW.parent_allow_leaderboard, true), COALESCE(NEW.parent_allow_groups, true), COALESCE(NEW.parent_allow_proposals, true),
            COALESCE(NEW.parent_allow_audio, true),
            COALESCE(NEW.parent_permissions, '{}'::jsonb),
            COALESCE(NEW.campus_ui_level, 'junior'),
            NEW.pin_enforced_for_preview, NEW.onboarding_pin
        )
        RETURNING id INTO r_id;

        IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
            email_parts := regexp_split_to_array(NEW.email, '@');
            email_prefix := email_parts[1];
            email_suffix := email_parts[2];

            INSERT INTO public.user_email_prefixes (user_id, prefix)
            VALUES (r_id, extensions.pgp_sym_encrypt(email_prefix, public.get_encryption_key()));

            INSERT INTO public.user_email_suffixes (user_id, suffix)
            VALUES (r_id, email_suffix);
        END IF;

        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.is_master_admin <> NEW.is_master_admin AND NOT public.is_master_admin() THEN
            RAISE EXCEPTION 'Unauthorized to modify is_master_admin';
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
            push_notif_weekly_digest = COALESCE(NEW.push_notif_weekly_digest, OLD.push_notif_weekly_digest, true),
            push_notif_chat = COALESCE(NEW.push_notif_chat, OLD.push_notif_chat, true),
            push_notif_practice_reminder = COALESCE(NEW.push_notif_practice_reminder, OLD.push_notif_practice_reminder, true),
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
            parent_pin = COALESCE(hashed_parent_pin, OLD.parent_pin),
            parent_allow_absences = COALESCE(NEW.parent_allow_absences, OLD.parent_allow_absences, false),
            parent_allow_chat = COALESCE(NEW.parent_allow_chat, OLD.parent_allow_chat, true),
            parent_allow_timer = COALESCE(NEW.parent_allow_timer, OLD.parent_allow_timer, true),
            parent_allow_leaderboard = COALESCE(NEW.parent_allow_leaderboard, OLD.parent_allow_leaderboard, true),
            parent_allow_groups = COALESCE(NEW.parent_allow_groups, OLD.parent_allow_groups, true),
            parent_allow_proposals = COALESCE(NEW.parent_allow_proposals, OLD.parent_allow_proposals, true),
            parent_allow_audio = COALESCE(NEW.parent_allow_audio, OLD.parent_allow_audio, true),
            parent_permissions = COALESCE(NEW.parent_permissions, OLD.parent_permissions, '{}'::jsonb),
            campus_ui_level = COALESCE(NEW.campus_ui_level, OLD.campus_ui_level, 'junior'),
            pin_enforced_for_preview = NEW.pin_enforced_for_preview,
            onboarding_pin = NEW.onboarding_pin
        WHERE id = OLD.id;

        IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
            email_parts := regexp_split_to_array(NEW.email, '@');
            email_prefix := email_parts[1];
            email_suffix := email_parts[2];

            DELETE FROM public.user_email_prefixes WHERE user_id = OLD.id;
            DELETE FROM public.user_email_suffixes WHERE user_id = OLD.id;

            INSERT INTO public.user_email_prefixes (user_id, prefix)
            VALUES (OLD.id, extensions.pgp_sym_encrypt(email_prefix, public.get_encryption_key()));

            INSERT INTO public.user_email_suffixes (user_id, suffix)
            VALUES (OLD.id, email_suffix);
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$;


-- ============================================================================
-- 3. Direct, Atomic RPC register_school_and_admin (Direct Table Inserts)
-- ============================================================================

DROP FUNCTION IF EXISTS public.register_school_and_admin(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.register_school_and_admin(
    p_school_name TEXT,
    p_subdomain TEXT,
    p_street TEXT,
    p_house_number TEXT,
    p_zip_code TEXT,
    p_city TEXT,
    p_phone TEXT,
    p_school_email TEXT,
    p_admin_first_name TEXT,
    p_admin_last_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_school_id UUID := gen_random_uuid();
    v_admin_id UUID := gen_random_uuid();
    v_qr_token UUID := gen_random_uuid();
    v_generated_pin TEXT;
    v_admin_email TEXT;
    v_slug TEXT;
    v_email_parts TEXT[];
    v_email_prefix TEXT;
    v_email_suffix TEXT;
BEGIN
    -- 1. Format & Validate Slug
    v_slug := LOWER(TRIM(p_subdomain));
    IF v_slug IS NULL OR length(v_slug) < 3 THEN
        RAISE EXCEPTION 'Die Wunsch-Subdomain muss mindestens 3 Zeichen lang sein.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.schools WHERE subdomain = v_slug) THEN
        RAISE EXCEPTION 'Diese Wunsch-Subdomain ist bereits vergeben. Bitte wähle eine andere.';
    END IF;

    -- 2. Generate unique 6-digit Master-PIN & Email
    v_generated_pin := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
    v_admin_email := COALESCE(NULLIF(LOWER(TRIM(p_school_email)), ''), v_slug || '@campus-groovelab.de');

    -- 3. Create school record directly in public.schools
    INSERT INTO public.schools (
        id, name, legal_name, subdomain, primary_color,
        street, house_number, zip_code, city, phone_number,
        email, billing_email, billing_contact_person, country,
        has_campus_subscription, has_groovelab_subscription,
        subscription_bypass, is_trial, trial_ends_at, status,
        avv_signed_at, avv_signee_name, is_active
    ) VALUES (
        v_school_id, TRIM(p_school_name), TRIM(p_school_name), v_slug, '#34a853',
        TRIM(p_street), NULLIF(TRIM(p_house_number), ''), TRIM(p_zip_code), TRIM(p_city), NULLIF(TRIM(p_phone), ''),
        v_admin_email, v_admin_email, TRIM(p_admin_first_name) || ' ' || TRIM(p_admin_last_name), 'Deutschland',
        TRUE, TRUE,
        FALSE, TRUE, NOW() + INTERVAL '30 days', 'trial',
        NOW(), TRIM(p_admin_first_name) || ' ' || TRIM(p_admin_last_name) || ' (Schulleitung)', TRUE
    );

    -- 4. Create admin record directly in public.users_raw (Enforcing chalkboard avatar /campus_login_hero.png)
    INSERT INTO public.users_raw (
        id, school_id, role, roles, first_name, last_name,
        password_hash, qr_token, ausweis_nummer,
        photo_url, avatar_url, is_campus_active, is_groovelab_active,
        is_active, is_pin_activated, created_at, last_seen
    ) VALUES (
        v_admin_id, v_school_id, 'admin', ARRAY['admin'], TRIM(p_admin_first_name), TRIM(p_admin_last_name),
        v_generated_pin, v_qr_token, v_generated_pin,
        '/campus_login_hero.png', '/campus_login_hero.png', TRUE, TRUE,
        TRUE, TRUE, NOW(), NOW()
    );

    -- 5. Insert encrypted email directly into prefixes & suffixes
    IF v_admin_email IS NOT NULL AND v_admin_email <> '' THEN
        v_email_parts := regexp_split_to_array(v_admin_email, '@');
        v_email_prefix := v_email_parts[1];
        v_email_suffix := v_email_parts[2];

        INSERT INTO public.user_email_prefixes (user_id, prefix)
        VALUES (v_admin_id, extensions.pgp_sym_encrypt(v_email_prefix, public.get_encryption_key()));

        INSERT INTO public.user_email_suffixes (user_id, suffix)
        VALUES (v_admin_id, v_email_suffix);
    END IF;

    -- 6. Ensure default 'Allgemein' subject is present for the new school
    INSERT INTO public.subjects (school_id, name, description, category, is_active)
    VALUES (v_school_id, 'Allgemein', 'Standard-Unterrichtsfach', 'Allgemein', true)
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'school_id', v_school_id,
        'admin_id', v_admin_id,
        'pin', v_generated_pin,
        'qr_token', v_qr_token,
        'school_name', TRIM(p_school_name),
        'subdomain', v_slug,
        'first_name', TRIM(p_admin_first_name),
        'last_name', TRIM(p_admin_last_name),
        'email', v_admin_email
    );
END;
$$;

-- 7. Grant execution privileges to all roles
GRANT EXECUTE ON FUNCTION public.register_school_and_admin(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
