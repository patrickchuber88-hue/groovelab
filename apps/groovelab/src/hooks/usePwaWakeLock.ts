import { useEffect, useRef, useCallback } from 'react';

interface WakeLockSentinelLike extends EventTarget {
  readonly released: boolean;
  readonly type: 'screen';
  release(): Promise<void>;
  onrelease: ((this: WakeLockSentinelLike, ev: Event) => void) | null;
}

interface NavigatorWithWakeLock {
  wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinelLike>;
  };
}

/**
 * 📱 Apple WebKit & PWA Screen WakeLock Hook
 * 
 * Specifically optimized for iOS 16.4+ and WebKit standalone PWAs:
 * - Automatically acquires screen lock during active practice, playback or sheet-music view.
 * - Automatically re-acquires lock when returning from background (visibilitychange),
 *   counteracting iOS Safari's aggressive lock-release on multitasking or control center swipes.
 * - Cleanly releases lock on unmount or when `active` transitions to false.
 */
export function usePwaWakeLock(active = true): {
  isSupported: boolean;
  requestLock: () => Promise<void>;
  releaseLock: () => Promise<void>;
} {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  const requestLock = useCallback(async () => {
    if (!isSupported) return;
    const nav = navigator as NavigatorWithWakeLock;
    if (!nav.wakeLock) return;

    // Avoid duplicate lock requests if existing sentinel is still active
    if (sentinelRef.current && !sentinelRef.current.released) {
      return;
    }

    try {
      const sentinel = await nav.wakeLock.request('screen');
      sentinelRef.current = sentinel;
      sentinel.onrelease = () => {
        if (sentinelRef.current === sentinel) {
          sentinelRef.current = null;
        }
      };
    } catch (err) {
      // In WebKit, requesting wake lock when document is not fully active or visible throws NotAllowedError
      // Silently catch to prevent unhandled promise rejections
      console.warn('[usePwaWakeLock] Could not acquire screen wake lock:', err);
    }
  }, [isSupported]);

  const releaseLock = useCallback(async () => {
    if (sentinelRef.current) {
      try {
        await sentinelRef.current.release();
      } catch (err) {
        console.warn('[usePwaWakeLock] Could not release screen wake lock:', err);
      } finally {
        sentinelRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    if (!isSupported || !active) {
      void releaseLock();
      return;
    }

    // 1. Initial lock acquisition when active
    void requestLock();

    // 2. WebKit / iOS Re-Acquisition on visibilitychange
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && active) {
        void requestLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void releaseLock();
    };
  }, [active, isSupported, requestLock, releaseLock]);

  return {
    isSupported,
    requestLock,
    releaseLock
  };
}
