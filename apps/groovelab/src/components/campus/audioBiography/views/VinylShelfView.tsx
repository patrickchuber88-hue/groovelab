import React from 'react';
import { 
  ListMusic, Disc, Sparkles, Mic, Play, Pause, History, Share2 
} from 'lucide-react';
import { MilestoneData, CustomPlaylist, SchoolYearLP } from '../types';
import { VinylTracklistSection } from './VinylTracklistSection';

export interface VinylShelfViewProps {
  colors: any;
  isLight: boolean;
  shelfMode: 'years' | 'playlists';
  setShelfMode: (mode: 'years' | 'playlists') => void;
  effectiveShelfMode: 'years' | 'playlists';
  customPlaylists: CustomPlaylist[];
  activeSchoolYears: SchoolYearLP[];
  selectedYearId: string;
  setSelectedYearId: (id: string) => void;
  selectedCustomPlaylistId: string | null;
  setSelectedCustomPlaylistId: (id: string) => void;
  isAllMilestonesCompleted: boolean;
  currentShelfVibeObj: any;
  student?: { first_name?: string; instrument?: string } | null;
  isPlayingPlaylist: boolean;
  isPlayingABComparison: boolean;
  activePlaylistTracks: any[];
  milestones: MilestoneData[];
  openUploadModal: (milestone: MilestoneData) => void;
  setActiveUploadModalMilestone: (ms: MilestoneData | null) => void;
  setRecordingPlaylistId: (id: string | null) => void;
  startContinuousPlaylist: (tracks?: any[], albumTitle?: string, albumSubtitle?: string) => void;
  calcTracksDurationFormatted: (tracks: any[]) => string;
  canPlayAB: boolean;
  startABComparison: () => void;
  abComparisonStage: string | null;
  abRecordedCount: number;
  showChapterList: boolean;
  setShowChapterList: (show: boolean) => void;
  activePlayingId: string | null;
  handlePlayToggle: (audioUrl?: string, masteredAudioUrl?: string, trackId?: string) => void;
  downloadAudioTrack: (audioUrl?: string, masteredAudioUrl?: string, title?: string, trackId?: string) => void;
  openEditTrackModal: (playlistId: string, track: any) => void;
  requestDeleteTrack?: (playlistId: string, trackId: string, title: string) => void;
  playlistReactions: Record<string, any>;
  onOpenShareModal: () => void;
}

export const VinylShelfView: React.FC<VinylShelfViewProps> = ({
  colors,
  isLight,
  setShelfMode,
  effectiveShelfMode,
  customPlaylists,
  activeSchoolYears,
  selectedYearId,
  setSelectedYearId,
  selectedCustomPlaylistId,
  setSelectedCustomPlaylistId,
  isAllMilestonesCompleted,
  currentShelfVibeObj,
  student,
  isPlayingPlaylist,
  isPlayingABComparison,
  activePlaylistTracks,
  milestones,
  openUploadModal,
  setActiveUploadModalMilestone,
  setRecordingPlaylistId,
  startContinuousPlaylist,
  calcTracksDurationFormatted,
  canPlayAB,
  startABComparison,
  abComparisonStage,
  abRecordedCount,
  showChapterList,
  setShowChapterList,
  activePlayingId,
  handlePlayToggle,
  downloadAudioTrack,
  openEditTrackModal,
  requestDeleteTrack,
  playlistReactions,
  onOpenShareModal
}) => {
  const activeCustomPlaylist = customPlaylists.find((p) => p.id === selectedCustomPlaylistId) || customPlaylists[0];

  return (
    <div
      style={{
        background: colors.cardBg,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1.5px solid ${colors.cardBorder}`,
        borderRadius: '24px',
        padding: '22px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        boxShadow: colors.shadow,
        boxSizing: 'border-box'
      }}
    >
      {/* Header with Shelf Mode Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ListMusic size={19} color="#10b981" />
          <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: colors.textPrimary }}>
            Schallplatten-Regal
          </h3>
        </div>

        {/* Toggle between Jahres-LPs and Custom Playlists */}
        <div
          style={{
            display: 'flex',
            gap: '2px',
            background: isLight ? '#f1f5f9' : 'rgba(0,0,0,0.3)',
            borderRadius: '100px',
            padding: '2px'
          }}
        >
          <button
            type="button"
            onClick={() => setShelfMode('years')}
            style={{
              padding: '4px 8px',
              borderRadius: '100px',
              border: 'none',
              background: effectiveShelfMode === 'years' ? (isLight ? '#ffffff' : 'rgba(255,255,255,0.2)') : 'transparent',
              color: effectiveShelfMode === 'years' ? (isLight ? '#0f172a' : '#ffffff') : colors.textSecondary,
              fontSize: '0.68rem',
              fontWeight: 900,
              cursor: 'pointer'
            }}
          >
            Jahres-LPs
          </button>
          <button
            type="button"
            onClick={() => setShelfMode('playlists')}
            style={{
              padding: '4px 8px',
              borderRadius: '100px',
              border: 'none',
              background: effectiveShelfMode === 'playlists' ? (isLight ? '#ffffff' : 'rgba(255,255,255,0.2)') : 'transparent',
              color: effectiveShelfMode === 'playlists' ? (isLight ? '#0f172a' : '#ffffff') : colors.textSecondary,
              fontSize: '0.68rem',
              fontWeight: 900,
              cursor: 'pointer'
            }}
          >
            Playlists ({customPlaylists.length})
          </button>
        </div>
      </div>

      {/* Shelf Tabs Selection */}
      {effectiveShelfMode === 'years' ? (
        <div
          style={{
            display: 'flex',
            gap: '6px',
            background: isLight ? '#f1f5f9' : 'rgba(0, 0, 0, 0.35)',
            borderRadius: '12px',
            padding: '4px',
            border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.08)'}`
          }}
        >
          {activeSchoolYears.map((lp: SchoolYearLP) => {
            const isSelected = selectedYearId === lp.id;
            return (
              <button
                key={lp.id}
                type="button"
                onClick={() => setSelectedYearId(lp.id)}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: '9px',
                  border: 'none',
                  background: isSelected ? (isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.16)') : 'transparent',
                  color: isSelected ? (isLight ? '#0f172a' : '#ffffff') : colors.textSecondary,
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: isSelected && isLight ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {lp.year}
              </button>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            background: isLight ? '#f1f5f9' : 'rgba(0, 0, 0, 0.35)',
            borderRadius: '12px',
            padding: '4px',
            border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.08)'}`
          }}
        >
          {customPlaylists.length === 0 ? (
            <span style={{ fontSize: '0.72rem', color: colors.textMuted, padding: '6px 10px' }}>
              Keine Playlists angelegt
            </span>
          ) : (
            customPlaylists.map((pl) => {
              const isSelected = selectedCustomPlaylistId === pl.id;
              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => setSelectedCustomPlaylistId(pl.id)}
                  style={{
                    flex: 1,
                    padding: '7px 8px',
                    borderRadius: '9px',
                    border: 'none',
                    background: isSelected ? (isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.16)') : 'transparent',
                    color: isSelected ? (isLight ? '#0f172a' : '#ffffff') : colors.textSecondary,
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: isSelected && isLight ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {pl.title}
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Selected Vinyl Turntable Display with Apple Modern Sleeve Layout */}
      <div
        style={{
          background: isLight ? '#f8fafc' : 'rgba(15, 23, 42, 0.75)',
          border: `1.5px solid ${isAllMilestonesCompleted ? '#f59e0b' : currentShelfVibeObj.color}44`,
          borderRadius: '20px',
          padding: '20px 14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          position: 'relative',
          boxShadow: isAllMilestonesCompleted
            ? '0 8px 24px rgba(245, 158, 11, 0.2)'
            : isLight
            ? '0 4px 16px rgba(0,0,0,0.04)'
            : 'none'
        }}
      >
        {/* 🏆 Golden Vinyl Badge if 10/10 Completed */}
        {isAllMilestonesCompleted && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '1px solid #f59e0b',
              borderRadius: '100px',
              padding: '3px 9px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)',
              zIndex: 2
            }}
          >
            <Sparkles size={11} color="#b45309" />
            <span style={{ fontSize: '0.66rem', fontWeight: 900, color: '#b45309', textTransform: 'uppercase' }}>
              Goldene LP
            </span>
          </div>
        )}

        {/* Apple Modern Vinyl & Sleeve Arrangement */}
        <div
          style={{
            position: 'relative',
            width: '180px',
            height: '140px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* 3D Vinyl Sleeve */}
          <div
            style={{
              position: 'absolute',
              left: '8px',
              width: '110px',
              height: '110px',
              borderRadius: '12px',
              background: isAllMilestonesCompleted
                ? 'linear-gradient(135deg, #78350f 0%, #b45309 50%, #f59e0b 100%)'
                : currentShelfVibeObj.gradient,
              boxShadow: '0 10px 24px rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
              zIndex: 1,
              transform: 'rotate(-4deg)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Disc size={14} color="white" />
              <span style={{ fontSize: '0.58rem', fontWeight: 900, color: 'rgba(255, 255, 255, 0.9)' }}>
                {currentShelfVibeObj.year}
              </span>
            </div>
            <div>
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 900,
                  color: 'white',
                  display: 'block',
                  lineHeight: 1.1,
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                }}
              >
                {student?.first_name || 'Campus'}
              </span>
              <span style={{ fontSize: '0.52rem', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 700 }}>
                {student?.instrument || 'Meister-Album'}
              </span>
            </div>
          </div>

          {/* Rotating Vinyl Disc Sliding out of Sleeve */}
          <div
            style={{
              position: 'absolute',
              right: '8px',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: isAllMilestonesCompleted
                ? 'radial-gradient(circle, #fef08a 0%, #eab308 40%, #ca8a04 75%, #713f12 100%)'
                : 'radial-gradient(circle, #1c1917 25%, #0c0a09 60%, #000000 100%)',
              border: isAllMilestonesCompleted ? '3.5px solid #ca8a04' : '3.5px solid #292524',
              boxShadow: isAllMilestonesCompleted
                ? '0 0 28px rgba(234, 179, 8, 0.65)'
                : isPlayingPlaylist || isPlayingABComparison
                ? `0 0 28px ${currentShelfVibeObj.color}88`
                : '0 10px 26px rgba(0, 0, 0, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: isPlayingPlaylist || isPlayingABComparison ? 'vinylSpin 3.5s linear infinite' : 'none',
              transition: 'all 0.3s ease',
              zIndex: 2
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: isAllMilestonesCompleted
                  ? 'linear-gradient(135deg, #78350f 0%, #b45309 100%)'
                  : currentShelfVibeObj.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
              }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#09090b' }} />
            </div>
          </div>
        </div>

        {/* Album Title & Stats */}
        <div style={{ textAlign: 'center' }}>
          <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: colors.textPrimary }}>
            {isAllMilestonesCompleted ? '🏆 Goldene Meister-LP' : currentShelfVibeObj.title}
          </h4>
          <span
            style={{
              fontSize: '0.76rem',
              color: colors.textSecondary,
              marginTop: '3px',
              display: 'block',
              fontWeight: 600
            }}
          >
            {currentShelfVibeObj.subtitle} •{' '}
            {effectiveShelfMode === 'years'
              ? `${activePlaylistTracks.length} / ${milestones.length} Tracks`
              : `${activePlaylistTracks.length} ${activePlaylistTracks.length === 1 ? 'Song' : 'Songs'}`}
          </span>
        </div>

        {/* Smart CTA Main Button */}
        {activePlaylistTracks.length === 0 ? (
          <button
            type="button"
            onClick={() => {
              if (effectiveShelfMode === 'years') {
                if (milestones.length > 0) {
                  openUploadModal(milestones[0]);
                }
              } else if (activeCustomPlaylist) {
                setActiveUploadModalMilestone(null);
                setRecordingPlaylistId(activeCustomPlaylist.id);
              }
            }}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '100px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontSize: '0.84rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.2s ease'
            }}
            className="hover-scale"
          >
            <Mic size={16} />
            <span>{effectiveShelfMode === 'years' ? 'Ersten Meilenstein aufnehmen' : '+ Song für diese Playlist aufnehmen'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => startContinuousPlaylist()}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '100px',
              border: 'none',
              background: isPlayingPlaylist ? '#d97706' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontSize: '0.84rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isPlayingPlaylist
                ? '0 4px 16px rgba(217, 119, 6, 0.4)'
                : '0 4px 16px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.2s ease'
            }}
            className="hover-scale"
          >
            {isPlayingPlaylist ? <Pause size={16} /> : <Play size={16} />}
            <span>
              {isPlayingPlaylist ? 'LP Pausieren' : `Komplette LP abspielen (${calcTracksDurationFormatted(activePlaylistTracks)})`}
            </span>
          </button>
        )}

        {/* 🌟 Hörvergleich (A/B) Früher vs. Heute Button */}
        {effectiveShelfMode === 'years' && (
          <button
            type="button"
            onClick={() => {
              if (canPlayAB) {
                startABComparison();
              }
            }}
            disabled={!canPlayAB && !isPlayingABComparison}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '100px',
              border: `1.5px solid ${
                isPlayingABComparison
                  ? '#f59e0b'
                  : canPlayAB
                  ? isLight
                    ? '#cbd5e1'
                    : 'rgba(255,255,255,0.18)'
                  : isLight
                  ? '#e2e8f0'
                  : 'rgba(255,255,255,0.08)'
              }`,
              background: isPlayingABComparison
                ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                : canPlayAB
                ? isLight
                  ? '#ffffff'
                  : 'rgba(255, 255, 255, 0.08)'
                : isLight
                ? '#f1f5f9'
                : 'rgba(255,255,255,0.03)',
              color: isPlayingABComparison ? '#92400e' : canPlayAB ? colors.textPrimary : colors.textMuted,
              fontSize: '0.76rem',
              fontWeight: 900,
              cursor: canPlayAB ? 'pointer' : 'not-allowed',
              opacity: canPlayAB ? 1 : 0.65,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isPlayingABComparison ? '0 4px 16px rgba(245, 158, 11, 0.4)' : 'none',
              transition: 'all 0.2s ease'
            }}
            className={canPlayAB ? 'hover-scale' : ''}
          >
            <History size={15} color={isPlayingABComparison ? '#d97706' : canPlayAB ? '#10b981' : '#94a3b8'} />
            <span>
              {isPlayingABComparison
                ? abComparisonStage === 'station1'
                  ? '🎧 Station 01 (Erster Ton)...'
                  : abComparisonStage === 'transition'
                  ? '✨ Überblende zu heute...'
                  : '🚀 Station 10 (Meisterstück)!'
                : canPlayAB
                ? '✨ Hörvergleich: Erster Ton vs. Meisterstück'
                : `🔒 Hörvergleich (${abRecordedCount}/2: #01 & #10 benötigt)`}
            </span>
          </button>
        )}
      </div>

      {/* Chapter Tracklist Section */}
      <VinylTracklistSection
        effectiveShelfMode={effectiveShelfMode}
        showChapterList={showChapterList}
        setShowChapterList={setShowChapterList}
        currentShelfVibeObj={currentShelfVibeObj}
        milestones={milestones}
        activePlaylistTracks={activePlaylistTracks}
        activePlayingId={activePlayingId}
        isLight={isLight}
        colors={colors}
        selectedCustomPlaylistId={selectedCustomPlaylistId}
        handlePlayToggle={handlePlayToggle}
        downloadAudioTrack={downloadAudioTrack}
        openUploadModal={openUploadModal}
        openEditTrackModal={openEditTrackModal}
        requestDeleteTrack={requestDeleteTrack}
        onRecordForPlaylist={() => {
          if (activeCustomPlaylist) {
            setActiveUploadModalMilestone(null);
            setRecordingPlaylistId(activeCustomPlaylist.id);
          }
        }}
      />

      {/* Live Familien-Applaus & Reaktionen Lounge */}
      {(() => {
        const curPlId =
          effectiveShelfMode === 'playlists'
            ? selectedCustomPlaylistId || customPlaylists[0]?.id || 'default'
            : 'pl_milestones_album';
        const reactions =
          playlistReactions[curPlId] || (effectiveShelfMode === 'playlists' ? playlistReactions['default'] : null);
        if (!reactions || reactions.total === 0) return null;

        return (
          <div
            style={{
              background: isLight
                ? 'linear-gradient(135deg, rgba(254, 243, 199, 0.7) 0%, rgba(254, 249, 195, 0.5) 100%)'
                : 'linear-gradient(135deg, rgba(245, 158, 11, 0.14) 0%, rgba(234, 179, 8, 0.07) 100%)',
              border: isLight ? '1.5px solid #fde68a' : '1.5px solid rgba(245, 158, 11, 0.28)',
              borderRadius: '20px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: isLight ? '0 4px 14px rgba(245, 158, 11, 0.08)' : '0 4px 18px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ fontSize: '1.1rem' }}>🎉</span>
                <span
                  style={{
                    fontSize: '0.80rem',
                    fontWeight: 900,
                    color: isLight ? '#92400e' : '#fde68a',
                    letterSpacing: '-0.01em'
                  }}
                >
                  Familien-Applaus ({reactions.total})
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: isLight ? '#b45309' : '#fef3c7',
                  background: isLight ? '#fef3c7' : 'rgba(245, 158, 11, 0.2)',
                  padding: '3px 8px',
                  borderRadius: '100px',
                  border: isLight ? '1px solid #fde68a' : '1px solid rgba(245, 158, 11, 0.3)'
                }}
              >
                Live Feedback
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {reactions.bravo > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                    border: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '5px 10px',
                    borderRadius: '100px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: isLight ? '#0f172a' : '#ffffff'
                  }}
                >
                  <span>👏</span>
                  <span>{reactions.bravo}× Bravo</span>
                </div>
              )}
              {reactions.love > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                    border: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '5px 10px',
                    borderRadius: '100px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: isLight ? '#0f172a' : '#ffffff'
                  }}
                >
                  <span>❤️</span>
                  <span>{reactions.love}× Herz</span>
                </div>
              )}
              {reactions.fire > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                    border: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '5px 10px',
                    borderRadius: '100px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: isLight ? '#0f172a' : '#ffffff'
                  }}
                >
                  <span>🔥</span>
                  <span>{reactions.fire}× Begeisterung</span>
                </div>
              )}
              {reactions.star > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                    border: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '5px 10px',
                    borderRadius: '100px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: isLight ? '#0f172a' : '#ffffff'
                  }}
                >
                  <span>⭐</span>
                  <span>{reactions.star}× Meisterwerk</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Quick Share to Family Button */}
      <button
        type="button"
        onClick={onOpenShareModal}
        style={{
          width: '100%',
          padding: '11px',
          borderRadius: '100px',
          border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.16)'}`,
          background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
          color: colors.textPrimary,
          fontSize: '0.8rem',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.04)' : 'none'
        }}
        className="hover-scale"
      >
        <Share2 size={14} color="#10b981" />
        <span>Playlist mit Familie teilen</span>
      </button>
    </div>
  );
};
