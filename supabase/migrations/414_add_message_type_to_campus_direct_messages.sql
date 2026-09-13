-- ==============================================================================
-- 🏛️ MIGRATION 414: ADD MESSAGE_TYPE TO CAMPUS_DIRECT_MESSAGES
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Fail-Closed)
-- ==============================================================================
-- 1. Tabelle public.campus_direct_messages: Spalte message_type ergänzen
-- 2. Index zur performanten Abfrage von Topic- & System-Mitteilungen
-- 3. PostgREST Schema Cache Reload
-- ==============================================================================

-- 1. SPALTE ERGÄNZEN
ALTER TABLE public.campus_direct_messages
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT NULL;

COMMENT ON COLUMN public.campus_direct_messages.message_type IS 
'Klassifizierung der Nachricht (z. B. topic, cancellation_reset, reschedule_notification, audio_consent_request, reactivation_request, system)';

-- 2. INDEX ERSTELLEN
CREATE INDEX IF NOT EXISTS idx_campus_direct_messages_message_type
ON public.campus_direct_messages(message_type)
WHERE message_type IS NOT NULL;

-- 3. POSTGREST SCHEMA CACHE NEU LADEN
NOTIFY pgrst, 'reload schema';
