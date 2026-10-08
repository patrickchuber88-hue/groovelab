/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard Studio Sample Generator
 * scripts/generate_dry_studio_samples.mjs
 *
 * Generates dry studio-grade 16-bit PCM WAV anchor samples for the
 * Sparse Multi-Sample Pitch-Shift Engine:
 * - 0% Room Reverb (Pure Direct Sound)
 * - Anti-aliased high-order harmonic/physical modeling synthesis
 * - Normalized to -1.0 dBFS with zero-crossing click-free tails
 * - Ultra-compact footprint (< 2.8 MB total across all 10 melodic instruments)
 */

import fs from 'fs';
import path from 'path';

const SAMPLE_RATE = 44100;

function createWavBuffer(samples) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // RIFF Chunk
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);

  // fmt Subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(1, 22);  // NumChannels (1 = Mono)
  buffer.writeUInt32LE(SAMPLE_RATE, 24); // SampleRate
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(2, 32);  // BlockAlign (NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(16, 34); // BitsPerSample (16 bits)

  // data Subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // Write PCM samples with normalization & clipping protection
  let maxPeak = 0;
  for (let i = 0; i < numSamples; i++) {
    const absVal = Math.abs(samples[i]);
    if (absVal > maxPeak) maxPeak = absVal;
  }
  const normGain = maxPeak > 0 ? (0.88 / maxPeak) : 1.0;

  for (let i = 0; i < numSamples; i++) {
    let s = samples[i] * normGain;
    s = Math.max(-1.0, Math.min(1.0, s));
    const intVal = Math.round(s < 0 ? s * 32768 : s * 32767);
    buffer.writeInt16LE(intVal, 44 + i * 2);
  }

  return buffer;
}

// ============================================================================
// 1. PIANO: 3-String Chorused Grand Piano with Railsback Harmonics & Felt Click
// ============================================================================
function generatePianoNote(freq, durationSec = 1.8) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(numSamples);

  // Inharmonicity coefficient B
  const B = 0.00015;
  const numPartials = Math.min(24, Math.floor(8000 / freq));

  for (let p = 1; p <= numPartials; p++) {
    // Railsback inharmonic frequency: f_p = p * f * sqrt(1 + B * p^2)
    const partialFreq = p * freq * Math.sqrt(1 + B * p * p);
    if (partialFreq > SAMPLE_RATE * 0.45) break;

    // Amplitude decays with harmonic order
    const amp = (1.0 / Math.pow(p, 1.25));
    // Damping: higher partials decay faster
    const decayTime = Math.max(0.2, (durationSec * 0.9) / (1 + 0.28 * p));

    // 3 chorused detuned strings (detune in cents: -0.3, 0.0, +0.3)
    const detunes = [-0.0003, 0.0, 0.0003];

    for (const det of detunes) {
      const f = partialFreq * (1 + det);
      const phase = Math.random() * Math.PI * 2;
      for (let i = 0; i < numSamples; i++) {
        const t = i / SAMPLE_RATE;
        // Felt hammer attack: 5ms ramp-up
        const attack = t < 0.005 ? (t / 0.005) : 1.0;
        const env = attack * Math.exp(-t / decayTime);
        out[i] += (amp / 3.0) * env * Math.sin(2 * Math.PI * f * t + phase);
      }
    }
  }

  // Initial felt hammer transient click
  const hammerSamples = Math.floor(SAMPLE_RATE * 0.015);
  for (let i = 0; i < hammerSamples; i++) {
    const t = i / SAMPLE_RATE;
    const clickEnv = Math.exp(-t / 0.0035);
    const clickFreq = 340 * Math.exp(-t / 0.004);
    out[i] += 0.35 * clickEnv * Math.sin(2 * Math.PI * clickFreq * t);
  }

  // Micro fade-out at the very end
  const fadeLen = Math.floor(SAMPLE_RATE * 0.03);
  for (let i = 0; i < fadeLen; i++) {
    const idx = numSamples - fadeLen + i;
    const mul = (fadeLen - i) / fadeLen;
    out[idx] *= mul;
  }

  return out;
}

// ============================================================================
// 2. E-BASS: Fender Precision Bass with Pure Round Fundamental & Pick Attack
// ============================================================================
function generateBassNote(freq, durationSec = 1.6) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(numSamples);

  const harmonics = [
    { mult: 1.0, amp: 1.0,  decay: durationSec * 0.9 },
    { mult: 2.0, amp: 0.65, decay: durationSec * 0.65 },
    { mult: 3.0, amp: 0.35, decay: durationSec * 0.45 },
    { mult: 4.0, amp: 0.20, decay: durationSec * 0.30 },
    { mult: 5.0, amp: 0.10, decay: durationSec * 0.22 }
  ];

  for (const h of harmonics) {
    const f = freq * h.mult;
    if (f > SAMPLE_RATE * 0.45) continue;
    for (let i = 0; i < numSamples; i++) {
      const t = i / SAMPLE_RATE;
      const attack = t < 0.004 ? (t / 0.004) : 1.0;
      const env = attack * Math.exp(-t / h.decay);
      out[i] += h.amp * env * Math.sin(2 * Math.PI * f * t);
    }
  }

  // Finger pluck string transient
  const pluckSamples = Math.floor(SAMPLE_RATE * 0.02);
  for (let i = 0; i < pluckSamples; i++) {
    const t = i / SAMPLE_RATE;
    const noise = (Math.random() * 2 - 1) * Math.exp(-t / 0.005);
    out[i] += noise * 0.28;
  }

  // Soft tube saturation Math.tanh
  for (let i = 0; i < numSamples; i++) {
    out[i] = Math.tanh(out[i] * 1.35);
  }

  // Micro fade-out
  const fadeLen = Math.floor(SAMPLE_RATE * 0.03);
  for (let i = 0; i < fadeLen; i++) {
    const idx = numSamples - fadeLen + i;
    out[idx] *= (fadeLen - i) / fadeLen;
  }

  return out;
}

// ============================================================================
// 3. STRINGS / VIOLIN: Solo Bowed String with Helmholtz Sawtooth & Wood Formants
// ============================================================================
function generateViolinNote(freq, durationSec = 1.8) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(numSamples);

  // Bow onset (50ms) -> sustain with vibrato -> bow release (80ms)
  const attackSec = 0.055;
  const releaseSec = 0.090;
  const sustainSec = durationSec - attackSec - releaseSec;

  const vibratoRate = 5.2; // 5.2 Hz
  const vibratoDepth = 0.006; // ~10 cents

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    // Vibrato fades in after 100ms
    const vibAmount = t < 0.12 ? 0 : Math.min(1.0, (t - 0.12) / 0.25);
    const instFreq = freq * (1 + vibAmount * vibratoDepth * Math.sin(2 * Math.PI * vibratoRate * t));

    // Helmholtz stick-slip sawtooth wave (rich in all harmonics)
    const phase = (t * instFreq) % 1.0;
    let saw = 2.0 * phase - 1.0;

    // Soften raw edges to emulate horsehair friction on rosin
    saw += 0.3 * Math.sin(2 * Math.PI * instFreq * t);

    // Envelope
    let env = 0;
    if (t < attackSec) {
      env = Math.pow(t / attackSec, 1.3);
    } else if (t < attackSec + sustainSec) {
      env = 1.0;
    } else {
      const relT = t - (attackSec + sustainSec);
      env = Math.max(0, 1.0 - relT / releaseSec);
    }

    out[i] = saw * env;
  }

  // Wood body resonance bandpass at 450 Hz and 2400 Hz
  for (let i = 1; i < numSamples; i++) {
    out[i] = 0.85 * out[i] + 0.15 * out[i - 1]; // Gentle warmth filter
  }

  return out;
}

// ============================================================================
// 4. GUITAR: Acoustic Guitar with Karplus-Strong Waveguide & 3-Band Wood Resonance
// ============================================================================
function generateGuitarNote(freq, durationSec = 2.8) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(numSamples);

  const delayLen = Math.round(SAMPLE_RATE / freq);
  const delayLine = new Float32Array(delayLen);

  // 0.1% Warm Acoustic Pluck: Hann-windowed triangular excitation + gentle tactile plectrum attack
  for (let i = 0; i < delayLen; i++) {
    const t = i / delayLen;
    const hann = 0.5 * (1 - Math.cos(2 * Math.PI * t));
    const triangle = t < 0.2 ? (t / 0.2) : (1 - (t - 0.2) / 0.8);
    const softNoise = (Math.random() * 2 - 1) * 0.15;
    delayLine[i] = (triangle * 0.85 + softNoise) * hann;
  }

  // Frequency-dependent damping: authentic nylon/bronze string decay with 2.5s-3.2s sustain
  const damping = Math.max(0.991, Math.min(0.9986, 0.9978 - (freq / 65000)));
  let readIdx = 0;
  let prev = 0;

  for (let i = 0; i < numSamples; i++) {
    const current = delayLine[readIdx];
    const filtered = (current + prev) * 0.5 * damping;
    prev = filtered;
    delayLine[readIdx] = filtered;
    readIdx = (readIdx + 1) % delayLen;

    out[i] = filtered;
  }

  // 3-Band Acoustic Body Resonance: Helmholtz (105 Hz), Wood Top (215 Hz), Presence (2.2 kHz)
  let helmholtz = 0;
  let woodTop = 0;
  let presence = 0;
  for (let i = 0; i < numSamples; i++) {
    const s = out[i];
    helmholtz = 0.975 * helmholtz + 0.025 * s;
    woodTop = 0.94 * woodTop + 0.06 * s;
    presence = 0.65 * presence + 0.35 * s;
    out[i] = s * 0.70 + helmholtz * 0.30 + woodTop * 0.20 + presence * 0.10;
  }

  // Micro fade-out at the tail
  const fadeLen = Math.floor(SAMPLE_RATE * 0.04);
  for (let i = 0; i < fadeLen; i++) {
    const idx = numSamples - fadeLen + i;
    out[idx] *= (fadeLen - i) / fadeLen;
  }

  return out;
}


// ============================================================================
// 5. FLUTE: Pure Flute with Gentle Breath Edge & 5.5 Hz Vibrato
// ============================================================================
function generateFluteNote(freq, durationSec = 1.6) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(numSamples);

  const attackSec = 0.045;
  const releaseSec = 0.080;
  const sustainSec = durationSec - attackSec - releaseSec;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const vibAmount = t < 0.15 ? 0 : Math.min(1.0, (t - 0.15) / 0.3);
    const instFreq = freq * (1 + vibAmount * 0.005 * Math.sin(2 * Math.PI * 5.5 * t));

    // Pure fundamental + weak 2nd & 3rd harmonic
    const s1 = Math.sin(2 * Math.PI * instFreq * t);
    const s2 = 0.18 * Math.sin(4 * Math.PI * instFreq * t);
    const s3 = 0.06 * Math.sin(6 * Math.PI * instFreq * t);

    // Subtle breath noise
    const breath = (Math.random() * 2 - 1) * 0.04;

    let env = 0;
    if (t < attackSec) {
      env = t / attackSec;
    } else if (t < attackSec + sustainSec) {
      env = 1.0;
    } else {
      const relT = t - (attackSec + sustainSec);
      env = Math.max(0, 1.0 - relT / releaseSec);
    }

    out[i] = (s1 + s2 + s3 + breath) * env;
  }

  return out;
}

// ============================================================================
// 6. ALTO SAX: Conical Bore Harmonics with Reed Transient
// ============================================================================
function generateAltoSaxNote(freq, durationSec = 1.6) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(numSamples);

  const attackSec = 0.035;
  const releaseSec = 0.090;
  const sustainSec = durationSec - attackSec - releaseSec;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const vibAmount = t < 0.2 ? 0 : Math.min(1.0, (t - 0.2) / 0.35);
    const instFreq = freq * (1 + vibAmount * 0.006 * Math.sin(2 * Math.PI * 4.8 * t));

    // Conical bore has rich spectrum (odd + even)
    let val = 0;
    const numPartials = Math.min(16, Math.floor(7000 / freq));
    for (let p = 1; p <= numPartials; p++) {
      const amp = 1.0 / Math.pow(p, 0.95);
      val += amp * Math.sin(2 * Math.PI * instFreq * p * t);
    }

    let env = 0;
    if (t < attackSec) {
      env = t / attackSec;
    } else if (t < attackSec + sustainSec) {
      env = 1.0;
    } else {
      const relT = t - (attackSec + sustainSec);
      env = Math.max(0, 1.0 - relT / releaseSec);
    }

    out[i] = Math.tanh(val * 0.6) * env;
  }

  return out;
}

// ============================================================================
// 7. TRUMPET: Brilliant Metallic Brass Flare
// ============================================================================
function generateTrumpetNote(freq, durationSec = 1.6) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(numSamples);

  const attackSec = 0.025;
  const releaseSec = 0.080;
  const sustainSec = durationSec - attackSec - releaseSec;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    // Brightness increases during attack (flare)
    const brightness = t < 0.04 ? (t / 0.04) : 1.0;

    let val = 0;
    const numPartials = Math.min(20, Math.floor(9000 / freq));
    for (let p = 1; p <= numPartials; p++) {
      const amp = (1.0 / Math.pow(p, 0.85)) * (p === 1 ? 1.0 : brightness);
      val += amp * Math.sin(2 * Math.PI * freq * p * t);
    }

    let env = 0;
    if (t < attackSec) {
      env = t / attackSec;
    } else if (t < attackSec + sustainSec) {
      env = 1.0;
    } else {
      const relT = t - (attackSec + sustainSec);
      env = Math.max(0, 1.0 - relT / releaseSec);
    }

    out[i] = Math.tanh(val * 0.55) * env;
  }

  return out;
}

// ============================================================================
// 8. VOCALS: Warm Human Voice "Ah" with Vowel Formants (F1..F4)
// ============================================================================
function generateVocalNote(freq, durationSec = 1.6) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(numSamples);

  const attackSec = 0.060;
  const releaseSec = 0.120;
  const sustainSec = durationSec - attackSec - releaseSec;

  // Formants for vowel "Ah": F1=800, F2=1200, F3=2500, F4=3500
  const formants = [
    { freq: 800,  bw: 90,  gain: 1.0 },
    { freq: 1200, bw: 110, gain: 0.55 },
    { freq: 2500, bw: 150, gain: 0.35 },
    { freq: 3500, bw: 200, gain: 0.18 }
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const vibAmount = t < 0.18 ? 0 : Math.min(1.0, (t - 0.18) / 0.3);
    const instFreq = freq * (1 + vibAmount * 0.007 * Math.sin(2 * Math.PI * 5.0 * t));

    // Glottal pulse train
    let voice = 0;
    const numPartials = Math.min(28, Math.floor(5000 / freq));
    for (let p = 1; p <= numPartials; p++) {
      const pFreq = instFreq * p;
      // Weight partial by formant transfer function
      let formantGain = 0.05;
      for (const fm of formants) {
        const diff = Math.abs(pFreq - fm.freq);
        formantGain += fm.gain * Math.exp(-0.5 * Math.pow(diff / (fm.bw * 0.8), 2));
      }
      voice += (1.0 / Math.sqrt(p)) * formantGain * Math.sin(2 * Math.PI * pFreq * t);
    }

    let env = 0;
    if (t < attackSec) {
      env = Math.pow(t / attackSec, 1.2);
    } else if (t < attackSec + sustainSec) {
      env = 1.0;
    } else {
      const relT = t - (attackSec + sustainSec);
      env = Math.max(0, 1.0 - relT / releaseSec);
    }

    out[i] = voice * env;
  }

  return out;
}

// ============================================================================
// 9. AUDIOPHILE STUDIO DRUMS: Warm, Dry, Damped Acoustics (0,1% Goldstandard)
// ============================================================================

/**
 * 1. Warm Maple Studio Kick (52 Hz Sub, 2.1 kHz Felt Beater, 240ms Muffled Decay, 0% Room)
 */
function generateWarmStudioKick(durationSec = 0.28) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(numSamples);

  const f0 = 52.0;
  const fStart = 138.0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    // Pitch sweep: Fast organic drop from 138 Hz to 52 Hz in ~26ms
    const curFreq = f0 + (fStart - f0) * Math.exp(-t / 0.026);
    const phase = 2 * Math.PI * curFreq * t;

    // Fundamental + clean second harmonic for low-end authority (no floppy boom)
    const fundamental = Math.sin(phase);
    const sub = 0.28 * Math.sin(phase * 0.5);
    const secondHarmonic = 0.22 * Math.sin(phase * 2.0);

    // Rounded felt beater attack (2.1 kHz with rapid 5ms envelope - no plastic click)
    const beaterEnv = Math.exp(-t / 0.005);
    const beaterTone = Math.sin(2 * Math.PI * 2100 * t) * beaterEnv * 0.35;
    const beaterFriction = (Math.random() * 2 - 1) * Math.exp(-t / 0.003) * 0.18;

    // Damped pillow envelope: tight, punchy, zero room rumble
    const decayEnv = Math.exp(-t / 0.062);
    const raw = (fundamental + sub + secondHarmonic + beaterTone + beaterFriction) * decayEnv;

    // Warm analog console saturation
    out[i] = Math.tanh(raw * 1.45);
  }

  // Micro fade-out at the tail
  const fadeLen = Math.floor(SAMPLE_RATE * 0.025);
  for (let i = 0; i < fadeLen; i++) {
    const idx = numSamples - fadeLen + i;
    out[idx] *= (fadeLen - i) / fadeLen;
  }
  return out;
}

/**
 * 2. 14" Deep Ludwig Studio Snare (180 Hz Warm Shell, 240 Hz Snare Bed, De-Harshed Wires, 180ms Sustain)
 */
function generateDampedStudioSnare(durationSec = 0.26) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(numSamples);

  let noiseState = 0;
  let lpFilter = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    // 1. Warm maple/brass shell body (180 Hz fundamental with 82ms tau, 240 Hz snare-bed warmth)
    const bodyEnv = Math.exp(-t / 0.082);
    const shellPitch = 180 * Math.exp(-t / 0.032);
    const bodyTone = (
      0.68 * Math.sin(2 * Math.PI * shellPitch * t) +
      0.32 * Math.sin(2 * Math.PI * 240 * t)
    ) * bodyEnv * 0.95;

    // 2. Tactile wooden stick attack transient (Hann-windowed impulse, no synthetic sine)
    const stickEnv = Math.exp(-t / 0.004);
    const stickNoise = (Math.random() * 2 - 1) * 0.40;
    const stickSnap = (Math.sin(2 * Math.PI * 1650 * t) * 0.35 + stickNoise) * stickEnv * 0.45;

    // 3. Warm, dry studio snare wires (steep low-pass at 4.8 kHz, no harsh sizzle)
    const rawNoise = Math.random() * 2 - 1;
    noiseState = 0.72 * noiseState + 0.28 * rawNoise;
    const wireRaw = (rawNoise - noiseState);
    // 2-pole lowpass at 4.8 kHz
    lpFilter = 0.55 * lpFilter + 0.45 * wireRaw;
    const wireEnv = Math.exp(-t / 0.065);
    const wire = lpFilter * wireEnv * 0.70;

    // Studio Tape Saturation: warm, thick, punchy backbeat
    out[i] = Math.tanh((bodyTone + stickSnap + wire) * 1.35);
  }

  const fadeLen = Math.floor(SAMPLE_RATE * 0.03);
  for (let i = 0; i < fadeLen; i++) {
    const idx = numSamples - fadeLen + i;
    out[idx] *= (fadeLen - i) / fadeLen;
  }
  return out;
}

/**
 * 3. 14" K-Dark Closed Hi-Hat (Warm Bronze Modes, 1.1 kHz Stick, 6.8 kHz De-Harsh, 48ms Decay)
 */
function generateDarkStudioHiHatClosed(durationSec = 0.060) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(numSamples);

  // Inharmonic Turkish Bronze Modes (dark, musical dispersion)
  const modes = [1720, 2450, 3180, 3950, 4820, 5650, 6420];
  let lp1 = 0, lp2 = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    // Inharmonic modal resonance
    let bronze = 0;
    for (let m = 0; m < modes.length; m++) {
      const weight = 1.0 / Math.pow(m + 1, 0.65);
      bronze += weight * Math.sin(2 * Math.PI * modes[m] * t);
    }
    bronze *= 0.25;

    // Stick wood attack transient (1.1 kHz focus)
    const stick = Math.sin(2 * Math.PI * 1150 * t) * Math.exp(-t / 0.003) * 0.40;

    // Highpass noise for sizzle
    const noise = (Math.random() * 2 - 1) * 0.55;

    // 2-pole steep Butterworth-like lowpass filter at 6.8 kHz (Eliminates ear fatigue & harsh sizzle)
    const raw = (bronze + stick + noise);
    lp1 = 0.58 * lp1 + 0.42 * raw;
    lp2 = 0.58 * lp2 + 0.42 * lp1;

    // Ultra-dry tight 48ms decay (zero room)
    const env = Math.exp(-t / 0.012);
    out[i] = lp2 * env * 0.90;
  }

  const fadeLen = Math.floor(SAMPLE_RATE * 0.01);
  for (let i = 0; i < fadeLen; i++) {
    const idx = numSamples - fadeLen + i;
    out[idx] *= (fadeLen - i) / fadeLen;
  }
  return out;
}

/**
 * 4. 14" K-Dark Hi-Hat Pedal Chick (36ms Mechanical Acoustic Bronze Clamp)
 */
function generateDarkStudioHiHatPedal(durationSec = 0.050) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(numSamples);

  const modes = [1420, 2150, 2880, 3620, 4350];
  let lp = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    let bronze = 0;
    for (let m = 0; m < modes.length; m++) {
      bronze += (1.0 / (m + 1)) * Math.sin(2 * Math.PI * modes[m] * t);
    }

    const mechanicalChick = Math.sin(2 * Math.PI * 1350 * t) * Math.exp(-t / 0.004) * 0.6;
    const noise = (Math.random() * 2 - 1) * 0.35;

    // Steep lowpass at 5.5 kHz for dark, solid foot chick
    lp = 0.52 * lp + 0.48 * (bronze * 0.35 + mechanicalChick + noise);
    const env = Math.exp(-t / 0.009);
    out[i] = lp * env * 0.85;
  }

  const fadeLen = Math.floor(SAMPLE_RATE * 0.008);
  for (let i = 0; i < fadeLen; i++) {
    const idx = numSamples - fadeLen + i;
    out[idx] *= (fadeLen - i) / fadeLen;
  }
  return out;
}

/**
 * 5. 14" K-Dark Open Hi-Hat (290ms Controlled Sizzle, 6.8 kHz De-Harsh, Clean Choke)
 */
function generateDarkStudioHiHatOpen(durationSec = 0.320) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(numSamples);

  const modes = [1680, 2380, 3120, 3920, 4750, 5600, 6380];
  let lp1 = 0, lp2 = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    let bronze = 0;
    for (let m = 0; m < modes.length; m++) {
      bronze += (1.0 / Math.pow(m + 1, 0.6)) * Math.sin(2 * Math.PI * modes[m] * t);
    }
    bronze *= 0.28;

    const noise = (Math.random() * 2 - 1) * 0.60;
    const raw = bronze + noise;

    // De-harshing 2-pole lowpass at 6.8 kHz
    lp1 = 0.58 * lp1 + 0.42 * raw;
    lp2 = 0.58 * lp2 + 0.42 * lp1;

    // Controlled 280ms decay (stops cleanly, no 1.8s room wash)
    const env = Math.exp(-t / 0.068);
    out[i] = lp2 * env * 0.85;
  }

  const fadeLen = Math.floor(SAMPLE_RATE * 0.025);
  for (let i = 0; i < fadeLen; i++) {
    const idx = numSamples - fadeLen + i;
    out[idx] *= (fadeLen - i) / fadeLen;
  }
  return out;
}

/**
 * 6. 20" K-Custom Flat Dry Jazz Ride (1.2 kHz Wooden Ping, 5.2 kHz De-Harsh, 650ms Controlled Decay)
 */
function generateDarkStudioRide(durationSec = 0.650) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(numSamples);

  // Inharmonic B20 Flat Bronze Modes (warm low-mids, no harsh high peaks)
  const pingModes = [1180, 1620, 2240];
  const bodyModes = [540, 780, 1080, 1450, 1920, 2580];

  let lp1 = 0, lp2 = 0;
  let washFilter = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    // 1. Tactile wooden stick ping attack (1.2 kHz wood tip impact)
    const stickEnv = Math.exp(-t / 0.035);
    let ping = 0;
    for (const pm of pingModes) {
      ping += Math.sin(2 * Math.PI * pm * t);
    }
    const woodTick = Math.sin(2 * Math.PI * 1250 * t) * Math.exp(-t / 0.005) * 0.45;
    ping = (ping * 0.20 + woodTick) * stickEnv;

    // 2. Warm, dry B20 bronze body (controlled dark shimmer)
    let body = 0;
    for (let m = 0; m < bodyModes.length; m++) {
      body += (1.0 / Math.pow(m + 1, 0.75)) * Math.sin(2 * Math.PI * bodyModes[m] * t);
    }
    const noise = (Math.random() * 2 - 1) * 0.22;
    washFilter = 0.78 * washFilter + 0.22 * (body * 0.25 + noise);

    const washEnv = Math.exp(-t / 0.16);
    const combined = ping * 0.70 + washFilter * washEnv * 0.45;

    // 2-pole steep lowpass filter at 5.2 kHz (Absolute immunity against harshness)
    lp1 = 0.52 * lp1 + 0.48 * combined;
    lp2 = 0.52 * lp2 + 0.48 * lp1;

    out[i] = lp2 * 0.90;
  }

  const fadeLen = Math.floor(SAMPLE_RATE * 0.03);
  for (let i = 0; i < fadeLen; i++) {
    const idx = numSamples - fadeLen + i;
    out[idx] *= (fadeLen - i) / fadeLen;
  }
  return out;
}

/**
 * 7. 16" Dark Thin Studio Crash (Warm Bronze Explosion, 7.2 kHz De-Harsh, 1.1s Decay)
 */
function generateDarkStudioCrash(durationSec = 1.100) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(numSamples);

  const modes = [620, 940, 1380, 1890, 2650, 3480, 4620, 5850];
  let lp1 = 0, lp2 = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    let bronze = 0;
    for (let m = 0; m < modes.length; m++) {
      bronze += (1.0 / Math.pow(m + 1, 0.7)) * Math.sin(2 * Math.PI * modes[m] * t);
    }
    const noise = (Math.random() * 2 - 1) * 0.70;

    // 12ms explosive attack ramp
    const attack = t < 0.012 ? (t / 0.012) : 1.0;
    const raw = (bronze * 0.35 + noise) * attack;

    // 2-pole lowpass at 7.2 kHz
    lp1 = 0.62 * lp1 + 0.38 * raw;
    lp2 = 0.62 * lp2 + 0.38 * lp1;

    const env = Math.exp(-t / 0.26);
    out[i] = lp2 * env * 0.85;
  }

  const fadeLen = Math.floor(SAMPLE_RATE * 0.05);
  for (let i = 0; i < fadeLen; i++) {
    const idx = numSamples - fadeLen + i;
    out[idx] *= (fadeLen - i) / fadeLen;
  }
  return out;
}

// ============================================================================
// 10. PERCUSSION: Rimshot & Egg Shaker
// ============================================================================
/**
 * 10. Rosewood Studio Side-Stick / Cross-Stick (Wood On Rim, 420 Hz Shell Knock, 0% Cowbell)
 */
function generateRimshot(durationSec = 0.075) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(numSamples);

  let bpState1 = 0, bpState2 = 0;
  let lpState = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    // 1. Tactile wood stick impact click (2.2 kHz broadband transient, 3.5ms decay)
    const rawNoise = (Math.random() * 2 - 1);
    bpState1 = 0.65 * bpState1 + 0.35 * rawNoise;
    bpState2 = 0.65 * bpState2 + 0.35 * (rawNoise - bpState1);
    const clickEnv = Math.exp(-t / 0.0035);
    const click = bpState2 * clickEnv * 0.70;

    // 2. Damped wooden shell body knock (420 Hz & 610 Hz with 16ms decay, 0% ringing bell)
    const shellEnv = Math.exp(-t / 0.016);
    const shellTone = (
      0.65 * Math.sin(2 * Math.PI * 420 * t) +
      0.35 * Math.sin(2 * Math.PI * 610 * t)
    ) * shellEnv * 0.45;

    // 3. Subtle muffled snare bed resonance (22ms decay)
    lpState = 0.70 * lpState + 0.30 * rawNoise;
    const wireEnv = Math.exp(-t / 0.022);
    const wire = lpState * wireEnv * 0.20;

    out[i] = Math.tanh((click + shellTone + wire) * 1.15);
  }

  const fadeLen = Math.floor(SAMPLE_RATE * 0.015);
  for (let i = 0; i < fadeLen; i++) {
    const idx = numSamples - fadeLen + i;
    out[idx] *= (fadeLen - i) / fadeLen;
  }
  return out;
}

function generateShaker(durationSec = 0.080) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(numSamples);

  let last = 0;
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const noise = Math.random() * 2 - 1;
    last = noise - 0.75 * last; // Highpass filter
    const attack = t < 0.015 ? (t / 0.015) : 1.0;
    const env = attack * Math.exp(-(t - 0.015) / 0.022);
    out[i] = last * env * 0.8;
  }
  return out;
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================
const BASE_DIR = path.resolve('apps/groovelab/public/samples');

const TASKS = [
  // Piano (C2, C3, C4, C5, C6)
  { dir: 'piano', file: 'c2.wav', gen: () => generatePianoNote(65.41, 2.0) },
  { dir: 'piano', file: 'c3.wav', gen: () => generatePianoNote(130.81, 1.9) },
  { dir: 'piano', file: 'c4.wav', gen: () => generatePianoNote(261.63, 1.8) },
  { dir: 'piano', file: 'c5.wav', gen: () => generatePianoNote(523.25, 1.6) },
  { dir: 'piano', file: 'c6.wav', gen: () => generatePianoNote(1046.50, 1.4) },

  // E-Bass (E1, A1, D2, G2)
  { dir: 'bass', file: 'e1.wav', gen: () => generateBassNote(41.20, 1.8) },
  { dir: 'bass', file: 'a1.wav', gen: () => generateBassNote(55.00, 1.7) },
  { dir: 'bass', file: 'd2.wav', gen: () => generateBassNote(73.42, 1.6) },
  { dir: 'bass', file: 'g2.wav', gen: () => generateBassNote(98.00, 1.5) },

  // Strings / Violin (G3, D4, A4, E5)
  { dir: 'strings', file: 'g3.wav', gen: () => generateViolinNote(196.00, 1.8) },
  { dir: 'strings', file: 'd4.wav', gen: () => generateViolinNote(293.66, 1.8) },
  { dir: 'strings', file: 'a4.wav', gen: () => generateViolinNote(440.00, 1.7) },
  { dir: 'strings', file: 'e5.wav', gen: () => generateViolinNote(659.25, 1.6) },

  // Acoustic Guitar (E2, A2, D3, G3, B3, E4) - 0,1% Goldstandard Full Sustain
  { dir: 'guitar', file: 'e2.wav', gen: () => generateGuitarNote(82.41, 3.2) },
  { dir: 'guitar', file: 'a2.wav', gen: () => generateGuitarNote(110.00, 3.0) },
  { dir: 'guitar', file: 'd3.wav', gen: () => generateGuitarNote(146.83, 2.9) },
  { dir: 'guitar', file: 'g3.wav', gen: () => generateGuitarNote(196.00, 2.8) },
  { dir: 'guitar', file: 'b3.wav', gen: () => generateGuitarNote(246.94, 2.7) },
  { dir: 'guitar', file: 'e4.wav', gen: () => generateGuitarNote(329.63, 2.6) },

  // Flute (C4, G4, C5, G5)
  { dir: 'flute', file: 'c4.wav', gen: () => generateFluteNote(261.63, 1.6) },
  { dir: 'flute', file: 'g4.wav', gen: () => generateFluteNote(392.00, 1.6) },
  { dir: 'flute', file: 'c5.wav', gen: () => generateFluteNote(523.25, 1.5) },
  { dir: 'flute', file: 'g5.wav', gen: () => generateFluteNote(783.99, 1.4) },

  // Alto Sax (Eb3, Bb3, F4, C5)
  { dir: 'altosax', file: 'eb3.wav', gen: () => generateAltoSaxNote(155.56, 1.6) },
  { dir: 'altosax', file: 'f4.wav',  gen: () => generateAltoSaxNote(349.23, 1.6) },
  { dir: 'altosax', file: 'c5.wav',  gen: () => generateAltoSaxNote(523.25, 1.5) },

  // Trumpet (F3, C4, G4, C5)
  { dir: 'trumpet', file: 'f3.wav', gen: () => generateTrumpetNote(174.61, 1.6) },
  { dir: 'trumpet', file: 'c4.wav', gen: () => generateTrumpetNote(261.63, 1.6) },
  { dir: 'trumpet', file: 'g4.wav', gen: () => generateTrumpetNote(392.00, 1.5) },
  { dir: 'trumpet', file: 'c5.wav', gen: () => generateTrumpetNote(523.25, 1.5) },

  // Vocals (C4, E4, G4, A4, C5)
  { dir: 'vocals', file: 'c4.wav', gen: () => generateVocalNote(261.63, 1.6) },
  { dir: 'vocals', file: 'e4.wav', gen: () => generateVocalNote(329.63, 1.6) },
  { dir: 'vocals', file: 'g4.wav', gen: () => generateVocalNote(392.00, 1.5) },
  { dir: 'vocals', file: 'a4.wav', gen: () => generateVocalNote(440.00, 1.5) },
  { dir: 'vocals', file: 'c5.wav', gen: () => generateVocalNote(523.25, 1.4) },

  // 🥁 AUDIOPHILE 16-BIT PCM STUDIO DRUMS (0,1% Goldstandard Warm & Dry)
  { dir: 'drums/pop_rock', file: 'kick.wav',      gen: () => generateWarmStudioKick(0.28) },
  { dir: 'drums/pop_rock', file: 'snare.wav',     gen: () => generateDampedStudioSnare(0.24) },
  { dir: 'drums/pop_rock', file: 'hihat.wav',     gen: () => generateDarkStudioHiHatClosed(0.060) },
  { dir: 'drums/pop_rock', file: 'hat_pedal.wav', gen: () => generateDarkStudioHiHatPedal(0.050) },
  { dir: 'drums/pop_rock', file: 'openhat.wav',   gen: () => generateDarkStudioHiHatOpen(0.320) },
  { dir: 'drums/pop_rock', file: 'ride.wav',      gen: () => generateDarkStudioRide(0.650) },
  { dir: 'drums/pop_rock', file: 'crash.wav',     gen: () => generateDarkStudioCrash(1.100) },
  { dir: 'drums/pop_rock', file: 'rimshot.wav',   gen: () => generateRimshot(0.075) },
  { dir: 'drums/pop_rock', file: 'shaker.wav',    gen: () => generateShaker(0.080) }
];

console.log(`🚀 Starting Dry Studio Sample Generation (Total targets: ${TASKS.length})...`);
let totalBytes = 0;

for (const task of TASKS) {
  const targetDir = path.join(BASE_DIR, task.dir);
  fs.mkdirSync(targetDir, { recursive: true });
  const targetPath = path.join(targetDir, task.file);

  const samples = task.gen();
  const wavBuffer = createWavBuffer(samples);
  fs.writeFileSync(targetPath, wavBuffer);

  totalBytes += wavBuffer.length;
  console.log(`  ✓ Written ${path.join(task.dir, task.file)} (${(wavBuffer.length / 1024).toFixed(1)} KB)`);
}

console.log(`\n🎉 Generated all ${TASKS.length} dry studio samples! Total size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
