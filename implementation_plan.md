# Implementierungsplan: 10/10 Goldstandard der Nachrichten- & Lifecycle-Architektur

## Status Übersicht
- ✅ **Teil A: Art. 9 DSGVO & Health-Data Protection Shield** (Abgeschlossen & verifiziert)
  - Morphologische Stammwort- & Komposita-Engine ([`medicalTermGuard.ts`](apps/groovelab/src/utils/medicalTermGuard.ts))
  - Alltagsstatus `krank` geschützt, Diagnosedaten fail-closed blockiert
  - Smart-Guidance Dialog mit 1-Klick-Neutralisierung ([`CampusDirectMessages.tsx`](apps/groovelab/src/components/CampusDirectMessages.tsx))
  - Serverseitige PostgreSQL-Governance ([`598_enterprise_art9_dsgvo_chat_shield.sql`](supabase/migrations/598_enterprise_art9_dsgvo_chat_shield.sql))
  - Forensische Testsuite ([`test_medical_term_guard_forensic.ts`](apps/groovelab/src/tests/test_medical_term_guard_forensic.ts))
- ⏳ **Teil B: 10/10 Alltags- & Lifecycle-Exzellenz im Musikschulbetrieb** (Bereit zur Umsetzung)

---

## Zielsetzung für Teil B
Herstellung der **10/10 User Experience und DIN 66398 Datenhygiene** für den Musikschulalltag:

1. **Offline-Outbox & Auto-Retry („Kellerraum-Sync“)**:
   - Resilientes lokales Puffern von Nachrichten bei Verbindungsabbruch in schalldichten Übezellen mit optischem Status (`🕒 Wartet auf Verbindung...`) und automatischem Hintergrundversand bei Wiederverbindung.
2. **Reduziertes Laden & Client-Side Sofort-Suche**:
   - Initiales Laden der letzten 30–50 Nachrichten für < 50ms Startzeit; flüssiges Nachladen älterer Nachrichten nach oben.
   - Integriertes Lupen-Suchfeld im Chat-Header für Echtzeit-Volltextsuche in < 5ms.
3. **Schuljahres-Lifecycle-Engine & DIN 66398 Purge**:
   - **Termingekoppelte Chats**: 100 % automatischer Hard-Purge zum Schuljahresende (1. August).
   - **Themen-Persistenz mit `⭐ Dauerhaft`**: Ein-Klick-Toggle im Themen-Header (`⭐ Dauerhaft`), um zeitlose didaktische Themen (Repertoire, Etüdenpläne) über den Schuljahreswechsel mitzunehmen.
   - **Schuljahres-Archivschublade**: Erledigte Themen und allgemeine Verläufe wandern zum Schuljahreswechsel in eine schreibgeschützte Lesekarte (`📁 Archiv [Vorjahr]`), die nach 1 weiteren Schuljahr automatisiert bereinigt wird.
   - **Pinnwand-TTL**: Verfallsdatum für Board-Ankündigungen nach Event-Datum oder Schuljahresende.

---

## Detaillierter Maßnahmenkatalog (Teil B)

### Phase 1: Offline-Outbox & Kellerraum-Resilienz
**Dateien:**
- [`apps/groovelab/src/hooks/useCampusChatActions.ts`](apps/groovelab/src/hooks/useCampusChatActions.ts)
- [`apps/groovelab/src/components/CampusDirectMessages.tsx`](apps/groovelab/src/components/CampusDirectMessages.tsx)
- [`apps/groovelab/src/components/messages/CampusMessageStatusTicks.tsx`](apps/groovelab/src/components/messages/CampusMessageStatusTicks.tsx)

**Maßnahmen:**
1. In `useCampusChatActions.ts`:
   - Lokale Outbox-Queue für fehlgeschlagene Netzwerkübertragungen.
   - Automatischer Retry-Listener bei `window.addEventListener('online', ...)`.
2. In `CampusMessageStatusTicks.tsx`:
   - Unterstützung des Offline-Zustands (`status === 'pending_offline'`) mit kleiner Uhr-Ikone (`Clock` 12px grau).

---

### Phase 2: Reduziertes Laden (Paginierung) & In-Memory-Suche
**Dateien:**
- [`apps/groovelab/src/components/CampusDirectMessages.tsx`](apps/groovelab/src/components/CampusDirectMessages.tsx)
- [`apps/groovelab/src/hooks/useCampusMessagingData.ts`](apps/groovelab/src/hooks/useCampusMessagingData.ts)

**Maßnahmen:**
1. Begrenzung des initialen Chat-Fensters auf die letzten 50 Nachrichten pro Empfänger.
2. Schlichter „Ältere Nachrichten laden“-Trigger beim Scrollen an den oberen Rand.
3. Lupen-Icon im Header des aktiven Chats:
   - Öffnet ein schlankes Suchfeld.
   - Filtert die entschlüsselten Nachrichten in Echtzeit und springt zur ausgewählten Nachricht.

---

### Phase 3: Themen-Header mit `⭐ Dauerhaft` & Schuljahres-Archiv
**Dateien:**
- [`apps/groovelab/src/components/CampusTopicCard.tsx`](apps/groovelab/src/components/CampusTopicCard.tsx)
- [`apps/groovelab/src/components/CampusDirectMessages.tsx`](apps/groovelab/src/components/CampusDirectMessages.tsx)
- [`supabase/migrations/599_enterprise_campus_chat_school_year_lifecycle.sql`](supabase/migrations/599_enterprise_campus_chat_school_year_lifecycle.sql)

**Maßnahmen:**
1. In `CampusTopicCard.tsx`:
   - Eleganter 1-Tap Toggle-Chip im Header: `[ ⭐ Dauerhaft ]` / `[ ⭐ Dauer-Thema ]`.
   - Speichert das Flag `is_permanent: boolean` auf dem Thema.
2. In `CampusDirectMessages.tsx`:
   - Trennung zwischen aktiven Nachrichten des laufenden Schuljahres und der `📁 Archiv [Vorjahr]`-Schublade.
3. In PostgreSQL (Migration 599):
   - Spalte `is_permanent BOOLEAN DEFAULT false` auf `campus_direct_messages` (für Themen).
   - Idempotente Funktion `public.purge_school_year_expired_chats(p_school_year TEXT)`:
     - Löscht `occurrence_id IS NOT NULL` Nachrichten des abgelaufenen Schuljahres.
     - Archiviert nicht-permanente Themen.

---

### Phase 4: Forensische Tests & Verifikation
**Dateien:**
- [`apps/groovelab/src/tests/test_chat_lifecycle_and_offline_forensic.ts`](apps/groovelab/src/tests/test_chat_lifecycle_and_offline_forensic.ts) (Neu)
