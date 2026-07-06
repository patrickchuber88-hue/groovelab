import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Music, Shield, Clock, CheckCircle, AlertTriangle, Flame, Zap, /* Car, */ Calendar, MapPin, User, Check, Sparkles, Play, Pause, BookOpen, X, FileText, ArrowLeft, Mail, CreditCard, Lock, Settings, Key, Users, Trophy, MessageSquare, Timer } from 'lucide-react';
import { createPortal } from 'react-dom';

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
  if (inst.includes('querflöte') || inst.includes('flute')) return '/avatars/querfloete_avatar.png';
  if (inst.includes('saxofon') || inst.includes('saxophone') || inst.includes('sax')) return '/avatars/saxophon_avatar_new.png';
  if (inst.includes('blockflöte') || inst.includes('recorder') || inst.includes('blockfloete')) return '/avatars/blockfloete_avatar.png';
  if (inst.includes('bariton') || inst.includes('baritone')) return '/avatars/bariton_avatar.png';
  if (inst.includes('oboe')) return '/avatars/oboe_avatar.png';
  return '/avatars/gitarre_avatar_new.png';
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
  parent_allow_chat?: boolean;
  parent_allow_timer?: boolean;
  parent_allow_leaderboard?: boolean;
  parent_allow_groups?: boolean;
  parent_allow_proposals?: boolean;
}

export function QRLandingPage({ token }: QRLandingPageProps) {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const redirectToCampus = async (userData: { id: string; role: string; roles?: string[] }) => {
    const rolesArray = Array.isArray(userData.roles) ? userData.roles : [];
    const hasAdminRole = rolesArray.includes('admin');
    const hasSecretaryRole = rolesArray.includes('secretary');
    const isAdminOrSecretary = userData.role === 'admin' || userData.role === 'secretary' || hasAdminRole || hasSecretaryRole;

    if (isAdminOrSecretary) {
      const finalAdminRole = hasAdminRole ? 'admin' : 'secretary';
      if (userData.role !== finalAdminRole) {
        await supabase.from('users').update({ role: finalAdminRole }).eq('id', userData.id);
      }
      localStorage.setItem('groovelab_active_workspace', 'secretary');
    }

    // Force check out from active sessions on Campus login to prevent automatic check-in visibility
    await supabase.from('sessions').update({ check_out_time: new Date().toISOString() }).eq('user_id', userData.id).is('check_out_time', null);

    localStorage.setItem('groovelab_user_id', userData.id);
    sessionStorage.setItem('groovelab_user_id', userData.id);
    sessionStorage.setItem('groovelab_qr_token', token);
    localStorage.setItem('groovelab_active_platform', 'campus');
    localStorage.setItem('campus_active_tab', 'briefing');
    window.location.replace('/');
  };

  // Admin Mobile Stats
  const [adminStats, setAdminStats] = useState({ activeStudents: 0, activeTeachers: 0, pendingActivations: 0 });
  const [loadingAdminStats, setLoadingAdminStats] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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

  // PIN-Eingabe
  const [pinInput, setPinInput] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinAttempts, setPinAttempts] = useState(0);
  const MAX_ATTEMPTS = 3;

  // Student Dashboard & Gamification States
  const [schedules, setSchedules] = useState<any[]>([]);
  const [occurrences, setOccurrences] = useState<any[]>([]);
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
  const [activeTab, setActiveTab] = useState<'action' | 'homework'>('action');
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  const [parentUnlocked, setParentUnlocked] = useState(false);
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

  const handleSaveInitialPin = async () => {
    if (!profile) return;
    if (newPinInput.length !== 4 || newPinConfirm.length !== 4) {
      alert('Die PIN muss 4 Ziffern lang sein.');
      return;
    }
    if (newPinInput !== newPinConfirm) {
      alert('Die PINs stimmen nicht überein.');
      return;
    }
    if (newPinInput === '0000') {
      alert('Die PIN darf nicht „0000“ sein.');
      return;
    }
    setPinChangeLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ parent_pin: newPinInput })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, has_parent_pin: true } : null);
      setIsInitialPinSetup(false);
      setParentUnlocked(true);
      setShowPinPrompt(false);
      setNewPinInput('');
      setNewPinConfirm('');
      alert('Erfolgreich! Deine persönliche Eltern-PIN wurde gespeichert.');
    } catch (err: any) {
      console.error('Failed to save parent PIN:', err);
      alert('Fehler beim Speichern der PIN: ' + err.message);
    } finally {
      setPinChangeLoading(false);
    }
  };

  const [preStartCountdown, setPreStartCountdown] = useState<number | null>(null);
  const preStartCountdownRef = useRef(preStartCountdown);
  useEffect(() => {
    preStartCountdownRef.current = preStartCountdown;
  }, [preStartCountdown]);

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

        // Vorab Namen des Schülers holen
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, first_name, last_name, role, roles, school_id, is_campus_active, is_groovelab_active, app_usage_mode, joker_used_at, created_at, is_pin_activated, instrument, photo_url, is_trial, trial_ends_at, exempt_from_direct_billing, has_parent_pin, parent_allow_chat, parent_allow_timer, parent_allow_leaderboard, parent_allow_groups, parent_allow_proposals')
          .eq('qr_token', token)
          .single();

        if (userError || !userData) {
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

        if (!hasCampusSub && !hasGroovelabSub && !isTrial) {
          setErrorMsg('Der Zugang für diese Musikschule ist aktuell nicht aktiv (Setup-Modus).');
          setPageState('error');
          return;
        }

        const isInactive = !userData.is_campus_active && !userData.is_groovelab_active;
        const isLocked = isInactive && userData.is_pin_activated;

        if (isLocked) {
          sessionStorage.removeItem('groovelab_qr_token');
          setErrorMsg('Dieses Profil wurde nach 3 PIN-Fehlversuchen aus Sicherheitsgründen gesperrt. Bitte wende dich an deine Musikschule.');
          setPageState('error');
          return;
        }

        setProfile({
          id: userData.id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          instrument: userData.instrument || null,
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
          has_parent_pin: userData.has_parent_pin ?? false,
          parent_allow_chat: userData.parent_allow_chat ?? true,
          parent_allow_timer: userData.parent_allow_timer ?? true,
          parent_allow_leaderboard: userData.parent_allow_leaderboard ?? true,
          parent_allow_groups: userData.parent_allow_groups ?? true,
          parent_allow_proposals: userData.parent_allow_proposals ?? true
        });

        if (isInactive) {
          sessionStorage.setItem('groovelab_qr_token', token);
          setPageState('inactive_landing');
          return;
        }

        // Prüfen ob Gerät bereits bekannt ist
        const alreadyPaired = isPairedForToken(token);

        if (alreadyPaired) {
          await redirectToCampus(userData);
        } else {
          // Neues Gerät → Device-Pairing prüfen via RPC
          const deviceKey = getOrCreateDeviceKey();
          const { data, error } = await supabase.rpc('check_qr_device', {
            p_qr_token: token,
            p_device_key: deviceKey,
          });

          if (error) throw error;

          if (data?.paired === true) {
            markPairedForToken(token);
            await redirectToCampus(userData);
          } else {
            sessionStorage.removeItem('groovelab_qr_token');
            setPageState('pin_required');
          }
        }
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

  // ── Dashboard-Daten laden ──────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    if ((pageState !== 'profile' && pageState !== 'inactive_landing') || !profile) return;
    setLoadingDashboard(true);
    try {
      const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone

      // Fetch all dashboard data in parallel for optimal performance
      const [
        schRes,
        occRes,
        statsRes,
        avatarRes,
        matrixRes
      ] = await Promise.all([
        supabase
          .from('schedules')
          .select(`
            *,
            teacher:teacher_id(first_name, last_name),
            room:room_id(name)
          `)
          .eq('student_id', profile.id),
        supabase
          .from('schedule_occurrences')
          .select(`
            *,
            teacher:teacher_id(first_name, last_name),
            schedule:schedule_id(room:room_id(name))
          `)
          .eq('student_id', profile.id)
          .gte('date', todayStr)
          .order('date', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase
          .from('student_stats')
          .select('*')
          .eq('student_id', profile.id)
          .maybeSingle(),
        supabase
          .from('avatars')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle(),
        supabase
          .from('progress_matrix')
          .select('*')
          .eq('student_id', profile.id)
          .order('updated_at', { ascending: false })
      ]);

      const schData = schRes.data;
      const occData = occRes.data;
      const statsData = statsRes.data;
      const avatarData = avatarRes.data;
      const matrixItems = matrixRes.data;

      // Deduplicate matrixItems by topic_name (latest wins)
      const uniqueMatrixItemsMap = new Map<string, any>();
      (matrixItems || []).forEach((item: any) => {
        const name = (item.topic_name || '').trim().toLowerCase();
        if (name && !uniqueMatrixItemsMap.has(name)) {
          uniqueMatrixItemsMap.set(name, item);
        }
      });
      const deduplicatedMatrixItems = Array.from(uniqueMatrixItemsMap.values());

      setSchedules(schData || []);
      setOccurrences(occData || []);
      setStats(statsData || null);
      setAvatar(avatarData || null);
      setProgressItems(deduplicatedMatrixItems);

      if (statsData && statsData.last_practice_date === todayStr) {
        setPracticeLoggedToday(true);
        // Get today's logged minutes
        const { data: latestLog } = await supabase
          .from('fokus_logs')
          .select('duration_minutes')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestLog) {
          setLoggedMinutesToday(latestLog.duration_minutes);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoadingDashboard(false);
    }
  }, [pageState, profile]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Realtime synchronization for teacher homework edits
  useEffect(() => {
    if (pageState !== 'profile' || !profile?.id) return;

    const channel = supabase.channel(`realtime_student_progress_${profile.id}`);
    channel
      .on('broadcast', { event: 'homework-changed' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const handleHomeworkUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.studentId === profile.id) {
        fetchDashboardData();
      }
    };
    window.addEventListener('homework-updated', handleHomeworkUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('homework-updated', handleHomeworkUpdate);
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
    const colors = ['#fbbf24', '#10b981', '#6366f1', '#ec4899', '#3b82f6', '#f59e0b', '#a855f7'];

    const drawStar = (c: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
      let rot = Math.PI / 2 * 3;
      let x = cx;
      let y = cy;
      let step = Math.PI / spikes;

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
  const handleQuickLogPractice = async (focusMinutes: number, extraMinutes: number = 0) => {
    if (practiceLoggedToday || !profile || loadingDashboard) return;
    setLoadingDashboard(true);

    try {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-CA');
      const minutes = focusMinutes + extraMinutes;

      // Aktuelle Stats abrufen
      const { data: currentStats } = await supabase
        .from('student_stats')
        .select('*')
        .eq('student_id', profile.id)
        .maybeSingle();

      const currentStreak = currentStats?.streak_flame || 0;
      let newStreak = 1;
      let usedJokerThisSession = false;

      let lastSecuredDate = currentStats?.last_practice_date || null;
      if (profile?.joker_used_at) {
        const jokerDateStr = new Date(profile.joker_used_at).toLocaleDateString('en-CA');
        if (!lastSecuredDate || jokerDateStr > lastSecuredDate) {
          lastSecuredDate = jokerDateStr;
        }
      }
      if (!lastSecuredDate && profile?.created_at) {
        lastSecuredDate = new Date(profile.created_at).toLocaleDateString('en-CA');
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
          
          const currentWeek = getISOWeekLocal(new Date());
          const lastJokerWeek = profile?.joker_used_at ? getISOWeekLocal(new Date(profile.joker_used_at)) : null;
          const isJokerAvailable = !profile?.joker_used_at || lastJokerWeek !== currentWeek;

          let unprotectedMissedDays = totalMissedDays;
          if (isJokerAvailable) {
            unprotectedMissedDays = totalMissedDays - 1;
            usedJokerThisSession = true;
          }

          const decayedStreak = Math.max(0, currentStreak - unprotectedMissedDays);
          newStreak = decayedStreak + 1;
        }
      } else {
        newStreak = 1;
      }

      const totalMins = (currentStats?.total_focus_minutes || 0) + minutes;
      const monthlyMins = (currentStats?.monthly_focus_minutes || 0) + minutes;
      const newXp = (currentStats?.current_xp || 0) + minutes;
      const flameLevelName = newStreak >= 9 ? 'Helden-Feuer' : (newStreak >= 4 ? 'Mittlere Flamme' : 'Kleine Flamme');

      // 1. Fokus-Protokoll schreiben (aufgeteilt in Fokus und Extra)
      if (focusMinutes > 0) {
        await supabase.from('fokus_logs').insert({
          user_id: profile.id,
          duration_minutes: focusMinutes,
          duration_seconds: focusMinutes * 60,
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

      // 2. Statistiken aktualisieren (student_stats)
      await supabase.from('student_stats').upsert({
        student_id: profile.id,
        total_focus_minutes: totalMins,
        monthly_focus_minutes: monthlyMins,
        streak_flame: newStreak,
        last_practice_date: todayStr,
        current_xp: newXp,
        updated_at: new Date().toISOString()
      });

      // 3. Avatar-Tabelle updaten
      const { data: avatarRecord } = await supabase
        .from('avatars')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (avatarRecord) {
        await supabase.from('avatars').update({
          xp: newXp,
          streak_flame: newStreak,
          last_focus_date: todayStr
        }).eq('id', avatarRecord.id);
      }

      if (usedJokerThisSession) {
        await supabase.from('users').update({
          joker_used_at: new Date().toISOString()
        }).eq('id', profile.id);
        profile.joker_used_at = new Date().toISOString();
      }

      playSuccessChime();

      setStats({
        student_id: profile.id,
        total_focus_minutes: totalMins,
        monthly_focus_minutes: monthlyMins,
        streak_flame: newStreak,
        last_practice_date: todayStr,
        current_xp: newXp
      });
      if (avatarRecord) {
        setAvatar({
          ...avatarRecord,
          xp: newXp,
          streak_flame: newStreak,
          last_focus_date: todayStr
        });
      }
      setLoggedMinutesToday(minutes);
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
    if (elapsedSeconds < 5) {
      alert("Übe mindestens ein paar Sekunden, um deine Session zu speichern!");
      return;
    }
    const targetSeconds = dailyGoal * 60;
    let focusMinutes = 0;
    let extraMinutes = 0;
    
    const totalMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const targetMinsVal = dailyGoal;
    
    if (totalMinutes >= targetMinsVal) {
      focusMinutes = targetMinsVal;
      extraMinutes = totalMinutes - targetMinsVal;
    } else {
      focusMinutes = totalMinutes;
      extraMinutes = 0;
    }

    await handleQuickLogPractice(focusMinutes, extraMinutes);
    setElapsedSeconds(0);
    setTimerRunning(false);
    setIsExtraTime(false);
  };

  const handleStartTimer = async () => {
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

    if (usesSensors && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          setPreStartCountdown(3);
          setTimerRunning(true);
        } else {
          alert("Damit die Anti-Schummel-Erkennung funktioniert, benötigen wir Sensor-Zugriff! 📱");
        }
      } catch (err) {
        console.error("iOS Sensor Permission error:", err);
        setPreStartCountdown(3);
        setTimerRunning(true);
      }
    } else {
      setPreStartCountdown(3);
      setTimerRunning(true);
    }
  };

  // ── PIN-Eingabe: Ziffern-Eingabe-Handler ─────────────────────────────────
  const handlePinDigit = (digit: string) => {
    if (pinInput.length < 2) {
      setPinInput(prev => prev + digit);
    }
  };

  const handlePinDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  const handlePinSubmit = async () => {
    if (!pinInput || pinLoading) return;
    if (pinAttempts >= MAX_ATTEMPTS) {
      setPinError(`Zu viele Fehlversuche. Bitte wende dich an deine Schule.`);
      return;
    }

    setPinLoading(true);
    setPinError(null);

    try {
      const deviceKey = getOrCreateDeviceKey();
      const { data, error } = await supabase.rpc('verify_qr_device', {
        p_qr_token: token,
        p_pin: pinInput,
        p_device_key: deviceKey,
      });

      if (error) throw error;

      if (data?.success === true) {
        markPairedForToken(token);
        if (profile) {
          await redirectToCampus(profile);
        }
      } else if (data?.error === 'no_birth_date') {
        setPinError('Kein Geburtstag hinterlegt. Bitte wende dich an deine Schule.');
        setPinInput('');
      } else if (data?.error === 'user_not_found') {
        setPinError('Dieser QR-Code ist ungültig.');
        setPinInput('');
      } else {
        const remaining = MAX_ATTEMPTS - (pinAttempts + 1);
        setPinAttempts(prev => prev + 1);
        if (remaining <= 0) {
          setPinError('Zu viele Fehlversuche. Dieses Konto wurde aus Sicherheitsgründen gesperrt. Bitte wende dich an deine Schule.');
          if (profile?.id) {
            await supabase
              .from('users')
              .update({ is_campus_active: false, is_groovelab_active: false })
              .eq('id', profile.id);
          }
        } else {
          setPinError(`Falsche PIN. Noch ${remaining} Versuch${remaining === 1 ? '' : 'e'}.`);
        }
        setPinInput('');
      }
    } catch (err: any) {
      console.error('[QRLanding] verify_qr_device error:', err);
      setPinError('Verbindungsfehler. Bitte versuche es erneut.');
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

  const renderHomeworkWidget = () => {
    const lessonDay = schedules.length > 0 ? schedules[0].day_of_week : 1;
    const latestItem = progressItems.find(item => item.is_current_homework || item.topic_name.startsWith('Hausaufgabe KW '));
    const latestWeek = latestItem ? getItemWeek(latestItem) : getISOWeek(undefined, lessonDay);
    const notesList = getHomeworkNotes(latestWeek);
    const activeHWs = progressItems.filter(item => 
      item.is_current_homework && 
      !item.topic_name.startsWith('Hausaufgabe KW ')
    );
    
    const groupedLehrwerke: Record<string, { num: number; notes: string }[]> = {};
    const otherHWs: any[] = [];

    activeHWs.forEach(item => {
      if (item.topic_name.includes(' - Seite ')) {
        const parts = item.topic_name.split(' - Seite ');
        const bookTitle = parts[0].trim();
        const pageNum = parseInt(parts[1], 10);
        if (!groupedLehrwerke[bookTitle]) {
          groupedLehrwerke[bookTitle] = [];
        }
        if (!isNaN(pageNum) && !groupedLehrwerke[bookTitle].some(p => p.num === pageNum)) {
          groupedLehrwerke[bookTitle].push({ num: pageNum, notes: item.teacher_notes || '' });
        }
      } else {
        otherHWs.push(item);
      }
    });

    const activeBooks = Object.entries(groupedLehrwerke);

    if (activeBooks.length === 0 && otherHWs.length === 0 && notesList.length === 0) {
      return (
        <div style={{
          background: '#f8fafc',
          border: '1.5px dashed #cbd5e1',
          borderRadius: '24px',
          padding: '24px',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic', fontWeight: 650 }}>
            Keine aktuellen Hausaufgaben erfasst ✨
          </p>
        </div>
      );
    }

    const hasAnyHWItems = activeBooks.length > 0 || otherHWs.length > 0;

    return (
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '24px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#4f46e5', background: '#e0e7ff', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
            Hausaufgaben
          </span>
        </div>

        {activeBooks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeBooks.map(([bookTitle, pages]) => {
              const formattedPages = formatPageNumbers(pages.map(p => p.num));
              const textNotes = pages
                .map(p => p.notes)
                .filter(Boolean)
                .filter(n => n !== 'Inhalte in der Premium-Version freischalten' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:'))
                .join('; ');
              return (
                <div key={bookTitle} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                    📖 {bookTitle}
                  </span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6366f1', marginLeft: '22px' }}>
                    {formattedPages}
                  </span>
                  {textNotes && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginLeft: '22px' }}>
                      Bemerkung: {textNotes}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {otherHWs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: activeBooks.length > 0 ? '1px solid #f1f5f9' : 'none', paddingTop: activeBooks.length > 0 ? '12px' : 0 }}>
            {otherHWs.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                  🎵 {item.topic_name}
                </span>
                {item.teacher_notes && (
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginLeft: '22px' }}>
                    Bemerkung: {item.teacher_notes}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {notesList.length > 0 && (() => {
          let audioCount = 0;
          const filteredNotes = notesList.filter(note => !note.startsWith("STICKER:"));
          if (filteredNotes.length === 0) return null;
          
          return (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              borderTop: hasAnyHWItems ? '1px solid #f1f5f9' : 'none',
              paddingTop: hasAnyHWItems ? '12px' : 0
            }}>
              {filteredNotes.map((note, idx) => {
                const isAudio = note.startsWith("AUDIO:");
                if (isAudio) {
                  audioCount++;
                  const parts = note.substring(6).split('|');
                  return (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <InlineAudioPlayer url={parts[0]} label={parts[3] || `Play-Along #${audioCount}`} />
                    </div>
                  );
                }
                return (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#fbbf24', fontSize: '0.9rem', lineHeight: '1.2rem' }}>📌</span>
                    <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 650, lineHeight: '1.3rem' }}>
                      {note}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    );
  };

  const renderLessonInfoCard = (lesson: any, isToday: boolean) => {
    if (isToday && lesson) {
      return (
        <div style={{
          background: '#f8fafc',
          border: '1.5px solid #e2e8f0',
          borderRadius: '20px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#16a34a', background: '#dcfce7', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
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
                Bei {lesson.teacher ? `${lesson.teacher.first_name} ${lesson.teacher.last_name}` : 'Lehrkraft'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin size={16} color="#64748b" />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>
                {lesson.room_name}
              </span>
            </div>
          </div>

          {/* Chauffeur info toggle (deactivated for now)
          <button
            type="button"
            onClick={handleDriverCycle}
            style={{
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              border: '1.5px solid #bfdbfe',
              borderRadius: '16px',
              padding: '12px 14px',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              transition: 'transform 0.15s, border-color 0.2s',
              fontFamily: 'inherit',
              outline: 'none',
              marginTop: '4px'
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = ''}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Car size={16} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '0.58rem', fontWeight: 900, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Wer fährt heute?
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e3a8a', marginTop: '1px' }}>
                {activeDriver === 'Du' ? 'Du fährst heute! 🚗' : `${activeDriver} fährt heute! 🚗`}
              </div>
            </div>
          </button>
          */}
        </div>
      );
    }

    // Standard Unterrichtstermin
    const daysGerman = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    const nextSchedule = schedules[0];
    if (nextSchedule) {
      return (
        <div style={{
          background: '#f8fafc',
          border: '1.5px solid #e2e8f0',
          borderRadius: '20px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#475569', background: '#e2e8f0', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
              Dein Unterrichtstermin
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={16} color="#64748b" />
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
                {daysGerman[nextSchedule.day_of_week]}s um {nextSchedule.time_slot?.substring(0, 5)} Uhr
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={16} color="#64748b" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                Bei {nextSchedule.teacher ? `${nextSchedule.teacher.first_name} ${nextSchedule.teacher.last_name}` : 'Lehrkraft'}
              </span>
            </div>
            {nextSchedule.room?.name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MapPin size={16} color="#64748b" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                  {nextSchedule.room.name}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderSegmentedControl = () => {
    const isParentMode = profile?.app_usage_mode === 'parent_hybrid';
    return (
      <div style={{
        display: 'flex',
        background: '#e3e3e8',
        borderRadius: '12px',
        padding: '2px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('action')}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: 'none',
            borderRadius: '10px',
            background: activeTab === 'action' ? '#ffffff' : 'transparent',
            color: activeTab === 'action' ? '#000000' : '#636366',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'action' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: activeTab === 'action' ? '0px 3px 8px rgba(0,0,0,0.12), 0px 3px 1px rgba(0,0,0,0.04)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          {isParentMode ? '👪 Schnell-Eingabe' : '📱 Üben'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('homework')}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: 'none',
            borderRadius: '10px',
            background: activeTab === 'homework' ? '#ffffff' : 'transparent',
            color: activeTab === 'homework' ? '#000000' : '#636366',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'homework' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: activeTab === 'homework' ? '0px 3px 8px rgba(0,0,0,0.12), 0px 3px 1px rgba(0,0,0,0.04)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          📚 Hausaufgaben
        </button>
      </div>
    );
  };

  const renderPracticeLoggedDone = () => {
    const isGoalMet = loggedMinutesToday >= dailyGoal;

    return (
      <div style={{
        background: '#f0fdf4',
        border: '1.5px solid #bbf7d0',
        borderRadius: '24px',
        padding: '28px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        textAlign: 'center',
        boxShadow: '0 10px 25px rgba(22, 163, 74, 0.06)',
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
              stroke="#e2e8f0"
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
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
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
              Tage Streak
            </span>
          </div>
        </div>

        {/* Text descriptions */}
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#14532d' }}>
            {isGoalMet ? 'Tagesziel erreicht! 🎉' : 'Übung eingetragen! 🚀'}
          </h3>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#166534', fontWeight: 650, lineHeight: 1.4 }}>
            Heute geübt: <strong style={{ color: '#14532d', fontSize: '0.9rem' }}>{loggedMinutesToday}</strong> von <strong style={{ color: '#14532d', fontSize: '0.9rem' }}>{dailyGoal}</strong> Min.
          </p>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.78rem', color: '#4f5e53', fontWeight: 650, lineHeight: 1.4 }}>
            {isGoalMet 
              ? 'Hervorragend! Du hast dein Tagesziel voll erreicht und die Funken sprühen lassen! ✨' 
              : 'Super! Jede Minute zählt. Dein täglicher Streak ist für heute gesichert! 🔥'}
          </p>
        </div>
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
            <span>Campus GrooveLab</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: PIN Required ──────────────────────────────────────────────────
  if (pageState === 'pin_required') {
    const blocked = pinAttempts >= MAX_ATTEMPTS;

    return (
      <div style={styles.fullScreen}>
        <div style={{ ...styles.card, maxWidth: '360px', gap: '28px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <Shield size={28} color="#eab308" />
            </div>
            {profile && (
              <h2 style={{ margin: '0 0 12px 0', fontSize: '1.25rem', fontWeight: 800, color: '#137333' }}>
                Hallo {profile.first_name} {profile.last_name ? profile.last_name.charAt(0) + '.' : ''}!
              </h2>
            )}
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Gerät bestätigen
            </h1>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>
              Erstes Mal auf diesem Gerät.<br />
              Gib den <strong>Tag deines Geburtstags</strong> ein.
            </p>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
              Beispiel: Geburtstag am 15. März → <strong>15</strong>
            </p>
          </div>

          {/* PIN Display */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {[0, 1].map(i => (
              <div key={i} style={{
                width: '56px',
                height: '64px',
                borderRadius: '16px',
                background: '#f8fafc',
                border: `2px solid ${pinInput.length > i ? '#eab308' : '#e2e8f0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                fontWeight: 900,
                color: '#0f172a',
                transition: 'border-color 0.2s',
                boxShadow: pinInput.length > i ? '0 0 0 4px rgba(234,179,8,0.12)' : 'none'
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
              padding: '12px 16px',
              fontSize: '0.85rem',
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
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key) => (
                <button
                  key={key}
                  disabled={pinLoading || !key}
                  onClick={() => {
                    if (key === '⌫') handlePinDelete();
                    else if (key) handlePinDigit(key);
                  }}
                  style={{
                    padding: '18px',
                    borderRadius: '16px',
                    border: 'none',
                    background: key === '⌫' ? '#fee2e2' : key === '' ? 'transparent' : '#f1f5f9',
                    color: key === '⌫' ? '#ef4444' : '#0f172a',
                    fontSize: key === '⌫' ? '1.2rem' : '1.4rem',
                    fontWeight: 800,
                    cursor: key ? 'pointer' : 'default',
                    transition: 'background 0.15s, transform 0.1s',
                    visibility: key === '' ? 'hidden' : 'visible',
                    boxShadow: key ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                  }}
                  onMouseDown={e => e.currentTarget.style.transform = key ? 'scale(0.92)' : ''}
                  onMouseUp={e => e.currentTarget.style.transform = ''}
                >
                  {key}
                </button>
              ))}
            </div>
          )}

          {/* Confirm Button */}
          {!blocked && (
            <button
              disabled={pinInput.length === 0 || pinLoading}
              onClick={handlePinSubmit}
              style={{
                width: '100%',
                padding: '18px',
                borderRadius: '16px',
                border: 'none',
                background: pinInput.length > 0 ? '#eab308' : '#e2e8f0',
                color: pinInput.length > 0 ? '#0f172a' : '#94a3b8',
                fontSize: '1rem',
                fontWeight: 900,
                cursor: pinInput.length > 0 ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              {pinLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={styles.spinnerInline} /> Prüfe...
                </span>
              ) : (
                <>
                  <CheckCircle size={20} /> Bestätigen
                </>
              )}
            </button>
          )}

          <div style={styles.brandFooter}>
            <Music size={14} color="#eab308" />
            <span>Campus GrooveLab · Dieses Gerät wird einmalig gespeichert</span>
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
      const dayOfWeek = sch.day_of_week; // 1-7 (Mon-Sun)
      const today = new Date();
      const currentDay = today.getDay() || 7; // Monday = 1, ..., Sunday = 7
      
      let diff = dayOfWeek - currentDay;
      if (diff <= 0) {
        diff += 7; // next week
      }
      const nextDate = new Date();
      nextDate.setDate(today.getDate() + diff);
      return {
        dateStr: nextDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
        time: sch.time_slot
      };
    };

    const nextLessonInfo = (() => {
      if (occurrences.length > 0) {
        const nextOcc = occurrences[0];
        const d = new Date(nextOcc.date);
        return {
          dateStr: d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
          time: nextOcc.start_time
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
              padding: '28px 24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              position: 'relative',
              color: '#1e293b'
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
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 800 }}>Nutzungsbedingungen</h3>
              <div style={{ fontSize: '13px', lineHeight: '1.6', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p><strong>Vertragspartner und Anbieter:</strong><br/>Simplified Work GbR, Patrick Huber, Karl-Fürstenberg-Str. 59, 79618 Rheinfelden, nachfolgend „Anbieter“</p>
                <p><strong>§ 1 LEISTUNGSUMFANG & KOSTENFREIHEIT</strong><br/>Die Nutzung der App selbst ist für den Schüler bzw. die Eltern lizenzgebührenfrei. Die Bereitstellung erfolgt über das Internet im Wege eines Software-as-a-Service (SaaS)-Modells.</p>
                <p><strong>§ 2 ABRECHNUNG ÜBER DIE MUSIKSCHULE</strong><br/>Soweit für die Aktivierung oder den Betrieb des Profils Gebühren fällig werden, werden diese direkt über die Kooperations-Musikschule nach den dort vereinbarten Abrechnungswegen (z.B. Barzahlung oder Einzug mit der monatlichen Unterrichtsgebühr) erhoben. Es entstehen durch diese Nutzungsbedingungen keine unmittelbaren Zahlungsansprüche des Anbieters gegen den Schüler oder die Eltern.</p>
                <p><strong>§ 3 ZUGANGSSICHERHEIT & AUTOMATISCHE SPERRUNG</strong><br/>Gibt der Endnutzer dreimal hintereinander eine falsche PIN ein, wird das Benutzerkonto aus Sicherheitsgründen automatisch gesperrt. Eine Entsperrung ist dann nur über die Verwaltung der Musikschule möglich.</p>
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
              padding: '28px 24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              position: 'relative',
              color: '#1e293b'
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
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 800 }}>Datenschutzerklärung</h3>
              <div style={{ fontSize: '13px', lineHeight: '1.6', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p>Wir verarbeiten personenbezogene Daten unserer Nutzer stets unter Einhaltung der geltenden Datenschutzbestimmungen (DSGVO).</p>
                <p><strong>1. Datenverarbeitung beim QR-Code Scan:</strong><br/>Beim Scannen des QR-Codes werden temporär verbindungsspezifische Daten erhoben, um die Zuordnung zum Schülerprofil zu ermöglichen.</p>
                <p><strong>2. Geräteregistrierung (Device-Pairing):</strong><br/>Zur Vermeidung unbefugter Zugriffe wird ein eindeutiger Geräteschlüssel (UUID) im lokalen Speicher deines Browsers abgelegt und an unsere Datenbank übermittelt. Dies dient dem Schutz deiner personenbezogenen Lerndaten.</p>
              </div>
            </div>
          </div>
        )}

        {activationStep === 'landing' && (
          <div style={{width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '20px'}}>
            {/* Header / Profile Card */}
            <div style={{...styles.card, padding: '24px 20px', gap: '16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', color: 'white', position: 'relative', overflow: 'hidden'}}>
              <div style={{position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%', pointerEvents: 'none'}} />
              <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                <div style={{width: '56px', height: '56px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255, 255, 255, 0.3)', flexShrink: 0, overflow: 'hidden'}}>
                  <img src={getInstrumentAvatarUrl(profile.instrument)} alt="" style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} />
                </div>
                <div style={{display: 'flex', flexDirection: 'column'}}>
                  <h2 style={{margin: 0, fontSize: '1.25rem', fontWeight: 900, textShadow: '0 1px 2px rgba(0,0,0,0.1)'}}>
                    {profile.first_name} {profile.last_name ? profile.last_name.charAt(0) + '.' : ''}
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
              {/* Regular Appointment Section */}
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <h3 style={{margin: 0, fontSize: '0.9rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px'}}>
                  <Clock size={16} color="#10b981" /> Unterrichtstermin
                </h3>
                {schedules.length > 0 ? (
                  schedules.map((sch, i) => (
                    <div key={i} style={{fontSize: '0.95rem', color: '#1e293b', fontWeight: 700, lineHeight: 1.4}}>
                      Jeden {dayNames[sch.day_of_week - 1]} um {sch.time_slot.substring(0, 5)} Uhr ({sch.duration} Min.)
                      <div style={{fontSize: '0.85rem', color: '#64748b', fontWeight: 550, marginTop: '2px'}}>
                        {sch.room?.name && `Raum: ${sch.room.name}`}
                        {sch.teacher?.first_name && ` · Lehrkraft: ${sch.teacher.first_name} ${sch.teacher.last_name}`}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{margin: 0, fontSize: '0.9rem', color: '#94a3b8', fontStyle: 'italic'}}>Kein regelmäßiger Termin eingetragen.</p>
                )}
              </div>

              {/* Next Lesson Section */}
              <div style={{borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <h3 style={{margin: 0, fontSize: '0.9rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px'}}>
                  <Calendar size={16} color="#10b981" /> Nächster Unterrichtstermin
                </h3>
                {nextLessonInfo ? (
                  <div style={{fontSize: '0.95rem', color: '#1e293b', fontWeight: 700}}>
                    {nextLessonInfo.dateStr}
                    <div style={{fontSize: '0.85rem', color: '#10b981', fontWeight: 700, marginTop: '2px'}}>
                      Start um {nextLessonInfo.time.substring(0, 5)} Uhr
                    </div>
                  </div>
                ) : (
                  <p style={{margin: 0, fontSize: '0.9rem', color: '#94a3b8', fontStyle: 'italic'}}>Kein anstehender Termin geplant.</p>
                )}
              </div>

              {/* Homework Section */}
              <div style={{borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <h3 style={{margin: 0, fontSize: '0.9rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px'}}>
                  <BookOpen size={16} color="#10b981" /> Deine Hausaufgaben
                </h3>
                {activeHWs.length > 0 || notesList.length > 0 ? (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {activeHWs.map((hw, i) => {
                      const textNotes = hw.teacher_notes || hw.notes || '';
                      return (
                        <div key={i} style={{display: 'flex', flexDirection: 'column', gap: '2px'}}>
                          <div style={{display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.9rem', color: '#334155', fontWeight: 600}}>
                            <Check size={16} color="#10b981" style={{marginTop: '2px', flexShrink: 0}} />
                            <span>{hw.topic_name}</span>
                          </div>
                          {textNotes && (
                            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginLeft: '24px' }}>
                              Bemerkung: {textNotes}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {(() => {
                      let audioCount = 0;
                      return notesList.map((note, i) => {
                        if (note.startsWith("STICKER:")) return null;
                        
                        const isAudio = note.startsWith("AUDIO:");
                        if (isAudio) {
                          audioCount++;
                          const parts = note.substring(6).split('|');
                          return (
                            <div key={`note-${i}`} style={{display: 'flex', justifyContent: 'center', padding: '4px 0'}}>
                              <InlineAudioPlayer url={parts[0]} label={parts[3] || `Play-Along #${audioCount}`} />
                            </div>
                          );
                        }
                        
                        return (
                          <div key={`note-${i}`} style={{display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.9rem', color: '#475569', fontWeight: 550, background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', borderLeft: '3px solid #10b981'}}>
                            <span>{note}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <p style={{margin: 0, fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic', fontWeight: 550}}>Keine aktuellen Hausaufgaben erfasst ✨</p>
                )}
              </div>
            </div>

            {/* Activation callout or Notice */}
            {activationError && (
              <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '16px', color: '#991b1b', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} />
                <span>{activationError}</span>
              </div>
            )}

            {activationAllowed ? (
              <div style={{...styles.card, padding: '24px', gap: '16px', border: '1.5px solid #a7f3d0', background: '#f0fdf4', textAlign: 'center'}}>
                <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                  <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#065f46'}}>Jetzt Campus testen</h3>
                  <p style={{margin: 0, fontSize: '0.85rem', color: '#047857', lineHeight: 1.5, fontWeight: 550}}>
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
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
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
            )}

            <div style={styles.brandFooter}>
              <Music size={14} color="#10b981" />
              <span>Campus GrooveLab</span>
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
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
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

            <div style={{fontSize: '0.85rem', color: '#334155', lineHeight: '1.5', background: '#f0fdf4', padding: '16px', borderRadius: '16px', border: '1px solid #a7f3d0'}}>
              Die Aktivierung deines Schülerkontos erfordert die Begleichung der GrooveLab-Jahresgebühr für dieses Schuljahr.
              <div style={{ marginTop: '10px', fontWeight: 900, color: '#065f46', fontSize: '0.95rem' }}>
                Betrag: {price.toFixed(2).replace('.', ',')} € (einmalig für dieses Schuljahr)
              </div>
              <span style={{ fontSize: '0.7rem', color: '#047857', display: 'block', marginTop: '6px', fontWeight: 550 }}>
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
                      border: paymentMethod === 'debit' ? '2.5px solid #10b981' : '1px solid #e2e8f0',
                      background: paymentMethod === 'debit' ? '#f0fdf4' : 'white',
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
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
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
                      border: paymentMethod === 'cash' ? '2.5px solid #10b981' : '1px solid #e2e8f0',
                      background: paymentMethod === 'cash' ? '#f0fdf4' : 'white',
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
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
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
                  style={{ accentColor: '#10b981', marginTop: '3px', cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ fontSize: '0.78rem', color: '#475569', lineHeight: '1.4' }}>
                  Ich bestätige, dass ich volljährig bin bzw. als Erziehungsberechtigter des Schülers handle, stimme den{' '}
                  <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowParentAgb(true); }} style={{ textDecoration: 'underline', color: '#10b981', cursor: 'pointer', fontWeight: 700 }}>AGB</span>{' '}
                  sowie der{' '}
                  <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPrivacy(true); }} style={{ textDecoration: 'underline', color: '#10b981', cursor: 'pointer', fontWeight: 700 }}>Datenschutzerklärung</span>{' '}
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
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
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
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <CheckCircle size={36} color="#10b981" />
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
                background: '#10b981',
                color: 'white',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              }}
            >
              Zum Campus Profil
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Render: Profile (10-Sekunden-Interface) ───────────────────────────────
  if (pageState === 'profile' && profile) {
    const isAdminOrSecretary = profile.role === 'admin' || profile.role === 'secretary';

    if (isAdminOrSecretary) {
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

      return (
        <div style={{
          ...styles.fullScreen,
          background: '#0f172a',
          padding: '20px',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Outfit", "Inter", sans-serif'
        }}>
          <div style={{
            ...styles.card,
            maxWidth: '420px',
            width: '100%',
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            borderRadius: '24px',
            padding: '24px',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Header / Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #eab308 100%)',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(16, 185, 129, 0.2)'
              }}>
                <Shield size={18} color="#ffffff" />
              </div>
              <div>
                <h1 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>
                  Campus-Groovelab
                </h1>
                <span style={{ fontSize: '0.62rem', color: '#10b981', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Mobiles Leitstand-Dashboard
                </span>
              </div>
            </div>

            {/* Profile Briefing Board Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <img
                src="/campus_login_hero.png"
                alt="Profile Chalkboard"
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  border: '1.5px solid rgba(255, 255, 255, 0.1)'
                }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {profile.first_name} {profile.last_name || ''}
                </h2>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {profile.role === 'admin' ? 'Schulleitung' : 'Sekretariat/Verwaltung'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600, marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {profile.school_name}
                </div>
              </div>
            </div>

            {/* Alert: Pending Activations */}
            {adminStats.pendingActivations > 0 ? (
              <div style={{
                background: 'rgba(245, 158, 11, 0.06)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}>
                <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.85rem', color: '#f59e0b', fontWeight: 800, marginBottom: '2px' }}>
                    Registrierungen ausstehend!
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 550, lineHeight: 1.4 }}>
                    Es warten <strong>{adminStats.pendingActivations}</strong> neue Profile auf die manuelle Freischaltung im Briefing Board nach Zahlungseingang.
                  </span>
                </div>
              </div>
            ) : (
              <div style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}>
                <CheckCircle size={18} color="#10b981" />
                <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 600 }}>
                  Alle Profile sind aktuell freigeschaltet. Keine ausstehenden Aktivitäten.
                </span>
              </div>
            )}

            {/* KPI Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Schüler</span>
                {loadingAdminStats ? (
                  <div style={{ height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="animate-spin" style={{ width: '12px', height: '12px', border: '1.5px solid #64748b', borderTopColor: '#ffffff', borderRadius: '50%' }}></div>
                  </div>
                ) : (
                  <strong style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', display: 'block', marginTop: '4px' }}>{adminStats.activeStudents}</strong>
                )}
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lehrkräfte</span>
                {loadingAdminStats ? (
                  <div style={{ height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="animate-spin" style={{ width: '12px', height: '12px', border: '1.5px solid #64748b', borderTopColor: '#ffffff', borderRadius: '50%' }}></div>
                  </div>
                ) : (
                  <strong style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', display: 'block', marginTop: '4px' }}>{adminStats.activeTeachers}</strong>
                )}
              </div>
            </div>

            {/* School Registration Link Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Registrierungs-Link
              </span>
              <button
                onClick={handleCopyLink}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: copiedLink ? '#10b981' : 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                {copiedLink ? 'Kopiert ✓' : 'Anmeldelink kopieren'}
              </button>
            </div>

            {/* Hint & Actions */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.01)',
              borderRadius: '16px',
              padding: '14px',
              border: '1.5px dashed rgba(255, 255, 255, 0.06)',
              fontSize: '0.7rem',
              color: '#94a3b8',
              lineHeight: 1.4,
              textAlign: 'center'
            }}>
              Die vollumfängliche Verwaltung (Stundenpläne, Abrechnung, Banking und Schulinformationen) ist für <strong>Desktop-Computer</strong> optimiert.
            </div>

            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#ef4444';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                e.currentTarget.style.color = '#f87171';
              }}
            >
              Abmelden
            </button>
          </div>
        </div>
      );
    }

    const todayStr = new Date().toLocaleDateString('en-CA');
    const currentDayOfWeek = new Date().getDay() || 7; // Monday = 1, ..., Sunday = 7

    // Check if there is an occurrence today
    const occurrenceToday = occurrences.find(o => o.date === todayStr);

    // Check if there is a weekly schedule today
    const scheduleToday = schedules.find(s => s.day_of_week === currentDayOfWeek);

    // Determine if there is a lesson today (and it is not canceled)
    let lessonToday: any = null;
    let isTodayLessonScheduled = false;
    let isCanceled = false;

    if (occurrenceToday) {
      lessonToday = occurrenceToday;
      isTodayLessonScheduled = true;
      isCanceled = ['cancelled', 'teacher_sick', 'canceled_by_student', 'canceled_by_teacher_sick'].includes(occurrenceToday.status);
    } else if (scheduleToday) {
      const overridingOcc = occurrences.find(o => o.schedule_id === scheduleToday.id && o.date === todayStr);
      if (overridingOcc) {
        lessonToday = overridingOcc;
        isTodayLessonScheduled = true;
        isCanceled = ['cancelled', 'teacher_sick', 'canceled_by_student', 'canceled_by_teacher_sick'].includes(overridingOcc.status);
      } else {
        lessonToday = {
          ...scheduleToday,
          start_time: scheduleToday.time_slot,
          room_name: scheduleToday.room?.name || 'Groovelab Raum'
        };
        isTodayLessonScheduled = true;
        isCanceled = scheduleToday.status === 'canceled_by_teacher_sick';
      }
    }

    const isLessonDay = isTodayLessonScheduled && !isCanceled;

    return (
      <div style={{
        ...styles.fullScreen,
        background: timerRunning ? '#000000' : '#f2f2f7',
        transition: 'background 0.5s ease'
      }}>
        <div style={{ 
          ...styles.card, 
          maxWidth: '380px', 
          gap: '0', 
          padding: 0, 
          overflow: 'hidden',
          background: timerRunning ? '#000000' : 'white',
          border: timerRunning ? 'none' : '1px solid #e5e5ea',
          boxShadow: timerRunning ? 'none' : '0 10px 40px rgba(0,0,0,0.04)',
          transition: 'all 0.5s ease'
        }}>
          {/* Header Banner */}
          {!timerRunning && (
            <div style={{
              background: 'linear-gradient(135deg, #34c759 0%, #248a3d 100%)',
              padding: 'calc(env(safe-area-inset-top, 0px) + 24px) 20px 24px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative'
            }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                  Groovelab Campus
                </span>
                <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                  {profile.first_name} {profile.last_name ? profile.last_name.charAt(0) + '.' : ''}
                </h1>
              </div>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}>
                {profile.first_name?.[0]}{profile.last_name?.[0]}
              </div>
            </div>
          )}

          {!timerRunning && profile.app_usage_mode === 'parent_hybrid' && (
            <div style={{
              background: parentUnlocked ? '#e0f2fe' : '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              color: parentUnlocked ? '#0369a1' : '#475569',
              fontWeight: 700
            }}>
              <span>
                {parentUnlocked ? '🔓 Eltern-Bereich aktiv (Einstellungen freigeschaltet)' : '👪 Dieser Bereich ist für Schüler optimiert.'}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (parentUnlocked) {
                    setParentUnlocked(false);
                  } else {
                    setShowPinPrompt(true);
                  }
                }}
                style={{
                  background: parentUnlocked ? '#0284c7' : '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                {parentUnlocked ? 'Sperren' : '🔑 Eltern-Bereich'}
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
                {isInitialPinSetup ? (
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>🔒 Neue Eltern-PIN vergeben</h3>
                    <p style={{ margin: '8px 0 16px 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 650, lineHeight: 1.4 }}>
                      Um fortzufahren, musst du die standardmäßige PIN (0000) durch eine persönliche, sichere 4-stellige Nummer ersetzen.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', textAlign: 'left' }}>Neue 4-stellige PIN:</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={newPinInput}
                          onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
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
                          onChange={(e) => setNewPinConfirm(e.target.value.replace(/\D/g, ''))}
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
                          background: '#137333',
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
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>👪 Eltern-PIN eingeben</h3>
                    <p style={{ margin: '8px 0 20px 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 650 }}>
                      Bitte gib die 4-stellige Eltern-PIN ein, um den geschützten Eltern-Bereich freizuschalten.
                    </p>
                    <input
                      type="password"
                      maxLength={4}
                      value={parentPinInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setParentPinInput(val);
                        if (val.length === 4) {
                          if (parentPinLockoutUntil && Date.now() < parentPinLockoutUntil) {
                            const minsLeft = Math.ceil((parentPinLockoutUntil - Date.now()) / 60000);
                            alert(`Eltern-Bereich gesperrt. Bitte versuche es in ${minsLeft} Minuten erneut.`);
                            setParentPinInput('');
                            return;
                          }

                          supabase
                            .rpc('verify_parent_pin', { student_id: profile.id, input_pin: val })
                            .then(({ data: isCorrect, error: rpcErr }) => {
                              if (rpcErr) {
                                console.error('PIN verification failed:', rpcErr);
                                setParentPinError(true);
                                setParentPinInput('');
                                return;
                              }
                              if (isCorrect) {
                                setParentPinAttempts(0);
                                const isDefault = !profile.has_parent_pin || val === '0000';
                                if (isDefault) {
                                  setIsInitialPinSetup(true);
                                  setParentPinInput('');
                                } else {
                                  setParentUnlocked(true);
                                  setShowPinPrompt(false);
                                  setParentPinInput('');
                                  setParentPinError(false);
                                }
                              } else {
                                const newAttempts = parentPinAttempts + 1;
                                setParentPinAttempts(newAttempts);
                                if (newAttempts >= 3) {
                                  const lockoutTime = Date.now() + 15 * 60 * 1000;
                                  setParentPinLockoutUntil(lockoutTime);
                                  setParentPinAttempts(0);
                                  alert('🔒 Zu viele Fehlversuche. Der Eltern-Bereich ist aus Sicherheitsgründen für 15 Minuten gesperrt.');
                                } else {
                                  setParentPinError(true);
                                  alert(`Falsche PIN. Du hast noch ${3 - newAttempts} Versuche.`);
                                }
                                setParentPinInput('');
                              }
                            });
                        }
                      }}
                      placeholder="••••"
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
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', textAlign: 'center' }}>
                  📱 Direkt-Kommunikation freischalten
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
                        alert('Erfolgreich freigeschaltet! Der Modus wurde auf "Selbstnutzer" umgestellt.');
                      } catch (err: any) {
                        alert('Fehler bei der Aktivierung: ' + err.message);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: (!acceptedTerms || !acceptedPrivacy) ? '#cbd5e1' : '#16a34a',
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

          {/* Main Content Area */}
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {loadingDashboard ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '12px' }}>
                <div style={styles.loadingDot} />
                <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 650 }}>Lade Dashboard...</span>
              </div>
            ) : !profile.is_campus_active ? (
              /* ==============================================================
                 WEG 1: Inactive for Campus
                 ============================================================== */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {renderLessonInfoCard(lessonToday, isLessonDay)}
                {renderHomeworkWidget()}
              </div>
            ) : profile.app_usage_mode === 'parent_hybrid' ? (
              /* ==============================================================
                 WEG 3: PARENT_HYBRID (Jüngere Kinder & Eltern)
                 ============================================================== */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {renderLessonInfoCard(lessonToday, isLessonDay)}
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
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: '#ffffff',
                              fontSize: '0.95rem',
                              fontWeight: 900,
                              cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
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
                ) : (
                  renderHomeworkWidget()
                )}

                {profile.app_usage_mode === 'parent_hybrid' && parentUnlocked && (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #bbf7d0',
                    borderRadius: '24px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    textAlign: 'left',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Key size={16} style={{ color: '#16a34a' }} /> Berechtigungen verwalten
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#166534', fontWeight: 650, lineHeight: 1.4 }}>
                      Du kannst die Kommunikationsrechte auf dein Kind übertragen oder einzelne Funktionen gezielt freigeben.
                    </p>
                    
                    <button
                      type="button"
                      onClick={() => setShowConsentModal(true)}
                      style={{
                        background: '#16a34a',
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

                    <div style={{ borderTop: '1px solid #bbf7d0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h5 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: '#15803d', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Settings size={14} style={{ color: '#15803d' }} /> Einzelne Funktionen freigeben:
                      </h5>
                      
                      {/* Toggle 1: Chat */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: '#166534', fontWeight: 700, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={profile.parent_allow_chat ?? true}
                          onChange={async (e) => {
                            const checked = e.target.checked;
                            const { error } = await supabase.from('users').update({ parent_allow_chat: checked }).eq('id', profile.id);
                            if (!error) setProfile(prev => prev ? { ...prev, parent_allow_chat: checked } : null);
                          }}
                          style={{ accentColor: '#16a34a' }}
                        />
                        <MessageSquare size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                        <span>Chat &amp; Lehrer-Kommunikation erlauben</span>
                      </label>

                      {/* Toggle 2: Timer */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: '#166534', fontWeight: 700, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={profile.parent_allow_timer ?? true}
                          onChange={async (e) => {
                            const checked = e.target.checked;
                            const { error } = await supabase.from('users').update({ parent_allow_timer: checked }).eq('id', profile.id);
                            if (!error) setProfile(prev => prev ? { ...prev, parent_allow_timer: checked } : null);
                          }}
                          style={{ accentColor: '#16a34a' }}
                        />
                        <Timer size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                        <span>Selbständiger Übe-Timer &amp; Streaks</span>
                      </label>

                      {/* Toggle 3: Leaderboard */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: '#166534', fontWeight: 700, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={profile.parent_allow_leaderboard ?? true}
                          onChange={async (e) => {
                            const checked = e.target.checked;
                            const { error } = await supabase.from('users').update({ parent_allow_leaderboard: checked }).eq('id', profile.id);
                            if (!error) setProfile(prev => prev ? { ...prev, parent_allow_leaderboard: checked } : null);
                          }}
                          style={{ accentColor: '#16a34a' }}
                        />
                        <Trophy size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                        <span>Sichtbarkeit in Bestenlisten</span>
                      </label>

                      {/* Toggle 4: Groups */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: '#166534', fontWeight: 700, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={profile.parent_allow_groups ?? true}
                          onChange={async (e) => {
                            const checked = e.target.checked;
                            const { error } = await supabase.from('users').update({ parent_allow_groups: checked }).eq('id', profile.id);
                            if (!error) setProfile(prev => prev ? { ...prev, parent_allow_groups: checked } : null);
                          }}
                          style={{ accentColor: '#16a34a' }}
                        />
                        <Users size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                        <span>Beitritt zu Band- &amp; Gruppen-Chats</span>
                      </label>

                      {/* Toggle 5: Proposals */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: '#166534', fontWeight: 700, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={profile.parent_allow_proposals ?? true}
                          onChange={async (e) => {
                            const checked = e.target.checked;
                            const { error } = await supabase.from('users').update({ parent_allow_proposals: checked }).eq('id', profile.id);
                            if (!error) setProfile(prev => prev ? { ...prev, parent_allow_proposals: checked } : null);
                          }}
                          style={{ accentColor: '#16a34a' }}
                        />
                        <Music size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
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
                {!timerRunning && renderLessonInfoCard(lessonToday, isLessonDay)}
                {!timerRunning && renderSegmentedControl()}
                {activeTab === 'action' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Gamification Streak/XP Row */}
                    {!timerRunning && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {/* Streak flame */}
                        <div style={{
                          background: '#ffffff',
                          border: '1px solid #e5e5ea',
                          borderRadius: '20px',
                          padding: '16px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: '8px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: '#fff3cd'
                          }}>
                            <Flame size={18} color="#ff9500" fill="#ff9500" />
                          </div>
                          <div>
                            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#000000', display: 'block' }}>
                              {stats?.streak_flame || avatar?.streak_flame || 0} Tage
                            </span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                              Übungs-Streak
                            </span>
                          </div>
                        </div>

                        {/* XP points */}
                        <div style={{
                          background: '#ffffff',
                          border: '1px solid #e5e5ea',
                          borderRadius: '20px',
                          padding: '16px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: '8px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: '#e8f5e9'
                          }}>
                            <Sparkles size={18} color="#34c759" fill="#34c759" />
                          </div>
                          <div>
                            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#000000', display: 'block' }}>
                              {stats?.current_xp || 0} XP
                            </span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                              Erfahrungspunkte
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
                          ? (isExtraTime ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#000000') 
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
                              filter: isExtraTime ? 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.25))' : (timerRunning ? (isPhoneFlat ? 'drop-shadow(0 0 12px rgba(52, 199, 89, 0.15))' : 'drop-shadow(0 0 12px rgba(255, 59, 48, 0.2))') : 'none'),
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
                                background: 'linear-gradient(135deg, #007aff 0%, #0056b3 100%)',
                                color: '#ffffff',
                                fontSize: '0.95rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 15px rgba(0, 122, 255, 0.15)'
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
                                  boxShadow: '0 4px 15px rgba(52, 199, 89, 0.15)'
                                }}
                              >
                                🏁 Beenden
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('Möchtest du diese Session wirklich abbrechen? Der Fortschritt geht verloren.')) {
                                    setElapsedSeconds(0);
                                    setTimerRunning(false);
                                    setIsExtraTime(false);
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
                ) : (
                  renderHomeworkWidget()
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
              marginTop: '4px'
            }}>
              <Shield size={12} color="#94a3b8" />
              <span>Sichere passwortlose Verbindung</span>
            </div>

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
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 28px',
                        borderRadius: '14px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)',
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
                        if (confirm('Möchtest du diese Session wirklich abbrechen? Der Fortschritt geht verloren.')) {
                          setElapsedSeconds(0);
                          setTimerRunning(false);
                          setIsExtraTime(false);
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
          </>
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif',
    padding: '20px',
    overflowY: 'auto' as const,
  },
  card: {
    background: 'white',
    borderRadius: '32px',
    width: '100%',
    boxShadow: '0 10px 40px rgba(0,0,0,0.04)',
    border: '1px solid #e5e5ea',
    padding: '32px 28px',
    display: 'flex',
    flexDirection: 'column' as const,
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
    borderTopColor: '#eab308',
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

