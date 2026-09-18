import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import {
  type Student,
  type MeisterwerkDocumentationModalProps,
  type ProgressItem,
  type ParsedStudentQuestion,
  type ParsedStudentAnnotation,
  formatPageNumbers,
  getCleanPageNotes,
  getCleanTeacherHomeworkText,
  formatStudentNoteDisplay,
  parseStudentQuestionFromNotes,
  parseStudentAnnotation,
  parseSongArtistAndTitle,
  SKILL_TAGS
} from './student/meisterwerk.types';
import {
  ALL_STICKERS,
  getUnifiedStickerStatus,
  getUnifiedStickersMap,
  cleanNotesText,
  filterNotesForStudent,
  isInternalMetadataNote,
  checkIsAudioTresorActive,
  checkIsAudioTresorReadOnly,
  type StickerUnlockContext,
  type StickerUnlockResult
} from '../domain/stickersAndTresor';
import {
  CassetteIcon,
  playCountInBeep,
  MasterworkAudioCapsule,
  InlineAudioPlayer,
  RetroCassettePlayer
} from './student/meisterwerk/MeisterwerkAudioPlayers';
import { SpeechDictationButton } from './student/SpeechDictationButton';
import {
  MeisterwerkDocumentTab,
  areSongsIdentical,
  levenshteinDistance,
  normalizeSongStr,
  extractSongArtistAndTitle
} from './student/meisterwerk/MeisterwerkDocumentTab';
import { MeisterwerkRecordingsTab } from './student/meisterwerk/MeisterwerkRecordingsTab';
import { MeisterwerkLogbuchTab } from './student/meisterwerk/MeisterwerkLogbuchTab';
import { MeisterwerkStickerAlbumTab } from './student/meisterwerk/MeisterwerkStickerAlbumTab';
import { MeisterwerkSkillRadarTab } from './student/meisterwerk/MeisterwerkSkillRadarTab';
import { GrooveTrainerStudioView } from './campus/GrooveTrainerStudioView';
import { GroovePracticeCompanion } from './groovelab/GroovePracticeCompanion';
import { resolveCampusStudentAvatar } from './student/studentAvatars.constants';
import { formatTeacherFullName } from '../utils/nameHelper';
import { getSimulatedNow } from './student/studentDateUtils';
import { broadcastPracticeUpdate } from '../utils/studentProgressEngine';
import { useMeisterwerkAudioRecording } from './student/meisterwerk/hooks/useMeisterwerkAudioRecording';
import { useMeisterwerkMatchGame } from './student/meisterwerk/hooks/useMeisterwerkMatchGame';
import { useMeisterwerkSkills } from './student/meisterwerk/hooks/useMeisterwerkSkills';
import { useMeisterwerkTts } from './student/meisterwerk/hooks/useMeisterwerkTts';
import { useMeisterwerkHomework } from './student/meisterwerk/hooks/useMeisterwerkHomework';
import { MeisterwerkHeader } from './student/meisterwerk/views/MeisterwerkHeader';
import { MeisterwerkSkillRadarDrawer } from './student/meisterwerk/views/MeisterwerkSkillRadarDrawer';
import { MeisterwerkModalsHub } from './student/meisterwerk/modals/MeisterwerkModalsHub';

const GrooveLoopstation = lazy(() => import('./groovelab/GrooveLoopstation').then(m => ({ default: m.GrooveLoopstation })));
const CampusTuner = lazy(() => import('./campus/CampusTuner').then(m => ({ default: m.CampusTuner })));
const EarLabStudioModal = lazy(() => import('./campus/EarLabStudioModal').then(m => ({ default: m.EarLabStudioModal })));
const AudioBiographyView = lazy(() => import('./campus/AudioBiographyView').then(m => ({ default: m.AudioBiographyView })));

// 100% Backward Compatible Re-Exports
export type {
  Student,
  MeisterwerkDocumentationModalProps,
  ProgressItem,
  ParsedStudentQuestion,
  ParsedStudentAnnotation,
  StickerUnlockContext,
  StickerUnlockResult
};
export {
  ALL_STICKERS,
  getUnifiedStickerStatus,
  getUnifiedStickersMap,
  cleanNotesText,
  filterNotesForStudent,
  isInternalMetadataNote,
  checkIsAudioTresorActive,
  checkIsAudioTresorReadOnly,
  formatPageNumbers,
  getCleanPageNotes,
  getCleanTeacherHomeworkText,
  formatStudentNoteDisplay,
  parseStudentQuestionFromNotes,
  parseStudentAnnotation,
  parseSongArtistAndTitle,
  SKILL_TAGS,
  SpeechDictationButton,
  InlineAudioPlayer,
  RetroCassettePlayer,
  MasterworkAudioCapsule,
  CassetteIcon,
  playCountInBeep,
  areSongsIdentical,
  levenshteinDistance,
  normalizeSongStr,
  extractSongArtistAndTitle
};

export const MeisterwerkDocumentationModal: React.FC<MeisterwerkDocumentationModalProps> = ({
  student,
  onClose,
  teacherId,
  teacherName: propTeacherName,
  schoolName: propSchoolName,
  initialLehrwerkId,
  initialViewMode,
  initialModalTab,
  onProfileClick,
  readOnly = false,
  isEmbed = false,
  isTeacherTools = false,
  uiLevel: propUiLevel,
  initialXp,
  initialStreak,
  initialPracticeMinutes,
  initialMasteredSongsCount,
  hasTresorStorage: propHasTresor,
  groupStudents: propGroupStudents,
  isParentUnlocked = false,
  parentPermissions: propParentPermissions,
  onSaveParentOverrides,
  isSoftLocked = false,
  onTriggerSoftLock,
  initialLehrwerke,
  initialSongs,
  initialProgressItems,
  initialLocalProgress,
  onSongsUpdated,
  isTeacherSandbox = false,
  onOpenAssignModal,
  schoolId: propSchoolId
}) => {
  const isTeacherSelf =
    isTeacherSandbox ||
    isTeacherTools ||
    student?.id === 'teacher-self' ||
    student?.id === 'teacher-studio-sandbox' ||
    (student as any)?.role === 'teacher' ||
    (student as any)?.is_teacher ||
    (student as any)?.role === 'admin';

  // UI Level Governance (SSOT in database, reactive sync)
  const resolveInitialUiLevel = (): 'junior' | 'teen' | 'pro' => {
    if (isTeacherSelf) return 'pro';
    const sId = student?.id;
    if (typeof window !== 'undefined' && sId && sId !== 'teacher-self') {
      const studentStorage = localStorage.getItem(`campus_student_ui_level_${sId}`);
      if (studentStorage === 'junior' || studentStorage === 'teen' || studentStorage === 'pro') {
        return studentStorage;
      }
    }
    const fromStudentObj = (student as any)?.campus_ui_level;
    if (fromStudentObj === 'junior' || fromStudentObj === 'teen' || fromStudentObj === 'pro') {
      return fromStudentObj;
    }
    if (propUiLevel) return propUiLevel;
    return 'junior';
  };

  const [uiLevel, setUiLevel] = useState<'junior' | 'teen' | 'pro'>(resolveInitialUiLevel);

  useEffect(() => {
    if (isTeacherSelf) return;
    const sId = student?.id;
    if (!sId || sId === 'teacher-self') return;
    supabase
      .from('users')
      .select('campus_ui_level')
      .eq('id', sId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.campus_ui_level) {
          setUiLevel(data.campus_ui_level as 'junior' | 'teen' | 'pro');
          try {
            localStorage.setItem(`campus_student_ui_level_${sId}`, data.campus_ui_level);
          } catch {}
        }
      });
  }, [student?.id, isTeacherSelf]);

  // Screen & Layout State
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const handleResize = () => setWindowWidth(typeof window !== 'undefined' ? window.innerWidth : 1200);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isInsideSimMobile = typeof document !== 'undefined' && !!document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait');
  const isInsideSimTabletLandscape = typeof document !== 'undefined' && !!document.querySelector('.sim-viewport-tablet, .sim-viewport-landscape');
  const isInsideSim = isInsideSimMobile || isInsideSimTabletLandscape;
  const isMobileView = (windowWidth <= 768 && !isInsideSimTabletLandscape) || isInsideSimMobile;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isMobileOrSim = isFullscreen || isMobileView || isInsideSim || windowWidth < 1024;
  const [useNotebookLayout] = useState(false);

  // Modal Tabs & View Modes
  const [activeModalTab, setActiveModalTab] = useState<'document' | 'logbook' | 'stickeralbum' | 'skillradar' | 'audiobiography'>(initialModalTab || 'document');
  const [activeViewMode, setActiveViewMode] = useState<'document' | 'recordings' | 'groovetrainer' | 'loopstation' | 'practice' | 'tuner' | 'earlab'>((initialViewMode as any) || 'document');
  const [activeSubView, setActiveSubView] = useState<'hub' | 'history' | 'repertoire'>('hub');
  const [hubTab, setHubTab] = useState<'modules' | 'protocol'>((student?.is_campus_active === false) ? 'protocol' : 'modules');
  const [mobileProtokollTab, setMobileProtokollTab] = useState<'repertoire' | 'homework'>('homework');
  const [recordingSearchQuery, setRecordingSearchQuery] = useState('');

  // Domain State
  const [progressItems, setProgressItems] = useState<ProgressItem[]>(() => initialProgressItems || []);
  const [assignedLehrwerke, setAssignedLehrwerke] = useState<any[]>(() => initialLehrwerke || []);
  const [globalLehrwerke, setGlobalLehrwerke] = useState<any[]>([]);
  const [activeSongSkills, setActiveSongSkills] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>(() => initialSongs || []);
  const [activeItem, setActiveItem] = useState<ProgressItem | null>(null);
  const [topicName, setTopicName] = useState('');
  const [status, setStatus] = useState<'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED'>('IN_PROGRESS');
  const [isCurrentHomework, setIsCurrentHomework] = useState(false);
  const [activeInputTab, setActiveInputTab] = useState<'free' | 'lehrwerk_page' | 'active_song'>('free');
  const [activeLehrwerkId, setActiveLehrwerkId] = useState<string | null>(initialLehrwerkId || null);
  const [activePageNumber, setActivePageNumber] = useState<number | null>(null);
  const [selectedActiveSongId, setSelectedActiveSongId] = useState<string | null>(null);
  const [certModalSong, setCertModalSong] = useState<any | null>(null);
  const [showAgeUiInfoModal, setShowAgeUiInfoModal] = useState(false);
  const [showSkillRadar, setShowSkillRadar] = useState(false);
  const [showProtokollOnboarding, setShowProtokollOnboarding] = useState<boolean>(() => {
    try {
      return localStorage.getItem('groovelab_protokoll_onboarding_seen') !== 'true';
    } catch {
      return false;
    }
  });
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showMatchConfetti, setShowMatchConfetti] = useState(false);
  const [studentNotesSavedToast, setStudentNotesSavedToast] = useState(false);

  // Group Students
  const effectiveGroupStudents = useMemo(() => {
    const list: any[] = [];
    const addStud = (s: any) => {
      if (s && s.id && !list.some(x => x.id === s.id)) list.push(s);
    };
    addStud(student);
    if (Array.isArray(propGroupStudents)) propGroupStudents.forEach(addStud);
    if (Array.isArray(student?.groupStudents)) student.groupStudents.forEach(addStud);
    return list;
  }, [student, propGroupStudents]);

  const studentFirstName = useMemo(() => (student.first_name || '').trim() || 'Musiker', [student.first_name]);
  const displayedStudentName = useMemo(() => {
    if (isTeacherSelf) return formatTeacherFullName(propTeacherName || student) || 'Aufgaben-Studio';
    return readOnly ? 'Aufgabenheft' : `${student.first_name}${student.last_name ? ' ' + student.last_name.trim().charAt(0) + '.' : ''}`;
  }, [readOnly, isTeacherSelf, propTeacherName, student.first_name, student.last_name]);

  const getCurrentTeacherId = useCallback(async (): Promise<string | null> => {
    if (teacherId) return teacherId;
    if ((student as any)?.teacher_id) return (student as any).teacher_id;
    return null;
  }, [teacherId, student]);

  const notifyHomeworkChange = useCallback(() => {
    window.dispatchEvent(new CustomEvent('campus_homework_updated', { detail: { studentId: student.id } }));
  }, [student.id]);

  const getItemWeek = useCallback((item: any): string => {
    if (!item?.updated_at) return '';
    const d = new Date(item.updated_at);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  }, []);

  const getLehrwerkColor = useCallback((title: string) => {
    const trimmed = (title || '').trim();
    const sorted = [...globalLehrwerke].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    const index = sorted.findIndex(b => (b.title || '').trim() === trimmed);
    const pos = index !== -1 ? index % 26 : Math.max(65, Math.min(90, trimmed.charCodeAt(0) || 65)) - 65;
    const hue = Math.round((pos / 25) * 360);
    return {
      from: `hsl(${hue}, 85%, 94%)`,
      to: `hsl(${hue}, 80%, 84%)`,
      text: `hsl(${hue}, 90%, 25%)`
    };
  }, [globalLehrwerke]);

  const fetchProgress = useCallback(async () => {
    if (!student.id) return;
    try {
      const { data } = await supabase
        .from('progress_matrix')
        .select('*')
        .eq('student_id', student.id)
        .order('updated_at', { ascending: false });
      if (data) setProgressItems(data);
    } catch (err) {
      console.warn('[Meisterwerk] fetchProgress notice:', err);
    }
  }, [student.id]);

  const loadLehrwerke = useCallback(async () => {
    try {
      const { data } = await supabase.from('campus_lehrwerke').select('*');
      if (data) setGlobalLehrwerke(data);
      const stored = localStorage.getItem('student_lehrwerke_progress');
      if (stored) {
        const parsed = JSON.parse(stored);
        setAssignedLehrwerke(parsed.filter((item: any) => item.studentId === student.id));
      }
    } catch {}
  }, [student.id]);

  const loadActiveSongSkills = useCallback(async () => {
    if (!student.id) return;
    try {
      const { data } = await supabase
        .from('user_song_skills')
        .select('*, songs(*)')
        .eq('user_id', student.id);
      if (data) setActiveSongSkills(data);
    } catch {}
  }, [student.id]);

  useEffect(() => {
    fetchProgress();
    loadLehrwerke();
    loadActiveSongSkills();
  }, [fetchProgress, loadLehrwerke, loadActiveSongSkills]);

  // Hook 1: Audio Recording
  const {
    isRecordingAudio,
    audioDuration,
    recordingBpm,
    setRecordingBpm,
    isRecordingMetronomeActive,
    setIsRecordingMetronomeActive,
    audioLabel,
    setAudioLabel,
    isUploadingAudio,
    recordCountInRemaining,
    cancelActiveRecordCountIn,
    startRecordingAudio,
    stopRecordingAudio,
    playMetronomeTick,
    formatRecordTime,
    recordingSavedToast,
    justRecordedAudioUrl,
    justRecordedAudioLabel,
    toggleFavoriteAudio,
    favoriteAudioUrls,
    handleRenameStudentAudio,
    handleDeleteStudentAudio
  } = useMeisterwerkAudioRecording({
    student,
    topicName,
    activeSubView,
    activeLehrwerkId,
    activePageNumber,
    selectedActiveSongId,
    homeworkNotesList: [],
    setHomeworkNotesList: () => {},
    syncHomeworkNotes: async () => {},
    notifyHomeworkChange
  });

  // Hook 2: Match Game
  const {
    showdownState,
    handleCommitStudentRating,
    lastMatchedAt,
    lastMatchedStudentPercent,
    lastMatchedTeacherPercent,
    matchHistory
  } = useMeisterwerkMatchGame({
    student,
    topicName,
    isTeacherMode: isTeacherTools,
    awardCampusXP: async () => {},
    awardSticker: () => {}
  });

  // Hook 3: Skills
  const {
    skillOverrides,
    handleSetSkillLevel,
    handleImproveSkill,
    handleTriggerSkillQuest,
    handleMasterAllSkills,
    customTags,
    handleAddCustomTag,
    insertOrToggleTagInText
  } = useMeisterwerkSkills({
    student,
    notifyHomeworkChange
  });

  // Hook 4: Neural TTS
  const {
    isTtsSpeaking,
    activeTtsKey,
    handleSpeakText,
    handleStopSpeaking,
    buildCompleteWeeklyHomeworkSpeechPhrases
  } = useMeisterwerkTts();

  // Hook 5: Homework
  const {
    viewingWeekOffset,
    setViewingWeekOffset,
    isTransferModalOpen,
    setIsTransferModalOpen,
    generalHomeworkNotes,
    setGeneralHomeworkNotes,
    teacherNotes,
    setTeacherNotes,
    homeworkNotesList,
    setHomeworkNotesList,
    pageHomeworkNotes,
    setPageHomeworkNotes,
    songHomeworkNotes,
    setSongHomeworkNotes,
    studentNotes,
    setStudentNotes,
    isStudentNotePrivate,
    setIsStudentNotePrivate,
    activeNoteTarget,
    setActiveNoteTarget,
    latestGeneralHomeworkNotesRef,
    latestTeacherNotesRef,
    hasChanges,
    setHasChanges,
    saving,
    getISOWeek,
    getTargetWeekIso,
    triggerDirectSongSave,
    triggerDebouncedSongSave,
    triggerDebouncedTeacherNoteSave,
    triggerDebouncedAutoSave,
    triggerImmediateAutoSave,
    syncHomeworkNotes,
    handleSave,
    sourceTransferData,
    hasTransferableHomework,
    handleExecuteBatchTransfer,
    handleRemoveSinglePageHomework,
    handleRemoveBookHomework,
    handleRemoveSongHomework,
    handleRemoveHomeworkItem,
    handleMasterSongDirect,
    handleReactivateSongDirect,
    handleMasterBookDirect,
    handleReactivateBookDirect,
    handleMasterSinglePageDirect,
    handleReactivateSinglePageDirect,
    handleKeepAudioTrack,
    handleHideAudioTrack
  } = useMeisterwerkHomework({
    student,
    readOnly,
    activeItem,
    topicName,
    setTopicName,
    status,
    setStatus,
    isCurrentHomework,
    setIsCurrentHomework,
    activeInputTab,
    setActiveInputTab,
    activeSubView,
    setActiveSubView,
    activeLehrwerkId,
    activePageNumber,
    selectedActiveSongId,
    assignedLehrwerke,
    setAssignedLehrwerke,
    globalLehrwerke,
    progressItems,
    setProgressItems,
    activeSongSkills,
    setActiveSongSkills,
    fetchProgress,
    loadLehrwerke,
    loadActiveSongSkills,
    notifyHomeworkChange,
    getCurrentTeacherId,
    effectiveGroupStudents,
    setShowMatchConfetti,
    setStudentNotesSavedToast,
    getLehrwerkColor,
    getItemWeek
  });

  // F-Key Fullscreen listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setIsFullscreen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderFullscreenButton = () => (
    <button
      type="button"
      onClick={() => setIsFullscreen(prev => !prev)}
      aria-label={isFullscreen ? "Vollbild beenden" : "Vollbildmodus aktivieren"}
      style={{
        background: 'rgba(255, 255, 255, 0.18)',
        border: '1px solid rgba(255, 255, 255, 0.28)',
        borderRadius: '50%',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '#ffffff'
      }}
    >
      <span>{isFullscreen ? '⤢' : '⤡'}</span>
    </button>
  );

  const renderCloseButton = () => {
    if (isEmbed) return null;
    return (
      <button
        type="button"
        onClick={onClose}
        aria-label="Aufgabenheft schließen"
        style={{
          background: 'rgba(255, 255, 255, 0.18)',
          border: '1px solid rgba(255, 255, 255, 0.28)',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#ffffff'
        }}
      >
        <span>✕</span>
      </button>
    );
  };

  const modalContainerRef = useRef<HTMLDivElement>(null);
  const portalTarget = typeof document !== 'undefined' ? ((document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait, .sim-viewport-tablet') as HTMLElement) || document.body) : null;

  const content = (
    <div
      ref={modalContainerRef}
      role={isEmbed ? undefined : "dialog"}
      aria-modal={isEmbed ? undefined : "true"}
      aria-label="Meisterwerk- & Hausaufgabendokumentation"
      style={{
        background: '#ffffff',
        borderRadius: isMobileOrSim ? '0' : '20px',
        width: '100%',
        maxWidth: '100%',
        height: isEmbed ? '100%' : (isMobileOrSim ? '100%' : '92vh'),
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <MeisterwerkHeader
        isMobileOrSim={isMobileOrSim}
        student={student}
        studentInstrument={(student as any)?.instrument}
        displayedStudentName={displayedStudentName}
        studentFirstName={studentFirstName}
        onProfileClick={onProfileClick}
        isTeacherSandbox={isTeacherSandbox}
        isTeacherTools={isTeacherTools}
        isTeacherSelf={isTeacherSelf}
        isTeacherMode={isTeacherTools}
        uiLevel={uiLevel}
        effectiveParentPermissions={propParentPermissions}
        activeViewMode={activeViewMode}
        setActiveViewMode={setActiveViewMode}
        activeModalTab={activeModalTab}
        setActiveModalTab={setActiveModalTab}
        activeSubView={activeSubView}
        setActiveSubView={setActiveSubView}
        hubTab={hubTab}
        setHubTab={setHubTab}
        mobileProtokollTab={mobileProtokollTab}
        setMobileProtokollTab={setMobileProtokollTab}
        recordingSearchQuery={recordingSearchQuery}
        setRecordingSearchQuery={setRecordingSearchQuery}
        onOpenAssignModal={onOpenAssignModal}
        renderFullscreenButton={renderFullscreenButton}
        renderCloseButton={renderCloseButton}
        setOnboardingStep={setOnboardingStep}
        setShowProtokollOnboarding={setShowProtokollOnboarding}
        setShowAgeUiInfoModal={setShowAgeUiInfoModal}
        resolveCampusStudentAvatar={resolveCampusStudentAvatar}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {activeModalTab === 'logbook' ? (
          <MeisterwerkLogbuchTab
            isMobileOrSim={isMobileOrSim}
            useNotebookLayout={useNotebookLayout}
            student={student}
            assignedLehrwerke={assignedLehrwerke}
            globalLehrwerke={globalLehrwerke}
            activeSongSkills={activeSongSkills}
            setActiveSongSkills={setActiveSongSkills}
            progressItems={progressItems}
            setProgressItems={setProgressItems}
            activeAudioPlayerRef={{ current: null } as any}
            playingAudioUrl={null}
            setPlayingAudioUrl={() => {}}
            notifyHomeworkChange={notifyHomeworkChange}
            getSongColor={() => ({ from: '#facc15', to: '#eab308', text: '#854d0e' })}
            renderSongVinylCover={() => null}
            isRecordingAudio={isRecordingAudio}
            activeRecordingSongId={null}
            selectedActiveSongId={selectedActiveSongId}
            recordingTargetRef={{ current: null } as any}
            stopRecordingAudio={stopRecordingAudio}
            startRecordingAudio={startRecordingAudio}
            audioDuration={audioDuration}
            readOnly={readOnly}
            getLehrwerkColor={getLehrwerkColor}
            setCertModalSong={setCertModalSong}
            resolvedSchoolName={propSchoolName || ''}
          />
        ) : activeModalTab === 'stickeralbum' ? (
          <MeisterwerkStickerAlbumTab
            isMobileOrSim={isMobileOrSim}
            readOnly={readOnly}
            isDevSimulationActive={false}
            setIsDevSimulationActive={() => {}}
            simulateMultiYearProgress={() => {}}
            resetStickerAlbum={() => {}}
            collectedStickers={{}}
            renderSchoolYearSelector={() => null}
            awardSticker={() => {}}
            awardedStickerToAnimate={null}
            setAwardedStickerToAnimate={() => {}}
            downloadShareCard={() => {}}
            topicName={topicName}
            actualStudentName={displayedStudentName}
            studentInstrument={(student as any)?.instrument}
            shareCard={undefined}
            selectedSchoolYear="2025/2026"
            currentSchoolYear="2025/2026"
            student={student}
            schoolName={propSchoolName || ''}
          />
        ) : activeModalTab === 'audiobiography' ? (
          <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Lade Audio-Biografie...</div>}>
            <AudioBiographyView
              student={student}
              teacherId={teacherId}
              isTeacher={isTeacherTools}
              onBackToHub={() => { setActiveModalTab('document'); setActiveSubView('hub'); }}
              isMobileOrSim={isMobileOrSim}
              studentUiLevel={uiLevel}
            />
          </Suspense>
        ) : activeViewMode === 'groovetrainer' ? (
          <GrooveTrainerStudioView
            student={student}
            onClose={() => { setActiveViewMode('document'); setHubTab('modules'); }}
            uiLevel={uiLevel}
            useNotebookLayout={true}
            homeworkNotesList={homeworkNotesList}
            onRewardXp={() => {}}
          />
        ) : activeViewMode === 'loopstation' ? (
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Loopstation...</div>}>
            <GrooveLoopstation
              student={student}
              homeworkNotesList={homeworkNotesList}
              setHomeworkNotesList={setHomeworkNotesList}
              syncHomeworkNotes={syncHomeworkNotes}
              fetchProgress={fetchProgress}
              notifyHomeworkChange={notifyHomeworkChange}
              readOnly={readOnly}
              setActiveViewMode={setActiveViewMode as any}
              useNotebookLayout={useNotebookLayout}
              hasTresorStorage={propHasTresor ?? false}
            />
          </Suspense>
        ) : activeViewMode === 'practice' ? (
          <GroovePracticeCompanion
            useNotebookLayout={useNotebookLayout}
            isCampusModule={true}
            studentId={student.id}
            student={student}
            uiLevel={uiLevel}
            onNavigateToRecordings={() => setActiveViewMode('recordings')}
            activeSongContext={null}
            onPracticeMinutesLogged={(minutes) => {
              broadcastPracticeUpdate(student.id, { durationMinutes: minutes, durationSeconds: minutes * 60 });
            }}
            onRhythmScoreUpdate={() => {}}
          />
        ) : activeViewMode === 'tuner' ? (
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Stimmgerät...</div>}>
            <CampusTuner uiLevel={uiLevel} />
          </Suspense>
        ) : activeViewMode === 'earlab' ? (
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade EarLab...</div>}>
            <EarLabStudioModal
              student={student}
              uiLevel={uiLevel}
              embedded={true}
              useNotebookLayout={true}
              onClose={() => { setActiveViewMode('document'); setHubTab('modules'); }}
              onRewardXp={async () => {}}
              onSessionComplete={() => {}}
            />
          </Suspense>
        ) : activeViewMode === 'recordings' ? (
          <MeisterwerkRecordingsTab
            isTeacherTools={isTeacherTools}
            readOnly={readOnly}
            student={student}
            activeSongSkills={activeSongSkills}
            audioDuration={audioDuration}
            audioLabel={audioLabel}
            audioSongTags={{}}
            availablePlaylists={[]}
            availableSongsForTagging={[]}
            expandedStudentAudioWeeks={{}}
            expandedTeacherAudioWeeks={{}}
            favoriteAudioUrls={favoriteAudioUrls}
            formatRecordTime={formatRecordTime}
            getISOWeek={getISOWeek}
            getMonthAlbumTheme={() => 'Aufnahmen'}
            getNormalizedSongTitle={(s: any) => typeof s === 'string' ? s : (s?.topic_name || '')}
            handleDeleteNote={() => {}}
            handleDeleteStudentAudio={handleDeleteStudentAudio}
            handleRenameStudentAudio={handleRenameStudentAudio}
            handleRenameTeacherAudio={() => {}}
            handleSaveEditedTeacherAudio={async () => {}}
            handleRevertTeacherAudioToOriginal={async () => {}}
            handleSaveShareToPlaylist={async () => {}}
            handleUpdateAudioSongTag={() => {}}
            hasTresorStorage={propHasTresor ?? false}
            homeworkNotes={generalHomeworkNotes}
            homeworkNotesList={homeworkNotesList}
            isBookAlbum={() => false}
            isCurrentHomework={isCurrentHomework}
            isMobileOrSim={isMobileOrSim}
            isRecordingAudio={isRecordingAudio}
            isRecordingMetronomeActive={isRecordingMetronomeActive}
            isRecordingPadActive={false}
            setIsRecordingPadActive={() => {}}
            isSharingToPlaylist={false}
            isStudentWeekExpanded={true}
            isTeacherHomeworkExpanded={true}
            isTeacherMode={isTeacherTools}
            isUploadingAudio={isUploadingAudio}
            matchesAudioSearch={() => true}
            mobileRecordingsTab="student"
            newPlaylistTitle=""
            openHomeworkWeekAccordions={[]}
            playMetronomeTick={playMetronomeTick}
            progressItems={progressItems}
            recordingBpm={recordingBpm}
            recordingMetronomeRef={{ current: null } as any}
            recordingSearchQuery={recordingSearchQuery}
            selectedStudentMonth={null}
            selectedStudentSongAlbum={null}
            selectedTeacherMonth={null}
            selectedTeacherSongAlbum={null}
            setAudioLabel={setAudioLabel}
            setIsRecordingMetronomeActive={setIsRecordingMetronomeActive}
            setIsStudentWeekExpanded={() => {}}
            setIsTeacherHomeworkExpanded={() => {}}
            setLocalJuniorRecordingsTrigger={() => {}}
            setMobileRecordingsTab={() => {}}
            setNewPlaylistTitle={() => {}}
            setOpenHomeworkWeekAccordions={() => {}}
            setRecordingBpm={setRecordingBpm}
            setSelectedStudentMonth={() => {}}
            setSelectedStudentSongAlbum={() => {}}
            setSelectedTeacherMonth={() => {}}
            setSelectedTeacherSongAlbum={() => {}}
            setShareAudioModal={() => {}}
            setShareCustomTitle={() => {}}
            setSharePlaylistId={() => {}}
            setShareProcessing={() => {}}
            setShowNewPlaylistInput={() => {}}
            setShowRecordingMetronomePopup={() => {}}
            setShowStudentFavoritesOnly={() => {}}
            setShowTeacherFavoritesOnly={() => {}}
            setShowTeacherHomeworkArchive={() => {}}
            shareAudioModal={null}
            shareCustomTitle=""
            sharePlaylistId=""
            shareProcessing="raw"
            showNewPlaylistInput={false}
            showRecordingMetronomePopup={false}
            showStudentFavoritesOnly={false}
            showTeacherFavoritesOnly={false}
            showTeacherHomeworkArchive={false}
            songs={songs}
            startRecordingAudio={startRecordingAudio}
            stopRecordingAudio={stopRecordingAudio}
            recordCountInRemaining={recordCountInRemaining}
            cancelActiveRecordCountIn={cancelActiveRecordCountIn}
            justRecordedAudioUrl={justRecordedAudioUrl}
            justRecordedAudioLabel={justRecordedAudioLabel}
            studentFirstName={studentFirstName}
            toggleFavoriteAudio={toggleFavoriteAudio}
            toggleStudentAudioWeek={() => {}}
            toggleTeacherAudioWeek={() => {}}
            topicName={topicName}
            useNotebookLayout={useNotebookLayout}
          />
        ) : (
          <MeisterwerkDocumentTab
            DIDACTIC_QUICK_TAGS={[]}
            PRESET_CHIPS={[]}
            activeBrush="NONE"
            activeLehrwerkId={activeLehrwerkId}
            activeNoteTarget={activeNoteTarget}
            activePageNumber={activePageNumber}
            activeSongSkills={activeSongSkills}
            activeSubView={activeSubView}
            activeTagPickerRowIndex={null}
            activeTtsKey={activeTtsKey}
            adjustTextareaHeight={() => {}}
            assignedLehrwerke={assignedLehrwerke}
            audioDuration={audioDuration}
            audioLabel={audioLabel}
            awardSticker={() => {}}
            buildCompleteWeeklyHomeworkSpeechPhrases={buildCompleteWeeklyHomeworkSpeechPhrases}
            cancelPlayAlongCountIn={() => {}}
            clickTimeoutRef={{ current: null } as any}
            collectedStickers={{}}
            customTags={customTags}
            effectiveGroupStudents={effectiveGroupStudents}
            effectiveTeacherFullName={displayedStudentName}
            expressionVal={50}
            fingerVal={50}
            formatRecordTime={formatRecordTime}
            generalHomeworkNotes={generalHomeworkNotes}
            getCanonicalSongKey={extractSongArtistAndTitle}
            getFeedbackForWeek={() => null}
            getHomeworkNoteItems={() => []}
            getISOWeek={getISOWeek}
            getItemWeek={getItemWeek}
            getLehrwerkColor={getLehrwerkColor}
            getNormalizedSongTitle={(s) => s.topic_name || ''}
            getSongColor={() => ({ from: '#facc15', to: '#eab308', text: '#854d0e' })}
            getTargetWeekIso={getTargetWeekIso}
            getWeekDateRange={() => ({ dateSpan: '' })}
            getWeeksBetween={() => 0}
            globalLehrwerke={globalLehrwerke}
            handleAddCustomTag={handleAddCustomTag}
            handleAssignLehrwerk={() => {}}
            handleAssignSongFromCatalog={() => {}}
            handleBackToHub={() => { setActiveSubView('hub'); }}
            handleCheckMatch={() => {}}
            handleCommitStudentRating={handleCommitStudentRating}
            handleCopyShareLink={() => {}}
            handleCreateAndAssignLehrwerk={() => {}}
            handleCreateAndAssignSong={() => {}}
            handleDeleteNote={() => {}}
            handleDeletePageNote={() => {}}
            handleDeleteSingleNoteItem={() => {}}
            handlePageDoubleClick={() => {}}
            handleRemoveLehrwerk={() => {}}
            handleRemoveSong={() => {}}
            handleResetAllCurrentHomework={() => {}}
            handleResolveStudentQuestion={() => {}}
            handleSave={handleSave}
            handleSaveStudentQuestion={() => {}}
            handleSetRowTag={() => {}}
            handleShareEmail={() => {}}
            handleSpeakText={handleSpeakText}
            handleStartPlayAlongRecording={() => {}}
            handleStopSpeaking={handleStopSpeaking}
            handleStudentRatingChange={() => {}}
            handleToggleMatchMode={() => {}}
            handleTogglePresetChip={() => {}}
            hasTresorStorage={propHasTresor ?? false}
            hasTransferableHomework={hasTransferableHomework}
            homeworkNotes={generalHomeworkNotes}
            homeworkNotesList={homeworkNotesList}
            hubTab={hubTab}
            insertOrToggleTagInText={insertOrToggleTagInText}
            isCampusActive={student.is_campus_active ?? true}
            isCountInEnabled={false}
            isCurrentHomework={isCurrentHomework}
            isFullscreen={isFullscreen}
            isInsideSim={isInsideSim}
            isLinkCopied={false}
            isMatchModeEnabled={false}
            isMatchRevealed={false}
            isMobileOrSim={isMobileOrSim}
            isMobileView={isMobileView}
            isQuestionEditorOpen={false}
            isRecordingAudio={isRecordingAudio}
            isRecordingMetronomeActive={isRecordingMetronomeActive}
            isSavingFeedback={false}
            isSavingQuestion={false}
            isShareMenuOpen={false}
            isSongMatch={areSongsIdentical}
            isStudentNotePrivate={isStudentNotePrivate}
            isStudentRatingCommitted={false}
            isSubSlidersExpanded={false}
            isTeacherMode={isTeacherTools}
            isTeacherTools={isTeacherTools}
            isTeacherSelf={isTeacherSelf}
            isTtsSpeaking={isTtsSpeaking}
            isUploadingAudio={isUploadingAudio}
            lastClickRef={{ current: null } as any}
            lastMatchedAt={lastMatchedAt}
            lastMatchedStudentPercent={lastMatchedStudentPercent}
            lastMatchedTeacherPercent={lastMatchedTeacherPercent}
            latestGeneralHomeworkNotesRef={latestGeneralHomeworkNotesRef}
            latestTeacherNotesRef={latestTeacherNotesRef}
            matchHistory={matchHistory}
            mobileProtokollTab={mobileProtokollTab}
            newCustomTagInput=""
            newLehrwerkLoading={false}
            newLehrwerkPages=""
            newLehrwerkTitle=""
            newSongArtist=""
            newSongTitle=""
            onClose={onClose}
            onOpenAssignModal={onOpenAssignModal}
            pageHomeworkNotes={pageHomeworkNotes}
            pageNotesSelectionRef={{ current: null } as any}
            pageNotesTextareaRef={{ current: null } as any}
            parsedStudentQuestion={null}
            pendingFeedbackStatus={null}
            pendingFeedbackTags={[]}
            playAlongCountInRemaining={null}
            playMetronomeTick={playMetronomeTick}
            progressItems={progressItems}
            questionDraftText=""
            readOnly={readOnly}
            recordingBpm={recordingBpm}
            renderSongVinylCover={() => null}
            renderTextWithDidacticBadges={(txt) => txt}
            rhythmVal={50}
            saveFeedback={() => {}}
            schoolId={propSchoolId}
            selectActiveSong={() => {}}
            selectTextbookPage={() => {}}
            selectedActiveSongId={selectedActiveSongId}
            selectedCategoryFilter={null}
            selectedHistoryWeek={null}
            setActiveBrush={() => {}}
            setActiveInputTab={setActiveInputTab}
            setActiveLehrwerkId={setActiveLehrwerkId}
            setActiveModalTab={setActiveModalTab}
            setActiveNoteTarget={setActiveNoteTarget}
            setActivePageNumber={setActivePageNumber}
            setActiveSongSkills={setActiveSongSkills}
            setActiveSubView={setActiveSubView}
            setActiveTagPickerRowIndex={() => {}}
            setActiveViewMode={setActiveViewMode}
            setAudioLabel={setAudioLabel}
            setExpressionVal={() => {}}
            setFingerVal={() => {}}
            setGeneralHomeworkNotes={setGeneralHomeworkNotes}
            setHasChanges={setHasChanges}
            setHomeworkNotesList={setHomeworkNotesList}
            setHubTab={setHubTab}
            setIsCountInEnabled={() => {}}
            setIsCurrentHomework={setIsCurrentHomework}
            setIsNotesFocused={() => {}}
            setIsQuestionEditorOpen={() => {}}
            setIsRecordingMetronomeActive={setIsRecordingMetronomeActive}
            setIsSavingFeedback={() => {}}
            setIsShareMenuOpen={() => {}}
            setIsStudentNotePrivate={setIsStudentNotePrivate}
            setIsSubSlidersExpanded={() => {}}
            setIsTransferModalOpen={setIsTransferModalOpen}
            setMobileProtokollTab={setMobileProtokollTab}
            setNewCustomTagInput={() => {}}
            setNewLehrwerkPages={() => {}}
            setNewLehrwerkTitle={() => {}}
            setNewSongArtist={() => {}}
            setNewSongTitle={() => {}}
            setPageChunk={() => {}}
            setPageHomeworkNotes={setPageHomeworkNotes}
            setPendingFeedbackStatus={() => {}}
            setPendingFeedbackTags={() => {}}
            setQuestionDraftText={() => {}}
            setRecordingBpm={setRecordingBpm}
            setRhythmVal={() => {}}
            setSelectedHistoryWeek={() => {}}
            setShowAllPagesGrid={() => {}}
            setShowAssignDropdown={() => {}}
            setShowCreateLehrwerkModal={() => {}}
            setShowCreateSongModal={() => {}}
            setShowPlayAlongMetronomePopup={() => {}}
            setSongHomeworkNotes={setSongHomeworkNotes}
            setSongModalTab={() => {}}
            setSongProgressPercent={() => {}}
            setSongSearch={() => {}}
            setStatus={setStatus}
            setStudentNotes={setStudentNotes}
            setTeacherNotes={setTeacherNotes}
            setViewingWeekOffset={setViewingWeekOffset}
            shareMenuRef={{ current: null } as any}
            showAssignDropdown={false}
            showCreateLehrwerkModal={false}
            showCreateSongModal={false}
            showMatchConfetti={showMatchConfetti}
            showPlayAlongMetronomePopup={false}
            showdownState={showdownState}
            songHomeworkNotes={songHomeworkNotes}
            songModalTab="search"
            songNotesSelectionRef={{ current: null } as any}
            songNotesTextareaRef={{ current: null } as any}
            songProgressPercent={0}
            songSearch=""
            songs={songs}
            sortedAssignedLehrwerke={assignedLehrwerke}
            status={status}
            stopRecordingAudio={stopRecordingAudio}
            student={student}
            studentFirstName={studentFirstName}
            studentNotes={studentNotes}
            studentNotesSelectionRef={{ current: null } as any}
            studentNotesTextareaRef={{ current: null } as any}
            studentRating={50}
            studentRatingUpdatedAt={null}
            teacherId={teacherId}
            teacherNotes={teacherNotes}
            teacherNotesTextareaRef={{ current: null } as any}
            textbookPageChunkIndex={0}
            toggleStudentFocusPage={() => {}}
            topicName={topicName}
            triggerDebouncedAutoSave={triggerDebouncedAutoSave}
            triggerDebouncedSongSave={triggerDebouncedSongSave}
            triggerDebouncedTeacherNoteSave={triggerDebouncedTeacherNoteSave}
            triggerDirectSave={() => {}}
            triggerDirectSongSave={triggerDirectSongSave}
            triggerImmediateAutoSave={triggerImmediateAutoSave}
            uiLevel={uiLevel}
            parentPermissions={propParentPermissions}
            updateLehrwerkVisibility={() => {}}
            useNotebookLayout={useNotebookLayout}
            viewingWeekOffset={viewingWeekOffset}
          />
        )}
      </div>
    </div>
  );

  return (
    <>
      {portalTarget ? (
        createPortal(
          <div
            className="meisterwerk-modal-portal-overlay"
            style={{
              position: isInsideSim ? 'absolute' : 'fixed',
              inset: 0,
              zIndex: 99999,
              background: isFullscreen ? 'transparent' : (isMobileOrSim ? '#ffffff' : 'rgba(9, 9, 11, 0.85)'),
              backdropFilter: isFullscreen ? 'none' : 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: (isFullscreen || isInsideSim || isMobileView) ? '0' : '20px',
              fontFamily: '"Inter", sans-serif',
              overflow: 'hidden'
            }}
          >
            {content}
          </div>,
          portalTarget
        )
      ) : content}

      <MeisterwerkSkillRadarDrawer
        isOpen={showSkillRadar}
        onClose={() => setShowSkillRadar(false)}
      >
        <MeisterwerkSkillRadarTab
          progressItems={progressItems}
          generalHomeworkNotes={generalHomeworkNotes}
          latestGeneralHomeworkNotesRef={latestGeneralHomeworkNotesRef}
          homeworkNotes={generalHomeworkNotes}
          homeworkNotesList={homeworkNotesList}
          skillOverrides={skillOverrides}
          pendingTargetFocusTags={[]}
          readOnly={readOnly}
          isTeacherTools={isTeacherTools}
          isMobileView={isMobileView}
          useNotebookLayout={useNotebookLayout}
          uiLevel={uiLevel}
          teacherName={displayedStudentName}
          studentName={studentFirstName}
          instrumentName={(student as any)?.instrument || ''}
          handleMasterAllSkills={handleMasterAllSkills}
          handleTriggerSkillQuest={handleTriggerSkillQuest}
          handleSetSkillLevel={handleSetSkillLevel}
          renderTextWithDidacticBadges={(t) => t}
        />
      </MeisterwerkSkillRadarDrawer>

      <MeisterwerkModalsHub
        certModalSong={certModalSong}
        onCloseCert={() => setCertModalSong(null)}
        isTransferModalOpen={isTransferModalOpen}
        onCloseTransfer={() => setIsTransferModalOpen(false)}
        targetWeekNum={getTargetWeekIso(viewingWeekOffset).split('-W')[1] || ''}
        targetWeekIso={getTargetWeekIso(viewingWeekOffset)}
        targetDateSpan=""
        sourceWeekNum={(() => {
          const prevTarget = getSimulatedNow();
          prevTarget.setDate(prevTarget.getDate() + ((viewingWeekOffset - 1) * 7));
          return getISOWeek(prevTarget).split('-W')[1] || '';
        })()}
        sourceLehrwerke={sourceTransferData.sourceLW}
        sourceSongs={sourceTransferData.sourceS}
        sourceAudios={sourceTransferData.sourceA}
        onExecuteTransfer={handleExecuteBatchTransfer}
        showAgeUiInfoModal={showAgeUiInfoModal}
        onCloseAgeUiInfoModal={() => setShowAgeUiInfoModal(false)}
        isTeacherSandbox={isTeacherSandbox}
        isTeacherTools={isTeacherTools}
        isTeacherSelf={isTeacherSelf}
        isTeacherMode={isTeacherTools}
        uiLevel={uiLevel}
        studentFirstName={studentFirstName}
        recSuccess={false}
        recTargetLevel="teen"
        setRecTargetLevel={() => {}}
        recNote=""
        setRecNote={() => {}}
        isSavingRec={false}
        handleSendTeacherRecommendation={async () => {}}
        showProtokollOnboarding={showProtokollOnboarding}
        onCloseProtokollOnboarding={() => {
          try { localStorage.setItem('groovelab_protokoll_onboarding_seen', 'true'); } catch {}
          setShowProtokollOnboarding(false);
        }}
        onboardingStep={onboardingStep}
        setOnboardingStep={setOnboardingStep}
        recordingSavedToast={recordingSavedToast}
        studentNotesSavedToast={studentNotesSavedToast}
      />
    </>
  );
};

export default MeisterwerkDocumentationModal;
