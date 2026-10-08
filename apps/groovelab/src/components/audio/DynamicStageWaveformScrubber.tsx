import React from 'react';

// 🌊 36 Organic Waveform Heights for Audiophile Waveform Rendering
export const ORGANIC_WAVEFORM = [
  24, 38, 55, 78, 62, 45, 88, 95, 72, 60,
  82, 90, 76, 52, 68, 85, 98, 70, 58, 80,
  92, 65, 48, 74, 88, 62, 50, 68, 82, 55,
  42, 60, 75, 48, 35, 22
];

const formatTime = (secs: number): string => {
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export interface DynamicStageWaveformScrubberProps {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  onSeek: (newTime: number) => void;
  isLooping?: boolean;
  loopLocator?: { startSec: number; endSec: number; enabled?: boolean } | null;
  uiLevel?: 'junior' | 'teen' | 'pro';
}

export const DynamicStageWaveformScrubber: React.FC<DynamicStageWaveformScrubberProps> = ({
  isPlaying,
  duration,
  currentTime,
  onSeek,
  isLooping = false,
  loopLocator = null
}) => {
  const progressRatio = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
  const hasLocator = Boolean(loopLocator && loopLocator.endSec > loopLocator.startSec && duration > 0);
  const startPct = hasLocator ? Math.max(0, Math.min(100, (loopLocator!.startSec / duration) * 100)) : 0;
  const endPct = hasLocator ? Math.max(0, Math.min(100, (loopLocator!.endSec / duration) * 100)) : 100;
  const spanPct = Math.max(0, endPct - startPct);
  const isLoopActive = Boolean(isLooping && loopLocator?.enabled);

  const handleScrubClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newRatio = Math.max(0, Math.min(1, clickX / rect.width));
    let newTime = newRatio * (duration || 0);

    if (isLoopActive && hasLocator) {
      if (newTime < loopLocator!.startSec || newTime > loopLocator!.endSec) {
        newTime = loopLocator!.startSec;
      }
    }
    onSeek(newTime);
  };

  if (isPlaying) {
    return (
      <div 
        onClick={handleScrubClick}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          height: '24px',
          cursor: 'pointer',
          width: '100%',
          padding: '2px 0',
          boxSizing: 'border-box'
        }}
        title={hasLocator ? `A/B-Loop: ${formatTime(loopLocator!.startSec)} - ${formatTime(loopLocator!.endSec)} (Tippen zum Spulen)` : "Tippen zum Spulen"}
        role="progressbar"
        aria-valuenow={Math.round(currentTime)}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-label="Audio-Fortschritt und Wellenform"
      >
        {/* 📍 A/B Loop Corridor & Pins */}
        {hasLocator && (
          <>
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

            {/* Marker A */}
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

            {/* Marker B */}
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

        {/* Dynamic Organic Waveform Bars */}
        {ORGANIC_WAVEFORM.map((h, i) => {
          const barRatio = i / ORGANIC_WAVEFORM.length;
          const isFilled = barRatio <= progressRatio;
          const isHead = Math.abs(barRatio - progressRatio) < (1 / ORGANIC_WAVEFORM.length);
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
                minWidth: '2px',
                height: `${Math.max(18, h)}%`,
                borderRadius: '9999px',
                background: isFilled 
                  ? 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)' 
                  : 'rgba(22, 163, 74, 0.14)',
                opacity: isOutsideLocator ? 0.32 : 1,
                boxShadow: isHead ? '0 0 8px rgba(34, 197, 94, 0.75)' : 'none',
                transition: 'background 0.1s ease, height 0.15s ease, opacity 0.15s ease'
              }}
            />
          );
        })}
      </div>
    );
  }

  // 🛑 STOP-Modus: Schlanke, elegante 4px Timeline-Scrubber-Linie ohne Balken-Clutter
  return (
    <div 
      onClick={handleScrubClick}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        height: '14px',
        cursor: 'pointer',
        width: '100%',
        padding: '4px 0',
        boxSizing: 'border-box'
      }}
      title="Tippen zum Vor- oder Zurückspulen"
      role="progressbar"
      aria-valuenow={Math.round(currentTime)}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-label="Audio-Fortschrittsleiste"
    >
      <div style={{
        width: '100%',
        height: '4px',
        borderRadius: '99px',
        background: '#e2e8f0',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${progressRatio * 100}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
          borderRadius: '99px',
          transition: 'width 0.1s linear'
        }} />
      </div>
      <div style={{
        position: 'absolute',
        left: `calc(${progressRatio * 100}% - 4px)`,
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: '#15803d',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        pointerEvents: 'none',
        transition: 'left 0.1s linear'
      }} />
    </div>
  );
};

export interface DynamicStageActiveBadgesProps {
  playbackRate: number;
  speedLabel: string;
  isLooping: boolean;
  hasActiveLocator: boolean;
  countInSoundActive?: boolean;
}

export const DynamicStageActiveBadges: React.FC<DynamicStageActiveBadgesProps> = ({
  playbackRate,
  speedLabel,
  isLooping,
  hasActiveLocator,
  countInSoundActive = false
}) => {
  const hasBadges = playbackRate !== 1 || isLooping || countInSoundActive;
  if (!hasBadges) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
      {playbackRate !== 1 && (
        <span style={{
          fontSize: '0.70rem',
          fontWeight: 850,
          color: '#15803d',
          background: '#dcfce7',
          border: '1px solid #16a34a',
          borderRadius: '99px',
          padding: '2px 8px',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {speedLabel}
        </span>
      )}
      {isLooping && (
        <span style={{
          fontSize: '0.70rem',
          fontWeight: 850,
          color: '#166534',
          background: '#bbf7d0',
          border: '1px solid #15803d',
          borderRadius: '99px',
          padding: '2px 8px'
        }}>
          🔁 {hasActiveLocator ? 'A⇄B' : 'Loop'}
        </span>
      )}
      {countInSoundActive && (
        <span style={{
          fontSize: '0.70rem',
          fontWeight: 850,
          color: '#15803d',
          background: '#dcfce7',
          border: '1px solid #16a34a',
          borderRadius: '99px',
          padding: '2px 8px'
        }}>
          ⏱ 4
        </span>
      )}
    </div>
  );
};
