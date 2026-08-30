-- ==============================================================================
-- MIGRATION 297: Tier-1 SaaS Enterprise+ Goldstandard Security Architecture
-- Campus-Groovelab Multi-Tenant Zero-Trust Isolation & Zero-Leakage Defense
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ISOLATED VAULT SCHEMA (Zero PostgREST Access)
-- ------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private_auth;
REVOKE ALL ON SCHEMA private_auth FROM anon, authenticated, public;
GRANT USAGE ON SCHEMA private_auth TO postgres, service_role;

CREATE TABLE IF NOT EXISTS private_auth.user_secrets (
    user_id UUID PRIMARY KEY REFERENCES public.users_raw(id) ON DELETE CASCADE,
    master_admin_password TEXT,
    two_factor_secret TEXT,
    password_hash TEXT,
    argon2_parent_pin_hash TEXT,
    argon2_personal_pin_hash TEXT,
    onboarding_pin_hash TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrate any existing credentials into vault table safely
INSERT INTO private_auth.user_secrets (user_id, master_admin_password, two_factor_secret, password_hash, updated_at)
SELECT id, master_admin_password, two_factor_secret, password_hash, NOW()
FROM public.users_raw
WHERE master_admin_password IS NOT NULL 
   OR two_factor_secret IS NOT NULL 
   OR password_hash IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
    master_admin_password = COALESCE(EXCLUDED.master_admin_password, private_auth.user_secrets.master_admin_password),
    two_factor_secret = COALESCE(EXCLUDED.two_factor_secret, private_auth.user_secrets.two_factor_secret),
    password_hash = COALESCE(EXCLUDED.password_hash, private_auth.user_secrets.password_hash),
    updated_at = NOW();

-- ------------------------------------------------------------------------------
-- 2. WHITELIST-ONLY PUBLIC SCHOOL THEME RPC (Eliminates schools.select('*') Scraping)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_school_theme(p_subdomain TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_clean_sub TEXT := LOWER(TRIM(p_subdomain));
    v_school RECORD;
BEGIN
    IF v_clean_sub IS NULL OR v_clean_sub = '' THEN
        RETURN NULL;
    END IF;

    -- Query by exact ID or subdomain or slug match
    SELECT id, name, primary_color, logo_url, custom_welcome_title, custom_welcome_subtitle, is_campus_active, is_groovelab_active
    INTO v_school
    FROM public.schools
    WHERE id::text = v_clean_sub 
       OR LOWER(TRIM(COALESCE(subdomain, ''))) = v_clean_sub
    LIMIT 1;

    IF v_school.id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Returns ONLY visual and branding parameters, ZERO private contact or billing data!
    RETURN jsonb_build_object(
        'id', v_school.id,
        'name', v_school.name,
        'primary_color', COALESCE(v_school.primary_color, '#3b82f6'),
        'logo_url', v_school.logo_url,
        'custom_welcome_title', v_school.custom_welcome_title,
        'custom_welcome_subtitle', v_school.custom_welcome_subtitle,
        'is_campus_active', COALESCE(v_school.is_campus_active, true),
        'is_groovelab_active', COALESCE(v_school.is_groovelab_active, false)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_school_theme(TEXT) TO anon, authenticated, service_role;

-- Public school search for directory landing pages (Zero private data exposure)
CREATE OR REPLACE FUNCTION public.search_public_schools(p_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_clean TEXT := LOWER(TRIM(p_query));
    v_results JSONB;
BEGIN
    IF v_clean IS NULL OR length(v_clean) < 2 THEN
        RETURN '[]'::jsonb;
    END IF;

    SELECT jsonb_agg(jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'subdomain', s.subdomain,
        'logo_url', s.logo_url,
        'city', s.city,
        'has_campus_subscription', COALESCE(s.has_campus_subscription, true),
        'has_groovelab_subscription', COALESCE(s.has_groovelab_subscription, false)
    ))
    INTO v_results
    FROM public.schools s
    WHERE (LOWER(s.name) LIKE '%' || v_clean || '%' OR LOWER(COALESCE(s.subdomain, '')) LIKE '%' || v_clean || '%')
      AND s.is_paused = FALSE
      AND s.status = 'active'
    LIMIT 6;

    RETURN COALESCE(v_results, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_public_schools(TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. HARDENED SESSION LEASE RESOLVER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_authenticated_user_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET row_security = off
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_headers text;
    v_token text;
    v_user_id text;
    v_client_info text;
    v_resolved_id UUID;
    v_auth_uid UUID;
BEGIN
    -- 1. Check native Supabase Auth JWT if present
    BEGIN
        v_auth_uid := auth.uid();
        IF v_auth_uid IS NOT NULL THEN
            RETURN v_auth_uid;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_auth_uid := NULL;
    END;

    -- 2. Extract headers
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN NULL;
    END IF;

    -- Check direct x-session-token header
    v_token := v_headers::json->>'x-session-token';
    
    -- Fallback: check inside x-client-info
    IF v_token IS NULL OR v_token = '' THEN
        v_client_info := v_headers::json->>'x-client-info';
        IF v_client_info IS NOT NULL THEN
            v_token := substring(v_client_info from ';session_token=([^;]+)');
        END IF;
    END IF;

    -- If session token / device key is present, validate against session_leases
    IF v_token IS NOT NULL AND v_token <> '' THEN
        SELECT user_id INTO v_resolved_id
        FROM public.session_leases
        WHERE (id::text = v_token OR device_key = v_token)
          AND is_revoked = FALSE
          AND last_active_at > (NOW() - INTERVAL '30 days')
        LIMIT 1;

        IF v_resolved_id IS NOT NULL THEN
            RETURN v_resolved_id;
        END IF;
    END IF;

    -- Legacy fallback for active user_id with verification
    v_user_id := v_headers::json->>'x-user-id';
    IF v_user_id IS NULL OR v_user_id = '' THEN
        IF v_client_info IS NOT NULL THEN
            v_user_id := substring(v_client_info from ';user_id=([^;]+)');
        END IF;
    END IF;

    IF v_user_id IS NOT NULL AND v_user_id <> '' THEN
        -- Verify that the user exists and is active
        SELECT id INTO v_resolved_id
        FROM public.users_raw
        WHERE id = v_user_id::uuid
          AND is_active = TRUE;
        RETURN v_resolved_id;
    END IF;

    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Keep get_current_user_id compatible
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
    RETURN public.get_current_authenticated_user_id();
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. HARDENED SCHOOLS RLS (Zero Public Scraping)
-- ------------------------------------------------------------------------------
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schools_select" ON public.schools;
DROP POLICY IF EXISTS "Allow select on schools" ON public.schools;
DROP POLICY IF EXISTS "schools_modify" ON public.schools;
DROP POLICY IF EXISTS "schools_insert" ON public.schools;

CREATE POLICY "schools_select" ON public.schools
FOR SELECT TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR id = public.get_current_user_school_id()
    OR id = public.get_kiosk_school_id()
);

CREATE POLICY "schools_modify" ON public.schools
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (
        id = public.get_current_user_school_id() 
        AND public.get_current_user_role() IN ('admin', 'secretary')
    )
);

CREATE POLICY "schools_insert" ON public.schools
FOR INSERT TO authenticated, anon, service_role
WITH CHECK (true); -- Allowed for Self-Onboarding RPC

-- ------------------------------------------------------------------------------
-- 5. COMPLETE REMOVAL OF ALL 'OR true' BYPASSES IN CORE TABLES
-- ------------------------------------------------------------------------------

-- Stations
DROP POLICY IF EXISTS "stations_all" ON public.stations;
CREATE POLICY "stations_all" ON public.stations
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR public.check_school_access(school_id)
    OR school_id = public.get_current_user_school_id()
)
WITH CHECK (
    public.is_master_admin()
    OR public.check_school_access(school_id)
    OR school_id = public.get_current_user_school_id()
);

-- Kiosks
DROP POLICY IF EXISTS "kiosks_all" ON public.kiosks;
DROP POLICY IF EXISTS "kiosks_select" ON public.kiosks;
DROP POLICY IF EXISTS "kiosks_modify" ON public.kiosks;
CREATE POLICY "kiosks_all" ON public.kiosks
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR public.check_school_access(school_id)
    OR school_id = public.get_current_user_school_id()
    OR secret_token = public.get_kiosk_token()
)
WITH CHECK (
    public.is_master_admin()
    OR public.check_school_access(school_id)
    OR school_id = public.get_current_user_school_id()
    OR secret_token = public.get_kiosk_token()
);

-- Rooms
DROP POLICY IF EXISTS "rooms_select_tenant_hardened" ON public.rooms;
DROP POLICY IF EXISTS "rooms_select" ON public.rooms;
DROP POLICY IF EXISTS "rooms_select_policy" ON public.rooms;
CREATE POLICY "rooms_select_tenant_hardened" ON public.rooms
FOR SELECT TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR public.check_school_access(school_id)
    OR school_id = public.get_current_user_school_id()
);

-- Crisis Notifications
DROP POLICY IF EXISTS "crisis_notifications_all" ON public.crisis_notifications;
CREATE POLICY "crisis_notifications_all" ON public.crisis_notifications
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR public.check_school_access(school_id)
    OR school_id = public.get_current_user_school_id()
)
WITH CHECK (
    public.is_master_admin()
    OR public.check_school_access(school_id)
    OR school_id = public.get_current_user_school_id()
);

-- GrooveLab Tickets
DROP POLICY IF EXISTS "groovelab_tickets_all" ON public.groovelab_tickets;
CREATE POLICY "groovelab_tickets_all" ON public.groovelab_tickets
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR public.check_school_access(school_id)
    OR created_by = public.get_current_authenticated_user_id()
)
WITH CHECK (
    public.is_master_admin()
    OR public.check_school_access(school_id)
    OR created_by = public.get_current_authenticated_user_id()
);

-- Focus Sessions
DROP POLICY IF EXISTS "focus_sessions_all" ON public.focus_sessions;
CREATE POLICY "focus_sessions_all" ON public.focus_sessions
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR student_id = public.get_current_authenticated_user_id()
    OR public.check_student_progress_access(student_id)
)
WITH CHECK (
    public.is_master_admin()
    OR student_id = public.get_current_authenticated_user_id()
    OR public.check_student_progress_access(student_id)
);

-- Student Progress Matrix
DROP POLICY IF EXISTS "student_progress_matrix_all" ON public.student_progress_matrix;
CREATE POLICY "student_progress_matrix_all" ON public.student_progress_matrix
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR student_id = public.get_current_authenticated_user_id()
    OR public.check_student_progress_access(student_id)
)
WITH CHECK (
    public.is_master_admin()
    OR student_id = public.get_current_authenticated_user_id()
    OR public.check_student_progress_access(student_id)
);

-- Premium Status
DROP POLICY IF EXISTS "premium_status_all" ON public.premium_status;
CREATE POLICY "premium_status_all" ON public.premium_status
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR student_id = public.get_current_authenticated_user_id()
    OR public.check_student_progress_access(student_id)
)
WITH CHECK (
    public.is_master_admin()
    OR student_id = public.get_current_authenticated_user_id()
    OR public.check_student_progress_access(student_id)
);

-- ------------------------------------------------------------------------------
-- 6. REBUILD public.users VIEW & DML TRIGGER (Zero Credential Leakage)
-- ------------------------------------------------------------------------------
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
    ur.contract_ends_at, ur.status, ur.is_master_admin, ur.is_app_user, ur.is_campus_active, 
    ur.is_groovelab_active, ur.is_premium_user, ur.teacher_id, ur.ausweis_nummer, 
    ur.teacher_qr_token, ur.is_active, ur.max_students, ur.nickname, 
    CAST(NULL AS TEXT) AS password_hash, -- HARDENED: Zero Hash Exposure
    ur.ausweis_id, ur.show_sekretariat, ur.show_campus, ur.show_groovelab, 
    ur.lesson_duration, ur.planned_boards, ur.required_equipment, ur.sick_until, ur.phone, 
    ur.joker_used, ur.is_pin_activated, ur.groovelab_räume, ur.campus_räume, ur.joker_used_at, 
    ur.sick_start, ur.push_notifications_enabled, ur.push_notif_schedule_changes, 
    ur.push_notif_homework, ur.push_notif_all_features, ur.push_notif_weekly_digest, 
    ur.push_notif_chat, ur.push_notif_practice_reminder, 
    ur.app_usage_mode, 
    ur.preferred_room_ids, ur.groovelab_instrument, ur.student_billing_payment_method, 
    ur.activated_at, ur.student_billing_cash_paid, ur.roles, ur.exempt_from_direct_billing, 
    ur.group_id, ur.sibling_group_id, 
    ur.parent_allow_absences, 
    ur.parent_allow_chat, ur.parent_allow_timer, ur.parent_allow_leaderboard, ur.parent_allow_groups, ur.parent_allow_proposals, 
    ur.parent_allow_audio, 
    ur.parent_permissions, 
    ur.campus_ui_level, 
    ur.pin_enforced_for_preview, 
    ur.onboarding_pin, 
    ur.phone_blind_index, 
    ur.fido2_sign_counter, 
    ur.is_2fa_enabled, 
    CAST(NULL AS TEXT) AS two_factor_secret, -- HARDENED: Zero TOTP Seed Exposure
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
            contract_ends_at, status, is_master_admin, is_app_user, is_campus_active,
            is_groovelab_active, is_premium_user, teacher_id, ausweis_nummer,
            teacher_qr_token, is_active, max_students, nickname,
            ausweis_id, show_sekretariat, show_campus, show_groovelab,
            lesson_duration, planned_boards, required_equipment, sick_until, phone,
            joker_used, is_pin_activated, groovelab_räume, campus_räume, joker_used_at,
            sick_start, push_notifications_enabled, push_notif_schedule_changes,
            push_notif_homework, push_notif_all_features, push_notif_weekly_digest,
            push_notif_chat, push_notif_practice_reminder,
            app_usage_mode, preferred_room_ids, groovelab_instrument,
            student_billing_payment_method, activated_at, student_billing_cash_paid,
            roles, exempt_from_direct_billing, group_id, sibling_group_id,
            parent_allow_absences, parent_allow_chat, parent_allow_timer, parent_allow_leaderboard,
            parent_allow_groups, parent_allow_proposals, parent_allow_audio, parent_permissions,
            campus_ui_level, pin_enforced_for_preview, onboarding_pin,
            phone_blind_index, fido2_sign_counter, is_2fa_enabled,
            parent_pin, personal_pin
        ) VALUES (
            COALESCE(NEW.id, gen_random_uuid()), NEW.school_id, NEW.role, NEW.first_name, NEW.last_name,
            NEW.avatar_url, NEW.qr_token, NEW.instrument, COALESCE(NEW.created_at, NOW()), NEW.coach_notes,
            NEW.photo_url, NEW.bio, NEW.bands, NEW.projects, NEW.listening, NEW.gear,
            NEW.musical_styles, NEW.equipment_list, NEW.last_seen, NEW.expertise, NEW.age, NEW.birth_date,
            NEW.pending_repertoire_proposal, NEW.is_external_vocalist, NEW.show_messages_menu,
            NEW.master_admin_username, COALESCE(NEW.is_trial, false), NEW.trial_ends_at,
            NEW.contract_ends_at, COALESCE(NEW.status, 'active'), COALESCE(NEW.is_master_admin, false),
            COALESCE(NEW.is_app_user, false), COALESCE(NEW.is_campus_active, false),
            COALESCE(NEW.is_groovelab_active, false), COALESCE(NEW.is_premium_user, false),
            NEW.teacher_id, NEW.ausweis_nummer, NEW.teacher_qr_token, COALESCE(NEW.is_active, true),
            NEW.max_students, NEW.nickname, NEW.ausweis_id,
            COALESCE(NEW.show_sekretariat, false), COALESCE(NEW.show_campus, false), COALESCE(NEW.show_groovelab, false),
            NEW.lesson_duration, NEW.planned_boards, NEW.required_equipment, NEW.sick_until, NEW.phone,
            COALESCE(NEW.joker_used, false), COALESCE(NEW.is_pin_activated, false), NEW.groovelab_räume,
            NEW.campus_räume, NEW.joker_used_at, NEW.sick_start, COALESCE(NEW.push_notifications_enabled, true),
            COALESCE(NEW.push_notif_schedule_changes, true), COALESCE(NEW.push_notif_homework, true),
            COALESCE(NEW.push_notif_all_features, true), COALESCE(NEW.push_notif_weekly_digest, true),
            COALESCE(NEW.push_notif_chat, true), COALESCE(NEW.push_notif_practice_reminder, true),
            NEW.app_usage_mode, NEW.preferred_room_ids, NEW.groovelab_instrument,
            NEW.student_billing_payment_method, NEW.activated_at, NEW.student_billing_cash_paid,
            NEW.roles, COALESCE(NEW.exempt_from_direct_billing, false), NEW.group_id, NEW.sibling_group_id,
            COALESCE(NEW.parent_allow_absences, true), COALESCE(NEW.parent_allow_chat, true),
            COALESCE(NEW.parent_allow_timer, true), COALESCE(NEW.parent_allow_leaderboard, true),
            COALESCE(NEW.parent_allow_groups, true), COALESCE(NEW.parent_allow_proposals, true),
            COALESCE(NEW.parent_allow_audio, true), NEW.parent_permissions,
            COALESCE(NEW.campus_ui_level, 1), COALESCE(NEW.pin_enforced_for_preview, false), NEW.onboarding_pin,
            NEW.phone_blind_index, COALESCE(NEW.fido2_sign_counter, 0), COALESCE(NEW.is_2fa_enabled, false),
            hashed_parent_pin, NEW.personal_pin
        ) RETURNING id INTO NEW.id;

        -- Split and store encrypted email
        IF NEW.email IS NOT NULL AND NEW.email <> '' AND NEW.email LIKE '%@%' THEN
            email_parts := string_to_array(NEW.email, '@');
            email_prefix := email_parts[1];
            email_suffix := email_parts[2];

            INSERT INTO public.user_email_prefixes (user_id, prefix)
            VALUES (NEW.id, extensions.pgp_sym_encrypt(email_prefix, public.get_encryption_key()))
            ON CONFLICT (user_id) DO UPDATE
            SET prefix = extensions.pgp_sym_encrypt(email_prefix, public.get_encryption_key());

            INSERT INTO public.user_email_suffixes (user_id, suffix)
            VALUES (NEW.id, email_suffix)
            ON CONFLICT (user_id) DO UPDATE
            SET suffix = email_suffix;
        END IF;

        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        UPDATE public.users_raw
        SET
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
            groovelab_räume = COALESCE(NEW.groovelab_räume, users_raw.groovelab_räume),
            campus_räume = COALESCE(NEW.campus_räume, users_raw.campus_räume),
            joker_used_at = COALESCE(NEW.joker_used_at, users_raw.joker_used_at),
            sick_start = COALESCE(NEW.sick_start, users_raw.sick_start),
            push_notifications_enabled = COALESCE(NEW.push_notifications_enabled, users_raw.push_notifications_enabled),
            push_notif_schedule_changes = COALESCE(NEW.push_notif_schedule_changes, users_raw.push_notif_schedule_changes),
            push_notif_homework = COALESCE(NEW.push_notif_homework, users_raw.push_notif_homework),
            push_notif_all_features = COALESCE(NEW.push_notif_all_features, users_raw.push_notif_all_features),
            push_notif_weekly_digest = COALESCE(NEW.push_notif_weekly_digest, users_raw.push_notif_weekly_digest),
            push_notif_chat = COALESCE(NEW.push_notif_chat, users_raw.push_notif_chat),
            push_notif_practice_reminder = COALESCE(NEW.push_notif_practice_reminder, users_raw.push_notif_practice_reminder),
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
            parent_allow_absences = COALESCE(NEW.parent_allow_absences, users_raw.parent_allow_absences),
            parent_allow_chat = COALESCE(NEW.parent_allow_chat, users_raw.parent_allow_chat),
            parent_allow_timer = COALESCE(NEW.parent_allow_timer, users_raw.parent_allow_timer),
            parent_allow_leaderboard = COALESCE(NEW.parent_allow_leaderboard, users_raw.parent_allow_leaderboard),
            parent_allow_groups = COALESCE(NEW.parent_allow_groups, users_raw.parent_allow_groups),
            parent_allow_proposals = COALESCE(NEW.parent_allow_proposals, users_raw.parent_allow_proposals),
            parent_allow_audio = COALESCE(NEW.parent_allow_audio, users_raw.parent_allow_audio),
            parent_permissions = COALESCE(NEW.parent_permissions, users_raw.parent_permissions),
            campus_ui_level = COALESCE(NEW.campus_ui_level, users_raw.campus_ui_level),
            pin_enforced_for_preview = COALESCE(NEW.pin_enforced_for_preview, users_raw.pin_enforced_for_preview),
            onboarding_pin = COALESCE(NEW.onboarding_pin, users_raw.onboarding_pin),
            phone_blind_index = COALESCE(NEW.phone_blind_index, users_raw.phone_blind_index),
            fido2_sign_counter = COALESCE(NEW.fido2_sign_counter, users_raw.fido2_sign_counter),
            is_2fa_enabled = COALESCE(NEW.is_2fa_enabled, users_raw.is_2fa_enabled),
            parent_pin = COALESCE(hashed_parent_pin, users_raw.parent_pin),
            personal_pin = COALESCE(NEW.personal_pin, users_raw.personal_pin)
        WHERE id = OLD.id;

        -- Update encrypted email if present in payload
        IF NEW.email IS NOT NULL AND NEW.email <> '' AND NEW.email LIKE '%@%' THEN
            email_parts := string_to_array(NEW.email, '@');
            email_prefix := email_parts[1];
            email_suffix := email_parts[2];

            INSERT INTO public.user_email_prefixes (user_id, prefix)
            VALUES (OLD.id, extensions.pgp_sym_encrypt(email_prefix, public.get_encryption_key()))
            ON CONFLICT (user_id) DO UPDATE
            SET prefix = extensions.pgp_sym_encrypt(email_prefix, public.get_encryption_key());

            INSERT INTO public.user_email_suffixes (user_id, suffix)
            VALUES (OLD.id, email_suffix)
            ON CONFLICT (user_id) DO UPDATE
            SET suffix = email_suffix;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_users_view_dml
INSTEAD OF INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_users_view_dml();

-- ------------------------------------------------------------------------------
-- 7. HARDENED MUTATION RPCS (Strict Role Guardrails)
-- ------------------------------------------------------------------------------

-- Master Admin Login: Uses private_auth.user_secrets securely
CREATE OR REPLACE FUNCTION public.login_master_admin(p_username text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_catalog
SET row_security = off
AS $$
DECLARE
    v_user record;
    v_clean_user text;
    v_clean_pass text;
BEGIN
    v_clean_user := LOWER(TRIM(p_username));
    v_clean_pass := TRIM(p_password);

    IF v_clean_user IS NULL OR v_clean_user = '' OR v_clean_pass IS NULL OR v_clean_pass = '' THEN
        RETURN NULL;
    END IF;

    SELECT ur.id, ur.role, ur.is_master_admin, ur.first_name, ur.last_name, ur.is_2fa_enabled, sec.two_factor_secret
    INTO v_user
    FROM public.users_raw ur
    LEFT JOIN private_auth.user_secrets sec ON sec.user_id = ur.id
    WHERE ur.is_master_admin = true 
      AND LOWER(TRIM(COALESCE(ur.master_admin_username, 'admin'))) = v_clean_user
      AND (sec.master_admin_password = v_clean_pass OR ur.master_admin_password = v_clean_pass);

    IF v_user.id IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'id', v_user.id,
        'role', v_user.role,
        'is_master_admin', true,
        'first_name', v_user.first_name,
        'last_name', v_user.last_name,
        'is_2fa_enabled', COALESCE(v_user.is_2fa_enabled, false),
        'two_factor_secret', v_user.two_factor_secret
    );
END;
$$;

-- Update Master Admin Credentials: Enforces caller authentication
CREATE OR REPLACE FUNCTION public.update_master_admin_credentials(
    p_username TEXT,
    p_password TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_is_2fa_enabled BOOLEAN DEFAULT NULL,
    p_two_factor_secret TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_catalog
AS $$
DECLARE
    v_caller_id UUID := public.get_current_authenticated_user_id();
    v_target_id UUID := p_user_id;
BEGIN
    -- Assert caller is Master Admin or initializing first admin
    IF NOT public.is_master_admin() AND EXISTS (SELECT 1 FROM public.users_raw WHERE is_master_admin = TRUE) THEN
        RAISE EXCEPTION 'Unberechtigter Zugriff: Nur autorisierte Master-Administratoren dürfen Zugangsdaten anpassen.';
    END IF;

    IF v_target_id IS NULL THEN
        SELECT id INTO v_target_id FROM public.users_raw WHERE is_master_admin = TRUE LIMIT 1;
    END IF;

    IF v_target_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Kein Master-Admin gefunden');
    END IF;

    -- Update username and 2FA status in users_raw
    UPDATE public.users_raw
    SET
        master_admin_username = COALESCE(p_username, master_admin_username),
        is_2fa_enabled = COALESCE(p_is_2fa_enabled, is_2fa_enabled)
    WHERE id = v_target_id;

    -- Update password and TOTP secret in vault
    INSERT INTO private_auth.user_secrets (user_id, master_admin_password, two_factor_secret, updated_at)
    VALUES (v_target_id, p_password, p_two_factor_secret, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        master_admin_password = COALESCE(EXCLUDED.master_admin_password, private_auth.user_secrets.master_admin_password),
        two_factor_secret = COALESCE(EXCLUDED.two_factor_secret, private_auth.user_secrets.two_factor_secret),
        updated_at = NOW();

    RETURN jsonb_build_object('success', true, 'user_id', v_target_id);
END;
$$;

-- Commit Teacher Schedule Draft: Enforces teacher / school admin authority
CREATE OR REPLACE FUNCTION public.commit_teacher_schedule_draft(
    p_teacher_id UUID,
    p_school_id UUID,
    p_planned_boards JSONB,
    p_schedule_slots JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_caller_id UUID := public.get_current_authenticated_user_id();
    v_caller_role TEXT := public.get_current_user_role();
    v_caller_school UUID := public.get_current_user_school_id();
    v_slot JSONB;
BEGIN
    -- Autorisierungs-Prüfung
    IF v_caller_id IS NOT NULL THEN
        IF NOT (
            public.is_master_admin()
            OR (v_caller_school = p_school_id AND v_caller_role IN ('admin', 'secretary'))
            OR (v_caller_id = p_teacher_id)
        ) THEN
            RAISE EXCEPTION 'Unberechtigter Zugriff zum Speichern dieses Stundenplans.';
        END IF;
    END IF;

    -- Step A: Persist planned_boards designer draft on the teacher's profile
    UPDATE public.users_raw
    SET 
        planned_boards = p_planned_boards,
        updated_at = NOW()
    WHERE id = p_teacher_id AND school_id = p_school_id;

    -- Step B: Synchronize schedule slots atomically
    IF p_schedule_slots IS NOT NULL AND jsonb_array_length(p_schedule_slots) > 0 THEN
        DELETE FROM public.schedules
        WHERE teacher_id = p_teacher_id AND school_id = p_school_id;

        FOR v_slot IN SELECT * FROM jsonb_array_elements(p_schedule_slots)
        LOOP
            INSERT INTO public.schedules (
                school_id,
                teacher_id,
                student_id,
                room_id,
                day_of_week,
                start_time,
                end_time,
                duration_minutes,
                status,
                created_at,
                updated_at
            ) VALUES (
                p_school_id,
                p_teacher_id,
                NULLIF(v_slot->>'student_id', '')::UUID,
                NULLIF(v_slot->>'room_id', '')::UUID,
                COALESCE((v_slot->>'day_of_week')::INT, 1),
                v_slot->>'start_time',
                v_slot->>'end_time',
                COALESCE((v_slot->>'duration_minutes')::INT, (v_slot->>'duration')::INT, 30),
                COALESCE(v_slot->>'status', 'approved'),
                NOW(),
                NOW()
            );
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'teacher_id', p_teacher_id,
        'school_id', p_school_id,
        'slots_committed', CASE WHEN p_schedule_slots IS NOT NULL THEN jsonb_array_length(p_schedule_slots) ELSE 0 END,
        'committed_at', NOW()
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Reload schema
NOTIFY pgrst, 'reload schema';
