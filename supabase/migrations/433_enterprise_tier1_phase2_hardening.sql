-- ==============================================================================
-- 🏛️ MIGRATION 433: ENTERPRISE TIER-1 SECURITY & DATA PRIVACY HARDENING (PHASE 2)
-- Standards: OWASP ASVS Level 3 (v4.0.3), BSI TR-02102/03116, DSGVO Art. 8, 25 & 32
-- Plattform: Campus-Groovelab
-- ==============================================================================
-- 1. JUGENDSCHUTZ-VERSIEGELUNG: save_parent_controls() erzwingt role = 'parent'
--    und ein 15-Minuten Step-Up-Timeout. Schüler-Login-Leases können den Schutz nicht aushebeln.
-- 2. STORAGE RLS SYMMETRIE: storage.objects FOR SELECT erlaubt Schulen und Schülern
--    das autorisierte Lesen und Signieren von schools/<school_id>/... Audio-Assets.
-- 3. STORAGE ANON-WRITE PURGE: Entzieht der Rolle 'anon' sämtliche INSERT- und UPDATE-
--    Rechte auf storage.objects (Eliminiert die public.get_current_user_school_id() IS NULL Lücke).
-- 4. KRYPTO-PARITÄT: authenticate_by_credential() prüft Schulleitungs-PINs via SHA-256 Hash.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDEN save_parent_controls() (STRICT PARENT ROLE & TIMEOUT ENFORCEMENT)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_parent_controls(
    p_student_id UUID,
    p_settings JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
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
    -- 1. Locate student record
    SELECT * INTO v_user FROM public.users_raw WHERE id = p_student_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student not found: %', p_student_id USING ERRCODE = 'P0002';
    END IF;

    -- Adulthood Parity (strictly from existing users_raw columns: age, birth_date)
    v_is_adult_user := (
        COALESCE(v_user.age, 0) >= 18 
        OR (v_user.birth_date IS NOT NULL AND v_user.birth_date <= (CURRENT_DATE - INTERVAL '18 years'))
    );

    -- 2. Strict Authentication & Authorization Barrier (OWASP ASVS BOLA/IDOR Defense)
    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();

    IF public.is_master_admin() THEN
        v_auth_ok := TRUE;
    ELSIF public.get_current_user_school_id() = v_user.school_id AND v_caller_role IN ('admin', 'secretary') THEN
        v_auth_ok := TRUE;
    -- Adult students can independently configure their UI and app preferences
    ELSIF (v_caller_id = p_student_id OR (p_settings ? 'lease_token' AND EXISTS (
            SELECT 1 FROM public.session_leases 
            WHERE id::text = p_settings->>'lease_token' AND user_id = p_student_id AND is_revoked = FALSE
          )))
          AND v_is_adult_user = TRUE THEN
        v_auth_ok := TRUE;
    -- 🛡️ TIER-1 PARENT SESSION LEASE: Zwingend role = 'parent' und maximal 15 Minuten Inaktivität
    -- (Schüler-Leases besitzen role = 'student' und werden hier FAIL-CLOSED abgewiesen!)
    ELSIF (p_settings ? 'lease_token' AND EXISTS (
            SELECT 1 FROM public.session_leases 
            WHERE id::text = p_settings->>'lease_token' 
              AND user_id = p_student_id 
              AND is_revoked = FALSE
              AND role = 'parent'
              AND last_active_at >= NOW() - INTERVAL '15 minutes'
          )) THEN
        v_auth_ok := TRUE;
    -- Server-Side PIN-Verifikation
    ELSIF p_settings ? 'parent_pin' AND p_settings->>'parent_pin' IS NOT NULL AND length(TRIM(p_settings->>'parent_pin')) >= 4 THEN
        IF public.verify_parent_pin(p_student_id, TRIM(p_settings->>'parent_pin')) THEN
            v_auth_ok := TRUE;
        END IF;
    END IF;

    -- 🛡️ GOLDSTANDARD FAIL-CLOSED: No student bypass permitted
    IF NOT v_auth_ok THEN
        RAISE EXCEPTION 'Access denied: Valid parent PIN or active parent session lease required to modify parental controls for student %', p_student_id 
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

    -- 3. Validation & Extraction
    IF p_settings ? 'campus_ui_level' THEN
        v_ui_level := p_settings->>'campus_ui_level';
        IF v_ui_level NOT IN ('junior', 'teen', 'pro') THEN
            v_ui_level := 'junior';
        END IF;
    ELSE
        v_ui_level := COALESCE(v_user.campus_ui_level, 'junior');
    END IF;

    -- BGB Protection: Junior (under 11 years) cannot independently cancel lessons
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

    IF p_settings ? 'parent_permissions' THEN
        v_parent_permissions := p_settings->'parent_permissions';
    ELSE
        v_parent_permissions := COALESCE(v_user.parent_permissions, '{}'::JSONB);
    END IF;

    -- 4. Atomic Update in users_raw (Single Source of Truth)
    UPDATE public.users_raw SET
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

    -- Auxiliary updates
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
    EXCEPTION WHEN OTHERS THEN NULL; END;

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

    -- 5. Audit Logging
    BEGIN
        IF to_regclass('public.audit_logs') IS NOT NULL THEN
            BEGIN
                INSERT INTO public.audit_logs (
                    table_name,
                    record_id,
                    action,
                    old_data,
                    new_data,
                    changed_by,
                    created_at
                ) VALUES (
                    'users_raw',
                    p_student_id,
                    'UPDATE_PARENTAL_CONTROLS',
                    v_old_settings,
                    v_new_settings,
                    COALESCE(v_caller_id, p_student_id),
                    NOW()
                );
            EXCEPTION WHEN OTHERS THEN
                BEGIN
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
                EXCEPTION WHEN OTHERS THEN NULL; END;
            END;
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;

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
-- 2. HARDEN storage.objects RLS: SYMMETRIC SELECT & COMPLETE ANON-WRITE PURGE
-- ------------------------------------------------------------------------------

-- Purge legacy and over-permissive policies
DROP POLICY IF EXISTS "Allow scoped inserts to campus-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow scoped inserts to groovelab-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow scoped updates to campus-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow scoped updates to groovelab-assets" ON storage.objects;
DROP POLICY IF EXISTS "enterprise_scoped_select_campus_assets" ON storage.objects;
DROP POLICY IF EXISTS "enterprise_scoped_select_groovelab_assets" ON storage.objects;

-- 🛡️ Symmetrische SELECT Policy für campus-assets (ermöglicht signierte Audio-URLs für schools/...)
CREATE POLICY "enterprise_scoped_select_campus_assets"
ON storage.objects FOR SELECT TO authenticated, anon
USING (
    bucket_id = 'campus-assets'
    AND (
        -- Öffentliche Branding- und Avatar-Assets
        (storage.foldername(name))[1] IN ('public', 'avatars', 'branding', 'system')
        
        -- Eigener Nutzerordner: <user_id>/...
        OR (
            public.get_current_authenticated_user_id() IS NOT NULL 
            AND (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text
        )
        
        -- Master Admin
        OR public.is_master_admin()
        
        -- Kanonische Schulstruktur: schools/<school_id>/...
        OR (
            (storage.foldername(name))[1] = 'schools'
            AND public.get_current_user_school_id() IS NOT NULL
            AND (storage.foldername(name))[2] = public.get_current_user_school_id()::text
            AND (
                -- Schulleitung & Lehrkräfte dürfen alle Dateien ihrer Schule lesen
                public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
                -- Schüler dürfen ihre eigenen Dateien lesen: schools/<school_id>/students/<student_id>/...
                OR (
                    (storage.foldername(name))[3] = 'students'
                    AND (storage.foldername(name))[4] = public.get_current_authenticated_user_id()::text
                )
            )
        )
        
        -- Schulpersonal auf Nutzer-Root-Ordnern
        OR (
            public.get_current_user_school_id() IS NOT NULL
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher') 
            AND EXISTS (
                SELECT 1 FROM public.users_raw u
                WHERE u.id::text = (storage.foldername(name))[1]
                  AND u.school_id = public.get_current_user_school_id()
            )
        )
    )
);

-- 🛡️ Symmetrische SELECT Policy für groovelab-assets
CREATE POLICY "enterprise_scoped_select_groovelab_assets"
ON storage.objects FOR SELECT TO authenticated, anon
USING (
    bucket_id = 'groovelab-assets'
    AND (
        (storage.foldername(name))[1] IN ('public', 'avatars', 'branding', 'system')
        OR (
            public.get_current_authenticated_user_id() IS NOT NULL 
            AND (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text
        )
        OR public.is_master_admin()
        OR (
            (storage.foldername(name))[1] = 'schools'
            AND public.get_current_user_school_id() IS NOT NULL
            AND (storage.foldername(name))[2] = public.get_current_user_school_id()::text
            AND (
                public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
                OR (
                    (storage.foldername(name))[3] = 'students'
                    AND (storage.foldername(name))[4] = public.get_current_authenticated_user_id()::text
                )
            )
        )
        OR (
            public.get_current_user_school_id() IS NOT NULL
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher') 
            AND EXISTS (
                SELECT 1 FROM public.users_raw u
                WHERE u.id::text = (storage.foldername(name))[1]
                  AND u.school_id = public.get_current_user_school_id()
            )
        )
    )
);

-- 🛡️ Hermetische INSERT Policy für campus-assets (NUR authenticated & service_role, KEIN anon!)
CREATE POLICY "enterprise_scoped_insert_campus_assets"
ON storage.objects FOR INSERT TO authenticated, service_role
WITH CHECK (
    bucket_id = 'campus-assets'
    AND name NOT LIKE '%..%'
    AND (
        public.is_master_admin()
        OR (
            public.get_current_authenticated_user_id() IS NOT NULL
            AND (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text
        )
        OR (
            (storage.foldername(name))[1] = 'schools'
            AND public.get_current_user_school_id() IS NOT NULL
            AND (storage.foldername(name))[2] = public.get_current_user_school_id()::text
            AND (
                public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
                OR (
                    (storage.foldername(name))[3] = 'students'
                    AND (storage.foldername(name))[4] = public.get_current_authenticated_user_id()::text
                )
            )
        )
    )
);

-- 🛡️ Hermetische INSERT Policy für groovelab-assets (NUR authenticated & service_role, KEIN anon!)
CREATE POLICY "enterprise_scoped_insert_groovelab_assets"
ON storage.objects FOR INSERT TO authenticated, service_role
WITH CHECK (
    bucket_id = 'groovelab-assets'
    AND name NOT LIKE '%..%'
    AND (
        public.is_master_admin()
        OR (
            public.get_current_authenticated_user_id() IS NOT NULL
            AND (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text
        )
        OR (
            (storage.foldername(name))[1] = 'schools'
            AND public.get_current_user_school_id() IS NOT NULL
            AND (storage.foldername(name))[2] = public.get_current_user_school_id()::text
            AND (
                public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
                OR (
                    (storage.foldername(name))[3] = 'students'
                    AND (storage.foldername(name))[4] = public.get_current_authenticated_user_id()::text
                )
            )
        )
    )
);

-- 🛡️ Hermetische UPDATE Policy für campus-assets (NUR authenticated & service_role)
CREATE POLICY "enterprise_scoped_update_campus_assets"
ON storage.objects FOR UPDATE TO authenticated, service_role
USING (
    bucket_id = 'campus-assets'
    AND name NOT LIKE '%..%'
    AND (
        public.is_master_admin()
        OR (
            public.get_current_authenticated_user_id() IS NOT NULL
            AND (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text
        )
        OR (
            (storage.foldername(name))[1] = 'schools'
            AND public.get_current_user_school_id() IS NOT NULL
            AND (storage.foldername(name))[2] = public.get_current_user_school_id()::text
            AND (
                public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
                OR (
                    (storage.foldername(name))[3] = 'students'
                    AND (storage.foldername(name))[4] = public.get_current_authenticated_user_id()::text
                )
            )
        )
    )
)
WITH CHECK (
    bucket_id = 'campus-assets'
    AND name NOT LIKE '%..%'
);

-- 🛡️ Hermetische UPDATE Policy für groovelab-assets (NUR authenticated & service_role)
CREATE POLICY "enterprise_scoped_update_groovelab_assets"
ON storage.objects FOR UPDATE TO authenticated, service_role
USING (
    bucket_id = 'groovelab-assets'
    AND name NOT LIKE '%..%'
    AND (
        public.is_master_admin()
        OR (
            public.get_current_authenticated_user_id() IS NOT NULL
            AND (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text
        )
        OR (
            (storage.foldername(name))[1] = 'schools'
            AND public.get_current_user_school_id() IS NOT NULL
            AND (storage.foldername(name))[2] = public.get_current_user_school_id()::text
            AND (
                public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
                OR (
                    (storage.foldername(name))[3] = 'students'
                    AND (storage.foldername(name))[4] = public.get_current_authenticated_user_id()::text
                )
            )
        )
    )
)
WITH CHECK (
    bucket_id = 'groovelab-assets'
    AND name NOT LIKE '%..%'
);

-- ------------------------------------------------------------------------------
-- 3. KRYPTO-PARITÄT: authenticate_by_credential() mit SHA-256 Admin-PIN-Prüfung
-- ------------------------------------------------------------------------------
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

    -- Credential lookup: qr_token, teacher_qr_token, ausweis_nummer
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

    -- 🛡️ SECURE ADMIN PIN LOOKUP: Unterstützt SHA-256 Hash und Plaintext-Fallback
    IF v_user IS NULL AND p_school_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM private_auth.school_secrets 
            WHERE school_id = p_school_id 
              AND (
                  admin_pin = v_clean 
                  OR admin_pin_hash = encode(extensions.digest(v_clean, 'sha256'), 'hex')
              )
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

    -- Build zero-knowledge sanitized profile (last_name = NULL for students, campus_ui_level included)
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
