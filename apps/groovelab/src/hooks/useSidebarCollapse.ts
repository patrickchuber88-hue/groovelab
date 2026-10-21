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
const resolveEffectiveViewportWidth = (fallbackWidth?: number): number => {
  if (typeof window === 'undefined') return 1280;
  if (typeof document !== 'undefined') {
    const simWidth = Number(document.documentElement.getAttribute('data-sim-width'));
    if (simWidth > 0) return simWidth;
    const simEl = document.querySelector('.sim-viewport-mobile, .sim-viewport-tablet') as HTMLElement | null;
    if (simEl && simEl.clientWidth > 0) return simEl.clientWidth;
    if (document.documentElement.getAttribute('data-sim-category') === 'tablet' || document.querySelector('.sim-viewport-tablet')) {
      return 1024;
    }
  }
  return typeof fallbackWidth === 'number' && fallbackWidth > 0 ? fallbackWidth : window.innerWidth;
};

export function useSidebarCollapse(windowWidth?: number): UseSidebarCollapseReturn {
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const effectiveWidth = resolveEffectiveViewportWidth(windowWidth);
    // On tablet & compact viewports (<= 1180px), always default to collapsed rail mode (68px)
    // to prevent the 260px sidebar from overflowing the 68px rail on initial mount.
    if (effectiveWidth <= 1180) {
      return true;
    }
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY);
      if (stored !== null) {
        return stored === 'true';
      }
    } catch {
      // localStorage security/quota error fallback
    }

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

  // Dynamically update responsive state on window/simulator resize & orientation change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncResponsiveCollapse = () => {
      const effectiveWidth = resolveEffectiveViewportWidth(windowWidth);
      if (effectiveWidth <= 1180) {
        setIsCollapsedState(true);
        return;
      }
      try {
        if (localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) !== null) {
          setIsCollapsedState(localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === 'true');
          return;
        }
      } catch {}

      setIsCollapsedState(false);
    };

    syncResponsiveCollapse();
    window.addEventListener('groovelab_orientation_changed', syncResponsiveCollapse);
    window.addEventListener('orientationchange', syncResponsiveCollapse);
    return () => {
      window.removeEventListener('groovelab_orientation_changed', syncResponsiveCollapse);
      window.removeEventListener('orientationchange', syncResponsiveCollapse);
    };
  }, [windowWidth]);

  return {
    isCollapsed,
    setIsCollapsed,
    toggleCollapsed
  };
}

export default useSidebarCollapse;
