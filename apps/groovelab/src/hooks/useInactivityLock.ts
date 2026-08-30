import { useEffect, useRef, useCallback } from 'react';

interface UseInactivityLockOptions {
  timeoutMinutes?: number;
  onLock?: () => void;
  enabled?: boolean;
}

/**
 * Smart Inactivity Auto-Lock & Shared Device Protector for Campus-Groovelab
 * 
 * Automatically locks the active session after a period of user inactivity,
 * protecting shared school iPads and classroom workstations from unauthorized access.
 */
export function useInactivityLock({
  timeoutMinutes = 10,
  onLock,
  enabled = true
}: UseInactivityLockOptions = {}) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutMs = timeoutMinutes * 60 * 1000;

  const handleInactivity = useCallback(() => {
    if (!enabled || !onLock) return;
    console.log(`[Security] Session auto-locked after ${timeoutMinutes} minutes of inactivity.`);
    onLock();
  }, [enabled, onLock, timeoutMinutes]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (enabled && onLock) {
      timerRef.current = setTimeout(handleInactivity, timeoutMs);
    }
  }, [enabled, handleInactivity, onLock, timeoutMs]);

  useEffect(() => {
    if (!enabled || !onLock) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'pointerdown', 'scroll'];
    const onUserActivity = () => resetTimer();

    events.forEach(evt => window.addEventListener(evt, onUserActivity, { passive: true }));
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(evt => window.removeEventListener(evt, onUserActivity));
    };
  }, [enabled, onLock, resetTimer]);
}
