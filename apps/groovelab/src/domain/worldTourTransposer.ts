/**
 * 🎼 Campus-Groovelab World Tour Instrument Transposer
 * 
 * Deterministic projection of Master Notes (Concert Pitch C) to the student's instrument.
 * Strictly scopes sheet music to only the instrument enrolled by the student (Zero Clutter).
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
    drumType?: 'kick' | 'snare' | 'hihat' | 'rest';
  }>;
}

// Semitone mapping for transposition
const NOTE_SEMITONES: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
  'A#': 10, 'Bb': 10, 'B': 11
};

const SEMITONE_NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Transposes a note string (e.g. 'G4') by a number of semitones.
 */
export function transposePitch(pitch: string, semitones: number): string {
  if (!pitch || pitch === 'REST') return 'REST';
  const match = pitch.match(/^([A-G][#b]?)([0-9])$/);
  if (!match) return pitch;

  const noteName = match[1];
  const octave = parseInt(match[2], 10);
  const currentSemitone = NOTE_SEMITONES[noteName];
  if (currentSemitone === undefined) return pitch;

  const totalSemitones = octave * 12 + currentSemitone + semitones;
  const newOctave = Math.floor(totalSemitones / 12);
  const newSemitoneIndex = ((totalSemitones % 12) + 12) % 12;
  const newNoteName = SEMITONE_NOTES[newSemitoneIndex];

  return `${newNoteName}${newOctave}`;
}

/**
 * Resolves guitar fret and string for standard tuning (E2, A2, D3, G3, B3, E4).
 */
export function calculateGuitarFretAndString(pitch: string): { fret: number; stringIndex: number } {
  // Standard guitar string base pitches in semitones (E2 = 40)
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
  if (clean.includes('schlagzeug') || clean.includes('drum') || clean.includes('cajon') || clean.includes('percussion')) return 'drums';
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
          const lowerPitch = transposePitch(note.pitch, -12);
          const tab = calculateGuitarFretAndString(lowerPitch);
          return {
            ...note,
            displayPitch: lowerPitch,
            displayFret: Math.max(0, tab.fret % 7),
            displayString: Math.min(3, tab.stringIndex)
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
          const tab = calculateGuitarFretAndString(note.pitch);
          return {
            ...note,
            displayPitch: note.pitch,
            displayFret: Math.max(0, tab.fret % 5),
            displayString: Math.min(3, tab.stringIndex)
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
          displayPitch: transposePitch(note.pitch, 2)
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
          displayPitch: transposePitch(note.pitch, 9)
        }))
      };
    }

    case 'drums': {
      return {
        family: 'drums',
        displayName: 'Schlagzeug (Drum-Notation)',
        clef: 'drums',
        transpositionLabel: 'Groove-Rhythmus (Kick, Snare, Hi-Hat)',
        hasTablature: false,
        notes: score.notes.map((note, index) => {
          const isDownbeat = index % 2 === 0;
          return {
            ...note,
            displayPitch: isDownbeat ? 'C4' : 'D4',
            drumType: isDownbeat ? 'kick' : 'snare'
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
          displayPitch: transposePitch(note.pitch, -12)
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
