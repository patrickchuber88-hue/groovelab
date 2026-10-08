# 🏛️ Implementierungsplan: 1:1 Hausaufgaben-Parität & Repertoire-Integrität (0,1% Goldstandard)

## 1. Problemstellung & Zielbild
Aktuell besteht eine Diskrepanz zwischen:
1. **Briefing Board (Box 1):** Zeigt *Guitar Fitness* (S. 1–3), *Linkin Park - Numb*, Schülerfrage und 1 Aufnahme.
2. **Wochen-Fahrplan (Aufgabenheft):** Zeigt für die aktuelle Woche (KW 41) fälschlicherweise den Dummy-Song `Test` (Künstler: `Test`) und **keine** Lehrwerke/Songs, weil der Dummy-Song den Vorwochen-Fallback blockiert.
3. **Repertoire & Noten (Statistik & Projekte):** Zeigt *0 Songs* anstelle des aktiven Hausaufgaben-Songs *Linkin Park - Numb*.

**Zielbild (Goldstandard):**
- **100% 1:1 Parität:** Box 1 und Wochen-Fahrplan zeigen exakt die identischen Lehrwerke, Songs, Notizen und Audioaufnahmen an.
- **Repertoire-Verbindung:** Alle aktiven Hausaufgaben-Songs und Lehrwerke befinden sich sichtbar und synchron im Modul *Repertoire & Noten*.
- **Neutralisierung von `Test`:** Bereinigung des Test-Artefakts aus allen Schichten (Filterung & Purge).

---

## 2. Geplante Änderungen

### Schritt 1: Globale Neutralisierung & Bereinigung von Dummy-/Test-Songs
- **Dateien:**
  - `apps/groovelab/src/components/student/hooks/useStudentSongsData.ts`
  - `apps/groovelab/src/components/student/tabs/briefing/homeworkSummaryHelper.ts`
  - `apps/groovelab/src/components/student/meisterwerk/MeisterwerkDocumentTab.tsx`
- **Aktion:**
  - Definition einer standardisierten Prüffunktion `isDummyOrTestSong(songOrTitle)`:
    Filtert alle Einträge heraus, bei denen Titel oder Künstler `test`, `test - test` oder `unbenannter song` lauten.
  - Implementierung eines automatischen Scrubber-Hooks (analog zum bestehenden DSGVO Art. 17 Scrubber), der beim Laden verwaiste `Test`-Einträge aus `localStorage` (`song_hw_*`, `song_note_*`, `campus_user_song_skills`) rückstandslos entfernt.

### Schritt 2: Symmetrischer Wochen-Fahrplan Fallback in `MeisterwerkDocumentTab.tsx`
- **Datei:** `apps/groovelab/src/components/student/meisterwerk/MeisterwerkDocumentTab.tsx` (Zeilen ~9121–9530)
- **Aktion:**
  - Nach Bereinigung des Dummy-Songs `Test` greift für die aktuelle Woche (KW 41) der Vorwochen-Fallback (`pastWeekSnapshots`), falls noch kein neuer Wochenplan für KW 41 persistiert wurde.
  - Sicherstellen, dass Lehrwerke (`Guitar Fitness`, S. 1–3) und Songs (`Linkin Park - Numb`) sowie Audioaufnahmen 1:1 aus dem Vorwochen-Snapshot entpackt und im Wochen-Fahrplan gerendert werden.

### Schritt 3: Automatische Hydration in `activeSongSkills` (Repertoire-Kachel & Song-Projekte)
- **Datei:** `apps/groovelab/src/components/student/hooks/useStudentSongsData.ts`
- **Aktion:**
  - Wenn ein Campus-Song als Hausaufgabe aktiv ist (z. B. aus Snapshot oder `progress_matrix`), wird er automatisch in `activeSongSkills` synchronisiert (sofern noch nicht vorhanden).
  - Dadurch zählt die Header-Kachel *„SONGS“* im Dashboard den Song korrekt (1 Song statt 0 Songs) und der Song erscheint unter *„Aktive Song-Projekte“* im Repertoire-Modul mit dem Badge *„Hausaufgabe“*.

### Schritt 4: Verifikation & Überprüfung
- Prüfung aller Datenpfade (Box 1 vs. Wochen-Fahrplan vs. Repertoire).
- Manuelle Prüfung der Konsistenz ohne ungefragte Terminal-Gates (gemäß AGENTS.md).

---

## 🛑 Stopp-Punkt (Genehmigungsvorbehalt)
Dieser Plan erfordert deine ausdrückliche Freigabe im Chat, bevor Änderungen am Code vorgenommen werden.
