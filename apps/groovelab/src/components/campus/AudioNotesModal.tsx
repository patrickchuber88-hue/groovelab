import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Play, 
  Square, 
  Repeat, 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Clock, 
  MessageSquareQuote,
  Lightbulb,
  Target,
  Star,
  FileText,
  User,
  GraduationCap,
  CheckCircle2,
  Circle,
  Share2,
  Bookmark,
  Mic,
  Loader2
} from 'lucide-react';
import { useVoiceToText } from '../../hooks/useVoiceToText';
import { getBlob } from '../../utils/blobStorage';
import { getOfflineAudioRecord } from '../../utils/offlineAudioVault';
import { getSecureAudioUrl } from '../../utils/audioStorageHelper';
import { safeDecodeAudioData } from '../../utils/audioMasteringEngine';
import { SharedAudioEngine } from '../../utils/sharedAudioEngine';
import { extractWaveformPeaks, resampleWaveformPeaks, detectAudioMimeType } from '../../utils/waveformHelper';
import { 
  AudioTimelineNote, 
  AudioNoteTag, 
  getAudioNotes, 
  addAudioNote, 
  updateAudioNote, 
  deleteAudioNote,
  toggleAudioNotePracticed,
  formatNotesForHomeworkSummary,
  fetchAudioNotesFromServer
} from '../../utils/audioNotesStorage';
import { StudioWaveformTimelineStage } from './audio/StudioWaveformTimelineStage';
import { StudioHeroTransportBar } from './audio/StudioHeroTransportBar';
import { StudioMarkerFeed } from './audio/StudioMarkerFeed';

const isPlayableUrl = (u?: string | null) => Boolean(u && (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('blob:') || u.startsWith('data:')));

export interface AudioNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioUrl: string;
  audioId?: string; // 🛡️ Kanonischer Bezeichner für revisionssichere Marker-Persistenz
  title?: string;
  initialDuration?: number;
  currentUserRole?: 'teacher' | 'student' | 'admin';
  currentUserName?: string;
  onExportToHomework?: (notes: AudioTimelineNote[]) => void;
  waveformPeaks?: number[];
  initialAudioBuffer?: AudioBuffer | null;
}

const SPEED_OPTIONS = [1.0, 0.85, 0.75, 0.5];

// 🏛️ Plattformweite Hilfsfunktion für 100% tonhöhenneutrale Tempoanpassung bei nativer Studioqualität
const applyPreservesPitch = (audio: HTMLAudioElement, speed: number) => {
  try {
    audio.playbackRate = speed;
    audio.preservesPitch = true;
    (audio as any).mozPreservesPitch = true;
    (audio as any).webkitPreservesPitch = true;
  } catch (err) {
    console.warn('[AudioNotesModal] preservesPitch setup failed:', err);
  }
};

// 🌈 Authentische Campus-Groovelab 7-Stufen Regenbogen-Palette für Audiomarker
export interface RainbowMarkerColor {
  bg: string;
  border: string;
  iconColor: string;
  lightBg: string;
  lightBorder: string;
  accentBar: string;
  label: string;
}

export const RAINBOW_MARKER_PALETTE: RainbowMarkerColor[] = [
  {
    bg: '#ea4335',
    border: '#dc2626',
    iconColor: '#ffffff',
    lightBg: 'rgba(234, 67, 53, 0.08)',
    lightBorder: 'rgba(234, 67, 53, 0.25)',
    accentBar: '#ea4335',
    label: 'Koralle'
  },
  {
    bg: '#f59e0b',
    border: '#d97706',
    iconColor: '#ffffff',
    lightBg: 'rgba(245, 158, 11, 0.08)',
    lightBorder: 'rgba(245, 158, 11, 0.25)',
    accentBar: '#f59e0b',
    label: 'Amber'
  },
  {
    bg: '#eab308',
    border: '#ca8a04',
    iconColor: '#0f172a', // Strikter WCAG 2.2 AA Kontrast Slate-900 auf GrooveLab-Gelb (> 12:1)
    lightBg: 'rgba(234, 179, 8, 0.12)',
    lightBorder: 'rgba(234, 179, 8, 0.35)',
    accentBar: '#eab308',
    label: 'GrooveLab-Gelb'
  },
  {
    bg: '#34a853',
    border: '#15803d',
    iconColor: '#ffffff',
    lightBg: 'rgba(52, 168, 83, 0.08)',
    lightBorder: 'rgba(52, 168, 83, 0.25)',
    accentBar: '#34a853',
    label: 'Campus-Grün'
  },
  {
    bg: '#0ea5e9',
    border: '#0284c7',
    iconColor: '#ffffff',
    lightBg: 'rgba(14, 165, 233, 0.08)',
    lightBorder: 'rgba(14, 165, 233, 0.25)',
    accentBar: '#0ea5e9',
    label: 'Sky-Cyan'
  },
  {
    bg: '#3b82f6',
    border: '#2563eb',
    iconColor: '#ffffff',
    lightBg: 'rgba(59, 130, 246, 0.08)',
    lightBorder: 'rgba(59, 130, 246, 0.25)',
    accentBar: '#3b82f6',
    label: 'Audio-Blau'
  },
  {
    bg: '#a855f7',
    border: '#7e22ce',
    iconColor: '#ffffff',
    lightBg: 'rgba(168, 85, 247, 0.08)',
    lightBorder: 'rgba(168, 85, 247, 0.25)',
    accentBar: '#a855f7',
    label: 'Meisterwerk-Lila'
  }
];

export const getMarkerColor = (index: number): RainbowMarkerColor => {
  return RAINBOW_MARKER_PALETTE[Math.abs(index) % RAINBOW_MARKER_PALETTE.length];
};

export const AudioNotesModal: React.FC<AudioNotesModalProps> = ({
  isOpen,
  onClose,
  audioUrl,
  audioId,
  title = 'Aufnahme',
  initialDuration = 0,
  currentUserRole = 'student',
  currentUserName,
  onExportToHomework,
  waveformPeaks,
  initialAudioBuffer
}) => {
  const isStudent = currentUserRole === 'student';
  const effectiveAudioKey = audioId || audioUrl;
  const [notes, setNotes] = useState<AudioTimelineNote[]>([]);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(initialAudioBuffer || null);
  const audioBufferRef = useRef<AudioBuffer | null>(initialAudioBuffer || null);
  const [isLoading, setIsLoading] = useState(!initialAudioBuffer);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [duration, setDuration] = useState<number>(
    initialAudioBuffer && initialAudioBuffer.duration && isFinite(initialAudioBuffer.duration)
      ? Number(initialAudioBuffer.duration.toFixed(2))
      : (initialDuration || 0)
  );
  const [currentPlayTime, setCurrentPlayTime] = useState(0);

  // 📱 Mobile Viewport Detection (Apple HIG / Material Standard <= 768px)
  const checkIsMobile = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  }, []);
  const [isMobile, setIsMobile] = useState<boolean>(checkIsMobile);
  useEffect(() => {
    const handleResize = () => setIsMobile(checkIsMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkIsMobile]);

  // 🎚️ Playback-Speed (0.5x bis 1.0x)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const playbackSpeedRef = useRef<number>(1.0);

  // 🔁 Spot-Loop pro Notiz (4-Sekunden-Übeschleife um Marker)
  const [spotLoopNoteId, setSpotLoopNoteId] = useState<string | null>(null);
  const spotLoopRangeRef = useRef<{ start: number; end: number } | null>(null);

  // 📝 Note creation & editing state
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteTime, setNewNoteTime] = useState<number>(0);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteTag, setNewNoteTag] = useState<AudioNoteTag>('tip');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingTag, setEditingTag] = useState<AudioNoteTag>('tip');
  const [editingTime, setEditingTime] = useState<number>(0);

  // 🔁 Stufenlose Loop-Längen (1s bis 15s) pro Notiz
  const [spotLoopDurations, setSpotLoopDurations] = useState<Record<string, number>>({});

  // 🎙️ Platform-weite Diktierfunktion (useVoiceToText mit intelligenter deutscher Zeichensetzung)
  const initialTextBeforeVoiceRef = useRef<string>('');
  const activeVoiceTargetRef = useRef<'new' | 'edit'>('new');
  const { isListening, startListening, stopListening, resetTranscript } = useVoiceToText({
    onResult: (liveFormattedText) => {
      const base = initialTextBeforeVoiceRef.current;
      const clean = liveFormattedText.trim();
      const combined = base ? `${base} ${clean}` : clean;
      if (activeVoiceTargetRef.current === 'new') {
        setNewNoteText(combined);
      } else {
        setEditingText(combined);
      }
    }
  });

  const handleToggleVoiceDictation = (target: 'new' | 'edit') => {
    if (isListening) {
      stopListening();
      initialTextBeforeVoiceRef.current = '';
    } else {
      activeVoiceTargetRef.current = target;
      initialTextBeforeVoiceRef.current = target === 'new' ? newNoteText.trim() : editingText.trim();
      resetTranscript();
      startListening();
    }
  };

  // 🔍 Waveform-Zoom (1x, 2x, 3x) & Scrolling
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3>(1);

  // 🤏 Drag & Drop für Pins auf der Wellenform
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [draggedTime, setDraggedTime] = useState<number | null>(null);

  // 📋 Toast-Status für Hausaufgabenheft-Export
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // 📱 Touch-Ergonomie (Double-Tap & Swipe)
  const lastTapTimestampRef = useRef<number>(0);
  const touchStartXRef = useRef<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlToRevokeRef = useRef<string | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);
  const waveformScrollRef = useRef<HTMLDivElement | null>(null);
  const isPlayingRef = useRef(false);
  const noteInputRef = useRef<HTMLTextAreaElement | null>(null);

  // ⚡ Web Audio Source Node & Hardware Timing References
  const webAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isWebAudioPlayingRef = useRef<boolean>(false);
  const playStartTimestampRef = useRef<number>(0);
  const playStartOffsetSecRef = useRef<number>(0);
  const arrayBufferRef = useRef<ArrayBuffer | null>(null);
  const loadingBufferPromiseRef = useRef<Promise<AudioBuffer | null> | null>(null);

  // ⚡ Helper für AudioContext mit sofortigem Resume
  const getOrCreateAudioContext = useCallback(async (): Promise<AudioContext | null> => {
    try {
      const ctx = SharedAudioEngine.getContext();
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }
      return ctx;
    } catch (err) {
      console.warn('[AudioNotesModal] Failed to get AudioContext:', err);
      return null;
    }
  }, []);

  // 🎧 Ausfallsicheres Laden & Decodieren des AudioBuffers (IndexedDB + Storage + URL)
  const loadAudioBuffer = useCallback(async (): Promise<AudioBuffer | null> => {
    if (audioBufferRef.current) return audioBufferRef.current;
    if (loadingBufferPromiseRef.current) return loadingBufferPromiseRef.current;

    const promise = (async (): Promise<AudioBuffer | null> => {
      try {
        const ctx = await getOrCreateAudioContext();
        if (!ctx) return null;

        let arrayBuffer: ArrayBuffer | null = arrayBufferRef.current;

        // 1. ArrayBuffer auflösen, falls noch nicht im Cache
        if (!arrayBuffer) {
          const candidateKeys: string[] = [];
          if (audioId) {
            candidateKeys.push(audioId);
            if (!audioId.startsWith('campus_audio_')) candidateKeys.push(`campus_audio_${audioId}_raw`);
            if (!audioId.startsWith('campus_blob_')) candidateKeys.push(`campus_blob_${audioId}`);
            candidateKeys.push(`campus_audio_${audioId}`);
          }
          if (audioUrl && audioUrl !== audioId) {
            candidateKeys.push(audioUrl);
            if (!audioUrl.startsWith('campus_audio_')) candidateKeys.push(`campus_audio_${audioUrl}_raw`);
            if (!audioUrl.startsWith('campus_blob_')) candidateKeys.push(`campus_blob_${audioUrl}`);
          }

          // 🌟 Deep scan localStorage für campus_junior_recordings_* und campus_audio_biography_*
          if (typeof window !== 'undefined' && window.localStorage) {
            try {
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && (k.startsWith('campus_junior_recordings_') || k.startsWith('campus_audio_biography_'))) {
                  const val = localStorage.getItem(k);
                  if (val && (
                    (audioId && val.includes(audioId)) ||
                    (audioUrl && val.includes(audioUrl)) ||
                    (title && val.includes(title))
                  )) {
                    const recs = JSON.parse(val);
                    if (Array.isArray(recs)) {
                      for (const r of recs) {
                        if (
                          (audioId && (r.id === audioId || r.blobKey === audioId || r.url === audioId)) ||
                          (audioUrl && (r.url === audioUrl || r.blobKey === audioUrl || r.id === audioUrl)) ||
                          (title && r.title === title)
                        ) {
                          if (r.blobKey && !candidateKeys.includes(r.blobKey)) candidateKeys.unshift(r.blobKey);
                          if (r.url && !candidateKeys.includes(r.url)) candidateKeys.push(r.url);
                          if (r.id && !candidateKeys.includes(r.id)) candidateKeys.push(r.id);
                        }
                      }
                    }
                  }
                }
              }
            } catch {}
          }

          // 2. Suche in IndexedDB (Harmonisierte Vault- & Blob-Prüfung)
          for (const candidateKey of candidateKeys) {
            if (!candidateKey) continue;
            try {
              let raw: any = await getBlob(candidateKey);
              if (!raw) {
                const cleanKey = candidateKey.replace(/^offline:\/\//, '');
                const offlineRec = await getOfflineAudioRecord(cleanKey);
                if (offlineRec && offlineRec.blob) {
                  raw = offlineRec.blob;
                }
              }
              if (raw instanceof Blob) {
                const detectedMime = detectAudioMimeType(raw, candidateKey);
                const typedBlob = raw.type === detectedMime ? raw : new Blob([raw], { type: detectedMime });
                arrayBuffer = await typedBlob.arrayBuffer();
                const playableSrc = URL.createObjectURL(typedBlob);
                if (blobUrlToRevokeRef.current) URL.revokeObjectURL(blobUrlToRevokeRef.current);
                blobUrlToRevokeRef.current = playableSrc;
                if (!audioRef.current) {
                  const audio = new Audio();
                  audio.preload = 'auto';
                  audio.src = playableSrc;
                  applyPreservesPitch(audio, playbackSpeedRef.current);
                  audioRef.current = audio;
                }
                break;
              } else if (raw instanceof ArrayBuffer) {
                arrayBuffer = raw;
                const blob = new Blob([raw], { type: 'audio/wav' });
                const playableSrc = URL.createObjectURL(blob);
                if (blobUrlToRevokeRef.current) URL.revokeObjectURL(blobUrlToRevokeRef.current);
                blobUrlToRevokeRef.current = playableSrc;
                if (!audioRef.current) {
                  const audio = new Audio();
                  audio.preload = 'auto';
                  audio.src = playableSrc;
                  applyPreservesPitch(audio, playbackSpeedRef.current);
                  audioRef.current = audio;
                }
                break;
              }
            } catch {}
          }

          // 3. Fallback auf Network / Supabase Storage URLs
          if (!arrayBuffer) {
            let targetUrl = audioUrl || audioId || '';
            if (targetUrl.startsWith('schools/') || targetUrl.includes('/storage/v1/object/')) {
              try {
                const sec = await getSecureAudioUrl(targetUrl, 'campus-assets', 300);
                if (sec) targetUrl = sec;
              } catch (secErr) {
                console.warn('[AudioNotesModal] Failed to resolve secure audio url:', secErr);
              }
            }

            if (targetUrl && isPlayableUrl(targetUrl)) {
              if (targetUrl.startsWith('data:') || targetUrl.startsWith('blob:')) {
                try {
                  const resp = await fetch(targetUrl);
                  arrayBuffer = await resp.arrayBuffer();
                } catch {}
              } else if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
                try {
                  const resp = await fetch(targetUrl, { mode: 'cors' });
                  if (resp.ok) {
                    arrayBuffer = await resp.arrayBuffer();
                  }
                } catch {}
              }

              if (targetUrl && !audioRef.current) {
                const audio = new Audio();
                audio.preload = 'auto';
                audio.src = targetUrl;
                applyPreservesPitch(audio, playbackSpeedRef.current);
                audioRef.current = audio;
              }
            }
          }

          if (arrayBuffer) {
            arrayBufferRef.current = arrayBuffer;
          }
        }

        // 4. Decodieren via safeDecodeAudioData
        if (arrayBuffer) {
          const decoded = await safeDecodeAudioData(ctx, arrayBuffer);
          if (decoded) {
            setAudioBuffer(decoded);
            audioBufferRef.current = decoded;
            if (decoded.duration && isFinite(decoded.duration)) {
              setDuration(Number(decoded.duration.toFixed(2)));
            }
            return decoded;
          }
        }
        return null;
      } catch (err) {
        console.warn('[AudioNotesModal] loadAudioBuffer error:', err);
        return null;
      } finally {
        loadingBufferPromiseRef.current = null;
      }
    })();

    loadingBufferPromiseRef.current = promise;
    return promise;
  }, [audioId, audioUrl, title, getOrCreateAudioContext]);

  // Sync initialAudioBuffer from props if provided
  useEffect(() => {
    if (initialAudioBuffer) {
      setAudioBuffer(initialAudioBuffer);
      audioBufferRef.current = initialAudioBuffer;
      if (initialAudioBuffer.duration && isFinite(initialAudioBuffer.duration)) {
        setDuration(Number(initialAudioBuffer.duration.toFixed(2)));
      }
      setIsLoading(false);
    }
  }, [initialAudioBuffer]);

  // Sync playbackSpeed Ref & native AudioElement
  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
    if (audioRef.current) {
      applyPreservesPitch(audioRef.current, playbackSpeed);
    }
  }, [playbackSpeed]);

  // 🔄 Load notes on open or when audioUrl/audioId changes
  useEffect(() => {
    if (!isOpen || !effectiveAudioKey) return;
    setNotes(getAudioNotes(effectiveAudioKey));

    // 🛡️ Asynchroner Revisionssicherer Server-Sync
    fetchAudioNotesFromServer(effectiveAudioKey)
      .then(serverNotes => {
        if (serverNotes && serverNotes.length > 0) {
          setNotes(serverNotes);
        }
      })
      .catch(err => console.warn('[AudioNotesModal] Server sync error:', err));

    const handleNotesChanged = (e: any) => {
      const changedKey = e?.detail?.audioUrlOrKey;
      if (!changedKey || changedKey === effectiveAudioKey || changedKey === audioUrl || changedKey === audioId) {
        setNotes(getAudioNotes(effectiveAudioKey));
      }
    };
    window.addEventListener('campus-audio-notes-changed', handleNotesChanged);
    return () => window.removeEventListener('campus-audio-notes-changed', handleNotesChanged);
  }, [isOpen, effectiveAudioKey, audioUrl, audioId]);

  // 🛡️ Hardware Safety Cleanup: Diktat sofort stoppen, wenn Modal geschlossen wird
  useEffect(() => {
    if (!isOpen && isListening) {
      stopListening();
    }
  }, [isOpen, isListening, stopListening]);

  // 🛑 Stop Web Audio playback node helper
  const stopWebAudio = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (webAudioSourceRef.current) {
      try {
        webAudioSourceRef.current.onended = null;
        webAudioSourceRef.current.stop();
        webAudioSourceRef.current.disconnect();
      } catch {}
      webAudioSourceRef.current = null;
    }
    isWebAudioPlayingRef.current = false;
  }, []);

  // 🛑 Stop playback helper (Web Audio + HTML5 Audio)
  const stopPlayback = useCallback(() => {
    isPlayingRef.current = false;
    stopWebAudio();
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {}
    }
    setIsPlaying(false);
    setSpotLoopNoteId(null);
    spotLoopRangeRef.current = null;
  }, [stopWebAudio]);

  // 🎧 Load audio buffer on modal open
  useEffect(() => {
    if (!isOpen || (!audioUrl && !audioId)) return;
    let active = true;

    if (!audioBufferRef.current && !initialAudioBuffer) {
      setIsLoading(true);
      loadAudioBuffer()
        .then(() => {})
        .catch(() => {})
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }

    return () => {
      active = false;
      stopPlayback();
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch {}
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (blobUrlToRevokeRef.current) {
        URL.revokeObjectURL(blobUrlToRevokeRef.current);
        blobUrlToRevokeRef.current = null;
      }
    };
  }, [isOpen, audioUrl, audioId, initialAudioBuffer, loadAudioBuffer, stopPlayback]);

  // 🌊 Studio-Grade Waveform Generator: 100% Synchron zur Aufnahme (RMS & True-Peak)
  const waveformBars = useMemo(() => {
    const barsCount = 80 * zoomLevel;
    let peaksSource: number[] = [];

    if (audioBuffer && audioBuffer.length > 0) {
      peaksSource = extractWaveformPeaks(audioBuffer, barsCount);
    } else if (waveformPeaks && waveformPeaks.length > 0) {
      peaksSource = resampleWaveformPeaks(waveformPeaks, barsCount);
    }

    const totalSvgWidth = 800 * zoomLevel;

    if (peaksSource.length > 0) {
      return peaksSource.map((peak, i) => {
        // peak ist normalisiert zwischen 0.06 und 1.00
        const height = Math.max(6, Math.round(peak * 66 + 6));
        const x = (i / peaksSource.length) * totalSvgWidth + 1.2;
        const width = Math.max(2, (totalSvgWidth / peaksSource.length) - 3.2);
        const y = (80 - height) / 2;
        return { x, y, width, height };
      });
    }

    // Falls weder audioBuffer noch waveformPeaks verfügbar sind: neutrale Studio-Baseline (keine irreführenden Fake-Wellen!)
    return Array.from({ length: barsCount }, (_, i) => {
      const height = 6;
      const x = (i / barsCount) * totalSvgWidth + 1.2;
      const width = Math.max(2, (totalSvgWidth / barsCount) - 3.2);
      const y = (80 - height) / 2;
      return { x, y, width, height };
    });
  }, [audioBuffer, waveformPeaks, zoomLevel]);

  // 🔄 Sync Playhead mit 60fps/120fps auf die native Audio-Hardware (HTML5 Fallback)
  const startPlayheadSync = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    const updatePlayhead = () => {
      const audio = audioRef.current;
      if (!audio || !isPlayingRef.current) return;

      const current = audio.currentTime;
      const bufDur = duration || audio.duration || 0;

      // Check Spot-Loop Range
      if (spotLoopRangeRef.current) {
        const { start, end } = spotLoopRangeRef.current;
        if (current >= end) {
          audio.currentTime = start;
          setCurrentPlayTime(start);
          animFrameRef.current = requestAnimationFrame(updatePlayhead);
          return;
        }
      } else if (audio.loop && bufDur > 0) {
        if (current >= bufDur) {
          audio.currentTime = 0;
          setCurrentPlayTime(0);
        }
      } else if (bufDur > 0 && current >= bufDur) {
        setCurrentPlayTime(bufDur);
        stopPlayback();
        return;
      }

      setCurrentPlayTime(current);
      animFrameRef.current = requestAnimationFrame(updatePlayhead);
    };
    animFrameRef.current = requestAnimationFrame(updatePlayhead);
  }, [duration, stopPlayback]);

  // ▶️ Play from specific timestamp (supports speed, looping and spot loop with 100% pitch-preservation)
  const playFrom = useCallback(async (startSec: number = 0, loop = isLooping, spotRange: { start: number; end: number } | null = null) => {
    window.dispatchEvent(new CustomEvent('campus-global-audio-play', { detail: { playerId: 'audio_notes_preview' } }));

    stopPlayback();

    const ctx = await getOrCreateAudioContext();
    let buf = audioBufferRef.current;
    if (!buf) {
      setIsLoading(true);
      try {
        buf = await loadAudioBuffer();
      } finally {
        setIsLoading(false);
      }
    }

    const currentSpeed = playbackSpeedRef.current;
    const bufDur = (buf && buf.duration > 0) ? buf.duration : (duration || (audioRef.current ? audioRef.current.duration : 0) || 0);

    const effectiveStart = spotRange ? spotRange.start : startSec;
    let playStart = effectiveStart;
    if (bufDur > 0 && playStart >= bufDur - 0.05) {
      playStart = 0;
    } else {
      playStart = Math.max(0, Math.min(bufDur > 0 ? bufDur - 0.05 : playStart, playStart));
    }

    spotLoopRangeRef.current = spotRange;

    // 1. ⚡ Primär: Shared Web Audio Engine Buffer Source (100% Safari/iOS stabil, 0ms Latenz, keine Autoplay/MIME-Hänger)
    if (buf && ctx) {
      try {
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }
        const source = ctx.createBufferSource();
        source.buffer = buf;
        source.playbackRate.value = currentSpeed;

        if (spotRange) {
          source.loop = true;
          source.loopStart = Math.max(0, spotRange.start);
          source.loopEnd = Math.min(bufDur, spotRange.end);
        } else {
          source.loop = loop;
          if (loop) {
            source.loopStart = 0;
            source.loopEnd = bufDur;
          }
        }

        source.connect(ctx.destination);
        source.start(0, playStart);
        webAudioSourceRef.current = source;
        isWebAudioPlayingRef.current = true;
        playStartTimestampRef.current = ctx.currentTime;
        playStartOffsetSecRef.current = playStart;

        isPlayingRef.current = true;
        setIsPlaying(true);
        setCurrentPlayTime(playStart);

        source.onended = () => {
          if (!loop && !spotLoopRangeRef.current && isWebAudioPlayingRef.current && webAudioSourceRef.current === source) {
            stopPlayback();
            setCurrentPlayTime(0);
          }
        };

        // 🔄 60fps/120fps Playhead Synchronisation auf native Audio-Clock
        const updatePlayhead = () => {
          if (!isWebAudioPlayingRef.current || !webAudioSourceRef.current || !buf) return;
          const curBufDur = buf.duration;
          const elapsed = (ctx.currentTime - playStartTimestampRef.current) * playbackSpeedRef.current;
          const current = playStartOffsetSecRef.current + elapsed;

          if (spotLoopRangeRef.current) {
            const { start, end } = spotLoopRangeRef.current;
            const rangeLen = Math.max(0.1, end - start);
            const loopTime = start + (((current - start) % rangeLen + rangeLen) % rangeLen);
            setCurrentPlayTime(loopTime);
          } else if (loop) {
            setCurrentPlayTime(curBufDur > 0 ? (current % curBufDur) : 0);
          } else {
            setCurrentPlayTime(Math.min(curBufDur, current));
            if (curBufDur > 0 && current >= curBufDur) {
              stopPlayback();
              setCurrentPlayTime(0);
              return;
            }
          }
          animFrameRef.current = requestAnimationFrame(updatePlayhead);
        };
        animFrameRef.current = requestAnimationFrame(updatePlayhead);
        return;
      } catch (webAudioErr) {
        console.warn('[AudioNotesModal] WebAudio playback fallback to HTML5:', webAudioErr);
      }
    }

    // 2. 🌐 Sekundär: HTML5 Audio Element Fallback
    const audio = audioRef.current;
    if (audio) {
      applyPreservesPitch(audio, currentSpeed);
      audio.loop = spotRange ? false : loop;
      audio.currentTime = playStart;
      setCurrentPlayTime(playStart);

      audio.play().then(() => {
        isPlayingRef.current = true;
        setIsPlaying(true);
        startPlayheadSync();
      }).catch((err) => {
        console.warn('[AudioNotesModal] HTML5 Audio play failed:', err);
      });
    }
  }, [duration, isLooping, getOrCreateAudioContext, loadAudioBuffer, startPlayheadSync, stopPlayback]);

  // 🎧 Globales Pausieren bei fremden Audio-Events
  useEffect(() => {
    const handleGlobalPlay = (e: any) => {
      if (e?.detail?.playerId !== 'audio_notes_preview') {
        stopPlayback();
      }
    };
    window.addEventListener('campus-global-audio-play', handleGlobalPlay);
    return () => window.removeEventListener('campus-global-audio-play', handleGlobalPlay);
  }, [stopPlayback]);

  // Umschalten der Wiedergabegeschwindigkeit im laufenden Betrieb (100% tonhöhenneutral ohne Pitch-Shift)
  const handleSetSpeed = (newSpeed: number) => {
    setPlaybackSpeed(newSpeed);
    playbackSpeedRef.current = newSpeed;
    if (webAudioSourceRef.current && isWebAudioPlayingRef.current) {
      try {
        webAudioSourceRef.current.playbackRate.setValueAtTime(newSpeed, SharedAudioEngine.getContext().currentTime);
      } catch {
        webAudioSourceRef.current.playbackRate.value = newSpeed;
      }
    }
    if (audioRef.current) {
      applyPreservesPitch(audioRef.current, newSpeed);
    }
  };

  const handleToggleLoop = () => {
    setIsLooping(prev => {
      const next = !prev;
      if (webAudioSourceRef.current && !spotLoopRangeRef.current) {
        webAudioSourceRef.current.loop = next;
        if (next && audioBufferRef.current) {
          webAudioSourceRef.current.loopStart = 0;
          webAudioSourceRef.current.loopEnd = audioBufferRef.current.duration;
        }
      }
      if (audioRef.current && !spotLoopRangeRef.current) {
        audioRef.current.loop = next;
      }
      return next;
    });
  };

  const togglePlay = () => {
    // 🛡️ Safari/iOS Gesture Unlock: AudioContext synchron im Klick-Callstack entsperren
    try {
      const ctx = SharedAudioEngine.getContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {}

    if (isPlaying) {
      stopPlayback();
    } else {
      playFrom(currentPlayTime).catch((err) => {
        console.warn('[AudioNotesModal] playFrom error:', err);
      });
    }
  };

  // 🎯 Pillar 1: Auto-Pause mit Pre-Roll beim Notiz-Setzen
  const handleOpenNoteAtTime = (sec: number) => {
    stopPlayback();
    const clamped = Math.max(0, Math.min(duration, Number(sec.toFixed(1))));
    setNewNoteTime(clamped);
    setNewNoteText('');
    setNewNoteTag('tip');
    setIsAddingNote(true);
    setEditingNoteId(null);
    setTimeout(() => {
      if (noteInputRef.current) noteInputRef.current.focus();
    }, 120);
  };

  // 🔁 Pillar 2: Hybrides Playback & Stufenloser Spot-Loop (1s bis 15s) pro Notiz
  const handlePlayNotePreRoll = (noteTime: number) => {
    const preRollTime = Math.max(0, noteTime - 1.5);
    setSpotLoopNoteId(null);
    playFrom(preRollTime);
  };

  const getNoteLoopDuration = useCallback((note: AudioTimelineNote): number => {
    return spotLoopDurations[note.id] || note.loopDuration || 4.0;
  }, [spotLoopDurations]);

  const handleToggleSpotLoop = (note: AudioTimelineNote, customDur?: number) => {
    if (spotLoopNoteId === note.id && customDur === undefined) {
      stopPlayback();
      setSpotLoopNoteId(null);
    } else {
      stopPlayback();
      const dur = customDur !== undefined ? customDur : getNoteLoopDuration(note);
      const leadIn = dur <= 1.5 ? 0.5 : 1.0;
      const start = Math.max(0, note.time - leadIn);
      const end = Math.min(duration, start + dur);
      setSpotLoopNoteId(note.id);
      playFrom(start, false, { start, end });
    }
  };

  const handleAdjustLoopDuration = (note: AudioTimelineNote, newDur: number) => {
    const rounded = Math.round(newDur * 10) / 10;
    setSpotLoopDurations(prev => ({ ...prev, [note.id]: rounded }));
    updateAudioNote(effectiveAudioKey, note.id, { loopDuration: rounded });
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, loopDuration: rounded } : n));

    if (spotLoopNoteId === note.id) {
      const leadIn = rounded <= 1.5 ? 0.5 : 1.0;
      const start = Math.max(0, note.time - leadIn);
      const end = Math.min(duration, start + rounded);
      spotLoopRangeRef.current = { start, end };
      if (webAudioSourceRef.current && isWebAudioPlayingRef.current) {
        try {
          webAudioSourceRef.current.loopStart = start;
          webAudioSourceRef.current.loopEnd = end;
        } catch {}
      }
      if (audioRef.current && audioRef.current.currentTime >= end) {
        audioRef.current.currentTime = start;
        setCurrentPlayTime(start);
      }
    }
  };

  // 💾 Save new note
  const handleSaveNewNote = () => {
    if (isListening) stopListening();
    if (!newNoteText.trim()) return;
    const updated = addAudioNote(effectiveAudioKey, {
      time: newNoteTime,
      text: newNoteText.trim(),
      tag: newNoteTag,
      authorRole: currentUserRole,
      authorName: currentUserName
    });
    setNotes(updated);
    setIsAddingNote(false);
    setNewNoteText('');
  };

  // ✏️ Save edited note
  const handleSaveEditedNote = (id: string) => {
    if (isListening) stopListening();
    if (!editingText.trim()) return;
    const updated = updateAudioNote(effectiveAudioKey, id, {
      time: editingTime,
      text: editingText.trim(),
      tag: editingTag
    });
    setNotes(updated);
    setEditingNoteId(null);
  };

  // 🗑️ Delete note
  const handleDeleteNote = (id: string) => {
    if (spotLoopNoteId === id) stopPlayback();
    const updated = deleteAudioNote(effectiveAudioKey, id);
    setNotes(updated);
  };

  // 🎯 Pillar 6: Didaktischer Schüler-Fortschritt ('Geübt'-Status)
  const handleTogglePracticed = (id: string) => {
    const updated = toggleAudioNotePracticed(effectiveAudioKey, id);
    setNotes(updated);
  };

  // 📋 Pillar 7: 1-Klick-Export in das Hausaufgabenheft
  const handleExportToHomework = () => {
    const summary = formatNotesForHomeworkSummary(title, notes);
    if (!summary) return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(summary).then(() => {
        setCopyToast('✓ Übeziele in die Zwischenablage kopiert!');
        setTimeout(() => setCopyToast(null), 3000);
      }).catch(() => {});
    }

    if (onExportToHomework) {
      onExportToHomework(notes);
    }

    window.dispatchEvent(
      new CustomEvent('campus-export-notes-to-homework', {
        detail: { title, notes, summary }
      })
    );
  };

  // 🤏 Pillar 5: Drag & Drop & Nudge auf der Wellenform
  const handlePinPointerDown = (e: React.PointerEvent, noteId: string, initialTime: number) => {
    e.stopPropagation();
    setDraggingNoteId(noteId);
    setDraggedTime(initialTime);

    const onPointerMove = (moveEv: PointerEvent) => {
      if (!waveformContainerRef.current || duration <= 0) return;
      const rect = waveformContainerRef.current.getBoundingClientRect();
      const clientX = moveEv.clientX;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const targetSec = Number((ratio * duration).toFixed(1));
      setDraggedTime(targetSec);
    };

    const onPointerUp = (upEv: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      if (!waveformContainerRef.current || duration <= 0) {
        setDraggingNoteId(null);
        setDraggedTime(null);
        return;
      }
      const rect = waveformContainerRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (upEv.clientX - rect.left) / rect.width));
      const finalSec = Number((ratio * duration).toFixed(1));

      const updated = updateAudioNote(effectiveAudioKey, noteId, { time: finalSec });
      setNotes(updated);
      setDraggingNoteId(null);
      setDraggedTime(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // ⌨️ Pillar 10: DAW-Grade Keyboard Power-Matrix
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputActive = (e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA';

      // Cmd+Enter / Ctrl+Enter saves currently active note input
      if (isInputActive && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isAddingNote) handleSaveNewNote();
        if (editingNoteId) handleSaveEditedNote(editingNoteId);
        return;
      }

      // Alt+D / Cmd+D toggles voice dictation even while focused in textarea
      if (isInputActive && (e.code === 'KeyD' || e.key === 'd' || e.key === 'D') && (e.altKey || e.metaKey)) {
        e.preventDefault();
        if (isAddingNote) handleToggleVoiceDictation('new');
        if (editingNoteId) handleToggleVoiceDictation('edit');
        return;
      }

      if (isInputActive) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyD' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        if (isAddingNote) {
          handleToggleVoiceDictation('new');
        } else if (editingNoteId) {
          handleToggleVoiceDictation('edit');
        } else {
          // 🎙️ Global Hands-Free Marker Drop + Diktat
          stopPlayback();
          const markTime = Math.max(0, Number(currentPlayTime.toFixed(2)));
          setNewNoteTime(markTime);
          setNewNoteText('');
          setNewNoteTag('general');
          setIsAddingNote(true);
          setTimeout(() => {
            if (noteInputRef.current) noteInputRef.current.focus();
            handleToggleVoiceDictation('new');
          }, 120);
        }
      } else if (e.code === 'KeyM' || (!isStudent && e.code === 'KeyN')) {
        e.preventDefault();
        handleOpenNoteAtTime(currentPlayTime);
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        handleToggleLoop();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (editingNoteId) {
          setEditingTime(t => Math.max(0, Number((t - 0.1).toFixed(1))));
        } else {
          const prevSec = Math.max(0, currentPlayTime - 1.5);
          playFrom(prevSec);
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (editingNoteId) {
          setEditingTime(t => Math.min(duration, Number((t + 0.1).toFixed(1))));
        } else {
          const nextSec = Math.min(duration, currentPlayTime + 1.5);
          playFrom(nextSec);
        }
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        const prevNote = [...notes].reverse().find(n => n.time < currentPlayTime - 0.2);
        if (prevNote) playFrom(Math.max(0, prevNote.time - 1.5));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        const nextNote = notes.find(n => n.time > currentPlayTime + 0.2);
        if (nextNote) playFrom(Math.max(0, nextNote.time - 1.5));
      } else if (e.key >= '1' && e.key <= '4') {
        const speedIndex = parseInt(e.key, 10) - 1;
        if (SPEED_OPTIONS[speedIndex] !== undefined) {
          handleSetSpeed(SPEED_OPTIONS[speedIndex]);
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        if (isListening) stopListening();
        if (isAddingNote) {
          setIsAddingNote(false);
        } else if (editingNoteId) {
          setEditingNoteId(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPlaying, currentPlayTime, isAddingNote, editingNoteId, duration, notes, onClose, editingTime, isListening, stopListening]);

  // 📱 Pillar 9: Touch- & Wellenform-Klick mit Double-Tap-Erkennung
  const handleWaveformPointerDown = (e: React.PointerEvent) => {
    if (!waveformContainerRef.current || !duration) return;
    const rect = waveformContainerRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSec = ratio * duration;

    const now = Date.now();
    if (now - lastTapTimestampRef.current < 300) {
      handleOpenNoteAtTime(targetSec);
      lastTapTimestampRef.current = 0;
      return;
    }
    lastTapTimestampRef.current = now;

    playFrom(targetSec);
  };

  // 📱 Swipe-Erkennung für horizontales Springen zwischen Notizen
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    if (Math.abs(deltaX) > 60) {
      if (deltaX > 0) {
        const prevNote = [...notes].reverse().find(n => n.time < currentPlayTime - 0.3);
        if (prevNote) playFrom(Math.max(0, prevNote.time - 1.5));
      } else {
        const nextNote = notes.find(n => n.time > currentPlayTime + 0.3);
        if (nextNote) playFrom(Math.max(0, nextNote.time - 1.5));
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = (secs % 60).toFixed(1);
    return `${m}:${Number(s) < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  const playPercent = duration > 0 ? (currentPlayTime / duration) * 100 : 0;
  const practicedCount = notes.filter(n => n.isPracticed).length;
  const progressPercent = notes.length > 0 ? Math.round((practicedCount / notes.length) * 100) : 0;


  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      aria-labelledby="audio-notes-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '8px' : '16px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: isMobile ? '22px' : '26px',
          maxWidth: '560px',
          width: '100%',
          maxHeight: isMobile ? '94dvh' : '92vh',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.32)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        {/* 🏷️ Header mit Titel & 1-Klick-Export */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isMobile ? '12px 16px 10px 16px' : '16px 20px 12px 20px',
            borderBottom: '1px solid #f1f5f9',
            background: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.18) 100%)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626',
                boxShadow: 'none'
              }}
            >
              <Bookmark size={20} strokeWidth={2.4} fill="#ef4444" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2
                  id="audio-notes-title"
                  style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    fontWeight: 900,
                    color: '#0f172a',
                    letterSpacing: '-0.02em'
                  }}
                >
                  {isStudent ? 'Übe-Begleiter & Marker' : 'Audio-Notizen & Timeline-Marker'}
                </h2>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 850,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    background: '#fef2f2',
                    color: '#dc2626',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ef4444' }} />
                  <span>Studio</span>
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>
                {title} • {formatTime(duration)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* 📋 Pillar 7: Export Button (Nur für Lehrkraft / Admin) */}
            {!isStudent && notes.length > 0 && (
              <button
                type="button"
                onClick={handleExportToHomework}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale-mini"
                title="Alle Übeziele formatiert in die Zwischenablage / ins Hausaufgabenheft kopieren"
              >
                <Share2 size={13} strokeWidth={2.4} />
                <span className="hidden-mobile">Übeplan Export</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#64748b',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale-mini"
              aria-label="Schließen"
            >
              <X size={16} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* 🔔 Toast-Banner bei Export */}
        {copyToast && (
          <div
            style={{
              background: '#0f172a',
              color: '#ffffff',
              padding: '8px 16px',
              fontSize: '0.75rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <Check size={14} strokeWidth={2.6} color="#4ade80" />
            <span>{copyToast}</span>
          </div>
        )}

        {/* 🎛️ Scrollable Body */}
        <div
          style={{
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            flex: 1
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* 🌊 1. High-Energy Kinetische Wellenform & Laser-Playhead (YouTube Style) */}
          <StudioWaveformTimelineStage
            duration={duration}
            currentPlayTime={currentPlayTime}
            isPlaying={isPlaying}
            notes={notes}
            waveformBars={waveformBars}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            spotLoopNoteId={spotLoopNoteId}
            spotLoopRange={spotLoopRangeRef.current}
            draggingNoteId={draggingNoteId}
            draggedTime={draggedTime}
            isStudent={isStudent}
            isMobile={isMobile}
            formatTime={formatTime}
            waveformScrollRef={waveformScrollRef}
            waveformContainerRef={waveformContainerRef}
            onWaveformPointerDown={handleWaveformPointerDown}
            onPinPointerDown={handlePinPointerDown}
            onPlayNotePreRoll={handlePlayNotePreRoll}
          />

          {/* 🎬 2. Hero Transport Dock & Segmented Speed Capsule (YouTube Player Bar) */}
          <StudioHeroTransportBar
            isLoading={isLoading}
            isPlaying={isPlaying}
            isLooping={isLooping}
            currentPlayTime={currentPlayTime}
            playbackSpeed={playbackSpeed}
            formatTime={formatTime}
            onTogglePlay={togglePlay}
            onToggleLoop={handleToggleLoop}
            onSetSpeed={handleSetSpeed}
            onOpenNoteAtTime={handleOpenNoteAtTime}
            isMobile={isMobile}
          />

          {/* 📱 3. Creator Moments & Marker Feed (Instagram Story Style) */}
          <StudioMarkerFeed
            notes={notes}
            duration={duration}
            isStudent={isStudent}
            isMobile={isMobile}
            formatTime={formatTime}
            isAddingNote={isAddingNote}
            setIsAddingNote={setIsAddingNote}
            newNoteTime={newNoteTime}
            newNoteText={newNoteText}
            setNewNoteText={setNewNoteText}
            newNoteTag={newNoteTag}
            setNewNoteTag={setNewNoteTag}
            onSaveNewNote={handleSaveNewNote}
            noteInputRef={noteInputRef}
            editingNoteId={editingNoteId}
            setEditingNoteId={setEditingNoteId}
            editingText={editingText}
            setEditingText={setEditingText}
            editingTag={editingTag}
            setEditingTag={setEditingTag}
            editingTime={editingTime}
            setEditingTime={setEditingTime}
            onSaveEditedNote={handleSaveEditedNote}
            onDeleteNote={handleDeleteNote}
            spotLoopNoteId={spotLoopNoteId}
            getNoteLoopDuration={getNoteLoopDuration}
            onToggleSpotLoop={handleToggleSpotLoop}
            onAdjustLoopDuration={handleAdjustLoopDuration}
            onPlayNotePreRoll={handlePlayNotePreRoll}
            onTogglePracticed={handleTogglePracticed}
            isListening={isListening}
            activeVoiceTarget={activeVoiceTargetRef.current}
            onToggleVoiceDictation={handleToggleVoiceDictation}
            onOpenNoteAtTime={handleOpenNoteAtTime}
            currentPlayTime={currentPlayTime}
          />
        </div>

        {/* 🚪 Footer mit DAW-Shortcuts (Desktop) bzw. Safe-Area Button (Mobile) */}
        <div
          style={{
            padding: isMobile ? '10px 14px calc(12px + env(safe-area-inset-bottom, 0px)) 14px' : '12px 20px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#ffffff',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          {!isMobile && (
            <div style={{ flex: 1, minWidth: '260px', fontSize: '0.70rem', color: '#64748b', fontWeight: 650, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ color: '#0f172a', fontWeight: 800 }}>{isStudent ? 'Tastenkürzel:' : 'DAW-Shortcuts:'}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <kbd style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 5px', borderRadius: '4px', color: '#0f172a', fontWeight: 800 }}>Space</kbd> Play
              </span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <kbd style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 5px', borderRadius: '4px', color: '#0f172a', fontWeight: 800 }}>M</kbd> Marker
              </span>
              {!isStudent && (
                <>
                  <span style={{ color: '#cbd5e1' }}>•</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <kbd style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 5px', borderRadius: '4px', color: '#0f172a', fontWeight: 800 }}>D</kbd> Diktat
                  </span>
                </>
              )}
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <kbd style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 5px', borderRadius: '4px', color: '#0f172a', fontWeight: 800 }}>← / →</kbd> 1,5s Scrub
              </span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <kbd style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 5px', borderRadius: '4px', color: '#0f172a', fontWeight: 800 }}>↑ / ↓</kbd> Jump
              </span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <kbd style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 5px', borderRadius: '4px', color: '#0f172a', fontWeight: 800 }}>L</kbd> Loop
              </span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <kbd style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 5px', borderRadius: '4px', color: '#0f172a', fontWeight: 800 }}>1-4</kbd> Tempo
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: isMobile ? '12px 20px' : '8px 20px',
              fontSize: isMobile ? '0.86rem' : '0.80rem',
              fontWeight: 850,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.18)',
              transition: 'all 0.15s ease',
              flexShrink: 0,
              width: isMobile ? '100%' : 'auto',
              minHeight: '44px',
              touchAction: 'manipulation'
            }}
            className="hover-scale-mini"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
