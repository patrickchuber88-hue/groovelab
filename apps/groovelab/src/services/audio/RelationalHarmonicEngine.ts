/**
 * Campus-Groovelab Tier-1 Audio Engine - RelationalHarmonicEngine
 * 
 * 0.1% Goldstandard Relational Harmonic Intelligence Service
 * Pure, type-safe TypeScript engine for 4-bar relational chord analysis,
 * global key detection, comprehensive relational tone matrix, and age-differentiated solo scales.
 * 
 * Features:
 * - 4-Bar Audio Slicing & Boundary-Clamped Probe Windowing (Zero probe drops)
 * - Robust Tonality Discrimination (RMS & Peak-to-Mean Ratio with outlier resilience)
 * - Canonical A-Moll Jam-Preset (Am - F - C - G) for unpitched percussion/beatbox
 * - 12-Pitch-Class Chromagram Filterbank across 4 octaves (C2 - B5)
 * - Two-Pass Relational Harmony Optimization (Key Inference + Diatonic Prior Disambiguation)
 * - Full Relational Tone Matrix across all 4 bars (Harmonic role, interval name, consonance score, didactic hints)
 * - Guaranteed level-specific target tones for every bar (No dropped glow in Bar 4 for Junior)
 * - Age-differentiated solo scales:
 *   - Junior: 3 Zaubertöne (e.g. ['A', 'C', 'E'])
 *   - Teen: 5er Pentatonik (e.g. ['A', 'C', 'D', 'E', 'G'])
 *   - Pro: 7-Ton Diatonik / Natürliche Moll-Tonleiter (e.g. ['A', 'H', 'C', 'D', 'E', 'F', 'G'])
 * - Warm Rhodes (Sine fundamental + Triangle harmonic) solo tone preview synthesizer
 */

export type DidacticUiLevel = 'junior' | 'teen' | 'pro';

export interface BarHarmonicInfo {
  barIndex: number;          // 0, 1, 2, 3
  barNumber: number;         // 1, 2, 3, 4
  chord: string;             // e.g. 'Am', 'F', 'C', 'G'
  rootNote: string;          // e.g. 'A'
  targetNotes: string[];     // [Root, 3rd, 5th] e.g. ['A', 'C', 'E']
  primaryTargetNote: string; // The primary guide note (normally Root)
  targetToneByLevel: {       // 🎯 Level-specific target tone guaranteeing that every level has an active glowing note!
    junior: string;
    teen: string;
    pro: string;
  };
}

export interface DidacticScales {
  junior: string[]; // 3 Zaubertöne (e.g. ['A', 'C', 'E'] or ['C', 'E', 'G'])
  teen: string[];   // 5er Pentatonik (e.g. ['A', 'C', 'D', 'E', 'G'] or ['C', 'D', 'E', 'G', 'A'])
  pro: string[];    // 7-Ton Diatonik (e.g. ['A', 'H', 'C', 'D', 'E', 'F', 'G'] or ['C', 'D', 'E', 'F', 'G', 'A', 'H'])
}

export type ToneHarmonicRole =
  | 'root'         // Grundton (Fundament / Ruhepol)
  | 'third'        // Terz (Gefühlsbestimmend: Dur / Moll)
  | 'fifth'        // Quinte (Stabil, kraftvoll)
  | 'seventh'      // Septime (Leitton / Blues-Drive)
  | 'ninth'        // None (Farbig, modern, offen)
  | 'eleventh'     // Undezime / Quarte (Schwebend / Vorhalt)
  | 'thirteenth'   // Tredezime / Sexte (Warm, soulig)
  | 'blue_note'    // Blue Note (b5 / b3, Blues-Reibung)
  | 'passing_tone' // Durchgangston / Melodisch
  | 'tension';     // Reibung / Dissonanz

export interface ToneRelationToBar {
  barIndex: number;
  barNumber: number;
  chord: string;
  intervalSemitones: number;   // 0 to 11 semitones above chord root
  intervalName: string;        // e.g. "1 (Grundton)", "b3 (Kleine Terz)", "5 (Reine Quinte)", "9 (Große None)"
  role: ToneHarmonicRole;
  consonanceScore: number;     // 0.0 (high dissonance) to 1.0 (pure consonance)
  didacticDescription: string; // e.g. "Grundton: Absoluter Ruhepol", "Kleine Terz: Moll-Herznote"
  isChordTone: boolean;
  isTargetTone: boolean;
  voiceLeadingHint?: string;   // e.g. "Löst sich melodisch nach A auf"
}

export interface ToneRelationalProfile {
  note: string;
  relations: [ToneRelationToBar, ToneRelationToBar, ToneRelationToBar, ToneRelationToBar];
  averageConsonance: number;
  overallCharacter: string;    // e.g. "Goldener Universal-Ton: Trägt souverän über alle 4 Takte!"
}

export interface FourBarProgression {
  key: string;                    // e.g. "A-Moll", "C-Dur"
  rootNote: string;               // e.g. "A"
  mode: 'minor' | 'major';
  isAcousticOrJamPreset: boolean; // true if percussion / beatbox defaulted to jam preset
  bars: [BarHarmonicInfo, BarHarmonicInfo, BarHarmonicInfo, BarHarmonicInfo];
  scales: DidacticScales;
  toneMatrix: Record<string, ToneRelationalProfile>;
}

const STANDARD_NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'H'];

/**
 * Standard German A-Moll Jam-Preset for drums, beatbox and unpitched percussive loops
 */
const DEFAULT_A_MINOR_JAM_PRESET: FourBarProgression = {
  key: 'A-Moll',
  rootNote: 'A',
  mode: 'minor',
  isAcousticOrJamPreset: true,
  bars: [
    {
      barIndex: 0,
      barNumber: 1,
      chord: 'Am',
      rootNote: 'A',
      targetNotes: ['A', 'C', 'E'],
      primaryTargetNote: 'A',
      targetToneByLevel: {
        junior: 'A',
        teen: 'A',
        pro: 'A'
      }
    },
    {
      barIndex: 1,
      barNumber: 2,
      chord: 'F',
      rootNote: 'F',
      targetNotes: ['F', 'A', 'C'],
      primaryTargetNote: 'F',
      targetToneByLevel: {
        junior: 'A', // 3rd of F, contained in Junior scale ['A', 'C', 'E']
        teen: 'A',   // 3rd of F, contained in Teen pentatonic
        pro: 'F'     // Root of F, contained in Pro scale ['A', 'H', 'C', 'D', 'E', 'F', 'G']
      }
    },
    {
      barIndex: 2,
      barNumber: 3,
      chord: 'C',
      rootNote: 'C',
      targetNotes: ['C', 'E', 'G'],
      primaryTargetNote: 'C',
      targetToneByLevel: {
        junior: 'C',
        teen: 'C',
        pro: 'C'
      }
    },
    {
      barIndex: 3,
      barNumber: 4,
      chord: 'G',
      rootNote: 'G',
      targetNotes: ['G', 'H', 'D'],
      primaryTargetNote: 'G',
      targetToneByLevel: {
        junior: 'E', // Consonant 6th of G, guaranteed in Junior scale ['A', 'C', 'E']
        teen: 'G',   // Root of G in Teen pentatonic
        pro: 'G'     // Root of G in Pro scale ['A', 'H', 'C', 'D', 'E', 'F', 'G']
      }
    }
  ],
  scales: {
    junior: ['A', 'C', 'E'],
    teen: ['A', 'C', 'D', 'E', 'G'],
    pro: ['A', 'H', 'C', 'D', 'E', 'F', 'G']
  },
  toneMatrix: {} // Populated dynamically below
};

/**
 * Converts a pitch class index (0-11) to musical note name
 */
export function pitchClassToNoteName(pitchClass: number): string {
  const normalized = ((Math.round(pitchClass) % 12) + 12) % 12;
  return STANDARD_NOTE_NAMES[normalized];
}

/**
 * Converts note name string (e.g. 'A', 'Eb', 'C#4') to pitch class (0-11)
 */
export function noteNameToPitchClass(noteName: string): number {
  if (!noteName) return 9; // Default A
  const clean = noteName.trim();
  const match = clean.match(/^([A-Ha-h][#bB]?)(?:(\d+))?$/);
  if (!match) return 9;

  const rawName = match[1].toUpperCase();
  const pitchMap: Record<string, number> = {
    'C': 0, 'B#': 0, 'H#': 0,
    'C#': 1, 'DB': 1,
    'D': 2, 'D#': 3, 'EB': 3,
    'E': 4, 'FB': 4,
    'F': 5, 'E#': 5, 'F#': 6, 'GB': 6,
    'G': 7, 'G#': 8, 'AB': 8,
    'A': 9, 'A#': 10, 'BB': 10, 'HB': 10,
    'B': 11, 'H': 11, 'CB': 11
  };

  const pitch = pitchMap[rawName];
  return pitch !== undefined ? pitch : 9;
}

/**
 * Converts note name string (e.g. 'A', 'Eb', 'C#4') to frequency in Hertz
 */
export function noteNameToFreq(noteName: string): number {
  if (!noteName) return 440;
  const clean = noteName.trim();
  const match = clean.match(/^([A-Ha-h][#bB]?)(?:(\d+))?$/);
  if (!match) return 440;

  const rawName = match[1].toUpperCase();
  const oct = match[2] ? parseInt(match[2], 10) : 4;
  const pitch = noteNameToPitchClass(rawName);

  // MIDI Note: C4 = 60, A4 = 69
  const midi = (oct + 1) * 12 + pitch;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Continuous Goertzel filter for exact power measurement at arbitrary frequency
 */
function computeGoertzelPower(
  samples: Float32Array,
  startIdx: number,
  N: number,
  targetFreq: number,
  sampleRate: number
): number {
  const omega = (2 * Math.PI * targetFreq) / sampleRate;
  const coeff = 2 * Math.cos(omega);
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;

  const boundN = Math.min(N, samples.length - startIdx);
  if (boundN <= 0) return 0;

  for (let i = 0; i < boundN; i++) {
    // Hann windowing to minimize spectral leakage
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / boundN));
    s0 = samples[startIdx + i] * w + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }

  const power = s1 * s1 + s2 * s2 - coeff * s1 * s2;
  return Number.isFinite(power) && power > 0 ? power : 0;
}

/**
 * Computes 12-pitch-class chromagram vector for an audio slice with boundary protection
 * Focused on Octaves 3-5 (C3 to B5) to eliminate Rayleigh smearing and sub-bass crosstalk
 * Uses dense multi-window accumulation across the entire bar (12 dense probe windows)
 */
function computeSliceChroma(
  samples: Float32Array,
  startIdx: number,
  length: number,
  sampleRate: number
): { chroma: Float32Array; rms: number; peakToMeanRatio: number } {
  const chroma = new Float32Array(12);
  const safeLen = Math.min(length, samples.length - startIdx);
  if (safeLen <= 0) {
    return { chroma, rms: 0, peakToMeanRatio: 0 };
  }

  // Calculate RMS
  let sumSq = 0;
  const step = Math.max(1, Math.floor(safeLen / 4096));
  let count = 0;
  for (let i = 0; i < safeLen; i += step) {
    const val = samples[startIdx + i];
    sumSq += val * val;
    count++;
  }
  const rms = Math.sqrt(sumSq / Math.max(1, count));

  if (rms < 0.005) {
    return { chroma, rms, peakToMeanRatio: 0 };
  }

  // Dense Audio Accumulation:
  // Instead of sparse 18.5% probing, evaluate 12 dense probe positions across the bar
  // covering start, body, and tail of the bar with high temporal coherence.
  const probeFractions = [0.06, 0.14, 0.22, 0.30, 0.38, 0.46, 0.54, 0.62, 0.70, 0.78, 0.86, 0.94];
  const maxWin = Math.min(4096, length);

  // Rayleigh Smearing Elimination:
  // Focus exclusively on octaves 3 to 5 (C3 to B5, ~130 Hz to 988 Hz).
  // Octave 2 (~65 Hz - 123 Hz) is neutralized (weight 0.0) to eradicate 43Hz spectral leakage
  // and sub-bass kick/crosstalk from smearing across adjacent semitones.
  // Octave 3 (C3-B3): Triad fundamental foundation (weight 1.0)
  // Octave 4 (C4-B4): Primary harmonic voice leading (weight 1.15)
  // Octave 5 (C5-B5): Overtone brilliance (weight 0.75)
  const octaveWeights: Record<number, number> = {
    3: 1.0,
    4: 1.15,
    5: 0.75
  };

  let probesEvaluated = 0;
  for (const frac of probeFractions) {
    let pos = startIdx + Math.floor(length * frac);
    let effectiveWin = maxWin;

    // Ensure pos and window stay strictly within slice and samples array
    if (pos + effectiveWin > startIdx + length) {
      pos = Math.max(startIdx, startIdx + length - effectiveWin);
    }
    if (pos + effectiveWin > samples.length) {
      pos = Math.max(0, samples.length - effectiveWin);
    }
    effectiveWin = Math.min(effectiveWin, samples.length - pos);
    if (effectiveWin < 256) continue;

    for (let p = 0; p < 12; p++) {
      let pitchPower = 0;
      for (let oct = 3; oct <= 5; oct++) {
        const midi = (oct + 1) * 12 + p;
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        const pwr = computeGoertzelPower(samples, pos, effectiveWin, freq, sampleRate);
        pitchPower += pwr * (octaveWeights[oct] || 1.0);
      }
      chroma[p] += pitchPower;
    }
    probesEvaluated++;
  }

  if (probesEvaluated === 0) {
    return { chroma, rms, peakToMeanRatio: 0 };
  }

  // Calculate peak-to-mean ratio to discriminate pitched chords vs unpitched drums
  let maxVal = 0;
  let sumVal = 0;
  for (let p = 0; p < 12; p++) {
    if (chroma[p] > maxVal) maxVal = chroma[p];
    sumVal += chroma[p];
  }
  const meanVal = sumVal / 12;
  const peakToMeanRatio = maxVal / (meanVal + 1e-9);

  return { chroma, rms, peakToMeanRatio };
}

export interface CandidateChordMatch {
  chord: string;
  rootIndex: number;
  rootNote: string;
  isMinor: boolean;
  score: number;
}

/**
 * Matches a 12-chroma vector against 24 major/minor triad templates
 * Features overtone symmetry: eliminates false penalty on the 5th harmonic (major 3rd overtone)
 * generated by acoustic root fundamentals in minor chords.
 */
function matchBestTriadChord(chroma: Float32Array): {
  chord: string;
  rootIndex: number;
  rootNote: string;
  isMinor: boolean;
  score: number;
  candidates: CandidateChordMatch[];
} {
  let maxChroma = 0;
  for (let i = 0; i < 12; i++) {
    if (chroma[i] > maxChroma) maxChroma = chroma[i];
  }

  // Squelch / zero check: If chroma is empty or silent, do NOT default to C major!
  if (maxChroma <= 1e-6) {
    return {
      chord: '',
      rootIndex: -1,
      rootNote: '',
      isMinor: false,
      score: 0,
      candidates: []
    };
  }

  const norm = new Float32Array(12);
  for (let i = 0; i < 12; i++) {
    norm[i] = chroma[i] / maxChroma;
  }

  const candidates: CandidateChordMatch[] = [];

  for (let r = 0; r < 12; r++) {
    // Major triad: [r, r+4, r+7]
    const maj3 = (r + 4) % 12;
    const fifth = (r + 7) % 12;
    let majScore = norm[r] * 1.0 + norm[maj3] * 0.85 + norm[fifth] * 0.70;
    for (let p = 0; p < 12; p++) {
      if (p !== r && p !== maj3 && p !== fifth) {
        // Clash with minor third (r+3) is heavy
        if (p === (r + 3) % 12) {
          majScore -= norm[p] * 0.20;
        } else if (p === (r + 2) % 12 || p === (r + 9) % 12 || p === (r + 11) % 12) {
          // 9th, 6th, maj7 are mild diatonic extensions
          majScore -= norm[p] * 0.06;
        } else {
          majScore -= norm[p] * 0.12;
        }
      }
    }
    const majRootName = pitchClassToNoteName(r);
    candidates.push({
      chord: majRootName,
      rootIndex: r,
      rootNote: majRootName,
      isMinor: false,
      score: majScore
    });

    // Minor triad: [r, r+3, r+7]
    const min3 = (r + 3) % 12;
    let minScore = norm[r] * 1.0 + norm[min3] * 0.85 + norm[fifth] * 0.70;
    for (let p = 0; p < 12; p++) {
      if (p !== r && p !== min3 && p !== fifth) {
        // Symmetrization of acoustic physical overtones:
        // Note (r + 4) is the 5th harmonic of the root fundamental!
        // In real acoustic instruments, an Am chord naturally produces C# acoustic overtone bleed.
        // We do NOT penalize (r + 4) heavily in minor chords to avoid biasing against minor triads.
        if (p === (r + 4) % 12) {
          minScore -= norm[p] * 0.02;
        } else if (p === (r + 10) % 12 || p === (r + 2) % 12) {
          // m7 and 9th are standard minor extensions
          minScore -= norm[p] * 0.05;
        } else {
          minScore -= norm[p] * 0.12;
        }
      }
    }
    candidates.push({
      chord: `${majRootName}m`,
      rootIndex: r,
      rootNote: majRootName,
      isMinor: true,
      score: minScore
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  return {
    chord: best.chord,
    rootIndex: best.rootIndex,
    rootNote: best.rootNote,
    isMinor: best.isMinor,
    score: best.score,
    candidates
  };
}

/**
 * Infers global key center from the 4-bar chord matches
 * 
 * Features:
 * - Cadence & Turnaround Inference (Cyclic Bar 4 -> Bar 1 evaluation)
 * - Resolves Parallel Key Ambiguity (e.g. A-Moll vs C-Dur)
 * - Robust support for off-tonic Pop progressions:
 *   - IV / VI starting progressions: F - G - Em - Am (Royal Road -> A-Moll)
 *   - ii starting progressions: Dm - G - C - Am (ii-V-I cadence -> C-Dur)
 *   - Tonic starting progressions: Am - F - C - G (A-Moll), C - G - Am - F (C-Dur)
 */
function inferKeyAndScales(
  matchedChords: Array<{ rootIndex: number; isMinor: boolean; chord: string; rootNote: string }>
): {
  key: string;
  rootNote: string;
  mode: 'minor' | 'major';
  scales: DidacticScales;
} {
  // Filter out any silent / unpitched bars
  const validChords = matchedChords.filter(c => c.rootIndex >= 0);
  if (validChords.length === 0) {
    return {
      key: 'A-Moll',
      rootNote: 'A',
      mode: 'minor',
      scales: {
        junior: ['A', 'C', 'E'],
        teen: ['A', 'C', 'D', 'E', 'G'],
        pro: ['A', 'H', 'C', 'D', 'E', 'F', 'G']
      }
    };
  }

  let bestKeyScore = -Infinity;
  let bestRootIndex = 9; // Default A
  let bestMode: 'minor' | 'major' = 'minor';

  for (let k = 0; k < 12; k++) {
    // ==========================================
    // 1. CANDIDATE MAJOR KEY (Root k)
    // ==========================================
    const majDiatonicMap: Record<number, { isMinor: boolean; weight: number }> = {
      [k]: { isMinor: false, weight: 3.5 },               // I
      [(k + 2) % 12]: { isMinor: true, weight: 2.5 },    // ii
      [(k + 4) % 12]: { isMinor: true, weight: 2.0 },    // iii
      [(k + 5) % 12]: { isMinor: false, weight: 3.0 },   // IV
      [(k + 7) % 12]: { isMinor: false, weight: 3.5 },   // V
      [(k + 9) % 12]: { isMinor: true, weight: 2.5 }     // vi
    };

    let majScore = 0;
    matchedChords.forEach((c, idx) => {
      if (c.rootIndex < 0) return;
      const diatonic = majDiatonicMap[c.rootIndex];
      if (diatonic && diatonic.isMinor === c.isMinor) {
        majScore += diatonic.weight;
      } else {
        majScore -= 2.5; // Out-of-key penalty
      }

      // Tonic start bonus: Bar 0 is major tonic I
      if (idx === 0 && c.rootIndex === k && !c.isMinor) {
        majScore += 5.0;
      }
      // Tonic arrival on Bar 3 (e.g. ii-V-I cadence arriving on Bar 3: Dm - G - C - Am)
      if (idx === 2 && c.rootIndex === k && !c.isMinor) {
        majScore += 3.5;
      }
      // Tonic arrival on Bar 4
      if (idx === 3 && c.rootIndex === k && !c.isMinor) {
        majScore += 4.0;
      }
      // Dominant in Bar 4 (Half cadence preparing turnaround)
      if (idx === 3 && c.rootIndex === (k + 7) % 12 && !c.isMinor) {
        majScore += 2.5;
      }
    });

    // Cyclic Turnaround Cadence (Bar 4 -> Bar 1: matchedChords[3] -> matchedChords[0])
    const c0 = matchedChords[0] || { rootIndex: -1, isMinor: false, chord: '', rootNote: '' };
    const c1 = matchedChords[1] || { rootIndex: -1, isMinor: false, chord: '', rootNote: '' };
    const c2 = matchedChords[2] || { rootIndex: -1, isMinor: false, chord: '', rootNote: '' };
    const c3 = matchedChords[3] || { rootIndex: -1, isMinor: false, chord: '', rootNote: '' };

    if (c3.rootIndex >= 0 && c0.rootIndex >= 0) {
      // V -> I authentic turnaround (e.g. G -> C in C major)
      if (c3.rootIndex === (k + 7) % 12 && !c3.isMinor && c0.rootIndex === k && !c0.isMinor) {
        majScore += 5.0;
      }
      // IV -> I plagal turnaround (e.g. F -> C in C major)
      if (c3.rootIndex === (k + 5) % 12 && !c3.isMinor && c0.rootIndex === k && !c0.isMinor) {
        majScore += 3.5;
      }
    }

    // Sequential Cadence: ii -> V -> I (e.g. Dm -> G -> C in bars 0, 1, 2)
    if (
      c0.rootIndex === (k + 2) % 12 && c0.isMinor &&
      c1.rootIndex === (k + 7) % 12 && !c1.isMinor &&
      c2.rootIndex === k && !c2.isMinor
    ) {
      majScore += 6.0;
    }
    // Sequential Cadence: ii -> V -> I in bars 1, 2, 3
    if (
      c1.rootIndex === (k + 2) % 12 && c1.isMinor &&
      c2.rootIndex === (k + 7) % 12 && !c2.isMinor &&
      c3.rootIndex === k && !c3.isMinor
    ) {
      majScore += 6.0;
    }

    if (majScore > bestKeyScore) {
      bestKeyScore = majScore;
      bestRootIndex = k;
      bestMode = 'major';
    }

    // ==========================================
    // 2. CANDIDATE MINOR KEY (Root k)
    // ==========================================
    const minDiatonicMap: Record<number, Array<{ isMinor: boolean; weight: number }>> = {
      [k]: [{ isMinor: true, weight: 3.5 }],                             // i
      [(k + 3) % 12]: [{ isMinor: false, weight: 2.5 }],                 // III
      [(k + 5) % 12]: [
        { isMinor: true, weight: 2.5 },                                  // iv
        { isMinor: false, weight: 2.0 }                                  // IV (Dorian)
      ],
      [(k + 7) % 12]: [
        { isMinor: true, weight: 2.0 },                                  // v
        { isMinor: false, weight: 3.5 }                                  // V (Harmonic minor dominant)
      ],
      [(k + 8) % 12]: [{ isMinor: false, weight: 3.0 }],                 // VI
      [(k + 10) % 12]: [{ isMinor: false, weight: 3.0 }]                 // VII
    };

    let minScore = 0;
    matchedChords.forEach((c, idx) => {
      if (c.rootIndex < 0) return;
      const matchEntries = minDiatonicMap[c.rootIndex];
      const match = matchEntries?.find(e => e.isMinor === c.isMinor);
      if (match) {
        minScore += match.weight;
      } else {
        minScore -= 2.5; // Out-of-key penalty
      }

      // Tonic start bonus: Bar 0 is minor tonic i
      if (idx === 0 && c.rootIndex === k && c.isMinor) {
        minScore += 5.0;
      }
      // Tonic resolution on Bar 4 (e.g. F - G - Em - Am, resolves to Am on Bar 4!)
      if (idx === 3 && c.rootIndex === k && c.isMinor) {
        minScore += 4.5;
      }
      // Tonic on Bar 3
      if (idx === 2 && c.rootIndex === k && c.isMinor) {
        minScore += 3.0;
      }
      // Subtonic VII or Dominant V on Bar 4 (prepares loop turnaround to i)
      if (idx === 3 && (c.rootIndex === (k + 10) % 12 || c.rootIndex === (k + 7) % 12) && !c.isMinor) {
        minScore += 3.0;
      }
    });

    // Cyclic Turnaround Cadence (Bar 4 -> Bar 1)
    if (c3.rootIndex >= 0 && c0.rootIndex >= 0) {
      // VII -> i Aeolian turnaround (e.g. G -> Am in A minor, quintessential loop cadence)
      if (c3.rootIndex === (k + 10) % 12 && !c3.isMinor && c0.rootIndex === k && c0.isMinor) {
        minScore += 5.0;
      }
      // V / v -> i Authentic or natural minor turnaround (e.g. E -> Am or Em -> Am)
      if (c3.rootIndex === (k + 7) % 12 && c0.rootIndex === k && c0.isMinor) {
        minScore += c3.isMinor ? 4.0 : 5.0;
      }
      // iv / IV -> i Plagal turnaround (e.g. Dm -> Am or D -> Am in A minor)
      if (c3.rootIndex === (k + 5) % 12 && c0.rootIndex === k && c0.isMinor) {
        minScore += 3.5;
      }
      // i -> VI loop restart (e.g. in F - G - Em - Am, turnaround from Bar 4 Am to Bar 1 F)
      if (c3.rootIndex === k && c3.isMinor && c0.rootIndex === (k + 8) % 12 && !c0.isMinor) {
        minScore += 3.5;
      }
    }

    // Sequential Cadence: VI -> VII -> i (e.g. F -> G -> Em -> Am or F -> G -> Am)
    // Resolves parallel key ambiguity firmly to minor!
    if (
      c0.rootIndex === (k + 8) % 12 && !c0.isMinor &&
      c1.rootIndex === (k + 10) % 12 && !c1.isMinor &&
      c3.rootIndex === k && c3.isMinor
    ) {
      minScore += 6.0;
    }
    if (
      c0.rootIndex === (k + 8) % 12 && !c0.isMinor &&
      c1.rootIndex === (k + 10) % 12 && !c1.isMinor &&
      c2.rootIndex === k && c2.isMinor
    ) {
      minScore += 6.0;
    }
    // VII -> i, v -> i or V -> i cadential arrival on Bar 4 (e.g. G -> Am or Em/E -> Am on bars 2 and 3)
    if (
      (c2.rootIndex === (k + 7) % 12 || (c2.rootIndex === (k + 10) % 12 && !c2.isMinor)) &&
      c3.rootIndex === k && c3.isMinor
    ) {
      minScore += 4.0;
    }

    if (minScore > bestKeyScore) {
      bestKeyScore = minScore;
      bestRootIndex = k;
      bestMode = 'minor';
    }
  }

  const rootName = pitchClassToNoteName(bestRootIndex);
  const key = `${rootName}-${bestMode === 'minor' ? 'Moll' : 'Dur'}`;

  // Build scales: Junior (3 tones), Teen (5 pentatonic), Pro (7-tone diatonic / natural minor)
  let juniorIndices: number[];
  let teenIndices: number[];
  let proIndices: number[];

  if (bestMode === 'minor') {
    // Junior: 3 Zaubertöne = Moll-Dreiklang (Root, m3, 5)
    juniorIndices = [bestRootIndex, (bestRootIndex + 3) % 12, (bestRootIndex + 7) % 12];
    // Teen: 5er Moll-Pentatonik = (Root, m3, 4, 5, m7)
    teenIndices = [
      bestRootIndex,
      (bestRootIndex + 3) % 12,
      (bestRootIndex + 5) % 12,
      (bestRootIndex + 7) % 12,
      (bestRootIndex + 10) % 12
    ];
    // Pro: Vollständige natürliche Moll-Tonleiter (Aeolisch: Root, 2, m3, 4, 5, m6, m7)
    proIndices = [
      bestRootIndex,
      (bestRootIndex + 2) % 12,
      (bestRootIndex + 3) % 12,
      (bestRootIndex + 5) % 12,
      (bestRootIndex + 7) % 12,
      (bestRootIndex + 8) % 12,
      (bestRootIndex + 10) % 12
    ];
  } else {
    // Major
    // Junior: 3 Zaubertöne = Dur-Dreiklang (Root, M3, 5)
    juniorIndices = [bestRootIndex, (bestRootIndex + 4) % 12, (bestRootIndex + 7) % 12];
    // Teen: 5er Dur-Pentatonik = (Root, 2, 3, 5, 6)
    teenIndices = [
      bestRootIndex,
      (bestRootIndex + 2) % 12,
      (bestRootIndex + 4) % 12,
      (bestRootIndex + 7) % 12,
      (bestRootIndex + 9) % 12
    ];
    // Pro: Vollständige 7-Ton Diatonik (Root, 2, 3, 4, 5, 6, 7/Maj7)
    proIndices = [
      bestRootIndex,
      (bestRootIndex + 2) % 12,
      (bestRootIndex + 4) % 12,
      (bestRootIndex + 5) % 12,
      (bestRootIndex + 7) % 12,
      (bestRootIndex + 9) % 12,
      (bestRootIndex + 11) % 12
    ];
  }

  return {
    key,
    rootNote: rootName,
    mode: bestMode,
    scales: {
      junior: juniorIndices.map(pitchClassToNoteName),
      teen: teenIndices.map(pitchClassToNoteName),
      pro: proIndices.map(pitchClassToNoteName)
    }
  };
}

/**
 * Evaluates the precise musical relation between a note and a specific chord
 */
export function evaluateToneToChord(
  noteName: string,
  chordRootNote: string,
  isMinor: boolean
): {
  intervalSemitones: number;
  intervalName: string;
  role: ToneHarmonicRole;
  consonanceScore: number;
  didacticDescription: string;
  isChordTone: boolean;
  voiceLeadingHint?: string;
} {
  const notePitch = noteNameToPitchClass(noteName);
  const rootPitch = noteNameToPitchClass(chordRootNote);
  const semitones = ((notePitch - rootPitch) % 12 + 12) % 12;

  if (isMinor) {
    switch (semitones) {
      case 0:
        return {
          intervalSemitones: 0,
          intervalName: '1 (Grundton)',
          role: 'root',
          consonanceScore: 1.0,
          didacticDescription: 'Grundton: Absoluter Ruhepol & Fundament',
          isChordTone: true
        };
      case 1:
        return {
          intervalSemitones: 1,
          intervalName: 'b2 (Kleine Sekunde)',
          role: 'tension',
          consonanceScore: 0.20,
          didacticDescription: 'Kleine Sekunde: Scharfe Reibung, flamencohafte Spannung',
          isChordTone: false,
          voiceLeadingHint: 'Fällt sanft zum Grundton ab'
        };
      case 2:
        return {
          intervalSemitones: 2,
          intervalName: '9 (Große None)',
          role: 'ninth',
          consonanceScore: 0.82,
          didacticDescription: 'Große None: Schwebend, modern & melancholisch',
          isChordTone: false
        };
      case 3:
        return {
          intervalSemitones: 3,
          intervalName: 'b3 (Kleine Terz)',
          role: 'third',
          consonanceScore: 0.95,
          didacticDescription: 'Kleine Terz: Moll-Herznote, emotional & warm',
          isChordTone: true
        };
      case 4:
        return {
          intervalSemitones: 4,
          intervalName: '3 (Große Terz)',
          role: 'tension',
          consonanceScore: 0.30,
          didacticDescription: 'Große Terz im Moll: Dur-Reibung (Picardy-Spannung)',
          isChordTone: false
        };
      case 5:
        return {
          intervalSemitones: 5,
          intervalName: '11 (Reine Quarte)',
          role: 'eleventh',
          consonanceScore: 0.78,
          didacticDescription: 'Reine Quarte: Offener Schwebe-Klang, verbindend',
          isChordTone: false,
          voiceLeadingHint: 'Löst sich sanft zur Terz auf'
        };
      case 6:
        return {
          intervalSemitones: 6,
          intervalName: 'b5 (Blue Note)',
          role: 'blue_note',
          consonanceScore: 0.65,
          didacticDescription: 'Blue Note: Rauchige Blues-Würze, zieht magnetisch',
          isChordTone: false,
          voiceLeadingHint: 'Gleitet zur Quinte oder Quarte'
        };
      case 7:
        return {
          intervalSemitones: 7,
          intervalName: '5 (Reine Quinte)',
          role: 'fifth',
          consonanceScore: 0.92,
          didacticDescription: 'Reine Quinte: Starkes harmonisches Gerüst',
          isChordTone: true
        };
      case 8:
        return {
          intervalSemitones: 8,
          intervalName: 'b6 (Kleine Sexte)',
          role: 'passing_tone',
          consonanceScore: 0.70,
          didacticDescription: 'Kleine Sexte: Äolische Sehnsucht, melodischer Schritt',
          isChordTone: false
        };
      case 9:
        return {
          intervalSemitones: 9,
          intervalName: '6 (Dorische Sexte)',
          role: 'thirteenth',
          consonanceScore: 0.82,
          didacticDescription: 'Dorische Sexte: Legendäre Santana-Moll-Farbe',
          isChordTone: false
        };
      case 10:
        return {
          intervalSemitones: 10,
          intervalName: 'b7 (Kleine Septime)',
          role: 'seventh',
          consonanceScore: 0.85,
          didacticDescription: 'Kleine Septime: Groovige Blues- & Rock-Moll-Septime',
          isChordTone: false
        };
      case 11:
      default:
        return {
          intervalSemitones: 11,
          intervalName: 'maj7 (Große Septime)',
          role: 'seventh',
          consonanceScore: 0.72,
          didacticDescription: 'Große Septime: Harmonisch-Moll Leitton',
          isChordTone: false,
          voiceLeadingHint: 'Strebt magnetisch zum Grundton'
        };
    }
  } else {
    // Major chord
    switch (semitones) {
      case 0:
        return {
          intervalSemitones: 0,
          intervalName: '1 (Grundton)',
          role: 'root',
          consonanceScore: 1.0,
          didacticDescription: 'Grundton: Festes Fundament & Heimatklang',
          isChordTone: true
        };
      case 1:
        return {
          intervalSemitones: 1,
          intervalName: 'b2 (Kleine Sekunde)',
          role: 'tension',
          consonanceScore: 0.15,
          didacticDescription: 'Kleine Sekunde: Dissonante Reibung',
          isChordTone: false
        };
      case 2:
        return {
          intervalSemitones: 2,
          intervalName: '9 (Große None)',
          role: 'ninth',
          consonanceScore: 0.85,
          didacticDescription: 'Große None: Strahlende add9-Farbe, modern & offen',
          isChordTone: false
        };
      case 3:
        return {
          intervalSemitones: 3,
          intervalName: 'b3 (Blue Note)',
          role: 'blue_note',
          consonanceScore: 0.65,
          didacticDescription: 'Moll-Terz im Dur: Authentischer Hendrix- & Blues-Drive',
          isChordTone: false,
          voiceLeadingHint: 'Biegt sich nach oben in die Dur-Terz'
        };
      case 4:
        return {
          intervalSemitones: 4,
          intervalName: '3 (Große Terz)',
          role: 'third',
          consonanceScore: 0.96,
          didacticDescription: 'Große Terz: Heller, strahlender Dur-Charakter',
          isChordTone: true
        };
      case 5:
        return {
          intervalSemitones: 5,
          intervalName: '11 (Reine Quarte)',
          role: 'eleventh',
          consonanceScore: 0.60,
          didacticDescription: 'Reine Quarte: Schwebender sus4-Vorhalt',
          isChordTone: false,
          voiceLeadingHint: 'Sinkt zur großen Terz ab'
        };
      case 6:
        return {
          intervalSemitones: 6,
          intervalName: '#11 (Lydische Quarte)',
          role: 'blue_note',
          consonanceScore: 0.62,
          didacticDescription: 'Lydische Quarte: Faszinierende Filmsound-Farbe',
          isChordTone: false
        };
      case 7:
        return {
          intervalSemitones: 7,
          intervalName: '5 (Reine Quinte)',
          role: 'fifth',
          consonanceScore: 0.92,
          didacticDescription: 'Reine Quinte: Stabile Säule, universell konsonant',
          isChordTone: true
        };
      case 8:
        return {
          intervalSemitones: 8,
          intervalName: 'b13 (Kleine Sexte)',
          role: 'tension',
          consonanceScore: 0.45,
          didacticDescription: 'Altered Farbnote: Geheimnisvolle Spannung',
          isChordTone: false
        };
      case 9:
        return {
          intervalSemitones: 9,
          intervalName: '6 (Große Sexte)',
          role: 'thirteenth',
          consonanceScore: 0.88,
          didacticDescription: 'Große Sexte: Warme, wohlklingende Pop- & Soul-Farbe',
          isChordTone: false
        };
      case 10:
        return {
          intervalSemitones: 10,
          intervalName: 'b7 (Dominant-Septime)',
          role: 'seventh',
          consonanceScore: 0.78,
          didacticDescription: 'Kleine Septime: Blues-Dominante, drängt nach vorne',
          isChordTone: false
        };
      case 11:
      default:
        return {
          intervalSemitones: 11,
          intervalName: 'maj7 (Große Septime)',
          role: 'seventh',
          consonanceScore: 0.84,
          didacticDescription: 'Große Septime: Edler Lo-Fi / Jazz-Glanz (maj7)',
          isChordTone: false
        };
    }
  }
}

/**
 * Computes the optimal target tone for a specific didactic level in a given bar
 */
function resolveLevelTargetTone(
  barHarmonic: { chord: string; rootNote: string; targetNotes: string[] },
  levelNotes: string[],
  isMinor: boolean
): string {
  if (!levelNotes || levelNotes.length === 0) {
    return barHarmonic.rootNote;
  }

  // 1. Direct chord root match (by pitch class, returning the scale's exact note token)
  const rootMatch = levelNotes.find(n => noteNameToPitchClass(n) === noteNameToPitchClass(barHarmonic.rootNote));
  if (rootMatch) {
    return rootMatch;
  }

  // 2. Direct chord 3rd or 5th match (returning the scale's exact note token)
  for (const tNote of barHarmonic.targetNotes) {
    const targetMatch = levelNotes.find(n => noteNameToPitchClass(n) === noteNameToPitchClass(tNote));
    if (targetMatch) {
      return targetMatch;
    }
  }

  // 3. Highest consonance among available level notes
  let bestNote = levelNotes[0];
  let bestConsonance = -1;

  for (const note of levelNotes) {
    const evaluation = evaluateToneToChord(note, barHarmonic.rootNote, isMinor);
    if (evaluation.consonanceScore > bestConsonance) {
      bestConsonance = evaluation.consonanceScore;
      bestNote = note;
    }
  }

  return bestNote;
}

/**
 * Evaluates a tone across all 4 bars of a progression
 */
export function evaluateToneAcrossFourBars(
  noteName: string,
  bars: [BarHarmonicInfo, BarHarmonicInfo, BarHarmonicInfo, BarHarmonicInfo]
): ToneRelationalProfile {
  const relations = bars.map((bar) => {
    const isMinor = bar.chord.endsWith('m');
    const evalData = evaluateToneToChord(noteName, bar.rootNote, isMinor);
    const isTargetTone = bar.targetNotes.some(
      t => noteNameToPitchClass(t) === noteNameToPitchClass(noteName)
    );

    const rel: ToneRelationToBar = {
      barIndex: bar.barIndex,
      barNumber: bar.barNumber,
      chord: bar.chord,
      intervalSemitones: evalData.intervalSemitones,
      intervalName: evalData.intervalName,
      role: evalData.role,
      consonanceScore: evalData.consonanceScore,
      didacticDescription: evalData.didacticDescription,
      isChordTone: evalData.isChordTone,
      isTargetTone,
      voiceLeadingHint: evalData.voiceLeadingHint
    };
    return rel;
  }) as [ToneRelationToBar, ToneRelationToBar, ToneRelationToBar, ToneRelationToBar];

  const avgConsonance = (
    relations[0].consonanceScore +
    relations[1].consonanceScore +
    relations[2].consonanceScore +
    relations[3].consonanceScore
  ) / 4;

  let overallCharacter: string;
  if (avgConsonance >= 0.84) {
    overallCharacter = '✨ Goldener Universal-Ton: Trägt mit höchster Konsonanz sicher durch alle 4 Takte!';
  } else if (avgConsonance >= 0.75) {
    overallCharacter = '🌟 Melodischer Leitton: Bringt geschmackvolle Farben und Bewegung in den Loop.';
  } else if (relations.some(r => r.role === 'blue_note')) {
    overallCharacter = '🎷 Blues- & Charakter-Ton: Verleiht dem Solo rauchige Tiefe und packende Emotion.';
  } else {
    overallCharacter = '⚡ Kontrast- & Spannungston: Wirkt besonders intensiv als gezielter Vorhalt.';
  }

  return {
    note: noteName,
    relations,
    averageConsonance: Math.round(avgConsonance * 100) / 100,
    overallCharacter
  };
}

/**
 * Builds the complete relational tone matrix for all 12 chromatic pitches and scale notes
 */
export function buildRelationalToneMatrix(
  bars: [BarHarmonicInfo, BarHarmonicInfo, BarHarmonicInfo, BarHarmonicInfo],
  scales: DidacticScales
): Record<string, ToneRelationalProfile> {
  const matrix: Record<string, ToneRelationalProfile> = {};

  // All 12 chromatic notes
  STANDARD_NOTE_NAMES.forEach((note) => {
    matrix[note] = evaluateToneAcrossFourBars(note, bars);
  });

  // Ensure all scale notes (including enharmonic aliases if any) are evaluated
  const allScaleNotes = Array.from(new Set([
    ...scales.junior,
    ...scales.teen,
    ...scales.pro
  ]));

  allScaleNotes.forEach((note) => {
    if (!matrix[note]) {
      matrix[note] = evaluateToneAcrossFourBars(note, bars);
    }
  });

  // Bidirectional compatibility alias: synchronize 'H' and 'B'
  if (matrix['H'] && !matrix['B']) {
    matrix['B'] = {
      ...matrix['H'],
      note: 'B',
      relations: matrix['H'].relations.map(r => ({ ...r })) as [ToneRelationToBar, ToneRelationToBar, ToneRelationToBar, ToneRelationToBar]
    };
  }
  if (matrix['B'] && !matrix['H']) {
    matrix['H'] = {
      ...matrix['B'],
      note: 'H',
      relations: matrix['B'].relations.map(r => ({ ...r })) as [ToneRelationToBar, ToneRelationToBar, ToneRelationToBar, ToneRelationToBar]
    };
  }

  return matrix;
}

// Populate toneMatrix in DEFAULT_A_MINOR_JAM_PRESET
DEFAULT_A_MINOR_JAM_PRESET.toneMatrix = buildRelationalToneMatrix(
  DEFAULT_A_MINOR_JAM_PRESET.bars,
  DEFAULT_A_MINOR_JAM_PRESET.scales
);

export class RelationalHarmonicEngine {
  /**
   * Returns default canonical A-Moll Jam-Preset
   */
  public static getDefaultJamPreset(): FourBarProgression {
    return JSON.parse(JSON.stringify(DEFAULT_A_MINOR_JAM_PRESET));
  }

  /**
   * Evaluates any single musical tone in relation to all 4 bars of a progression
   */
  public static evaluateToneRelation(
    noteName: string,
    progression: FourBarProgression
  ): ToneRelationalProfile {
    if (progression?.toneMatrix?.[noteName]) {
      return progression.toneMatrix[noteName];
    }
    const safeBars = progression?.bars || DEFAULT_A_MINOR_JAM_PRESET.bars;
    return evaluateToneAcrossFourBars(noteName, safeBars);
  }

  /**
   * Analyzes a 4-bar AudioBuffer in relation to time, tonality, and relational chord context
   */
  public static analyzeFourBarAudio(buffer: AudioBuffer, bpm: number): FourBarProgression {
    try {
      if (!buffer || buffer.length < 1024) {
        return RelationalHarmonicEngine.getDefaultJamPreset();
      }

      const effectiveBpm = bpm > 20 && bpm < 320 ? bpm : 120;
      const sampleRate = buffer.sampleRate || 44100;
      const totalSamples = buffer.length;

      // Extract mono signal (average channels if stereo)
      const ch0 = buffer.getChannelData(0);
      const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;
      const mono = new Float32Array(totalSamples);
      if (ch1) {
        for (let i = 0; i < totalSamples; i++) {
          mono[i] = (ch0[i] + ch1[i]) * 0.5;
        }
      } else {
        mono.set(ch0);
      }

      // Slicing into 4 bars
      const barSamples = Math.floor(totalSamples / 4);
      if (barSamples < 512) {
        return RelationalHarmonicEngine.getDefaultJamPreset();
      }

      // Analyze each bar
      const barAnalyses = [0, 1, 2, 3].map((b) => {
        const start = b * barSamples;
        const len = b === 3 ? totalSamples - start : barSamples;
        return computeSliceChroma(mono, start, len, sampleRate);
      });

      // Check overall tonality / RMS with outlier resilience
      const activeBarAnalyses = barAnalyses.filter(ba => ba.rms >= 0.005);
      if (activeBarAnalyses.length === 0) {
        return RelationalHarmonicEngine.getDefaultJamPreset();
      }

      const avgRms = activeBarAnalyses.reduce((acc, ba) => acc + ba.rms, 0) / activeBarAnalyses.length;
      const maxPeakToMean = Math.max(...activeBarAnalyses.map(ba => ba.peakToMeanRatio));
      const avgPeakToMean = activeBarAnalyses.reduce((acc, ba) => acc + ba.peakToMeanRatio, 0) / activeBarAnalyses.length;

      // Unpitched percussive discrimination (drums, beatbox, silence):
      // If signal is quiet OR chroma distribution is flat across all bars:
      if (avgRms < 0.005 || (avgPeakToMean < 1.9 && maxPeakToMean < 2.2)) {
        return RelationalHarmonicEngine.getDefaultJamPreset();
      }

      // Pass 1: Pitched audio detected, compute initial chord matches
      const initialMatches = barAnalyses.map((ba) => matchBestTriadChord(ba.chroma));

      // Pass 2: Infer global key center
      const keyInfo = inferKeyAndScales(initialMatches);

      // Pass 3: Relational Two-Pass Reconciliation:
      // Disambiguate chords using the inferred diatonic key center
      const reconciledChords = initialMatches.map((m, idx) => {
        // If a bar was silent or below gate, infer diatonic harmony for that bar
        if (m.rootIndex < 0 || m.score <= 0) {
          if (keyInfo.mode === 'minor') {
            const defaultProg = [
              { root: noteNameToPitchClass(keyInfo.rootNote), minor: true },
              { root: (noteNameToPitchClass(keyInfo.rootNote) + 8) % 12, minor: false }, // VI
              { root: (noteNameToPitchClass(keyInfo.rootNote) + 3) % 12, minor: false }, // III
              { root: (noteNameToPitchClass(keyInfo.rootNote) + 10) % 12, minor: false } // VII
            ];
            const def = defaultProg[idx];
            const rName = pitchClassToNoteName(def.root);
            return {
              chord: def.minor ? `${rName}m` : rName,
              rootIndex: def.root,
              rootNote: rName,
              isMinor: def.minor
            };
          } else {
            const defaultProg = [
              { root: noteNameToPitchClass(keyInfo.rootNote), minor: false }, // I
              { root: (noteNameToPitchClass(keyInfo.rootNote) + 7) % 12, minor: false }, // V
              { root: (noteNameToPitchClass(keyInfo.rootNote) + 9) % 12, minor: true },  // vi
              { root: (noteNameToPitchClass(keyInfo.rootNote) + 5) % 12, minor: false }  // IV
            ];
            const def = defaultProg[idx];
            const rName = pitchClassToNoteName(def.root);
            return {
              chord: def.minor ? `${rName}m` : rName,
              rootIndex: def.root,
              rootNote: rName,
              isMinor: def.minor
            };
          }
        }

        // If top candidate is within 25% score of a diatonic alternative, favor diatonic
        const rootK = noteNameToPitchClass(keyInfo.rootNote);
        const diatonicCandidates = m.candidates.filter(c => {
          if (keyInfo.mode === 'minor') {
            const diatonicOffsets = [
              { semitones: 0, minor: true },
              { semitones: 3, minor: false },
              { semitones: 5, minor: true },
              { semitones: 5, minor: false }, // Dorian IV
              { semitones: 7, minor: true },
              { semitones: 7, minor: false }, // Harmonic V
              { semitones: 8, minor: false },
              { semitones: 10, minor: false }
            ];
            return diatonicOffsets.some(d => (rootK + d.semitones) % 12 === c.rootIndex && d.minor === c.isMinor);
          } else {
            const diatonicOffsets = [
              { semitones: 0, minor: false },
              { semitones: 2, minor: true },
              { semitones: 4, minor: true },
              { semitones: 5, minor: false },
              { semitones: 7, minor: false },
              { semitones: 9, minor: true }
            ];
            return diatonicOffsets.some(d => (rootK + d.semitones) % 12 === c.rootIndex && d.minor === c.isMinor);
          }
        });

        if (diatonicCandidates.length > 0) {
          const topDiatonic = diatonicCandidates[0];
          if (topDiatonic.score >= m.score * 0.75) {
            return topDiatonic;
          }
        }

        return m;
      });

      // Assemble 4 BarHarmonicInfo entries
      const bars = [0, 1, 2, 3].map((bIdx) => {
        const rc = reconciledChords[bIdx];
        const targetNotes = [
          rc.rootNote,
          pitchClassToNoteName((rc.rootIndex + (rc.isMinor ? 3 : 4)) % 12),
          pitchClassToNoteName((rc.rootIndex + 7) % 12)
        ];

        const barHarmonicPartial = {
          chord: rc.chord,
          rootNote: rc.rootNote,
          targetNotes
        };

        const targetToneByLevel = {
          junior: resolveLevelTargetTone(barHarmonicPartial, keyInfo.scales.junior, rc.isMinor),
          teen: resolveLevelTargetTone(barHarmonicPartial, keyInfo.scales.teen, rc.isMinor),
          pro: resolveLevelTargetTone(barHarmonicPartial, keyInfo.scales.pro, rc.isMinor)
        };

        const barInfo: BarHarmonicInfo = {
          barIndex: bIdx,
          barNumber: bIdx + 1,
          chord: rc.chord,
          rootNote: rc.rootNote,
          targetNotes,
          primaryTargetNote: rc.rootNote,
          targetToneByLevel
        };
        return barInfo;
      }) as [BarHarmonicInfo, BarHarmonicInfo, BarHarmonicInfo, BarHarmonicInfo];

      // Build complete relational tone matrix
      const toneMatrix = buildRelationalToneMatrix(bars, keyInfo.scales);

      return {
        key: keyInfo.key,
        rootNote: keyInfo.rootNote,
        mode: keyInfo.mode,
        isAcousticOrJamPreset: false,
        bars,
        scales: keyInfo.scales,
        toneMatrix
      };
    } catch (err) {
      console.warn('[RelationalHarmonicEngine] Analysis fallback triggered:', err);
      return RelationalHarmonicEngine.getDefaultJamPreset();
    }
  }

  /**
   * Instance method wrapper for analyzeFourBarAudio
   */
  public analyzeFourBarAudio(buffer: AudioBuffer, bpm: number): FourBarProgression {
    return RelationalHarmonicEngine.analyzeFourBarAudio(buffer, bpm);
  }

  /**
   * Evaluates key and didactic scales from matched chords
   */
  public static inferKeyAndScales(
    matchedChords: Array<{ rootIndex: number; isMinor: boolean; chord: string; rootNote: string }>
  ): {
    key: string;
    rootNote: string;
    mode: 'minor' | 'major';
    scales: DidacticScales;
  } {
    return inferKeyAndScales(matchedChords);
  }

  /**
   * Sound preview synthesizer: warm, gentle Rhodes E-Piano (Sine fundamental + soft Triangle overtone)
   */
  public static playTonePreview(ctx: AudioContext, noteName: string): void {
    try {
      if (!ctx || ctx.state === 'closed' || typeof ctx.createOscillator !== 'function') return;
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        ctx.resume().catch(() => {});
      }

      const freq = noteNameToFreq(noteName);
      if (!freq || freq <= 0) return;

      const now = Math.max(ctx.currentTime, 0.001);
      const osc1 = ctx.createOscillator(); // Sine fundamental
      const osc2 = ctx.createOscillator(); // Triangle harmonic
      const tineGain = ctx.createGain();   // Harmonic attenuator
      const masterVoiceGain = ctx.createGain();

      // Fundamental warm sine
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);

      // Soft octave harmonic triangle for authentic Rhodes tine character
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, now);
      tineGain.gain.setValueAtTime(0.28, now);

      const attack = 0.015;
      const duration = 0.65;
      const peakGain = 0.28;

      masterVoiceGain.gain.setValueAtTime(0.0001, now);
      masterVoiceGain.gain.linearRampToValueAtTime(peakGain, now + attack);
      masterVoiceGain.gain.exponentialRampToValueAtTime(peakGain * 0.40, now + attack + 0.16);
      masterVoiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc1.connect(masterVoiceGain);
      osc2.connect(tineGain);
      tineGain.connect(masterVoiceGain);
      masterVoiceGain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration + 0.05);
      osc2.stop(now + duration + 0.05);

      osc1.onended = () => {
        try {
          masterVoiceGain.disconnect();
          tineGain.disconnect();
        } catch (_) {}
      };
    } catch (e) {
      console.warn('[RelationalHarmonicEngine] Sound preview error:', e);
    }
  }

  /**
   * Instance method wrapper for playTonePreview
   */
  public playTonePreview(ctx: AudioContext, noteName: string): void {
    RelationalHarmonicEngine.playTonePreview(ctx, noteName);
  }
}

/**
 * Standalone helper function for tone preview
 */
export function playTonePreview(ctx: AudioContext, noteName: string): void {
  RelationalHarmonicEngine.playTonePreview(ctx, noteName);
}
