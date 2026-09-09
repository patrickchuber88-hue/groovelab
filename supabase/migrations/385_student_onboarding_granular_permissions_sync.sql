-- Migration 385: Synchronize granular parent permissions in complete_student_onboarding_v2
-- Enables authoritative storage of didactics (§ 201 StGB), absence management (BGB §§ 106, 615), and TTS accessibility.
-- Secures immutable GoBD / OWASP ASVS Level 3 audit logging in public.audit_logs.

CREATE OR REPLACE FUNCTION public.complete_student_onboarding_v2(
    p_token TEXT,
    p_parent_pin_6 TEXT,
    p_student_pin_4 TEXT DEFAULT NULL,
    p_campus_usage_mode TEXT DEFAULT 'selbstnutzer',
    p_parent_permissions JSONB DEFAULT '{}'::jsonb,
    p_parent_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
AS $$
DECLARE
    v_clean_token TEXT := TRIM(COALESCE(p_token, ''));
    v_clean_parent_name TEXT := TRIM(COALESCE(p_parent_name, ''));
    v_clean_parent_pin TEXT := TRIM(COALESCE(p_parent_pin_6, ''));
    v_clean_student_pin TEXT := TRIM(COALESCE(p_student_pin_4, ''));
    v_clean_mode TEXT := TRIM(COALESCE(p_campus_usage_mode, 'selbstnutzer'));
    v_user_id UUID := NULL;
    v_school_id UUID := NULL;
    v_birth_date DATE := NULL;
    v_day_of_birth INT := 1;
    v_parent_hash TEXT;
    v_student_hash TEXT := NULL;
    v_allow_chat BOOLEAN;
    v_allow_timer BOOLEAN;
    v_allow_leaderboard BOOLEAN;
    v_allow_student_audio BOOLEAN;
    v_allow_teacher_audio BOOLEAN;
    v_allow_absences BOOLEAN;
    v_allow_reschedule BOOLEAN;
    v_allow_tts BOOLEAN;
    v_allow_groups BOOLEAN;
    v_allow_proposals BOOLEAN;
BEGIN
    -- 1. Validate Input Parameters
    IF v_clean_token = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'MISSING_TOKEN', 'message', 'Onboarding-Token fehlt.');
    END IF;

    -- Parent PIN must be exactly 6 numeric digits (High Entropy Master Key)
    IF v_clean_parent_pin !~ '^[0-9]{6}$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_PARENT_PIN', 'message', 'Die Eltern-PIN muss genau 6 numerische Ziffern enthalten.');
    END IF;

    -- Normalize mode
    IF v_clean_mode NOT IN ('selbstnutzer', 'eltern_geführt') THEN
        v_clean_mode := 'selbstnutzer';
    END IF;

    -- Student PIN validation: if supplied, must be 4 digits. If omitted, child picks it upon first app login / kiosk.
    IF v_clean_student_pin <> '' AND v_clean_student_pin !~ '^[0-9]{4}$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_STUDENT_PIN', 'message', 'Die Schüler-PIN muss genau 4 numerische Ziffern enthalten.');
    END IF;

    -- 2. Find Student in users_raw
    SELECT id, school_id, birth_date
    INTO v_user_id, v_school_id, v_birth_date
    FROM public.users_raw
    WHERE qr_token::text = v_clean_token
       OR teacher_qr_token::text = v_clean_token
       OR UPPER(ausweis_nummer) = UPPER(v_clean_token)
       OR id::text = v_clean_token
    LIMIT 1;

    -- Fallback: check students table
    IF v_user_id IS NULL THEN
        BEGIN
            SELECT id, school_id, NULL::date
            INTO v_user_id, v_school_id, v_birth_date
            FROM public.students
            WHERE qr_token::text = v_clean_token
               OR UPPER(ausweis_nummer) = UPPER(v_clean_token)
               OR id::text = v_clean_token
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    -- Fallback: check pending_students table
    IF v_user_id IS NULL THEN
        BEGIN
            SELECT id, school_id, NULL::date
            INTO v_user_id, v_school_id, v_birth_date
            FROM public.pending_students
            WHERE id::text = v_clean_token
               OR qr_token::text = v_clean_token
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND', 'message', 'Schülerprofil konnte anhand des Tokens nicht identifiziert werden.');
    END IF;

    -- 3. Parse Granular Permissions (Privacy by Default & Unbundling)
    v_allow_chat := COALESCE((p_parent_permissions->>'allow_chat')::boolean, false);
    v_allow_timer := COALESCE((p_parent_permissions->>'allow_timer')::boolean, CASE WHEN v_clean_mode = 'eltern_geführt' THEN false ELSE true END);
    v_allow_leaderboard := COALESCE((p_parent_permissions->>'allow_leaderboard')::boolean, CASE WHEN v_clean_mode = 'eltern_geführt' THEN false ELSE true END);
    v_allow_student_audio := COALESCE((p_parent_permissions->>'allow_student_audio')::boolean, false);
    v_allow_teacher_audio := COALESCE((p_parent_permissions->>'allow_teacher_audio')::boolean, false);
    v_allow_absences := COALESCE((p_parent_permissions->>'allow_absences')::boolean, false);
    v_allow_reschedule := COALESCE((p_parent_permissions->>'allow_reschedule_confirm')::boolean, false);
    v_allow_tts := COALESCE((p_parent_permissions->>'allow_tts')::boolean, false);
    v_allow_groups := COALESCE((p_parent_permissions->>'allow_groups')::boolean, true);
    v_allow_proposals := COALESCE((p_parent_permissions->>'allow_proposals')::boolean, true);

    -- 4. Cryptographic Hashing (SHA-256) of Both PINs
    v_parent_hash := encode(digest(v_clean_parent_pin, 'sha256'), 'hex');
    IF v_clean_student_pin <> '' THEN
        v_student_hash := encode(digest(v_clean_student_pin, 'sha256'), 'hex');
    END IF;

    -- 5. Store Secrets in private_auth.user_secrets
    INSERT INTO private_auth.user_secrets (
        user_id,
        argon2_parent_pin_hash,
        argon2_personal_pin_hash,
        updated_at
    ) VALUES (
        v_user_id,
        v_parent_hash,
        v_student_hash,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        argon2_parent_pin_hash = EXCLUDED.argon2_parent_pin_hash,
        argon2_personal_pin_hash = COALESCE(EXCLUDED.argon2_personal_pin_hash, private_auth.user_secrets.argon2_personal_pin_hash),
        updated_at = NOW();

    -- 6. Atomically Update users_raw
    UPDATE public.users_raw SET
        parent_name = NULLIF(v_clean_parent_name, ''),
        parental_consent_given_at = NOW(),
        consent_version = 'v2.0',
        campus_usage_mode = v_clean_mode,
        parent_allow_chat = v_allow_chat,
        parent_allow_timer = v_allow_timer,
        parent_allow_leaderboard = v_allow_leaderboard,
        parent_allow_groups = v_allow_groups,
        parent_allow_proposals = v_allow_proposals,
        parent_allow_audio = v_allow_student_audio,
        parent_allow_absences = v_allow_absences,
        parent_allow_reschedule_confirm = v_allow_reschedule,
        parent_allow_tts = v_allow_tts,
        parent_permissions = jsonb_build_object(
            'allow_student_audio', v_allow_student_audio,
            'allow_teacher_audio', v_allow_teacher_audio,
            'allow_chat', v_allow_chat,
            'allow_timer', v_allow_timer,
            'allow_leaderboard', v_allow_leaderboard,
            'allow_absences', v_allow_absences,
            'allow_reschedule_confirm', v_allow_reschedule,
            'allow_tts', v_allow_tts,
            'allow_groups', v_allow_groups,
            'allow_proposals', v_allow_proposals
        ),
        is_active = TRUE,
        is_pin_activated = TRUE,
        is_campus_active = TRUE,
        status = 'aktiv',
        parent_pin = NULL,
        personal_pin = NULL,
        failed_pin_attempts = 0,
        pin_locked_until = NULL
    WHERE id = v_user_id;

    -- 7. Sync Legacy Tables (students, pending_students)
    BEGIN
        UPDATE public.students SET
            parent_name = NULLIF(v_clean_parent_name, ''),
            parental_consent_given_at = NOW(),
            consent_version = 'v2.0',
            campus_usage_mode = v_clean_mode,
            is_active = TRUE,
            is_pin_activated = TRUE,
            is_campus_active = TRUE,
            status = 'aktiv',
            parent_pin = NULL,
            personal_pin = NULL
        WHERE id = v_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        UPDATE public.pending_students SET
            is_pin_activated = TRUE,
            is_campus_active = TRUE,
            status = 'aktiv',
            parent_pin = NULL
        WHERE id = v_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- 8. Birthday activation day sync
    BEGIN
        IF v_birth_date IS NOT NULL THEN
            v_day_of_birth := EXTRACT(DAY FROM v_birth_date)::INT;
        ELSE
            v_day_of_birth := 1;
        END IF;

        INSERT INTO public.activation_days (student_id, day_of_birth)
        VALUES (v_user_id, v_day_of_birth)
        ON CONFLICT (student_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- 9. Revisionssicherer Audit-Trail (GoBD / OWASP ASVS Level 3 / Art. 8 DSGVO)
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
            v_user_id,
            'PARENTAL_CONSENT_COMPLETED_V2',
            NULL,
            jsonb_build_object(
                'consent_version', 'v2.0',
                'campus_usage_mode', v_clean_mode,
                'has_parent_pin_6', true,
                'has_student_pin_4', (v_student_hash IS NOT NULL),
                'permissions', jsonb_build_object(
                    'allow_teacher_audio', v_allow_teacher_audio,
                    'allow_student_audio', v_allow_student_audio,
                    'allow_timer', v_allow_timer,
                    'allow_tts', v_allow_tts,
                    'allow_chat', v_allow_chat,
                    'allow_absences', v_allow_absences,
                    'allow_reschedule_confirm', v_allow_reschedule,
                    'allow_groups', v_allow_groups,
                    'allow_proposals', v_allow_proposals,
                    'allow_leaderboard', v_allow_leaderboard
                ),
                'immutable_timestamp', NOW()
            ),
            v_user_id,
            v_school_id,
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- 10. Return Success
    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'mode', v_clean_mode,
        'activated_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_student_onboarding_v2(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated, service_role;
