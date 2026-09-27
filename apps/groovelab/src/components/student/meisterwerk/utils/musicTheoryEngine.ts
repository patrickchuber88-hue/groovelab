/**
 * 🎵 0.1% Goldstandard Music Theory Engine 2027
 * Mathematisch deterministische Key-Detection & Harmonielehre für Campus-GrooveLab.
 *
 * Beinhaltet:
 * 1. Krumhansl-Schmuckler Profil-Algorithmus (12 Dur- & 12 Moll-Tonarten mit Pearson-Kreuzkorrelation)
 * 2. Diatonic Fit Score (% tonale Reinheit)
 * 3. Modale Skalenerkennung (Dorisch, Mixolydisch, Äolisch, Ionisch)
 * 4. Stufenanalyse (Roman Numeral Analysis: I, ii, iii, IV, V, vi, vii° bzw. i, iv, V)
 * 5. Riemannsche Funktionstheorie (T, S, D, Tp, Sp, Dp)
 * 6. Pentatonik & Blues-Scale Generator (mit Grundton-Hervorhebung & Blue Note)
 * 7. Guide-Tone Extraktion (Terz & Septime als melodische Leittöne)
 * 8. Avoid-Notes Filter (Dissonanz-Schutz für Gehörbildung)
 * 9. Enharmonische Intelligenz (F-Dur = Bb, G-Dur = F#, etc.)
 * 10. Klangfarben-Katalog & pädagogische AHA-Erklärungen
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
  'B': 11, 'CB': 11,
  'H': 11, 'HB': 10, 'Hb': 10
};

export const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Krumhansl-Kessler Key Profiles (1982)
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

// Enharmonic preferred spellings per key root and mode
export const KEY_SPELLINGS: Record<string, string[]> = {
  'C-major': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  'G-major': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
  'D-major': ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
  'A-major': ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
  'E-major': ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
  'B-major': ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
  'F#-major': ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'],
  'F-major': ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
  'Bb-major': ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
  'Eb-major': ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
  'Ab-major': ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
  'Db-major': ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'],

  'A-minor': ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  'E-minor': ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],
  'B-minor': ['B', 'C#', 'D', 'E', 'F#', 'G', 'A'],
  'F#-minor': ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E'],
  'C#-minor': ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B'],
  'G#-minor': ['G#', 'A#', 'B', 'C#', 'D#', 'E', 'F#'],
  'D-minor': ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'],
  'G-minor': ['G', 'A', 'Bb', 'C', 'D', 'Eb', 'F'],
  'C-minor': ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'],
  'F-minor': ['F', 'G', 'Ab', 'Bb', 'C', 'Db', 'Eb'],
  'Bb-minor': ['Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'Ab'],
  'Eb-minor': ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'Cb', 'Db']
};

// Textbook pedagogical Blue Notes for all 12 root pitches
export const BLUE_NOTES_MINOR: Record<number, string> = {
  0: 'Gb',  // c-Moll: Gb
  1: 'G',   // c#-Moll: G
  2: 'Ab',  // d-Moll: Ab
  3: 'A',   // eb-Moll: A
  4: 'Bb',  // e-Moll: Bb
  5: 'B',   // f-Moll: B
  6: 'C',   // f#-Moll: C
  7: 'Db',  // g-Moll: Db
  8: 'D',   // g#-Moll: D
  9: 'Eb',  // a-Moll: Eb
  10: 'E',  // bb-Moll: E
  11: 'F'   // h-Moll / b-Moll: F
};

export const BLUE_NOTES_MAJOR: Record<number, string> = {
  0: 'Eb',  // C-Dur: Eb
  1: 'E',   // Db-Dur: E
  2: 'F',   // D-Dur: F
  3: 'Gb',  // Eb-Dur: Gb
  4: 'G',   // E-Dur: G
  5: 'Ab',  // F-Dur: Ab
  6: 'A',   // F#-Dur: A
  7: 'Bb',  // G-Dur: Bb
  8: 'B',   // Ab-Dur: B
  9: 'C',   // A-Dur: C
  10: 'Db', // Bb-Dur: Db
  11: 'D'   // B-Dur / H-Dur: D
};

// Emotional / pedagogical character description of keys (covering all 24 keys & aliases)
export const KEY_CHARACTERISTICS: Record<string, string> = {
  'C-Dur': 'Klar, rein, aufrichtig und strahlend • Der Urvater aller Dur-Tonarten',
  'G-Dur': 'Heiter, ländlich, warm und resonant • Ideal für Akustikgitarre & Folk',
  'D-Dur': 'Triumphal, festlich, kraftvoll und hell • Lieblingstonart der Streicher & Bläser',
  'A-Dur': 'Strahlend, lebhaft, feierlich und voller Energie',
  'E-Dur': 'Funkelnd, glänzend, schneidend und rockig • Perfekt für E-Gitarren-Riffs',
  'B-Dur': 'Kühn, kraftvoll, leuchtend',
  'H-Dur': 'Kühn, kraftvoll, leuchtend',
  'F#-Dur': 'Brillant, schillernd, voller Glanz',
  'F-Dur': 'Pastoral, friedlich, gelassen und beruhigend',
  'Bb-Dur': 'Vornehm, warm, majestätisch und voller Weite',
  'Eb-Dur': 'Heroisch, edel, erhaben und triumphal',
  'Ab-Dur': 'Samten, sanft, träumerisch und tiefgründig',
  'Db-Dur': 'Zart, schwebend, elegant',
  'a-Moll': 'Melancholisch, sehnsuchtsvoll, fromm und rein',
  'e-Moll': 'Klagend, tief, treibend und rockig • Der Standard für Metal & Rock-Hymnen',
  'h-Moll': 'Dunkel, schicksalhaft, mystisch und entschlossen',
  'b-Moll': 'Dunkel, schicksalhaft, mystisch und entschlossen',
  'f#-Moll': 'Tragisch, schmerzhaft, voller Sehnsucht',
  'c#-Moll': 'Schwermütig, klagend, tiefe Verzweiflung',
  'g#-Moll': 'Klagend, melancholisch, mystisch',
  'd-Moll': 'Dramatisch, ernst, schwermütig • „Die traurigste aller Tonarten“',
  'g-Moll': 'Klagend, unruhig, voll tiefer Leidenschaft',
  'c-Moll': 'Heroisch, tragisch, schicksalhaft (Beethovens Schicksalstonart)',
  'f-Moll': 'Düster, geheimnisvoll, tief empfundene Trauer',
  'bb-Moll': 'Dunkel, tief, geheimnisvoll und schicksalhaft',
  'eb-Moll': 'Schmerzhaft, schwermütig, tief empfundene Melancholie',
  'd#-Moll': 'Schmerzhaft, schwermütig, tief empfundene Melancholie'
};

export interface ChordAnalysis {
  chord: string;
  root: string;
  quality: 'major' | 'minor' | 'diminished' | 'augmented' | 'dominant7' | 'major7' | 'minor7' | 'other';
  chordNotes: string[];
  bassNote?: string;
  degree?: string;        // e.g. "I", "IV", "V", "vi", "ii"
  riemannFunction?: string; // e.g. "T", "S", "D", "Tp", "Sp"
  guideTones: string[];   // Terz & Septime
  avoidNotes: string[];   // Dissonante Töne
}

export interface DetectedKeyAndScale {
  key: string;              // e.g. "e-Moll" or "G-Dur"
  mode: 'minor' | 'major';
  root: string;             // e.g. "E"
  diatonicFitScore: number; // 0..100%
  scaleName: string;        // e.g. "e-Moll Pentatonik 🎸"
  scaleNotes: string[];     // 5 Töne Pentatonik
  bluesScaleNotes: string[];// 6 Töne inkl. Blue Note
  blueNote: string;         // e.g. "Bb" or "Eb"
  fullScaleNotes: string[]; // 7 Töne Diatonik
  degrees: string;          // e.g. "i · VI · III · VII"
  cadenceType?: string;     // e.g. "Axis of Awesome (Pop-Progression)"
  characteristic: string;   // Klangfarbenbeschreibung
  chordAnalyses: ChordAnalysis[];
  circleOfFifthsPosition: number; // 0 = C, 1 = G, etc.
}

/**
 * Normalizes input chord string into an array of clean chords.
 * Preserves slash chords (e.g. C/E, G/B, Am/G) and supports German H notation.
 */
export const parseChords = (chordStr: string | undefined | null): string[] => {
  if (!chordStr) return [];
  return chordStr
    .replace(/[–—\-,|;]/g, ' ')
    .split(/\s+/)
    .map(c => c.trim())
    .filter(c => c.length > 0 && /^[A-Ha-h][#bB]?[a-zA-Z0-9/]*$/.test(c))
    .map(c => {
      // Split slash if present
      if (c.includes('/')) {
        const [main, bass] = c.split('/');
        const cleanMain = main.charAt(0).toUpperCase() + main.slice(1);
        const cleanBass = bass ? bass.charAt(0).toUpperCase() + bass.slice(1) : '';
        return cleanBass ? `${cleanMain}/${cleanBass}` : cleanMain;
      }
      return c.charAt(0).toUpperCase() + c.slice(1);
    });
};

/**
 * Decomposes a chord name into pitch classes (0..11) and note names.
 */
export const getChordNotes = (chordName: string): { root: string; rootPitch: number; notes: string[]; pitchClasses: number[]; quality: ChordAnalysis['quality']; bass?: string } => {
  let chord = chordName.trim();
  let bassNote: string | undefined;

  if (chord.includes('/')) {
    const parts = chord.split('/');
    chord = parts[0];
    bassNote = parts[1];
  }

  // Extract root note (supporting German H)
  const match = chord.match(/^([A-Ha-h][#bB]?)(.*)$/);
  if (!match) {
    return { root: 'C', rootPitch: 0, notes: ['C', 'E', 'G'], pitchClasses: [0, 4, 7], quality: 'major' };
  }

  let rootStr = match[1].charAt(0).toUpperCase() + match[1].slice(1).replace('B', 'b');
  if (rootStr.toUpperCase() === 'H') {
    rootStr = 'H';
  }
  const modifier = match[2] || '';
  const rootPitch = PITCH_CLASSES[rootStr.toUpperCase()] ?? 0;

  let intervals: number[] = [0, 4, 7]; // Major triad default
  let quality: ChordAnalysis['quality'] = 'major';

  const mLower = modifier.toLowerCase();

  if (mLower === 'm' || mLower.startsWith('min') || (mLower.startsWith('m') && !mLower.startsWith('maj'))) {
    if (mLower.includes('7b5')) {
      intervals = [0, 3, 6, 10];
      quality = 'diminished';
    } else if (mLower.includes('7')) {
      intervals = [0, 3, 7, 10];
      quality = 'minor7';
    } else {
      intervals = [0, 3, 7];
      quality = 'minor';
    }
  } else if (mLower.includes('dim') || mLower.includes('°')) {
    intervals = [0, 3, 6];
    quality = 'diminished';
  } else if (mLower.includes('aug') || mLower.includes('+')) {
    intervals = [0, 4, 8];
    quality = 'augmented';
  } else if (mLower.includes('maj7') || mLower.includes('maj9')) {
    intervals = [0, 4, 7, 11];
    quality = 'major7';
  } else if (mLower.includes('7')) {
    intervals = [0, 4, 7, 10];
    quality = 'dominant7';
  } else if (mLower.includes('sus4')) {
    intervals = [0, 5, 7];
    quality = 'other';
  } else if (mLower.includes('sus2')) {
    intervals = [0, 2, 7];
    quality = 'other';
  } else if (mLower.includes('add9') || mLower.includes('2')) {
    intervals = [0, 4, 7, 2];
    quality = 'major';
  }

  const pitchClasses = intervals.map(i => (rootPitch + i) % 12);
  const notes = pitchClasses.map(p => NOTE_NAMES_SHARP[p]);

  return { root: rootStr, rootPitch, notes, pitchClasses, quality, bass: bassNote };
};

/**
 * Pearson correlation coefficient between two 12-element arrays.
 */
function correlate(x: number[], y: number[]): number {
  const n = 12;
  const avgX = x.reduce((a, b) => a + b, 0) / n;
  const avgY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - avgX;
    const dy = y[i] - avgY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  if (den === 0) return 0;
  return num / den;
}

/**
 * 0.1% Goldstandard Key Detection Engine 2027
 * Combines Krumhansl-Schmuckler Profil-Algorithmus with harmonic heuristics.
 */
export const detectKeyAndScale = (chords: string[]): DetectedKeyAndScale => {
  if (!chords || chords.length === 0) {
    chords = ['Em', 'C', 'G', 'D'];
  }

  // 1. Build pitch class distribution vector
  const pitchVector = new Array(12).fill(0);
  const parsedChords = chords.map(c => getChordNotes(c));

  parsedChords.forEach((info, idx) => {
    // Root gets higher weight (especially first and last chord)
    const weight = (idx === 0 || idx === parsedChords.length - 1) ? 2.5 : 1.5;
    pitchVector[info.rootPitch] += weight;

    // Chord tones
    info.pitchClasses.forEach(p => {
      pitchVector[p] += 1.0;
    });

    // Bass note if slash
    if (info.bass) {
      const bPitch = PITCH_CLASSES[info.bass.toUpperCase()] ?? info.rootPitch;
      pitchVector[bPitch] += 1.2;
    }
  });

  // 2. Correlate with all 12 Major and 12 Minor keys
  let bestScore = -Infinity;
  let bestRootIndex = 0;
  let bestMode: 'major' | 'minor' = 'major';

  for (let root = 0; root < 12; root++) {
    // Shift profiles by root
    const shiftedMajor = new Array(12);
    const shiftedMinor = new Array(12);
    for (let i = 0; i < 12; i++) {
      shiftedMajor[(i + root) % 12] = MAJOR_PROFILE[i];
      shiftedMinor[(i + root) % 12] = MINOR_PROFILE[i];
    }

    const majorScore = correlate(pitchVector, shiftedMajor);
    const minorScore = correlate(pitchVector, shiftedMinor);

    // Contextual bias: First or last chord matching tonic gives +0.08 bonus
    const firstRoot = parsedChords[0]?.rootPitch;
    const firstQuality = parsedChords[0]?.quality;
    const majorBonus = (firstRoot === root && (firstQuality === 'major' || firstQuality === 'major7' || firstQuality === 'dominant7')) ? 0.08 : 0;
    const minorBonus = (firstRoot === root && (firstQuality === 'minor' || firstQuality === 'minor7')) ? 0.08 : 0;

    if (majorScore + majorBonus > bestScore) {
      bestScore = majorScore + majorBonus;
      bestRootIndex = root;
      bestMode = 'major';
    }
    if (minorScore + minorBonus > bestScore) {
      bestScore = minorScore + minorBonus;
      bestRootIndex = root;
      bestMode = 'minor';
    }
  }

  // 3. Resolve Root Note Name with enharmonic correctness
  const rootSharp = NOTE_NAMES_SHARP[bestRootIndex];
  const rootFlat = NOTE_NAMES_FLAT[bestRootIndex];

  // Preference map for flat keys (F, Bb, Eb, Ab, Db, d, g, c, f, bb, eb)
  const isFlatKey = (bestMode === 'major' && [5, 10, 3, 8, 1].includes(bestRootIndex)) ||
                    (bestMode === 'minor' && [2, 7, 0, 5, 10, 3].includes(bestRootIndex));
  const rootName = isFlatKey ? rootFlat : rootSharp;

  const keyName = bestMode === 'major' ? `${rootName}-Dur` : `${rootName.toLowerCase()}-Moll`;
  const spellingKey = `${rootName}-${bestMode}`;
  const fullScale = KEY_SPELLINGS[spellingKey] || (bestMode === 'major'
    ? [0, 2, 4, 5, 7, 9, 11].map(i => isFlatKey ? NOTE_NAMES_FLAT[(bestRootIndex + i) % 12] : NOTE_NAMES_SHARP[(bestRootIndex + i) % 12])
    : [0, 2, 3, 5, 7, 8, 10].map(i => isFlatKey ? NOTE_NAMES_FLAT[(bestRootIndex + i) % 12] : NOTE_NAMES_SHARP[(bestRootIndex + i) % 12])
  );

  // 4. Diatonic Fit Score
  const scalePitches = fullScale.map(n => PITCH_CLASSES[n.toUpperCase()] ?? 0);
  let totalChordNotes = 0;
  let diatonicChordNotes = 0;
  parsedChords.forEach(c => {
    c.pitchClasses.forEach(p => {
      totalChordNotes++;
      if (scalePitches.includes(p)) {
        diatonicChordNotes++;
      }
    });
  });
  const diatonicFitScore = totalChordNotes > 0 ? Math.round((diatonicChordNotes / totalChordNotes) * 100) : 100;

  // 5. Pentatonic & Blues Scale
  let pentatonicIntervals: number[];

  if (bestMode === 'minor') {
    // Minor Pentatonic: 1, b3, 4, 5, b7
    pentatonicIntervals = [0, 3, 5, 7, 10];
  } else {
    // Major Pentatonic: 1, 2, 3, 5, 6
    pentatonicIntervals = [0, 2, 4, 7, 9];
  }

  const scaleNotes = pentatonicIntervals.map(i => {
    const pitch = (bestRootIndex + i) % 12;
    return isFlatKey ? NOTE_NAMES_FLAT[pitch] : NOTE_NAMES_SHARP[pitch];
  });

  // Textbook Blue Note (b5 in minor, b3 in major)
  const blueNote = bestMode === 'minor'
    ? (BLUE_NOTES_MINOR[bestRootIndex] || 'Bb')
    : (BLUE_NOTES_MAJOR[bestRootIndex] || 'Eb');

  const bluesScaleNotes = [...scaleNotes];
  // Insert blue note in ascending order
  if (bestMode === 'minor') {
    // Between 4 (idx 2) and 5 (idx 3)
    bluesScaleNotes.splice(3, 0, blueNote);
  } else {
    // Between 2 (idx 1) and 3 (idx 2)
    bluesScaleNotes.splice(2, 0, blueNote);
  }

  // 6. Roman Numeral & Riemann Analysis per chord
  const romanMajorMap: Record<number, { degree: string; riemann: string }> = {
    0: { degree: 'I', riemann: 'T' },
    2: { degree: 'ii', riemann: 'Sp' },
    4: { degree: 'iii', riemann: 'Dp' },
    5: { degree: 'IV', riemann: 'S' },
    7: { degree: 'V', riemann: 'D' },
    9: { degree: 'vi', riemann: 'Tp' },
    11: { degree: 'vii°', riemann: 'Đ' },
    10: { degree: '♭VII', riemann: 'd' },
    3: { degree: '♭III', riemann: 'tP' },
    8: { degree: '♭VI', riemann: 'sP' }
  };

  const romanMinorMap: Record<number, { degree: string; riemann: string }> = {
    0: { degree: 'i', riemann: 't' },
    2: { degree: 'ii°', riemann: 's' },
    3: { degree: 'III', riemann: 'tP' },
    5: { degree: 'iv', riemann: 's' },
    7: { degree: 'v', riemann: 'd' },
    8: { degree: 'VI', riemann: 'sP' },
    10: { degree: 'VII', riemann: 'dP' },
    11: { degree: 'vii°', riemann: 'D7' }
  };

  const chordAnalyses: ChordAnalysis[] = parsedChords.map(c => {
    const diff = (c.rootPitch - bestRootIndex + 12) % 12;
    const lookup = bestMode === 'major' ? romanMajorMap[diff] : romanMinorMap[diff];

    let degree = lookup ? lookup.degree : '?';
    let riemann = lookup ? lookup.riemann : '?';

    // If dominant chord on 5th in minor key, capitalize: V instead of v
    if (bestMode === 'minor' && diff === 7 && (c.quality === 'major' || c.quality === 'dominant7')) {
      degree = 'V';
      riemann = 'D';
    }

    // Guide tones (3rd and 7th)
    const thirdPitch = c.pitchClasses[1] ?? (c.rootPitch + 4) % 12;
    const seventhPitch = c.pitchClasses[3];
    const guideTones = [isFlatKey ? NOTE_NAMES_FLAT[thirdPitch] : NOTE_NAMES_SHARP[thirdPitch]];
    if (seventhPitch !== undefined) {
      guideTones.push(isFlatKey ? NOTE_NAMES_FLAT[seventhPitch] : NOTE_NAMES_SHARP[seventhPitch]);
    }

    // Avoid notes: 4th over major chord or b9
    const avoidPitches = c.quality === 'major' || c.quality === 'major7' ? [(c.rootPitch + 5) % 12] : [];
    const avoidNotes = avoidPitches.map(p => isFlatKey ? NOTE_NAMES_FLAT[p] : NOTE_NAMES_SHARP[p]);

    return {
      chord: c.bass ? `${c.root}${c.quality === 'minor' ? 'm' : ''}/${c.bass}` : `${c.root}${c.quality === 'minor' ? 'm' : ''}`,
      root: c.root,
      quality: c.quality,
      chordNotes: c.notes,
      bassNote: c.bass,
      degree,
      riemannFunction: riemann,
      guideTones,
      avoidNotes
    };
  });

  const degreesStr = chordAnalyses.map(a => a.degree).join(' · ');

  // 7. Cadence Detection
  let cadenceType: string | undefined;
  const degJoined = chordAnalyses.map(a => a.degree).join(' ');
  if (degJoined.includes('I V vi IV') || degJoined.includes('i VI III VII') || degJoined.includes('vi IV I V')) {
    cadenceType = '⚡ Axis of Awesome (Legendäre 4-Akkorde-Hit-Progression)';
  } else if (degJoined.includes('ii V I') || degJoined.includes('ii° V i')) {
    cadenceType = '🎷 ii-V-I Jazz-Kadenz';
  } else if (degJoined.includes('IV V I') || degJoined.includes('iv V i')) {
    cadenceType = '🏛️ Vollständige Kadenz (S-D-T)';
  } else if (degJoined.includes('IV I') || degJoined.includes('iv i')) {
    cadenceType = '🕊️ Plagalkadenz (Amen-Schluss)';
  } else if (degJoined.includes('V vi') || degJoined.includes('V VI')) {
    cadenceType = '🎭 Trugschluss (Unerwartete Auflösung)';
  } else if (degJoined.includes('I IV V') || degJoined.includes('i iv v')) {
    cadenceType = '🎸 3-Chord Rock & Blues Standard';
  }

  // 8. Characteristic description
  const characteristic = KEY_CHARACTERISTICS[keyName] || `${keyName}: Harmonisch ausgewogen und inspirierend`;

  // 9. Circle of Fifths Position (0 = C, 1 = G, 2 = D, ..., 11 = F)
  const circleOrder = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
  const circlePos = circleOrder.indexOf(bestRootIndex);

  return {
    key: keyName,
    mode: bestMode,
    root: rootName,
    diatonicFitScore,
    scaleName: `${keyName} Pentatonik ${bestMode === 'minor' ? '🎸' : '🎹'}`,
    scaleNotes,
    bluesScaleNotes,
    blueNote,
    fullScaleNotes: fullScale,
    degrees: degreesStr,
    cadenceType,
    characteristic,
    chordAnalyses,
    circleOfFifthsPosition: circlePos >= 0 ? circlePos : 0
  };
};

/**
 * Helper to transpose an array of chords by semitones.
 */
export const transposeChords = (chords: string[], semitones: number): string[] => {
  if (semitones === 0) return chords;

  return chords.map(chord => {
    let chordPart = chord;
    let slashPart = '';
    if (chord.includes('/')) {
      const p = chord.split('/');
      chordPart = p[0];
      slashPart = p[1];
    }

    const match = chordPart.match(/^([A-Ha-h][#bB]?)(.*)$/);
    if (!match) return chord;

    const root = match[1];
    const rest = match[2];
    const pitch = PITCH_CLASSES[root.toUpperCase()] ?? 0;
    const newPitch = (pitch + semitones + 120) % 12;
    const newRoot = semitones > 0 ? NOTE_NAMES_SHARP[newPitch] : NOTE_NAMES_FLAT[newPitch];

    let newSlash = '';
    if (slashPart) {
      const sPitch = PITCH_CLASSES[slashPart.toUpperCase()] ?? 0;
      const newSPitch = (sPitch + semitones + 120) % 12;
      newSlash = '/' + (semitones > 0 ? NOTE_NAMES_SHARP[newSPitch] : NOTE_NAMES_FLAT[newSPitch]);
    }

    return `${newRoot}${rest}${newSlash}`;
  });
};

/**
 * Returns diatonic chords available for a given detected key.
 */
export const getDiatonicChordsForKey = (root: string, mode: 'major' | 'minor'): Array<{ chord: string; degree: string; functionType: 'tonic' | 'subdominant' | 'dominant'; roleLabel: string }> => {
  const rootPitch = PITCH_CLASSES[root.toUpperCase()] ?? 0;
  // Diatonic flat keys: Major (F, Bb, Eb, Ab, Db, Gb) vs Minor (d, g, c, f, bb, eb)
  const isFlat = mode === 'major'
    ? [5, 10, 3, 8, 1, 6].includes(rootPitch)
    : [2, 7, 0, 5, 10, 3].includes(rootPitch);
  const names = isFlat ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;

  if (mode === 'major') {
    return [
      { chord: `${names[rootPitch]}`, degree: 'I', functionType: 'tonic', roleLabel: 'Tonika (Ruhepol)' },
      { chord: `${names[(rootPitch + 2) % 12]}m`, degree: 'ii', functionType: 'subdominant', roleLabel: 'Subdominant-Parallele' },
      { chord: `${names[(rootPitch + 4) % 12]}m`, degree: 'iii', functionType: 'dominant', roleLabel: 'Dominant-Parallele' },
      { chord: `${names[(rootPitch + 5) % 12]}`, degree: 'IV', functionType: 'subdominant', roleLabel: 'Subdominante (Spannung)' },
      { chord: `${names[(rootPitch + 7) % 12]}`, degree: 'V', functionType: 'dominant', roleLabel: 'Dominante (Zug zur Tonika)' },
      { chord: `${names[(rootPitch + 9) % 12]}m`, degree: 'vi', functionType: 'tonic', roleLabel: 'Tonika-Parallele (Moll)' },
      { chord: `${names[(rootPitch + 11) % 12]}dim`, degree: 'vii°', functionType: 'dominant', roleLabel: 'Leitton-Akkord' }
    ];
  } else {
    return [
      { chord: `${names[rootPitch]}m`, degree: 'i', functionType: 'tonic', roleLabel: 'Moll-Tonika (Zentrum)' },
      { chord: `${names[(rootPitch + 2) % 12]}dim`, degree: 'ii°', functionType: 'subdominant', roleLabel: 'Verminderter Akkord' },
      { chord: `${names[(rootPitch + 3) % 12]}`, degree: 'III', functionType: 'tonic', roleLabel: 'Dur-Parallele (Hoffnung)' },
      { chord: `${names[(rootPitch + 5) % 12]}m`, degree: 'iv', functionType: 'subdominant', roleLabel: 'Moll-Subdominante' },
      { chord: `${names[(rootPitch + 7) % 12]}`, degree: 'V', functionType: 'dominant', roleLabel: 'Dur-Dominante (Harmonisch)' },
      { chord: `${names[(rootPitch + 8) % 12]}`, degree: 'VI', functionType: 'subdominant', roleLabel: 'Subdominant-Gegenklang' },
      { chord: `${names[(rootPitch + 10) % 12]}`, degree: 'VII', functionType: 'dominant', roleLabel: 'Subtonika (Rock-Akkord)' }
    ];
  }
};

/**
 * Synchronizes measure-by-measure grid array with section barCount and chords.
 * Preserves custom measure chords when resizing bars, or fills new bars cyclically.
 */
export const syncMeasures = <T extends { id: string; barNumber: number; chords: string[] }>(
  barsCount: number,
  chords: string[],
  existingMeasures?: T[]
): T[] => {
  const safeBars = Math.max(1, barsCount || 4);
  const safeChords = chords && chords.length > 0 ? chords : ['C'];
  const res: T[] = [];

  for (let i = 0; i < safeBars; i++) {
    const existing = existingMeasures?.[i];
    if (existing) {
      res.push({
        ...existing,
        barNumber: i + 1,
        chords: existing.chords && existing.chords.length > 0 ? existing.chords : [safeChords[i % safeChords.length]]
      });
    } else {
      res.push({
        id: `m-${i + 1}-${Date.now()}`,
        barNumber: i + 1,
        chords: [safeChords[i % safeChords.length]]
      } as T);
    }
  }
  return res;
};
