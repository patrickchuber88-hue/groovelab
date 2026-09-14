import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Square, 
  Check, 
  X, 
  Sliders, 
  Layers, 
  Sparkles,
  Download
} from 'lucide-react';
import { getBlob, storeBlob } from '../../../utils/blobStorage';
import { acquireAudioStream, releaseAudioStream, PURE_RAW_AUDIO_CONSTRAINTS } from '../../../services/audioPermissionService';
import { processPureRawBlob, TARGET_PURE_RAW_LUFS, TARGET_PEAK_DBTP, MAX_PURE_RAW_LIMITER_GR_DB } from '../../../utils/audioMasteringEngine';
import { 
  getSharedAudioContext, 
  decodeAudioSource, 
  scheduleCountInBeeps, 
  playDualTrackSynchronous, 
  renderDuettMixdown,
  DualTrackPlaybackSession 
} from '../../../utils/dualTrackAudioEngine';

export interface DuettDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherAudioUrl: string;
  teacherTitle?: string;
  teacherBpm?: number;
  songTag?: string;
  studentId: string;
  studentFirstName?: string;
  onSaveStudentTake?: (take: {
    id: string;
    url: string;
    title: string;
    label: string;
    duration: number;
    created_at: string;
    songTag?: string;
    isDuettTake?: boolean;
    latencyOffsetMs?: number;
    teacherAudioUrl?: string;
    teacherTitle?: string;
    teacherBpm?: number;
  }) => void;
}

const DEFAULT_SMART_LATENCY_MS = 60; // 🌟 Tier-1 SaaS Enterprise+ Smart Pre-Shift

export const DuettDeckModal: React.FC<DuettDeckModalProps> = ({
  isOpen,
  onClose,
  teacherAudioUrl,
  teacherTitle = 'Lehrer-Aufnahme',
  teacherBpm = 100,
  songTag,
  studentId,
  studentFirstName = 'Schüler',
  onSaveStudentTake
}) => {
  // Device Detection: Responsive for Smartphones (<=480px), Tablets/iPads (481px-1024px) and Desktops (>1024px)
  const [windowWidth, setWindowWidth] = useState<number>(() => typeof window !== 'undefined' ? window.innerWidth : 1024);
  const isMobile = windowWidth <= 640;
  const isTablet = windowWidth > 640 && windowWidth <= 1024;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Master Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayheadTime, setCurrentPlayheadTime] = useState(0);

  // Audio Buffers & Engine State
  const [isLoadingTeacher, setIsLoadingTeacher] = useState(true);
  const [teacherDuration, setTeacherDuration] = useState<number>(0);
  const [studentDuration, setStudentDuration] = useState<number>(0);

  const teacherBufferRef = useRef<AudioBuffer | null>(null);
  const studentBufferRef = useRef<AudioBuffer | null>(null);
  const playbackSessionRef = useRef<DualTrackPlaybackSession | null>(null);

  // Student Audio State
  const [studentAudioBlob, setStudentAudioBlob] = useState<Blob | null>(null);
  const [studentAudioUrl, setStudentAudioUrl] = useState<string | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [countInStep, setCountInStep] = useState<number | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);

  // Audio Controls & Mix
  const [teacherVolume, setTeacherVolume] = useState<number>(1.0);
  const [studentVolume, setStudentVolume] = useState<number>(1.0);
  const [latencyOffsetMs, setLatencyOffsetMs] = useState<number>(DEFAULT_SMART_LATENCY_MS);
  const [activeMixPreset, setActiveMixPreset] = useState<'100_teacher' | '50_50' | '100_student' | 'custom'>('50_50');

  // Saving & Exporting State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isExportingMix, setIsExportingMix] = useState(false);

  // Internal Execution Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordStartTimeRef = useRef<number>(0);
  const recordIntervalRef = useRef<number | null>(null);
  const autoStopTimeoutRef = useRef<number | null>(null);
  const countInCancelRef = useRef<(() => void) | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Direct DOM Refs for Zero-Re-Render 120 FPS Playhead
  const teacherProgressRef = useRef<HTMLDivElement | null>(null);
  const studentProgressRef = useRef<HTMLDivElement | null>(null);
  const timeDisplayRef = useRef<HTMLSpanElement | null>(null);
  const track1TimeRef = useRef<HTMLSpanElement | null>(null);
  const track2TimeRef = useRef<HTMLSpanElement | null>(null);

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 1. Resolve and Decode Teacher Audio Buffer via Web Audio API
  useEffect(() => {
    let active = true;
    setIsLoadingTeacher(true);

    const loadTeacherAudio = async () => {
      try {
        let rawSource: Blob | string = teacherAudioUrl;
        if (teacherAudioUrl.startsWith('campus_blob_') || teacherAudioUrl.startsWith('campus_audio_') || teacherAudioUrl.startsWith('offline://')) {
          const stored = await getBlob(teacherAudioUrl);
          if (stored) {
            rawSource = stored instanceof Blob ? stored : new Blob([stored], { type: 'audio/webm' });
          }
        }

        const audioCtx = getSharedAudioContext();
        const decodedBuffer = await decodeAudioSource(rawSource, audioCtx);

        if (active) {
          teacherBufferRef.current = decodedBuffer;
          setTeacherDuration(decodedBuffer.duration);
          setIsLoadingTeacher(false);
        }
      } catch (err) {
        console.error('[DuettDeckModal] Error decoding teacher audio buffer:', err);
        if (active) setIsLoadingTeacher(false);
      }
    };

    loadTeacherAudio();

    return () => {
      active = false;
      if (playbackSessionRef.current) {
        playbackSessionRef.current.stop();
        playbackSessionRef.current = null;
      }
      if (countInCancelRef.current) {
        countInCancelRef.current();
        countInCancelRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [teacherAudioUrl]);

  // Clean up student blob URL
  useEffect(() => {
    return () => {
      if (studentAudioUrl && studentAudioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(studentAudioUrl);
      }
    };
  }, [studentAudioUrl]);

  // 2. Direct DOM Playhead Update Loop (Zero-Re-Render Performance)
  const updatePlayheadDOM = useCallback((t: number) => {
    const tDur = teacherBufferRef.current ? teacherBufferRef.current.duration : (teacherDuration || 1);
    const sDur = studentBufferRef.current ? studentBufferRef.current.duration : (studentDuration || 1);

    const tRatio = Math.max(0, Math.min(1, t / tDur));
    const effectiveStudentT = Math.max(0, t - (latencyOffsetMs / 1000));
    const sRatio = Math.max(0, Math.min(1, effectiveStudentT / sDur));

    if (teacherProgressRef.current) {
      teacherProgressRef.current.style.width = `${tRatio * 100}%`;
    }
    if (studentProgressRef.current) {
      studentProgressRef.current.style.width = `${sRatio * 100}%`;
    }
    if (timeDisplayRef.current) {
      timeDisplayRef.current.textContent = formatSecs(t);
    }
    if (track1TimeRef.current) {
      track1TimeRef.current.textContent = `${formatSecs(t)} / ${formatSecs(tDur)}`;
    }
    if (track2TimeRef.current) {
      track2TimeRef.current.textContent = `${formatSecs(effectiveStudentT)} / ${formatSecs(sDur)}`;
    }
  }, [teacherDuration, studentDuration, latencyOffsetMs]);

  // Master Playback Loop
  const startPlaybackLoop = useCallback(() => {
    const tick = () => {
      if (playbackSessionRef.current) {
        const t = playbackSessionRef.current.getCurrentPlaybackTime();
        updatePlayheadDOM(t);

        const tDur = teacherBufferRef.current ? teacherBufferRef.current.duration : teacherDuration;
        if (t >= tDur) {
          setIsPlaying(false);
          setCurrentPlayheadTime(0);
          updatePlayheadDOM(0);
          if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
          return;
        }

        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        setIsPlaying(false);
      }
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, [teacherDuration, updatePlayheadDOM]);

  // Handle Stop and Reset
  const handleStopAndReset = useCallback(() => {
    if (playbackSessionRef.current) {
      playbackSessionRef.current.stop();
      playbackSessionRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPlaying(false);
    setCurrentPlayheadTime(0);
    updatePlayheadDOM(0);
  }, [updatePlayheadDOM]);

  // Master Play/Pause Toggle
  const handleMasterTogglePlay = () => {
    if (!teacherBufferRef.current) return;

    if (isPlaying) {
      // Pause
      if (playbackSessionRef.current) {
        const pausedTime = playbackSessionRef.current.getCurrentPlaybackTime();
        playbackSessionRef.current.pause();
        playbackSessionRef.current = null;
        setCurrentPlayheadTime(pausedTime);
        updatePlayheadDOM(pausedTime);
      }
      setIsPlaying(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    } else {
      // Play
      const startOffset = currentPlayheadTime >= teacherDuration ? 0 : currentPlayheadTime;
      const session = playDualTrackSynchronous({
        teacherBuffer: teacherBufferRef.current,
        studentBuffer: studentBufferRef.current,
        offsetSec: startOffset,
        latencyOffsetMs: latencyOffsetMs,
        teacherVolume: teacherVolume,
        studentVolume: studentVolume,
        onEnded: () => {
          setIsPlaying(false);
          setCurrentPlayheadTime(0);
          updatePlayheadDOM(0);
        }
      });

      playbackSessionRef.current = session;
      setIsPlaying(true);
      startPlaybackLoop();
    }
  };

  // 3. Preset Volume Handlers
  const handleApplyPreset = (preset: '100_teacher' | '50_50' | '100_student') => {
    setActiveMixPreset(preset);
    let tVol = 1.0;
    let sVol = 1.0;

    if (preset === '100_teacher') {
      tVol = 1.0;
      sVol = 0.0;
    } else if (preset === '50_50') {
      tVol = 1.0;
      sVol = 1.0;
    } else if (preset === '100_student') {
      tVol = 0.0;
      sVol = 1.0;
    }

    setTeacherVolume(tVol);
    setStudentVolume(sVol);

    if (playbackSessionRef.current) {
      playbackSessionRef.current.setTeacherVolume(tVol);
      playbackSessionRef.current.setStudentVolume(sVol);
    }
  };

  // 4. Stop Recording Method (Callable manually OR automatically when Track A ends)
  const handleStopRecording = useCallback(() => {
    if (countInCancelRef.current) {
      countInCancelRef.current();
      countInCancelRef.current = null;
      setCountInStep(null);
    }

    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }

    if (playbackSessionRef.current) {
      playbackSessionRef.current.stop();
      playbackSessionRef.current = null;
    }

    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }

    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try { rec.requestData(); } catch (e) {}
      // 300ms Safety Buffer for natural room decay
      setTimeout(() => {
        try {
          if (rec.state !== 'inactive') {
            rec.stop();
          }
        } catch (e) {}
      }, 300);
    }

    setIsRecording(false);
  }, []);

  // 5. Synchronous Recording with 1-Measure Web Audio Count-In & Auto-Stop
  const handleStartRecording = async () => {
    try {
      if (!teacherBufferRef.current) return;
      handleStopAndReset();

      const audioCtx = getSharedAudioContext();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const stream = await acquireAudioStream({ audio: PURE_RAW_AUDIO_CONSTRAINTS });
      activeStreamRef.current = stream;

      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/mp4') 
          ? 'audio/mp4' 
          : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (activeStreamRef.current) {
          releaseAudioStream(activeStreamRef.current);
          activeStreamRef.current = null;
        }

        const rawBlob = new Blob(audioChunksRef.current, { type: mimeType });
        let finalBlob = rawBlob;
        let newUrl = URL.createObjectURL(rawBlob);

        // 🌟 Pure Raw Universal Limiter Normalization (-14.5 LUFS)
        try {
          const pureRawRes = await processPureRawBlob(rawBlob, {
            targetLufs: TARGET_PURE_RAW_LUFS,
            maxLimiterGrDb: MAX_PURE_RAW_LIMITER_GR_DB,
            targetPeakDb: TARGET_PEAK_DBTP
          });
          finalBlob = pureRawRes.processedBlob;
          newUrl = pureRawRes.processedUrl;
          if (pureRawRes.durationSec) {
            setRecordDuration(Math.round(pureRawRes.durationSec));
          }
        } catch (dspErr) {
          console.warn('[DuettDeckModal] Limiter fallback:', dspErr);
        }

        // Decode Student Buffer into Web Audio Engine
        try {
          const decodedStudent = await decodeAudioSource(finalBlob, audioCtx);
          studentBufferRef.current = decodedStudent;
          setStudentDuration(decodedStudent.duration);
        } catch (decodeErr) {
          console.warn('[DuettDeckModal] Failed to decode student audio:', decodeErr);
        }

        setStudentAudioBlob(finalBlob);
        setStudentAudioUrl(newUrl);
        setLatencyOffsetMs(DEFAULT_SMART_LATENCY_MS);
        setIsRecording(false);
      };

      mediaRecorderRef.current = recorder;

      // 4-Beat Sample-Accurate Count-In via Web Audio Synthesizer
      const effectiveBpm = Math.max(40, Math.min(220, teacherBpm || 100));
      const { songStartTime, cancel } = scheduleCountInBeeps(
        effectiveBpm,
        4,
        audioCtx,
        (beatNumber) => setCountInStep(beatNumber)
      );
      countInCancelRef.current = cancel;

      // Calculate time until Beat 1
      const delayUntilBeat1 = Math.max(0, (songStartTime - audioCtx.currentTime) * 1000);

      window.setTimeout(() => {
        setCountInStep(null);
        countInCancelRef.current = null;

        // 🎯 SYNCHRONOUS START: Beat 1 starts Track A and Student Recording AT THE IDENTICAL INSTANT!
        recorder.start(500); // Efficient 500ms chunking
        setIsRecording(true);
        recordStartTimeRef.current = Date.now();
        setRecordDuration(0);

        recordIntervalRef.current = window.setInterval(() => {
          const elapsed = Math.floor((Date.now() - recordStartTimeRef.current) / 1000);
          setRecordDuration(elapsed);
        }, 1000);

        // Start Track A playback through the Web Audio Engine
        playbackSessionRef.current = playDualTrackSynchronous({
          teacherBuffer: teacherBufferRef.current!,
          offsetSec: 0,
          teacherVolume: teacherVolume,
          onEnded: () => {
            // 🎯 SYNCHRONOUS AUTO-STOP: When teacher track reaches its end, auto-stop student recording!
            handleStopRecording();
          }
        });

        // Hard safety timeout: if teacher buffer finishes + 400ms margin, auto-stop
        const tDurationSec = teacherBufferRef.current?.duration || teacherDuration || 10;
        autoStopTimeoutRef.current = window.setTimeout(() => {
          handleStopRecording();
        }, (tDurationSec + 0.4) * 1000);

      }, delayUntilBeat1);

    } catch (err) {
      console.error('[DuettDeckModal] Failed to start recording:', err);
      alert('Mikrofonzugriff nicht möglich oder verweigert.');
    }
  };

  // 6. Save Student Take with Rich Metadata to Junior Recordings
  const handleSaveTake = async () => {
    if (!studentAudioBlob || isSaving) return;
    setIsSaving(true);

    try {
      const takeId = `duett_take_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const storageKey = `campus_blob_${takeId}`;

      await storeBlob(storageKey, studentAudioBlob);

      const dur = studentDuration || recordDuration || 1;
      const cleanTitle = `Duett: ${teacherTitle.replace(/^Aufnahme:\s*/i, '')}`;
      const nowIso = new Date().toISOString();

      const newTake = {
        id: takeId,
        url: storageKey,
        title: cleanTitle,
        label: cleanTitle,
        duration: dur,
        created_at: nowIso,
        songTag: songTag || teacherTitle,
        isDuettTake: true,
        latencyOffsetMs: latencyOffsetMs,
        teacherAudioUrl: teacherAudioUrl,
        teacherTitle: teacherTitle,
        teacherBpm: teacherBpm,
        metronomeBpm: teacherBpm,
        bpm: teacherBpm
      };

      const juniorKey = `campus_junior_recordings_${studentId}`;
      const stored = localStorage.getItem(juniorKey);
      let list = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];
      list.unshift(newTake);
      localStorage.setItem(juniorKey, JSON.stringify(list));
      window.dispatchEvent(new Event('campus_junior_recordings_updated'));

      if (onSaveStudentTake) {
        onSaveStudentTake(newTake);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);

    } catch (err) {
      console.error('[DuettDeckModal] Failed to save take:', err);
      alert('Speichern fehlgeschlagen.');
    } finally {
      setIsSaving(false);
    }
  };

  // 7. 1-Click Stereo Mixdown Export
  const handleExportMixdown = async () => {
    if (!teacherBufferRef.current || !studentBufferRef.current || isExportingMix) return;
    setIsExportingMix(true);

    try {
      const mixBlob = await renderDuettMixdown({
        teacherBuffer: teacherBufferRef.current,
        studentBuffer: studentBufferRef.current,
        latencyOffsetMs: latencyOffsetMs,
        teacherVolume: teacherVolume,
        studentVolume: studentVolume
      });

      const exportUrl = URL.createObjectURL(mixBlob);
      const a = document.createElement('a');
      a.href = exportUrl;
      const safeTitle = teacherTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `Duett_${safeTitle}_${studentFirstName}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(exportUrl);
    } catch (err) {
      console.error('[DuettDeckModal] Failed to export mixdown:', err);
      alert('Mixdown-Export fehlgeschlagen.');
    } finally {
      setIsExportingMix(false);
    }
  };

  if (!isOpen) return null;

  // Waveform visualization mockup bars (40 bars)
  const teacherWaveform = [30, 45, 70, 50, 80, 95, 65, 40, 85, 90, 60, 45, 80, 100, 75, 55, 70, 85, 60, 40, 50, 75, 90, 65, 80, 95, 70, 45, 60, 85, 90, 65, 50, 70, 85, 60, 45, 35, 25, 20];
  const studentWaveform = [25, 40, 60, 45, 75, 90, 70, 45, 80, 85, 65, 50, 85, 95, 70, 50, 65, 80, 65, 45, 55, 70, 85, 60, 75, 90, 65, 50, 65, 80, 85, 60, 45, 65, 80, 55, 40, 30, 20, 15];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 11000,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? '0' : '16px'
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Duett-Deck"
    >
      <div
        style={{
          width: '100%',
          maxWidth: isTablet ? '720px' : '680px',
          maxHeight: isMobile ? '94vh' : '90vh',
          background: '#ffffff',
          borderRadius: isMobile ? '24px 24px 0 0' : '28px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}
      >
        {/* Top Navigation / Header */}
        <div
          style={{
            padding: isMobile ? '12px 16px' : '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: isMobile ? '36px' : '40px',
                height: isMobile ? '36px' : '40px',
                minWidth: isMobile ? '36px' : '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 3px 10px rgba(21, 128, 61, 0.28)',
                flexShrink: 0
              }}
            >
              <Layers size={isMobile ? 18 : 20} strokeWidth={2.4} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 900, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Synchrones Duett-Deck • Web Audio Clock
              </div>
              <h3 style={{ margin: 0, fontSize: isMobile ? '0.96rem' : '1.08rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {teacherTitle}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '44px',
              height: '44px',
              minWidth: '44px',
              minHeight: '44px',
              borderRadius: '50%',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0
            }}
            className="hover-scale-mini"
            title="Schließen"
            aria-label="Duett-Deck schließen"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        {/* Workstation Body */}
        <div style={{ padding: isMobile ? '14px 16px' : '20px', display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '16px', overflowY: 'auto' }}>

          {/* ══════════════════════════════════════════════════════════════════
              TRACK 1: LEHRER (STATIC TRACK A)
             ══════════════════════════════════════════════════════════════════ */}
          <div
            style={{
              background: '#f8fafc',
              borderRadius: '20px',
              border: '1.5px solid #e2e8f0',
              padding: isMobile ? '12px' : '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    background: '#e6f4ea',
                    color: '#15803d',
                    fontSize: '0.64rem',
                    fontWeight: 900,
                    padding: '3px 8px',
                    borderRadius: '100px',
                    border: '1px solid #bbf7d0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  Spur 1: Lehrkraft (Fixiert)
                </span>
                <span ref={track1TimeRef} style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
                  {isLoadingTeacher ? 'Lädt...' : `${formatSecs(currentPlayheadTime)} / ${formatSecs(teacherDuration)}`}
                </span>
              </div>

              {/* Volume Slider Teacher */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minHeight: '36px' }}>
                {teacherVolume === 0 ? <VolumeX size={16} color="#94a3b8" /> : <Volume2 size={16} color="#15803d" />}
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={teacherVolume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setTeacherVolume(v);
                    if (playbackSessionRef.current) {
                      playbackSessionRef.current.setTeacherVolume(v);
                    }
                    setActiveMixPreset('custom');
                  }}
                  style={{ width: isMobile ? '65px' : '80px', height: '28px', accentColor: '#15803d', cursor: 'pointer' }}
                  title={`Lehrer Lautstärke: ${Math.round(teacherVolume * 100)}%`}
                />
                <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#475569', minWidth: '32px' }}>
                  {Math.round(teacherVolume * 100)}%
                </span>
              </div>
            </div>

            {/* Zero-Re-Render Waveform Reveal Container (Teacher) */}
            <div
              onClick={(e) => {
                if (!teacherDuration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const newRatio = Math.max(0, Math.min(1, clickX / rect.width));
                const newT = newRatio * teacherDuration;
                setCurrentPlayheadTime(newT);
                updatePlayheadDOM(newT);

                if (isPlaying) {
                  // Restart from click position seamlessly
                  if (playbackSessionRef.current) playbackSessionRef.current.stop();
                  playbackSessionRef.current = playDualTrackSynchronous({
                    teacherBuffer: teacherBufferRef.current!,
                    studentBuffer: studentBufferRef.current,
                    offsetSec: newT,
                    latencyOffsetMs: latencyOffsetMs,
                    teacherVolume: teacherVolume,
                    studentVolume: studentVolume,
                    onEnded: () => {
                      setIsPlaying(false);
                      setCurrentPlayheadTime(0);
                      updatePlayheadDOM(0);
                    }
                  });
                }
              }}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                height: isMobile ? '38px' : '42px',
                cursor: 'pointer',
                background: '#ffffff',
                padding: '4px 10px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden'
              }}
            >
              {/* Background Gray Bars */}
              {teacherWaveform.map((h, idx) => (
                <div
                  key={`tw_bg_${idx}`}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    background: '#cbd5e1',
                    borderRadius: '4px'
                  }}
                />
              ))}

              {/* Foreground Green Active Reveal Overlay */}
              <div
                ref={teacherProgressRef}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '0%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '4px 10px',
                  overflow: 'hidden',
                  pointerEvents: 'none',
                  borderRight: '2.5px solid #15803d',
                  boxShadow: '2px 0 8px rgba(21, 128, 61, 0.4)'
                }}
              >
                {teacherWaveform.map((h, idx) => (
                  <div
                    key={`tw_fg_${idx}`}
                    style={{
                      flex: 1,
                      height: `${h}%`,
                      background: '#16a34a',
                      borderRadius: '4px'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              TRACK 2: SCHÜLER (RECORD & LATENCY ADJUSTABLE TRACK B)
             ══════════════════════════════════════════════════════════════════ */}
          <div
            style={{
              background: studentAudioUrl ? '#f5f3ff' : '#fafafa',
              borderRadius: '20px',
              border: studentAudioUrl ? '1.5px solid #ddd6fe' : '1.5px dashed #cbd5e1',
              padding: isMobile ? '12px' : '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    background: studentAudioUrl ? '#ede9fe' : '#f1f5f9',
                    color: studentAudioUrl ? '#6d28d9' : '#64748b',
                    fontSize: '0.64rem',
                    fontWeight: 900,
                    padding: '3px 8px',
                    borderRadius: '100px',
                    border: studentAudioUrl ? '1px solid #c4b5fd' : '1px solid #e2e8f0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  Spur 2: {studentFirstName} (Schüler)
                </span>
                {studentAudioUrl && (
                  <span ref={track2TimeRef} style={{ fontSize: '0.74rem', color: '#6d28d9', fontWeight: 700 }}>
                    {formatSecs(Math.max(0, currentPlayheadTime - (latencyOffsetMs / 1000)))} / {formatSecs(studentDuration)}
                  </span>
                )}
              </div>

              {/* Volume Slider Student */}
              {studentAudioUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minHeight: '36px' }}>
                  {studentVolume === 0 ? <VolumeX size={16} color="#94a3b8" /> : <Volume2 size={16} color="#7c3aed" />}
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={studentVolume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setStudentVolume(v);
                      if (playbackSessionRef.current) {
                        playbackSessionRef.current.setStudentVolume(v);
                      }
                      setActiveMixPreset('custom');
                    }}
                    style={{ width: isMobile ? '65px' : '80px', height: '28px', accentColor: '#7c3aed', cursor: 'pointer' }}
                    title={`Schüler Lautstärke: ${Math.round(studentVolume * 100)}%`}
                  />
                  <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#475569', minWidth: '32px' }}>
                    {Math.round(studentVolume * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* If NO recording yet: Recording Action Trigger */}
            {!studentAudioUrl && !isRecording && countInStep === null && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: isMobile ? '18px 12px' : '24px 16px',
                  gap: '12px',
                  textAlign: 'center'
                }}
              >
                <button
                  type="button"
                  onClick={handleStartRecording}
                  disabled={isLoadingTeacher}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: isMobile ? '12px 20px' : '14px 26px',
                    minHeight: '48px',
                    borderRadius: '16px',
                    background: isLoadingTeacher 
                      ? '#94a3b8' 
                      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#ffffff',
                    fontSize: isMobile ? '0.88rem' : '0.96rem',
                    fontWeight: 950,
                    border: 'none',
                    cursor: isLoadingTeacher ? 'wait' : 'pointer',
                    boxShadow: '0 6px 18px rgba(220, 38, 38, 0.35)',
                    transition: 'all 0.18s ease',
                    width: isMobile ? '100%' : 'auto'
                  }}
                  className="hover-scale"
                >
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffffff', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
                  <span>{isLoadingTeacher ? 'Lehrerspur lädt...' : 'Aufnahme starten (1 Takt Klick)'}</span>
                </button>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650, lineHeight: 1.35 }}>
                  🎧 <strong>Auto-Sync:</strong> Aufnahme startet auf Beat 1 synchron mit Spur 1 und <strong>stoppt automatisch</strong> am Song-Ende!
                </div>
              </div>
            )}

            {/* During Count-In */}
            {countInStep !== null && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                  gap: '8px'
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Einzähler ({teacherBpm || 100} BPM)
                </div>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                    border: '2px solid #ef4444',
                    color: '#dc2626',
                    fontSize: '1.8rem',
                    fontWeight: 950,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  {countInStep}
                </div>
              </div>
            )}

            {/* Active Recording State */}
            {isRecording && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: isMobile ? '10px 12px' : '12px 16px',
                  background: '#fef2f2',
                  border: '1.5px solid #fca5a5',
                  borderRadius: '16px',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: isMobile ? '0.78rem' : '0.86rem', fontWeight: 900, color: '#991b1b' }}>
                      Synchron-Aufnahme läuft ({formatSecs(recordDuration)})
                    </div>
                    <div style={{ fontSize: '0.66rem', color: '#b91c1c', fontWeight: 700 }}>
                      Stoppt automatisch bei {formatSecs(teacherDuration)}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleStopRecording}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    minHeight: '40px',
                    borderRadius: '12px',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 900,
                    border: 'none',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                  className="hover-scale-mini"
                >
                  <Square size={14} fill="#ffffff" />
                  <span>Jetzt Stoppen</span>
                </button>
              </div>
            )}

            {/* If Student Audio IS recorded: Render Student Waveform */}
            {studentAudioUrl && !isRecording && countInStep === null && (
              <>
                <div
                  onClick={(e) => {
                    if (!teacherDuration) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const newRatio = Math.max(0, Math.min(1, clickX / rect.width));
                    const newT = newRatio * teacherDuration;
                    setCurrentPlayheadTime(newT);
                    updatePlayheadDOM(newT);

                    if (isPlaying) {
                      if (playbackSessionRef.current) playbackSessionRef.current.stop();
                      playbackSessionRef.current = playDualTrackSynchronous({
                        teacherBuffer: teacherBufferRef.current!,
                        studentBuffer: studentBufferRef.current,
                        offsetSec: newT,
                        latencyOffsetMs: latencyOffsetMs,
                        teacherVolume: teacherVolume,
                        studentVolume: studentVolume,
                        onEnded: () => {
                          setIsPlaying(false);
                          setCurrentPlayheadTime(0);
                          updatePlayheadDOM(0);
                        }
                      });
                    }
                  }}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    height: isMobile ? '38px' : '42px',
                    cursor: 'pointer',
                    background: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    border: '1px solid #ddd6fe',
                    overflow: 'hidden'
                  }}
                >
                  {/* Background Gray Bars */}
                  {studentWaveform.map((h, idx) => (
                    <div
                      key={`sw_bg_${idx}`}
                      style={{
                        flex: 1,
                        height: `${h}%`,
                        background: '#e2e8f0',
                        borderRadius: '4px'
                      }}
                    />
                  ))}

                  {/* Foreground Purple Active Reveal Overlay */}
                  <div
                    ref={studentProgressRef}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '0%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '4px 10px',
                      overflow: 'hidden',
                      pointerEvents: 'none',
                      borderRight: '2.5px solid #7c3aed',
                      boxShadow: '2px 0 8px rgba(124, 58, 237, 0.4)'
                    }}
                  >
                    {studentWaveform.map((h, idx) => (
                      <div
                        key={`sw_fg_${idx}`}
                        style={{
                          flex: 1,
                          height: `${h}%`,
                          background: '#7c3aed',
                          borderRadius: '4px'
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Retake Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      padding: '6px 12px',
                      minHeight: '36px',
                      borderRadius: '10px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                    className="hover-scale-mini"
                  >
                    <RotateCcw size={13} />
                    <span>Nochmal aufnehmen</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              LATENCY OFFSET SLIDER (+/- MS)
             ══════════════════════════════════════════════════════════════════ */}
          {studentAudioUrl && (
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: isMobile ? '10px 12px' : '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sliders size={15} color="#475569" />
                  <span style={{ fontSize: isMobile ? '0.72rem' : '0.76rem', fontWeight: 900, color: '#334155' }}>
                    Latenz-Kompensation (Timing-Feinschliff)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 900,
                      color: latencyOffsetMs === 0 ? '#64748b' : '#7c3aed',
                      background: latencyOffsetMs === 0 ? '#f1f5f9' : '#ede9fe',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: latencyOffsetMs === 0 ? '1px solid #e2e8f0' : '1px solid #ddd6fe'
                    }}
                  >
                    {latencyOffsetMs > 0 ? `+${latencyOffsetMs} ms` : `${latencyOffsetMs} ms`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setLatencyOffsetMs(DEFAULT_SMART_LATENCY_MS);
                      updatePlayheadDOM(currentPlayheadTime);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: '4px'
                    }}
                  >
                    Auto-Smart (+60 ms)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLatencyOffsetMs(0);
                      updatePlayheadDOM(currentPlayheadTime);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: '4px'
                    }}
                  >
                    0 ms
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '36px' }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>-300 ms</span>
                <input 
                  type="range" 
                  min="-300" 
                  max="300" 
                  step="5"
                  value={latencyOffsetMs}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setLatencyOffsetMs(val);
                    updatePlayheadDOM(currentPlayheadTime);

                    if (isPlaying && playbackSessionRef.current) {
                      // Seamless on-the-fly offset readjustment
                      const currentT = playbackSessionRef.current.getCurrentPlaybackTime();
                      playbackSessionRef.current.stop();
                      playbackSessionRef.current = playDualTrackSynchronous({
                        teacherBuffer: teacherBufferRef.current!,
                        studentBuffer: studentBufferRef.current,
                        offsetSec: currentT,
                        latencyOffsetMs: val,
                        teacherVolume: teacherVolume,
                        studentVolume: studentVolume,
                        onEnded: () => {
                          setIsPlaying(false);
                          setCurrentPlayheadTime(0);
                          updatePlayheadDOM(0);
                        }
                      });
                    }
                  }}
                  style={{ flex: 1, height: '28px', accentColor: '#7c3aed', cursor: 'pointer' }}
                  title="Schiebe nach links/rechts um Latenzen auszugleichen"
                />
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>+300 ms</span>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              3 QUICK-SELECT PRESET BUTTONS (100% Lehrer / 50-50 / 100% Schüler)
             ══════════════════════════════════════════════════════════════════ */}
          {studentAudioUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Mix-Abhören:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { key: '100_teacher', label: '100% Lehrer', desc: 'Lehrer Solo' },
                  { key: '50_50', label: '50 / 50 Duett', desc: 'Beide Spuren' },
                  { key: '100_student', label: '100% Schüler', desc: 'Schüler Solo' }
                ].map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handleApplyPreset(p.key as any)}
                    style={{
                      padding: isMobile ? '8px 4px' : '10px 8px',
                      minHeight: isMobile ? '44px' : '48px',
                      borderRadius: '12px',
                      border: activeMixPreset === p.key ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                      background: activeMixPreset === p.key ? '#f0fdf4' : '#ffffff',
                      color: activeMixPreset === p.key ? '#15803d' : '#475569',
                      fontSize: isMobile ? '0.72rem' : '0.78rem',
                      fontWeight: activeMixPreset === p.key ? 950 : 800,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      boxShadow: activeMixPreset === p.key ? '0 2px 8px rgba(22, 163, 74, 0.15)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale-mini"
                  >
                    <span style={{ whiteSpace: 'nowrap' }}>{p.label}</span>
                    <span style={{ fontSize: '0.60rem', fontWeight: 650, color: activeMixPreset === p.key ? '#16a34a' : '#94a3b8', whiteSpace: 'nowrap' }}>
                      {p.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Bottom Footer / Master Controls */}
        <div
          style={{
            padding: isMobile ? '12px 16px' : '16px 20px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexShrink: 0
          }}
        >
          {/* Master Play/Pause and Reset */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleMasterTogglePlay}
              disabled={isRecording || countInStep !== null || isLoadingTeacher}
              style={{
                width: isMobile ? '44px' : '48px',
                height: isMobile ? '44px' : '48px',
                minWidth: isMobile ? '44px' : '48px',
                minHeight: isMobile ? '44px' : '48px',
                borderRadius: '50%',
                background: isPlaying
                  ? 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)'
                  : 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: isLoadingTeacher ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
              title={isPlaying ? 'Pause' : 'Synchron abspielen'}
              aria-label={isPlaying ? 'Pause' : 'Synchron abspielen'}
            >
              {isPlaying ? <Pause size={isMobile ? 18 : 20} fill="#ffffff" /> : <Play size={isMobile ? 18 : 20} fill="#ffffff" style={{ marginLeft: '2px' }} />}
            </button>

            <button
              type="button"
              onClick={handleStopAndReset}
              style={{
                width: isMobile ? '38px' : '42px',
                height: isMobile ? '38px' : '42px',
                minWidth: isMobile ? '38px' : '42px',
                minHeight: isMobile ? '38px' : '42px',
                borderRadius: '12px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              className="hover-scale-mini"
              title="Von vorne anfangen"
              aria-label="Von vorne anfangen"
            >
              <RotateCcw size={16} />
            </button>

            <span ref={timeDisplayRef} style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginLeft: '2px' }}>
              {formatSecs(currentPlayheadTime)}
            </span>
          </div>

          {/* Right Action: Save Take & Mixdown Export */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {studentAudioUrl && (
              <>
                {/* 1-Click Mixdown Export */}
                <button
                  type="button"
                  onClick={handleExportMixdown}
                  disabled={isExportingMix}
                  style={{
                    padding: isMobile ? '10px 12px' : '10px 14px',
                    minHeight: '44px',
                    borderRadius: '14px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    fontSize: isMobile ? '0.74rem' : '0.80rem',
                    fontWeight: 800,
                    cursor: isExportingMix ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  className="hover-scale-mini"
                  title="Gemastertes Duett als WAV-Audiodatei herunterladen"
                >
                  <Download size={15} />
                  <span>{isExportingMix ? 'Rendert...' : 'WAV-Mix'}</span>
                </button>

                {/* Save Take */}
                <button
                  type="button"
                  onClick={handleSaveTake}
                  disabled={isSaving || saveSuccess}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: isMobile ? '10px 14px' : '10px 18px',
                    minHeight: '44px',
                    borderRadius: '14px',
                    background: saveSuccess 
                      ? '#15803d' 
                      : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#ffffff',
                    fontSize: isMobile ? '0.78rem' : '0.86rem',
                    fontWeight: 950,
                    border: 'none',
                    cursor: isSaving ? 'wait' : 'pointer',
                    boxShadow: '0 4px 12px rgba(21, 128, 61, 0.28)',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale"
                >
                  {saveSuccess ? (
                    <>
                      <Check size={16} strokeWidth={2.8} />
                      <span>Gespeichert!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>{isSaving ? 'Speichern...' : (isMobile ? 'Speichern' : 'Take im Studio speichern')}</span>
                    </>
                  )}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: isMobile ? '10px 12px' : '10px 16px',
                minHeight: '44px',
                borderRadius: '14px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#64748b',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
              className="hover-scale-mini"
            >
              Fertig
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
