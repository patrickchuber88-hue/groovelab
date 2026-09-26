/**
 * 🎼 Campus-Groovelab World Tour Instrument Transposer (2027 Goldstandard)
 * 
 * Deterministic projection of Master Notes (Concert Pitch C) to the student's instrument.
 * Strictly scopes sheet music to only the instrument enrolled by the student (Zero Clutter).
 * Mathematically and ergonomically validated for Guitar, Bass, Ukulele, Piano, Brass, Strings & Drums.
 */

import { WorldTourMasterScore, WorldTourNote } from '../types/worldTour';

export type InstrumentFamily = 
  | 'guitar' 
  | 'piano' 
  | 'bass' 
  | 'ukulele' 
  | 'drums' 
  | 'brass_bb' 
  | 'brass_eb' 
  | 'strings_treble' 
  | 'strings_bass' 
  | 'general';

export interface TransposedScoreResult {
  family: InstrumentFamily;
  displayName: string;
  clef: 'treble' | 'bass' | 'drums';
  transpositionLabel: string;
  hasTablature: boolean;
  stringsCount?: number;
  notes: Array<WorldTourNote & {
    displayPitch: string;
    displayFret?: number;
    displayString?: number;
    drumType?: 'kick' | 'snare' | 'hihat' | 'tom' | 'clap' | 'rest';
  }>;
}

// Semitone mapping for transposition
const NOTE_SEMITONES: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
  'A#': 10, 'Bb': 10, 'B': 11
};

const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Transposes a note string (e.g. 'G4') by a number of semitones, respecting tonal direction.
 */
export function transposePitch(pitch: string, semitones: number, preferFlats: boolean = false): string {
  if (!pitch || pitch === 'REST') return 'REST';

  const match = pitch.match(/^([A-G][#b]?)([0-9])$/);
  if (!match) return pitch;

  const noteName = match[1];
  const octave = parseInt(match[2], 10);
  const noteIndex = NOTE_SEMITONES[noteName];
  if (noteIndex === undefined) return pitch;

  const totalSemitones = octave * 12 + noteIndex + semitones;
  const newOctave = Math.floor(totalSemitones / 12);
  const newSemitoneIndex = ((totalSemitones % 12) + 12) % 12;
  const scale = preferFlats ? FLAT_NOTES : SHARP_NOTES;
  const newNoteName = scale[newSemitoneIndex];

  return `${newNoteName}${newOctave}`;
}

/**
 * Resolves guitar fret and string for standard tuning (E4, B3, G3, D3, A2, E2).
 */
export function calculateGuitarFretAndString(pitch: string): { fret: number; stringIndex: number } {
  if (pitch === 'REST') return { fret: 0, stringIndex: 0 };
  
  // Standard guitar string base pitches in semitones (octave * 12 + noteVal)
  const guitarStrings = [
    { name: 'E4', base: 64 }, // index 0 (high E)
    { name: 'B3', base: 59 }, // index 1
    { name: 'G3', base: 55 }, // index 2
    { name: 'D3', base: 50 }, // index 3
    { name: 'A2', base: 45 }, // index 4
    { name: 'E2', base: 40 }  // index 5 (low E)
  ];

  const match = pitch.match(/^([A-G][#b]?)([0-9])$/);
  if (!match) return { fret: 0, stringIndex: 0 };
  const noteVal = NOTE_SEMITONES[match[1]] ?? 0;
  const octave = parseInt(match[2], 10);
  const targetSemi = octave * 12 + noteVal;

  // Find lowest fret on most ergonomic string
  for (let s = 0; s < guitarStrings.length; s++) {
    const diff = targetSemi - guitarStrings[s].base;
    if (diff >= 0 && diff <= 14) {
      return { fret: diff, stringIndex: s };
    }
  }

  return { fret: 0, stringIndex: 0 };
}

/**
 * Resolves E-Bass fret and string for standard 4-string tuning (G2, D2, A1, E1).
 * Completely replaces legacy '% 7' modulo hack with real ergonomic bass fretboard math.
 */
export function calculateBassFretAndString(pitch: string): { fret: number; stringIndex: number } {
  if (pitch === 'REST') return { fret: 0, stringIndex: 0 };

  const bassStrings = [
    { name: 'G2', base: 43 }, // index 0 (G string)
    { name: 'D2', base: 38 }, // index 1 (D string)
    { name: 'A1', base: 33 }, // index 2 (A string)
    { name: 'E1', base: 28 }  // index 3 (low E string)
  ];

  const match = pitch.match(/^([A-G][#b]?)([0-9])$/);
  if (!match) return { fret: 0, stringIndex: 0 };
  const noteVal = NOTE_SEMITONES[match[1]] ?? 0;
  const octave = parseInt(match[2], 10);
  const targetSemi = octave * 12 + noteVal;

  // Look for the most natural position (frets 0 to 14)
  for (let s = 0; s < bassStrings.length; s++) {
    const diff = targetSemi - bassStrings[s].base;
    if (diff >= 0 && diff <= 14) {
      return { fret: diff, stringIndex: s };
    }
  }

  // Fallback: If note is higher, clamp to top string with actual fret
  const topDiff = targetSemi - bassStrings[0].base;
  if (topDiff > 14) {
    return { fret: Math.min(20, topDiff), stringIndex: 0 };
  }

  return { fret: 0, stringIndex: 3 };
}

/**
 * Resolves Ukulele fret and string for standard G-C-E-A tuning.
 * Completely replaces legacy '% 5' modulo hack.
 */
export function calculateUkuleleFretAndString(pitch: string): { fret: number; stringIndex: number } {
  if (pitch === 'REST') return { fret: 0, stringIndex: 0 };

  // Standard Ukulele strings: 1st=A4 (69), 2nd=E4 (64), 3rd=C4 (60), 4th=G4 (67)
  const ukeStrings = [
    { name: 'A4', base: 69 }, // index 0 (1st string)
    { name: 'E4', base: 64 }, // index 1 (2nd string)
    { name: 'C4', base: 60 }, // index 2 (3rd string)
    { name: 'G4', base: 67 }  // index 3 (4th string)
  ];

  const match = pitch.match(/^([A-G][#b]?)([0-9])$/);
  if (!match) return { fret: 0, stringIndex: 0 };
  const noteVal = NOTE_SEMITONES[match[1]] ?? 0;
  const octave = parseInt(match[2], 10);
  const targetSemi = octave * 12 + noteVal;

  for (let s = 0; s < ukeStrings.length; s++) {
    const diff = targetSemi - ukeStrings[s].base;
    if (diff >= 0 && diff <= 12) {
      return { fret: diff, stringIndex: s };
    }
  }

  return { fret: 0, stringIndex: 0 };
}

/**
 * Resolves instrument family from raw instrument string.
 */
export function resolveInstrumentFamily(rawInstrument?: string | null): InstrumentFamily {
  if (!rawInstrument) return 'piano';
  const clean = rawInstrument.toLowerCase().trim();

  if (clean.includes('gitar') || clean.includes('guitar')) return 'guitar';
  if (clean.includes('bass')) return 'bass';
  if (clean.includes('ukule')) return 'ukulele';
  if (clean.includes('schlagzeug') || clean.includes('drum') || clean.includes('cajon') || clean.includes('percussion') || clean.includes('djembe')) return 'drums';
  if (clean.includes('trompet') || clean.includes('klarinet') || clean.includes('tenorsax') || clean.includes('fluegelhorn')) return 'brass_bb';
  if (clean.includes('altsax') || clean.includes('baritonsax')) return 'brass_eb';
  if (clean.includes('cello') || clean.includes('kontrabass')) return 'strings_bass';
  if (clean.includes('geige') || clean.includes('violine') || clean.includes('floete') || clean.includes('blockfloete')) return 'strings_treble';
  if (clean.includes('klavier') || clean.includes('piano') || clean.includes('keyboard')) return 'piano';

  return 'piano';
}

/**
 * Projects a master score into a clean, scoped instrument result.
 */
export function projectScoreForInstrument(
  score: WorldTourMasterScore,
  rawInstrument?: string | null
): TransposedScoreResult {
  const family = resolveInstrumentFamily(rawInstrument);
  const isFlatKey = score.tonalCenter.includes('F') || score.tonalCenter.includes('b') || score.tonalCenter.includes('Es');

  switch (family) {
    case 'guitar': {
      return {
        family: 'guitar',
        displayName: 'Gitarre (Noten + Tabulatur)',
        clef: 'treble',
        transpositionLabel: 'Klingend C (Standard E-Tuning)',
        hasTablature: true,
        stringsCount: 6,
        notes: score.notes.map(note => {
          const tab = calculateGuitarFretAndString(note.pitch);
          return {
            ...note,
            displayPitch: note.pitch,
            displayFret: tab.fret,
            displayString: tab.stringIndex
          };
        })
      };
    }

    case 'bass': {
      return {
        family: 'bass',
        displayName: 'E-Bass (Bass-Schlüssel + Tab)',
        clef: 'bass',
        transpositionLabel: '1 Oktave tiefer (E-A-D-G)',
        hasTablature: true,
        stringsCount: 4,
        notes: score.notes.map(note => {
          const lowerPitch = transposePitch(note.pitch, -12, isFlatKey);
          const tab = calculateBassFretAndString(lowerPitch);
          return {
            ...note,
            displayPitch: lowerPitch,
            displayFret: tab.fret,
            displayString: tab.stringIndex
          };
        })
      };
    }

    case 'ukulele': {
      return {
        family: 'ukulele',
        displayName: 'Ukulele (G-C-E-A Tab)',
        clef: 'treble',
        transpositionLabel: 'Klingend C (G-C-E-A)',
        hasTablature: true,
        stringsCount: 4,
        notes: score.notes.map(note => {
          const tab = calculateUkuleleFretAndString(note.pitch);
          return {
            ...note,
            displayPitch: note.pitch,
            displayFret: tab.fret,
            displayString: tab.stringIndex
          };
        })
      };
    }

    case 'brass_bb': {
      return {
        family: 'brass_bb',
        displayName: 'Bb-Blasinstrument (Trompete / Klarinette)',
        clef: 'treble',
        transpositionLabel: 'Transponiert in Bb (+2 Halbtöne)',
        hasTablature: false,
        notes: score.notes.map(note => ({
          ...note,
          displayPitch: transposePitch(note.pitch, 2, isFlatKey)
        }))
      };
    }

    case 'brass_eb': {
      return {
        family: 'brass_eb',
        displayName: 'Eb-Blasinstrument (Altsaxophon)',
        clef: 'treble',
        transpositionLabel: 'Transponiert in Eb (+9 Halbtöne)',
        hasTablature: false,
        notes: score.notes.map(note => ({
          ...note,
          displayPitch: transposePitch(note.pitch, 9, isFlatKey)
        }))
      };
    }

    case 'drums': {
      return {
        family: 'drums',
        displayName: 'Schlagzeug & Perkussion',
        clef: 'drums',
        transpositionLabel: 'Rhythmischer Groove (Kick, Snare, Hi-Hat/Clap)',
        hasTablature: false,
        notes: score.notes.map((note, index) => {
          // Musical groove assignment:
          // Downbeat (index % 4 === 0) -> Kick (C4)
          // Backbeat (index % 4 === 2) -> Snare (D4)
          // Offbeats (index % 2 !== 0) -> Hi-Hat (F#4) or Clap
          const beatInBar = index % 4;
          let drumType: 'kick' | 'snare' | 'hihat' | 'clap' = 'kick';
          let displayPitch = 'C4';

          if (beatInBar === 0) {
            drumType = 'kick';
            displayPitch = 'C4';
          } else if (beatInBar === 2) {
            drumType = 'snare';
            displayPitch = 'D4';
          } else if (beatInBar === 1 || beatInBar === 3) {
            drumType = 'hihat';
            displayPitch = 'F#4';
          }

          return {
            ...note,
            displayPitch,
            drumType
          };
        })
      };
    }

    case 'strings_bass': {
      return {
        family: 'strings_bass',
        displayName: 'Cello / Kontrabass',
        clef: 'bass',
        transpositionLabel: 'Bassschlüssel (C)',
        hasTablature: false,
        notes: score.notes.map(note => ({
          ...note,
          displayPitch: transposePitch(note.pitch, -12, isFlatKey)
        }))
      };
    }

    case 'strings_treble':
    case 'piano':
    default: {
      return {
        family: 'piano',
        displayName: 'Klavier / Tasteninstrumente',
        clef: 'treble',
        transpositionLabel: 'Klingend C (Violinschlüssel)',
        hasTablature: false,
        notes: score.notes.map(note => ({
          ...note,
          displayPitch: note.pitch
        }))
      };
    }
  }
}
