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
  | 'brass_bass'
  | 'strings_treble' 
  | 'strings_bass' 
  | 'woodwinds_c'
  | 'vocals'
  | 'general';

export interface TransposedScoreResult {
  family: InstrumentFamily;
  displayName: string;
  clef: 'treble' | 'bass' | 'drums';
  transpositionLabel: string;
  hasTablature: boolean;
  stringsCount?: number;
  tabLabel?: string;
  tabStringLabels?: string[];
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
 * 0,1% Goldstandard: Gibt null bei Pausen (REST) oder ungültigen Pitches zurück.
 */
export function calculateGuitarFretAndString(pitch: string): { fret: number; stringIndex: number } | null {
  if (!pitch || pitch === 'REST') return null;
  
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
  if (!match) return null;
  const noteVal = NOTE_SEMITONES[match[1]] ?? 0;
  const octave = parseInt(match[2], 10);
  const targetSemi = (octave + 1) * 12 + noteVal;

  // Find lowest fret on most ergonomic string
  for (let s = 0; s < guitarStrings.length; s++) {
    const diff = targetSemi - guitarStrings[s].base;
    if (diff >= 0 && diff <= 14) {
      return { fret: diff, stringIndex: s };
    }
  }

  return null;
}

/**
 * Resolves E-Bass fret and string for standard 4-string tuning (G2, D2, A1, E1).
 * Completely replaces legacy '% 7' modulo hack with real ergonomic bass fretboard math.
 * 0,1% Goldstandard: Gibt null bei Pausen (REST) zurück.
 */
export function calculateBassFretAndString(pitch: string): { fret: number; stringIndex: number } | null {
  if (!pitch || pitch === 'REST') return null;

  const bassStrings = [
    { name: 'G2', base: 43 }, // index 0 (G string)
    { name: 'D2', base: 38 }, // index 1 (D string)
    { name: 'A1', base: 33 }, // index 2 (A string)
    { name: 'E1', base: 28 }  // index 3 (low E string)
  ];

  const match = pitch.match(/^([A-G][#b]?)([0-9])$/);
  if (!match) return null;
  const noteVal = NOTE_SEMITONES[match[1]] ?? 0;
  const octave = parseInt(match[2], 10);
  const targetSemi = (octave + 1) * 12 + noteVal;

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

  return null;
}

/**
 * Resolves Ukulele fret and string for standard G-C-E-A tuning.
 * Completely replaces legacy '% 5' modulo hack.
 * 0,1% Goldstandard: Gibt null bei Pausen (REST) zurück.
 */
export function calculateUkuleleFretAndString(pitch: string): { fret: number; stringIndex: number } | null {
  if (!pitch || pitch === 'REST') return null;

  // Standard Ukulele strings: 1st=A4 (69), 2nd=E4 (64), 3rd=C4 (60), 4th=G4 (67)
  const ukeStrings = [
    { name: 'A4', base: 69 }, // index 0 (1st string)
    { name: 'E4', base: 64 }, // index 1 (2nd string)
    { name: 'C4', base: 60 }, // index 2 (3rd string)
    { name: 'G4', base: 67 }  // index 3 (4th string)
  ];

  const match = pitch.match(/^([A-G][#b]?)([0-9])$/);
  if (!match) return null;
  const noteVal = NOTE_SEMITONES[match[1]] ?? 0;
  const octave = parseInt(match[2], 10);
  const targetSemi = (octave + 1) * 12 + noteVal;

  for (let s = 0; s < ukeStrings.length; s++) {
    const diff = targetSemi - ukeStrings[s].base;
    if (diff >= 0 && diff <= 12) {
      return { fret: diff, stringIndex: s };
    }
  }

  return null;
}

/**
 * Resolves Violin (Geige) string and 1st-position fingering (0-4).
 * Strings: 0=E5 (64), 1=A4 (57), 2=D4 (50), 3=G3 (43).
 * 0,1% Goldstandard: Gibt null bei Pausen (REST) zurück.
 */
export function calculateViolinStringAndFinger(pitch: string): { finger: number; stringIndex: number } | null {
  if (!pitch || pitch === 'REST') return null;

  const match = pitch.match(/^([A-G][#b]?)([0-9])$/);
  if (!match) return null;
  const noteVal = NOTE_SEMITONES[match[1]] ?? 0;
  const octave = parseInt(match[2], 10);
  const targetSemi = octave * 12 + noteVal;

  let stringIndex = 3; // Default G3
  let stringBase = 43;

  if (targetSemi >= 64) {
    stringIndex = 0; // E5 string
    stringBase = 64;
  } else if (targetSemi >= 57) {
    stringIndex = 1; // A4 string
    stringBase = 57;
  } else if (targetSemi >= 50) {
    stringIndex = 2; // D4 string
    stringBase = 50;
  } else {
    stringIndex = 3; // G3 string
    stringBase = 43;
  }

  const diff = targetSemi - stringBase;
  let finger = 0;
  if (diff <= 0) finger = 0;
  else if (diff <= 2) finger = 1;
  else if (diff <= 4) finger = 2;
  else if (diff <= 6) finger = 3;
  else finger = 4;

  return { finger, stringIndex };
}

/**
 * Resolves Viola / Cello string and 1st-position fingering (0-4).
 * Viola: 0=A4 (57), 1=D4 (50), 2=G3 (43), 3=C3 (36).
 * Cello: 0=A3 (45), 1=D3 (38), 2=G2 (31), 3=C2 (24).
 * 0,1% Goldstandard: Gibt null bei Pausen (REST) zurück.
 */
export function calculateViolaCelloStringAndFinger(pitch: string, isCello: boolean = false): { finger: number; stringIndex: number } | null {
  if (!pitch || pitch === 'REST') return null;

  const match = pitch.match(/^([A-G][#b]?)([0-9])$/);
  if (!match) return null;
  const noteVal = NOTE_SEMITONES[match[1]] ?? 0;
  const octave = parseInt(match[2], 10);
  const targetSemi = octave * 12 + noteVal;

  const bases = isCello ? [45, 38, 31, 24] : [57, 50, 43, 36];
  let stringIndex = 3;
  let stringBase = bases[3];

  if (targetSemi >= bases[0]) {
    stringIndex = 0;
    stringBase = bases[0];
  } else if (targetSemi >= bases[1]) {
    stringIndex = 1;
    stringBase = bases[1];
  } else if (targetSemi >= bases[2]) {
    stringIndex = 2;
    stringBase = bases[2];
  } else {
    stringIndex = 3;
    stringBase = bases[3];
  }

  const diff = targetSemi - stringBase;
  let finger = 0;
  if (diff <= 0) finger = 0;
  else if (diff <= 2) finger = 1;
  else if (diff <= 4) finger = isCello ? 3 : 2;
  else if (diff <= 6) finger = isCello ? 4 : 3;
  else finger = 4;

  return { finger, stringIndex };
}

/**
 * Resolves Double Bass (Kontrabass) string and fingering (0, 1, 2, 4).
 * Strings: 0=G2 (31), 1=D2 (26), 2=A1 (21), 3=E1 (16).
 * 0,1% Goldstandard: Gibt null bei Pausen (REST) zurück.
 */
export function calculateDoubleBassStringAndFinger(pitch: string): { finger: number; stringIndex: number } | null {
  if (!pitch || pitch === 'REST') return null;

  const match = pitch.match(/^([A-G][#b]?)([0-9])$/);
  if (!match) return null;
  const noteVal = NOTE_SEMITONES[match[1]] ?? 0;
  const octave = parseInt(match[2], 10);
  const targetSemi = octave * 12 + noteVal;

  const bases = [31, 26, 21, 16];
  let stringIndex = 3;
  let stringBase = bases[3];

  if (targetSemi >= bases[0]) {
    stringIndex = 0;
    stringBase = bases[0];
  } else if (targetSemi >= bases[1]) {
    stringIndex = 1;
    stringBase = bases[1];
  } else if (targetSemi >= bases[2]) {
    stringIndex = 2;
    stringBase = bases[2];
  } else {
    stringIndex = 3;
    stringBase = bases[3];
  }

  const diff = targetSemi - stringBase;
  let finger = 0;
  if (diff <= 0) finger = 0;
  else if (diff <= 1) finger = 1;
  else if (diff <= 2) finger = 2;
  else finger = 4;

  return { finger, stringIndex };
}

/**
 * Checks whether an instrument is eligible for tablature / string-finger view (Zupfer & Streicher).
 */
export function isTablatureEligible(rawInstrument?: string | null): boolean {
  if (!rawInstrument) return false;
  const family = resolveInstrumentFamily(rawInstrument);
  return (
    family === 'guitar' ||
    family === 'bass' ||
    family === 'ukulele' ||
    family === 'strings_treble' ||
    family === 'strings_bass'
  );
}

/**
 * Resolves instrument family from raw instrument string.
 */
export function resolveInstrumentFamily(rawInstrument?: string | null): InstrumentFamily {
  if (!rawInstrument) return 'piano';
  const clean = rawInstrument.toLowerCase().trim();

  // 1. Zupfinstrumente
  if (clean.includes('gitar') || clean.includes('guitar')) return 'guitar';
  if (clean.includes('ukule')) return 'ukulele';
  if (clean.includes('e-bass') || (clean.includes('bass') && !clean.includes('kontrabass') && !clean.includes('double bass') && !clean.includes('fagott') && !clean.includes('posaune') && !clean.includes('tuba'))) return 'bass';

  // 2. Streichinstrumente
  if (clean.includes('cello') || clean.includes('violoncello') || clean.includes('kontrabass') || clean.includes('double bass')) return 'strings_bass';
  if (clean.includes('geige') || clean.includes('violine') || clean.includes('bratsche') || clean.includes('viola') || clean.includes('harfe') || clean.includes('harp')) return 'strings_treble';

  // 3. Schlagwerk & Percussion
  if (clean.includes('schlagzeug') || clean.includes('drum') || clean.includes('cajon') || clean.includes('percussion') || clean.includes('perkussion') || clean.includes('djembe') || clean.includes('bongo') || clean.includes('marimba') || clean.includes('xylophon')) return 'drums';

  // 4. Tiefe Blasinstrumente (Bassschlüssel)
  if (clean.includes('posaune') || clean.includes('trombone') || clean.includes('tuba') || clean.includes('fagott') || clean.includes('bassoon') || clean.includes('euphonium') || clean.includes('bariton')) return 'brass_bass';

  // 5. Bb- & Eb-Bläser
  if (clean.includes('trompet') || clean.includes('trumpet') || clean.includes('klarinet') || clean.includes('clarinet') || clean.includes('tenorsax') || clean.includes('fluegelhorn') || clean.includes('flügelhorn') || clean.includes('kornett')) return 'brass_bb';
  if (clean.includes('altsax') || clean.includes('baritonsax') || clean.includes('waldhorn') || clean.includes('horn')) return 'brass_eb';

  // 6. C-Holzbläser
  if (clean.includes('querfloete') || clean.includes('querflöte') || clean.includes('floete') || clean.includes('flöte') || clean.includes('flute') || clean.includes('blockfloete') || clean.includes('blockflöte') || clean.includes('recorder') || clean.includes('oboe')) return 'woodwinds_c';

  // 7. Gesang / Stimme
  if (clean.includes('gesang') || clean.includes('stimme') || clean.includes('vocal') || clean.includes('singer') || clean.includes('sing') || clean.includes('chor') || clean.includes('sopran') || clean.includes('alt') || clean.includes('tenor')) return 'vocals';

  // 8. Tasteninstrumente
  if (clean.includes('klavier') || clean.includes('piano') || clean.includes('keyboard') || clean.includes('flügel') || clean.includes('fluegel') || clean.includes('akkordeon') || clean.includes('accordion') || clean.includes('orgel') || clean.includes('synth')) return 'piano';

  return 'piano';
}

/**
 * Projects a master score into a clean, scoped instrument result.
 * Default is pure standard notation (hasTablature: false) for all instruments.
 * When showTabs is true, generates ergonomic fingerings & tablature for Zupfer & Streicher.
 */
export function projectScoreForInstrument(
  score: WorldTourMasterScore,
  rawInstrument?: string | null,
  showTabs: boolean = false
): TransposedScoreResult {
  const family = resolveInstrumentFamily(rawInstrument);
  const isFlatKey = score.tonalCenter.includes('F') || score.tonalCenter.includes('b') || score.tonalCenter.includes('Es');
  const enableTabs = Boolean(showTabs && isTablatureEligible(rawInstrument));

  switch (family) {
    case 'guitar': {
      return {
        family: 'guitar',
        displayName: 'Gitarre',
        clef: 'treble',
        transpositionLabel: 'Klingend C (Standard E-Tuning)',
        hasTablature: enableTabs,
        stringsCount: 6,
        tabLabel: 'TAB',
        tabStringLabels: ['e', 'B', 'G', 'D', 'A', 'E'],
        notes: score.notes.map(note => {
          const isRest = note.pitch === 'REST';
          const tab = (enableTabs && !isRest) ? calculateGuitarFretAndString(note.pitch) : null;
          return {
            ...note,
            displayPitch: note.pitch,
            displayFret: tab?.fret,
            displayString: tab?.stringIndex
          };
        })
      };
    }

    case 'bass': {
      return {
        family: 'bass',
        displayName: 'E-Bass',
        clef: 'bass',
        transpositionLabel: '1 Oktave tiefer (E-A-D-G)',
        hasTablature: enableTabs,
        stringsCount: 4,
        tabLabel: 'TAB',
        tabStringLabels: ['G', 'D', 'A', 'E'],
        notes: score.notes.map(note => {
          const isRest = note.pitch === 'REST';
          const lowerPitch = transposePitch(note.pitch, -12, isFlatKey);
          const tab = (enableTabs && !isRest) ? calculateBassFretAndString(lowerPitch) : null;
          return {
            ...note,
            displayPitch: lowerPitch,
            displayFret: tab?.fret,
            displayString: tab?.stringIndex
          };
        })
      };
    }

    case 'ukulele': {
      return {
        family: 'ukulele',
        displayName: 'Ukulele',
        clef: 'treble',
        transpositionLabel: 'Klingend C (G-C-E-A)',
        hasTablature: enableTabs,
        stringsCount: 4,
        tabLabel: 'TAB',
        tabStringLabels: ['A', 'E', 'C', 'G'],
        notes: score.notes.map(note => {
          const isRest = note.pitch === 'REST';
          const tab = (enableTabs && !isRest) ? calculateUkuleleFretAndString(note.pitch) : null;
          return {
            ...note,
            displayPitch: note.pitch,
            displayFret: tab?.fret,
            displayString: tab?.stringIndex
          };
        })
      };
    }

    case 'strings_treble': {
      const isViola = Boolean(rawInstrument?.toLowerCase().includes('bratsche') || rawInstrument?.toLowerCase().includes('viola'));
      return {
        family: 'strings_treble',
        displayName: isViola ? 'Bratsche / Viola' : 'Violine / Geige',
        clef: 'treble',
        transpositionLabel: 'Klingend C (Violinschlüssel)',
        hasTablature: enableTabs,
        stringsCount: 4,
        tabLabel: 'FING',
        tabStringLabels: isViola ? ['A', 'D', 'G', 'C'] : ['E', 'A', 'D', 'G'],
        notes: score.notes.map(note => {
          const isRest = note.pitch === 'REST';
          const fingering = (enableTabs && !isRest)
            ? (isViola
                ? calculateViolaCelloStringAndFinger(note.pitch, false)
                : calculateViolinStringAndFinger(note.pitch))
            : null;
          return {
            ...note,
            displayPitch: note.pitch,
            displayFret: fingering?.finger,
            displayString: fingering?.stringIndex
          };
        })
      };
    }

    case 'strings_bass': {
      const isDoubleBass = Boolean(rawInstrument?.toLowerCase().includes('kontrabass') || rawInstrument?.toLowerCase().includes('double bass'));
      return {
        family: 'strings_bass',
        displayName: isDoubleBass ? 'Kontrabass' : 'Cello / Violoncello',
        clef: 'bass',
        transpositionLabel: 'Bassschlüssel (1 Oktave tiefer)',
        hasTablature: enableTabs,
        stringsCount: 4,
        tabLabel: 'FING',
        tabStringLabels: isDoubleBass ? ['G', 'D', 'A', 'E'] : ['A', 'D', 'G', 'C'],
        notes: score.notes.map(note => {
          const isRest = note.pitch === 'REST';
          const lowerPitch = transposePitch(note.pitch, -12, isFlatKey);
          const fingering = (enableTabs && !isRest)
            ? (isDoubleBass
                ? calculateDoubleBassStringAndFinger(lowerPitch)
                : calculateViolaCelloStringAndFinger(lowerPitch, true))
            : null;
          return {
            ...note,
            displayPitch: lowerPitch,
            displayFret: fingering?.finger,
            displayString: fingering?.stringIndex
          };
        })
      };
    }

    case 'brass_bass': {
      return {
        family: 'brass_bass',
        displayName: 'Tiefe Bläser (Posaune / Tuba / Bariton / Fagott)',
        clef: 'bass',
        transpositionLabel: 'Bassschlüssel (Klingend C)',
        hasTablature: false,
        notes: score.notes.map(note => ({
          ...note,
          displayPitch: transposePitch(note.pitch, -12, isFlatKey)
        }))
      };
    }

    case 'brass_bb': {
      return {
        family: 'brass_bb',
        displayName: 'Bb-Blasinstrument (Trompete / Klarinette / Tenorsax)',
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
        displayName: 'Eb-Blasinstrument (Altsaxophon / Waldhorn)',
        clef: 'treble',
        transpositionLabel: 'Transponiert in Eb (+9 Halbtöne)',
        hasTablature: false,
        notes: score.notes.map(note => ({
          ...note,
          displayPitch: transposePitch(note.pitch, 9, isFlatKey)
        }))
      };
    }

    case 'woodwinds_c': {
      return {
        family: 'woodwinds_c',
        displayName: 'Querflöte / Blockflöte / Oboe',
        clef: 'treble',
        transpositionLabel: 'Klingend C (Violinschlüssel)',
        hasTablature: false,
        notes: score.notes.map(note => ({
          ...note,
          displayPitch: note.pitch
        }))
      };
    }

    case 'vocals': {
      return {
        family: 'vocals',
        displayName: 'Gesang & Stimme',
        clef: 'treble',
        transpositionLabel: 'Klingend C (Urtext-Textierung)',
        hasTablature: false,
        notes: score.notes.map(note => ({
          ...note,
          displayPitch: note.pitch
        }))
      };
    }

    case 'drums': {
      return {
        family: 'drums',
        displayName: 'Schlagzeug & Perkussion',
        clef: 'drums',
        transpositionLabel: 'Rhythmischer Groove (Kick, Snare, Hi-Hat)',
        hasTablature: false,
        notes: score.notes.map((note, index) => {
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
