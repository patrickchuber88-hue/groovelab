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
import { pitchToBestFretAndString, fretAndStringToPitch } from '../components/student/meisterwerk/microscore/guitarFretboardEngine';

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
  },
  'Dm9': {
    pitches: ['D4', 'A4', 'C5', 'E5'],
    frets: [0, 2, 1, 0],
    strings: [3, 2, 1, 0]
  },
  'G13': {
    pitches: ['G3', 'F4', 'B4', 'E5'],
    frets: [3, 3, 0, 0],
    strings: [5, 3, 1, 0]
  },
  'Am7': {
    pitches: ['A3', 'E4', 'G4', 'C5', 'E5'],
    frets: [0, 2, 0, 1, 0],
    strings: [4, 3, 2, 1, 0]
  },
  'Em7': {
    pitches: ['E3', 'B3', 'D4', 'G4', 'B4', 'E5'],
    frets: [0, 2, 0, 0, 0, 0],
    strings: [5, 4, 3, 2, 1, 0]
  },
  'Fmaj7': {
    pitches: ['F4', 'A4', 'C5', 'E5'],
    frets: [3, 2, 1, 0],
    strings: [3, 2, 1, 0]
  },
  'A7': {
    pitches: ['A3', 'E4', 'G4', 'C#5', 'E5'],
    frets: [0, 2, 0, 2, 0],
    strings: [4, 3, 2, 1, 0]
  },
  'D7': {
    pitches: ['D4', 'A4', 'C5', 'F#5'],
    frets: [0, 2, 1, 2],
    strings: [3, 2, 1, 0]
  },
  'E7': {
    pitches: ['E3', 'B3', 'D4', 'G#4', 'B4', 'E5'],
    frets: [0, 2, 0, 1, 0, 0],
    strings: [5, 4, 3, 2, 1, 0]
  },
  'B7': {
    pitches: ['B3', 'D#4', 'A4', 'B4', 'F#5'],
    frets: [2, 1, 2, 0, 2],
    strings: [4, 3, 2, 1, 0]
  },
  'Cadd9': {
    pitches: ['C4', 'E4', 'G4', 'D5', 'E5'],
    frets: [3, 2, 0, 3, 0],
    strings: [4, 3, 2, 1, 0]
  },
  'Dsus4': {
    pitches: ['D4', 'A4', 'D5', 'G5'],
    frets: [0, 2, 3, 3],
    strings: [3, 2, 1, 0]
  },
  'Asus4': {
    pitches: ['A3', 'E4', 'A4', 'D5', 'E5'],
    frets: [0, 2, 2, 3, 0],
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
  if (l.includes('vocal') || l.includes('gesang') || l.includes('stimme') || l.includes('voice')) return 'vocals';
  if (l.includes('ukulele') || l.includes('uke')) return 'ukulele';
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
 * 🏛️ 0,1% Goldstandard Ambitus-Engine:
 * Hält Melodien zusammenhängend (ohne Oktav-Knick) im physikalischen und didaktischen
 * Wohlfühl-Tonumfang (Sweet-Spot) des jeweiligen Zielinstruments.
 */
export function clampNotesToInstrumentAmbitus(
  notes: MicroScoreNote[],
  minSweetMidi: number,
  maxSweetMidi: number,
  hardFloorMidi: number = minSweetMidi,
  preferFlats: boolean = false
): MicroScoreNote[] {
  const pitchedMidis = notes
    .filter(n => n.pitch && n.pitch !== 'REST')
    .map(n => getPitchMidi(n.pitch));

  if (pitchedMidis.length === 0) return notes;

  const minMidi = Math.min(...pitchedMidis);
  const maxMidi = Math.max(...pitchedMidis);

  // 1. Globale Oktav-Verschiebung (k * 12) zur 100%igen Wahrung der melodischen Kontur & Intervalle
  let globalOctaveShift = 0;
  if (minMidi < hardFloorMidi) {
    const octavesUp = Math.ceil((hardFloorMidi - minMidi) / 12);
    globalOctaveShift = octavesUp * 12;
  } else if (minMidi < minSweetMidi && maxMidi + 12 <= maxSweetMidi + 4) {
    globalOctaveShift = 12;
  } else if (maxMidi > maxSweetMidi + 2) {
    const octavesDown = Math.floor((maxMidi - maxSweetMidi) / 12);
    if (octavesDown > 0 && minMidi - octavesDown * 12 >= hardFloorMidi) {
      globalOctaveShift = -octavesDown * 12;
    } else if (minMidi - 12 >= hardFloorMidi) {
      globalOctaveShift = -12;
    }
  }

  // 2. Einzelnoten-Sicherung falls das Ausgangsmotiv den gesamten Ambitus des Instruments übersteigt
  return notes.map(n => {
    if (!n.pitch || n.pitch === 'REST') return n;
    let shiftedPitch = globalOctaveShift !== 0
      ? transposePitch(n.pitch, globalOctaveShift, preferFlats)
      : n.pitch;
    let midi = getPitchMidi(shiftedPitch);

    while (midi > 0 && midi < hardFloorMidi) {
      shiftedPitch = transposePitch(shiftedPitch, 12, preferFlats);
      midi = getPitchMidi(shiftedPitch);
    }
    while (midi > maxSweetMidi + 4 && midi - 12 >= hardFloorMidi) {
      shiftedPitch = transposePitch(shiftedPitch, -12, preferFlats);
      midi = getPitchMidi(shiftedPitch);
    }

    return shiftedPitch === n.pitch ? n : { ...n, pitch: shiftedPitch };
  });
}

/**
 * Reduziert simultane Blockakkorde für monophone Instrumente (Bläser) auf die oberste Melodiestimme
 */
function collapsePolyphonyForMonophonicInstrument(notes: MicroScoreNote[]): MicroScoreNote[] {
  const bySlot = new Map<string, MicroScoreNote>();
  notes.forEach(n => {
    const key = `${n.barIndex}-${n.beatFraction}`;
    const existing = bySlot.get(key);
    if (!existing) {
      bySlot.set(key, n);
    } else if (n.pitch !== 'REST' && (existing.pitch === 'REST' || getPitchMidi(n.pitch) >= getPitchMidi(existing.pitch))) {
      bySlot.set(key, n);
    }
  });
  return Array.from(bySlot.values());
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

  // Crash auf Beat 1 des ersten Taktes (8tel-Dauer für saubere PAS-Balkung mit Offbeat-Hi-Hat auf 1+)
  if (isFirstBar) {
    notes.push({
      id: `drum-${barIndex}-crash-0`,
      barIndex,
      beatFraction: 0,
      duration: '8',
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
 * 🥁 0,1% Goldstandard 5-Archetypen Drum-Orchestration Engine:
 * Adaptiert JEDEN beliebigen Notenschnipsel (EMP, Tonleiter, Akkord, Technik, Rhythmus, BandPack)
 * in ein didaktisch und musikalisch authentisches PAS-Schlagzeug-Arrangement (Stimme 1: Hände ↑, Stimme 2: Füße ↓).
 */
export function buildCanonicalDrumAdaptation(snippet: MicroScoreSnippet): {
  notes: MicroScoreNote[];
  description: string;
} {
  // 🛡️ Strict Blank-Canvas Axiom: Ein leerer Schnipsel ("Notenschnipsel erstellen") bleibt zu 100% leer!
  const hasSourceNotes = Array.isArray(snippet.notes) && snippet.notes.length > 0;
  const hasSourceChords = Array.isArray(snippet.chords) && snippet.chords.length > 0;
  if (!hasSourceNotes && !hasSourceChords) {
    return {
      notes: [],
      description: ''
    };
  }

  const barsCount = Math.max(1, snippet.barsCount || 2);
  const cat = (snippet.category || '').trim();
  const folder = (snippet.vdmFolder || '').toLowerCase();
  const titleLower = (snippet.title || '').toLowerCase();

  // 1. Walzer / 3/4-Takt -> Kanonischer PAS Walzer-Groove (Kick auf 1, Snare + Hi-Hat auf 2 & 3)
  if (snippet.timeSignature === '3/4') {
    return {
      notes: buildDrumWaltzGroove(barsCount),
      description: 'PAS 3/4 Walzer-Groove: Bass Drum (F4) auf Zählzeit 1, Snare (C5) & Hi-Hat (G5) als Nachschlag auf 2 und 3.'
    };
  }

  // 2. 6/8-Takt -> Kanonischer 6/8 Halftime-Ballad-Groove (Hi-Hat auf den 6 Achteln, Kick auf 1, Snare auf 4)
  if (snippet.timeSignature === '6/8') {
    const notes: MicroScoreNote[] = [];
    for (let b = 0; b < barsCount; b++) {
      [0, 2, 4, 6, 8, 10].forEach(frac => {
        notes.push({
          id: `d68_${b}_hh_${frac}`,
          barIndex: b,
          beatFraction: frac,
          duration: '8',
          pitch: b === 0 && frac === 0 ? 'A5' : 'G5'
        });
      });
      notes.push({ id: `d68_${b}_bd_0`, barIndex: b, beatFraction: 0, duration: '4', isDotted: true, pitch: 'F4' });
      notes.push({ id: `d68_${b}_sd_6`, barIndex: b, beatFraction: 6, duration: '4', isDotted: true, pitch: 'C5' });
    }
    return {
      notes,
      description: 'PAS 6/8 Balladen-Groove: Wiegender Achtel-Puls auf der Hi-Hat (G5), Bass Drum (F4) auf 1 und Snare-Backbeat (C5) auf 4.'
    };
  }

  // Sammle monophone Melodienoten (oberste Stimme pro Zeitschlitz) und MIDI-Ambitus
  const monophonic = collapsePolyphonyForMonophonicInstrument(snippet.notes || []);
  const pitchedNotes = monophonic.filter(n => n.pitch && n.pitch !== 'REST');
  const midis = pitchedNotes.map(n => getPitchMidi(n.pitch)).filter(m => m >= 0);
  const minMidi = midis.length > 0 ? Math.min(...midis) : 60;
  const maxMidi = midis.length > 0 ? Math.max(...midis) : 72;
  const midiSpan = Math.max(1, maxMidi - minMidi);

  // ARCHETYP A: FRÜHERZIEHUNG (EMP) & VOKAL / INTERVALL-DIALOG (z. B. Kuckucksruf, Echo, Dreiton-Ruf, Elefant & Maus)
  if (cat === 'Früherziehung' || cat === 'Vokal' || folder.startsWith('emp-') || folder.startsWith('vokal-') || titleLower.includes('kuckuck')) {
    const notes: MicroScoreNote[] = [];
    const uniqueMidis = Array.from(new Set(midis)).sort((a, b) => a - b);

    monophonic.forEach((n, idx) => {
      if (!n.pitch || n.pitch === 'REST') {
        notes.push({ ...n });
        return;
      }
      const m = getPitchMidi(n.pitch);
      let drumPitch = 'C5'; // Default Snare

      if (uniqueMidis.length === 1) {
        // Reine Sprachrhythmus- oder Ein-Ton-Übung -> Abwechslungsreicher Snare / Kick Dialog
        drumPitch = (n.beatFraction === 0 || n.beatFraction === 8) ? 'C5' : 'E5';
      } else if (uniqueMidis.length === 2) {
        // Zweiton-Ruf (z. B. Kuckucksruf G4 - E4, Elefant & Maus):
        // Höherer Ton -> Snare Drum (C5, klarer heller Ruf), Tieferer Ton -> Floor Tom (A4, warmer tiefer Ruf)
        drumPitch = m === uniqueMidis[uniqueMidis.length - 1] ? 'C5' : 'A4';
      } else if (uniqueMidis.length === 3) {
        // Dreiton-Ruf (z. B. Backe backe Kuchen Mi-Sol-La): Floor Tom (A4), Snare (C5), High Tom (E5)
        const rank = uniqueMidis.indexOf(m);
        drumPitch = rank === 0 ? 'A4' : rank === 1 ? 'C5' : 'E5';
      } else {
        // Fünftonraum / Pentatonik: Konturgetreue Verteilung über Floor Tom -> Mid Tom -> High Tom -> Snare -> Hi-Hat
        const normPos = (m - minMidi) / midiSpan;
        if (normPos <= 0.20) drumPitch = 'A4';      // Floor Tom
        else if (normPos <= 0.45) drumPitch = 'C5'; // Snare Drum
        else if (normPos <= 0.70) drumPitch = 'D5'; // Mid Tom
        else if (normPos <= 0.90) drumPitch = 'E5'; // High Tom
        else drumPitch = 'G5';                      // Hi-Hat
      }

      notes.push({
        ...n,
        id: `emp_h_${idx}`,
        pitch: drumPitch,
        fret: undefined,
        stringIndex: undefined
      });

      // Sanfter Fuß-Erdungspuls (Bass Drum F4) auf Zählzeit 1 jedes Taktes, damit Stimme 2 (Füße ↓) verankert ist
      if (n.beatFraction === 0) {
        const footDur: MicroScoreDuration = (n.duration === '1' || n.duration === '2') ? n.duration : '4';
        notes.push({
          id: `emp_f_${n.barIndex}_0`,
          barIndex: n.barIndex,
          beatFraction: 0,
          duration: footDur,
          pitch: 'F4'
        });
      }
    });

    return {
      notes,
      description: 'PAS Klangfarben-Dialog (Hoch / Tief): Hohe Ruftöne auf Snare & High-Tom (C5/E5), tiefe Antworttöne auf der Standtom (A4) mit Bass-Drum-Puls (F4) auf Schlag 1.'
    };
  }

  // ARCHETYP B: TONLEITERN & PENTATONIK -> Around-the-Kit Tom-Run mit Fuß-Ostinato (Kick & Hi-Hat Foot)
  if (cat === 'Tonleitern' || folder === 'dur' || folder === 'moll' || folder === 'pentatonik' || folder === 'modal' || folder === 'fuenfton') {
    const notes: MicroScoreNote[] = [];
    // Kanonische Kessel-Reihenfolge von tief nach hoch und zurück: Floor Tom (A4), Snare (C5), Mid Tom (D5), High Tom (E5), Ride/Crash (F5/A5)
    const kitVoiceLadder = ['A4', 'C5', 'D5', 'E5', 'F5'];

    monophonic.forEach((n, idx) => {
      if (!n.pitch || n.pitch === 'REST') {
        notes.push({ ...n });
        return;
      }
      const m = getPitchMidi(n.pitch);
      const normPos = (m - minMidi) / midiSpan;
      const ladderIdx = Math.min(kitVoiceLadder.length - 1, Math.max(0, Math.floor(normPos * kitVoiceLadder.length)));
      const isFinalNote = n.barIndex === barsCount - 1 && n.beatFraction >= 8 && n.duration !== '8' && n.duration !== '16';
      const drumPitch = isFinalNote ? 'A5' : kitVoiceLadder[ladderIdx];

      notes.push({
        ...n,
        id: `scale_h_${idx}`,
        pitch: drumPitch,
        fret: undefined,
        stringIndex: undefined
      });
    });

    // Polyphoner Fuß-Puls unter dem Tom-Lauf: Bass Drum (F4) auf 1 & 3, Pedal Hi-Hat (D3) auf 2 & 4
    for (let b = 0; b < barsCount; b++) {
      notes.push({ id: `scale_bd_${b}_0`, barIndex: b, beatFraction: 0, duration: '4', pitch: 'F4' });
      notes.push({ id: `scale_hhf_${b}_4`, barIndex: b, beatFraction: 4, duration: '4', pitch: 'D3' });
      notes.push({ id: `scale_bd_${b}_8`, barIndex: b, beatFraction: 8, duration: '4', pitch: 'F4' });
      if (b < barsCount - 1) {
        notes.push({ id: `scale_hhf_${b}_12`, barIndex: b, beatFraction: 12, duration: '4', pitch: 'D3' });
      }
    }

    return {
      notes,
      description: 'PAS Around-the-Kit Tom-Workout: Konturgetreuer Kessel-Lauf über Standtom (A4), Snare (C5), Mid-Tom (D5) und High-Tom (E5) über konstantem Fuß-Ostinato (Kick F4 & Pedal-Hi-Hat D3).'
    };
  }

  // ARCHETYP C: AKKORDE, KADENZEN, ZUPFINSTRUMENTE & BAND-PACKS -> Stilistischer PAS Band-Groove
  const isChordOrBand =
    cat === 'Akkorde' ||
    cat === 'Zupfinstrumente' ||
    cat === 'BandPacks' ||
    folder.includes('kadenzen') ||
    folder.includes('dreiklaenge') ||
    folder.includes('akkord') ||
    folder.includes('alberti');

  if (isChordOrBand) {
    // Spezialfall Jazz-Kadenz (II-V-I) oder Walking Bass -> Jazz Ride-Pattern mit Hi-Hat auf 2 & 4
    if (folder.includes('jazz') || titleLower.includes('jazz') || titleLower.includes('walking')) {
      const notes: MicroScoreNote[] = [];
      for (let b = 0; b < barsCount; b++) {
        [0, 4, 6, 8, 12, 14].forEach(frac => {
          notes.push({
            id: `jazz_${b}_ride_${frac}`,
            barIndex: b,
            beatFraction: frac,
            duration: (frac === 0 || frac === 8) ? '4' : '8',
            pitch: 'F5' // Ride Cymbal
          });
        });
        notes.push({ id: `jazz_${b}_bd_0`, barIndex: b, beatFraction: 0, duration: '4', pitch: 'F4' });
        notes.push({ id: `jazz_${b}_hhf_4`, barIndex: b, beatFraction: 4, duration: '4', pitch: 'D3' });
        notes.push({ id: `jazz_${b}_hhf_12`, barIndex: b, beatFraction: 12, duration: '4', pitch: 'D3' });
      }
      return {
        notes,
        description: 'PAS Jazz-Swing Ride-Pattern: Ride-Becken (F5) mit klassischer Swing-Figur und getretener Hi-Hat (D3) auf Zählzeit 2 und 4.'
      };
    }

    // Spezialfall Synkopische Stabs / Calypso / Arpeggio: Rhythmus-Kontur mit Backbeat veredeln
    if (folder.includes('arpeggio') || titleLower.includes('calypso') || titleLower.includes('funk')) {
      const notes: MicroScoreNote[] = [];
      for (let b = 0; b < barsCount; b++) {
        // Hi-Hat Achtel-Teppich
        [0, 2, 4, 6, 8, 10, 12, 14].forEach(frac => {
          notes.push({
            id: ` sync_${b}_hh_${frac}`,
            barIndex: b,
            beatFraction: frac,
            duration: '8',
            pitch: b === 0 && frac === 0 ? 'A5' : 'G5'
          });
        });
        // Kick auf 1 und synkopisch auf 2+ (frac 6) & 3 (frac 8)
        notes.push({ id: `sync_${b}_bd_0`, barIndex: b, beatFraction: 0, duration: '4', pitch: 'F4' });
        notes.push({ id: `sync_${b}_sd_4`, barIndex: b, beatFraction: 4, duration: '4', pitch: 'C5' });
        notes.push({ id: `sync_${b}_bd_6`, barIndex: b, beatFraction: 6, duration: '8', pitch: 'F4' });
        notes.push({ id: `sync_${b}_bd_10`, barIndex: b, beatFraction: 10, duration: '8', pitch: 'F4' });
        notes.push({ id: `sync_${b}_sd_12`, barIndex: b, beatFraction: 12, duration: '4', pitch: 'C5' });
      }
      return {
        notes,
        description: 'PAS Groove-Begleitung: Synkopierte Bass-Drum (F4) passend zum Anschlagsmuster mit klarem Snare-Backbeat (C5) auf 2 und 4.'
      };
    }

    // Standard Akkord-/Kadenz-Übung -> Voller PAS Rock/Pop-Groove über alle Takte
    const grooveNotes: MicroScoreNote[] = [];
    for (let b = 0; b < barsCount; b++) {
      grooveNotes.push(...buildDrumGrooveForChord(b, b === 0));
    }
    return {
      notes: grooveNotes,
      description: 'PAS Band-Groove zur Harmoniebegleitung: Crash-Akzent (A5) auf Takt 1, durchgehende Achtel-Hi-Hat (G5), Bass Drum (F4) auf 1 & 3 sowie Snare-Backbeat (C5) auf 2 & 4.'
    };
  }

  // ARCHETYP D: TECHNIK, WARM-UPS & FINGER-FITNESS -> PAS Rudiment & Stick-Control Workout
  if (cat === 'Technik') {
    const notes: MicroScoreNote[] = [];
    monophonic.forEach((n, idx) => {
      if (!n.pitch || n.pitch === 'REST') {
        notes.push({ ...n });
        return;
      }
      // Wechselspiel zwischen Snare (C5) und Toms (E5 / D5 / A4) je nach Taktposition
      let drumPitch = 'C5';
      if (n.beatFraction >= 12) drumPitch = 'A4';
      else if (n.beatFraction >= 8) drumPitch = 'D5';
      else if (n.beatFraction >= 4) drumPitch = 'E5';

      notes.push({
        ...n,
        id: `tech_h_${idx}`,
        pitch: drumPitch,
        fret: undefined,
        stringIndex: undefined
      });
    });

    for (let b = 0; b < barsCount; b++) {
      notes.push({ id: `tech_bd_${b}_0`, barIndex: b, beatFraction: 0, duration: '4', pitch: 'F4' });
      notes.push({ id: `tech_bd_${b}_8`, barIndex: b, beatFraction: 8, duration: '4', pitch: 'F4' });
    }

    return {
      notes,
      description: 'PAS Stick-Control & Rudiment-Workout: Präzises Hand-zu-Hand-Training (R-L) im Wechsel über Snare (C5), High-Tom (E5), Mid-Tom (D5) und Floor-Tom (A4) über ruhigem Kick-Puls (F4).'
    };
  }

  // ARCHETYP E: RHYTHMUS-DRILLS, SYNKOPEN & TRIOLEN -> Exakte Snare/Tom-Rhythmik über Kick-Grundpuls
  const rhythmNotes: MicroScoreNote[] = [];
  const barHasFeet = new Set<string>();

  monophonic.forEach((n, idx) => {
    if (!n.pitch || n.pitch === 'REST') {
      rhythmNotes.push({ ...n });
      return;
    }
    const mapped = mapMelodicPitchToDrum(n.pitch, n.beatFraction, n.barIndex);
    // In Rhythmus-Drills sollen die geschriebenen Noten primär in der Hand-Stimme (Snare C5 / Tom E5) liegen,
    // damit der Fuß unabhängig den Grundpuls auf 1 und 3 hält
    const handPitch = (mapped === 'F4' || mapped === 'D3') ? 'C5' : mapped;
    rhythmNotes.push({
      ...n,
      id: `rhy_h_${idx}`,
      pitch: handPitch,
      fret: undefined,
      stringIndex: undefined
    });
  });

  for (let b = 0; b < barsCount; b++) {
    [0, 8].forEach(beatFrac => {
      const slotKey = `${b}-${beatFrac}`;
      const hasRestHere = monophonic.some(n => n.barIndex === b && Math.abs(n.beatFraction - beatFrac) < 0.5 && n.pitch === 'REST');
      // Wenn auf Beat 0 bereits eine Ganze Note ('1') liegt, darf auf Beat 8 kein zweiter Kick gesetzt werden
      const coveredByWholeNote = beatFrac === 8 && monophonic.some(n => n.barIndex === b && n.beatFraction === 0 && n.duration === '1');
      if (!hasRestHere && !coveredByWholeNote && !barHasFeet.has(slotKey)) {
        barHasFeet.add(slotKey);
        const handNoteHere = monophonic.find(n => n.barIndex === b && Math.abs(n.beatFraction - beatFrac) < 0.5 && n.pitch && n.pitch !== 'REST');
        const footDur: MicroScoreDuration = (handNoteHere && (handNoteHere.duration === '2' || handNoteHere.duration === '1'))
          ? handNoteHere.duration
          : '4';
        rhythmNotes.push({
          id: `rhy_bd_${b}_${beatFrac}`,
          barIndex: b,
          beatFraction: beatFrac,
          duration: footDur,
          isDotted: handNoteHere?.duration === '2' ? handNoteHere.isDotted : undefined,
          pitch: 'F4'
        });
      }
    });
  }

  return {
    notes: rhythmNotes,
    description: 'PAS Rhythmus- & Timing-Training: Exakte Rhythmusfigur auf Snare & Toms (Stimme 1 ↑) gestützt von der Bass Drum (F4, Stimme 2 ↓) auf den Schwerpunkten.'
  };
}

/**
 * Die Hauptfunktion: Projiziert ein beliebiges Notenschnipsel verlustfrei auf das Zielinstrument
 * inklusive physikalisch korrekter Notenschlüssel-Governance (Violin-, Bass- & Percussion-Clef)
 * und instrumentenspezifischer Ambitus-Sicherung (Blockflöte >= C4, Streicher >= G3, Gitarre >= E3).
 */
export function resolveSnippetForInstrument(
  snippet: MicroScoreSnippet,
  targetInstrument: MicroScoreInstrument | string
): MicroScoreSnippet {
  const normTarget = normalizeInstrumentToKey(targetInstrument);

  // 1. Wenn explizite statische Projektion vorhanden ist, hat diese IMMER höchste Priorität!
  if (snippet.projections && snippet.projections[normTarget]) {
    const proj = snippet.projections[normTarget]!;
    let projNotes = proj.notes;
    if (normTarget === 'guitar' || normTarget === 'bass' || normTarget === 'ukulele' || normTarget === 'strings') {
      projNotes = projNotes.map(n => {
        if (n.pitch && n.pitch !== 'REST' && n.fret !== undefined && n.stringIndex !== undefined) {
          const expectedPitch = fretAndStringToPitch(n.stringIndex, n.fret, normTarget);
          if (expectedPitch && expectedPitch !== n.pitch) {
            return { ...n, pitch: expectedPitch };
          }
        }
        return n;
      });
    }
    return {
      ...snippet,
      instrument: normTarget,
      notes: projNotes,
      chords: proj.chords || snippet.chords,
      displayMode: proj.displayMode || (normTarget === 'guitar' || normTarget === 'bass' || normTarget === 'ukulele' ? 'both' : 'notes'),
      clef: proj.clef || (normTarget === 'bass' || normTarget === 'trombone' ? 'bass' : (normTarget === 'drums' ? 'percussion' : 'treble')),
      description: proj.description || snippet.description
    };
  }

  // 2. Wenn Ziel 'universal' ist, bestehendes spezifisches Instrument unverändert beibehalten
  if (normTarget === 'universal' && snippet.instrument && snippet.instrument !== 'universal') {
    return snippet;
  }

  // 3. Wenn bereits exakt passend
  if (snippet.instrument === normTarget) {
    const defaultClef = (normTarget === 'bass' || normTarget === 'trombone') ? 'bass' : (normTarget === 'drums' ? 'percussion' : 'treble');
    const clef = snippet.clef || defaultClef;
    if (normTarget === 'guitar' || normTarget === 'bass' || normTarget === 'ukulele' || normTarget === 'strings') {
      const reconciledNotes = snippet.notes.map(n => {
        if (n.pitch && n.pitch !== 'REST' && n.fret !== undefined && n.stringIndex !== undefined) {
          const expectedPitch = fretAndStringToPitch(n.stringIndex, n.fret, normTarget);
          if (expectedPitch && expectedPitch !== n.pitch) {
            return { ...n, pitch: expectedPitch };
          }
        }
        return n;
      });
      return {
        ...snippet,
        clef,
        notes: reconciledNotes
      };
    }
    return { ...snippet, clef };
  }

  // 🛡️ 4. Strict Blank-Canvas Axiom: Wenn der Schnipsel komplett leer ist (0 Noten & 0 Akkorde),
  // wechsle bei Instrumentenwechsel ausschließlich Schlüssel & Anzeige-Modus, ohne Noten zu halluzinieren!
  if ((!snippet.notes || snippet.notes.length === 0) && (!snippet.chords || snippet.chords.length === 0)) {
    const targetInst = normTarget === 'universal' ? 'piano' : normTarget;
    const targetClef = (targetInst === 'bass' || targetInst === 'trombone')
      ? 'bass'
      : (targetInst === 'drums' ? 'percussion' : 'treble');
    const targetDisplayMode = (targetInst === 'guitar' || targetInst === 'bass' || targetInst === 'ukulele')
      ? 'both'
      : 'notes';
    return {
      ...snippet,
      instrument: targetInst,
      clef: targetClef,
      displayMode: targetDisplayMode,
      notes: []
    };
  }

  // --- DYNAMISCHE 0,1% PROJEKTION ---

  // 1. GITARRE (Treble Clef 8vb, 1. Lage Open Chords & TAB, Boden: E3 notiert = E2 klingend)
  if (normTarget === 'guitar') {
    const isPureChordSnippet = snippet.category === 'Akkorde' && (!snippet.notes || snippet.notes.length <= 4);
    let projectedNotes: MicroScoreNote[] = [];

    if (isPureChordSnippet && snippet.chords && snippet.chords.length > 0) {
      snippet.chords.forEach(c => {
        [0, 4, 8, 12].forEach(beat => {
          const chordNotes = buildGuitarChordNotes(c.chordName, c.barIndex, beat, '4');
          projectedNotes.push(...chordNotes);
        });
      });
    } else if (snippet.chords && snippet.chords.length > 0 && snippet.notes && snippet.notes.length > 0 && snippet.category !== 'Zupfinstrumente') {
      // 0,1% Rhythmus-Erhalt: Übertrage authentische Synkopen / Stabs (z. B. Funk Drive) auf Gitarren-Akkorde
      const beats = new Map<string, { barIndex: number; beatFraction: number; duration: MicroScoreDuration }>();
      snippet.notes.forEach(n => {
        const key = `${n.barIndex}-${n.beatFraction}`;
        if (!beats.has(key)) {
          beats.set(key, { barIndex: n.barIndex, beatFraction: n.beatFraction, duration: n.duration });
        }
      });
      beats.forEach(({ barIndex, beatFraction, duration }) => {
        const chord = snippet.chords?.find(c => c.barIndex === barIndex) || snippet.chords?.[0];
        if (chord) {
          const cNotes = buildGuitarChordNotes(chord.chordName, barIndex, beatFraction, duration);
          projectedNotes.push(...cNotes);
        }
      });
    } else {
      const clamped = clampNotesToInstrumentAmbitus(snippet.notes, 55, 81, 52); // E3 (52) bis A5 (81)
      projectedNotes = clamped.map(n => {
        if (n.pitch && n.pitch !== 'REST') {
          const tab = pitchToBestFretAndString(n.pitch, undefined, false);
          const reconciledPitch = tab ? fretAndStringToPitch(tab.stringIndex, tab.fret, 'guitar') : n.pitch;
          return {
            ...n,
            pitch: reconciledPitch,
            fret: tab ? tab.fret : n.fret,
            stringIndex: tab ? tab.stringIndex : n.stringIndex
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

  // 1b. UKULELE (Treble Clef C-klingend, G4-C4-E4-A4 4-Saiten-TAB)
  if (normTarget === 'ukulele') {
    const clamped = clampNotesToInstrumentAmbitus(snippet.notes, 60, 81, 60); // C4 (60) bis A5 (81)
    const projectedNotes = clamped.map(n => {
      if (n.pitch && n.pitch !== 'REST') {
        const tab = pitchToBestFretAndString(n.pitch, undefined, 'ukulele');
        const reconciledPitch = tab ? fretAndStringToPitch(tab.stringIndex, tab.fret, 'ukulele') : n.pitch;
        return {
          ...n,
          pitch: reconciledPitch,
          fret: tab ? tab.fret : n.fret,
          stringIndex: tab ? tab.stringIndex : n.stringIndex
        };
      }
      return n;
    });

    return {
      ...snippet,
      instrument: 'ukulele',
      displayMode: 'both',
      clef: 'treble',
      notes: projectedNotes
    };
  }

  // 2. E-BASS (Bass Clef 8vb, notiert E2-G4 = klingend E1-G3 & 4-Saiten-TAB)
  if (normTarget === 'bass') {
    const isChordSnippet = snippet.category === 'Akkorde' || (snippet.chords && snippet.chords.length > 0 && snippet.notes.length > 8);
    let projectedNotes: MicroScoreNote[] = [];

    if (isChordSnippet && snippet.chords && snippet.chords.length > 0) {
      snippet.chords.forEach(c => {
        const bassNotes = buildBassNotesForChord(c.chordName, c.barIndex);
        projectedNotes.push(...bassNotes);
      });
    } else {
      const monophonic = collapsePolyphonyForMonophonicInstrument(snippet.notes);
      const transposedDown = monophonic.map(n =>
        n.pitch && n.pitch !== 'REST' ? { ...n, pitch: transposePitch(n.pitch, -12) } : n
      );
      const clamped = clampNotesToInstrumentAmbitus(transposedDown, 43, 62, 40); // E2 (40) bis D4 (62)
      projectedNotes = clamped.map(n => {
        if (n.pitch && n.pitch !== 'REST') {
          const tab = pitchToBestFretAndString(n.pitch, undefined, true);
          const reconciledPitch = tab ? fretAndStringToPitch(Math.min(tab.stringIndex, 3), tab.fret, 'bass') : n.pitch;
          return {
            ...n,
            pitch: reconciledPitch,
            fret: tab?.fret,
            stringIndex: tab ? Math.min(tab.stringIndex, 3) : 0
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

  // 2b. STREICHER / VIOLINE (Treble Clef, 1. Lage G3..B5, Reines Notensystem!)
  if (normTarget === 'strings') {
    const clamped = clampNotesToInstrumentAmbitus(snippet.notes, 55, 81, 55); // G3 (55, leere G-Saite) bis A5 (81)
    const projectedNotes = clamped.map(n => {
      if (n.pitch && n.pitch !== 'REST') {
        const tab = pitchToBestFretAndString(n.pitch, undefined, 'strings');
        const reconciledPitch = tab ? fretAndStringToPitch(tab.stringIndex, tab.fret, 'strings') : n.pitch;
        return {
          ...n,
          pitch: reconciledPitch,
          fret: tab ? tab.fret : n.fret,
          stringIndex: tab ? tab.stringIndex : n.stringIndex
        };
      }
      return n;
    });

    return {
      ...snippet,
      instrument: 'strings',
      displayMode: 'notes',
      clef: 'treble',
      notes: projectedNotes
    };
  }

  // 2c. BLOCKFLÖTE (Sopran in C: Physikalischer Boden C4 = MIDI 60, Sweet-Spot D4..G5 = MIDI 62..79)
  if (normTarget === 'recorder') {
    const isChordSnippet = snippet.category === 'Akkorde' || (snippet.chords && snippet.chords.length > 0 && snippet.notes.length > 8);
    let projectedNotes: MicroScoreNote[] = [];

    if (isChordSnippet && snippet.chords && snippet.chords.length > 0) {
      snippet.chords.forEach(c => {
        const arpeggio = buildWindArpeggioForChord(c.chordName, c.barIndex, 0);
        projectedNotes.push(...arpeggio);
      });
      projectedNotes = clampNotesToInstrumentAmbitus(projectedNotes, 62, 79, 60);
    } else {
      const monophonic = collapsePolyphonyForMonophonicInstrument(snippet.notes);
      projectedNotes = clampNotesToInstrumentAmbitus(monophonic, 62, 79, 60);
    }

    return {
      ...snippet,
      instrument: 'recorder',
      displayMode: 'notes',
      clef: 'treble',
      notes: projectedNotes
    };
  }

  // 2d. QUERFLÖTE (C-Konzertflöte: Physikalischer Boden C4 = MIDI 60, Sweet-Spot D4..D6 = MIDI 62..86)
  if (normTarget === 'flute') {
    const isChordSnippet = snippet.category === 'Akkorde' || (snippet.chords && snippet.chords.length > 0 && snippet.notes.length > 8);
    let projectedNotes: MicroScoreNote[] = [];

    if (isChordSnippet && snippet.chords && snippet.chords.length > 0) {
      snippet.chords.forEach(c => {
        const arpeggio = buildWindArpeggioForChord(c.chordName, c.barIndex, 0);
        projectedNotes.push(...arpeggio);
      });
      projectedNotes = clampNotesToInstrumentAmbitus(projectedNotes, 62, 86, 60);
    } else {
      const monophonic = collapsePolyphonyForMonophonicInstrument(snippet.notes);
      projectedNotes = clampNotesToInstrumentAmbitus(monophonic, 62, 86, 60);
    }

    return {
      ...snippet,
      instrument: 'flute',
      displayMode: 'notes',
      clef: 'treble',
      notes: projectedNotes
    };
  }

  // 2e. GESANG / VOCALS (Klingend C, Ambitus C4..A5 = MIDI 60..81, Monophone Gesangslinie)
  if (normTarget === 'vocals') {
    const isChordSnippet = snippet.category === 'Akkorde' || (snippet.chords && snippet.chords.length > 0 && snippet.notes.length > 8);
    let projectedNotes: MicroScoreNote[] = [];

    if (isChordSnippet && snippet.chords && snippet.chords.length > 0) {
      snippet.chords.forEach(c => {
        const arpeggio = buildWindArpeggioForChord(c.chordName, c.barIndex, 0);
        projectedNotes.push(...arpeggio);
      });
      projectedNotes = clampNotesToInstrumentAmbitus(projectedNotes, 60, 81, 60);
    } else {
      const monophonic = collapsePolyphonyForMonophonicInstrument(snippet.notes);
      projectedNotes = clampNotesToInstrumentAmbitus(monophonic, 60, 81, 60);
    }

    return {
      ...snippet,
      instrument: 'vocals',
      displayMode: 'notes',
      clef: 'treble',
      notes: projectedNotes
    };
  }

  // 3. POSAUNE (Bass Clef, Tiefblech: Bb2..F4 = MIDI 46..65)
  if (normTarget === 'trombone') {
    const isChordSnippet = snippet.category === 'Akkorde' || (snippet.chords && snippet.chords.length > 0 && snippet.notes.length > 8);
    let projectedNotes: MicroScoreNote[] = [];

    if (isChordSnippet && snippet.chords && snippet.chords.length > 0) {
      snippet.chords.forEach(c => {
        const arpeggio = buildWindArpeggioForChord(c.chordName, c.barIndex, -12);
        projectedNotes.push(...arpeggio);
      });
    } else {
      const monophonic = collapsePolyphonyForMonophonicInstrument(snippet.notes);
      projectedNotes = monophonic.map(n => ({
        ...n,
        pitch: transposePitch(n.pitch, -12, true)
      }));
    }
    projectedNotes = clampNotesToInstrumentAmbitus(projectedNotes, 46, 65, 41, true);

    return {
      ...snippet,
      instrument: 'trombone',
      displayMode: 'notes',
      clef: 'bass',
      notes: projectedNotes
    };
  }

  // 4. BLÄSER: ALTSAXOPHON (Treble Clef, Eb: Smart +9 oder -3 Halbtöne im Sweet-Spot C4..A5 = MIDI 60..81)
  if (normTarget === 'altosax') {
    const isChordSnippet = snippet.category === 'Akkorde' || (snippet.chords && snippet.chords.length > 0 && snippet.notes.length > 8);
    let projectedNotes: MicroScoreNote[] = [];

    if (isChordSnippet && snippet.chords && snippet.chords.length > 0) {
      snippet.chords.forEach(c => {
        const arpeggio = buildWindArpeggioForChord(c.chordName, c.barIndex, -3);
        projectedNotes.push(...arpeggio);
      });
    } else {
      const monophonic = collapsePolyphonyForMonophonicInstrument(snippet.notes);
      const maxOrigMidi = Math.max(...monophonic.filter(n => n.pitch && n.pitch !== 'REST').map(n => getPitchMidi(n.pitch)), 60);
      // Verhindert Ausbrechen in das Altissimo-Register (> A5) bei hohen Ausgangsmelodien
      const semiShift = maxOrigMidi + 9 > 81 ? -3 : 9;
      projectedNotes = monophonic.map(n => ({
        ...n,
        pitch: transposePitch(n.pitch, semiShift, false)
      }));
    }
    projectedNotes = clampNotesToInstrumentAmbitus(projectedNotes, 60, 81, 58);

    return {
      ...snippet,
      instrument: 'altosax',
      displayMode: 'notes',
      clef: 'treble',
      notes: projectedNotes
    };
  }

  // 5. BLÄSER: TROMPETE / KLARINETTE (Treble Clef, Bb: +2 Halbtöne im Sweet-Spot C4..G5 = MIDI 60..79)
  if (normTarget === 'trumpet' || normTarget === 'clarinet') {
    const isChordSnippet = snippet.category === 'Akkorde' || (snippet.chords && snippet.chords.length > 0 && snippet.notes.length > 8);
    let projectedNotes: MicroScoreNote[] = [];

    if (isChordSnippet && snippet.chords && snippet.chords.length > 0) {
      snippet.chords.forEach(c => {
        const arpeggio = buildWindArpeggioForChord(c.chordName, c.barIndex, 2);
        projectedNotes.push(...arpeggio);
      });
    } else {
      const monophonic = collapsePolyphonyForMonophonicInstrument(snippet.notes);
      projectedNotes = monophonic.map(n => ({
        ...n,
        pitch: transposePitch(n.pitch, 2, false)
      }));
    }
    const maxSweet = normTarget === 'trumpet' ? 79 : 84; // Trompete bis G5 (79), Klarinette bis C6 (84)
    projectedNotes = clampNotesToInstrumentAmbitus(projectedNotes, 60, maxSweet, 55);

    return {
      ...snippet,
      instrument: normTarget,
      displayMode: 'notes',
      clef: 'treble',
      notes: projectedNotes
    };
  }

  // 6. SCHLAGZEUG (Percussion Clef, PAS Standard & 5-Archetypen Drum-Orchestration Engine)
  if (normTarget === 'drums') {
    if (snippet.clef === 'percussion' || snippet.instrument === 'drums' || (snippet.id && snippet.id.includes('drum'))) {
      return {
        ...snippet,
        instrument: 'drums',
        clef: 'percussion',
        displayMode: 'notes'
      };
    }

    const adaptation = buildCanonicalDrumAdaptation(snippet);

    return {
      ...snippet,
      instrument: 'drums',
      displayMode: 'notes',
      clef: 'percussion',
      description: adaptation.description,
      notes: adaptation.notes
    };
  }

  // 7. KLAVIER / STANDARD (C Klingend)
  return {
    ...snippet,
    instrument: normTarget === 'universal' ? 'piano' : normTarget,
    displayMode: 'notes',
    clef: snippet.clef || 'treble'
  };
}

/**
 * 🏛️ 0,1% Goldstandard: Dynamisches Arrangement-Badge
 * Ermittelt eine didaktisch präzise Besetzungs-Bezeichnung für den UI-Header
 */
export function getSnippetArrangementLabel(snippet: MicroScoreSnippet, activeInstrument: string): string {
  const norm = normalizeInstrumentToKey(activeInstrument);
  const origNorm = normalizeInstrumentToKey(snippet.instrument || 'universal');

  if (norm === 'drums') {
    const cat = (snippet.category || '').trim();
    const folder = (snippet.vdmFolder || '').toLowerCase();
    const titleLower = (snippet.title || '').toLowerCase();
    if (snippet.timeSignature === '3/4') return 'PAS 3/4 Walzer-Groove';
    if (snippet.timeSignature === '6/8') return 'PAS 6/8 Ballad-Groove';
    if (cat === 'Früherziehung' || cat === 'Vokal' || folder.startsWith('emp-') || titleLower.includes('kuckuck')) {
      return 'PAS Klangfarben-Dialog (Snare / Standtom)';
    }
    if (cat === 'Tonleitern' || folder === 'dur' || folder === 'moll' || folder === 'pentatonik' || folder === 'modal') {
      return 'PAS Around-the-Kit Tom-Run';
    }
    if (cat === 'Technik') {
      return 'PAS Stick-Control & Rudiments';
    }
    if (cat === 'Akkorde' || cat === 'Zupfinstrumente' || cat === 'BandPacks') {
      return 'PAS Band-Begleit-Groove';
    }
    return 'Drum-Groove (PAS-Standard)';
  }

  if (origNorm === norm && norm !== 'universal') {
    if (norm === 'recorder') return 'Blockflöten-Fassung (C4–G5)';
    if (norm === 'ukulele') return 'Ukulele-Fassung (4-Saiten TAB G-C-E-A)';
    if (norm === 'guitar') return 'Gitarren-Fassung (6-Saiten TAB)';
    if (norm === 'bass') return 'E-Bass (4-Saiten TAB & Bassschlüssel)';
    if (norm === 'strings') return 'Streicher-Fassung (Notensystem)';
    if (norm === 'flute') return 'Querflöte (D4–C6)';
    if (norm === 'altosax') return 'Altsaxophon in Eb';
    if (norm === 'trumpet') return 'Trompete in Bb';
    if (norm === 'trombone') return 'Posaune (Bassschlüssel)';
    if (norm === 'vocals') return 'Gesangs-Fassung (Melodie & Phrasierung)';
    return 'Original-Fassung';
  }

  const instNames: Record<string, string> = {
    piano: 'Klavier-Satz (Harmonien & Noten)',
    ukulele: 'Ukulele-Arrangement (4-Saiten TAB G-C-E-A)',
    guitar: 'Gitarren-Arrangement (Open Chords & TAB)',
    bass: 'E-Bass Begleitung (4-Saiten TAB & Bassschlüssel)',
    drums: 'Schlagzeug-Groove (PAS-Standard)',
    recorder: 'Blockflöte (Sopran C4–G5)',
    flute: 'Querflöte (D4–C6)',
    strings: 'Streicher / Violine (Notensystem)',
    vocals: 'Gesangs-Fassung (Vokale Phrasierung C4–A5)',
    altosax: 'Altsaxophon (in Eb)',
    trumpet: 'Trompete (in Bb)',
    trombone: 'Posaune (Bassschlüssel)'
  };
  return instNames[norm] || `Arrangement für ${activeInstrument}`;
}

