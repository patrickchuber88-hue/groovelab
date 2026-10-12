# 🎨 Implementierungsplan: Vollständige Harmonisierung der Hausaufgaben-Visualisierung

**Ziel:** Identische Visualisierung der Hausaufgaben- und Fokus-Elemente (gleiche Farben, gleiche Badges, konsistente Apple-Squircles) über alle Bildschirme hinweg:
1. **Aufgaben (Wochen-Fahrplan)** (`MeisterwerkDocumentTab.tsx` / Image 3) – *Goldstandard-Referenz*
2. **Übe-Pfad (Wochen-Fokus)** (`PracticeHomeworkCard.tsx` / Image 2)
3. **Studio-Fokus (Fokus-Timer HUD)** (`AuthoritativeHomeworkWidget.tsx` [variant="hud"] / Image 4)
4. **Begleitende Stages & Widgets** (`PracticeExerciseStageView.tsx`, `StudentJuniorPreFlightModal.tsx`, `AuthoritativeHomeworkWidget.tsx` [stage_banner & hero])

---

## 🔍 1. Status Quo & Identifizierte Farbdifferenzen

| Element | Aufgaben (Image 3) | Übe-Pfad (Image 2) | Studio-Fokus HUD (Image 4) | Ziel-Standard (Goldstandard) |
| :--- | :--- | :--- | :--- | :--- |
| **Lehrwerk Icon** | Rosa Squircle (`#ffe4e6` ➔ `#fecdd3`, Text `#e11d48`) | Rosa Squircle (`#ffe4e6` ➔ `#fecdd3`, Text `#e11d48`) | Nacktes Icon (`#f43f5e`), **kein Squircle** | **Rosa Squircle** (`linear-gradient(135deg, #ffe4e6, #fecdd3)`, Icon `BookOpen` `#e11d48`, Border `rgba(255,255,255,0.85)`) |
| **Seitenzahl-Badge** | Sanftes Grün (`bg: #dcfce7`, `text: #15803d`, `border: 1px solid #bbf7d0`, Pill `99px`) | Sanftes Grün (`bg: #dcfce7`, `text: #15803d`), **kein Rand**, Radius `6px` | Dunkleres Grün (`bg: #ecfdf5`, `text: #059669`, `border: 1px solid #10b981`) | **Sanftes Grün-Pill** (`bg: #dcfce7`, `text: #15803d`, `border: 1px solid #bbf7d0`, `borderRadius: 99px`) |
| **Song Icon** | Magenta/Rose Squircle via `getSongColor("Linkin Park - Numb")` (`#fce7f3` ➔ `#fbcfe8`, Text `#be185d`) | **Hartcodiertes Blau** (`#e0f2fe` ➔ `#bae6fd`, Text `#0284c7`) ❌ | **Hartcodiertes Gelb** (`#eab308`), **kein Squircle** ❌ | **Deterministisches Song-Squircle** via `getSongColor(songTitle)` (`linear-gradient(135deg, from, to)`, Icon `Music` `songColor.text`) |
| **Song Subtitle/Badge** | Clean Typo (`· Linkin Park` in `#64748b`) | **Blauer Pill "Song-Projekt"** (`#e0f2fe` / `#0369a1`) ❌ | Kein Subtitle | **Clean Typo** (`· {artist}` in `#64748b` oder weglassen; **kein blauer Fremdkörper**) |
| **Status-Button** | `StudentHomeworkStatusButton` (`Status`) | `StudentHomeworkStatusButton` (`Status`) | `StudentHomeworkStatusButton` (`Status`) | Bereits harmonisiert (100% Parität) |

---

## 🛠️ 2. Schrittweiser Implementierungsplan (Status: Vollständig umgesetzt ✅)

### Schritt 1: `PracticeHomeworkCard.tsx` (Übe-Pfad / Image 2) ✅
* **Song-Farb-Parität:** Ersetzen des hartcodierten hellblauen Farbverlaufs durch `getSongColor(task.title)` aus `studentDateUtils.ts`.
* **Entfernung des blauen "Song-Projekt"-Pills:**
  * Das Lehrwerk zeigt den grünen Seitenzahl-Badge (`S. {pages}`).
  * Der Song zeigt die saubere Künstler-Zeile (`· {artist}`) in dezentem `#64748b`; isolierter blauer "Song-Projekt"-Badge restlos entfernt.
* **Lehrwerk-Seitenzahl-Badge:** Angleichung auf den exakten Goldstandard:
  * `background: '#dcfce7'`
  * `color: '#15803d'`
  * `border: '1px solid #bbf7d0'`
  * `borderRadius: '99px'` (vollwertige Apple Pill)

### Schritt 2: `AuthoritativeHomeworkWidget.tsx` (Studio-Fokus HUD / Image 4) ✅
* **HUD-Lehrwerk:**
  * Hinzufügen des 24x24px Squircles mit `CANONICAL_LEHRWERK_COLOR` (`#ffe4e6` ➔ `#fecdd3`, Icon `BookOpen` `#e11d48`, transluzenter Rand, Schlagschatten).
  * Angleichung des Seitenzahl-Badges auf `#dcfce7` / `#15803d` / `border: 1px solid #bbf7d0` / `borderRadius: 99px`.
* **HUD-Song:**
  * Ersetzen des nackten gelben Music-Icons (`#eab308`) durch das deterministische Song-Squircle mit `getSongColor(s.cleanTitle)`.
  * Icon `Music` mit `songColor.text`.
* **Stage-Banner & Hero Varianten:**
  * Bereinigung verbliebener gelber Fallbacks (`#ca8a04`) in `variant="stage_banner"` zugunsten `sColor.text`.
  * `variant="hero"`: Squircles, Schatten und Seitenzahl-Pillen synchronisiert.

### Schritt 3: `PracticeExerciseStageView.tsx` & `StudentJuniorPreFlightModal.tsx` ✅
* **PracticeExerciseStageView:**
  * In `secondaryBooks`: Buch-Squircle und grüner Pill mit `#dcfce7` / `#15803d` / `#bbf7d0`.
  * In `secondarySongs`: Song-Squircle mit `getSongColor(s.cleanTitle)` statt nacktem gelbem Icon (`#ca8a04`).
* **StudentJuniorPreFlightModal:**
  * Vereinheitlichung der Buch-Farben (`CANONICAL_LEHRWERK_COLOR`) und des Seitenzahl-Badges.

### Schritt 4: Exocortex & Product Bible Synchronisation ✅
* `docs/SYSTEM_FEATURE_MATRIX.md`: Eintrag **CAM-153** verankert (Autoritative Hausaufgaben-Visualisierung & 100% Farb- und Badge-Parität).

---

## 🔒 3. Enterprise Invarianten & Schutzregeln
* **Zero Color-Clash Doktrin (Axiom 9):** Reine Unifarben & monochrome Konturen, keine unharmonischen Füllungs-Kontur-Kollisionen.
* **Monolith Ceiling:** Chirurgische Änderungen an den betroffenen Komponenten unter Einhaltung des Netto-Null- bzw. <15-Zeilen-Budgets.
* **Strikter Genehmigungsvorbehalt:** Keine Code-Änderungen vor ausdrücklicher Benutzer-Freigabe.
