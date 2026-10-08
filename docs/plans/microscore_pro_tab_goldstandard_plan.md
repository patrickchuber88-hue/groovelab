# 🎸 2027 0,1% Goldstandard: Micro-Score Pro-Studio (Noten, Tabs & Triolen)

## 📌 Executive Summary & Vision
Die Übungs-Schnipsel werden auf den **absoluten 0,1% Goldstandard für das Jahr 2027** gehoben:
- **Echte SMuFL Urtext-Partitur**: 5 Notenlinien, Violinschlüssel, Bassschlüssel, Notenköpfe, Hälse, Achtelflaggen, Vorzeichen und Hilfslinien nach dem optischen Referenzstandard aus `WorldTourStaffNotation.tsx` (Henle/Bärenreiter-Ästhetik).
- **Pro-Tab Dualismus (Exklusiv für Gitarre)**:
  - 3-Wege-Segment-Pill: `Noten` | `Tabs` | `Noten + Tabs`
  - Default beim Öffnen für Gitarre: **`Noten + Tabs`** (vollwertige Dualansicht mit exakt vertikal synchronisiertem 5-Linien-System und 6-Saiten-Tabulatur).
  - Für alle anderen Instrumente (Querflöte, Blockflöte, Klarinette, Saxophon, Trompete, Posaune, Klavier, Streicher) wird der Schalter ausgeblendet und fix die echte 5-Linien-Notation gerendert.
- **Triolen-Engine (48-Tick-Raster pro Takt)**:
  - Mathematisch jitter-freie Integer-Subdivision (48 Ticks pro 4/4 Takt: Viertel = 12, Achtel = 6, 16tel = 3, **Achtel-Triole = 4 Ticks**, **16tel-Triole = 2 Ticks**).
  - Visuelle Triolen-Klammer mit zentrierter Ziffer `3` über/unter den verbundenen Noten und Bünden.
  - Tastaturkürzel `3` schaltet nahtlos in den Triolen-Modus.
- **Bidirektionaler Tastatur-First Workflow**:
  - Im Tab-Bereich: Pfeiltasten ↑ / ↓ wechseln zwischen den 6 Saiten ($e$, $B$, $G$, $D$, $A$, $E$). Zifferntasten $0$–$24$ setzen die Bundnummer. Die Note im Liniensystem oben berechnet sich in Echtzeit synchron.
  - Im Noten-Bereich: Tasten `C`..`H` oder Pfeiltasten ↑ / ↓ (Halbtöne) transponieren die Note und wählen automatisch den ergonomischsten Bund auf dem Griffbrett.
  - Notenwerte: Ziffern `1`, `2`, `4`, `8`, `6` (16tel), Triolen-Toggle `3`, sowie Toolbar-Buttons mit echten SMuFL-Symbolen (`𝅝`, `𝅗𝅥`, `𝅘𝅥`, `𝅘𝅥𝅯`, `𝅘𝅥𝅰`, `3`).
  - Punktierung (`.`), echte SMuFL-Pausen (`R` / `Backspace`) und Haltebögen (Ties).
  - Akkordsymbole über den Takten (z. B. `G`, `D`, `D7`, `Am`).
- **Synchroner Playhead & Live-Hit-Coloring**:
  - Flüssig gleitender vertikaler Playhead während der Wiedergabe (mit 1-Takt Count-In).
  - Live-Hit-Coloring bei der YIN Pitch-Challenge: Getroffene Notenköpfe und Tab-Bünde leuchten in Echtzeit grün/orange auf.
- **Karplus-Strong Plucked-String Synthese**:
  - Null Latenz, 100% offlinefähig, authentischer Akustik-/E-Gitarrenklang.

---

## 🏛️ Architektur & Bounded Context

### 1. Datenmodell (`microScore.types.ts`)
Erweiterung des Datenmodells um Akkorde, Triolen und Darstellungsmodi:
```typescript
export type MicroScoreDisplayMode = 'notes' | 'tabs' | 'both';

export interface MicroScoreChord {
  barIndex: number;
  tickPosition: number; // 0..47 (bei 4/4, basierend auf 48 Ticks pro Takt)
  chordName: string;    // z. B. 'G', 'D7', 'Am'
}

export interface MicroScoreNote {
  id: string;
  barIndex: number;          // 0 bis 3 (Max. 4 Takte, UrhG §§ 2, 51)
  tickPosition: number;      // 0 bis 47 (ermöglicht exakte Triolen und 16tel)
  durationTicks: number;     // Ganze=48, Halbe=24, Viertel=12, 8tel=6, 16tel=3, 8tel-Triole=4, 16tel-Triole=2
  duration: MicroScoreDuration; // '1' | '2' | '4' | '8' | '16'
  pitch: string;             // z. B. 'C4', 'D#4', 'REST'
  fret?: number;             // Bundnummer 0–24
  stringIndex?: number;      // Saite 0 (hohes e) bis 5 (tiefes E)
  isDotted?: boolean;
  isTriplet?: boolean;       // Triolen-Kennzeichnung für grafische Klammer '3'
  tieToNext?: boolean;
}

export interface MicroScoreSnippet {
  id: string;
  title: string;
  instrument: MicroScoreInstrument;
  timeSignature: MicroScoreTimeSignature;
  tempoBpm: number;
  barsCount: number;         // 1 bis 4 Takte
  notes: MicroScoreNote[];
  displayMode?: MicroScoreDisplayMode;
  chords?: MicroScoreChord[];
  createdAt: string;
  updatedAt: string;
}
```

### 2. High-Precision Notensatz- & Tab-Engine (`MicroScoreStaffNotation.tsx`)
Ersatz des groben Rasters durch eine dedizierte SVG-Komponente nach dem Vorbild von `WorldTourStaffNotation.tsx`:
- **5 Notenlinien**: Standardabstand $10\,\text{px}$, Linienstärke $1.2\,\text{px}$.
- **6 Tabulatur-Linien (bei Gitarre)**: Standardabstand $9\,\text{px}$, mit „T A B“-Schriftzug am Systembeginn.
- **SMuFL Bravura Pfade**: Violinschlüssel (`gClef`), Bassschlüssel (`fClef`), Vorzeichen (`#`, `b`, `♮`), Pausen (`restQuarter`, etc.).
- **Triolen-Klammern**: Horizontale Vektor-Klammer mit eingepasster Kursiv-Ziffer `3` über bzw. unter Triolen-Gruppen.
- **Bund-Badges auf Saiten**: Weiße Aussparungs-Maske hinter den Ziffern, damit die Saite die Zahl nicht durchschneidet.
- **Caret (Eingabe-Cursor)**:
  - Zeigt im Tab-Modus die aktive Saite und den aktiven Tick als präzisen Fokusrahmen.
  - Zeigt im Noten-Modus den aktiven Schlag auf dem 5-Linien-System.
- **Playback Playhead**:
  - Sub-Pixel interpolierter vertikaler Leuchtstrich in Smaragdgrün (`#10b981`).
- **Hit-Feedback**:
  - Notenköpfe und Bundziffern färben sich bei Mikrofon-Treffern (`hit` = Smaragd `#10b981`, `near` = Bernstein `#f59e0b`).

### 3. Fretboard- & Saiten-Allokator (`guitarFretboardEngine.ts`)
Mathematische Zuordnung zwischen Gitarrensaiten (Standard-Tuning: $E_2, A_2, D_3, G_3, B_3, E_4$) und Tonhöhen:
- Bund auf Saite $\to$ Pitch:
  - Saite 0 ($E_4$): Bund 0 = E4, Bund 1 = F4, Bund 3 = G4 ...
  - Saite 1 ($B_3$): Bund 0 = B3, Bund 1 = C4, Bund 3 = D4 ...
  - Saite 2 ($G_3$): Bund 0 = G3, Bund 2 = A3 ...
  - Saite 3 ($D_3$): Bund 0 = D3, Bund 2 = E3 ...
  - Saite 4 ($A_2$): Bund 0 = A2, Bund 2 = B2 ...
  - Saite 5 ($E_2$): Bund 0 = E2, Bund 1 = F2, Bund 3 = G2 ...
- Pitch $\to$ Optimaler Bund/Saite:
  - Wählt bei Eingabe von Notennamen die ergonomischste Lage (Präferenz Bünde 0–5) bzw. behält die aktuelle Saite bei, falls die Note darauf spielbar ist.

### 4. Zero-Latency Audio-Synthese (`microScoreAudioSynthesizer.ts`)
- Karplus-Strong Algorithmus für gezupfte Gitarrensaiten:
  - Rausch-Burst + Feedback-Verzögerungsschleife mit Tiefpass-Filter erzeugt verblüffend realistische Saiten-Resonanz.
- Bestehende 6 Bläser-Klangfarben, Klavier und Streicher bleiben nahtlos erhalten.

### 5. UI & Header-Integration (`MicroScoreStudioModal.tsx`)
- 3-Wege-Segment-Pill:
  ```tsx
  {snippet.instrument === 'guitar' && (
    <div className="segment-control">
      <button active={displayMode === 'notes'}>Noten</button>
      <button active={displayMode === 'tabs'}>Tabs</button>
      <button active={displayMode === 'both'}>Noten + Tabs</button>
    </div>
  )}
  ```
- Rhythmus-Toolbar mit Icons für Notenwerte (`1`, `1/2`, `1/4`, `1/8`, `1/16`), Triolen (`3`), Punktierung (`.`) und Pause (`R`).
- Count-In Metronom vor Abspielstart.

---

## 🛡️ Governance & Invarianten
1. **UrhG §§ 2, 51, 60a**: Striktes Ceiling von maximal 4 Takten bleibt unantastbar gewahrt.
2. **Monolith Ceiling**: Alle neu erstellten Komponenten bleiben weit unter 1.500 Zeilen (Ziel: ~500–800 Zeilen).
3. **BFSG 2025 / WCAG 2.2 AA**: Vollständige Tastaturbedienbarkeit (Pfeiltasten, Tab, Enter, Space), Kontrast $\ge 7:1$.
4. **Zero-Trust**: Alle Snippets werden mit `school_id`-Scoping gespeichert.
5. **Marken-Neutralität**: Niemals geschützte Markennamen im Quellcode, in UI-Texten oder Dokumenten verwenden.
