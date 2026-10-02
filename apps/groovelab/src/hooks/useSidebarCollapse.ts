import { useState, useEffect, useCallback } from 'react';

export const SIDEBAR_COLLAPSE_STORAGE_KEY = 'campus_sidebar_collapsed';
export const SIDEBAR_COLLAPSE_EVENT_NAME = 'campus_sidebar_collapsed_changed';

export interface UseSidebarCollapseReturn {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void;
  toggleCollapsed: () => void;
}

/**
 * 🏛️ useSidebarCollapse Hook (0,1% Enterprise Goldstandard)
 * 
 * Manages the Gemini-style collapsible sidebar state (68px rail <-> 260px expanded).
 * - Persists state in `localStorage` under `campus_sidebar_collapsed`.
 * - Emits and listens to `campus_sidebar_collapsed_changed` for cross-component sync.
 * - Synchronizes across browser tabs via the `storage` event.
 * - Defaults to collapsed rail mode on tablets and compact screens (<= 1180px).
 */
export function useSidebarCollapse(windowWidth?: number): UseSidebarCollapseReturn {
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY);
      if (stored !== null) {
        return stored === 'true';
      }
    } catch {
      // localStorage security/quota error fallback
    }

    // Default responsive behavior:
    // On tablet & smaller desktop viewports (<= 1180px), default to rail mode (68px).
    // On wide desktop screens (> 1180px), default to expanded (260px).
    const effectiveWidth = typeof windowWidth === 'number' ? windowWidth : window.innerWidth;
    return effectiveWidth <= 1180;
  });

  const setIsCollapsed = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    setIsCollapsedState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, String(next));
        window.dispatchEvent(
          new CustomEvent(SIDEBAR_COLLAPSE_EVENT_NAME, {
            detail: { isCollapsed: next }
          })
        );
      } catch {
        // Silently handle quota / private mode storage errors
      }
      return next;
    });
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, [setIsCollapsed]);

  // Synchronize with external changes (custom event & other tabs via storage event)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleCustomSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ isCollapsed: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.isCollapsed === 'boolean') {
        setIsCollapsedState(customEvent.detail.isCollapsed);
      } else {
        try {
          const stored = localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY);
          if (stored !== null) {
            setIsCollapsedState(stored === 'true');
          }
        } catch {}
      }
    };

    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === SIDEBAR_COLLAPSE_STORAGE_KEY && e.newValue !== null) {
        setIsCollapsedState(e.newValue === 'true');
      }
    };

    window.addEventListener(SIDEBAR_COLLAPSE_EVENT_NAME, handleCustomSync);
    window.addEventListener('storage', handleStorageSync);

    return () => {
      window.removeEventListener(SIDEBAR_COLLAPSE_EVENT_NAME, handleCustomSync);
      window.removeEventListener('storage', handleStorageSync);
    };
  }, []);

  // Dynamically update responsive state on window resize when no manual preference is stored
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) !== null) {
        return;
      }
    } catch {}

    const effectiveWidth = typeof windowWidth === 'number' ? windowWidth : window.innerWidth;
    setIsCollapsedState(effectiveWidth <= 1180);
  }, [windowWidth]);

  return {
    isCollapsed,
    setIsCollapsed,
    toggleCollapsed
  };
}

export default useSidebarCollapse;
