# 🏛️ 0,1% Enterprise Goldstandard Deployment & Live-Cluster Reconciliation

## 📋 1. Forensische Befund-Matrix (Status Quo)

| Prüf-Vektor | Lokaler Stand (Workspace / Git) | Live-Cluster (178.105.10.2) | Forensischer Status |
| :--- | :--- | :--- | :--- |
| **Git HEAD** | `68625079` (Passkey Citadel, Sibling Linking, Health Guard) | `release_20261009_012940` (7 Commits im Rückstand!) | 🚨 **DRIFT: 7 Commits fehlen** |
| **DB-Migrationen** | Migration **553** (`webauthn_passkey_citadel.sql`) | Migration **539** (`is_demo_tenant`) | 🚨 **DRIFT: 14 Migrationen fehlen** |
| **DB-Tabellen** | `private_auth.webauthn_credentials`, `school_sepa_mandates`, `system_alerts` | Fehlen komplett auf `supabase-db` | 🚨 **CRITICAL: RPCs & Queries crashen** |
| **BFF-Gateway** | Zod Ingress, Idempotency Ledger, Token Refresh Mutex | Docker-Container vor 7 Tagen eingefroren | ⚠️ **STALE: Backend-Logik veraltet** |
| **Web-Ingress** | Nginx Document Root erwartet `/var/www/groovelab/current` | Docker cp in ephemeren Container ohne Host-Mount | ⚠️ **FRAGILE: Ephemerer Layer** |
| **Agenten-Regel** | `commit und deploy` führt nur Git-Commit aus | `deploy.sh` wurde nie aufgerufen | 🚨 **PROCESS: Fehlende Pipeline-Kopplung** |

---

## 🎯 2. Der 0,1% Enterprise Goldstandard (Soll-Zustand)

Ein weltklasse Deployment nach **OWASP ASVS Level 3**, **ISO/IEC 27001 (A.8.29)** und **BSI IT-Grundschutz (OPS.1.1.6)** erfordert einen geschlossenen Regelkreis (**Closed-Loop Deployment Engine**):

```
┌────────────────────────────────────────────────────────────────────────┐
│           0,1% ENTERPRISE CLOSED-LOOP DEPLOYMENT ENGINE                │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
  Phase 1: Pre-Flight Gate         ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │  npm run gate && npm run verify:invariants && npm run typecheck     │
  └────────────────────────────────┬────────────────────────────────────┘
                                   │
  Phase 2: DB Schema Reconciliation▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │  Automatischer Migrations-Runner (scripts/apply_pending_migrations.sh)│
  │  - Identifiziert ausstehende Migrationen (540 bis 553)             │
  │  - Transaktionale, atomare Ausführung auf supabase-db               │
  │  - PostgREST Schema-Reload: NOTIFY pgrst, 'reload schema'          │
  │  - Schema-Paritäts-Beweis: 0 ausstehende Migrationen               │
  └────────────────────────────────┬────────────────────────────────────┘
                                   │
  Phase 3: Production Build & Seal ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │  npm run build:groovelab (Vite + SRI + Precompression + sw.js bump) │
  │  Erzeugt versionsgebundenen Release-Hash in dist/version.json       │
  └────────────────────────────────┬────────────────────────────────────┘
                                   │
  Phase 4: Atomarer Live-Sync      ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │  rsync apps/groovelab/dist/ -> 178.105.10.2:/var/www/groovelab/... │
  │  Atomarer Symlink-Switch current -> new_release                     │
  │  Container-Sync & Web-Ingress Reload                                │
  │  BFF-Container Restart bei Backend-Änderungen                       │
  └────────────────────────────────┬────────────────────────────────────┘
                                   │
  Phase 5: Kryptografischer Beweis ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │  - Curl https://campus-groovelab.de/version.json                    │
  │  - KRYPTOGRAFISCHER HASH-ABGLEICH: Live-Version == Build-Version    │
  │  - Perimeter Headers Check (Mozilla Observatory A+)                 │
  │  - Git Tag v<timestamp> & Git Push                                  │
  └─────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ 3. Detaillierter Umsetzungsplan (Schritt für Schritt)

### Schritt 1: Automatischer Migrations-Runner (`scripts/apply_pending_migrations.sh`)
* Erstellung eines deterministischen, idempotenten Shell-Skripts:
  * Liest alle nummerierten Migrationen (`supabase/migrations/[0-9]*.sql`) ein.
  * Prüft auf dem Live-PostgreSQL (`supabase-db`), welche Migrationen bereits angewendet wurden.
  * Führt die noch offenen Migrationen (540 bis 553) in korrekter Reihenfolge transaktionssicher aus.
  * Sendet `NOTIFY pgrst, 'reload schema';`.
  * Verifiziert die Existenz der neuen Tabellen (`private_auth.webauthn_credentials`, `school_sepa_mandates`, Spalte `sibling_group_id` etc.).

### Schritt 2: Härtung von `deploy.sh`
* **Entfernung veralteter Heuristiken:** Der starre Check auf `teacher_score_snippets` (Migration 537) wird durch den dynamischen Schema-Paritäts-Check ersetzt.
* **Release-Hash Verifikation:** Nach dem Upload ruft `deploy.sh` `https://campus-groovelab.de/version.json` ab und vergleicht den Zeitstempel/Hash mit der lokalen `dist/version.json`. Bei Abweichung schlägt das Skript fail-closed mit Rollback fehl.
* **BFF-Awareness:** Bei Änderungen in `packages/bff-server` wird der Container `groovelab-bff` neu gebaut bzw. neugestartet.

### Schritt 3: Schärfung von `.agents/AGENTS.md` (Verbindliche Codewort-Doktrin)
* Definition des Codeworts **`commit und deploy`**:
  * Der Agent führt **nicht nur** `git commit` aus, sondern zwingend die gesamte Kette bis einschließlich `bash deploy.sh` und kryptografischer Live-Verifikation.
  * Erst wenn `https://campus-groovelab.de/version.json` den identischen Hash liefert und der Perimeter-Check bestanden ist, darf der Agent Vollzug melden.

### Schritt 4: Sofortige Live-Reconciliation (Ausführung)
1. **Migrationen 540 bis 553** atomar auf `178.105.10.2` anwenden.
2. **Neuen Produktions-Build** erstellen (inkl. der 7 unübertragenen Commits).
3. **Live-Deployment** nach `178.105.10.2` ausführen.
4. **Verifikation:** Live-Perimeter-Check und Hash-Validierung live auf `https://campus-groovelab.de`.

---

## 🛑 Stopp-Punkt & Genehmigungsvorbehalt
Gemäß der Monolith-Governance und Implementierungsplan-Richtlinie startet die Ausführung **erst nach deiner ausdrücklichen Freigabe** im Chat.
