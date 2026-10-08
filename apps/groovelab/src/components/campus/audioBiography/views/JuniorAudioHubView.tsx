import React, { useState } from 'react';
import { Sparkles, Mic, Gift, Download, Share2, Trophy, Disc, Music } from 'lucide-react';
import { MilestoneData, CustomPlaylist, CustomPlaylistTrack, formatStudentPossessive, detectSmartProfileFromInstrument, DEFAULT_MILESTONES } from '../types';
import { JuniorMilestonesSection } from './JuniorMilestonesSection';
import { JuniorPlaylistsSection } from './JuniorPlaylistsSection';

export interface JuniorAudioHubViewProps {
  milestones: MilestoneData[];
  customPlaylists: CustomPlaylist[];
  student?: {
    first_name?: string;
    last_name?: string;
    instrument?: string;
    main_instrument?: string;
    school_year?: string;
    class?: string;
    photo_url?: string;
    avatar_url?: string;
  } | null;
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
  const [activeTab, setActiveTab] = useState<'milestones' | 'playlists'>('milestones');
  const completedMilestones = milestones.filter((m) => !!m.audioUrl);
  const studentFirstName = student?.first_name || 'Linus';
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

  const smartInstrument = detectSmartProfileFromInstrument(student?.instrument || student?.main_instrument);
  const studentClass = student?.class || (student as any)?.class_name || (student as any)?.grade || 'Klasse 3b';

  const sortedMilestones = [...milestones].sort((a, b) => a.stepNumber - b.stepNumber);
  const nextMilestone = sortedMilestones.find((m) => !m.audioUrl) || sortedMilestones[0] || (DEFAULT_MILESTONES[0] as unknown as MilestoneData);
  const isAllCompleted = milestones.length > 0 && milestones.every((m) => !!m.audioUrl);
  const nextMilestoneXp = nextMilestone ? (nextMilestone.type === 'first_song' || nextMilestone.stepNumber === 10 ? 100 : 50) : 50;

  const cleanNextTitle = (nextMilestone?.title ?? 'Mein erster Ton').replace(/^[\p{Emoji}\s]+/u, '').trim();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        maxWidth: '1040px',
        margin: '0 auto',
        width: '100%'
      }}
    >
      {/* 🌟 1. ULTRA-KOMPAKTER CAMPUS-GRÜNER HEADER (52-58px Höhe, solide ohne Verlauf) */}
      <div
        style={{
          background: '#34a853',
          borderRadius: '16px',
          height: isMobileOrSim ? '52px' : '56px',
          minHeight: '52px',
          maxHeight: '58px',
          padding: isMobileOrSim ? '0 12px' : '0 18px',
          color: '#ffffff',
          boxShadow: 'none',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: isMobileOrSim ? '10px' : '16px',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        {/* Links: Subtiles weißes Monochrom-Icon im Squircle + Linus (Klasse 3b) • Station X: ... */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobileOrSim ? '8px' : '12px', minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: isMobileOrSim ? '30px' : '34px',
              height: isMobileOrSim ? '30px' : '34px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
            title={smartInstrument.name}
          >
            <Music size={isMobileOrSim ? 15 : 17} color="#ffffff" strokeWidth={2.4} />
          </div>

          <div
            style={{
              minWidth: 0,
              flex: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: isMobileOrSim ? '0.78rem' : '0.90rem',
              fontWeight: 800,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: '#ffffff',
              letterSpacing: '-0.01em'
            }}
            title={`${studentFirstName} (${studentClass}) • ${isAllCompleted ? 'Alle 10 Meilensteine gemeistert' : `Station ${nextMilestone?.stepNumber ?? 1}: ${cleanNextTitle}`}`}
          >
            {studentFirstName} ({studentClass}) • {isAllCompleted ? 'Alle 10 Meilensteine gemeistert' : `Station ${nextMilestone?.stepNumber ?? 1}: ${cleanNextTitle}`}
          </div>
        </div>

        {/* Rechts: Subtile Status-Pille (X/10) + Crisp White Pill Button [ 🎙️ Aufnehmen (+50 XP) ] */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobileOrSim ? '6px' : '10px',
            flexShrink: 0
          }}
        >
          {/* Subtile Status-Pille 1/10 */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.22)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              padding: isMobileOrSim ? '3px 8px' : '4px 10px',
              borderRadius: '100px',
              fontSize: isMobileOrSim ? '0.70rem' : '0.74rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}
            title={`${completedMilestones.length} von ${milestones.length || 10} Meilensteinen gemeistert`}
          >
            <span>{completedMilestones.length}/{milestones.length || 10}</span>
          </div>

          {/* Single crisp white pill button [ 🎙️ Aufnehmen (+50 XP) ] */}
          <button
            type="button"
            onClick={() => {
              if (isAllCompleted) {
                onOpenJuniorWizard(null, null);
              } else {
                onOpenJuniorWizard(nextMilestone?.id ?? null, nextMilestone?.type === 'family_share' ? 'pl_gifts' : null);
              }
            }}
            aria-label={isAllCompleted ? 'Aufnehmen' : `Aufnehmen (+${nextMilestoneXp} XP)`}
            style={{
              padding: isMobileOrSim ? '6px 12px' : '7px 16px',
              borderRadius: '100px',
              border: 'none',
              background: '#ffffff',
              color: '#166534',
              fontWeight: 900,
              fontSize: isMobileOrSim ? '0.74rem' : '0.80rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
          >
            <Mic size={isMobileOrSim ? 13 : 14} color="#166534" strokeWidth={2.4} />
            <span>
              {isAllCompleted
                ? 'Aufnehmen'
                : isMobileOrSim
                ? 'Aufnehmen'
                : `Aufnehmen (+${nextMilestoneXp} XP)`}
            </span>
          </button>
        </div>
      </div>

      {/* 🌟 2. APPLE-GRADE SEGMENTED PILL SWITCH */}
      <div
        role="tablist"
        aria-label="Audio-Biografie Bereiche"
        style={{
          display: 'inline-flex',
          background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)',
          padding: '4px',
          borderRadius: '100px',
          border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)'}`,
          alignSelf: isMobileOrSim ? 'stretch' : 'flex-start',
          gap: '4px',
          width: isMobileOrSim ? '100%' : 'auto',
          boxSizing: 'border-box'
        }}
      >
        <button
          type="button"
          role="tab"
          id="tab-milestones"
          aria-controls="tabpanel-milestones"
          aria-selected={activeTab === 'milestones'}
          onClick={() => setActiveTab('milestones')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveTab('milestones');
            }
          }}
          style={{
            flex: isMobileOrSim ? 1 : 'initial',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '7px 18px',
            borderRadius: '100px',
            border: 'none',
            background: activeTab === 'milestones' ? (isLight ? '#ffffff' : '#1e293b') : 'transparent',
            color: activeTab === 'milestones' ? (isLight ? '#0f172a' : '#ffffff') : colors.textSecondary,
            fontWeight: activeTab === 'milestones' ? 900 : 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'milestones' ? '0 1px 4px rgba(0, 0, 0, 0.08)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Trophy size={14} color={activeTab === 'milestones' ? (isLight ? '#0f172a' : '#ffffff') : colors.textSecondary} strokeWidth={2.4} />
          <span>10 Meilensteine ({completedMilestones.length}/{milestones.length || 10})</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-playlists"
          aria-controls="tabpanel-playlists"
          aria-selected={activeTab === 'playlists'}
          onClick={() => setActiveTab('playlists')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveTab('playlists');
            }
          }}
          style={{
            flex: isMobileOrSim ? 1 : 'initial',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '7px 18px',
            borderRadius: '100px',
            border: 'none',
            background: activeTab === 'playlists' ? (isLight ? '#ffffff' : '#1e293b') : 'transparent',
            color: activeTab === 'playlists' ? (isLight ? '#0f172a' : '#ffffff') : colors.textSecondary,
            fontWeight: activeTab === 'playlists' ? 900 : 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'playlists' ? '0 1px 4px rgba(0, 0, 0, 0.08)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Disc size={14} color={activeTab === 'playlists' ? (isLight ? '#0f172a' : '#ffffff') : colors.textSecondary} strokeWidth={2.4} />
          <span>Playlisten & Alben ({displayPlaylists.length})</span>
        </button>
      </div>

      {/* 🌟 3. SECTIONS SWITCHED (100% Prominenz, kein Scrollen nötig) */}
      <div
        role="tabpanel"
        id={activeTab === 'milestones' ? 'tabpanel-milestones' : 'tabpanel-playlists'}
        aria-labelledby={activeTab === 'milestones' ? 'tab-milestones' : 'tab-playlists'}
      >
        {activeTab === 'milestones' ? (
          <JuniorMilestonesSection
            milestones={milestones}
            completedMilestones={completedMilestones}
            isLight={isLight}
            colors={colors}
            isMobileOrSim={isMobileOrSim}
            selectedMilestoneVersions={selectedMilestoneVersions}
            setSelectedMilestoneVersions={setSelectedMilestoneVersions}
            activePlayingId={activePlayingId}
            handlePlayToggle={handlePlayToggle}
            onOpenShareModal={onOpenShareModal}
            onOpenJuniorWizardForMilestone={(milestoneId, playlistId) => onOpenJuniorWizard(milestoneId, playlistId ?? null)}
          />
        ) : (
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
        )}
      </div>

      {/* 🌟 4. MIT FAMILIE TEILEN */}
      <div
        style={{
          background: isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.1)',
          border: `1.5px solid ${isLight ? '#10b981' : 'rgba(16, 185, 129, 0.3)'}`,
          borderRadius: '20px',
          padding: '16px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#34a853',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Gift size={20} color="#ffffff" strokeWidth={2.2} />
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
              boxShadow: 'none'
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
