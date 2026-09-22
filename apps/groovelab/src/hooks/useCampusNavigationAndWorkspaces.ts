import React, { useState, useEffect, useCallback } from 'react';
import { announceA11y } from '../components/common/A11yLiveAnnouncer';

export const showEnsemblesFeature = false;

export type PlatformType = 'campus' | 'groovelab' | 'ensembles';

export interface UseCampusNavigationAndWorkspacesParams {
  user: any;
  locationMode: 'lab' | 'home';
  onResetRecipient?: () => void;
}

export interface UseCampusNavigationAndWorkspacesReturn {
  activePlatform: PlatformType;
  setActivePlatform: (val: any, forceUnlock?: boolean) => void;
  setActivePlatformRaw: React.Dispatch<React.SetStateAction<PlatformType>>;
  activeWorkspace: string | null;
  setActiveWorkspace: (ws: string | null) => void;
  activeStudentTab: string;
  setActiveStudentTab: (val: any) => void;
  setActiveStudentTabRaw: React.Dispatch<React.SetStateAction<string>>;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  sidebarNotificationsCount: number;
  setSidebarNotificationsCount: React.Dispatch<React.SetStateAction<number>>;
  isMusicStandMode: boolean;
  setIsMusicStandMode: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMusicStandMode: () => void;
  activeBandSubTab: 'meine' | 'alle';
  setActiveBandSubTab: React.Dispatch<React.SetStateAction<'meine' | 'alle'>>;
}

/**
 * 🏛️ useCampusNavigationAndWorkspaces (Monolith Goldstandard Hook)
 * Kapselt Plattform-Wechsel (campus, groovelab, ensembles) mit Berechtigungs- und Medienprüfungen,
 * Workspace-Verwaltung (admin, teacher, student, secretary), didaktische Tab-Navigation mit
 * barrierefreien Screenreader-Ansagen (BFSG / WCAG 2.2 AA) sowie Notenständer- und Sidebar-Zustände.
 */
export function useCampusNavigationAndWorkspaces({
  user,
  locationMode,
  onResetRecipient
}: UseCampusNavigationAndWorkspacesParams): UseCampusNavigationAndWorkspacesReturn {
  // 1. Plattform-Steuerung (1% Goldstandard Fail-Closed Guard)
  const [activePlatform, setActivePlatformRaw] = useState<PlatformType>(() => {
    const isStaff = user?.role === 'admin' || user?.role === 'secretary';
    const isGrooveActive = isStaff || Boolean(user?.is_groovelab_active);

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const platParam = urlParams.get('platform');
      if (platParam === 'groovelab') {
        return isGrooveActive ? 'groovelab' : 'campus';
      }
      if (platParam === 'campus' || (showEnsemblesFeature && platParam === 'ensembles')) {
        return platParam as PlatformType;
      }
    }
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_active_platform') : null;
    if (saved === 'groovelab') {
      return isGrooveActive ? 'groovelab' : 'campus';
    }
    if (!showEnsemblesFeature && saved === 'ensembles') {
      return 'campus';
    }
    return (saved as PlatformType) || 'campus';
  });

  // 🛡️ Reaktiver Security Guard: Verwehrt unberechtigten Lehrkräften & Schülern den GrooveLab-Zugang
  useEffect(() => {
    if (!user) return;
    const isStaff = user.role === 'admin' || user.role === 'secretary';
    if (!isStaff && activePlatform === 'groovelab' && !user.is_groovelab_active) {
      console.warn('[Security Guard] GrooveLab-Zugriff verweigert (Lehrkraft nicht autorisiert):', user.id);
      setActivePlatformRaw('campus');
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('groovelab_active_platform', 'campus');
      }
    }
  }, [user, activePlatform]);

  // 2. Tab-Steuerung
  const [activeStudentTab, setActiveStudentTabRaw] = useState<string>(() => {
    const platform = (typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_active_platform') : null) || 'campus';
    if (platform === 'campus') {
      const tab = (typeof window !== 'undefined' ? sessionStorage.getItem('campus_active_tab') : null) || 'briefing';
      return tab === 'live' ? 'briefing' : tab;
    }
    if (platform === 'ensembles') {
      return (typeof window !== 'undefined' ? sessionStorage.getItem('ensembles_active_tab') : null) || 'overview';
    }
    return (typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_active_tab') : null) || 'live';
  });

  const setActivePlatform = useCallback((val: any, _forceUnlock = false) => {
    const schoolObj = Array.isArray(user?.schools) ? user.schools[0] : user?.schools;
    const isStaff = user?.role === 'admin' || user?.role === 'secretary';

    const schoolHasCampusSub = Boolean(
      (schoolObj ? (schoolObj.has_campus_subscription || !schoolObj.is_billing_booked || schoolObj.subscription_bypass) : true)
    );
    const schoolHasGrooveSub = Boolean(
      (schoolObj ? (schoolObj.has_groovelab_subscription || !schoolObj.is_billing_booked || schoolObj.subscription_bypass) : true)
    );

    // 1% Goldstandard: Lehrkräfte und Schüler benötigen ZWINGEND ihre persönliche Modulberechtigung
    const canAccessCampus = isStaff || (schoolHasCampusSub && (user?.is_campus_active !== false));
    const canAccessGroove = isStaff || (schoolHasGrooveSub && Boolean(user?.is_groovelab_active));

    let targetVal = val;
    if (targetVal === 'campus' && !canAccessCampus) {
      if (canAccessGroove) {
        targetVal = 'groovelab';
      } else {
        return;
      }
    } else if (targetVal === 'groovelab' && !canAccessGroove) {
      if (canAccessCampus) {
        targetVal = 'campus';
      } else {
        return;
      }
    }
    // Instantly stop all active camera and microphone streams when switching modules
    if (typeof (window as any).stopAllCameras === 'function') {
      (window as any).stopAllCameras();
    }

    React.startTransition(() => {
      setActivePlatformRaw(targetVal);
      // Auto-switch the active tab to the saved tab of the target platform atomically within the same transition
      if (targetVal === 'campus') {
        const savedTab = (typeof window !== 'undefined' ? sessionStorage.getItem('campus_active_tab') : null) || 'briefing';
        setActiveStudentTabRaw(savedTab === 'live' ? 'briefing' : savedTab);
      } else if (targetVal === 'ensembles') {
        const savedTab = (typeof window !== 'undefined' ? sessionStorage.getItem('ensembles_active_tab') : null) || 'overview';
        setActiveStudentTabRaw(savedTab);
      } else {
        const savedTab = (typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_active_tab') : null) || 'live';
        setActiveStudentTabRaw(savedTab);
      }
    });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('groovelab_active_platform', targetVal);
    }
  }, [locationMode, user?.role, user?.schools, user?.is_campus_active, user?.is_groovelab_active]);

  // 3. Workspace-Verwaltung
  const [activeWorkspace, setActiveWorkspaceRaw] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace');
    }
    return null;
  });
  const setActiveWorkspace = useCallback((ws: string | null) => {
    if (typeof window !== 'undefined') {
      if (ws) {
        sessionStorage.setItem('groovelab_active_workspace', ws);
      } else {
        sessionStorage.removeItem('groovelab_active_workspace');
      }
    }
    setActiveWorkspaceRaw(ws);
  }, []);

  const setActiveStudentTab = useCallback((val: any) => {
    if (val === 'messages') {
      onResetRecipient?.();
    }
    if (val === 'homework_book') {
      window.dispatchEvent(new CustomEvent('campus_reset_homework_board'));
    }
    setActiveStudentTabRaw(val);
    const tabLabels: Record<string, string> = {
      briefing: 'Briefing-Dashboard geöffnet',
      homework_book: 'Hausaufgabenheft geöffnet',
      practice_board: 'Übe-Pfad geöffnet',
      practice: 'Übe-Studio geöffnet',
      mediathek: 'Mediathek geöffnet',
      events: 'Termine geöffnet',
      campus_cup: 'Campus-Cup geöffnet',
      messages: 'Nachrichten geöffnet',
      settings: 'Einstellungen geöffnet',
      overview: 'Übersicht geöffnet',
      live: 'Live-Lab geöffnet',
      library: 'Song-Bibliothek geöffnet',
      repertoire: 'Repertoire geöffnet',
      bands: 'Band-Zentrale geöffnet',
      schedule: 'Stundenplan geöffnet',
      students: 'Schüler-Übersicht geöffnet',
      songs: 'Song-Verwaltung geöffnet',
      rooms: 'Raumplaner geöffnet',
      billing: 'Abrechnung geöffnet'
    };
    if (tabLabels[val]) {
      announceA11y(tabLabels[val]);
    }
    // Persist the tab to the correct sessionStorage keys based on the current active platform
    const platform = (typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_active_platform') : null) || 'campus';
    if (typeof window !== 'undefined') {
      if (platform === 'campus') {
        sessionStorage.setItem('campus_active_tab', val);
      } else if (platform === 'ensembles') {
        sessionStorage.setItem('ensembles_active_tab', val);
      } else {
        sessionStorage.setItem('groovelab_active_tab', val);
      }
    }
  }, [onResetRecipient]);

  // 4. Sidebar-Zustände
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(true);
  const [sidebarNotificationsCount, setSidebarNotificationsCount] = useState<number>(0);

  // 5. 🎼 Notenständer-Modus (Großschrift & Glanceability für 60–90 cm Distanz am Instrument)
  const [isMusicStandMode, setIsMusicStandMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return false;
    return localStorage.getItem('campus_music_stand_mode') === 'true';
  });

  useEffect(() => {
    const handleSync = () => {
      setIsMusicStandMode(localStorage.getItem('campus_music_stand_mode') === 'true');
    };
    window.addEventListener('campus_music_stand_mode_changed', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('campus_music_stand_mode_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const toggleMusicStandMode = useCallback(() => {
    setIsMusicStandMode(prev => {
      const next = !prev;
      localStorage.setItem('campus_music_stand_mode', String(next));
      window.dispatchEvent(new Event('campus_music_stand_mode_changed'));
      return next;
    });
  }, []);

  // 6. Band Untertab
  const [activeBandSubTab, setActiveBandSubTab] = useState<'meine' | 'alle'>(() => {
    return (localStorage.getItem('groovelab_active_band_subtab') as 'meine' | 'alle') || 'meine';
  });

  return {
    activePlatform,
    setActivePlatform,
    setActivePlatformRaw,
    activeWorkspace,
    setActiveWorkspace,
    activeStudentTab,
    setActiveStudentTab,
    setActiveStudentTabRaw,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    sidebarNotificationsCount,
    setSidebarNotificationsCount,
    isMusicStandMode,
    setIsMusicStandMode,
    toggleMusicStandMode,
    activeBandSubTab,
    setActiveBandSubTab
  };
}
