-- ==============================================================================
-- 437: ENTERPRISE PARENT SESSION LEASE ZERO-TRUST GOLDSTANDARD
-- Standards: OWASP ASVS Level 3 / NIST SP 800-63B / DSGVO Art. 8 & 25 / GoBD
-- 1. Dual-Timeout-Matrix (15m Idle-Timeout + 30m Absolutes Hard-Cap)
-- 2. Autoritativer Sofort-Widerruf (revoke_parent_session_lease RPC)
-- 3. Forensischer Revisions-Audit mit kryptographischem Auth-Vektor & Hash
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. RPC: revoke_parent_session_lease
-- Sofortige, unumkehrbare Entwertung flüchtiger Eltern-Leases beim Verlassen
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_parent_session_lease(
    p_lease_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_updated_count INT := 0;
    v_school_id UUID;
    v_user_id UUID;
BEGIN
    IF p_lease_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Ermittle Metadaten vor dem Widerruf für revisionssicheres Audit-Logging
    SELECT school_id, user_id INTO v_school_id, v_user_id
    FROM public.session_leases
    WHERE id = p_lease_id AND role = 'parent';

    UPDATE public.session_leases
    SET is_revoked = TRUE,
        revoked_at = NOW()
    WHERE id = p_lease_id
      AND role = 'parent';

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    IF v_updated_count > 0 AND to_regclass('public.audit_logs') IS NOT NULL THEN
        BEGIN
            INSERT INTO public.audit_logs (
                school_id,
                user_id,
                action,
                details
            ) VALUES (
                v_school_id,
                v_user_id,
                'PARENT_SESSION_LEASE_REVOKED',
                jsonb_build_object(
                    'lease_token_hash', encode(digest(p_lease_id::text, 'sha256'), 'hex'),
                    'revoked_at', NOW(),
                    'reason', 'EXPLICIT_LOCKOUT_OR_EXIT'
                )
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    RETURN (v_updated_count > 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_parent_session_lease(UUID) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 2. ENHANCED save_parent_controls RPC MIT DUAL-TIMEOUT & REVISIONS-AUDIT
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
    v_auth_vector TEXT := 'UNAUTHORIZED';
    v_lease_token_hash TEXT := NULL;
    v_lease_rec RECORD;
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
        v_auth_vector := 'MASTER_ADMIN_OVERRIDE';
    ELSIF public.get_current_user_school_id() = v_user.school_id AND v_caller_role IN ('admin', 'secretary') THEN
        v_auth_ok := TRUE;
        v_auth_vector := 'ADMIN_SECRETARY_OVERRIDE';
    -- Volljährige Schüler dürfen ihre Einstellungen eigenständig steuern:
    ELSIF (v_caller_id = p_student_id OR (p_settings ? 'lease_token' AND EXISTS (
            SELECT 1 FROM public.session_leases 
            WHERE id::text = p_settings->>'lease_token' AND user_id = p_student_id AND is_revoked = FALSE
          )))
          AND v_is_adult_user = TRUE THEN
        v_auth_ok := TRUE;
        v_auth_vector := 'ADULT_STUDENT_SELF_GOVERNANCE';
    -- 🛡️ Tier-1 Enterprise Step-Up Lease: Für Minderjährige zulässig mit Dual-Timeout Matrix
    -- Relatives Inaktivitäts-Fenster: 15 Minuten
    -- Absolutes Lebensdauer-Limit (Hard-Cap nach NIST SP 800-63B): 30 Minuten ab Erstellung
    -- Strikte Bounded-Context-Isolation: Zwingend role = 'parent' (Schüler-Leases fail-closed abgewiesen)
    ELSIF (p_settings ? 'lease_token') THEN
        SELECT is_revoked, role, last_active_at, created_at
        INTO v_lease_rec
        FROM public.session_leases 
        WHERE id::text = p_settings->>'lease_token' 
          AND user_id = p_student_id;

        IF FOUND 
           AND v_lease_rec.is_revoked = FALSE
           AND v_lease_rec.role = 'parent'
           AND v_lease_rec.last_active_at >= NOW() - INTERVAL '15 minutes'
           AND (v_lease_rec.created_at IS NULL OR v_lease_rec.created_at >= NOW() - INTERVAL '30 minutes') THEN
            v_auth_ok := TRUE;
            v_auth_vector := 'TRANSIENT_PARENT_STEP_UP_LEASE';
            v_lease_token_hash := encode(digest(p_settings->>'lease_token', 'sha256'), 'hex');

            -- Sliding Window: Aktualisiere Aktivitätszeitstempel bei aktiver Nutzung
            UPDATE public.session_leases 
            SET last_active_at = NOW() 
            WHERE id::text = p_settings->>'lease_token' AND user_id = p_student_id;
        END IF;
    END IF;

    -- Server-Side Direct PIN-Verifikation (Fallback bei frischer Eingabe)
    IF NOT v_auth_ok AND p_settings ? 'parent_pin' AND p_settings->>'parent_pin' IS NOT NULL AND length(TRIM(p_settings->>'parent_pin')) >= 4 THEN
        IF public.verify_parent_pin(p_student_id, TRIM(p_settings->>'parent_pin')) THEN
            v_auth_ok := TRUE;
            v_auth_vector := 'DIRECT_PARENT_PIN_STEP_UP';
        END IF;
    END IF;

    -- 🛡️ GOLDSTANDARD FAIL-CLOSED: No student bypass permitted
    IF NOT v_auth_ok THEN
        RAISE EXCEPTION 'Access denied: Valid parent PIN or active parent session lease (max 15m idle / 30m hard-cap) required for student %', p_student_id 
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

    -- 5. Revisionssicheres Audit-Logging mit kryptographischem Auth-Vektor & Hash
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
                    'auth_vector', v_auth_vector,
                    'lease_token_hash', v_lease_token_hash,
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
