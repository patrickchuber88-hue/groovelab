import React from 'react';
import { Award, BookOpen, Music, Play, Trophy } from 'lucide-react';

export interface CampusVinylCoverArtProps {
  songColor: { from: string; to: string; text?: string; shadowFrom?: string; shadowTo?: string };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isMastered?: boolean;
  iconType?: 'music' | 'book' | 'trophy' | 'award';
  variant?: 'squircle' | 'book';
  showVinylPeek?: boolean;
  showPlayOnHover?: boolean;
  isHovered?: boolean;
  ariaLabel?: string;
}

/**
 * 🎵 Wochen-Fahrplan & Apple Music Squircle / Vinyl Cover (0.1% Goldstandard)
 * Taktiles Apple Cover mit kontinuierlicher Squircle-Krümmung, mikro-feiner Innenlichtkante
 * und optionalem Vinyl-Auszug für Hero-Banner.
 */
export const CampusVinylCoverArt: React.FC<CampusVinylCoverArtProps> = ({
  songColor,
  size = 'sm',
  isMastered = false,
  iconType = 'music',
  variant = 'squircle',
  showVinylPeek = false,
  showPlayOnHover = false,
  isHovered = false,
  ariaLabel = 'Song Cover'
}) => {
  const isBook = variant === 'book' || iconType === 'book';
  
  // Apple Continuous Dimensions
  const baseDim = size === 'xs' ? 28 : size === 'sm' ? 36 : size === 'md' ? 48 : size === 'lg' ? 72 : 92;
  const width = isBook ? Math.round(baseDim * 0.76) : baseDim;
  const height = baseDim;
  const borderRadius = isBook 
    ? (size === 'xs' ? 5 : size === 'sm' ? 7 : 9)
    : (size === 'xs' ? 8 : size === 'sm' ? 10 : size === 'md' ? 14 : size === 'lg' ? 20 : 24);
  const iconSize = size === 'xs' ? 13 : size === 'sm' ? 16 : size === 'md' ? 22 : size === 'lg' ? 30 : 38;

  const bgGradient = isMastered
    ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
    : `linear-gradient(135deg, ${songColor.from} 0%, ${songColor.to} 100%)`;

  const textColor = isMastered ? '#b45309' : (songColor.text || '#0f172a');
  const borderColor = isMastered ? 'rgba(252, 211, 77, 0.9)' : 'rgba(255, 255, 255, 0.75)';
  const shadow = isMastered
    ? '0 6px 16px -2px rgba(245, 158, 11, 0.22), 0 2px 6px -1px rgba(0,0,0,0.04)'
    : `0 8px 20px -4px ${songColor.shadowFrom || 'rgba(0, 0, 0, 0.08)'}, 0 2px 6px -1px rgba(0,0,0,0.03)`;

  const renderIcon = () => {
    switch (iconType) {
      case 'book':
        return <BookOpen size={iconSize} strokeWidth={2.2} color="currentColor" />;
      case 'trophy':
        return <Trophy size={iconSize} strokeWidth={2.2} color="currentColor" />;
      case 'award':
        return <Award size={iconSize} strokeWidth={2.2} color="currentColor" />;
      case 'music':
      default:
        return <Music size={iconSize} strokeWidth={2.2} color="currentColor" />;
    }
  };

  // Vinyl Record Disk (peeking behind for xl or when explicitly requested)
  const renderVinylDisk = () => {
    if (!showVinylPeek) return null;
    const diskSize = Math.round(height * 0.94);
    return (
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: size === 'xl' ? '-22px' : '-14px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: `${diskSize}px`,
          height: `${diskSize}px`,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #27272a 0%, #18181b 45%, #09090b 100%)',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 0,
          border: '1px solid rgba(255,255,255,0.08)',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Concentric vinyl groove ring */}
        <div style={{
          width: '72%',
          height: '72%',
          borderRadius: '50%',
          border: '1px dashed rgba(255, 255, 255, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Inner groove */}
          <div style={{
            width: '60%',
            height: '60%',
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Center label */}
            <div style={{
              width: '46%',
              height: '46%',
              borderRadius: '50%',
              background: isMastered ? '#f59e0b' : songColor.from,
              border: '2px solid #0f172a'
            }} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
      {renderVinylDisk()}
      <div
        role="img"
        aria-label={ariaLabel}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          borderRadius: `${borderRadius}px`,
          background: bgGradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: textColor,
          boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 rgba(0, 0, 0, 0.04), ${shadow}`,
          border: `1px solid ${borderColor}`,
          flexShrink: 0,
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Book spine line for book variant (Apple Books aesthetic) */}
        {isBook && (
          <>
            <div style={{
              position: 'absolute',
              left: '5px',
              top: 0,
              bottom: 0,
              width: '2px',
              background: 'rgba(0, 0, 0, 0.12)',
              boxShadow: '1px 0 0 rgba(255, 255, 255, 0.35)'
            }} />
            <div style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '4px',
              background: 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.06) 100%)'
            }} />
          </>
        )}
        
        {/* Subtle Apple glass reflection highlight */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '45%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 100%)',
          pointerEvents: 'none'
        }} />

        {renderIcon()}

        {/* Apple Music Floating Hover Play Glyph */}
        {showPlayOnHover && isHovered && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            zIndex: 5,
            transition: 'opacity 0.2s ease'
          }}>
            <div style={{
              width: Math.round(baseDim * 0.42),
              height: Math.round(baseDim * 0.42),
              borderRadius: '50%',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
            }}>
              <Play size={Math.round(baseDim * 0.20)} fill="#0f172a" color="#0f172a" style={{ marginLeft: '2px' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const renderSongVinylCover = (
  songColor: { from: string; to: string; text?: string; shadowFrom?: string; shadowTo?: string },
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'sm',
  isMastered: boolean = false,
  iconType: 'music' | 'book' | 'trophy' | 'award' = 'music',
  variant: 'squircle' | 'book' = 'squircle',
  showVinylPeek: boolean = false,
  showPlayOnHover: boolean = false,
  isHovered: boolean = false
) => {
  return (
    <CampusVinylCoverArt 
      songColor={songColor} 
      size={size} 
      isMastered={isMastered} 
      iconType={iconType} 
      variant={variant}
      showVinylPeek={showVinylPeek}
      showPlayOnHover={showPlayOnHover}
      isHovered={isHovered}
    />
  );
};
