import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Repeat, 
  Gauge, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { SpotifyGradeStreamController } from '../../services/audio/SpotifyGradeStreamController';
import { DidacticWsolaEngine } from '../../services/audio/DidacticWsolaEngine';
import { WsolaPlaybackState } from '../../services/audio/types';

export interface EnterpriseAudioPlayerProps {
  audioUrl: string;
  title?: string;
  subtitle?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  className?: string;
}

export const EnterpriseAudioPlayer: React.FC<EnterpriseAudioPlayerProps> = ({
  audioUrl,
  title = 'GrooveLab High-Fidelity Audio',
  subtitle,
  autoPlay = false,
  onEnded,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<WsolaPlaybackState>({
    playbackRate: 1.0,
    isLooping: false,
    loopStartSec: 0,
    loopEndSec: 0,
    currentTimeSec: 0,
    durationSec: 0,
    isPlaying: false,
    volume: 1.0,
    isMuted: false
  });

  const [downloadProgress, setDownloadProgress] = useState<number>(0);

  const streamControllerRef = useRef<SpotifyGradeStreamController | null>(null);
  const engineRef = useRef<DidacticWsolaEngine | null>(null);

  // Format seconds to mm:ss
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize and load audio
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    setDownloadProgress(0);

    const streamController = new SpotifyGradeStreamController();
    const engine = new DidacticWsolaEngine();
    streamControllerRef.current = streamController;
    engineRef.current = engine;

    const unsubscribeState = engine.subscribeState((state) => {
      if (isMounted) setPlaybackState(state);
    });

    const unsubscribeTime = engine.subscribeTime((currentTime, duration) => {
      if (isMounted) {
        setPlaybackState((prev) => ({
          ...prev,
          currentTimeSec: currentTime,
          durationSec: duration
        }));
      }
    });

    const loadStream = async () => {
      try {
        const audioBuffer = await streamController.loadAudio(
          audioUrl,
          (loaded, total) => {
            if (isMounted && total > 0) {
              setDownloadProgress(Math.round((loaded / total) * 100));
            }
          }
        );

        if (!isMounted) return;
        engine.loadBuffer(audioBuffer);
        setIsLoading(false);

        if (autoPlay) {
          await engine.play();
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('[EnterpriseAudioPlayer] Audio load error:', err);
          setErrorMessage('Audio konnte nicht gestreamt werden. Bitte erneut versuchen.');
          setIsLoading(false);
        }
      }
    };

    loadStream();

    return () => {
      isMounted = false;
      unsubscribeState();
      unsubscribeTime();
      engine.dispose();
      streamController.abort();
    };
  }, [audioUrl, autoPlay]);

  const handleTogglePlay = useCallback(async () => {
    if (!engineRef.current || isLoading) return;
    try {
      if (playbackState.isPlaying) {
        engineRef.current.pause();
      } else {
        await engineRef.current.play();
      }
    } catch (err) {
      console.warn('[EnterpriseAudioPlayer] Play toggle failed:', err);
    }
  }, [playbackState.isPlaying, isLoading]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!engineRef.current) return;
    const newTime = parseFloat(e.target.value);
    engineRef.current.seek(newTime);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!engineRef.current) return;
    const newVol = parseFloat(e.target.value);
    engineRef.current.setVolume(newVol);
  }, []);

  const handleToggleMute = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.toggleMute();
  }, []);

  const handleToggleLoop = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.setLoop(!playbackState.isLooping);
  }, [playbackState.isLooping]);

  const handleSpeedSelect = useCallback((speed: number) => {
    if (!engineRef.current) return;
    engineRef.current.setPlaybackRate(speed);
  }, []);

  const handleReset = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.seek(0);
  }, []);

  const speeds = [0.5, 0.7, 0.85, 1.0, 1.2];

  return (
    <div 
      className={`enterprise-audio-player ${className}`}
      style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '20px',
        padding: '20px',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
      }}
      role="region"
      aria-label="GrooveLab Enterprise Audio Player"
    >
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
            {title}
          </h4>
          {subtitle && (
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Quality Badge (Spotify-Grade 48kHz Float32) */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '999px',
          background: '#fef9c3',
          border: '1px solid #facc15',
          fontSize: '0.72rem',
          fontWeight: 800,
          color: '#854d0e'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ca8a04' }} />
          Hi-Fi 48 kHz
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#991b1b',
          fontSize: '0.8rem'
        }} role="alert">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Progress Bar & Scrubbing Slider */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
          <input
            type="range"
            min={0}
            max={playbackState.durationSec || 100}
            step={0.01}
            value={playbackState.currentTimeSec}
            onChange={handleSeek}
            disabled={isLoading || !!errorMessage}
            aria-label="Audio Timeline Slider"
            aria-valuemin={0}
            aria-valuemax={playbackState.durationSec || 100}
            aria-valuenow={playbackState.currentTimeSec}
            aria-valuetext={`${formatTime(playbackState.currentTimeSec)} von ${formatTime(playbackState.durationSec)}`}
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '6px',
              appearance: 'none',
              background: `linear-gradient(to right, #facc15 0%, #facc15 ${
                playbackState.durationSec > 0 
                  ? (playbackState.currentTimeSec / playbackState.durationSec) * 100 
                  : 0
              }%, #e2e8f0 ${
                playbackState.durationSec > 0 
                  ? (playbackState.currentTimeSec / playbackState.durationSec) * 100 
                  : 0
              }%, #e2e8f0 100%)`,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              outline: 'none'
            }}
          />
        </div>

        {/* Timecode labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
          <span>{formatTime(playbackState.currentTimeSec)}</span>
          {isLoading && downloadProgress > 0 && downloadProgress < 100 ? (
            <span style={{ color: '#ca8a04' }}>Puffert {downloadProgress}%...</span>
          ) : (
            <span>{formatTime(playbackState.durationSec)}</span>
          )}
        </div>
      </div>

      {/* Primary Interaction Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Left: Transport Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Reset / Return to Start */}
          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            aria-label="Zum Anfang zurückspringen"
            title="Zum Anfang (0:00)"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              touchAction: 'manipulation'
            }}
          >
            <RotateCcw size={18} />
          </button>

          {/* Primary Play / Pause Button (GrooveLab Yellow with Slate-900 Contrast) */}
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={isLoading}
            aria-label={playbackState.isPlaying ? 'Wiedergabe anhalten' : 'Wiedergabe starten'}
            title={playbackState.isPlaying ? 'Pause' : 'Play'}
            style={{
              minWidth: '52px',
              height: '44px',
              padding: '0 18px',
              borderRadius: '14px',
              border: 'none',
              background: '#facc15',
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              fontWeight: 900,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(250, 204, 21, 0.35)',
              touchAction: 'manipulation'
            }}
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : playbackState.isPlaying ? (
              <>
                <Pause size={20} fill="#0f172a" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={20} fill="#0f172a" style={{ marginLeft: '2px' }} />
                <span>Play</span>
              </>
            )}
          </button>

          {/* Loop Mode Toggle */}
          <button
            type="button"
            onClick={handleToggleLoop}
            aria-label={playbackState.isLooping ? 'Endlosschleife deaktivieren' : 'Endlosschleife aktivieren'}
            title="Loop-Modus"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              border: playbackState.isLooping ? '1.5px solid #ca8a04' : '1px solid #e2e8f0',
              background: playbackState.isLooping ? '#fef9c3' : '#f8fafc',
              color: playbackState.isLooping ? '#854d0e' : '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              touchAction: 'manipulation'
            }}
          >
            <Repeat size={18} />
          </button>
        </div>

        {/* Center: Educational Speed Controls (WSOLA Time-Stretch) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: '#f1f5f9',
          padding: '3px',
          borderRadius: '12px'
        }} role="group" aria-label="Übegeschwindigkeit">
          <Gauge size={15} style={{ margin: '0 6px', color: '#64748b' }} aria-hidden="true" />
          {speeds.map((s) => {
            const isSelected = playbackState.playbackRate === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => handleSpeedSelect(s)}
                aria-pressed={isSelected}
                aria-label={`Geschwindigkeit ${s * 100}%`}
                style={{
                  height: '32px',
                  padding: '0 10px',
                  borderRadius: '9px',
                  border: 'none',
                  background: isSelected ? '#ffffff' : 'transparent',
                  color: isSelected ? '#0f172a' : '#64748b',
                  fontSize: '0.74rem',
                  fontWeight: isSelected ? 800 : 600,
                  boxShadow: isSelected ? '0 1px 4px rgba(0, 0, 0, 0.08)' : 'none',
                  cursor: 'pointer',
                  touchAction: 'manipulation'
                }}
              >
                {s === 1.0 ? '1x' : `${s}x`}
              </button>
            );
          })}
        </div>

        {/* Right: Volume Controller */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={playbackState.isMuted ? 'Ton einschalten' : 'Stummschalten'}
            title={playbackState.isMuted ? 'Ton an' : 'Stumm'}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: playbackState.isMuted ? '#ef4444' : '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              touchAction: 'manipulation'
            }}
          >
            {playbackState.isMuted || playbackState.volume === 0 ? (
              <VolumeX size={18} />
            ) : (
              <Volume2 size={18} />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={playbackState.isMuted ? 0 : playbackState.volume}
            onChange={handleVolumeChange}
            aria-label="Lautstärkeregler"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((playbackState.isMuted ? 0 : playbackState.volume) * 100)}
            style={{
              width: '75px',
              height: '6px',
              borderRadius: '4px',
              accentColor: '#facc15',
              cursor: 'pointer'
            }}
          />
        </div>
      </div>
    </div>
  );
};
