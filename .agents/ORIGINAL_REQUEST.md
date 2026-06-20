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
