# 🏛️ 0,1% Goldstandard Implementierungsplan: 1:1 Aufgaben-Parität (QR Landingpage ⇄ Schüler Dashboard)

## 1. Executive Summary & Forensische Befundanalyse
Die Gegenüberstellung der Schülersicht im **Schüler-Dashboard (Desktop, Aufgaben-Tab)** und der **QR-Landingpage (Mobile PWA, Aufgaben-Tab)** zeigt eine eklatante Diskrepanz:

| Didaktischer Baustein | Schüler Dashboard (Desktop) | QR Landingpage (Mobile) | Status & Ursache |
| :--- | :--- | :--- | :--- |
| **1. Lehrwerk** | `Guitar Fitness` · `S. 2 - Üb. 4-6` · Wackelig · TTS | `Gui...` · `S. 2 - Üb. 4-6` · Wackelig · TTS | ⚠️ **Layout-Kollision**: Aggressive Truncation auf Mobile Viewports drückt den Titel auf 3 Zeichen zusammen. |
| **2. Songs** | `🎵 Numb · Linkin Park` · Status · TTS | *(Fehlt komplett)* | ❌ **Fehlende Daten-Hydration**: `assignedCampusSongs` wird von `QRLandingPage.tsx` nicht ermittelt/übergeben; Vorwochen-Carryover (`SNAPSHOT_SONGS`) fehlt in `QrAuthoritativeHomeworkSection.tsx`. |
| **3. Audio-Aufnahmen** | `🎧 Unterrichtsaufnahmen (1)` · `Übung - 21. Sep.` (Player) | *(Fehlt komplett)* | ❌ **Fehlender Vorwochen-Fallback**: Audioaufnahmen aus Vorwochen-Snapshots (`AUDIO:`) werden in `QrAuthoritativeHomeworkSection.tsx` nicht übernommen. |
| **4. Zusätzliche Bemerkungen**| `📄 Zusätzliche Bemerkung` · TTS | *(Fehlt komplett)* | ❌ **Fehlender Snapshot-Bridge**: Didaktische Lehrkraft-Notizen aus der Vorwoche werden nicht gebridged, wenn die aktuelle Woche noch keinen eigenen Voll-Snapshot hat. |

---

## 2. Die 4 Root Causes im Detail (0,1% Enterprise Forensik)

### Root Cause 1: Asymmetrische Vorwochen-Bridge (Pädagogische Kontinuität)
- **Im Schüler Dashboard (`MeisterwerkDocumentTab.tsx`, Z. 8540–8715):**
  Existiert die autoritative Resilienz-Regel `SMART VORWOCHEN-FALLBACK & AUDIO/NOTE BRIDGE`:
  Wenn für die aktuelle Unterrichtswoche (KW 41) noch kein abgeschlossener Schnappschuss vorliegt oder Teilbereiche (Songs, Audio, Notizen) leer sind, traversiert das Dashboard automatisch den jüngsten Vorwochen-Snapshot (`Hausaufgabe KW 40` / `KW 39`) aus `progressItems` und übernimmt nahtlos:
  - Songs (`SNAPSHOT_SONGS`) ➔ `Numb · Linkin Park`
  - Audio-Memos (`AUDIO:...`) ➔ `Übung - 21. Sep.`
  - Didaktische Notizen ➔ `Zusätzliche Bemerkung`
- **In der QR Landingpage (`QrAuthoritativeHomeworkSection.tsx`, Z. 437–550):**
  Hier wurde strikt nur nach `Hausaufgabe KW {currentKw}` (also KW 41) gesucht. Da KW 41 noch keinen statischen Voll-Snapshot in `progress_matrix` besaß, blieben `audioTracks`, `didacticNotes` und `songs` auf `[]` (leer).

### Root Cause 2: Fehlende Prop-Pipeline in `QRLandingPage.tsx`
- In `QRLandingPage.tsx` (Z. 5435) wurde `<QrAuthoritativeHomeworkSection />` ohne das Attribut `assignedCampusSongs` gerendert.
- `QRLandingPage.tsx` hat im Gegensatz zu `useStudentSongsData.ts` und `MeisterwerkDocumentationModal.tsx` die Songs aus `progress_matrix` und `user_song_skills` nicht zu einer kanonischen Liste synthetisiert.
- Auf einem Smartphone eines Schülers existiert kein lokaler Cache `local_assigned_campus_songs_${studentId}`, wodurch `collectHomeworkSongsFromSources` 0 Songs lieferte.

### Root Cause 3: Mobile Layout-Kollision bei Lehrwerk-Titeln (Zero-Overlap Verletzung)
- In `QrAuthoritativeHomeworkSection.tsx` (Z. 1204–1228) teilen sich Buch-Icon, Titel, Seiten-Pille, MicroScore-Button und zwei Status-Buttons eine einzige starre Flex-Zeile ohne flexibles Umbrechen.
- Bei Viewports $\le 390$px (Standard iPhone) verbleiben für den Buchtitel nur ca. 35 Pixel, weswegen "Guitar Fitness" zu "Gui..." abgeschnitten wird.

---

## 3. Die 0,1% Goldstandard Lösungsarchitektur

### Säule 1: Symmetrischer 4-Säulen Vorwochen-Fallback in `QrAuthoritativeHomeworkSection.tsx`
Integration des kanonischen Carryover-Mechanismus (analog zu `MeisterwerkDocumentTab.tsx` Z. 8540–8715):
1. **Lehrwerke**: Bei leeren Büchern der aktuellen Woche ➔ Unpacking von `SNAPSHOT_LEHRWERKE:` der jüngsten Vorwoche.
2. **Songs**: Bei leeren Songs der aktuellen Woche ➔ Unpacking von `SNAPSHOT_SONGS:` der jüngsten Vorwoche (`Numb · Linkin Park`).
3. **Audio-Aufnahmen**: Bei leeren Aufnahmen der aktuellen Woche ➔ Unpacking aller `AUDIO:...` Zeilen der jüngsten Vorwoche (`Übung - 21. Sep.`).
4. **Didaktische Notizen**: Bei leeren Notizen der aktuellen Woche ➔ Unpacking aller Textnotizen der jüngsten Vorwoche (`Zusätzliche Bemerkung`).

### Säule 2: Kanonische Song-Synthese & Prop-Passing in `QRLandingPage.tsx`
1. Synthetisiere in `QRLandingPage.tsx` (analog zu `useStudentSongsData.ts`) `assignedCampusSongs` aus `activeSongSkills`, `progressItems` und `SNAPSHOT_SONGS`.
2. Übergebe `assignedCampusSongs={assignedCampusSongs}` an `<QrAuthoritativeHomeworkSection />`.

### Säule 3: Responsive Typografie & Flex-Harmonie für Lehrwerke
1. Flex-Layout auf Mobile Viewports optimieren:
   - Der Titel `b.title` erhält Vorrang und bricht bei extrem schmalen Bildschirmen harmonisch 2-zeilig um oder platziert die Pille (`S. 2 · Üb. 4-6`) sauber ohne Textkollision.
   - Kein Abschneiden zu unleserlichen 3-Buchstaben-Fragmenten ("Gui...").

### Säule 4: Parität des AudioTrackCarousels
1. Übergebe an `<AudioTrackCarousel />` in `QrAuthoritativeHomeworkSection.tsx` die Parameter:
   - `hideCarriedOverBadge={true}`
   - `uiLevel={profile?.campus_ui_level || 'pro'}`
   - `readOnly={true}`
   Dadurch rendert der Player auf Mobile exakt denselben High-End Waveform-Player mit Titel, Zeit und Bedienelementen wie im Desktop Dashboard.

---

## 4. Bounded Context & Monolith-Ceiling Compliance
- `QRLandingPage.tsx` (Baseline: 12.769 Zeilen) bleibt eine schlanke Verdrahtungshülle (Wiring-Änderung $\le 8$ Zeilen, weit unter dem 15-Zeilen-Buffer).
- Keine Verletzung der Zero-Inline-Feature Doktrin.
- Vollständige Einhaltung aller OWASP ASVS Level 3 Axiome (Zero-Trust RPCs, keine Client-Bypässe).

---

## 5. Verifikations-Matrix (Definition of Done)
1. **Lehrwerk-Test**: "Guitar Fitness" wird auf allen mobilen Viewports (320px, 375px, 390px, 428px) ungekürzt und typografisch harmonisch angezeigt.
2. **Song-Test**: "Numb · Linkin Park" wird auf der QR-Landingpage mit Icon, Titel, Artist, MicroScore, Status und Vorlese-Button identisch zum Desktop-Dashboard angezeigt.
3. **Audio-Test**: "Unterrichtsaufnahmen (1)" mit "Übung - 21. Sep." rendert den interaktiven AudioTrackCarousel Player.
4. **Notizen-Test**: "Zusätzliche Bemerkung" wird inklusive Vorlese-Button gerendert.
5. **Zero-Regression-Test**: Desktop-Layouts und bestehende Funktionalitäten bleiben zu 100% unberührt.
