/**
 * ==============================================================================
 * CAMPUS-GROOVELAB UNIVERSAL 45-MINUTE INACTIVITY IDLE PRIVACY-LOCK HOOK
 * Standard: NIST SP 800-63B / BSI IT-Grundschutz (APP.3.1) / Hiscox CyberSafe 05/2026
 * ==============================================================================
 */

import { useEffect, useRef } from 'react';
import { executeSessionZeroize } from '../utils/sessionZeroize';

export interface InactivityOptions {
  timeoutMs?: number; // Default: 45 minutes
  enabled?: boolean;
  onTimeout?: () => void;
  checkMediaActive?: boolean;
}

export const DEFAULT_INACTIVITY_TIMEOUT_MS = 45 * 60 * 1000; // 45 minutes

export function useInactivityTimeout(options: InactivityOptions = {}): void {
  const {
    timeoutMs = DEFAULT_INACTIVITY_TIMEOUT_MS,
    enabled = true,
    onTimeout,
    checkMediaActive = true
  } = options;

  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const isMediaActive = (): boolean => {
      if (!checkMediaActive) return false;
      try {
        const mediaElements = Array.from(document.querySelectorAll('audio, video'));
        return mediaElements.some((media: any) => !media.paused && !media.ended);
      } catch {
        return false;
      }
    };

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        // If media is actively playing (audio loopstation, video tutorial, practice track), postpone lock
        if (isMediaActive()) {
          resetTimer();
          return;
        }

        console.warn('[InactivityTimeout] User idle limit exceeded (45 minutes). Initiating Privacy Screen Lock...');
        if (onTimeout) {
          onTimeout();
        } else {
          executeSessionZeroize({ preserveDeviceKey: true, redirectUrl: '/' });
        }
      }, timeoutMs);
    };

    // User interaction events that reset the activity timer
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer, { passive: true });
    });

    // Start initial timer
    resetTimer();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer);
      });
    };
  }, [enabled, timeoutMs, onTimeout, checkMediaActive]);
}
