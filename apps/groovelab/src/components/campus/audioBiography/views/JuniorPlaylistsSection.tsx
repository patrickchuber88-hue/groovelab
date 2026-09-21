import React from 'react';
import { Disc, Plus, Trash2, Mic, Play, BookOpen } from 'lucide-react';
import { CustomPlaylist, UNIVERSAL_PLAYLIST_COVERS, UniversalPlaylistCoverConfig } from '../types';
import { SpotifyCoverArtwork } from './SpotifyCoverArtwork';

export interface JuniorPlaylistsSectionProps {
  displayPlaylists: CustomPlaylist[];
  possessiveName: string;
  colors: { textPrimary: string; textSecondary: string };
  isLight: boolean;
  isMobileOrSim: boolean;
  onOpenCreatePlaylist: () => void;
  onSelectPlaylistForModal: (pl: CustomPlaylist) => void;
  onOpenJuniorWizard: (milestoneId: string | null, playlistId: string | null) => void;
  requestDeletePlaylist: (playlistId: string, title: string) => void;
}

export const JuniorPlaylistsSection: React.FC<JuniorPlaylistsSectionProps> = ({
  displayPlaylists,
  possessiveName,
  colors,
  isLight,
  isMobileOrSim,
  onOpenCreatePlaylist,
  onSelectPlaylistForModal,
  onOpenJuniorWizard,
  requestDeletePlaylist
}) => {
  return (
    <div
      style={{
        background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
        borderRadius: '24px',
        border: `1.5px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
        padding: isMobileOrSim ? '18px 16px' : '24px',
        boxShadow: isLight ? '0 4px 18px rgba(0,0,0,0.04)' : 'none'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '14px',
              background: isLight ? '#f5f3ff' : 'rgba(99, 102, 241, 0.15)',
              border: '1.5px solid #c7d2fe',
              color: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.15)'
            }}
          >
            <Disc size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 900, color: colors.textPrimary }}>
              {possessiveName} Playlisten
            </h3>
            <span style={{ fontSize: '0.78rem', color: colors.textSecondary, fontWeight: 600 }}>
              Deine Alben & Musik-Geschenke ({displayPlaylists.length}{' '}
              {displayPlaylists.length === 1 ? 'Playliste' : 'Playlisten'})
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenCreatePlaylist}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            border: 'none',
            color: '#ffffff',
            padding: '9px 18px',
            borderRadius: '100px',
            fontSize: '0.82rem',
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
          }}
          className="hover-scale"
        >
          <Plus size={15} strokeWidth={3} />
          <span>+ Neue Playlist</span>
        </button>
      </div>

      {/* Album-Karten Raster */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobileOrSim ? 'repeat(2, 1fr)' : 'repeat(5, minmax(0, 1fr))',
          gap: '14px'
        }}
      >
        {displayPlaylists.map((pl, idx) => {
          const isGiftPl = pl.id === 'pl_gifts';
          const trackCount = pl.tracks?.length || 0;
          const totalDurationMin = Math.ceil(
            (pl.tracks || []).reduce((acc, t) => acc + (t.duration || 60), 0) / 60
          );

          const isChristmasPl = pl.id === 'pl_weihnachten' || pl.title.toLowerCase().includes('weihnacht');
          const isSummerPl =
            pl.id === 'pl_sommerhits' || pl.id === 'pl_sommer_2026' || pl.title.toLowerCase().includes('sommer');
          const isFavoritesPl = pl.id === 'pl_lieblingssongs' || pl.title.toLowerCase().includes('lieblings');

          const preset =
            UNIVERSAL_PLAYLIST_COVERS.find((c: UniversalPlaylistCoverConfig) => c.id === pl.coverPresetId) ||
            UNIVERSAL_PLAYLIST_COVERS[0];

          const coverGradient = isGiftPl
            ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
            : isChristmasPl
            ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
            : isSummerPl
            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
            : isFavoritesPl
            ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
            : preset.gradient || 'linear-gradient(135deg, #10b981 0%, #059669 100%)';

          const coverAccent = isGiftPl
            ? '#f97316'
            : isChristmasPl
            ? '#dc2626'
            : isSummerPl
            ? '#f59e0b'
            : isFavoritesPl
            ? '#6366f1'
            : preset.accentColor || '#10b981';
          const coverEmoji = isGiftPl
            ? '🎁'
            : isChristmasPl
            ? '🎄'
            : isSummerPl
            ? '☀️'
            : isFavoritesPl
            ? '⭐'
            : preset.emoji || '🎵';
          const coverIconName = isGiftPl
            ? 'gift'
            : isChristmasPl
            ? 'gift'
            : isSummerPl
            ? 'sun'
            : isFavoritesPl
            ? 'heart'
            : preset.iconName || 'music';

          const badgeText = isGiftPl
            ? trackCount === 1
              ? '1 GESCHENK'
              : trackCount > 1
              ? `${trackCount} GESCHENKE`
              : '0 GESCHENKE • BEREIT'
            : isChristmasPl
            ? trackCount > 0
              ? `${trackCount} TRACKS`
              : '🎄 WEIHNACHTEN'
            : isSummerPl
            ? trackCount > 0
              ? `${trackCount} TRACKS`
              : '☀️ SOMMERHITS'
            : isFavoritesPl
            ? trackCount > 0
              ? `${trackCount} TRACKS`
              : '⭐ LIEBLINGSSONGS'
            : trackCount > 0
            ? `${trackCount} TRACKS`
            : preset.badge || '0 TRACKS • BEREIT';

          const isSummerGlow = isSummerPl;
          const isGiftGlow = isGiftPl && trackCount > 0;

          return (
            <div
              key={pl.id || idx}
              onClick={() => onSelectPlaylistForModal(pl)}
              style={{
                borderRadius: '16px',
                background: isLight ? '#ffffff' : 'rgba(30, 41, 59, 0.6)',
                border: isGiftGlow
                  ? '2px solid #f472b6'
                  : isSummerGlow
                  ? '2px solid #f59e0b'
                  : `1.5px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                cursor: 'pointer',
                boxShadow: isGiftGlow
                  ? '0 8px 24px rgba(236, 72, 153, 0.22)'
                  : isSummerGlow
                  ? '0 8px 24px rgba(245, 158, 11, 0.22)'
                  : isLight
                  ? '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)'
                  : '0 4px 16px rgba(0, 0, 0, 0.25)',
                position: 'relative',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease'
              }}
              className={`spotify-card-hover ${isLight ? 'spotify-card-hover-light' : 'spotify-card-hover-dark'}`}
            >
              {/* 1:1 Square Artwork Container */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '1 / 1',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}
              >
                <SpotifyCoverArtwork
                  gradient={coverGradient}
                  accentColor={coverAccent}
                  badge={badgeText}
                  title={pl.title}
                  subtitle={pl.description}
                  iconName={coverIconName}
                  emoji={coverEmoji}
                  trackCount={trackCount}
                  isEmpty={trackCount === 0}
                  isSeasonFocus={isSummerPl || isChristmasPl}
                  seasonBadgeText={isSummerPl ? '☀️ SOMMERHITS' : isChristmasPl ? '🎄 WEIHNACHTEN' : badgeText}
                  seasonGlowColor={isSummerPl ? '#f59e0b' : isChristmasPl ? '#dc2626' : undefined}
                />

                {/* Quick Delete Button for custom playlists */}
                {pl.id !== 'pl_gifts' && pl.id !== 'pl_meilenstein_lp' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      requestDeletePlaylist(pl.id, pl.title);
                    }}
                    title="Album löschen"
                    aria-label="Album löschen"
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: 'rgba(0, 0, 0, 0.45)',
                      backdropFilter: 'blur(4px)',
                      WebkitBackdropFilter: 'blur(4px)',
                      border: 'none',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 10,
                      opacity: 0.75,
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.85)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0.75';
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.45)';
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}

                {/* Floating Quick Action FAB */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (trackCount === 0) {
                      onOpenJuniorWizard(null, pl.id);
                    } else {
                      onSelectPlaylistForModal(pl);
                    }
                  }}
                  title={trackCount === 0 ? 'Erstes Stück aufnehmen' : 'Album öffnen & anhören'}
                  aria-label={trackCount === 0 ? 'Erstes Stück aufnehmen' : 'Album öffnen & anhören'}
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.4)',
                    zIndex: 10
                  }}
                  className="hover-scale"
                >
                  {trackCount === 0 ? (
                    <Mic size={16} fill="#ffffff" color="#ffffff" />
                  ) : (
                    <Play size={16} fill="#ffffff" color="#ffffff" style={{ marginLeft: '2px' }} />
                  )}
                </button>
              </div>

              {/* Card Typography below Artwork */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px' }}>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: '0.86rem',
                      fontWeight: 900,
                      color: colors.textPrimary,
                      lineHeight: 1.25,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: '2.25em',
                      letterSpacing: '-0.01em',
                      flex: 1
                    }}
                    title={pl.title}
                  >
                    {pl.title}
                  </h4>

                  {trackCount > 0 && (
                    <BookOpen size={12} color={colors.textSecondary} style={{ flexShrink: 0, opacity: 0.6 }} />
                  )}
                </div>

                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: trackCount > 0 ? (isGiftPl ? '#db2777' : '#059669') : '#059669',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {trackCount > 0 ? (
                    isGiftPl ? (
                      `${trackCount} ${trackCount === 1 ? 'Geschenk' : 'Geschenke'} • Bereit`
                    ) : (
                      `${trackCount} ${trackCount === 1 ? 'Track' : 'Tracks'} • ${totalDurationMin} Min.`
                    )
                  ) : (
                    <>
                      <Mic size={11} color="#059669" />
                      <span>Bereit für Songs • Aufnehmen</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* + Neue Playlist anlegen Card */}
        <div
          onClick={onOpenCreatePlaylist}
          style={{
            borderRadius: '16px',
            border: `2px dashed ${isLight ? '#c7d2fe' : 'rgba(99, 102, 241, 0.3)'}`,
            background: isLight ? '#f5f3ff' : 'rgba(99, 102, 241, 0.04)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            cursor: 'pointer',
            boxSizing: 'border-box',
            transition: 'all 0.2s ease'
          }}
          className="hover-scale"
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1 / 1',
              borderRadius: '12px',
              border: `1.5px dashed ${isLight ? '#c7d2fe' : 'rgba(99, 102, 241, 0.4)'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
              }}
            >
              <Plus size={22} strokeWidth={2.8} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#4338ca' }}>+ Neue Playlist</span>
            <span style={{ fontSize: '0.70rem', color: colors.textSecondary }}>Cover & Songs wählen</span>
          </div>
        </div>
      </div>
    </div>
  );
};
