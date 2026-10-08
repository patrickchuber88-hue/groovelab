import React, { useState } from 'react';
import { Play, Pause, CheckCircle2, Loader2 } from 'lucide-react';

export interface AudioVersionSquareCoverProps {
  version: 'master' | 'raw';
  isSelected: boolean;
  onSelect: () => void;
  isPlaying: boolean;
  isProcessing?: boolean;
  onTogglePlay: () => void;
  isLight?: boolean;
}

export const AudioVersionSquareCover: React.FC<AudioVersionSquareCoverProps> = ({
  version,
  isSelected,
  onSelect,
  isPlaying,
  isProcessing = false,
  onTogglePlay,
  isLight = false
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const isMaster = version === 'master';
  const label = isMaster ? 'Studio Master' : 'Originalaufnahme';

  // 🏛️ 0,1% Goldstandard Farbschema: Unifarbene, edle Töne
  // Studio Master: Sattes Studio-Smaragdgrün (#059669)
  // Originalaufnahme: Sattes Akustik-Kobaltblau (#2563eb)
  const baseColor = isMaster ? '#059669' : '#2563eb';
  const darkerBase = isMaster ? '#047857' : '#1d4ed8';
  const activeRingColor = isMaster ? '#10b981' : '#3b82f6';
  const brandTextColor = isMaster ? '#059669' : '#2563eb';

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      aria-label={`${label} auswählen`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1 / 1',
        borderRadius: '20px',
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '16px',
        boxSizing: 'border-box',
        background: `linear-gradient(145deg, ${baseColor} 0%, ${darkerBase} 100%)`,
        border: isSelected
          ? `2.5px solid ${activeRingColor}`
          : `1.5px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.18)'}`,
        boxShadow: isSelected
          ? `0 0 0 3px ${activeRingColor}44, 0 12px 28px ${activeRingColor}40`
          : (isHovered ? '0 8px 22px rgba(0, 0, 0, 0.28)' : '0 4px 12px rgba(0, 0, 0, 0.18)'),
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        userSelect: 'none'
      }}
    >
      {/* Subtile konzentrische Vinyl-Rillen als ruhige Studio-Textur */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          opacity: 0.10
        }}
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="100" r="32" fill="none" stroke="#ffffff" strokeWidth="1.2" />
        <circle cx="100" cy="100" r="54" fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="100" cy="100" r="74" fill="none" stroke="#ffffff" strokeWidth="1.2" />
        <circle cx="100" cy="100" r="92" fill="none" stroke="#ffffff" strokeWidth="0.8" />
      </svg>

      {/* Oberer Bereich: Ausschließlich der dezente Auswahlschalter rechts oben */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', position: 'relative', zIndex: 2 }}>
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: isSelected ? '#ffffff' : 'rgba(0, 0, 0, 0.22)',
            border: `1.5px solid ${isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.45)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isSelected ? '0 2px 8px rgba(0, 0, 0, 0.3)' : 'none',
            transition: 'all 0.18s ease'
          }}
          title={isSelected ? 'Als Standard-Version aktiv' : 'Als Standard-Version wählen'}
        >
          {isSelected && (
            <CheckCircle2
              size={18}
              color={brandTextColor}
              style={{ display: 'block' }}
            />
          )}
        </div>
      </div>

      {/* Zentraler Bereich: Haptischer Play/Pause-Circle */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePlay();
          }}
          aria-label={isPlaying ? `${label} pausieren` : `${label} vorhören`}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: 'none',
            background: '#ffffff',
            color: brandTextColor,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 18px rgba(0, 0, 0, 0.32)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            transform: isPlaying ? 'scale(1.08)' : 'scale(1)',
            outline: 'none'
          }}
          className="hover-scale"
        >
          {isProcessing ? (
            <Loader2 size={20} className="animate-spin" color={brandTextColor} />
          ) : isPlaying ? (
            <Pause size={20} fill={brandTextColor} />
          ) : (
            <Play size={20} fill={brandTextColor} style={{ marginLeft: '2px' }} />
          )}
        </button>

        {/* Feine Soundwave-Animation nur bei aktiver Wiedergabe */}
        {isPlaying && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2.5px', height: '10px' }}>
            <span className="gl-soundwave-1" style={{ width: '2.5px', background: '#ffffff', borderRadius: '1px' }} />
            <span className="gl-soundwave-2" style={{ width: '2.5px', background: '#ffffff', borderRadius: '1px' }} />
            <span className="gl-soundwave-3" style={{ width: '2.5px', background: '#ffffff', borderRadius: '1px' }} />
          </div>
        )}
      </div>

      {/* Unterer Bereich: Ein einziger, klarer Titel ohne technischen Ballast */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div
          style={{
            fontSize: '0.96rem',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.01em',
            lineHeight: 1.2
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
};
