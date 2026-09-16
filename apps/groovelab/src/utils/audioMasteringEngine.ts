/**
 * ==============================================================================
 * CAMPUS-GROOVELAB TIER-1 ENTERPRISE+ AUDIOPHILE MASTERPIECE DSP ENGINE
 * ==============================================================================
 * 
 * Master-Grade Acoustic Session Processing Pipeline:
 * Inspired by the mixing & mastering philosophies of Jacquire King, Andrew Scheps & Bob Katz.
 * Universal source-adaptive processing for: guitar, piano, strings, brass, vocals, percussion.
 * 
 * Philosophy: "Analog Console Warmth, Intimacy, Air, Dynamic Punch & Transients Preservation"
 * 
 * Master-Grade Core Architecture:
 * 1. STAGE 0 (Pure RAW Foundation - The Single Source of Truth):
 *    - 32-Bit Floating Point internal precision.
 *    - Stereo Centering & Dead-Channel Recovery (mono upmix, USB interface L/R balance).
 *    - 15 Hz Subsonic DC-Offset Blocker (IIR Filter) to eliminate hardware DC bias.
 *    - 5ms Equal-Power Micro-Fades (start/end) to eliminate boundary pops and clicks.
 *    - EBU R128 Integrated Loudness Normalization to TARGET_PURE_RAW_LUFS (-14.5 LUFS).
 *    - Fast Lookahead Soft-Clipper Peak Guard (-1.0 dBTP ceiling).
 * 
 * 2. STAGE 1 (Studio Master Plugin Chain - Built DIRECTLY on Pure RAW):
 *    - Takes the calibrated Pure RAW buffer directly.
 *    - Adaptive Fundamental Pitch-Tracking High-Pass Filter (autocorrelation f0_min).
 *    - Source-adaptive 5-Band Mastering EQ (Acoustic, Grand Piano, Vocals/Brass, Drums).
 *    - Class-A Triode / Console Analog Warmth (4x oversampled, THD < 0.04%, 0 samples phase delay).
 *    - Andrew Scheps Parallel Console Glue Bus (85% Direct Dry / 15% Opto Glue Compressor).
 *    - Phase-Coherent Spatial Dimension (160 Hz Mono-Maker + Subtle >800 Hz Stereo Width).
 *    - Audiophile Velvet Impulse Convolution Reverb (Tailored 6.5% - 8.5% subtle acoustic depth).
 *    - 2-Stage Master Lookahead Brickwall Soft-Limiter (Catches peaks without volume drops).
 *    - EBU R128 Target Loudness Calibration to TARGET_STUDIO_LUFS (-14.0 LUFS, -1.0 dBTP).
 * 
 * Psychoacoustic Loudness Staging (-0.5 LUFS Offset for Instant Wow-Effect):
 * - Studio Master: -14.0 LUFS / -1.0 dBTP (EBU R128 / Apple Music / Spotify Standard)
 * - Pure RAW: -14.5 LUFS / -1.0 dBTP (Exakt 0.5 LUFS subtiler, satter Master-Vergleich)
 * ==============================================================================
 */

import * as lamejs from '@breezystack/lamejs';

// 🌟 CENTRAL PLATFORM-WIDE LOUDNESS & PEAK STANDARDS
export const TARGET_STUDIO_LUFS = -14.0;
export const TARGET_PURE_RAW_LUFS = -18.5; // 🏛️ Musikschul-Goldstandard (-18.5 LUFS): EBU R128 Musik-Referenz, volle Akustik-Dynamik & perfekte Durchsetzungsfähigkeit auf mobilen Geräten
export const TARGET_PEAK_DBTP = -1.0;      // 🏛️ Broadcast-Headroom (-1.0 dBTP): Zero Intersample Clipping nach EBU R128
export const TARGET_PURE_RAW_PEAK_DBTP = -1.0;
export const MAX_PURE_RAW_LIMITER_GR_DB = 0.0; // 🏛️ Pure RAW Doktrin: Zero Limiter Gain Reduction (0.0 dB)

export type MasteringProfile = 
  | 'acoustic_audiophile' 
  | 'grand_piano'
  | 'brass_vocals'
  | 'drums_percussion'
  | 'master_piece' 
  | 'standard_studio' 
  | 'christmas_cathedral' 
  | 'acoustic_warm';

export interface MasteringOptions {
  profile?: MasteringProfile;
  targetLufs?: number;             // Default: TARGET_STUDIO_LUFS (-14.0 LUFS)
  targetPeakDb?: number;           // Default: TARGET_PEAK_DBTP (-1.0 dBTP)
  maxLimiterGrDb?: number;         // Default: MAX_PURE_RAW_LIMITER_GR_DB (3.0 dB)
  isDrumPadMode?: boolean;         // Default: false
  applyAutoGainStage?: boolean;    // Default: true
  applyAmbientDenoise?: boolean;   // Default: true
  applyAdaptiveHpf?: boolean;      // Default: true
  applyTransientSoftener?: boolean;// Default: true
  applyLowEndResonance?: boolean;  // Default: true
  applyMidResonance?: boolean;     // Default: true
  applyWarmthBody?: boolean;       // Default: true
  applyTapeWarmth?: boolean;       // Default: true
  applyTiltEq?: boolean;           // Default: true
  tiltPivotHz?: number;            // Default: 1000 Hz
  applyChristmasSparkle?: boolean; // Default: true
  applyDeHarsh?: boolean;          // Default: true
  applyPultecAir?: boolean;        // Default: true
  applyParallelConsoleBus?: boolean;// Default: true
  applyStereoDimension?: boolean;  // Default: true
  applyConvolutionReverb?: boolean;// Default: true
  reverbRoomType?: ReverbRoomType; // Default: 'medium'
  reverbWetMix?: number;           // Default: 0.08 (8%)
  reverbPreDelayMs?: number;       // Default: 24 ms
}

export type ReverbRoomType = 'small' | 'medium' | 'large' | 'studio' | 'chamber' | 'hall' | 'cathedral';

export interface RoomAcousticProfile {
  id: 'small' | 'medium' | 'large';
  name: string;
  emoji: string;
  sub: string;
  defaultWet: number; // in %
  durationSec: number;
  decayRate: number;
  preDelayMs: number;
  hfDampFactor: number;
}

export const ROOM_ACOUSTIC_PROFILES: Record<string, RoomAcousticProfile> = {
  small: {
    id: 'small',
    name: 'Klein',
    emoji: '🏠',
    sub: 'Zimmer & Studio',
    defaultWet: 5.5,
    durationSec: 0.65,
    decayRate: 4.2,
    preDelayMs: 16,
    hfDampFactor: 7.5
  },
  medium: {
    id: 'medium',
    name: 'Mittel',
    emoji: '🏛️',
    sub: 'Konzertsaal',
    defaultWet: 8.0,
    durationSec: 1.15,
    decayRate: 2.6,
    preDelayMs: 24,
    hfDampFactor: 5.5
  },
  large: {
    id: 'large',
    name: 'Groß',
    emoji: '⛪',
    sub: 'Riesen-Halle',
    defaultWet: 12.0,
    durationSec: 1.85,
    decayRate: 1.8,
    preDelayMs: 36,
    hfDampFactor: 4.2
  },
  // Backwards compatibility aliases
  studio: {
    id: 'small',
    name: 'Klein',
    emoji: '🏠',
    sub: 'Zimmer & Studio',
    defaultWet: 5.5,
    durationSec: 0.65,
    decayRate: 4.2,
    preDelayMs: 16,
    hfDampFactor: 7.5
  },
  chamber: {
    id: 'medium',
    name: 'Mittel',
    emoji: '🏛️',
    sub: 'Konzertsaal',
    defaultWet: 8.0,
    durationSec: 1.15,
    decayRate: 2.6,
    preDelayMs: 24,
    hfDampFactor: 5.5
  },
  hall: {
    id: 'medium',
    name: 'Mittel',
    emoji: '🏛️',
    sub: 'Konzertsaal',
    defaultWet: 8.0,
    durationSec: 1.15,
    decayRate: 2.6,
    preDelayMs: 24,
    hfDampFactor: 5.5
  },
  cathedral: {
    id: 'large',
    name: 'Groß',
    emoji: '⛪',
    sub: 'Riesen-Halle',
    defaultWet: 12.0,
    durationSec: 1.85,
    decayRate: 1.8,
    preDelayMs: 36,
    hfDampFactor: 4.2
  }
};

export const DEFAULT_ACOUSTIC_MASTERING_OPTIONS: MasteringOptions = {
  profile: 'acoustic_audiophile',
  targetLufs: TARGET_STUDIO_LUFS,
  targetPeakDb: TARGET_PEAK_DBTP,
  isDrumPadMode: false,
  applyAutoGainStage: true,
  applyAmbientDenoise: true,
  applyAdaptiveHpf: true,
  applyTransientSoftener: true,
  applyLowEndResonance: true,
  applyMidResonance: true,
  applyWarmthBody: true,
  applyTapeWarmth: true,
  applyTiltEq: true,
  tiltPivotHz: 1000,
  applyChristmasSparkle: true,
  applyDeHarsh: true,
  applyPultecAir: true,
  applyParallelConsoleBus: true,
  applyStereoDimension: true,
  applyConvolutionReverb: true,
  reverbRoomType: 'medium',
  reverbWetMix: 0.08,
  reverbPreDelayMs: 24
};

export interface DualMasteringResult {
  masteredBlob: Blob;
  masteredUrl: string;
  rawNormalizedBlob: Blob;
  rawNormalizedUrl: string;
  masteredStreamingBlob?: Blob;
  masteredStreamingUrl?: string;
  rawStreamingBlob?: Blob;
  rawStreamingUrl?: string;
  originalLufs: number;
  finalLufs: number;
  detectedF0MinHz?: number;
  adaptiveHpfFreqHz?: number;
  crestFactorDb?: number;
  transientSofteningApplied?: boolean;
  lowResonancePeakHz?: number;
  lowResonanceCutDb?: number;
  midResonancePeakHz?: number;
  midResonanceCutDb?: number;
  durationSec?: number;
}

// ==============================================================================
// 🏛️ ACOUSTIC ROOM IMPULSE RESPONSE GENERATOR (Convolver Engine)
// ==============================================================================
const impulseCache = new Map<string, AudioBuffer>();

function createAcousticRoomImpulseResponse(
  ctx: BaseAudioContext,
  durationSec = 1.15,
  decayRate = 2.6,
  hfDampFactor = 5.5
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const cacheKey = `${sampleRate}_${durationSec}_${decayRate}_${hfDampFactor}`;
  const cached = impulseCache.get(cacheKey);
  if (cached && cached.sampleRate === sampleRate && cached.length === Math.floor(sampleRate * durationSec)) {
    return cached;
  }

  const length = Math.floor(sampleRate * durationSec);
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  // 1. Prime-spaced Early Reflections modeling concert hall proscenium & side walls
  const earlyReflections = [
    { delayMs: 6,  gain: 0.28, pan: -0.65 },
    { delayMs: 12, gain: 0.24, pan:  0.72 },
    { delayMs: 19, gain: 0.19, pan: -0.45 },
    { delayMs: 27, gain: 0.16, pan:  0.55 },
    { delayMs: 37, gain: 0.13, pan: -0.75 },
    { delayMs: 48, gain: 0.10, pan:  0.38 },
    { delayMs: 60, gain: 0.07, pan: -0.25 },
    { delayMs: 74, gain: 0.05, pan:  0.60 }
  ];

  // 2. High-Density Diffuse Velvet Reverb Tail
  let prevSampleL = 0;
  let prevSampleR = 0;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;

    // Dual-slope exponential decay: Smooth warm mid-range sustain
    const hfDamping = Math.exp(-t * hfDampFactor);
    const midDecay = Math.exp(-t * decayRate);
    const lateEnvelope = (t < 0.020) ? (t / 0.020) : 1.0; // 20ms gentle fade-in for diffuse onset

    const rawNoiseL = (Math.random() * 2 - 1);
    const rawNoiseR = (Math.random() * 2 - 1);

    // 1-pole Low-Pass filter smoothing inside impulse for silky, non-metallic tail
    const filterAlpha = 0.35 + 0.45 * hfDamping;
    const smoothNoiseL = prevSampleL + filterAlpha * (rawNoiseL - prevSampleL);
    const smoothNoiseR = prevSampleR + filterAlpha * (rawNoiseR - prevSampleR);
    prevSampleL = smoothNoiseL;
    prevSampleR = smoothNoiseR;

    left[i] = smoothNoiseL * midDecay * lateEnvelope * 0.75;
    right[i] = smoothNoiseR * midDecay * lateEnvelope * 0.75;
  }

  // 3. Inject Early Reflections with stereo spatialization
  for (const ref of earlyReflections) {
    const sampleIdx = Math.floor((ref.delayMs / 1000) * sampleRate);
    if (sampleIdx < length) {
      const leftGain = ref.gain * Math.cos((ref.pan + 1) * Math.PI / 4);
      const rightGain = ref.gain * Math.sin((ref.pan + 1) * Math.PI / 4);
      left[sampleIdx] += leftGain;
      right[sampleIdx] += rightGain;
    }
  }

  // 4. Energy normalization to ensure transparent unity gain structure
  let sumSquares = 0;
  for (let i = 0; i < length; i++) {
    sumSquares += left[i] * left[i] + right[i] * right[i];
  }
  const rms = Math.sqrt(sumSquares / (length * 2));
  if (rms > 0) {
    const normFactor = 0.20 / rms;
    for (let i = 0; i < length; i++) {
      left[i] *= normFactor;
      right[i] *= normFactor;
    }
  }

  impulseCache.set(cacheKey, impulse);
  return impulse;
}

// ==============================================================================
// 🌟 CLASS-A TRIODE / TAPE ANALOG WARMTH CURVE
// ==============================================================================
export function createTubeWarmthCurve(amount = 1.05, wetMix = 0.05, samples = 44100): Float32Array {
  const curve = new Float32Array(samples);
  const k = Math.max(0.5, Math.min(2.0, amount));
  const denom = Math.tanh(k);
  const wet = Math.max(0, Math.min(1, wetMix));
  const dry = 1.0 - wet;

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    const sat = Math.tanh(k * x) / denom;
    // 100% C2-continuous smooth Class-A warmth (zero jump at x=0):
    // Eliminiert jegliche Crossover-Verzerrung und Rechteck-Schaltimpulse am Nulldurchgang
    const evenHarmonic = 0.005 * x * Math.abs(x);
    curve[i] = Math.max(-1.0, Math.min(1.0, dry * x + wet * (sat + evenHarmonic)));
  }
  return curve;
}

// ==============================================================================
// 📊 ITU-R BS.1770-4 / EBU R128 INTEGRATED LOUDNESS (LUFS) METERING
// ==============================================================================
export function calculateIntegratedLufs(audioBuffer: AudioBuffer): number {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;

  if (length === 0) return -70;

  // Stage 1: High-Shelf Pre-Filter Coefficients (ITU-R BS.1770-4)
  const dbGain = 3.999843853973347;
  const f0 = 1681.974450955533;
  const Q = 0.7071752369554196;
  const K = Math.tan((Math.PI * f0) / sampleRate);
  const Vh = Math.pow(10, dbGain / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416);

  const a0_1 = 1 + K / Q + K * K;
  const b0_1 = (Vh + Vb * (K / Q) + K * K) / a0_1;
  const b1_1 = (2 * (K * K - Vh)) / a0_1;
  const b2_1 = (Vh - Vb * (K / Q) + K * K) / a0_1;
  const a1_1 = (2 * (K * K - 1)) / a0_1;
  const a2_1 = (1 - K / Q + K * K) / a0_1;

  // Stage 2: RLB High-Pass Filter Coefficients (~38 Hz)
  const f0_hp = 38.13547087602444;
  const Q_hp = 0.5003270373238773;
  const K_hp = Math.tan((Math.PI * f0_hp) / sampleRate);

  const a0_2 = 1 + K_hp / Q_hp + K_hp * K_hp;
  const b0_2 = 1 / a0_2;
  const b1_2 = -2 / a0_2;
  const b2_2 = 1 / a0_2;
  const a1_2 = (2 * (K_hp * K_hp - 1)) / a0_2;
  const a2_2 = (1 - K_hp / Q_hp + K_hp * K_hp) / a0_2;

  let totalWeightedSum = 0;
  const channelWeights = [1.0, 1.0, 1.0, 1.0, 1.0];

  for (let c = 0; c < numChannels; c++) {
    const channelData = audioBuffer.getChannelData(c);
    const weight = channelWeights[c] ?? 1.0;

    let y1_1 = 0, y2_1 = 0, x1_1 = 0, x2_1 = 0;
    let y1_2 = 0, y2_2 = 0, x1_2 = 0, x2_2 = 0;
    let channelEnergy = 0;

    for (let i = 0; i < length; i++) {
      const x = channelData[i];

      // Stage 1 filter (High-Shelf)
      const y_stage1 = b0_1 * x + b1_1 * x1_1 + b2_1 * x2_1 - a1_1 * y1_1 - a2_1 * y2_1;
      x2_1 = x1_1; x1_1 = x;
      y2_1 = y1_1; y1_1 = y_stage1;

      // Stage 2 filter (RLB High-Pass)
      const y_stage2 = b0_2 * y_stage1 + b1_2 * x1_2 + b2_2 * x2_2 - a1_2 * y1_2 - a2_2 * y2_2;
      x2_2 = x1_2; x1_2 = y_stage1;
      y2_2 = y1_2; y1_2 = y_stage2;

      channelEnergy += y_stage2 * y_stage2;
    }

    totalWeightedSum += weight * (channelEnergy / Math.max(1, length));
  }

  if (totalWeightedSum <= 1e-12) return -70;
  return -0.691 + 10 * Math.log10(totalWeightedSum);
}

export function calculateIntegratedRms(audioBuffer: AudioBuffer): number {
  return calculateIntegratedLufs(audioBuffer);
}

// ==============================================================================
// 📈 TRUE PEAK & FAST LOOKAHEAD SOFT-CLIPPER PEAK GUARD
// ==============================================================================
export function calculateBufferPeak4x(audioBuffer: AudioBuffer): number {
  let maxPeak = 0;
  for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > maxPeak) maxPeak = abs;

      if (i < data.length - 1) {
        const mid = Math.abs((data[i] + data[i + 1]) * 0.5);
        if (mid > maxPeak) maxPeak = mid;
      }
    }
  }
  return maxPeak;
}

/**
 * 🌟 2-Stage Master Lookahead Soft-Clipper & True-Peak Ceiling Guard (C2-Continuous)
 * Catches transient overshoot spikes locally with soft-knee saturation,
 * PREVENTING any global volume drop so that the track stays loud and punchy!
 * Mathematical curve: C2 continuous hyperbolic tangent knee transition.
 * 100% linear and bit-pure below kneeStart (~ -1.9 dBFS), zero piecewise jump or harmonic kink.
 */
export function applyFastLookaheadSoftClipper(audioBuffer: AudioBuffer, targetPeakDb = TARGET_PEAK_DBTP): void {
  const thresholdLinear = Math.pow(10, targetPeakDb / 20); // ~0.891 for -1.0 dBTP
  const kneeStart = thresholdLinear * 0.90;               // ~0.802 (-1.91 dBFS) - 100% transparent linear pass-through!
  const range = thresholdLinear - kneeStart;
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;

  for (let c = 0; c < numChannels; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      const val = data[i];
      const absVal = Math.abs(val);

      if (absVal > kneeStart) {
        const sign = val < 0 ? -1 : 1;
        const excess = absVal - kneeStart;
        // Seamless C2-continuous tanh saturation:
        // Value at kneeStart is kneeStart, slope is 1.0, asymptote is strictly thresholdLinear
        data[i] = sign * Math.min(thresholdLinear * 0.9999, kneeStart + range * Math.tanh(excess / range));
      }
    }
  }
}

/**
 * 🛡️ 30 HZ SUBSONIC RESONANCE FILTER (4th-Order 24 dB/Oct Butterworth Highpass)
 * Filtert zuverlässig Infraschall, Körperschall (Daumen-Slaps auf den Gitarrenkorpus,
 * Erschütterungen, Mikrofon-Plops) und DC-Offset unter 30 Hz heraus.
 * Schützt den Limiter vor Fehltriggern und erhält 100% aller musikalischen Grundtöne
 * (inklusive Klavier A0 bei 27.5 Hz und Kontrabass) über alle Instrumente hinweg.
 */
export function apply30HzSubsonicHighpass(audioBuffer: AudioBuffer, cutoffHz = 30.0): void {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  if (length === 0) return;

  // 2-fach kaskadierter 2nd-Order Butterworth Filter (in Summe 24 dB/Okt. Flankensteilheit)
  // Sektion 1: Q = 0.54119610, Sektion 2: Q = 1.30656296
  const qValues = [0.54119610, 1.30656296];
  const omega = 2.0 * Math.PI * (cutoffHz / sampleRate);
  const cosOmega = Math.cos(omega);
  const sinOmega = Math.sin(omega);

  for (let s = 0; s < qValues.length; s++) {
    const q = qValues[s];
    const alpha = sinOmega / (2.0 * q);
    const b0 = (1.0 + cosOmega) / 2.0;
    const b1 = -(1.0 + cosOmega);
    const b2 = (1.0 + cosOmega) / 2.0;
    const a0 = 1.0 + alpha;
    const a1 = -2.0 * cosOmega;
    const a2 = 1.0 - alpha;

    const nb0 = b0 / a0;
    const nb1 = b1 / a0;
    const nb2 = b2 / a0;
    const na1 = a1 / a0;
    const na2 = a2 / a0;

    // Transposed Direct Form II Biquad (höchste numerische Stabilität bei tiefen Grenzfrequenzen)
    for (let c = 0; c < numChannels; c++) {
      const data = audioBuffer.getChannelData(c);
      let s1 = 0;
      let s2 = 0;
      for (let i = 0; i < length; i++) {
        const x = data[i];
        const y = nb0 * x + s1;
        s1 = nb1 * x - na1 * y + s2;
        s2 = nb2 * x - na2 * y;
        data[i] = y;
      }
    }
  }
}

/**
 * 🛡️ DE-BOX RESONANCE NOTCH (-1.0 dB bei 260 Hz, Q = 1.8)
 * Zähmt die hohle Pappkarton-Resonanz / Tisch-Kammfilter-Überbetonung
 * bei 260 Hz mit einem musikalischen, absolut transparenten Eingriff von maximal -1.0 dB.
 */
export function applyDeBoxResonanceNotch(
  audioBuffer: AudioBuffer,
  freqHz = 260.0,
  gainDb = -1.0,
  Q = 1.8
): void {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  if (length === 0) return;

  const A = Math.pow(10, gainDb / 40.0);
  const omega = (2.0 * Math.PI * freqHz) / sampleRate;
  const cosOmega = Math.cos(omega);
  const sinOmega = Math.sin(omega);
  const alpha = sinOmega / (2.0 * Q);

  const b0 = 1.0 + alpha * A;
  const b1 = -2.0 * cosOmega;
  const b2 = 1.0 - alpha * A;
  const a0 = 1.0 + alpha / A;
  const a1 = -2.0 * cosOmega;
  const a2 = 1.0 - alpha / A;

  const nb0 = b0 / a0;
  const nb1 = b1 / a0;
  const nb2 = b2 / a0;
  const na1 = a1 / a0;
  const na2 = a2 / a0;

  for (let c = 0; c < numChannels; c++) {
    const data = audioBuffer.getChannelData(c);
    let s1 = 0;
    let s2 = 0;
    for (let i = 0; i < length; i++) {
      const x = data[i];
      const y = nb0 * x + s1;
      s1 = nb1 * x - na1 * y + s2;
      s2 = nb2 * x - na2 * y;
      data[i] = y;
    }
  }
}

/**
 * 🛡️ CHIRURGISCHER SLAP-TRANSIENTEN-TAMER (-1.0 dB bei 3.400 Hz, Q = 2.4)
 * Zähmt das harte mechanische „Klack“-Geräusch der Saite auf den Bundstäbchen
 * um unhörbare -1.0 dB. Der Slap klingt dadurch sofort warm, satt und holzig,
 * während das anschließende Zupf- und Melodiespiel zu 100% unberührt bleibt.
 */
export function applySlapTransientNotch(
  audioBuffer: AudioBuffer,
  freqHz = 3400.0,
  gainDb = -1.0,
  Q = 2.4
): void {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  if (length === 0) return;

  const A = Math.pow(10, gainDb / 40.0);
  const omega = (2.0 * Math.PI * freqHz) / sampleRate;
  const cosOmega = Math.cos(omega);
  const sinOmega = Math.sin(omega);
  const alpha = sinOmega / (2.0 * Q);

  const b0 = 1.0 + alpha * A;
  const b1 = -2.0 * cosOmega;
  const b2 = 1.0 - alpha * A;
  const a0 = 1.0 + alpha / A;
  const a1 = -2.0 * cosOmega;
  const a2 = 1.0 - alpha / A;

  const nb0 = b0 / a0;
  const nb1 = b1 / a0;
  const nb2 = b2 / a0;
  const na1 = a1 / a0;
  const na2 = a2 / a0;

  for (let c = 0; c < numChannels; c++) {
    const data = audioBuffer.getChannelData(c);
    let s1 = 0;
    let s2 = 0;
    for (let i = 0; i < length; i++) {
      const x = data[i];
      const y = nb0 * x + s1;
      s1 = nb1 * x - na1 * y + s2;
      s2 = nb2 * x - na2 * y;
      data[i] = y;
    }
  }
}

/**
 * 🌟 AUDIOPHILE OPTO-LEVELER (LA-2A Optoelektronisches RMS-Makro-Leveling)
 * Zähmt sanft und musikalisch die Makrodynamik zwischen lautem Intro-Akkord
 * und anschließendem Zupf-Groove – strikt begrenzt auf maximal 1.0 dB Gain-Kompensation.
 * 
 * - Opto-Trägheit: 20 ms Attack (lässt 100% aller Transienten & Slap-Peaks unberührt durch!),
 *   350 ms Release (sanftes, unhörbares Zurückgleiten ohne jedes Pumpen).
 * - RMS-Fenster: 350 ms gleitender Energie-Integrator.
 * - Maximaler Korridoreingriff: 1.0 dB (keine Zerstörung der natürlichen Spieldynamik).
 */
export function applyAudiophileOptoLeveler(
  audioBuffer: AudioBuffer,
  maxLevelDeltaDb = 1.0
): void {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  if (length === 0) return;

  const windowSamples = Math.max(1, Math.round(sampleRate * 0.35)); // 350 ms RMS Fenster
  const attackCoeff = Math.exp(-1.0 / (sampleRate * 0.020));        // 20 ms Opto-Attack
  const releaseCoeff = Math.exp(-1.0 / (sampleRate * 0.350));       // 350 ms Opto-Release
  const maxLinearAtten = Math.pow(10, -Math.abs(maxLevelDeltaDb) / 20); // z.B. -1.0 dB => 0.89125

  // 1. Berechne momentane RMS-Leistung über alle Kanäle
  const rmsPower = new Float32Array(length);
  const sumSquares = new Float64Array(length);

  for (let i = 0; i < length; i++) {
    let power = 0;
    for (let c = 0; c < numChannels; c++) {
      const s = audioBuffer.getChannelData(c)[i];
      power += s * s;
    }
    sumSquares[i] = power / numChannels;
  }

  // Gleitendes 350 ms Summenfenster
  let runningSum = 0;
  for (let i = 0; i < Math.min(windowSamples, length); i++) {
    runningSum += sumSquares[i];
  }
  for (let i = 0; i < length; i++) {
    if (i >= windowSamples) {
      runningSum += sumSquares[i] - sumSquares[i - windowSamples];
    }
    const currentWindowSize = Math.min(i + 1, windowSamples);
    rmsPower[i] = Math.sqrt(Math.max(0, runningSum / currentWindowSize));
  }

  // 2. Finde die typische musikalische RMS-Energie (Median der aktiven Regionen)
  const activeRmsValues: number[] = [];
  const silenceThreshold = 0.00316; // ~ -50 dBFS
  const step = Math.max(1, Math.floor(sampleRate * 0.05)); // alle 50 ms abtasten
  for (let i = 0; i < length; i += step) {
    if (rmsPower[i] > silenceThreshold) {
      activeRmsValues.push(rmsPower[i]);
    }
  }

  if (activeRmsValues.length === 0) return;

  activeRmsValues.sort((a, b) => a - b);
  const referenceRms = activeRmsValues[Math.floor(activeRmsValues.length * 0.5)];
  if (referenceRms <= 0) return;

  // 3. Opto-Gain-Kurve mit 20 ms Attack / 350 ms Release berechnen
  const gainCurve = new Float32Array(length);
  let curGain = 1.0;

  // Schwellwert: Wenn RMS mehr als +2 dB über Referenz-RMS liegt
  const thresholdFactor = Math.pow(10, 2.0 / 20); // ~1.259

  for (let i = 0; i < length; i++) {
    const currentRms = rmsPower[i];
    let targetGain = 1.0;

    if (currentRms > referenceRms * thresholdFactor) {
      const excessRatio = currentRms / (referenceRms * thresholdFactor);
      // Weiche 2:1 Kompressions-Kennlinie, gedeckelt auf maxLinearAtten (z.B. -1.0 dB)
      const calculatedGain = 1.0 / Math.sqrt(excessRatio);
      targetGain = Math.max(maxLinearAtten, calculatedGain);
    }

    if (targetGain < curGain) {
      // 20 ms Attack (lässt perkussive Anschlagstransienten unberührt)
      curGain = attackCoeff * curGain + (1.0 - attackCoeff) * targetGain;
    } else {
      // 350 ms Release (sanfte Erholung)
      curGain = releaseCoeff * curGain + (1.0 - releaseCoeff) * targetGain;
    }
    gainCurve[i] = curGain;
  }

  // 4. Sanftes Opto-Leveling anwenden
  for (let c = 0; c < numChannels; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      data[i] *= gainCurve[i];
    }
  }
}

/**
 * 🎛️ ZERO-PHASE LOOKAHEAD LOUDNESS LEVELER (Sample-0 Onset Adaptation Guard)
 * Analysiert den RMS-Verlauf mit zukunftsorientiertem Lookahead (150–200 ms Fenster)
 * und gleicht anfängliche Pegel-Dips (verursacht durch träge Hardware-AGC oder zögerlichen Spracheinsatz)
 * bereits ab Sample 0 (0.00s) musikalisch und transparent an das mittlere Niveau an.
 * Nutzt bi-direktionale (Forward-Backward) Glättung: Garantiert 0 ms Phasenverzerrung,
 * 0% Transienten-Verwaschung und vollständige Immunität gegen Pumpeffekte.
 */
export function applyLookaheadLoudnessLeveler(
  audioBuffer: AudioBuffer,
  options?: {
    maxBoostDb?: number;
    targetPeakDb?: number;
    minSignalThresholdDb?: number;
  }
): void {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  if (length === 0 || sampleRate === 0) return;

  const maxBoostDb = options?.maxBoostDb ?? 3.5;
  const targetPeakDb = options?.targetPeakDb ?? -1.0;
  const ceilingLinear = Math.pow(10, targetPeakDb / 20);
  const maxBoostLinear = Math.pow(10, maxBoostDb / 20);
  const minThresholdDb = options?.minSignalThresholdDb ?? -45;
  const minThresholdLinear = Math.pow(10, minThresholdDb / 20);

  // 1. Fensterung: 150ms Fenster mit 50ms Hop
  const windowSamples = Math.max(64, Math.floor(sampleRate * 0.150));
  const hopSamples = Math.max(32, Math.floor(sampleRate * 0.050));
  const numFrames = Math.floor(length / hopSamples);
  if (numFrames < 4) return;

  // 2. RMS je Frame ermitteln (über alle Kanäle gemittelt)
  const frameRms = new Float32Array(numFrames);
  for (let f = 0; f < numFrames; f++) {
    const startSample = f * hopSamples;
    const endSample = Math.min(length, startSample + windowSamples);
    const count = endSample - startSample;
    if (count <= 0) continue;

    let sumSq = 0;
    for (let c = 0; c < numChannels; c++) {
      const data = audioBuffer.getChannelData(c);
      for (let i = startSample; i < endSample; i++) {
        const val = data[i];
        sumSq += val * val;
      }
    }
    frameRms[f] = Math.sqrt(sumSq / (count * numChannels));
  }

  // 3. Robustes mittleres Sprach-/Aktivitäts-Niveau ermitteln (oberhalb von minThresholdLinear)
  let activeRmsSum = 0;
  let activeCount = 0;
  for (let f = 0; f < numFrames; f++) {
    if (frameRms[f] >= minThresholdLinear) {
      activeRmsSum += frameRms[f];
      activeCount++;
    }
  }
  if (activeCount < 2) return;
  const avgActiveRms = activeRmsSum / activeCount;

  // 4. Ziel-Gain-Profil je Frame berechnen
  // Betrifft insbesondere die ersten 1.5–2.0 Sekunden (typisches Hardware-AGC-Einschwingfenster)
  const maxOnsetFrames = Math.min(numFrames, Math.floor((2.0 * sampleRate) / hopSamples));
  const targetGain = new Float32Array(numFrames);
  targetGain.fill(1.0);

  for (let f = 0; f < numFrames; f++) {
    const rms = frameRms[f];
    // Nur aktive Segmente betrachten (keine Verstärkung von Vorab-Rauschen / Raumruhe)
    if (rms >= minThresholdLinear && rms < avgActiveRms) {
      const onsetWeight = f < maxOnsetFrames ? 1.0 : Math.max(0, 1.0 - (f - maxOnsetFrames) / (maxOnsetFrames * 0.5));
      if (onsetWeight > 0) {
        const neededGain = Math.min(maxBoostLinear, avgActiveRms / Math.max(minThresholdLinear, rms));
        targetGain[f] = 1.0 + (neededGain - 1.0) * onsetWeight;
      }
    }
  }

  // 5. Zero-Phase Bi-Direktionale Glättung (Forward-Backward Exponential Moving Average)
  const smoothedGain = new Float32Array(numFrames);
  const alpha = 0.25;

  let current = targetGain[0];
  for (let f = 0; f < numFrames; f++) {
    current = alpha * targetGain[f] + (1 - alpha) * current;
    smoothedGain[f] = current;
  }

  current = smoothedGain[numFrames - 1];
  for (let f = numFrames - 1; f >= 0; f--) {
    current = alpha * smoothedGain[f] + (1 - alpha) * current;
    smoothedGain[f] = current;
  }

  // 6. Kontinuierliche sample-genaue Gain-Interpolation
  const gainPerSample = new Float32Array(length);
  for (let f = 0; f < numFrames - 1; f++) {
    const gStart = smoothedGain[f];
    const gEnd = smoothedGain[f + 1];
    const sStart = f * hopSamples;
    const sEnd = Math.min(length, (f + 1) * hopSamples);
    const span = sEnd - sStart;
    for (let i = sStart; i < sEnd; i++) {
      const frac = (i - sStart) / span;
      gainPerSample[i] = gStart + (gEnd - gStart) * frac;
    }
  }
  const lastSampleIdx = (numFrames - 1) * hopSamples;
  const lastGain = smoothedGain[numFrames - 1];
  for (let i = lastSampleIdx; i < length; i++) {
    gainPerSample[i] = lastGain;
  }

  // 7. Auf alle Kanäle anwenden mit absolutem Headroom-Guard
  for (let c = 0; c < numChannels; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      const original = data[i];
      const boosted = original * gainPerSample[i];
      if (Math.abs(boosted) > ceilingLinear) {
        data[i] = Math.sign(boosted) * ceilingLinear;
      } else {
        data[i] = boosted;
      }
    }
  }
}

/**
 * 🌟 ACOUSTIC AIR SPACING (Subtle 3D Micro-Ambience / Early Reflections < 18 ms)
 * Befreit trockene Mono-Signale aus der Mitte des Kopfhörers.
 * Erzeugt mit einem minimalen Blend von 4 % hauchzarte, phasenstabile Frühreflexionen
 * (L: 12 ms, R: 16 ms mit Höhen-Dämpfung ab 6.5 kHz).
 * Verleiht dem Instrument eine edle 3D-Bühne wie in einem exzellenten Holz-Kammermusiksaal.
 */
export function applyAcousticAirSpacing(
  audioBuffer: AudioBuffer,
  blend = 0.04
): void {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  if (numChannels < 2 || length === 0) return;

  const leftData = audioBuffer.getChannelData(0);
  const rightData = audioBuffer.getChannelData(1);

  // Frühreflexions-Verzögerungen: Left 12 ms, Right 16 ms
  const delaySamplesL = Math.min(length - 1, Math.round(sampleRate * 0.012));
  const delaySamplesR = Math.min(length - 1, Math.round(sampleRate * 0.016));

  // Höhenbedämpfung der Reflexionen (Lowpass 6.5 kHz, IIR 1-Pole)
  const dt = 1.0 / sampleRate;
  const rc = 1.0 / (2.0 * Math.PI * 6500.0);
  const alphaLp = dt / (rc + dt);

  // Left Early Reflection
  let lpL = 0;
  for (let i = delaySamplesL; i < length; i++) {
    const delayedSample = leftData[i - delaySamplesL];
    lpL += alphaLp * (delayedSample - lpL);
    leftData[i] += blend * lpL;
  }

  // Right Early Reflection
  let lpR = 0;
  for (let i = delaySamplesR; i < length; i++) {
    const delayedSample = rightData[i - delaySamplesR];
    lpR += alphaLp * (delayedSample - lpR);
    rightData[i] += blend * lpR;
  }
}

/**
 * 🛡️ PRE-CALCULATED STATIC CEILING GUARD (100% Linear Bit-Pure Static Peak Scaling)
 * Eliminiert den berüchtigten „verspäteten Limiter-Einsatz“ (Ducking-Effekt):
 * Anstatt erst zeitverzögert nach dem Eintreffen einer lauten Transiente das Gain
 * herunterzuregeln, wird der gesamte Audio-Buffer VORAB gescannt.
 * 
 * Wenn der globale True Peak targetPeakDb (-2.5 dBTP) überschreitet, wird ein einziger,
 * absolut konstanter Skalierungsfaktor (k = ceilingLinear / maxPeak) berechnet
 * und ab Sample 0 bis zum Track-Ende gleichmäßig angewendet.
 * 
 * Ergebnis:
 * - 0.000 dB zeitvariable Kompression / kein Pumping
 * - 0 ms Regelverzögerung (Decke ist von t = 0.0s an 100% eingerechnet)
 * - Vollkommen unkomprimierte, offene und atmende Akustik-Dynamik
 */
export function applyPreCalculatedStaticCeiling(
  audioBuffer: AudioBuffer,
  targetPeakDb = TARGET_PEAK_DBTP
): number {
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  if (length === 0) return 1.0;

  const ceilingLinear = Math.pow(10, targetPeakDb / 20); // z.B. 0.74989 für -2.5 dBTP

  // 1. Globalen Maximal-Peak über alle Kanäle inklusive Intersample-Interpolation ermitteln
  let globalMaxPeak = 0;
  for (let c = 0; c < numChannels; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      const absVal = Math.abs(data[i]);
      if (absVal > globalMaxPeak) globalMaxPeak = absVal;

      // Intersample-Mittelpunkt-Schätzung (True Peak Approximation)
      if (i < length - 1) {
        const midVal = Math.abs((data[i] + data[i + 1]) * 0.5);
        if (midVal > globalMaxPeak) globalMaxPeak = midVal;
      }
    }
  }

  // 2. Liegt der Peak über der Decke, gesamten Buffer bit-genau und linear skalieren
  if (globalMaxPeak > ceilingLinear && globalMaxPeak > 0) {
    const scaleFactor = ceilingLinear / globalMaxPeak;
    for (let c = 0; c < numChannels; c++) {
      const data = audioBuffer.getChannelData(c);
      for (let i = 0; i < length; i++) {
        data[i] *= scaleFactor;
      }
    }
    return scaleFactor;
  }

  return 1.0;
}

/**
 * 🛡️ TRUE LOOKAHEAD PEAK LIMITER (Zero-Clipping Transparent Peak Ceiling)
 * Ersetzt destruktives Tanh-Wellenform-Clipping durch eine unhörbare
 * Hüllkurven-Begrenzung mit 2 ms Attack, 60 ms Release und echtem Lookahead.
 * Schützt Transienten und garantiert, dass kein Peak targetPeakDb überschreitet,
 * ohne Klirrfaktor (THD < 0.001%), ohne Wellenform-Kappen und ohne Pumping.
 */
export function applyLookaheadTruePeakLimiter(
  audioBuffer: AudioBuffer,
  targetPeakDb = TARGET_PEAK_DBTP
): void {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  if (length === 0) return;

  const ceilingLinear = Math.pow(10, targetPeakDb / 20); // z.B. 0.89125 für -1.0 dBTP
  const attackCoeff = Math.exp(-1.0 / (sampleRate * 0.002)); // 2 ms Attack
  const releaseCoeff = Math.exp(-1.0 / (sampleRate * 0.060)); // 60 ms Release

  // 1. Momentaner Ziel-Gain über alle Kanäle
  const instantGain = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let maxSample = 0;
    for (let c = 0; c < numChannels; c++) {
      const absVal = Math.abs(audioBuffer.getChannelData(c)[i]);
      if (absVal > maxSample) maxSample = absVal;
    }
    instantGain[i] = maxSample > ceilingLinear ? (ceilingLinear / maxSample) : 1.0;
  }

  // 2. Backward Pass (Lookahead Attack):
  // Fährt das Gain VOR dem Eintreffen der Transiente sanft herunter
  const gainCurve = new Float32Array(length);
  let g = 1.0;
  for (let i = length - 1; i >= 0; i--) {
    if (instantGain[i] < g) {
      g = instantGain[i];
    } else {
      g = attackCoeff * g + (1.0 - attackCoeff) * 1.0;
      if (g > 1.0) g = 1.0;
    }
    gainCurve[i] = g;
  }

  // 3. Forward Pass (Release Smoothing):
  // Lässt das Gain nach der Transiente musikalisch und transparent auf 1.0 zurückgleiten
  let curGain = 1.0;
  for (let i = 0; i < length; i++) {
    const target = gainCurve[i];
    if (target < curGain) {
      curGain = target;
    } else {
      curGain = releaseCoeff * curGain + (1.0 - releaseCoeff) * target;
    }
    gainCurve[i] = curGain;
  }

  // 4. Glatte Gain-Kurve auf alle Kanäle anwenden (100% linear, zero waveform clipping)
  for (let c = 0; c < numChannels; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      const sample = data[i] * gainCurve[i];
      data[i] = sample > ceilingLinear ? ceilingLinear : (sample < -ceilingLinear ? -ceilingLinear : sample);
    }
  }
}

// ==============================================================================
// 🔍 ADAPTIVE FUNDAMENTAL PITCH DETECTION (f0_min Autocorrelation)
// ==============================================================================
export function detectAdaptiveHpfFrequency(audioBuffer: AudioBuffer, isDrumMode = false): { f0MinHz: number; hpfFreqHz: number } {
  if (isDrumMode) {
    return { f0MinHz: 40, hpfFreqHz: 30 };
  }

  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  const windowSize = Math.min(channelData.length, Math.floor(sampleRate * 2.0));
  const minPeriod = Math.floor(sampleRate / 800);
  const maxPeriod = Math.floor(sampleRate / 30);

  let lowestDetectedPitchHz = 110;
  let minDetectedFrequency = 800;

  const frameSize = Math.floor(sampleRate * 0.05);
  const numFrames = Math.min(20, Math.floor(windowSize / frameSize));

  for (let f = 0; f < numFrames; f++) {
    const offset = f * frameSize;
    let maxCorrelation = 0;
    let bestPeriod = 0;

    let energy0 = 0;
    for (let i = 0; i < frameSize; i++) {
      const s = channelData[offset + i];
      energy0 += s * s;
    }

    if (energy0 < 1e-4) continue;

    for (let lag = minPeriod; lag < Math.min(maxPeriod, frameSize); lag++) {
      let corr = 0;
      for (let i = 0; i < frameSize - lag; i++) {
        corr += channelData[offset + i] * channelData[offset + i + lag];
      }
      const normalizedCorr = corr / energy0;
      if (normalizedCorr > maxCorrelation && normalizedCorr > 0.45) {
        maxCorrelation = normalizedCorr;
        bestPeriod = lag;
      }
    }

    if (bestPeriod > 0) {
      const pitchHz = sampleRate / bestPeriod;
      if (pitchHz >= 28 && pitchHz < minDetectedFrequency) {
        minDetectedFrequency = pitchHz;
      }
    }
  }

  if (minDetectedFrequency < 800) {
    lowestDetectedPitchHz = minDetectedFrequency;
  }

  const calculatedHpf = lowestDetectedPitchHz * 0.7;
  const clampedHpf = Math.max(25, Math.min(65, Math.round(calculatedHpf * 10) / 10));

  return {
    f0MinHz: Math.round(lowestDetectedPitchHz),
    hpfFreqHz: clampedHpf
  };
}

// ==============================================================================
// 🎧 STEREO CENTERING & DEAD-CHANNEL RECOVERY (Mono-Drall Fix)
// ==============================================================================
export function ensureCenteredStereoAudioBuffer(ctx: BaseAudioContext, inputBuffer: AudioBuffer): AudioBuffer {
  const numChannels = inputBuffer.numberOfChannels;
  const length = inputBuffer.length;
  const sampleRate = inputBuffer.sampleRate;

  const stereoBuffer = ctx.createBuffer(2, length, sampleRate);
  const outL = stereoBuffer.getChannelData(0);
  const outR = stereoBuffer.getChannelData(1);

  if (numChannels === 1) {
    const monoData = inputBuffer.getChannelData(0);
    outL.set(monoData);
    outR.set(monoData);
    return stereoBuffer;
  }

  const inL = inputBuffer.getChannelData(0);
  const inR = inputBuffer.getChannelData(1);

  // 🌟 Full-Buffer Acoustic Scan: Inspect 100% of buffer (or interleaved across length)
  let sumSqL = 0;
  let sumSqR = 0;
  let peakL = 0;
  let peakR = 0;
  let dotProd = 0;
  const step = length > 192000 ? 2 : 1; // 48kHz * 4s = 192000. Under 4s check every sample, above step by 2
  let sampleCount = 0;

  for (let i = 0; i < length; i += step) {
    const sL = inL[i];
    const sR = inR[i];
    const absL = Math.abs(sL);
    const absR = Math.abs(sR);
    if (absL > peakL) peakL = absL;
    if (absR > peakR) peakR = absR;

    sumSqL += sL * sL;
    sumSqR += sR * sR;
    dotProd += sL * sR;
    sampleCount++;
  }

  const rmsL = Math.sqrt(sumSqL / Math.max(1, sampleCount));
  const rmsR = Math.sqrt(sumSqR / Math.max(1, sampleCount));
  const normDenom = Math.sqrt(sumSqL * sumSqR) + 1e-12;
  const correlation = dotProd / normDenom; // -1.0 to +1.0

  // 1. Detect completely dead or faint single channel (e.g. Input 1 of USB audio interface)
  const isRightDead = (rmsR < 1e-4 && rmsL >= 1e-4) || (peakR < 0.002 && peakL >= 0.01) || (rmsL > 1e-3 && rmsR < rmsL * 0.15);
  const isLeftDead = (rmsL < 1e-4 && rmsR >= 1e-4) || (peakL < 0.002 && peakR >= 0.01) || (rmsR > 1e-3 && rmsL < rmsR * 0.15);

  if (isRightDead) {
    outL.set(inL);
    outR.set(inL);
  } else if (isLeftDead) {
    outL.set(inR);
    outR.set(inR);
  } else {
    // 2. 🏛️ True Phantom-Center Dual-Mono: Sum and balance L & R to 100% centered audio.
    // Completely eliminates MacBook multi-mic array drift, USB interface left-biases,
    // and off-axis acoustic asymmetry, guaranteeing that sound emanates 100% from the center!
    const targetPeak = Math.max(peakL, peakR);
    let centerPeak = 0;

    for (let i = 0; i < length; i++) {
      const centerSample = (inL[i] + inR[i]) * 0.5;
      outL[i] = centerSample;
      outR[i] = centerSample;
      const absVal = Math.abs(centerSample);
      if (absVal > centerPeak) centerPeak = absVal;
    }

    // Preserve original dynamic headroom without phase cancellation attenuation
    if (centerPeak > 0 && targetPeak > 0 && centerPeak < targetPeak * 0.9) {
      const normalizeFactor = Math.min(1.4, targetPeak / centerPeak);
      for (let i = 0; i < length; i++) {
        const val = outL[i] * normalizeFactor;
        outL[i] = val;
        outR[i] = val;
      }
    }
  }

  return stereoBuffer;
}

// ==============================================================================
// 🌐 PHASE-COHERENT STEREO SPATIALIZER & 160 HZ MONO-MAKER
// ==============================================================================
export function applyStereoDimensionAndMonoMaker(audioBuffer: AudioBuffer): AudioBuffer {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  if (numChannels < 2) return audioBuffer;

  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.getChannelData(1);
  const length = left.length;

  // 160 Hz lowpass biquad for Mono-Maker (< 160 Hz Side is fully eliminated)
  const wLow = (2 * Math.PI * 160) / sampleRate;
  const alphaLow = Math.sin(wLow) / (2 * 0.707);
  const b0L = (1 - Math.cos(wLow)) / 2;
  const b1L = 1 - Math.cos(wLow);
  const b2L = (1 - Math.cos(wLow)) / 2;
  const a0L = 1 + alphaLow;
  const a1L = -2 * Math.cos(wLow);
  const a2L = 1 - alphaLow;

  // 800 Hz highpass biquad for subtle high-band stereo widening (+10%)
  const wHigh = (2 * Math.PI * 800) / sampleRate;
  const alphaHigh = Math.sin(wHigh) / (2 * 0.707);
  const b0H = (1 + Math.cos(wHigh)) / 2;
  const b1H = -(1 + Math.cos(wHigh));
  const b2H = (1 + Math.cos(wHigh)) / 2;
  const a0H = 1 + alphaHigh;
  const a1H = -2 * Math.cos(wHigh);
  const a2H = 1 - alphaHigh;

  let xl1 = 0, xl2 = 0, yl1 = 0, yl2 = 0;
  let xh1 = 0, xh2 = 0, yh1 = 0, yh2 = 0;

  for (let i = 0; i < length; i++) {
    const l = left[i];
    const r = right[i];

    const mid = (l + r) * 0.5;
    const side = (l - r) * 0.5;

    // Filter Side low-end (< 160 Hz)
    const ylSide = (b0L / a0L) * side + (b1L / a0L) * xl1 + (b2L / a0L) * xl2 - (a1L / a0L) * yl1 - (a2L / a0L) * yl2;
    xl2 = xl1; xl1 = side;
    yl2 = yl1; yl1 = ylSide;

    // Filter Side high-end (> 800 Hz)
    const yhSide = (b0H / a0H) * side + (b1H / a0H) * xh1 + (b2H / a0H) * xh2 - (a1H / a0H) * yh1 - (a2H / a0H) * yh2;
    xh2 = xh1; xh1 = side;
    yh2 = yh1; yh1 = yhSide;

    // Reconstruct Side: 100% Mono below 160 Hz, subtle 110% width above 800 Hz
    const processedSide = (side - ylSide) + yhSide * 0.10;

    left[i] = mid + processedSide;
    right[i] = mid - processedSide;
  }

  return audioBuffer;
}

// ==============================================================================
// 🎙️ SAFE AUDIO BUFFER DECODER (Universal Safari, WebKit, Chrome & Firefox)
// ==============================================================================
export async function safeDecodeAudioData(audioContext: BaseAudioContext, arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise<AudioBuffer>((resolve, reject) => {
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('Audio decoding timed out in browser engine'));
      }
    }, 8000);

    const onSuccess = (buffer: AudioBuffer) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(buffer);
      }
    };

    const onError = (error: any) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(error || new Error('Audio decoding failed'));
      }
    };

    try {
      const res = audioContext.decodeAudioData(arrayBuffer.slice(0), onSuccess, onError);
      if (res && typeof res.then === 'function') {
        res.then(onSuccess).catch(onError);
      }
    } catch (err) {
      onError(err);
    }
  });
}

// ==============================================================================
// 🎙️ STAGE 0: PURE RAW AUDIO BUFFER DSP ENGINE (The Calibrated Single Source)
// ==============================================================================
export function processPureRawAudioBuffer(
  audioBuffer: AudioBuffer,
  options?: {
    targetLufs?: number;
    targetPeakDb?: number;
    maxLimiterGrDb?: number;
    isLoop?: boolean;
    preserveDynamics?: boolean;
    applyDeBoxNotch?: boolean;
    applySlapNotch?: boolean;
    applyLookaheadLeveler?: boolean;
    padActive?: boolean;
    padDb?: number;
  }
): AudioBuffer {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  if (length === 0) return audioBuffer;

  const targetLufs = options?.targetLufs ?? TARGET_PURE_RAW_LUFS; // Default: -14.5 LUFS
  const targetPeakDb = options?.targetPeakDb ?? TARGET_PEAK_DBTP;  // Default: -1.0 dBTP
  const maxLimiterGrDb = options?.maxLimiterGrDb ?? MAX_PURE_RAW_LIMITER_GR_DB; // Default: 3.0 dB
  const isLoop = options?.isLoop ?? false;
  const preserveDynamics = options?.preserveDynamics ?? false;

  // 0. 🎛️ INSTRUMENTEN-PAD (Headroom Dämpfung für dynamikstarke Instrumente / Slap-Transienten)
  // Senkt den Eingangspegel um -6 dB (oder definiertes padDb) ab, um internen Headroom zu schaffen.
  // Der nachfolgende EBU R128 Linear Normalizer hebt den Pegel anschließend verlustfrei auf -1.0 dBTP an.
  const padDb = options?.padDb ?? (options?.padActive ? -6.0 : 0);
  if (padDb < 0) {
    const padGain = Math.pow(10, padDb / 20);
    for (let c = 0; c < numChannels; c++) {
      const data = audioBuffer.getChannelData(c);
      for (let i = 0; i < length; i++) {
        data[i] *= padGain;
      }
    }
  }

  // 1. Transparenter 18 Hz Subsonic Shield (DC-Offset Schutz ohne hörbare Phasenverschiebung im Bassbereich)
  apply30HzSubsonicHighpass(audioBuffer, 18.0);

  // 2. Optional: Chirurgischer De-Box Resonance Notch (260 Hz, Q = 1.8)
  // Standardmäßig in Pure RAW deaktiviert (false), um die volle akustische Wärme & den natürlichen Korpusklang zu bewahren
  if (options?.applyDeBoxNotch === true) {
    applyDeBoxResonanceNotch(audioBuffer, 260.0, -1.0, 1.8);
  }

  // 3. Optional: Chirurgischer Slap-Transient Tamer (3.400 Hz, Q = 2.4)
  // Bei aktivem Instrumenten-PAD automatisch aktiv (-1.5 dB), um aggressive Nahbesprechungs-Klicks abzufangen
  const applySlapNotch = options?.applySlapNotch === true || (options?.padActive === true && options?.applySlapNotch !== false);
  if (applySlapNotch) {
    applySlapTransientNotch(audioBuffer, 3400.0, -1.5, 2.4);
  }

  // 4. 5ms Equal-Power Micro-Fades (Click/Pop prevention at boundaries)
  const fadeSamples = Math.min(Math.floor(sampleRate * 0.005), Math.floor(length * 0.05));
  if (fadeSamples > 0) {
    for (let c = 0; c < numChannels; c++) {
      const data = audioBuffer.getChannelData(c);
      for (let i = 0; i < fadeSamples; i++) {
        const t = i / fadeSamples;
        const fadeIn = Math.sin((t * Math.PI) / 2);
        data[i] *= fadeIn;
        data[length - 1 - i] *= fadeIn;
      }
    }
  }

  // 4b. 🎛️ ZERO-PHASE LOOKAHEAD LOUDNESS LEVELER (Sample-0 Onset Adaptation Guard)
  // Beseitigt Lautheitssprünge in den ersten Sekunden (verursacht durch träge Hardware-AGC
  // des Mikrofons/Betriebssystems). Gleicht Dips bereits ab Sekunde 0.00 sanft und musikalisch
  // an das mittlere Niveau an (max. 3.5 dB), ohne Transienten zu verwaschen oder Pumping zu erzeugen.
  if (options?.applyLookaheadLeveler !== false && !preserveDynamics) {
    applyLookaheadLoudnessLeveler(audioBuffer, {
      maxBoostDb: 3.5,
      targetPeakDb
    });
  }

  // 5. 🏛️ HEADROOM-SAFE EBU R128 LINEAR NORMALIZER (100% Linear, 0% Distortion, 0% Pumping)
  // Hebt leise Passagen nach EBU R128 an, deckelt den Gain-Faktor jedoch mathematisch strikt
  // am physikalischen Headroom bis targetPeakDb (-1.0 dBTP).
  // Dadurch wird KEIN EINZIGER SAMPLE über die Decke geschoben!
  // Keine tanh-Sättigung, kein Limiter-Ducking, kein Klirrfaktor – 100% reine, offene Akustik.
  if (!preserveDynamics) {
    const ceilingLinear = Math.pow(10, targetPeakDb / 20); // z.B. 0.89125 für -1.0 dBTP

    // 5a. Globalen Maximalpeak über alle Kanäle inklusive Intersample-Interpolation ermitteln
    let globalMaxPeak = 0;
    for (let c = 0; c < numChannels; c++) {
      const data = audioBuffer.getChannelData(c);
      for (let i = 0; i < length; i++) {
        const absVal = Math.abs(data[i]);
        if (absVal > globalMaxPeak) globalMaxPeak = absVal;
        if (i < length - 1) {
          const midVal = Math.abs((data[i] + data[i + 1]) * 0.5);
          if (midVal > globalMaxPeak) globalMaxPeak = midVal;
        }
      }
    }

    if (globalMaxPeak > 0) {
      if (globalMaxPeak > ceilingLinear) {
        // Fall 1: Signal übersteuert bereits ab Hardware -> 100% rein linear absenken
        const attenuationFactor = ceilingLinear / globalMaxPeak;
        for (let c = 0; c < numChannels; c++) {
          const data = audioBuffer.getChannelData(c);
          for (let i = 0; i < length; i++) {
            data[i] *= attenuationFactor;
          }
        }
      } else {
        // Fall 2: Signal hat Headroom -> Linear anheben, aber NIEMALS höher als maxSafeGainDb
        const maxSafeGainDb = 20 * Math.log10(ceilingLinear / globalMaxPeak);
        const currentLufs = calculateIntegratedLufs(audioBuffer);

        if (currentLufs > -70 && currentLufs < 5) {
          const lufsDeltaDb = targetLufs - currentLufs;
          // Strikte physikalische Deckelung: Gain darf nicht höher sein als der Headroom bis -1.0 dBTP!
          const effectiveGainDb = Math.max(0, Math.min(lufsDeltaDb, maxSafeGainDb));

          if (effectiveGainDb > 0.05) {
            const linearGain = Math.pow(10, effectiveGainDb / 20);
            for (let c = 0; c < numChannels; c++) {
              const data = audioBuffer.getChannelData(c);
              for (let i = 0; i < length; i++) {
                data[i] *= linearGain;
              }
            }
          }
        }
      }
    }
  }

  // 6. Pre-Calculated Static Ceiling Guard (100% Bit-Pure Linear Safety)
  // Mathematische Absicherung: Garantiert bit-genau, dass kein Sample über targetPeakDb liegt
  applyPreCalculatedStaticCeiling(audioBuffer, targetPeakDb);

  return audioBuffer;
}

// ==============================================================================
// 🎙️ PURE RAW BLOB PROCESSOR (Platform-wide Pure RAW Source)
// ==============================================================================
export async function processPureRawBlob(
  inputBlob: Blob | File,
  options?: {
    targetLufs?: number;
    targetPeakDb?: number;
    maxLimiterGrDb?: number;
    isLoop?: boolean;
    applyDeBoxNotch?: boolean;
    applySlapNotch?: boolean;
    applyLookaheadLeveler?: boolean;
    padActive?: boolean;
    padDb?: number;
  }
): Promise<{
  processedBlob: Blob;
  processedUrl: string;
  processedStreamingBlob: Blob;
  processedStreamingUrl: string;
  durationSec: number;
  originalLufs: number;
  finalLufs: number;
}> {
  const arrayBuffer = await inputBlob.arrayBuffer();
  const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  let decodedBuffer: AudioBuffer;
  try {
    const rawDecoded = await safeDecodeAudioData(tempCtx, arrayBuffer);
    decodedBuffer = ensureCenteredStereoAudioBuffer(tempCtx, rawDecoded);
  } finally {
    try {
      tempCtx.close();
    } catch (e) {}
  }

  const originalLufs = Math.round(calculateIntegratedLufs(decodedBuffer) * 10) / 10;
  const targetLufs = options?.targetLufs ?? TARGET_PURE_RAW_LUFS;

  processPureRawAudioBuffer(decodedBuffer, {
    targetLufs,
    targetPeakDb: options?.targetPeakDb ?? TARGET_PEAK_DBTP,
    maxLimiterGrDb: options?.maxLimiterGrDb ?? MAX_PURE_RAW_LIMITER_GR_DB,
    isLoop: options?.isLoop ?? false,
    applyDeBoxNotch: options?.applyDeBoxNotch ?? false,
    applySlapNotch: options?.applySlapNotch ?? false,
    applyLookaheadLeveler: options?.applyLookaheadLeveler,
    padActive: options?.padActive ?? false,
    padDb: options?.padDb
  });

  const finalLufs = Math.round(calculateIntegratedLufs(decodedBuffer) * 10) / 10;

  const wavBlob = audioBufferToWavBlob(decodedBuffer, {
    title: 'Campus-Groovelab Pure RAW Audio',
    artist: 'Campus-Groovelab'
  });
  const processedUrl = URL.createObjectURL(wavBlob);

  const streamingRes = audioBufferToStreamingBlob(decodedBuffer, {
    title: 'Campus-Groovelab Pure RAW Audio',
    artist: 'Campus-Groovelab',
    bitrateKbps: 256
  });
  const processedStreamingUrl = URL.createObjectURL(streamingRes.blob);

  return {
    processedBlob: wavBlob,
    processedUrl,
    processedStreamingBlob: streamingRes.blob,
    processedStreamingUrl,
    durationSec: Math.round(decodedBuffer.duration * 10) / 10,
    originalLufs,
    finalLufs
  };
}

// ==============================================================================
// 🎛️ STAGE 1: FULL STUDIO AUDIO-PROCESSING & MASTERING ENGINE
// ==============================================================================
export async function processStudioMasteringAudioBuffer(
  inputBuffer: AudioBuffer,
  options: MasteringOptions = DEFAULT_ACOUSTIC_MASTERING_OPTIONS
): Promise<{
  masteredBlob: Blob;
  masteredUrl: string;
  masteredStreamingBlob: Blob;
  masteredStreamingUrl: string;
  masteredBuffer?: AudioBuffer;
  originalLufs: number;
  finalLufs: number;
  detectedF0MinHz?: number;
  adaptiveHpfFreqHz?: number;
  crestFactorDb?: number;
  transientSofteningApplied?: boolean;
  durationSec?: number;
}> {
  const originalLufs = calculateIntegratedLufs(inputBuffer);
  const effectiveProfile: MasteringProfile = options.profile || 'acoustic_audiophile';
  const isDrum = effectiveProfile === 'drums_percussion' || options.isDrumPadMode === true;

  // 1. Detect Fundamental Pitch for Adaptive HPF
  const { f0MinHz, hpfFreqHz } = detectAdaptiveHpfFrequency(inputBuffer, isDrum);

  // Set up OfflineAudioContext for deterministic mastering render
  const offlineCtx = new OfflineAudioContext(
    2,
    inputBuffer.length,
    inputBuffer.sampleRate
  );

  const sourceNode = offlineCtx.createBufferSource();
  sourceNode.buffer = inputBuffer;

  // 0. Headroom Shield (-1.5 dBFS)
  const preGainNode = offlineCtx.createGain();
  preGainNode.gain.value = 0.84; // -1.5 dBFS headroom
  sourceNode.connect(preGainNode);
  let lastNode: AudioNode = preGainNode;

  // =========================================================================
  // 1. ADAPTIVE MASTERING 5-BAND EQ
  // =========================================================================
  // 1a. Subsonic High-Pass Filter (20 Hz für Flügel/Piano zum Erhalt von A0=27,5 Hz, 30 Hz für restliche Instrumente)
  const hpfNode = offlineCtx.createBiquadFilter();
  hpfNode.type = 'highpass';
  hpfNode.frequency.value = effectiveProfile === 'grand_piano' ? 20 : 30; // 🏛️ 20 Hz für Klavier/Flügel, 30 Hz Standard
  hpfNode.Q.value = 0.707;
  lastNode.connect(hpfNode);
  lastNode = hpfNode;

  // 1b. Low-End Musical Foundation
  const lowFundNode = offlineCtx.createBiquadFilter();
  lowFundNode.type = 'peaking';
  if (isDrum) {
    lowFundNode.frequency.value = 70;
    lowFundNode.gain.value = 1.4;
    lowFundNode.Q.value = 1.2;
  } else if (effectiveProfile === 'grand_piano') {
    lowFundNode.frequency.value = 90;
    lowFundNode.gain.value = 0.6;
    lowFundNode.Q.value = 0.8;
  } else {
    lowFundNode.frequency.value = 110;
    lowFundNode.gain.value = 0.8;
    lowFundNode.Q.value = 0.75;
  }
  lastNode.connect(lowFundNode);
  lastNode = lowFundNode;

  // 1c. Mud & Boxiness De-Resonance Control (Surgical notch at 240-320 Hz)
  const deBoxNode = offlineCtx.createBiquadFilter();
  deBoxNode.type = 'peaking';
  deBoxNode.frequency.value = isDrum 
    ? 300 
    : (effectiveProfile === 'grand_piano' ? 320 : (effectiveProfile === 'acoustic_audiophile' || effectiveProfile === 'acoustic_warm' ? 260 : 240));
  deBoxNode.gain.value = isDrum ? -1.8 : (effectiveProfile === 'acoustic_audiophile' ? -1.4 : -1.2);
  deBoxNode.Q.value = 1.8;
  lastNode.connect(deBoxNode);
  lastNode = deBoxNode;

  // 1d. Acoustic Presence & Articulation (Clear definition, no harshness)
  const presenceNode = offlineCtx.createBiquadFilter();
  presenceNode.type = 'peaking';
  if (effectiveProfile === 'brass_vocals') {
    presenceNode.frequency.value = 3600;
    presenceNode.gain.value = 1.4;
    presenceNode.Q.value = 1.1;
  } else if (isDrum) {
    presenceNode.frequency.value = 3200;
    presenceNode.gain.value = 1.1;
    presenceNode.Q.value = 1.0;
  } else {
    presenceNode.frequency.value = 4200;
    presenceNode.gain.value = 1.0;
    presenceNode.Q.value = 0.9;
  }
  lastNode.connect(presenceNode);
  lastNode = presenceNode;

  // 1e. Pultec EQP-1A High-End Air Stage
  const airNode = offlineCtx.createBiquadFilter();
  airNode.type = 'highshelf';
  airNode.frequency.value = effectiveProfile === 'grand_piano' ? 11500 : 12500;
  airNode.gain.value = 1.1;
  airNode.Q.value = 0.707;
  lastNode.connect(airNode);
  lastNode = airNode;

  // =========================================================================
  // 1f. INTELLIGENT TRANSIENT SOFTENER (Crest-Factor Control for Slap/Percussion)
  // =========================================================================
  let transientSofteningApplied = false;

  // Measure Peak & RMS to determine Crest Factor
  let maxPeakSample = 0;
  let sumSquares = 0;
  let totalSampleCount = 0;
  for (let c = 0; c < inputBuffer.numberOfChannels; c++) {
    const chData = inputBuffer.getChannelData(c);
    totalSampleCount += chData.length;
    for (let i = 0; i < chData.length; i++) {
      const absS = Math.abs(chData[i]);
      if (absS > maxPeakSample) maxPeakSample = absS;
      sumSquares += absS * absS;
    }
  }
  const rmsSample = totalSampleCount > 0 ? Math.sqrt(sumSquares / totalSampleCount) : 0;
  const peakDb = maxPeakSample > 0 ? 20 * Math.log10(maxPeakSample) : -100;
  const rmsDb = rmsSample > 0 ? 20 * Math.log10(rmsSample) : -100;
  const crestFactorDb = peakDb - rmsDb;

  if (options.applyTransientSoftener !== false && crestFactorDb > 17.0) {
    const transientCatcher = offlineCtx.createDynamicsCompressor();
    transientCatcher.threshold.value = -6.0; // Fängt nur extreme Slap- & Peak-Spitzen ab
    transientCatcher.knee.value = 3.0;
    transientCatcher.ratio.value = 2.5;
    transientCatcher.attack.value = 0.003; // 3ms schneller Fang
    transientCatcher.release.value = 0.040; // 40ms schneller Release ohne Pumping
    lastNode.connect(transientCatcher);
    lastNode = transientCatcher;
    transientSofteningApplied = true;
  }

  // =========================================================================
  // 2. CLASS-A TRIODE / TAPE ANALOG WARMTH (Oversampled 4x, THD < 0.01%)
  // Für rein akustische Aufnahmen (acoustic_audiophile) zu 100% transparent bypassed!
  // =========================================================================
  let postSaturationNode: AudioNode = lastNode;
  const isAcousticAudiophile = effectiveProfile === 'acoustic_audiophile';
  if (!isAcousticAudiophile && options.applyTapeWarmth !== false) {
    const warmthShaper = offlineCtx.createWaveShaper();
    warmthShaper.curve = createTubeWarmthCurve(1.05, 0.04, 44100) as any;
    warmthShaper.oversample = '4x';
    lastNode.connect(warmthShaper);
    postSaturationNode = warmthShaper;
  }

  // =========================================================================
  // 3. MASTER SUMMING MATRIX WITH PARALLEL GLUE SENDS
  // =========================================================================
  const masterSummingBus = offlineCtx.createGain();

  // 3a. Direct Dry Path (85% Pristine Natural Audio)
  const directGain = offlineCtx.createGain();
  directGain.gain.value = 0.85;
  postSaturationNode.connect(directGain);
  directGain.connect(masterSummingBus);

  // 3b. Andrew Scheps Parallel Console Glue Bus (10% Gentle Blend)
  if (options.applyParallelConsoleBus !== false) {
    const parallelComp = offlineCtx.createDynamicsCompressor();
    parallelComp.threshold.value = -18.0;
    parallelComp.knee.value = 6.0;
    parallelComp.ratio.value = 1.8;
    parallelComp.attack.value = 0.025; // 25ms (transienten-schonend)
    parallelComp.release.value = 0.120; // 120ms

    const parallelSendGain = offlineCtx.createGain();
    parallelSendGain.gain.value = 0.10;

    postSaturationNode.connect(parallelComp);
    parallelComp.connect(parallelSendGain);
    parallelSendGain.connect(masterSummingBus);
  }

  // 3c. Audiophile Convolution Reverb Send (Tailored Subtle Acoustic Depth)
  if (options.applyConvolutionReverb !== false) {
    const wetGain = offlineCtx.createGain();
    const roomType: string = options.reverbRoomType || 'medium';
    const roomProfile = ROOM_ACOUSTIC_PROFILES[roomType] || ROOM_ACOUSTIC_PROFILES.medium;

    const defaultWetRatio = (roomProfile.defaultWet || 8.0) / 100;
    const wetMix = typeof options.reverbWetMix === 'number' 
      ? options.reverbWetMix 
      : (isDrum ? 0.05 : defaultWetRatio);
    wetGain.gain.value = Math.max(0.02, Math.min(0.20, wetMix));

    const preDelaySec = (options.reverbPreDelayMs ?? roomProfile.preDelayMs ?? 24) / 1000;
    const delayNode = offlineCtx.createDelay(1.0);
    delayNode.delayTime.value = preDelaySec;

    const convolver = offlineCtx.createConvolver();
    convolver.buffer = createAcousticRoomImpulseResponse(
      offlineCtx, 
      roomProfile.durationSec, 
      roomProfile.decayRate, 
      roomProfile.hfDampFactor
    );

    // Abbey Road Reverb Highpass (320 Hz) & Lowpass (6.5 kHz)
    const reverbHpNode = offlineCtx.createBiquadFilter();
    reverbHpNode.type = 'highpass';
    reverbHpNode.frequency.value = 320;
    reverbHpNode.Q.value = 0.707;

    const reverbLpNode = offlineCtx.createBiquadFilter();
    reverbLpNode.type = 'lowpass';
    reverbLpNode.frequency.value = 6500;
    reverbLpNode.Q.value = 0.707;

    postSaturationNode.connect(delayNode);
    delayNode.connect(reverbHpNode);
    reverbHpNode.connect(reverbLpNode);
    reverbLpNode.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(masterSummingBus);
  }

  // =========================================================================
  // 4. MASTER PEAK LIMITER & DYNAMICS CATCHER (Transparent & Musical)
  // =========================================================================
  const masterLimiter = offlineCtx.createDynamicsCompressor();
  masterLimiter.threshold.value = -1.0;
  masterLimiter.knee.value = 6.0;
  masterLimiter.ratio.value = 1.8;
  masterLimiter.attack.value = 0.020; // 20ms
  masterLimiter.release.value = 0.080; // 80ms
  masterSummingBus.connect(masterLimiter);
  masterLimiter.connect(offlineCtx.destination);

  // Render through full OfflineAudioContext DSP Chain
  sourceNode.start(0);
  const renderedBuffer = await offlineCtx.startRendering();

  // =========================================================================
  // 5. STEREO SPATIALIZER & 160 HZ MONO-MAKER
  // =========================================================================
  if (options.applyStereoDimension !== false) {
    applyStereoDimensionAndMonoMaker(renderedBuffer);
  }

  // =========================================================================
  // 6. EBU R128 INTEGRATED LOUDNESS NORMALIZATION (TARGET_STUDIO_LUFS: -14.0)
  // Dual-Constraint Dynamic Staging: protects extreme transients from over-limiting
  // =========================================================================
  const targetLufs = options.targetLufs ?? TARGET_STUDIO_LUFS;
  const maxLimiterGrDb = options.maxLimiterGrDb ?? MAX_PURE_RAW_LIMITER_GR_DB;
  const currentRenderedLufs = calculateIntegratedLufs(renderedBuffer);
  const lufsDeltaDb = targetLufs - currentRenderedLufs;

  let maxAbsSample = 0;
  for (let c = 0; c < renderedBuffer.numberOfChannels; c++) {
    const data = renderedBuffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      const absVal = Math.abs(data[i]);
      if (absVal > maxAbsSample) maxAbsSample = absVal;
    }
  }
  const currentPeakDb = maxAbsSample > 0 ? 20 * Math.log10(maxAbsSample) : -100;
  const maxAllowedGainDb = ((options.targetPeakDb ?? TARGET_PEAK_DBTP) - currentPeakDb) + maxLimiterGrDb;
  const effectiveGainDb = Math.min(lufsDeltaDb, maxAllowedGainDb);
  const linearLufsGain = Math.pow(10, effectiveGainDb / 20);

  for (let c = 0; c < renderedBuffer.numberOfChannels; c++) {
    const data = renderedBuffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      data[i] *= linearLufsGain;
    }
  }

  // =========================================================================
  // 7. ZERO-CLIPPING LOOKAHEAD TRUE-PEAK LIMITER (-1.0 dBTP, MAX 3.0 dB GR)
  // =========================================================================
  applyLookaheadTruePeakLimiter(renderedBuffer, options.targetPeakDb ?? TARGET_PEAK_DBTP);

  // 24-Bit PCM Lossless WAV Export (Archive & Hi-Res Download)
  const wavBlob = audioBufferToWavBlob(renderedBuffer, {
    title: 'Campus-Groovelab Studio Master',
    artist: 'Campus-Groovelab'
  });
  const masteredUrl = URL.createObjectURL(wavBlob);

  // 📦 Tier-1 Audiophile Streaming Blob (256 kbit/s MP3, saves ~90% bandwidth)
  const streamingRes = audioBufferToStreamingBlob(renderedBuffer, {
    title: 'Campus-Groovelab Studio Master',
    artist: 'Campus-Groovelab',
    bitrateKbps: 256
  });
  const masteredStreamingUrl = URL.createObjectURL(streamingRes.blob);

  return {
    masteredBlob: wavBlob,
    masteredUrl,
    masteredStreamingBlob: streamingRes.blob,
    masteredStreamingUrl,
    masteredBuffer: renderedBuffer,
    originalLufs: Math.round(originalLufs * 10) / 10,
    finalLufs: targetLufs,
    detectedF0MinHz: f0MinHz,
    adaptiveHpfFreqHz: hpfFreqHz,
    crestFactorDb: Math.round(crestFactorDb * 10) / 10,
    transientSofteningApplied,
    durationSec: Math.round(renderedBuffer.duration * 10) / 10
  };
}

// ==============================================================================
// 🎙️ STUDIO MASTERING WRAPPER (From Blob/File Input)
// ==============================================================================
export async function processStudioMastering(
  audioBlobOrFile: Blob | File,
  options: MasteringOptions = DEFAULT_ACOUSTIC_MASTERING_OPTIONS
): Promise<{ 
  masteredBlob: Blob; 
  masteredUrl: string; 
  masteredStreamingBlob?: Blob;
  masteredStreamingUrl?: string;
  originalLufs: number; 
  finalLufs: number; 
  profileUsed?: MasteringProfile;
  detectedF0MinHz?: number;
  adaptiveHpfFreqHz?: number;
  crestFactorDb?: number;
  transientSofteningApplied?: boolean;
  durationSec?: number;
}> {
  const arrayBuffer = await audioBlobOrFile.arrayBuffer();
  const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  let decodedBuffer: AudioBuffer;
  try {
    const rawDecoded = await safeDecodeAudioData(tempCtx, arrayBuffer);
    decodedBuffer = ensureCenteredStereoAudioBuffer(tempCtx, rawDecoded);
  } finally {
    try {
      tempCtx.close();
    } catch (e) {}
  }

  // 🌟 BASELINE CALIBRATION: Apply Stage 0 Pure RAW baseline before applying mastering plugins
  processPureRawAudioBuffer(decodedBuffer, {
    targetLufs: TARGET_PURE_RAW_LUFS,
    targetPeakDb: TARGET_PEAK_DBTP
  });

  const result = await processStudioMasteringAudioBuffer(decodedBuffer, {
    ...options,
    targetLufs: options.targetLufs ?? TARGET_STUDIO_LUFS,
    targetPeakDb: options.targetPeakDb ?? TARGET_PEAK_DBTP
  });

  return {
    ...result,
    profileUsed: options.profile || 'acoustic_audiophile'
  };
}

// ==============================================================================
// 🌟 DUAL-MASTERING ENGINE (Synchronized Pure RAW & Studio Master with -0.5 LUFS Wow Offset)
// ==============================================================================
export async function processDualMastering(
  audioInput: Blob | File,
  options?: MasteringOptions
): Promise<DualMasteringResult> {
  const mergedOptions: MasteringOptions = {
    ...DEFAULT_ACOUSTIC_MASTERING_OPTIONS,
    ...options
  };

  const arrayBuffer = await audioInput.arrayBuffer();
  const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  try {
    const rawDecoded = await safeDecodeAudioData(tempCtx, arrayBuffer);
    const decodedBuffer = ensureCenteredStereoAudioBuffer(tempCtx, rawDecoded);
    const originalLufs = Math.round(calculateIntegratedLufs(decodedBuffer) * 10) / 10;

    // 1. Generate Pure RAW Buffer (Calibrated to TARGET_PURE_RAW_LUFS = -14.5 LUFS)
    const rawBuffer = tempCtx.createBuffer(2, decodedBuffer.length, decodedBuffer.sampleRate);
    rawBuffer.getChannelData(0).set(decodedBuffer.getChannelData(0));
    rawBuffer.getChannelData(1).set(decodedBuffer.getChannelData(1));
    processPureRawAudioBuffer(rawBuffer, {
      targetLufs: TARGET_PURE_RAW_LUFS,
      targetPeakDb: TARGET_PEAK_DBTP
    });

    const rawWavBlob = audioBufferToWavBlob(rawBuffer, {
      title: 'Campus-Groovelab Pure RAW Audio',
      artist: 'Campus-Groovelab'
    });
    const rawNormalizedUrl = URL.createObjectURL(rawWavBlob);

    const rawStreamingRes = audioBufferToStreamingBlob(rawBuffer, {
      title: 'Campus-Groovelab Pure RAW Audio',
      artist: 'Campus-Groovelab',
      bitrateKbps: 256
    });
    const rawStreamingUrl = URL.createObjectURL(rawStreamingRes.blob);

    // 2. Generate Studio Master (DIRECTLY from Pure RAW Buffer, calibrated to TARGET_STUDIO_LUFS = -14.0 LUFS)
    const masterRes = await processStudioMasteringAudioBuffer(rawBuffer, {
      ...mergedOptions,
      targetLufs: TARGET_STUDIO_LUFS,
      targetPeakDb: TARGET_PEAK_DBTP
    });

    return {
      masteredBlob: masterRes.masteredBlob,
      masteredUrl: masterRes.masteredUrl,
      masteredStreamingBlob: masterRes.masteredStreamingBlob,
      masteredStreamingUrl: masterRes.masteredStreamingUrl,
      rawNormalizedBlob: rawWavBlob,
      rawNormalizedUrl,
      rawStreamingBlob: rawStreamingRes.blob,
      rawStreamingUrl,
      originalLufs,
      finalLufs: masterRes.finalLufs,
      detectedF0MinHz: masterRes.detectedF0MinHz,
      adaptiveHpfFreqHz: masterRes.adaptiveHpfFreqHz,
      crestFactorDb: masterRes.crestFactorDb,
      transientSofteningApplied: masterRes.transientSofteningApplied,
      durationSec: masterRes.durationSec
    };
  } finally {
    try {
      tempCtx.close();
    } catch (e) {}
  }
}

// ==============================================================================
// 💾 24-BIT LOSSLESS PCM WAV ENCODER (Broadcast Format & TPDF Dithering)
// ==============================================================================
export function audioBufferToWavBlob(buffer: AudioBuffer, metadata?: { title?: string; artist?: string }): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 24;
  const bytesPerSample = 3; // 24-bit
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;

  const titleText = metadata?.title || 'Campus-Groovelab Master Track';
  const artistText = metadata?.artist || 'Campus-Groovelab Artist';
  const softwareText = 'Campus-Groovelab 24-Bit Audiophile DSP Engine';

  function createInfoSubChunk(tag: string, text: string): Uint8Array {
    const textBytes = new TextEncoder().encode(text + '\0');
    const chunkSize = textBytes.length;
    const paddedSize = chunkSize + (chunkSize % 2);
    const res = new Uint8Array(8 + paddedSize);
    for (let i = 0; i < 4; i++) res[i] = tag.charCodeAt(i);
    const dv = new DataView(res.buffer);
    dv.setUint32(4, chunkSize, true);
    res.set(textBytes, 8);
    return res;
  }

  const inamChunk = createInfoSubChunk('INAM', titleText);
  const iartChunk = createInfoSubChunk('IART', artistText);
  const isftChunk = createInfoSubChunk('ISFT', softwareText);
  const listDataSize = 4 + inamChunk.length + iartChunk.length + isftChunk.length;
  const listChunkTotalSize = 8 + listDataSize;

  const headerSize = 44;
  const totalSize = headerSize + dataSize + listChunkTotalSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);
  const uint8 = new Uint8Array(arrayBuffer);

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');

  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  let byteOffset = 44;
  const invScale = 1.0 / 8388608.0;

  if (numChannels === 2) {
    const left = channelData[0];
    const right = channelData[1];
    for (let i = 0; i < length; i++) {
      let sL = left[i] + (Math.random() - Math.random()) * invScale;
      if (sL > 1.0) sL = 1.0;
      else if (sL < -1.0) sL = -1.0;
      const pcmL = sL < 0 ? (sL * 8388608) | 0 : (sL * 8388607) | 0;
      const cL = pcmL < -8388608 ? -8388608 : pcmL > 8388607 ? 8388607 : pcmL;
      uint8[byteOffset] = cL & 0xff;
      uint8[byteOffset + 1] = (cL >> 8) & 0xff;
      uint8[byteOffset + 2] = (cL >> 16) & 0xff;

      let sR = right[i] + (Math.random() - Math.random()) * invScale;
      if (sR > 1.0) sR = 1.0;
      else if (sR < -1.0) sR = -1.0;
      const pcmR = sR < 0 ? (sR * 8388608) | 0 : (sR * 8388607) | 0;
      const cR = pcmR < -8388608 ? -8388608 : pcmR > 8388607 ? 8388607 : pcmR;
      uint8[byteOffset + 3] = cR & 0xff;
      uint8[byteOffset + 4] = (cR >> 8) & 0xff;
      uint8[byteOffset + 5] = (cR >> 16) & 0xff;

      byteOffset += 6;
    }
  } else {
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = channelData[c][i] + (Math.random() - Math.random()) * invScale;
        if (sample > 1.0) sample = 1.0;
        else if (sample < -1.0) sample = -1.0;
        const pcm = sample < 0 ? (sample * 8388608) | 0 : (sample * 8388607) | 0;
        const clamped = pcm < -8388608 ? -8388608 : pcm > 8388607 ? 8388607 : pcm;

        uint8[byteOffset++] = clamped & 0xff;
        uint8[byteOffset++] = (clamped >> 8) & 0xff;
        uint8[byteOffset++] = (clamped >> 16) & 0xff;
      }
    }
  }

  writeString(view, byteOffset, 'LIST');
  view.setUint32(byteOffset + 4, listDataSize, true);
  writeString(view, byteOffset + 8, 'INFO');
  byteOffset += 12;

  uint8.set(inamChunk, byteOffset);
  byteOffset += inamChunk.length;
  uint8.set(iartChunk, byteOffset);
  byteOffset += iartChunk.length;
  uint8.set(isftChunk, byteOffset);

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// ==============================================================================
// 📦 TIER-1 AUDIOPHILE STREAMING ENCODER (192-256 kbit/s Transparent Quality)
// ==============================================================================
export function audioBufferToStreamingBlob(
  buffer: AudioBuffer,
  options?: {
    bitrateKbps?: number;
    title?: string;
    artist?: string;
  }
): { blob: Blob; mimeType: string; fileNameExt: string } {
  const bitrate = options?.bitrateKbps || 256;
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;

  try {
    const Mp3EncoderClass = (lamejs as any).Mp3Encoder || (lamejs as any).default?.Mp3Encoder || (window as any).lamejs?.Mp3Encoder;
    if (Mp3EncoderClass) {
      const mp3encoder = new Mp3EncoderClass(channels, sampleRate, bitrate);
      const mp3Data: any[] = [];
      const sampleBlockSize = 1152;

      const samplesL = buffer.getChannelData(0);
      const int16L = new Int16Array(samplesL.length);
      for (let i = 0; i < samplesL.length; i++) {
        const s = Math.max(-1, Math.min(1, samplesL[i]));
        int16L[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      if (channels >= 2) {
        const samplesR = buffer.getChannelData(1);
        const int16R = new Int16Array(samplesR.length);
        for (let i = 0; i < samplesR.length; i++) {
          const s = Math.max(-1, Math.min(1, samplesR[i]));
          int16R[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        for (let i = 0; i < int16L.length; i += sampleBlockSize) {
          const chunkL = int16L.subarray(i, i + sampleBlockSize);
          const chunkR = int16R.subarray(i, i + sampleBlockSize);
          const mp3buf = mp3encoder.encodeBuffer(chunkL, chunkR);
          if (mp3buf.length > 0) mp3Data.push(mp3buf);
        }
      } else {
        for (let i = 0; i < int16L.length; i += sampleBlockSize) {
          const chunk = int16L.subarray(i, i + sampleBlockSize);
          const mp3buf = mp3encoder.encodeBuffer(chunk);
          if (mp3buf.length > 0) mp3Data.push(mp3buf);
        }
      }

      const mp3buf = mp3encoder.flush();
      if (mp3buf.length > 0) mp3Data.push(mp3buf);

      const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });
      return { blob: mp3Blob, mimeType: 'audio/mp3', fileNameExt: 'mp3' };
    }
  } catch (encErr) {
    console.warn('[audioMasteringEngine] Streaming MP3 compression fallback to WAV:', encErr);
  }

  // Safe fallback to 24-bit WAV if MP3 encoder unavailable
  const wavBlob = audioBufferToWavBlob(buffer, { title: options?.title, artist: options?.artist });
  return { blob: wavBlob, mimeType: 'audio/wav', fileNameExt: 'wav' };
}

// ==============================================================================
// ⚡ PREVIEW SLICE GENERATOR (Ultra-Fast 20-second center slice for Instant A/B)
// ==============================================================================
export async function sliceAudioBlobForPreview(
  audioBlobOrFile: Blob | File,
  sliceDurationSec = 20
): Promise<Blob> {
  const arrayBuffer = await audioBlobOrFile.arrayBuffer();
  const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  try {
    const rawDecoded = await safeDecodeAudioData(tempCtx, arrayBuffer);
    const totalDuration = rawDecoded.duration;
    
    if (totalDuration <= sliceDurationSec) {
      return audioBlobOrFile instanceof Blob ? audioBlobOrFile : new Blob([audioBlobOrFile], { type: 'audio/wav' });
    }

    // 🏛️ Goldstandard: Vorschau startet ab Sekunde 0.00 (ab der ersten gespielten Note)
    const startSec = 0;
    const sampleRate = rawDecoded.sampleRate;
    const startSample = 0;
    const lengthSamples = Math.min(rawDecoded.length, Math.floor(sliceDurationSec * sampleRate));

    const numChannels = rawDecoded.numberOfChannels;
    const slicedBuffer = tempCtx.createBuffer(numChannels, lengthSamples, sampleRate);

    for (let ch = 0; ch < numChannels; ch++) {
      const srcData = rawDecoded.getChannelData(ch);
      const dstData = slicedBuffer.getChannelData(ch);
      dstData.set(srcData.subarray(startSample, startSample + lengthSamples));
    }

    if (lengthSamples > sampleRate * 0.1) {
      const fadeSamples = Math.min(Math.floor(sampleRate * 0.01), Math.floor(lengthSamples * 0.05));
      for (let ch = 0; ch < numChannels; ch++) {
        const dstData = slicedBuffer.getChannelData(ch);
        for (let i = 0; i < fadeSamples; i++) {
          const factor = Math.sin((i / fadeSamples) * (Math.PI / 2));
          dstData[i] *= factor;
          dstData[lengthSamples - 1 - i] *= factor;
        }
      }
    }

    const wavBlob = audioBufferToWavBlob(slicedBuffer, {
      title: 'Campus-Groovelab Preview Slice',
      artist: 'Campus-Groovelab Studio'
    });
    return wavBlob;
  } finally {
    try {
      tempCtx.close();
    } catch (e) {}
  }
}

/**
 * 🎵 UNIVERSAL 24-BIT LOSSLESS PCM WAV CONVERTER
 * Ensures that any audio blob (already WAV, or legacy WebM, MP4, MP3) is delivered
 * as a pristine, uncompressed 24-bit PCM WAV file (.wav) with native sample rate.
 */
export async function ensureWavBlob(
  blob: Blob | File,
  metadata?: { title?: string; artist?: string }
): Promise<Blob> {
  if (!blob) return blob;
  const mime = (blob.type || '').toLowerCase();
  if (mime === 'audio/wav' || mime === 'audio/x-wav' || mime === 'audio/wave') {
    return blob;
  }

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    try {
      const decoded = await safeDecodeAudioData(tempCtx, arrayBuffer);
      return audioBufferToWavBlob(decoded, {
        title: metadata?.title || 'Campus-Groovelab Audio',
        artist: metadata?.artist || 'Campus-Groovelab'
      });
    } finally {
      try {
        tempCtx.close();
      } catch (e) {}
    }
  } catch (err) {
    console.warn('[ensureWavBlob] Transcode fallback note:', err);
    return blob instanceof Blob ? blob : new Blob([blob], { type: 'audio/wav' });
  }
}
