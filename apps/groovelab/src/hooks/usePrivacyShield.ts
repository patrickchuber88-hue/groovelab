import { useState, useEffect } from 'react';

/**
 * Campus-Groovelab Tier-1 FinTech Shoulder-Surfing Privacy Shield Hook
 * Detects when the user minimizes the browser or switches tabs on shared classroom devices.
 */
export function usePrivacyShield(enabled = false) {
  const [isShielded, setIsShielded] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsShielded(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);

  const dismissShield = () => {
    setIsShielded(false);
  };

  return { isShielded: false, dismissShield };
}
