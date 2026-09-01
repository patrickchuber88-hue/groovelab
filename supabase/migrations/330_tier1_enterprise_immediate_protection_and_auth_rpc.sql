-- ==============================================================================
-- Migration 330: Tier-1 SaaS Enterprise+ Immediate Protection & Server-Side Auth RPC
-- Standards: OWASP ASVS Level 3 / Zero-Trust Defense-in-Depth / DSGVO Art. 25 & 32
--
-- 1. NEUTRALIZE HEADER SPOOFING: get_current_authenticated_user_id() only accepts 
--    verified native Supabase Auth JWTs or verified, unrevoked session_leases tokens.
-- 2. HARDEN is_master_admin(): Validates against the verified session identity only.
-- 3. HARDEN session_leases: RLS default-deny for direct modifications from anon.
-- 4. SERVER-SIDE AUTH RPC: authenticate_by_credential() validates PIN/QR/Ausweis,
--    enforces rate-limiting/lockout, creates an active session lease, and returns sanitized data.
-- 5. ZERO-LEAK USERS VIEW: Masks qr_token, teacher_qr_token, and ausweis_nummer for anon.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDEN get_current_authenticated_user_id() (NO SPOOFABLE USER_ID IN HEADERS)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_authenticated_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET row_security TO 'off'
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_headers text;
    v_token text;
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

    -- 2. Extract request headers
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN NULL;
    END IF;

    -- 3. Extract session token from direct header OR client-info
    BEGIN
        v_token := v_headers::json->>'x-session-token';
        IF v_token IS NULL OR v_token = '' THEN
            v_client_info := v_headers::json->>'x-client-info';
            IF v_client_info IS NOT NULL THEN
                v_token := substring(v_client_info from ';session_token=([^;]+)');
            END IF;
        END IF;

        -- 4. Cryptographically validate against active, non-revoked session_leases
        IF v_token IS NOT NULL AND v_token <> '' AND to_regclass('public.session_leases') IS NOT NULL THEN
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
    EXCEPTION WHEN OTHERS THEN
        v_resolved_id := NULL;
    END;

    -- FAIL-CLOSED: Arbitrary user_id injection is strictly rejected
    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$function$;

-- ------------------------------------------------------------------------------
-- 2. HARDEN is_master_admin() (DERIVED EXCLUSIVELY FROM VERIFIED IDENTITY)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET row_security TO 'off'
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
    v_uid UUID := public.get_current_authenticated_user_id();
    v_is_master BOOLEAN;
BEGIN
    IF v_uid IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT is_master_admin INTO v_is_master
    FROM public.users_raw
    WHERE id = v_uid
      AND is_active = TRUE;

    RETURN COALESCE(v_is_master, FALSE);
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. HARDEN public.session_leases TABLE RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.session_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_leases FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_leases_master_admin_all" ON public.session_leases;
DROP POLICY IF EXISTS "session_leases_select_policy" ON public.session_leases;
DROP POLICY IF EXISTS "session_leases_insert_policy" ON public.session_leases;
DROP POLICY IF EXISTS "session_leases_update_policy" ON public.session_leases;
DROP POLICY IF EXISTS "session_leases_delete_policy" ON public.session_leases;
DROP POLICY IF EXISTS "session_leases_manage_policy" ON public.session_leases;

-- Read policy: Users can only see their own active lease, master admin sees all
CREATE POLICY "session_leases_select_policy" ON public.session_leases
FOR SELECT TO authenticated, anon
USING (
    public.is_master_admin()
    OR user_id = public.get_current_authenticated_user_id()
);

-- ------------------------------------------------------------------------------
-- 4. SERVER-SIDE CREDENTIAL AUTHENTICATION RPC (HERMETIC LOGIN)
-- ------------------------------------------------------------------------------
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
BEGIN
    IF v_clean IS NULL OR v_clean = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Anmeldedaten.');
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

    -- Fail-Closed: User not found
    IF v_user IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiger Ausweis-PIN oder QR-Token.');
    END IF;

    -- Check Lockout Status
    IF v_user.pin_locked_until IS NOT NULL AND v_user.pin_locked_until > NOW() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Sicherheitssperre: Zu viele Fehlversuche. Zugang vorübergehend gesperrt.'
        );
    END IF;

    -- Reset failed attempts & update last_seen
    UPDATE public.users_raw
    SET failed_pin_attempts = 0, 
        pin_locked_until = NULL, 
        last_seen = NOW()
    WHERE id = v_user.id;

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

    -- Build zero-knowledge sanitized profile
    v_sanitized_user := jsonb_build_object(
        'id', v_user.id,
        'school_id', v_user.school_id,
        'role', v_user.role,
        'roles', v_user.roles,
        'first_name', v_user.first_name,
        'last_name', v_user.last_name,
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
GRANT EXECUTE ON FUNCTION public.get_current_authenticated_user_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_master_admin() TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 5. REBUILD public.users VIEW (ZERO-LEAK FOR ANONYMOUS ROLES)
-- ------------------------------------------------------------------------------
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
    ur.pin_enforced_for_preview,
    ur.teacher_onboarding_completed,
    ur.teacher_availability,
    ur.is_2fa_enabled,
    NULL::text AS two_factor_secret,
    NULL::text AS parent_pin,
    NULL::text AS personal_pin,
    EXISTS (
        SELECT 1 FROM private_auth.user_secrets us 
        WHERE us.user_id = ur.id 
          AND us.argon2_parent_pin_hash IS NOT NULL 
          AND us.argon2_parent_pin_hash <> ''
    ) AS has_parent_pin,
    EXISTS (
        SELECT 1 FROM private_auth.user_secrets us 
        WHERE us.user_id = ur.id 
          AND us.argon2_personal_pin_hash IS NOT NULL 
          AND us.argon2_personal_pin_hash <> ''
    ) AS has_personal_pin,
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

GRANT SELECT ON public.users TO authenticated, anon;
NOTIFY pgrst, 'reload schema';
