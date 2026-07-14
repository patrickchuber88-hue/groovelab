import { useState, useEffect } from 'react';

// Global state variable to sync across different components
let globalShowRealNames = false;
let globalTimeoutId: any = null;

// Mask function: formats a last name as 'Lxxxxx' unless forceShow or global toggle is active
export function maskLastName(lastName: string | undefined | null, forceShow: boolean = false): string {
  if (!lastName) return '';
  if (forceShow || globalShowRealNames) return lastName;
  const trimmed = lastName.trim();
  const firstLetter = trimmed.charAt(0);
  if (!firstLetter) return '';
  // Fixed masking format as requested
  return `${firstLetter}.`;
}

// React Hook to use and toggle the visibility reactively
export function useRealNamesVisibility() {
  const [visible, setVisible] = useState(globalShowRealNames);

  useEffect(() => {
    const handleToggle = () => {
      setVisible(globalShowRealNames);
    };
    window.addEventListener('gl-toggle-real-names', handleToggle);
    return () => {
      window.removeEventListener('gl-toggle-real-names', handleToggle);
    };
  }, []);

  const toggleVisibility = (show?: boolean) => {
    const target = show !== undefined ? show : !globalShowRealNames;
    globalShowRealNames = target;

    // Reset any running timeout
    if (globalTimeoutId) {
      clearTimeout(globalTimeoutId);
      globalTimeoutId = null;
    }

    if (globalShowRealNames) {
      // Auto-hide after 10 seconds (as requested)
      globalTimeoutId = setTimeout(() => {
        globalShowRealNames = false;
        globalTimeoutId = null;
        window.dispatchEvent(new CustomEvent('gl-toggle-real-names'));
      }, 10000);
    }

    window.dispatchEvent(new CustomEvent('gl-toggle-real-names'));
  };

  return { visible, toggleVisibility };
}
