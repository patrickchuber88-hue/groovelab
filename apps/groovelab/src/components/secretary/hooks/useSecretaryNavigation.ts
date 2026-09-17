import { useState, useEffect, useCallback, useRef } from 'react';
import { scrubSharedDeviceCache } from '../../../utils/sharedDeviceScrubber';

export type SecretaryActiveTab = 'secretary' | 'campus' | 'groovelab';
export type SecretarySubTab = 'briefing' | 'employees' | 'licenses' | 'setup' | 'rooms' | 'equipment' | 'crisis' | 'audit' | 'duties' | 'announcements';
export type CampusSubTab = 'briefing' | 'subjects' | 'onboarding' | 'students' | 'events' | 'schedules' | 'status' | 'rooms';
export type GroovelabSubTab = 'live' | 'students' | 'coaches' | 'kiosk' | 'settings';

export interface UseSecretaryNavigationProps {
  onLogout?: () => void;
}

export function useSecretaryNavigation({ onLogout }: UseSecretaryNavigationProps = {}) {
  // Navigation & Workspace states
  const [activeTab, setActiveTab] = useState<SecretaryActiveTab>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace');
      if (saved === 'campus' || saved === 'groovelab' || saved === 'secretary') return saved as SecretaryActiveTab;
    }
    return 'secretary';
  });

  const [secretarySubTab, setSecretarySubTab] = useState<SecretarySubTab>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('groovelab_secretary_subtab') || localStorage.getItem('groovelab_secretary_subtab');
      const valid = ['briefing', 'employees', 'licenses', 'setup', 'rooms', 'equipment', 'crisis', 'audit', 'duties', 'announcements'];
      if (saved && valid.includes(saved)) return (saved === 'duties' ? 'announcements' : saved) as SecretarySubTab;
    }
    return 'briefing';
  });

  const [campusSubTab, setCampusSubTab] = useState<CampusSubTab>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('groovelab_campus_subtab') || localStorage.getItem('groovelab_campus_subtab');
      const valid = ['briefing', 'subjects', 'onboarding', 'students', 'events', 'schedules', 'status', 'rooms'];
      if (saved && valid.includes(saved)) return saved as CampusSubTab;
    }
    return 'briefing';
  });

  const [groovelabSubTab, setGroovelabSubTab] = useState<GroovelabSubTab>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('groovelab_subtab') || localStorage.getItem('groovelab_subtab');
      const valid = ['live', 'students', 'coaches', 'kiosk', 'settings'];
      if (saved && valid.includes(saved)) return saved as GroovelabSubTab;
    }
    return 'live';
  });

  // Mobile drawer state
  const [mobileSecretaryDrawerOpen, setMobileSecretaryDrawerOpen] = useState(false);

  // Viewport dimensions
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [windowHeight, setWindowHeight] = useState(() => typeof window !== 'undefined' ? window.innerHeight : 800);
  const [containerWidth, setContainerWidth] = useState(1000);

  // Window resize & orientation listeners
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.addEventListener('groovelab_orientation_changed', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('groovelab_orientation_changed', handleResize);
    };
  }, []);

  // Container ResizeObserver ref
  const observerRef = useRef<ResizeObserver | null>(null);
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width || 1000);
        }
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  // Tab persistence effects
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('groovelab_active_workspace', activeTab);
      localStorage.setItem('groovelab_active_workspace', activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('groovelab_secretary_subtab', secretarySubTab);
      localStorage.setItem('groovelab_secretary_subtab', secretarySubTab);
    }
  }, [secretarySubTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('groovelab_campus_subtab', campusSubTab);
      localStorage.setItem('groovelab_campus_subtab', campusSubTab);
    }
  }, [campusSubTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('groovelab_subtab', groovelabSubTab);
      localStorage.setItem('groovelab_subtab', groovelabSubTab);
    }
  }, [groovelabSubTab]);

  // Tab Title / Breadcrumb resolver
  const getTabTitle = useCallback(() => {
    switch (activeTab) {
      case 'secretary':
        switch (secretarySubTab) {
          case 'briefing': return '📊 Tägliches Briefing & Status';
          case 'crisis': return '🛡️ Operations-Cockpit: Ausfall-Management';
          case 'equipment': return '🎸 Instrumente & Ausstattung';
          case 'employees': return '👥 Mitarbeiterverwaltung';
          case 'licenses': return '💳 Abrechnung & Infrastruktur';
          case 'setup': return '⚙️ Setup & Systemeinstellungen';
          default: return '💼 Verwaltung';
        }
      case 'campus':
        switch (campusSubTab) {
          case 'briefing': return '🎓 Campus-Zentrale';
          case 'onboarding': return 'Lehrer-Onboarding';
          case 'schedules': return 'Stundenpläne';
          case 'status': return 'Einstellungen';
          default: return '🎓 Campus Verwaltung';
        }
      case 'groovelab':
        switch (groovelabSubTab as any) {
          case 'live': return 'Live Lab';
          case 'coaches': return 'Lehrer';
          case 'students': return 'Schüler';
          case 'kiosk': return 'Einstellungen';
          default: return '🎸 GrooveLab Verwaltung';
        }
      default: return '';
    }
  }, [activeTab, secretarySubTab, campusSubTab, groovelabSubTab]);

  // Forensic logout scrubber
  const handleSecretaryLogout = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('groovelab_secretary_subtab');
        sessionStorage.removeItem('groovelab_active_workspace');
        sessionStorage.removeItem('groovelab_campus_subtab');
        sessionStorage.removeItem('groovelab_subtab');
        localStorage.removeItem('groovelab_secretary_subtab');
        localStorage.removeItem('groovelab_active_workspace');
        localStorage.removeItem('groovelab_campus_subtab');
        localStorage.removeItem('groovelab_subtab');
        localStorage.removeItem('groovelab_school_overrides');
        localStorage.removeItem('campus_school_overrides');
        localStorage.removeItem('groovelab_school_profile');
      }
      await scrubSharedDeviceCache();
    } catch (e) {
      console.warn('[useSecretaryNavigation] Logout scrubber note:', e);
    }
    if (onLogout) {
      onLogout();
    }
  }, [onLogout]);

  return {
    activeTab,
    setActiveTab,
    secretarySubTab,
    setSecretarySubTab,
    campusSubTab,
    setCampusSubTab,
    groovelabSubTab,
    setGroovelabSubTab,
    mobileSecretaryDrawerOpen,
    setMobileSecretaryDrawerOpen,
    windowWidth,
    windowHeight,
    containerWidth,
    setContainerWidth,
    containerRef,
    getTabTitle,
    handleSecretaryLogout
  };
}
