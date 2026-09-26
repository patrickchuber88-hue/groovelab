/**
 * 🎛️ Audio Tempo & Pitch Preservation Helper (0,1% Goldstandard)
 * 
 * Central SSOT for:
 * - Didactic Speed Cascades (Junior: 100%/75%, Teen: 100%/85%/75%, Pro: 100%/85%/75%/60%/50%)
 * - Level-Adaptive Labels (Junior: 🐰 100% / 🐢 75%, Teen/Pro: 100%, 85%, etc.)
 * - 100% Pitch-Preservation across WebKit/Blink/Gecko (preservesPitch, webkitPreservesPitch, mozPreservesPitch)
 * - Authoritative Level Resolution (SSOT hierarchy from user, student object and scoped localStorage)
 */

export type CampusUiLevel = 'junior' | 'teen' | 'pro';

/**
 * Returns canonical available playback rates for given pedagogical UI level
 */
export function getAvailablePlaybackRates(uiLevel?: CampusUiLevel | string | null): number[] {
  if (uiLevel === 'junior') {
    return [1.0, 0.75];
  }
  if (uiLevel === 'teen') {
    return [1.0, 0.85, 0.75];
  }
  // pro (or unconfigured default)
  return [1.0, 0.85, 0.75, 0.60, 0.50];
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
 * Returns the formatted display label for the speed button
 */
export function getPlaybackRateLabel(rate: number, uiLevel?: CampusUiLevel | string | null): string {
  if (uiLevel === 'junior') {
    return rate < 0.98 ? '🐢 75%' : '🐰 100%';
  }
  return `${Math.round(rate * 100)}%`;
}

/**
 * Applies authoritative pitch-preservation to HTML5 audio elements across all browsers
 */
export function applyPitchPreservation(audio: HTMLAudioElement | null | undefined, rate: number): void {
  if (!audio) return;
  try {
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
