# Event-Planungs-Modul Backlog & Übergabe-Notiz

Diese Datei dient als Erinnerungsstütze für zukünftige KI-Modell-Sessions, wenn wieder ausreichend Guthaben vorhanden ist, um das vollständige Event-Planungs-Modul zu implementieren.

---

## 📌 Aktueller Status

### 1. Was bereits existiert:
* **Datenbank-Migration** (`supabase/migrations/173_event_coordinator_schema.sql`):
  * Die Tabelle `campus_event_program_points` ist in Supabase definiert. Sie enthält alle nötigen Felder für Programmpunkte (Name, Ensemble, Spieldauer, Wunschzeit, Titel, Interpret, Komponist, Arrangeur, Verlag, Technikbedarf, benötigte Stühle/Notenständer, Bemerkung, Bühnennummer, Sortier-Reihenfolge, Pausen-Flag, Status und zusätzliche Rückmeldungs-JSONs wie GEMA-Meldungen).
  * RLS-Richtlinien (Row-Level Security) und Validierungs-Trigger sind bereits implementiert.
* **Archivierte Konzepte & Spezifikationen**:
  * Unter `.agents/sub_orch_implementation/synthesis_m3.md` und `synthesis_m3_hardening.md` liegen detaillierte Pläne und Code-Snippets für die UI-Struktur in React.
* **3-spaltiges Layout im Termine-Board** (`apps/groovelab/src/components/CampusEventsBoard.tsx`):
  * Die Spaltenbreiten sind bereits auf ein 3-Spalten-Layout ausgelegt.
  * Spalte 1: Campus & Schultermine.
  * Spalte 2: Campus-Events-Timeline.
  * Spalte 3: Infos der Verwaltung (einfache Mitteilungen/Ankündigungen).

### 2. Was noch implementiert werden muss:
Die eigentliche Event-Planung (Koordination, Einreichung, Packliste, GEMA-Rückfragen, Excel-Export) fehlt im Frontend vollständig und muss in `CampusEventsBoard.tsx` und dem Lehrer-Dashboard integriert werden.

---

## 🛠️ Nächste Schritte zur Implementierung (für die nächste Session)

### Schritt 1: Lehrer-Dashboard (Einreichung von Acts)
* Im Lehrer-Dashboard (oder im Event-Detail-View für Lehrer auf dem Board) ein Formular einbauen, mit dem Lehrer Programmpunkte (`campus_event_program_points`) für ein bestimmtes Event einreichen können.
* Das Formular muss alle Felder aus dem DB-Schema abdecken (Titel, Interpret, Besetzung, Stühle, Notenständer, Technikbedarf etc.).

### Schritt 2: Admin/Sekretariat-Koordination in Spalte 3
* **Event-Konfiguration**: Ein Formular zur Angabe der Bühnenanzahl (1 bis max. 10), Gesamtdauer und Programmdauer des ausgewählten Events.
* **Bühnen-Planer**:
  * Anzeige aller eingereichten Programmpunkte, gruppiert nach Bühne.
  * Aktionen zum Genehmigen/Ablehnen (`status = 'approved'|'rejected'`).
  * Einfügen von Pausen (`is_pause = true`).
  * Sortierung der Programmpunkte per Pfeiltasten (Reihenfolge-Tausch über `handleSwapProgramPoints`).
* **Zusatz-Rückmeldungen**: Möglichkeit für das Sekretariat, gezielte Rückfragen (z. B. GEMA-Meldung auszufüllen, Technik-Details) an den einreichenden Lehrer zu senden (gespeichert in `additional_feedback_responses`).

### Schritt 3: Packliste
* Ein Tab oder eine Ansicht in der Koordination, welche die Summe aller benötigten Stühle, Notenständer und des Technikbedarfs konsolidiert (entweder pro Bühne oder für das gesamte Event) darstellt.

### Schritt 4: Excel/CSV-Export
* Ein Export-Dialog mit Checkboxen zur Auswahl der gewünschten Spalten (Uhrzeit, Bühne, Lehrer, Ensemble, Titel, Interpret etc.), der eine formatierte CSV/Excel-Datei herunterlädt.

---

## 💡 Wichtige Entwicklungshinweise
* **Vorsichtig vorgehen**: Keine großen Code-Ersetzungen auf einmal machen. JSX-Dateien in kleinen, präzisen Schritten bearbeiten und zwischendurch immer `npm run dev` / TypeScript-Prüfungen laufen lassen.
* **Backup/Stash**: Vor größeren Umbauten einen Git-Stash oder Commit anlegen.
