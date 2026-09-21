import React from 'react';
import { 
  Disc, Sparkles, Heart, Pause, Play, Mic, Share2, BookOpen, Trash2, Edit3, Download, Plus 
} from 'lucide-react';
import { 
  CustomPlaylist, 
  UNIVERSAL_PLAYLIST_COVERS, 
  VIBE_THEMES, 
  getSeasonalPlaylistFocus 
} from '../types';

export interface PlaylistsGridViewProps {
  activeCustomPlaylist: CustomPlaylist | null;
  customPlaylists: CustomPlaylist[];
  isLight: boolean;
  isMobileOrSim: boolean;
  colors: any;
  student?: { first_name?: string; instrument?: string } | null;
  isPlayingPlaylist: boolean;
  currentAlbumMeta: { title: string; subtitle?: string } | null;
  isMiniPlayerPlaying: boolean;
  activePlayingId: string | null;
  calcTracksDurationFormatted: (tracks: any[]) => string;
  openPlaylistRecordModal: (playlistId: string) => void;
  playAlbumQueue: (title: string, subtitle: string, tracks: any[], gradient: string, accentColor: string) => void;
  onOpenShareModal: (playlistId: string) => void;
  onOpenLinerNotes: (data: { title: string; subtitle?: string; gradient: string; tracks: any[] }) => void;
  requestDeletePlaylist: (playlistId: string, title: string) => void;
  handlePlayToggle: (audioUrl?: string, masteredAudioUrl?: string, trackId?: string) => void;
  openEditTrackModal: (playlistId: string, track: any) => void;
  downloadAudioTrack: (audioUrl?: string, masteredAudioUrl?: string, title?: string, trackId?: string) => void;
  requestDeleteTrack: (playlistId: string, trackId: string, title: string) => void;
  seekMiniPlayer: (targetTime: number) => void;
  audioDuration: number;
  audioCurrentTime: number;
  formatSeconds: (secs?: number) => string;
}

export const PlaylistsGridView: React.FC<PlaylistsGridViewProps> = ({
  activeCustomPlaylist,
  customPlaylists,
  isLight,
  isMobileOrSim,
  colors,
  student,
  isPlayingPlaylist,
  currentAlbumMeta,
  isMiniPlayerPlaying,
  activePlayingId,
  calcTracksDurationFormatted,
  openPlaylistRecordModal,
  playAlbumQueue,
  onOpenShareModal,
  onOpenLinerNotes,
  requestDeletePlaylist,
  handlePlayToggle,
  openEditTrackModal,
  downloadAudioTrack,
  requestDeleteTrack,
  seekMiniPlayer,
  audioDuration,
  audioCurrentTime,
  formatSeconds
}) => {
  const pl = activeCustomPlaylist || customPlaylists[0];
  if (!pl) return null;

  const presetConfig = UNIVERSAL_PLAYLIST_COVERS.find((c) => c.id === pl.coverPresetId);
  const themeObj = VIBE_THEMES.find((v) => v.id === pl.vibeTheme) || VIBE_THEMES[0];
  const effectiveGradient = presetConfig?.gradient || themeObj.gradient;
  const effectiveAccent = presetConfig?.accentColor || themeObj.color;
  const isPlayingThisAlbum =
    isPlayingPlaylist &&
    (currentAlbumMeta?.title === pl.title || (activeCustomPlaylist?.id === pl.id && isMiniPlayerPlaying));

  const seasonalFocus = getSeasonalPlaylistFocus();
  const isChristmasPl = pl.id === 'pl_weihnachten' || pl.title.toLowerCase().includes('weihnacht');
  const isSummerPl = pl.id === 'pl_sommerhits' || pl.id === 'pl_sommer_2026' || pl.title.toLowerCase().includes('sommer');
  const isFavoritesPl = pl.id === 'pl_lieblingssongs' || pl.title.toLowerCase().includes('lieblings');
  const isSeasonFocus =
    (seasonalFocus.type === 'christmas' && isChristmasPl) ||
    (seasonalFocus.type === 'summer' && isSummerPl) ||
    (seasonalFocus.type === 'favorites' && isFavoritesPl);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 🌟 Immersive Hero Header with 3D Animated Vinyl Stage */}
      <div
        style={{
          background: isLight
            ? `linear-gradient(135deg, ${effectiveAccent}14 0%, #ffffff 100%)`
            : `linear-gradient(135deg, ${effectiveAccent}28 0%, rgba(30, 41, 59, 0.75) 100%)`,
          border: `1.5px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'}`,
          borderRadius: '24px',
          padding: isMobileOrSim ? '20px' : '26px 30px',
          display: 'flex',
          flexDirection: isMobileOrSim ? 'column' : 'row',
          gap: isMobileOrSim ? '20px' : '32px',
          alignItems: isMobileOrSim ? 'center' : 'center',
          boxShadow: isLight ? '0 10px 30px rgba(0, 0, 0, 0.05)' : '0 12px 35px rgba(0, 0, 0, 0.35)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* 3D Modern Vinyl & Sleeve Hero Artwork */}
        <div
          style={{
            position: 'relative',
            width: isMobileOrSim ? '180px' : '220px',
            height: isMobileOrSim ? '135px' : '155px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start'
          }}
        >
          {/* 3D Vinyl Sleeve */}
          <div
            style={{
              position: 'absolute',
              left: '0px',
              width: isMobileOrSim ? '120px' : '140px',
              height: isMobileOrSim ? '120px' : '140px',
              borderRadius: '16px',
              background: effectiveGradient,
              boxShadow: `0 12px 30px ${effectiveAccent}55`,
              border: '1.5px solid rgba(255, 255, 255, 0.3)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
              zIndex: 2,
              transform: 'rotate(-3deg)',
              transition: 'transform 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Disc size={15} color="white" />
              <span
                style={{
                  fontSize: '0.60rem',
                  fontWeight: 900,
                  color: 'rgba(255, 255, 255, 0.95)',
                  background: 'rgba(0,0,0,0.25)',
                  padding: '1px 6px',
                  borderRadius: '6px'
                }}
              >
                {pl.tracks.length} {pl.tracks.length === 1 ? 'TRACK' : 'TRACKS'}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobileOrSim ? '1.8rem' : '2.2rem'
              }}
            >
              {presetConfig?.emoji || (pl.iconName === 'gift' ? '🎄' : pl.iconName === 'sun' ? '☀️' : pl.iconName === 'heart' ? '⭐' : '🎵')}
            </div>
            <div>
              <span
                style={{
                  fontSize: '0.70rem',
                  fontWeight: 900,
                  color: 'white',
                  display: 'block',
                  lineHeight: 1.1,
                  textShadow: '0 1px 3px rgba(0,0,0,0.6)'
                }}
              >
                {student?.first_name || 'Campus'}
              </span>
              <span style={{ fontSize: '0.56rem', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 700 }}>
                {student?.instrument || 'Meister-Album'}
              </span>
            </div>
          </div>

          {/* Rotating Vinyl Disc Sliding out of Sleeve */}
          <div
            style={{
              position: 'absolute',
              left: isMobileOrSim ? '55px' : '70px',
              width: isMobileOrSim ? '120px' : '140px',
              height: isMobileOrSim ? '120px' : '140px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #1c1917 25%, #0c0a09 60%, #000000 100%)',
              border: '3.5px solid #292524',
              boxShadow: isPlayingThisAlbum ? `0 0 30px ${effectiveAccent}99` : '0 10px 26px rgba(0, 0, 0, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: isPlayingThisAlbum ? 'vinylSpin 3.5s linear infinite' : 'none',
              transition: 'all 0.3s ease',
              zIndex: 1
            }}
          >
            <div
              style={{
                width: isMobileOrSim ? '85px' : '100px',
                height: isMobileOrSim ? '85px' : '100px',
                borderRadius: '50%',
                border: '1px dashed rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div
                style={{
                  width: isMobileOrSim ? '44px' : '50px',
                  height: isMobileOrSim ? '44px' : '50px',
                  borderRadius: '50%',
                  background: effectiveGradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.6)'
                }}
              >
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#09090b' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Album Metadata & Hero Actions */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            flex: 1,
            textAlign: isMobileOrSim ? 'center' : 'left',
            alignItems: isMobileOrSim ? 'center' : 'flex-start'
          }}
        >
          {/* Badges Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              justifyContent: isMobileOrSim ? 'center' : 'flex-start'
            }}
          >
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                color: isLight ? effectiveAccent : '#e0e7ff',
                background: isLight ? `${effectiveAccent}18` : 'rgba(99, 102, 241, 0.25)',
                border: `1px solid ${isLight ? `${effectiveAccent}33` : 'rgba(99, 102, 241, 0.5)'}`,
                padding: '3px 10px',
                borderRadius: '100px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}
            >
              STUDIO-ALBUM • {pl.createdAt || 'SCHULJAHR 2026/2027'}
            </span>

            {isSeasonFocus && (
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  color: isLight ? seasonalFocus.glowColor : '#fef08a',
                  background: isLight ? `${seasonalFocus.glowColor}22` : 'rgba(234, 179, 8, 0.25)',
                  border: `1px solid ${isLight ? `${seasonalFocus.glowColor}44` : 'rgba(234, 179, 8, 0.5)'}`,
                  padding: '3px 10px',
                  borderRadius: '100px'
                }}
              >
                {seasonalFocus.badge}
              </span>
            )}

            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                color: isLight ? '#15803d' : '#86efac',
                background: isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.25)',
                border: `1px solid ${isLight ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.5)'}`,
                padding: '3px 10px',
                borderRadius: '100px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Sparkles size={11} />
              <span>Studio-Master</span>
            </span>
          </div>

          {/* Title & Description */}
          <div>
            <h2
              style={{
                margin: '0 0 4px 0',
                fontSize: isMobileOrSim ? '1.4rem' : '1.85rem',
                fontWeight: 900,
                color: colors.textPrimary,
                letterSpacing: '-0.02em',
                lineHeight: 1.2
              }}
            >
              {pl.title}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: '0.86rem',
                color: isLight ? '#475569' : '#e2e8f0',
                lineHeight: 1.4,
                fontWeight: 500
              }}
            >
              {pl.description || 'Eigene Sammlung aufgenommener Stücke'}
            </p>
          </div>

          {/* Meta Details Line */}
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              color: isLight ? '#475569' : '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}
          >
            <span>{student?.first_name || 'Studio-Artist'}</span>
            <span>•</span>
            <span>
              {pl.tracks.length} {pl.tracks.length === 1 ? 'Song' : 'Songs'}
            </span>
            {pl.tracks.length > 0 && (
              <>
                <span>•</span>
                <span>{calcTracksDurationFormatted(pl.tracks)} Spielzeit</span>
              </>
            )}
            <span>•</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: isLight ? '#059669' : '#34d399',
                fontWeight: 800
              }}
            >
              <Heart size={12} fill={isLight ? '#059669' : '#34d399'} />
              <span>Familien-Echo: Im privaten Kreis geteilt</span>
            </span>
          </div>

          {/* Hero Action Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
              marginTop: '4px',
              justifyContent: isMobileOrSim ? 'center' : 'flex-start'
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (pl.tracks.length === 0) {
                  openPlaylistRecordModal(pl.id);
                } else {
                  playAlbumQueue(pl.title, pl.description || 'Studio Album', pl.tracks, effectiveGradient, effectiveAccent);
                }
              }}
              style={{
                padding: '10px 22px',
                borderRadius: '100px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)'
              }}
              className="hover-scale"
            >
              {isPlayingThisAlbum ? (
                <>
                  <Pause size={16} fill="#ffffff" />
                  <span>Wiedergabe pausieren</span>
                </>
              ) : (
                <>
                  <Play size={16} fill="#ffffff" />
                  <span>{pl.tracks.length === 0 ? 'Ersten Song aufnehmen' : 'Album abspielen'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => openPlaylistRecordModal(pl.id)}
              style={{
                padding: '10px 18px',
                borderRadius: '100px',
                background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
                color: colors.textPrimary,
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              className="hover-scale"
            >
              <Mic size={15} color="#10b981" />
              <span>+ Song aufnehmen</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenShareModal(pl.id)}
              style={{
                padding: '10px 16px',
                borderRadius: '100px',
                background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
                color: colors.textPrimary,
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              className="hover-scale"
            >
              <Share2 size={15} />
              <span>Teilen</span>
            </button>

            {pl.tracks.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onOpenLinerNotes({
                    title: pl.title,
                    subtitle: pl.description,
                    gradient: effectiveGradient,
                    tracks: pl.tracks.map((t) => ({
                      id: t.id,
                      title: t.title,
                      subtitle: t.subtitle,
                      personalNote: t.personalNote,
                      recordedAt: t.recordedAt,
                      duration: t.duration
                    }))
                  });
                }}
                style={{
                  padding: '10px 16px',
                  borderRadius: '100px',
                  background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                  border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
                  color: colors.textPrimary,
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                className="hover-scale"
              >
                <BookOpen size={15} />
                <span>Booklet</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => requestDeletePlaylist(pl.id, pl.title)}
              title="Playlist löschen"
              aria-label="Playlist löschen"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: `1px solid ${isLight ? '#fecaca' : 'rgba(239, 68, 68, 0.2)'}`,
                background: 'transparent',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              className="hover-scale"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 🎶 Main Content: Full-Width Spotify Tracklist */}
      <div
        style={{
          background: colors.cardBg,
          border: `1.5px solid ${colors.cardBorder}`,
          borderRadius: '24px',
          padding: isMobileOrSim ? '18px' : '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: colors.shadow
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: colors.textPrimary }}>
            Trackliste ({pl.tracks.length} {pl.tracks.length === 1 ? 'Song' : 'Songs'})
          </h3>
          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: isLight ? '#475569' : '#94a3b8' }}>
            Automatisches Studio-Mastering
          </span>
        </div>

        {pl.tracks.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 24px',
              background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
              borderRadius: '20px',
              border: `2px dashed ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: isLight ? `${effectiveAccent}18` : 'rgba(16, 185, 129, 0.15)',
                border: `1.5px solid ${isLight ? `${effectiveAccent}44` : 'rgba(16, 185, 129, 0.35)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isLight ? effectiveAccent : '#34d399',
                boxShadow: `0 8px 20px ${effectiveAccent}25`
              }}
            >
              <Mic size={28} />
            </div>
            <div style={{ maxWidth: '440px' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 900, color: colors.textPrimary }}>
                Dieses Album wartet auf deinen 1. Song!
              </h4>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.84rem',
                  color: isLight ? '#475569' : '#e2e8f0',
                  lineHeight: 1.5,
                  fontWeight: 500
                }}
              >
                Nimm dein Stück direkt über die Studio-Mikrofonaufnahme auf. Dein Klang wird automatisch studio-gemastert und dauerhaft im Album archiviert.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openPlaylistRecordModal(pl.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 26px',
                borderRadius: '100px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 4px 18px rgba(16, 185, 129, 0.45)',
                marginTop: '6px'
              }}
              className="hover-scale"
            >
              <Mic size={16} />
              <span>Jetzt ersten Song für dieses Album aufnehmen</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pl.tracks.map((t, idx) => {
              const isPlaying = activePlayingId === t.id;

              return (
                <div
                  key={t.id}
                  style={{
                    padding: '12px 18px',
                    borderRadius: '16px',
                    background: isPlaying
                      ? isLight
                        ? '#dcfce7'
                        : 'rgba(16, 185, 129, 0.2)'
                      : isLight
                      ? '#f8fafc'
                      : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${isPlaying ? '#10b981' : isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.06)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale"
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      width: '100%'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                      <button
                        type="button"
                        onClick={() => handlePlayToggle(t.audioUrl, t.masteredAudioUrl, t.id)}
                        aria-label={isPlaying ? 'Pause' : 'Abspielen'}
                        style={{
                          width: '38px',
                          height: '38px',
                          flexShrink: 0,
                          borderRadius: '50%',
                          border: 'none',
                          background: isPlaying ? '#10b981' : isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)',
                          color: isPlaying ? 'white' : colors.textPrimary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: isPlaying ? '0 3px 10px rgba(16, 185, 129, 0.4)' : 'none'
                        }}
                      >
                        {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }} />}
                      </button>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 900, color: themeObj.color }}>
                            #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                          </span>
                          <span
                            style={{
                              fontSize: '0.92rem',
                              fontWeight: 800,
                              color: isPlaying ? '#10b981' : colors.textPrimary,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {t.title}
                          </span>

                          {isPlaying && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: '2px',
                                height: '14px',
                                paddingBottom: '1px'
                              }}
                            >
                              {[0.8, 1.4, 0.6, 1.1].map((h, i) => (
                                <div
                                  key={i}
                                  style={{
                                    width: '2.5px',
                                    height: `${h * 9}px`,
                                    background: '#10b981',
                                    borderRadius: '2px',
                                    animation: `pulse 0.${6 + i * 2}s ease-in-out infinite alternate`
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            color: colors.textSecondary,
                            marginTop: '2px',
                            display: 'block'
                          }}
                        >
                          {t.subtitle ? `${t.subtitle} • ` : ''}
                          {t.recordedAt || 'Aufnahme aus dem Unterricht'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => openEditTrackModal(pl.id, t)}
                        title="Song bearbeiten"
                        aria-label="Song bearbeiten"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
                          background: isLight ? '#f0f9ff' : 'rgba(14, 165, 233, 0.12)',
                          color: '#0284c7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        className="hover-scale"
                      >
                        <Edit3 size={14} color="#0284c7" />
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadAudioTrack(t.audioUrl, t.masteredAudioUrl, t.title, t.id)}
                        title="Song herunterladen"
                        aria-label="Song herunterladen"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
                          background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                          color: colors.textPrimary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        className="hover-scale"
                      >
                        <Download size={14} color="#10b981" />
                      </button>

                      <button
                        type="button"
                        onClick={() => requestDeleteTrack(pl.id, t.id, t.title)}
                        title="Song aus Playlist entfernen"
                        aria-label="Song aus Playlist entfernen"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: `1px solid ${isLight ? '#fecaca' : 'rgba(239, 68, 68, 0.2)'}`,
                          background: isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.08)',
                          color: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        className="hover-scale"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Audio Progress Scrubber for playing track */}
                  {isPlaying && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        const trackDuration = t.duration || audioDuration || 45;
                        const targetTime = clickPos * trackDuration;
                        seekMiniPlayer(targetTime);
                      }}
                      style={{
                        width: '100%',
                        padding: '4px 0 2px 0',
                        cursor: 'pointer'
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: '6px',
                          borderRadius: '3px',
                          background: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.14)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            width: `${
                              (t.duration || audioDuration || 45) > 0
                                ? (audioCurrentTime / (t.duration || audioDuration || 45)) * 100
                                : 0
                            }%`,
                            height: '100%',
                            background: '#10b981',
                            borderRadius: '3px',
                            transition: 'width 0.1s linear'
                          }}
                        />
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '4px',
                          fontSize: '0.70rem',
                          fontWeight: 700,
                          color: colors.textSecondary,
                          fontVariantNumeric: 'tabular-nums'
                        }}
                      >
                        <span>{formatSeconds(audioCurrentTime)}</span>
                        <span style={{ fontSize: '0.66rem', color: '#10b981', fontWeight: 800 }}>Klicken zum Spulen</span>
                        <span>{formatSeconds(t.duration || audioDuration || 45)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Track Action Button */}
            <button
              type="button"
              onClick={() => openPlaylistRecordModal(pl.id)}
              style={{
                padding: '12px',
                borderRadius: '14px',
                border: `1.5px dashed ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
                background: 'transparent',
                color: colors.textPrimary,
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '6px'
              }}
              className="hover-scale"
            >
              <Plus size={15} color="#10b981" />
              <span>+ Weiteren Song für dieses Album aufnehmen</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
