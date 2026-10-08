# Implementierungsplan: Sprint 3 (P2: B2B- & Governance-Schilder)

## 🏛️ Executive Summary & Ausgangslage
Nach dem erfolgreichen Abschluss von **Sprint 1 (P0: Sofort-Schilder: Zone 1 & 7)** und **Sprint 2 (P1: Resilienz- & Audio-Schilder: Zone 3 & 4)** schließt **Sprint 3 (P2)** die letzten drei kritischen Zonen der forensischen 0,1% Enterprise Goldstandard Härtung ab:

1. **Zone 2 (Supabase Realtime Payload Protection):**
   * *Status Quo:* `RealtimeMultiplexer` erlaubt beliebige Broadcast-Payloads.
   * *0,1% Goldstandard:* Kanonisches **Invalidate-Only Pattern** (`broadcastInvalidation`) und Fail-Closed Payload-Sanitization (striktes Verbot von PII/Secrets im WebSocket-Payload; Clients invalidieren ihren Cache und fetchen autoritativ via Supabase RLS).
2. **Zone 5 (GoBD Schul-Sammelzahler vs. Schüler-Direktabrechnung DB-Integrität):**
   * *Status Quo:* Die Trennung zwischen Modell A (Sammelzahler `school_all`) und Modell B (Schüler-Direktabrechnung) wird primär in UI und Anwendungslogik überwacht.
   * *0,1% Goldstandard:* **Migration 535 (`535_enterprise_school_license_billing_lock.sql`)**: PostgreSQL-Trigger auf `public.invoices` und `public.schools`, der die Erzeugung von B2C-Schülerrechnungen bei Sammelzahler-Schulen auf DB-Ebene mit einem harten Abbruch (`RAISE EXCEPTION`) unmöglich macht. Revisionssicheres Logging in `public.audit_logs`.
3. **Zone 6 (B2B PDF-Urkunden 1-Page Layout Clamping):**
   * *Status Quo:* `schoolLicenseCertificatePdfGenerator.ts` nutzt feste Y-Offsets, die bei überlangen Schul- oder Schülernamen (z. B. 150 Zeichen) über den Container laufen oder potenziell eine zweite A4-Seite erzeugen könnten.
   * *0,1% Goldstandard:* Mathematisches **1-Page Layout Clamping & Auto-Shrink Engine** mit dynamischer Budget-Skalierung ($\rho \le 1.0$) und Text-Splitting. Forensischer Stresstest mit Extremwerten garantiert `doc.getNumberOfPages() === 1`.

---

## 🎯 Detaillierte Maßnahmen pro Zone

### 1. Zone 2: Realtime Invalidate-Only Architecture & Topic Salting
* **Datei:** [`apps/groovelab/src/services/realtimeMultiplexer.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/services/realtimeMultiplexer.ts)
* **Änderungen:**
  1. Hinzufügen von `broadcastInvalidation(topic: string, resource: string, resourceId?: string): void`:
     * Sendet standardisiert:
       ```ts
       {
         action: 'invalidate',
         resource,
         resourceId: resourceId || null,
         timestamp: Date.now()
       }
       ```
  2. Implementierung von `sanitizeBroadcastPayload(payload: any): any`:
     * Rekursiver Filter, der sensible Felder (`password`, `parent_pin`, `personal_pin`, `pin`, `secret`, `email`, `medical`, `phone`, `token`, `qr_token`) unkenntlich macht oder entfernt, falls `broadcastToTopic` aufgerufen wird.
  3. Topic-Validation:
     * Validiert Channel-Namen auf autorisierte Konventionen (`school_presence_<uuid>`, `school_sync_<uuid>`, `user_direct_<uuid>`).

### 2. Zone 5: GoBD Collective Billing Lock (Migration 535)
* **Datei:** `supabase/migrations/535_enterprise_school_license_billing_lock.sql`
* **Änderungen:**
  1. Funktion & Trigger `trg_prevent_b2c_billing_on_sammelzahler()` auf `public.invoices`:
     * Verhindert das Einfügen von Rechnungen mit Schüler-Direktabrechnung (`type IN ('AKT_STUDENT_DIRECT', 'B2C_STUDENT')`), wenn die referenzierte Schule `student_billing_option = 'school_all'` ist.
  2. Revisionssichere Überwachung von `schools.student_billing_option`:
     * Trigger `trg_audit_school_billing_option_change()` protokolliert jeden Modellwechsel in `public.audit_logs`.
  3. Aktualisierung von `scripts/verify_rls_catalog_invariants.ts`:
     * Ratchet von Invariant 22 auf Migration 535 inklusive Milestone-Prüfung auf `trg_prevent_b2c_billing_on_sammelzahler`.

### 3. Zone 6: PDF 1-Page Layout Clamping & Auto-Shrink Engine
* **Datei:** [`apps/groovelab/src/utils/schoolLicenseCertificatePdfGenerator.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/utils/schoolLicenseCertificatePdfGenerator.ts)
* **Änderungen:**
  1. Text-Wrapping (`doc.splitTextToSize`) für Schülernamen, Schulnamen und Unterrichtsfach mit dynamischer Höhenberechnung.
  2. Dynamisches Clamping des Containers (Y-Maximum 280mm).
  3. Auto-Shrink Verhältnis $\rho = \min(1.0, \text{budget} / \text{computedTotal})$ zur Skalierung von Abständen und Schriftgrößen bei extrem langen Texten.
  4. Hard Invariant Check: `if (doc.getNumberOfPages() > 1) throw new Error('PDF 1-page ceiling invariant violated');`
* **Forensischer Test:**
  * Erstellung von `apps/groovelab/src/tests/test_school_license_pdf_layout_forensic.ts`
  * Prüfung von Standard-, Überlänge- (200 Zeichen Schule, 100 Zeichen Schüler) und Unicode-Sonderfällen.

---

## 🛑 Stopp-Punkt & Genehmigungsvorbehalt
Gemäß `.agents/AGENTS.md` (Implementierungsplan-Governance / Zero Auto-Execute) wird die Implementierung erst nach ausdrücklicher Benutzer-Freigabe gestartet.
