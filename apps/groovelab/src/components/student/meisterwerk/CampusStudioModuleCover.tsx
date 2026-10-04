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
    lg: { dim: 72, radius: 18, iconSize: 34, strokeWidth: 2.3 },
    xl: { dim: 96, radius: 22, iconSize: 44, strokeWidth: 2.5 }
  }[size];

  // Modul-Spezifische Farbverläufe, Schatten & Icons
  const getModuleConfig = () => {
    switch (moduleKey) {
      case 'practice':
        return {
          title: 'Üben',
          gradient: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
          boxShadow: '0 6px 14px -2px rgba(234, 179, 8, 0.40)',
          renderIcon: () => (
            <Clock
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}
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
          gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
          boxShadow: '0 6px 14px -2px rgba(16, 185, 129, 0.40)',
          renderIcon: () => (
            <BookOpen
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}
            />
          )
        };

      case 'recordings':
        return {
          title: 'Aufnahmen',
          gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
          boxShadow: '0 6px 14px -2px rgba(99, 102, 241, 0.40)',
          renderIcon: () => (
            <Mic
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}
            />
          )
        };

      case 'groovetrainer':
        return {
          title: 'Groove-Trainer',
          gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          boxShadow: '0 6px 14px -2px rgba(249, 115, 22, 0.40)',
          renderIcon: () => (
            <Radio
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}
            />
          )
        };

      case 'tuner':
        return {
          title: 'Stimmgerät',
          gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
          boxShadow: '0 6px 14px -2px rgba(6, 182, 212, 0.40)',
          renderIcon: () => (
            <TuningForkIcon
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}
            />
          )
        };

      case 'earlab':
        return {
          title: uiLevel === 'junior' ? 'Klang-Detektiv' : 'Gehörtraining',
          gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
          boxShadow: '0 6px 14px -2px rgba(139, 92, 246, 0.40)',
          renderIcon: () => (
            <Headphones
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}
            />
          )
        };

      case 'loopstation':
        return {
          title: 'Loopstation',
          gradient: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
          boxShadow: '0 6px 14px -2px rgba(244, 63, 94, 0.40)',
          renderIcon: () => (
            <Sliders
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}
            />
          )
        };

      case 'skillradar':
        return {
          title: uiLevel === 'junior' ? 'Musik-Stern' : 'Fähigkeiten',
          gradient: uiLevel === 'junior'
            ? 'linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #8b5cf6 100%)'
            : 'linear-gradient(135deg, #d946ef 0%, #a21caf 100%)',
          boxShadow: uiLevel === 'junior'
            ? '0 6px 14px -2px rgba(245, 158, 11, 0.40)'
            : '0 6px 14px -2px rgba(217, 70, 239, 0.40)',
          renderIcon: () => uiLevel === 'junior' ? (
            <Star
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}
            />
          ) : (
            <Activity
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}
            />
          )
        };

      case 'worldtour':
        return {
          title: 'Musik-Weltreise',
          gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          boxShadow: '0 6px 14px -2px rgba(2, 132, 199, 0.40)',
          renderIcon: () => (
            <Compass
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}
            />
          )
        };

      case 'archive':
        return {
          title: 'Aufgabenheft-Verlauf',
          gradient: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
          boxShadow: '0 4px 10px -2px rgba(71, 85, 105, 0.35)',
          renderIcon: () => (
            <History
              size={dimensions.iconSize}
              color="#ffffff"
              strokeWidth={dimensions.strokeWidth}
              style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}
            />
          )
        };

      case 'unlock_tile':
      default:
        return {
          title: 'Modul freischalten',
          gradient: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
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
