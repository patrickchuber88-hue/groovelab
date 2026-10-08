# 🏛️ Implementierungsplan: 360° Forensische Härtung der 7 Schutz-Zonen [0,1% Goldstandard]

> **Dokument-ID:** PLAN-2026-10-06-7-ZONES-HARDENING  
> **Status:** Bereit zur Genehmigung (Genehmigungsvorbehalt gem. AGENTS.md)  
> **Scope:** Schlüsselfertige Schließung der 7 identifizierten Schutz-Lücken in 3 präzisen Sprints.

---

## 1. Übersicht & Sprint-Architektur

```
┌────────────────────────────────────────────────────────────────────────┐
│             3-SPRINT MASTERPLAN ZUR 100% FORENSISCHEN HÄRTUNG          │
├────────────────────────────────────────────────────────────────────────┤
│ 🚀 SPRINT 1 (P0: SOFORT-SCHILDER)                                     │
│   • Zone 1: Storage Scrubber Inversion (Default-Deny / Whitelist-Only) │
│   • Zone 7: Migration Invariant Traverser (001 bis HEAD, 534+ SQLs)    │
├────────────────────────────────────────────────────────────────────────┤
│ 🛡️ SPRINT 2 (P1: RESILIENZ & AUDIO-SCHILDER)                          │
│   • Zone 4: Service Worker Build-Hash & Dynamic Precache Buster        │
│   • Zone 3: AudioContext Singleton Pool & Resource Leaser Engine       │
├────────────────────────────────────────────────────────────────────────┤
│ ⚖️ SPRINT 3 (P2/P3: B2B & GOVERNANCE-SCHILDER)                        │
│   • Zone 2: Realtime Zero-Payload Invalidation & HMAC Topic Salting    │
│   • Zone 5: GoBD Schullizenz PostgreSQL DB-Lock (Zero-Invoice Invar.)  │
│   • Zone 6: PDF 1-Page Clamping & Auto-Shrink Engine (BuT § 28 SGB II) │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Detaillierter Arbeitsplan: SPRINT 1 (Sofort-Schilder)

### Arbeitspaket 1.1: Storage Scrubber Inversion auf Default-Deny (Zone 1)
* **Ziel-Datei:** [`apps/groovelab/src/utils/sharedDeviceScrubber.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/utils/sharedDeviceScrubber.ts)
* **Problem:** Scrubber nutzt eine statische Blacklist. Neue Keys (z.B. `campus_student_question_${id}`) werden beim Logout auf Schul-Tablets vergessen.
* **Architektur-Inversion:**
  1. **Strikte Kiosk-Whitelist:**
     ```typescript
     const PERSISTENT_KIOSK_WHITELIST = new Set([
       'groovelab_station_id',
       'groovelab_active_platform',
       'campus_active_platform',
       'groovelab_kiosk_school_id',
       'groovelab_kiosk_token',
       'campus_kiosk_school_id',
       'campus_kiosk_token'
     ]);
     ```
  2. **Default-Deny Purge:** Alle Keys in `localStorage`, die weder in der Whitelist stehen noch mit `groovelab_kiosk_` / `campus_kiosk_` beginnen, werden **ausnahmslos atomar gelöscht**.
  3. **Verifikation:** Ergänzung von [`apps/groovelab/src/tests/test_endpoint_data_remanence.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/tests/test_endpoint_data_remanence.ts) um ungelistete Test-Keys (`campus_student_question_1`, `unknown_future_cache_key`). Nachweis, dass 100% aller Daten getilgt werden und nur Kiosk-Tokens überleben.

### Arbeitspaket 1.2: Migration Invariant Traverser 001 bis HEAD (Zone 7)
* **Ziel-Datei:** [`scripts/verify_rls_catalog_invariants.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/scripts/verify_rls_catalog_invariants.ts)
* **Problem:** Prüfung stoppt hardcodiert bei Migration 470. Die 64 Migrationen von 471 bis 534 werden nicht überwacht.
* **Architektur-Lösung:**
  1. **Dynamischer Zero-Sampling Traverser:**
     Liest dynamisch alle `.sql`-Dateien in `supabase/migrations/` ein (`/^\d+_/`) und sortiert sie chronologisch.
  2. **Axiom-Validierung über alle 534+ Migrationen:**
     * **Axiom 1 (RLS-Default-Deny):** Jedes `CREATE TABLE` in `public` muss `ENABLE ROW LEVEL SECURITY` besitzen.
     * **Axiom 2 (Search-Path Pinning):** Jede `SECURITY DEFINER` Funktion muss `SET search_path = public` oder `SET search_path TO ...` deklarieren (Schutz vor Search-Path-Hijacking gem. CWE-426).
     * **Axiom 3 (Tenant-Scoping):** RLS-Policies müssen Mandantentrennung aufweisen.
  3. **Verifikation:** Ausführung als neuer Invariant-Check 23 im Skript.

---

## 3. Detaillierter Arbeitsplan: SPRINT 2 (Resilienz & Audio)

### Arbeitspaket 2.1: Service Worker Dynamic Build-Buster (Zone 4)
* **Ziel-Dateien:** [`apps/groovelab/public/sw.js`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/public/sw.js), [`apps/groovelab/vite.config.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/vite.config.ts)
* **Architektur-Lösung:**
  * Build-Plugin in Vite, das bei `npm run build:groovelab` den Git-Commit-Hash oder Timestamp berechnet und in `dist/sw.js` als `CACHE_NAME = 'groovelab-static-' + HASH` injiziert.
  * Neuer Wächter im Morning Gate: Prüft, dass `sw.js` vor Release synchronisiert ist.

### Arbeitspaket 2.2: AudioContext Singleton & Resource Leaser Pool (Zone 3)
* **Ziel-Datei:** `apps/groovelab/src/services/audio/audioContextPool.ts` (Neuer autarker Satellit)
* **Architektur-Lösung:**
  * Zentraler AudioContext-Manager mit max. 1 Instanz.
  * Node-Leasing-System: Komponenten leihen sich GainNodes/Oscillators und geben sie beim Unmount mit `node.disconnect()` frei.
  * Automatischer `suspend()` nach 15s Inaktivität, Reaktivierung bei Touch/Click in $< 2\text{ms}$.

---

## 4. Detaillierter Arbeitsplan: SPRINT 3 (B2B & Governance)

### Arbeitspaket 3.1: Realtime Zero-Payload Invalidation & Topic Salting (Zone 2)
* **Ziel-Dateien:** [`apps/groovelab/src/services/realtimeMultiplexer.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/services/realtimeMultiplexer.ts) & betroffene Hooks
* **Architektur-Lösung:**
  * Broadcast-Payloads auf 0-Byte-Signale reduzieren (`{ type: 'INVALIDATE', scope: '...' }`).
  * Topic-Namen mit Schulsalz hashen, um Snooping mathematisch zu verunmöglichen.

### Arbeitspaket 3.2: GoBD Schullizenz DB-Lock (Zone 5)
* **Ziel-Datei:** Neue Migration `535_enterprise_school_license_billing_lock.sql`
* **Architektur-Lösung:**
  * PostgreSQL Trigger auf `invoices`, der Rechnungs- und Mahndaten für Schüler sperrt, deren Schule auf Sammelzahlung läuft (`RAISE EXCEPTION`).

### Arbeitspaket 3.3: PDF 1-Page Layout Clamping (Zone 6)
* **Ziel-Datei:** `apps/groovelab/src/services/schoolLicenseCertificatePdfGenerator.ts`
* **Architektur-Lösung:**
  * Auto-Shrink Schriftgrößen-Kaskade bei langen Schulträger- und Schülernamen zur 100%igen Einhaltung des 1-Seiten-Budgets ($257\text{mm}$).

---

## 5. Verifikations-Matrix für Sprint 1

| Schritt | Ziel | Test-Befehl | Kriterium |
|---|---|---|---|
| **1.1** | Scrubber Inversion | `tsx apps/groovelab/src/tests/test_endpoint_data_remanence.ts` | 100% PASS (inkl. neue Frage- & Draft-Keys) |
| **1.2** | Migration Traverser | `tsx scripts/verify_rls_catalog_invariants.ts` | 23/23 Invarianten PASS über alle 534+ Migrationen |
| **1.3** | Morning Gate | `node scripts/morning_gate_orchestrator.mjs` | Alle 14 Guards PASS |

---

## 🛑 Stopp-Punkt & Genehmigungsvorbehalt

Gemäß der **Implementierungsplan-Governance** (`.agents/AGENTS.md`) hält der KI-Agent an dieser Stelle an. Es wurden noch keine Code-Dateien modifiziert.

**Bitte bestätige die Freigabe zur Umsetzung von SPRINT 1 (Zone 1 Scrubber Inversion & Zone 7 Migration Traverser) durch kurze Bestätigung (z. B. „Sprint 1 starten“ oder „Genehmigt“).**
