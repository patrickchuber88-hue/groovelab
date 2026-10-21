import React from 'react';
import { Bookmark, Check, ZoomIn, Plus, Target, Lightbulb, Star } from 'lucide-react';
import { AudioTimelineNote, AudioNoteTag } from '../../../utils/audioNotesStorage';
import { RainbowMarkerColor, getMarkerColor } from '../AudioNotesModal';

export interface StudioWaveformTimelineStageProps {
  duration: number;
  currentPlayTime: number;
  isPlaying: boolean;
  notes: AudioTimelineNote[];
  waveformBars: Array<{ x: number; y: number; width: number; height: number }>;
  zoomLevel: 1 | 2 | 3;
  setZoomLevel: (z: 1 | 2 | 3) => void;
  spotLoopNoteId: string | null;
  spotLoopRange: { start: number; end: number } | null;
  draggingNoteId: string | null;
  draggedTime: number | null;
  isStudent: boolean;
  isMobile: boolean;
  formatTime: (secs: number) => string;
  waveformScrollRef: React.RefObject<HTMLDivElement>;
  waveformContainerRef: React.RefObject<HTMLDivElement>;
  onWaveformPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPinPointerDown: (e: React.PointerEvent<HTMLDivElement>, noteId: string, time: number) => void;
  onPlayNotePreRoll: (time: number) => void;
  // 📍 0,1% Goldstandard: Live Creation Ghost-Pin
  isAddingNote?: boolean;
  newNoteTime?: number;
  newNoteTag?: AudioNoteTag;
  onNewNoteTimeChange?: (t: number) => void;
}

export const StudioWaveformTimelineStage: React.FC<StudioWaveformTimelineStageProps> = ({
  duration,
  currentPlayTime,
  isPlaying,
  notes,
  waveformBars,
  zoomLevel,
  setZoomLevel,
  spotLoopNoteId,
  spotLoopRange,
  draggingNoteId,
  draggedTime,
  isStudent,
  isMobile,
  formatTime,
  waveformScrollRef,
  waveformContainerRef,
  onWaveformPointerDown,
  onPinPointerDown,
  onPlayNotePreRoll,
  isAddingNote = false,
  newNoteTime = 0,
  newNoteTag = 'tip',
  onNewNoteTimeChange
}) => {
  const playPercent = duration > 0 ? (currentPlayTime / duration) * 100 : 0;
  const practicedCount = notes.filter((n) => n.isPracticed).length;
  const ghostPercent = duration > 0 ? Math.min(100, Math.max(0, (newNoteTime / duration) * 100)) : 0;

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #090d16 0%, #0d1322 100%)',
        borderRadius: '22px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 16px 36px -12px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        padding: isMobile ? '10px 12px 12px 12px' : '12px 16px 14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* 🔴 Subtiler YouTube Scarlet Umgebungs-Glow */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '15%',
          width: '180px',
          height: '90px',
          background: 'radial-gradient(ellipse, rgba(239, 68, 68, 0.16) 0%, transparent 70%)',
          filter: 'blur(20px)',
          pointerEvents: 'none'
        }}
      />

      {/* 🎛️ Header: Timestamp HUD, Practice Progress & Zoom Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2, flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* YouTube-Style Digital Time Pill */}
          <div
            style={{
              fontSize: '0.76rem',
              fontWeight: 900,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              color: '#ffffff',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '4px 10px',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              letterSpacing: '0.02em',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isPlaying ? '#ef4444' : '#94a3b8', boxShadow: isPlaying ? '0 0 8px #ef4444' : 'none' }} />
            <span>
              <strong style={{ color: '#ef4444' }}>{formatTime(currentPlayTime)}</strong> / {formatTime(duration)}
            </span>
          </div>

          {/* Marker Counter Pill */}
          <span
            style={{
              fontSize: '0.70rem',
              fontWeight: 800,
              color: notes.length > 0 ? '#38bdf8' : '#94a3b8',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '3px 8px',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Bookmark size={11} strokeWidth={2.5} fill={notes.length > 0 ? '#38bdf8' : 'transparent'} />
            <span>{notes.length} {notes.length === 1 ? 'Marker' : 'Marker'}</span>
          </span>

          {/* Practice Completion Badge */}
          {notes.length > 0 && (
            <span
              style={{
                fontSize: '0.70rem',
                fontWeight: 800,
                color: practicedCount === notes.length ? '#ffffff' : '#cbd5e1',
                background: practicedCount === notes.length ? '#10b981' : 'rgba(255, 255, 255, 0.06)',
                border: 'none',
                padding: '3px 8px',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Check size={11} strokeWidth={2.8} color="#ffffff" />
              <span>{practicedCount}/{notes.length} geübt</span>
            </span>
          )}
        </div>

        {/* Zoom Selector (YouTube/DAW Style) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: '999px',
            padding: '2px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <div style={{ padding: '0 6px', color: '#64748b', display: 'flex', alignItems: 'center' }}>
            <ZoomIn size={12} strokeWidth={2.4} />
          </div>
          {([1, 2, 3] as const).map((z) => {
            const isActive = zoomLevel === z;
            return (
              <button
                key={z}
                type="button"
                onClick={() => setZoomLevel(z)}
                style={{
                  background: isActive ? '#ef4444' : 'transparent',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '3px 9px',
                  fontSize: '0.68rem',
                  fontWeight: isActive ? 900 : 750,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {z}x
              </button>
            );
          })}
        </div>
      </div>

      {/* 🌊 Interactive Waveform Stage & Playhead with Dedicated Marker Track */}
      <div
        ref={waveformScrollRef}
        style={{
          width: '100%',
          overflowX: zoomLevel > 1 ? 'auto' : 'hidden',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.7) 0%, rgba(2, 6, 23, 0.95) 100%)',
          boxSizing: 'border-box',
          position: 'relative'
        }}
      >
        <div
          ref={waveformContainerRef}
          onPointerDown={onWaveformPointerDown}
          style={{
            position: 'relative',
            width: `${zoomLevel * 100}%`,
            minWidth: '100%',
            height: isMobile ? '100px' : '110px',
            padding: '18px 8px 6px 8px', // 🛡️ Schlanker 18px Headroom: maximale Amplitudenhöhe & kompromisslose Pin-Sichtbarkeit
            boxSizing: 'border-box',
            cursor: 'pointer',
            overflow: 'visible'
          }}
          title="Tippe zum Navigieren oder Doppelklick für neuen Marker"
        >
          {/* Amplitude Bars mit YouTube Scarlet Gradient & Glow */}
          <div style={{ position: 'relative', width: '100%', height: isMobile ? '78px' : '88px' }}>
            <svg
              viewBox={`0 0 ${800 * zoomLevel} 80`}
              preserveAspectRatio="none"
              style={{ width: '100%', height: '100%', display: 'block' }}
            >
              <defs>
                <linearGradient id="ytPlayedBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff4d4d" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
                <linearGradient id="ytUnplayedBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255, 255, 255, 0.24)" />
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0.08)" />
                </linearGradient>
              </defs>
              {waveformBars.map((bar, i) => {
                const barTimeRatio = i / waveformBars.length;
                const isPlayed = barTimeRatio <= (duration > 0 ? currentPlayTime / duration : 0);
                return (
                  <rect
                    key={i}
                    x={bar.x}
                    y={bar.y}
                    width={bar.width}
                    height={bar.height}
                    rx={bar.width / 2}
                    ry={bar.width / 2}
                    fill={isPlayed ? 'url(#ytPlayedBarGrad)' : 'url(#ytUnplayedBarGrad)'}
                    style={{
                      transition: 'fill 0.08s ease',
                      filter: isPlayed ? 'drop-shadow(0 0 2px rgba(239, 68, 68, 0.35))' : 'none'
                    }}
                  />
                );
              })}
            </svg>
          </div>

          {/* 📍 Story-Pins auf der Zeitachse (Regenbogen-Kombination - 0,1% Low-Profile Studio-Flag) */}
          {notes.map((note, idx) => {
            const isDraggingThis = draggingNoteId === note.id;
            const displayTime = isDraggingThis && draggedTime !== null ? draggedTime : note.time;
            const pinPercent = duration > 0 ? (displayTime / duration) * 100 : 0;
            const isPracticed = note.isPracticed;
            const rainbowColor = getMarkerColor(idx);

            return (
              <div
                key={note.id}
                onPointerDown={(e) =>
                  (!isStudent || note.authorRole === 'student') ? onPinPointerDown(e, note.id, note.time) : undefined
                }
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayNotePreRoll(note.time);
                }}
                style={{
                  position: 'absolute',
                  top: '1px',
                  bottom: '6px',
                  left: `${pinPercent}%`,
                  transform: 'translateX(-50%)',
                  width: isMobile ? '38px' : '34px', // 🛡️ Unsichtbarer Hit-Slop (WCAG 2.2 AA SC 2.5.8)
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: isDraggingThis ? 'grabbing' : (!isStudent || note.authorRole === 'student') ? 'grab' : 'pointer',
                  zIndex: isDraggingThis ? 70 : 35,
                  userSelect: 'none',
                  touchAction: (!isStudent || note.authorRole === 'student') ? 'none' : 'manipulation',
                  padding: 0,
                  pointerEvents: 'auto'
                }}
                title={`Marker #${idx + 1} (${rainbowColor.label}) • ${formatTime(note.time)}: ${note.text}`}
                className="hover-scale-mini"
              >
                {/* Floating Pin Capsule - Schlanke 16-18px Höhe für maximalen Wellenform-Fokus */}
                <div
                  style={{
                    width: isMobile ? '22px' : '20px',
                    height: isMobile ? '18px' : '16px',
                    borderRadius: '5px',
                    background: rainbowColor.bg,
                    border: '1.5px solid #ffffff',
                    color: rainbowColor.iconColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 0 1px rgba(15, 23, 42, 0.4), 0 2px 6px ${rainbowColor.border}99`,
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    fontSize: isMobile ? '0.64rem' : '0.60rem',
                    fontWeight: 900
                  }}
                >
                  {isPracticed ? (
                    <Check size={10} strokeWidth={3.4} />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* 📐 0,1% Teardrop-Pfeilspitze (zeigt exakt auf den Sample-Zeitpunkt) */}
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '3.5px solid transparent',
                    borderRight: '3.5px solid transparent',
                    borderTop: `3.5px solid ${rainbowColor.bg}`,
                    filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))',
                    marginTop: '-1px'
                  }}
                />

                {/* Live Tooltip beim Verschieben */}
                {isDraggingThis && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-24px',
                      background: rainbowColor.bg,
                      color: '#ffffff',
                      fontSize: '0.66rem',
                      fontWeight: 900,
                      padding: '2px 6px',
                      borderRadius: '5px',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                      letterSpacing: '0.02em',
                      border: '1px solid rgba(255,255,255,0.3)'
                    }}
                  >
                    #{idx + 1} • {formatTime(displayTime)}
                  </div>
                )}

                {/* Feine vertikale Laserlinie bis zum Boden der Wellenform */}
                <div
                  style={{
                    width: '1.5px',
                    flex: 1,
                    background: rainbowColor.bg,
                    opacity: 0.95,
                    boxShadow: `0 0 5px ${rainbowColor.bg}aa`
                  }}
                />
              </div>
            );
          })}

          {/* 📍 0,1% Goldstandard: Pulsierender Live "Ghost-Pin" während der Marker-Erstellung */}
          {isAddingNote && duration > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '1px',
                bottom: '6px',
                left: `${ghostPercent}%`,
                transform: 'translateX(-50%)',
                width: isMobile ? '38px' : '34px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 65,
                pointerEvents: 'none',
                animation: 'pulse 1.8s infinite'
              }}
              title={`Neuer Marker wird gesetzt bei ${formatTime(newNoteTime)}`}
            >
              {/* Badge mit pulsierendem Ring */}
              <div
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: '1.5px solid #ffffff',
                  borderRadius: '999px',
                  padding: '1px 6px',
                  fontSize: '0.58rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  boxShadow: '0 0 12px rgba(239, 68, 68, 0.8), 0 2px 6px rgba(0,0,0,0.4)',
                  whiteSpace: 'nowrap'
                }}
              >
                <Plus size={9} strokeWidth={3} />
                <span>Neu {formatTime(newNoteTime)}</span>
              </div>

              {/* 📐 Teardrop-Pfeilspitze */}
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '3px solid transparent',
                  borderRight: '3px solid transparent',
                  borderTop: '3px solid #ef4444',
                  marginTop: '-1px'
                }}
              />

              {/* Pulsierende gestrichelte Laser-Linie */}
              <div
                style={{
                  width: '2px',
                  flex: 1,
                  background: 'repeating-linear-gradient(to bottom, #ef4444, #ef4444 4px, transparent 4px, transparent 7px)',
                  boxShadow: '0 0 6px #ef4444'
                }}
              />
            </div>
          )}

          {/* 🔁 Aktiver Spot-Loop Indikator (YouTube / DAW Studio Highlight Zone) */}
          {spotLoopNoteId && spotLoopRange && duration > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '24px',
                bottom: '6px',
                left: `${(spotLoopRange.start / duration) * 100}%`,
                width: `${((spotLoopRange.end - spotLoopRange.start) / duration) * 100}%`,
                background: 'rgba(239, 68, 68, 0.18)',
                borderLeft: '2px solid #ef4444',
                borderRight: '2px solid #ef4444',
                pointerEvents: 'none',
                zIndex: 25,
                boxShadow: 'none'
              }}
            />
          )}

          {/* 🔴 Live Laser-Playhead Needle (YouTube Signature) */}
          <div
            style={{
              position: 'absolute',
              top: '18px',
              bottom: '6px',
              left: `${playPercent}%`,
              transform: 'translateX(-50%)',
              width: '2px',
              background: '#ef4444',
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.7)',
              pointerEvents: 'none',
              zIndex: 50,
              transition: isPlaying ? 'none' : 'left 0.08s ease-out'
            }}
          >
            {/* Glowing Laser Cap */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '10px',
                height: '10px',
                background: '#ef4444',
                borderRadius: '50%',
                border: '1.5px solid #ffffff',
                boxShadow: '0 0 6px rgba(239, 68, 68, 0.9)'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
