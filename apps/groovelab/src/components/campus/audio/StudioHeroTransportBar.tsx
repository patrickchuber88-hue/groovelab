import React from 'react';
import { Play, Square, Repeat, Bookmark, Loader2 } from 'lucide-react';

export interface StudioHeroTransportBarProps {
  isLoading: boolean;
  isPlaying: boolean;
  isLooping: boolean;
  currentPlayTime: number;
  playbackSpeed: number;
  formatTime: (secs: number) => string;
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onSetSpeed: (speed: number) => void;
  onOpenNoteAtTime: (time: number) => void;
  isMobile: boolean;
}

const SPEED_OPTIONS = [1.0, 0.85, 0.75, 0.5];

export const StudioHeroTransportBar: React.FC<StudioHeroTransportBarProps> = ({
  isLoading,
  isPlaying,
  isLooping,
  currentPlayTime,
  playbackSpeed,
  formatTime,
  onTogglePlay,
  onToggleLoop,
  onSetSpeed,
  onOpenNoteAtTime,
  isMobile
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: isMobile ? '8px' : '12px',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#ffffff',
        borderRadius: '20px',
        border: '1.5px solid #f1f5f9',
        padding: isMobile ? '8px 10px' : '10px 14px',
        boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.04)'
      }}
    >
      {/* 🔴 Left Group: Hero Play/Pause & Loop Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: isMobile ? '1 1 100%' : 'none' }}>
        {/* YouTube Hero Play/Pause Button (52px Touch-Ergonomie) */}
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={isLoading}
          style={{
            minHeight: '48px',
            minWidth: isMobile ? '100%' : '170px',
            background: isPlaying
              ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
              : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '14px',
            padding: '10px 18px',
            fontSize: '0.88rem',
            fontWeight: 850,
            cursor: isLoading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: isPlaying
              ? '0 4px 12px rgba(15, 23, 42, 0.25)'
              : '0 6px 18px rgba(239, 68, 68, 0.35)',
            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
            touchAction: 'manipulation',
            flex: isMobile ? 1 : 'none'
          }}
          className="hover-scale-mini"
          aria-label={isPlaying ? 'Pause' : 'Abspielen'}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Lade Audio...</span>
            </>
          ) : isPlaying ? (
            <>
              <Square size={16} fill="currentColor" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play size={16} fill="currentColor" />
              <span>Abspielen ({formatTime(currentPlayTime)})</span>
            </>
          )}
        </button>

        {/* 🔁 Track Loop Button */}
        {!isMobile && (
          <button
            type="button"
            onClick={onToggleLoop}
            style={{
              minHeight: '48px',
              minWidth: '48px',
              background: isLooping ? 'rgba(239, 68, 68, 0.10)' : '#f8fafc',
              color: isLooping ? '#dc2626' : '#64748b',
              border: isLooping ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0',
              borderRadius: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'manipulation',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
            title={isLooping ? 'Endlos-Loop aktiv (Taste: L)' : 'Endlos-Loop aktivieren (Taste: L)'}
            aria-label="Endlos-Schleife umschalten"
          >
            <Repeat size={18} strokeWidth={isLooping ? 2.6 : 2.0} />
          </button>
        )}
      </div>

      {/* 🎚️ Center: Modern Segmented YouTube Tempo Capsule */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#f8fafc',
          border: '1.5px solid #e2e8f0',
          borderRadius: '14px',
          padding: '3px',
          gap: '2px',
          flex: isMobile ? '1 1 auto' : 'none'
        }}
        title="Tempo wählen (Taste: 1-4)"
      >
        <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#94a3b8', padding: '0 6px', textTransform: 'uppercase' }}>
          Speed
        </span>
        {SPEED_OPTIONS.map((spd) => {
          const isActive = playbackSpeed === spd;
          return (
            <button
              key={spd}
              type="button"
              onClick={() => onSetSpeed(spd)}
              style={{
                background: isActive ? '#0f172a' : 'transparent',
                color: isActive ? '#ffffff' : '#64748b',
                border: 'none',
                borderRadius: '10px',
                padding: isMobile ? '6px 8px' : '7px 11px',
                fontSize: '0.74rem',
                fontWeight: isActive ? 900 : 700,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
                touchAction: 'manipulation',
                minHeight: '36px'
              }}
            >
              {spd === 1.0 ? '1.0x' : `${spd}x`}
            </button>
          );
        })}
      </div>

      {/* 📍 Right: Reels-Style +Marker Action Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: isMobile ? '1 1 auto' : 'none' }}>
        {isMobile && (
          <button
            type="button"
            onClick={onToggleLoop}
            style={{
              minHeight: '44px',
              minWidth: '44px',
              background: isLooping ? 'rgba(239, 68, 68, 0.10)' : '#f8fafc',
              color: isLooping ? '#dc2626' : '#64748b',
              border: isLooping ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'manipulation'
            }}
            className="hover-scale-mini"
            title="Loop"
          >
            <Repeat size={16} strokeWidth={isLooping ? 2.6 : 2.0} />
          </button>
        )}

        <button
          type="button"
          onClick={() => onOpenNoteAtTime(currentPlayTime)}
          style={{
            minHeight: '44px',
            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '14px',
            padding: '10px 16px',
            fontSize: '0.84rem',
            fontWeight: 850,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: 'none',
            transition: 'all 0.15s ease',
            flex: isMobile ? 1 : 'none',
            touchAction: 'manipulation'
          }}
          className="hover-scale-mini"
          title="Marker an aktueller Position setzen (Pausiert automatisch · Shortcut: M)"
          aria-label="Marker an aktueller Position setzen"
        >
          <Bookmark size={15} strokeWidth={2.4} fill="currentColor" />
          <span>+ Marker</span>
        </button>
      </div>
    </div>
  );
};
