import React from 'react';
import { Flame, Folder, Plus, Sparkles, ChevronRight } from 'lucide-react';
import { 
  MilestoneData, 
  CustomPlaylist, 
  SchoolYearLP, 
  UNIVERSAL_PLAYLIST_COVERS, 
  VIBE_THEMES, 
  SCHOOL_YEAR_COVERS, 
  getSeasonalPlaylistFocus 
} from '../types';
import { SpotifyCoverCard } from './SpotifyCoverCard';

export interface OverviewShelfViewProps {
  milestones: MilestoneData[];
  customPlaylists: CustomPlaylist[];
  activeSchoolYears: SchoolYearLP[];
  nextMilestone: MilestoneData | null;
  isJunior: boolean;
  isMobileOrSim: boolean;
  isLight: boolean;
  colors: { textPrimary: string; textMuted: string; textSecondary: string };
  isPlayingPlaylist: boolean;
  isMiniPlayerPlaying: boolean;
  currentAlbumMeta: { title: string; subtitle?: string } | null;
  activeCustomPlaylist: CustomPlaylist | null;
  onOpenCreatePlaylist: () => void;
  onOpenNextMilestone: (milestone: MilestoneData) => void;
  onOpenCustomPlaylist: (id: string) => void;
  onPlayAlbumQueue: (title: string, subtitle: string, tracks: any[], gradient: string, accentColor: string) => void;
  onOpenSchoolYearFolder: (lp: SchoolYearLP) => void;
  onOpenLinerNotes: (data: { title: string; subtitle?: string; gradient: string; tracks: any[] }) => void;
  onOpenShareModal: (playlistId: string | null) => void;
}

export const OverviewShelfView: React.FC<OverviewShelfViewProps> = ({
  milestones,
  customPlaylists,
  activeSchoolYears,
  nextMilestone,
  isMobileOrSim,
  isLight,
  colors,
  isPlayingPlaylist,
  isMiniPlayerPlaying,
  currentAlbumMeta,
  activeCustomPlaylist,
  onOpenCreatePlaylist,
  onOpenNextMilestone,
  onOpenCustomPlaylist,
  onPlayAlbumQueue,
  onOpenSchoolYearFolder,
  onOpenLinerNotes,
  onOpenShareModal
}) => {
  const isCurrentSchoolYear = (dateStr?: string) => {
    if (!dateStr) return true;
    return dateStr.includes('2026') || dateStr.includes('2027') || !dateStr.includes('/');
  };

  const currentYearPlaylists = customPlaylists.filter((pl) =>
    isCurrentSchoolYear(pl.createdAt) &&
    pl.id !== 'pl_meilenstein_lp' &&
    !pl.title.toLowerCase().includes('meilenstein')
  );
  const schoolYearAlbums = activeSchoolYears.filter((y) => y.id !== 'lp_timeless_master');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 🔥 SEKTION 1: PLAYLISTEN IM LAUFENDEN SCHULJAHR */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={17} color="#ef4444" />
            <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 900, color: colors.textPrimary }}>
              Laufendes Schuljahr (2026/2027)
            </h3>
          </div>

          {nextMilestone && (
            <button
              type="button"
              onClick={() => onOpenNextMilestone(nextMilestone)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: isLight ? '#fef3c7' : 'rgba(245, 158, 11, 0.16)',
                border: `1.5px solid ${isLight ? '#fde68a' : 'rgba(245, 158, 11, 0.35)'}`,
                color: isLight ? '#b45309' : '#fbbf24',
                padding: '4px 10px',
                borderRadius: '100px',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              className="hover-scale"
            >
              <Sparkles size={11} color="#f59e0b" />
              <span>Nächster Meilenstein: {nextMilestone.title}</span>
              <ChevronRight size={11} />
            </button>
          )}
        </div>

        {/* Horizontale Leiste */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '14px',
            overflowX: 'auto',
            padding: '12px 6px 12px 6px',
            margin: '-8px -6px -6px -6px',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Quick-Create Spotify Card */}
          <div
            onClick={onOpenCreatePlaylist}
            style={{
              flex: '0 0 auto',
              width: isMobileOrSim ? '152px' : '184px',
              scrollSnapAlign: 'start',
              borderRadius: isMobileOrSim ? '14px' : '16px',
              border: `2px dashed ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.25)'}`,
              background: isLight ? 'rgba(241, 245, 249, 0.5)' : 'rgba(255, 255, 255, 0.03)',
              padding: isMobileOrSim ? '10px' : '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '8px',
              minHeight: isMobileOrSim ? '220px' : '256px',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              boxSizing: 'border-box'
            }}
            className={`spotify-card-hover ${isLight ? 'spotify-card-hover-light' : 'spotify-card-hover-dark'}`}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
              }}
            >
              <Plus size={22} strokeWidth={2.8} />
            </div>
            <div>
              <span style={{ fontSize: '0.84rem', fontWeight: 900, color: colors.textPrimary, display: 'block' }}>
                Neue Playlist
              </span>
              <span style={{ fontSize: '0.68rem', color: colors.textMuted, marginTop: '2px', display: 'block' }}>
                Cover & Songs wählen
              </span>
            </div>
          </div>

          {/* Render Current Year Custom Playlists */}
          {(() => {
            const seasonalFocus = getSeasonalPlaylistFocus();

            return currentYearPlaylists.map((pl) => {
              const presetConfig = UNIVERSAL_PLAYLIST_COVERS.find((c) => c.id === pl.coverPresetId);
              const themeObj = VIBE_THEMES.find((v) => v.id === pl.vibeTheme) || VIBE_THEMES[0];
              const effectiveGradient = presetConfig?.gradient || themeObj.gradient;
              const effectiveAccent = presetConfig?.accentColor || themeObj.color;

              const isChristmasPl = pl.id === 'pl_weihnachten' || pl.title.toLowerCase().includes('weihnacht');
              const isSummerPl = pl.id === 'pl_sommerhits' || pl.id === 'pl_sommer_2026' || pl.title.toLowerCase().includes('sommer');
              const isFavoritesPl = pl.id === 'pl_lieblingssongs' || pl.title.toLowerCase().includes('lieblings');

              const isSeasonFocus =
                (seasonalFocus.type === 'christmas' && isChristmasPl) ||
                (seasonalFocus.type === 'summer' && isSummerPl) ||
                (seasonalFocus.type === 'favorites' && isFavoritesPl);

              const effectiveBadge = isSeasonFocus
                ? seasonalFocus.badge
                : presetConfig?.badge
                ? presetConfig.badge
                : pl.tracks.length === 0
                ? 'STUDIO PLAYLIST'
                : `${pl.tracks.length} TRACKS`;

              const isPlayingThis =
                isPlayingPlaylist &&
                (currentAlbumMeta?.title === pl.title || (activeCustomPlaylist?.id === pl.id && isMiniPlayerPlaying));

              return (
                <SpotifyCoverCard
                  key={pl.id}
                  id={pl.id}
                  title={pl.title}
                  subtitle={
                    pl.tracks.length === 0
                      ? isSeasonFocus
                        ? seasonalFocus.seasonalText
                        : 'Bereit für Songs • Aufnehmen'
                      : pl.description || 'Studio Playlist'
                  }
                  badge={effectiveBadge}
                  trackCount={pl.tracks.length}
                  totalDurationMin={Math.ceil(pl.tracks.reduce((acc, t) => acc + (t.duration || 60), 0) / 60)}
                  gradient={effectiveGradient}
                  accentColor={effectiveAccent}
                  iconName={presetConfig?.iconName || pl.iconName}
                  coverEmoji={
                    presetConfig?.emoji ||
                    (pl.iconName === 'gift' ? '🎄' : pl.iconName === 'sun' ? '☀️' : pl.iconName === 'heart' ? '⭐' : '🎵')
                  }
                  isPlayingThisAlbum={isPlayingThis}
                  isSeasonFocus={isSeasonFocus}
                  seasonBadgeText={seasonalFocus.badge}
                  seasonGlowColor={seasonalFocus.glowColor}
                  isMobileOrSim={isMobileOrSim}
                  isLight={isLight}
                  colors={colors}
                  onPlay={() => {
                    onPlayAlbumQueue(pl.title, pl.description || 'Studio Album', pl.tracks, effectiveGradient, effectiveAccent);
                  }}
                  onOpen={() => onOpenCustomPlaylist(pl.id)}
                  onBooklet={() => {
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
                  onShare={() => onOpenShareModal(pl.id)}
                />
              );
            });
          })()}
        </div>
      </div>

      {/* 📚 SEKTION 2: SCHULJAHRE-ARCHIV */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Folder size={17} color="#06b6d4" />
            <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 900, color: colors.textPrimary }}>
              Schuljahre-Archiv
            </h3>
          </div>
          <span style={{ fontSize: '0.72rem', color: colors.textMuted, fontWeight: 600 }}>
            Alle Playlisten eines Schuljahres als verewigte Meister-LP • 1 Album pro Schuljahr
          </span>
        </div>

        {/* Horizontale Leiste */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '14px',
            overflowX: 'auto',
            padding: '12px 6px 12px 6px',
            margin: '-8px -6px -6px -6px',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {schoolYearAlbums.map((lp) => {
            const yearPlaylists = customPlaylists.filter((pl) => pl.createdAt && pl.createdAt.includes(lp.year));
            const yearMilestones = milestones.filter(
              (m) => m.audioUrl && (m.schoolYear === lp.year || (lp.isCurrent && !m.schoolYear))
            );
            const allYearTracks = [
              ...yearMilestones.map((m) => ({
                id: m.id,
                title: m.title,
                subtitle: m.subtitle,
                audioUrl: m.audioUrl!,
                masteredAudioUrl: m.masteredAudioUrl,
                duration: m.duration || 60,
                albumTitle: lp.title
              })),
              ...yearPlaylists.flatMap((pl) => pl.tracks.map((t) => ({ ...t, albumTitle: pl.title })))
            ];

            const totalTracks = allYearTracks.length;
            const totalMin = Math.ceil(allYearTracks.reduce((acc, t) => acc + (t.duration || 60), 0) / 60);
            const isPlayingThisLP = isPlayingPlaylist && currentAlbumMeta?.title === lp.title;

            return (
              <SpotifyCoverCard
                key={lp.id}
                id={lp.id}
                title={lp.title}
                subtitle={
                  totalTracks === 0
                    ? 'Noch keine Songs im Schuljahr'
                    : `${totalTracks} ${totalTracks === 1 ? 'Song' : 'Songs'} • Gesamtes Schuljahr`
                }
                badge={lp.volLabel}
                volLabel={lp.volLabel}
                trackCount={totalTracks}
                totalDurationMin={totalMin}
                gradient={lp.gradient}
                accentColor={lp.accentColor}
                iconName={SCHOOL_YEAR_COVERS.find((c) => c.vol === lp.volNum)?.iconName || 'disc'}
                isBoxsetFolder={true}
                isPlayingThisAlbum={isPlayingThisLP}
                isMobileOrSim={isMobileOrSim}
                isLight={isLight}
                colors={colors}
                onPlay={() => {
                  onPlayAlbumQueue(lp.title, lp.subtitle, allYearTracks, lp.gradient, lp.accentColor);
                }}
                onOpen={() => onOpenSchoolYearFolder(lp)}
                onBooklet={() => {
                  onOpenLinerNotes({
                    title: `${lp.title} (Liner-Notes)`,
                    subtitle: `Gesamt-Chronik aller Aufnahmen im Schuljahr ${lp.year}`,
                    gradient: lp.gradient,
                    tracks: allYearTracks.map((t) => ({
                      id: t.id,
                      title: t.title,
                      subtitle: t.subtitle,
                      duration: t.duration,
                      schoolYear: lp.year
                    }))
                  });
                }}
                onShare={() => onOpenShareModal(null)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
