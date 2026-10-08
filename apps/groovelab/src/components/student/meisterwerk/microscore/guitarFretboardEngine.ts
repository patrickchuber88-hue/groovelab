/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (1–4 Takte)
 * guitarFretboardEngine.ts
 * 
 * Mathematisch präzise Griffbrett- & Tabulatur-Engine:
 * - Standard Gitarren-Stimmung (E2, A2, D3, G3, B3, E4)
 * - 48-Tick-Raster pro 4/4-Takt für jitterfreie Triolen und geradlinige Rhythmen
 * - Bidirektionales Mapping: Saite + Bund ↔ Pitch / MIDI-Note
 * - Ergonomische Lagen-Allokation bei Noteneingabe (Vorrang für Lagen 0–5)
 */

import { MicroScoreInstrument } from './microScore.types';

export interface GuitarStringInfo {
  index: number;         // 0 (hohes e) bis 5 (tiefes E)
  name: string;          // 'e', 'B', 'G', 'D', 'A', 'E'
  openPitch: string;     // 'E4', 'B3', 'G3', 'D3', 'A2', 'E2'
  openMidi: number;      // 64, 59, 55, 50, 45, 40
}

export const GUITAR_STRINGS: GuitarStringInfo[] = [
  { index: 0, name: 'e', openPitch: 'E4', openMidi: 64 },
  { index: 1, name: 'B', openPitch: 'B3', openMidi: 59 },
  { index: 2, name: 'G', openPitch: 'G3', openMidi: 55 },
  { index: 3, name: 'D', openPitch: 'D3', openMidi: 50 },
  { index: 4, name: 'A', openPitch: 'A2', openMidi: 45 },
  { index: 5, name: 'E', openPitch: 'E2', openMidi: 40 }
];

export const BASS_STRINGS: GuitarStringInfo[] = [
  { index: 0, name: 'G', openPitch: 'G2', openMidi: 43 },
  { index: 1, name: 'D', openPitch: 'D2', openMidi: 38 },
  { index: 2, name: 'A', openPitch: 'A1', openMidi: 33 },
  { index: 3, name: 'E', openPitch: 'E1', openMidi: 28 }
];

export const VIOLIN_STRINGS: GuitarStringInfo[] = [
  { index: 0, name: 'e', openPitch: 'E5', openMidi: 76 },
  { index: 1, name: 'a', openPitch: 'A4', openMidi: 69 },
  { index: 2, name: 'd', openPitch: 'D4', openMidi: 62 },
  { index: 3, name: 'g', openPitch: 'G3', openMidi: 55 }
];

export function isStringOrPluckedInstrument(instrument: MicroScoreInstrument): boolean {
  return instrument === 'guitar' || instrument === 'bass' || instrument === 'strings';
}

export function getInstrumentStrings(instrument: MicroScoreInstrument | boolean): GuitarStringInfo[] {
  if (instrument === 'strings') return VIOLIN_STRINGS;
  if (instrument === 'bass' || instrument === true) return BASS_STRINGS;
  return GUITAR_STRINGS;
}

export const TICKS_PER_MEASURE_4_4 = 48;
export const TICKS_PER_QUARTER = 12;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Konvertiert Pitch-String (z. B. "C4", "F#3", "Bb4") in MIDI-Notennummer
 */
export function pitchToMidi(pitch: string): number | null {
  if (!pitch || pitch === 'REST') return null;
  const match = pitch.trim().toUpperCase().match(/^([A-H][#B♮]?)(-?\d+)$/);
  if (!match) return null;
  let noteName = match[1].replace('♮', '');
  const octave = parseInt(match[2], 10);

  if (noteName === 'DB') noteName = 'C#';
  if (noteName === 'EB') noteName = 'D#';
  if (noteName === 'GB') noteName = 'F#';
  if (noteName === 'AB') noteName = 'G#';
  if (noteName === 'BB') noteName = 'A#';
  if (noteName === 'H') noteName = 'B';

  const semitone = NOTE_NAMES.indexOf(noteName);
  if (semitone === -1) return null;

  return (octave + 1) * 12 + semitone;
}

/**
 * Konvertiert MIDI-Notennummer in kanonischen Pitch-String (z. B. 60 -> "C4")
 */
export function midiToPitch(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const semitone = midi % 12;
  return `${NOTE_NAMES[semitone]}${octave}`;
}

/**
 * Berechnet die resultierende Tonhöhe aus Saite (0..5) und Bund (0..24)
 * Berücksichtigt Standard-Gitarren/Bass-Notation (Treble 8vb / Bass 8vb: 1 Oktave höher notiert als klingend)
 */
export function fretAndStringToPitch(stringIndex: number, fret: number, isBassOrInst: boolean | MicroScoreInstrument = false): string {
  const isStrings = isBassOrInst === 'strings';
  const isBass = isBassOrInst === 'bass' || isBassOrInst === true;
  const strings = isStrings ? VIOLIN_STRINGS : isBass ? BASS_STRINGS : GUITAR_STRINGS;
  const str = strings[stringIndex] || strings[0];
  const soundingMidi = str.openMidi + Math.max(0, Math.min(24, fret));
  // Streicher spielen nicht-transponierend im Violinschlüssel (C-Notation)
  const writtenMidi = isStrings ? soundingMidi : soundingMidi + 12;
  return midiToPitch(writtenMidi);
}

/**
 * Findet die ergonomisch beste Saite und den Bund für eine gegebene Tonhöhe
 * 0,1% Goldstandard: Bevorzugt strikt 1. Lage (Bünde 0–4 < 5) und leere Saiten.
 * Wechselt bei höheren Tönen automatisch die Saite!
 */
export function pitchToBestFretAndString(
  pitch: string,
  preferredString?: number,
  isBassOrInst: boolean | MicroScoreInstrument = false,
  usedStrings: number[] = []
): { stringIndex: number; fret: number } | null {
  const rawMidi = pitchToMidi(pitch);
  if (rawMidi === null) return null;

  const isStrings = isBassOrInst === 'strings';
  const isBass = isBassOrInst === 'bass' || isBassOrInst === true;
  const strings = isStrings ? VIOLIN_STRINGS : isBass ? BASS_STRINGS : GUITAR_STRINGS;

  // Transposition: Standard-Notation für Gitarre (Treble 8vb) & Bass (Bass 8vb)
  let soundingMidi = rawMidi;
  if (!isStrings) {
    soundingMidi = rawMidi - 12; // Unconditional 8vb transposition for 100% parity
  }

  // Finde alle spielbaren Positionen
  const candidates: Array<{ stringIndex: number; fret: number }> = [];
  for (let s = 0; s < strings.length; s++) {
    const fret = soundingMidi - strings[s].openMidi;
    if (fret >= 0 && fret <= 24) {
      candidates.push({ stringIndex: s, fret });
    }
  }

  if (candidates.length === 0) return null;

  // Wenn preferredString explizit angegeben ist und frei ist:
  if (preferredString !== undefined && preferredString >= 0 && preferredString < strings.length && !usedStrings.includes(preferredString)) {
    const prefCandidate = candidates.find(c => c.stringIndex === preferredString);
    // Bevorzuge preferredString, wenn der Bund ergonomisch spielbar ist (<= 7)
    if (prefCandidate && prefCandidate.fret <= 7) {
      return prefCandidate;
    }
  }

  // 1. Lage Priorität: Filtere nach Bünden < 5 (Bünde 0, 1, 2, 3, 4)
  const firstPosCandidates = candidates.filter(c => c.fret < 5);

  if (firstPosCandidates.length > 0) {
    // Wenn usedStrings angegeben ist, bevorzuge freie Saiten
    const availablePosCandidates = firstPosCandidates.filter(c => !usedStrings.includes(c.stringIndex));
    const activePool = availablePosCandidates.length > 0 ? availablePosCandidates : firstPosCandidates;

    // Falls die bevorzugte Saite existiert, priorisiere sie
    if (preferredString !== undefined && preferredString >= 0 && preferredString < strings.length) {
      const matchPref = activePool.find(c => c.stringIndex === preferredString);
      if (matchPref) {
        return matchPref;
      }
    }

    // Sortiere nach 0,1% pädagogischem Standard:
    // 1. Leere Saiten (fret === 0) haben höchste Priorität
    // 2. Niedrigere Bünde (1..4)
    activePool.sort((a, b) => {
      if (a.fret === 0 && b.fret !== 0) return -1;
      if (b.fret === 0 && a.fret !== 0) return 1;
      return a.fret - b.fret;
    });

    return activePool[0];
  }

  // Fallback für höhere Lagen jenseits von Bund 4 (niedrigster verfügbarer Bund)
  candidates.sort((a, b) => a.fret - b.fret);
  return candidates[0];
}

/**
 * Konvertiert alte 16tel-beatFraction (0..15) zu 48-Tick-Position
 */
export function fractionToTicks(fraction: number): number {
  return Math.round(fraction * 3);
}

/**
 * Konvertiert 48-Tick-Position zu Dezimal-16tel-Fraction (für Abwärtskompatibilität)
 */
export function ticksToFraction(ticks: number): number {
  return ticks / 3;
}

/**
 * Standard-Tick-Dauer für Notenwerte (in 48-Tick-Auflösung)
 */
export function durationToTicks(duration: string, isDotted = false, isTriplet = false): number {
  let baseTicks = 12; // Viertel
  switch (duration) {
    case '1': baseTicks = 48; break; // Ganze
    case '2': baseTicks = 24; break; // Halbe
    case '4': baseTicks = 12; break; // Viertel
    case '8': baseTicks = 6;  break; // Achtel
    case '16': baseTicks = 3; break; // 16tel
  }

  if (isTriplet) {
    // Triolen-Subdivision: 3 Noten im Raum von 2
    if (duration === '8') return 4;   // 8tel-Triole (3x 4 = 12 Ticks = 1 Viertel)
    if (duration === '16') return 2;  // 16tel-Triole (3x 2 = 6 Ticks = 1 Achtel)
    if (duration === '4') return 8;   // Viertel-Triole (3x 8 = 24 Ticks = 1 Halbe)
    return Math.max(1, Math.round((baseTicks * 2) / 3));
  }

  if (isDotted) {
    return Math.round(baseTicks * 1.5);
  }

  return baseTicks;
}

export interface ChordVoicingNote {
  pitch: string;
  stringIndex?: number;
  fret?: number;
}

/**
 * 0,1% Smart-Akkord Engine: Erzeugt das instrumentenspezifische Voicing für einen Grundton
 * - Gitarre: Authentische 1.-Lage-Griffe (Open Chords) über 4–6 Saiten
 * - Klavier: Grundstellungs-Dreiklang im Violinschlüssel (Root + Terz + Quinte)
 * - Bass: Druckvoller Powerchord/Zweiklang (Root + Quinte)
 * - Bläser/Streicher: Transparenter 3-stimmiger Satzdreiklang
 */
export function getInstrumentChordVoicing(
  rootPitch: string,
  quality: 'major' | 'minor' = 'major',
  instrument: MicroScoreInstrument = 'piano'
): ChordVoicingNote[] {
  if (!rootPitch || rootPitch === 'REST') return [];

  // Parse Grundton und Oktave
  const match = rootPitch.trim().toUpperCase().match(/^([A-H][#B♮]?)(-?\d+)?$/);
  if (!match) return [{ pitch: rootPitch }];

  let rootLetter = match[1].replace('♮', '');
  if (rootLetter === 'H') rootLetter = 'B';
  const specifiedOctave = match[2] ? parseInt(match[2], 10) : undefined;

  // 1. 🎸 GITARRE: Kanonischer 1.-Lage-Katalog (Open Chords)
  if (instrument === 'guitar') {
    if (rootLetter === 'C') {
      return quality === 'minor'
        ? [
            { pitch: 'Eb4', stringIndex: 3, fret: 1 },
            { pitch: 'G4', stringIndex: 2, fret: 0 },
            { pitch: 'C5', stringIndex: 1, fret: 1 },
            { pitch: 'G5', stringIndex: 0, fret: 3 }
          ]
        : [
            { pitch: 'C4', stringIndex: 4, fret: 3 },
            { pitch: 'E4', stringIndex: 3, fret: 2 },
            { pitch: 'G4', stringIndex: 2, fret: 0 },
            { pitch: 'C5', stringIndex: 1, fret: 1 },
            { pitch: 'E5', stringIndex: 0, fret: 0 }
          ];
    }
    if (rootLetter === 'D') {
      return quality === 'minor'
        ? [
            { pitch: 'D4', stringIndex: 3, fret: 0 },
            { pitch: 'A4', stringIndex: 2, fret: 2 },
            { pitch: 'D5', stringIndex: 1, fret: 3 },
            { pitch: 'F5', stringIndex: 0, fret: 1 }
          ]
        : [
            { pitch: 'D4', stringIndex: 3, fret: 0 },
            { pitch: 'A4', stringIndex: 2, fret: 2 },
            { pitch: 'D5', stringIndex: 1, fret: 3 },
            { pitch: 'F#5', stringIndex: 0, fret: 2 }
          ];
    }
    if (rootLetter === 'E') {
      return quality === 'minor'
        ? [
            { pitch: 'E3', stringIndex: 5, fret: 0 },
            { pitch: 'B3', stringIndex: 4, fret: 2 },
            { pitch: 'E4', stringIndex: 3, fret: 2 },
            { pitch: 'G4', stringIndex: 2, fret: 0 },
            { pitch: 'B4', stringIndex: 1, fret: 0 },
            { pitch: 'E5', stringIndex: 0, fret: 0 }
          ]
        : [
            { pitch: 'E3', stringIndex: 5, fret: 0 },
            { pitch: 'B3', stringIndex: 4, fret: 2 },
            { pitch: 'E4', stringIndex: 3, fret: 2 },
            { pitch: 'G#4', stringIndex: 2, fret: 1 },
            { pitch: 'B4', stringIndex: 1, fret: 0 },
            { pitch: 'E5', stringIndex: 0, fret: 0 }
          ];
    }
    if (rootLetter === 'F') {
      return quality === 'minor'
        ? [
            { pitch: 'F4', stringIndex: 3, fret: 3 },
            { pitch: 'Ab4', stringIndex: 2, fret: 1 },
            { pitch: 'C5', stringIndex: 1, fret: 1 },
            { pitch: 'F5', stringIndex: 0, fret: 1 }
          ]
        : [
            { pitch: 'F4', stringIndex: 3, fret: 3 },
            { pitch: 'A4', stringIndex: 2, fret: 2 },
            { pitch: 'C5', stringIndex: 1, fret: 1 },
            { pitch: 'F5', stringIndex: 0, fret: 1 }
          ];
    }
    if (rootLetter === 'G') {
      return quality === 'minor'
        ? [
            { pitch: 'D4', stringIndex: 3, fret: 0 },
            { pitch: 'Bb4', stringIndex: 2, fret: 3 },
            { pitch: 'D5', stringIndex: 1, fret: 3 },
            { pitch: 'G5', stringIndex: 0, fret: 3 }
          ]
        : [
            { pitch: 'G3', stringIndex: 5, fret: 3 },
            { pitch: 'B3', stringIndex: 4, fret: 2 },
            { pitch: 'D4', stringIndex: 3, fret: 0 },
            { pitch: 'G4', stringIndex: 2, fret: 0 },
            { pitch: 'B4', stringIndex: 1, fret: 0 },
            { pitch: 'G5', stringIndex: 0, fret: 3 }
          ];
    }
    if (rootLetter === 'A') {
      return quality === 'minor'
        ? [
            { pitch: 'A3', stringIndex: 4, fret: 0 },
            { pitch: 'E4', stringIndex: 3, fret: 2 },
            { pitch: 'A4', stringIndex: 2, fret: 2 },
            { pitch: 'C5', stringIndex: 1, fret: 1 },
            { pitch: 'E5', stringIndex: 0, fret: 0 }
          ]
        : [
            { pitch: 'A3', stringIndex: 4, fret: 0 },
            { pitch: 'E4', stringIndex: 3, fret: 2 },
            { pitch: 'A4', stringIndex: 2, fret: 2 },
            { pitch: 'C#5', stringIndex: 1, fret: 2 },
            { pitch: 'E5', stringIndex: 0, fret: 0 }
          ];
    }
    if (rootLetter === 'B') {
      return quality === 'minor'
        ? [
            { pitch: 'B3', stringIndex: 4, fret: 2 },
            { pitch: 'D4', stringIndex: 3, fret: 0 },
            { pitch: 'F#4', stringIndex: 2, fret: 4 },
            { pitch: 'B4', stringIndex: 1, fret: 0 },
            { pitch: 'F#5', stringIndex: 0, fret: 2 }
          ]
        : [
            { pitch: 'B3', stringIndex: 4, fret: 2 },
            { pitch: 'D#4', stringIndex: 3, fret: 1 },
            { pitch: 'A4', stringIndex: 2, fret: 2 },
            { pitch: 'B4', stringIndex: 1, fret: 0 },
            { pitch: 'F#5', stringIndex: 0, fret: 2 }
          ];
    }

    // Exotischere Grundtöne (Halbtöne wie C#, F#, etc.)
    const rootMidi = pitchToMidi(`${rootLetter}${specifiedOctave ?? 4}`) ?? 60;
    const thirdMidi = rootMidi + (quality === 'minor' ? 3 : 4);
    const fifthMidi = rootMidi + 7;
    const triadMidis = [rootMidi, thirdMidi, fifthMidi];
    const usedStrings: number[] = [];
    return triadMidis.map(m => {
      const p = midiToPitch(m);
      const pos = pitchToBestFretAndString(p, undefined, false, usedStrings);
      if (pos) usedStrings.push(pos.stringIndex);
      return { pitch: p, stringIndex: pos?.stringIndex, fret: pos?.fret };
    });
  }

  // 2. 🎸 E-BASS: Powerchord / Doppelgriff (Root + Quinte)
  if (instrument === 'bass') {
    const bassOctave = specifiedOctave ?? 2;
    const rootMidi = pitchToMidi(`${rootLetter}${bassOctave}`) ?? 36;
    const fifthMidi = rootMidi + 7;
    const usedStrings: number[] = [];
    const rootP = midiToPitch(rootMidi);
    const fifthP = midiToPitch(fifthMidi);
    const rootPos = pitchToBestFretAndString(rootP, undefined, true, usedStrings);
    if (rootPos) usedStrings.push(rootPos.stringIndex);
    const fifthPos = pitchToBestFretAndString(fifthP, undefined, true, usedStrings);
    return [
      { pitch: rootP, stringIndex: rootPos?.stringIndex, fret: rootPos?.fret },
      { pitch: fifthP, stringIndex: fifthPos?.stringIndex, fret: fifthPos?.fret }
    ];
  }

  // 3. 🎹 KLAVIER & BLÄSER / STREICHER: Klassischer Dreiklang
  const defaultClefOctave = instrument === 'trombone' ? 3 : (specifiedOctave ?? 4);
  const rootMidi = pitchToMidi(`${rootLetter}${defaultClefOctave}`) ?? (defaultClefOctave === 3 ? 48 : 60);
  const thirdMidi = rootMidi + (quality === 'minor' ? 3 : 4);
  const fifthMidi = rootMidi + 7;

  return [
    { pitch: midiToPitch(rootMidi) },
    { pitch: midiToPitch(thirdMidi) },
    { pitch: midiToPitch(fifthMidi) }
  ];
}
