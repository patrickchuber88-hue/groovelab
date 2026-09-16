import React, { useState, useEffect } from 'react';
import {
  X, Check, BookOpen, Music, Plus, ChevronRight, ChevronDown, ChevronUp, Book, Star,
  Mic, Square, Play, Headphones, Calendar, Clock, ArrowLeft, Edit3, Search, Lock,
  Share2, Sparkles, Filter, HelpCircle, SlidersHorizontal, Users
} from 'lucide-react';
import { harmonizeAudioList, isGenericSongTag } from '../../../utils/audioNamingHelper';
import { checkIsAudioTresorActive } from '../../../domain/stickersAndTresor';
import { shouldDefaultToInputPad } from '../../../utils/instruments';
import { getSimulatedNow } from '../studentDateUtils';
import { parseSongArtistAndTitle, Student } from '../meisterwerk.types';
import { InlineAudioPlayer, MechanicalMetronomeIcon } from './MeisterwerkAudioPlayers';
import { DuettDeckModal } from './DuettDeckModal';

export interface MeisterwerkRecordingsTabProps {
  isTeacherTools?: boolean;
  readOnly?: boolean;
  student: Student;
  activeSongSkills: any[];
  audioDuration: number;
  audioLabel: string;
  audioSongTags: Record<string, string>;
  availablePlaylists: any[];
  availableSongsForTagging: any[];
  expandedStudentAudioWeeks: any;
  expandedTeacherAudioWeeks: any;
  favoriteAudioUrls: string[];
  formatRecordTime: (seconds: number) => string;
  getISOWeek: (date: Date) => string;
  getMonthAlbumTheme: (monthKey: string) => any;
  getNormalizedSongTitle: (title: string) => string;
  handleDeleteNote: (idx: number, url?: string) => void;
  handleDeleteStudentAudio?: (url: string, id?: string, audMeta?: any) => Promise<void> | void;
  handleRenameStudentAudio: (url: string, newTitle: string, id?: string) => void;
  handleRenameTeacherAudio: (url: string, newTitle: string, originalIdx?: number) => void;
  handleSaveEditedTeacherAudio?: (result: { url: string; original_url?: string; duration: number; original_duration?: number; label: string; mode: 'overwrite' | 'duplicate'; is_edited?: boolean; loop_locator?: any }, originalIdx?: number, currentUrl?: string) => Promise<void>;
  handleRevertTeacherAudioToOriginal?: (originalIdx?: number, currentUrl?: string) => Promise<void>;
  handleSaveShareToPlaylist: () => Promise<void>;
  handleUpdateAudioSongTag: (url: string, tag: string | null) => void;
  hasTresorStorage: boolean;
  homeworkNotes: string;
  homeworkNotesList: any[];
  isBookAlbum: (title: string) => boolean;
  isCurrentHomework?: boolean;
  isMobileOrSim: boolean;
  isRecordingAudio: boolean;
  isRecordingMetronomeActive: boolean;
  isRecordingPadActive?: boolean;
  setIsRecordingPadActive?: React.Dispatch<React.SetStateAction<boolean>>;
  isSharingToPlaylist: boolean;
  isStudentWeekExpanded: boolean;
  isTeacherHomeworkExpanded: boolean;
  isTeacherMode: boolean;
  isUploadingAudio: boolean;
  matchesAudioSearch: (item: any, query: string) => boolean;
  mobileRecordingsTab: 'teacher' | 'student';
  newPlaylistTitle: string;
  openHomeworkWeekAccordions: string[];
  playMetronomeTick: (isAccent: boolean) => void;
  progressItems: any[];
  recordingBpm: number;
  recordingMetronomeRef: React.MutableRefObject<any>;
  recordingSearchQuery: string;
  selectedStudentMonth: { key: string; label: string } | null;
  selectedStudentSongAlbum: string | null;
  selectedTeacherMonth: { key: string; label: string } | null;
  selectedTeacherSongAlbum: string | null;
  setAudioLabel: (label: string) => void;
  setIsRecordingMetronomeActive: React.Dispatch<React.SetStateAction<boolean>>;
  setIsStudentWeekExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setIsTeacherHomeworkExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setLocalJuniorRecordingsTrigger: React.Dispatch<React.SetStateAction<number>>;
  setMobileRecordingsTab: (tab: 'teacher' | 'student') => void;
  setNewPlaylistTitle: (title: string) => void;
  setOpenHomeworkWeekAccordions: React.Dispatch<React.SetStateAction<string[]>>;
  setRecordingBpm: React.Dispatch<React.SetStateAction<number>>;
  setSelectedStudentMonth: (month: { key: string; label: string } | null) => void;
  setSelectedStudentSongAlbum: (album: string | null) => void;
  setSelectedTeacherMonth: (month: { key: string; label: string } | null) => void;
  setSelectedTeacherSongAlbum: (album: string | null) => void;
  setShareAudioModal: (modal: any) => void;
  setShareCustomTitle: (title: string) => void;
  setSharePlaylistId: (id: string) => void;
  setShareProcessing: React.Dispatch<React.SetStateAction<'raw' | 'master'>>;
  setShowNewPlaylistInput: (show: boolean) => void;
  setShowRecordingMetronomePopup: React.Dispatch<React.SetStateAction<boolean>>;
  setShowStudentFavoritesOnly: React.Dispatch<React.SetStateAction<boolean>>;
  setShowTeacherFavoritesOnly: React.Dispatch<React.SetStateAction<boolean>>;
  setShowTeacherHomeworkArchive: React.Dispatch<React.SetStateAction<boolean>>;
  shareAudioModal: any;
  shareCustomTitle: string;
  sharePlaylistId: string;
  shareProcessing: 'raw' | 'master';
  showNewPlaylistInput: boolean;
  showRecordingMetronomePopup: boolean;
  showStudentFavoritesOnly: boolean;
  showTeacherFavoritesOnly: boolean;
  showTeacherHomeworkArchive: boolean;
  songs: any[];
  startRecordingAudio: (overrideSongId?: string | React.MouseEvent | any, overrideLabel?: string, isMasterworkSong?: boolean) => void | Promise<void>;
  stopRecordingAudio: () => void;
  recordCountInRemaining?: number | null;
  cancelActiveRecordCountIn?: () => void;
  justRecordedAudioUrl?: string | null;
  justRecordedAudioLabel?: string | null;
  studentFirstName: string;
  toggleFavoriteAudio: (url: string) => void;
  toggleStudentAudioWeek: (weekKey: string, force?: boolean) => void;
  toggleTeacherAudioWeek: (weekKey: string, force?: boolean) => void;
  topicName: string;
  useNotebookLayout: boolean;
}

export function MeisterwerkRecordingsTab(props: MeisterwerkRecordingsTabProps) {
  const {
    isTeacherTools,
    readOnly,
    student,
    activeSongSkills,
    audioDuration,
    audioLabel,
    audioSongTags,
    availablePlaylists,
    availableSongsForTagging,
    expandedStudentAudioWeeks,
    expandedTeacherAudioWeeks,
    favoriteAudioUrls,
    formatRecordTime,
    getISOWeek,
    getMonthAlbumTheme,
    getNormalizedSongTitle,
    handleDeleteNote,
    handleDeleteStudentAudio,
    handleRenameStudentAudio,
    handleRenameTeacherAudio,
    handleSaveEditedTeacherAudio,
    handleRevertTeacherAudioToOriginal,
    handleSaveShareToPlaylist,
    handleUpdateAudioSongTag,
    hasTresorStorage,
    homeworkNotes,
    homeworkNotesList,
    isBookAlbum,
    isCurrentHomework,
    isMobileOrSim,
    isRecordingAudio,
    isRecordingMetronomeActive,
    isRecordingPadActive,
    setIsRecordingPadActive,
    isSharingToPlaylist,
    isStudentWeekExpanded,
    isTeacherHomeworkExpanded,
    isTeacherMode,
    isUploadingAudio,
    matchesAudioSearch,
    mobileRecordingsTab,
    newPlaylistTitle,
    openHomeworkWeekAccordions,
    playMetronomeTick,
    progressItems,
    recordingBpm,
    recordingMetronomeRef,
    recordingSearchQuery,
    selectedStudentMonth,
    selectedStudentSongAlbum,
    selectedTeacherMonth,
    selectedTeacherSongAlbum,
    setAudioLabel,
    setIsRecordingMetronomeActive,
    setIsStudentWeekExpanded,
    setIsTeacherHomeworkExpanded,
    setLocalJuniorRecordingsTrigger,
    setMobileRecordingsTab,
    setNewPlaylistTitle,
    setOpenHomeworkWeekAccordions,
    setRecordingBpm,
    setSelectedStudentMonth,
    setSelectedStudentSongAlbum,
    setSelectedTeacherMonth,
    setSelectedTeacherSongAlbum,
    setShareAudioModal,
    setShareCustomTitle,
    setSharePlaylistId,
    setShareProcessing,
    setShowNewPlaylistInput,
    setShowRecordingMetronomePopup,
    setShowStudentFavoritesOnly,
    setShowTeacherFavoritesOnly,
    setShowTeacherHomeworkArchive,
    shareAudioModal,
    shareCustomTitle,
    sharePlaylistId,
    shareProcessing,
    showNewPlaylistInput,
    showRecordingMetronomePopup,
    showStudentFavoritesOnly,
    showTeacherFavoritesOnly,
    showTeacherHomeworkArchive,
    songs,
    startRecordingAudio,
    stopRecordingAudio,
    recordCountInRemaining,
    cancelActiveRecordCountIn,
    justRecordedAudioUrl,
    justRecordedAudioLabel,
    studentFirstName,
    toggleFavoriteAudio,
    toggleStudentAudioWeek,
    toggleTeacherAudioWeek,
    topicName,
    useNotebookLayout
  } = props;

  // 🎛️ Instrumenten-PAD State (-6 dB Dämpfung für dynamikstarke Instrumente / Slap-Transienten)
  const [localPadActive, setLocalPadActive] = useState<boolean>(() => shouldDefaultToInputPad(props.student));
  const effectivePadActive = isRecordingPadActive !== undefined ? isRecordingPadActive : localPadActive;
  const handleTogglePad = () => {
    if (setIsRecordingPadActive) {
      setIsRecordingPadActive(prev => !prev);
    } else {
      setLocalPadActive(prev => !prev);
    }
  };

  const [duettModalData, setDuettModalData] = useState<{
    teacherUrl: string;
    teacherTitle: string;
    teacherBpm?: number;
    songTag?: string;
  } | null>(null);

  const [localRecordingsRevision, setLocalRecordingsRevision] = useState(0);
  const [selectedPracticeCompanionAlbum, setSelectedPracticeCompanionAlbum] = useState<boolean>(false);
  const [selectedDuettAlbum, setSelectedDuettAlbum] = useState<boolean>(false);
  const [selectedPracticeStyleFilter, setSelectedPracticeStyleFilter] = useState<string>('all');

  useEffect(() => {
    const handleRecordingsChange = () => {
      setLocalRecordingsRevision(p => p + 1);
    };

    window.addEventListener('campus_junior_recordings_updated', handleRecordingsChange);
    window.addEventListener('campus-recordings-updated', handleRecordingsChange);
    window.addEventListener('storage', handleRecordingsChange);

    return () => {
      window.removeEventListener('campus_junior_recordings_updated', handleRecordingsChange);
      window.removeEventListener('campus-recordings-updated', handleRecordingsChange);
      window.removeEventListener('storage', handleRecordingsChange);
    };
  }, []);

  return (
            <div style={{
              display: 'flex',
              flexDirection: isMobileOrSim ? 'column' : 'row',
              width: '100%',
              height: '100%',
              minHeight: 0,
              overflow: isMobileOrSim ? 'auto' : 'hidden'
            }}>
              {/* 44px Segmented Capsule Touch Switcher for Mobile */}
              {isMobileOrSim && !isTeacherTools && (
                <div style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '8px 16px',
                  background: '#ffffff',
                  borderBottom: '1px solid #e2e8f0',
                  flexShrink: 0,
                  zIndex: 35
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#f1f5f9',
                    borderRadius: '100px',
                    padding: '3px',
                    width: '100%',
                    maxWidth: '380px',
                    height: '44px',
                    boxSizing: 'border-box',
                    gap: '4px'
                  }}>
                    <button
                      type="button"
                      onClick={() => setMobileRecordingsTab('teacher')}
                      style={{
                        flex: 1,
                        height: '38px',
                        borderRadius: '100px',
                        border: 'none',
                        background: mobileRecordingsTab === 'teacher' ? '#ffffff' : 'transparent',
                        color: mobileRecordingsTab === 'teacher' ? '#15803d' : '#64748b',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        boxShadow: mobileRecordingsTab === 'teacher' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    >
                      <Mic size={14} color={mobileRecordingsTab === 'teacher' ? '#15803d' : '#64748b'} />
                      <span>Vom Unterricht</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMobileRecordingsTab('student')}
                      style={{
                        flex: 1,
                        height: '38px',
                        borderRadius: '100px',
                        border: 'none',
                        background: mobileRecordingsTab === 'student' ? '#ffffff' : 'transparent',
                        color: mobileRecordingsTab === 'student' ? '#6d28d9' : '#64748b',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        boxShadow: mobileRecordingsTab === 'student' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    >
                      <Star size={14} color={mobileRecordingsTab === 'student' ? '#6d28d9' : '#64748b'} fill={mobileRecordingsTab === 'student' ? '#6d28d9' : 'none'} />
                      <span>Dein Übe-Studio</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* LEFT PAGE: 🎙️ AUFNAHMEN VOM LEHRER (Play-Alongs & Unterrichts-Audios)     */}
              {/* ========================================================================= */}
              <div style={{
                flex: isMobileOrSim ? 'none' : (isTeacherTools ? '1 1 100%' : '1 1 50%'),
                minWidth: 0,
                width: isMobileOrSim ? '100%' : undefined,
                display: isMobileOrSim ? (mobileRecordingsTab === 'teacher' || isTeacherTools ? 'flex' : 'none') : 'flex',
                overflowY: 'auto',
                flexDirection: 'column',
                background: useNotebookLayout ? '#faf8f2' : '#ffffff',
                borderRadius: isTeacherTools ? '0 0 20px 20px' : (useNotebookLayout ? '0 0 0 20px' : '0'),
                boxShadow: useNotebookLayout ? '-10px 10px 20px rgba(0,0,0,0.15)' : 'none',
                borderRight: isTeacherTools || isMobileOrSim ? 'none' : (useNotebookLayout ? '1px dashed #e5e0d4' : '1px solid #e8e8ed'),
                padding: isMobileOrSim ? '20px 16px var(--mobile-scroll-clearance-bottom, calc(96px + env(safe-area-inset-bottom, 20px))) 16px' : '24px 20px'
              }}>
                {useNotebookLayout && !isTeacherTools && (
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    bottom: '20px',
                    right: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-around',
                    zIndex: 25
                  }}>
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div key={idx} style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#121214',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)'
                      }} />
                    ))}
                  </div>
                )}
                
                {/* Header: Teacher Recordings */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #e6f4ea 0%, #d1fae5 100%)',
                      color: '#15803d',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(52, 168, 83, 0.18)',
                      flexShrink: 0
                    }}>
                      <Mic size={22} strokeWidth={2.4} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Vom Unterricht
                      </span>
                      <h3 style={{ margin: '1px 0 0 0', fontSize: '1.18rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                        {isTeacherMode ? `Unterrichts-Aufnahmen & Play-Alongs für ${studentFirstName}` : 'Aufnahmen von deiner Lehrkraft'}
                      </h3>
                    </div>
                  </div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    background: '#ffffff',
                    border: '1px solid #bbf7d0',
                    borderRadius: '100px',
                    fontSize: '0.68rem',
                    color: '#15803d',
                    fontWeight: 750,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    <span>👨‍🏫 Lehrkraft-Spuren</span>
                  </div>
                </div>

                {/* Teacher Record Tool (when teacher is viewing) */}
                {isTeacherMode && (
                  <div style={{
                    margin: '0 0 16px 0',
                    padding: '12px 14px',
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.80rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🎙️ Neue Lehrkraft-Aufnahme</span>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 650 }}>
                          {hasTresorStorage ? '(max. 7 Min.)' : '(max. 60s)'}
                        </span>
                      </span>
                      {!isRecordingAudio ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                          {/* 🎛️ Instrumenten-PAD Button (-6 dB Dämpfung für Slap/Percussion) */}
                          <button
                            type="button"
                            onClick={handleTogglePad}
                            aria-label={effectivePadActive ? "Instrumenten-PAD aktiv (-6 dB Headroom-Dämpfung)" : "Instrumenten-PAD inaktiv (Standard 0 dB)"}
                            title={effectivePadActive ? "PAD aktiv: -6 dB Headroom für dynamikstarke Instrumente / Slap-Gitarre" : "PAD: -6 dB Headroom-Dämpfung zuschalten"}
                            style={{
                              background: effectivePadActive ? '#0f172a' : '#f8fafc',
                              border: effectivePadActive ? '1.5px solid #0f172a' : '1.5px solid #cbd5e1',
                              color: effectivePadActive ? '#ffffff' : '#64748b',
                              borderRadius: '10px',
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              flexShrink: 0,
                              boxShadow: effectivePadActive ? '0 2px 8px rgba(15, 23, 42, 0.25)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                            className="hover-scale-mini"
                          >
                            <SlidersHorizontal size={15} color={effectivePadActive ? '#ffffff' : '#64748b'} strokeWidth={effectivePadActive ? 2.4 : 2} />
                          </button>

                          {/* ⏱️ Metronom / Klick Button */}
                          <button
                            type="button"
                            onClick={() => setShowRecordingMetronomePopup(prev => !prev)}
                            style={{
                              background: isRecordingMetronomeActive ? '#dcfce7' : '#f8fafc',
                              border: isRecordingMetronomeActive ? '1.5px solid #16a34a' : '1.5px solid #cbd5e1',
                              color: isRecordingMetronomeActive ? '#15803d' : '#64748b',
                              borderRadius: '10px',
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              flexShrink: 0,
                              boxShadow: isRecordingMetronomeActive ? '0 2px 8px rgba(22, 163, 74, 0.25)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                            className="hover-scale-mini"
                            title={isRecordingMetronomeActive ? `Klick aktiv (${recordingBpm} BPM)` : 'Klick / Metronom einstellen'}
                          >
                            <MechanicalMetronomeIcon size={16} color={isRecordingMetronomeActive ? '#15803d' : '#64748b'} strokeWidth={isRecordingMetronomeActive ? 2.4 : 2} />
                          </button>

                          {/* Metronome Flyout Popup */}
                          {showRecordingMetronomePopup && (
                            <div 
                              ref={recordingMetronomeRef}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '8px',
                                background: '#ffffff',
                                borderRadius: '16px',
                                border: '1.5px solid #cbd5e1',
                                boxShadow: '0 16px 36px -4px rgba(15, 23, 42, 0.22), 0 4px 12px rgba(0,0,0,0.08)',
                                padding: '12px 14px',
                                width: '260px',
                                zIndex: 1000,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                              }}
                            >
                              {/* Header */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.80rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <MechanicalMetronomeIcon size={16} color="#16a34a" strokeWidth={2.2} />
                                  <span>Klick / Metronom</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setShowRecordingMetronomePopup(false)}
                                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                  title="Schließen"
                                >
                                  <X size={14} />
                                </button>
                              </div>

                              {/* Toggle Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const next = !isRecordingMetronomeActive;
                                  setIsRecordingMetronomeActive(next);
                                  if (next) playMetronomeTick(true);
                                }}
                                style={{
                                  width: '100%',
                                  background: isRecordingMetronomeActive ? '#16a34a' : '#f1f5f9',
                                  color: isRecordingMetronomeActive ? '#ffffff' : '#475569',
                                  border: 'none',
                                  borderRadius: '10px',
                                  padding: '7px 10px',
                                  fontSize: '0.76rem',
                                  fontWeight: 850,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  boxShadow: isRecordingMetronomeActive ? '0 2px 8px rgba(22, 163, 74, 0.25)' : 'none'
                                }}
                                className="hover-scale-mini"
                              >
                                <span>{isRecordingMetronomeActive ? '✓ Klick ist AN' : 'Klick einschalten'}</span>
                              </button>

                              {/* BPM Slider & Stepper */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>
                                  <span>Tempo</span>
                                  <span style={{ color: '#16a34a', fontWeight: 900 }}>{recordingBpm} BPM</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setRecordingBpm(b => Math.max(40, b - 5))}
                                    style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', width: '26px', height: '26px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="-5 BPM"
                                  >-5</button>
                                  <button
                                    type="button"
                                    onClick={() => setRecordingBpm(b => Math.max(40, b - 1))}
                                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', width: '22px', height: '26px', fontWeight: 850, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="-1 BPM"
                                  >-</button>
                                  <input
                                    type="range"
                                    min="40"
                                    max="240"
                                    value={recordingBpm}
                                    onChange={(e) => setRecordingBpm(parseInt(e.target.value, 10))}
                                    style={{ flex: 1, accentColor: '#16a34a', cursor: 'pointer' }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setRecordingBpm(b => Math.min(240, b + 1))}
                                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', width: '22px', height: '26px', fontWeight: 850, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="+1 BPM"
                                  >+</button>
                                  <button
                                    type="button"
                                    onClick={() => setRecordingBpm(b => Math.min(240, b + 5))}
                                    style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', width: '26px', height: '26px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="+5 BPM"
                                  >+5</button>
                                </div>
                              </div>

                              {/* Test Click Button */}
                              <button
                                type="button"
                                onClick={() => playMetronomeTick(true)}
                                style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', color: '#64748b', borderRadius: '8px', padding: '6px', fontSize: '0.68rem', fontWeight: 750, cursor: 'pointer' }}
                                className="hover-scale-mini"
                              >
                                🔊 Klick kurz testen
                              </button>
                            </div>
                          )}

                          {recordCountInRemaining !== null && recordCountInRemaining !== undefined ? (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: '#fef2f2',
                              border: '1.5px solid #f87171',
                              borderRadius: '10px',
                              padding: '4px 10px',
                              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)'
                            }}>
                              <span style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: '#ef4444',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 950,
                                fontSize: '0.80rem'
                              }}>
                                {recordCountInRemaining}
                              </span>
                              <span style={{ fontSize: '0.72rem', fontWeight: 850, color: '#991b1b' }}>
                                Einzählen ({isRecordingMetronomeActive && recordingBpm ? `${recordingBpm} BPM` : '100 BPM'})
                              </span>
                              {cancelActiveRecordCountIn && (
                                <button
                                  type="button"
                                  onClick={cancelActiveRecordCountIn}
                                  style={{
                                    background: '#ffffff',
                                    border: '1px solid #fca5a5',
                                    borderRadius: '6px',
                                    color: '#b91c1c',
                                    cursor: 'pointer',
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    padding: '2px 6px'
                                  }}
                                  title="Einzählen abbrechen"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={startRecordingAudio}
                              disabled={isUploadingAudio}
                              style={{
                                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                color: '#fff',
                                border: 'none',
                                padding: '6px 14px',
                                borderRadius: '10px',
                                fontSize: '0.74rem',
                                fontWeight: 850,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.25)'
                              }}
                              className="hover-scale"
                            >
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ffffff', display: 'inline-block' }} />
                              <span>Aufnahme starten</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => stopRecordingAudio()}
                          style={{
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '10px',
                            fontSize: '0.74rem',
                            fontWeight: 850,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                          }}
                          className="hover-scale"
                        >
                          <span style={{ width: '7px', height: '7px', background: '#ffffff', display: 'inline-block' }} />
                          <span>Stopp ({hasTresorStorage ? `${formatRecordTime(audioDuration)} / 7:00 Min.` : `${audioDuration}s / 60s`})</span>
                        </button>
                      )}
                    </div>
                    
                    {!isRecordingAudio ? (
                      <input
                        type="text"
                        placeholder="Titel der Aufnahme (z. B. Song-Teil A langsam üben)..."
                        value={audioLabel}
                        onChange={(e) => setAudioLabel(e.target.value)}
                        style={{
                          width: '100%',
                          fontSize: '0.80rem',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: '1.5px solid #cbd5e1',
                          background: '#fff',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        fontSize: '0.80rem',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1.5px dashed #fecdd3',
                        background: '#fef2f2',
                        color: '#991b1b',
                        fontWeight: 750,
                        boxSizing: 'border-box',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                        <span>{audioLabel ? `Aufnahme: „${audioLabel}“` : 'Aufnahme ohne Titel...'}</span>
                      </div>
                    )}

                    {justRecordedAudioLabel && !isRecordingAudio && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                        border: '1.5px solid #86efac',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        color: '#15803d',
                        fontSize: '0.78rem',
                        fontWeight: 900,
                        boxShadow: '0 2px 8px rgba(22, 163, 74, 0.15)'
                      }}>
                        <span style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: '#16a34a',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Check size={13} strokeWidth={3} />
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Take gesichert: „{justRecordedAudioLabel}“ 🎉
                        </span>
                      </div>
                    )}

                    {isUploadingAudio && (
                      <div style={{ fontSize: '0.74rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                        <span>⏳</span> Audio wird gesichert und zur Schüler-Übersicht hinzugefügt...
                      </div>
                    )}
                  </div>
                )}

                {/* Teacher Recordings Gallery with Weekly Accordions & Song-Alben */}
                {(() => {
                  // Collect ALL teacher audios from homeworkNotesList, local storage, progressItems, and song notes
                  const rawAudioItems: { str: string; originalIdx: number; isCurrentHomework?: boolean; songTag?: string }[] = [];

                  const extractAudios = (sourceText: string, defaultIsCurrent: boolean, defaultSongTag?: string, origIdx = -1) => {
                    if (!sourceText || typeof sourceText !== 'string' || !sourceText.includes('AUDIO:')) return;
                    let toScan: string[] = [];
                    try {
                      const parsed = JSON.parse(sourceText);
                      if (Array.isArray(parsed)) {
                        toScan = parsed.filter(x => typeof x === 'string' && x.includes('AUDIO:'));
                      } else if (typeof parsed === 'string' && parsed.includes('AUDIO:')) {
                        toScan = [parsed];
                      }
                    } catch {
                      toScan = [sourceText];
                    }

                    toScan.forEach(str => {
                      const chunks = str.split('AUDIO:');
                      chunks.forEach((chunk, cIdx) => {
                        if (cIdx === 0 && !str.startsWith('AUDIO:')) return;
                        if (!chunk.trim()) return;
                        const firstDelim = chunk.search(/[\n\r"\]]/);
                        const audioContent = firstDelim !== -1 ? chunk.substring(0, firstDelim) : chunk;
                        rawAudioItems.push({
                          str: 'AUDIO:' + audioContent.trim(),
                          originalIdx: origIdx,
                          isCurrentHomework: defaultIsCurrent,
                          songTag: defaultSongTag
                        });
                      });
                    });
                  };

                  // 1. Current active homework notes list
                  (homeworkNotesList || []).forEach((note, idx) => {
                    extractAudios(String(note || ''), true, undefined, idx);
                  });

                  // 2. Local storage homework notes across all candidate student IDs
                  try {
                    const candidateStudentIds = Array.from(new Set([
                      student?.id,
                      (student as any)?.student_id,
                      (student as any)?.studentId,
                      (student as any)?.canonical_uuid,
                      (student as any)?.slot_id
                    ].filter(Boolean))) as string[];

                    candidateStudentIds.forEach(stdId => {
                      const localGen = localStorage.getItem(`campus_homework_notes_${stdId}`);
                      if (localGen) extractAudios(localGen, true);

                      // 2b. Local storage dedicated teacher audio vault
                      const localVault = localStorage.getItem(`campus_teacher_audio_vault_${stdId}`);
                      if (localVault) {
                        extractAudios(localVault, true);
                      }
                    });
                  } catch {}

                  // 3. Scan progressItems across all lessons/history
                  (progressItems || []).forEach((pItem) => {
                    const isHw = Boolean(pItem.is_current_homework || (pItem.topic_name && pItem.topic_name.startsWith('Hausaufgabe KW ')));
                    let songTag: string | undefined = undefined;
                    if (pItem.topic_name && !pItem.topic_name.startsWith('Hausaufgabe KW ') && !pItem.topic_name.startsWith('Allgemein')) {
                      songTag = getNormalizedSongTitle(pItem) || pItem.topic_name.replace(/\s*\([^)]*\)\s*$/, '').trim();
                    }
                    if (pItem.homework_notes) {
                      extractAudios(pItem.homework_notes, isHw, songTag);
                    }
                  });

                  // 4. Scan activeSongSkills and localStorage song notes (song_note_${student.id}_*)
                  try {
                    (activeSongSkills || []).forEach(skill => {
                      const songArtist = skill.songs?.artist || skill.artist || '';
                      const songTitleOnly = skill.songs?.title || skill.title || skill.song_title || 'Song';
                      const fullSongTitle = songArtist ? `${songArtist} - ${songTitleOnly}` : songTitleOnly;
                      const isHw = localStorage.getItem(`song_hw_${student?.id}_${skill.id}`) === 'true' ||
                                   localStorage.getItem(`song_hw_${student?.id}_${skill.song_id}`) === 'true' ||
                                   Boolean(skill.is_current_homework);

                      const cachedNote = localStorage.getItem(`song_note_${student?.id}_${skill.id}`) ||
                                         localStorage.getItem(`song_note_${student?.id}_${skill.song_id}`) ||
                                         skill.homework_notes ||
                                         skill.teacher_notes ||
                                         '';
                      if (cachedNote) {
                        extractAudios(cachedNote, isHw, fullSongTitle);
                      }
                    });

                    // Scan all keys in localStorage matching song_note_
                    if (typeof window !== 'undefined' && student?.id) {
                      for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        if (k && k.startsWith(`song_note_${student.id}_`)) {
                          const val = localStorage.getItem(k);
                          if (val && val.includes('AUDIO:')) {
                            const suffix = k.replace(`song_note_${student.id}_`, '');
                            const matchingSkill = (activeSongSkills || []).find(s => s.id === suffix || s.song_id === suffix);
                            const matchingItem = (progressItems || []).find(p => p.id === suffix || (p as any).song_id === suffix);
                            const songTag = matchingSkill
                              ? (matchingSkill.songs?.title ? `${matchingSkill.songs?.artist ? matchingSkill.songs.artist + ' - ' : ''}${matchingSkill.songs.title}` : matchingSkill.title)
                              : (matchingItem?.topic_name ? matchingItem.topic_name.replace(/\s*\([^)]*\)\s*$/, '').trim() : undefined);
                            const isHw = (localStorage.getItem(`song_hw_${student.id}_${suffix}`) === 'true') ||
                                         Boolean(matchingSkill?.is_current_homework) ||
                                         Boolean(matchingItem?.is_current_homework);
                            extractAudios(val, isHw, songTag);
                          }
                        }
                      }
                    }
                  } catch {}

                  // 5. Scan Lehrwerke book page notes (from progressItems & localStorage)
                  try {
                    (progressItems || []).forEach((item: any) => {
                      if (item.topic_name && item.topic_name.includes(' - Seite ')) {
                        const pNotes = item.homework_notes || item.teacher_notes;
                        if (pNotes && typeof pNotes === 'string' && pNotes.includes('AUDIO:')) {
                          extractAudios(pNotes, Boolean(item.is_current_homework), item.topic_name.replace(/\s*\([^)]*\)\s*$/, '').trim());
                        }
                      }
                    });

                    const lehrwerkeKey = `campus_lehrwerke_progress_${student?.id}`;
                    const storedLw = (student?.id && localStorage.getItem(lehrwerkeKey)) || localStorage.getItem('student_lehrwerke_progress');
                    if (storedLw) {
                      const parsedLw = JSON.parse(storedLw);
                      if (parsedLw && typeof parsedLw === 'object') {
                        Object.entries(parsedLw).forEach(([bKey, bVal]: [string, any]) => {
                          if (bVal?.pageStates) {
                            Object.entries(bVal.pageStates).forEach(([pNum, pState]: [string, any]) => {
                              const pNotes = pState?.homeworkNotes || pState?.homework_notes;
                              if (pNotes && typeof pNotes === 'string' && pNotes.includes('AUDIO:')) {
                                extractAudios(pNotes, true, `${bVal.title || bKey} • S. ${pNum}`);
                              }
                            });
                          }
                        });
                      }
                    }
                  } catch {}

                  const teacherAudios: any[] = [];
                  const seenTeacherKeys = new Set<string>();

                  rawAudioItems.forEach((item, rIdx) => {
                    const cleanStr = item.str.replace(/[\[\]"]/g, '');
                    const audioIndex = cleanStr.indexOf('AUDIO:');
                    if (audioIndex === -1) return;
                    const parts = cleanStr.substring(audioIndex + 6).split('|');
                    const url = parts[0]?.trim() || '';
                    const duration = parseInt(parts[1] || '0', 10);
                    const date = parts[2]?.trim() || new Date().toISOString();
                    const label = parts[3]?.trim() || `Aufnahme #${teacherAudios.length + 1}`;
                    const author = parts[4]?.trim() || 'teacher';

                    const tagInParts = parts[7]?.trim();
                    const rawSongTag = item.songTag || (tagInParts && tagInParts !== '' ? tagInParts : undefined);
                    const songTag = audioSongTags[url] !== undefined ? (audioSongTags[url] || undefined) : rawSongTag;

                    const isCustomTitle = parts[8]?.trim() === 'custom';
                    const originalUrl = parts[9]?.trim() || undefined;
                    const originalDuration = parseInt(parts[10] || '0', 10) || undefined;
                    const bpmPart = parts.find(p => typeof p === 'string' && p.trim().startsWith('BPM:'));
                    const metronomeBpm = bpmPart ? parseInt(bpmPart.trim().replace('BPM:', ''), 10) : undefined;

                    // Robust collision-free key
                    const uniqueKey = parts[6] || (url && url !== '#' && url.length > 8 ? url : null) || `teacher_rec_${item.originalIdx >= 0 ? item.originalIdx : rIdx}_${label}_${duration}_${date}_${songTag || 'notag'}`;
                    if (seenTeacherKeys.has(uniqueKey)) return;

                    seenTeacherKeys.add(uniqueKey);
                    teacherAudios.push({
                      url,
                      duration,
                      date,
                      label,
                      originalIdx: item.originalIdx,
                      isCurrentHomework: item.isCurrentHomework,
                      songTag,
                      isCustomTitle,
                      originalUrl,
                      originalDuration,
                      metronomeBpm
                    });
                  });

                  // 🎯 Intelligente, eindeutige & harmonisierte Benennung (Goldstandard: [Thema] • [Datum] [#[Nr]])
                  const harmonizedTeacherAudios = harmonizeAudioList(teacherAudios, true, topicName);
                  teacherAudios.length = 0;
                  harmonizedTeacherAudios.forEach(aud => {
                    aud.label = aud.harmonizedTitle;
                    teacherAudios.push(aud);
                  });

                  // 🛡️ Deterministische Sortierung (Neueste Aufnahme IMMER ganz oben)
                  teacherAudios.sort((a, b) => {
                    const timeA = a.date ? new Date(a.date).getTime() : 0;
                    const timeB = b.date ? new Date(b.date).getTime() : 0;
                    return timeB - timeA;
                  });

                  if (teacherAudios.length === 0) {
                    return (
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        padding: '40px 20px',
                        gap: '12px',
                        textAlign: 'center',
                        background: '#f8fafc',
                        borderRadius: '20px',
                        border: '1.5px dashed #e2e8f0'
                      }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#34a853',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                        }}>
                          <Music size={22} />
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', fontWeight: 900, color: '#1e293b' }}>
                            Noch keine Aufnahmen deiner Lehrkraft
                          </h4>
                          <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', fontWeight: 600, maxWidth: '260px', lineHeight: 1.45 }}>
                            Sobald deine Lehrkraft im Unterricht ein Übe-Beispiel aufnimmt, findest du es hier.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  const now = getSimulatedNow();
                  const currentWeekStr = getISOWeek(now);
                  const currentWeekNum = currentWeekStr.split("-W")[1] || "";

                  // Filter by Search Query if active
                  const isSearching = recordingSearchQuery.trim() !== "";
                  const searchResults = isSearching ? teacherAudios.filter(aud => matchesAudioSearch(aud, recordingSearchQuery)) : [];

                  // Current Week Audios: Include if isCurrentHomework is true OR if date falls into current ISO week!
                  const currentWeekAudios = teacherAudios.filter(aud => {
                    if (aud.isCurrentHomework) return true;
                    const d = aud.date ? new Date(aud.date) : now;
                    return getISOWeek(isNaN(d.getTime()) ? now : d) === currentWeekStr;
                  });
                  currentWeekAudios.sort((a, b) => {
                    const timeA = a.date ? new Date(a.date).getTime() : 0;
                    const timeB = b.date ? new Date(b.date).getTime() : 0;
                    return timeB - timeA;
                  });

                  // Favorite Audios
                  const favoriteTeacherAudios = teacherAudios.filter(aud => favoriteAudioUrls.includes(aud.url));
                  favoriteTeacherAudios.sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0));

                  // Group audios with songTag into Song-Alben
                  const songGroups: { [songTitle: string]: { songTitle: string; takes: any[] } } = {};
                  teacherAudios.forEach(aud => {
                    if (aud.songTag && aud.songTag.trim() !== '') {
                      const sTitle = aud.songTag.trim();
                      if (!songGroups[sTitle]) {
                        songGroups[sTitle] = { songTitle: sTitle, takes: [] };
                      }
                      songGroups[sTitle].takes.push(aud);
                    }
                  });
                  Object.values(songGroups).forEach(sg => {
                    sg.takes.sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0));
                  });
                  const songAlbumsList = Object.values(songGroups).sort((a, b) => b.takes.length - a.takes.length);

                  // Group All Audios into Month Albums (Sofortige Album-Erstellung ab der 1. Aufnahme)
                  const monthGroups: { [monthKey: string]: { monthKey: string; monthLabel: string; weeks: { [weekKey: string]: any[] }; totalTakes: number } } = {};
                  teacherAudios.forEach(aud => {
                    const d = aud.date ? new Date(aud.date) : now;
                    const dateObj = isNaN(d.getTime()) ? now : d;
                    const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
                    const monthLabel = dateObj.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
                    const weekKey = getISOWeek(dateObj);

                    if (!monthGroups[monthKey]) {
                      monthGroups[monthKey] = { monthKey, monthLabel, weeks: {}, totalTakes: 0 };
                    }
                    if (!monthGroups[monthKey].weeks[weekKey]) {
                      monthGroups[monthKey].weeks[weekKey] = [];
                    }
                    monthGroups[monthKey].weeks[weekKey].push(aud);
                    monthGroups[monthKey].totalTakes += 1;
                  });
                  Object.values(monthGroups).forEach(mg => {
                    Object.values(mg.weeks).forEach(wkList => {
                      wkList.sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0));
                    });
                  });

                  const sortedMonths = Object.values(monthGroups).sort((a, b) => b.monthKey.localeCompare(a.monthKey));

                  const renderTeacherPlayer = (aud: any, key: string, isHero = false, customThemeColor = "#15803d", customThemeBg = "#e6f4ea") => {
                    const playerKey = aud.id || aud.blobKey || aud.url || `${key}-${aud.date || ''}`;
                    const effectiveBpm = (aud.metronomeBpm && Number(aud.metronomeBpm) > 0) 
                      ? Number(aud.metronomeBpm) 
                      : ((aud.bpm && Number(aud.bpm) > 0) 
                        ? Number(aud.bpm) 
                        : ((aud.teacherBpm && Number(aud.teacherBpm) > 0) ? Number(aud.teacherBpm) : undefined));
                    return (
                      <InlineAudioPlayer 
                        key={playerKey}
                        id={playerKey}
                        audioId={aud.id || aud.blobKey || aud.url}
                        url={aud.url} 
                        label={aud.label} 
                        duration={aud.duration}
                        waveformPeaks={aud.waveformPeaks}
                        date={aud.date}
                        initialLoopLocator={aud.loop_locator}
                        isHero={isHero || (Boolean(justRecordedAudioUrl) && aud.url === justRecordedAudioUrl)}
                        contextBadge={aud.songTag}
                        onContextBadgeClick={aud.songTag ? () => { setSelectedTeacherMonth(null); setShowTeacherFavoritesOnly(false); setShowTeacherHomeworkArchive(false); setSelectedTeacherSongAlbum(aud.songTag); } : undefined}
                        availableSongs={availableSongsForTagging}
                        onSelectSongTag={(newTag) => handleUpdateAudioSongTag(aud.url, newTag)}
                        isFavorite={favoriteAudioUrls.includes(aud.url)}
                        onToggleFavorite={() => toggleFavoriteAudio(aud.url)}
                        themeColor={customThemeColor}
                        themeBg={customThemeBg}
                        onRename={!readOnly ? (newTitle) => handleRenameTeacherAudio(aud.url, newTitle, aud.originalIdx) : undefined}
                        onDelete={!readOnly ? () => handleDeleteNote(aud.originalIdx, aud.url) : undefined}
                        originalAudioUrl={aud.originalUrl}
                        originalDuration={aud.originalDuration}
                        onRevertToOriginal={!readOnly && aud.originalUrl && handleRevertTeacherAudioToOriginal ? () => handleRevertTeacherAudioToOriginal(aud.originalIdx, aud.url) : undefined}
                        onSaveEdited={!readOnly && handleSaveEditedTeacherAudio ? (res) => handleSaveEditedTeacherAudio(res, aud.originalIdx, aud.url) : undefined}
                        metronomeBpm={effectiveBpm}
                        onOpenDuettDeck={effectiveBpm ? () => setDuettModalData({
                          teacherUrl: aud.url,
                          teacherTitle: aud.label || 'Lehrer-Aufnahme',
                          teacherBpm: effectiveBpm,
                          songTag: aud.songTag
                        }) : undefined}
                      />
                    );
                  };

                  // 🔍 SEARCH RESULTS VIEW
                  if (isSearching) {
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ fontSize: "0.76rem", fontWeight: 850, color: "#15803d", marginBottom: "4px" }}>
                          🔍 {searchResults.length} {searchResults.length === 1 ? "Treffer" : "Treffer"} zur Suche „{recordingSearchQuery}“
                        </div>
                        {searchResults.map((aud, idx) => renderTeacherPlayer(aud, `teacher-search-${idx}`))}
                      </div>
                    );
                  }

                  // ⭐ FAVORITES DRILLDOWN VIEW
                  if (showTeacherFavoritesOnly) {
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <button
                            type="button"
                            onClick={() => setShowTeacherFavoritesOnly(false)}
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              borderRadius: "100px",
                              padding: "4px 12px",
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              color: "#475569",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                            className="hover-scale"
                          >
                            <ArrowLeft size={12} /> Zurück zur Übersicht
                          </button>
                          <span style={{ fontSize: "0.76rem", fontWeight: 900, color: "#ca8a04" }}>
                            ⭐ {favoriteTeacherAudios.length} Favoriten
                          </span>
                        </div>

                        {favoriteTeacherAudios.length === 0 ? (
                          <div style={{ textAlign: "center", padding: "30px 16px", color: "#94a3b8", fontSize: "0.80rem", fontWeight: 700 }}>
                            Noch keine Favoriten markiert. Klicke bei einer Aufnahme auf das Stern-Symbol ⭐!
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {favoriteTeacherAudios.map((aud, idx) => renderTeacherPlayer(aud, `teacher-fav-${idx}`))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // 📚 HAUSAUFGABEN-ARCHIV DRILLDOWN VIEW
                  if (showTeacherHomeworkArchive) {
                    const homeworkWeekGroups: { [weekKey: string]: { weekKey: string; weekNum: string; year: string; takes: any[] } } = {};
                    teacherAudios.forEach(aud => {
                      const d = aud.date ? new Date(aud.date) : now;
                      const dateObj = isNaN(d.getTime()) ? now : d;
                      const weekKey = getISOWeek(dateObj);
                      const weekNum = weekKey.split("-W")[1] || "";
                      const year = weekKey.split("-W")[0] || String(dateObj.getFullYear());

                      if (!homeworkWeekGroups[weekKey]) {
                        homeworkWeekGroups[weekKey] = { weekKey, weekNum, year, takes: [] };
                      }
                      homeworkWeekGroups[weekKey].takes.push(aud);
                    });
                    const sortedHomeworkWeeks = Object.values(homeworkWeekGroups).sort((a, b) => b.weekKey.localeCompare(a.weekKey));

                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <button
                            type="button"
                            onClick={() => setShowTeacherHomeworkArchive(false)}
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              borderRadius: "100px",
                              padding: "4px 12px",
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              color: "#475569",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                            className="hover-scale"
                          >
                            <ArrowLeft size={12} /> Zurück zur Übersicht
                          </button>
                          <span style={{ fontSize: "0.76rem", fontWeight: 900, color: "#15803d" }}>
                            📚 Hausaufgaben-Archiv ({teacherAudios.length} {teacherAudios.length === 1 ? "Take" : "Takes"})
                          </span>
                        </div>

                        {sortedHomeworkWeeks.length === 0 ? (
                          <div style={{ textAlign: "center", padding: "30px 16px", color: "#94a3b8", fontSize: "0.80rem", fontWeight: 700 }}>
                            Noch keine archivierten Hausaufgaben-Aufnahmen vorhanden.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {sortedHomeworkWeeks.map(weekGroup => {
                              const isWeekOpen = openHomeworkWeekAccordions.length === 0 
                                ? weekGroup.weekKey === sortedHomeworkWeeks[0]?.weekKey 
                                : openHomeworkWeekAccordions.includes(weekGroup.weekKey);
                              const toggleWeek = () => {
                                setOpenHomeworkWeekAccordions(prev => {
                                  const effectivePrev = prev.length === 0 ? [sortedHomeworkWeeks[0]?.weekKey].filter(Boolean) as string[] : prev;
                                  return effectivePrev.includes(weekGroup.weekKey) 
                                    ? effectivePrev.filter(k => k !== weekGroup.weekKey) 
                                    : [...effectivePrev, weekGroup.weekKey];
                                });
                              };

                              return (
                                <div
                                  key={`hw-week-${weekGroup.weekKey}`}
                                  style={{
                                    background: "#ffffff",
                                    borderRadius: "14px",
                                    border: isWeekOpen ? "1.5px solid #86efac" : "1.5px solid #e2e8f0",
                                    overflow: "hidden",
                                    boxShadow: isWeekOpen ? "0 4px 12px rgba(34, 197, 94, 0.08)" : "0 1px 3px rgba(0,0,0,0.02)",
                                    transition: "all 0.15s ease"
                                  }}
                                >
                                  {/* Accordion Header */}
                                  <button
                                    type="button"
                                    onClick={toggleWeek}
                                    style={{
                                      width: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      padding: "10px 14px",
                                      background: isWeekOpen ? "#f0fdf4" : "#ffffff",
                                      border: "none",
                                      borderBottom: isWeekOpen ? "1px solid #bbf7d0" : "none",
                                      cursor: "pointer",
                                      textAlign: "left",
                                      transition: "all 0.15s ease"
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                      <span style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: "28px",
                                        height: "28px",
                                        borderRadius: "8px",
                                        background: isWeekOpen ? "#bbf7d0" : "#dcfce7",
                                        color: "#15803d",
                                        fontSize: "0.72rem",
                                        fontWeight: 900
                                      }}>
                                        KW
                                      </span>
                                      <div>
                                        <div style={{ fontSize: "0.84rem", fontWeight: 900, color: "#0f172a" }}>
                                          Kalenderwoche {weekGroup.weekNum} ({weekGroup.year})
                                        </div>
                                        <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 650 }}>
                                          {weekGroup.takes.length} {weekGroup.takes.length === 1 ? "Aufnahme" : "Aufnahmen"}
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                      <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#15803d", background: "#dcfce7", padding: "2px 8px", borderRadius: "100px" }}>
                                        {weekGroup.takes.length} Takes
                                      </span>
                                      {isWeekOpen ? <ChevronUp size={16} color="#15803d" /> : <ChevronDown size={16} color="#64748b" />}
                                    </div>
                                  </button>

                                  {/* Accordion Content */}
                                  {isWeekOpen && (
                                    <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "8px", background: "#f8fafc" }}>
                                      {weekGroup.takes.map((aud, idx) => renderTeacherPlayer(aud, `hw-week-aud-${weekGroup.weekKey}-${idx}`))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // 🎵 SONG ALBUM DRILLDOWN VIEW
                  if (selectedTeacherSongAlbum) {
                    const albumData = songGroups[selectedTeacherSongAlbum];
                    const albumTakes = albumData ? albumData.takes : teacherAudios.filter(a => a.songTag === selectedTeacherSongAlbum);

                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedTeacherSongAlbum(null)}
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              borderRadius: "100px",
                              padding: "5px 14px",
                              fontSize: "0.74rem",
                              fontWeight: 800,
                              color: "#475569",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px"
                            }}
                            className="hover-scale"
                          >
                            <ArrowLeft size={13} /> Zurück zur Übersicht
                          </button>
                          <span style={{ fontSize: "0.74rem", fontWeight: 850, background: "#ede9fe", color: "#6d28d9", padding: "3px 10px", borderRadius: "100px" }}>
                            🎵 {albumTakes.length} {albumTakes.length === 1 ? "Snippet" : "Snippets"}
                          </span>
                        </div>

                        {/* Song Album Banner */}
                        <div style={{
                          background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
                          border: "1.5px solid #ddd6fe",
                          borderRadius: "16px",
                          padding: "14px 16px",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          boxShadow: "0 2px 8px rgba(109, 40, 217, 0.08)"
                        }}>
                          <div style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "12px",
                            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 4px 12px rgba(99, 102, 241, 0.25)",
                            flexShrink: 0
                          }}>
                            <Music size={22} strokeWidth={2.4} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontSize: "0.68rem", fontWeight: 900, color: "#6d28d9", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                              Song-Album & Play-Alongs
                            </span>
                            {(() => {
                              const { title, artist } = parseSongArtistAndTitle(selectedTeacherSongAlbum);
                              return (
                                <>
                                  <h4 style={{ margin: "2px 0 0", fontSize: "1.05rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {title}
                                  </h4>
                                  {artist && (
                                    <div style={{ fontSize: "0.80rem", fontWeight: 800, color: "#6d28d9", marginTop: "1px" }}>
                                      {artist}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                            <p style={{ margin: "2px 0 0", fontSize: "0.74rem", color: "#64748b", fontWeight: 650 }}>
                              Alle Übe-Aufnahmen & Play-Along-Snippets für diesen Song
                            </p>
                          </div>
                        </div>

                        {/* Song Takes List */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {albumTakes.map((aud, idx) => renderTeacherPlayer(aud, `teacher-song-aud-${idx}`, false, "#4f46e5", "#ede9fe"))}
                        </div>
                      </div>
                    );
                  }

                  // 📁 SELECTED MONTH DRILLDOWN VIEW
                  if (selectedTeacherMonth) {
                    const monthData = monthGroups[selectedTeacherMonth.key];
                    const weekKeys = monthData ? Object.keys(monthData.weeks).sort((a, b) => b.localeCompare(a)) : [];

                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedTeacherMonth(null)}
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              borderRadius: "100px",
                              padding: "4px 12px",
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              color: "#475569",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                            className="hover-scale"
                          >
                            <ArrowLeft size={12} /> Zurück zur Übersicht
                          </button>
                          <span style={{ fontSize: "0.78rem", fontWeight: 900, color: "#15803d" }}>
                            📁 {selectedTeacherMonth.label}
                          </span>
                        </div>

                        {weekKeys.map(wkKey => {
                          const wkAudios = monthData.weeks[wkKey] || [];
                          const isExpanded = expandedTeacherAudioWeeks[wkKey] !== undefined ? expandedTeacherAudioWeeks[wkKey] : false;
                          const wkNum = wkKey.split("-W")[1] || "";

                          return (
                            <div key={`teacher-month-week-${wkKey}`} style={{ display: "flex", flexDirection: "column" }}>
                              <div
                                onClick={() => toggleTeacherAudioWeek(wkKey, false)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "8px 12px",
                                  background: "#ffffff",
                                  borderRadius: "12px",
                                  border: "1px solid #e2e8f0",
                                  cursor: "pointer",
                                  marginBottom: "8px",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                                  userSelect: "none"
                                }}
                                className="hover-scale"
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ fontSize: "0.74rem", color: "#64748b", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}>▶</span>
                                  <span style={{ fontSize: "0.78rem", fontWeight: 850, color: "#334155" }}>KW {wkNum}</span>
                                </div>
                                <span style={{ fontSize: "0.66rem", fontWeight: 800, background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: "100px" }}>
                                  {wkAudios.length} {wkAudios.length === 1 ? "Aufnahme" : "Aufnahmen"}
                                </span>
                              </div>

                              {isExpanded && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
                                  {wkAudios.map((aud, idx) => renderTeacherPlayer(aud, `teacher-month-aud-${wkKey}-${idx}`))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  // 🏠 DEFAULT VIEW: Top Hero (Diese Woche) + Responsive Square Album Grid (Favoriten, Song-Alben & Monate)
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {/* 1. TOP HERO: Hausaufgaben */}
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "18px",
                        border: "1.5px solid #bbf7d0",
                        padding: "12px 14px",
                        boxShadow: "0 4px 14px rgba(34, 197, 94, 0.08)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
                            <span style={{ fontSize: "0.84rem", fontWeight: 950, color: "#15803d" }}>Hausaufgaben</span>
                            <span style={{ fontSize: "0.66rem", fontWeight: 800, color: "#16a34a", background: "#dcfce7", padding: "2px 7px", borderRadius: "6px" }}>Diese Woche</span>
                          </div>
                          <span style={{ fontSize: "0.68rem", fontWeight: 800, background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "100px" }}>
                            {currentWeekAudios.length} {currentWeekAudios.length === 1 ? "Aufnahme" : "Aufnahmen"}
                          </span>
                        </div>

                        {currentWeekAudios.length === 0 ? (
                          <div style={{ padding: "14px", textAlign: "center", color: "#94a3b8", fontSize: "0.76rem", fontWeight: 700, background: "#f8fafc", borderRadius: "12px" }}>
                            Noch keine Hausaufgaben-Aufnahmen für diese Woche vorhanden
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {(isTeacherHomeworkExpanded ? currentWeekAudios : currentWeekAudios.slice(0, 3)).map((aud, idx) => 
                              renderTeacherPlayer(aud, `teacher-curr-aud-${idx}`, idx === 0)
                            )}
                            {currentWeekAudios.length > 3 && (
                              <button
                                type="button"
                                onClick={() => setIsTeacherHomeworkExpanded(!isTeacherHomeworkExpanded)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "6px",
                                  padding: "7px 12px",
                                  background: "#f0fdf4",
                                  border: "1px dashed #86efac",
                                  borderRadius: "10px",
                                  color: "#166534",
                                  fontSize: "0.74rem",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  transition: "all 0.2s ease"
                                }}
                                className="hover-scale"
                              >
                                {isTeacherHomeworkExpanded ? (
                                  <>▲ Weniger anzeigen</>
                                ) : (
                                  <>▼ +{currentWeekAudios.length - 3} weitere Aufnahmen anzeigen</>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 2. VISUAL SQUARE ALBUM COVERS (Favoriten + Song-/Lehrwerk-Alben + Monate) */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "0.70rem", fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Monats-Alben, Songs & Archiv
                          </span>
                          <span style={{ fontSize: "0.66rem", color: "#94a3b8", fontWeight: 700 }}>
                            {1 + sortedMonths.length + songAlbumsList.length} Alben
                          </span>
                        </div>

                        <div style={{
                          display: "grid",
                          gridTemplateColumns: isMobileOrSim ? "repeat(3, 1fr)" : "repeat(5, minmax(0, 1fr))",
                          gap: "8px"
                        }}>
                          {/* ⭐ Radiant Apple Liquid Gold & Spotify Starburst Favoriten Cover Card */}
                          {(() => {
                            const isFilled = favoriteTeacherAudios.length > 0;
                            return (
                              <div
                                onClick={() => {
                                  setSelectedTeacherMonth(null);
                                  setSelectedTeacherSongAlbum(null);
                                  setShowTeacherFavoritesOnly(true);
                                }}
                                style={{
                                  aspectRatio: "1 / 1",
                                  background: isFilled 
                                    ? "linear-gradient(135deg, #f59e0b 0%, #d97706 60%, #b45309 100%)" 
                                    : "linear-gradient(145deg, #ffffff 0%, #fefce8 100%)",
                                  borderRadius: "16px",
                                  border: isFilled ? "1px solid rgba(255, 255, 255, 0.4)" : "1.5px solid #fef08a",
                                  padding: "8px 4px",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  cursor: "pointer",
                                  boxShadow: isFilled ? "0 6px 18px -2px rgba(217, 119, 6, 0.35), 0 2px 6px rgba(0,0,0,0.06)" : "0 2px 6px rgba(0,0,0,0.03)",
                                  position: "relative",
                                  overflow: "hidden",
                                  transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                                  textAlign: "center"
                                }}
                                className="hover-scale"
                              >
                                {/* Specular Highlight Sheen */}
                                {isFilled && (
                                  <div style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: "50%",
                                    background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 100%)",
                                    pointerEvents: "none"
                                  }} />
                                )}

                                {/* Luminous Floating Capsule with Star */}
                                <div style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "11px",
                                  background: isFilled ? "rgba(255, 255, 255, 0.22)" : "#fef3c7",
                                  backdropFilter: isFilled ? "blur(8px)" : "none",
                                  WebkitBackdropFilter: isFilled ? "blur(8px)" : "none",
                                  border: isFilled ? "1px solid rgba(255, 255, 255, 0.65)" : "1px solid #fde68a",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  boxShadow: isFilled ? "0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.8)" : "none",
                                  marginTop: "2px",
                                  color: isFilled ? "#ffffff" : "#d97706"
                                }}>
                                  <Star size={20} fill={isFilled ? "#ffffff" : "#f59e0b"} color={isFilled ? "#ffffff" : "#d97706"} strokeWidth={isFilled ? 0 : 1.5} />
                                </div>

                                {/* Typography */}
                                <div style={{ width: "100%", position: "relative", zIndex: 1, padding: "0 2px" }}>
                                  <div style={{
                                    fontSize: "0.70rem",
                                    fontWeight: 900,
                                    color: isFilled ? "#ffffff" : "#78350f",
                                    letterSpacing: "-0.01em",
                                    lineHeight: 1.15,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    textShadow: isFilled ? "0 1px 3px rgba(0,0,0,0.25)" : "none"
                                  }}>
                                    Favoriten
                                  </div>
                                  <div style={{
                                    display: "inline-block",
                                    background: isFilled ? "rgba(0, 0, 0, 0.18)" : "#fef3c7",
                                    backdropFilter: isFilled ? "blur(4px)" : "none",
                                    WebkitBackdropFilter: isFilled ? "blur(4px)" : "none",
                                    padding: "1px 6px",
                                    borderRadius: "999px",
                                    fontSize: "0.55rem",
                                    fontWeight: 800,
                                    color: isFilled ? "#fef3c7" : "#92400e",
                                    marginTop: "2px",
                                    border: isFilled ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid #fde68a"
                                  }}>
                                    {favoriteTeacherAudios.length} {favoriteTeacherAudios.length === 1 ? "Take" : "Takes"}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* 🎵 Song- & Lehrwerk-Alben Covers */}
                          {songAlbumsList.map(songAlb => {
                            const isBook = isBookAlbum(songAlb.songTitle);
                            return (
                              <div
                                key={`teacher-song-album-${songAlb.songTitle}`}
                                onClick={() => {
                                  setSelectedTeacherMonth(null);
                                  setShowTeacherFavoritesOnly(false);
                                  setSelectedTeacherSongAlbum(songAlb.songTitle);
                                }}
                                style={{
                                  aspectRatio: "1 / 1",
                                  background: isBook 
                                    ? "linear-gradient(135deg, #059669 0%, #047857 60%, #065f46 100%)" 
                                    : "linear-gradient(135deg, #6366f1 0%, #4f46e5 60%, #4338ca 100%)",
                                  borderRadius: "16px",
                                  border: "1px solid rgba(255, 255, 255, 0.4)",
                                  padding: "8px 4px",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  cursor: "pointer",
                                  boxShadow: isBook 
                                    ? "0 6px 18px -2px rgba(5, 150, 105, 0.35), 0 2px 6px rgba(0,0,0,0.06)" 
                                    : "0 6px 18px -2px rgba(79, 70, 229, 0.35), 0 2px 6px rgba(0,0,0,0.06)",
                                  position: "relative",
                                  overflow: "hidden",
                                  transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                                  textAlign: "center"
                                }}
                                className="hover-scale"
                                title={isBook ? `Lehrwerk: ${songAlb.songTitle}` : `Song-Album: ${songAlb.songTitle}`}
                              >
                                {/* Specular Highlight Sheen */}
                                <div style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  height: "50%",
                                  background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 100%)",
                                  pointerEvents: "none"
                                }} />

                                {/* Glass Capsule with Book or Music Icon */}
                                <div style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "11px",
                                  background: "rgba(255, 255, 255, 0.22)",
                                  backdropFilter: "blur(8px)",
                                  WebkitBackdropFilter: "blur(8px)",
                                  border: "1px solid rgba(255, 255, 255, 0.65)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.8)",
                                  marginTop: "2px",
                                  color: "#ffffff"
                                }}>
                                  {isBook ? (
                                    <BookOpen size={20} color="#ffffff" strokeWidth={2.4} />
                                  ) : (
                                    <Music size={20} color="#ffffff" strokeWidth={2.4} />
                                  )}
                                </div>

                                {/* Typography */}
                                {(() => {
                                  const { title, artist } = parseSongArtistAndTitle(songAlb.songTitle);
                                  return (
                                    <div style={{ width: "100%", position: "relative", zIndex: 1, padding: "0 2px" }}>
                                      <div style={{
                                        fontSize: "0.72rem",
                                        fontWeight: 950,
                                        color: "#ffffff",
                                        letterSpacing: "-0.015em",
                                        lineHeight: 1.15,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        textShadow: "0 1px 3px rgba(0,0,0,0.3)"
                                      }}>
                                        {title}
                                      </div>
                                      {artist && (
                                        <div style={{
                                          fontSize: "0.58rem",
                                          fontWeight: 750,
                                          color: isBook ? "#d1fae5" : "#c7d2fe",
                                          letterSpacing: "0.01em",
                                          lineHeight: 1.1,
                                          whiteSpace: "nowrap",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          marginTop: "1px",
                                          textShadow: "0 1px 2px rgba(0,0,0,0.25)"
                                        }}>
                                          {artist}
                                        </div>
                                      )}
                                      <div style={{
                                        display: "inline-block",
                                        background: "rgba(0, 0, 0, 0.20)",
                                        backdropFilter: "blur(4px)",
                                        WebkitBackdropFilter: "blur(4px)",
                                        padding: "1px 6px",
                                        borderRadius: "999px",
                                        fontSize: "0.55rem",
                                        fontWeight: 800,
                                        color: isBook ? "#d1fae5" : "#e0e7ff",
                                        marginTop: "2px",
                                        border: "1px solid rgba(255, 255, 255, 0.2)"
                                      }}>
                                        {songAlb.takes.length} {songAlb.takes.length === 1 ? "Take" : "Takes"}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}

                          {/* 📅 Monthly Album Cover Cards (Curated Seasonal Jewel Vinyl Spectrum) */}
                          {sortedMonths.map(m => {
                            const dParts = m.monthKey.split("-");
                            const dObj = new Date(parseInt(dParts[0], 10), parseInt(dParts[1], 10) - 1, 1);
                            const shortLabel = dObj.toLocaleDateString("de-DE", { month: "short" }) + " " + String(dObj.getFullYear()).slice(2);
                            const theme = getMonthAlbumTheme(m.monthKey);

                            return (
                              <div
                                key={`teacher-month-card-${m.monthKey}`}
                                onClick={() => {
                                  setSelectedTeacherSongAlbum(null);
                                  setShowTeacherFavoritesOnly(false);
                                  setSelectedTeacherMonth({ key: m.monthKey, label: m.monthLabel });
                                }}
                                style={{
                                  aspectRatio: "1 / 1",
                                  background: theme.bg,
                                  borderRadius: "16px",
                                  border: "1px solid rgba(255, 255, 255, 0.4)",
                                  padding: "8px 4px",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  cursor: "pointer",
                                  boxShadow: `0 6px 18px -2px ${theme.shadow}, 0 2px 6px rgba(0,0,0,0.06)`,
                                  position: "relative",
                                  overflow: "hidden",
                                  transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                                  textAlign: "center"
                                }}
                                className="hover-scale"
                                title={`Monats-Album: ${m.monthLabel}`}
                              >
                                {/* Specular Highlight Sheen */}
                                <div style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  height: "50%",
                                  background: "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0) 100%)",
                                  pointerEvents: "none"
                                }} />

                                {/* Luminous Floating Glass Capsule with White Calendar Icon */}
                                <div style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "11px",
                                  background: "rgba(255, 255, 255, 0.22)",
                                  backdropFilter: "blur(8px)",
                                  WebkitBackdropFilter: "blur(8px)",
                                  border: "1px solid rgba(255, 255, 255, 0.65)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.8)",
                                  marginTop: "2px",
                                  color: "#ffffff"
                                }}>
                                  <Calendar size={20} color="#ffffff" strokeWidth={2.4} />
                                </div>

                                {/* Typography */}
                                <div style={{ width: "100%", position: "relative", zIndex: 1, padding: "0 2px" }}>
                                  <div style={{
                                    fontSize: "0.70rem",
                                    fontWeight: 900,
                                    color: "#ffffff",
                                    letterSpacing: "-0.01em",
                                    lineHeight: 1.15,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    textShadow: "0 1px 3px rgba(0,0,0,0.25)"
                                  }}>
                                    {shortLabel}
                                  </div>
                                  <div style={{
                                    display: "inline-block",
                                    background: "rgba(0, 0, 0, 0.20)",
                                    backdropFilter: "blur(4px)",
                                    WebkitBackdropFilter: "blur(4px)",
                                    padding: "1px 6px",
                                    borderRadius: "999px",
                                    fontSize: "0.55rem",
                                    fontWeight: 800,
                                    color: "#ffffff",
                                    marginTop: "2px",
                                    border: "1px solid rgba(255, 255, 255, 0.2)"
                                  }}>
                                    {m.totalTakes} {m.totalTakes === 1 ? "Take" : "Takes"}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* ========================================================================= */}
              {/* RIGHT PAGE: ⭐ EIGENE AUFNAHMEN (SCHÜLER - Private Audio-Sandbox)          */}
              {/* ========================================================================= */}
              <div style={{
                flex: isMobileOrSim ? 'none' : '1 1 50%',
                minWidth: 0,
                width: isMobileOrSim ? '100%' : undefined,
                display: isMobileOrSim ? (mobileRecordingsTab === 'student' && !isTeacherTools ? 'flex' : 'none') : 'flex',
                overflowY: 'auto',
                flexDirection: 'column',
                background: useNotebookLayout ? 'white' : '#f8fafc',
                backgroundImage: useNotebookLayout ? 'repeating-linear-gradient(white, white 27px, #e5e0d4 27px, #e5e0d4 28px)' : 'none',
                borderLeft: useNotebookLayout || isMobileOrSim ? 'none' : '1px solid #e4e4e7',
                borderRadius: useNotebookLayout ? '0 0 20px 0' : '0',
                boxShadow: useNotebookLayout ? '10px 10px 20px rgba(0,0,0,0.15)' : 'none',
                position: 'relative',
                padding: isMobileOrSim ? '20px 16px var(--mobile-scroll-clearance-bottom, calc(96px + env(safe-area-inset-bottom, 20px))) 16px' : '24px 20px'
              }}>
                {useNotebookLayout && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: '42px',
                    width: '2px',
                    background: '#fca5a5',
                    zIndex: 10
                  }} />
                )}
                {useNotebookLayout && (
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    bottom: '20px',
                    left: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-around',
                    zIndex: 25
                  }}>
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div key={idx} style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#121214',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)'
                      }} />
                    ))}
                  </div>
                )}

                {/* Header: Student Own Recordings */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                      color: '#6d28d9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(109, 40, 217, 0.18)',
                      flexShrink: 0
                    }}>
                      <Star size={20} strokeWidth={2.4} fill="#6d28d9" />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {isTeacherMode ? 'Schüler-Studio' : 'Dein Übe-Studio'}
                      </span>
                      <h3 style={{ margin: '1px 0 0 0', fontSize: '1.18rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                        {isTeacherMode ? `Freigegebene Aufnahmen von ${studentFirstName}` : 'Deine eigenen Aufnahmen'}
                      </h3>
                    </div>
                  </div>

                  {/* Compact Apple Privacy Badge directly inline beside the title */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '100px',
                    fontSize: '0.68rem',
                    color: '#64748b',
                    fontWeight: 650,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    <Lock size={12} color="#6366f1" style={{ flexShrink: 0 }} />
                    <span>
                      {isTeacherMode
                        ? `Nur für Lehrkraft freigegeben`
                        : 'Standardmäßig privat & nur für dich sichtbar'}
                    </span>
                  </div>
                </div>

                {/* Header or Kid-Friendly Studio Recording Tool */}
                {isTeacherMode ? (
                  <div style={{
                    margin: '0 0 16px 0',
                    padding: '14px 16px',
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                  }}>
                    {(() => {
                      let studentTakesCount = 0;
                      try {
                        if (student?.id) {
                          const stored = localStorage.getItem(`campus_junior_recordings_${student.id}`);
                          if (stored) {
                            const recs = JSON.parse(stored);
                            if (Array.isArray(recs)) studentTakesCount = recs.length;
                          }
                        }
                      } catch {}

                      return (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '12px',
                              background: '#ede9fe',
                              color: '#7c3aed',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <Headphones size={20} strokeWidth={2.4} />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.86rem', fontWeight: 900, color: '#1e293b' }}>
                                Schüler-Aufnahmen & Übe-Takes
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>
                                Aufnahmen, die {studentFirstName} im Übe-Studio eingespielt hat
                              </div>
                            </div>
                          </div>
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 850,
                            color: '#6d28d9',
                            background: '#f5f3ff',
                            border: '1px solid #ddd6fe',
                            padding: '4px 12px',
                            borderRadius: '100px',
                            whiteSpace: 'nowrap'
                          }}>
                            {studentTakesCount} {studentTakesCount === 1 ? 'Take' : 'Takes'}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div style={{
                    margin: '0 0 16px 0',
                    padding: '14px 16px',
                    background: '#ffffff',
                    borderRadius: '18px',
                    border: '1.5px solid #e0e7ff',
                    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    {(() => {
                      let studentRecordingsTotalSec = 0;
                      let studentRecordingsCount = 0;
                      try {
                        if (student?.id) {
                          const stored = localStorage.getItem(`campus_junior_recordings_${student.id}`);
                          if (stored) {
                            const recs = JSON.parse(stored);
                            studentRecordingsTotalSec = recs.reduce((acc: number, r: any) => acc + (parseInt(r.duration, 10) || 0), 0);
                            studentRecordingsCount = Array.isArray(recs) ? recs.length : 0;
                          }
                        }
                      } catch {}

                      const rawSchool = (student as any)?.schools || (student as any)?.school;
                      const schoolObj = Array.isArray(rawSchool) ? rawSchool[0] : rawSchool;
                      let overridesData: any = {};
                      try {
                        const overridesStr = localStorage.getItem('groovelab_school_overrides') || localStorage.getItem('campus_school_overrides') || '{}';
                        const allOverrides = JSON.parse(overridesStr);
                        const sId = student?.school_id || schoolObj?.id;
                        if (sId && allOverrides[sId]) overridesData = allOverrides[sId];
                      } catch (e) {}

                      const studentSchoolName = (student?.school_name || schoolObj?.name || (typeof window !== 'undefined' ? (localStorage.getItem('campus_school_name') || localStorage.getItem('groovelab_school_name')) : '')) || '';
                      const isDefaultTresorSchool = studentSchoolName && (studentSchoolName.toLowerCase().includes('bad säckingen') || studentSchoolName.toLowerCase().includes('musäk'));

                      const activeAddonGb = isDefaultTresorSchool ? 20 : Number(overridesData.storage_addon_gb ?? schoolObj?.storage_addon_gb ?? 0);
                      const totalCapGb = 1.0 + activeAddonGb;
                      const usedBytes = Number(overridesData.storage_used_bytes ?? schoolObj?.storage_used_bytes ?? 0);
                      const usedGb = usedBytes / (1024 * 1024 * 1024);
                      const isStorageOverCap = hasTresorStorage && activeAddonGb > 0 && usedGb >= totalCapGb;

                      const isTresorActive = hasTresorStorage || isDefaultTresorSchool || checkIsAudioTresorActive(student);
                      const effectiveTresorAvailable = isTresorActive && !isStorageOverCap;
                      const monthlyLimit = 240;
                      const isLimitReached = !effectiveTresorAvailable && studentRecordingsTotalSec >= monthlyLimit;

                      const isAudioAllowed = !readOnly || (
                        (student as any)?.parent_allow_audio === true && 
                        ((student as any)?.parent_permissions?.allow_student_audio === true)
                      );

                      if (!isAudioAllowed) {
                        return (
                          <div style={{
                            padding: '14px 16px',
                            background: '#f8fafc',
                            border: '1.5px dashed #cbd5e1',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            textAlign: 'left'
                          }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: '#f1f5f9',
                              color: '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <Lock size={18} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 850, color: '#475569' }}>
                                Eigene Aufnahmen im Elternbereich pausiert
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 550, lineHeight: 1.35 }}>
                                Aufnahmen deiner Lehrkraft auf der linken Seite kannst du weiterhin jederzeit anhören. Eigene Mikrofonaufnahmen können im Eltern-Kontrollzentrum aktiviert werden.
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>🎙️ Dein Übe-Studio</span>
                              <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 650 }}>
                                {effectiveTresorAvailable ? '(bis 7 Min. pro Take)' : '(max. 60s)'}
                              </span>
                            </span>
                            {effectiveTresorAvailable ? (
                              <span style={{ fontSize: '0.70rem', color: '#15803d', fontWeight: 850, background: '#dcfce7', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '100px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                ✨ Audio-Tresor aktiv
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.70rem', color: isLimitReached ? '#dc2626' : '#6366f1', fontWeight: 800, background: isLimitReached ? '#fee2e2' : '#eef2ff', padding: '2px 8px', borderRadius: '100px' }}>
                                {isLimitReached ? '⏱️ Limit erreicht' : '🎙️ Basis-Speicher'}
                              </span>
                            )}
                          </div>

                          {!isRecordingAudio ? (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              width: '100%',
                              minHeight: '136px',
                              boxSizing: 'border-box',
                              justifyContent: 'flex-start'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                position: 'relative'
                              }}>
                                {/* 🔴 Prominent Tactile Record Button (52px Goldstandard) or 4-Beat Count-In HUD */}
                                {recordCountInRemaining !== null && recordCountInRemaining !== undefined ? (
                                  <div style={{
                                    flex: 1,
                                    height: '52px',
                                    background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                                    border: '2px solid #ef4444',
                                    borderRadius: '16px',
                                    padding: '4px 14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    boxShadow: '0 4px 16px rgba(239, 68, 68, 0.25)',
                                    boxSizing: 'border-box'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <div style={{
                                        width: '38px',
                                        height: '38px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 950,
                                        fontSize: '1.25rem',
                                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                                      }}>
                                        {recordCountInRemaining}
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 950, color: '#991b1b', letterSpacing: '-0.01em' }}>
                                          Bereit machen...
                                        </span>
                                        <span style={{ fontSize: '0.68rem', fontWeight: 750, color: '#dc2626' }}>
                                          {isRecordingMetronomeActive && recordingBpm ? `Puls: ${recordingBpm} BPM (Klick aktiv)` : 'Puls: 100 BPM (Standard)'}
                                        </span>
                                      </div>
                                    </div>
                                    {cancelActiveRecordCountIn && (
                                      <button
                                        type="button"
                                        onClick={cancelActiveRecordCountIn}
                                        style={{
                                          background: '#ffffff',
                                          border: '1px solid #fca5a5',
                                          borderRadius: '10px',
                                          color: '#b91c1c',
                                          padding: '6px 12px',
                                          fontSize: '0.74rem',
                                          fontWeight: 850,
                                          cursor: 'pointer',
                                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                        }}
                                        className="hover-scale-mini"
                                        title="Einzählen abbrechen"
                                      >
                                        ✕ Abbrechen
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={startRecordingAudio}
                                    disabled={isUploadingAudio || isLimitReached}
                                    style={{
                                      flex: 1,
                                      height: '52px',
                                      background: isLimitReached ? '#cbd5e1' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '16px',
                                      padding: '10px 18px',
                                      fontSize: '0.96rem',
                                      fontWeight: 950,
                                      cursor: isLimitReached ? 'not-allowed' : 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '8px',
                                      boxShadow: isLimitReached ? 'none' : '0 4px 16px rgba(239, 68, 68, 0.35)',
                                      whiteSpace: 'nowrap',
                                      boxSizing: 'border-box',
                                      transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
                                    }}
                                    className={isLimitReached ? '' : 'hover-scale'}
                                  >
                                    <Mic size={19} strokeWidth={2.8} />
                                    <span>Jetzt aufnehmen</span>
                                  </button>
                                )}

                                {/* 🎛️ Instrumenten-PAD Button (-6 dB Dämpfung für dynamikstarke Instrumente) */}
                                <button
                                  type="button"
                                  onClick={handleTogglePad}
                                  aria-label={effectivePadActive ? "Instrumenten-PAD aktiv (-6 dB Headroom-Dämpfung)" : "Instrumenten-PAD inaktiv (Standard 0 dB)"}
                                  title={effectivePadActive ? "PAD aktiv: -6 dB Headroom für dynamikstarke Instrumente / Slap-Gitarre" : "PAD: -6 dB Headroom-Dämpfung zuschalten"}
                                  style={{
                                    background: effectivePadActive ? '#0f172a' : '#ffffff',
                                    border: effectivePadActive ? '1.5px solid #0f172a' : '1.5px solid #cbd5e1',
                                    color: effectivePadActive ? '#ffffff' : '#64748b',
                                    borderRadius: '16px',
                                    width: '52px',
                                    height: '52px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    boxShadow: effectivePadActive ? '0 2px 8px rgba(15, 23, 42, 0.25)' : '0 1px 3px rgba(0,0,0,0.04)',
                                    transition: 'all 0.15s ease'
                                  }}
                                  className="hover-scale-mini"
                                >
                                  <SlidersHorizontal size={20} color={effectivePadActive ? '#ffffff' : '#64748b'} strokeWidth={effectivePadActive ? 2.4 : 2} />
                                </button>

                                {/* ⏱️ Metronom / Klick Button (52px) */}
                                <button
                                  type="button"
                                  onClick={() => setShowRecordingMetronomePopup(prev => !prev)}
                                  style={{
                                    background: isRecordingMetronomeActive ? '#dcfce7' : '#ffffff',
                                    border: isRecordingMetronomeActive ? '1.5px solid #16a34a' : '1.5px solid #cbd5e1',
                                    color: isRecordingMetronomeActive ? '#15803d' : '#64748b',
                                    borderRadius: '16px',
                                    width: '52px',
                                    height: '52px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    boxShadow: isRecordingMetronomeActive ? '0 2px 8px rgba(22, 163, 74, 0.25)' : '0 1px 3px rgba(0,0,0,0.04)',
                                    transition: 'all 0.15s ease'
                                  }}
                                  className="hover-scale-mini"
                                  title={isRecordingMetronomeActive ? `Klick aktiv (${recordingBpm} BPM)` : 'Klick / Metronom einstellen'}
                                >
                                  <MechanicalMetronomeIcon size={20} color={isRecordingMetronomeActive ? "#15803d" : "#64748b"} strokeWidth={isRecordingMetronomeActive ? 2.4 : 2} />
                                </button>

                                {/* Metronome Flyout Popup (Downwards, High Z-Index, Outside Click Ref) */}
                                {showRecordingMetronomePopup && (
                                  <div 
                                    ref={recordingMetronomeRef}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      position: 'absolute',
                                      top: '100%',
                                      right: 0,
                                      marginTop: '8px',
                                      background: '#ffffff',
                                      borderRadius: '16px',
                                      border: '1.5px solid #cbd5e1',
                                      boxShadow: '0 16px 36px -4px rgba(15, 23, 42, 0.22), 0 4px 12px rgba(0,0,0,0.08)',
                                      padding: '12px 14px',
                                      width: '260px',
                                      zIndex: 1000,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '10px'
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '0.80rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <MechanicalMetronomeIcon size={16} color="#16a34a" strokeWidth={2.2} />
                                        <span>Klick / Metronom</span>
                                      </span>
                                      <button 
                                        type="button" 
                                        onClick={() => setShowRecordingMetronomePopup(false)} 
                                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                        title="Schließen"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = !isRecordingMetronomeActive;
                                        setIsRecordingMetronomeActive(next);
                                        if (next) playMetronomeTick(true);
                                      }}
                                      style={{
                                        width: '100%',
                                        background: isRecordingMetronomeActive ? '#16a34a' : '#f1f5f9',
                                        color: isRecordingMetronomeActive ? '#ffffff' : '#475569',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '7px 10px',
                                        fontSize: '0.76rem',
                                        fontWeight: 850,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        boxShadow: isRecordingMetronomeActive ? '0 2px 8px rgba(22, 163, 74, 0.25)' : 'none'
                                      }}
                                      className="hover-scale-mini"
                                    >
                                      <span>{isRecordingMetronomeActive ? '✓ Klick aktiv' : 'Klick einschalten'}</span>
                                    </button>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>
                                        <span>Tempo</span>
                                        <span style={{ color: '#16a34a', fontWeight: 900 }}>{recordingBpm} BPM</span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <button
                                          type="button"
                                          onClick={() => setRecordingBpm(b => Math.max(40, b - 5))}
                                          style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', width: '26px', height: '26px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                          title="-5 BPM"
                                        >-5</button>
                                        <button
                                          type="button"
                                          onClick={() => setRecordingBpm(b => Math.max(40, b - 1))}
                                          style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', width: '22px', height: '26px', fontWeight: 850, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                          title="-1 BPM"
                                        >-</button>
                                        <input
                                          type="range"
                                          min="40"
                                          max="240"
                                          value={recordingBpm}
                                          onChange={(e) => setRecordingBpm(parseInt(e.target.value, 10))}
                                          style={{ flex: 1, accentColor: '#16a34a', cursor: 'pointer' }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setRecordingBpm(b => Math.min(240, b + 1))}
                                          style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', width: '22px', height: '26px', fontWeight: 850, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                          title="+1 BPM"
                                        >+</button>
                                        <button
                                          type="button"
                                          onClick={() => setRecordingBpm(b => Math.min(240, b + 5))}
                                          style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', width: '26px', height: '26px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                          title="+5 BPM"
                                        >+5</button>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => playMetronomeTick(true)}
                                      style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', color: '#64748b', borderRadius: '8px', padding: '6px', fontSize: '0.68rem', fontWeight: 750, cursor: 'pointer' }}
                                      className="hover-scale-mini"
                                    >
                                      🔊 Klick kurz testen
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* 🎉 Success Banner after Take Completion */}
                              {justRecordedAudioLabel && (
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                                  border: '1.5px solid #86efac',
                                  borderRadius: '12px',
                                  padding: '8px 12px',
                                  color: '#15803d',
                                  fontSize: '0.78rem',
                                  fontWeight: 900,
                                  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.15)'
                                }}>
                                  <span style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    background: '#16a34a',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    <Check size={13} strokeWidth={3} />
                                  </span>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    Take gesichert: „{justRecordedAudioLabel}“ 🎉
                                  </span>
                                </div>
                              )}

                              {/* Optional Title Input + 1-Tap Spark Chips */}
                              {!isLimitReached && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                                  <div style={{ position: 'relative', width: '100%' }}>
                                    <input
                                      type="text"
                                      placeholder="Titel der Aufnahme (optional, z. B. Mein Gitarren-Hit)..."
                                      value={audioLabel}
                                      onChange={(e) => setAudioLabel(e.target.value)}
                                      style={{
                                        width: '100%',
                                        fontSize: '0.78rem',
                                        padding: '7px 10px 7px 28px',
                                        borderRadius: '10px',
                                        border: '1px solid #e2e8f0',
                                        background: '#ffffff',
                                        outline: 'none',
                                        color: '#334155',
                                        boxSizing: 'border-box'
                                      }}
                                    />
                                    <Edit3 size={13} color="#94a3b8" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                    {audioLabel && (
                                      <button
                                        type="button"
                                        onClick={() => setAudioLabel('')}
                                        style={{
                                          position: 'absolute',
                                          right: '8px',
                                          top: '50%',
                                          transform: 'translateY(-50%)',
                                          background: 'none',
                                          border: 'none',
                                          color: '#94a3b8',
                                          fontSize: '0.70rem',
                                          cursor: 'pointer',
                                          fontWeight: 700,
                                          padding: '2px 4px'
                                        }}
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>

                                  {/* 3 Quick-Start Spark Chips (1-Tap Title & Metronome Presets) - Monochrome Icons */}
                                  {studentRecordingsCount > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', width: '100%', overflowX: 'auto', scrollbarWidth: 'none' }}>
                                      {[
                                        { icon: <Music size={11} strokeWidth={2.4} />, title: "Lieblingsriff", prompt: "Lieblingsriff", withMetronome: false },
                                        { icon: <Clock size={11} strokeWidth={2.4} />, title: "Mit Klick", prompt: "Mit Klick", withMetronome: true },
                                        { icon: <HelpCircle size={11} strokeWidth={2.4} />, title: "Frage an Lehrer", prompt: "Frage an Lehrer", withMetronome: false }
                                      ].map((spark, sIdx) => (
                                        <button
                                          key={`spark-chip-${sIdx}`}
                                          type="button"
                                          onClick={() => {
                                            setAudioLabel(spark.prompt);
                                            if (spark.withMetronome) {
                                              setIsRecordingMetronomeActive(true);
                                            }
                                          }}
                                          style={{
                                            background: audioLabel === spark.prompt ? '#ede9fe' : '#f8fafc',
                                            border: audioLabel === spark.prompt ? '1.2px solid #a855f7' : '1px solid #e2e8f0',
                                            color: audioLabel === spark.prompt ? '#6b21a8' : '#475569',
                                            borderRadius: '100px',
                                            padding: '3px 8px',
                                            fontSize: '0.68rem',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.15s ease'
                                          }}
                                          className="hover-scale-mini"
                                          title={`Titel „${spark.prompt}“ setzen`}
                                        >
                                          <span style={{ display: 'inline-flex', alignItems: 'center', color: audioLabel === spark.prompt ? '#6b21a8' : '#64748b' }}>
                                            {spark.icon}
                                          </span>
                                          <span>{spark.title}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Live Active Recording Stage */
                            <div style={{
                              width: '100%',
                              minHeight: '136px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              gap: '10px',
                              padding: '12px 14px',
                              borderRadius: '16px',
                              background: 'linear-gradient(180deg, #fef2f2 0%, #fff1f2 100%)',
                              border: '2px solid #fecdd3',
                              boxShadow: '0 6px 18px -3px rgba(239, 68, 68, 0.25)',
                              boxSizing: 'border-box'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    background: '#ef4444',
                                    boxShadow: '0 0 8px #ef4444',
                                    display: 'inline-block'
                                  }} />
                                  <span style={{ fontSize: '0.84rem', fontWeight: 950, color: '#991b1b', letterSpacing: '-0.01em' }}>
                                    AUFNAHME LÄUFT...
                                  </span>
                                </div>
                                <div style={{
                                  fontSize: '0.86rem',
                                  fontWeight: 950,
                                  color: '#dc2626',
                                  fontVariantNumeric: 'tabular-nums',
                                  background: '#ffffff',
                                  padding: '2px 8px',
                                  borderRadius: '100px',
                                  border: '1px solid #fecdd3'
                                }}>
                                  {formatRecordTime(audioDuration)} {hasTresorStorage ? '/ 7:00 Min.' : '/ 60s'}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => stopRecordingAudio()}
                                style={{
                                  width: '100%',
                                  minHeight: '48px',
                                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '14px',
                                  padding: '10px 16px',
                                  fontSize: '0.92rem',
                                  fontWeight: 950,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
                                  transition: 'all 0.15s ease'
                                }}
                                className="hover-scale"
                              >
                                <span style={{ width: '10px', height: '10px', background: '#ffffff', borderRadius: '2px', display: 'inline-block' }} />
                                <span>Aufnahme beenden & anhören</span>
                              </button>
                            </div>
                          )}

                          {isUploadingAudio && (
                            <div style={{ fontSize: '0.74rem', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 750 }}>
                              <span>⏳</span> Deine Aufnahme wird gespeichert...
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Student Recordings Gallery with Weekly Accordions */}
                {(() => {
                  const studentAudios: any[] = [];
                  const seenStudentUrls = new Set<string>();

                  // 1. Load from local student recordings vault (Multi-Tenant & Aliasing Safe across all candidateStudentIds)
                  try {
                    const candidateStudentIds = Array.from(new Set([
                      student?.id,
                      (student as any)?.student_id,
                      (student as any)?.studentId,
                      (student as any)?.canonical_uuid,
                      (student as any)?.slot_id
                    ].filter(Boolean))) as string[];

                    const seenIds = new Set<string>();

                    candidateStudentIds.forEach(cid => {
                      const juniorKey = `campus_junior_recordings_${cid}`;
                      const stored = localStorage.getItem(juniorKey);
                      if (stored) {
                        try {
                          const parsed = JSON.parse(stored);
                          if (Array.isArray(parsed)) {
                            parsed.forEach((rec: any, idx: number) => {
                              const recId = rec.id || `stud-${cid}-${idx}`;
                              const dedupeKey = rec.blobKey || rec.url || recId;
                              if (dedupeKey && !seenStudentUrls.has(dedupeKey) && !seenIds.has(recId)) {
                                if (rec.url) seenStudentUrls.add(rec.url);
                                if (rec.blobKey) seenStudentUrls.add(rec.blobKey);
                                seenIds.add(recId);
                                const rawSongTag = rec.songTag || rec.song || rec.songTitle || undefined;
                                const songTag = (rec.url && audioSongTags[rec.url] !== undefined) ? (audioSongTags[rec.url] || undefined) : rawSongTag;
                                const sanitizedSongTag = isGenericSongTag(songTag) ? undefined : songTag;
                                const rawBpmCandidate = rec.metronomeBpm ?? rec.bpm ?? rec.teacherBpm;
                                const parsedBpmNum = rawBpmCandidate !== undefined && rawBpmCandidate !== null ? parseInt(String(rawBpmCandidate), 10) : undefined;
                                const validatedBpm = (parsedBpmNum && !isNaN(parsedBpmNum) && parsedBpmNum > 0) ? parsedBpmNum : undefined;

                                const isDuett = Boolean(
                                  rec.isDuettTake || 
                                  rec.source === 'duet' || 
                                  (typeof rec.title === 'string' && rec.title.startsWith('Duett:')) || 
                                  (typeof rec.label === 'string' && rec.label.startsWith('Duett:'))
                                );

                                // 🛡️ Deterministischer Zeitstempel: Reale Aufnahmezeit verwenden, KEIN 'new Date().toISOString()' Fallback
                                const rawDateCandidate = rec.date || rec.created_at || rec.recordedAt;
                                let resolvedDate = rawDateCandidate;
                                if (!resolvedDate && rec.id && typeof rec.id === 'string' && rec.id.includes('_')) {
                                  const parts = rec.id.split('_');
                                  const num = parseInt(parts[2] || parts[1] || '0', 10);
                                  if (num > 1600000000000) {
                                    resolvedDate = new Date(num).toISOString();
                                  }
                                }
                                if (!resolvedDate) {
                                  resolvedDate = new Date(0).toISOString();
                                }

                                studentAudios.push({
                                  id: recId,
                                  url: rec.url,
                                  blobKey: rec.blobKey,
                                  duration: parseInt(rec.duration || '0', 10),
                                  date: resolvedDate,
                                  label: rec.title || rec.label || `Eigene Aufnahme #${studentAudios.length + 1}`,
                                  visibility: rec.visibility || 'private',
                                  songTag: sanitizedSongTag,
                                  originalIdx: -1,
                                  source: rec.source || (isDuett ? 'duet' : 'local_junior'),
                                  bpm: validatedBpm,
                                  style: rec.style,
                                  cloudSyncStatus: rec.cloudSyncStatus,
                                  cloudPath: rec.cloudPath,
                                  checksumSha256: rec.checksumSha256,
                                  isCustomTitle: rec.isCustomTitle || (rec.source === 'practice_companion'),
                                  metronomeBpm: validatedBpm,
                                  original_url: rec.original_url || rec.originalUrl,
                                  original_duration: rec.original_duration || rec.originalDuration,
                                  waveformPeaks: rec.waveformPeaks,
                                  isDuettTake: isDuett,
                                  teacherAudioUrl: rec.teacherAudioUrl,
                                  teacherTitle: rec.teacherTitle,
                                  teacherBpm: rec.teacherBpm,
                                  latencyOffsetMs: rec.latencyOffsetMs,
                                  monitoringMode: rec.monitoringMode,
                                  isBlindTake: rec.isBlindTake
                                });
                              }
                            });
                          }
                        } catch {}
                      }
                    });
                  } catch {}

                  // 🎯 Intelligente, eindeutige & harmonisierte Benennung (Goldstandard: [Thema] • [Datum] [#[Nr]])
                  const harmonizedStudentAudios = harmonizeAudioList(studentAudios, false, topicName);
                  studentAudios.length = 0;
                  harmonizedStudentAudios.forEach(aud => {
                    aud.label = aud.harmonizedTitle;
                    studentAudios.push(aud);
                  });

                  // 🛡️ Deterministische Sortierung (Neueste Aufnahme IMMER ganz oben)
                  studentAudios.sort((a, b) => {
                    const timeA = a.date ? new Date(a.date).getTime() : 0;
                    const timeB = b.date ? new Date(b.date).getTime() : 0;
                    return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
                  });

                  // If teacher is viewing, only show student recordings that are shared
                  if (isTeacherMode) {
                    const sharedAudios = studentAudios.filter(aud => aud.visibility === 'shared_with_teacher');
                    sharedAudios.sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0));

                    if (sharedAudios.length === 0) {
                      return (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '40px 20px', gap: '12px', textAlign: 'center' }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                            <Lock size={20} />
                          </div>
                          <div>
                            <p style={{ fontWeight: 800, fontSize: '0.86rem', color: '#334155', margin: '0 0 4px' }}>{`Keine freigegebenen Aufnahmen von ${studentFirstName}`}</p>
                            <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0, maxWidth: '280px', lineHeight: 1.45 }}>
                              {`${studentFirstName} nutzt diesen Bereich zum ungestörten, privaten Ausprobieren. Sobald eine Übe-Aufnahme für dich freigegeben wird, erscheint sie hier.`}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {sharedAudios.map((aud, idx) => (
                          <InlineAudioPlayer 
                            key={aud.id || aud.blobKey || aud.url || `shared-aud-${idx}`}
                            id={aud.id || aud.blobKey || aud.url}
                            audioId={aud.id || aud.blobKey}
                            url={aud.url} 
                            label={aud.label} 
                            duration={aud.duration}
                            waveformPeaks={aud.waveformPeaks}
                            date={aud.date}
                            initialLoopLocator={aud.loop_locator}
                            isHero={idx === 0 || (Boolean(justRecordedAudioUrl) && (aud.url === justRecordedAudioUrl || aud.blobKey === justRecordedAudioUrl))}
                            contextBadge={aud.songTag}
                            onContextBadgeClick={aud.songTag ? () => { setSelectedStudentMonth(null); setShowStudentFavoritesOnly(false); setSelectedPracticeCompanionAlbum(false); setSelectedDuettAlbum(false); setSelectedStudentSongAlbum(aud.songTag); } : undefined}
                            availableSongs={availableSongsForTagging}
                            onSelectSongTag={(newTag) => handleUpdateAudioSongTag(aud.url, newTag)}
                            themeColor="#16a34a"
                            themeBg="#dcfce7"
                            isSharedWithTeacher={true}
                            badge="🎓 Lehrer"
                            badgeTitle="Vom Schüler für die Lehrkraft freigegeben"
                            badgeBg="#dcfce7"
                            badgeColor="#15803d"
                            onRename={(newTitle) => handleRenameStudentAudio(aud.url, newTitle, aud.id)}
                            metronomeBpm={(aud.metronomeBpm && Number(aud.metronomeBpm) > 0) ? Number(aud.metronomeBpm) : ((aud.bpm && Number(aud.bpm) > 0) ? Number(aud.bpm) : undefined)}
                            onOpenDuettDeck={Boolean((aud.metronomeBpm && Number(aud.metronomeBpm) > 0) || (aud.bpm && Number(aud.bpm) > 0)) ? () => setDuettModalData({
                              teacherUrl: aud.url,
                              teacherTitle: aud.label || 'Schüler-Aufnahme',
                              teacherBpm: Number(aud.metronomeBpm || aud.bpm),
                              songTag: aud.songTag
                            }) : undefined}
                          />
                        ))}
                      </div>
                    );
                  }

                  // Student view: show all student audios
                  if (studentAudios.length === 0) {
                    return (
                      <div style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "24px 16px",
                        textAlign: "center",
                        background: "#f8fafc",
                        borderRadius: "18px",
                        border: "1px dashed #cbd5e1"
                      }}>
                        {/* Top Clean Icon Badge */}
                        <div style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "12px",
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#334155",
                          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)"
                        }}>
                          <Mic size={20} strokeWidth={2.2} />
                        </div>

                        {/* Heading & Subtitle */}
                        <h4 style={{
                          margin: "10px 0 3px",
                          fontSize: "0.96rem",
                          fontWeight: 800,
                          color: "#0f172a",
                          letterSpacing: "-0.01em"
                        }}>
                          Dein Audio-Tresor
                        </h4>
                        <p style={{
                          margin: "0 0 16px",
                          fontSize: "0.78rem",
                          color: "#64748b",
                          maxWidth: "280px",
                          lineHeight: 1.4,
                          fontWeight: 500
                        }}>
                          Private Übe-Aufnahmen – nur für dich sichtbar.
                        </p>

                        {/* Schnelleinstieg / Quick Start */}
                        <div style={{
                          width: "100%",
                          maxWidth: "300px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px"
                        }}>
                          <span style={{
                            fontSize: "0.66rem",
                            fontWeight: 700,
                            color: "#64748b",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            textAlign: "left",
                            paddingLeft: "2px"
                          }}>
                            Schnelleinstieg
                          </span>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {[
                              { icon: Music, title: "Lieblingsriff", prompt: "Lieblingsriff" },
                              { icon: Clock, title: "Mit Klick üben", prompt: "Mit Klick" },
                              { icon: HelpCircle, title: "Frage an Lehrkraft", prompt: "Frage an Lehrer" }
                            ].map((spark, sIdx) => {
                              const SparkIcon = spark.icon;
                              return (
                                <button
                                  key={`empty-spark-${sIdx}`}
                                  type="button"
                                  onClick={() => startRecordingAudio(undefined, spark.prompt)}
                                  aria-label={`${spark.title} aufnehmen`}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "8px 12px",
                                    background: "#ffffff",
                                    borderRadius: "10px",
                                    border: "1px solid #e2e8f0",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    transition: "all 0.15s ease",
                                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.02)"
                                  }}
                                  className="hover-scale"
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                                    <SparkIcon size={15} strokeWidth={2.2} color="#475569" />
                                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1e293b" }}>
                                      {spark.title}
                                    </span>
                                  </div>
                                  <ChevronRight size={14} color="#94a3b8" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const now = getSimulatedNow();
                  const currentWeekStr = getISOWeek(now);
                  const currentWeekNum = currentWeekStr.split("-W")[1] || "";

                  // Filter by Search Query if active
                  const isSearching = recordingSearchQuery.trim() !== "";
                  const searchResults = isSearching ? studentAudios.filter(aud => matchesAudioSearch(aud, recordingSearchQuery)) : [];

                  // Current Week Audios (Deterministisch Neueste zuerst)
                  const currentWeekAudios = studentAudios.filter(aud => {
                    const d = aud.date ? new Date(aud.date) : now;
                    return getISOWeek(isNaN(d.getTime()) ? now : d) === currentWeekStr;
                  });
                  currentWeekAudios.sort((a, b) => {
                    const timeA = a.date ? new Date(a.date).getTime() : 0;
                    const timeB = b.date ? new Date(b.date).getTime() : 0;
                    return timeB - timeA;
                  });

                  // Favorite Audios
                  const favoriteStudentAudios = studentAudios.filter(aud => favoriteAudioUrls.includes(aud.url));
                  favoriteStudentAudios.sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0));

                  // ⏱️ Practice Companion (Übe-Begleiter) Audios
                  const practiceCompanionAudios = studentAudios.filter(aud => 
                    aud.source === 'practice_companion' || 
                    (typeof aud.label === 'string' && (aud.label.startsWith('Übe-Begleiter:') || aud.label.includes('Übe-Begleiter'))) ||
                    (typeof aud.title === 'string' && (aud.title.startsWith('Übe-Begleiter:') || aud.title.includes('Übe-Begleiter')))
                  );
                  practiceCompanionAudios.sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0));

                  // 👥 Duett Audios
                  const duettAudios = studentAudios.filter(aud => 
                    aud.isDuettTake || 
                    aud.source === 'duet' || 
                    (typeof aud.label === 'string' && aud.label.startsWith('Duett:')) ||
                    (typeof aud.title === 'string' && aud.title.startsWith('Duett:'))
                  );
                  duettAudios.sort((a, b) => {
                    const timeA = a.date ? new Date(a.date).getTime() : 0;
                    const timeB = b.date ? new Date(b.date).getTime() : 0;
                    return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
                  });

                  // Group Audios by Song if tagged (Exclude generic tags / lesson titles)
                  const studentSongMap: { [songTitle: string]: any[] } = {};
                  studentAudios.forEach(aud => {
                    if (aud.songTag && !isGenericSongTag(aud.songTag)) {
                      if (!studentSongMap[aud.songTag]) {
                        studentSongMap[aud.songTag] = [];
                      }
                      studentSongMap[aud.songTag].push(aud);
                    }
                  });
                  Object.values(studentSongMap).forEach(list => {
                    list.sort((a, b) => {
                      const timeA = a.date ? new Date(a.date).getTime() : 0;
                      const timeB = b.date ? new Date(b.date).getTime() : 0;
                      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
                    });
                  });
                  const studentSongAlbumsList = Object.keys(studentSongMap).sort().map(songTitle => ({
                    songTitle,
                    audios: studentSongMap[songTitle]
                  }));

                  // Group All Audios into Month Albums (Sofortige Album-Erstellung ab der 1. Aufnahme)
                  const monthGroups: { [monthKey: string]: { monthKey: string; monthLabel: string; weeks: { [weekKey: string]: any[] }; totalTakes: number } } = {};
                  studentAudios.forEach(aud => {
                    const d = aud.date ? new Date(aud.date) : now;
                    const dateObj = isNaN(d.getTime()) ? now : d;
                    const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
                    const monthLabel = dateObj.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
                    const weekKey = getISOWeek(dateObj);

                    if (!monthGroups[monthKey]) {
                      monthGroups[monthKey] = { monthKey, monthLabel, weeks: {}, totalTakes: 0 };
                    }
                    if (!monthGroups[monthKey].weeks[weekKey]) {
                      monthGroups[monthKey].weeks[weekKey] = [];
                    }
                    monthGroups[monthKey].weeks[weekKey].push(aud);
                    monthGroups[monthKey].totalTakes += 1;
                  });
                  Object.values(monthGroups).forEach(mg => {
                    Object.values(mg.weeks).forEach(wkList => {
                      wkList.sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0));
                    });
                  });

                  const sortedMonths = Object.values(monthGroups).sort((a, b) => b.monthKey.localeCompare(a.monthKey));

                  const renderStudentPlayer = (aud: any, idxKey: string, isHero = false) => {
                    const isShared = aud.visibility === "shared_with_teacher";
                    const isPracticeTake = aud.source === 'practice_companion' || (typeof aud.label === 'string' && aud.label.includes('Übe-Begleiter'));
                    const playerKey = aud.id || aud.blobKey || aud.url || `${idxKey}-${aud.date || ''}`;
                    const effectiveBpm = (aud.metronomeBpm && Number(aud.metronomeBpm) > 0) 
                      ? Number(aud.metronomeBpm) 
                      : ((aud.bpm && Number(aud.bpm) > 0) 
                        ? Number(aud.bpm) 
                        : ((aud.teacherBpm && Number(aud.teacherBpm) > 0) ? Number(aud.teacherBpm) : undefined));
                    const hasValidBpm = Boolean(effectiveBpm && effectiveBpm > 0);
                    return (
                      <InlineAudioPlayer 
                        key={playerKey}
                        id={playerKey}
                        audioId={aud.id || aud.blobKey}
                        url={aud.url} 
                        label={aud.label} 
                        duration={aud.duration}
                        waveformPeaks={aud.waveformPeaks}
                        date={aud.date}
                        initialLoopLocator={aud.loop_locator}
                        isHero={isHero || (Boolean(justRecordedAudioUrl) && (aud.url === justRecordedAudioUrl || aud.blobKey === justRecordedAudioUrl))}
                        contextBadge={aud.songTag}
                        onContextBadgeClick={aud.songTag ? () => { setSelectedStudentMonth(null); setShowStudentFavoritesOnly(false); setSelectedPracticeCompanionAlbum(false); setSelectedDuettAlbum(false); setSelectedStudentSongAlbum(aud.songTag); } : undefined}
                        availableSongs={availableSongsForTagging}
                        onSelectSongTag={(newTag) => handleUpdateAudioSongTag(aud.url, newTag)}
                        isFavorite={favoriteAudioUrls.includes(aud.url)}
                        onToggleFavorite={() => toggleFavoriteAudio(aud.url)}
                        themeColor={isPracticeTake ? "#d97706" : (aud.isDuettTake ? "#7c3aed" : "#6d28d9")}
                        themeBg={isPracticeTake ? "#fffbeb" : (aud.isDuettTake ? "#faf5ff" : "#ede9fe")}
                        isSharedWithTeacher={isShared}
                        badge={aud.isDuettTake ? "👥 Duett" : (aud.cloudSyncStatus === 'synced' ? "☁️ Cloud" : (isShared ? "🚀 Für Lehrer" : "🔒 Privat"))}
                        badgeTitle={aud.isDuettTake ? "Synchrones Duett (Spur 1 & Spur 2) - Klicke auf Duett-Deck zum Abhören" : (aud.cloudSyncStatus === 'synced' ? "Revisionssicher im Audio-Tresor gesichert" : (isShared ? "Mit Lehrkraft geteilt (Klicken, um wieder privat zu machen)" : "Privat (Nur für dich sichtbar - Klicken zum Teilen mit Lehrkraft)"))}
                        badgeBg={aud.isDuettTake ? "#f3e8ff" : (aud.cloudSyncStatus === 'synced' ? "#fef3c7" : (isShared ? "#dcfce7" : "#f1f5f9"))}
                        badgeColor={aud.isDuettTake ? "#6b21a8" : (aud.cloudSyncStatus === 'synced' ? "#b45309" : (isShared ? "#15803d" : "#475569"))}
                        onRename={(newTitle) => handleRenameStudentAudio(aud.url, newTitle, aud.id)}
                        metronomeBpm={hasValidBpm ? effectiveBpm : undefined}
                        onOpenDuettDeck={hasValidBpm ? () => setDuettModalData({
                          teacherUrl: aud.teacherAudioUrl || aud.url,
                          teacherTitle: aud.teacherTitle || aud.label || 'Duett-Aufnahme',
                          teacherBpm: effectiveBpm,
                          songTag: aud.songTag
                        }) : undefined}
                        onBadgeClick={!isTeacherMode ? () => {
                          if (student?.id) {
                            try {
                              const juniorKey = `campus_junior_recordings_${student.id}`;
                              const stored = localStorage.getItem(juniorKey);
                              if (stored) {
                                const recs = JSON.parse(stored).map((r: any) => {
                                  if (r.url === aud.url || r.id === aud.id) {
                                    return { ...r, visibility: isShared ? "private" : "shared_with_teacher" };
                                  }
                                  return r;
                                });
                                localStorage.setItem(juniorKey, JSON.stringify(recs));
                                setLocalJuniorRecordingsTrigger(p => p + 1);
                              }
                            } catch {}
                          }
                        } : undefined}
                        onDelete={!isTeacherMode ? async () => {
                          if (handleDeleteStudentAudio) {
                            await handleDeleteStudentAudio(aud.url, aud.id, aud);
                          } else if (student?.id) {
                            try {
                              const candidateStudentIds = Array.from(new Set([
                                student?.id,
                                (student as any)?.student_id,
                                (student as any)?.studentId,
                                (student as any)?.canonical_uuid,
                                (student as any)?.slot_id
                              ].filter(Boolean))) as string[];

                              candidateStudentIds.forEach(cid => {
                                const juniorKey = `campus_junior_recordings_${cid}`;
                                const stored = localStorage.getItem(juniorKey);
                                if (stored) {
                                  const recs = JSON.parse(stored).filter((r: any) => {
                                    const matchUrl = aud.url && (r.url === aud.url || r.original_url === aud.url);
                                    const matchId = aud.id && r.id === aud.id;
                                    const matchBlobKey = aud.blobKey && r.blobKey === aud.blobKey;
                                    return !(matchUrl || matchId || matchBlobKey);
                                  });
                                  localStorage.setItem(juniorKey, JSON.stringify(recs));
                                }
                              });
                              window.dispatchEvent(new Event('campus_junior_recordings_updated'));
                            } catch {}
                          }
                          setLocalRecordingsRevision(p => p + 1);
                          setLocalJuniorRecordingsTrigger(p => p + 1);
                        } : undefined}
                        originalAudioUrl={aud.original_url || aud.originalUrl}
                        originalDuration={aud.original_duration || aud.originalDuration}
                        onRevertToOriginal={(aud.original_url || aud.originalUrl) ? () => {
                          if (student?.id) {
                            try {
                              const candidateStudentIds = Array.from(new Set([
                                student?.id,
                                (student as any)?.student_id,
                                (student as any)?.studentId,
                                (student as any)?.canonical_uuid,
                                (student as any)?.slot_id
                              ].filter(Boolean))) as string[];

                              const origUrl = aud.original_url || aud.originalUrl;
                              const origDur = aud.original_duration || aud.originalDuration || aud.duration;

                              candidateStudentIds.forEach(cid => {
                                const juniorKey = `campus_junior_recordings_${cid}`;
                                const stored = localStorage.getItem(juniorKey);
                                if (stored) {
                                  const recs = JSON.parse(stored).map((r: any) => {
                                    const matchUrl = aud.url && (r.url === aud.url || r.original_url === aud.url);
                                    const matchId = aud.id && r.id === aud.id;
                                    const matchBlobKey = aud.blobKey && r.blobKey === aud.blobKey;
                                    if (matchUrl || matchId || matchBlobKey) {
                                      const { original_url, original_duration, ...rest } = r;
                                      return { ...rest, url: origUrl, duration: origDur };
                                    }
                                    return r;
                                  });
                                  localStorage.setItem(juniorKey, JSON.stringify(recs));
                                }
                              });
                              window.dispatchEvent(new Event('campus_junior_recordings_updated'));
                              setLocalRecordingsRevision(p => p + 1);
                              setLocalJuniorRecordingsTrigger(p => p + 1);
                            } catch {}
                          }
                        } : undefined}
                        onSaveEdited={(res) => {
                          if (student?.id) {
                            try {
                              const candidateStudentIds = Array.from(new Set([
                                student?.id,
                                (student as any)?.student_id,
                                (student as any)?.studentId,
                                (student as any)?.canonical_uuid,
                                (student as any)?.slot_id
                              ].filter(Boolean))) as string[];

                              candidateStudentIds.forEach(cid => {
                                const juniorKey = `campus_junior_recordings_${cid}`;
                                const stored = localStorage.getItem(juniorKey);
                                let recs = stored ? JSON.parse(stored) : [];
                                if (res.mode === "overwrite") {
                                  recs = recs.map((r: any) => {
                                    if (r.url === aud.url || r.id === aud.id) {
                                      const masterOrig = r.original_url || aud.original_url || r.url;
                                      const masterOrigDur = r.original_duration || aud.original_duration || r.duration;
                                      return { ...r, url: res.url, original_url: masterOrig, duration: res.duration, original_duration: masterOrigDur, label: res.label, title: res.label, loop_locator: res.loop_locator !== undefined ? res.loop_locator : r.loop_locator };
                                    }
                                    return r;
                                  });
                                } else {
                                  const newRecord = {
                                    id: `stud-${Date.now()}`,
                                    url: res.url,
                                    duration: res.duration,
                                    date: new Date().toISOString(),
                                    title: res.label,
                                    label: res.label,
                                    visibility: aud.visibility || "private",
                                    metronomeBpm: hasValidBpm ? effectiveBpm : undefined,
                                    bpm: hasValidBpm ? effectiveBpm : undefined
                                  };
                                  recs = [newRecord, ...recs];
                                }
                                localStorage.setItem(juniorKey, JSON.stringify(recs));
                              });
                              setLocalJuniorRecordingsTrigger(p => p + 1);
                            } catch {}
                          }
                        }}
                      />
                    );
                  };

                  // 🔍 SEARCH RESULTS VIEW
                  if (isSearching) {
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ fontSize: "0.76rem", fontWeight: 850, color: "#6d28d9", marginBottom: "4px" }}>
                          🔍 {searchResults.length} {searchResults.length === 1 ? "Treffer" : "Treffer"} zur Suche „{recordingSearchQuery}“
                        </div>
                        {searchResults.map((aud, idx) => renderStudentPlayer(aud, `stud-search-${idx}`))}
                      </div>
                    );
                  }

                  // ⭐ FAVORITES DRILLDOWN VIEW
                  if (showStudentFavoritesOnly) {
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <button
                            type="button"
                            onClick={() => setShowStudentFavoritesOnly(false)}
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              borderRadius: "100px",
                              padding: "4px 12px",
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              color: "#475569",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                            className="hover-scale"
                          >
                            <ArrowLeft size={12} /> Zurück zur Übersicht
                          </button>
                          <span style={{ fontSize: "0.76rem", fontWeight: 900, color: "#ca8a04" }}>
                            ⭐ {favoriteStudentAudios.length} Favoriten
                          </span>
                        </div>

                        {favoriteStudentAudios.length === 0 ? (
                          <div style={{ textAlign: "center", padding: "30px 16px", color: "#94a3b8", fontSize: "0.80rem", fontWeight: 700 }}>
                            Noch keine Favoriten markiert. Klicke bei einem deiner Takes auf das Stern-Symbol ⭐!
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {favoriteStudentAudios.map((aud, idx) => renderStudentPlayer(aud, `stud-fav-${idx}`))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // 📁 SELECTED MONTH DRILLDOWN VIEW
                  if (selectedStudentMonth) {
                    const monthData = monthGroups[selectedStudentMonth.key];
                    const weekKeys = monthData ? Object.keys(monthData.weeks).sort((a, b) => b.localeCompare(a)) : [];

                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedStudentMonth(null)}
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              borderRadius: "100px",
                              padding: "4px 12px",
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              color: "#475569",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                            className="hover-scale"
                          >
                            <ArrowLeft size={12} /> Zurück zur Übersicht
                          </button>
                          <span style={{ fontSize: "0.78rem", fontWeight: 900, color: "#6d28d9" }}>
                            📁 {selectedStudentMonth.label}
                          </span>
                        </div>

                        {weekKeys.map(wkKey => {
                          const wkAudios = monthData.weeks[wkKey] || [];
                          const isExpanded = expandedStudentAudioWeeks[wkKey] !== undefined ? expandedStudentAudioWeeks[wkKey] : false;
                          const wkNum = wkKey.split("-W")[1] || "";

                          return (
                            <div key={`stud-month-week-${wkKey}`} style={{ display: "flex", flexDirection: "column" }}>
                              <div
                                onClick={() => toggleStudentAudioWeek(wkKey, false)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "8px 12px",
                                  background: "#ffffff",
                                  borderRadius: "12px",
                                  border: "1px solid #e2e8f0",
                                  cursor: "pointer",
                                  marginBottom: "8px",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                                  userSelect: "none"
                                }}
                                className="hover-scale"
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ fontSize: "0.74rem", color: "#64748b", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}>▶</span>
                                  <span style={{ fontSize: "0.78rem", fontWeight: 850, color: "#334155" }}>KW {wkNum}</span>
                                </div>
                                <span style={{ fontSize: "0.66rem", fontWeight: 800, background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: "100px" }}>
                                  {wkAudios.length} {wkAudios.length === 1 ? "Aufnahme" : "Aufnahmen"}
                                </span>
                              </div>

                              {isExpanded && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
                                  {wkAudios.map((aud, idx) => renderStudentPlayer(aud, `stud-month-aud-${wkKey}-${idx}`))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  // ⏱️ ÜBE-BEGLEITER SYSTEM-ALBUM DRILLDOWN VIEW
                  if (selectedPracticeCompanionAlbum) {
                    const filteredPracticeTakes = selectedPracticeStyleFilter === 'all'
                      ? practiceCompanionAudios
                      : practiceCompanionAudios.filter(aud => 
                          aud.style === selectedPracticeStyleFilter || 
                          (typeof aud.label === 'string' && aud.label.toLowerCase().includes(selectedPracticeStyleFilter.toLowerCase()))
                        );
                    
                    const totalDurationSec = practiceCompanionAudios.reduce((acc, a) => acc + (a.duration || 0), 0);
                    const totalMinutes = Math.max(1, Math.round(totalDurationSec / 60));

                    const availableStyles = [
                      { id: 'all', label: 'Alle Grooves' },
                      { id: 'metronome', label: '⏱️ Metronom' },
                      { id: 'rock', label: '🥁 Rock & Pop' },
                      { id: 'hiphop', label: '🎧 Hip-Hop' },
                      { id: 'singersongwriter', label: '🎸 Singer-Songwriter' },
                      { id: 'swing', label: '🎺 Jazz Swing' },
                      { id: 'funk', label: '⚡ Funk' },
                      { id: 'latin', label: '🌴 Latin' }
                    ];

                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedPracticeCompanionAlbum(false)}
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              borderRadius: "100px",
                              padding: "5px 14px",
                              fontSize: "0.74rem",
                              fontWeight: 800,
                              color: "#475569",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px"
                            }}
                            className="hover-scale"
                          >
                            <ArrowLeft size={13} /> Zurück zur Übersicht
                          </button>
                          <span style={{ fontSize: "0.74rem", fontWeight: 850, background: "#fef3c7", color: "#92400e", padding: "3px 10px", borderRadius: "100px", border: "1px solid #fde68a" }}>
                            ⏱️ {practiceCompanionAudios.length} {practiceCompanionAudios.length === 1 ? "Take" : "Takes"} {totalDurationSec > 0 ? `• ${totalMinutes} min geübt` : ''}
                          </span>
                        </div>

                        {/* Übe-Begleiter Banner */}
                        <div style={{
                          background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                          border: "1.5px solid #fde68a",
                          borderRadius: "16px",
                          padding: "14px 16px",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          boxShadow: "0 2px 8px rgba(217, 119, 6, 0.10)"
                        }}>
                          <div style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "12px",
                            background: "linear-gradient(135deg, #facc15 0%, #eab308 100%)",
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 4px 14px -2px rgba(234, 179, 8, 0.40)",
                            flexShrink: 0
                          }}>
                            <Clock size={22} strokeWidth={2.4} style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.20))" }} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontSize: "0.68rem", fontWeight: 900, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                              Übe-Begleiter & Rhythmus-Labor
                            </span>
                            <h4 style={{ margin: "2px 0 0", fontSize: "1.05rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>
                              Metronom & Begleit-Takes
                            </h4>
                            <p style={{ margin: "2px 0 0", fontSize: "0.74rem", color: "#78350f", fontWeight: 650 }}>
                              Alle deine Rhythmus-Sessions, Tempo-Drills & Übe-Takes auf einen Blick
                            </p>
                          </div>
                        </div>

                        {/* Rhythmus & Groove Filter Pills */}
                        {practiceCompanionAudios.length > 0 && (
                          <div style={{
                            display: "flex",
                            gap: "6px",
                            overflowX: "auto",
                            paddingBottom: "4px",
                            WebkitOverflowScrolling: "touch"
                          }}>
                            {availableStyles.map(st => {
                              const isSelected = selectedPracticeStyleFilter === st.id;
                              const count = st.id === 'all'
                                ? practiceCompanionAudios.length
                                : practiceCompanionAudios.filter(a => a.style === st.id || (typeof a.label === 'string' && a.label.toLowerCase().includes(st.id))).length;
                              
                              if (st.id !== 'all' && count === 0) return null;

                              return (
                                <button
                                  key={`filter-${st.id}`}
                                  type="button"
                                  onClick={() => setSelectedPracticeStyleFilter(st.id)}
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: "100px",
                                    fontSize: "0.70rem",
                                    fontWeight: 800,
                                    whiteSpace: "nowrap",
                                    cursor: "pointer",
                                    border: isSelected ? "1.5px solid #d97706" : "1px solid #e2e8f0",
                                    background: isSelected ? "#f59e0b" : "#ffffff",
                                    color: isSelected ? "#ffffff" : "#64748b",
                                    boxShadow: isSelected ? "0 2px 6px rgba(217, 119, 6, 0.25)" : "none",
                                    transition: "all 0.15s ease"
                                  }}
                                >
                                  {st.label} ({count})
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Takes List */}
                        {filteredPracticeTakes.length === 0 ? (
                          <div style={{ textAlign: "center", padding: "30px 16px", color: "#94a3b8", fontSize: "0.80rem", fontWeight: 700, background: "#fffbeb", borderRadius: "12px", border: "1px dashed #fde68a" }}>
                            {practiceCompanionAudios.length === 0
                              ? "Noch keine Übe-Begleiter Aufnahmen vorhanden. Starte im Übe-Begleiter eine Aufnahme!"
                              : "Keine Aufnahmen für diesen Filter gefunden."}
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {filteredPracticeTakes.map((aud, idx) => renderStudentPlayer(aud, `stud-practice-${idx}`))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // 👥 DUETT SYSTEM-ALBUM DRILLDOWN VIEW
                  if (selectedDuettAlbum) {
                    const totalDurationSec = duettAudios.reduce((acc, a) => acc + (a.duration || 0), 0);
                    const totalMinutes = Math.max(1, Math.round(totalDurationSec / 60));

                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedDuettAlbum(false)}
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              borderRadius: "100px",
                              padding: "5px 14px",
                              fontSize: "0.74rem",
                              fontWeight: 800,
                              color: "#475569",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px"
                            }}
                            className="hover-scale"
                          >
                            <ArrowLeft size={13} /> Zurück zur Übersicht
                          </button>
                          <span style={{ fontSize: "0.74rem", fontWeight: 850, background: "#f3e8ff", color: "#6b21a8", padding: "3px 10px", borderRadius: "100px" }}>
                            👥 {duettAudios.length} {duettAudios.length === 1 ? "Duett" : "Duette"} {totalDurationSec > 0 ? `• ${totalMinutes} min` : ''}
                          </span>
                        </div>

                        {/* Duett Album Banner */}
                        <div style={{
                          background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 60%, #6d28d9 100%)",
                          borderRadius: "16px",
                          padding: "16px 18px",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          boxShadow: "0 8px 24px -4px rgba(124, 58, 237, 0.35)",
                          position: "relative",
                          overflow: "hidden"
                        }}>
                          <div style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: "50%",
                            background: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)",
                            pointerEvents: "none"
                          }} />
                          <div style={{ display: "flex", alignItems: "center", gap: "14px", position: "relative", zIndex: 1 }}>
                            <div style={{
                              width: "46px",
                              height: "46px",
                              borderRadius: "14px",
                              background: "rgba(255,255,255,0.22)",
                              backdropFilter: "blur(8px)",
                              WebkitBackdropFilter: "blur(8px)",
                              border: "1px solid rgba(255,255,255,0.6)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
                            }}>
                              <Users size={24} strokeWidth={2.4} color="#ffffff" />
                            </div>
                            <div>
                              <div style={{ fontSize: "1.05rem", fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                                Duett-Album
                              </div>
                              <div style={{ fontSize: "0.74rem", opacity: 0.9, marginTop: "2px", fontWeight: 600 }}>
                                Alle synchronen Duett-Aufnahmen (Spur 1 & Spur 2) mit deiner Lehrkraft
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Takes List */}
                        {duettAudios.length === 0 ? (
                          <div style={{ textAlign: "center", padding: "30px 16px", color: "#94a3b8", fontSize: "0.80rem", fontWeight: 700, background: "#faf5ff", borderRadius: "12px", border: "1px dashed #d8b4fe" }}>
                            Noch keine Duett-Aufnahmen vorhanden.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {duettAudios.map((aud, idx) => renderStudentPlayer(aud, `stud-duett-${idx}`))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // 🎵 SONG-ALBUM DRILLDOWN VIEW
                  if (selectedStudentSongAlbum) {
                    const songAudios = studentSongMap[selectedStudentSongAlbum] || [];
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedStudentSongAlbum(null)}
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              borderRadius: "100px",
                              padding: "5px 14px",
                              fontSize: "0.74rem",
                              fontWeight: 800,
                              color: "#475569",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px"
                            }}
                            className="hover-scale"
                          >
                            <ArrowLeft size={13} /> Zurück zur Übersicht
                          </button>
                          <span style={{ fontSize: "0.74rem", fontWeight: 850, background: "#f3e8ff", color: "#7e22ce", padding: "3px 10px", borderRadius: "100px" }}>
                            🎵 {songAudios.length} {songAudios.length === 1 ? "Take" : "Takes"}
                          </span>
                        </div>

                        {/* Song Album Banner */}
                        <div style={{
                          background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
                          border: "1.5px solid #e9d5ff",
                          borderRadius: "16px",
                          padding: "14px 16px",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          boxShadow: "0 2px 8px rgba(126, 34, 206, 0.08)"
                        }}>
                          <div style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "12px",
                            background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 4px 12px rgba(147, 51, 234, 0.25)",
                            flexShrink: 0
                          }}>
                            <Music size={22} strokeWidth={2.4} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontSize: "0.68rem", fontWeight: 900, color: "#7e22ce", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                              Song-Album & Aufnahmen
                            </span>
                            {(() => {
                              const { title, artist } = parseSongArtistAndTitle(selectedStudentSongAlbum);
                              return (
                                <>
                                  <h4 style={{ margin: "2px 0 0", fontSize: "1.05rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {title}
                                  </h4>
                                  {artist && (
                                    <div style={{ fontSize: "0.80rem", fontWeight: 800, color: "#7e22ce", marginTop: "1px" }}>
                                      {artist}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                            <p style={{ margin: "2px 0 0", fontSize: "0.74rem", color: "#64748b", fontWeight: 650 }}>
                              Alle deine Übe-Takes & Play-Alongs für diesen Song
                            </p>
                          </div>
                        </div>

                        {songAudios.length === 0 ? (
                          <div style={{ textAlign: "center", padding: "30px 16px", color: "#94a3b8", fontSize: "0.80rem", fontWeight: 700 }}>
                            Keine Aufnahmen für diesen Song gefunden.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {songAudios.map((aud, idx) => renderStudentPlayer(aud, `stud-song-${idx}`))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // 🏠 DEFAULT VIEW: Top Hero (Diese Woche) + Responsive Square Album Grid (Favoriten, Song-Alben & Monate)
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {/* 1. TOP HERO: Diese Woche geübt */}
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "18px",
                        border: "1.5px solid #e9d5ff",
                        padding: "12px 14px",
                        boxShadow: "0 4px 14px rgba(109, 40, 217, 0.08)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#9333ea", display: "inline-block" }} />
                            <span style={{ fontSize: "0.82rem", fontWeight: 900, color: "#6d28d9" }}>Diese Woche geübt</span>
                          </div>
                          <span style={{ fontSize: "0.68rem", fontWeight: 800, background: "#ede9fe", color: "#6d28d9", padding: "2px 8px", borderRadius: "100px" }}>
                            {currentWeekAudios.length} {currentWeekAudios.length === 1 ? "Aufnahme" : "Aufnahmen"}
                          </span>
                        </div>

                        {currentWeekAudios.length === 0 ? (
                          <div style={{ padding: "14px", textAlign: "center", color: "#94a3b8", fontSize: "0.76rem", fontWeight: 700, background: "#faf5ff", borderRadius: "12px" }}>
                            Noch keine eigenen Aufnahmen in dieser Woche
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {(isStudentWeekExpanded ? currentWeekAudios : currentWeekAudios.slice(0, 3)).map((aud, idx) => renderStudentPlayer(aud, `stud-curr-aud-${idx}`, idx === 0))}
                            {currentWeekAudios.length > 3 && (
                              <button
                                type="button"
                                onClick={() => setIsStudentWeekExpanded(!isStudentWeekExpanded)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "6px",
                                  padding: "7px 12px",
                                  background: "#faf5ff",
                                  border: "1px dashed #d8b4fe",
                                  borderRadius: "10px",
                                  color: "#6d28d9",
                                  fontSize: "0.74rem",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  transition: "all 0.2s ease"
                                }}
                                className="hover-scale"
                              >
                                {isStudentWeekExpanded ? (
                                  <>▲ Weniger anzeigen</>
                                ) : (
                                  <>▼ +{currentWeekAudios.length - 3} weitere Aufnahmen anzeigen</>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 2. VISUAL SQUARE ALBUM COVERS (Favoriten + Song-Alben + Monate) */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "0.70rem", fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Monats-Alben, Songs & Archiv
                          </span>
                          <span style={{ fontSize: "0.66rem", color: "#94a3b8", fontWeight: 700 }}>
                            {2 + sortedMonths.length + studentSongAlbumsList.length} Alben
                          </span>
                        </div>

                        <div style={{
                          display: "grid",
                          gridTemplateColumns: isMobileOrSim ? "repeat(3, 1fr)" : "repeat(5, minmax(0, 1fr))",
                          gap: "8px"
                        }}>
                          {/* ⭐ Radiant Apple Liquid Gold & Spotify Starburst Favoriten Cover Card */}
                          {(() => {
                            const isFilled = favoriteStudentAudios.length > 0;
                            return (
                              <div
                                role="button"
                                tabIndex={0}
                                aria-label={`Favoriten Album, ${favoriteStudentAudios.length} Takes`}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setSelectedStudentMonth(null);
                                    setSelectedStudentSongAlbum(null);
                                    setSelectedPracticeCompanionAlbum(false);
                                    setSelectedDuettAlbum(false);
                                    setShowStudentFavoritesOnly(true);
                                  }
                                }}
                                onClick={() => {
                                  setSelectedStudentMonth(null);
                                  setSelectedStudentSongAlbum(null);
                                  setSelectedPracticeCompanionAlbum(false);
                                  setSelectedDuettAlbum(false);
                                  setShowStudentFavoritesOnly(true);
                                }}
                                style={{
                                  aspectRatio: "1 / 1",
                                  background: isFilled 
                                    ? "linear-gradient(135deg, #f59e0b 0%, #d97706 60%, #b45309 100%)" 
                                    : "linear-gradient(145deg, #ffffff 0%, #fefce8 100%)",
                                  borderRadius: "16px",
                                  border: isFilled ? "1px solid rgba(255, 255, 255, 0.4)" : "1.5px solid #fef08a",
                                  padding: "8px 4px",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  cursor: "pointer",
                                  boxShadow: isFilled ? "0 6px 18px -2px rgba(217, 119, 6, 0.35), 0 2px 6px rgba(0,0,0,0.06)" : "0 2px 6px rgba(0,0,0,0.03)",
                                  position: "relative",
                                  overflow: "hidden",
                                  transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                                  textAlign: "center"
                                }}
                                className="hover-scale"
                              >
                                {/* Specular Highlight Sheen */}
                                {isFilled && (
                                  <div style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: "50%",
                                    background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 100%)",
                                    pointerEvents: "none"
                                  }} />
                                )}

                                {/* Luminous Floating Capsule with Star */}
                                <div style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "11px",
                                  background: isFilled ? "rgba(255, 255, 255, 0.22)" : "#fef3c7",
                                  backdropFilter: isFilled ? "blur(8px)" : "none",
                                  WebkitBackdropFilter: isFilled ? "blur(8px)" : "none",
                                  border: isFilled ? "1px solid rgba(255, 255, 255, 0.65)" : "1px solid #fde68a",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  boxShadow: isFilled ? "0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.8)" : "none",
                                  marginTop: "2px",
                                  color: isFilled ? "#ffffff" : "#d97706"
                                }}>
                                  <Star size={20} fill={isFilled ? "#ffffff" : "#f59e0b"} color={isFilled ? "#ffffff" : "#d97706"} strokeWidth={isFilled ? 0 : 1.5} />
                                </div>

                                {/* Typography */}
                                <div style={{ width: "100%", position: "relative", zIndex: 1, padding: "0 2px" }}>
                                  <div style={{
                                    fontSize: "0.70rem",
                                    fontWeight: 900,
                                    color: isFilled ? "#ffffff" : "#78350f",
                                    letterSpacing: "-0.01em",
                                    lineHeight: 1.15,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    textShadow: isFilled ? "0 1px 3px rgba(0,0,0,0.25)" : "none"
                                  }}>
                                    Favoriten
                                  </div>
                                  <div style={{
                                    display: "inline-block",
                                    background: isFilled ? "rgba(0, 0, 0, 0.18)" : "#fef3c7",
                                    backdropFilter: isFilled ? "blur(4px)" : "none",
                                    WebkitBackdropFilter: isFilled ? "blur(4px)" : "none",
                                    padding: "1px 6px",
                                    borderRadius: "999px",
                                    fontSize: "0.55rem",
                                    fontWeight: 800,
                                    color: isFilled ? "#fef3c7" : "#92400e",
                                    marginTop: "2px",
                                    border: isFilled ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid #fde68a"
                                  }}>
                                    {favoriteStudentAudios.length} {favoriteStudentAudios.length === 1 ? "Take" : "Takes"}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* ⏱️ Übe-Begleiter & Rhythmen System Album Cover Card (Modul-Gelb) */}
                          {(() => {
                            const isFilled = practiceCompanionAudios.length > 0;
                            return (
                              <div
                                role="button"
                                tabIndex={0}
                                aria-label={`Übe-Begleiter Album, ${practiceCompanionAudios.length} Takes`}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setSelectedStudentMonth(null);
                                    setSelectedStudentSongAlbum(null);
                                    setShowStudentFavoritesOnly(false);
                                    setSelectedDuettAlbum(false);
                                    setSelectedPracticeCompanionAlbum(true);
                                  }
                                }}
                                onClick={() => {
                                  setSelectedStudentMonth(null);
                                  setSelectedStudentSongAlbum(null);
                                  setShowStudentFavoritesOnly(false);
                                  setSelectedDuettAlbum(false);
                                  setSelectedPracticeCompanionAlbum(true);
                                }}
                                style={{
                                  aspectRatio: "1 / 1",
                                  background: isFilled 
                                    ? "linear-gradient(135deg, #facc15 0%, #eab308 100%)" 
                                    : "linear-gradient(145deg, #ffffff 0%, #fefce8 100%)",
                                  borderRadius: "16px",
                                  border: isFilled ? "1.5px solid rgba(255, 255, 255, 0.65)" : "1.5px solid #fef08a",
                                  padding: "8px 4px",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  cursor: "pointer",
                                  boxShadow: isFilled ? "0 6px 18px -2px rgba(234, 179, 8, 0.45), 0 2px 6px rgba(0,0,0,0.06)" : "0 2px 6px rgba(0,0,0,0.03)",
                                  position: "relative",
                                  overflow: "hidden",
                                  transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                                  textAlign: "center"
                                }}
                                className="hover-scale"
                              >
                                {/* Specular Highlight Sheen */}
                                {isFilled && (
                                  <div style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: "50%",
                                    background: "linear-gradient(180deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 100%)",
                                    pointerEvents: "none"
                                  }} />
                                )}

                                {/* Luminous Floating Capsule with Clock Icon (Duett-Style with Drop-Shadow) */}
                                <div style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "11px",
                                  background: isFilled ? "rgba(255, 255, 255, 0.28)" : "#fef3c7",
                                  backdropFilter: isFilled ? "blur(8px)" : "none",
                                  WebkitBackdropFilter: isFilled ? "blur(8px)" : "none",
                                  border: isFilled ? "1px solid rgba(255, 255, 255, 0.75)" : "1px solid #fde68a",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  boxShadow: isFilled ? "0 2px 8px rgba(0, 0, 0, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.8)" : "none",
                                  marginTop: "2px",
                                  color: isFilled ? "#ffffff" : "#d97706"
                                }}>
                                  <Clock size={20} strokeWidth={2.4} color={isFilled ? "#ffffff" : "#d97706"} style={{ filter: isFilled ? "drop-shadow(0 1px 3px rgba(0,0,0,0.22))" : "none" }} />
                                </div>

                                {/* Typography */}
                                <div style={{ width: "100%", position: "relative", zIndex: 1, padding: "0 2px" }}>
                                  <div style={{
                                    fontSize: "0.70rem",
                                    fontWeight: 900,
                                    color: "#78350f",
                                    letterSpacing: "-0.01em",
                                    lineHeight: 1.15,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis"
                                  }}>
                                    Übe-Begleiter
                                  </div>
                                  <div style={{
                                    display: "inline-block",
                                    background: isFilled ? "rgba(255, 255, 255, 0.55)" : "#fef3c7",
                                    backdropFilter: isFilled ? "blur(4px)" : "none",
                                    WebkitBackdropFilter: isFilled ? "blur(4px)" : "none",
                                    padding: "1px 6px",
                                    borderRadius: "999px",
                                    fontSize: "0.55rem",
                                    fontWeight: 800,
                                    color: isFilled ? "#78350f" : "#92400e",
                                    marginTop: "2px",
                                    border: isFilled ? "1px solid rgba(255, 255, 255, 0.75)" : "1px solid #fde68a"
                                  }}>
                                    {practiceCompanionAudios.length} {practiceCompanionAudios.length === 1 ? "Take" : "Takes"}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* 👥 Duett System Album Cover Card (nur sichtbar, sobald mind. 1 Duett existiert) */}
                          {duettAudios.length > 0 && (() => {
                            return (
                              <div
                                role="button"
                                tabIndex={0}
                                aria-label={`Duett Album, ${duettAudios.length} Duette`}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setSelectedStudentMonth(null);
                                    setSelectedStudentSongAlbum(null);
                                    setShowStudentFavoritesOnly(false);
                                    setSelectedPracticeCompanionAlbum(false);
                                    setSelectedDuettAlbum(true);
                                  }
                                }}
                                onClick={() => {
                                  setSelectedStudentMonth(null);
                                  setSelectedStudentSongAlbum(null);
                                  setShowStudentFavoritesOnly(false);
                                  setSelectedPracticeCompanionAlbum(false);
                                  setSelectedDuettAlbum(true);
                                }}
                                style={{
                                  aspectRatio: "1 / 1",
                                  background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 60%, #6d28d9 100%)",
                                  borderRadius: "16px",
                                  border: "1.5px solid rgba(255, 255, 255, 0.4)",
                                  padding: "8px 4px",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  cursor: "pointer",
                                  boxShadow: "0 6px 18px -2px rgba(124, 58, 237, 0.38), 0 2px 6px rgba(0,0,0,0.06)",
                                  position: "relative",
                                  overflow: "hidden",
                                  transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                                  textAlign: "center"
                                }}
                                className="hover-scale"
                              >
                                {/* Specular Highlight Sheen */}
                                <div style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  height: "50%",
                                  background: "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%)",
                                  pointerEvents: "none"
                                }} />

                                {/* Luminous Floating Capsule with Users Icon */}
                                <div style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "11px",
                                  background: "rgba(255, 255, 255, 0.24)",
                                  backdropFilter: "blur(8px)",
                                  WebkitBackdropFilter: "blur(8px)",
                                  border: "1px solid rgba(255, 255, 255, 0.65)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.8)",
                                  marginTop: "2px",
                                  color: "#ffffff"
                                }}>
                                  <Users size={20} strokeWidth={2.4} color="#ffffff" />
                                </div>

                                {/* Typography */}
                                <div style={{ width: "100%", position: "relative", zIndex: 1, padding: "0 2px" }}>
                                  <div style={{
                                    fontSize: "0.70rem",
                                    fontWeight: 900,
                                    color: "#ffffff",
                                    letterSpacing: "-0.01em",
                                    lineHeight: 1.15,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    textShadow: "0 1px 3px rgba(0,0,0,0.25)"
                                  }}>
                                    Duett
                                  </div>
                                  <div style={{
                                    display: "inline-block",
                                    background: "rgba(0, 0, 0, 0.2)",
                                    backdropFilter: "blur(4px)",
                                    WebkitBackdropFilter: "blur(4px)",
                                    padding: "1px 6px",
                                    borderRadius: "999px",
                                    fontSize: "0.55rem",
                                    fontWeight: 800,
                                    color: "#f3e8ff",
                                    marginTop: "2px",
                                    border: "1px solid rgba(255, 255, 255, 0.25)"
                                  }}>
                                    {duettAudios.length} {duettAudios.length === 1 ? "Duett" : "Duette"}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* 🎵 Song- & Lehrwerk-Alben Covers (für jeden Song/Lehrwerk mit Snippets) */}
                          {studentSongAlbumsList.map(songAlb => {
                            const isBook = isBookAlbum(songAlb.songTitle);
                            return (
                              <div
                                key={`stud-song-album-${songAlb.songTitle}`}
                                onClick={() => {
                                  setSelectedStudentMonth(null);
                                  setShowStudentFavoritesOnly(false);
                                  setSelectedPracticeCompanionAlbum(false);
                                  setSelectedDuettAlbum(false);
                                  setSelectedStudentSongAlbum(songAlb.songTitle);
                                }}
                                style={{
                                  aspectRatio: "1 / 1",
                                  background: isBook 
                                    ? "linear-gradient(135deg, #059669 0%, #047857 60%, #065f46 100%)" 
                                    : "linear-gradient(135deg, #a855f7 0%, #9333ea 60%, #7e22ce 100%)",
                                  borderRadius: "16px",
                                  border: "1px solid rgba(255, 255, 255, 0.4)",
                                  padding: "8px 4px",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  cursor: "pointer",
                                  boxShadow: isBook 
                                    ? "0 6px 18px -2px rgba(5, 150, 105, 0.35), 0 2px 6px rgba(0,0,0,0.06)" 
                                    : "0 6px 18px -2px rgba(147, 51, 234, 0.35), 0 2px 6px rgba(0,0,0,0.06)",
                                  position: "relative",
                                  overflow: "hidden",
                                  transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                                  textAlign: "center"
                                }}
                                className="hover-scale"
                                title={isBook ? `Lehrwerk: ${songAlb.songTitle}` : `Song-Album: ${songAlb.songTitle}`}
                              >
                                {/* Specular Highlight Sheen */}
                                <div style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  height: "50%",
                                  background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 100%)",
                                  pointerEvents: "none"
                                }} />

                                {/* Glass Capsule with Book or Music Icon */}
                                <div style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "11px",
                                  background: "rgba(255, 255, 255, 0.22)",
                                  backdropFilter: "blur(8px)",
                                  WebkitBackdropFilter: "blur(8px)",
                                  border: "1px solid rgba(255, 255, 255, 0.65)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.8)",
                                  marginTop: "2px",
                                  color: "#ffffff"
                                }}>
                                  {isBook ? (
                                    <BookOpen size={20} color="#ffffff" strokeWidth={2.4} />
                                  ) : (
                                    <Music size={20} color="#ffffff" strokeWidth={2.4} />
                                  )}
                                </div>

                                {/* Typography */}
                                {(() => {
                                  const { title, artist } = parseSongArtistAndTitle(songAlb.songTitle);
                                  return (
                                    <div style={{ width: "100%", position: "relative", zIndex: 1, padding: "0 2px" }}>
                                      <div style={{
                                        fontSize: "0.72rem",
                                        fontWeight: 950,
                                        color: "#ffffff",
                                        letterSpacing: "-0.015em",
                                        lineHeight: 1.15,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        textShadow: "0 1px 3px rgba(0,0,0,0.25)"
                                      }}>
                                        {title}
                                      </div>
                                      {artist && (
                                        <div style={{
                                          fontSize: "0.58rem",
                                          fontWeight: 750,
                                          color: isBook ? "#d1fae5" : "#f3e8ff",
                                          letterSpacing: "0.01em",
                                          lineHeight: 1.1,
                                          whiteSpace: "nowrap",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          marginTop: "1px",
                                          textShadow: "0 1px 2px rgba(0,0,0,0.2)"
                                        }}>
                                          {artist}
                                        </div>
                                      )}
                                      <div style={{
                                        display: "inline-block",
                                        background: "rgba(0, 0, 0, 0.20)",
                                        backdropFilter: "blur(4px)",
                                        WebkitBackdropFilter: "blur(4px)",
                                        padding: "1px 6px",
                                        borderRadius: "999px",
                                        fontSize: "0.55rem",
                                        fontWeight: 800,
                                        color: isBook ? "#d1fae5" : "#f3e8ff",
                                        marginTop: "2px",
                                        border: "1px solid rgba(255, 255, 255, 0.2)"
                                      }}>
                                        {songAlb.audios.length} {songAlb.audios.length === 1 ? "Take" : "Takes"}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}

                          {/* 📅 Monthly Album Cover Cards (Curated Seasonal Jewel Vinyl Spectrum) */}
                          {sortedMonths.map(m => {
                            const dParts = m.monthKey.split("-");
                            const dObj = new Date(parseInt(dParts[0], 10), parseInt(dParts[1], 10) - 1, 1);
                            const shortLabel = dObj.toLocaleDateString("de-DE", { month: "short" }) + " " + String(dObj.getFullYear()).slice(2);
                            const theme = getMonthAlbumTheme(m.monthKey);

                            return (
                              <div
                                key={`stud-month-card-${m.monthKey}`}
                                onClick={() => {
                                  setSelectedStudentSongAlbum(null);
                                  setShowStudentFavoritesOnly(false);
                                  setSelectedPracticeCompanionAlbum(false);
                                  setSelectedDuettAlbum(false);
                                  setSelectedStudentMonth({ key: m.monthKey, label: m.monthLabel });
                                }}
                                style={{
                                  aspectRatio: "1 / 1",
                                  background: theme.bg,
                                  borderRadius: "16px",
                                  border: "1px solid rgba(255, 255, 255, 0.4)",
                                  padding: "8px 4px",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  cursor: "pointer",
                                  boxShadow: `0 6px 18px -2px ${theme.shadow}, 0 2px 6px rgba(0,0,0,0.06)`,
                                  position: "relative",
                                  overflow: "hidden",
                                  transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                                  textAlign: "center"
                                }}
                                className="hover-scale"
                                title={`Monats-Album: ${m.monthLabel}`}
                              >
                                {/* Specular Highlight Sheen */}
                                <div style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  height: "50%",
                                  background: "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0) 100%)",
                                  pointerEvents: "none"
                                }} />

                                {/* Luminous Floating Glass Capsule with White Calendar Icon */}
                                <div style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "11px",
                                  background: "rgba(255, 255, 255, 0.22)",
                                  backdropFilter: "blur(8px)",
                                  WebkitBackdropFilter: "blur(8px)",
                                  border: "1px solid rgba(255, 255, 255, 0.65)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.8)",
                                  marginTop: "2px",
                                  color: "#ffffff"
                                }}>
                                  <Calendar size={20} color="#ffffff" strokeWidth={2.4} />
                                </div>

                                {/* Typography */}
                                <div style={{ width: "100%", position: "relative", zIndex: 1, padding: "0 2px" }}>
                                  <div style={{
                                    fontSize: "0.70rem",
                                    fontWeight: 900,
                                    color: "#ffffff",
                                    letterSpacing: "-0.01em",
                                    lineHeight: 1.15,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    textShadow: "0 1px 3px rgba(0,0,0,0.25)"
                                  }}>
                                    {shortLabel}
                                  </div>
                                  <div style={{
                                    display: "inline-block",
                                    background: "rgba(0, 0, 0, 0.20)",
                                    backdropFilter: "blur(4px)",
                                    WebkitBackdropFilter: "blur(4px)",
                                    padding: "1px 6px",
                                    borderRadius: "999px",
                                    fontSize: "0.55rem",
                                    fontWeight: 800,
                                    color: "#ffffff",
                                    marginTop: "2px",
                                    border: "1px solid rgba(255, 255, 255, 0.2)"
                                  }}>
                                    {m.totalTakes} {m.totalTakes === 1 ? "Take" : "Takes"}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

                {/* 💽 Share to Audio-Biografie Playlist Modal */}
                {shareAudioModal && shareAudioModal.isOpen && (
                  <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.55)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 1100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                  }} onClick={() => !isSharingToPlaylist && setShareAudioModal(null)}>
                    <div style={{
                      background: '#ffffff',
                      borderRadius: '24px',
                      boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
                      border: '1px solid rgba(0,0,0,0.08)',
                      width: '100%',
                      maxWidth: '480px',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden'
                    }} onClick={(e) => e.stopPropagation()}>
                      
                      {/* Header */}
                      <div style={{
                        padding: '18px 24px',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#fafafa'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)'
                          }}>
                            <Share2 size={18} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>In Audio-Biografie teilen</h3>
                            <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Track in deiner persönlichen Playlist hinterlegen</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isSharingToPlaylist}
                          onClick={() => setShareAudioModal(null)}
                          style={{
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#64748b'
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Body */}
                      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        
                        {/* Track Title */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>Titel in der Playlist</label>
                          <input
                            type="text"
                            value={shareCustomTitle}
                            onChange={(e) => setShareCustomTitle(e.target.value)}
                            placeholder="z. B. Mein erstes Solo..."
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: '12px',
                              border: '1.5px solid #e2e8f0',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              outline: 'none',
                              background: '#f8fafc',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        {/* Playlist Selection */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>Ziel-Playliste wählen</label>
                            <button
                              type="button"
                              onClick={() => setShowNewPlaylistInput(!showNewPlaylistInput)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#34a853',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <Plus size={12} /> {showNewPlaylistInput ? 'Aus Liste wählen' : 'Neue Playliste erstellen'}
                            </button>
                          </div>

                          {showNewPlaylistInput ? (
                            <input
                              type="text"
                              value={newPlaylistTitle}
                              onChange={(e) => setNewPlaylistTitle(e.target.value)}
                              placeholder="Name der neuen Playlist (z.B. Akustik-Sessions)..."
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: '1.5px solid #34a853',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                outline: 'none',
                                background: '#f0fdf4',
                                boxSizing: 'border-box'
                              }}
                              autoFocus
                            />
                          ) : (
                            <select
                              value={sharePlaylistId}
                              onChange={(e) => setSharePlaylistId(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: '1.5px solid #e2e8f0',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                outline: 'none',
                                background: '#f8fafc',
                                cursor: 'pointer',
                                boxSizing: 'border-box'
                              }}
                            >
                              {availablePlaylists.map(pl => (
                                <option key={pl.id} value={pl.id}>
                                  {pl.title} ({pl.tracks?.length || 0} Tracks)
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Audio Processing Mode Selection */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>Audio-Processing für die Playlist</label>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {/* Pure Raw */}
                            <div
                              onClick={() => setShareProcessing('raw')}
                              style={{
                                padding: '12px',
                                borderRadius: '14px',
                                border: shareProcessing === 'raw' ? '2px solid #34a853' : '1.5px solid #e2e8f0',
                                background: shareProcessing === 'raw' ? '#f0fdf4' : '#ffffff',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 900, color: shareProcessing === 'raw' ? '#16a34a' : '#0f172a' }}>
                                <Mic size={14} />
                                <span>Pure Raw</span>
                              </div>
                              <span style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.3 }}>
                                Unverfälschter Original-Sound wie im Proberaum aufgenommen.
                              </span>
                            </div>

                            {/* Studio Master */}
                            <div
                              onClick={() => setShareProcessing('master')}
                              style={{
                                padding: '12px',
                                borderRadius: '14px',
                                border: shareProcessing === 'master' ? '2px solid #6366f1' : '1.5px solid #e2e8f0',
                                background: shareProcessing === 'master' ? '#f5f3ff' : '#ffffff',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 900, color: shareProcessing === 'master' ? '#6366f1' : '#0f172a' }}>
                                <Sparkles size={14} />
                                <span>Studio Master</span>
                              </div>
                              <span style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.3 }}>
                                High-End Dynamik-EQ, Röhrenwärme & Stereo-Breite.
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                          <button
                            type="button"
                            disabled={isSharingToPlaylist}
                            onClick={() => setShareAudioModal(null)}
                            style={{
                              flex: 1,
                              background: '#f1f5f9',
                              color: '#64748b',
                              border: 'none',
                              borderRadius: '12px',
                              padding: '11px',
                              fontSize: '0.82rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            Abbrechen
                          </button>
                          
                          <button
                            type="button"
                            disabled={isSharingToPlaylist || (showNewPlaylistInput && !newPlaylistTitle.trim())}
                            onClick={handleSaveShareToPlaylist}
                            style={{
                              flex: 2,
                              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '12px',
                              padding: '11px',
                              fontSize: '0.82rem',
                              fontWeight: 900,
                              cursor: isSharingToPlaylist ? 'wait' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                            }}
                          >
                            {isSharingToPlaylist ? (
                              <span>⏳ Verarbeite & Speichere...</span>
                            ) : (
                              <>
                                <Check size={16} />
                                <span>In Playliste speichern</span>
                              </>
                            )}
                          </button>
                        </div>

                      </div>

                    </div>
                  </div>
                )}

                {/* 👥 Synchronous Teacher-Student Duett-Deck Modal */}
                {duettModalData && (
                  <DuettDeckModal
                    isOpen={Boolean(duettModalData)}
                    onClose={() => setDuettModalData(null)}
                    teacherAudioUrl={duettModalData.teacherUrl}
                    teacherTitle={duettModalData.teacherTitle}
                    teacherBpm={duettModalData.teacherBpm}
                    songTag={duettModalData.songTag}
                    studentId={student.id}
                    schoolId={student.school_id}
                    studentFirstName={studentFirstName}
                    onSaveStudentTake={() => {
                      setLocalJuniorRecordingsTrigger(prev => prev + 1);
                    }}
                  />
                )}
              </div>
  );
}

