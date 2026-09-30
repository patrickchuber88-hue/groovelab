// ==============================================================================
// 🏛️ Campus-Groovelab AudioContext Manager Facade
// Standards: W3C Web Audio API / Apple WebKit Autoplay Policy / TDDDG § 25
// Re-exports the authoritative SharedAudioEngine singleton for backward compatibility.
// ==============================================================================

import { SharedAudioEngine } from './sharedAudioEngine';

export { SharedAudioEngine };

/**
 * Returns the shared singleton AudioContext instance.
 */
export function getSharedAudioContext(): AudioContext {
  return SharedAudioEngine.getContext();
}

/**
 * Unlocks the shared AudioContext upon explicit user gesture (Tap/Click/Keydown).
 */
export async function unlockSharedAudioContext(): Promise<void> {
  return SharedAudioEngine.unlock();
}

/**
 * Initializes automatic passive unlock listeners for iOS Safari and Chromium.
 */
export function initAudioContextAutoUnlock(): void {
  SharedAudioEngine.initAutoUnlock();
}
