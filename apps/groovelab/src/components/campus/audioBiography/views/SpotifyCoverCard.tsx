import React from 'react';
import { Play, Pause, Mic, BookOpen, Folder } from 'lucide-react';
import { SpotifyCoverArtwork } from './SpotifyCoverArtwork';

export interface SpotifyCoverCardProps {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  trackCount: number;
  totalDurationMin?: number;
  gradient: string;
  accentColor: string;
  iconName?: string;
  coverEmoji?: string;
  volLabel?: string;
  isMilestoneMaster?: boolean;
  progressLabel?: string;
  isPlayingThisAlbum?: boolean;
  isBoxsetFolder?: boolean;
  isSeasonFocus?: boolean;
  seasonBadgeText?: string;
  seasonGlowColor?: string;
  isMobileOrSim: boolean;
  isLight: boolean;
  colors: { textPrimary: string; textMuted: string; textSecondary: string };
  onPlay: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onShare?: (e: React.MouseEvent) => void;
  onBooklet?: (e: React.MouseEvent) => void;
}

export const SpotifyCoverCard: React.FC<SpotifyCoverCardProps> = ({
  id,
  title,
  subtitle,
  badge,
  trackCount,
  totalDurationMin,
  gradient,
  accentColor,
  iconName,
  coverEmoji,
  volLabel,
  isMilestoneMaster,
  progressLabel,
  isPlayingThisAlbum,
  isBoxsetFolder,
  isSeasonFocus,
  seasonBadgeText,
  seasonGlowColor,
  isMobileOrSim,
  isLight,
  colors,
  onPlay,
  onOpen,
  onBooklet
}) => {
  const isPlaying = !!isPlayingThisAlbum;

  return (
    <div
      key={id}
      onClick={onOpen}
      style={{
        flex: '0 0 auto',
        width: isMobileOrSim ? '152px' : '184px',
        scrollSnapAlign: 'start',
        borderRadius: isMobileOrSim ? '14px' : '16px',
        background: isLight ? '#ffffff' : 'rgba(30, 41, 59, 0.6)',
        border: `1.5px solid ${isPlaying ? accentColor : isSeasonFocus ? (seasonGlowColor || '#f59e0b') : (isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)')}`,
        padding: isMobileOrSim ? '10px' : '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        cursor: 'pointer',
        boxShadow: isPlaying 
          ? `0 12px 28px ${accentColor}33` 
          : isSeasonFocus
            ? `0 0 20px 2px ${seasonGlowColor || '#f59e0b'}33, 0 6px 16px rgba(0, 0, 0, 0.06)`
            : (isLight ? '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)' : '0 4px 16px rgba(0, 0, 0, 0.25)'),
        position: 'relative',
        boxSizing: 'border-box',
        animation: isSeasonFocus && !isPlaying ? 'seasonalGlowPulse 3s ease-in-out infinite' : 'none'
      }}
      className={`spotify-card-hover ${isLight ? 'spotify-card-hover-light' : 'spotify-card-hover-dark'}`}
    >
      {/* 1:1 Square Artwork Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1',
          borderRadius: isMobileOrSim ? '10px' : '12px',
          overflow: 'hidden'
        }}
      >
        <SpotifyCoverArtwork
          gradient={gradient}
          accentColor={accentColor}
          badge={badge}
          title={title}
          subtitle={subtitle}
          volLabel={volLabel}
          iconName={iconName}
          emoji={coverEmoji}
          isMilestoneMaster={isMilestoneMaster}
          progressLabel={progressLabel}
          isSeasonFocus={isSeasonFocus}
          seasonBadgeText={seasonBadgeText}
          seasonGlowColor={seasonGlowColor}
          trackCount={trackCount}
          isEmpty={trackCount === 0}
        />

        {/* 🟢 Spotify Floating Action Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (trackCount === 0) {
              onOpen();
            } else {
              onPlay(e);
            }
          }}
          title={trackCount === 0 ? 'Ersten Song aufnehmen' : isPlaying ? 'Wiedergabe pausieren' : 'Playlist abspielen'}
          aria-label={trackCount === 0 ? 'Ersten Song aufnehmen' : isPlaying ? 'Wiedergabe pausieren' : 'Playlist abspielen'}
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: trackCount === 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#10b981',
            border: 'none',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.4)',
            opacity: isPlaying ? 1 : undefined,
            zIndex: 10
          }}
          className="spotify-play-btn"
        >
          {trackCount === 0 ? (
            <Mic size={15} fill="#ffffff" color="#ffffff" />
          ) : isPlaying ? (
            <Pause size={16} fill="#ffffff" color="#ffffff" />
          ) : (
            <Play size={16} fill="#ffffff" color="#ffffff" style={{ marginLeft: '2px' }} />
          )}
        </button>
      </div>

      {/* Card Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px' }}>
          <h4
            style={{
              margin: 0,
              fontSize: '0.86rem',
              fontWeight: 900,
              color: isPlaying ? '#10b981' : colors.textPrimary,
              lineHeight: 1.25,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '2.25em',
              letterSpacing: '-0.01em',
              flex: 1
            }}
            title={title}
          >
            {title}
          </h4>

          {onBooklet && trackCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBooklet(e);
              }}
              title="Booklet anzeigen"
              aria-label="Booklet anzeigen"
              style={{
                background: 'none',
                border: 'none',
                color: colors.textSecondary,
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0
              }}
              className="hover-scale"
            >
              <BookOpen size={13} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
          <span
            style={{
              fontSize: '0.70rem',
              fontWeight: 700,
              color: trackCount === 0 ? (isLight ? '#059669' : '#34d399') : colors.textMuted,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {trackCount === 0 ? (
              <>
                <Mic size={11} color={isLight ? '#059669' : '#34d399'} />
                <span>Bereit für Songs • Aufnehmen</span>
              </>
            ) : (
              `${trackCount} ${trackCount === 1 ? 'Track' : 'Tracks'}${totalDurationMin ? ` • ${totalDurationMin} Min.` : ''}`
            )}
          </span>

          {isBoxsetFolder && (
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 800,
                color: '#06b6d4',
                background: isLight ? '#e0f2fe' : 'rgba(6, 182, 212, 0.15)',
                padding: '2px 5px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                flexShrink: 0
              }}
            >
              <Folder size={9} />
              Ordner
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
