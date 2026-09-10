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
  RotateCcw,
  X,
  Layers
} from 'lucide-react';
import { getBlob } from '../../../utils/blobStorage';
import { formatHarmonizedAudioTitle } from '../../../utils/audioNamingHelper';

const AudioEditorModal = React.lazy(() => import('../../campus/AudioEditorModal').then(m => ({ default: m.AudioEditorModal })));

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

// Lightweight WebAudio beep helper for 4-beat count-in
export const playCountInBeep = (isAccent: boolean) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isAccent ? 960 : 640, ctx.currentTime);
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
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
  const [resolvedUrl, setResolvedUrl] = useState<string>(url);
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
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      notifyGlobalPlay();
      audioRef.current.play().then(() => setIsPlaying(true)).catch(err => console.warn('[MasterworkAudioCapsule] Play err:', err));
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
      <audio ref={audioRef} src={resolvedUrl} />

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
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            border: '1px solid #fecdd3',
            background: '#fff1f2',
            color: '#dc2626',
            cursor: 'pointer',
            height: '24px',
            width: '24px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
          title="Meisterwerk-Aufnahme löschen"
        >
          <Trash2 size={12} strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
};

export interface InlineAudioPlayerProps {
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
  onSaveEdited?: (result: { url: string; duration: number; label: string; mode: 'overwrite' | 'duplicate' }) => void;
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
}

export const InlineAudioPlayer: React.FC<InlineAudioPlayerProps> = ({ 
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
  metronomeBpm
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number>(initialDuration || 0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [countInActive, setCountInActive] = useState(false);
  const [countInStep, setCountInStep] = useState<number | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string>(url);
  const [isSongPickerOpen, setIsSongPickerOpen] = useState(false);
  const [songSearchInput, setSongSearchInput] = useState('');
  const songPickerRef = React.useRef<HTMLDivElement | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const countInTimerRef = React.useRef<any>(null);
  const playerIdRef = React.useRef<string>(`player_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`);
  const checkIsMobile = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || Boolean(typeof document !== 'undefined' && document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait'));
  };
  const [isMobile, setIsMobile] = useState(checkIsMobile);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitleInput, setEditedTitleInput] = useState('');

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

  const handleSaveRename = () => {
    const trimmed = editedTitleInput.trim();
    if (trimmed && onRename && trimmed !== displayTitle) {
      onRename(trimmed);
    }
    setIsEditingTitle(false);
  };

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
          clearTimeout(countInTimerRef.current);
          countInTimerRef.current = null;
          setCountInStep(null);
        }
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
      }).catch(err => console.warn('[InlineAudioPlayer] Blob load note:', err));
    } else {
      setResolvedUrl(url);
    }

    return () => {
      active = false;
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
      if (countInTimerRef.current) clearTimeout(countInTimerRef.current);
    };
  }, [url]);

  // 🔁 Seamless Gapless Native Loop
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping]);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (countInTimerRef.current) {
      clearTimeout(countInTimerRef.current);
      countInTimerRef.current = null;
      setCountInStep(null);
      return;
    }
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      notifyGlobalPlay();
      if (audioRef.current.ended || (duration > 0 && audioRef.current.currentTime >= duration)) {
        audioRef.current.currentTime = 0;
      }
      if (countInActive) {
        let step = 4;
        setCountInStep(step);
        playCountInBeep(true);

        const runCount = () => {
          step -= 1;
          if (step > 0) {
            setCountInStep(step);
            playCountInBeep(false);
            countInTimerRef.current = setTimeout(runCount, 550);
          } else {
            setCountInStep(null);
            countInTimerRef.current = null;
            if (audioRef.current) {
              if (audioRef.current.ended || (duration > 0 && audioRef.current.currentTime >= duration)) {
                audioRef.current.currentTime = 0;
              }
              audioRef.current.loop = isLooping;
              audioRef.current.play().then(() => setIsPlaying(true)).catch(err => console.warn('[InlineAudioPlayer] Play error:', err));
            }
          }
        };
        countInTimerRef.current = setTimeout(runCount, 550);
      } else {
        audioRef.current.loop = isLooping;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(err => console.warn('[InlineAudioPlayer] Play error:', err));
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
      setCurrentTime(audio.currentTime);
    };
    const handleEnded = () => {
      if (!isLooping) {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    if (audio.duration && isFinite(audio.duration)) {
      setDuration(Math.round(audio.duration));
    }

    audio.loop = isLooping;
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [resolvedUrl, isLooping]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      (audioRef.current as any).preservesPitch = true;
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

      // Determine extension from MIME type
      const mime = (finalBlob.type || '').toLowerCase();
      if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) {
        detectedExt = 'm4a';
      } else if (mime.includes('mp3') || mime.includes('mpeg')) {
        detectedExt = 'mp3';
      } else if (mime.includes('wav')) {
        detectedExt = 'wav';
      } else if (mime.includes('ogg')) {
        detectedExt = 'ogg';
      } else {
        detectedExt = 'webm';
      }

      const safeTitle = (displayTitle || 'Aufnahme').replace(/[^a-zA-Z0-9äöüÄÖÜß_#\.-]/g, '_');
      const filename = `${safeTitle}.${detectedExt}`;

      // 2. Try native Operating System "Speichern unter..." Picker (Chrome, Chromium, Edge on Mac & Windows)
      if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [
              {
                description: 'Audioaufnahme',
                accept: { [finalBlob.type || 'audio/webm']: [`.${detectedExt}`] }
              }
            ]
          });
          const writable = await handle.createWritable();
          await writable.write(finalBlob);
          await writable.close();
          return;
        } catch (pickerErr: any) {
          if (pickerErr?.name === 'AbortError') {
            return;
          }
        }
      }

      // 3. Fallback: Force Same-Origin Blob Download Anchor (Safari, Firefox, Mobile)
      const blobUrl = URL.createObjectURL(finalBlob);
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
      const anchor = document.createElement('a');
      anchor.style.display = 'none';
      anchor.href = resolvedUrl;
      anchor.download = `${(displayTitle || 'Aufnahme').replace(/[^a-zA-Z0-9äöüÄÖÜß_#\.-]/g, '_')}.webm`;
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

  const renderWaveform = (isDesktop: boolean) => (
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
        display: "flex",
        alignItems: "center",
        gap: "2px",
        height: "16px",
        cursor: "pointer",
        width: "100%",
        maxWidth: isDesktop ? "160px" : "160px",
        minWidth: isDesktop ? "70px" : undefined,
        flex: isDesktop ? 1 : undefined
      }}
      title="Tippen zum Spulen"
    >
      {waveformHeights.slice(0, 16).map((h, i) => {
        const barRatio = i / 16;
        const isFilled = barRatio <= progressRatio;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              minWidth: "2.5px",
              height: `${Math.max(25, h)}%`,
              borderRadius: "1.5px",
              background: isFilled
                ? (isIndigoPurple ? (isPlaying ? "#7c3aed" : "#6d28d9") : (isPlaying ? "#16a34a" : "#15803d"))
                : (isShared ? "#bbf7d0" : "#e2e8f0"),
              transition: "background 0.1s ease"
            }}
          />
        );
      })}
    </div>
  );

  const renderTimeDisplay = (isDesktop: boolean) => (
    <span style={{
      fontSize: "0.68rem",
      fontWeight: 750,
      color: "#64748b",
      fontVariantNumeric: "tabular-nums",
      flexShrink: 0,
      minWidth: isDesktop ? "64px" : "68px",
      textAlign: "right"
    }}>
      {formatTime(currentTime)} / {formatTime(duration)}
    </span>
  );

  const renderActionButtons = (
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '3px' : '5px', flexShrink: 0 }}>
        {/* 🔁 Loop Toggle (Icon only) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsLooping(!isLooping);
          }}
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
            boxShadow: isLooping 
              ? (isIndigoPurple ? '0 1px 3px rgba(109, 40, 217, 0.2)' : '0 1px 3px rgba(22, 163, 74, 0.2)') 
              : '0 1px 2px rgba(0, 0, 0, 0.02)',
            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          className="hover-scale-mini"
          title={isLooping ? "Loop aktiv (Endlos-Wiedergabe) – Tippen zum Deaktivieren" : "Loop aktivieren (Endlos-Wiedergabe)"}
        >
          <Repeat size={isMobile ? 14 : 15} strokeWidth={isLooping ? 2.6 : 2.2} />
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

        {/* 🎛️ Tempo Button (100, 85, 75, 50) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const rates = [1, 0.85, 0.75, 0.5];
            const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
            setPlaybackRate(nextRate);
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
            width: isMobile ? '32px' : '36px',
            minWidth: isMobile ? '32px' : '36px',
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
          title={playbackRate !== 1 ? `Tempo: ${Math.round(playbackRate * 100)}% (Tippen für nächstes Tempo)` : "Tempo: 100% (Tippen für 85%, 75%, 50%)"}
        >
          <span style={{ fontSize: isMobile ? '0.66rem' : '0.74rem', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {Math.round(playbackRate * 100)}
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
          : (isShared ? "1.5px solid #86efac" : "1px solid #e2e8f0"),
        padding: isMobile ? "8px 10px" : "8px 12px",
        width: "100%",
        boxShadow: isPlaying
          ? (isShared ? "0 4px 16px -2px rgba(22, 163, 74, 0.28)" : (isIndigoPurple ? "0 3px 12px -2px rgba(109, 40, 217, 0.2)" : "0 3px 12px -2px rgba(34, 197, 94, 0.2)"))
          : (isShared ? "0 4px 14px -2px rgba(22, 163, 74, 0.16), 0 1px 3px rgba(0, 0, 0, 0.02)" : "0 1px 3px rgba(0, 0, 0, 0.03)"),
        display: "flex",
        flexDirection: "column",
        gap: isToolsOpen ? "8px" : (isMobile ? "6px" : "0px"),
        boxSizing: "border-box",
        transition: "all 0.15s ease",
        position: "relative"
      }}
    >
      <audio ref={audioRef} src={resolvedUrl} />

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
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            paddingTop: '8px',
            marginTop: '2px',
            borderTop: '1px dashed #e2e8f0',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {/* Left: Creative & Studio Tools */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            {/* ✏️ Benennung bearbeiten */}
            {onRename && (
              <button
                type="button"
                onClick={() => {
                  setEditedTitleInput(displayTitle);
                  setIsEditingTitle(true);
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
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale-mini"
                title="Titel dieser Aufnahme umbenennen"
              >
                <Edit3 size={13} strokeWidth={2.2} color="#475569" />
                <span>Umbenennen</span>
              </button>
            )}

            {/* ✂️ Studio Trimmer */}
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              style={{
                border: '1px solid #ddd6fe',
                background: '#f5f3ff',
                color: '#6366f1',
                fontSize: '0.74rem',
                fontWeight: 700,
                height: '32px',
                padding: '0 10px',
                borderRadius: '9px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 1px 2px rgba(99, 102, 241, 0.08)',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale-mini"
              title="Audio zuschneiden, einblenden & Pitch anpassen"
            >
              <Scissors size={13} strokeWidth={2.2} />
              <span>Zuschneiden</span>
            </button>

            {/* 👥 Duett-Deck (Dual Layer): Streng konditioniert – nur bei Aufnahme mit Metronom-Grid */}
            {onOpenDuettDeck && Boolean(metronomeBpm) && (
              <button
                type="button"
                onClick={() => {
                  setIsToolsOpen(false);
                  onOpenDuettDeck();
                }}
                style={{
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: isIndigoPurple ? '#6d28d9' : '#15803d',
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
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale-mini"
                title={`Duett-Deck: Mitspielen & Abgleichen (${metronomeBpm} BPM)`}
              >
                <Layers size={13} strokeWidth={2.2} />
                <span>Duett-Deck</span>
              </button>
            )}

            {/* ↩️ Original wiederherstellen (Non-destructive revert) */}
            {originalAudioUrl && onRevertToOriginal && (
              <button
                type="button"
                onClick={onRevertToOriginal}
                style={{
                  border: '1px solid #fed7aa',
                  background: '#fff7ed',
                  color: '#ea580c',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  height: '32px',
                  padding: '0 10px',
                  borderRadius: '9px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 1px 2px rgba(234, 88, 12, 0.08)',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale-mini"
                title="Gekürzten Zuschnitt verwerfen und ungeschnittenes Original wiederherstellen"
              >
                <RotateCcw size={13} strokeWidth={2.2} />
                <span>Original</span>
              </button>
            )}
          </div>

          {/* Right: Action & Management Tools (Download & Delete) */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            {/* 📥 Download */}
            {allowDownload && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                style={{
                  border: '1px solid #cbd5e1',
                  background: isDownloading ? '#f8fafc' : '#ffffff',
                  color: isDownloading ? '#94a3b8' : '#475569',
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
                  transition: 'all 0.15s ease'
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
                onClick={() => setShowDeleteConfirmModal(true)}
                style={{
                  border: '1px solid #fee2e2',
                  background: '#fff1f2',
                  color: '#e11d48',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  height: '32px',
                  padding: '0 10px',
                  borderRadius: '9px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 1px 2px rgba(225, 29, 72, 0.05)',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale-mini"
                title="Audioaufnahme unwiderruflich löschen"
              >
                <Trash2 size={13} strokeWidth={2.2} />
                <span>Löschen</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div
          onClick={(e) => e.stopPropagation()}
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
              <Trash2 size={28} />
            </div>

            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
              Aufnahme löschen?
            </h3>

            <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b', lineHeight: 1.4 }}>
              Möchtest du &quot;{displayTitle}&quot; wirklich unwiderruflich aus deinem Hausaufgabenheft & Tresor entfernen?
            </p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
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
                  cursor: 'pointer'
                }}
                className="hover-scale-mini"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  if (onDelete) onDelete();
                }}
                style={{
                  flex: 1,
                  height: '42px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  fontWeight: 950,
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(239, 68, 68, 0.35)',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale-mini"
              >
                Löschen
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
            audioUrl={resolvedUrl}
            originalAudioUrl={originalAudioUrl}
            initialLabel={displayTitle}
            initialDuration={duration}
            initialOriginalDuration={originalDuration}
            onSave={(res) => {
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
    </div>
  );
};

export const RetroCassettePlayer: React.FC<{ 
  url: string; 
  duration: number; 
  index: number; 
  label?: string; 
  onDelete?: () => void;
  visibility?: 'private' | 'shared_with_teacher';
  onToggleVisibility?: () => void;
  onShareToPlaylist?: () => void;
  isStudentView?: boolean;
}> = ({ url, duration, index, label, onDelete, visibility, onToggleVisibility, onShareToPlaylist, isStudentView }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '320px', gap: '8px' }}>
      <InlineAudioPlayer 
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

