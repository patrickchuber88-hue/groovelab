/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard: Canonical Score & Instrument Projection Engine
 * canonicalScoreEngine.ts
 * 
 * Der didaktische "Holy Grail" der Musikpädagogik:
 * 1 Kanonischer Score (C-Konzerttonhöhe / SSOT) -> Dynamische Instrumenten-Projektion
 * 
 * - Klavier: Volle Polyphonie, Violin- & Bassschlüssel, enge Stimmführung
 * - Gitarre: Noten + 6-Saiten-TAB (1. Lage Bünde <= 4), offene Lagerfeuer-Akkorde, 12ms Strumming
 * - E-Bass: Bass-Schlüssel (E1-G2), 4-Saiten-TAB, Umwandlung von Blockakkorden in Grundton-Pulslinien
 * - Bläser: Physikalisch korrekte Transposition (Eb für Altsax, Bb für Trompete/Klarinette), Guide-Tone Arpeggios
 * - Drums: Standard Percussion-Clef (Hi-Hat, Snare, Bass Drum)
 */

import {
  MicroScoreSnippet,
  MicroScoreInstrument,
  MicroScoreNote,
  MicroScoreDuration,
  MicroScoreInstrumentProjection
} from '../components/student/meisterwerk/microscore/microScore.types';
import { pitchToBestFretAndString } from '../components/student/meisterwerk/microscore/guitarFretboardEngine';

// Noten-Namen für chromatische Transposition
const CHROMATIC_SCALE_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHROMATIC_SCALE_FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const NOTE_TO_SEMITONE: Record<string, number> = {
  'C': 0, 'C#': 1, 'DB': 1,
  'D': 2, 'D#': 3, 'EB': 3,
  'E': 4, 'FB': 4, 'E#': 5,
  'F': 5, 'F#': 6, 'GB': 6,
  'G': 7, 'G#': 8, 'AB': 8,
  'A': 9, 'A#': 10, 'BB': 10, 'B': 11, 'H': 11, 'CB': 11, 'B#': 0
};

/**
 * Transponiert eine Note um N Halbtöne nach oben/unten
 */
export function transposePitch(pitch: string, semitones: number, preferFlats: boolean = false): string {
  if (!pitch || pitch === 'REST') return 'REST';
  const match = pitch.trim().match(/^([A-Ga-g][#bB]?)(-?\d+)$/);
  if (!match) return pitch;

  const noteName = match[1].toUpperCase();
  const octave = parseInt(match[2], 10);
  const baseSemitone = NOTE_TO_SEMITONE[noteName] ?? 0;

  const totalSemitones = (octave + 1) * 12 + baseSemitone + semitones;
  const newOctave = Math.floor(totalSemitones / 12) - 1;
  const newSemitoneIndex = ((totalSemitones % 12) + 12) % 12;

  const scale = preferFlats ? CHROMATIC_SCALE_FLATS : CHROMATIC_SCALE_SHARPS;
  return `${scale[newSemitoneIndex]}${newOctave}`;
}

/**
 * Gitarren-Offene Akkorde (1. Lage, Bünde <= 3) mit exakter Tabulatur
 */
export interface GuitarChordVoicing {
  pitches: string[];
  frets: number[];
  strings: number[]; // 0=hohe e, 1=B, 2=G, 3=D, 4=A, 5=tiefe E
}

export const GUITAR_OPEN_CHORDS: Record<string, GuitarChordVoicing> = {
  'Em': {
    pitches: ['E3', 'B3', 'E4', 'G4', 'B4', 'E5'],
    frets: [0, 2, 2, 0, 0, 0],
    strings: [5, 4, 3, 2, 1, 0]
  },
  'Am': {
    pitches: ['A3', 'E4', 'A4', 'C5', 'E5'],
    frets: [0, 2, 2, 1, 0],
    strings: [4, 3, 2, 1, 0]
  },
  'C': {
    pitches: ['C4', 'E4', 'G4', 'C5', 'E5'],
    frets: [3, 2, 0, 1, 0],
    strings: [4, 3, 2, 1, 0]
  },
  'G': {
    pitches: ['G3', 'B3', 'D4', 'G4', 'B4', 'G5'],
    frets: [3, 2, 0, 0, 0, 3],
    strings: [5, 4, 3, 2, 1, 0]
  },
  'D': {
    pitches: ['D4', 'A4', 'D5', 'F#5'],
    frets: [0, 2, 3, 2],
    strings: [3, 2, 1, 0]
  },
  'F': {
    pitches: ['F4', 'A4', 'C5', 'F5'],
    frets: [3, 2, 1, 1],
    strings: [3, 2, 1, 0]
  },
  'Dm': {
    pitches: ['D4', 'A4', 'D5', 'F5'],
    frets: [0, 2, 3, 1],
    strings: [3, 2, 1, 0]
  },
  'Dm7': {
    pitches: ['D4', 'A4', 'C5', 'F5'],
    frets: [0, 2, 1, 1],
    strings: [3, 2, 1, 0]
  },
  'G7': {
    pitches: ['G3', 'B3', 'D4', 'G4', 'B4', 'F5'],
    frets: [3, 2, 0, 0, 0, 1],
    strings: [5, 4, 3, 2, 1, 0]
  },
  'Cmaj7': {
    pitches: ['C4', 'E4', 'G4', 'B4', 'E5'],
    frets: [3, 2, 0, 0, 0],
    strings: [4, 3, 2, 1, 0]
  },
  'E': {
    pitches: ['E3', 'B3', 'E4', 'G#4', 'B4', 'E5'],
    frets: [0, 2, 2, 1, 0, 0],
    strings: [5, 4, 3, 2, 1, 0]
  },
  'A': {
    pitches: ['A3', 'E4', 'A4', 'C#5', 'E5'],
    frets: [0, 2, 2, 2, 0],
    strings: [4, 3, 2, 1, 0]
  }
};

/**
 * Erzeugt für einen Akkordnamen simultane Gitarren-Noten
 */
export function buildGuitarChordNotes(
  chordName: string,
  barIndex: number,
  beatFraction: number,
  duration: MicroScoreDuration = '4'
): MicroScoreNote[] {
  const norm = chordName.trim();
  const voicing = GUITAR_OPEN_CHORDS[norm] || GUITAR_OPEN_CHORDS['C'];

  return voicing.pitches.map((pitch, idx) => ({
    id: `gchord-${barIndex}-${beatFraction}-${idx}`,
    barIndex,
    beatFraction,
    duration,
    pitch,
    fret: voicing.frets[idx],
    stringIndex: voicing.strings[idx]
  }));
}

/**
 * Erzeugt für Blasinstrumente ein melodisches Guide-Tone Arpeggio (da Bläser monophon sind)
 */
export function buildWindArpeggioForChord(
  chordName: string,
  barIndex: number,
  semitonesTranspose: number = 0
): MicroScoreNote[] {
  const norm = chordName.trim();
  let basePitches: string[] = ['C4', 'E4', 'G4', 'C5'];

  if (norm === 'Em') basePitches = ['E4', 'G4', 'B4', 'E5'];
  else if (norm === 'Am') basePitches = ['A4', 'C5', 'E5', 'A5'];
  else if (norm === 'G') basePitches = ['G4', 'B4', 'D5', 'G5'];
  else if (norm === 'D') basePitches = ['D4', 'F#4', 'A4', 'D5'];
  else if (norm === 'F') basePitches = ['F4', 'A4', 'C5', 'F5'];
  else if (norm === 'Dm7') basePitches = ['D4', 'F4', 'A4', 'C5'];
  else if (norm === 'G7') basePitches = ['G4', 'B4', 'D5', 'F5'];
  else if (norm === 'Cmaj7') basePitches = ['C4', 'E4', 'G4', 'B4'];

  const fractions = [0, 4, 8, 12];
  return basePitches.map((p, idx) => ({
    id: `wind-${barIndex}-${idx}`,
    barIndex,
    beatFraction: fractions[idx],
    duration: '4' as MicroScoreDuration,
    pitch: transposePitch(p, semitonesTranspose, semitonesTranspose !== 0)
  }));
}

/**
 * Erzeugt für E-Bass eine pulsierende Grundton-Linie mit 4-Saiten-TAB
 */
export function buildBassNotesForChord(
  chordName: string,
  barIndex: number
): MicroScoreNote[] {
  const norm = chordName.trim();
  let rootPitch = 'C3';
  let fret = 3;
  let stringIndex = 2; // A-Saite (0=G, 1=D, 2=A, 3=E)

  if (norm === 'Em') { rootPitch = 'E2'; fret = 0; stringIndex = 3; }
  else if (norm === 'Am') { rootPitch = 'A2'; fret = 0; stringIndex = 2; }
  else if (norm === 'G') { rootPitch = 'G2'; fret = 3; stringIndex = 3; }
  else if (norm === 'D') { rootPitch = 'D3'; fret = 0; stringIndex = 1; }
  else if (norm === 'F') { rootPitch = 'F2'; fret = 1; stringIndex = 3; }
  else if (norm === 'Dm' || norm === 'Dm7') { rootPitch = 'D3'; fret = 0; stringIndex = 1; }
  else if (norm === 'C' || norm === 'Cmaj7') { rootPitch = 'C3'; fret = 3; stringIndex = 2; }

  // 4 gleichmäßige Viertelschläge auf dem Grundton
  return [0, 4, 8, 12].map((frac, idx) => ({
    id: `bass-${barIndex}-${frac}-${idx}`,
    barIndex,
    beatFraction: frac,
    duration: '4' as MicroScoreDuration,
    pitch: rootPitch,
    fret,
    stringIndex
  }));
}

/**
 * Kanonische Normalisierung von Instrumenten-Bezeichnungen (Deutsch/Englisch)
 * auf den gültigen MicroScoreInstrument-Typ
 */
export function normalizeInstrumentToKey(raw?: string | null): MicroScoreInstrument {
  if (!raw) return 'piano';
  const l = raw.toLowerCase().trim();
  if (l === 'universal' || l === 'all' || l === 'universell') return 'universal';
  if (l.includes('gitarre') || l.includes('guitar')) return 'guitar';
  if (l.includes('e-bass') || l.includes('bass') || l.includes('kontrabass')) return 'bass';
  if (l.includes('klavier') || l.includes('piano') || l.includes('keyboard') || l.includes('tasten')) return 'piano';
  if (l.includes('schlagzeug') || l.includes('drum') || l.includes('percussion')) return 'drums';
  if (l.includes('blockflöte') || l.includes('recorder')) return 'recorder';
  if (l.includes('querflöte') || l.includes('flöte') || l.includes('flute')) return 'flute';
  if (l.includes('klarinette') || l.includes('clarinet')) return 'clarinet';
  if (l.includes('altsax') || l.includes('sax')) return 'altosax';
  if (l.includes('trompete') || l.includes('trumpet')) return 'trumpet';
  if (l.includes('posaune') || l.includes('trombone')) return 'trombone';
  if (l.includes('streicher') || l.includes('geige') || l.includes('violine') || l.includes('cello') || l.includes('strings')) return 'strings';
  return 'piano';
}

/**
 * Ermittelt die MIDI-Tonhöhe (C4 = 60) für die Register-Projektion
 */
export function getPitchMidi(pitch: string): number {
  if (!pitch || pitch === 'REST') return -1;
  const match = pitch.trim().toUpperCase().match(/^([A-G][#B]?)(-?\d+)$/);
  if (!match) return 60;
  const semitone = NOTE_TO_SEMITONE[match[1]] ?? 0;
  const octave = parseInt(match[2], 10);
  return (octave + 1) * 12 + semitone;
}

/**
 * Projiziert melodische Tonhöhen unter Wahrung des exakten Rhythmus auf das Schlagzeug-Kit (PAS-Standard)
 */
export function mapMelodicPitchToDrum(pitch: string, beatFraction: number = 0, barIndex: number = 0): string {
  if (!pitch || pitch === 'REST') return 'REST';
  const p = pitch.trim().toUpperCase();

  // 🥁 WÄCHTER: Wenn der Pitch bereits ein kanonischer PAS-Schlagzeugton oder ein Pad-Name ist, 1:1 beibehalten!
  // F4 ist die kanonische PAS Bass Drum / Kick (1. Zwischenraum, y = 43.75) - NIEMALS verändern!
  if (
    p === 'F4' || p === 'KICK' || p === 'BD' || p === 'BASSDRUM' ||
    p === 'C5' || p === 'SNARE' || p === 'SD' ||
    p === 'G5' || p === 'HIHAT' || p === 'HH' || p === 'G#5' || p === 'OPEN_HIHAT' ||
    p === 'A5' || p === 'CRASH' ||
    p === 'F5' || p === 'RIDE' ||
    p === 'E5' || p === 'TOM_HI' || p === 'TOM1' ||
    p === 'D5' || p === 'TOM_MID' || p === 'TOM2' ||
    p === 'A4' || p === 'TOM_FLOOR' || p === 'TOM3' ||
    p === 'D3' || p === 'HIHAT_PEDAL' || p === 'HIHAT_FOOT'
  ) {
    return p;
  }

  const midi = getPitchMidi(pitch);
  if (midi < 0) return 'REST';

  // Akzent auf Takt 1, Beat 1 bei hoher Note -> Crash-Becken (A5)
  if (barIndex === 0 && beatFraction === 0 && midi >= 70) {
    return 'A5'; // Crash
  }

  // Register-Projektion auf die Schlagzeug-Elemente (Kanonischer PAS-Standard)
  if (midi <= 60) return 'F4'; // Tiefe Töne bis inkl. C4 (Middle C) -> Bass Drum (Kick)
  if (midi <= 64) return 'A4'; // Tief-Mitte (C#4–E4) -> Floor Tom
  if (midi <= 67) return 'C5'; // Zentrum (F4–G4) -> Snare Drum
  if (midi <= 71) return 'E5'; // Obere Mitte (G#4–B4) -> High Tom
  if (midi <= 77) return 'G5'; // Hohe Lage (C5–F5) -> Hi-Hat
  return 'A5';                 // Sehr hohe Lage (> F5) -> Crash
}

/**
 * Erzeugt für 3/4-Takt Walzer-Übungen einen kanonischen didaktischen Walzer-Groove (PAS-Standard)
 */
export function buildDrumWaltzGroove(barsCount: number = 2): MicroScoreNote[] {
  const notes: MicroScoreNote[] = [];
  for (let b = 0; b < barsCount; b++) {
    const isFirstBar = b === 0;
    const isLastBar = b === barsCount - 1 && barsCount >= 3;

    if (isLastBar) {
      // Akzentuierter Schlusstakt: Crash + Kick auf 1
      notes.push({ id: `wz_${b}_cr0`, barIndex: b, beatFraction: 0, duration: '4', pitch: 'A5' });
      notes.push({ id: `wz_${b}_bd0`, barIndex: b, beatFraction: 0, duration: '4', pitch: 'F4' });
    } else {
      // Beat 0 (Zählzeit 1): Kick + Hi-Hat (bzw. Crash auf Takt 0)
      notes.push({ id: `wz_${b}_hh0`, barIndex: b, beatFraction: 0, duration: '4', pitch: isFirstBar ? 'A5' : 'G5' });
      notes.push({ id: `wz_${b}_bd0`, barIndex: b, beatFraction: 0, duration: '4', pitch: 'F4' });

      // Beat 4 (Zählzeit 2): Hi-Hat + Snare
      notes.push({ id: `wz_${b}_hh4`, barIndex: b, beatFraction: 4, duration: '4', pitch: 'G5' });
      notes.push({ id: `wz_${b}_sd4`, barIndex: b, beatFraction: 4, duration: '4', pitch: 'C5' });

      // Beat 8 (Zählzeit 3): Hi-Hat + Snare
      notes.push({ id: `wz_${b}_hh8`, barIndex: b, beatFraction: 8, duration: '4', pitch: 'G5' });
      notes.push({ id: `wz_${b}_sd8`, barIndex: b, beatFraction: 8, duration: '4', pitch: 'C5' });
    }
  }
  return notes;
}

/**
 * Erzeugt für reine Akkord-Übungen einen authentischen, lebendigen Rock/Pop-Groove (PAS-Standard)
 */
export function buildDrumGrooveForChord(barIndex: number, isFirstBar: boolean = false): MicroScoreNote[] {
  const notes: MicroScoreNote[] = [];

  // Crash auf Beat 1 des ersten Taktes
  if (isFirstBar) {
    notes.push({
      id: `drum-${barIndex}-crash-0`,
      barIndex,
      beatFraction: 0,
      duration: '4',
      pitch: 'A5'
    });
  }

  // Durchgehende Hi-Hat auf alle 8tel-Noten
  [0, 2, 4, 6, 8, 10, 12, 14].forEach(frac => {
    if (!(isFirstBar && frac === 0)) {
      notes.push({
        id: `drum-${barIndex}-hh-${frac}`,
        barIndex,
        beatFraction: frac,
        duration: '8',
        pitch: 'G5'
      });
    }
  });

  // Bass Drum auf 1 und 3 (PAS F4)
  notes.push({
    id: `drum-${barIndex}-bd-0`,
    barIndex,
    beatFraction: 0,
    duration: '4',
    pitch: 'F4'
  });
  notes.push({
    id: `drum-${barIndex}-bd-8`,
    barIndex,
    beatFraction: 8,
    duration: '4',
    pitch: 'F4'
  });

  // Snare Drum auf 2 und 4 (Backbeat, PAS C5)
  notes.push({
    id: `drum-${barIndex}-sd-4`,
    barIndex,
    beatFraction: 4,
    duration: '4',
    pitch: 'C5'
  });
  notes.push({
    id: `drum-${barIndex}-sd-12`,
    barIndex,
    beatFraction: 12,
    duration: '4',
    pitch: 'C5'
  });

  return notes;
}

/**
 * Die Hauptfunktion: Projiziert ein beliebiges Notenschnipsel verlustfrei auf das Zielinstrument
 * inklusive physikalisch korrekter Notenschlüssel-Governance (Violin-, Bass- & Percussion-Clef)
 */
export function resolveSnippetForInstrument(
  snippet: MicroScoreSnippet,
  targetInstrument: MicroScoreInstrument | string
): MicroScoreSnippet {
  const normTarget = normalizeInstrumentToKey(targetInstrument);

  // Wenn Ziel 'universal' ist, bestehendes spezifisches Instrument unverändert beibehalten
  if (normTarget === 'universal' && snippet.instrument && snippet.instrument !== 'universal') {
    return snippet;
  }

  // Wenn bereits exakt passend
  if (snippet.instrument === normTarget) {
    if (!snippet.clef) {
      const defaultClef = (normTarget === 'bass' || normTarget === 'trombone') ? 'bass' : (normTarget === 'drums' ? 'percussion' : 'treble');
      return { ...snippet, clef: defaultClef };
    }
    return snippet;
  }

  // Wenn explizite statische Projektion vorhanden
  if (snippet.projections && snippet.projections[normTarget]) {
    const proj = snippet.projections[normTarget]!;
    return {
      ...snippet,
      instrument: normTarget,
      notes: proj.notes,
      chords: proj.chords || snippet.chords,
      displayMode: proj.displayMode || (normTarget === 'guitar' || normTarget === 'bass' || normTarget === 'strings' ? 'both' : 'notes'),
      clef: proj.clef || (normTarget === 'bass' || normTarget === 'trombone' ? 'bass' : (normTarget === 'drums' ? 'percussion' : 'treble')),
      description: proj.description || snippet.description
    };
  }

  // --- DYNAMISCHE 0,1% PROJEKTION ---

  // 1. GITARRE (Treble Clef, 1. Lage Open Chords & TAB)
  if (normTarget === 'guitar') {
    const isChordSnippet = snippet.category === 'Akkorde' || (snippet.chords && snippet.chords.length > 0);
    let projectedNotes: MicroScoreNote[] = [];

    if (isChordSnippet && snippet.chords && snippet.chords.length > 0) {
      // Baue echte simultane offene Akkorde
      snippet.chords.forEach(c => {
        // 4 Viertelschläge pro Takt
        [0, 4, 8, 12].forEach(beat => {
          const chordNotes = buildGuitarChordNotes(c.chordName, c.barIndex, beat, '4');
          projectedNotes.push(...chordNotes);
        });
      });
    } else {
      // Projiziere Tonleiter/Melodie mit Bund & Saite in 1. Lage
      projectedNotes = snippet.notes.map(n => {
        if (n.pitch && n.pitch !== 'REST') {
          const tab = pitchToBestFretAndString(n.pitch, undefined, false);
          return {
            ...n,
            fret: n.fret !== undefined ? n.fret : tab?.fret,
            stringIndex: n.stringIndex !== undefined ? n.stringIndex : tab?.stringIndex
          };
        }
        return n;
      });
    }

    return {
      ...snippet,
      instrument: 'guitar',
      displayMode: 'both',
      clef: 'treble',
      notes: projectedNotes
    };
  }

  // 2. E-BASS (Bass Clef, tiefe Lage E1-G2 & 4-Saiten-TAB)
  if (normTarget === 'bass') {
    const isChordSnippet = snippet.category === 'Akkorde' || (snippet.chords && snippet.chords.length > 0);
    let projectedNotes: MicroScoreNote[] = [];

    if (isChordSnippet && snippet.chords && snippet.chords.length > 0) {
      snippet.chords.forEach(c => {
        const bassNotes = buildBassNotesForChord(c.chordName, c.barIndex);
        projectedNotes.push(...bassNotes);
      });
    } else {
      // Transponiere in Bass-Lage
      projectedNotes = snippet.notes.map(n => {
        if (n.pitch && n.pitch !== 'REST') {
          const deepPitch = transposePitch(n.pitch, -12);
          const tab = pitchToBestFretAndString(deepPitch, undefined, true);
          return {
            ...n,
            pitch: deepPitch,
            fret: tab?.fret,
            stringIndex: tab ? Math.min(tab.stringIndex, 3) : 0 // 4 Saiten Bass
          };
        }
        return n;
      });
    }

    return {
      ...snippet,
      instrument: 'bass',
      displayMode: 'both',
      clef: 'bass',
      notes: projectedNotes
    };
  }

  // 2b. STREICHER / VIOLINE (Treble Clef, 1. Lage G3..E5 & 4-Saiten-TAB)
  if (normTarget === 'strings') {
    const projectedNotes = snippet.notes.map(n => {
      if (n.pitch && n.pitch !== 'REST') {
        const tab = pitchToBestFretAndString(n.pitch, undefined, 'strings');
        return {
          ...n,
          fret: n.fret !== undefined ? n.fret : tab?.fret,
          stringIndex: n.stringIndex !== undefined ? n.stringIndex : tab?.stringIndex
        };
      }
      return n;
    });

    return {
      ...snippet,
      instrument: 'strings',
      displayMode: 'both',
      clef: 'treble',
      notes: projectedNotes
    };
  }

  // 3. POSAUNE (Bass Clef, Tiefblech)
  if (normTarget === 'trombone') {
    const isChordSnippet = snippet.category === 'Akkorde' || (snippet.chords && snippet.chords.length > 0);
    let projectedNotes: MicroScoreNote[] = [];

    if (isChordSnippet && snippet.chords && snippet.chords.length > 0) {
      snippet.chords.forEach(c => {
        const arpeggio = buildWindArpeggioForChord(c.chordName, c.barIndex, -12);
        projectedNotes.push(...arpeggio);
      });
    } else {
      projectedNotes = snippet.notes.map(n => ({
        ...n,
        pitch: transposePitch(n.pitch, -12, false)
      }));
    }

    return {
      ...snippet,
      instrument: 'trombone',
      displayMode: 'notes',
      clef: 'bass',
      notes: projectedNotes
    };
  }

  // 4. BLÄSER: ALTSAXOPHON (Treble Clef, Eb)
  if (normTarget === 'altosax') {
    const isChordSnippet = snippet.category === 'Akkorde' || (snippet.chords && snippet.chords.length > 0);
    let projectedNotes: MicroScoreNote[] = [];

    if (isChordSnippet && snippet.chords && snippet.chords.length > 0) {
      snippet.chords.forEach(c => {
        const arpeggio = buildWindArpeggioForChord(c.chordName, c.barIndex, 9);
        projectedNotes.push(...arpeggio);
      });
    } else {
      projectedNotes = snippet.notes.map(n => ({
        ...n,
        pitch: transposePitch(n.pitch, 9, false) // +9 Halbtöne für Eb
      }));
    }

    return {
      ...snippet,
      instrument: 'altosax',
      displayMode: 'notes',
      clef: 'treble',
      notes: projectedNotes
    };
  }

  // 5. BLÄSER: TROMPETE / KLARINETTE (Treble Clef, Bb)
  if (normTarget === 'trumpet' || normTarget === 'clarinet') {
    const isChordSnippet = snippet.category === 'Akkorde' || (snippet.chords && snippet.chords.length > 0);
    let projectedNotes: MicroScoreNote[] = [];

    if (isChordSnippet && snippet.chords && snippet.chords.length > 0) {
      snippet.chords.forEach(c => {
        const arpeggio = buildWindArpeggioForChord(c.chordName, c.barIndex, 2);
        projectedNotes.push(...arpeggio);
      });
    } else {
      projectedNotes = snippet.notes.map(n => ({
        ...n,
        pitch: transposePitch(n.pitch, 2, false) // +2 Halbtöne für Bb
      }));
    }

    return {
      ...snippet,
      instrument: normTarget,
      displayMode: 'notes',
      clef: 'treble',
      notes: projectedNotes
    };
  }

  // 6. SCHLAGZEUG (Percussion Clef, PAS Standard & 1:1 Rhythmus-Projektion)
  if (normTarget === 'drums') {
    // 🥁 WÄCHTER: Wenn das Schnipsel bereits ein Schlagzeug-Snippet ist, Noten 100% unverändert beibehalten!
    if (snippet.clef === 'percussion' || snippet.instrument === 'drums' || (snippet.id && snippet.id.includes('drum'))) {
      return {
        ...snippet,
        instrument: 'drums',
        clef: 'percussion',
        displayMode: 'notes'
      };
    }

    const isChordSnippet = snippet.category === 'Akkorde' || (snippet.chords && snippet.chords.length > 0 && (!snippet.notes || snippet.notes.length === 0));
    let projectedNotes: MicroScoreNote[] = [];

    if (snippet.timeSignature === '3/4') {
      // Authentischer 3/4 Walzer-Groove (PAS-Standard)
      projectedNotes = buildDrumWaltzGroove(snippet.barsCount || 2);
    } else if (isChordSnippet && snippet.chords && snippet.chords.length > 0) {
      snippet.chords.forEach((c, idx) => {
        const groove = buildDrumGrooveForChord(c.barIndex, idx === 0);
        projectedNotes.push(...groove);
      });
    } else if (snippet.notes && snippet.notes.length > 0) {
      // 1:1 Rhythmus-Parität: Projiziere melodische Noten auf das Schlagzeugkit
      projectedNotes = snippet.notes.map(n => ({
        ...n,
        pitch: mapMelodicPitchToDrum(n.pitch, n.beatFraction, n.barIndex)
      }));
    } else {
      // Fallback 1-Takt Basis-Groove
      projectedNotes = buildDrumGrooveForChord(0, true);
    }

    return {
      ...snippet,
      instrument: 'drums',
      displayMode: 'notes',
      clef: 'percussion',
      notes: projectedNotes
    };
  }

  // 7. KLAVIER & QUERFLÖTE & STREICHER (C Klingend / Standard)
  return {
    ...snippet,
    instrument: normTarget === 'universal' ? 'piano' : normTarget,
    displayMode: 'notes',
    clef: snippet.clef || 'treble'
  };
}
