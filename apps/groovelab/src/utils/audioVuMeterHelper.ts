/**
 * 🎚️ 2027 DAW Studio VU & Peak Meter Engine (Tier-1 Enterprise+ Goldstandard)
 * Campus-Groovelab
 *
 * Provides a standardized, quasi-logarithmic (IEC 60268-10 / DIN PPM) metering
 * curve and analog ballistics (instant attack, 350ms smooth decay, 1.5s clip-latch)
 * across ALL audio recording interfaces in the entire application.
 *
 * Acoustic Physics:
 * - Natural acoustic instruments (guitar, piano, flute, singing) recorded at
 *   50cm–100cm without digital AGC produce real ADC signals of -26 dBFS to -18 dBFS.
 * - In 24-bit studio recording, -18 dBFS is the international NOMINAL REFERENCE LEVEL (0 VU).
 * - A naive linear meter (peak * 100) displays this healthy level as a tiny 5–10% deflection.
 * - This engine maps -18 dBFS directly to 60% (the center of the green Sweet Spot)!
 */

/**
 * Maps a linear peak amplitude (0.0 to 1.0) to a calibrated DAW visual meter percentage (0 to 100).
 *
 * Calibrated Piecewise Curve:
 * - < -54 dBFS (0.0020): 0% (room silence / noise floor)
 * - -36 dBFS (0.0158): 25% (pianissimo / soft notes)
 * - -24 dBFS (0.0631): 48% (mezzo-piano)
 * - -18 dBFS (0.1259): 60% (0 VU Studio Reference / Optimal Sweet Spot!)
 * - -12 dBFS (0.2512): 72% (forte / loud strumming)
 * - -6 dBFS (0.5012):  85% (fortissimo / high energy)
 * - -2.5 dBFS (0.7499): 92% (headroom danger threshold)
 * - 0 dBFS (1.0000):   100% (digital clip threshold)
 */
export function linearToDawMeterPercent(linearPeak: number): number {
  if (linearPeak <= 0.0019) return 0; // Below -54.4 dBFS

  const db = 20 * Math.log10(Math.min(1.0, Math.max(0.0001, linearPeak)));

  if (db <= -54) {
    return 0;
  } else if (db <= -36) {
    // -54 dBFS to -36 dBFS -> 0% to 25%
    return Math.round(((db + 54) / 18) * 25);
  } else if (db <= -18) {
    // -36 dBFS to -18 dBFS -> 25% to 60% (Sweet spot range!)
    return Math.round(25 + ((db + 36) / 18) * 35);
  } else if (db <= -6) {
    // -18 dBFS to -6 dBFS -> 60% to 85%
    return Math.round(60 + ((db + 18) / 12) * 25);
  } else {
    // -6 dBFS to 0 dBFS -> 85% to 100%
    return Math.min(100, Math.round(85 + ((db + 6) / 6) * 15));
  }
}

/**
 * Converts FFT frequency byte data (0 to 255) from an AnalyserNode to a DAW visual meter percentage (0 to 100).
 */
export function byteFrequencyToDawMeterPercent(dataArray: Uint8Array): number {
  if (!dataArray || dataArray.length === 0) return 0;

  let sumSq = 0;
  let maxByte = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const val = dataArray[i];
    if (val > maxByte) maxByte = val;
    sumSq += val * val;
  }

  const rmsByte = Math.sqrt(sumSq / dataArray.length);
  // Blend RMS (60%) and Peak (40%) for musical responsiveness
  const blendedByte = rmsByte * 0.6 + maxByte * 0.4;
  const linearApprox = Math.min(1.0, blendedByte / 255.0);

  return linearToDawMeterPercent(linearApprox);
}

/**
 * Analog Ballistics Controller:
 * - 0ms Instant Attack: Transients and pick attacks register immediately.
 * - 350ms Smooth Release Decay: Prevents erratic 60Hz jitter.
 * - 1500ms Clip Latch: Overload LED stays visible so the user notices clippings.
 */
export interface DawMeterBallisticsState {
  currentPercent: number;
  isClipping: boolean;
}

export function createDawMeterBallistics(decayCoeff = 0.84) {
  let displayPercent = 0;
  let clipLatchedUntil = 0;

  return {
    /**
     * Updates the ballistic state with a new instantaneous meter percentage (0 to 100)
     * and returns the smoothed display value and clipping flag.
     */
    update(targetPercent: number, isHardwareClip = false): DawMeterBallisticsState {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

      // Check clipping (either hardware peak >= 0.94 / -0.5 dBFS or meter >= 96%)
      if (isHardwareClip || targetPercent >= 96) {
        clipLatchedUntil = now + 1500; // Latch for 1.5 seconds
      }

      // Attack vs Release
      if (targetPercent >= displayPercent) {
        // Instant Attack (0ms)
        displayPercent = targetPercent;
      } else {
        // Smooth Exponential Decay (~300-350ms)
        displayPercent = Math.max(0, displayPercent * decayCoeff + targetPercent * (1 - decayCoeff));
      }

      const isClipping = now < clipLatchedUntil;

      return {
        currentPercent: Math.round(displayPercent),
        isClipping
      };
    },

    reset() {
      displayPercent = 0;
      clipLatchedUntil = 0;
    }
  };
}

/**
 * Returns the canonical 2027 DAW color gradient based on meter percentage.
 */
export function getMeterColorGradient(pct: number): string {
  if (pct > 92) {
    return 'linear-gradient(90deg, #10b981 0%, #f59e0b 70%, #ef4444 100%)';
  }
  if (pct > 65) {
    return 'linear-gradient(90deg, #10b981 0%, #f59e0b 100%)';
  }
  return '#10b981';
}

/**
 * Returns a human-friendly didactic level status text.
 */
export function getMeterLevelDescription(pct: number): {
  label: string;
  color: string;
  isOptimal: boolean;
  isClipping: boolean;
} {
  if (pct >= 94) {
    return {
      label: '⚠️ Übersteuerung (Zu laut)',
      color: '#dc2626',
      isOptimal: false,
      isClipping: true
    };
  }
  if (pct >= 75) {
    return {
      label: 'Kräftig (Forte)',
      color: '#d97706',
      isOptimal: true,
      isClipping: false
    };
  }
  if (pct >= 45) {
    return {
      label: 'Optimal (Sweet Spot ✓)',
      color: '#16a34a',
      isOptimal: true,
      isClipping: false
    };
  }
  if (pct >= 20) {
    return {
      label: 'Gut hörbar (Piano)',
      color: '#059669',
      isOptimal: false,
      isClipping: false
    };
  }
  return {
    label: 'Sehr leise / Raumruhe',
    color: '#64748b',
    isOptimal: false,
    isClipping: false
  };
}
