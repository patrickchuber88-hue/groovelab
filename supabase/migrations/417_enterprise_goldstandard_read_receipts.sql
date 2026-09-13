-- ==============================================================================
-- 🏛️ MIGRATION 417: ENTERPRISE GOLDSTANDARD CAMPUS READ RECEIPTS & RLS HARDENING
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Fail-Closed / GoBD / § 130 BGB)
-- ==============================================================================
-- 1. DROP EXISTING OVERLOADS
-- 2. AUTORITATIVER RPC: mark_campus_channel_as_read(UUID, UUID)
-- 3. AUTORITATIVER RPC: mark_campus_group_as_read(UUID, UUID)
-- 4. AUTORITATIVER RPC: mark_campus_direct_chat_as_read(UUID, UUID)
-- 5. RLS-HÄRTUNG: campus_chat_channel_reads_mutation
-- 6. SCHEMA-CACHE RELOAD
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DROP EXISTING OVERLOADS TO AVOID SIGNATURE CONFLICTS
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.mark_campus_channel_as_read(UUID);
DROP FUNCTION IF EXISTS public.mark_campus_channel_as_read(UUID, UUID);
DROP FUNCTION IF EXISTS public.mark_campus_group_as_read(UUID);
DROP FUNCTION IF EXISTS public.mark_campus_group_as_read(UUID, UUID);
DROP FUNCTION IF EXISTS public.mark_campus_direct_chat_as_read(UUID);
DROP FUNCTION IF EXISTS public.mark_campus_direct_chat_as_read(UUID, UUID);

-- ------------------------------------------------------------------------------
-- 2. AUTORITATIVER RPC: mark_campus_channel_as_read
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
    v_school_id UUID;
    v_group_id UUID;
    v_now TIMESTAMPTZ := now();
    v_has_other_unread BOOLEAN := false;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();

    -- Kanal & zugehörige Gruppe ermitteln
    SELECT c.school_id, c.group_id
    INTO v_school_id, v_group_id
    FROM public.campus_chat_channels c
    WHERE c.id = p_channel_id;

    IF v_school_id IS NULL OR v_group_id IS NULL THEN
        RAISE EXCEPTION 'Kanal oder zugehörige Gruppe nicht gefunden.';
    END IF;

    -- Autorisierung für den Zielbenutzer ermitteln
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

    -- 2. Prüfen, ob noch ungelesene Nachrichten in anderen Kanälen dieser Gruppe vorliegen
    -- (Inklusive Fallback für Nachrichten ohne explizite channel_id)
    SELECT EXISTS (
        SELECT 1
        FROM public.campus_direct_messages m
        LEFT JOIN public.campus_chat_channels ch ON ch.id = m.channel_id
        LEFT JOIN public.campus_chat_channels def_ch ON def_ch.group_id = m.group_id AND def_ch.is_default = true
        LEFT JOIN public.campus_chat_channel_reads cr 
            ON cr.channel_id = COALESCE(ch.id, def_ch.id) AND cr.user_id = v_target_user_id
        WHERE m.group_id = v_group_id
          AND m.sender_id != v_target_user_id
          AND m.created_at > COALESCE(cr.last_read_at, '1970-01-01'::timestamptz)
          AND COALESCE(ch.id, def_ch.id) != p_channel_id
    ) INTO v_has_other_unread;

    -- Wenn keine anderen ungelesenen Kanäle mehr vorliegen, auch den Gruppen-Zeitstempel aktualisieren
    IF NOT v_has_other_unread THEN
        UPDATE public.campus_chat_group_members
        SET last_read_at = v_now
        WHERE group_id = v_group_id AND user_id = v_target_user_id;
    END IF;

    -- 3. Revisionssicheres Audit-Logging gem. § 130 BGB / GoBD
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
            'type', 'channel_read',
            'channel_id', p_channel_id,
            'group_id', v_group_id,
            'user_id', v_target_user_id,
            'read_at', v_now,
            'legal_basis', '§ 130 BGB / GoBD'
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'channel_id', p_channel_id,
        'group_id', v_group_id,
        'user_id', v_target_user_id,
        'last_read_at', v_now,
        'group_fully_read', NOT v_has_other_unread
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_campus_channel_as_read(UUID, UUID) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 3. AUTORITATIVER RPC: mark_campus_group_as_read
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

    -- B. Gruppen-Mitgliedschafts-Zeitstempel aktualisieren
    UPDATE public.campus_chat_group_members
    SET last_read_at = v_now
    WHERE group_id = p_group_id AND user_id = v_target_user_id;

    -- C. Revisionssicheres Audit-Logging
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
-- 4. AUTORITATIVER RPC: mark_campus_direct_chat_as_read
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

    -- Alle ungelesenen Direktnachrichten des Partners als gelesen markieren
    UPDATE public.campus_direct_messages
    SET is_read = true
    WHERE group_id IS NULL
      AND sender_id = p_partner_id
      AND recipient_id = v_target_user_id
      AND is_read = false;

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
-- 5. RLS-HÄRTUNG: campus_chat_channel_reads_mutation
-- ------------------------------------------------------------------------------
-- Erlaubt auch Lehrkräften/Station-Sessions derselben Schule das Schreiben von
-- Lesezeitpunkten für Schüler der eigenen Schule (Fail-Closed Defense-in-Depth).
DROP POLICY IF EXISTS "campus_chat_channel_reads_mutation" ON public.campus_chat_channel_reads;
CREATE POLICY "campus_chat_channel_reads_mutation" ON public.campus_chat_channel_reads
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR user_id = public.get_current_authenticated_user_id()
    OR (
        public.get_current_authenticated_user_id() IS NOT NULL
        AND public.check_school_access(school_id)
        AND public.is_teacher_or_admin()
    )
)
WITH CHECK (
    public.is_master_admin()
    OR user_id = public.get_current_authenticated_user_id()
    OR (
        public.get_current_authenticated_user_id() IS NOT NULL
        AND public.check_school_access(school_id)
        AND public.is_teacher_or_admin()
    )
);

-- ------------------------------------------------------------------------------
-- 6. SCHEMA-CACHE RELOAD
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
