import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Trash2, Mic } from 'lucide-react';
import { getBlob } from '../utils/blobStorage';

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
}

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
  readOnly = false
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
  const [resolvedUrl, setResolvedUrl] = useState<string>(url);
  const [isHovered, setIsHovered] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    };
  }, [url]);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(err => console.warn('[Audio] Play error:', err));
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
      setIsPlaying(false);
      setCurrentTime(0);
    };

    if (audio.duration && isFinite(audio.duration)) {
      setDuration(Math.round(audio.duration));
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [resolvedUrl]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
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

      {/* ─── ROW 1: Header / Category Badge & Track Selector / Delete ──────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Label Badge */}
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

        {/* Right actions: Selector and/or Delete */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Daumenfreundlicher Track-Wechsler (nur bei >1 Track) */}
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
                title="Vorherige Aufnahme (Endlos-Loop)"
              >
                <ChevronLeft size={14} strokeWidth={3} />
              </button>

              <span style={{
                fontSize: '0.70rem',
                fontWeight: 900,
                color: '#15803d',
                padding: '0 4px',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
                userSelect: 'none'
              }}>
                {trackIndex + 1}/{totalTracks}
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
                title="Nächste Aufnahme (Endlos-Loop)"
              >
                <ChevronRight size={14} strokeWidth={3} />
              </button>
            </div>
          )}

          {/* Delete (Trash) */}
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

      {/* ─── ROW 2: Player Controls, Waveform, Time & Speed ─────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box'
      }}>
        {/* Play Button */}
        <button
          type="button"
          onClick={togglePlay}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: isPlaying 
              ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' 
              : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
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
            padding: 0
          }}
          className="hover-scale"
          title={isPlaying ? 'Pause' : 'Abspielen'}
        >
          {isPlaying ? (
            <Pause size={13} fill="currentColor" strokeWidth={0} />
          ) : (
            <Play size={13} fill="currentColor" strokeWidth={0} style={{ marginLeft: '2px' }} />
          )}
        </button>

        {/* Middle: Title/Time + 32-Bar Waveform */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {/* Top Line: Track title + time */}
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

          {/* 32-Bar Voice-Memo Waveform */}
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

        {/* Speed Pill */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const rates = [1, 1.25, 1.5, 0.75];
            const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
            setPlaybackRate(nextRate);
          }}
          style={{
            border: '1px solid #cbd5e1',
            background: playbackRate !== 1 ? '#f0fdf4' : '#ffffff',
            color: playbackRate !== 1 ? '#15803d' : '#64748b',
            fontSize: '0.62rem',
            fontWeight: 850,
            padding: '2px 5px',
            borderRadius: '6px',
            cursor: 'pointer',
            flexShrink: 0
          }}
          className="hover-scale-mini"
          title="Wiedergabegeschwindigkeit ändern"
        >
          {playbackRate}×
        </button>
      </div>
    </div>
  );
};
