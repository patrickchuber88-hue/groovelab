import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Trash2, Mic, Repeat, Timer, Scissors } from 'lucide-react';
import { getBlob, storeBlob } from '../utils/blobStorage';
import { AudioEditorModal } from './campus/AudioEditorModal';

export interface AudioTrackItem {
  url: string;
  label: string;
  duration?: number;
  idx?: number;
  originalIdx?: number;
}

interface AudioTrackCarouselProps {
  tracks: AudioTrackItem[];
  onDelete?: (originalIdx: number) => void;
  readOnly?: boolean;
  layoutMode?: 'carousel' | 'vertical-list';
}

// Lightweight WebAudio beep helper for 4-beat count-in
const playCountInBeep = (isAccent: boolean) => {
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

// 32 organic voice-memo waveform amplitude heights (0–100%)
const ORGANIC_WAVEFORM = [
  25, 45, 65, 35, 55, 85, 95, 70, 45, 65,
  80, 100, 90, 65, 50, 75, 85, 60, 90, 75,
  45, 65, 85, 95, 75, 55, 85, 65, 45, 70,
  50, 30
];

export const AudioTrackCarousel: React.FC<AudioTrackCarouselProps> = ({
  tracks,
  onDelete,
  readOnly = false,
  layoutMode = 'vertical-list'
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeIndex >= tracks.length && tracks.length > 0) {
      setActiveIndex(tracks.length - 1);
    }
  }, [tracks.length, activeIndex]);

  if (!tracks || tracks.length === 0) return null;

  if (layoutMode === 'vertical-list') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '0 2px 2px 2px'
        }}>
          <Mic size={12} style={{ color: '#16a34a' }} />
          <span style={{
            fontSize: '0.70rem',
            fontWeight: 850,
            color: '#166534',
            letterSpacing: '-0.01em'
          }}>
            Unterrichtsaufnahmen ({tracks.length})
          </span>
        </div>

        {tracks.map((track, idx) => {
          const targetIdx = track.originalIdx !== undefined ? track.originalIdx : track.idx;
          return (
            <CompactAudioStrip
              key={`${track.url}-${idx}`}
              url={track.url}
              label={track.label || `Aufnahme #${idx + 1}`}
              duration={track.duration}
              trackIndex={idx}
              onDelete={!readOnly && onDelete && targetIdx !== undefined ? () => onDelete(targetIdx) : undefined}
            />
          );
        })}
      </div>
    );
  }

  const currentTrack = tracks[activeIndex] || tracks[0];

  const switchTrack = (newIndex: number) => {
    setIsTransitioning(true);
    setActiveIndex(newIndex);
    setTimeout(() => setIsTransitioning(false), 180);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    switchTrack((activeIndex - 1 + tracks.length) % tracks.length);
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    switchTrack((activeIndex + 1) % tracks.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
    touchEndXRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    const minSwipeDistance = 35;

    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  const handleDeleteCurrent = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete) return;
    const targetIdx = currentTrack.originalIdx !== undefined ? currentTrack.originalIdx : currentTrack.idx;
    if (targetIdx !== undefined) {
      onDelete(targetIdx);
    }
  };

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        width: '100%',
        position: 'relative',
        boxSizing: 'border-box'
      }}
    >
      <AppleSplitCapsulePlayer
        key={`${currentTrack.url}-${activeIndex}`}
        url={currentTrack.url}
        label={currentTrack.label || `Aufnahme #${activeIndex + 1}`}
        duration={currentTrack.duration}
        trackIndex={activeIndex}
        totalTracks={tracks.length}
        isTransitioning={isTransitioning}
        onPrev={tracks.length > 1 ? handlePrev : undefined}
        onNext={tracks.length > 1 ? handleNext : undefined}
        onSelectIndex={switchTrack}
        onDelete={!readOnly && onDelete ? handleDeleteCurrent : undefined}
      />
    </div>
  );
};

interface CompactAudioStripProps {
  url: string;
  label: string;
  duration?: number;
  trackIndex: number;
  onDelete?: () => void;
  onSaveEdited?: (result: { url: string; duration: number; label: string; mode: 'overwrite' | 'duplicate' }) => void;
}

const CompactAudioStrip: React.FC<CompactAudioStripProps> = ({
  url,
  label,
  duration: initialDuration,
  trackIndex,
  onDelete,
  onSaveEdited
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const countInTimerRef = useRef<any>(null);
  const playerIdRef = useRef<string>(`carousel_strip_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`);

  const notifyGlobalPlay = () => {
    window.dispatchEvent(new CustomEvent('campus-global-audio-play', { detail: { playerId: playerIdRef.current } }));
  };

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
      getBlob(url).then((raw: any) => {
        if (active && raw) {
          const finalBlob = raw instanceof Blob ? raw : new Blob([raw], { type: 'audio/webm' });
          createdBlobUrl = URL.createObjectURL(finalBlob);
          setResolvedUrl(createdBlobUrl);
        }
      }).catch((err: any) => console.warn('[CompactAudioStrip] Blob load note:', err));
    } else {
      setResolvedUrl(url);
    }

    return () => {
      active = false;
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
      if (countInTimerRef.current) clearTimeout(countInTimerRef.current);
    };
  }, [url]);

  // 🔁 Seamless Native Gapless Loop
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
              audioRef.current.loop = isLooping;
              audioRef.current.play().then(() => setIsPlaying(true)).catch(err => console.warn('[CompactAudioStrip] Play error:', err));
            }
          }
        };
        countInTimerRef.current = setTimeout(runCount, 550);
      } else {
        audioRef.current.loop = isLooping;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(err => console.warn('[CompactAudioStrip] Play error:', err));
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

  const progressRatio = duration > 0 ? currentTime / duration : 0;

  return (
    <div 
      style={{
        background: isPlaying ? '#f0fdf4' : '#ffffff',
        borderRadius: '12px',
        border: isPlaying ? '1px solid #86efac' : '1px solid #e2e8f0',
        padding: '6px 10px',
        width: '100%',
        boxShadow: isPlaying 
          ? '0 3px 12px -2px rgba(34, 197, 94, 0.2)' 
          : '0 1px 3px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        boxSizing: 'border-box',
        transition: 'all 0.15s ease',
        position: 'relative'
      }}
    >
      <audio ref={audioRef} src={resolvedUrl} />

      {/* Play/Pause Button or Count-In Overlay */}
      <button
        type="button"
        onClick={togglePlay}
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: countInStep !== null 
            ? '#f59e0b' 
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
            ? '0 0 8px rgba(34, 197, 94, 0.4)' 
            : '0 2px 5px rgba(22, 163, 74, 0.25)',
          transition: 'all 0.15s ease',
          padding: 0,
          fontSize: countInStep !== null ? '0.74rem' : undefined,
          fontWeight: 900
        }}
        className="hover-scale"
        title={countInStep !== null ? `Einzähler: ${countInStep}` : (isPlaying ? 'Pause' : 'Abspielen')}
      >
        {countInStep !== null ? (
          <span>{countInStep}</span>
        ) : isPlaying ? (
          <Pause size={11} fill="currentColor" strokeWidth={0} />
        ) : (
          <Play size={11} fill="currentColor" strokeWidth={0} style={{ marginLeft: '1px' }} />
        )}
      </button>

      {/* Middle: Title, Waveform, Time */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
          <span style={{
            fontSize: '0.74rem',
            fontWeight: 800,
            color: '#0f172a',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {label || `Aufnahme #${trackIndex + 1}`}
          </span>

          <span style={{
            fontSize: '0.64rem',
            fontWeight: 750,
            color: '#64748b',
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0
          }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Mini Waveform with Klick-zu-Position Scrubbing */}
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
            gap: '1.5px',
            height: '10px',
            cursor: 'pointer',
            width: '100%'
          }}
          title="Tippen zum Spulen"
        >
          {ORGANIC_WAVEFORM.slice(0, 24).map((h, i) => {
            const barRatio = i / 24;
            const isFilled = barRatio <= progressRatio;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  minWidth: '2px',
                  height: `${Math.max(25, h)}%`,
                  borderRadius: '1px',
                  background: isFilled ? '#16a34a' : '#e2e8f0',
                  transition: 'background 0.1s ease'
                }}
              />
            );
          })}
        </div>
      </div>

      {/* 🔁 Loop Toggle Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsLooping(!isLooping);
        }}
        style={{
          border: isLooping ? '1.2px solid #16a34a' : '1px solid #cbd5e1',
          background: isLooping ? '#dcfce7' : '#ffffff',
          color: isLooping ? '#15803d' : '#94a3b8',
          fontSize: '0.60rem',
          padding: '3px 5px',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
        className="hover-scale-mini"
        title={isLooping ? 'Loop aktiv (Endlos-Schleife)' : 'Loop aktivieren (Endlos-Schleife für Play-Alongs)'}
      >
        <Repeat size={10} strokeWidth={isLooping ? 2.6 : 2} />
      </button>

      {/* ⏱️ 4-Beat Count-In Vorzähler Toggle */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setCountInActive(!countInActive);
        }}
        style={{
          border: countInActive ? '1.2px solid #16a34a' : '1px solid #cbd5e1',
          background: countInActive ? '#dcfce7' : '#ffffff',
          color: countInActive ? '#15803d' : '#94a3b8',
          fontSize: '0.58rem',
          fontWeight: 850,
          padding: '3px 5px',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '1px',
          flexShrink: 0
        }}
        className="hover-scale-mini"
        title={countInActive ? '4-Beat Einzähler aktiv' : '4-Beat Einzähler vor Abspielen aktivieren'}
      >
        <Timer size={10} strokeWidth={countInActive ? 2.4 : 2} />
        <span>4</span>
      </button>

      {/* Speed Button (Extended rates) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          const rates = [1, 0.85, 0.75, 0.5, 1.2];
          const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
          setPlaybackRate(nextRate);
        }}
        style={{
          border: '1px solid #cbd5e1',
          background: playbackRate !== 1 ? '#f0fdf4' : '#ffffff',
          color: playbackRate !== 1 ? '#15803d' : '#64748b',
          fontSize: '0.58rem',
          fontWeight: 850,
          padding: '2px 4px',
          borderRadius: '6px',
          cursor: 'pointer',
          flexShrink: 0
        }}
        className="hover-scale-mini"
        title="Tempo anpassen"
      >
        {playbackRate}×
      </button>

      {/* ✂️ Studio Trimmer Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditorOpen(true);
        }}
        style={{
          border: '1px solid #cbd5e1',
          background: '#ffffff',
          color: '#6366f1',
          padding: '3px 5px',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
        className="hover-scale-mini"
        title="Zuschneiden & Pitch"
      >
        <Scissors size={10} strokeWidth={2.2} />
      </button>

      {/* Delete Button */}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            border: 'none',
            background: 'none',
            color: '#ef4444',
            cursor: 'pointer',
            padding: '2px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.6,
            flexShrink: 0,
            transition: 'opacity 0.15s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
          title="Aufnahme entfernen"
        >
          <Trash2 size={12} />
        </button>
      )}

      {/* Audio Editor Modal */}
      {isEditorOpen && (
        <AudioEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          audioUrl={resolvedUrl}
          initialLabel={label || `Aufnahme #${trackIndex + 1}`}
          initialDuration={duration}
          onSave={(res) => {
            if (onSaveEdited) {
              onSaveEdited(res);
            }
            setIsEditorOpen(false);
          }}
        />
      )}
    </div>
  );
};

interface AppleSplitCapsulePlayerProps {
  url: string;
  label: string;
  duration?: number;
  trackIndex: number;
  totalTracks: number;
  isTransitioning?: boolean;
  onPrev?: (e?: React.MouseEvent) => void;
  onNext?: (e?: React.MouseEvent) => void;
  onSelectIndex?: (idx: number) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

const AppleSplitCapsulePlayer: React.FC<AppleSplitCapsulePlayerProps> = ({
  url,
  label,
  duration: initialDuration,
  trackIndex,
  totalTracks,
  isTransitioning = false,
  onPrev,
  onNext,
  onDelete
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
  const [isHovered, setIsHovered] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const countInTimerRef = useRef<any>(null);
  const playerIdRef = useRef<string>(`carousel_capsule_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`);

  const notifyGlobalPlay = () => {
    window.dispatchEvent(new CustomEvent('campus-global-audio-play', { detail: { playerId: playerIdRef.current } }));
  };

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
      getBlob(url).then((raw: any) => {
        if (active && raw) {
          const finalBlob = raw instanceof Blob ? raw : new Blob([raw], { type: 'audio/webm' });
          createdBlobUrl = URL.createObjectURL(finalBlob);
          setResolvedUrl(createdBlobUrl);
        }
      }).catch((err: any) => console.warn('[SplitCapsulePlayer] Blob load note:', err));
    } else {
      setResolvedUrl(url);
    }

    return () => {
      active = false;
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
      if (countInTimerRef.current) clearTimeout(countInTimerRef.current);
    };
  }, [url]);

  // 🔁 Seamless Native Gapless Loop
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
              audioRef.current.loop = isLooping;
              audioRef.current.play().then(() => setIsPlaying(true)).catch(err => console.warn('[Audio] Play error:', err));
            }
          }
        };
        countInTimerRef.current = setTimeout(runCount, 550);
      } else {
        audioRef.current.loop = isLooping;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(err => console.warn('[Audio] Play error:', err));
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

  const progressRatio = duration > 0 ? currentTime / duration : 0;

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '10px 12px',
        width: '100%',
        boxShadow: isPlaying 
          ? '0 6px 20px -4px rgba(34, 197, 94, 0.15), 0 2px 6px -1px rgba(0,0,0,0.04)' 
          : '0 2px 8px -2px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxSizing: 'border-box',
        position: 'relative',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: isTransitioning ? 0.75 : 1,
        transform: isTransitioning ? 'scale(0.992)' : 'scale(1)'
      }}
    >
      <audio ref={audioRef} src={resolvedUrl} />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          height: '26px',
          padding: '0 8px',
          background: '#f0fdf4',
          borderRadius: '99px',
          border: '1px solid #bbf7d0',
          boxSizing: 'border-box'
        }}>
          <Mic size={12} style={{ color: '#16a34a' }} />
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 850,
            color: '#166534',
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap'
          }}>
            Unterrichtsaufnahmen
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {totalTracks > 1 && onPrev && onNext && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: '26px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '99px',
              padding: '1px 2px',
              boxSizing: 'border-box',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}>
              <button
                type="button"
                onClick={onPrev}
                style={{
                  width: '24px',
                  height: '22px',
                  border: 'none',
                  background: 'transparent',
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '99px',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale"
                title="Vorherige Aufnahme"
              >
                <ChevronLeft size={13} strokeWidth={2.5} />
              </button>

              <span style={{
                fontSize: '0.68rem',
                fontWeight: 850,
                color: '#475569',
                padding: '0 6px',
                userSelect: 'none',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {trackIndex + 1} / {totalTracks}
              </span>

              <button
                type="button"
                onClick={onNext}
                style={{
                  width: '24px',
                  height: '22px',
                  border: 'none',
                  background: 'transparent',
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '99px',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale"
                title="Nächste Aufnahme"
              >
                <ChevronRight size={13} strokeWidth={2.5} />
              </button>
            </div>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              style={{
                border: 'none',
                background: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.6,
                flexShrink: 0,
                transition: 'opacity 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
              title="Diese Aufnahme löschen"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box'
      }}>
        <button
          type="button"
          onClick={togglePlay}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: countInStep !== null
              ? '#f59e0b'
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
              ? '0 0 14px rgba(34, 197, 94, 0.5), 0 2px 6px rgba(0,0,0,0.1)' 
              : '0 2px 6px rgba(22, 163, 74, 0.28), inset 0 1px 1px rgba(255,255,255,0.4)',
            transition: 'all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: isPlaying ? 'scale(0.96)' : 'scale(1)',
            padding: 0,
            fontSize: countInStep !== null ? '0.82rem' : undefined,
            fontWeight: 900
          }}
          className="hover-scale"
          title={countInStep !== null ? `Einzähler: ${countInStep}` : (isPlaying ? 'Pause' : 'Abspielen')}
        >
          {countInStep !== null ? (
            <span>{countInStep}</span>
          ) : isPlaying ? (
            <Pause size={13} fill="currentColor" strokeWidth={0} />
          ) : (
            <Play size={13} fill="currentColor" strokeWidth={0} style={{ marginLeft: '2px' }} />
          )}
        </button>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              color: '#0f172a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {label || 'Aufnahme'}
            </span>

            <span style={{
              fontSize: '0.66rem',
              fontWeight: 750,
              color: '#64748b',
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0
            }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

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
              gap: '2px',
              height: '16px',
              cursor: 'pointer',
              width: '100%'
            }}
            title="Tippen zum Vor- oder Zurückspulen"
          >
            {ORGANIC_WAVEFORM.map((h, i) => {
              const barRatio = i / ORGANIC_WAVEFORM.length;
              const isFilled = barRatio <= progressRatio;
              const isHead = Math.abs(barRatio - progressRatio) < (1 / ORGANIC_WAVEFORM.length);

              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    minWidth: '2px',
                    height: `${Math.max(20, h)}%`,
                    borderRadius: '2px',
                    background: isFilled 
                      ? 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)' 
                      : '#e2e8f0',
                    boxShadow: isHead && isPlaying ? '0 0 6px rgba(34, 197, 94, 0.8)' : 'none',
                    transition: 'background 0.1s ease, height 0.15s ease'
                  }}
                />
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsLooping(!isLooping);
          }}
          style={{
            border: isLooping ? '1.2px solid #16a34a' : '1px solid #cbd5e1',
            background: isLooping ? '#dcfce7' : '#ffffff',
            color: isLooping ? '#15803d' : '#94a3b8',
            fontSize: '0.62rem',
            padding: '3px 5px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
          className="hover-scale-mini"
          title={isLooping ? 'Loop aktiv (Endlos-Schleife)' : 'Loop aktivieren (Endlos-Schleife für Play-Alongs)'}
        >
          <Repeat size={11} strokeWidth={isLooping ? 2.6 : 2} />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCountInActive(!countInActive);
          }}
          style={{
            border: countInActive ? '1.2px solid #16a34a' : '1px solid #cbd5e1',
            background: countInActive ? '#dcfce7' : '#ffffff',
            color: countInActive ? '#15803d' : '#94a3b8',
            fontSize: '0.60rem',
            fontWeight: 850,
            padding: '3px 5px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            flexShrink: 0
          }}
          className="hover-scale-mini"
          title={countInActive ? '4-Beat Einzähler aktiv' : '4-Beat Einzähler vor Abspielen aktivieren'}
        >
          <Timer size={11} strokeWidth={countInActive ? 2.4 : 2} />
          <span>4</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const rates = [1, 0.85, 0.75, 0.5, 1.2];
            const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
            setPlaybackRate(nextRate);
          }}
          style={{
            border: '1px solid #cbd5e1',
            background: playbackRate !== 1 ? '#f0fdf4' : '#ffffff',
            color: playbackRate !== 1 ? '#15803d' : '#64748b',
            fontSize: '0.62rem',
            fontWeight: 850,
            padding: '3px 5px',
            borderRadius: '6px',
            cursor: 'pointer',
            flexShrink: 0
          }}
          className="hover-scale-mini"
          title="Wiedergabegeschwindigkeit ändern"
        >
          {playbackRate}×
        </button>

        {/* ✂️ Studio Trimmer Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditorOpen(true);
          }}
          style={{
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#6366f1',
            padding: '3px 5px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
          className="hover-scale-mini"
          title="Zuschneiden & Pitch"
        >
          <Scissors size={11} strokeWidth={2.2} />
        </button>
      </div>

      {/* Audio Editor Modal */}
      {isEditorOpen && (
        <AudioEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          audioUrl={resolvedUrl}
          initialLabel={label || 'Aufnahme'}
          initialDuration={duration}
          onSave={(_res) => {
            setIsEditorOpen(false);
          }}
        />
      )}
    </div>
  );
};
