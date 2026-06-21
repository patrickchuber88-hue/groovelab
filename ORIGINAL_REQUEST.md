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
