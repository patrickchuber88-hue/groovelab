import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';

interface AudioWaveformVisualizerProps {
  audioUrl: string;
  title?: string;
  themeColor?: string;
  isCampus?: boolean;
  onEnded?: () => void;
}

export const AudioWaveformVisualizer: React.FC<AudioWaveformVisualizerProps> = ({
  audioUrl,
  title,
  themeColor = '#34a853',
  isCampus = true,
  onEnded
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveData, setWaveData] = useState<number[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Generate deterministic, realistic waveform bars from audioUrl hash
  useEffect(() => {
    const barsCount = 42;
    const bars: number[] = [];
    let hash = 0;
    for (let i = 0; i < audioUrl.length; i++) {
      hash = ((hash << 5) - hash) + audioUrl.charCodeAt(i);
      hash |= 0;
    }

    for (let i = 0; i < barsCount; i++) {
      const pseudoRand = Math.abs(Math.sin(hash + i * 1.618));
      const val = 0.2 + pseudoRand * 0.75;
      bars.push(val);
    }
    setWaveData(bars);
  }, [audioUrl]);

  // Audio lifecycle
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (onEnded) onEnded();
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioUrl]);

  // 60fps Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const progress = duration > 0 ? currentTime / duration : 0;
      const barWidth = (width / waveData.length) * 0.65;
      const gap = (width / waveData.length) * 0.35;

      waveData.forEach((barHeightNorm, index) => {
        const x = index * (barWidth + gap);
        const barHeight = Math.max(4, barHeightNorm * (height * 0.85));
        const y = (height - barHeight) / 2;

        const isPlayed = (index / waveData.length) <= progress;

        ctx.fillStyle = isPlayed 
          ? (isCampus ? '#16a34a' : '#ca8a04') 
          : 'rgba(148, 163, 184, 0.45)';

        // Draw rounded bar
        ctx.beginPath();
        const radius = barWidth / 2;
        ctx.roundRect(x, y, barWidth, barHeight, radius);
        ctx.fill();
      });

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [waveData, currentTime, duration, isPlaying, isCampus]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn('[AudioWaveformVisualizer] Playback error:', err);
      });
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !audioRef.current || duration <= 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = progress * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div 
      style={{
        background: '#ffffff',
        border: '1px solid rgba(226, 232, 240, 0.95)',
        borderRadius: '18px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          border: 'none',
          background: isCampus ? '#16a34a' : '#ca8a04',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          boxShadow: `0 4px 12px ${isCampus ? 'rgba(22, 163, 74, 0.3)' : 'rgba(202, 138, 4, 0.3)'}`,
          transition: 'all 0.12s ease'
        }}
        title={isPlaying ? 'Pause' : 'Abspielen'}
      >
        {isPlaying ? <Pause size={17} /> : <Play size={17} style={{ marginLeft: '2px' }} />}
      </button>

      {/* Waveform Canvas */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {title && (
          <span style={{ fontSize: '0.74rem', fontWeight: 750, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </span>
        )}
        <canvas
          ref={canvasRef}
          width={280}
          height={32}
          onClick={handleCanvasClick}
          style={{
            width: '100%',
            height: '32px',
            cursor: 'pointer',
            display: 'block'
          }}
          title="Klicken zum Vor-/Zurückspringen"
        />
      </div>

      {/* Time Display */}
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {formatSeconds(currentTime)} / {formatSeconds(duration || 0)}
      </div>
    </div>
  );
};
