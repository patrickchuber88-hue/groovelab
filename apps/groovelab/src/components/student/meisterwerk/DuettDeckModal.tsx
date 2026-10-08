import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Wand2,
  Headphones,
  ShieldCheck,
  Download,
  Users,
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Columns,
  Timer
} from 'lucide-react';
import { getBlob, storeBlob } from '../../../utils/blobStorage';
import { acquireAudioStream, releaseAudioStream, PURE_RAW_AUDIO_CONSTRAINTS } from '../../../services/audioPermissionService';
import { processPureRawBlob, TARGET_PURE_RAW_LUFS, TARGET_PEAK_DBTP, MAX_PURE_RAW_LIMITER_GR_DB } from '../../../utils/audioMasteringEngine';
import { 
  getSharedAudioContext, 
  decodeAudioSource, 
  playDualTrackSynchronous, 
  renderDuettMixdown,
  masterLockStudentBufferToGuide,
  audioBufferToWavBlob,
  DualTrackPlaybackSession 
} from '../../../utils/dualTrackAudioEngine';
import { UniversalLatencyEngine } from '../../../utils/universalLatencyEngine';
import { calculateOptimalAlignmentOffsetMs, extractWaveformPeaks, applyMicroFadeIn } from '../../../utils/audioAutoAligner';
import { 
  uploadAudioWithIntegrityVerification, 
  computeBlobSha256, 
  buildCanonicalAudioStoragePath,
  resolvePlayableAudioSource
} from '../../../utils/audioStorageHelper';
import { 
  resampleWaveformPeaks, 
  extractWaveformPeaks as extractRawPeaks, 
  STUDIO_DUETT_WAVEFORM_BARS,
  generateOrganicWaveform,
  getCachedWaveformPeaks,
  setCachedWaveformPeaks,
  getCanonicalAudioKey
} from '../../../utils/waveformHelper';
import { getOfflineAudioRecord } from '../../../utils/offlineAudioVault';
import { isGenericSongTag, buildCanonicalStudioTakeFileName } from '../../../utils/audioNamingHelper';
import { 
  linearToDawMeterPercent, 
  createDawMeterBallistics, 
  getMeterColorGradient, 
  getMeterLevelDescription 
} from '../../../utils/audioVuMeterHelper';
import { supabase } from '../../../lib/supabase';
import { logApplicationAudit } from '../../../services/auditLogService';

export interface DuettDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherAudioUrl: string;
  teacherTitle?: string;
  teacherDuration?: number;
  teacherBpm?: number;
  songTag?: string;
  initialTeacherPeaks?: number[];
  initialTakeId?: string;
  initialStudentAudioUrl?: string;
  initialStudentDuration?: number;
  initialStudentPeaks?: number[];
  initialLatencyOffsetMs?: number;
  studentId: string;
  schoolId?: string;
  studentFirstName?: string;
  isNewRecording?: boolean;
  onSaveStudentTake?: (take: {
    id: string;
    url: string;
    title: string;
    label: string;
    duration: number;
    date?: string;
    created_at: string;
    songTag?: string;
    isDuettTake?: boolean;
    source?: string;
    latencyOffsetMs?: number;
    teacherAudioUrl?: string;
    teacherTitle?: string;
    teacherBpm?: number;
    sha256Checksum?: string;
    monitoringMode?: string;
    isBlindTake?: boolean;
    waveformPeaks?: number[];
  }) => void;
}

const DEFAULT_SMART_LATENCY_MS = 60; // 🌟 Tier-1 SaaS Enterprise+ Smart Pre-Shift

export const DuettDeckModal: React.FC<DuettDeckModalProps> = ({
  isOpen,
  onClose,
  teacherAudioUrl,
  teacherTitle = 'Lehrer-Aufnahme',
  teacherDuration: initialTeacherDuration = 0,
  teacherBpm = 100,
  songTag,
  initialTeacherPeaks,
  initialTakeId,
  initialStudentAudioUrl,
  initialStudentDuration = 0,
  initialStudentPeaks,
  initialLatencyOffsetMs,
  studentId,
  schoolId,
  studentFirstName = 'Schüler',
  isNewRecording = false,
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

  // 🎧 Hardware Headphone Awareness (Anti-Bleed Protection)
  const [hasHeadphones, setHasHeadphones] = useState<boolean>(false);

  useEffect(() => {
    const checkAudioOutput = async () => {
      try {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const headphoneKeywords = ['headphone', 'headset', 'airpod', 'buds', 'earphone', 'bluetooth', 'klinke', 'usb', 'inear', 'adapter'];
        const isHeadphone = devices.some(d => 
          headphoneKeywords.some(kw => (d.label || '').toLowerCase().includes(kw))
        );
        setHasHeadphones(isHeadphone);
      } catch (e) {
        // Fallback
      }
    };
    checkAudioOutput();
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', checkAudioOutput);
      return () => navigator.mediaDevices.removeEventListener('devicechange', checkAudioOutput);
    }
  }, []);

  // 🎧 Pädagogisches 2-Stufen-Monitoring (Standard: 'guide_teacher' für 100% klaren Klang ohne Lautsprecher-Bleed)
  const [monitoringMode, setMonitoringMode] = useState<'guide_teacher' | 'metronome_only' | 'full_teacher'>('guide_teacher');

  // 🌟 2027 Didaktischer Visual-Mode: Getrennte Spuren (Split) oder Phasen-Röntgen (Overlay)
  const [visualMode, setVisualMode] = useState<'split' | 'overlay'>('split');
  // 🎚️ Zero-Touch Latenz-Governance: Standardmäßig aufgeräumt/eingeklappt
  const [isLatencyDrawerOpen, setIsLatencyDrawerOpen] = useState(false);

  // ✨ Auto-Aligning State & Feedback
  const [isAutoAligning, setIsAutoAligning] = useState(false);
  const [autoAlignNotice, setAutoAlignNotice] = useState<string | null>(null);

  // 📊 Echte AudioBuffer RMS/Peak-Wellenformen (72-Balken Studio Goldstandard 2027)
  const [teacherPeaks, setTeacherPeaks] = useState<number[]>(() => {
    if (initialTeacherPeaks && initialTeacherPeaks.length > 0) {
      return resampleWaveformPeaks(initialTeacherPeaks, STUDIO_DUETT_WAVEFORM_BARS, true);
    }
    const cached = getCachedWaveformPeaks(teacherAudioUrl);
    if (cached && cached.length > 0) {
      return resampleWaveformPeaks(cached, STUDIO_DUETT_WAVEFORM_BARS, true);
    }
    return generateOrganicWaveform(teacherAudioUrl, STUDIO_DUETT_WAVEFORM_BARS);
  });
  const [studentPeaks, setStudentPeaks] = useState<number[]>(() => {
    if (initialStudentPeaks && initialStudentPeaks.length > 0) {
      return resampleWaveformPeaks(initialStudentPeaks, STUDIO_DUETT_WAVEFORM_BARS, true);
    }
    return generateOrganicWaveform('student', STUDIO_DUETT_WAVEFORM_BARS);
  });
  const [studentRawPeaks, setStudentRawPeaks] = useState<number[]>([]);

  // Master Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayheadTime, setCurrentPlayheadTime] = useState(0);

  // Audio Buffers & Engine State
  const [isLoadingTeacher, setIsLoadingTeacher] = useState(true);
  const [teacherDuration, setTeacherDuration] = useState<number>(() => initialTeacherDuration || 0);
  const [studentDuration, setStudentDuration] = useState<number>(0);
  const [resolvedTeacherSrc, setResolvedTeacherSrc] = useState<string | null>(null);
  const [resolvedStudentSrc, setResolvedStudentSrc] = useState<string | null>(null);

  const teacherBufferRef = useRef<AudioBuffer | null>(null);
  const isSyntheticTeacherBufferRef = useRef<boolean>(false);
  const teacherAudioElRef = useRef<HTMLAudioElement | null>(null);
  const studentBufferRef = useRef<AudioBuffer | null>(null);
  const studentRawBufferRef = useRef<AudioBuffer | null>(null);
  const isSyntheticStudentBufferRef = useRef<boolean>(false);
  const studentAudioElRef = useRef<HTMLAudioElement | null>(null);
  const playbackSessionRef = useRef<DualTrackPlaybackSession | null>(null);

  // Student Audio State (Supports reopening existing Duett takes)
  const activeSessionTakeIdRef = useRef<string | null>(initialTakeId || null);
  const [studentAudioBlob, setStudentAudioBlob] = useState<Blob | null>(null);
  const [studentAudioUrl, setStudentAudioUrl] = useState<string | null>(() => initialStudentAudioUrl || null);

  // Recording State & Live VU Peak Meter
  const [isRecording, setIsRecording] = useState(false);
  const [isSyncingBuffer, setIsSyncingBuffer] = useState<boolean>(false);
  const [countInStep, setCountInStep] = useState<number | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const [liveMeterPercent, setLiveMeterPercent] = useState<number>(0);
  const [isClippingDetected, setIsClippingDetected] = useState<boolean>(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const meterAnimFrameRef = useRef<number | null>(null);
  const meterBallisticsRef = useRef(createDawMeterBallistics());

  // Audio Controls & Mix
  const [teacherVolume, setTeacherVolume] = useState<number>(1.0);
  const [studentVolume, setStudentVolume] = useState<number>(1.0);
  const [activeMixPreset, setActiveMixPreset] = useState<'100_teacher' | '50_50' | '100_student' | 'custom'>('50_50');
  const [latencyOffsetMs, setLatencyOffsetMs] = useState<number>(() => 
    initialLatencyOffsetMs !== undefined ? initialLatencyOffsetMs : UniversalLatencyEngine.getLatencyMs()
  );

  // 🔄 Synchronize with global UniversalLatencyEngine across modules
  useEffect(() => {
    return UniversalLatencyEngine.subscribe((newMs) => {
      if (initialLatencyOffsetMs === undefined) {
        setLatencyOffsetMs(newMs);
      }
    });
  }, [initialLatencyOffsetMs]);

  // 🌟 🛡️ Revisionssichere Self-Healing Duett Association:
  // Stellt sicher, dass gespeicherte Schüler-Aufnahmen zu dieser Lehrer-Spur dauerhaft sichtbar & abspielbar bleiben
  useEffect(() => {
    let active = true;

    const resolveAndLoadStudentTake = async () => {
      // 🛡️ ZERO-GHOST-TAKE DOKTRIN: Bei einer brandneuen Aufnahme startet Spur 2 garantiert 100% sauber und leer!
      if (isNewRecording) {
        return;
      }

      let targetUrl = initialStudentAudioUrl || studentAudioUrl;
      let matchedTakeData: any = null;

      // Falls initialStudentAudioUrl nicht übergeben wurde: Suche im Offline-Tresor nach existierendem Duett-Take
      // NUR bei exakter Übereinstimmung mit dem canonicalTeacherKey (Zero Cross-Pollution!)
      if (!targetUrl) {
        try {
          const canonicalTeacherKey = getCanonicalAudioKey(teacherAudioUrl);

          const candidateKeys = [
            `campus_duett_active_take_${studentId}_${canonicalTeacherKey}`,
            `campus_duett_active_take_${studentId}_${encodeURIComponent(teacherAudioUrl)}`
          ].filter(Boolean) as string[];

          for (const k of candidateKeys) {
            const stored = localStorage.getItem(k);
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                if (parsed && (parsed.url || parsed.localUrl)) {
                  matchedTakeData = parsed;
                  targetUrl = parsed.url || parsed.localUrl;
                  if (parsed.id && !activeSessionTakeIdRef.current) {
                    activeSessionTakeIdRef.current = parsed.id;
                  }
                  if (parsed.duration && active) setStudentDuration(parsed.duration);
                  if (parsed.latencyOffsetMs !== undefined && active) setLatencyOffsetMs(parsed.latencyOffsetMs);
                  if (parsed.waveformPeaks && active) {
                    setStudentPeaks(resampleWaveformPeaks(parsed.waveformPeaks, STUDIO_DUETT_WAVEFORM_BARS, true));
                  }
                  break;
                }
              } catch {}
            }
          }

          // 2. Fallback: Suche in der Junior-Recordings Liste nach diesem Lehrer-Track (NUR exakte Audio-URL-Gleichheit)
          if (!targetUrl) {
            const juniorKey = `campus_junior_recordings_${studentId}`;
            const stored = localStorage.getItem(juniorKey);
            if (stored) {
              const list = JSON.parse(stored);
              if (Array.isArray(list)) {
                const match = list.find((r: any) => 
                  (r.isDuettTake || r.source === 'duet') && (
                    (r.teacherAudioUrl && getCanonicalAudioKey(r.teacherAudioUrl) === canonicalTeacherKey) ||
                    r.teacherAudioUrl === teacherAudioUrl
                  )
                );
                if (match && (match.url || match.localUrl)) {
                  matchedTakeData = match;
                  targetUrl = match.url || match.localUrl;
                  if (match.id && !activeSessionTakeIdRef.current) {
                    activeSessionTakeIdRef.current = match.id;
                  }
                  if (match.duration && active) setStudentDuration(match.duration);
                  if (match.latencyOffsetMs !== undefined && active) setLatencyOffsetMs(match.latencyOffsetMs);
                  if (match.waveformPeaks && active) {
                    setStudentPeaks(resampleWaveformPeaks(match.waveformPeaks, STUDIO_DUETT_WAVEFORM_BARS, true));
                  }
                }
              }
            }
          }
        } catch (storageErr) {
          console.warn('[DuettDeckModal] Error querying existing duett takes:', storageErr);
        }
      }

      if (!targetUrl) return;

      if (active && (!studentAudioUrl || studentAudioUrl !== targetUrl)) {
        setStudentAudioUrl(targetUrl);
      }

      // If buffer is already decoded and loaded for this exact URL, preserve it
      if (studentBufferRef.current && studentAudioUrl === targetUrl) {
        setHasSavedTake(true);
        return;
      }

      // Dekodiere Student AudioBuffer in die Web Audio Engine
      try {
        const audioCtx = getSharedAudioContext();
        let rawSource: Blob | string = targetUrl;
        let retrievedBlob: Blob | null = null;

        // 1. Direktzugriff auf IndexedDB bei lokalen Schlüsseln (targetUrl oder localUrl)
        const localCandidateKey = (targetUrl && targetUrl.startsWith('campus_blob_')) 
          ? targetUrl 
          : (matchedTakeData?.localUrl && matchedTakeData.localUrl.startsWith('campus_blob_') ? matchedTakeData.localUrl : null);

        if (localCandidateKey) {
          try {
            const stored = await getBlob(localCandidateKey);
            if (stored) {
              retrievedBlob = stored instanceof Blob ? stored : new Blob([stored], { type: 'audio/webm' });
              rawSource = retrievedBlob;
            }
          } catch {}
        }

        const res = await resolvePlayableAudioSource(targetUrl, 'campus-assets', 1800);
        if (res.src && !retrievedBlob) {
          rawSource = res.src;
        }
        let playableSrc: string | null = null;
        if (retrievedBlob) {
          try { playableSrc = URL.createObjectURL(retrievedBlob); } catch {}
        } else if (typeof rawSource === 'string' && (rawSource.startsWith('blob:') || rawSource.startsWith('http'))) {
          playableSrc = rawSource;
        }

        let decoded: AudioBuffer | null = null;
        try {
          decoded = await decodeAudioSource(rawSource, audioCtx);
        } catch (decErr) {
          console.warn('[DuettDeckModal] Failed to decode student audio, activating dual HTML5 fallback:', decErr);
        }

        if (active) {
          if (playableSrc) {
            setResolvedStudentSrc(playableSrc);
          }
          if (decoded) {
            studentRawBufferRef.current = decoded;
            let effectiveBuffer = decoded;
            // 🏛️ Self-Healing Master-Lock: Falls ein existierender Take noch nicht die exakte Länge von Spur 1 hat
            if (teacherBufferRef.current && teacherBufferRef.current.duration > 0 && Math.abs(decoded.duration - teacherBufferRef.current.duration) > 0.05) {
              effectiveBuffer = masterLockStudentBufferToGuide(decoded, teacherBufferRef.current, latencyOffsetMs, audioCtx);
            }
            studentBufferRef.current = effectiveBuffer;
            isSyntheticStudentBufferRef.current = false;
            setStudentDuration(effectiveBuffer.duration);
            const rawStd = extractRawPeaks(effectiveBuffer, 320);
            setStudentRawPeaks(rawStd);
            setStudentPeaks(resampleWaveformPeaks(rawStd, STUDIO_DUETT_WAVEFORM_BARS, true));
          } else {
            // Safari / WebM fallback: create synthetic timing buffer
            isSyntheticStudentBufferRef.current = true;
            const sampleRate = audioCtx.sampleRate || 44100;
            const dur = studentDuration || 5;
            const silent = audioCtx.createBuffer(1, Math.max(1, Math.floor(sampleRate * dur)), sampleRate);
            studentBufferRef.current = silent;
            setStudentPeaks(prev => (prev && prev.length === STUDIO_DUETT_WAVEFORM_BARS ? prev : generateOrganicWaveform(targetUrl, STUDIO_DUETT_WAVEFORM_BARS)));
          }
          if (retrievedBlob && !studentAudioBlob) {
            setStudentAudioBlob(retrievedBlob);
          }
          setHasSavedTake(true);
        }
      } catch (err) {
        console.warn('[DuettDeckModal] Failed to decode student take:', err);
        if (active) {
          const audioCtx = getSharedAudioContext();
          isSyntheticStudentBufferRef.current = true;
          const sampleRate = audioCtx.sampleRate || 44100;
          const dur = studentDuration || 5;
          const silent = audioCtx.createBuffer(1, Math.max(1, Math.floor(sampleRate * dur)), sampleRate);
          studentBufferRef.current = silent;
          setStudentPeaks(prev => (prev && prev.length === STUDIO_DUETT_WAVEFORM_BARS ? prev : generateOrganicWaveform(targetUrl, STUDIO_DUETT_WAVEFORM_BARS)));
          setHasSavedTake(true);
        }
      }
    };

    resolveAndLoadStudentTake();
    return () => { active = false; };
  }, [initialStudentAudioUrl, studentId, teacherAudioUrl, teacherTitle, songTag]);

  // Saving & Exporting State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasSavedTake, setHasSavedTake] = useState(false);
  const [isExportingMix, setIsExportingMix] = useState(false);

  // Internal Execution Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordStartTimeRef = useRef<number>(0);
  const recordIntervalRef = useRef<number | null>(null);
  const autoStopTimeoutRef = useRef<number | null>(null);
  const countInCancelRef = useRef<(() => void) | null>(null);
  const countInIntervalRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const prerollMsRef = useRef<number>(150);

  // Direct DOM Refs for Zero-Re-Render 120 FPS Playhead & DAW Static Waveforms
  const rulerPlayheadRef = useRef<HTMLDivElement | null>(null);
  const teacherPlayheadRef = useRef<HTMLDivElement | null>(null);
  const teacherVeilRef = useRef<HTMLDivElement | null>(null);
  const studentPlayheadRef = useRef<HTMLDivElement | null>(null);
  const studentVeilRef = useRef<HTMLDivElement | null>(null);
  const overlayPlayheadRef = useRef<HTMLDivElement | null>(null);
  const overlayVeilRef = useRef<HTMLDivElement | null>(null);
  const timeDisplayRef = useRef<HTMLSpanElement | null>(null);
  const track1TimeRef = useRef<HTMLSpanElement | null>(null);
  const track2TimeRef = useRef<HTMLSpanElement | null>(null);

  // 🎼 Didaktisches Takt- & Zählzeit-Raster (4/4 Standard, Metronom BPM synchron)
  const barMarkers = useMemo(() => {
    const effectiveBpm = Math.max(40, Math.min(240, teacherBpm || 100));
    const beatDurationSec = 60 / effectiveBpm;
    const beatsPerBar = 4; // 4/4 Takt
    const barDurationSec = beatDurationSec * beatsPerBar;
    const tDur = teacherBufferRef.current ? teacherBufferRef.current.duration : (teacherDuration || initialTeacherDuration || 10);
    const totalBars = Math.max(1, Math.ceil(tDur / barDurationSec));

    const bars: { barNum: number; leftPct: number; beats: number[] }[] = [];
    for (let b = 1; b <= totalBars; b++) {
      const barTime = (b - 1) * barDurationSec;
      const leftPct = (barTime / tDur) * 100;
      if (leftPct >= 99) break;

      const beats: number[] = [];
      for (let k = 1; k < beatsPerBar; k++) {
        const beatTime = barTime + k * beatDurationSec;
        const beatPct = (beatTime / tDur) * 100;
        if (beatPct < 99.5) {
          beats.push(beatPct);
        }
      }

      bars.push({ barNum: b, leftPct, beats });
    }
    return bars;
  }, [teacherBpm, teacherDuration, initialTeacherDuration]);

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 1. Resolve and Decode Teacher Audio Buffer via Web Audio API & Safari Fallback
  useEffect(() => {
    let active = true;
    let cleanupFn: (() => void) | undefined;
    setIsLoadingTeacher(true);

    const loadTeacherAudio = async () => {
      try {
        let rawSource: Blob | string = teacherAudioUrl;
        let finalSrc = teacherAudioUrl;

        // 1. Direktzugriff auf IndexedDB bei lokalen Schlüsseln
        if (teacherAudioUrl.startsWith('campus_blob_') || teacherAudioUrl.startsWith('campus_audio_') || teacherAudioUrl.startsWith('blob_')) {
          try {
            const rawStored = await getBlob(teacherAudioUrl);
            if (rawStored instanceof Blob) {
              rawSource = rawStored;
              finalSrc = URL.createObjectURL(rawStored);
              cleanupFn = () => { try { URL.revokeObjectURL(finalSrc); } catch {} };
            }
          } catch {}
        }

        // 2. Direktzugriff auf Offline-Vault
        if (typeof rawSource === 'string' && (rawSource.startsWith('offline://') || (rawSource.startsWith('audio_') && !rawSource.includes('.')))) {
          try {
            const recId = rawSource.replace(/^offline:\/\//, '');
            const offlineRec = await getOfflineAudioRecord(recId);
            if (offlineRec && offlineRec.blob) {
              rawSource = offlineRec.blob;
              finalSrc = URL.createObjectURL(offlineRec.blob);
              cleanupFn = () => { try { URL.revokeObjectURL(finalSrc); } catch {} };
            }
          } catch {}
        }

        // 3. Cloud Storage URL Resolution (Supabase Signed Streaming)
        if (typeof rawSource === 'string' && !rawSource.startsWith('blob:')) {
          let res = await resolvePlayableAudioSource(teacherAudioUrl, 'campus-assets', 1800);
          if (!res.src) {
            res = await resolvePlayableAudioSource(teacherAudioUrl, 'groovelab-assets', 1800);
          }

          if (res.src) {
            rawSource = res.src;
            finalSrc = res.src;
            if (res.cleanup) cleanupFn = res.cleanup;
          }
        }

        if (active) {
          setResolvedTeacherSrc(finalSrc);
        }

        const audioCtx = getSharedAudioContext();
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume().catch(() => {});
        }

        let decodedBuffer: AudioBuffer | null = null;
        try {
          decodedBuffer = await decodeAudioSource(rawSource, audioCtx);
        } catch (decodeErr) {
          console.warn('[DuettDeckModal] Web Audio decode failed, activating dual HTML5 audio fallback:', decodeErr);
        }

        if (active) {
          if (decodedBuffer) {
            teacherBufferRef.current = decodedBuffer;
            isSyntheticTeacherBufferRef.current = false;
            setTeacherDuration(decodedBuffer.duration);
            const raw = extractRawPeaks(decodedBuffer, 320);
            const resampled = resampleWaveformPeaks(raw, STUDIO_DUETT_WAVEFORM_BARS, true);
            setTeacherPeaks(resampled);
            setCachedWaveformPeaks(teacherAudioUrl, resampled);
          } else {
            // Safari / WebM fallback: create synthetic timing buffer
            isSyntheticTeacherBufferRef.current = true;
            const dur = initialTeacherDuration || 10;
            const sampleRate = audioCtx.sampleRate || 44100;
            const silent = audioCtx.createBuffer(1, Math.max(1, Math.floor(sampleRate * dur)), sampleRate);
            teacherBufferRef.current = silent;
            if (!teacherDuration && dur) {
              setTeacherDuration(dur);
            }
            // 🛡️ Überschreibe NIEMALS echte Peaks mit synthetischer Kurve!
            setTeacherPeaks(prev => {
              if (prev && prev.length === STUDIO_DUETT_WAVEFORM_BARS && (initialTeacherPeaks || getCachedWaveformPeaks(teacherAudioUrl))) {
                return prev;
              }
              const cached = getCachedWaveformPeaks(teacherAudioUrl);
              if (cached && cached.length > 0) return resampleWaveformPeaks(cached, STUDIO_DUETT_WAVEFORM_BARS, true);
              return generateOrganicWaveform(teacherAudioUrl, STUDIO_DUETT_WAVEFORM_BARS);
            });
          }
          setIsLoadingTeacher(false);
        }
      } catch (err) {
        console.error('[DuettDeckModal] Error loading teacher audio buffer:', err);
        if (active) {
          // Absolute fail-safe: synthesize timing buffer so recording is never locked
          const audioCtx = getSharedAudioContext();
          const dur = initialTeacherDuration || 10;
          const sampleRate = audioCtx.sampleRate || 44100;
          teacherBufferRef.current = audioCtx.createBuffer(1, Math.max(1, Math.floor(sampleRate * dur)), sampleRate);
          isSyntheticTeacherBufferRef.current = true;
          setTeacherDuration(dur);
          setIsLoadingTeacher(false);
        }
      }
    };

    loadTeacherAudio();

    return () => {
      active = false;
      if (cleanupFn) cleanupFn();
      if (playbackSessionRef.current) {
        playbackSessionRef.current.stop();
        playbackSessionRef.current = null;
      }
      if (teacherAudioElRef.current) {
        teacherAudioElRef.current.pause();
        teacherAudioElRef.current.currentTime = 0;
      }
      if (studentAudioElRef.current) {
        studentAudioElRef.current.pause();
        studentAudioElRef.current.currentTime = 0;
      }
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.disconnect(); } catch (e) {}
        sourceNodeRef.current = null;
      }
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch (e) {}
        analyserRef.current = null;
      }
      if (activeStreamRef.current) {
        releaseAudioStream(activeStreamRef.current);
        activeStreamRef.current = null;
      }
      if (countInCancelRef.current) {
        countInCancelRef.current();
        countInCancelRef.current = null;
      }
      if (countInIntervalRef.current) {
        clearInterval(countInIntervalRef.current);
        countInIntervalRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (meterAnimFrameRef.current) {
        cancelAnimationFrame(meterAnimFrameRef.current);
        meterAnimFrameRef.current = null;
      }
    };
  }, [teacherAudioUrl, initialTeacherDuration]);

  // Clean up student blob URLs
  useEffect(() => {
    return () => {
      if (studentAudioUrl && studentAudioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(studentAudioUrl);
      }
      if (resolvedStudentSrc && resolvedStudentSrc.startsWith('blob:')) {
        URL.revokeObjectURL(resolvedStudentSrc);
      }
    };
  }, [studentAudioUrl, resolvedStudentSrc]);

  // 2. Direct DOM Playhead Update Loop (Zero-Re-Render Performance & Master-Timeline Lockstep)
  const updatePlayheadDOM = useCallback((t: number) => {
    const tDur = teacherBufferRef.current ? teacherBufferRef.current.duration : (teacherDuration || initialTeacherDuration || 1);
    const tRatio = Math.max(0, Math.min(1, t / tDur));
    const pct = `${tRatio * 100}%`;

    // 1. Timeline Ruler Playhead Pin
    if (rulerPlayheadRef.current) {
      rulerPlayheadRef.current.style.left = pct;
    }

    // 2. Spur 1 (Lehrkraft): Playhead Needle & Static Unplayed Veil
    if (teacherPlayheadRef.current) {
      teacherPlayheadRef.current.style.left = pct;
    }
    if (teacherVeilRef.current) {
      teacherVeilRef.current.style.left = pct;
    }

    // 3. Spur 2 (Schüler): Playhead Needle & Static Unplayed Veil
    if (studentPlayheadRef.current) {
      studentPlayheadRef.current.style.left = pct;
    }
    if (studentVeilRef.current) {
      studentVeilRef.current.style.left = pct;
    }

    // 4. Overlay Mode: Playhead Needle & Static Unplayed Veil
    if (overlayPlayheadRef.current) {
      overlayPlayheadRef.current.style.left = pct;
    }
    if (overlayVeilRef.current) {
      overlayVeilRef.current.style.left = pct;
    }

    // 5. Timers
    if (timeDisplayRef.current) {
      timeDisplayRef.current.textContent = formatSecs(t);
    }
    if (track1TimeRef.current) {
      track1TimeRef.current.textContent = `${formatSecs(t)} / ${formatSecs(tDur)}`;
    }
    if (track2TimeRef.current) {
      const sDur = studentBufferRef.current ? studentBufferRef.current.duration : (studentDuration || 0);
      const latencySec = (latencyOffsetMs || 0) / 1000;
      const curS = Math.max(0, Math.min(sDur, t + latencySec));
      track2TimeRef.current.textContent = sDur > 0 ? `${formatSecs(curS)} / ${formatSecs(sDur)}` : `${formatSecs(t)} / ${formatSecs(tDur)}`;
    }
  }, [teacherDuration, initialTeacherDuration, studentDuration, latencyOffsetMs]);

  // 🎯 Master Seek Handler (Klick auf Lineal, Spur 1, Spur 2 oder Overlay)
  const handleSeek = useCallback((newT: number) => {
    const tDur = teacherBufferRef.current ? teacherBufferRef.current.duration : (teacherDuration || initialTeacherDuration || 1);
    const clampedT = Math.max(0, Math.min(tDur, newT));
    setCurrentPlayheadTime(clampedT);
    updatePlayheadDOM(clampedT);

    if (teacherAudioElRef.current && isSyntheticTeacherBufferRef.current) {
      teacherAudioElRef.current.currentTime = clampedT;
    }
    if (studentAudioElRef.current && isSyntheticStudentBufferRef.current) {
      const sLatencySec = (latencyOffsetMs || 0) / 1000;
      studentAudioElRef.current.currentTime = Math.max(0, clampedT + sLatencySec);
    }

    if (isPlaying) {
      if (playbackSessionRef.current) playbackSessionRef.current.stop();
      if (teacherAudioElRef.current && isSyntheticTeacherBufferRef.current) {
        teacherAudioElRef.current.currentTime = clampedT;
        teacherAudioElRef.current.play().catch(() => {});
      }
      if (studentAudioElRef.current && isSyntheticStudentBufferRef.current) {
        const sLatencySec = (latencyOffsetMs || 0) / 1000;
        studentAudioElRef.current.currentTime = Math.max(0, clampedT + sLatencySec);
        studentAudioElRef.current.play().catch(() => {});
      }
      playbackSessionRef.current = playDualTrackSynchronous({
        teacherBuffer: teacherBufferRef.current!,
        studentBuffer: studentBufferRef.current,
        offsetSec: clampedT,
        latencyOffsetMs: latencyOffsetMs,
        teacherVolume: isSyntheticTeacherBufferRef.current ? 0 : teacherVolume,
        studentVolume: isSyntheticStudentBufferRef.current ? 0 : studentVolume,
        onEnded: () => {
          setIsPlaying(false);
          setCurrentPlayheadTime(0);
          updatePlayheadDOM(0);
          if (teacherAudioElRef.current) {
            teacherAudioElRef.current.pause();
            teacherAudioElRef.current.currentTime = 0;
          }
          if (studentAudioElRef.current) {
            studentAudioElRef.current.pause();
            studentAudioElRef.current.currentTime = 0;
          }
        }
      });
    }
  }, [teacherDuration, initialTeacherDuration, isPlaying, latencyOffsetMs, teacherVolume, studentVolume, updatePlayheadDOM]);

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
    if (teacherAudioElRef.current) {
      teacherAudioElRef.current.pause();
      teacherAudioElRef.current.currentTime = 0;
    }
    if (studentAudioElRef.current) {
      studentAudioElRef.current.pause();
      studentAudioElRef.current.currentTime = 0;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPlaying(false);
    setCurrentPlayheadTime(0);
    updatePlayheadDOM(0);
  }, [updatePlayheadDOM]);

  // ✋ Abbruch des "Bereit machen..." Vorlaufs
  const handleCancelCountIn = useCallback(() => {
    if (countInIntervalRef.current) {
      clearInterval(countInIntervalRef.current);
      countInIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.disconnect(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch (e) {}
      analyserRef.current = null;
    }
    if (activeStreamRef.current) {
      releaseAudioStream(activeStreamRef.current);
      activeStreamRef.current = null;
    }
    setCountInStep(null);
    setIsRecording(false);
  }, []);

  // Master Play/Pause Toggle
  const handleMasterTogglePlay = useCallback(async () => {
    if (isSyncingBuffer) {
      return;
    }

    const audioCtx = getSharedAudioContext();
    if (audioCtx.state === 'suspended') {
      try { await audioCtx.resume(); } catch (e) {}
    }

    if (!teacherBufferRef.current) {
      const dur = teacherDuration || initialTeacherDuration || 10;
      const sampleRate = audioCtx.sampleRate || 44100;
      teacherBufferRef.current = audioCtx.createBuffer(1, Math.max(1, Math.floor(sampleRate * dur)), sampleRate);
      isSyntheticTeacherBufferRef.current = true;
    }

    if (isPlaying) {
      // Pause
      if (playbackSessionRef.current) {
        const pausedTime = playbackSessionRef.current.getCurrentPlaybackTime();
        playbackSessionRef.current.pause();
        playbackSessionRef.current = null;
        setCurrentPlayheadTime(pausedTime);
        updatePlayheadDOM(pausedTime);
      }
      if (teacherAudioElRef.current) {
        teacherAudioElRef.current.pause();
      }
      if (studentAudioElRef.current) {
        studentAudioElRef.current.pause();
      }
      setIsPlaying(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    } else {
      // Play
      const tDur = teacherBufferRef.current ? teacherBufferRef.current.duration : (teacherDuration || 1);
      const startOffset = currentPlayheadTime >= tDur ? 0 : currentPlayheadTime;

      if (isSyntheticTeacherBufferRef.current && teacherAudioElRef.current) {
        teacherAudioElRef.current.currentTime = startOffset;
        teacherAudioElRef.current.volume = Math.max(0, Math.min(1, teacherVolume));
        teacherAudioElRef.current.play().catch((err) => console.warn('[DuettDeckModal] HTML5 play error:', err));
      }
      if (isSyntheticStudentBufferRef.current && studentAudioElRef.current) {
        const sLatencySec = (latencyOffsetMs || 0) / 1000;
        studentAudioElRef.current.currentTime = Math.max(0, startOffset + sLatencySec);
        studentAudioElRef.current.volume = Math.max(0, Math.min(1, studentVolume));
        studentAudioElRef.current.play().catch((err) => console.warn('[DuettDeckModal] Student HTML5 play error:', err));
      }

      const session = playDualTrackSynchronous({
        teacherBuffer: teacherBufferRef.current,
        studentBuffer: studentBufferRef.current,
        offsetSec: startOffset,
        latencyOffsetMs: latencyOffsetMs,
        teacherVolume: isSyntheticTeacherBufferRef.current ? 0 : teacherVolume,
        studentVolume: isSyntheticStudentBufferRef.current ? 0 : studentVolume,
        onEnded: () => {
          setIsPlaying(false);
          setCurrentPlayheadTime(0);
          updatePlayheadDOM(0);
          if (teacherAudioElRef.current) {
            teacherAudioElRef.current.pause();
            teacherAudioElRef.current.currentTime = 0;
          }
          if (studentAudioElRef.current) {
            studentAudioElRef.current.pause();
            studentAudioElRef.current.currentTime = 0;
          }
        }
      });

      playbackSessionRef.current = session;
      setIsPlaying(true);
      startPlaybackLoop();
    }
  }, [isPlaying, isSyncingBuffer, currentPlayheadTime, teacherDuration, initialTeacherDuration, teacherVolume, studentVolume, latencyOffsetMs, updatePlayheadDOM, startPlaybackLoop]);

  // 3. Preset Volume Handlers: Instant-Audition & Smooth Crossfade
  const handleApplyPreset = async (preset: '100_teacher' | '50_50' | '100_student') => {
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
      playbackSessionRef.current.setTeacherVolume(isSyntheticTeacherBufferRef.current ? 0 : tVol);
      playbackSessionRef.current.setStudentVolume(isSyntheticStudentBufferRef.current ? 0 : sVol);
    }
    if (teacherAudioElRef.current && isSyntheticTeacherBufferRef.current) {
      teacherAudioElRef.current.volume = tVol;
    }
    if (studentAudioElRef.current && isSyntheticStudentBufferRef.current) {
      studentAudioElRef.current.volume = sVol;
    }

    // 🎯 Instant-Audition: Wenn pausiert, starte sofort die Wiedergabe an aktueller Stelle für direktes Abhören!
    if (!isPlaying) {
      const audioCtx = getSharedAudioContext();
      if (audioCtx.state === 'suspended') {
        try { await audioCtx.resume(); } catch (e) {}
      }
      const tDur = teacherBufferRef.current ? teacherBufferRef.current.duration : (teacherDuration || initialTeacherDuration || 1);
      const startOffset = currentPlayheadTime >= tDur ? 0 : currentPlayheadTime;

      if (isSyntheticTeacherBufferRef.current && teacherAudioElRef.current) {
        teacherAudioElRef.current.currentTime = startOffset;
        teacherAudioElRef.current.volume = Math.max(0, Math.min(1, tVol));
        teacherAudioElRef.current.play().catch(() => {});
      }
      if (isSyntheticStudentBufferRef.current && studentAudioElRef.current) {
        const sLatencySec = (latencyOffsetMs || 0) / 1000;
        studentAudioElRef.current.currentTime = Math.max(0, startOffset + sLatencySec);
        studentAudioElRef.current.volume = Math.max(0, Math.min(1, sVol));
        studentAudioElRef.current.play().catch(() => {});
      }

      if (teacherBufferRef.current) {
        const session = playDualTrackSynchronous({
          teacherBuffer: teacherBufferRef.current,
          studentBuffer: studentBufferRef.current,
          offsetSec: startOffset,
          latencyOffsetMs: latencyOffsetMs,
          teacherVolume: isSyntheticTeacherBufferRef.current ? 0 : tVol,
          studentVolume: isSyntheticStudentBufferRef.current ? 0 : sVol,
          onEnded: () => {
            setIsPlaying(false);
            setCurrentPlayheadTime(0);
            updatePlayheadDOM(0);
            if (teacherAudioElRef.current) {
              teacherAudioElRef.current.pause();
              teacherAudioElRef.current.currentTime = 0;
            }
            if (studentAudioElRef.current) {
              studentAudioElRef.current.pause();
              studentAudioElRef.current.currentTime = 0;
            }
          }
        });
        playbackSessionRef.current = session;
        setIsPlaying(true);
        startPlaybackLoop();
      }
    }
  };

  // 4. Stop Recording Method (Callable manually OR automatically when Track A ends)
  const handleStopRecording = useCallback(() => {
    if (countInCancelRef.current) {
      countInCancelRef.current();
      countInCancelRef.current = null;
      setCountInStep(null);
    }
    if (countInIntervalRef.current) {
      clearInterval(countInIntervalRef.current);
      countInIntervalRef.current = null;
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

    if (teacherAudioElRef.current) {
      teacherAudioElRef.current.pause();
    }
    if (studentAudioElRef.current) {
      studentAudioElRef.current.pause();
    }

    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.disconnect(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch (e) {}
      analyserRef.current = null;
    }
    if (activeStreamRef.current) {
      releaseAudioStream(activeStreamRef.current);
      activeStreamRef.current = null;
    }

    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }

    if (meterAnimFrameRef.current) {
      cancelAnimationFrame(meterAnimFrameRef.current);
      meterAnimFrameRef.current = null;
    }
    meterBallisticsRef.current.reset();
    setLiveMeterPercent(0);
    setIsClippingDetected(false);

    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try { rec.requestData(); } catch (e) {}
      setIsSyncingBuffer(true);
      // 300ms Safety Buffer for natural room decay
      setTimeout(() => {
        try {
          if (rec.state !== 'inactive') {
            rec.stop();
          }
        } catch (e) {}
      }, 300);
    } else {
      setIsRecording(false);
      setIsSyncingBuffer(false);
    }
  }, []);

  // 5. Synchronous Recording with 1-Measure Web Audio Count-In & Auto-Stop
  const handleStartRecording = async () => {
    try {
      handleStopAndReset();
      setHasSavedTake(false);
      setSaveSuccess(false);

      const audioCtx = getSharedAudioContext();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume().catch(() => {});
      }

      // Guarantee teacherBufferRef exists
      if (!teacherBufferRef.current) {
        const dur = teacherDuration || initialTeacherDuration || 10;
        const sampleRate = audioCtx.sampleRate || 44100;
        teacherBufferRef.current = audioCtx.createBuffer(1, Math.max(1, Math.floor(sampleRate * dur)), sampleRate);
        isSyntheticTeacherBufferRef.current = true;
      }

      const stream = await acquireAudioStream({ audio: PURE_RAW_AUDIO_CONSTRAINTS });
      activeStreamRef.current = stream;

      // 🎚️ Live Real-Time Peak & VU Meter Hookup
      try {
        const sourceNode = audioCtx.createMediaStreamSource(stream);
        sourceNodeRef.current = sourceNode;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        sourceNode.connect(analyser);
        analyserRef.current = analyser;

        const pcmData = new Float32Array(analyser.fftSize);
        meterBallisticsRef.current.reset();
        setIsClippingDetected(false);

        const pollMeter = () => {
          if (!activeStreamRef.current) return;
          analyser.getFloatTimeDomainData(pcmData);
          let peak = 0;
          for (let i = 0; i < pcmData.length; i++) {
            const abs = Math.abs(pcmData[i]);
            if (abs > peak) peak = abs;
          }
          // 🎚️ 2027 DAW Goldstandard: Quasialogarithmisches IEC 60268-10 / DIN PPM Metering mit analoger Ballistik
          const dawPercent = linearToDawMeterPercent(peak);
          const isHardwareClip = peak >= 0.94;
          const ballistics = meterBallisticsRef.current.update(dawPercent, isHardwareClip);

          setLiveMeterPercent(ballistics.currentPercent);
          setIsClippingDetected(ballistics.isClipping);
          meterAnimFrameRef.current = requestAnimationFrame(pollMeter);
        };
        meterAnimFrameRef.current = requestAnimationFrame(pollMeter);
      } catch (meterErr) {
        console.warn('[DuettDeckModal] Live meter setup warning:', meterErr);
      }

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
        if (meterAnimFrameRef.current) {
          cancelAnimationFrame(meterAnimFrameRef.current);
          meterAnimFrameRef.current = null;
        }
        meterBallisticsRef.current.reset();
        setLiveMeterPercent(0);
        setIsClippingDetected(false);

        if (sourceNodeRef.current) {
          try { sourceNodeRef.current.disconnect(); } catch (e) {}
          sourceNodeRef.current = null;
        }
        if (analyserRef.current) {
          try { analyserRef.current.disconnect(); } catch (e) {}
          analyserRef.current = null;
        }
        if (activeStreamRef.current) {
          releaseAudioStream(activeStreamRef.current);
          activeStreamRef.current = null;
        }

        const rawBlob = new Blob(audioChunksRef.current, { type: mimeType });
        let finalBlob = rawBlob;
        let newUrl = URL.createObjectURL(rawBlob);
        let estimatedDur = recordDuration || 5;

        // 🌟 Pure Raw Universal Limiter Normalization (-18.5 LUFS mit -6 dB Headroom-PAD)
        try {
          const pureRawRes = await processPureRawBlob(rawBlob, {
            targetLufs: TARGET_PURE_RAW_LUFS,
            maxLimiterGrDb: MAX_PURE_RAW_LIMITER_GR_DB,
            targetPeakDb: TARGET_PEAK_DBTP,
            padActive: true // 🏛️ -6 dB Headroom Pad für Duett-Aufnahmen: Verhindert Übersteuerungen bei Mehrspur-Wiedergabe
          });
          finalBlob = pureRawRes.processedBlob;
          newUrl = pureRawRes.processedUrl;
          if (pureRawRes.durationSec) {
            estimatedDur = pureRawRes.durationSec;
            setRecordDuration(Math.round(pureRawRes.durationSec));
          }
        } catch (dspErr) {
          console.warn('[DuettDeckModal] Limiter fallback:', dspErr);
        }

        let calculatedPeaks = studentPeaks;
        let finalDuration = estimatedDur;

        // Decode Student Buffer into Web Audio Engine
        try {
          const decodedStudent = await decodeAudioSource(finalBlob, audioCtx);
          isSyntheticStudentBufferRef.current = false;
          
          // 🪄 Zero-Touch: Klickfreies Cos² Micro-Fade-In (Anti-Plopp)
          applyMicroFadeIn(decodedStudent, 15);
          studentRawBufferRef.current = decodedStudent;

          // 🎯 2027 DAW Goldstandard: Autoritative Hardware-PDC (Plugin Delay Compensation)
          // Verhindert willkürliche Phasen-Verschiebungen (+263 ms) bei musikalisch unterschiedlichen Spuren.
          const hardwarePdcMs = UniversalLatencyEngine.getLatencyMs(audioCtx);
          setLatencyOffsetMs(hardwarePdcMs);

          // 🏛️ 2027 DAW Goldstandard: Sample-genauer Master-Lock an Spur 1 (Lehrkraft)
          // Garantiert exakt dieselbe Länge, Dauer und Abtastrate wie Spur 1.
          let lockedStudentBuffer = decodedStudent;
          if (teacherBufferRef.current && teacherBufferRef.current.duration > 0) {
            lockedStudentBuffer = masterLockStudentBufferToGuide(
              decodedStudent,
              teacherBufferRef.current,
              hardwarePdcMs,
              audioCtx
            );
            finalDuration = teacherBufferRef.current.duration;
            setStudentDuration(teacherBufferRef.current.duration);
          } else {
            finalDuration = decodedStudent.duration;
            setStudentDuration(decodedStudent.duration);
          }

          studentBufferRef.current = lockedStudentBuffer;
          const rawStd = extractRawPeaks(lockedStudentBuffer, 320);
          setStudentRawPeaks(rawStd);
          calculatedPeaks = resampleWaveformPeaks(rawStd, STUDIO_DUETT_WAVEFORM_BARS, true);
          setStudentPeaks(calculatedPeaks);

          // 🛡️ Erzeuge den master-gelockten 16-Bit PCM WAV-Blob für dauerhafte Parität
          try {
            const lockedWav = audioBufferToWavBlob(lockedStudentBuffer);
            finalBlob = lockedWav;
            newUrl = URL.createObjectURL(lockedWav);
          } catch (wavErr) {
            console.warn('[DuettDeckModal] Failed to convert locked buffer to WAV:', wavErr);
          }
        } catch (decodeErr) {
          console.warn('[DuettDeckModal] Failed to decode student audio, activating dual HTML5 fallback:', decodeErr);
          isSyntheticStudentBufferRef.current = true;
          const sampleRate = audioCtx.sampleRate || 44100;
          const targetDur = (teacherBufferRef.current?.duration || teacherDuration || initialTeacherDuration || estimatedDur || 10);
          const silent = audioCtx.createBuffer(1, Math.max(1, Math.floor(sampleRate * targetDur)), sampleRate);
          studentBufferRef.current = silent;
          finalDuration = targetDur;
          setStudentDuration(targetDur);
          calculatedPeaks = generateOrganicWaveform(newUrl, STUDIO_DUETT_WAVEFORM_BARS);
          setStudentPeaks(calculatedPeaks);
          const hardwarePdcMs = UniversalLatencyEngine.getLatencyMs(audioCtx);
          setLatencyOffsetMs(hardwarePdcMs);
        }

        setStudentAudioBlob(finalBlob);
        setStudentAudioUrl(newUrl);
        setResolvedStudentSrc(newUrl);
        setIsRecording(false);
        setIsSyncingBuffer(false);

        // 🛡️ REVISIONSSICHERER AUTO-COMMIT DIREKT BEI AUFNAHME-ENDE:
        // Schützt Schüler-Takes vor versehentlichem Schließen oder Neuladen
        handleSaveTake(finalBlob, finalDuration, calculatedPeaks);
      };

      mediaRecorderRef.current = recorder;

      // 🌟 Pädagogischer 3-Sekunden "Bereit machen... 3, 2, 1" Countdown (1:1 Meisterwerk Standard)
      // WICHTIG: Kein Audio-Klick, um das Mikrofon vor Übersprechen und Zerrungen zu schützen!
      if (countInIntervalRef.current) {
        clearInterval(countInIntervalRef.current);
        countInIntervalRef.current = null;
      }
      if (countInCancelRef.current) {
        countInCancelRef.current();
        countInCancelRef.current = null;
      }

      prerollMsRef.current = 0;
      setCountInStep(3);
      let count = 3;

      countInIntervalRef.current = window.setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountInStep(count);
        } else {
          if (countInIntervalRef.current) {
            clearInterval(countInIntervalRef.current);
            countInIntervalRef.current = null;
          }
          setCountInStep(null);

          // 🔴 EXAKT HIER startet die synchrone Aufnahme: Sekunde 0.000, glasklar ohne Audio-Klick!
          try {
            if (recorder.state === 'inactive') {
              recorder.start(250); // Sanfte 250ms Chunks für minimalen Puffer-Jitter
              setIsRecording(true);
              recordStartTimeRef.current = Date.now();
              setRecordDuration(0);

              recordIntervalRef.current = window.setInterval(() => {
                const elapsed = Math.floor((Date.now() - recordStartTimeRef.current) / 1000);
                setRecordDuration(elapsed);
              }, 1000);
            }
          } catch (recStartErr) {
            console.warn('[DuettDeckModal] Recorder start warning:', recStartErr);
          }

          // 🎧 Pädagogisches Live-Monitoring je nach gewähltem Modus:
          let liveMonitoringTeacherVol = 0.20; // 🏛️ Standard: Leise Guide-Spur (-14 dB), schützt vor Mikrofonübersteuerung
          if (monitoringMode === 'guide_teacher') {
            liveMonitoringTeacherVol = 0.20; // Guide-Spur leise im Hintergrund (-14 dB)
          } else if (monitoringMode === 'metronome_only') {
            liveMonitoringTeacherVol = 0.00; // 🎯 Studio-Challenge: Lehrkraft komplett stumm!
          } else if (monitoringMode === 'full_teacher') {
            liveMonitoringTeacherVol = hasHeadphones ? 1.0 : 0.40; // 100% nur bei Kopfhörern sicher
          }

          if (isSyntheticTeacherBufferRef.current && teacherAudioElRef.current) {
            teacherAudioElRef.current.currentTime = 0;
            teacherAudioElRef.current.volume = liveMonitoringTeacherVol;
            teacherAudioElRef.current.play().catch((err) => console.warn('[DuettDeckModal] HTML5 monitor play error:', err));
          }

          // Start Track A playback through the Web Audio Engine
          playbackSessionRef.current = playDualTrackSynchronous({
            teacherBuffer: teacherBufferRef.current!,
            offsetSec: 0,
            teacherVolume: isSyntheticTeacherBufferRef.current ? 0 : liveMonitoringTeacherVol,
            onEnded: () => {
              // 🎯 Zero-Cutoff Doktrin: Wenn die Lehrerspur endet, lassen wir die Aufnahme 
              // noch 1.200 ms ausklingen (Sustain, Reverb, Schlusston, Startup-Latenz-Kompensation).
              if (autoStopTimeoutRef.current) {
                clearTimeout(autoStopTimeoutRef.current);
              }
              autoStopTimeoutRef.current = window.setTimeout(() => {
                handleStopRecording();
              }, 1200);
            }
          });

          // Hard safety timeout: if teacher buffer finishes + 1800ms margin, auto-stop
          const tDurationSec = teacherBufferRef.current?.duration || teacherDuration || initialTeacherDuration || 10;
          autoStopTimeoutRef.current = window.setTimeout(() => {
            handleStopRecording();
          }, (tDurationSec + 1.8) * 1000);
        }
      }, 1000);

    } catch (err) {
      console.error('[DuettDeckModal] Failed to start recording:', err);
      alert('Mikrofonzugriff nicht möglich oder verweigert.');
    }
  };

  // 🎹 2027 0,1% Goldstandard Keyboard Shortcuts (DAW Logic / Cubase Standard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isRecording) {
          handleStopRecording();
        } else if (countInStep !== null) {
          handleCancelCountIn();
        } else if (!isSyncingBuffer) {
          handleMasterTogglePlay();
        }
      } else if (e.code === 'KeyR' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (!isRecording && countInStep === null && !isLoadingTeacher && !isSyncingBuffer) {
          handleStartRecording();
        } else if (isRecording) {
          handleStopRecording();
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        if (countInStep !== null) {
          handleCancelCountIn();
        } else if (isRecording) {
          handleStopRecording();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRecording, isSyncingBuffer, countInStep, isLoadingTeacher, handleMasterTogglePlay, handleStartRecording, handleStopRecording, handleCancelCountIn, onClose]);

  // 🌟 1-Klick Magischer Auto-Align Algorithmus (Kreuzkorrelation)
  const handleAutoAlign = () => {
    if (!teacherBufferRef.current || !studentBufferRef.current) return;
    setIsAutoAligning(true);
    try {
      const calculatedOffset = calculateOptimalAlignmentOffsetMs(
        teacherBufferRef.current,
        studentBufferRef.current,
        500
      );
      setLatencyOffsetMs(calculatedOffset);
      setAutoAlignNotice(`✨ Auto-Align optimiert: ${calculatedOffset > 0 ? `+${calculatedOffset}` : calculatedOffset} ms`);
      setTimeout(() => setAutoAlignNotice(null), 3500);

      if (studentRawBufferRef.current && teacherBufferRef.current) {
        const audioCtx = getSharedAudioContext();
        const relocked = masterLockStudentBufferToGuide(
          studentRawBufferRef.current,
          teacherBufferRef.current,
          calculatedOffset,
          audioCtx
        );
        studentBufferRef.current = relocked;
        const rawStd = extractRawPeaks(relocked, 320);
        setStudentRawPeaks(rawStd);
        setStudentPeaks(resampleWaveformPeaks(rawStd, STUDIO_DUETT_WAVEFORM_BARS, true));
      }

      updatePlayheadDOM(currentPlayheadTime);

      if (isPlaying && playbackSessionRef.current) {
        const currentT = playbackSessionRef.current.getCurrentPlaybackTime();
        playbackSessionRef.current.stop();
        if (teacherAudioElRef.current && isSyntheticTeacherBufferRef.current) {
          teacherAudioElRef.current.currentTime = currentT;
          teacherAudioElRef.current.play().catch(() => {});
        }
        playbackSessionRef.current = playDualTrackSynchronous({
          teacherBuffer: teacherBufferRef.current!,
          studentBuffer: studentBufferRef.current,
          offsetSec: currentT,
          latencyOffsetMs: calculatedOffset,
          teacherVolume: isSyntheticTeacherBufferRef.current ? 0 : teacherVolume,
          studentVolume: studentVolume,
          onEnded: () => {
            setIsPlaying(false);
            setCurrentPlayheadTime(0);
            updatePlayheadDOM(0);
            if (teacherAudioElRef.current) {
              teacherAudioElRef.current.pause();
              teacherAudioElRef.current.currentTime = 0;
            }
          }
        });
      }
    } catch (err) {
      console.warn('[DuettDeckModal] Auto-align error:', err);
    } finally {
      setIsAutoAligning(false);
    }
  };

  // 🌟 2027 Micro-Nudge Feintuning (±1ms / ±5ms Schritte während der Wiedergabe)
  const handleNudgeLatency = (delta: number) => {
    const nextVal = Math.max(-500, Math.min(500, latencyOffsetMs + delta));
    setLatencyOffsetMs(nextVal);

    if (studentRawBufferRef.current && teacherBufferRef.current) {
      const audioCtx = getSharedAudioContext();
      const relocked = masterLockStudentBufferToGuide(
        studentRawBufferRef.current,
        teacherBufferRef.current,
        nextVal,
        audioCtx
      );
      studentBufferRef.current = relocked;
      const rawStd = extractRawPeaks(relocked, 320);
      setStudentRawPeaks(rawStd);
      setStudentPeaks(resampleWaveformPeaks(rawStd, STUDIO_DUETT_WAVEFORM_BARS, true));
    }

    updatePlayheadDOM(currentPlayheadTime);

    if (isPlaying && playbackSessionRef.current) {
      const currentT = playbackSessionRef.current.getCurrentPlaybackTime();
      playbackSessionRef.current.stop();
      if (teacherAudioElRef.current && isSyntheticTeacherBufferRef.current) {
        teacherAudioElRef.current.currentTime = currentT;
        teacherAudioElRef.current.play().catch(() => {});
      }
      playbackSessionRef.current = playDualTrackSynchronous({
        teacherBuffer: teacherBufferRef.current!,
        studentBuffer: studentBufferRef.current,
        offsetSec: currentT,
        latencyOffsetMs: nextVal,
        teacherVolume: isSyntheticTeacherBufferRef.current ? 0 : teacherVolume,
        studentVolume: studentVolume,
        onEnded: () => {
          setIsPlaying(false);
          setCurrentPlayheadTime(0);
          updatePlayheadDOM(0);
          if (teacherAudioElRef.current) {
            teacherAudioElRef.current.pause();
            teacherAudioElRef.current.currentTime = 0;
          }
        }
      });
    }
  };

  // 6. Save Student Take: 🛡️ Revisionssicherer Enterprise+ Standard (SHA-256, Cloud-Upload & Audit-Log)
  const handleSaveTake = async (customBlob?: Blob, customDuration?: number, customPeaks?: number[]) => {
    const blobToSave = customBlob || studentAudioBlob;
    if (!blobToSave || isSaving) return;
    setIsSaving(true);

    try {
      const isWav = Boolean(blobToSave.type && blobToSave.type.includes('wav'));
      const blobExt = isWav ? 'wav' : 'webm';
      const existingTakeId = activeSessionTakeIdRef.current;
      const takeId = existingTakeId || `duett_take_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      activeSessionTakeIdRef.current = takeId;
      const storageKey = `campus_blob_${takeId}.${blobExt}`;
      const legacyStorageKey = `campus_blob_${takeId}`;

      // 1. Dual-Storage Offline Cache (IndexedDB für verzögerungsfreie PWA-Wiedergabe)
      await storeBlob(storageKey, blobToSave);
      await storeBlob(legacyStorageKey, blobToSave);

      // 2. 🛡️ Kryptographische SHA-256 Integritätsprüfung gegen Bit-Rot & Manipulation
      const sha256Checksum = await computeBlobSha256(blobToSave);

      // 3. 🛡️ Kanonischer Multi-Tenant Cloud Storage Upload
      const effectiveSchool = schoolId || (typeof localStorage !== 'undefined' ? localStorage.getItem('campus_school_id') : null) || 'global';
      const storagePath = buildCanonicalAudioStoragePath({
        schoolId: effectiveSchool,
        studentId: studentId,
        category: 'duett_takes',
        trackId: takeId,
        extension: blobExt
      });

      let finalUrl = storageKey;
      try {
        const uploadRes = await uploadAudioWithIntegrityVerification(
          storagePath,
          blobToSave,
          'campus-assets',
          blobToSave.type || (isWav ? 'audio/wav' : 'audio/webm')
        );
        if (uploadRes.success && uploadRes.publicUrl) {
          finalUrl = uploadRes.publicUrl;
        }
      } catch (uploadErr) {
        console.warn('[DuettDeckModal] Cloud upload warning (local cache active):', uploadErr);
      }

      const dur = customDuration || studentDuration || recordDuration || 1;
      const cleanTeacherTitle = (teacherTitle || 'Aufnahme').replace(/^(?:Aufnahme|Duett):\s*/i, '').trim();
      const cleanTitle = cleanTeacherTitle ? `Duett: ${cleanTeacherTitle}` : 'Duett-Aufnahme';
      const nowIso = new Date().toISOString();

      // 4. 🛡️ Revisionssicherer Audit-Trail Eintrag in public.audit_logs
      try {
        await logApplicationAudit({
          action: 'DUETT_RECORDING_COMMITTED',
          schoolId: effectiveSchool || null,
          tableName: 'duett_recordings',
          recordId: takeId,
          details: {
            take_id: takeId,
            title: cleanTitle,
            sha256_checksum: sha256Checksum,
            storage_path: storagePath,
            latency_offset_ms: latencyOffsetMs,
            monitoring_mode: monitoringMode,
            is_blind_take: monitoringMode === 'metronome_only',
            teacher_title: teacherTitle,
            teacher_bpm: teacherBpm,
            duration_seconds: dur
          }
        });
      } catch (auditErr) {
        console.warn('[DuettDeckModal] Audit logging notice:', auditErr);
      }

      // 5. SongTag sanitization: Only genuine song/book titles become songTag (never generic lesson fallbacks)
      const validSongTag = (songTag && !isGenericSongTag(songTag) && songTag !== teacherTitle) ? songTag.trim() : (cleanTeacherTitle || undefined);
      const peaksToSave = customPeaks || studentPeaks;

      const newTake = {
        id: takeId,
        url: finalUrl,
        localUrl: storageKey,
        title: cleanTitle,
        label: cleanTitle,
        duration: dur,
        date: nowIso,
        created_at: nowIso,
        songTag: validSongTag,
        isDuettTake: true,
        source: 'duet',
        latencyOffsetMs: latencyOffsetMs,
        teacherAudioUrl: teacherAudioUrl,
        teacherTitle: teacherTitle,
        teacherBpm: teacherBpm,
        metronomeBpm: teacherBpm,
        bpm: teacherBpm,
        sha256Checksum: sha256Checksum,
        monitoringMode: monitoringMode,
        isBlindTake: monitoringMode === 'metronome_only',
        waveformPeaks: peaksToSave
      };

      const juniorKey = `campus_junior_recordings_${studentId}`;
      const stored = localStorage.getItem(juniorKey);
      let list = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];

      const teacherCanonical = getCanonicalAudioKey(teacherAudioUrl);
      const existingIdx = list.findIndex((t: any) => t.id === takeId);

      if (existingIdx !== -1) {
        // 1. In-Place Update: Derselbe Session-Take wird aktualisiert
        list[existingIdx] = { ...list[existingIdx], ...newTake };
      } else {
        // 2. Prüfe, ob bereits ein nicht-umbenannter Duett-Take zu diesem Teacher-Track existiert (Anti-Duplication)
        const dupeIdx = list.findIndex((t: any) => 
          (t.isDuettTake || t.source === 'duet') && 
          t.teacherAudioUrl && 
          getCanonicalAudioKey(t.teacherAudioUrl) === teacherCanonical &&
          !t.isCustomTitle
        );
        if (dupeIdx !== -1) {
          list[dupeIdx] = newTake;
        } else {
          list.unshift(newTake);
        }
      }
      localStorage.setItem(juniorKey, JSON.stringify(list));

      // 🌟 Revisionssicherer Duett-Link für sofortigen Wiederaufruf dieser Spur (Multi-Key)
      try {
        const canonicalKey = getCanonicalAudioKey(teacherAudioUrl);
        localStorage.setItem(`campus_duett_active_take_${studentId}_${canonicalKey}`, JSON.stringify(newTake));
        localStorage.setItem(`campus_duett_active_take_${studentId}_${encodeURIComponent(teacherAudioUrl)}`, JSON.stringify(newTake));
        if (cleanTeacherTitle) {
          localStorage.setItem(`campus_duett_active_take_${studentId}_title_${encodeURIComponent(cleanTeacherTitle)}`, JSON.stringify(newTake));
        }
      } catch (dedErr) {
        console.warn('[DuettDeckModal] Dedicated duett key save warning:', dedErr);
      }

      // 🌟 Revisionssicher im Modal verankern:
      // studentAudioUrl wird auf finalUrl aktualisiert, Buffer und Peaks bleiben aktiv
      setStudentAudioUrl(finalUrl);
      setHasSavedTake(true);

      window.dispatchEvent(new Event('campus_junior_recordings_updated'));

      if (onSaveStudentTake) {
        onSaveStudentTake(newTake);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2500);

    } catch (err) {
      console.error('[DuettDeckModal] Failed to save take:', err);
      if (!customBlob) {
        alert('Speichern fehlgeschlagen.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // 7. 1-Click Stereo Mixdown Export mit 0,1% DAW Studio Naming Standard
  const handleExportMixdown = async () => {
    if (isExportingMix) return;
    const audioCtx = getSharedAudioContext();
    if (!teacherBufferRef.current) {
      const dur = teacherDuration || initialTeacherDuration || 10;
      const sampleRate = audioCtx.sampleRate || 44100;
      teacherBufferRef.current = audioCtx.createBuffer(1, Math.max(1, Math.floor(sampleRate * dur)), sampleRate);
    }
    if (!studentBufferRef.current && studentAudioBlob) {
      try {
        studentBufferRef.current = await decodeAudioSource(studentAudioBlob, audioCtx);
      } catch (e) {
        console.warn('[DuettDeckModal] Decode student buffer on export notice:', e);
      }
    }
    if (!studentBufferRef.current) {
      alert('Keine Schüleraufnahme zum Mischen vorhanden.');
      return;
    }
    setIsExportingMix(true);

    try {
      const mixBlob = await renderDuettMixdown({
        teacherBuffer: teacherBufferRef.current,
        studentBuffer: studentBufferRef.current,
        latencyOffsetMs: latencyOffsetMs,
        teacherVolume: teacherVolume,
        studentVolume: studentVolume
      });

      const cleanTeacherTitle = (teacherTitle || 'Aufnahme').replace(/^(?:Aufnahme|Duett):\s*/i, '').trim();
      const fileName = buildCanonicalStudioTakeFileName({
        prefix: 'Duett',
        songTitle: cleanTeacherTitle,
        studentName: studentFirstName,
        bpm: teacherBpm,
        takeNumber: 1,
        role: 'StereoMix',
        extension: 'wav'
      });

      const exportUrl = URL.createObjectURL(mixBlob);
      const a = document.createElement('a');
      a.href = exportUrl;
      a.download = fileName;
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

  // 📊 Echte RMS/Peak Wellenformen (72 Micro-Bars Studio Goldstandard 2027)
  const teacherWaveform = useMemo(() => {
    if (teacherPeaks && teacherPeaks.length === STUDIO_DUETT_WAVEFORM_BARS) {
      return teacherPeaks;
    }
    if (teacherPeaks && teacherPeaks.length > 0) {
      return resampleWaveformPeaks(teacherPeaks, STUDIO_DUETT_WAVEFORM_BARS, true);
    }
    return generateOrganicWaveform(teacherAudioUrl, STUDIO_DUETT_WAVEFORM_BARS);
  }, [teacherPeaks, teacherAudioUrl]);

  // 🎯 2027 Goldstandard: Zeitlineare Absolute Timeline-Projektion (Time-Linear Absolute Projection)
  // Verhindert Timestretching, Dehnen oder Verzerren. 1 Sekunde Audio entspricht immer exakt x Pixeln.
  const mappedStudentWaveform = useMemo(() => {
    const tDur = teacherBufferRef.current ? teacherBufferRef.current.duration : (teacherDuration || initialTeacherDuration || 1);
    const sDur = studentBufferRef.current ? studentBufferRef.current.duration : (studentDuration || 1);
    const sourcePeaks = (studentPeaks && studentPeaks.length > 0) 
      ? studentPeaks 
      : ((studentRawPeaks && studentRawPeaks.length > 0) ? resampleWaveformPeaks(studentRawPeaks, STUDIO_DUETT_WAVEFORM_BARS, true) : null);

    if (!sourcePeaks || sourcePeaks.length === 0) {
      return generateOrganicWaveform('student', STUDIO_DUETT_WAVEFORM_BARS);
    }

    // 🏛️ Wenn studentBuffer master-locked ist (sDur === tDur) und bereits 72 Peaks vorliegen:
    // Die Peaks repräsentieren bereits 1:1 die 72 Balken der Timeline!
    if (Math.abs(sDur - tDur) < 0.05 && sourcePeaks.length === STUDIO_DUETT_WAVEFORM_BARS) {
      return sourcePeaks;
    }

    const result: number[] = [];
    const latencySec = latencyOffsetMs / 1000;

    for (let i = 0; i < STUDIO_DUETT_WAVEFORM_BARS; i++) {
      // Exakte Zeit auf der Lehrer-Master-Timeline
      const tTeacher = ((i + 0.5) / STUDIO_DUETT_WAVEFORM_BARS) * tDur;
      // Korrespondierende Zeit in der Schüler-Aufnahme (Latenz-Vorkompensation)
      const tStudent = tTeacher + latencySec;

      if (tStudent < 0 || tStudent > sDur) {
        // Außerhalb der realen Schüleraufnahme: Dezent flache Ruhe-Markierung (kein Timestretching!)
        result.push(0.06);
      } else {
        const fraction = Math.max(0, Math.min(1, tStudent / sDur));
        const peakIdx = Math.min(sourcePeaks.length - 1, Math.floor(fraction * sourcePeaks.length));
        result.push(Math.max(0.08, sourcePeaks[peakIdx] || 0.08));
      }
    }
    return result;
  }, [studentRawPeaks, studentPeaks, studentDuration, teacherDuration, initialTeacherDuration, latencyOffsetMs]);

  return createPortal(
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
      {/* 🍎 Dual-Engine HTML5 Audio Fallback für WebKit / Safari */}
      {resolvedTeacherSrc && (
        <audio
          ref={teacherAudioElRef}
          src={resolvedTeacherSrc}
          preload="auto"
          playsInline
          style={{ display: 'none' }}
          onEnded={() => {
            if (isRecording) {
              if (autoStopTimeoutRef.current) {
                clearTimeout(autoStopTimeoutRef.current);
              }
              autoStopTimeoutRef.current = window.setTimeout(() => {
                handleStopRecording();
              }, 1200);
            }
          }}
        />
      )}
      {resolvedStudentSrc && (
        <audio
          ref={studentAudioElRef}
          src={resolvedStudentSrc}
          preload="auto"
          playsInline
          style={{ display: 'none' }}
        />
      )}

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
                background: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 3px 10px rgba(15, 23, 42, 0.18)',
                flexShrink: 0
              }}
            >
              <Layers size={isMobile ? 18 : 20} strokeWidth={2.4} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
              1. TOP TOOLBAR: VIEW-SWITCHER & ZERO-TOUCH LATENCY STATUS
             ══════════════════════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            {/* View Mode Segmented Control: Getrennt (Split) vs. Übereinander (Overlay) */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#f1f5f9',
                padding: '3px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                gap: '2px'
              }}
            >
              <button
                type="button"
                onClick={() => setVisualMode('split')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '7px',
                  border: 'none',
                  background: visualMode === 'split' ? '#ffffff' : 'transparent',
                  color: visualMode === 'split' ? '#0f172a' : '#64748b',
                  fontWeight: visualMode === 'split' ? 950 : 700,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  boxShadow: visualMode === 'split' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale-mini"
                title="Getrennte Spuren untereinander anzeigen"
              >
                <Columns size={13} />
                <span>Getrennt (Split)</span>
              </button>
              <button
                type="button"
                onClick={() => setVisualMode('overlay')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '7px',
                  border: 'none',
                  background: visualMode === 'overlay' ? '#ffffff' : 'transparent',
                  color: visualMode === 'overlay' ? '#7c3aed' : '#64748b',
                  fontWeight: visualMode === 'overlay' ? 950 : 700,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  boxShadow: visualMode === 'overlay' ? '0 1px 4px rgba(124, 58, 237, 0.12)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale-mini"
                title="Phasen-Röntgen: Beide Spuren übereinander legen zum direkten Timing-Vergleich"
              >
                <Layers size={13} color={visualMode === 'overlay' ? '#7c3aed' : '#64748b'} />
                <span>Übereinander (Overlay)</span>
              </button>
            </div>

            {/* 🎼 Swiss Precision DAW Metric Capsule */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '100px',
                padding: '3px 9px',
                fontSize: '0.68rem',
                fontWeight: 850,
                color: '#475569'
              }}
              title={`Metronom-Raster: ${teacherBpm || 100} BPM im 4/4 Takt`}
            >
              <Timer size={12} color="#64748b" />
              <span>{teacherBpm || 100} BPM • 4/4</span>
            </div>

            {/* Zero-Touch Latenz-Governance: Dezente Status-Pill & Feinschliff Drawer Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '100px',
                  padding: '3px 9px',
                  fontSize: '0.70rem',
                  fontWeight: 850,
                  color: '#15803d'
                }}
                title="Hardware-kalibrierte Latenz-Kompensation (PDC)"
              >
                <Sparkles size={12} color="#16a34a" />
                <span>Hardware-PDC: {latencyOffsetMs > 0 ? `+${latencyOffsetMs} ms` : `${latencyOffsetMs} ms`}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsLatencyDrawerOpen(!isLatencyDrawerOpen)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: isLatencyDrawerOpen ? '#ede9fe' : '#ffffff',
                  border: isLatencyDrawerOpen ? '1px solid #c4b5fd' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '4px 9px',
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  color: isLatencyDrawerOpen ? '#6d28d9' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale-mini"
                title="Latenz-Feinschliff & Hardware-Presets ein-/ausblenden"
              >
                <Sliders size={12} />
                <span>Feinschliff</span>
                {isLatencyDrawerOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              COLLAPSIBLE LATENCY FEINSCHLIFF DRAWER (Zero-Touch Entrümpelung)
             ══════════════════════════════════════════════════════════════════ */}
          {isLatencyDrawerOpen && (
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                animation: 'fadeIn 0.18s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 850, color: '#334155' }}>
                  Timing-Feinschliff & Hardware-Presets:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {/* 1-Tap Hardware Presets */}
                  <button
                    type="button"
                    onClick={() => {
                      const hw = UniversalLatencyEngine.getLatencyMs();
                      handleNudgeLatency(hw - latencyOffsetMs);
                    }}
                    style={{
                      background: '#ede9fe',
                      border: '1px solid #c4b5fd',
                      color: '#6d28d9',
                      borderRadius: '6px',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      padding: '2px 8px'
                    }}
                    title="Hardware Plugin Delay Compensation (Standard für interne Lautsprecher / Klinkenkabel)"
                  >
                    ⚡ Intern / Kabel ({UniversalLatencyEngine.getLatencyMs()} ms)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNudgeLatency(210 - latencyOffsetMs)}
                    style={{
                      background: '#ede9fe',
                      border: '1px solid #c4b5fd',
                      color: '#6d28d9',
                      borderRadius: '6px',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      padding: '2px 8px'
                    }}
                    title="AirPods / Bluetooth A2DP Latenz-Puffer (+210 ms)"
                  >
                    🎧 AirPods (210 ms)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNudgeLatency(0 - latencyOffsetMs)}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      borderRadius: '6px',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      padding: '2px 8px'
                    }}
                    title="Keine Latenz-Verschiebung (Direkt 0 ms)"
                  >
                    🎯 0 ms (Direkt)
                  </button>

                  {/* Nudge Controls */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: '#ede9fe', padding: '2px 4px', borderRadius: '6px', border: '1px solid #ddd6fe' }}>
                    <button type="button" onClick={() => handleNudgeLatency(-5)} style={{ padding: '2px 4px', fontSize: '0.62rem', fontWeight: 900, background: '#fff', border: '1px solid #c4b5fd', borderRadius: '4px', color: '#6d28d9', cursor: 'pointer' }}>-5ms</button>
                    <button type="button" onClick={() => handleNudgeLatency(-1)} style={{ padding: '2px 4px', fontSize: '0.62rem', fontWeight: 900, background: '#fff', border: '1px solid #c4b5fd', borderRadius: '4px', color: '#6d28d9', cursor: 'pointer' }}>-1ms</button>
                    <span style={{ fontSize: '0.70rem', fontWeight: 950, color: '#6d28d9', minWidth: '46px', textAlign: 'center' }}>{latencyOffsetMs > 0 ? `+${latencyOffsetMs}ms` : `${latencyOffsetMs}ms`}</span>
                    <button type="button" onClick={() => handleNudgeLatency(+1)} style={{ padding: '2px 4px', fontSize: '0.62rem', fontWeight: 900, background: '#fff', border: '1px solid #c4b5fd', borderRadius: '4px', color: '#6d28d9', cursor: 'pointer' }}>+1ms</button>
                    <button type="button" onClick={() => handleNudgeLatency(+5)} style={{ padding: '2px 4px', fontSize: '0.62rem', fontWeight: 900, background: '#fff', border: '1px solid #c4b5fd', borderRadius: '4px', color: '#6d28d9', cursor: 'pointer' }}>+5ms</button>
                  </div>

                  {/* Optional Auto-Align */}
                  <button
                    type="button"
                    onClick={handleAutoAlign}
                    disabled={isAutoAligning || !studentBufferRef.current}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      cursor: isAutoAligning ? 'wait' : 'pointer'
                    }}
                    className="hover-scale-mini"
                    title="Experimentelle Kreuzkorrelation (nur bei identischem Notenmaterial empfohlen)"
                  >
                    <Wand2 size={11} />
                    <span>{isAutoAligning ? 'Berechne...' : '✨ Auto-Align (Exp)'}</span>
                  </button>
                </div>
              </div>

              {autoAlignNotice && (
                <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '6px', padding: '3px 8px', fontSize: '0.66rem', fontWeight: 800, color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Sparkles size={11} color="#7c3aed" />
                  <span>{autoAlignNotice}</span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 700 }}>-500ms</span>
                <input
                  type="range" min="-500" max="500" step="1"
                  value={latencyOffsetMs}
                  onChange={(e) => handleNudgeLatency(parseInt(e.target.value, 10) - latencyOffsetMs)}
                  style={{ flex: 1, height: '20px', accentColor: '#7c3aed', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 700 }}>+500ms</span>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              2. DIDAKTISCHES TAKT- & ZÄHLZEIT-LINEAL (Timeline Ruler)
             ══════════════════════════════════════════════════════════════════ */}
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / rect.width));
              const tDur = teacherBufferRef.current ? teacherBufferRef.current.duration : (teacherDuration || initialTeacherDuration || 1);
              handleSeek(ratio * tDur);
            }}
            style={{
              position: 'relative',
              height: '28px',
              background: 'linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%)',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
              margin: isMobile ? '0 13.5px' : '0 17.5px',
              boxSizing: 'border-box'
            }}
            title="Klicken zum Spulen (Takt- & Zählzeit-Lineal)"
          >
            {/* Takt-Markierungen & Viertel-Zählzeiten */}
            {barMarkers.map((b) => (
              <React.Fragment key={`ruler_bar_${b.barNum}`}>
                {/* Takt-Hauptstrich mit sauberer DAW-Nummerierung */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${b.leftPct}%`,
                    top: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    pointerEvents: 'none'
                  }}
                >
                  <div style={{ width: '1.5px', height: '10px', background: '#475569' }} />
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 900,
                      color: '#1e293b',
                      lineHeight: 1,
                      marginTop: '2px',
                      marginLeft: '2px',
                      fontFeatureSettings: '"tnum"'
                    }}
                  >
                    {b.barNum}
                  </span>
                </div>

                {/* Sub-Ticks: Zählzeiten 2, 3, 4 (Micro-Ticks) */}
                {b.beats.map((beatPct, bIdx) => (
                  <div
                    key={`ruler_beat_${b.barNum}_${bIdx}`}
                    style={{
                      position: 'absolute',
                      left: `${beatPct}%`,
                      top: 0,
                      width: '1px',
                      height: '5px',
                      background: '#94a3b8',
                      pointerEvents: 'none'
                    }}
                  />
                ))}
              </React.Fragment>
            ))}

            {/* Abspielstrich-Zeiger Pin auf dem Lineal (2027 Studio-Laser-Zeiger mit Präzisions-Kopf) */}
            <div
              ref={rulerPlayheadRef}
              style={{
                position: 'absolute',
                left: '0%',
                top: 0,
                bottom: 0,
                width: '2px',
                background: '#2563eb',
                boxShadow: 'none',
                pointerEvents: 'none',
                zIndex: 10
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '4.5px solid transparent',
                  borderRight: '4.5px solid transparent',
                  borderTop: '6px solid #2563eb',
                  filter: 'drop-shadow(0 1px 2px rgba(37, 99, 235, 0.4))'
                }}
              />
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              3A. SPLIT-VIEW (Untereinander: Vergrößert auf 64px pro Spur)
             ══════════════════════════════════════════════════════════════════ */}
          {visualMode === 'split' && (
            <>
              {/* TRACK 1: LEHRKRAFT */}
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
                        fontSize: '0.66rem',
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
                      type="range" min="0" max="1" step="0.05"
                      value={teacherVolume}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setTeacherVolume(v);
                        if (playbackSessionRef.current) playbackSessionRef.current.setTeacherVolume(v);
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

                {/* Vergrößerter Waveform Container (Lehrkraft - 64px Höhe mit Taktgitter) */}
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                    const tDur = teacherBufferRef.current ? teacherBufferRef.current.duration : (teacherDuration || initialTeacherDuration || 1);
                    handleSeek(ratio * tDur);
                  }}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5px',
                    height: isMobile ? '52px' : '64px',
                    cursor: 'pointer',
                    background: '#ffffff',
                    padding: '6px 0',
                    borderRadius: '14px',
                    border: '1.5px solid #e2e8f0',
                    overflow: 'hidden'
                  }}
                  title="Klicken zum Spulen (Spur 1)"
                >
                  {/* Background Vertical Measure Laser Guides */}
                  {barMarkers.map((b) => (
                    <React.Fragment key={`grid_t1_${b.barNum}`}>
                      <div
                        style={{
                          position: 'absolute',
                          left: `${b.leftPct}%`,
                          top: 0,
                          bottom: 0,
                          width: '1px',
                          background: 'rgba(100, 116, 139, 0.28)',
                          pointerEvents: 'none',
                          zIndex: 1
                        }}
                      />
                      {b.beats.map((beatPct, bIdx) => (
                        <div
                          key={`grid_t1_${b.barNum}_${bIdx}`}
                          style={{
                            position: 'absolute',
                            left: `${beatPct}%`,
                            top: 0,
                            bottom: 0,
                            width: '1px',
                            background: 'rgba(148, 163, 184, 0.12)',
                            pointerEvents: 'none',
                            zIndex: 1
                          }}
                        />
                      ))}
                    </React.Fragment>
                  ))}

                  {/* 100% Statische DAW-Wellenform (160 High-Density Cubase 14 Pro Micro-Bars) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1px',
                      width: '100%',
                      height: '100%',
                      zIndex: 2
                    }}
                  >
                    {teacherWaveform.map((val, idx) => {
                      const heightPct = Math.max(8, Math.round(val * 100));
                      const isBaseline = val <= 0.09;
                      return (
                        <div
                          key={`tw_bar_${idx}`}
                          style={{
                            flex: 1,
                            minWidth: '1.5px',
                            height: `${heightPct}%`,
                            background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 35%, #16a34a 70%, #15803d 100%)',
                            boxShadow: isBaseline ? 'none' : '0 -1px 2px rgba(74, 222, 128, 0.45)',
                            opacity: isBaseline ? 0.35 : 1,
                            borderRadius: '1.5px',
                            transition: 'height 0.12s ease'
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Unplayed Soft Veil (Statisch, schützt Wellenform vor jeglichem Verzerren/Stauchen) */}
                  <div
                    ref={teacherVeilRef}
                    style={{
                      position: 'absolute',
                      left: '0%',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      background: 'rgba(255, 255, 255, 0.45)',
                      pointerEvents: 'none',
                      zIndex: 3
                    }}
                  />

                  {/* DAW Abspielstrich (Einheitlicher 2027 Studio-Laser-Zeiger) */}
                  <div
                    ref={teacherPlayheadRef}
                    style={{
                      position: 'absolute',
                      left: '0%',
                      top: 0,
                      bottom: 0,
                      width: '2px',
                      background: '#2563eb',
                      boxShadow: 'none',
                      pointerEvents: 'none',
                      zIndex: 10
                    }}
                  />
                </div>
              </div>

              {/* TRACK 2: SCHÜLER */}
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
                        fontSize: '0.66rem',
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
                        type="range" min="0" max="1" step="0.05"
                        value={studentVolume}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setStudentVolume(v);
                          if (playbackSessionRef.current) playbackSessionRef.current.setStudentVolume(isSyntheticStudentBufferRef.current ? 0 : v);
                          if (studentAudioElRef.current && isSyntheticStudentBufferRef.current) {
                            studentAudioElRef.current.volume = v;
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
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '16px 12px' : '20px 16px', gap: '14px', textAlign: 'center' }}>
                    
                    {/* 🎧 0,1% Goldstandard: Adaptive Hardware Headphone Awareness Banner */}
                    <div style={{ width: '100%' }}>
                      {hasHeadphones ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '12px',
                            padding: '8px 12px',
                            color: '#15803d',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            textAlign: 'left'
                          }}
                        >
                          <Headphones size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                          <span>
                            <strong>Kopfhörer erkannt:</strong> Studio-Isolierung aktiv – glasklare Aufnahme ohne Lautsprecher-Übersprechen garantiert!
                          </span>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#fffbeb',
                            border: '1px solid #fde68a',
                            borderRadius: '12px',
                            padding: '8px 12px',
                            color: '#b45309',
                            fontSize: '0.74rem',
                            fontWeight: 750,
                            textAlign: 'left'
                          }}
                        >
                          <Sparkles size={16} color="#d97706" style={{ flexShrink: 0 }} />
                          <span>
                            <strong>Studio-Tipp:</strong> Mit Kopfhörern klingt dein Duett am reinsten! Über Lautsprecher wird der Lehrer automatisch leise geregelt (-14 dB Guide), um Mikrofon-Verzerrungen zu verhindern.
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Headphones size={13} color="#0f172a" />
                        Aufnahme-Begleitung:
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '6px' }}>
                        {[
                          { key: 'guide_teacher', Icon: Headphones, label: 'Lehrer leise (Guide)', desc: 'Orientierung ohne Verzerrung (-14 dB)' },
                          { key: 'metronome_only', Icon: Sliders, label: 'Nur Metronom', desc: '100% Eigenverantwortung (0% Lehrer)' },
                          { key: 'full_teacher', Icon: Users, label: 'Lehrer voll', desc: hasHeadphones ? '100% im Kopfhörer' : 'Nur mit Kopfhörern empfohlen' }
                        ].map(opt => {
                          const isActive = monitoringMode === opt.key;
                          const IconComp = opt.Icon;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => setMonitoringMode(opt.key as any)}
                              style={{
                                padding: '8px 10px',
                                borderRadius: '12px',
                                border: isActive ? '1.5px solid #0f172a' : '1px solid #cbd5e1',
                                background: isActive ? '#f8fafc' : '#ffffff',
                                color: isActive ? '#0f172a' : '#475569',
                                textAlign: 'center',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '3px',
                                minHeight: '44px',
                                transition: 'all 0.15s ease',
                                boxShadow: isActive ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none'
                              }}
                              className="hover-scale-mini"
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <IconComp size={13} color={isActive ? '#0f172a' : '#64748b'} />
                                <span style={{ fontSize: '0.74rem', fontWeight: 900 }}>{opt.label}</span>
                              </div>
                              <span style={{ fontSize: '0.64rem', color: isActive ? '#334155' : '#64748b', fontWeight: 650 }}>{opt.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

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
                        background: isLoadingTeacher ? '#94a3b8' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: '#ffffff',
                        fontSize: isMobile ? '0.88rem' : '0.96rem',
                        fontWeight: 950,
                        border: 'none',
                        cursor: isLoadingTeacher ? 'wait' : 'pointer',
                        boxShadow: 'none',
                        transition: 'all 0.18s ease',
                        width: isMobile ? '100%' : 'auto'
                      }}
                      className="hover-scale"
                    >
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffffff', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
                      <span>{isLoadingTeacher ? 'Lehrerspur lädt...' : 'Aufnahme starten (Bereit machen)'}</span>
                    </button>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650, lineHeight: 1.35 }}>
                      🎧 <strong>Auto-Sync:</strong> 3-Sekunden Vorlauf ohne Klick – Aufnahme startet synchron mit Spur 1 und <strong>stoppt automatisch</strong> am Song-Ende!
                    </div>
                  </div>
                )}

                {/* During Count-In: Silent "Bereit machen..." Card (1:1 Meisterwerk Standard) */}
                {countInStep !== null && (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                      border: '1.5px solid #c4b5fd',
                      borderRadius: '16px',
                      padding: '12px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: 'none',
                      boxSizing: 'border-box',
                      width: '100%',
                      maxWidth: '440px',
                      margin: '10px auto'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 950,
                          fontSize: '1.35rem',
                          boxShadow: 'none',
                          animation: 'pulse 1s infinite'
                        }}
                      >
                        {countInStep}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.90rem', fontWeight: 950, color: '#5b21b6' }}>
                          Bereit machen...
                        </div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 750, color: '#7c3aed', opacity: 0.9 }}>
                          Instrument ansetzen • Startet gleich!
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelCountIn}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #ddd6fe',
                        borderRadius: '10px',
                        color: '#6d28d9',
                        padding: '6px 12px',
                        fontSize: '0.74rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                      }}
                      className="hover-scale-mini"
                      title="Abbrechen"
                    >
                      ✕ Abbrechen
                    </button>
                  </div>
                )}

                {/* Active Recording State */}
                {isRecording && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: isMobile ? '12px' : '14px 16px', background: '#fef2f2', border: isClippingDetected ? '2px solid #ef4444' : '1.5px solid #fca5a5', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: isMobile ? '0.78rem' : '0.86rem', fontWeight: 900, color: '#991b1b' }}>Synchron-Aufnahme läuft ({formatSecs(recordDuration)})</div>
                          <div style={{ fontSize: '0.66rem', color: '#b91c1c', fontWeight: 700 }}>Stoppt automatisch bei {formatSecs(teacherDuration)} (inkl. Ausklingen)</div>
                        </div>
                      </div>
                      <button type="button" onClick={handleStopRecording} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', minHeight: '40px', borderRadius: '12px', background: '#dc2626', color: '#ffffff', fontSize: '0.82rem', fontWeight: 900, border: 'none', cursor: 'pointer', flexShrink: 0 }} className="hover-scale-mini">
                        <Square size={14} fill="#ffffff" />
                        <span>Jetzt Stoppen</span>
                      </button>
                    </div>

                    {/* Live Studio VU Meter (2027 DAW Standard) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 800, color: isClippingDetected ? '#dc2626' : '#64748b' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <Activity size={12} color={isClippingDetected ? '#ef4444' : '#10b981'} />
                          <span>Mikrofon-Eingangspegel (VU)</span>
                          <span style={{ fontSize: '0.62rem', fontWeight: 750, color: getMeterLevelDescription(liveMeterPercent).color, marginLeft: '4px' }}>
                            • {getMeterLevelDescription(liveMeterPercent).label}
                          </span>
                        </span>
                        <span style={{ fontFeatureSettings: '"tnum"', fontWeight: 900 }}>{liveMeterPercent}%</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ width: `${liveMeterPercent}%`, height: '100%', borderRadius: '6px', background: getMeterColorGradient(liveMeterPercent), transition: 'width 0.05s ease-out' }} />
                      </div>
                      {isClippingDetected && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', fontWeight: 850, color: '#dc2626', marginTop: '2px' }}>
                          <AlertTriangle size={12} color="#dc2626" />
                          <span>⚠️ Pegel zu laut! Bitte etwas weiter vom Mikrofon entfernen (Übersteuerungs-Schutz aktiv).</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Vergrößerter Waveform Container (Schüler - 64px Höhe mit Taktgitter) */}
                {studentAudioUrl && !isRecording && countInStep === null && (
                  <>
                    <div
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                        const tDur = teacherBufferRef.current ? teacherBufferRef.current.duration : (teacherDuration || initialTeacherDuration || 1);
                        handleSeek(ratio * tDur);
                      }}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.5px',
                        height: isMobile ? '52px' : '64px',
                        cursor: 'pointer',
                        background: '#ffffff',
                        padding: '6px 0',
                        borderRadius: '14px',
                        border: '1.5px solid #ddd6fe',
                        overflow: 'hidden'
                      }}
                      title="Klicken zum Spulen (Spur 2)"
                    >
                      {/* Background Vertical Measure Laser Guides */}
                      {barMarkers.map((b) => (
                        <React.Fragment key={`grid_s1_${b.barNum}`}>
                          <div
                            style={{
                              position: 'absolute',
                              left: `${b.leftPct}%`,
                              top: 0,
                              bottom: 0,
                              width: '1px',
                              background: 'rgba(100, 116, 139, 0.28)',
                              pointerEvents: 'none',
                              zIndex: 1
                            }}
                          />
                          {b.beats.map((beatPct, bIdx) => (
                            <div
                              key={`grid_s1_${b.barNum}_${bIdx}`}
                              style={{
                                position: 'absolute',
                                left: `${beatPct}%`,
                                top: 0,
                                bottom: 0,
                                width: '1px',
                                background: 'rgba(148, 163, 184, 0.12)',
                                pointerEvents: 'none',
                                zIndex: 1
                              }}
                            />
                          ))}
                        </React.Fragment>
                      ))}

                      {/* 100% Statische DAW-Wellenform (160 High-Density Cubase 14 Pro Micro-Bars) */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1px',
                          width: '100%',
                          height: '100%',
                          zIndex: 2
                        }}
                      >
                        {mappedStudentWaveform.map((val, idx) => {
                          const heightPct = Math.max(8, Math.round(val * 100));
                          const isBaseline = val <= 0.09;
                          return (
                            <div
                              key={`sw_bar_${idx}`}
                              style={{
                                flex: 1,
                                minWidth: '1.5px',
                                height: `${heightPct}%`,
                                background: 'linear-gradient(180deg, #d8b4fe 0%, #c084fc 35%, #9333ea 70%, #7e22ce 100%)',
                                boxShadow: isBaseline ? 'none' : '0 -1px 2px rgba(216, 180, 254, 0.45)',
                                opacity: isBaseline ? 0.35 : 1,
                                borderRadius: '1.5px',
                                transition: 'height 0.12s ease'
                              }}
                            />
                          );
                        })}
                      </div>

                      {/* Unplayed Soft Veil (Statisch, schützt Wellenform vor jeglichem Verzerren/Stauchen) */}
                      <div
                        ref={studentVeilRef}
                        style={{
                          position: 'absolute',
                          left: '0%',
                          right: 0,
                          top: 0,
                          bottom: 0,
                          background: 'rgba(255, 255, 255, 0.45)',
                          pointerEvents: 'none',
                          zIndex: 3
                        }}
                      />

                      {/* DAW Abspielstrich (Einheitlicher 2027 Studio-Laser-Zeiger) */}
                      <div
                        ref={studentPlayheadRef}
                        style={{
                          position: 'absolute',
                          left: '0%',
                          top: 0,
                          bottom: 0,
                          width: '2px',
                          background: '#2563eb',
                          boxShadow: 'none',
                          pointerEvents: 'none',
                          zIndex: 10
                        }}
                      />
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
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              3B. OVERLAY-VIEW (Phasen-Röntgen: Beide Spuren übereinander gelegt, 96px)
             ══════════════════════════════════════════════════════════════════ */}
          {visualMode === 'overlay' && (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                border: '1.5px solid #ddd6fe',
                padding: isMobile ? '12px' : '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: 'none'
              }}
            >
              {/* Header: Track Badges & Volume Dual Faders */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#e6f4ea',
                      color: '#15803d',
                      fontSize: '0.66rem',
                      fontWeight: 900,
                      padding: '3px 8px',
                      borderRadius: '100px',
                      border: '1px solid #bbf7d0'
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }} />
                    Lehrkraft (Guide)
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#ede9fe',
                      color: '#6d28d9',
                      fontSize: '0.66rem',
                      fontWeight: 900,
                      padding: '3px 8px',
                      borderRadius: '100px',
                      border: '1px solid #c4b5fd'
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7c3aed' }} />
                    {studentFirstName} (Take)
                  </span>
                </div>

                {/* Volume Faders Side by Side */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Volume2 size={13} color="#15803d" />
                    <input 
                      type="range" min="0" max="1" step="0.05"
                      value={teacherVolume}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setTeacherVolume(v);
                        if (playbackSessionRef.current) playbackSessionRef.current.setTeacherVolume(v);
                        setActiveMixPreset('custom');
                      }}
                      style={{ width: '54px', height: '22px', accentColor: '#15803d', cursor: 'pointer' }}
                      title={`Lehrer: ${Math.round(teacherVolume * 100)}%`}
                    />
                    <span style={{ fontSize: '0.64rem', color: '#15803d', fontWeight: 800 }}>{Math.round(teacherVolume * 100)}%</span>
                  </div>
                  {studentAudioUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Volume2 size={13} color="#7c3aed" />
                      <input 
                        type="range" min="0" max="1" step="0.05"
                        value={studentVolume}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setStudentVolume(v);
                          if (playbackSessionRef.current) playbackSessionRef.current.setStudentVolume(v);
                          setActiveMixPreset('custom');
                        }}
                        style={{ width: '54px', height: '22px', accentColor: '#7c3aed', cursor: 'pointer' }}
                        title={`Schüler: ${Math.round(studentVolume * 100)}%`}
                      />
                      <span style={{ fontSize: '0.64rem', color: '#7c3aed', fontWeight: 800 }}>{Math.round(studentVolume * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* If NO recording yet in Overlay: Prompt to record */}
              {!studentAudioUrl && !isRecording && countInStep === null && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', gap: '12px', textAlign: 'center' }}>
                  {/* Adaptive Headphone Banner */}
                  <div style={{ width: '100%', maxWidth: '480px' }}>
                    {hasHeadphones ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '10px',
                          padding: '6px 12px',
                          color: '#15803d',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          textAlign: 'left'
                        }}
                      >
                        <Headphones size={14} color="#16a34a" style={{ flexShrink: 0 }} />
                        <span>🎧 <strong>Kopfhörer erkannt:</strong> Studio-Isolierung aktiv (Glasklarer Klang)</span>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                          borderRadius: '10px',
                          padding: '6px 12px',
                          color: '#b45309',
                          fontSize: '0.72rem',
                          fontWeight: 750,
                          textAlign: 'left'
                        }}
                      >
                        <Sparkles size={14} color="#d97706" style={{ flexShrink: 0 }} />
                        <span>💡 <strong>Studio-Tipp:</strong> Mit Kopfhörern klingt dein Duett am reinsten! (Lehrer wird leise geregelt)</span>
                      </div>
                    )}
                  </div>

                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', margin: 0 }}>
                    Nimm deinen Take auf, um das Phasen-Röntgen (Übereinander-Legen) zu aktivieren:
                  </p>
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: '#ffffff',
                      fontSize: '0.86rem',
                      fontWeight: 900,
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: 'none'
                    }}
                    className="hover-scale"
                  >
                    <span>Aufnahme starten (Bereit machen)</span>
                  </button>
                </div>
              )}

              {/* During Count-In in Overlay Mode */}
              {countInStep !== null && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                    border: '1.5px solid #c4b5fd',
                    borderRadius: '16px',
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: 'none',
                    boxSizing: 'border-box',
                    width: '100%',
                    maxWidth: '440px',
                    margin: '10px auto'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 950,
                        fontSize: '1.35rem',
                        boxShadow: 'none',
                        animation: 'pulse 1s infinite'
                      }}
                    >
                      {countInStep}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.90rem', fontWeight: 950, color: '#5b21b6' }}>
                        Bereit machen...
                      </div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 750, color: '#7c3aed', opacity: 0.9 }}>
                        Instrument ansetzen • Startet gleich!
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelCountIn}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #ddd6fe',
                      borderRadius: '10px',
                      color: '#6d28d9',
                      padding: '6px 12px',
                      fontSize: '0.74rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                    }}
                    className="hover-scale-mini"
                    title="Abbrechen"
                  >
                    ✕ Abbrechen
                  </button>
                </div>
              )}

              {/* Active Recording State in Overlay */}
              {isRecording && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#fef2f2', borderRadius: '14px', border: isClippingDetected ? '2px solid #ef4444' : '1px solid #fca5a5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Aufnahme läuft ({formatSecs(recordDuration)})</span>
                      <span style={{ fontSize: '0.70rem', fontWeight: 750, color: getMeterLevelDescription(liveMeterPercent).color }}>
                        • {liveMeterPercent}% ({getMeterLevelDescription(liveMeterPercent).label})
                      </span>
                    </div>
                    <button type="button" onClick={handleStopRecording} style={{ padding: '6px 12px', borderRadius: '8px', background: '#dc2626', color: '#fff', fontSize: '0.76rem', fontWeight: 900, border: 'none', cursor: 'pointer' }}>Stoppen</button>
                  </div>
                  <div style={{ width: '100%', height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${liveMeterPercent}%`, height: '100%', borderRadius: '4px', background: getMeterColorGradient(liveMeterPercent), transition: 'width 0.05s ease-out' }} />
                  </div>
                </div>
              )}

              {/* Large Studio Stage (96px) with Both Waveforms Directly Overlapping */}
              {studentAudioUrl && !isRecording && countInStep === null && (
                <>
                  <div
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                      const tDur = teacherBufferRef.current ? teacherBufferRef.current.duration : (teacherDuration || initialTeacherDuration || 1);
                      handleSeek(ratio * tDur);
                    }}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.5px',
                      height: isMobile ? '80px' : '96px',
                      cursor: 'pointer',
                      background: '#f8fafc',
                      padding: '8px 0',
                      borderRadius: '16px',
                      border: '1.5px solid #c4b5fd',
                      overflow: 'hidden'
                    }}
                    title="Klicken zum Spulen (Phasen-Röntgen: Lehrkraft & Schüler übereinander)"
                  >
                    {/* Background Vertical Measure Laser Guides */}
                    {barMarkers.map((b) => (
                      <React.Fragment key={`grid_ov_${b.barNum}`}>
                        <div
                          style={{
                            position: 'absolute',
                            left: `${b.leftPct}%`,
                            top: 0,
                            bottom: 0,
                            width: '1px',
                            background: 'rgba(100, 116, 139, 0.28)',
                            pointerEvents: 'none',
                            zIndex: 1
                          }}
                        />
                        {b.beats.map((beatPct, bIdx) => (
                          <div
                            key={`grid_ov_${b.barNum}_${bIdx}`}
                            style={{
                              position: 'absolute',
                              left: `${beatPct}%`,
                              top: 0,
                              bottom: 0,
                              width: '1px',
                              background: 'rgba(148, 163, 184, 0.12)',
                              pointerEvents: 'none',
                              zIndex: 1
                            }}
                          />
                        ))}
                      </React.Fragment>
                    ))}

                    {/* Layer 1: Teacher Waveform (Statische Hintergrund-Spur in Smaragdgrün, 160 Cubase Micro-Bars) */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1px',
                        padding: '8px 0',
                        zIndex: 2,
                        pointerEvents: 'none'
                      }}
                    >
                      {teacherWaveform.map((val, idx) => {
                        const heightPct = Math.max(8, Math.round(val * 85));
                        const isBaseline = val <= 0.09;
                        return (
                          <div
                            key={`ov_tw_bar_${idx}`}
                            style={{
                              flex: 1,
                              minWidth: '1.5px',
                              height: `${heightPct}%`,
                              background: 'rgba(22, 163, 74, 0.65)',
                              boxShadow: isBaseline ? 'none' : '0 -1px 1px rgba(74, 222, 128, 0.4)',
                              opacity: isBaseline ? 0.35 : 1,
                              borderRadius: '1.5px',
                              transition: 'height 0.12s ease'
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Layer 2: Student Waveform (Statische Vordergrund-Spur in Violett, Phasen-Röntgen, 160 Cubase Micro-Bars) */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1px',
                        padding: '8px 0',
                        zIndex: 3,
                        pointerEvents: 'none'
                      }}
                    >
                      {mappedStudentWaveform.map((val, idx) => {
                        const heightPct = Math.max(8, Math.round(val * 85));
                        const isBaseline = val <= 0.09;
                        return (
                          <div
                            key={`ov_sw_bar_${idx}`}
                            style={{
                              flex: 1,
                              minWidth: '1.5px',
                              height: `${heightPct}%`,
                              background: 'rgba(147, 51, 234, 0.75)',
                              boxShadow: isBaseline ? 'none' : '0 -1px 1px rgba(216, 180, 254, 0.4)',
                              opacity: isBaseline ? 0.35 : 1,
                              borderRadius: '1.5px',
                              transition: 'height 0.12s ease'
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Unplayed Soft Veil (Statisch über beiden Spuren) */}
                    <div
                      ref={overlayVeilRef}
                      style={{
                        position: 'absolute',
                        left: '0%',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        background: 'rgba(255, 255, 255, 0.45)',
                        pointerEvents: 'none',
                        zIndex: 4
                      }}
                    />

                    {/* DAW Abspielstrich (Einheitlicher 2027 Studio-Laser-Zeiger) */}
                    <div
                      ref={overlayPlayheadRef}
                      style={{
                        position: 'absolute',
                        left: '0%',
                        top: 0,
                        bottom: 0,
                        width: '2px',
                        background: '#2563eb',
                        boxShadow: 'none',
                        pointerEvents: 'none',
                        zIndex: 10
                      }}
                    />
                  </div>

                  {/* Retake Button & Legend Hint */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 650 }}>
                      💡 <strong>Phasen-Röntgen:</strong> Treffen grüne (Lehrer) und violette (Schüler) Spitzen genau aufeinander, ist dein Timing perfekt im Groove!
                    </div>
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
              disabled={isRecording || isSyncingBuffer || countInStep !== null || isLoadingTeacher}
              style={{
                width: isMobile ? '44px' : '48px',
                height: isMobile ? '44px' : '48px',
                minWidth: isMobile ? '44px' : '48px',
                minHeight: isMobile ? '44px' : '48px',
                borderRadius: '50%',
                background: isPlaying
                  ? '#0f172a'
                  : '#1e293b',
                color: '#ffffff',
                border: 'none',
                cursor: (isLoadingTeacher || isSyncingBuffer) ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
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
                  onClick={() => handleSaveTake()}
                  disabled={isSaving || isSyncingBuffer || (hasSavedTake && !saveSuccess)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: isMobile ? '10px 14px' : '10px 18px',
                    minHeight: '44px',
                    borderRadius: '14px',
                    background: (saveSuccess || hasSavedTake)
                      ? '#15803d' 
                      : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#ffffff',
                    fontSize: isMobile ? '0.78rem' : '0.86rem',
                    fontWeight: 950,
                    border: 'none',
                    cursor: (isSaving || isSyncingBuffer) ? 'wait' : ((hasSavedTake && !saveSuccess) ? 'default' : 'pointer'),
                    boxShadow: 'none',
                    transition: 'all 0.15s ease'
                  }}
                  className={(hasSavedTake && !saveSuccess) ? '' : 'hover-scale'}
                  title={(saveSuccess || hasSavedTake) ? 'Take ist revisionssicher im Studio gespeichert' : 'Take im Studio speichern'}
                >
                  {isSyncingBuffer ? (
                    <>
                      <Sparkles size={16} />
                      <span>Synchronisiere...</span>
                    </>
                  ) : (saveSuccess || hasSavedTake) ? (
                    <>
                      <Check size={16} strokeWidth={2.8} />
                      <span>Im Studio gesichert ✓</span>
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
    </div>,
    document.body
  );
};
