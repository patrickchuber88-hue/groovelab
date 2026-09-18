import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { secureVault } from '../../../utils/secureVault';
import { CampusUiLevel } from '../../campus/CampusLevelSwitcher';

interface UseStudentProfileProps {
  studentId: string;
  initialUser?: any;
  parentActiveTab?: string;
  onTabChange?: (tab: string) => void;
  onProfileUpdate?: (updatedFields: any) => void;
}

export function useStudentProfile({
  studentId,
  initialUser,
  parentActiveTab,
  onTabChange,
  onProfileUpdate
}: UseStudentProfileProps) {
  const [studentUser, setStudentUser] = useState<any>(() => initialUser || null);

  // 📱 Reaktivitäts-Brücke: Sofortige Synchronisation bei Profilwechsel oder Hintergrundaktualisierung
  useEffect(() => {
    if (initialUser && (initialUser.id === studentId || !studentId)) {
      setStudentUser((prev: any) => {
        if (!prev) return initialUser;
        if (JSON.stringify(prev) === JSON.stringify(initialUser)) return prev;
        return { ...prev, ...initialUser };
      });
    }
  }, [initialUser, studentId]);

  // 🛡️ Speculative SWR Fast-Path: Instantly recover profile from secureVault if initialUser is missing security flags
  useEffect(() => {
    if (studentId) {
      const isMissingPinFlags = !studentUser || (studentUser.has_personal_pin === undefined && studentUser.is_pin_activated === undefined);
      if (isMissingPinFlags) {
        secureVault.get<any>(`cg_secure_vault_user_${studentId}`).then((cached) => {
          if (cached) {
            setStudentUser((prev: any) => {
              if (!prev) return cached;
              return {
                ...cached,
                ...prev,
                has_personal_pin: cached.has_personal_pin ?? prev.has_personal_pin,
                is_pin_activated: cached.is_pin_activated ?? prev.is_pin_activated,
                has_parent_pin: cached.has_parent_pin ?? prev.has_parent_pin,
                parent_pin_configured: cached.parent_pin_configured ?? prev.parent_pin_configured,
              };
            });
          }
        });
      }
    }
  }, [studentId, studentUser]);

  const currentPlatform: 'campus' | 'groovelab' = parentActiveTab === 'campus' 
    ? 'campus' 
    : (parentActiveTab === 'groovelab' 
      ? 'groovelab' 
      : ((typeof window !== 'undefined' ? localStorage.getItem('groovelab_active_platform') : 'campus') === 'groovelab' ? 'groovelab' : 'campus'));

  // 👨‍🏫 Determine if current session belongs to a teacher or administrator
  const isTeacherSession = typeof window !== 'undefined' && (() => {
    try {
      const ws = sessionStorage.getItem('groovelab_active_workspace');
      if (ws === 'teacher' || ws === 'admin' || ws === 'secretary') return true;
      const cached = sessionStorage.getItem('groovelab_cached_user');
      if (cached) {
        const u = JSON.parse(cached);
        if (u && (u.role === 'teacher' || u.role === 'admin' || u.role === 'secretary' || u.is_teacher)) return true;
      }
      const role = sessionStorage.getItem('groovelab_user_role') || localStorage.getItem('groovelab_user_role');
      if (role === 'teacher' || role === 'admin' || role === 'secretary') return true;
    } catch (e) {}
    return false;
  })();

  // 3-Level Adaptive UI State ('junior' | 'teen' | 'pro') - SSOT Priority Hierarchy
  const [studentUiLevel, setStudentUiLevel] = useState<CampusUiLevel>(() => {
    const dbLevel = (initialUser as any)?.campus_ui_level;
    if (dbLevel === 'junior' || dbLevel === 'teen' || dbLevel === 'pro') {
      return dbLevel as CampusUiLevel;
    }
    if (typeof window === 'undefined') return 'junior';
    const effectiveId = studentId || (initialUser as any)?.id;
    if (effectiveId) {
      const namespacedSaved = localStorage.getItem(`campus_student_ui_level_${effectiveId}`);
      if (namespacedSaved === 'junior' || namespacedSaved === 'teen' || namespacedSaved === 'pro') {
        return namespacedSaved as CampusUiLevel;
      }
    }
    return 'junior';
  });
  const [showLevelModal, setShowLevelModal] = useState<boolean>(false);

  // 🎼 Notenständer-Modus (Großschrift & Glanceability für 60–90 cm Distanz am Instrument)
  const [isMusicStandMode, setIsMusicStandMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
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

  const toggleMusicStandMode = () => {
    setIsMusicStandMode(prev => {
      const next = !prev;
      localStorage.setItem('campus_music_stand_mode', String(next));
      window.dispatchEvent(new Event('campus_music_stand_mode_changed'));
      return next;
    });
  };

  // ⏱️ Pädagogischer Screen-Time Tracker
  const [showScreenTimeToast, setShowScreenTimeToast] = useState<boolean>(false);
  const activeScreenTimeSecondsRef = useRef<number>(0);

  useEffect(() => {
    const parentMaxMinutes = Number(localStorage.getItem(`cg_parent_max_screen_minutes_${studentId}`) || 45);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        activeScreenTimeSecondsRef.current += 1;
        if (activeScreenTimeSecondsRef.current >= parentMaxMinutes * 60) {
          setShowScreenTimeToast(true);
          activeScreenTimeSecondsRef.current = 0;
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [studentId]);

  const [certificateSong, setCertificateSong] = useState<any | null>(null);
  const [resolvedSchoolName, setResolvedSchoolName] = useState<string>(() => {
    return (initialUser as any)?.schools?.name || (initialUser as any)?.school_name || (typeof window !== 'undefined' ? (localStorage.getItem('groovelab_school_name') || localStorage.getItem('campus_school_name')) : '') || 'Campus-Groovelab Musikschule';
  });

  const modalStudentUser = useMemo(() => {
    if (!studentUser) return null;
    return {
      ...studentUser,
      id: studentId,
      first_name: studentUser.first_name || '',
      last_name: '', // 🛡️ Zero-Knowledge: 100% last_name exclusion in student view
      photo_url: studentUser.photo_url || '/avatar_ghost.jpg',
      is_campus_active: studentUser.is_campus_active ?? false,
      campus_ui_level: studentUiLevel || studentUser?.campus_ui_level,
      parent_permissions: (studentUser as any)?.parent_permissions,
      school_id: studentUser?.school_id,
      schoolId: studentUser?.school_id,
      schools: studentUser?.schools,
      school_name: resolvedSchoolName || (Array.isArray(studentUser?.schools) ? studentUser?.schools[0]?.name : studentUser?.schools?.name) || studentUser?.school_name,
      instrument: studentUser?.instrument,
      teacher_id: studentUser?.teacher_id,
      created_at: studentUser?.created_at,
      activated_at: studentUser?.activated_at
    };
  }, [studentUser, studentId, studentUiLevel, resolvedSchoolName]);

  useEffect(() => {
    const sId = studentUser?.school_id || (typeof window !== 'undefined' ? (localStorage.getItem('groovelab_school_id') || localStorage.getItem('campus_school_id')) : null);
    if (sId) {
      supabase
        .from('schools')
        .select('name')
        .eq('id', sId)
        .maybeSingle()
        .then(({ data }) => {
          if (data && data.name) {
            setResolvedSchoolName(data.name);
          }
        });
    }
  }, [studentUser?.school_id]);

  // Adult Student Resolver (18+ or explicit is_adult flag)
  const isAdultStudent = useMemo(() => {
    if (studentUser?.is_adult === true) return true;
    const rawBirthdate = (studentUser as any)?.birthdate || (studentUser as any)?.birth_date;
    if (rawBirthdate) {
      const bd = new Date(rawBirthdate);
      if (!isNaN(bd.getTime())) {
        const ageDiffMs = Date.now() - bd.getTime();
        const ageDate = new Date(ageDiffMs);
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);
        if (age >= 18) return true;
      }
    }
    return false;
  }, [studentUser]);

  // Collapsible Right Sidebar State for Student Briefing Dashboard
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('campus_student_briefing_sidebar_collapsed');
    return saved !== null ? saved === 'true' : true;
  });

  const handleToggleRightSidebar = async (collapsed: boolean) => {
    setIsRightSidebarCollapsed(collapsed);
    localStorage.setItem('campus_student_briefing_sidebar_collapsed', String(collapsed));
    try {
      if (studentUser?.id || studentId) {
        await supabase.from('users').update({ briefing_sidebar_collapsed: collapsed }).eq('id', studentUser?.id || studentId);
      }
    } catch (e) {
      console.warn('Could not persist briefing_sidebar_collapsed to users table:', e);
    }
  };

  const isSwitchingUiLevelRef = useRef<boolean>(false);

  // Active Tab & Visited Tabs
  const [activeTab, setActiveTab] = useState<string>(() => {
    return parentActiveTab && parentActiveTab !== 'campus' && parentActiveTab !== 'groovelab' ? parentActiveTab : 'briefing';
  });

  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([activeTab, 'briefing']));

  useEffect(() => {
    setVisitedTabs(prev => {
      if (!prev.has(activeTab)) {
        const next = new Set(prev);
        next.add(activeTab);
        return next;
      }
      return prev;
    });
  }, [activeTab]);

  useEffect(() => {
    if (parentActiveTab && parentActiveTab !== 'campus' && parentActiveTab !== 'groovelab') {
      setActiveTab(parentActiveTab);
    }
  }, [parentActiveTab]);

  const handleTabChangeLocal = useCallback((tab: string, skipResetHwTab = false) => {
    if (tab === 'homework_book' && !skipResetHwTab) {
      window.dispatchEvent(new CustomEvent('campus_reset_homework_board'));
    }
    setActiveTab(tab);
    if (tab !== 'settings' && tab !== 'parent_controls' && !isAdultStudent) {
      sessionStorage.removeItem('groovelab_parent_unlocked_global');
      if (studentId) {
        sessionStorage.removeItem(`groovelab_parent_session_${studentId}`);
        sessionStorage.removeItem(`groovelab_parent_unlocked_${studentId}`);
      }
      window.dispatchEvent(new CustomEvent('groovelab_parent_mode_changed', { detail: false }));
    }
    if (onTabChange) {
      onTabChange(tab);
    }
  }, [isAdultStudent, studentId, onTabChange]);

  // Mobile viewport detection
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toasts
  const [welcomeToast, setWelcomeToast] = useState<string | null>(null);
  const [uiLevelToast, setUiLevelToast] = useState<string | null>(null);
  const [parentErrorToast, setParentErrorToast] = useState<string | null>(null);

  useEffect(() => {
    if (!welcomeToast) return;
    const timer = setTimeout(() => setWelcomeToast(null), 4000);
    return () => clearTimeout(timer);
  }, [welcomeToast]);

  useEffect(() => {
    if (!uiLevelToast) return;
    const timer = setTimeout(() => setUiLevelToast(null), 4000);
    return () => clearTimeout(timer);
  }, [uiLevelToast]);

  useEffect(() => {
    if (!parentErrorToast) return;
    const timer = setTimeout(() => setParentErrorToast(null), 5000);
    return () => clearTimeout(timer);
  }, [parentErrorToast]);

  return {
    studentUser,
    setStudentUser,
    currentPlatform,
    isTeacherSession,
    studentUiLevel,
    setStudentUiLevel,
    showLevelModal,
    setShowLevelModal,
    isMusicStandMode,
    toggleMusicStandMode,
    showScreenTimeToast,
    setShowScreenTimeToast,
    certificateSong,
    setCertificateSong,
    resolvedSchoolName,
    setResolvedSchoolName,
    modalStudentUser,
    isAdultStudent,
    isRightSidebarCollapsed,
    handleToggleRightSidebar,
    isSwitchingUiLevelRef,
    activeTab,
    setActiveTab,
    visitedTabs,
    setVisitedTabs,
    handleTabChangeLocal,
    isMobile,
    welcomeToast,
    setWelcomeToast,
    uiLevelToast,
    setUiLevelToast,
    parentErrorToast,
    setParentErrorToast
  };
}
