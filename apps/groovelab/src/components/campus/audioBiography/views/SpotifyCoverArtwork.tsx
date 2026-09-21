import React from 'react';
import {
  Sparkles, Sliders, Music, Gift, Bell, Zap, Lightbulb, Flame,
  Heart, Sun, Disc, Award, Star, Radio, Volume2
} from 'lucide-react';

export interface SpotifyCoverArtworkProps {
  gradient: string;
  accentColor: string;
  badge?: string;
  title: string;
  subtitle?: string;
  volLabel?: string;
  iconName?: string;
  emoji?: string;
  isMilestoneMaster?: boolean;
  progressLabel?: string;
  isSeasonFocus?: boolean;
  seasonBadgeText?: string;
  seasonGlowColor?: string;
  trackCount?: number;
  isEmpty?: boolean;
}

export const renderCoverIcon = (iconName: string, size = 26, color = '#ffffff') => {
  const props = { size, color, strokeWidth: 2.2 };
  switch (iconName) {
    case 'sparkles': return <Sparkles {...props} />;
    case 'sliders': return <Sliders {...props} />;
    case 'music': return <Music {...props} />;
    case 'gift': return <Gift {...props} />;
    case 'bell': return <Bell {...props} />;
    case 'zap': return <Zap {...props} />;
    case 'lightbulb': return <Lightbulb {...props} />;
    case 'flame': return <Flame {...props} />;
    case 'heart': return <Heart {...props} />;
    case 'sun': return <Sun {...props} />;
    case 'disc': return <Disc {...props} />;
    case 'award': return <Award {...props} />;
    case 'star': return <Star {...props} />;
    case 'radio': return <Radio {...props} />;
    case 'volume-2': return <Volume2 {...props} />;
    default: return <Music {...props} />;
  }
};

export const SpotifyCoverArtwork: React.FC<SpotifyCoverArtworkProps> = ({
  gradient,
  accentColor,
  badge,
  volLabel,
  iconName,
  emoji,
  isMilestoneMaster = false,
  progressLabel,
  isSeasonFocus = false,
  seasonBadgeText,
  seasonGlowColor,
  trackCount,
  isEmpty
}) => {
  const isActuallyEmpty = isEmpty ?? (trackCount !== undefined ? trackCount === 0 : false);

  return (
    <div
      className="spotify-artwork-inner"
      style={{
        width: '100%',
        height: '100%',
        background: gradient,
        borderRadius: '14px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '16px',
        boxSizing: 'border-box',
        boxShadow: isSeasonFocus
          ? `inset 0 0 0 1.5px rgba(255, 255, 255, 0.4), 0 0 20px ${seasonGlowColor || '#f59e0b'}66`
          : 'inset 0 0 0 1px rgba(255, 255, 255, 0.18)'
      }}
    >
      {/* Subtle Geometric Overlay */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        right: '-20%',
        width: '70%',
        height: '70%',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255, 255, 255, 0.22) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Diagonal Light Streak */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.02) 40%, transparent 60%)',
        pointerEvents: 'none'
      }} />

      {/* Blueprint Stripes Texture for Empty Playlists */}
      {isActuallyEmpty && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            rgba(255, 255, 255, 0.13) 0px,
            rgba(255, 255, 255, 0.13) 7px,
            transparent 7px,
            transparent 17px
          )`,
          pointerEvents: 'none',
          zIndex: 1
        }} />
      )}

      {/* Top Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2, gap: '6px' }}>
        <span style={{
          fontSize: '0.62rem',
          fontWeight: 900,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#ffffff',
          background: isSeasonFocus ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          padding: '4px 9px',
          borderRadius: '6px',
          border: isSeasonFocus ? `1.5px solid ${seasonGlowColor || '#f59e0b'}` : '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: isSeasonFocus ? `0 0 12px ${seasonGlowColor || '#f59e0b'}99` : 'none',
          whiteSpace: 'nowrap'
        }}>
          {volLabel || (isSeasonFocus ? seasonBadgeText : badge) || 'PLAYLIST'}
        </span>

        {isMilestoneMaster ? (
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            flexShrink: 0
          }}>
            <Award size={14} color="#b45309" />
          </div>
        ) : emoji ? (
          <span style={{ fontSize: '1.3rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))', flexShrink: 0 }}>{emoji}</span>
        ) : null}
      </div>

      {/* Center Artwork Graphic / Icon */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        zIndex: 2,
        margin: 'auto 0'
      }}>
        {isMilestoneMaster ? (
          <div style={{
            width: '74px',
            height: '74px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.35)',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
          }}>
            <Sparkles size={38} color="#fde047" />
          </div>
        ) : (
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(8px)',
            border: '1.5px solid rgba(255, 255, 255, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 22px rgba(0,0,0,0.32)'
          }}>
            {renderCoverIcon(iconName || 'music', 32, '#ffffff')}
          </div>
        )}
      </div>

      {/* Bottom Progress Label */}
      {progressLabel ? (
        <div style={{ zIndex: 2 }}>
          <span style={{
            fontSize: '0.64rem',
            fontWeight: 900,
            color: '#fef3c7',
            background: 'rgba(0, 0, 0, 0.55)',
            padding: '3px 7px',
            borderRadius: '4px',
            display: 'inline-block'
          }}>
            ⭐ {progressLabel}
          </span>
        </div>
      ) : (
        <div style={{ height: '8px' }} />
      )}
    </div>
  );
};
