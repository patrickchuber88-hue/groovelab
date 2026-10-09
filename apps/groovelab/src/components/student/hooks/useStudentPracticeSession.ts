import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { storeBlob, getBlob, deleteBlob } from '../../../utils/blobStorage';
import { computePeaksFromArrayBuffer } from '../../../utils/waveformHelper';
import { processPureRawBlob, TARGET_PURE_RAW_LUFS, TARGET_PEAK_DBTP, MAX_PURE_RAW_LIMITER_GR_DB } from '../../../utils/audioMasteringEngine';
import { acquireAudioStream, releaseAudioStream, PURE_RAW_AUDIO_CONSTRAINTS } from '../../../services/audioPermissionService';
import { toLocalYYYYMMDD, getSimulatedNow, getDaysBetweenLocal, getISOWeek } from '../studentDateUtils';
import { MIN_PRACTICE_SECONDS } from '../utils/studentAvatarDashboardUtils';

export type PracticeSessionValidationMode = 'sensor_verified' | 'desktop_focus_guard' | 'sensors_unsupported';

export interface PracticeSessionFokusLog {
  id?: string;
  user_id?: string;
  song_id?: string | null;
  duration_seconds?: number;
  duration_minutes?: number;
  is_extra?: boolean;
  flame_level?: string;
  xp_earned?: number;
  mood?: string | null;
  metadata?: Record<string, unknown>;
  validation_mode?: PracticeSessionValidationMode;
  created_at?: string;
  date?: string;
  [key: string]: unknown;
}

export interface PracticeSessionCelebrationDetails {
  exactSeconds?: number;
  sessionMinutes?: number;
  durationMinutes?: number;
  dailyGoal?: number;
  sessionCompletedTarget?: boolean;
  streakFlame?: number;
  streak?: number;
  newStreak?: number;
  xpGained?: number;
  usedJokerThisSession?: boolean;
  validationMode?: PracticeSessionValidationMode;
  [key: string]: unknown;
}

export interface JuniorLocalRecording {
  id: string;
  title: string;
  url: string;
  duration: number;
  date: string;
  blobKey?: string;
  recordedAt?: string;
}

export interface JuniorTeacherRecording {
  id: string;
  title: string;
  url: string;
  duration?: number;
  date: string;
  topic?: string;
  week?: string;
  blobKey?: string;
}

interface WakeLockSentinelLike {
  released: boolean;
  type: string;
  release: () => Promise<void>;
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
}

interface UseStudentPracticeSessionProps {
  studentId: string;
  studentUser?: {
    id?: string;
    streak_flame?: number;
    evolution_level?: number;
    [key: string]: unknown;
  } | null;
  avatar?: {
    id?: string;
    streak_flame?: number;
    xp?: number;
    [key: string]: unknown;
  } | null;
  studentUiLevel: string;
  isTeacherSession: boolean;
  onRefreshData?: () => Promise<void>;
  getTargetMinutes: (streak: number) => number;
  progressItems?: Array<{
    id?: string;
    topic_name?: string;
    homework_notes?: string;
    audio_url?: string;
    duration?: number;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
  }>;
}

export function useStudentPracticeSession({
  studentId,
  studentUser,
  avatar,
  studentUiLevel,
  isTeacherSession,
  onRefreshData,
  getTargetMinutes,
  progressItems = []
}: UseStudentPracticeSessionProps) {
  // Practice session timer states
  const [sessionActive, setSessionActive] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const secondsElapsedRef = useRef(0);
  useEffect(() => {
    secondsElapsedRef.current = secondsElapsed;
  }, [secondsElapsed]);

  // Session Pause State (0,1% Goldstandard: Timer stoppt exakt bei Pause)
  const [isSessionPaused, setIsSessionPaused] = useState(false);
  const isSessionPausedRef = useRef(false);
  useEffect(() => {
    isSessionPausedRef.current = isSessionPaused;
  }, [isSessionPaused]);

  // Device & Sensor detection (inkl. iPadOS Safari/PWA MacIntel Touch-Erkennung)
  const isMobile = typeof navigator !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );

  // Gyro Detox, sensor & flat orientation states (Fail-Closed: kein optimistischer Default auf Mobile)
  const [isPhoneFlat, setIsPhoneFlat] = useState(!isMobile);
  const isPhoneFlatRef = useRef(isPhoneFlat);
  useEffect(() => {
    isPhoneFlatRef.current = isPhoneFlat;
  }, [isPhoneFlat]);
  const [flatType, setFlatType] = useState<'face-up' | 'face-down' | 'none'>('none');
  const [graceSecondsLeft, setGraceSecondsLeft] = useState(10);
  const [sessionAbortedNotice, setSessionAbortedNotice] = useState<string | null>(null);

  const hasReceivedSensorEventRef = useRef(false);
  const isDeviceMovingRef = useRef(false);
  const motionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notFlatGraceRef = useRef(0);

  // Focus logs state
  const [fokusLogs, setFokusLogs] = useState<PracticeSessionFokusLog[]>([]);
  const currentLogIdRef = useRef<string | null>(null);

  // Celebration modal states
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationDetails, setCelebrationDetails] = useState<PracticeSessionCelebrationDetails | null>(null);
  const [celebrationRingProgress, setCelebrationRingProgress] = useState(0);

  // WakeLock ref for active practice sessions
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);

  // 🛡️ Fail-Safe Screen-WakeLock Helper Functions (TDDDG § 25 Akkuschonung & Tab-Switch-Immunität)
  const requestScreenWakeLock = useCallback(async () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!('wakeLock' in navigator) || document.hidden) return;
    try {
      if (!wakeLockRef.current) {
        const nav = navigator as unknown as { wakeLock?: { request: (type: string) => Promise<WakeLockSentinelLike> } };
        if (nav.wakeLock?.request) {
          wakeLockRef.current = await nav.wakeLock.request('screen');
        }
        wakeLockRef.current?.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      }
    } catch (_) {
      // Graceful fallback: Batteriemodus oder Berechtigungsverweigerung
    }
  }, []);

  const releaseScreenWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (_) {}
      wakeLockRef.current = null;
    }
  }, []);

  // 🛡️ Fail-Closed Anti-Cheat Session Abort Helper
  const abortActiveSession = useCallback((reason: string, message: string) => {
    setSessionActive(false);
    setSecondsElapsed(0);
    setIsSessionPaused(false);
    isSessionPausedRef.current = false;
    setSessionAbortedNotice(message);
    try {
      window.dispatchEvent(new CustomEvent('campus_focus_session_aborted', {
        detail: { reason, message }
      }));
    } catch {}
    if (reason === 'permission_denied' || reason === 'sensor_events_missing') {
      try {
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert(message);
        }
      } catch {}
    }
  }, []);

  // 🛡️ WebKit Dual-Permission Handshake (DeviceOrientationEvent & DeviceMotionEvent synchron im Klick-Event anfordern)
  const requestOrientationPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return true;

    try {
      const DeviceOrientationWithPermission = typeof DeviceOrientationEvent !== 'undefined'
        ? (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
        : undefined;
      const DeviceMotionWithPermission = typeof DeviceMotionEvent !== 'undefined'
        ? (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> })
        : undefined;

      const orientationPromise = typeof DeviceOrientationWithPermission?.requestPermission === 'function'
        ? DeviceOrientationWithPermission.requestPermission().catch((err: unknown) => {
            console.warn('[OrientationPermission] DeviceOrientationEvent requestPermission error:', err);
            return 'denied';
          })
        : Promise.resolve('granted');

      const motionPromise = typeof DeviceMotionWithPermission?.requestPermission === 'function'
        ? DeviceMotionWithPermission.requestPermission().catch((err: unknown) => {
            console.warn('[OrientationPermission] DeviceMotionEvent requestPermission error:', err);
            return 'denied';
          })
        : Promise.resolve('granted');

      const [orientationRes, motionRes] = await Promise.all([orientationPromise, motionPromise]);
      const granted = orientationRes === 'granted' && motionRes === 'granted';

      if (!granted && isMobile) {
        const notice = 'Sensor-Berechtigung verweigert: Der Fokus-Timer benötigt Zugriff auf die Bewegungssensoren, um die Ausrichtung zu prüfen. Bitte erlaube den Zugriff in den iOS/Browser-Einstellungen! 🛑';
        abortActiveSession('permission_denied', notice);
      }

      return granted;
    } catch (err) {
      console.warn('[OrientationPermission] Dual permission handshake error:', err);
      if (isMobile) {
        const notice = 'Sensor-Berechtigungsfehler: Zugriff auf die Lagesensoren fehlgeschlagen. 🛑';
        abortActiveSession('permission_denied', notice);
      }
      return false;
    }
  }, [isMobile, abortActiveSession]);

  // 📱 Sensor-Listener Engine: Gyroscope & Accelerometer mit 400ms Fail-Closed Liveness-Probe
  useEffect(() => {
    if (!sessionActive || typeof window === 'undefined') {
      setIsPhoneFlat(!isMobile);
      setFlatType('none');
      notFlatGraceRef.current = 0;
      hasReceivedSensorEventRef.current = false;
      return;
    }

    if (!isMobile || !('DeviceOrientationEvent' in window)) {
      // Desktop / Laptop ohne Lagesensoren: Standardmäßig aktiv (Immunität durch Desktop Focus-Loss Guard)
      setIsPhoneFlat(true);
      setFlatType('face-up');
      return;
    }

    // Mobilgerät: Zunächst false (Fail-Closed), bis Lagesensor echte Flachlage meldet
    setIsPhoneFlat(false);
    setFlatType('none');
    hasReceivedSensorEventRef.current = false;

    // 400ms Sensor-Probe: Überprüft, ob das Mobilgerät nach Aktivierung echte Events liefert
    const probeTimeout = setTimeout(() => {
      if (sessionActive && !hasReceivedSensorEventRef.current) {
        console.warn('[Anti-Cheat] Sensor probe failed after 400ms: No sensor events received.');
        abortActiveSession(
          'sensor_events_missing',
          'Keine Sensor-Signale empfangen: Auf Mobilgeräten erfordert der Fokus-Timer aktive Lagesensoren. Bitte stelle sicher, dass Sensoren im Browser erlaubt sind. 🛑'
        );
      }
    }, 400);

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const beta = e.beta;
      const gamma = e.gamma;
      if (beta !== null || gamma !== null) {
        hasReceivedSensorEventRef.current = true;
      }
      if (beta === null || gamma === null) {
        setIsPhoneFlat(false);
        setFlatType('none');
        return;
      }

      // Flat Face-Up: Display zeigt nach oben, Neigung beta & gamma < 22 Grad
      const faceUp = Math.abs(beta) < 22 && Math.abs(gamma) < 22;
      // Flat Face-Down: Display liegt flach auf dem Tisch (beta nahe 180/-180, gamma < 22)
      const faceDown = Math.abs(Math.abs(beta) - 180) < 22 && Math.abs(gamma) < 22;

      const isOrientedFlat = faceUp || faceDown;
      setFlatType(faceDown ? 'face-down' : (faceUp ? 'face-up' : 'none'));

      const isStill = !isDeviceMovingRef.current;
      const isTrulyFlat = isOrientedFlat && isStill;

      setIsPhoneFlat(isTrulyFlat);
    };

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.acceleration || e.accelerationIncludingGravity;
      if (acc) {
        hasReceivedSensorEventRef.current = true;
      }
      if (!acc) return;
      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = (e.acceleration ? acc.z : 0) || 0;
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      // Schwellenwert > 2.0 m/s^2: Handy wird in der Hand gehalten / bewegt
      if (magnitude > 2.0) {
        isDeviceMovingRef.current = true;
        setIsPhoneFlat(false);

        if (motionTimeoutRef.current) clearTimeout(motionTimeoutRef.current);
        motionTimeoutRef.current = setTimeout(() => {
          isDeviceMovingRef.current = false;
        }, 1500);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);

    return () => {
      clearTimeout(probeTimeout);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('devicemotion', handleMotion);
      if (motionTimeoutRef.current) clearTimeout(motionTimeoutRef.current);
    };
  }, [sessionActive, isMobile, abortActiveSession]);

  // Active Timer Loop (Pausiert nach 5s Nicht-Flachlage; stoppt zuverlässig bei Pause)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (sessionActive && !isSessionPaused) {
      timer = setInterval(() => {
        // Anti-Cheat: Wenn Handy auf Mobile nicht flach auf dem Tisch liegt
        if (isMobile && !isPhoneFlatRef.current) {
          notFlatGraceRef.current += 1;
          // Die ersten 5s sind Gnadenfrist (zum Ablegen). Danach zählt der Timer NICHT weiter!
          if (notFlatGraceRef.current > 5) {
            return;
          }
        } else {
          notFlatGraceRef.current = 0;
        }

        setSecondsElapsed(prev => prev + 1);
      }, 1000);

      requestScreenWakeLock();
    } else {
      releaseScreenWakeLock();
    }
    return () => {
      if (timer) clearInterval(timer);
      releaseScreenWakeLock();
    };
  }, [sessionActive, isSessionPaused, isMobile, requestScreenWakeLock, releaseScreenWakeLock]);

  // 🛡️ 0,1% Goldstandard Anti-Cheat: Sofort-Abbruch bei Tab-Wechsel / App-Verlassen / Desktop Focus-Loss
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        releaseScreenWakeLock();
        if (sessionActive) {
          console.warn('[Anti-Cheat] Focus session immediately aborted due to tab switch/backgrounding.');
          abortActiveSession(
            'tab_switch',
            'Fokus-Session abgebrochen: Du hast den Tab oder die App gewechselt. Beim Üben bleibt der Fokus-Timer geöffnet! 🛑'
          );
        }
      } else if (sessionActive && !isSessionPausedRef.current) {
        requestScreenWakeLock();
      }
    };

    // Desktop Focus-Loss Guard: Auf Desktops wird Fenster-Fokusverlust überwacht
    const handleWindowBlur = () => {
      if (!isMobile && sessionActive) {
        setTimeout(() => {
          if (sessionActive && (!document.hasFocus() || document.hidden)) {
            console.warn('[Anti-Cheat] Desktop focus session aborted due to window blur.');
            abortActiveSession(
              'focus_loss',
              'Fokus-Session abgebrochen: Du hast das Browser-Fenster verlassen. Beim Üben am Computer bleibt der Tab im Fokus! 🛑'
            );
          }
        }, 150);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [sessionActive, isMobile, releaseScreenWakeLock, requestScreenWakeLock, abortActiveSession]);

  // Fetch Fokus Logs
  const fetchFokusLogs = useCallback(async () => {
    if (!studentId) return;
    try {
      const { data, error } = await supabase
        .from('fokus_logs')
        .select('id, user_id, duration_seconds, duration_minutes, is_extra, flame_level, xp_earned, metadata, created_at')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mappedLogs: PracticeSessionFokusLog[] = (data as Array<Record<string, unknown>>).map(row => {
          const meta = (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<string, unknown>;
          return {
            ...row,
            validation_mode: (meta.validation_mode as PracticeSessionValidationMode) || undefined
          };
        });
        setFokusLogs(mappedLogs);
      }
    } catch (err) {
      console.error('Error fetching fokus logs:', err);
    }
  }, [studentId]);

  useEffect(() => {
    fetchFokusLogs();
  }, [fetchFokusLogs]);

  // Finish Practice Session
  const finishPracticeSession = async (customXp?: number, streakOverride?: number) => {
    setIsSessionPaused(false);
    isSessionPausedRef.current = false;
    const elapsed = secondsElapsedRef.current;
    if (elapsed < 10) {
      setSessionActive(false);
      setSecondsElapsed(0);
      return;
    }

    setSessionActive(false);
    const durationMinutes = Math.max(1, Math.floor(elapsed / 60));
    const xpGained = typeof customXp === 'number' ? customXp : durationMinutes; // 1 XP pro Minute (Goldstandard SSOT)

    try {
      const simNow = getSimulatedNow();
      let logData: PracticeSessionFokusLog | null = null;
      const validationMode: PracticeSessionValidationMode = isMobile ? 'sensor_verified' : 'desktop_focus_guard';

      // 1. Primär: Autoritativer Server-RPC complete_focus_session (Migration 531)
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('complete_focus_session', {
          p_student_id: studentId,
          p_duration_seconds: elapsed,
          p_metadata: {
            device: isMobile ? 'mobile' : 'desktop',
            validation_mode: validationMode,
            sensor_probed: isMobile,
            completed_at: simNow.toISOString()
          }
        });
        if (!rpcErr && rpcRes?.success && rpcRes?.log) {
          logData = { ...(rpcRes.log as PracticeSessionFokusLog), validation_mode: validationMode };
        }
      } catch (_) {}

      // 2. Fallback: Direkter Insert (durch Trigger trg_validate_fokus_log abgesichert, Serverzeit-SSOT)
      if (!logData) {
        const { data: insData, error: logErr } = await supabase
          .from('fokus_logs')
          .insert({
            user_id: studentId,
            duration_seconds: elapsed,
            duration_minutes: durationMinutes,
            is_extra: false,
            flame_level: durationMinutes >= 30 ? 'Große Flamme' : durationMinutes >= 15 ? 'Mittlere Flamme' : 'Kleine Flamme',
            xp_earned: xpGained,
            metadata: {
              device: isMobile ? 'mobile' : 'desktop',
              validation_mode: validationMode,
              sensor_probed: isMobile,
              completed_at: simNow.toISOString()
            }
          })
          .select()
          .single();

        if (!logErr && insData) {
          logData = { ...(insData as PracticeSessionFokusLog), validation_mode: validationMode };
        }
      }

      if (logData) {
        setFokusLogs(prev => [logData!, ...prev]);
        if (typeof window !== 'undefined' && xpGained > 0) {
          window.dispatchEvent(new CustomEvent('campus-xp-awarded', {
            detail: { studentId, amount: xpGained }
          }));
        }
      }

      const currentStreak = streakOverride ?? avatar?.streak_flame ?? studentUser?.streak_flame ?? 0;
      const newStreak = currentStreak === 0 ? 1 : currentStreak;
      const dailyGoal = getTargetMinutes ? getTargetMinutes(currentStreak) : 3;
      const sessionCompletedTarget = elapsed >= (dailyGoal * 60);

      setCelebrationDetails({
        exactSeconds: elapsed,
        sessionMinutes: durationMinutes,
        durationMinutes,
        dailyGoal,
        sessionCompletedTarget,
        streakFlame: newStreak,
        streak: newStreak,
        newStreak,
        xpGained,
        validationMode
      });
      setShowCelebration(true);
      setSecondsElapsed(0);

      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (e) {
      console.error('Error saving practice session:', e);
    }
  };

  // -------------------------------------------------------------
  // Junior Audio Recorder
  // -------------------------------------------------------------
  const [showJuniorRecordModal, setShowJuniorRecordModal] = useState(false);
  const [juniorIsRecording, setJuniorIsRecording] = useState(false);
  const [juniorRecordDuration, setJuniorRecordDuration] = useState(0);
  const [juniorRecordedBlob, setJuniorRecordedBlob] = useState<Blob | null>(null);
  const [juniorRecordedUrl, setJuniorRecordedUrl] = useState<string | null>(null);
  const [juniorRecordTitle, setJuniorRecordTitle] = useState('');
  const [juniorIsSaving, setJuniorIsSaving] = useState(false);
  const [juniorLocalRecordings, setJuniorLocalRecordings] = useState<JuniorLocalRecording[]>(() => {
    try {
      const raw = localStorage.getItem(`campus_junior_recordings_${studentId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const juniorAudioStreamRef = useRef<MediaStream | null>(null);
  const juniorMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const juniorRecordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startJuniorRecordingFlow = async () => {
    try {
      setShowJuniorRecordModal(true);
      const stream = await acquireAudioStream({ audio: PURE_RAW_AUDIO_CONSTRAINTS });
      juniorAudioStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      juniorMediaRecorderRef.current = recorder;

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: mimeType || 'audio/webm' });
        setJuniorRecordedBlob(finalBlob);
        setJuniorRecordedUrl(URL.createObjectURL(finalBlob));
      };

      recorder.start(200);
      setJuniorIsRecording(true);
      setJuniorRecordDuration(0);

      juniorRecordTimerRef.current = setInterval(() => {
        setJuniorRecordDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Mikrofon-Zugriff nicht möglich. Bitte erlaube das Mikrofon im Browser.');
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
      } catch {}
    }
    if (juniorAudioStreamRef.current) {
      releaseAudioStream(juniorAudioStreamRef.current);
      juniorAudioStreamRef.current = null;
    }
    setJuniorIsRecording(false);
  };

  const cancelJuniorRecording = () => {
    stopJuniorRecording();
    setJuniorRecordedBlob(null);
    setJuniorRecordedUrl(null);
    setShowJuniorRecordModal(false);
  };

  const saveJuniorRecording = async () => {
    if (!juniorRecordedBlob || !studentId) return;
    setJuniorIsSaving(true);
    try {
      const recUniqueId = `rec_${studentId}_${Date.now()}`;
      const localBlobKey = `campus_audio_${recUniqueId}_raw`;
      await storeBlob(localBlobKey, juniorRecordedBlob);

      const songTitle = juniorRecordTitle.trim() || `Aufnahme • ${new Date().toLocaleDateString('de-DE')}`;
      const newRecEntry: JuniorLocalRecording = {
        id: recUniqueId,
        title: songTitle,
        url: localBlobKey,
        duration: juniorRecordDuration,
        date: new Date().toISOString(),
        blobKey: localBlobKey
      };

      const localKey = `campus_junior_recordings_${studentId}`;
      const existingLocal: JuniorLocalRecording[] = JSON.parse(localStorage.getItem(localKey) || '[]');
      const updatedLocal: JuniorLocalRecording[] = [newRecEntry, ...existingLocal.filter((x: JuniorLocalRecording) => x.id !== recUniqueId)];
      localStorage.setItem(localKey, JSON.stringify(updatedLocal));
      setJuniorLocalRecordings(updatedLocal);

      cancelJuniorRecording();
    } catch (e) {
      console.error('Error saving junior recording:', e);
      alert('Aufnahme konnte nicht gespeichert werden.');
    } finally {
      setJuniorIsSaving(false);
    }
  };

  const downloadJuniorRecording = (recording: JuniorLocalRecording) => {
    if (!recording?.url) return;
    const a = document.createElement('a');
    a.href = recording.url;
    a.download = `${recording.title || 'Aufnahme'}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Junior Student Recordings List
  const juniorStudentRecordings = useMemo(() => {
    const recsMap = new Map<string, JuniorLocalRecording>();
    (juniorLocalRecordings || []).forEach((item: JuniorLocalRecording) => {
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
  }, [juniorLocalRecordings]);

  // Junior Teacher Recordings (All historical recordings created by the teacher across all weeks/progressItems)
  const juniorTeacherRecordings = useMemo(() => {
    const recsMap = new Map<string, JuniorTeacherRecording>();

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

    (progressItems || []).forEach((item, itemIdx: number) => {
      if (!item) return;
      const itemDate = item.created_at || item.updated_at || new Date().toISOString();
      const itemTopic = item.topic_name || 'Unterrichts-Übung';

      if (item.homework_notes) {
        try {
          const parsed = JSON.parse(item.homework_notes);
          if (Array.isArray(parsed)) {
            parsed.forEach((n: unknown, idx: number) => {
              if (typeof n === 'string') processAudioString(n, itemTopic, itemDate, idx);
            });
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

    try {
      const localGenNotes = typeof window !== 'undefined' && studentId ? localStorage.getItem(`campus_homework_notes_${studentId}`) : null;
      if (localGenNotes && localGenNotes.trim()) {
        try {
          const parsed = JSON.parse(localGenNotes);
          if (Array.isArray(parsed)) {
            parsed.forEach((n: unknown, idx: number) => {
              if (typeof n === 'string') processAudioString(n, 'Hausaufgabe', new Date().toISOString(), idx);
            });
          } else if (typeof parsed === 'string') {
            processAudioString(parsed, 'Hausaufgabe', new Date().toISOString(), 0);
          }
        } catch {
          processAudioString(localGenNotes, 'Hausaufgabe', new Date().toISOString(), 0);
        }
      }
    } catch (e) {}

    return Array.from(recsMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [progressItems, studentId]);

  const monthlyFocusMinutes = useMemo(() => {
    const currentYearMonth = new Date().toISOString().slice(0, 7);
    return (fokusLogs || [])
      .filter((l: PracticeSessionFokusLog) => (l.date || l.created_at || '').startsWith(currentYearMonth))
      .reduce((sum: number, l: PracticeSessionFokusLog) => sum + (l.duration_minutes || Math.floor((l.duration_seconds || 0) / 60)), 0);
  }, [fokusLogs]);

  return {
    sessionActive,
    setSessionActive,
    secondsElapsed,
    setSecondsElapsed,
    isSessionPaused,
    setIsSessionPaused,
    isSessionPausedRef,
    isPhoneFlat,
    flatType,
    graceSecondsLeft,
    sessionAbortedNotice,
    setSessionAbortedNotice,
    requestOrientationPermission,
    fokusLogs,
    setFokusLogs,
    monthlyFocusMinutes,
    fetchFokusLogs,
    finishPracticeSession,
    showCelebration,
    setShowCelebration,
    celebrationDetails,
    celebrationRingProgress,
    showJuniorRecordModal,
    setShowJuniorRecordModal,
    juniorIsRecording,
    juniorRecordDuration,
    juniorRecordedBlob,
    juniorRecordedUrl,
    juniorRecordTitle,
    setJuniorRecordTitle,
    juniorIsSaving,
    startJuniorRecordingFlow,
    stopJuniorRecording,
    cancelJuniorRecording,
    saveJuniorRecording,
    downloadJuniorRecording,
    juniorStudentRecordings,
    juniorTeacherRecordings
  };
}
