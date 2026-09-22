# 🏛️ Campus-Groovelab: 1% Tier-1 SaaS Enterprise+ 360° Test Architecture Standard

**Dokument-Version:** 1.0.0 (Autoritativer Monolith-Goldstandard)  
**Klassifikation:** Enterprise+ Governance / OWASP ASVS Level 3 / BSI TR-02102 / ISO/IEC 27037  
**Zielgruppe:** Senior Software Architects, Security Engineers, IT-Forensiker, KI-Coding-Agenten  

---

## 1. Executive Summary & Axiome

In einer weltklasse Tier-1 SaaS Enterprise-Plattform wie **Campus-Groovelab** basiert die Code-Qualität und Sicherheit nicht auf Zufall oder punktuellen Stichproben, sondern auf **vollständiger, deterministischer Invarianten-Verifikation (Zero Sampling)**.

Jeder Test, jedes Audit-Skript und jeder CI/CD-Guard im Monorepo unterliegt ausnahmslos den folgenden **5 unantastbaren Axiomen**:

1. **Exhaustive Traversal (Zero Sampling):**  
   Kein Test darf eine willkürliche Auswahl von 2–3 Beispieldateien prüfen und den Rest ignorieren. Tests müssen 100 % aller relevanten Quellcode-Dateien im jeweiligen Bounded Context dynamisch erfassen und prüfen.
2. **Two-Tier Separation (Performance vs. Tiefe):**  
   Prüfungen sind strikt zweistufig organisiert:
   - **Tier 1 (Täglicher Morning Check / `gate`):** Blitzschnelle AST- und Regex-Vollprüfung aller Dateien in $< 2$ Sekunden.
   - **Tier 2 (Wöchentliches Freitags-Audit / `test:forensics:all`):** Tiefgehende interaktive Multi-User-, Datenfluss- und Krypto-Simulationen.
3. **Honest Dual-Mode (Offline & CI Autarkie):**  
   Tests müssen sowohl in vollständig vernetzten Staging-Umgebungen als auch in air-gapped, lokalen oder CI-Containern ohne aktive Supabase-Verbindung verlässlich laufen. Bei fehlender Datenbankverbindung schalten Tests transparent auf statische Schema-, RLS-Policy- und Trigger-Prüfungen um (keine gefakten Tautologien, 0 unhandled Promise Rejections).
4. **Fail-Closed Contract & Gerichtsverwertbare Exkulpation:**  
   Wird eine Invariante verletzt, bricht der Testlauf zwingend mit `process.exit(1)` ab. Schulträger und Geschäftsführung müssen sich auf jeden Test als lückenlosen Sorgfaltsnachweis gem. § 43 GmbHG / § 93 AktG verlassen können.
5. **Clean Wording & BFSG 2025 Parität:**  
   Alle UI- und Komponenten-Prüfungen verifizieren aktiv den WAI-ARIA Dialog-Contract (`role="dialog"`, `aria-modal="true"`) und die Clean Dashboard Wording Directive (keine Paragraphenzeichen `§` in didaktischen Arbeitsansichten).

---

## 2. Die Two-Tier 360° Architektur

```
┌────────────────────────────────────────────────────────────────────────┐
│                   TWO-TIER 360° TEST- & COMPLIANCE-ARCHITEKTUR         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
          ┌─────────────────────────┴─────────────────────────┐
          ▼                                                   ▼
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│ TIER 1: STATISCHER AST-SCAN      │        │ TIER 2: 4-ROLLEN DEEP FORENSIK   │
│ Täglich: Morning Check / Gate    │        │ Wöchentlich: Freitags-Audit      │
├──────────────────────────────────┤        ├──────────────────────────────────┤
│ • 100% aller Quellcode-Dateien   │        │ • Reale Multi-User Interaktionen │
│ • Lückenlose AST-Traversierung   │        │ • 4 Benutzerrollen simuliert     │
│ • Zero Secrets in Views/Queries  │        │ • SHA-256 Signatur-Verifikation  │
│ • BFSG 2025 Dialog-Contracts     │        │ • Token-Rotation & Replay Defense│
│ • Clean Dashboard Wording        │        │ • Timing-Angriff Invarianz       │
│ ⏱️ Latenz: < 2 Sekunden          │        │ ⏱️ Latenz: < 15 Sekunden         │
└──────────────────────────────────┘        └──────────────────────────────────┘
```

---

## 3. Die 4 Säulen der Monorepo Test-Landschaft

### Säule 1: Die Enterprise Test-Pyramide (`npm run test:pyramid`)
Prüft die Kern-Geschäftslogik und grundlegenden Sicherheitsgrenzen (9 Stufen):
1. `test:domain`: GoBD-Grundsätze, Rechnungs- und SEPA-Nummernkreise, DIN ISO 7064 & DIN 5008.
2. `test:billing`: Kanonische Preishierarchie (EUR/CHF), DIN EN 16931-1 E-Rechnung, DIN 1333 Rundung.
3. `test:teacher-names`: DIN 5008 Abschnitt 8 („Vorname Nachname“) & DSGVO Art. 5 Maskierung.
4. `test:roster`: Schüler-Deduplizierung, Roster-Normalisierung & DSGVO Art. 5 Richtigkeit.
5. `test:avatars`: KUG § 22 & DSGVO Art. 8 Zero-Photo Doktrin mit 3D-Instrumenten-Avataren.
6. `verify:invariants`: Systemkatalog-Prüfer (`pg_tables`, `pg_policies`), erzwingt `FORCE ROW LEVEL SECURITY` auf 100% aller Mandanten-Tabellen.
7. `test:api`: ISO/IEC/IEEE 29119-4 Auth-RPC Fuzzing, Null-Byte Poisoning, SQL-Injection Abweisung.
8. `test:rls`: Dual-Authenticated Tenant Pentest (DIN EN ISO/IEC 27001 A.8.20/A.8.24).
9. `test:pentest`: Concurrency Locks, Race-Condition-Schutz bei parallelen Buchungen.

### Säule 2: Master-Runner 1 — Dashboard & Rollen-Forensik (`npm run test:dashboards`)
11 spezialisierte Suiten in `scripts/run_dashboard_forensics.ts`:
1. `test_student_dashboard_forensic.ts`: Schüler-Dashboard, KUG § 22 Avatare, neutrale Absagen.
2. `test_teacher_dashboard_forensic.ts`: Lehrer-Dashboard, ArbZG Ruhezeiten, Ausfallmeldungen.
3. `test_secretary_dashboard_forensic.ts`: Sekretariats-Cockpit, GoBD Nachweise, Buchungsgitter.
4. `test_master_admin_dashboard_forensic.ts`: Master-Admin Citadel, JIT Step-Up, Zero Data Remanence.
5. `test_parent_portal_forensic.ts`: Elternbereich, Server-PIN, Bedtime/Daytime Locks, Art. 15 Export.
6. `test_crisis_dashboard.ts`: Kriseninterventions-Board, Notfall-Kommunikation.
7. `test_qr_landingpages_forensic.ts`: Physische Ausweis-Scans, QR-Token Entropie, Fail-Closed Routing.
8. `test_multitenant_rls_all_dashboards_forensic.ts`: Cross-Dashboard Mandanten-Isolation.
9. `test_contract_schema_all_dashboards_forensic.ts`: PostgreSQL-Schema vs. TypeScript-Typen Parität.
10. `test_smoke_health_bootstrapping_all_dashboards_forensic.ts`: 0ms Bootstrapping und State-Initialisierung.
11. `test_ui_snapshot_visual_regression_all_dashboards_forensic.ts`: UI-Design-Tokens, Squircle-Radien & Dark Enterprise Theme.

### Säule 3: Master-Runner 2 — Resilienz & Offline-Autarkie (`npm run test:resilience`)
8 spezialisierte Suiten in `scripts/run_resilience_forensics.ts`:
1. `test_resilience_fault_isolation_all_dashboards_forensic.ts`: Isolierung fehlerhafter Subkomponenten (Error Boundaries).
2. `test_bunker_offline_resync_simulation.ts`: Funkloch-Autarkie (0 kbps), verlustfreies IndexedDB Queuing.
3. `test_cold_cache_hydration.ts`: Kaltstart aus dem Browser-Speicher, 0ms Initial Paint.
4. `test_isolated_unit_business_logic_all_dashboards_forensic.ts`: Deterministische Berechnungslogik.
5. `test_idempotency_transaction_all_dashboards_forensic.ts`: Netzwerk-Wiederholungen ohne doppelte Buchungen.
6. `test_endpoint_data_remanence.ts`: Bereinigung flüchtiger Endpunkt-Daten nach Session-Ende.
7. `test_tenant_quarantine.ts`: Quarantäne-Modus für kompromittierte Mandanten.
8. `test_w3c_trace_context_forensic.ts`: Lückenlose Traceability via W3C Trace-IDs (`traceparent`).

### Säule 4: Master-Runner 3 — Souveränität & Active Pentesting (`npm run test:sovereign`)
7 spezialisierte Suiten in `scripts/run_sovereign_forensics.ts`:
1. `test_tier3_sovereign_enterprise_forensic.ts`: Constant-Time String-Vergleiche ($\sigma < 150$ns), WebAudio-Resilienz.
2. `test_forensic_optimizations_suite.ts`: Laufzeit-Integrität, Prototype-Pollution, Anti-Extension Guard.
3. `test_session_replay_token_rotation_simulation.ts`: Replay-Angriffe, 1-Click Mass Killswitch.
4. `test_fuzzing_injection_defense_simulation.ts`: Deep JSON-Bomben, BiDi-Trojaner, Unicode Homoglyphen.
5. `redteam_rls_audit.ts`: Automatisierter Red-Team Pentest gegen PostgREST-Endpunkte.
6. `test_worm_audit_trail.ts`: Append-Only WORM Manipulationsschutz auf Audit-Tabellen.
7. `test_legal_compliance_360_forensic.ts`: 360° Legal & Regulatory Compliance (5 Interaktions-Vektoren).

---

## 4. Checkliste für neue & refaktorisierte Test-Suiten

Bevor eine Test-Suite als **„1% Tier-1 Goldstandard konform“** freigegeben wird, muss sie folgende Kriterien erfüllen:

- [ ] **Dynamische Dateierfassung:** Nutzt rekursive Dateisuche (`collectFiles()` oder `scanDir()`), keine statischen Einzelfile-Pfade.
- [ ] **Klare Trennung:** Reiner Code-Guard gehört in Tier 1 (`scripts/`), interaktive Verifikation in Tier 2 (`src/tests/`).
- [ ] **Honest Dual-Mode:** Läuft offline ohne DB-Verbindung (Fallback auf Schema-Dateien) und online mit DB.
- [ ] **Zero False-Positives:** Eindeutige Assertions mit präzisen Fehlermeldungen und Zeilennummern.
- [ ] **Fail-Closed:** Bei fehlschlagenden Prüfungen gibt der Prozess sofort `exit(1)` zurück.
- [ ] **Keine Paragraphen in UI:** Prüft, dass im Benutzer-Frontend keine juristischen Paragraphenzeichen auftauchen.
- [ ] **Ausführungszeit:** Suite benötigt im Einzellauf $< 5$ Sekunden.
- [ ] **Registrierung:** Ist im entsprechenden Master-Runner (`scripts/run_*.ts`) oder `package.json` registriert.
- [ ] **DIN/ISO-Normierung:** Zitierte Normen im Datei-Header und Konsolen-Banner deklariert und durch konkrete Assertions implementiert.

---

## 5. Kanonische DIN- & ISO/IEC-Normenmatrix aller Test-Suiten

| Testbereich & Befehl | Skripte / Test-Dateien | Verbindliche DIN- / ISO- / BSI-Normen | Normativer Zweck & Durchgesetzte Invariante |
| :--- | :--- | :--- | :--- |
| **SEPA & Domain**<br>`npm run test:domain` | `tests/unit/gobd-sepa-domain.test.ts` | **DIN EN ISO 20022**<br>**DIN ISO 7064**<br>**DIN 5008**<br>**GoBD (§§ 146, 147 AO)** | • `pain.008.001.08` XML-Schemavalidierung<br>• MOD 97-10 IBAN-Prüfsummen-Verifikation<br>• DIN 5008 4er-Block IBAN-Formatierung<br>• Lückenlose Rechnungssequenz bei 50 parallelen Buchungsthreads |
| **Abrechnung & E-Invoicing**<br>`npm run test:billing` | `apps/groovelab/src/domain/__tests__/runBillingInvariantTests.ts` | **DIN EN 16931-1**<br>**ISO 4217**<br>**DIN 1333**<br>**GoBD / UStG § 14** | • Semantisches Datenmodell für E-Rechnungen (BT-1 bis BT-115)<br>• Valide Währungscodes (EUR/CHF)<br>• Kaufmännische Rundung auf 2 Dezimalstellen ohne Float-Drift |
| **Lehrkraft-Kommunikation**<br>`npm run test:teacher-names` | `apps/groovelab/src/tests/runTeacherNameInvariantTests.ts` | **DIN 5008 (Abschnitt 8)**<br>**DSGVO Art. 5**<br>**OWASP ASVS Level 3** | • Zwingende Namensschreibweise „Vorname Nachname“ im Text<br>• Verbot inverser Schemata („Nachname, Vorname“)<br>• Schutz von Schüler- & Lehrkraftidentitäten |
| **Schüler-Roster & Normalisierung**<br>`npm run test:roster` | `apps/groovelab/src/tests/runStudentRosterTests.ts` | **DIN 5008 (Abschnitt 8)**<br>**DSGVO Art. 5 Abs. 1 lit. c/d**<br>**OWASP ASVS Level 3** | • Deterministische Deduplizierung von Schülerkonten<br>• Robuste Umlaut- und Leerzeichen-Normalisierung<br>• Schutz vor Ghost- & Test-Schülern im Roster |
| **3D-Avatare & Bildnisschutz**<br>`npm run test:avatars` | `apps/groovelab/src/tests/runAvatarResolutionTests.ts` | **KUG § 22**<br>**DSGVO Art. 8**<br>**OWASP ASVS Level 3** | • Zero-Photo Doktrin für Minderjährige<br>• Deterministische Zuweisung von 3D-Instrumenten-Avataren<br>• Neutraler Raumavatar-Fallback bei Theorie-/Sonderfächern |
| **Mandantentrennung & RLS**<br>`npm run test:rls`<br>`npm run verify:invariants` | `tests/security/rls-isolation.test.ts`<br>`scripts/verify_rls_catalog_invariants.ts` | **DIN EN ISO/IEC 27001 (A.8.20/A.8.24)**<br>**DIN EN ISO/IEC 27002:2022**<br>**BSI C5**<br>**BSI IT-Grundschutz APP.3.1** | • Multi-Tenant Isolation: Schule B kann niemals Daten von Schule A lesen<br>• `FORCE ROW LEVEL SECURITY` auf 100% aller Mandanten-Tabellen im PostgreSQL-Katalog<br>• Dual-Authenticated Penetration Testing |
| **API-Verträge & Pentesting**<br>`npm run test:api`<br>`npm run test:pentest` | `tests/contracts/auth-rpc-fuzzing.test.ts`<br>`tests/e2e/pentest-race-conditions.test.ts` | **ISO/IEC/IEEE 29119-4**<br>**DIN EN ISO/IEC 25010**<br>**DIN EN ISO/IEC 27001 (A.8.29)**<br>**OWASP ASVS Level 3** | • Fuzzing- & Robustheitstests für Auth-RPCs<br>• Fail-Closed Contract-Validierung gegen ReDoS & SQLi<br>• Race-Condition Immunität & Concurrency Locks |
| **Dashboard- & Rollen-Forensik**<br>`npm run test:dashboards`<br>*(Master-Runner 1: 11 Suiten)* | `scripts/run_dashboard_forensics.ts`<br>`apps/groovelab/src/tests/test_*_dashboard*.ts` | **DIN EN ISO 9241-110:2020**<br>**DIN EN ISO 9241-210:2020**<br>**DIN EN 301 549 V3.2.1**<br>**ISO 8601** | • Ergonomie interaktiver Systeme & Dialoggrundsätze<br>• Barrierefreiheit nach WCAG 2.2 Stufe AA & BFSG 2025<br>• Normierte Kalenderwochen- & Datumsformate in Stundenplänen<br>• Clean Dashboard Wording & Visual Design Tokens (Squircle-Radien) |
| **Resilienz & Offline-Autarkie**<br>`npm run test:resilience`<br>*(Master-Runner 2: 8 Suiten)* | `scripts/run_resilience_forensics.ts`<br>`apps/groovelab/src/tests/test_bunker_offline*.ts` | **DIN EN ISO/IEC 25010**<br>**DIN EN ISO 22301:2020**<br>**DIN EN ISO/IEC 27001 (A.8.14)**<br>**W3C Trace Context** | • Fehlertoleranz, Teilnetz-Isolierung & Ausfallsicherheit<br>• Business Continuity Management (Funkloch-/Bunker-Autarkie 0 kbps)<br>• Lückenlose Traceability via `traceparent` Header |
| **Digitale Souveränität & Beweissicherung**<br>`npm run test:sovereign`<br>*(Master-Runner 3: 7 Suiten)* | `scripts/run_sovereign_forensics.ts`<br>`apps/groovelab/src/tests/test_worm_audit_trail.ts`<br>`test_legal_compliance_360_forensic.ts` | **DIN EN ISO/IEC 27037:2016**<br>**DIN EN ISO/IEC 27001 (A.8.15/A.8.16)**<br>**BSI TR-02102-1**<br>**NIS-2 & § 202a StGB** | • Gerichtsverwertbare IT-Forensik & digitale Beweismittelsicherung<br>• WORM-Audit-Trail & Non-Repudiation Siegel<br>• Kryptographische Best-Practices & Constant-Time String-Vergleiche |
| **Security Drift Guard**<br>`npm run security:check` | `scripts/security_drift_guard.mjs` | **DIN EN ISO/IEC 27001 (A.8.28)**<br>**NIST SP 800-161**<br>**OWASP ASVS Level 3** | • Sichere Programmierung & statischer Invarianten-Wächter<br>• 14 verbotene Frontend-/Backend-Architektur-Muster |
| **Perimeter- & Header-Prüfung**<br>`npm run verify:headers:static`<br>`npm run operator:post-deploy` | `scripts/verify_static_security_headers.mjs`<br>`scripts/verify_perimeter_headers.mjs` | **BSI TR-02102-2**<br>**BSI TR-03116-4**<br>**DIN EN ISO/IEC 27001 (A.8.20/A.8.26)**<br>**W3C CSP Level 3** | • Konforme TLS- & Cipher-Vorgaben der Bundesverwaltung<br>• HSTS, CSP Level 3, Framing-Schutz<br>• Mozilla Observatory Grade A+ Garantie im Live- und Static-Audit |
| **Performance- & Bundle-Budget**<br>`npm run check:budget` | `scripts/check-bundle-budget.js` | **DIN EN ISO/IEC 25010**<br>**DIN EN ISO/IEC 25023**<br>**W3C Core Web Vitals** | • Performance-Effizienz: Zeitverhalten & Ressourcenverbrauch<br>• Begrenzung von Bundle-Größen zur Einhaltung von LCP, INP und CLS |

