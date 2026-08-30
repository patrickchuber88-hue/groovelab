/**
 * ==============================================================================
 * CAMPUS-GROOVELAB INACTIVITY IDLE AUTO-LOCKOUT HOOK
 * Standard: NIST SP 800-63B / BSI IT-Grundschutz (Baustein APP.3.1)
 * ==============================================================================
 */

import { useEffect, useRef } from 'react';
import { executeSessionZeroize } from '../utils/sessionZeroize';

export interface InactivityOptions {
  timeoutMs?: number; // Default 30 minutes
  enabled?: boolean;
  onTimeout?: () => void;
}

const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function useInactivityTimeout(options: InactivityOptions = {}): void {
  const {
    timeoutMs = DEFAULT_TIMEOUT,
    enabled = true,
    onTimeout
  } = options;

  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        console.warn('[InactivityTimeout] User idle limit exceeded (30 minutes). Initiating auto-lockout...');
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
  }, [enabled, timeoutMs, onTimeout]);
}
