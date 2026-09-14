import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Trash2, Mic, Repeat, Timer, Scissors, Pin, EyeOff, MessageSquareQuote } from 'lucide-react';
import { getBlob, storeBlob } from '../utils/blobStorage';
import { harmonizeAudioList, formatHarmonizedAudioTitle } from '../utils/audioNamingHelper';
import { getAudioNotesCount, fetchAudioNotesFromServer } from '../utils/audioNotesStorage';
import { getSecureAudioUrl } from '../utils/audioStorageHelper';
import { SharedAudioEngine } from '../utils/sharedAudioEngine';

const isPlayableUrl = (u?: string): boolean => {
  if (!u) return false;
  return u.startsWith('http://') || u.startsWith('https://') || u.startsWith('blob:') || u.startsWith('data:');
};

const AudioEditorModal = lazy(() => import('./campus/AudioEditorModal').then(m => ({ default: m.AudioEditorModal })));
const AudioNotesModal = lazy(() => import('./campus/AudioNotesModal').then(m => ({ default: m.AudioNotesModal })));

export interface AudioTrackItem {
  url: string;
  label: string;
  duration?: number;
  idx?: number;
  originalIdx?: number;
  date?: string;
  songTag?: string;
  topic?: string;
  author?: string;
  isTeacher?: boolean;
  isCarriedOver?: boolean;
}

interface AudioTrackCarouselProps {
  tracks: AudioTrackItem[];
  onDelete?: (originalIdx: number, url?: string) => void;
  onKeep?: (originalIdx: number, url?: string) => void;
  onHide?: (originalIdx: number, url?: string) => void;
  readOnly?: boolean;
  layoutMode?: 'carousel' | 'vertical-list';
  isTeacher?: boolean;
  activeTopicContext?: string;
  isFutureWeek?: boolean;
  defaultExpanded?: boolean;
  isCarriedOver?: boolean;
  hideCarriedOverBadge?: boolean;
}

// Lightweight WebAudio beep helper for 4-beat count-in
const playCountInBeep = (isAccent: boolean) => {
  try {
    const ctx = SharedAudioEngine.getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
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
  onKeep,
  onHide,
  readOnly = false,
  layoutMode = 'vertical-list',
  isTeacher = true,
  activeTopicContext,
  isFutureWeek = false,
  defaultExpanded,
  isCarriedOver = false,
  hideCarriedOverBadge = false
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? (readOnly ? true : false));
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const harmonizedTracks = React.useMemo(() => {
    return harmonizeAudioList(tracks || [], isTeacher, activeTopicContext);
  }, [tracks, isTeacher, activeTopicContext]);

  const hasCarriedOverTracks = isCarriedOver || harmonizedTracks.some(t => Boolean(t.isCarriedOver));

  useEffect(() => {
    if (activeIndex >= harmonizedTracks.length && harmonizedTracks.length > 0) {
      setActiveIndex(harmonizedTracks.length - 1);
    }
  }, [harmonizedTracks.length, activeIndex]);

  if (!tracks || tracks.length === 0) return null;

  if (layoutMode === 'vertical-list') {
    const INITIAL_LIMIT = 3;
    const shouldShowAll = defaultExpanded || isExpanded || harmonizedTracks.length <= INITIAL_LIMIT;
    const visibleTracks = shouldShowAll
      ? harmonizedTracks
      : harmonizedTracks.slice(0, INITIAL_LIMIT);

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div 
          role={harmonizedTracks.length > INITIAL_LIMIT ? "button" : undefined}
          tabIndex={harmonizedTracks.length > INITIAL_LIMIT ? 0 : undefined}
          onClick={() => harmonizedTracks.length > INITIAL_LIMIT && setIsExpanded(prev => !prev)}
          onKeyDown={(e) => {
            if (harmonizedTracks.length > INITIAL_LIMIT && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              setIsExpanded(prev => !prev);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 2px 2px 2px',
            cursor: harmonizedTracks.length > INITIAL_LIMIT ? 'pointer' : 'default',
            userSelect: 'none',
            borderRadius: '6px'
          }}
          title={harmonizedTracks.length > INITIAL_LIMIT ? (isExpanded ? "Aufnahmen einklappen" : "Alle Aufnahmen anzeigen") : undefined}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Mic size={12} style={{ color: '#16a34a' }} />
            <span style={{
              fontSize: '0.70rem',
              fontWeight: 850,
              color: '#166534',
              letterSpacing: '-0.01em'
            }}>
              Unterrichtsaufnahmen ({harmonizedTracks.length})
            </span>
            {hasCarriedOverTracks && !hideCarriedOverBadge && (
              <span style={{
                fontSize: '0.64rem',
                fontWeight: 800,
                color: '#15803d',
                background: '#dcfce7',
                border: '1px solid #86efac',
                borderRadius: '100px',
                padding: '1px 6px',
                lineHeight: 1.3,
                letterSpacing: '0.01em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}>
                <span>Letzte Stunde</span>
              </span>
            )}
          </div>
          {harmonizedTracks.length > INITIAL_LIMIT && (
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 750,
              color: '#64748b',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}>
              {isExpanded ? (
                <>
                  <span>Einklappen</span>
                  <ChevronUp size={11} strokeWidth={2.5} />
                </>
              ) : (
                <>
                  <span>+{harmonizedTracks.length - INITIAL_LIMIT} weitere</span>
                  <ChevronDown size={11} strokeWidth={2.5} />
                </>
              )}
            </span>
          )}
        </div>

        {visibleTracks.map((track, idx) => {
          const targetIdx = track.originalIdx !== undefined ? track.originalIdx : track.idx;
          return (
            <CompactAudioStrip
              key={`${track.url}-${idx}`}
              url={track.url}
              label={track.harmonizedTitle || track.label || `Aufnahme #${idx + 1}`}
              duration={track.duration}
              trackIndex={idx}
              onDelete={!readOnly && onDelete ? () => onDelete(targetIdx ?? idx, track.url) : undefined}
              onKeep={!readOnly && onKeep ? () => onKeep(targetIdx ?? idx, track.url) : undefined}
              onHide={!readOnly && onHide ? () => onHide(targetIdx ?? idx, track.url) : undefined}
              isFutureWeek={isFutureWeek}
              isTeacher={isTeacher}
              readOnly={readOnly}
            />
          );
        })}

        {harmonizedTracks.length > INITIAL_LIMIT && (
          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            style={{
              alignSelf: 'center',
              marginTop: '4px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#334155',
              borderRadius: '100px',
              padding: '5px 14px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
            title={isExpanded ? "Aufnahmen reduzieren" : `Alle ${harmonizedTracks.length} Aufnahmen anzeigen`}
          >
            {isExpanded ? (
              <>
                <ChevronUp size={13} strokeWidth={2.4} color="#64748b" />
                <span>Weniger anzeigen ({INITIAL_LIMIT} von {harmonizedTracks.length})</span>
              </>
            ) : (
              <>
                <ChevronDown size={13} strokeWidth={2.4} color="#16a34a" />
                <span>+ {harmonizedTracks.length - INITIAL_LIMIT} weitere Aufnahmen ausklappen (insgesamt {harmonizedTracks.length})</span>
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  const currentTrack = harmonizedTracks[activeIndex] || harmonizedTracks[0];

  const switchTrack = (newIndex: number) => {
    setIsTransitioning(true);
    setActiveIndex(newIndex);
    setTimeout(() => setIsTransitioning(false), 180);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    switchTrack((activeIndex - 1 + harmonizedTracks.length) % harmonizedTracks.length);
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    switchTrack((activeIndex + 1) % harmonizedTracks.length);
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
    onDelete(targetIdx ?? activeIndex, currentTrack.url);
  };

  const handleKeepCurrent = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onKeep) return;
    const targetIdx = currentTrack.originalIdx !== undefined ? currentTrack.originalIdx : currentTrack.idx;
    onKeep(targetIdx ?? activeIndex, currentTrack.url);
  };

  const handleHideCurrent = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onHide) return;
    const targetIdx = currentTrack.originalIdx !== undefined ? currentTrack.originalIdx : currentTrack.idx;
    onHide(targetIdx ?? activeIndex, currentTrack.url);
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
        label={currentTrack.harmonizedTitle || currentTrack.label || `Aufnahme #${activeIndex + 1}`}
        duration={currentTrack.duration}
        trackIndex={activeIndex}
        totalTracks={harmonizedTracks.length}
        isTransitioning={isTransitioning}
        onPrev={harmonizedTracks.length > 1 ? handlePrev : undefined}
        onNext={harmonizedTracks.length > 1 ? handleNext : undefined}
        onSelectIndex={switchTrack}
        onDelete={!readOnly && onDelete ? handleDeleteCurrent : undefined}
        onKeep={!readOnly && onKeep ? handleKeepCurrent : undefined}
        onHide={!readOnly && onHide ? handleHideCurrent : undefined}
        isCarriedOver={hasCarriedOverTracks}
        hideCarriedOverBadge={hideCarriedOverBadge}
        isTeacher={isTeacher}
        readOnly={readOnly}
      />
    </div>
  );
};

// 📱 Responsive Mobile Detection Hook for Audio Player 2-Row Split
const useIsMobileAudio = () => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768 || Boolean(document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait'));
  });

  useEffect(() => {
    const handleCheck = () => {
      const mobile = window.innerWidth <= 768 || Boolean(document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait'));
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleCheck);
    const observer = new MutationObserver(handleCheck);
    if (document.body) {
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
    return () => {
      window.removeEventListener('resize', handleCheck);
      observer.disconnect();
    };
  }, []);

  return isMobile;
};

interface CompactAudioStripProps {
  url: string;
  label: string;
  duration?: number;
  trackIndex: number;
  onDelete?: () => void;
  onKeep?: () => void;
  onHide?: () => void;
  onSaveEdited?: (result: { url: string; duration: number; label: string; mode: 'overwrite' | 'duplicate' }) => void;
  isFutureWeek?: boolean;
  isTeacher?: boolean;
  readOnly?: boolean;
}

const CompactAudioStrip: React.FC<CompactAudioStripProps> = ({
  url,
  label,
  duration: initialDuration,
  trackIndex,
  onDelete,
  onKeep,
  onHide,
  onSaveEdited,
  isFutureWeek = false,
  isTeacher = true,
  readOnly = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number>(initialDuration || 0);
  const [currentTime, setCurrentTime] = useState<number>(0);

  useEffect(() => {
    if (initialDuration && initialDuration > 0) {
      setDuration(initialDuration);
    }
  }, [initialDuration]);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [countInActive, setCountInActive] = useState(false);
  const [countInStep, setCountInStep] = useState<number | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string>(() => isPlayableUrl(url) ? url : '');
  const [notesCount, setNotesCount] = useState<number>(() => getAudioNotesCount(url || ''));

  // 🔔 Reaktiv synchronisierte Notizen-Anzahl (SoundCloud-Style Marker)
  useEffect(() => {
    const audioKey = url || resolvedUrl;
    setNotesCount(getAudioNotesCount(audioKey));

    // 🛡️ Revisionssicherer Server-Abruf
    fetchAudioNotesFromServer(audioKey)
      .then(srvNotes => {
        if (srvNotes) setNotesCount(srvNotes.length);
      })
      .catch(() => {});

    const handleNotesChanged = () => {
      setNotesCount(getAudioNotesCount(audioKey));
    };

    window.addEventListener('campus-audio-notes-changed', handleNotesChanged);
    return () => {
      window.removeEventListener('campus-audio-notes-changed', handleNotesChanged);
    };
  }, [url, resolvedUrl]);
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

    if (url.startsWith('campus_blob_') || url.startsWith('campus_audio_') || url.startsWith('offline://')) {
      getBlob(url).then((raw: any) => {
        if (active && raw) {
          const finalBlob = raw instanceof Blob ? raw : new Blob([raw], { type: 'audio/webm' });
          createdBlobUrl = URL.createObjectURL(finalBlob);
          setResolvedUrl(createdBlobUrl);
        }
      }).catch((err: any) => console.warn('[CompactAudioStrip] Blob load note:', err));
    } else if (url.startsWith('http') || url.includes('/storage/v1/object/') || url.startsWith('schools/')) {
      getSecureAudioUrl(url, 'campus-assets', 300).then((secUrl: string) => {
        if (active && secUrl) setResolvedUrl(secUrl);
      }).catch(() => {
        if (active && isPlayableUrl(url)) setResolvedUrl(url);
      });
    } else {
      if (isPlayableUrl(url)) setResolvedUrl(url);
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
    // 🔓 Safari AudioContext Unlock on user gesture
    SharedAudioEngine.getContext().resume().catch(() => {});

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

      const playNative = () => {
        if (!audioRef.current) return;
        if (audioRef.current.ended || (duration > 0 && audioRef.current.currentTime >= duration)) {
          audioRef.current.currentTime = 0;
        }
        if (audioRef.current.readyState === 0) {
          audioRef.current.load();
        }
        audioRef.current.loop = isLooping;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(err => {
          console.warn('[CompactAudioStrip] Play error:', err);
          setIsPlaying(false);
        });
      };

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
            playNative();
          }
        };
        countInTimerRef.current = setTimeout(runCount, 550);
      } else {
        playNative();
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

  const isMobile = useIsMobileAudio();

  const renderSecondaryTools = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
      {/* 🔁 Loop Toggle Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsLooping(!isLooping);
        }}
        aria-label={isLooping ? 'Endlos-Schleife aktiv' : 'Endlos-Schleife aktivieren'}
        style={{
          border: isLooping ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
          background: isLooping ? '#dcfce7' : '#ffffff',
          color: isLooping ? '#15803d' : '#64748b',
          height: isMobile ? '38px' : '34px',
          minWidth: isMobile ? '38px' : '34px',
          padding: '0 8px',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isLooping ? '0 1px 3px rgba(22, 163, 74, 0.15)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.15s ease',
          touchAction: 'manipulation'
        }}
        className="hover-scale-mini"
        title={isLooping ? 'Loop aktiv (Endlos-Schleife)' : 'Loop aktivieren (Endlos-Schleife für Play-Alongs)'}
      >
        <Repeat size={16} strokeWidth={isLooping ? 2.6 : 2.2} />
      </button>

      {/* ⏱️ 4-Beat Count-In Vorzähler Toggle */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setCountInActive(!countInActive);
        }}
        aria-label={countInActive ? '4-Beat Einzähler aktiv' : '4-Beat Einzähler aktivieren'}
        style={{
          border: countInActive ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
          background: countInActive ? '#dcfce7' : '#ffffff',
          color: countInActive ? '#15803d' : '#64748b',
          fontSize: '0.80rem',
          fontWeight: 850,
          height: isMobile ? '38px' : '34px',
          padding: isMobile ? '0 10px' : '0 8px',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          boxShadow: countInActive ? '0 1px 3px rgba(22, 163, 74, 0.15)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.15s ease',
          touchAction: 'manipulation'
        }}
        className="hover-scale-mini"
        title={countInActive ? '4-Beat Einzähler aktiv' : '4-Beat Einzähler vor Abspielen aktivieren'}
      >
        <Timer size={15} strokeWidth={countInActive ? 2.5 : 2.2} />
        <span>4</span>
      </button>

      {/* Speed Button (Percent-based & kid-friendly) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          const rates = [1, 0.85, 0.75, 0.5];
          const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
          setPlaybackRate(nextRate);
        }}
        aria-label={`Wiedergabegeschwindigkeit ${Math.round(playbackRate * 100)} Prozent`}
        style={{
          border: playbackRate !== 1 ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
          background: playbackRate !== 1 ? '#dcfce7' : '#ffffff',
          color: playbackRate !== 1 ? '#15803d' : '#64748b',
          fontSize: '0.78rem',
          fontWeight: 850,
          height: isMobile ? '38px' : '34px',
          minWidth: isMobile ? '44px' : '40px',
          padding: '0 6px',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: playbackRate !== 1 ? '0 1px 3px rgba(22, 163, 74, 0.15)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.15s ease',
          touchAction: 'manipulation'
        }}
        className="hover-scale-mini"
        title={
          playbackRate === 1
            ? 'Originaltempo (100%)'
            : playbackRate === 0.85
            ? 'Übetempo (85%)'
            : playbackRate === 0.75
            ? 'Übetempo (75%)'
            : 'Halbes Tempo (50%)'
        }
      >
        {Math.round(playbackRate * 100)}%
      </button>

      {/* 💬 Timeline Notizen / Marker Button (SoundCloud-Style) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsNotesModalOpen(true);
        }}
        aria-label={`Notizen öffnen (${notesCount} Notizen vorhanden)`}
        style={{
          border: notesCount > 0 ? '1px solid #fed7aa' : '1px solid #cbd5e1',
          background: notesCount > 0 ? '#fff7ed' : '#ffffff',
          color: notesCount > 0 ? '#ea580c' : '#475569',
          height: isMobile ? '38px' : '34px',
          minWidth: isMobile ? '38px' : '34px',
          padding: '0 8px',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          fontSize: '0.75rem',
          fontWeight: 750,
          boxShadow: notesCount > 0 ? '0 1px 3px rgba(234, 88, 12, 0.12)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.15s ease',
          touchAction: 'manipulation'
        }}
        className="hover-scale-mini"
        title="Timeline-Notizen & Marker anzeigen oder hinzufügen"
      >
        <MessageSquareQuote size={15} strokeWidth={2.2} />
        {notesCount > 0 && <span>{notesCount}</span>}
      </button>

      {/* ✂️ Studio Trimmer Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditorOpen(true);
        }}
        aria-label="Studio Trimmer öffnen"
        style={{
          border: '1px solid #cbd5e1',
          background: '#ffffff',
          color: '#6366f1',
          height: isMobile ? '38px' : '34px',
          minWidth: isMobile ? '38px' : '34px',
          padding: '0 8px',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.15s ease',
          touchAction: 'manipulation'
        }}
        className="hover-scale-mini"
        title="Zuschneiden & Pitch"
      >
        <Scissors size={15} strokeWidth={2.2} />
      </button>
    </div>
  );

  const renderTriageHub = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
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
            height: isMobile ? '38px' : '34px',
            width: isMobile ? '36px' : '32px',
            padding: 0,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.6,
            transition: 'opacity 0.15s ease',
            touchAction: 'manipulation'
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
          title="Aufnahme entfernen"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );

  return (
    <div 
      style={{
        background: isPlaying ? '#f0fdf4' : '#ffffff',
        borderRadius: '14px',
        border: isPlaying ? '1.5px solid #86efac' : '1px solid #e2e8f0',
        padding: isMobile ? '10px 12px' : '8px 12px',
        width: '100%',
        maxWidth: '100%',
        boxShadow: isPlaying 
          ? '0 3px 12px -2px rgba(34, 197, 94, 0.2)' 
          : '0 1px 3px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? '8px' : '9px',
        boxSizing: 'border-box',
        transition: 'all 0.15s ease',
        position: 'relative'
      }}
    >
      <audio ref={audioRef} src={resolvedUrl || undefined} preload="metadata" playsInline />

      {/* Media Playback & Primary Row Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
        flex: 1,
        width: '100%',
        minWidth: 0,
        opacity: isFutureWeek ? 0.38 : 1,
        transition: 'opacity 0.15s ease'
      }}>
        {/* Play/Pause Button or Count-In Overlay (Mobile & Tablet ergonomisch: 42px) */}
        <button
          type="button"
          onClick={togglePlay}
          style={{
            width: '42px',
            height: '42px',
            minWidth: '42px',
            minHeight: '42px',
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
              ? '0 0 12px rgba(34, 197, 94, 0.4)' 
              : '0 2px 8px rgba(22, 163, 74, 0.32)',
            transition: 'all 0.15s ease',
            padding: 0,
            fontSize: countInStep !== null ? '0.88rem' : undefined,
            fontWeight: 900,
            touchAction: 'manipulation'
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

        {/* Middle: Title, Waveform, Time */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            <span style={{
              fontSize: '0.80rem',
              fontWeight: 850,
              color: '#0f172a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {label || `Unterricht • Spur ${trackIndex + 1}`}
            </span>

            <span style={{
              fontSize: '0.68rem',
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
              gap: '2px',
              height: '16px',
              cursor: 'pointer',
              width: '100%',
              maxWidth: isMobile ? '100%' : '160px'
            }}
            title="Tippen zum Spulen"
          >
            {ORGANIC_WAVEFORM.slice(0, 16).map((h, i) => {
              const barRatio = i / 16;
              const isFilled = barRatio <= progressRatio;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    minWidth: '2.5px',
                    height: `${Math.max(25, h)}%`,
                    borderRadius: '1.5px',
                    background: isFilled ? '#16a34a' : '#e2e8f0',
                    transition: 'background 0.1s ease'
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Desktop-Only: Secondary Tools in Single Row */}
        {!isMobile && renderSecondaryTools()}
      </div>

      {/* Desktop-Only: Triage Hub in Single Row */}
      {!isMobile && renderTriageHub()}

      {/* Mobile-Only: 2nd Row for Tools & Triage */}
      {isMobile && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          width: '100%',
          paddingTop: '6px',
          borderTop: '1px solid rgba(0, 0, 0, 0.05)',
          boxSizing: 'border-box'
        }}>
          {renderSecondaryTools()}
          {renderTriageHub()}
        </div>
      )}

      {/* Audio Editor Modal */}
      {isEditorOpen && (
        <Suspense fallback={null}>
          <AudioEditorModal
            isOpen={isEditorOpen}
            onClose={() => setIsEditorOpen(false)}
            audioUrl={resolvedUrl || url}
            initialLabel={label || `Aufnahme #${trackIndex + 1}`}
            initialDuration={duration}
            onSave={(res) => {
              if (onSaveEdited) {
                onSaveEdited(res);
              }
              setIsEditorOpen(false);
            }}
          />
        </Suspense>
      )}

      {/* Audio Timeline Notes & Markers Modal (SoundCloud-Style) */}
      {isNotesModalOpen && (
        <Suspense fallback={null}>
          <AudioNotesModal
            isOpen={isNotesModalOpen}
            onClose={() => setIsNotesModalOpen(false)}
            audioId={url || resolvedUrl}
            audioUrl={resolvedUrl || url}
            title={label || `Aufnahme #${trackIndex + 1}`}
            initialDuration={duration}
            currentUserRole={readOnly || !isTeacher ? 'student' : 'teacher'}
          />
        </Suspense>
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
  onKeep?: (e: React.MouseEvent) => void;
  onHide?: (e: React.MouseEvent) => void;
  isCarriedOver?: boolean;
  hideCarriedOverBadge?: boolean;
  isTeacher?: boolean;
  readOnly?: boolean;
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
  onDelete,
  onKeep,
  onHide,
  isCarriedOver = false,
  hideCarriedOverBadge = false,
  isTeacher = true,
  readOnly = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number>(initialDuration || 0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [countInActive, setCountInActive] = useState(false);
  const [countInStep, setCountInStep] = useState<number | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string>(() => isPlayableUrl(url) ? url : '');
  const [notesCount, setNotesCount] = useState<number>(() => getAudioNotesCount(url || ''));

  // 🔔 Reaktiv synchronisierte Notizen-Anzahl (SoundCloud-Style Marker)
  useEffect(() => {
    const audioKey = url || resolvedUrl;
    setNotesCount(getAudioNotesCount(audioKey));

    // 🛡️ Revisionssicherer Server-Abruf
    fetchAudioNotesFromServer(audioKey)
      .then(srvNotes => {
        if (srvNotes) setNotesCount(srvNotes.length);
      })
      .catch(() => {});

    const handleNotesChanged = () => {
      setNotesCount(getAudioNotesCount(audioKey));
    };

    window.addEventListener('campus-audio-notes-changed', handleNotesChanged);
    return () => {
      window.removeEventListener('campus-audio-notes-changed', handleNotesChanged);
    };
  }, [url, resolvedUrl]);
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
    } else if (url.startsWith('http') || url.includes('/storage/v1/object/') || url.startsWith('schools/')) {
      getSecureAudioUrl(url, 'campus-assets', 300).then((secUrl: string) => {
        if (active && secUrl) setResolvedUrl(secUrl);
      }).catch(() => {
        if (active && isPlayableUrl(url)) setResolvedUrl(url);
      });
    } else {
      if (isPlayableUrl(url)) setResolvedUrl(url);
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
    // 🔓 Safari AudioContext Unlock on user gesture
    SharedAudioEngine.getContext().resume().catch(() => {});

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

      const playNative = () => {
        if (!audioRef.current) return;
        if (audioRef.current.ended || (duration > 0 && audioRef.current.currentTime >= duration)) {
          audioRef.current.currentTime = 0;
        }
        if (audioRef.current.readyState === 0) {
          audioRef.current.load();
        }
        audioRef.current.loop = isLooping;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(err => {
          console.warn('[Audio] Play error:', err);
          setIsPlaying(false);
        });
      };

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
            playNative();
          }
        };
        countInTimerRef.current = setTimeout(runCount, 550);
      } else {
        playNative();
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

  const isMobile = useIsMobileAudio();

  const renderSecondaryTools = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
      {/* 🔁 Loop Toggle Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsLooping(!isLooping);
        }}
        style={{
          border: isLooping ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
          background: isLooping ? '#dcfce7' : '#ffffff',
          color: isLooping ? '#15803d' : '#64748b',
          height: isMobile ? '38px' : '34px',
          minWidth: isMobile ? '38px' : '34px',
          padding: '0 8px',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isLooping ? '0 1px 3px rgba(22, 163, 74, 0.15)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.15s ease',
          touchAction: 'manipulation'
        }}
        className="hover-scale-mini"
        title={isLooping ? 'Loop aktiv (Endlos-Schleife)' : 'Loop aktivieren (Endlos-Schleife für Play-Alongs)'}
      >
        <Repeat size={16} strokeWidth={isLooping ? 2.6 : 2.2} />
      </button>

      {/* ⏱️ 4-Beat Count-In Vorzähler Toggle */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setCountInActive(!countInActive);
        }}
        style={{
          border: countInActive ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
          background: countInActive ? '#dcfce7' : '#ffffff',
          color: countInActive ? '#15803d' : '#64748b',
          fontSize: '0.80rem',
          fontWeight: 850,
          height: isMobile ? '38px' : '34px',
          padding: isMobile ? '0 10px' : '0 8px',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          boxShadow: countInActive ? '0 1px 3px rgba(22, 163, 74, 0.15)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.15s ease',
          touchAction: 'manipulation'
        }}
        className="hover-scale-mini"
        title={countInActive ? '4-Beat Einzähler aktiv' : '4-Beat Einzähler vor Abspielen aktivieren'}
      >
        <Timer size={15} strokeWidth={countInActive ? 2.5 : 2.2} />
        <span>4</span>
      </button>

      {/* Speed Button (Percent-based & kid-friendly) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          const rates = [1, 0.85, 0.75, 0.5];
          const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
          setPlaybackRate(nextRate);
        }}
        style={{
          border: playbackRate !== 1 ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
          background: playbackRate !== 1 ? '#dcfce7' : '#ffffff',
          color: playbackRate !== 1 ? '#15803d' : '#64748b',
          fontSize: '0.78rem',
          fontWeight: 850,
          height: isMobile ? '38px' : '34px',
          minWidth: isMobile ? '44px' : '40px',
          padding: '0 6px',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: playbackRate !== 1 ? '0 1px 3px rgba(22, 163, 74, 0.15)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.15s ease',
          touchAction: 'manipulation'
        }}
        className="hover-scale-mini"
        title={
          playbackRate === 1
            ? 'Originaltempo (100%)'
            : playbackRate === 0.85
            ? 'Übetempo (85%)'
            : playbackRate === 0.75
            ? 'Übetempo (75%)'
            : 'Halbes Tempo (50%)'
        }
      >
        {Math.round(playbackRate * 100)}%
      </button>

      {/* 💬 Timeline Notizen / Marker Button (SoundCloud-Style) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsNotesModalOpen(true);
        }}
        aria-label={`Notizen öffnen (${notesCount} Notizen vorhanden)`}
        style={{
          border: notesCount > 0 ? '1px solid #fed7aa' : '1px solid #cbd5e1',
          background: notesCount > 0 ? '#fff7ed' : '#ffffff',
          color: notesCount > 0 ? '#ea580c' : '#475569',
          height: isMobile ? '38px' : '34px',
          minWidth: isMobile ? '38px' : '34px',
          padding: '0 8px',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          fontSize: '0.75rem',
          fontWeight: 750,
          boxShadow: notesCount > 0 ? '0 1px 3px rgba(234, 88, 12, 0.12)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.15s ease',
          touchAction: 'manipulation'
        }}
        className="hover-scale-mini"
        title="Timeline-Notizen & Marker anzeigen oder hinzufügen"
      >
        <MessageSquareQuote size={15} strokeWidth={2.2} />
        {notesCount > 0 && <span>{notesCount}</span>}
      </button>

      {/* ✂️ Studio Trimmer Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditorOpen(true);
        }}
        aria-label="Studio Trimmer öffnen"
        style={{
          border: '1px solid #cbd5e1',
          background: '#ffffff',
          color: '#6366f1',
          height: isMobile ? '38px' : '34px',
          minWidth: isMobile ? '38px' : '34px',
          padding: '0 8px',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.15s ease',
          touchAction: 'manipulation'
        }}
        className="hover-scale-mini"
        title="Zuschneiden & Pitch"
      >
        <Scissors size={15} strokeWidth={2.2} />
      </button>
    </div>
  );

  const renderDeleteButton = () => (
    onDelete ? (
      <button
        type="button"
        onClick={onDelete}
        style={{
          border: 'none',
          background: 'none',
          color: '#ef4444',
          cursor: 'pointer',
          height: isMobile ? '38px' : '34px',
          width: isMobile ? '36px' : '32px',
          padding: 0,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.6,
          transition: 'opacity 0.15s ease',
          flexShrink: 0,
          touchAction: 'manipulation'
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
        title="Aufnahme entfernen"
      >
        <Trash2 size={16} />
      </button>
    ) : null
  );

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
      <audio ref={audioRef} src={resolvedUrl || undefined} preload="metadata" playsInline />

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
          {isCarriedOver && !hideCarriedOverBadge && (
            <span style={{
              fontSize: '0.64rem',
              fontWeight: 800,
              color: '#15803d',
              background: '#dcfce7',
              border: '1px solid #86efac',
              borderRadius: '100px',
              padding: '1px 6px',
              lineHeight: 1.3,
              letterSpacing: '0.01em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}>
              <span>Letzte Stunde</span>
            </span>
          )}
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
            width: '42px',
            height: '42px',
            minWidth: '42px',
            minHeight: '42px',
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
            fontSize: countInStep !== null ? '0.88rem' : undefined,
            fontWeight: 900,
            touchAction: 'manipulation'
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

        {/* Desktop-Only: Secondary Tools & Delete in Single Row */}
        {!isMobile && (
          <>
            {renderSecondaryTools()}
            {renderDeleteButton()}
          </>
        )}
      </div>

      {/* Mobile-Only: 3rd Row for Tools & Delete Button */}
      {isMobile && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          width: '100%',
          paddingTop: '6px',
          borderTop: '1px solid rgba(0, 0, 0, 0.05)',
          boxSizing: 'border-box'
        }}>
          {renderSecondaryTools()}
          {renderDeleteButton()}
        </div>
      )}

      {/* Audio Editor Modal */}
      {isEditorOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* Audio Timeline Notes & Markers Modal (SoundCloud-Style) */}
      {isNotesModalOpen && (
        <Suspense fallback={null}>
          <AudioNotesModal
            isOpen={isNotesModalOpen}
            onClose={() => setIsNotesModalOpen(false)}
            audioId={url || resolvedUrl}
            audioUrl={resolvedUrl || url}
            title={label || 'Aufnahme'}
            initialDuration={duration}
            currentUserRole={readOnly || !isTeacher ? 'student' : 'teacher'}
          />
        </Suspense>
      )}
    </div>
  );
};
