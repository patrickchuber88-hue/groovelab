-- ==============================================================================
-- 🏛️ MIGRATION 435: ENTERPRISE PIN BRUTE-FORCE IMMUNITY & STORAGE RETENTION
-- Standard: OWASP ASVS Level 3 (V2, V3, V4, V14) / DSGVO Art. 5, 8, 17, 25, 32 / BSI IT-Grundschutz
-- Scope:
--   1. Progressive Exponential Backoff & Constant-Time PIN Verification (Parent & Personal)
--   2. Strict Elimination of Plaintext Fallbacks (Fail-Closed)
--   3. Parent Step-Up Lease Timebox Hardening (15-Minute Sliding Window)
--   4. DSGVO Storage Retention & Auto-Purge Helper RPC (Art. 5(1)(e) & Art. 17)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDENED PARENT PIN VERIFICATION (PROGRESSIVE BACKOFF & CONSTANT-TIME)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_parent_pin(student_id uuid, input_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private_auth', 'pg_temp', 'extensions'
AS $$
DECLARE
    v_stored_hash TEXT;
    v_input_hash TEXT;
    v_is_locked BOOLEAN := FALSE;
    v_attempts INTEGER := 0;
    v_new_attempts INTEGER := 0;
    v_clean_pin TEXT;
    v_match BOOLEAN := FALSE;
    v_school_id UUID;
BEGIN
    IF student_id IS NULL OR input_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    v_clean_pin := TRIM(input_pin);
    IF length(v_clean_pin) < 4 THEN
        RETURN FALSE;
    END IF;

    -- 1. Check if locked in users_raw
    SELECT 
        school_id,
        COALESCE(failed_pin_attempts, 0),
        (pin_locked_until IS NOT NULL AND pin_locked_until > NOW())
    INTO v_school_id, v_attempts, v_is_locked
    FROM public.users_raw
    WHERE id = student_id;

    IF NOT FOUND OR v_is_locked THEN
        RETURN FALSE;
    END IF;

    -- 2. Fetch stored hash from isolated private_auth schema first
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'private_auth' AND table_name = 'user_secrets'
    ) THEN
        SELECT argon2_parent_pin_hash
        INTO v_stored_hash
        FROM private_auth.user_secrets
        WHERE user_id = student_id;
    END IF;

    -- Fallback to users_raw parent_pin if private_auth is empty
    IF v_stored_hash IS NULL THEN
        SELECT parent_pin
        INTO v_stored_hash
        FROM public.users_raw
        WHERE id = student_id;
    END IF;

    -- 🛡️ GOLDSTANDARD FAIL-CLOSED: No PIN configured or default bypass
    IF v_stored_hash IS NULL OR v_stored_hash = '' OR v_stored_hash = '0000' THEN
        RETURN FALSE;
    END IF;

    -- 3. Calculate input SHA-256 digest
    v_input_hash := encode(digest(v_clean_pin, 'sha256'), 'hex');

    -- 4. Constant-Time Hash Comparison via HMAC (Prevents Micro-Timing Side Channels)
    -- Both hashes are 64-char hex strings; HMAC evaluation ensures invariant execution time
    IF length(v_stored_hash) = 64 THEN
        v_match := (
            hmac(v_stored_hash, 'campus_pin_constant_time_key_2026', 'sha256') = 
            hmac(v_input_hash, 'campus_pin_constant_time_key_2026', 'sha256')
        );
    ELSE
        -- Fail closed: Old plaintext or corrupt values are rejected
        v_match := FALSE;
    END IF;

    -- 5. Outcome Handling with Progressive Exponential Backoff
    IF v_match THEN
        UPDATE public.users_raw
        SET failed_pin_attempts = 0, pin_locked_until = NULL
        WHERE id = student_id;
        RETURN TRUE;
    ELSE
        v_new_attempts := v_attempts + 1;
        UPDATE public.users_raw
        SET 
            failed_pin_attempts = v_new_attempts,
            pin_locked_until = CASE 
                WHEN v_new_attempts >= 5 THEN NOW() + INTERVAL '15 minutes'
                WHEN v_new_attempts = 4 THEN NOW() + INTERVAL '30 seconds'
                WHEN v_new_attempts = 3 THEN NOW() + INTERVAL '5 seconds'
                ELSE NULL 
            END
        WHERE id = student_id;

        -- Forensisches Audit-Logging bei Brute-Force-Verdacht (ab 3 Fehlversuchen)
        IF v_new_attempts >= 3 AND to_regclass('public.audit_logs') IS NOT NULL THEN
            BEGIN
                INSERT INTO public.audit_logs (
                    school_id,
                    user_id,
                    action,
                    details
                ) VALUES (
                    v_school_id,
                    student_id,
                    'SECURITY_PARENT_PIN_THROTTLED',
                    jsonb_build_object(
                        'target_student_id', student_id,
                        'failed_attempts', v_new_attempts,
                        'lockout_duration', CASE 
                            WHEN v_new_attempts >= 5 THEN '15 minutes'
                            WHEN v_new_attempts = 4 THEN '30 seconds'
                            WHEN v_new_attempts = 3 THEN '5 seconds'
                            ELSE 'none'
                        END,
                        'timestamp', NOW()
                    )
                );
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;

        RETURN FALSE;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_parent_pin(uuid, text) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 2. HARDENED PERSONAL PIN VERIFICATION (PROGRESSIVE BACKOFF & CONSTANT-TIME)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_personal_pin(user_uuid uuid, input_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private_auth', 'pg_temp', 'extensions'
AS $$
DECLARE
    v_stored_hash TEXT;
    v_input_hash TEXT;
    v_is_locked BOOLEAN := FALSE;
    v_attempts INTEGER := 0;
    v_new_attempts INTEGER := 0;
    v_clean_pin TEXT;
    v_match BOOLEAN := FALSE;
    v_school_id UUID;
BEGIN
    IF user_uuid IS NULL OR input_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    v_clean_pin := TRIM(input_pin);
    IF length(v_clean_pin) < 4 THEN
        RETURN FALSE;
    END IF;

    -- 1. Check if locked in users_raw
    SELECT 
        school_id,
        COALESCE(failed_pin_attempts, 0),
        (pin_locked_until IS NOT NULL AND pin_locked_until > NOW())
    INTO v_school_id, v_attempts, v_is_locked
    FROM public.users_raw
    WHERE id = user_uuid;

    IF NOT FOUND OR v_is_locked THEN
        RETURN FALSE;
    END IF;

    -- 2. Fetch stored hash from isolated private_auth schema first
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'private_auth' AND table_name = 'user_secrets'
    ) THEN
        SELECT argon2_personal_pin_hash
        INTO v_stored_hash
        FROM private_auth.user_secrets
        WHERE user_id = user_uuid;
    END IF;

    -- Fallback to users_raw personal_pin if private_auth is empty
    IF v_stored_hash IS NULL THEN
        SELECT personal_pin
        INTO v_stored_hash
        FROM public.users_raw
        WHERE id = user_uuid;
    END IF;

    IF v_stored_hash IS NULL OR v_stored_hash = '' OR v_stored_hash = '0000' THEN
        RETURN FALSE;
    END IF;

    -- 3. Calculate input SHA-256 digest
    v_input_hash := encode(digest(v_clean_pin, 'sha256'), 'hex');

    -- 4. Constant-Time Hash Comparison
    IF length(v_stored_hash) = 64 THEN
        v_match := (
            hmac(v_stored_hash, 'campus_pin_constant_time_key_2026', 'sha256') = 
            hmac(v_input_hash, 'campus_pin_constant_time_key_2026', 'sha256')
        );
    ELSE
        v_match := FALSE;
    END IF;

    -- 5. Outcome Handling with Progressive Exponential Backoff
    IF v_match THEN
        UPDATE public.users_raw
        SET failed_pin_attempts = 0, pin_locked_until = NULL
        WHERE id = user_uuid;
        RETURN TRUE;
    ELSE
        v_new_attempts := v_attempts + 1;
        UPDATE public.users_raw
        SET 
            failed_pin_attempts = v_new_attempts,
            pin_locked_until = CASE 
                WHEN v_new_attempts >= 5 THEN NOW() + INTERVAL '15 minutes'
                WHEN v_new_attempts = 4 THEN NOW() + INTERVAL '30 seconds'
                WHEN v_new_attempts = 3 THEN NOW() + INTERVAL '5 seconds'
                ELSE NULL 
            END
        WHERE id = user_uuid;

        -- Forensisches Audit-Logging bei Brute-Force-Verdacht (ab 3 Fehlversuchen)
        IF v_new_attempts >= 3 AND to_regclass('public.audit_logs') IS NOT NULL THEN
            BEGIN
                INSERT INTO public.audit_logs (
                    school_id,
                    user_id,
                    action,
                    details
                ) VALUES (
                    v_school_id,
                    user_uuid,
                    'SECURITY_PERSONAL_PIN_THROTTLED',
                    jsonb_build_object(
                        'target_user_id', user_uuid,
                        'failed_attempts', v_new_attempts,
                        'lockout_duration', CASE 
                            WHEN v_new_attempts >= 5 THEN '15 minutes'
                            WHEN v_new_attempts = 4 THEN '30 seconds'
                            WHEN v_new_attempts = 3 THEN '5 seconds'
                            ELSE 'none'
                        END,
                        'timestamp', NOW()
                    )
                );
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;

        RETURN FALSE;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_personal_pin(uuid, text) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 3. HARDENED PARENT STEP-UP LEASE (15-MINUTE TRANSIENT WINDOW)
-- ------------------------------------------------------------------------------
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
    v_caller_id UUID;
    v_caller_role TEXT;
    v_auth_ok BOOLEAN := FALSE;
    v_is_adult_user BOOLEAN := FALSE;
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
    -- 1. Locate student
    SELECT * INTO v_user FROM public.users_raw WHERE id = p_student_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student not found: %', p_student_id USING ERRCODE = 'P0002';
    END IF;

    -- Adulthood Parity (strictly from existing users_raw columns: age, birth_date)
    v_is_adult_user := (
        COALESCE(v_user.age, 0) >= 18 
        OR (v_user.birth_date IS NOT NULL AND v_user.birth_date <= (CURRENT_DATE - INTERVAL '18 years'))
    );

    -- 2. Strikte Authentifizierungs- & Autorisierungsbarriere (OWASP ASVS BOLA/IDOR Defense)
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();

    IF public.is_master_admin() THEN
        v_auth_ok := TRUE;
    ELSIF public.get_current_user_school_id() = v_user.school_id AND v_caller_role IN ('admin', 'secretary') THEN
        v_auth_ok := TRUE;
    -- Volljährige Schüler dürfen ihre Einstellungen eigenständig steuern:
    ELSIF (v_caller_id = p_student_id OR (p_settings ? 'lease_token' AND EXISTS (
            SELECT 1 FROM public.session_leases 
            WHERE id::text = p_settings->>'lease_token' AND user_id = p_student_id AND is_revoked = FALSE
          )))
          AND v_is_adult_user = TRUE THEN
        v_auth_ok := TRUE;
    -- 🛡️ Tier-1 Enterprise Step-Up Lease: Für Minderjährige zulässig mit striktem 15-Minuten-Zeitfenster
    -- Verhindert unberechtigte Rekonfigurationen auf unbeaufsichtigten Familien-Tablets
    ELSIF (p_settings ? 'lease_token' AND EXISTS (
            SELECT 1 FROM public.session_leases 
            WHERE id::text = p_settings->>'lease_token' 
              AND user_id = p_student_id 
              AND is_revoked = FALSE
              AND last_active_at >= NOW() - INTERVAL '15 minutes'
          )) THEN
        v_auth_ok := TRUE;
        -- Sliding Window: Aktualisiere Aktivitätszeitstempel bei aktiver Nutzung
        UPDATE public.session_leases 
        SET last_active_at = NOW() 
        WHERE id::text = p_settings->>'lease_token' AND user_id = p_student_id;
    -- Server-Side PIN-Verifikation
    ELSIF p_settings ? 'parent_pin' AND p_settings->>'parent_pin' IS NOT NULL AND length(TRIM(p_settings->>'parent_pin')) >= 4 THEN
        IF public.verify_parent_pin(p_student_id, TRIM(p_settings->>'parent_pin')) THEN
            v_auth_ok := TRUE;
        END IF;
    END IF;

    -- 🛡️ GOLDSTANDARD FAIL-CLOSED: No student bypass permitted
    IF NOT v_auth_ok THEN
        RAISE EXCEPTION 'Access denied: Valid parent PIN or active 15-minute session lease required for student %', p_student_id 
            USING ERRCODE = '42501';
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

    -- 3. Validierung & Extraktion
    IF p_settings ? 'campus_ui_level' THEN
        v_ui_level := p_settings->>'campus_ui_level';
        IF v_ui_level NOT IN ('junior', 'teen', 'pro') THEN
            v_ui_level := 'junior';
        END IF;
    ELSE
        v_ui_level := COALESCE(v_user.campus_ui_level, 'junior');
    END IF;

    -- BGB Schutz: Junior (unter 11 J.) darf keine Stunden stornieren
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
        v_allow_audio := COALESCE(v_user.parent_allow_audio, false);
    END IF;

    IF p_settings ? 'parent_permissions' AND jsonb_typeof(p_settings->'parent_permissions') = 'object' THEN
        v_parent_permissions := p_settings->'parent_permissions';
    ELSE
        v_parent_permissions := COALESCE(v_user.parent_permissions, '{}'::JSONB);
    END IF;

    -- 4. Atomares Update in users_raw
    UPDATE public.users_raw SET
        campus_ui_level = v_ui_level,
        parent_allow_absences = COALESCE(v_allow_absences, false),
        parent_allow_chat = COALESCE(v_allow_chat, false),
        parent_allow_timer = COALESCE(v_allow_timer, true),
        parent_allow_leaderboard = COALESCE(v_allow_leaderboard, false),
        parent_allow_groups = COALESCE(v_allow_groups, false),
        parent_allow_proposals = COALESCE(v_allow_proposals, false),
        parent_allow_audio = COALESCE(v_allow_audio, false),
        parent_permissions = v_parent_permissions,
        updated_at = NOW()
    WHERE id = p_student_id;

    -- Parallele Synchronisation in students / pending_students (falls existent)
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
            UPDATE public.students SET
                campus_ui_level = v_ui_level,
                parent_allow_absences = COALESCE(v_allow_absences, false),
                parent_allow_chat = COALESCE(v_allow_chat, false),
                parent_allow_timer = COALESCE(v_allow_timer, true),
                parent_allow_leaderboard = COALESCE(v_allow_leaderboard, false),
                parent_allow_groups = COALESCE(v_allow_groups, false),
                parent_allow_proposals = COALESCE(v_allow_proposals, false),
                parent_allow_audio = COALESCE(v_allow_audio, false),
                parent_permissions = v_parent_permissions
            WHERE id = p_student_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

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

    -- 5. Revisionssicheres Audit-Logging
    BEGIN
        IF to_regclass('public.audit_logs') IS NOT NULL THEN
            INSERT INTO public.audit_logs (
                school_id,
                user_id,
                action,
                details
            ) VALUES (
                v_user.school_id,
                COALESCE(v_caller_id, p_student_id),
                'UPDATE_PARENTAL_CONTROLS',
                jsonb_build_object(
                    'student_id', p_student_id,
                    'old_settings', v_old_settings,
                    'new_settings', v_new_settings,
                    'actor_role', COALESCE(v_caller_role, 'parent'),
                    'updated_at', NOW()
                )
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'student_id', p_student_id,
        'campus_ui_level', v_ui_level,
        'settings', v_new_settings
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_parent_controls(UUID, JSONB) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 4. DSGVO STORAGE RETENTION & AUTO-PURGE RPC (Art. 5(1)(e) & Art. 17)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_inactive_student_storage_assets(
    p_school_id UUID,
    p_retention_days INTEGER DEFAULT 90
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
DECLARE
    v_caller_role TEXT := public.get_current_user_role();
    v_caller_school UUID := public.get_current_user_school_id();
    v_deleted_count INTEGER := 0;
    v_purged_student_ids UUID[] := ARRAY[]::UUID[];
    v_student_rec RECORD;
    v_cutoff_date TIMESTAMPTZ := NOW() - (p_retention_days || ' days')::INTERVAL;
BEGIN
    -- 1. Autorisierungsprüfung: Nur Admin, Sekretariat oder Master-Admin
    IF NOT (public.is_master_admin() OR (v_caller_school = p_school_id AND v_caller_role IN ('admin', 'secretary'))) THEN
        RAISE EXCEPTION 'Access denied: Administrative privileges required to run storage retention purge.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Identifiziere inaktive Schüler der Schule außerhalb der Aufbewahrungsfrist
    FOR v_student_rec IN 
        SELECT id 
        FROM public.users_raw
        WHERE school_id = p_school_id 
          AND is_active = FALSE 
          AND COALESCE(updated_at, created_at) < v_cutoff_date
    LOOP
        v_purged_student_ids := array_append(v_purged_student_ids, v_student_rec.id);

        -- Bereinige verwaiste Audio-/Asset-Objekte aus Storage
        IF to_regclass('storage.objects') IS NOT NULL THEN
            WITH deleted AS (
                DELETE FROM storage.objects
                WHERE bucket_id IN ('campus-assets', 'groovelab-assets')
                  AND (
                      name LIKE 'schools/' || p_school_id::text || '/students/' || v_student_rec.id::text || '/%'
                      OR name LIKE v_student_rec.id::text || '/%'
                      OR name LIKE '%/' || v_student_rec.id::text || '/%'
                  )
                RETURNING id
            )
            SELECT v_deleted_count + count(*) INTO v_deleted_count FROM deleted;
        END IF;
    END LOOP;

    -- 3. Revisionssicheres Audit-Logging
    IF to_regclass('public.audit_logs') IS NOT NULL THEN
        BEGIN
            INSERT INTO public.audit_logs (
                school_id,
                user_id,
                action,
                details
            ) VALUES (
                p_school_id,
                public.get_current_authenticated_user_id(),
                'STORAGE_GDPR_RETENTION_PURGE',
                jsonb_build_object(
                    'school_id', p_school_id,
                    'retention_days', p_retention_days,
                    'cutoff_date', v_cutoff_date,
                    'purged_students_count', coalesce(array_length(v_purged_student_ids, 1), 0),
                    'deleted_objects_count', v_deleted_count,
                    'purged_student_ids', v_purged_student_ids,
                    'timestamp', NOW()
                )
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'school_id', p_school_id,
        'purged_students_count', coalesce(array_length(v_purged_student_ids, 1), 0),
        'deleted_objects_count', v_deleted_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_inactive_student_storage_assets(UUID, INTEGER) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
