-- ==============================================================================
-- 🏛️ MIGRATION 599: ENTERPRISE CAMPUS CHAT SCHOOL YEAR LIFECYCLE & DIN 66398
-- Standards: DIN 66398 / DSGVO Art. 5 Abs. 1 lit. e / OWASP ASVS Level 3
-- Scope:
-- 1. Spalten is_permanent & is_archived für dauerhafte Themen (⭐ Dauerhaft)
-- 2. Spalte school_year für revisionssichere Jahresabgrenzung
-- 3. Autoritativer RPC purge_school_year_expired_chats für den Sommer-Reset
--    - Hard-Purge aller termingekoppelten Nachrichten (Shoutbox)
--    - Soft-Archivierung aller nicht-permanenten Themen
-- ==============================================================================

ALTER TABLE public.campus_direct_messages 
ADD COLUMN IF NOT EXISTS is_permanent BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.campus_direct_messages 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.campus_direct_messages 
ADD COLUMN IF NOT EXISTS school_year TEXT;

-- Index für maximale Performance bei Lifecycle- und Themen-Abfragen
CREATE INDEX IF NOT EXISTS idx_campus_direct_messages_lifecycle 
ON public.campus_direct_messages(school_id, is_permanent, is_archived, created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. RPC: purge_school_year_expired_chats (DIN 66398 Automatischer Sommer-Reset)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_school_year_expired_chats(p_school_year TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_purged_count INT := 0;
    v_archived_count INT := 0;
    v_user_school_id UUID;
BEGIN
    v_user_school_id := public.get_current_user_school_id();

    -- 1. Hard-Purge aller termingekoppelten Nachrichten (Shoutbox)
    -- Termine eines vergangenen Schuljahres haben nach DIN 66398 keinen Verarbeitungszweck mehr
    DELETE FROM public.campus_direct_messages
    WHERE (school_id = v_user_school_id OR v_user_school_id IS NULL)
      AND occurrence_id IS NOT NULL
      AND (p_school_year IS NULL OR school_year = p_school_year OR created_at < NOW() - INTERVAL '300 days');
    GET DIAGNOSTICS v_purged_count = ROW_COUNT;

    -- 2. Soft-Archivierung aller nicht-dauerhaften Themen (Themen ohne ⭐ Dauerhaft)
    UPDATE public.campus_direct_messages
    SET is_archived = true
    WHERE (school_id = v_user_school_id OR v_user_school_id IS NULL)
      AND message_type = 'topic'
      AND is_permanent IS FALSE
      AND is_archived IS FALSE
      AND (p_school_year IS NULL OR school_year = p_school_year OR created_at < NOW() - INTERVAL '300 days');
    GET DIAGNOSTICS v_archived_count = ROW_COUNT;

    -- 3. Revisionssicheres Audit-Logging
    INSERT INTO public.audit_logs (table_name, record_id, action, changed_by, new_data)
    VALUES (
        'campus_direct_messages',
        COALESCE(v_user_school_id, '00000000-0000-0000-0000-000000000000'::UUID),
        'DELETE',
        auth.uid(),
        jsonb_build_object(
            'event', 'SCHOOL_YEAR_CHAT_PURGE',
            'purged_count', v_purged_count,
            'archived_count', v_archived_count,
            'school_year', p_school_year
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'purged_appointment_messages', v_purged_count,
        'archived_topics', v_archived_count,
        'timestamp', NOW()
    );
END;
$$;

NOTIFY pgrst, 'reload schema';
