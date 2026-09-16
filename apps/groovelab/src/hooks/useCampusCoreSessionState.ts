import React, { useState, useEffect, useCallback } from 'react';

export interface UseCampusCoreSessionStateParams {
  locationSearch?: string;
  locationPathname?: string;
}

export interface UseCampusCoreSessionStateReturn {
  isLocalhost: boolean;
  loggedInUserId: string | null;
  setLoggedInUserId: (val: string | null | ((prev: string | null) => string | null)) => void;
  setLoggedInUserIdRaw: React.Dispatch<React.SetStateAction<string | null>>;
  locationMode: 'lab' | 'home';
  setLocationMode: (val: 'lab' | 'home' | ((prev: 'lab' | 'home') => 'lab' | 'home')) => void;
  setLocationModeRaw: React.Dispatch<React.SetStateAction<'lab' | 'home'>>;
  showDeletionPrompt: boolean;
  setShowDeletionPrompt: React.Dispatch<React.SetStateAction<boolean>>;
  deletionPromptUserId: string | null;
  setDeletionPromptUserId: React.Dispatch<React.SetStateAction<string | null>>;
  deletionPromptIsHome: boolean | undefined;
  setDeletionPromptIsHome: React.Dispatch<React.SetStateAction<boolean | undefined>>;
  showAutoLockWarning: boolean;
  setShowAutoLockWarning: React.Dispatch<React.SetStateAction<boolean>>;
  autoLockCountdown: number;
  setAutoLockCountdown: React.Dispatch<React.SetStateAction<number>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isOfflineMode: boolean;
  setIsOfflineMode: React.Dispatch<React.SetStateAction<boolean>>;
  isSchoolPaused: boolean;
  setIsSchoolPaused: React.Dispatch<React.SetStateAction<boolean>>;
  showSchoolOnboardingModal: boolean;
  setShowSchoolOnboardingModal: React.Dispatch<React.SetStateAction<boolean>>;
  showAdminSecuritySuiteModal: boolean;
  setShowAdminSecuritySuiteModal: React.Dispatch<React.SetStateAction<boolean>>;
  showQuarterlyAccessReportModal: boolean;
  setShowQuarterlyAccessReportModal: React.Dispatch<React.SetStateAction<boolean>>;
  qrPathMatch: RegExpMatchArray | null;
}

/**
 * 🏛️ Hook: useCampusCoreSessionState
 * Kapselt grundlegende Identitäts-, Authentifizierungs- und Onboarding-Zustände.
 * 
 * Bounded Contexts:
 * 1. User-ID Ermittlung & Multi-Tier Sync (PWA Standalone Kaltstart-Immunisierung).
 * 2. Location Mode ('lab' | 'home') mit Session-Storage-Synchronisation.
 * 3. Notfall-, Lösch- & Sperr-Dialoge (DeletionPrompt, Inaktivitäts-AutoLock).
 * 4. Systemzustände (Loading, OfflineMode, SchoolPaused, SchoolOnboarding, SecuritySuite).
 */
export function useCampusCoreSessionState({
  locationSearch,
  locationPathname
}: UseCampusCoreSessionStateParams = {}): UseCampusCoreSessionStateReturn {
  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.localhost') ||
    window.location.hostname.endsWith('.local')
  );

  const effectivePathname = locationPathname !== undefined
    ? locationPathname
    : (typeof window !== 'undefined' ? window.location.pathname : '');
  const qrPathMatch = effectivePathname.match(/^\/qr\/([^/?#]+)/);

  const [loggedInUserId, setLoggedInUserIdRaw] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const isMasterAuth = sessionStorage.getItem('groovelab_is_master_admin') === 'true';
    const ghostAuthToken = sessionStorage.getItem('groovelab_ghost_auth_token') || localStorage.getItem('groovelab_ghost_auth_token');
    const isMasterValid = isMasterAuth || Boolean(ghostAuthToken);

    const urlParams = new URLSearchParams(window.location.search);
    const isGhost = urlParams.get('support_ghost') === 'true' || 
                    urlParams.get('ghost_session') === 'true' || 
                    sessionStorage.getItem('groovelab_support_ghost') === 'true';
    const ghostSchoolId = urlParams.get('school_id') || 
                          urlParams.get('ghost_school_id') || 
                          sessionStorage.getItem('groovelab_ghost_school_id');
    if (isGhost && ghostSchoolId && isMasterValid) {
      return 'master-support-id';
    }
    const storedId = sessionStorage.getItem('groovelab_user_id');
    if (storedId) return storedId;
    try {
      const cached = sessionStorage.getItem('groovelab_cached_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.id) return parsed.id;
      }
    } catch (e) {}

    // 📱 PWA Standalone / Kaltstart-Immunisierung:
    // AUSSCHLIESSLICH im installierten PWA-Standalone-Modus (Home-Screen-App ohne Browser-Tabs)
    const isPwa = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isPwa) {
      const persistentId = localStorage.getItem('campus_active_student_id') ||
                           localStorage.getItem('groovelab_current_student_id') ||
                           localStorage.getItem('groovelab_user_id');
      if (persistentId) return persistentId;
    }
    return null;
  });

  const setLoggedInUserId = useCallback((val: string | null | ((prev: string | null) => string | null)) => {
    setLoggedInUserIdRaw((prev) => {
      const nextVal = typeof val === 'function' ? val(prev) : val;
      if (typeof window !== 'undefined') {
        const isPwa = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
        if (nextVal) {
          sessionStorage.setItem('groovelab_user_id', nextVal);
          if (isPwa) {
            localStorage.setItem('groovelab_user_id', nextVal);
            localStorage.setItem('campus_active_student_id', nextVal);
          }
        } else {
          sessionStorage.removeItem('groovelab_user_id');
          if (isPwa) {
            localStorage.removeItem('groovelab_user_id');
            localStorage.removeItem('campus_active_student_id');
            localStorage.removeItem('groovelab_current_student_id');
          }
        }
      }
      return nextVal;
    });
  }, []);

  const [locationMode, setLocationModeRaw] = useState<'lab' | 'home'>(() => {
    if (typeof window === 'undefined') return 'home';
    return (sessionStorage.getItem('groovelab_location_mode') as 'lab' | 'home') || 'home';
  });

  const setLocationMode = useCallback((val: 'lab' | 'home' | ((prev: 'lab' | 'home') => 'lab' | 'home')) => {
    setLocationModeRaw((prev) => {
      const nextVal = typeof val === 'function' ? val(prev) : val;
      if (prev === nextVal) return prev;
      if (typeof window !== 'undefined') {
        if (nextVal) {
          sessionStorage.setItem('groovelab_location_mode', nextVal);
        } else {
          sessionStorage.removeItem('groovelab_location_mode');
        }
      }
      return nextVal;
    });
  }, []);

  const [showDeletionPrompt, setShowDeletionPrompt] = useState(false);
  const [deletionPromptUserId, setDeletionPromptUserId] = useState<string | null>(null);
  const [deletionPromptIsHome, setDeletionPromptIsHome] = useState<boolean | undefined>(undefined);

  const [showAutoLockWarning, setShowAutoLockWarning] = useState(false);
  const [autoLockCountdown, setAutoLockCountdown] = useState(30);

  const [loading, setLoading] = useState(() => Boolean(
    typeof window !== 'undefined' && 
    sessionStorage.getItem('groovelab_user_id') && 
    !sessionStorage.getItem('groovelab_cached_user')
  ));
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isSchoolPaused, setIsSchoolPaused] = useState(false);
  const [showSchoolOnboardingModal, setShowSchoolOnboardingModal] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('invite') === 'school_onboarding' || 
           params.get('onboarding') === 'school' || 
           params.has('school_onboarding') ||
           window.location.search.includes('invite=school_onboarding');
  });

  const [showAdminSecuritySuiteModal, setShowAdminSecuritySuiteModal] = useState(false);
  const [showQuarterlyAccessReportModal, setShowQuarterlyAccessReportModal] = useState(false);

  useEffect(() => {
    const handleOpenSecuritySuite = () => setShowAdminSecuritySuiteModal(true);
    window.addEventListener('open_admin_security_suite', handleOpenSecuritySuite);
    return () => window.removeEventListener('open_admin_security_suite', handleOpenSecuritySuite);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('invite') === 'school_onboarding' || params.get('onboarding') === 'school' || params.has('school_onboarding')) {
        setShowSchoolOnboardingModal(true);
      }
    }
  }, [locationSearch]);

  return {
    isLocalhost,
    loggedInUserId,
    setLoggedInUserId,
    setLoggedInUserIdRaw,
    locationMode,
    setLocationMode,
    setLocationModeRaw,
    showDeletionPrompt,
    setShowDeletionPrompt,
    deletionPromptUserId,
    setDeletionPromptUserId,
    deletionPromptIsHome,
    setDeletionPromptIsHome,
    showAutoLockWarning,
    setShowAutoLockWarning,
    autoLockCountdown,
    setAutoLockCountdown,
    loading,
    setLoading,
    isOfflineMode,
    setIsOfflineMode,
    isSchoolPaused,
    setIsSchoolPaused,
    showSchoolOnboardingModal,
    setShowSchoolOnboardingModal,
    showAdminSecuritySuiteModal,
    setShowAdminSecuritySuiteModal,
    showQuarterlyAccessReportModal,
    setShowQuarterlyAccessReportModal,
    qrPathMatch
  };
}
