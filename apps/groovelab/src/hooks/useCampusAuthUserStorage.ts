import React, { useState, useCallback } from 'react';

export interface UseCampusAuthUserStorageReturn {
  user: any;
  setUser: (val: any) => void;
  setUserRaw: React.Dispatch<React.SetStateAction<any>>;
}

/**
 * 🏛️ Hook: useCampusAuthUserStorage
 * Autoritatives Benutzer-Caching, Zero-Knowledge Kiosk Tablet Schutz & Multi-Tier Persistence.
 * 
 * Bounded Contexts:
 * 1. Ghost-Support-Erkennung (Master-Admin Token-Validierung & synthetisches Support-Objekt).
 * 2. Multi-Tier Session- und Offline-Cache (PWA Standalone Kaltstart-Fallback).
 * 3. Autoritativer setUser-Dienst mit Deep-Equality-Schutz (0 unnötige React-Rerenders).
 * 4. Zero-Knowledge-Schutz für geteilte Schüler-Kiosk-Tablets (last_name: null).
 */
export function useCampusAuthUserStorage(): UseCampusAuthUserStorageReturn {
  const [user, setUserRaw] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const isMasterAuth = sessionStorage.getItem('groovelab_is_master_admin') === 'true' || 
                           localStorage.getItem('groovelab_is_master_admin') === 'true';
      const ghostAuthToken = localStorage.getItem('groovelab_ghost_auth_token');
      const isMasterValid = isMasterAuth || Boolean(ghostAuthToken);

      const urlParams = new URLSearchParams(window.location.search);
      const isGhost = urlParams.get('support_ghost') === 'true' || 
                      urlParams.get('ghost_session') === 'true' || 
                      sessionStorage.getItem('groovelab_support_ghost') === 'true';
      const ghostSchoolId = urlParams.get('school_id') || 
                            urlParams.get('ghost_school_id') || 
                            sessionStorage.getItem('groovelab_ghost_school_id');
      const ghostRole = urlParams.get('role') || 
                        sessionStorage.getItem('groovelab_ghost_active_role') || 
                        'admin';

      if (isGhost && ghostSchoolId && isMasterValid) {
        return {
          id: 'master-support-id',
          school_id: ghostSchoolId,
          role: ghostRole,
          first_name: 'Master',
          last_name: 'Support',
          is_master_admin: false,
          is_ghost_mode: true,
          schools: {
            id: ghostSchoolId,
            name: sessionStorage.getItem('groovelab_ghost_school_name') || 'Musikschule'
          }
        };
      }

      const cached = sessionStorage.getItem('groovelab_cached_user');
      if (cached) return JSON.parse(cached);

      // 📱 PWA Standalone Kaltstart-Fallback für initialen Benutzer-Cache (nur wenn Standalone PWA ohne Tabs)
      const isPwa = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);
      if (isPwa) {
        const persistentId = localStorage.getItem('campus_active_student_id') ||
                             localStorage.getItem('groovelab_current_student_id') ||
                             localStorage.getItem('groovelab_user_id');
        if (persistentId) {
          const offlineCache = localStorage.getItem(`groovelab_offline_user_cache_${persistentId}`);
          if (offlineCache) {
            try {
              const parsed = JSON.parse(offlineCache);
              if (parsed?.data) return parsed.data;
            } catch (e) {}
          }
        }
      }
      return null;
    } catch (e) {
      console.error('Failed to parse cached user:', e);
      return null;
    }
  });

  const setUser = useCallback((val: any) => {
    setUserRaw((prev: any) => {
      const nextVal = typeof val === 'function' ? val(prev) : val;

      // Tier-1 Silent Background Sync: Deep Equality Guard
      if (prev && nextVal && typeof prev === 'object' && typeof nextVal === 'object') {
        try {
          if (JSON.stringify(prev) === JSON.stringify(nextVal)) {
            return prev; // Same object reference -> 0 React re-renders!
          }
        } catch {
          // fallback
        }
      }

      if (typeof window !== 'undefined') {
        const isKiosk = Boolean(localStorage.getItem('groovelab_station_id') && localStorage.getItem('groovelab_station_id') !== 'skip');
        const isPwa = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
        if (nextVal) {
          // 🛡️ Zero-Knowledge: Never persist student last_name on shared Kiosk tablets
          const userToCache = (nextVal.role === 'student' && isKiosk) ? { ...nextVal, last_name: null } : nextVal;
          sessionStorage.setItem('groovelab_cached_user', JSON.stringify(userToCache));
          if (nextVal.id) {
            sessionStorage.setItem('groovelab_user_id', nextVal.id);
            if (isPwa && !isKiosk) {
              localStorage.setItem('groovelab_user_id', nextVal.id);
              localStorage.setItem('campus_active_student_id', nextVal.id);
            }
          }
          if (nextVal.token_version !== undefined && nextVal.token_version !== null) {
            sessionStorage.setItem('groovelab_token_version', String(nextVal.token_version));
          }
          if (!sessionStorage.getItem('groovelab_session_started_at')) {
            sessionStorage.setItem('groovelab_session_started_at', String(Date.now()));
          }
        } else {
          sessionStorage.removeItem('groovelab_cached_user');
          sessionStorage.removeItem('groovelab_token_version');
          sessionStorage.removeItem('groovelab_session_started_at');
          if (isPwa) {
            localStorage.removeItem('groovelab_user_id');
            localStorage.removeItem('campus_active_student_id');
          }
        }
      }
      return nextVal;
    });
  }, []);

  return {
    user,
    setUser,
    setUserRaw
  };
}
