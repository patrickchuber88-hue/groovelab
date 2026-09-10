/**
 * ==============================================================================
 * CAMPUS-GROOVELAB PARENT SESSION LOCK HOOK
 * Standards: OWASP ASVS Level 3 / DSGVO Art. 8 & 25 (Fail-Closed Child Protection)
 * ==============================================================================
 * 
 * Enforces:
 * 1. 3-Minute Inactivity Auto-Lockout with a 10-Second Countdown Toast Warning
 * 2. Instant Zero-Delay Auto-Lock on Tab Switch or Browser Minimize (visibilitychange)
 * 3. Physical Hardware Teardown (Stops all active microphone & audio streams)
 * 4. Fail-Closed Session Storage Purge & Event Propagation
 */

import { useEffect, useState, useRef, useCallback } from 'react';

export interface UseParentSessionLockOptions {
  enabled: boolean;
  studentId?: string;
  timeoutSeconds?: number; // Default: 180s (3 minutes)
  warningThresholdSeconds?: number; // Default: 10s
  onLock?: () => void;
}

export interface UseParentSessionLockResult {
  isWarning: boolean;
  remainingSeconds: number;
  extendSession: () => void;
  lockNow: () => void;
}

export function useParentSessionLock({
  enabled,
  studentId,
  timeoutSeconds = 180,
  warningThresholdSeconds = 10,
  onLock
}: UseParentSessionLockOptions): UseParentSessionLockResult {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(timeoutSeconds);
  const [isWarning, setIsWarning] = useState<boolean>(false);

  const lastActivityRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<any>(null);
  const onLockRef = useRef<(() => void) | undefined>(onLock);
  useEffect(() => {
    onLockRef.current = onLock;
  }, [onLock]);

  // Hard physical hardware & media teardown
  const stopHardwareMediaStreams = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        // Stop any audio nodes / media tracks that might be stored on window or active
        const win = window as any;
        if (win.__activeMicStream && typeof win.__activeMicStream.getTracks === 'function') {
          win.__activeMicStream.getTracks().forEach((track: MediaStreamTrack) => {
            track.stop();
          });
          win.__activeMicStream = null;
        }
        if (win.__activeAudioContext && win.__activeAudioContext.state !== 'closed') {
          win.__activeAudioContext.close().catch(() => {});
          win.__activeAudioContext = null;
        }
      }
    } catch (e) {
      console.warn('[ParentSessionLock] Hardware teardown warning:', e);
    }
  }, []);

  // Hard session purge and lock
  const lockNow = useCallback(() => {
    if (typeof window === 'undefined') return;

    // 1. Stop hardware media streams immediately
    stopHardwareMediaStreams();

    // 2. Clear all parent session tokens from sessionStorage
    sessionStorage.removeItem('groovelab_parent_unlocked_global');
    if (studentId) {
      sessionStorage.removeItem(`groovelab_parent_unlocked_${studentId}`);
      sessionStorage.removeItem(`groovelab_parent_session_${studentId}`);
    }

    // Also clear any other parent session keys in sessionStorage
    try {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('groovelab_parent_') || key.startsWith('groovelab_family_unlocked_')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (e) {}

    // 3. Dispatch global lock event
    window.dispatchEvent(new CustomEvent('groovelab_parent_mode_changed', { detail: false }));

    // 4. Reset internal states
    setIsWarning(false);
    setRemainingSeconds(timeoutSeconds);

    // 5. Invoke caller callback via stable ref
    if (onLockRef.current) {
      onLockRef.current();
    }
  }, [studentId, stopHardwareMediaStreams, timeoutSeconds]);

  // Extend session by another full timeout interval
  const extendSession = useCallback(() => {
    lastActivityRef.current = Date.now();
    setRemainingSeconds(timeoutSeconds);
    setIsWarning(false);
    if (typeof window !== 'undefined' && studentId) {
      sessionStorage.setItem(`groovelab_parent_session_${studentId}`, String(Date.now() + timeoutSeconds * 1000));
    }
  }, [studentId, timeoutSeconds]);

  // 1. VisibilityChange: Instant Lock on tab switch or app minimize
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.warn('[ParentSessionLock] Tab hidden / minimized. Locking parent session immediately (Fail-Closed).');
        lockNow();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, lockNow]);

  // 2. User Activity Tracking & Inactivity Countdown
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setIsWarning(false);
      setRemainingSeconds(timeoutSeconds);
      return;
    }

    lastActivityRef.current = Date.now();
    setRemainingSeconds(timeoutSeconds);
    setIsWarning(false);

    const onUserActivity = () => {
      // Only reset activity automatically if not in warning countdown (in warning, explicit extension is required)
      const now = Date.now();
      const elapsed = Math.floor((now - lastActivityRef.current) / 1000);
      if (elapsed < timeoutSeconds - warningThresholdSeconds) {
        lastActivityRef.current = now;
      }
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach((evt) => window.addEventListener(evt, onUserActivity, { passive: true }));

    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastActivityRef.current) / 1000);
      const remaining = Math.max(0, timeoutSeconds - elapsedSeconds);

      setRemainingSeconds(remaining);

      if (remaining <= warningThresholdSeconds && remaining > 0) {
        setIsWarning(true);
      } else if (remaining === 0) {
        console.warn('[ParentSessionLock] 3-Minute inactivity limit reached. Locking parent session.');
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        lockNow();
      } else {
        setIsWarning(false);
      }
    }, 1000);

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, onUserActivity));
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [enabled, timeoutSeconds, warningThresholdSeconds, lockNow]);

  return {
    isWarning,
    remainingSeconds,
    extendSession,
    lockNow
  };
}
