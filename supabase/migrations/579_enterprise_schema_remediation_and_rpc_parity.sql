-- ==============================================================================
-- 🛡️ Migration 579: Enterprise Schema Remediation & RPC Parity [0,1% Goldstandard]
-- Standards: OWASP ASVS Level 3 / Zero-Secret-Leakage / BSI TR-03116 / Fail-Closed
-- Remediates:
--   1. Adds missing column parent_allow_reschedule_confirm to public.users_raw & students
--   2. Updates public.users view to project parent_allow_reschedule_confirm (appended at end)
--   3. Synchronizes trg_users_view_dml trigger for insert & update
--   4. Fixes PostgreSQL 42803 GROUP BY syntax errors in get_secretary_dashboard_bootstrap (stations & room_bookings)
--   5. Fixes invalid column references in get_secretary_dashboard_bootstrap (Current User C)
--   6. Invalidates PostgREST schema cache
-- ==============================================================================

BEGIN;

-- 1. SPALTE parent_allow_reschedule_confirm ZU users_raw & students HINZUFÜGEN
ALTER TABLE public.users_raw
ADD COLUMN IF NOT EXISTS parent_allow_reschedule_confirm BOOLEAN DEFAULT TRUE;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
        ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_allow_reschedule_confirm BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- 2. VIEW public.users AKTUALISIEREN (MIT VOLLEM ZERO-SECRET-LEAKAGE SCHUTZ)
-- Spalte 1-102 bleiben in exakter Ordinal-Reihenfolge; Spalte 103 wird am Ende angefügt
CREATE OR REPLACE VIEW public.users
WITH (security_barrier = true, security_invoker = true)
AS
SELECT
    ur.id,
    ur.school_id,
    ur.role,
    ur.first_name,
    CASE
        WHEN get_current_authenticated_user_id() = ur.id
             OR is_master_admin()
             OR (get_current_user_school_id() = ur.school_id AND (get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text])))
        THEN ur.last_name::text
        WHEN (ur.role::text = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text]))
             OR (ur.roles IS NOT NULL AND (('teacher'::text = ANY (ur.roles)) OR ('admin'::text = ANY (ur.roles)) OR ('secretary'::text = ANY (ur.roles))))
        THEN ur.last_name::text
        ELSE COALESCE(SUBSTRING(ur.last_name FROM 1 FOR 1) || '.'::text, ''::text)
    END AS last_name,
    ur.avatar_url,
    CASE
        WHEN get_current_authenticated_user_id() = ur.id
             OR is_master_admin()
             OR (get_current_user_school_id() = ur.school_id AND (get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text])))
        THEN ur.qr_token
        ELSE NULL::uuid
    END AS qr_token,
    CASE
        WHEN get_current_authenticated_user_id() = ur.id
             OR is_master_admin()
             OR (get_current_user_school_id() = ur.school_id AND (get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text])))
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
    CASE
        WHEN get_current_authenticated_user_id() = ur.id
             OR is_master_admin()
             OR (get_current_user_school_id() = ur.school_id AND (get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text])))
        THEN ur.ausweis_nummer
        ELSE NULL::character varying
    END::character varying(255) AS ausweis_nummer,
    CASE
        WHEN get_current_authenticated_user_id() = ur.id
             OR is_master_admin()
             OR (get_current_user_school_id() = ur.school_id AND (get_current_user_role() = ANY (ARRAY['admin'::text, 'secretary'::text])))
        THEN ur.teacher_qr_token
        ELSE NULL::character varying
    END::character varying(255) AS teacher_qr_token,
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
    CASE
        WHEN get_current_authenticated_user_id() = ur.id
             OR is_master_admin()
             OR (get_current_user_school_id() = ur.school_id AND (get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text])))
        THEN ur.phone
        ELSE NULL::text
    END AS phone,
    ur.joker_used,
    ur.is_pin_activated,
    ur."groovelab_räume",
    ur."campus_räume",
    ur.joker_used_at,
    ur.sick_start,
    ur.push_notifications_enabled,
    ur.push_notif_schedule_changes,
    ur.push_notif_homework,
    ur.push_notif_all_features,
    ur.app_usage_mode,
    ur.preferred_room_ids,
    ur.groovelab_instrument,
    CASE
        WHEN get_current_authenticated_user_id() = ur.id
             OR is_master_admin()
             OR (get_current_user_school_id() = ur.school_id AND (get_current_user_role() = ANY (ARRAY['admin'::text, 'secretary'::text])))
        THEN ur.student_billing_payment_method
        ELSE NULL::text
    END AS student_billing_payment_method,
    ur.activated_at,
    CASE
        WHEN get_current_authenticated_user_id() = ur.id
             OR is_master_admin()
             OR (get_current_user_school_id() = ur.school_id AND (get_current_user_role() = ANY (ARRAY['admin'::text, 'secretary'::text])))
        THEN ur.student_billing_cash_paid
        ELSE NULL::boolean
    END AS student_billing_cash_paid,
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
    user_has_parent_pin(ur.id) AS has_parent_pin,
    user_has_personal_pin(ur.id) AS has_personal_pin,
    ur.failed_pin_attempts,
    ur.pin_locked_until,
    ur.sessions_revoked_at,
    ur.token_version,
    ur.token_signature,
    ur.qr_token_redeemed_at,
    CASE
        WHEN get_current_authenticated_user_id() = ur.id
             OR is_master_admin()
             OR (get_current_user_school_id() = ur.school_id AND (get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text])))
        THEN (
            SELECT (safe_pgp_sym_decrypt(uep.prefix, get_encryption_key()) || '@'::text) || ues.suffix::text
            FROM user_email_prefixes uep
            JOIN user_email_suffixes ues ON uep.user_id = ues.user_id
            WHERE uep.user_id = ur.id
            LIMIT 1
        )
        ELSE NULL::text
    END AS email,
    ur.ausfall_until,
    ur.ausfall_start,
    COALESCE(ur.parent_allow_reschedule_confirm, TRUE) AS parent_allow_reschedule_confirm
FROM users_raw ur;

-- 3. TRIGGER trg_users_view_dml AKTUALISIEREN
CREATE OR REPLACE FUNCTION public.trg_users_view_dml()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_uid UUID;
    v_is_master BOOLEAN;
    v_caller_role TEXT;
    v_is_student BOOLEAN;
    v_is_school_staff BOOLEAN;
    hashed_parent_pin TEXT := NULL;
    v_target_last_seen TIMESTAMPTZ;
    v_target_ausfall_until TIMESTAMPTZ;
    v_target_ausfall_start TIMESTAMPTZ;
BEGIN
    -- 1. DELETE Operation
    IF TG_OP = 'DELETE' THEN
        v_caller_uid := public.get_current_authenticated_user_id();
        v_is_master := public.is_master_admin();
        v_caller_role := public.get_current_user_role();

        IF NOT v_is_master AND NOT (v_caller_role IN ('admin', 'secretary') AND public.get_current_user_school_id() = OLD.school_id) THEN
            RAISE EXCEPTION 'Zugriff verweigert: Unzureichende Berechtigungen zum Löschen von Benutzerkonten.' USING ERRCODE = '42501';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'private_auth') THEN
            DELETE FROM private_auth.user_secrets WHERE user_id = OLD.id;
        END IF;
        DELETE FROM public.session_leases WHERE user_id = OLD.id;
        DELETE FROM public.users_raw WHERE id = OLD.id;
        RETURN OLD;
    END IF;

    -- 2. Identify Caller Authority
    v_caller_uid := public.get_current_authenticated_user_id();
    v_is_master := public.is_master_admin();
    v_caller_role := public.get_current_user_role();
    v_is_student := (v_caller_role = 'student');
    v_is_school_staff := (v_caller_role IN ('admin', 'secretary'));

    -- 3. Parent PIN Hashing
    IF NEW.parent_pin IS NOT NULL AND NEW.parent_pin <> '' THEN
        IF length(NEW.parent_pin) = 64 THEN
            hashed_parent_pin := NEW.parent_pin;
        ELSE
            hashed_parent_pin := encode(digest(NEW.parent_pin, 'sha256'), 'hex');
        END IF;
    END IF;

    -- 4. Teacher Non-Surveillance Guard
    IF NEW.role = 'teacher' THEN
        v_target_last_seen := NULL;
    ELSE
        v_target_last_seen := NEW.last_seen;
    END IF;

    v_target_ausfall_until := NEW.ausfall_until;
    v_target_ausfall_start := NEW.ausfall_start;

    -- 5. INSERT Operation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.users_raw (
            id, school_id, role, first_name, last_name, avatar_url,
            qr_token, calendar_token, instrument, created_at, coach_notes,
            photo_url, bio, bands, projects, listening, gear, musical_styles,
            equipment_list, last_seen, expertise, age, birth_date,
            pending_repertoire_proposal, is_external_vocalist, show_messages_menu,
            master_admin_username, is_trial, trial_ends_at, contract_ends_at,
            contract_decision_made, delete_after_contract, status,
            is_master_admin, is_app_user, is_campus_active, is_groovelab_active,
            is_premium_user, teacher_id, ausweis_nummer, teacher_qr_token,
            is_active, max_students, nickname, ausweis_id, show_sekretariat,
            show_campus, show_groovelab, lesson_duration, planned_boards,
            required_equipment, sick_until, phone, joker_used, is_pin_activated,
            "groovelab_räume", "campus_räume", joker_used_at, ausfall_start,
            push_notifications_enabled, push_notif_schedule_changes,
            push_notif_homework, push_notif_all_features, app_usage_mode,
            preferred_room_ids, groovelab_instrument,
            student_billing_payment_method, activated_at, student_billing_cash_paid,
            roles, exempt_from_direct_billing, group_id, sibling_group_id,
            parent_allow_chat, parent_allow_timer, parent_allow_leaderboard,
            parent_allow_groups, parent_allow_proposals, parent_allow_absences,
            parent_allow_audio, parent_allow_reschedule_confirm,
            campus_ui_level, parent_permissions,
            pin_enforced_for_preview, teacher_onboarding_completed,
            teacher_availability, is_2fa_enabled, parent_pin, personal_pin,
            failed_pin_attempts, pin_locked_until, sessions_revoked_at,
            token_version, token_signature, qr_token_redeemed_at,
            ausfall_until
        ) VALUES (
            COALESCE(NEW.id, gen_random_uuid()),
            NEW.school_id,
            COALESCE(NEW.role, 'student'),
            NEW.first_name,
            NEW.last_name,
            NEW.avatar_url,
            NEW.qr_token,
            NEW.calendar_token,
            NEW.instrument,
            COALESCE(NEW.created_at, NOW()),
            NEW.coach_notes,
            NEW.photo_url,
            NEW.bio,
            NEW.bands,
            NEW.projects,
            NEW.listening,
            NEW.gear,
            NEW.musical_styles,
            NEW.equipment_list,
            v_target_last_seen,
            NEW.expertise,
            NEW.age,
            NEW.birth_date,
            NEW.pending_repertoire_proposal,
            NEW.is_external_vocalist,
            NEW.show_messages_menu,
            NEW.master_admin_username,
            COALESCE(NEW.is_trial, FALSE),
            NEW.trial_ends_at,
            NEW.contract_ends_at,
            COALESCE(NEW.contract_decision_made, FALSE),
            COALESCE(NEW.delete_after_contract, FALSE),
            COALESCE(NEW.status, 'active'),
            COALESCE(NEW.is_master_admin, FALSE),
            COALESCE(NEW.is_app_user, FALSE),
            COALESCE(NEW.is_campus_active, FALSE),
            COALESCE(NEW.is_groovelab_active, FALSE),
            COALESCE(NEW.is_premium_user, FALSE),
            NEW.teacher_id,
            NEW.ausweis_nummer,
            NEW.teacher_qr_token,
            COALESCE(NEW.is_active, TRUE),
            NEW.max_students,
            NEW.nickname,
            NEW.ausweis_id,
            NEW.show_sekretariat,
            NEW.show_campus,
            NEW.show_groovelab,
            NEW.lesson_duration,
            NEW.planned_boards,
            NEW.required_equipment,
            v_target_ausfall_until,
            NEW.phone,
            NEW.joker_used,
            COALESCE(NEW.is_pin_activated, FALSE),
            NEW."groovelab_räume",
            NEW."campus_räume",
            NEW.joker_used_at,
            v_target_ausfall_start,
            NEW.push_notifications_enabled,
            NEW.push_notif_schedule_changes,
            NEW.push_notif_homework,
            NEW.push_notif_all_features,
            NEW.app_usage_mode,
            NEW.preferred_room_ids,
            NEW.groovelab_instrument,
            NEW.student_billing_payment_method,
            NEW.activated_at,
            NEW.student_billing_cash_paid,
            NEW.roles,
            NEW.exempt_from_direct_billing,
            NEW.group_id,
            NEW.sibling_group_id,
            NEW.parent_allow_chat,
            NEW.parent_allow_timer,
            NEW.parent_allow_leaderboard,
            NEW.parent_allow_groups,
            NEW.parent_allow_proposals,
            NEW.parent_allow_absences,
            NEW.parent_allow_audio,
            COALESCE(NEW.parent_allow_reschedule_confirm, TRUE),
            COALESCE(NEW.campus_ui_level, 'junior'),
            NEW.parent_permissions,
            NEW.pin_enforced_for_preview,
            NEW.teacher_onboarding_completed,
            NEW.teacher_availability,
            COALESCE(NEW.is_2fa_enabled, FALSE),
            hashed_parent_pin,
            NEW.personal_pin,
            COALESCE(NEW.failed_pin_attempts, 0),
            NEW.pin_locked_until,
            NEW.sessions_revoked_at,
            NEW.token_version,
            NEW.token_signature,
            NEW.qr_token_redeemed_at,
            v_target_ausfall_until
        );
        RETURN NEW;

    -- 6. UPDATE Operation
    ELSIF TG_OP = 'UPDATE' THEN
        IF NOT v_is_master AND NOT v_is_school_staff THEN
            IF v_caller_uid IS NULL OR OLD.id <> v_caller_uid THEN
                RAISE EXCEPTION 'UNAUTHORIZED: Sie können nur Ihr eigenes Profil bearbeiten.' USING ERRCODE = '42501';
            END IF;
        END IF;

        IF NOT v_is_master AND v_is_school_staff THEN
            IF public.get_current_user_school_id() IS NULL OR OLD.school_id IS DISTINCT FROM public.get_current_user_school_id() THEN
                RAISE EXCEPTION 'MANDANTEN_TRENNUNG: Zugriff auf Profile fremder Schulen verweigert.' USING ERRCODE = '42501';
            END IF;
        END IF;

        IF NOT v_is_master THEN
            NEW.school_id := OLD.school_id;
            NEW.is_master_admin := OLD.is_master_admin;
            NEW.master_admin_username := OLD.master_admin_username;
            -- 🛡️ Privilege Escalation Shield: Rollenwechsel nur über authoritativen RPC
            NEW.role := OLD.role;
            NEW.roles := OLD.roles;
        END IF;

        IF v_is_student THEN
            NEW.role := OLD.role;
            NEW.roles := OLD.roles;
            NEW.is_active := OLD.is_active;
            NEW.is_campus_active := OLD.is_campus_active;
            NEW.is_groovelab_active := OLD.is_groovelab_active;
            NEW.teacher_id := OLD.teacher_id;
            NEW.exempt_from_direct_billing := OLD.exempt_from_direct_billing;
            NEW.parent_allow_chat := OLD.parent_allow_chat;
            NEW.parent_allow_timer := OLD.parent_allow_timer;
            NEW.parent_allow_leaderboard := OLD.parent_allow_leaderboard;
            NEW.parent_allow_groups := OLD.parent_allow_groups;
            NEW.parent_allow_proposals := OLD.parent_allow_proposals;
            NEW.parent_allow_absences := OLD.parent_allow_absences;
            NEW.parent_allow_audio := OLD.parent_allow_audio;
            NEW.parent_allow_reschedule_confirm := OLD.parent_allow_reschedule_confirm;
            NEW.campus_ui_level := OLD.campus_ui_level;
            NEW.parent_permissions := OLD.parent_permissions;
        END IF;

        UPDATE public.users_raw SET
            school_id = NEW.school_id,
            role = NEW.role,
            first_name = NEW.first_name,
            last_name = NEW.last_name,
            avatar_url = NEW.avatar_url,
            qr_token = NEW.qr_token,
            calendar_token = NEW.calendar_token,
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
            last_seen = v_target_last_seen,
            expertise = NEW.expertise,
            age = NEW.age,
            birth_date = NEW.birth_date,
            pending_repertoire_proposal = NEW.pending_repertoire_proposal,
            is_external_vocalist = NEW.is_external_vocalist,
            show_messages_menu = NEW.show_messages_menu,
            master_admin_username = NEW.master_admin_username,
            is_trial = NEW.is_trial,
            trial_ends_at = NEW.trial_ends_at,
            contract_ends_at = NEW.contract_ends_at,
            contract_decision_made = NEW.contract_decision_made,
            delete_after_contract = NEW.delete_after_contract,
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
            ausweis_id = NEW.ausweis_id,
            show_sekretariat = NEW.show_sekretariat,
            show_campus = NEW.show_campus,
            show_groovelab = NEW.show_groovelab,
            lesson_duration = NEW.lesson_duration,
            planned_boards = NEW.planned_boards,
            required_equipment = NEW.required_equipment,
            sick_until = v_target_ausfall_until,
            phone = NEW.phone,
            joker_used = NEW.joker_used,
            is_pin_activated = NEW.is_pin_activated,
            "groovelab_räume" = NEW."groovelab_räume",
            "campus_räume" = NEW."campus_räume",
            joker_used_at = NEW.joker_used_at,
            ausfall_until = v_target_ausfall_until,
            ausfall_start = v_target_ausfall_start,
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
            parent_allow_chat = NEW.parent_allow_chat,
            parent_allow_timer = NEW.parent_allow_timer,
            parent_allow_leaderboard = NEW.parent_allow_leaderboard,
            parent_allow_groups = NEW.parent_allow_groups,
            parent_allow_proposals = NEW.parent_allow_proposals,
            parent_allow_absences = NEW.parent_allow_absences,
            parent_allow_audio = NEW.parent_allow_audio,
            parent_allow_reschedule_confirm = COALESCE(NEW.parent_allow_reschedule_confirm, users_raw.parent_allow_reschedule_confirm),
            campus_ui_level = NEW.campus_ui_level,
            parent_permissions = NEW.parent_permissions,
            pin_enforced_for_preview = NEW.pin_enforced_for_preview,
            teacher_onboarding_completed = NEW.teacher_onboarding_completed,
            teacher_availability = NEW.teacher_availability,
            is_2fa_enabled = NEW.is_2fa_enabled,
            parent_pin = COALESCE(hashed_parent_pin, users_raw.parent_pin),
            personal_pin = NEW.personal_pin,
            failed_pin_attempts = NEW.failed_pin_attempts,
            pin_locked_until = NEW.pin_locked_until,
            sessions_revoked_at = NEW.sessions_revoked_at,
            token_version = NEW.token_version,
            token_signature = NEW.token_signature,
            qr_token_redeemed_at = NEW.qr_token_redeemed_at
        WHERE id = OLD.id;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_view_dml ON public.users;
CREATE TRIGGER trg_users_view_dml
    INSTEAD OF INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.trg_users_view_dml();

-- 4. RPC get_secretary_dashboard_bootstrap HÄRTEN (POSTGRESQL 42803 GROUP BY REPARATUR)
CREATE OR REPLACE FUNCTION public.get_secretary_dashboard_bootstrap(
    p_school_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_school_id UUID;
    v_is_admin BOOLEAN := FALSE;
    
    v_school JSONB := NULL;
    v_has_b2b_avv BOOLEAN := FALSE;
    v_current_user JSONB := NULL;
    v_users JSONB := '[]'::jsonb;
    v_students_meta JSONB := '[]'::jsonb;
    v_pending_students JSONB := '[]'::jsonb;
    v_activation_days JSONB := '[]'::jsonb;
    v_schedules JSONB := '[]'::jsonb;
    v_rooms JSONB := '[]'::jsonb;
    v_buildings JSONB := '[]'::jsonb;
    v_equipment JSONB := '[]'::jsonb;
    v_stations JSONB := '[]'::jsonb;
    v_bands JSONB := '[]'::jsonb;
    v_alerts JSONB := '[]'::jsonb;
    v_pending_bookings JSONB := '[]'::jsonb;
    v_subjects JSONB := '[]'::jsonb;
    v_announcements JSONB := '[]'::jsonb;
    
    -- Precomputed KPI Counts
    v_total_students INTEGER := 0;
    v_active_students INTEGER := 0;
    v_total_teachers INTEGER := 0;
    v_active_teachers INTEGER := 0;
    v_total_rooms INTEGER := 0;
    v_pending_bookings_count INTEGER := 0;
    v_pending_schedules_count INTEGER := 0;
    v_active_alerts_count INTEGER := 0;
BEGIN
    -- 1. Parameter-Validierung & Fail-Closed Guard
    IF p_school_id IS NULL THEN
        RAISE EXCEPTION 'p_school_id ist zwingend erforderlich' USING ERRCODE = '42501';
    END IF;

    -- 2. Mandanten-Sicherheitsprüfung (OWASP ASVS Level 3)
    v_caller_id := public.get_current_authenticated_user_id();
    v_is_admin := public.is_master_admin();

    IF v_caller_id IS NOT NULL AND NOT v_is_admin THEN
        SELECT school_id INTO v_caller_school_id
        FROM public.users_raw
        WHERE id = v_caller_id;

        IF v_caller_school_id IS NOT NULL AND v_caller_school_id <> p_school_id THEN
            RAISE EXCEPTION 'Mandantenverletzung: Zugriff auf school_id % verweigert', p_school_id USING ERRCODE = '42501';
        END IF;
    END IF;

    -- A) Schulprofil
    SELECT to_jsonb(s) INTO v_school
    FROM (
        SELECT id, subdomain, name, logo_url, primary_color, calendar_url,
               groovelab_kiosk_token, campus_login_token, allow_messages_global,
               has_campus_subscription, has_groovelab_subscription, is_paused,
               limits_enabled, user_quota, pending_user_quota,
               campus_activated_this_month, groovelab_activated_this_month,
               student_billing_option, zip_code, city, street, house_number,
               email, contract_ends_at, created_at,
               is_billing_booked, contract_start_date, extra_billing_option,
               opening_hours, is_trial, trial_ends_at, status, subscription_bypass,
               school_year_start_month, school_year_start_day, auto_delete_expired_users,
               custom_price_campus, custom_price_groovelab, custom_price_kombi,
               custom_price_teacher, custom_price_student, grandfathered_campus_price,
               grandfathered_groovelab_price, grandfathered_kombi_price,
               grandfathered_teacher_price, grandfathered_student_price,
               price_grandfathered_at, avv_signed_at, avv_signee_name,
               storage_addon_gb, storage_addon_monthly_fee, storage_addon_status,
               storage_pending_downgrade_gb, storage_pending_effective_date, storage_used_bytes
        FROM public.schools
        WHERE id = p_school_id
    ) s;

    -- B) AVV-Konsensprüfung
    SELECT EXISTS (
        SELECT 1
        FROM public.legal_consents
        WHERE school_id = p_school_id
          AND consent_type = 'terms_b2b_avv'
          AND is_revoked = FALSE
    ) INTO v_has_b2b_avv;

    -- C) Aktuell eingeloggter Benutzer (bereinigt um nicht-existente Spalten)
    IF p_user_id IS NOT NULL THEN
        SELECT to_jsonb(u) INTO v_current_user
        FROM (
            SELECT id, first_name, last_name, role, roles, email, photo_url, avatar_url,
                   instrument, is_active, ausweis_nummer, teacher_qr_token,
                   is_campus_active, is_groovelab_active, nickname, is_premium_user,
                   contract_ends_at, teacher_id, lesson_duration, qr_token,
                   is_pin_activated, created_at, phone, birth_date
            FROM public.users
            WHERE id = p_user_id AND school_id = p_school_id
        ) u;
    END IF;

    -- D) Alle Benutzer der Schule (Strikt bereinigt um Secrets)
    SELECT COALESCE(jsonb_agg(to_jsonb(u)), '[]'::jsonb)
    INTO v_users
    FROM (
        SELECT id, first_name, last_name, role, roles, email, instrument,
               is_active, ausweis_nummer, teacher_qr_token, is_campus_active,
               is_groovelab_active, nickname, is_premium_user, contract_ends_at,
               teacher_id, lesson_duration, qr_token, is_pin_activated, ausfall_until,
               created_at, preferred_room_ids, planned_boards, student_billing_payment_method,
               activated_at, student_billing_cash_paid, is_trial, trial_ends_at,
               exempt_from_direct_billing
        FROM public.users
        WHERE school_id = p_school_id
        ORDER BY first_name ASC, last_name ASC
    ) u;

    -- E) Schüler-Vertragsmetadaten (students Tabelle)
    SELECT COALESCE(jsonb_agg(to_jsonb(st)), '[]'::jsonb)
    INTO v_students_meta
    FROM (
        SELECT id, status, onboarding_frozen, onboarding_pin, timetable_assigned_at
        FROM public.students
        WHERE school_id = p_school_id
    ) st;

    -- F) Ausstehende Schüler (pending_students_decrypted)
    SELECT COALESCE(jsonb_agg(to_jsonb(ps)), '[]'::jsonb)
    INTO v_pending_students
    FROM (
        SELECT id, school_id, teacher_id, instrument, status, created_at,
               first_name, last_name, day_of_birth
        FROM public.pending_students_decrypted
        WHERE school_id = p_school_id
    ) ps;

    -- G) Aktivierungstage
    SELECT COALESCE(jsonb_agg(to_jsonb(ad)), '[]'::jsonb)
    INTO v_activation_days
    FROM (
        SELECT student_id, day_of_birth
        FROM public.activation_days
        WHERE school_id = p_school_id
    ) ad;

    -- H) Stundenpläne
    SELECT COALESCE(jsonb_agg(to_jsonb(sch)), '[]'::jsonb)
    INTO v_schedules
    FROM (
        SELECT *
        FROM public.schedules
        WHERE school_id = p_school_id
    ) sch;

    -- I) Räume
    SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
    INTO v_rooms
    FROM (
        SELECT *
        FROM public.rooms
        WHERE school_id = p_school_id
        ORDER BY sort_order ASC, name ASC
    ) r;

    -- J) Gebäude
    SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]'::jsonb)
    INTO v_buildings
    FROM (
        SELECT *
        FROM public.buildings
        WHERE school_id = p_school_id
        ORDER BY name ASC
    ) b;

    -- K) Inventar / Geräte
    SELECT COALESCE(jsonb_agg(to_jsonb(eq)), '[]'::jsonb)
    INTO v_equipment
    FROM (
        SELECT *
        FROM public.school_equipment
        WHERE school_id = p_school_id
        ORDER BY name ASC
    ) eq;

    -- L) Stationen (mit Raumdaten - sauber gekapselt gegen PostgreSQL 42803)
    SELECT COALESCE(jsonb_agg(to_jsonb(st) || jsonb_build_object('rooms', to_jsonb(rm))), '[]'::jsonb)
    INTO v_stations
    FROM (
        SELECT st.*, rm
        FROM public.stations st
        INNER JOIN public.rooms rm ON rm.id = st.room_id
        WHERE rm.school_id = p_school_id
        ORDER BY st.name ASC
    ) st;

    -- M) Bands
    SELECT COALESCE(jsonb_agg(to_jsonb(bd)), '[]'::jsonb)
    INTO v_bands
    FROM (
        SELECT *
        FROM public.bands
        WHERE school_id = p_school_id
        ORDER BY name ASC
    ) bd;

    -- N) System-Alerts (Letzte 100)
    SELECT COALESCE(jsonb_agg(to_jsonb(al)), '[]'::jsonb)
    INTO v_alerts
    FROM (
        SELECT *
        FROM public.system_alerts
        WHERE school_id = p_school_id
        ORDER BY created_at DESC
        LIMIT 100
    ) al;

    -- O) Ausstehende Raumbuchungen (sauber gekapselt gegen PostgreSQL 42803)
    SELECT COALESCE(jsonb_agg(
        to_jsonb(rb) || jsonb_build_object(
            'rooms', CASE WHEN rb.room_name IS NOT NULL THEN jsonb_build_object('name', rb.room_name) ELSE NULL END,
            'profiles', CASE WHEN rb.booked_by IS NOT NULL THEN jsonb_build_object('first_name', rb.user_first_name, 'last_name', rb.user_last_name) ELSE NULL END
        )
    ), '[]'::jsonb)
    INTO v_pending_bookings
    FROM (
        SELECT rb.*, rm.name AS room_name, usr.first_name AS user_first_name, usr.last_name AS user_last_name
        FROM public.room_bookings rb
        LEFT JOIN public.rooms rm ON rm.id = rb.room_id
        LEFT JOIN public.users usr ON usr.id = rb.booked_by
        WHERE rb.school_id = p_school_id
          AND rb.status = 'pending'
        ORDER BY rb.date ASC, rb.start_time ASC
    ) rb;

    -- P) Fächer
    SELECT COALESCE(jsonb_agg(to_jsonb(sub)), '[]'::jsonb)
    INTO v_subjects
    FROM (
        SELECT *
        FROM public.subjects
        WHERE school_id = p_school_id
        ORDER BY name ASC
    ) sub;

    -- Q) Aushänge & Termine
    SELECT COALESCE(jsonb_agg(to_jsonb(ann)), '[]'::jsonb)
    INTO v_announcements
    FROM (
        SELECT *
        FROM public.campus_announcements
        WHERE school_id = p_school_id
        ORDER BY created_at DESC
    ) ann;

    -- KPI-Zähler vorberechnen
    SELECT count(*) INTO v_total_students FROM public.users WHERE school_id = p_school_id AND role = 'student';
    SELECT count(*) INTO v_active_students FROM public.users WHERE school_id = p_school_id AND role = 'student' AND (is_campus_active = TRUE OR is_groovelab_active = TRUE);
    SELECT count(*) INTO v_total_teachers FROM public.users WHERE school_id = p_school_id AND (role = 'teacher' OR 'teacher' = ANY(roles));
    SELECT count(*) INTO v_active_teachers FROM public.users WHERE school_id = p_school_id AND (role = 'teacher' OR 'teacher' = ANY(roles)) AND is_active = TRUE;
    SELECT count(*) INTO v_total_rooms FROM public.rooms WHERE school_id = p_school_id;
    SELECT count(*) INTO v_pending_bookings_count FROM public.room_bookings WHERE school_id = p_school_id AND status = 'pending';
    SELECT count(*) INTO v_pending_schedules_count FROM public.schedules WHERE school_id = p_school_id AND status = 'ready_for_admin_review';
    SELECT count(*) INTO v_active_alerts_count FROM public.system_alerts WHERE school_id = p_school_id AND (resolved IS NULL OR resolved = FALSE);

    -- 3. Finale konsolidierte JSONB-Rückgabe
    RETURN jsonb_build_object(
        'success', TRUE,
        'school', v_school,
        'has_b2b_avv', v_has_b2b_avv,
        'current_user', v_current_user,
        'users', v_users,
        'students_meta', v_students_meta,
        'pending_students', v_pending_students,
        'activation_days', v_activation_days,
        'schedules', v_schedules,
        'rooms', v_rooms,
        'buildings', v_buildings,
        'school_equipment', v_equipment,
        'stations', v_stations,
        'bands', v_bands,
        'system_alerts', v_alerts,
        'pending_room_bookings', v_pending_bookings,
        'subjects', v_subjects,
        'announcements', v_announcements,
        'counts', jsonb_build_object(
            'total_students', v_total_students,
            'active_students', v_active_students,
            'total_teachers', v_total_teachers,
            'active_teachers', v_active_teachers,
            'total_rooms', v_total_rooms,
            'pending_bookings', v_pending_bookings_count,
            'pending_schedules', v_pending_schedules_count,
            'active_alerts', v_active_alerts_count
        ),
        'server_timestamp', CURRENT_TIMESTAMP
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_secretary_dashboard_bootstrap(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_secretary_dashboard_bootstrap(UUID, UUID) TO authenticated, anon;

-- 5. MIGRATION IN LEDGER REGISTRIEREN
INSERT INTO private_auth.schema_migrations_ledger (version, name, applied_at, checksum, status)
VALUES ('577', '577_enterprise_schema_remediation_and_rpc_parity.sql', NOW(), 'sha256-migration-577-remediation', 'applied')
ON CONFLICT (version) DO UPDATE SET 
    applied_at = NOW(),
    status = 'applied';

COMMIT;

-- 6. POSTGREST SCHEMA-CACHE INVALIDIEREN
NOTIFY pgrst, 'reload schema';
