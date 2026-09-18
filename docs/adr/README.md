# 🏛️ Architecture Decision Records (ADRs) – Campus-Groovelab

> **Zweck:** Dieses Verzeichnis dient als das unzerstörbare institutionelle Gedächtnis von **Campus-Groovelab**.  
> Jede signifikante architektonische, sicherheitsrelevante, juristische oder abrechnungstechnische Grundsatzentscheidung wird hier in prägnanter Form festgehalten.

---

## Warum ADRs für den 1% SaaS-Entwickler überlebenswichtig sind

Wenn du in 6 oder 12 Monaten eine Codezeile siehst und dich fragst:
*„Warum haben wir das damals so kompliziert gebaut? Könnte man das nicht einfach mit einem `localStorage`-Flag oder monatlichen 0,49 € lösen?“*

... schützt dich die entsprechende ADR davor, alte Fehler zu wiederholen oder Sicherheits- und Compliance-Katastrophen auszulösen.

---

## Struktur einer ADR

Jedes Dokument folgt dem bewährten MADR-Format (Markdown Architectural Decision Records):
1. **Titel & Nummer:** Eindeutige ID und sprechender Titel.
2. **Status:** `Akzeptiert`, `Vorgeschlagen`, `Veraltet` oder `Ersetzt durch ADR-xxx`.
3. **Kontext & Problemstellung:** Welche Rahmenbedingungen, Risiken oder Anforderungen lagen vor?
4. **Entscheidung:** Was haben wir verbindlich beschlossen?
5. **Konsequenzen & Invarianten:** Welche positiven Effekte hat das? Welche Grenzen müssen im Code zwingend eingehalten werden?

---

## Index der bestehenden Grundsatzentscheidungen

- [ADR-001: Fail-Closed Authentifizierung & Server-Side PIN-Verifikation](./ADR-001_FAIL_CLOSED_AUTH_AND_SERVER_PINS.md)
- [ADR-002: Ausschließlich Jahresbeitragszahlung bei Schüler-Direktabrechnung](./ADR-002_ANNUAL_FEE_DIRECT_BILLING_PROTECTION.md)
- [ADR-003: Didaktische UI-Levels (Junior/Teen/Pro) mit DB-SSOT & Realtime Broadcast](./ADR-003_CAMPUS_ADAPTIVE_UI_REALTIME_SSOT.md)
- [ADR-004: Musiker-Avatar-Beschränkung auf GrooveLab & Chalkboard-Hero für Schulleitung](./ADR-004_AVATAR_GOVERNANCE_MODULE_BOUNDARIES.md)
- [ADR-005: Barrierefreiheit nach BFSG 2025 ohne Reduktion von Marken-Akzentfarben](./ADR-005_BFSG_2025_WCAG_AA_BRAND_PRESERVATION.md)
- [ADR-006: Monolith-Entflechtung & Bounded-Context-Orchestrierung](./ADR-006_MONOLITH_DECOMPOSITION_BOUNDED_CONTEXTS.md)
- [ADR-007: Zero-Secret-Leakage, Dynamic SQL Masking & Zero-PII Telemetry](./ADR-007_ZERO_SECRET_LEAKAGE_AND_DYNAMIC_SQL_MASKING.md)
- [ADR-008: Zero-Trust Multi-Tenancy & PgBouncer Session Isolation](./ADR-008_ZERO_TRUST_SESSION_AND_MULTI_TENANCY.md)
