import { useState, useEffect } from 'react';

// Global state: true = privacy mode ON (last names hidden), false = full names shown
// Default: false → full names shown by default
let globalPrivacyMode = false;

/**
 * maskLastName: Returns the lastName as-is when privacy mode is OFF,
 * or as "X." (first letter + dot) when privacy mode is ON.
 *
 * @param lastName       The last name to optionally mask
 * @param privacyMode    Pass the component's reactive privacyMode state so
 *                       React re-renders whenever the toggle changes.
 */
export function maskLastName(
  lastName: string | undefined | null,
  privacyMode: boolean = globalPrivacyMode
): string {
  if (!lastName) return '';
  // If privacy mode is OFF → show full last name
  if (!privacyMode) return lastName;
  // Privacy mode is ON → mask to first letter + dot
  const trimmed = lastName.trim();
  const firstLetter = trimmed.charAt(0);
  if (!firstLetter) return '';
  return `${firstLetter}.`;
}

// React Hook — returns { privacyMode, togglePrivacy }
export function useRealNamesVisibility() {
  const [privacyMode, setPrivacyMode] = useState(globalPrivacyMode);

  useEffect(() => {
    const handleToggle = () => {
      setPrivacyMode(globalPrivacyMode);
    };
    window.addEventListener('gl-toggle-real-names', handleToggle);
    return () => {
      window.removeEventListener('gl-toggle-real-names', handleToggle);
    };
  }, []);

  const toggleVisibility = (forceValue?: boolean) => {
    globalPrivacyMode = forceValue !== undefined ? forceValue : !globalPrivacyMode;
    window.dispatchEvent(new CustomEvent('gl-toggle-real-names'));
  };

  // Expose 'visible' as alias for backwards compatibility:
  // visible = true means "privacy mode ON" (names hidden)
  return { visible: privacyMode, toggleVisibility };
}
