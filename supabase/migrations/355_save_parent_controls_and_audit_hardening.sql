-- ==============================================================================
-- Migration 355: Revisionssichere Speicherung & Audit-Härtung der Elterneinstellungen
-- Standards: OWASP ASVS Level 3 / DSGVO Art. 8 & 25 / GoBD Revisionssicherheit
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.save_parent_controls(
    p_student_id UUID,
    p_settings JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    v_user RECORD;
    v_old_settings JSONB;
    v_new_settings JSONB;
    v_ui_level TEXT;
    v_allow_absences BOOLEAN;
    v_allow_chat BOOLEAN;
    v_allow_timer BOOLEAN;
    v_allow_leaderboard BOOLEAN;
    v_allow_groups BOOLEAN;
    v_allow_proposals BOOLEAN;
    v_parent_permissions JSONB;
BEGIN
    IF p_student_id IS NULL OR p_settings IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Fehlende Parameter für die Elterneinstellungen.');
    END IF;

    -- 1. Hole aktuellen Benutzer und verifiziere Existenz
    SELECT id, school_id, campus_ui_level, parent_allow_absences, parent_allow_chat,
           parent_allow_timer, parent_allow_leaderboard, parent_allow_groups,
           parent_allow_proposals, parent_permissions
    INTO v_user
    FROM public.users_raw
    WHERE id = p_student_id;

    IF v_user.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Schülerprofil nicht gefunden.');
    END IF;

    -- 2. Baue alten Zustand für den Revisions-Audit-Trail
    v_old_settings := jsonb_build_object(
        'campus_ui_level', v_user.campus_ui_level,
        'parent_allow_absences', v_user.parent_allow_absences,
        'parent_allow_chat', v_user.parent_allow_chat,
        'parent_allow_timer', v_user.parent_allow_timer,
        'parent_allow_leaderboard', v_user.parent_allow_leaderboard,
        'parent_allow_groups', v_user.parent_allow_groups,
        'parent_allow_proposals', v_user.parent_allow_proposals,
        'parent_permissions', v_user.parent_permissions
    );

    -- 3. Validiere und extrahiere Werte (Pinning: Nur explizit übergebene Werte überschreiben)
    IF p_settings ? 'campus_ui_level' THEN
        v_ui_level := LOWER(TRIM(p_settings->>'campus_ui_level'));
        IF v_ui_level NOT IN ('junior', 'teen', 'pro') THEN
            v_ui_level := v_user.campus_ui_level;
        END IF;
    ELSE
        v_ui_level := v_user.campus_ui_level;
    END IF;

    IF p_settings ? 'parent_allow_absences' THEN
        v_allow_absences := (p_settings->>'parent_allow_absences')::BOOLEAN;
    ELSE
        v_allow_absences := v_user.parent_allow_absences;
    END IF;

    IF p_settings ? 'parent_allow_chat' THEN
        v_allow_chat := (p_settings->>'parent_allow_chat')::BOOLEAN;
    ELSE
        v_allow_chat := v_user.parent_allow_chat;
    END IF;

    IF p_settings ? 'parent_allow_timer' THEN
        v_allow_timer := (p_settings->>'parent_allow_timer')::BOOLEAN;
    ELSE
        v_allow_timer := v_user.parent_allow_timer;
    END IF;

    IF p_settings ? 'parent_allow_leaderboard' THEN
        v_allow_leaderboard := (p_settings->>'parent_allow_leaderboard')::BOOLEAN;
    ELSE
        v_allow_leaderboard := v_user.parent_allow_leaderboard;
    END IF;

    IF p_settings ? 'parent_allow_groups' THEN
        v_allow_groups := (p_settings->>'parent_allow_groups')::BOOLEAN;
    ELSE
        v_allow_groups := v_user.parent_allow_groups;
    END IF;

    IF p_settings ? 'parent_allow_proposals' THEN
        v_allow_proposals := (p_settings->>'parent_allow_proposals')::BOOLEAN;
    ELSE
        v_allow_proposals := v_user.parent_allow_proposals;
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

    -- 4. Atomares Update in users_raw
    UPDATE public.users_raw
    SET
        campus_ui_level = COALESCE(v_ui_level, 'junior'),
        parent_allow_absences = COALESCE(v_allow_absences, false),
        parent_allow_chat = COALESCE(v_allow_chat, false),
        parent_allow_timer = COALESCE(v_allow_timer, true),
        parent_allow_leaderboard = COALESCE(v_allow_leaderboard, false),
        parent_allow_groups = COALESCE(v_allow_groups, false),
        parent_allow_proposals = COALESCE(v_allow_proposals, false),
        parent_permissions = v_parent_permissions
    WHERE id = p_student_id;

    -- 5. Spiegelung in students & pending_students (falls Tabellen vorhanden)
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
            parent_permissions = v_parent_permissions
        WHERE id = p_student_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- 6. Neuer Zustand
    v_new_settings := jsonb_build_object(
        'campus_ui_level', v_ui_level,
        'parent_allow_absences', v_allow_absences,
        'parent_allow_chat', v_allow_chat,
        'parent_allow_timer', v_allow_timer,
        'parent_allow_leaderboard', v_allow_leaderboard,
        'parent_allow_groups', v_allow_groups,
        'parent_allow_proposals', v_allow_proposals,
        'parent_permissions', v_parent_permissions
    );

    -- 7. Revisionssicherer Eintrag in public.audit_logs
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
            'UPDATE',
            v_old_settings,
            v_new_settings,
            p_student_id,
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

GRANT EXECUTE ON FUNCTION public.save_parent_controls(UUID, JSONB) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
