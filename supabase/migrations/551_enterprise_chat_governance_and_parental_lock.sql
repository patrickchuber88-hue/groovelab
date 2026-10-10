-- ==============================================================================
-- 🏛️ MIGRATION 551: ENTERPRISE CHAT GOVERNANCE & PARENTAL LOCK (OWASP ASVS L3)
-- Standard: OWASP ASVS Level 3 / BGB § 104 / DSGVO Art. 8 & 25 / § 8a SGB VIII
-- Scope:
-- 1. Atomarer Trigger trg_enforce_campus_chat_governance auf public.campus_direct_messages
-- 2. Serverseitige Durchsetzung von parent_allow_chat für Schüler-Sender und Schüler-Empfänger
-- 3. Junior Privacy-by-Default (BGB § 104): Chat im Junior-Modus standardmäßig blockiert
-- 4. Anti-DoS & Payload-Hygiene: 1..4.000 Zeichen, kein Null-Byte, kein reiner Whitespace
-- 5. System-Bypass für administrative Unterrichtsabsagen, Krankmeldungen & Vertretungen
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.enforce_campus_chat_governance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_sender RECORD;
    v_recipient RECORD;
    v_is_system BOOLEAN := FALSE;
    v_content_len INT;
BEGIN
    -- 1. Anti-DoS & Content Sanity Check
    IF NEW.content IS NULL THEN
        RAISE EXCEPTION 'CHAT_CONTENT_NULL: Nachrichtentext darf nicht null sein.' USING ERRCODE = '23502';
    END IF;

    -- Non-printable control characters injection defense (PostgreSQL automatically rejects 0x00 at the protocol layer)
    IF NEW.content ~ '[\x01-\x08\x0B\x0C\x0E-\x1F]' THEN
        RAISE EXCEPTION 'CHAT_CONTENT_CONTROL_CHAR: Ungültige Steuerzeichen im Nachrichtentext.' USING ERRCODE = '22021';
    END IF;

    v_content_len := char_length(TRIM(NEW.content));
    IF v_content_len = 0 THEN
        RAISE EXCEPTION 'CHAT_CONTENT_EMPTY: Leere Nachrichten sind nicht zulässig.' USING ERRCODE = '22000';
    END IF;

    IF v_content_len > 4000 THEN
        RAISE EXCEPTION 'CHAT_CONTENT_EXCEEDS_MAX_LENGTH: Nachricht überschreitet das Maximum von 4.000 Zeichen.' USING ERRCODE = '22001';
    END IF;

    -- 2. Systemnachrichten-Bypass (Unterrichtsabsagen, Krankmeldungen, Vertretungsstunden, Master-Admin)
    v_is_system := COALESCE(NEW.is_system, false) 
        OR NEW.message_type IN ('system', 'cancellation_reset', 'absence_notice', 'reschedule', 'teacher_absence', 'cancellation_request')
        OR public.is_master_admin();

    IF v_is_system THEN
        RETURN NEW;
    END IF;

    -- 3. Sender Governance & Parental Lock (BGB § 104 / DSGVO Art. 8)
    IF NEW.sender_id IS NOT NULL THEN
        SELECT id, role, school_id, campus_ui_level, parent_allow_chat
        INTO v_sender
        FROM public.users_raw
        WHERE id = NEW.sender_id;

        IF FOUND THEN
            -- Wenn Sender Schüler ist:
            IF LOWER(COALESCE(v_sender.role, '')) = 'student' THEN
                -- Elterliche Chat-Sperre aktiv?
                IF v_sender.parent_allow_chat IS FALSE THEN
                    RAISE EXCEPTION 'PARENTAL_CHAT_LOCK_ACTIVE: Der Chat ist durch die Erziehungsberechtigten deaktiviert.' USING ERRCODE = 'P0001';
                END IF;

                -- Junior Privacy-by-Default: Junior ohne explizite Freigabe
                IF v_sender.campus_ui_level = 'junior' AND v_sender.parent_allow_chat IS NOT TRUE THEN
                    RAISE EXCEPTION 'JUNIOR_DEFAULT_CHAT_DISABLED: Im Junior-Bereich ist der Chat standardmäßig deaktiviert.' USING ERRCODE = 'P0001';
                END IF;
            END IF;

            -- Tenant Isolation: School-ID Konsistenz
            IF NEW.school_id IS NULL AND v_sender.school_id IS NOT NULL THEN
                NEW.school_id := v_sender.school_id;
            ELSIF NEW.school_id IS NOT NULL AND v_sender.school_id IS NOT NULL AND NEW.school_id <> v_sender.school_id THEN
                RAISE EXCEPTION 'TENANT_MISMATCH: Sender gehört nicht zur angegebenen Schule.' USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;

    -- 4. Recipient Governance (1:1 Direktchats)
    -- Verhindert, dass geschützte Schüler unerwünschte Direktnachrichten empfangen
    IF NEW.group_id IS NULL AND NEW.recipient_id IS NOT NULL THEN
        SELECT id, role, school_id, campus_ui_level, parent_allow_chat
        INTO v_recipient
        FROM public.users_raw
        WHERE id = NEW.recipient_id;

        IF FOUND THEN
            -- Wenn Empfänger Schüler ist:
            IF LOWER(COALESCE(v_recipient.role, '')) = 'student' THEN
                -- Hat der Empfänger eine elterliche Chat-Sperre?
                IF v_recipient.parent_allow_chat IS FALSE THEN
                    RAISE EXCEPTION 'RECIPIENT_PARENTAL_CHAT_LOCK: Der Empfänger darf durch elterliche Beschränkung keine Direktnachrichten empfangen.' USING ERRCODE = 'P0001';
                END IF;

                -- Junior Privacy-by-Default für Empfänger
                IF v_recipient.campus_ui_level = 'junior' AND v_recipient.parent_allow_chat IS NOT TRUE THEN
                    RAISE EXCEPTION 'RECIPIENT_JUNIOR_CHAT_DISABLED: Der Empfänger befindet sich im geschützten Junior-Modus.' USING ERRCODE = 'P0001';
                END IF;
            END IF;

            -- Cross-School Direct Message Deny (außer Master-Admin)
            IF v_sender.school_id IS NOT NULL AND v_recipient.school_id IS NOT NULL AND v_sender.school_id <> v_recipient.school_id THEN
                RAISE EXCEPTION 'CROSS_TENANT_CHAT_DENIED: Direktnachrichten zwischen verschiedenen Schulen sind nicht gestattet.' USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_campus_chat_governance ON public.campus_direct_messages;
CREATE TRIGGER trg_enforce_campus_chat_governance
    BEFORE INSERT OR UPDATE ON public.campus_direct_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_campus_chat_governance();

-- Zusätzliche RLS-Absicherung (Redundanz zur Trigger-Ebene)
ALTER TABLE IF EXISTS public.campus_direct_messages FORCE ROW LEVEL SECURITY;
