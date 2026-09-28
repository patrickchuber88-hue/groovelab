/**
 * 🎛️ Audio Tempo & Pitch Preservation Helper (0,1% Goldstandard)
 * 
 * Central SSOT for:
 * - Didactic Speed Cascades (Global & Uniform: 100% -> 85% -> 75% -> 50%)
 * - Pure Swiss Typography Speed Labels (100%, 85%, 75%, 50% - zero emojis/icons)
 * - 100% Pitch-Preservation across WebKit/Blink/Gecko (preservesPitch, webkitPreservesPitch, mozPreservesPitch)
 * - Authoritative Level Resolution (SSOT hierarchy from user, student object and scoped localStorage)
 */

export type CampusUiLevel = 'junior' | 'teen' | 'pro';

/**
 * Returns canonical available playback rates globally across the entire app:
 * 100% -> 85% -> 75% -> 50%
 */
export function getAvailablePlaybackRates(_uiLevel?: CampusUiLevel | string | null): number[] {
  // Global & einheitlich: 100%, 85%, 75%, 50%
  return [1.0, 0.85, 0.75, 0.50];
}

/**
 * Cycles to the next playback rate in the sequence
 */
export function getNextPlaybackRate(currentRate: number, uiLevel?: CampusUiLevel | string | null): number {
  const rates = getAvailablePlaybackRates(uiLevel);
  // Find closest rate or exact match
  const idx = rates.findIndex(r => Math.abs(r - currentRate) < 0.02);
  if (idx === -1) {
    return rates[1] || rates[0];
  }
  return rates[(idx + 1) % rates.length];
}

/**
 * Returns the formatted display label for the speed button (pure Swiss typography, no emojis/icons)
 */
export function getPlaybackRateLabel(rate: number, _uiLevel?: CampusUiLevel | string | null): string {
  return `${Math.round(rate * 100)}%`;
}

/**
 * Applies authoritative pitch-preservation to HTML5 audio elements across all browsers
 * Hardware-accelerated TimePitch locks pitch at exact original musical frequency (e.g. A = 440 Hz)
 */
export function applyPitchPreservation(audio: HTMLAudioElement | null | undefined, rate: number): void {
  if (!audio) return;
  try {
    // Set pitch-preservation flags before and after assigning playbackRate
    // Guarantees WebKit (iOS/macOS), Blink (Chrome), and Gecko (Firefox)
    // lock the AudioUnit into pitch-preserving time-stretch mode
    audio.preservesPitch = true;
    (audio as any).webkitPreservesPitch = true;
    (audio as any).mozPreservesPitch = true;
    audio.playbackRate = rate;
    audio.preservesPitch = true;
    (audio as any).webkitPreservesPitch = true;
    (audio as any).mozPreservesPitch = true;
  } catch (err) {
    console.warn('[audioTempoHelper] Error applying pitch preservation:', err);
  }
}

/**
 * Resolves authoritative student UI level with zero-drift hierarchy:
 * 1. Explicit prop level
 * 2. Student object property (campus_ui_level)
 * 3. Scoped localStorage (`campus_student_ui_level_${studentId}`)
 * 4. General localStorage (`campus_student_ui_level`)
 * 5. Default fallback ('junior')
 */
export function resolveAuthoritativeUiLevel(
  explicitLevel?: string | null,
  student?: any
): CampusUiLevel {
  if (explicitLevel === 'junior' || explicitLevel === 'teen' || explicitLevel === 'pro') {
    return explicitLevel;
  }
  const studentProp = student?.campus_ui_level || student?.ui_level;
  if (studentProp === 'junior' || studentProp === 'teen' || studentProp === 'pro') {
    return studentProp;
  }
  if (typeof window !== 'undefined') {
    const studentId = student?.id || student?.student_id;
    if (studentId) {
      const scoped = localStorage.getItem(`campus_student_ui_level_${studentId}`);
      if (scoped === 'junior' || scoped === 'teen' || scoped === 'pro') {
        return scoped;
      }
    }
    const general = localStorage.getItem('campus_student_ui_level');
    if (general === 'junior' || general === 'teen' || general === 'pro') {
      return general;
    }
  }
  return 'junior';
}
