import { useEffect, useState, useRef, useCallback } from 'react';

export interface UseSessionDropOptions {
  isKiosk: boolean;
  lessonDurationMinutes?: number;
  inactivityTimeoutMinutes?: number;
  onDrop: () => void;
}

export function useSessionDrop({
  isKiosk,
  lessonDurationMinutes = 45,
  inactivityTimeoutMinutes = 15,
  onDrop
}: UseSessionDropOptions) {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());
  const sessionStartRef = useRef<number>(Date.now());

  // Record user activity
  const registerActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!isKiosk) {
      setRemainingSeconds(null);
      setShowWarning(false);
      return;
    }

    const maxSessionMs = lessonDurationMinutes * 60 * 1000;
    const maxInactivityMs = inactivityTimeoutMinutes * 60 * 1000;

    // Listen to user interaction to reset inactivity
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleUserAction = () => registerActivity();

    events.forEach(ev => window.addEventListener(ev, handleUserAction, { passive: true }));

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSinceStart = now - sessionStartRef.current;
      const elapsedSinceActivity = now - lastActivityRef.current;

      const timeUntilLessonEnd = Math.max(0, maxSessionMs - elapsedSinceStart);
      const timeUntilInactivityDrop = Math.max(0, maxInactivityMs - elapsedSinceActivity);

      const minRemainingMs = Math.min(timeUntilLessonEnd, timeUntilInactivityDrop);
      const secondsLeft = Math.ceil(minRemainingMs / 1000);

      setRemainingSeconds(secondsLeft);

      // Warning when less than 60 seconds left
      if (secondsLeft <= 60 && secondsLeft > 0) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }

      // Drop when time is up
      if (secondsLeft <= 0) {
        clearInterval(interval);
        onDrop();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      events.forEach(ev => window.removeEventListener(ev, handleUserAction));
    };
  }, [isKiosk, lessonDurationMinutes, inactivityTimeoutMinutes, onDrop, registerActivity]);

  return {
    isKiosk,
    remainingSeconds,
    showWarning,
    extendSession: (additionalMinutes: number = 15) => {
      sessionStartRef.current += additionalMinutes * 60 * 1000;
      lastActivityRef.current = Date.now();
      setShowWarning(false);
    },
    dropNow: onDrop
  };
}
