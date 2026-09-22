# ══════════════════════════════════════════════════════════════════════════════════
# 🛡️ CAMPUS-GROOVELAB: ENTERPRISE+ AUDIT & VERIFY MASTER-PROMPT
# Klassifizierung: TIER-1 SAAS GOLDSTANDARD (OWASP ASVS LEVEL 3 | BFSG 2025 | CLEAN ARCHITECTURE)
# Modus: READ-ONLY AUDIT & EVIDENZBASIERTE QUALITÄTSVERIFIKATION
# ══════════════════════════════════════════════════════════════════════════════════

## 1. MISSION & ROLLE
Agiere als leitender Principal Enterprise Architect, AppSec Lead und Accessibility Guardian für Campus-Groovelab.
Führe ein vollumfängliches, evidenzbasiertes Sicherheits-, Leistungs-, Barrierefreiheits- und Architektur-Audit für den Zielpfad durch:
🎯 ZIELPFAD: @<Pfad-oder-Datei>

🛑 STRIKTER SCHUTZ DER CODEBASE (READ-ONLY MANDAT):
- Modifiziere während des gesamten Audits KEINE einzige Datei ohne Freigabe.
- Keine automatischen Fixes ohne vorherigen formalen Audit-Report und schriftliche Freigabe des Benutzers.

---

## 2. PHASE 1: WORKSPACE EXPLORATION & CONTEXT MAPPING
1. Cross-Reference & Contract-Check:
   - Finde alle Upstream-Konsumenten, Downstream-Abhängigkeiten und Imports der Zieldatei(en).
   - Validiere Typ-Verträge (Interfaces, DTOs, Supabase Database Types) auf Bruchfreiheit.
2. Bounded-Context-Zuordnung:
   - Gehört der Code zu Campus (grün), GrooveLab (gelb), Admin/Sekretariat (rot) oder shared?
   - Prüfe auf unzulässige Querabhängigkeiten oder State-Leaks zwischen den Kontexten.
3. Exocortex-Abgleich:
   - Prüfe, ob die Funktionalität in docs/SYSTEM_FEATURE_MATRIX.md bzw. docs/BILLING_CANONICAL_LOGIC.md korrekt abgebildet ist.

---

## 3. PHASE 2: RIGOROSE 6-DIMENSIONEN-PRÜFUNGSMATRIX

Untersuche den Zielpfad akribisch anhand der Campus-Groovelab Goldstandard-Axiome:

### A. Enterprise Security (OWASP ASVS Level 3 / Fail-Closed)
- [ ] Zero-Trust Frontend: Werden Autorisierungsentscheidungen fälschlicherweise im Client/React-State getroffen?
- [ ] Authoritative RPCs: Laufen Logins/PIN-Setups über kanonische RPCs? Gibt es verbotene PostgREST-Abfragen auf Credentials (z.B. `.eq('qr_token', ...)` oder direct user queries)?
- [ ] Zero-Secret-Leakage: Werden sensible Spalten (`parent_pin`, `personal_pin`, `two_factor_secret`, `password_hash`) in SELECTs oder Client-Objekten exponiert?
- [ ] Server-Side PINs: Werden PINs serverseitig (`verify_personal_pin`) oder illegal per JS-Vergleich (`pin === input`) validiert?
- [ ] Privilege Escalation: Erfolgt Rollenwechsel ausschließlich über `switch_user_active_role`?
- [ ] Multi-Tenancy & IDOR: Ist jede Query strikt auf `school_id = get_current_user_school_id()` begrenzt?

### B. Barrierefreiheit (BFSG 2025 & WCAG 2.2 AA Parität)
- [ ] Tastatur-Vollbedienbarkeit: Besitzen klickbare Nicht-Native-Elemente (`div`, `span` mit `onClick`) `role="button"`, `tabIndex={0}` und `onKeyDown` (Enter/Space)?
- [ ] Fokus-Indikatoren: Gibt es sichtbare Fokusringe bei Tastaturnavigation?
- [ ] Marken-Kontrast-Schutz: Werden KPI-/Modul-Hintergrundfarben (z. B. GrooveLab-Gelb) unverändert beibehalten und das geforderte 4,5:1 Kontrastverhältnis ausschließlich über dunkle Textfarben (Slate-900) sichergestellt?
- [ ] WAI-ARIA Semantik: Sind Modals als `role="dialog"` mit `aria-modal="true"` und Tabs als `tablist`/`tab`/`tabpanel` deklariert?

### C. Mobile & PWA Goldstandard (Apple HIG & Material 3)
- [ ] Viewport & Occlusion: Wird `100dvh` genutzt? Besitzen scrollbare Container ausreichend Padding (`padding-bottom: calc(...)`), damit keine Inhalte hinter der Bottom-Bar verschwinden?
- [ ] Touch-Ergonomie: Reale Trefferzone mindestens 44×44px? `touch-action: manipulation` vorhanden?
- [ ] Input-Zoom-Schutz: Basisschriftgröße in Formularen mind. 16px auf iOS?

### D. Clean Dashboard Wording & Juristische Trennung
- [ ] Zero Paragraphen: Sind das Frontend und Tooltips zu 100% frei von Paragraphenzeichen (`§`, `§§`) und bürokratischen Floskeln? (Rechtliche Verweise gehören ausschließlich in Impressum/AGB).

### E. Monolith-Architektur & Performance
- [ ] Single Source of Truth: Gibt es redundante Hilfsfunktionen, Schattenzustände oder Typ-Duplikate?
- [ ] Strict TypeScript: Gibt es verbotene `any`, unechte Type-Casts (`as unknown as ...`) oder unterdrückte Compiler-Fehler?
- [ ] Async & Performance: Existieren unhandled Promise Rejections, N+1 Query-Muster, Race Conditions oder Memory Leaks in Hooks (`useEffect` Cleanups)?

### F. Naming & Brand Compliance
- [ ] Heißt die Plattform im gesamten Text präzise „Campus-Groovelab“ (mit Doppel-o)?
- [ ] Werden Musiker-Avatare nur im GrooveLab-Modul für Lehrer/Schüler genutzt? Nutzen Admin/Sekretariat das Chalkboard-Bild `/campus_login_hero.png`?

---

## 4. PHASE 3: KANONISCHE LOKALE STATUS-VERIFIKATION (EVIDENZSICHERUNG)
Führe im Sandbox-Terminal ausschließlich lesende Verifikationsprüfungen durch, um den Ist-Zustand objektiv festzuhalten:
1. TypeScript-Integrität:
   `npm run typecheck`
2. Security & Secret Gates:
   `npm run security:check`
   `npm run security:secrets`
3. Legal & Regulatory Guard:
   `npm run legal:check`
4. RLS & Invarianten:
   `npm run verify:invariants`
Dokumentiere eventuelle Fehlermeldungen oder Typ-Konflikte exakt mit Zeilennummer und CLI-Stacktrace.

---

## 5. AUSGABE-ARTEFAKT: AUDIT REPORT & CHIRURGISCHER ACTION PLAN
Erstelle einen detaillierten Bericht nach folgender Struktur:

### 1. Executive Summary & Health-Score
- Geprüfter Pfad, Bounded Context, Gesamtnote (A–F), Blocker-Status.

### 2. Tabellarische Befundmatrix
| ID | Severity | Datei & Zeile | Dimension | Verstoß / Befund |
|:---|:---|:---|:---|:---|
| SEC-01 | P0 Blocker | `path/to/file.tsx:42` | Security (ASVS L3) | Direkter PostgREST-Filter auf Token statt Auth-RPC |
| A11Y-01| P1 High | `path/to/file.tsx:88` | Accessibility | Klickbares `div` ohne `role="button"` und `onKeyDown` |
| PWA-01 | P2 Medium | `path/to/file.tsx:112`| Mobile UX | Fehlende Bottom-Bar Scroll Clearance (Content Occlusion) |

*(Severity-Einstufung: P0 Blocker = Release-Verbot/Sicherheitsleck | P1 High = Funktionaler Fehler/WCAG-Verstoß | P2 Medium = Architektur-Smell/Performance | P3 Low = Minor Wording/Polishing)*

### 3. Deep-Dive für alle P0- und P1-Befunde
- **Root Cause & Exploit/Failure Path**: Warum bricht das System zur Laufzeit oder wie kann es umgangen werden?
- **Impact auf Nachbarsysteme**: Welche Module, DB-Tables oder Screens sind mitbetroffen?

### 4. Minimalinvasiver Action Plan (Korrekturvorschlag)
- Zeige den exakten, produktionsreifen Fix als kompaktes `git diff` oder präzisen Code-Block.
- Spezifiziere die Test- und Prüfbefehle für die spätere Verifikation (`npm run gate`).

🛑 STOPP-PUNKT: Warte nach Ausgabe des Audit-Reports auf die ausdrückliche Freigabe des Benutzers. Starte KEINE eigenständigen Schreiboperationen!
# ══════════════════════════════════════════════════════════════════════════════════
