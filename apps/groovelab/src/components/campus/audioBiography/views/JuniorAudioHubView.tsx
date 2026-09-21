import React from 'react';
import { Sparkles, Mic, Gift, Download, Share2 } from 'lucide-react';
import { MilestoneData, CustomPlaylist, CustomPlaylistTrack, formatStudentPossessive } from '../types';
import { JuniorMilestonesSection } from './JuniorMilestonesSection';
import { JuniorPlaylistsSection } from './JuniorPlaylistsSection';

export interface JuniorAudioHubViewProps {
  milestones: MilestoneData[];
  customPlaylists: CustomPlaylist[];
  student?: { first_name?: string; instrument?: string; main_instrument?: string } | null;
  isLight: boolean;
  isMobileOrSim: boolean;
  colors: { textPrimary: string; textSecondary: string; cardBg: string; cardBorder: string };
  selectedMilestoneVersions: Record<string, string>;
  setSelectedMilestoneVersions: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  activePlayingId: string | null;
  handlePlayToggle: (audioUrl?: string, masteredAudioUrl?: string, trackId?: string) => void;
  onOpenShareModal: () => void;
  onOpenJuniorWizard: (milestoneId: string | null, playlistId: string | null) => void;
  onOpenCreatePlaylist: () => void;
  onSelectPlaylistForModal: (pl: CustomPlaylist) => void;
  requestDeletePlaylist: (playlistId: string, title: string) => void;
  downloadAllTracksAsZip: () => void;
  isZipExporting: boolean;
  zipProgressText: string;
}

export const JuniorAudioHubView: React.FC<JuniorAudioHubViewProps> = ({
  milestones,
  customPlaylists,
  student,
  isLight,
  isMobileOrSim,
  colors,
  selectedMilestoneVersions,
  setSelectedMilestoneVersions,
  activePlayingId,
  handlePlayToggle,
  onOpenShareModal,
  onOpenJuniorWizard,
  onOpenCreatePlaylist,
  onSelectPlaylistForModal,
  requestDeletePlaylist,
  downloadAllTracksAsZip,
  isZipExporting,
  zipProgressText
}) => {
  const completedMilestones = milestones.filter((m) => !!m.audioUrl);
  const studentFirstName = student?.first_name || 'Junger Musiker';
  const possessiveName = formatStudentPossessive(studentFirstName);

  // Ensure all gifts belong strictly to pl_gifts, and build sanitized custom playlists list
  const allGifts: CustomPlaylistTrack[] = [];
  customPlaylists.forEach((pl) => {
    (pl?.tracks || []).forEach((t) => {
      if (
        t.title.toLowerCase().includes('geschenk') ||
        t.subtitle?.includes('🎁') ||
        t.personalNote?.toLowerCase().includes('geschenk')
      ) {
        if (!allGifts.some((g) => g.id === t.id)) {
          allGifts.push(t);
        }
      }
    });
  });

  // Synchronize Meilensteine directly from completed milestones
  const milestoneTracks: CustomPlaylistTrack[] = completedMilestones.map((m) => ({
    id: `track_${m.id}`,
    title: m.title,
    subtitle: m.subtitle,
    audioUrl: m.audioUrl!,
    masteredAudioUrl: m.masteredAudioUrl,
    duration: m.duration || 60,
    recordedAt: m.recordedAt || 'Meilenstein',
    personalNote: m.personalNote,
    albumTitle: '🌟 Meine Meilenstein-LP'
  }));

  let displayPlaylists: CustomPlaylist[] = customPlaylists.map((pl) => {
    if (pl.id === 'pl_meilenstein_lp' || pl.title.includes('Meilenstein')) {
      return {
        ...pl,
        id: 'pl_meilenstein_lp',
        title: '🌟 Meine Meilenstein-LP',
        description: 'Mein musikalisches Lebenswerk – Die wichtigsten Meilensteine',
        tracks: milestoneTracks
      };
    }
    if (pl.id === 'pl_gifts') {
      return {
        ...pl,
        tracks: Array.from(new Map([...allGifts, ...(pl?.tracks || [])].map((t) => [t.id, t])).values())
      };
    }
    return {
      ...pl,
      tracks: (pl?.tracks || []).filter((t) => !allGifts.some((g) => g.id === t.id))
    };
  });

  if (!displayPlaylists.some((pl) => pl.id === 'pl_gifts') && allGifts.length > 0) {
    const giftsPlaylist: CustomPlaylist = {
      id: 'pl_gifts',
      title: '🎁 Meine Geschenke',
      description: 'Persönliche Geschenke für Familie & Freunde',
      vibeTheme: 'vintage_tape',
      iconName: 'gift',
      coverPresetId: 'cov_favorites_heart',
      schoolYear: '2026/2027',
      tracks: allGifts,
      createdAt: new Date().toISOString()
    };
    displayPlaylists = [giftsPlaylist, ...displayPlaylists];
  }

  if (!displayPlaylists.some((pl) => pl.id === 'pl_meilenstein_lp') && milestoneTracks.length > 0) {
    const milestonePlaylist: CustomPlaylist = {
      id: 'pl_meilenstein_lp',
      title: '🌟 Meine Meilenstein-LP',
      description: 'Mein musikalisches Lebenswerk – Die wichtigsten Meilensteine',
      vibeTheme: 'sunset_gold',
      iconName: 'star',
      coverPresetId: 'cov_gaming_xp',
      schoolYear: '2026/2027',
      tracks: milestoneTracks,
      createdAt: new Date().toISOString()
    };
    displayPlaylists = [milestonePlaylist, ...displayPlaylists];
  }

  displayPlaylists = displayPlaylists.filter((pl) => {
    if (pl.id === 'pl_gifts' || pl.id === 'pl_meilenstein_lp') {
      return pl.tracks && pl.tracks.length > 0;
    }
    return true;
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '22px',
        maxWidth: '1040px',
        margin: '0 auto',
        width: '100%'
      }}
    >
      {/* 🌟 1. DIE HELDEN-BÜHNE */}
      <div
        style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 60%, #047857 100%)',
          borderRadius: '28px',
          padding: isMobileOrSim ? '22px 18px' : '30px 36px',
          color: '#ffffff',
          boxShadow: '0 14px 40px rgba(16, 185, 129, 0.35)',
          display: 'flex',
          flexDirection: isMobileOrSim ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-25px',
            right: '-15px',
            fontSize: '9rem',
            opacity: 0.12,
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        >
          🎙️
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', zIndex: 1 }}>
          <div
            style={{
              width: isMobileOrSim ? '64px' : '80px',
              height: isMobileOrSim ? '64px' : '80px',
              borderRadius: '24px',
              background: 'rgba(255, 255, 255, 0.22)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '2.5px solid rgba(255, 255, 255, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobileOrSim ? '2.2rem' : '2.8rem',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
              flexShrink: 0
            }}
          >
            ✨
          </div>

          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.22)',
                padding: '4px 12px',
                borderRadius: '100px',
                fontSize: '0.74rem',
                fontWeight: 900,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '6px'
              }}
            >
              <Sparkles size={13} />
              <span>DEINE MUSIKALISCHE AUDIO-BÜHNE</span>
            </div>
            <h2
              style={{
                margin: '0 0 4px 0',
                fontSize: isMobileOrSim ? '1.35rem' : '1.85rem',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                lineHeight: 1.2
              }}
            >
              Was möchtest du heute aufnehmen?
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: isMobileOrSim ? '0.84rem' : '0.94rem',
                color: '#d1fae5',
                fontWeight: 600,
                lineHeight: 1.4
              }}
            >
              Nimm Meilensteine auf, fülle deine Playlisten oder erstelle ein Musik-Geschenk 🎶
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenJuniorWizard(null, null)}
          style={{
            minHeight: '58px',
            padding: isMobileOrSim ? '14px 22px' : '16px 32px',
            borderRadius: '100px',
            border: 'none',
            background: '#ffffff',
            color: '#047857',
            fontWeight: 900,
            fontSize: isMobileOrSim ? '0.95rem' : '1.05rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: '0 10px 28px rgba(0, 0, 0, 0.22)',
            whiteSpace: 'nowrap',
            zIndex: 1,
            transition: 'all 0.2s ease'
          }}
          className="hover-scale"
        >
          <Mic size={22} color="#047857" strokeWidth={2.6} />
          <span>Neues Stück aufnehmen ✨</span>
        </button>
      </div>

      {/* 🌟 2. DER MUSIKALISCHE ZAUBER-PFAD */}
      <JuniorMilestonesSection
        milestones={milestones}
        completedMilestones={completedMilestones}
        isLight={isLight}
        colors={colors}
        selectedMilestoneVersions={selectedMilestoneVersions}
        setSelectedMilestoneVersions={setSelectedMilestoneVersions}
        activePlayingId={activePlayingId}
        handlePlayToggle={handlePlayToggle}
        onOpenShareModal={onOpenShareModal}
        onOpenJuniorWizardForMilestone={(milestoneId, playlistId) => onOpenJuniorWizard(milestoneId, playlistId ?? null)}
      />

      {/* 🌟 3. LINUS' PLAYLISTEN */}
      <JuniorPlaylistsSection
        displayPlaylists={displayPlaylists}
        possessiveName={possessiveName}
        colors={colors}
        isLight={isLight}
        isMobileOrSim={isMobileOrSim}
        onOpenCreatePlaylist={onOpenCreatePlaylist}
        onSelectPlaylistForModal={onSelectPlaylistForModal}
        onOpenJuniorWizard={onOpenJuniorWizard}
        requestDeletePlaylist={requestDeletePlaylist}
      />

      {/* 🌟 4. MIT FAMILIE TEILEN */}
      <div
        style={{
          background: isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.1)',
          border: '1.5px solid #86efac',
          borderRadius: '24px',
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: '#10b981',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem',
              flexShrink: 0
            }}
          >
            🎁
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: colors.textPrimary }}>
              Möchtest du deine Musik mit Mama, Papa oder Oma teilen?
            </h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: colors.textSecondary }}>
              Über den sicheren Familien-Link können deine Liebsten deine Stücke direkt im Browser anhören und dir Applaus schicken!
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={downloadAllTracksAsZip}
            disabled={isZipExporting}
            style={{
              padding: '11px 18px',
              borderRadius: '100px',
              border: `1px solid ${colors.cardBorder}`,
              background: colors.cardBg,
              color: colors.textPrimary,
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: isZipExporting ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              opacity: isZipExporting ? 0.75 : 1
            }}
            className="hover-scale"
            title="Alle Aufnahmen als ZIP-Archiv herunterladen"
          >
            <Download size={15} />
            <span>{isZipExporting ? zipProgressText || 'ZIP wird erstellt...' : 'Alle Aufnahmen (ZIP)'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenShareModal}
            style={{
              padding: '11px 20px',
              borderRadius: '100px',
              border: 'none',
              background: '#25D366',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)'
            }}
            className="hover-scale"
          >
            <Share2 size={15} />
            <span>Mit Familie teilen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
