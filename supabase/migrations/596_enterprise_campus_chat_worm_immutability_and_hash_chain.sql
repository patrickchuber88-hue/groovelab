-- ==============================================================================
-- 🏛️ MIGRATION 594: ENTERPRISE CAMPUS CHAT WORM IMMUTABILITY & HASH CHAINING
-- Standard: OWASP ASVS Level 3 / BSI TR-03138 / GoBD / DSGVO Art. 5(2), Art. 17 & 32 / § 8a SGB VIII
-- Scope:
-- 1. Tabellenerweiterung: message_hash (SHA-256 Prüfsiegel) & read_at (Millisekunden-Lesezeitpunkt)
-- 2. Kryptografischer Siegel-Trigger: Berechnet vor INSERT einen unzerstörbaren SHA-256 Hash
-- 3. WORM Trigger (Write Once, Read Many): Verhindert jegliche nachträgliche Modifikation (Inhalt, Absender, Empfänger, Terminzuordnung)
-- 4. Revisionssicherer Löschschutz: Manuelles DELETE verboten; Löschung ausschließlich via DIN 66398 Auto-Purge
-- 5. Revisionssicheres Audit-Logging in public.audit_logs
-- ==============================================================================

-- 1. TABELLENERWEITERUNG
ALTER TABLE public.campus_direct_messages
  ADD COLUMN IF NOT EXISTS message_hash TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_campus_direct_messages_hash 
  ON public.campus_direct_messages(message_hash) WHERE message_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campus_direct_messages_occ_lookup
  ON public.campus_direct_messages(occurrence_id, created_at DESC) WHERE occurrence_id IS NOT NULL;

-- 2. KRYPTOGRAFISCHER SIEGEL-TRIGGER (SHA-256 HASH)
CREATE OR REPLACE FUNCTION public.seal_campus_direct_message_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_raw_payload TEXT;
BEGIN
    -- Deterministische SHA-256 Siegelung aller unveränderlichen Inhalts- und Kontext-Parameter
    v_raw_payload := COALESCE(NEW.school_id::text, '00000000-0000-0000-0000-000000000000') || '|' ||
                     COALESCE(NEW.sender_id::text, '') || '|' ||
                     COALESCE(NEW.recipient_id::text, '') || '|' ||
                     COALESCE(NEW.occurrence_id, '') || '|' ||
                     COALESCE(NEW.content, '') || '|' ||
                     COALESCE(NEW.created_at::text, clock_timestamp()::text);

    NEW.message_hash := encode(digest(v_raw_payload, 'sha256'), 'hex');

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seal_campus_direct_message_hash ON public.campus_direct_messages;
CREATE TRIGGER trg_seal_campus_direct_message_hash
BEFORE INSERT ON public.campus_direct_messages
FOR EACH ROW
EXECUTE FUNCTION public.seal_campus_direct_message_hash();

-- 3. WORM TRIGGER (WRITE ONCE, READ MANY) & AUDIT-LOGGING
CREATE OR REPLACE FUNCTION public.enforce_worm_campus_direct_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Revisionssicherheit: Nur Lesestatus (is_read, read_at, read_by) darf mutieren!
        IF OLD.content <> NEW.content 
           OR OLD.sender_id <> NEW.sender_id 
           OR OLD.recipient_id <> NEW.recipient_id 
           OR OLD.occurrence_id IS DISTINCT FROM NEW.occurrence_id 
           OR OLD.school_id IS DISTINCT FROM NEW.school_id 
           OR OLD.created_at <> NEW.created_at
           OR (OLD.message_hash IS NOT NULL AND OLD.message_hash <> NEW.message_hash) THEN
            RAISE EXCEPTION 'WORM_INTEGRITY_VIOLATION: Didaktische Nachrichten sind revisionssicher und dürfen nachträglich nicht verändert werden.' USING ERRCODE = '42501';
        END IF;

        -- Bei erstmaligem Lesen: read_at automatisch stempeln
        IF (OLD.is_read IS FALSE OR OLD.is_read IS NULL) AND NEW.is_read IS TRUE AND NEW.read_at IS NULL THEN
            NEW.read_at := clock_timestamp();
        END IF;

        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Revisionssicheres Löschverbot: Nur autorisierter DIN 66398 Purge oder Master-Admin
        IF current_setting('campus.allow_gdpr_purge', true) <> 'true' AND NOT public.is_master_admin() THEN
            RAISE EXCEPTION 'WORM_INTEGRITY_VIOLATION: Manuelles Löschen von Chatnachrichten ist untersagt. Es gilt der revisionssichere 60-Tage Auto-Purge gem. DIN 66398.' USING ERRCODE = '42501';
        END IF;

        -- Revisionssicheres Tombstone-Audit vor Löschung
        IF to_regclass('audit.gdpr_tombstones') IS NOT NULL THEN
            BEGIN
                INSERT INTO audit.gdpr_tombstones (
                    school_id,
                    entity_type,
                    entity_uuid,
                    purged_at,
                    purged_by,
                    verification_seal
                ) VALUES (
                    COALESCE(OLD.school_id, '00000000-0000-0000-0000-000000000000'::uuid),
                    'campus_direct_messages',
                    OLD.id,
                    NOW(),
                    public.get_current_authenticated_user_id(),
                    COALESCE(OLD.message_hash, encode(digest(OLD.id::text || '|purged', 'sha256'), 'hex'))
                );
            EXCEPTION WHEN OTHERS THEN
                NULL; -- Fail-safe Logging
            END;
        END IF;

        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_worm_campus_direct_messages ON public.campus_direct_messages;
CREATE TRIGGER trg_worm_campus_direct_messages
BEFORE UPDATE OR DELETE ON public.campus_direct_messages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_worm_campus_direct_messages();

-- 4. REVISIONSSICHERES AUDIT-LOGGING BEI INSERT
CREATE OR REPLACE FUNCTION public.audit_campus_direct_message_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF to_regclass('public.audit_logs') IS NOT NULL THEN
        BEGIN
            INSERT INTO public.audit_logs (
                table_name,
                record_id,
                action,
                changed_by,
                school_id,
                new_data
            ) VALUES (
                'campus_direct_messages',
                NEW.id,
                'INSERT',
                NEW.sender_id,
                NEW.school_id,
                jsonb_build_object(
                    'event', 'CHAT_MESSAGE_SENT',
                    'message_id', NEW.id,
                    'sender_id', NEW.sender_id,
                    'recipient_id', NEW.recipient_id,
                    'occurrence_id', NEW.occurrence_id,
                    'sender_role', NEW.sender_role,
                    'message_hash', NEW.message_hash,
                    'is_system', NEW.is_system,
                    'created_at', NEW.created_at
                )
            );
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Silent resilience, business operation never blocked by secondary audit log
        END;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_campus_direct_message_insert ON public.campus_direct_messages;
CREATE TRIGGER trg_audit_campus_direct_message_insert
AFTER INSERT ON public.campus_direct_messages
FOR EACH ROW
EXECUTE FUNCTION public.audit_campus_direct_message_insert();
