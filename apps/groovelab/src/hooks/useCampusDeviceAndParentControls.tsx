import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { CampusUiLevel } from '../components/campus/CampusLevelSwitcher';
import { LegalModalsHub } from '../components/modals/LegalModalsHub';
import { useInactivityTimeout, HARD_LOCK_TIMEOUT_MS } from './useInactivityTimeout';
import { executeSessionZeroize } from '../utils/sessionZeroize';
import { isDevEnvironment } from '../utils/tenantUrlHelper';
import { safeReplaceState } from '../utils/historyUtils';

export interface UseCampusDeviceAndParentControlsParams {
  searchParams: URLSearchParams;
  currentView: string;
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  setLoggedInUserId: (id: string) => void;
}

export interface UseCampusDeviceAndParentControlsReturn {
  // Kiosk & Station
  kioskDetails: any;
  setKioskDetails: React.Dispatch<React.SetStateAction<any>>;
  loadingKiosk: boolean;
  setLoadingKiosk: React.Dispatch<React.SetStateAction<boolean>>;
  kioskRoomIdParam: string | null;
  kioskSetupParam: string | null;
  kioskBootstrapping: boolean;
  setKioskBootstrapping: React.Dispatch<React.SetStateAction<boolean>>;
  stationIdFromStorage: string | null;
  setStationIdFromStorage: React.Dispatch<React.SetStateAction<string | null>>;

  // Date / Dev Simulation
  simulatedDate: string | null;
  setSimulatedDate: React.Dispatch<React.SetStateAction<string | null>>;
  showDateSimulation: boolean;
  setShowDateSimulation: React.Dispatch<React.SetStateAction<boolean>>;

  // Didactics & Parent Controls
  campusStudentUiLevel: CampusUiLevel;
  setCampusStudentUiLevel: React.Dispatch<React.SetStateAction<CampusUiLevel>>;
  parentUnlocked: boolean;
  setParentUnlocked: React.Dispatch<React.SetStateAction<boolean>>;
  parentPermissionsVersion: number;
  setParentPermissionsVersion: React.Dispatch<React.SetStateAction<number>>;
  isCampusUnlocked: boolean;
  setIsCampusUnlocked: React.Dispatch<React.SetStateAction<boolean>>;
  showCampusPinPrompt: boolean;
  setShowCampusPinPrompt: React.Dispatch<React.SetStateAction<boolean>>;

  // Legal & Help Modals
  showPrivacy: boolean;
  setShowPrivacy: React.Dispatch<React.SetStateAction<boolean>>;
  showAgb: boolean;
  setShowAgb: React.Dispatch<React.SetStateAction<boolean>>;
  showImpressum: boolean;
  setShowImpressum: React.Dispatch<React.SetStateAction<boolean>>;
  showCancellation: boolean;
  setShowCancellation: React.Dispatch<React.SetStateAction<boolean>>;
  showAccessibility: boolean;
  setShowAccessibility: React.Dispatch<React.SetStateAction<boolean>>;
  showTrialInfoModal: boolean;
  setShowTrialInfoModal: React.Dispatch<React.SetStateAction<boolean>>;
  isGlobalHelpCenterOpen: boolean;
  setIsGlobalHelpCenterOpen: React.Dispatch<React.SetStateAction<boolean>>;
  renderLegalModals: () => React.JSX.Element;

  // Inactivity Screen Lock
  isScreenLockedByInactivity: boolean;
  setIsScreenLockedByInactivity: React.Dispatch<React.SetStateAction<boolean>>;
  effectiveInactivityTimeoutMs: number;
}

/**
 * 🏛️ useCampusDeviceAndParentControls (Monolith Goldstandard Hook)
 * Kapselt Kiosk-Kopplung, Datums-/Dev-Simulation (Shift+T), didaktische Elternkontrollen/UI-Level
 * (junior/teen/pro mit Realtime Broadcasts), Inaktivitäts-Bildschirmsperre und die rechtlichen Dialoge.
 */
export function useCampusDeviceAndParentControls({
  searchParams,
  currentView,
  user,
  setUser,
  setLoggedInUserId
}: UseCampusDeviceAndParentControlsParams): UseCampusDeviceAndParentControlsReturn {
  // States for Kiosk lookup and legal modals
  const [kioskDetails, setKioskDetails] = useState<any>(null);
  const [loadingKiosk, setLoadingKiosk] = useState<boolean>(() => typeof window !== 'undefined' ? !!localStorage.getItem('groovelab_kiosk_token') : false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAgb, setShowAgb] = useState(false);
  const [showImpressum, setShowImpressum] = useState(false);
  const [showCancellation, setShowCancellation] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [showTrialInfoModal, setShowTrialInfoModal] = useState(false);
  const [stationIdFromStorage, setStationIdFromStorage] = useState<string | null>(() => typeof window !== 'undefined' ? localStorage.getItem('groovelab_station_id') : null);
  const [isCampusUnlocked, setIsCampusUnlocked] = useState(false);
  const [showCampusPinPrompt, setShowCampusPinPrompt] = useState(false);
  const [isGlobalHelpCenterOpen, setIsGlobalHelpCenterOpen] = useState(false);
  const [simulatedDate, setSimulatedDate] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('groovelab_simulated_date') || null;
    }
    return null;
  });

  const [showDateSimulation, setShowDateSimulation] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !isDevEnvironment()) return false;
    return localStorage.getItem('groovelab_dev_date_sim_visible') === 'true';
  });

  // Shift + T Dev-Simulation Keyboard Shortcut
  useEffect(() => {
    if (!isDevEnvironment()) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'T' || e.key === 't')) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        setShowDateSimulation(prev => {
          const next = !prev;
          try { localStorage.setItem('groovelab_dev_date_sim_visible', String(next)); } catch {}
          window.dispatchEvent(new CustomEvent('groovelab_date_sim_toggle', { detail: next }));
          return next;
        });
      }
    };
    const handleToggleSync = (e: any) => {
      if (typeof e?.detail === 'boolean') {
        setShowDateSimulation(e.detail);
      } else {
        const saved = localStorage.getItem('groovelab_dev_date_sim_visible') === 'true';
        setShowDateSimulation(saved);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('groovelab_date_sim_toggle', handleToggleSync);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('groovelab_date_sim_toggle', handleToggleSync);
    };
  }, []);

  const [campusStudentUiLevel, setCampusStudentUiLevel] = useState<CampusUiLevel>(() => {
    if (typeof window === 'undefined') return 'junior';
    try {
      const activeId = localStorage.getItem('groovelab_current_user_id') || localStorage.getItem('campus_active_user_id');
      if (activeId) {
        const namespaced = localStorage.getItem(`campus_student_ui_level_${activeId}`);
        if (namespaced === 'junior' || namespaced === 'teen' || namespaced === 'pro') return namespaced as CampusUiLevel;
      }
    } catch {}
    const saved = localStorage.getItem('campus_student_ui_level');
    if (saved === 'junior' || saved === 'teen' || saved === 'pro') return saved as CampusUiLevel;
    return 'junior';
  });

  const [parentUnlocked, setParentUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('groovelab_parent_unlocked_global') === 'true';
  });

  const [parentPermissionsVersion, setParentPermissionsVersion] = useState<number>(0);

  useEffect(() => {
    const handleLevelChangeEvt = (e: any) => {
      if (!e?.detail) return;
      const raw = e.detail;
      const levelStr = typeof raw === 'object' && raw?.uiLevel ? raw.uiLevel : raw;
      if (levelStr === 'junior' || levelStr === 'teen' || levelStr === 'pro') {
        setCampusStudentUiLevel(levelStr);
        try {
          const targetId = typeof raw === 'object' && raw?.studentId ? raw.studentId : (localStorage.getItem('groovelab_current_user_id') || localStorage.getItem('campus_active_user_id'));
          if (targetId) {
            localStorage.setItem(`campus_student_ui_level_${targetId}`, levelStr);
          }
        } catch {}
        localStorage.setItem('campus_student_ui_level', levelStr);
      }
    };
    const handleParentModeChange = (e: any) => {
      if (typeof e?.detail === 'boolean') setParentUnlocked(e.detail);
    };
    const handlePermissionChange = () => {
      setParentPermissionsVersion(v => v + 1);
    };
    const handleSimDateSync = () => {
      const s = localStorage.getItem('groovelab_simulated_date');
      setSimulatedDate(s || null);
    };
    const handleOpenHelpCenter = () => {
      setIsGlobalHelpCenterOpen(true);
    };
    const handleFamilyStudentSwitched = (e: any) => {
      if (e?.detail && typeof e.detail === 'string') {
        console.log('[App] Family student switch event received:', e.detail);
        setLoggedInUserId(e.detail);
      }
    };
    window.addEventListener('campus_family_student_switched', handleFamilyStudentSwitched);
    window.addEventListener('campus_ui_level_changed', handleLevelChangeEvt);
    window.addEventListener('groovelab_parent_mode_changed', handleParentModeChange);
    window.addEventListener('campus_board_permission_changed', handlePermissionChange);
    window.addEventListener('campus_open_help_center', handleOpenHelpCenter);
    window.addEventListener('storage', handleSimDateSync);
    window.addEventListener('groovelab_simulated_date_changed', handleSimDateSync);
    return () => {
      window.removeEventListener('campus_family_student_switched', handleFamilyStudentSwitched);
      window.removeEventListener('campus_ui_level_changed', handleLevelChangeEvt);
      window.removeEventListener('groovelab_parent_mode_changed', handleParentModeChange);
      window.removeEventListener('campus_board_permission_changed', handlePermissionChange);
      window.removeEventListener('campus_open_help_center', handleOpenHelpCenter);
      window.removeEventListener('storage', handleSimDateSync);
      window.removeEventListener('groovelab_simulated_date_changed', handleSimDateSync);
    };
  }, [setLoggedInUserId]);

  // Effect to resolve the kiosk token on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check query params to capture and persist the coupling state on this device
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('kiosk_token');
    const urlStationId = params.get('station_id');
    const urlRoomId = params.get('kiosk_room_id');

    if (urlToken && urlStationId) {
      console.log('[KioskAutoSave] Found coupling parameters in URL, saving to localStorage:', { urlToken, urlStationId, urlRoomId });
      localStorage.setItem('groovelab_kiosk_token', urlToken);
      localStorage.setItem('groovelab_station_id', urlStationId);
      if (urlRoomId) {
        localStorage.setItem('groovelab_kiosk_room_id', urlRoomId);
      }
      localStorage.setItem('groovelab_active_platform', 'groovelab');
      setStationIdFromStorage(urlStationId);

      // Clean up the URL parameters if running in standalone (PWA) mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      if (isStandalone) {
        const cleanUrl = window.location.origin + window.location.pathname;
        safeReplaceState({}, document.title, cleanUrl);
      }
    }
    
    const token = localStorage.getItem('groovelab_kiosk_token');
    if (!token) {
      setLoadingKiosk(false);
      return;
    }
    
    async function loadKiosk() {
      try {
        console.log('[KioskResolver] Resolving kiosk token:', token);
        const { data, error } = await supabase
          .from('kiosks')
          .select('*, stations(*), rooms(*)')
          .eq('secret_token', token)
          .maybeSingle();
          
        if (error) throw error;
        if (data) {
          console.log('[KioskResolver] Resolved Kiosk:', data);
          setKioskDetails(data);
          if (data.station_id) {
            localStorage.setItem('groovelab_station_id', data.station_id);
            setStationIdFromStorage(data.station_id);
          }
          if (data.room_id) {
            localStorage.setItem('groovelab_kiosk_room_id', data.room_id);
          }
        } else {
          console.warn("[KioskResolver] Invalid kiosk token. Clearing kiosk storage.");
          localStorage.removeItem('groovelab_kiosk_token');
          localStorage.removeItem('groovelab_station_id');
          localStorage.removeItem('groovelab_kiosk_room_id');
          setStationIdFromStorage(null);
        }
      } catch (err) {
        console.error("[KioskResolver] Error loading kiosk details:", err);
      } finally {
        setLoadingKiosk(false);
      }
    }
    loadKiosk();
  }, []);

  // Kiosk Room Auto-Bootstrap
  const kioskRoomIdParam = searchParams.get('kiosk_room_id');
  const kioskSetupParam = searchParams.get('kiosk_setup');
  const isPairingRedirect = searchParams.has('kiosk_token') && searchParams.has('station_id');

  const [kioskBootstrapping, setKioskBootstrapping] = useState<boolean>(() => {
    return !!kioskRoomIdParam && kioskSetupParam !== '1' && !isPairingRedirect;
  });

  useEffect(() => {
    const kioskRoomId = searchParams.get('kiosk_room_id');
    const isSetupMode = searchParams.get('kiosk_setup') === '1';
    if (!kioskRoomId || isSetupMode || isPairingRedirect) return;

    const bootstrap = async () => {
      try {
        console.log('[KioskBootstrap] Auto-resolving station for room:', kioskRoomId);
        const { data: roomStations } = await supabase
          .from('stations')
          .select('id, name')
          .eq('room_id', kioskRoomId)
          .order('name');

        if (roomStations && roomStations.length > 0) {
          const nonTeacher = roomStations.find((s: any) => !s.name?.toLowerCase().includes('lehrer'));
          const chosen = nonTeacher || roomStations[0];
          localStorage.setItem('groovelab_station_id', chosen.id);
          console.log('[KioskBootstrap] Station set to:', chosen.name, chosen.id);
        } else {
          localStorage.setItem('groovelab_station_id', 'skip');
          console.warn('[KioskBootstrap] No stations found for room. Falling back to skip.');
        }
      } catch (err) {
        console.error('[KioskBootstrap] Failed to resolve station:', err);
        localStorage.setItem('groovelab_station_id', 'skip');
      }

      const cleanUrl = window.location.origin + window.location.pathname;
      window.location.replace(cleanUrl);
    };

    bootstrap();
  }, [searchParams, isPairingRedirect]);

  // 🛡️ REVISIONSSICHERE DATENBANK-SSOT-SYNCHRONISATION
  // Sobald der autoritative Benutzer aus der Datenbank (Supabase) geladen wird, MUSS sein campus_ui_level sofort übernommen werden.
  useEffect(() => {
    if (user?.campus_ui_level && (user.campus_ui_level === 'junior' || user.campus_ui_level === 'teen' || user.campus_ui_level === 'pro')) {
      setCampusStudentUiLevel(user.campus_ui_level);
      if (user.id) {
        localStorage.setItem(`campus_student_ui_level_${user.id}`, user.campus_ui_level);
      }
      localStorage.setItem('campus_student_ui_level', user.campus_ui_level);
    }
  }, [user?.campus_ui_level, user?.id]);

  // Reagiert sofort und ohne Reload auf UI-Level-Änderungen aus dem Elternbereich anderer Clients
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`realtime_student_progress_${user.id}`);
    channel
      .on('broadcast', { event: 'ui-level-changed' }, (payload: any) => {
        const newLevel = payload?.payload?.uiLevel;
        if (newLevel && (newLevel === 'junior' || newLevel === 'teen' || newLevel === 'pro')) {
          console.log('[Realtime-Root] UI-Level update broadcast received:', newLevel);
          setCampusStudentUiLevel(newLevel);
          setUser((prev: any) => prev ? { ...prev, campus_ui_level: newLevel } : prev);
          try {
            localStorage.setItem(`campus_student_ui_level_${user.id}`, newLevel);
            localStorage.setItem('campus_student_ui_level', newLevel);
          } catch {}
          window.dispatchEvent(new CustomEvent('campus_ui_level_changed', { detail: newLevel }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, setUser]);

  // 🔒 Dynamic Inactivity Idle Screen Lock (Enterprise Goldstandard / Reload-Resistant):
  const [isScreenLockedByInactivity, setIsScreenLockedByInactivityRaw] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const isLocked = sessionStorage.getItem('campus_session_locked') === 'true' ||
                       localStorage.getItem('campus_session_locked') === 'true';
      if (isLocked) {
        const lockedAtStr = sessionStorage.getItem('campus_locked_at') || localStorage.getItem('campus_locked_at');
        if (lockedAtStr) {
          const lockedAt = parseInt(lockedAtStr, 10);
          if (!isNaN(lockedAt) && Date.now() - lockedAt >= HARD_LOCK_TIMEOUT_MS) {
            console.warn('[SessionLock] Hard lock timeout exceeded on boot (> 2 hours). Executing session zeroize...');
            executeSessionZeroize({ preserveDeviceKey: true, redirectUrl: '/' });
            return false;
          }
        }
        return true;
      }
    } catch (_) {}
    return false;
  });

  const setIsScreenLockedByInactivity = useCallback<React.Dispatch<React.SetStateAction<boolean>>>((action) => {
    setIsScreenLockedByInactivityRaw((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (typeof window !== 'undefined') {
        try {
          const isPwa = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
          if (next) {
            sessionStorage.setItem('campus_session_locked', 'true');
            sessionStorage.setItem('campus_locked_at', String(Date.now()));
            if (isPwa) {
              localStorage.setItem('campus_session_locked', 'true');
              localStorage.setItem('campus_locked_at', String(Date.now()));
            }
          } else {
            sessionStorage.removeItem('campus_session_locked');
            sessionStorage.removeItem('campus_locked_at');
            sessionStorage.setItem('campus_last_active_ts', String(Date.now()));
            if (isPwa) {
              localStorage.removeItem('campus_session_locked');
              localStorage.removeItem('campus_locked_at');
            }
          }
        } catch (_) {}
      }
      return next;
    });
  }, []);

  const effectiveInactivityTimeoutMs = useMemo(() => {
    const activeRole = (user?.role || '').toLowerCase();
    if (activeRole === 'admin' || activeRole === 'secretary') {
      return 45 * 60 * 1000; // 45 Minuten für Verwaltung
    }
    if (activeRole === 'teacher') {
      return 60 * 60 * 1000; // 60 Minuten für Lehrkräfte
    }
    return 45 * 60 * 1000; // Fallback 45 Minuten
  }, [user?.role]);

  useInactivityTimeout({
    timeoutMs: effectiveInactivityTimeoutMs,
    enabled: Boolean(currentView === 'dashboard'),
    isScreenLocked: isScreenLockedByInactivity,
    onTimeout: () => {
      console.warn(`[Inactivity] Idle timeout reached (${effectiveInactivityTimeoutMs / 60000}m). Activating Privacy Screen Lock...`);
      try {
        const storedUserStr = sessionStorage.getItem('groovelab_cached_user');
        if (storedUserStr) {
          const parsed = JSON.parse(storedUserStr);
          if (parsed?.role === 'admin' && Array.isArray(parsed?.roles) && parsed.roles.includes('teacher')) {
            console.log('[Inactivity] Downgrading active role from admin to teacher (Least Privilege)...');
            sessionStorage.setItem('groovelab_active_workspace', 'teacher');
          }
        }
      } catch (e) {}
      setIsScreenLockedByInactivity(true);
    }
  });

  // Declarative definition of renderLegalModals
  const renderLegalModals = (): React.JSX.Element => (
    <LegalModalsHub
      showPrivacy={showPrivacy}
      showAgb={showAgb}
      showImpressum={showImpressum}
      showCancellation={showCancellation}
      showAccessibility={showAccessibility}
      onClose={() => {
        setShowPrivacy(false);
        setShowAgb(false);
        setShowImpressum(false);
        setShowCancellation(false);
        setShowAccessibility(false);
      }}
    />
  );

  return {
    kioskDetails,
    setKioskDetails,
    loadingKiosk,
    setLoadingKiosk,
    kioskRoomIdParam,
    kioskSetupParam,
    kioskBootstrapping,
    setKioskBootstrapping,
    stationIdFromStorage,
    setStationIdFromStorage,
    simulatedDate,
    setSimulatedDate,
    showDateSimulation,
    setShowDateSimulation,
    campusStudentUiLevel,
    setCampusStudentUiLevel,
    parentUnlocked,
    setParentUnlocked,
    parentPermissionsVersion,
    setParentPermissionsVersion,
    isCampusUnlocked,
    setIsCampusUnlocked,
    showCampusPinPrompt,
    setShowCampusPinPrompt,
    showPrivacy,
    setShowPrivacy,
    showAgb,
    setShowAgb,
    showImpressum,
    setShowImpressum,
    showCancellation,
    setShowCancellation,
    showAccessibility,
    setShowAccessibility,
    showTrialInfoModal,
    setShowTrialInfoModal,
    isGlobalHelpCenterOpen,
    setIsGlobalHelpCenterOpen,
    renderLegalModals,
    isScreenLockedByInactivity,
    setIsScreenLockedByInactivity,
    effectiveInactivityTimeoutMs
  };
}
