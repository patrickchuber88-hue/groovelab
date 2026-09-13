import { useEffect } from 'react';

/**
 * Custom hook to update the PWA Home Screen app badge counter.
 * Works natively on Android Chromium and iOS 16.4+ (Standalone PWA).
 */
export function useAppBadge(unreadCount: number): void {
  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        navigator.setAppBadge(unreadCount).catch((err) => {
          console.warn('[BadgingAPI] Failed to set app badge:', err);
        });
      } else {
        if ('clearAppBadge' in navigator) {
          navigator.clearAppBadge().catch((err) => {
            console.warn('[BadgingAPI] Failed to clear app badge:', err);
          });
        }
      }
    }
  }, [unreadCount]);
}

/**
 * Standalone imperative helper to set/clear app badge without hook context.
 */
export function setGlobalAppBadge(count: number): void {
  if (typeof navigator === 'undefined') return;

  if ('setAppBadge' in navigator) {
    if (count > 0) {
      navigator.setAppBadge(count).catch(() => {});
    } else if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(() => {});
    }
  }
}
