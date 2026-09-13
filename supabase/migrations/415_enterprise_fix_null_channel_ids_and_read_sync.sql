-- ==============================================================================
-- 🏛️ MIGRATION 415: REPAIR NULL CHANNEL_IDS & ENTERPRISE READ SYNC
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Fail-Closed / GoBD / § 130 BGB)
-- ==============================================================================
-- 1. Historische Bereinigung: Alle Gruppen-Nachrichten mit channel_id IS NULL
--    dem Standard-Kanal (# allgemein) der jeweiligen Gruppe zuordnen
-- 2. Trigger: trg_ensure_campus_message_channel_id für zukünftige Inserts
-- 3. Härtung des RPCs: mark_campus_channel_as_read
-- 4. PostgREST Schema Cache Reload
-- ==============================================================================

-- 1. HISTORISCHE NACHRICHTEN BEREINIGEN
DO $$
DECLARE
    r_group RECORD;
    v_default_chan_id UUID;
BEGIN
    FOR r_group IN SELECT id, school_id FROM public.campus_chat_groups LOOP
        -- Default-Kanal (# allgemein) der Gruppe ermitteln
        SELECT id INTO v_default_chan_id
        FROM public.campus_chat_channels
        WHERE group_id = r_group.id AND is_default = true
        LIMIT 1;

        -- Falls kein Default-Kanal existiert, ersten Kanal nehmen
        IF v_default_chan_id IS NULL THEN
            SELECT id INTO v_default_chan_id
            FROM public.campus_chat_channels
            WHERE group_id = r_group.id
            ORDER BY sort_order ASC, created_at ASC
            LIMIT 1;
        END IF;

        -- Falls immer noch keiner existiert, Standard-Kanäle anlegen
        IF v_default_chan_id IS NULL THEN
            INSERT INTO public.campus_chat_channels (
                school_id, group_id, name, description, icon, is_announcement_only, is_default, sort_order
            ) VALUES (
                r_group.school_id, r_group.id, 'allgemein', 'Austausch für die gesamte Gruppe', 'hash', false, true, 0
            ) RETURNING id INTO v_default_chan_id;

            INSERT INTO public.campus_chat_channels (
                school_id, group_id, name, description, icon, is_announcement_only, is_default, sort_order
            ) VALUES (
                r_group.school_id, r_group.id, 'ankündigungen', 'Wichtige Termine und Durchsagen der Lehrkraft', 'bell', true, false, 1
            );
        END IF;

        -- Alle Nachrichten dieser Gruppe ohne channel_id auf den Standard-Kanal setzen
        UPDATE public.campus_direct_messages
        SET channel_id = v_default_chan_id
        WHERE group_id = r_group.id AND channel_id IS NULL;
    END LOOP;
END;
$$;

-- 2. TRIGGER FÜR ZUKÜNFTIGE INSERTS (FAIL-SAFE KANALZUORDNUNG)
CREATE OR REPLACE FUNCTION public.fn_ensure_campus_message_channel_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_default_chan_id UUID;
BEGIN
    -- Nur für Gruppennachrichten ohne channel_id relevant
    IF NEW.group_id IS NOT NULL AND NEW.channel_id IS NULL THEN
        SELECT id INTO v_default_chan_id
        FROM public.campus_chat_channels
        WHERE group_id = NEW.group_id AND is_default = true
        LIMIT 1;

        IF v_default_chan_id IS NULL THEN
            SELECT id INTO v_default_chan_id
            FROM public.campus_chat_channels
            WHERE group_id = NEW.group_id
            ORDER BY sort_order ASC, created_at ASC
            LIMIT 1;
        END IF;

        NEW.channel_id := v_default_chan_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_campus_message_channel_id ON public.campus_direct_messages;
CREATE TRIGGER trg_ensure_campus_message_channel_id
BEFORE INSERT ON public.campus_direct_messages
FOR EACH ROW
EXECUTE FUNCTION public.fn_ensure_campus_message_channel_id();

-- 3. HÄRTUNG DES AUTORITATIVEN RPCS: mark_campus_channel_as_read
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

    -- Wenn keine anderen ungelesenen Kanäle mehr vorliegen (oder es der einzige Kanal war),
    -- auch die Gruppenmitgliedschaft synchronisieren
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

-- 4. PostgREST Schema Cache Reload
NOTIFY pgrst, 'reload schema';
