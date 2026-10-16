/**
 * 🎵 Polyphone 12-Bin Chroma Pitch-Class-Profile (PCP) Akkord-Engine (FUNC-AUDIT-02 / GRV-25)
 *
 * Deterministische Echtzeit-Akkorderkennung für mehrstimmige VdM-Snippets (CAM-139:
 * Gitarren-/Ukulele-"Magic 4 Chords", Powerchords, Klavier-Dreiklänge) auf Basis
 * einer 12-Halbton-Chroma-Faltung des WebAudio-Frequenzspektrums.
 *
 * 🛡️ EU AI Act Compliance (LEG-23):
 * 100 % deterministische, mathematische DSP-Signalverarbeitung (Kosinus-Ähnlichkeit
 * gegen kanonische Intervall-Templates), 0 % neuronale Netze, 0 % Cloud-Übertragung.
 */

export interface DetectedPolyphonicChord {
  rootNoteGerman: string;
  rootNoteIntl: string;
  quality: 'major' | 'minor' | 'power5' | 'dom7';
  displayGerman: string;
  displayIntl: string;
  confidence: number;
}

const PITCH_NAMES_GERMAN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B', 'H'];
const PITCH_NAMES_INTL = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

interface ChordTemplate {
  quality: 'major' | 'minor' | 'power5' | 'dom7';
  suffixDe: string;
  suffixIntl: string;
  weights: readonly number[];
}

const CHORD_TEMPLATES: readonly ChordTemplate[] = [
  // Dur-Dreiklang (Grundton, große Terz +4, reine Quinte +7)
  { quality: 'major', suffixDe: '-Dur', suffixIntl: '', weights: [1.0, 0, 0, 0, 0.85, 0, 0, 0.9, 0, 0, 0, 0] },
  // Moll-Dreiklang (Grundton, kleine Terz +3, reine Quinte +7)
  { quality: 'minor', suffixDe: '-Moll', suffixIntl: 'm', weights: [1.0, 0, 0, 0.85, 0, 0, 0, 0.9, 0, 0, 0, 0] },
  // Powerchord 5 (Grundton, reine Quinte +7)
  { quality: 'power5', suffixDe: '5', suffixIntl: '5', weights: [1.0, 0, 0, 0, 0, 0, 0, 0.95, 0, 0, 0, 0] },
  // Dominantseptakkord (Grundton, +4, +7, kleine Septime +10)
  { quality: 'dom7', suffixDe: '7', suffixIntl: '7', weights: [1.0, 0, 0, 0, 0.8, 0, 0, 0.8, 0, 0, 0.75, 0] }
];

/**
 * Berechnet aus einem linearen WebAudio-FFT-Magnituden-Array (Float32Array in dB oder ByteFrequencyData)
 * das normierte 12-Bin Chroma Pitch-Class-Profil (C = 0 ... H = 11).
 */
export function computeChromaVectorFromFft(
  fftMagnitudesDb: Float32Array,
  sampleRate: number,
  a4Reference: number = 440
): Float32Array {
  const chroma = new Float32Array(12);
  const fftSize = fftMagnitudesDb.length * 2;
  const binHz = sampleRate / fftSize;

  // Musikalischer Analysebereich für Gitarre/Ukulele/Klavier: 75 Hz (tiefe E2) bis 1.400 Hz
  const minBin = Math.max(1, Math.floor(75 / binHz));
  const maxBin = Math.min(fftMagnitudesDb.length - 1, Math.ceil(1400 / binHz));

  for (let bin = minBin; bin <= maxBin; bin++) {
    const db = fftMagnitudesDb[bin];
    if (db < -68) continue; // Rauschschwelle unterdrücken

    // Lokales Peak-Picking, um Spektral-Leckage zu minimieren
    if (bin > minBin && bin < maxBin) {
      if (db < fftMagnitudesDb[bin - 1] || db < fftMagnitudesDb[bin + 1]) continue;
    }

    const freq = bin * binHz;
    const linearAmp = Math.pow(10, db / 20);
    const midiFloat = 12 * Math.log2(freq / a4Reference) + 69;
    const midiRounded = Math.round(midiFloat);
    const pitchClass = ((midiRounded % 12) + 12) % 12;

    chroma[pitchClass] += linearAmp;
  }

  // L2-Normierung des 12-Bin-Chroma-Vektors
  let normSq = 0;
  for (let i = 0; i < 12; i++) {
    normSq += chroma[i] * chroma[i];
  }
  const norm = Math.sqrt(normSq);
  if (norm > 1e-6) {
    for (let i = 0; i < 12; i++) {
      chroma[i] /= norm;
    }
  }

  return chroma;
}

/**
 * Klassifiziert einen 12-Bin-Chroma-Vektor deterministisch gegen Dur-, Moll-, Power- und Septakkorde.
 */
export function detectPolyphonicChordFromChroma(
  chroma: Float32Array
): DetectedPolyphonicChord | null {
  // Prüfe, ob mindestens 2 verschiedene Pitch-Classes signifikante Energie besitzen (Mehrstimmigkeit)
  let activePitchClasses = 0;
  for (let i = 0; i < 12; i++) {
    if (chroma[i] > 0.28) activePitchClasses++;
  }
  if (activePitchClasses < 2) return null;

  let bestRoot = -1;
  let bestTemplate: ChordTemplate | null = null;
  let bestScore = 0;

  for (let root = 0; root < 12; root++) {
    for (const tpl of CHORD_TEMPLATES) {
      // Für 3-/4-Klänge müssen mindestens 3 Töne aktiv sein
      if (tpl.quality !== 'power5' && activePitchClasses < 3) continue;

      let dot = 0;
      let tplNormSq = 0;
      let penalty = 0;

      for (let i = 0; i < 12; i++) {
        const w = tpl.weights[i];
        const c = chroma[(root + i) % 12];
        dot += w * c;
        tplNormSq += w * w;
        if (w === 0 && c > 0.35) {
          penalty += c * 0.25;
        }
      }

      const score = dot / Math.sqrt(tplNormSq) - penalty;
      if (score > bestScore) {
        bestScore = score;
        bestRoot = root;
        bestTemplate = tpl;
      }
    }
  }

  if (bestRoot === -1 || !bestTemplate || bestScore < 0.72) {
    return null;
  }

  const rootDe = PITCH_NAMES_GERMAN[bestRoot];
  const rootIntl = PITCH_NAMES_INTL[bestRoot];

  return {
    rootNoteGerman: rootDe,
    rootNoteIntl: rootIntl,
    quality: bestTemplate.quality,
    displayGerman: `${rootDe}${bestTemplate.suffixDe}`,
    displayIntl: `${rootIntl}${bestTemplate.suffixIntl}`,
    confidence: Math.min(1, Math.round(bestScore * 100) / 100)
  };
}
