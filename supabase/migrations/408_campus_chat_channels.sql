-- ==============================================================================
-- 🏛️ MIGRATION 408: CAMPUS CHAT CHANNELS (TEAMS-STYLE) INTEGRATION
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Fail-Closed / WAI-ARIA AA)
-- ==============================================================================
-- 1. Tabelle: public.campus_chat_channels
-- 2. Schema-Erweiterung: public.campus_direct_messages.channel_id
-- 3. Anti-Rekursions-RLS (SECURITY DEFINER Helper & Policies)
-- 4. Atomare RPCs: create_campus_chat_channel, delete_campus_chat_channel
-- 5. Automatischer Backfill für Bestandskinder (# allgemein & 📢 ankündigungen)
-- 6. Aktualisierung von create_campus_chat_group für automatische Vorbelegung
-- 7. Realtime-Publikation & PostgREST Schema-Cache Reload
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELLE: CAMPUS_CHAT_CHANNELS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campus_chat_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.campus_chat_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL DEFAULT 'message-square',
    is_announcement_only BOOLEAN NOT NULL DEFAULT false,
    is_default BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT campus_chat_channels_group_name_key UNIQUE(group_id, name)
);

-- Indizes für Hochleistungs-Queries
CREATE INDEX IF NOT EXISTS idx_campus_chat_channels_group_order 
ON public.campus_chat_channels(group_id, sort_order ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_campus_chat_channels_school 
ON public.campus_chat_channels(school_id);

-- ------------------------------------------------------------------------------
-- 2. ERWEITERUNG: CAMPUS_DIRECT_MESSAGES.CHANNEL_ID
-- ------------------------------------------------------------------------------
ALTER TABLE public.campus_direct_messages 
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.campus_chat_channels(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_campus_direct_messages_channel_timeline 
ON public.campus_direct_messages(channel_id, created_at DESC) 
WHERE channel_id IS NOT NULL;

-- Realtime aktivieren
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'campus_chat_channels') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_chat_channels;
        END IF;
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. ANTI-REKURSIONS-HELPER (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
-- Helper: Ist User Mitglied der Gruppe, zu der dieser Channel gehört?
CREATE OR REPLACE FUNCTION public.is_campus_chat_channel_member(p_channel_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_group_id UUID;
BEGIN
    IF p_channel_id IS NULL OR p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT group_id INTO v_group_id 
    FROM public.campus_chat_channels 
    WHERE id = p_channel_id;

    IF v_group_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN public.is_campus_chat_group_member(v_group_id, p_user_id) 
        OR public.is_campus_chat_group_creator(v_group_id, p_user_id);
END;
$$;

-- Helper: Liefert die School-ID des Channels
CREATE OR REPLACE FUNCTION public.get_campus_chat_channel_school_id(p_channel_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_school_id UUID;
BEGIN
    IF p_channel_id IS NULL THEN
        RETURN NULL;
    END IF;
    SELECT school_id INTO v_school_id FROM public.campus_chat_channels WHERE id = p_channel_id;
    RETURN v_school_id;
END;
$$;

-- Helper: Darf der User in diesen Channel schreiben?
CREATE OR REPLACE FUNCTION public.can_post_to_campus_chat_channel(p_channel_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_group_id UUID;
    v_is_announcement BOOLEAN;
    v_creator_id UUID;
    v_is_teacher_admin BOOLEAN := false;
BEGIN
    IF p_channel_id IS NULL OR p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT c.group_id, c.is_announcement_only, g.creator_id
    INTO v_group_id, v_is_announcement, v_creator_id
    FROM public.campus_chat_channels c
    JOIN public.campus_chat_groups g ON g.id = c.group_id
    WHERE c.id = p_channel_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Ersteller der Gruppe darf immer schreiben
    IF v_creator_id = p_user_id THEN
        RETURN TRUE;
    END IF;

    -- Lehrer oder Schul-Admin darf immer schreiben
    SELECT (u.role IN ('teacher', 'admin', 'secretary') OR (u.roles IS NOT NULL AND u.roles && ARRAY['teacher', 'admin', 'secretary']::text[]))
    INTO v_is_teacher_admin
    FROM public.users_raw u
    WHERE u.id = p_user_id;

    IF COALESCE(v_is_teacher_admin, false) THEN
        RETURN TRUE;
    END IF;

    -- Wenn Ankündigungskanal, dürfen Schüler nicht frei posten (nur Leserecht bzw. Quick-Chips)
    IF v_is_announcement THEN
        RETURN FALSE;
    END IF;

    -- Normaler Kanal: Jedes Gruppenmitglied darf schreiben
    RETURN public.is_campus_chat_group_member(v_group_id, p_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_campus_chat_channel_member(UUID, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_campus_chat_channel_school_id(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.can_post_to_campus_chat_channel(UUID, UUID) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.campus_chat_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campus_chat_channels_select" ON public.campus_chat_channels;
CREATE POLICY "campus_chat_channels_select" ON public.campus_chat_channels
FOR SELECT TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (
        public.get_current_authenticated_user_id() IS NOT NULL
        AND (
            public.is_campus_chat_group_member(group_id, public.get_current_authenticated_user_id())
            OR public.is_campus_chat_group_creator(group_id, public.get_current_authenticated_user_id())
            OR (public.check_school_access(school_id) AND public.is_teacher_or_admin())
        )
    )
);

DROP POLICY IF EXISTS "campus_chat_channels_mutation" ON public.campus_chat_channels;
CREATE POLICY "campus_chat_channels_mutation" ON public.campus_chat_channels
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (
        public.get_current_authenticated_user_id() IS NOT NULL
        AND (
            public.is_campus_chat_group_creator(group_id, public.get_current_authenticated_user_id())
            OR (public.check_school_access(school_id) AND public.is_teacher_or_admin())
        )
    )
)
WITH CHECK (
    public.is_master_admin()
    OR (
        public.get_current_authenticated_user_id() IS NOT NULL
        AND (
            public.is_campus_chat_group_creator(group_id, public.get_current_authenticated_user_id())
            OR (public.check_school_access(school_id) AND public.is_teacher_or_admin())
        )
    )
);

-- RLS Update auf campus_direct_messages für Channels
DROP POLICY IF EXISTS "campus_direct_messages_tenant_scoped" ON public.campus_direct_messages;
CREATE POLICY "campus_direct_messages_tenant_scoped" ON public.campus_direct_messages
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (
        public.get_current_authenticated_user_id() IS NOT NULL
        AND (
            -- 1:1 Einzelchat
            (group_id IS NULL AND (
                sender_id = public.get_current_authenticated_user_id()
                OR recipient_id = public.get_current_authenticated_user_id()
            ))
            -- Gruppenchat (mit oder ohne Channel)
            OR (group_id IS NOT NULL AND (
                public.is_campus_chat_group_member(group_id, public.get_current_authenticated_user_id())
                OR public.is_campus_chat_group_creator(group_id, public.get_current_authenticated_user_id())
                OR (public.check_school_access(public.get_campus_chat_group_school_id(group_id)) AND public.is_teacher_or_admin())
            ))
        )
    )
)
WITH CHECK (
    public.is_master_admin()
    OR (
        public.get_current_authenticated_user_id() IS NOT NULL
        AND (
            -- 1:1 Einzelchat
            (group_id IS NULL AND (
                sender_id = public.get_current_authenticated_user_id()
            ))
            -- Gruppenchat
            OR (group_id IS NOT NULL AND (
                -- Wenn channel_id gesetzt ist, prüfen wir den Channel-Schreibschutz
                (channel_id IS NOT NULL AND (
                    public.can_post_to_campus_chat_channel(channel_id, public.get_current_authenticated_user_id())
                    -- Quick-Quittierung für Schüler auch in Ankündigungskanälen erlaubt:
                    OR (content LIKE '%Gesehen & notiert%' AND public.is_campus_chat_group_member(group_id, public.get_current_authenticated_user_id()))
                    OR (public.check_school_access(public.get_campus_chat_group_school_id(group_id)) AND public.is_teacher_or_admin())
                ))
                -- Fallback für Legacy-Nachrichten ohne channel_id
                OR (channel_id IS NULL AND (
                    public.can_post_to_campus_chat_group(group_id, public.get_current_authenticated_user_id())
                    OR (public.check_school_access(public.get_campus_chat_group_school_id(group_id)) AND public.is_teacher_or_admin())
                ))
            ))
        )
    )
);

-- ------------------------------------------------------------------------------
-- 5. ATOMARE RPCS: KANAL ERSTELLEN & LÖSCHEN
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_campus_chat_channel(
    p_group_id UUID,
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_icon TEXT DEFAULT 'hash',
    p_is_announcement_only BOOLEAN DEFAULT false
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
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentifizierung erforderlich.';
    END IF;

    -- Gruppe abrufen
    SELECT school_id, creator_id 
    INTO v_school_id, v_creator_id
    FROM public.campus_chat_groups
    WHERE id = p_group_id;

    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'Gruppe nicht gefunden.';
    END IF;

    -- Berechtigungsprüfung: Ersteller der Gruppe ODER Lehrer/Admin der Schule
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

    -- Nächste Sortierreihenfolge bestimmen
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
        sort_order
    ) VALUES (
        v_school_id,
        p_group_id,
        v_clean_name,
        TRIM(p_description),
        COALESCE(NULLIF(p_icon, ''), 'hash'),
        COALESCE(p_is_announcement_only, false),
        false,
        v_next_order
    )
    RETURNING id INTO v_new_channel_id;

    RETURN jsonb_build_object(
        'success', true,
        'channel_id', v_new_channel_id,
        'name', v_clean_name,
        'is_announcement_only', COALESCE(p_is_announcement_only, false)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_campus_chat_channel(UUID, TEXT, TEXT, TEXT, BOOLEAN) 
TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.delete_campus_chat_channel(
    p_channel_id UUID
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
    v_is_default BOOLEAN;
    v_is_authorized BOOLEAN := false;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentifizierung erforderlich.';
    END IF;

    SELECT c.group_id, c.school_id, c.is_default, g.creator_id
    INTO v_group_id, v_school_id, v_is_default, v_creator_id
    FROM public.campus_chat_channels c
    JOIN public.campus_chat_groups g ON g.id = c.group_id
    WHERE c.id = p_channel_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Kanal nicht gefunden.';
    END IF;

    -- Schutz des Hauptkanals
    IF v_is_default THEN
        RAISE EXCEPTION 'Der Standard-Kanal (# allgemein) ist dauerhaft geschützt und kann nicht gelöscht werden.';
    END IF;

    -- Berechtigungsprüfung
    SELECT (
        v_caller_id = v_creator_id
        OR public.is_master_admin()
        OR EXISTS (
            SELECT 1 FROM public.users_raw u
            WHERE u.id = v_caller_id 
              AND u.school_id = v_school_id 
              AND (u.role IN ('admin', 'secretary') OR (u.roles IS NOT NULL AND u.roles && ARRAY['admin', 'secretary']::text[]))
        )
    ) INTO v_is_authorized;

    IF NOT COALESCE(v_is_authorized, false) THEN
        RAISE EXCEPTION 'Keine Berechtigung zum Löschen dieses Kanals.';
    END IF;

    DELETE FROM public.campus_chat_channels WHERE id = p_channel_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_campus_chat_channel(UUID) 
TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 6. AUTOMATISCHER BACKFILL FÜR BESTEHENDE GRUPPEN
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    r_group RECORD;
    v_general_id UUID;
    v_announce_id UUID;
BEGIN
    FOR r_group IN SELECT id, school_id FROM public.campus_chat_groups LOOP
        -- Prüfen, ob Gruppe bereits Kanäle hat
        IF NOT EXISTS (SELECT 1 FROM public.campus_chat_channels WHERE group_id = r_group.id) THEN
            -- 1. Kanal '# allgemein' anlegen
            INSERT INTO public.campus_chat_channels (
                school_id, group_id, name, description, icon, is_announcement_only, is_default, sort_order
            ) VALUES (
                r_group.school_id, r_group.id, 'allgemein', 'Offener Chatraum für alle Gruppenmitglieder', 'message-square', false, true, 0
            ) RETURNING id INTO v_general_id;

            -- 2. Kanal '📢 ankündigungen' anlegen
            INSERT INTO public.campus_chat_channels (
                school_id, group_id, name, description, icon, is_announcement_only, is_default, sort_order
            ) VALUES (
                r_group.school_id, r_group.id, 'ankündigungen', 'Wichtige Termine und Durchsagen der Lehrkraft', 'bell', true, false, 1
            ) RETURNING id INTO v_announce_id;

            -- Historische Nachrichten der Gruppe dem 'allgemein'-Kanal zuordnen
            UPDATE public.campus_direct_messages
            SET channel_id = v_general_id
            WHERE group_id = r_group.id AND channel_id IS NULL;
        END IF;
    END LOOP;
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. AKTUALISIERUNG VON CREATE_CAMPUS_CHAT_GROUP FÜR STANDARDKANÄLE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_campus_chat_group(
    p_name TEXT,
    p_description TEXT,
    p_icon TEXT,
    p_color TEXT,
    p_admin_only_messaging BOOLEAN,
    p_student_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_school_id UUID;
    v_new_group_id UUID;
    v_general_channel_id UUID;
    v_announce_channel_id UUID;
    v_student_id UUID;
    v_members_count INT := 1;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentifizierung erforderlich.';
    END IF;

    -- School-ID des Erstellers ermitteln
    SELECT school_id INTO v_school_id 
    FROM public.users_raw 
    WHERE id = v_caller_id;

    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'Benutzer ist keiner Musikschule zugeordnet.';
    END IF;

    -- Validierung Gruppenname
    IF TRIM(p_name) = '' THEN
        RAISE EXCEPTION 'Gruppenname darf nicht leer sein.';
    END IF;

    -- 1. Gruppe anlegen
    INSERT INTO public.campus_chat_groups (
        school_id,
        name,
        description,
        icon,
        color,
        creator_id,
        admin_only_messaging
    ) VALUES (
        v_school_id,
        TRIM(p_name),
        TRIM(p_description),
        COALESCE(NULLIF(p_icon, ''), 'music'),
        COALESCE(NULLIF(p_color, ''), '#34a853'),
        v_caller_id,
        COALESCE(p_admin_only_messaging, false)
    )
    RETURNING id INTO v_new_group_id;

    -- 2. Ersteller als 'creator' eintragen
    INSERT INTO public.campus_chat_group_members (
        school_id,
        group_id,
        user_id,
        role
    ) VALUES (
        v_school_id,
        v_new_group_id,
        v_caller_id,
        'creator'
    );

    -- 3. Ausgewählte Schüler als 'member' eintragen
    IF p_student_ids IS NOT NULL AND array_length(p_student_ids, 1) > 0 THEN
        FOREACH v_student_id IN ARRAY p_student_ids LOOP
            IF v_student_id <> v_caller_id THEN
                -- Verifizieren, dass der Schüler zur gleichen Schule gehört
                IF EXISTS (SELECT 1 FROM public.users_raw WHERE id = v_student_id AND school_id = v_school_id) THEN
                    INSERT INTO public.campus_chat_group_members (
                        school_id,
                        group_id,
                        user_id,
                        role
                    ) VALUES (
                        v_school_id,
                        v_new_group_id,
                        v_student_id,
                        'member'
                    ) ON CONFLICT (group_id, user_id) DO NOTHING;
                    v_members_count := v_members_count + 1;
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- 4. Standardkanäle anlegen
    -- a) '# allgemein'
    INSERT INTO public.campus_chat_channels (
        school_id, group_id, name, description, icon, is_announcement_only, is_default, sort_order
    ) VALUES (
        v_school_id, v_new_group_id, 'allgemein', 'Offener Austausch für alle Gruppenmitglieder', 'message-square', false, true, 0
    ) RETURNING id INTO v_general_channel_id;

    -- b) '📢 ankündigungen'
    INSERT INTO public.campus_chat_channels (
        school_id, group_id, name, description, icon, is_announcement_only, is_default, sort_order
    ) VALUES (
        v_school_id, v_new_group_id, 'ankündigungen', 'Wichtige Termine und Durchsagen der Lehrkraft', 'bell', true, false, 1
    ) RETURNING id INTO v_announce_channel_id;

    -- 5. Willkommens-/Initial-Systemnachricht in den 'allgemein'-Kanal eintragen
    INSERT INTO public.campus_direct_messages (
        group_id,
        channel_id,
        sender_id,
        recipient_id,
        content,
        created_at
    ) VALUES (
        v_new_group_id,
        v_general_channel_id,
        v_caller_id,
        v_caller_id,
        'Gruppe „' || TRIM(p_name) || '“ wurde erstellt.',
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'group_id', v_new_group_id,
        'general_channel_id', v_general_channel_id,
        'announce_channel_id', v_announce_channel_id,
        'members_count', v_members_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_campus_chat_group(TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID[]) 
TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 8. SCHEMA CACHE RELOAD
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
