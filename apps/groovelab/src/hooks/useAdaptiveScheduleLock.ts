/**
 * ==============================================================================
 * CAMPUS-GROOVELAB ADAPTIVE SCHEDULE-AWARE INACTIVITY CITADEL HOOK
 * 
 * Implements the 0,1% Enterprise Adaptive Security Architecture:
 * - Zone 1 (Active Lesson Block): Full pedagogical immunity. Generous 60-90 min
 *   timeout so teachers are never interrupted while teaching or entering homework.
 * - Zone 2 (Feierabend & Gaps >= 30 min): Strict 10-Minute High-Security Lockout
 *   (plus 5 min grace buffer) to seal unattended iPads immediately when school ends.
 * - Zone 3 (1-Tap Immediate Lock): Instant lock via lockNow().
 * - 3-Strike Fail-Closed Revocation: Automatically purges trusted device binding
 *   on repeated PIN failures, falling back to Master Password.
 * ==============================================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { clearRememberedPin } from '../utils/trustedDevicePin';

export interface ScheduleSlot {
  startTime: string; // e.g. "14:00" or ISO
  endTime: string;   // e.g. "14:45" or ISO
}

export interface AdaptiveLockOptions {
  userId?: string | null;
  userRole?: string | null;
  schoolId?: string | null;
  enabled?: boolean;
  onLock?: () => void;
  onRevokeDeviceBinding?: () => void;
  isScreenLocked?: boolean;
  checkMediaActive?: boolean;
}

export const LESSON_BLOCK_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes during active teaching
export const POST_LESSON_TIMEOUT_MS = 10 * 60 * 1000;  // 10 minutes after school / in gaps
export const LESSON_END_GRACE_BUFFER_MS = 5 * 60 * 1000; // 5 minutes grace buffer after last lesson

export interface AdaptiveLockState {
  isLessonZone: boolean;
  currentTimeoutMs: number;
  lockNow: () => void;
  handleFailedPinAttempt: () => boolean; // returns true if device binding was revoked (3 strikes)
  resetFailedPinAttempts: () => void;
}

export function useAdaptiveScheduleLock(options: AdaptiveLockOptions = {}): AdaptiveLockState {
  const {
    userId,
    userRole,
    schoolId,
    enabled = true,
    onLock,
    onRevokeDeviceBinding,
    isScreenLocked = false,
    checkMediaActive = true
  } = options;

  const [isLessonZone, setIsLessonZone] = useState<boolean>(false);
  const [currentTimeoutMs, setCurrentTimeoutMs] = useState<number>(POST_LESSON_TIMEOUT_MS);
  const failedAttemptsRef = useRef<number>(0);
  const timerRef = useRef<any>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const isTeacherOrStaff = userRole?.toLowerCase() === 'teacher' || userRole?.toLowerCase() === 'admin';

  // 1. Fetch Today's Teaching Schedule to Determine Active Lesson Windows
  useEffect(() => {
    if (!enabled || !userId || !isTeacherOrStaff || typeof window === 'undefined') {
      setIsLessonZone(false);
      setCurrentTimeoutMs(POST_LESSON_TIMEOUT_MS);
      return;
    }

    let isMounted = true;

    async function evaluateTodaySchedule() {
      try {
        const todayStr = new Date().toISOString().split('T')[0];

        // Fetch today's schedule events for this teacher
        const { data: events, error } = await supabase
          .from('schedule_events')
          .select('start_time, end_time, status')
          .eq('teacher_id', userId)
          .eq('date', todayStr)
          .neq('status', 'cancelled');

        if (!isMounted) return;

        if (error || !events || events.length === 0) {
          // No scheduled lessons today -> strict high-security 10-minute timer applies
          setIsLessonZone(false);
          setCurrentTimeoutMs(POST_LESSON_TIMEOUT_MS);
          return;
        }

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        // Parse event time ranges in minutes from midnight
        let inAnyLessonRange = false;

        for (const evt of events) {
          if (!evt.start_time || !evt.end_time) continue;
          
          const [startH, startM] = evt.start_time.split(':').map(Number);
          const [endH, endM] = evt.end_time.split(':').map(Number);

          const startMinutes = (startH || 0) * 60 + (startM || 0);
          const endMinutesWithGrace = (endH || 0) * 60 + (endM || 0) + (LESSON_END_GRACE_BUFFER_MS / 60000);

          // Lesson window includes 5-minute pre-lesson setup and 5-minute post-lesson grace
          if (currentMinutes >= startMinutes - 5 && currentMinutes <= endMinutesWithGrace) {
            inAnyLessonRange = true;
            break;
          }
        }

        if (inAnyLessonRange) {
          setIsLessonZone(true);
          setCurrentTimeoutMs(LESSON_BLOCK_TIMEOUT_MS);
        } else {
          setIsLessonZone(false);
          setCurrentTimeoutMs(POST_LESSON_TIMEOUT_MS);
        }
      } catch (err) {
        console.warn('[AdaptiveScheduleLock] Schedule evaluation error, defaulting to safe 10min:', err);
        if (isMounted) {
          setIsLessonZone(false);
          setCurrentTimeoutMs(POST_LESSON_TIMEOUT_MS);
        }
      }
    }

    evaluateTodaySchedule();

    // Re-evaluate schedule zone every 2 minutes
    const scheduleInterval = setInterval(evaluateTodaySchedule, 2 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(scheduleInterval);
    };
  }, [userId, userRole, schoolId, enabled, isTeacherOrStaff]);

  // 2. Immediate Lock Trigger (1-Tap Lock Button)
  const lockNow = useCallback(() => {
    console.log('[AdaptiveScheduleLock] Manual 1-Tap Lock triggered.');
    if (onLock) {
      onLock();
    }
  }, [onLock]);

  // 3. 3-Strike Fail-Closed Revocation Handler
  const handleFailedPinAttempt = useCallback((): boolean => {
    failedAttemptsRef.current += 1;
    console.warn(`[AdaptiveScheduleLock] Failed PIN attempt ${failedAttemptsRef.current}/3.`);

    if (failedAttemptsRef.current >= 3) {
      console.error('[AdaptiveScheduleLock] 3 failed PIN attempts! Revoking trusted device binding (Fail-Closed)...');
      if (userId) {
        clearRememberedPin(userId);
      }
      failedAttemptsRef.current = 0;
      if (onRevokeDeviceBinding) {
        onRevokeDeviceBinding();
      }
      return true; // Revoked!
    }
    return false;
  }, [userId, onRevokeDeviceBinding]);

  const resetFailedPinAttempts = useCallback(() => {
    failedAttemptsRef.current = 0;
  }, []);

  // 4. Inactivity Event Watcher
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || isScreenLocked) {
      if (timerRef.current) clearTimeout(timerRef.current);
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

    const triggerInactivityLock = () => {
      if (isMediaActive()) {
        resetActivity();
        return;
      }
      console.warn(`[AdaptiveScheduleLock] Inactivity limit (${currentTimeoutMs / 60000} min in ${isLessonZone ? 'Lesson' : 'Feierabend'} zone) reached. Locking...`);
      if (onLock) {
        onLock();
      }
    };

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(triggerInactivityLock, currentTimeoutMs);
    };

    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle event checks to at most once per 2 seconds
      if (now - lastActivityRef.current >= 2000) {
        resetActivity();
      }
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Start initial inactivity timer
    timerRef.current = setTimeout(triggerInactivityLock, currentTimeoutMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
    };
  }, [enabled, currentTimeoutMs, isLessonZone, isScreenLocked, onLock, checkMediaActive]);

  return {
    isLessonZone,
    currentTimeoutMs,
    lockNow,
    handleFailedPinAttempt,
    resetFailedPinAttempts
  };
}
