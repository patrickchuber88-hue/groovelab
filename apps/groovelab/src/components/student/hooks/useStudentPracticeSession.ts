import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { storeBlob, getBlob, deleteBlob } from '../../../utils/blobStorage';
import { computePeaksFromArrayBuffer } from '../../../utils/waveformHelper';
import { processPureRawBlob, TARGET_PURE_RAW_LUFS, TARGET_PEAK_DBTP, MAX_PURE_RAW_LIMITER_GR_DB } from '../../../utils/audioMasteringEngine';
import { acquireAudioStream, releaseAudioStream, PURE_RAW_AUDIO_CONSTRAINTS } from '../../../services/audioPermissionService';
import { toLocalYYYYMMDD, getSimulatedNow, getDaysBetweenLocal, getISOWeek } from '../studentDateUtils';
import { MIN_PRACTICE_SECONDS } from '../utils/studentAvatarDashboardUtils';

interface UseStudentPracticeSessionProps {
  studentId: string;
  studentUser: any;
  avatar: any;
  studentUiLevel: string;
  isTeacherSession: boolean;
  onRefreshData?: () => Promise<void>;
  getTargetMinutes: (streak: number) => number;
}

export function useStudentPracticeSession({
  studentId,
  studentUser,
  avatar,
  studentUiLevel,
  isTeacherSession,
  onRefreshData,
  getTargetMinutes
}: UseStudentPracticeSessionProps) {
  // Practice session timer states
  const [sessionActive, setSessionActive] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const secondsElapsedRef = useRef(0);
  useEffect(() => {
    secondsElapsedRef.current = secondsElapsed;
  }, [secondsElapsed]);

  // Gyro Detox & flat orientation states
  const [isPhoneFlat, setIsPhoneFlat] = useState(false);
  const isPhoneFlatRef = useRef(isPhoneFlat);
  useEffect(() => {
    isPhoneFlatRef.current = isPhoneFlat;
  }, [isPhoneFlat]);
  const [flatType, setFlatType] = useState<'face-up' | 'face-down' | 'none'>('none');
  const [graceSecondsLeft, setGraceSecondsLeft] = useState(10);

  // Focus logs state
  const [fokusLogs, setFokusLogs] = useState<any[]>([]);
  const currentLogIdRef = useRef<string | null>(null);

  // Celebration modal states
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationDetails, setCelebrationDetails] = useState<any>(null);
  const [celebrationRingProgress, setCelebrationRingProgress] = useState(0);

  // WakeLock ref for active practice sessions
  const wakeLockRef = useRef<any>(null);

  // Active Timer Loop
  useEffect(() => {
    let timer: any = null;
    if (sessionActive) {
      timer = setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);

      if ('wakeLock' in navigator) {
        (navigator as any).wakeLock.request('screen').then((lock: any) => {
          wakeLockRef.current = lock;
        }).catch(() => {});
      }
    } else {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    }
    return () => {
      if (timer) clearInterval(timer);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [sessionActive]);

  // Fetch Fokus Logs
  const fetchFokusLogs = useCallback(async () => {
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
    } catch (err) {
      console.error('Error fetching fokus logs:', err);
    }
  }, [studentId]);

  useEffect(() => {
    fetchFokusLogs();
  }, [fetchFokusLogs]);

  // Finish Practice Session
  const finishPracticeSession = async () => {
    const elapsed = secondsElapsedRef.current;
    if (elapsed <= 0) {
      setSessionActive(false);
      setSecondsElapsed(0);
      return;
    }

    setSessionActive(false);
    const durationMinutes = Math.max(1, Math.floor(elapsed / 60));
    const xpGained = durationMinutes * 10;

    try {
      const simNow = getSimulatedNow();
      const { data: logData, error: logErr } = await supabase
        .from('fokus_logs')
        .insert({
          user_id: studentId,
          duration_seconds: elapsed,
          duration_minutes: durationMinutes,
          is_extra: false,
          flame_level: 'Kleine Flamme',
          created_at: simNow.toISOString()
        })
        .select()
        .single();

      if (!logErr && logData) {
        setFokusLogs(prev => [logData, ...prev]);
      }

      // Update avatar XP
      const currentStreak = avatar?.streak_flame || 0;
      const newStreak = currentStreak === 0 ? 1 : currentStreak;
      const newXp = (avatar?.xp || 0) + xpGained;

      await supabase
        .from('avatars')
        .update({
          xp: newXp,
          streak_flame: newStreak
        })
        .eq('user_id', studentId);

      setCelebrationDetails({
        durationMinutes,
        xpGained,
        newStreak
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
  const [juniorLocalRecordings, setJuniorLocalRecordings] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem(`campus_junior_recordings_${studentId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const juniorAudioStreamRef = useRef<MediaStream | null>(null);
  const juniorMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const juniorRecordTimerRef = useRef<any>(null);

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
      const newRecEntry = {
        id: recUniqueId,
        title: songTitle,
        url: localBlobKey,
        duration: juniorRecordDuration,
        date: new Date().toISOString(),
        blobKey: localBlobKey
      };

      const localKey = `campus_junior_recordings_${studentId}`;
      const existingLocal = JSON.parse(localStorage.getItem(localKey) || '[]');
      const updatedLocal = [newRecEntry, ...existingLocal.filter((x: any) => x.id !== recUniqueId)];
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

  const downloadJuniorRecording = (recording: any) => {
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
    const recsMap = new Map<string, any>();
    (juniorLocalRecordings || []).forEach((item: any) => {
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

  // Junior Teacher Recordings
  const juniorTeacherRecordings = useMemo(() => {
    return [];
  }, []);

  return {
    sessionActive,
    setSessionActive,
    secondsElapsed,
    setSecondsElapsed,
    isPhoneFlat,
    flatType,
    graceSecondsLeft,
    fokusLogs,
    setFokusLogs,
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
