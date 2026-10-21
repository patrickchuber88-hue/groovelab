import React from 'react';
import {
  Clock,
  Mic,
  Radio,
  Sliders,
  Headphones,
  Star,
  Activity,
  BookOpen,
  History,
  Compass,
  Plus
} from 'lucide-react';

export type StudioModuleCoverKey =
  | 'practice'
  | 'recordings'
  | 'groovetrainer'
  | 'tuner'
  | 'loopstation'
  | 'earlab'
  | 'skillradar'
  | 'protocol'
  | 'archive'
  | 'worldtour'
  | 'unlock_tile';

export interface CampusStudioModuleCoverProps {
  moduleKey: StudioModuleCoverKey;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isUnlocked?: boolean;
  isGhosted?: boolean;
  uiLevel?: 'junior' | 'teen' | 'pro';
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

export interface TuningForkIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 🎵 TuningForkIcon (Kanonisches Stimmgerät- / Stimmgabel-Icon)
 * 
 * Exakt nach dem Lucide-Designsystem (24x24 viewBox, abgerundete Ecken & Kappen).
 * Repräsentiert universell Kammerton A (440 Hz) & Stimmgerät.
 */
export const TuningForkIcon: React.FC<TuningForkIconProps> = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 2.3,
  className = '',
  style = {}
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    {/* Stimmgabel: 2 Zinken & U-Bogen */}
    <path d="M8 3.5v6.5a4 4 0 0 0 8 0V3.5" />
    {/* Vertikaler Stiel */}
    <line x1="12" y1="14" x2="12" y2="20.5" />
    {/* Standfeste Griff- / Fußplatte */}
    <line x1="9.5" y1="20.5" x2="14.5" y2="20.5" />
  </svg>
);

/**
 * 🎵 CampusStudioModuleCover (0.1% Goldstandard - Clean Apple-Squircle Edition)
 * 
 * Reines, modernes Apple-Squircle Design mit leuchtenden Verläufen,
 * dezentem Tiefenschatten und zentriertem weißem Icon (exakt wie im Original-Design).
 */
export const CampusStudioModuleCover: React.FC<CampusStudioModuleCoverProps> = ({
  moduleKey,
  size = 'lg',
  isUnlocked = true,
  isGhosted = false,
  uiLevel = 'junior',
  className = '',
  style = {},
  ariaLabel
}) => {
  // Dimensionen nach Apple Human Interface Guidelines
  const dimensions = {
    xs: { dim: 28, radius: 7, iconSize: 14, strokeWidth: 2.2 },
    sm: { dim: 40, radius: 10, iconSize: 18, strokeWidth: 2.3 },
    md: { dim: 56, radius: 14, iconSize: 26, strokeWidth: 2.3 },
    lg: { dim: 78, radius: 19, iconSize: 36, strokeWidth: 2.3 },
    xl: { dim: 96, radius: 23, iconSize: 46, strokeWidth: 2.5 }
  }[size];

  // Modul-Spezifische Farbverläufe, Schatten & Icons
  const getModuleConfig = () => {
    switch (moduleKey) {
      case 'practice':
        return {
          title: 'Üben',
          gradient: '#facc15',
          boxShadow: 'none',
          renderIcon: () => (
            <Clock
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'none' }}
            />
          )
        };

      case 'protocol':
        return {
          title: uiLevel === 'junior'
            ? 'Noten & Songs'
            : uiLevel === 'teen'
              ? 'Songs & Noten'
              : 'Repertoire & Noten',
          gradient: '#34a853',
          boxShadow: 'none',
          renderIcon: () => (
            <BookOpen
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'none' }}
            />
          )
        };

      case 'recordings':
        return {
          title: 'Aufnahmen',
          gradient: '#6366f1',
          boxShadow: 'none',
          renderIcon: () => (
            <Mic
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'none' }}
            />
          )
        };

      case 'groovetrainer':
        return {
          title: 'Groove-Trainer',
          gradient: '#f97316',
          boxShadow: 'none',
          renderIcon: () => (
            <Radio
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'none' }}
            />
          )
        };

      case 'tuner':
        return {
          title: 'Stimmgerät',
          gradient: '#06b6d4',
          boxShadow: 'none',
          renderIcon: () => (
            <TuningForkIcon
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'none' }}
            />
          )
        };

      case 'earlab':
        return {
          title: uiLevel === 'junior' ? 'Klang-Detektiv' : 'Gehörtraining',
          gradient: '#a855f7',
          boxShadow: 'none',
          renderIcon: () => (
            <Headphones
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'none' }}
            />
          )
        };

      case 'loopstation':
        return {
          title: 'Loopstation',
          gradient: '#ef4444',
          boxShadow: 'none',
          renderIcon: () => (
            <Sliders
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'none' }}
            />
          )
        };

      case 'skillradar':
        return {
          title: uiLevel === 'junior' ? 'Musik-Stern' : 'Fähigkeiten',
          gradient: '#ec4899',
          boxShadow: 'none',
          renderIcon: () => uiLevel === 'junior' ? (
            <Star
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'none' }}
            />
          ) : (
            <Activity
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'none' }}
            />
          )
        };

      case 'worldtour':
        return {
          title: 'Musik-Weltreise',
          gradient: '#007acc',
          boxShadow: 'none',
          renderIcon: () => (
            <Compass
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'none' }}
            />
          )
        };

      case 'archive':
        return {
          title: 'Aufgabenheft-Verlauf',
          gradient: '#475569',
          boxShadow: 'none',
          renderIcon: () => (
            <History
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'none' }}
            />
          )
        };

      case 'unlock_tile':
      default:
        return {
          title: 'Modul freischalten',
          gradient: '#e2e8f0',
          boxShadow: 'none',
          renderIcon: () => (
            <Plus
              size={dimensions.iconSize}
              color="#64748b"
              strokeWidth={dimensions.strokeWidth}
            />
          )
        };
    }
  };

  const config = getModuleConfig();

  return (
    <div
      className={`campus-studio-module-cover ${className}`}
      role="img"
      aria-label={ariaLabel || config.title}
      style={{
        width: `${dimensions.dim}px`,
        height: `${dimensions.dim}px`,
        borderRadius: `${dimensions.radius}px`,
        background: config.gradient,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: config.boxShadow,
        border: moduleKey === 'unlock_tile'
          ? '1.5px solid #cbd5e1'
          : 'none',
        boxSizing: 'border-box',
        maxWidth: '100%',
        flexShrink: 0,
        filter: 'none',
        transition: 'transform 0.16s ease, box-shadow 0.16s ease',
        ...style
      }}
    >
      {/* Zentriertes Haupt-Icon */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {config.renderIcon()}
      </div>
    </div>
  );
};
