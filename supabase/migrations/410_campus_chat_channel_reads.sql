-- ==============================================================================
-- 🏛️ MIGRATION 410: CAMPUS CHAT CHANNEL READS & NOTIFICATION GOLDSTANDARD
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Fail-Closed / WAI-ARIA AA)
-- ==============================================================================
-- 1. Tabelle: campus_chat_channel_reads (Chirurgisches Leseprotokoll pro Kanal)
-- 2. Indizes & Realtime-Publikation
-- 3. Row Level Security (RLS) & Tenant-Scoping
-- 4. Atomarer RPC: mark_campus_channel_as_read
-- 5. PostgREST Cache Reload
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELLE: CAMPUS_CHAT_CHANNEL_READS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campus_chat_channel_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.campus_chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT campus_chat_channel_reads_unique UNIQUE(channel_id, user_id)
);

-- Indizes für Hochgeschwindigkeits-Lookup
CREATE INDEX IF NOT EXISTS idx_campus_chat_channel_reads_user_chan 
ON public.campus_chat_channel_reads(user_id, channel_id);

CREATE INDEX IF NOT EXISTS idx_campus_chat_channel_reads_school 
ON public.campus_chat_channel_reads(school_id);

-- Realtime aktivieren für sofortige Cross-Device-Synchronisation
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'campus_chat_channel_reads') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_chat_channel_reads;
        END IF;
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.campus_chat_channel_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campus_chat_channel_reads_select" ON public.campus_chat_channel_reads;
CREATE POLICY "campus_chat_channel_reads_select" ON public.campus_chat_channel_reads
FOR SELECT TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR user_id = public.get_current_authenticated_user_id()
    OR (
        public.get_current_authenticated_user_id() IS NOT NULL
        AND public.check_school_access(school_id)
        AND public.is_teacher_or_admin()
    )
);

DROP POLICY IF EXISTS "campus_chat_channel_reads_mutation" ON public.campus_chat_channel_reads;
CREATE POLICY "campus_chat_channel_reads_mutation" ON public.campus_chat_channel_reads
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
-- 3. ATOMARER RPC: mark_campus_channel_as_read
-- ------------------------------------------------------------------------------
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

    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'Kanal nicht gefunden.';
    END IF;

    -- Berechtigung prüfen: Mitglied oder Creator der Gruppe
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

    -- 2. Auch Gruppenmitgliedschaft synchronisieren
    UPDATE public.campus_chat_group_members
    SET last_read_at = v_now
    WHERE group_id = v_group_id AND user_id = v_caller_id;

    RETURN jsonb_build_object(
        'success', true,
        'channel_id', p_channel_id,
        'group_id', v_group_id,
        'user_id', v_caller_id,
        'last_read_at', v_now
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_campus_channel_as_read(UUID) TO authenticated, anon, service_role;

-- PostgREST Cache Reload
NOTIFY pgrst, 'reload schema';
