-- ==============================================================================
-- 🏛️ MIGRATION 409: CAMPUS CHAT THREADS, TOPICS & EMOJI REACTIONS
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Fail-Closed / WAI-ARIA AA)
-- ==============================================================================
-- 1. Schema-Erweiterung: campus_chat_channels (channel_type, allow_student_topics)
-- 2. Schema-Erweiterung: campus_direct_messages (subject, parent_message_id)
-- 3. Tabelle: campus_message_reactions
-- 4. Indizes & Realtime Publication
-- 5. Anti-Rekursions-RLS für campus_message_reactions
-- 6. Atomare RPCs: 
--    - toggle_campus_message_reaction
--    - update_campus_chat_channel_settings
--    - Aktualisiertes create_campus_chat_channel
-- 7. PostgREST Cache Reload
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SCHEMA-ERWEITERUNG: CAMPUS_CHAT_CHANNELS
-- ------------------------------------------------------------------------------
ALTER TABLE public.campus_chat_channels 
ADD COLUMN IF NOT EXISTS channel_type TEXT NOT NULL DEFAULT 'threads' 
CHECK (channel_type IN ('chat', 'threads'));

ALTER TABLE public.campus_chat_channels 
ADD COLUMN IF NOT EXISTS allow_student_topics BOOLEAN NOT NULL DEFAULT false;

-- Bestehende Kanäle stabil auf 'chat' belassen (Rückwärtskompatibilität gem. Grill-Me Konsens)
UPDATE public.campus_chat_channels 
SET channel_type = 'chat' 
WHERE is_default = true OR created_at < now();

-- ------------------------------------------------------------------------------
-- 2. SCHEMA-ERWEITERUNG: CAMPUS_DIRECT_MESSAGES
-- ------------------------------------------------------------------------------
ALTER TABLE public.campus_direct_messages 
ADD COLUMN IF NOT EXISTS subject TEXT;

ALTER TABLE public.campus_direct_messages 
ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES public.campus_direct_messages(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_campus_direct_messages_parent_thread 
ON public.campus_direct_messages(parent_message_id, created_at ASC) 
WHERE parent_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campus_direct_messages_subject 
ON public.campus_direct_messages(channel_id, created_at DESC) 
WHERE subject IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 3. TABELLE: CAMPUS_MESSAGE_REACTIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campus_message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES public.campus_direct_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL CHECK (emoji IN ('👍', '❤️', '🎵', '👏', '🔥', '🚀')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT campus_message_reactions_unique UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_campus_message_reactions_msg 
ON public.campus_message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_campus_message_reactions_user 
ON public.campus_message_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_campus_message_reactions_school 
ON public.campus_message_reactions(school_id);

-- Realtime aktivieren
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'campus_message_reactions') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_message_reactions;
        END IF;
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) FOR REACTIONS
-- ------------------------------------------------------------------------------
ALTER TABLE public.campus_message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campus_message_reactions_select" ON public.campus_message_reactions;
CREATE POLICY "campus_message_reactions_select" ON public.campus_message_reactions
FOR SELECT TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (
        public.get_current_authenticated_user_id() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.campus_direct_messages m
            WHERE m.id = campus_message_reactions.message_id
              AND (
                  (m.group_id IS NOT NULL AND (
                      public.is_campus_chat_group_member(m.group_id, public.get_current_authenticated_user_id())
                      OR public.is_campus_chat_group_creator(m.group_id, public.get_current_authenticated_user_id())
                      OR (public.check_school_access(campus_message_reactions.school_id) AND public.is_teacher_or_admin())
                  ))
                  OR (m.group_id IS NULL AND (
                      m.sender_id = public.get_current_authenticated_user_id()
                      OR m.recipient_id = public.get_current_authenticated_user_id()
                  ))
              )
        )
    )
);

DROP POLICY IF EXISTS "campus_message_reactions_mutation" ON public.campus_message_reactions;
CREATE POLICY "campus_message_reactions_mutation" ON public.campus_message_reactions
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR user_id = public.get_current_authenticated_user_id()
)
WITH CHECK (
    public.is_master_admin()
    OR user_id = public.get_current_authenticated_user_id()
);

-- ------------------------------------------------------------------------------
-- 5. ATOMARE RPCS (SECURITY DEFINER / FAIL-CLOSED)
-- ------------------------------------------------------------------------------

-- RPC: toggle_campus_message_reaction
CREATE OR REPLACE FUNCTION public.toggle_campus_message_reaction(
    p_message_id UUID,
    p_emoji TEXT
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
    v_sender_id UUID;
    v_recipient_id UUID;
    v_existing_id UUID;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentifizierung erforderlich.';
    END IF;

    -- Erlaubte Emojis prüfen
    IF p_emoji NOT IN ('👍', '❤️', '🎵', '👏', '🔥', '🚀') THEN
        RAISE EXCEPTION 'Ungültiges Emoji. Erlaubt sind: 👍, ❤️, 🎵, 👏, 🔥, 🚀';
    END IF;

    -- Nachricht & Schulzugehörigkeit abrufen
    SELECT school_id, group_id, sender_id, recipient_id
    INTO v_school_id, v_group_id, v_sender_id, v_recipient_id
    FROM public.campus_direct_messages
    WHERE id = p_message_id;

    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'Nachricht nicht gefunden.';
    END IF;

    -- Zugriffsberechtigung prüfen
    IF v_group_id IS NOT NULL THEN
        IF NOT (
            public.is_campus_chat_group_member(v_group_id, v_caller_id)
            OR public.is_campus_chat_group_creator(v_group_id, v_caller_id)
            OR public.is_master_admin()
            OR (public.check_school_access(v_school_id) AND public.is_teacher_or_admin())
        ) THEN
            RAISE EXCEPTION 'Keine Berechtigung zur Reaktion auf diese Nachricht.';
        END IF;
    ELSE
        IF NOT (
            v_caller_id = v_sender_id 
            OR v_caller_id = v_recipient_id 
            OR public.is_master_admin()
        ) THEN
            RAISE EXCEPTION 'Keine Berechtigung zur Reaktion auf diese private Nachricht.';
        END IF;
    END IF;

    -- Prüfen, ob Reaktion bereits existiert
    SELECT id INTO v_existing_id
    FROM public.campus_message_reactions
    WHERE message_id = p_message_id 
      AND user_id = v_caller_id 
      AND emoji = p_emoji;

    IF v_existing_id IS NOT NULL THEN
        -- Reaktion entfernen (Toggle OFF)
        DELETE FROM public.campus_message_reactions WHERE id = v_existing_id;
        RETURN jsonb_build_object(
            'success', true,
            'action', 'removed',
            'message_id', p_message_id,
            'emoji', p_emoji,
            'user_id', v_caller_id
        );
    ELSE
        -- Reaktion hinzufügen (Toggle ON)
        INSERT INTO public.campus_message_reactions (
            school_id,
            message_id,
            user_id,
            emoji
        ) VALUES (
            v_school_id,
            p_message_id,
            v_caller_id,
            p_emoji
        );
        RETURN jsonb_build_object(
            'success', true,
            'action', 'added',
            'message_id', p_message_id,
            'emoji', p_emoji,
            'user_id', v_caller_id
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_campus_message_reaction(UUID, TEXT) TO authenticated, anon, service_role;

-- RPC: create_campus_chat_channel (überladen / aktualisiert)
CREATE OR REPLACE FUNCTION public.create_campus_chat_channel(
    p_group_id UUID,
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_icon TEXT DEFAULT 'hash',
    p_is_announcement_only BOOLEAN DEFAULT false,
    p_channel_type TEXT DEFAULT 'threads',
    p_allow_student_topics BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_school_id UUID;
    v_creator_id UUID;
    v_clean_name TEXT;
    v_next_order INT;
    v_new_channel_id UUID;
    v_is_authorized BOOLEAN := false;
    v_type TEXT;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentifizierung erforderlich.';
    END IF;

    SELECT school_id, creator_id 
    INTO v_school_id, v_creator_id
    FROM public.campus_chat_groups
    WHERE id = p_group_id;

    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'Gruppe nicht gefunden.';
    END IF;

    SELECT (
        v_caller_id = v_creator_id
        OR public.is_master_admin()
        OR EXISTS (
            SELECT 1 FROM public.users_raw u
            WHERE u.id = v_caller_id 
              AND u.school_id = v_school_id 
              AND (u.role IN ('admin', 'secretary', 'teacher') OR (u.roles IS NOT NULL AND u.roles && ARRAY['admin', 'secretary', 'teacher']::text[]))
        )
    ) INTO v_is_authorized;

    IF NOT COALESCE(v_is_authorized, false) THEN
        RAISE EXCEPTION 'Keine Berechtigung zum Anlegen von Kanälen in dieser Gruppe.';
    END IF;

    v_clean_name := LOWER(TRIM(p_name));
    IF v_clean_name = '' THEN
        RAISE EXCEPTION 'Kanalname darf nicht leer sein.';
    END IF;

    v_type := CASE WHEN p_channel_type = 'chat' THEN 'chat' ELSE 'threads' END;

    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_next_order
    FROM public.campus_chat_channels
    WHERE group_id = p_group_id;

    INSERT INTO public.campus_chat_channels (
        school_id,
        group_id,
        name,
        description,
        icon,
        is_announcement_only,
        is_default,
        sort_order,
        channel_type,
        allow_student_topics
    ) VALUES (
        v_school_id,
        p_group_id,
        v_clean_name,
        TRIM(p_description),
        COALESCE(NULLIF(p_icon, ''), 'hash'),
        COALESCE(p_is_announcement_only, false),
        false,
        v_next_order,
        v_type,
        COALESCE(p_allow_student_topics, false)
    )
    RETURNING id INTO v_new_channel_id;

    RETURN jsonb_build_object(
        'success', true,
        'channel_id', v_new_channel_id,
        'name', v_clean_name,
        'channel_type', v_type,
        'allow_student_topics', COALESCE(p_allow_student_topics, false),
        'is_announcement_only', COALESCE(p_is_announcement_only, false)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_campus_chat_channel(UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, BOOLEAN) 
TO authenticated, anon, service_role;

-- RPC: update_campus_chat_channel_settings
CREATE OR REPLACE FUNCTION public.update_campus_chat_channel_settings(
    p_channel_id UUID,
    p_channel_type TEXT,
    p_allow_student_topics BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_group_id UUID;
    v_school_id UUID;
    v_creator_id UUID;
    v_is_authorized BOOLEAN := false;
    v_type TEXT;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentifizierung erforderlich.';
    END IF;

    SELECT c.group_id, c.school_id, g.creator_id
    INTO v_group_id, v_school_id, v_creator_id
    FROM public.campus_chat_channels c
    JOIN public.campus_chat_groups g ON g.id = c.group_id
    WHERE c.id = p_channel_id;

    IF v_group_id IS NULL THEN
        RAISE EXCEPTION 'Kanal nicht gefunden.';
    END IF;

    SELECT (
        v_caller_id = v_creator_id
        OR public.is_master_admin()
        OR EXISTS (
            SELECT 1 FROM public.users_raw u
            WHERE u.id = v_caller_id 
              AND u.school_id = v_school_id 
              AND (u.role IN ('admin', 'secretary', 'teacher') OR (u.roles IS NOT NULL AND u.roles && ARRAY['admin', 'secretary', 'teacher']::text[]))
        )
    ) INTO v_is_authorized;

    IF NOT COALESCE(v_is_authorized, false) THEN
        RAISE EXCEPTION 'Keine Berechtigung zur Änderung der Kanaleinstellungen.';
    END IF;

    v_type := CASE WHEN p_channel_type = 'chat' THEN 'chat' ELSE 'threads' END;

    UPDATE public.campus_chat_channels
    SET 
        channel_type = v_type,
        allow_student_topics = COALESCE(p_allow_student_topics, false),
        updated_at = now()
    WHERE id = p_channel_id;

    RETURN jsonb_build_object(
        'success', true,
        'channel_id', p_channel_id,
        'channel_type', v_type,
        'allow_student_topics', COALESCE(p_allow_student_topics, false)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_campus_chat_channel_settings(UUID, TEXT, BOOLEAN) 
TO authenticated, anon, service_role;

-- PostgREST Cache Reload
NOTIFY pgrst, 'reload schema';
