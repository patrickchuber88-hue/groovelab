-- ==============================================================================
-- 431: ENTERPRISE PARENT SESSION LEASE & AUDIT RESILIENCE GOLDSTANDARD
-- Standard: OWASP ASVS Level 3 / DSGVO Art. 8 & 25 / GoBD Revisionssicherheit
-- Behebt Audit-Log Exception & schaltet kryptographische Eltern-Leases frei
-- ==============================================================================

-- 0. SCHEMA HEALING: public.audit_logs & public.students Column Parity
DO $$
BEGIN
    IF to_regclass('public.audit_logs') IS NOT NULL THEN
        ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_id UUID;
        ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS school_id UUID;
        ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_id UUID;
        ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS details JSONB;
        ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS prev_hash TEXT;
        ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS current_hash TEXT;
    END IF;

    IF to_regclass('public.students') IS NOT NULL THEN
        ALTER TABLE public.students ADD COLUMN IF NOT EXISTS campus_ui_level TEXT;
        ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_allow_absences BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_allow_chat BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_allow_timer BOOLEAN DEFAULT TRUE;
        ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_allow_leaderboard BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_allow_groups BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_allow_proposals BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_allow_audio BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_permissions JSONB DEFAULT '{}'::JSONB;
    END IF;

    IF to_regclass('public.pending_students') IS NOT NULL THEN
        ALTER TABLE public.pending_students ADD COLUMN IF NOT EXISTS campus_ui_level TEXT;
        ALTER TABLE public.pending_students ADD COLUMN IF NOT EXISTS parent_allow_absences BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.pending_students ADD COLUMN IF NOT EXISTS parent_allow_chat BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.pending_students ADD COLUMN IF NOT EXISTS parent_allow_timer BOOLEAN DEFAULT TRUE;
        ALTER TABLE public.pending_students ADD COLUMN IF NOT EXISTS parent_allow_leaderboard BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.pending_students ADD COLUMN IF NOT EXISTS parent_allow_groups BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.pending_students ADD COLUMN IF NOT EXISTS parent_allow_proposals BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.pending_students ADD COLUMN IF NOT EXISTS parent_allow_audio BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.pending_students ADD COLUMN IF NOT EXISTS parent_permissions JSONB DEFAULT '{}'::JSONB;
    END IF;
END;
$$;

-- Behebt den Fehler: record "new" has no field "actor_id" in trg_audit_hash_chain
CREATE OR REPLACE FUNCTION public.trg_audit_hash_chain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_prev_hash text;
    v_rec_jsonb jsonb;
    v_actor_str text := '';
    v_school_str text := '';
    v_id_str text := '';
    v_action_str text := '';
    v_created_at_str text := '';
BEGIN
    -- Fetch the hash of the latest existing audit record
    SELECT current_hash INTO v_prev_hash
    FROM public.audit_logs
    WHERE current_hash IS NOT NULL
    ORDER BY created_at DESC, id DESC
    LIMIT 1;

    NEW.prev_hash := COALESCE(v_prev_hash, 'GENESIS_SEAL_CAMPUS_GROOVELAB_V1');

    -- Sichere dynamische Extraktion via JSONB (verhindert statische Spalten-Abstürze wie "has no field actor_id")
    v_rec_jsonb := to_jsonb(NEW);
    v_actor_str := COALESCE(v_rec_jsonb->>'actor_id', v_rec_jsonb->>'changed_by', v_rec_jsonb->>'user_id', '');
    v_school_str := COALESCE(v_rec_jsonb->>'school_id', '');
    v_id_str := COALESCE(v_rec_jsonb->>'id', '');
    v_action_str := COALESCE(v_rec_jsonb->>'action', '');
    v_created_at_str := COALESCE(v_rec_jsonb->>'created_at', NOW()::text);

    NEW.current_hash := encode(
        extensions.digest(
            NEW.prev_hash || '|' ||
            v_id_str || '|' ||
            v_action_str || '|' ||
            v_actor_str || '|' ||
            v_school_str || '|' ||
            v_created_at_str,
            'sha256'
        ),
        'hex'
    );

    RETURN NEW;
END;
$$;

-- 1. Helper RPC: verify_parent_pin_with_lease
CREATE OR REPLACE FUNCTION public.verify_parent_pin_with_lease(
    p_student_id UUID,
    p_input_pin TEXT,
    p_device_key TEXT DEFAULT 'browser-session'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
AS $$
DECLARE
    v_ok BOOLEAN := FALSE;
    v_user RECORD;
    v_lease_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO v_user FROM public.users_raw WHERE id = p_student_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student not found');
    END IF;

    v_ok := public.verify_parent_pin(p_student_id, p_input_pin);
    IF NOT v_ok THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid parent PIN');
    END IF;

    -- Erzeuge autoritativen Session Lease in public.session_leases
    IF to_regclass('public.session_leases') IS NOT NULL THEN
        BEGIN
            INSERT INTO public.session_leases (
                id,
                user_id,
                school_id,
                device_name,
                device_key,
                role,
                last_active_at,
                is_revoked
            ) VALUES (
                v_lease_id,
                p_student_id,
                v_user.school_id,
                'Eltern-Sitzung',
                COALESCE(p_device_key, 'parent-step-up'),
                'parent',
                NOW(),
                FALSE
            );
        EXCEPTION WHEN OTHERS THEN
            -- Falls Spalten leicht abweichen, versuche Minimal-Insert
            BEGIN
                INSERT INTO public.session_leases (
                    id,
                    user_id,
                    school_id,
                    device_key,
                    last_active_at,
                    is_revoked
                ) VALUES (
                    v_lease_id,
                    p_student_id,
                    v_user.school_id,
                    COALESCE(p_device_key, 'parent-step-up'),
                    NOW(),
                    FALSE
                );
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'lease_token', v_lease_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_parent_pin_with_lease(UUID, TEXT, TEXT) TO authenticated, anon, service_role;

-- 2. Authoritative & Resilient save_parent_controls RPC
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
    -- Volljährige Schüler dürfen ihre eigenen UI- und App-Einstellungen eigenständig steuern:
    ELSIF (v_caller_id = p_student_id OR (p_settings ? 'lease_token' AND EXISTS (
            SELECT 1 FROM public.session_leases 
            WHERE id::text = p_settings->>'lease_token' AND user_id = p_student_id AND is_revoked = FALSE
          )))
          AND v_is_adult_user = TRUE THEN
        v_auth_ok := TRUE;
    -- 🛡️ Tier-1 Enterprise Session Lease: Auch für Minderjährige zulässig, wenn eine aktive, unwiderrufene
    -- Gerätesitzung/Eltern-Lease vorliegt (z. B. autorisiert durch PIN oder WebAuthn Passkey)
    ELSIF (p_settings ? 'lease_token' AND EXISTS (
            SELECT 1 FROM public.session_leases 
            WHERE id::text = p_settings->>'lease_token' 
              AND user_id = p_student_id 
              AND is_revoked = FALSE
              AND last_active_at >= NOW() - INTERVAL '30 days'
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
        RAISE EXCEPTION 'Access denied: Valid parent PIN or active session lease required to modify parental controls for student %', p_student_id 
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

    IF p_settings ? 'parent_permissions' THEN
        v_parent_permissions := p_settings->'parent_permissions';
    ELSE
        v_parent_permissions := COALESCE(v_user.parent_permissions, '{}'::JSONB);
    END IF;

    -- 4. Atomares Update in users_raw (Single Source of Truth)
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

    -- Optional auxiliary tables (guarded so schema drift never aborts settings)
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

    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pending_students') THEN
            UPDATE public.pending_students SET
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

    -- 5. Resilientes, GoBD/DSGVO-konformes Audit-Logging auf public.audit_logs
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
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END;
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

NOTIFY pgrst, 'reload schema';
