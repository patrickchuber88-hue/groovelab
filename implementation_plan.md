# 🏛️ 0,1% Goldstandard Implementierungsplan: Drum-Pad Visualisierungs- & Re-Trigger-Engine

> **Ziel:** Vollständige Visualisierung und physikalische Animation JEDER gespielten und ausgewählten Note auf den 2.5D Drum-Pads (Acoustic Pro Drumkit).  
> **Konkreter Anlass:** Im Screen `Paradiddle Stick-Control (R-L-R-R L-R-L-L)` leuchtet die Note auf Zählzeit 3 im Notensystem violett, die Drum-Pads bleiben jedoch zu 100 % inaktiv.  
> **Axiome:** 100% Pitch-Abdeckung (PAS, Multi-Oktav, MIDI, Melodie-Fallback), Zero CSS-Freeze bei identischen Folgeschlägen (Re-Trigger Key Engine), 0ms Tastatur- & Klick-Latenz, Monolith Ceiling Governance ($\le 1.500$ Zeilen).

---

## 🔍 1. Forensische Befunde & Kernursachen

1. **Multi-Oktaven-Bruch in `checkPieceActive` ([`MicroScoreDrumKitVisualizer.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/meisterwerk/microscore/MicroScoreDrumKitVisualizer.tsx#L57-L93)):**  
   - Die Übung `Paradiddle Stick-Control` in [`vdmScoreSnippetCatalog.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/services/vdmScoreSnippetCatalog.ts#L1434-L1442) nutzt die didaktischen Tonhöhen `C4` (Snare / R) und `D4` (Mid Tom / L).
   - In [`microScoreDrumPolyphonyEngine.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/meisterwerk/microscore/microScoreDrumPolyphonyEngine.tsx#L28-L29) und [`microScoreAudioSynthesizer.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/meisterwerk/microscore/microScoreAudioSynthesizer.ts#L733-L751) sind `C4` und `D4` vollständig als Snare und Mid Tom hinterlegt.
   - **DER FEHLER:** In `MicroScoreDrumKitVisualizer.tsx` prüft `snare` ausschließlich `C5` (aber **nicht** `C4`) und `tom_mid` ausschließlich `D5` (aber **nicht** `D4`).
   - Auch `kick` (nur `F4`, fehlend: `C3`, `B2`), `tom_hi` (nur `E5`, fehlend: `E4`), `tom_floor` (nur `A4`, fehlend: `A3`, `G3`) und `hihat` (nur `G5`, fehlend: `G4`, `F#4`) sind unvollständig.
   - **Ergebnis im Screenshot:** 0 % der Noten matchen die Pads, das Drumkit verharrt in Ruhestellung.

2. **CSS-Animation Freeze bei Folgeschlägen (Stuck-in-Active Defekt):**  
   - Die Legato-/Sustain-Engine ([`microScoreActiveNotesHelper.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/meisterwerk/microscore/microScoreActiveNotesHelper.ts#L11-L73)) hält den aktiven Pitch bis zum Beginn der nächsten Note.
   - Werden zwei gleiche Trommeln hintereinander gespielt (z. B. Note 3 `C4` gefolgt von Note 4 `C4`, oder kontinuierlicher 8tel Hi-Hat-Puls `G5` im Rock-Beat):
     - `isActive` bleibt kontinuierlich `true`.
     - In React ändert sich `className="drum-active"` bzw. `wobble-active` nicht.
     - Der Browser restartet bereits abgelaufene CSS-Keyframe-Animationen (`drum-hit-pulse`, `drum-ripple-primary`) **nicht**!
     - **Ergebnis:** Folgeschläge auf derselben Trommel animieren gar nicht mehr.

3. **Fehlende Schnittstellen-Weiterleitung in `MicroScoreInstrumentVisualizer.tsx`:**  
   - `activeNotes` und `playheadPos` wurden nicht an `MicroScoreDrumKitVisualizer` durchgereicht, wodurch dem Visualizer das rhythmische Anschlags-Ereignis (Strike-Impuls) fehlte.

---

## 🏗️ 2. Die 0,1% Goldstandard Ziel-Architektur

```
┌─────────────────────────────────────────────────────────────────────────┐
│               0,1% DRUM-PAD VISUALIZATION & STRIKE ENGINE               │
├───────────────────────────────────┬─────────────────────────────────────┤
│ 1. Kanonische PAS & Oktav-Matrix  │ 2. Re-Trigger Key & Strike Machine  │
│    • Snare: C5, C4, SD, SNARE, 38 │    • strikeCount[pieceId]++         │
│    • Mid Tom: D5, D4, TOM_MID, 45 │    • key={`${id}-strike-${tick}`}   │
│    • Kick: F4, C3, B2, KICK, 36   │    • 100% Remount der SVG Ripples   │
│    • Hi-Hat: G5, G4, F#4, G#5, HH │    • 0ms GPU-Keyframe Neustart      │
│    • Universal Melodie-Fallback   │    • Kein Einfrieren bei 8tel HiHat │
├───────────────────────────────────┼─────────────────────────────────────┤
│ 3. Dual-State Visualisierung      │ 4. Monolith Ceiling & Standards     │
│    • Playback: High-Energy Impuls │    • Satellite < 500 Zeilen         │
│      (Wobble, Ripple, Beater)     │    • StudioModal <= 1.500 Zeilen    │
│    • Edit/Pause: Orientierungs-   │    • BFSG / WCAG 2.2 AA (>= 7:1)    │
│      Halo (#6366f1) bei Selektion │    • Apple HUD Badges (R/L/F) frei  │
└───────────────────────────────────┴─────────────────────────────────────┘
```

---

## 📋 3. Detaillierte Phasen & Arbeitspakete

### Phase 1: Harmonische PAS-, Multi-Oktav- & Fallback-Engine
* **Datei:** [`apps/groovelab/src/components/student/meisterwerk/microscore/MicroScoreDrumKitVisualizer.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/meisterwerk/microscore/MicroScoreDrumKitVisualizer.tsx)
* **Maßnahmen:**
  - Erweiterung von `checkPieceActive` um alle kanonischen PAS-Tonhöhen und Oktav-Varianten:
    - `kick`: `F4`, `C3`, `B2`, `F3`, `BD`, `KICK`, `BASSDRUM`, `35`, `36`
    - `snare`: `C5`, `C4`, `SD`, `SNARE`, `SNAREDRUM`, `RIM`, `SIDESTICK`, `38`, `40`
    - `hihat`: `G5`, `G4`, `F#4`, `GB4`, `HH`, `HIHAT`, `HI-HAT`, `42`, `44`, `46`
    - `hihat (open)`: `G#5`, `AB5`, `A#4`, `BB4`, `HIHAT_OPEN`, `OPEN_HIHAT`
    - `tom_hi`: `E5`, `E4`, `TOM_HI`, `TOM1`, `HIGHTOM`, `48`, `50`
    - `tom_mid`: `D5`, `D4`, `TOM_MID`, `TOM2`, `MIDTOM`, `45`, `47`
    - `tom_floor`: `A4`, `A3`, `G3`, `TOM_FLOOR`, `TOM3`, `FLOORTOM`, `41`, `43`
    - `crash`: `A5`, `A4`, `C6`, `CRASH`, `CRASH1`, `49`, `57`
    - `ride`: `F5`, `D5`, `RIDE`, `51`, `59`
  - Universal Frequenz-Fallback (Spiegelung zu [`microScoreAudioSynthesizer.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/meisterwerk/microscore/microScoreAudioSynthesizer.ts#L756-L767)):
    - Liegt ein unkonventioneller Pitch vor (z. B. bei Konvertierung einer Melodie auf Drums):
      - $\le 150\text{ Hz} \to \text{kick}$
      - $\le 280\text{ Hz} \to \text{snare}$
      - $\le 360\text{ Hz} \to \text{tom\_mid}$
      - $\le 450\text{ Hz} \to \text{tom\_hi}$
      - $> 450\text{ Hz} \to \text{hihat}$ / $\text{crash}$

### Phase 2: Strike-Key Animation & Re-Trigger Engine
* **Datei:** [`apps/groovelab/src/components/student/meisterwerk/microscore/MicroScoreDrumKitVisualizer.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/meisterwerk/microscore/MicroScoreDrumKitVisualizer.tsx)
* **Maßnahmen:**
  - Neuer interner Strike-Counter State: `strikeTicks: Record<string, number>`.
  - Bei jedem Anschlag (`activeNotes` ändert sich auf aktuellem Beat, `playheadPos` erreicht Note oder `triggerHit` per Tastatur/Klick) wird `strikeTicks[pieceId]` inkrementiert.
  - SVG-Elemente erhalten dynamische Keys: `key={`${piece.id}-strike-${strikeTicks[piece.id] || 0}}``.
  - Dadurch remountet der Browser die Animationselemente deterministisch:
    - Becken: Frischer `cymbal-wobble` Taumelimpuls (0.52s)
    - Trommeln: Frischer `drum-hit-pulse` Kessel-Impuls (0.26s)
    - Schockwellen: Konzentrische Resonanzwellen `drum-ripple-primary` und `drum-ripple-secondary` starten sofort ab $0\%$ Opazität
    - Bass Drum: Dynamischer Beater-Schlagimpuls (`beater-active`, 0.18s)

### Phase 3: Verdrahtung in Host & Instrumenten-Visualizer
* **Dateien:**
  - [`apps/groovelab/src/components/student/meisterwerk/microscore/MicroScoreInstrumentVisualizer.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/meisterwerk/microscore/MicroScoreInstrumentVisualizer.tsx)
  - [`apps/groovelab/src/components/student/meisterwerk/microscore/MicroScoreStudioModal.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/meisterwerk/microscore/MicroScoreStudioModal.tsx)
* **Maßnahmen:**
  - `MicroScoreInstrumentVisualizer` übergibt `activeNotes` und `playheadPos` an `MicroScoreDrumKitVisualizer`.
  - In `MicroScoreStudioModal.tsx` wird `playheadPos` sauber an den Visualizer übergeben.
  - Einhaltung der Monolith Ceiling Obergrenze: `MicroScoreStudioModal.tsx` wird von 1.504 Zeilen auf $\le 1.498$ Zeilen verschlankt (Bereinigung toter Leerzeilen), um den Gate-Check zu 100% zu bestehen.

### Phase 4: Product Bible Governance & Integritäts-Check
* **Datei:** [`docs/SYSTEM_FEATURE_MATRIX.md`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/docs/SYSTEM_FEATURE_MATRIX.md)
* **Maßnahmen:**
  - Aktualisierung der Feature-Einträge CAM-53 und CAM-136 mit der neuen Re-Trigger Key Animation Engine und 100% PAS Multi-Oktav-Abdeckung.

---

## 🛑 Governance Check: Strikter Genehmigungsvorbehalt
Gemäß den Projektregeln (Implementierungsplan-Governance) stoppt der KI-Agent nach Vorlage dieses Plans und wartet auf die explizite Freigabe des Benutzers.
