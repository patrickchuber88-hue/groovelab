import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'campus_rooms_top_catalog_collapsed';

export interface UseRoomTopCatalogStateReturn {
  isTopCatalogCollapsed: boolean;
  setIsTopCatalogCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleTopCatalog: () => void;
}

export const useRoomTopCatalogState = (): UseRoomTopCatalogStateReturn => {
  const [isTopCatalogCollapsed, setIsTopCatalogCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Default to expanded (false) if not set (Zero-Surprise-Doktrin für Erstbesucher)
      return stored !== null ? stored === 'true' : false;
    } catch {
      return false;
    }
  });

  const toggleTopCatalog = useCallback(() => {
    setIsTopCatalogCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Safe fail-closed handling
      }
      return next;
    });
  }, []);

  const setCatalogState: React.Dispatch<React.SetStateAction<boolean>> = useCallback((action) => {
    setIsTopCatalogCollapsed(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Safe fail-closed handling
      }
      return next;
    });
  }, []);

  // Global Keyboard Shortcut: 'r' or 'R' toggles top room catalog focus mode
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

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        toggleTopCatalog();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTopCatalog]);

  return {
    isTopCatalogCollapsed,
    setIsTopCatalogCollapsed: setCatalogState,
    toggleTopCatalog
  };
};
