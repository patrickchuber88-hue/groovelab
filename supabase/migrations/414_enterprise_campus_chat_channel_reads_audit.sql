-- ==============================================================================
-- 🏛️ MIGRATION 414: CAMPUS CHAT CHANNEL READS & REVISIONSSICHERES AUDIT-LOGGING
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Fail-Closed / GoBD / § 130 BGB)
-- ==============================================================================
-- 1. Optimierung & Härtung des autoritativen RPCs: mark_campus_channel_as_read
-- 2. Revisionssicheres Audit-Logging in public.audit_logs gem. § 130 BGB / GoBD
-- 3. Atomare Aktualisierung von campus_chat_channel_reads
-- 4. Gezielte Synchronisation der Gruppenmitgliedschaft (nur wenn alle Kanäle gelesen)
-- 5. PostgREST Schema Cache Reload
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.mark_campus_channel_as_read(
    p_channel_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_school_id UUID;
    v_group_id UUID;
    v_now TIMESTAMPTZ := now();
    v_has_other_unread BOOLEAN := false;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentifizierung erforderlich.';
    END IF;

    -- Kanal & Gruppe ermitteln
    SELECT c.school_id, c.group_id
    INTO v_school_id, v_group_id
    FROM public.campus_chat_channels c
    WHERE c.id = p_channel_id;

    IF v_school_id IS NULL OR v_group_id IS NULL THEN
        RAISE EXCEPTION 'Kanal oder zugehörige Gruppe nicht gefunden.';
    END IF;

    -- Mandanten- & Zugriffskontrolle (Fail-Closed gem. OWASP ASVS Level 3)
    IF NOT (
        public.is_campus_chat_group_member(v_group_id, v_caller_id)
        OR public.is_campus_chat_group_creator(v_group_id, v_caller_id)
        OR public.is_master_admin()
        OR (public.check_school_access(v_school_id) AND public.is_teacher_or_admin())
    ) THEN
        RAISE EXCEPTION 'Kein Zugriff auf diesen Kanal.';
    END IF;

    -- 1. Chirurgisches Lesezeichen für den spezifischen Kanal upserten
    INSERT INTO public.campus_chat_channel_reads (
        school_id,
        channel_id,
        user_id,
        last_read_at
    ) VALUES (
        v_school_id,
        p_channel_id,
        v_caller_id,
        v_now
    )
    ON CONFLICT (channel_id, user_id)
    DO UPDATE SET last_read_at = EXCLUDED.last_read_at;

    -- 2. Prüfen, ob noch ungelesene Nachrichten in anderen Kanälen dieser Gruppe vorliegen
    SELECT EXISTS (
        SELECT 1
        FROM public.campus_direct_messages m
        JOIN public.campus_chat_channels ch ON ch.id = m.channel_id
        LEFT JOIN public.campus_chat_channel_reads cr 
            ON cr.channel_id = ch.id AND cr.user_id = v_caller_id
        WHERE m.group_id = v_group_id
          AND m.sender_id != v_caller_id
          AND m.created_at > COALESCE(cr.last_read_at, '1970-01-01'::timestamptz)
          AND ch.id != p_channel_id
    ) INTO v_has_other_unread;

    -- Wenn keine anderen ungelesenen Kanäle mehr vorliegen, auch den Gruppen-Zeitstempel aktualisieren
    IF NOT v_has_other_unread THEN
        UPDATE public.campus_chat_group_members
        SET last_read_at = v_now
        WHERE group_id = v_group_id AND user_id = v_caller_id;
    END IF;

    -- 3. Revisionssicheres Audit-Logging gem. § 130 BGB / GoBD in public.audit_logs
    INSERT INTO public.audit_logs (
        school_id,
        user_id,
        action,
        details
    ) VALUES (
        v_school_id,
        v_caller_id,
        'QUITTUNG_LESEBESTAETIGUNG',
        jsonb_build_object(
            'type', 'channel',
            'group_id', v_group_id,
            'channel_id', p_channel_id,
            'has_other_unread', v_has_other_unread,
            'acknowledged_at', v_now,
            'legal_basis', '§ 130 BGB / GoBD'
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'channel_id', p_channel_id,
        'group_id', v_group_id,
        'user_id', v_caller_id,
        'last_read_at', v_now,
        'has_other_unread', v_has_other_unread
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_campus_channel_as_read(UUID) TO authenticated, anon, service_role;

-- PostgREST Schema Cache Reload
NOTIFY pgrst, 'reload schema';
