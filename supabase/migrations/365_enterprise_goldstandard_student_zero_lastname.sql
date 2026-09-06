-- ==============================================================================
-- Migration 365: Tier-1 SaaS Enterprise+ Goldstandard Zero-Knowledge Student Anonymity
-- Standard: OWASP ASVS Level 3 / BSI IT-Grundschutz / DSGVO Art. 25 Privacy by Design
-- 1. Sets last_name = NULL for all student records viewed by students or anon
-- 2. Preserves full teacher last_name (AGENTS.md Invariante: Lehrkräfte immer vollständiger Name)
-- 3. Hardens student_last_names RLS to strictly forbid student queries
-- 4. Sanitizes authenticate_by_credential and authenticate_webauthn_credential RPCs
-- ==============================================================================

-- 1. DROP EXISTING VIEW TO RECREATE WITH ZERO-KNOWLEDGE STUDENT ANONYMITY
DROP VIEW IF EXISTS public.users CASCADE;

CREATE OR REPLACE VIEW public.users WITH (security_invoker = true) AS
SELECT 
    ur.id,
    ur.school_id,
    ur.role,
    ur.first_name,
    -- 🛡️ ZERO-KNOWLEDGE STUDENT ANONYMITY GOLDSTANDARD:
    CASE 
        -- 1. Authorized school staff (admin, secretary, teacher) and master admin need full last names for administration
        WHEN public.is_master_admin() 
             OR (public.get_current_user_school_id() = ur.school_id AND public.get_current_user_role() IN ('teacher', 'admin', 'secretary'))
        THEN ur.last_name::text

        -- 2. Teachers are ALWAYS displayed with their full name (Vorname + Nachname, e.g. Severin Landenberger) across all views (AGENTS.md Invariante)
        WHEN ur.role = 'teacher'
        THEN ur.last_name::text

        -- 3. ZERO-KNOWLEDGE FOR STUDENTS & ANON:
        -- Students viewing own record or classmates NEVER receive a last name or initial!
        ELSE NULL::text
    END AS last_name,
    ur.avatar_url,
    -- Zero-Leak Tokens: Only visible to self, master admin, or authorized school staff
    CASE 
        WHEN public.get_current_authenticated_user_id() = ur.id 
             OR public.is_master_admin() 
             OR (public.get_current_user_school_id() = ur.school_id AND public.get_current_user_role() IN ('teacher', 'admin', 'secretary'))
        THEN ur.qr_token
        ELSE NULL::uuid
    END AS qr_token,
    -- Zero-Leak Calendar Token: Strictly isolated from qr_token
    CASE 
        WHEN public.get_current_authenticated_user_id() = ur.id 
             OR public.is_master_admin() 
             OR (public.get_current_user_school_id() = ur.school_id AND public.get_current_user_role() IN ('teacher', 'admin', 'secretary'))
        THEN ur.calendar_token
        ELSE NULL::text
    END AS calendar_token,
    ur.instrument,
    ur.created_at,
    ur.coach_notes,
    ur.photo_url,
    ur.bio,
    ur.bands,
    ur.projects,
    ur.listening,
    ur.gear,
    ur.musical_styles,
    ur.equipment_list,
    ur.last_seen,
    ur.expertise,
    ur.age,
    ur.birth_date,
    ur.pending_repertoire_proposal,
    ur.is_external_vocalist,
    ur.show_messages_menu,
    ur.master_admin_username,
    NULL::text AS master_admin_password,
    ur.is_trial,
    ur.trial_ends_at,
    ur.contract_ends_at,
    ur.contract_decision_made,
    ur.delete_after_contract,
    ur.status,
    ur.is_master_admin,
    ur.is_app_user,
    ur.is_campus_active,
    ur.is_groovelab_active,
    ur.is_premium_user,
    ur.teacher_id,
    -- Zero-Leak Ausweisnummer
    (CASE 
        WHEN public.get_current_authenticated_user_id() = ur.id 
             OR public.is_master_admin() 
             OR (public.get_current_user_school_id() = ur.school_id AND public.get_current_user_role() IN ('teacher', 'admin', 'secretary'))
        THEN ur.ausweis_nummer
        ELSE NULL
    END)::character varying(255) AS ausweis_nummer,
    -- Zero-Leak Teacher QR Token: Only visible to self or school admin/secretary
    (CASE 
        WHEN public.get_current_authenticated_user_id() = ur.id 
             OR public.is_master_admin() 
             OR (public.get_current_user_school_id() = ur.school_id AND public.get_current_user_role() IN ('admin', 'secretary'))
        THEN ur.teacher_qr_token
        ELSE NULL
    END)::character varying(255) AS teacher_qr_token,
    ur.is_active,
    ur.max_students,
    ur.nickname,
    NULL::text AS password_hash,
    ur.ausweis_id,
    ur.show_sekretariat,
    ur.show_campus,
    ur.show_groovelab,
    ur.lesson_duration,
    ur.planned_boards,
    ur.required_equipment,
    ur.sick_until,
    ur.phone,
    ur.joker_used,
    ur.is_pin_activated,
    ur.groovelab_räume,
    ur.campus_räume,
    ur.joker_used_at,
    ur.sick_start,
    ur.push_notifications_enabled,
    ur.push_notif_schedule_changes,
    ur.push_notif_homework,
    ur.push_notif_all_features,
    ur.app_usage_mode,
    ur.preferred_room_ids,
    ur.groovelab_instrument,
    ur.student_billing_payment_method,
    ur.activated_at,
    ur.student_billing_cash_paid,
    ur.roles,
    ur.exempt_from_direct_billing,
    ur.group_id,
    ur.sibling_group_id,
    ur.parent_allow_chat,
    ur.parent_allow_timer,
    ur.parent_allow_leaderboard,
    ur.parent_allow_groups,
    ur.parent_allow_proposals,
    ur.parent_allow_absences,
    ur.parent_allow_audio,
    ur.campus_ui_level,
    ur.parent_permissions,
    ur.pin_enforced_for_preview,
    ur.teacher_onboarding_completed,
    ur.teacher_availability,
    ur.is_2fa_enabled,
    NULL::text AS two_factor_secret,
    NULL::text AS parent_pin,
    NULL::text AS personal_pin,
    public.user_has_parent_pin(ur.id) AS has_parent_pin,
    public.user_has_personal_pin(ur.id) AS has_personal_pin,
    ur.failed_pin_attempts,
    ur.pin_locked_until,
    ur.sessions_revoked_at,
    ur.token_version,
    ur.token_signature,
    ur.qr_token_redeemed_at,
    (
        SELECT (public.safe_pgp_sym_decrypt(uep.prefix, public.get_encryption_key()) || '@' || ues.suffix)
        FROM public.user_email_prefixes uep
        JOIN public.user_email_suffixes ues ON uep.user_id = ues.user_id
        WHERE uep.user_id = ur.id
        LIMIT 1
    ) AS email
FROM public.users_raw ur;

-- 2. INSTEAD OF Trigger-Funktion für public.users wiederherstellen & härten
CREATE OR REPLACE FUNCTION public.handle_users_view_dml()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
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
            hashed_parent_pin := encode(digest(NEW.parent_pin, 'sha256'), 'hex');
        END IF;
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
            lesson_duration, planned_boards, required_equipment, sick_until, phone,
            joker_used, is_pin_activated, "groovelab_räume", "campus_räume", joker_used_at,
            sick_start, push_notifications_enabled, push_notif_schedule_changes,
            push_notif_homework, push_notif_all_features,
            app_usage_mode, preferred_room_ids, groovelab_instrument,
            student_billing_payment_method, activated_at, student_billing_cash_paid,
            roles, exempt_from_direct_billing, group_id, sibling_group_id,
            parent_allow_chat, parent_allow_timer, parent_allow_leaderboard,
            parent_allow_groups, parent_allow_proposals, parent_allow_absences,
            parent_allow_audio, campus_ui_level, parent_permissions,
            pin_enforced_for_preview, teacher_onboarding_completed, teacher_availability,
            is_2fa_enabled, parent_pin, personal_pin, failed_pin_attempts, pin_locked_until,
            sessions_revoked_at, token_version, token_signature, qr_token_redeemed_at
        ) VALUES (
            COALESCE(NEW.id, gen_random_uuid()), NEW.school_id, NEW.role, NEW.first_name, NEW.last_name, NEW.avatar_url, NEW.qr_token, NEW.calendar_token, NEW.instrument,
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
            COALESCE(NEW.parent_allow_chat, false), COALESCE(NEW.parent_allow_timer, true), COALESCE(NEW.parent_allow_leaderboard, false),
            COALESCE(NEW.parent_allow_groups, false), COALESCE(NEW.parent_allow_proposals, false), COALESCE(NEW.parent_allow_absences, false),
            COALESCE(NEW.parent_allow_audio, true), COALESCE(NEW.campus_ui_level, 'junior'), COALESCE(NEW.parent_permissions, '{}'::jsonb),
            COALESCE(NEW.pin_enforced_for_preview, false), COALESCE(NEW.teacher_onboarding_completed, false), NEW.teacher_availability,
            COALESCE(NEW.is_2fa_enabled, false), hashed_parent_pin, NEW.personal_pin, COALESCE(NEW.failed_pin_attempts, 0), NEW.pin_locked_until,
            NEW.sessions_revoked_at, COALESCE(NEW.token_version, 1), NEW.token_signature, NEW.qr_token_redeemed_at
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.users_raw SET
            school_id = COALESCE(NEW.school_id, users_raw.school_id),
            role = COALESCE(NEW.role, users_raw.role),
            first_name = COALESCE(NEW.first_name, users_raw.first_name),
            -- 🛡️ Anti-Tampering Guard: Students cannot overwrite last_name
            last_name = CASE 
                WHEN public.get_current_user_role() = 'student' THEN users_raw.last_name 
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
            parent_allow_absences = COALESCE(NEW.parent_allow_absences, users_raw.parent_allow_absences),
            parent_allow_audio = COALESCE(NEW.parent_allow_audio, users_raw.parent_allow_audio),
            campus_ui_level = COALESCE(NEW.campus_ui_level, users_raw.campus_ui_level),
            parent_permissions = COALESCE(NEW.parent_permissions, users_raw.parent_permissions),
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
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_view_dml ON public.users;
CREATE TRIGGER trg_users_view_dml
INSTEAD OF INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.handle_users_view_dml();

-- 3. HARDEN RLS ON student_last_names (Students get 0 rows)
DROP POLICY IF EXISTS "student_last_names_all_policy" ON public.student_last_names;
CREATE POLICY "student_last_names_all_policy" ON public.student_last_names
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR (
        public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        AND EXISTS (
            SELECT 1 FROM public.users_raw u 
            WHERE u.id = student_last_names.student_id 
            AND u.school_id = public.get_current_user_school_id()
        )
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR (
        public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        AND EXISTS (
            SELECT 1 FROM public.users_raw u 
            WHERE u.id = student_last_names.student_id 
            AND u.school_id = public.get_current_user_school_id()
        )
    )
);

-- 4. HARDEN authenticate_by_credential RPC (Stripping last_name for students)
CREATE OR REPLACE FUNCTION public.authenticate_by_credential(
    p_credential text,
    p_school_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
AS $$
DECLARE
    v_clean text := TRIM(p_credential);
    v_clean_upper text := UPPER(TRIM(p_credential));
    v_user record;
    v_school record;
    v_lease_id uuid;
    v_is_uuid boolean;
    v_sanitized_user jsonb;
    v_headers text;
    v_ip text;
    v_ip_hash text;
    v_ip_failures int := 0;
BEGIN
    IF v_clean IS NULL OR v_clean = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Anmeldedaten.');
    END IF;

    -- Extract client IP securely and hash it (GDPR Privacy by Design)
    BEGIN
        v_headers := current_setting('request.headers', true);
        IF v_headers IS NOT NULL AND v_headers <> '' THEN
            v_ip := v_headers::json->>'x-forwarded-for';
            IF v_ip IS NULL OR v_ip = '' THEN
                v_ip := v_headers::json->>'cf-connecting-ip';
            END IF;
            IF v_ip IS NOT NULL AND v_ip <> '' THEN
                v_ip := TRIM(split_part(v_ip, ',', 1));
                v_ip_hash := encode(extensions.digest(v_ip, 'sha256'), 'hex');
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_ip_hash := NULL;
    END;

    -- Check Network Rate Limit (Max 30 failed attempts per IP per 15 minutes)
    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        SELECT COUNT(*) INTO v_ip_failures
        FROM public.qr_login_rate_limits
        WHERE ip_hash = v_ip_hash
          AND success = FALSE
          AND attempt_at > (NOW() - INTERVAL '15 minutes');

        IF v_ip_failures >= 30 THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Sicherheitssperre: Zu viele fehlerhafte Anmeldeversuche aus diesem Netzwerk. Bitte warten Sie 15 Minuten.'
            );
        END IF;
    END IF;

    -- Check for UUID pattern
    v_is_uuid := (v_clean ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

    -- Lookup user in users_raw (Protected by Server Scope)
    IF v_is_uuid THEN
        SELECT * INTO v_user
        FROM public.users_raw
        WHERE (qr_token::text = v_clean OR teacher_qr_token = v_clean OR id::text = v_clean)
          AND is_active = TRUE
          AND (p_school_id IS NULL OR school_id = p_school_id OR is_master_admin = TRUE)
        LIMIT 1;
    ELSE
        SELECT * INTO v_user
        FROM public.users_raw
        WHERE (teacher_qr_token = v_clean 
               OR ausweis_nummer = v_clean 
               OR ausweis_nummer = v_clean_upper
               OR qr_token::text = v_clean)
          AND is_active = TRUE
          AND (p_school_id IS NULL OR school_id = p_school_id OR is_master_admin = TRUE)
        LIMIT 1;
    END IF;

    -- Fallback for School Admin PINs if stored in school secrets
    IF v_user IS NULL AND p_school_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM private_auth.school_secrets 
            WHERE school_id = p_school_id AND admin_pin = v_clean
        ) OR EXISTS (
            SELECT 1 FROM public.schools 
            WHERE id = p_school_id AND admin_pin = v_clean
        ) THEN
            SELECT * INTO v_user
            FROM public.users_raw
            WHERE school_id = p_school_id AND role = 'admin' AND is_active = TRUE
            LIMIT 1;
        END IF;
    END IF;

    -- Fail-Closed: User not found -> Log IP failure attempt
    IF v_user IS NULL THEN
        IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
            BEGIN
                INSERT INTO public.qr_login_rate_limits (ip_hash, attempt_at, success)
                VALUES (v_ip_hash, NOW(), FALSE);
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiger Ausweis-PIN oder QR-Token.');
    END IF;

    -- Check Account-level Lockout Status
    IF v_user.pin_locked_until IS NOT NULL AND v_user.pin_locked_until > NOW() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Sicherheitssperre: Zu viele Fehlversuche. Zugang vorübergehend gesperrt.'
        );
    END IF;

    -- Reset user failed attempts & update last_seen
    UPDATE public.users_raw
    SET failed_pin_attempts = 0, 
        pin_locked_until = NULL, 
        last_seen = NOW()
    WHERE id = v_user.id;

    -- Log successful login in rate limit tracker
    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        BEGIN
            INSERT INTO public.qr_login_rate_limits (ip_hash, attempt_at, success)
            VALUES (v_ip_hash, NOW(), TRUE);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    -- Fetch school information
    SELECT * INTO v_school
    FROM public.schools
    WHERE id = v_user.school_id;

    -- Create verified Session Lease (valid for 30 days)
    v_lease_id := gen_random_uuid();
    INSERT INTO public.session_leases (
        id,
        user_id,
        school_id,
        role,
        device_key,
        created_at,
        last_active_at,
        is_revoked
    ) VALUES (
        v_lease_id,
        v_user.id,
        v_user.school_id,
        v_user.role,
        'credential_login',
        NOW(),
        NOW(),
        FALSE
    );

    -- Build zero-knowledge sanitized profile (last_name = NULL for students)
    v_sanitized_user := jsonb_build_object(
        'id', v_user.id,
        'school_id', v_user.school_id,
        'role', v_user.role,
        'roles', v_user.roles,
        'first_name', v_user.first_name,
        'last_name', CASE WHEN v_user.role = 'student' THEN NULL ELSE v_user.last_name END,
        'nickname', v_user.nickname,
        'avatar_url', v_user.avatar_url,
        'photo_url', v_user.photo_url,
        'instrument', v_user.instrument,
        'groovelab_instrument', v_user.groovelab_instrument,
        'status', v_user.status,
        'is_active', v_user.is_active,
        'is_campus_active', v_user.is_campus_active,
        'is_groovelab_active', v_user.is_groovelab_active,
        'is_master_admin', v_user.is_master_admin,
        'is_app_user', v_user.is_app_user,
        'is_trial', v_user.is_trial,
        'trial_ends_at', v_user.trial_ends_at,
        'contract_ends_at', v_user.contract_ends_at,
        'contract_decision_made', v_user.contract_decision_made,
        'is_pin_activated', v_user.is_pin_activated,
        'app_usage_mode', v_user.app_usage_mode,
        'lesson_duration', v_user.lesson_duration,
        'exempt_from_direct_billing', v_user.exempt_from_direct_billing,
        'show_sekretariat', v_user.show_sekretariat,
        'show_campus', v_user.show_campus,
        'show_groovelab', v_user.show_groovelab,
        'teacher_id', v_user.teacher_id,
        'group_id', v_user.group_id,
        'sibling_group_id', v_user.sibling_group_id,
        'preferred_room_ids', v_user.preferred_room_ids,
        'schools', CASE WHEN v_school.id IS NOT NULL THEN to_jsonb(v_school) ELSE NULL END
    );

    RETURN jsonb_build_object(
        'success', true,
        'lease_token', v_lease_id,
        'user', v_sanitized_user
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.authenticate_by_credential(text, uuid) TO anon, authenticated, service_role;

-- 5. HARDEN authenticate_webauthn_credential RPC (Stripping last_name for students)
CREATE OR REPLACE FUNCTION public.authenticate_webauthn_credential(
    p_credential_id TEXT,
    p_challenge TEXT,
    p_school_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_temp
AS $$
DECLARE
    v_cred_record RECORD;
    v_challenge_record RECORD;
    v_user RECORD;
    v_school RECORD;
    v_lease_id UUID;
    v_sanitized_user JSONB;
BEGIN
    -- 1. Validate inputs
    IF p_credential_id IS NULL OR p_credential_id = '' OR p_challenge IS NULL OR p_challenge = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Authentifizierungs-Parameter.');
    END IF;

    -- 2. Verify challenge exists, is pending, not expired (< 5 mins)
    SELECT * INTO v_challenge_record
    FROM private_auth.webauthn_challenges
    WHERE challenge = p_challenge
      AND status = 'pending'
      AND expires_at > NOW()
    FOR UPDATE;

    IF v_challenge_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sicherheits-Challenge ist abgelaufen oder ungültig.');
    END IF;

    -- Consume challenge immediately (Replay protection)
    UPDATE private_auth.webauthn_challenges
    SET status = 'consumed'
    WHERE id = v_challenge_record.id;

    -- 3. Lookup credential in private_auth.webauthn_credentials
    SELECT * INTO v_cred_record
    FROM private_auth.webauthn_credentials
    WHERE credential_id = p_credential_id
      AND is_active = TRUE;

    IF v_cred_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Passkey / WebAuthn Anmeldedaten nicht gefunden.');
    END IF;

    -- 4. Lookup user in public.users_raw
    SELECT * INTO v_user
    FROM public.users_raw
    WHERE id = v_cred_record.user_id
      AND is_active = TRUE
      AND (p_school_id IS NULL OR school_id = p_school_id OR is_master_admin = TRUE);

    IF v_user IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Benutzerkonto nicht aktiv oder nicht zugeordnet.');
    END IF;

    -- Update credential sign count & last used
    UPDATE private_auth.webauthn_credentials
    SET sign_count = sign_count + 1,
        last_used_at = NOW()
    WHERE id = v_cred_record.id;

    -- Update user last_seen & clear failed attempts
    UPDATE public.users_raw
    SET last_seen = NOW(),
        failed_pin_attempts = 0,
        pin_locked_until = NULL
    WHERE id = v_user.id;

    -- Fetch school information
    SELECT * INTO v_school
    FROM public.schools
    WHERE id = v_user.school_id;

    -- 5. Issue session lease (30-day lease)
    v_lease_id := gen_random_uuid();
    INSERT INTO public.session_leases (
        id,
        user_id,
        school_id,
        role,
        device_key,
        created_at,
        last_active_at,
        is_revoked
    ) VALUES (
        v_lease_id,
        v_user.id,
        v_user.school_id,
        v_user.role,
        'passkey_login',
        COALESCE(v_cred_record.device_name, 'Passkey Device'),
        NOW(),
        NOW(),
        FALSE
    );

    -- 6. Build zero-knowledge sanitized profile (last_name = NULL for students)
    v_sanitized_user := jsonb_build_object(
        'id', v_user.id,
        'school_id', v_user.school_id,
        'role', v_user.role,
        'roles', v_user.roles,
        'first_name', v_user.first_name,
        'last_name', CASE WHEN v_user.role = 'student' THEN NULL ELSE v_user.last_name END,
        'nickname', v_user.nickname,
        'avatar_url', v_user.avatar_url,
        'photo_url', v_user.photo_url,
        'instrument', v_user.instrument,
        'groovelab_instrument', v_user.groovelab_instrument,
        'status', v_user.status,
        'is_active', v_user.is_active,
        'is_campus_active', v_user.is_campus_active,
        'is_groovelab_active', v_user.is_groovelab_active,
        'is_master_admin', v_user.is_master_admin,
        'is_app_user', v_user.is_app_user,
        'is_trial', v_user.is_trial,
        'trial_ends_at', v_user.trial_ends_at,
        'contract_ends_at', v_user.contract_ends_at,
        'contract_decision_made', v_user.contract_decision_made,
        'is_pin_activated', v_user.is_pin_activated,
        'app_usage_mode', v_user.app_usage_mode,
        'lesson_duration', v_user.lesson_duration,
        'exempt_from_direct_billing', v_user.exempt_from_direct_billing,
        'show_sekretariat', v_user.show_sekretariat,
        'show_campus', v_user.show_campus,
        'show_groovelab', v_user.show_groovelab,
        'teacher_id', v_user.teacher_id,
        'group_id', v_user.group_id,
        'sibling_group_id', v_user.sibling_group_id,
        'preferred_room_ids', v_user.preferred_room_ids,
        'schools', CASE WHEN v_school.id IS NOT NULL THEN to_jsonb(v_school) ELSE NULL END
    );

    RETURN jsonb_build_object(
        'success', true,
        'lease_token', v_lease_id,
        'user', v_sanitized_user
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.authenticate_webauthn_credential(TEXT, TEXT, UUID) TO anon, authenticated, service_role;

-- 6. PERMISSIONS & SCHEMA RELOAD NOTIFICATION
GRANT SELECT ON public.users TO authenticated, anon, service_role;
NOTIFY pgrst, 'reload schema';
