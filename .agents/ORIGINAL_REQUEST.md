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

