-- ==============================================================================
-- Migration 356: Revisionssichere Elterneinstellungen & Parent Permissions
-- Ergänzt die fehlenden Spalten in users_raw, stellt die public.users View & 
-- den trg_users_view_dml Trigger wieder her und installiert die GoBD-konforme
-- autoritative RPC save_parent_controls mit revisionssicherem Audit-Logging.
-- ==============================================================================

-- 1. Fehlende Spalten auf users_raw, students und pending_students anlegen
ALTER TABLE public.users_raw ADD COLUMN IF NOT EXISTS campus_ui_level TEXT DEFAULT 'junior' CHECK (campus_ui_level IN ('junior', 'teen', 'pro'));
ALTER TABLE public.users_raw ADD COLUMN IF NOT EXISTS parent_allow_absences BOOLEAN DEFAULT false;
ALTER TABLE public.users_raw ADD COLUMN IF NOT EXISTS parent_allow_audio BOOLEAN DEFAULT true;
ALTER TABLE public.users_raw ADD COLUMN IF NOT EXISTS parent_permissions JSONB DEFAULT '{}'::jsonb;

-- Bestehende NULL-Werte neutralisieren
UPDATE public.users_raw SET campus_ui_level = 'junior' WHERE campus_ui_level IS NULL;
UPDATE public.users_raw SET parent_allow_absences = false WHERE parent_allow_absences IS NULL;
UPDATE public.users_raw SET parent_allow_audio = true WHERE parent_allow_audio IS NULL;
UPDATE public.users_raw SET parent_permissions = '{}'::jsonb WHERE parent_permissions IS NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students') THEN
        ALTER TABLE public.students ADD COLUMN IF NOT EXISTS campus_ui_level TEXT DEFAULT 'junior';
        ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_allow_absences BOOLEAN DEFAULT false;
        ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_allow_audio BOOLEAN DEFAULT true;
        ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_permissions JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pending_students') THEN
        ALTER TABLE public.pending_students ADD COLUMN IF NOT EXISTS campus_ui_level TEXT DEFAULT 'junior';
        ALTER TABLE public.pending_students ADD COLUMN IF NOT EXISTS parent_allow_absences BOOLEAN DEFAULT false;
        ALTER TABLE public.pending_students ADD COLUMN IF NOT EXISTS parent_allow_audio BOOLEAN DEFAULT true;
        ALTER TABLE public.pending_students ADD COLUMN IF NOT EXISTS parent_permissions JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. Hilfsfunktionen für PIN-Prüfung (Zero-Secret-Leakage) sicherstellen
CREATE OR REPLACE FUNCTION public.user_has_parent_pin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, private_auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM private_auth.user_secrets us 
    WHERE us.user_id = p_user_id 
      AND us.argon2_parent_pin_hash IS NOT NULL 
      AND us.argon2_parent_pin_hash <> ''
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_personal_pin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, private_auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM private_auth.user_secrets us 
    WHERE us.user_id = p_user_id 
      AND us.argon2_personal_pin_hash IS NOT NULL 
      AND us.argon2_personal_pin_hash <> ''
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_parent_pin(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_personal_pin(UUID) TO anon, authenticated, service_role;

-- 3. public.users View sauber droppen und mit allen Feldern inklusive parent_permissions neu erstellen
DROP TRIGGER IF EXISTS trg_users_view_dml ON public.users;
DROP VIEW IF EXISTS public.users CASCADE;

CREATE OR REPLACE VIEW public.users WITH (security_invoker = true) AS
SELECT 
    ur.id,
    ur.school_id,
    ur.role,
    ur.first_name,
    CASE 
        WHEN public.get_current_authenticated_user_id() = ur.id 
             OR public.is_master_admin() 
             OR (public.get_current_user_school_id() = ur.school_id AND public.get_current_user_role() IN ('teacher', 'admin', 'secretary'))
        THEN ur.last_name::text
        ELSE COALESCE(SUBSTRING(ur.last_name FROM 1 FOR 1) || '.', '')
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

-- 4. INSTEAD OF Trigger-Funktion für public.users wiederherstellen & härten
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
            parent_allow_groups, parent_allow_proposals, parent_allow_absences,
            parent_allow_audio, campus_ui_level, parent_permissions,
            pin_enforced_for_preview, teacher_onboarding_completed, teacher_availability,
            is_2fa_enabled, parent_pin, personal_pin, failed_pin_attempts, pin_locked_until,
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

CREATE TRIGGER trg_users_view_dml
INSTEAD OF INSERT OR DELETE OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.handle_users_view_dml();

-- 5. Autoritative RPC: save_parent_controls mit revisionssicherem GoBD-Audit-Trail
CREATE OR REPLACE FUNCTION public.save_parent_controls(
    p_student_id UUID,
    p_settings JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user RECORD;
    v_ui_level TEXT;
    v_allow_absences BOOLEAN;
    v_allow_chat BOOLEAN;
    v_allow_timer BOOLEAN;
    v_allow_leaderboard BOOLEAN;
    v_allow_groups BOOLEAN;
    v_allow_proposals BOOLEAN;
    v_allow_audio BOOLEAN;
    v_parent_permissions JSONB;
    v_old_settings JSONB;
    v_new_settings JSONB;
BEGIN
    -- 1. Snapshot des Vorzustands für revisionssicheren Audit-Trail
    SELECT * INTO v_user FROM public.users_raw WHERE id = p_student_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student not found: %', p_student_id USING ERRCODE = 'P0002';
    END IF;

    v_old_settings := jsonb_build_object(
        'campus_ui_level', v_user.campus_ui_level,
        'parent_allow_absences', v_user.parent_allow_absences,
        'parent_allow_chat', v_user.parent_allow_chat,
        'parent_allow_timer', v_user.parent_allow_timer,
        'parent_allow_leaderboard', v_user.parent_allow_leaderboard,
        'parent_allow_groups', v_user.parent_allow_groups,
        'parent_allow_proposals', v_user.parent_allow_proposals,
        'parent_allow_audio', v_user.parent_allow_audio,
        'parent_permissions', v_user.parent_permissions
    );

    -- 2. Selektive Extraktion & Validierung der Elterneinstellungen
    IF p_settings ? 'campus_ui_level' THEN
        v_ui_level := p_settings->>'campus_ui_level';
        IF v_ui_level NOT IN ('junior', 'teen', 'pro') THEN
            v_ui_level := 'junior';
        END IF;
    ELSE
        v_ui_level := COALESCE(v_user.campus_ui_level, 'junior');
    END IF;

    -- BGB/ABGB/ZGB Schutz: Junior (unter 11 J.) darf keine Stunden stornieren
    IF v_ui_level = 'junior' THEN
        v_allow_absences := false;
    ELSIF p_settings ? 'parent_allow_absences' THEN
        v_allow_absences := (p_settings->>'parent_allow_absences')::BOOLEAN;
    ELSE
        v_allow_absences := COALESCE(v_user.parent_allow_absences, false);
    END IF;

    IF p_settings ? 'parent_allow_chat' THEN
        v_allow_chat := (p_settings->>'parent_allow_chat')::BOOLEAN;
    ELSE
        v_allow_chat := COALESCE(v_user.parent_allow_chat, false);
    END IF;

    IF p_settings ? 'parent_allow_timer' THEN
        v_allow_timer := (p_settings->>'parent_allow_timer')::BOOLEAN;
    ELSE
        v_allow_timer := COALESCE(v_user.parent_allow_timer, true);
    END IF;

    IF p_settings ? 'parent_allow_leaderboard' THEN
        v_allow_leaderboard := (p_settings->>'parent_allow_leaderboard')::BOOLEAN;
    ELSE
        v_allow_leaderboard := COALESCE(v_user.parent_allow_leaderboard, false);
    END IF;

    IF p_settings ? 'parent_allow_groups' THEN
        v_allow_groups := (p_settings->>'parent_allow_groups')::BOOLEAN;
    ELSE
        v_allow_groups := COALESCE(v_user.parent_allow_groups, false);
    END IF;

    IF p_settings ? 'parent_allow_proposals' THEN
        v_allow_proposals := (p_settings->>'parent_allow_proposals')::BOOLEAN;
    ELSE
        v_allow_proposals := COALESCE(v_user.parent_allow_proposals, false);
    END IF;

    IF p_settings ? 'parent_allow_audio' THEN
        v_allow_audio := (p_settings->>'parent_allow_audio')::BOOLEAN;
    ELSE
        v_allow_audio := COALESCE(v_user.parent_allow_audio, true);
    END IF;

    IF p_settings ? 'parent_permissions' THEN
        v_parent_permissions := COALESCE(v_user.parent_permissions, '{}'::jsonb) || (p_settings->'parent_permissions');
    ELSE
        v_parent_permissions := COALESCE(v_user.parent_permissions, '{}'::jsonb);
    END IF;

    -- Spezifischer Audio-Schalter im JSONB
    IF p_settings ? 'parent_allow_audio' THEN
        v_parent_permissions := v_parent_permissions || jsonb_build_object('parent_allow_audio', (p_settings->>'parent_allow_audio')::BOOLEAN);
    END IF;

    -- 3. Atomares Update in users_raw
    UPDATE public.users_raw
    SET
        campus_ui_level = COALESCE(v_ui_level, 'junior'),
        parent_allow_absences = COALESCE(v_allow_absences, false),
        parent_allow_chat = COALESCE(v_allow_chat, false),
        parent_allow_timer = COALESCE(v_allow_timer, true),
        parent_allow_leaderboard = COALESCE(v_allow_leaderboard, false),
        parent_allow_groups = COALESCE(v_allow_groups, false),
        parent_allow_proposals = COALESCE(v_allow_proposals, false),
        parent_allow_audio = COALESCE(v_allow_audio, true),
        parent_permissions = v_parent_permissions
    WHERE id = p_student_id;

    -- 4. Spiegelung in students & pending_students (falls Tabellen vorhanden)
    BEGIN
        UPDATE public.students
        SET
            campus_ui_level = COALESCE(v_ui_level, 'junior'),
            parent_allow_absences = COALESCE(v_allow_absences, false),
            parent_allow_chat = COALESCE(v_allow_chat, false),
            parent_allow_timer = COALESCE(v_allow_timer, true),
            parent_allow_leaderboard = COALESCE(v_allow_leaderboard, false),
            parent_allow_groups = COALESCE(v_allow_groups, false),
            parent_allow_proposals = COALESCE(v_allow_proposals, false),
            parent_allow_audio = COALESCE(v_allow_audio, true),
            parent_permissions = v_parent_permissions
        WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        UPDATE public.pending_students
        SET
            campus_ui_level = COALESCE(v_ui_level, 'junior'),
            parent_allow_absences = COALESCE(v_allow_absences, false),
            parent_allow_chat = COALESCE(v_allow_chat, false),
            parent_allow_timer = COALESCE(v_allow_timer, true),
            parent_allow_leaderboard = COALESCE(v_allow_leaderboard, false),
            parent_allow_groups = COALESCE(v_allow_groups, false),
            parent_allow_proposals = COALESCE(v_allow_proposals, false),
            parent_allow_audio = COALESCE(v_allow_audio, true),
            parent_permissions = v_parent_permissions
        WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- 5. Neuer Zustand
    v_new_settings := jsonb_build_object(
        'campus_ui_level', v_ui_level,
        'parent_allow_absences', v_allow_absences,
        'parent_allow_chat', v_allow_chat,
        'parent_allow_timer', v_allow_timer,
        'parent_allow_leaderboard', v_allow_leaderboard,
        'parent_allow_groups', v_allow_groups,
        'parent_allow_proposals', v_allow_proposals,
        'parent_allow_audio', v_allow_audio,
        'parent_permissions', v_parent_permissions
    );

    -- 6. Revisionssicherer Eintrag in public.audit_logs
    BEGIN
        INSERT INTO public.audit_logs (
            table_name,
            record_id,
            action,
            old_data,
            new_data,
            changed_by,
            school_id,
            created_at
        ) VALUES (
            'users_raw',
            p_student_id,
            'UPDATE',
            v_old_settings,
            v_new_settings,
            p_student_id,
            v_user.school_id,
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'synced_at', NOW(),
        'settings', v_new_settings
    );
END;
$$;

-- 6. Berechtigungen vergeben
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.save_parent_controls(UUID, JSONB) TO authenticated, anon, service_role;

-- 7. PostgREST Schema-Cache aktualisieren
NOTIFY pgrst, 'reload schema';
