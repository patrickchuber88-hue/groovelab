import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Pause,
  Play,
  Repeat,
  Timer,
  Star,
  MoreHorizontal,
  Edit3,
  Scissors,
  Download,
  Trash2,
  Lock,
  Unlock,
  Share2,
  Check,
  Search,
  X,
  Layers,
  MessageSquareQuote,
  SlidersHorizontal,
  Loader2
} from 'lucide-react';
import { getBlob } from '../../../utils/blobStorage';
import { formatHarmonizedAudioTitle } from '../../../utils/audioNamingHelper';
import { safeDecodeAudioData, ensureWavBlob, ensureCenteredStereoAudioBuffer } from '../../../utils/audioMasteringEngine';
import { getAudioNotesCount, getAudioNotes, addAudioNote, updateAudioNote, deleteAudioNote, fetchAudioNotesFromServer } from '../../../utils/audioNotesStorage';
import { getSecureAudioUrl } from '../../../utils/audioStorageHelper';
import { SharedAudioEngine } from '../../../utils/sharedAudioEngine';
import { resampleWaveformPeaks, extractWaveformPeaks, detectAudioMimeType } from '../../../utils/waveformHelper';
import { AudioLoopLocator, getLoopLocator } from '../../../utils/audioLoopLocatorStorage';

const AudioEditorModal = React.lazy(() => import('../../campus/AudioEditorModal').then(m => ({ default: m.AudioEditorModal })));
const AudioNotesModal = React.lazy(() => import('../../campus/AudioNotesModal').then(m => ({ default: m.AudioNotesModal })));

export const CassetteIcon: React.FC<{ isPlaying: boolean; color?: string }> = ({ isPlaying, color = 'currentColor' }) => {
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

// Precision WebAudio beep scheduler for 4-beat count-in
export const scheduleCountInBeep = (ctx: AudioContext, time: number, isAccent: boolean) => {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isAccent ? 960 : 640, time);
    gain.gain.setValueAtTime(0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.10);
  } catch {
    // silent fallback
  }
};

export const playCountInBeep = (isAccent: boolean) => {
  try {
    const ctx = SharedAudioEngine.getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    scheduleCountInBeep(ctx, ctx.currentTime, isAccent);
  } catch {
    // silent fallback
  }
};

export interface MasterworkAudioCapsuleProps {
  url: string;
  songTitle: string;
  onDelete?: () => void;
}

export const MasterworkAudioCapsule: React.FC<MasterworkAudioCapsuleProps> = ({
  url,
  songTitle,
  onDelete
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const isPlayableUrl = (u?: string | null) => Boolean(u && (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('blob:') || u.startsWith('data:')));
  const [resolvedUrl, setResolvedUrl] = useState<string>(() => isPlayableUrl(url) ? url : '');
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const playerIdRef = React.useRef<string>(`mw_capsule_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`);

  const notifyGlobalPlay = () => {
    window.dispatchEvent(new CustomEvent('campus-global-audio-play', { detail: { playerId: playerIdRef.current } }));
  };

  useEffect(() => {
    const handleOtherPlay = (e: any) => {
      if (e?.detail?.playerId && e.detail.playerId !== playerIdRef.current) {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
      }
    };
    window.addEventListener('campus-global-audio-play', handleOtherPlay);
    return () => window.removeEventListener('campus-global-audio-play', handleOtherPlay);
  }, []);

  useEffect(() => {
    let active = true;
    let createdBlobUrl: string | null = null;

    if (url.startsWith('campus_blob_') || url.startsWith('campus_audio_')) {
      getBlob(url).then(raw => {
        if (active && raw) {
          const finalBlob = raw instanceof Blob ? raw : new Blob([raw], { type: 'audio/webm' });
          createdBlobUrl = URL.createObjectURL(finalBlob);
          setResolvedUrl(createdBlobUrl);
        }
      }).catch((err: any) => console.warn('[MasterworkAudioCapsule] Blob load note:', err));
    } else if (url.startsWith('http') || url.includes('/storage/v1/object/') || url.startsWith('schools/')) {
      getBlob(url).then(cachedBlob => {
        if (active && cachedBlob) {
          const finalBlob = cachedBlob instanceof Blob ? cachedBlob : new Blob([cachedBlob], { type: 'audio/webm' });
          createdBlobUrl = URL.createObjectURL(finalBlob);
          setResolvedUrl(createdBlobUrl);
          return;
        }
        getSecureAudioUrl(url, 'campus-assets', 300).then(secUrl => {
          if (active && secUrl) setResolvedUrl(secUrl);
        }).catch(() => {
          if (active) setResolvedUrl(url);
        });
      }).catch(() => {
        getSecureAudioUrl(url, 'campus-assets', 300).then(secUrl => {
          if (active && secUrl) setResolvedUrl(secUrl);
        }).catch(() => {
          if (active) setResolvedUrl(url);
        });
      });
    } else {
      setResolvedUrl(url);
    }

    return () => {
      active = false;
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
    };
  }, [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => {
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

    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [resolvedUrl]);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const ctx = SharedAudioEngine.getContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {}

    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      notifyGlobalPlay();
      if (audioRef.current.ended || (duration > 0 && audioRef.current.currentTime >= duration)) {
        audioRef.current.currentTime = 0;
      }
      if (audioRef.current.readyState === 0) {
        try { audioRef.current.load(); } catch {}
      }
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setIsPlaying(true)).catch(err => console.warn('[MasterworkAudioCapsule] Play err:', err));
      } else {
        setIsPlaying(true);
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressRatio = duration > 0 ? currentTime / duration : 0;
  const waveformHeights = [25, 55, 80, 45, 90, 70, 40, 85, 95, 60, 45, 80, 100, 65, 45, 30];

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: isPlaying ? '#f0f9ff' : '#f8fafc',
        border: isPlaying ? '1px solid #7dd3fc' : '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '4px 8px 4px 6px',
        boxShadow: isPlaying ? '0 2px 8px rgba(14, 165, 233, 0.18)' : '0 1px 3px rgba(0, 0, 0, 0.02)',
        transition: 'all 0.15s ease',
        boxSizing: 'border-box'
      }}
    >
      <audio ref={audioRef} src={resolvedUrl || undefined} preload="metadata" playsInline />

      {/* Play / Pause Circular Button */}
      <button
        type="button"
        onClick={togglePlay}
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: isPlaying ? '#0284c7' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: isPlaying ? '0 0 8px rgba(2, 132, 199, 0.45)' : '0 1px 4px rgba(2, 132, 199, 0.25)',
          transition: 'all 0.15s ease'
        }}
        className="hover-scale-mini"
        title={isPlaying ? "Pause" : "Meisterwerk-Aufnahme anhören"}
      >
        {isPlaying ? (
          <Pause size={12} fill="currentColor" strokeWidth={0} />
        ) : (
          <Play size={12} fill="currentColor" strokeWidth={0} style={{ marginLeft: '1px' }} />
        )}
      </button>

      {/* Label & Waveform Scrubbing */}
      <div 
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const newRatio = Math.max(0, Math.min(1, clickX / rect.width));
          const newTime = newRatio * (duration || 0);
          setCurrentTime(newTime);
          if (audioRef.current) audioRef.current.currentTime = newTime;
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          cursor: 'pointer',
          userSelect: 'none'
        }}
        title="Tippen zum Spulen"
      >
        <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#0369a1' }}>
          🎙️ Aufnahme
        </span>

        {/* Waveform Bars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5px', height: '14px', width: '50px' }}>
          {waveformHeights.map((h, i) => {
            const barRatio = i / waveformHeights.length;
            const isFilled = barRatio <= progressRatio;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  borderRadius: '1px',
                  background: isFilled ? '#0284c7' : '#bae6fd',
                  transition: 'background 0.1s ease'
                }}
              />
            );
          })}
        </div>

        <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#64748b', fontVariantNumeric: 'tabular-nums', minWidth: '28px' }}>
          {formatTime(currentTime || duration)}
        </span>
      </div>

      {/* Delete button (optional) */}
      {onDelete && (
        <button
          type="button"
          disabled={isDeleting}
          onClick={async (e) => {
            e.stopPropagation();
            setIsDeleting(true);
            try {
              await Promise.resolve(onDelete());
            } catch (err) {
              console.warn('[MasterworkAudioCapsule] Delete error:', err);
              setIsDeleting(false);
            }
          }}
          style={{
            border: '1px solid #fecdd3',
            background: isDeleting ? '#fee2e2' : '#fff1f2',
            color: '#dc2626',
            cursor: isDeleting ? 'wait' : 'pointer',
            height: '24px',
            width: '24px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.15s ease'
          }}
          className={isDeleting ? undefined : "hover-scale-mini"}
          title={isDeleting ? "Wird gelöscht..." : "Meisterwerk-Aufnahme löschen"}
          aria-label={isDeleting ? "Wird gelöscht..." : "Meisterwerk-Aufnahme löschen"}
        >
          {isDeleting ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Trash2 size={12} strokeWidth={2.2} />
          )}
        </button>
      )}
    </div>
  );
};

export interface InlineAudioPlayerProps {
  id?: string;
  audioId?: string;
  url: string; 
  label: string; 
  onDelete?: () => void; 
  duration?: number;
  themeColor?: string;
  themeBg?: string;
  badge?: string;
  badgeTitle?: string;
  badgeBg?: string;
  badgeColor?: string;
  onBadgeClick?: () => void;
  contextBadge?: string;
  onContextBadgeClick?: () => void;
  date?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onSaveEdited?: (result: { url: string; duration: number; label: string; mode: 'overwrite' | 'duplicate'; is_edited?: boolean; loop_locator?: any }) => void;
  isHero?: boolean;
  canEdit?: boolean;
  allowDownload?: boolean;
  availableSongs?: { title: string; artist?: string; fullLabel: string; type?: 'song' | 'book' }[];
  onSelectSongTag?: (songTag: string | null) => void;
  isSharedWithTeacher?: boolean;
  onRename?: (newTitle: string) => void;
  originalAudioUrl?: string;
  originalDuration?: number;
  onRevertToOriginal?: () => void;
  onOpenDuettDeck?: () => void;
  metronomeBpm?: number;
  waveformPeaks?: number[];
  uiLevel?: 'junior' | 'teen' | 'pro';
  initialLoopLocator?: AudioLoopLocator | null;
}

export const InlineAudioPlayer: React.FC<InlineAudioPlayerProps> = ({ 
  id,
  audioId,
  url, 
  label, 
  onDelete, 
  duration: initialDuration,
  themeColor = '#34a853',
  themeBg = '#e6f4ea',
  badge,
  badgeTitle,
  badgeBg = '#f1f5f9',
  badgeColor = '#475569',
  onBadgeClick,
  contextBadge,
  onContextBadgeClick,
  date,
  isFavorite,
  onToggleFavorite,
  onSaveEdited,
  isHero = false,
  canEdit = true,
  allowDownload = true,
  availableSongs,
  onSelectSongTag,
  isSharedWithTeacher,
  onRename,
  originalAudioUrl,
  originalDuration,
  onRevertToOriginal,
  onOpenDuettDeck,
  metronomeBpm,
  waveformPeaks,
  uiLevel = 'junior',
  initialLoopLocator
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number>(initialDuration || 0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [peaks, setPeaks] = useState<number[]>(() => waveformPeaks || []);

  // Sync duration with prop changes
  useEffect(() => {
    if (initialDuration && initialDuration > 0) {
      setDuration(initialDuration);
    }
  }, [initialDuration]);

  // Sync waveformPeaks with prop changes
  useEffect(() => {
    if (waveformPeaks && waveformPeaks.length > 0) {
      setPeaks(waveformPeaks);
    }
  }, [waveformPeaks]);
  const effectiveUiLevel: 'junior' | 'teen' | 'pro' = uiLevel || (typeof window !== 'undefined' ? (localStorage.getItem('campus_student_ui_level') as any) : null) || 'junior';
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState<boolean>(() => Boolean(initialLoopLocator?.enabled));
  const [countInActive, setCountInActive] = useState<boolean>(() => effectiveUiLevel === 'junior');
  const [countInStep, setCountInStep] = useState<number | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const isPlayableUrl = (u?: string | null) => Boolean(u && (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('blob:') || u.startsWith('data:')));
  const [resolvedUrl, setResolvedUrl] = useState<string>(() => isPlayableUrl(url) ? url : '');

  // 🛡️ Stabiler Audio-Schlüssel für Notizen (bevorzugt ID / campus_blob Key vor volatilen blob: URLs)
  const persistentAudioKey = audioId || id || (url && !url.startsWith('blob:') ? url : '') || (resolvedUrl && !resolvedUrl.startsWith('blob:') ? resolvedUrl : '') || url || resolvedUrl;
  const [notesCount, setNotesCount] = useState<number>(() => getAudioNotesCount(persistentAudioKey));

  // 🎛️ A/B Loop-Locator State (Non-destructive Übe-Schleife)
  const [loopLocator, setLoopLocator] = useState<AudioLoopLocator | null>(() => initialLoopLocator || getLoopLocator(persistentAudioKey || url || resolvedUrl, persistentAudioKey));

  useEffect(() => {
    if (initialLoopLocator !== undefined) {
      setLoopLocator(initialLoopLocator);
      if (initialLoopLocator?.enabled) {
        setIsLooping(true);
      }
    }
  }, [initialLoopLocator]);

  useEffect(() => {
    const audioKey = persistentAudioKey || url || resolvedUrl;
    const loaded = initialLoopLocator || getLoopLocator(audioKey, persistentAudioKey);
    setLoopLocator(loaded);
    if (loaded?.enabled) {
      setIsLooping(true);
    }

    const handleLocatorChange = (e?: any) => {
      const changedKey = e?.detail?.audioKey;
      const changedRecId = e?.detail?.recordingId;
      if (
        !changedKey ||
        changedKey === audioKey ||
        changedKey === persistentAudioKey ||
        changedRecId === persistentAudioKey ||
        changedRecId === audioId ||
        changedRecId === id
      ) {
        const updated = getLoopLocator(audioKey, persistentAudioKey);
        setLoopLocator(updated);
        if (updated?.enabled) {
          setIsLooping(true);
        }
      }
    };
    window.addEventListener('campus-audio-loop-locator-changed', handleLocatorChange);
    return () => window.removeEventListener('campus-audio-loop-locator-changed', handleLocatorChange);
  }, [persistentAudioKey, url, resolvedUrl, initialLoopLocator, audioId, id]);

  // 🔔 Reaktiv synchronisierte Notizen-Anzahl (SoundCloud-Style Marker)
  useEffect(() => {
    setNotesCount(getAudioNotesCount(persistentAudioKey));

    // 🛡️ Revisionssicherer Server-Abruf
    fetchAudioNotesFromServer(persistentAudioKey)
      .then(srvNotes => {
        if (srvNotes) setNotesCount(srvNotes.length);
      })
      .catch(() => {});

    const handleNotesChanged = () => {
      setNotesCount(getAudioNotesCount(persistentAudioKey));
    };

    window.addEventListener('campus-audio-notes-changed', handleNotesChanged);
    return () => {
      window.removeEventListener('campus-audio-notes-changed', handleNotesChanged);
    };
  }, [persistentAudioKey]);
  const [isSongPickerOpen, setIsSongPickerOpen] = useState(false);
  const [songSearchInput, setSongSearchInput] = useState('');
  const songPickerRef = React.useRef<HTMLDivElement | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const countInTimerRef = React.useRef<any>(null);
  const playerIdRef = React.useRef<string>(`player_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`);

  // 🔁 Hardware-nahe Web Audio Looping Engine (0,000 ms Latenz / absolut lückenlos)
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const audioBufferRef = React.useRef<AudioBuffer | null>(null);
  const loopSourceRef = React.useRef<AudioBufferSourceNode | null>(null);
  const loopStartTimestampRef = React.useRef<number>(0);
  const loopOffsetSecRef = React.useRef<number>(0);
  const animFrameRef = React.useRef<number | null>(null);
  const isWebAudioPlayingRef = React.useRef<boolean>(false);
  const checkIsMobile = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || Boolean(typeof document !== 'undefined' && document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait'));
  };
  const [isMobile, setIsMobile] = useState(checkIsMobile);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitleInput, setEditedTitleInput] = useState('');
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [modalTitleInput, setModalTitleInput] = useState('');
  const [modalNotesInput, setModalNotesInput] = useState('');

  const displayTitle = useMemo(() => {
    if (label && label.trim() !== '') {
      return label.trim();
    }
    return formatHarmonizedAudioTitle({
      url: resolvedUrl,
      label,
      date,
      songTag: contextBadge
    });
  }, [label, resolvedUrl, date, contextBadge]);

  const handleOpenRenameModal = () => {
    const audioKey = url || resolvedUrl;
    setModalTitleInput(displayTitle);
    const existingNotes = getAudioNotes(audioKey);
    const generalNote = existingNotes.find(n => n.tag === 'general') || (existingNotes.length === 1 && existingNotes[0].time === 0 ? existingNotes[0] : null);
    setModalNotesInput(generalNote ? generalNote.text : '');
    setIsRenameModalOpen(true);
  };

  const handleSaveRenameAndNotes = () => {
    const trimmedTitle = modalTitleInput.trim();
    if (trimmedTitle && onRename && trimmedTitle !== displayTitle) {
      onRename(trimmedTitle);
    }

    const audioKey = url || resolvedUrl;
    const trimmedNotes = modalNotesInput.trim();
    const existingNotes = getAudioNotes(audioKey);
    const generalNote = existingNotes.find(n => n.tag === 'general') || (existingNotes.length === 1 && existingNotes[0].time === 0 ? existingNotes[0] : null);

    if (trimmedNotes) {
      if (generalNote) {
        updateAudioNote(audioKey, generalNote.id, { text: trimmedNotes });
      } else {
        addAudioNote(audioKey, {
          time: 0,
          text: trimmedNotes,
          tag: 'general',
          authorRole: badge?.toLowerCase().includes('lehrer') || isSharedWithTeacher ? 'teacher' : 'student'
        });
      }
    } else if (generalNote) {
      deleteAudioNote(audioKey, generalNote.id);
    }

    setIsRenameModalOpen(false);
  };

  const handleSaveRename = () => {
    const trimmed = editedTitleInput.trim();
    if (trimmed && onRename && trimmed !== displayTitle) {
      onRename(trimmed);
    }
    setIsEditingTitle(false);
  };

  useEffect(() => {
    if (!isRenameModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsRenameModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRenameModalOpen]);

  useEffect(() => {
    const handleResize = () => setIsMobile(checkIsMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isSongPickerOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (songPickerRef.current && !songPickerRef.current.contains(e.target as Node)) {
        setIsSongPickerOpen(false);
        setSongSearchInput('');
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('touchstart', handleClickOutside);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isSongPickerOpen]);

  const notifyGlobalPlay = () => {
    window.dispatchEvent(new CustomEvent('campus-global-audio-play', { detail: { playerId: playerIdRef.current } }));
  };

  // 🎧 Global Single-Audio Manager: Stop if any other player on the page starts
  useEffect(() => {
    const handleOtherPlay = (e: any) => {
      if (e?.detail?.playerId && e.detail.playerId !== playerIdRef.current) {
        if (countInTimerRef.current) {
          if (typeof countInTimerRef.current === 'object' && countInTimerRef.current.clear) {
            countInTimerRef.current.clear();
          } else {
            clearTimeout(countInTimerRef.current);
          }
          countInTimerRef.current = null;
          setCountInStep(null);
        }
        stopWebAudioLoop();
        if (audioRef.current) {
          try {
            audioRef.current.pause();
            audioRef.current.muted = false;
          } catch {}
        }
        setIsPlaying(false);
      }
    };

    window.addEventListener('campus-global-audio-play', handleOtherPlay);
    return () => window.removeEventListener('campus-global-audio-play', handleOtherPlay);
  }, []);

  useEffect(() => {
    let active = true;
    let createdBlobUrl: string | null = null;

    const candidateLocalKey = [url, audioId, id].find(k => k && (k.startsWith('campus_blob_') || k.startsWith('campus_audio_') || k.startsWith('offline://')));

    if (candidateLocalKey) {
      getBlob(candidateLocalKey).then(raw => {
        if (active && raw) {
          const mime = detectAudioMimeType(raw instanceof Blob ? raw : null, candidateLocalKey);
          const finalBlob = raw instanceof Blob ? raw : new Blob([raw], { type: mime });
          createdBlobUrl = URL.createObjectURL(finalBlob);
          setResolvedUrl(createdBlobUrl);
        }
      }).catch(err => console.warn('[InlineAudioPlayer] Blob load note:', err));
    } else if (url && (url.startsWith('http') || url.includes('/storage/v1/object/') || url.startsWith('schools/'))) {
      // ⚡ First check if this file was stored in IndexedDB locally (0ms Fast Local-First)
      getBlob(url).then(cachedBlob => {
        if (active && cachedBlob) {
          const mime = detectAudioMimeType(cachedBlob instanceof Blob ? cachedBlob : null, url);
          const finalBlob = cachedBlob instanceof Blob ? cachedBlob : new Blob([cachedBlob], { type: mime });
          createdBlobUrl = URL.createObjectURL(finalBlob);
          setResolvedUrl(createdBlobUrl);
          return;
        }
        getSecureAudioUrl(url, 'campus-assets', 300).then(secUrl => {
          if (active && secUrl) setResolvedUrl(secUrl);
        }).catch(() => {
          if (active) setResolvedUrl(url);
        });
      }).catch(() => {
        getSecureAudioUrl(url, 'campus-assets', 300).then(secUrl => {
          if (active && secUrl) setResolvedUrl(secUrl);
        }).catch(() => {
          if (active) setResolvedUrl(url);
        });
      });
    } else {
      setResolvedUrl(url);
    }

    return () => {
      active = false;
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
      if (countInTimerRef.current) {
        if (typeof countInTimerRef.current === 'object' && countInTimerRef.current.clear) {
          countInTimerRef.current.clear();
        } else {
          clearTimeout(countInTimerRef.current);
        }
        countInTimerRef.current = null;
      }
    };
  }, [url, audioId, id]);

  // 🔁 Web Audio Hardware Engine (Unified via SharedAudioEngine Singleton)
  const getOrCreateAudioContext = async () => {
    const ctx = SharedAudioEngine.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
    return ctx;
  };

  const loadAudioBuffer = async (): Promise<AudioBuffer | null> => {
    if (audioBufferRef.current) return audioBufferRef.current;
    try {
      const ctx = await getOrCreateAudioContext();
      if (!ctx) return null;
      let arrayBuffer: ArrayBuffer | null = null;
      
      // 1. Direktzugriff auf IndexedDB bei lokalen Campus-Schlüsseln (verhindert instabile blob:-Fetch-Fehler)
      const candidateKeys = [url, resolvedUrl, audioId, id].filter(Boolean) as string[];

      for (const k of candidateKeys) {
        if (k.startsWith('campus_blob_') || k.startsWith('campus_audio_') || k.startsWith('offline://')) {
          const raw = await getBlob(k);
          if (raw instanceof Blob) {
            arrayBuffer = await raw.arrayBuffer();
            break;
          } else if (raw instanceof ArrayBuffer) {
            arrayBuffer = raw;
            break;
          }
        }
      }

      if (!arrayBuffer) {
        for (const k of candidateKeys) {
          try {
            const cached = await getBlob(k);
            if (cached instanceof Blob) {
              arrayBuffer = await cached.arrayBuffer();
              break;
            } else if (cached instanceof ArrayBuffer) {
              arrayBuffer = cached;
              break;
            }
          } catch {}
        }
      }

      if (!arrayBuffer) {
        let targetUrl = resolvedUrl || url;
        if (targetUrl && (targetUrl.startsWith('schools/') || targetUrl.includes('/storage/v1/object/'))) {
          try {
            const sec = await getSecureAudioUrl(targetUrl, 'campus-assets', 300);
            if (sec) targetUrl = sec;
          } catch {}
        }
        if (targetUrl && isPlayableUrl(targetUrl)) {
          if (targetUrl.startsWith('blob:') || targetUrl.startsWith('data:')) {
            const resp = await fetch(targetUrl);
            arrayBuffer = await resp.arrayBuffer();
          } else {
            const resp = await fetch(targetUrl, { mode: 'cors' });
            arrayBuffer = await resp.arrayBuffer();
          }
        }
      }

      if (arrayBuffer) {
        const decoded = await safeDecodeAudioData(ctx, arrayBuffer);
        const centered = ensureCenteredStereoAudioBuffer(ctx, decoded);
        audioBufferRef.current = centered;
        if (centered.duration && isFinite(centered.duration)) {
          setDuration(Number(centered.duration.toFixed(2)));
        }

        // 🌟 Auto-Retrofit Wellenform-Peaks für Bestandsaufnahmen
        if (centered && (!peaks || peaks.length === 0)) {
          const newPeaks = extractWaveformPeaks(centered, 80);
          if (newPeaks.length > 0) {
            setPeaks(newPeaks);
            try {
              if (typeof window !== 'undefined' && window.localStorage) {
                for (let i = 0; i < localStorage.length; i++) {
                  const k = localStorage.key(i);
                  if (k && k.startsWith('campus_junior_recordings_')) {
                    const val = localStorage.getItem(k);
                    if (val && (val.includes(url) || (audioId && val.includes(audioId)) || (id && val.includes(id)))) {
                      const parsed = JSON.parse(val);
                      if (Array.isArray(parsed)) {
                        let updated = false;
                        const next = parsed.map((item: any) => {
                          if (item.url === url || (audioId && item.id === audioId) || (id && item.id === id) || (item.blobKey === url)) {
                            updated = true;
                            return { ...item, waveformPeaks: newPeaks };
                          }
                          return item;
                        });
                        if (updated) {
                          localStorage.setItem(k, JSON.stringify(next));
                        }
                      }
                    }
                  }
                }
              }
            } catch (retroErr) {
              console.warn('[InlineAudioPlayer] Waveform retrofit note:', retroErr);
            }
          }
        }

        return centered;
      }
    } catch (err) {
      console.warn('[InlineAudioPlayer] Web Audio load note:', err);
    }
    return null;
  };

  const stopWebAudio = (resetTime = false) => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (loopSourceRef.current) {
      try {
        loopSourceRef.current.onended = null;
        loopSourceRef.current.stop();
        loopSourceRef.current.disconnect();
      } catch {}
      loopSourceRef.current = null;
    }
    isWebAudioPlayingRef.current = false;
    if (resetTime) {
      setCurrentTime(0);
    }
  };

  // Backward-compatibility alias
  const stopWebAudioLoop = stopWebAudio;

  const startWebAudioPlayback = async (options: { loop: boolean; offsetSec?: number }) => {
    try {
      const ctx = await getOrCreateAudioContext();
      let buffer = audioBufferRef.current;
      if (!buffer) {
        buffer = await loadAudioBuffer();
      }
      if (!ctx || !buffer) {
        if (audioRef.current) {
          const audio = audioRef.current;
          audio.loop = Boolean(options.loop);
          if (options.offsetSec !== undefined) {
            try { audio.currentTime = options.offsetSec; } catch {}
          }
          audio.play().then(() => setIsPlaying(true)).catch((e) => {
            console.warn('[InlineAudioPlayer] HTML5 fallback error:', e);
          });
        }
        return;
      }

      stopWebAudio();
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = playbackRate || 1;
      const hasLocatorLoop = Boolean(options.loop && loopLocator?.enabled && loopLocator.endSec > loopLocator.startSec);
      const loopStartBound = hasLocatorLoop ? loopLocator!.startSec : 0;
      const loopEndBound = hasLocatorLoop ? Math.min(buffer.duration, loopLocator!.endSec) : buffer.duration;

      source.loop = options.loop;
      if (options.loop) {
        source.loopStart = loopStartBound;
        source.loopEnd = loopEndBound;
      }
      source.connect(ctx.destination);

      const bufDur = buffer.duration;
      let playStart = options.offsetSec !== undefined ? options.offsetSec : currentTime;
      if (hasLocatorLoop) {
        if (playStart < loopStartBound || playStart >= loopEndBound - 0.05) {
          playStart = loopStartBound;
        }
      } else {
        if (bufDur > 0 && playStart >= bufDur - 0.05) playStart = 0;
      }

      source.start(0, playStart);
      loopSourceRef.current = source;
      isWebAudioPlayingRef.current = true;
      loopStartTimestampRef.current = ctx.currentTime;
      loopOffsetSecRef.current = playStart;
      setIsPlaying(true);
      setCurrentTime(playStart);

      source.onended = () => {
        if (!options.loop && isWebAudioPlayingRef.current && loopSourceRef.current === source) {
          stopWebAudio();
          setIsPlaying(false);
          setCurrentTime(0);
        }
      };

      const updatePlayhead = () => {
        if (!isWebAudioPlayingRef.current || !loopSourceRef.current || !ctx || !audioBufferRef.current) return;
        const curBufDur = audioBufferRef.current.duration;
        if (curBufDur > 0) {
          const elapsed = (ctx.currentTime - loopStartTimestampRef.current) * (playbackRate || 1);
          const current = (loopOffsetSecRef.current + elapsed);
          if (options.loop) {
            if (hasLocatorLoop) {
              const loopSpan = Math.max(0.05, loopEndBound - loopStartBound);
              const offsetInLoop = (current - loopStartBound) % loopSpan;
              setCurrentTime(loopStartBound + (offsetInLoop < 0 ? offsetInLoop + loopSpan : offsetInLoop));
            } else {
              setCurrentTime(current % curBufDur);
            }
          } else {
            setCurrentTime(Math.min(curBufDur, current));
            if (current >= curBufDur) {
              stopWebAudio();
              setIsPlaying(false);
              setCurrentTime(0);
              return;
            }
          }
        }
        animFrameRef.current = requestAnimationFrame(updatePlayhead);
      };
      animFrameRef.current = requestAnimationFrame(updatePlayhead);
    } catch (err) {
      console.warn('[InlineAudioPlayer] Web Audio playback error:', err);
      setIsPlaying(false);
    }
  };

  // Backward-compatibility alias
  const startWebAudioLoop = (offsetSec?: number) => startWebAudioPlayback({ loop: true, offsetSec });

  const toggleLooping = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextLoop = !isLooping;
    setIsLooping(nextLoop);

    if (isPlaying) {
      if (nextLoop) {
        // Nahtloser Übergang: HTML5-Audio stoppen, Web Audio Gapless Loop an aktueller Position starten
        let cur = audioRef.current && !isWebAudioPlayingRef.current ? audioRef.current.currentTime : currentTime;
        if (loopLocator?.enabled && (cur < loopLocator.startSec || cur >= loopLocator.endSec - 0.05)) {
          cur = loopLocator.startSec;
        }
        if (audioRef.current) audioRef.current.pause();
        startWebAudioPlayback({ loop: true, offsetSec: cur });
      } else {
        // Nahtloser Übergang: Web Audio stoppen, HTML5-Audio an aktueller Position fortführen
        const cur = currentTime;
        stopWebAudio();
        if (audioRef.current && isPlayableUrl(resolvedUrl)) {
          audioRef.current.currentTime = cur;
          audioRef.current.loop = false;
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {
            startWebAudioPlayback({ loop: false, offsetSec: cur });
          });
        } else {
          startWebAudioPlayback({ loop: false, offsetSec: cur });
        }
      }
    } else {
      if (nextLoop) {
        loadAudioBuffer().catch(() => {});
      }
      if (audioRef.current) {
        audioRef.current.loop = nextLoop;
      }
    }
  };

  // 🔁 Cleanup Web Audio on unmount or URL change
  useEffect(() => {
    return () => {
      stopWebAudio();
    };
  }, []);

  useEffect(() => {
    audioBufferRef.current = null;
    stopWebAudio();
    if (isLooping) {
      loadAudioBuffer().catch(() => {});
    }
  }, [resolvedUrl]);

  // 🌊 Background Retrofit: Berechnet Wellenform für Bestandsaufnahmen automatisch
  useEffect(() => {
    if (!peaks || peaks.length === 0) {
      loadAudioBuffer().catch(() => {});
    }
  }, [url, resolvedUrl]);

  const stopPlayback = () => {
    if (countInTimerRef.current) {
      if (typeof countInTimerRef.current === 'object' && countInTimerRef.current.clear) {
        countInTimerRef.current.clear();
      } else {
        clearTimeout(countInTimerRef.current);
      }
      countInTimerRef.current = null;
    }
    setCountInStep(null);
    if (isWebAudioPlayingRef.current) {
      stopWebAudio();
    }
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.pause();
        audio.muted = false;
      } catch {}
    }
    setIsPlaying(false);
  };

  const togglePlay = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // 1. Synchronous WebAudio unlock directly in user gesture stack
    const ctx = SharedAudioEngine.getContext();
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {}
    }

    // Cancel active count-in or pause if already active
    if (countInTimerRef.current || isPlaying) {
      stopPlayback();
      return;
    }

    notifyGlobalPlay();

    const audio = audioRef.current;
    const isPlayable = Boolean(resolvedUrl && isPlayableUrl(resolvedUrl));
    const hasLocatorLoop = Boolean(isLooping && loopLocator?.enabled && loopLocator.endSec > loopLocator.startSec);
    let startOffset = currentTime;

    if (hasLocatorLoop) {
      if (startOffset < loopLocator!.startSec || startOffset >= loopLocator!.endSec - 0.05) {
        startOffset = loopLocator!.startSec;
      }
    } else {
      if (duration > 0 && startOffset >= duration - 0.05) {
        startOffset = 0;
      }
    }

    // Reset currentTime to startOffset so waveform and timer reflect exact playback start
    if (currentTime !== startOffset) {
      setCurrentTime(startOffset);
      if (audio && audio.readyState > 0) {
        try { audio.currentTime = startOffset; } catch {}
      }
    }

    if (countInActive) {
      // 🎯 Exact Tempo Calculation from Track BPM (fallback: 100 BPM)
      const effectiveBpm = (metronomeBpm && metronomeBpm > 0) ? metronomeBpm : 100;
      const beatDurationSec = (60 / effectiveBpm) / (playbackRate || 1);
      const beatDurationMs = beatDurationSec * 1000;

      // 🚀 Preload buffer in background
      loadAudioBuffer().catch(() => {});

      // 🛑 Ensure audio is at startOffset and completely paused during count-in
      if (audio && isPlayable) {
        try {
          if (!audio.paused) audio.pause();
          if (audio.readyState > 0) audio.currentTime = startOffset;
          audio.playbackRate = playbackRate || 1;
        } catch {}
      }

      // ⏱️ Sample-accurate count-in beeps scheduled directly on Web Audio hardware clock
      // 50ms headroom on the active running clock ensures Schlag 1 is NEVER swallowed by hardware latency
      const now = ctx ? ctx.currentTime : 0;
      const leadTime = 0.05; // 50ms scheduling headroom
      const scheduleStart = now + leadTime;

      if (ctx) {
        for (let i = 0; i < 4; i++) {
          scheduleCountInBeep(ctx, scheduleStart + i * beatDurationSec, i === 0);
        }
      }

      // 🎨 Musikalische Zählung: Schlag 1 -> 2 -> 3 -> 4 im ersten Takt
      // Exakt synchron mit den 4 Metronom-Schlägen
      setCountInStep(1);
      const timers: any[] = [];
      const clearTimers = () => timers.forEach(t => clearTimeout(t));
      countInTimerRef.current = { clear: clearTimers };

      const leadTimeMs = Math.round(leadTime * 1000);
      timers.push(setTimeout(() => setCountInStep(2), leadTimeMs + beatDurationMs));
      timers.push(setTimeout(() => setCountInStep(3), leadTimeMs + 2 * beatDurationMs));
      timers.push(setTimeout(() => setCountInStep(4), leadTimeMs + 3 * beatDurationMs));

      // 🚀 Launch Track Playback and Waveform Visualization EXACTLY on Beat 1 of Bar 2!
      // (Exakt nach Ablauf aller 4 Viertelnoten des Einzähl-Taktes)
      const songStartDelayMs = Math.max(0, leadTimeMs + 4 * beatDurationMs);
      timers.push(setTimeout(() => {
        setCountInStep(null);
        countInTimerRef.current = null;

        if (audio && isPlayable) {
          try {
            try { audio.currentTime = startOffset; } catch {}
            audio.loop = Boolean(isLooping);
            audio.playbackRate = playbackRate || 1;
            audio.muted = false;
            audio.volume = 1;
            if (audio.paused) {
              const playPromise = audio.play();
              if (playPromise !== undefined) {
                playPromise.then(() => setIsPlaying(true)).catch(() => {
                  startWebAudioPlayback({ loop: isLooping, offsetSec: startOffset });
                });
              } else {
                setIsPlaying(true);
              }
            } else {
              setIsPlaying(true);
            }
          } catch {
            startWebAudioPlayback({ loop: isLooping, offsetSec: startOffset });
          }
        } else {
          startWebAudioPlayback({ loop: isLooping, offsetSec: startOffset });
        }
      }, songStartDelayMs));

    } else {
      // ⚡ Instant Play (No Count-In)
      if (audio && isPlayable) {
        try {
          if (audio.ended || (duration > 0 && audio.currentTime >= duration - 0.05)) {
            try { audio.currentTime = 0; } catch {}
          } else {
            try {
              if (audio.readyState > 0) audio.currentTime = startOffset;
            } catch {}
          }
          audio.muted = false;
          audio.volume = 1;
          audio.loop = Boolean(isLooping);
          audio.playbackRate = playbackRate || 1;
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => setIsPlaying(true))
              .catch(err => {
                console.warn('[InlineAudioPlayer] HTML5 play failed, trying WebAudio:', err);
                startWebAudioPlayback({ loop: Boolean(isLooping), offsetSec: startOffset });
              });
          } else {
            setIsPlaying(true);
          }
        } catch {
          startWebAudioPlayback({ loop: Boolean(isLooping), offsetSec: startOffset });
        }
      } else {
        startWebAudioPlayback({ loop: Boolean(isLooping), offsetSec: startOffset });
      }
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
      // 🛡️ Freeze visualizer and playhead while count-in is active
      if (!isWebAudioPlayingRef.current && !countInTimerRef.current) {
        if (isLooping && loopLocator?.enabled && loopLocator.endSec > loopLocator.startSec) {
          if (audio.currentTime >= loopLocator.endSec - 0.03 || audio.currentTime < loopLocator.startSec) {
            audio.currentTime = loopLocator.startSec;
          }
        }
        setCurrentTime(audio.currentTime);
      }
    };
    const handleEnded = () => {
      if (!isLooping && !isWebAudioPlayingRef.current) {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    if (audio.duration && isFinite(audio.duration)) {
      setDuration(Math.round(audio.duration));
    }

    const handlePlay = () => {
      if (!audio.muted && !countInTimerRef.current) setIsPlaying(true);
    };
    const handlePause = () => {
      if (!isWebAudioPlayingRef.current && !countInTimerRef.current && !audio.muted) {
        setIsPlaying(false);
      }
    };

    audio.loop = isLooping;
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [resolvedUrl, isLooping, loopLocator]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      (audioRef.current as any).preservesPitch = true;
      (audioRef.current as any).webkitPreservesPitch = true;
      (audioRef.current as any).mozPreservesPitch = true;
    }
    if (loopSourceRef.current && isWebAudioPlayingRef.current && audioCtxRef.current) {
      loopSourceRef.current.playbackRate.value = playbackRate;
      loopOffsetSecRef.current = currentTime;
      loopStartTimestampRef.current = audioCtxRef.current.currentTime;
    }
  }, [playbackRate]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 40 organic voice-memo waveform amplitude heights (0–100%)
  const waveformHeights = [
    25, 40, 65, 35, 55, 85, 95, 70, 45, 65,
    80, 100, 90, 65, 50, 75, 85, 60, 90, 75,
    45, 65, 85, 95, 75, 55, 85, 65, 45, 70,
    80, 95, 60, 85, 50, 70, 45, 60, 40, 25
  ];
  const progressRatio = duration > 0 ? currentTime / duration : 0;

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      let finalBlob: Blob | null = null;
      let detectedExt = 'webm';

      // 1. Resolve Audio Content to a native Blob
      if (resolvedUrl.startsWith('campus_blob_') || resolvedUrl.startsWith('campus_audio_') || resolvedUrl.startsWith('offline://')) {
        const raw = await getBlob(resolvedUrl);
        if (raw) {
          finalBlob = raw instanceof Blob ? raw : new Blob([raw], { type: 'audio/webm' });
        }
      } else if (resolvedUrl.startsWith('data:')) {
        const res = await fetch(resolvedUrl);
        finalBlob = await res.blob();
      } else if (resolvedUrl.startsWith('blob:')) {
        const res = await fetch(resolvedUrl);
        finalBlob = await res.blob();
      } else {
        // Cross-origin HTTP / HTTPS (e.g. Supabase Storage)
        const res = await fetch(resolvedUrl, { mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        finalBlob = await res.blob();
      }

      if (!finalBlob) {
        throw new Error('Audio-Inhalt konnte nicht geladen werden');
      }

      // 2. 🏛️ Exklusiv verlustfreies 24-Bit PCM WAV-Format (.wav) für alle Downloads
      const safeTitle = (displayTitle || 'Aufnahme').replace(/[^a-zA-Z0-9äöüÄÖÜß_#\.-]/g, '_');
      const filename = `${safeTitle}.wav`;
      const wavBlob = await ensureWavBlob(finalBlob, { title: displayTitle || 'Aufnahme', artist: 'Campus-Groovelab' });

      // 3. Try native Operating System "Speichern unter..." Picker (Chrome, Chromium, Edge on Mac & Windows)
      if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [
              {
                description: 'WAV Studio Audio (24-Bit PCM)',
                accept: { 'audio/wav': ['.wav'] }
              }
            ]
          });
          const writable = await handle.createWritable();
          await writable.write(wavBlob);
          await writable.close();
          return;
        } catch (pickerErr: any) {
          if (pickerErr?.name === 'AbortError') {
            return;
          }
        }
      }

      // 4. Fallback: Force Same-Origin Blob Download Anchor (Safari, Firefox, Mobile)
      const blobUrl = URL.createObjectURL(wavBlob);
      const anchor = document.createElement('a');
      anchor.style.display = 'none';
      anchor.href = blobUrl;
      anchor.download = filename;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => {
        if (document.body.contains(anchor)) {
          document.body.removeChild(anchor);
        }
        URL.revokeObjectURL(blobUrl);
      }, 3000);
    } catch (err) {
      console.warn('[InlineAudioPlayer] Download fallback:', err);
      const safeTitle = (displayTitle || 'Aufnahme').replace(/[^a-zA-Z0-9äöüÄÖÜß_#\.-]/g, '_');
      const anchor = document.createElement('a');
      anchor.style.display = 'none';
      anchor.href = resolvedUrl;
      anchor.download = `${safeTitle}.wav`;
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => {
        if (document.body.contains(anchor)) {
          document.body.removeChild(anchor);
        }
      }, 1000);
    } finally {
      setIsDownloading(false);
    }
  };

  const isIndigoPurple = themeColor && (themeColor === '#6d28d9' || themeColor === '#7c3aed' || themeColor === '#8b5cf6' || themeColor === '#6366f1');
  const isShared = isSharedWithTeacher !== undefined ? isSharedWithTeacher : (badge && (badge.includes('Für Lehrer') || badge.includes('Lehrer')));

  const playButtonElement = (
        <button
          type="button"
          onClick={togglePlay}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: countInStep !== null 
              ? '#f59e0b' 
              : isIndigoPurple
                ? (isPlaying 
                    ? 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)' 
                    : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)')
                : (isPlaying 
                    ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' 
                    : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'),
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: isPlaying 
              ? (isIndigoPurple ? '0 0 12px rgba(109, 40, 217, 0.45)' : '0 0 12px rgba(34, 197, 94, 0.4)') 
              : (isIndigoPurple ? '0 2px 8px rgba(109, 40, 217, 0.32)' : '0 2px 8px rgba(22, 163, 74, 0.32)'),
            transition: 'all 0.15s ease',
            padding: 0,
            fontSize: countInStep !== null ? '0.88rem' : undefined,
            fontWeight: 900
          }}
          className="hover-scale"
          title={countInStep !== null ? `Einzähler: ${countInStep}` : (isPlaying ? 'Pause' : 'Abspielen')}
        >
          {countInStep !== null ? (
            <span>{countInStep}</span>
          ) : isPlaying ? (
            <Pause size={16} fill="currentColor" strokeWidth={0} />
          ) : (
            <Play size={16} fill="currentColor" strokeWidth={0} style={{ marginLeft: '2px' }} />
          )}
        </button>
  );

  const renderTitleAndBadges = (isDesktop: boolean) => (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "6px",
      minWidth: 0,
      flex: isDesktop ? "0 1 auto" : 1,
      maxWidth: isDesktop ? "240px" : undefined,
      position: "relative"
    }}>
              {isEditingTitle ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveRename();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0, margin: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    value={editedTitleInput}
                    onChange={(e) => setEditedTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                    autoFocus
                    style={{
                      flex: 1,
                      minWidth: '100px',
                      padding: '2px 8px',
                      fontSize: '0.80rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      borderRadius: '6px',
                      border: '1.5px solid #16a34a',
                      background: '#ffffff',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '2px 8px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      background: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Speichern
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(false)}
                    style={{
                      padding: '2px 6px',
                      fontSize: '0.74rem',
                      background: '#f1f5f9',
                      color: '#64748b',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Abbrechen
                  </button>
                </form>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span 
                    style={{
                      fontSize: '0.80rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.2
                    }}
                    title={displayTitle}
                  >
                    {displayTitle}
                  </span>
                </div>
              )}

              {/* Context / Song-Zugehörigkeit Badge (z. B. 🎵 Bad Romance) */}
              {contextBadge && !isEditingTitle && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                  <span
                    onClick={onContextBadgeClick ? (e) => { e.stopPropagation(); onContextBadgeClick(); } : undefined}
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      background: '#ede9fe',
                      color: '#6d28d9',
                      padding: '2px 7px',
                      borderRadius: '100px',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      cursor: onContextBadgeClick ? 'pointer' : 'default',
                      userSelect: 'none',
                      transition: 'all 0.15s ease'
                    }}
                    className={onContextBadgeClick ? 'hover-scale-mini' : ''}
                    title={onContextBadgeClick ? "Klicken, um Song-Zuweisung zu ändern" : undefined}
                  >
                    {contextBadge}
                  </span>
                  {onSelectSongTag && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSongTag(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '1px',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px'
                      }}
                      className="hover-scale-mini"
                      title="Song-Zuweisung entfernen"
                    >
                      <X size={11} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              )}

              {/* Song Tag Selector Dropdown Modal/Popover */}
              {isSongPickerOpen && (
                <div
                  ref={songPickerRef}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '6px',
                    width: '280px',
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: '1.5px solid #cbd5e1',
                    boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                    padding: '10px',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 850, color: '#334155' }}>
                      Song oder Buch zuweisen:
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSongPickerOpen(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#94a3b8' }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Search / Filter Input */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={12} style={{ position: 'absolute', left: '8px', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Suchen..."
                      value={songSearchInput}
                      onChange={(e) => setSongSearchInput(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '5px 8px 5px 26px',
                        fontSize: '0.72rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      autoFocus
                    />
                  </div>

                  {/* Free text tag option if typed text doesn't match */}
                  {songSearchInput.trim() && onSelectSongTag && (
                    <div style={{ borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSongPickerOpen(false);
                          onSelectSongTag(songSearchInput.trim());
                          setSongSearchInput('');
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: '#f0fdf4',
                          color: '#16a34a',
                          border: '1px solid #bbf7d0',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          textAlign: 'left'
                        }}
                        className="hover-scale-mini"
                      >
                        <span>➕</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Als Tag: &quot;{songSearchInput.trim()}&quot;
                        </span>
                      </button>
                    </div>
                  )}

                  <div style={{
                    maxHeight: '180px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}>
                    {(() => {
                      const filtered = (availableSongs || []).filter(s => 
                        !songSearchInput || 
                        s.title.toLowerCase().includes(songSearchInput.toLowerCase()) || 
                        (s.artist && s.artist.toLowerCase().includes(songSearchInput.toLowerCase()))
                      );

                      if (filtered.length === 0 && !songSearchInput.trim()) {
                        return (
                          <div style={{ padding: '8px', fontSize: '0.70rem', color: '#94a3b8', textAlign: 'center' }}>
                            Keine Songs oder Lehrwerke gefunden. Gib oben einen Namen ein!
                          </div>
                        );
                      }

                      return filtered.map((song, sIdx) => {
                        const isCurrent = contextBadge === song.fullLabel;
                        return (
                          <button
                            key={`song-opt-${sIdx}`}
                            type="button"
                            onClick={() => {
                              setIsSongPickerOpen(false);
                              setSongSearchInput('');
                              if (onSelectSongTag) onSelectSongTag(song.fullLabel);
                            }}
                            style={{
                              background: isCurrent ? '#ede9fe' : '#ffffff',
                              border: isCurrent ? '1px solid #c4b5fd' : '1px solid transparent',
                              borderRadius: '8px',
                              padding: '6px 8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              textAlign: 'left',
                              transition: 'all 0.12s ease'
                            }}
                            className="hover-scale-mini"
                          >
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '6px',
                              background: isCurrent ? '#8b5cf6' : '#f1f5f9',
                              color: isCurrent ? '#ffffff' : '#6366f1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.70rem',
                              flexShrink: 0
                            }}>
                              {song.type === 'book' ? '📖' : '🎵'}
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{
                                fontSize: '0.74rem',
                                fontWeight: 850,
                                color: isCurrent ? '#5b21b6' : '#0f172a',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {song.title}
                              </div>
                              {song.artist && (
                                <div style={{
                                  fontSize: '0.62rem',
                                  fontWeight: 650,
                                  color: isCurrent ? '#7c3aed' : '#64748b',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {song.artist}
                                </div>
                              )}
                            </div>
                            {isCurrent && <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 900 }}>✓</span>}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            {badge && (
              <span 
                onClick={onBadgeClick ? (e) => { e.stopPropagation(); onBadgeClick(); } : undefined}
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  background: badgeBg || '#f1f5f9',
                  color: badgeColor || '#475569',
                  padding: '2px 7px',
                  borderRadius: '100px',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  cursor: onBadgeClick ? 'pointer' : 'default',
                  userSelect: 'none',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
                className={onBadgeClick ? 'hover-scale-mini' : ''}
                title={badgeTitle || (onBadgeClick ? 'Klicken zum Umschalten (Privat / Für Lehrkraft freigeben)' : undefined)}
              >
                {badge}
              </span>
            )}
    </div>
  );

  const effective16Bars = useMemo(() => {
    if (peaks && peaks.length > 0) {
      return resampleWaveformPeaks(peaks, 16);
    }
    return [0.25, 0.40, 0.65, 0.35, 0.55, 0.85, 0.95, 0.70, 0.45, 0.65, 0.80, 0.95, 0.75, 0.55, 0.40, 0.25];
  }, [peaks]);

  const renderWaveform = (isDesktop: boolean) => {
    const hasLocator = Boolean(loopLocator && loopLocator.endSec > loopLocator.startSec && duration > 0);
    const startPct = hasLocator ? Math.max(0, Math.min(100, (loopLocator!.startSec / duration) * 100)) : 0;
    const endPct = hasLocator ? Math.max(0, Math.min(100, (loopLocator!.endSec / duration) * 100)) : 100;
    const spanPct = Math.max(0, endPct - startPct);
    const isLoopActive = Boolean(isLooping && loopLocator?.enabled);
    const accentColor = isIndigoPurple ? '#7c3aed' : '#16a34a';

    return (
      <div
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const newRatio = Math.max(0, Math.min(1, clickX / rect.width));
          let newTime = newRatio * (duration || 0);
          if (isLoopActive && hasLocator) {
            if (newTime < loopLocator!.startSec || newTime > loopLocator!.endSec) {
              newTime = loopLocator!.startSec;
            }
          }
          setCurrentTime(newTime);
          if (isWebAudioPlayingRef.current) {
            startWebAudioPlayback({ loop: isLooping, offsetSec: newTime });
          } else if (audioRef.current) {
            audioRef.current.currentTime = newTime;
          }
        }}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: "2px",
          height: "18px",
          cursor: "pointer",
          width: "100%",
          maxWidth: isDesktop ? "160px" : "160px",
          minWidth: isDesktop ? "70px" : undefined,
          flex: isDesktop ? 1 : undefined
        }}
        title={hasLocator ? `A/B-Loop: ${formatTime(loopLocator!.startSec)} - ${formatTime(loopLocator!.endSec)} (Tippen zum Spulen)` : "Tippen zum Spulen"}
      >
        {/* 📍 A/B Loop Corridor & Pins */}
        {hasLocator && (
          <>
            {/* Shaded Corridor between A and B */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${startPct}%`,
                width: `${spanPct}%`,
                background: isLoopActive
                  ? (isIndigoPurple ? 'rgba(124, 58, 237, 0.14)' : 'rgba(22, 163, 74, 0.15)')
                  : 'rgba(148, 163, 184, 0.08)',
                borderRadius: '3px',
                pointerEvents: 'none',
                transition: 'all 0.15s ease'
              }}
            />

            {/* Marker A (Start) */}
            <div
              style={{
                position: 'absolute',
                top: '-2px',
                bottom: '-2px',
                left: `${startPct}%`,
                width: '1.5px',
                background: isLoopActive ? accentColor : '#94a3b8',
                borderRadius: '1px',
                pointerEvents: 'none',
                zIndex: 4,
                transition: 'all 0.15s ease'
              }}
              title={`Loop Start (A): ${formatTime(loopLocator!.startSec)}`}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '-7px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '0.45rem',
                  fontWeight: 900,
                  lineHeight: 1,
                  color: '#ffffff',
                  background: isLoopActive ? accentColor : '#64748b',
                  borderRadius: '2px',
                  padding: '1px 2px',
                  letterSpacing: '-0.02em',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
                }}
              >
                A
              </span>
            </div>

            {/* Marker B (Ende) */}
            <div
              style={{
                position: 'absolute',
                top: '-2px',
                bottom: '-2px',
                left: `${endPct}%`,
                width: '1.5px',
                background: isLoopActive ? (isIndigoPurple ? '#a855f7' : '#ef4444') : '#94a3b8',
                borderRadius: '1px',
                pointerEvents: 'none',
                zIndex: 4,
                transition: 'all 0.15s ease'
              }}
              title={`Loop Ende (B): ${formatTime(loopLocator!.endSec)}`}
            >
              <span
                style={{
                  position: 'absolute',
                  bottom: '-7px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '0.45rem',
                  fontWeight: 900,
                  lineHeight: 1,
                  color: '#ffffff',
                  background: isLoopActive ? (isIndigoPurple ? '#a855f7' : '#ef4444') : '#64748b',
                  borderRadius: '2px',
                  padding: '1px 2px',
                  letterSpacing: '-0.02em',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
                }}
              >
                B
              </span>
            </div>
          </>
        )}

        {effective16Bars.map((val, i) => {
          const barRatio = i / effective16Bars.length;
          const isFilled = barRatio <= progressRatio;
          const heightPct = Math.max(20, Math.round(val * 100));

          // A/B Loop-Locator Visualisierung (32% Opacity außerhalb des Loop-Bereichs bei aktivem Looping)
          const isWithinLocator = !loopLocator?.enabled || !duration || duration <= 0 || (
            (barRatio * duration) >= (loopLocator.startSec - 0.05) &&
            (barRatio * duration) <= (loopLocator.endSec + 0.05)
          );
          const opacity = (isLoopActive && !isWithinLocator) ? 0.32 : 1;

          return (
            <div
              key={i}
              style={{
                flex: 1,
                minWidth: "2.5px",
                height: `${heightPct}%`,
                borderRadius: "1.5px",
                opacity,
                background: isFilled
                  ? (isIndigoPurple ? (isPlaying ? "#7c3aed" : "#6d28d9") : (isPlaying ? "#16a34a" : "#15803d"))
                  : (isShared ? "#bbf7d0" : "#e2e8f0"),
                transition: "background 0.1s ease, opacity 0.2s ease"
              }}
            />
          );
        })}
      </div>
    );
  };

  const renderTimeDisplay = (isDesktop: boolean) => {
    const isLoopActive = Boolean(isLooping && loopLocator?.enabled);
    return (
      <span
        style={{
          fontSize: "0.68rem",
          fontWeight: 750,
          color: isLoopActive ? (isIndigoPurple ? "#7c3aed" : "#15803d") : "#64748b",
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
          minWidth: isDesktop ? "64px" : "68px",
          textAlign: "right",
          transition: "color 0.15s ease"
        }}
        title={isLoopActive && loopLocator ? `A/B Loop aktiv: ${formatTime(loopLocator.startSec)} - ${formatTime(loopLocator.endSec)}` : undefined}
      >
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    );
  };

  const renderActionButtons = (
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '3px' : '5px', flexShrink: 0 }}>
        {/* 🔁 Loop Toggle (Icon only) */}
        <button
          type="button"
          onClick={toggleLooping}
          style={{
            border: isLooping 
              ? (isIndigoPurple ? '1.5px solid #7c3aed' : '1.5px solid #16a34a') 
              : '1px solid #cbd5e1',
            background: isLooping 
              ? (isIndigoPurple ? '#f3e8ff' : '#dcfce7') 
              : '#ffffff',
            color: isLooping 
              ? (isIndigoPurple ? '#6d28d9' : '#15803d') 
              : '#64748b',
            height: isMobile ? '30px' : '34px',
            width: isMobile ? '30px' : '34px',
            minWidth: isMobile ? '30px' : '34px',
            padding: 0,
            borderRadius: isMobile ? '8px' : '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            boxShadow: isLooping 
              ? (isIndigoPurple ? '0 1px 3px rgba(109, 40, 217, 0.2)' : '0 1px 3px rgba(22, 163, 74, 0.2)') 
              : '0 1px 2px rgba(0, 0, 0, 0.02)',
            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          className="hover-scale-mini"
          title={
            isLooping 
              ? (loopLocator?.enabled ? `A/B Loop aktiv (${Math.round(loopLocator.startSec)}s - ${Math.round(loopLocator.endSec)}s) – Tippen zum Deaktivieren` : "Loop aktiv (Endlos-Wiedergabe) – Tippen zum Deaktivieren")
              : (loopLocator?.enabled ? `A/B Loop aktivieren (${Math.round(loopLocator.startSec)}s - ${Math.round(loopLocator.endSec)}s)` : "Loop aktivieren (Endlos-Wiedergabe)")
          }
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Repeat size={isMobile ? 14 : 15} strokeWidth={isLooping ? 2.6 : 2.2} />
            {loopLocator?.enabled && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-6px',
                fontSize: '0.48rem',
                fontWeight: 900,
                lineHeight: 1,
                background: isLooping ? '#7c3aed' : '#94a3b8',
                color: '#ffffff',
                borderRadius: '3px',
                padding: '1px 2px'
              }}>
                A/B
              </span>
            )}
          </div>
        </button>

        {/* ⏱️ 4-Beat Einzähler Toggle (Icon only) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCountInActive(!countInActive);
          }}
          style={{
            border: countInActive 
              ? (isIndigoPurple ? '1.5px solid #7c3aed' : '1.5px solid #16a34a') 
              : '1px solid #cbd5e1',
            background: countInActive 
              ? (isIndigoPurple ? '#f3e8ff' : '#dcfce7') 
              : '#ffffff',
            color: countInActive 
              ? (isIndigoPurple ? '#6d28d9' : '#15803d') 
              : '#64748b',
            height: isMobile ? '30px' : '34px',
            width: isMobile ? '30px' : '34px',
            minWidth: isMobile ? '30px' : '34px',
            padding: 0,
            borderRadius: isMobile ? '8px' : '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: countInActive 
              ? (isIndigoPurple ? '0 1px 3px rgba(109, 40, 217, 0.2)' : '0 1px 3px rgba(22, 163, 74, 0.2)') 
              : '0 1px 2px rgba(0, 0, 0, 0.02)',
            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          className="hover-scale-mini"
          title={countInActive ? "4-Beat Einzähler aktiv – Tippen zum Deaktivieren" : "4-Beat Einzähler aktivieren"}
        >
          <Timer size={isMobile ? 14 : 15} strokeWidth={countInActive ? 2.6 : 2.2} />
        </button>

        {/* 🎛️ Adaptiver Tempo Button (Junior: 🐢/🐰, Teen: 3 Stufen, Pro: Feinstufen) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (effectiveUiLevel === 'junior') {
              setPlaybackRate(prev => (prev === 1 ? 0.75 : 1));
            } else if (effectiveUiLevel === 'teen') {
              const rates = [1, 0.85, 0.75];
              const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
              setPlaybackRate(nextRate);
            } else {
              const rates = [1, 0.85, 0.75, 0.6, 0.5];
              const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
              setPlaybackRate(nextRate);
            }
          }}
          style={{
            border: playbackRate !== 1 
              ? (isIndigoPurple ? '1.5px solid #7c3aed' : '1.5px solid #16a34a') 
              : '1px solid #cbd5e1',
            background: playbackRate !== 1 
              ? (isIndigoPurple ? '#f3e8ff' : '#dcfce7') 
              : '#ffffff',
            color: playbackRate !== 1 
              ? (isIndigoPurple ? '#6d28d9' : '#15803d') 
              : '#64748b',
            height: isMobile ? '30px' : '34px',
            width: isMobile ? (effectiveUiLevel === 'junior' ? '44px' : '32px') : (effectiveUiLevel === 'junior' ? '48px' : '36px'),
            minWidth: isMobile ? (effectiveUiLevel === 'junior' ? '44px' : '32px') : (effectiveUiLevel === 'junior' ? '48px' : '36px'),
            padding: 0,
            borderRadius: isMobile ? '8px' : '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: playbackRate !== 1 
              ? (isIndigoPurple ? '0 1px 3px rgba(109, 40, 217, 0.2)' : '0 1px 3px rgba(22, 163, 74, 0.2)') 
              : '0 1px 2px rgba(0, 0, 0, 0.02)',
            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          className="hover-scale-mini"
          title={
            effectiveUiLevel === 'junior'
              ? (playbackRate < 1 ? '🐢 Langsam (75%) – Tippen für 🐰 Normal (100%)' : '🐰 Normal (100%) – Tippen für 🐢 Langsam (75%)')
              : (playbackRate !== 1 ? `Tempo: ${Math.round(playbackRate * 100)}% (Tippen für nächstes Tempo)` : 'Tempo: 100% (Tippen zum Verlangsamen)')
          }
        >
          <span style={{ fontSize: isMobile ? (effectiveUiLevel === 'junior' ? '0.62rem' : '0.66rem') : (effectiveUiLevel === 'junior' ? '0.70rem' : '0.74rem'), fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {effectiveUiLevel === 'junior'
              ? (playbackRate < 1 ? '🐢 75' : '🐰 100')
              : Math.round(playbackRate * 100)
            }
          </span>
        </button>

        {/* ⭐ Favorite Button */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            style={{
              border: isFavorite ? '1.5px solid #f59e0b' : '1px solid #cbd5e1',
              background: isFavorite ? '#fef3c7' : '#ffffff',
              color: isFavorite ? '#d97706' : '#94a3b8',
              height: isMobile ? '30px' : '34px',
              width: isMobile ? '30px' : '34px',
              minWidth: isMobile ? '30px' : '34px',
              padding: 0,
              borderRadius: isMobile ? '8px' : '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isFavorite ? '0 1px 3px rgba(245, 158, 11, 0.2)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
              transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            className="hover-scale-mini"
            title={isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
          >
            <Star size={isMobile ? 14 : 15} strokeWidth={isFavorite ? 2.6 : 2} fill={isFavorite ? "#f59e0b" : "none"} color={isFavorite ? "#d97706" : "#94a3b8"} />
          </button>
        )}

        {/* ... More Tools Toggle Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsToolsOpen(prev => !prev);
          }}
          style={{
            border: isToolsOpen 
              ? (isIndigoPurple ? '1.5px solid #7c3aed' : '1.5px solid #16a34a') 
              : '1px solid #cbd5e1',
            background: isToolsOpen 
              ? (isIndigoPurple ? '#f3e8ff' : '#dcfce7') 
              : '#ffffff',
            color: isToolsOpen 
              ? (isIndigoPurple ? '#6d28d9' : '#15803d') 
              : '#64748b',
            height: isMobile ? '30px' : '34px',
            width: isMobile ? '30px' : '34px',
            minWidth: isMobile ? '30px' : '34px',
            padding: 0,
            borderRadius: isMobile ? '8px' : '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isToolsOpen 
              ? (isIndigoPurple ? '0 1px 3px rgba(109, 40, 217, 0.15)' : '0 1px 3px rgba(22, 163, 74, 0.15)') 
              : '0 1px 2px rgba(0, 0, 0, 0.02)',
            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          className="hover-scale-mini"
          title={isToolsOpen ? "Weitere Werkzeuge schließen" : "Weitere Werkzeuge & Aktionen anzeigen (...)"}
        >
          <MoreHorizontal size={isMobile ? 15 : 17} strokeWidth={isToolsOpen ? 2.6 : 2.2} />
        </button>
      </div>
  );

  return (
    <div
      style={{
        background: isPlaying
          ? (isShared ? "#dcfce7" : (isIndigoPurple ? "#faf5ff" : "#f0fdf4"))
          : (isShared ? "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)" : "#ffffff"),
        borderRadius: "16px",
        border: isPlaying
          ? (isShared ? "1.5px solid #22c55e" : (isIndigoPurple ? "1.5px solid #c4b5fd" : "1.5px solid #86efac"))
          : isHero
            ? (isIndigoPurple ? "2px solid #a855f7" : "2px solid #22c55e")
            : (isShared ? "1.5px solid #86efac" : "1px solid #e2e8f0"),
        padding: isMobile ? "8px 10px" : "8px 12px",
        width: "100%",
        boxShadow: isPlaying
          ? (isShared ? "0 4px 16px -2px rgba(22, 163, 74, 0.28)" : (isIndigoPurple ? "0 3px 12px -2px rgba(109, 40, 217, 0.2)" : "0 3px 12px -2px rgba(34, 197, 94, 0.2)"))
          : isHero
            ? (isIndigoPurple ? "0 4px 16px -2px rgba(168, 85, 247, 0.22), 0 2px 6px rgba(0, 0, 0, 0.04)" : "0 4px 16px -2px rgba(34, 197, 94, 0.22), 0 2px 6px rgba(0, 0, 0, 0.04)")
            : (isShared ? "0 4px 14px -2px rgba(22, 163, 74, 0.16), 0 1px 3px rgba(0, 0, 0, 0.02)" : "0 1px 3px rgba(0, 0, 0, 0.03)"),
        display: "flex",
        flexDirection: "column",
        gap: isToolsOpen ? "8px" : (isMobile ? "6px" : "0px"),
        boxSizing: "border-box",
        transition: "all 0.15s ease",
        position: "relative"
      }}
    >
      <audio ref={audioRef} src={resolvedUrl || undefined} preload="metadata" playsInline />

      {/* 🛡️ Instant Deleting Visual Feedback Overlay & Progress Bar */}
      {isDeleting && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 60,
            borderRadius: isHero ? '18px' : '14px',
            background: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px 24px',
            pointerEvents: 'all',
            boxShadow: 'inset 0 0 0 1.5px rgba(239, 68, 68, 0.3)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontWeight: 800, fontSize: '0.84rem' }}>
            <Loader2 size={18} className="animate-spin" />
            <span>Aufnahme wird sicher gelöscht...</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(deleteProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Löschfortschritt"
            style={{
              width: '100%',
              maxWidth: '220px',
              height: '6px',
              background: '#fee2e2',
              borderRadius: '999px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${Math.max(8, deleteProgress)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                borderRadius: '999px',
                transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 0 6px rgba(239, 68, 68, 0.4)'
              }}
            />
          </div>
        </div>
      )}

      {/* 1. Main Row: On Desktop, single line with title, waveform, time and action buttons */}
      {isMobile ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
          {playButtonElement}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
              {renderTitleAndBadges(false)}
              {renderTimeDisplay(false)}
            </div>
            {renderWaveform(false)}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", justifyContent: "space-between" }}>
          {playButtonElement}
          {renderTitleAndBadges(true)}
          {renderWaveform(true)}
          {renderTimeDisplay(true)}
          {renderActionButtons}
        </div>
      )}

      {/* Action Buttons Group (Only on Mobile as Row 2) */}
      {isMobile && renderActionButtons}
      {/* 2. Expanded Studio Drawer (toggled via ...) */}
      {isToolsOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            paddingTop: '8px',
            marginTop: '2px',
            borderTop: '1px dashed #e2e8f0',
            width: '100%',
            boxSizing: 'border-box',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none'
          }}
        >
          {/* ✏️ Benennung & Notizen bearbeiten */}
          {onRename && (
            <button
              type="button"
              onClick={handleOpenRenameModal}
              style={{
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: '0.74rem',
                fontWeight: 700,
                height: '32px',
                padding: '0 10px',
                borderRadius: '9px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                transition: 'all 0.15s ease',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}
              className="hover-scale-mini"
              title="Aufnahme benennen und Notizen bearbeiten"
            >
              <Edit3 size={13} strokeWidth={2.2} />
              <span>Umbenennen</span>
            </button>
          )}

          {/* 💬 Studio Timeline Notizen / Marker (SoundCloud-Style) */}
          <button
            type="button"
            onClick={() => {
              loadAudioBuffer().catch(() => {});
              setIsNotesModalOpen(true);
            }}
            style={{
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontSize: '0.74rem',
              fontWeight: 700,
              height: '32px',
              padding: '0 10px',
              borderRadius: '9px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
              transition: 'all 0.15s ease',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
            className="hover-scale-mini"
            title="Timeline-Notizen & Marker anzeigen oder hinzufügen"
            aria-label={`Notizen öffnen (${notesCount} Notizen vorhanden)`}
          >
            <MessageSquareQuote size={13} strokeWidth={2.2} />
            <span>{notesCount > 0 ? `Notizen (${notesCount})` : 'Notizen'}</span>
          </button>

          {/* 🎛️ A/B Loop-Studio */}
          <button
            type="button"
            onClick={() => setIsEditorOpen(true)}
            style={{
              border: loopLocator?.enabled ? '1.5px solid #a855f7' : '1px solid #cbd5e1',
              background: loopLocator?.enabled ? '#faf5ff' : '#ffffff',
              color: loopLocator?.enabled ? '#7c3aed' : '#334155',
              fontSize: '0.74rem',
              fontWeight: 700,
              height: '32px',
              padding: '0 10px',
              borderRadius: '9px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: loopLocator?.enabled ? '0 0 0 2px rgba(168, 85, 247, 0.15)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
              transition: 'all 0.15s ease',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
            className="hover-scale-mini"
            title={loopLocator?.enabled ? `A/B Loop aktiv (${Math.round(loopLocator.startSec)}s - ${Math.round(loopLocator.endSec)}s)` : 'A/B Loop-Schleife festlegen'}
            aria-label={loopLocator?.enabled ? `Loop-Studio öffnen (A/B Loop aktiv ${Math.round(loopLocator.startSec)} bis ${Math.round(loopLocator.endSec)} Sekunden)` : 'Loop-Studio öffnen'}
          >
            <SlidersHorizontal size={13} strokeWidth={2.2} />
            <span>Loop</span>
            {loopLocator?.enabled && (
              <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#7c3aed' }}>A/B</span>
            )}
          </button>

          {/* 👥 Duett-Deck (Dual Layer): Synchrones Play-Along Deck (nur bei aktivem Metronom mit BPM-Timecode) */}
          {onOpenDuettDeck && Boolean(metronomeBpm && metronomeBpm > 0) && (
            <button
              type="button"
              onClick={() => {
                setIsToolsOpen(false);
                onOpenDuettDeck();
              }}
              style={{
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: '0.74rem',
                fontWeight: 700,
                height: '32px',
                padding: '0 10px',
                borderRadius: '9px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                transition: 'all 0.15s ease',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}
              className="hover-scale-mini"
              title={`Duett-Deck (${metronomeBpm} BPM)`}
              aria-label={`Duett-Deck öffnen (${metronomeBpm} BPM)`}
            >
              <Layers size={13} strokeWidth={2.2} />
              <span>Duett</span>
            </button>
          )}

          {/* 📥 Download */}
          {allowDownload && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              style={{
                border: '1px solid #cbd5e1',
                background: isDownloading ? '#f8fafc' : '#ffffff',
                color: isDownloading ? '#94a3b8' : '#334155',
                fontSize: '0.74rem',
                fontWeight: 700,
                height: '32px',
                padding: '0 10px',
                borderRadius: '9px',
                cursor: isDownloading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                transition: 'all 0.15s ease',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}
              className="hover-scale-mini"
              title={isDownloading ? "Audio wird vorbereitet..." : "Audio-Datei herunterladen"}
            >
              <Download size={13} strokeWidth={2.2} />
              <span>{isDownloading ? 'Lädt...' : 'Download'}</span>
            </button>
          )}

          {/* 🗑️ Delete */}
          {onDelete && (
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setShowDeleteConfirmModal(true)}
              style={{
                border: '1px solid #fecaca',
                background: isDeleting ? '#fee2e2' : '#fff1f2',
                color: '#dc2626',
                fontSize: '0.74rem',
                fontWeight: 700,
                height: '32px',
                padding: '0 10px',
                borderRadius: '9px',
                cursor: isDeleting ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 1px 2px rgba(220, 38, 38, 0.06)',
                transition: 'all 0.15s ease',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                opacity: isDeleting ? 0.6 : 1
              }}
              className="hover-scale-mini"
              title={isDeleting ? "Wird gelöscht..." : "Audioaufnahme unwiderruflich löschen"}
            >
              {isDeleting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Löschen...</span>
                </>
              ) : (
                <>
                  <Trash2 size={13} strokeWidth={2.2} />
                  <span>Löschen</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* ✏️ Maske: Aufnahme benennen & Notizen bearbeiten */}
      {isRenameModalOpen && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsRenameModalOpen(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
            boxSizing: 'border-box'
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="rename-audio-modal-title"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px 26px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxSizing: 'border-box',
              position: 'relative'
            }}
          >
            {/* Header with Title & Close button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background: '#f1f5f9',
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Edit3 size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 id="rename-audio-modal-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    Aufnahme benennen
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                    Titel und persönliche Notizen für diese Aufnahme anpassen
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRenameModalOpen(false)}
                style={{
                  border: 'none',
                  background: '#f1f5f9',
                  borderRadius: '10px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale-mini"
                aria-label="Maske schließen"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveRenameAndNotes();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: 0 }}
            >
              {/* Name / Titel der Aufnahme */}
              <div>
                <label
                  htmlFor="recording-title-input"
                  style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}
                >
                  Titel der Aufnahme
                </label>
                <input
                  id="recording-title-input"
                  type="text"
                  value={modalTitleInput}
                  onChange={(e) => setModalTitleInput(e.target.value)}
                  placeholder="z. B. Take 1 – Strophe & Refrain"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    background: '#f8fafc',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
                />
              </div>

              {/* Notizen zur Aufnahme */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label
                    htmlFor="recording-notes-input"
                    style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}
                  >
                    Notizen & Übe-Hinweise
                  </label>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                    Optional
                  </span>
                </div>
                <textarea
                  id="recording-notes-input"
                  value={modalNotesInput}
                  onChange={(e) => setModalNotesInput(e.target.value)}
                  placeholder="z. B. Takt 12 noch holprig, Tempo bei 120 BPM halten, schöne Dynamik..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    color: '#0f172a',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    background: '#f8fafc',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    minHeight: '75px',
                    fontFamily: 'inherit',
                    lineHeight: 1.4,
                    transition: 'border-color 0.15s ease'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveRenameAndNotes();
                    }
                  }}
                />
              </div>

              {/* Buttons: Abbrechen & Speichern */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setIsRenameModalOpen(false)}
                  style={{
                    flex: 1,
                    height: '40px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale-mini"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1.3,
                    height: '40px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.2)',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale-mini"
                >
                  <Check size={16} strokeWidth={2.4} />
                  <span>Speichern</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div
          onClick={(e) => {
            if (!isDeleting) {
              setShowDeleteConfirmModal(false);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Aufnahme löschen Bestätigung"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: '#fee2e2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto'
              }}
            >
              {isDeleting ? (
                <Loader2 size={28} className="animate-spin" />
              ) : (
                <Trash2 size={28} />
              )}
            </div>

            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
              {isDeleting ? 'Aufnahme wird gelöscht...' : 'Aufnahme löschen?'}
            </h3>

            <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b', lineHeight: 1.4 }}>
              {isDeleting 
                ? `Die Aufnahme "${displayTitle}" wird sicher aus deinem Speicher und Tresor entfernt.`
                : `Möchtest du "${displayTitle}" wirklich unwiderruflich aus deinem Hausaufgabenheft & Tresor entfernen?`}
            </p>

            {/* 📊 Ladebalken / Progress Bar */}
            {isDeleting && (
              <div style={{ width: '100%', padding: '4px 0', marginTop: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Sicheres Löschen...</span>
                  <span>{Math.round(deleteProgress)}%</span>
                </div>
                <div 
                  role="progressbar" 
                  aria-valuenow={Math.round(deleteProgress)} 
                  aria-valuemin={0} 
                  aria-valuemax={100}
                  aria-label="Löschfortschritt"
                  style={{ width: '100%', height: '8px', background: '#fee2e2', borderRadius: '999px', overflow: 'hidden' }}
                >
                  <div 
                    style={{
                      width: `${Math.max(8, deleteProgress)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                      borderRadius: '999px',
                      transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 0 8px rgba(239, 68, 68, 0.4)'
                    }} 
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirmModal(false)}
                style={{
                  flex: 1,
                  height: '42px',
                  borderRadius: '14px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.5 : 1
                }}
                className="hover-scale-mini"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (isDeleting || !onDelete) return;
                  setIsDeleting(true);
                  setDeleteProgress(20);
                  const t1 = setTimeout(() => setDeleteProgress(55), 100);
                  const t2 = setTimeout(() => setDeleteProgress(85), 250);
                  try {
                    await Promise.resolve(onDelete());
                    setDeleteProgress(100);
                    setTimeout(() => {
                      setShowDeleteConfirmModal(false);
                    }, 150);
                  } catch (e) {
                    console.error('[InlineAudioPlayer] Delete error:', e);
                    clearTimeout(t1);
                    clearTimeout(t2);
                    setIsDeleting(false);
                    setDeleteProgress(0);
                  }
                }}
                style={{
                  flex: 1,
                  height: '42px',
                  borderRadius: '14px',
                  border: 'none',
                  background: isDeleting 
                    ? '#ef4444' 
                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  fontWeight: 950,
                  cursor: isDeleting ? 'wait' : 'pointer',
                  boxShadow: '0 2px 10px rgba(239, 68, 68, 0.35)',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                className="hover-scale-mini"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Wird gelöscht...</span>
                  </>
                ) : (
                  <span>Löschen</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Studio Waveform & Pitch Editor Modal */}
      {isEditorOpen && (
        <React.Suspense fallback={null}>
          <AudioEditorModal
            isOpen={isEditorOpen}
            onClose={() => setIsEditorOpen(false)}
            audioUrl={url || resolvedUrl}
            originalAudioUrl={originalAudioUrl || (url.startsWith('blob:') ? undefined : url)}
            initialLabel={displayTitle}
            initialDuration={duration}
            initialOriginalDuration={originalDuration}
            editorMode="locator"
            uiLevel={uiLevel || (typeof window !== 'undefined' ? (localStorage.getItem('campus_student_ui_level') as any) : null) || 'junior'}
            recordingId={persistentAudioKey || audioId || id}
            initialLocator={loopLocator}
            userId={typeof window !== 'undefined' ? (localStorage.getItem('campus_auth_user_id') || localStorage.getItem('auth_user_id') || undefined) : undefined}
            schoolId={typeof window !== 'undefined' ? (localStorage.getItem('campus_current_school_id') || localStorage.getItem('last_active_school_id') || undefined) : undefined}
            onSave={(res) => {
              // 1. Wiedergabe sofort stoppen und Playhead direkt auf Startpunkt A setzen
              stopWebAudioLoop(true);
              const startPos = res.loop_locator?.enabled ? (res.loop_locator.startSec || 0) : 0;
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = startPos;
              }
              setIsPlaying(false);
              setCurrentTime(startPos);

              // 2. Revisionssichere Spiegelung des Locators im lokalen State & SOFORTIGE AKTIVIERUNG
              if (res.loop_locator !== undefined) {
                setLoopLocator(res.loop_locator);
                if (res.loop_locator?.enabled) {
                  setIsLooping(true); // ⚡ SOFORTIGE AKTIVIERUNG DES A/B LOOPS
                } else if (res.loop_locator === null) {
                  setIsLooping(false);
                }
              }

              // 3. Veralteten AudioBuffer-Cache sofort leeren
              audioBufferRef.current = null;

              // 4. Neue gekürzte Dauer sofort im Player-State spiegeln
              if (res.duration && res.duration > 0) {
                setDuration(res.duration);
              }

              // 4. Neu gekürzten WAV-Blob sofort in den Player laden & vor-dekodieren
              if (res.url) {
                if (res.url.startsWith('campus_blob_') || res.url.startsWith('campus_audio_')) {
                  getBlob(res.url).then(raw => {
                    if (raw) {
                      const finalBlob = raw instanceof Blob ? raw : new Blob([raw], { type: 'audio/wav' });
                      const newBlobUrl = URL.createObjectURL(finalBlob);
                      setResolvedUrl(newBlobUrl);
                      getOrCreateAudioContext().then(ctx => {
                        const getAb = raw instanceof Blob ? raw.arrayBuffer() : Promise.resolve(raw as ArrayBuffer);
                        getAb.then(ab => {
                          safeDecodeAudioData(ctx, ab).then(decoded => {
                            const centered = ensureCenteredStereoAudioBuffer(ctx, decoded);
                            audioBufferRef.current = centered;
                            if (centered.duration && isFinite(centered.duration)) {
                              setDuration(Number(centered.duration.toFixed(2)));
                            }
                          }).catch(() => {});
                        });
                      });
                    }
                  }).catch(() => {});
                } else {
                  setResolvedUrl(res.url);
                }
              }

              if (onSaveEdited) {
                onSaveEdited(res);
              }
              setIsEditorOpen(false);
            }}
            onRevertToOriginal={onRevertToOriginal ? () => {
              onRevertToOriginal();
              setIsEditorOpen(false);
            } : undefined}
          />
        </React.Suspense>
      )}

      {/* 💬 Audio Timeline Notes & Markers Modal (SoundCloud-Style) */}
      {isNotesModalOpen && (
        <React.Suspense fallback={null}>
          <AudioNotesModal
            isOpen={isNotesModalOpen}
            onClose={() => setIsNotesModalOpen(false)}
            audioId={persistentAudioKey}
            audioUrl={resolvedUrl || url}
            title={displayTitle}
            initialDuration={duration}
            currentUserRole={badge?.toLowerCase().includes('lehrer') || isSharedWithTeacher ? 'teacher' : 'student'}
            waveformPeaks={peaks}
            initialAudioBuffer={audioBufferRef.current}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export const RetroCassettePlayer: React.FC<{ 
  id?: string;
  audioId?: string;
  url: string; 
  duration: number; 
  index: number; 
  label?: string; 
  onDelete?: () => void;
  visibility?: 'private' | 'shared_with_teacher';
  onToggleVisibility?: () => void;
  onShareToPlaylist?: () => void;
  isStudentView?: boolean;
}> = ({ id, audioId, url, duration, index, label, onDelete, visibility, onToggleVisibility, onShareToPlaylist, isStudentView }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '320px', gap: '8px' }}>
      <InlineAudioPlayer 
        id={id}
        audioId={audioId}
        url={url} 
        label={label || `Play-Along #${index + 1}`} 
        onDelete={onDelete}
        duration={duration}
      />

      {/* Student Action Toolbar: Privacy Toggle & Audio-Biografie Share */}
      {isStudentView && (
        <div style={{
          display: 'flex',
          gap: '6px',
          padding: '6px 8px',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Privacy Toggle Button */}
          {onToggleVisibility && (
            <button
              type="button"
              onClick={onToggleVisibility}
              title={visibility === 'shared_with_teacher' 
                ? 'Für Lehrer freigegeben (Klicken zum Privatschalten)' 
                : 'Privat (Klicken, um für Lehrer freizugeben)'}
              style={{
                background: visibility === 'shared_with_teacher' ? '#e6f4ea' : '#f1f5f9',
                color: visibility === 'shared_with_teacher' ? '#16a34a' : '#475569',
                border: visibility === 'shared_with_teacher' ? '1px solid #bbf7d0' : '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '5px 8px',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                flex: 1,
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              {visibility === 'shared_with_teacher' ? (
                <>
                  <Unlock size={12} />
                  <span>🎓 Für Lehrer sichtbar</span>
                </>
              ) : (
                <>
                  <Lock size={12} />
                  <span>🔒 Privat (Nur für dich)</span>
                </>
              )}
            </button>
          )}

          {/* Share to Audio-Biografie Button */}
          {onShareToPlaylist && (
            <button
              type="button"
              onClick={onShareToPlaylist}
              title="Zu einer Playlist in der Audio-Biografie hinzufügen"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '5px 8px',
                fontSize: '0.68rem',
                fontWeight: 850,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 5px rgba(99, 102, 241, 0.25)',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale-mini"
            >
              <Share2 size={12} />
              <span>💽 Playlist</span>
            </button>
          )}
        </div>
      )}

      {/* Teacher View: Indicator that this is a shared student recording */}
      {!isStudentView && visibility === 'shared_with_teacher' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px',
          fontSize: '0.68rem',
          fontWeight: 800,
          color: '#16a34a',
          background: '#e6f4ea',
          padding: '4px 8px',
          borderRadius: '8px',
          border: '1px solid #bbf7d0'
        }}>
          <Check size={12} />
          <span>Vom Schüler für dich freigegeben</span>
        </div>
      )}
    </div>
  );
};

export const MechanicalMetronomeIcon: React.FC<{ size?: number; color?: string; strokeWidth?: number }> = ({ 
  size = 18, 
  color = "currentColor", 
  strokeWidth = 2 
}) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {/* Precision pyramid body */}
    <path d="M5.5 21h13l-3.8-15.5a1 1 0 0 0-.97-.8h-3.46a1 1 0 0 0-.97.8L5.5 21z" />
    {/* Center pendulum slot */}
    <path d="M12 7.5v10.5" strokeOpacity={0.45} />
    {/* Swinging pendulum arm */}
    <path d="M12 18l4.2-9.5" />
    {/* Sliding tempo weight / bob */}
    <rect x="14.2" y="10" width="3.4" height="2.4" rx="0.7" fill={color} strokeWidth={0} />
  </svg>
);

