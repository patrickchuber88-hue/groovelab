import { useState, useEffect } from 'react';

// ─── Module-level state ───────────────────────────────────────────────────────
// privacyMode = true  → last names are masked (e.g. "M.")
// privacyMode = false → full names shown (default)
let globalPrivacyMode = false;

// Direct subscriber list – avoids CustomEvent / DOM completely
const subscribers: Array<(mode: boolean) => void> = [];

function notifyAll() {
  subscribers.forEach(fn => fn(globalPrivacyMode));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Mask a last name.
 * Pass the reactive `privacyMode` value from the hook so React
 * re-renders whenever the toggle changes.
 *   privacyMode = false  → full last name returned
 *   privacyMode = true   → "X." (first letter + dot)
 */
export function maskLastName(
  lastName: string | undefined | null,
  privacyMode: boolean = globalPrivacyMode
): string {
  if (!lastName) return '';
  if (!privacyMode) return lastName;           // privacy OFF → show full name
  const trimmed = lastName.trim();
  const first = trimmed.charAt(0);
  return first ? `${first}.` : '';
}

/**
 * React hook – subscribe to privacy-mode changes.
 * Returns { visible: boolean, toggleVisibility: () => void }
 * where `visible` = true means privacy mode is ON (names hidden).
 */
export function useRealNamesVisibility() {
  const [privacyMode, setPrivacyMode] = useState(globalPrivacyMode);

  useEffect(() => {
    // Register subscriber
    subscribers.push(setPrivacyMode);
    // Sync immediately in case state changed before mount
    setPrivacyMode(globalPrivacyMode);
    return () => {
      const idx = subscribers.indexOf(setPrivacyMode);
      if (idx !== -1) subscribers.splice(idx, 1);
    };
  }, []);

  const toggleVisibility = (forceValue?: boolean) => {
    globalPrivacyMode =
      forceValue !== undefined ? forceValue : !globalPrivacyMode;
    notifyAll();
  };

  return { visible: privacyMode, toggleVisibility };
}
