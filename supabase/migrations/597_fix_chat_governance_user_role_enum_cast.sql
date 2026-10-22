-- ==============================================================================
-- 🏛️ MIGRATION 597: FIX CHAT GOVERNANCE USER_ROLE ENUM CAST
-- Standard: OWASP ASVS Level 3 / PostgreSQL Strict Type Resilience / BGB § 104
-- Scope:
-- Behebt den Type-Coercion-Fehler "invalid input value for enum user_role: ''"
-- bei COALESCE(v_sender.role, '') durch expliziten Cast auf ::text.
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
    v_recent_messages INT;
    v_normalized TEXT;
    v_check_string TEXT;
    v_bypass_guard TEXT;
BEGIN
    -- 0. Vorab: Transaktions-Bypass (Eltern-PIN RPC) ermitteln
    BEGIN
        v_bypass_guard := current_setting('campus.bypass_chat_guard', true);
    EXCEPTION WHEN OTHERS THEN
        v_bypass_guard := NULL;
    END;

    -- Systemnachrichten, autorisierte Eltern-PIN-Transaktionen und Master-Admin passieren immer
    v_is_system := COALESCE(NEW.is_system, false) 
        OR NEW.message_type IN ('system', 'cancellation_reset', 'absence_notice', 'reschedule', 'teacher_absence', 'cancellation_request')
        OR NEW.sender_role = 'parent'
        OR v_bypass_guard = 'true'
        OR public.is_master_admin();

    IF v_is_system THEN
        RETURN NEW;
    END IF;

    -- 1. Anti-DoS & Content Sanity Check
    IF NEW.content IS NULL THEN
        RAISE EXCEPTION 'CHAT_CONTENT_NULL: Nachrichtentext darf nicht null sein.' USING ERRCODE = '23502';
    END IF;

    -- Non-printable control characters injection defense (Zero-Width Space Stripping)
    NEW.content := regexp_replace(NEW.content, '[\u200B-\u200F\uFEFF]', '', 'g');

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

    -- 2. Anti-Spam Rate-Limiting (Max 10 Messages / Minute)
    IF NEW.sender_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_recent_messages
        FROM public.campus_direct_messages
        WHERE sender_id = NEW.sender_id
          AND created_at >= NOW() - INTERVAL '1 minute';
          
        IF v_recent_messages >= 10 THEN
            RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Zu viele Nachrichten pro Minute. Spamschutz aktiv.' USING ERRCODE = '42900';
        END IF;
    END IF;

    -- 3. Art. 9 DSGVO Guard (Medizinische Daten neutralisieren)
    NEW.content := regexp_replace(NEW.content, '\y(krankheit|krankmeldung|krankgeschrieben|krankschreibung|erkrankung|fieber|erbrechen|durchfall|magen-darm|grippe|infektion|quarantäne|corona|covid|hustenanfall|lungenentzündung|scharlach|windpocken|adhs|ads|autismus|asperger|depression|depressiv|angststörung|panikattacke|epilepsie|krampfanfall|trauma|psychotherapie|psychiater|psychologe|behindertenausweis|behinderungsgrad|gdb|schwerbehinderung|krankenhaus|klinik|notaufnahme|operation|operiert|arztbesuch|arzttermin|kinderarzt|hno-arzt|orthopäde|neurologe|therapie|physiotherapie|ergotherapie|logopädie|chemotherapie|reha|kur|attest|ärztliches attest|rezept|medikament|antibiotika|cortison|antidepressiva|schmerzmittel|insulin|inhalator|krücken|gipsarm)\y', '[gesundheitliche Angabe neutralisiert]', 'gi');

    -- 4. § 8a SGB VIII Hate-Speech Guard & Crisis Detection
    v_normalized := lower(NEW.content);
    v_normalized := replace(v_normalized, '@', 'a');
    v_normalized := replace(v_normalized, '1', 'i');
    v_normalized := replace(v_normalized, '3', 'e');
    v_normalized := replace(v_normalized, '0', 'o');
    v_normalized := replace(v_normalized, '$', 's');

    -- Crisis Check
    IF v_normalized ~ '\y(ich\s*(bring|schlag|stech|knall)\s*dich\s*(um|tot|ab)|bring\s*dich\s*um|krepier[en]*|t[oö]te\s*dich|ich\s*bring\s*mich\s*um|ich\s*will\s*sterben)\y' THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, changed_by, new_data)
        VALUES ('campus_direct_messages', NEW.sender_id, 'INSERT', NEW.sender_id, jsonb_build_object('event', 'CRISIS_INTERVENTION', 'reason', 'Gewalt-/Suizidandrohung im Chat blockiert'));
        
        RAISE EXCEPTION 'CRISIS_DETECTED: Nachricht blockiert. Bitte wende dich sofort an die Nummer gegen Kummer (116 111).' USING ERRCODE = 'P0002';
    END IF;

    -- Toxic Check mit Whitelist-Maskierung
    v_check_string := regexp_replace(v_normalized, '\y(fagott|fagottist|fagotte|notenständer|notenstaender|mikrofonständer|mikrofonstaender|gitarrenständer|gitarrenstaender|boxenständer|boxenstaender|notenpult|anschlag|tastenanschlag|saitenanschlag|blasinstrument|holzblasinstrument|blechblasinstrument|mundstück|mundstueck|dämpfer|daempfer|pedal|plektrum|plektren|saite|saiten|triole|quartole|quintole|sextole|krawall|wirbel)\y', 'WHITELISTED', 'gi');
    
    IF v_check_string ~ '\y(sieg\s*heil|heil\s*hitler|hakenkreuz|judensau|kanak[en]*|nigg[aer]*|neger|scheiss|arschloch|hurensohn|hur[en]*|fotz[en]*|wichser|wichs|bastard|missgeburt|spast[i]*|behindi|halt\s*die\s*fresse|fick\s*dich|verpiss\s*dich|mistst[uü]ck|scheisskerl|depp[en]*|vollidiot|schwanzlutscher|pimmel|penis|vagina|titten|nutte[n]*|schlampe[n]*|nacktbild[er]*|zieh\s*dich\s*aus|sex\s*chat|blowjob)\y' THEN
        RAISE EXCEPTION 'TOXIC_CONTENT_DETECTED: Nachricht verstößt gegen die Community-Richtlinien.' USING ERRCODE = 'P0003';
    END IF;

    -- 5. Sender Governance & Parental Lock (BGB § 104 / DSGVO Art. 8)
    IF NEW.sender_id IS NOT NULL THEN
        SELECT id, role, school_id, campus_ui_level, parent_allow_chat
        INTO v_sender
        FROM public.users_raw
        WHERE id = NEW.sender_id;

        IF FOUND THEN
            -- 🛡️ 0.1% Goldstandard: Expliziter ::text Cast verhindert SQLSTATE 22P02 Enum-Trap
            IF LOWER(COALESCE(v_sender.role::text, '')) = 'student' AND COALESCE(NEW.sender_role, '') <> 'parent' THEN
                IF v_sender.parent_allow_chat IS FALSE THEN
                    RAISE EXCEPTION 'PARENTAL_CHAT_LOCK_ACTIVE: Der Chat ist durch die Erziehungsberechtigten deaktiviert.' USING ERRCODE = 'P0001';
                END IF;
                IF v_sender.campus_ui_level = 'junior' AND v_sender.parent_allow_chat IS NOT TRUE THEN
                    RAISE EXCEPTION 'JUNIOR_DEFAULT_CHAT_DISABLED: Im Junior-Bereich ist der Chat standardmäßig deaktiviert.' USING ERRCODE = 'P0001';
                END IF;
            END IF;

            IF NEW.school_id IS NULL AND v_sender.school_id IS NOT NULL THEN
                NEW.school_id := v_sender.school_id;
            ELSIF NEW.school_id IS NOT NULL AND v_sender.school_id IS NOT NULL AND NEW.school_id <> v_sender.school_id THEN
                RAISE EXCEPTION 'TENANT_MISMATCH: Sender gehört nicht zur angegebenen Schule.' USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;

    -- 6. Recipient Governance (1:1 Direktchats)
    IF NEW.group_id IS NULL AND NEW.recipient_id IS NOT NULL THEN
        SELECT id, role, school_id, campus_ui_level, parent_allow_chat
        INTO v_recipient
        FROM public.users_raw
        WHERE id = NEW.recipient_id;

        IF FOUND THEN
            -- 🛡️ 0.1% Goldstandard: Expliziter ::text Cast verhindert SQLSTATE 22P02 Enum-Trap
            IF LOWER(COALESCE(v_recipient.role::text, '')) = 'student' THEN
                IF v_recipient.parent_allow_chat IS FALSE THEN
                    RAISE EXCEPTION 'RECIPIENT_PARENTAL_CHAT_LOCK: Der Empfänger darf durch elterliche Beschränkung keine Direktnachrichten empfangen.' USING ERRCODE = 'P0001';
                END IF;
                IF v_recipient.campus_ui_level = 'junior' AND v_recipient.parent_allow_chat IS NOT TRUE THEN
                    RAISE EXCEPTION 'RECIPIENT_JUNIOR_CHAT_DISABLED: Der Empfänger befindet sich im geschützten Junior-Modus.' USING ERRCODE = 'P0001';
                END IF;
            END IF;

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
    BEFORE INSERT OR UPDATE OF content, sender_role, message_type
    ON public.campus_direct_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_campus_chat_governance();

NOTIFY pgrst, 'reload schema';
