-- ==============================================================================
-- 423: ENTERPRISE AUTH UI LEVEL PARITY & RECONCILIATION
-- Ensures authenticate_by_credential returns campus_ui_level and synchronizes
-- public.students.campus_ui_level with public.users_raw.campus_ui_level
-- ==============================================================================

-- 1. Drop existing functions to avoid ambiguity
DROP FUNCTION IF EXISTS public.authenticate_by_credential(text, uuid);
DROP FUNCTION IF EXISTS public.authenticate_by_credential(text, uuid, text, text);

-- 2. Authoritative Unified Auth RPC
CREATE OR REPLACE FUNCTION public.authenticate_by_credential(
    p_credential text,
    p_school_id uuid DEFAULT NULL,
    p_device_key text DEFAULT NULL,
    p_device_name text DEFAULT NULL
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

    -- STRICT OWASP ASVS LEVEL 3: A credential is ONLY a valid qr_token, teacher_qr_token, or ausweis_nummer!
    IF v_is_uuid THEN
        SELECT * INTO v_user
        FROM public.users_raw
        WHERE (qr_token::text = v_clean OR teacher_qr_token = v_clean)
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

    -- SECURE ADMIN PIN LOOKUP: ONLY from private_auth.school_secrets
    IF v_user IS NULL AND p_school_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM private_auth.school_secrets 
            WHERE school_id = p_school_id AND admin_pin = v_clean
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
            EXCEPTION WHEN OTHERS THEN NULL;
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
        EXCEPTION WHEN OTHERS THEN NULL;
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
        device_name,
        device_key,
        created_at,
        last_active_at,
        is_revoked
    ) VALUES (
        v_lease_id,
        v_user.id,
        v_user.school_id,
        v_user.role,
        COALESCE(NULLIF(p_device_name, ''), 'credential_login'),
        COALESCE(NULLIF(p_device_key, ''), v_lease_id::text),
        NOW(),
        NOW(),
        FALSE
    );

    -- Build zero-knowledge sanitized profile (last_name = NULL for students, campus_ui_level included!)
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
        'has_parent_pin', (v_user.parent_pin IS NOT NULL OR EXISTS (
            SELECT 1 FROM private_auth.user_secrets sec WHERE sec.user_id = v_user.id AND sec.argon2_parent_pin_hash IS NOT NULL
        )),
        'has_personal_pin', (v_user.personal_pin IS NOT NULL OR EXISTS (
            SELECT 1 FROM private_auth.user_secrets sec WHERE sec.user_id = v_user.id AND sec.argon2_personal_pin_hash IS NOT NULL
        )),
        'parent_allow_chat', v_user.parent_allow_chat,
        'parent_allow_timer', v_user.parent_allow_timer,
        'parent_allow_leaderboard', v_user.parent_allow_leaderboard,
        'parent_allow_groups', v_user.parent_allow_groups,
        'parent_allow_proposals', v_user.parent_allow_proposals,
        'parent_allow_absences', v_user.parent_allow_absences,
        'parent_allow_audio', v_user.parent_allow_audio,
        'parent_permissions', v_user.parent_permissions,
        'campus_ui_level', COALESCE(v_user.campus_ui_level, 'junior'),
        'pin_enforced_for_preview', v_user.pin_enforced_for_preview,
        'teacher_onboarding_completed', v_user.teacher_onboarding_completed,
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

GRANT EXECUTE ON FUNCTION public.authenticate_by_credential(text, uuid, text, text) TO anon, authenticated, service_role;

-- 3. Synchronize students.campus_ui_level with users_raw.campus_ui_level
UPDATE public.students s
SET campus_ui_level = u.campus_ui_level
FROM public.users_raw u
WHERE s.id = u.id 
  AND u.campus_ui_level IS NOT NULL 
  AND (s.campus_ui_level IS NULL OR s.campus_ui_level != u.campus_ui_level);

-- Specifically ensure Linus is 'pro'
UPDATE public.students
SET campus_ui_level = 'pro'
WHERE id = '15102f5e-c504-4c33-93ab-436285197c8c';

UPDATE public.users_raw
SET campus_ui_level = 'pro'
WHERE id = '15102f5e-c504-4c33-93ab-436285197c8c';
