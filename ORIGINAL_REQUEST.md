# Original User Request

## Initial Request — 2026-06-16T19:43:20+02:00

Overhaul the event planning board in the secretary/admin dashboard to become a central event coordinator, replacing lesson columns with a dynamic planning tool for public concerts, stage layouts, pause insertion, teacher program point feedback submission, checklist pack lists, and Excel exports.

Working directory: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app
Integrity mode: development

## Requirements

### R1. UI-Umbau des Termine-Boards für Sekretariat
- Entferne die erste Spalte mit "Unterrichtsterminen" für Verwaltung-User komplett (diese werden nur im Lehrer-Dashboard angezeigt).
- Verschiebe "Campus & Schultermine" nach links in den Hauptbereich.
- Integriere ein zentrales Planungs-Dashboard für Events und Konzerte.

### R2. Event-Konfiguration & Programm-Zusammenstellung
- Ermögliche das Konfigurieren eines Events (z.B. Musikschulfest) mit: Anzahl der Bühnen, Gesamtdauer der Veranstaltung und Dauer des Konzertprogramms.
- Sekretariat kann direkt aus der Maske eine "Programmpunkt melden"-Mitteilung an die Lehrer senden (Gruppe, Anzahl, Dauer).
- Lehrer können über ihr Dashboard Programmpunkte für das Event einreichen (Name, Ensemble/Band, Anzahl Auftretende, Spieldauer, Wunschzeit, Titel, Interpret, Komponist, Arrangeur, Verlag, Technikbedarf, benötigte Stühle/Notenständer, Bemerkung).
- Die Verwaltung kann diese eingereichten Programmpunkte einsehen, Bühnen zuteilen, Pausen eintragen und die Reihenfolge der Programmpunkte (wie im Stundenplan-Designer) festlegen.

### R3. Packliste & Zusatz-Rückmeldungen
- Die Verwaltung kann weitere Rückmeldungen anfordern (z.B. GEMA-Meldung, Technikbedarf).
- Basierend auf den eingegebenen Notenständern, Stühlen und dem Technikbedarf aller Programmpunkte wird automatisch eine übersichtliche Packliste (konsolidiert nach Bühne oder Gesamt-Event) generiert.

### R4. Custom Excel Export
- Ermögliche einen flexiblen Tabellen-Export (Excel/CSV), bei dem das Sekretariat per Checkboxen auswählen kann, welche Spalten exportiert werden sollen (Uhrzeit, Bühne, Lehrer, Ensemble, Anzahl Auftretende, Titel, Interpret, Komponist, Arrangeur, Verlag, Technikbedarf, Stühle, Notenständer, Wunschzeit, Bemerkung).

## Acceptance Criteria

### Event Setup & Program Assembly
- [ ] Secretary can create and configure an event with multiple stages and duration inputs.
- [ ] Program points can be submitted by teachers and show up in the admin event panel.
- [ ] Program points can be reordered (sorted sequentially) and assigned to specific stages or pauses.

### Packlist & Export
- [ ] Consolidated equipment pack list (chairs, music stands, tech requirements) is computed and displayed.
- [ ] Excel/CSV export is functional and respects the checkbox selections for columns.

## Follow-up — 2026-06-21T08:38:28Z

Wir müssen die 4 verbleibenden Fehler im Real-Mode E2E-Test-Runner beheben, damit alle 123 Tests im Real-Modus (USE_MOCK=false) erfolgreich durchlaufen.

Arbeitsverzeichnis: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app
Integritätsmodus: development

## Anforderungen

### R1. Analyse und Behebung der 4 Testfehler im Real-Modus
- Untersuche und behebe die folgenden fehlgeschlagenen Testfälle in `apps/groovelab/src/tests/e2e_test_cases.ts` oder den entsprechenden Datenbank-Richtlinien/Triggern:
  1. **`T1_F1_2`**: Student lessons werden in der realen Datenbank nicht zurückgegeben. Überprüfe die RLS-Richtlinie auf der Tabelle `lessons` oder die Test-Seeding-Daten.
  2. **`T2_F8_4`**: TypeError bei `additional_feedback_responses`. Stelle sicher, dass der Programmpunkt vor dem Auslesen korrekt angelegt wurde.
  3. **`T4_1`**: TypeError bei `id` während des Gala-Konzert-Szenarios. Behebe fehlende Verknüpfungen oder fehlgeschlagene Datenbank-Inserts.
  4. **`T4_5`**: TypeError bei `name` während des Security-Audits. Behebe das unvollständige Laden der Benutzer- bzw. Rollen-Objekte im Real-Modus.

### R2. Beibehaltung der Test-Integrität
- Stelle sicher, dass keine produktiven Benutzer- oder Schulinformationen modifiziert oder gelöscht werden (nur Testdaten mit `school_id` wie `school-1` oder temporär generierten IDs verwenden).
- Die Testfälle müssen weiterhin im Mock-Modus (`USE_MOCK=true`) zu 100% bestehen.

## Akzeptanzkriterien

- [ ] Die 4 fehlerhaften Tests sind korrigiert.
- [ ] Der Real-Mode E2E-Test-Runner läuft erfolgreich durch:
  ```bash
  USE_MOCK=false npx tsx apps/groovelab/src/tests/run_e2e_tests.ts
  ```
  liefert **123/123 bestandene Tests (100% Success rate)**.
- [ ] Alle Änderungen wurden durch den Victory-Auditor auf Integrität geprüft.

## Follow-up — 2026-06-21T09:15:15Z

Führe eine 15-minütige Echtzeit-Lastsimulation mit ca. 6.500 aktiven Benutzern auf der Supabase-Datenbank aus und evaluiere die Ergebnisse durch ein 5-köpfiges Expertenteam.

Working directory: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app
Integrity mode: development

## Requirements

### R1. Lastsimulations-Skript & Ausführung
Ein Node.js-Skript soll erstellt und ausgeführt werden, das 15 Minuten lang Zugriffe von den ~6.500 erstellten Dummy-Benutzern simuliert (70% Lese-Operationen, 20% Check-ins, 10% Schreib-Operationen).

### R2. Expertenteam-Auswertung
Fünf spezialisierte Agenten-Rollen (Quality Control, Cyber-Security, Database, Server/Infrastructure, App Developer) müssen die Simulationsdaten analysieren und spezifische Berichte erstellen.

### R3. Konsolidierter Report
Ein zusammenfassender Report im Format von `simulation_reports_15m.md` soll erstellt werden, der alle Erkenntnisse und konkrete Optimierungsvorschläge enthält.

## Acceptance Criteria

### Simulationserfolg
- [ ] Das Lasttest-Skript läuft stabil über die vollen 15 Minuten.
- [ ] Anfragen werden für alle 10 neu angelegten Dummy-Schulen durchgeführt.
- [ ] Ein Log-Protokoll der Skript-Ausführung wird im Projektverzeichnis gespeichert.

### Analyse-Qualität
- [ ] Der Report enthält präzise Latenzmetriken (p50, p95, p99).
- [ ] RLS-Richtlinien und eventuelle Sicherheitslücken (z. B. RLS-Violations) sind dokumentiert.
- [ ] Vorschläge zur Code- und Datenbankoptimierung (z. B. RPCs, Indizes) sind mit SQL/Code-Beispielen hinterlegt.

## Verification
- Der Erfolg der Simulation wird durch das Vorhandensein des Ausführungsprotokolls (Log-Datei) und die Datei `simulation_reports_15m.md` im Projektverzeichnis verifiziert.

## Follow-up — 2026-06-28T22:23:17+02:00

Fully integrate the newly approved Trello-style landing page with real screenshots into the Campus-Groovelab React application, including the view state toggling logic that displays this page to unauthenticated visitors before they click 'Log In'.

Working directory: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app
Integrity mode: benchmark

## Requirements

### R1. Landing Page UI Component
Create a new React component at `apps/groovelab/src/components/LandingPage.tsx` based on the design, layout, content, and integrated screenshot assets specified in [landing_page_concept.md](file:///Users/patrickhuber/.gemini/antigravity/brain/51dc4a45-6c04-4394-8d1a-6997e87e668b/landing_page_concept.md).

### R2. URL-based Routing Integration
Install `react-router-dom` in the `apps/groovelab` workspace. Configure a router in the application entrypoint (e.g., `App.tsx` or `main.tsx`) supporting these routes:
- `/` renders the new `LandingPage` for all public visitors.
- `/login` renders the existing `LoginScreen` component.
- Logged-in users should access their corresponding dashboard view correctly.

### R3. Session State Passing
Ensure that authentication sessions (managed via Supabase) are properly validated, routed, and passed down. Entering `/` when already authenticated should redirect the user to their active dashboard, while accessing dashboard routes without authentication should redirect to `/`.

## Verification Plan

### Automated Verification
- Run `npm run build:groovelab` to ensure there are no compilation errors or linter warnings.
- Run `npx tsc -p apps/groovelab` to verify strict TypeScript compilation passes.

### Manual Verification
- Deploy/start local server and verify that visiting `/` displays the Landing Page.
- Click "Anmelden" on `/` and confirm URL updates to `/login` and renders the Login screen.
- Authenticate and confirm redirect to the dashboard.

## Acceptance Criteria

### Compilation & Build
- [ ] TypeScript compilation passes with zero errors: `npx tsc -p apps/groovelab`
- [ ] Production build succeeds without errors: `npm run build:groovelab`

### Routing & Authentication
- [ ] Accessing `/` when unauthenticated renders `LandingPage`.
- [ ] Accessing `/login` when unauthenticated renders `LoginScreen`.
- [ ] If already authenticated, accessing `/` or `/login` redirects automatically to the respective dashboard.


## 2026-07-12T19:31:50Z

Simulation und Belastungstest für die Campus-Groovelab Applikation mit steigender Benutzeranzahl.

Working directory: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app
Integrity mode: development

## Requirements

### R1. Belastungssimulation starten
- Simulation der aktiven Nutzung beginnend mit 8 Schulen, 50 Lehrern und 500 Schülern pro Schule.
- Simuliert werden sollen Aktionen wie:
  - Krankheitsmeldung
  - Terminverschiebung
  - Räume buchen
  - Digitales Hausaufgabenheft
  - Audio-Aufnahmen & Loopstation-Aktivitäten
  - XP-Sammeln & Sticker-Belohnungen
  - Fokus-Timer
- Die API-Calls sollen über die Supabase-Clientverbindung durchgeführt werden.

### R2. Ressourcen-Analyse & Server-Monitoring
- Live-Abfrage der Server-Statistiken auf dem VPS `178.105.10.2` via SSH (uptime, free -m, df -h, CPU-Last etc.).
- Analyse von CPU-Auslastung, RAM-Verbrauch, Festplattenspeicher (Datenbank/Storage) und API-Latenzen (p95, Average).
- Identifikation der rechenintensivsten und speicherintensivsten Funktionen.

### R3. Iterative Skalierung
- Wenn das System unter den Grenzwerten bleibt (CPU-Last < 8.0, p95-Latenz < 800ms, Fehlerrate < 8%), werden die Werte (Anzahl Schulen und User) für die nächste Stufe verdoppelt (z.B. 16 Schulen, 100 Lehrer, 1000 Schüler pro Schule, und so weiter).
- Der Prozess wiederholt sich, bis ein Limit detektiert wird.

### R4. Sicherheit & Datenschutz
- Es dürfen keine echten Benutzerdaten gelöscht oder beeinträchtigt werden. Alle temporär erstellten Schulen und Benutzer müssen nach jedem Testlauf bzw. nach Ende des gesamten Tests physisch und rückstandslos gelöscht werden (Clean-Up).
- Die Namens-Anonymisierung und Datenschutz-Standards (gemäß Projekt-Regeln) müssen bei der Generierung der Testdaten beachtet werden (z. B. keine SEPA- oder Vertragsdaten, Namens-Anonymisierung auf Vorname + Anfangsbuchstabe Nachname).

## Acceptance Criteria

### Simulationsdurchführung
- [ ] Vollständige Durchführung der Belastungssimulation auf dem Testserver, bis ein Limit erreicht ist.
- [ ] Ausführlicher Report in einer neuen oder aktualisierten Markdown-Datei (`simulation_stress_report.md`), die alle Teststufen (Schulen, User, Durchsatz req/s, Latenzen, CPU/RAM/Swap-Werte und Fehlerquote) übersichtlich alistet.
- [ ] Detaillierte Angabe, welche spezifische Funktion (z.B. Loopstation-Spuren, Fokus-Timer, Raum-Engine) die meiste CPU-Last bzw. den meiste Speicher benötigt.
- [ ] Vollständiger Clean-Up aller während des Tests angelegten Schulen, Benutzer und zugehöriger DB-Einträge.

## 2026-07-15T18:22:03Z

Das Ziel dieses Projekts ist es, ein Experten-Team (Rechtsanwalt, Cybersecurity-Spezialist, Datenschutzbeauftragter und Programmierer) mit der Durchführung und Implementierung eines vollständigen, rechtssicheren Audits und Updates der Rechtsdokumente (AGB, Datenschutz, Impressum) sowie der technischen Absicherungen auf der Plattform Campus-Groovelab zu beauftragen.

Working directory: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app
Integrity mode: demo

## Requirements

### R1. Rechtssichere Rechtsdokumente (B2B)
Die Allgemeinen Geschäftsbedingungen (AGB), die Datenschutzerklärung und das Impressum auf der Landingpage der Plattform Campus-Groovelab müssen zu 100% mit der technischen Realität der App übereinstimmen. Alle Haftungsklauseln müssen für den reinen B2B-Verkehr rechtssicher formuliert sein.

### R2. Technische Datenschutz- & Timer-Ausrichtung
Die Beschreibungen der Lagesensoren, des Übe-Timers (Toleranzzeit von 10 Sekunden, die erst nach den Fokus-Minuten greift), des iCal-Exports (Pseudonymisierung zu "Vorname A.") und des Serverstandorts (100% in Deutschland, Hetzner Falkenstein) müssen sich exakt und ohne Widersprüche im Quellcode und in den Rechtstexten wiederfinden.

### R3. Generisches Rate-Limiting & Sicherheit
Die Klauseln zu automatisierten IP-Sperren in den AGB müssen an das tatsächliche Verhalten des Systems angepasst und rechtssicher verallgemeinert werden, ohne Falschangaben über feste Sperrzeiten zu machen.

## Acceptance Criteria

### Rechtliche Validierung
- [ ] Alle Rechtstexte (AGB, Datenschutz, Impressum) im Modal der Landingpage sind aktualisiert und frei von nicht existierenden GbR-Bezeichnungen (Simplified Work GbR entfernt, Vertragspartner ist Patrick Huber als Einzelunternehmer).
- [ ] Die AGB definieren die Timer-Gewährleistung mit einer 10-sekündigen Grace Period, welche erst nach Ablauf der Fokus-Minuten aktiv wird.
- [ ] Der Server-Standort wird einheitlich und wahrheitsgemäß als 100% Deutschland (Hetzner Falkenstein) deklariert.
- [ ] Die Kalender-Pseudonymisierung ist mit dem tatsächlichen Format (z. B. "Jonas M.") synchronisiert.
- [ ] Das Rate-Limiting ist in den AGB allgemein gehalten und verweist nicht auf starre, nicht im Code existierende Sperren.
- [ ] Die Anwendung lässt sich nach allen Änderungen fehlerfrei kompilieren (`npm run build` läuft erfolgreich durch).
