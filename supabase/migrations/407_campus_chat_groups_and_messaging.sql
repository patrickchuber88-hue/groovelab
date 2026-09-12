-- ==============================================================================
-- 🏛️ MIGRATION 407: CAMPUS CHAT GROUPS & GROUP MESSAGING INTEGRATION
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Fail-Closed / § 8a SGB VIII)
-- ==============================================================================
-- 1. Tabellen: campus_chat_groups & campus_chat_group_members
-- 2. Schema-Erweiterung: campus_direct_messages.group_id
-- 3. RLS-Policies & Tenant Scoping (school_id)
-- 4. Server-Side Atomic RPCs: create_campus_chat_group, leave_campus_chat_group
-- 5. Realtime-Publikation für Instant-Updates
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELLE: CAMPUS_CHAT_GROUPS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campus_chat_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL DEFAULT 'music',
    color TEXT NOT NULL DEFAULT '#34a853',
    creator_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    admin_only_messaging BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. TABELLE: CAMPUS_CHAT_GROUP_MEMBERS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campus_chat_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.campus_chat_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('creator', 'admin', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_read_at TIMESTAMPTZ,
    CONSTRAINT campus_chat_group_members_unique UNIQUE(group_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 3. ERWEITERUNG: CAMPUS_DIRECT_MESSAGES.GROUP_ID
-- ------------------------------------------------------------------------------
ALTER TABLE public.campus_direct_messages 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.campus_chat_groups(id) ON DELETE CASCADE;

-- Indizes für maximale Performance
CREATE INDEX IF NOT EXISTS idx_campus_chat_groups_school_active 
ON public.campus_chat_groups(school_id, is_archived, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campus_chat_group_members_lookup 
ON public.campus_chat_group_members(user_id, group_id);

CREATE INDEX IF NOT EXISTS idx_campus_chat_group_members_group 
ON public.campus_chat_group_members(group_id, role);

CREATE INDEX IF NOT EXISTS idx_campus_direct_messages_group_timeline 
ON public.campus_direct_messages(group_id, created_at DESC) 
WHERE group_id IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 4. REALTIME PUBLICATION SCOPING
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'campus_chat_groups') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_chat_groups;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'campus_chat_group_members') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_chat_group_members;
        END IF;
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) & HELPER FUNCTIONS (ANTI-RECURSION GUARANTEE)
-- ------------------------------------------------------------------------------
ALTER TABLE public.campus_chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_chat_group_members ENABLE ROW LEVEL SECURITY;

-- Helper 1: is_campus_chat_group_member (SECURITY DEFINER runs as owner, avoiding RLS recursion)
CREATE OR REPLACE FUNCTION public.is_campus_chat_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF p_group_id IS NULL OR p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.campus_chat_group_members
        WHERE group_id = p_group_id AND user_id = p_user_id
    );
END;
$$;

-- Helper 2: is_campus_chat_group_creator (SECURITY DEFINER runs as owner, avoiding RLS recursion)
CREATE OR REPLACE FUNCTION public.is_campus_chat_group_creator(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF p_group_id IS NULL OR p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.campus_chat_groups
        WHERE id = p_group_id AND creator_id = p_user_id
    );
END;
$$;

-- Helper 3: can_post_to_campus_chat_group (SECURITY DEFINER checks admin_only_messaging)
CREATE OR REPLACE FUNCTION public.can_post_to_campus_chat_group(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_creator_id UUID;
    v_admin_only BOOLEAN;
    v_member_role TEXT;
BEGIN
    IF p_group_id IS NULL OR p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT creator_id, admin_only_messaging 
    INTO v_creator_id, v_admin_only
    FROM public.campus_chat_groups
    WHERE id = p_group_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF v_creator_id = p_user_id THEN
        RETURN TRUE;
    END IF;

    SELECT role INTO v_member_role
    FROM public.campus_chat_group_members
    WHERE group_id = p_group_id AND user_id = p_user_id;

    IF v_member_role IS NULL THEN
        RETURN FALSE;
    END IF;

    IF NOT v_admin_only THEN
        RETURN TRUE;
    END IF;

    RETURN v_member_role IN ('creator', 'admin');
END;
$$;

-- Helper 4: get_campus_chat_group_school_id (SECURITY DEFINER returns group school_id)
CREATE OR REPLACE FUNCTION public.get_campus_chat_group_school_id(p_group_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_school_id UUID;
BEGIN
    IF p_group_id IS NULL THEN
        RETURN NULL;
    END IF;
    SELECT school_id INTO v_school_id FROM public.campus_chat_groups WHERE id = p_group_id;
    RETURN v_school_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_campus_chat_group_member(UUID, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_campus_chat_group_creator(UUID, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.can_post_to_campus_chat_group(UUID, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_campus_chat_group_school_id(UUID) TO authenticated, anon, service_role;

-- Policies for campus_chat_groups
DROP POLICY IF EXISTS "campus_chat_groups_tenant_select" ON public.campus_chat_groups;
CREATE POLICY "campus_chat_groups_tenant_select" ON public.campus_chat_groups
FOR SELECT TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (
        public.get_current_authenticated_user_id() IS NOT NULL
        AND (
            creator_id = public.get_current_authenticated_user_id()
            OR public.is_campus_chat_group_member(id, public.get_current_authenticated_user_id())
            OR (public.check_school_access(school_id) AND public.is_teacher_or_admin())
        )
    )
);

DROP POLICY IF EXISTS "campus_chat_groups_mutation" ON public.campus_chat_groups;
CREATE POLICY "campus_chat_groups_mutation" ON public.campus_chat_groups
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (
        public.get_current_authenticated_user_id() IS NOT NULL
        AND (
            creator_id = public.get_current_authenticated_user_id()
            OR (public.check_school_access(school_id) AND public.is_teacher_or_admin())
        )
    )
)
WITH CHECK (
    public.is_master_admin()
    OR (
        public.get_current_authenticated_user_id() IS NOT NULL
        AND (
            creator_id = public.get_current_authenticated_user_id()
            OR (public.check_school_access(school_id) AND public.is_teacher_or_admin())
        )
    )
);

-- Policies for campus_chat_group_members
DROP POLICY IF EXISTS "campus_chat_group_members_select" ON public.campus_chat_group_members;
CREATE POLICY "campus_chat_group_members_select" ON public.campus_chat_group_members
FOR SELECT TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (
        public.get_current_authenticated_user_id() IS NOT NULL
        AND (
            user_id = public.get_current_authenticated_user_id()
            OR public.is_campus_chat_group_creator(group_id, public.get_current_authenticated_user_id())
            OR public.is_campus_chat_group_member(group_id, public.get_current_authenticated_user_id())
            OR (public.check_school_access(school_id) AND public.is_teacher_or_admin())
        )
    )
);

DROP POLICY IF EXISTS "campus_chat_group_members_mutation" ON public.campus_chat_group_members;
CREATE POLICY "campus_chat_group_members_mutation" ON public.campus_chat_group_members
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (
        public.get_current_authenticated_user_id() IS NOT NULL
        AND (
            user_id = public.get_current_authenticated_user_id()
            OR public.is_campus_chat_group_creator(group_id, public.get_current_authenticated_user_id())
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

-- RLS-Harmonisierung auf campus_direct_messages für Gruppen-Chats
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
            -- Gruppenchat
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
                public.can_post_to_campus_chat_group(group_id, public.get_current_authenticated_user_id())
                OR (public.check_school_access(public.get_campus_chat_group_school_id(group_id)) AND public.is_teacher_or_admin())
            ))
        )
    )
);

-- ------------------------------------------------------------------------------
-- 6. ATOMIC SERVER RPCS: CREATE & LEAVE GROUP
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
    v_student_id UUID;
    v_caller_role TEXT;
    v_members_count INTEGER := 1;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentifizierung erforderlich.';
    END IF;

    -- Caller Schul-ID ermitteln
    SELECT school_id, COALESCE(role, 'teacher')
    INTO v_school_id, v_caller_role
    FROM public.users_raw
    WHERE id = v_caller_id;

    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'Keine gültige Musikschule für den Aufrufer gefunden.';
    END IF;

    IF TRIM(p_name) IS NULL OR TRIM(p_name) = '' THEN
        RAISE EXCEPTION 'Ein Gruppenname ist zwingend erforderlich.';
    END IF;

    -- Gruppe anlegen
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
        NULLIF(TRIM(p_description), ''),
        COALESCE(NULLIF(TRIM(p_icon), ''), 'music'),
        COALESCE(NULLIF(TRIM(p_color), ''), '#34a853'),
        v_caller_id,
        COALESCE(p_admin_only_messaging, false)
    )
    RETURNING id INTO v_new_group_id;

    -- Ersteller als 'creator' eintragen
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

    -- Ausgewählte Schüler hinzufügen
    IF p_student_ids IS NOT NULL AND array_length(p_student_ids, 1) > 0 THEN
        FOREACH v_student_id IN ARRAY p_student_ids
        LOOP
            IF v_student_id <> v_caller_id THEN
                -- Sicherstellen, dass der Schüler zur gleichen Schule gehört
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

    -- Willkommens-/Initial-Systemnachricht in campus_direct_messages eintragen
    INSERT INTO public.campus_direct_messages (
        group_id,
        sender_id,
        recipient_id,
        content,
        created_at
    ) VALUES (
        v_new_group_id,
        v_caller_id,
        v_caller_id,
        'Gruppe „' || TRIM(p_name) || '“ wurde erstellt.',
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'group_id', v_new_group_id,
        'members_count', v_members_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_campus_chat_group(TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID[]) 
TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.leave_campus_chat_group(
    p_group_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_is_authorized BOOLEAN := false;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentifizierung erforderlich.';
    END IF;

    -- Berechtigungsprüfung:
    -- Caller ist die Lehrkraft/Ersteller der Gruppe ODER Admin ODER betroffener User selbst (z. B. via Elternportal)
    SELECT (
        v_caller_id = p_user_id
        OR g.creator_id = v_caller_id
        OR public.is_master_admin()
        OR EXISTS (
            SELECT 1 FROM public.users_raw u
            WHERE u.id = v_caller_id AND (u.role IN ('admin', 'secretary') OR (u.roles IS NOT NULL AND u.roles && ARRAY['admin', 'secretary']::text[]))
        )
    )
    INTO v_is_authorized
    FROM public.campus_chat_groups g
    WHERE g.id = p_group_id;

    IF NOT COALESCE(v_is_authorized, false) THEN
        RAISE EXCEPTION 'Keine Berechtigung zum Verlassen oder Entfernen aus dieser Gruppe.';
    END IF;

    DELETE FROM public.campus_chat_group_members
    WHERE group_id = p_group_id AND user_id = p_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_campus_chat_group(UUID, UUID) 
TO authenticated, anon, service_role;

-- PostgREST Schema Cache Reload
NOTIFY pgrst, 'reload schema';
