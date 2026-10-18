-- ==============================================================================
-- 🏛️ MIGRATION 584: 0,1% ENTERPRISE READ RECEIPTS, STATUS TICKS & AUDIT PARITY
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / § 130 BGB / ArbSchG / Fail-Closed)
-- ==============================================================================
-- 1. Schema-Erweiterung campus_direct_messages: status ('sending', 'sent', 'delivered', 'read') & delivered_at
-- 2. Granulare Tabelle campus_message_receipts für Gruppen- & 1:1 Empfangs- und Lesebelege
-- 3. Autoritativer Batch-RPC: mark_messages_read_batch(p_message_ids UUID[], p_user_id UUID)
-- 4. Härtung mark_campus_direct_chat_as_read: Setzt garantiert read_at = now() & status = 'read'
-- 5. Härtung mark_campus_group_as_read & mark_campus_channel_as_read für NULL-Channel-IDs
-- 6. PostgREST Schema-Reload
-- ==============================================================================

-- 1. TABELLENERWEITERUNG: CAMPUS_DIRECT_MESSAGES
ALTER TABLE public.campus_direct_messages
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ DEFAULT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_campus_direct_messages_status' 
          AND conrelid = 'public.campus_direct_messages'::regclass
    ) THEN
        ALTER TABLE public.campus_direct_messages
        ADD CONSTRAINT chk_campus_direct_messages_status
        CHECK (status IN ('sending', 'sent', 'delivered', 'read'));
    END IF;
END $$;

-- Backfill bestehender Nachrichten
UPDATE public.campus_direct_messages
SET status = 'read',
    read_at = COALESCE(read_at, created_at)
WHERE is_read = true AND status != 'read';

CREATE INDEX IF NOT EXISTS idx_campus_direct_messages_status 
  ON public.campus_direct_messages(recipient_id, status) WHERE status != 'read';

-- ------------------------------------------------------------------------------
-- 2. GRANULARE EMPFANGS- & LESEBELEGE: CAMPUS_MESSAGE_RECEIPTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campus_message_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES public.campus_direct_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('delivered', 'read')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_campus_message_receipt UNIQUE (message_id, user_id, status)
);

CREATE INDEX IF NOT EXISTS idx_campus_message_receipts_msg_status 
  ON public.campus_message_receipts(message_id, status);
CREATE INDEX IF NOT EXISTS idx_campus_message_receipts_user 
  ON public.campus_message_receipts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_campus_message_receipts_school 
  ON public.campus_message_receipts(school_id);

ALTER TABLE public.campus_message_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campus_message_receipts_select" ON public.campus_message_receipts;
CREATE POLICY "campus_message_receipts_select" ON public.campus_message_receipts
    FOR SELECT TO authenticated, anon, service_role
    USING (
        public.is_master_admin() 
        OR user_id = auth.uid() 
        OR school_id = public.get_current_user_school_id()
    );

DROP POLICY IF EXISTS "campus_message_receipts_mutation" ON public.campus_message_receipts;
CREATE POLICY "campus_message_receipts_mutation" ON public.campus_message_receipts
    FOR ALL TO authenticated, anon, service_role
    USING (
        user_id = auth.uid() 
        OR public.is_master_admin() 
        OR public.is_teacher_or_admin()
        OR (school_id = public.get_current_user_school_id())
    );

-- ------------------------------------------------------------------------------
-- 3. AUTORITATIVER BATCH-RPC: mark_messages_read_batch
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_messages_read_batch(
    p_message_ids UUID[],
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_target_user_id UUID;
    v_now TIMESTAMPTZ := now();
    v_updated_count INT := 0;
    v_school_id UUID;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();

    IF p_user_id IS NOT NULL THEN
        IF v_caller_id IS NULL 
           OR v_caller_id = p_user_id 
           OR public.is_master_admin() 
           OR public.is_teacher_or_admin()
           OR EXISTS (SELECT 1 FROM public.users_raw WHERE id = p_user_id AND school_id = public.get_current_user_school_id()) THEN
            v_target_user_id := p_user_id;
        ELSE
            RAISE EXCEPTION 'Nicht autorisiert, Lesestatus für diesen Benutzer zu ändern.';
        END IF;
    ELSE
        v_target_user_id := v_caller_id;
    END IF;

    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentifizierung erforderlich.';
    END IF;

    SELECT school_id INTO v_school_id
    FROM public.users_raw
    WHERE id = v_target_user_id;

    -- 1. 1:1 Direktnachrichten aktualisieren
    UPDATE public.campus_direct_messages
    SET status = 'read',
        read_at = COALESCE(read_at, v_now),
        is_read = true
    WHERE id = ANY(p_message_ids)
      AND recipient_id = v_target_user_id
      AND (status != 'read' OR is_read = false);

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    -- 2. Receipt-Einträge für Gruppen oder Audit schreiben
    INSERT INTO public.campus_message_receipts (
        school_id, message_id, user_id, status, timestamp
    )
    SELECT COALESCE(m.school_id, v_school_id), m.id, v_target_user_id, 'read', v_now
    FROM public.campus_direct_messages m
    WHERE m.id = ANY(p_message_ids)
      AND (m.recipient_id = v_target_user_id OR m.group_id IS NOT NULL)
      AND m.sender_id != v_target_user_id
    ON CONFLICT (message_id, user_id, status) 
    DO UPDATE SET timestamp = EXCLUDED.timestamp;

    -- 3. Revisionssicheres Audit-Logging gem. § 130 BGB / GoBD
    IF v_updated_count > 0 THEN
        INSERT INTO public.audit_logs (
            school_id, user_id, action, details
        ) VALUES (
            v_school_id,
            v_target_user_id,
            'QUITTUNG_LESEBESTAETIGUNG',
            jsonb_build_object(
                'type', 'batch_viewport_read',
                'message_ids_count', array_length(p_message_ids, 1),
                'updated_direct_count', v_updated_count,
                'read_at', v_now,
                'legal_basis', '§ 130 BGB / GoBD'
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_target_user_id,
        'updated_count', v_updated_count,
        'read_at', v_now
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_messages_read_batch(UUID[], UUID) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 4. HÄRTUNG: mark_campus_direct_chat_as_read (setzt garantiert read_at & status)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_campus_direct_chat_as_read(
    p_partner_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_target_user_id UUID;
    v_count INT := 0;
    v_school_id UUID;
    v_now TIMESTAMPTZ := now();
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();

    SELECT school_id INTO v_school_id
    FROM public.users_raw
    WHERE id = p_partner_id;

    IF p_user_id IS NOT NULL THEN
        IF v_caller_id IS NULL 
           OR v_caller_id = p_user_id 
           OR public.is_master_admin() 
           OR (v_school_id IS NOT NULL AND public.check_school_access(v_school_id) AND public.is_teacher_or_admin())
           OR (v_school_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.users_raw WHERE id = p_user_id AND school_id = v_school_id)) THEN
            v_target_user_id := p_user_id;
        ELSE
            RAISE EXCEPTION 'Nicht autorisiert, Lesestatus für diesen Benutzer zu ändern.';
        END IF;
    ELSE
        v_target_user_id := v_caller_id;
    END IF;

    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentifizierung erforderlich.';
    END IF;

    -- Alle ungelesenen Direktnachrichten des Partners als gelesen markieren inkl. status & read_at
    UPDATE public.campus_direct_messages
    SET is_read = true,
        status = 'read',
        read_at = COALESCE(read_at, v_now)
    WHERE group_id IS NULL
      AND sender_id = p_partner_id
      AND recipient_id = v_target_user_id
      AND (is_read = false OR status != 'read');

    GET DIAGNOSTICS v_count = ROW_COUNT;

    IF v_count > 0 THEN
        INSERT INTO public.audit_logs (
            school_id,
            user_id,
            action,
            details
        ) VALUES (
            v_school_id,
            v_target_user_id,
            'QUITTUNG_LESEBESTAETIGUNG',
            jsonb_build_object(
                'type', 'direct_chat_read',
                'partner_id', p_partner_id,
                'user_id', v_target_user_id,
                'messages_marked_read', v_count,
                'read_at', v_now,
                'legal_basis', '§ 130 BGB / GoBD'
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'partner_id', p_partner_id,
        'user_id', v_target_user_id,
        'updated_count', v_count,
        'read_at', v_now
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_campus_direct_chat_as_read(UUID, UUID) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 5. HÄRTUNG: mark_campus_group_as_read (Garantiert Aktualisierung bei NULL-Channels)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_campus_group_as_read(
    p_group_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_target_user_id UUID;
    v_school_id UUID;
    v_now TIMESTAMPTZ := now();
    v_channel RECORD;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();

    SELECT g.school_id INTO v_school_id
    FROM public.campus_chat_groups g
    WHERE g.id = p_group_id;

    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'Gruppe nicht gefunden.';
    END IF;

    IF p_user_id IS NOT NULL THEN
        IF v_caller_id IS NULL 
           OR v_caller_id = p_user_id 
           OR public.is_master_admin() 
           OR (public.check_school_access(v_school_id) AND public.is_teacher_or_admin())
           OR (EXISTS (SELECT 1 FROM public.users_raw WHERE id = p_user_id AND school_id = v_school_id)) THEN
            v_target_user_id := p_user_id;
        ELSE
            RAISE EXCEPTION 'Nicht autorisiert, Lesestatus für diesen Benutzer zu ändern.';
        END IF;
    ELSE
        v_target_user_id := v_caller_id;
    END IF;

    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentifizierung erforderlich.';
    END IF;

    -- A. Alle Kanäle dieser Gruppe als gelesen markieren
    FOR v_channel IN 
        SELECT id FROM public.campus_chat_channels WHERE group_id = p_group_id
    LOOP
        INSERT INTO public.campus_chat_channel_reads (
            school_id,
            channel_id,
            user_id,
            last_read_at
        ) VALUES (
            v_school_id,
            v_channel.id,
            v_target_user_id,
            v_now
        )
        ON CONFLICT (channel_id, user_id)
        DO UPDATE SET last_read_at = EXCLUDED.last_read_at;
    END LOOP;

    -- B. Gruppen-Mitgliedschafts-Zeitstempel atomar aktualisieren
    UPDATE public.campus_chat_group_members
    SET last_read_at = v_now
    WHERE group_id = p_group_id AND user_id = v_target_user_id;

    -- C. Receipt-Einträge für Gruppen-Nachrichten schreiben
    INSERT INTO public.campus_message_receipts (
        school_id, message_id, user_id, status, timestamp
    )
    SELECT v_school_id, m.id, v_target_user_id, 'read', v_now
    FROM public.campus_direct_messages m
    WHERE m.group_id = p_group_id
      AND m.sender_id != v_target_user_id
    ON CONFLICT (message_id, user_id, status)
    DO UPDATE SET timestamp = EXCLUDED.timestamp;

    -- D. Revisionssicheres Audit-Logging
    INSERT INTO public.audit_logs (
        school_id,
        user_id,
        action,
        details
    ) VALUES (
        v_school_id,
        v_target_user_id,
        'QUITTUNG_LESEBESTAETIGUNG',
        jsonb_build_object(
            'type', 'group_read',
            'group_id', p_group_id,
            'user_id', v_target_user_id,
            'read_at', v_now,
            'legal_basis', '§ 130 BGB / GoBD'
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'group_id', p_group_id,
        'user_id', v_target_user_id,
        'last_read_at', v_now
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_campus_group_as_read(UUID, UUID) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 6. HÄRTUNG: mark_campus_channel_as_read (Aktualisiert verlässlich group_members)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_campus_channel_as_read(
    p_channel_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_target_user_id UUID;
    v_group_id UUID;
    v_school_id UUID;
    v_now TIMESTAMPTZ := now();
    v_has_other_unread BOOLEAN := false;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();

    SELECT c.group_id, c.school_id INTO v_group_id, v_school_id
    FROM public.campus_chat_channels c
    WHERE c.id = p_channel_id;

    IF v_group_id IS NULL THEN
        RAISE EXCEPTION 'Kanal nicht gefunden.';
    END IF;

    IF p_user_id IS NOT NULL THEN
        IF v_caller_id IS NULL 
           OR v_caller_id = p_user_id 
           OR public.is_master_admin() 
           OR (public.check_school_access(v_school_id) AND public.is_teacher_or_admin())
           OR (EXISTS (SELECT 1 FROM public.users_raw WHERE id = p_user_id AND school_id = v_school_id)) THEN
            v_target_user_id := p_user_id;
        ELSE
            RAISE EXCEPTION 'Nicht autorisiert, Lesestatus für diesen Benutzer zu ändern.';
        END IF;
    ELSE
        v_target_user_id := v_caller_id;
    END IF;

    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentifizierung erforderlich.';
    END IF;

    -- 1. Atomares Upsert des Kanal-Lesezeichens
    INSERT INTO public.campus_chat_channel_reads (
        school_id,
        channel_id,
        user_id,
        last_read_at
    ) VALUES (
        v_school_id,
        p_channel_id,
        v_target_user_id,
        v_now
    )
    ON CONFLICT (channel_id, user_id)
    DO UPDATE SET last_read_at = EXCLUDED.last_read_at;

    -- 2. Immer auch den Gruppen-Zeitstempel auf mindestens v_now anheben (verhindert Bouncing Badges)
    UPDATE public.campus_chat_group_members
    SET last_read_at = v_now
    WHERE group_id = v_group_id AND user_id = v_target_user_id;

    -- 3. Receipt-Einträge für diesen Kanal schreiben
    INSERT INTO public.campus_message_receipts (
        school_id, message_id, user_id, status, timestamp
    )
    SELECT v_school_id, m.id, v_target_user_id, 'read', v_now
    FROM public.campus_direct_messages m
    WHERE m.group_id = v_group_id
      AND (m.channel_id = p_channel_id OR m.channel_id IS NULL)
      AND m.sender_id != v_target_user_id
    ON CONFLICT (message_id, user_id, status)
    DO UPDATE SET timestamp = EXCLUDED.timestamp;

    RETURN jsonb_build_object(
        'success', true,
        'channel_id', p_channel_id,
        'group_id', v_group_id,
        'user_id', v_target_user_id,
        'last_read_at', v_now
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_campus_channel_as_read(UUID, UUID) TO authenticated, anon, service_role;

-- 7. NOTIFY POSTGREST SCHEMA CACHE RELOAD
NOTIFY pgrst, 'reload schema';
