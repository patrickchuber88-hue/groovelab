import { useState, useEffect } from 'react';

// ─── Stable storage on `window` – survives Vite HMR module reloads ─────────
// privacyMode = true  → last names masked (e.g. "M.")
// privacyMode = false → full names shown (default)

declare global {
  interface Window {
    __glPrivacyMode: boolean;
    __glPrivacySubs: Set<(mode: boolean) => void>;
  }
}

if (typeof window !== 'undefined') {
  if (window.__glPrivacyMode === undefined) {
    // Default: privacy ON (names masked like "Olivia W.").
    // Persist user preference in localStorage.
    const stored = localStorage.getItem('groovelab_name_privacy');
    window.__glPrivacyMode = stored !== null ? stored === 'true' : true;
  }
  if (!window.__glPrivacySubs) window.__glPrivacySubs = new Set();
}

function getMode(): boolean {
  return typeof window !== 'undefined' ? window.__glPrivacyMode : false;
}

function setMode(value: boolean) {
  if (typeof window === 'undefined') return;
  window.__glPrivacyMode = value;
  localStorage.setItem('groovelab_name_privacy', String(value));
  window.__glPrivacySubs.forEach(fn => fn(value));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Mask a last name based on privacy mode.
 *   privacyMode = false (default) → full last name returned
 *   privacyMode = true            → "X." (first letter + dot)
 *
 * Always pass the reactive `privacyMode` from the hook as second arg
 * so React re-renders whenever the toggle changes.
 */
export function maskLastName(
  lastName: string | undefined | null,
  privacyMode: boolean = getMode()
): string {
  if (!lastName) return '';
  if (!privacyMode) return lastName;
  const trimmed = lastName.trim();
  const first = trimmed.charAt(0);
  return first ? `${first}.` : '';
}

/**
 * React hook – subscribe to privacy-mode changes.
 * Returns { visible: boolean, toggleVisibility: fn }
 * where `visible` = true means privacy is ON (names hidden).
 */
export function useRealNamesVisibility() {
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => getMode());

  useEffect(() => {
    // Always add fresh reference; cleanup removes it
    window.__glPrivacySubs.add(setPrivacyMode);
    // Sync in case state changed before mount
    setPrivacyMode(getMode());

    return () => {
      window.__glPrivacySubs.delete(setPrivacyMode);
    };
  }, []); // empty deps: mount/unmount only, setState ref is stable

  const toggleVisibility = (forceValue?: boolean) => {
    const next = forceValue !== undefined ? forceValue : !getMode();
    setMode(next);
  };

  return { visible: privacyMode, toggleVisibility };
}

/**
 * Clean internal metadata markers (LATENCY:xxx, STICKER:xxx, AUDIO:xxx)
 * from user-facing notes and comments.
 */
export function cleanHomeworkNotesText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .split('\n')
    .map(line => {
      let l = line.trim();
      if (!l) return '';
      if (l.startsWith('LATENCY:') || l.startsWith('STICKER:') || l.startsWith('AUDIO:') || l === 'Inhalte in der Premium-Version freischalten') {
        return '';
      }
      l = l.replace(/LATENCY:\s*\d+/gi, '')
           .replace(/STICKER:[^\s\n·]*/gi, '')
           .replace(/\s*:\s*(?=·|$|\n)/g, '')
           .replace(/\s*·\s*·\s*/g, ' · ')
           .replace(/^\s*[·\s:]+/, '')
           .replace(/[·\s:]+$/, '')
           .trim();
      return l;
    })
    .filter(Boolean)
    .join('; ');
}
