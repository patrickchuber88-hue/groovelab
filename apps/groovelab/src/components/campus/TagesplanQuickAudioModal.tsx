import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Mic, Square, Play, Pause, RotateCcw, Check, Loader2, Send, FileText, Plus, ChevronRight, Trash2, Zap, Sparkles, ArrowLeft, Music, Sliders, Volume2, VolumeX, Activity, Tag, Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { acquireAudioStream, releaseAudioStream } from '../../services/audioPermissionService';
import { processPureRawBlob } from '../../utils/audioMasteringEngine';
import { capitalizeFirstLetter, formatSingleStudentAnonymized } from '../../utils/nameHelper';
import { saveOfflineAudioRecord } from '../../utils/offlineAudioVault';
import { checkIsAudioTresorActive } from '../../domain/stickersAndTresor';

interface RecordedClip {
  id: string;
  blob: Blob;
  url: string;
  durationSeconds: number;
  title: string;
  tag?: string;
}

interface TagesplanQuickAudioModalProps {
  isOpen: boolean;
  student: any;
  teacher: any;
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

const QUICK_PILLS = [
  { label: 'S. 14 • Takt 1–8', text: 'S. 14: Takt 1–8 wiederholen' },
  { label: 'Metronom 60 bpm', text: 'Mit Metronom (60 bpm) langsam üben' },
  { label: 'Fingersatz', text: 'Auf den richtigen Fingersatz achten' },
  { label: 'Wechselschlag', text: 'Wechselschlag kontrollieren' },
  { label: 'Auswendig', text: 'Ablauf auswendig versuchen' },
  { label: 'Dynamik', text: 'Dynamik und saubere Betonung beachten' },
  { label: 'Handhaltung', text: 'Handhaltung entspannen und locker bleiben' }
];

const METRONOME_PRESETS = [60, 80, 100, 120, 140];
const CLIP_TAGS = ['Tempo 60', 'Originaltempo', 'Play-Along', 'Melodie', 'Begleitung', 'Übung'];

export const TagesplanQuickAudioModal: React.FC<TagesplanQuickAudioModalProps> = ({
  isOpen,
  student,
  teacher,
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

  // --- Dictation / Note State ---
  const [isDictating, setIsDictating] = useState(false);
  const [dictatedText, setDictatedText] = useState('');
  const recognitionRef = useRef<any>(null);

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

  useEffect(() => {
    if (student) {
      setDictatedText('');
      setViewState('main');
      setSaveSuccess(false);
      setRecordedClips([]);
      setActivePlayingClipId(null);
      setPlaybackProgress(0);
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;
      isStartingRecordRef.current = false;
      isRecordingRef.current = false;
      hasStoppedCurrentRecordingRef.current = false;
      setCountInRemaining(null);
    }
  }, [student, dateStr, isOpen]);

  // Metronome Web Audio Synthesizer
  const playMetronomeClick = useCallback((isAccent: boolean) => {
    if (!metronomeSound) return;
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
        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          sum += dataArrayRef.current[i];
        }
        const avg = sum / dataArrayRef.current.length;
        const normalized = Math.min(1, avg / 128);
        setAudioLevel(normalized);
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

  const stopHardware = () => {
    isStartingRecordRef.current = false;
    isRecordingRef.current = false;
    hasStoppedCurrentRecordingRef.current = true;
    setIsRecording(false);
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

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsDictating(false);
  };

  useEffect(() => {
    return () => stopHardware();
  }, []);

  if (!isOpen || !student) return null;

  const studentFirstName = student.first_name || (student.name ? student.name.split(' ')[0] : 'Schüler');
  const studentLastName = student.last_name || (student.name ? student.name.split(' ').slice(1).join(' ') : '');
  const studentDisplayName = formatSingleStudentAnonymized(studentFirstName, studentLastName, student.id, true);

  // 1. DICTATION LOGIC
  const handleStartDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      stopHardware();
      const recognition = new SpeechRecognition();
      recognition.lang = 'de-DE';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript;
        }
        if (final) {
          setDictatedText(prev => capitalizeFirstLetter((prev + ' ' + final).trim()));
        }
      };

      recognition.onerror = () => setIsDictating(false);
      recognition.onend = () => setIsDictating(false);

      recognitionRef.current = recognition;
      recognition.start();
      setIsDictating(true);
    } catch (err) {
      setIsDictating(false);
    }
  };

  const handleStopDictation = () => {
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch {}
    setIsDictating(false);
  };

  const handleAppendPhrase = (phrase: string) => {
    setDictatedText(prev => {
      const clean = prev.trim();
      if (!clean) return capitalizeFirstLetter(phrase);
      return `${clean}. ${capitalizeFirstLetter(phrase)}`;
    });
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

  // 2. AUDIO RECORD LOGIC WITH ATOMIC RE-ENTRANCE LOCK
  const executeActualRecordingStart = async () => {
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
      
      const stream = await acquireAudioStream({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1, sampleRate: 48000 } as any });
      streamRef.current = stream;
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
          const mastered = await processPureRawBlob(rawBlob);
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
        const newClip: RecordedClip = {
          id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          blob: finalBlob,
          url: finalUrl,
          durationSeconds: durationSec,
          title: clipTitle
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

    // If Metronome count-in is active, execute 4-beat countdown
    if (showMetronome && metronomeCountIn) {
      let count = 4;
      setCountInRemaining(count);
      playMetronomeClick(true);

      const beatMs = (60 / metronomeBpm) * 1000;
      const countInterval = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountInRemaining(count);
          playMetronomeClick(false);
        } else {
          clearInterval(countInterval);
          setCountInRemaining(null);
          executeActualRecordingStart();
        }
      }, beatMs);
    } else {
      executeActualRecordingStart();
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping mediaRecorder:', e);
      }
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
    if (!student?.id || (recordedClips.length === 0 && !dictatedText.trim())) return;
    setIsSaving(true);
    try {
      const storageKey = `campus_homework_notes_${student.id}`;
      const existingRaw = localStorage.getItem(storageKey);
      let existingList: string[] = [];
      try {
        existingList = existingRaw ? JSON.parse(existingRaw) : [];
      } catch { existingList = []; }

      let firstSavedUrl = '';

      // A) Save all recorded audio clips with Local-First IndexedDB guarantee
      for (const clip of recordedClips) {
        const isoNow = new Date().toISOString();
        const fileName = `quick_hw_${student.id}_${clip.id}_${Date.now()}.webm`;
        const filePath = `homework/${student.id}/${fileName}`;

        let finalUrl = clip.url || '';

        // 1. Local-first IndexedDB save (with fallback)
        try {
          if (clip.blob) {
            const savedRecord = await saveOfflineAudioRecord({
              blob: clip.blob,
              mimeType: 'audio/webm',
              durationSeconds: clip.durationSeconds,
              studentId: student.id,
              teacherId: teacher?.id,
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
          }
        } catch (vaultErr) {
          console.warn('[QuickAudioModal] IndexedDB local save notice:', vaultErr);
        }

        // 2. Asynchroner Cloud-Upload zu Supabase Storage (sofern online)
        if (navigator.onLine && clip.blob) {
          try {
            const { error: upErr } = await supabase.storage
              .from('recordings')
              .upload(filePath, clip.blob, { contentType: 'audio/webm', upsert: true });
            
            if (!upErr) {
              const { data: urlData } = supabase.storage.from('recordings').getPublicUrl(filePath);
              if (urlData?.publicUrl) {
                finalUrl = urlData.publicUrl;
              }
            }
          } catch (cloudErr) {
            console.warn('[QuickAudioModal] Cloud upload notice:', cloudErr);
          }
        }

        if (!firstSavedUrl) firstSavedUrl = finalUrl;
        const formattedEntry = `AUDIO:${finalUrl}|${clip.durationSeconds}|${isoNow}|${clip.title.replace(/\|/g, '-')}|teacher|shared_with_teacher`;
        existingList.push(formattedEntry);
      }

      // B) Save Text if entered
      if (dictatedText.trim()) {
        const cleanNote = capitalizeFirstLetter(dictatedText.trim());
        if (!existingList.includes(cleanNote)) {
          existingList.push(cleanNote);
        }
      }

      // Save to localStorage immediately
      localStorage.setItem(storageKey, JSON.stringify(existingList));

      // C) Sync to DB progress_matrix (non-blocking)
      try {
        const d = new Date();
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDays = (d.getTime() - startOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
        const topicName = `Hausaufgabe KW ${String(weekNum).padStart(2, '0')}`;

        const { data: existingMatrix } = await supabase
          .from('progress_matrix')
          .select('id')
          .eq('student_id', student.id)
          .eq('topic_name', topicName)
          .maybeSingle();

        if (existingMatrix) {
          await supabase.from('progress_matrix').update({ homework_notes: JSON.stringify(existingList), updated_at: new Date().toISOString() }).eq('id', existingMatrix.id);
        } else {
          await supabase.from('progress_matrix').insert({ student_id: student.id, teacher_id: teacher?.id, topic_name: topicName, status: 'IN_PROGRESS', homework_notes: JSON.stringify(existingList), updated_at: new Date().toISOString() });
        }
      } catch (e) {
        console.warn('[QuickAudioModal] DB sync notice:', e);
      }

      // Dispatch real-time event across app
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus_homework_updated', { detail: { studentId: student.id } }));
      }

      setSaveSuccess(true);
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
      onClick={(e) => { if (e.target === e.currentTarget && !isRecording && !isDictating && !isSaving && countInRemaining === null) { stopHardware(); onClose(); } }}
    >
      <div 
        style={{ 
          background: '#ffffff', 
          borderRadius: '24px', 
          border: '1px solid rgba(226, 232, 240, 0.9)', 
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.22), 0 0 1px 1px rgba(0,0,0,0.04)', 
          maxWidth: 'min(480px, 94vw)', 
          width: '100%', 
          maxHeight: '90vh', 
          overflowY: 'auto', 
          padding: 'clamp(18px, 4vw, 24px)', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '14px', 
          position: 'relative', 
          animation: 'scaleUp 0.16s cubic-bezier(0.16, 1, 0.3, 1)' 
        }}
      >
        {viewState === 'main' && (
          <>
            {/* Minimalist 80/20 Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  width: '38px', 
                  height: '38px', 
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
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    Hausaufgabe eintragen
                  </h3>
                  <p style={{ margin: '1px 0 0', fontSize: '0.80rem', color: '#64748b', fontWeight: 600 }}>
                    Für <strong>{studentDisplayName}</strong> • Heute
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => { stopHardware(); onClose(); }} 
                disabled={isRecording || isDictating || isSaving || countInRemaining !== null} 
                style={{ 
                  width: '32px', 
                  height: '32px', 
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
                <X size={16} strokeWidth={2.4} />
              </button>
            </div>

            {/* UNIFIED 80/20 MINIMALIST STAGE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* 1. STUDIO RECORDER STAGE (ULTRA-CLEAN) */}
              <div style={{ 
                background: isRecording ? '#fef2f2' : (recordedClips.length > 0 ? '#f0fdf4' : '#f8fafc'), 
                borderRadius: '18px', 
                border: isRecording ? '2px solid #ef4444' : (recordedClips.length > 0 ? '1.5px solid #86efac' : '1.5px dashed #cbd5e1'),
                padding: '12px 14px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                position: 'relative',
                transition: 'all 0.15s ease'
              }}>

                {/* COUNT-IN OVERLAY */}
                {countInRemaining !== null && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '16px',
                    background: 'rgba(5, 150, 105, 0.95)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    color: '#ffffff',
                    animation: 'fadeIn 0.1s ease'
                  }}>
                    <div style={{ fontSize: '3.2rem', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 }}>
                      {countInRemaining}
                    </div>
                    <div style={{ fontSize: '0.80rem', fontWeight: 800, marginTop: '2px', textTransform: 'uppercase' }}>
                      Bereitmachen... ({metronomeBpm} BPM)
                    </div>
                  </div>
                )}

                {/* Top Metronome Trigger (Discreet & Non-Intrusive) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: '0.70rem', fontWeight: 800, color: isRecording ? '#dc2626' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {isRecording ? '🔴 Aufnahme aktiv' : recordedClips.length > 0 ? `✓ ${recordedClips.length} Aufnahme bereit` : 'Audio-Aufnahme (optional)'}
                  </span>

                  <button
                    type="button"
                    onClick={() => setShowMetronome(prev => !prev)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: showMetronome ? '#ecfdf5' : '#ffffff',
                      border: showMetronome ? '1px solid #10b981' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '3px 8px',
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      color: showMetronome ? '#059669' : '#64748b',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}
                  >
                    <Clock size={11} />
                    <span>Metronom: {metronomeBpm} BPM</span>
                  </button>
                </div>

                {/* EXPANDABLE METRONOME SLIDER (ONLY WHEN TOGGLED) */}
                {showMetronome && (
                  <div style={{
                    width: '100%',
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    animation: 'fadeIn 0.12s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {METRONOME_PRESETS.map((bpm) => (
                          <button
                            key={bpm}
                            type="button"
                            onClick={() => setMetronomeBpm(bpm)}
                            style={{
                              padding: '2px 6px',
                              borderRadius: '6px',
                              border: metronomeBpm === bpm ? '1px solid #10b981' : '1px solid #e2e8f0',
                              background: metronomeBpm === bpm ? '#ecfdf5' : '#f8fafc',
                              color: metronomeBpm === bpm ? '#059669' : '#334155',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            {bpm}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setMetronomeSound(prev => !prev)}
                        style={{
                          background: metronomeSound ? '#ecfdf5' : '#f1f5f9',
                          border: metronomeSound ? '1px solid #10b981' : '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '2px 6px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: metronomeSound ? '#059669' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        {metronomeSound ? <Volume2 size={11} /> : <VolumeX size={11} />}
                        <span>{metronomeSound ? 'Klick an' : 'Lautlos'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* RECORDING RUNNING VIEW */}
                {isRecording ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        width: '10px', 
                        height: '10px', 
                        borderRadius: '50%', 
                        background: '#ef4444', 
                        boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
                        animation: 'pulse 1.2s infinite' 
                      }} />
                      <span style={{ 
                        fontSize: '1.8rem', 
                        fontWeight: 900, 
                        color: '#dc2626', 
                        fontFamily: 'monospace'
                      }}>
                        {formatTime(recordingSeconds)}
                      </span>
                    </div>

                    {/* LIVE AUDIO WAVEFORM DANCE BARS */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', height: '18px', width: '100%', maxWidth: '180px' }}>
                      {[0.4, 0.8, 1.2, 0.9, 1.5, 0.7, 1.3, 1.0, 0.6, 1.4, 0.9, 0.5].map((multiplier, i) => {
                        const dynamicHeight = Math.max(3, Math.min(18, Math.round(audioLevel * 18 * multiplier + 3)));
                        return (
                          <div
                            key={i}
                            style={{
                              flex: 1,
                              height: `${dynamicHeight}px`,
                              borderRadius: '3px',
                              background: audioLevel > 0.1 ? 'linear-gradient(180deg, #ef4444 0%, #f87171 100%)' : '#cbd5e1',
                              transition: 'height 0.06s ease'
                            }}
                          />
                        );
                      })}
                    </div>

                    <button 
                      type="button" 
                      onClick={handleStopRecord} 
                      style={{ 
                        padding: '9px 22px', 
                        borderRadius: '12px', 
                        border: 'none', 
                        background: '#ef4444', 
                        color: '#ffffff', 
                        fontWeight: 900, 
                        fontSize: '0.84rem', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)', 
                        transition: 'all 0.12s ease' 
                      }}
                      className="hover-scale"
                    >
                      <Square size={14} fill="#ffffff" />
                      <span>Aufnahme stoppen</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* LIST OF RECORDED CLIPS (CLEAN & COMPACT) */}
                    {recordedClips.length > 0 ? (
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {recordedClips.map((clip) => (
                          <div 
                            key={clip.id} 
                            style={{ 
                              background: '#ffffff', 
                              borderRadius: '12px', 
                              border: '1px solid #bbf7d0', 
                              padding: '8px 12px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between', 
                              gap: '8px', 
                              boxShadow: '0 1px 3px rgba(0,0,0,0.02)' 
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <div style={{ 
                                width: '26px', 
                                height: '26px', 
                                borderRadius: '7px', 
                                background: '#ecfdf5', 
                                color: '#059669', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                flexShrink: 0 
                              }}>
                                <Music size={13} />
                              </div>
                              <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {clip.title} ({formatTime(clip.durationSeconds)})
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              <button 
                                type="button" 
                                onClick={() => handleTogglePlayback(clip)} 
                                style={{ 
                                  padding: '4px 9px', 
                                  borderRadius: '8px', 
                                  border: '1px solid #10b981', 
                                  color: '#059669', 
                                  background: activePlayingClipId === clip.id ? '#ecfdf5' : '#ffffff', 
                                  fontWeight: 800, 
                                  fontSize: '0.72rem', 
                                  cursor: 'pointer', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '3px' 
                                }}
                              >
                                {activePlayingClipId === clip.id ? <Pause size={11} /> : <Play size={11} />}
                                <span>{activePlayingClipId === clip.id ? 'Pause' : 'Play'}</span>
                              </button>
                              <button 
                                type="button" 
                                onClick={() => handleDeleteClip(clip.id)} 
                                title="Aufnahme löschen"
                                style={{ 
                                  padding: '4px 6px', 
                                  borderRadius: '8px', 
                                  border: '1px solid #fecaca', 
                                  color: '#ef4444', 
                                  background: '#ffffff', 
                                  cursor: 'pointer', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center' 
                                }}
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        ))}

                        <button 
                          type="button" 
                          onClick={handleStartRecord} 
                          style={{ 
                            padding: '7px 12px', 
                            borderRadius: '10px', 
                            border: '1px dashed #10b981', 
                            background: '#ffffff', 
                            color: '#059669', 
                            fontWeight: 800, 
                            fontSize: '0.76rem', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '5px', 
                            width: '100%', 
                            transition: 'all 0.12s ease' 
                          }}
                        >
                          <Plus size={13} />
                          <span>Weitere Aufnahme hinzufügen</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 0' }}>
                        <button 
                          type="button" 
                          onClick={handleStartRecord} 
                          style={{ 
                            padding: '10px 24px', 
                            borderRadius: '12px', 
                            border: 'none', 
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                            color: '#ffffff', 
                            fontWeight: 900, 
                            fontSize: '0.88rem', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)', 
                            transition: 'all 0.12s ease' 
                          }}
                          className="hover-scale"
                        >
                          <Mic size={16} />
                          <span>Aufnahme starten</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 2. ESSENTIAL QUICK PILLS & NOTIZ-EINGABE */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Kernaufgabe wählen:
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setViewState('templates')} 
                    style={{ 
                      background: 'transparent', 
                      border: 'none', 
                      color: '#059669', 
                      fontSize: '0.74rem', 
                      fontWeight: 800, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '3px', 
                      cursor: 'pointer' 
                    }}
                  >
                    <span>Mehr Vorlagen</span> <ChevronRight size={12} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '2px' }}>
                  {QUICK_PILLS.slice(0, 4).map((pill) => {
                    const isSelected = dictatedText.includes(pill.text) || dictatedText === pill.text;
                    return (
                      <button 
                        key={pill.label} 
                        type="button" 
                        onClick={() => handleAppendPhrase(pill.text)} 
                        style={{ 
                          padding: '6px 10px', 
                          borderRadius: '8px', 
                          border: isSelected ? '1.5px solid #10b981' : '1px solid #e2e8f0', 
                          background: isSelected ? '#ecfdf5' : '#f8fafc', 
                          fontSize: '0.74rem', 
                          fontWeight: isSelected ? 850 : 700, 
                          color: isSelected ? '#059669' : '#334155', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          whiteSpace: 'nowrap', 
                          cursor: 'pointer', 
                          flexShrink: 0, 
                          transition: 'all 0.12s ease' 
                        }}
                      >
                        <Plus size={10} /> {pill.label}
                      </button>
                    );
                  })}
                </div>

                {/* Text Input with integrated Dictate Button */}
                <div style={{ position: 'relative', marginTop: '2px' }}>
                  <textarea 
                    value={dictatedText} 
                    onChange={(e) => setDictatedText(e.target.value)} 
                    placeholder="Notiz ergänzen, oben antippen oder diktieren..." 
                    rows={2} 
                    style={{ 
                      width: '100%', 
                      boxSizing: 'border-box', 
                      padding: '8px 38px 8px 12px', 
                      borderRadius: '12px', 
                      border: isDictating ? '1.5px solid #ef4444' : '1px solid #cbd5e1', 
                      fontSize: '0.84rem', 
                      fontWeight: 600, 
                      lineHeight: 1.4, 
                      color: '#0f172a', 
                      outline: 'none', 
                      resize: 'none', 
                      fontFamily: 'inherit', 
                      background: isDictating ? '#fef2f2' : '#ffffff', 
                      transition: 'all 0.15s ease' 
                    }} 
                  />
                  {isSpeechSupported && (
                    <button
                      type="button"
                      onClick={isDictating ? handleStopDictation : handleStartDictation}
                      title={isDictating ? "Diktat stoppen" : "Sprach-Diktat starten"}
                      style={{
                        position: 'absolute',
                        right: '6px',
                        top: '6px',
                        width: '28px',
                        height: '28px',
                        borderRadius: '7px',
                        border: 'none',
                        background: isDictating ? '#ef4444' : '#f1f5f9',
                        color: isDictating ? '#ffffff' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isDictating ? <Square size={12} fill="#ffffff" /> : <Mic size={13} />}
                    </button>
                  )}
                </div>
              </div>

              {/* 3. SEND CTA BUTTON */}
              <button 
                type="button" 
                onClick={handleSaveBlitzHomework} 
                disabled={!canSave || isSaving || saveSuccess || countInRemaining !== null} 
                style={{ 
                  marginTop: '4px', 
                  padding: '13px 18px', 
                  borderRadius: '14px', 
                  border: 'none', 
                  background: saveSuccess ? '#059669' : (!canSave ? '#e2e8f0' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'), 
                  color: !canSave ? '#94a3b8' : '#ffffff', 
                  fontWeight: 900, 
                  fontSize: '0.92rem', 
                  cursor: (!canSave || isSaving || saveSuccess || countInRemaining !== null) ? 'not-allowed' : 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px', 
                  boxShadow: canSave ? '0 6px 20px -3px rgba(16, 185, 129, 0.4)' : 'none', 
                  minHeight: '46px', 
                  transition: 'all 0.15s ease' 
                }}
                className={canSave ? "hover-scale" : ""}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Wird übertragen...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check size={18} strokeWidth={3} />
                    <span>⚡ Hausaufgabe erfolgreich eingetragen!</span>
                  </>
                ) : (
                  <>
                    <Zap size={16} fill="currentColor" />
                    <span>Hausaufgabe jetzt senden ➔</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* VIEW B: TEMPLATES LIBRARY */}
        {viewState === 'templates' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.15s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button 
                type="button" 
                onClick={() => setViewState('main')} 
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
                  padding: 0 
                }}
              >
                <ArrowLeft size={16} /> <span>Zurück zum Blitz-Fenster</span>
              </button>
              <button 
                type="button" 
                onClick={() => { stopHardware(); onClose(); }} 
                style={{ width: '30px', height: '30px', borderRadius: '50%', border: 'none', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={15} />
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
