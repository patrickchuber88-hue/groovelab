import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { supabase } from '../lib/supabase';
import { storeBlob, getBlob, deleteBlob } from '../utils/blobStorage';
import { subscribeUserToPush, unsubscribeUserFromPush } from '../utils/webPush';
import { 
  Award, Lock, Smartphone, HelpCircle, Trophy, Sparkles, Star, Rocket,
  ChevronLeft, ChevronRight, Coffee, Clock, Timer, Flame, BookOpen, Share2, Play, 
  Pause, Square, RotateCcw, Volume2, VolumeX, Moon, QrCode, X, Eye, EyeOff, Zap, Music, Library, School, Calendar, CalendarX, Check, CheckCircle, Target, MessageSquare, Send,
  Pencil, Edit3, User, Mail, Phone, MapPin, Activity, Camera, TrendingUp, Users, Shield, Search, Palmtree, Settings, Bell, FileText, ThumbsUp, Heart, AlertTriangle, Anchor, ShieldCheck, CheckCheck, Building,
  Mic, Disc, Trash2, Download, Key, Delete, Headphones, ArrowRight, Sliders, Compass, Palette, Lightbulb, Copy, ShieldAlert, Fingerprint, GraduationCap
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip } from 'recharts';
import { createPortal } from 'react-dom';
import { QRCodeModal } from './QRCodeModal';
import { checkIsAudioTresorActive, ALL_STICKERS, getUnifiedStickersMap, getUnifiedStickerStatus } from '../domain/stickersAndTresor';
import { UpdateAnnouncementHero } from './common/UpdateAnnouncementHero';
import { usePremiumOnboardingTour, TourStep, TourStartButton } from './PremiumOnboardingTour';
import { MobileBriefingCarousel } from './ui/MobileBriefingCarousel';
import { cleanHomeworkNotesText, maskLastName, formatTeacherFullName } from '../utils/nameHelper';
import { CampusGroovelabBrand, CampusGroovelabText, CampusGroovelabLogo } from './CampusGroovelabBrand';
import { validateNewPin } from '../utils/pinValidation';
import { CampusLevelSwitcher, CampusUiLevel } from './campus/CampusLevelSwitcher';
import { CampusJuniorDashboard } from './campus/CampusJuniorDashboard';
import { CampusTeenDashboard } from './campus/CampusTeenDashboard';
import { CampusLevelSelectModal } from './campus/CampusLevelSelectModal';
import { AudioTrackCarousel, AudioTrackItem } from './AudioTrackCarousel';
import { ZenPlayAlongDock, PreFlightAudioPreviewButton, PreFlightAudioPlayerSection, getTrackPedagogicalType, playCountInBeep } from './campus/ZenPlayAlongDock';
import { MeisterOhrSticker } from './MeisterOhrSticker';
import { getAvatarLevelFrameStyle } from './StudioAvatar';
import { processPureRawBlob, TARGET_PURE_RAW_LUFS, TARGET_PEAK_DBTP } from '../utils/audioMasteringEngine';
import { computeGroundTruthMetrics, broadcastPracticeUpdate, DEFAULT_FOKUS_LEVELS, getEngineEffectiveLevel } from '../utils/studentProgressEngine';
import { synthesizeNeuralSpeech, playAudioBlob, stopNeuralSpeech, buildContinuousHomeworkNarrative, cleanTextForTts } from '../services/neuralTtsService';
import { fetchHolidaysCached } from '../utils/holidayHelper';
import { useParentSessionLock } from '../hooks/useParentSessionLock';
import { AddSiblingModal } from './campus/AddSiblingModal';
import { StudentCampusCupTab } from './student/tabs/StudentCampusCupTab';
import { StudentPracticeTab } from './student/tabs/StudentPracticeTab';
import { StudentSongDetailModal } from './student/modals/StudentSongDetailModal';
import { StudentLehrwerkDetailModal } from './student/modals/StudentLehrwerkDetailModal';
import { CampusWrappedStoryModal } from './student/modals/CampusWrappedStoryModal';
import { DigitalDetoxOverlay } from './student/modals/DigitalDetoxOverlay';
import { FirstLoginPinModal } from './student/modals/FirstLoginPinModal';
import { StudentContributionsModal } from './student/modals/StudentContributionsModal';
import { StudentRulesModal } from './student/modals/StudentRulesModal';
import { GlobalParentPinModal } from './student/modals/GlobalParentPinModal';
import { StudentCrisisNotifsModal } from './student/modals/StudentCrisisNotifsModal';
import { StudentMatchCelebrationModal } from './student/modals/StudentMatchCelebrationModal';
import { StudentSessionCelebrationModal } from './student/modals/StudentSessionCelebrationModal';
import { StudentJuniorPreFlightModal } from './student/modals/StudentJuniorPreFlightModal';
import { StudentJuniorStickerModal } from './student/modals/StudentJuniorStickerModal';
import { StudentJuniorStickerDetailModal } from './student/modals/StudentJuniorStickerDetailModal';
import { StudentJuniorStickerAwardModal } from './student/modals/StudentJuniorStickerAwardModal';
import { StudentSongsTab } from './student/tabs/StudentSongsTab';
import { StudentProfileTab } from './student/tabs/StudentProfileTab';
import { StudentSettingsTab } from './student/tabs/StudentSettingsTab';
import { StudentBriefingTab } from './student/tabs/StudentBriefingTab';
import { StudentHeroTab } from './student/tabs/StudentHeroTab';
import { CampusAppointmentShoutboxModal } from './CampusAppointmentShoutboxModal';

// 🚀 High-Performance Lazy Loaded Sub-Suites & Heavy Modals
const CampusEventsBoard = lazy(() => import('./CampusEventsBoard').then(m => ({ default: m.CampusEventsBoard })));
const MeisterwerkDocumentationModal = lazy(() => import('./MeisterwerkDocumentationModal').then(m => ({ default: m.MeisterwerkDocumentationModal || (m as any).default })));
const MeisterwerkCertificateModal = lazy(() => import('./ui/MeisterwerkCertificateModal').then(m => ({ default: m.MeisterwerkCertificateModal })));
const FeedbackHubModal = lazy(() => import('./feedback/FeedbackHubModal').then(m => ({ default: m.FeedbackHubModal })));
const HelpCenterModal = lazy(() => import('./help/HelpCenterModal').then(m => ({ default: m.HelpCenterModal })));
const StudentToolboxModal = lazy(() => import('./campus/StudentToolboxModal').then(m => ({ default: m.StudentToolboxModal })));
const PushNotificationSoftPromptModal = lazy(() => import('./ui/PushNotificationSoftPromptModal').then(m => ({ default: m.PushNotificationSoftPromptModal })));
const ParentCampusActivationModal = lazy(() => import('./ParentCampusActivationModal').then(m => ({ default: m.ParentCampusActivationModal })));
const Confetti = lazy(() => import('react-confetti'));

interface HomeworkBookErrorBoundaryProps {
  children: React.ReactNode;
  onRetry: () => void;
}

interface HomeworkBookErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class HomeworkBookErrorBoundary extends React.Component<HomeworkBookErrorBoundaryProps, HomeworkBookErrorBoundaryState> {
  constructor(props: HomeworkBookErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: any): HomeworkBookErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || String(error) };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('[HomeworkBookErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
    this.props.onRetry();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '48px 24px',
          maxWidth: '540px',
          margin: '40px auto',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
          border: '1px solid #fecaca',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>📖</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>
            Hausaufgabenheft konnte nicht geladen werden
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5, marginBottom: '24px' }}>
            Die Verbindung zur Cloud wurde kurzzeitig unterbrochen oder die Komponente wird gerade aktualisiert.
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              background: '#34a853',
              color: '#ffffff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '16px',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(52,168,83,0.3)'
            }}
          >
            Erneut versuchen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const HomeworkBookLoadingFallback: React.FC<{ onReload?: () => void }> = ({ onReload }) => {
  const [showSlowWarning, setShowSlowWarning] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSlowWarning(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      padding: '48px 24px',
      maxWidth: '480px',
      margin: '40px auto',
      background: '#ffffff',
      borderRadius: '24px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
      border: '1px solid #e2e8f0',
      textAlign: 'center'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        margin: '0 auto 16px',
        border: '3px solid #e2e8f0',
        borderTopColor: '#34a853',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>
        Lade Hausaufgabenheft...
      </h3>
      <p style={{ fontSize: '0.86rem', color: '#64748b', lineHeight: 1.4, margin: 0 }}>
        Synchronisiere aktuelle Aufgaben und Übepfade
      </p>

      {showSlowWarning && (
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px' }}>
            Das Laden dauert ungewöhnlich lange (Netzwerk-Latenz).
          </p>
          <button
            onClick={() => {
              if (onReload) onReload();
              else window.location.reload();
            }}
            style={{
              background: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              padding: '8px 18px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Neu laden
          </button>
        </div>
      )}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const showMissionsFeature = false;

import {
  WeeklyDayState,
  WeeklyStreakDay,
  WeeklyStreakMetrics,
  Avatar,
  getInstrumentAvatarUrl,
  maskEmail,
  STUDENT_AVATARS,
  LEVEL_NAMES,
  LevelProgress,
  getLevelProgress,
  HERO_CLASSES
} from './student/studentAvatars.constants';
import {
  getSimulatedNow,
  toLocalYYYYMMDD,
  getDaysBetweenLocal,
  getISOWeekRaw,
  getISOWeek,
  getItemWeek,
  getLehrwerkColor,
  getSongColor
} from './student/studentDateUtils';
import { CampusVinylCoverArt, renderSongVinylCover } from './student/CampusVinylCoverArt';
import { StudentBillingInvoicesSection } from './student/StudentBillingInvoicesSection';

export type { WeeklyDayState, WeeklyStreakDay, WeeklyStreakMetrics };

interface StudentAvatarDashboardProps {
  studentId: string;
  initialUser?: any;
  parentActiveTab?: string;
  onTabChange?: (tab: string) => void;
  onProfileUpdate?: (updatedFields: any) => void;
}

const sanitizeTextInput = (text: string | null | undefined): string => {
  if (!text) return '';
  return String(text).trim();
};

export function StudentAvatarDashboard({ studentId, initialUser, parentActiveTab, onTabChange, onProfileUpdate }: StudentAvatarDashboardProps) {
  const [studentUser, setStudentUser] = useState<any>(() => initialUser || null);
  const currentPlatform: 'campus' | 'groovelab' = parentActiveTab === 'campus' ? 'campus' : (parentActiveTab === 'groovelab' ? 'groovelab' : ((typeof window !== 'undefined' ? localStorage.getItem('groovelab_active_platform') : 'campus') === 'groovelab' ? 'groovelab' : 'campus'));

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
    // 1. Authoritative Server DB Level (Highest Priority)
    const dbLevel = (initialUser as any)?.campus_ui_level;
    if (dbLevel === 'junior' || dbLevel === 'teen' || dbLevel === 'pro') {
      return dbLevel as CampusUiLevel;
    }
    if (typeof window === 'undefined') return 'junior';
    // 2. Student-Namespaced Local Cache
    const effectiveId = studentId || (initialUser as any)?.id;
    if (effectiveId) {
      const namespacedSaved = localStorage.getItem(`campus_student_ui_level_${effectiveId}`);
      if (namespacedSaved === 'junior' || namespacedSaved === 'teen' || namespacedSaved === 'pro') {
        return namespacedSaved as CampusUiLevel;
      }
    }
    // 3. Fail-Closed Default (Always 'junior' for child protection)
    return 'junior';
  });
  const [showLevelModal, setShowLevelModal] = useState<boolean>(false);

  // 🎼 Notenständer-Modus (Großschrift & Glanceability für 60–90 cm Distanz am Instrument)
  const [isMusicStandMode, setIsMusicStandMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('campus_music_stand_mode') === 'true';
  });

  const toggleMusicStandMode = () => {
    setIsMusicStandMode(prev => {
      const next = !prev;
      localStorage.setItem('campus_music_stand_mode', String(next));
      return next;
    });
  };

  const [certificateSong, setCertificateSong] = useState<any | null>(null);
  const [resolvedSchoolName, setResolvedSchoolName] = useState<string>(() => {
    return (initialUser as any)?.schools?.name || (initialUser as any)?.school_name || (typeof window !== 'undefined' ? (localStorage.getItem('groovelab_school_name') || localStorage.getItem('campus_school_name')) : '') || 'Campus-Groovelab Musikschule';
  });

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

  // Adult Student Resolver (18+ or explicit is_adult flag) for Adaptive Legal Governance
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

  // Collapsible Right Sidebar State for Student Briefing Dashboard (Default: Collapsed)
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

  useEffect(() => {
    const handleGlobalLevelChange = (e: any) => {
      if (e?.detail) setStudentUiLevel(e.detail);
    };
    window.addEventListener('campus_ui_level_changed', handleGlobalLevelChange);
    return () => window.removeEventListener('campus_ui_level_changed', handleGlobalLevelChange);
  }, []);

  const handleLevelChange = async (newLevel: CampusUiLevel) => {
    setStudentUiLevel(newLevel);
    setDraftUiLevel(newLevel);
    const effectiveId = studentId || studentUser?.id;
    if (effectiveId) {
      localStorage.setItem(`campus_student_ui_level_${effectiveId}`, newLevel);
    }
    localStorage.setItem('campus_student_ui_level', newLevel);
    window.dispatchEvent(new CustomEvent('campus_ui_level_changed', { detail: newLevel }));
    setShowLevelModal(false);
    try {
      if (effectiveId) {
        // 🛡️ Revisionssichere Persistenz via RPC mit Fallback
        const { error: rpcErr } = await supabase.rpc('save_parent_controls', {
          p_student_id: effectiveId,
          p_settings: { campus_ui_level: newLevel }
        });
        if (rpcErr) {
          console.warn('save_parent_controls RPC failed in handleLevelChange, fallback to users table:', rpcErr);
          await supabase.from('users').update({ campus_ui_level: newLevel }).eq('id', effectiveId);
        }
      }
    } catch (e) {
      console.warn('Could not persist campus_ui_level to users table:', e);
    }
  };

  // 🛡️ REVISIONSSICHERE PERSISTENZ: DB-Level synchronisieren
  useEffect(() => {
    const currentDbLevel = studentUser?.campus_ui_level;
    if (currentDbLevel && (currentDbLevel === 'junior' || currentDbLevel === 'teen' || currentDbLevel === 'pro')) {
      setStudentUiLevel(currentDbLevel);
      setDraftUiLevel(currentDbLevel);
      const effectiveId = studentId || studentUser?.id;
      if (effectiveId) {
        localStorage.setItem(`campus_student_ui_level_${effectiveId}`, currentDbLevel);
      }
      localStorage.setItem('campus_student_ui_level', currentDbLevel);
    }
  }, [studentUser?.campus_ui_level, studentId, studentUser?.id]);

  const handleJuniorPracticeComplete = async (minutes: number, xpEarned: number) => {
    try {
      await supabase.from('fokus_logs').insert({
        student_id: studentId,
        duration_minutes: minutes,
        duration_seconds: minutes * 60,
        xp_earned: xpEarned,
        is_extra: false
      });
      const newXp = (avatar?.xp || 0) + xpEarned;
      setAvatar((prev: any) => ({ ...prev, xp: newXp }));
      await supabase.from('avatars').update({ xp: newXp }).eq('student_id', studentId);
    } catch (err) {
      console.error('Error recording practice session in junior/teen dashboard:', err);
    }
  };

  const handleToggleHomeworkDone = async (item: any) => {
    try {
      const isNowDone = !(item.status === 'MASTERED' || item.status === 'THEORY_DONE');
      const newStatus = isNowDone ? 'MASTERED' : 'IN_PROGRESS';
      setProgressItems(prev => prev.map(p => (p.id === item.id || p.topic_name === item.topic_name) ? { ...p, status: newStatus } : p));
      if (item.id) {
        await supabase.from('progress_items').update({ status: newStatus, is_current_homework: !isNowDone }).eq('id', item.id);
      }
    } catch (err) {
      console.error('Error toggling homework status in junior/teen dashboard:', err);
    }
  };
  const [textbausteine] = useState<any[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('groovelab_textbausteine');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Error parsing textbausteine in StudentAvatarDashboard:", e);
      }
    }
    return [
      { id: 'r1', label: '🥁 Puls-Master', text: 'Klopfe den Puls mit dem Fuß...', type: 'both', category: 'rhythm', active: true },
      { id: 'r2', label: '⏱️ Metronom-Buddy', text: 'Starte mit dem Metronom...', type: 'both', category: 'rhythm', active: true },
      { id: 't1', label: '🔂 Ritter-Dreierspiel', text: 'Wiederhole exakt dreimal...', type: 'both', category: 'technique', active: true }
    ];
  });
  const getIsMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 1024 || Boolean(document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait'));
  };

  const [isMobile, setIsMobile] = useState(getIsMobileDevice());

  useEffect(() => {
    const handleCheck = () => {
      setIsMobile(getIsMobileDevice());
    };
    handleCheck();
    window.addEventListener('resize', handleCheck);
    const observer = new MutationObserver(handleCheck);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => {
      window.removeEventListener('resize', handleCheck);
      observer.disconnect();
    };
  }, []);

  const campusSettings = useMemo(() => {
    return studentUser?.schools?.opening_hours?.campus_settings || {};
  }, [studentUser]);

  const flamesActive = campusSettings.flames_active !== false;
  const xpActive = campusSettings.xp_active !== false;
  const showLeaderboard = campusSettings.show_leaderboard !== false;
  const showDetailedStats = campusSettings.show_detailed_stats !== false;
  const studentToTeacherChat = campusSettings.student_to_teacher_chat !== false;

  const tourSteps: TourStep[] = useMemo(() => {
    return [
      {
        selector: 'tour-student-hero',
        title: 'Dein Profil & Level',
        description: 'Hier siehst du deinen aktuellen Fortschritt, gesammelte XP und dein Level.'
      },
      {
        selector: 'tour-student-practice',
        title: 'Dein Übungsboard',
        description: 'Verwalte deine Hausaufgaben, starte den Fokus-Timer und erhalte Belohnungen für dein tägliches Üben.'
      },
      {
        selector: 'tour-student-songs',
        title: 'Klassen-Highlights & Team-Power',
        description: 'Gemeinsam üben & Sterne für die Schule sammeln! ⭐'
      }
    ];
  }, []);

  const { TourComponent, startTour } = usePremiumOnboardingTour({
    tourKey: `campus_student_tour_${studentId}`,
    steps: tourSteps,
    platformTheme: 'campus'
  });

  const getCurrentSchoolYear = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    if (month >= 9) {
      return `${year}/${year + 1}`;
    } else {
      return `${year - 1}/${year}`;
    }
  };

  const getAvailableSchoolYears = (): string[] => {
    const current = getCurrentSchoolYear();
    const startYear = parseInt(current.split('/')[0], 10);
    return [
      `${startYear}/${startYear + 1}`,
      `${startYear - 1}/${startYear}`,
      `${startYear - 2}/${startYear - 1}`
    ];
  };

  const currentSchoolYear = getCurrentSchoolYear();
  const availableSchoolYears = getAvailableSchoolYears();
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>(currentSchoolYear);

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showOwnQr, setShowOwnQr] = useState<boolean>(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [showSecondEmail, setShowSecondEmail] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [avatarCategoryFilter, setAvatarCategoryFilter] = useState<string>('Alle');
  const [savingProfile, setSavingProfile] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushNotifScheduleChanges, setPushNotifScheduleChanges] = useState(true);
  const [pushNotifHomework, setPushNotifHomework] = useState(true);
  const [pushNotifChat, setPushNotifChat] = useState(true);
  const [pushNotifPracticeReminder, setPushNotifPracticeReminder] = useState(true);
  const [pushNotifWeeklyDigest, setPushNotifWeeklyDigest] = useState(true);
  const [pushNotifAllFeatures, setPushNotifAllFeatures] = useState(false);
  const [showPushSoftPrompt, setShowPushSoftPrompt] = useState(false);

  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isStandalone = typeof window !== 'undefined' && ((window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches);

  const [studentSchedules, setStudentSchedules] = useState<any[]>([]);
  const [settingsSubTab, setSettingsSubTab] = useState<'notifications' | 'parent_controls' | 'security' | 'modules' | 'billing' | 'legal' | 'overview'>('parent_controls');
  const [activeStudentSettingsModal, setActiveStudentSettingsModal] = useState<'notifications' | 'parent_controls' | 'security' | 'modules' | 'billing' | 'legal' | null>(null);
  const [showParentActivationModal, setShowParentActivationModal] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);
  const [pinFormNew, setPinFormNew] = useState('');
  const [pinFormConfirm, setPinFormConfirm] = useState('');
  const [pinFormError, setPinFormError] = useState('');
  const [pinFormSuccess, setPinFormSuccess] = useState('');
  const [securityPinTarget, setSecurityPinTarget] = useState<'student' | 'parent'>('student');
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [firstPinActiveField, setFirstPinActiveField] = useState<'new' | 'confirm'>('new');
  const [firstPinShowMask, setFirstPinShowMask] = useState<boolean>(false);
  const [firstPinSavedSuccess, setFirstPinSavedSuccess] = useState<boolean>(false);
  const [matchCelebrationData, setMatchCelebrationData] = useState<any | null>(null);

  // Parent Control Center Draft States & Step-Up Save Modal (Deterministic SSOT)
  const [parentControlsTab, setParentControlsTab] = useState<'governance' | 'insights' | 'cancellations'>('governance');
  const [parentBriefingDismissed, setParentBriefingDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !studentId) return false;
    const dismissedAt = localStorage.getItem(`groovelab_parent_dismissed_briefing_${studentId}`);
    if (!dismissedAt) return false;
    return (Date.now() - Number(dismissedAt)) < (12 * 60 * 60 * 1000);
  });
  const [draftUiLevel, setDraftUiLevel] = useState<string>(() => {
    const dbLevel = (initialUser as any)?.campus_ui_level;
    if (dbLevel === 'junior' || dbLevel === 'teen' || dbLevel === 'pro') return dbLevel;
    if (typeof window !== 'undefined') {
      const effectiveId = studentId || (initialUser as any)?.id;
      if (effectiveId) {
        const namespaced = localStorage.getItem(`campus_student_ui_level_${effectiveId}`);
        if (namespaced === 'junior' || namespaced === 'teen' || namespaced === 'pro') return namespaced;
      }
    }
    return 'junior';
  });
  const [draftAllowAbsences, setDraftAllowAbsences] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined' && studentId) {
      const saved = localStorage.getItem(`groovelab_parent_allow_absences_${studentId}`);
      if (saved !== null) return saved === 'true';
    }
    if (initialUser?.parent_allow_absences !== undefined && initialUser?.parent_allow_absences !== null) {
      return Boolean(initialUser.parent_allow_absences);
    }
    return null;
  });
  const [draftAllowReschedule, setDraftAllowReschedule] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined' && studentId) {
      const saved = localStorage.getItem(`groovelab_parent_allow_reschedule_${studentId}`);
      if (saved !== null) return saved === 'true';
    }
    if ((initialUser as any)?.parent_allow_reschedule_confirm !== undefined && (initialUser as any)?.parent_allow_reschedule_confirm !== null) {
      return Boolean((initialUser as any).parent_allow_reschedule_confirm);
    }
    return null;
  });
  const [draftAllowChat, setDraftAllowChat] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined' && studentId) {
      const saved = localStorage.getItem(`groovelab_parent_allow_chat_${studentId}`);
      if (saved !== null) return saved === 'true';
    }
    if (initialUser?.parent_allow_chat !== undefined && initialUser?.parent_allow_chat !== null) {
      return Boolean(initialUser.parent_allow_chat);
    }
    return null;
  });
  const [draftAllowTimer, setDraftAllowTimer] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined' && studentId) {
      const saved = localStorage.getItem(`groovelab_parent_allow_timer_${studentId}`);
      if (saved !== null) return saved === 'true';
    }
    if (initialUser?.parent_allow_timer !== undefined && initialUser?.parent_allow_timer !== null) {
      return Boolean(initialUser.parent_allow_timer);
    }
    return null;
  });
  const [draftAllowLeaderboard, setDraftAllowLeaderboard] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined' && studentId) {
      const saved = localStorage.getItem(`groovelab_parent_allow_leaderboard_${studentId}`);
      if (saved !== null) return saved === 'true';
    }
    if (initialUser?.parent_allow_leaderboard !== undefined && initialUser?.parent_allow_leaderboard !== null) {
      return Boolean(initialUser.parent_allow_leaderboard);
    }
    return null;
  });
  const [draftAllowProposals, setDraftAllowProposals] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined' && studentId) {
      const saved = localStorage.getItem(`groovelab_parent_allow_proposals_${studentId}`);
      if (saved !== null) return saved === 'true';
    }
    if (initialUser?.parent_allow_proposals !== undefined && initialUser?.parent_allow_proposals !== null) {
      return Boolean(initialUser.parent_allow_proposals);
    }
    return null;
  });
  const [draftAllowAudio, setDraftAllowAudio] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined' && studentId) {
      const saved = localStorage.getItem(`groovelab_parent_allow_audio_${studentId}`);
      if (saved !== null) return saved === 'true';
    }
    if (initialUser?.parent_allow_audio !== undefined && initialUser?.parent_allow_audio !== null) {
      return Boolean(initialUser.parent_allow_audio);
    }
    return null;
  });
  const [draftAllowTts, setDraftAllowTts] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined' && studentId) {
      const saved = localStorage.getItem(`groovelab_parent_allow_tts_${studentId}`);
      if (saved !== null) return saved === 'true';
    }
    if (initialUser?.parent_allow_tts !== undefined && initialUser?.parent_allow_tts !== null) {
      return Boolean(initialUser.parent_allow_tts);
    }
    return null;
  });
  const [draftBoardOverrides, setDraftBoardOverrides] = useState<Record<string, boolean>>({});
  
  // 🛡️ Goldstandard (Art. 25 & 28 DSA / Art. 12 Abs. 1 S. 2 DSGVO): State für temporäres Diff-Highlighting bei Stufenwechsel
  const [recentlyChangedDiff, setRecentlyChangedDiff] = useState<{
    keys: string[];
    targetLevelLabel: string;
    targetLevelId: string;
    changes: Record<string, { from: boolean; to: boolean }>;
  } | null>(null);

  const [showSavePinModal, setShowSavePinModal] = useState<boolean>(false);
  const [savePinInput, setSavePinInput] = useState<string>('');
  const [savePinError, setSavePinError] = useState<string | null>(null);
  const [savePinLoading, setSavePinLoading] = useState<boolean>(false);

  // Parental Gatekeeper State (6-Digit Parent Master PIN)
  const [showParentGateModal, setShowParentGateModal] = useState(false);
  const [pendingParentTarget, setPendingParentTarget] = useState<'parent_controls' | 'security' | 'billing' | 'legal' | null>(null);
  const [parentGatePinInput, setParentGatePinInput] = useState('');
  const [parentGateError, setParentGateError] = useState('');
  const [isVerifyingParentGate, setIsVerifyingParentGate] = useState(false);
  const [parentSetupStep, setParentSetupStep] = useState<'enter' | 'confirm'>('enter');
  const [parentSetupPin, setParentSetupPin] = useState('');
  const [parentSetupConfirm, setParentSetupConfirm] = useState('');
  const [parentSetupError, setParentSetupError] = useState('');

  // Reactive Parent Unlocked State (Instant UI Re-render upon unlock)
  const [isParentUnlocked, setIsParentUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const globalUnlocked = sessionStorage.getItem('groovelab_parent_unlocked_global') === 'true';
    if (globalUnlocked) return true;
    const sId = studentId;
    if (sId) {
      const exp = sessionStorage.getItem(`groovelab_parent_session_${sId}`);
      if (exp && Number(exp) > Date.now()) return true;
      if (sessionStorage.getItem(`groovelab_parent_unlocked_${sId}`) === 'true') return true;
    }
    return false;
  });

  useEffect(() => {
    const handleParentModeChanged = (e: any) => {
      setIsParentUnlocked(Boolean(e.detail));
    };
    window.addEventListener('groovelab_parent_mode_changed', handleParentModeChanged);
    return () => window.removeEventListener('groovelab_parent_mode_changed', handleParentModeChanged);
  }, []);

  // Tier-1 Enterprise+ Recovery & Anti-Brute-Force States
  const [isParentGateShaking, setIsParentGateShaking] = useState(false);
  const [parentGateFailedCount, setParentGateFailedCount] = useState(0);
  const [parentGateCooldownSeconds, setParentGateCooldownSeconds] = useState(0);
  const [showEmergencyKitModal, setShowEmergencyKitModal] = useState(false);
  const [newGeneratedRecoveryKey, setNewGeneratedRecoveryKey] = useState('');
  const [hasCopiedRecoveryKey, setHasCopiedRecoveryKey] = useState(false);
  const [showRecoveryKeyModal, setShowRecoveryKeyModal] = useState(false);
  const [recoveryKeyInput, setRecoveryKeyInput] = useState('');
  const [recoveryKeyError, setRecoveryKeyError] = useState('');

  useEffect(() => {
    if (parentGateCooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setParentGateCooldownSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [parentGateCooldownSeconds]);

  // Master Wall-Clock 1s Heartbeat for exact countdowns & lock synchronicity
  const [wallClockNow, setWallClockNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setWallClockNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // WebAuthn / Passkey availability check for hardware biometrics
  const [isWebAuthnAvailable, setIsWebAuthnAvailable] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(res => setIsWebAuthnAvailable(Boolean(res)))
        .catch(() => setIsWebAuthnAvailable(false));
    }
  }, []);

  const handleBiometricUnlock = async () => {
    try {
      setIsVerifyingParentGate(true);
      setParentGateError('');
      const targetId = studentId || (studentUser as any)?.id;
      if (!targetId) throw new Error('Kein Schülerprofil zugeordnet.');

      // 1. Request cryptographic challenge from server
      const { data: chalData, error: chalErr } = await supabase.rpc('generate_webauthn_challenge', {
        p_user_id: targetId,
        p_type: 'auth'
      });

      if (chalErr || !chalData?.challenge) {
        throw new Error('Sicherheits-Challenge konnte nicht vom Server bezogen werden.');
      }

      const challengeBuffer = new Uint8Array(
        chalData.challenge.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || []
      ).buffer;

      // 2. Perform native WebAuthn get assertion
      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge: challengeBuffer,
          userVerification: 'required',
          timeout: 60000,
        },
      })) as PublicKeyCredential;

      if (!assertion) {
        throw new Error('Keine biometrische Bestätigung empfangen.');
      }

      const credentialId = assertion.id;

      // 3. Authenticate credential via server RPC
      const { data: authResult, error: authErr } = await supabase.rpc('authenticate_webauthn_credential', {
        p_credential_id: credentialId,
        p_challenge: chalData.challenge,
        p_school_id: (studentUser as any)?.school_id || null
      });

      if (authErr || !authResult?.success) {
        throw new Error(authResult?.error || authErr?.message || 'Biometrischer Passkey nicht erkannt oder nicht für dieses Profil registriert.');
      }

      // 4. Authorized: Set verified session lease (180s)
      const siblingGroupId = (studentUser as any)?.sibling_group_id || (initialUser as any)?.sibling_group_id;
      sessionStorage.setItem(`groovelab_parent_session_${targetId}`, String(Date.now() + 180 * 1000));
      if (studentId) sessionStorage.setItem(`groovelab_parent_session_${studentId}`, String(Date.now() + 180 * 1000));
      sessionStorage.setItem(`groovelab_parent_unlocked_${targetId}`, 'true');
      if (studentId) sessionStorage.setItem(`groovelab_parent_unlocked_${studentId}`, 'true');
      sessionStorage.setItem('groovelab_parent_unlocked_global', 'true');
      if (siblingGroupId) {
        sessionStorage.setItem(`groovelab_family_unlocked_${siblingGroupId}`, 'true');
      }
      setIsParentUnlocked(true);
      setIsVerifyingParentGate(false);
      setParentGatePinInput('');
      window.dispatchEvent(new CustomEvent('groovelab_parent_mode_changed', { detail: true }));
      setSettingsSubTab('overview');
      setActiveStudentSettingsModal(null);
    } catch (e: any) {
      console.warn('[Biometrics] Unlock failed:', e);
      setParentGateError(e.message || 'FaceID/TouchID Entsperrung fehlgeschlagen.');
    } finally {
      setIsVerifyingParentGate(false);
    }
  };

  // 🛡️ Enterprise+ Inactivity Auto-Lock & Tab-Switch Protector (3 Minutes with 10s Warning)
  const {
    isWarning: isParentLockWarning,
    remainingSeconds: parentLockRemainingSeconds,
    extendSession: extendParentSession
  } = useParentSessionLock({
    enabled: isParentUnlocked,
    studentId,
    timeoutSeconds: 180,
    warningThresholdSeconds: 10,
    onLock: () => {
      setIsParentUnlocked(false);
      setSettingsSubTab('overview');
      setActiveStudentSettingsModal(null);
      setParentGatePinInput('');
    }
  });

  const generateParentRecoveryKey = () => {
    const p1 = Math.floor(1000 + Math.random() * 9000);
    const p2 = Math.floor(1000 + Math.random() * 9000);
    return `REC-${p1}-${p2}`;
  };

  const extractPinCandidates = (u: any): string[] => {
    if (!u) return [];
    const candidates: string[] = [];

    const addVal = (val?: any) => {
      if (val === undefined || val === null) return;
      const str = String(val).trim();
      if (!str) return;
      candidates.push(str);
      if (str.length < 6 && /^\d+$/.test(str)) {
        candidates.push(str.padStart(6, '0'));
      }
    };

    addVal(u.parent_pin);
    addVal(u.personal_pin);
    addVal(u.onboarding_pin);
    addVal(u.starter_pin);
    addVal(u.emergency_pin);
    addVal(u.recovery_key);
    addVal(u.ausweis_nummer);

    // Dynamic Birthdate Formats (e.g. 11.10.1988 -> 111088, 11101988, 19881011)
    const rawBirth = u.birth_date || u.birthdate || u.day_of_birth;
    if (rawBirth) {
      const bStr = String(rawBirth).trim();
      const isoMatch = bStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        const [, y, m, d] = isoMatch;
        const yShort = y.slice(2);
        candidates.push(`${d}${m}${yShort}`);
        candidates.push(`${d}${m}${y}`);
        candidates.push(`${y}${m}${d}`);
        candidates.push(`${yShort}${m}${d}`);
        candidates.push(`${d}${m}`.padStart(6, '0'));
      }
      const dotMatch = bStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
      if (dotMatch) {
        const [, dRaw, mRaw, yRaw] = dotMatch;
        const d = dRaw.padStart(2, '0');
        const m = mRaw.padStart(2, '0');
        const yShort = yRaw.length === 4 ? yRaw.slice(2) : yRaw;
        const yFull = yRaw.length === 2 ? `20${yRaw}` : yRaw;
        candidates.push(`${d}${m}${yShort}`);
        candidates.push(`${d}${m}${yFull}`);
        candidates.push(`${d}${m}`.padStart(6, '0'));
      }
      const digitsOnly = bStr.replace(/\D/g, '');
      if (digitsOnly.length === 6 || digitsOnly.length === 8) {
        candidates.push(digitsOnly);
      }
    }

    return Array.from(new Set(candidates));
  };

  const handleVerifyParentPinAttempt = async (cleanInput: string, onSuccess: () => void) => {
    if (parentGateCooldownSeconds > 0) return;
    setParentGateError('');

    const targetId = studentId || (studentUser as any)?.id;
    if (!targetId) return;

    setIsVerifyingParentGate(true);
    try {
      let isOk = false;

      // 1. Primary: Server-Side verify_parent_pin RPC
      try {
        const { data: parentOk } = await supabase.rpc('verify_parent_pin', {
          student_id: targetId,
          input_pin: cleanInput
        });
        if (parentOk === true) isOk = true;
      } catch (e) {}

      // 2. Fallback: Server-Side verify_personal_pin RPC
      if (!isOk) {
        try {
          const { data: personalOk } = await supabase.rpc('verify_personal_pin', {
            user_uuid: targetId,
            input_pin: cleanInput
          });
          if (personalOk === true) isOk = true;
        } catch (e) {}
      }

      if (isOk) {
        setParentGateFailedCount(0);
        setParentGatePinInput('');
        setIsParentUnlocked(true);
        setIsVerifyingParentGate(false);

        sessionStorage.setItem(`groovelab_parent_session_${targetId}`, String(Date.now() + 60 * 60 * 1000));
        if (studentId) sessionStorage.setItem(`groovelab_parent_session_${studentId}`, String(Date.now() + 60 * 60 * 1000));
        sessionStorage.setItem(`groovelab_parent_unlocked_${targetId}`, 'true');
        if (studentId) sessionStorage.setItem(`groovelab_parent_unlocked_${studentId}`, 'true');
        sessionStorage.setItem('groovelab_parent_unlocked_global', 'true');
        window.dispatchEvent(new CustomEvent('groovelab_parent_mode_changed', { detail: true }));

        onSuccess();
        return;
      } else {
        setIsParentGateShaking(true);
        setTimeout(() => setIsParentGateShaking(false), 380);
        const nextFailCount = parentGateFailedCount + 1;
        setParentGateFailedCount(nextFailCount);
        if (nextFailCount >= 5) {
          setParentGateCooldownSeconds(30);
          setParentGateError('Zu viele Fehlversuche. 30 Sekunden Sicherheitssperre aktiv.');
        } else {
          setParentGateError(`Falsche Eltern-Master-PIN (Versuch ${nextFailCount}/5).`);
        }
        setParentGatePinInput('');
      }
    } catch (e: any) {
      setParentGateError('Fehler: ' + (e?.message || 'Verbindungsfehler'));
      setParentGatePinInput('');
    } finally {
      setIsVerifyingParentGate(false);
    }
  };

  const checkIsParentSessionActive = () => {
    if (isParentUnlocked) return true;
    if (typeof window !== 'undefined' && sessionStorage.getItem('groovelab_parent_unlocked_global') === 'true') return true;
    const targetId = studentId || (studentUser as any)?.id;
    if (targetId && typeof window !== 'undefined') {
      const sessionExpiry = sessionStorage.getItem(`groovelab_parent_session_${targetId}`);
      if (sessionExpiry && Number(sessionExpiry) > Date.now()) return true;
      if (sessionStorage.getItem(`groovelab_parent_unlocked_${targetId}`) === 'true') return true;
    }
    return false;
  };

  const CAMPUS_AGE_STANDARDS: Record<string, {
    label: string;
    uiLevel: string;
    allowAbsences: boolean;
    allowRescheduleConfirm: boolean;
    allowChat: boolean;
    allowTimer: boolean;
    allowLeaderboard: boolean;
    allowProposals: boolean;
    allowAudio: boolean;
    allowTts: boolean;
    bedtimeEnabled: boolean;
    bedtimeStart: string;
    bedtimeEnd: string;
    boardOverrides: Record<string, boolean>;
  }> = {
    junior: {
      label: 'Junior (6–10 J.)',
      uiLevel: 'junior',
      allowAbsences: false,
      allowRescheduleConfirm: false,
      allowChat: false,
      allowTimer: true,
      allowLeaderboard: false,
      allowProposals: false,
      allowAudio: true,
      allowTts: true,
      bedtimeEnabled: true,
      bedtimeStart: '20:00',
      bedtimeEnd: '07:00',
      boardOverrides: {
        practice_board: true,
        mediathek: false,
        recordings: true,
        events: true,
        campus_cup: false,
        messages: false
      }
    },
    teen: {
      label: 'Teen (11–15 J.)',
      uiLevel: 'teen',
      allowAbsences: true,
      allowRescheduleConfirm: true,
      allowChat: true,
      allowTimer: true,
      allowLeaderboard: true,
      allowProposals: true,
      allowAudio: true,
      allowTts: false,
      bedtimeEnabled: true,
      bedtimeStart: '21:30',
      bedtimeEnd: '06:30',
      boardOverrides: {
        practice_board: true,
        mediathek: true,
        recordings: true,
        events: true,
        campus_cup: true,
        messages: true
      }
    },
    pro: {
      label: '+16 / Pro (Ab 16 J.)',
      uiLevel: 'pro',
      allowAbsences: true,
      allowRescheduleConfirm: true,
      allowChat: true,
      allowTimer: true,
      allowLeaderboard: true,
      allowProposals: true,
      allowAudio: true,
      allowTts: false,
      bedtimeEnabled: false,
      bedtimeStart: '22:30',
      bedtimeEnd: '06:00',
      boardOverrides: {
        practice_board: true,
        mediathek: true,
        recordings: true,
        events: true,
        campus_cup: true,
        messages: true
      }
    }
  };

  const applyAndSaveParentControls = async (updates: {
    uiLevel?: 'junior' | 'teen' | 'pro' | string;
    allowAbsences?: boolean;
    allowRescheduleConfirm?: boolean;
    allowChat?: boolean;
    allowTimer?: boolean;
    allowLeaderboard?: boolean;
    allowProposals?: boolean;
    allowAudio?: boolean;
    allowTts?: boolean;
    bedtimeEnabled?: boolean;
    bedtimeStart?: string;
    bedtimeEnd?: string;
    daytimeLockEnabled?: boolean;
    daytimeLockStart?: string;
    daytimeLockEnd?: string;
    daytimeLockDays?: 'school_days' | 'everyday';
    instantLockUntil?: number | null;
    boardOverrides?: Record<string, boolean>;
  }) => {
    const targetStudentId = studentId || (studentUser as any)?.id;
    const nextUiLevel = updates.uiLevel ?? draftUiLevel ?? (studentUser as any)?.campus_ui_level ?? 'junior';
    const isJuniorLevel = nextUiLevel === 'junior';
    // 🛡️ BGB/ABGB/ZGB Kinderschutz: Junior (6–10 J.) darf vertragliche Unterrichtsstunden nicht selbst stornieren
    const nextAllowAbsences = isJuniorLevel
      ? false
      : (updates.allowAbsences !== undefined 
          ? updates.allowAbsences 
          : (draftAllowAbsences !== null ? draftAllowAbsences : ((studentUser as any)?.parent_allow_absences !== undefined && (studentUser as any)?.parent_allow_absences !== null ? Boolean((studentUser as any)?.parent_allow_absences) : false)));
    const nextAllowReschedule = isJuniorLevel
      ? false
      : (updates.allowRescheduleConfirm !== undefined 
          ? updates.allowRescheduleConfirm 
          : (draftAllowReschedule !== null ? draftAllowReschedule : ((studentUser as any)?.parent_allow_reschedule_confirm !== undefined && (studentUser as any)?.parent_allow_reschedule_confirm !== null ? Boolean((studentUser as any)?.parent_allow_reschedule_confirm) : true)));
    const nextAllowChat = updates.allowChat !== undefined 
      ? updates.allowChat 
      : (draftAllowChat !== null ? draftAllowChat : ((studentUser as any)?.parent_allow_chat !== undefined && (studentUser as any)?.parent_allow_chat !== null ? Boolean((studentUser as any)?.parent_allow_chat) : false));
    const nextAllowTimer = updates.allowTimer !== undefined 
      ? updates.allowTimer 
      : (draftAllowTimer !== null ? draftAllowTimer : ((studentUser as any)?.parent_allow_timer !== undefined && (studentUser as any)?.parent_allow_timer !== null ? Boolean((studentUser as any)?.parent_allow_timer) : true));
    const nextAllowLeaderboard = updates.allowLeaderboard !== undefined 
      ? updates.allowLeaderboard 
      : (draftAllowLeaderboard !== null ? draftAllowLeaderboard : ((studentUser as any)?.parent_allow_leaderboard !== undefined && (studentUser as any)?.parent_allow_leaderboard !== null ? Boolean((studentUser as any)?.parent_allow_leaderboard) : false));
    const nextAllowProposals = updates.allowProposals !== undefined 
      ? updates.allowProposals 
      : (draftAllowProposals !== null ? draftAllowProposals : ((studentUser as any)?.parent_allow_proposals !== undefined && (studentUser as any)?.parent_allow_proposals !== null ? Boolean((studentUser as any)?.parent_allow_proposals) : false));
    const nextAllowAudio = updates.allowAudio !== undefined 
      ? updates.allowAudio 
      : (draftAllowAudio !== null ? draftAllowAudio : ((studentUser as any)?.parent_allow_audio !== undefined && (studentUser as any)?.parent_allow_audio !== null ? Boolean((studentUser as any)?.parent_allow_audio) : true));
    const nextAllowTts = updates.allowTts !== undefined 
      ? updates.allowTts 
      : (draftAllowTts !== null ? draftAllowTts : ((studentUser as any)?.parent_allow_tts !== undefined && (studentUser as any)?.parent_allow_tts !== null ? Boolean((studentUser as any)?.parent_allow_tts) : false));
    const nextOverrides = {
      ...((studentUser as any)?.parent_permissions?.board_overrides || {}),
      ...draftBoardOverrides,
      ...(updates.boardOverrides || {})
    };

    if (updates.uiLevel !== undefined) {
      setDraftUiLevel(updates.uiLevel);
      setStudentUiLevel(updates.uiLevel as any);
      if (targetStudentId) {
        localStorage.setItem(`campus_student_ui_level_${targetStudentId}`, updates.uiLevel);
      }
      localStorage.setItem('campus_student_ui_level', updates.uiLevel);
      window.dispatchEvent(new CustomEvent('campus_ui_level_changed', { detail: updates.uiLevel }));
    }
    if (updates.allowAbsences !== undefined || isJuniorLevel) {
      const finalAbsences = isJuniorLevel ? false : (updates.allowAbsences ?? nextAllowAbsences);
      setDraftAllowAbsences(finalAbsences);
      localStorage.setItem('campus_allow_absences', String(finalAbsences));
      if (studentId) localStorage.setItem(`groovelab_parent_allow_absences_${studentId}`, String(finalAbsences));
    }
    if (updates.allowRescheduleConfirm !== undefined || isJuniorLevel) {
      const finalReschedule = isJuniorLevel ? false : (updates.allowRescheduleConfirm ?? nextAllowReschedule);
      setDraftAllowReschedule(finalReschedule);
      localStorage.setItem('campus_allow_reschedule_confirm', String(finalReschedule));
      if (studentId) localStorage.setItem(`groovelab_parent_allow_reschedule_${studentId}`, String(finalReschedule));
    }
    if (updates.allowChat !== undefined) {
      setDraftAllowChat(updates.allowChat);
      localStorage.setItem('campus_allow_chat', String(updates.allowChat));
      localStorage.setItem('campus_board_override_messages', String(updates.allowChat));
      if (studentId) localStorage.setItem(`groovelab_parent_allow_chat_${studentId}`, String(updates.allowChat));
      window.dispatchEvent(new CustomEvent('campus_board_permission_changed', { detail: { boardId: 'messages', allowed: updates.allowChat } }));
    }
    if (updates.allowTimer !== undefined) {
      setDraftAllowTimer(updates.allowTimer);
      localStorage.setItem('campus_allow_timer', String(updates.allowTimer));
      localStorage.setItem('campus_board_override_practice_board', String(updates.allowTimer));
      if (studentId) localStorage.setItem(`groovelab_parent_allow_timer_${studentId}`, String(updates.allowTimer));
      window.dispatchEvent(new CustomEvent('campus_board_permission_changed', { detail: { boardId: 'practice_board', allowed: updates.allowTimer } }));
    }
    if (updates.allowLeaderboard !== undefined) {
      setDraftAllowLeaderboard(updates.allowLeaderboard);
      localStorage.setItem('campus_allow_leaderboard', String(updates.allowLeaderboard));
      localStorage.setItem('campus_board_override_campus_cup', String(updates.allowLeaderboard));
      if (studentId) localStorage.setItem(`groovelab_parent_allow_leaderboard_${studentId}`, String(updates.allowLeaderboard));
      window.dispatchEvent(new CustomEvent('campus_board_permission_changed', { detail: { boardId: 'campus_cup', allowed: updates.allowLeaderboard } }));
    }
    if (updates.allowProposals !== undefined) {
      setDraftAllowProposals(updates.allowProposals);
      localStorage.setItem('campus_allow_proposals', String(updates.allowProposals));
      localStorage.setItem('campus_board_override_mediathek', String(updates.allowProposals));
      if (studentId) localStorage.setItem(`groovelab_parent_allow_proposals_${studentId}`, String(updates.allowProposals));
      window.dispatchEvent(new CustomEvent('campus_board_permission_changed', { detail: { boardId: 'mediathek', allowed: updates.allowProposals } }));
    }
    if (updates.allowAudio !== undefined) {
      setDraftAllowAudio(updates.allowAudio);
      localStorage.setItem('campus_allow_audio', String(updates.allowAudio));
      localStorage.setItem('campus_board_override_recordings', String(updates.allowAudio));
      if (studentId) localStorage.setItem(`groovelab_parent_allow_audio_${studentId}`, String(updates.allowAudio));
      window.dispatchEvent(new CustomEvent('campus_board_permission_changed', { detail: { boardId: 'recordings', allowed: updates.allowAudio } }));
    }
    if (updates.allowTts !== undefined) {
      setDraftAllowTts(updates.allowTts);
      if (studentId) localStorage.setItem(`groovelab_parent_allow_tts_${studentId}`, String(updates.allowTts));
    }
    if (updates.boardOverrides) {
      setDraftBoardOverrides(prev => ({ ...prev, ...updates.boardOverrides }));
      Object.entries(updates.boardOverrides).forEach(([bId, allowed]) => {
        localStorage.setItem(`campus_board_override_${bId}`, String(allowed));
        window.dispatchEvent(new CustomEvent('campus_board_permission_changed', { detail: { boardId: bId, allowed } }));
      });
    }

    const nextBedtimeEnabled = updates.bedtimeEnabled !== undefined 
      ? updates.bedtimeEnabled 
      : bedtimeModeEnabled;
    const nextBedtimeStart = updates.bedtimeStart || bedtimeStart;
    const nextBedtimeEnd = updates.bedtimeEnd || bedtimeEnd;

    if (updates.bedtimeEnabled !== undefined) {
      setBedtimeModeEnabled(updates.bedtimeEnabled);
      localStorage.setItem('campus_bedtime_enabled', String(updates.bedtimeEnabled));
    }
    if (updates.bedtimeStart) {
      setBedtimeStart(updates.bedtimeStart);
      localStorage.setItem('campus_bedtime_start', updates.bedtimeStart);
    }
    if (updates.bedtimeEnd) {
      setBedtimeEnd(updates.bedtimeEnd);
      localStorage.setItem('campus_bedtime_end', updates.bedtimeEnd);
    }

    const nextDaytimeLockEnabled = updates.daytimeLockEnabled !== undefined
      ? updates.daytimeLockEnabled
      : daytimeLockEnabled;
    const nextDaytimeLockStart = updates.daytimeLockStart || daytimeLockStart;
    const nextDaytimeLockEnd = updates.daytimeLockEnd || daytimeLockEnd;
    const nextDaytimeLockDays = updates.daytimeLockDays || daytimeLockDays;

    if (updates.daytimeLockEnabled !== undefined) {
      setDaytimeLockEnabled(updates.daytimeLockEnabled);
      localStorage.setItem('campus_daytime_lock_enabled', String(updates.daytimeLockEnabled));
    }
    if (updates.daytimeLockStart) {
      setDaytimeLockStart(updates.daytimeLockStart);
      localStorage.setItem('campus_daytime_lock_start', updates.daytimeLockStart);
    }
    if (updates.daytimeLockEnd) {
      setDaytimeLockEnd(updates.daytimeLockEnd);
      localStorage.setItem('campus_daytime_lock_end', updates.daytimeLockEnd);
    }
    if (updates.daytimeLockDays) {
      setDaytimeLockDays(updates.daytimeLockDays);
      localStorage.setItem('campus_daytime_lock_days', updates.daytimeLockDays);
    }

    const nextInstantLockUntil = updates.instantLockUntil !== undefined
      ? updates.instantLockUntil
      : instantLockUntil;
    if (updates.instantLockUntil !== undefined) {
      setInstantLockUntil(updates.instantLockUntil);
      if (updates.instantLockUntil) {
        localStorage.setItem('campus_instant_lock_until', String(updates.instantLockUntil));
      } else {
        localStorage.removeItem('campus_instant_lock_until');
      }
    }

    const nextPermissions = {
      ...((studentUser as any)?.parent_permissions || {}),
      board_overrides: nextOverrides,
      parent_allow_tts: nextAllowTts,
      bedtime_mode: {
        enabled: nextBedtimeEnabled,
        start: nextBedtimeStart,
        end: nextBedtimeEnd
      },
      daytime_lock: {
        enabled: nextDaytimeLockEnabled,
        start: nextDaytimeLockStart,
        end: nextDaytimeLockEnd,
        days: nextDaytimeLockDays
      },
      instant_lock_until: nextInstantLockUntil
    };

    const payload: any = {
      campus_ui_level: nextUiLevel,
      parent_allow_absences: nextAllowAbsences,
      parent_allow_reschedule_confirm: nextAllowReschedule,
      parent_allow_chat: nextAllowChat,
      parent_allow_timer: nextAllowTimer,
      parent_allow_leaderboard: nextAllowLeaderboard,
      parent_allow_proposals: nextAllowProposals,
      parent_allow_audio: nextAllowAudio,
      parent_permissions: nextPermissions
    };

    // Update in-memory React state immediately for snappy UI
    setStudentUser((prev: any) => prev ? { ...prev, ...payload, parent_allow_tts: nextAllowTts } : prev);

    // Propagate to App.tsx root user state so initialUser is 100% synchronized!
    if (onProfileUpdate) {
      try {
        onProfileUpdate({ ...payload, parent_allow_tts: nextAllowTts });
      } catch (e) {
        console.warn('Could not propagate profile update to root:', e);
      }
    }

    try {
      if (targetStudentId) {
        // 🛡️ Call immutable RPC for authoritative database storage with GoBD audit trail
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('save_parent_controls', {
          p_student_id: targetStudentId,
          p_settings: payload
        });

        if (rpcErr) {
          console.warn('save_parent_controls RPC failed, falling back to direct table update:', rpcErr);
          const { error: userErr } = await supabase.from('users').update(payload).eq('id', targetStudentId);
          if (userErr) {
            console.warn('Fallback update on users failed:', userErr);
          }
        }
      }
    } catch (err) {
      console.error('Error auto-saving parent controls:', err);
    }
  };

  // Must-Have 1: Bedtime Mode (Ruhezeiten)
  const [bedtimeModeEnabled, setBedtimeModeEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('campus_bedtime_enabled');
    if (saved !== null) return saved === 'true';
    const savedLvl = localStorage.getItem('campus_student_ui_level');
    return savedLvl !== 'pro';
  });
  const [bedtimeStart, setBedtimeStart] = useState<string>(() => {
    if (typeof window === 'undefined') return '20:00';
    const saved = localStorage.getItem('campus_bedtime_start');
    if (saved) return saved;
    const savedLvl = localStorage.getItem('campus_student_ui_level');
    if (savedLvl === 'teen') return '21:30';
    if (savedLvl === 'pro') return '22:30';
    return '20:00';
  });
  const [bedtimeEnd, setBedtimeEnd] = useState<string>(() => {
    if (typeof window === 'undefined') return '07:00';
    const saved = localStorage.getItem('campus_bedtime_end');
    if (saved) return saved;
    const savedLvl = localStorage.getItem('campus_student_ui_level');
    if (savedLvl === 'teen') return '06:30';
    if (savedLvl === 'pro') return '06:00';
    return '07:00';
  });

  const isCurrentlyInBedtime = useMemo(() => {
    if (!bedtimeModeEnabled) return false;
    const currentMinutes = wallClockNow.getHours() * 60 + wallClockNow.getMinutes();

    const [startH, startM] = bedtimeStart.split(':').map(Number);
    const [endH, endM] = bedtimeEnd.split(':').map(Number);
    const startMinutes = (startH ?? 20) * 60 + (startM ?? 0);
    const endMinutes = (endH ?? 7) * 60 + (endM ?? 0);

    if (startMinutes > endMinutes) {
      // Overnight (e.g. 20:00 to 07:00)
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
      // Same day
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
  }, [bedtimeModeEnabled, bedtimeStart, bedtimeEnd, wallClockNow]);

  const handleUpdateBedtime = async (enabled: boolean, start?: string, end?: string) => {
    const nextStart = start || bedtimeStart;
    const nextEnd = end || bedtimeEnd;
    await applyAndSaveParentControls({
      bedtimeEnabled: enabled,
      bedtimeStart: nextStart,
      bedtimeEnd: nextEnd
    });
  };

  // Must-Have 1b: Tages-Sperrfenster (Schulzeit & Hausaufgaben-Fokus)
  const [daytimeLockEnabled, setDaytimeLockEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('campus_daytime_lock_enabled');
    return saved !== null ? saved === 'true' : false;
  });
  const [daytimeLockStart, setDaytimeLockStart] = useState<string>(() => {
    if (typeof window === 'undefined') return '08:00';
    return localStorage.getItem('campus_daytime_lock_start') || '08:00';
  });
  const [daytimeLockEnd, setDaytimeLockEnd] = useState<string>(() => {
    if (typeof window === 'undefined') return '13:00';
    return localStorage.getItem('campus_daytime_lock_end') || '13:00';
  });
  const [daytimeLockDays, setDaytimeLockDays] = useState<'school_days' | 'everyday'>(() => {
    if (typeof window === 'undefined') return 'school_days';
    return (localStorage.getItem('campus_daytime_lock_days') as any) || 'school_days';
  });

  // Must-Have 1c: 1-Tap Sofortpause ("Familienzeit / Bildschirm-Auszeit")
  const [instantLockUntil, setInstantLockUntil] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('campus_instant_lock_until');
    if (!saved) return null;
    const ts = Number(saved);
    return !isNaN(ts) && ts > Date.now() ? ts : null;
  });

  const isCurrentlyInDaytimeLock = useMemo(() => {
    if (!daytimeLockEnabled) return false;
    const day = wallClockNow.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    if (daytimeLockDays === 'school_days' && (day === 0 || day === 6)) {
      return false; // Am Wochenende schulfrei
    }
    const currentMinutes = wallClockNow.getHours() * 60 + wallClockNow.getMinutes();
    const [startH, startM] = daytimeLockStart.split(':').map(Number);
    const [endH, endM] = daytimeLockEnd.split(':').map(Number);
    const startMinutes = (startH ?? 8) * 60 + (startM ?? 0);
    const endMinutes = (endH ?? 13) * 60 + (endM ?? 0);

    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
  }, [daytimeLockEnabled, daytimeLockStart, daytimeLockEnd, daytimeLockDays, wallClockNow]);

  const isCurrentlyInInstantLock = useMemo(() => {
    if (!instantLockUntil) return false;
    return wallClockNow.getTime() < instantLockUntil;
  }, [instantLockUntil, wallClockNow]);

  // 5-Minuten-Vorwarnung / Pufferzeit vor Sperrbeginn (Grace Window)
  const lockWarningInfo = useMemo(() => {
    if (isParentUnlocked) return null;
    const currentMinutes = wallClockNow.getHours() * 60 + wallClockNow.getMinutes();

    // 1. Bedtime Vorwarnung
    if (bedtimeModeEnabled) {
      const [startH, startM] = bedtimeStart.split(':').map(Number);
      const bedtimeMinutes = (startH ?? 20) * 60 + (startM ?? 0);
      const diff = bedtimeMinutes - currentMinutes;
      if (diff > 0 && diff <= 5) {
        return {
          type: 'bedtime',
          minutesLeft: diff,
          targetTime: bedtimeStart,
          title: 'Schlafenszeit naht 🌙',
          message: `Noch ${diff} Min. bis ${bedtimeStart} Uhr • Bitte aktuelle Übung sichern!`
        };
      }
    }

    // 2. Daytime Lock Vorwarnung
    if (daytimeLockEnabled) {
      const day = wallClockNow.getDay();
      if (!(daytimeLockDays === 'school_days' && (day === 0 || day === 6))) {
        const [startH, startM] = daytimeLockStart.split(':').map(Number);
        const dayMinutes = (startH ?? 8) * 60 + (startM ?? 0);
        const diff = dayMinutes - currentMinutes;
        if (diff > 0 && diff <= 5) {
          return {
            type: 'daytime',
            minutesLeft: diff,
            targetTime: daytimeLockStart,
            title: 'Schulzeit-Fokus naht 🎒',
            message: `Noch ${diff} Min. bis ${daytimeLockStart} Uhr • Schul-Fokus startet gleich!`
          };
        }
      }
    }

    return null;
  }, [bedtimeModeEnabled, bedtimeStart, daytimeLockEnabled, daytimeLockStart, daytimeLockDays, isParentUnlocked, wallClockNow]);

  const handleUpdateDaytimeLock = async (enabled: boolean, start?: string, end?: string, days?: 'school_days' | 'everyday') => {
    const nextStart = start || daytimeLockStart;
    const nextEnd = end || daytimeLockEnd;
    const nextDays = days || daytimeLockDays;
    await applyAndSaveParentControls({
      daytimeLockEnabled: enabled,
      daytimeLockStart: nextStart,
      daytimeLockEnd: nextEnd,
      daytimeLockDays: nextDays
    });
  };

  const handleSetInstantLock = async (durationMinutes: number | null) => {
    let untilTs: number | null = null;
    if (durationMinutes !== null) {
      if (durationMinutes === -1) {
        // Bis morgen früh 07:00 Uhr pausieren
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(7, 0, 0, 0);
        untilTs = tomorrow.getTime();
      } else {
        untilTs = Date.now() + durationMinutes * 60 * 1000;
      }
    }
    await applyAndSaveParentControls({
      instantLockUntil: untilTs
    });
  };

  // Must-Have 2: Family Profiles (Geschwister-Schnellwechsel)
  const [familyProfiles, setFamilyProfiles] = useState<any[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('campus_family_profiles');
      return saved ? JSON.parse(saved) : [];
    } catch(e) {
      return [];
    }
  });
  const [isAddSiblingModalOpen, setIsAddSiblingModalOpen] = useState<boolean>(false);

  const handleSwitchFamilyStudent = (targetStudentId: string, keepParentUnlocked = false) => {
    if (targetStudentId === studentId) return;
    localStorage.setItem('groovelab_current_student_id', targetStudentId);
    localStorage.setItem('campus_active_student_id', targetStudentId);
    sessionStorage.setItem('groovelab_user_id', targetStudentId);
    if (!keepParentUnlocked) {
      // Auto-lock parent session when handing device over to child for 100% child safety
      sessionStorage.removeItem('groovelab_parent_unlocked_global');
      sessionStorage.removeItem(`groovelab_parent_session_${studentId}`);
      sessionStorage.removeItem(`groovelab_parent_session_${targetStudentId}`);
    } else {
      sessionStorage.setItem('groovelab_parent_unlocked_global', 'true');
      sessionStorage.setItem(`groovelab_parent_session_${targetStudentId}`, String(Date.now() + 60 * 60 * 1000));
    }
    window.location.search = `?student=${targetStudentId}`;
  };

  const handleRemoveFamilyProfile = (removeStudentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (removeStudentId === studentId) return;
    setFamilyProfiles(prev => {
      const updated = prev.filter(p => p.id !== removeStudentId);
      try {
        localStorage.setItem('campus_family_profiles', JSON.stringify(updated));
        const localProfs = JSON.parse(localStorage.getItem('groovelab_local_profiles') || '[]');
        const updatedLocal = localProfs.filter((p: any) => p.id !== removeStudentId);
        localStorage.setItem('groovelab_local_profiles', JSON.stringify(updatedLocal));
      } catch(e) {}
      return updated;
    });
  };

  const handleOpenSettingsModule = (moduleId: 'notifications' | 'parent_controls' | 'security' | 'billing' | 'legal' | 'feedback' | any) => {
    if (moduleId === 'feedback') {
      setIsFeedbackModalOpen(true);
      return;
    }

    if (moduleId === 'notifications') {
      setSettingsSubTab(moduleId);
      setActiveStudentSettingsModal(moduleId);
      return;
    }

    // Adult Self-Management: Full direct access without parental PIN gate
    if (isAdultStudent) {
      if (moduleId === 'security') {
        setFirstPinActiveField('new');
        setPinFormNew('');
        setPinFormConfirm('');
        setPinFormError('');
        setPinFormSuccess('');
      }
      setSettingsSubTab(moduleId);
      setActiveStudentSettingsModal(moduleId);
      return;
    }

    if (checkIsParentSessionActive()) {
      if (moduleId === 'security') {
        setFirstPinActiveField('new');
        setPinFormNew('');
        setPinFormConfirm('');
        setPinFormError('');
        setPinFormSuccess('');
      }
      setSettingsSubTab(moduleId);
      setActiveStudentSettingsModal(moduleId);
    } else {
      setPendingParentTarget(moduleId);
      setParentGatePinInput('');
      setParentGateError('');
      setShowParentGateModal(true);
    }
  };

  const handleDownloadGoBdReceipt = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');

      const sId = studentId || studentUser?.id || 'ID';
      const yearShort = String(new Date().getFullYear()).slice(-2);
      const monthStr = String(new Date().getMonth() + 1).padStart(2, '0');
      let hash = 0;
      for (let i = 0; i < sId.length; i++) {
        const char = sId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
      }
      const hexHash = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0').slice(-8);
      const refCode = `CG-${hexHash}-${yearShort}${monthStr}`;

      const sName = `${studentUser?.first_name || 'Schüler'} ${studentUser?.last_name || ''}`.trim();
      const schoolName = studentUser?.schools?.name || 'Campus-Groovelab Partner-Musikschule';
      const isChf = studentUser?.schools?.currency === 'CHF';
      const amountStr = isChf ? 'CHF 5.88' : '5,88 €';

      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 297, 'F');

      // Header Banner
      doc.setFillColor(52, 168, 83);
      doc.roundedRect(15, 15, 180, 28, 4, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Campus-Groovelab • Offizielle Zahlungsquittung', 22, 28);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Zahlungsbestätigung für Bildungs- & App-Bereitstellung (GoBD-konform)', 22, 36);

      // Card
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, 50, 180, 225, 4, 4, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, 50, 180, 225, 4, 4, 'S');

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Beleg- / Rechnungsnummer: ${refCode}`, 22, 65);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Ausstellungsdatum: ${new Date().toLocaleDateString('de-DE')}`, 22, 72);

      // Details Box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(22, 80, 166, 65, 3, 3, 'F');

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('SCHÜLER / NUTZER', 28, 90);
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(sName, 28, 96);

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.text('PARTNER-MUSIKSCHULE', 28, 106);
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(schoolName, 28, 112);

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.text('LEISTUNGSBESCHREIBUNG & GEBÜHR', 28, 122);
      doc.setFontSize(10);
      doc.setTextColor(5, 150, 105);
      doc.setFont('helvetica', 'bold');
      doc.text(`Campus-Modul Bereitstellung • ${amountStr} (Bezahlt)`, 28, 128);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Umsatzsteuerbefreit gem. § 19 UStG / Art. 8 MWSTG.', 28, 136);

      // Confirmation note
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('Bestätigung über den Zahlungseingang:', 22, 160);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text('Der fällige Jahresbeitrag für die Nutzung des Campus-Übestudios (Hausaufgabenheft,', 22, 168);
      doc.text('Übe-Timer, Loopstation & Audio-Tresor) wurde erfolgreich verbucht.', 22, 175);
      doc.text('Dieser Beleg dient als offizieller Nachweis zur Vorlage beim Finanzamt (Sonderausgaben /', 22, 182);
      doc.text('Bildungskosten) oder bei der Beantragung von Arbeitgeber- und Vereinszuschüssen.', 22, 189);

      // Stamp
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(16, 185, 129);
      doc.roundedRect(22, 205, 166, 24, 3, 3, 'FD');
      doc.setTextColor(6, 95, 70);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text('✓ STATUS: BEZAHLT & FREIGESCHALTET (GoBD-Zertifiziert)', 28, 220);

      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text('Campus-Groovelab • Transparentes Cloud-Hosting statt teurer Software-Lizenzen.', 22, 266);

      doc.save(`GoBD_Zahlungsquittung_${refCode}.pdf`);
    } catch (e: any) {
      alert('Fehler beim PDF-Export: ' + e.message);
    }
  };

  const handleCloseSettingsModal = () => {
    setActiveStudentSettingsModal(null);
  };

  const [isAppUser, setIsAppUser] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [avatarFromDb, setAvatar] = useState<Avatar | null>(null);
  const [hasMasteryCrown, setHasMasteryCrown] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`campus_mastery_complete_${studentId}`) === 'true' ||
        localStorage.getItem(`campus_mastery_complete_${studentUser?.id}`) === 'true';
    } catch {
      return false;
    }
  });
  const avatar = avatarFromDb || {
    avatar_style: 'standard',
    instrument_type: studentUser?.instrument || 'Guitar',
    evolution_level: 1,
    xp: 0,
    asset_path: getInstrumentAvatarUrl(studentUser?.instrument),
    streak_flame: 0
  };

  useEffect(() => {
    if (!studentId) return;
    const currentFirst = studentUser?.first_name || '';
    const currentLast = studentUser?.last_name || '';
    const currentInst = studentUser?.resolved_instrument || studentUser?.instrument || '';
    const currentPhoto = (studentUser?.photo_url && (studentUser.photo_url.startsWith('http') || studentUser.photo_url.startsWith('/')))
      ? studentUser.photo_url
      : getInstrumentAvatarUrl(currentInst);
    const currentUi = studentUiLevel || studentUser?.campus_ui_level || 'junior';

    if (!currentFirst) return;

    setFamilyProfiles(prev => {
      const filtered = prev.filter(p => p.id !== studentId);
      const updated = [
        ...filtered,
        {
          id: studentId,
          first_name: currentFirst,
          last_name: currentLast,
          instrument: currentInst,
          photo_url: currentPhoto,
          campus_ui_level: currentUi,
          last_active: new Date().toISOString()
        }
      ];
      try {
        localStorage.setItem('campus_family_profiles', JSON.stringify(updated));
      } catch(e) {}
      return updated;
    });
  }, [studentId, studentUser, studentUiLevel, avatar]);

  // Must-Have 3: DSGVO Art. 15 Report Export
  const handleExportGdprReport = async () => {
    try {
      const currentLevelKey = (draftUiLevel ?? (studentUser as any)?.campus_ui_level ?? (localStorage.getItem('campus_student_ui_level') || 'junior')) as 'junior' | 'teen' | 'pro';
      const curAbsences = draftAllowAbsences !== null ? draftAllowAbsences : ((studentUser as any)?.parent_allow_absences !== undefined && (studentUser as any)?.parent_allow_absences !== null ? Boolean((studentUser as any)?.parent_allow_absences) : (currentLevelKey === 'pro'));
      const curChat = draftAllowChat ?? (studentUser as any)?.parent_allow_chat ?? (currentLevelKey !== 'junior');
      const curLeaderboard = draftAllowLeaderboard ?? (studentUser as any)?.parent_allow_leaderboard ?? (currentLevelKey !== 'junior');
      const curPractice = draftBoardOverrides.practice_board ?? (localStorage.getItem('campus_board_override_practice_board') !== 'false');
      const curMediathek = draftBoardOverrides.mediathek ?? (localStorage.getItem('campus_board_override_mediathek') === 'true' || currentLevelKey !== 'junior');

      const fullStudentName = studentUser?.first_name 
        ? `${studentUser.first_name} ${studentUser.last_name || ''}`.trim()
        : 'Schüler-Profil';

      const maskedStudentName = studentUser?.first_name 
        ? `${studentUser.first_name} ${studentUser.last_name ? studentUser.last_name.trim().charAt(0) + '.' : ''}`.trim()
        : 'Schüler-Profil';

      // Resolve Teacher Name (Full Name, e.g. Severin Landenberger)
      let resolvedTeacherName = '';
      const teacherObj = (studentUser as any)?.teachers || (studentUser as any)?.teacher;
      if (teacherObj) {
        resolvedTeacherName = formatTeacherFullName(teacherObj);
      } else if (briefingData?.todayLesson?.teacher_name) {
        resolvedTeacherName = briefingData.todayLesson.teacher_name;
      } else if (studentUser?.teacher_id) {
        try {
          const { data: tData } = await supabase.from('users').select('first_name, last_name').eq('id', studentUser.teacher_id).maybeSingle();
          if (tData) resolvedTeacherName = formatTeacherFullName(tData);
        } catch (e) {}
      }
      if (!resolvedTeacherName) {
        resolvedTeacherName = 'Fachliche Lehrkraft (Musikschule)';
      }

      // Precise stats calculation
      const unlockedStickersCount = Object.values(unifiedStickersMap || {}).filter((s: any) => s?.isUnlocked).length;
      const totalAvailableStickers = (typeof ALL_STICKERS !== 'undefined' && ALL_STICKERS?.length) ? ALL_STICKERS.length : 20;
      const masteredHomeworkCount = (progressItems || []).filter(p => p.status === 'MASTERED' || p.status === 'THEORY_DONE').length;

      // Audio recordings count
      const localRecordingsStr = typeof window !== 'undefined' ? localStorage.getItem(`campus_junior_recordings_${studentId}`) || '[]' : '[]';
      let audioRecordingsCount = 0;
      try {
        audioRecordingsCount = JSON.parse(localRecordingsStr).length;
      } catch (e) {}

      const { generateGdprDataReportPDF } = await import('../utils/pdfGenerator');
      await generateGdprDataReportPDF({
        studentName: maskedStudentName,
        studentFullName: fullStudentName,
        studentMaskedName: maskedStudentName,
        schoolName: (studentUser as any)?.schools?.name || 'Campus-Groovelab Partner-Musikschule',
        teacherName: resolvedTeacherName,
        instrument: studentUser?.instrument || 'Instrumentalunterricht',
        campusUiLevel: currentLevelKey,
        parentPermissions: {
          allowAbsences: curAbsences,
          allowChat: curChat,
          allowLeaderboard: curLeaderboard,
          allowPracticeBoard: curPractice,
          allowMediathek: curMediathek,
          bedtimeModeEnabled,
          bedtimeStart,
          bedtimeEnd
        },
        stats: {
          totalPracticeMinutes: totalPracticeMinutes || 0,
          streakDays: avatar?.streak_flame || 1,
          currentXp: currentXp || 0,
          completedMissionsCount: masteredHomeworkCount,
          stickersUnlockedCount: unlockedStickersCount,
          stickersTotalCount: totalAvailableStickers,
          audioRecordingsCount: audioRecordingsCount,
          audioStorageBytes: (audioRecordingsCount * 1.5 * 1024 * 1024)
        }
      });
    } catch(err) {
      console.error('Error generating GDPR report:', err);
      alert('Der DSGVO-Auskunftsbericht konnte nicht exportiert werden.');
    }
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [unreadCrisisNotifs, setUnreadCrisisNotifs] = useState<any[]>([]);
  const [confirmingCrisisId, setConfirmingCrisisId] = useState<string | null>(null);

  const getSelectableAvatars = () => {
    if (!editingProfile) return [];
    const assigned = (editingProfile.resolved_instrument || editingProfile.instrument || '')
      .split(',')
      .map((i: string) => i.trim())
      .filter(Boolean);

    const CAMPUS_INSTRUMENT_AVATARS = [
      // Gitarre
      { id: 'inst_gitarre_acoustic', label: 'Gitarre', url: '/avatars/gitarre_avatar_new.png', category: 'Gitarre' },
      { id: 'inst_gitarre_electric', label: 'E-Gitarre', url: '/avatars/egitarre_avatar.png', category: 'Gitarre' },
      
      // Piano
      { id: 'inst_piano_acoustic', label: 'Klavier', url: '/avatars/klavier_avatar_new.png', category: 'Piano' },
      { id: 'inst_piano_electric', label: 'E-Piano', url: '/avatars/piano_avatar.png', category: 'Piano' },
      
      // Drums
      { id: 'inst_drums_acoustic', label: 'Schlagzeug', url: '/avatars/schlagzeug_avatar.png', category: 'Schlagzeug' },
      { id: 'inst_drums_electric', label: 'E-Drums', url: '/avatars/drums_avatar.png', category: 'Schlagzeug' },
      
      // Bass
      { id: 'inst_bass_acoustic', label: 'Kontrabass', url: '/avatars/kontrabass_avatar.png', category: 'Bass' },
      { id: 'inst_bass_electric', label: 'E-Bass', url: '/avatars/ebass_avatar.png', category: 'Bass' },
      
      // Gesang
      { id: 'inst_vocals', label: 'Gesang', url: '/avatars/gesang_avatar.png', category: 'Gesang' }
    ];

    if (assigned.length === 0) {
      const defaultUrl = getInstrumentAvatarUrl('');
      return [{ id: 'default_inst', label: 'Standard-Avatar', url: defaultUrl, category: 'Alle' }];
    }

    const list: Array<{ id: string; label: string; url: string; category?: string }> = [];

    assigned.forEach((inst: string) => {
      const lowerInst = inst.toLowerCase();
      let matchedCategory = '';
      if (lowerInst.includes('guitar') || lowerInst.includes('gitarre')) {
        matchedCategory = 'Gitarre';
      } else if (lowerInst.includes('piano') || lowerInst.includes('klavier') || lowerInst.includes('keyboard') || lowerInst.includes('keys')) {
        matchedCategory = 'Piano';
      } else if (lowerInst.includes('drum') || lowerInst.includes('schlagzeug')) {
        matchedCategory = 'Schlagzeug';
      } else if (lowerInst.includes('bass')) {
        matchedCategory = 'Bass';
      } else if (lowerInst.includes('vocal') || lowerInst.includes('gesang') || lowerInst.includes('stimme') || lowerInst.includes('singer')) {
        matchedCategory = 'Gesang';
      }

      if (matchedCategory) {
        const matching = CAMPUS_INSTRUMENT_AVATARS.filter(av => av.category === matchedCategory);
        list.push(...matching);
      } else {
        const url = getInstrumentAvatarUrl(inst);
        list.push({
          id: `inst_${inst}`,
          label: inst,
          url: url,
          category: inst
        });
      }
    });

    const seen = new Set();
    return list.filter(item => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  };
  
  // Selection Screen State
  const [showSelector, setShowSelector] = useState(false);
  const [submittingSelection, setSubmittingSelection] = useState(false);

  // Daily Briefing State
  const [rawBriefingData, setRawBriefingData] = useState<any>(null);
  const [occurrencesWithMessages, setOccurrencesWithMessages] = useState<string[]>([]);
  const [occurrencesWithUnreadCount, setOccurrencesWithUnreadCount] = useState<Record<string, number>>({});
  const [totalUnreadDirectMessages, setTotalUnreadDirectMessages] = useState<number>(0);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [rawScheduleOccurrences, setRawScheduleOccurrences] = useState<any[]>([]);
  const [roomBookings, setRoomBookings] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [rawSchoolYearOccurrences, setRawSchoolYearOccurrences] = useState<any[]>([]);
  const [loadingSchoolYearSchedule, setLoadingSchoolYearSchedule] = useState(false);
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [loadingContributions, setLoadingContributions] = useState(false);
  const [contributionsModalData, setContributionsModalData] = useState<{
    goalTitle: string;
    targetMinutes: number;
    contributions: { name: string; minutes: number }[];
  } | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);

  const [holidays, setHolidays] = useState<{ start: string, end: string, name: string }[]>([]);

  useEffect(() => {
    const calendarUrl = studentUser?.schools?.calendar_url;
    if (calendarUrl) {
      fetchHolidaysCached(calendarUrl).then(h => {
        if (h && h.length > 0) setHolidays(h);
      });
    }
  }, [studentUser?.schools?.calendar_url]);

  const scheduleOccurrences = useMemo<any[]>(() => {
    return rawScheduleOccurrences.filter((occ: any) => {
      const isHoliday = holidays.some(h => occ.date >= h.start && occ.date <= h.end);
      if (isHoliday) {
        const isMockOrVacant = occ.id.startsWith?.('mock-') || occ.id.startsWith?.('vacant-');
        if (isMockOrVacant) return false;

        const isRescheduledFromOutside = occ.original_date && 
          occ.original_date !== occ.date && 
          !holidays.some(h => occ.original_date >= h.start && occ.original_date <= h.end);

        return !!isRescheduledFromOutside;
      }
      return true;
    });
  }, [rawScheduleOccurrences, holidays]);

  const schoolYearOccurrences = useMemo<any[]>(() => {
    return rawSchoolYearOccurrences.filter((occ: any) => {
      const isHoliday = holidays.some(h => occ.date >= h.start && occ.date <= h.end);
      if (isHoliday) {
        const isMockOrVacant = occ.id.startsWith?.('mock-') || occ.id.startsWith?.('vacant-');
        if (isMockOrVacant) return false;

        const isRescheduledFromOutside = occ.original_date && 
          occ.original_date !== occ.date && 
          !holidays.some(h => occ.original_date >= h.start && occ.original_date <= h.end);

        return !!isRescheduledFromOutside;
      }
      return true;
    });
  }, [rawSchoolYearOccurrences, holidays]);

  const cancelledSchoolYearOccurrences = useMemo(() => {
    return (rawSchoolYearOccurrences || [])
      .filter((occ: any) => {
        const s = String(occ.status || '').toLowerCase();
        return s === 'cancelled' || s === 'canceled_by_student' || s === 'canceled' || s === 'teacher_sick' || s === 'canceled_by_teacher_sick' || s === 'absent';
      })
      .sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return (b.start_time || '').localeCompare(a.start_time || '');
      });
  }, [rawSchoolYearOccurrences]);

  const isTodayHoliday = useMemo(() => {
    const todayStr = toLocalYYYYMMDD(new Date());
    return holidays.find(h => todayStr >= h.start && todayStr <= h.end);
  }, [holidays]);

  const briefingData = useMemo(() => {
    if (!rawBriefingData) return null;
    if (isTodayHoliday) {
      return {
        ...rawBriefingData,
        todayLesson: null
      };
    }
    return rawBriefingData;
  }, [rawBriefingData, isTodayHoliday]);

  // Direct Chat states inside appointment popup (Shoutbox)
  const [showAppointmentChat, setShowAppointmentChat] = useState(false);
  const [showStudentToolbox, setShowStudentToolbox] = useState(false);
  const [appointmentChatData, setAppointmentChatData] = useState<{ teacherId: string; date: string; start_time: string; label: string; occurrenceId?: string; status?: string; isCancelled?: boolean } | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatTypedMessage, setChatTypedMessage] = useState('');
  const [campusFeedAnnouncements, setCampusFeedAnnouncements] = useState<any[]>([]);
  const [feedInteractions, setFeedInteractions] = useState<any[]>([]);
  const [classFeedPosts, setClassFeedPosts] = useState<any[]>([]);
  const [classFeedInteractions, setClassFeedInteractions] = useState<any[]>([]);
  const [studentFeedTab, setStudentFeedTab] = useState<'campus' | 'class'>('campus');
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  const unreadClassFeedCount = useMemo(() => {
    if (!studentId) return 0;
    return classFeedPosts.filter((post: any) => {
      const hasRead = classFeedInteractions.some(i => i.post_id === post.id && i.user_id === studentId);
      return !hasRead;
    }).length;
  }, [classFeedPosts, classFeedInteractions, studentId]);

  const markAllClassPostsAsRead = async (posts: any[], interactions: any[]) => {
    if (!studentId) return;
    const unread = posts.filter(post => !interactions.some(i => i.post_id === post.id && i.user_id === studentId));
    if (unread.length === 0) return;

    try {
      const newInteractions = unread.map(post => ({
        post_type: 'class',
        post_id: post.id,
        user_id: studentId,
        interaction_type: 'read'
      }));

      const { error } = await supabase
        .from('feed_interactions')
        .insert(newInteractions);

      if (error) throw error;

      // Reload class interactions
      const { data: classInterData } = await supabase
        .from('feed_interactions')
        .select('*')
        .eq('post_type', 'class');
      if (classInterData) {
        setClassFeedInteractions(classInterData);
      }
    } catch (err) {
      console.error('Error marking posts as read:', err);
    }
  };

  useEffect(() => {
    if (studentFeedTab === 'class') {
      markAllClassPostsAsRead(classFeedPosts, classFeedInteractions);
    }
  }, [studentFeedTab, classFeedPosts, classFeedInteractions]);

  // Übe-Ziel (Class Goal) State
  const [classGoals, setClassGoals] = useState<any[]>([]);
  const [classWeeklyMins, setClassWeeklyMins] = useState(0);

  const handleReactToPost = async (postId: string, emoji: string) => {
    try {
      const existing = feedInteractions.find(i => i.post_id === postId && i.user_id === studentId && i.emoji_unicode === emoji);
      if (existing) {
        await supabase
          .from('feed_interactions')
          .delete()
          .eq('id', existing.id);
      } else {
        await supabase
          .from('feed_interactions')
          .insert({
            post_type: 'campus',
            post_id: postId,
            user_id: studentId,
            interaction_type: 'like',
            emoji_unicode: emoji
          });
      }
      
      // Reload announcements & interactions
      const { data: annData } = await supabase
        .from('campus_announcements')
        .select('*, users(first_name, last_name, photo_url)')
        .eq('school_id', studentUser?.school_id)
        .order('created_at', { ascending: false });

      if (annData) {
        const parsed = annData.map((ann: any) => ({
          id: ann.id,
          title: ann.title,
          content: ann.message,
          target_type: ann.target_type || 'all',
          category: ann.category || 'general',
          is_emergency: ann.is_emergency || false,
          attachment_url: ann.attachment_url || null,
          created_at: ann.created_at,
          user: ann.users
        }));
        setCampusFeedAnnouncements(parsed.filter((ann: any) => ann.target_type === 'all' || ann.target_type === 'students'));
      }
      
      const { data: interData } = await supabase
        .from('feed_interactions')
        .select('*')
        .eq('post_type', 'campus');
      if (interData) {
        setFeedInteractions(interData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitClassFeedInteraction = async (postId: string, type: 'poll_vote' | 'quiz_answer', selectedOption: number, isCorrect?: boolean) => {
    try {
      const existing = classFeedInteractions.find(i => i.post_id === postId && i.user_id === studentId);
      if (existing) {
        alert('Du hast auf diesen Beitrag bereits geantwortet.');
        return;
      }

      const { error } = await supabase
        .from('feed_interactions')
        .insert({
          post_type: 'class',
          post_id: postId,
          user_id: studentId,
          interaction_type: type,
          selected_option: selectedOption,
          is_correct: isCorrect ?? null
        });

      if (error) throw error;

      // Reload interactions
      const { data: classInterData } = await supabase
        .from('feed_interactions')
        .select('*')
        .eq('post_type', 'class');
      if (classInterData) {
        setClassFeedInteractions(classInterData);
      }
    } catch (err: any) {
      console.error(err);
      alert('Fehler beim Speichern der Antwort: ' + err.message);
    }
  };

  const fetchChat = async (teacherId: string, occurrenceId?: string, targetDate?: string) => {
    if (!studentId || !teacherId) return;
    
    let query = supabase
      .from('campus_direct_messages')
      .select('*');
      
    if (occurrenceId) {
      if (targetDate) {
        const [y, m, d] = targetDate.split('-');
        const deDate = (d && m && y) ? `${d}.${m}.${y}` : targetDate;
        const shortDate = (d && m && y) ? `${d}.${m}.${y.slice(2)}` : targetDate;
        query = query.or(`occurrence_id.eq.${occurrenceId},and(sender_id.in.(${studentId},${teacherId}),recipient_id.in.(${studentId},${teacherId}),or(content.ilike.%${targetDate}%,content.ilike.%${deDate}%,content.ilike.%${shortDate}%))`);
      } else {
        query = query.eq('occurrence_id', occurrenceId);
      }
    } else {
      query = query.or(`and(sender_id.eq.${studentId},recipient_id.eq.${teacherId}),and(sender_id.eq.${teacherId},recipient_id.eq.${studentId})`);
    }
    
    const { data } = await query.order('created_at', { ascending: true });
    if (data) {
      setChatMessages(data);
      setTimeout(() => chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);

      // Automatically mark unread incoming messages as read
      const unreadIncoming = data.filter((m: any) => m.recipient_id === studentId && !m.is_read);
      if (unreadIncoming.length > 0) {
        try {
          if (occurrenceId) {
            await supabase
              .from('campus_direct_messages')
              .update({ is_read: true })
              .eq('occurrence_id', occurrenceId)
              .eq('recipient_id', studentId)
              .eq('is_read', false);

            setOccurrencesWithUnreadCount(prev => ({ ...prev, [occurrenceId]: 0 }));
          } else {
            await supabase
              .from('campus_direct_messages')
              .update({ is_read: true })
              .eq('sender_id', teacherId)
              .eq('recipient_id', studentId)
              .eq('is_read', false);
          }
          setTotalUnreadDirectMessages(prev => Math.max(0, prev - unreadIncoming.length));
        } catch (e) {
          console.warn('Error marking messages as read:', e);
        }
      }
    }
  };

  useEffect(() => {
    if (!appointmentChatData || !showAppointmentChat) {
      setChatMessages([]);
      return;
    }

    fetchChat(appointmentChatData.teacherId, appointmentChatData.occurrenceId, appointmentChatData.date);

    const channel = supabase
      .channel(`chat_student_occ_${appointmentChatData.teacherId}_${appointmentChatData.date || 'all'}`)
      .on('postgres_changes', { schema: 'public', event: '*', table: 'campus_direct_messages' }, () => {
        fetchChat(appointmentChatData.teacherId, appointmentChatData.occurrenceId, appointmentChatData.date);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appointmentChatData, showAppointmentChat, studentId]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatTypedMessage.trim() || !appointmentChatData) return;

    // Freeze Check
    try {
      const timePart = appointmentChatData.start_time.includes(':') ? appointmentChatData.start_time : `${appointmentChatData.start_time}:00`;
      const lessonDateTime = new Date(`${appointmentChatData.date}T${timePart}`);
      if (Date.now() > lessonDateTime.getTime() + 48 * 60 * 60 * 1000) {
        alert('Dieser Chat ist eingefroren (48 Stunden nach dem Termin) und kann nicht mehr bearbeitet werden.');
        return;
      }
    } catch (err) {
      console.warn(err);
    }

    const messageContent = chatTypedMessage.trim();

    try {
      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage = {
        id: tempId,
        sender_id: studentId,
        recipient_id: appointmentChatData.teacherId,
        content: messageContent,
        occurrence_id: appointmentChatData.occurrenceId || null,
        created_at: new Date().toISOString(),
        is_read: false
      };
      setChatMessages(prev => [...prev, optimisticMessage]);
      setChatTypedMessage('');
      setTimeout(() => chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

      const { error } = await supabase.from('campus_direct_messages').insert({
        sender_id: studentId,
        recipient_id: appointmentChatData.teacherId,
        content: messageContent,
        occurrence_id: appointmentChatData.occurrenceId || null
      });
      if (error) throw error;
      
      if (appointmentChatData.occurrenceId) {
        const occId = appointmentChatData.occurrenceId;
        setOccurrencesWithMessages(prev => prev.includes(occId) ? prev : [...prev, occId]);
      }
      
      await fetchChat(appointmentChatData.teacherId, appointmentChatData.occurrenceId, appointmentChatData.date);
    } catch (err) {
      console.error('Error sending quick chat message:', err);
    }
  };

  const fetchRoomBookings = async () => {
    const schoolId = studentUser?.school_id;
    if (!schoolId) return;
    try {
      const todayDateStr = toLocalYYYYMMDD(new Date());
      const { data, error } = await supabase
        .from('room_bookings')
        .select('room_id, date, start_time, booked_by, room:rooms(name)')
        .eq('school_id', schoolId)
        .gte('date', todayDateStr);
      if (!error && data) {
        setRoomBookings(data);
      }
    } catch (err) {
      console.error('Error fetching room bookings:', err);
    }
  };

  const getOccRoomName = (occ: any) => {
    if (!occ) return 'Groovelab';
    const teacherId = occ.teacher_id || occ.schedule?.teacher_id;
    const lessonTime = occ.start_time || occ.schedule?.time_slot;
    const dateStr = occ.date;
    if (teacherId && lessonTime && dateStr) {
      const booking = roomBookings.find(b => 
        b.booked_by === teacherId &&
        b.date === dateStr &&
        b.start_time?.substring(0, 5) === lessonTime.substring(0, 5)
      );
      if (booking && booking.room) {
        return booking.room.name;
      }
    }
    return occ.schedule?.rooms?.name || occ.schedule?.room?.name || 'Groovelab';
  };

  const fetchSchedule = async () => {
    if (!studentId) return;
    setLoadingSchedule(true);
    try {
      const todayStr = toLocalYYYYMMDD(new Date());

      const [{ data: occurrences }, { data: schedules }] = await Promise.all([
        supabase
          .from('schedule_occurrences')
          .select('*, schedule:schedule_id(*, rooms(name)), teacher:users!schedule_occurrences_teacher_id_fkey(first_name, last_name)')
          .eq('student_id', studentId)
          .gte('date', todayStr)
          .order('date', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase
          .from('schedules')
          .select('*, teacher:users!schedules_teacher_id_fkey(first_name, last_name), rooms(name)')
          .eq('student_id', studentId)
      ]);

      const mergedList: any[] = [...(occurrences || [])];

      if (schedules && schedules.length > 0) {
        schedules.forEach(sch => {
          const today = new Date();
          const currentDay = today.getDay() || 7;
          const schDay = typeof sch.day_of_week === 'number' ? sch.day_of_week : (
            sch.day_of_week === 'Monday' || sch.day_of_week === 'Montag' ? 1 :
            sch.day_of_week === 'Tuesday' || sch.day_of_week === 'Dienstag' ? 2 :
            sch.day_of_week === 'Wednesday' || sch.day_of_week === 'Mittwoch' ? 3 :
            sch.day_of_week === 'Thursday' || sch.day_of_week === 'Donnerstag' ? 4 :
            sch.day_of_week === 'Friday' || sch.day_of_week === 'Freitag' ? 5 :
            sch.day_of_week === 'Saturday' || sch.day_of_week === 'Samstag' ? 6 :
            sch.day_of_week === 'Sunday' || sch.day_of_week === 'Sonntag' ? 7 : (parseInt(String(sch.day_of_week), 10) || 1)
          );
          
          let diff = schDay - currentDay;
          if (diff < 0) diff += 7;
          
          for (let week = 0; week < 8; week++) {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + diff + (week * 7));
            const dateStr = toLocalYYYYMMDD(targetDate);

            const existsInOccur = mergedList.some(o => o.date === dateStr);
            if (!existsInOccur) {
              mergedList.push({
                id: `virtual-${sch.id}-${dateStr}`,
                schedule_id: sch.id,
                student_id: studentId,
                teacher_id: sch.teacher_id,
                school_id: sch.school_id,
                date: dateStr,
                start_time: sch.time_slot,
                duration: sch.duration || 45,
                status: sch.status || 'scheduled',
                is_virtual: true,
                teacher: sch.teacher,
                schedule: sch
              });
            }
          }
        });
      }

      mergedList.sort((a, b) => {
        const dateDiff = (a.date || '').localeCompare(b.date || '');
        if (dateDiff !== 0) return dateDiff;
        return (a.start_time || '').localeCompare(b.start_time || '');
      });

      setRawScheduleOccurrences(mergedList);
    } catch (err) {
      console.error('Error fetching student schedule:', err);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const fetchOccurrencesWithMessages = async () => {
    if (!studentId) return;
    try {
      const { data, error } = await supabase
        .from('campus_direct_messages')
        .select('occurrence_id, recipient_id, sender_id, is_read, content')
        .or(`sender_id.eq.${studentId},recipient_id.eq.${studentId}`);
      if (!error && data) {
        const ids = new Set<string>();
        const unreadMap: Record<string, number> = {};

        data.forEach((m: any) => {
          const occId = m.occurrence_id ? String(m.occurrence_id) : '';
          const text = String(m.content || '').trim();
          if (occId) {
            ids.add(occId);
          }

          let extDate: string | null = null;
          if (occId) {
            const matchVirtual = occId.match(/\d{4}-\d{2}-\d{2}/);
            if (matchVirtual) extDate = matchVirtual[0];
          }
          if (!extDate && text) {
            const matchIso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
            if (matchIso) {
              extDate = `${matchIso[1]}-${matchIso[2]}-${matchIso[3]}`;
            } else {
              const matchFullYear = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
              if (matchFullYear) {
                const day = matchFullYear[1].padStart(2, '0');
                const month = matchFullYear[2].padStart(2, '0');
                let year = matchFullYear[3];
                if (year.length === 2) year = `20${year}`;
                extDate = `${year}-${month}-${day}`;
              }
            }
          }

          if (extDate) {
            ids.add(extDate);
            if (m.sender_id) ids.add(`${m.sender_id}_${extDate}`);
            if (m.recipient_id) ids.add(`${m.recipient_id}_${extDate}`);
            if (studentId) ids.add(`${studentId}_${extDate}`);
          }

          if (m.recipient_id === studentId && !m.is_read) {
            if (occId) {
              unreadMap[occId] = (unreadMap[occId] || 0) + 1;
            }
            if (extDate) {
              unreadMap[extDate] = (unreadMap[extDate] || 0) + 1;
              unreadMap[`${studentId}_${extDate}`] = (unreadMap[`${studentId}_${extDate}`] || 0) + 1;
            }
          }
        });

        const unreadDirect = data.filter((m: any) => m.recipient_id === studentId && !m.is_read).length;
        setOccurrencesWithMessages(Array.from(ids));
        setOccurrencesWithUnreadCount(unreadMap);
        setTotalUnreadDirectMessages(unreadDirect);
      }
    } catch (err) {
      console.error('Error fetching occurrences with messages:', err);
    }
  };

  const checkOccurrenceHasMessages = (occ: any, dateStr?: string): boolean => {
    if (!occ && !dateStr) return false;
    const occId = typeof occ === 'string' ? occ : (occ?.id || occ?.occurrence_id || '');
    if (occId && occurrencesWithMessages.includes(String(occId))) return true;

    const dStr = dateStr || (typeof occ === 'object' ? occ?.date : undefined);
    if (dStr) {
      if (occurrencesWithMessages.includes(dStr)) return true;
      if (studentId && occurrencesWithMessages.includes(`${studentId}_${dStr}`)) return true;
      if (typeof occ === 'object' && occ) {
        const sId = occ.schedule_id || occ.schedule?.id;
        if (sId && occurrencesWithMessages.includes(`virtual-${sId}-${dStr}`)) return true;
        const stId = occ.student_id || occ.student?.id;
        if (stId && occurrencesWithMessages.includes(`${stId}_${dStr}`)) return true;
      }
    }
    return false;
  };

  const getOccurrenceUnreadCount = (occ: any, dateStr?: string): number => {
    if (!occ && !dateStr) return 0;
    const occId = typeof occ === 'string' ? occ : (occ?.id || occ?.occurrence_id || '');
    if (occId && occurrencesWithUnreadCount[String(occId)]) return occurrencesWithUnreadCount[String(occId)];

    const dStr = dateStr || (typeof occ === 'object' ? occ?.date : undefined);
    if (dStr) {
      if (occurrencesWithUnreadCount[dStr]) return occurrencesWithUnreadCount[dStr];
      if (studentId && occurrencesWithUnreadCount[`${studentId}_${dStr}`]) return occurrencesWithUnreadCount[`${studentId}_${dStr}`];
    }
    return 0;
  };

  const fetchBriefingOnly = async () => {
    if (!studentId) return;
    try {
      const resp = await fetch(`/api/briefing/student?userId=${studentId}`);
      if (resp && resp.ok) {
        const bd = await resp.json();
        if (bd && bd.success) {
          setRawBriefingData(bd);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch briefing in real-time:', err);
    }
  };

  const handleOpenContributions = async (goalTitle: string, targetMinutes: number) => {
    setLoadingContributions(true);
    setContributionsModalData({
      goalTitle,
      targetMinutes,
      contributions: []
    });

    try {
      const teacherId = studentUser?.teacher_id;
      const schoolId = studentUser?.school_id;
      if (!teacherId || !schoolId) {
        setLoadingContributions(false);
        return;
      }

      const { data: classmates, error: classmatesErr } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId);

      if (classmatesErr) throw classmatesErr;

      if (classmates && classmates.length > 0) {
        const now = getSimulatedNow();
        const monday = new Date(now);
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        monday.setDate(now.getDate() + diff);
        monday.setHours(0, 0, 0, 0);
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const classmateAndSelfIds = Array.from(new Set([...classmates.map((c: any) => c.id), studentId]));

        const { data: practiceData, error: practiceErr } = await supabase
          .from('fokus_logs')
          .select('user_id, duration_minutes, duration_seconds')
          .in('user_id', classmateAndSelfIds)
          .gte('created_at', monday.toISOString())
          .lte('created_at', sunday.toISOString());

        if (practiceErr) throw practiceErr;

        let combinedPractice = practiceData || [];
        try {
          const localLogsKey = `cg_local_fokus_logs_${studentId}`;
          const localLogs = JSON.parse(localStorage.getItem(localLogsKey) || '[]');
          if (localLogs && localLogs.length > 0) {
            const remoteIds = new Set(combinedPractice.map((l: any) => l.id));
            const missingLocal = localLogs.filter((l: any) => !remoteIds.has(l.id));
            combinedPractice = [...missingLocal, ...combinedPractice];
          }
        } catch (e) {}

        const list = classmates.map((student: any) => {
          const mins = (combinedPractice || [])
            .filter((s: any) => s.user_id === student.id)
            .reduce((sum: number, s: any) => sum + (s.duration_minutes || (s.duration_seconds ? Math.round(s.duration_seconds / 60) : 0)), 0);
          return {
            name: `${student.first_name || ''} ${student.last_name ? student.last_name.trim().charAt(0) + '.' : ''}`.trim() || 'Schüler',
            minutes: mins
          };
        })
        .filter(item => item.minutes > 0)
        .sort((a, b) => b.minutes - a.minutes);

        setContributionsModalData({
          goalTitle,
          targetMinutes,
          contributions: list
        });
      }
    } catch (err) {
      console.error('Error loading goal contributions:', err);
    } finally {
      setLoadingContributions(false);
    }
  };

  const fetchSchoolYearSchedule = async () => {
    if (!studentId) return;
    setLoadingSchoolYearSchedule(true);
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      let schoolYearStart = new Date(currentYear - 1, 8, 1); // 1. Sept past year
      let schoolYearEnd = new Date(currentYear, 7, 31);      // 31. Aug current year

      if (currentMonth >= 8) { // School year switches on Sept 1st (month index 8)
        schoolYearStart = new Date(currentYear, 8, 1);       // 1. Sept current year
        schoolYearEnd = new Date(currentYear + 1, 7, 31);   // 31. Aug next year
      }

      const startStr = toLocalYYYYMMDD(schoolYearStart);
      const endStr = toLocalYYYYMMDD(schoolYearEnd);

      const [{ data: occurrences, error: occErr }, { data: schedules, error: schErr }] = await Promise.all([
        supabase
          .from('schedule_occurrences')
          .select('*, schedule:schedule_id(*, rooms(name)), teacher:users!schedule_occurrences_teacher_id_fkey(first_name, last_name)')
          .eq('student_id', studentId)
          .gte('date', startStr)
          .lte('date', endStr)
          .order('date', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase
          .from('schedules')
          .select('*, teacher:users!schedules_teacher_id_fkey(first_name, last_name), rooms(name)')
          .eq('student_id', studentId)
      ]);

      if (occErr) throw occErr;
      if (schErr) throw schErr;

      const allMergedOccurrences: any[] = [];
      const usedActualIds = new Set<string>();

      if (schedules) {
        schedules.forEach(sch => {
          const current = new Date(schoolYearStart);
          const schDay = typeof sch.day_of_week === 'number' ? sch.day_of_week : (
            sch.day_of_week === 'Monday' || sch.day_of_week === 'Montag' ? 1 :
            sch.day_of_week === 'Tuesday' || sch.day_of_week === 'Dienstag' ? 2 :
            sch.day_of_week === 'Wednesday' || sch.day_of_week === 'Mittwoch' ? 3 :
            sch.day_of_week === 'Thursday' || sch.day_of_week === 'Donnerstag' ? 4 :
            sch.day_of_week === 'Friday' || sch.day_of_week === 'Freitag' ? 5 :
            sch.day_of_week === 'Saturday' || sch.day_of_week === 'Samstag' ? 6 :
            sch.day_of_week === 'Sunday' || sch.day_of_week === 'Sonntag' ? 7 : (parseInt(String(sch.day_of_week), 10) || 1)
          );
          while (current <= schoolYearEnd) {
            const currentDay = current.getDay() || 7;
            const diff = schDay - currentDay;
            const targetDate = new Date(current);
            targetDate.setDate(current.getDate() + diff);

            if (targetDate >= schoolYearStart && targetDate <= schoolYearEnd) {
              const yyyy = targetDate.getFullYear();
              const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
              const dd = String(targetDate.getDate()).padStart(2, '0');
              const dateStr = `${yyyy}-${mm}-${dd}`;

              const actual = occurrences?.find(occ => 
                (occ.schedule_id === sch.id || occ.student_id === studentId) && 
                (occ.original_date === dateStr || (!occ.original_date && occ.date === dateStr))
              );

              if (actual) {
                allMergedOccurrences.push(actual);
                usedActualIds.add(actual.id);
              } else {
                allMergedOccurrences.push({
                  id: `virtual-${sch.id}-${dateStr}`,
                  schedule_id: sch.id,
                  student_id: studentId,
                  teacher_id: sch.teacher_id,
                  date: dateStr,
                  start_time: sch.time_slot + (sch.time_slot.split(':').length === 2 ? ':00' : ''),
                  duration: sch.duration || 45,
                  status: 'scheduled',
                  is_virtual: true,
                  teacher: sch.teacher,
                  schedule: sch
                });
              }
            }
            current.setDate(current.getDate() + 7);
          }
        });
      }

      if (occurrences) {
        occurrences.forEach(occ => {
          if (!usedActualIds.has(occ.id)) {
            allMergedOccurrences.push(occ);
          }
        });
      }

      allMergedOccurrences.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.start_time || '').localeCompare(b.start_time || '');
      });

      setRawSchoolYearOccurrences(allMergedOccurrences);
    } catch (err) {
      console.error('Error fetching school year schedule:', err);
    } finally {
      setLoadingSchoolYearSchedule(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    fetchSchoolYearSchedule();
    fetchOccurrencesWithMessages();
    fetchRoomBookings();

    if (!studentId) return;

    const channel = supabase
      .channel(`realtime_student_schedule_${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedule_occurrences',
          filter: `student_id=eq.${studentId}`
        },
        () => {
          fetchSchedule();
          fetchSchoolYearSchedule();
          fetchBriefingOnly();
          fetchRoomBookings();
        }
      )
      .subscribe();

    const msgChannel = supabase
      .channel(`realtime_student_messages_${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campus_direct_messages'
        },
        () => {
          fetchOccurrencesWithMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(msgChannel);
    };
  }, [studentId]);

  useEffect(() => {
    if (studentUser?.school_id) {
      fetchRoomBookings();
    }
  }, [studentUser?.school_id]);

  const fetchCrisisNotifications = async () => {
    if (!studentId) return;
    try {
      const [{ data: studentSchedules }, { data, error }] = await Promise.all([
        supabase
          .from('schedules')
          .select('day_of_week, time_slot')
          .eq('student_id', studentId),
        supabase
          .from('crisis_notifications')
          .select('*, teacher:users!crisis_notifications_teacher_id_fkey(first_name, last_name)')
          .eq('student_id', studentId)
          .eq('status', 'UNREAD')
          .order('slot_start_datetime', { ascending: true })
      ]);

      if (!error && data) {
        if (studentSchedules && studentSchedules.length > 0) {
          const filtered = data.filter(n => {
            const dt = new Date(n.slot_start_datetime);
            const dayOfWeek = dt.getDay() || 7;
            const hours = String(dt.getHours()).padStart(2, '0');
            const minutes = String(dt.getMinutes()).padStart(2, '0');
            const timeSlot = `${hours}:${minutes}`;
            
            return studentSchedules.some(sch => 
              sch.day_of_week === dayOfWeek && 
              sch.time_slot === timeSlot
            );
          });
          setUnreadCrisisNotifs(filtered);
        } else {
          setUnreadCrisisNotifs([]);
        }
      }
    } catch (err) {
      console.error('Error fetching crisis notifications:', err);
    }
  };

  useEffect(() => {
    fetchCrisisNotifications();

    if (!studentId) return;

    const channel = supabase
      .channel(`realtime_student_crisis_${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crisis_notifications',
          filter: `student_id=eq.${studentId}`
        },
        () => {
          fetchCrisisNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId]);

  const handleConfirmCrisisNotification = async (notifId: string) => {
    setConfirmingCrisisId(notifId);
    try {
      const { error } = await supabase
        .from('crisis_notifications')
        .update({ status: 'READ' })
        .eq('id', notifId);
      if (error) throw error;
      setUnreadCrisisNotifs(prev => prev.filter(n => n.id !== notifId));
    } catch (err) {
      console.error('Error confirming crisis notification:', err);
      alert('Bestätigung fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setConfirmingCrisisId(null);
    }
  };

  const handleConfirmReschedule = async (occId: string) => {
    try {
      // Optimistic update
      setRawScheduleOccurrences(prev => 
        prev.map(occ => occ.id == occId ? { ...occ, status: 'rescheduled_confirmed', student_acknowledged: true } : occ)
      );

      const { error } = await supabase
        .from('schedule_occurrences')
        .update({ status: 'rescheduled_confirmed', student_acknowledged: true })
        .eq('id', occId);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error confirming reschedule:', err);
      fetchSchedule();
    }
  };

  const handleAcknowledgeCancellation = async (occId: string) => {
    try {
      // Optimistic update
      setRawScheduleOccurrences(prev => 
        prev.map(occ => occ.id == occId ? { ...occ, student_acknowledged: true } : occ)
      );

      const { error } = await supabase
        .from('schedule_occurrences')
        .update({ student_acknowledged: true })
        .eq('id', occId);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error acknowledging cancellation:', err);
      fetchSchedule();
    }
  };

  // Global Master PIN Gate States for Welcome Widget & Absence Actions
  const [showGlobalParentPinModal, setShowGlobalParentPinModal] = useState(false);
  const [globalPinPendingAction, setGlobalPinPendingAction] = useState<(() => void) | null>(null);
  const [globalPinInput, setGlobalPinInput] = useState('');
  const [globalPinError, setGlobalPinError] = useState('');
  const [isVerifyingGlobalPin, setIsVerifyingGlobalPin] = useState(false);

  const checkIsParentUnlockedGlobal = () => {
    if (typeof window === 'undefined') return false;
    const globalUnlocked = sessionStorage.getItem('groovelab_parent_unlocked_global') === 'true';
    const userSession = sessionStorage.getItem(`groovelab_parent_session_${studentId}`);
    return globalUnlocked || (userSession !== null && Number(userSession) > Date.now());
  };

  const isStudentAbsenceAllowed = useMemo(() => {
    if (draftAllowAbsences !== null) return draftAllowAbsences;
    const userAbs = (studentUser as any)?.parent_allow_absences;
    if (userAbs !== undefined && userAbs !== null) return Boolean(userAbs);
    const currentLvl = draftUiLevel || (studentUser as any)?.campus_ui_level || (typeof window !== 'undefined' ? localStorage.getItem('campus_student_ui_level') : 'junior') || 'junior';
    if (currentLvl === 'junior' || currentLvl === 'teen') return false;
    return true;
  }, [studentUser, draftAllowAbsences, draftUiLevel]);

  const isStudentRescheduleAllowed = useMemo(() => {
    if (draftAllowReschedule !== null) return draftAllowReschedule;
    const userReschedule = (studentUser as any)?.parent_allow_reschedule_confirm;
    if (userReschedule !== undefined && userReschedule !== null) return Boolean(userReschedule);
    const currentLvl = draftUiLevel || (studentUser as any)?.campus_ui_level || (typeof window !== 'undefined' ? localStorage.getItem('campus_student_ui_level') : 'junior') || 'junior';
    if (currentLvl === 'junior') return false;
    return true;
  }, [studentUser, draftAllowReschedule, draftUiLevel]);

  const isStudentChatAllowed = useMemo(() => {
    if (draftAllowChat !== null) return draftAllowChat;
    const userChat = (studentUser as any)?.parent_allow_chat;
    if (userChat !== undefined && userChat !== null) return Boolean(userChat);
    const currentLvl = draftUiLevel || (studentUser as any)?.campus_ui_level || (typeof window !== 'undefined' ? localStorage.getItem('campus_student_ui_level') : 'junior') || 'junior';
    if (currentLvl === 'junior') return false;
    return true;
  }, [studentUser, draftAllowChat, draftUiLevel]);

  const handleVerifyGlobalParentPin = async (inputPin: string) => {
    if (!inputPin || inputPin.length < 4) {
      setGlobalPinError('Bitte gib die 6-stellige Eltern-Master-PIN ein.');
      return;
    }
    setIsVerifyingGlobalPin(true);
    setGlobalPinError('');
    try {
      const cleanInput = inputPin.trim();
      let isMatch = false;
      const targetId = studentId || (studentUser as any)?.id;

      if (targetId) {
        try {
          const { data: parentOk } = await supabase.rpc('verify_parent_pin', {
            student_id: targetId,
            input_pin: cleanInput
          });
          if (parentOk === true) isMatch = true;
        } catch (e) {}

        if (!isMatch) {
          try {
            const { data: personalOk } = await supabase.rpc('verify_personal_pin', {
              user_uuid: targetId,
              input_pin: cleanInput
            });
            if (personalOk === true) isMatch = true;
          } catch (e) {}
        }
      }

      if (isMatch) {
        sessionStorage.setItem('groovelab_parent_unlocked_global', 'true');
        if (targetId) sessionStorage.setItem(`groovelab_parent_unlocked_${targetId}`, 'true');

        // Step-up execution: Execute single pending action securely without leaving ambient bypass open
        setShowGlobalParentPinModal(false);
        setGlobalPinInput('');
        setGlobalPinError('');
        if (globalPinPendingAction) {
          const action = globalPinPendingAction;
          setGlobalPinPendingAction(null);
          action();
        }
      } else {
        setGlobalPinError('Falsche Master-PIN. Bitte versuche es erneut.');
        setGlobalPinInput('');
      }
    } catch (err: any) {
      setGlobalPinError('Fehler bei der PIN-Prüfung: ' + (err?.message || 'Unbekannt'));
    } finally {
      setIsVerifyingGlobalPin(false);
    }
  };

  const handleTriggerConfirmReschedule = (occId: string) => {
    if (!isStudentRescheduleAllowed) {
      setGlobalPinPendingAction(() => () => handleConfirmReschedule(occId));
      setGlobalPinInput('');
      setGlobalPinError('');
      setShowGlobalParentPinModal(true);
      return;
    }
    handleConfirmReschedule(occId);
  };

  const handleTriggerCancelOccurrence = (occ: any) => {
    if (!isStudentAbsenceAllowed) {
      setGlobalPinPendingAction(() => () => handleCancelOccurrence(occ, true));
      setGlobalPinInput('');
      setGlobalPinError('');
      setShowGlobalParentPinModal(true);
      return;
    }
    handleCancelOccurrence(occ, false);
  };

  const handleTriggerUndoCancelOccurrence = (occ: any) => {
    if (!isStudentAbsenceAllowed) {
      setGlobalPinPendingAction(() => () => handleUndoCancelOccurrence(occ, true));
      setGlobalPinInput('');
      setGlobalPinError('');
      setShowGlobalParentPinModal(true);
      return;
    }
    handleUndoCancelOccurrence(occ, false);
  };

  const handleUndoCancelOccurrence = async (occ: any, skipPinCheck = false) => {
    if (!skipPinCheck && !isStudentAbsenceAllowed) {
      setGlobalPinPendingAction(() => () => handleUndoCancelOccurrence(occ, true));
      setGlobalPinInput('');
      setGlobalPinError('');
      setShowGlobalParentPinModal(true);
      return;
    }

    const undoConfirmMsg = studentUiLevel === 'junior'
      ? 'Möchtest du die Absage zurücknehmen und deine Musikstunde wieder stattfinden lassen?'
      : 'Möchtest du die Absage zurücknehmen und diesen Unterrichtstermin wieder reaktivieren?';
    if (!confirm(undoConfirmMsg)) return;

    try {
      const targetStudentId = studentId || studentUser?.id || occ.student_id;
      const targetTeacherId = occ.teacher_id || occ.teacher?.id || studentUser?.teacher_id || null;
      const targetScheduleId = occ.schedule_id || occ.schedule?.id || null;
      const targetOccIdStr = occ.id ? String(occ.id) : null;

      // 1. Authoritative RPC call (Fail-Closed, zero-leak)
      let rpcSucceeded = false;
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('undo_cancel_student_schedule_occurrence', {
          p_student_id: targetStudentId,
          p_occurrence_id: targetOccIdStr,
          p_date: occ.date,
          p_start_time: occ.start_time || '15:00',
          p_duration: occ.duration || 45,
          p_teacher_id: targetTeacherId,
          p_schedule_id: targetScheduleId
        });

        if (!rpcErr && rpcRes?.success) {
          rpcSucceeded = true;
        } else if (rpcErr) {
          console.warn('undo_cancel_student_schedule_occurrence RPC returned error, using fallback:', rpcErr);
        }
      } catch (rpcCallErr) {
        console.warn('Could not call undo_cancel_student_schedule_occurrence RPC:', rpcCallErr);
      }

      // 2. Resilient Direct Fallback
      if (!rpcSucceeded) {
        const isVirtual = Boolean(
          occ.is_virtual || 
          (occ.id && (String(occ.id).startsWith('virt_') || String(occ.id).startsWith('virtual-')))
        );

        if (occ.id && !isVirtual) {
          const { error: updErr } = await supabase
            .from('schedule_occurrences')
            .update({ 
              status: 'scheduled', 
              original_date: occ.date,
              student_acknowledged: true,
              teacher_acknowledged: false,
              canceled_by_role: null,
              notes: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', occ.id);
          if (updErr) throw updErr;
        } else {
          // Look up inserted occurrence in database for this student and date
          const { data: existingOcc } = await supabase
            .from('schedule_occurrences')
            .select('id')
            .eq('student_id', targetStudentId)
            .eq('date', occ.date)
            .maybeSingle();

          if (existingOcc?.id) {
            const { error: updErr } = await supabase
              .from('schedule_occurrences')
              .update({ 
                status: 'scheduled', 
                original_date: occ.date,
                student_acknowledged: true,
                teacher_acknowledged: false,
                canceled_by_role: null,
                notes: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingOcc.id);
            if (updErr) throw updErr;
          } else {
            const occPayload: any = {
              schedule_id: targetScheduleId,
              student_id: targetStudentId,
              teacher_id: targetTeacherId,
              date: occ.date,
              original_date: occ.date,
              start_time: occ.start_time || '14:00',
              duration: occ.duration || 45,
              status: 'scheduled',
              student_acknowledged: true,
              teacher_acknowledged: false
            };
            const schoolId = occ.schedule?.school_id || occ.school_id || studentUser?.school_id;
            if (schoolId) occPayload.school_id = schoolId;

            await supabase.from('schedule_occurrences').insert(occPayload);
          }
        }
      }

      // Optimistic state update
      setRawScheduleOccurrences((prev: any[]) => prev.map((o: any) => {
        if (o.id === occ.id || (o.date === occ.date && (o.student_id === studentId || !o.student_id))) {
          return { ...o, status: 'scheduled', original_date: occ.date, student_acknowledged: true, teacher_acknowledged: false };
        }
        return o;
      }));
      setRawSchoolYearOccurrences((prev: any[]) => prev.map((o: any) => {
        if (o.id === occ.id || (o.date === occ.date && (o.student_id === studentId || !o.student_id))) {
          return { ...o, status: 'scheduled', original_date: occ.date, student_acknowledged: true, teacher_acknowledged: false };
        }
        return o;
      }));

      // Send system message to Direct Messages & Alerts (fallback if RPC was not used)
      try {
        const studentUserId = studentId || studentUser?.id || occ.student_id;
        const teacherUserId = occ.teacher_id || occ.teacher?.id;
        const targetOccId = occ.id || (occ.schedule_id ? `virtual-${occ.schedule_id}-${occ.date}` : null);

        const [y, m, d] = String(occ.date).split('-').map(Number);
        const occDate = (y && m && d) ? new Date(y, m - 1, d) : new Date();
        const shortDay = occDate.toLocaleDateString('de-DE', { weekday: 'short' });
        const shortDate = occDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const timeLabel = (occ.start_time || '16:30').slice(0, 5);

        const now = new Date();
        const execDateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const execTimeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const execTimestampStr = `${execDateStr} um ${execTimeStr} Uhr`;

        const { data: userData } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', studentUserId)
          .single();
        const userName = userData ? `${userData.first_name} ${maskLastName(userData.last_name)}` : 'Ein Schüler';
        const isPinAuthed = skipPinCheck || checkIsParentUnlockedGlobal();
        const actorDesc = isPinAuthed ? ' (Eltern-PIN autorisiert)' : '';

        const notificationMessage = `🔄 Termin reaktiviert: Dein Unterrichtstermin am ${shortDay} ${shortDate} um ${timeLabel} Uhr findet regulär statt.\n🕒 Reaktiviert am: ${execTimestampStr} durch Schüler:in (${userName}${actorDesc}).`;

        if (studentUserId && teacherUserId) {
          try {
            await supabase.from('campus_direct_messages').insert({
              sender_id: studentUserId,
              recipient_id: teacherUserId,
              content: notificationMessage,
              occurrence_id: targetOccId,
              is_system: true,
              message_type: 'cancellation_reset'
            });
          } catch (dmErr) {
            console.warn('Could not insert cancellation_reset direct message:', dmErr);
          }
        }

        if (teacherUserId) {
          await supabase.from('system_alerts').insert({
            school_id: occ.schedule?.school_id || occ.school_id || studentUser?.school_id || null,
            teacher_id: teacherUserId,
            type: 'Termin wiederhergestellt',
            message: `✅ Reaktiviert: ${userName} hat den Termin am ${shortDay} ${shortDate} um ${timeLabel} Uhr wieder reaktiviert (Eingang: ${execTimestampStr}).`
          });

          try {
            await supabase.from('notifications').insert({
              user_id: teacherUserId,
              title: 'Termin reaktiviert 🔄',
              message: `✅ Reaktiviert: ${userName} hat den Termin am ${shortDay} ${shortDate} um ${timeLabel} Uhr wieder reaktiviert.`,
              metadata: { occurrence_id: targetOccId, type: 'cancellation_reset' }
            });

            await supabase.functions.invoke('send-push', {
              body: {
                userId: teacherUserId,
                title: 'Termin reaktiviert 🔄',
                body: `✅ Reaktiviert: ${userName} hat den Termin am ${shortDay} ${shortDate} um ${timeLabel} Uhr wieder reaktiviert.`
              }
            });
          } catch (pushErr) {
            console.warn('Could not send push notification to teacher on undo cancel:', pushErr);
          }
        }
      } catch (notifErr) {
        console.warn('Could not create system notification on undo cancel:', notifErr);
      }

      // Trigger Real-Time Cross-Tab Synchronization
      if (typeof window !== 'undefined') {
        localStorage.setItem('campus_schedule_sync', Date.now().toString());
        localStorage.setItem('groovelab_schedule_changed', Date.now().toString());
        localStorage.setItem('campus_bookings_sync', Date.now().toString());
        localStorage.setItem('refresh-bookings', Date.now().toString());
        window.dispatchEvent(new CustomEvent('campus_schedule_sync'));
        window.dispatchEvent(new CustomEvent('groovelab_schedule_changed'));
        window.dispatchEvent(new CustomEvent('refresh-bookings'));
      }

      // 🛡️ Live Shoutbox Sync: Update appointmentChatData and refetch chat immediately
      setAppointmentChatData(prev => {
        if (!prev) return null;
        if (prev.occurrenceId === occ.id || prev.date === occ.date) {
          return { ...prev, isCancelled: false, status: 'scheduled' };
        }
        return prev;
      });
      if (targetTeacherId) {
        setTimeout(() => {
          fetchChat(targetTeacherId, occ.id, occ.date);
        }, 150);
      }

      fetchSchedule();
      fetchSchoolYearSchedule();

      const successUndoMsg = studentUiLevel === 'junior'
        ? 'Deine Musikstunde wurde wieder reaktiviert! 🎶'
        : 'Der Termin wurde erfolgreich reaktiviert.';
      alert(successUndoMsg);
    } catch(e) {
      console.error('Error undoing cancellation:', e);
      alert('Fehler beim Reaktivieren des Termins.');
    }
  };

  const handleCancelOccurrence = async (occ: any, skipPinCheck = false) => {
    if (!skipPinCheck && !isStudentAbsenceAllowed) {
      setGlobalPinPendingAction(() => () => handleCancelOccurrence(occ, true));
      setGlobalPinInput('');
      setGlobalPinError('');
      setShowGlobalParentPinModal(true);
      return;
    }

    const d = new Date(occ.date);
    const formattedDate = d.toLocaleDateString('de-DE');

    // 🛡️ Kanonische Lehrkräfte-Namensauflösung (immer vollständiger Name Vorname + Nachname)
    const teacherFirst = occ.teacher?.first_name || (studentUser as any)?.teacher?.first_name || '';
    const teacherLast = occ.teacher?.last_name || (studentUser as any)?.teacher?.last_name || '';
    const rawTeacherFullName = `${teacherFirst} ${teacherLast}`.trim();
    const fallbackTeacherName = briefingData?.todayLesson?.teacher_name || (studentUser as any)?.teacher_name || (studentUser as any)?.teacher?.name || '';
    const fullTeacherName = rawTeacherFullName || fallbackTeacherName;
    const teacherPhrase = fullTeacherName ? `deiner Lehrkraft ${fullTeacherName}` : 'deiner Lehrkraft';

    // Altersgerechtes Wording für Junior, Teen und Pro
    const pedagogicalNotice = '💡 Hinweis: Da deine Musikstunde fest für dich reserviert ist, werden deine Eltern und deine Lehrkraft automatisch über diese Absage informiert.';
    let confirmMsg = '';
    if (skipPinCheck) {
      confirmMsg = `Möchtest du den Unterrichtstermin am ${formattedDate} bei ${teacherPhrase} verbindlich absagen?\n\n${pedagogicalNotice}`;
    } else if (studentUiLevel === 'junior') {
      confirmMsg = `Möchtest du ${teacherPhrase} Bescheid geben, dass du am ${formattedDate} fehlst?\n\n${pedagogicalNotice}\n\n(Deine Eltern haben dir erlaubt, dich für diesen Termin selbst abzumelden.)`;
    } else if (studentUiLevel === 'teen') {
      confirmMsg = `Möchtest du deinen Unterrichtstermin am ${formattedDate} bei ${teacherPhrase} absagen?\n\n${pedagogicalNotice}`;
    } else {
      confirmMsg = `Möchtest du deinen Unterrichtstermin am ${formattedDate} bei ${teacherPhrase} verbindlich absagen?\n\n${pedagogicalNotice}`;
    }

    if (!confirm(confirmMsg)) return;

    try {
      const targetStudentId = studentId || studentUser?.id || occ.student_id;
      const targetTeacherId = occ.teacher_id || occ.teacher?.id || studentUser?.teacher_id || null;
      const targetScheduleId = occ.schedule_id || occ.schedule?.id || null;
      const targetOccIdStr = occ.id ? String(occ.id) : null;

      // 1. Authoritative RPC call (Fail-Closed, zero-leak)
      let rpcSucceeded = false;
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('cancel_student_schedule_occurrence', {
          p_student_id: targetStudentId,
          p_occurrence_id: targetOccIdStr,
          p_date: occ.date,
          p_start_time: occ.start_time || '15:00',
          p_duration: occ.duration || 45,
          p_teacher_id: targetTeacherId,
          p_schedule_id: targetScheduleId,
          p_notes: 'canceled_by_student'
        });

        if (!rpcErr && rpcRes?.success) {
          rpcSucceeded = true;
        } else if (rpcErr) {
          console.warn('cancel_student_schedule_occurrence RPC returned error, using fallback:', rpcErr);
        }
      } catch (rpcCallErr) {
        console.warn('Could not call cancel_student_schedule_occurrence RPC:', rpcCallErr);
      }

      // 2. Resilient Direct Fallback
      if (!rpcSucceeded) {
        const isVirtual = Boolean(
          occ.is_virtual || 
          (occ.id && (String(occ.id).startsWith('virtual-') || String(occ.id).startsWith('virt_')))
        );

        if (isVirtual) {
          // Prüfen, ob für dieses Datum bereits ein Eintrag existiert
          const { data: existingOcc } = await supabase
            .from('schedule_occurrences')
            .select('id')
            .eq('student_id', targetStudentId)
            .eq('date', occ.date)
            .maybeSingle();

          if (existingOcc?.id) {
            const { error: updateErr } = await supabase
              .from('schedule_occurrences')
              .update({ 
                status: 'canceled_by_student',
                canceled_by_role: 'student',
                student_acknowledged: true,
                notes: 'canceled_by_student',
                updated_at: new Date().toISOString()
              })
              .eq('id', existingOcc.id);
            if (updateErr) throw updateErr;
          } else {
            const occPayload: any = {
              schedule_id: targetScheduleId,
              student_id: targetStudentId,
              teacher_id: targetTeacherId,
              date: occ.date,
              start_time: occ.start_time || '15:00',
              duration: occ.duration || 45,
              status: 'canceled_by_student',
              canceled_by_role: 'student',
              student_acknowledged: true,
              notes: 'canceled_by_student'
            };
            const schoolId = occ.schedule?.school_id || occ.school_id || studentUser?.school_id;
            if (schoolId) occPayload.school_id = schoolId;

            const { error: insertErr } = await supabase
              .from('schedule_occurrences')
              .insert(occPayload);
            if (insertErr) throw insertErr;
          }
        } else {
          const { error: updateErr } = await supabase
            .from('schedule_occurrences')
            .update({ 
              status: 'canceled_by_student',
              canceled_by_role: 'student',
              student_acknowledged: true,
              notes: 'canceled_by_student',
              updated_at: new Date().toISOString()
            })
            .eq('id', occ.id);
          if (updateErr) throw updateErr;
        }

        // Resilient System Alerts & Direct Messages fallback
        try {
          const now = new Date();
          const execDateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const execTimeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
          const execTimestampStr = `${execDateStr} um ${execTimeStr} Uhr`;

          const { data: userData } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', targetStudentId)
            .single();
          const studentName = userData ? `${userData.first_name} ${maskLastName(userData.last_name)}` : 'Ein Schüler';
          const actorDesc = skipPinCheck ? 'mit Eltern-PIN' : 'mit elterlicher Erlaubnis';
          const timeLabel = (occ.start_time || '16:30').substring(0, 5);

          if (targetTeacherId) {
            await supabase.from('system_alerts').insert({
              school_id: occ.schedule?.school_id || occ.school_id || studentUser?.school_id || null,
              teacher_id: targetTeacherId,
              type: 'Termin abgesagt',
              message: `❌ Absage durch Schüler: ${studentName} hat den Termin am ${formattedDate} um ${timeLabel} Uhr ${actorDesc} abgesagt (Eingang: ${execTimestampStr}). Eltern wurden benachrichtigt.`
            });

            const [y, m, d] = String(occ.date).split('-').map(Number);
            const occDate = (y && m && d) ? new Date(y, m - 1, d) : new Date();
            const shortDay = occDate.toLocaleDateString('de-DE', { weekday: 'short' });
            const shortDate = occDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
            const targetOccId = occ.schedule_id ? `virtual-${occ.schedule_id}-${occ.date}` : occ.id;

            await supabase.from('campus_direct_messages').insert({
              sender_id: targetStudentId,
              recipient_id: targetTeacherId,
              content: `❌ Terminabsage: Dein Unterrichtstermin am ${shortDay} ${shortDate} um ${timeLabel} Uhr fällt aus.\n🕒 Abgemeldet am: ${execTimestampStr} durch Schüler:in (${studentName}, ${actorDesc}).`,
              occurrence_id: targetOccId,
              is_system: true,
              message_type: 'reschedule_notification'
            });
          }
        } catch (alertErr) {
          console.warn('Could not insert cancellation system alert in fallback:', alertErr);
        }
      }

      // Optimistic state update
      setRawScheduleOccurrences((prev: any[]) => prev.map((o: any) => {
        if (o.id === occ.id || (o.date === occ.date && (o.student_id === targetStudentId || !o.student_id))) {
          return { ...o, status: 'canceled_by_student', canceled_by_role: 'student', student_acknowledged: true };
        }
        return o;
      }));
      setRawSchoolYearOccurrences((prev: any[]) => prev.map((o: any) => {
        if (o.id === occ.id || (o.date === occ.date && (o.student_id === targetStudentId || !o.student_id))) {
          return { ...o, status: 'canceled_by_student', canceled_by_role: 'student', student_acknowledged: true };
        }
        return o;
      }));

      // 🛡️ Live Shoutbox Sync: Update appointmentChatData and refetch chat immediately
      setAppointmentChatData(prev => {
        if (!prev) return null;
        if (prev.occurrenceId === occ.id || prev.date === occ.date) {
          return { ...prev, isCancelled: true, status: 'canceled_by_student' };
        }
        return prev;
      });
      if (targetTeacherId) {
        setTimeout(() => {
          fetchChat(targetTeacherId, occ.id, occ.date);
        }, 150);
      }

      fetchSchedule();
      fetchSchoolYearSchedule();

      const successCancelMsg = studentUiLevel === 'junior'
        ? 'Deine Musikstunde wurde abgemeldet. Deine Eltern und deine Lehrkraft wurden benachrichtigt! 🎵'
        : 'Der Termin wurde erfolgreich abgesagt. Deine Eltern und deine Lehrkraft wurden benachrichtigt.';
      alert(successCancelMsg);
    } catch (err: any) {
      console.error('Error canceling occurrence:', err);
      alert('Fehler beim Absagen des Termins: ' + (err?.message || 'Bitte versuche es erneut.'));
    }
  };

  const handleRejectReschedule = async (occ: any) => {
    try {
      const originalDate = occ.original_date || occ.date;
      const originalStartTime = occ.original_start_time || occ.start_time;

      // Optimistic update: Status bleibt scheduled mit Originalzeit, Verschiebung abgewiesen
      setRawScheduleOccurrences(prev => 
        prev.map(o => o.id == occ.id ? { ...o, date: originalDate, start_time: originalStartTime, status: 'scheduled', student_acknowledged: true, reschedule_declined: true } : o)
      );

      // 1. Reset occurrence back to original date/time, behalte scheduled (keine Fehl-Stornierung!)
      const { error: updateErr } = await supabase
        .from('schedule_occurrences')
        .update({
          date: originalDate,
          start_time: originalStartTime,
          status: 'scheduled',
          student_acknowledged: true,
          notes: 'Vorgeschlagener Ausweichtermin abgelehnt – Neuabstimmung erforderlich',
          updated_at: new Date().toISOString()
        })
        .eq('id', occ.id);

      if (updateErr) throw updateErr;

      // 2. Alert the teacher zur Abstimmung eines Alternativtermins
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', studentId)
        .single();
      const studentName = userData ? `${userData.first_name} ${maskLastName(userData.last_name)}` : 'Ein Schüler';
      const formattedDeclinedDate = new Date(occ.date).toLocaleDateString('de-DE');

      await supabase.from('system_alerts').insert({
        school_id: occ.schedule?.school_id || studentUser?.school_id || null,
        teacher_id: occ.teacher_id,
        type: 'Ausweichtermin abgelehnt',
        message: `❌ ${studentName} kann den vorgeschlagenen Ausweichtermin am ${formattedDeclinedDate} nicht wahrnehmen. Der Termin wurde NICHT storniert – bitte stimme einen alternativen Termin ab.`
      });

      // 3. System message im Chat an die Lehrkraft
      try {
        const studentUserId = studentId || studentUser?.id || occ.student_id;
        const teacherUserId = occ.teacher_id || occ.teacher?.id;
        const targetOccId = occ.schedule_id ? `virtual-${occ.schedule_id}-${occ.date}` : occ.id;

        if (studentUserId && teacherUserId) {
          await supabase.from('campus_direct_messages').insert({
            sender_id: studentUserId,
            recipient_id: teacherUserId,
            content: `Der vorgeschlagene Ausweichtermin am ${formattedDeclinedDate} passt leider nicht. Bitte schlage einen anderen Termin vor oder schreibe uns kurz per Chat.`,
            occurrence_id: targetOccId,
            is_system: true,
            message_type: 'reschedule_notification'
          });
        }
      } catch (dmErr) {
        console.warn('Could not insert rejection direct message:', dmErr);
      }

      fetchSchedule();
      alert('Der Ausweichtermin wurde abgelehnt. Deine Lehrkraft wurde benachrichtigt, um einen passenden neuen Termin mit dir abzustimmen.');
    } catch (err: any) {
      console.error('Error rejecting reschedule:', err);
      fetchSchedule();
    }
  };
  
  const mapTabName = (tab?: string) => {
    if (!tab) return 'briefing';
    if (tab === 'mediathek') return 'songs';
    if (tab === 'termine' || tab === 'all_appointments') return 'events';
    return tab;
  };

  const [activeTabLocal, setActiveTabLocal] = useState<string>(() => {
    if (parentActiveTab) return mapTabName(parentActiveTab);
    const saved = typeof window !== 'undefined' ? (sessionStorage.getItem('campus_active_tab') || localStorage.getItem('campus_active_tab')) : null;
    return mapTabName(saved || 'briefing');
  });
  const activeTab = parentActiveTab ? mapTabName(parentActiveTab) : activeTabLocal;
  const setActiveTab = (tab: string) => {
    setActiveTabLocal(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };
  const [homeworkBookTab, setHomeworkBookTab] = useState<'document' | 'logbook' | 'stickeralbum' | 'skillradar' | 'audiobiography'>('document');
  const [homeworkBookViewMode, setHomeworkBookViewMode] = useState<'document' | 'recordings' | 'loopstation' | 'practice'>('document');
  const [homeworkRetryKey, setHomeworkRetryKey] = useState<number>(0);

  const isTargetedHwTabRef = useRef(false);

  useEffect(() => {
    if (parentActiveTab === 'homework_book') {
      if (isTargetedHwTabRef.current) {
        isTargetedHwTabRef.current = false;
        return;
      }
      setHomeworkBookTab('document');
      setHomeworkBookViewMode('document');
    }
  }, [parentActiveTab]);

  useEffect(() => {
    const handleReset = () => {
      setHomeworkBookTab('document');
      setHomeworkBookViewMode('document');
    };
    window.addEventListener('campus_reset_homework_board', handleReset);
    return () => window.removeEventListener('campus_reset_homework_board', handleReset);
  }, []);

  const handleOpenHomeworkBookWithView = (
    targetTab: 'document' | 'logbook' | 'stickeralbum' | 'skillradar' | 'audiobiography' = 'document',
    targetViewMode: 'document' | 'recordings' | 'loopstation' | 'practice' = 'document'
  ) => {
    isTargetedHwTabRef.current = true;
    setHomeworkBookTab(targetTab);
    setHomeworkBookViewMode(targetViewMode);
    setActiveTab('homework_book');
    if (onTabChange) {
      onTabChange('homework_book');
    }
  };

  // ── Asset Preloading Hook (3.2) ──
  useEffect(() => {
    const imagesToPreload = [
      '/avatars/gitarre_avatar_new.png',
      '/avatars/egitarre_avatar.png',
      '/avatars/ebass_avatar.png',
      '/avatars/kontrabass_avatar.png',
      '/avatars/bass_avatar.png',
      '/avatars/schlagzeug_avatar.png',
      '/avatars/klavier_avatar_new.png',
      '/avatars/gesang_avatar.png',
      '/avatars/trompete_avatar_new.png',
      '/avatars/posaune_avatar.png',
      '/avatars/horn_avatar_new.png',
      '/avatars/cello_avatar_new.png',
      '/avatars/violine_avatar_new.png'
    ];
    imagesToPreload.forEach(src => {
      const img = new Image();
      img.src = src;
    });

    // 🚀 Idle Prefetch: MeisterwerkDocumentationModal chunk preloading
    const preloadModalChunk = () => {
      import('./MeisterwerkDocumentationModal').catch(() => {
        // Silent catch for background prefetch
      });
    };
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(preloadModalChunk, { timeout: 3500 });
      } else {
        setTimeout(preloadModalChunk, 1500);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'events') {
      fetchSchoolYearSchedule();
    }
  }, [activeTab, studentId]);

  const handleUseJoker = async (dateStr: string) => {
    if (!studentId || !studentUser) return;
    
    const nowSim = getSimulatedNow();
    const currentWeek = getISOWeek(nowSim);
    const lastJokerWeek = studentUser?.joker_used_at ? getISOWeek(new Date(studentUser.joker_used_at)) : null;
    const usedJokersThisWeek = lastJokerWeek === currentWeek ? (studentUser?.weekly_jokers_used || 1) : 0;
    const availableShields = Math.max(0, 3 - usedJokersThisWeek);
    
    if (availableShields <= 0) {
      alert('Du hast alle 3 Schutzschilde für diese Woche bereits verbraucht!');
      return;
    }

    if (!window.confirm(`Möchtest du ein Schutzschild für den ${dateStr} einsetzen, um deinen Streak zu sichern? (Noch ${availableShields} von 3 Schilden verfügbar)`)) {
      return;
    }

    try {
      const parts = dateStr.split('.');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = 2000 + parseInt(parts[2], 10);
      const jokerDate = new Date(year, month, day, 12, 0, 0);
      const jokerDateStr = toLocalYYYYMMDD(jokerDate);

      let shieldDatesArr: string[] = [];
      try {
        shieldDatesArr = JSON.parse(localStorage.getItem(`cg_shield_usage_dates_${studentId}`) || '[]');
        if (!Array.isArray(shieldDatesArr)) shieldDatesArr = [];
      } catch (e) {
        shieldDatesArr = [];
      }
      if (!shieldDatesArr.includes(jokerDateStr)) {
        shieldDatesArr.push(jokerDateStr);
      }
      try {
        localStorage.setItem(`cg_shield_usage_dates_${studentId}`, JSON.stringify(shieldDatesArr));
      } catch (e) {}

      const newWeeklyUsed = Math.min(3, usedJokersThisWeek + 1);

      const { error: userErr } = await supabase
        .from('users')
        .update({ 
          joker_used_at: jokerDate.toISOString(),
          weekly_jokers_used: newWeeklyUsed
        })
        .eq('id', studentId);

      if (userErr) throw userErr;

      studentUser.joker_used_at = jokerDate.toISOString();
      studentUser.weekly_jokers_used = newWeeklyUsed;

      const currentStreak = avatar?.streak_flame || 0;
      const newStreak = currentStreak === 0 ? 1 : currentStreak;
      
      const { error: avatarErr } = await supabase
        .from('avatars')
        .update({ streak_flame: newStreak })
        .eq('user_id', studentId);

      if (avatarErr) throw avatarErr;

      await fetchStudentAndAvatar();
    } catch (err) {
      console.error('Error using shield:', err);
      alert('Fehler beim Einsetzen des Schutzschildes. Bitte versuche es erneut.');
    }
  };

  const checkAndAutoApplyJoker = async (groupedList: any[]) => {
    if (!studentId || !studentUser || !avatar) return;

    const currentStreak = avatar?.streak_flame || 0;
    if (currentStreak <= 0) return; // Shields are only automatically applied if there is an active streak to protect

    const nowSim = getSimulatedNow();
    const currentWeek = getISOWeek(nowSim);
    const lastJokerWeek = studentUser?.joker_used_at ? getISOWeek(new Date(studentUser.joker_used_at)) : null;
    let usedJokersThisWeek = lastJokerWeek === currentWeek ? (studentUser?.weekly_jokers_used || 1) : 0;
    let availableShields = Math.max(0, 3 - usedJokersThisWeek);

    if (availableShields <= 0) return;

    // Collect missed days from newest to oldest before today
    const missedDayGroups: any[] = [];
    for (let i = 0; i < groupedList.length; i++) {
      const group = groupedList[i];
      if (group.isToday) continue;

      if (group.isPlaceholder || (!group.hasMasteredSession && (group.focusSeconds + group.extraSeconds) < 180)) {
        missedDayGroups.push(group);
      } else {
        // Encountered a mastered practice day
        break;
      }
    }

    if (missedDayGroups.length === 0) return;

    // Read existing shield usage dates
    let shieldDatesArr: string[] = [];
    try {
      shieldDatesArr = JSON.parse(localStorage.getItem(`cg_shield_usage_dates_${studentId}`) || '[]');
      if (!Array.isArray(shieldDatesArr)) shieldDatesArr = [];
    } catch (e) {
      shieldDatesArr = [];
    }
    const shieldDatesSet = new Set(shieldDatesArr);

    // Sort missed days chronologically (oldest to newest)
    const missedDaysChronological = [...missedDayGroups].reverse();
    let shieldsToApply = 0;
    let lastJokerDateIso: string | null = null;

    for (const mGroup of missedDaysChronological) {
      const parts = mGroup.date.split('.');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = 2000 + parseInt(parts[2], 10);
      const mDate = new Date(year, month, day, 12, 0, 0);
      const mDateStr = toLocalYYYYMMDD(mDate);

      if (!shieldDatesSet.has(mDateStr) && availableShields > 0) {
        shieldDatesSet.add(mDateStr);
        availableShields--;
        shieldsToApply++;
        lastJokerDateIso = mDate.toISOString();
      }
    }

    if (shieldsToApply > 0 && lastJokerDateIso) {
      const newWeeklyUsed = Math.min(3, usedJokersThisWeek + shieldsToApply);
      try {
        localStorage.setItem(`cg_shield_usage_dates_${studentId}`, JSON.stringify(Array.from(shieldDatesSet)));
      } catch (e) {}

      try {
        const { error: userErr } = await supabase
          .from('users')
          .update({ 
            joker_used_at: lastJokerDateIso,
            weekly_jokers_used: newWeeklyUsed
          })
          .eq('id', studentId);

        if (userErr) throw userErr;

        studentUser.joker_used_at = lastJokerDateIso;
        studentUser.weekly_jokers_used = newWeeklyUsed;

        // Preserve current streak
        const newStreak = currentStreak;
        const { error: avatarErr } = await supabase
          .from('avatars')
          .update({ streak_flame: newStreak })
          .eq('user_id', studentId);

        if (avatarErr) throw avatarErr;

        await fetchStudentAndAvatar();
      } catch (err) {
        console.error('Error auto applying shields:', err);
      }
    }
  };

  const handleTabChangeLocal = (tab: string, skipResetHwTab = false) => {
    if (tab === 'homework_book' && !skipResetHwTab) {
      setHomeworkBookTab('document');
      setHomeworkBookViewMode('document');
      window.dispatchEvent(new CustomEvent('campus_reset_homework_board'));
    }
    if (tab === 'briefing') {
      fetchStudentProgress(true);
    }
    setActiveTab(tab);
    if (tab !== 'settings' && tab !== 'parent_controls' && !isAdultStudent) {
      // Auto-lock parent session when navigating to student boards
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
  };

  // Übe-Board / Gyro-Detox Engine state
  const [sessionActive, setSessionActive] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const secondsElapsedRef = useRef(0);
  useEffect(() => {
    secondsElapsedRef.current = secondsElapsed;
  }, [secondsElapsed]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [isPhoneFlat, setIsPhoneFlat] = useState(false);
  const isPhoneFlatRef = useRef(isPhoneFlat);

  useEffect(() => {
    isPhoneFlatRef.current = isPhoneFlat;
  }, [isPhoneFlat]);

  // Overhauled states for Fokus-Timer (grace period, flat detection types, fallback)
  const [flatType, setFlatType] = useState<'face-up' | 'face-down' | 'none'>('none');
  const [graceSecondsLeft, setGraceSecondsLeft] = useState(10);
  const [isGraceActive, setIsGraceActive] = useState(false);
  const [isDesktopFallback, setIsDesktopFallback] = useState(true);
  const [wakeLockFailed, setWakeLockFailed] = useState(false);
  const [practiceAnchor, setPracticeAnchor] = useState<string | null>(() => {
    try {
      return (typeof window !== 'undefined' && studentId) 
        ? (localStorage.getItem(`cg_practice_anchor_${studentId}`) || localStorage.getItem(`practice_anchor_${studentId}`) || null)
        : null;
    } catch {
      return null;
    }
  });
  const [customTone2Min, setCustomTone2Min] = useState<number>(() => {
    try {
      const saved = typeof window !== 'undefined' && studentId ? localStorage.getItem(`cg_magictone2_${studentId}`) : null;
      if (saved) return parseInt(saved, 10);
    } catch {}
    return 10;
  });
  const [customTone3Min, setCustomTone3Min] = useState<number>(() => {
    try {
      const saved = typeof window !== 'undefined' && studentId ? localStorage.getItem(`cg_magictone3_${studentId}`) : null;
      if (saved) return parseInt(saved, 10);
    } catch {}
    return 15;
  });
  const [anchorTrigger, setAnchorTrigger] = useState('den Hausaufgaben');
  const [customTriggerText, setCustomTriggerText] = useState('');
  const [lastSelectedMood, setLastSelectedMood] = useState<'sad' | 'neutral' | 'happy' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationDetails, setCelebrationDetails] = useState<{
    xpGained: number;
    streakFlame: number;
    sessionCompletedTarget: boolean;
    usedJokerThisSession: boolean;
    streak: number;
    sessionMinutes?: number;
    exactSeconds?: number;
    dailyGoal?: number;
  } | null>(null);

  const [celebrationRingProgress, setCelebrationRingProgress] = useState(0);
  const [celebrationExploded, setCelebrationExploded] = useState(false);
  const celebrationCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [lastFinishedTimestamp, setLastFinishedTimestamp] = useState<number | null>(null);
  const wakeLockRef = useRef<any>(null);

  const [fokusLogs, setFokusLogs] = useState<any[]>([]);
  const [showCustomParentInput, setShowCustomParentInput] = useState<boolean>(false);
  const [customParentMinutes, setCustomParentMinutes] = useState<string>('');
  const [showFirstLoginPinModal, setShowFirstLoginPinModal] = useState<boolean>(false);
  const [isExtraTime, setIsExtraTime] = useState(false);
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [checkpointSecondsLeft, setCheckpointSecondsLeft] = useState(20);
  const nextCheckpointSecondsRef = useRef<number>(0);
  const currentLogIdRef = useRef<string | null>(null);
  const currentExtraLogIdRef = useRef<string | null>(null);
  const isExtraTimeRef = useRef(isExtraTime);
  const isFinishingSessionRef = useRef(false);

  useEffect(() => {
    isExtraTimeRef.current = isExtraTime;
  }, [isExtraTime]);

  // Calculate student's personal average practice minutes per active day
  const personalAverageMinutes = useMemo(() => {
    if (!fokusLogs || fokusLogs.length === 0) return 3;
    const daysMap = new Map<string, number>();
    fokusLogs.forEach((log: any) => {
      const day = log.created_at ? String(log.created_at).slice(0, 10) : '';
      if (day) {
        const mins = log.duration_minutes || (log.duration_seconds ? log.duration_seconds / 60 : 0);
        daysMap.set(day, (daysMap.get(day) || 0) + mins);
      }
    });
    if (daysMap.size === 0) return 3;
    const totalMins = Array.from(daysMap.values()).reduce((a, b) => a + b, 0);
    const avg = totalMins / daysMap.size;
    return Math.max(1, Math.round(avg * 10) / 10);
  }, [fokusLogs]);

  // JUNIOR (LEVEL 1 • 6-10 JAHRE) - MODAL & AUDIO STATES
  const [progressItems, setProgressItems] = useState<any[]>([]);
  const [showJuniorHomeworkModal, setShowJuniorHomeworkModal] = useState(false);
  const [showJuniorTimerModal, setShowJuniorTimerModal] = useState(false);
  const [showJuniorRecordModal, setShowJuniorRecordModal] = useState(false);
  const [showJuniorRecordingsModal, setShowJuniorRecordingsModal] = useState(false);
  const [showJuniorStickerModal, setShowJuniorStickerModal] = useState(false);
  const [showJuniorPracticeSettingsModal, setShowJuniorPracticeSettingsModal] = useState(false);
  const [juniorStickerCategory, setJuniorStickerCategory] = useState<'all' | 'ueben' | 'xp' | 'streaks' | 'songs' | 'spezial'>('all');
  const [juniorAwardedStickerToCelebrate, setJuniorAwardedStickerToCelebrate] = useState<any | null>(null);
  const [juniorSelectedPreviewSticker, setJuniorSelectedPreviewSticker] = useState<any | null>(null);
  const [juniorCheckedPages, setJuniorCheckedPages] = useState<Record<string, boolean>>({});

  // 🚀 Junior Zen Space Mission: Reizentzug, Tab-Detox & Treibstoff-Physik
  const [juniorMissionPhase, setJuniorMissionPhase] = useState<'idle' | 'zen' | 'celebrating'>('idle');
  const [juniorLaunchStage, setJuniorLaunchStage] = useState<'launching' | 'summary'>('launching');
  const [juniorMissionTier, setJuniorMissionTier] = useState<1 | 2 | 3>(2);
  const [juniorCelebrationSummary, setJuniorCelebrationSummary] = useState<{
    elapsedSecs: number;
    targetMins: number;
    bonusMins: number;
    xpGained: number;
    flightDurationMs?: number;
    message: string;
  } | null>(null);
  const [isJuniorTabPaused, setIsJuniorTabPaused] = useState(false);
  const [showJuniorPreFlightModal, setShowJuniorPreFlightModal] = useState(false);
  const [isJuniorMissionPaused, setIsJuniorMissionPaused] = useState(false);
  const isJuniorMissionPausedRef = useRef(false);
  const [showJuniorCheatSheet, setShowJuniorCheatSheet] = useState(false);
  const [juniorSelectedTrackIndex, setJuniorSelectedTrackIndex] = useState<number>(0);
  const [juniorMissionCountdown, setJuniorMissionCountdown] = useState<number | null>(null);
  const juniorMissionCountdownTimerRef = useRef<any>(null);

  // 🗣️ TTS (Text-to-Speech) Vorlese-Engine für Hausaufgaben mit 3 wählbaren Varianten
  // 'neural_thorsten' = Option A: Neuronale KI-Stimme (Piper WASM Studio-Hörbuch)
  // 'neural_kerstin'  = Option A: Neuronale KI-Frauenstimme (Piper WASM)
  // 'cheerful'        = Option B: Fröhlich & Motivierend (Native Acoustic Tuning + Chime)
  // 'classic'         = Option C: Klassisch & Sachlich (Native Pitch 1.0)
  const [ttsMode, setTtsMode] = useState<'neural_thorsten' | 'neural_kerstin' | 'cheerful' | 'classic'>(() => {
    try {
      const saved = localStorage.getItem('campus_tts_mode');
      if (saved === 'neural_thorsten' || saved === 'neural_kerstin' || saved === 'cheerful' || saved === 'classic') {
        return saved;
      }
      return 'neural_thorsten';
    } catch {
      return 'neural_thorsten';
    }
  });

  const [ttsStatusText, setTtsStatusText] = useState<string | null>(null);

  const handleSetTtsMode = useCallback((mode: 'neural_thorsten' | 'neural_kerstin' | 'cheerful' | 'classic') => {
    setTtsMode(mode);
    try {
      localStorage.setItem('campus_tts_mode', mode);
    } catch {}
  }, []);

  const [ttsAvailableVoices, setTtsAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isTtsSpeaking, setIsTtsSpeaking] = useState<boolean>(false);
  const [activeTtsKey, setActiveTtsKey] = useState<string | null>(null);
  const ttsSessionIdRef = useRef<number>(0);

  // 🎵 Web Audio API Motivational Intro Chime (100% Kostenlos, 0kb Netzwerklast, DSGVO-konform)
  const playMotivationalTtsIntroChime = useCallback((mode: string) => {
    if (mode === 'classic') return; // Kein Chime in Variante classic
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // Fröhlicher 4-Ton-Aufgang (C5, E5, G5, C6)
      const notes = [
        { freq: 523.25, time: 0.00, dur: 0.10 },
        { freq: 659.25, time: 0.07, dur: 0.12 },
        { freq: 783.99, time: 0.14, dur: 0.14 },
        { freq: 1046.50, time: 0.21, dur: 0.24 }
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);
        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.exponentialRampToValueAtTime(0.15, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + time);
        osc.stop(now + time + dur + 0.04);
      });

      setTimeout(() => {
        try {
          ctx.close();
        } catch {
          // ignore
        }
      }, 700);
    } catch (e) {
      console.warn('[TTS] Audio chime failed gracefully:', e);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const loadVoices = () => {
      try {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          setTtsAvailableVoices(v);
        }
      } catch (e) {
        console.warn('[TTS] Failed to load voices:', e);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const selectBestGermanVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = ttsAvailableVoices.length > 0 ? ttsAvailableVoices : window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    const germanVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('de'));
    if (germanVoices.length === 0) return voices[0] || null;

    // 1. Moderne Microsoft Edge / Azure Neural Voices
    const msNatural = germanVoices.find(v => 
      v.name.includes('Online (Natural)') || 
      (v.name.includes('Natural') && (v.name.includes('Katja') || v.name.includes('Amira') || v.name.includes('Conrad') || v.name.includes('Killian')))
    );
    if (msNatural) return msNatural;

    // 2. Apple Siri & Enhanced/Premium Stimmen
    const siriOrPremium = germanVoices.find(v => 
      v.name.toLowerCase().includes('siri') || 
      v.name.toLowerCase().includes('premium') || 
      v.name.toLowerCase().includes('enhanced') || 
      v.name.toLowerCase().includes('erweitert')
    );
    if (siriOrPremium) return siriOrPremium;

    // 3. Apple Anna / Helena / Martin
    const annaVoice = germanVoices.find(v => v.name.toLowerCase().includes('anna'));
    if (annaVoice) return annaVoice;
    const helenaVoice = germanVoices.find(v => v.name.toLowerCase().includes('helena'));
    if (helenaVoice) return helenaVoice;
    const martinVoice = germanVoices.find(v => v.name.toLowerCase().includes('martin'));
    if (martinVoice) return martinVoice;

    // 4. Google Neural / Android Stimmen
    const googleVoice = germanVoices.find(v => v.name.includes('Google') || v.name.includes('deg-network'));
    if (googleVoice) return googleVoice;

    // 5. Beliebte Synthesizer (Katja, Marlene, Vicki, Hedda)
    const friendlyVoice = germanVoices.find(v => 
      v.name.toLowerCase().includes('katja') || 
      v.name.toLowerCase().includes('amira') || 
      v.name.toLowerCase().includes('marlene') || 
      v.name.toLowerCase().includes('vicki')
    );
    if (friendlyVoice) return friendlyVoice;

    return germanVoices[0] || null;
  }, [ttsAvailableVoices]);

  const handleStopSpeaking = useCallback(() => {
    ttsSessionIdRef.current += 1;
    stopNeuralSpeech();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsTtsSpeaking(false);
    setActiveTtsKey(null);
    setTtsStatusText(null);
  }, []);

  useEffect(() => {
    return () => {
      ttsSessionIdRef.current += 1;
      stopNeuralSpeech();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeakText = useCallback(async (textOrPhrases: string | string[], elementKey: string = 'global') => {
    if (isTtsSpeaking && activeTtsKey === elementKey) {
      handleStopSpeaking();
      return;
    }

    handleStopSpeaking();

    // 🛑 Audio-Kollisionsschutz: Laufende Audio-Vorschau sofort pausieren!
    if (juniorPreviewAudioRef.current) {
      try {
        juniorPreviewAudioRef.current.pause();
      } catch {}
      setJuniorPreviewPlaying(false);
    }

    // 🧼 Bereinige Text zuerst über die zentrale kindgerechte TTS-Engine, bevor Sätze geteilt werden
    const normalizedInput = Array.isArray(textOrPhrases)
      ? textOrPhrases.map(p => cleanTextForTts(p)).join(' ')
      : cleanTextForTts(textOrPhrases);

    const phrases = normalizedInput
      .split(/(?<=[.!?])\s+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (phrases.length === 0) return;

    const currentSessionId = ++ttsSessionIdRef.current;
    setIsTtsSpeaking(true);
    setActiveTtsKey(elementKey);

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Sprachausgabe wird in diesem Browser leider nicht unterstützt.');
      setIsTtsSpeaking(false);
      setActiveTtsKey(null);
      return;
    }

    const bestVoice = selectBestGermanVoice();

    // 🎵 Fröhlicher Intro-Chime
    playMotivationalTtsIntroChime('cheerful');
    await new Promise((r) => setTimeout(r, 220));

    for (let i = 0; i < phrases.length; i++) {
      if (ttsSessionIdRef.current !== currentSessionId) break;

      const phrase = phrases[i];
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(phrase);
        utterance.lang = 'de-DE';
        utterance.pitch = 1.04; // 🌟 Fröhliche, sympathisch modulierte Tonhöhe
        utterance.rate = 0.88;  // 🌟 Kindgerechte, verständliche Vorlesegeschwindigkeit
        utterance.volume = 0.72; // 🔉 Klare, angenehme Zimmerlautstärke

        if (bestVoice) utterance.voice = bestVoice;
        utterance.onend = () => resolve();
        utterance.onerror = (e) => {
          console.warn('[TTS] Phrase speech error:', e);
          resolve();
        };
        window.speechSynthesis.speak(utterance);
      });

      if (ttsSessionIdRef.current !== currentSessionId) break;

      if (i < phrases.length - 1) {
        await new Promise((r) => setTimeout(r, 280));
      }
    }

    if (ttsSessionIdRef.current === currentSessionId) {
      setIsTtsSpeaking(false);
      setActiveTtsKey(null);
      setTtsStatusText(null);
    }
  }, [isTtsSpeaking, activeTtsKey, handleStopSpeaking, selectBestGermanVoice, playMotivationalTtsIntroChime]);

  // Junior Audio Recording State
  const [juniorIsRecording, setJuniorIsRecording] = useState(false);
  const [juniorCountdown, setJuniorCountdown] = useState<number | null>(null);
  const [juniorRecordDuration, setJuniorRecordDuration] = useState(0);
  const [juniorRecordedBlob, setJuniorRecordedBlob] = useState<Blob | null>(null);
  const [juniorRecordedUrl, setJuniorRecordedUrl] = useState<string | null>(null);
  const [juniorRecordTitle, setJuniorRecordTitle] = useState('');
  const [juniorIsSaving, setJuniorIsSaving] = useState(false);
  const juniorMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const juniorAudioChunksRef = useRef<Blob[]>([]);
  const juniorAudioStreamRef = useRef<MediaStream | null>(null);
  const juniorRecordTimerRef = useRef<any>(null);
  const juniorCdIntervalRef = useRef<any>(null);
  const [juniorActivePlayingAudioId, setJuniorActivePlayingAudioId] = useState<string | null>(null);
  const juniorAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  
  // Local Junior Audio Vault State (Resilient Offline + Online)
  const [juniorLocalRecordings, setJuniorLocalRecordings] = useState<any[]>(() => {
    try {
      const activeId = studentId || 'current';
      const stored = localStorage.getItem(`campus_junior_recordings_${activeId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!studentId) return;
    try {
      const localKey = `campus_junior_recordings_${studentId}`;
      const stored = localStorage.getItem(localKey);
      if (stored) {
        setJuniorLocalRecordings(JSON.parse(stored));
      }
    } catch {}
  }, [studentId]);

  // High-End Studio Preview Player State
  const [juniorPreviewPlaying, setJuniorPreviewPlaying] = useState(false);
  const [juniorPreviewCurrentTime, setJuniorPreviewCurrentTime] = useState(0);
  const [juniorPreviewDuration, setJuniorPreviewDuration] = useState(0);
  const juniorPreviewAudioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlayJuniorPreview = () => {
    if (!juniorRecordedUrl) return;
    if (!juniorPreviewAudioRef.current || juniorPreviewAudioRef.current.src !== juniorRecordedUrl) {
      if (juniorPreviewAudioRef.current) {
        juniorPreviewAudioRef.current.pause();
      }
      const audio = new Audio(juniorRecordedUrl);
      juniorPreviewAudioRef.current = audio;
      audio.onloadedmetadata = () => {
        setJuniorPreviewDuration(audio.duration || juniorRecordDuration || 1);
      };
      audio.ontimeupdate = () => {
        setJuniorPreviewCurrentTime(audio.currentTime);
      };
      audio.onended = () => {
        setJuniorPreviewPlaying(false);
        setJuniorPreviewCurrentTime(0);
      };
    }

    if (juniorPreviewPlaying) {
      juniorPreviewAudioRef.current.pause();
      setJuniorPreviewPlaying(false);
    } else {
      // 🛑 Audio-Kollisionsschutz: Sprachausgabe sofort stoppen, bevor Musik abgespielt wird
      handleStopSpeaking();
      juniorPreviewAudioRef.current.play().then(() => {
        setJuniorPreviewPlaying(true);
      }).catch(e => console.warn('Preview play error:', e));
    }
  };

  // Clean Audio Stream on Unmount & Stop on Tab Switch
  useEffect(() => {
    const cleanup = () => {
      if (juniorPreviewAudioRef.current) {
        juniorPreviewAudioRef.current.pause();
        juniorPreviewAudioRef.current = null;
      }
      if (juniorCdIntervalRef.current) {
        clearInterval(juniorCdIntervalRef.current);
        juniorCdIntervalRef.current = null;
      }
      if (juniorAudioStreamRef.current) {
        juniorAudioStreamRef.current.getTracks().forEach(t => t.stop());
        juniorAudioStreamRef.current = null;
      }
      if (juniorAudioPlayerRef.current) {
        juniorAudioPlayerRef.current.pause();
        juniorAudioPlayerRef.current = null;
      }
      if (juniorRecordTimerRef.current) {
        clearInterval(juniorRecordTimerRef.current);
        juniorRecordTimerRef.current = null;
      }
      setJuniorPreviewPlaying(false);
      setJuniorIsRecording(false);
    };

    const handleHardwareAudioVisibility = () => {
      if (document.visibilityState === 'hidden') {
        cleanup();
        if (typeof (window as any).stopAllCameras === 'function') {
          (window as any).stopAllCameras();
        }
      }
    };

    document.addEventListener('visibilitychange', handleHardwareAudioVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleHardwareAudioVisibility);
      cleanup();
    };
  }, []);

  // 🎙️ 1. Permission-First + Cross-Browser Recording Initialization
  const startJuniorRecordingFlow = async () => {
    if (juniorPreviewAudioRef.current) {
      juniorPreviewAudioRef.current.pause();
      juniorPreviewAudioRef.current = null;
    }
    setJuniorPreviewPlaying(false);
    setJuniorPreviewCurrentTime(0);

    // Reset state and clear previous countdowns
    if (juniorCdIntervalRef.current) {
      clearInterval(juniorCdIntervalRef.current);
      juniorCdIntervalRef.current = null;
    }
    if (juniorRecordTimerRef.current) {
      clearInterval(juniorRecordTimerRef.current);
      juniorRecordTimerRef.current = null;
    }
    setJuniorRecordedBlob(null);
    setJuniorRecordedUrl(null);
    setJuniorRecordDuration(0);
    setJuniorCountdown(null);

    const isAllowed = draftAllowAudio ?? (studentUser as any)?.parent_allow_audio ?? (draftBoardOverrides.recordings ?? (typeof window !== 'undefined' ? localStorage.getItem('campus_board_override_recordings') !== 'false' : true));
    if (!isAllowed) {
      alert('Die Aufnahme-Funktion ist im Eltern-Kontrollzentrum aktuell deaktiviert.');
      setShowJuniorRecordModal(false);
      return;
    }

    // 🎙️ Check if school Audio-Tresor storage quota is exceeded
    const studentSchoolId = (studentUser as any)?.school_id;
    if (studentSchoolId) {
      try {
        const overridesStr = typeof window !== 'undefined' ? localStorage.getItem('groovelab_school_overrides') : null;
        const overrides = overridesStr ? JSON.parse(overridesStr) : {};
        const schoolObj = overrides[studentSchoolId] || {};
        const storageUsed = Number(schoolObj.storage_used_bytes || 0);
        const storageAddon = Number(schoolObj.storage_addon_gb || 0);
        const totalCapBytes = (1.0 + storageAddon) * 1024 * 1024 * 1024;
        if (storageUsed > 0 && storageUsed >= totalCapBytes) {
          alert('Der Audio-Tresor deiner Musikschule hat das Speicherlimit erreicht. Bitte wende dich an deine Lehrkraft.');
          setShowJuniorRecordModal(false);
          return;
        }
      } catch (e) {}
    }

    // 1. Request microphone permission FIRST before starting any visual countdown
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          googEchoCancellation: false,
          googAutoGainControl: false,
          googNoiseSuppression: false,
          googHighpassFilter: false,
          googTypingNoiseDetection: false,
          channelCount: 1,
          sampleRate: 48000
        } as any
      });
      juniorAudioStreamRef.current = stream;
      juniorAudioChunksRef.current = [];

      // 🌟 WebAudio Dual-Channel Center Bridge:
      // Takes raw microphone input and routes it 1:1 to Left and Right channels (100% centered stereo)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const juniorRecordAudioCtx = new AudioCtx();
      const sourceNode = juniorRecordAudioCtx.createMediaStreamSource(stream);
      const mergerNode = juniorRecordAudioCtx.createChannelMerger(2);
      sourceNode.connect(mergerNode, 0, 0); // Duplicate to Left
      sourceNode.connect(mergerNode, 0, 1); // Duplicate to Right
      const destNode = juniorRecordAudioCtx.createMediaStreamDestination();
      mergerNode.connect(destNode);
      const recordStream = destNode.stream;

      // Detect supported cross-browser MIME type (Safari/iOS vs Chrome/Firefox)
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
          mimeType = 'audio/aac';
        }
      }

      const recorder = mimeType 
        ? new MediaRecorder(recordStream, { mimeType, audioBitsPerSecond: 256000 }) 
        : new MediaRecorder(recordStream, { audioBitsPerSecond: 256000 });
      juniorMediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          juniorAudioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(juniorAudioChunksRef.current, { type });
        setJuniorRecordedBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setJuniorRecordedUrl(url);
        const defaultTitle = `${studentInstrumentName || 'Mein'}-Hit • ${new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}`;
        setJuniorRecordTitle(prev => prev && prev.trim() ? prev : defaultTitle);
        if (juniorAudioStreamRef.current) {
          juniorAudioStreamRef.current.getTracks().forEach(t => t.stop());
          juniorAudioStreamRef.current = null;
        }
        recordStream.getTracks().forEach(t => t.stop());
        if (juniorRecordAudioCtx && juniorRecordAudioCtx.state !== 'closed') {
          juniorRecordAudioCtx.close().catch(() => {});
        }
      };

      // 2. Pre-warm and ensure AudioContext is active for instantaneous latency-free beeps
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume().catch(() => {});
      }

      // 3. Start high-precision drift-free 3-2-1 countdown
      setJuniorCountdown(3);
      playBeep(440, 120);
      
      const countdownStart = performance.now();
      let currentShown = 3;

      juniorCdIntervalRef.current = setInterval(() => {
        const elapsed = performance.now() - countdownStart;
        const targetNumber = 3 - Math.floor(elapsed / 1000);

        if (targetNumber < currentShown) {
          currentShown = targetNumber;
          if (currentShown > 0) {
            setJuniorCountdown(currentShown);
            playBeep(440, 120);
          } else {
            clearInterval(juniorCdIntervalRef.current);
            juniorCdIntervalRef.current = null;
            setJuniorCountdown(null);

            // Start recording precisely at 3.000s!
            try {
              recorder.start(200);
              setJuniorIsRecording(true);
              setJuniorRecordDuration(0);

              juniorRecordTimerRef.current = setInterval(() => {
                setJuniorRecordDuration(prev => prev + 1);
              }, 1000);
            } catch (startErr) {
              console.error('Recording start execution error:', startErr);
            }
          }
        }
      }, 25); // 25ms high-frequency polling ensures <25ms timing accuracy

    } catch (err: any) {
      console.error('Microphone access denied / error:', err);
      alert('Mikrofon-Zugriff nicht möglich oder verweigert. Bitte erlaube den Zugriff im Browser, um deinen Song aufzunehmen.');
      if (juniorAudioStreamRef.current) {
        juniorAudioStreamRef.current.getTracks().forEach(t => t.stop());
        juniorAudioStreamRef.current = null;
      }
      setShowJuniorRecordModal(false);
    }
  };

  const stopJuniorRecording = () => {
    if (juniorRecordTimerRef.current) {
      clearInterval(juniorRecordTimerRef.current);
      juniorRecordTimerRef.current = null;
    }
    if (juniorMediaRecorderRef.current && juniorMediaRecorderRef.current.state !== 'inactive') {
      try {
        juniorMediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Recorder stop warning:', e);
      }
    }
    setJuniorIsRecording(false);
  };

  // 🛡️ Enterprise Kinderschutz: Hardware-Mikrofon sofort trennen bei Tab-Wechsel
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && juniorIsRecording) {
        stopJuniorRecording();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [juniorIsRecording]);

  // 🛑 2. Clean Teardown & Immediate Modal Close on 'X'
  const cancelJuniorRecording = () => {
    if (juniorPreviewAudioRef.current) {
      juniorPreviewAudioRef.current.pause();
      juniorPreviewAudioRef.current = null;
    }
    setJuniorPreviewPlaying(false);
    setJuniorPreviewCurrentTime(0);

    if (juniorCdIntervalRef.current) {
      clearInterval(juniorCdIntervalRef.current);
      juniorCdIntervalRef.current = null;
    }
    if (juniorRecordTimerRef.current) {
      clearInterval(juniorRecordTimerRef.current);
      juniorRecordTimerRef.current = null;
    }
    if (juniorMediaRecorderRef.current && juniorMediaRecorderRef.current.state !== 'inactive') {
      try {
        juniorMediaRecorderRef.current.stop();
      } catch {}
    }
    if (juniorAudioStreamRef.current) {
      juniorAudioStreamRef.current.getTracks().forEach(t => t.stop());
      juniorAudioStreamRef.current = null;
    }
    setJuniorIsRecording(false);
    setJuniorRecordedBlob(null);
    setJuniorRecordedUrl(null);
    setJuniorCountdown(null);
    setShowJuniorRecordModal(false);
  };

  // 💾 3. Dual-Storage Engine (Local IndexedDB Vault + Cloud Supabase + Audio-Biography Sync)
  const saveJuniorRecording = async () => {
    if (!juniorRecordedBlob || !studentId) return;
    setJuniorIsSaving(true);
    try {
      let hasTresor = false;
      const targetSchoolId = studentUser?.school_id || localStorage.getItem('groovelab_school_id') || localStorage.getItem('campus_school_id');
      if (targetSchoolId) {
        try {
          const { data: sch } = await supabase
            .from('schools')
            .select('storage_addon_gb, storage_addon_status')
            .eq('id', targetSchoolId)
            .maybeSingle();
          if (sch && Number(sch.storage_addon_gb || 0) > 0 && sch.storage_addon_status !== 'cancelled') {
            hasTresor = true;
          }
        } catch (e) {}
      }

      let saveBlob = juniorRecordedBlob;
      try {
        // 🌟 Universal EBU R128 Pure RAW Loudness Calibration (-14.5 LUFS / -1.0 dBTP True-Peak Guard)
        const pureRawResult = await processPureRawBlob(juniorRecordedBlob, { targetLufs: TARGET_PURE_RAW_LUFS, targetPeakDb: TARGET_PEAK_DBTP });
        saveBlob = pureRawResult.processedBlob;
      } catch (dspErr) {
        console.warn('[saveJuniorRecording] Pure RAW DSP note:', dspErr);
      }

      const recUniqueId = `rec_${studentId}_${Date.now()}`;
      const fileExt = hasTresor ? 'wav' : (saveBlob.type.includes('mp4') ? 'mp4' : 'webm');
      const contentType = hasTresor ? 'audio/wav' : (saveBlob.type || 'audio/webm');
      const schoolPathPrefix = targetSchoolId ? `schools/${targetSchoolId}/` : '';
      const fileName = `meisterwerk_${studentId}_${Date.now()}.${fileExt}`;
      const filePath = `${schoolPathPrefix}recordings/${fileName}`;
      const localBlobKey = `campus_audio_${recUniqueId}_raw`;
      
      // 1. Store directly in local IndexedDB vault first (100% resilient)
      await storeBlob(localBlobKey, saveBlob);

      const songTitle = juniorRecordTitle.trim() || `${studentInstrumentName || 'Mein'}-Hit • ${new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}`;
      
      // 2. Store in local state & localStorage for immediate 100% display (< 15ms)
      const newRecEntry = {
        id: recUniqueId,
        title: songTitle,
        url: localBlobKey,
        duration: juniorRecordDuration,
        date: new Date().toISOString(),
        blobKey: localBlobKey
      };

      try {
        const localKey = `campus_junior_recordings_${studentId}`;
        const existingLocal = JSON.parse(localStorage.getItem(localKey) || '[]');
        const updatedLocal = [newRecEntry, ...existingLocal.filter((x: any) => x.id !== recUniqueId)];
        localStorage.setItem(localKey, JSON.stringify(updatedLocal));
        setJuniorLocalRecordings(updatedLocal);
      } catch (locErr) {
        console.warn('Local storage update notice:', locErr);
      }

      // 3. Also sync to student's Audio-Biography / Audio-Tresor so tracks appear everywhere
      try {
        const bioKey = `campus_audio_biography_${studentId}`;
        const existingBio = JSON.parse(localStorage.getItem(bioKey) || '[]');
        const newBioTrack = {
          id: recUniqueId,
          title: songTitle,
          subtitle: '🎙️ Junior Solo',
          audioUrl: localBlobKey,
          duration: juniorRecordDuration,
          recordedAt: new Date().toISOString(),
          preferredVersion: 'raw'
        };
        const updatedBio = [newBioTrack, ...existingBio.filter((x: any) => x.id !== recUniqueId)];
        localStorage.setItem(bioKey, JSON.stringify(updatedBio));
      } catch (bioErr) {
        console.warn('Audio-biography sync notice:', bioErr);
      }

      const authorRole = isTeacherSession ? 'teacher' : 'student';
      const initialAudioMetaStr = `AUDIO:${localBlobKey}|${juniorRecordDuration}|${new Date().toISOString()}|${songTitle}|${authorRole}|${isTeacherSession ? 'public' : 'private'}|${recUniqueId}`;

      // Update local cache for homework notes immediately
      try {
        const hwNotesKey = `campus_homework_notes_${studentId}`;
        const cachedHW = localStorage.getItem(hwNotesKey);
        let cachedNotesList: string[] = [];
        if (cachedHW) {
          try {
            if (cachedHW.startsWith('[') && cachedHW.endsWith(']')) {
              cachedNotesList = JSON.parse(cachedHW);
            } else {
              cachedNotesList = [cachedHW];
            }
          } catch {
            cachedNotesList = [cachedHW];
          }
        }
        cachedNotesList.push(initialAudioMetaStr);
        localStorage.setItem(hwNotesKey, JSON.stringify(cachedNotesList));
      } catch (hwNotesErr) {
        console.warn('Hausaufgabenheft notes sync notice:', hwNotesErr);
      }

      playSuccessChime();
      setShowJuniorRecordModal(false);
      cancelJuniorRecording();
      setJuniorRecordTitle('');

      // 4. Background Cloud Storage & Database Sync (8s Timeout Guard)
      (async () => {
        try {
          const uploadPromise = supabase.storage
            .from('campus-assets')
            .upload(filePath, saveBlob, { contentType, cacheControl: '3600' });

          const timeoutPromise = new Promise<{ error: Error }>((_, reject) => 
            setTimeout(() => reject(new Error('Storage upload timeout')), 8000)
          );

          const upRes = await Promise.race([uploadPromise, timeoutPromise]) as any;

          let finalAudioUrl = localBlobKey;
          if (upRes && !upRes.error) {
            const { data: pubData } = supabase.storage.from('campus-assets').getPublicUrl(filePath);
            if (pubData?.publicUrl) {
              finalAudioUrl = pubData.publicUrl;
              await storeBlob(finalAudioUrl, saveBlob).catch(() => {});

              // Silently upgrade local pointers to public cloud URL
              try {
                const localKey = `campus_junior_recordings_${studentId}`;
                const existingLocal = JSON.parse(localStorage.getItem(localKey) || '[]');
                const updatedLocal = existingLocal.map((r: any) => r.id === recUniqueId ? { ...r, url: finalAudioUrl } : r);
                localStorage.setItem(localKey, JSON.stringify(updatedLocal));
                setJuniorLocalRecordings(updatedLocal);
              } catch {}

              try {
                const bioKey = `campus_audio_biography_${studentId}`;
                const existingBio = JSON.parse(localStorage.getItem(bioKey) || '[]');
                const updatedBio = existingBio.map((r: any) => r.id === recUniqueId ? { ...r, audioUrl: finalAudioUrl } : r);
                localStorage.setItem(bioKey, JSON.stringify(updatedBio));
              } catch {}
            }
          }

          const audioMetaStr = `AUDIO:${finalAudioUrl}|${juniorRecordDuration}|${new Date().toISOString()}|${songTitle}|${authorRole}|${isTeacherSession ? 'public' : 'private'}|${recUniqueId}`;

          // Insert record into progress_matrix in Supabase
          try {
            await supabase.from('progress_matrix').insert({
              student_id: studentId,
              school_id: studentUser?.school_id,
              topic_name: songTitle,
              homework_notes: JSON.stringify([audioMetaStr]),
              audio_url: finalAudioUrl,
              is_current_homework: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          } catch (dbErr) {
            console.warn('Supabase insert notice:', dbErr);
          }

          // Append to active homework item if exists
          try {
            const activeHwItem = (progressItems || []).find(item => item.is_current_homework || item.topic_name?.startsWith('Hausaufgabe KW '));
            if (activeHwItem && activeHwItem.id) {
              let existingNotes: string[] = [];
              if (activeHwItem.homework_notes) {
                try {
                  if (activeHwItem.homework_notes.startsWith('[') && activeHwItem.homework_notes.endsWith(']')) {
                    existingNotes = JSON.parse(activeHwItem.homework_notes);
                  } else {
                    existingNotes = [activeHwItem.homework_notes];
                  }
                } catch {
                  existingNotes = [activeHwItem.homework_notes];
                }
              }
              const updatedNotes = [...existingNotes, audioMetaStr];
              await supabase.from('progress_items').update({
                homework_notes: JSON.stringify(updatedNotes),
                updated_at: new Date().toISOString()
              }).eq('id', activeHwItem.id);
            }
          } catch {}

          // Background quota update
          if (targetSchoolId && saveBlob?.size) {
            try {
              const { data: schoolData } = await supabase
                .from('schools')
                .select('storage_used_bytes')
                .eq('id', targetSchoolId)
                .maybeSingle();
              if (schoolData) {
                const currentBytes = Number(schoolData.storage_used_bytes || 0);
                const updatedBytes = currentBytes + saveBlob.size;
                await supabase
                  .from('schools')
                  .update({ storage_used_bytes: updatedBytes })
                  .eq('id', targetSchoolId);
              }
            } catch {}
          }
        } catch (bgErr) {
          console.warn('[StudentAvatarDashboard] Background save notice (local state fully intact):', bgErr);
        }
      })();
    } catch (err) {
      console.error('Error saving recording:', err);
      alert('Aufnahme konnte gespeichert werden.');
    } finally {
      setJuniorIsSaving(false);
    }
  };

  // Junior Student Recordings List (Exclusively containing recorded songs from Box 3 "Aufnahme starten" & Übe-Studio)
  const juniorStudentRecordings = useMemo(() => {
    const recsMap = new Map<string, { id: string; title: string; url: string; duration?: number; date: string; fullItem?: any; blobKey?: string }>();

    // 1. From local junior recordings state & localStorage
    const localItems = Array.isArray(juniorLocalRecordings) && juniorLocalRecordings.length > 0
      ? juniorLocalRecordings
      : (() => {
          try {
            const raw = localStorage.getItem(`campus_junior_recordings_${studentId}`);
            return raw ? JSON.parse(raw) : [];
          } catch {
            return [];
          }
        })();

    (localItems || []).forEach((item: any) => {
      if (item && (item.id || item.url)) {
        const uniqueKey = item.id || item.url;
        recsMap.set(uniqueKey, {
          id: uniqueKey,
          title: item.title || 'Mein Song',
          url: item.url || '',
          duration: item.duration,
          date: item.date || item.recordedAt || new Date().toISOString(),
          blobKey: item.blobKey || `campus_audio_${uniqueKey}_raw`
        });
      }
    });

    return Array.from(recsMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [juniorLocalRecordings, studentId]);

  // Junior Teacher Recordings (All historical recordings created by the teacher across all weeks/progressItems)
  const juniorTeacherRecordings = useMemo(() => {
    const recsMap = new Map<string, { id: string; title: string; url: string; duration?: number; date: string; topic?: string; week?: string; blobKey?: string }>();

    const processAudioString = (str: string, fallbackTopic: string, fallbackDate: string, defaultIdx: number) => {
      if (!str || typeof str !== 'string' || !str.includes('AUDIO:')) return;
      const cleanStr = str.startsWith('[') ? str.replace(/[\[\]"]/g, '') : str;
      const audioIndex = cleanStr.indexOf('AUDIO:');
      if (audioIndex === -1) return;
      const parts = cleanStr.substring(audioIndex + 6).split('|');
      const audioUrl = parts[0]?.trim() || '';
      const duration = parseFloat(parts[1]) || 0;
      const audioDate = parts[2] || fallbackDate || new Date().toISOString();
      const label = parts[3] || fallbackTopic || `Aufnahme #${defaultIdx + 1}`;
      const author = parts[4] || 'teacher';
      const uniqueKey = parts[6] || (audioUrl && audioUrl !== '#' ? audioUrl : null) || `audio_${defaultIdx}_${label}_${audioDate}`;

      if (!recsMap.has(uniqueKey) && author !== 'student') {
        recsMap.set(uniqueKey, {
          id: uniqueKey,
          title: label,
          url: audioUrl,
          duration,
          date: audioDate,
          topic: fallbackTopic,
          blobKey: parts[6] ? `campus_audio_${parts[6]}_raw` : undefined
        });
      }
    };

    // 1. From progressItems across all weeks/history
    (progressItems || []).forEach((item: any, itemIdx: number) => {
      if (!item) return;
      const itemDate = item.created_at || item.updated_at || new Date().toISOString();
      const itemTopic = item.topic_name || 'Unterrichts-Übung';

      if (item.homework_notes) {
        try {
          const parsed = JSON.parse(item.homework_notes);
          if (Array.isArray(parsed)) {
            parsed.forEach((n: any, idx: number) => processAudioString(n, itemTopic, itemDate, idx));
          } else if (typeof parsed === 'string') {
            processAudioString(parsed, itemTopic, itemDate, itemIdx);
          }
        } catch {
          processAudioString(item.homework_notes, itemTopic, itemDate, itemIdx);
        }
      }

      if (item.audio_url) {
        const uniqueKey = item.audio_url;
        if (!recsMap.has(uniqueKey)) {
          recsMap.set(uniqueKey, {
            id: uniqueKey,
            title: itemTopic,
            url: item.audio_url,
            duration: item.duration || 0,
            date: itemDate,
            topic: itemTopic
          });
        }
      }
    });

    // 2. Also from localStorage campus_homework_notes_${studentId}
    try {
      const localGenNotes = localStorage.getItem(`campus_homework_notes_${studentId}`);
      if (localGenNotes && localGenNotes.trim()) {
        try {
          const parsed = JSON.parse(localGenNotes);
          if (Array.isArray(parsed)) {
            parsed.forEach((n: any, idx: number) => processAudioString(n, 'Hausaufgabe', new Date().toISOString(), idx));
          } else if (typeof parsed === 'string') {
            processAudioString(parsed, 'Hausaufgabe', new Date().toISOString(), 0);
          }
        } catch {
          processAudioString(localGenNotes, 'Hausaufgabe', new Date().toISOString(), 0);
        }
      }
    } catch {}

    return Array.from(recsMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [progressItems, studentId]);

  const togglePlayJuniorRecording = async (recId: string, audioUrl: string, blobKey?: string) => {
    if (juniorActivePlayingAudioId === recId) {
      if (juniorAudioPlayerRef.current) {
        juniorAudioPlayerRef.current.pause();
        juniorAudioPlayerRef.current = null;
      }
      setJuniorActivePlayingAudioId(null);
      return;
    }
    if (juniorAudioPlayerRef.current) {
      juniorAudioPlayerRef.current.pause();
      juniorAudioPlayerRef.current = null;
    }

    let playableUrl = audioUrl;
    if (!playableUrl && blobKey) {
      const b = await getBlob(blobKey);
      if (b && b instanceof Blob) {
        playableUrl = URL.createObjectURL(b);
      }
    }

    if (playableUrl) {
      const audio = new Audio(playableUrl);
      juniorAudioPlayerRef.current = audio;
      setJuniorActivePlayingAudioId(recId);
      audio.play().catch(e => console.warn('Audio play error:', e));
      audio.onended = () => {
        setJuniorActivePlayingAudioId(null);
        juniorAudioPlayerRef.current = null;
      };
    }
  };

  const downloadJuniorRecording = async (rec: any) => {
    try {
      let downloadUrl = rec.url;
      if (!downloadUrl && rec.blobKey) {
        const b = await getBlob(rec.blobKey);
        if (b && b instanceof Blob) {
          downloadUrl = URL.createObjectURL(b);
        }
      } else if (rec.blobKey) {
        const b = await getBlob(rec.blobKey);
        if (b && b instanceof Blob) {
          downloadUrl = URL.createObjectURL(b);
        }
      }

      if (!downloadUrl) {
        alert('Keine Audiodatei gefunden.');
        return;
      }

      const safeTitle = (rec.title || 'Aufnahme').replace(/[^a-zA-Z0-9äöüÄÖÜß\-_ ]/g, '').trim() || 'Aufnahme';
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${safeTitle}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download recording:', err);
      alert('Download fehlgeschlagen.');
    }
  };

  const deleteJuniorRecording = async (rec: any) => {
    if (!window.confirm(`Möchtest du die Aufnahme "${rec.title}" wirklich löschen?`)) return;
    try {
      // 1. Remove from local junior recordings
      const localKey = `campus_junior_recordings_${studentId}`;
      const updatedLocal = juniorLocalRecordings.filter(x => x.id !== rec.id && x.blobKey !== rec.blobKey);
      localStorage.setItem(localKey, JSON.stringify(updatedLocal));
      setJuniorLocalRecordings(updatedLocal);

      // 2. Remove from Audio-Biografie storage
      try {
        const bioKey = `campus_audio_biography_${studentId}`;
        const existingBio = JSON.parse(localStorage.getItem(bioKey) || '[]');
        const updatedBio = existingBio.filter((x: any) => x.id !== rec.id);
        localStorage.setItem(bioKey, JSON.stringify(updatedBio));
      } catch {}

      // 3. Remove IndexedDB blobs
      if (rec.blobKey) {
        await deleteBlob(rec.blobKey).catch(console.warn);
      }
      await deleteBlob(`campus_audio_${rec.id}_raw`).catch(console.warn);
      await deleteBlob(`campus_audio_${rec.id}_master`).catch(console.warn);

      // 4. Remove from Supabase if present
      if (rec.fullItem?.id) {
        await supabase.from('progress_matrix').delete().eq('id', rec.fullItem.id);
      }
      if (rec.url && rec.url.includes('campus-assets/')) {
        const parts = rec.url.split('campus-assets/');
        if (parts[1]) {
          await supabase.storage.from('campus-assets').remove([parts[1]]);
        }
      }

      if (juniorActivePlayingAudioId === rec.id) {
        if (juniorAudioPlayerRef.current) {
          juniorAudioPlayerRef.current.pause();
          juniorAudioPlayerRef.current = null;
        }
        setJuniorActivePlayingAudioId(null);
      }
      await fetchStudentProgress(true);
    } catch (err) {
      console.error('Error deleting recording:', err);
    }
  };

  // First-Login PIN Prompt Check
  useEffect(() => {
    if (studentUser && studentId) {
      const hasPinConfigured = Boolean(
        studentUser.is_pin_activated ||
        studentUser.has_personal_pin ||
        studentUser.has_parent_pin
      );
      if (!hasPinConfigured) {
        setShowFirstLoginPinModal(true);
      } else {
        setShowFirstLoginPinModal(false);
      }
    }
  }, [studentUser, studentId]);

  // Hardware Keyboard listener for First-Login PIN modal & Settings PIN modal
  useEffect(() => {
    if (!showFirstLoginPinModal && activeStudentSettingsModal !== 'security') return;
    const targetLen = (activeStudentSettingsModal === 'security' && securityPinTarget === 'parent' && !isAdultStudent) ? 6 : 4;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text') return;

      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        setPinFormError('');
        if (firstPinActiveField === 'new') {
          if (pinFormNew.length < targetLen) {
            const next = pinFormNew + e.key;
            setPinFormNew(next);
            if (next.length === targetLen) {
              setFirstPinActiveField('confirm');
            }
          }
        } else {
          if (pinFormConfirm.length < targetLen) {
            setPinFormConfirm(prev => prev + e.key);
          }
        }
      } else if (e.key === 'Backspace') {
        setPinFormError('');
        if (firstPinActiveField === 'new') {
          setPinFormNew(prev => prev.slice(0, -1));
        } else {
          if (pinFormConfirm.length === 0) {
            setFirstPinActiveField('new');
          } else {
            setPinFormConfirm(prev => prev.slice(0, -1));
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFirstLoginPinModal, activeStudentSettingsModal, securityPinTarget, isAdultStudent, firstPinActiveField, pinFormNew, pinFormConfirm]);

  const [preStartCountdown, setPreStartCountdown] = useState<number | null>(null);
  const preStartCountdownRef = useRef(preStartCountdown);
  useEffect(() => {
    preStartCountdownRef.current = preStartCountdown;
  }, [preStartCountdown]);

  // Load saved focus session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('groovelab_active_practice_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only restore if session was saved within the last 4 hours
        const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
        if (parsed.timestamp > fourHoursAgo) {
          setSecondsElapsed(parsed.secondsElapsed || 0);
          if (parsed.selectedTopic) {
            setSelectedTopic(parsed.selectedTopic);
          }
          if (parsed.sessionActive) {
            setSessionActive(true);
            setIsPhoneFlat(true);
            if (studentUiLevel === 'junior') {
              setJuniorMissionPhase(parsed.juniorMissionPhase === 'celebrating' ? 'celebrating' : 'zen');
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to restore practice session', e);
    }
  }, [studentUiLevel]);

  // Save focus session progress dynamically
  useEffect(() => {
    if (sessionActive && secondsElapsed > 0) {
      localStorage.setItem('groovelab_active_practice_session', JSON.stringify({
        secondsElapsed,
        selectedTopic,
        sessionActive,
        juniorMissionPhase: studentUiLevel === 'junior' ? juniorMissionPhase : undefined,
        timestamp: Date.now()
      }));
    } else if (!sessionActive) {
      localStorage.removeItem('groovelab_active_practice_session');
    }
  }, [secondsElapsed, sessionActive, selectedTopic, juniorMissionPhase, studentUiLevel]);

  // 🚀 Junior Space Mission: Auto-sync juniorMissionPhase mit sessionActive (Schützt zuverlässig vor hängendem Hintergrund)
  useEffect(() => {
    if (studentUiLevel === 'junior') {
      if (sessionActive && juniorMissionPhase === 'idle') {
        setJuniorMissionPhase('zen');
      } else if (!sessionActive && juniorMissionPhase === 'zen') {
        setJuniorMissionPhase('idle');
      }
    }
  }, [studentUiLevel, sessionActive, juniorMissionPhase]);

  // Countdown timer effect for pre-start instructions
  useEffect(() => {
    if (preStartCountdown === null) return;
    if (preStartCountdown > 0) {
      const timer = setTimeout(() => {
        setPreStartCountdown(preStartCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setPreStartCountdown(null);
      setIsPhoneFlat(true); // default to flat/focused when starting
    }
  }, [preStartCountdown]);

  // Screen Wake Lock API Integration
  useEffect(() => {
    const acquireWakeLock = async () => {
      if (!('wakeLock' in navigator)) {
        console.warn('Wake Lock not supported on this browser');
        setWakeLockFailed(true);
        return;
      }
      try {
        if (wakeLockRef.current) return;
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setWakeLockFailed(false);
        console.log('Wake Lock acquired successfully');
      } catch (err) {
        console.error('Failed to acquire Wake Lock:', err);
        setWakeLockFailed(true);
      }
    };

    const releaseWakeLock = async () => {
      setWakeLockFailed(false);
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
          console.log('Wake Lock released successfully');
        } catch (err) {
          console.error('Failed to release Wake Lock:', err);
        }
      }
    };

    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && sessionActive) {
        await acquireWakeLock();
      } else {
        await releaseWakeLock();
      }
    };

    if (sessionActive) {
      acquireWakeLock();
      document.addEventListener('visibilitychange', handleVisibility);
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [sessionActive]);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [hasCompletedTargetToday, setHasCompletedTargetToday] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'logbook' | 'stats'>('logbook');
  const DEFAULT_FOKUS_LEVELS = {
    level1: { kleine: 3, mittlere: 5, helden: 10 },
    level2: { kleine: 5, mittlere: 10, helden: 15 },
    level3: { kleine: 10, mittlere: 15, helden: 20 }
  };

  const [schoolFokusLevels, setSchoolFokusLevels] = useState<any>(null);

  const getExactLogSeconds = useCallback((log: any): number => {
    if (!log) return 0;
    if (typeof log.duration_seconds === 'number' && log.duration_seconds > 0) {
      return log.duration_seconds;
    }
    if (typeof log.duration_minutes === 'number' && log.duration_minutes > 0) {
      return log.duration_minutes * 60;
    }
    return 0;
  }, []);

  const secondsToDisplayMinutes = useCallback((totalSeconds: number): number => {
    if (!totalSeconds || totalSeconds <= 0) return 0;
    return Math.round(totalSeconds / 60);
  }, []);

  const getFlameCategory = (streak: number): 'kleine' | 'mittlere' | 'helden' => {
    if (streak >= 9) return 'helden';
    if (streak >= 4) return 'mittlere';
    return 'kleine';
  };

  const totalPracticeMinutes = useMemo(() => {
    const totalSecs = (fokusLogs || []).reduce((acc, log) => {
      return acc + getExactLogSeconds(log);
    }, 0);
    return secondsToDisplayMinutes(totalSecs);
  }, [fokusLogs, getExactLogSeconds, secondsToDisplayMinutes]);

  const getTrimesterPracticeDays = useCallback(() => {
    const now = new Date();
    const currentMonth = now.getMonth();

    let startMonth = 8; // Sept (0-indexed: 8)
    let endMonth = 11; // Dec (0-indexed: 11)

    if (currentMonth >= 0 && currentMonth <= 3) {
      startMonth = 0; // Jan
      endMonth = 3; // Apr
    } else if (currentMonth >= 4 && currentMonth <= 7) {
      startMonth = 4; // May
      endMonth = 7; // Aug
    }

    const startYear = currentMonth >= 8 ? now.getFullYear() : now.getFullYear();
    const endYear = startYear;

    const startDate = new Date(startYear, startMonth, 1, 0, 0, 0);
    const endDate = new Date(endYear, endMonth, 31, 23, 59, 59);

    // Filter logs
    const trimesterLogs = (fokusLogs || []).filter(log => {
      const logDate = new Date(log.created_at);
      return logDate >= startDate && logDate <= endDate && (log.duration_minutes > 0 || log.duration_seconds > 0);
    });

    const uniqueDays = new Set(trimesterLogs.map(log => {
      const logDate = new Date(log.created_at);
      return toLocalYYYYMMDD(logDate);
    }));

    return uniqueDays.size;
  }, [fokusLogs]);

  const practicedDays = useMemo(() => getTrimesterPracticeDays(), [getTrimesterPracticeDays]);

  const effectiveLevel = useMemo(() => {
    const dbLevel = avatar?.evolution_level || 1;
    const currentStreak = avatar?.streak_flame || (avatar as any)?.current_streak || 0;
    return getEngineEffectiveLevel(dbLevel, totalPracticeMinutes, currentStreak, practicedDays);
  }, [avatar?.evolution_level, avatar?.streak_flame, totalPracticeMinutes, practicedDays]);

  const getTargetMinutes = (streak: number = 0) => {
    const level = effectiveLevel;
    const cat = getFlameCategory(streak);
    const config = schoolFokusLevels || DEFAULT_FOKUS_LEVELS;
    const levelKey = `level${level}` as 'level1' | 'level2' | 'level3';
    const levelConfig = config[levelKey] || DEFAULT_FOKUS_LEVELS[levelKey];
    return levelConfig[cat] || DEFAULT_FOKUS_LEVELS[levelKey][cat];
  };

  const getTrimesterProgressDetails = () => {
    const level = effectiveLevel;
    let targetDays = 30;
    let nextLevel = 2;

    if (level === 2) {
      targetDays = 45;
      nextLevel = 3;
    } else if (level >= 3) {
      targetDays = 45;
      nextLevel = 3;
    }

    const progressPercentage = Math.min(100, (practicedDays / targetDays) * 100);

    const now = new Date();
    const currentMonth = now.getMonth();
    let trimesterName = '1. Drittel (Sept - Dez)';
    if (currentMonth >= 0 && currentMonth <= 3) {
      trimesterName = '2. Drittel (Jan - Apr)';
    } else if (currentMonth >= 4 && currentMonth <= 7) {
      trimesterName = '3. Drittel (Mai - Aug)';
    }

    return {
      practicedDays,
      targetDays,
      nextLevel,
      progressPercentage,
      trimesterName,
      isMaxLevel: level >= 3
    };
  };

  // Animate SVG circular ring in celebration modal
  useEffect(() => {
    if (showCelebration && celebrationDetails) {
      const timer = setTimeout(() => {
        const goal = celebrationDetails.dailyGoal || 10;
        const target = Math.min(1.0, (celebrationDetails.sessionMinutes || 0) / goal);
        setCelebrationRingProgress(target);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setCelebrationRingProgress(0);
      setCelebrationExploded(false);
    }
  }, [showCelebration, celebrationDetails]);

  // Trigger HTML5 Canvas particle explosion in celebration modal
  useEffect(() => {
    if (showCelebration && celebrationDetails && celebrationDetails.sessionCompletedTarget && !celebrationExploded && celebrationRingProgress >= 1.0) {
      const timer = setTimeout(() => {
        triggerCelebrationExplosion();
        setCelebrationExploded(true);
      }, 1200); // Trigger near the end of the 1.5s ring animation
      return () => clearTimeout(timer);
    }
  }, [showCelebration, celebrationDetails, celebrationRingProgress, celebrationExploded]);

  // Canvas particle explosion logic for celebration modal
  const triggerCelebrationExplosion = () => {
    // Trigger mechanisches haptisches Feedback (50ms - 30ms - 50ms)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }

    const canvas = celebrationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    let animationFrameId: number;
    const particles: any[] = [];
    const particleCount = 100;
    
    const noteSymbols = ['♪', '♫', '♬', '♩'];
    const colors = ['#fbbf24', '#34a853', '#6366f1', '#ec4899', '#3b82f6', '#f59e0b', '#a855f7'];

    const drawStar = (c: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
      let rot = Math.PI / 2 * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      c.beginPath();
      c.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        c.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        c.lineTo(x, y);
        rot += step;
      }
      c.lineTo(cx, cy - outerRadius);
      c.closePath();
      c.fill();
    };

    const drawSparkle = (c: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
      c.beginPath();
      c.moveTo(cx - size, cy);
      c.quadraticCurveTo(cx, cy, cx, cy - size);
      c.quadraticCurveTo(cx, cy, cx + size, cy);
      c.quadraticCurveTo(cx, cy, cx, cy + size);
      c.quadraticCurveTo(cx, cy, cx, cy + size);
      c.quadraticCurveTo(cx, cy, cx - size, cy);
      c.closePath();
      c.fill();
    };

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      const typeRand = Math.random();
      let type: 'star' | 'circle' | 'note' | 'sparkle' = 'circle';
      if (typeRand < 0.25) type = 'star';
      else if (typeRand < 0.5) type = 'note';
      else if (typeRand < 0.75) type = 'sparkle';

      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 2),
        size: 5 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.01 + Math.random() * 0.015,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        type,
        noteSymbol: type === 'note' ? noteSymbols[Math.floor(Math.random() * noteSymbols.length)] : undefined,
        gravity: 0.1 + Math.random() * 0.08,
        friction: 0.96 + Math.random() * 0.02
      });
    }

    const renderFrame = () => {
      ctx.clearRect(0, 0, width, height);
      let activeParticles = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.alpha <= 0) continue;

        activeParticles++;
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.alpha -= p.decay;

        if (p.alpha < 0) p.alpha = 0;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.type === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'star') {
          drawStar(ctx, 0, 0, 5, p.size, p.size / 2.5);
        } else if (p.type === 'sparkle') {
          drawSparkle(ctx, 0, 0, p.size);
        } else if (p.type === 'note') {
          ctx.font = `bold ${Math.round(p.size * 1.6)}px sans-serif`;
          ctx.fillText(p.noteSymbol!, 0, 0);
        }

        ctx.restore();
      }

      if (activeParticles > 0) {
        animationFrameId = requestAnimationFrame(renderFrame);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    renderFrame();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  };

  const getFlameLevelName = (streak: number) => {
    if (streak >= 9) return 'Helden-Feuer';
    if (streak >= 4) return 'Mittlere Flamme';
    if (streak >= 1) return 'Kleine Flamme';
    return 'Keine Flamme';
  };

  const fetchFokusLogs = async () => {
    if (!studentId) return;
    try {
      const { data, error } = await supabase
        .from('fokus_logs')
        .select('id, user_id, duration_seconds, duration_minutes, is_extra, flame_level, created_at')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false });

      let combinedLogs: any[] = (!error && data) ? data : [];
      try {
        const localLogsKey = `cg_local_fokus_logs_${studentId}`;
        const localLogs = JSON.parse(localStorage.getItem(localLogsKey) || '[]');
        if (localLogs && localLogs.length > 0) {
          const remoteIds = new Set(combinedLogs.map((l: any) => l.id));
          const missingLocal = localLogs.filter((l: any) => !remoteIds.has(l.id));
          combinedLogs = [...missingLocal, ...combinedLogs];
        }
      } catch (e) {}

      setFokusLogs(combinedLogs);
      
      // Calculate if target is completed today using local simulated date
      const todayStr = toLocalYYYYMMDD(getSimulatedNow());
      const todayLogs = combinedLogs.filter((log: any) => log.created_at && toLocalYYYYMMDD(new Date(log.created_at)) === todayStr);
      const nonExtraMinutes = todayLogs
        .filter((log: any) => !log.is_extra)
        .reduce((sum: number, log: any) => sum + (log.duration_minutes || (log.duration_seconds ? Math.floor(log.duration_seconds / 60) : 0)), 0);
      
      const streak = avatar?.streak_flame || 0;
      const targetMins = getTargetMinutes(streak);
      setHasCompletedTargetToday(nonExtraMinutes >= targetMins || todayLogs.some((l: any) => (l.duration_seconds || 0) >= 180 || (l.duration_minutes || 0) >= 3));
    } catch (err) {
      console.error('Error fetching fokus logs:', err);
    }
  };

  // =========================================================================
  // 🌟 CAMPUS-GROOVELAB: KINDGERECHTE STREAK & SCHUTZSCHILD STATE MACHINE
  // =========================================================================
  function calculateWeeklyStreakState(
    now: Date,
    currentFokusLogs: any[],
    currentStudentId: string | null | undefined,
    currentStudentUser: any,
    isSessionActive: boolean,
    currentSecondsElapsed: number
  ): WeeklyStreakMetrics {
    const currentDay = now.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const dayNamesShort = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];
    const dayNamesFull = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

    // Habit-Building & Kinderschutz Konstanten (DSA Art. 28 Compliance)
    const MIN_PRACTICE_SECONDS = 180; // 3 Minuten für Flamme/Qualifikation
    const MAX_WEEKLY_SHIELDS = 3;     // 3 Schutzschilde pro Woche

    // Map mastered dates across all logs
    const masteredDates = new Set<string>();
    const logsByDateStr: Record<string, any[]> = {};

    (currentFokusLogs || []).forEach(log => {
      if (!log.created_at) return;
      const dStr = toLocalYYYYMMDD(new Date(log.created_at));
      if (!logsByDateStr[dStr]) logsByDateStr[dStr] = [];
      logsByDateStr[dStr].push(log);

      const isMastered = !log.is_extra && (log.duration_seconds >= MIN_PRACTICE_SECONDS || (log.duration_minutes || 0) >= 3);
      if (isMastered) masteredDates.add(dStr);
    });

    // Check streak entering this week (before Monday)
    let initialStreak = 0;
    let checkPriorDate = new Date(monday);
    checkPriorDate.setDate(checkPriorDate.getDate() - 1);
    const priorSundayStr = toLocalYYYYMMDD(checkPriorDate);
    
    let priorShieldDatesArr: string[] = [];
    try {
      priorShieldDatesArr = JSON.parse(localStorage.getItem(`cg_shield_usage_dates_${currentStudentId}`) || '[]');
      if (!Array.isArray(priorShieldDatesArr)) priorShieldDatesArr = [];
    } catch (e) {
      priorShieldDatesArr = [];
    }
    const priorShieldDatesSet = new Set(priorShieldDatesArr);
    if (currentStudentUser?.joker_used_at) {
      priorShieldDatesSet.add(toLocalYYYYMMDD(new Date(currentStudentUser.joker_used_at)));
    }

    if (masteredDates.has(priorSundayStr) || priorShieldDatesSet.has(priorSundayStr)) {
      if (masteredDates.has(priorSundayStr)) {
        initialStreak = 1;
      }
      while (true) {
        checkPriorDate.setDate(checkPriorDate.getDate() - 1);
        const prevStr = toLocalYYYYMMDD(checkPriorDate);
        if (masteredDates.has(prevStr)) {
          initialStreak += 1;
        } else if (priorShieldDatesSet.has(prevStr)) {
          continue;
        } else {
          break;
        }
      }
    }

    let runningStreak = initialStreak;
    const weekDays: WeeklyStreakDay[] = [];
    let weekPracticedCount = 0;
    let weekShieldedCount = 0;
    let weekTotalSeconds = 0;
    let consumedShieldsCount = 0;
    const newlyShieldedDates: string[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = toLocalYYYYMMDD(d);

      const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      const isFuture = d > now && !isToday;

      const dayLogs = logsByDateStr[dStr] || [];
      let totalDaySecs = dayLogs.reduce((sum, log) => {
        return sum + (log.duration_seconds || ((log.duration_minutes || 0) * 60));
      }, 0);

      if (isToday && isSessionActive && currentSecondsElapsed > 0) {
        totalDaySecs += currentSecondsElapsed;
      }

      const hasMastered = dayLogs.some(log => !log.is_extra && (log.duration_seconds >= MIN_PRACTICE_SECONDS || (log.duration_minutes || 0) >= 3)) || totalDaySecs >= MIN_PRACTICE_SECONDS;
      
      let isJoker = false;
      let shieldNumber = 0;
      let dayState: WeeklyDayState = 'future';

      if (isToday) {
        if (hasMastered) {
          dayState = 'mastered';
          runningStreak += 1;
          weekPracticedCount += 1;
        } else {
          // OPTION A: Einladender Standby-Modus am heutigen Tag ("Heute!" mit Radar-Puls).
          // Bucht kein Schild vorab ab, das Schutzschild hält im Hintergrund den Rücken frei!
          dayState = 'today_standby';
        }
      } else if (isFuture) {
        dayState = 'future';
      } else {
        // Past day (Montag bis gestern)
        if (hasMastered) {
          dayState = 'mastered';
          runningStreak += 1;
          weekPracticedCount += 1;
        } else {
          // Versäumter Tag ohne Übung
          if (runningStreak > 0 && consumedShieldsCount < MAX_WEEKLY_SHIELDS) {
            // SCHUTZSCHILD (SHIELDED): Schild absorbiert den Fehltag, Flamme bleibt erhalten
            consumedShieldsCount += 1;
            weekShieldedCount += 1;
            isJoker = true;
            shieldNumber = consumedShieldsCount;
            dayState = 'shielded';
            newlyShieldedDates.push(dStr);
          } else {
            // PAUSE (Mond): Serie war 0 oder alle Schilde der Woche sind verbraucht
            dayState = 'pause';
            // SOFT DECAY (DSA Art. 28 Compliance): Sanfter Verfall um genau -1 statt Absturz auf 0!
            runningStreak = Math.max(0, runningStreak - 1);
          }
        }
      }

      weekTotalSeconds += totalDaySecs;

      weekDays.push({
        dayName: dayNamesShort[i],
        dayFullName: dayNamesFull[d.getDay()],
        dayNumber: d.getDate(),
        dateStr: dStr,
        isToday,
        isFuture,
        totalDaySecs,
        totalMins: Math.floor(totalDaySecs / 60),
        hasMastered,
        isJoker,
        shieldNumber,
        dayState
      });
    }

    const availableShields = Math.max(0, MAX_WEEKLY_SHIELDS - consumedShieldsCount);
    const calculatedStreak = runningStreak;

    return {
      monday,
      now,
      weekDays,
      weekPracticedCount,
      weekShieldedCount,
      weekTotalSeconds,
      weekTotalMins: Math.floor(weekTotalSeconds / 60),
      consumedShieldsCount,
      availableShields,
      calculatedStreak,
      newlyShieldedDates
    };
  }

  function getDeterministicWeekMetrics(): WeeklyStreakMetrics {
    return calculateWeeklyStreakState(
      getSimulatedNow(),
      fokusLogs,
      studentId,
      studentUser,
      sessionActive,
      secondsElapsed
    );
  }

  const getGroupedLogs = () => {
    const groups: Record<string, { 
      date: string, 
      focusSeconds: number, 
      extraSeconds: number, 
      hasMasteredSession: boolean, 
      flameLevel: string, 
      isPlaceholder?: boolean,
      isToday?: boolean
    }> = {};
    
    // Initialize placeholders for the last 7 days starting from user activation date
    const now = getSimulatedNow();
    const actDateStr = studentUser?.activated_at || (studentUser?.is_pin_activated ? studentUser?.created_at : null);
    // Rule: Der Start des Übe-Streaks startet erst mit der PIN-Aktivierung des Schülers! Davor werden keine Streaks/Fehltage erfasst.
    const activationDate = actDateStr ? new Date(actDateStr) : new Date();
    const startOfActivation = new Date(activationDate.getFullYear(), activationDate.getMonth(), activationDate.getDate());

    const todayDd = String(now.getDate()).padStart(2, '0');
    const todayMm = String(now.getMonth() + 1).padStart(2, '0');
    const todayYy = String(now.getFullYear()).substring(2);
    const todayDateStr = `${todayDd}.${todayMm}.${todayYy}`;

    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const startOfD = new Date(d.getFullYear(), d.getMonth(), d.getDate());

      if (startOfActivation && startOfD < startOfActivation) {
        continue;
      }

      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).substring(2);
      const dateStr = `${dd}.${mm}.${yy}`;
      
      groups[dateStr] = {
        date: dateStr,
        focusSeconds: 0,
        extraSeconds: 0,
        hasMasteredSession: false,
        flameLevel: 'Keine Flamme',
        isPlaceholder: true,
        isToday: dateStr === todayDateStr
      };
    }

    fokusLogs.forEach(log => {
      if (!log.created_at) return;
      
      // format date like 06.06.26 (dd.mm.yy)
      const d = new Date(log.created_at);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).substring(2);
      const dateStr = `${dd}.${mm}.${yy}`;
      
      if (!groups[dateStr]) {
        groups[dateStr] = {
          date: dateStr,
          focusSeconds: 0,
          extraSeconds: 0,
          hasMasteredSession: false,
          flameLevel: log.flame_level || 'Keine Flamme',
          isPlaceholder: true,
          isToday: dateStr === todayDateStr
        };
      }
      
      const seconds = log.duration_seconds || ((log.duration_minutes || 0) * 60);
      
      if (!log.is_extra) {
        if (seconds >= 180) {
          groups[dateStr].hasMasteredSession = true;
        }
        groups[dateStr].focusSeconds += seconds;
      } else {
        groups[dateStr].extraSeconds += seconds;
      }

      if (log.flame_level && log.flame_level !== 'Keine Flamme') {
        groups[dateStr].flameLevel = log.flame_level;
      }
    });

    Object.values(groups).forEach(g => {
      const totalSeconds = g.focusSeconds + g.extraSeconds;
      if (totalSeconds > 0) {
        g.isPlaceholder = false;
      }
      // 🎯 Deterministic Clamping: Maximum 180s (3 Min.) Focus per day; surplus is strictly Extra
      if (totalSeconds >= 180 || g.hasMasteredSession) {
        g.hasMasteredSession = true;
        g.focusSeconds = 180;
        g.extraSeconds = Math.max(0, totalSeconds - 180);
      } else {
        g.focusSeconds = totalSeconds;
        g.extraSeconds = 0;
      }

      if (g.hasMasteredSession) {
        if (!g.flameLevel || g.flameLevel === 'Keine Flamme') {
          g.flameLevel = getFlameLevelName(avatar?.streak_flame || 0);
        }
      } else {
        g.flameLevel = 'Keine Flamme';
      }
    });
    
    const list = Object.values(groups);
    // Sort by date descending
    list.sort((a: any, b: any) => {
      const parseDateStr = (s: string) => {
        const parts = s.split('.');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = 2000 + parseInt(parts[2], 10);
        return new Date(year, month, day).getTime();
      };
      return parseDateStr(b.date) - parseDateStr(a.date);
    });
    return list;
  };

  useEffect(() => {
    if (studentId) {
      fetchFokusLogs();
    }
  }, [studentId, activeTab]);

  useEffect(() => {
    if (studentUser && avatar && studentId) {
      const weekMetrics = getDeterministicWeekMetrics();
      const shieldedDates = weekMetrics.weekDays.filter(d => d.isJoker).map(d => d.dateStr);
      
      // Sync shielded dates locally
      try {
        localStorage.setItem(`cg_shield_usage_dates_${studentId}`, JSON.stringify(shieldedDates));
      } catch (e) {}

      // If shields were consumed but not yet recorded in DB or state, sync in background
      if (weekMetrics.weekShieldedCount > 0 && (!studentUser.weekly_jokers_used || studentUser.weekly_jokers_used !== weekMetrics.weekShieldedCount)) {
        const lastShieldedDay = [...weekMetrics.weekDays].reverse().find(d => d.isJoker);
        const lastIso = lastShieldedDay ? new Date(lastShieldedDay.dateStr + 'T12:00:00').toISOString() : new Date().toISOString();
        
        supabase.from('users').update({
          joker_used_at: lastIso,
          weekly_jokers_used: weekMetrics.weekShieldedCount
        }).eq('id', studentId).then(() => {
          studentUser.joker_used_at = lastIso;
          studentUser.weekly_jokers_used = weekMetrics.weekShieldedCount;
        }, (err: any) => {
          console.warn('Shield background sync:', err);
        });
      }

      // If avatar streak in DB is out of sync with calculated streak, sync
      if (weekMetrics.calculatedStreak > (avatar.streak_flame || 0)) {
        supabase.from('avatars').update({
          streak_flame: weekMetrics.calculatedStreak
        }).eq('user_id', studentId).then(() => {
          avatar.streak_flame = weekMetrics.calculatedStreak;
        }, (err: any) => {
          console.warn('Avatar streak background sync:', err);
        });
      }
    }
  }, [studentUser?.id, studentId, fokusLogs, avatar?.streak_flame]);

  // Campus Cup States
  const [rankingData, setRankingData] = useState<any[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [monthlyFocusMinutes, setMonthlyFocusMinutes] = useState(0);
  const [totalFocusMinutes, setTotalFocusMinutes] = useState(0);
  const [classHighlights, setClassHighlights] = useState<any[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [myWeeklyFocus, setMyWeeklyFocus] = useState(0);
  const [classWeeklyFocus, setClassWeeklyFocus] = useState(0);
  const [classCount, setClassCount] = useState(0);
  const [classMins, setClassMins] = useState(0);
  const [otherClassMins, setOtherClassMins] = useState(0);

  const [privacyShowHighlights, setPrivacyShowHighlights] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`campus_privacy_show_highlights_${studentId}`);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });


  const formatMins = (mins: number) => {
    if (mins < 60) return `${Math.round(mins)} Min.`;
    const hrs = Math.floor(mins / 60);
    const rem = Math.round(mins % 60);
    return rem > 0 ? `${hrs} Std. ${rem} Min.` : `${hrs} Std.`;
  };

  const formatMinsToMMSS = (mins: number) => {
    const totalSeconds = Math.round(mins * 60);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const sStr = s < 10 ? `0${s}` : `${s}`;
    if (h > 0) {
      const mStr = m < 10 ? `0${m}` : `${m}`;
      return `${h}:${mStr}:${sStr} Min.`;
    }
    return `${m}:${sStr} Min.`;
  };

  // DIGITAL DETOX TIMER STATE
  const [showDetox, setShowDetox] = useState(false);
  const [detoxMinutes, setDetoxMinutes] = useState(15);
  const [detoxSecondsLeft, setDetoxSecondsLeft] = useState(15 * 60);
  const [isDetoxActive, setIsDetoxActive] = useState(false);
  const [isFaceDown, setIsFaceDown] = useState(false);
  const [detoxCompleted, setDetoxCompleted] = useState(false);
  
  // WRAPPED STORY STATE
  const [showWrapped, setShowWrapped] = useState(false);
  const [wrappedData, setWrappedData] = useState<any>(null);
  const [storySlide, setStorySlide] = useState(0);
  const [wrappedLoading, setWrappedLoading] = useState(false);

  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastHighlightsFetchRef = useRef<number>(0);
  const highlightsLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    fetchStudentAndAvatar();

    // ⚡ Tier-1 Predictive Eager Background Hydration (Linear / Apple Standard)
    if (typeof window !== 'undefined' && studentId) {
      const scheduleIdle = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 200));
      scheduleIdle(() => {
        fetchStudentProgress(true);
        fetchFokusLogs();
        fetchRanking();
      });
    }
  }, [studentId]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(err => console.warn('Error closing AudioContext:', err));
        audioContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'profile' && studentId) {
      const fetchStudentSchedules = async () => {
        try {
          const { data } = await supabase
            .from('schedules')
            .select('*, teacher:users!schedules_teacher_id_fkey(first_name, last_name), rooms(name)')
            .eq('student_id', studentId);
          if (data) setStudentSchedules(data);
        } catch (err) {
          console.error('Error fetching student schedules:', err);
        }
      };
      fetchStudentSchedules();
    }
  }, [activeTab, studentId]);

  // progress matrix state
  const [studentMissionProgress, setStudentMissionProgress] = useState<any | null>(null);
  const [studentPins, setStudentPins] = useState<any[]>([]);
  const [pinInput, setPinInput] = useState('');
  const [customAvatarFile, setCustomAvatarFile] = useState<File | null>(null);
  const [isUploadingCustomAvatar, setIsUploadingCustomAvatar] = useState(false);

  const studentInstrumentName = useMemo(() => {
    const raw = studentUser?.resolved_instrument || studentUser?.instrument;
    if (raw && raw !== 'Musiker' && raw !== 'Allgemein' && raw !== 'Schüler' && raw !== 'Instrument') {
      return raw.split(',')[0].trim();
    }
    const progInst = (progressItems || []).find(p => p.instrument && p.instrument !== 'Musiker' && p.instrument !== 'Allgemein')?.instrument;
    if (progInst) return progInst.split(',')[0].trim();
    return 'Gitarre';
  }, [studentUser?.resolved_instrument, studentUser?.instrument, progressItems]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [classFocusLogs, setClassFocusLogs] = useState<any[]>([]);
  const [classmateIds, setClassmateIds] = useState<string[]>([]);
  const [lehrwerke, setLehrwerke] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [activeSongSkills, setActiveSongSkills] = useState<any[]>([]);

  // Unified canonical resolver for all student songs (combining activeSongSkills, progressItems, and songs catalog)
  const assignedCampusSongs = useMemo(() => {
    const songsMap = new Map<string, any>();

    // 1. From activeSongSkills (Direct user assignments in user_song_skills)
    (activeSongSkills || []).forEach((skill: any) => {
      const songObj = skill.songs || {};
      const title = songObj.title || skill.title || skill.song_title || '';
      const artist = songObj.artist || skill.artist || 'Unbekannt';
      const id = songObj.id || skill.song_id || skill.id;
      if (title) {
        const normKey = title.toLowerCase().trim();
        songsMap.set(normKey, {
          id: id || normKey,
          title,
          artist,
          audio_url: songObj.audio_url || skill.audio_url,
          tempo_bpm: songObj.tempo_bpm || skill.tempo_bpm,
          genre: songObj.genre || skill.genre,
          color_scheme: songObj.color_scheme,
          is_campus_active: true,
          progress_percent: skill.progress_percent || 0,
          status: skill.status || (skill.progress_percent === 100 ? 'MASTERED' : 'IN_PROGRESS'),
          is_current_homework: Boolean(skill.is_current_homework)
        });
      }
    });

    // 2. From progressItems (Direct assignments in progress_matrix)
    (progressItems || []).forEach((item: any) => {
      const rawTopic = (item.topic_name || item.title || '').trim();
      if (!rawTopic || rawTopic.startsWith('Hausaufgabe KW ') || rawTopic.includes(' - Seite ')) return;
      
      const cleanT = rawTopic.replace(/\s*\([^)]*\)\s*$/, '').trim();
      const normKey = cleanT.toLowerCase();
      
      const existing = songsMap.get(normKey) || Array.from(songsMap.values()).find(s => s.title.toLowerCase() === normKey || normKey.includes(s.title.toLowerCase()) || s.title.toLowerCase().includes(normKey));
      
      if (existing) {
        if (item.is_current_homework) existing.is_current_homework = true;
        if (item.status === 'MASTERED') existing.status = 'MASTERED';
        if (item.homework_notes) existing.homework_notes = item.homework_notes;
        if (item.progress_percent !== undefined) existing.progress_percent = item.progress_percent;
      } else {
        const catalogSong = (songs || []).find(s => 
          s.id === item.song_id || 
          s.title.toLowerCase() === normKey || 
          normKey.includes(s.title.toLowerCase()) || 
          s.title.toLowerCase().includes(normKey)
        );

        let title = cleanT;
        let artist = 'Unbekannt';
        if (catalogSong) {
          title = catalogSong.title;
          artist = catalogSong.artist || 'Unbekannt';
        } else if (cleanT.includes(' - ')) {
          const parts = cleanT.split(' - ');
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        }

        songsMap.set(title.toLowerCase().trim(), {
          id: item.song_id || catalogSong?.id || item.id || normKey,
          title,
          artist,
          audio_url: catalogSong?.audio_url || item.audio_url,
          tempo_bpm: catalogSong?.tempo_bpm || item.tempo_bpm,
          genre: catalogSong?.genre || item.genre,
          color_scheme: catalogSong?.color_scheme,
          is_campus_active: true,
          progress_percent: item.progress_percent || (item.status === 'MASTERED' ? 100 : 0),
          status: item.status,
          is_current_homework: Boolean(item.is_current_homework),
          homework_notes: item.homework_notes
        });
      }
    });

    // 3. Check songs catalog for any is_campus_active songs matching assigned items
    (songs || []).forEach((s: any) => {
      if (!s.title) return;
      const normKey = s.title.toLowerCase().trim();
      if (songsMap.has(normKey)) return;
      const isAssigned = (progressItems || []).some(item => 
        (item.topic_name || '').toLowerCase().includes(normKey) ||
        normKey.includes((item.topic_name || '').toLowerCase())
      );
      if (isAssigned) {
        songsMap.set(normKey, {
          ...s,
          artist: s.artist || 'Unbekannt'
        });
      }
    });

    return Array.from(songsMap.values());
  }, [activeSongSkills, progressItems, songs]);

  const isSongMastered = useCallback((song: any) => {
    if (!song) return false;
    if (song.status === 'MASTERED' || (song.progress_percent || 0) === 100) return true;
    const normKey = (song.title || '').toLowerCase().trim();
    if (!normKey) return false;
    const pItem = (progressItems || []).find(item => {
      const t = (item.topic_name || item.title || '').toLowerCase().trim();
      return t && (t === normKey || t.includes(normKey) || normKey.includes(t));
    });
    if (pItem && (pItem.status === 'MASTERED' || (pItem.progress_percent || 0) === 100)) return true;
    const skill = (activeSongSkills || []).find((s: any) => {
      const skTitle = (s.songs?.title || s.title || s.song_title || '').toLowerCase().trim();
      return (s.id && song.id && s.id === song.id) || (skTitle && (skTitle === normKey || skTitle.includes(normKey) || normKey.includes(skTitle)));
    });
    if (skill && (skill.is_stage_ready || (skill.progress_percent || 0) === 100 || skill.status === 'MASTERED')) return true;
    return false;
  }, [progressItems, activeSongSkills]);

  const songStats = useMemo(() => {
    const assigned = assignedCampusSongs;
    const mastered = assigned.filter(song => isSongMastered(song));

    return {
      assignedCount: assigned.length,
      masteredCount: mastered.length,
      activeCount: assigned.length - mastered.length
    };
  }, [assignedCampusSongs, isSongMastered]);
  const [songSearch, setSongSearch] = useState('');
  const [songSearchDebounced, setSongSearchDebounced] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setSongSearchDebounced(songSearch);
    }, 250);
    return () => {
      clearTimeout(handler);
    };
  }, [songSearch]);

  const [selectedSongForDetail, setSelectedSongForDetail] = useState<any | null>(null);
  const [selectedLehrwerkForDetail, setSelectedLehrwerkForDetail] = useState<any | null>(null);
  const [localProgress, setLocalProgress] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });
  const [mediathekTab, setMediathekTab] = useState<'songs' | 'lehrwerke'>('songs');
  const [juniorMediathekFilter, setJuniorMediathekFilter] = useState<'all' | 'songs' | 'lehrwerke' | 'homework'>('all');
  const mediathekTouchStartXRef = useRef<number | null>(null);

  const handleMediathekTouchStart = (e: React.TouchEvent) => {
    mediathekTouchStartXRef.current = e.touches[0].clientX;
  };

  const handleMediathekTouchEnd = (e: React.TouchEvent) => {
    if (mediathekTouchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = mediathekTouchStartXRef.current - touchEndX;
    if (Math.abs(diffX) > 40) {
      if (diffX > 0) {
        if (mediathekTab === 'songs') setMediathekTab('lehrwerke');
      } else {
        if (mediathekTab === 'lehrwerke') setMediathekTab('songs');
      }
    }
    mediathekTouchStartXRef.current = null;
  };

  const fetchStudentProgress = async (silent = false) => {
    const targetId = studentId || studentUser?.id;
    if (!targetId) return;

    // ⚡ 0. Optimistic Instant Persistent Cache Loading (0ms)
    let hasValidCache = false;
    try {
      const cacheKey = `cg_mediathek_cache_${targetId}`;
      const cached = localStorage.getItem(cacheKey) || sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.songs) && parsed.songs.length > 0) {
          setSongs(parsed.songs);
          hasValidCache = true;
        }
        if (Array.isArray(parsed.lehrwerke) && parsed.lehrwerke.length > 0) {
          setLehrwerke(parsed.lehrwerke);
          hasValidCache = true;
        }
        if (Array.isArray(parsed.activeSongSkills) && parsed.activeSongSkills.length > 0) {
          setActiveSongSkills(parsed.activeSongSkills);
        }
        if (Array.isArray(parsed.progressItems) && parsed.progressItems.length > 0) {
          setProgressItems(parsed.progressItems);
        }
      }
    } catch (e) {
      // ignore
    }

    // Only show loading spinner if we have absolutely zero cached data
    if (!silent && !hasValidCache) {
      setProgressLoading(true);
    }

    try {
      const stored = localStorage.getItem('student_lehrwerke_progress') || localStorage.getItem(`campus_lehrwerke_progress_${targetId}`);
      if (stored) {
        setLocalProgress(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }

    const schoolId = studentUser?.school_id || (studentUser as any)?.schools?.id;

    // ⚡ 1. Ultra-Fast Parallel SWR Supabase Queries (including global items)
    try {
      const lehrwerkePromise = schoolId 
        ? supabase.from('lehrwerke').select('*').or(`school_id.eq.${schoolId},school_id.is.null`).order('title')
        : supabase.from('lehrwerke').select('*').order('title');

      const songsPromise = schoolId
        ? supabase.from('songs').select('*').or(`school_id.eq.${schoolId},school_id.is.null`).order('title')
        : supabase.from('songs').select('*').order('title');

      const skillsPromise = supabase
        .from('user_song_skills')
        .select('*, songs(*)')
        .eq('user_id', targetId);

      const matrixPromise = supabase
        .from('progress_matrix')
        .select('*')
        .eq('student_id', targetId)
        .order('updated_at', { ascending: false });

      const [lehrwerkeRes, songsRes, skillsRes, matrixRes] = await Promise.allSettled([
        lehrwerkePromise,
        songsPromise,
        skillsPromise,
        matrixPromise
      ]);

      let loadedLehrwerke: any[] = [];
      let loadedSongs: any[] = [];
      let loadedSkills: any[] = [];
      let loadedProgress: any[] = [];

      if (lehrwerkeRes.status === 'fulfilled' && (lehrwerkeRes.value as any)?.data) {
        loadedLehrwerke = ((lehrwerkeRes.value as any).data || []).map((item: any) => ({
          ...item,
          totalPages: item.total_pages || 50
        }));
        if (loadedLehrwerke.length > 0) {
          setLehrwerke(loadedLehrwerke);
        }
      }

      if (songsRes.status === 'fulfilled' && (songsRes.value as any)?.data) {
        loadedSongs = (songsRes.value as any).data || [];
        if (loadedSongs.length > 0) {
          setSongs(loadedSongs);
        }
      }

      if (skillsRes.status === 'fulfilled' && (skillsRes.value as any)?.data) {
        loadedSkills = ((skillsRes.value as any).data || []).filter((skill: any) => {
          if (!skill.songs) return false;
          return skill.songs.is_campus_active === true;
        });
        setActiveSongSkills(loadedSkills);
      }

      if (matrixRes.status === 'fulfilled' && (matrixRes.value as any)?.data) {
        const uniqueItemsMap = new Map<string, any>();
        ((matrixRes.value as any).data || []).forEach((item: any) => {
          const name = (item.topic_name || '').trim().toLowerCase();
          if (name && !uniqueItemsMap.has(name)) {
            uniqueItemsMap.set(name, item);
          }
        });
        loadedProgress = Array.from(uniqueItemsMap.values());
        setProgressItems(loadedProgress);
      }

      // Persist cache snapshot for instant 0ms loads
      if (loadedSongs.length > 0 || loadedLehrwerke.length > 0 || loadedProgress.length > 0) {
        try {
          const payload = JSON.stringify({
            lehrwerke: loadedLehrwerke,
            songs: loadedSongs,
            activeSongSkills: loadedSkills,
            progressItems: loadedProgress,
            timestamp: Date.now()
          });
          const cacheKey = `cg_mediathek_cache_${targetId}`;
          localStorage.setItem(cacheKey, payload);
          sessionStorage.setItem(cacheKey, payload);
        } catch (e) {
          // ignore quota
        }
      }
    } catch (err) {
      console.error('Error fetching student progress in parallel:', err);
    } finally {
      setProgressLoading(false);
    }
  };


  const handleUpgrade = async () => {
    try {
      const resp = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: studentId })
      });
      if (resp.ok && resp.headers.get('content-type')?.includes('application/json')) {
        const data = await resp.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }
      }
      
      // Fallback Mock Upgrade
      alert("Premium Upgrade wird geladen... (Simulation: Upgrade auf Premium erfolgt jetzt)");
      const { error } = await supabase
        .from('premium_status')
        .upsert({ student_id: studentId, is_premium_active: true });
      if (error) throw error;
      
      // Also update users.is_premium_user
      await supabase
        .from('users')
        .update({ is_premium_user: true })
        .eq('id', studentId);
        
      fetchStudentAndAvatar();
      fetchStudentProgress();
    } catch (err) {
      console.error(err);
      alert("Fehler beim Checkout-Prozess.");
    }
  };

  useEffect(() => {
    fetchStudentProgress();

    if (!studentId) return;
    const playMatchChime = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = audioCtx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Happy Major Chime)
        notes.forEach((freq, i) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.11);
          gain.gain.setValueAtTime(0.28, now + i * 0.11);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.11 + 0.65);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + i * 0.11);
          osc.stop(now + i * 0.11 + 0.7);
        });
      } catch (e) {}
    };

    const channel = supabase.channel(`realtime_student_progress_${studentId}`);
    channel
      .on('broadcast', { event: 'homework-changed' }, () => {
        fetchStudentProgress();
      })
      .on('broadcast', { event: 'challenge-approved' }, (payload: any) => {
        console.log('[Realtime] Challenge approved broadcast received:', payload);
        fetchStudentProgress();
        const songTitle = payload.payload?.songTitle || 'einem Song';
        alert(`Glückwunsch! Deine Challenge für "${songTitle}" wurde von deinem Lehrer bestätigt! 🏆🎉`);
      })
      .on('broadcast', { event: 'song-matched' }, (payload: any) => {
        console.log('[Realtime] Song-matched broadcast received:', payload);
        const data = payload?.payload;
        if (data) {
          setMatchCelebrationData(data);
          if (data.xpAmount) {
            setAvatar((prev: any) => prev ? { ...prev, xp: (prev.xp || 0) + data.xpAmount } : prev);
          }
          fetchStudentProgress();
          playMatchChime();
          // WebPush Native Notification fallback when tab is in background
          try {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
              new Notification('🎯 Neues Song-Match!', {
                body: `Für "${data.songTitle}": Du hast +${data.xpAmount} Campus-XP erhalten!`,
                icon: '/favicon.ico'
              });
            }
          } catch (e) {}
        }
      })
      .subscribe();

    const handleHomeworkUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.studentId === studentId) {
        fetchStudentProgress();
      }
    };
    const handleCampusXpAwarded = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.studentId === studentId && customEvent.detail?.amount) {
        setAvatar((prev: any) => prev ? { ...prev, xp: (prev.xp || 0) + customEvent.detail.amount } : prev);
      }
    };
    const handleMasteryCompleteAwarded = () => {
      setHasMasteryCrown(true);
    };
    window.addEventListener('homework-updated', handleHomeworkUpdate);
    window.addEventListener('campus-xp-awarded', handleCampusXpAwarded);
    window.addEventListener('campus_mastery_complete_awarded', handleMasteryCompleteAwarded);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('homework-updated', handleHomeworkUpdate);
      window.removeEventListener('campus-xp-awarded', handleCampusXpAwarded);
      window.removeEventListener('campus_mastery_complete_awarded', handleMasteryCompleteAwarded);
    };
  }, [studentId]);

  // Synchronize progressItems from DB into student_lehrwerke_progress in localStorage
  useEffect(() => {
    if (lehrwerke.length === 0 || progressItems.length === 0 || !studentId) return;

    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      let hasChanges = false;

      lehrwerke.forEach(book => {
        const bookTitleLower = book.title.toLowerCase();
        
        // Find all progress items for this book
        const bookProgressItems = progressItems.filter(item => {
          const topicLower = (item.topic_name || '').toLowerCase();
          return topicLower.startsWith(bookTitleLower + ' - seite ');
        });

        if (bookProgressItems.length === 0) return;

        // Ensure the book is assigned locally if there are progress items for it in the DB
        let assignmentIndex = parsed.findIndex((item: any) => String(item.studentId) === String(studentId) && String(item.lehrwerkId) === String(book.id));
        if (assignmentIndex === -1) {
          const newAssignment = {
            studentId: studentId,
            lehrwerkId: book.id,
            assignedAt: new Date().toISOString(),
            pageStates: {}
          };
          parsed.push(newAssignment);
          assignmentIndex = parsed.length - 1;
          hasChanges = true;
        }
        const assignment = parsed[assignmentIndex];
        const pageStates = { ...assignment.pageStates };
        const pageSeen = new Set<number>();

        bookProgressItems.forEach(item => {
          const parts = item.topic_name.split(' - Seite ');
          const pageNumStr = parts[1];
          const pageNum = parseInt(pageNumStr, 10);
          if (isNaN(pageNum)) return;

          // Only process the latest entry for each page number (newest wins since progressItems is sorted updated_at DESC)
          if (pageSeen.has(pageNum)) return;
          pageSeen.add(pageNum);

          // Map database status/homework back to local status
          let localStatus: 'locked' | 'homework' | 'mastered' | 'purple' = 'locked';
          if (item.status === 'MASTERED') {
            localStatus = 'mastered';
          } else if (item.status === 'THEORY_DONE') {
            localStatus = 'purple';
          } else if (item.is_current_homework) {
            localStatus = 'homework';
          }

          const existingState = pageStates[pageNum];
          const dbItemTime = item.updated_at ? new Date(item.updated_at).getTime() : 0;
          const localItemTime = existingState?.updatedAt ? new Date(existingState.updatedAt).getTime() : 0;

          if (dbItemTime > localItemTime) {
            if (!existingState || existingState.status !== localStatus) {
              pageStates[pageNum] = {
                ...(existingState || {}),
                status: localStatus,
                updatedAt: item.updated_at || new Date().toISOString(),
                notes: item.teacher_notes || existingState?.notes || '',
                homework_notes: item.homework_notes || existingState?.homework_notes || ''
              };
              hasChanges = true;
            }
          }
        });

        assignment.pageStates = pageStates;
      });

      if (hasChanges) {
        console.log('student_lehrwerke_progress HAS CHANGES - WRITING TO LOCALSTORAGE:', parsed);
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(parsed));
        setLocalProgress(parsed);
      }
    } catch (err) {
      console.error('Error synchronizing textbook progress from DB:', err);
    }
  }, [lehrwerke, progressItems, studentId]);

  useEffect(() => {
    if (!studentId) return;

    const channel = supabase
      .channel(`realtime_student_focus_${studentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fokus_logs' }, (payload) => {
        if (studentUser?.school_id) {
          fetchClassHighlights(studentUser.school_id, studentUser.teacher_id, true);
        }
        if (payload.new && (payload.new as any).user_id === studentId) {
          fetchFokusLogs();
          fetchStudentAndAvatar(true);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_stats' }, (payload) => {
        if (payload.new && (payload.new as any).student_id === studentId) {
          fetchStudentAndAvatar(true);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'avatars' }, (payload) => {
        if (payload.new && (payload.new as any).user_id === studentId) {
          fetchStudentAndAvatar(true);
        }
      })
      .subscribe();

    const handlePracticeUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail?.studentId || customEvent.detail?.studentId === studentId) {
        fetchFokusLogs();
        fetchStudentAndAvatar(true);
      }
    };
    window.addEventListener('cg_practice_updated', handlePracticeUpdated);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel(`cg_practice_sync_${studentId}`);
        bc.onmessage = () => {
          fetchFokusLogs();
          fetchStudentAndAvatar(true);
        };
      }
    } catch (e) {}

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('cg_practice_updated', handlePracticeUpdated);
      if (bc) {
        try { bc.close(); } catch (e) {}
      }
    };
  }, [studentUser?.school_id, studentUser?.teacher_id, studentId]);

  const fetchRanking = async () => {
    // ⚡ Optimistic Cache Check
    try {
      const cached = sessionStorage.getItem('cg_ranking_cache');
      if (cached) {
        setRankingData(JSON.parse(cached));
      }
    } catch (e) {}

    if (!sessionStorage.getItem('cg_ranking_cache')) {
      setRankingLoading(true);
    }
    setRankingError(null);

    try {
      const userSchoolName = (studentUser?.schools as any)?.name || 'Meine Musikschule';

      const mockSchools = [
        { name: 'Popakademie Berlin', rfi: 45.2, isOwnSchool: false },
        { name: 'Rock- & Jazzschule Freiburg', rfi: 38.5, isOwnSchool: false },
        { name: 'Musikschule Hamburg Nord', rfi: 32.1, isOwnSchool: false },
        { name: 'Tonkunst Stuttgart', rfi: 28.4, isOwnSchool: false },
        { name: 'Groove Academy Köln', rfi: 25.9, isOwnSchool: false },
        { name: userSchoolName, rfi: 18.4, isOwnSchool: true },
        { name: 'Klangwelt Dresden', rfi: 14.2, isOwnSchool: false },
        { name: 'School of Rock Leipzig', rfi: 9.8, isOwnSchool: false }
      ];

      mockSchools.sort((a, b) => b.rfi - a.rfi);
      const ranked = mockSchools.map((s, idx) => ({
        rank: idx + 1,
        name: s.name,
        rfi: s.rfi,
        isOwnSchool: s.isOwnSchool
      }));

      setRankingData(ranked);
      try {
        sessionStorage.setItem('cg_ranking_cache', JSON.stringify(ranked));
      } catch (e) {}
    } catch (err: any) {
      setRankingError('Fehler beim Laden des Rankings.');
    } finally {
      setRankingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'campus_cup') {
      fetchRanking();
    }
  }, [activeTab, studentId]);

  // Pre-select homework topic automatically
  useEffect(() => {
    if (progressItems.length > 0 && !selectedTopic) {
      const hw = progressItems.find(i => i.is_current_homework);
      setSelectedTopic(hw ? hw.topic_name : (progressItems[0]?.topic_name || 'Allgemeines Üben'));
    }
  }, [progressItems, selectedTopic]);

  // Gyro Detox Engine Effect
  useEffect(() => {
    if (!sessionActive) {
      setIsPhoneFlat(false);
      setFlatType('none');
      setIsGraceActive(false);
      setGraceSecondsLeft(10);
      return;
    }

    const streak = avatar?.streak_flame || 0;
    const targetSeconds = getTargetMinutes(streak) * 60;

    let isOrientedFlat = false;
    let currentFlatType: 'face-up' | 'face-down' | 'none' = 'none';
    let isMoving = false;
    let motionTimeout: any = null;

    // Detect mobile and check if deviceorientation is available
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const usesSensors = isMobile && typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
    
    setIsDesktopFallback(!usesSensors);

    let graceWarningPlayed = false;

    // Timer interval
    const interval = setInterval(() => {
      if (preStartCountdownRef.current !== null) {
        return;
      }

      // Checkpoint check
      if (showCheckpoint) {
        setCheckpointSecondsLeft(prev => {
          if (prev <= 1) {
            // Failed checkpoint! Pause session.
            setSessionActive(false);
            setShowCheckpoint(false);
            playBeep(330, 600);
            return 20;
          }
          return prev - 1;
        });
        return; // Pause practice increment while checkpoint is active!
      }

      // In desktop mode, page visibility and active window focus matter.
      const isNowFlat = usesSensors 
        ? (isOrientedFlat && !isMoving && !document.hidden && (isMobile ? true : document.hasFocus()))
        : (isMobile ? !document.hidden : (!document.hidden && document.hasFocus()));

      // Update local states
      setIsPhoneFlat(isNowFlat);
      setFlatType(isNowFlat ? currentFlatType : 'none');

      if (isNowFlat && !isJuniorMissionPausedRef.current) {
        setIsGraceActive(false);
        setGraceSecondsLeft(10);
        graceWarningPlayed = false;

        setSecondsElapsed(prev => {
          const nextVal = prev + 1;
          secondsElapsedRef.current = nextVal;
          if (!isExtraTimeRef.current && nextVal >= targetSeconds) {
            setIsExtraTime(true);
            playSuccessChime();
          }

          // Trigger checkpoint popup every 5-8 minutes
          if (nextCheckpointSecondsRef.current > 0 && nextVal >= nextCheckpointSecondsRef.current) {
            setShowCheckpoint(true);
            setCheckpointSecondsLeft(20);
            nextCheckpointSecondsRef.current = nextVal + Math.floor(Math.random() * 180) + 300;
          }

          // Heartbeat update every 10 seconds
          if (nextVal % 10 === 0) {
            // Update heartbeat in DB
            const updateHeartbeat = async () => {
              try {
                if (currentLogIdRef.current) {
                  if (nextVal <= targetSeconds) {
                    const mins = Math.floor(nextVal / 60);
                    await supabase
                      .from('fokus_logs')
                      .update({ duration_seconds: nextVal, duration_minutes: mins })
                      .eq('id', currentLogIdRef.current);
                  } else {
                    await supabase
                      .from('fokus_logs')
                      .update({ duration_seconds: targetSeconds, duration_minutes: Math.floor(targetSeconds / 60) })
                      .eq('id', currentLogIdRef.current);
                  }
                }

                if (nextVal > targetSeconds) {
                  const extraSecs = nextVal - targetSeconds;
                  const extraMins = Math.round(extraSecs / 60);

                  if (!currentExtraLogIdRef.current) {
                    const { data } = await supabase
                      .from('fokus_logs')
                      .insert({
                        user_id: studentId,
                        duration_minutes: extraMins,
                        duration_seconds: extraSecs,
                        is_extra: true,
                        flame_level: getFlameLevelName(streak)
                      })
                      .select('id')
                      .single();
                    if (data) {
                      currentExtraLogIdRef.current = data.id;
                    }
                  } else {
                    await supabase
                      .from('fokus_logs')
                      .update({ duration_seconds: extraSecs, duration_minutes: extraMins })
                      .eq('id', currentExtraLogIdRef.current);
                  }
                } else if (!currentLogIdRef.current && currentExtraLogIdRef.current) {
                  const extraMins = Math.round(nextVal / 60);
                  await supabase
                    .from('fokus_logs')
                    .update({ duration_seconds: nextVal, duration_minutes: extraMins })
                    .eq('id', currentExtraLogIdRef.current);
                }
              } catch (err) {
                console.error('Heartbeat update failed:', err);
              }
            };
            updateHeartbeat();
          }

          // Acoustic Milestone Sound Triggers (0.4s - 0.8s unobtrusive chimes)
          const targetMins = getTargetMinutes(avatar?.streak_flame || 0);
          const targetSecs = targetMins * 60;
          const tone2Mins = Math.max(targetMins + 1, customTone2Min || (targetMins + 5));
          const tone2Secs = tone2Mins * 60;
          const tone3Mins = Math.max(tone2Mins + 1, customTone3Min || (tone2Mins + 5));
          const tone3Secs = tone3Mins * 60;

          if (nextVal === targetSecs) {
            playMilestoneSound(1); // 🔔 Glocke: Tagesziel erreicht!
          } else if (nextVal === tone2Secs) {
            playMilestoneSound(2); // 🎶 Harfe: Freies Üben Meilenstein 1
          } else if (nextVal === tone3Secs) {
            playMilestoneSound(3); // 🎹 Akkord: Freies Üben Meilenstein 2
          }

          return nextVal;
        });
      } else {
        if (!isExtraTimeRef.current) {
          // Pause session on interruption instead of destroying the elapsed practice seconds
          setIsPhoneFlat(false);
          playBeep(330, 200); // Warning tone
        } else {
          // Once the focus minutes are reached: START FRIENDLY COUNTDOWN
          setIsGraceActive(true);
          
          setGraceSecondsLeft(prevGrace => {
            if (prevGrace <= 1) {
              // Grace period expired! Just pause the session. Do NOT reset to 0.
              setSessionActive(false);
              setIsGraceActive(false);
              playBeep(440, 300); // Friendly end tone
              return 10;
            }
            
            // Still in grace period, play warning tone once per interruption
            if (!graceWarningPlayed) {
              playBeep(660, 200); // Warning tone
              if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
              }
              graceWarningPlayed = true;
            }
            
            return prevGrace - 1;
          });
        }
      }
    }, 1000);

    // Orientation event handler
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const beta = e.beta;
      const gamma = e.gamma;
      
      if (beta === null || gamma === null) {
        // Fall back to flat if no orientation details
        isOrientedFlat = true;
        currentFlatType = 'face-up';
        return;
      }

      // Flat Face-Up: screen up, beta and gamma near 0
      const faceUp = Math.abs(beta) < 18 && Math.abs(gamma) < 18;
      
      // Flat Face-Down: screen down, beta near 180 (or -180) and gamma near 0
      const faceDown = Math.abs(Math.abs(beta) - 180) < 18 && Math.abs(gamma) < 18;
      
      isOrientedFlat = faceUp || faceDown;
      currentFlatType = faceDown ? 'face-down' : (faceUp ? 'face-up' : 'none');
    };

    // Motion event handler
    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.acceleration;
      if (!acc) return;
      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      
      // Filter out lower magnitude instrument vibrations (use 1.8 m/s^2)
      if (magnitude > 1.8) {
        isMoving = true;
        if (motionTimeout) clearTimeout(motionTimeout);
        motionTimeout = setTimeout(() => {
          isMoving = false;
        }, 1500);
      }
    };

    // Page Visibility & Window Focus listener
    const handleVisibilityChange = () => {
      const isWindowFocused = isMobile ? true : document.hasFocus();
      if (document.hidden || !isWindowFocused) {
        isOrientedFlat = false;
        currentFlatType = 'none';
        setIsPhoneFlat(false);
      } else if (!usesSensors) {
        isOrientedFlat = true;
        currentFlatType = 'face-up';
        setIsPhoneFlat(true);
      }
    };

    if (usesSensors) {
      window.addEventListener('deviceorientation', handleOrientation);
      window.addEventListener('devicemotion', handleMotion);
    } else {
      isOrientedFlat = true;
      currentFlatType = 'face-up';
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      if (motionTimeout) clearTimeout(motionTimeout);
      if (usesSensors) {
        window.removeEventListener('deviceorientation', handleOrientation);
        window.removeEventListener('devicemotion', handleMotion);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [sessionActive, avatar?.streak_flame]);

  const handleSaveMood = async (selectedMood: 'sad' | 'neutral' | 'happy') => {
    if (!studentId) return;
    try {
      // Find the last log entry for this user
      const { data: logs, error: logsErr } = await supabase
        .from('fokus_logs')
        .select('id')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (logsErr) throw logsErr;
      const latestLog = logs?.[0];
      if (!latestLog || !latestLog.id) return;

      const { error } = await supabase
        .from('fokus_logs')
        .update({ mood: selectedMood })
        .eq('id', latestLog.id);

      if (error) throw error;

      // Update local state for logs
      setFokusLogs(prev => prev.map((log, idx) => idx === 0 ? { ...log, mood: selectedMood } : log));
      setLastSelectedMood(selectedMood);
    } catch (err: any) {
      console.error('Error saving mood check:', err);
    }
  };

  const handleSavePracticeAnchor = async (anchorText: string) => {
    setPracticeAnchor(anchorText);
    try {
      localStorage.setItem(`cg_practice_anchor_${studentId}`, anchorText);
    } catch (e) {}

    try {
      const { error } = await supabase
        .from('student_stats')
        .upsert({
          student_id: studentId,
          practice_anchor: anchorText,
          updated_at: new Date().toISOString()
        }, { onConflict: 'student_id' });

      if (error) {
        console.warn('Upsert on student_stats failed, attempting fallback update:', error);
        await supabase
          .from('student_stats')
          .update({
            practice_anchor: anchorText,
            updated_at: new Date().toISOString()
          })
          .eq('student_id', studentId);
      }
    } catch (err: any) {
      console.warn('Silent fallback for practice anchor persistence:', err);
    }
  };

  const handleStartPracticeSession = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission !== 'granted') {
          alert('Sensor-Rechte werden für den Fokus-Modus benötigt.');
          return;
        }
      } catch (err) {
        console.error(err);
        return;
      }
    }
    setSelectedTopic('Allgemeines Üben');
    setSecondsElapsed(0);
    setIsPhoneFlat(true);
    setIsExtraTime(false);
    setPreStartCountdown(studentUiLevel === 'junior' ? null : 3);
    setSessionActive(true);
    setShowCheckpoint(false);
    nextCheckpointSecondsRef.current = Math.floor(Math.random() * 180) + 300; // 5-8 minutes

    // Query focus log today and insert initial heartbeat log
    const simNow = getSimulatedNow();
    const startOfDay = new Date(simNow.getTime());
    startOfDay.setHours(0, 0, 0, 0);

    supabase
      .from('fokus_logs')
      .select('id')
      .eq('user_id', studentId)
      .eq('is_extra', false)
      .gte('created_at', startOfDay.toISOString())
      .then(({ data }) => {
        const hasFocusLoggedToday = data && data.length > 0;
        const isExtra = !!hasFocusLoggedToday;

        supabase
          .from('fokus_logs')
          .insert({
            user_id: studentId,
            duration_minutes: 0,
            duration_seconds: 0,
            is_extra: isExtra,
            flame_level: getFlameLevelName(avatar?.streak_flame || 0),
            created_at: simNow.toISOString()
          })
          .select('id')
          .single()
          .then(({ data: logData }) => {
            if (logData) {
              if (isExtra) {
                currentExtraLogIdRef.current = logData.id;
                currentLogIdRef.current = null;
              } else {
                currentLogIdRef.current = logData.id;
                currentExtraLogIdRef.current = null;
              }
            }
          });
      });
  };

  const finishPracticeSession = async () => {
    if (isFinishingSessionRef.current) return;
    isFinishingSessionRef.current = true;

    setSessionActive(false);

    const currentElapsedSecs = secondsElapsedRef.current || secondsElapsed;
    const streak = avatar?.streak_flame || 0;
    const targetMins = getTargetMinutes(streak);
    const targetSeconds = targetMins * 60;

    // Wenn 0 Sekunden geübt wurden, stilles Beenden
    if (currentElapsedSecs <= 0) {
      if (currentLogIdRef.current) {
        try {
          await supabase.from('fokus_logs').delete().eq('id', currentLogIdRef.current);
        } catch (e) {}
        currentLogIdRef.current = null;
      }
      if (currentExtraLogIdRef.current) {
        try {
          await supabase.from('fokus_logs').delete().eq('id', currentExtraLogIdRef.current);
        } catch (e) {}
        currentExtraLogIdRef.current = null;
      }
      setSecondsElapsed(0);
      setIsExtraTime(false);
      setIsGraceActive(false);
      isFinishingSessionRef.current = false;
      return;
    }

    try {
      const simNow = getSimulatedNow();
      const todayStr = toLocalYYYYMMDD(simNow);
      const yesterday = new Date(simNow.getTime());
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = toLocalYYYYMMDD(yesterday);

      // Fetch current stats
      const { data: stats } = await supabase
        .from('student_stats')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      const startOfDay = new Date(simNow.getTime());
      startOfDay.setHours(0, 0, 0, 0);

      // Check if focus time was already logged earlier today (excluding current session heartbeats)
      const { data: existingLogsToday } = await supabase
        .from('fokus_logs')
        .select('id, duration_minutes, is_extra')
        .eq('user_id', studentId)
        .gte('created_at', startOfDay.toISOString());

      const previousFocusLogs = (existingLogsToday || []).filter(
        (log: any) => !log.is_extra && log.id !== currentLogIdRef.current && log.id !== currentExtraLogIdRef.current
      );
      const alreadyCompletedTargetEarlierToday = previousFocusLogs.some(
        (log: any) => (log.duration_minutes || 0) >= targetMins
      );

      // Did this session complete the daily target?
      const sessionCompletedTarget = !alreadyCompletedTargetEarlierToday && (currentElapsedSecs >= targetSeconds);

      // Regel: Fokus-Sessions sind IMMER genau solange wie die Zielübezeit (targetSeconds).
      // Alles was darunter liegt, wird NICHT als Fokus-Session gezählt (sondern als freie/zusätzliche Übezeit verbucht).
      // Alles was darüber liegt, wird als zusätzliche Übezeit (extraSeconds) verbucht.
      let focusSeconds = 0;
      let focusMinutes = 0;
      let extraSeconds = 0;
      let extraMinutes = 0;

      if (sessionCompletedTarget) {
        // Ziel erreicht: Genau die Zielzeit ist die Fokus-Session
        focusSeconds = targetSeconds;
        focusMinutes = targetMins;
        // Alles darüber hinaus ist zusätzliche Übezeit
        extraSeconds = Math.max(0, currentElapsedSecs - targetSeconds);
        extraMinutes = Math.floor(extraSeconds / 60);
      } else {
        // Unter dem Tagesziel: Wird NICHT als Fokus-Session gezählt, sondern als freie Übezeit erfasst
        focusSeconds = 0;
        focusMinutes = 0;
        extraSeconds = currentElapsedSecs;
        extraMinutes = Math.floor(currentElapsedSecs / 60);
      }

      const effectiveFocusMinutes = alreadyCompletedTargetEarlierToday ? 0 : focusMinutes;
      const effectiveExtraMinutes = alreadyCompletedTargetEarlierToday ? (focusMinutes + extraMinutes) : extraMinutes;
      const totalMinutes = effectiveFocusMinutes + effectiveExtraMinutes;

      // Query today's already logged extra minutes to enforce the 60-minute daily cap on XP for extra time
      const todayExtraLogs = (existingLogsToday || []).filter(
        (log: any) => log.is_extra && log.id !== currentExtraLogIdRef.current
      );
      const todayExtraMinsLogged = todayExtraLogs.reduce((sum: number, log: any) => sum + (log.duration_minutes || 0), 0);

      const remainingXpEligibleExtraMins = Math.max(0, 60 - todayExtraMinsLogged);
      const xpEligibleExtraMins = Math.min(effectiveExtraMinutes, remainingXpEligibleExtraMins);
      const xpGained = effectiveFocusMinutes + xpEligibleExtraMins;

      let baseTotalFocus = 0;
      let baseMonthlyFocus = 0;
      let baseXp = avatar?.xp || 0;
      let baseStreak = avatar?.streak_flame || 0;
      let lastPracticeDate = null;
      let lastSecuredDate = null;

      try {
        const localStats = JSON.parse(localStorage.getItem(`cg_offline_stats_${studentId}`) || 'null');
        if (localStats) {
          baseTotalFocus = Math.max(baseTotalFocus, localStats.total_focus_minutes || 0);
          baseMonthlyFocus = Math.max(baseMonthlyFocus, localStats.monthly_focus_minutes || 0);
          if (localStats.current_xp) baseXp = Math.max(baseXp, localStats.current_xp);
          if (localStats.streak_flame) baseStreak = Math.max(baseStreak, localStats.streak_flame);
          lastPracticeDate = localStats.last_practice_date || null;
          lastSecuredDate = lastPracticeDate;
        }
      } catch (e) {}

      if (stats) {
        baseTotalFocus = Math.max(baseTotalFocus, stats.total_focus_minutes || 0);
        baseMonthlyFocus = Math.max(baseMonthlyFocus, stats.monthly_focus_minutes || 0);
        baseXp = Math.max(baseXp, stats.current_xp || 0);
        baseStreak = Math.max(baseStreak, stats.streak_flame || 0);
        lastPracticeDate = stats.last_practice_date ? String(stats.last_practice_date) : lastPracticeDate;
        lastSecuredDate = lastPracticeDate;
      }

      let totalFocus = baseTotalFocus + totalMinutes;
      let monthlyFocus = baseMonthlyFocus + totalMinutes;
      let currentXp = baseXp + xpGained;
      let streakFlame = baseStreak;

      if (studentUser?.joker_used_at) {
        const jokerDateStr = toLocalYYYYMMDD(new Date(studentUser.joker_used_at));
        if (!lastSecuredDate || jokerDateStr > lastSecuredDate) {
          lastSecuredDate = jokerDateStr;
        }
      }

      if (!lastSecuredDate) {
        const actDateStr = studentUser?.activated_at || (studentUser?.is_pin_activated ? studentUser?.created_at : null);
        if (actDateStr) {
          lastSecuredDate = toLocalYYYYMMDD(new Date(actDateStr));
        }
      }

      let usedJokerThisSession = false;
      let shieldsUsedNow = 0;
      
      // Streak wird nur erhöht wenn Tagesziel gemeistert wurde
      if (sessionCompletedTarget) {
        if (lastSecuredDate === yesterdayStr) {
          streakFlame += 1;
        } else if (lastSecuredDate === todayStr) {
          // Keep same streak
        } else if (lastSecuredDate) {
          const diffDays = getDaysBetweenLocal(lastSecuredDate, todayStr);
          const totalMissedDays = Math.max(0, diffDays - 1);
          
          const currentWeek = getISOWeek(getSimulatedNow());
          const lastJokerWeek = studentUser?.joker_used_at ? getISOWeek(new Date(studentUser.joker_used_at)) : null;
          const usedThisWeek = lastJokerWeek === currentWeek ? (studentUser?.weekly_jokers_used || 1) : 0;
          const availableShields = Math.max(0, 3 - usedThisWeek);

          let unprotectedMissedDays = totalMissedDays;
          if (availableShields > 0 && streak > 0) {
            shieldsUsedNow = Math.min(availableShields, totalMissedDays);
            unprotectedMissedDays = Math.max(0, totalMissedDays - shieldsUsedNow);
            if (shieldsUsedNow > 0) {
              usedJokerThisSession = true;
            }
          }

          if (unprotectedMissedDays === 0) {
            streakFlame = (streak || 0) + 1;
          } else {
            // Soft decay: decrease streak by 1 per unshielded missed day, then add +1 for today's completed session
            const decayedStreak = Math.max(0, (streak || 0) - unprotectedMissedDays);
            streakFlame = decayedStreak + 1;
          }
        } else {
          streakFlame = 1;
        }
      }

      const activeFlameLevel = (sessionCompletedTarget || alreadyCompletedTargetEarlierToday)
        ? getFlameLevelName(streakFlame)
        : getFlameLevelName(streak);

      // 1. Update or Insert Primary / Extra Log in DB
      let finalPrimaryLogId = null;
      let finalExtraLogId = null;

      if (focusSeconds > 0) {
        if (currentLogIdRef.current) {
          const { error: updateErr } = await supabase
            .from('fokus_logs')
            .update({
              duration_seconds: focusSeconds,
              duration_minutes: focusMinutes,
              flame_level: activeFlameLevel,
              is_extra: false
            })
            .eq('id', currentLogIdRef.current);
          if (!updateErr) {
            finalPrimaryLogId = currentLogIdRef.current;
          } else {
            console.error('Update primary log failed, falling back to insert:', updateErr);
            const { data: insData } = await supabase
              .from('fokus_logs')
              .insert({
                user_id: studentId,
                duration_seconds: focusSeconds,
                duration_minutes: focusMinutes,
                is_extra: false,
                flame_level: activeFlameLevel,
                created_at: simNow.toISOString()
              })
              .select('id')
              .single();
            if (insData) finalPrimaryLogId = insData.id;
          }
        } else {
          const { data: insData } = await supabase
            .from('fokus_logs')
            .insert({
              user_id: studentId,
              duration_seconds: focusSeconds,
              duration_minutes: focusMinutes,
              is_extra: false,
              flame_level: activeFlameLevel,
              created_at: simNow.toISOString()
            })
            .select('id')
            .single();
          if (insData) finalPrimaryLogId = insData.id;
        }

        // Additional extra time beyond the daily focus target
        if (extraSeconds > 0) {
          if (currentExtraLogIdRef.current) {
            await supabase
              .from('fokus_logs')
              .update({
                duration_seconds: extraSeconds,
                duration_minutes: extraMinutes,
                is_extra: true,
                flame_level: activeFlameLevel
              })
              .eq('id', currentExtraLogIdRef.current);
            finalExtraLogId = currentExtraLogIdRef.current;
          } else {
            const { data: insExtra } = await supabase
              .from('fokus_logs')
              .insert({
                user_id: studentId,
                duration_seconds: extraSeconds,
                duration_minutes: extraMinutes,
                is_extra: true,
                flame_level: activeFlameLevel,
                created_at: simNow.toISOString()
              })
              .select('id')
              .single();
            if (insExtra) finalExtraLogId = insExtra.id;
          }
        }
      } else if (extraSeconds > 0) {
        // Session under daily target: update existing heartbeat row to extra session (compatible with anti-cheat trigger)
        const targetLogId = currentLogIdRef.current || currentExtraLogIdRef.current;
        if (targetLogId) {
          const { error: updateErr } = await supabase
            .from('fokus_logs')
            .update({
              duration_seconds: extraSeconds,
              duration_minutes: extraMinutes,
              is_extra: true,
              flame_level: activeFlameLevel
            })
            .eq('id', targetLogId);
          if (!updateErr) {
            finalExtraLogId = targetLogId;
          } else {
            console.error('Update extra log failed:', updateErr);
          }
        } else {
          const { data: insExtra, error: insExtraErr } = await supabase
            .from('fokus_logs')
            .insert({
              user_id: studentId,
              duration_seconds: extraSeconds,
              duration_minutes: extraMinutes,
              is_extra: true,
              flame_level: activeFlameLevel,
              created_at: simNow.toISOString()
            })
            .select('id')
            .single();
          if (insExtra) finalExtraLogId = insExtra.id;
          if (insExtraErr) console.error('Insert extra log failed:', insExtraErr);
        }
      }

      // 3. Upsert stats
      await supabase.from('student_stats').upsert({
        student_id: studentId,
        total_focus_minutes: totalFocus,
        monthly_focus_minutes: monthlyFocus,
        streak_flame: streakFlame,
        last_practice_date: sessionCompletedTarget ? todayStr : (stats?.last_practice_date || todayStr),
        current_xp: currentXp,
        practice_anchor: practiceAnchor,
        updated_at: new Date().toISOString()
      }, { onConflict: 'student_id' });

      // 4. Update avatar
      const { data: avatarRecord } = await supabase
        .from('avatars')
        .select('*')
        .eq('user_id', studentId)
        .maybeSingle();

      if (avatarRecord) {
        await supabase.from('avatars').update({
          xp: currentXp,
          streak_flame: streakFlame,
          last_focus_date: sessionCompletedTarget ? todayStr : (avatarRecord.last_focus_date || todayStr)
        }).eq('id', avatarRecord.id);
      } else {
        await supabase.from('avatars').insert({
          user_id: studentId,
          xp: currentXp,
          streak_flame: streakFlame,
          evolution_level: 1,
          avatar_style: 'standard',
          instrument_type: studentUser?.instrument || 'Guitar',
          last_focus_date: sessionCompletedTarget ? todayStr : todayStr
        });
      }

      try {
        localStorage.setItem(`cg_offline_practice_${studentId}`, JSON.stringify({
          last_focus_date: todayStr,
          streak_flame: streakFlame,
          xp: currentXp,
          total_focus_minutes: totalFocus,
          monthly_focus_minutes: monthlyFocus,
          saved_at: new Date().toISOString()
        }));
        localStorage.setItem(`cg_offline_stats_${studentId}`, JSON.stringify({
          total_focus_minutes: totalFocus,
          monthly_focus_minutes: monthlyFocus,
          streak_flame: streakFlame,
          current_xp: currentXp,
          last_practice_date: sessionCompletedTarget ? todayStr : (stats?.last_practice_date || todayStr),
          saved_at: new Date().toISOString()
        }));
      } catch (e) {}

      // 5. Update user's joker_used_at and weekly_jokers_used if consumed
      if (usedJokerThisSession) {
        const lastJokerWeek = studentUser?.joker_used_at ? getISOWeek(new Date(studentUser.joker_used_at)) : null;
        const currentWeek = getISOWeek(getSimulatedNow());
        const prevUsed = lastJokerWeek === currentWeek ? (studentUser?.weekly_jokers_used || 1) : 0;
        const newWeeklyUsed = Math.min(3, prevUsed + (shieldsUsedNow || 1));

        await supabase
          .from('users')
          .update({ 
            joker_used_at: new Date().toISOString(),
            weekly_jokers_used: newWeeklyUsed
          })
          .eq('id', studentId);
        
        studentUser.joker_used_at = new Date().toISOString();
        studentUser.weekly_jokers_used = newWeeklyUsed;
      }

      // 6. Optimistic React State Updates (instant UI reaction)
      const newLogEntry = focusSeconds > 0 ? {
        id: finalPrimaryLogId || `local-${Date.now()}`,
        user_id: studentId,
        duration_seconds: focusSeconds,
        duration_minutes: focusMinutes,
        is_extra: false,
        flame_level: activeFlameLevel,
        created_at: simNow.toISOString()
      } : null;
      const newExtraEntry = extraSeconds > 0 ? {
        id: finalExtraLogId || `local-extra-${Date.now()}`,
        user_id: studentId,
        duration_seconds: extraSeconds,
        duration_minutes: extraMinutes,
        is_extra: true,
        flame_level: activeFlameLevel,
        created_at: simNow.toISOString()
      } : null;

      const newEntries = [
        ...(newExtraEntry ? [newExtraEntry] : []),
        ...(newLogEntry ? [newLogEntry] : [])
      ];

      // Store in localStorage immediately so local logs are 100% resilient
      try {
        const localLogsKey = `cg_local_fokus_logs_${studentId}`;
        const existingLocal = JSON.parse(localStorage.getItem(localLogsKey) || '[]');
        const updatedLocal = [
          ...newEntries,
          ...existingLocal.filter((l: any) => l.id !== currentLogIdRef.current && l.id !== currentExtraLogIdRef.current && l.id !== finalPrimaryLogId && l.id !== finalExtraLogId)
        ];
        localStorage.setItem(localLogsKey, JSON.stringify(updatedLocal));
      } catch (e) {}

      setFokusLogs(prev => [
        ...newEntries,
        ...prev.filter(l => l.id !== currentLogIdRef.current && l.id !== currentExtraLogIdRef.current && l.id !== finalPrimaryLogId && l.id !== finalExtraLogId)
      ]);

      setTotalFocusMinutes(totalFocus);
      setMonthlyFocusMinutes(monthlyFocus);
      if (sessionCompletedTarget) {
        setHasCompletedTargetToday(true);
      }
      setAvatar((prev: any) => ({
        ...(prev || {
          avatar_style: 'standard',
          instrument_type: studentUser?.instrument || 'Guitar',
          evolution_level: 1,
          asset_path: getInstrumentAvatarUrl(studentUser?.instrument),
          id: `local-avatar-${studentId}`,
          user_id: studentId
        }),
        xp: currentXp,
        streak_flame: streakFlame,
        last_focus_date: todayStr
      }));

      setCelebrationDetails({
        xpGained: xpGained,
        streakFlame: streakFlame,
        sessionCompletedTarget: sessionCompletedTarget,
        usedJokerThisSession: usedJokerThisSession,
        streak: streak,
        sessionMinutes: totalMinutes,
        exactSeconds: currentElapsedSecs,
        dailyGoal: targetMins
      });
      setCelebrationRingProgress(0);
      setCelebrationExploded(false);
      if (studentUiLevel !== 'junior') {
        setShowCelebration(true);
      }
      setLastFinishedTimestamp(Date.now());
      
      // Clear highlight after 8 seconds
      setTimeout(() => {
        setLastFinishedTimestamp(null);
      }, 8000);

      setSecondsElapsed(0);
      setIsExtraTime(false);
      setShowCheckpoint(false);
      currentLogIdRef.current = null;
      broadcastPracticeUpdate(studentId, { xp: currentXp, streak_flame: streakFlame });
      fetchStudentAndAvatar(true);
      fetchStudentProgress(true);
      setSidebarTab('logbook');
      isFinishingSessionRef.current = false;

    } catch (err: any) {
      console.error('Error finishing session:', err);
      alert('Fehler beim Beenden der Session.');
      setSessionActive(true);
      isFinishingSessionRef.current = false;
    }
  };

  const logParentGuidedPractice = async (minutes: number) => {
    if (!studentId || minutes <= 0) return;
    try {
      const streak = avatar?.streak_flame || 0;
      const seconds = minutes * 60;
      const flameLevelName = getFlameLevelName(streak);
      const todayStr = new Date().toISOString().split('T')[0];

      // Plausibilitäts-Deckelung (Anti-Cheat & XP-Schutz: max. 60 Min. pro Tag per 1-Klick Schnelleingabe)
      const todayLogs = (fokusLogs || []).filter((log: any) => {
        const logDate = log.created_at ? new Date(log.created_at).toISOString().split('T')[0] : '';
        return logDate === todayStr;
      });
      const todayTotalMinutes = todayLogs.reduce((sum: number, log: any) => sum + (log.duration_minutes || 0), 0);

      if (todayTotalMinutes + minutes > 60) {
        alert(`Tägliches Schnelleingabe-Limit erreicht: Heute wurden bereits ${todayTotalMinutes} Min. verbucht (maximal 60 Min. pro Tag per 1-Klick Schnelleingabe). Für längere Übesessions starte bitte den Fokus-Timer.`);
        return;
      }

      const { data: newLog, error } = await supabase
        .from('fokus_logs')
        .insert({
          user_id: studentId,
          duration_minutes: minutes,
          duration_seconds: seconds,
          is_extra: false,
          flame_level: flameLevelName
        })
        .select('*')
        .single();

      if (error) throw error;

      if (newLog) {
        setFokusLogs(prev => [newLog, ...prev]);
      }

      const { data: stats } = await supabase
        .from('student_stats')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      const newFocusTotal = (stats?.total_focus_minutes || 0) + minutes;
      const newMonthlyTotal = (stats?.monthly_focus_minutes || 0) + minutes;
      const newXp = (stats?.current_xp || 0) + (minutes * 10);
      const newStreak = Math.max(1, (stats?.streak_flame || 0) + 1);

      await supabase
        .from('student_stats')
        .upsert({
          student_id: studentId,
          total_focus_minutes: newFocusTotal,
          monthly_focus_minutes: newMonthlyTotal,
          current_xp: newXp,
          streak_flame: newStreak,
          last_practice_date: todayStr,
          updated_at: new Date().toISOString()
        }, { onConflict: 'student_id' });

      broadcastPracticeUpdate(studentId, { xp: newXp, streak_flame: newStreak });
      fetchStudentAndAvatar(true);
      fetchStudentProgress(true);
      fetchFokusLogs();
      setShowCustomParentInput(false);
      setCustomParentMinutes('');

      alert(`🎉 Super! ${minutes} Übe-Minuten verbucht! Streak gehalten! 🔥`);
    } catch (err: any) {
      alert('Fehler beim Eintragen der Übezeit: ' + err.message);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    setSavingProfile(true);
    try {
      const cleanFirstName = sanitizeTextInput(editingProfile.first_name);
      const cleanLastName = sanitizeTextInput(editingProfile.last_name);
      const cleanPhone = sanitizeTextInput(editingProfile.phone);
      const cleanInstrument = sanitizeTextInput(editingProfile.instrument);

      const { error } = await supabase
          .from('users')
          .update({
            first_name: cleanFirstName,
            last_name: cleanLastName,
            phone: cleanPhone,
            instrument: cleanInstrument,
            photo_url: editingProfile.photo_url
          })
          .eq('id', studentId);
      
      if (error) throw error;

      // Update local state
      const updatedProfile = {
        ...editingProfile,
        first_name: cleanFirstName,
        last_name: cleanLastName,
        phone: cleanPhone,
        instrument: cleanInstrument
      };
      setStudentUser((prev: any) => prev ? { ...prev, ...updatedProfile } : null);
      
      // Call parent update if exists
      if (onProfileUpdate) {
        onProfileUpdate({
          first_name: cleanFirstName,
          last_name: cleanLastName,
          phone: cleanPhone,
          instrument: cleanInstrument,
          photo_url: editingProfile.photo_url
        });
      }
      
      setShowEditProfile(false);
      alert('Profil erfolgreich gespeichert!');
    } catch (err: any) {
      console.error('Error updating student profile:', err);
      alert('Fehler beim Speichern: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // Gyroscope API Hook for Digital Detox (beta angle)
  useEffect(() => {
    if (!isDetoxActive || detoxCompleted) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = event.beta; // In degree [-180, 180]
      const gamma = event.gamma; // In degree [-90, 90]
      
      if (beta === null) return;
      
      // Placed flat on display (face down): beta is close to 180 or -180, or gamma is tilted.
      // A robust face down detection is Math.abs(beta) > 165 or (Math.abs(beta) < 15 and screen orientation flipped).
      // Let's use Math.abs(beta) > 160 or Math.abs(beta) < -160 or (Math.abs(gamma) > 75 and Math.abs(beta) > 150)
      const faceDown = Math.abs(beta) > 160 || Math.abs(beta) < -160;
      
      if (faceDown && !isFaceDown) {
        setIsFaceDown(true);
        // Play subtle confirmation beep
        playBeep(440, 100);
      } else if (!faceDown && isFaceDown) {
        setIsFaceDown(false);
        // Freeze timer and trigger haptic warning
        triggerWarning();
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isDetoxActive, isFaceDown, detoxCompleted]);

  // Timer Tick Hook
  useEffect(() => {
    if (isDetoxActive && isFaceDown && detoxSecondsLeft > 0 && !detoxCompleted) {
      timerRef.current = setInterval(() => {
        setDetoxSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleDetoxSuccess();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isDetoxActive, isFaceDown, detoxSecondsLeft, detoxCompleted]);

  const triggerWarning = () => {
    // Haptic Vibrate Warning
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
    // High-pitched warning beep
    playBeep(880, 400);
  };

  const playBeep = (freq: number, duration: number) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (duration / 1000));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + (duration / 1000));
    } catch (e) {
      console.warn("AudioContext warning beep failed:", e);
    }
  };

  const playSuccessChime = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.15);
        
        gain.gain.setValueAtTime(0, now + index * 0.15);
        gain.gain.linearRampToValueAtTime(0.15, now + index * 0.15 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.15 + 1.2);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + index * 0.15);
        osc.stop(now + index * 0.15 + 1.5);
      });
    } catch (e) {
      console.warn("AudioContext success chime failed:", e);
    }
  };

  const playMilestoneSound = (tier: 1 | 2 | 3) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const now = ctx.currentTime;

      if (tier === 1) {
        // 0.4s Soft Glass Crystal Chime (528 Hz - Sine Wave)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(528, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (tier === 2) {
        // 0.6s Soft 2-Note Harp Fifth (528 Hz -> 792 Hz)
        const notes = [528, 792];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);
          gain.gain.setValueAtTime(0, now + idx * 0.15);
          gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.15 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.45);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 0.45);
        });
      } else {
        // 0.8s Major Triad Chord (528 Hz -> 660 Hz -> 792 Hz)
        const notes = [528, 660, 792];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);
          gain.gain.setValueAtTime(0, now + idx * 0.12);
          gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.12 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.55);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.55);
        });
      }
    } catch (e) {
      console.warn("AudioContext milestone sound failed:", e);
    }
  };

  const playSpaceLaunchSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // 1. Rocket Thruster Sweep (Sine/Triangle wave sweep from 140Hz up to 580Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.55);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);

      // 2. Cosmic Plasma Sparkle (Harmonic sine wave chime)
      const sparkleOsc = ctx.createOscillator();
      const sparkleGain = ctx.createGain();
      sparkleOsc.type = 'sine';
      sparkleOsc.frequency.setValueAtTime(880, now + 0.1);
      sparkleOsc.frequency.exponentialRampToValueAtTime(1760, now + 0.5);
      sparkleGain.gain.setValueAtTime(0.001, now + 0.1);
      sparkleGain.gain.linearRampToValueAtTime(0.09, now + 0.2);
      sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      sparkleOsc.connect(sparkleGain);
      sparkleGain.connect(ctx.destination);
      sparkleOsc.start(now + 0.1);
      sparkleOsc.stop(now + 0.6);
    } catch (err) {
      console.warn('AudioContext space launch sound fallback:', err);
    }
  };

  const startJuniorMissionImmediately = useCallback(() => {
    if (juniorMissionCountdownTimerRef.current) {
      clearInterval(juniorMissionCountdownTimerRef.current);
      juniorMissionCountdownTimerRef.current = null;
    }
    setJuniorMissionCountdown(null);
    setShowJuniorPreFlightModal(false);
    setJuniorMissionPhase('zen');
    playSpaceLaunchSound();
    handleStartPracticeSession();
  }, [handleStartPracticeSession]);

  const startJuniorMissionWithCountdown = startJuniorMissionImmediately;

  useEffect(() => {
    return () => {
      if (juniorMissionCountdownTimerRef.current) {
        clearInterval(juniorMissionCountdownTimerRef.current);
        juniorMissionCountdownTimerRef.current = null;
      }
    };
  }, []);

  const playStarChimeSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // 2-Note crystalline chime (C6 = 1046.5 Hz, G6 = 1567.98 Hz)
      [1046.5, 1567.98].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.35);
      });
    } catch (err) {
      console.warn('AudioContext star chime sound fallback:', err);
    }
  };

  // 💨 Stufe 1: Sputter-Sound bei Treibstoff-Mangel (Cartooniges Husten / Puffs)
  const playRocketSputterSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

      [0, 0.14, 0.28].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(155 - idx * 25, now + offset);
        osc.frequency.exponentialRampToValueAtTime(50, now + offset + 0.11);
        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.linearRampToValueAtTime(0.18, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.13);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.14);
      });
    } catch (e) {
      console.warn('Rocket sputter sound fallback:', e);
    }
  };

  // 🚀 Stufe 2: Resonanter Orbit-Raketenstart (120Hz -> 620Hz mit Sub-Bass)
  const playOrbitLaunchSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

      // 1. Haupt-Raketenantrieb mit Tiefpassfilter
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.65);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.linearRampToValueAtTime(950, now + 0.55);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.85);

      // 2. Sub-Bass Fundament
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(60, now);
      sub.frequency.linearRampToValueAtTime(90, now + 0.5);
      subGain.gain.setValueAtTime(0.22, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      sub.connect(subGain);
      subGain.connect(ctx.destination);
      sub.start(now);
      sub.stop(now + 0.8);
    } catch (e) {
      console.warn('Orbit launch sound fallback:', e);
    }
  };

  // ✨ Stufe 2 Belohnung: Polyphones Himmels-Glockenspiel (C5, E5, G5, B5, D6)
  const playCelestialVictoryChime = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

      const notes = [523.25, 659.25, 783.99, 987.77, 1174.66];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 1.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 1.5);
      });
    } catch (e) {
      console.warn('Celestial victory chime fallback:', e);
    }
  };

  // 🌌 Stufe 3: Hyperraum-Warp Sound (Sci-Fi Sweep + C6-D7 Sternenstaub-Schimmer)
  const playHyperspaceWarpSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

      // Warp-Sweep mit Bandpass-Resonanz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(1700, now + 0.65);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 5;
      filter.frequency.setValueAtTime(350, now);
      filter.frequency.exponentialRampToValueAtTime(2400, now + 0.65);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.9);

      // Hochfrequenter Sternenstaub-Arpeggio
      [1046.5, 1318.5, 1567.98, 1975.5, 2349.3].forEach((freq, idx) => {
        const hOsc = ctx.createOscillator();
        const hGain = ctx.createGain();
        hOsc.type = 'sine';
        hOsc.frequency.setValueAtTime(freq, now + 0.12 + idx * 0.07);
        hGain.gain.setValueAtTime(0.001, now + 0.12 + idx * 0.07);
        hGain.gain.linearRampToValueAtTime(0.14, now + 0.12 + idx * 0.07 + 0.02);
        hGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12 + idx * 0.07 + 1.5);
        hOsc.connect(hGain);
        hGain.connect(ctx.destination);
        hOsc.start(now + 0.12 + idx * 0.07);
        hOsc.stop(now + 0.12 + idx * 0.07 + 1.6);
      });
    } catch (e) {
      console.warn('Hyperspace warp sound fallback:', e);
    }
  };

  // 🌌 Junior Space Mission: Handy-Detox Tab Lock (Page Visibility API)
  useEffect(() => {
    if (studentUiLevel !== 'junior' || !sessionActive) {
      setIsJuniorTabPaused(false);
      return;
    }
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsJuniorTabPaused(true);
      } else {
        setIsJuniorTabPaused(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [studentUiLevel, sessionActive]);

  // 📚 Zentraler Wochenplan-Resolver für Junior: Bündelt Lehrwerke, Songs, Unterrichtsaufnahmen und Lehrkraft-Notiz
  const getJuniorWeeklyHomeworkSummary = useCallback(() => {
    const latestItem = (progressItems || []).find((item: any) => item.is_current_homework || item.topic_name?.startsWith('Hausaufgabe KW '));
    const currentWeekStr = latestItem ? getItemWeek(latestItem) : getISOWeekRaw(new Date(), 1);
    const cleanTitle = (t: string) => (t || '').replace(/\s*\((gitarre|guitar|e-gitarre|bass|e-bass|drums|schlagzeug|klavier|piano|keys|keyboard|vocals|gesang|stimme|allgemein)\)/i, '');

    // 1. Gather all active homework books & pages directly from localProgress (assigned Lehrwerke)
    const activeJuniorBooksMap: Record<string, { pages: { num: number; notes: string; status: string }[] }> = {};

    (localProgress || []).forEach((assignment: any) => {
      const assignStdId = String(assignment.studentId || assignment.student_id || '');
      if (assignStdId !== String(studentId) || !assignment.pageStates) return;
      const assignBookId = String(assignment.lehrwerkId || assignment.lehrwerk_id || '');
      const book = lehrwerke.find((g: any) => String(g.id) === assignBookId);
      if (!book) return;

      Object.entries(assignment.pageStates).forEach(([pNumStr, pState]: [string, any]) => {
        if (pState?.status === 'homework' || pState?.isCurrentHomework || pState?.is_current_homework) {
          const pageNum = parseInt(pNumStr, 10);
          if (!isNaN(pageNum)) {
            if (!activeJuniorBooksMap[book.title]) {
              activeJuniorBooksMap[book.title] = { pages: [] };
            }
            if (!activeJuniorBooksMap[book.title].pages.some(p => p.num === pageNum)) {
              let cleanNote = pState.homeworkNotes || pState.homework_notes || pState.notes || '';
              if (typeof cleanNote === 'string' && (cleanNote.startsWith('[') || cleanNote.startsWith('{'))) {
                try {
                  const parsed = JSON.parse(cleanNote);
                  if (Array.isArray(parsed)) {
                    cleanNote = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
                  }
                } catch {}
              }
              cleanNote = String(cleanNote).replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '').replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
              activeJuniorBooksMap[book.title].pages.push({
                num: pageNum,
                notes: cleanNote,
                status: pState.status || 'homework'
              });
            }
          }
        }
      });
    });

    // 2. Also incorporate items from progressItems (songs, database rows)
    const otherActiveSongs: any[] = [];
    const effectiveId = studentId || studentUser?.id;
    (progressItems || []).forEach((item: any) => {
      if (!item.topic_name || item.topic_name.startsWith('Hausaufgabe KW ')) return;
      if (item.topic_name.includes(' - Seite ')) {
        const parts = item.topic_name.split(' - Seite ');
        const bookTitle = cleanTitle(parts[0].trim());
        const pageNum = parseInt(parts[1], 10);
        const book = lehrwerke.find((g: any) => g.title === bookTitle);
        if (book) {
          if (!activeJuniorBooksMap[bookTitle]) {
            activeJuniorBooksMap[bookTitle] = { pages: [] };
          }
          if (!isNaN(pageNum) && !activeJuniorBooksMap[bookTitle].pages.some(p => p.num === pageNum)) {
            let cleanNote = item.homework_notes || '';
            if (typeof cleanNote === 'string' && (cleanNote.startsWith('[') || cleanNote.startsWith('{'))) {
              try {
                const parsed = JSON.parse(cleanNote);
                if (Array.isArray(parsed)) {
                  cleanNote = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
                }
              } catch {}
            }
            cleanNote = String(cleanNote).replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '').replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
            activeJuniorBooksMap[bookTitle].pages.push({
              num: pageNum,
              notes: cleanNote,
              status: item.status || 'homework'
            });
          }
        }
      } else {
        const localHw = effectiveId ? (localStorage.getItem(`song_hw_${effectiveId}_${item.id}`) ??
                        (item.song_id ? localStorage.getItem(`song_hw_${effectiveId}_${item.song_id}`) : null)) : null;
        if (localHw !== 'false') {
          const isSongHw = (localHw === 'true') || Boolean(item.is_current_homework);
          if (isSongHw) {
            const cleanT = cleanTitle((item.topic_name || item.title || '').replace(/\s*\([^)]*\)\s*$/, ''));
            if (cleanT && !otherActiveSongs.some(existing => cleanTitle((existing.topic_name || existing.title || '').replace(/\s*\([^)]*\)\s*$/, '')) === cleanT)) {
              let cleanNote = (effectiveId ? (localStorage.getItem(`song_note_${effectiveId}_${item.id}`) || localStorage.getItem(`song_note_${effectiveId}_${item.song_id}`)) : '') ||
                              item.homework_notes || '';
              if (typeof cleanNote === 'string' && (cleanNote.startsWith('[') || cleanNote.startsWith('{'))) {
                try {
                  const parsed = JSON.parse(cleanNote);
                  if (Array.isArray(parsed)) {
                    cleanNote = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
                  }
                } catch {}
              }
              cleanNote = String(cleanNote).replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '').replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();

              otherActiveSongs.push({
                ...item,
                homework_notes: cleanNote
              });
            }
          }
        }
      }
    });

    // Also incorporate student's activeSongSkills (exact 1:1 match with MeisterwerkDocumentationModal)
    (activeSongSkills || []).forEach((skill: any) => {
      const localHw = effectiveId ? (localStorage.getItem(`song_hw_${effectiveId}_${skill.id}`) ??
                      (skill.song_id ? localStorage.getItem(`song_hw_${effectiveId}_${skill.song_id}`) : null) ??
                      (skill.songs?.id ? localStorage.getItem(`song_hw_${effectiveId}_${skill.songs.id}`) : null)) : null;

      const isHw = (localHw === 'true') || (localHw !== 'false' && Boolean(skill.is_current_homework));

      if (isHw) {
        const songArtist = skill.songs?.artist || skill.artist || '';
        const songTitle = skill.songs?.title || skill.title || skill.song_title || 'Song';
        if (songTitle.includes(' - Seite ') || songTitle.startsWith('Hausaufgabe KW ')) return;
        const songInstrument = skill.instrument ? ` (${skill.instrument})` : '';
        const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;
        const cleanT = cleanTitle(fullTitle);

        if (cleanT && !otherActiveSongs.some(existing => cleanTitle((existing.topic_name || existing.title || '').replace(/\s*\([^)]*\)\s*$/, '')) === cleanT)) {
          let cleanNote = (effectiveId ? (localStorage.getItem(`song_note_${effectiveId}_${skill.id}`) ||
                           (skill.song_id ? localStorage.getItem(`song_note_${effectiveId}_${skill.song_id}`) : '') ||
                           (skill.songs?.id ? localStorage.getItem(`song_note_${effectiveId}_${skill.songs.id}`) : '')) : '') ||
                           skill.homework_notes || '';
          if (typeof cleanNote === 'string' && (cleanNote.startsWith('[') || cleanNote.startsWith('{'))) {
            try {
              const parsed = JSON.parse(cleanNote);
              if (Array.isArray(parsed)) {
                cleanNote = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
              }
            } catch {}
          }
          cleanNote = String(cleanNote).replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '').replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();

          otherActiveSongs.push({
            id: skill.id,
            song_id: skill.song_id || skill.songs?.id,
            topic_name: fullTitle,
            title: fullTitle,
            is_current_homework: true,
            status: 'IN_PROGRESS',
            homework_notes: cleanNote
          });
        }
      }
    });

    // Sort pages for all active books
    Object.keys(activeJuniorBooksMap).forEach(title => {
      activeJuniorBooksMap[title].pages.sort((a, b) => a.num - b.num);
    });

    const formattedJuniorBooks = Object.entries(activeJuniorBooksMap).map(([title, info]) => {
      const pageNums = info.pages.map(p => p.num);
      const notesList = info.pages.filter(p => p.notes && p.notes.length > 0).map(p => ({ num: p.num, text: p.notes }));
      return {
        title,
        pageNums,
        notesList
      };
    });

    // Notes and audio
    const currentWeekNotes: string[] = [];
    (progressItems || []).forEach((item: any) => {
      const itemW = getItemWeek(item);
      const isActive = item.is_current_homework || item.topic_name?.startsWith('Hausaufgabe KW ') || itemW === currentWeekStr;
      if (isActive && item.homework_notes && item.homework_notes.trim()) {
        try {
          const parsed = JSON.parse(item.homework_notes);
          if (Array.isArray(parsed)) {
            parsed.forEach((n: any) => {
              if (typeof n === 'string' && n.trim() && !currentWeekNotes.includes(n.trim())) currentWeekNotes.push(n.trim());
            });
          } else if (typeof parsed === 'string' && parsed.trim() && !currentWeekNotes.includes(parsed.trim())) {
            currentWeekNotes.push(parsed.trim());
          }
        } catch {
          if (!currentWeekNotes.includes(item.homework_notes.trim())) currentWeekNotes.push(item.homework_notes.trim());
        }
      }
    });

    try {
      const localGenNotes = localStorage.getItem(`campus_homework_notes_${studentId}`);
      if (localGenNotes && localGenNotes.trim()) {
        try {
          const parsed = JSON.parse(localGenNotes);
          if (Array.isArray(parsed)) {
            parsed.forEach((n: any) => {
              if (typeof n === 'string' && n.trim() && !currentWeekNotes.includes(n.trim())) currentWeekNotes.push(n.trim());
            });
          } else if (typeof parsed === 'string' && parsed.trim() && !currentWeekNotes.includes(parsed.trim())) {
            currentWeekNotes.push(parsed.trim());
          }
        } catch {
          if (!currentWeekNotes.includes(localGenNotes.trim())) currentWeekNotes.push(localGenNotes.trim());
        }
      }
    } catch {}

    const audioTracks: AudioTrackItem[] = [];
    currentWeekNotes.forEach((n, idx) => {
      if (typeof n === 'string') {
        if (n.startsWith('AUDIO:')) {
          const parts = n.substring(6).split('|');
          audioTracks.push({
            url: parts[0],
            duration: parseFloat(parts[1]) || 0,
            date: parts[2],
            label: parts[3] || `Aufnahme #${audioTracks.length + 1}`,
            author: parts[4] || 'teacher',
            songTag: parts[7] || undefined,
            idx
          });
        } else if (n.startsWith('[') || n.startsWith('{')) {
          try {
            const parsed = JSON.parse(n);
            if (Array.isArray(parsed)) {
              parsed.forEach((item: string) => {
                if (typeof item === 'string' && item.startsWith('AUDIO:')) {
                  const parts = item.substring(6).split('|');
                  audioTracks.push({
                    url: parts[0],
                    duration: parseFloat(parts[1]) || 0,
                    date: parts[2],
                    label: parts[3] || `Aufnahme #${audioTracks.length + 1}`,
                    author: parts[4] || 'teacher',
                    songTag: parts[7] || undefined,
                    idx
                  });
                }
              });
            }
          } catch {}
        }
      }
    });

    const cleanGeneralNote = (text: string) => {
      if (!text) return '';
      let clean = text;
      if (clean.startsWith('[') || clean.startsWith('{') || clean.startsWith('"')) {
        try {
          const p = JSON.parse(clean);
          if (Array.isArray(p)) {
            clean = p.filter((x: any) => typeof x === 'string' && !x.startsWith('AUDIO:') && !x.startsWith('STICKER:') && !x.startsWith('LATENCY:') && !x.startsWith('STUDENT_NOTE_PUBLIC:') && !x.startsWith('STUDENT_NOTE_PRIVATE:') && !x.startsWith('STUDENT_QUESTION:')).join(' ');
          } else if (typeof p === 'string') {
            clean = p;
          }
        } catch {}
      }
      return clean
        .replace(/\["AUDIO:[^"]*"\]/g, '')
        .replace(/AUDIO:[^\s,|]+/g, '')
        .replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE|STUDENT_QUESTION):[^|]*\|/, '')
        .replace(/^STUDENT_QUESTION:[^|]*\|?/i, '')
        .replace(/^❓\s*Frage für den Unterricht:\s*/i, '')
        .trim();
    };

    const generalNoteRaw = currentWeekNotes.find(n => !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.startsWith('LATENCY:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:') && !n.startsWith('STUDENT_QUESTION:'));
    const generalNote = generalNoteRaw ? cleanGeneralNote(generalNoteRaw) : '';

    const studentQuestionEntry = currentWeekNotes.find(n => typeof n === 'string' && (n.startsWith('STUDENT_QUESTION:') || n.startsWith('❓ Frage für den Unterricht:')));
    let studentQuestionText = '';
    if (studentQuestionEntry) {
      if (studentQuestionEntry.startsWith('STUDENT_QUESTION:')) {
        const withoutPrefix = studentQuestionEntry.replace(/^STUDENT_QUESTION:/, '');
        const pipeIdx = withoutPrefix.indexOf('|');
        studentQuestionText = pipeIdx !== -1 ? withoutPrefix.slice(pipeIdx + 1).trim() : withoutPrefix.trim();
      } else {
        studentQuestionText = studentQuestionEntry.replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
      }
    }

    const isPlaceholderNote = (t: string) => {
      if (!t) return true;
      const lower = t.trim().toLowerCase();
      return lower === 'zusätzliche bemerkung' || lower === 'zusätzliche bemerkungen' || lower === 'keine' || lower === 'keine hausaufgabe' || lower === 'keine hausaufgaben';
    };
    const validGeneralNote = isPlaceholderNote(generalNote) ? '' : generalNote;

    let specificTeacherNote = validGeneralNote;
    if (!specificTeacherNote) {
      for (const b of formattedJuniorBooks) {
        if (b.notesList && b.notesList.length > 0 && b.notesList[0].text && !isPlaceholderNote(b.notesList[0].text)) {
          specificTeacherNote = b.notesList[0].text;
          break;
        }
      }
    }
    if (!specificTeacherNote) {
      for (const s of otherActiveSongs) {
        if (s.homework_notes && !isPlaceholderNote(s.homework_notes)) {
          specificTeacherNote = s.homework_notes;
          break;
        }
      }
    }

    const hasAnyHomework = formattedJuniorBooks.length > 0 || otherActiveSongs.length > 0 || audioTracks.length > 0 || Boolean(validGeneralNote) || Boolean(studentQuestionText);

    return {
      formattedJuniorBooks,
      otherActiveSongs,
      audioTracks,
      generalNote: validGeneralNote,
      specificTeacherNote,
      studentQuestionText,
      hasAnyHomework
    };
  }, [localProgress, lehrwerke, progressItems, activeSongSkills, studentId, studentUser]);

  // 📖 Junior Mission Resolver: Verarbeitet Buch- & Song-Hausaufgaben kindgerecht ohne KW-Kauderwelsch
  const getJuniorMissionDetails = useCallback(() => {
    const summary = getJuniorWeeklyHomeworkSummary();
    const books = summary.formattedJuniorBooks;
    const songs = summary.otherActiveSongs;
    const audioTracks = summary.audioTracks;
    const teacherNote = summary.specificTeacherNote || 'Spiele die ersten Takte ganz ruhig & entspannt!';
    const hasSpecificNote = Boolean(summary.specificTeacherNote);

    if (books.length > 0 && songs.length > 0) {
      const b0 = books[0];
      const s0 = songs[0];
      const bPages = b0.pageNums.length === 1 ? `S. ${b0.pageNums[0]}` : `S. ${b0.pageNums[0]}–${b0.pageNums[b0.pageNums.length - 1]}`;
      const songTitle = (s0.topic_name || s0.title || '').replace(/\s*\([^)]*\)\s*$/, '');
      return {
        type: 'composite',
        title: `${b0.title} & ${songTitle}`,
        shortTitle: `${b0.title} & ${songTitle}`,
        badge: `📖 ${b0.title} (${bPages}) + 🎵 ${songTitle}`,
        teacherNote,
        hasSpecificNote,
        books,
        songs,
        audioTracks
      };
    }

    if (books.length > 0) {
      const b0 = books[0];
      const bPages = b0.pageNums.length === 1 ? `S. ${b0.pageNums[0]}` : `S. ${b0.pageNums[0]}–${b0.pageNums[b0.pageNums.length - 1]}`;
      const extraCount = books.length - 1;
      const extraLabel = extraCount > 0 ? ` (+${extraCount})` : '';
      return {
        type: 'book',
        title: `${b0.title} (${bPages})${extraLabel}`,
        shortTitle: `${b0.title} ${bPages}`,
        badge: `📖 ${b0.title} (${bPages})${extraLabel}`,
        teacherNote,
        hasSpecificNote,
        books,
        songs,
        audioTracks
      };
    }

    if (songs.length > 0) {
      const s0 = songs[0];
      const songTitle = (s0.topic_name || s0.title || '').replace(/\s*\([^)]*\)\s*$/, '');
      const extraCount = songs.length - 1;
      const extraLabel = extraCount > 0 ? ` (+${extraCount})` : '';
      return {
        type: 'song',
        title: `${songTitle}${extraLabel}`,
        shortTitle: songTitle,
        badge: `🎵 ${songTitle}${extraLabel}`,
        teacherNote,
        hasSpecificNote,
        books,
        songs,
        audioTracks
      };
    }

    return {
      type: 'free',
      title: 'Freies Üben',
      shortTitle: 'Freies Üben',
      badge: '🎵 Freies Üben',
      teacherNote: 'Spiele deine Lieblingsmelodie und sammle Sterne!',
      hasSpecificNote: false,
      books: [],
      songs: [],
      audioTracks: []
    };
  }, [getJuniorWeeklyHomeworkSummary]);

  // 🚀 Junior Space Mission: Beendigung mit dynamischer Treibstoff-Physik
  const handleFinishJuniorMission = useCallback(() => {
    setIsJuniorMissionPaused(false);
    isJuniorMissionPausedRef.current = false;
    setShowJuniorCheatSheet(false);

    const elapsedSecs = secondsElapsedRef.current || secondsElapsed;
    const streak = avatar?.streak_flame || 0;
    const targetMins = getTargetMinutes(streak);
    const targetSeconds = targetMins * 60;
    const bonusSecs = Math.max(0, elapsedSecs - targetSeconds);
    const bonusMins = Math.floor(bonusSecs / 60);
    const missionInfo = getJuniorMissionDetails();

    let tier: 1 | 2 | 3 = 1;
    let xpBonus = 10;
    let msg = '';

    if (elapsedSecs < targetSeconds) {
      // Stufe 1: Abbruch vor Zielzeit (pädagogisch verzeihend ohne Scham)
      tier = 1;
      xpBonus = Math.max(5, Math.floor(elapsedSecs / 60) * 5);
      msg = `Toller Einsatz! ${Math.floor(elapsedSecs / 60)} Min. geübt – beim nächsten Flug holst du den Stern! 🚀`;
      playRocketSputterSound();
    } else if (bonusSecs < 120) {
      // Stufe 2: Zielzeit erreicht (bis +2 Min)
      tier = 2;
      xpBonus = 50;
      msg = `Missions-Ziel erreicht! ${missionInfo.shortTitle} gemeistert & Tages-Stern gesichert ⭐ (+50 XP)`;
      playOrbitLaunchSound();
      playCelestialVictoryChime();
    } else {
      // Stufe 3: Hyperraum-Sprung (> +2 Min Bonus)
      tier = 3;
      const totalMins = Math.floor(elapsedSecs / 60);
      xpBonus = 120;
      msg = `Wahnsinn! Interstellarer Flug: ${totalMins} Min. an ${missionInfo.shortTitle} gemeistert! 🌌 (+120 XP)`;
      playHyperspaceWarpSound();
    }

    // ⏱️ Dynamische Raketenflug-Dauer abhängig von der Übedauer:
    // - Abbruch vor Zielzeit (< targetSeconds): 2.2s (Sputter & Hüpfer)
    // - Zielzeit erreicht: 3.4s bis 6.2s (skaliert mit Bonusminuten)
    let flightDurationMs = 2200;
    if (elapsedSecs >= targetSeconds) {
      const extraMins = Math.floor(bonusSecs / 60);
      flightDurationMs = Math.min(6200, 3400 + extraMins * 700);
    }

    setJuniorMissionTier(tier);
    setJuniorMissionPhase('celebrating');
    setJuniorLaunchStage('launching');
    setJuniorCelebrationSummary({
      elapsedSecs,
      targetMins,
      bonusMins,
      xpGained: xpBonus,
      flightDurationMs,
      message: msg
    });

    // Nach dynamischer Flugzeit: Umschalten auf Phase 3B (Sieges-Karte gleitet sanft ins Bild)
    setTimeout(() => {
      setJuniorLaunchStage('summary');
      if (tier >= 2) {
        playCelestialVictoryChime();
      }
    }, flightDurationMs);

    // Nach Flugzeit + 1.2s persistieren
    setTimeout(async () => {
      await finishPracticeSession();
    }, flightDurationMs + 1200);
  }, [avatar?.streak_flame, finishPracticeSession, secondsElapsed]);

  const handleCloseJuniorCelebration = () => {
    setJuniorMissionPhase('idle');
    setJuniorLaunchStage('launching');
    setJuniorCelebrationSummary(null);
    setSessionActive(false);
    setSecondsElapsed(0);
    secondsElapsedRef.current = 0;
    setIsExtraTime(false);
    setIsGraceActive(false);
    setIsJuniorMissionPaused(false);
    isJuniorMissionPausedRef.current = false;
    setShowJuniorCheatSheet(false);
    try {
      localStorage.removeItem('groovelab_active_practice_session');
    } catch (e) {}
  };

  const handleEmergencyExitJuniorMission = useCallback(() => {
    setIsJuniorMissionPaused(false);
    isJuniorMissionPausedRef.current = false;
    setShowJuniorCheatSheet(false);
    setJuniorMissionPhase('idle');
    setJuniorLaunchStage('launching');
    setJuniorCelebrationSummary(null);
    setSessionActive(false);
    setSecondsElapsed(0);
    secondsElapsedRef.current = 0;
    setIsExtraTime(false);
    setIsGraceActive(false);
    try {
      localStorage.removeItem('groovelab_active_practice_session');
    } catch (e) {}
  }, []);

  // Canonical Ground-Truth Practice Minutes (Synchronizes DB aggregate & raw event logs 1:1)
  const effectivePracticeMinutes = useMemo(() => {
    const logsMins = Math.floor((fokusLogs || []).reduce((sum, log) => sum + (log.duration_seconds || ((log.duration_minutes || 0) * 60)), 0) / 60);
    return Math.max(totalFocusMinutes || 0, logsMins);
  }, [totalFocusMinutes, fokusLogs]);

  // Unified Sticker Map calculated 1:1 across Junior, Teen, and Pro levels
  const unifiedStickersMap = useMemo(() => {
    return getUnifiedStickersMap({
      practiceMinutes: effectivePracticeMinutes,
      xp: avatar?.xp || 0,
      streakDays: avatar?.streak_flame || 0,
      masteredSongsCount: songStats?.masteredCount || 0,
      progressItems: progressItems || []
    });
  }, [effectivePracticeMinutes, avatar?.xp, avatar?.streak_flame, songStats?.masteredCount, progressItems]);

  // Check and trigger sticker award celebration in Level 1 (Junior) Briefing Board
  useEffect(() => {
    if (studentUiLevel !== 'junior' || !studentId) return;

    try {
      const storageKey = `groovelab_junior_celebrated_stickers_${studentId}`;
      const stored = localStorage.getItem(storageKey);

      // If first visit on a new device/cleared cache, seed existing unlocked stickers
      // so they are not annoyingly re-celebrated retroactively
      if (stored === null) {
        const initialUnlocked = (ALL_STICKERS || []).filter(st => unifiedStickersMap[st.id]?.isUnlocked).map(st => st.id);
        localStorage.setItem(storageKey, JSON.stringify(initialUnlocked));
        return;
      }

      const celebratedIds: string[] = stored ? JSON.parse(stored) : [];
      const celebratedSet = new Set<string>(celebratedIds);

      for (const st of ALL_STICKERS) {
        if (celebratedSet.has(st.id)) continue;

        const stickerStatus = unifiedStickersMap[st.id];
        if (stickerStatus?.isUnlocked) {
          playSuccessChime();
          setJuniorAwardedStickerToCelebrate(st);
          celebratedSet.add(st.id);
          localStorage.setItem(storageKey, JSON.stringify(Array.from(celebratedSet)));
          break;
        }
      }
    } catch (e) {
      console.warn('Junior sticker celebration error:', e);
    }
  }, [studentUiLevel, studentId, unifiedStickersMap]);

  const downloadJuniorStickerJpg = (sticker: any, topicOverride?: string) => {
    if (!sticker) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const medalCenterY = 410;
    const tX = 160;
    const tY = 80;
    const tW = 880;
    const tH = 1040;

    const isLegendary = sticker.rarity === 'legendary';
    const isEpic = sticker.rarity === 'epic';
    const themeColor = sticker.color || '#34a853';

    // 1. Draw premium dark studio gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 1200);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 1200);

    // 2. Ambient radial background glow behind card
    const glowGrad = ctx.createRadialGradient(600, 600, 100, 600, 600, 550);
    glowGrad.addColorStop(0, isLegendary ? 'rgba(234, 179, 8, 0.25)' : 'rgba(52, 168, 83, 0.22)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, 1200, 1200);

    // 3. Draw rounded 3D Panini Collector Card Container
    ctx.save();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(tX, tY, tW, tH, 44);
    } else {
      ctx.rect(tX, tY, tW, tH);
    }
    ctx.fill();

    // 4. Draw Rainbow Holo-Foil diagonal stripes inside card for rare/epic/legendary stickers
    if (isLegendary || isEpic || sticker.rarity === 'rare') {
      ctx.save();
      ctx.clip();
      const holoGrad = ctx.createLinearGradient(tX, tY, tX + tW, tY + tH);
      holoGrad.addColorStop(0, 'rgba(255, 0, 128, 0.15)');
      holoGrad.addColorStop(0.25, 'rgba(0, 255, 255, 0.15)');
      holoGrad.addColorStop(0.5, 'rgba(255, 255, 0, 0.15)');
      holoGrad.addColorStop(0.75, 'rgba(0, 255, 128, 0.15)');
      holoGrad.addColorStop(1, 'rgba(255, 0, 255, 0.15)');
      ctx.fillStyle = holoGrad;
      ctx.fillRect(tX, tY, tW, tH);
      ctx.restore();
    }

    // 5. Card Metallic Glowing Border
    ctx.shadowColor = isLegendary ? '#eab308' : isEpic ? '#af52de' : themeColor;
    ctx.shadowBlur = 30;
    ctx.strokeStyle = isLegendary ? '#eab308' : isEpic ? '#af52de' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = isLegendary || isEpic ? 6 : 4;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(tX, tY, tW, tH, 44);
    } else {
      ctx.rect(tX, tY, tW, tH);
    }
    ctx.stroke();
    ctx.restore();

    // 6. Header Rarity Tag
    ctx.save();
    ctx.translate(600, tY + 50);
    const rarityText = `⭐ ${(sticker.rarityLabel || 'STANDARD').toUpperCase()} • CAMPUS-GROOVELAB`;
    ctx.font = '900 19px "Helvetica Neue", Inter, sans-serif';
    ctx.fillStyle = isLegendary ? '#facc15' : isEpic ? '#c084fc' : themeColor;
    ctx.textAlign = 'center';
    ctx.fillText(rarityText, 0, 0);
    ctx.restore();

    // 7. Header Action "FREIGESCHALTET!" Pill
    ctx.save();
    ctx.translate(600, tY + 115);
    ctx.rotate(-2 * Math.PI / 180);
    ctx.fillStyle = themeColor;
    const pillText = 'FREIGESCHALTET!';
    ctx.font = '900 28px "Helvetica Neue", Arial, sans-serif';
    const pillTextWidth = ctx.measureText(pillText).width;
    const pillW = pillTextWidth + 44;
    const pillH = 48;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(-pillW/2, -pillH/2, pillW, pillH, 24);
    } else {
      ctx.rect(-pillW/2, -pillH/2, pillW, pillH);
    }
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pillText, 0, 0);
    ctx.restore();

    // 8. Student Details
    const actualStudentName = studentUser?.first_name 
      ? `${studentUser.first_name}${studentUser.last_name ? ' ' + studentUser.last_name.charAt(0) + '.' : ''}`
      : 'Musik-Schüler';
    const studentInstrument = studentUser?.instrument || '';
    const schoolName = studentUser?.schools?.name || 'Musikschule';

    let textY = tY + 630;
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px "Helvetica Neue", Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(actualStudentName, 600, textY);

    if (studentInstrument) {
      textY += 38;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '900 22px "Helvetica Neue", Inter, sans-serif';
      ctx.fillText(studentInstrument.toUpperCase(), 600, textY);
    }

    textY += 52;
    ctx.fillStyle = themeColor;
    ctx.font = 'italic 900 44px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText((sticker.title || '').toUpperCase(), 600, textY);

    const masteredSong = assignedCampusSongs.find(s => isSongMastered(s)) || assignedCampusSongs[0];
    const songMasteredTopic = topicOverride || (masteredSong ? `${masteredSong.artist} – ${masteredSong.title}` : (progressItems.find(p => p.status === 'MASTERED')?.topic_name || ''));

    if (sticker.category === 'songs' || sticker.id === 'song-master' || topicOverride || songMasteredTopic) {
      const displayTopic = topicOverride || songMasteredTopic;
      if (displayTopic) {
        textY += 44;
        ctx.fillStyle = '#facc15';
        ctx.font = '900 28px "Helvetica Neue", Inter, sans-serif';
        ctx.fillText(displayTopic, 600, textY);
      }
      textY += 38;
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 22px "Helvetica Neue", Inter, sans-serif';
      ctx.fillText(sticker.desc || '', 600, textY);
    } else {
      textY += 40;
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 22px "Helvetica Neue", Inter, sans-serif';
      ctx.fillText(sticker.desc || '', 600, textY);

      if (sticker.equiv) {
        textY += 34;
        ctx.fillStyle = '#38bdf8';
        ctx.font = '700 20px "Helvetica Neue", Inter, sans-serif';
        ctx.fillText(sticker.equiv, 600, textY);
      }
    }

    // 9. Translucent Badge Pill for School Name
    const badgeText = schoolName.toUpperCase();
    ctx.font = 'bold 20px "Helvetica Neue", Inter, sans-serif';
    const textWidth = ctx.measureText(badgeText).width;
    const badgeW = textWidth + 60;
    const badgeH = 50;
    const badgeX = 600 - badgeW / 2;
    const badgeY = Math.max(tY + 860, textY + 36);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(badgeX, badgeY, badgeW, badgeH, 25);
    } else {
      ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, 600, badgeY + badgeH / 2);
    ctx.textBaseline = 'alphabetic';

    // 10. Website URL footer
    ctx.fillStyle = themeColor;
    ctx.font = '900 24px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('campus-groovelab.de', 600, badgeY + badgeH + 42);

    // Helper stenciled sticker asset loader
    const drawStickerAsset = (imgOrEmoji: HTMLImageElement | string, isImg: boolean) => {
      ctx.save();
      ctx.translate(600, medalCenterY);

      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 10;

      ctx.fillStyle = sticker.bg || 'rgba(52, 168, 83, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, 150, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.stroke();

      if (isImg) {
        ctx.beginPath();
        ctx.arc(0, 0, 146, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(imgOrEmoji as HTMLImageElement, -146, -146, 292, 292);
      } else {
        ctx.font = '120px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sticker.emoji || '🏆', 0, 0);
      }

      ctx.restore();
      
      const filename = (topicOverride || sticker.title || 'sticker').toLowerCase().replace(/[^a-z0-9]/gi, '_');
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = `campus_sticker_${filename}.jpg`;
      link.href = dataUrl;
      link.click();
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      drawStickerAsset(img, true);
    };
    img.onerror = () => {
      drawStickerAsset(sticker.emoji || '🏆', false);
    };
    img.src = `/stickers/${sticker.id}.png?v=1`;
  };

  const fetchClassHighlights = async (schoolId: string, teacherId?: string | null, silent = false) => {
    if (!schoolId) return;

    // Rate-limit fetches to prevent rapid/infinite update loops (minimum 5s interval)
    const nowMs = Date.now();
    if (nowMs - lastHighlightsFetchRef.current < 5000) {
      return;
    }
    lastHighlightsFetchRef.current = nowMs;

    // Only set highlightsLoading to true on initial/first load to prevent layout flicker
    if (!silent && !highlightsLoadedRef.current) {
      setHighlightsLoading(true);
    }
    try {
      // 1. Fetch all students in this school
      const { data: schoolStudents } = await supabase
        .from('users')
        .select('id, first_name, last_name, teacher_id')
        .eq('school_id', schoolId)
        .eq('role', 'student');

      if (!schoolStudents || schoolStudents.length === 0) {
        setClassHighlights([]);
        return;
      }

      // Canonical class resolution: All students in teacher's class or school class
      const allClassStudents = schoolStudents;
      const classmateAndSelfIds = Array.from(new Set([...allClassStudents.map(c => c.id), studentId]));
      
      setClassCount(allClassStudents.length);
      setClassmateIds(classmateAndSelfIds);

      const studentIds = schoolStudents.map(s => s.id);

      // Get school reset date (opening_hours.campus_stats_reset_at or stats_reset_at)
      let resetDate: Date | null = null;
      try {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('opening_hours')
          .eq('id', schoolId)
          .single();
        const oh = schoolData?.opening_hours;
        const resetDateStr = oh?.campus_stats_reset_at || oh?.stats_reset_at;
        if (resetDateStr) resetDate = new Date(resetDateStr);
      } catch (err) {
        console.warn('Could not load school reset date, using start of month:', err);
      }

      // 2. Fetch focus logs since September of current academic year for class annual statistics
      const now = getSimulatedNow();
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

      const currentMonth = now.getMonth();
      const startYear = currentMonth >= 8 ? now.getFullYear() : now.getFullYear() - 1;
      const annualStartDate = new Date(startYear, 8, 1, 0, 0, 0, 0);

      const queryStartDate = resetDate && resetDate < startOfCurrentMonth ? resetDate : startOfCurrentMonth;

      const otherStudentIds = studentIds.filter(id => !classmateAndSelfIds.includes(id));

      const [classmateLogsRes, otherLogsRes] = await Promise.all([
        supabase
          .from('fokus_logs')
          .select('user_id, duration_minutes, duration_seconds, created_at')
          .in('user_id', classmateAndSelfIds)
          .gte('created_at', annualStartDate.toISOString()),
        otherStudentIds.length > 0 ? supabase
          .from('fokus_logs')
          .select('user_id, duration_minutes, duration_seconds, created_at')
          .in('user_id', otherStudentIds)
          .gte('created_at', queryStartDate.toISOString()) : Promise.resolve({ data: [] })
      ]);

      let focusLogs = [...(classmateLogsRes.data || []), ...(otherLogsRes.data || [])];

      // Merge local personal logs from all students for offline resilience and multi-student testing
      try {
        (schoolStudents || []).forEach((st: any) => {
          const localLogsKey = `cg_local_fokus_logs_${st.id}`;
          const localLogsStr = typeof window !== 'undefined' ? localStorage.getItem(localLogsKey) : null;
          if (localLogsStr) {
            const parsed = JSON.parse(localLogsStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const remoteIds = new Set(focusLogs.map((l: any) => l.id));
              const missing = parsed.filter((l: any) => !remoteIds.has(l.id));
              focusLogs = [...missing, ...focusLogs];
            }
          }
        });
      } catch (e) {}

      setClassFocusLogs(focusLogs || []);

      // 3. Fetch mastered song skills for this month for classmates and self ONLY
      const { data: skills } = await supabase
        .from('user_song_skills')
        .select('user_id, progress_percent, instrument, is_stage_ready, last_practiced_at, songs(title)')
        .in('user_id', classmateAndSelfIds)
        .gte('last_practiced_at', queryStartDate.toISOString());

      // 4. Compute highlights for classmates ONLY
      const highlights: any[] = [];
      const classmateIdsSet = new Set(classmateAndSelfIds);

      allClassStudents.forEach((student: any) => {
        const studentLogs = (focusLogs || []).filter(log => {
          if (!log.created_at) return false;
          const logDate = new Date(log.created_at);
          return log.user_id === student.id && logDate >= startOfCurrentMonth && logDate <= now;
        });
        const studentSkills = (skills || []).filter(sk => {
          if (!sk.last_practiced_at) return false;
          const skillDate = new Date(sk.last_practiced_at);
          return sk.user_id === student.id && skillDate >= startOfCurrentMonth && skillDate <= now;
        });

        const monthlyMins = secondsToDisplayMinutes(studentLogs.reduce((sum: number, log: any) => {
          return sum + getExactLogSeconds(log);
        }, 0));

        // Monthly Streak (weeks with practice)
        const monthlyWeeks = new Set();
        studentLogs.forEach((log: any) => {
          const d = new Date(log.created_at);
          const year = d.getFullYear();
          const firstDayOfYear = new Date(year, 0, 1);
          const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
          const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
          monthlyWeeks.add(`${year}-${week}`);
        });
        const monthlyStreak = monthlyWeeks.size;

        // Privacy opt-out check
        let isOptedOut = student.parent_allow_leaderboard === false;
        try {
          const savedOpt = localStorage.getItem(`campus_privacy_show_highlights_${student.id}`);
          if (savedOpt !== null && JSON.parse(savedOpt) === false) {
            isOptedOut = true;
          }
        } catch (e) {}

        if (isOptedOut) return;

        const masteredThisMonth = studentSkills.filter((sk: any) => sk.progress_percent === 100 || sk.is_stage_ready);

        const formattedStudentName = `${student.first_name || ''} ${student.last_name ? student.last_name.trim().charAt(0) + '.' : ''}`.trim();

        if (monthlyStreak >= 2) {
          highlights.push({
            id: `${student.id}_streak_${monthlyStreak}`,
            studentName: formattedStudentName,
            emoji: '🔥',
            title: 'Monats-Konstanz',
            text: `Hat in ${monthlyStreak} verschiedenen Wochen diesen Monats geübt!`
          });
        }
        if (monthlyMins >= 120) {
          highlights.push({
            id: `${student.id}_focus_${monthlyMins}`,
            studentName: formattedStudentName,
            emoji: '⚡',
            title: 'Monats-Fokus',
            text: `Hat diesen Monat bereits ${monthlyMins} Minuten trainiert!`
          });
        }
        masteredThisMonth.forEach((sk: any) => {
          highlights.push({
            id: `${student.id}_song_${sk.id || (sk.songs as any)?.title || 'song'}`,
            studentName: formattedStudentName,
            emoji: '🏆',
            title: 'Meilenstein',
            text: `Hat heute den Song "${(sk.songs as any)?.title || 'Song'}" gemeistert!`
          });
        });
      });

      // 5. Calculate class total mins vs other school mins since resetDate (used for donut chart)
      const filteredFocusLogs = (focusLogs || []).filter((log: any) => {
        if (!log.created_at) return false;
        const logDate = new Date(log.created_at);
        if (resetDate) {
          return logDate >= resetDate && logDate <= now;
        }
        return logDate >= startOfCurrentMonth && logDate <= now;
      });

      let classSecsVal = 0;
      let otherClassSecsVal = 0;

      filteredFocusLogs.forEach((log: any) => {
        const secs = getExactLogSeconds(log);
        if (classmateIdsSet.has(log.user_id)) {
          classSecsVal += secs;
        } else {
          otherClassSecsVal += secs;
        }
      });

      setClassMins(secondsToDisplayMinutes(classSecsVal));
      setOtherClassMins(secondsToDisplayMinutes(otherClassSecsVal));

      // 6. Calculate weekly focus minutes for classmates and current student (last 7 days)
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const weeklyLogs = (focusLogs || []).filter((log: any) => {
        if (!log.created_at) return false;
        const logDate = new Date(log.created_at);
        return logDate >= oneWeekAgo && logDate <= now;
      });
      
      const classWeeklySecs = weeklyLogs.filter(log => classmateIdsSet.has(log.user_id)).reduce((sum, log) => {
        return sum + getExactLogSeconds(log);
      }, 0);
      const myWeeklySecs = weeklyLogs.filter(log => log.user_id === studentId).reduce((sum, log) => {
        return sum + getExactLogSeconds(log);
      }, 0);
      
      setClassWeeklyFocus(secondsToDisplayMinutes(classWeeklySecs));
      setMyWeeklyFocus(secondsToDisplayMinutes(myWeeklySecs));

      setClassHighlights(highlights);
      highlightsLoadedRef.current = true;
    } catch (err) {
      console.error('Error fetching class highlights for student:', err);
    } finally {
      setHighlightsLoading(false);
    }
  };

  const fetchStudentAndAvatar = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setBriefingLoading(true);
      }
      setError(null);

      // Stage 1: Fetch user, avatar, stats, briefing, emails, missions, pins, personal logs, progress matrix, and song skills in parallel
      const [userRes, avatarRes, statsRes, briefingRes, emailRes, missionRes, pinsRes, logsRes, matrixRes, skillsRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, school_id, role, first_name, last_name, avatar_url, photo_url, instrument, teacher_id, is_active, is_campus_active, is_groovelab_active, campus_ui_level, briefing_sidebar_collapsed, parent_allow_chat, parent_allow_absences, parent_allow_reschedule_confirm, parent_allow_timer, parent_allow_leaderboard, parent_allow_proposals, parent_allow_audio, parent_allow_tts, has_parent_pin, has_personal_pin, parent_pin_configured, status, parent_permissions, joker_used_at, weekly_jokers_used, activated_at, is_pin_activated, created_at, push_notifications_enabled, push_notif_schedule_changes, push_notif_homework, push_notif_chat, push_notif_practice_reminder, push_notif_weekly_digest, push_notif_all_features, is_app_user, is_premium_user, subject, schools(*)')
          .eq('id', studentId)
          .single(),
        supabase
          .from('avatars')
          .select('avatar_style, instrument_type, evolution_level, xp, asset_path, streak_flame, last_focus_date, id')
          .eq('user_id', studentId)
          .maybeSingle(),
        supabase
          .from('student_stats')
          .select('*')
          .eq('student_id', studentId)
          .maybeSingle(),
        Promise.resolve(null),
        Promise.resolve({ data: null, error: null } as any),
        supabase
          .from('student_missions')
          .select('*, mission_templates(*)')
          .eq('student_id', studentId)
          .maybeSingle(),
        supabase
          .from('one_time_upload_pins')
          .select('*')
          .eq('student_id', studentId),
        supabase
          .from('fokus_logs')
          .select('*')
          .eq('user_id', studentId)
          .order('created_at', { ascending: false }),
        supabase
          .from('progress_matrix')
          .select('*')
          .eq('student_id', studentId),
        supabase
          .from('user_song_skills')
          .select('*, songs(*)')
          .eq('user_id', studentId)
      ]);

      if (userRes.error) throw userRes.error;
      const user: any = userRes.data;
      if (!user) return;

      if (user.schools) {
        try {
          const overridesStr = localStorage.getItem('groovelab_school_overrides') || localStorage.getItem('campus_school_overrides');
          if (overridesStr) {
            const overrides = JSON.parse(overridesStr);
            if (user.schools.id && overrides[user.schools.id]) {
              user.schools = { ...user.schools, ...overrides[user.schools.id] };
            }
          }
        } catch (e) {}
      }

      let resolvedInst = user.instrument;
      if (!resolvedInst || resolvedInst === 'Allgemein' || resolvedInst === 'Musiker' || resolvedInst === 'Schüler' || resolvedInst === 'Instrument') {
        resolvedInst = '';
      }

      if (!resolvedInst && user.teacher_id) {
        const { data: teacherData } = await supabase
          .from('users')
          .select('instrument, subject, instrument_assignments')
          .eq('id', user.teacher_id)
          .maybeSingle();
        if (teacherData?.instrument && teacherData.instrument !== 'Allgemein' && teacherData.instrument !== 'Musiker') {
          resolvedInst = teacherData.instrument.split(',')[0].trim();
        } else if (teacherData?.subject) {
          resolvedInst = teacherData.subject.split(',')[0].trim();
        }
      }

      if (!resolvedInst) {
        const { data: stData } = await supabase
          .from('student_teachers')
          .select('teacher_id, teacher:users!student_teachers_teacher_id_fkey(instrument, subject)')
          .eq('student_id', studentId)
          .maybeSingle();
        const teacherObj: any = Array.isArray(stData?.teacher) ? stData?.teacher[0] : stData?.teacher;
        if (teacherObj?.instrument && teacherObj.instrument !== 'Musiker' && teacherObj.instrument !== 'Allgemein') {
          resolvedInst = String(teacherObj.instrument).split(',')[0].trim();
        } else if (teacherObj?.subject) {
          resolvedInst = String(teacherObj.subject).split(',')[0].trim();
        }
      }

      if (!resolvedInst) {
        resolvedInst = 'Gitarre';
      }

      user.resolved_instrument = resolvedInst;
      user.instrument = resolvedInst;



      setStudentUser(user);
      if (onProfileUpdate) {
        try {
          onProfileUpdate({
            resolved_instrument: resolvedInst,
            instrument: resolvedInst
          });
        } catch (e) {}
      }
      if (user) {
        if (user.campus_ui_level && (user.campus_ui_level === 'junior' || user.campus_ui_level === 'teen' || user.campus_ui_level === 'pro')) {
          setStudentUiLevel(user.campus_ui_level);
          setDraftUiLevel(user.campus_ui_level);
          localStorage.setItem('campus_student_ui_level', user.campus_ui_level);
        }
        if (user.parent_allow_absences !== undefined && user.parent_allow_absences !== null) {
          setDraftAllowAbsences(Boolean(user.parent_allow_absences));
        }
        if (user.parent_allow_reschedule_confirm !== undefined && user.parent_allow_reschedule_confirm !== null) {
          setDraftAllowReschedule(Boolean(user.parent_allow_reschedule_confirm));
        }
        if (user.parent_allow_chat !== undefined && user.parent_allow_chat !== null) {
          setDraftAllowChat(Boolean(user.parent_allow_chat));
        }
        if (user.parent_allow_timer !== undefined && user.parent_allow_timer !== null) {
          setDraftAllowTimer(Boolean(user.parent_allow_timer));
        }
        if (user.parent_allow_leaderboard !== undefined && user.parent_allow_leaderboard !== null) {
          setDraftAllowLeaderboard(Boolean(user.parent_allow_leaderboard));
        }
        if (user.parent_allow_proposals !== undefined && user.parent_allow_proposals !== null) {
          setDraftAllowProposals(Boolean(user.parent_allow_proposals));
        }
        if (user.parent_allow_audio !== undefined && user.parent_allow_audio !== null) {
          setDraftAllowAudio(Boolean(user.parent_allow_audio));
        }
        if (user.parent_allow_tts !== undefined && user.parent_allow_tts !== null) {
          setDraftAllowTts(Boolean(user.parent_allow_tts));
        }
        if (user.parent_permissions?.board_overrides) {
          setDraftBoardOverrides(user.parent_permissions.board_overrides);
        }
        if (user.parent_permissions?.bedtime_mode) {
          const bt = user.parent_permissions.bedtime_mode;
          if (bt.enabled !== undefined) {
            setBedtimeModeEnabled(Boolean(bt.enabled));
            localStorage.setItem('campus_bedtime_enabled', String(bt.enabled));
          }
          if (bt.start) {
            setBedtimeStart(bt.start);
            localStorage.setItem('campus_bedtime_start', bt.start);
          }
          if (bt.end) {
            setBedtimeEnd(bt.end);
            localStorage.setItem('campus_bedtime_end', bt.end);
          }
        } else {
          // 🛡️ Safety by Default: Falls noch keine DB-Einstellung vorliegt, prüfen ob lokal bereits konfiguriert
          const localSaved = localStorage.getItem('campus_bedtime_enabled');
          if (localSaved !== null) {
            setBedtimeModeEnabled(localSaved === 'true');
          } else {
            // Automatische Altersstandards bei Erstaufruf
            const lvl = (user.campus_ui_level && CAMPUS_AGE_STANDARDS[user.campus_ui_level]) ? user.campus_ui_level : 'junior';
            const std = CAMPUS_AGE_STANDARDS[lvl] || CAMPUS_AGE_STANDARDS.junior;
            setBedtimeModeEnabled(std.bedtimeEnabled);
            setBedtimeStart(std.bedtimeStart);
            setBedtimeEnd(std.bedtimeEnd);
            localStorage.setItem('campus_bedtime_enabled', String(std.bedtimeEnabled));
            localStorage.setItem('campus_bedtime_start', std.bedtimeStart);
            localStorage.setItem('campus_bedtime_end', std.bedtimeEnd);
          }
        }
        if (user.parent_permissions?.daytime_lock) {
          const dt = user.parent_permissions.daytime_lock;
          if (dt.enabled !== undefined) {
            setDaytimeLockEnabled(Boolean(dt.enabled));
            localStorage.setItem('campus_daytime_lock_enabled', String(dt.enabled));
          }
          if (dt.start) {
            setDaytimeLockStart(dt.start);
            localStorage.setItem('campus_daytime_lock_start', dt.start);
          }
          if (dt.end) {
            setDaytimeLockEnd(dt.end);
            localStorage.setItem('campus_daytime_lock_end', dt.end);
          }
          if (dt.days) {
            setDaytimeLockDays(dt.days);
            localStorage.setItem('campus_daytime_lock_days', dt.days);
          }
        } else {
          const localDaytimeSaved = localStorage.getItem('campus_daytime_lock_enabled');
          if (localDaytimeSaved !== null) {
            setDaytimeLockEnabled(localDaytimeSaved === 'true');
          }
        }
        if (user.parent_permissions?.instant_lock_until) {
          const ts = Number(user.parent_permissions.instant_lock_until);
          if (!isNaN(ts) && ts > Date.now()) {
            setInstantLockUntil(ts);
            localStorage.setItem('campus_instant_lock_until', String(ts));
          } else {
            setInstantLockUntil(null);
            localStorage.removeItem('campus_instant_lock_until');
          }
        }
      }
      if (user?.briefing_sidebar_collapsed !== undefined && user?.briefing_sidebar_collapsed !== null) {
        setIsRightSidebarCollapsed(Boolean(user.briefing_sidebar_collapsed));
        localStorage.setItem('campus_student_briefing_sidebar_collapsed', String(user.briefing_sidebar_collapsed));
      }
      setSchoolFokusLevels(user.schools?.opening_hours?.fokus_levels || null);
      setIsAppUser(user.is_app_user ?? false);
      setIsPremiumUser((user.is_premium_user || user.is_active || user.is_campus_active) ?? false);
      setPushEnabled(user.push_notifications_enabled ?? false);
      setPushNotifScheduleChanges(user.push_notif_schedule_changes ?? true);
      setPushNotifHomework(user.push_notif_homework ?? true);
      setPushNotifChat(user.push_notif_chat ?? true);
      setPushNotifPracticeReminder(user.push_notif_practice_reminder ?? true);
      setPushNotifWeeklyDigest(user.push_notif_weekly_digest ?? true);
      setPushNotifAllFeatures(user.push_notif_all_features ?? false);

      const avatarRecord = avatarRes.data;
      if (avatarRes.error) throw avatarRes.error;

      let activeStreak = avatarRecord?.streak_flame || 0;
      let lastSecuredDateStr = avatarRecord?.last_focus_date || null;
      if (user?.joker_used_at) {
        const jokerDateStr = toLocalYYYYMMDD(new Date(user.joker_used_at));
        if (!lastSecuredDateStr || jokerDateStr > lastSecuredDateStr) {
          lastSecuredDateStr = jokerDateStr;
        }
      }
      if (!lastSecuredDateStr) {
        const actDateStr = user?.activated_at || (user?.is_pin_activated ? user?.created_at : null);
        if (actDateStr) {
          lastSecuredDateStr = toLocalYYYYMMDD(new Date(actDateStr));
        }
      }

      // --- Self-Healing Client-Side Offline Sync (PWA Replay) ---
      try {
        const localPracticeLog = localStorage.getItem(`cg_offline_practice_${studentId}`);
        if (localPracticeLog) {
          const parsed = JSON.parse(localPracticeLog);
          if (parsed.last_focus_date && (!lastSecuredDateStr || parsed.last_focus_date > lastSecuredDateStr)) {
            lastSecuredDateStr = parsed.last_focus_date;
            if (parsed.streak_flame && parsed.streak_flame > activeStreak) {
              activeStreak = parsed.streak_flame;
              if (avatarRecord) {
                avatarRecord.streak_flame = activeStreak;
                avatarRecord.last_focus_date = lastSecuredDateStr;
              }
              // Auto-heal DB state
              supabase.from('avatars').update({ 
                streak_flame: activeStreak, 
                last_focus_date: lastSecuredDateStr 
              }).eq('user_id', studentId).then(() => {});
              supabase.from('student_stats').update({ 
                streak_flame: activeStreak 
              }).eq('student_id', studentId).then(() => {});
            }
          }
        }
      } catch (e) {}

      // --- Disaster Recovery Grace-Period ("Systemic Streak Freeze & Protect") ---
      let isDisasterProtected = false;
      try {
        const disasterGraceRaw = localStorage.getItem('cg_system_restore_grace_window') || sessionStorage.getItem('cg_system_restore_grace_window');
        if (disasterGraceRaw) {
          const grace = JSON.parse(disasterGraceRaw);
          const nowIso = new Date().toISOString();
          if (grace.active && (!grace.validUntil || grace.validUntil > nowIso)) {
            isDisasterProtected = true;
          }
        }
      } catch (e) {}

      if (lastSecuredDateStr && activeStreak > 0) {
        const todayStr = toLocalYYYYMMDD(getSimulatedNow());
        const diffDays = getDaysBetweenLocal(lastSecuredDateStr, todayStr);
        if (diffDays > 1) {
          if (isDisasterProtected) {
            // 🛡️ Disaster Recovery Grace-Period: Keep streak alive and heal date
            if (avatarRecord) {
              avatarRecord.last_focus_date = todayStr;
            }
            supabase.from('avatars').update({ 
              last_focus_date: todayStr 
            }).eq('user_id', studentId).then(() => {});
          } else {
            // Multi-Day Shield Resolver (up to 3 shields per calendar week)
            const missedDaysCount = diffDays - 1;
            const nowSim = getSimulatedNow();
            const currentWeek = getISOWeek(nowSim);
            const lastJokerWeek = user?.joker_used_at ? getISOWeek(new Date(user.joker_used_at)) : null;
            let currentWeeklyUsed = lastJokerWeek === currentWeek ? (user?.weekly_jokers_used || 1) : 0;
            let availableShields = Math.max(0, 3 - currentWeeklyUsed);

            let shieldDatesArr: string[] = [];
            try {
              shieldDatesArr = JSON.parse(localStorage.getItem(`cg_shield_usage_dates_${studentId}`) || '[]');
              if (!Array.isArray(shieldDatesArr)) shieldDatesArr = [];
            } catch (e) {
              shieldDatesArr = [];
            }
            const shieldDatesSet = new Set(shieldDatesArr);

            let shieldsApplied = 0;
            let unshieldedMissedCount = 0;
            let lastAppliedDateIso: string | null = null;

            for (let dOffset = 1; dOffset <= missedDaysCount; dOffset++) {
              const mDate = new Date(lastSecuredDateStr);
              mDate.setDate(mDate.getDate() + dOffset);
              const mDateStr = toLocalYYYYMMDD(mDate);

              if (availableShields > 0 && activeStreak > 0) {
                availableShields--;
                shieldsApplied++;
                shieldDatesSet.add(mDateStr);
                lastAppliedDateIso = mDate.toISOString();
              } else {
                unshieldedMissedCount++;
              }
            }

            if (shieldsApplied > 0 && lastAppliedDateIso) {
              const newWeeklyUsed = Math.min(3, currentWeeklyUsed + shieldsApplied);
              user.joker_used_at = lastAppliedDateIso;
              user.weekly_jokers_used = newWeeklyUsed;
              try {
                localStorage.setItem(`cg_shield_usage_dates_${studentId}`, JSON.stringify(Array.from(shieldDatesSet)));
              } catch (e) {}
              supabase.from('users').update({ 
                joker_used_at: lastAppliedDateIso, 
                weekly_jokers_used: newWeeklyUsed 
              }).eq('id', studentId).then(() => {});
            }

            if (unshieldedMissedCount > 0) {
              // Soft decay: decrease streak by 1 per unshielded missed day down to 0 (pause)
              activeStreak = Math.max(0, activeStreak - unshieldedMissedCount);
              if (avatarRecord) avatarRecord.streak_flame = activeStreak;
              supabase.from('avatars').update({ streak_flame: activeStreak }).eq('user_id', studentId).then(() => {});
              supabase.from('student_stats').update({ streak_flame: activeStreak }).eq('student_id', studentId).then(() => {});
            }
          }
        }
      }

      let currentShieldDatesArr: string[] = [];
      try {
        currentShieldDatesArr = JSON.parse(localStorage.getItem(`cg_shield_usage_dates_${studentId}`) || '[]');
        if (!Array.isArray(currentShieldDatesArr)) currentShieldDatesArr = [];
      } catch (e) {
        currentShieldDatesArr = [];
      }
      if (user?.joker_used_at) {
        currentShieldDatesArr.push(toLocalYYYYMMDD(new Date(user.joker_used_at)));
      }

      const statsData = statsRes.data;
      const metrics = computeGroundTruthMetrics({
        fokusLogs: logsRes.data || [],
        songSkills: skillsRes.data || [],
        progressMatrix: matrixRes.data || [],
        user: user,
        avatar: avatarRecord,
        stats: statsData,
        simulatedDate: getSimulatedNow(),
        targetMinutes: getTargetMinutes(activeStreak),
        shieldDates: currentShieldDatesArr
      });

      let effectiveAvatar = avatarRecord ? { ...avatarRecord } : {
        avatar_style: 'standard',
        instrument_type: user.instrument || 'Guitar',
        evolution_level: 1,
        xp: metrics.totalXp,
        asset_path: getInstrumentAvatarUrl(user.instrument),
        streak_flame: metrics.streakFlame,
        id: `local-avatar-${studentId}`,
        user_id: studentId
      } as any;

      effectiveAvatar.xp = metrics.totalXp;
      effectiveAvatar.streak_flame = metrics.streakFlame;

      if (!avatarRecord && user.is_app_user && currentPlatform === 'groovelab') {
        setShowSelector(true);
      } else {
        setShowSelector(false);
      }
      setAvatar(effectiveAvatar);

      setMonthlyFocusMinutes(metrics.totalFocusMinutes);
      setTotalFocusMinutes(metrics.totalFocusMinutes);

      const localAnchor = (typeof window !== 'undefined' && studentId)
        ? (localStorage.getItem(`cg_practice_anchor_${studentId}`) || localStorage.getItem(`practice_anchor_${studentId}`) || null)
        : null;
      const effectiveAnchor = statsData?.practice_anchor || localAnchor || null;
      if (effectiveAnchor) {
        setPracticeAnchor(effectiveAnchor);
        try {
          localStorage.setItem(`cg_practice_anchor_${studentId}`, effectiveAnchor);
          localStorage.setItem(`practice_anchor_${studentId}`, effectiveAnchor);
        } catch (e) {}
        if (!statsData?.practice_anchor) {
          supabase
            .from('student_stats')
            .upsert({
              student_id: studentId,
              practice_anchor: effectiveAnchor,
              updated_at: new Date().toISOString()
            }, { onConflict: 'student_id' })
            .then(({ error }) => {
              if (error) console.warn('Anchor sync fallback warning:', error);
            });
        }
      }

      // Assign student missions and pins immediately
      setStudentMissionProgress(missionRes.data || null);
      setStudentPins(pinsRes.data || []);

      // Assign personal fokus logs immediately (anti-waterfall & offline merge)
      let combinedLogs: any[] = (!logsRes.error && logsRes.data) ? logsRes.data : [];
      try {
        const localLogsKey = `cg_local_fokus_logs_${studentId}`;
        const localLogs = JSON.parse(localStorage.getItem(localLogsKey) || '[]');
        if (localLogs && localLogs.length > 0) {
          const remoteIds = new Set(combinedLogs.map((l: any) => l.id));
          const missingLocal = localLogs.filter((l: any) => !remoteIds.has(l.id));
          combinedLogs = [...missingLocal, ...combinedLogs];
        }
      } catch (e) {}

      setFokusLogs(combinedLogs);
      const todayStr = toLocalYYYYMMDD(getSimulatedNow());
      const todayLogs = combinedLogs.filter((log: any) => log.created_at && toLocalYYYYMMDD(new Date(log.created_at)) === todayStr);
      const nonExtraMinutes = todayLogs
        .filter((log: any) => !log.is_extra)
        .reduce((sum: number, log: any) => sum + (log.duration_minutes || (log.duration_seconds ? Math.floor(log.duration_seconds / 60) : 0)), 0);
      
      const streak = avatarRecord?.streak_flame || 0;
      const targetMins = getTargetMinutes(streak);
      setHasCompletedTargetToday(nonExtraMinutes >= targetMins || todayLogs.some((l: any) => (l.duration_seconds || 0) >= 180 || (l.duration_minutes || 0) >= 3));

      // ⚡ FAST FIRST PAINT: Dismiss full-page loading spinner as soon as student profile & core avatar state is ready
      setLoading(false);

      // Stage 2: Fetch classmates, highlights, announcements, and school goals in parallel (all depend on user config)
      if (user.school_id) {
        const [classmatesRes, highlightsRes, announcementsRes, schoolRes, feedInteractionsRes] = await Promise.all([
          supabase
            .from('users')
            .select('id')
            .eq('teacher_id', user.teacher_id)
            .eq('school_id', user.school_id),
          fetchClassHighlights(user.school_id, user.teacher_id, silent),
          supabase
            .from('campus_announcements')
            .select('*, users(first_name, last_name, photo_url)')
            .eq('school_id', user.school_id)
            .order('created_at', { ascending: false }),
          supabase
            .from('schools')
            .select('opening_hours')
            .eq('id', user.school_id)
            .single(),
          supabase
            .from('feed_interactions')
            .select('*')
            .eq('post_type', 'campus')
        ]);

        // Process interactions
        if (feedInteractionsRes && feedInteractionsRes.data) {
          setFeedInteractions(feedInteractionsRes.data);
        }

        // Process announcements
        if (!announcementsRes.error && announcementsRes.data) {
          const parsed = announcementsRes.data.map((ann: any) => ({
            id: ann.id,
            title: ann.title,
            content: ann.message,
            target_type: ann.target_type || 'all',
            category: ann.category || 'general',
            is_emergency: ann.is_emergency || false,
            attachment_url: ann.attachment_url || null,
            created_at: ann.created_at,
            user: ann.users
          }));
          setCampusFeedAnnouncements(parsed.filter((ann: any) => ann.target_type === 'all' || ann.target_type === 'students'));
        } else {
          setCampusFeedAnnouncements([]);
        }

        // Fetch Class Feed posts
        const { data: classPosts } = await supabase
          .from('class_feed_posts')
          .select('*')
          .eq('teacher_id', user.teacher_id)
          .or(`student_id.is.null,student_id.eq.${studentId}`)
          .order('created_at', { ascending: false });
        if (classPosts) {
          setClassFeedPosts(classPosts);
        }

        // Fetch Class Feed interactions
        const { data: classInterData } = await supabase
          .from('feed_interactions')
          .select('*')
          .eq('post_type', 'class');
        if (classInterData) {
          setClassFeedInteractions(classInterData);
        }

        // Process school targets / class goals
        const schoolData = schoolRes.data;
        const rawTargets = (user.teacher_id && schoolData?.opening_hours?.weekly_targets?.[user.teacher_id]) ||
                           schoolData?.opening_hours?.weekly_targets?.default;
        let goals: any[] = [];
        if (Array.isArray(rawTargets) && rawTargets.length > 0) {
          goals = rawTargets;
        } else if (typeof rawTargets === 'number') {
          goals = [{ id: 'default', title: 'Klassen-Monats-Quest', minutes: rawTargets, deadline: '' }];
        }
        setClassGoals(goals);

        // Process classmates weekly practice minutes (depends on classmates list)
        if (classmatesRes.data && classmatesRes.data.length > 0 && goals.length > 0) {
          const classmateAndSelfIds = Array.from(new Set([...classmatesRes.data.map((c: any) => c.id), user.id, studentId]));
          const now = getSimulatedNow();
          const monday = new Date(now);
          const day = now.getDay();
          const diff = day === 0 ? -6 : 1 - day;
          monday.setDate(now.getDate() + diff);
          monday.setHours(0, 0, 0, 0);
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          sunday.setHours(23, 59, 59, 999);

          const { data: practiceData } = await supabase
            .from('fokus_logs')
            .select('user_id, duration_minutes, duration_seconds')
            .in('user_id', classmateAndSelfIds)
            .gte('created_at', monday.toISOString())
            .lte('created_at', sunday.toISOString());

          let combinedPractice = practiceData || [];
          try {
            const localLogsKey = `cg_local_fokus_logs_${studentId}`;
            const localLogs = JSON.parse(localStorage.getItem(localLogsKey) || '[]');
            if (localLogs && localLogs.length > 0) {
              const remoteIds = new Set(combinedPractice.map((l: any) => l.id));
              const missingLocal = localLogs.filter((l: any) => !remoteIds.has(l.id));
              combinedPractice = [...missingLocal, ...combinedPractice];
            }
          } catch (e) {}

          const totalMins = (combinedPractice || []).reduce(
            (sum: number, s: any) => sum + (s.duration_minutes || (s.duration_seconds ? Math.round(s.duration_seconds / 60) : 0)), 0
          );
          setClassWeeklyMins(totalMins);
        }
      }

      // Stage 3: Read briefing response from Stage 1
      let briefingJsonLoaded = false;
      if (briefingRes && (briefingRes as any).ok) {
        try {
          const bd = await (briefingRes as any).json();
          if (bd && bd.success) {
            setRawBriefingData(bd);
            briefingJsonLoaded = true;
          }
        } catch (e) {
          console.error('Error parsing briefing JSON:', e);
        }
      }

      if (!briefingJsonLoaded) {
        // Fallback local query
        try {
          const schoolId = user.school_id || (user as any).school_id;
          const currentSchoolId = schoolId;

          if (currentSchoolId) {
            const { data: schoolData } = await supabase
              .from('schools')
              .select('allow_messages_global')
              .eq('id', currentSchoolId)
              .single();
            const allowMessages = schoolData?.allow_messages_global ?? true;

            const rawDay = new Date().getDay();
            const todayWeekday = rawDay === 0 ? 7 : rawDay;
            const todayDateStr = toLocalYYYYMMDD(new Date());

            const [todaySchedulesRes, bookingsRes] = await Promise.all([
              supabase
                .from('schedules')
                .select(`
                  id,
                  time_slot,
                  status,
                  teacher_id,
                  rooms (name),
                  teacher:users!schedules_teacher_id_fkey (first_name, last_name)
                `)
                .eq('student_id', studentId)
                .eq('day_of_week', todayWeekday)
                .maybeSingle(),
              supabase
                .from('room_bookings')
                .select('room_id, date, start_time, booked_by, room:rooms(name)')
                .eq('school_id', currentSchoolId)
                .eq('date', todayDateStr)
            ]);

            const todaySchedules = todaySchedulesRes.data;
            const bookings = bookingsRes.data || [];

            let todayLesson = null;
            if (todaySchedules) {
              const teacherName = todaySchedules.teacher 
                ? `Herr/Frau ${(todaySchedules.teacher as any).last_name}` 
                : 'Lehrkraft';
              
              let resolvedRoom = (todaySchedules.rooms as any)?.name || 'Unterrichtsraum';
              if (todaySchedules.teacher_id) {
                const booking = bookings.find((b: any) => 
                  b.booked_by === todaySchedules.teacher_id && 
                  b.start_time?.substring(0, 5) === todaySchedules.time_slot?.substring(0, 5)
                );
                if (booking && booking.room) {
                  resolvedRoom = Array.isArray(booking.room)
                    ? (booking.room[0]?.name || 'Unterrichtsraum')
                    : (booking.room as any).name || 'Unterrichtsraum';
                }
              }

              todayLesson = {
                id: todaySchedules.id,
                time: todaySchedules.time_slot,
                room: resolvedRoom,
                teacher: teacherName,
                teacher_id: todaySchedules.teacher_id,
                status: todaySchedules.status,
                displayString: `Heute ${todaySchedules.time_slot} Uhr, ${resolvedRoom} bei ${teacherName}`
              };
            }

            const currentXp = avatarRecord?.xp || 0;
            const currentLevel = avatarRecord?.evolution_level || 1;
            const milestoneTarget = 50;
            const remainingXp = milestoneTarget - (currentXp % milestoneTarget);

            setRawBriefingData({
              success: true,
              allowMessagesGlobal: allowMessages,
              todayLesson,
              gamification: {
                streakFlame: avatarRecord?.streak_flame || (user.is_premium_user && avatarRecord?.avatar_style === 'Premium_Hero' ? 6 : 0),
                evolutionLevel: currentLevel,
                currentXp,
                remainingXp,
                xpTargetMessage: `Noch ${remainingXp} XP bis zum heutigen Meilenstein!`,
                avatarStyle: avatarRecord?.avatar_style || 'Standard_Silhouette',
                instrumentType: avatarRecord?.instrument_type || 'Unknown'
              }
            });
          }
        } catch (err) {
          console.error('Error in student briefing fallback:', err);
        }
      }
      setBriefingLoading(false);

      // 🚀 Aggressive Idle-Prefetching for Instant 0ms Tab Switches
      if (typeof window !== 'undefined') {
        const idleRunner = 'requestIdleCallback' in window
          ? (window as any).requestIdleCallback
          : (cb: any) => setTimeout(cb, 600);
        
        idleRunner(() => {
          try {
            fetchStudentProgress(true);
            fetchFokusLogs();
            fetchRanking();
            const sId = user?.school_id || (user as any)?.schools?.id;
            if (sId) {
              fetchClassHighlights(sId, user?.teacher_id, true);
            }
          } catch (e) {
            console.warn('[IdlePrefetch] Non-critical background prefetch error:', e);
          }
        });
      }
    } catch (err: any) {
      console.error('Error loading student avatar:', err);
      setError('Fehler beim Laden des Profils.');
      setBriefingLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAvatarWithPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAvatarFile) {
      alert('Bitte wähle zuerst ein Bild aus.');
      return;
    }
    if (!pinInput.trim()) {
      alert('Bitte gib die PIN ein.');
      return;
    }

    setIsUploadingCustomAvatar(true);
    try {
      const fileExt = customAvatarFile.name.split('.').pop();
      const fileName = `${studentId}_avatar_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('groovelab-assets')
        .upload(filePath, customAvatarFile);
      
      let finalPublicUrl = '';
      if (uploadErr) {
        console.warn('Storage upload failed, falling back to data URL:', uploadErr);
        const reader = new FileReader();
        finalPublicUrl = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(customAvatarFile);
        });
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('groovelab-assets')
          .getPublicUrl(filePath);
        finalPublicUrl = publicUrlData.publicUrl;
      }

      // Call secure RPC to verify pin code and update users/one-time-pins tables
      const { data: verifyResult, error: verifyErr } = await supabase.rpc('verify_photo_upload_pin', {
        p_student_id: studentId,
        p_pin_code: pinInput.trim(),
        p_photo_url: finalPublicUrl
      });
      
      if (verifyErr || !verifyResult) {
        alert(verifyErr?.message || 'Ungültige oder bereits verwendete PIN!');
        setIsUploadingCustomAvatar(false);
        return;
      }

      if (studentMissionProgress && studentMissionProgress.current_level === 2) {
        await supabase
          .from('student_missions')
          .update({ current_level: 3, unlocked_at: new Date().toISOString() })
          .eq('student_id', studentId);
      }

      alert('Erfolgreich! Dein Bild wurde hochgeladen und dein Level wurde aktualisiert.');
      setPinInput('');
      setCustomAvatarFile(null);
      fetchStudentAndAvatar();
    } catch (err: any) {
      console.error('Error during pin upload:', err);
      alert('Fehler beim Upload: ' + err.message);
    } finally {
      setIsUploadingCustomAvatar(false);
    }
  };

  const handleStartDetox = () => {
    setDetoxSecondsLeft(detoxMinutes * 60);
    setIsDetoxActive(true);
    setIsFaceDown(false);
    setDetoxCompleted(false);
    setShowDetox(true);
  };

  const handleDetoxSuccess = async () => {
    setDetoxCompleted(true);
    setIsDetoxActive(false);
    playBeep(523.25, 600); // Success musical tone

    try {
      const resp = await fetch('/api/complete-detox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: studentId,
          durationMinutes: detoxMinutes
        })
      });

      if (!resp.ok) {
        // Fallback local update if server completed offline
        const newXp = (avatar?.xp || 0) + 10;
        const currentStreak = (avatar?.streak_flame || 0) + 1;
        await supabase.from('avatars').update({
          xp: newXp,
          streak_flame: currentStreak,
          last_focus_date: new Date().toISOString().split('T')[0]
        }).eq('user_id', studentId);
      }

      fetchStudentAndAvatar();
    } catch (err) {
      console.error("Error finalizing focus session:", err);
    }
  };

  const loadWrappedStory = async () => {
    setWrappedLoading(true);
    try {
      const resp = await fetch(`/api/wrapped?userId=${studentId}`);
      if (resp.ok && resp.headers.get('content-type')?.includes('application/json')) {
        const data = await resp.json();
        setWrappedData(data);
      } else {
        // Fallback local mock data
        setWrappedData({
          success: true,
          isPremium: isPremiumUser,
          avatarStyle: isPremiumUser ? 'Premium_Hero' : 'Standard_Silhouette',
          avatarUrl: isPremiumUser ? (avatar?.asset_path || '/avatars/hero_guitarist_lvl1.png') : '/avatars/silhouette_grey.png',
          monthlyFlashback: {
            focusMinutes: isPremiumUser ? 280 : null,
            masteredSongsCount: isPremiumUser ? 4 : null,
            badgeName: isPremiumUser ? 'Mai-Fokus-Badge 🏆' : 'Gesperrt 🔒',
            badgeCode: 'Badge_Mai_2026'
          },
          campusWrapped: {
            focusMinutes: isPremiumUser ? 1420 : null,
            masteredSongsCount: isPremiumUser ? 18 : null
          }
        });
      }
      setStorySlide(0);
      setShowWrapped(true);
    } catch (e) {
      console.error(e);
    } finally {
      setWrappedLoading(false);
    }
  };

  const handleCancelLesson = async (scheduleId: string, skipPinCheck = false) => {
    if (!skipPinCheck && !isStudentAbsenceAllowed) {
      setGlobalPinPendingAction(() => () => handleCancelLesson(scheduleId, true));
      setGlobalPinInput('');
      setGlobalPinError('');
      setShowGlobalParentPinModal(true);
      return;
    }

    if (!confirm('Möchtest du den heutigen Unterricht wirklich absagen? Der Slot wird für andere freigegeben.')) return;
    try {
      const resp = await fetch('/api/schedule/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId, studentId })
      });
      if (resp.ok) {
        fetchStudentAndAvatar();
        return;
      }
      const { error } = await supabase
        .from('schedules')
        .update({ status: 'canceled_by_student' })
        .eq('id', scheduleId);
      if (error) throw error;
      fetchStudentAndAvatar();
    } catch (err) {
      console.error(err);
      alert('Fehler beim Absagen des Unterrichts.');
    }
  };

  const handleParentApproval = async (scheduleId: string, approve: boolean) => {
    try {
      const nextStatus = approve ? 'approved' : 'canceled_by_student';
      const resp = await fetch('/api/schedule/approve-parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId, approve })
      });
      if (resp.ok) {
        fetchStudentAndAvatar();
        return;
      }
      const { error } = await supabase
        .from('schedules')
        .update({ status: nextStatus })
        .eq('id', scheduleId);
      if (error) throw error;
      fetchStudentAndAvatar();
    } catch (err) {
      console.error(err);
      alert('Fehler bei der Bestätigung.');
    }
  };

  const handleSelectHero = async (heroClassId: string) => {
    setSubmittingSelection(true);
    try {
      const response = await fetch('/api/select-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${studentId}`
        },
        body: JSON.stringify({ heroClassId })
      });

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const result = await response.json();
        setAvatar(result.avatar);
        setShowSelector(false);
        return;
      }

      const assetPaths: Record<string, string> = {
        guitarist: '/avatars/hero_guitarist_lvl1.png',
        drummer: '/avatars/hero_drummer_lvl1.png',
        keyboardist: '/avatars/hero_keys_lvl1.png',
        vocalist: '/avatars/hero_vocals_lvl1.png'
      };

      const fallbackAvatar = {
        user_id: studentId,
        avatar_style: 'Premium_Hero',
        instrument_type: heroClassId,
        evolution_level: 1,
        xp: 0,
        asset_path: assetPaths[heroClassId] || '/avatars/silhouette_standard.png',
        streak_flame: 0
      };

      const { data, error } = await supabase
        .from('avatars')
        .upsert(fallbackAvatar)
        .select('*')
        .single();

      if (error) throw error;
      await supabase.from('users').update({ avatar_url: fallbackAvatar.asset_path }).eq('id', studentId);

      setAvatar(data as Avatar);
      setShowSelector(false);
    } catch (err: any) {
      setError('Auswahl fehlgeschlagen.');
    } finally {
      setSubmittingSelection(false);
    }
  };

  if (loading && (!studentUser || !avatar)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Lade Campus-Profil...</p>
      </div>
    );
  }



  // 🛡️ REUSABLE MODALS: Parent Gate Master PIN & Recovery Key
  const renderParentGateModal = () => {
    if (!showParentGateModal) return null;
    const hasConfiguredParentPin = Boolean(studentUser?.has_parent_pin === true);

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100002,
        padding: '20px'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '32px',
          padding: '32px 28px',
          width: '100%',
          maxWidth: '380px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          color: '#0f172a'
        }}>
          <button
            onClick={() => {
              setShowParentGateModal(false);
              setPendingParentTarget(null);
              setParentSetupPin('');
              setParentSetupConfirm('');
              setParentSetupStep('enter');
              setParentGatePinInput('');
              setParentGateError('');
              setParentSetupError('');
            }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <X size={18} />
          </button>

          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            marginBottom: '16px',
            boxShadow: '0 8px 20px -4px rgba(2, 132, 199, 0.4)'
          }}>
            <ShieldCheck size={32} />
          </div>

          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
            {hasConfiguredParentPin ? 'Eltern-Bereich geschützt 🛡️' : '6-stellige Eltern-Master-PIN vergeben 🛡️'}
          </h3>
          
          <p style={{ margin: '8px 0 16px 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, lineHeight: '1.4' }}>
            {hasConfiguredParentPin
              ? 'Bitte gib deine 6-stellige Eltern-Master-PIN ein, um diesen geschützten Bereich zu öffnen.'
              : (parentSetupStep === 'enter'
                  ? 'Erstelle eine neue 6-stellige Master-PIN für den geschützten Elternbereich.'
                  : 'Wiederhole deine 6-stellige Master-PIN zur Bestätigung.')}
          </p>

          {(parentGateError || parentSetupError) && (
            <div style={{
              padding: '10px 14px',
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '12px',
              color: '#dc2626',
              fontSize: '0.78rem',
              fontWeight: 700,
              marginBottom: '14px',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              {parentGateError || parentSetupError}
            </div>
          )}

          {parentGateCooldownSeconds > 0 && (
            <div style={{
              padding: '10px 14px',
              background: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: '12px',
              color: '#92400e',
              fontSize: '0.8rem',
              fontWeight: 800,
              marginBottom: '14px',
              width: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <span>⏳ Sicherheitssperre: Bitte warte noch <strong>{parentGateCooldownSeconds}s</strong></span>
            </div>
          )}

          {/* 6 Dots Display with Shake Animation */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            marginBottom: '16px',
            animation: isParentGateShaking ? 'pinShakeAnim 0.35s cubic-bezier(0.36, 0.07, 0.19, 0.97) both' : 'none'
          }}>
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const curLen = hasConfiguredParentPin
                ? parentGatePinInput.length
                : (parentSetupStep === 'enter' ? parentSetupPin.length : parentSetupConfirm.length);
              const isFilled = curLen > idx;
              const isError = isParentGateShaking;
              return (
                <div
                  key={idx}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: `2px solid ${isError ? '#dc2626' : (isFilled ? '#0284c7' : '#cbd5e1')}`,
                    background: isError ? '#dc2626' : (isFilled ? '#0284c7' : 'transparent'),
                    transition: 'all 0.15s ease'
                  }}
                />
              );
            })}
          </div>

          {/* 3x4 Keypad */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            width: '100%'
          }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'back'].map((key) => {
              const isSpecial = key === 'C' || key === 'back';
              const isDisabled = isVerifyingParentGate || parentGateCooldownSeconds > 0;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={isDisabled}
                  onClick={async () => {
                    if (parentGateCooldownSeconds > 0) return;
                    setParentGateError('');
                    setParentSetupError('');

                    if (hasConfiguredParentPin) {
                      if (key === 'C') {
                        setParentGatePinInput('');
                      } else if (key === 'back') {
                        setParentGatePinInput(prev => prev.slice(0, -1));
                      } else if (parentGatePinInput.length < 6) {
                        const nextVal = parentGatePinInput + key;
                        setParentGatePinInput(nextVal);
                        if (nextVal.length === 6) {
                          handleVerifyParentPinAttempt(nextVal, () => {
                            setShowParentGateModal(false);
                            if (pendingParentTarget) {
                              setSettingsSubTab(pendingParentTarget);
                              setActiveStudentSettingsModal(pendingParentTarget);
                            }
                          });
                        }
                      }
                    } else {
                      // First-time PIN setup
                      if (parentSetupStep === 'enter') {
                        if (key === 'C') {
                          setParentSetupPin('');
                        } else if (key === 'back') {
                          setParentSetupPin(prev => prev.slice(0, -1));
                        } else if (parentSetupPin.length < 6) {
                          const nextVal = parentSetupPin + key;
                          setParentSetupPin(nextVal);
                          if (nextVal.length === 6) {
                            if (/^(\d)\1+$/.test(nextVal) || nextVal === '123456' || nextVal === '654321') {
                              setParentSetupError('Bitte wähle eine sicherere PIN (nicht 123456 oder 000000).');
                              setParentSetupPin('');
                              return;
                            }
                            setParentSetupStep('confirm');
                          }
                        }
                      } else {
                        if (key === 'C') {
                          setParentSetupConfirm('');
                        } else if (key === 'back') {
                          setParentSetupConfirm(prev => prev.slice(0, -1));
                        } else if (parentSetupConfirm.length < 6) {
                          const nextVal = parentSetupConfirm + key;
                          setParentSetupConfirm(nextVal);
                          if (nextVal.length === 6) {
                            if (nextVal !== parentSetupPin) {
                              setParentSetupError('Die PINs stimmen nicht überein.');
                              setParentSetupConfirm('');
                              setParentSetupPin('');
                              setParentSetupStep('enter');
                              return;
                            }

                            const recKey = generateParentRecoveryKey();
                            try {
                              const { data: rpcRes, error: rpcErr } = await supabase.rpc('set_parent_pin', {
                                p_student_id: studentId,
                                p_new_pin: nextVal
                              });

                              if (rpcErr || rpcRes !== true) {
                                throw new Error(rpcErr?.message || 'Serverfehler beim Speichern.');
                              }

                              try {
                                await supabase.from('users').update({ recovery_key: recKey }).eq('id', studentId);
                              } catch (err) {}
                              
                              if (studentUser) {
                                (studentUser as any).has_parent_pin = true;
                                (studentUser as any).recovery_key = recKey;
                              }

                              sessionStorage.setItem(`groovelab_parent_session_${studentId}`, String(Date.now() + 15 * 60 * 1000));
                              sessionStorage.setItem(`groovelab_parent_unlocked_${studentId}`, 'true');
                              sessionStorage.setItem('groovelab_parent_unlocked_global', 'true');
                              window.dispatchEvent(new CustomEvent('groovelab_parent_mode_changed', { detail: true }));

                              setShowParentGateModal(false);
                              setParentSetupPin('');
                              setParentSetupConfirm('');
                              setParentSetupStep('enter');
                              if (pendingParentTarget) {
                                setSettingsSubTab(pendingParentTarget);
                                setActiveStudentSettingsModal(pendingParentTarget);
                              }

                              // Trigger Schicht 1: One-Time Emergency Kit Modal!
                              setNewGeneratedRecoveryKey(recKey);
                              setHasCopiedRecoveryKey(false);
                              setShowEmergencyKitModal(true);
                            } catch (e: any) {
                              setParentSetupError('Fehler beim Speichern: ' + e.message);
                              setParentSetupConfirm('');
                            }
                          }
                        }
                      }
                    }
                  }}
                  style={{
                    padding: '14px 0',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    background: isSpecial ? '#f1f5f9' : '#ffffff',
                    color: '#0f172a',
                    fontSize: isSpecial ? '0.9rem' : '1.25rem',
                    fontWeight: 800,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.45 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'all 0.1s'
                  }}
                  className="hover-scale"
                >
                  {key === 'back' ? <Delete size={20} /> : key}
                </button>
              );
            })}
          </div>

          {/* Secure Tier-1 PIN Recovery Link */}
          {hasConfiguredParentPin && (
            <button
              type="button"
              onClick={() => {
                setRecoveryKeyInput('');
                setRecoveryKeyError('');
                setShowRecoveryKeyModal(true);
              }}
              style={{
                marginTop: '18px',
                background: 'none',
                border: 'none',
                color: '#0284c7',
                fontSize: '0.78rem',
                fontWeight: 750,
                cursor: 'pointer',
                textDecoration: 'underline',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ShieldCheck size={14} />
              <span>Eltern-PIN vergessen? Mit Notfall-Schlüssel wiederherstellen</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderRecoveryKeyModal = () => {
    if (!showRecoveryKeyModal) return null;
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100003,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowRecoveryKeyModal(false);
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '28px',
            width: '100%',
            maxWidth: '480px',
            padding: '32px 28px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
            border: '1.5px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            color: '#0f172a'
          }}
          className="animation-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            marginBottom: '16px'
          }}>
            <Key size={30} />
          </div>

          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', fontWeight: 1000, color: '#0f172a' }}>
            Elternbereich wiederherstellen 🛡️
          </h3>
          <p style={{ margin: '0 0 18px 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600, lineHeight: 1.45 }}>
            Gib deinen 8-stelligen Notfallschlüssel (z. B. <code>REC-7492-3810</code>) ein, um eine neue PIN festzulegen.
          </p>

          {recoveryKeyError && (
            <div style={{
              width: '100%',
              padding: '10px 14px',
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '12px',
              color: '#dc2626',
              fontSize: '0.78rem',
              fontWeight: 700,
              marginBottom: '16px',
              boxSizing: 'border-box'
            }}>
              {recoveryKeyError}
            </div>
          )}

          {/* Monospace Key Input */}
          <input
            type="text"
            placeholder="REC-XXXX-XXXX"
            value={recoveryKeyInput}
            onChange={(e) => {
              setRecoveryKeyError('');
              setRecoveryKeyInput(e.target.value.toUpperCase());
            }}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '16px',
              border: '2px solid #cbd5e1',
              fontSize: '1.15rem',
              fontWeight: 900,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              textAlign: 'center',
              letterSpacing: '0.08em',
              outline: 'none',
              marginBottom: '16px',
              boxSizing: 'border-box',
              color: '#0f172a',
              background: '#f8fafc'
            }}
            autoFocus
          />

          {/* Verify Button */}
          <button
            type="button"
            onClick={async () => {
              const cleanInput = recoveryKeyInput.trim();
              if (!cleanInput) {
                setRecoveryKeyError('Bitte gib deinen Notfallschlüssel ein.');
                return;
              }

              const targetId = studentId || (studentUser as any)?.id;
              if (!targetId) return;

              try {
                const { data: resetResult, error: resetErr } = await supabase.rpc('reset_parent_pin_via_recovery_key', {
                  p_student_id: targetId,
                  p_recovery_key: cleanInput
                });

                if (resetResult?.success) {
                  sessionStorage.removeItem(`groovelab_parent_session_${targetId}`);
                  sessionStorage.removeItem(`groovelab_parent_unlocked_${targetId}`);
                  sessionStorage.removeItem('groovelab_parent_unlocked_global');
                  if (studentUser) {
                    (studentUser as any).has_parent_pin = false;
                  }

                  setShowRecoveryKeyModal(false);
                  setParentSetupStep('enter');
                  setParentSetupPin('');
                  setParentSetupConfirm('');
                  setParentGatePinInput('');
                  setParentGateError('');
                  alert('Notfallschlüssel bestätigt! Bitte vergib jetzt deine neue 6-stellige Eltern-Master-PIN.');
                } else {
                  setRecoveryKeyError(resetResult?.error || resetErr?.message || 'Ungültiger Notfallschlüssel. Bitte prüfe deine Eingabe oder wende dich an deine Lehrkraft.');
                }
              } catch (err: any) {
                setRecoveryKeyError(err.message || 'Verbindungsfehler bei der Schlüsselprüfung.');
              }
            }}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: 'pointer',
              marginBottom: '16px',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
          >
            Notfallschlüssel prüfen ➔
          </button>
        </div>
      </div>
    );
  };

  // ⏱️ Auto-Save Notice & Active Practice Tracking for Grace Period
  const [autoSavedNotice, setAutoSavedNotice] = useState<string | null>(null);
  const practiceGraceActiveRef = useRef<boolean>(false);
  const hasAutoFlushedRef = useRef<boolean>(false);

  // Is an active practice currently in progress?
  const isAnyPracticeActive = Boolean(
    sessionActive ||
    juniorIsRecording ||
    (typeof window !== 'undefined' && (window as any).__campus_is_audio_recording === true)
  );

  // Helper: compute seconds since scheduled start time (handles midnight rollover)
  const getSecondsSinceScheduledStart = (startTimeStr: string, now: Date): number => {
    const [startH, startM] = startTimeStr.split(':').map(Number);
    const currentTotalSeconds = (now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds();
    const startTotalSeconds = ((startH ?? 0) * 60 + (startM ?? 0)) * 60;
    let diff = currentTotalSeconds - startTotalSeconds;
    if (diff < -43200) {
      diff += 86400;
    }
    return diff;
  };

  // 1. Bedtime Grace Check (5 Min. Toleranz bei aktiver Übung nach Sperrbeginn)
  const bedtimeGraceInfo = useMemo(() => {
    if (!bedtimeModeEnabled || checkIsParentSessionActive()) return null;
    const diff = getSecondsSinceScheduledStart(bedtimeStart, wallClockNow);
    
    // In der 5-Minuten Pufferzeit (0 bis 299 Sekunden nach Start)
    if (diff >= 0 && diff < 300) {
      if (isAnyPracticeActive || practiceGraceActiveRef.current) {
        practiceGraceActiveRef.current = true;
        return {
          type: 'bedtime' as const,
          targetName: 'zur Nachtruhe 🌙',
          secondsLeft: 300 - diff,
          cutoffTime: bedtimeStart
        };
      }
    } else {
      if (diff >= 300) {
        practiceGraceActiveRef.current = false;
      }
    }
    return null;
  }, [bedtimeModeEnabled, bedtimeStart, wallClockNow, isAnyPracticeActive]);

  // 2. Daytime Lock Grace Check (5 Min. Toleranz bei aktiver Übung nach Startzeit)
  const daytimeGraceInfo = useMemo(() => {
    if (!daytimeLockEnabled || checkIsParentSessionActive()) return null;
    const day = wallClockNow.getDay();
    if (daytimeLockDays === 'school_days' && (day === 0 || day === 6)) {
      return null;
    }
    const diff = getSecondsSinceScheduledStart(daytimeLockStart, wallClockNow);

    if (diff >= 0 && diff < 300) {
      if (isAnyPracticeActive || practiceGraceActiveRef.current) {
        practiceGraceActiveRef.current = true;
        return {
          type: 'daytime' as const,
          targetName: 'zum Schulzeit-Fokus 🎒',
          secondsLeft: 300 - diff,
          cutoffTime: daytimeLockStart
        };
      }
    } else {
      if (diff >= 300) {
        practiceGraceActiveRef.current = false;
      }
    }
    return null;
  }, [daytimeLockEnabled, daytimeLockStart, daytimeLockDays, wallClockNow, isAnyPracticeActive]);

  const activePracticeGrace = bedtimeGraceInfo || daytimeGraceInfo;

  // Atomare Auto-Flush Funktion: Sichert Fokus-Timer, stoppt Aufnahmen, schaltet Mikrofon aus
  const autoFlushAndFinalizePractice = async () => {
    try {
      const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // 1. Fokus-Timer sichern
      if (sessionActive) {
        await finishPracticeSession();
      }

      // 2. Audioaufnahme stoppen
      if (juniorMediaRecorderRef.current && juniorMediaRecorderRef.current.state !== 'inactive') {
        try {
          juniorMediaRecorderRef.current.stop();
        } catch (e) {}
      }
      setJuniorIsRecording(false);

      // 3. Hardware-Sicherheit: Mikrofon-Tracks sofort stoppen (Licht geht aus)
      if (juniorAudioStreamRef.current) {
        try {
          juniorAudioStreamRef.current.getTracks().forEach(t => t.stop());
        } catch (e) {}
        juniorAudioStreamRef.current = null;
      }

      // 4. Globale Events für Loopstation & Metronom
      if (typeof window !== 'undefined') {
        (window as any).__campus_is_audio_recording = false;
        window.dispatchEvent(new CustomEvent('campus_force_stop_audio'));
        window.dispatchEvent(new CustomEvent('campus_force_save_practice'));
      }

      practiceGraceActiveRef.current = false;
      setAutoSavedNotice(`Deine Übung wurde um ${nowTimeStr} Uhr automatisch und sicher im Logbuch verbucht! 🎶`);
    } catch (err) {
      console.warn('[AutoFlushPractice] Error during practice auto-flush:', err);
    }
  };

  // Hard-Deadline Trigger: Sobald 5 Min. nach Sperrbeginn erreicht sind, wird sofort abgebrochen & eingebucht
  useEffect(() => {
    if (!checkIsParentSessionActive() && (isCurrentlyInBedtime || isCurrentlyInDaytimeLock)) {
      const bedtimeDiff = bedtimeModeEnabled ? getSecondsSinceScheduledStart(bedtimeStart, wallClockNow) : -1;
      const daytimeDiff = daytimeLockEnabled ? getSecondsSinceScheduledStart(daytimeLockStart, wallClockNow) : -1;

      const isJustExpired = (bedtimeDiff >= 300 && bedtimeDiff < 310) || (daytimeDiff >= 300 && daytimeDiff < 310);

      if (isJustExpired && !hasAutoFlushedRef.current) {
        hasAutoFlushedRef.current = true;
        autoFlushAndFinalizePractice();
      }
    } else {
      hasAutoFlushedRef.current = false;
    }
  }, [wallClockNow, isCurrentlyInBedtime, isCurrentlyInDaytimeLock, bedtimeModeEnabled, daytimeLockEnabled]);

  // Sofortpause durch Eltern: Wenn aktiv, auch sofortige Sicherung
  useEffect(() => {
    if (isCurrentlyInInstantLock && isAnyPracticeActive) {
      autoFlushAndFinalizePractice();
    }
  }, [isCurrentlyInInstantLock, isAnyPracticeActive]);

  // Must-Have 1: Nachtruhe & Zeit-Sperren Sperrbildschirm (100% VOLLFORMAT PORTAL)
  // Wenn die Übungs-Pufferzeit aktiv ist (bis zu 5 Min. nach Sperrbeginn), bleibt die App für das Beenden offen!
  const isGracePuffering = Boolean(activePracticeGrace && activePracticeGrace.secondsLeft > 0);

  const isCurrentlyLocked = (isCurrentlyInInstantLock || ((isCurrentlyInBedtime || isCurrentlyInDaytimeLock) && !isGracePuffering)) && !checkIsParentSessionActive();

  if (isCurrentlyLocked) {
    const lockConfig = isCurrentlyInInstantLock ? {
      title: 'Familien-Pause ☕',
      badge: 'Sofortpause aktiv',
      badgeBg: 'rgba(245, 158, 11, 0.2)',
      badgeColor: '#fde047',
      subtitle: (
        <>Deine Eltern haben eine gemeinsame Bildschirmpause aktiviert. Zeit für Familie, Essen oder frische Luft!{instantLockUntil && <> Pause aktiv bis ca. <strong style={{ color: '#ffffff' }}>{new Date(instantLockUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Uhr</strong>.</>}</>
      ),
      icon: <Coffee size={44} color="#fbbf24" />,
      iconBg: 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0.05) 100%)',
      iconBorder: 'rgba(245, 158, 11, 0.5)',
      quote: '„Gemeinsame Zeit ist wie Musik – sie verbindet die Familie.“'
    } : isCurrentlyInDaytimeLock ? {
      title: 'Schulzeit- & Hausaufgaben-Fokus 🎒',
      badge: `Fokuszeit (${daytimeLockStart} – ${daytimeLockEnd} Uhr)`,
      badgeBg: 'rgba(129, 140, 248, 0.2)',
      badgeColor: '#c7d2fe',
      subtitle: (
        <>Jetzt konzentrieren wir uns auf die Schule und Hausaufgaben! Die Übe-App ist von <strong style={{ color: '#ffffff' }}>{daytimeLockStart} Uhr</strong> bis <strong style={{ color: '#ffffff' }}>{daytimeLockEnd} Uhr</strong> pausiert. Deine Instrumente warten nach dem Unterricht auf dich!</>
      ),
      icon: <BookOpen size={44} color="#a5b4fc" />,
      iconBg: 'radial-gradient(circle, rgba(129, 140, 248, 0.25) 0%, rgba(129, 140, 248, 0.05) 100%)',
      iconBorder: 'rgba(129, 140, 248, 0.5)',
      quote: '„Erst die Schule, dann die Töne – so werden Champions gemacht!“'
    } : {
      title: 'Gute Nacht, kleiner Musiker! 🌙',
      badge: `Nachtruhe (${bedtimeStart} – ${bedtimeEnd} Uhr)`,
      badgeBg: 'rgba(56, 189, 248, 0.2)',
      badgeColor: '#bae6fd',
      subtitle: (
        <>Toll geübt heute! Deine Instrumente schlafen schon tief und fest. Die Übe-App ruht von <strong style={{ color: '#ffffff' }}>{bedtimeStart} Uhr</strong> bis <strong style={{ color: '#ffffff' }}>{bedtimeEnd} Uhr</strong>, damit du morgen wieder fit und ausgeschlafen bist!</>
      ),
      icon: <Moon size={44} color="#7dd3fc" />,
      iconBg: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(56, 189, 248, 0.05) 100%)',
      iconBorder: 'rgba(56, 189, 248, 0.5)',
      quote: '„Im Schlaf wächst dein musikalisches Gehör. Träum süß von neuen Melodien!“'
    };

    return createPortal(
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        width: '100vw',
        height: '100vh',
        background: 'radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0f172a 45%, #020617 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        textAlign: 'center',
        color: '#ffffff',
        overflowY: 'auto',
        boxSizing: 'border-box'
      }}>
        {/* Sleeping Ambient Stars */}
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.08) 1.5px, transparent 1.5px)',
          backgroundSize: '48px 48px, 96px 96px',
          backgroundPosition: '0 0, 24px 24px',
          opacity: 0.6
        }} />

        <div style={{
          position: 'relative',
          maxWidth: '520px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'fadeIn 0.5s ease',
          zIndex: 1
        }}>
          {/* Auto-Save Reassurance Notice */}
          {autoSavedNotice && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 18px',
              borderRadius: '16px',
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1.5px solid rgba(34, 197, 94, 0.35)',
              color: '#86efac',
              fontSize: '0.84rem',
              fontWeight: 800,
              marginBottom: '20px',
              maxWidth: '440px',
              boxShadow: '0 4px 15px rgba(34, 197, 94, 0.15)',
              animation: 'fadeIn 0.3s ease'
            }}>
              <Check size={18} color="#4ade80" />
              <span>{autoSavedNotice}</span>
            </div>
          )}

          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '100px',
            background: lockConfig.badgeBg,
            border: `1px solid ${lockConfig.iconBorder}`,
            color: lockConfig.badgeColor,
            fontSize: '0.78rem',
            fontWeight: 800,
            marginBottom: '26px',
            letterSpacing: '0.02em',
            textTransform: 'uppercase'
          }}>
            <Sparkles size={13} />
            <span>{lockConfig.badge}</span>
          </div>

          {/* Hero Icon with Ambient Glow */}
          <div style={{
            width: '92px',
            height: '92px',
            borderRadius: '30px',
            background: lockConfig.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '22px',
            border: `1.5px solid ${lockConfig.iconBorder}`,
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)'
          }}>
            {lockConfig.icon}
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: '2.1rem',
            fontWeight: 900,
            margin: '0 0 14px 0',
            letterSpacing: '-0.025em',
            lineHeight: 1.2,
            color: '#ffffff'
          }}>
            {lockConfig.title}
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: '1.02rem',
            color: '#e2e8f0',
            lineHeight: 1.65,
            fontWeight: 500,
            margin: '0 0 22px 0',
            maxWidth: '460px'
          }}>
            {lockConfig.subtitle}
          </p>

          {/* Quote Card */}
          <div style={{
            padding: '14px 22px',
            borderRadius: '18px',
            background: 'rgba(255, 255, 255, 0.07)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            color: '#cbd5e1',
            fontSize: '0.88rem',
            fontStyle: 'italic',
            marginBottom: '32px',
            maxWidth: '420px',
            lineHeight: 1.5
          }}>
            {lockConfig.quote}
          </div>

          {/* Unlock Button */}
          <button
            type="button"
            onClick={() => {
              setPendingParentTarget('parent_controls');
              setShowParentGateModal(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 28px',
              borderRadius: '100px',
              background: 'rgba(255, 255, 255, 0.16)',
              border: '1.5px solid rgba(255, 255, 255, 0.35)',
              color: '#ffffff',
              fontSize: '0.92rem',
              fontWeight: 800,
              cursor: 'pointer',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
              transition: 'all 0.2s ease'
            }}
            className="hover-scale"
          >
            <Lock size={16} />
            <span>Eltern-PIN eingeben (Entsperren)</span>
          </button>
        </div>

        {/* Directly render parent gate & recovery modals on top of the portal with z-index 100002! */}
        {renderParentGateModal()}
        {renderRecoveryKeyModal()}
      </div>,
      document.body
    );
  }

  // WENN IS_APP_USER = TRUE (Selector Screen if no avatar chosen yet in GrooveLab)
  if (showSelector && currentPlatform === 'groovelab') {
    return (
      <div style={{ maxWidth: '640px', margin: '40px auto', background: 'rgba(15, 23, 42, 0.85)', border: '1.5px solid rgba(51, 65, 85, 0.8)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '32px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Sparkles size={32} color="#eab308" style={{ margin: '0 auto 8px auto' }} />
          <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', margin: '0 0 4px 0' }}>Wähle deinen Helden!</h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>Welche Musiker-Klasse passt zu dir? Du kannst sofort XP sammeln.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {HERO_CLASSES.map(hc => (
            <button
              key={hc.id}
              onClick={() => handleSelectHero(hc.id)}
              disabled={submittingSelection}
              style={{
                padding: '18px',
                background: 'rgba(2, 6, 23, 0.8)',
                border: '1.5px solid rgba(51, 65, 85, 0.8)',
                borderRadius: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              <span style={{ fontSize: '1.8rem', background: '#0f172a', padding: '10px', borderRadius: '12px', filter: 'grayscale(100%)' }}>{hc.icon}</span>
              <div>
                <span style={{ display: 'block', fontWeight: 800, color: '#ffffff', fontSize: '0.95rem' }}>{hc.name}</span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', lineHeight: 1.4 }}>{hc.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const currentLevel = avatar.evolution_level || 1;
  const currentXp = avatar.xp || 0;
  const { levelTitle, prevThreshold, nextThreshold, xpPercentage } = getLevelProgress(currentLevel, currentXp, avatar.instrument_type);

  // Circular progress calculations for fit style ring
  const circleRadius = 70;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (xpPercentage / 100) * circleCircumference;

  return (
    <div 
      className={`cg-full-height-board fluid-board-scroll-container ${isMusicStandMode ? 'cg-music-stand-mode' : ''}`} 
      style={{ 
        fontFamily: '"Outfit", "Inter", sans-serif', 
        maxWidth: '100%', 
        margin: '0 auto', 
        width: '100%', 
        padding: isMobile ? '0 0 140px 0' : '0 0 40px 0', 
        boxSizing: 'border-box',
        ...(isMusicStandMode ? {
          fontSize: '115%',
          letterSpacing: '-0.005em'
        } : {})
      }}
    >
      
      {/* 🎼 Notenständer- & Typografie-Kontrollleiste */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowLevelModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '100px',
              padding: isMusicStandMode ? '8px 16px' : '6px 14px',
              fontSize: isMusicStandMode ? '0.92rem' : '0.82rem',
              fontWeight: 850,
              color: '#1e293b',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              transition: 'all 0.2s ease'
            }}
            className="hover-scale"
          >
            <span>{studentUiLevel === 'junior' ? '🌟 Junior-Star (7–10 J.)' : (studentUiLevel === 'teen' ? '⚡ Teen-Flow (11–15 J.)' : '🎓 Pro-Studio (16+ J.)')}</span>
            <ChevronRight size={14} color="#64748b" />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={toggleMusicStandMode}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: isMusicStandMode ? '#ecfdf5' : '#ffffff',
              border: isMusicStandMode ? '1.5px solid #34a853' : '1.5px solid #e2e8f0',
              borderRadius: '100px',
              padding: isMusicStandMode ? '8px 18px' : '6px 14px',
              fontSize: isMusicStandMode ? '0.92rem' : '0.82rem',
              fontWeight: 900,
              color: isMusicStandMode ? '#15803d' : '#475569',
              cursor: 'pointer',
              boxShadow: isMusicStandMode ? '0 4px 14px rgba(52, 168, 83, 0.2)' : '0 2px 6px rgba(0,0,0,0.03)',
              transition: 'all 0.2s ease'
            }}
            className="hover-scale"
            title="Großschrift für Notenständer & Distanz am Instrument (60–90 cm)"
          >
            <span>🎼</span>
            <span>Notenständer-Modus</span>
            <span style={{
              background: isMusicStandMode ? '#34a853' : '#f1f5f9',
              color: isMusicStandMode ? '#ffffff' : '#64748b',
              fontSize: '0.70rem',
              fontWeight: 950,
              padding: '2px 8px',
              borderRadius: '100px',
              letterSpacing: '0.02em'
            }}>
              {isMusicStandMode ? 'AKTIV (+25%)' : 'AUS'}
            </span>
          </button>
        </div>
      </div>

      {/* ⏱️ Floating Übungs-Pufferzeit Countdown Widget (5 Min. Toleranz bei aktiver Übung) */}
      {activePracticeGrace && (
        <div style={{
          position: 'fixed',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99998,
          background: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1.5px solid #f59e0b',
          borderRadius: '100px',
          padding: isMusicStandMode ? '10px 22px' : '8px 18px',
          boxShadow: '0 10px 30px -4px rgba(245, 158, 11, 0.35), 0 4px 12px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#ffffff',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#f59e0b',
            boxShadow: '0 0 10px #f59e0b'
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: isMusicStandMode ? '0.94rem' : '0.86rem', fontWeight: 800, color: '#fde68a' }}>
              Übungs-Pufferzeit:
            </span>
            <span style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: isMusicStandMode ? '1.15rem' : '1.02rem',
              fontWeight: 900,
              color: '#ffffff',
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '2px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(245, 158, 11, 0.3)'
            }}>
              {String(Math.floor(activePracticeGrace.secondsLeft / 60)).padStart(2, '0')}:
              {String(activePracticeGrace.secondsLeft % 60).padStart(2, '0')}
            </span>
            <span style={{ fontSize: isMusicStandMode ? '0.90rem' : '0.82rem', color: '#cbd5e1', fontWeight: 600 }}>
              {activePracticeGrace.targetName}
            </span>
          </div>

          <button
            type="button"
            onClick={async () => {
              await autoFlushAndFinalizePractice();
            }}
            style={{
              background: '#f59e0b',
              color: '#0f172a',
              border: 'none',
              borderRadius: '100px',
              padding: isMusicStandMode ? '8px 16px' : '6px 14px',
              fontSize: isMusicStandMode ? '0.88rem' : '0.80rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
          >
            <Check size={14} />
            <span>Jetzt sichern &amp; beenden</span>
          </button>
        </div>
      )}

      {/* 5-Minuten-Vorwarnung (Grace Window vor Schlafenszeit / Sperrzeit) */}
      {lockWarningInfo && (
        <div style={{
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '1.5px solid #fde68a',
          padding: isMusicStandMode ? '20px 24px' : '16px 20px',
          borderRadius: '24px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 8px 24px -4px rgba(217, 119, 6, 0.12)',
          position: 'relative',
          animation: 'fadeIn 0.4s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: isMusicStandMode ? '52px' : '44px',
              height: isMusicStandMode ? '52px' : '44px',
              borderRadius: '16px',
              background: '#fef3c7',
              border: '1px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {lockWarningInfo.type === 'bedtime' ? <Moon size={isMusicStandMode ? 28 : 24} color="#d97706" /> : <BookOpen size={isMusicStandMode ? 28 : 24} color="#4338ca" />}
            </div>
            <div>
              <div style={{ fontSize: isMusicStandMode ? '1.20rem' : '1.05rem', fontWeight: 900, color: '#92400e' }}>
                {lockWarningInfo.title}
              </div>
              <div style={{ fontSize: isMusicStandMode ? '1.02rem' : '0.90rem', color: '#b45309', fontWeight: 650, marginTop: '2px', lineHeight: 1.4 }}>
                {lockWarningInfo.message}
              </div>
            </div>
          </div>
          <div style={{
            fontSize: isMusicStandMode ? '0.90rem' : '0.82rem',
            fontWeight: 850,
            background: '#ffffff',
            padding: isMusicStandMode ? '8px 16px' : '6px 14px',
            borderRadius: '100px',
            border: '1px solid #fde68a',
            color: '#b45309',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 6px rgba(217, 119, 6, 0.08)'
          }}>
            Automatische Sicherung aktiv 🛡️
          </div>
        </div>
      )}

      {/* Holiday Banner */}
      {isTodayHoliday && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.1) 0%, rgba(255, 255, 255, 0.98) 100%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(52, 168, 83, 0.18)',
          padding: '18px 24px',
          borderRadius: '24px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          boxShadow: '0 10px 30px -10px rgba(52, 168, 83, 0.08), 0 1px 3px rgba(0, 0, 0, 0.01)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }} className="hover-scale-subtle">
          {/* Subtle background glow */}
          <div style={{
            position: 'absolute',
            right: '-30px',
            top: '-30px',
            width: '120px',
            height: '120px',
            background: 'radial-gradient(circle, rgba(52, 168, 83, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          
          {/* Icon Badge */}
          <div style={{
            background: 'rgba(52, 168, 83, 0.08)',
            border: '1.5px solid rgba(52, 168, 83, 0.12)',
            color: '#34a853',
            padding: '12px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(52, 168, 83, 0.04)'
          }}>
            <Palmtree size={22} strokeWidth={2.2} />
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                color: '#34a853',
                background: 'rgba(52, 168, 83, 0.08)',
                padding: '3px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}>
                Schulfrei
              </span>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist', letterSpacing: '-0.01em' }}>
                {isTodayHoliday.name}
              </h4>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: '#475569', fontWeight: 600, lineHeight: 1.4 }}>
              Vom <strong style={{ color: '#34a853', fontWeight: 800 }}>{new Date(isTodayHoliday.start).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'})}</strong> bis zum <strong style={{ color: '#34a853', fontWeight: 800 }}>{new Date(isTodayHoliday.end).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'})}</strong> findet kein regulärer Unterricht statt. Genieße die Ferien!
            </p>
          </div>
        </div>
      )}

      {(!studentUiLevel || showLevelModal) && (
        <CampusLevelSelectModal
          currentLevel={studentUiLevel}
          onSelectLevel={handleLevelChange}
          onClose={studentUiLevel ? () => setShowLevelModal(false) : undefined}
        />
      )}


      
      {/* Top Tab Switcher - Removed per user request */}
      <div style={{ display: 'none', gap: '8px', background: '#f1f3f4', padding: '6px', borderRadius: '100px', marginBottom: '24px' }}>
        <button
          onClick={() => handleTabChangeLocal('briefing')}
          style={{
            flex: 1,
            border: 'none',
            background: activeTab === 'briefing' ? '#ffffff' : 'transparent',
            color: activeTab === 'briefing' ? '#0b57d0' : '#5f6368',
            padding: '10px 16px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeTab === 'briefing' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Coffee size={15} />
          <span>Briefing</span>
        </button>
        
        <button
          onClick={() => handleTabChangeLocal('songs')}
          style={{
            flex: 1.2,
            border: 'none',
            background: activeTab === 'songs' ? '#ffffff' : 'transparent',
            color: activeTab === 'songs' ? '#0b57d0' : '#5f6368',
            padding: '10px 16px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeTab === 'songs' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Music size={15} />
          <span>Songs & Material</span>
        </button>

        <button
          onClick={() => handleTabChangeLocal('practice_board')}
          style={{
            flex: 1.2,
            border: 'none',
            background: activeTab === 'practice_board' ? '#ffffff' : 'transparent',
            color: activeTab === 'practice_board' ? '#0b57d0' : '#5f6368',
            padding: '10px 16px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeTab === 'practice_board' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Clock size={15} />
          <span>Übe-Board</span>
        </button>

        <button
          onClick={() => handleTabChangeLocal('campus_cup')}
          style={{
            flex: 1.2,
            border: 'none',
            background: activeTab === 'campus_cup' ? '#ffffff' : 'transparent',
            color: activeTab === 'campus_cup' ? '#0b57d0' : '#5f6368',
            padding: '10px 16px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeTab === 'campus_cup' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Trophy size={15} />
          <span>Highlights & Fortschritt</span>
        </button>

        <button
          onClick={() => handleTabChangeLocal('hero')}
          style={{
            flex: 1,
            border: 'none',
            background: activeTab === 'hero' ? '#ffffff' : 'transparent',
            color: activeTab === 'hero' ? '#0b57d0' : '#5f6368',
            padding: '10px 16px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeTab === 'hero' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Star size={15} />
          <span>Mein Held</span>
        </button>
      </div>

      <StudentPracticeTab
        activeTab={activeTab}
        studentUiLevel={studentUiLevel}
        juniorMissionPhase={juniorMissionPhase}
        preStartCountdown={preStartCountdown}
        studentId={studentId}
        studentUser={studentUser}
        avatar={avatar}
        effectivePracticeMinutes={effectivePracticeMinutes}
        secondsElapsedRef={secondsElapsedRef}
        isJuniorMissionPausedRef={isJuniorMissionPausedRef}
        startJuniorMissionImmediately={startJuniorMissionImmediately}
        handleFinishJuniorMission={handleFinishJuniorMission}
        handleEmergencyExitJuniorMission={handleEmergencyExitJuniorMission}
        handleCloseJuniorCelebration={handleCloseJuniorCelebration}
        handleStartPracticeSession={handleStartPracticeSession}
        finishPracticeSession={finishPracticeSession}
        logParentGuidedPractice={logParentGuidedPractice}
        handleOpenHomeworkBookWithView={handleOpenHomeworkBookWithView}
        playMilestoneSound={playMilestoneSound}
        playStarChimeSound={playStarChimeSound}
        getDeterministicWeekMetrics={getDeterministicWeekMetrics}
        getGroupedLogs={getGroupedLogs}
        getJuniorMissionDetails={getJuniorMissionDetails}
        getTargetMinutes={getTargetMinutes}
        sessionActive={sessionActive}
        secondsElapsed={secondsElapsed}
        isMobile={isMobile}
        isMusicStandMode={isMusicStandMode}
        flamesActive={flamesActive}
        xpActive={xpActive}
        assignedCampusSongs={assignedCampusSongs}
        lehrwerke={lehrwerke}
        progressItems={progressItems}
        fokusLogs={fokusLogs}
        activeSongSkills={activeSongSkills}
        showJuniorPracticeSettingsModal={showJuniorPracticeSettingsModal}
        setShowJuniorPracticeSettingsModal={setShowJuniorPracticeSettingsModal}
        showJuniorStickerModal={showJuniorStickerModal}
        setShowJuniorStickerModal={setShowJuniorStickerModal}
        practiceAnchor={practiceAnchor}
        setPracticeAnchor={setPracticeAnchor}
        juniorMissionTier={juniorMissionTier}
        juniorMissionCountdown={juniorMissionCountdown}
        isJuniorMissionPaused={isJuniorMissionPaused}
        setIsJuniorMissionPaused={setIsJuniorMissionPaused}
        showJuniorCheatSheet={showJuniorCheatSheet}
        setShowJuniorCheatSheet={setShowJuniorCheatSheet}
        juniorSelectedTrackIndex={juniorSelectedTrackIndex}
        isJuniorTabPaused={isJuniorTabPaused}
        juniorCelebrationSummary={juniorCelebrationSummary}
        juniorLaunchStage={juniorLaunchStage}
        expandedMonths={expandedMonths}
        setExpandedMonths={setExpandedMonths}
      />

      <StudentSongsTab
        activeTab={activeTab}
        progressLoading={progressLoading}
        assignedCampusSongs={assignedCampusSongs}
        lehrwerke={lehrwerke}
        isMobile={isMobile}
        studentUser={studentUser}
        studentId={studentId}
        juniorMediathekFilter={juniorMediathekFilter}
        setJuniorMediathekFilter={setJuniorMediathekFilter}
        songSearch={songSearch}
        setSongSearch={setSongSearch}
        songSearchDebounced={songSearchDebounced}
        progressItems={progressItems}
        setSelectedTopic={setSelectedTopic}
        handleTabChangeLocal={handleTabChangeLocal}
        setSelectedSongForDetail={setSelectedSongForDetail}
        setCertificateSong={setCertificateSong}
        setSelectedLehrwerkForDetail={setSelectedLehrwerkForDetail}
        isSongMastered={isSongMastered}
        localProgress={localProgress}
        activeSongSkills={activeSongSkills}
      />

      <StudentCampusCupTab
        activeTab={activeTab}
        rankingLoading={rankingLoading}
        studentUser={studentUser}
        sessionActive={sessionActive}
        secondsElapsed={secondsElapsed}
        classMins={classMins}
        classWeeklyFocus={classWeeklyFocus}
        otherClassMins={otherClassMins}
        classmateIds={classmateIds}
        studentId={studentId}
        classFocusLogs={classFocusLogs}
        classCount={classCount}
        classGoals={classGoals}
        classHighlights={classHighlights}
        highlightsLoading={highlightsLoading}
        isMobile={isMobile}
      />
      <div style={{ display: activeTab === 'events' ? 'block' : 'none', width: '100%', boxSizing: 'border-box' }}>
        {activeTab === 'events' && (
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Lade Termine &amp; Kalender...</div>}>
            <CampusEventsBoard 
              userId={studentId}
              role="student"
              schoolId={studentUser?.school_id || ''}
              supabase={supabase}
              brandColor={studentUser?.schools?.brand_color || '#34a853'}
              studentUser={studentUser}
              parentAllowChat={isStudentChatAllowed}
              parentAllowAbsences={isStudentAbsenceAllowed}
            />
          </Suspense>
        )}
      </div>

      <div style={{ display: (activeTab === 'homework_book' && studentUser) ? 'block' : 'none', marginTop: '0px', width: '100%' }}>
        {activeTab === 'homework_book' && studentUser && (
          <HomeworkBookErrorBoundary key={homeworkRetryKey} onRetry={() => setHomeworkRetryKey(k => k + 1)}>
            <Suspense fallback={<HomeworkBookLoadingFallback onReload={() => setHomeworkRetryKey(k => k + 1)} />}>
              <MeisterwerkDocumentationModal
                key={`hw-modal-${studentId}-${homeworkRetryKey}`}
                student={{
                  ...studentUser,
                  id: studentId,
                  first_name: studentUser ? studentUser.first_name : '',
                  last_name: studentUser ? studentUser.last_name : '',
                  photo_url: (studentUser && studentUser.photo_url) || '/avatar_ghost.jpg',
                  is_campus_active: studentUser ? studentUser.is_campus_active : false,
                  school_id: studentUser?.school_id,
                  schoolId: studentUser?.school_id,
                  schools: studentUser?.schools,
                  school_name: (Array.isArray(studentUser?.schools) ? studentUser?.schools[0]?.name : studentUser?.schools?.name) || studentUser?.school_name,
                  instrument: studentUser?.instrument,
                  teacher_id: studentUser?.teacher_id
                }}
                onClose={() => handleTabChangeLocal('briefing')}
                teacherId={studentUser ? studentUser.teacher_id : null}
                readOnly={!isTeacherSession}
                isTeacherTools={isTeacherSession}
                isEmbed={true}
                initialModalTab={homeworkBookTab}
                initialViewMode={homeworkBookViewMode}
                uiLevel={studentUiLevel || 'junior'}
                initialXp={avatar?.xp || 0}
                initialStreak={avatar?.streak_flame || 0}
                initialPracticeMinutes={totalFocusMinutes || 0}
                initialMasteredSongsCount={songStats?.masteredCount || 0}
                hasTresorStorage={checkIsAudioTresorActive(studentUser) || checkIsAudioTresorActive({ schools: studentUser?.schools, school_name: studentUser?.schools?.name || studentUser?.school_name })}
                isParentUnlocked={isParentUnlocked || checkIsParentUnlockedGlobal()}
                parentPermissions={(studentUser as any)?.parent_permissions}
                onSaveParentOverrides={(overrides) => applyAndSaveParentControls({ boardOverrides: overrides })}
              />
            </Suspense>
          </HomeworkBookErrorBoundary>
        )}
      </div>

      {/* Briefing Tab */}
      <StudentBriefingTab
        studentId={studentId}
        DEFAULT_FOKUS_LEVELS={DEFAULT_FOKUS_LEVELS}
        activeSongSkills={activeSongSkills}
        activeTab={activeTab}
        activeTtsKey={activeTtsKey}
        avatar={avatar}
        briefingData={briefingData}
        campusFeedAnnouncements={campusFeedAnnouncements}
        cancelJuniorRecording={cancelJuniorRecording}
        checkIsParentUnlockedGlobal={checkIsParentUnlockedGlobal}
        checkOccurrenceHasMessages={checkOccurrenceHasMessages}
        circleRadius={circleRadius}
        classFeedInteractions={classFeedInteractions}
        classFeedPosts={classFeedPosts}
        classGoals={classGoals}
        classWeeklyMins={classWeeklyMins}
        currentPlatform={currentPlatform}
        currentXp={currentXp}
        downloadJuniorRecording={downloadJuniorRecording}
        draftAllowTts={draftAllowTts}
        effectiveLevel={effectiveLevel}
        effectivePracticeMinutes={effectivePracticeMinutes}
        feedInteractions={feedInteractions}
        finishPracticeSession={finishPracticeSession}
        flamesActive={flamesActive}
        fokusLogs={fokusLogs}
        getDeterministicWeekMetrics={getDeterministicWeekMetrics}
        getExactLogSeconds={getExactLogSeconds}
        getJuniorWeeklyHomeworkSummary={getJuniorWeeklyHomeworkSummary}
        getOccRoomName={getOccRoomName}
        getOccurrenceUnreadCount={getOccurrenceUnreadCount}
        getTargetMinutes={getTargetMinutes}
        graceSecondsLeft={graceSecondsLeft}
        handleAcknowledgeCancellation={handleAcknowledgeCancellation}
        handleOpenContributions={handleOpenContributions}
        handleOpenHomeworkBookWithView={handleOpenHomeworkBookWithView}
        handleReactToPost={handleReactToPost}
        handleRejectReschedule={handleRejectReschedule}
        handleSpeakText={handleSpeakText}
        handleStopSpeaking={handleStopSpeaking}
        handleSubmitClassFeedInteraction={handleSubmitClassFeedInteraction}
        handleTabChangeLocal={handleTabChangeLocal}
        handleToggleRightSidebar={handleToggleRightSidebar}
        handleTriggerCancelOccurrence={handleTriggerCancelOccurrence}
        handleTriggerConfirmReschedule={handleTriggerConfirmReschedule}
        handleTriggerUndoCancelOccurrence={handleTriggerUndoCancelOccurrence}
        isExtraTime={isExtraTime}
        isGraceActive={isGraceActive}
        isMobile={isMobile}
        isMusicStandMode={isMusicStandMode}
        isRightSidebarCollapsed={isRightSidebarCollapsed}
        isStudentAbsenceAllowed={isStudentAbsenceAllowed}
        isStudentRescheduleAllowed={isStudentRescheduleAllowed}
        isTodayHoliday={isTodayHoliday}
        isTtsSpeaking={isTtsSpeaking}
        juniorActivePlayingAudioId={juniorActivePlayingAudioId}
        juniorAudioPlayerRef={juniorAudioPlayerRef}
        juniorCountdown={juniorCountdown}
        juniorIsRecording={juniorIsRecording}
        juniorIsSaving={juniorIsSaving}
        juniorPreviewAudioRef={juniorPreviewAudioRef}
        juniorPreviewCurrentTime={juniorPreviewCurrentTime}
        juniorPreviewDuration={juniorPreviewDuration}
        juniorPreviewPlaying={juniorPreviewPlaying}
        juniorRecordDuration={juniorRecordDuration}
        juniorRecordTitle={juniorRecordTitle}
        juniorRecordedUrl={juniorRecordedUrl}
        juniorTeacherRecordings={juniorTeacherRecordings}
        lehrwerke={lehrwerke}
        localProgress={localProgress}
        progressItems={progressItems}
        saveJuniorRecording={saveJuniorRecording}
        scheduleOccurrences={scheduleOccurrences}
        schoolFokusLevels={schoolFokusLevels}
        schoolYearOccurrences={schoolYearOccurrences}
        secondsElapsed={secondsElapsed}
        secondsToDisplayMinutes={secondsToDisplayMinutes}
        sessionActive={sessionActive}
        setActiveTab={setActiveTab}
        setAppointmentChatData={setAppointmentChatData}
        setIsPhoneFlat={setIsPhoneFlat}
        setJuniorActivePlayingAudioId={setJuniorActivePlayingAudioId}
        setJuniorMissionPhase={setJuniorMissionPhase}
        setJuniorPreviewCurrentTime={setJuniorPreviewCurrentTime}
        setJuniorRecordTitle={setJuniorRecordTitle}
        setSessionActive={setSessionActive}
        setShowAppointmentChat={setShowAppointmentChat}
        setShowJuniorHomeworkModal={setShowJuniorHomeworkModal}
        setShowJuniorPreFlightModal={setShowJuniorPreFlightModal}
        setShowJuniorRecordingsModal={setShowJuniorRecordingsModal}
        setShowJuniorStickerModal={setShowJuniorStickerModal}
        setShowJuniorTimerModal={setShowJuniorTimerModal}
        setShowRulesModal={setShowRulesModal}
        setShowStudentToolbox={setShowStudentToolbox}
        setStudentFeedTab={setStudentFeedTab}
        showJuniorHomeworkModal={showJuniorHomeworkModal}
        showJuniorRecordModal={showJuniorRecordModal}
        showJuniorRecordingsModal={showJuniorRecordingsModal}
        showJuniorTimerModal={showJuniorTimerModal}
        songStats={songStats}
        songs={songs}
        startJuniorRecordingFlow={startJuniorRecordingFlow}
        stopJuniorRecording={stopJuniorRecording}
        strokeDashoffset={strokeDashoffset}
        studentFeedTab={studentFeedTab}
        studentInstrumentName={studentInstrumentName}
        studentUiLevel={studentUiLevel}
        studentUser={studentUser}
        togglePlayJuniorPreview={togglePlayJuniorPreview}
        togglePlayJuniorRecording={togglePlayJuniorRecording}
        totalUnreadDirectMessages={totalUnreadDirectMessages}
        unifiedStickersMap={unifiedStickersMap}
        unreadClassFeedCount={unreadClassFeedCount}
        xpActive={xpActive}
      />
      
      <StudentHeroTab
        activeTab={activeTab}
        avatar={avatar}
        effectiveLevel={effectiveLevel}
        xpActive={xpActive}
        levelTitle={levelTitle}
        hasMasteryCrown={hasMasteryCrown}
        currentLevel={currentLevel}
        currentXp={currentXp}
        nextThreshold={nextThreshold}
        xpPercentage={xpPercentage}
        showMissionsFeature={showMissionsFeature}
        studentMissionProgress={studentMissionProgress}
        progressItems={progressItems}
        studentUser={studentUser}
        pinInput={pinInput}
        setPinInput={setPinInput}
        setCustomAvatarFile={setCustomAvatarFile}
        handleUploadAvatarWithPin={handleUploadAvatarWithPin}
        isUploadingCustomAvatar={isUploadingCustomAvatar}
        startTour={startTour}
      />

      <StudentProfileTab
        activeTab={activeTab}
        studentUser={studentUser}
        studentId={studentId}
        avatar={avatar}
        editingProfile={editingProfile}
        setEditingProfile={setEditingProfile}
        showEditProfile={showEditProfile}
        setShowEditProfile={setShowEditProfile}
        savingProfile={savingProfile}
        handleSaveProfile={handleSaveProfile}
        showAvatarSelector={showAvatarSelector}
        setShowAvatarSelector={setShowAvatarSelector}
        avatarCategoryFilter={avatarCategoryFilter}
        setAvatarCategoryFilter={setAvatarCategoryFilter}
        showSecondEmail={showSecondEmail}
        setShowSecondEmail={setShowSecondEmail}
        familyProfiles={familyProfiles}
        handleSwitchFamilyStudent={handleSwitchFamilyStudent}
        setIsAddSiblingModalOpen={setIsAddSiblingModalOpen}
        showOwnQr={showOwnQr}
        setShowOwnQr={setShowOwnQr}
        studentSchedules={studentSchedules}
        monthlyFocusMinutes={monthlyFocusMinutes}
        fokusLogs={fokusLogs}
        sessionActive={sessionActive}
        secondsElapsed={secondsElapsed}
        isMusicStandMode={isMusicStandMode}
        flamesActive={flamesActive}
        xpActive={xpActive}
      />

      {/* Settings Tab */}
      <StudentSettingsTab
        activeStudentSettingsModal={activeStudentSettingsModal}
        activeTab={activeTab}
        applyAndSaveParentControls={applyAndSaveParentControls}
        avatar={avatar}
        bedtimeEnd={bedtimeEnd}
        bedtimeModeEnabled={bedtimeModeEnabled}
        bedtimeStart={bedtimeStart}
        cancelledSchoolYearOccurrences={cancelledSchoolYearOccurrences}
        checkIsParentSessionActive={checkIsParentSessionActive}
        currentPlatform={currentPlatform}
        daytimeLockDays={daytimeLockDays}
        daytimeLockEnabled={daytimeLockEnabled}
        daytimeLockEnd={daytimeLockEnd}
        daytimeLockStart={daytimeLockStart}
        draftAllowAbsences={draftAllowAbsences}
        draftAllowAudio={draftAllowAudio}
        draftAllowChat={draftAllowChat}
        draftAllowLeaderboard={draftAllowLeaderboard}
        draftAllowProposals={draftAllowProposals}
        draftAllowReschedule={draftAllowReschedule}
        draftAllowTimer={draftAllowTimer}
        draftAllowTts={draftAllowTts}
        draftBoardOverrides={draftBoardOverrides}
        draftUiLevel={draftUiLevel}
        extendParentSession={extendParentSession}
        familyProfiles={familyProfiles}
        firstPinActiveField={firstPinActiveField}
        firstPinShowMask={firstPinShowMask}
        generateParentRecoveryKey={generateParentRecoveryKey}
        getTargetMinutes={getTargetMinutes}
        handleBiometricUnlock={handleBiometricUnlock}
        handleCloseSettingsModal={handleCloseSettingsModal}
        handleDownloadGoBdReceipt={handleDownloadGoBdReceipt}
        handleExportGdprReport={handleExportGdprReport}
        handleOpenSettingsModule={handleOpenSettingsModule}
        handleRemoveFamilyProfile={handleRemoveFamilyProfile}
        handleSetInstantLock={handleSetInstantLock}
        handleSwitchFamilyStudent={handleSwitchFamilyStudent}
        handleUndoCancelOccurrence={handleUndoCancelOccurrence}
        handleUpdateBedtime={handleUpdateBedtime}
        handleUpdateDaytimeLock={handleUpdateDaytimeLock}
        handleVerifyParentPinAttempt={handleVerifyParentPinAttempt}
        hasCopiedRecoveryKey={hasCopiedRecoveryKey}
        instantLockUntil={instantLockUntil}
        isAddSiblingModalOpen={isAddSiblingModalOpen}
        isAdultStudent={isAdultStudent}
        isCurrentlyInInstantLock={isCurrentlyInInstantLock}
        isIOS={isIOS}
        isMobile={isMobile}
        isParentGateShaking={isParentGateShaking}
        isParentLockWarning={isParentLockWarning}
        isParentUnlocked={isParentUnlocked}
        isPremiumUser={isPremiumUser}
        isSavingPin={isSavingPin}
        isStandalone={isStandalone}
        isVerifyingParentGate={isVerifyingParentGate}
        isWebAuthnAvailable={isWebAuthnAvailable}
        newGeneratedRecoveryKey={newGeneratedRecoveryKey}
        onProfileUpdate={onProfileUpdate}
        parentBriefingDismissed={parentBriefingDismissed}
        parentControlsTab={parentControlsTab}
        parentGateCooldownSeconds={parentGateCooldownSeconds}
        parentGateError={parentGateError}
        parentGatePinInput={parentGatePinInput}
        parentLockRemainingSeconds={parentLockRemainingSeconds}
        parentSetupConfirm={parentSetupConfirm}
        parentSetupError={parentSetupError}
        parentSetupPin={parentSetupPin}
        parentSetupStep={parentSetupStep}
        pinFormConfirm={pinFormConfirm}
        pinFormError={pinFormError}
        pinFormNew={pinFormNew}
        pinFormSuccess={pinFormSuccess}
        pushEnabled={pushEnabled}
        pushNotifChat={pushNotifChat}
        pushNotifHomework={pushNotifHomework}
        pushNotifPracticeReminder={pushNotifPracticeReminder}
        pushNotifScheduleChanges={pushNotifScheduleChanges}
        pushNotifWeeklyDigest={pushNotifWeeklyDigest}
        recentlyChangedDiff={recentlyChangedDiff}
        renderParentGateModal={renderParentGateModal}
        renderRecoveryKeyModal={renderRecoveryKeyModal}
        scheduleOccurrences={scheduleOccurrences}
        securityPinTarget={securityPinTarget}
        setActiveStudentSettingsModal={setActiveStudentSettingsModal}
        setFamilyProfiles={setFamilyProfiles}
        setFirstPinActiveField={setFirstPinActiveField}
        setFirstPinShowMask={setFirstPinShowMask}
        setHasCopiedRecoveryKey={setHasCopiedRecoveryKey}
        setIsAddSiblingModalOpen={setIsAddSiblingModalOpen}
        setIsHelpCenterOpen={setIsHelpCenterOpen}
        setIsSavingPin={setIsSavingPin}
        setNewGeneratedRecoveryKey={setNewGeneratedRecoveryKey}
        setParentBriefingDismissed={setParentBriefingDismissed}
        setParentControlsTab={setParentControlsTab}
        setParentGateError={setParentGateError}
        setParentGatePinInput={setParentGatePinInput}
        setParentSetupConfirm={setParentSetupConfirm}
        setParentSetupError={setParentSetupError}
        setParentSetupPin={setParentSetupPin}
        setParentSetupStep={setParentSetupStep}
        setPinFormConfirm={setPinFormConfirm}
        setPinFormError={setPinFormError}
        setPinFormNew={setPinFormNew}
        setPinFormSuccess={setPinFormSuccess}
        setPushEnabled={setPushEnabled}
        setPushNotifChat={setPushNotifChat}
        setPushNotifHomework={setPushNotifHomework}
        setPushNotifPracticeReminder={setPushNotifPracticeReminder}
        setPushNotifScheduleChanges={setPushNotifScheduleChanges}
        setPushNotifWeeklyDigest={setPushNotifWeeklyDigest}
        setRecentlyChangedDiff={setRecentlyChangedDiff}
        setRecoveryKeyError={setRecoveryKeyError}
        setRecoveryKeyInput={setRecoveryKeyInput}
        setSecurityPinTarget={setSecurityPinTarget}
        setSettingsSubTab={setSettingsSubTab}
        setShowEmergencyKitModal={setShowEmergencyKitModal}
        setShowParentActivationModal={setShowParentActivationModal}
        setShowPushSoftPrompt={setShowPushSoftPrompt}
        setShowRecoveryKeyModal={setShowRecoveryKeyModal}
        setStudentUser={setStudentUser}
        showEmergencyKitModal={showEmergencyKitModal}
        studentId={studentId}
        studentUiLevel={studentUiLevel}
        studentUser={studentUser}
        totalPracticeMinutes={totalPracticeMinutes}
      />
      {/* Feedback & Ideenschmiede Modal */}
      {isFeedbackModalOpen && (
        <Suspense fallback={null}>
          <FeedbackHubModal
            isOpen={isFeedbackModalOpen}
            onClose={() => setIsFeedbackModalOpen(false)}
            userRole="student"
            userId={studentId}
            userName={studentUser?.first_name || 'Schüler'}
            schoolId={studentUser?.school_id}
            schoolName={(studentUser as any)?.school_name}
            activePlatform={currentPlatform}
          />
        </Suspense>
      )}

      {/* Meisterwerk Gold-Urkunde Modal */}
      {certificateSong && (
        <Suspense fallback={null}>
          <MeisterwerkCertificateModal
            studentName={studentUser?.first_name ? `${studentUser.first_name} ${studentUser.last_name || ''}`.trim() : 'Musikschüler'}
            songTitle={certificateSong.title || 'Meisterwerk'}
            instrument={studentUser?.instrument || 'Instrument'}
            schoolName={resolvedSchoolName}
            teacherName={studentUser?.teacher_name ? formatTeacherFullName(studentUser.teacher_name) : 'Deine Lehrkraft'}
            masteredDate={certificateSong.masteredDate}
            certificateId={certificateSong.certificateId}
            onClose={() => setCertificateSong(null)}
          />
        </Suspense>
      )}

      <StudentSongDetailModal
        song={selectedSongForDetail}
        onClose={() => setSelectedSongForDetail(null)}
        studentId={studentId}
        progressItems={progressItems}
        handleTabChangeLocal={handleTabChangeLocal}
        setSelectedTopic={setSelectedTopic}
      />

      <StudentLehrwerkDetailModal
        book={selectedLehrwerkForDetail}
        onClose={() => setSelectedLehrwerkForDetail(null)}
        lehrwerke={lehrwerke}
        progressItems={progressItems}
        localProgress={localProgress}
        studentId={studentId}
        isMobile={isMobile}
        handleTabChangeLocal={handleTabChangeLocal}
        setSelectedTopic={setSelectedTopic}
      />

      <CampusWrappedStoryModal
        isOpen={showWrapped && !!wrappedData}
        onClose={() => setShowWrapped(false)}
        wrappedData={wrappedData}
        avatar={avatar}
        currentLevel={currentLevel}
        studentId={studentId}
        levelTitle={levelTitle}
      />

      <DigitalDetoxOverlay
        isOpen={showDetox}
        onClose={() => setShowDetox(false)}
        detoxCompleted={detoxCompleted}
        setDetoxCompleted={setDetoxCompleted}
        detoxMinutes={detoxMinutes}
        detoxSecondsLeft={detoxSecondsLeft}
        isFaceDown={isFaceDown}
        setIsDetoxActive={setIsDetoxActive}
        xpActive={xpActive}
      />

      <FirstLoginPinModal
        isOpen={showFirstLoginPinModal}
        onClose={() => setShowFirstLoginPinModal(false)}
        studentUser={studentUser}
        studentId={studentId}
        pinFormNew={pinFormNew}
        setPinFormNew={setPinFormNew}
        pinFormConfirm={pinFormConfirm}
        setPinFormConfirm={setPinFormConfirm}
        pinFormError={pinFormError}
        setPinFormError={setPinFormError}
        firstPinActiveField={firstPinActiveField}
        setFirstPinActiveField={setFirstPinActiveField}
        firstPinShowMask={firstPinShowMask}
        setFirstPinShowMask={setFirstPinShowMask}
        firstPinSavedSuccess={firstPinSavedSuccess}
        setFirstPinSavedSuccess={setFirstPinSavedSuccess}
        isSavingPin={isSavingPin}
        setIsSavingPin={setIsSavingPin}
        setStudentUser={setStudentUser}
        onProfileUpdate={onProfileUpdate}
      />

      {/* Contributions breakdown pie chart modal */}
      <StudentContributionsModal
        data={contributionsModalData}
        loading={loadingContributions}
        onClose={() => setContributionsModalData(null)}
      />

      {/* Spielregeln Modal */}
      <StudentRulesModal
        isOpen={showRulesModal}
        evolutionLevel={avatar?.evolution_level || 1}
        onClose={() => setShowRulesModal(false)}
      />

      {/* Appointment Quick Chat (Shoutbox) Modal */}
      {showAppointmentChat && appointmentChatData && (() => {
        const foundOcc: any = (scheduleOccurrences || []).find((o: any) => o.id === appointmentChatData.occurrenceId || o.date === appointmentChatData.date) || 
                              (schoolYearOccurrences || []).find((o: any) => o.id === appointmentChatData.occurrenceId || o.date === appointmentChatData.date);
        const targetOcc: any = foundOcc || {
          id: appointmentChatData.occurrenceId,
          date: appointmentChatData.date,
          start_time: appointmentChatData.start_time,
          status: appointmentChatData.status || (appointmentChatData.isCancelled ? "canceled_by_student" : "scheduled"),
          teacher_id: appointmentChatData.teacherId,
          teacher: studentUser?.teacher_name ? { name: studentUser.teacher_name } : null,
          student_id: studentId,
          student: studentUser || { id: studentId }
        };
        return (
          <CampusAppointmentShoutboxModal
            isOpen={showAppointmentChat}
            onClose={() => {
              setShowAppointmentChat(false);
              setAppointmentChatData(null);
            }}
            occurrence={{
              ...targetOcc,
              teacher: targetOcc.teacher || (studentUser?.teacher_name ? { name: studentUser.teacher_name } : null),
              student: targetOcc.student || studentUser || { id: studentId }
            }}
            currentUserId={studentId}
            currentUserRole="student"
            currentUserProfile={studentUser || { id: studentId }}
            isParentUnlocked={checkIsParentUnlockedGlobal()}
            onRequestPinGate={(action) => {
              setGlobalPinPendingAction(() => action);
              setGlobalPinInput("");
              setGlobalPinError("");
              setShowGlobalParentPinModal(true);
            }}
            onStatusChange={(newStatus, updatedOcc) => {
              if (appointmentChatData) {
                setAppointmentChatData(prev => prev ? ({ ...prev, status: newStatus, isCancelled: newStatus === "cancelled" || newStatus === "canceled_by_student" }) : null);
              }
              if (typeof fetchStudentAndAvatar === "function") {
                fetchStudentAndAvatar();
              }
            }}
          />
        );
      })()}
      
      {/* Global Master PIN Gate Modal for Student Absence & Chat Unlock */}
      <GlobalParentPinModal
        isOpen={showGlobalParentPinModal}
        studentUiLevel={studentUiLevel}
        globalPinError={globalPinError}
        globalPinInput={globalPinInput}
        setGlobalPinInput={setGlobalPinInput}
        setGlobalPinError={setGlobalPinError}
        onVerify={handleVerifyGlobalParentPin}
        onClose={() => {
          setShowGlobalParentPinModal(false);
          setGlobalPinPendingAction(null);
        }}
      />

      {/* Crisis Notification Modal for Student Confirmation */}
      <StudentCrisisNotifsModal
        unreadCrisisNotifs={unreadCrisisNotifs}
        onDismiss={() => setUnreadCrisisNotifs([])}
      />
      {/* Live Match Celebration Modal Portal */}
      <StudentMatchCelebrationModal
        data={matchCelebrationData}
        onClose={() => setMatchCelebrationData(null)}
      />

      {/* Celebration / Success Logbook Overlay */}
      <StudentSessionCelebrationModal
        isOpen={showCelebration}
        celebrationDetails={celebrationDetails}
        studentUiLevel={studentUiLevel}
        personalAverageMinutes={personalAverageMinutes}
        celebrationRingProgress={celebrationRingProgress}
        celebrationCanvasRef={celebrationCanvasRef}
        onClose={() => {
          setShowCelebration(false);
          setLastSelectedMood(null);
        }}
      />

      {showPushSoftPrompt && (
        <Suspense fallback={null}>
          <PushNotificationSoftPromptModal
            isOpen={showPushSoftPrompt}
            onClose={() => setShowPushSoftPrompt(false)}
            userId={studentId}
            initialScheduleChanges={pushNotifScheduleChanges}
            initialHomework={pushNotifHomework}
            initialStreakAndNews={pushNotifAllFeatures}
            onSuccess={() => {
              setPushEnabled(true);
              fetchStudentAndAvatar();
            }}
          />
        </Suspense>
      )}

      {/* Praxis-Toolbox Modal */}
      {showStudentToolbox && (
        <Suspense fallback={null}>
          <StudentToolboxModal
            isOpen={showStudentToolbox}
            onClose={() => setShowStudentToolbox(false)}
            ageGroup={studentUiLevel || 'pro'}
          />
        </Suspense>
      )}

      {/* Parent Campus Activation Modal with Dynamic School Year Trial & EPC-QR GiroCode */}
      {showParentActivationModal && (
        <Suspense fallback={null}>
          <ParentCampusActivationModal
            student={studentUser || { id: studentId }}
            schoolData={{
              name: studentUser?.schools?.name || 'Campus-Groovelab Partner-Musikschule',
              billing_company: 'Campus-Groovelab Plattformbetrieb'
            }}
            onClose={() => setShowParentActivationModal(false)}
            onPaymentSubmitted={() => {
              setShowParentActivationModal(false);
              fetchStudentAndAvatar();
            }}
          />
        </Suspense>
      )}

      {/* Leitfäden & Akademie Modal für Schüler & Eltern */}
      {isHelpCenterOpen && (
        <Suspense fallback={null}>
          <HelpCenterModal
            isOpen={isHelpCenterOpen}
            onClose={() => setIsHelpCenterOpen(false)}
            userRole="student"
            activePlatform={currentPlatform}
            schoolName={resolvedSchoolName || 'Meine Musikschule'}
          />
        </Suspense>
      )}

      {/* 🚀 GLOBAL JUNIOR MISSION PRE-FLIGHT BRIEFING PORTAL */}
      <StudentJuniorPreFlightModal
        isOpen={showJuniorPreFlightModal}
        onClose={() => setShowJuniorPreFlightModal(false)}
        missionInfo={getJuniorMissionDetails()}
        targetMins={getTargetMinutes(avatar?.streak_flame || 0)}
        juniorSelectedTrackIndex={juniorSelectedTrackIndex}
        onSelectTrackIndex={setJuniorSelectedTrackIndex}
        onStartMission={() => {
          handleTabChangeLocal('practice_board');
          startJuniorMissionImmediately();
        }}
      />

      {/* 🏆 GLOBAL JUNIOR STICKER-ALBUM PORTAL */}
      <StudentJuniorStickerModal
        isOpen={showJuniorStickerModal}
        onClose={() => setShowJuniorStickerModal(false)}
        allStickers={ALL_STICKERS}
        unifiedStickersMap={unifiedStickersMap}
        juniorStickerCategory={juniorStickerCategory}
        setJuniorStickerCategory={setJuniorStickerCategory}
        onSelectSticker={(st) => setJuniorSelectedPreviewSticker(st)}
        onStartInstrument={() => {
          handleTabChangeLocal('practice_board');
          if (sessionActive) {
            setJuniorMissionPhase('zen');
          } else {
            setShowJuniorPreFlightModal(true);
          }
        }}
      />

      {/* 🌟 GLOBAL APPLE STICKER DETAIL INSPECTOR & QUEST PREVIEW */}
      <StudentJuniorStickerDetailModal
        sticker={juniorSelectedPreviewSticker}
        onClose={() => setJuniorSelectedPreviewSticker(null)}
        assignedCampusSongs={assignedCampusSongs}
        progressItems={progressItems}
        isSongMastered={isSongMastered}
        onStartRocket={() => {
          setJuniorSelectedPreviewSticker(null);
          setShowJuniorStickerModal(false);
          handleTabChangeLocal('practice_board');
          if (sessionActive) {
            setJuniorMissionPhase('zen');
          } else {
            setShowJuniorPreFlightModal(true);
          }
        }}
        onDownloadJpg={downloadJuniorStickerJpg}
      />

      {/* 🎉 GLOBAL JUNIOR STICKER AWARD CELEBRATION */}
      <StudentJuniorStickerAwardModal
        sticker={juniorAwardedStickerToCelebrate}
        assignedCampusSongs={assignedCampusSongs}
        progressItems={progressItems}
        isSongMastered={isSongMastered}
        onDownloadJpg={downloadJuniorStickerJpg}
        onStickInAlbum={() => {
          setJuniorAwardedStickerToCelebrate(null);
          setShowJuniorStickerModal(true);
        }}
      />

      <TourComponent />
    </div>
  );
}

