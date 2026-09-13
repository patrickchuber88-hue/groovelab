import { useState, useEffect, useCallback } from 'react';

export interface PrivacyShieldOptions {
  enabled?: boolean;
  mobileOnly?: boolean;
}

/**
 * Campus-Groovelab Tier-1 FinTech Shoulder-Surfing Privacy Shield Hook
 * Protects sensitive data in the iOS/Android App Switcher / Recent Apps overview.
 * 
 * STRICT ENTERPRISE LEITPLANKE:
 * - By default active ONLY on mobile devices (<= 768px) to prevent disruptive
 *   black/grey screens when teachers multitask or screenshare on desktop!
 */
export function usePrivacyShield(options: boolean | PrivacyShieldOptions = false) {
  const enabled = typeof options === 'boolean' ? options : (options.enabled ?? false);
  const mobileOnly = typeof options === 'boolean' ? true : (options.mobileOnly ?? true);

  const [isShielded, setIsShielded] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      // Check mobile condition to maintain Desktop Layout Immunity
      if (mobileOnly && window.innerWidth > 768) {
        setIsShielded(false);
        return;
      }

      if (document.hidden) {
        setIsShielded(true);
      } else {
        // When coming back to foreground, auto-dismiss smoothly
        const timer = setTimeout(() => {
          setIsShielded(false);
        }, 250);
        return () => clearTimeout(timer);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, mobileOnly]);

  const dismissShield = useCallback(() => {
    setIsShielded(false);
  }, []);

  return { isShielded, dismissShield };
}

