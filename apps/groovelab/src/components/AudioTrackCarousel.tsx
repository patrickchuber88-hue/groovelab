import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Trash2, Mic, Repeat, Timer, Scissors, Pin, EyeOff, MessageSquareQuote, SlidersHorizontal, Loader2 } from 'lucide-react';
import { getBlob, storeBlob } from '../utils/blobStorage';
import { harmonizeAudioList, formatHarmonizedAudioTitle } from '../utils/audioNamingHelper';
import { getAudioNotesCount, fetchAudioNotesFromServer } from '../utils/audioNotesStorage';
import { getSecureAudioUrl, resolvePlayableAudioSource } from '../utils/audioStorageHelper';
import { SharedAudioEngine } from '../utils/sharedAudioEngine';
import { getLoopLocator, saveLoopLocator, toggleLoopLocator, removeLoopLocator, AudioLoopLocator } from '../utils/audioLoopLocatorStorage';

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
  uiLevel?: 'junior' | 'teen' | 'pro';
}

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

const playCountInBeep = (isAccent: boolean) => {
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
  hideCarriedOverBadge = false,
  uiLevel
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? (readOnly ? true : false));
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const effectiveUiLevel: 'junior' | 'teen' | 'pro' = uiLevel || (typeof window !== 'undefined' ? ((localStorage.getItem('campus_student_ui_level') as any) || 'junior') : 'junior');

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
              uiLevel={effectiveUiLevel}
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
        uiLevel={effectiveUiLevel}
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
  onSaveEdited?: (result: { url: string; duration: number; label: string; mode: 'overwrite' | 'duplicate'; is_edited?: boolean; loop_locator?: any }) => void;
  isFutureWeek?: boolean;
  isTeacher?: boolean;
  readOnly?: boolean;
  uiLevel?: 'junior' | 'teen' | 'pro';
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
  readOnly = false,
  uiLevel = 'junior'
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
  const [countInActive, setCountInActive] = useState<boolean>(false);
  const [countInStep, setCountInStep] = useState<number | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string>(() => isPlayableUrl(url) ? url : '');
  const [notesCount, setNotesCount] = useState<number>(() => getAudioNotesCount(url || ''));
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [loopLocator, setLoopLocator] = useState<AudioLoopLocator | null>(() => getLoopLocator(url || resolvedUrl));
  useEffect(() => {
    const audioKey = url || resolvedUrl;
    setLoopLocator(getLoopLocator(audioKey));
    const handleLocatorChange = () => {
      setLoopLocator(getLoopLocator(audioKey));
    };
    window.addEventListener('campus-audio-loop-locator-changed', handleLocatorChange);
    return () => window.removeEventListener('campus-audio-loop-locator-changed', handleLocatorChange);
  }, [url, resolvedUrl]);

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
    let cleanupFn: (() => void) | undefined;

    resolvePlayableAudioSource(url, 'campus-assets', 1800).then((res) => {
      if (active && res.src) {
        setResolvedUrl(res.src);
        cleanupFn = res.cleanup;
      }
    }).catch((err) => {
      console.warn('[CompactAudioStrip] Failed to resolve playable audio source:', err);
      if (active && isPlayableUrl(url)) {
        setResolvedUrl(url);
      }
    });

    return () => {
      active = false;
      if (cleanupFn) cleanupFn();
      if (countInTimerRef.current) {
        if (typeof countInTimerRef.current === 'object' && countInTimerRef.current.clear) {
          countInTimerRef.current.clear();
        } else {
          clearTimeout(countInTimerRef.current);
        }
      }
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
    // 🔓 Safari AudioContext & HTMLMediaElement Unlock on user gesture
    const ctx = SharedAudioEngine.getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (countInTimerRef.current) {
      if (typeof countInTimerRef.current === 'object' && countInTimerRef.current.clear) {
        countInTimerRef.current.clear();
      } else {
        clearTimeout(countInTimerRef.current);
      }
      countInTimerRef.current = null;
      setCountInStep(null);
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.muted = false;
          audioRef.current.volume = 1;
        } catch {}
      }
      setIsPlaying(false);
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
        if (isLooping && loopLocator && loopLocator.enabled) {
          if (audioRef.current.currentTime < loopLocator.startSec || audioRef.current.currentTime >= loopLocator.endSec) {
            audioRef.current.currentTime = loopLocator.startSec;
          }
        } else if (audioRef.current.ended || (duration > 0 && audioRef.current.currentTime >= duration)) {
          audioRef.current.currentTime = 0;
        }
        if (audioRef.current.readyState === 0) {
          audioRef.current.load();
        }
        audioRef.current.loop = isLooping && (!loopLocator || !loopLocator.enabled);
        audioRef.current.muted = false;
        audioRef.current.volume = 1;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(err => {
          console.warn('[CompactAudioStrip] Play error:', err);
          setIsPlaying(false);
        });
      };

      if (countInActive) {
        // 🔓 Safari WebKit Autoplay Priming:
        // Keep the audio element playing silently throughout count-in so WebKit permits unmuting on beat 4!
        try {
          audioRef.current.muted = true;
          audioRef.current.volume = 0;
          if (audioRef.current.ended || (duration > 0 && audioRef.current.currentTime >= duration)) {
            audioRef.current.currentTime = 0;
          }
          if (audioRef.current.readyState === 0) {
            audioRef.current.load();
          }
          const primePromise = audioRef.current.play();
          if (primePromise !== undefined) {
            primePromise.catch(() => {});
          }
        } catch {}

        const bpmMatch = label ? label.match(/(?:BPM:|\b)(\d{2,3})\s*(?:BPM|\b)/i) : null;
        const effectiveBpm = bpmMatch ? parseInt(bpmMatch[1], 10) : 100;
        const beatDurationSec = (60 / effectiveBpm) / (playbackRate || 1);
        const beatDurationMs = beatDurationSec * 1000;

        const now = ctx ? ctx.currentTime : 0;
        const leadTime = 0.05; // 50ms scheduling headroom
        const scheduleStart = now + leadTime;

        if (ctx) {
          for (let i = 0; i < 4; i++) {
            scheduleCountInBeep(ctx, scheduleStart + i * beatDurationSec, i === 0);
          }
        }

        setCountInStep(1);
        const timers: any[] = [];
        const clearTimers = () => timers.forEach(t => clearTimeout(t));
        countInTimerRef.current = { clear: clearTimers };

        const leadTimeMs = Math.round(leadTime * 1000);
        timers.push(setTimeout(() => setCountInStep(2), leadTimeMs + beatDurationMs));
        timers.push(setTimeout(() => setCountInStep(3), leadTimeMs + 2 * beatDurationMs));
        timers.push(setTimeout(() => setCountInStep(4), leadTimeMs + 3 * beatDurationMs));
        timers.push(setTimeout(() => {
          setCountInStep(null);
          countInTimerRef.current = null;
          if (audioRef.current) {
            let startPos = 0;
            if (isLooping && loopLocator && loopLocator.enabled) {
              startPos = loopLocator.startSec;
            }
            try {
              audioRef.current.currentTime = startPos;
              audioRef.current.muted = false;
              audioRef.current.volume = 1;
              if (audioRef.current.paused) {
                audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
              } else {
                setIsPlaying(true);
              }
            } catch {
              playNative();
            }
          }
        }, leadTimeMs + 4 * beatDurationMs));
      } else {
        playNative();
      }
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration) && audio.duration > 1) {
        setDuration(Math.round(audio.duration));
      }
    };
    const handleTimeUpdate = () => {
      const cur = audio.currentTime;
      setCurrentTime(cur);
      if (cur > duration) {
        setDuration(Math.ceil(cur));
      }
      if (isLooping && loopLocator && loopLocator.enabled) {
        if (cur >= loopLocator.endSec) {
          audio.currentTime = loopLocator.startSec;
        } else if (cur < loopLocator.startSec) {
          audio.currentTime = loopLocator.startSec;
        }
      }
    };
    const handleEnded = () => {
      if (!isLooping) {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    if (audio.duration && isFinite(audio.duration) && audio.duration > 1) {
      setDuration(Math.round(audio.duration));
    }

    audio.loop = isLooping && (!loopLocator || !loopLocator.enabled);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleLoadedMetadata);
    audio.addEventListener('canplay', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [resolvedUrl, isLooping, loopLocator, duration]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      (audioRef.current as any).preservesPitch = true;
      (audioRef.current as any).webkitPreservesPitch = true;
      (audioRef.current as any).mozPreservesPitch = true;
    }
  }, [playbackRate]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressRatio = duration > 0 ? currentTime / duration : 0;

  const isMobile = useIsMobileAudio();

  const handleCycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (uiLevel === 'junior') {
      // 🐢 75% vs 🐰 100%
      setPlaybackRate(prev => (prev === 1 ? 0.75 : 1));
    } else if (uiLevel === 'teen') {
      const rates = [1, 0.85, 0.75];
      const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
      setPlaybackRate(nextRate);
    } else {
      // pro
      const rates = [1, 0.85, 0.75, 0.6, 0.5];
      const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
      setPlaybackRate(nextRate);
    }
  };

  const getSpeedLabel = () => {
    if (uiLevel === 'junior') {
      return playbackRate < 1 ? '🐢 75%' : '🐰 100%';
    }
    return `${Math.round(playbackRate * 100)}%`;
  };

  const hasActiveLocator = Boolean(loopLocator && loopLocator.enabled);

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
          border: isLooping ? '2px solid #16a34a' : (hasActiveLocator ? '1.5px solid #86efac' : '1px solid #cbd5e1'),
          background: isLooping ? '#bbf7d0' : (hasActiveLocator ? '#f0fdf4' : '#ffffff'),
          color: isLooping ? '#15803d' : (hasActiveLocator ? '#166534' : '#64748b'),
          height: isMobile ? '44px' : '36px',
          minWidth: isMobile ? '44px' : '36px',
          padding: '0 8px',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          boxShadow: isLooping ? '0 0 0 2px rgba(34, 197, 94, 0.3), 0 2px 6px rgba(22, 163, 74, 0.25)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.15s ease',
          touchAction: 'manipulation'
        }}
        className="hover-scale-mini"
        title={
          hasActiveLocator
            ? `A/B Loop (${Math.round(loopLocator!.startSec)}s - ${Math.round(loopLocator!.endSec)}s) ${isLooping ? 'aktiv' : 'bereit'}`
            : (isLooping ? 'Loop aktiv (Endlos-Schleife)' : 'Loop aktivieren (Endlos-Schleife für Play-Alongs)')
        }
      >
        <Repeat size={16} strokeWidth={isLooping ? 2.8 : 2.2} />
        {hasActiveLocator && (
          <span style={{ fontSize: '0.66rem', fontWeight: 900, letterSpacing: '-0.02em' }}>A⇄B</span>
        )}
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
          height: isMobile ? '44px' : '36px',
          minWidth: isMobile ? '44px' : '36px',
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

      {/* Speed Button (Level-adaptive & pitch-preserved) */}
      <button
        type="button"
        onClick={handleCycleSpeed}
        aria-label={`Wiedergabegeschwindigkeit ${getSpeedLabel()}`}
        style={{
          border: playbackRate !== 1 ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
          background: playbackRate !== 1 ? '#dcfce7' : '#ffffff',
          color: playbackRate !== 1 ? '#15803d' : '#64748b',
          fontSize: '0.78rem',
          fontWeight: 850,
          height: isMobile ? '44px' : '36px',
          minWidth: isMobile ? '48px' : '42px',
          padding: '0 8px',
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
            : `Übetempo (${Math.round(playbackRate * 100)}%) mit Tonhöhen-Stabilisierung`
        }
      >
        {getSpeedLabel()}
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
          height: isMobile ? '44px' : '36px',
          minWidth: isMobile ? '44px' : '36px',
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

      {/* 🎛️ A/B Loop-Studio / Trimmer Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditorOpen(true);
        }}
        aria-label={hasActiveLocator ? 'A/B Loop-Schleife bearbeiten' : 'A/B Loop-Schleife einstellen'}
        style={{
          border: hasActiveLocator ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
          background: hasActiveLocator ? '#f0fdf4' : '#ffffff',
          color: hasActiveLocator ? '#16a34a' : '#6366f1',
          height: isMobile ? '44px' : '36px',
          minWidth: isMobile ? '44px' : '36px',
          padding: '0 8px',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          boxShadow: hasActiveLocator ? '0 0 0 2px rgba(34, 197, 94, 0.2)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.15s ease',
          touchAction: 'manipulation'
        }}
        className="hover-scale-mini"
        title={
          hasActiveLocator
            ? `A/B Loop aktiv: ${Math.round(loopLocator!.startSec)}s - ${Math.round(loopLocator!.endSec)}s (Tippen zum Ändern)`
            : 'A/B Loop-Bereich festlegen (Schleife für schwere Takte)'
        }
      >
        <SlidersHorizontal size={15} strokeWidth={hasActiveLocator ? 2.5 : 2.2} />
        {hasActiveLocator && (
          <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#16a34a' }}>A/B</span>
        )}
      </button>
    </div>
  );

  const renderTriageHub = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
      {/* Delete Button */}
      {onDelete && (
        <button
          type="button"
          disabled={isDeleting}
          onClick={async (e) => {
            e.stopPropagation();
            if (isDeleting) return;
            setIsDeleting(true);
            try {
              await Promise.resolve(onDelete());
            } catch (err) {
              console.error('[CompactAudioStrip] Delete error:', err);
              setIsDeleting(false);
            }
          }}
          style={{
            border: 'none',
            background: isDeleting ? '#fee2e2' : 'none',
            color: '#ef4444',
            cursor: isDeleting ? 'wait' : 'pointer',
            height: isMobile ? '38px' : '34px',
            width: isMobile ? '36px' : '32px',
            padding: 0,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isDeleting ? 1 : 0.6,
            transition: 'opacity 0.15s ease',
            touchAction: 'manipulation'
          }}
          onMouseEnter={e => { if (!isDeleting) e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={e => { if (!isDeleting) e.currentTarget.style.opacity = '0.6'; }}
          title={isDeleting ? "Wird gelöscht..." : "Aufnahme entfernen"}
          aria-label={isDeleting ? "Aufnahme wird gelöscht..." : "Aufnahme entfernen"}
        >
          {isDeleting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}
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
      <audio
        ref={audioRef}
        src={resolvedUrl || undefined}
        preload="metadata"
        playsInline
        onLoadedMetadata={(e) => {
          const a = e.currentTarget;
          if (a.duration && isFinite(a.duration) && a.duration > 1) {
            setDuration(Math.round(a.duration));
          }
        }}
        onDurationChange={(e) => {
          const a = e.currentTarget;
          if (a.duration && isFinite(a.duration) && a.duration > 1) {
            setDuration(Math.round(a.duration));
          }
        }}
        onError={() => {
          console.warn('[CompactAudioStrip] Audio stream error for:', resolvedUrl);
          if (resolvedUrl && resolvedUrl.includes('/storage/v1/object/sign/')) {
            const pubUrl = resolvedUrl.replace('/storage/v1/object/sign/', '/storage/v1/object/public/').split('?')[0];
            if (pubUrl && pubUrl !== resolvedUrl) {
              setResolvedUrl(pubUrl);
            }
          }
        }}
      />

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
          {(() => {
            const hasLocator = Boolean(loopLocator && loopLocator.endSec > loopLocator.startSec && duration > 0);
            const startPct = hasLocator ? Math.max(0, Math.min(100, (loopLocator!.startSec / duration) * 100)) : 0;
            const endPct = hasLocator ? Math.max(0, Math.min(100, (loopLocator!.endSec / duration) * 100)) : 100;
            const spanPct = Math.max(0, endPct - startPct);
            const isLoopActive = Boolean(isLooping && loopLocator?.enabled);

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
                  if (audioRef.current) audioRef.current.currentTime = newTime;
                }}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  height: '18px',
                  cursor: 'pointer',
                  width: '100%',
                  maxWidth: isMobile ? '100%' : '160px'
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
                        background: isLoopActive ? 'rgba(22, 163, 74, 0.15)' : 'rgba(148, 163, 184, 0.08)',
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
                        background: isLoopActive ? '#16a34a' : '#94a3b8',
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
                          background: isLoopActive ? '#16a34a' : '#64748b',
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
                        background: isLoopActive ? '#ef4444' : '#94a3b8',
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
                          background: isLoopActive ? '#ef4444' : '#64748b',
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

                {ORGANIC_WAVEFORM.slice(0, 16).map((h, i) => {
                  const barRatio = i / 16;
                  const isFilled = barRatio <= progressRatio;
                  const barSec = duration > 0 ? barRatio * duration : 0;
                  const isOutsideLocator = Boolean(
                    isLoopActive &&
                    loopLocator &&
                    loopLocator.enabled &&
                    duration > 0 &&
                    (barSec < loopLocator.startSec || barSec > loopLocator.endSec)
                  );

                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        minWidth: '2.5px',
                        height: `${Math.max(25, h)}%`,
                        borderRadius: '1.5px',
                        background: isFilled ? '#16a34a' : '#e2e8f0',
                        opacity: isOutsideLocator ? 0.32 : 1,
                        transition: 'all 0.15s ease'
                      }}
                    />
                  );
                })}
              </div>
            );
          })()}
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
            initialLocator={loopLocator}
            editorMode={!isTeacher || readOnly ? 'locator' : 'locator'}
            uiLevel={uiLevel}
            recordingId={url || resolvedUrl}
            userId={typeof window !== 'undefined' ? (localStorage.getItem('campus_auth_user_id') || localStorage.getItem('auth_user_id') || undefined) : undefined}
            schoolId={typeof window !== 'undefined' ? (localStorage.getItem('campus_current_school_id') || localStorage.getItem('last_active_school_id') || undefined) : undefined}
            onSave={(res) => {
              if (res.loop_locator !== undefined) {
                setLoopLocator(res.loop_locator);
                if (res.loop_locator?.enabled) {
                  setIsLooping(true); // ⚡ SOFORTIGE AKTIVIERUNG DES A/B LOOPS
                  const startPos = res.loop_locator.startSec || 0;
                  setCurrentTime(startPos);
                  if (audioRef.current) {
                    audioRef.current.currentTime = startPos;
                  }
                } else if (res.loop_locator === null) {
                  setIsLooping(false);
                }
              }
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
  uiLevel?: 'junior' | 'teen' | 'pro';
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
  readOnly = false,
  uiLevel = 'junior'
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number>(initialDuration || 0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [countInActive, setCountInActive] = useState<boolean>(false);
  const [countInStep, setCountInStep] = useState<number | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string>(() => isPlayableUrl(url) ? url : '');
  const [notesCount, setNotesCount] = useState<number>(() => getAudioNotesCount(url || ''));
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [loopLocator, setLoopLocator] = useState<AudioLoopLocator | null>(() => getLoopLocator(url || resolvedUrl));
  useEffect(() => {
    const audioKey = url || resolvedUrl;
    setLoopLocator(getLoopLocator(audioKey));
    const handleLocatorChange = () => {
      setLoopLocator(getLoopLocator(audioKey));
    };
    window.addEventListener('campus-audio-loop-locator-changed', handleLocatorChange);
    return () => window.removeEventListener('campus-audio-loop-locator-changed', handleLocatorChange);
  }, [url, resolvedUrl]);

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
    let cleanupFn: (() => void) | undefined;

    resolvePlayableAudioSource(url, 'campus-assets', 1800).then((res) => {
      if (active && res.src) {
        setResolvedUrl(res.src);
        cleanupFn = res.cleanup;
      }
    }).catch((err) => {
      console.warn('[SplitCapsulePlayer] Failed to resolve playable audio source:', err);
      if (active && isPlayableUrl(url)) {
        setResolvedUrl(url);
      }
    });

    return () => {
      active = false;
      if (cleanupFn) cleanupFn();
      if (countInTimerRef.current) {
        if (typeof countInTimerRef.current === 'object' && countInTimerRef.current.clear) {
          countInTimerRef.current.clear();
        } else {
          clearTimeout(countInTimerRef.current);
        }
      }
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
    // 🔓 Safari AudioContext & HTMLMediaElement Unlock on user gesture
    const ctx = SharedAudioEngine.getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (countInTimerRef.current) {
      if (typeof countInTimerRef.current === 'object' && countInTimerRef.current.clear) {
        countInTimerRef.current.clear();
      } else {
        clearTimeout(countInTimerRef.current);
      }
      countInTimerRef.current = null;
      setCountInStep(null);
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.muted = false;
          audioRef.current.volume = 1;
        } catch {}
      }
      setIsPlaying(false);
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
        if (isLooping && loopLocator && loopLocator.enabled) {
          if (audioRef.current.currentTime < loopLocator.startSec || audioRef.current.currentTime >= loopLocator.endSec) {
            audioRef.current.currentTime = loopLocator.startSec;
          }
        } else if (audioRef.current.ended || (duration > 0 && audioRef.current.currentTime >= duration)) {
          audioRef.current.currentTime = 0;
        }
        if (audioRef.current.readyState === 0) {
          audioRef.current.load();
        }
        audioRef.current.loop = isLooping && (!loopLocator || !loopLocator.enabled);
        audioRef.current.muted = false;
        audioRef.current.volume = 1;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(err => {
          console.warn('[Audio] Play error:', err);
          setIsPlaying(false);
        });
      };

      if (countInActive) {
        // 🔓 Safari WebKit Autoplay Priming:
        // Keep the audio element playing silently throughout count-in so WebKit permits unmuting on beat 4!
        try {
          audioRef.current.muted = true;
          audioRef.current.volume = 0;
          if (audioRef.current.ended || (duration > 0 && audioRef.current.currentTime >= duration)) {
            audioRef.current.currentTime = 0;
          }
          if (audioRef.current.readyState === 0) {
            audioRef.current.load();
          }
          const primePromise = audioRef.current.play();
          if (primePromise !== undefined) {
            primePromise.catch(() => {});
          }
        } catch {}

        const bpmMatch = label ? label.match(/(?:BPM:|\b)(\d{2,3})\s*(?:BPM|\b)/i) : null;
        const effectiveBpm = bpmMatch ? parseInt(bpmMatch[1], 10) : 100;
        const beatDurationSec = (60 / effectiveBpm) / (playbackRate || 1);
        const beatDurationMs = beatDurationSec * 1000;

        const now = ctx ? ctx.currentTime : 0;
        const leadTime = 0.05; // 50ms scheduling headroom
        const scheduleStart = now + leadTime;

        if (ctx) {
          for (let i = 0; i < 4; i++) {
            scheduleCountInBeep(ctx, scheduleStart + i * beatDurationSec, i === 0);
          }
        }

        setCountInStep(1);
        const timers: any[] = [];
        const clearTimers = () => timers.forEach(t => clearTimeout(t));
        countInTimerRef.current = { clear: clearTimers };

        const leadTimeMs = Math.round(leadTime * 1000);
        timers.push(setTimeout(() => setCountInStep(2), leadTimeMs + beatDurationMs));
        timers.push(setTimeout(() => setCountInStep(3), leadTimeMs + 2 * beatDurationMs));
        timers.push(setTimeout(() => setCountInStep(4), leadTimeMs + 3 * beatDurationMs));
        timers.push(setTimeout(() => {
          setCountInStep(null);
          countInTimerRef.current = null;
          if (audioRef.current) {
            let startPos = 0;
            if (isLooping && loopLocator && loopLocator.enabled) {
              startPos = loopLocator.startSec;
            }
            try {
              audioRef.current.currentTime = startPos;
              audioRef.current.muted = false;
              audioRef.current.volume = 1;
              if (audioRef.current.paused) {
                audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
              } else {
                setIsPlaying(true);
              }
            } catch {
              playNative();
            }
          }
        }, leadTimeMs + 4 * beatDurationMs));
      } else {
        playNative();
      }
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration) && audio.duration > 1) {
        setDuration(Math.round(audio.duration));
      }
    };
    const handleTimeUpdate = () => {
      const cur = audio.currentTime;
      setCurrentTime(cur);
      if (cur > duration) {
        setDuration(Math.ceil(cur));
      }
      if (isLooping && loopLocator && loopLocator.enabled) {
        if (cur >= loopLocator.endSec) {
          audio.currentTime = loopLocator.startSec;
        } else if (cur < loopLocator.startSec) {
          audio.currentTime = loopLocator.startSec;
        }
      }
    };
    const handleEnded = () => {
      if (!isLooping) {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    if (audio.duration && isFinite(audio.duration) && audio.duration > 1) {
      setDuration(Math.round(audio.duration));
    }

    audio.loop = isLooping && (!loopLocator || !loopLocator.enabled);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleLoadedMetadata);
    audio.addEventListener('canplay', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [resolvedUrl, isLooping, loopLocator, duration]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      (audioRef.current as any).preservesPitch = true;
      (audioRef.current as any).webkitPreservesPitch = true;
      (audioRef.current as any).mozPreservesPitch = true;
    }
  }, [playbackRate]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressRatio = duration > 0 ? currentTime / duration : 0;

  const isMobile = useIsMobileAudio();

  const handleCycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (uiLevel === 'junior') {
      // 🐢 75% vs 🐰 100%
      setPlaybackRate(prev => (prev === 1 ? 0.75 : 1));
    } else if (uiLevel === 'teen') {
      const rates = [1, 0.85, 0.75];
      const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
      setPlaybackRate(nextRate);
    } else {
      // pro
      const rates = [1, 0.85, 0.75, 0.6, 0.5];
      const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
      setPlaybackRate(nextRate);
    }
  };

  const getSpeedLabel = () => {
    if (uiLevel === 'junior') {
      return playbackRate < 1 ? '🐢 75%' : '🐰 100%';
    }
    return `${Math.round(playbackRate * 100)}%`;
  };

  const hasActiveLocator = Boolean(loopLocator && loopLocator.enabled);

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
          border: isLooping ? '2px solid #16a34a' : (hasActiveLocator ? '1.5px solid #86efac' : '1px solid #cbd5e1'),
          background: isLooping ? '#bbf7d0' : (hasActiveLocator ? '#f0fdf4' : '#ffffff'),
          color: isLooping ? '#15803d' : (hasActiveLocator ? '#166534' : '#64748b'),
          height: isMobile ? '44px' : '34px',
          minWidth: isMobile ? '44px' : '34px',
          padding: '0 8px',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          boxShadow: isLooping ? '0 0 0 2px rgba(34, 197, 94, 0.3), 0 2px 6px rgba(22, 163, 74, 0.25)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.15s ease',
          touchAction: 'manipulation'
        }}
        className="hover-scale-mini"
        title={
          hasActiveLocator
            ? `A/B Loop (${Math.round(loopLocator!.startSec)}s - ${Math.round(loopLocator!.endSec)}s) ${isLooping ? 'aktiv' : 'bereit'}`
            : (isLooping ? 'Loop aktiv (Endlos-Schleife)' : 'Loop aktivieren (Endlos-Schleife für Play-Alongs)')
        }
      >
        <Repeat size={16} strokeWidth={isLooping ? 2.8 : 2.2} />
        {hasActiveLocator && (
          <span style={{ fontSize: '0.66rem', fontWeight: 900, letterSpacing: '-0.02em' }}>A⇄B</span>
        )}
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
          height: isMobile ? '44px' : '34px',
          minWidth: isMobile ? '44px' : '34px',
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

      {/* Speed Button (Level-adaptive & pitch-preserved) */}
      <button
        type="button"
        onClick={handleCycleSpeed}
        aria-label={`Wiedergabegeschwindigkeit ${getSpeedLabel()}`}
        style={{
          border: playbackRate !== 1 ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
          background: playbackRate !== 1 ? '#dcfce7' : '#ffffff',
          color: playbackRate !== 1 ? '#15803d' : '#64748b',
          fontSize: '0.78rem',
          fontWeight: 850,
          height: isMobile ? '44px' : '34px',
          minWidth: isMobile ? '48px' : '40px',
          padding: '0 8px',
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
            : `Übetempo (${Math.round(playbackRate * 100)}%) mit Tonhöhen-Stabilisierung`
        }
      >
        {getSpeedLabel()}
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
          height: isMobile ? '44px' : '34px',
          minWidth: isMobile ? '44px' : '34px',
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

      {/* 🎛️ A/B Loop-Studio / Trimmer Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditorOpen(true);
        }}
        aria-label={hasActiveLocator ? 'A/B Loop-Schleife bearbeiten' : 'A/B Loop-Schleife einstellen'}
        style={{
          border: hasActiveLocator ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
          background: hasActiveLocator ? '#f0fdf4' : '#ffffff',
          color: hasActiveLocator ? '#16a34a' : '#6366f1',
          height: isMobile ? '44px' : '34px',
          minWidth: isMobile ? '44px' : '34px',
          padding: '0 8px',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          boxShadow: hasActiveLocator ? '0 0 0 2px rgba(34, 197, 94, 0.2)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.15s ease',
          touchAction: 'manipulation'
        }}
        className="hover-scale-mini"
        title={
          hasActiveLocator
            ? `A/B Loop aktiv: ${Math.round(loopLocator!.startSec)}s - ${Math.round(loopLocator!.endSec)}s (Tippen zum Ändern)`
            : 'A/B Loop-Bereich festlegen (Schleife für schwere Takte)'
        }
      >
        <SlidersHorizontal size={15} strokeWidth={hasActiveLocator ? 2.5 : 2.2} />
        {hasActiveLocator && (
          <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#16a34a' }}>A/B</span>
        )}
      </button>
    </div>
  );

  const renderDeleteButton = () => (
    onDelete ? (
      <button
        type="button"
        disabled={isDeleting}
        onClick={async (e) => {
          e.stopPropagation();
          if (isDeleting) return;
          setIsDeleting(true);
          try {
            await Promise.resolve(onDelete(e));
          } catch (err) {
            console.error('[AppleSplitCapsulePlayer] Delete error:', err);
            setIsDeleting(false);
          }
        }}
        style={{
          border: 'none',
          background: isDeleting ? '#fee2e2' : 'none',
          color: '#ef4444',
          cursor: isDeleting ? 'wait' : 'pointer',
          height: isMobile ? '38px' : '34px',
          width: isMobile ? '36px' : '32px',
          padding: 0,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDeleting ? 1 : 0.6,
          transition: 'opacity 0.15s ease',
          flexShrink: 0,
          touchAction: 'manipulation'
        }}
        onMouseEnter={e => { if (!isDeleting) e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={e => { if (!isDeleting) e.currentTarget.style.opacity = '0.6'; }}
        title={isDeleting ? "Wird gelöscht..." : "Aufnahme entfernen"}
        aria-label={isDeleting ? "Aufnahme wird gelöscht..." : "Aufnahme entfernen"}
      >
        {isDeleting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Trash2 size={16} />
        )}
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
      <audio
        ref={audioRef}
        src={resolvedUrl || undefined}
        preload="metadata"
        playsInline
        onLoadedMetadata={(e) => {
          const a = e.currentTarget;
          if (a.duration && isFinite(a.duration) && a.duration > 1) {
            setDuration(Math.round(a.duration));
          }
        }}
        onDurationChange={(e) => {
          const a = e.currentTarget;
          if (a.duration && isFinite(a.duration) && a.duration > 1) {
            setDuration(Math.round(a.duration));
          }
        }}
        onError={() => {
          console.warn('[AppleSplitCapsulePlayer] Audio stream error for:', resolvedUrl);
          if (resolvedUrl && resolvedUrl.includes('/storage/v1/object/sign/')) {
            const pubUrl = resolvedUrl.replace('/storage/v1/object/sign/', '/storage/v1/object/public/').split('?')[0];
            if (pubUrl && pubUrl !== resolvedUrl) {
              setResolvedUrl(pubUrl);
            }
          }
        }}
      />

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
              disabled={isDeleting}
              onClick={async (e) => {
                e.stopPropagation();
                if (isDeleting) return;
                setIsDeleting(true);
                try {
                  await Promise.resolve(onDelete(e));
                } catch (err) {
                  console.error('[AppleSplitCapsulePlayer] Mobile delete error:', err);
                  setIsDeleting(false);
                }
              }}
              style={{
                border: 'none',
                background: isDeleting ? '#fee2e2' : 'none',
                color: '#ef4444',
                cursor: isDeleting ? 'wait' : 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isDeleting ? 1 : 0.6,
                flexShrink: 0,
                transition: 'opacity 0.15s ease'
              }}
              onMouseEnter={e => { if (!isDeleting) e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={e => { if (!isDeleting) e.currentTarget.style.opacity = '0.6'; }}
              title={isDeleting ? "Wird gelöscht..." : "Diese Aufnahme löschen"}
              aria-label={isDeleting ? "Aufnahme wird gelöscht..." : "Diese Aufnahme löschen"}
            >
              {isDeleting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Trash2 size={13} />
              )}
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
              const barSec = duration > 0 ? barRatio * duration : 0;
              const isOutsideLocator = Boolean(
                isLooping &&
                loopLocator &&
                loopLocator.enabled &&
                duration > 0 &&
                (barSec < loopLocator.startSec || barSec > loopLocator.endSec)
              );

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
                    opacity: isOutsideLocator ? 0.32 : 1,
                    boxShadow: isHead && isPlaying ? '0 0 6px rgba(34, 197, 94, 0.8)' : 'none',
                    transition: 'background 0.1s ease, height 0.15s ease, opacity 0.15s ease'
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
            initialLocator={loopLocator}
            editorMode={!isTeacher || readOnly ? 'locator' : 'locator'}
            uiLevel={uiLevel}
            recordingId={url || resolvedUrl}
            userId={typeof window !== 'undefined' ? (localStorage.getItem('campus_auth_user_id') || localStorage.getItem('auth_user_id') || undefined) : undefined}
            schoolId={typeof window !== 'undefined' ? (localStorage.getItem('campus_current_school_id') || localStorage.getItem('last_active_school_id') || undefined) : undefined}
            onSave={(res) => {
              if (res.loop_locator !== undefined) {
                setLoopLocator(res.loop_locator);
                if (res.loop_locator?.enabled) {
                  setIsLooping(true); // ⚡ SOFORTIGE AKTIVIERUNG DES A/B LOOPS
                  const startPos = res.loop_locator.startSec || 0;
                  setCurrentTime(startPos);
                  if (audioRef.current) {
                    audioRef.current.currentTime = startPos;
                  }
                } else if (res.loop_locator === null) {
                  setIsLooping(false);
                }
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
            title={label || 'Aufnahme'}
            initialDuration={duration}
            currentUserRole={readOnly || !isTeacher ? 'student' : 'teacher'}
          />
        </Suspense>
      )}
    </div>
  );
};
