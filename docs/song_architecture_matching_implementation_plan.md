# Implementierungsplan: 0,1% Goldstandard 2027 Song-Architektur & Dual-Matching Suite

## 1. Ausgangslage & Bestandsanalyse (Phase 1 Audit)
In `apps/groovelab/src/components/student/meisterwerk/MeisterwerkDocumentTab.tsx`:
- **Vorhandene Logik**:
  - `songSections`-State (`Intro`, `Strophe`, `Refrain`, `Bridge`, `Outro`) und Persistenz via `localStorage.getItem('song_sections_${student.id}_${selectedActiveSongId}')` ist bereits typisiert und vorbereitet (Zeilen 574–620).
  - Die modularen Subkomponenten `SongStructureBar.tsx` und `SongSectionCard.tsx` existieren bereits in `apps/groovelab/src/components/student/meisterwerk/components/`.
  - Matching-State (`isMatchModeEnabled`, `studentRating`, `matchHistory`, `showdownState`, `lastMatchedTeacherPercent`) ist implementiert, war jedoch noch nicht optimal visuell mit der Song-Architektur verzahnt.
- **Defizite im aktuellen Layout (Screenshot `media_1790412948350.png`)**:
  - **Linke Spalte (Zeilen 2970–3660)**: Endet nach dem Match-Modus. Die Song-Architektur (`SongStructureBar` & `SongSectionCard`) ist importiert, wird aber im DOM gar nicht gerendert. Dadurch entsteht unter dem Regler eine riesige weiße Leerstelle.
  - **Rechte Spalte (Zeilen 7680–7850)**: Unter dem Hausaufgaben-Textfeld liegen 12 unstrukturierte didaktische Tags (`# Technik`, `🐌 Schnecke`, etc.), die visuelle Unruhe stiften und zu viel vertikalen Platz rauben.
  - **Pädagogische Koppelung**: Fortschrittsbalken und Song-Abschnitte sind noch voneinander entkoppelt.

---

## 2. Zielarchitektur & Design-Goldstandard 2027 (Phase 2 Planung)

### A. Linke Spalte: Das interaktive Song-Cockpit
1. **Hero-Header (Apple Music 2027 Stil)**:
   - Vinyl-Cover mit Farb-Gradienten.
   - Song-Titel, Interpret und monochrome Status-Pills (`In Arbeit`, `Hausaufgabe`, `Gemeistert`).
2. **Universeller Song-Architektur-Baukasten (Instrument-Agnostic)**:
   - Einbindung der `SongStructureBar`: Klickbare Formteile (`Intro`, `Strophe`, `Refrain`, `Bridge`, `Solo`, `Outro`).
   - Jeder Formteil zeigt Taktanzahl und Status (Grau = Offen, Gelb = In Arbeit, Grün = Sitzt).
   - Fokussierte Kachel (`SongSectionCard`) für den ausgewählten Abschnitt mit:
     - **Harmonischer Leitfaden**: Akkord-Blöcke (z. B. `Em | C | G | D`) für Klavier/Gitarre/Bass.
     - **Rhythmische DNA / Pocket**: Taktart (z. B. 4/4), Feel (z. B. 8tel Rock) und dynamischer Schwerpunkt.
     - **Hausaufgaben-Pin 📌**: Markiert den konkreten Abschnitt, der bis zur nächsten Stunde geübt werden soll.
3. **0,1% Dual-Voting Matching Suite**:
   - Schüler stimmt in seinem Dashboard blind ab (Zero-Bias Selbstreflexion).
   - Lehrer sieht den Eingang im Cockpit („Tipp liegt bereit“).
   - Reveal-Button mit Showdown-Rennen, XP-Bonus (+50 XP bei Treffer) und didaktischer Feedback-Botschaft.

### B. Rechte Spalte: Fokussiertes Übe- & Notiz-Deck
1. **Redaktions-Kopf**:
   - Status-Indikator („Auto-Save aktiv“), Sprechdiktat-Button („Diktieren“).
2. **Cleanes Aufgabenfeld**:
   - Swiss-Design Notizbereich mit klarer Typografie (Plus Jakarta Sans).
   - Reduktion des Tag-Friedhofs: Ersetzung der 12 losen Tags durch 4 intelligente didaktische Fokus-Pills direkt über dem Textfeld (`🎯 Fokus-Stelle`, `⚡ Tempo aufbauen`, `🎵 Rhythmus festigen`, `🧠 Auswendig`).
3. **Audio-Memo & Übe-Recorder**:
   - Nahtlos am unteren Rand integriert für schnelles Lehrer-/Schüler-Vorspielen.

---

## 3. Schrittweiser Implementierungsplan (Phase 3)

1. **Vorbereitung & Typen**:
   - Prüfung und Justierung der Schnittstelle `SongSection` und des Instrumenten-Parsers (Drums, Gitarre, Klavier, Gesang, Bass).
2. **Linke Spalte in `MeisterwerkDocumentTab.tsx` veredeln**:
   - Nahtlose Integration von `SongStructureBar` und der kompakten `SongSectionCard` unterhalb des Hero-Headers.
   - Kopplung des aktiven Formteils mit der Hausaufgabe (`isHomeworkFocus`).
   - Bereinigung des Leerraums, Ausrichtung an 60-30-10 Farbregel.
3. **Rechte Spalte in `MeisterwerkDocumentTab.tsx` verschlanken**:
   - 12-Tag-Dump durch 4 elegante Didaktik-Chips ersetzen.
   - Textarea-Höhe und Spacing responsive optimieren.
4. **Matching-Workflow verfeinern**:
   - Sicherstellen, dass Blind-Wertung, Commit-Button und Reveal-Showdown harmonisch zusammenwirken.

---

## 4. Unantastbare Invarianten & Schutzmaßnahmen
- **Zero-Bypass**: Keine Änderung an den Backend-Persistenz-Routen oder Auth-RPCs.
- **Barrierefreiheit (WCAG 2.2 AA / BFSG 2025)**: Alle Kacheln und Tags erhalten `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space) und sichtbaren Fokus-Ring.
- **Desktop Layout Immunity**: Keine Breiten- oder Grid-Verschiebungen auf Desktop (`>= 769px`).
- **Verifikations-Doktrin**: Keine automatischen Terminal-Läufe ohne explizites Codewort "commit".
