import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  X, Mic, Square, Play, Pause, RotateCcw, Check, Loader2, Send, FileText, Plus, ChevronRight, Trash2, Zap, Sparkles, ArrowLeft, Music, Sliders, Volume2, VolumeX, Activity, Tag, Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { acquireAudioStream, releaseAudioStream, requestMicrophonePermissionOnce, PURE_RAW_AUDIO_CONSTRAINTS } from '../../services/audioPermissionService';
import { processPureRawBlob, TARGET_PURE_RAW_LUFS, TARGET_PEAK_DBTP, MAX_PURE_RAW_LIMITER_GR_DB } from '../../utils/audioMasteringEngine';
import { capitalizeFirstLetter, formatSingleStudentAnonymized } from '../../utils/nameHelper';
import { saveOfflineAudioRecord, removeOfflineAudioRecord } from '../../utils/offlineAudioVault';
import { notifyOfflineListeners } from '../../services/offlineSyncService';
import { checkIsAudioTresorActive, isInternalMetadataNote } from '../../domain/stickersAndTresor';
import { isUUID } from '../../utils/uuidValidator';
import { useDictationInput } from '../../hooks/useVoiceToText';
import { byteFrequencyToDawMeterPercent } from '../../utils/audioVuMeterHelper';
import { WochenFahrplanAudioPlayer } from '../teacher/tageskompass/wochenfahrplan';
import { buildHomeworkNotesPayload, parseHomeworkNotesPayload } from '../../utils/homeworkSnapshotHelper';
import { getSimulatedNow, getISOWeekRaw } from '../teacher/utils/teacherDashboardUtils';

interface RecordedClip {
  id: string;
  blob?: Blob;
  url: string;
  durationSeconds: number;
  title: string;
  tag?: string;
  isExisting?: boolean;
  metronomeBpm?: number;
}

interface TagesplanQuickAudioModalProps {
  isOpen: boolean;
  student: any;
  teacher: any;
  allStudents?: any[];
  dateStr?: string;
  hasTresorStorage?: boolean;
  onClose: () => void;
  onSaved?: (resultUrlOrText: string) => void;
}

interface TemplateCategory {
  id: string;
  title: string;
  iconType: 'music' | 'sliders' | 'sparkles';
  items: string[];
}

const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'practice',
    title: 'Üben & Tempo',
    iconType: 'music',
    items: [
      'Takt 1–8 wiederholen',
      'Mit Metronom (60 bpm) langsam üben',
      'Langsam und sorgfältig einüben',
      'Rhythmus laut mitzählen',
      'Schwierige Stellen isoliert 5x wiederholen'
    ]
  },
  {
    id: 'technique',
    title: 'Technik & Haltung',
    iconType: 'sliders',
    items: [
      'Auf den richtigen Fingersatz achten',
      'Wechselschlag kontrollieren',
      'Handhaltung entspannen und locker bleiben',
      'Dynamik und saubere Betonung beachten',
      'Sauberen Tonansatz und Dämpfung üben'
    ]
  },
  {
    id: 'performance',
    title: 'Stück & Motivation',
    iconType: 'sparkles',
    items: [
      'Ablauf auswendig versuchen',
      'Intro und Refrain flüssig verbinden',
      'Nächste Woche zum Vorspielen vorbereiten',
      'Tolle Leistung heute! Weiter so.'
    ]
  }
];

export interface DidacticFocus {
  id: string;
  icon: string;
  label: string;
  subtitle: string;
  phrase: string;
  keywords: string[];
}

export const DIDACTIC_FOCUS_ITEMS: DidacticFocus[] = [
  { id: 'fingersatz', icon: '🖐️', label: 'Fingersatz', subtitle: 'Technik & Handhaltung', phrase: 'Auf den richtigen Fingersatz achten', keywords: ['fingersatz', 'handhaltung'] },
  { id: 'rhythmus', icon: '🥁', label: 'Rhythmus', subtitle: 'Groove & Zählen', phrase: 'Rhythmus laut mitzählen und Groove halten', keywords: ['rhythmus', 'groove', 'takt zählen', 'mitzählen'] },
  { id: 'slowmo', icon: '🐢', label: 'Slow-Mo', subtitle: 'Langsames Üben & Isolieren', phrase: 'Langsam üben und schwierige Stellen 5x isolieren', keywords: ['slow-mo', 'slowmo', 'slow practice', 'langsam üben', 'schwierige stellen isolieren'] },
  { id: 'dynamik', icon: '🔊', label: 'Dynamik', subtitle: 'Ausdruck & Klangqualität', phrase: 'Dynamik und saubere Betonung beachten', keywords: ['dynamik', 'klangqualität', 'laut/leise', 'betonung'] },
  { id: 'auswendig', icon: '🧠', label: 'Auswendig', subtitle: 'Struktur & Gedächtnis', phrase: 'Ablauf auswendig versuchen', keywords: ['auswendig', 'gedächtnis', 'ohne noten'] }
];

export interface PassagePill {
  id: string;
  label: string;
  text: string;
}

export const PASSAGE_PILLS: PassagePill[] = [
  { id: 'passage_takt', label: 'S. 14 • Takt 1–8', text: 'S. 14: Takt 1–8 wiederholen' },
  { id: 'passage_intro', label: 'Intro & Strophe', text: 'Intro und erste Strophe flüssig üben' },
  { id: 'passage_schwer', label: 'Schwierige Stelle 5x', text: 'Schwierige Stellen isoliert 5x wiederholen' },
  { id: 'passage_metro', label: 'Mit Metronom', text: 'Mit Metronom im Zieltempo üben' },
  { id: 'passage_refrain', label: 'Refrain & Outro', text: 'Refrain und Outro im Zusammenhang spielen' }
];

const METRONOME_PRESETS = [60, 80, 100, 120];
const CLIP_TAGS = ['Tempo 60', 'Originaltempo', 'Play-Along', 'Melodie', 'Begleitung', 'Übung'];

export const TagesplanQuickAudioModal: React.FC<TagesplanQuickAudioModalProps> = ({
  isOpen,
  student,
  teacher,
  allStudents,
  dateStr,
  hasTresorStorage,
  onClose,
  onSaved
}) => {
  const [viewState, setViewState] = useState<'main' | 'templates'>('main');

  const isTresorActive = Boolean(
    hasTresorStorage ?? (checkIsAudioTresorActive(student) || checkIsAudioTresorActive(teacher))
  );
  const maxRecordSeconds = isTresorActive ? 420 : 60;

  // Student Identity Resolution (hoisted above handleTextChange to eliminate TDZ error)
  const studentFirstName = student?.first_name || (student?.name ? student.name.split(' ')[0] : 'Schüler');
  const studentLastName = student?.last_name || (student?.name ? student.name.split(' ').slice(1).join(' ') : '');

  const matchedStudentFromAll = allStudents?.find((s: any) => 
    (student?.id && s.id === student.id) ||
    (student?.student_id && s.id === student.student_id) ||
    (student?.studentId && s.id === student.studentId) ||
    (s.first_name && studentFirstName && s.first_name.trim().toLowerCase() === studentFirstName.trim().toLowerCase() &&
     (!studentLastName || !s.last_name || s.last_name.trim().toLowerCase().startsWith(studentLastName.trim().toLowerCase()[0]))) ||
    (s.name && student?.name && s.name.trim().toLowerCase() === student.name.trim().toLowerCase())
  );

  const effectiveStudentId = 
    (isUUID(matchedStudentFromAll?.id) ? matchedStudentFromAll.id : null) ||
    (isUUID(student?.id) ? student.id : null) ||
    (isUUID(student?.student_id) ? student.student_id : null) ||
    (isUUID(student?.studentId) ? student.studentId : null) ||
    matchedStudentFromAll?.id ||
    student?.id || 
    student?.student_id || 
    student?.studentId || 
    student?.userId || 
    student?.user_id ||
    (studentFirstName ? `student_${studentFirstName.trim().toLowerCase()}_${(studentLastName || '').trim().toLowerCase()}`.replace(/[^a-z0-9_]/gi, '_') : 'student_active');

  const allStudentKeys = useMemo(() => {
    return Array.from(new Set([
      effectiveStudentId,
      student?.id,
      student?.student_id,
      student?.studentId,
      (student as any)?.slot_id,
      matchedStudentFromAll?.id
    ].filter(Boolean))) as string[];
  }, [effectiveStudentId, student, matchedStudentFromAll]);

  const studentDisplayName = formatSingleStudentAnonymized(studentFirstName, studentLastName, effectiveStudentId, true);

  const stopHardwareRef = useRef<(includeDictation?: boolean) => void>(() => {});

  // --- Dictation / Note State & Canonical Engine ---
  const [dictatedText, setDictatedText] = useState('');
  const stopDictationRef = useRef<(() => void) | null>(null);

  const handleTextChange = useCallback((newText: string) => {
    setDictatedText(newText);
    try {
      if (newText.trim()) {
        localStorage.setItem(`cgl_draft_hw_${effectiveStudentId}`, newText);
      } else {
        localStorage.removeItem(`cgl_draft_hw_${effectiveStudentId}`);
      }
    } catch {}
  }, [effectiveStudentId]);

  const {
    isListening: isDictating,
    startListening: startDictationHook,
    stopListening: stopDictationHook,
  } = useDictationInput({
    value: dictatedText,
    onChange: handleTextChange,
    onStart: () => stopHardwareRef.current(false)
  });

  stopDictationRef.current = stopDictationHook;

  const handleStartDictation = async () => {
    const hasPermission = await requestMicrophonePermissionOnce();
    if (!hasPermission) return;
    startDictationHook();
  };

  const handleStopDictation = () => {
    stopDictationHook();
  };

  // --- Multi-Audio Recording State & Anti-Double Locks ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingSecondsRef = useRef(0);
  const [recordedClips, setRecordedClips] = useState<RecordedClip[]>([]);
  const [activePlayingClipId, setActivePlayingClipId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0); // 0 to 1

  // Atomic Hardware & Re-Entrance Locks
  const isStartingRecordRef = useRef(false);
  const isRecordingRef = useRef(false);
  const hasStoppedCurrentRecordingRef = useRef(false);

  // --- Metronome Engine State ---
  const [showMetronome, setShowMetronome] = useState<boolean>(false);
  const [metronomeActive, setMetronomeActive] = useState<boolean>(false);
  const [metronomeBpm, setMetronomeBpm] = useState<number>(80);
  const [metronomeSound, setMetronomeSound] = useState<boolean>(false); // default: silent visual pulse to prevent mic bleed
  const [metronomeCountIn, setMetronomeCountIn] = useState<boolean>(true); // 4-beat count-in before recording
  const [currentBeat, setCurrentBeat] = useState<number>(0); // 0, 1, 2, 3
  const [countInRemaining, setCountInRemaining] = useState<number | null>(null); // 4, 3, 2, 1

  const tapTimesRef = useRef<number[]>([]);
  const metronomeIntervalRef = useRef<any>(null);
  const countInIntervalRef = useRef<any>(null);
  const currentBeatRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // --- Live Waveform VU-Meter ---
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // --- Common State ---
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioElemRef = useRef<HTMLAudioElement | null>(null);

  const isSpeechSupported = typeof window !== 'undefined' && 
    (Boolean((window as any).SpeechRecognition) || Boolean((window as any).webkitSpeechRecognition));

  const [hasExistingHomework, setHasExistingHomework] = useState(false);

  useEffect(() => {
    if (isOpen && student) {
      setViewState('main');
      setSaveSuccess(false);
      setActivePlayingClipId(null);
      setPlaybackProgress(0);
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;
      isStartingRecordRef.current = false;
      isRecordingRef.current = false;
      hasStoppedCurrentRecordingRef.current = false;
      setCountInRemaining(null);

      // Hydrate from localStorage across all known candidate keys
      let existingList: string[] = [];
      for (const key of allStudentKeys) {
        try {
          const raw = localStorage.getItem(`campus_homework_notes_${key}`);
          if (raw) {
            const p = JSON.parse(raw);
            if (Array.isArray(p) && p.length > 0) {
              existingList = p;
              break;
            } else if (typeof p === 'string' && p.trim()) {
              existingList = [p.trim()];
              break;
            }
          }
        } catch {}
      }

      // Also incorporate recordings from campus_teacher_audio_vault
      for (const key of allStudentKeys) {
        try {
          const vRaw = localStorage.getItem(`campus_teacher_audio_vault_${key}`);
          if (vRaw) {
            const vList = JSON.parse(vRaw);
            if (Array.isArray(vList)) {
              vList.forEach((item: any) => {
                const s = typeof item === 'string' ? item : item?.audioMetaStr;
                if (s && s.includes('AUDIO:') && !existingList.includes(s)) {
                  existingList.push(s);
                }
              });
            }
          }
        } catch {}
      }

      const loadedClips: RecordedClip[] = [];
      const seenUrls = new Set<string>();
      existingList.forEach((entry, idx) => {
        if (typeof entry === 'string' && entry.includes('AUDIO:')) {
          const clean = entry.substring(entry.indexOf('AUDIO:') + 6);
          const parts = clean.split('|');
          const url = parts[0]?.trim();
          if (url && !seenUrls.has(url)) {
            seenUrls.add(url);
            const dur = parseInt(parts[1] || '0', 10) || 0;
            const title = parts[3]?.trim() || `Aufnahme #${idx + 1}`;
            const bpmPart = parts.find(p => typeof p === 'string' && p.trim().startsWith('BPM:'));
            const clipBpm = bpmPart ? parseInt(bpmPart.trim().replace('BPM:', ''), 10) : undefined;
            loadedClips.push({
              id: `existing_${encodeURIComponent(url)}`,
              url,
              durationSeconds: dur,
              title,
              isExisting: true,
              metronomeBpm: clipBpm && clipBpm > 0 ? clipBpm : undefined,
              blob: new Blob()
            });
          }
        }
      });

      const textNotes = existingList
        .filter(n => typeof n === 'string' && !isInternalMetadataNote(n) && !n.includes('AUDIO:'))
        .map(s => s.trim())
        .filter(Boolean);

      // Check for offline draft first
      const draftKey = `cgl_draft_hw_${effectiveStudentId}`;
      const savedDraft = localStorage.getItem(draftKey);

      setRecordedClips(loadedClips);
      if (savedDraft && savedDraft.trim()) {
        setDictatedText(savedDraft);
      } else {
        setDictatedText(textNotes.join('\n\n'));
      }
      const hasContent = loadedClips.length > 0 || textNotes.length > 0 || Boolean(savedDraft && savedDraft.trim());
      setHasExistingHomework(hasContent);

      // If localStorage had nothing and student ID is a valid UUID, fetch from Supabase
      if (!hasContent && isUUID(effectiveStudentId)) {
        supabase
          .from('progress_matrix')
          .select('homework_notes')
          .eq('student_id', effectiveStudentId)
          .ilike('topic_name', 'Hausaufgabe KW %')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data }) => {
            if (data && data.homework_notes) {
              try {
                let dbList: string[] = [];
                const p = JSON.parse(data.homework_notes);
                if (Array.isArray(p)) dbList = p;
                else if (typeof p === 'string') dbList = [p];

                const dbClips: RecordedClip[] = [];
                const dbSeen = new Set<string>();
                dbList.forEach((entry, idx) => {
                  if (typeof entry === 'string' && entry.includes('AUDIO:')) {
                    const clean = entry.substring(entry.indexOf('AUDIO:') + 6);
                    const parts = clean.split('|');
                    const url = parts[0]?.trim();
                    if (url && !dbSeen.has(url)) {
                      dbSeen.add(url);
                      const dur = parseInt(parts[1] || '0', 10) || 0;
                      const title = parts[3]?.trim() || `Aufnahme #${idx + 1}`;
                      const dbBpmPart = parts.find(p => typeof p === 'string' && p.trim().startsWith('BPM:'));
                      const dbClipBpm = dbBpmPart ? parseInt(dbBpmPart.trim().replace('BPM:', ''), 10) : undefined;
                      dbClips.push({
                        id: `existing_${encodeURIComponent(url)}`,
                        url,
                        durationSeconds: dur,
                        title,
                        isExisting: true,
                        metronomeBpm: dbClipBpm && dbClipBpm > 0 ? dbClipBpm : undefined,
                        blob: new Blob()
                      });
                    }
                  }
                });
                const dbTexts = dbList
                  .filter(n => typeof n === 'string' && !isInternalMetadataNote(n) && !n.includes('AUDIO:'))
                  .map(s => s.trim())
                  .filter(Boolean);

                if (dbClips.length > 0 || dbTexts.length > 0) {
                  setRecordedClips(dbClips);
                  setDictatedText(dbTexts.join('\n\n'));
                  setHasExistingHomework(true);
                  allStudentKeys.forEach(k => {
                    try { localStorage.setItem(`campus_homework_notes_${k}`, JSON.stringify(dbList)); } catch {}
                  });
                }
              } catch {}
            }
          });
      }
    } else if (!isOpen) {
      setDictatedText('');
      setRecordedClips([]);
      setHasExistingHomework(false);
    }
  }, [student, dateStr, isOpen, allStudentKeys, effectiveStudentId]);

  // Metronome Web Audio Synthesizer
  const playMetronomeClick = useCallback((isAccent: boolean, forceAudible = false) => {
    if (!metronomeSound && !forceAudible) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isAccent ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(isAccent ? 1320 : 880, ctx.currentTime);

      const peakGain = isAccent ? 0.6 : 0.35;
      gain.gain.setValueAtTime(peakGain, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.045);
    } catch {}
  }, [metronomeSound]);

  // Metronome Pulse Engine
  useEffect(() => {
    if (metronomeActive || isRecording) {
      if (metronomeIntervalRef.current) clearInterval(metronomeIntervalRef.current);
      currentBeatRef.current = 0;
      setCurrentBeat(0);
      playMetronomeClick(true);

      const intervalMs = (60 / metronomeBpm) * 1000;
      metronomeIntervalRef.current = setInterval(() => {
        currentBeatRef.current = (currentBeatRef.current + 1) % 4;
        const isAccent = currentBeatRef.current === 0;
        setCurrentBeat(currentBeatRef.current);
        playMetronomeClick(isAccent);
      }, intervalMs);
    } else {
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
        metronomeIntervalRef.current = null;
      }
      setCurrentBeat(0);
      currentBeatRef.current = 0;
    }

    return () => {
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
        metronomeIntervalRef.current = null;
      }
    };
  }, [metronomeActive, isRecording, metronomeBpm, playMetronomeClick]);

  // Live Audio Level VU Loop
  const startLevelMeter = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);

      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
        // 🎚️ 2027 DAW Goldstandard: Quasialogarithmisches IEC 60268-10 / DIN PPM Metering
        const dawPct = byteFrequencyToDawMeterPercent(dataArrayRef.current);
        setAudioLevel(dawPct / 100);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (e) {
      console.warn('[QuickAudioModal] Level meter note:', e);
    }
  };

  const stopLevelMeter = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  };

  const handleCancelCountIn = useCallback(() => {
    if (countInIntervalRef.current) {
      clearInterval(countInIntervalRef.current);
      countInIntervalRef.current = null;
    }
    setCountInRemaining(null);
    if (streamRef.current) {
      releaseAudioStream(streamRef.current);
      streamRef.current = null;
    }
    isStartingRecordRef.current = false;
  }, []);

  const stopHardware = useCallback((includeDictation = true) => {
    isStartingRecordRef.current = false;
    isRecordingRef.current = false;
    hasStoppedCurrentRecordingRef.current = true;
    setIsRecording(false);
    setMetronomeActive(false);
    if (countInIntervalRef.current) {
      clearInterval(countInIntervalRef.current);
      countInIntervalRef.current = null;
    }
    setCountInRemaining(null);

    stopLevelMeter();

    if (streamRef.current) {
      releaseAudioStream(streamRef.current);
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
      mediaRecorderRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current);
      metronomeIntervalRef.current = null;
    }
    if (audioElemRef.current) {
      audioElemRef.current.pause();
      audioElemRef.current = null;
    }
    setActivePlayingClipId(null);
    setPlaybackProgress(0);

    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }

    if (includeDictation) {
      stopDictationRef.current?.();
    }
  }, []);

  stopHardwareRef.current = stopHardware;

  // Hardware cleanup on unmount
  useEffect(() => {
    return () => {
      stopHardware();
    };
  }, [stopHardware]);

  // Keyboard accessibility: ESC key handler closes modal fail-safe
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        if (countInRemaining !== null) {
          handleCancelCountIn();
          return;
        }
        if (!isRecording && !isDictating) {
          stopHardware();
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isRecording, isDictating, isSaving, countInRemaining, handleCancelCountIn, stopHardware, onClose]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopHardware();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopHardware();
    };
  }, []);

  if (!isOpen || !student) return null;

  const appendSentence = (existing: string, addition: string): string => {
    const cleanExisting = (existing || '').trim();
    const cleanAddition = capitalizeFirstLetter((addition || '').trim());
    if (!cleanAddition) return cleanExisting;
    if (!cleanExisting) return cleanAddition;

    if (/[.!?\n]$/.test(cleanExisting)) {
      return `${cleanExisting} ${cleanAddition}`;
    }
    return `${cleanExisting}. ${cleanAddition}`;
  };

  const handleAppendPhrase = (phrase: string) => {
    setDictatedText(prev => {
      const next = appendSentence(prev, phrase);
      try { localStorage.setItem(`cgl_draft_hw_${effectiveStudentId}`, next); } catch {}
      return next;
    });
  };

  const isFocusActive = (focus: DidacticFocus) => {
    const lower = dictatedText.toLowerCase();
    return (
      lower.includes(focus.phrase.toLowerCase()) ||
      lower.includes(`fokus: ${focus.label.toLowerCase()}`) ||
      lower.includes(focus.label.toLowerCase()) ||
      focus.keywords.some(kw => lower.includes(kw.toLowerCase()))
    );
  };

  const handleToggleFocus = (focus: DidacticFocus) => {
    setDictatedText(prev => {
      const trimmed = prev.trim();
      const hasFocus = isFocusActive(focus);

      let nextText = '';
      if (hasFocus) {
        // Try removing the standard phrase first
        const phraseRegex = new RegExp(`(?:[.,;!?]?\\s*)?${focus.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[.,;!?])?`, 'gi');
        let stripped = trimmed.replace(phraseRegex, '').trim();

        // Also clean up any focus tag if present
        const tagRegex = new RegExp(`(?:[.,;!?]?\\s*)?\\[?Fokus:\\s*${focus.label}\\]?(?:[.,;!?])?`, 'gi');
        stripped = stripped.replace(tagRegex, '').trim();

        // If phrase was not found as exact string, remove only sentences that explicitly mention the focus label or phrase
        if (stripped === trimmed) {
          const sentences = trimmed.split(/(?<=[.!?\n])\s+/);
          const filtered = sentences.filter(s => {
            const sLower = s.toLowerCase();
            return !sLower.includes(focus.label.toLowerCase()) && !sLower.includes(focus.phrase.toLowerCase());
          });
          stripped = filtered.join(' ').trim();
        }

        stripped = stripped
          .replace(/[ \t]+/g, ' ')
          .replace(/\s+([.,!?])/g, '$1')
          .replace(/^[.,!?\s]+/, '')
          .replace(/[.,!?\s]+$/, (match) => match.includes('!') ? '!' : match.includes('?') ? '?' : '.')
          .trim();

        if (/^[.,!?\s]*$/.test(stripped)) stripped = '';
        nextText = stripped;
      } else {
        nextText = appendSentence(trimmed, focus.phrase);
      }

      try {
        if (nextText) {
          localStorage.setItem(`cgl_draft_hw_${effectiveStudentId}`, nextText);
        } else {
          localStorage.removeItem(`cgl_draft_hw_${effectiveStudentId}`);
        }
      } catch {}

      return nextText;
    });
  };

  const handleAppendPassage = (text: string) => {
    setDictatedText(prev => {
      const clean = prev.trim();
      const addition = capitalizeFirstLetter(text);
      if (!clean) {
        try { localStorage.setItem(`cgl_draft_hw_${effectiveStudentId}`, addition); } catch {}
        return addition;
      }
      if (clean.toLowerCase().includes(text.toLowerCase())) return clean;
      const next = appendSentence(clean, addition);
      try { localStorage.setItem(`cgl_draft_hw_${effectiveStudentId}`, next); } catch {}
      return next;
    });
  };

  const handleSkipCountIn = () => {
    if (countInIntervalRef.current) {
      clearInterval(countInIntervalRef.current);
      countInIntervalRef.current = null;
    }
    setCountInRemaining(null);
    if (streamRef.current) {
      startRecordingOnHardwareStream(streamRef.current);
    }
  };

  // Tap Tempo Handler
  const handleTapTempo = () => {
    const now = Date.now();
    tapTimesRef.current = [...tapTimesRef.current.filter(t => now - t < 3000), now];
    if (tapTimesRef.current.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.min(240, Math.max(40, Math.round(60000 / avgMs)));
      setMetronomeBpm(calculatedBpm);
    }
  };

  // 2. AUDIO RECORD LOGIC WITH ATOMIC RE-ENTRANCE LOCK & ZERO-LATENCY PRE-WARMED STREAM
  const startRecordingOnHardwareStream = (stream: MediaStream) => {
    try {
      if (audioElemRef.current) {
        audioElemRef.current.pause();
        audioElemRef.current = null;
      }
      setActivePlayingClipId(null);
      setPlaybackProgress(0);
      setSaveSuccess(false); 
      audioChunksRef.current = [];
      hasStoppedCurrentRecordingRef.current = false;

      startLevelMeter(stream);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => { 
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        if (hasStoppedCurrentRecordingRef.current) return;
        hasStoppedCurrentRecordingRef.current = true;
        stopLevelMeter();

        const rawBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const durationSec = Math.max(1, recordingSecondsRef.current);
        let finalBlob = rawBlob;
        let finalUrl = URL.createObjectURL(rawBlob);
        try {
          const mastered = await processPureRawBlob(rawBlob, {
            targetLufs: TARGET_PURE_RAW_LUFS,
            maxLimiterGrDb: MAX_PURE_RAW_LIMITER_GR_DB,
            targetPeakDb: TARGET_PEAK_DBTP
          });
          finalBlob = mastered.processedBlob;
          finalUrl = mastered.processedUrl || URL.createObjectURL(mastered.processedBlob);
        } catch {
          finalBlob = rawBlob;
          finalUrl = URL.createObjectURL(rawBlob);
        }
        
        const todayFormatted = dateStr 
          ? new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
          : new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        
        const currentCount = recordedClips.length;
        const clipTitle = `Aufnahme ${currentCount + 1} (${todayFormatted})`;
        const effectiveClipBpm = metronomeBpm > 0 ? metronomeBpm : undefined;
        const newClip: RecordedClip = {
          id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          blob: finalBlob,
          url: finalUrl,
          durationSeconds: durationSec,
          title: clipTitle,
          metronomeBpm: effectiveClipBpm
        };

        setRecordedClips(prev => [...prev, newClip]);

        if (streamRef.current) {
          releaseAudioStream(streamRef.current);
          streamRef.current = null;
        }
        isStartingRecordRef.current = false;
        isRecordingRef.current = false;
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      isRecordingRef.current = true;
      isStartingRecordRef.current = false;
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(s => {
          const next = s + 1;
          recordingSecondsRef.current = next;
          if (next >= maxRecordSeconds) {
            handleStopRecord();
          }
          return next;
        });
      }, 1000);
    } catch (err) { 
      console.error('[QuickAudioModal] Failed to start record:', err);
      stopHardware();
    }
  };

  const handleStartRecord = async () => {
    // ATOMIC GUARD: Prevent double clicks and parallel recorders
    if (isStartingRecordRef.current || isRecordingRef.current) return;
    isStartingRecordRef.current = true;

    // Stop metronome preview if running
    setMetronomeActive(false);

    try {
      // 1. Pre-warm hardware audio stream before count-in to eliminate downbeat latency
      const stream = await acquireAudioStream({ audio: PURE_RAW_AUDIO_CONSTRAINTS });
      streamRef.current = stream;

      // 2. Count-in countdown
      if (metronomeCountIn) {
        let count = 4;
        setCountInRemaining(count);
        playMetronomeClick(true, true);

        const beatMs = (60 / metronomeBpm) * 1000;
        if (countInIntervalRef.current) clearInterval(countInIntervalRef.current);
        countInIntervalRef.current = setInterval(() => {
          count -= 1;
          if (count > 0) {
            setCountInRemaining(count);
            playMetronomeClick(false, true);
          } else {
            if (countInIntervalRef.current) {
              clearInterval(countInIntervalRef.current);
              countInIntervalRef.current = null;
            }
            setCountInRemaining(null);
            // 🎯 Zero-Latency Instant Downbeat
            startRecordingOnHardwareStream(stream);
          }
        }, beatMs);
      } else {
        startRecordingOnHardwareStream(stream);
      }
    } catch (err) {
      console.error('[QuickAudioModal] Failed to acquire stream for recording:', err);
      stopHardware();
    }
  };

  const handleStopRecord = () => {
    if (hasStoppedCurrentRecordingRef.current) return;
    setIsRecording(false);
    isRecordingRef.current = false;
    isStartingRecordRef.current = false;
    stopLevelMeter();

    if (timerRef.current) { 
      clearInterval(timerRef.current); 
      timerRef.current = null; 
    }
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try { rec.requestData(); } catch (e) {}
      // 🛡️ 500ms Safety Buffer: Garantiert vollständigen Ausklang & Raumhall
      setTimeout(() => {
        try {
          if (rec.state !== 'inactive') {
            rec.stop();
          }
        } catch (e) {
          console.warn('Error stopping mediaRecorder:', e);
        }
      }, 500);
    }
  };

  const handleTogglePlayback = (clip: RecordedClip) => {
    if (!clip.url) return;
    if (activePlayingClipId === clip.id) {
      if (audioElemRef.current) audioElemRef.current.pause();
      setActivePlayingClipId(null);
      setPlaybackProgress(0);
    } else {
      if (audioElemRef.current) audioElemRef.current.pause();
      const audio = new Audio(clip.url);
      audioElemRef.current = audio;
      audio.ontimeupdate = () => {
        if (audio.duration) {
          setPlaybackProgress(audio.currentTime / audio.duration);
        }
      };
      audio.onended = () => {
        setActivePlayingClipId(null);
        setPlaybackProgress(0);
      };
      audio.play()
        .then(() => setActivePlayingClipId(clip.id))
        .catch(() => {
          setActivePlayingClipId(null);
          setPlaybackProgress(0);
        });
    }
  };

  const handleTagClip = (clipId: string, tag: string) => {
    setRecordedClips(prev => prev.map(c => {
      if (c.id === clipId) {
        const newTitle = c.title.includes('•') 
          ? `${c.title.split('•')[0].trim()} • ${tag}`
          : `${c.title} • ${tag}`;
        return { ...c, title: newTitle, tag };
      }
      return c;
    }));
  };

  const handleDeleteClip = (clipId: string) => {
    if (activePlayingClipId === clipId && audioElemRef.current) {
      audioElemRef.current.pause();
      audioElemRef.current = null;
      setActivePlayingClipId(null);
      setPlaybackProgress(0);
    }
    setRecordedClips(prev => prev.filter(c => c.id !== clipId));
  };

  // 3. UNIFIED BLITZ-SAVE LOGIC (MULTI-AUDIO + TEXT + DB SYNC)
  const handleSaveBlitzHomework = async () => {
    if (recordedClips.length === 0 && !dictatedText.trim()) {
      console.warn('[QuickAudioModal] Cannot save blitz homework - no audio clips and no text entered');
      return;
    }
    setIsSaving(true);
    try {
      const studentIdToUse = effectiveStudentId;
      const storageKey = `campus_homework_notes_${studentIdToUse}`;
      const existingRaw = localStorage.getItem(storageKey);
      let existingList: string[] = [];
      try {
        existingList = existingRaw ? JSON.parse(existingRaw) : [];
      } catch { existingList = []; }

      // Retain non-AUDIO, non-plain-text items (e.g. STICKER:, FEEDBACK:, LOOP:, SNAPSHOT_)
      const preservedSpecialNotes = (existingList || []).filter(n => 
        typeof n === 'string' && isInternalMetadataNote(n)
      );

      const finalNotesList: string[] = [...preservedSpecialNotes];
      const newAudioVaultTakes: string[] = [];
      let firstSavedUrl = '';

      // A) Save all recorded audio clips with Local-First IndexedDB guarantee
      for (const clip of recordedClips) {
        const isoNow = new Date().toISOString();
        const fileName = `quick_hw_${studentIdToUse}_${clip.id}_${Date.now()}.webm`;
        const targetSchoolId = student?.school_id || (student as any)?.schoolId || teacher?.school_id || (window as any).__groovelab_school_id || localStorage.getItem('groovelab_school_id') || localStorage.getItem('campus_school_id');
        const schoolPathPrefix = targetSchoolId ? `schools/${targetSchoolId}/` : '';
        const filePath = `${schoolPathPrefix}recordings/${fileName}`;

        let finalUrl = clip.url || '';

        // If clip was newly recorded, upload and save to IndexedDB
        if (!clip.isExisting && clip.blob && clip.blob.size > 0) {
          let savedRecord: any = null;
          // 1. Local-first IndexedDB save (with fallback)
          try {
            savedRecord = await saveOfflineAudioRecord({
              blob: clip.blob,
              mimeType: 'audio/webm',
              durationSeconds: clip.durationSeconds,
              studentId: studentIdToUse,
              teacherId: teacher?.id,
              schoolId: targetSchoolId,
              context: 'homework',
              title: clip.title,
              metadata: {
                storagePath: filePath,
                syncTable: 'progress_matrix'
              }
            });
            if (savedRecord?.id) {
              finalUrl = `offline://${savedRecord.id}`;
            }
          } catch (vaultErr) {
            console.warn('[QuickAudioModal] IndexedDB local save notice:', vaultErr);
          }

          // 2. Asynchroner Cloud-Upload zu Supabase Storage (sofern online) mit Timeout-Schutz
          if (navigator.onLine && clip.blob) {
            try {
              const uploadPromise = supabase.storage
                .from('campus-assets')
                .upload(filePath, clip.blob, { contentType: 'audio/webm', upsert: true });

              const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) => 
                setTimeout(() => resolve({ data: null, error: new Error('Storage upload timeout') }), 6000)
              );

              const { error: upErr } = await Promise.race([uploadPromise, timeoutPromise]);
              
              if (!upErr) {
                const { data: urlData } = supabase.storage.from('campus-assets').getPublicUrl(filePath);
                if (urlData?.publicUrl) {
                  finalUrl = urlData.publicUrl;
                }

                // ⚡ Instant De-Queue from local IndexedDB upon confirmed Cloud upload
                if (savedRecord?.id) {
                  await removeOfflineAudioRecord(savedRecord.id).catch(() => {});
                  notifyOfflineListeners().catch(() => {});
                }

                // Update school storage quota
                if (targetSchoolId && clip.blob.size) {
                  try {
                    const { data: schoolData } = await supabase
                      .from('schools')
                      .select('storage_used_bytes')
                      .eq('id', targetSchoolId)
                      .maybeSingle();
                    if (schoolData) {
                      const currentBytes = Number(schoolData.storage_used_bytes || 0);
                      await supabase
                        .from('schools')
                        .update({ storage_used_bytes: currentBytes + clip.blob.size })
                        .eq('id', targetSchoolId);
                    }
                  } catch {}
                }
              } else {
                console.warn('[QuickAudioModal] Cloud upload warning (falling back to offline record):', upErr);
              }
            } catch (cloudErr) {
              console.warn('[QuickAudioModal] Cloud upload notice:', cloudErr);
            }
          }
        }

        if (!firstSavedUrl) firstSavedUrl = finalUrl;
        const bpmSuffix = clip.metronomeBpm ? `||||BPM:${clip.metronomeBpm}` : '';
        const formattedEntry = `AUDIO:${finalUrl}|${clip.durationSeconds}|${isoNow}|${clip.title.replace(/\|/g, '-')}|teacher|shared_with_teacher${bpmSuffix}`;
        finalNotesList.push(formattedEntry);
        newAudioVaultTakes.push(formattedEntry);
      }

      // B) Save Text if entered
      if (dictatedText.trim()) {
        const cleanNote = capitalizeFirstLetter(dictatedText.trim());
        if (!finalNotesList.includes(cleanNote)) {
          finalNotesList.push(cleanNote);
        }
      }

      // Compute current KW respecting simulated time and ISO standard
      const simNow = getSimulatedNow();
      const currentWeek = getISOWeekRaw(simNow, 1);
      const weekNum = currentWeek.split('-W')[1] || String(Math.ceil((((simNow.getTime() - new Date(simNow.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7)).padStart(2, '0');
      const topicName = `Hausaufgabe KW ${weekNum}`;

      // Save to primary and all candidate keys in localStorage
      allStudentKeys.forEach(k => {
        try {
          localStorage.setItem(`campus_homework_notes_${k}`, JSON.stringify(finalNotesList));
          localStorage.setItem(`campus_homework_week_${k}`, currentWeek);

          // Update teacher vault
          const vaultKey = `campus_teacher_audio_vault_${k}`;
          const currentVaultStr = localStorage.getItem(vaultKey);
          let currentVault: string[] = [];
          if (currentVaultStr) {
            try {
              const pV = JSON.parse(currentVaultStr);
              if (Array.isArray(pV)) currentVault = pV;
            } catch {}
          }
          let vaultChanged = false;
          newAudioVaultTakes.forEach(take => {
            if (!currentVault.includes(take)) {
              currentVault.push(take);
              vaultChanged = true;
            }
          });
          if (vaultChanged) {
            localStorage.setItem(vaultKey, JSON.stringify(currentVault));
          }

          // Also update groovelab_student_prep cache for 0ms instant sync in Tages-Kompass
          const prepPayload = {
            studentId: k,
            currentWeekNum: weekNum,
            currentWeekNotes: finalNotesList
          };
          localStorage.setItem(`groovelab_student_prep_${k}_${currentWeek}`, JSON.stringify(prepPayload));
          localStorage.setItem(`groovelab_student_prep_${k}_latest`, JSON.stringify(prepPayload));
        } catch {}
      });

      // C) Sync to DB progress_matrix (authoritative SSOT & WORM audit trail)
      if (isUUID(studentIdToUse)) {
        try {
          const { data: existingMatrix } = await supabase
            .from('progress_matrix')
            .select('id, homework_notes')
            .eq('student_id', studentIdToUse)
            .ilike('topic_name', `Hausaufgabe KW %`)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const existingSnapPayload = existingMatrix?.homework_notes
            ? parseHomeworkNotesPayload(existingMatrix.homework_notes)
            : null;

          const notesJsonToSave = buildHomeworkNotesPayload({
            didacticNotes: finalNotesList.filter(n => typeof n === 'string' && !n.startsWith('AUDIO:') && !isInternalMetadataNote(n)),
            rawSnapshotLwToken: existingSnapPayload?.rawSnapshotLwToken,
            rawSnapshotSongsToken: existingSnapPayload?.rawSnapshotSongsToken,
            audioTokens: finalNotesList.filter(n => typeof n === 'string' && n.startsWith('AUDIO:')),
            loopTokens: finalNotesList.filter(n => typeof n === 'string' && n.startsWith('LOOP:'))
          });

          if (existingMatrix && existingMatrix.id) {
            await supabase.from('progress_matrix').update({ 
              homework_notes: notesJsonToSave, 
              topic_name: topicName,
              is_current_homework: true,
              updated_at: new Date().toISOString() 
            }).eq('id', existingMatrix.id);
          } else {
            await supabase.from('progress_matrix').insert({ 
              student_id: studentIdToUse, 
              teacher_id: teacher?.id, 
              topic_name: topicName, 
              status: 'IN_PROGRESS', 
              is_current_homework: true,
              homework_notes: notesJsonToSave, 
              updated_at: new Date().toISOString() 
            });
          }
        } catch (e) {
          console.warn('[QuickAudioModal] DB sync notice:', e);
        }
      }

      // Dispatch real-time events across app
      if (typeof window !== 'undefined') {
        allStudentKeys.forEach(k => {
          window.dispatchEvent(new CustomEvent('campus_homework_updated', { detail: { studentId: k } }));
          window.dispatchEvent(new CustomEvent('campus_homework_notes_updated', { detail: { studentId: k } }));
          window.dispatchEvent(new CustomEvent('groovelab_student_prep_updated', { detail: { studentId: k } }));
          window.dispatchEvent(new CustomEvent('homework-updated', { detail: { studentId: k } }));
        });

        // Supabase channel broadcast for multi-device sync
        try {
          const topicName = `realtime_student_progress_${studentIdToUse}`;
          const existing = supabase.getChannels().find(
            (c: any) => c.topic === `realtime:${topicName}` || c.topic === topicName
          );
          if (existing && (existing.state === 'joined' || existing.state === 'joining')) {
            existing.send({
              type: 'broadcast',
              event: 'homework-changed',
              payload: { studentId: studentIdToUse }
            });
          } else {
            const channel = supabase.channel(topicName);
            channel.subscribe(async (status) => {
              if (status === 'SUBSCRIBED') {
                await channel.send({
                  type: 'broadcast',
                  event: 'homework-changed',
                  payload: { studentId: studentIdToUse }
                });
                setTimeout(() => supabase.removeChannel(channel), 1500);
              }
            });
          }
        } catch {}
      }

      setSaveSuccess(true);
      // Clear offline draft on successful save
      try {
        localStorage.removeItem(`cgl_draft_hw_${studentIdToUse}`);
      } catch {}
      if (onSaved) onSaved(firstSavedUrl || dictatedText.trim());
      setTimeout(() => {
        stopHardware();
        onClose();
      }, 700);
    } catch (err) {
      console.error('[QuickAudioModal] Error saving homework:', err);
      // Fallback: still close gracefully
      setSaveSuccess(true);
      if (onSaved) onSaved(dictatedText.trim());
      setTimeout(() => {
        stopHardware();
        onClose();
      }, 700);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const renderCategoryIcon = (type: TemplateCategory['iconType']) => {
    switch (type) {
      case 'music': return <Music size={16} />;
      case 'sliders': return <Sliders size={16} />;
      case 'sparkles': return <Sparkles size={16} />;
    }
  };

  const canSave = Boolean(recordedClips.length > 0 || dictatedText.trim());
  const activeFocusCount = DIDACTIC_FOCUS_ITEMS.filter(f => isFocusActive(f)).length;

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(15, 23, 42, 0.45)', 
        backdropFilter: 'blur(12px)', 
        WebkitBackdropFilter: 'blur(12px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 99999, 
        padding: 'clamp(12px, 3.5vw, 24px)' 
      }} 
      onClick={(e) => { 
        if (e.target === e.currentTarget && !isSaving) { 
          if (countInRemaining !== null) {
            handleCancelCountIn();
            return;
          }
          if (!isRecording && !isDictating) {
            stopHardware(); 
            onClose(); 
          }
        } 
      }}
    >
      <style>{`
        @keyframes snapshotScaleUp {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes snapshotFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes snapshotPulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes snapshotMicRing {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
          70% { box-shadow: 0 0 0 9px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        button:focus-visible, textarea:focus-visible {
          outline: 2px solid #059669 !important;
          outline-offset: 2px !important;
        }
      `}</style>

      <div 
        role="dialog" 
        aria-modal="true" 
        aria-label="Hausaufgaben-Snapshot eintragen"
        style={{ 
          background: '#ffffff', 
          borderRadius: '24px', 
          border: '1px solid rgba(226, 232, 240, 0.95)', 
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.22), 0 0 1px 1px rgba(0,0,0,0.04)', 
          maxWidth: 'min(560px, 94vw)', 
          width: '100%', 
          maxHeight: '92vh', 
          overflowY: 'auto', 
          padding: 'clamp(16px, 3.5vw, 22px)', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px', 
          position: 'relative', 
          animation: 'snapshotScaleUp 0.16s cubic-bezier(0.16, 1, 0.3, 1)' 
        }}
      >
        {viewState === 'main' && (
          <>
            {/* 1. MINIMALIST STUDENT ANCHOR HEADER */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '12px', 
                  background: '#ecfdf5', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#059669', 
                  flexShrink: 0 
                }}>
                  <Zap size={20} fill="currentColor" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                      Hausaufgabe eintragen
                    </h3>
                    {hasExistingHomework && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '100px',
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        color: '#059669',
                        fontSize: '0.68rem',
                        fontWeight: 850
                      }}>
                        <Check size={11} strokeWidth={3} />
                        Bereits hinterlegt
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '1px 0 0', fontSize: '0.80rem', color: '#64748b', fontWeight: 600 }}>
                    Für <strong>{studentDisplayName}</strong> • Heute
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => { stopHardware(); onClose(); }} 
                disabled={isRecording || isDictating || isSaving || countInRemaining !== null} 
                aria-label="Dialog schließen"
                title="Schließen (ESC)"
                style={{ 
                  width: '44px', 
                  height: '44px', 
                  borderRadius: '50%', 
                  border: 'none', 
                  background: '#f1f5f9', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: (isRecording || isDictating || isSaving || countInRemaining !== null) ? 'not-allowed' : 'pointer', 
                  color: '#64748b',
                  flexShrink: 0,
                  transition: 'background 0.12s ease'
                }}
              >
                <X size={17} strokeWidth={2.4} />
              </button>
            </div>

            {/* UNIFIED ULTRA-CLEAN 4-ZONE DIDAKTIK CONTAINER */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              {/* ZONE 1: DIDAKTISCHE FOKUS-LEISTE (5ER-GRID, ZERO-CLUTTER) */}
              <div 
                role="group" 
                aria-label="Didaktischer Schwerpunkt"
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(5, 1fr)', 
                  gap: '6px',
                  width: '100%'
                }}
              >
                {DIDACTIC_FOCUS_ITEMS.map((focus) => {
                  const active = isFocusActive(focus);
                  return (
                    <button
                      key={focus.id}
                      type="button"
                      onClick={() => handleToggleFocus(focus)}
                      title={`${focus.label}: ${focus.subtitle}`}
                      aria-label={`${focus.label}: ${focus.subtitle}`}
                      aria-pressed={active}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '12px',
                        border: active ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                        background: active ? '#ecfdf5' : '#ffffff',
                        color: active ? '#059669' : '#334155',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                        minHeight: '48px',
                        boxShadow: active ? '0 2px 6px rgba(16, 185, 129, 0.14)' : '0 1px 2px rgba(0,0,0,0.02)',
                        transition: 'all 0.12s ease'
                      }}
                    >
                      <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{focus.icon}</span>
                      <span style={{ fontSize: '0.68rem', fontWeight: active ? 850 : 700, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                        {focus.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* ZONE 2: SMARTES NOTIZFELD & GHOST-CHIPS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ position: 'relative' }}>
                  <textarea 
                    value={dictatedText} 
                    onChange={(e) => handleTextChange(e.target.value)} 
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        if (canSave && !isSaving && !saveSuccess && countInRemaining === null) {
                          handleSaveBlitzHomework();
                        }
                      }
                    }}
                    placeholder="Notiz verfassen, Diktat sprechen oder Bausteine antippen..." 
                    rows={3} 
                    aria-label="Hausaufgaben-Notiz"
                    style={{ 
                      width: '100%', 
                      boxSizing: 'border-box', 
                      padding: '10px 52px 10px 12px', 
                      borderRadius: '14px', 
                      border: isDictating ? '1.5px solid #ef4444' : '1px solid #cbd5e1', 
                      fontSize: '0.86rem', 
                      fontWeight: 600, 
                      lineHeight: 1.45, 
                      color: '#0f172a', 
                      outline: 'none', 
                      resize: 'none', 
                      minHeight: '74px',
                      fontFamily: 'inherit', 
                      background: isDictating ? '#fef2f2' : '#ffffff', 
                      boxShadow: isDictating ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none', 
                      transition: 'all 0.15s ease' 
                    }} 
                  />
                  {isSpeechSupported && (
                    <button
                      type="button"
                      onClick={isDictating ? handleStopDictation : handleStartDictation}
                      title={isDictating ? "Sprach-Diktat beenden" : "Sprach-Diktat starten (Deutsch)"}
                      aria-label={isDictating ? "Sprach-Diktat beenden" : "Sprach-Diktat starten (Deutsch)"}
                      style={{
                        position: 'absolute',
                        right: '6px',
                        top: '6px',
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        border: 'none',
                        background: isDictating ? '#ef4444' : '#f1f5f9',
                        color: isDictating ? '#ffffff' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: isDictating ? '0 2px 8px rgba(239, 68, 68, 0.4)' : 'none',
                        animation: isDictating ? 'snapshotMicRing 1.4s infinite' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isDictating ? <Square size={14} fill="#ffffff" /> : <Mic size={16} />}
                    </button>
                  )}
                </div>

                {/* GHOST-CHIPS (1 ZEILE, KEIN SCHWERER HEADER) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                  {PASSAGE_PILLS.map((pill) => {
                    const isSelected = dictatedText.toLowerCase().includes(pill.text.toLowerCase());
                    return (
                      <button 
                        key={pill.id} 
                        type="button" 
                        onClick={() => handleAppendPassage(pill.text)} 
                        aria-label={`Passage hinzufügen: ${pill.label}`}
                        aria-pressed={isSelected}
                        style={{ 
                          padding: '4px 10px', 
                          borderRadius: '8px', 
                          border: isSelected ? '1px solid #10b981' : '1px solid #e2e8f0', 
                          background: isSelected ? '#ecfdf5' : '#f8fafc', 
                          fontSize: '0.72rem', 
                          fontWeight: isSelected ? 800 : 650, 
                          color: isSelected ? '#059669' : '#475569', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '3px', 
                          cursor: 'pointer', 
                          minHeight: '44px',
                          transition: 'all 0.12s ease' 
                        }}
                      >
                        <Plus size={10} color={isSelected ? '#059669' : '#94a3b8'} />
                        <span>{pill.label}</span>
                      </button>
                    );
                  })}
                  <button 
                    type="button" 
                    onClick={() => setViewState('templates')} 
                    aria-label="Alle didaktischen Vorlagen öffnen"
                    style={{ 
                      padding: '4px 8px', 
                      borderRadius: '8px', 
                      border: 'none', 
                      background: 'transparent', 
                      fontSize: '0.72rem', 
                      fontWeight: 750, 
                      color: '#059669', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '2px', 
                      cursor: 'pointer', 
                      minHeight: '44px',
                      marginLeft: 'auto'
                    }}
                  >
                    <span>Vorlagen</span> <ChevronRight size={11} />
                  </button>
                </div>
              </div>

              {/* ZONE 3: 1-ZEILEN-STUDIO-KAPSEL (METRONOM & AKUSTISCHES VORBILD) */}
              <div style={{
                background: isRecording ? '#fef2f2' : '#f8fafc',
                border: isRecording ? '1.5px solid #ef4444' : '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '6px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                position: 'relative',
                transition: 'all 0.15s ease'
              }}>
                {/* COUNT-IN OVERLAY */}
                {countInRemaining !== null && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '12px',
                    background: 'rgba(5, 150, 105, 0.96)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 14px',
                    zIndex: 20,
                    color: '#ffffff',
                    animation: 'snapshotFadeIn 0.12s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 }}>
                        {countInRemaining}
                      </span>
                      <span style={{ fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        Bereitmachen ({metronomeBpm} BPM)...
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={handleSkipCountIn}
                        aria-label="Sofort aufnehmen"
                        style={{
                          background: 'rgba(255, 255, 255, 0.25)',
                          border: '1px solid rgba(255, 255, 255, 0.5)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '6px 10px',
                          cursor: 'pointer',
                          minHeight: '44px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        Sofort ➔
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelCountIn}
                        aria-label="Aufnahme abbrechen"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'rgba(255, 255, 255, 0.85)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '6px 8px',
                          cursor: 'pointer',
                          minHeight: '44px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                )}

                {/* KERN-STUDIO-ZEILE */}
                {isRecording ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        width: '10px', 
                        height: '10px', 
                        borderRadius: '50%', 
                        background: '#ef4444', 
                        boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
                        animation: 'snapshotPulseDot 1.2s infinite' 
                      }} />
                      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#dc2626', fontFamily: 'monospace' }}>
                        {formatTime(recordingSeconds)}
                      </span>
                    </div>

                    {/* LIVE WAVEFORM BARS */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '18px', flex: 1, maxWidth: '140px', justifyContent: 'center' }}>
                      {[0.4, 0.9, 1.4, 0.7, 1.3, 0.6, 1.2, 0.5].map((m, i) => {
                        const h = Math.max(3, Math.min(18, Math.round(audioLevel * 18 * m + 3)));
                        return (
                          <div
                            key={i}
                            style={{
                              width: '4px',
                              height: `${h}px`,
                              borderRadius: '2px',
                              background: audioLevel > 0.08 ? '#ef4444' : '#cbd5e1',
                              transition: 'height 0.06s ease'
                            }}
                          />
                        );
                      })}
                    </div>

                    <button 
                      type="button" 
                      onClick={handleStopRecord} 
                      aria-label="Aufnahme beenden"
                      style={{ 
                        padding: '8px 16px', 
                        borderRadius: '10px', 
                        border: 'none', 
                        background: '#ef4444', 
                        color: '#ffffff', 
                        fontWeight: 850, 
                        fontSize: '0.80rem', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '5px', 
                        minHeight: '44px',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                      }}
                    >
                      <Square size={13} fill="#ffffff" />
                      <span>Stopp</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
                    {/* LINKS: TEMPO STEPPER & KLICK */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        background: '#ffffff', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px',
                        overflow: 'hidden'
                      }}>
                        <button
                          type="button"
                          onClick={() => setMetronomeBpm(b => Math.max(40, b - 5))}
                          aria-label="BPM verringern"
                          style={{
                            width: '44px',
                            height: '44px',
                            border: 'none',
                            background: 'transparent',
                            color: '#475569',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          –
                        </button>
                        <button
                          type="button"
                          onClick={handleTapTempo}
                          title="Tippen für Tap-Tempo"
                          aria-label={`Tempo ${metronomeBpm} BPM (tippen für Tap Tempo)`}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#0f172a',
                            fontWeight: 850,
                            fontSize: '0.78rem',
                            padding: '0 4px',
                            cursor: 'pointer',
                            minHeight: '44px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          ⏱️ {metronomeBpm}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMetronomeBpm(b => Math.min(240, b + 5))}
                          aria-label="BPM erhöhen"
                          style={{
                            width: '44px',
                            height: '44px',
                            border: 'none',
                            background: 'transparent',
                            color: '#475569',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setMetronomeSound(s => !s)}
                        title={metronomeSound ? 'Klick an' : 'Lautlos'}
                        aria-label={metronomeSound ? 'Metronom-Klick stumm' : 'Metronom-Klick an'}
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: metronomeSound ? '#ecfdf5' : '#ffffff',
                          color: metronomeSound ? '#059669' : '#64748b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {metronomeSound ? <Volume2 size={14} /> : <VolumeX size={14} />}
                      </button>
                    </div>

                    {/* MITTE: COUNT-IN TOGGLE */}
                    <button
                      type="button"
                      onClick={() => setMetronomeCountIn(c => !c)}
                      title={metronomeCountIn ? '4-Beat Einzählen aktiv' : 'Sofortige Aufnahme'}
                      aria-label={metronomeCountIn ? 'Einzählen aktiv' : 'Einzählen aus'}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '8px',
                        border: metronomeCountIn ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                        background: metronomeCountIn ? '#ecfdf5' : '#ffffff',
                        color: metronomeCountIn ? '#059669' : '#64748b',
                        fontSize: '0.70rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        minHeight: '44px'
                      }}
                    >
                      <Clock size={12} />
                      <span>{metronomeCountIn ? '4-Beat' : 'Direkt'}</span>
                    </button>

                    {/* RECHTS: ROTER STUDIO-RECORD BUTTON (KEINE GRÜNE KONKURRENZ!) */}
                    <button
                      type="button"
                      onClick={handleStartRecord}
                      aria-label="Audio-Vorbild aufnehmen"
                      style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: '#ffffff',
                        fontWeight: 850,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        minHeight: '44px',
                        boxShadow: '0 2px 8px rgba(220, 38, 38, 0.35)',
                        transition: 'all 0.12s ease'
                      }}
                      className="hover-scale"
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffffff' }} />
                      <span>● Rec</span>
                    </button>
                  </div>
                )}

                {/* LIST OF RECORDED CLIPS (100% UNIFIED WOCHEN-FAHRPLAN AUDIO PLAYER) */}
                {recordedClips.length > 0 && !isRecording && (
                  <div style={{ marginTop: '4px', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                    <WochenFahrplanAudioPlayer
                      tracks={recordedClips.map((c) => ({
                        url: c.url || (c.blob ? URL.createObjectURL(c.blob) : ''),
                        label: c.title,
                        duration: c.durationSeconds,
                        bpm: c.metronomeBpm
                      }))}
                      readOnly={false}
                      onDelete={(idx) => {
                        const targetClip = recordedClips[idx];
                        if (targetClip) handleDeleteClip(targetClip.id);
                      }}
                      topicName="Aufnahme"
                    />
                  </div>
                )}
              </div>

              {/* ZONE 4: DIDAKTIK-RÜCKVERSICHERUNG & PRIMÄRER SPEICHER-BUTTON */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                {/* STATUS-ZUSAMMENFASSUNG */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px',
                  fontSize: '0.70rem', 
                  color: '#64748b', 
                  fontWeight: 650 
                }}>
                  <span>🎯 {activeFocusCount > 0 ? `${activeFocusCount} Fokus aktiv` : 'Notiz verfasst'}</span>
                  <span>•</span>
                  <span>⏱️ {metronomeBpm} BPM</span>
                  <span>•</span>
                  <span>🎙️ {recordedClips.length > 0 ? `${recordedClips.length} Audio-Clip` : 'Ohne Audio'}</span>
                </div>

                {/* EINZIGER PRIMÄRER BUTTON IM GESAMTEN MODAL */}
                <button 
                  type="button" 
                  onClick={handleSaveBlitzHomework} 
                  disabled={!canSave || isSaving || saveSuccess || countInRemaining !== null} 
                  aria-label={hasExistingHomework ? 'Hausaufgabe aktualisieren' : 'Hausaufgabe speichern'}
                  style={{ 
                    padding: '12px 18px', 
                    borderRadius: '14px', 
                    border: 'none', 
                    background: saveSuccess ? '#059669' : (!canSave ? '#e2e8f0' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'), 
                    color: !canSave ? '#94a3b8' : '#ffffff', 
                    fontWeight: 900, 
                    fontSize: '0.90rem', 
                    cursor: (!canSave || isSaving || saveSuccess || countInRemaining !== null) ? 'not-allowed' : 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    boxShadow: canSave ? '0 4px 14px rgba(16, 185, 129, 0.35)' : 'none', 
                    minHeight: '48px', 
                    transition: 'all 0.15s ease' 
                  }} 
                  className={canSave ? "hover-scale" : ""}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Wird gespeichert...</span>
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check size={18} strokeWidth={3} />
                      <span>⚡ Hausaufgabe erfolgreich eingetragen!</span>
                    </>
                  ) : (
                    <>
                      <Zap size={16} fill="currentColor" />
                      <span>{hasExistingHomework ? 'Hausaufgabe aktualisieren ➔' : '⚡ Hausaufgabe speichern ➔'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* VIEW B: TEMPLATES LIBRARY */}
        {viewState === 'templates' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'snapshotFadeIn 0.15s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button 
                type="button" 
                onClick={() => setViewState('main')} 
                aria-label="Zurück zum Hausaufgaben-Fenster"
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: '#059669', 
                  fontWeight: 800, 
                  fontSize: '0.86rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  cursor: 'pointer', 
                  padding: 0,
                  minHeight: '44px' 
                }}
              >
                <ArrowLeft size={16} /> <span>Zurück zum Hausaufgaben-Fenster</span>
              </button>
              <button 
                type="button" 
                onClick={() => { stopHardware(); onClose(); }} 
                aria-label="Dialog schließen"
                title="Schließen"
                style={{ 
                  width: '44px', 
                  height: '44px', 
                  borderRadius: '50%', 
                  border: 'none', 
                  background: '#f1f5f9', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer',
                  color: '#64748b',
                  transition: 'background 0.12s ease'
                }}
              >
                <X size={17} strokeWidth={2.4} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {TEMPLATE_CATEGORIES.map(category => (
                <div key={category.id} style={{ background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#0f172a', fontWeight: 800, fontSize: '0.88rem' }}>
                    <span style={{ color: '#059669' }}>{renderCategoryIcon(category.iconType)}</span>
                    <span>{category.title}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {category.items.map((item, idx) => (
                      <button 
                        key={idx} 
                        type="button" 
                        onClick={() => { handleAppendPhrase(item); setViewState('main'); }} 
                        aria-label={`Vorlage übernehmen: ${item}`}
                        style={{ 
                          textAlign: 'left', 
                          padding: '10px 12px', 
                          borderRadius: '10px', 
                          border: '1px solid #e2e8f0', 
                          background: '#ffffff', 
                          fontSize: '0.82rem', 
                          fontWeight: 650, 
                          color: '#334155', 
                          cursor: 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          minHeight: '44px',
                          transition: 'all 0.12s ease' 
                        }}
                        className="hover-scale"
                      >
                        <span>{item}</span>
                        <Plus size={13} color="#059669" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
