// ==============================================================================
// 🏛️ CAMPUS-GROOVELAB AUDIO LOOP LOCATOR STORAGE (A/B-Übe-Schleife)
// Non-Destructive Metadaten-Speicherung für A/B-Wiederholungsbereiche
// ==============================================================================

import { extractCanonicalAudioKey } from './audioNotesStorage';

export interface AudioLoopLocator {
  enabled: boolean;
  startSec: number;
  endSec: number;
  updatedAt: string;
}

const STORAGE_PREFIX = 'campus_audio_loop_locator_';

function getStorageKey(audioUrlOrKey: string): string {
  if (!audioUrlOrKey) return `${STORAGE_PREFIX}unknown`;
  const canonical = extractCanonicalAudioKey(audioUrlOrKey);
  return `${STORAGE_PREFIX}${canonical.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

/**
 * Ruft den gespeicherten A/B-Loop-Locator für eine Audio-Spur ab.
 */
export function getLoopLocator(audioUrlOrKey: string): AudioLoopLocator | null {
  if (typeof window === 'undefined' || !audioUrlOrKey) return null;
  try {
    const key = getStorageKey(audioUrlOrKey);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.startSec === 'number' &&
      typeof parsed.endSec === 'number' &&
      parsed.endSec > parsed.startSec
    ) {
      return {
        enabled: Boolean(parsed.enabled),
        startSec: Math.max(0, parsed.startSec),
        endSec: parsed.endSec,
        updatedAt: parsed.updatedAt || new Date().toISOString()
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Speichert oder aktualisiert den A/B-Loop-Locator für eine Audio-Spur.
 */
export function saveLoopLocator(
  audioUrlOrKey: string,
  locator: { startSec: number; endSec: number; enabled?: boolean }
): AudioLoopLocator {
  const startSec = Math.max(0, locator.startSec);
  const endSec = Math.max(startSec + 0.5, locator.endSec);
  const enabled = locator.enabled !== undefined ? locator.enabled : true;

  const data: AudioLoopLocator = {
    enabled,
    startSec,
    endSec,
    updatedAt: new Date().toISOString()
  };

  if (typeof window !== 'undefined' && audioUrlOrKey) {
    try {
      const key = getStorageKey(audioUrlOrKey);
      localStorage.setItem(key, JSON.stringify(data));
      window.dispatchEvent(
        new CustomEvent('campus-audio-loop-locator-changed', {
          detail: { audioKey: audioUrlOrKey, locator: data }
        })
      );
    } catch (e) {
      console.warn('[LoopLocatorStorage] Save error:', e);
    }
  }

  return data;
}

/**
 * Schaltet den bestehenden A/B-Loop-Locator an oder aus.
 */
export function toggleLoopLocator(audioUrlOrKey: string): boolean {
  const current = getLoopLocator(audioUrlOrKey);
  if (!current) return false;
  const nextEnabled = !current.enabled;
  saveLoopLocator(audioUrlOrKey, {
    startSec: current.startSec,
    endSec: current.endSec,
    enabled: nextEnabled
  });
  return nextEnabled;
}

/**
 * Entfernt den A/B-Loop-Locator für die angegebene Audio-Spur.
 */
export function removeLoopLocator(audioUrlOrKey: string): void {
  if (typeof window === 'undefined' || !audioUrlOrKey) return;
  try {
    const key = getStorageKey(audioUrlOrKey);
    localStorage.removeItem(key);
    window.dispatchEvent(
      new CustomEvent('campus-audio-loop-locator-changed', {
        detail: { audioKey: audioUrlOrKey, locator: null }
      })
    );
  } catch (e) {
    console.warn('[LoopLocatorStorage] Remove error:', e);
  }
}
