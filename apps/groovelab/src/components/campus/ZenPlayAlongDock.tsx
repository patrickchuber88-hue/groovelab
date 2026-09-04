import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Repeat, Headphones, Timer } from 'lucide-react';
import { getBlob } from '../../utils/blobStorage';
import { AudioTrackItem } from '../AudioTrackCarousel';

export interface ZenPlayAlongDockProps {
  tracks: AudioTrackItem[];
  initialIndex?: number;
  isMusicStandMode?: boolean;
  teacherName?: string;
  teacherAvatarUrl?: string;
}

const formatTrackTime = (seconds: number) => {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

// WebAudio Sine Beep Generator für 4-Beat Einzähler & Start-Countdown (Akustischer Countdown am Instrument)
export const playCountInBeep = (isAccent: boolean) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isAccent ? 960 : 640, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // silent fallback
  }
};

// Smarte Pädagogik-Zuordnung für Kindersoftware (Schnecke, Rakete, Beat, Play-Along, Tipp)
export const getTrackPedagogicalType = (label?: string, index: number = 0) => {
  const l = (label || '').toLowerCase();
  if (
    l.includes('langsam') ||
    l.includes('slow') ||
    l.includes('tempo 60') ||
    l.includes('tempo 50') ||
    l.includes('tempo 70') ||
    l.includes('übetempo') ||
    l.includes('uebetempo') ||
    l.includes('schnecke')
  ) {
    return { icon: '🐢', tag: 'Langsam', type: 'slow', color: '#10b981', border: '#86efac' };
  }
  if (
    l.includes('schnell') ||
    l.includes('fast') ||
    l.includes('original') ||
    l.includes('ziel') ||
    l.includes('vollgas') ||
    l.includes('tempo 120') ||
    l.includes('tempo 100') ||
    l.includes('rakete')
  ) {
    return { icon: '🚀', tag: 'Original', type: 'fast', color: '#f59e0b', border: '#fcd34d' };
  }
  if (
    l.includes('beat') ||
    l.includes('takt') ||
    l.includes('metronom') ||
    l.includes('klick') ||
    l.includes('click') ||
    l.includes('drums') ||
    l.includes('zählen') ||
    l.includes('zaehlen') ||
    l.includes('rhythmus')
  ) {
    return { icon: '🥁', tag: 'Beat', type: 'beat', color: '#38bdf8', border: '#7dd3fc' };
  }
  if (
    l.includes('playalong') ||
    l.includes('play-along') ||
    l.includes('begleitung') ||
    l.includes('band') ||
    l.includes('playback') ||
    l.includes('mitspielen') ||
    l.includes('solo')
  ) {
    return { icon: '🎸', tag: 'Play-Along', type: 'playalong', color: '#a855f7', border: '#d8b4fe' };
  }
  if (
    l.includes('tipp') ||
    l.includes('hinweis') ||
    l.includes('stimme') ||
    l.includes('sprache') ||
    l.includes('erklärung') ||
    l.includes('erklaerung') ||
    l.includes('kommentar')
  ) {
    return { icon: '💬', tag: 'Tipp', type: 'tip', color: '#ec4899', border: '#f472b6' };
  }
  return { icon: '🎧', tag: `Spur ${index + 1}`, type: 'default', color: '#6366f1', border: '#a5b4fc' };
};

export const ZenPlayAlongDock: React.FC<ZenPlayAlongDockProps> = ({
  tracks,
  initialIndex = 0,
  isMusicStandMode = false,
  teacherName = 'Deine Lehrkraft',
  teacherAvatarUrl = '/campus_login_hero.png'
}) => {
  const [activeIndex, setActiveIndex] = useState(
    initialIndex >= 0 && initialIndex < tracks.length ? initialIndex : 0
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Übe-Werkzeuge: Loop und Einzählen (Standardmäßig AUS laut Pädagogik-Entscheidung)
  const [isLooping, setIsLooping] = useState(false);
  const [isCountInActive, setIsCountInActive] = useState(false);
  const [countInStep, setCountInStep] = useState<number | null>(null);

  // Status-Tracking: Verhindert, dass Spuren untergehen (dezent grüner Haken nach mind. 3 Sek.)
  const [listenedIndices, setListenedIndices] = useState<number[]>([]);

  const [resolvedUrl, setResolvedUrl] = useState<string>('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerIdRef = useRef<string>(`zen_dock_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`);
  const currentBlobUrlRef = useRef<string | null>(null);
  const countInTimerRef = useRef<any>(null);

  // Sync initialIndex wenn von außen gewählt
  useEffect(() => {
    if (typeof initialIndex === 'number' && initialIndex >= 0 && initialIndex < tracks.length) {
      setActiveIndex(initialIndex);
    }
  }, [initialIndex, tracks.length]);

  const currentTrack = tracks && tracks.length > 0 ? (tracks[activeIndex] || tracks[0]) : null;

  // Resolve Blob URL for current track
  useEffect(() => {
    if (!currentTrack?.url) return;

    let isMounted = true;
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }

    const rawUrl = currentTrack.url;
    if (rawUrl.startsWith('campus_blob_') || rawUrl.startsWith('campus_audio_')) {
      getBlob(rawUrl)
        .then((raw: any) => {
          if (!isMounted || !raw) return;
          const blob = raw instanceof Blob ? raw : new Blob([raw], { type: 'audio/webm' });
          const objectUrl = URL.createObjectURL(blob);
          currentBlobUrlRef.current = objectUrl;
          setResolvedUrl(objectUrl);
        })
        .catch(err => {
          console.warn('[ZenPlayAlongDock] Failed to resolve blob:', err);
          if (isMounted) setResolvedUrl(rawUrl);
        });
    } else {
      setResolvedUrl(rawUrl);
    }

    return () => {
      isMounted = false;
    };
  }, [currentTrack?.url]);

  // Cleanup Count-In Timer bei Unmount
  useEffect(() => {
    return () => {
      if (countInTimerRef.current) {
        clearTimeout(countInTimerRef.current);
        countInTimerRef.current = null;
      }
    };
  }, []);

  // Global audio listener to stop playing if another player activates
  useEffect(() => {
    const handleGlobalPlay = (e: any) => {
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

    window.addEventListener('campus-global-audio-play', handleGlobalPlay);
    return () => {
      window.removeEventListener('campus-global-audio-play', handleGlobalPlay);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
      }
    };
  }, []);

  // Sync audio source and state when resolvedUrl changes
  useEffect(() => {
    if (!audioRef.current) return;
    if (resolvedUrl) {
      audioRef.current.src = resolvedUrl;
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
    }
  }, [resolvedUrl]);

  if (!tracks || tracks.length === 0 || !currentTrack) return null;

  // 1-Tap Play/Pause mit integriertem 4-Beat-Einzähler
  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Wenn gerade eingezählt wird -> Tippen bricht das Einzählen ab
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
      window.dispatchEvent(
        new CustomEvent('campus-global-audio-play', {
          detail: { playerId: playerIdRef.current }
        })
      );

      // Falls Einzählen aktiv ist: 4 -> 3 -> 2 -> 1 (akustisch & optisch im Button)
      if (isCountInActive) {
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
              audioRef.current.currentTime = 0;
              audioRef.current
                .play()
                .then(() => setIsPlaying(true))
                .catch(err => {
                  console.warn('[ZenPlayAlongDock] Play failed:', err);
                  setIsPlaying(false);
                });
            }
          }
        };
        countInTimerRef.current = setTimeout(runCount, 550);
      } else {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(err => {
            console.warn('[ZenPlayAlongDock] Play failed:', err);
            setIsPlaying(false);
          });
      }
    }
  };

  const trackProgress = duration > 0 ? currentTime / duration : 0;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: isMusicStandMode ? '640px' : '580px',
        margin: '0 auto',
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
        border: '1.5px solid rgba(165, 180, 252, 0.35)',
        borderRadius: '32px',
        padding: isMusicStandMode ? '16px 24px' : '14px 20px',
        boxShadow: '0 24px 50px rgba(0, 0, 0, 0.75), 0 0 24px rgba(99, 102, 241, 0.22)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxSizing: 'border-box',
        zIndex: 10,
        animation: 'fadeIn 0.3s ease'
      }}
      title={`Play-Along Studio • Aufnahmen von ${teacherName}`}
    >
      <style>{`
        @keyframes countInPulse {
          0% { transform: scale(1.35); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) {
            const cur = audioRef.current.currentTime;
            setCurrentTime(cur);
            // Nach 3 Sekunden Übezeit gilt die Spur als erfolgreich angespielt
            if (cur >= 3 && !listenedIndices.includes(activeIndex)) {
              setListenedIndices(prev => (prev.includes(activeIndex) ? prev : [...prev, activeIndex]));
            }
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration || currentTrack.duration || 0);
          }
        }}
        onEnded={() => {
          // Geklärter Goldstandard: Sofort nahtlos wiederholen (0 Sekunden Verzögerung im Flow)
          if (isLooping && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => setIsPlaying(false));
          } else {
            setIsPlaying(false);
            setCurrentTime(0);
          }
        }}
      />

      {/* 1. DIE STATIONEN-LEISTE (SEGMENTED SOUNDBAR) - Mobile Squircle Pads (0% Truncation) */}
      {tracks.length > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            paddingBottom: '2px'
          }}
        >
          {tracks.map((track, idx) => {
            const isSel = idx === activeIndex;
            const hasListened = listenedIndices.includes(idx);
            const ped = getTrackPedagogicalType(track.label, idx);

            return (
              <button
                key={`${track.url}-${idx}`}
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  if (countInTimerRef.current) {
                    clearTimeout(countInTimerRef.current);
                    countInTimerRef.current = null;
                    setCountInStep(null);
                  }
                  if (idx !== activeIndex) {
                    setActiveIndex(idx);
                    setCurrentTime(0);
                  } else {
                    togglePlay();
                  }
                }}
                style={{
                  flex: '1 1 0',
                  minWidth: '44px',
                  maxWidth: '68px',
                  height: '46px',
                  background: isSel
                    ? 'linear-gradient(180deg, #4f46e5 0%, #3730a3 100%)'
                    : hasListened
                    ? 'rgba(22, 101, 52, 0.35)'
                    : 'rgba(255, 255, 255, 0.08)',
                  border: isSel
                    ? '2px solid #a5b4fc'
                    : hasListened
                    ? '1.5px solid rgba(74, 222, 128, 0.55)'
                    : '1.5px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: '16px',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  boxShadow: isSel
                    ? '0 3px 0 #1e1b4b, 0 6px 16px rgba(99, 102, 241, 0.45)'
                    : '0 2px 0 rgba(0, 0, 0, 0.45)',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
                className="hover-scale"
                title={`Spur ${idx + 1}: ${track.label || ped.tag}`}
                aria-label={`Spur ${idx + 1} wählen: ${ped.tag}`}
              >
                <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>{ped.icon}</span>
                <span
                  style={{
                    fontSize: '0.86rem',
                    fontWeight: 950,
                    color: isSel ? '#ffffff' : hasListened ? '#86efac' : '#cbd5e1',
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  {idx + 1}
                </span>
                {hasListened && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      width: '15px',
                      height: '15px',
                      borderRadius: '50%',
                      background: '#22c55e',
                      color: '#ffffff',
                      fontSize: '0.62rem',
                      fontWeight: 950,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                      border: '1.5px solid #0f172a'
                    }}
                    title="Diese Spur hast du bereits geübt!"
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 2. VOLLBREITER SPUL-FORTSCHRITTSBALKEN MIT TITEL & ZEIT (APPLE DYNAMIC MEDIA DOCK) */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <Headphones size={14} color={isPlaying ? '#4ade80' : '#a5b4fc'} style={{ flexShrink: 0 }} />
            <span style={{
              fontSize: '0.88rem',
              fontWeight: 850,
              color: '#ffffff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {tracks.length > 1 ? `Spur ${activeIndex + 1}: ` : ''}
              {currentTrack.label || `Aufnahme #${activeIndex + 1}`}
            </span>
          </div>

          <span style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            color: '#cbd5e1',
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0
          }}>
            {formatTrackTime(currentTime)} / {formatTrackTime(duration || currentTrack.duration || 0)}
          </span>
        </div>

        {/* Apple Touch Scrubber Bar */}
        <div
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const ratio = Math.max(0, Math.min(1, clickX / rect.width));
            const targetTime = ratio * (duration || currentTrack.duration || 0);
            setCurrentTime(targetTime);
            if (audioRef.current) audioRef.current.currentTime = targetTime;
          }}
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '100px',
            background: 'rgba(255, 255, 255, 0.16)',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            touchAction: 'none'
          }}
          title="Tippen zum Vor- oder Zurückspulen der Spur"
        >
          <div
            style={{
              width: `${Math.min(100, Math.max(0, trackProgress * 100))}%`,
              height: '100%',
              background: isPlaying ? 'linear-gradient(90deg, #6366f1 0%, #22c55e 100%)' : '#818cf8',
              borderRadius: '100px',
              transition: 'width 0.1s linear'
            }}
          />
        </div>
      </div>

      {/* 3. SYMMETRISCHE KONTROLL-LEISTE (4-BEAT LINKS | 56px APPLE PLAY MITTE | LOOP RECHTS) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        gap: '12px',
        paddingTop: '4px'
      }}>
        {/* Links: ⏱️ 4-Beat Einzähler */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            setIsCountInActive(!isCountInActive);
          }}
          style={{
            flex: '1 1 0',
            height: '44px',
            background: isCountInActive
              ? 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'
              : 'linear-gradient(180deg, #334155 0%, #1e293b 100%)',
            border: isCountInActive ? '1.5px solid #fde047' : '1.5px solid #475569',
            borderRadius: '14px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            color: '#ffffff',
            fontSize: '0.84rem',
            fontWeight: 850,
            cursor: 'pointer',
            boxShadow: isCountInActive
              ? '0 2px 0 #b45309, 0 4px 12px rgba(245, 158, 11, 0.4)'
              : '0 2px 0 #0f172a',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale"
          title={isCountInActive ? '4-Beat Einzähler aktiv' : '4-Beat Einzähler aktivieren (3s Vorbereitung)'}
        >
          <Timer size={15} strokeWidth={isCountInActive ? 2.8 : 2.2} />
          <span>4-Beat</span>
        </button>

        {/* Mitte: Großer 56px Apple Play/Pause-Button */}
        <button
          type="button"
          onClick={togglePlay}
          style={{
            background:
              countInStep !== null
                ? 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'
                : isPlaying
                ? 'linear-gradient(180deg, #4ade80 0%, #22c55e 100%)'
                : 'linear-gradient(180deg, #818cf8 0%, #6366f1 100%)',
            color: '#ffffff',
            border:
              countInStep !== null
                ? '2.5px solid #fde047'
                : isPlaying
                ? '2px solid #86efac'
                : '2px solid #a5b4fc',
            borderRadius: '50%',
            width: isMusicStandMode ? '62px' : '56px',
            height: isMusicStandMode ? '62px' : '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow:
              countInStep !== null
                ? '0 4px 0 #b45309, 0 8px 24px rgba(245, 158, 11, 0.65)'
                : isPlaying
                ? '0 4px 0 #15803d, 0 8px 24px rgba(34, 197, 94, 0.65)'
                : '0 4px 0 #4338ca, 0 8px 22px rgba(99, 102, 241, 0.55)',
            transition: 'transform 0.15s ease, background 0.25s ease'
          }}
          className="hover-scale"
          aria-label={countInStep !== null ? `Einzählen: ${countInStep}` : isPlaying ? 'Pause' : 'Abspielen'}
        >
          {countInStep !== null ? (
            <span
              style={{
                fontSize: isMusicStandMode ? '2.1rem' : '1.9rem',
                fontWeight: 950,
                color: '#ffffff',
                lineHeight: 1,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                animation: 'countInPulse 0.5s ease-out'
              }}
            >
              {countInStep}
            </span>
          ) : isPlaying ? (
            <Pause size={isMusicStandMode ? 26 : 24} fill="#ffffff" />
          ) : (
            <Play size={isMusicStandMode ? 26 : 24} fill="#ffffff" style={{ marginLeft: '3px' }} />
          )}
        </button>

        {/* Rechts: 🔁 Loop */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            setIsLooping(!isLooping);
          }}
          style={{
            flex: '1 1 0',
            height: '44px',
            background: isLooping
              ? 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)'
              : 'linear-gradient(180deg, #334155 0%, #1e293b 100%)',
            border: isLooping ? '1.5px solid #86efac' : '1.5px solid #475569',
            borderRadius: '14px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            color: '#ffffff',
            fontSize: '0.84rem',
            fontWeight: 850,
            cursor: 'pointer',
            boxShadow: isLooping
              ? '0 2px 0 #15803d, 0 4px 12px rgba(34, 197, 94, 0.4)'
              : '0 2px 0 #0f172a',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale"
          title={isLooping ? 'Loop aktiv: Endlose Wiederholung' : 'Loop aktivieren'}
        >
          <Repeat size={15} strokeWidth={isLooping ? 2.8 : 2.2} />
          <span>Loop</span>
        </button>
      </div>
    </div>
  );
};

export const PreFlightAudioPreviewButton: React.FC<{
  track?: AudioTrackItem;
  isCompact?: boolean;
}> = ({ track, isCompact = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerIdRef = useRef<string>(`preflight_audio_${Math.random().toString(36).substring(2, 9)}`);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!track?.url) return;
    let active = true;
    const rawUrl = track.url;
    if (rawUrl.startsWith('campus_blob_') || rawUrl.startsWith('campus_audio_')) {
      getBlob(rawUrl)
        .then((raw: any) => {
          if (!active || !raw) return;
          const blob = raw instanceof Blob ? raw : new Blob([raw], { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          setResolvedUrl(url);
        })
        .catch(() => {
          if (active) setResolvedUrl(rawUrl);
        });
    } else {
      setResolvedUrl(rawUrl);
    }

    return () => {
      active = false;
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, [track?.url]);

  useEffect(() => {
    const handleOther = (e: any) => {
      if (e?.detail?.playerId && e.detail.playerId !== playerIdRef.current) {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
      }
    };
    window.addEventListener('campus-global-audio-play', handleOther);
    return () => {
      window.removeEventListener('campus-global-audio-play', handleOther);
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  if (!track?.url) return null;

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      window.dispatchEvent(
        new CustomEvent('campus-global-audio-play', { detail: { playerId: playerIdRef.current } })
      );
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      style={{
        background: isPlaying ? '#16a34a' : isCompact ? '#f0fdf4' : '#ffffff',
        color: isPlaying ? '#ffffff' : '#15803d',
        border: isCompact ? '1.5px solid #86efac' : '1.5px solid #86efac',
        borderRadius: isCompact ? '50%' : '100px',
        width: isCompact ? '24px' : 'auto',
        height: isCompact ? '24px' : 'auto',
        padding: isCompact ? '0' : '5px 12px',
        fontSize: isCompact ? '0.74rem' : '0.78rem',
        fontWeight: 900,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        cursor: 'pointer',
        boxShadow: isPlaying ? '0 2px 8px rgba(22, 163, 74, 0.3)' : '0 1px 3px rgba(0,0,0,0.05)',
        flexShrink: 0
      }}
      className="hover-scale"
      title={isPlaying ? 'Vorschau pausieren' : 'Aufnahme kurz vorhören'}
    >
      <audio ref={audioRef} src={resolvedUrl} onEnded={() => setIsPlaying(false)} />
      {isPlaying ? (
        <Pause size={isCompact ? 10 : 12} fill="currentColor" />
      ) : (
        <Play size={isCompact ? 10 : 12} fill="currentColor" style={{ marginLeft: isCompact ? '1px' : '0' }} />
      )}
      {!isCompact && <span>{isPlaying ? 'Pause' : 'Vorhören'}</span>}
    </button>
  );
};

export interface PreFlightAudioPlayerSectionProps {
  tracks: AudioTrackItem[];
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
}

export const PreFlightAudioPlayerSection: React.FC<PreFlightAudioPlayerSectionProps> = ({
  tracks,
  selectedIndex,
  onSelectIndex
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerIdRef = useRef<string>(`preflight_section_${Math.random().toString(36).substring(2, 9)}`);
  const blobUrlRef = useRef<string | null>(null);

  const safeIndex = Math.max(0, Math.min(selectedIndex, tracks.length - 1));
  const currentTrack = tracks[safeIndex] || tracks[0];

  // Resolve Blob URL for current selected track
  useEffect(() => {
    if (!currentTrack?.url) return;
    let active = true;
    const rawUrl = currentTrack.url;

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    if (rawUrl.startsWith('campus_blob_') || rawUrl.startsWith('campus_audio_')) {
      getBlob(rawUrl)
        .then((raw: any) => {
          if (!active || !raw) return;
          const blob = raw instanceof Blob ? raw : new Blob([raw], { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          setResolvedUrl(url);
        })
        .catch(() => {
          if (active) setResolvedUrl(rawUrl);
        });
    } else {
      setResolvedUrl(rawUrl);
    }

    return () => {
      active = false;
    };
  }, [currentTrack?.url]);

  // Global play listener
  useEffect(() => {
    const handleOther = (e: any) => {
      if (e?.detail?.playerId && e.detail.playerId !== playerIdRef.current) {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
      }
    };
    window.addEventListener('campus-global-audio-play', handleOther);
    return () => {
      window.removeEventListener('campus-global-audio-play', handleOther);
      if (audioRef.current) audioRef.current.pause();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const toggleTrack = (idx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!audioRef.current) return;

    if (idx !== selectedIndex) {
      onSelectIndex(idx);
      setCurrentTime(0);
      window.dispatchEvent(
        new CustomEvent('campus-global-audio-play', { detail: { playerId: playerIdRef.current } })
      );
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        }
      }, 50);
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      window.dispatchEvent(
        new CustomEvent('campus-global-audio-play', { detail: { playerId: playerIdRef.current } })
      );
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const target = ratio * (duration || currentTrack?.duration || 0);
    setCurrentTime(target);
    audioRef.current.currentTime = target;
  };

  const trackProgress = duration > 0 ? currentTime / duration : 0;

  if (!tracks || tracks.length === 0) return null;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <audio
        ref={audioRef}
        src={resolvedUrl}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />

      {/* Multi-Track Station Selector */}
      {tracks.length > 1 ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          paddingTop: '2px',
          paddingBottom: '2px',
          scrollbarWidth: 'none'
        }}>
          {tracks.map((tr: AudioTrackItem, trIdx: number) => {
            const isSelected = trIdx === selectedIndex;
            const isCurrentPlaying = isSelected && isPlaying;
            return (
              <div
                key={`${tr.url}-${trIdx}`}
                style={{
                  flex: '1 1 0',
                  minWidth: '48px',
                  maxWidth: '68px',
                  background: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.70)',
                  border: isSelected ? '2px solid #16a34a' : '1.5px solid #bbf7d0',
                  borderRadius: '16px',
                  padding: '7px 4px 6px 4px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  boxShadow: isSelected ? '0 3px 0 #15803d, 0 4px 10px rgba(22, 163, 74, 0.2)' : '0 1px 2px rgba(0,0,0,0.03)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => toggleTrack(trIdx)}
                title={`Aufnahme ${trIdx + 1}${tr.label ? `: ${tr.label}` : ''}`}
              >
                {/* Oben: Kopfhörer & Ziffer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                  <Headphones size={13} color={isSelected ? '#16a34a' : '#475569'} strokeWidth={2.4} />
                  <span style={{
                    fontSize: '0.86rem',
                    fontWeight: 950,
                    color: isSelected ? '#14532d' : '#334155',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1
                  }}>
                    {trIdx + 1}
                  </span>
                </div>

                {/* Unten: Play-Zeichen Vorhör-Button */}
                <button
                  type="button"
                  onClick={(e) => toggleTrack(trIdx, e)}
                  style={{
                    background: isCurrentPlaying ? '#16a34a' : isSelected ? '#dcfce7' : '#f0fdf4',
                    color: isCurrentPlaying ? '#ffffff' : '#15803d',
                    border: '1.5px solid #86efac',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: isCurrentPlaying ? '0 2px 8px rgba(22, 163, 74, 0.35)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale"
                  title={isCurrentPlaying ? 'Vorschau pausieren' : 'Aufnahme vorhören'}
                >
                  {isCurrentPlaying ? (
                    <Pause size={10} fill="currentColor" />
                  ) : (
                    <Play size={10} fill="currentColor" style={{ marginLeft: '1px' }} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* Single Track Row */
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          border: '1.5px solid #86efac',
          borderRadius: '16px',
          padding: '8px 12px',
          boxShadow: '0 2px 6px rgba(22, 163, 74, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => toggleTrack(0)}
              style={{
                background: isPlaying ? '#16a34a' : '#dcfce7',
                color: isPlaying ? '#ffffff' : '#15803d',
                border: '1.5px solid #86efac',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              className="hover-scale"
            >
              {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" style={{ marginLeft: '1px' }} />}
            </button>
            <span style={{ fontSize: '0.88rem', fontWeight: 850, color: '#14532d' }}>
              {currentTrack?.label || 'Unterrichtsaufnahme'}
            </span>
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#166534', fontVariantNumeric: 'tabular-nums' }}>
            {formatTrackTime(currentTime)} / {formatTrackTime(duration || currentTrack?.duration || 0)}
          </span>
        </div>
      )}

      {/* 🎚️ WIEDERGABE-FORTSCHRITTSBALKEN ZUM SPULEN (UNTERHALB DER AUFNAHMEN) */}
      <div style={{
        marginTop: '2px',
        padding: '6px 10px',
        background: 'rgba(255, 255, 255, 0.85)',
        border: '1px solid #bbf7d0',
        borderRadius: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{
            fontSize: '0.76rem',
            fontWeight: 800,
            color: '#15803d',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {tracks.length > 1 ? `Spur ${selectedIndex + 1}: ` : ''}
            {currentTrack?.label || `Aufnahme #${selectedIndex + 1}`}
          </span>
          <span style={{
            fontSize: '0.74rem',
            fontWeight: 850,
            color: '#166534',
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0
          }}>
            {formatTrackTime(currentTime)} / {formatTrackTime(duration || currentTrack?.duration || 0)}
          </span>
        </div>

        {/* Interaktiver Scrubber-Balken zum Spulen */}
        <div
          onClick={handleScrub}
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '100px',
            background: 'rgba(22, 163, 74, 0.16)',
            border: '1px solid rgba(22, 163, 74, 0.22)',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
          title="Tippen zum Vor- oder Zurückspulen der Aufnahme"
        >
          <div
            style={{
              width: `${Math.min(100, Math.max(0, trackProgress * 100))}%`,
              height: '100%',
              background: isPlaying ? 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)' : '#4ade80',
              borderRadius: '100px',
              transition: 'width 0.1s linear'
            }}
          />
        </div>
      </div>
    </div>
  );
};

