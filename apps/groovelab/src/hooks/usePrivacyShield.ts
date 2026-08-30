import { useState, useEffect } from 'react';

/**
 * Campus-Groovelab Tier-1 FinTech Shoulder-Surfing Privacy Shield Hook
 * Detects when the user minimizes the browser or switches tabs on shared classroom devices.
 */
export function usePrivacyShield(enabled = true) {
  const [isShielded, setIsShielded] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsShielded(true);
      }
    };

    const handleWindowBlur = () => {
      // Small timeout to prevent flickering on quick in-page clicks
      const timer = setTimeout(() => {
        if (!document.hasFocus()) {
          setIsShielded(true);
        }
      }, 150);
      return () => clearTimeout(timer);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [enabled]);

  const dismissShield = () => {
    setIsShielded(false);
  };

  return { isShielded, dismissShield };
}
