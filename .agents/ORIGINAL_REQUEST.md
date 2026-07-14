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

## Follow-up — 2026-06-17T18:10:49+02:00

Overhaul the event planning board in the secretary/admin dashboard and teacher dashboard to implement a central event coordinator, replacing lesson columns with a dynamic planning tool, stage layout scheduler, pause insertion, teacher program point feedback submission, checklist pack lists, and Excel exports.

Working directory: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app
Integrity mode: benchmark

## Requirements

### R1. Rolle-basiertes Layout-Overhaul (Termine-Board)
- **Admins & Secretaries**:
  - Spalte 1: Campus & Schultermine (die komplette Event-Timeline).
  - Spalte 2: Event-Planungs-Modul (Zentrales Planungs-Tool).
  - Spalte 3: Infos der Verwaltung (Ankündigungen & Mitteilungen).
  - CSS-Grid anpassen: `gridTemplateColumns: 'minmax(360px, 1.5fr) minmax(380px, 1.8fr) minmax(300px, 1.2fr)'`.
- **Teachers**:
  - Spalte 1: Unterrichtstermine.
  - Spalte 2: Campus & Schultermine.
  - Spalte 3: Event Planung (leer anzeigen: "Keine aktiven Event-Planungen", es sei denn, der Lehrer ist an einem Event beteiligt – dann Details anzeigen).
  - CSS-Grid: `gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(360px, 1.5fr) minmax(300px, 1fr)'`.
- **Students / Guests**:
  - Standardlayout beibehalten (Unterrichtstermine, Timeline, Verwaltung).

### R2. Admin-Event-Planer & Koordination (Spalte 2 für Admins)
- **Einstellungen**: Formular zum Aktualisieren von Bühnenanzahl (`stage_count` begrenzt auf 1 bis max. 10), Gesamtdauer und Programmdauer des ausgewählten Events.
* **Bühnen- & Act-Manager**:
  - Listet alle eingereichten Programmpunkte nach Bühne gruppiert auf.
  - Status ändern (Genehmigen / Ablehnen).
  - Pausen einfügen (Dauer in Minuten).
  - Sortierung der Programmpunkte per Pfeiltasten (Reihenfolge-Tausch über sort_order, um Datenbank-Constraint-Verletzungen zu vermeiden).
  - Rückfragen an Lehrer stellen (GEMA-Meldungen, Technikbedarf), welche in `additional_feedback_responses` JSONB gespeichert werden.

### R3. Lehrer-Programmeinreichung & Feedback (Briefing & Spalte 3 für Lehrer)
- **Aufforderung im Briefing**:
  - Im "Infos der Verwaltung"-Widget im Teacher Dashboard (Briefing) werden Ankündigungen/Anfragen der Verwaltung angezeigt. Wenn Lehrer darauf klicken, werden sie zum Termine-Board umgeleitet und das Einreichungsformular für dieses Event geöffnet.
- **Event-Planung (Spalte 3)**:
  - Lehrer können Programmpunkte für das Event einreichen (Name, Ensemble, Anzahl Auftretende, Spieldauer, Wunschzeit, Titel, Interpret, Komponist, Arrangeur, Verlag, Technikbedarf, Stühle, Notenständer, Bemerkung).
  - Lehrer sehen den Genehmigungsstatus ihrer Acts und können GEMA/Technik-Rückfragen direkt inline beantworten.

### R4. Packliste & CSV-Export
- **Packliste**: Konsolidierte Summe aller benötigten Stühle, Notenständer und des Technikbedarfs (pro Bühne oder für das gesamte Event).
- **Excel/CSV-Export**: Flexibler Tabellenexport mit Checkboxen, um auszuwählen, welche Spalten exportiert werden sollen.

## Acceptance Criteria

### Funktionalität & UI
- [ ] Admins und Sekretäre sehen Unterrichtstermine nicht auf dem Termine-Board.
- [ ] Admins können Events konfigurieren (Bühnen 1-10, Gesamtdauer, Programmdauer).
- [ ] Lehrer sehen im Briefing-Widget Aufforderungen zur Programmeinreichung und können nach Klick Programmpunkte erstellen.
- [ ] Lehrer sehen in Spalte 3 ("Event Planung") den Status ihrer Acts und können offene GEMA-Meldungen oder Technikfragen beantworten.
- [ ] Die Packliste aggregiert Stühle, Notenständer und Technikbedarf fehlerfrei.
- [ ] CSV-Export lädt eine Excel-kompatible Datei mit den ausgewählten Spalten herunter.

### Code-Qualität & Tests
- [ ] Der React-Code baut fehlerfrei ohne TypeScript-Fehler (`npm run build` or `npx tsc --noEmit`).
- [ ] Alle End-to-End Testfälle in `apps/groovelab/src/tests/` bestehen fehlerfrei.

## Follow-up — 2026-06-17T16:16:35Z

The user has provided additional specific requirements for the administrative 'Event Planung' UI in Column 2. When an admin/secretary clicks on an event, it must be managed through 5 sequential process steps (tabs/phases):

1. **Eckdaten (Basic Info)**: Set the primary metadata and settings of the event (stage count, total duration, program duration).
2. **Rückmeldungen (Feedback Requests)**: A dedicated screen for feedback queries. The administration can request feedback for each program point detail (GEMA status, helpers, custom queries).
3. **Programmplanung (Program Timeline)**: A dedicated screen for scheduling the acts with timestamps, reordering, and shifting positions (including pause insertion).
4. **Technikplanung (Technical Planning)**: A dedicated screen for managing technical requirements, seating, chairs, and music stands.
5. **Export**: A screen for exporting individual custom plans (Program timeline, technical checklist, consolidated equipment packlist, etc.) as CSV/Excel files with checkboxes.

Please integrate these 5 process steps (tabs) into the Admin/Secretary Column 2 Event Planner view. Ensure they are fully functional, intuitive, and styled to GrooveLab's clean design standards.

## Follow-up — 2026-06-17T16:24:13Z

The user has finalized the requirements for the Teacher Event Planning view (Column 3 on the Termine Board). It must be structured into 4 sequential process steps (tabs/phases):

1. **Einreichung & Eckdaten (Submission & Info)**:
   - Submit program points for the event.
   - Include the ability to search/select registered students of the music school to associate them with the act (notifying them and displaying the event in their personal calendars).
2. **Rückmeldungen & Fragen (Feedback & Questions)**:
   - View and reply directly to GEMA queries, tech requirements, or helper requests requested by the administration.
3. **Persönliche Packliste (Personal Equipment Packlist)**:
   - Display a consolidated checklist of stands, chairs, and custom tech gear that the teacher and their associated students need to bring for their acts.
4. **Auftritts-Zusammenfassung (Performance Summary)**:
   - A final summary of their performance details (Stage number, assigned timeline times, setup/teardown instructions, local contact details).
   - Must include a clean downloadable/printable info sheet.

Please incorporate this 4-tab workflow into the Teacher Column 3 Event Planning view. Ensure all components compile, look beautiful, and connect to the database schemas.

## Follow-up — 2026-06-19T14:57:32Z

# Teamwork Project Prompt — Draft

We need to implement the "Programm" planning board within the secretary/administrator view of the event planning module. This allows manually entering program points, scheduling submissions into a timeline via drag-and-drop, inserting pauses, and validating conflicts.

Working directory: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app
Integrity mode: benchmark

## Requirements

### R1. Two-Column Layout for Program Scheduling
- Display a two-column drag-and-drop board for program scheduling within the "Programm" tab of the administrator/secretary event planning board:
  - **Left Column**: Scheduled timeline (Tagesplan) starting at the event's start time. Program points snap sequentially ("magnetic layout").
  - **Right Column**: Unscheduled submissions (approved or submitted program points) and pauses.
- Show a switch/tab selector at the top when there are multiple stages (`Anzahl Bühnen` > 1) to toggle between stages in the timeline.

### R2. Drag-and-Drop & Timeline Control
- Implement drag-and-drop to schedule items from the unscheduled submissions column into the scheduled timeline.
- Dragging/re-ordering or editing the duration of a program point or pause automatically shifts all subsequent program points sequentially.
- Allow adding pauses directly to the timeline (with custom durations).
- Program points in the scheduled timeline should show: Ensemble/Band Name, Teacher Name, and Instrument.

### R3. Conflict Checking (Teacher Double-Booking)
- Automatically validate that no teacher is scheduled at the same time on different stages (in case of multiple stages).
- If a conflict occurs, visually mark it (e.g., in red) and prevent the drop/action that causes the double-booking.

### R4. Manual Entries
- Provide a "Beitrag hinzufügen" (Add Point) button that opens a modal form.
- The administrator can fill in: Name/Title, Ensemble/Band Name, Teacher, Instrument, and Duration.
- Creating a manual entry adds it to the unscheduled list so it can be scheduled.

### R5. Database Persistence
- Persist scheduling changes (stage_number, sort_order, durations) immediately in the background using Supabase (`campus_event_program_points` table).

## Acceptance Criteria

### Timeline & Stage Management
- [ ] Users can view the left timeline column starting at the event's start time.
- [ ] Users can toggle between stages using a tab/switch at the top if `stages > 1`.
- [ ] Items snap sequentially and update scheduled start times automatically when re-ordered.

### Drag and Drop
- [ ] Dragging an item from the unscheduled list to the timeline schedules it on the active stage.
- [ ] Dragging an item back to the unscheduled list unschedules it.

### Conflict Prevention
- [ ] Drag-and-drop is blocked if it schedules a teacher parallel to their scheduling on another stage at the same time.

### Manual Submissions
- [ ] "Beitrag hinzufügen" modal allows entering details and saves the program point to the database, listing it under unscheduled.

### Persistence
- [ ] All changes are persisted to the database via API calls immediately.


## 2026-06-19T15:56:00Z
You are assigned to investigate the git and workspace state in the Groovelab app repository.

### Objectives
1. Run `git status` to see if there are any uncommitted changes, stashed changes, or if we are on a detached HEAD.
2. Run `git stash list` to list all stashes.
3. Check `apps/groovelab/src/components/CampusEventsBoard.tsx` line count and check if the Milestone 5 changes (like `getConflictsMap`, drag-and-drop code, and manual entry modal) are present in the active file or if they are stashed.
4. Report the git branch, status, stash list, and the exact state of `CampusEventsBoard.tsx`. Write your findings to `git_status_investigation.txt` in the root or in your folder, and report back.

### MANDATORY INTEGRITY WARNING
DO NOT CHEAT. Report only authentic git commands output.

Please report your findings.

## Follow-up — 2026-06-21T07:48:21Z

Wir müssen eine Echtzeit-Last- und Logiksimulation der Groovelab-App durchführen, bei der 250 Schüler, Lehrer und Administratoren über einen Zeitraum von 10 Minuten parallele App-Aktionen ausführen. Die Simulation soll echte, gleichzeitige Bearbeitungen an der Datenbank durchführen, um zu bewerten, wie der Server unter Echtzeitlast reagiert, ohne den eigentlichen Quellcode der App zu verändern. Während der Simulation sollen Logikfehler, Race Conditions, RLS-Probleme und langsame Abfragen protokolliert werden. Nach Ablauf der 10 Minuten sollen 5 spezialisierte virtuelle Agenten (Qualitätskontrolle, Cyber-Security, Datenbank, Hetzner-Server-Kontrolle, App-Entwickler) ihr Feedback und Lösungsvorschläge präsentieren.

Arbeitsverzeichnis: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app
Integritätsmodus: development

## Anforderungen

### R1. Multi-Rollen-Simulationsskripte
- Erstellung eines Simulationsskripts, das 250 parallele Benutzersitzungen (Schüler, Lehrer, Admins) simuliert.
- Die Simulation muss 10 Minuten lang laufen und realistische, kontinuierliche Echtzeit-Schreib- und Leseaktionen generieren (z. B. Registrierung, Login, Status-Updates, Abgabe von Song-Skills, Bandbildung, Event-Konfiguration, Programmpunkt-Einreichung).
- Die Simulation **muss** gegen die echte Supabase-Datenbank aus der `.env.local` ausgeführt werden, wobei temporäre/Testbenutzer angelegt werden, um produktive Daten nicht zu verändern.
- Es ist erlaubt, Test- und Lastsimulations-Bibliotheken (wie k6, autocannon, loadtest) zu installieren oder eigene Node.js/TypeScript-Skripte zu schreiben.

### R2. Simulations-Orchestrator
- Erstellung eines Orchestrator-Skripts, das die parallelen Simulationen startet und einen Timer im Hintergrund ausführt.
- Protokollierung von Status, Latenz und Fehlern (HTTP-Fehler, Supabase-/Datenbank-Fehler sowie Logikkonflikte), die bei den einzelnen Client-Rollen auftreten.

### R3. Berichte der 5 virtuellen Agenten
- Nach Ablauf der 10-minütigen Simulation müssen detaillierte Analyseberichte der folgenden Agenten erstellt werden:
  1. **Qualitätskontroll-Agent**: Analyse von Fehlerzuständen, fehlgeschlagenen Aktionen und Usability-/Logikfehlern im Ablauf.
  2. **Cyber-Security-Agent**: Prüfung auf RLS-Verletzungen (Row-Level Security), unbefugte Datenzugriffe oder Manipulationsmöglichkeiten.
  3. **Datenbank-Agent**: Auswertung von langsamen Queries, Ratenbegrenzungen (Rate Limits) und Datenkonsistenzproblemen.
  4. **Hetzner-Server-Kontroll-Agent**: Bewertung der API-Antwortzeiten und Serverreaktionen.
  5. **App-Entwickler-Agent**: Konkrete Vorschläge für Code-Optimierungen, Fehlerbehebungen und Verbesserungen der App-Logik.

## Akzeptanzkriterien

### Ausführung & Leistung
- [ ] Das Simulationsskript kompiliert erfolgreich und kann über das Terminal ausgeführt werden.
- [ ] Der Simulator führt parallele Operationen für 250 virtuelle Benutzer erfolgreich über 10 Minuten gegen die Supabase-Datenbank aus.
- [ ] Alle Protokolle und Messergebnisse werden in einer Log-Datei im Projektordner gespeichert.

### Agentenberichte
- [ ] Es werden fünf separate Markdown-Dateien oder ein konsolidierter Bericht erstellt, in dem das Feedback und die Lösungen der 5 virtuellen Agenten detailliert aufgeführt sind.

## 2026-06-21T08:08:20Z

Create a consolidated report containing the feedback and solutions from 5 virtual agents regarding the load and logic simulation.

1. Write the file to:
   `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/simulation_reports.md`

2. The report must contain 5 distinct sections for each virtual agent:

   ### 1. Quality Control Agent Report
   - **Metrics analyzed**: 8,044 total requests, 7,726 successful requests, 318 validation errors (0 RLS, 318 validation failures), 13 logic conflicts.
   - **Error Analysis**: Explain that the 318 validation failures represent simulated invalid operations designed to test constraints (e.g., teachers trying to update is_scheduled or modify others' program points, or students trying to insert program points). This proves the database trigger constraints (`validate_campus_event_program_point`) are working effectively.
   - **Logic Conflicts Analysis**: Detail the 13 logic conflicts (teacher double bookings). Explain that they occur when an admin schedules a teacher on multiple stages at overlapping times. Suggest that although the frontend displays warnings (via `getConflictsMap`), adding a backend-level validation warning or preventing overlapping schedules can improve quality.
   - **UX & Usability**: Propose visual warnings and scheduling assistance to prevent user scheduling mistakes.

   ### 2. Cyber Security Agent Report
   - **RLS Policy Review**: Inspect the RLS policies on `users`, `lessons`, `campus_events`, and `campus_event_program_points`.
   - **Data Access Auditing**: Confirm that 0 RLS violations occurred, showing that multi-tenant isolation (school_id partitioning) worked successfully and users could only access data in their own school.
   - **Vulnerabilities Identified**:
     - The `users_insert` RLS policy checks if `x-invite-school-id` header matches `school_id`. An attacker who knows the school UUID could construct custom requests with that header to insert arbitrary users.
     - Recommendation: Secure the user registration workflow by checking a cryptographic signature or validation token instead of relying purely on client-supplied headers.
     - The `pgp_sym_encrypt` function is used for encryption in trigger functions. If PostgREST search path doesn't include the extensions schema, it throws SQL exceptions, causing unencrypted email fields or server crashes if email is passed. Ensure proper search path controls.

   ### 3. Database Agent Report
   - **Query Execution & Latencies**: p50: 24ms, avg: 28.39ms, p95: 45ms, p99: 128ms. Latencies are well within limits, showing standard queries are highly optimized.
   - **Index Assessment**: Existing indexes on `users(school_id)`, `campus_events(school_id)`, and `campus_event_program_points(event_id, school_id)` are highly effective. Recommend creating a compound index on `campus_event_program_points(event_id, stage_number, sort_order)` to optimize timeline queries and offset calculations.
   - **Trigger & Schema Performance**: Explain the trigger issue where `pgp_sym_encrypt` was missing from the search path.
   - **Mitigation**: Adjust PostgreSQL search path configuration using `ALTER ROLE authenticator SET search_path TO public, extensions;` or specify fully-qualified schema names `extensions.pgp_sym_encrypt` in trigger definitions.

   ### 4. Hetzner Server Control Agent Report
   - **Throughput & Capacity**: Running 250 parallel sessions generated 13.39 req/s. Under standard workloads, CPU and memory utilization on Hetzner VPS will be below 10%.
   - **Connection Pool Exhaustion**: 250 direct parallel connections would exhaust the standard Postgres connection limit (default 100) if not pooled.
   - **Mitigation**: Strongly recommend implementing connection pooling (using PgBouncer on Supabase/Hetzner, or configuring application-level pool sizes in Server configurations).

   ### 5. App Developer Agent Report
   - **Code Optimization**: Point out that `getConflictsMap` in `CampusEventsBoard.tsx` runs entirely on the client, which requires loading all lessons and program points, leading to O(N^2) checks. Recommend offloading this by creating a database view or RPC that returns active conflicts for a school/event.
   - **Register/Invite Flow**: Replace the `x-invite-school-id` RLS checks with secure invite tokens stored in a table and validated via database triggers.
   - **TypeScript Types**: Fix type declarations in E2E tests and simulation scripts to avoid casting to `any`.

3. Ensure the report is clean, professional, and written in Markdown. Once created, run a quick verification to check the file is present and readable.

## 2026-06-21T08:20:10Z

Wir müssen alle im Simulationsbericht (simulation_reports.md) empfohlenen Verbesserungen in der Groovelab-App umsetzen.

Arbeitsverzeichnis: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app
Integritätsmodus: development

## Anforderungen

### R1. Datenbank-Optimierungen & RLS-Korrekturen
- **Index hinzufügen**: Erstelle den zusammengesetzten Index `idx_program_points_timeline` auf `campus_event_program_points(event_id, stage_number, sort_order)`.
- **pgp_sym_encrypt Suchpfad-Fix**: Stelle sicher, dass der Suchpfad für die Rolle `authenticator` korrekt konfiguriert ist (`ALTER ROLE authenticator SET search_path TO public, extensions;`) oder qualifiziere den Funktionsnamen in den entsprechenden Triggern/Migrationen als `extensions.pgp_sym_encrypt` voll.

### R2. Sicherheits-Upgrade: Einladungs-Flow absichern
- **Token-Tabelle**: Erstelle eine Tabelle `invite_tokens` zur Speicherung sicherer, einmaliger Einladungstokens.
- **Trigger-Update**: Ersetze die Prüfung des unsicheren `x-invite-school-id`-Headers im Registrierungs-Trigger durch eine sichere Signatur- oder Tokenvalidierung aus der Tabelle `invite_tokens`.

### R3. Performance-Optimierung: Server-Side Konfliktprüfung (RPC)
- **Datenbank-RPC**: Erstelle eine PostgreSQL-Funktion (RPC) `get_schedule_conflicts(p_event_id UUID)`, die Terminüberschneidungen und Doppelbuchungen von Lehrern serverseitig ermittelt.
- **Frontend-Anbindung**: Ersetze die clientseitige Berechnung von `getConflictsMap` in `CampusEventsBoard.tsx` durch den Aufruf dieses neuen RPCs, um UI-Verzögerungen zu minimieren.

### R4. UI-Verbesserungen im Dashboard
- **Warnbanner & Visualisierung**: Implementiere auffällige Warnhinweise im Dashboard bei Doppelbuchungen.
- **Konflikt-Sidebar**: Integriere eine kleine Sidebar-Leiste im `CampusEventsBoard.tsx`, die alle aktuellen Konflikte übersichtlich alistet.

## Akzeptanzkriterien

### Datenbank & Sicherheit
- [ ] Der Index `idx_program_points_timeline` existiert.
- [ ] Einladungs-Flows schlagen fehl, wenn versucht wird, sich ohne gültiges Token in der Tabelle `invite_tokens` zu registrieren.
- [ ] SQL-Fehler bei `pgp_sym_encrypt` treten nicht mehr auf.

### Performance & UI
- [ ] Die Konfliktprüfung läuft nachweisbar über den neuen Datenbank-RPC und nicht mehr rein clientseitig im Browser.
- [ ] Der E2E-Test-Runner läuft erfolgreich durch (alle 115 Tests bestehen im Mock-Modus).
- [ ] Die neuen UI-Komponenten (Konflikt-Sidebar und Warnungen) sind im React-Code integriert.

## 2026-06-21T09:15:15Z

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

## 2026-06-21T10:13:41Z

Führe eine 15-minütige Echtzeit-Lastsimulation mit ca. 6.500 aktiven Benutzern auf der Supabase-Datenbank aus, wobei echte Interaktionen (Schüler-Lehrer-Verknüpfungen, Hausaufgaben, Check-ins, Planungskonflikte) simuliert werden, und evaluiere die Ergebnisse durch ein 5-köpfiges Expertenteam.

Working directory: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app
Integrity mode: development

## Requirements

### R1. Reales Interaktions-Szenario
Das Simulations-Skript muss echte Benutzerpfade abbilden:
- **Schüler**: Laden des Dashboards, Check-in/Check-out an Übestationen (`sessions`), Eintragen von Song-Fortschritten, Lesen von Hausaufgaben und Beantworten von Feedback-Fragen.
- **Lehrer**: Laden ihrer Schüler-Listen, Eintragen von Coach-Notizen/Hausaufgaben für ihre Schüler, Erstellen von Programmpunkten und Prüfen auf Planungskonflikte (RPC `get_schedule_conflicts`).
- **Admins**: Abrufen der neuen statistischen Auswertungen (`school_user_statistics`).

### R2. Lastverteilung
- **Dauer**: 15 Minuten (900 Sekunden).
- **Verteilung**: 70% Lese-Operationen, 20% Check-ins/Check-outs, 10% Schreib-Operationen (Hausaufgaben, Programmpunkte, Feedback).
- **Datenbasis**: Nutzung der 10 neu angelegten Dummy-Schulen mit den verknüpften Lehrern und Schülern.

### R3. Expertenteam-Auswertung
Fünf spezialisierte Agenten-Rollen (Quality Control, Cyber-Security, Database, Server/Infrastructure, App Developer) müssen die Simulationsdaten analysieren und einen detaillierten Bericht `simulation_reports_15m_realistic.md` erstellen.

## Acceptance Criteria

### Simulationserfolg
- [ ] Das Simulations-Skript läuft stabil über die vollen 15 Minuten.
- [ ] Anfragen decken alle Interaktionstypen (Schüler-Lektionen, Lehrer-Notizen, Admin-Stats) ab.
- [ ] Die Ausführungs-Logs werden in `simulation_realistic_15m.log` protokolliert.

### Analyse-Qualität
- [ ] Der Report enthält präzise Latenzmetriken (p50, p95, p99).
- [ ] RLS-Richtlinien und Schul-Isolierung (Multi-Tenancy) sind dokumentiert.
- [ ] Konkrete Optimierungsvorschläge sind mit SQL/Code-Beispielen im Report enthalten.

## Verification
- Die Verifizierung erfolgt über die Log-Datei `simulation_realistic_15m.log` und den Report `simulation_reports_15m_realistic.md`.

## Follow-up — 2026-06-21T10:14:03Z

Bitte erweitere das Lastsimulations-Skript so, dass ALLE Funktionen und Tabellen unserer App vollumfänglich einbezogen werden. Das bedeutet:
1. Übungsverlauf & Fortschrittstracking (Einträge in `user_progress`).
2. Hilferufe an Übestationen (Schüler erstellen `help_requests`, Lehrer lösen diese auf/setzen Status auf 'resolved').
3. Bands & Matching-Board (Beitreten von Mitgliedern zu Bands über `band_members`, Song-Vorschläge über `band_song_proposals`, Abstimmungen über `band_proposal_votes`, Belegen von Band-Song-Slots über `band_song_slots`).
4. Raum- & Zeitplanung (Einträge in `lab_planning` für Schüler-Präferenzen).

Stelle sicher, dass diese Workflows gleichmäßig in den Lasttest (70% Read / 20% Session-Checkins / 10% Writes) integriert werden, damit das gesamte Produktverhalten realitätsgetreu simuliert wird.

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
- [ ] Clicking "Anmelden" on the landing page routes to `/login`.
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
