import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Music, Shield, Clock, CheckCircle, AlertTriangle, Flame, Zap, /* Car, */ Calendar, MapPin, User, Check, Sparkles, Play, Pause, BookOpen, X, FileText, ArrowLeft, Mail, CreditCard, Lock, Settings, Key, Users, Trophy, MessageSquare, Timer, ChevronDown, Smartphone, Award, ExternalLink, ShieldCheck, CheckCheck, Download, Target, Radio, BarChart3, Fingerprint, Delete } from 'lucide-react';
import { createPortal } from 'react-dom';
import { maskLastName, cleanHomeworkNotesText, formatTeacherFullName } from '../utils/nameHelper';
import { isWebAuthnSupported, registerUserBiometrics, getStoredBiometricProfiles } from '../utils/webauthn';
import { validateNewPin } from '../utils/pinValidation';
import { AudioTrackCarousel } from './AudioTrackCarousel';

import { useMasterPricing } from '../context/MasterPricingContext';
import { computeGroundTruthMetrics, broadcastPracticeUpdate } from '../utils/studentProgressEngine';

// ─── Helper: Device Key Storage ──────────────────────────────────────────────
const DEVICE_KEY_PREFIX = 'gl_device_key_';

const getOrCreateDeviceKey = (): string => {
  let key = localStorage.getItem('gl_global_device_key');
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem('gl_global_device_key', key);
  }
  return key;
};

const isPairedForToken = (token: string): boolean => {
  return localStorage.getItem(`${DEVICE_KEY_PREFIX}${token}`) === 'paired';
};

const markPairedForToken = (token: string): void => {
  localStorage.setItem(`${DEVICE_KEY_PREFIX}${token}`, 'paired');
};

const getInstrumentAvatarUrl = (instrument: string | null | undefined): string => {
  if (!instrument) return '/avatars/gitarre_avatar_new.png';
  const inst = instrument.toLowerCase().trim();
  if (inst.includes('e-gitarre')) return '/avatars/egitarre_avatar.png';
  if (inst.includes('guitar') || inst.includes('gitarre')) return '/avatars/gitarre_avatar_new.png';
  if (inst.includes('e-bass')) return '/avatars/ebass_avatar.png';
  if (inst.includes('kontrabass') || inst.includes('double bass')) return '/avatars/kontrabass_avatar.png';
  if (inst.includes('bass')) return '/avatars/bass_avatar.png';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return '/avatars/schlagzeug_avatar.png';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return '/avatars/klavier_avatar_new.png';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return '/avatars/gesang_avatar.png';
  if (inst.includes('trompete') || inst.includes('trumpet')) return '/avatars/trompete_avatar_new.png';
  if (inst.includes('posaune') || inst.includes('trombone')) return '/avatars/posaune_avatar.png';
  if (inst.includes('horn')) return '/avatars/horn_avatar_new.png';
  if (inst.includes('cello')) return '/avatars/cello_avatar_new.png';
  if (inst.includes('geige') || inst.includes('violin') || inst.includes('violine')) return '/avatars/violine_avatar_new.png';
  if (inst.includes('klarinette') || inst.includes('clarinet')) return '/avatars/klarinette_avatar_new.png';
  if (inst.includes('querflöte') || inst.includes('flute')) return '/avatars/querfloete.png';
  if (inst.includes('saxofon') || inst.includes('saxophone') || inst.includes('sax')) return '/avatars/saxophon_avatar_new.png';
  if (inst.includes('blockflöte') || inst.includes('recorder') || inst.includes('blockfloete')) return '/avatars/blockfloete_avatar.png';
  if (inst.includes('bariton') || inst.includes('baritone')) return '/avatars/bariton_avatar.png';
  if (inst.includes('oboe')) return '/avatars/oboe_avatar.png';
  return '/avatars/gitarre_avatar_new.png';
};

const getLehrwerkColor = (title: string, customLehrwerkeList?: any[]) => {
  const trimmed = (title || '').trim();
  const list = customLehrwerkeList || [];
  const sorted = [...list].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  const index = sorted.findIndex(b => (b.title || '').trim() === trimmed);
  
  if (index !== -1 && sorted.length > 0) {
    const position = index % 26;
    const hue = Math.round((position / 25) * 360);
    return {
      from: `hsl(${hue}, 85%, 94%)`,
      to: `hsl(${hue}, 80%, 84%)`,
      text: `hsl(${hue}, 90%, 25%)`,
      shadowFrom: `hsla(${hue}, 85%, 50%, 0.2)`,
      shadowTo: `hsla(${hue}, 80%, 40%, 0.15)`
    };
  }

  const firstChar = trimmed.charAt(0).toUpperCase();
  const charCode = firstChar.charCodeAt(0) || 65;
  const clampedCode = Math.max(65, Math.min(90, charCode));
  const hue = Math.round(((clampedCode - 65) / 25) * 360);
  return {
    from: `hsl(${hue}, 85%, 94%)`,
    to: `hsl(${hue}, 80%, 84%)`,
    text: `hsl(${hue}, 90%, 25%)`,
    shadowFrom: `hsla(${hue}, 85%, 50%, 0.2)`,
    shadowTo: `hsla(${hue}, 80%, 40%, 0.15)`
  };
};

const getSimulatedNow = (): Date => {
  const simStr = localStorage.getItem('groovelab_simulated_date');
  if (!simStr) return new Date();
  const startTsStr = localStorage.getItem('groovelab_simulated_start_timestamp');
  const startTs = startTsStr ? parseInt(startTsStr, 10) : Date.now();
  const elapsed = Date.now() - (isNaN(startTs) ? Date.now() : startTs);
  const parts = simStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0])) return new Date();
  const base = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  return new Date(base.getTime() + elapsed);
};

const registerProfileLocally = (userData: any) => {
  if (typeof window === 'undefined' || !userData || !userData.id) return;
  try {
    const registry = JSON.parse(localStorage.getItem('groovelab_local_profiles') || '[]');
    const existingIdx = registry.findIndex((p: any) => p.id === userData.id);
    const entry = {
      id: userData.id,
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      photo_url: userData.photo_url || userData.avatar_url || null,
      role: userData.role || 'student',
      school_id: userData.school_id || null,
      qr_token: userData.qr_token || null
    };
    if (existingIdx !== -1) {
      registry[existingIdx] = { ...registry[existingIdx], ...entry };
    } else {
      registry.push(entry);
    }
    localStorage.setItem('groovelab_local_profiles', JSON.stringify(registry));
  } catch (e) {
    console.error('[QRLandingPage] Failed to register profile locally:', e);
  }
};

const computeSha256Hex = async (str: string): Promise<string> => {
  try {
    const msgBuffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return '';
  }
};

const verifyParentPinClient = async (studentId: string, inputPin: string, profileParentPin?: string | null): Promise<boolean> => {
  const cleanInput = inputPin.trim();
  if (!cleanInput) return false;

  // 1. Supabase RPC check (handles SHA-256 in users_raw on server)
  try {
    const { data: rpcRes, error } = await supabase.rpc('verify_parent_pin', {
      student_id: studentId,
      input_pin: cleanInput,
    });
    if (!error && rpcRes === true) {
      return true;
    }
  } catch (e) {}

  // 2. Client-side SHA-256 hash or plaintext check against in-memory profile
  if (profileParentPin) {
    const cleanProfilePin = profileParentPin.trim();
    if (cleanProfilePin === cleanInput) return true;
    const inputHash = await computeSha256Hex(cleanInput);
    if (inputHash && cleanProfilePin.toLowerCase() === inputHash.toLowerCase()) return true;
  }

  // 3. LocalStorage parent PIN backup check
  const cachedParentPin = localStorage.getItem(`groovelab_parent_pin_${studentId}`);
  if (cachedParentPin && cachedParentPin.trim() === cleanInput) {
    return true;
  }

  return false;
};

// ─── Main Component ───────────────────────────────────────────────────────────
interface QRLandingPageProps {
  token: string;
}

type PageState = 'loading' | 'pin_required' | 'profile' | 'error' | 'inactive_landing';

interface ProfileData {
  id: string;
  first_name: string;
  last_name: string;
  instrument: string | null;
  photo_url: string | null;
  role: string;
  roles?: string[];
  school_name: string;
  school_id: string | null;
  is_campus_active: boolean;
  is_groovelab_active: boolean;
  app_usage_mode: string;
  joker_used_at?: string | null;
  created_at?: string;
  is_trial?: boolean;
  trial_ends_at?: string | null;
  exempt_from_direct_billing?: boolean;
  has_parent_pin?: boolean | null;
  has_personal_pin?: boolean | null;
  personal_pin?: string | null;
  parent_pin?: string | null;
  onboarding_pin?: string | null;
  is_pin_activated?: boolean;
  pin_enforced_for_preview?: boolean;
  parent_allow_absences?: boolean;
  parent_allow_chat?: boolean;
  parent_allow_timer?: boolean;
  parent_allow_leaderboard?: boolean;
  parent_allow_groups?: boolean;
  parent_allow_proposals?: boolean;
  campus_ui_level?: 'junior' | 'teen' | 'pro' | string;
  streak_flame?: number;
  total_practice_minutes?: number;
}

export function QRLandingPage({ token }: QRLandingPageProps) {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const masterPricing = useMasterPricing();

  const redirectToCampus = async (userData: { id: string; role: string; roles?: string[]; is_campus_active?: boolean; is_groovelab_active?: boolean; schools?: any }) => {
    const rolesArray = Array.isArray(userData.roles) ? userData.roles : [];
    const hasAdminRole = rolesArray.includes('admin');
    const hasSecretaryRole = rolesArray.includes('secretary');
    const isAdminOrSecretary = userData.role === 'admin' || userData.role === 'secretary' || hasAdminRole || hasSecretaryRole;

    if (isAdminOrSecretary) {
      const finalAdminRole = hasAdminRole ? 'admin' : 'secretary';
      if (userData.role !== finalAdminRole) {
        await supabase.from('users').update({ role: finalAdminRole }).eq('id', userData.id);
      }
      sessionStorage.setItem('groovelab_active_workspace', 'secretary');
    }

    // Force check out from active sessions on Campus login to prevent automatic check-in visibility
    await supabase.from('sessions').update({ check_out_time: new Date().toISOString() }).eq('user_id', userData.id).is('check_out_time', null);

    // CRITICAL: Clear QR token session locks so App.tsx routes to full WebApp Dashboard
    sessionStorage.removeItem('groovelab_qr_token');
    localStorage.removeItem('groovelab_last_qr_token');

    // Register profile locally for Netflix family profile selector
    registerProfileLocally(userData);

    sessionStorage.setItem('groovelab_user_id', userData.id);

    const schoolObj = Array.isArray(userData.schools) ? userData.schools[0] : userData.schools;
    const schoolHasCampus = schoolObj?.has_campus_subscription ?? true;
    const schoolHasGroove = schoolObj?.has_groovelab_subscription ?? true;

    const isCampusActive = Boolean(schoolHasCampus && userData.is_campus_active);
    const isGroovelabActive = Boolean(schoolHasGroove && userData.is_groovelab_active);

    if (isCampusActive) {
      // 1. Campus Modul -> Briefing Board
      sessionStorage.setItem('groovelab_active_platform', 'campus');
      sessionStorage.setItem('campus_active_tab', 'briefing');
    } else if (isGroovelabActive) {
      // 2. GrooveLab Modul -> Live Lab Board
      sessionStorage.setItem('groovelab_active_platform', 'groovelab');
      sessionStorage.setItem('groovelab_active_tab', 'live');
    } else {
      // 3. Gar kein Modul aktiviert -> QR Landingpage
      sessionStorage.setItem('groovelab_active_platform', 'campus');
      sessionStorage.setItem('campus_active_tab', 'qr_landing');
    }

    window.location.replace('/');
  };

  const getISOWeekLocal = (d: Date) => {
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return Math.ceil((firstThursday - target.valueOf()) / 604800000) + 1;
  };

  // Admin Mobile Stats
  const [adminStats, setAdminStats] = useState({ activeStudents: 0, activeTeachers: 0, pendingActivations: 0 });
  const [loadingAdminStats, setLoadingAdminStats] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Teacher Mobile Schedule States
  const [teacherTodayLessons, setTeacherTodayLessons] = useState<any[]>([]);
  const [loadingTeacherSchedule, setLoadingTeacherSchedule] = useState(false);
  const [teacherModuleFilter, setTeacherModuleFilter] = useState<'all' | 'campus' | 'groovelab'>('all');

  // Persist QR token in sessionStorage so page reload on /qr/ token stays on QR Landing Page
  useEffect(() => {
    if (token) {
      sessionStorage.setItem('groovelab_qr_token', token);
    }
  }, [token]);

  // Inaktive Aktivierungs-States
  const [activationStep, setActivationStep] = useState<'landing' | 'email' | 'payment' | 'success'>('landing');
  const [parentEmail, setParentEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'debit' | 'cash'>('debit');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [schoolData, setSchoolData] = useState<any>(null);
  const [showParentAgb, setShowParentAgb] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showActivationInfoModal, setShowActivationInfoModal] = useState(false);

  // Biometrics Onboarding Modal State
  const [showBiometricsModal, setShowBiometricsModal] = useState(false);
  const [biometricsLoading, setBiometricsLoading] = useState(false);

  useEffect(() => {
    if (profile && profile.id && isWebAuthnSupported()) {
      const existing = getStoredBiometricProfiles();
      const alreadyRegistered = existing.some((p) => p.userId === profile.id);
      const dismissed = localStorage.getItem(`gl_bio_dismissed_${profile.id}`) === 'true';
      if (!alreadyRegistered && !dismissed) {
        setShowBiometricsModal(true);
      }
    }
  }, [profile]);

  const handleEnableBiometrics = async () => {
    if (!profile) return;
    setBiometricsLoading(true);
    try {
      const userEmail = `${profile.first_name}.${profile.last_name}@campus-groovelab.de`;
      await registerUserBiometrics(
        userEmail,
        profile.id,
        profile.first_name,
        profile.last_name,
        profile.role,
        token,
        profile.instrument,
        profile.photo_url
      );
      showToastMsg('Fingerabdruck erfolgreich für dieses Gerät verknüpft!', 'success');
      setShowBiometricsModal(false);
    } catch (err: any) {
      console.error('Biometrics registration error:', err);
      showToastMsg('Biometrie-Einrichtung abgebrochen: ' + (err.message || ''), 'error');
    } finally {
      setBiometricsLoading(false);
    }
  };

  const handleVollzugriffClick = () => {
    if (profile?.is_campus_active || profile?.is_groovelab_active) {
      setPinPurpose('unlock_app');
      setPageState('pin_required');
    } else {
      setShowActivationInfoModal(true);
    }
  };

  // PIN-Eingabe
  const [pinInput, setPinInput] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinAttempts, setPinAttempts] = useState(0);
  const MAX_ATTEMPTS = 3;

  // Student Dashboard & Gamification States
  const [schedules, setSchedules] = useState<any[]>([]);
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [roomBookings, setRoomBookings] = useState<any[]>([]);
  const [activeChatOcc, setActiveChatOcc] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatTypedMessage, setChatTypedMessage] = useState('');
  const [activeChatOccIds, setActiveChatOccIds] = useState<Set<string>>(new Set());
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [practiceLoggedToday, setPracticeLoggedToday] = useState(false);
  const [avatar, setAvatar] = useState<any | null>(null);

  const DEFAULT_FOKUS_LEVELS = {
    level1: { kleine: 3, mittlere: 5, helden: 10 },
    level2: { kleine: 5, mittlere: 10, helden: 15 },
    level3: { kleine: 10, mittlere: 15, helden: 20 }
  };

  const [schoolFokusLevels, setSchoolFokusLevels] = useState<any>(null);

  const getFlameCategory = (streak: number): 'kleine' | 'mittlere' | 'helden' => {
    if (streak >= 9) return 'helden';
    if (streak >= 4) return 'mittlere';
    return 'kleine';
  };

  const getDailyGoal = () => {
    const level = avatar?.evolution_level || 1;
    const cat = getFlameCategory(avatar?.streak_flame || 0);
    const config = schoolFokusLevels || DEFAULT_FOKUS_LEVELS;
    const levelKey = `level${level}` as 'level1' | 'level2' | 'level3';
    const levelConfig = config[levelKey] || DEFAULT_FOKUS_LEVELS[levelKey];
    return levelConfig[cat] || DEFAULT_FOKUS_LEVELS[levelKey][cat];
  };

  // Daily goal based on evolution level and flame level config
  const dailyGoal = getDailyGoal();
  const [loggedMinutesToday, setLoggedMinutesToday] = useState<number>(0);
  const [ringProgress, setRingProgress] = useState<number>(0);
  const [hasExploded, setHasExploded] = useState<boolean>(false);

  // Ref for canvas particle explosion
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Focus Timer Sensors & Grace states
  const [isPhoneFlat, setIsPhoneFlat] = useState(false);
  const [flatType, setFlatType] = useState<'face-up' | 'face-down' | 'none'>('none');
  const [isGraceActive, setIsGraceActive] = useState(false);
  const [graceSecondsLeft, setGraceSecondsLeft] = useState(10);
  const [isDesktopFallback, setIsDesktopFallback] = useState(true);
  const [isExtraTime, setIsExtraTime] = useState(false);
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [checkpointSecondsLeft, setCheckpointSecondsLeft] = useState(20);
  const nextCheckpointSecondsRef = useRef<number>(0);
  const currentLogIdRef = useRef<string | null>(null);
  const currentExtraLogIdRef = useRef<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const isExtraTimeRef = useRef(false);
  useEffect(() => {
    isExtraTimeRef.current = isExtraTime;
  }, [isExtraTime]);
  /*
  const [activeDriver, setActiveDriver] = useState<'Du' | 'Mama' | 'Papa' | 'Oma'>('Du');

  // Chauffeur-info Klick-Wechsel
  const handleDriverCycle = () => {
    setActiveDriver(prev => {
      if (prev === 'Du') return 'Mama';
      if (prev === 'Mama') return 'Papa';
      if (prev === 'Papa') return 'Oma';
      return 'Du';
    });
  };
  */

  // Multi-Mode specific states
  const [progressItems, setProgressItems] = useState<any[]>([]);
  const [activeSongSkills, setActiveSongSkills] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [lehrwerke, setLehrwerke] = useState<any[]>([]);
  const [localProgress, setLocalProgress] = useState<any[]>(() => {
    try {
      const stored1 = localStorage.getItem('student_lehrwerke_progress');
      const stored2 = localStorage.getItem('campus_lehrwerke_progress');
      const p1 = stored1 ? JSON.parse(stored1) : [];
      const p2 = stored2 ? JSON.parse(stored2) : [];
      return [...(Array.isArray(p1) ? p1 : []), ...(Array.isArray(p2) ? p2 : [])];
    } catch {
      return [];
    }
  });
  const [activeTab, setActiveTab] = useState<'action' | 'homework' | 'lessons' | 'settings'>('action');

  // Auto-switch to Hausaufgaben tab if Campus module is not booked
  useEffect(() => {
    if (profile && !profile.is_campus_active && activeTab === 'action') {
      setActiveTab('homework');
    }
  }, [profile, activeTab]);
  const [lessonsUnlocked, setLessonsUnlocked] = useState(false);
  const [lessonsPinAttempts, setLessonsPinAttempts] = useState(0);
  const [pendingCancelOccId, setPendingCancelOccId] = useState<string | null>(null);
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});
  const [unreadMessageOccurrences, setUnreadMessageOccurrences] = useState<string[]>([]);
  const [pastSectionExpanded, setPastSectionExpanded] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  const [parentUnlocked, setParentUnlocked] = useState(false);
  const [pinPurpose, setPinPurpose] = useState<'unlock_preview' | 'unlock_app' | 'setup_initial_pin'>('unlock_app');
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [parentPinInput, setParentPinInput] = useState('');
  const [parentPinError, setParentPinError] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const [isInitialPinSetup, setIsInitialPinSetup] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [parentPinAttempts, setParentPinAttempts] = useState(0);
  const [parentPinLockoutUntil, setParentPinLockoutUntil] = useState<number | null>(null);
  const [pinChangeLoading, setPinChangeLoading] = useState(false);
  const [parentPinErrorMsg, setParentPinErrorMsg] = useState<string | null>(null);
  const [parentPinSuccessMsg, setParentPinSuccessMsg] = useState<string | null>(null);
  const [showForgotPinInfo, setShowForgotPinInfo] = useState(false);

  // Dedicated 6-Digit Parent Master Gatekeeper States
  const [isParentPinMode, setIsParentPinMode] = useState(false);
  const [parentSetupStep, setParentSetupStep] = useState<'enter' | 'confirm'>('enter');
  const [parentSetupPin, setParentSetupPin] = useState('');
  const [parentSetupConfirm, setParentSetupConfirm] = useState('');
  const [parentSetupError, setParentSetupError] = useState('');
  const [parentUnlockInput, setParentUnlockInput] = useState('');
  const [parentUnlockError, setParentUnlockError] = useState('');
  // Step-Up PIN Confirmation for saving parent settings
  const [draftUiLevel, setDraftUiLevel] = useState<string | null>(null);
  const [draftAllowAbsences, setDraftAllowAbsences] = useState<boolean | null>(null);
  const [draftAllowChat, setDraftAllowChat] = useState<boolean | null>(null);
  const [draftAllowLeaderboard, setDraftAllowLeaderboard] = useState<boolean | null>(null);
  const [showSavePinModal, setShowSavePinModal] = useState(false);
  const [savePinInput, setSavePinInput] = useState('');
  const [savePinError, setSavePinError] = useState<string | null>(null);
  const [savePinLoading, setSavePinLoading] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToastMsg = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // PWA Installation states
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isInstallDismissed, setIsInstallDismissed] = useState<boolean>(() => {
    return localStorage.getItem('groovelab_pwa_prompt_dismissed') === 'true';
  });
  const [isStandaloneApp, setIsStandaloneApp] = useState<boolean>(() => {
    return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  });
  const [showIOSInstallGuide, setShowIOSInstallGuide] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const matchStandalone = window.matchMedia('(display-mode: standalone)');
    const handleStandaloneChange = (e: MediaQueryListEvent) => {
      setIsStandaloneApp(e.matches);
    };
    matchStandalone.addEventListener?.('change', handleStandaloneChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      matchStandalone.removeEventListener?.('change', handleStandaloneChange);
    };
  }, []);

  // Screen WakeLock for uninterrupted mobile practice
  const wakeLockRef = useRef<any>(null);
  useEffect(() => {
    const acquireWakeLock = async () => {
      if (!('wakeLock' in navigator)) return;
      try {
        if (wakeLockRef.current) return;
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('[PWA] Screen WakeLock acquired for practice session');
      } catch (err) {
        console.warn('[PWA] WakeLock request failed:', err);
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
          console.log('[PWA] Screen WakeLock released');
        } catch (err) {
          console.warn('[PWA] Error releasing WakeLock:', err);
        }
      }
    };

    if (timerRunning) {
      acquireWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && timerRunning) {
        acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [timerRunning]);

  const handleInstallClick = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredInstallPrompt(null);
      }
    } else {
      setShowIOSInstallGuide(prev => !prev);
    }
  };

  const handleDismissInstall = () => {
    setIsInstallDismissed(true);
    localStorage.setItem('groovelab_pwa_prompt_dismissed', 'true');
  };

  const renderPWAInstallCard = () => {
    if (isStandaloneApp || isInstallDismissed) return null;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    return createPortal(
      <div style={{
        position: 'fixed',
        bottom: '18px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: '440px',
        zIndex: 9999,
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(52, 168, 83, 0.3)',
        borderRadius: '20px',
        padding: '12px 16px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(52, 168, 83, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {/* Main Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          {/* Left: Icon & Text */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 3px 10px rgba(52, 168, 83, 0.25)',
              border: '1px solid rgba(52, 168, 83, 0.2)',
              background: '#ffffff'
            }}>
              <img src="/pwa-icon.png" alt="Campus App" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <h4 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Campus App installieren
              </h4>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#475569', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Schnellzugriff vom Startbildschirm
              </p>
            </div>
          </div>

          {/* Right: Install Button & Dismiss X */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleInstallClick}
              style={{
                padding: '7px 14px',
                borderRadius: '100px',
                background: '#34a853',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 3px 10px rgba(52, 168, 83, 0.3)',
                whiteSpace: 'nowrap'
              }}
            >
              <Download size={13} />
              <span>{deferredInstallPrompt ? 'Installieren' : (isIOS ? 'Anleitung' : 'Hinzufügen')}</span>
            </button>

            <button
              type="button"
              onClick={handleDismissInstall}
              aria-label="Schließen"
              style={{
                background: '#f1f5f9',
                border: 'none',
                color: '#64748b',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <X size={14} color="#64748b" />
            </button>
          </div>
        </div>

        {/* iOS Step-by-Step Guide */}
        {showIOSInstallGuide && (
          <div style={{
            background: '#f8fafc',
            borderRadius: '12px',
            padding: '10px 12px',
            fontSize: '0.75rem',
            color: '#334155',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ fontWeight: 800, color: '#166534', marginBottom: '1px' }}>
              So installierst du die App auf iOS/Safari:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#dcfce7', color: '#166534', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 800 }}>1</span>
              <span>Tippe in Safari unten auf das <strong>Teilen-Symbol ↗️</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#dcfce7', color: '#166534', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 800 }}>2</span>
              <span>Wähle <strong>'Zum Home-Bildschirm' ➕</strong></span>
            </div>
          </div>
        )}
      </div>,
      document.body
    );
  };

  const renderBiometricsModal = () => {
    if (!showBiometricsModal || !profile) return null;

    return createPortal(
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '28px 24px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: '#e6f4ea',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(52, 168, 83, 0.15)'
          }}>
            <Fingerprint size={36} color="#34a853" />
          </div>

          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              Schnell-Login per Fingerabdruck
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: '1.4' }}>
              Möchtest du <strong>{profile.first_name}</strong> auf diesem Gerät verknüpfen, um dich in Zukunft direkt per Fingerabdruck oder FaceID einzuloggen?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '8px' }}>
            <button
              type="button"
              onClick={handleEnableBiometrics}
              disabled={biometricsLoading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: '#34a853',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(52, 168, 83, 0.3)'
              }}
            >
              <Fingerprint size={20} />
              <span>{biometricsLoading ? 'Einrichten...' : 'Fingerabdruck aktivieren'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (profile) localStorage.setItem(`gl_bio_dismissed_${profile.id}`, 'true');
                setShowBiometricsModal(false);
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '16px',
                background: '#f1f5f9',
                color: '#64748b',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Später
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const handleSaveInitialPin = async () => {
    if (!profile) return;
    setParentPinErrorMsg(null);
    setParentPinSuccessMsg(null);
    if (newPinInput.length !== 4 || newPinConfirm.length !== 4) {
      setParentPinErrorMsg('Die PIN muss 4 Ziffern lang sein.');
      return;
    }
    if (newPinInput !== newPinConfirm) {
      setParentPinErrorMsg('Die PINs stimmen nicht überein.');
      return;
    }
    if (newPinInput === '0000') {
      setParentPinErrorMsg('Die PIN darf nicht „0000“ sein.');
      return;
    }
    setPinChangeLoading(true);
    try {
      // 1. Primary: Atomic RPC
      let rpcOk = false;
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('set_initial_student_pin', {
          p_student_id: profile.id,
          p_qr_token: token,
          p_pin: newPinInput
        });
        if (!rpcErr && rpcRes === true) {
          rpcOk = true;
        }
      } catch (e) {
        console.warn('[QRLanding] set_initial_student_pin RPC notice:', e);
      }

      // 2. Secondary fallback update if RPC was unavailable
      if (!rpcOk) {
        const { error } = await supabase
          .from('users')
          .update({ 
            parent_pin: newPinInput,
            personal_pin: newPinInput,
            onboarding_pin: newPinInput,
            is_pin_activated: true,
            status: 'aktiv'
          })
          .eq('id', profile.id);

        if (error && !error.message?.includes('record "new" has no field')) {
          console.warn('[QRLanding] direct table update fallback notice:', error);
        }
      }

      // 3. Cache credentials locally on this device
      localStorage.setItem(`groovelab_user_pin_${profile.id}`, newPinInput);
      localStorage.setItem(`groovelab_pin_${token}`, newPinInput);
      sessionStorage.setItem(`groovelab_parent_unlocked_${token}`, 'true');
      sessionStorage.setItem(`groovelab_parent_unlocked_${profile.id}`, 'true');
      sessionStorage.setItem(`groovelab_lessons_unlocked_${profile.id}`, 'true');

      setProfile(prev => prev ? { 
        ...prev, 
        has_parent_pin: true, 
        is_pin_activated: true, 
        personal_pin: newPinInput, 
        parent_pin: newPinInput,
        onboarding_pin: newPinInput
      } : null);
      setIsInitialPinSetup(false);
      setParentUnlocked(true);
      setLessonsUnlocked(true);
      setShowPinPrompt(false);
      setNewPinInput('');
      setNewPinConfirm('');
      setParentPinSuccessMsg('Deine Eltern-PIN wurde erfolgreich gespeichert!');
    } catch (err: any) {
      console.error('Failed to save parent PIN:', err);
      setParentPinErrorMsg('Fehler beim Speichern der PIN: ' + err.message);
    } finally {
      setPinChangeLoading(false);
    }
  };

  const [preStartCountdown, setPreStartCountdown] = useState<number | null>(null);
  const preStartCountdownRef = useRef(preStartCountdown);
  useEffect(() => {
    preStartCountdownRef.current = preStartCountdown;
  }, [preStartCountdown]);

  useEffect(() => {
    setPinInput('');
    setPinError(null);
    setPendingCancelOccId(null);
    setCollapsedMonths({});
  }, [activeTab]);

  useEffect(() => {
    if (profile?.id) {
      const unlocked = sessionStorage.getItem(`groovelab_lessons_unlocked_${profile.id}`) === 'true';
      setLessonsUnlocked(unlocked);
    }
  }, [profile?.id]);

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

  // Focus Timer interval effect & Anti-Cheat monitoring
  useEffect(() => {
    if (!timerRunning) {
      setIsPhoneFlat(false);
      setFlatType('none');
      setIsGraceActive(false);
      setGraceSecondsLeft(10);
      return;
    }

    const isStudentOnly = profile?.app_usage_mode === 'student_only';

    if (!isStudentOnly) {
      const interval = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
      return () => clearInterval(interval);
    }

    const targetSeconds = dailyGoal * 60;

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
            setTimerRunning(false);
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

      // Update states
      setIsPhoneFlat(isNowFlat);
      setFlatType(isNowFlat ? currentFlatType : 'none');

      if (isNowFlat) {
        setIsGraceActive(false);
        setGraceSecondsLeft(10);
        graceWarningPlayed = false;

        setElapsedSeconds(prev => {
          const nextVal = prev + 1;
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
                    const mins = Math.round(nextVal / 60);
                    await supabase
                      .from('fokus_logs')
                      .update({ duration_seconds: nextVal, duration_minutes: mins })
                      .eq('id', currentLogIdRef.current);
                  } else {
                    await supabase
                      .from('fokus_logs')
                      .update({ duration_seconds: targetSeconds, duration_minutes: Math.round(targetSeconds / 60) })
                      .eq('id', currentLogIdRef.current);
                    currentLogIdRef.current = null;
                  }
                }

                if (nextVal > targetSeconds) {
                  const extraSecs = nextVal - targetSeconds;
                  const extraMins = Math.round(extraSecs / 60);

                  if (!currentExtraLogIdRef.current) {
                    const { data } = await supabase
                      .from('fokus_logs')
                      .insert({
                        user_id: profile.id,
                        duration_minutes: extraMins,
                        duration_seconds: extraSecs,
                        is_extra: true,
                        flame_level: 'Kleine Flamme'
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

          return nextVal;
        });
      } else {
        if (!isExtraTimeRef.current) {
          // During the focus minutes: HARD RESET TO 0 IMMEDIATELY on interruption (no grace period)
          setElapsedSeconds(0);
          setIsExtraTime(false);
          setIsGraceActive(false);
          setTimerRunning(false);
          playBeep(330, 600); // Fail tone
          if (navigator.vibrate) {
            navigator.vibrate([400, 100, 400]);
          }
        } else {
          // Once the focus minutes are reached: START FRIENDLY COUNTDOWN
          setIsGraceActive(true);
          
          setGraceSecondsLeft(prevGrace => {
            if (prevGrace <= 1) {
              // Grace period expired! Just pause the timer. Do NOT reset to 0.
              setTimerRunning(false);
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
  }, [timerRunning, dailyGoal, profile?.app_usage_mode]);

  // ── Init: Device prüfen oder direkt Profil laden ──────────────────────────
  useEffect(() => {
    const init = async () => {
      if (!token) {
        setErrorMsg('Ungültiger QR-Code – kein Token gefunden.');
        setPageState('error');
        return;
      }

      try {
        // Token temporär setzen, damit der supabase custom-fetch-wrapper ihn als Header mitschickt
        sessionStorage.setItem('groovelab_qr_token', token);

        // Auto-pairing from query parameters if requested from a logged-in PWA session
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('auto_pair') === 'true') {
          localStorage.setItem(`${DEVICE_KEY_PREFIX}${token}`, 'paired');
        }

        // Vorab Namen des Schülers/Lehrers/Admins holen
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
        const upperToken = token.toUpperCase();
        const selectFields = 'id, first_name, last_name, role, roles, school_id, teacher_id, is_campus_active, is_groovelab_active, app_usage_mode, joker_used_at, weekly_jokers_used, created_at, is_pin_activated, personal_pin, parent_pin, instrument, photo_url, is_trial, trial_ends_at, exempt_from_direct_billing, has_parent_pin, pin_enforced_for_preview, parent_allow_absences, parent_allow_chat, parent_allow_timer, parent_allow_leaderboard, parent_allow_groups, parent_allow_proposals, campus_ui_level';
        const minimalFields = 'id, first_name, last_name, role, school_id, is_campus_active, is_groovelab_active, is_pin_activated, has_parent_pin';

        let userData: any = null;

        const executeUserQuery = async (builderFn: (fields: string) => any) => {
          try {
            const { data, error } = await builderFn(selectFields).maybeSingle();
            if (!error && data) return data;
            if (error) {
              console.warn('[QRLanding] selectFields query warning, falling back to minimalFields:', error);
              const { data: minData, error: minErr } = await builderFn(minimalFields).maybeSingle();
              if (!minErr && minData) return minData;
            }
          } catch (e) {
            console.warn('[QRLanding] query exception:', e);
          }
          return null;
        };

        // Stage 1: Try combined OR query
        if (isUuid) {
          userData = await executeUserQuery(fields => 
            supabase.from('users').select(fields).or(`id.eq.${token},qr_token.eq.${token},teacher_qr_token.eq.${token}`)
          );
        } else {
          userData = await executeUserQuery(fields => 
            supabase.from('users').select(fields).or(`teacher_qr_token.eq.${token},ausweis_nummer.eq.${token},ausweis_nummer.eq.${upperToken}`)
          );
        }

        // Stage 2: Fallback direct query by ID (if UUID)
        if (!userData && isUuid) {
          userData = await executeUserQuery(fields => 
            supabase.from('users').select(fields).eq('id', token)
          );
        }

        // Stage 3: Fallback direct query by teacher_qr_token
        if (!userData) {
          userData = await executeUserQuery(fields => 
            supabase.from('users').select(fields).eq('teacher_qr_token', token)
          );
        }

        // Stage 4: Fallback direct query by qr_token
        if (!userData) {
          userData = await executeUserQuery(fields => 
            supabase.from('users').select(fields).eq('qr_token', token)
          );
        }

        // Stage 5: Fallback direct query by ausweis_nummer
        if (!userData) {
          userData = await executeUserQuery(fields => 
            supabase.from('users').select(fields).or(`ausweis_nummer.eq.${token},ausweis_nummer.eq.${upperToken}`)
          );
        }

        if (!userData) {
          sessionStorage.removeItem('groovelab_qr_token');
          setErrorMsg('Dieser QR-Code ist ungültig oder gehört keinem Nutzer.');
          setPageState('error');
          return;
        }

        let schoolName = 'Musikschule';
        let hasCampusSub = false;
        let hasGroovelabSub = false;
        let isTrial = false;
        if (userData.school_id) {
          const { data: schDetails } = await supabase
            .from('schools')
            .select('name, has_campus_subscription, has_groovelab_subscription, is_trial, opening_hours, student_billing_option, contract_start_date, street, zip_code, city, logo_url, primary_color')
            .eq('id', userData.school_id)
            .single();
          if (schDetails) {
            schoolName = schDetails.name;
            hasCampusSub = schDetails.has_campus_subscription ?? false;
            hasGroovelabSub = schDetails.has_groovelab_subscription ?? false;
            isTrial = schDetails.is_trial ?? false;
            setSchoolData(schDetails);
            setSchoolFokusLevels(schDetails.opening_hours?.fokus_levels || null);
          }
        }

        const isStaff = userData.role === 'admin' || userData.role === 'teacher' || userData.role === 'secretary' || (Array.isArray(userData.roles) && (userData.roles.includes('admin') || userData.roles.includes('teacher') || userData.roles.includes('secretary')));

        if (!hasCampusSub && !hasGroovelabSub && !isTrial && !isStaff) {
          setErrorMsg('Der Zugang für diese Musikschule ist aktuell nicht aktiv (Setup-Modus).');
          setPageState('error');
          return;
        }



        const isPlaceholderInst = (inst: string | null | undefined): boolean => {
          if (!inst) return true;
          const cleaned = inst.trim().toLowerCase();
          return (
            cleaned === '' ||
            cleaned === 'musiker' ||
            cleaned === 'musikerin' ||
            cleaned === 'schüler' ||
            cleaned === 'schülerin' ||
            cleaned === 'nicht festgelegt' ||
            cleaned === 'plattform' ||
            cleaned === 'ohne zuweisung' ||
            cleaned === 'unterricht'
          );
        };

        const rawInst = userData.instrument || null;
        let studentInstrument = !isPlaceholderInst(rawInst) ? rawInst : null;
        let assignedTeacherId = userData.teacher_id || null;

        if (isPlaceholderInst(studentInstrument) && userData.id) {
          try {
            const { data: psData } = await supabase
              .from('pending_students')
              .select('instrument, teacher_id')
              .eq('id', userData.id)
              .maybeSingle();
            if (!isPlaceholderInst(psData?.instrument)) studentInstrument = psData!.instrument;
            if (psData?.teacher_id && !assignedTeacherId) assignedTeacherId = psData.teacher_id;
          } catch (e) {}

          if (isPlaceholderInst(studentInstrument)) {
            try {
              const { data: stData } = await supabase
                .from('students')
                .select('instrument, teacher_id')
                .or(`id.eq.${userData.id},user_id.eq.${userData.id}`)
                .maybeSingle();
              if (!isPlaceholderInst(stData?.instrument)) studentInstrument = stData!.instrument;
              if (stData?.teacher_id && !assignedTeacherId) assignedTeacherId = stData.teacher_id;
            } catch (e) {}
          }

          if (isPlaceholderInst(studentInstrument)) {
            try {
              const stIds = [userData.id];
              const { data: stDataForInst } = await supabase
                .from('students')
                .select('id')
                .or(`id.eq.${userData.id},user_id.eq.${userData.id}`);
              if (stDataForInst) stDataForInst.forEach((s: any) => { if (s.id && !stIds.includes(s.id)) stIds.push(s.id); });

              const { data: schData } = await supabase
                .from('schedules')
                .select('instrument, teacher_id')
                .in('student_id', stIds)
                .not('instrument', 'is', null)
                .limit(1)
                .maybeSingle();
              if (!isPlaceholderInst(schData?.instrument)) studentInstrument = schData!.instrument;
              if (schData?.teacher_id && !assignedTeacherId) assignedTeacherId = schData.teacher_id;
            } catch (e) {}
          }

          // Fallback: If student has no explicit instrument set, fall back to the assigned teacher's instrument!
          if (isPlaceholderInst(studentInstrument) && assignedTeacherId) {
            try {
              const { data: teacherData } = await supabase
                .from('users')
                .select('instrument')
                .eq('id', assignedTeacherId)
                .maybeSingle();
              if (!isPlaceholderInst(teacherData?.instrument)) studentInstrument = teacherData!.instrument;
            } catch (e) {}
          }
        }

        setProfile({
          id: userData.id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          instrument: studentInstrument || null,
          photo_url: userData.photo_url || null,
          role: userData.role || 'student',
          roles: userData.roles || [],
          school_name: schoolName,
          school_id: userData.school_id || null,
          is_campus_active: userData.is_campus_active ?? false,
          is_groovelab_active: userData.is_groovelab_active ?? false,
          app_usage_mode: userData.app_usage_mode ?? 'student_only',
          joker_used_at: userData.joker_used_at,
          created_at: userData.created_at,
          is_trial: userData.is_trial ?? false,
          trial_ends_at: userData.trial_ends_at,
          exempt_from_direct_billing: userData.exempt_from_direct_billing ?? false,
          has_parent_pin: Boolean(
            userData.has_parent_pin === true ||
            userData.has_personal_pin === true ||
            userData.is_pin_activated === true ||
            (userData.onboarding_pin && String(userData.onboarding_pin).trim().length === 4) ||
            (userData.personal_pin && String(userData.personal_pin).trim() !== '') ||
            (userData.parent_pin && String(userData.parent_pin).trim() !== '')
          ),
          personal_pin: userData.personal_pin || null,
          parent_pin: userData.parent_pin || null,
          is_pin_activated: userData.is_pin_activated ?? false,
          pin_enforced_for_preview: userData.pin_enforced_for_preview ?? false,
          parent_allow_absences: userData.parent_allow_absences ?? false,
          parent_allow_chat: userData.parent_allow_chat ?? true,
          parent_allow_timer: userData.parent_allow_timer ?? true,
          parent_allow_leaderboard: userData.parent_allow_leaderboard ?? true,
          parent_allow_groups: userData.parent_allow_groups ?? true,
          parent_allow_proposals: userData.parent_allow_proposals ?? true,
          campus_ui_level: userData.campus_ui_level || localStorage.getItem('campus_student_ui_level') || 'junior'
        });

        // Check if session was previously unlocked in sessionStorage
        const wasUnlocked = Boolean(
          sessionStorage.getItem(`groovelab_parent_unlocked_${token}`) === 'true' ||
          sessionStorage.getItem(`groovelab_parent_unlocked_${userData.id}`) === 'true'
        );

        // Check if activation_days record or PIN strictly exists in DB for this student
        let hasPinCreated = false;
        if (userData.role === 'student') {
          const dbHasPin = Boolean(
            userData.has_parent_pin === true ||
            userData.has_personal_pin === true ||
            userData.is_pin_activated === true ||
            (userData.onboarding_pin && String(userData.onboarding_pin).trim().length === 4) ||
            (userData.personal_pin && String(userData.personal_pin).trim() !== '') ||
            (userData.parent_pin && String(userData.parent_pin).trim() !== '')
          );

          if (dbHasPin) {
            hasPinCreated = true;
          } else {
            // Check activation_days table
            try {
              const { data: actDay } = await supabase
                .from('activation_days')
                .select('student_id')
                .eq('student_id', userData.id)
                .maybeSingle();

              if (actDay) {
                hasPinCreated = true;
              }
            } catch (e) {
              console.warn('[QRLanding] activation_days check error:', e);
            }

            // Fallback: Check local cached PIN if set on this device
            if (!hasPinCreated) {
              const localPin = localStorage.getItem(`groovelab_user_pin_${userData.id}`) || localStorage.getItem(`groovelab_pin_${token}`);
              if (localPin && localPin.trim().length === 4) {
                hasPinCreated = true;
              }
            }
          }

          if (!hasPinCreated) {
            // Purge any stale local unlock caches if PIN was never established
            localStorage.removeItem(`groovelab_parent_unlocked_${token}`);
            localStorage.removeItem(`groovelab_parent_unlocked_${userData.id}`);
            localStorage.removeItem(`groovelab_user_pin_${userData.id}`);
            localStorage.removeItem(`groovelab_pin_${token}`);
            sessionStorage.removeItem(`groovelab_lessons_unlocked_${userData.id}`);
          }
        } else {
          hasPinCreated = true;
        }

        // Falls Schüler zum ersten Mal die QR-Landingpage öffnet und noch keine PIN angelegt hat -> Zwingend PIN-Einrichtungsbildschirm anzeigen!
        if (userData.role === 'student' && !hasPinCreated) {
          sessionStorage.setItem('groovelab_qr_token', token);
          setPinPurpose('setup_initial_pin');
          setPageState('pin_required');
          return;
        }

        // Falls eine PIN existiert, aber dieses Gerät noch nicht im Cache freigeschaltet ist -> Zwingend 4-stellige PIN verlangen!
        if (userData.role === 'student' && hasPinCreated && !wasUnlocked) {
          sessionStorage.setItem('groovelab_qr_token', token);
          setPinPurpose('unlock_preview');
          setPageState('pin_required');
          return;
        }

        // Nahtlose Anzeige der QR-Landingpage nur auf freigeschalteten Geräten (aus dem Cache)
        // Standardmäßig startet die App immer sicher im Junior-Modus (parentUnlocked = false)
        setParentUnlocked(false);
        setLessonsUnlocked(true);
        sessionStorage.setItem('groovelab_qr_token', token);
        setPageState('profile');
      } catch (err: any) {
        sessionStorage.removeItem('groovelab_qr_token');
        sessionStorage.removeItem('groovelab_user_id');
        console.error('[QRLanding] check_qr_device error:', err);
        setErrorMsg('Verbindungsfehler. Bitte versuche es erneut.');
        setPageState('error');
      }
    };

    init();
  }, [token]);

  // Cleanup tokens from sessionStorage when component unmounts
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('groovelab_user_id');
      sessionStorage.removeItem('groovelab_qr_token');
    };
  }, []);

  // ── Admin-Daten laden (Briefing-Board & Statistiken) ────────────────────────
  useEffect(() => {
    if (profile && (profile.role === 'admin' || profile.role === 'secretary')) {
      const fetchAdminStats = async () => {
        setLoadingAdminStats(true);
        try {
          // 1. Count students
          const { count: studentCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', profile.school_id)
            .eq('role', 'student');

          // 2. Count teachers
          const { count: teacherCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', profile.school_id)
            .eq('role', 'teacher');

          // 3. Count pending users (where is_campus_active is false and role is student/teacher/secretary)
          const { count: pendingCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', profile.school_id)
            .eq('role', 'student')
            .eq('is_campus_active', false);

          setAdminStats({
            activeStudents: studentCount || 0,
            activeTeachers: teacherCount || 0,
            pendingActivations: pendingCount || 0
          });
        } catch (err) {
          console.error('Error fetching admin mobile stats:', err);
        } finally {
          setLoadingAdminStats(false);
        }
      };
      fetchAdminStats();
    }
  }, [profile]);

  // ── Lehrkräfte-Daten laden (Heutiger Stundenplan) ──────────────────────────
  useEffect(() => {
    const rolesArray = profile && Array.isArray(profile.roles) ? profile.roles : [];
    const isTeacherRole = profile && (profile.role === 'teacher' || rolesArray.includes('teacher'));
    if (profile && isTeacherRole) {
      const fetchTeacherSchedule = async () => {
        setLoadingTeacherSchedule(true);
        try {
          const todayDate = new Date();
          const todayStr = todayDate.toLocaleDateString('en-CA');
          const currentDayOfWeek = todayDate.getDay() || 7;

          const [schRes, occRes] = await Promise.all([
            supabase
              .from('schedules')
              .select(`
                *,
                student:student_id(first_name, last_name, instrument),
                room:room_id(name)
              `)
              .eq('teacher_id', profile.id)
              .eq('day_of_week', currentDayOfWeek),
            supabase
              .from('schedule_occurrences')
              .select(`
                *,
                student:student_id(first_name, last_name, instrument),
                schedule:schedule_id(room:room_id(name))
              `)
              .eq('teacher_id', profile.id)
              .eq('date', todayStr)
          ]);

          const merged: any[] = [];
          const overriddenScheduleIds = new Set<string>();

          if (occRes.data) {
            occRes.data.forEach((occ: any) => {
              if (occ.schedule_id) overriddenScheduleIds.add(occ.schedule_id);
              const isCanceled = ['cancelled', 'teacher_sick', 'canceled_by_student', 'canceled_by_teacher_sick'].includes(occ.status);
              if (!isCanceled) {
                const sLastName = maskLastName(occ.student?.last_name, true);
                const studentName = occ.student 
                  ? `${occ.student.first_name || ''} ${sLastName}`.trim()
                  : 'Schüler';
                merged.push({
                  id: occ.id,
                  time: occ.start_time ? occ.start_time.substring(0, 5) : '00:00',
                  student_name: studentName,
                  instrument: occ.student?.instrument || profile.instrument || 'Unterricht',
                  room_name: occ.schedule?.room?.name || 'Groovelab Raum'
                });
              }
            });
          }

          if (schRes.data) {
            schRes.data.forEach((sch: any) => {
              if (!overriddenScheduleIds.has(sch.id) && sch.status !== 'canceled_by_teacher_sick') {
                const sLastName = maskLastName(sch.student?.last_name, true);
                const studentName = sch.student 
                  ? `${sch.student.first_name || ''} ${sLastName}`.trim()
                  : 'Schüler';
                merged.push({
                  id: sch.id,
                  time: sch.time_slot ? sch.time_slot.substring(0, 5) : '00:00',
                  student_name: studentName,
                  instrument: sch.student?.instrument || profile.instrument || 'Unterricht',
                  room_name: sch.room?.name || 'Groovelab Raum'
                });
              }
            });
          }

          merged.sort((a, b) => a.time.localeCompare(b.time));
          setTeacherTodayLessons(merged);
        } catch (err) {
          console.error('Error fetching teacher schedule:', err);
        } finally {
          setLoadingTeacherSchedule(false);
        }
      };

      fetchTeacherSchedule();
    }
  }, [profile]);

  // ── Dashboard-Daten laden (Schüler) ───────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    if ((pageState !== 'profile' && pageState !== 'inactive_landing') || !profile || profile.role === 'admin' || profile.role === 'secretary' || profile.role === 'teacher') return;
    setLoadingDashboard(true);
    try {
      const todayDate = getSimulatedNow();
      const todayStr = todayDate.toLocaleDateString('sv-SE');
      const pastLimitDate = new Date(todayDate);
      pastLimitDate.setDate(todayDate.getDate() - 30);
      const pastLimitStr = pastLimitDate.toLocaleDateString('sv-SE');

      // Resolve all potential student IDs for this user (users.id, students.id, pending_students.id)
      const studentIds = new Set<string>([profile.id]);
      try {
        const { data: stData } = await supabase
          .from('students')
          .select('id, user_id')
          .or(`id.eq.${profile.id},user_id.eq.${profile.id}`);
        if (stData) {
          stData.forEach((st: any) => {
            if (st.id) studentIds.add(st.id);
            if (st.user_id) studentIds.add(st.user_id);
          });
        }
      } catch (e) {}
      try {
        const { data: psData } = await supabase
          .from('pending_students')
          .select('id')
          .eq('id', profile.id);
        if (psData) {
          psData.forEach((ps: any) => {
            if (ps.id) studentIds.add(ps.id);
          });
        }
      } catch (e) {}
      const studentIdList = Array.from(studentIds);

      // Fetch all dashboard data in parallel for optimal performance
      const [
        schRes,
        occRes,
        statsRes,
        avatarRes,
        matrixRes,
        msgRes,
        bookingsRes,
        roomsRes,
        teachersRes,
        lehrwerkeRes,
        fokusLogsRes,
        songSkillsRes
      ] = await Promise.all([
        supabase
          .from('schedules')
          .select(`
            *,
            teacher:teacher_id(first_name, last_name),
            room:room_id(name)
          `)
          .in('student_id', studentIdList),
        supabase
          .from('schedule_occurrences')
          .select(`
            *,
            teacher:teacher_id(first_name, last_name),
            schedule:schedule_id(status, room:room_id(name))
          `)
          .in('student_id', studentIdList)
          .gte('date', pastLimitStr)
          .order('date', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase
          .from('student_stats')
          .select('*')
          .in('student_id', studentIdList)
          .maybeSingle(),
        supabase
          .from('avatars')
          .select('*')
          .in('user_id', studentIdList)
          .maybeSingle(),
        supabase
          .from('progress_matrix')
          .select('*')
          .in('student_id', studentIdList)
          .order('updated_at', { ascending: false }),
        supabase
          .from('campus_direct_messages')
          .select('occurrence_id, is_read, recipient_id')
          .or(`sender_id.in.(${studentIdList.join(',')}),recipient_id.in.(${studentIdList.join(',')})`),
        supabase
          .from('room_bookings')
          .select('room_id, date, start_time, booked_by, room:rooms(name)')
          .eq('school_id', profile.school_id)
          .gte('date', pastLimitStr),
        supabase
          .from('rooms')
          .select('id, name')
          .eq('school_id', profile.school_id),
        supabase
          .from('users')
          .select('id, first_name, last_name, planned_boards, campus_räume, groovelab_räume')
          .eq('school_id', profile.school_id)
          .eq('role', 'teacher'),
        supabase
          .from('lehrwerke')
          .select('*')
          .eq('school_id', profile.school_id),
        supabase
          .from('fokus_logs')
          .select('*')
          .in('user_id', studentIdList)
          .order('created_at', { ascending: false }),
        supabase
          .from('user_song_skills')
          .select('*, songs(*)')
          .in('user_id', studentIdList)
      ]);

      const roomMap = new Map<string, string>();
      (roomsRes?.data || []).forEach((r: any) => roomMap.set(r.id, r.name));

      const rawSchData = schRes.data || [];
      const seenSchKeys = new Set<string>();
      const schData: any[] = [];
      rawSchData.forEach((s: any) => {
        const key = `${s.day_of_week}_${s.time_slot}_${s.teacher_id || ''}_${s.room_id || ''}`;
        if (!seenSchKeys.has(key)) {
          seenSchKeys.add(key);
          schData.push(s);
        }
      });
      
      // Enrich any existing schData with room names from roomMap if room object is missing
      schData.forEach((sch: any) => {
        if (!sch.room && sch.room_id && roomMap.has(sch.room_id)) {
          sch.room = { name: roomMap.get(sch.room_id) };
        }
      });

      // Also check planned_boards of all teachers in the school as fallback/complement
      const teachersWithPlanned = teachersRes.data || [];
      teachersWithPlanned.forEach((teacher: any) => {
        const rawPlanned = teacher.planned_boards || teacher.campus_räume || teacher.groovelab_räume;
        let boards: any[] = [];
        if (rawPlanned && typeof rawPlanned === 'object' && !Array.isArray(rawPlanned) && (rawPlanned as any).drafts) {
          const activeId = (rawPlanned as any).activeDraftId || (rawPlanned as any).drafts[0]?.id;
          const draft = (rawPlanned as any).drafts.find((d: any) => d.id === activeId) || (rawPlanned as any).drafts[0];
          boards = draft?.boards || [];
        } else if (Array.isArray(rawPlanned)) {
          boards = rawPlanned;
        }

        boards.forEach((board: any) => {
          if (!board || !Array.isArray(board.students)) return;
          board.students.forEach((s: any) => {
            if (s.isBreak) return;
            const isStudentMatch = 
              studentIds.has(s.id) ||
              (s.id && s.id === profile.id) ||
              (s.first_name && profile.first_name && 
               s.first_name.trim().toLowerCase() === profile.first_name.trim().toLowerCase() && 
               (!s.last_name || !profile.last_name || s.last_name.trim().toLowerCase().startsWith(profile.last_name.trim().toLowerCase().substring(0, 1))));

            if (isStudentMatch) {
              const existingIndex = schData.findIndex((existing: any) => existing.day_of_week === board.dayOfWeek);
              const slotTime = s.assignedTime || board.startAnchor || '14:00';
              const roomName = (board.roomId && roomMap.get(board.roomId)) ? roomMap.get(board.roomId) : 'Groovelab Raum';
              
              if (existingIndex < 0) {
                schData.push({
                  id: `planned-${teacher.id}-${board.dayOfWeek}`,
                  school_id: profile.school_id,
                  teacher_id: teacher.id,
                  student_id: profile.id,
                  day_of_week: board.dayOfWeek,
                  time_slot: slotTime,
                  room_id: board.roomId || null,
                  duration: s.duration || 30,
                  status: board.roomId ? 'approved' : 'ready_for_admin_review',
                  instrument: s.instrument || profile.instrument || 'Unterricht',
                  teacher: { 
                    first_name: teacher.first_name, 
                    last_name: (teacher.first_name || '').toLowerCase() === 'severin' && (!teacher.last_name || teacher.last_name === 'L.' || teacher.last_name === 'L' || teacher.last_name?.toLowerCase() === 'l.') ? 'Landenberger' : teacher.last_name 
                  },
                  room: { name: roomName }
                });
              } else if (!schData[existingIndex].room && board.roomId && roomMap.has(board.roomId)) {
                schData[existingIndex].room = { name: roomMap.get(board.roomId) };
              }
            }
          });
        });
      });

      const occData = occRes.data;
      const statsData = statsRes.data;
      const avatarData = avatarRes.data;
      const matrixItems = matrixRes.data;
      const allMsgs = msgRes?.data || [];
      const bookingsData = bookingsRes?.data || [];
      const songSkillsData = songSkillsRes?.data || [];

      setRoomBookings(bookingsData);
      const unreadIds = allMsgs
        .filter((m: any) => studentIds.has(m.recipient_id) && !m.is_read)
        .map((m: any) => m.occurrence_id)
        .filter(Boolean);
      const withMsgIds = allMsgs
        .map((m: any) => m.occurrence_id)
        .filter(Boolean);

      setUnreadMessageOccurrences(Array.from(new Set(unreadIds)));
      setActiveChatOccIds(new Set(withMsgIds));

      // Deduplicate matrixItems by topic_name (latest wins)
      const uniqueMatrixItemsMap = new Map<string, any>();
      (matrixItems || []).forEach((item: any) => {
        const name = (item.topic_name || '').trim().toLowerCase();
        if (name && !uniqueMatrixItemsMap.has(name)) {
          uniqueMatrixItemsMap.set(name, item);
        }
      });
      const deduplicatedMatrixItems = Array.from(uniqueMatrixItemsMap.values());

      // Merge recurring schedules into virtual occurrences for the next 4 weeks
      const allMergedOccurrences: any[] = [];
      const usedActualIds = new Set<string>();

      const startRange = getSimulatedNow();
      // Adjust startRange to Monday of this week
      const day = startRange.getDay() || 7;
      startRange.setDate(startRange.getDate() - day + 1);
      
      const endRange = new Date(startRange);
      endRange.setDate(startRange.getDate() + 365); // Full school year (365 days) for active profiles

      if (schData) {
        schData.forEach((sch: any) => {
          const current = new Date(startRange);
          while (current <= endRange) {
            const currentDay = current.getDay() || 7;
            const diff = sch.day_of_week - currentDay;
            const targetDate = new Date(current);
            targetDate.setDate(current.getDate() + diff);

            if (targetDate >= startRange && targetDate <= endRange) {
              const yyyy = targetDate.getFullYear();
              const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
              const dd = String(targetDate.getDate()).padStart(2, '0');
              const dateStr = `${yyyy}-${mm}-${dd}`;

              // Find if there is an actual occurrence override in the DB
              const actual = (occData || []).find((occ: any) => 
                (occ.schedule_id === sch.id || occ.student_id === profile.id || studentIds.has(occ.student_id)) && 
                (occ.original_date === dateStr || occ.date === dateStr)
              );

              if (actual) {
                allMergedOccurrences.push({
                  ...actual,
                  schedule: sch
                });
                usedActualIds.add(actual.id);
              } else {
                allMergedOccurrences.push({
                  id: `virtual-${sch.id}-${dateStr}`,
                  schedule_id: sch.id,
                  student_id: profile.id,
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

      // Add any other actual occurrences that weren't matched
      if (occData) {
        occData.forEach((occ: any) => {
          if (!usedActualIds.has(occ.id)) {
            allMergedOccurrences.push(occ);
          }
        });
      }

      // Sort all merged occurrences chronologically by date and start_time
      allMergedOccurrences.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return (a.start_time || '').localeCompare(b.start_time || '');
      });

      const fokusLogsData = fokusLogsRes?.data || [];

      const metrics = computeGroundTruthMetrics({
        fokusLogs: fokusLogsData,
        songSkills: songSkillsData,
        progressMatrix: deduplicatedMatrixItems,
        user: profile,
        avatar: avatarData,
        stats: statsData,
        simulatedDate: todayDate,
        targetMinutes: dailyGoal || 3
      });

      const updatedStats = {
        ...(statsData || {}),
        student_id: profile.id,
        current_xp: metrics.totalXp,
        streak_flame: metrics.streakFlame,
        total_focus_minutes: metrics.totalFocusMinutes
      };

      const updatedAvatar = {
        ...(avatarData || {}),
        user_id: profile.id,
        xp: metrics.totalXp,
        streak_flame: metrics.streakFlame,
        last_focus_date: metrics.hasCompletedTargetToday ? todayStr : (avatarData?.last_focus_date || statsData?.last_practice_date)
      };

      setSchedules(schData || []);
      setOccurrences(allMergedOccurrences);
      setStats(updatedStats);
      setAvatar(updatedAvatar);
      setProgressItems(deduplicatedMatrixItems);
      setActiveSongSkills(songSkillsData || []);
      const normalizedTeachers = (teachersRes?.data || []).map((t: any) => {
        let ln = (t.last_name || '').trim();
        if ((t.first_name || '').toLowerCase() === 'severin' && (!ln || ln === 'L.' || ln === 'L' || ln.toLowerCase() === 'l.')) {
          ln = 'Landenberger';
        }
        return {
          ...t,
          last_name: ln
        };
      });
      setTeachers(normalizedTeachers);
      setLehrwerke(lehrwerkeRes?.data || []);
      try {
        const stored1 = localStorage.getItem('student_lehrwerke_progress');
        const stored2 = localStorage.getItem('campus_lehrwerke_progress');
        const p1 = stored1 ? JSON.parse(stored1) : [];
        const p2 = stored2 ? JSON.parse(stored2) : [];
        const combined = [...(Array.isArray(p1) ? p1 : []), ...(Array.isArray(p2) ? p2 : [])];
        if (combined.length > 0) setLocalProgress(combined);
      } catch {}

      setPracticeLoggedToday(metrics.hasCompletedTargetToday);
      setLoggedMinutesToday(metrics.todayTotalMinutes);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoadingDashboard(false);
    }
  }, [pageState, profile]);

  useEffect(() => {
    fetchDashboardData();
    const handleStorage = (e: Event) => {
      if (e instanceof StorageEvent) {
        if (e.key === 'groovelab_simulated_date' || e.key === 'groovelab_simulated_start_timestamp') {
          fetchDashboardData();
        }
      } else {
        fetchDashboardData();
      }
    };
    const handleScheduleChange = () => {
      fetchDashboardData();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('groovelab_schedule_changed', handleScheduleChange);
    window.addEventListener('refresh-bookings', handleScheduleChange);
    window.addEventListener('students_updated', handleScheduleChange);
    window.addEventListener('groovelab_students_updated', handleScheduleChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('groovelab_schedule_changed', handleScheduleChange);
      window.removeEventListener('refresh-bookings', handleScheduleChange);
      window.removeEventListener('students_updated', handleScheduleChange);
      window.removeEventListener('groovelab_students_updated', handleScheduleChange);
    };
  }, [fetchDashboardData]);

  // Realtime synchronization for teacher homework & schedule edits
  useEffect(() => {
    if ((pageState !== 'profile' && pageState !== 'inactive_landing') || !profile?.id) return;

    const channel = supabase.channel(`realtime_student_progress_${profile.id}`);
    channel
      .on('broadcast', { event: 'homework-changed' }, () => {
        fetchDashboardData();
      })
      .on(
        'postgres_changes',
        {
          schema: 'public',
          event: '*',
          table: 'campus_direct_messages'
        },
        () => {
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          schema: 'public',
          event: '*',
          table: 'schedule_occurrences'
        },
        () => {
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          schema: 'public',
          event: '*',
          table: 'schedules'
        },
        () => {
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          schema: 'public',
          event: '*',
          table: 'fokus_logs'
        },
        () => {
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          schema: 'public',
          event: '*',
          table: 'student_stats'
        },
        () => {
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          schema: 'public',
          event: '*',
          table: 'avatars'
        },
        () => {
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          schema: 'public',
          event: '*',
          table: 'progress_matrix'
        },
        () => {
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          schema: 'public',
          event: '*',
          table: 'user_song_skills'
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    const handleHomeworkUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail?.studentId || customEvent.detail?.studentId === profile.id) {
        fetchDashboardData();
      }
    };
    window.addEventListener('homework-updated', handleHomeworkUpdate);

    const handlePracticeUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail?.studentId || customEvent.detail?.studentId === profile.id) {
        fetchDashboardData();
      }
    };
    window.addEventListener('cg_practice_updated', handlePracticeUpdate);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel(`cg_practice_sync_${profile.id}`);
        bc.onmessage = () => {
          fetchDashboardData();
        };
      }
    } catch (e) {}

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('homework-updated', handleHomeworkUpdate);
      window.removeEventListener('cg_practice_updated', handlePracticeUpdate);
      if (bc) {
        try { bc.close(); } catch (e) {}
      }
    };
  }, [pageState, profile?.id, fetchDashboardData]);

  // Payment default selection when school data is fetched
  useEffect(() => {
    if (schoolData?.student_billing_option) {
      if (schoolData.student_billing_option === 'debit') {
        setPaymentMethod('debit');
      } else if (schoolData.student_billing_option === 'cash') {
        setPaymentMethod('cash');
      }
    }
  }, [schoolData]);

  const getDynamicAnnualPriceLocal = (startDateStr: string | null | undefined, isCoFinancing: boolean = false): number => {
    const contractDateObj = startDateStr ? new Date(startDateStr) : new Date('2026-06-12T19:30:38+02:00');
    const month = contractDateObj.getMonth() + 1; // 1-indexed

    const monthsMap: Record<number, number> = {
      9: 12,  // September
      10: 11, // October
      11: 10, // November
      12: 9,  // December
      1: 8,   // January
      2: 7,   // February
      3: 6,   // March
      4: 5,   // April
      5: 4,   // May
      6: 3,   // June
      7: 2,   // July
      8: 1    // August
    };

    const monthsRemaining = monthsMap[month] !== undefined ? monthsMap[month] : 12;
    const basePrice = 4.80;
    return parseFloat(((monthsRemaining / 12) * basePrice).toFixed(2));
  };

  const handleActivateContract = async () => {
    if (!profile) return;
    setActivationLoading(true);
    setActivationError(null);

    try {
      // 1. Save parent email using secure update_student_emails RPC
      sessionStorage.setItem('groovelab_user_id', profile.id);
      sessionStorage.setItem('groovelab_qr_token', token);

      const { error: emailError } = await supabase.rpc('update_student_emails', {
        student_id_param: profile.id,
        input_student_email: '', // student email remains empty
        input_parent_email: parentEmail
      });

      if (emailError) throw emailError;

      // 2. Update is_campus_active and payment method
      const updatePayload: any = {
        is_campus_active: true,
        student_billing_payment_method: paymentMethod
      };

      if (schoolData?.has_groovelab_subscription) {
        updatePayload.is_groovelab_active = true;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', profile.id);

      if (updateError) throw updateError;

      // 3. Mark device paired
      markPairedForToken(token);

      // 4. Update profile local state
      setProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          is_campus_active: true,
          is_groovelab_active: schoolData?.has_groovelab_subscription ? true : prev.is_groovelab_active
        };
      });

      setActivationStep('success');
    } catch (err: any) {
      console.error('[QRLanding] Activation error:', err);
      setActivationError(err.message || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
    } finally {
      setActivationLoading(false);
    }
  };

  const handleStartTrial = async () => {
    if (!profile) return;
    setActivationLoading(true);
    setActivationError(null);
    try {
      const { data: updatedUser, error: rpcErr } = await supabase.rpc('start_student_trial', {
        p_qr_token: token
      });
      if (rpcErr) throw rpcErr;

      sessionStorage.setItem('groovelab_user_id', profile.id);
      sessionStorage.setItem('groovelab_qr_token', token);

      markPairedForToken(token);

      setProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          is_campus_active: true,
          is_groovelab_active: schoolData?.has_groovelab_subscription ? true : prev.is_groovelab_active,
          is_trial: updatedUser?.is_trial ?? true,
          trial_ends_at: updatedUser?.trial_ends_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };
      });

      setActivationStep('success');
      playSuccessChime();
    } catch (err: any) {
      console.error('[QRLanding] Start Trial error:', err);
      setActivationError(err.message || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
    } finally {
      setActivationLoading(false);
    }
  };

  // Synthetischer Audio-Erfolgston (HTML5 AudioContext)
  const playSuccessChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
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
      // Auto-close AudioContext after sound finishes to prevent context accumulation
      setTimeout(() => {
        try {
          if (ctx.state !== 'closed') {
            ctx.close().catch(() => {});
          }
        } catch {}
      }, 2000);
    } catch (e) {
      console.warn("AudioContext success chime failed:", e);
    }
  };

  const playBeep = (freq: number, duration: number) => {
    try {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
        }
      }
      const ctx = audioContextRef.current;
      if (!ctx) return;
      
      // Resume context if suspended
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (duration / 1000));
    } catch (e) {
      console.warn("AudioContext warning beep failed:", e);
    }
  };


  // Animate SVG circular ring
  useEffect(() => {
    if (practiceLoggedToday && loggedMinutesToday > 0) {
      const timer = setTimeout(() => {
        const target = Math.min(1.0, loggedMinutesToday / dailyGoal);
        setRingProgress(target);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setRingProgress(0);
    }
  }, [practiceLoggedToday, loggedMinutesToday, dailyGoal]);

  // Trigger HTML5 Canvas particle explosion once the circular ring finishes animating
  useEffect(() => {
    if (practiceLoggedToday && loggedMinutesToday >= dailyGoal && !hasExploded && ringProgress >= 1.0) {
      const timer = setTimeout(() => {
        triggerExplosion();
        setHasExploded(true);
      }, 1200); // Trigger near the end of the 1.5s ring animation
      return () => clearTimeout(timer);
    }
  }, [practiceLoggedToday, loggedMinutesToday, dailyGoal, ringProgress, hasExploded]);

  // Canvas particle explosion logic (stars, circles, music notes, sparkles)
  const triggerExplosion = () => {
    // Trigger mechanisches haptisches Feedback (50ms - 30ms - 50ms)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }

    const canvas = canvasRef.current;
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

  // Blitz-Übung loggen
  const handleQuickLogPractice = async (focusMinutes: number, extraMinutes: number = 0, skipDbLogsInsert = false) => {
    if (!profile || loadingDashboard) return;
    setLoadingDashboard(true);

    try {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-CA');

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      // Check if focus time was already logged today
      const { data: existingFocusLogs } = await supabase
        .from('fokus_logs')
        .select('id')
        .eq('user_id', profile.id)
        .eq('is_extra', false)
        .gte('created_at', startOfDay.toISOString());

      const hasFocusLoggedToday = existingFocusLogs && existingFocusLogs.length > 0;

      // If already logged today, focusMinutes for this session becomes 0 (only extra counts)
      const effectiveFocusMinutes = hasFocusLoggedToday ? 0 : focusMinutes;
      const minutes = effectiveFocusMinutes + extraMinutes;

      // Query today's already logged extra minutes to enforce the 60-minute daily cap on XP for extra time
      let todayExtraMinsLogged = 0;
      try {
        const { data: todayLogs } = await supabase
          .from('fokus_logs')
          .select('duration_minutes')
          .eq('user_id', profile.id)
          .eq('is_extra', true)
          .gte('created_at', startOfDay.toISOString());
        if (todayLogs) {
          todayExtraMinsLogged = todayLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);
        }
      } catch (err) {
        console.error('Error fetching today logs for cap:', err);
      }

      const remainingXpEligibleExtraMins = Math.max(0, 60 - todayExtraMinsLogged);
      const xpEligibleExtraMins = Math.min(extraMinutes, remainingXpEligibleExtraMins);
      const xpGained = effectiveFocusMinutes + xpEligibleExtraMins;

      // Aktuelle Stats abrufen
      const { data: currentStats } = await supabase
        .from('student_stats')
        .select('*')
        .eq('student_id', profile.id)
        .maybeSingle();

      const currentStreak = currentStats?.streak_flame || 0;
      let newStreak = 1;
      let usedJokerThisSession = false;
      let shieldsUsedCount = 0;

      let lastSecuredDate = currentStats?.last_practice_date || null;
      if (profile?.joker_used_at) {
        const jokerDateStr = new Date(profile.joker_used_at).toLocaleDateString('en-CA');
        if (!lastSecuredDate || jokerDateStr > lastSecuredDate) {
          lastSecuredDate = jokerDateStr;
        }
      }
      if (!lastSecuredDate) {
        const actDateStr = (profile as any)?.activated_at || (profile?.is_pin_activated ? profile?.created_at : null);
        if (actDateStr) {
          lastSecuredDate = new Date(actDateStr).toLocaleDateString('en-CA');
        }
      }

      if (lastSecuredDate) {
        if (lastSecuredDate === yesterdayStr) {
          newStreak = currentStreak + 1;
        } else if (lastSecuredDate === todayStr) {
          newStreak = currentStreak; // bereits heute geübt
        } else {
          const getDaysBetween = (d1: string, d2: string) => {
            const dt1 = new Date(d1 + 'T12:00:00');
            const dt2 = new Date(d2 + 'T12:00:00');
            return Math.round((dt2.getTime() - dt1.getTime()) / (86400000));
          };
          const diffDays = getDaysBetween(lastSecuredDate, todayStr);
          const totalMissedDays = diffDays - 1;
          
          const currentWeek = getISOWeekLocal(new Date());
          const lastJokerWeek = profile?.joker_used_at ? getISOWeekLocal(new Date(profile.joker_used_at)) : null;
          const usedJokersThisWeek = lastJokerWeek === currentWeek ? ((profile as any)?.weekly_jokers_used || 1) : 0;
          const availableShields = Math.max(0, 3 - usedJokersThisWeek);

          let unprotectedMissedDays = totalMissedDays;
          if (availableShields > 0 && currentStreak > 0) {
            shieldsUsedCount = Math.min(availableShields, totalMissedDays);
            unprotectedMissedDays = Math.max(0, totalMissedDays - shieldsUsedCount);
            if (shieldsUsedCount > 0) {
              usedJokerThisSession = true;
            }
          }

          const decayedStreak = Math.max(0, currentStreak - unprotectedMissedDays);
          newStreak = decayedStreak + 1;
        }
      } else {
        newStreak = 1;
      }

      const totalMins = (currentStats?.total_focus_minutes || 0) + minutes;
      const monthlyMins = (currentStats?.monthly_focus_minutes || 0) + minutes;
      const newXp = (currentStats?.current_xp || 0) + xpGained;
      const flameLevelName = newStreak >= 9 ? 'Helden-Feuer' : (newStreak >= 3 ? 'Mittlere Flamme' : 'Kleine Flamme');

      // 1. Fokus-Protokoll schreiben (aufgeteilt in Fokus und Extra)
      if (!skipDbLogsInsert) {
        if (effectiveFocusMinutes > 0) {
          await supabase.from('fokus_logs').insert({
            user_id: profile.id,
            duration_minutes: effectiveFocusMinutes,
            duration_seconds: effectiveFocusMinutes * 60,
            is_extra: false,
            flame_level: flameLevelName,
            created_at: new Date().toISOString()
          });
        }

        if (extraMinutes > 0) {
          await supabase.from('fokus_logs').insert({
            user_id: profile.id,
            duration_minutes: extraMinutes,
            duration_seconds: extraMinutes * 60,
            is_extra: true,
            flame_level: flameLevelName,
            created_at: new Date().toISOString()
          });
        }
      }

      // 2. Fetch all latest logs to calculate Ground-Truth Metrics
      const { data: allLogs } = await supabase
        .from('fokus_logs')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      const metrics = computeGroundTruthMetrics({
        fokusLogs: allLogs || [],
        songSkills: activeSongSkills,
        progressMatrix: progressItems,
        user: profile,
        avatar: avatar,
        stats: currentStats,
        simulatedDate: getSimulatedNow(),
        targetMinutes: dailyGoal || 3
      });

      // 3. Statistiken aktualisieren (student_stats)
      await supabase.from('student_stats').upsert({
        student_id: profile.id,
        total_focus_minutes: metrics.totalFocusMinutes,
        monthly_focus_minutes: (currentStats?.monthly_focus_minutes || 0) + minutes,
        streak_flame: metrics.streakFlame,
        last_practice_date: todayStr,
        current_xp: metrics.totalXp,
        updated_at: new Date().toISOString()
      }, { onConflict: 'student_id' });

      // 4. Avatar-Tabelle updaten
      const { data: avatarRecord } = await supabase
        .from('avatars')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (avatarRecord) {
        await supabase.from('avatars').update({
          xp: metrics.totalXp,
          streak_flame: metrics.streakFlame,
          last_focus_date: todayStr
        }).eq('id', avatarRecord.id);
      }

      if (usedJokerThisSession) {
        const lastJokerWeek = profile?.joker_used_at ? getISOWeekLocal(new Date(profile.joker_used_at)) : null;
        const currentWeek = getISOWeekLocal(new Date());
        const prevUsed = lastJokerWeek === currentWeek ? ((profile as any)?.weekly_jokers_used || 1) : 0;
        const newWeeklyUsed = Math.min(3, prevUsed + (shieldsUsedCount || 1));

        await supabase.from('users').update({
          joker_used_at: new Date().toISOString(),
          weekly_jokers_used: newWeeklyUsed
        }).eq('id', profile.id);
        profile.joker_used_at = new Date().toISOString();
        (profile as any).weekly_jokers_used = newWeeklyUsed;
      }

      broadcastPracticeUpdate(profile.id, { metrics });

      playSuccessChime();

      setStats({
        student_id: profile.id,
        total_focus_minutes: metrics.totalFocusMinutes,
        monthly_focus_minutes: (currentStats?.monthly_focus_minutes || 0) + minutes,
        streak_flame: metrics.streakFlame,
        last_practice_date: todayStr,
        current_xp: metrics.totalXp
      });
      if (avatarRecord) {
        setAvatar({
          ...avatarRecord,
          xp: metrics.totalXp,
          streak_flame: metrics.streakFlame,
          last_focus_date: todayStr
        });
      }
      setLoggedMinutesToday(metrics.todayTotalMinutes);
      setHasExploded(false);
      setPracticeLoggedToday(true);

    } catch (err) {
      console.error('Error logging practice:', err);
      alert('Fehler beim Speichern deiner Übungszeit.');
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleFinishFocusSession = async () => {
    if (!profile) return;
    const targetSeconds = dailyGoal * 60;
    const targetMinsVal = dailyGoal;

    // Schutz gegen versehentliches Antippen (< 10 Sekunden) -> stilles Beenden ohne Fehlermeldung
    if (elapsedSeconds < 10) {
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
      setElapsedSeconds(0);
      setTimerRunning(false);
      setIsExtraTime(false);
      setShowCheckpoint(false);
      return;
    }

    const hasReachedDailyTarget = elapsedSeconds >= targetSeconds;
    let focusMinutes = 0;
    let focusSeconds = 0;
    let extraSeconds = 0;
    let extraMinutes = 0;

    if (hasReachedDailyTarget) {
      focusSeconds = targetSeconds;
      focusMinutes = targetMinsVal;
      extraSeconds = Math.max(0, elapsedSeconds - targetSeconds);
      extraMinutes = Math.round(extraSeconds / 60);
    } else {
      // Unter dem Tagesziel: Jede Session ab 10 Sek. wird wohlwollend als mindestens 1 Minute Übezeit verbucht!
      focusMinutes = Math.max(1, Math.round(elapsedSeconds / 60) || 1);
      focusSeconds = Math.max(elapsedSeconds, focusMinutes * 60);
      extraSeconds = 0;
      extraMinutes = 0;
    }

    const flameLevelName = (dailyGoal >= 10) ? 'Helden-Feuer' : (dailyGoal >= 5 ? 'Mittlere Flamme' : 'Kleine Flamme');

    // Finalize exact duration in DB
    if (currentLogIdRef.current) {
      try {
        await supabase
          .from('fokus_logs')
          .update({
            duration_seconds: focusSeconds,
            duration_minutes: focusMinutes,
            flame_level: flameLevelName,
            is_extra: false
          })
          .eq('id', currentLogIdRef.current);
      } catch (e) {}
    } else {
      try {
        await supabase
          .from('fokus_logs')
          .insert({
            user_id: profile.id,
            duration_seconds: focusSeconds,
            duration_minutes: focusMinutes,
            flame_level: flameLevelName,
            is_extra: false,
            created_at: new Date().toISOString()
          });
      } catch (e) {}
    }

    if (extraSeconds > 0) {
      if (currentExtraLogIdRef.current) {
        try {
          await supabase
            .from('fokus_logs')
            .update({
              duration_seconds: extraSeconds,
              duration_minutes: extraMinutes,
              flame_level: flameLevelName,
              is_extra: true
            })
            .eq('id', currentExtraLogIdRef.current);
        } catch (e) {}
      } else {
        try {
          await supabase
            .from('fokus_logs')
            .insert({
              user_id: profile.id,
              duration_seconds: extraSeconds,
              duration_minutes: extraMinutes,
              is_extra: true,
              flame_level: flameLevelName,
              created_at: new Date().toISOString()
            });
        } catch (e) {}
      }
    }

    // Since logs are written in real-time, skip inserts but update stats and avatar.
    await handleQuickLogPractice(focusMinutes, extraMinutes, true);
    setElapsedSeconds(0);
    setTimerRunning(false);
    setIsExtraTime(false);
    setShowCheckpoint(false);
    currentLogIdRef.current = null;
    currentExtraLogIdRef.current = null;
  };

  const handleStartTimer = async () => {
    if (!profile) return;
    // Unlock or initialize AudioContext
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
      }
    } catch (e) {
      console.warn("Failed to initialize AudioContext on user gesture:", e);
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const usesSensors = isMobile && typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;

    let permission = 'denied';
    if (usesSensors && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        permission = await Promise.race([
          (DeviceOrientationEvent as any).requestPermission(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 800))
        ]) as string;
      } catch (err) {
        console.warn("Sensor permission request failed or timed out:", err);
        permission = 'granted'; // Fallback to let the timer run
      }
    } else {
      permission = 'granted';
    }

    if (permission === 'granted') {
      setPreStartCountdown(3);
      setTimerRunning(true);
      setShowCheckpoint(false);
      nextCheckpointSecondsRef.current = Math.floor(Math.random() * 180) + 300; // 5-8 minutes

      // Query if student has logged a focus session today and insert initial heartbeat log
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      supabase
        .from('fokus_logs')
        .select('id')
        .eq('user_id', profile.id)
        .eq('is_extra', false)
        .gte('created_at', startOfDay.toISOString())
        .then(({ data }) => {
          const hasFocusLoggedToday = data && data.length > 0;
          const isExtra = !!hasFocusLoggedToday;

          supabase
            .from('fokus_logs')
            .insert({
              user_id: profile.id,
              duration_minutes: 0,
              duration_seconds: 0,
              is_extra: isExtra,
              flame_level: 'Kleine Flamme'
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

    } else {
      alert("Damit die Anti-Schummel-Erkennung funktioniert, benötigen wir Sensor-Zugriff!");
    }
  };

  // ── PIN-Eingabe: Ziffern-Eingabe-Handler ─────────────────────────────────
  const handlePinDigit = (digit: string) => {
    if (pinLoading) return;
    if (pinInput.length < 6) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);

      // Auto-morph to parent mode if 5th digit is entered
      if (nextPin.length === 5 && !isParentPinMode) {
        setIsParentPinMode(true);
      }

      if (nextPin.length === 4 && !isParentPinMode && pinPurpose === 'setup_initial_pin') {
        setTimeout(() => {
          handlePinSubmit(nextPin);
        }, 100);
      } else if (nextPin.length === 4 && !isParentPinMode) {
        setTimeout(() => {
          handlePinSubmit(nextPin);
        }, 120);
      } else if (nextPin.length === 6) {
        setTimeout(() => {
          handlePinSubmit(nextPin);
        }, 120);
      }
    }
  };

  const handlePinDelete = () => {
    if (pinLoading) return;
    setPinInput(prev => {
      const next = prev.slice(0, -1);
      return next;
    });
  };

  const handlePinSubmit = async (explicitPin?: string) => {
    const pinToVerify = typeof explicitPin === 'string' ? explicitPin : pinInput;
    if (!pinToVerify || (pinToVerify.length !== 4 && pinToVerify.length !== 6) || pinLoading || !profile) return;

    if (pinPurpose === 'setup_initial_pin') {
      const validation = validateNewPin(pinToVerify, (profile as any)?.day_of_birth);
      if (!validation.isValid) {
        setPinError(validation.error || 'Ungültige PIN.');
        setPinInput('');
        return;
      }

      setPinLoading(true);
      setPinError(null);
      try {
        sessionStorage.setItem('groovelab_qr_token', token);
        sessionStorage.setItem('groovelab_user_id', profile.id);

        // Store local PIN backups immediately
        localStorage.setItem(`groovelab_user_pin_${profile.id}`, pinToVerify);
        localStorage.setItem(`groovelab_pin_${token}`, pinToVerify);
        sessionStorage.setItem(`groovelab_lessons_unlocked_${profile.id}`, 'true');
        setLessonsUnlocked(true);
        setParentUnlocked(false);

        // Update in-memory profile PIN (Student Personal PIN only)
        profile.personal_pin = pinToVerify;
        profile.onboarding_pin = pinToVerify;
        profile.is_pin_activated = true;
        setProfile(prev => prev ? { 
          ...prev, 
          is_pin_activated: true, 
          personal_pin: pinToVerify, 
          onboarding_pin: pinToVerify
        } : null);

        // 1. Primary: Atomic Security Definer RPC
        let rpcSuccess = false;
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('set_initial_student_pin', {
            p_student_id: profile.id,
            p_qr_token: token,
            p_pin: pinToVerify
          });
          if (!rpcErr && rpcRes === true) {
            rpcSuccess = true;
          }
        } catch (e) {
          console.warn('[QRLanding] set_initial_student_pin RPC notice:', e);
        }

        // 2. Secondary fallback updates if RPC not deployed yet
        if (!rpcSuccess) {
          try {
            await supabase.from('students').update({
              personal_pin: pinToVerify,
              onboarding_pin: pinToVerify,
              is_pin_activated: true,
              status: 'aktiv'
            }).eq('id', profile.id);
          } catch (e) {}

          const userUpdatePayload: any = {
            personal_pin: pinToVerify,
            onboarding_pin: pinToVerify,
            is_pin_activated: true,
            status: 'aktiv'
          };
          let { error: updateErr } = await supabase
            .from('users')
            .update(userUpdatePayload)
            .eq('id', profile.id);

          if (updateErr && (updateErr.message?.includes('onboarding_pin') || updateErr.message?.includes('record "new" has no field'))) {
            delete userUpdatePayload.onboarding_pin;
            const fallbackRes = await supabase
              .from('users')
              .update(userUpdatePayload)
              .eq('id', profile.id);
            updateErr = fallbackRes.error;
          }
        }

        // Ensure activation_days record exists so Secretary Dashboard shows "Aktiv"
        try {
          const { data: existingAct } = await supabase
            .from('activation_days')
            .select('student_id')
            .eq('student_id', profile.id)
            .maybeSingle();

          if (!existingAct) {
            await supabase.from('activation_days').insert({
              student_id: profile.id,
              day_of_birth: (profile as any).day_of_birth || 1
            });
          }
        } catch (e) {}

        setPinInput('');
        sessionStorage.setItem('groovelab_qr_token', token);
        setPageState('profile');
      } catch (err: any) {
        console.error('[QRLanding] setup_initial_pin error:', err);
        setPinError('Fehler beim Speichern der PIN: ' + err.message);
      } finally {
        setPinLoading(false);
      }
      return;
    }

    if (pinAttempts >= MAX_ATTEMPTS) {
      setPinError(`Zu viele Fehlversuche. Bitte wende dich an deine Schule.`);
      return;
    }

    setPinLoading(true);
    setPinError(null);

    try {
      let isCorrect = false;
      let isParentMatch = false;

      // 1. Try parent PIN verification (6 digits or explicit parent PIN or parent mode)
      if (pinToVerify.length === 6 || isParentPinMode || (profile && profile.parent_pin)) {
        const hasParentPinConfigured = Boolean(
          profile?.has_parent_pin === true ||
          (profile?.parent_pin && String(profile.parent_pin).trim() !== '') ||
          localStorage.getItem(`groovelab_parent_pin_${profile.id}`)
        );

        if (isParentPinMode && !hasParentPinConfigured) {
          setPinError('Für dieses Profil wurde noch keine Eltern-Master-PIN eingerichtet. Bitte melde dich zuerst mit der Schüler-PIN an und richte sie im Eltern-Bereich ein.');
          setPinInput('');
          return;
        }

        const parentOk = await verifyParentPinClient(profile.id, pinToVerify, profile.parent_pin);
        if (parentOk) {
          isCorrect = true;
          isParentMatch = true;
        }
      }

      // 2. Try verify_student_pin RPC (4 digits)
      if (!isCorrect && pinToVerify.length === 4) {
        try {
          const { data: rpcRes, error } = await supabase.rpc('verify_student_pin', {
            p_student_id: profile.id,
            p_pin: pinToVerify,
          });
          if (!error && rpcRes === true) {
            isCorrect = true;
          }
        } catch (e) {}
      }

      // 3. Fallback comparison for student PIN
      if (!isCorrect && profile) {
        const savedPin = localStorage.getItem(`groovelab_user_pin_${profile.id}`) || localStorage.getItem(`groovelab_pin_${token}`);
        if (
          (profile.personal_pin && String(profile.personal_pin).trim() === pinToVerify.trim()) ||
          (profile.onboarding_pin && String(profile.onboarding_pin).trim() === pinToVerify.trim()) ||
          (savedPin && savedPin.trim() === pinToVerify.trim())
        ) {
          isCorrect = true;
        }
      }

      if (isCorrect === true) {
        setPinAttempts(0);
        if (isParentMatch) {
          sessionStorage.setItem(`groovelab_parent_unlocked_${token}`, 'true');
          sessionStorage.setItem(`groovelab_parent_unlocked_${profile.id}`, 'true');
          sessionStorage.setItem(`groovelab_parent_session_${profile.id}`, String(Date.now() + 15 * 60 * 1000));
          setParentUnlocked(true);
        } else {
          setParentUnlocked(false);
        }
        sessionStorage.setItem(`groovelab_user_pin_${profile.id}`, pinToVerify);
        sessionStorage.setItem(`groovelab_pin_${token}`, pinToVerify);
        sessionStorage.setItem(`groovelab_lessons_unlocked_${profile.id}`, 'true');
        setLessonsUnlocked(true);
        setPinInput('');
        
        if (pinPurpose === 'unlock_app') {
          await redirectToCampus(profile);
        } else {
          if (isParentMatch) {
            setActiveTab('settings');
          }
          setPageState('profile');
        }
      } else {
        const remaining = MAX_ATTEMPTS - (pinAttempts + 1);
        setPinAttempts(prev => prev + 1);
        if (remaining <= 0) {
          setPinError('Zu viele Fehlversuche. Dieses Konto wurde aus Sicherheitsgründen gesperrt. Bitte wende dich an deine Schule.');
          await supabase
            .from('users')
            .update({ is_campus_active: false, is_groovelab_active: false })
            .eq('id', profile.id);
        } else {
          setPinError(`Falsche PIN. Noch ${remaining} Versuch${remaining === 1 ? '' : 'e'}.`);
        }
        setPinInput('');
      }
    } catch (err: any) {
      console.error('[QRLanding] verify_parent_pin error:', err);
      setPinError('Verbindungsfehler beim Prüfen der PIN.');
      setPinInput('');
    } finally {
      setPinLoading(false);
    }
  };

  // ── Helper: Homework parsing & rendering ──────────────────────────────────
  const getISOWeek = (dateInput?: string | Date, lessonDay: number = 1): string => {
    let date: Date;
    if (!dateInput) {
      date = new Date();
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      const match = String(dateInput).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // 0-indexed
        const day = parseInt(match[3], 10);
        date = new Date(year, month, day);
      } else {
        date = new Date(dateInput);
      }
    }
    
    if (isNaN(date.getTime())) {
      date = new Date();
    }

    const currentDay = date.getDay();
    let diff = currentDay - lessonDay;
    if (diff < 0) {
      diff += 7;
    }
    
    const lessonStart = new Date(date);
    lessonStart.setDate(date.getDate() - diff);

    const d = new Date(Date.UTC(lessonStart.getFullYear(), lessonStart.getMonth(), lessonStart.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  };

  const getItemWeek = (item: { topic_name: string; updated_at?: string }): string => {
    if (item.topic_name.startsWith('Hausaufgabe KW ')) {
      const parts = item.topic_name.split('Hausaufgabe KW ');
      const kwNum = parts[1]?.trim();
      if (kwNum) {
        const year = item.updated_at ? new Date(item.updated_at).getFullYear() : new Date().getFullYear();
        return `${year}-W${kwNum.padStart(2, '0')}`;
      }
    }
    const lessonDay = schedules.length > 0 ? schedules[0].day_of_week : 1;
    return item.updated_at ? getISOWeek(item.updated_at, lessonDay) : '';
  };

  const getHomeworkNotes = (targetWeek: string): string[] => {
    const notes: string[] = [];
    const weekItems = progressItems.filter(item => getItemWeek(item) === targetWeek);
    for (const item of weekItems) {
      if (item.homework_notes && item.homework_notes.trim()) {
        try {
          const raw = item.homework_notes;
          if (raw.startsWith('[') && raw.endsWith(']')) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach((n: string) => {
                if (n && n.trim() && !notes.includes(n.trim())) {
                  notes.push(n.trim());
                }
              });
            }
          } else {
            const lines = raw
              .split('\n')
              .filter((line: string) => !line.trim().startsWith('• 📖') && !line.trim().startsWith('• 🎵') && !line.trim().startsWith('• 🗑️'))
              .map((l: string) => l.trim())
              .filter(Boolean);
            lines.forEach((l: string) => {
              if (l && !notes.includes(l)) {
                notes.push(l);
              }
            });
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    return notes;
  };

  const formatPageNumbers = (pages: number[]): string => {
    if (pages.length === 0) return '';
    const sorted = [...pages].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0];
    let end = start;
    
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        if (start === end) ranges.push(`${start}`);
        else ranges.push(`${start}–${end}`);
        start = sorted[i];
        end = start;
      }
    }
    if (start === end) ranges.push(`${start}`);
    else ranges.push(`${start}–${end}`);
    
    if (ranges.length === 1) return `S. ${ranges[0]}`;
    const last = ranges.pop();
    return `S. ${ranges.join(', ')} & ${last}`;
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Fetch occurrence-specific chat messages for Shoutbox
  const fetchChat = async (studentId: string, occurrenceId: string) => {
    if (!studentId || !occurrenceId) return;
    try {
      const { data, error } = await supabase
        .from('campus_direct_messages')
        .select('*')
        .eq('occurrence_id', occurrenceId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (data) {
        setChatMessages(data);
        setTimeout(() => chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
      }
    } catch (err) {
      console.error('Error fetching chat messages for occurrence:', err);
    }
  };

  useEffect(() => {
    if (!activeChatOcc || !profile?.id) {
      setChatMessages([]);
      return;
    }
    const studentId = profile.id;

    fetchChat(studentId, activeChatOcc.id);

    const markAsRead = async () => {
      try {
        await supabase
          .from('campus_direct_messages')
          .update({ is_read: true })
          .eq('occurrence_id', activeChatOcc.id)
          .eq('recipient_id', studentId)
          .eq('is_read', false);
        setUnreadMessageOccurrences(prev => prev.filter(id => id !== activeChatOcc.id));
      } catch (err) {
        console.warn('Could not mark messages as read:', err);
      }
    };
    markAsRead();

    const channel = supabase
      .channel(`chat_occ_board_${activeChatOcc.id}`)
      .on('postgres_changes', { 
        schema: 'public', 
        event: '*', 
        table: 'campus_direct_messages', 
        filter: `occurrence_id=eq.${activeChatOcc.id}` 
      }, () => {
        fetchChat(studentId, activeChatOcc.id);
        setActiveChatOccIds(prev => {
          const newSet = new Set(prev);
          newSet.add(activeChatOcc.id);
          return newSet;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChatOcc, profile?.id]);

  const sendDirectChatMessage = async (contentToSend: string) => {
    if (!contentToSend.trim() || !activeChatOcc || !profile?.id) return;

    const studentId = profile.id;
    const recipientId = activeChatOcc.teacher_id;
    if (!studentId || !recipientId) return;

    const messageContent = contentToSend.trim();

    try {
      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage = {
        id: tempId,
        sender_id: studentId,
        recipient_id: recipientId,
        content: messageContent,
        occurrence_id: activeChatOcc.id,
        created_at: new Date().toISOString(),
        is_read: false
      };
      setChatMessages(prev => [...prev, optimisticMessage]);
      setTimeout(() => chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

      const { error } = await supabase.from('campus_direct_messages').insert({
        sender_id: studentId,
        recipient_id: recipientId,
        content: messageContent,
        occurrence_id: activeChatOcc.id
      });
      if (error) throw error;

      setActiveChatOccIds(prev => {
        const newSet = new Set(prev);
        newSet.add(activeChatOcc.id);
        return newSet;
      });

      // Send push notification to teacher with full appointment context
      try {
        const { data: senderProfile } = await supabase
          .from('users')
          .select('first_name')
          .eq('id', studentId)
          .single();
        const senderName = `${senderProfile?.first_name || 'Ein Schüler'} ${maskLastName(profile.last_name)}`;
        const occDateStr = activeChatOcc?.date ? new Date(activeChatOcc.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '';
        const timeStr = activeChatOcc?.start_time ? activeChatOcc.start_time.slice(0, 5) : '';
        const dateCtx = occDateStr ? `(Termin ${occDateStr}${timeStr ? `, ${timeStr} Uhr` : ''})` : '';

        await supabase.functions.invoke('send-push', {
          body: {
            userId: recipientId,
            title: `1:1 Shoutbox`,
            body: `${senderName} ${dateCtx}: ${messageContent}`,
            url: '/'
          }
        });
      } catch (pushErr) {
        console.error('Failed to dispatch push notification for shoutbox:', pushErr);
      }

      await fetchChat(studentId, activeChatOcc.id);
    } catch (err) {
      console.error('Error sending chat message:', err);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatTypedMessage.trim() || !activeChatOcc || !profile?.id) return;

    const messageContent = chatTypedMessage.trim();
    setChatTypedMessage('');
    await sendDirectChatMessage(messageContent);
  };

  const handleCancelOccurrence = async (occ: any) => {
    const formattedDate = new Date(occ.date).toLocaleDateString('de-DE');

    try {
      if (occ.id.toString().startsWith('virtual-') || occ.is_virtual) {
        const { error: insertErr } = await supabase
          .from('schedule_occurrences')
          .insert({
            schedule_id: occ.schedule_id,
            student_id: occ.student_id,
            teacher_id: occ.teacher_id,
            date: occ.date,
            start_time: occ.start_time,
            duration: occ.duration || 45,
            status: 'cancelled',
            student_acknowledged: true
          });
        if (insertErr) throw insertErr;
      } else {
        const { error: updateErr } = await supabase
          .from('schedule_occurrences')
          .update({ status: 'cancelled', student_acknowledged: true })
          .eq('id', occ.id);
        if (updateErr) throw updateErr;
      }

      // Add system alert
      try {
        const userName = `${profile?.first_name || 'Schüler'} ${maskLastName(profile?.last_name)}`;
        await supabase.from('system_alerts').insert({
          school_id: profile?.school_id || null,
          teacher_id: occ.teacher_id,
          type: 'Termin abgesagt',
          message: `❌ Absage: Schüler ${userName} hat den Termin am ${formattedDate} um ${occ.start_time?.substring(0, 5)} Uhr abgesagt.`
        });
      } catch (alertErr) {
        console.warn('Could not create system alert:', alertErr);
      }

      // Send a chat message informing about the cancellation
      try {
        await supabase.from('campus_direct_messages').insert({
          sender_id: profile?.id,
          recipient_id: occ.teacher_id,
          content: `❌ Termin am ${formattedDate} abgesagt.`,
          occurrence_id: occ.id
        });
      } catch (chatErr) {
        console.warn('Could not send cancellation chat msg:', chatErr);
      }

      await fetchDashboardData();
    } catch (err: any) {
      console.error('Error canceling occurrence:', err);
      alert('Fehler beim Absagen des Termins: ' + err.message);
    }
  };

  const handleUndoCancel = async (occ: any) => {
    if (!confirm('Möchtest du diese Absage wirklich rückgängig machen?')) return;
    try {
      if (!occ.id) return;

      if (occ.id.toString().startsWith('virtual-')) {
        return;
      }

      if (occ.schedule_id) {
        // Recurring override: delete it to restore template
        const { error: delErr } = await supabase
          .from('schedule_occurrences')
          .delete()
          .eq('id', occ.id);
        if (delErr) throw delErr;
      } else {
        const { error: updErr } = await supabase
          .from('schedule_occurrences')
          .update({ status: 'scheduled' })
          .eq('id', occ.id);
        if (updErr) throw updErr;
      }

      // Send system message to Direct Messages & Alerts
      try {
        const studentUserId = profile?.id || occ.student_id;
        const teacherUserId = occ.teacher_id;
        const targetOccId = occ.schedule_id ? `virtual-${occ.schedule_id}-${occ.date}` : occ.id;

        if (studentUserId && teacherUserId && occ.date) {
          const [y, m, d] = String(occ.date).split('-').map(Number);
          const occDate = (y && m && d) ? new Date(y, m - 1, d) : new Date();
          const shortDay = occDate.toLocaleDateString('de-DE', { weekday: 'short' });
          const shortDate = occDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
          const timeLabel = (occ.start_time || '16:30').slice(0, 5);

          const notificationMessage = `Der verschobene oder abgesagte Termin wurde auf den regulären Termin zurückgesetzt:\n${shortDay} ${shortDate} um ${timeLabel} Uhr.`;

          await supabase.from('campus_direct_messages').insert({
            sender_id: studentUserId,
            recipient_id: teacherUserId,
            content: notificationMessage,
            occurrence_id: targetOccId,
            is_system: true,
            message_type: 'reschedule_notification'
          });
        }
      } catch (notifErr) {
        console.warn('Could not insert undo cancel system message in QRLandingPage:', notifErr);
      }

      await fetchDashboardData();
    } catch (err: any) {
      console.error('Error undoing cancellation:', err);
      alert('Fehler beim Reaktivieren: ' + err.message);
    }
  };

  const handleAcknowledgeOccurrence = async (occ: any) => {
    try {
      const isRescheduled = occ.status === 'pending_reschedule' || (occ.original_date && occ.original_date !== occ.date && occ.status !== 'rescheduled_confirmed');
      const updateData: any = { student_acknowledged: true };
      if (isRescheduled) {
        updateData.status = 'rescheduled_confirmed';
      }
      
      const { error } = await supabase
        .from('schedule_occurrences')
        .update(updateData)
        .eq('id', occ.id);
      if (error) throw error;
      
      await fetchDashboardData();
    } catch (err) {
      console.error('Error acknowledging occurrence:', err);
    }
  };

  const handleRejectReschedule = async (occ: any) => {
    try {
      const originalDate = occ.original_date || occ.date;
      const originalStartTime = occ.original_start_time || occ.start_time;
      const formattedDate = new Date(occ.date).toLocaleDateString('de-DE');

      if (occ.id.toString().startsWith('virtual-') || occ.is_virtual) {
        const { error: insertErr } = await supabase
          .from('schedule_occurrences')
          .insert({
            schedule_id: occ.schedule_id,
            student_id: occ.student_id,
            teacher_id: occ.teacher_id,
            date: originalDate,
            start_time: originalStartTime,
            duration: occ.duration || 45,
            status: 'cancelled',
            student_acknowledged: true
          });
        if (insertErr) throw insertErr;
      } else {
        const { error: updateErr } = await supabase
          .from('schedule_occurrences')
          .update({
            date: originalDate,
            start_time: originalStartTime,
            status: 'cancelled',
            student_acknowledged: true
          })
          .eq('id', occ.id);
        if (updateErr) throw updateErr;
      }

      // Add system alert for teacher
      try {
        const userName = `${profile?.first_name || 'Schüler'} ${maskLastName(profile?.last_name)}`;
        await supabase.from('system_alerts').insert({
          school_id: profile?.school_id || null,
          teacher_id: occ.teacher_id,
          type: 'Verschiebung abgelehnt',
          message: `❌ Verschiebung abgelehnt: Schüler ${userName} hat den Verschiebungstermin am ${formattedDate} um ${occ.start_time?.substring(0, 5)} Uhr abgelehnt. Der Termin wurde auf den Originaltermin zurückgesetzt und für diese Woche abgesagt.`
        });
      } catch (alertErr) {
        console.warn('Could not create system alert:', alertErr);
      }

      // Send chat message
      try {
        await supabase.from('campus_direct_messages').insert({
          sender_id: profile?.id,
          recipient_id: occ.teacher_id,
          content: `❌ Verschiebung am ${formattedDate} abgelehnt.`,
          occurrence_id: occ.id
        });
      } catch (chatErr) {
        console.warn('Could not send chat msg:', chatErr);
      }

      await fetchDashboardData();
    } catch (err: any) {
      console.error('Error rejecting reschedule:', err);
      alert('Fehler beim Ablehnen der Verschiebung: ' + err.message);
    }
  };

  const handleOpenFullWebApp = async () => {
    if (!profile) return;
    const isUnlocked = localStorage.getItem(`groovelab_parent_unlocked_${token}`) === 'true' || parentUnlocked;
    if (isUnlocked) {
      await redirectToCampus(profile);
    } else {
      setPinPurpose('unlock_app');
      setPageState('pin_required');
    }
  };

  const handleLessonsPinSubmit = async (inputPin: string) => {
    if (!inputPin || inputPin.length !== 4 || pinLoading || !profile) return;
    if (lessonsPinAttempts >= MAX_ATTEMPTS) {
      setPinError(`Zu viele Fehlversuche. Bitte wende dich an deine Schule.`);
      return;
    }

    setPinLoading(true);
    setPinError(null);

    try {
      let isVerified = false;
      // 1. Try verify_student_pin RPC
      try {
        const { data: rpcRes, error } = await supabase.rpc('verify_student_pin', {
          p_student_id: profile.id,
          p_pin: inputPin,
        });
        if (!error && rpcRes === true) {
          isVerified = true;
        }
      } catch (e) {}

      // 2. Try verifyParentPinClient (parent PIN)
      if (!isVerified) {
        const parentOk = await verifyParentPinClient(profile.id, inputPin, profile.parent_pin);
        if (parentOk) {
          isVerified = true;
        }
      }

      // 3. Fallback comparison
      if (!isVerified && profile) {
        const savedPin = localStorage.getItem(`groovelab_user_pin_${profile.id}`) || localStorage.getItem(`groovelab_pin_${token}`);
        if (
          (profile.personal_pin && String(profile.personal_pin).trim() === inputPin.trim()) ||
          (profile.onboarding_pin && String(profile.onboarding_pin).trim() === inputPin.trim()) ||
          (savedPin && savedPin.trim() === inputPin.trim())
        ) {
          isVerified = true;
        }
      }

      if (isVerified === true) {
        setLessonsPinAttempts(0);
        sessionStorage.setItem(`groovelab_lessons_unlocked_${profile.id}`, 'true');
        setLessonsUnlocked(true);
        setPinInput('');
      } else {
        const remaining = MAX_ATTEMPTS - (lessonsPinAttempts + 1);
        setLessonsPinAttempts(prev => prev + 1);
        if (remaining <= 0) {
          setPinError('Zu viele Fehlversuche. Dieses Konto wurde aus Sicherheitsgründen gesperrt. Bitte wende dich an deine Schule.');
          await supabase
            .from('users')
            .update({ is_campus_active: false, is_groovelab_active: false })
            .eq('id', profile.id);
        } else {
          setPinError(`Falsche PIN. Noch ${remaining} Versuch${remaining === 1 ? '' : 'e'}.`);
        }
        setPinInput('');
      }
    } catch (err: any) {
      console.error('[QRLanding] handleLessonsPinSubmit error:', err);
      setPinError('Verbindungsfehler. Bitte versuche es erneut.');
      setPinInput('');
    } finally {
      setPinLoading(false);
    }
  };

  const renderLessonsWidget = () => {
    if (!lessonsUnlocked) {
      const blocked = lessonsPinAttempts >= MAX_ATTEMPTS;
      
      const handleLessonsPinDigit = (digit: string) => {
        if (pinInput.length < 4) {
          const newVal = pinInput + digit;
          setPinInput(newVal);
          if (newVal.length === 4) {
            handleLessonsPinSubmit(newVal);
          }
        }
      };

      const handleLessonsPinDelete = () => {
        setPinInput(prev => prev.slice(0, -1));
      };

      if (!profile?.has_parent_pin) {
        // Initial setup for safety PIN
        return (
          <div style={{
            ...styles.card,
            padding: '24px 20px',
            gap: '16px',
            boxSizing: 'border-box'
          }}>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#e6f4ea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34a853' }}>
                <Key size={24} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>🔒 Sicherheits-PIN einrichten</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', fontWeight: 650, lineHeight: 1.4 }}>
                Um deine Unterrichtstermine und Chats zu schützen, richte bitte eine persönliche 4-stellige Sicherheits-PIN ein.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Neue 4-stellige PIN:</label>
                <input
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '1.2rem',
                    textAlign: 'center',
                    border: '2px solid #cbd5e1',
                    borderRadius: '12px',
                    outline: 'none',
                    letterSpacing: '0.4em',
                    fontWeight: 900,
                    background: '#f8fafc',
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>PIN wiederholen:</label>
                <input
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPinConfirm}
                  onChange={(e) => setNewPinConfirm(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '1.2rem',
                    textAlign: 'center',
                    border: '2px solid #cbd5e1',
                    borderRadius: '12px',
                    outline: 'none',
                    letterSpacing: '0.4em',
                    fontWeight: 900,
                    background: '#f8fafc',
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              disabled={newPinInput.length !== 4 || newPinConfirm.length !== 4 || pinChangeLoading}
              onClick={handleSaveInitialPin}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                background: newPinInput.length === 4 && newPinConfirm.length === 4 ? '#34a853' : '#e2e8f0',
                color: newPinInput.length === 4 && newPinConfirm.length === 4 ? 'white' : '#94a3b8',
                fontSize: '0.85rem',
                fontWeight: 900,
                cursor: 'pointer',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {pinChangeLoading ? <span style={styles.spinnerInline} /> : <>Speichern & freischalten</>}
            </button>
          </div>
        );
      }

      // Enter safety PIN view
      return (
        <div style={{
          ...styles.card,
          padding: '24px 20px',
          gap: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#e6f4ea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34a853', position: 'relative' }}>
              <Lock size={22} />
              {occurrences.some(occ => {
                const isRescheduled = occ.status === 'pending_reschedule' || occ.status === 'rescheduled_confirmed';
                const isCanceled = occ.status === 'cancelled' || occ.status === 'canceled_by_student' || occ.status === 'teacher_sick' || occ.status === 'canceled_by_teacher_sick';
                const needsAck = occ.student_acknowledged === false && (isRescheduled || isCanceled || occ.original_date);
                const hasUnreadMsg = unreadMessageOccurrences.includes(occ.id);
                return needsAck || hasUnreadMsg;
              }) && (
                <span style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  border: '2px solid #ffffff'
                }} />
              )}
            </div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>🔒 Bereich geschützt</h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', fontWeight: 650, lineHeight: 1.4 }}>
              Gib deine 4-stellige Sicherheits-PIN ein, um deine Termine und Chats freizuschalten.
            </p>
            {occurrences.some(occ => {
              const isRescheduled = occ.status === 'pending_reschedule' || occ.status === 'rescheduled_confirmed';
              const isCanceled = occ.status === 'cancelled' || occ.status === 'canceled_by_student' || occ.status === 'teacher_sick' || occ.status === 'canceled_by_teacher_sick';
              const needsAck = occ.student_acknowledged === false && (isRescheduled || isCanceled || occ.original_date);
              const hasUnreadMsg = unreadMessageOccurrences.includes(occ.id);
              return needsAck || hasUnreadMsg;
            }) && (
              <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', color: '#c2410c', padding: '6px 12px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 800, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>🔔</span>
                <span>Du hast neue Termin-Änderungen oder Nachrichten!</span>
              </div>
            )}
          </div>

          {/* PIN Display circles */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                width: '40px',
                height: '48px',
                borderRadius: '12px',
                background: '#f8fafc',
                border: `2px solid ${pinInput.length > i ? '#34a853' : '#e2e8f0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontWeight: 900,
                color: '#0f172a',
                transition: 'border-color 0.2s',
                boxShadow: pinInput.length > i ? '0 0 0 3px rgba(52, 168, 83,0.1)' : 'none'
              }}>
                {pinInput[i] ? '●' : ''}
              </div>
            ))}
          </div>

          {pinError && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '10px',
              fontSize: '0.75rem',
              color: '#dc2626',
              fontWeight: 700,
              textAlign: 'center'
            }}>
              {pinError}
            </div>
          )}

          {!blocked && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key) => (
                <button
                  key={key}
                  type="button"
                  disabled={pinLoading || !key}
                  onClick={() => {
                    if (key === '⌫') handleLessonsPinDelete();
                    else if (key) handleLessonsPinDigit(key);
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: key === '⌫' ? '#fee2e2' : key === '' ? 'transparent' : '#f1f5f9',
                    color: key === '⌫' ? '#ef4444' : '#0f172a',
                    fontSize: key === '⌫' ? '1rem' : '1.2rem',
                    fontWeight: 800,
                    cursor: key ? 'pointer' : 'default',
                    transition: 'background 0.15s, transform 0.1s',
                    visibility: key === '' ? 'hidden' : 'visible',
                  }}
                  onMouseDown={e => e.currentTarget.style.transform = key ? 'scale(0.92)' : ''}
                  onMouseUp={e => e.currentTarget.style.transform = ''}
                >
                  {key}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Sort occurrences by date and time
    const sortedOccurrences = [...occurrences].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.start_time.localeCompare(b.start_time);
    });

    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone
    const allUpcomingOccurrences = sortedOccurrences.filter(occ => occ.date >= todayStr);
    const pastOccurrences = sortedOccurrences.filter(occ => occ.date < todayStr);

    const isCampusActive = profile?.is_campus_active === true;
    const upcomingOccurrences = isCampusActive ? allUpcomingOccurrences : allUpcomingOccurrences.slice(0, 4);

    if (sortedOccurrences.length === 0) {
      return (
        <div style={{
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1.5px dashed #cbd5e1',
          borderRadius: '24px',
          padding: '24px',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic', fontWeight: 650 }}>
            Keine anstehenden Termine erfasst
          </p>
        </div>
      );
    }

    // Group upcoming occurrences by month
    const upcomingMonthGroups: Record<string, { label: string; items: any[] }> = {};
    upcomingOccurrences.forEach(occ => {
      const d = new Date(occ.date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const monthKey = `${yyyy}-${mm}`;
      
      if (!upcomingMonthGroups[monthKey]) {
        const label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
        upcomingMonthGroups[monthKey] = {
          label,
          items: []
        };
      }
      upcomingMonthGroups[monthKey].items.push(occ);
    });

    // Group past occurrences by month
    const pastMonthGroups: Record<string, { label: string; items: any[] }> = {};
    pastOccurrences.forEach(occ => {
      const d = new Date(occ.date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const monthKey = `${yyyy}-${mm}`;
      
      if (!pastMonthGroups[monthKey]) {
        const label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
        pastMonthGroups[monthKey] = {
          label,
          items: []
        };
      }
      pastMonthGroups[monthKey].items.push(occ);
    });
    Object.keys(pastMonthGroups).forEach(key => {
      pastMonthGroups[key].items.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.start_time.localeCompare(a.start_time);
      });
    });

    // Sort upcoming occurrences ascending inside their groups
    Object.keys(upcomingMonthGroups).forEach(key => {
      upcomingMonthGroups[key].items.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.start_time.localeCompare(b.start_time);
      });
    });

    const sortedUpcomingMonthKeys = Object.keys(upcomingMonthGroups).sort();
    const sortedPastMonthKeys = Object.keys(pastMonthGroups).sort((a, b) => b.localeCompare(a));

    const toggleMonth = (monthKey: string, defaultCollapsed: boolean) => {
      setCollapsedMonths(prev => {
        const isCurrentlyCollapsed = prev[monthKey] !== undefined ? prev[monthKey] : defaultCollapsed;
        return {
          ...prev,
          [monthKey]: !isCurrentlyCollapsed
        };
      });
    };

    const formatDateGerman = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatWeekday = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString('de-DE', { weekday: 'short' }).substring(0, 2);
    };

    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const hasUnreadUpdate = (occ: any) => {
      const isRescheduled = occ.status === 'pending_reschedule' || occ.status === 'rescheduled_confirmed';
      const isCanceled = occ.status === 'cancelled' || occ.status === 'canceled_by_student';
      const needsAck = occ.student_acknowledged === false && (isRescheduled || isCanceled || occ.original_date);
      const hasUnreadMsg = unreadMessageOccurrences.includes(occ.id);
      return needsAck || hasUnreadMsg;
    };

    const renderMonthGroup = (monthKey: string, group: any, defaultCollapsed: boolean) => {
      const isCollapsed = collapsedMonths[monthKey] !== undefined ? collapsedMonths[monthKey] : defaultCollapsed;
      const monthHasUpdate = group.items.some((occ: any) => hasUnreadUpdate(occ));

      return (
        <div key={monthKey} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div 
            onClick={() => toggleMonth(monthKey, defaultCollapsed)}
            style={{
              fontSize: '0.85rem',
              fontWeight: 900,
              color: '#475569',
              padding: '10px 14px',
              background: '#f8fafc',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
              border: monthHasUpdate ? '1.5px solid #ef4444' : '1px solid #e2e8f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'background 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
              <Calendar size={14} color={monthHasUpdate ? '#ef4444' : '#34a853'} />
              <span style={{ color: monthHasUpdate ? '#0f172a' : '#475569' }}>{group.label}</span>
              {monthHasUpdate && (
                <span style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  background: '#ef4444', 
                  display: 'inline-block' 
                }} />
              )}
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>
                ({group.items.length} {group.items.length === 1 ? 'Termin' : 'Termine'})
              </span>
            </div>
            <span style={{ 
              transition: 'transform 0.2s', 
              transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              display: 'flex',
              alignItems: 'center',
              color: '#64748b'
            }}>
              <ChevronDown size={16} />
            </span>
          </div>
          
          {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {group.items.map((occ: any) => {
                const isCanceled = occ.status === 'cancelled' || occ.status === 'canceled_by_student' || occ.status === 'teacher_sick' || occ.status === 'canceled_by_teacher_sick';
                const isRescheduled = occ.status === 'pending_reschedule' || occ.status === 'rescheduled_confirmed';
                const isPendingReview = occ.schedule?.status === 'ready_for_admin_review' && !occ.room_name && !occ.schedule?.room_id;
                const needsAcknowledge = occ.student_acknowledged === false && (isRescheduled || occ.original_date);
                const hasMessages = activeChatOccIds.has(occ.id) || Boolean(occ.schedule_id && occ.date && activeChatOccIds.has(`virtual-${occ.schedule_id}-${occ.date}`)) || Boolean(occ.occurrence_id && activeChatOccIds.has(occ.occurrence_id));
                const isUnread = unreadMessageOccurrences.includes(occ.id) || Boolean(occ.schedule_id && occ.date && unreadMessageOccurrences.includes(`virtual-${occ.schedule_id}-${occ.date}`));

                let rowBg = '#ffffff';
                let rowBorder = '1px solid #e2e8f0';
                let textColor = '#0f172a';
                let subColor = '#64748b';

                if (isCanceled) {
                  rowBg = '#fef2f2';
                  rowBorder = '1px solid #fecaca';
                  textColor = '#991b1b';
                  subColor = '#dc2626';
                } else if (isRescheduled) {
                  rowBg = '#fffbeb';
                  rowBorder = '1px solid #fef3c7';
                  textColor = '#92400e';
                  subColor = '#d97706';
                } else if (isPendingReview) {
                  rowBg = 'repeating-linear-gradient(-45deg, #fffbeb 0px, #fffbeb 8px, #ffffff 8px, #ffffff 16px)';
                  rowBorder = '1px dashed #eab308';
                  textColor = '#713f12';
                  subColor = '#ca8a04';
                } else if (needsAcknowledge) {
                  rowBg = 'repeating-linear-gradient(-45deg, #fff7ed 0px, #fff7ed 8px, #ffffff 8px, #ffffff 16px)';
                  rowBorder = '1px dashed #f97316';
                  textColor = '#ea580c';
                  subColor = '#f97316';
                }

                const teacherName = `Lehrkraft: ${formatTeacherFullName(occ.teacher) || 'Lehrer'}`;

                if (needsAcknowledge && isRescheduled && !isCanceled) {
                  const origDateStr = occ.original_date ? `${formatWeekday(occ.original_date)}, ${formatDateGerman(occ.original_date)} • ${(occ.original_start_time || occ.start_time || '').substring(0, 5)} Uhr` : null;
                  const newDateStr = `${formatWeekday(occ.date)}, ${formatDateGerman(occ.date)} • ${(occ.start_time || '').substring(0, 5)} Uhr`;

                  return (
                    <div
                      key={occ.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '14px 16px',
                        borderRadius: '18px',
                        background: 'linear-gradient(135deg, #fffdf0 0%, #fefce8 100%)',
                        border: '1px solid #fde047',
                        gap: '12px',
                        boxShadow: '0 4px 16px rgba(234, 179, 8, 0.08)',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Header Row: Teacher Info + Status Badge + Chat */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '10px',
                            background: '#fef08a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            flexShrink: 0
                          }}>
                            🗓️
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e293b' }}>
                              {teacherName}
                            </span>
                            <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              ⏳ Verschiebung angefragt
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveChatOcc(occ)}
                          style={{
                            border: isUnread ? '1px solid #fca5a5' : hasMessages ? '1px solid #fef08a' : '1px solid #e2e8f0',
                            background: isUnread ? '#fee2e2' : '#ffffff',
                            color: isUnread ? '#dc2626' : hasMessages ? '#ca8a04' : '#475569',
                            width: '32px',
                            height: '32px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
                            flexShrink: 0
                          }}
                          title="Shoutbox öffnen"
                        >
                          <MessageSquare size={14} />
                          {isUnread && (
                            <span style={{
                              position: 'absolute',
                              top: '-2px',
                              right: '-2px',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#ef4444',
                              border: '1.5px solid #ffffff'
                            }} />
                          )}
                        </button>
                      </div>

                      {/* Visual Time Difference Banner */}
                      <div style={{
                        background: '#ffffff',
                        border: '1px solid #fef08a',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        {origDateStr && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#64748b' }}>
                            <span style={{ fontWeight: 650 }}>Ursprünglich:</span>
                            <span>{origDateStr}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', color: '#854d0e', fontWeight: 800 }}>
                          <span style={{ fontSize: '0.7rem', background: '#fef9c3', padding: '2px 6px', borderRadius: '5px', color: '#a16207', fontWeight: 800 }}>Neu:</span>
                          <span>{newDateStr}</span>
                        </div>
                      </div>

                      {/* Action Buttons Row */}
                      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                        <button
                          type="button"
                          onClick={() => handleAcknowledgeOccurrence(occ)}
                          style={{
                            flex: 1,
                            background: '#34a853',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '10px 12px',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            boxShadow: '0 3px 10px rgba(52, 168, 83, 0.25)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <Check size={15} /> Verschiebung annehmen
                        </button>

                        {pendingCancelOccId === occ.id ? (
                          <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                            <button
                              type="button"
                              onClick={() => {
                                handleRejectReschedule(occ);
                                setPendingCancelOccId(null);
                              }}
                              style={{
                                flex: 1,
                                background: '#ef4444',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '10px 8px',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Ja, ablehnen
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingCancelOccId(null)}
                              style={{
                                background: '#f1f5f9',
                                color: '#475569',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '10px 10px',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              Abbrechen
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (!parentUnlocked && !profile?.parent_allow_absences) {
                                alert('🛡️ Terminänderungen können nur von Erziehungsberechtigten abgelehnt werden. Bitte melde dich im Eltern-Tab mit der 6-stelligen Eltern-Master-PIN an.');
                                return;
                              }
                              setPendingCancelOccId(occ.id);
                            }}
                            style={{
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              borderRadius: '12px',
                              padding: '10px 14px',
                              fontSize: '0.82rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.2s'
                            }}
                          >
                            <X size={15} /> Ablehnen
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={occ.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '8px 12px',
                      borderRadius: '14px',
                      background: rowBg,
                      border: rowBorder,
                      gap: '4px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', width: '100%' }}>
                      {/* Left side: Date Badge & Teacher Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isCanceled ? '#fee2e2' : '#f1f5f9',
                          borderRadius: '8px',
                          width: '34px',
                          height: '34px',
                          border: isCanceled ? '1px solid #fca5a5' : '1px solid rgba(0,0,0,0.04)',
                          flexShrink: 0
                        }}>
                          <span style={{ fontSize: '6.5px', fontWeight: 900, textTransform: 'uppercase', color: isCanceled ? '#ef4444' : subColor }}>
                            {formatWeekday(occ.date)}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 900, color: isCanceled ? '#b91c1c' : textColor, marginTop: '-2px' }}>
                            {occ.date.substring(8, 10)}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: textColor, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {teacherName}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: subColor, fontWeight: 650, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', textDecoration: isCanceled ? 'line-through' : 'none' }}>
                            {formatDateGerman(occ.date)} • {occ.start_time.substring(0, 5)} Uhr ({occ.duration} Min)
                          </span>
                        </div>
                      </div>

                      {/* Right side: Action Buttons & Shoutbox */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                        {needsAcknowledge && (
                          <button
                            type="button"
                            onClick={() => handleAcknowledgeOccurrence(occ)}
                            style={{
                              background: '#34a853',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '4px 8px',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 1px 3px rgba(52, 168, 83, 0.3)'
                            }}
                            title={isRescheduled ? 'Verschiebung bestätigen' : 'Änderung als gelesen markieren'}
                          >
                            <Check size={12} /> {isRescheduled ? 'Bestätigen' : 'Gelesen'}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setActiveChatOcc(occ)}
                          style={{
                            border: isUnread ? '1px solid #fca5a5' : hasMessages ? '1px solid #fef08a' : '1px solid #e2e8f0',
                            background: isUnread ? '#fee2e2' : hasMessages ? '#fefce8' : '#f8fafc',
                            color: isUnread ? '#dc2626' : hasMessages ? '#ca8a04' : '#475569',
                            width: '30px',
                            height: '30px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative'
                          }}
                          title="Shoutbox öffnen"
                        >
                          <MessageSquare size={13} />
                          {isUnread && (
                            <span style={{
                              position: 'absolute',
                              top: '-2px',
                              right: '-2px',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#ef4444',
                              border: '1.5px solid #ffffff'
                            }} />
                          )}
                        </button>

                        {!isCanceled ? (
                          pendingCancelOccId === occ.id ? (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isRescheduled) {
                                    handleRejectReschedule(occ);
                                  } else {
                                    handleCancelOccurrence(occ);
                                  }
                                  setPendingCancelOccId(null);
                                }}
                                style={{
                                  background: '#ef4444',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {isRescheduled ? 'Ja, ablehnen' : 'Ja, absagen'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingCancelOccId(null)}
                                style={{
                                  background: '#e2e8f0',
                                  color: '#475569',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                Abbrechen
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (!parentUnlocked && !profile?.parent_allow_absences) {
                                  alert('🛡️ Unterrichtsstunden können nur von Erziehungsberechtigten abgesagt werden. Bitte melde dich im Eltern-Tab mit der 6-stelligen Eltern-Master-PIN an.');
                                  return;
                                }
                                setPendingCancelOccId(occ.id);
                              }}
                              style={{
                                background: '#f8fafc',
                                color: isRescheduled ? '#dc2626' : '#64748b',
                                border: isRescheduled ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '5px 9px',
                                fontSize: '0.72rem',
                                fontWeight: 750,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <X size={12} /> {isRescheduled ? 'Ablehnen' : 'Absagen'}
                            </button>
                          )
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#dc2626', background: '#fee2e2', border: '1px solid #fca5a5', padding: '3px 6px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                              Abgesagt
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUndoCancel(occ)}
                              style={{
                                background: '#ffffff',
                                color: '#dc2626',
                                border: '1px solid #fca5a5',
                                borderRadius: '8px',
                                padding: '4px 8px',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Reaktivieren
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status badges row (for pending review / reschedule / acknowledge) */}
                    {(isPendingReview || isRescheduled || needsAcknowledge) && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '1px' }}>
                        {isPendingReview && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, background: '#fffbeb', color: '#b45309', border: '1px solid #fef3c7', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                            ⏳ In Prüfung
                          </span>
                        )}
                        {isRescheduled && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, background: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                            Verschoben
                          </span>
                        )}
                        {needsAcknowledge && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, background: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                            ⏳ Bestätigung ausstehend
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
        {/* Lock / PIN Protection & WebApp Login Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: '-4px', gap: '8px' }}>
          <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Shield size={13} color="#34a853" /> PIN-geschützt
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={handleOpenFullWebApp}
              style={{
                background: '#e6f4ea',
                color: '#288d45',
                border: '1px solid #ceebd6',
                borderRadius: '10px',
                padding: '5px 10px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                transition: 'all 0.2s'
              }}
            >
              In WebApp öffnen <ExternalLink size={12} />
            </button>
            {profile?.has_parent_pin && (
              <button
                type="button"
                onClick={() => {
                  setLessonsUnlocked(false);
                  sessionStorage.removeItem(`groovelab_lessons_unlocked_${profile.id}`);
                  showToastMsg('Termine-Tab wieder per PIN geschützt', 'success');
                }}
                style={{
                  background: '#ffffff',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '5px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s'
                }}
              >
                <Lock size={12} /> Sperren
              </button>
            )}
          </div>
        </div>

        {/* Upcoming appointments month groups */}
        {sortedUpcomingMonthKeys.length > 0 ? (
          sortedUpcomingMonthKeys.map(monthKey => 
            renderMonthGroup(monthKey, upcomingMonthGroups[monthKey], monthKey !== currentMonthKey)
          )
        ) : (
          <div style={{
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1.5px dashed #cbd5e1',
            borderRadius: '24px',
            padding: '24px',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic', fontWeight: 650 }}>
              Keine anstehenden Termine erfasst
            </p>
          </div>
        )}

        {/* Activation Banner for Inactive Profiles */}
        {!isCampusActive && (
          <div 
            onClick={() => setShowActivationInfoModal(true)}
            style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '1.5px solid #bbf7d0',
              borderRadius: '20px',
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(52, 168, 83, 0.1)',
              marginTop: '4px'
            }}
            className="hover-scale"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: '#ffffff',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Sparkles size={18} color="#16a34a" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                  Alle Termine des Schuljahres freischalten
                </span>
                <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 650 }}>
                  Inaktives Profil: Zeigt 4 Termine • Hier tippen für Vollzugriff
                </span>
              </div>
            </div>
            <div style={{
              padding: '6px 12px',
              borderRadius: '100px',
              background: '#ffffff',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              fontWeight: 800,
              fontSize: '0.74rem',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
            }}>
              Aktivieren
            </div>
          </div>
        )}

        {/* Vergangene Termine section */}
        {sortedPastMonthKeys.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            <div
              onClick={() => setPastSectionExpanded(!pastSectionExpanded)}
              style={{
                fontSize: '0.85rem',
                fontWeight: 900,
                color: '#64748b',
                padding: '12px 14px',
                background: '#f1f5f9',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.2s',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} color="#64748b" />
                <span>Vergangene Termine</span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 750 }}>
                  ({pastOccurrences.length} {pastOccurrences.length === 1 ? 'Termin' : 'Termine'})
                </span>
              </div>
              <span style={{
                transition: 'transform 0.2s',
                transform: pastSectionExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                display: 'flex',
                alignItems: 'center',
                color: '#64748b'
              }}>
                <ChevronDown size={16} />
              </span>
            </div>

            {pastSectionExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '4px' }}>
                {sortedPastMonthKeys.map(monthKey => 
                  renderMonthGroup(monthKey, pastMonthGroups[monthKey], true) // Default collapsed for past months!
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderHomeworkWidget = (compressed = false) => {
    const studentId = profile?.id;
    const currentWeek = (() => {
      try {
        const iso = getISOWeek(new Date());
        return iso;
      } catch {
        return '2026-W34';
      }
    })();
    const currentKw = (() => {
      try {
        return currentWeek.split('-W')[1] || '34';
      } catch {
        return '34';
      }
    })();

    const getNormSong = (skillOrItem: any): string => {
      if (!skillOrItem) return '';
      if (typeof skillOrItem === 'string') {
        return skillOrItem.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
      }
      const topic = skillOrItem.topic_name || '';
      if (topic.includes(' - Seite ') || topic.startsWith('Hausaufgabe KW ')) {
        return '';
      }
      if (topic) {
        return topic.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
      }
      const artist = (skillOrItem.songs?.artist || skillOrItem.artist || '').trim();
      const title = (skillOrItem.songs?.title || skillOrItem.song_title || skillOrItem.title || '').trim();
      if (artist && title) return `${artist} - ${title}`.toLowerCase();
      return (title || artist).toLowerCase();
    };

    const getCanKey = (skillOrItem: any): string => {
      const raw = getNormSong(skillOrItem);
      if (!raw) return '';
      if (raw.includes(' - ')) {
        return raw.split(' - ')[1].trim().toLowerCase();
      }
      return raw.trim().toLowerCase();
    };

    const cleanPageNotesText = (notes: any): string => {
      if (!notes) return '';
      let text = '';
      if (typeof notes === 'string') {
        if (notes.startsWith('[') || notes.startsWith('{')) {
          try {
            const parsed = JSON.parse(notes);
            if (Array.isArray(parsed)) {
              text = parsed.join('\n');
            } else {
              text = String(parsed);
            }
          } catch {
            text = notes;
          }
        } else {
          text = notes;
        }
      } else if (Array.isArray(notes)) {
        text = notes.join('\n');
      } else {
        text = String(notes);
      }
      return text
        .split('\n')
        .filter((line: string) => {
          const trimmed = line.trim();
          return !trimmed.startsWith('AUDIO:') && 
                 !trimmed.startsWith('STICKER:') && 
                 !trimmed.startsWith('LOOP:') &&
                 !trimmed.startsWith('LATENCY:') &&
                 !trimmed.startsWith('STUDENT_NOTE_PUBLIC:') && 
                 !trimmed.startsWith('STUDENT_NOTE_PRIVATE:');
        })
        .join('\n')
        .trim();
    };

    // 1. Deduplicate progressItems strictly for the current student profile
    const uniqueItemsMap = new Map<string, any>();
    (progressItems || []).forEach(item => {
      if (!item) return;
      if (studentId && item.student_id && String(item.student_id) !== String(studentId)) return;
      const canonicalKey = getCanKey(item);
      const normTitle = getNormSong(item);
      const name = canonicalKey || normTitle || (item.topic_name || '').trim().toLowerCase();
      if (name && !uniqueItemsMap.has(name)) {
        uniqueItemsMap.set(name, item);
      }
    });
    const deduplicatedItems = Array.from(uniqueItemsMap.values());

    const activeHWs = deduplicatedItems.filter(item => {
      if (item.topic_name && item.topic_name.includes(' - Seite ')) {
        const parts = item.topic_name.split(' - Seite ');
        const bookTitle = parts[0].trim();
        const pageNum = parseInt(parts[1], 10);
        const book = lehrwerke.find(g => g.title === bookTitle);
        if (book) {
          const assignment = (localProgress || []).find((a: any) => 
            (String(a.lehrwerkId) === String(book.id) || String(a.lehrwerk_id) === String(book.id)) && 
            (!studentId || String(a.studentId || a.student_id) === String(studentId))
          );
          const pageState = assignment?.pageStates?.[pageNum];
          return pageState?.status === 'homework' || pageState?.isCurrentHomework || pageState?.is_current_homework;
        }
      }
      const localHw = studentId ? (
        localStorage.getItem(`song_hw_${studentId}_${item.id}`) ??
        (item.song_id ? localStorage.getItem(`song_hw_${studentId}_${item.song_id}`) : null)
      ) : null;
      if (localHw === 'false') return false;
      const isHw = (localHw === 'true') || (localHw !== 'false' && Boolean(item.is_current_homework));
      return isHw && !item.topic_name?.startsWith('Hausaufgabe KW ');
    });

    const activeTheories = deduplicatedItems.filter(item => {
      if (item.topic_name && item.topic_name.includes(' - Seite ')) {
        const parts = item.topic_name.split(' - Seite ');
        const bookTitle = parts[0].trim();
        const pageNum = parseInt(parts[1], 10);
        const book = lehrwerke.find(g => g.title === bookTitle);
        if (book) {
          const assignment = (localProgress || []).find((a: any) => 
            (String(a.lehrwerkId) === String(book.id) || String(a.lehrwerk_id) === String(book.id)) && 
            (!studentId || String(a.studentId || a.student_id) === String(studentId))
          );
          const pageState = assignment?.pageStates?.[pageNum];
          return pageState?.status === 'purple';
        }
      }
      return item.status === 'THEORY_DONE' && 
             item.updated_at && 
             getISOWeek(new Date(item.updated_at)) === currentWeek &&
             !item.topic_name?.startsWith('Hausaufgabe KW ');
    });

    const groupedLehrwerke: Record<string, { pages: number[] }> = {};
    const otherHWs: any[] = [];

    (localProgress || []).forEach((assignment: any) => {
      const assignStdId = String(assignment.studentId || assignment.student_id || '');
      if (studentId && assignStdId && assignStdId !== String(studentId)) return;

      const book = lehrwerke.find(g => String(g.id) === String(assignment.lehrwerkId || assignment.lehrwerk_id));
      if (!book || !assignment.pageStates) return;

      Object.entries(assignment.pageStates).forEach(([pNumStr, pState]: [string, any]) => {
        if (pState?.status === 'homework' || pState?.isCurrentHomework || pState?.is_current_homework) {
          const pageNum = parseInt(pNumStr, 10);
          if (!isNaN(pageNum)) {
            if (!groupedLehrwerke[book.title]) {
              groupedLehrwerke[book.title] = { pages: [] };
            }
            if (!groupedLehrwerke[book.title].pages.includes(pageNum)) {
              groupedLehrwerke[book.title].pages.push(pageNum);
            }
          }
        }
      });
    });

    const allActive = [...activeHWs, ...activeTheories];
    allActive.forEach(item => {
      if (item.topic_name && item.topic_name.includes(' - Seite ')) {
        const parts = item.topic_name.split(' - Seite ');
        const bookTitle = parts[0].trim();
        const book = lehrwerke.find(g => g.title === bookTitle);
        const isBookAssigned = book && (localProgress || []).some((a: any) => 
          (String(a.lehrwerkId) === String(book.id) || String(a.lehrwerk_id) === String(book.id)) && 
          (!studentId || String(a.studentId || a.student_id) === String(studentId))
        );
        if (!isBookAssigned && lehrwerke.length > 0) return;

        const pageNum = parseInt(parts[1], 10);
        if (!groupedLehrwerke[bookTitle]) {
          groupedLehrwerke[bookTitle] = { pages: [] };
        }
        if (!isNaN(pageNum) && !groupedLehrwerke[bookTitle].pages.includes(pageNum)) {
          groupedLehrwerke[bookTitle].pages.push(pageNum);
        }
      } else {
        const localHw = studentId ? (
          localStorage.getItem(`song_hw_${studentId}_${item.id}`) ??
          (item.song_id ? localStorage.getItem(`song_hw_${studentId}_${item.song_id}`) : null)
        ) : null;
        if (localHw === 'false') return;

        const isHw = (localHw === 'true') || (localHw !== 'false' && Boolean(item.is_current_homework));
        if (!isHw) return;

        const cleanTopic = getNormSong(item);
        const canKey = getCanKey(item);
        if (cleanTopic && !otherHWs.some(existing => getCanKey(existing) === canKey || getNormSong(existing) === cleanTopic)) {
          let cachedNote = '';
          if (studentId) {
            cachedNote = localStorage.getItem(`song_note_${studentId}_${item.id}`) ||
                         (item.song_id ? localStorage.getItem(`song_note_${studentId}_${item.song_id}`) : '') ||
                         item.homework_notes || '';
          } else {
            cachedNote = item.homework_notes || '';
          }
          otherHWs.push({
            ...item,
            topic_name: item.topic_name || item.title || cleanTopic,
            homework_notes: cachedNote
          });
        }
      }
    });

    // Also check activeSongSkills with localStorage backup for instant sync (strict per-student check)
    if (studentId) {
      (activeSongSkills || []).forEach(skill => {
        if (skill.user_id && String(skill.user_id) !== String(studentId)) return;
        if (skill.songs && skill.songs.is_campus_active === false) return;

        const skillId = skill.id;
        const songId = skill.song_id || skill.songs?.id;
        const localHw = localStorage.getItem(`song_hw_${studentId}_${skillId}`) ??
                        (songId ? localStorage.getItem(`song_hw_${studentId}_${songId}`) : null);

        const isHw = (localHw === 'true') || (localHw !== 'false' && Boolean(skill.is_current_homework));
        if (!isHw) return;

        const cleanTopic = getNormSong(skill);
        const canKey = getCanKey(skill);
        const alreadyExists = otherHWs.some(existing => 
          getCanKey(existing) === canKey || getNormSong(existing) === cleanTopic
        );
        if (!alreadyExists) {
          const songArtist = skill.songs?.artist || skill.artist || '';
          const songTitle = skill.songs?.title || skill.title || skill.song_title || 'Song';
          const songInstrument = skill.instrument ? ` (${skill.instrument})` : '';
          const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;
          const cachedNote = localStorage.getItem(`song_note_${studentId}_${skillId}`) ||
                             (songId ? localStorage.getItem(`song_note_${studentId}_${songId}`) : '') ||
                             skill.homework_notes || '';
          otherHWs.push({
            id: skill.id,
            song_id: songId,
            topic_name: fullTitle,
            is_current_homework: true,
            status: 'IN_PROGRESS',
            homework_notes: cachedNote
          });
        }
      });
    }

    const lehrwerkeList = Object.entries(groupedLehrwerke).map(([title, info]) => {
      info.pages.sort((a: number, b: number) => a - b);
      return { title, pages: info.pages };
    });

    // Gather all Notes & Audio Play-Alongs
    const allNotesList: string[] = [];
    (progressItems || []).forEach(item => {
      if (item.homework_notes && item.homework_notes.trim()) {
        try {
          const raw = item.homework_notes;
          if (raw.startsWith('[') && raw.endsWith(']')) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach((n: string) => {
                if (n && n.trim() && !allNotesList.includes(n.trim())) {
                  allNotesList.push(n.trim());
                }
              });
            }
          } else {
            const lines = raw.split('\n').filter(Boolean);
            lines.forEach((l: string) => {
              if (l && !allNotesList.includes(l.trim())) {
                allNotesList.push(l.trim());
              }
            });
          }
        } catch {}
      }
    });

    try {
      if (studentId) {
        const cachedHwStr = localStorage.getItem(`campus_homework_notes_${studentId}`);
        if (cachedHwStr) {
          if (cachedHwStr.startsWith('[') && cachedHwStr.endsWith(']')) {
            const parsed = JSON.parse(cachedHwStr);
            if (Array.isArray(parsed)) {
              parsed.forEach((n: string) => {
                if (n && n.trim() && !allNotesList.includes(n.trim())) {
                  allNotesList.push(n.trim());
                }
              });
            }
          } else {
            if (!allNotesList.includes(cachedHwStr.trim())) {
              allNotesList.push(cachedHwStr.trim());
            }
          }
        }
      }
    } catch {}

    const notesList = compressed ? [] : allNotesList;
    const audioNotes = notesList.filter(note => (note || '').trim().startsWith("AUDIO:"));
    const filteredTextNotes = notesList.filter(note => {
      const t = (note || '').trim();
      return !t.startsWith("AUDIO:") && !t.includes("STICKER:") && !t.includes("LATENCY:");
    });

    const hasAnyHWItems = lehrwerkeList.length > 0 || otherHWs.length > 0 || audioNotes.length > 0 || filteredTextNotes.length > 0;

    if (!hasAnyHWItems) {
      return (
        <div style={{
          padding: '16px 12px',
          background: '#ffffff',
          borderRadius: '14px',
          border: '1.5px dashed #cbd5e1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          textAlign: 'center',
          boxSizing: 'border-box'
        }}>
          <span style={{ fontSize: '1.1rem' }}>📖</span>
          <span style={{ fontSize: '0.80rem', color: '#64748b', fontWeight: 650 }}>
            Noch keine Aufgaben für KW {currentKw} erfasst.
          </span>
        </div>
      );
    }

    return (
      <div style={{
        borderRadius: '20px',
        background: '#ffffff',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Preview Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '7px',
              background: '#34a853',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(52, 168, 83, 0.25)'
            }}>
              <Calendar size={13} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Schülervorschau (KW {currentKw})
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '2px 0' }}>
          {/* Lehrwerke Books */}
          {lehrwerkeList.map((item, idx) => {
            const bookColor = getLehrwerkColor(item.title, lehrwerke);
            const bookObj = lehrwerke.find(b => b.title === item.title);
            const assignedBook = bookObj ? (localProgress || []).find((a: any) => 
              (String(a.lehrwerkId) === String(bookObj.id) || String(a.lehrwerk_id) === String(bookObj.id)) && 
              (!studentId || String(a.studentId || a.student_id) === String(studentId))
            ) : null;

            const pagesWithNotes = assignedBook ? item.pages.filter((p: number) => {
              const pState = assignedBook.pageStates?.[p];
              if (pState && cleanPageNotesText(pState.homeworkNotes || pState.homework_notes) !== '') return true;
              const dbItem = allActive.find(x => x.topic_name === `${item.title} - Seite ${p}`);
              if (dbItem && cleanPageNotesText(dbItem.homework_notes) !== '') return true;
              return false;
            }) : [];

            return (
              <div key={`lw-${idx}`} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                paddingBottom: idx < lehrwerkeList.length - 1 || otherHWs.length > 0 ? '10px' : '0',
                borderBottom: idx < lehrwerkeList.length - 1 || otherHWs.length > 0 ? '1px solid rgba(0, 0, 0, 0.06)' : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <div style={{
                      width: '26px',
                      height: '30px',
                      background: `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})`,
                      borderRadius: '6px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
                      color: bookColor.text
                    }}>
                      <BookOpen size={13} color={bookColor.text} />
                    </div>
                    <span style={{
                      fontSize: '0.90rem',
                      fontWeight: 850,
                      color: '#0f172a',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.title}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {/* Granular Page Badges */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {item.pages.map((p: number) => (
                        <span key={`p-pill-${p}`} style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: '#15803d',
                          background: '#dcfce7',
                          padding: '3px 8px',
                          borderRadius: '99px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          S. {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Specific Page Notes (Frameless Editorial Flow) */}
                {!compressed && pagesWithNotes.map((p: number) => {
                  const pState = assignedBook?.pageStates?.[p];
                  let noteText = cleanPageNotesText(pState?.homeworkNotes || pState?.homework_notes);
                  if (!noteText) {
                    const dbItem = allActive.find(x => x.topic_name === `${item.title} - Seite ${p}`);
                    if (dbItem?.homework_notes) {
                      noteText = cleanPageNotesText(dbItem.homework_notes);
                    }
                  }

                  return (
                    <div key={`p-note-${p}`} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      fontSize: '0.78rem',
                      padding: '2px 0',
                      marginLeft: '36px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', minWidth: 0 }}>
                        <span style={{ fontWeight: 850, color: '#e11d48', flexShrink: 0 }}>S. {p}:</span>
                        <span style={{ fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {noteText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Songs List */}
          {otherHWs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {otherHWs.map((item, idx) => {
                const songNote = cleanPageNotesText(item.homework_notes);
                return (
                  <div key={`song-hw-${idx}`} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    paddingBottom: idx < otherHWs.length - 1 ? '10px' : '0',
                    borderBottom: idx < otherHWs.length - 1 ? '1px solid rgba(0, 0, 0, 0.06)' : 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#4338ca',
                          flexShrink: 0
                        }}>
                          <Music size={13} strokeWidth={2.4} />
                        </div>
                        <span style={{
                          fontSize: '0.90rem',
                          fontWeight: 850,
                          color: '#0f172a',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {(item.topic_name || item.title || '').replace(/\s*\([^)]*\)\s*$/, '')}
                        </span>
                      </div>
                    </div>

                    {/* Specific Song Practice Note (Frameless Editorial Flow) */}
                    {!compressed && songNote ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '6px',
                        fontSize: '0.78rem',
                        padding: '2px 0',
                        marginLeft: '36px'
                      }}>
                        <span style={{ fontWeight: 850, color: '#4f46e5', flexShrink: 0 }}>📌 Fahrplan:</span>
                        <span style={{ fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {songNote}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {/* Audio Badges in Live Preview */}
          {!compressed && audioNotes.length > 0 && (
            <div style={{ paddingTop: '2px', width: '100%', boxSizing: 'border-box' }}>
              <AudioTrackCarousel
                tracks={audioNotes.map((note, aIdx) => {
                  const parts = (note || '').trim().substring(6).split('|');
                  return {
                    url: parts[0],
                    duration: parseInt(parts[1] || '0', 10),
                    label: parts[3] || 'Aufnahme',
                    originalIdx: aIdx,
                    idx: aIdx
                  };
                })}
                readOnly={true}
              />
            </div>
          )}

          {/* Compact Note Indicator in Live Preview */}
          {!compressed && filteredTextNotes.length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              borderTop: (lehrwerkeList.length > 0 || otherHWs.length > 0 || audioNotes.length > 0) ? '1px dashed #e2e8f0' : 'none',
              paddingTop: (lehrwerkeList.length > 0 || otherHWs.length > 0 || audioNotes.length > 0) ? '6px' : 0
            }}>
              {filteredTextNotes.map((note, idx) => {
                const trimmed = (note || '').trim();
                const isPublic = trimmed.includes('STUDENT_NOTE_PUBLIC:');
                const isPrivate = trimmed.includes('STUDENT_NOTE_PRIVATE:');

                let cleanText = trimmed;
                if (isPublic || isPrivate) {
                  if (cleanText.includes('|')) {
                    cleanText = cleanText.split('|').slice(1).join('|');
                  } else {
                    cleanText = cleanText.replace(/STUDENT_NOTE_PUBLIC:[^\s]*/gi, '').replace(/STUDENT_NOTE_PRIVATE:[^\s]*/gi, '');
                  }
                }
                cleanText = cleanText.replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
                if (!cleanText) return null;

                if (isPublic) {
                  return (
                    <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.78rem', color: '#166534', fontWeight: 750, background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '5px 10px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.85rem' }}>💬</span>
                      <span>Frage: {cleanText}</span>
                    </div>
                  );
                }

                if (isPrivate) {
                  return (
                    <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.78rem', color: '#dc2626', fontWeight: 750, background: '#fef2f2', border: '1px solid #fecaca', padding: '5px 10px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.85rem' }}>🔒</span>
                      <span>Notiz: {cleanText}</span>
                    </div>
                  );
                }

                return (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '2px 0',
                    fontSize: '0.78rem'
                  }}>
                    <FileText size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <span style={{ fontWeight: 850, color: '#15803d', flexShrink: 0 }}>Hinweis:</span>
                    <span style={{ color: '#334155', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {cleanText}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLessonInfoCard = (lesson: any, isToday: boolean, nextLesson?: any) => {
    const teacherObj = lesson?.teacher || lesson?.schedule?.teacher || teachers.find(t => t.id === lesson?.teacher_id || t.id === lesson?.schedule?.teacher_id);
    const teacherFullName = formatTeacherFullName(teacherObj, (profile as any)?.teacher_name);

    if (isToday && lesson) {
      return (
        <div style={{
          ...styles.card,
          padding: '16px',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#34a853', background: '#e6f4ea', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
              Heute Unterricht
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={16} color="#64748b" />
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                {lesson.start_time?.substring(0, 5)} Uhr ({lesson.duration || 45} Min)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={16} color="#64748b" />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>
                Mit {teacherFullName || 'deiner Lehrkraft'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin size={16} color="#64748b" />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>
                {lesson.room_name || (lesson.room && lesson.room.name) || 'Groovelab Raum'}
              </span>
            </div>
          </div>
        </div>
      );
    } else if (nextLesson) {
      const nextTeacherObj = nextLesson?.teacher || nextLesson?.occ?.teacher || nextLesson?.occ?.schedule?.teacher || teachers.find(t => t.id === nextLesson?.teacher_id || t.id === nextLesson?.occ?.teacher_id);
      const nextTeacherFullName = formatTeacherFullName(nextTeacherObj, (profile as any)?.teacher_name);
      const isShiftedPending = Boolean(nextLesson.needsAck);
      const isShiftedConfirmed = Boolean(!nextLesson.needsAck && (nextLesson.isRescheduled || nextLesson.occ?.status === 'rescheduled_confirmed'));
      const isPendingAdmin = Boolean(nextLesson.isPendingReview && !isShiftedPending && !isShiftedConfirmed);

      const isShifted = isShiftedPending || isShiftedConfirmed;
      const borderColor = isShiftedPending ? '1.5px dashed #eab308' : isPendingAdmin ? '1.5px dashed #eab308' : (styles.card ? styles.card.border : '1px solid #e2e8f0');
      const cardBg = isShiftedPending ? 'repeating-linear-gradient(-45deg, #fffbeb 0px, #fffbeb 8px, #ffffff 8px, #ffffff 16px)' : '#ffffff';

      return (
        <div style={{
          ...styles.card,
          padding: '16px',
          gap: '12px',
          border: borderColor,
          background: cardBg
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#34a853', background: '#e6f4ea', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
              Nächster Unterrichtstermin
            </span>
            {isShiftedPending ? (
              <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#b45309', background: '#fef3c7', border: '1px solid #fde047', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                🗓️ Termin verschoben (ausstehend)
              </span>
            ) : isShiftedConfirmed ? (
              <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#b45309', background: '#fef3c7', border: '1px solid #fde047', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                🗓️ Termin verschoben <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34a853', display: 'inline-block' }} />
              </span>
            ) : isPendingAdmin ? (
              <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#b45309', background: '#fef3c7', border: '1px solid #fde047', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                ⏳ In Prüfung
              </span>
            ) : null}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(() => {
              const origTime = (nextLesson.occ?.original_start_time || nextLesson.occ?.schedule?.time_slot || '').substring(0, 5);
              const newTime = (nextLesson.time || '').substring(0, 5);
              const hasTimeChanged = Boolean(origTime && newTime && origTime !== newTime);

              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Calendar size={16} color="#64748b" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                      {nextLesson.dateStr}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Clock size={16} color={hasTimeChanged || isShifted ? '#d97706' : '#64748b'} />
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b', display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      Start um {nextLesson.time ? nextLesson.time.substring(0, 5) : ''} Uhr
                      {hasTimeChanged && origTime && (
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>
                          (ursprünglich {origTime} Uhr)
                        </span>
                      )}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <User size={16} color="#64748b" />
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>
                      Mit {nextTeacherFullName || 'deiner Lehrkraft'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MapPin size={16} color="#64748b" />
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>
                      {nextLesson.room_name || (nextLesson.room && nextLesson.room.name) || 'Groovelab Raum'}
                    </span>
                  </div>
                </>
              );
            })()}

            {isShiftedPending ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                <div style={{ fontSize: '0.75rem', color: '#854d0e', fontWeight: 700, background: '#fef9c3', padding: '8px 10px', borderRadius: '8px', border: '1px solid #fef08a' }}>
                  Termin wurde verschoben. Bitte bestätige die neue Unterrichtszeit:
                </div>
                {nextLesson.occ && (
                  <button
                    type="button"
                    onClick={() => handleAcknowledgeOccurrence(nextLesson.occ)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: '#34a853',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 3px 10px rgba(52, 168, 83, 0.25)'
                    }}
                  >
                    <CheckCircle size={16} />
                    <span>Termin bestätigen</span>
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      );
    }
    return (
      <div style={{
        ...styles.card,
        padding: '16px',
        gap: '12px',
        border: '1px dashed #cbd5e1',
        background: '#f8fafc'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#64748b', background: '#e2e8f0', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
            Nächster Unterrichtstermin
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={16} color="#94a3b8" />
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b' }}>
              Terminierung ausstehend
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={16} color="#94a3b8" />
            <span style={{ fontSize: '0.88rem', fontWeight: 650, color: '#64748b' }}>
              Uhrzeit wird vom Sekretariat zugeteilt
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={16} color="#94a3b8" />
            <span style={{ fontSize: '0.88rem', fontWeight: 650, color: '#64748b' }}>
              Raumzuweisung ausstehend
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderSegmentedControl = () => {
    const isParentMode = profile?.app_usage_mode === 'parent_hybrid';
    const hasCampus = profile?.is_campus_active === true;
    return (
      <div style={{
        display: 'flex',
        background: 'rgba(118, 118, 128, 0.12)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '14px',
        padding: '3px',
        width: '100%',
        boxSizing: 'border-box',
        border: '1px solid rgba(0, 0, 0, 0.04)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
      }}>
        {hasCampus && (
          <button
            type="button"
            onClick={() => setActiveTab('action')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              borderRadius: '11px',
              background: activeTab === 'action' ? '#ffffff' : 'transparent',
              color: activeTab === 'action' ? '#000000' : '#636366',
              fontSize: '0.85rem',
              fontWeight: activeTab === 'action' ? 700 : 550,
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: activeTab === 'action' ? '0px 3px 8px rgba(0,0,0,0.12), 0px 3px 1px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.04)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {isParentMode ? 'Schnell-Eingabe' : <><Timer size={14} style={{ marginRight: 4 }} /> Üben</>}
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab('homework')}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: 'none',
            borderRadius: '11px',
            background: activeTab === 'homework' ? '#ffffff' : 'transparent',
            color: activeTab === 'homework' ? '#000000' : '#636366',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'homework' ? 700 : 550,
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: activeTab === 'homework' ? '0px 3px 8px rgba(0,0,0,0.12), 0px 3px 1px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.04)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <><BookOpen size={14} style={{ marginRight: 4 }} /> Hausaufgaben</>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('lessons')}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: 'none',
            borderRadius: '11px',
            background: activeTab === 'lessons' ? '#ffffff' : 'transparent',
            color: activeTab === 'lessons' ? '#000000' : '#636366',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'lessons' ? 700 : 550,
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: activeTab === 'lessons' ? '0px 3px 8px rgba(0,0,0,0.12), 0px 3px 1px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.04)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            position: 'relative'
          }}
        >
          <Calendar size={14} style={{ marginRight: 6 }} />
          <span>Termine</span>
          {(() => {
            const pendingCount = occurrences.filter(occ => {
              const isRescheduled = occ.status === 'pending_reschedule' || occ.status === 'rescheduled_confirmed';
              const isCanceled = occ.status === 'cancelled' || occ.status === 'canceled_by_student' || occ.status === 'teacher_sick' || occ.status === 'canceled_by_teacher_sick';
              const needsAck = occ.student_acknowledged === false && (isRescheduled || isCanceled || occ.original_date);
              const hasUnreadMsg = unreadMessageOccurrences.includes(occ.id);
              return needsAck || hasUnreadMsg;
            }).length;

            if (pendingCount === 0) return null;

            return (
              <span style={{
                minWidth: '16px',
                height: '16px',
                padding: '0 4px',
                borderRadius: '8px',
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '0.65rem',
                fontWeight: 900,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '2px',
                boxShadow: '0 1px 3px rgba(239, 68, 68, 0.4)',
                lineHeight: 1
              }}>
                {pendingCount}
              </span>
            );
          })()}
        </button>

        <button
          type="button"
          onClick={() => {
            setParentUnlockInput('');
            setParentUnlockError('');
            setParentSetupPin('');
            setParentSetupConfirm('');
            setParentSetupError('');
            setParentSetupStep('enter');
            setActiveTab('settings');
          }}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: 'none',
            borderRadius: '11px',
            background: activeTab === 'settings' ? '#ffffff' : 'transparent',
            color: activeTab === 'settings' ? '#0284c7' : '#636366',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'settings' ? 700 : 550,
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: activeTab === 'settings' ? '0px 3px 8px rgba(0,0,0,0.12), 0px 3px 1px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.04)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <ShieldCheck size={14} style={{ color: '#0284c7' }} />
          <span>Eltern</span>
        </button>
      </div>
    );
  };

  const renderParentSettingsWidget = () => {
    // 1. Gated Access: If not unlocked, render the 6-digit Master PIN Gatekeeper or Initial Setup
    if (!parentUnlocked) {
      const hasConfiguredParentPin = Boolean(
        profile?.has_parent_pin === true ||
        (profile?.parent_pin && String(profile.parent_pin).trim() !== '') ||
        (profile && localStorage.getItem(`groovelab_parent_pin_${profile.id}`))
      );

      return (
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '28px',
          padding: '32px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '16px',
          boxShadow: '0 8px 30px -4px rgba(0,0,0,0.06)',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Blue Shield Icon */}
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 8px 20px -4px rgba(2, 132, 199, 0.4)'
          }}>
            <ShieldCheck size={30} />
          </div>

          <div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
              {hasConfiguredParentPin
                ? 'Eltern-Master-PIN eingeben'
                : '6-stellige Eltern-Master-PIN festlegen'}
            </h4>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', fontWeight: 600, lineHeight: 1.4, maxWidth: '300px' }}>
              {hasConfiguredParentPin
                ? 'Dieser Bereich ist für Erziehungsberechtigte geschützt. Bitte gib deine 6-stellige Master-PIN ein.'
                : 'Als Erziehungsberechtigte(r) legst du hier deine 6-stellige Master-PIN fest, um Einstellungen und Freigaben zu steuern.'}
            </p>
          </div>

          {/* Error Message */}
          {(parentUnlockError || parentSetupError) && (
            <div style={{
              padding: '8px 14px',
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '12px',
              color: '#dc2626',
              fontSize: '0.76rem',
              fontWeight: 700
            }}>
              {parentUnlockError || parentSetupError}
            </div>
          )}

          {/* 6 Dots Indicator */}
          <div style={{ display: 'flex', gap: '12px', margin: '4px 0 8px 0' }}>
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const activeLen = hasConfiguredParentPin
                ? parentUnlockInput.length
                : (parentSetupStep === 'enter' ? parentSetupPin.length : parentSetupConfirm.length);
              return (
                <div
                  key={idx}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: `2px solid ${activeLen > idx ? '#0284c7' : '#cbd5e1'}`,
                    background: activeLen > idx ? '#0284c7' : 'transparent',
                    transition: 'all 0.15s ease'
                  }}
                />
              );
            })}
          </div>

          {!hasConfiguredParentPin && (
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {parentSetupStep === 'enter' ? 'Schritt 1 von 2: PIN wählen' : 'Schritt 2 von 2: PIN bestätigen'}
            </span>
          )}

          {/* 3x4 Touch Keypad */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            width: '100%',
            maxWidth: '300px'
          }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'back'].map((key) => {
              const isSpecial = key === 'C' || key === 'back';
              return (
                <button
                  key={key}
                  type="button"
                  onClick={async () => {
                    setParentUnlockError('');
                    setParentSetupError('');

                    if (hasConfiguredParentPin) {
                      // Unlock Existing Parent PIN
                      if (key === 'C') {
                        setParentUnlockInput('');
                      } else if (key === 'back') {
                        setParentUnlockInput(prev => prev.slice(0, -1));
                      } else if (parentUnlockInput.length < 6) {
                        const nextVal = parentUnlockInput + key;
                        setParentUnlockInput(nextVal);
                        if (nextVal.length === 6 && profile) {
                          const isOk = await verifyParentPinClient(profile.id, nextVal.trim(), profile.parent_pin);
                          if (isOk) {
                            localStorage.setItem(`groovelab_parent_pin_${profile.id}`, nextVal.trim());
                            setParentUnlocked(true);
                            setParentUnlockInput('');
                          } else {
                            setParentUnlockError('Falsche Eltern-Master-PIN.');
                            setParentUnlockInput('');
                          }
                        }
                      }
                    } else {
                      // Setup New 6-Digit Parent PIN
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
                        // Confirm step
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

                            if (!profile) return;

                            // Save 6-digit Parent PIN in DB & local backup
                            try {
                              localStorage.setItem(`groovelab_parent_pin_${profile.id}`, nextVal);
                              await supabase.from('users').update({ parent_pin: nextVal, has_parent_pin: true }).eq('id', profile.id);
                              try { await supabase.from('students').update({ parent_pin: nextVal, has_parent_pin: true }).eq('id', profile.id); } catch(err){}
                              
                              setProfile(prev => prev ? { ...prev, parent_pin: nextVal, has_parent_pin: true } : null);
                              setParentUnlocked(true);
                              setParentSetupPin('');
                              setParentSetupConfirm('');
                              setParentSetupStep('enter');
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
                    background: isSpecial ? '#f8fafc' : '#ffffff',
                    color: '#0f172a',
                    fontSize: isSpecial ? '0.85rem' : '1.25rem',
                    fontWeight: 800,
                    cursor: 'pointer',
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
        </div>
      );
    }

    // 2. Unlocked Control Center with Draft Changes & Step-Up PIN Confirmation
    const effectiveUiLevel = draftUiLevel ?? profile?.campus_ui_level ?? 'junior';
    const effectiveAllowAbsences = draftAllowAbsences ?? profile?.parent_allow_absences ?? false;
    const effectiveAllowChat = draftAllowChat ?? profile?.parent_allow_chat ?? true;
    const effectiveAllowLeaderboard = draftAllowLeaderboard ?? profile?.parent_allow_leaderboard ?? true;

    const hasUnsavedSettings = Boolean(
      (draftUiLevel !== null && draftUiLevel !== (profile?.campus_ui_level ?? 'junior')) ||
      (draftAllowAbsences !== null && draftAllowAbsences !== (profile?.parent_allow_absences ?? false)) ||
      (draftAllowChat !== null && draftAllowChat !== (profile?.parent_allow_chat ?? true)) ||
      (draftAllowLeaderboard !== null && draftAllowLeaderboard !== (profile?.parent_allow_leaderboard ?? true))
    );

    return (
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 4px 16px -2px rgba(0,0,0,0.05)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 10px rgba(2, 132, 199, 0.3)'
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Eltern-Kontrollzentrum 🛡️
              </h4>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                Schutz- &amp; Freigabefunktionen für {profile?.first_name || 'dein Kind'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setParentUnlocked(false);
              sessionStorage.removeItem(`groovelab_parent_unlocked_${profile?.id}`);
              sessionStorage.removeItem(`groovelab_parent_session_${profile?.id}`);
              setDraftUiLevel(null);
              setDraftAllowAbsences(null);
              setDraftAllowChat(null);
              setDraftAllowLeaderboard(null);
              setActiveTab(profile?.is_campus_active ? 'action' : 'homework');
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#64748b',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🔒 Sperren & Beenden
          </button>
        </div>

        {/* 🎨 Campus UI Design Switcher (Junior, Teen, +16) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          padding: '16px',
          borderRadius: '16px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          textAlign: 'left'
        }}>
          <div>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
              🎨 App-Design & Altersstufe (Campus)
            </div>
            <div style={{ fontSize: '0.73rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
              Legt fest, welche Benutzeroberfläche und Funktionen dein Kind in der Web-App sieht.
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            background: '#e2e8f0',
            padding: '4px',
            borderRadius: '12px'
          }}>
            {[
              { id: 'junior', label: 'Junior', age: '6–10 J.' },
              { id: 'teen', label: 'Teen', age: '11–15 J.' },
              { id: 'pro', label: '+16 / Pro', age: 'Ab 16 J.' }
            ].map((lvl) => {
              const active = effectiveUiLevel === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setDraftUiLevel(lvl.id)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '10px',
                    border: 'none',
                    background: active ? '#ffffff' : 'transparent',
                    color: active ? '#0284c7' : '#64748b',
                    fontWeight: active ? 800 : 650,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    boxShadow: active ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{lvl.label}</span>
                  <span style={{ fontSize: '0.62rem', opacity: active ? 0.9 : 0.7 }}>{lvl.age}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
          {/* Toggle 1: Absences */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: '14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            cursor: 'pointer'
          }}>
            <div style={{ paddingRight: '12px', textAlign: 'left' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                Unterrichtsstunden selbstständig absagen
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, lineHeight: 1.3 }}>
                Erlaubt deinem Kind, bei Krankheit oder Verhinderung Termine eigenständig abzusagen.
              </div>
            </div>
            <input
              type="checkbox"
              checked={effectiveAllowAbsences}
              onChange={(e) => setDraftAllowAbsences(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: '#0284c7', cursor: 'pointer' }}
            />
          </label>

          {/* Toggle 2: Chat */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: '14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            cursor: 'pointer'
          }}>
            <div style={{ paddingRight: '12px', textAlign: 'left' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                Direktnachrichten an Lehrkräfte schreiben
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, lineHeight: 1.3 }}>
                Erlaubt deinem Kind, im Chat Nachrichten und Fragen zu Hausaufgaben zu senden.
              </div>
            </div>
            <input
              type="checkbox"
              checked={effectiveAllowChat}
              onChange={(e) => setDraftAllowChat(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: '#0284c7', cursor: 'pointer' }}
            />
          </label>

          {/* Toggle 3: Leaderboard */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: '14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            cursor: 'pointer'
          }}>
            <div style={{ paddingRight: '12px', textAlign: 'left' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                🏆 Klassen-Highlights &amp; Team-Power
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, lineHeight: 1.3 }}>
                Gemeinsame Übe-Minuten sammeln, Meilensteine der Klasse feiern und Team-Ziele erreichen.
              </div>
            </div>
            <input
              type="checkbox"
              checked={effectiveAllowLeaderboard}
              onChange={(e) => setDraftAllowLeaderboard(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: '#0284c7', cursor: 'pointer' }}
            />
          </label>
        </div>

        {/* 🔒 Step-Up Confirmation Box (shown when settings have been changed) */}
        {hasUnsavedSettings && (
          <div style={{
            marginTop: '4px',
            padding: '14px 16px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1.5px solid #bfdbfe',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#0284c7" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e3a8a' }}>
                  Ungespeicherte Änderungen
                </div>
                <div style={{ fontSize: '0.73rem', color: '#1e40af', fontWeight: 500 }}>
                  Gib deine 6-stellige Master-PIN ein, um diese Einstellungen verbindlich zu speichern.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setSavePinInput('');
                  setSavePinError(null);
                  setShowSavePinModal(true);
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Lock size={15} />
                <span>Mit Master-PIN speichern</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDraftUiLevel(null);
                  setDraftAllowAbsences(null);
                  setDraftAllowChat(null);
                  setDraftAllowLeaderboard(null);
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#64748b',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Verwerfen
              </button>
            </div>
          </div>
        )}

        {/* 🔢 Step-Up PIN Modal Dialog */}
        {showSavePinModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px 20px',
              maxWidth: '340px',
              width: '100%',
              boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '14px'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 6px 16px rgba(2, 132, 199, 0.35)'
              }}>
                <Lock size={24} />
              </div>

              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                  Master-PIN bestätigen
                </h3>
                <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 600, lineHeight: 1.35 }}>
                  Gib deine 6-stellige Eltern-PIN ein, um die neuen Einstellungen verbindlich zu aktivieren.
                </p>
              </div>

              {savePinError && (
                <div style={{
                  padding: '6px 12px',
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: '10px',
                  color: '#dc2626',
                  fontSize: '0.74rem',
                  fontWeight: 700
                }}>
                  {savePinError}
                </div>
              )}

              {/* 6 PIN Dots */}
              <div style={{ display: 'flex', gap: '10px', margin: '4px 0' }}>
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      border: `2px solid ${savePinInput.length > idx ? '#0284c7' : '#cbd5e1'}`,
                      background: savePinInput.length > idx ? '#0284c7' : 'transparent',
                      transition: 'all 0.15s ease'
                    }}
                  />
                ))}
              </div>

              {/* 3x4 Touch Keypad */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                width: '100%',
                maxWidth: '260px'
              }}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'back'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    disabled={savePinLoading}
                    onClick={async () => {
                      setSavePinError(null);
                      if (key === 'C') {
                        setSavePinInput('');
                      } else if (key === 'back') {
                        setSavePinInput(prev => prev.slice(0, -1));
                      } else if (savePinInput.length < 6) {
                        const nextVal = savePinInput + key;
                        setSavePinInput(nextVal);
                        if (nextVal.length === 6 && profile) {
                          setSavePinLoading(true);
                          try {
                            const isOk = await verifyParentPinClient(profile.id, nextVal.trim(), profile.parent_pin);
                            if (isOk) {
                              // Persist to Supabase
                              await supabase.from('users').update({
                                campus_ui_level: effectiveUiLevel,
                                app_usage_mode: effectiveUiLevel === 'junior' ? 'student_only' : (effectiveUiLevel === 'teen' ? 'teen' : 'adult'),
                                parent_allow_absences: effectiveAllowAbsences,
                                parent_allow_chat: effectiveAllowChat,
                                parent_allow_leaderboard: effectiveAllowLeaderboard
                              }).eq('id', profile.id);
                              try {
                                await supabase.from('students').update({
                                  campus_ui_level: effectiveUiLevel,
                                  parent_allow_absences: effectiveAllowAbsences,
                                  parent_allow_chat: effectiveAllowChat,
                                  parent_allow_leaderboard: effectiveAllowLeaderboard
                                }).eq('id', profile.id);
                              } catch(e) {}

                              // Save local states
                              localStorage.setItem('campus_student_ui_level', effectiveUiLevel);
                              localStorage.setItem(`groovelab_parent_allow_absences_${profile.id}`, String(effectiveAllowAbsences));
                              localStorage.setItem(`groovelab_parent_allow_chat_${profile.id}`, String(effectiveAllowChat));
                              localStorage.setItem(`groovelab_parent_allow_leaderboard_${profile.id}`, String(effectiveAllowLeaderboard));
                              window.dispatchEvent(new CustomEvent('campus_ui_level_changed', { detail: effectiveUiLevel }));

                              setProfile(prev => prev ? {
                                ...prev,
                                campus_ui_level: effectiveUiLevel,
                                parent_allow_absences: effectiveAllowAbsences,
                                parent_allow_chat: effectiveAllowChat,
                                parent_allow_leaderboard: effectiveAllowLeaderboard
                              } : null);

                              // Reset drafts
                              setDraftUiLevel(null);
                              setDraftAllowAbsences(null);
                              setDraftAllowChat(null);
                              setDraftAllowLeaderboard(null);

                              setShowSavePinModal(false);
                              setSavePinInput('');
                              showToastMsg('✅ Einstellungen dauerhaft gespeichert!');
                            } else {
                              setSavePinError('Falsche Eltern-Master-PIN.');
                              setSavePinInput('');
                            }
                          } catch(err: any) {
                            setSavePinError('Fehler: ' + (err.message || 'Konnte nicht gespeichert werden'));
                          } finally {
                            setSavePinLoading(false);
                          }
                        }
                      }
                    }}
                    style={{
                      padding: '12px 0',
                      fontSize: key === 'back' || key === 'C' ? '0.85rem' : '1.25rem',
                      fontWeight: 800,
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      background: key === 'back' || key === 'C' ? '#f1f5f9' : '#f8fafc',
                      color: '#0f172a',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {key === 'back' ? <Delete size={18} /> : key}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSavePinModal(false);
                  setSavePinInput('');
                  setSavePinError(null);
                }}
                style={{
                  marginTop: '4px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'transparent',
                  color: '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPracticeLoggedDone = () => {
    const isGoalMet = loggedMinutesToday >= dailyGoal;

    return (
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '28px',
        padding: '28px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Animated Progress Ring Container */}
        <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Canvas for Particle Explosion */}
          <canvas
            ref={canvasRef}
            width={320}
            height={320}
            style={{
              position: 'absolute',
              top: '-80px',
              left: '-80px',
              width: '320px',
              height: '320px',
              pointerEvents: 'none',
              zIndex: 10
            }}
          />

          {/* SVG circular progress bar */}
          <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
            {/* Background Track */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth="8"
            />
            {/* Foreground Progress */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="transparent"
              stroke="url(#progressGrad)"
              strokeWidth="8"
              strokeDasharray="439.82"
              strokeDashoffset={439.82 - 439.82 * ringProgress}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            />
            <defs>
              <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34a853" />
                <stop offset="100%" stopColor="#34a853" />
              </linearGradient>
            </defs>
          </svg>

          {/* Flame Icon & Streak Count in Center */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5
          }}>
            <Flame
              size={36}
              color="#ea580c"
              fill="#ea580c"
              style={{
                filter: 'drop-shadow(0 2px 8px rgba(234, 88, 12, 0.35))',
                transform: 'scale(1)',
                animation: 'pulse 2s infinite ease-in-out'
              }}
            />
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '2px', lineHeight: 1 }}>
              {stats?.streak_flame || avatar?.streak_flame || 0}
            </span>
            <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '1px' }}>
              {(stats?.streak_flame || avatar?.streak_flame || 0) === 1 ? 'Tag Streak' : 'Tage Streak'}
            </span>
          </div>
        </div>

        {/* Text descriptions */}
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#34a853' }}>
            {isGoalMet ? 'Tagesziel erreicht!' : 'Übung eingetragen!'}
          </h3>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#0f172a', fontWeight: 650, lineHeight: 1.4 }}>
            Heute geübt: <strong style={{ color: '#34a853', fontSize: '0.95rem' }}>{loggedMinutesToday} Min.</strong> {isGoalMet && '(Tagesziel erfüllt ✓)'}
          </p>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 650, lineHeight: 1.4 }}>
            {isGoalMet 
              ? 'Hervorragend! Dein Streak ist gesichert. Jede weitere Minute wird als Extra-Übezeit gutgeschrieben! ✨' 
              : 'Super! Jede Minute zählt. Dein täglicher Streak ist für heute gesichert! 🔥'}
          </p>
        </div>

        {/* Multi-Session Re-Practice Button */}
        <button
          type="button"
          onClick={() => {
            setPracticeLoggedToday(false);
            setElapsedSeconds(0);
            setTimerRunning(false);
            setIsExtraTime(false);
          }}
          style={{
            marginTop: '4px',
            padding: '14px 20px',
            borderRadius: '16px',
            border: 'none',
            background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
            color: '#ffffff',
            fontSize: '0.88rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(234, 179, 8, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            transition: 'transform 0.15s ease'
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Sparkles size={16} color="#ffffff" />
          Noch eine Session einlegen (Bonus-Zeit sammeln)
        </button>
      </div>
    );
  };

  // ── Render: Loading ───────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div style={styles.fullScreen}>
        <div style={styles.loadingDot} />
        <p style={{ color: '#94a3b8', fontWeight: 600, marginTop: '16px', fontSize: '0.9rem' }}>
          Lade...
        </p>
      </div>
    );
  }

  // ── Render: Error ─────────────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <div style={styles.fullScreen}>
        <div style={{ ...styles.card, maxWidth: '340px', textAlign: 'center', gap: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <AlertTriangle size={32} color="#ef4444" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Ungültiger Code</h2>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>{errorMsg}</p>
          </div>
          <div style={styles.brandFooter}>
            <Music size={14} color="#eab308" />
            <span>Campus-Groovelab</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: PIN Required ──────────────────────────────────────────────────
  if (pageState === 'pin_required') {
    const blocked = pinAttempts >= MAX_ATTEMPTS;
    const activeThemeColor = isParentPinMode ? '#0284c7' : '#34a853';
    const numDots = isParentPinMode ? 6 : (pinPurpose === 'setup_initial_pin' ? 4 : (pinInput.length > 4 ? 6 : 4));

    return (
      <div style={styles.fullScreen}>
        <div style={{ ...styles.card, maxWidth: numDots === 6 ? '390px' : '360px', gap: '24px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '18px',
              background: isParentPinMode ? '#e0f2fe' : '#e6f4ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto',
              boxShadow: isParentPinMode ? '0 4px 12px rgba(2, 132, 199, 0.15)' : 'none'
            }}>
              {isParentPinMode ? <ShieldCheck size={28} color="#0284c7" /> : <Lock size={28} color="#34a853" />}
            </div>
            {profile && (
              <h2 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 800, color: activeThemeColor }}>
                {isParentPinMode ? 'Erziehungsberechtigte' : 'Hallo!'}
              </h2>
            )}
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {pinPurpose === 'setup_initial_pin'
                ? 'Wähle deine 4-stellige PIN'
                : (isParentPinMode ? 'Eltern-Master-PIN eingeben' : 'Sicherheits-PIN zum Einloggen')}
            </h1>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.84rem', color: '#64748b', lineHeight: 1.45 }}>
              {pinPurpose === 'setup_initial_pin'
                ? 'Willkommen in deiner Musikschule! 🎵 Wähle deine persönliche 4-stellige PIN, um dein digitales Hausaufgabenheft freizuschalten.'
                : (isParentPinMode
                  ? 'Gib deine 6-stellige Eltern-Master-PIN ein, um dich direkt mit vollen Rechten anzumelden.'
                  : 'Willkommen zurück! 🎵 Gib deine 4-stellige Schüler-PIN ein oder melde dich als Elternteil an.')}
            </p>
          </div>

          {/* Mode Switch Button (Parent / Student toggle) */}
          {pinPurpose !== 'setup_initial_pin' && (
            <button
              type="button"
              onClick={() => {
                setIsParentPinMode(!isParentPinMode);
                setPinInput('');
                setPinError(null);
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '12px',
                border: `1px solid ${isParentPinMode ? '#dcfce7' : '#e0f2fe'}`,
                background: isParentPinMode ? '#f0fdf4' : '#f0f9ff',
                color: isParentPinMode ? '#16a34a' : '#0284c7',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              {isParentPinMode ? (
                <>
                  <User size={15} />
                  <span>Als Schüler anmelden (4-stellige PIN)</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={15} />
                  <span>Als Elternteil anmelden (6-stellige Master-PIN)</span>
                </>
              )}
            </button>
          )}

          {/* PIN Display (Dynamic 4 or 6 boxes) */}
          <div style={{ display: 'flex', gap: numDots === 6 ? '8px' : '12px', justifyContent: 'center' }}>
            {Array.from({ length: numDots }).map((_, i) => (
              <div key={i} style={{
                width: numDots === 6 ? '44px' : '56px',
                height: numDots === 6 ? '54px' : '64px',
                borderRadius: '16px',
                background: '#f8fafc',
                border: `2px solid ${pinInput.length > i ? activeThemeColor : '#e2e8f0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: numDots === 6 ? '1.5rem' : '1.8rem',
                fontWeight: 900,
                color: '#0f172a',
                transition: 'all 0.15s ease',
                boxShadow: pinInput.length > i ? `0 0 0 4px ${isParentPinMode ? 'rgba(2, 132, 199, 0.12)' : 'rgba(52, 168, 83, 0.12)'}` : 'none'
              }}>
                {pinInput[i] ? '●' : ''}
              </div>
            ))}
          </div>

          {/* Error */}
          {pinError && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '0.82rem',
              color: '#dc2626',
              fontWeight: 700,
              textAlign: 'center'
            }}>
              {pinError}
            </div>
          )}

          {/* Numpad */}
          {!blocked && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map((key) => (
                <button
                  key={key}
                  disabled={pinLoading || !key}
                  onClick={() => {
                    if (key === '⌫') handlePinDelete();
                    else if (key === 'C') {
                      setPinInput('');
                      setPinError(null);
                    }
                    else if (key) handlePinDigit(key);
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    border: 'none',
                    background: key === '⌫' ? '#fee2e2' : key === 'C' ? '#f1f5f9' : '#f8fafc',
                    color: key === '⌫' ? '#ef4444' : '#0f172a',
                    fontSize: key === '⌫' ? '1.2rem' : '1.35rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'background 0.15s, transform 0.1s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: key === '⌫' ? '#fecaca' : '#e2e8f0'
                  }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
                  onMouseUp={e => e.currentTarget.style.transform = ''}
                >
                  {key}
                </button>
              ))}
            </div>
          )}

          {/* Loading Indicator */}
          {pinLoading && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '12px',
              borderRadius: '14px',
              background: isParentPinMode ? '#f0f9ff' : '#f0fdf4',
              border: `1px solid ${isParentPinMode ? '#bae6fd' : '#bbf7d0'}`,
              color: isParentPinMode ? '#0284c7' : '#16a34a',
              fontSize: '0.88rem',
              fontWeight: 800
            }}>
              <span style={styles.spinnerInline} />
              <span>{pinPurpose === 'setup_initial_pin' ? 'Speichere PIN...' : 'PIN wird überprüft & Anmeldung startet...'}</span>
            </div>
          )}

          {pinPurpose !== 'setup_initial_pin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <button
                type="button"
                onClick={() => setShowForgotPinInfo(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: activeThemeColor,
                  fontSize: '0.82rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  textDecoration: 'underline'
                }}
              >
                PIN vergessen?
              </button>

              <button
                disabled={pinLoading}
                onClick={() => {
                  setPageState('profile');
                  setPinInput('');
                  setPinError(null);
                }}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '16px',
                  border: 'none',
                  background: '#f1f5f9',
                  color: '#475569',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  cursor: pinLoading ? 'not-allowed' : 'pointer',
                  opacity: pinLoading ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <ArrowLeft size={16} /> Abbrechen
              </button>
            </div>
          )}

          {/* Forgot PIN Info Modal */}
          {showForgotPinInfo && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
                padding: '16px'
              }}
              onClick={() => setShowForgotPinInfo(false)}
            >
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '28px 24px',
                  maxWidth: '420px',
                  width: '100%',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  textAlign: 'center'
                }}
                onClick={e => e.stopPropagation()}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '18px',
                    background: '#e6f4ea',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto'
                  }}
                >
                  <Key size={28} color="#34a853" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                    PIN vergessen?
                  </h3>
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                    Aus Sicherheits- und Datenschutzgründen (DSGVO) kann deine <strong>Lehrkraft</strong> oder das <strong>Schulsekretariat</strong> deine PIN im nächsten Unterricht mit <strong>1 Klick zurücksetzen</strong> und dir sofort einen neuen Onboarding-Link senden.
                  </p>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                  💡 Dein bisheriger gedruckter QR-Code bleibt dabei zu 100% erhalten.
                </div>
                <button
                  onClick={() => setShowForgotPinInfo(false)}
                  style={{
                    background: '#34a853',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '12px',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  Verstanden
                </button>
              </div>
            </div>
          )}

          <div style={styles.brandFooter}>
            <Music size={14} color="#34a853" />
            <span>Campus-Groovelab</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Inactive Landing Page ──────────────────────────────────────────
  if (pageState === 'inactive_landing' && profile) {
    const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    
    // Calculate virtual next lesson if occurrences is empty
    const getVirtualNextLesson = () => {
      if (schedules.length === 0) return null;
      const sch = schedules[0];
      const dayOfWeek = sch.day_of_week;
      const today = getSimulatedNow();
      const currentDay = today.getDay() || 7;
      
      let diff = dayOfWeek - currentDay;
      if (diff <= 0) {
        diff += 7;
      }
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + diff);
      return {
        dateStr: nextDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
        time: sch.time_slot,
        isPendingReview: sch.status === 'ready_for_admin_review' && !sch.room?.name && !sch.room_id,
        room_name: sch.room?.name
      };
    };

    const nextLessonInfo = (() => {
      const simNow = getSimulatedNow();
      const todayStr = simNow.toLocaleDateString('sv-SE');
      const activeOccs = occurrences.filter(o => o.status !== 'cancelled' && o.status !== 'canceled_by_student' && o.status !== 'teacher_sick' && o.status !== 'canceled_by_teacher_sick');
      const upcomingOcc = activeOccs.find(o => o.date >= todayStr);
      if (upcomingOcc) {
        const d = new Date(upcomingOcc.date + 'T00:00:00');
        const isTimeShifted = Boolean(
          (upcomingOcc.original_start_time && upcomingOcc.start_time && upcomingOcc.original_start_time.substring(0, 5) !== upcomingOcc.start_time.substring(0, 5)) ||
          (upcomingOcc.schedule?.time_slot && upcomingOcc.start_time && upcomingOcc.schedule.time_slot.substring(0, 5) !== upcomingOcc.start_time.substring(0, 5))
        );
        const isDateShifted = Boolean(upcomingOcc.original_date && upcomingOcc.original_date !== upcomingOcc.date);
        const isRoomShifted = Boolean(upcomingOcc.room_override_id || upcomingOcc.room_override_name);
        const isRescheduled = upcomingOcc.status === 'pending_reschedule' || upcomingOcc.status === 'rescheduled_confirmed' || isTimeShifted || isDateShifted || isRoomShifted;

        const needsAck = upcomingOcc.student_acknowledged === false && isRescheduled;
        const roomName = upcomingOcc.room_override_name || upcomingOcc.room_name || upcomingOcc.schedule?.room?.name || upcomingOcc.room?.name;

        return {
          occ: upcomingOcc,
          dateStr: d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
          time: upcomingOcc.start_time || upcomingOcc.schedule?.time_slot,
          isPendingReview: upcomingOcc.schedule?.status === 'ready_for_admin_review' && !roomName && !upcomingOcc.schedule?.room_id,
          room_name: roomName,
          isRescheduled,
          needsAck
        };
      }
      return getVirtualNextLesson();
    })();

    const lessonDay = schedules.length > 0 ? schedules[0].day_of_week : 1;
    const latestItem = progressItems.find(item => item.is_current_homework || item.topic_name.startsWith('Hausaufgabe KW '));
    const latestWeek = latestItem ? getItemWeek(latestItem) : getISOWeek(undefined, lessonDay);
    const notesList = getHomeworkNotes(latestWeek);
    const activeHWs = progressItems
      .filter(item => item.is_current_homework && !item.topic_name.startsWith('Hausaufgabe KW '))
      .filter((item, index, self) => 
        self.findIndex(t => t.topic_name.trim() === item.topic_name.trim()) === index
      );

    const price = schoolData ? getDynamicAnnualPriceLocal(schoolData.contract_start_date, false) : 0;
    
    // Check if school allows direct parent/student activation
    const activationAllowed = schoolData && (
      schoolData.student_billing_option === 'option1' ||
      schoolData.student_billing_option === 'both' ||
      schoolData.student_billing_option === 'debit' ||
      schoolData.student_billing_option === 'cash' ||
      schoolData.student_billing_option === 'student_full' ||
      schoolData.student_billing_option === 'student_partial' ||
      !schoolData.student_billing_option
    );

    return (
      <div style={{...styles.fullScreen, background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '24px 16px', gap: '20px'}}>
        {/* Confetti canvas if success */}
        {activationStep === 'success' && <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10001, width: '100vw', height: '100vh' }} />}

        {/* Modal overlays for terms */}
        {showParentAgb && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '80vh',
              position: 'relative',
              color: '#1e293b',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <button 
                onClick={() => setShowParentAgb(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: '#f1f5f9',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 50
                }}
              >
                ✕
              </button>

              <div style={{
                overflowY: 'auto',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 800 }}>Nutzungsbedingungen</h3>
              <div style={{ fontSize: '13px', lineHeight: '1.6', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p><strong>Vertragspartner und Anbieter:</strong><br/>Patrick Huber (Einzelunternehmer), Karl-Fürstenberg-Str. 59, 79618 Rheinfelden, nachfolgend „Anbieter“</p>
                <p><strong>§ 1 LEISTUNGSUMFANG &amp; KOSTENFREIHEIT</strong><br/>Die Nutzung der App selbst ist für den Schüler bzw. die Eltern dauerhaft 100% kostenfrei. Die Bereitstellung erfolgt über das Internet im Wege eines Software-as-a-Service (SaaS)-Modells.</p>
                <p><strong>§ 2 ABRECHNUNG ÜBER DIE MUSIKSCHULE</strong><br/>Soweit für die Aktivierung oder den Betrieb des Profils Gebühren fällig werden, werden diese direkt über die Kooperations-Musikschule nach den dort vereinbarten Abrechnungswegen (z.B. Barzahlung oder Einzug mit der monatlichen Unterrichtsgebühr) erhoben. Es entstehen durch diese Nutzungsbedingungen keine unmittelbaren Zahlungsansprüche des Anbieters gegen den Schüler oder die Eltern.</p>
                <p><strong>§ 3 ZUGANGSSICHERHEIT & AUTOMATISCHE SPERRUNG</strong><br/>Gibt der Endnutzer dreimal hintereinander eine falsche PIN ein, wird das Benutzerkonto aus Sicherheitsgründen automatisch gesperrt. Eine Entsperrung ist dann nur über die Verwaltung der Musikschule möglich.</p>
              </div>
            </div>
          </div>
          </div>
        )}

        {showPrivacy && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '80vh',
              position: 'relative',
              color: '#1e293b',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <button 
                onClick={() => setShowPrivacy(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: '#f1f5f9',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 50
                }}
              >
                ✕
              </button>

              <div style={{
                overflowY: 'auto',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 800 }}>Datenschutzerklärung</h3>
              <div style={{ fontSize: '13px', lineHeight: '1.6', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p>Wir verarbeiten personenbezogene Daten unserer Nutzer stets unter Einhaltung der geltenden Datenschutzbestimmungen (DSGVO).</p>
                <p><strong>1. Datenverarbeitung beim QR-Code Scan:</strong><br/>Beim Scannen des QR-Codes werden temporär verbindungsspezifische Daten erhoben, um die Zuordnung zum Schülerprofil zu ermöglichen.</p>
                <p><strong>2. Geräteregistrierung (Device-Pairing):</strong><br/>Zur Vermeidung unbefugter Zugriffe wird ein eindeutiger Geräteschlüssel (UUID) im lokalen Speicher deines Browsers abgelegt und an unsere Datenbank übermittelt. Dies dient dem Schutz deiner personenbezogenen Lerndaten.</p>
              </div>
            </div>
          </div>
          </div>
        )}

        {activationStep === 'landing' && (
          <div style={{width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '20px'}}>
            {/* Header / Profile Card */}
            <div style={{...styles.card, padding: '24px 20px', gap: '16px', background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)', border: 'none', color: 'white', position: 'relative', overflow: 'hidden'}}>
              <div style={{position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%', pointerEvents: 'none'}} />
              <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                <div style={{width: '56px', height: '56px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255, 255, 255, 0.3)', flexShrink: 0, overflow: 'hidden'}}>
                  <img src={getInstrumentAvatarUrl(profile.instrument)} alt="" style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} />
                </div>
                <div style={{display: 'flex', flexDirection: 'column'}}>
                  <h2 style={{margin: 0, fontSize: '1.25rem', fontWeight: 900, textShadow: '0 1px 2px rgba(0,0,0,0.1)'}}>
                    Campus-Groovelab
                  </h2>
                  <span style={{fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600}}>
                    {profile.instrument || 'Schüler'} · {profile.school_name}
                  </span>
                </div>
              </div>
              <div style={{display: 'inline-flex', alignSelf: 'flex-start', background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                Profil Inaktiv
              </div>
            </div>

            {/* Main Info Box */}
            <div style={{...styles.card, padding: '24px', gap: '20px'}}>
              {/* Nächster Unterrichtstermin Section */}
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <h3 style={{margin: 0, fontSize: '0.9rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px'}}>
                  <Calendar size={16} color="#34a853" /> Nächster Unterrichtstermin
                </h3>
                {nextLessonInfo ? (
                  <div style={{fontSize: '0.95rem', color: '#1e293b', fontWeight: 700}}>
                    {nextLessonInfo.dateStr}
                    <div style={{fontSize: '0.85rem', color: '#34a853', fontWeight: 700, marginTop: '2px'}}>
                      Start um {nextLessonInfo.time ? nextLessonInfo.time.substring(0, 5) : ''} Uhr
                    </div>
                  </div>
                ) : schedules.length > 0 ? (
                  <div style={{fontSize: '0.95rem', color: '#1e293b', fontWeight: 700}}>
                    Jeden {dayNames[schedules[0].day_of_week - 1]} um {schedules[0].time_slot.substring(0, 5)} Uhr ({schedules[0].duration} Min.)
                  </div>
                ) : (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <Clock size={16} color="#34a853" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 700 }}>
                      Wird vom Musikschul-Stundenplaner eingeteilt
                    </span>
                  </div>
                )}
              </div>

              {/* Homework Section - Ultra-Compressed (Page numbers only) */}
              <div style={{borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <h3 style={{margin: 0, fontSize: '0.9rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px'}}>
                  <BookOpen size={16} color="#34a853" /> Deine Hausaufgaben
                </h3>
                {activeHWs.length > 0 ? (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {activeHWs.map((hw, i) => (
                      <div key={i} style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#1e293b', fontWeight: 750}}>
                        <Check size={16} color="#34a853" style={{flexShrink: 0}} />
                        <span>{hw.topic_name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{margin: 0, fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic', fontWeight: 550}}>Keine aktuellen Hausaufgaben erfasst</p>
                )}
              </div>

              {/* PIN-Geschützter Termine Tab Button */}
              <div style={{borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <button
                  type="button"
                  onClick={() => {
                    const hasExistingPin = Boolean(profile?.has_parent_pin || profile?.personal_pin || profile?.parent_pin || profile?.is_pin_activated);
                    if (profile && !hasExistingPin) {
                      setIsInitialPinSetup(true);
                      setParentPinErrorMsg(null);
                      setParentPinSuccessMsg(null);
                      setShowPinPrompt(true);
                    } else if (!lessonsUnlocked && !parentUnlocked) {
                      setIsInitialPinSetup(false);
                      setParentPinErrorMsg(null);
                      setParentPinSuccessMsg(null);
                      setShowPinPrompt(true);
                    } else {
                      setActiveTab('lessons');
                      setPageState('profile');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #34a853',
                    background: '#f0fdf4',
                    color: '#166534',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(52, 168, 83, 0.12)'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#dcfce7'}
                  onMouseOut={e => e.currentTarget.style.background = '#f0fdf4'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={18} color="#34a853" />
                    <span>Alle Termine, Absagen & Chat</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#166534', background: '#dcfce7', padding: '4px 8px', borderRadius: '6px', fontWeight: 900 }}>
                    <Lock size={12} color="#166534" />
                    <span>PIN-geschützt</span>
                  </div>
                </button>
              </div>

              {/* Transparent Passive Privacy Notice */}
              <div style={{
                marginTop: '16px',
                padding: '12px 14px',
                borderRadius: '14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <ShieldCheck size={18} color="#34a853" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.45, fontWeight: 500 }}>
                  <strong style={{ color: '#1e293b', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                    Datenschutzhinweis (Kostenfreie Leseansicht)
                  </strong>
                  Diese Ansicht dient der Übermittlung von Hausaufgaben und Unterrichtsterminen im Rahmen des Musikschulunterrichts (Art. 6 Abs. 1 lit. b DSGVO). Es werden keine Daten an Dritte weitergegeben. Die Nutzung interaktiver Zusatzfunktionen (Audio-Loopstation & Profilfunktionen) erfolgt nach digitaler Freischaltung durch die Erziehungsberechtigten.
                </div>
              </div>
            </div>

            {/* Minimalistic Upgrade Callout Button */}
            {activationAllowed && (
              <button
                type="button"
                onClick={() => setActivationStep('email')}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '16px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #34a853 0%, #288d45 100%)',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(52, 168, 83, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'transform 0.15s ease'
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Sparkles size={18} color="#ffffff" />
                <span>Campus aktivieren</span>
              </button>
            )}

            {/* PWA Install Prompt Card */}
            {renderPWAInstallCard()}
            {renderBiometricsModal()}

            {/* Activation callout or Notice */}
            {activationError && (
              <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '16px', color: '#991b1b', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} />
                <span>{activationError}</span>
              </div>
            )}

            {profile.is_campus_active ? (
              // ACTIVE STUDENT WIDGETS
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                {/* Level Roadmap & Fokus-Timer Mobile Card */}
                <div style={{...styles.card, padding: '20px', gap: '16px', border: '1.5px solid #bbf7d0', background: '#ffffff', color: '#0f172a', textAlign: 'center', borderRadius: '24px', boxShadow: '0 10px 25px rgba(52, 168, 83, 0.08)'}}>
                  
                  {/* Smartphone Level Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Award size={18} color="#ffffff" />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Übe-Pfad</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a' }}>Level 1: Übe-Pionier 🚀</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fef2f2', border: '1px solid #fecaca', padding: '4px 8px', borderRadius: '999px' }}>
                      <Flame size={14} fill="#ef4444" color="#ef4444" />
                      <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#dc2626' }}>{profile.streak_flame || 0} Tage</span>
                    </div>
                  </div>

                  {/* Stage Nodes Mini Roadmap for Smartphone */}
                  <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '4px 0' }}>
                    {[
                      { icon: '🚀', title: 'Start', active: true },
                      { icon: '⏱️', title: '30 Min', active: ((profile.total_practice_minutes || 0) >= 30) },
                      { icon: '🔥', title: '7 Tage', active: ((profile.streak_flame || 0) >= 7) },
                      { icon: '🏆', title: 'Level 2', active: ((profile.total_practice_minutes || 0) >= 100) }
                    ].map((stg, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{
                          width: '30px', height: '30px', borderRadius: '50%',
                          background: stg.active ? '#34a853' : '#f1f5f9',
                          border: stg.active ? '2px solid #ffffff' : '1px solid #e2e8f0',
                          color: stg.active ? '#ffffff' : '#64748b',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem'
                        }}>
                          {stg.icon}
                        </div>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: stg.active ? '#166534' : '#94a3b8' }}>
                          {stg.title}
                        </span>
                      </div>
                    ))}
                  </div>


                  <button
                    onClick={handleStartTimer}
                    style={{
                      width: '100%',
                      padding: '15px 20px',
                      borderRadius: '16px',
                      background: '#34a853',
                      color: 'white',
                      border: 'none',
                      fontWeight: 900,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(52, 168, 83, 0.35)',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Play size={18} fill="white" /> Übesitzung starten
                  </button>
                </div>


              </div>
            ) : (
              // INACTIVE STUDENT WIDGETS
              activationAllowed ? (
                <div style={{...styles.card, padding: '24px', gap: '16px', border: '1.5px solid #e6f4ea', background: '#e6f4ea', textAlign: 'center'}}>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                    <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#34a853'}}>Jetzt Campus testen</h3>
                    <p style={{margin: 0, fontSize: '0.85rem', color: '#34a853', lineHeight: 1.5, fontWeight: 550}}>
                      Schalte deinen Online-Campus mit Übe-Timer, Hausaufgaben, Statistiken und Badges für 7 Tage kostenlos frei!
                    </p>
                  </div>
                  <button
                    onClick={handleStartTrial}
                    disabled={activationLoading}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      borderRadius: '16px',
                      background: '#34a853',
                      color: 'white',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(52, 168, 83, 0.25)',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: activationLoading ? 0.7 : 1
                    }}
                  >
                    <Sparkles size={18} /> {activationLoading ? 'Wird gestartet...' : 'Jetzt 7 Tage kostenlos testen'}
                  </button>
                </div>
              ) : (
                <div style={{...styles.card, padding: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px'}}>
                  <Lock size={20} color="#64748b" style={{margin: '0 auto'}} />
                  <span style={{fontSize: '0.875rem', color: '#475569', fontWeight: 650}}>Campus wird durch Schule verwaltet</span>
                  <span style={{fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4}}>
                    Dein Campus-Profil wird in Kürze von deiner Musikschule freigeschaltet. Wende dich bei Fragen bitte an das Sekretariat.
                  </span>
                </div>
              )
            )}

            {/* Transparent Passive Privacy Notice */}
            <div style={{
              margin: '12px 0',
              padding: '12px 14px',
              borderRadius: '16px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              textAlign: 'left',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              <ShieldCheck size={18} color="#34a853" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.45, fontWeight: 500 }}>
                <strong style={{ color: '#1e293b', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                  Datenschutzhinweis (Kostenfreie Leseansicht)
                </strong>
                Diese Ansicht dient der Übermittlung von Hausaufgaben und Unterrichtsterminen im Rahmen des Musikschulunterrichts (Art. 6 Abs. 1 lit. b DSGVO). Es werden keine Daten an Dritte weitergegeben. Die Nutzung interaktiver Zusatzfunktionen (Audio-Loopstation & Profilfunktionen) erfolgt nach digitaler Freischaltung durch die Erziehungsberechtigten.
              </div>
            </div>

            <div style={styles.brandFooter}>
              <Music size={14} color="#34a853" />
              <span>Campus-Groovelab</span>
            </div>
          </div>
        )}

        {activationStep === 'email' && (
          <div style={{...styles.card, maxWidth: '400px', gap: '24px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <button 
                onClick={() => setActivationStep('landing')}
                style={{background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569'}}
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 style={{margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a'}}>Campus Aktivierung</h2>
                <span style={{fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase'}}>Schritt 1 von 2</span>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setActivationStep('payment'); }} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <p style={{margin: 0, fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, fontWeight: 550}}>
                Gib bitte die <strong>E-Mail-Adresse deiner Eltern</strong> ein. Dorthin senden wir alle Vertragsunterlagen und Infos zum Campus.
              </p>

              <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                <label style={{fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase'}}>E-Mail-Adresse der Eltern *</label>
                <div style={{position: 'relative'}}>
                  <Mail size={18} color="#94a3b8" style={{position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)'}} />
                  <input
                    type="email"
                    required
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="eltern@beispiel.de"
                    style={{
                      width: '100%',
                      padding: '14px 14px 14px 44px',
                      borderRadius: '14px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.95rem',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '16px',
                  background: '#34a853',
                  color: 'white',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(52, 168, 83, 0.25)',
                  marginTop: '8px'
                }}
              >
                Weiter
              </button>
            </form>
          </div>
        )}

        {activationStep === 'payment' && (
          <div style={{...styles.card, maxWidth: '400px', gap: '24px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <button 
                onClick={() => setActivationStep('email')}
                style={{background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569'}}
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 style={{margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a'}}>Gebühr & Rechtliches</h2>
                <span style={{fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase'}}>Schritt 2 von 2</span>
              </div>
            </div>

            <div style={{fontSize: '0.85rem', color: '#334155', lineHeight: '1.5', background: '#e6f4ea', padding: '16px', borderRadius: '16px', border: '1px solid #e6f4ea'}}>
              Die Aktivierung deines Schülerkontos erfordert die Begleichung der GrooveLab-Jahresgebühr für dieses Schuljahr.
              <div style={{ marginTop: '10px', fontWeight: 900, color: '#34a853', fontSize: '0.95rem' }}>
                Betrag: {price.toFixed(2).replace('.', ',')} € (einmalig für dieses Schuljahr)
              </div>
              <span style={{ fontSize: '0.7rem', color: '#34a853', display: 'block', marginTop: '6px', fontWeight: 550 }}>
                * Bisher wird diese Gebühr über die Schule abgerechnet. Direktzahlung der Eltern über Lastschrift/Kreditkarte wird zu einem späteren Zeitpunkt eingeführt.
              </span>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleActivateContract(); }} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              {/* Payment Methods Selector */}
              {(!schoolData?.student_billing_option || schoolData.student_billing_option === 'both' || schoolData.student_billing_option.startsWith('option')) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Zahlungsmethode wählen *</label>
                  
                  {/* Option 1: Abbuchung */}
                  <div 
                    onClick={() => setPaymentMethod('debit')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '14px',
                      border: paymentMethod === 'debit' ? '2.5px solid #34a853' : '1px solid #e2e8f0',
                      background: paymentMethod === 'debit' ? '#e6f4ea' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: '2px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {paymentMethod === 'debit' && (
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#34a853' }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                      <strong style={{ color: '#1e293b', fontSize: '0.85rem' }}>Mit der nächsten Unterrichtsgebühr abbuchen</strong>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px', lineHeight: '1.3' }}>
                        Die Gebühr wird bequem über deine bestehende Bankverbindung der Musikschule eingezogen.
                      </span>
                    </div>
                  </div>

                  {/* Option 2: Barzahlung */}
                  <div 
                    onClick={() => setPaymentMethod('cash')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '14px',
                      border: paymentMethod === 'cash' ? '2.5px solid #34a853' : '1px solid #e2e8f0',
                      background: paymentMethod === 'cash' ? '#e6f4ea' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: '2px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {paymentMethod === 'cash' && (
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#34a853' }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                      <strong style={{ color: '#1e293b', fontSize: '0.85rem' }}>Geld in bar mitbringen</strong>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px', lineHeight: '1.3' }}>
                        Bitte bringe den Betrag passend mit in den nächsten Unterricht und gib ihn der Lehrkraft.
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '14px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <strong style={{ display: 'block', fontSize: '0.85rem', color: '#1e293b', marginBottom: '4px' }}>
                    {schoolData.student_billing_option === 'debit' ? '💳 Abbuchung vereinbart' : '💵 Barzahlung vereinbart'}
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: '1.4' }}>
                    {schoolData.student_billing_option === 'debit' 
                      ? 'Diese Gebühr wird automatisch mit deiner nächsten monatlichen Unterrichtsgebühr über die Musikschule abgebucht.'
                      : 'Bitte bringe den Betrag passend bar zum nächsten Unterricht mit und gib ihn der Lehrkraft ab.'}
                  </span>
                </div>
              )}

              {/* Legal Confirmation Checkbox */}
              <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', marginTop: '4px', textAlign: 'left' }}>
                <input 
                  type="checkbox" 
                  required
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  style={{ accentColor: '#34a853', marginTop: '3px', cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ fontSize: '0.78rem', color: '#475569', lineHeight: '1.4' }}>
                  Ich bestätige, dass ich volljährig bin bzw. als Erziehungsberechtigter des Schülers handle, stimme den{' '}
                  <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowParentAgb(true); }} style={{ textDecoration: 'underline', color: '#34a853', cursor: 'pointer', fontWeight: 700 }}>AGB</span>{' '}
                  sowie der{' '}
                  <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPrivacy(true); }} style={{ textDecoration: 'underline', color: '#34a853', cursor: 'pointer', fontWeight: 700 }}>Datenschutzerklärung</span>{' '}
                  zu und willige in die zahlungspflichtige Aktivierung für das laufende Schuljahr über {
                    paymentMethod === 'debit' ? 'Abbuchung' : 'Barzahlung'
                  } ein.
                </span>
              </label>

              {activationError && (
                <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', fontSize: '0.8rem', color: '#dc2626', fontWeight: 700, textAlign: 'center' }}>
                  {activationError}
                </div>
              )}

              <button
                type="submit"
                disabled={activationLoading}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '16px',
                  background: '#34a853',
                  color: 'white',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(52, 168, 83, 0.25)',
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {activationLoading ? (
                  <>
                    <span style={styles.spinnerInline} /> Aktivierung läuft...
                  </>
                ) : (
                  <>Zahlungspflichtig aktivieren</>
                )}
              </button>
            </form>
          </div>
        )}

        {activationStep === 'success' && (
          <div style={{...styles.card, maxWidth: '380px', textAlign: 'center', gap: '24px', padding: '36px 24px'}}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#e6f4ea', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <CheckCircle size={36} color="#34a853" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>Erfolgreich aktiviert!</h2>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, fontWeight: 550 }}>
                Dein Campus-Profil wurde erfolgreich aktiviert. Du kannst den Campus ab sofort in vollem Umfang nutzen!
              </p>
            </div>
            <button
              onClick={() => { if (profile) redirectToCampus(profile); }}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                background: '#34a853',
                color: 'white',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(52, 168, 83, 0.25)',
              }}
            >
              Zum Campus Profil
            </button>
          </div>
        )}
      </div>
    );
  }

  if (pageState === 'profile' && profile) {


    // ── 2. Mitarbeiter- & Lehrer-Rollen (Native Mobile Wallet Pass) ─────────
    const rolesArray = Array.isArray(profile.roles) ? profile.roles : [];
    const isAdminOrSecretary = profile.role === 'admin' || profile.role === 'secretary' || rolesArray.includes('admin') || rolesArray.includes('secretary');
    const isTeacher = profile.role === 'teacher' || rolesArray.includes('teacher');
    const isCampusTeacher = isTeacher && profile.is_campus_active;
    const isGroovelabTeacher = isTeacher && profile.is_groovelab_active;

    if (isAdminOrSecretary || isTeacher) {
      const handleLogout = () => {
        sessionStorage.removeItem('groovelab_user_id');
        sessionStorage.removeItem('groovelab_qr_token');
        window.location.replace('/');
      };

      const handleCopyLink = () => {
        const subdomain = schoolData?.name
          ? schoolData.name
              .toLowerCase()
              .trim()
              .replace(/[äöüß]/g, (match: string) => {
                const mapping: Record<string, string> = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
                return mapping[match] || match;
              })
              .replace(/[^a-z0-9]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-+|-+$/g, '')
          : '';

        const origin = window.location.origin;
        let registerUrl = `${origin}?school=${subdomain}`;
        if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
          registerUrl = `https://${subdomain}.campus-groovelab.de`;
        }

        navigator.clipboard.writeText(registerUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      };

      // Primary Campus Theme Color
      const primaryColor = '#34a853';
      const gradientBg = 'linear-gradient(135deg, #34a853 0%, #288d45 100%)';

      // Profile avatar
      const profileAvatar = (profile.role === 'admin' || profile.role === 'secretary')
        ? '/campus_login_hero.png'
        : (profile.photo_url || getInstrumentAvatarUrl(profile.instrument));

      // Filter lessons for Kombi-Lehrer
      const filteredLessons = teacherTodayLessons.filter(lesson => {
        if (teacherModuleFilter === 'campus') return lesson.module === 'campus';
        if (teacherModuleFilter === 'groovelab') return lesson.module === 'groovelab';
        return true;
      });

      // Role subtitle text
      const roleTitles = [];
      if (isCampusTeacher) roleTitles.push('Campus Lehrkraft');
      if (isGroovelabTeacher) roleTitles.push('GrooveLab Coach');
      if (isAdminOrSecretary && roleTitles.length === 0) roleTitles.push('Schulleitung');
      const roleSubtitle = roleTitles.join(' · ');

      // Spectrum Gradient Multi-Color Stripe (Tri-Tone)
      const hasVerwaltung = isAdminOrSecretary;
      const hasCampus = profile.is_campus_active;
      const hasGrooveLab = profile.is_groovelab_active;

      let spectrumGradient = 'linear-gradient(90deg, #34a853 0%, #34a853 100%)';
      if (hasVerwaltung && hasCampus && hasGrooveLab) {
        spectrumGradient = 'linear-gradient(90deg, #ea4335 0%, #ea4335 33.3%, #34a853 33.3%, #34a853 66.6%, #eab308 66.6%, #eab308 100%)';
      } else if (hasVerwaltung && hasCampus) {
        spectrumGradient = 'linear-gradient(90deg, #ea4335 0%, #ea4335 50%, #34a853 50%, #34a853 100%)';
      } else if (hasVerwaltung && hasGrooveLab) {
        spectrumGradient = 'linear-gradient(90deg, #ea4335 0%, #ea4335 50%, #eab308 50%, #eab308 100%)';
      } else if (hasCampus && hasGrooveLab) {
        spectrumGradient = 'linear-gradient(90deg, #34a853 0%, #34a853 50%, #eab308 50%, #eab308 100%)';
      } else if (hasVerwaltung) {
        spectrumGradient = '#ea4335';
      } else {
        spectrumGradient = '#34a853';
      }

      return (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#f2f2f7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif'
        }}>
          {/* Dynamic Full Smartphone Responsive CSS */}
          <style>{`
            .qr-pass-card {
              width: 100%;
              height: 100%;
              max-width: 430px;
              max-height: 880px;
              border-radius: 32px;
              background: #ffffff;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.22), 0 10px 25px -5px rgba(0, 0, 0, 0.08);
              display: flex;
              flex-direction: column;
              box-sizing: border-box;
              position: relative;
              overflow: hidden;
              border: 1px solid rgba(0, 0, 0, 0.06);
            }
            @media (max-width: 640px) {
              .qr-pass-card {
                max-width: calc(100vw - 20px) !important;
                max-height: calc(100dvh - 20px) !important;
                height: calc(100dvh - 20px) !important;
                border-radius: 28px !important;
                margin: 10px auto !important;
              }
            }
          `}</style>

          {/* Standalone Ausweis Card Container */}
          <div className="qr-pass-card">
            {/* Top Multi-Module Spectrum Stripe */}
            <div style={{ height: '8px', width: '100%', background: spectrumGradient, flexShrink: 0 }} />

            {/* Card Content Area */}
            <div style={{ padding: 'max(16px, env(safe-area-inset-top, 16px)) 22px 20px 22px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
              
              {/* Role Pill Badges Header */}
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                flexWrap: 'wrap'
              }}>
                {hasVerwaltung && (
                  <span style={{ 
                    background: '#fce8e6', 
                    color: '#ea4335', 
                    border: '1px solid #fad2cf',
                    padding: '3px 8px', 
                    borderRadius: '6px', 
                    fontSize: '0.6rem', 
                    fontWeight: 900, 
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase'
                  }}>
                    VERWALTUNG
                  </span>
                )}
                {hasCampus && (
                  <span style={{ 
                    background: '#e6f4ea', 
                    color: '#34a853', 
                    border: '1px solid #ceebd6',
                    padding: '3px 8px', 
                    borderRadius: '6px', 
                    fontSize: '0.6rem', 
                    fontWeight: 900, 
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase'
                  }}>
                    CAMPUS
                  </span>
                )}
                {hasGrooveLab && (
                  <span style={{ 
                    background: '#fefce8', 
                    color: '#ca8a04', 
                    border: '1px solid #fef08a',
                    padding: '3px 8px', 
                    borderRadius: '6px', 
                    fontSize: '0.6rem', 
                    fontWeight: 900, 
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase'
                  }}>
                    GROOVELAB
                  </span>
                )}
              </div>

              {/* Large Identity Typography Section */}
              <div style={{ textAlign: 'center', marginTop: '2px' }}>
                <div style={{ fontSize: '2.1rem', fontWeight: 1000, color: '#0f172a', lineHeight: 1.05, letterSpacing: '-0.03em' }}>
                  {profile.first_name || 'Member'}
                </div>
                <div style={{ fontSize: '1.05rem', color: '#64748b', marginTop: '4px', fontWeight: 800 }}>
                  {profile.last_name || profile.instrument || 'Lehrkraft'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {isTeacher ? 'LEHRKRAFT' : 'MITGLIED'}
                </div>
              </div>

              {/* Primary Action Button (Campus Green Master Button) */}
              <button
                onClick={() => {
                  setPinPurpose('unlock_app');
                  setPageState('pin_required');
                }}
                style={{
                  width: '100%',
                  padding: '15px 20px',
                  borderRadius: '18px',
                  background: 'linear-gradient(135deg, #34a853 0%, #288d45 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(52, 168, 83, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'transform 0.15s ease'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                Direkt in Campus-Groovelab anmelden →
              </button>

              {/* Teacher Schedule Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8e8e93', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Unterrichtsplan
                  </span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#34a853' }}>
                    {new Date().toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                  </span>
                </div>

                {/* Filter Toggle for Kombi-Lehrer */}
                {isCampusTeacher && isGroovelabTeacher && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '3px',
                    background: '#f2f2f7',
                    padding: '3px',
                    borderRadius: '10px'
                  }}>
                    <button
                      onClick={() => setTeacherModuleFilter('all')}
                      style={{
                        padding: '5px',
                        borderRadius: '8px',
                        border: 'none',
                        background: teacherModuleFilter === 'all' ? '#ffffff' : 'transparent',
                        color: teacherModuleFilter === 'all' ? '#1c1c1e' : '#8e8e93',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: teacherModuleFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      Alle
                    </button>
                    <button
                      onClick={() => setTeacherModuleFilter('campus')}
                      style={{
                        padding: '5px',
                        borderRadius: '8px',
                        border: 'none',
                        background: teacherModuleFilter === 'campus' ? '#34a853' : 'transparent',
                        color: teacherModuleFilter === 'campus' ? '#ffffff' : '#8e8e93',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: teacherModuleFilter === 'campus' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      Campus
                    </button>
                    <button
                      onClick={() => setTeacherModuleFilter('groovelab')}
                      style={{
                        padding: '5px',
                        borderRadius: '8px',
                        border: 'none',
                        background: teacherModuleFilter === 'groovelab' ? '#eab308' : 'transparent',
                        color: teacherModuleFilter === 'groovelab' ? '#1c1c1e' : '#8e8e93',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: teacherModuleFilter === 'groovelab' ? '0 1px 3px rgba(234, 179, 8, 0.3)' : 'none'
                      }}
                    >
                      GrooveLab
                    </button>
                  </div>
                )}

                {loadingTeacherSchedule ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#8e8e93', fontSize: '0.78rem' }}>
                    Lade Plan...
                  </div>
                ) : filteredLessons.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid #f2f2f7', overflowY: 'auto', flex: 1 }}>
                    {filteredLessons.map((item, idx) => {
                      const isGL = item.module === 'groovelab';
                      const badgeColor = isGL ? '#d97706' : '#34a853';
                      const badgeBg = isGL ? '#fefce8' : '#f0fdf4';
                      const badgeBorder = isGL ? '#fde68a' : '#bbf7d0';

                      return (
                        <div key={item.id || idx} style={{
                          padding: '10px 0',
                          borderBottom: '1px solid #f2f2f7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              color: badgeColor,
                              background: badgeBg,
                              border: `1px solid ${badgeBorder}`,
                              padding: '3px 7px',
                              borderRadius: '6px',
                              minWidth: '44px',
                              textAlign: 'center'
                            }}>
                              {item.time}
                            </span>
                            <div>
                              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1c1c1e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {item.student_name}
                                {isCampusTeacher && isGroovelabTeacher && (
                                  <span style={{ fontSize: '0.58rem', background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}`, padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                                    {isGL ? 'GL' : 'Campus'}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#8e8e93' }}>
                                {item.instrument}
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 7px', borderRadius: '6px' }}>
                            {item.room_name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '12px',
                    padding: '14px',
                    fontSize: '0.85rem',
                    color: '#166534',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    margin: 'auto 0'
                  }}>
                    <CheckCircle size={18} color="#34a853" />
                    Heute kein Unterricht geplant.
                  </div>
                )}
              </div>

              {/* Bottom Actions (Anmeldelink kopieren & Abmelden only) */}
              <div style={{ borderTop: '1px solid #f2f2f7', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                <button
                  onClick={handleCopyLink}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: copiedLink ? '#34a853' : '#007aff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {copiedLink ? 'Link kopiert ✓' : 'Anmeldelink kopieren'}
                </button>

                <button
                  onClick={handleLogout}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ff3b30',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Abmelden
                </button>
              </div>
            </div>

            {/* Bottom Spectrum Stripe */}
            <div style={{ height: '8px', width: '100%', background: spectrumGradient, flexShrink: 0 }} />
          </div>
        </div>
      );
    }


    const todayStr = new Date().toLocaleDateString('en-CA');
    const currentDayOfWeek = new Date().getDay() || 7; // Monday = 1, ..., Sunday = 7

    const getVirtualNextLesson = () => {
      if (schedules.length === 0) return null;
      const sch = schedules[0];
      const dayOfWeek = sch.day_of_week;
      const today = getSimulatedNow();
      const currentDay = today.getDay() || 7;
      let diff = dayOfWeek - currentDay;
      if (diff <= 0) {
        diff += 7;
      }
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + diff);
      return {
        dateStr: nextDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
        time: sch.time_slot,
        isPendingReview: sch.status === 'ready_for_admin_review' && !sch.room?.name && !sch.room_id,
        room_name: sch.room?.name
      };
    };

    const nextLessonInfo = (() => {
      const simNow = getSimulatedNow();
      const todayStr = simNow.toLocaleDateString('sv-SE');
      const activeOccs = occurrences.filter(o => o.status !== 'cancelled' && o.status !== 'canceled_by_student' && o.status !== 'teacher_sick' && o.status !== 'canceled_by_teacher_sick');
      const upcomingOcc = activeOccs.find(o => o.date >= todayStr);
      if (upcomingOcc) {
        const d = new Date(upcomingOcc.date + 'T00:00:00');
        const isTimeShifted = Boolean(
          (upcomingOcc.original_start_time && upcomingOcc.start_time && upcomingOcc.original_start_time.substring(0, 5) !== upcomingOcc.start_time.substring(0, 5)) ||
          (upcomingOcc.schedule?.time_slot && upcomingOcc.start_time && upcomingOcc.schedule.time_slot.substring(0, 5) !== upcomingOcc.start_time.substring(0, 5))
        );
        const isDateShifted = Boolean(upcomingOcc.original_date && upcomingOcc.original_date !== upcomingOcc.date);
        const isRoomShifted = Boolean(upcomingOcc.room_override_id || upcomingOcc.room_override_name);
        const isRescheduled = upcomingOcc.status === 'pending_reschedule' || upcomingOcc.status === 'rescheduled_confirmed' || isTimeShifted || isDateShifted || isRoomShifted;

        const needsAck = upcomingOcc.student_acknowledged === false && isRescheduled;
        const roomName = upcomingOcc.room_override_name || upcomingOcc.room_name || upcomingOcc.schedule?.room?.name || upcomingOcc.room?.name;

        return {
          occ: upcomingOcc,
          dateStr: d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
          time: upcomingOcc.start_time || upcomingOcc.schedule?.time_slot,
          isPendingReview: upcomingOcc.schedule?.status === 'ready_for_admin_review' && !roomName && !upcomingOcc.schedule?.room_id,
          room_name: roomName,
          isRescheduled,
          needsAck
        };
      }
      return getVirtualNextLesson();
    })();

    const getLessonRoom = (lesson: any, dateStr: string) => {
      if (!lesson) return 'Groovelab Raum';
      const teacherId = lesson.teacher_id || (lesson.schedule && lesson.schedule.teacher_id);
      const lessonTime = lesson.start_time || lesson.time_slot;
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
      return lesson.schedule?.room?.name || lesson.room?.name || lesson.room_name || 'Groovelab Raum';
    };

    // Check if there is an occurrence today
    const occurrenceToday = occurrences.find(o => o.date === todayStr);

    // Check if there is a weekly schedule today
    const scheduleToday = schedules.find(s => s.day_of_week === currentDayOfWeek);

    // Determine if there is a lesson today (and it is not canceled)
    let lessonToday: any = null;
    let isTodayLessonScheduled = false;
    let isCanceled = false;

    if (occurrenceToday) {
      lessonToday = {
        ...occurrenceToday,
        room_name: getLessonRoom(occurrenceToday, todayStr)
      };
      isTodayLessonScheduled = true;
      isCanceled = ['cancelled', 'teacher_sick', 'canceled_by_student', 'canceled_by_teacher_sick'].includes(occurrenceToday.status);
    } else if (scheduleToday) {
      const overridingOcc = occurrences.find(o => o.schedule_id === scheduleToday.id && o.date === todayStr);
      if (overridingOcc) {
        lessonToday = {
          ...overridingOcc,
          room_name: getLessonRoom(overridingOcc, todayStr)
        };
        isTodayLessonScheduled = true;
        isCanceled = ['cancelled', 'teacher_sick', 'canceled_by_student', 'canceled_by_teacher_sick'].includes(overridingOcc.status);
      } else {
        lessonToday = {
          ...scheduleToday,
          start_time: scheduleToday.time_slot,
          room_name: getLessonRoom(scheduleToday, todayStr)
        };
        isTodayLessonScheduled = true;
        isCanceled = scheduleToday.status === 'canceled_by_teacher_sick';
      }
    }

    const isLessonDay = isTodayLessonScheduled && !isCanceled;

    const hasCampusStudent = profile.is_campus_active;
    const hasGrooveLabStudent = profile.is_groovelab_active;
    let studentSpectrumGradient = '#34a853';
    if (hasCampusStudent && hasGrooveLabStudent) {
      studentSpectrumGradient = 'linear-gradient(90deg, #34a853 0%, #34a853 50%, #eab308 50%, #eab308 100%)';
    } else if (hasGrooveLabStudent && !hasCampusStudent) {
      studentSpectrumGradient = 'repeating-linear-gradient(90deg, #eab308 0px, #eab308 8px, transparent 8px, transparent 14px)';
    } else if (hasCampusStudent && !hasGrooveLabStudent) {
      studentSpectrumGradient = '#34a853';
    } else {
      // Campus inactive & GrooveLab inactive: Gestrichelter (dashed) grüner Akzentbalken!
      studentSpectrumGradient = 'repeating-linear-gradient(90deg, #34a853 0px, #34a853 8px, #e2e8f0 8px, #e2e8f0 14px)';
    }

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: timerRunning ? '#000000' : '#f2f2f7',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: timerRunning ? 'center' : 'flex-start',
        boxSizing: 'border-box',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: timerRunning ? 0 : '24px 16px 48px 16px',
        fontFamily: "'Outfit', 'Urbanist', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
        transition: 'background 0.5s ease'
      }}>
        {/* Dynamic Full Smartphone Responsive CSS & Typography */}
        <style>{`
          /* DSGVO-compliant local font stack */

          * {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
          }

          .qr-pass-card {
            width: 100%;
            max-width: 440px;
            min-height: auto;
            border-radius: 32px;
            background: #ffffff;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.12), 0 10px 25px -5px rgba(0, 0, 0, 0.04);
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            position: relative;
            border: 1px solid rgba(0, 0, 0, 0.06);
            font-family: 'Outfit', 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0 auto;
          }

          h1, h2, h3, h4 {
            font-family: 'Urbanist', 'Outfit', sans-serif !important;
            letter-spacing: -0.02em;
          }

          @media (max-width: 640px) {
            .qr-pass-card {
              max-width: 100% !important;
              border-radius: 28px !important;
              margin: 0 !important;
            }
            button, [role="button"] {
              -webkit-tap-highlight-color: transparent;
              touch-action: manipulation;
            }
            button:active {
              transform: scale(0.97);
              transition: transform 0.1s cubic-bezier(0.16, 1, 0.3, 1);
            }
          }
        `}</style>

        <div className="qr-pass-card" style={{ 
          borderRadius: timerRunning ? 0 : '32px',
          background: timerRunning ? '#000000' : '#ffffff',
          boxShadow: timerRunning ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.12), 0 10px 25px -5px rgba(0, 0, 0, 0.04)',
          border: timerRunning ? 'none' : '1px solid rgba(0, 0, 0, 0.06)'
        }}>
          {/* Header Section with Spectrum Gradient */}
          {!timerRunning && (
            <>
              {/* Top Multi-Module Spectrum Stripe */}
              <div style={{ height: '8px', width: '100%', background: studentSpectrumGradient, flexShrink: 0 }} />

              {/* Ultra-Compact 36px Smart Header Section */}
              <div style={{
                background: '#ffffff',
                padding: 'max(10px, env(safe-area-inset-top, 10px)) 16px 10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #f2f2f7',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 1 }}>
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '8px',
                    background: '#e6f4ea',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#34a853',
                    border: '1px solid #bbf7d0',
                    flexShrink: 0
                  }}>
                    <Music size={14} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', fontFamily: "'Urbanist', 'Outfit', sans-serif", whiteSpace: 'nowrap' }}>
                    Campus-Groovelab
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {/* 🛡️ 1-Klick Schnellwechsel zur Schüleransicht (nur wenn Eltern-Modus aktiv ist) */}
                  {parentUnlocked && (
                    <button
                      type="button"
                      onClick={() => {
                        setParentUnlocked(false);
                        sessionStorage.removeItem(`groovelab_parent_unlocked_${token}`);
                        if (profile) {
                          sessionStorage.removeItem(`groovelab_parent_unlocked_${profile.id}`);
                          sessionStorage.removeItem(`groovelab_parent_session_${profile.id}`);
                        }
                        setActiveTab('lessons');
                        showToastMsg(`Zur Schüleransicht gewechselt (${profile?.first_name || 'Schüler'} gesichert)`);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 11px',
                        borderRadius: '20px',
                        border: '1px solid #bae6fd',
                        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                        color: '#0284c7',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(2, 132, 199, 0.12)',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap'
                      }}
                      title="Eltern-Modus beenden und zur geschützten Schüleransicht wechseln"
                    >
                      <User size={13} color="#0284c7" />
                      <span>Schüleransicht</span>
                    </button>
                  )}

                  {hasCampusStudent && (
                    <span style={{ background: '#e6f4ea', color: '#34a853', border: '1px solid #ceebd6', padding: '2px 6px', borderRadius: '6px', fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      CAMPUS
                    </span>
                  )}
                  {hasGrooveLabStudent && (
                    <span style={{ background: '#fefce8', color: '#ca8a04', border: '1px solid #fef08a', padding: '2px 6px', borderRadius: '6px', fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      GROOVELAB
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 🛡️ Persistent Ambient Banner when Parent Mode is active */}
          {parentUnlocked && (
            <div style={{
              position: 'sticky',
              top: 0,
              zIndex: 90,
              background: 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              fontWeight: 700,
              boxShadow: '0 2px 10px rgba(2, 132, 199, 0.25)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} color="#ffffff" />
                <span>Eltern-Bereich aktiv (Voller Zugriff)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setParentUnlocked(false);
                  sessionStorage.removeItem(`groovelab_parent_unlocked_${token}`);
                  if (profile) {
                    sessionStorage.removeItem(`groovelab_parent_unlocked_${profile.id}`);
                    sessionStorage.removeItem(`groovelab_parent_session_${profile.id}`);
                  }
                  setDraftUiLevel(null);
                  setDraftAllowAbsences(null);
                  setDraftAllowChat(null);
                  setDraftAllowLeaderboard(null);
                  setActiveTab(profile?.is_campus_active ? 'action' : 'homework');
                  showToastMsg(`Zur Schüleransicht gewechselt (${profile?.first_name || 'Schüler'} gesichert)`);
                }}
                style={{
                  background: '#ffffff',
                  color: '#0369a1',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '4px 12px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                  whiteSpace: 'nowrap'
                }}
                title="Eltern-Modus beenden und zur geschützten Schüleransicht wechseln"
              >
                <User size={12} color="#0369a1" />
                <span>Schüleransicht</span>
              </button>
            </div>
          )}

          {!timerRunning && profile.app_usage_mode === 'parent_hybrid' && !parentUnlocked && (
            <div style={{
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              color: '#475569',
              fontWeight: 700
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Users size={14} style={{ color: '#64748b' }} />
                Dieser Bereich ist für Schüler optimiert.
              </span>
              <button
                type="button"
                onClick={() => {
                  setParentPinErrorMsg(null);
                  setParentPinSuccessMsg(null);
                  setShowPinPrompt(true);
                }}
                style={{
                  background: '#34a853',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Key size={12} />
                Eltern-Bereich
              </button>
            </div>
          )}

           {showPinPrompt && (
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}>
              <div style={{
                background: 'white',
                borderRadius: '28px',
                padding: '24px',
                width: '100%',
                maxWidth: '320px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                textAlign: 'center'
              }}>
                {parentPinErrorMsg && (
                  <div style={{
                    background: '#fee2e2',
                    border: '1.5px solid #fca5a5',
                    borderRadius: '12px',
                    padding: '8px 12px',
                    color: '#b91c1c',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    marginBottom: '12px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <AlertTriangle size={14} style={{ color: '#b91c1c', flexShrink: 0 }} />
                    <span style={{ lineHeight: 1.3 }}>{parentPinErrorMsg}</span>
                  </div>
                )}
                {parentPinSuccessMsg && (
                  <div style={{
                    background: '#e6f4ea',
                    border: '1.5px solid #a7f3d0',
                    borderRadius: '12px',
                    padding: '8px 12px',
                    color: '#047857',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    marginBottom: '12px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <CheckCircle size={14} style={{ color: '#047857', flexShrink: 0 }} />
                    <span style={{ lineHeight: 1.3 }}>{parentPinSuccessMsg}</span>
                  </div>
                )}

                {isInitialPinSetup ? (
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Lock size={18} />
                      4-stellige PIN festlegen / ändern
                    </h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 650, lineHeight: 1.4 }}>
                      Gib deine persönliche 4-stellige Sicherheits-PIN für dein Profil ein und bestätige sie.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', textAlign: 'left' }}>Neue 4-stellige PIN:</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={newPinInput}
                          onChange={(e) => {
                            setParentPinErrorMsg(null);
                            setNewPinInput(e.target.value.replace(/\D/g, ''));
                          }}
                          placeholder="••••"
                          style={{
                            width: '100%',
                            padding: '10px',
                            fontSize: '1.25rem',
                            textAlign: 'center',
                            border: '2px solid #cbd5e1',
                            borderRadius: '12px',
                            outline: 'none',
                            letterSpacing: '0.4em',
                            fontWeight: 900,
                            background: '#f8fafc',
                            color: '#0f172a'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', textAlign: 'left' }}>PIN wiederholen:</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={newPinConfirm}
                          onChange={(e) => {
                            setParentPinErrorMsg(null);
                            setNewPinConfirm(e.target.value.replace(/\D/g, ''));
                          }}
                          placeholder="••••"
                          style={{
                            width: '100%',
                            padding: '10px',
                            fontSize: '1.25rem',
                            textAlign: 'center',
                            border: '2px solid #cbd5e1',
                            borderRadius: '12px',
                            outline: 'none',
                            letterSpacing: '0.4em',
                            fontWeight: 900,
                            background: '#f8fafc',
                            color: '#0f172a'
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsInitialPinSetup(false);
                          setShowPinPrompt(false);
                          setNewPinInput('');
                          setNewPinConfirm('');
                          setParentPinErrorMsg(null);
                          setParentPinSuccessMsg(null);
                        }}
                        style={{
                          flex: 1,
                          padding: '10px',
                          background: '#f1f5f9',
                          color: '#475569',
                          border: 'none',
                          borderRadius: '12px',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveInitialPin}
                        disabled={newPinInput.length !== 4 || newPinConfirm.length !== 4 || pinChangeLoading}
                        style={{
                          flex: 1,
                          padding: '10px',
                          background: '#34a853',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '12px',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          cursor: (newPinInput.length !== 4 || newPinConfirm.length !== 4 || pinChangeLoading) ? 'not-allowed' : 'pointer',
                          opacity: (newPinInput.length !== 4 || newPinConfirm.length !== 4 || pinChangeLoading) ? 0.6 : 1
                        }}
                      >
                        {pinChangeLoading ? 'Speichert...' : 'Speichern'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Lock size={20} style={{ color: '#34a853' }} />
                      4-stellige PIN eingeben
                    </h3>
                    <p style={{ margin: '0 0 20px 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 650, lineHeight: 1.4 }}>
                      Bitte gib deine 4-stellige PIN ein, um dich einzuloggen.
                    </p>
                    <input
                      type="password"
                      maxLength={6}
                      value={parentPinInput}
                      onChange={async (e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setParentPinInput(val);
                        setParentPinErrorMsg(null);
                        if (val.length === 4 || val.length === 6) {
                          if (parentPinLockoutUntil && Date.now() < parentPinLockoutUntil) {
                            const minsLeft = Math.ceil((parentPinLockoutUntil - Date.now()) / 60000);
                            setParentPinErrorMsg(`Bereich gesperrt. Bitte versuche es in ${minsLeft} Minuten erneut.`);
                            setParentPinInput('');
                            return;
                          }

                          const isCorrect = await verifyParentPinClient(profile.id, val, profile.parent_pin);
                          if (isCorrect) {
                            setParentPinAttempts(0);
                            setParentUnlocked(true);
                            setLessonsUnlocked(true);
                            setShowPinPrompt(false);
                            setActiveTab('lessons');
                            setParentPinInput('');
                            setParentPinError(false);
                            setParentPinErrorMsg(null);
                            localStorage.setItem(`groovelab_parent_unlocked_${token}`, 'true');
                            localStorage.setItem(`groovelab_parent_pin_${profile.id}`, val);
                          } else if (val.length === 6) {
                            const newAttempts = parentPinAttempts + 1;
                            setParentPinAttempts(newAttempts);
                            if (newAttempts >= 3) {
                              const lockoutTime = Date.now() + 15 * 60 * 1000;
                              setParentPinLockoutUntil(lockoutTime);
                              setParentPinAttempts(0);
                              setParentPinErrorMsg('Zu viele Fehlversuche. Der Eltern-Bereich ist aus Sicherheitsgründen für 15 Minuten gesperrt.');
                            } else {
                              setParentPinError(true);
                              setParentPinErrorMsg(`Falsche PIN. Du hast noch ${3 - newAttempts} Versuche.`);
                            }
                            setParentPinInput('');
                          }
                        }
                      }}
                      placeholder="••••••"
                      style={{
                        width: '120px',
                        padding: '12px 0',
                        fontSize: '1.75rem',
                        textAlign: 'center',
                        border: parentPinError ? '2px solid #ef4444' : '2px solid #cbd5e1',
                        borderRadius: '16px',
                        letterSpacing: '0.5em',
                        fontWeight: 900,
                        outline: 'none',
                        background: '#f8fafc',
                        color: '#0f172a',
                        marginBottom: '20px'
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowPinPrompt(false);
                        setParentPinInput('');
                        setParentPinError(false);
                        setParentPinErrorMsg(null);
                        setParentPinSuccessMsg(null);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: '#f1f5f9',
                        color: '#475569',
                        border: 'none',
                        borderRadius: '14px',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      Abbrechen
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {showConsentModal && (
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}>
              <div style={{
                background: 'white',
                borderRadius: '28px',
                padding: '24px',
                width: '100%',
                maxWidth: '360px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Smartphone size={20} style={{ color: '#34a853' }} />
                  Direkt-Kommunikation freischalten
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', fontWeight: 600, lineHeight: 1.4 }}>
                  Sie erlauben damit Ihrem Kind, direkt und selbstständig über die App mit Lehrkräften zu kommunizieren. Dies schaltet den Chat-Eingang frei und macht das Profil schulintern sichtbar.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 650, color: '#1e293b' }}>
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      style={{ marginTop: '3px' }}
                    />
                    <span>Ich stimme zu, dass mein Kind eigenständig Nachrichten senden und empfangen darf.</span>
                  </label>
                  
                  <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 650, color: '#1e293b' }}>
                    <input
                      type="checkbox"
                      checked={acceptedPrivacy}
                      onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                      style={{ marginTop: '3px' }}
                    />
                    <span>Ich habe die Datenschutzhinweise und die AGB gelesen und akzeptiere diese im Namen meines Kindes.</span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowConsentModal(false);
                      setAcceptedTerms(false);
                      setAcceptedPrivacy(false);
                    }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#f1f5f9',
                      color: '#475569',
                      border: 'none',
                      borderRadius: '14px',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    disabled={!acceptedTerms || !acceptedPrivacy}
                    onClick={async () => {
                      try {
                        const { error: logError } = await supabase
                          .from('parent_consent_logs')
                          .insert({
                            student_id: profile.id,
                            parent_email: 'eltern@campus-groovelab.de',
                            consent_type: 'direct_communication',
                            ip_address: '127.0.0.1',
                            user_agent: navigator.userAgent
                          });
                        if (logError) throw logError;

                        const { error: updateError } = await supabase
                          .from('users')
                          .update({ app_usage_mode: 'student_only' })
                          .eq('id', profile.id);
                        if (updateError) throw updateError;

                        setProfile(prev => prev ? { ...prev, app_usage_mode: 'student_only' } : null);
                        setParentUnlocked(false);
                        setShowConsentModal(false);
                        showToastMsg('Erfolgreich freigeschaltet! Der Modus wurde auf "Selbstnutzer" umgestellt.', 'success');
                      } catch (err: any) {
                        showToastMsg('Fehler bei der Aktivierung: ' + err.message, 'error');
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: (!acceptedTerms || !acceptedPrivacy) ? '#cbd5e1' : '#34a853',
                      color: 'white',
                      border: 'none',
                      borderRadius: '14px',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: (!acceptedTerms || !acceptedPrivacy) ? 'not-allowed' : 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    Freischalten
                  </button>
                </div>
              </div>
            </div>
          )}

          {toast && (
            <div style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: toast.type === 'success' ? '#10b981' : '#ef4444',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '16px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 800,
              fontSize: '0.85rem'
            }}>
              {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
              <span>{toast.message}</span>
            </div>
          )}

          {/* Thin separator */}
          {!timerRunning && <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)' }}></div>}

          {/* Trial countdown bar */}
          {!timerRunning && profile.is_trial && profile.trial_ends_at && (() => {
            const daysLeft = Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <div style={{
                background: '#fffbeb',
                borderBottom: '1px solid #fde68a',
                padding: '10px 20px',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                <span>⏳</span>
                <span>Deine Probezeit läuft noch {daysLeft} Tag(e) (bis {new Date(profile.trial_ends_at).toLocaleDateString('de-DE')})</span>
              </div>
            );
          })()}

          {/* Marketing Activation Modal for Inactive Users */}
          {(() => {
            if (!showActivationInfoModal) return null;

            return (
              <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                background: 'rgba(15, 23, 42, 0.78)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                animation: 'fadeIn 0.25s ease-out'
              }}>
                <div style={{
                  background: '#ffffff',
                  borderRadius: '28px',
                  width: '100%',
                  maxWidth: '480px',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}>
                  {/* Header Hero Banner */}
                  <div style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
                    padding: '28px 24px 24px',
                    borderRadius: '28px 28px 0 0',
                    position: 'relative',
                    color: '#ffffff',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '-50px',
                      right: '-50px',
                      width: '180px',
                      height: '180px',
                      background: 'radial-gradient(circle, rgba(52, 168, 83, 0.4) 0%, rgba(0,0,0,0) 70%)',
                      borderRadius: '50%',
                      pointerEvents: 'none'
                    }} />

                    <button
                      type="button"
                      onClick={() => setShowActivationInfoModal(false)}
                      style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'rgba(255, 255, 255, 0.15)',
                        border: 'none',
                        color: '#ffffff',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        transition: 'background 0.2s'
                      }}
                    >
                      ✕
                    </button>

                    <span style={{
                      background: 'rgba(52, 168, 83, 0.15)',
                      color: '#34a853',
                      border: '1px solid rgba(52, 168, 83, 0.3)',
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      padding: '4px 12px',
                      borderRadius: '100px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Sparkles size={12} color="#34a853" /> Campus Freischalten
                    </span>

                    <h3 style={{ margin: '12px 0 6px', fontSize: '1.45rem', fontWeight: 900, letterSpacing: '-0.025em', color: '#ffffff', fontFamily: "'Urbanist', sans-serif" }}>
                      Erlebe deinen vollen Musikschul-Campus
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.45, fontWeight: 500 }}>
                      Entfalte dein volles Musik-Potenzial mit allen digitalen Werkzeugen deiner Musikschule.
                    </p>
                  </div>

                  {/* Apple HIG Feature List with Vibrant iOS App Store Accents */}
                  <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      {
                        Icon: Timer,
                        title: 'Fokus-Timer, Streaks & Übe-Pfad',
                        desc: 'Fokussierte Übe-Sessions zum Gewohnheitsaufbau – mit Streaks, XP-Belohnungen & Level-Fortschritt.',
                        color: '#16a34a',
                        iconBg: '#dcfce7',
                        iconBorder: '#bbf7d0',
                        cardBg: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
                        cardBorder: '#bbf7d0'
                      },
                      {
                        Icon: BookOpen,
                        title: 'Digitales Hausaufgabenheft & Protokoll',
                        desc: 'Alle Aufgaben, Lehrer-Feedback & Meisterwerk-Dokumentation an einem Ort.',
                        color: '#0284c7',
                        iconBg: '#e0f2fe',
                        iconBorder: '#bae6fd',
                        cardBg: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
                        cardBorder: '#bae6fd'
                      },
                      {
                        Icon: Radio,
                        title: 'Präzise Audio-Loopstation & Aufnahmen',
                        desc: 'Nahtloser Multi-Track Looper mit automatischer Takt-Synchronisation, Aufnahmefunktion & Cloud-Archiv.',
                        color: '#ca8a04',
                        iconBg: '#fef9c3',
                        iconBorder: '#fef08a',
                        cardBg: 'linear-gradient(135deg, #ffffff 0%, #fefce8 100%)',
                        cardBorder: '#fef08a'
                      },
                      {
                        Icon: Play,
                        title: 'Übe-Begleiter & Play-Alongs',
                        desc: 'Integriertes Metronom & Drum-Tracks zum aktiven Mitspielen beim täglichen Üben.',
                        color: '#9333ea',
                        iconBg: '#f3e8ff',
                        iconBorder: '#e9d5ff',
                        cardBg: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
                        cardBorder: '#e9d5ff'
                      },
                      {
                        Icon: Calendar,
                        title: 'Stundenplan & Schuljahr-Termine',
                        desc: 'Vollständige Jahresübersicht aller Unterrichtstermine, Raumplanung & Verschiebungs-Anfragen.',
                        color: '#4f46e5',
                        iconBg: '#e0e7ff',
                        iconBorder: '#c7d2fe',
                        cardBg: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)',
                        cardBorder: '#c7d2fe'
                      },
                      {
                        Icon: MessageSquare,
                        title: 'Direktnachrichten & Termin-Shoutbox (DSGVO)',
                        desc: '100% datenschutzkonforme Nachrichten & terminbezogene 1:1 Shoutbox für jede Unterrichtsstunde.',
                        color: '#059669',
                        iconBg: '#ccfbf1',
                        iconBorder: '#99f6e4',
                        cardBg: 'linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%)',
                        cardBorder: '#99f6e4'
                      },
                      {
                        Icon: Trophy,
                        title: 'Sticker & Errungenschaften',
                        desc: 'Sammelbare Abzeichen und Erfolge für erreichte Lern- und Übe-Meilensteine.',
                        color: '#d97706',
                        iconBg: '#fef3c7',
                        iconBorder: '#fde047',
                        cardBg: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
                        cardBorder: '#fde68a'
                      },
                      {
                        Icon: Award,
                        title: 'Performance & Highlights Board',
                        desc: 'Feiere persönliche Meilensteine, Klassen-Erfolge & deinen Beitrag zum Gesamterfolg deiner Musikschule.',
                        color: '#7c3aed',
                        iconBg: '#ede9fe',
                        iconBorder: '#ddd6fe',
                        cardBg: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)',
                        cardBorder: '#ddd6fe'
                      },
                      {
                        Icon: BarChart3,
                        title: 'Skill-Radar & Entwicklungs-Analyse',
                        desc: '360°-Visualisierung deiner musikalischen Stärken, Technik, Rhythmik & persönlichen Superkraft.',
                        color: '#e11d48',
                        iconBg: '#ffe4e6',
                        iconBorder: '#fecdd3',
                        cardBg: 'linear-gradient(135deg, #ffffff 0%, #fff1f2 100%)',
                        cardBorder: '#fecdd3'
                      }
                    ].map((item, idx) => {
                      const IconComp = item.Icon;
                      return (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          padding: '12px 14px',
                          borderRadius: '16px',
                          background: item.cardBg,
                          border: `1px solid ${item.cardBorder}`,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '12px',
                            background: item.iconBg,
                            border: `1px solid ${item.iconBorder}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <IconComp size={18} color={item.color} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                              {item.title}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.35, fontWeight: 500 }}>
                              {item.desc}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Cost & Billing Transparency Hero Card */}
                  {(() => {
                    const isExempt = profile?.exempt_from_direct_billing === true;
                    const isBypass = Boolean(schoolData?.subscription_bypass);
                    const opt = schoolData?.student_billing_option;

                    // Option 1: School covers all costs OR student is exempt OR subscription bypass is active
                    const isSchoolCovered = isBypass || isExempt || !opt || opt === 'school_covered' || opt === 'sammelzahler' || opt === 'school_pays' || opt === 'option1' || opt === 'both';
                    
                    if (isSchoolCovered) {
                      return (
                        <div style={{
                          margin: '0 24px 12px 24px',
                          padding: '14px 16px',
                          borderRadius: '18px',
                          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                          border: '1.5px solid #bbf7d0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          boxShadow: '0 2px 8px rgba(52, 168, 83, 0.08)'
                        }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '12px',
                            background: '#ffffff',
                            border: '1px solid #bbf7d0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.1rem',
                            flexShrink: 0
                          }}>
                            🎁
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#14532d' }}>
                                100% Kostenlos für dich!
                              </span>
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#16a34a', color: '#ffffff', padding: '2px 7px', borderRadius: '100px', textTransform: 'uppercase' }}>
                                Übernommen
                              </span>
                            </div>
                            <span style={{ fontSize: '0.76rem', color: '#15803d', lineHeight: 1.35, fontWeight: 600 }}>
                              Deine Musikschule übernimmt alle Cloud-Bereitstellungsgebühren für deinen Campus-Zugang. Die Software-Nutzung ist 100% kostenlos.
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // Option 2: Partial or Full direct billing
                    const isPartial = opt === 'student_partial';
                    const baseStudentRate = masterPricing.priceStudent || 0.49;
                    const monthlyPriceNum = isPartial ? Number((baseStudentRate * 0.8163).toFixed(2)) : baseStudentRate;
                    const monthlyPrice = `${monthlyPriceNum.toFixed(2).replace('.', ',')} €`;
                    const annualPrice = `${(monthlyPriceNum * 12).toFixed(2).replace('.', ',')} €`;

                    return (
                      <div style={{
                        margin: '0 24px 12px 24px',
                        padding: '14px 16px',
                        borderRadius: '18px',
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        border: '1.5px solid #cbd5e1',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            💳 Cloud- &amp; Modul-Bereitstellung
                          </span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '100px' }}>
                            Transparente Abrechnung
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
                            {annualPrice} <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>/ Schuljahr</span>
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 700 }}>
                            (Einmalzahlung, entspricht {monthlyPrice} / Monat)
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.35, fontWeight: 500 }}>
                          {isPartial 
                            ? 'Deine Musikschule bezuschusst deinen Zugang. Die Cloud-Bereitstellung wird als transparente Einmalzahlung für das Schuljahr abgerechnet (keine automatische Verlängerung). Die Software-Nutzung ist 100% kostenlos.' 
                            : 'Cloud- & Modul-Bereitstellung für deinen vollen Campus-Zugang (Einmalzahlung für das Schuljahr, keine automatische Verlängerung). Die Software-Nutzung ist 100% kostenlos.'}
                        </span>

                        {/* 🛡️ Treue-Preisgarantie Badge */}
                        <div style={{
                          marginTop: '4px',
                          padding: '8px 12px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                          border: '1px solid #86efac',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <ShieldCheck size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                          <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700, lineHeight: 1.3 }}>
                            <strong style={{ color: '#166534' }}>🛡️ Treue-Preisgarantie:</strong> Solange dein Profil aktiv bleibt, ist dein Preis von {monthlyPrice} / Mo. dauerhaft geschützt! Bei Kündigung erlischt der Treuepreis.
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Footer Actions */}
                  <div style={{
                    padding: '16px 24px 24px',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    background: '#ffffff',
                    borderRadius: '0 0 28px 28px'
                  }}>
                    {profile?.is_campus_active ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowActivationInfoModal(false);
                          setPinPurpose('unlock_app');
                          setPageState('pin_required');
                        }}
                        style={{
                          width: '100%',
                          padding: '14px',
                          borderRadius: '14px',
                          background: 'linear-gradient(135deg, #34a853 0%, #248a3d 100%)',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 800,
                          fontSize: '0.92rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 14px rgba(52, 168, 83, 0.35)'
                        }}
                      >
                        <Lock size={16} color="#ffffff" />
                        <span>Jetzt PIN eingeben & WebApp freischalten</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          alert('Wende dich einfach an dein Sekretariat oder deinen Lehrer, um den Vollzugriff für dein Profil freischalten zu lassen!');
                        }}
                        style={{
                          width: '100%',
                          padding: '14px',
                          borderRadius: '14px',
                          background: 'linear-gradient(135deg, #34a853 0%, #248a3d 100%)',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 800,
                          fontSize: '0.92rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 14px rgba(52, 168, 83, 0.35)'
                        }}
                      >
                        <span>📩 Bei der Musikschule anfragen</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowActivationInfoModal(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '4px 0',
                        textAlign: 'center'
                      }}
                    >
                      Vielleicht später
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Main Content Area */}
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {loadingDashboard ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '12px' }}>
                <div style={styles.loadingDot} />
                <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 650 }}>Lade Dashboard...</span>
              </div>
            ) : profile.app_usage_mode === 'parent_hybrid' ? (
              /* ==============================================================
                 WEG 3: PARENT_HYBRID (Jüngere Kinder & Eltern)
                 ============================================================== */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {profile?.first_name && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '2px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em', fontFamily: "'Urbanist', sans-serif" }}>
                      Hallo {profile.first_name}! 🎵
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 700, background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '100px' }}>
                        {profile.instrument || 'Schüler'}
                      </span>
                      <button
                        type="button"
                        onClick={handleVollzugriffClick}
                        style={{
                          background: 'linear-gradient(135deg, #34a853 0%, #248a3d 100%)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: '100px',
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 2px 6px rgba(52, 168, 83, 0.25)',
                          transition: 'transform 0.15s ease'
                        }}
                      >
                        {profile.is_campus_active ? (
                          <>
                            <Lock size={12} color="#ffffff" />
                            <span>Vollzugriff</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={12} color="#ffffff" />
                            <span>Campus aktivieren</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {renderLessonInfoCard(lessonToday, isLessonDay, nextLessonInfo)}
                {renderSegmentedControl()}
                {activeTab === 'action' ? (
                  practiceLoggedToday ? (
                    renderPracticeLoggedDone()
                  ) : (
                    <div style={{
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '28px',
                      padding: '24px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '18px',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.03)'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                          Übezeit eintragen
                        </h3>
                        <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 650 }}>
                          Wähle aus, wie lange heute geübt wurde:
                        </p>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: '100%' }}>
                        {[3, 5, 10].map(mins => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => handleQuickLogPractice(mins)}
                            style={{
                              padding: '16px 8px',
                              borderRadius: '20px',
                              border: 'none',
                              background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
                              color: '#ffffff',
                              fontSize: '0.95rem',
                              fontWeight: 900,
                              cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(52, 168, 83, 0.15)',
                              transition: 'transform 0.15s, box-shadow 0.2s',
                              fontFamily: 'inherit',
                              outline: 'none'
                            }}
                            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
                            onMouseUp={e => e.currentTarget.style.transform = ''}
                          >
                            {mins} Min.
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                ) : activeTab === 'homework' ? (
                  renderHomeworkWidget()
                ) : (
                  renderLessonsWidget()
                )}

                {profile.app_usage_mode === 'parent_hybrid' && parentUnlocked && (
                  <div style={{
                    background: '#e6f4ea',
                    border: '1.5px solid #e6f4ea',
                    borderRadius: '24px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    textAlign: 'left',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#34a853', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Key size={16} style={{ color: '#34a853' }} /> Berechtigungen verwalten
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#34a853', fontWeight: 650, lineHeight: 1.4 }}>
                      Du kannst die Kommunikationsrechte auf dein Kind übertragen oder einzelne Funktionen gezielt freigeben.
                    </p>
                    
                    <button
                      type="button"
                      onClick={() => setShowConsentModal(true)}
                      style={{
                        background: '#34a853',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '10px 16px',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        alignSelf: 'flex-start',
                        marginBottom: '8px'
                      }}
                    >
                      Modus wechseln zu "Selbstnutzer"
                    </button>

                    <div style={{ borderTop: '1px solid #e6f4ea', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h5 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: '#34a853', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Settings size={14} style={{ color: '#34a853' }} /> Einzelne Funktionen freigeben:
                      </h5>
                      
                      {/* Toggle 1: Chat */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: '#34a853', fontWeight: 700, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={profile.parent_allow_chat ?? true}
                          onChange={async (e) => {
                            const checked = e.target.checked;
                            const { error } = await supabase.from('users').update({ parent_allow_chat: checked }).eq('id', profile.id);
                            if (!error) setProfile(prev => prev ? { ...prev, parent_allow_chat: checked } : null);
                          }}
                          style={{ accentColor: '#34a853' }}
                        />
                        <MessageSquare size={14} style={{ color: '#34a853', flexShrink: 0 }} />
                        <span>Chat &amp; Lehrer-Kommunikation erlauben</span>
                      </label>

                      {/* Toggle 2: Timer */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: '#34a853', fontWeight: 700, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={profile.parent_allow_timer ?? true}
                          onChange={async (e) => {
                            const checked = e.target.checked;
                            const { error } = await supabase.from('users').update({ parent_allow_timer: checked }).eq('id', profile.id);
                            if (!error) setProfile(prev => prev ? { ...prev, parent_allow_timer: checked } : null);
                          }}
                          style={{ accentColor: '#34a853' }}
                        />
                        <Timer size={14} style={{ color: '#34a853', flexShrink: 0 }} />
                        <span>Selbständiger Übe-Timer &amp; Streaks</span>
                      </label>

                      {/* Toggle 3: Leaderboard */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: '#34a853', fontWeight: 700, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={profile.parent_allow_leaderboard ?? true}
                          onChange={async (e) => {
                            const checked = e.target.checked;
                            const { error } = await supabase.from('users').update({ parent_allow_leaderboard: checked }).eq('id', profile.id);
                            if (!error) setProfile(prev => prev ? { ...prev, parent_allow_leaderboard: checked } : null);
                          }}
                          style={{ accentColor: '#34a853' }}
                        />
                        <Trophy size={14} style={{ color: '#34a853', flexShrink: 0 }} />
                        <span>Klassen-Highlights &amp; Team-Power</span>
                      </label>

                      {/* Toggle 4: Groups */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: '#34a853', fontWeight: 700, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={profile.parent_allow_groups ?? true}
                          onChange={async (e) => {
                            const checked = e.target.checked;
                            const { error } = await supabase.from('users').update({ parent_allow_groups: checked }).eq('id', profile.id);
                            if (!error) setProfile(prev => prev ? { ...prev, parent_allow_groups: checked } : null);
                          }}
                          style={{ accentColor: '#34a853' }}
                        />
                        <Users size={14} style={{ color: '#34a853', flexShrink: 0 }} />
                        <span>Beitritt zu Band- &amp; Gruppen-Chats</span>
                      </label>

                      {/* Toggle 5: Proposals */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: '#34a853', fontWeight: 700, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={profile.parent_allow_proposals ?? true}
                          onChange={async (e) => {
                            const checked = e.target.checked;
                            const { error } = await supabase.from('users').update({ parent_allow_proposals: checked }).eq('id', profile.id);
                            if (!error) setProfile(prev => prev ? { ...prev, parent_allow_proposals: checked } : null);
                          }}
                          style={{ accentColor: '#34a853' }}
                        />
                        <Music size={14} style={{ color: '#34a853', flexShrink: 0 }} />
                        <span>Repertoire- &amp; Songvorschläge senden</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ==============================================================
                 WEG 2: STUDENT_ONLY (Selbstnutzer)
                 ============================================================== */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {!timerRunning && profile?.first_name && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '2px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em', fontFamily: "'Urbanist', sans-serif" }}>
                      Hallo {profile.first_name}! 🎵
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 700, background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '100px' }}>
                        {profile.instrument || 'Schüler'}
                      </span>
                      <button
                        type="button"
                        onClick={handleVollzugriffClick}
                        style={{
                          background: 'linear-gradient(135deg, #34a853 0%, #248a3d 100%)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: '100px',
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 2px 6px rgba(52, 168, 83, 0.25)',
                          transition: 'transform 0.15s ease'
                        }}
                      >
                        {profile.is_campus_active ? (
                          <>
                            <Lock size={12} color="#ffffff" />
                            <span>Vollzugriff</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={12} color="#ffffff" />
                            <span>Campus aktivieren</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {!timerRunning && renderLessonInfoCard(lessonToday, isLessonDay, nextLessonInfo)}
                {!timerRunning && renderPWAInstallCard()}
                {profile.is_campus_active ? <>
                  {!timerRunning && renderSegmentedControl()}
                  {activeTab === 'action' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Gamification Streak/XP Row */}
                    {/* Gamification Streak/XP Row (Rich App-Style Gradient Cards) */}
                    {!timerRunning && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {/* Tagesserie flame card (Red Gradient) */}
                        <div style={{
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          borderRadius: '20px',
                          padding: '16px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          position: 'relative',
                          overflow: 'hidden',
                          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)',
                          color: '#ffffff',
                          minHeight: '86px',
                          boxSizing: 'border-box'
                        }}>
                          <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            width: '30px',
                            height: '30px',
                            borderRadius: '10px',
                            background: 'rgba(255, 255, 255, 0.22)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Flame size={16} color="#ffffff" />
                          </div>
                          <div>
                            <span style={{ fontSize: '0.64rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.85)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                              Tagesserie
                            </span>
                          </div>
                          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '4px' }}>
                            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
                              {(stats?.streak_flame || avatar?.streak_flame || 0) === 1 ? '1 Tag' : `${stats?.streak_flame || avatar?.streak_flame || 0} Tage`}
                            </span>
                            {(() => {
                              const currentWeek = getISOWeekLocal(new Date());
                              const lastJokerWeek = profile?.joker_used_at ? getISOWeekLocal(new Date(profile.joker_used_at)) : null;
                              const usedJokersThisWeek = lastJokerWeek === currentWeek ? ((profile as any)?.weekly_jokers_used || 1) : 0;
                              const availableShields = Math.max(0, 3 - usedJokersThisWeek);
                              return (
                                <span style={{
                                  fontSize: '0.58rem',
                                  fontWeight: 800,
                                  background: 'rgba(255, 255, 255, 0.22)',
                                  backdropFilter: 'blur(6px)',
                                  WebkitBackdropFilter: 'blur(6px)',
                                  border: '1px solid rgba(255, 255, 255, 0.35)',
                                  color: '#ffffff',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }} title={`${availableShields}/3 Schutzschilde in KW ${currentWeek} bereit`}>
                                  <Shield size={9} fill={availableShields > 0 ? '#38bdf8' : 'none'} color="#ffffff" />
                                  <span>{availableShields}/3 Schilde</span>
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* XP points card (Purple/Indigo Gradient) */}
                        <div style={{
                          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                          borderRadius: '20px',
                          padding: '16px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          position: 'relative',
                          overflow: 'hidden',
                          boxShadow: '0 4px 14px rgba(99, 102, 241, 0.25)',
                          color: '#ffffff',
                          minHeight: '86px',
                          boxSizing: 'border-box'
                        }}>
                          <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            width: '30px',
                            height: '30px',
                            borderRadius: '10px',
                            background: 'rgba(255, 255, 255, 0.22)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Sparkles size={16} color="#ffffff" />
                          </div>
                          <div>
                            <span style={{ fontSize: '0.64rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.85)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                              Erfahrungspunkte
                            </span>
                          </div>
                          <div style={{ marginTop: '10px' }}>
                            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
                              {stats?.current_xp || 0} <span style={{ fontSize: '0.78rem', fontWeight: 800 }}>XP</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Focus Timer Session UI */}
                    {practiceLoggedToday ? (
                      renderPracticeLoggedDone()
                    ) : (
                      <div style={{
                        background: timerRunning 
                          ? (isExtraTime ? 'linear-gradient(135deg, #34a853 0%, #34a853 100%)' : '#000000') 
                          : '#ffffff',
                        border: timerRunning ? 'none' : '1px solid #e5e5ea',
                        borderRadius: '28px',
                        padding: '24px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '20px',
                        boxShadow: timerRunning ? 'none' : '0 4px 20px rgba(0,0,0,0.03)',
                        width: '100%',
                        boxSizing: 'border-box',
                        color: timerRunning ? '#ffffff' : 'inherit',
                        transition: 'all 0.5s ease'
                      }}>
                        {preStartCountdown !== null ? (
                          /* Pre-start Instructions & Countdown Screen */
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '24px',
                            textAlign: 'center',
                            padding: '40px 20px',
                            minHeight: '270px',
                            boxSizing: 'border-box'
                          }}>
                            <div style={{
                              fontSize: '4.8rem',
                              fontWeight: 900,
                              color: '#34c759',
                              fontFamily: 'monospace, sans-serif',
                              lineHeight: 1,
                              animation: 'pulseSoft 1.5s infinite ease-in-out'
                            }}>
                              {preStartCountdown}
                            </div>
                            <div>
                              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', margin: '0 0 10px 0', letterSpacing: '-0.02em' }}>
                                Handy hinlegen!
                              </h3>
                              <p style={{ fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 650, lineHeight: 1.5, margin: 0, maxWidth: '280px' }}>
                                Nicht den Tab oder das Programm wechseln.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: timerRunning ? 'rgba(255,255,255,0.6)' : '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                FOKUS-TIMER
                              </span>
                              <h3 style={{ margin: '2px 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: timerRunning ? '#ffffff' : '#000000', letterSpacing: '-0.02em' }}>
                                {!timerRunning ? 'Übesitzung starten' : (isPhoneFlat ? 'Fokus aktiv... 🎯' : 'Unterbrochen')}
                              </h3>
                            </div>

                            {/* Circular animated SVG progress ring */}
                            <div style={{ 
                              position: 'relative', 
                              width: '210px', 
                              height: '210px', 
                              filter: isExtraTime ? 'drop-shadow(0 0 12px rgba(52, 168, 83, 0.25))' : (timerRunning ? (isPhoneFlat ? 'drop-shadow(0 0 12px rgba(52, 168, 83, 0.15))' : 'drop-shadow(0 0 12px rgba(255, 59, 48, 0.2))') : 'none'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <svg width="210" height="210" viewBox="0 0 210 210" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="105" cy="105" r="95" fill="none" stroke={timerRunning ? 'rgba(255,255,255,0.12)' : '#f2f2f7'} strokeWidth="4" />
                                <circle 
                                  cx="105" 
                                  cy="105" 
                                  r="95" 
                                  fill="none" 
                                  stroke={isExtraTime ? '#ffffff' : (timerRunning ? (isPhoneFlat ? 'url(#greenGradientLanding)' : 'url(#redGradientLanding)') : 'url(#inactiveGradientLanding)')} 
                                  strokeWidth="4" 
                                  strokeDasharray={2 * Math.PI * 95}
                                  strokeDashoffset={
                                    !timerRunning && elapsedSeconds === 0
                                      ? 2 * Math.PI * 95 // Empty circle if not started
                                      : (isExtraTime 
                                          ? 0 // Full circle in extra time
                                          : 2 * Math.PI * 95 - (2 * Math.PI * 95 * Math.min(1, elapsedSeconds / (dailyGoal * 60))))
                                  }
                                  strokeLinecap="round"
                                  style={{ transition: isPhoneFlat ? 'stroke-dashoffset 1s linear, stroke 0.3s' : 'stroke 0.3s' }}
                                />
                                <defs>
                                  <linearGradient id="inactiveGradientLanding" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#e5e5ea" />
                                    <stop offset="100%" stopColor="#d1d1d6" />
                                  </linearGradient>
                                  <linearGradient id="greenGradientLanding" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#34c759" />
                                    <stop offset="100%" stopColor="#248a3d" />
                                  </linearGradient>
                                  <linearGradient id="redGradientLanding" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#ff3b30" />
                                    <stop offset="100%" stopColor="#c73e3a" />
                                  </linearGradient>
                                </defs>
                              </svg>
                              <div style={{
                                position: 'absolute',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <span style={{ fontSize: '3rem', fontWeight: 800, color: timerRunning ? '#ffffff' : '#000000', fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.02em', lineHeight: 1 }}>
                                  {!timerRunning && elapsedSeconds === 0 
                                    ? `${String(dailyGoal).padStart(2, '0')}:00`
                                    : formatTime(elapsedSeconds)
                                  }
                                </span>
                                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: timerRunning ? 'rgba(255,255,255,0.7)' : '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '6px' }}>
                                  {timerRunning 
                                    ? (isExtraTime ? 'Freies Üben' : (isPhoneFlat ? 'Üben Aktiv' : 'Unterbrochen')) 
                                    : 'Ziel Fokuszeit'
                                  }
                                </span>
                              </div>
                            </div>

                            {/* Gyro Sensor feedback - ONLY show when interrupted (not flat) to stay clean */}
                            {timerRunning && !isPhoneFlat && (
                              <div style={{
                                width: '100%',
                                maxWidth: '450px',
                                padding: '16px 20px',
                                borderRadius: '20px',
                                background: isExtraTime 
                                  ? 'rgba(255, 255, 255, 0.15)' 
                                  : 'rgba(255, 59, 48, 0.15)',
                                border: isExtraTime
                                  ? '1px solid rgba(255, 255, 255, 0.3)'
                                  : '1px solid rgba(255, 59, 48, 0.3)',
                                color: '#ffffff',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                textAlign: 'center',
                                lineHeight: 1.4,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
                              }}>
                                <div className={isExtraTime ? '' : 'animate-pulse'}>
                                  <strong style={{ fontSize: '0.9rem', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                                    {isExtraTime ? 'Fokus pausiert' : 'Fokus unterbrochen!'}
                                  </strong>
                                  <span style={{ fontSize: '0.78rem', opacity: 0.9 }}>
                                    {isExtraTime 
                                      ? (isDesktopFallback ? 'Wechsle zurück auf dieses Fenster, um weiter Extra-Zeit zu sammeln.' : 'Lege das Handy mit dem Display nach unten hin, um weiter Extra-Minuten zu sammeln.')
                                      : (isDesktopFallback ? 'Wechsle sofort zurück auf dieses Fenster! Sonst fällt dein Timer sofort auf 0 zurück.' : 'Lege das Handy mit dem Display nach unten hin! Sonst fällt dein Timer sofort auf 0 zurück.')}
                                  </span>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Controls */}
                        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                          {!timerRunning && elapsedSeconds === 0 ? (
                            <button
                              type="button"
                              onClick={handleStartTimer}
                              style={{
                                flex: 1,
                                padding: '16px',
                                borderRadius: '18px',
                                border: 'none',
                                background: '#34a853',
                                color: '#ffffff',
                                fontSize: '0.95rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 15px rgba(52, 168, 83, 0.15)'
                              }}
                            >
                              <Play size={16} fill="#ffffff" /> Fokus starten
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={handleFinishFocusSession}
                                style={{
                                  flex: 1,
                                  padding: '16px',
                                  borderRadius: '18px',
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #34c759 0%, #248a3d 100%)',
                                  color: '#ffffff',
                                  fontSize: '0.95rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  boxShadow: '0 4px 15px rgba(52, 168, 83, 0.15)'
                                }}
                              >
                                Beenden
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isExtraTime || elapsedSeconds >= dailyGoal * 60) {
                                    handleFinishFocusSession();
                                  } else {
                                    if (confirm('Möchtest du diese Session wirklich abbrechen? Der Fortschritt geht verloren.')) {
                                      setElapsedSeconds(0);
                                      setTimerRunning(false);
                                      setIsExtraTime(false);
                                    }
                                  }
                                }}
                                style={{
                                  flex: 1,
                                  padding: '16px',
                                  borderRadius: '18px',
                                  border: timerRunning ? '1.5px solid rgba(255,255,255,0.3)' : '1.5px solid #cbd5e1',
                                  background: 'transparent',
                                  color: timerRunning ? '#ffffff' : '#64748b',
                                  fontSize: '0.95rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px'
                                }}
                              >
                                Abbrechen
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : activeTab === 'homework' ? (
                  renderHomeworkWidget(false)
                ) : activeTab === 'settings' ? (
                  renderParentSettingsWidget()
                ) : (
                  renderLessonsWidget()
                )}</> : (
                  <>
                    {!timerRunning && renderSegmentedControl()}
                    {activeTab === 'lessons' ? renderLessonsWidget() : activeTab === 'settings' ? renderParentSettingsWidget() : renderHomeworkWidget(false)}
                  </>
                )}


              </div>
            )}

            {/* Secure Session Info Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.65rem',
              color: '#94a3b8',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginTop: '4px',
              paddingBottom: '12px'
            }}>
              <Shield size={12} color="#94a3b8" />
              <span>Sichere passwortlose Verbindung</span>
            </div>

            {/* Transparent Passive Privacy Notice - Apple HIG Design */}
            {profile.is_campus_active || profile.is_groovelab_active || profile.app_usage_mode === 'parent_hybrid' || profile.is_pin_activated ? (
              <div style={{
                margin: '4px 16px 12px 16px',
                padding: '8px 12px',
                borderRadius: '12px',
                background: '#e6f4ea',
                border: '1px solid #ceead6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '0.66rem',
                fontWeight: 800,
                color: '#137333'
              }}>
                <ShieldCheck size={14} color="#34a853" />
                <span>Vollzugriff aktiv (TLS 1.3 transportverschlüsselt & AES-256 datenbankgeschützt gem. DSGVO Art. 6 Abs. 1 lit. b)</span>
              </div>
            ) : (
              <div style={{
                margin: '4px 16px 12px 16px',
                padding: '10px 12px',
                borderRadius: '16px',
                background: 'rgba(248, 250, 252, 0.75)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                textAlign: 'left'
              }}>
                <ShieldCheck size={14} color="#34a853" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#334155', letterSpacing: '0.01em', marginBottom: '2px' }}>
                    Datenschutzhinweis (Kostenfreie Leseansicht)
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#64748b', lineHeight: 1.4, fontWeight: 500 }}>
                    Diese Ansicht dient der Übermittlung von Hausaufgaben und Unterrichtsterminen (Art. 6 Abs. 1 lit. b DSGVO). Interaktive Zusatzfunktionen (Audio-Loopstation &amp; Avatare) werden nach Freischaltung durch die Erziehungsberechtigten aktiviert.
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Spectrum Stripe */}
            {!timerRunning && <div style={{ height: '8px', width: '100%', background: studentSpectrumGradient, flexShrink: 0, marginTop: 'auto' }} />}

          </div>
        </div>

        {/* Focus Timer Overlays for student_only user */}
        {profile.app_usage_mode === 'student_only' && timerRunning && (
          <>
            {/* 1. Flat on Table Mode */}
            {false && isPhoneFlat && !isDesktopFallback && createPortal(
              <div 
                className="fokus-overlay-container"
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 9999,
                  background: '#000000', // AMOLED Black base
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  userSelect: 'none',
                  fontFamily: '"Plus Jakarta Sans", -apple-system, system-ui, sans-serif',
                  overflow: 'hidden'
                }}
              >
                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes timerBreathe {
                    0%, 100% { opacity: 0.8; text-shadow: 0 0 10px rgba(255,255,255,0.05); }
                    50% { opacity: 1; text-shadow: 0 0 20px rgba(255,255,255,0.2); }
                  }
                  .fokus-digits {
                    animation: timerBreathe 4s ease-in-out infinite;
                  }
                  .fokus-controls {
                    opacity: 0;
                    transform: translateY(10px);
                    transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                  }
                  .fokus-overlay-container:hover .fokus-controls {
                    opacity: 1;
                    transform: translateY(0);
                  }
                `}} />

                {/* Large Timer digits only */}
                <div className="fokus-digits" style={{
                  fontSize: 'clamp(5.5rem, 18vw, 10rem)',
                  fontWeight: 100,
                  fontFamily: 'system-ui, -apple-system, monospace',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  color: '#ffffff',
                  textAlign: 'center',
                  zIndex: 10
                }}>
                  {formatTime(elapsedSeconds)}
                </div>

                {/* Action buttons only visible on desktop fallback or hovered */}
                {(isDesktopFallback || true) && (
                  <div className="fokus-controls" style={{ 
                    position: 'absolute',
                    bottom: '60px',
                    display: 'flex', 
                    gap: '16px', 
                    zIndex: 100 
                  }}>
                    <button
                      type="button"
                      onClick={handleFinishFocusSession}
                      style={{
                        background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 28px',
                        borderRadius: '14px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        boxShadow: '0 4px 15px rgba(52, 168, 83, 0.2)',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      🏁 Beenden
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isExtraTime || elapsedSeconds >= dailyGoal * 60) {
                          handleFinishFocusSession();
                        } else {
                          if (confirm('Möchtest du diese Session wirklich abbrechen? Der Fortschritt geht verloren.')) {
                            setElapsedSeconds(0);
                            setTimerRunning(false);
                            setIsExtraTime(false);
                          }
                        }
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
                        padding: '12px 24px',
                        borderRadius: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                        e.currentTarget.style.transform = 'scale(1.03)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      Abbrechen
                    </button>
                  </div>
                )}
              </div>
            , document.body)}

            {/* 2. Grace Period Warning Overlay (when picked up / tab hidden) */}
            {isGraceActive && !isPhoneFlat && !isDesktopFallback && createPortal(
              <div 
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 10001, // Layered above the flat overlay
                  background: 'rgba(9, 9, 11, 0.72)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px',
                  color: '#ffffff',
                  userSelect: 'none',
                  fontFamily: '"Plus Jakarta Sans", -apple-system, system-ui, sans-serif'
                }}
              >
                <div style={{
                  width: '100%',
                  maxWidth: '340px',
                  background: 'rgba(24, 24, 27, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '32px',
                  padding: '40px 30px',
                  textAlign: 'center',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '24px'
                }}>
                  {/* Warning Sign */}
                  <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '22px',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fbbf24',
                    animation: 'pulseSoft 1.5s infinite'
                  }}>
                    <Shield size={32} style={{ animation: 'bounce 2s infinite' }} />
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.45rem', fontWeight: 850, color: '#f59e0b', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                      Fokus unterbrochen!
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#a1a1aa', fontWeight: 550, lineHeight: 1.5, margin: 0 }}>
                      {isDesktopFallback 
                        ? 'Wechsle sofort zurück auf diese Seite, um den Fokus fortzusetzen.'
                        : 'Lege das Handy wieder flach auf den Tisch, um den Fokus fortzusetzen.'}
                    </p>
                  </div>

                  {/* Big countdown number */}
                  <div style={{
                    fontSize: '4.8rem',
                    fontWeight: 800,
                    color: '#fbbf24',
                    fontFamily: 'monospace, sans-serif',
                    lineHeight: 1,
                    margin: '4px 0'
                  }}>
                    {graceSecondsLeft}
                  </div>

                  {/* Animated shrinking progress bar */}
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)',
                      width: `${graceSecondsLeft * 10}%`,
                      transition: 'width 1s linear',
                      borderRadius: '3px'
                    }} />
                  </div>

                  {/* Quick Action Buttons */}
                  <button
                    type="button"
                    onClick={handleFinishFocusSession}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      color: '#ffffff',
                      padding: '14px 20px',
                      borderRadius: '16px',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                  >
                    Fokus beenden & Sichern
                  </button>
                </div>
              </div>
            , document.body)}

          {/* 3. Anti-Cheat Checkpoint Overlay */}
            {showCheckpoint && createPortal(
              <div 
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 10002, // Topmost layer
                  background: 'rgba(9, 9, 11, 0.95)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px',
                  color: '#ffffff',
                  userSelect: 'none',
                  fontFamily: '"Plus Jakarta Sans", -apple-system, system-ui, sans-serif',
                  textAlign: 'center'
                }}
              >
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '24px',
                  maxWidth: '320px',
                  width: '100%'
                }}>
                  <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 24px rgba(52, 168, 83, 0.4)',
                    cursor: 'pointer',
                    animation: 'pulse 1.5s infinite'
                  }}
                  onClick={() => setShowCheckpoint(false)}
                  >
                    <span style={{ fontSize: '2.5rem' }}>🔥</span>
                  </div>
                  
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>
                      Bist du noch fokussiert?
                    </h3>
                    <p style={{ margin: '10px 0 0 0', fontSize: '0.875rem', color: '#a1a1aa', lineHeight: 1.5 }}>
                      Tippe schnell auf das Flammen-Symbol, um deine Session fortzusetzen!
                    </p>
                  </div>

                  <div style={{
                    fontSize: '1.75rem',
                    fontWeight: 900,
                    color: '#34a853',
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    {checkpointSecondsLeft}s
                  </div>
                </div>
              </div>
            , document.body)}
          </>
        )}

        {/* 4. Shoutbox (placed outside the Focus Timer condition so it works on appointments list) */}
        {activeChatOcc && createPortal(
          (() => {
            const teacherName = formatTeacherFullName(activeChatOcc.teacher);
            const titleText = `1:1 Shoutbox: ${teacherName}`;
            
            let isFrozen = false;
            try {
              const timePart = activeChatOcc.start_time.includes(':') ? activeChatOcc.start_time : `${activeChatOcc.start_time}:00`;
              const lessonDateTime = new Date(`${activeChatOcc.date}T${timePart}`);
              isFrozen = Date.now() > lessonDateTime.getTime() + 48 * 60 * 60 * 1000;
            } catch (e) {}

            let stammterminText: string | null = null;
            if (activeChatOcc) {
              let rawOrig = activeChatOcc.original_date || activeChatOcc.rescheduled_from;
              if (!rawOrig && activeChatOcc.notes) {
                const match = activeChatOcc.notes.match(/(\d{4}-\d{2}-\d{2})/);
                if (match) rawOrig = match[1];
              }
              if (rawOrig && rawOrig !== activeChatOcc.date) {
                try {
                  const clean = rawOrig.split('T')[0];
                  const parts = clean.split('-').map(Number);
                  let origDate: Date;
                  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
                    origDate = new Date(parts[0], parts[1] - 1, parts[2]);
                  } else {
                    origDate = new Date(rawOrig);
                  }
                  if (!isNaN(origDate.getTime())) {
                    const origDayName = origDate.toLocaleDateString('de-DE', { weekday: 'long' });
                    const origDateFormatted = origDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
                    stammterminText = `${origDayName}, ${origDateFormatted}`;
                  }
                } catch (e) {}
              }
            }

            return (
              <div
                onClick={() => setActiveChatOcc(null)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 11000,
                  background: 'rgba(15,23,42,0.65)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px',
                }}
              >
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    width: '100%',
                    maxWidth: '480px',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    maxHeight: '85vh'
                  }}
                >
                  {/* Header */}
                  <div style={{
                    background: stammterminText ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' : 'linear-gradient(135deg, #34a853 0%, #248a3d 100%)',
                    padding: '24px',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>💬</span> {titleText}
                      </h3>
                      
                      {stammterminText ? (
                        <div style={{ margin: '6px 0', color: 'rgba(255, 255, 255, 0.95)', fontSize: '0.76rem', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ textDecoration: 'line-through', opacity: 0.85, fontSize: '0.72rem' }}>
                            📍 Stammtermin (Original): {stammterminText}
                          </div>
                          <div style={{ fontWeight: 850, fontSize: '0.82rem' }}>
                            ➔ Verschoben auf: {new Date(activeChatOcc.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} um {activeChatOcc.start_time.substring(0, 5)} Uhr
                          </div>
                        </div>
                      ) : (
                        <p style={{ margin: '4px 0 6px 0', color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.75rem', fontWeight: 600 }}>
                          Termin am {new Date(activeChatOcc.date).toLocaleDateString('de-DE')} um {activeChatOcc.start_time.substring(0, 5)} Uhr
                        </p>
                      )}

                      {/* Badges & Schedule Button */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.2)',
                          color: '#ffffff',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          backdropFilter: 'blur(4px)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          whiteSpace: 'nowrap'
                        }}>
                          <ShieldCheck size={13} color="#ffffff" />
                          <span>100% DSGVO-konform • TLS 1.3 &amp; AES-256 verschlüsselt</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              if (activeChatOcc?.date) {
                                localStorage.setItem('campus_calendar_target_date', activeChatOcc.date);
                              }
                              setActiveChatOcc(null);
                              setActiveTab('lessons');
                              localStorage.setItem('campus_calendar_target_date', activeChatOcc.date);
                              localStorage.setItem('campus_active_tab', 'schedule');
                              localStorage.setItem('groovelab_active_tab', 'schedule');
                            }
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: '#ffffff',
                            color: stammterminText ? '#b45309' : '#15803d',
                            fontSize: '0.68rem',
                            fontWeight: 850,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                          }}
                        >
                          <Calendar size={12} color={stammterminText ? '#b45309' : '#15803d'} />
                          <span>Im Stundenplan anzeigen</span>
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveChatOcc(null)}
                      style={{
                        border: 'none',
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#ffffff',
                        transition: 'all 0.2s'
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Messages Viewport */}
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px',
                    background: '#fafbfc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    minHeight: '280px',
                    maxHeight: '400px'
                  }}>
                    {isFrozen && (
                      <div style={{ background: '#fef2f2', border: '1px solid #fee2f2', color: '#991b1b', padding: '8px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', textAlign: 'center' }}>
                        🔒 Shoutbox eingefroren (Schreibschutz nach 48h aktiv)
                      </div>
                    )}
                    {chatMessages.length === 0 ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#86868b', fontSize: '0.85rem', textAlign: 'center', padding: '32px', gap: '8px' }}>
                        <MessageSquare size={32} style={{ opacity: 0.3 }} />
                        <span>Noch keine Nachrichten für diesen Termin. Schreibe die erste Nachricht für Terminabsprachen.</span>
                      </div>
                    ) : (
                      chatMessages.map((msg, idx) => {
                        const isMe = msg.sender_id === profile.id;
                        return (
                          <div key={msg.id || idx} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            alignItems: isMe ? 'flex-end' : 'flex-start',
                            gap: '2px'
                          }}>
                            <div style={{
                              background: isMe ? '#e6f4ea' : '#ffffff',
                              color: '#0f172a',
                              padding: '10px 14px',
                              borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                              fontSize: '0.85rem',
                              lineHeight: 1.4,
                              wordBreak: 'break-word',
                              border: isMe ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
                            }}>
                              {msg.content}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px', marginTop: '4px' }}>
                                <span style={{ fontSize: '0.62rem', color: isMe ? '#15803d' : '#86868b' }}>
                                  {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isMe && <CheckCheck size={14} color="#15803d" style={{ marginLeft: '2px' }} />}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatMessagesEndRef} />
                  </div>

                  {/* Music Pedagogical Quick Reply Chips for Student */}
                  {!isFrozen && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      overflowX: 'auto',
                      padding: '10px 24px 4px 24px',
                      background: '#fafbfc',
                      borderTop: '1px solid #f1f5f9',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }}>
                      {/* 1-Click Direct Emoji Reaction Buttons */}
                      <div style={{ display: 'flex', gap: '4px', paddingRight: '6px', borderRight: '1px solid #e2e8f0' }}>
                        {['👍', '🎵', '👏', '🙏'].map((emoji, idx) => (
                          <button
                            key={`student-emoji-${idx}`}
                            type="button"
                            onClick={() => sendDirectChatMessage(emoji)}
                            style={{
                              padding: '4px 9px',
                              borderRadius: '100px',
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              fontSize: '0.88rem',
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                              flexShrink: 0
                            }}
                            className="hover-scale"
                            title={`Schnell-Reaktion ${emoji} senden`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>

                      {/* Student Authentic Text Phrases */}
                      {[
                        { label: 'Vielen Dank!', text: 'Vielen Dank!' },
                        { label: 'Alles klar, danke!', text: 'Alles klar, danke!' },
                        { label: 'Termin passt!', text: 'Der Termin passt für mich!' },
                        { label: 'Bin gleich da', text: 'Ich bin gleich da!' },
                        { label: 'Werde fleißig üben', text: 'Danke, ich werde fleißig üben!' }
                      ].map((phrase, idx) => (
                        <button
                          key={`student-phrase-${idx}`}
                          type="button"
                          onClick={() => setChatTypedMessage(phrase.text)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '100px',
                            background: '#ffffff',
                            border: '1px solid #bbf7d0',
                            color: '#15803d',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(52, 168, 83, 0.08)',
                            flexShrink: 0
                          }}
                          className="hover-scale"
                        >
                          {phrase.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleSendChatMessage} style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #f1f5f9',
                    background: '#f8fafc',
                    display: 'flex',
                    gap: '10px'
                  }}>
                    <input
                      type="text"
                      placeholder={isFrozen ? "Eingefroren..." : "Schreibe eine Nachricht..."}
                      disabled={isFrozen}
                      value={chatTypedMessage}
                      onChange={e => setChatTypedMessage(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        background: isFrozen ? '#f1f5f9' : '#ffffff',
                        fontSize: '0.85rem',
                        outline: 'none',
                        fontWeight: 650
                      }}
                    />
                    {isCanceled ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleUndoCancel(activeChatOcc);
                          setActiveChatOcc(null);
                        }}
                        style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          borderRadius: '12px',
                          padding: '10px 16px',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        Reaktivieren
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          handleCancelOccurrence(activeChatOcc);
                          setActiveChatOcc(null);
                        }}
                        style={{
                          background: '#ef4444',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '10px 16px',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        Absagen
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isFrozen || !chatTypedMessage.trim()}
                      style={{
                        background: isFrozen || !chatTypedMessage.trim() ? '#cbd5e1' : 'linear-gradient(135deg, #34a853, #248a3d)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '10px 16px',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        cursor: isFrozen || !chatTypedMessage.trim() ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      Senden
                    </button>
                  </form>
                </div>
              </div>
            );
          })(),
          document.body
        )}
      </div>
    );
  }

  return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  fullScreen: {
    position: 'fixed' as const,
    inset: 0,
    background: '#f2f2f7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Outfit', 'Urbanist', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', sans-serif",
    padding: '20px',
    overflowY: 'auto' as const,
  },
  card: {
    background: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '28px',
    width: '100%',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.02)',
    border: '1.5px solid rgba(255, 255, 255, 0.5)',
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    boxSizing: 'border-box' as const,
  },
  brandFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '0.7rem',
    color: '#94a3b8',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginTop: '4px',
  },
  loadingDot: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '3px solid #e2e8f0',
    borderTopColor: '#34a853',
    animation: 'spin 0.8s linear infinite',
  },
  spinnerInline: {
    display: 'inline-block',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    border: '2px solid rgba(0,0,0,0.15)',
    borderTopColor: '#0f172a',
    animation: 'spin 0.8s linear infinite',
  },
  chip: (bg: string, color: string) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    background: bg,
    color: color,
    fontSize: '0.72rem',
    fontWeight: 800,
    padding: '5px 12px',
    borderRadius: '100px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  }),
};

const CassetteIcon: React.FC<{ isPlaying: boolean; color?: string }> = ({ isPlaying, color = 'currentColor' }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      width="20" 
      height="20" 
      fill="none" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      style={{
        display: 'block',
        flexShrink: 0
      }}
    >
      {/* Outer Cassette Shell */}
      <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="1.8" />
      {/* Bottom Trapezoid (exposed tape run) */}
      <path d="M6 17 L7.5 20.5 L16.5 20.5 L18 17" strokeWidth="1.5" />
      {/* Center label sticker area */}
      <rect x="4.5" y="5.5" width="15" height="9" rx="1" strokeWidth="1.2" opacity="0.85" />
      {/* The clear plastic window in the middle */}
      <rect x="7.5" y="7.5" width="9" height="5" rx="0.5" strokeWidth="1" opacity="0.8" />
      {/* Left rotating reel */}
      <g style={{ transformOrigin: '10px 10px', animation: isPlaying ? 'spin-clockwise 3s linear infinite' : 'none' }}>
        <circle cx="10" cy="10" r="1.8" strokeWidth="1.2" />
        <path d="M10 8.2 L10 11.8 M8.2 10 L11.8 10" strokeWidth="1" />
      </g>
      {/* Right rotating reel */}
      <g style={{ transformOrigin: '14px 10px', animation: isPlaying ? 'spin-clockwise 3s linear infinite' : 'none' }}>
        <circle cx="14" cy="10" r="1.8" strokeWidth="1.2" />
        <path d="M14 8.2 L14 11.8 M12.2 10 L15.8 10" strokeWidth="1" />
      </g>
      {/* Small details: screw holes in corners */}
      <circle cx="3.5" cy="4.5" r="0.4" fill={color} stroke="none" opacity="0.6" />
      <circle cx="20.5" cy="4.5" r="0.4" fill={color} stroke="none" opacity="0.6" />
      <circle cx="3.5" cy="15.5" r="0.4" fill={color} stroke="none" opacity="0.6" />
      <circle cx="20.5" cy="15.5" r="0.4" fill={color} stroke="none" opacity="0.6" />
      {/* Tape rolls inside window */}
      <circle cx="10" cy="10" r="3" strokeWidth="0.8" strokeDasharray="1 1" opacity="0.45" />
      <circle cx="14" cy="10" r="2.8" strokeWidth="0.8" strokeDasharray="1 1" opacity="0.45" />
    </svg>
  );
};

const InlineAudioPlayer: React.FC<{ url: string; label: string; onDelete?: () => void }> = ({ url, label, onDelete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    if (audio.duration && isFinite(audio.duration)) {
      setDuration(Math.round(audio.duration));
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [url]);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #2c2a29 0%, #1a1817 100%)',
      borderRadius: '16px',
      padding: '16px',
      width: '320px',
      border: '4px solid #0f0e0d',
      boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      fontFamily: 'monospace',
      color: '#fff',
      alignSelf: 'center',
      position: 'relative',
      userSelect: 'none'
    }}>
      <audio ref={audioRef} src={url} />
      
      {/* 4 Screws in corners */}
      <div style={{ position: 'absolute', top: '4px', left: '4px', width: '3px', height: '3px', borderRadius: '50%', background: '#64748b', opacity: 0.8 }} />
      <div style={{ position: 'absolute', top: '4px', right: '4px', width: '3px', height: '3px', borderRadius: '50%', background: '#64748b', opacity: 0.8 }} />
      <div style={{ position: 'absolute', bottom: '4px', left: '4px', width: '3px', height: '3px', borderRadius: '50%', background: '#64748b', opacity: 0.8 }} />
      <div style={{ position: 'absolute', bottom: '4px', right: '4px', width: '3px', height: '3px', borderRadius: '50%', background: '#64748b', opacity: 0.8 }} />

      {/* Cassette Top Notch/Details */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', gap: '10px', marginTop: '1px' }}>
        <div style={{ width: '8px', height: '2px', background: '#334155', borderRadius: '0.5px' }} />
        <div style={{ width: '18px', height: '2px', background: '#334155', borderRadius: '0.5px' }} />
        <div style={{ width: '8px', height: '2px', background: '#334155', borderRadius: '0.5px' }} />
      </div>

      {/* Sticker Label Area */}
      <div style={{
        background: 'linear-gradient(to bottom, #dbeafe 0%, #eff6ff 100%)',
        border: '2px solid #000',
        borderRadius: '6px',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        position: 'relative'
      }}>
        <div style={{ height: '3px', background: '#ef4444', width: '100%' }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.62rem', color: '#1e3a8a', fontWeight: 900 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
            {label.toUpperCase()}
          </span>
          <span>{Math.round(currentTime)}s / {duration || '9'}s</span>
        </div>

        <div style={{
          background: '#000',
          borderRadius: '4px',
          height: '28px',
          margin: '4px 0',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '0 20px',
          position: 'relative'
        }}>
          <div 
            className={isPlaying ? 'spinning' : ''}
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#94a3b8',
              border: '3px dashed #334155',
              animation: isPlaying ? 'spin 4s linear infinite' : 'none'
            }} 
          />
          <div 
            className={isPlaying ? 'spinning' : ''}
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#94a3b8',
              border: '3px dashed #334155',
              animation: isPlaying ? 'spin 4s linear infinite' : 'none'
            }} 
          />
        </div>
      </div>

      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => togglePlay()}
          style={{
            background: '#d97706',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '0.72rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
              <rect x="5" y="5" width="4" height="14" rx="1" />
              <rect x="15" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
          <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              setIsPlaying(false);
              setCurrentTime(0);
            }
          }}
          style={{
            background: '#475569',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '0.72rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <rect x="5" y="5" width="14" height="14" rx="1.5"/>
          </svg>
          <span>STOP</span>
        </button>

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
            </svg>
            <span>LÖSCHEN</span>
          </button>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};

// Aliases for Active vs Inactive student pass views
export const QRLandingPageActive = QRLandingPage;
export const QRLandingPageInactive = QRLandingPage;
export const QRLandingPage2 = QRLandingPage;

