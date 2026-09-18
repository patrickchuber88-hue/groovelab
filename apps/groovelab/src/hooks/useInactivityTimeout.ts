/**
 * ==============================================================================
 * CAMPUS-GROOVELAB UNIVERSAL 45-MINUTE INACTIVITY IDLE SCREEN-LOCK HOOK
 * Standard: NIST SP 800-63B / BSI IT-Grundschutz (APP.3.1) / Enterprise Goldstandard
 * ==============================================================================
 */

import { useEffect, useRef } from 'react';
import { executeSessionZeroize } from '../utils/sessionZeroize';

export interface InactivityOptions {
  timeoutMs?: number; // Default: 45 minutes
  enabled?: boolean;
  onTimeout?: () => void;
  checkMediaActive?: boolean;
  isScreenLocked?: boolean;
}

export const DEFAULT_INACTIVITY_TIMEOUT_MS = 45 * 60 * 1000; // 45 minutes
export const HARD_LOCK_TIMEOUT_MS = 120 * 60 * 1000; // 2 hours hard timeout for locked sessions

export function useInactivityTimeout(options: InactivityOptions = {}): void {
  const {
    timeoutMs = DEFAULT_INACTIVITY_TIMEOUT_MS,
    enabled = true,
    onTimeout,
    checkMediaActive = true,
    isScreenLocked = false
  } = options;

  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // 🛡️ If the screen is already locked, check for hard lock expiry (2 hours)
    if (isScreenLocked) {
      try {
        const lockedAtStr = sessionStorage.getItem('campus_locked_at') || localStorage.getItem('campus_locked_at');
        if (lockedAtStr) {
          const lockedAt = parseInt(lockedAtStr, 10);
          if (!isNaN(lockedAt) && Date.now() - lockedAt >= HARD_LOCK_TIMEOUT_MS) {
            console.warn('[InactivityTimeout] Hard lock timeout exceeded (> 2 hours). Terminating session zeroize...');
            executeSessionZeroize({ preserveDeviceKey: true, redirectUrl: '/' });
            return;
          }
        }
      } catch (_) {}
      // When locked, do NOT attach user activity event listeners that would postpone/reset the lock
      return;
    }

    const isMediaActive = (): boolean => {
      if (!checkMediaActive) return false;
      try {
        const mediaElements = Array.from(document.querySelectorAll('audio, video'));
        return mediaElements.some((media: any) => !media.paused && !media.ended);
      } catch {
        return false;
      }
    };

    let lastResetTime = Date.now();
    let lastStorageSync = 0;
    const THROTTLE_EVENT_MS = 1000;
    const THROTTLE_STORAGE_MS = 15000; // Synchronize last active timestamp to storage at most once every 15s

    // Calculate initial delay based on persistent last active timestamp
    let initialDelayMs = timeoutMs;
    try {
      const lastActiveStr = sessionStorage.getItem('campus_last_active_ts');
      if (lastActiveStr) {
        const lastActive = parseInt(lastActiveStr, 10);
        if (!isNaN(lastActive)) {
          const elapsed = Date.now() - lastActive;
          if (elapsed >= timeoutMs) {
            console.warn(`[InactivityTimeout] Cold-start detected idle elapsed time (${Math.round(elapsed / 1000)}s >= ${timeoutMs / 1000}s). Locking immediately...`);
            if (onTimeout) {
              onTimeout();
            } else {
              executeSessionZeroize({ preserveDeviceKey: true, redirectUrl: '/' });
            }
            return;
          }
          // Resume countdown with actual remaining time
          initialDelayMs = Math.max(1000, timeoutMs - elapsed);
        }
      } else {
        sessionStorage.setItem('campus_last_active_ts', String(Date.now()));
      }
    } catch (_) {}

    const triggerLockOrZeroize = () => {
      // If media is actively playing (audio loopstation, video tutorial, practice track), postpone lock
      if (isMediaActive()) {
        resetTimer(true);
        return;
      }

      console.warn('[InactivityTimeout] User idle limit exceeded. Initiating Privacy Screen Lock...');
      if (onTimeout) {
        onTimeout();
      } else {
        executeSessionZeroize({ preserveDeviceKey: true, redirectUrl: '/' });
      }
    };

    const resetTimer = (force = false) => {
      const now = Date.now();
      // Throttle high-frequency events (e.g. 120Hz mousemove/scroll) to at most once per second
      if (!force && now - lastResetTime < THROTTLE_EVENT_MS) {
        return;
      }
      lastResetTime = now;

      // Periodically sync heartbeat timestamp to sessionStorage
      if (force || now - lastStorageSync >= THROTTLE_STORAGE_MS) {
        lastStorageSync = now;
        try {
          sessionStorage.setItem('campus_last_active_ts', String(now));
        } catch (_) {}
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(triggerLockOrZeroize, timeoutMs);
    };

    const handleActivity = () => resetTimer(false);

    // User interaction events that reset the activity timer
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    // Start initial timer with remaining time or full duration
    timerRef.current = setTimeout(triggerLockOrZeroize, initialDelayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
    };
  }, [enabled, timeoutMs, onTimeout, checkMediaActive, isScreenLocked]);
}
