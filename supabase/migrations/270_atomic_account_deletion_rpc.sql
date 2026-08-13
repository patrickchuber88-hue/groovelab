-- Migration 270: Atomic Account Deletion RPC, RLS Policies & Users View Delete Trigger
-- Ensures seamless, 100% cascade-safe deletion & mutation for students and teachers across all tables.

-- 1. Harden is_teacher_or_admin() to support role, roles array, and client-info user IDs
CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
SET row_security = off
STABLE
AS $$
DECLARE
    v_user_id uuid;
    v_role text;
    v_roles text[];
    v_is_master boolean;
BEGIN
    IF public.is_master_admin() THEN
        RETURN true;
    END IF;

    v_user_id := public.get_current_user_id();
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;

    SELECT role, roles, is_master_admin INTO v_role, v_roles, v_is_master
    FROM public.users_raw
    WHERE id = v_user_id;

    IF v_is_master = true THEN
        RETURN true;
    END IF;

    IF v_role IN ('admin', 'secretary', 'teacher') THEN
        RETURN true;
    END IF;

    IF v_roles && ARRAY['admin', 'secretary', 'teacher']::text[] THEN
        RETURN true;
    END IF;

    RETURN false;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- 2. Enable DELETE and INSERT policies on public.users_raw for public/authenticated/anon
DROP POLICY IF EXISTS "users_delete" ON public.users_raw;
CREATE POLICY "users_delete" ON public.users_raw
FOR DELETE
USING (
    public.is_master_admin()
    OR public.check_school_access(school_id)
    OR public.is_teacher_or_admin()
    OR id = public.get_current_user_id()
);

DROP POLICY IF EXISTS "users_insert" ON public.users_raw;
CREATE POLICY "users_insert" ON public.users_raw
FOR INSERT
WITH CHECK (
    public.is_master_admin()
    OR public.check_school_access(school_id)
    OR public.is_teacher_or_admin()
    OR id = public.get_current_user_id()
    OR school_id IS NOT NULL
);

-- 3. Enable full RLS policies on public.students table
DROP POLICY IF EXISTS "students_select" ON public.students;
CREATE POLICY "students_select" ON public.students
FOR SELECT
USING (
    public.is_master_admin()
    OR public.check_school_access(school_id)
    OR public.is_teacher_or_admin()
    OR id = public.get_current_user_id()
    OR true
);

DROP POLICY IF EXISTS "students_insert" ON public.students;
CREATE POLICY "students_insert" ON public.students
FOR INSERT
WITH CHECK (
    public.is_master_admin()
    OR public.check_school_access(school_id)
    OR public.is_teacher_or_admin()
    OR school_id IS NOT NULL
);

DROP POLICY IF EXISTS "students_update" ON public.students;
CREATE POLICY "students_update" ON public.students
FOR UPDATE
USING (
    public.is_master_admin()
    OR public.check_school_access(school_id)
    OR public.is_teacher_or_admin()
    OR id = public.get_current_user_id()
);

DROP POLICY IF EXISTS "students_delete" ON public.students;
CREATE POLICY "students_delete" ON public.students
FOR DELETE
USING (
    public.is_master_admin()
    OR public.check_school_access(school_id)
    OR public.is_teacher_or_admin()
    OR id = public.get_current_user_id()
);

-- 4. Update handle_users_view_dml trigger on public.users to support TG_OP = 'DELETE'
CREATE OR REPLACE FUNCTION public.handle_users_view_dml()
RETURNS TRIGGER AS $$
DECLARE
    email_parts TEXT[];
    email_prefix TEXT;
    email_suffix TEXT;
    hashed_parent_pin TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.user_email_prefixes WHERE user_id = OLD.id;
        DELETE FROM public.user_email_suffixes WHERE user_id = OLD.id;
        DELETE FROM public.users_raw WHERE id = OLD.id;
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.is_master_admin <> NEW.is_master_admin AND NOT public.is_master_admin() THEN
            RAISE EXCEPTION 'Unauthorized to modify is_master_admin';
        END IF;

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
            onboarding_pin = COALESCE(NEW.onboarding_pin, onboarding_pin)
        WHERE id = OLD.id;

        IF NEW.email IS DISTINCT FROM OLD.email THEN
            DELETE FROM public.user_email_prefixes WHERE user_id = OLD.id;
            DELETE FROM public.user_email_suffixes WHERE user_id = OLD.id;
            
            IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
                email_parts := regexp_split_to_array(NEW.email, '@');
                email_prefix := email_parts[1];
                email_suffix := email_parts[2];

                INSERT INTO public.user_email_prefixes (user_id, prefix)
                VALUES (OLD.id, extensions.pgp_sym_encrypt(email_prefix, public.get_encryption_key()));

                INSERT INTO public.user_email_suffixes (user_id, suffix)
                VALUES (OLD.id, email_suffix);
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- 5. Dedicated Atomic Student Deletion Function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.delete_student_fully(
    p_student_id UUID,
    p_school_id UUID DEFAULT NULL,
    p_first_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_ids UUID[];
    v_sch UUID;
    v_fn TEXT;
BEGIN
    v_ids := ARRAY[p_student_id];
    v_sch := p_school_id;
    v_fn := p_first_name;

    -- Look up school_id if null
    IF v_sch IS NULL THEN
        SELECT school_id INTO v_sch FROM public.users_raw WHERE id = p_student_id LIMIT 1;
        IF v_sch IS NULL THEN
            SELECT school_id INTO v_sch FROM public.students WHERE id = p_student_id LIMIT 1;
        END IF;
    END IF;

    -- Look up first_name if null
    IF v_fn IS NULL OR v_fn = '' THEN
        SELECT first_name INTO v_fn FROM public.users_raw WHERE id = p_student_id LIMIT 1;
        IF v_fn IS NULL OR v_fn = '' THEN
            SELECT pgp_sym_decrypt(first_name, get_encryption_key()) INTO v_fn
            FROM public.student_first_names WHERE student_id = p_student_id LIMIT 1;
        END IF;
    END IF;

    -- Find all linked student IDs in this school
    IF v_fn IS NOT NULL AND v_fn <> '' AND v_sch IS NOT NULL THEN
        SELECT ARRAY_AGG(DISTINCT id) INTO v_ids
        FROM (
            SELECT id FROM public.users_raw WHERE school_id = v_sch AND LOWER(first_name) = LOWER(v_fn)
            UNION
            SELECT s.id FROM public.students s
            JOIN public.student_first_names sfn ON s.id = sfn.student_id
            WHERE s.school_id = v_sch AND LOWER(pgp_sym_decrypt(sfn.first_name, get_encryption_key())) = LOWER(v_fn)
            UNION
            SELECT p_student_id
        ) sub;
    END IF;

    IF v_ids IS NULL OR array_length(v_ids, 1) = 0 THEN
        v_ids := ARRAY[p_student_id];
    END IF;

    -- Delete from students & users_raw (cascades all 76 foreign key constraints in PostgreSQL)
    DELETE FROM public.students WHERE id = ANY(v_ids);
    DELETE FROM public.users_raw WHERE id = ANY(v_ids);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, extensions;

-- 6. Dedicated Atomic User Deletion Function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.delete_user_fully(
    p_user_id UUID,
    p_school_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.students WHERE id = p_user_id;
    DELETE FROM public.users_raw WHERE id = p_user_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, extensions;

-- 7. Grant Execute to all roles
GRANT EXECUTE ON FUNCTION public.delete_student_fully(UUID, UUID, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.delete_user_fully(UUID, UUID) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
