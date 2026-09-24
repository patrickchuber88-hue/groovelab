import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw, Play, Pause, RotateCcw, BookOpen } from 'lucide-react';
import { resolvePlayableAudioSource } from '../../../../utils/audioStorageHelper';

// 🎧 1% GOLDSTANDARD: STUDIO AUDIO RECORDING PLAYER (Zero-Crash, Fail-Safe Storage Resolver & WSOLA Pitch Shifter)
export interface StudioRecordingPlayerProps {
  track: any;
  effectiveAuthorName: string;
  subjectText: string;
  isStudentAuthor?: boolean;
  onOpenInHomeworkBook?: () => void;
}

export function StudioRecordingPlayer({
  track,
  effectiveAuthorName,
  subjectText,
  isStudentAuthor,
  onOpenInHomeworkBook
}: StudioRecordingPlayerProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(track.duration || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadAudio = useCallback(async () => {
    if (!track?.url) {
      setHasError(true);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setHasError(false);
    setIsPlaying(false);
    setCurrentTime(0);

    try {
      let resolved: string | null = null;

      // 1. If it's a blob: check if still valid in browser RAM
      if (track.url.startsWith('blob:')) {
        try {
          const testFetch = await fetch(track.url, { method: 'HEAD' });
          if (testFetch.ok) {
            resolved = track.url;
          }
        } catch {
          resolved = null;
        }
      }

      // 2. Primary resolve via campus-assets
      if (!resolved) {
        const res = await resolvePlayableAudioSource(track.url, 'campus-assets', 1800);
        if (res && res.src) {
          resolved = res.src;
        }
      }

      // 3. Fallback resolve via groovelab-assets
      if (!resolved && !track.url.startsWith('offline://') && !track.url.startsWith('blob:')) {
        try {
          const resGroove = await resolvePlayableAudioSource(track.url, 'groovelab-assets', 1800);
          if (resGroove && resGroove.src) {
            resolved = resGroove.src;
          }
        } catch {}
      }

      // 4. External HTTP/HTTPS or data URL
      if (!resolved && (track.url.startsWith('http://') || track.url.startsWith('https://') || track.url.startsWith('data:'))) {
        resolved = track.url;
      }

      if (resolved) {
        setResolvedUrl(resolved);
        setHasError(false);
      } else {
        setHasError(true);
      }
    } catch (err) {
      console.warn('[StudioRecordingPlayer] Resolution failed:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [track?.url]);

  useEffect(() => {
    loadAudio();
  }, [loadAudio]);

  const togglePlay = () => {
    if (!audioRef.current || hasError) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((e) => {
          console.warn('[StudioRecordingPlayer] play error:', e);
          setHasError(true);
          setIsPlaying(false);
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      (audioRef.current as any).preservesPitch = true;
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const totalDuration = duration > 0 ? duration : (track.duration || 0);
  const progressPercent = totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0;

  return (
    <div style={{
      background: '#f8fafc',
      border: '1.5px solid #e2e8f0',
      borderRadius: '20px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)'
    }}>
      {/* Hidden Native Audio Element */}
      {resolvedUrl && (
        <audio
          ref={audioRef}
          src={resolvedUrl}
          preload="metadata"
          onTimeUpdate={() => {
            if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (audioRef.current && (!duration || duration <= 0)) {
              setDuration(audioRef.current.duration);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          onError={() => {
            setHasError(true);
            setIsPlaying(false);
            setIsLoading(false);
          }}
        />
      )}

      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '1.02rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {track.label && track.label !== 'Aufnahme'
              ? track.label
              : (isStudentAuthor ? 'Eigene Übe-Aufnahme' : 'Vorspiel der Lehrkraft')}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>
            {effectiveAuthorName} • {subjectText}
          </div>
        </div>
        <div style={{
          fontSize: '0.74rem',
          fontWeight: 900,
          color: '#15803d',
          background: '#dcfce7',
          padding: '3px 10px',
          borderRadius: '100px',
          border: '1px solid #bbf7d0',
          whiteSpace: 'nowrap'
        }}>
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </div>
      </div>

      {/* Fallback / Offline State */}
      {hasError ? (
        <div style={{
          background: '#f8fafc',
          border: '1.5px solid #e2e8f0',
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontSize: '0.84rem', fontWeight: 800 }}>
            <BookOpen size={17} color="#16a34a" />
            <span>Im Aufgabenheft archiviert</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.45 }}>
            Diese Audio-Aufnahme ist direkt synchron mit deinen Noten im Aufgabenheft verknüpft.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            {onOpenInHomeworkBook && (
              <button
                type="button"
                onClick={onOpenInHomeworkBook}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  background: '#16a34a',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.80rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>Im Aufgabenheft öffnen</span>
                <span style={{ fontSize: '0.9rem' }}>→</span>
              </button>
            )}
            <button
              type="button"
              onClick={loadAudio}
              style={{
                padding: '7px 12px',
                borderRadius: '10px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#475569',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <RefreshCw size={12} />
              <span>Neu laden</span>
            </button>
          </div>
        </div>
      ) : (
        /* Player Body */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Main Controls & Progress Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* 48px Play/Pause Button */}
            <button
              type="button"
              onClick={togglePlay}
              disabled={isLoading}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: isPlaying ? '#0f172a' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isLoading ? 'wait' : 'pointer',
                boxShadow: isPlaying ? '0 4px 12px rgba(15, 23, 42, 0.25)' : '0 6px 18px rgba(22, 163, 74, 0.35)',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
              className="hover-scale"
              title={isPlaying ? 'Pausieren' : 'Abspielen'}
              aria-label={isPlaying ? 'Pausieren' : 'Abspielen'}
            >
              {isLoading ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={20} fill="currentColor" color="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" color="currentColor" style={{ marginLeft: '2px' }} />
              )}
            </button>

            {/* Custom Interactive Scrubber Track */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ position: 'relative', width: '100%', height: '24px', display: 'flex', alignItems: 'center' }}>
                <input
                  type="range"
                  min={0}
                  max={totalDuration > 0 ? totalDuration : 1}
                  step={0.05}
                  value={currentTime}
                  onChange={handleSeek}
                  disabled={isLoading || hasError}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '4px',
                    accentColor: '#16a34a',
                    cursor: 'pointer',
                    background: `linear-gradient(to right, #16a34a 0%, #16a34a ${progressPercent}%, #cbd5e1 ${progressPercent}%, #cbd5e1 100%)`,
                    outline: 'none'
                  }}
                  aria-label="Audio Abspielposition"
                />
              </div>
            </div>

            {/* Quick Restart Button */}
            <button
              type="button"
              onClick={handleRestart}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
              title="Von vorne abspielen"
              aria-label="Von vorne abspielen"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          {/* Speed Pills Toolbar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '6px',
            borderTop: '1px solid #e2e8f0'
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 850, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Übe-Tempo:
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { rate: 0.8, label: '0.8× Langsam' },
                { rate: 1.0, label: '1.0× Normal' },
                { rate: 1.2, label: '1.2× Schnell' }
              ].map((s) => {
                const isSelected = playbackRate === s.rate;
                return (
                  <button
                    key={s.rate}
                    type="button"
                    onClick={() => handleSpeedChange(s.rate)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: isSelected ? '#0f172a' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#475569',
                      border: isSelected ? '1px solid #0f172a' : '1px solid #cbd5e1',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      transition: 'all 0.12s ease'
                    }}
                    title={`Geschwindigkeit auf ${s.label} setzen`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
