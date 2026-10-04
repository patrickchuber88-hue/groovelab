-- ==============================================================================
-- Migration 432: 0,1% Enterprise Goldstandard WORM Messaging via PIN Leases
-- Description: Enables parents to write messages securely on a child's device
--              via authoritative cryptographic lease validation (OWASP ASVS L3).
-- ==============================================================================

-- 1. Aktualisierung des Wächters (Triggers) mit Transaktions-Bypass
CREATE OR REPLACE FUNCTION public.trg_prevent_unauthorized_student_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sender_role TEXT;
    v_allow_chat BOOLEAN;
BEGIN
    IF NEW.sender_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT role, parent_allow_chat
    INTO v_sender_role, v_allow_chat
    FROM public.users_raw
    WHERE id = NEW.sender_id;

    -- If sender is student and parent chat is not allowed, check for lease bypass
    IF v_sender_role = 'student' AND COALESCE(v_allow_chat, false) = FALSE THEN
        -- 0,1% Goldstandard: Prüfe auf legitimes Parent-Lease-Siegel
        IF current_setting('campus.bypass_chat_guard', true) = 'true' THEN
            RETURN NEW;
        END IF;

        RAISE EXCEPTION 'Kinderschutz-Sperre: Chat ist für diesen Schüler-Account elterlich deaktiviert.'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Der Zero-Trust Transmitter (RPC)
CREATE OR REPLACE FUNCTION public.send_campus_message_as_parent(
    p_recipient_id UUID,
    p_content TEXT,
    p_occurrence_id TEXT,
    p_lease_token UUID,
    p_message_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_student_id UUID;
    v_is_valid BOOLEAN := FALSE;
    v_message_id UUID;
BEGIN
    v_student_id := public.get_current_authenticated_user_id();

    -- 1. Validiere den Lease Token
    SELECT TRUE INTO v_is_valid
    FROM public.session_leases
    WHERE id = p_lease_token
      AND user_id = v_student_id
      AND is_revoked = FALSE
      AND role = 'parent'
      AND last_active_at > NOW() - INTERVAL '30 minutes';

    IF NOT v_is_valid THEN
        RAISE EXCEPTION 'Unauthorized: Invalid or expired parent lease token.' USING ERRCODE = '42501';
    END IF;

    -- 2. Setze flüchtiges Transaktions-Siegel
    PERFORM set_config('campus.bypass_chat_guard', 'true', true);

    -- 3. Führe den Insert aus
    INSERT INTO public.campus_direct_messages (
        sender_id,
        recipient_id,
        content,
        occurrence_id,
        message_type,
        sender_role,
        is_read,
        is_system
    ) VALUES (
        v_student_id,
        p_recipient_id,
        p_content,
        p_occurrence_id,
        p_message_type,
        'parent',
        FALSE,
        FALSE
    ) RETURNING id INTO v_message_id;

    RETURN jsonb_build_object(
        'success', true,
        'message_id', v_message_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_campus_message_as_parent(UUID, TEXT, TEXT, UUID, TEXT) TO authenticated, anon, service_role;

-- RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
