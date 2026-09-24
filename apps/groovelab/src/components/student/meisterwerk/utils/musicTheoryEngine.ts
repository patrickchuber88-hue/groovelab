/**
 * 🎵 0.1% Goldstandard Music Theory Engine
 * Lightweight, mathematical diatonic key & scale detection for music students.
 * Zero external dependencies, 100% deterministic and kid-friendly.
 */

// Pitch classes relative to C = 0
export const PITCH_CLASSES: Record<string, number> = {
  'C': 0, 'B#': 0,
  'C#': 1, 'DB': 1, 'Db': 1,
  'D': 2,
  'D#': 3, 'EB': 3, 'Eb': 3,
  'E': 4, 'FB': 4,
  'F': 5, 'E#': 5,
  'F#': 6, 'GB': 6, 'Gb': 6,
  'G': 7,
  'G#': 8, 'AB': 8, 'Ab': 8,
  'A': 9,
  'A#': 10, 'BB': 10, 'Bb': 10,
  'B': 11, 'CB': 11
};

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

export interface DetectedKeyAndScale {
  key: string;            // e.g. "e-Moll" or "G-Dur"
  mode: 'minor' | 'major';
  root: string;           // e.g. "E"
  scaleName: string;      // e.g. "e-Moll Pentatonik"
  scaleNotes: string[];   // e.g. ["E", "G", "A", "B", "D"]
  fullScaleNotes: string[]; // 7-tone diatonic
  degrees?: string;       // e.g. "i · VI · III · VII"
}

/**
 * Normalizes input string like "Em - C - G - D" or "Em, C, G, D" into an array of clean chords.
 */
export const parseChords = (chordStr: string | undefined | null): string[] => {
  if (!chordStr) return [];
  return chordStr
    .replace(/[–—\-,|/]/g, ' ')
    .split(/\s+/)
    .map(c => c.trim())
    .filter(c => c.length > 0 && /^[A-Ga-g][#bB]?[a-zA-Z0-9]*$/.test(c))
    .map(c => {
      // Capitalize first letter, keep modifier
      return c.charAt(0).toUpperCase() + c.slice(1);
    });
};

/**
 * Detects the key and matching pentatonic/solo scale from an array of chords.
 */
export const detectKeyAndScale = (chords: string[]): DetectedKeyAndScale => {
  if (!chords || chords.length === 0) {
    return {
      key: 'C-Dur',
      mode: 'major',
      root: 'C',
      scaleName: 'C-Dur Pentatonik',
      scaleNotes: ['C', 'D', 'E', 'G', 'A'],
      fullScaleNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      degrees: 'I · IV · V'
    };
  }

  // Common pop/rock cadences fast lookup
  const joined = chords.map(c => c.toLowerCase()).join(' ');

  // 1. Linkin Park "Numb" & standard vi-IV-I-V (Em - C - G - D / F#m - D - A - E)
  if (joined.includes('em') && joined.includes('c') && joined.includes('g') && joined.includes('d')) {
    return {
      key: 'e-Moll',
      mode: 'minor',
      root: 'E',
      scaleName: 'e-Moll Pentatonik 🎸',
      scaleNotes: ['E', 'G', 'A', 'B', 'D'],
      fullScaleNotes: ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],
      degrees: 'i · VI · III · VII'
    };
  }

  if (joined.includes('f#m') && joined.includes('d') && joined.includes('a') && joined.includes('e')) {
    return {
      key: 'f#-Moll',
      mode: 'minor',
      root: 'F#',
      scaleName: 'f#-Moll Pentatonik 🎸',
      scaleNotes: ['F#', 'A', 'B', 'C#', 'E'],
      fullScaleNotes: ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E'],
      degrees: 'i · VI · III · VII'
    };
  }

  if (joined.includes('am') && joined.includes('f') && joined.includes('c') && joined.includes('g')) {
    return {
      key: 'a-Moll',
      mode: 'minor',
      root: 'A',
      scaleName: 'a-Moll Pentatonik 🎸',
      scaleNotes: ['A', 'C', 'D', 'E', 'G'],
      fullScaleNotes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      degrees: 'i · VI · III · VII'
    };
  }

  if (joined.includes('c') && joined.includes('g') && joined.includes('am') && joined.includes('f')) {
    return {
      key: 'C-Dur',
      mode: 'major',
      root: 'C',
      scaleName: 'C-Dur Pentatonik 🎹',
      scaleNotes: ['C', 'D', 'E', 'G', 'A'],
      fullScaleNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      degrees: 'I · V · vi · IV'
    };
  }

  if (joined.includes('g') && joined.includes('d') && joined.includes('em') && joined.includes('c')) {
    return {
      key: 'G-Dur',
      mode: 'major',
      root: 'G',
      scaleName: 'G-Dur Pentatonik 🎸',
      scaleNotes: ['G', 'A', 'B', 'D', 'E'],
      fullScaleNotes: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
      degrees: 'I · V · vi · IV'
    };
  }

  // Algorithmic fallback: check first chord
  const firstChord = chords[0];
  const isMinor = firstChord.includes('m') && !firstChord.includes('maj');
  const rootNote = firstChord.replace(/[^A-Ga-g#bB]/g, '');
  const rootPitch = PITCH_CLASSES[rootNote.toUpperCase()] ?? 0;

  if (isMinor) {
    const minorPentatonicIntervals = [0, 3, 5, 7, 10];
    const notes = minorPentatonicIntervals.map(i => NOTE_NAMES[(rootPitch + i) % 12]);
    return {
      key: `${rootNote}-Moll`,
      mode: 'minor',
      root: rootNote,
      scaleName: `${rootNote}-Moll Pentatonik 🎸`,
      scaleNotes: notes,
      fullScaleNotes: [0, 2, 3, 5, 7, 8, 10].map(i => NOTE_NAMES[(rootPitch + i) % 12]),
      degrees: 'i · Stufenleiter'
    };
  } else {
    const majorPentatonicIntervals = [0, 2, 4, 7, 9];
    const notes = majorPentatonicIntervals.map(i => NOTE_NAMES[(rootPitch + i) % 12]);
    return {
      key: `${rootNote}-Dur`,
      mode: 'major',
      root: rootNote,
      scaleName: `${rootNote}-Dur Pentatonik 🎹`,
      scaleNotes: notes,
      fullScaleNotes: [0, 2, 4, 5, 7, 9, 11].map(i => NOTE_NAMES[(rootPitch + i) % 12]),
      degrees: 'I · Stufenleiter'
    };
  }
};
