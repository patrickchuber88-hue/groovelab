import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Disc, Sparkles, ListMusic, Plus, Sun, Moon, Share2, Shield, Lock 
} from 'lucide-react';

// 🌟 Re-export canonical domain types and configurations for 100% backward compatibility
export * from './audioBiography/types';
import { 
  AudioBiographyViewProps, 
  MilestoneData, 
  CustomPlaylist, 
  CustomPlaylistTrack, 
  SchoolYearLP, 
  ReverbRoomType 
} from './audioBiography/types';

// 🌟 Domain Hooks
import { useAudioBiographyData } from './audioBiography/hooks/useAudioBiographyData';
import { useAudioPlayerQueue } from './audioBiography/hooks/useAudioPlayerQueue';
import { useAudioMasteringSession } from './audioBiography/hooks/useAudioMasteringSession';
import { useAudioSharing } from './audioBiography/hooks/useAudioSharing';

// 🌟 Domain Modals
import { SchoolYearFolderModal } from './audioBiography/modals/SchoolYearFolderModal';
import { LinerNotesModal } from './audioBiography/modals/LinerNotesModal';
import { PlaylistWizardModal } from './audioBiography/modals/PlaylistWizardModal';
import { AudioRecordingModal } from './audioBiography/modals/AudioRecordingModal';
import { MilestoneReflectionModal } from './audioBiography/modals/MilestoneReflectionModal';
import { ShareModal } from './audioBiography/modals/ShareModal';
import { DualVersionDownloadModal } from './audioBiography/modals/DualVersionDownloadModal';
import { TrackEditModal } from './audioBiography/modals/TrackEditModal';
import { DeleteTrackModal } from './audioBiography/modals/DeleteTrackModal';
import { JuniorAlbumModal } from './audioBiography/modals/JuniorAlbumModal';
import { JuniorCreatePlaylistModal } from './audioBiography/modals/JuniorCreatePlaylistModal';
import { MasteryCompleteModal } from './audioBiography/modals/MasteryCompleteModal';
import { JuniorAudioBiographyWizard } from './JuniorAudioBiographyWizard';

// 🌟 Domain Views
import { OverviewShelfView } from './audioBiography/views/OverviewShelfView';
import { VinylShelfView } from './audioBiography/views/VinylShelfView';
import { MilestonesTimelineView } from './audioBiography/views/MilestonesTimelineView';
import { PlaylistsGridView } from './audioBiography/views/PlaylistsGridView';
import { JuniorAudioHubView } from './audioBiography/views/JuniorAudioHubView';
import { FloatingMiniPlayer } from './audioBiography/views/FloatingMiniPlayer';

// 🌟 Audio Storage Helper for Dual-Mastering Tri-Storage
import { getSecureAudioUrl, buildCanonicalAudioStoragePath } from '../../utils/audioStorageHelper';
import { storeBlob, getBlob } from '../../utils/blobStorage';
import { processStudioMastering } from '../../utils/audioMasteringEngine';
import { supabase } from '../../lib/supabase';

export const AudioBiographyView: React.FC<AudioBiographyViewProps> = ({
  student,
  teacherId,
  isTeacher = false,
  onBackToHub,
  isMobileOrSim = false,
  studentUiLevel,
  hasTresorStorage
}) => {
  const studentId = student?.id || student?.student_id || 'anonymous_student';

  const isJunior = (
    studentUiLevel === 'junior' ||
    student?.campus_ui_level === 'junior' ||
    (typeof window !== 'undefined' && localStorage.getItem('campus_ui_level') === 'junior')
  );

  // 1. Data Hook
  const {
    milestones,
    setMilestones,
    customPlaylists,
    setCustomPlaylists,
    activeSchoolYears,
    theme,
    toggleTheme,
    hasAudioTresorStorage,
    tresorAccessLoading,
    colors,
    isLight,
    saveMilestones,
    savePlaylists,
    playlistReactions,
    nextMilestone,
    isAllMilestonesCompleted,
    canPlayAB,
    abRecordedCount
  } = useAudioBiographyData({ 
    studentId, 
    student, 
    hasTresorStorage: hasTresorStorage ?? (student as any)?.hasTresorStorage ?? (student as any)?.has_tresor_storage 
  });

  // Top-Level Navigation State
  const [activeMainTab, setActiveMainTab] = useState<'overview' | 'milestones' | 'playlists'>('overview');
  const [shelfMode, setShelfMode] = useState<'years' | 'playlists'>('years');
  const [selectedYearId, setSelectedYearId] = useState<string>('lp_2026_2027');
  const [selectedCustomPlaylistId, setSelectedCustomPlaylistId] = useState<string | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [showChapterList, setShowChapterList] = useState<boolean>(true);
  const [selectedMilestoneVersions, setSelectedMilestoneVersions] = useState<Record<string, string>>({});

  // 2. Audio Player Queue Hook
  const {
    audioRef,
    audioCurrentTime,
    audioDuration,
    audioVolume,
    audioMode,
    switchAudioMode,
    isMiniPlayerPlaying,
    setIsMiniPlayerPlaying,
    isMiniPlayerMuted,
    setIsMiniPlayerMuted,
    isPlayingPlaylist,
    setIsPlayingPlaylist,
    activePlayingId,
    setActivePlayingId,
    playbackQueue,
    currentQueueIndex,
    currentAlbumMeta,
    handlePlayToggle,
    playAlbumQueue,
    startContinuousPlaylist,
    seekMiniPlayer,
    toggleMiniPlayerPlay,
    playPrevInPlaylist,
    playNextInPlaylist,
    formatSeconds,
    calcTracksDurationFormatted,
    isPlayingABComparison,
    abComparisonStage,
    startABComparison,
    resolvePlayableUrl
  } = useAudioPlayerQueue(milestones);

  // 3. Audio Mastering Hook
  const masteringSession = useAudioMasteringSession(student?.instrument || student?.main_instrument);

  // 4. Audio Sharing Hook
  const {
    shareTargetPlaylistId,
    setShareTargetPlaylistId,
    showShareModal,
    setShowShareModal,
    isZipExporting,
    zipProgressText,
    downloadAllTracksAsZip,
    copyToClipboard,
    sharePin,
    setSharePin,
    reRollPin,
    copySuccess,
    copyShareLink,
    shareDesignTheme,
    setShareDesignTheme,
    shareAnonymously,
    setShareAnonymously,
    buildShareUrl
  } = useAudioSharing({
    studentId,
    studentName: student?.first_name,
    schoolName: student?.school_name
  });

  // Modal States
  const [activeSchoolYearFolderModal, setActiveSchoolYearFolderModal] = useState<SchoolYearLP | null>(null);
  const [activeLinerNotesModal, setActiveLinerNotesModal] = useState<{
    title: string;
    subtitle?: string;
    gradient: string;
    tracks: any[];
  } | null>(null);
  const [showPlaylistWizard, setShowPlaylistWizard] = useState<boolean>(false);
  const [activeUploadModalMilestone, setActiveUploadModalMilestone] = useState<MilestoneData | null>(null);
  const [recordingPlaylistId, setRecordingPlaylistId] = useState<string | null>(null);
  const [reflectionMilestone, setReflectionMilestone] = useState<MilestoneData | null>(null);
  const [showDualVersionDownloadModal, setShowDualVersionDownloadModal] = useState<boolean>(false);
  const [dualDownloadTrack, setDualDownloadTrack] = useState<{
    title: string;
    rawUrl?: string;
    masteredUrl?: string;
    masterUrl?: string;
    trackId: string;
  } | null>(null);
  const [editTrackModal, setEditTrackModal] = useState<{
    playlistId: string;
    track: CustomPlaylistTrack;
  } | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    type: 'playlist' | 'track';
    title: string;
    playlistId: string;
    trackId?: string;
  }>({
    isOpen: false,
    type: 'playlist',
    title: '',
    playlistId: ''
  });

  // Junior Modals
  const [showJuniorWizard, setShowJuniorWizard] = useState<boolean>(false);
  const [juniorWizardMilestoneId, setJuniorWizardMilestoneId] = useState<string | null>(null);
  const [juniorWizardPlaylistId, setJuniorWizardPlaylistId] = useState<string | null>(null);
  const [selectedJuniorPlaylistForModal, setSelectedJuniorPlaylistForModal] = useState<CustomPlaylist | null>(null);
  const [showJuniorCreatePlaylistModal, setShowJuniorCreatePlaylistModal] = useState<boolean>(false);
  const [showMasteryCompleteModal, setShowMasteryCompleteModal] = useState<boolean>(false);

  // Active Playlist Tracks resolution
  const activeCustomPlaylist = useMemo(() => {
    return customPlaylists.find((p) => p.id === selectedCustomPlaylistId) || customPlaylists[0] || null;
  }, [customPlaylists, selectedCustomPlaylistId]);

  const safeSchoolYears = useMemo(() => activeSchoolYears || [], [activeSchoolYears]);

  const activePlaylistTracks = useMemo(() => {
    if (shelfMode === 'years') {
      const yearObj = safeSchoolYears.find((y) => y.id === selectedYearId) || safeSchoolYears[0];
      if (!yearObj) return [];
      const yearMilestones = milestones.filter(
        (m) => m.audioUrl && (m.schoolYear === yearObj.year || (yearObj.isCurrent && !m.schoolYear))
      );
      const yearPlaylists = customPlaylists.filter((pl) => pl.createdAt && pl.createdAt.includes(yearObj.year));
      return [
        ...yearMilestones.map((m) => ({
          id: m.id,
          title: m.title,
          subtitle: m.subtitle,
          audioUrl: m.audioUrl!,
          masteredAudioUrl: m.masteredAudioUrl,
          duration: m.duration || 60,
          personalNote: m.personalNote,
          albumTitle: yearObj.title
        })),
        ...yearPlaylists.flatMap((pl) =>
          pl.tracks.map((t) => ({ ...t, albumTitle: pl.title }))
        )
      ];
    }
    return activeCustomPlaylist?.tracks || [];
  }, [shelfMode, selectedYearId, safeSchoolYears, milestones, customPlaylists, activeCustomPlaylist]);

  const selectedYearObj = safeSchoolYears.find((y: SchoolYearLP) => y.id === selectedYearId) || safeSchoolYears[0];
  const currentShelfVibeObj = useMemo(() => {
    if (shelfMode === 'years') {
      return {
        color: selectedYearObj?.accentColor || '#10b981',
        gradient: selectedYearObj?.gradient || 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        title: selectedYearObj?.title || 'Aktuelle Meisterreise',
        subtitle: selectedYearObj?.subtitle || 'Meisterstücke & Soli',
        year: selectedYearObj?.year || '2026/2027',
        tracksCount: activePlaylistTracks.length
      };
    }
    return {
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      title: activeCustomPlaylist?.title || 'Eigene Playlist',
      subtitle: activeCustomPlaylist?.description || 'Custom Album',
      year: activeCustomPlaylist?.createdAt || '2026/2027',
      tracksCount: activeCustomPlaylist?.tracks.length || 0
    };
  }, [shelfMode, selectedYearObj, activePlaylistTracks.length, activeCustomPlaylist]);

  // 💾 Enterprise+ Safe Blob Downloader (Zero CORS / Blob Hydration Engine)
  const triggerBlobDownload = async (url: string, filename: string) => {
    try {
      let downloadUrl = url;
      let revokeNeeded = false;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const resp = await fetch(url);
        const blob = await resp.blob();
        downloadUrl = URL.createObjectURL(blob);
        revokeNeeded = true;
      }
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (revokeNeeded) {
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500);
      }
    } catch (err) {
      console.warn('Fallback direct download:', err);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Download Trigger Handler
  const downloadAudioTrack = async (
    audioUrl?: string,
    masteredAudioUrl?: string,
    title?: string,
    trackId?: string
  ) => {
    if (!audioUrl && !masteredAudioUrl && !trackId) return;
    if (audioUrl && masteredAudioUrl && trackId) {
      setDualDownloadTrack({
        title: title || 'Song-Aufnahme',
        rawUrl: audioUrl,
        masteredUrl: masteredAudioUrl,
        masterUrl: masteredAudioUrl,
        trackId
      });
      setShowDualVersionDownloadModal(true);
      return;
    }
    const safeTitle = (title || 'Song-Aufnahme').replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_');
    const targetUrl = await resolvePlayableUrl(audioUrl, masteredAudioUrl, trackId, masteredAudioUrl ? 'master' : 'raw');
    if (targetUrl) {
      await triggerBlobDownload(targetUrl, `${safeTitle}.wav`);
    }
  };

  // Milestone Actions
  const toggleVisibility = (id: string) => {
    const updated = milestones.map((m) =>
      m.id === id ? { ...m, visibility: (m.visibility === 'private' ? 'teacher_allowed' : 'private') as 'private' | 'teacher_allowed' } : m
    );
    saveMilestones(updated);
  };

  const verifyMilestoneByTeacher = (id: string) => {
    const updated = milestones.map((m) => (m.id === id ? { ...m, isVerified: true } : m));
    saveMilestones(updated);
  };

  // Save Audio Handler from AudioRecordingModal
  const handleSaveAudioRecording = async (params: {
    selectedVersion: 'master' | 'raw';
    reverbRoom: ReverbRoomType;
    reverbWetMix: number;
    customTitle?: string;
    personalNote?: string;
  }) => {
    if (!masteringSession.dualMasteringResult) return;
    const rawBlob = masteringSession.dualMasteringResult.rawBlob || masteringSession.dualMasteringResult.rawNormalizedBlob;
    const masterBlob = masteringSession.dualMasteringResult.masterBlob || masteringSession.dualMasteringResult.masteredBlob;
    const duration = masteringSession.dualMasteringResult.duration ?? masteringSession.dualMasteringResult.durationSec ?? 30;
    if (!rawBlob || !masterBlob) return;
    const now = new Date().toISOString();
    const trackId = `track_${Date.now()}`;

    // Tri-Storage: Save to IndexedDB immediately for instant offline playback
    await storeBlob(`campus_audio_${trackId}_raw`, rawBlob);
    await storeBlob(`campus_audio_${trackId}_master`, masterBlob);

    // Multi-Tenant canonical school ID
    const targetSchoolId = 
      student?.school_id || 
      (student as any)?.schoolId ||
      (window as any).__groovelab_school_id || 
      localStorage.getItem('groovelab_school_id') || 
      localStorage.getItem('campus_school_id') || 
      localStorage.getItem('school_id') ||
      sessionStorage.getItem('groovelab_school_id') ||
      sessionStorage.getItem('groovelab_ghost_school_id') ||
      'global';

    const rawExt = rawBlob.type.includes('wav') ? 'wav' : rawBlob.type.includes('mp4') ? 'm4a' : 'webm';
    const masterExt = masterBlob.type.includes('wav') ? 'wav' : masterBlob.type.includes('mp4') ? 'm4a' : 'webm';

    // Upload to Supabase Storage
    let rawUrl = '';
    let masterUrl = '';
    try {
      const rawPath = buildCanonicalAudioStoragePath({
        schoolId: targetSchoolId,
        studentId,
        category: 'audio_biography',
        trackId: `${trackId}_raw`,
        extension: rawExt
      });
      const masterPath = buildCanonicalAudioStoragePath({
        schoolId: targetSchoolId,
        studentId,
        category: 'audio_biography',
        trackId: `${trackId}_master`,
        extension: masterExt
      });

      await supabase.storage.from('campus-assets').upload(rawPath, rawBlob, { upsert: true });
      await supabase.storage.from('campus-assets').upload(masterPath, masterBlob, { upsert: true });

      rawUrl = await getSecureAudioUrl(rawPath);
      masterUrl = await getSecureAudioUrl(masterPath);
    } catch {
      // Fallback: Blob URLs if storage fails
      rawUrl = URL.createObjectURL(rawBlob);
      masterUrl = URL.createObjectURL(masterBlob);
    }

    if (activeUploadModalMilestone) {
      const updated = milestones.map((m) => {
        if (m.id === activeUploadModalMilestone.id) {
          const currentAsHistory = m.audioUrl
            ? [
                ...(m.history || []),
                {
                  id: `hist_${Date.now()}`,
                  versionNumber: (m.history?.length || 0) + 1,
                  recordedAt: m.recordedAt || now,
                  audioUrl: m.audioUrl,
                  masteredAudioUrl: m.masteredAudioUrl,
                  duration: m.duration
                }
              ]
            : m.history;

          return {
            ...m,
            audioUrl: rawUrl,
            masteredAudioUrl: masterUrl,
            duration: Math.round(duration),
            recordedAt: new Date().toLocaleDateString('de-DE'),
            preferredVersion: params.selectedVersion,
            reverbRoomType: params.reverbRoom,
            reverbWetMix: params.reverbWetMix,
            personalNote: params.personalNote || m.personalNote,
            history: currentAsHistory
          };
        }
        return m;
      });
      saveMilestones(updated);
      setActiveUploadModalMilestone(null);

      // Check if all 10 are now complete
      if (updated.filter((m) => !!m.audioUrl).length === updated.length) {
        setShowMasteryCompleteModal(true);
      }
    } else if (recordingPlaylistId) {
      const newTrack: CustomPlaylistTrack = {
        id: trackId,
        title: params.customTitle?.trim() || `Studio Aufnahme ${new Date().toLocaleDateString('de-DE')}`,
        audioUrl: rawUrl,
        masteredAudioUrl: masterUrl,
        duration: Math.round(duration),
        recordedAt: new Date().toLocaleDateString('de-DE'),
        preferredVersion: params.selectedVersion,
        reverbRoomType: params.reverbRoom,
        reverbWetMix: params.reverbWetMix,
        personalNote: params.personalNote
      };
      const updated = customPlaylists.map((pl) =>
        pl.id === recordingPlaylistId ? { ...pl, tracks: [...pl.tracks, newTrack] } : pl
      );
      savePlaylists(updated);
      setRecordingPlaylistId(null);
    }
  };

  // Junior Save Handler
  const handleJuniorSaveCompleted = (savedData: any) => {
    if (savedData.milestoneId) {
      const updated = milestones.map((m) =>
        m.id === savedData.milestoneId
          ? {
              ...m,
              audioUrl: savedData.audioUrl,
              masteredAudioUrl: savedData.masteredAudioUrl,
              duration: savedData.duration,
              recordedAt: new Date().toLocaleDateString('de-DE')
            }
          : m
      );
      saveMilestones(updated);
      if (updated.filter((m) => !!m.audioUrl).length === updated.length) {
        setShowMasteryCompleteModal(true);
      }
    } else if (savedData.playlistId) {
      const newTrack: CustomPlaylistTrack = {
        id: `track_${Date.now()}`,
        title: savedData.title || `Stück ${new Date().toLocaleDateString('de-DE')}`,
        subtitle: savedData.subtitle || 'Aufnahme',
        audioUrl: savedData.audioUrl,
        masteredAudioUrl: savedData.masteredAudioUrl,
        duration: savedData.duration,
        recordedAt: new Date().toLocaleDateString('de-DE')
      };
      const updated = customPlaylists.map((pl) =>
        pl.id === savedData.playlistId ? { ...pl, tracks: [...pl.tracks, newTrack] } : pl
      );
      savePlaylists(updated);
    }
  };

  // 🛡️ Audio-Tresor Gate Screen
  if (!tresorAccessLoading && !hasAudioTresorStorage) {
    return (
      <div
        style={{
          flex: 1,
          width: '100%',
          padding: isMobileOrSim ? '24px 16px 100px 16px' : '40px 32px 80px 32px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.bg,
          color: colors.textPrimary,
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            maxWidth: '540px',
            width: '100%',
            background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.04)',
            border: `1.5px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '24px',
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: isLight ? '0 10px 30px rgba(0,0,0,0.06)' : '0 10px 30px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '18px'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(217, 119, 6, 0.3)'
            }}
          >
            <Shield size={32} color="#ffffff" />
          </div>

          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 6px 0', color: colors.textPrimary }}>
              Audio-Biografie & Audio-Tresor
            </h2>
            <p style={{ fontSize: '0.85rem', color: colors.textSecondary, margin: 0, lineHeight: 1.5 }}>
              Cloud-Speicher für deine Musikschule erforderlich
            </p>
          </div>

          <div
            style={{
              background: isLight ? '#fffbeb' : 'rgba(217, 119, 6, 0.1)',
              border: `1px solid ${isLight ? '#fde68a' : 'rgba(217, 119, 6, 0.25)'}`,
              borderRadius: '16px',
              padding: '16px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={16} color="#d97706" />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: isLight ? '#92400e' : '#fde68a' }}>
                Funktion ist aktuell nicht freigeschaltet
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: isLight ? '#78350f' : '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
              Die <b>Audio-Biografie</b>, Studio-Playlists und das verlustfreie <b>24-Bit Hi-Res Studio-Mastering</b> stehen deiner Musikschule erst nach Buchung des <b>Audio-Tresor Speicher-Add-ons</b> zur Verfügung.
            </p>
            <p style={{ fontSize: '0.74rem', color: colors.textSecondary, margin: 0, lineHeight: 1.4 }}>
              {isTeacher
                ? '💡 Schulleitung & Verwaltung können den Audio-Tresor im Sekretariats-Dashboard unter "Abrechnung & Cloud-Speicher" jederzeit ab +10 GB aktivieren.'
                : '💡 Bitte wende dich an deine Lehrkraft oder das Sekretariat deiner Musikschule, um den Audio-Tresor zu buchen.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToHub}
            style={{
              width: '100%',
              padding: '12px 20px',
              borderRadius: '14px',
              border: 'none',
              background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)',
              color: colors.textPrimary,
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
          >
            <span>Zurück zu den Modulen</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        width: '100%',
        padding: isMobileOrSim ? '12px 10px 90px 10px' : '16px 24px 40px 24px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        background: isLight ? colors.bg : colors.bgMesh,
        color: colors.textPrimary,
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        boxSizing: 'border-box',
        transition: 'background 0.3s ease, color 0.3s ease'
      }}
    >
      {/* Keyframe animations & CSS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes soundBarPulse {
          0%, 100% { transform: scaleY(0.25); opacity: 0.7; }
          50% { transform: scaleY(1.0); opacity: 1; }
        }
        @keyframes vinylSpin {
          from { transform: rotate(0deg) translateZ(0); }
          to { transform: rotate(360deg) translateZ(0); }
        }
        @keyframes activeStepGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(30, 215, 96, 0.45); }
          50% { box-shadow: 0 0 0 8px rgba(30, 215, 96, 0); }
        }
        @keyframes countInPulse {
          0% { transform: scale(0.6); opacity: 0; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes seasonalGlowPulse {
          0%, 100% {
            transform: translate3d(0, 0, 0);
            box-shadow: 0 0 0 0 rgba(245, 158, 11, 0), 0 4px 14px rgba(0, 0, 0, 0.25);
          }
          50% {
            transform: translate3d(0, -3px, 0);
            box-shadow: 0 6px 24px 3px rgba(245, 158, 11, 0.45), 0 2px 8px rgba(0, 0, 0, 0.15);
          }
        }
        .spotify-card-hover {
          transition: transform 0.26s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.26s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.26s ease, background-color 0.26s ease !important;
        }
        .spotify-card-hover:hover {
          transform: translateY(-4px) !important;
        }
        .spotify-card-hover-light:hover {
          box-shadow: 0 16px 32px -4px rgba(0, 0, 0, 0.10), 0 4px 12px rgba(0, 0, 0, 0.04) !important;
          border-color: rgba(16, 185, 129, 0.35) !important;
          background-color: #ffffff !important;
        }
        .spotify-card-hover-dark:hover {
          box-shadow: 0 18px 36px -4px rgba(0, 0, 0, 0.5), 0 4px 14px rgba(0, 0, 0, 0.3) !important;
          border-color: rgba(255, 255, 255, 0.22) !important;
          background-color: rgba(45, 55, 72, 0.85) !important;
        }
        .spotify-card-hover .spotify-artwork-inner {
          transition: transform 0.34s cubic-bezier(0.16, 1, 0.3, 1) !important;
          will-change: transform;
        }
        .spotify-card-hover:hover .spotify-artwork-inner {
          transform: scale(1.028) !important;
        }
        .spotify-play-btn {
          opacity: 0;
          transform: translateY(6px) scale(0.9);
          transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.15s ease !important;
        }
        .spotify-card-hover:hover .spotify-play-btn {
          opacity: 1 !important;
          transform: translateY(0) scale(1) !important;
        }
        .spotify-play-btn:hover {
          transform: translateY(0) scale(1.08) !important;
          background: #1ed760 !important;
        }
        @media (max-width: 768px), (hover: none) {
          .spotify-play-btn {
            opacity: 0.95 !important;
            transform: translateY(0) scale(1) !important;
          }
        }
      `
        }}
      />

      {/* Top Bar Navigation (Hidden in Junior Mode) */}
      {!isJunior && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {activeMainTab === 'playlists' && (
            <button
              type="button"
              onClick={() => setActiveMainTab('overview')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.16)'}`,
                color: colors.textPrimary,
                padding: '8px 16px',
                borderRadius: '100px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s ease'
              }}
              className="hover-scale"
            >
              <ArrowLeft size={15} color="#10b981" />
              <span>Zurück zur Übersicht</span>
            </button>
          )}

          {/* Center Tabs */}
          {activeMainTab === 'playlists' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', maxWidth: '100%', padding: '2px' }}>
              {customPlaylists.map((otherPl) => {
                const isCur = activeCustomPlaylist ? otherPl.id === activeCustomPlaylist.id : otherPl.id === customPlaylists[0]?.id;
                return (
                  <button
                    key={otherPl.id}
                    type="button"
                    onClick={() => setSelectedCustomPlaylistId(otherPl.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '100px',
                      border: isCur ? '1.5px solid #10b981' : `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.16)'}`,
                      background: isCur ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                      color: isCur ? '#ffffff' : isLight ? '#0f172a' : '#f1f5f9',
                      fontSize: '0.78rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      letterSpacing: '-0.01em'
                    }}
                    className="hover-scale"
                  >
                    <span>{otherPl.title} ({otherPl.tracks.length})</span>
                    {playlistReactions[otherPl.id]?.total > 0 && (
                      <span
                        style={{
                          fontSize: '0.66rem',
                          fontWeight: 900,
                          background: isCur ? 'rgba(255, 255, 255, 0.3)' : isLight ? '#fef3c7' : 'rgba(245, 158, 11, 0.25)',
                          color: isCur ? '#ffffff' : isLight ? '#b45309' : '#fde68a',
                          padding: '1px 6px',
                          borderRadius: '100px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        👏 {playlistReactions[otherPl.id].total}
                      </span>
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setShowPlaylistWizard(true)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '100px',
                  border: `1.5px dashed ${isLight ? '#94a3b8' : 'rgba(255, 255, 255, 0.3)'}`,
                  background: isLight ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.05)',
                  color: isLight ? '#0f172a' : '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap'
                }}
                className="hover-scale"
              >
                <Plus size={13} color="#10b981" />
                <span>Neue</span>
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: isLight ? '#e2e8f0' : 'rgba(0, 0, 0, 0.4)',
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)'}`,
                borderRadius: '100px',
                padding: '4px',
                gap: '4px'
              }}
            >
              <button
                type="button"
                onClick={() => setActiveMainTab('overview')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '100px',
                  border: 'none',
                  background: activeMainTab === 'overview' ? (isLight ? '#ffffff' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)') : 'transparent',
                  color: activeMainTab === 'overview' ? (isLight ? '#0f172a' : '#ffffff') : colors.textSecondary,
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: activeMainTab === 'overview' && isLight ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <Disc size={14} color={activeMainTab === 'overview' ? (isLight ? '#10b981' : '#ffffff') : undefined} />
                <span>Übersicht</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMainTab('milestones')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '100px',
                  border: 'none',
                  background: activeMainTab === 'milestones' ? (isLight ? '#ffffff' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)') : 'transparent',
                  color: activeMainTab === 'milestones' ? (isLight ? '#0f172a' : '#ffffff') : colors.textSecondary,
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: activeMainTab === 'milestones' && isLight ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <Sparkles size={14} color={activeMainTab === 'milestones' ? '#f59e0b' : undefined} />
                <span>Meilensteine (10)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMainTab('playlists')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '100px',
                  border: 'none',
                  background: 'transparent',
                  color: isLight ? '#475569' : '#f1f5f9',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <ListMusic size={14} color="#10b981" />
                <span>Eigene Playlists ({customPlaylists.length})</span>
              </button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeMainTab === 'overview' && (
              <button
                type="button"
                onClick={() => setShowPlaylistWizard(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  color: 'white',
                  padding: '8px 15px',
                  borderRadius: '100px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.2s ease'
                }}
                className="hover-scale"
              >
                <Plus size={15} strokeWidth={2.8} />
                <span>Neue Playlist</span>
              </button>
            )}

            {/* Apple Theme Switcher */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: isLight ? '#e2e8f0' : 'rgba(0, 0, 0, 0.4)',
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)'}`,
                borderRadius: '100px',
                padding: '3px',
                gap: '2px'
              }}
            >
              <button
                type="button"
                onClick={() => toggleTheme('light')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '100px',
                  border: 'none',
                  background: isLight ? '#ffffff' : 'transparent',
                  color: isLight ? '#0f172a' : '#94a3b8',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.12)' : 'none'
                }}
              >
                <Sun size={12} color={isLight ? '#f59e0b' : '#94a3b8'} />
                <span>Hell</span>
              </button>
              <button
                type="button"
                onClick={() => toggleTheme('dark')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '100px',
                  border: 'none',
                  background: !isLight ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                  color: !isLight ? '#ffffff' : '#64748b',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                <Moon size={12} />
                <span>Studio</span>
              </button>
            </div>

            {activeMainTab !== 'playlists' && (
              <button
                onClick={() => setShowShareModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.16)'}`,
                  color: colors.textPrimary,
                  padding: '8px 16px',
                  borderRadius: '100px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                className="hover-scale"
              >
                <Share2 size={14} />
                <span>Teilen</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main View Router */}
      {isJunior ? (
        <JuniorAudioHubView
          milestones={milestones}
          customPlaylists={customPlaylists}
          student={student}
          isLight={isLight}
          isMobileOrSim={isMobileOrSim}
          colors={colors}
          selectedMilestoneVersions={selectedMilestoneVersions}
          setSelectedMilestoneVersions={setSelectedMilestoneVersions}
          activePlayingId={activePlayingId}
          handlePlayToggle={handlePlayToggle}
          onOpenShareModal={() => setShowShareModal(true)}
          onOpenJuniorWizard={(milestoneId, playlistId) => {
            setJuniorWizardMilestoneId(milestoneId);
            setJuniorWizardPlaylistId(playlistId);
            setShowJuniorWizard(true);
          }}
          onOpenCreatePlaylist={() => setShowJuniorCreatePlaylistModal(true)}
          onSelectPlaylistForModal={(pl) => setSelectedJuniorPlaylistForModal(pl)}
          requestDeletePlaylist={(id, title) => {
            setDeleteConfirmModal({
              isOpen: true,
              type: 'playlist',
              title,
              playlistId: id
            });
          }}
          downloadAllTracksAsZip={downloadAllTracksAsZip}
          isZipExporting={isZipExporting}
          zipProgressText={zipProgressText}
        />
      ) : activeMainTab === 'overview' ? (
        <OverviewShelfView
          milestones={milestones}
          customPlaylists={customPlaylists}
          activeSchoolYears={safeSchoolYears}
          nextMilestone={nextMilestone}
          isJunior={isJunior}
          isMobileOrSim={isMobileOrSim}
          isLight={isLight}
          colors={colors}
          isPlayingPlaylist={isPlayingPlaylist}
          isMiniPlayerPlaying={isMiniPlayerPlaying}
          currentAlbumMeta={currentAlbumMeta}
          activeCustomPlaylist={activeCustomPlaylist}
          onOpenCreatePlaylist={() => setShowPlaylistWizard(true)}
          onOpenNextMilestone={(m) => {
            setSelectedMilestoneId(m.id);
            setActiveMainTab('milestones');
          }}
          onOpenCustomPlaylist={(id) => {
            setSelectedCustomPlaylistId(id);
            setActiveMainTab('playlists');
          }}
          onPlayAlbumQueue={playAlbumQueue}
          onOpenSchoolYearFolder={(lp) => setActiveSchoolYearFolderModal(lp)}
          onOpenLinerNotes={(data) => setActiveLinerNotesModal(data)}
          onOpenShareModal={(id) => {
            setShareTargetPlaylistId(id);
            setShowShareModal(true);
          }}
        />
      ) : activeMainTab === 'milestones' ? (
        <MilestonesTimelineView
          milestones={milestones}
          selectedMilestoneId={selectedMilestoneId || milestones[0]?.id || ''}
          setSelectedMilestoneId={setSelectedMilestoneId}
          isLight={isLight}
          isMobileOrSim={isMobileOrSim}
          colors={colors}
          completedCount={milestones.filter((m) => !!m.audioUrl).length}
          progressPercent={Math.round(
            (milestones.filter((m) => !!m.audioUrl).length / (milestones.length || 10)) * 100
          )}
          isAllMilestonesCompleted={isAllMilestonesCompleted}
          activePlayingId={activePlayingId}
          handlePlayToggle={handlePlayToggle}
          formatSeconds={formatSeconds}
          downloadAudioTrack={downloadAudioTrack}
          isTeacher={isTeacher}
          verifyMilestoneByTeacher={verifyMilestoneByTeacher}
          openUploadModal={(ms) => {
            setActiveUploadModalMilestone(ms);
            setRecordingPlaylistId(null);
            masteringSession.resetSession();
          }}
          openReflectionModal={(ms) => setReflectionMilestone(ms)}
          toggleVisibility={toggleVisibility}
          canPlayAB={canPlayAB}
          startABComparison={startABComparison}
          isPlayingABComparison={isPlayingABComparison}
          isPlayingPlaylist={isPlayingPlaylist}
          vinylShelfSlot={
            <VinylShelfView
              colors={colors}
              isLight={isLight}
              shelfMode={shelfMode}
              setShelfMode={setShelfMode}
              effectiveShelfMode={shelfMode}
              customPlaylists={customPlaylists}
              activeSchoolYears={safeSchoolYears}
              selectedYearId={selectedYearId}
              setSelectedYearId={setSelectedYearId}
              selectedCustomPlaylistId={selectedCustomPlaylistId}
              setSelectedCustomPlaylistId={setSelectedCustomPlaylistId}
              isAllMilestonesCompleted={isAllMilestonesCompleted}
              currentShelfVibeObj={currentShelfVibeObj}
              student={student}
              isPlayingPlaylist={isPlayingPlaylist}
              isPlayingABComparison={isPlayingABComparison}
              activePlaylistTracks={activePlaylistTracks}
              milestones={milestones}
              openUploadModal={(ms) => {
                setActiveUploadModalMilestone(ms);
                setRecordingPlaylistId(null);
                masteringSession.resetSession();
              }}
              setActiveUploadModalMilestone={setActiveUploadModalMilestone}
              setRecordingPlaylistId={setRecordingPlaylistId}
              startContinuousPlaylist={startContinuousPlaylist}
              calcTracksDurationFormatted={calcTracksDurationFormatted}
              canPlayAB={canPlayAB}
              startABComparison={startABComparison}
              abComparisonStage={abComparisonStage}
              abRecordedCount={abRecordedCount}
              showChapterList={showChapterList}
              setShowChapterList={setShowChapterList}
              activePlayingId={activePlayingId}
              handlePlayToggle={handlePlayToggle}
              downloadAudioTrack={downloadAudioTrack}
              openEditTrackModal={(plId, track) => setEditTrackModal({ playlistId: plId, track })}
              requestDeleteTrack={(plId, trId, trTitle) => {
                setDeleteConfirmModal({
                  isOpen: true,
                  type: 'track',
                  title: trTitle,
                  playlistId: plId,
                  trackId: trId
                });
              }}
              playlistReactions={playlistReactions}
              onOpenShareModal={() => setShowShareModal(true)}
            />
          }
        />
      ) : (
        <PlaylistsGridView
          activeCustomPlaylist={activeCustomPlaylist}
          customPlaylists={customPlaylists}
          isLight={isLight}
          isMobileOrSim={isMobileOrSim}
          colors={colors}
          student={student}
          isPlayingPlaylist={isPlayingPlaylist}
          currentAlbumMeta={currentAlbumMeta}
          isMiniPlayerPlaying={isMiniPlayerPlaying}
          activePlayingId={activePlayingId}
          calcTracksDurationFormatted={calcTracksDurationFormatted}
          openPlaylistRecordModal={(plId) => {
            setActiveUploadModalMilestone(null);
            setRecordingPlaylistId(plId);
            masteringSession.resetSession();
          }}
          playAlbumQueue={playAlbumQueue}
          onOpenShareModal={(id) => {
            setShareTargetPlaylistId(id);
            setShowShareModal(true);
          }}
          onOpenLinerNotes={(data) => setActiveLinerNotesModal(data)}
          requestDeletePlaylist={(id, title) => {
            setDeleteConfirmModal({
              isOpen: true,
              type: 'playlist',
              title,
              playlistId: id
            });
          }}
          handlePlayToggle={handlePlayToggle}
          openEditTrackModal={(plId, track) => setEditTrackModal({ playlistId: plId, track })}
          downloadAudioTrack={downloadAudioTrack}
          requestDeleteTrack={(plId, trId, trTitle) => {
            setDeleteConfirmModal({
              isOpen: true,
              type: 'track',
              title: trTitle,
              playlistId: plId,
              trackId: trId
            });
          }}
          seekMiniPlayer={seekMiniPlayer}
          audioDuration={audioDuration}
          audioCurrentTime={audioCurrentTime}
          formatSeconds={formatSeconds}
        />
      )}

      {/* Floating Mini-Player */}
      <FloatingMiniPlayer
        activePlayingId={activePlayingId}
        isPlayingPlaylist={isPlayingPlaylist}
        isMiniPlayerPlaying={isMiniPlayerPlaying}
        playbackQueue={playbackQueue}
        currentQueueIndex={currentQueueIndex}
        milestones={milestones}
        customPlaylists={customPlaylists}
        currentAlbumMeta={currentAlbumMeta}
        shelfMode={shelfMode}
        activeCustomPlaylist={activeCustomPlaylist}
        isLight={isLight}
        colors={colors}
        audioCurrentTime={audioCurrentTime}
        audioDuration={audioDuration}
        formatSeconds={formatSeconds}
        seekMiniPlayer={seekMiniPlayer}
        playPrevInPlaylist={playPrevInPlaylist}
        playNextInPlaylist={playNextInPlaylist}
        toggleMiniPlayerPlay={toggleMiniPlayerPlay}
        isMobileOrSim={isMobileOrSim}
        audioMode={audioMode}
        switchAudioMode={switchAudioMode}
        isMiniPlayerMuted={isMiniPlayerMuted}
        setIsMiniPlayerMuted={setIsMiniPlayerMuted}
        audioRef={audioRef}
        audioVolume={audioVolume}
        onCloseMiniPlayer={() => {
          if (audioRef.current) audioRef.current.pause();
          setActivePlayingId(null);
          setIsMiniPlayerPlaying(false);
          setIsPlayingPlaylist(false);
        }}
      />

      {/* Modals */}
      {activeSchoolYearFolderModal && (
        <SchoolYearFolderModal
          lp={activeSchoolYearFolderModal}
          onClose={() => setActiveSchoolYearFolderModal(null)}
          isLight={isLight}
          isMobileOrSim={isMobileOrSim}
          milestones={milestones}
          customPlaylists={customPlaylists}
          activePlayingId={activePlayingId}
          onPlayToggle={handlePlayToggle}
          onPlayAlbumQueue={playAlbumQueue}
        />
      )}

      {activeLinerNotesModal && (
        <LinerNotesModal
          booklet={activeLinerNotesModal}
          onClose={() => setActiveLinerNotesModal(null)}
          student={student}
          isLight={isLight}
        />
      )}

      {showPlaylistWizard && (
        <PlaylistWizardModal
          onClose={() => setShowPlaylistWizard(false)}
          isLight={isLight}
          isMobileOrSim={isMobileOrSim}
          onSavePlaylist={(newPl) => {
            const playlist: CustomPlaylist = {
              ...newPl,
              id: `pl_${Date.now()}`,
              createdAt: '2026/2027',
              tracks: []
            };
            const updated = [playlist, ...customPlaylists];
            savePlaylists(updated);
            setSelectedCustomPlaylistId(playlist.id);
            setActiveMainTab('playlists');
            setShowPlaylistWizard(false);
          }}
        />
      )}

      {(!!activeUploadModalMilestone || !!recordingPlaylistId) && (
        <AudioRecordingModal
          title={activeUploadModalMilestone ? activeUploadModalMilestone.title : (customPlaylists.find((p) => p.id === recordingPlaylistId)?.title || 'Eigene Playlist')}
          subtitle={activeUploadModalMilestone ? (activeUploadModalMilestone.subtitle || 'Meilenstein-Aufnahme') : 'Song aufnehmen'}
          onClose={() => {
            masteringSession.resetRecordingSession();
            setActiveUploadModalMilestone(null);
            setRecordingPlaylistId(null);
          }}
          isLight={isLight}
          isRecording={masteringSession.isRecording}
          countDown={masteringSession.countDown}
          recordSeconds={masteringSession.recordSeconds}
          isProcessingMastering={masteringSession.isProcessingMastering}
          pendingDualResult={masteringSession.pendingDualResult}
          recordingAutoStoppedInfo={masteringSession.recordingAutoStoppedInfo}
          onStartCountIn={masteringSession.triggerRecordingCountIn}
          onStopRecording={masteringSession.stopRecording}
          onResetSession={masteringSession.resetRecordingSession}
          onSaveTrack={async (data) => {
            await handleSaveAudioRecording({
              selectedVersion: data.versionChoice,
              reverbRoom: data.roomType,
              reverbWetMix: data.wetPercent,
              customTitle: data.songTitle,
              personalNote: data.note
            });
            masteringSession.resetRecordingSession();
            setActiveUploadModalMilestone(null);
            setRecordingPlaylistId(null);
          }}
          saveProgress={masteringSession.saveProgress}
          studentName={student?.first_name}
        />
      )}

      {reflectionMilestone && (
        <MilestoneReflectionModal
          milestone={reflectionMilestone}
          onClose={() => setReflectionMilestone(null)}
          isLight={isLight}
          onSaveNote={(note) => {
            const updated = milestones.map((m) =>
              m.id === reflectionMilestone.id ? { ...m, personalNote: note } : m
            );
            saveMilestones(updated);
            setReflectionMilestone(null);
          }}
        />
      )}

      {showShareModal && (
        <ShareModal
          onClose={() => setShowShareModal(false)}
          student={student}
          customPlaylists={customPlaylists}
          sharePin={sharePin}
          onReRollPin={reRollPin}
          onSavePin={setSharePin}
          copySuccess={copySuccess}
          onCopyShareLink={copyShareLink}
          shareTargetPlaylistId={shareTargetPlaylistId}
          onSelectTargetPlaylistId={setShareTargetPlaylistId}
          shareDesignTheme={shareDesignTheme}
          onSelectShareDesignTheme={setShareDesignTheme}
          shareAnonymously={shareAnonymously}
          onToggleShareAnonymously={() => setShareAnonymously((prev) => !prev)}
          buildShareUrl={buildShareUrl}
        />
      )}

      {showDualVersionDownloadModal && dualDownloadTrack && (
        <DualVersionDownloadModal
          track={dualDownloadTrack}
          onClose={() => {
            setShowDualVersionDownloadModal(false);
            setDualDownloadTrack(null);
          }}
          onDownload={async (mode, t) => {
            const safeTitle = (t.title || 'Song-Aufnahme').replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_');
            if (mode === 'master' || mode === 'both') {
              const mUrl = await resolvePlayableUrl(t.rawUrl, t.masteredUrl, t.trackId, 'master');
              if (mUrl) {
                await triggerBlobDownload(mUrl, `${safeTitle}_Master.wav`);
              }
            }
            if (mode === 'raw' || mode === 'both') {
              const rUrl = await resolvePlayableUrl(t.rawUrl, t.masteredUrl, t.trackId, 'raw');
              if (rUrl) {
                await triggerBlobDownload(rUrl, `${safeTitle}_Raw.wav`);
              }
            }
            setShowDualVersionDownloadModal(false);
            setDualDownloadTrack(null);
          }}
          isLight={isLight}
        />
      )}

      {editTrackModal && (
        <TrackEditModal
          trackData={{
            trackId: editTrackModal.track.id,
            title: editTrackModal.track.title,
            artist: editTrackModal.track.subtitle,
            preferredVersion: editTrackModal.track.preferredVersion || 'master',
            reverbRoomType: editTrackModal.track.reverbRoomType || 'warm_livingroom',
            reverbWetMix: editTrackModal.track.reverbWetMix || 8,
            rawUrl: editTrackModal.track.audioUrl,
            masteredUrl: editTrackModal.track.masteredAudioUrl
          }}
          onClose={() => setEditTrackModal(null)}
          onSave={async (updatedData) => {
            let newMasterUrl = editTrackModal.track.masteredAudioUrl;
            // Check if acoustics (reverb room or wet mix) changed and re-master raw audio
            const roomChanged = updatedData.reverbRoomType !== editTrackModal.track.reverbRoomType;
            const wetChanged = updatedData.reverbWetMix !== editTrackModal.track.reverbWetMix;
            if (roomChanged || wetChanged) {
              try {
                let rawBlob: any = await getBlob(`campus_audio_${updatedData.trackId}_raw`);
                if (!rawBlob && editTrackModal.track.audioUrl) {
                  const resp = await fetch(editTrackModal.track.audioUrl);
                  rawBlob = await resp.blob();
                }
                if (rawBlob && rawBlob instanceof Blob) {
                  const reMasterRes = await processStudioMastering(
                    rawBlob, 
                    editTrackModal.track.duration || 30, 
                    {
                      instrumentFamily: student?.instrument || student?.main_instrument,
                      reverbRoom: updatedData.reverbRoomType,
                      reverbWetMix: updatedData.reverbWetMix
                    }
                  );
                  await storeBlob(`campus_audio_${updatedData.trackId}_master`, reMasterRes.masteredBlob);

                  try {
                    const targetSchoolId = 
                      student?.school_id || 
                      (student as any)?.schoolId ||
                      (window as any).__groovelab_school_id || 
                      localStorage.getItem('groovelab_school_id') || 
                      localStorage.getItem('campus_school_id') || 
                      localStorage.getItem('school_id') ||
                      sessionStorage.getItem('groovelab_school_id') ||
                      sessionStorage.getItem('groovelab_ghost_school_id') ||
                      'global';

                    const masterExt = reMasterRes.masteredBlob.type.includes('wav') ? 'wav' : 'webm';
                    const masterPath = buildCanonicalAudioStoragePath({
                      schoolId: targetSchoolId,
                      studentId,
                      category: 'audio_biography',
                      trackId: `${updatedData.trackId}_master`,
                      extension: masterExt
                    });

                    await supabase.storage.from('campus-assets').upload(masterPath, reMasterRes.masteredBlob, { upsert: true });
                    newMasterUrl = await getSecureAudioUrl(masterPath);
                  } catch {
                    newMasterUrl = URL.createObjectURL(reMasterRes.masteredBlob);
                  }
                }
              } catch (err) {
                console.warn('Live re-mastering on track edit failed:', err);
              }
            }

            const updated = customPlaylists.map((pl) =>
              pl.id === editTrackModal.playlistId
                ? {
                    ...pl,
                    tracks: pl.tracks.map((t) =>
                      t.id === updatedData.trackId
                        ? {
                            ...t,
                            title: updatedData.title,
                            subtitle: updatedData.artist,
                            preferredVersion: updatedData.preferredVersion,
                            reverbRoomType: updatedData.reverbRoomType,
                            reverbWetMix: updatedData.reverbWetMix,
                            masteredAudioUrl: newMasterUrl || t.masteredAudioUrl
                          }
                        : t
                    )
                  }
                : pl
            );
            savePlaylists(updated);
            setEditTrackModal(null);
          }}
          isLight={isLight}
          onPreviewToggle={(version) => {
            const url = version === 'master' ? editTrackModal.track.masteredAudioUrl : editTrackModal.track.audioUrl;
            if (url) handlePlayToggle(url, undefined, `preview_${editTrackModal.track.id}_${version}`);
          }}
          previewPlaying={activePlayingId?.includes('preview_') ? (activePlayingId.includes('_master') ? 'master' : 'raw') : null}
        />
      )}

      {deleteConfirmModal.isOpen && (
        <DeleteTrackModal
          target={{
            type: deleteConfirmModal.type,
            id: deleteConfirmModal.type === 'playlist' ? deleteConfirmModal.playlistId : (deleteConfirmModal.trackId || ''),
            title: deleteConfirmModal.title,
            playlistId: deleteConfirmModal.playlistId
          }}
          onClose={() => setDeleteConfirmModal((prev) => ({ ...prev, isOpen: false }))}
          isLight={isLight}
          onConfirm={async () => {
            if (deleteConfirmModal.type === 'playlist') {
              const updated = customPlaylists.filter((p) => p.id !== deleteConfirmModal.playlistId);
              savePlaylists(updated);
              if (selectedCustomPlaylistId === deleteConfirmModal.playlistId) {
                setSelectedCustomPlaylistId(updated[0]?.id || null);
              }
            } else if (deleteConfirmModal.type === 'track' && deleteConfirmModal.trackId) {
              const updated = customPlaylists.map((pl) =>
                pl.id === deleteConfirmModal.playlistId
                  ? {
                      ...pl,
                      tracks: pl.tracks.filter((t) => t.id !== deleteConfirmModal.trackId)
                    }
                  : pl
              );
              savePlaylists(updated);
            }
            setDeleteConfirmModal((prev) => ({ ...prev, isOpen: false }));
          }}
        />
      )}

      {selectedJuniorPlaylistForModal && (
        <JuniorAlbumModal
          playlist={selectedJuniorPlaylistForModal}
          onClose={() => setSelectedJuniorPlaylistForModal(null)}
          isLight={isLight}
          colors={colors}
          student={student}
          studentId={studentId}
          activePlayingId={activePlayingId}
          onPlayToggle={handlePlayToggle}
          onOpenJuniorWizard={(playlistId) => {
            setJuniorWizardMilestoneId(null);
            setJuniorWizardPlaylistId(playlistId);
            setShowJuniorWizard(true);
          }}
          onRequestDeletePlaylist={(id, title) => {
            setDeleteConfirmModal({
              isOpen: true,
              type: 'playlist',
              title,
              playlistId: id
            });
          }}
          onRequestDeleteTrack={(plId, trId, trTitle) => {
            setDeleteConfirmModal({
              isOpen: true,
              type: 'track',
              title: trTitle,
              playlistId: plId,
              trackId: trId
            });
          }}
          copyToClipboard={copyToClipboard}
        />
      )}

      <JuniorCreatePlaylistModal
        isOpen={showJuniorCreatePlaylistModal}
        onClose={() => setShowJuniorCreatePlaylistModal(false)}
        isLight={isLight}
        colors={colors}
        student={student}
        customPlaylists={customPlaylists}
        onSavePlaylists={(updated) => savePlaylists(updated)}
      />

      <MasteryCompleteModal
        isOpen={showMasteryCompleteModal}
        onClose={() => setShowMasteryCompleteModal(false)}
      />

      {showJuniorWizard && (
        <JuniorAudioBiographyWizard
          isOpen={showJuniorWizard}
          student={student}
          milestones={milestones}
          customPlaylists={customPlaylists}
          initialMilestoneId={juniorWizardMilestoneId}
          initialPlaylistId={juniorWizardPlaylistId}
          onClose={() => {
            setShowJuniorWizard(false);
            setJuniorWizardMilestoneId(null);
            setJuniorWizardPlaylistId(null);
          }}
          onSaveCompleted={handleJuniorSaveCompleted}
        />
      )}
    </div>
  );
};
