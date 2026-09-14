import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Repeat, Headphones, Timer } from 'lucide-react';
import { getBlob } from '../../utils/blobStorage';
import { getSecureAudioUrl } from '../../utils/audioStorageHelper';
import { AudioTrackItem } from '../AudioTrackCarousel';
import { formatHarmonizedAudioTitle } from '../../utils/audioNamingHelper';

export interface ZenPlayAlongDockProps {
  tracks: AudioTrackItem[];
  initialIndex?: number;
  isMusicStandMode?: boolean;
  teacherName?: string;
  teacherAvatarUrl?: string;
  theme?: 'dark' | 'light' | 'amber';
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
    return { icon: '💡', tag: 'Tipp', type: 'tipp', color: '#facc15', border: '#fde047' };
  }
  return { icon: '🎧', tag: `Spur ${index + 1}`, type: 'audio', color: '#6366f1', border: '#a5b4fc' };
};

// 🛡️ Enterprise+ OWASP ASVS L3 / UrhG § 19a Audio Resolver
async function resolveAudioSourceUrl(rawUrl: string): Promise<{ url: string; isBlobUrl: boolean }> {
  if (!rawUrl) return { url: '', isBlobUrl: false };
  if (rawUrl.startsWith('campus_blob_') || rawUrl.startsWith('campus_audio_') || rawUrl.startsWith('offline://')) {
    try {
      const raw = await getBlob(rawUrl);
      if (raw) {
        const finalBlob = raw instanceof Blob ? raw : new Blob([raw], { type: 'audio/webm' });
        const blobUrl = URL.createObjectURL(finalBlob);
        return { url: blobUrl, isBlobUrl: true };
      }
    } catch (err) {
      console.warn('[ZenPlayAlongDock] Failed to resolve indexedDB blob:', err);
    }
    return { url: rawUrl, isBlobUrl: false };
  }
  if (rawUrl.startsWith('blob:') || rawUrl.startsWith('data:')) {
    return { url: rawUrl, isBlobUrl: false };
  }
  try {
    const secUrl = await getSecureAudioUrl(rawUrl, 'campus-assets', 300);
    if (secUrl) {
      return { url: secUrl, isBlobUrl: false };
    }
  } catch (err) {
    console.warn('[ZenPlayAlongDock] Failed to sign secure audio URL:', err);
  }
  return { url: rawUrl, isBlobUrl: false };
}

export const ZenPlayAlongDock: React.FC<ZenPlayAlongDockProps> = ({
  tracks,
  initialIndex = 0,
  isMusicStandMode = false,
  teacherName = 'Deine Lehrkraft',
  teacherAvatarUrl = '/campus_login_hero.png',
  theme = 'dark'
}) => {
  const isLight = theme === 'light';
  const isAmber = theme === 'amber';
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

  // Resolve Blob / Signed URL for current track
  useEffect(() => {
    if (!currentTrack?.url) return;

    let isMounted = true;
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }

    resolveAudioSourceUrl(currentTrack.url).then(({ url, isBlobUrl }) => {
      if (!isMounted) {
        if (isBlobUrl) URL.revokeObjectURL(url);
        return;
      }
      if (isBlobUrl) {
        currentBlobUrlRef.current = url;
      }
      setResolvedUrl(url);
    });

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

      if (audioRef.current.ended || (duration > 0 && audioRef.current.currentTime >= duration)) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }

      if (resolvedUrl && (!audioRef.current.src || audioRef.current.src !== resolvedUrl)) {
        audioRef.current.src = resolvedUrl;
        audioRef.current.load();
      }

      audioRef.current.loop = isLooping;

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
        background: isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(15, 23, 42, 0.92)',
        backdropFilter: isLight ? 'blur(24px)' : 'blur(24px) saturate(1.8)',
        WebkitBackdropFilter: isLight ? 'blur(24px)' : 'blur(24px) saturate(1.8)',
        border: isLight
          ? '1.5px solid rgba(0, 113, 227, 0.16)'
          : isAmber
          ? '1.5px solid rgba(245, 158, 11, 0.35)'
          : '1.5px solid rgba(165, 180, 252, 0.35)',
        borderRadius: '28px',
        padding: isMusicStandMode ? '12px 18px' : '10px 16px',
        boxShadow: isLight
          ? '0 20px 45px rgba(0, 113, 227, 0.08), 0 4px 15px rgba(0, 0, 0, 0.04)'
          : isAmber
          ? '0 24px 50px rgba(0, 0, 0, 0.75), 0 0 24px rgba(245, 158, 11, 0.20)'
          : '0 24px 50px rgba(0, 0, 0, 0.75), 0 0 24px rgba(99, 102, 241, 0.22)',
        display: 'flex',
        flexDirection: 'column',
        gap: '9px',
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
        src={resolvedUrl || undefined}
        preload="auto"
        playsInline
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
        onError={(e) => {
          console.warn('[ZenPlayAlongDock] Audio playback error:', e);
          setIsPlaying(false);
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
                  minWidth: '40px',
                  maxWidth: '64px',
                  height: '38px',
                  background: isLight
                    ? isSel
                      ? 'linear-gradient(135deg, #0071e3 0%, #0284c7 100%)'
                      : hasListened
                      ? '#dcfce7'
                      : '#f1f5f9'
                    : isAmber
                    ? isSel
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.75) 0%, rgba(217, 119, 6, 0.9) 100%)'
                      : hasListened
                      ? 'rgba(34, 197, 94, 0.18)'
                      : 'rgba(255, 255, 255, 0.08)'
                    : isSel
                      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.45) 0%, rgba(79, 70, 229, 0.65) 100%)'
                      : hasListened
                      ? 'rgba(34, 197, 94, 0.16)'
                      : 'rgba(255, 255, 255, 0.08)',
                  border: isLight
                    ? isSel
                      ? '1.5px solid #93c5fd'
                      : hasListened
                      ? '1px solid #86efac'
                      : '1px solid #e2e8f0'
                    : isAmber
                    ? isSel
                      ? '1.5px solid #fde047'
                      : hasListened
                      ? '1px solid rgba(74, 222, 128, 0.5)'
                      : '1px solid rgba(255, 255, 255, 0.14)'
                    : isSel
                      ? '1.5px solid rgba(165, 180, 252, 0.85)'
                      : hasListened
                      ? '1px solid rgba(74, 222, 128, 0.45)'
                      : '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: '100px',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  userSelect: 'none',
                  boxShadow: isLight
                    ? isSel
                      ? '0 4px 14px rgba(0, 113, 227, 0.35)'
                      : '0 2px 6px rgba(0, 0, 0, 0.04)'
                    : isAmber
                    ? isSel
                      ? '0 0 16px rgba(245, 158, 11, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3)'
                      : '0 2px 8px rgba(0, 0, 0, 0.2)'
                    : isSel
                      ? '0 0 16px rgba(99, 102, 241, 0.45), 0 4px 12px rgba(0, 0, 0, 0.3)'
                      : '0 2px 8px rgba(0, 0, 0, 0.2)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative'
                }}
                className="hover-scale"
                title={`Spur ${idx + 1}: ${track.label || ped.tag}`}
                aria-label={`Spur ${idx + 1} wählen: ${ped.tag}`}
              >
                {ped.icon === '🎧' ? (
                  <Headphones
                    size={12}
                    color={isSel ? '#ffffff' : isLight ? '#64748b' : isAmber ? '#fbbf24' : '#a5b4fc'}
                    style={{ flexShrink: 0 }}
                  />
                ) : (
                  <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>{ped.icon}</span>
                )}
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 950,
                    color: isLight
                      ? isSel ? '#ffffff' : hasListened ? '#15803d' : '#475569'
                      : isAmber
                      ? isSel ? '#ffffff' : hasListened ? '#86efac' : '#f1f5f9'
                      : isSel ? '#ffffff' : hasListened ? '#86efac' : '#cbd5e1',
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
                      boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                      border: isLight ? '1.5px solid #ffffff' : '1.5px solid #0f172a'
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
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '5px', paddingTop: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <Headphones size={13} color={isPlaying ? (isLight ? '#0071e3' : '#4ade80') : (isLight ? '#64748b' : isAmber ? '#fbbf24' : '#a5b4fc')} style={{ flexShrink: 0 }} />
            <span style={{
              fontSize: '0.84rem',
              fontWeight: 850,
              color: isLight ? '#0f172a' : '#ffffff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {tracks.length > 1 ? `Spur ${activeIndex + 1}: ` : ''}
              {formatHarmonizedAudioTitle(currentTrack, tracks, true)}
            </span>
          </div>

          <span style={{
            fontSize: '0.76rem',
            fontWeight: 800,
            color: isLight ? '#64748b' : '#cbd5e1',
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
            height: '6px',
            borderRadius: '100px',
            background: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.16)',
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
              background: isLight
                ? isPlaying ? 'linear-gradient(90deg, #0071e3 0%, #10b981 100%)' : '#0071e3'
                : isAmber
                ? isPlaying ? 'linear-gradient(90deg, #f59e0b 0%, #22c55e 100%)' : '#f59e0b'
                : isPlaying ? 'linear-gradient(90deg, #6366f1 0%, #22c55e 100%)' : '#818cf8',
              borderRadius: '100px',
              transition: 'width 0.1s linear'
            }}
          />
        </div>
      </div>

      {/* 3. SYMMETRISCHE KONTROLL-LEISTE (4-BEAT LINKS | APPLE PLAY MITTE | LOOP RECHTS) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        gap: '12px',
        paddingTop: '4px'
      }}>
        {/* Links: ⏱️ 4-Beat Einzähler (Apple Music Capsule) */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            setIsCountInActive(!isCountInActive);
          }}
          style={{
            flex: '1 1 0',
            height: '38px',
            background: isLight
              ? isCountInActive
                ? 'rgba(245, 158, 11, 0.14)'
                : '#f8fafc'
              : isCountInActive
                ? 'rgba(245, 158, 11, 0.22)'
                : 'rgba(255, 255, 255, 0.09)',
            border: isLight
              ? isCountInActive ? '1.5px solid #f59e0b' : '1.5px solid #e2e8f0'
              : isCountInActive ? '1.5px solid rgba(253, 224, 71, 0.75)' : '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '100px',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            color: isLight
              ? isCountInActive ? '#b45309' : '#334155'
              : isCountInActive ? '#fef08a' : '#f1f5f9',
            fontSize: '0.82rem',
            fontWeight: 900,
            cursor: 'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
            boxShadow: isLight
              ? isCountInActive ? '0 0 16px rgba(245, 158, 11, 0.25)' : '0 2px 6px rgba(0, 0, 0, 0.04)'
              : isCountInActive
                ? '0 0 16px rgba(245, 158, 11, 0.4), 0 4px 12px rgba(0, 0, 0, 0.25)'
                : '0 4px 12px rgba(0, 0, 0, 0.25)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          className="hover-scale"
          title={isCountInActive ? '4-Beat Einzähler aktiv' : '4-Beat Einzähler aktivieren (3s Vorbereitung)'}
          aria-label={isCountInActive ? '4-Beat Einzähler aktiv' : '4-Beat Einzähler aktivieren'}
        >
          <Timer size={14} strokeWidth={isCountInActive ? 2.8 : 2.2} />
          <span>4-Beat</span>
        </button>

        {/* Mitte: Apple Music Studio Master Play/Pause-Button */}
        <button
          type="button"
          onClick={togglePlay}
          style={{
            background: isLight
              ? countInStep !== null
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : isPlaying
                ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                : 'linear-gradient(135deg, #0071e3 0%, #0284c7 100%)'
              : isAmber
              ? countInStep !== null
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : isPlaying
                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              : countInStep !== null
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : isPlaying
                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: '#ffffff',
            border: isLight
              ? countInStep !== null
                ? '2px solid #fde047'
                : isPlaying
                ? '2px solid #86efac'
                : '2px solid #bfdbfe'
              : isAmber
              ? countInStep !== null
                ? '2px solid rgba(253, 224, 71, 0.95)'
                : isPlaying
                ? '2px solid rgba(134, 239, 172, 0.95)'
                : '2px solid rgba(253, 224, 71, 0.95)'
              : countInStep !== null
                ? '2px solid rgba(253, 224, 71, 0.85)'
                : isPlaying
                ? '2px solid rgba(134, 239, 172, 0.85)'
                : '2px solid rgba(165, 180, 252, 0.85)',
            borderRadius: '50%',
            width: isMusicStandMode ? '54px' : '50px',
            height: isMusicStandMode ? '54px' : '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
            boxShadow: isLight
              ? countInStep !== null
                ? '0 0 24px rgba(245, 158, 11, 0.4)'
                : isPlaying
                ? '0 0 24px rgba(22, 163, 74, 0.35)'
                : '0 0 24px rgba(0, 113, 227, 0.35)'
              : isAmber
              ? countInStep !== null
                ? '0 0 24px rgba(245, 158, 11, 0.65), 0 6px 18px rgba(0, 0, 0, 0.4)'
                : isPlaying
                ? '0 0 24px rgba(34, 197, 94, 0.55), 0 6px 18px rgba(0, 0, 0, 0.4)'
                : '0 0 24px rgba(245, 158, 11, 0.5), 0 6px 18px rgba(0, 0, 0, 0.4)'
              : countInStep !== null
                ? '0 0 24px rgba(245, 158, 11, 0.65), 0 6px 18px rgba(0, 0, 0, 0.4)'
                : isPlaying
                ? '0 0 24px rgba(34, 197, 94, 0.55), 0 6px 18px rgba(0, 0, 0, 0.4)'
                : '0 0 24px rgba(99, 102, 241, 0.5), 0 6px 18px rgba(0, 0, 0, 0.4)',
            transition: 'transform 0.15s ease, background 0.25s ease'
          }}
          className="hover-scale"
          aria-label={countInStep !== null ? `Einzählen: ${countInStep}` : isPlaying ? 'Pause' : 'Abspielen'}
        >
          {countInStep !== null ? (
            <span
              style={{
                fontSize: isMusicStandMode ? '1.85rem' : '1.7rem',
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
            <Pause size={isMusicStandMode ? 22 : 20} fill="#ffffff" />
          ) : (
            <Play size={isMusicStandMode ? 22 : 20} fill="#ffffff" style={{ marginLeft: '2px' }} />
          )}
        </button>

        {/* Rechts: 🔁 Loop (Apple Music Capsule) */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            setIsLooping(!isLooping);
          }}
          style={{
            flex: '1 1 0',
            height: '38px',
            background: isLight
              ? isLooping
                ? 'rgba(34, 197, 94, 0.14)'
                : '#f8fafc'
              : isLooping
                ? 'rgba(34, 197, 94, 0.22)'
                : 'rgba(255, 255, 255, 0.09)',
            border: isLight
              ? isLooping ? '1.5px solid #22c55e' : '1.5px solid #e2e8f0'
              : isLooping ? '1.5px solid rgba(134, 239, 172, 0.75)' : '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '100px',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            color: isLight
              ? isLooping ? '#15803d' : '#334155'
              : isLooping ? '#bbf7d0' : '#f1f5f9',
            fontSize: '0.82rem',
            fontWeight: 900,
            cursor: 'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
            boxShadow: isLight
              ? isLooping ? '0 0 16px rgba(34, 197, 94, 0.25)' : '0 2px 6px rgba(0, 0, 0, 0.04)'
              : isLooping
                ? '0 0 16px rgba(34, 197, 94, 0.4), 0 4px 12px rgba(0, 0, 0, 0.25)'
                : '0 4px 12px rgba(0, 0, 0, 0.25)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          className="hover-scale"
          title={isLooping ? 'Loop aktiv: Endlose Wiederholung' : 'Loop aktivieren'}
          aria-label={isLooping ? 'Loop aktiv' : 'Loop aktivieren'}
        >
          <Repeat size={14} strokeWidth={isLooping ? 2.8 : 2.2} />
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

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    resolveAudioSourceUrl(track.url).then(({ url, isBlobUrl }) => {
      if (!active) {
        if (isBlobUrl) URL.revokeObjectURL(url);
        return;
      }
      if (isBlobUrl) {
        blobUrlRef.current = url;
      }
      setResolvedUrl(url);
    });

    return () => {
      active = false;
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

  // Resolve Blob / Signed URL for current selected track
  useEffect(() => {
    if (!currentTrack?.url) return;
    let active = true;

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    resolveAudioSourceUrl(currentTrack.url).then(({ url, isBlobUrl }) => {
      if (!active) {
        if (isBlobUrl) URL.revokeObjectURL(url);
        return;
      }
      if (isBlobUrl) {
        blobUrlRef.current = url;
      }
      setResolvedUrl(url);
    });

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

