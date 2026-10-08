import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'campus_rooms_right_sidebar_open';

export interface UseRoomSidebarStateReturn {
  isRightSidebarOpen: boolean;
  setIsRightSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
}

export const useRoomSidebarState = (): UseRoomSidebarStateReturn => {
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Default to open (true) if not set (Zero-Surprise-Doktrin)
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleSidebar = useCallback(() => {
    setIsRightSidebarOpen(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Safe fail-closed handling
      }
      return next;
    });
  }, []);

  const setSidebarState: React.Dispatch<React.SetStateAction<boolean>> = useCallback((action) => {
    setIsRightSidebarOpen(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Safe fail-closed handling
      }
      return next;
    });
  }, []);

  // Global Keyboard Shortcut: 'b' or 'B' toggles sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tagName = target.tagName?.toLowerCase();
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        target.isContentEditable ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      ) {
        return;
      }

      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  return {
    isRightSidebarOpen,
    setIsRightSidebarOpen: setSidebarState,
    toggleSidebar
  };
};
