-- ==============================================================================
-- 🏛️ MIGRATION 413: CAMPUS CHAT READ RECEIPTS & REVISIONSSICHERES AUDIT-LOGGING
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Fail-Closed / GoBD / § 130 BGB)
-- ==============================================================================
-- 1. Tabelle public.campus_direct_messages: Spalten read_at & acknowledged_at
-- 2. Autoritativer RPC: mark_campus_group_as_read(p_group_id UUID)
-- 3. Autoritativer RPC: mark_campus_direct_chat_as_read(p_partner_id UUID)
-- 4. Revisionssichere Audit-Log-Einträge in public.audit_logs (§ 130 BGB)
-- 5. PostgREST Schema Cache Reload
-- ==============================================================================

-- 1. SPALTEN FÜR DIREKTNACHRICHTEN ERGÄNZEN
ALTER TABLE public.campus_direct_messages
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.campus_direct_messages.read_at IS 'Revisionssicherer Zeitstempel der Kenntnisnahme gem. § 130 BGB';
COMMENT ON COLUMN public.campus_direct_messages.acknowledged_at IS 'Zeitstempel der aktiven Quittierung';

-- Index für performante Quittierungs-Updates
CREATE INDEX IF NOT EXISTS idx_campus_direct_messages_unread_lookup
ON public.campus_direct_messages(recipient_id, sender_id, is_read)
WHERE is_read = false;

-- ------------------------------------------------------------------------------
-- 2. AUTORITATIVER RPC: mark_campus_group_as_read
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_campus_group_as_read(
    p_group_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_school_id UUID;
    v_now TIMESTAMPTZ := now();
    v_channels_updated INT := 0;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentifizierung erforderlich.';
    END IF;

    -- Gruppe validieren und School-ID ermitteln
    SELECT school_id INTO v_school_id
    FROM public.campus_chat_groups
    WHERE id = p_group_id;

    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'Gruppe nicht gefunden.';
    END IF;

    -- Mandanten- & Mitgliedschaftsprüfung (Fail-Closed)
    IF NOT (
        public.is_campus_chat_group_member(p_group_id, v_caller_id)
        OR public.is_campus_chat_group_creator(p_group_id, v_caller_id)
        OR public.is_master_admin()
        OR (public.check_school_access(v_school_id) AND public.is_teacher_or_admin())
    ) THEN
        RAISE EXCEPTION 'Kein Zugriff auf diese Gruppe.';
    END IF;

    -- 1. Alle Kanäle dieser Gruppe für den Benutzer als gelesen markieren
    INSERT INTO public.campus_chat_channel_reads (
        school_id,
        channel_id,
        user_id,
        last_read_at
    )
    SELECT v_school_id, c.id, v_caller_id, v_now
    FROM public.campus_chat_channels c
    WHERE c.group_id = p_group_id
    ON CONFLICT (channel_id, user_id)
    DO UPDATE SET last_read_at = EXCLUDED.last_read_at;

    GET DIAGNOSTICS v_channels_updated = ROW_COUNT;

    -- 2. Gruppenmitgliedschaft synchronisieren
    UPDATE public.campus_chat_group_members
    SET last_read_at = v_now
    WHERE group_id = p_group_id AND user_id = v_caller_id;

    -- 3. Revisionssicheres Audit-Logging gem. § 130 BGB / GoBD
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
            'group_id', p_group_id,
            'channels_count', v_channels_updated,
            'acknowledged_at', v_now,
            'legal_basis', '§ 130 BGB / GoBD'
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'group_id', p_group_id,
        'user_id', v_caller_id,
        'last_read_at', v_now,
        'channels_updated', v_channels_updated
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_campus_group_as_read(UUID) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 3. AUTORITATIVER RPC: mark_campus_direct_chat_as_read
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_campus_direct_chat_as_read(
    p_partner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_school_id UUID;
    v_now TIMESTAMPTZ := now();
    v_messages_updated INT := 0;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentifizierung erforderlich.';
    END IF;

    -- School-ID ermitteln
    SELECT school_id INTO v_school_id
    FROM public.users_raw
    WHERE id = v_caller_id;

    -- Alle ungelesenen Direktnachrichten von p_partner_id an v_caller_id als gelesen markieren
    UPDATE public.campus_direct_messages
    SET is_read = true,
        read_at = COALESCE(read_at, v_now),
        acknowledged_at = v_now
    WHERE group_id IS NULL
      AND sender_id = p_partner_id
      AND recipient_id = v_caller_id
      AND is_read = false;

    GET DIAGNOSTICS v_messages_updated = ROW_COUNT;

    -- Revisionssicheres Audit-Logging gem. § 130 BGB / GoBD (sofern Nachrichten vorhanden waren)
    IF v_messages_updated > 0 THEN
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
                'partner_id', p_partner_id,
                'messages_count', v_messages_updated,
                'acknowledged_at', v_now,
                'legal_basis', '§ 130 BGB / GoBD'
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'partner_id', p_partner_id,
        'user_id', v_caller_id,
        'messages_updated', v_messages_updated,
        'last_read_at', v_now
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_campus_direct_chat_as_read(UUID) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 4. POSTGREST SCHEMA CACHE RELOAD
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
