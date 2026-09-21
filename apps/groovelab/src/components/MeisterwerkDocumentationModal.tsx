import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Maximize2, Minimize2, X } from 'lucide-react';
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
  SKILL_TAGS,
  DIDACTIC_QUICK_TAGS,
  PRESET_CHIPS,
  getHomeworkNoteItems
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
import { formatTeacherFullName, copyTextToClipboard, capitalizeFirstLetter, formatSongTitleCase } from '../utils/nameHelper';
import { getCanonicalQrLandingUrl } from '../utils/tenantUrlHelper';
import { getSimulatedNow, CANONICAL_LEHRWERK_COLOR, getLehrwerkColor as getLehrwerkColorUtil } from './student/studentDateUtils';
import { broadcastPracticeUpdate } from '../utils/studentProgressEngine';
import { useMeisterwerkAudioRecording } from './student/meisterwerk/hooks/useMeisterwerkAudioRecording';
import { useMeisterwerkMatchGame } from './student/meisterwerk/hooks/useMeisterwerkMatchGame';
import { useMeisterwerkSkills } from './student/meisterwerk/hooks/useMeisterwerkSkills';
import { useMeisterwerkTts } from './student/meisterwerk/hooks/useMeisterwerkTts';
import { useMeisterwerkHomework, getCanonicalSongKey, getNormalizedSongTitle } from './student/meisterwerk/hooks/useMeisterwerkHomework';
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
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Modal Tabs & View Modes
  const [activeModalTab, setActiveModalTab] = useState<'document' | 'logbook' | 'stickeralbum' | 'skillradar' | 'audiobiography'>(initialModalTab || 'document');
  const [activeViewMode, setActiveViewMode] = useState<'document' | 'recordings' | 'groovetrainer' | 'loopstation' | 'practice' | 'tuner' | 'earlab'>((initialViewMode as any) || 'document');
  const [activeSubView, setActiveSubView] = useState<'hub' | 'history' | 'repertoire'>('hub');
  const [hubTab, setHubTab] = useState<'modules' | 'protocol'>((student?.is_campus_active === false) ? 'protocol' : 'modules');
  const [mobileProtokollTab, setMobileProtokollTab] = useState<'repertoire' | 'homework'>('homework');
  const [recordingSearchQuery, setRecordingSearchQuery] = useState('');

  useEffect(() => {
    if (initialViewMode) {
      setActiveViewMode(initialViewMode as any);
    }
  }, [initialViewMode]);

  useEffect(() => {
    if (initialModalTab) {
      setActiveModalTab(initialModalTab);
    }
  }, [initialModalTab]);

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
  const [openHomeworkWeekAccordions, setOpenHomeworkWeekAccordions] = useState<string[]>([]);
  const [expandedStudentAudioWeeks, setExpandedStudentAudioWeeks] = useState<Record<string, boolean>>({});
  const [expandedTeacherAudioWeeks, setExpandedTeacherAudioWeeks] = useState<Record<string, boolean>>({});

  const toggleStudentAudioWeek = useCallback((week: string) => {
    setExpandedStudentAudioWeeks(prev => ({ ...prev, [week]: !prev[week] }));
  }, []);

  const toggleTeacherAudioWeek = useCallback((week: string) => {
    setExpandedTeacherAudioWeeks(prev => ({ ...prev, [week]: !prev[week] }));
  }, []);

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

  const getLehrwerkColor = useCallback((_title?: string) => {
    return CANONICAL_LEHRWERK_COLOR;
  }, []);

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

  const loadSongs = useCallback(async () => {
    const sId = student?.school_id || propSchoolId;
    try {
      let query = supabase.from('songs').select('*');
      if (sId) {
        query = query.or(`school_id.eq.${sId},school_id.is.null`);
      }
      const { data } = await query.order('title');
      if (data) setSongs(data);
    } catch (e) {
      console.warn('[Meisterwerk] Error loading songs:', e);
    }
  }, [student?.school_id, propSchoolId]);

  useEffect(() => {
    fetchProgress();
    loadLehrwerke();
    loadActiveSongSkills();
    loadSongs();
  }, [fetchProgress, loadLehrwerke, loadActiveSongSkills, loadSongs]);

  // Hook 1: Homework
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

  // Share & Count-In States
  const [isCountInEnabled, setIsCountInEnabled] = useState<boolean>(true);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState<boolean>(false);
  const [isLinkCopied, setIsLinkCopied] = useState<boolean>(false);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);
  const studentNotesSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setIsShareMenuOpen(false);
      }
    };
    if (isShareMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isShareMenuOpen]);

  // Hook 2: Audio Recording
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
    playAlongCountInRemaining,
    cancelPlayAlongCountIn,
    handleStartPlayAlongRecording,
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
    homeworkNotesList,
    setHomeworkNotesList,
    syncHomeworkNotes,
    notifyHomeworkChange,
    isCountInEnabled,
    setIsCountInEnabled
  });

  // Hook 3: Match Game
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

  // Hook 4: Skills
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

  // Hook 5: Neural TTS
  const {
    isTtsSpeaking,
    activeTtsKey,
    handleSpeakText,
    handleStopSpeaking,
    buildCompleteWeeklyHomeworkSpeechPhrases
  } = useMeisterwerkTts();

  const parsedStudentQuestion = useMemo(() => {
    return parseStudentQuestionFromNotes(homeworkNotesList);
  }, [homeworkNotesList]);

  const getWeekDateRange = useCallback((offset: number) => {
    const target = getSimulatedNow();
    target.setDate(target.getDate() + (offset * 7));

    const day = target.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(target);
    monday.setDate(target.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startDay = monday.getDate();
    const endDay = sunday.getDate();
    const startMonth = monday.toLocaleDateString('de-DE', { month: 'short' }).replace('.', '');
    const endMonth = sunday.toLocaleDateString('de-DE', { month: 'short' }).replace('.', '');

    const dateSpan = startMonth === endMonth
      ? `${startDay}. – ${endDay}. ${startMonth}`
      : `${startDay}. ${startMonth} – ${endDay}. ${endMonth}`;

    let label = 'Diese Woche';
    if (offset === -1) label = 'Letzte Woche';
    else if (offset < -1) label = `Vor ${Math.abs(offset)} Wochen`;
    else if (offset === 1) label = 'Folgewoche';
    else if (offset > 1) label = `In ${offset} Wochen`;
    else if (offset === 0) label = 'Diese Woche';

    return { dateSpan, label };
  }, []);

  const handleSaveStudentQuestion = useCallback(async (qText: string) => {
    const trimmed = qText.trim();
    if (!trimmed || !student?.id) return;
    try {
      const isoNow = new Date().toISOString();
      const tag = `STUDENT_QUESTION:${isoNow}|${trimmed}`;
      const filtered = (homeworkNotesList || []).filter(
        n => typeof n === 'string' && !n.startsWith('STUDENT_QUESTION:') && !n.startsWith('❓ Frage für den Unterricht:')
      );
      const updatedList = [tag, ...filtered];
      setHomeworkNotesList(updatedList);
      try {
        localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(updatedList));
      } catch {}

      const { error } = await supabase.rpc('save_student_homework_question', {
        p_student_id: student.id,
        p_question_text: trimmed
      });
      if (error) {
        console.warn('[handleSaveStudentQuestion] RPC notice, saving via syncHomeworkNotes fallback:', error);
        await syncHomeworkNotes(updatedList);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus_student_question_updated', { detail: { studentId: student.id } }));
      }
      notifyHomeworkChange();
      setStudentNotesSavedToast(true);
      setTimeout(() => setStudentNotesSavedToast(false), 2500);
    } catch (err) {
      console.error('Fehler beim Speichern der Schülerfrage:', err);
    }
  }, [student?.id, homeworkNotesList, syncHomeworkNotes, notifyHomeworkChange, setHomeworkNotesList, setStudentNotesSavedToast]);

  const handleResolveStudentQuestion = useCallback(async () => {
    if (!student?.id) return;
    try {
      const updatedList = (homeworkNotesList || []).filter(
        n => typeof n === 'string' && !n.startsWith('STUDENT_QUESTION:') && !n.startsWith('❓ Frage für den Unterricht:')
      );
      setHomeworkNotesList(updatedList);
      try {
        localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(updatedList));
      } catch {}

      const { error } = await supabase.rpc('resolve_student_homework_question', {
        p_student_id: student.id
      });
      if (error) {
        console.warn('[handleResolveStudentQuestion] RPC notice, resolving via syncHomeworkNotes fallback:', error);
        await syncHomeworkNotes(updatedList);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus_student_question_updated', { detail: { studentId: student.id } }));
      }
      notifyHomeworkChange();
    } catch (err) {
      console.error('Fehler beim Erledigen der Schülerfrage:', err);
    }
  }, [student?.id, homeworkNotesList, syncHomeworkNotes, notifyHomeworkChange, setHomeworkNotesList]);

  const handleDeleteNote = useCallback(async (noteIndexOrUrl: number | string, optionalUrl?: string) => {
    try {
      const targetUrl: string | undefined = typeof noteIndexOrUrl === 'string' ? noteIndexOrUrl : optionalUrl;
      const targetIndex: number = typeof noteIndexOrUrl === 'number' ? noteIndexOrUrl : -1;

      let noteToDelete = targetIndex >= 0 ? homeworkNotesList[targetIndex] : undefined;
      if (!noteToDelete && targetUrl) {
        noteToDelete = homeworkNotesList.find(n => typeof n === 'string' && n.includes(targetUrl));
      }

      let updatedNotesList = [...homeworkNotesList];
      if (targetIndex >= 0) {
        updatedNotesList.splice(targetIndex, 1);
      } else if (noteToDelete) {
        updatedNotesList = updatedNotesList.filter(n => n !== noteToDelete);
      }

      setHomeworkNotesList(updatedNotesList);
      await syncHomeworkNotes(updatedNotesList);
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error deleting note:', e);
    }
  }, [homeworkNotesList, syncHomeworkNotes, notifyHomeworkChange, setHomeworkNotesList]);

  // 🏷️ Preset Quick-Chips
  const handleTogglePresetChip = useCallback((chip: { label: string; text: string; isBpm?: boolean }, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    const current = latestGeneralHomeworkNotesRef.current !== undefined
      ? latestGeneralHomeworkNotesRef.current
      : generalHomeworkNotes;

    let lines = current.split('\n').map(s => s.trim()).filter(Boolean);

    if (chip.isBpm) {
      const bpmIdx = lines.findIndex(l => l.toLowerCase().includes('bpm'));
      if (bpmIdx !== -1) {
        lines.splice(bpmIdx, 1);
      } else {
        lines.push('Übe diesen Rhythmus präzise auf den Klick (60 BPM).');
      }
    } else {
      const foundIdx = lines.findIndex(l => l === chip.text || l.includes(chip.text));
      if (foundIdx !== -1) {
        lines.splice(foundIdx, 1);
      } else {
        lines.push(chip.text);
      }
    }

    const nextText = lines.join('\n');
    latestGeneralHomeworkNotesRef.current = nextText;
    setGeneralHomeworkNotes(nextText);
    studentNotesSelectionRef.current = { start: nextText.length, end: nextText.length };

    const specialNotes = (homeworkNotesList || []).filter(n => typeof n === 'string' && isInternalMetadataNote(n));
    const noteLines = nextText.split('\n').map(s => s.trim()).filter(s => s.length > 0 && !isInternalMetadataNote(s));
    const combined = [...specialNotes, ...noteLines];
    setHomeworkNotesList(combined);

    try {
      localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(combined));
      localStorage.setItem(`campus_homework_week_${student.id}`, getISOWeek());
    } catch {}

    triggerImmediateAutoSave();
  }, [generalHomeworkNotes, latestGeneralHomeworkNotesRef, homeworkNotesList, setGeneralHomeworkNotes, setHomeworkNotesList, student.id, getISOWeek, triggerImmediateAutoSave]);

  // 🗑️ Wochenaufgabe komplett leeren & zurücksetzen
  const handleResetAllCurrentHomework = useCallback(async () => {
    try {
      const activeIds = progressItems.filter(item => item.is_current_homework).map(item => item.id).filter(Boolean);
      if (activeIds.length > 0) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: false, status: 'IN_PROGRESS' })
          .in('id', activeIds);
      }

      // Reset Lehrwerke in localStorage
      const stored = localStorage.getItem('student_lehrwerke_progress');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const updated = parsed.map((item: any) => {
            if (item.studentId === student.id && item.pageStates) {
              const pageStates = { ...item.pageStates };
              Object.keys(pageStates).forEach(pKey => {
                if (pageStates[pKey]?.status === 'homework' || pageStates[pKey]?.isCurrentHomework) {
                  pageStates[pKey] = {
                    ...pageStates[pKey],
                    status: 'locked',
                    isCurrentHomework: false,
                    updatedAt: new Date().toISOString()
                  };
                }
              });
              return { ...item, pageStates };
            }
            return item;
          });
          localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
          setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
          loadLehrwerke();
        } catch (e) {}
      }

      // Clear local storage for song homeworks
      (activeSongSkills || []).forEach((skill: any) => {
        try {
          localStorage.setItem(`song_hw_${student.id}_${skill.id}`, 'false');
          if (skill.song_id) localStorage.setItem(`song_hw_${student.id}_${skill.song_id}`, 'false');
        } catch (e) {}
      });

      setIsCurrentHomework(false);
      setGeneralHomeworkNotes('');
      setTeacherNotes('');
      setHomeworkNotesList([]);
      try {
        const currentIso = getTargetWeekIso(viewingWeekOffset);
        localStorage.removeItem(`week_transferred_${student.id}_${currentIso}`);
        localStorage.removeItem(`campus_homework_notes_${student.id}`);
        localStorage.removeItem(`campus_homework_week_${student.id}`);
      } catch (e) {}
      await fetchProgress();
      await loadActiveSongSkills();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error resetting current homework:', e);
    }
  }, [progressItems, student.id, activeSongSkills, viewingWeekOffset, getTargetWeekIso, fetchProgress, loadActiveSongSkills, loadLehrwerke, notifyHomeworkChange, setIsCurrentHomework, setGeneralHomeworkNotes, setTeacherNotes, setHomeworkNotesList, setAssignedLehrwerke]);

  // 📖 Lehrwerk zuweisen
  const handleAssignLehrwerk = useCallback((lehrwerkId: string) => {
    if (!lehrwerkId) return;
    const book = globalLehrwerke.find(b => String(b.id) === String(lehrwerkId));
    if (!book) return;

    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];

      if (parsed.some((item: any) => String(item.studentId) === String(student.id) && String(item.lehrwerkId) === String(lehrwerkId))) {
        return;
      }

      const newAssignment = {
        studentId: student.id,
        lehrwerkId: lehrwerkId,
        bookTitle: book.title,
        lehrwerkTitle: book.title,
        totalPages: book.totalPages || 50,
        assignedAt: new Date().toISOString(),
        visibility: 'private',
        pageStates: {}
      };

      const updated = [...parsed, newAssignment];
      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      setAssignedLehrwerke(prev => [...prev.filter(a => String(a.lehrwerkId) !== String(lehrwerkId)), newAssignment]);
      loadLehrwerke();
      setActiveLehrwerkId(lehrwerkId);
    } catch (e) {
      console.error('Error assigning lehrwerk:', e);
    }
  }, [globalLehrwerke, student.id, loadLehrwerke, setActiveLehrwerkId, setAssignedLehrwerke]);

  // 🗑️ Seiten-Notiz löschen
  const handleDeletePageNote = useCallback(async (bookTitle: string, pageNum: number) => {
    try {
      const book = globalLehrwerke.find(b => b.title === bookTitle);
      if (!book) return;

      const stored = localStorage.getItem('student_lehrwerke_progress');
      if (stored) {
        const parsed = JSON.parse(stored);
        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === book.id) {
            const pageStates = { ...item.pageStates };
            if (pageStates[pageNum]) {
              pageStates[pageNum] = {
                ...pageStates[pageNum],
                homeworkNotes: '',
                homework_notes: ''
              };
            }
            return { ...item, pageStates };
          }
          return item;
        });
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      }

      const currentWeek = getISOWeek();
      const existing = progressItems.find(item =>
        item.topic_name === `${bookTitle} - Seite ${pageNum}` &&
        item.updated_at &&
        getISOWeek(item.updated_at) === currentWeek
      );

      if (existing?.id) {
        const { error } = await supabase
          .from('progress_matrix')
          .update({ homework_notes: '' })
          .eq('id', existing.id);
        if (error) throw error;
      }

      await fetchProgress();
      loadLehrwerke();
      notifyHomeworkChange();
    } catch (err) {
      console.error('Error deleting page note:', err);
    }
  }, [globalLehrwerke, student.id, getISOWeek, progressItems, fetchProgress, loadLehrwerke, notifyHomeworkChange]);

  // 📸 Strukturierte Momentaufnahme der aktuellen Wochenaufgabe
  const getCurrentHomeworkSnapshot = useCallback(() => {
    let tName = propTeacherName || '';
    if (tName === 'Lehrkraft' || tName === 'deine Lehrkraft') {
      tName = '';
    }
    if (!tName && (student as any)?.teacher) {
      const f = formatTeacherFullName((student as any).teacher);
      if (f && f !== 'Lehrkraft') tName = f;
    }
    if (!tName && (student as any)?.teacher_name) {
      const f = formatTeacherFullName((student as any).teacher_name);
      if (f && f !== 'Lehrkraft') tName = f;
    }
    let sName = propSchoolName || (student as any)?.school_name || (student as any)?.schools?.name || '';

    try {
      const cacheKeys = ['groovelab_cached_user', 'campus_cached_user', 'campus_user', 'groovelab_user'];
      for (const k of cacheKeys) {
        if (tName && tName !== 'Lehrkraft' && sName) break;
        const raw = sessionStorage.getItem(k) || localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (!tName && (parsed.role === 'teacher' || parsed.role === 'admin' || isTeacherTools)) {
            const f = formatTeacherFullName(parsed);
            if (f && f !== 'Lehrkraft') {
              tName = f;
            }
          }
          if (!sName && parsed.school_name) {
            sName = parsed.school_name;
          }
        }
      }
      if (!sName) {
        sName = localStorage.getItem('groovelab_school_name') || localStorage.getItem('campus_school_name') || '';
      }
    } catch {}

    const rawTeacher = tName || (student as any)?.teacher_name || '';
    const finalTeacher = formatTeacherFullName(rawTeacher);
    const finalSchool = sName || 'Campus-Groovelab';
    const finalInstrument = (student as any)?.instrument || (student as any)?.instrument_name || 'Musik';
    const stName = readOnly
      ? (student.first_name || 'Schüler/in').trim()
      : `${student.first_name || ''} ${student.last_name ? student.last_name.trim().charAt(0) + '.' : ''}`.trim() || 'Schüler/in';
    const stFirstName = (student.first_name || (student as any)?.name?.split(' ')[0] || 'Schüler').trim();
    const targetToken = (student as any)?.qr_token || (student as any)?.ausweis_nummer || '';
    const appUrl = getCanonicalQrLandingUrl(targetToken);
    const weekNum = getISOWeek().split('-W')[1] || '';

    const items: Array<{ type: 'song' | 'lehrwerk' | 'note'; title: string; subtitle?: string; notes?: string }> = [];

    // Songs
    const uniqueItemsMap = new Map<string, any>();
    (progressItems || []).forEach(item => {
      const canonicalKey = getCanonicalSongKey(item);
      const normTitle = getNormalizedSongTitle(item).toLowerCase();
      const name = canonicalKey || normTitle || (item.topic_name || '').trim().toLowerCase();
      if (name && !uniqueItemsMap.has(name)) {
        uniqueItemsMap.set(name, item);
      }
    });

    const currentSongs: any[] = [];
    Array.from(uniqueItemsMap.values()).forEach(item => {
      if (item.is_current_homework && !item.topic_name?.includes(' - Seite ') && !item.topic_name?.startsWith('Hausaufgabe KW ')) {
        const rawArtist = (item.songs?.artist || item.artist || '').trim();
        const rawTitle = (item.songs?.title || item.song_title || item.title || '').trim();
        let displayTitle = rawTitle ? (rawArtist ? `${rawArtist} - ${rawTitle}` : rawTitle) : (item.topic_name || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
        displayTitle = formatSongTitleCase(displayTitle);
        const cachedNote = localStorage.getItem(`song_note_${student.id}_${item.id}`) ||
                           localStorage.getItem(`song_note_${student.id}_${item.song_id}`) ||
                           item.homework_notes || '';
        const cleanNote = capitalizeFirstLetter(getCleanPageNotes(cachedNote));
        currentSongs.push({
          title: displayTitle || 'Song',
          notes: cleanNote
        });
      }
    });

    (activeSongSkills || []).forEach(skill => {
      const isHwInLs = localStorage.getItem(`song_hw_${student.id}_${skill.id}`) === 'true' ||
                       localStorage.getItem(`song_hw_${student.id}_${skill.song_id}`) === 'true';
      if (isHwInLs) {
        const rawArtist = (skill.songs?.artist || skill.artist || '').trim();
        const rawTitle = (skill.songs?.title || skill.song_title || skill.title || '').trim();
        let displayTitle = rawTitle ? (rawArtist ? `${rawArtist} - ${rawTitle}` : rawTitle) : (skill.topic_name || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
        displayTitle = formatSongTitleCase(displayTitle);
        if (!currentSongs.some(s => s.title.toLowerCase() === displayTitle.toLowerCase())) {
          const cachedNote = localStorage.getItem(`song_note_${student.id}_${skill.id}`) ||
                             localStorage.getItem(`song_note_${student.id}_${skill.song_id}`) || '';
          const cleanNote = capitalizeFirstLetter(getCleanPageNotes(cachedNote));
          currentSongs.push({
            title: displayTitle || 'Song',
            notes: cleanNote
          });
        }
      }
    });

    currentSongs.forEach(song => {
      items.push({
        type: 'song',
        title: song.title,
        notes: song.notes ? `📌 Fahrplan: ${song.notes}` : undefined
      });
    });

    // Lehrwerke
    const groupedLehrwerke: Record<string, { pages: number[]; notes: string[] }> = {};
    (assignedLehrwerke || []).forEach(assignment => {
      const book = globalLehrwerke.find(g => g.id === assignment.lehrwerkId);
      if (!book || !assignment.pageStates) return;
      Object.entries(assignment.pageStates).forEach(([pNumStr, pState]: [string, any]) => {
        if (pState?.status === 'homework' || pState?.isCurrentHomework) {
          const pageNum = parseInt(pNumStr, 10);
          if (!isNaN(pageNum)) {
            if (!groupedLehrwerke[book.title]) {
              groupedLehrwerke[book.title] = { pages: [], notes: [] };
            }
            if (!groupedLehrwerke[book.title].pages.includes(pageNum)) {
              groupedLehrwerke[book.title].pages.push(pageNum);
              const cleanNote = capitalizeFirstLetter(getCleanPageNotes(pState.homeworkNotes || pState.homework_notes));
              if (cleanNote) {
                groupedLehrwerke[book.title].notes.push(`Seite ${pageNum}: ${cleanNote}`);
              }
            }
          }
        }
      });
    });

    Object.entries(groupedLehrwerke).forEach(([title, info]) => {
      info.pages.sort((a, b) => a - b);
      const pagesLabel = info.pages.length > 0 ? ` (S. ${info.pages.join(', ')})` : '';
      items.push({
        type: 'lehrwerk',
        title: `${title}${pagesLabel}`,
        notes: info.notes.length > 0 ? info.notes.join('; ') : undefined
      });
    });

    // Notizen
    const noteItems = getHomeworkNoteItems(generalHomeworkNotes);
    if (noteItems.length > 0) {
      noteItems.forEach(note => {
        const cleanT = capitalizeFirstLetter(cleanNotesText(note).trim());
        if (cleanT && !cleanT.startsWith('[AUDIO:') && !cleanT.startsWith('AUDIO:')) {
          items.push({
            type: 'note',
            title: cleanT
          });
        }
      });
    }

    if (homeworkNotesList && homeworkNotesList.length > 0) {
      homeworkNotesList.forEach(note => {
        const cleanT = capitalizeFirstLetter(cleanNotesText(note).trim());
        if (cleanT && !cleanT.startsWith('[AUDIO:') && !cleanT.startsWith('AUDIO:') && !items.some(it => it.title === cleanT)) {
          items.push({
            type: 'note',
            title: cleanT
          });
        }
      });
    }

    if (items.length === 0) {
      items.push({
        type: 'note',
        title: 'Aktuelle Übungen aus dem Unterricht wie besprochen fortführen.'
      });
    }

    // Audio-Aufnahmen
    const audioList: Array<{ label: string; duration?: string; url?: string }> = (homeworkNotesList || [])
      .map((note, idx) => ({ note: typeof note === 'string' ? note : String(note || ''), idx }))
      .filter(item => item.note.includes("AUDIO:"))
      .map((item, index) => {
        const cleanStr = item.note.startsWith('[') ? item.note.replace(/[\[\]"]/g, '') : item.note;
        const parts = cleanStr.substring(cleanStr.indexOf('AUDIO:') + 6).split('|');
        const durSec = parseInt(parts[1] || '0', 10);
        const durStr = durSec > 0 ? `${Math.floor(durSec / 60)}:${String(durSec % 60).padStart(2, '0')}` : undefined;
        const rawLabel = parts[3]?.trim() || `Aufnahme #${index + 1}`;
        return {
          label: capitalizeFirstLetter(rawLabel),
          duration: durStr,
          url: parts[0]?.trim()
        };
      })
      .filter(a => !!a.url);

    return {
      studentName: stName,
      studentFirstName: stFirstName,
      teacherName: finalTeacher,
      schoolName: finalSchool,
      instrument: finalInstrument,
      weekNumber: weekNum,
      date: new Date().toLocaleDateString('de-DE'),
      qrToken: targetToken,
      appUrl,
      items,
      audioRecordings: audioList
    };
  }, [propTeacherName, propSchoolName, student, isTeacherTools, readOnly, getISOWeek, progressItems, activeSongSkills, assignedLehrwerke, globalLehrwerke, generalHomeworkNotes, homeworkNotesList]);

  // 📝 Formatierter Text-Export für Zwischenablage & E-Mail
  const getHomeworkFormattedSummary = useCallback(() => {
    const snap = getCurrentHomeworkSnapshot();
    const sections: string[] = [];

    // 1. Lehrwerke
    const lehrwerke = snap.items.filter(it => it.type === 'lehrwerk');
    if (lehrwerke.length > 0) {
      const lwLines = lehrwerke.map(lw => {
        if (lw.notes) {
          const cleanN = capitalizeFirstLetter(lw.notes.replace(/^[📌📝•-]\s*/, '').trim());
          return `• ${lw.title}\n  Hinweis: ${cleanN}`;
        }
        return `• ${lw.title}`;
      });
      sections.push(`LEHRWERKE\n${lwLines.join('\n\n')}`);
    }

    // 2. Songs & Repertoire
    const songs = snap.items.filter(it => it.type === 'song');
    if (songs.length > 0) {
      const songLines = songs.map(s => {
        if (s.notes) {
          const cleanF = capitalizeFirstLetter(s.notes.replace(/^[📌📝•-]\s*(Fahrplan:\s*)?/i, '').trim());
          return `• ${s.title}\n  Fahrplan: ${cleanF}`;
        }
        return `• ${s.title}`;
      });
      sections.push(`SONGS & REPERTOIRE\n${songLines.join('\n\n')}`);
    }

    // 3. Notizen
    const notes = snap.items.filter(it => it.type === 'note');
    if (notes.length > 0) {
      const noteLines = notes.map(n => `• ${capitalizeFirstLetter(n.title.replace(/^[📌📝•-]\s*/, '').trim())}`);
      sections.push(`NOTIZEN\n${noteLines.join('\n')}`);
    }

    // 4. Aufnahmen
    const audioCount = snap.audioRecordings ? snap.audioRecordings.length : 0;
    if (audioCount > 0) {
      const recordingLabel = audioCount === 1 ? '1 neue Aufnahme' : `${audioCount} neue Aufnahmen`;
      sections.push(`UNTERRICHTSAUFNAHMEN\n• ${recordingLabel} in der Web-App hinterlegt`);
    }

    const tasksBlock = sections.length > 0
      ? sections.join('\n\n')
      : '• Aktuelle Übungen aus dem Unterricht wie besprochen fortführen.';

    const divider = '────────────────────────────────────────';
    const shareSubject = `Wochenplan KW ${snap.weekNumber} • ${snap.studentFirstName} • ${snap.schoolName}`;
    const teacherSignOff = snap.teacherName && snap.teacherName !== 'Lehrkraft' && snap.teacherName !== 'deine Lehrkraft'
      ? snap.teacherName
      : 'Deine Lehrkraft';

    const cleanSchoolName = snap.schoolName || 'Campus-Groovelab';
    const closingSchool = !cleanSchoolName.toLowerCase().includes('campus-groovelab')
      ? `${cleanSchoolName} • Campus-Groovelab`
      : cleanSchoolName;

    const shareBody = `Hallo ${snap.studentFirstName},\n\nhier ist dein Wochenplan mit den aktuellen Übezielen aus unserem Unterricht:\n\n${divider}\nÜBE-ZIELE • KW ${snap.weekNumber}\n${divider}\n\n${tasksBlock}\n\n${divider}\nINTERAKTIVE WEB-APP\nUnterrichtsaufnahmen, Song-Bibliothek und Übe-Timer:\n${snap.appUrl}\n\nHerzliche Grüße\n${teacherSignOff}\n${closingSchool}`;

    return {
      shareSubject,
      shareBody,
      appUrl: snap.appUrl
    };
  }, [getCurrentHomeworkSnapshot]);

  const handleShareEmail = useCallback(() => {
    const { shareSubject, shareBody } = getHomeworkFormattedSummary();
    const mailUrl = `mailto:?subject=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareBody)}`;
    window.location.href = mailUrl;
    setIsShareMenuOpen(false);
  }, [getHomeworkFormattedSummary]);

  const handleCopyShareLink = useCallback(() => {
    try {
      const { shareBody } = getHomeworkFormattedSummary();
      const success = copyTextToClipboard(shareBody);
      if (success) {
        setIsLinkCopied(true);
        setTimeout(() => setIsLinkCopied(false), 2500);
      }
    } catch (e) {
      console.warn('Clipboard write failed', e);
    }
  }, [getHomeworkFormattedSummary]);

  const handleRenameTeacherAudio = useCallback(async (url: string, newTitle: string, originalIdx?: number) => {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;

    try {
      let targetIdx = originalIdx;
      if (targetIdx === undefined || targetIdx < 0 || !homeworkNotesList[targetIdx]?.includes(url)) {
        targetIdx = homeworkNotesList.findIndex(n => typeof n === 'string' && n.startsWith('AUDIO:') && n.includes(url));
      }

      let originalNote = '';
      let updatedNote = '';

      if (targetIdx >= 0 && homeworkNotesList[targetIdx]) {
        originalNote = homeworkNotesList[targetIdx];
        const parts = originalNote.substring(6).split('|');
        parts[3] = trimmedTitle;
        while (parts.length < 8) parts.push('');
        parts[8] = 'custom';
        updatedNote = `AUDIO:${parts.join('|')}`;

        const updatedList = [...homeworkNotesList];
        updatedList[targetIdx] = updatedNote;
        setHomeworkNotesList(updatedList);

        try {
          localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(updatedList));
        } catch {}

        await syncHomeworkNotes(updatedList);
        notifyHomeworkChange();
      }

      if (student?.id && originalNote && updatedNote) {
        try {
          const { data: allStudentMatrix } = await supabase
            .from('progress_matrix')
            .select('id, homework_notes')
            .eq('student_id', student.id);

          if (allStudentMatrix) {
            for (const row of allStudentMatrix) {
              if (row.homework_notes && row.homework_notes.includes(originalNote)) {
                const updatedRowNotes = row.homework_notes.replace(originalNote, updatedNote);
                await supabase
                  .from('progress_matrix')
                  .update({ homework_notes: updatedRowNotes, updated_at: new Date().toISOString() })
                  .eq('id', row.id);
              }
            }
          }
        } catch (mErr) {
          console.warn('[handleRenameTeacherAudio] Error updating matrix rows:', mErr);
        }

        setProgressItems(prev => prev.map(p => {
          let notesStr = p.homework_notes ? String(p.homework_notes) : '';
          if (notesStr && notesStr.includes(originalNote)) {
            return { ...p, homework_notes: notesStr.replace(originalNote, updatedNote) };
          }
          return p;
        }));
      }
    } catch (err) {
      console.warn('[handleRenameTeacherAudio] Error:', err);
    }
  }, [homeworkNotesList, student.id, setHomeworkNotesList, syncHomeworkNotes, notifyHomeworkChange, setProgressItems]);

  const handleAssignSongFromCatalog = useCallback(async (songId: string) => {
    if (!songId || !student.id) return;

    const existing = activeSongSkills.find((s: any) => s.song_id === songId);
    if (existing) {
      setSelectedActiveSongId(existing.id);
      setActiveInputTab('active_song');
      return;
    }

    try {
      const defaultInstrument = (student as any)?.instrument ||
        (student as any)?.instrument_name ||
        activeSongSkills[0]?.instrument ||
        globalLehrwerke.find(l => assignedLehrwerke.some(a => a.lehrwerkId === l.id))?.instrument ||
        'Gitarre';

      const { data: newSkill, error } = await supabase
        .from('user_song_skills')
        .insert({
          user_id: student.id,
          song_id: songId,
          instrument: defaultInstrument,
          progress_percent: 0,
          is_stage_ready: false
        })
        .select('*, songs(*)')
        .single();

      if (error) throw error;

      await loadActiveSongSkills();

      if (newSkill) {
        setSelectedActiveSongId(newSkill.id);
        setActiveInputTab('active_song');
      }
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error assigning song from catalog:', e);
    }
  }, [student, activeSongSkills, globalLehrwerke, assignedLehrwerke, loadActiveSongSkills, notifyHomeworkChange, setSelectedActiveSongId, setActiveInputTab]);

  const handleCreateAndAssignSong = useCallback(async (titleOrEvent: any, optionalArtist?: string) => {
    let title = '';
    let artist = '';
    if (typeof titleOrEvent === 'string') {
      title = titleOrEvent.trim();
      artist = (optionalArtist || '').trim();
    }
    if (!title || !student.id) return;
    if (!artist) artist = 'Traditionell / Unbekannt';

    try {
      const sId = student.school_id || propSchoolId || null;
      // 1. Insert into songs catalog
      const { data: createdSong, error: songErr } = await supabase
        .from('songs')
        .insert({
          title,
          artist,
          school_id: sId
        })
        .select()
        .single();

      if (songErr) throw songErr;

      // 2. Assign to student
      const defaultInstrument = (student as any)?.instrument ||
        (student as any)?.instrument_name ||
        activeSongSkills[0]?.instrument ||
        globalLehrwerke.find(l => assignedLehrwerke.some(a => a.lehrwerkId === l.id))?.instrument ||
        'Gitarre';

      const { data: newSkill, error: skillErr } = await supabase
        .from('user_song_skills')
        .insert({
          user_id: student.id,
          song_id: createdSong.id,
          instrument: defaultInstrument,
          progress_percent: 0,
          is_stage_ready: false
        })
        .select('*, songs(*)')
        .single();

      if (skillErr) throw skillErr;

      await Promise.all([loadSongs(), loadActiveSongSkills()]);

      if (newSkill) {
        setSelectedActiveSongId(newSkill.id);
        setActiveInputTab('active_song');
      }
      notifyHomeworkChange();
    } catch (e) {
      console.error('[Meisterwerk] Error creating and assigning song:', e);
    }
  }, [student, propSchoolId, activeSongSkills, globalLehrwerke, assignedLehrwerke, loadSongs, loadActiveSongSkills, notifyHomeworkChange, setSelectedActiveSongId, setActiveInputTab]);

  const handleRemoveSong = useCallback(async (skillId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!skillId || !student.id) return;

    const confirmed = typeof window !== 'undefined'
      ? window.confirm('Möchtest du dieses Song-Projekt wirklich aus deinen aktiven Projekten entfernen? Der Song in der Mediathek bleibt dabei erhalten.')
      : true;
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('user_song_skills')
        .delete()
        .eq('id', skillId)
        .eq('user_id', student.id);

      if (error) throw error;

      await loadActiveSongSkills();
      if (selectedActiveSongId === skillId) {
        setSelectedActiveSongId(null);
        setActiveInputTab('free');
      }
      notifyHomeworkChange();
    } catch (err) {
      console.error('[Meisterwerk] Error removing active song skill:', err);
    }
  }, [student.id, selectedActiveSongId, loadActiveSongSkills, notifyHomeworkChange, setSelectedActiveSongId, setActiveInputTab]);

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
  }, [isFullscreen, isEmbed, onClose]);

  const renderFullscreenButton = () => (
    <button
      type="button"
      onClick={() => setIsFullscreen(prev => !prev)}
      aria-label={isFullscreen ? "Vollbild beenden" : "Vollbildmodus aktivieren"}
      title={isFullscreen ? "Vollbild beenden" : "Vollbildmodus aktivieren"}
      style={{
        background: 'rgba(255, 255, 255, 0.18)',
        border: '1px solid rgba(255, 255, 255, 0.28)',
        borderRadius: '50%',
        width: '34px',
        height: '34px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '#ffffff',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        flexShrink: 0
      }}
      className="hover-scale"
    >
      {isFullscreen ? (
        <Minimize2 size={16} strokeWidth={2.4} color="#ffffff" />
      ) : (
        <Maximize2 size={16} strokeWidth={2.4} color="#ffffff" />
      )}
    </button>
  );

  const renderCloseButton = () => {
    if (isEmbed) return null;
    return (
      <button
        type="button"
        onClick={onClose}
        aria-label="Aufgabenheft schließen"
        title="Aufgabenheft schließen"
        style={{
          background: 'rgba(255, 255, 255, 0.18)',
          border: '1px solid rgba(255, 255, 255, 0.28)',
          borderRadius: '50%',
          width: '34px',
          height: '34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#ffffff',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          flexShrink: 0
        }}
        className="hover-scale"
      >
        <X size={16} strokeWidth={2.4} color="#ffffff" />
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
      className={isMobileOrSim ? "mobile-modal-shell" : "animation-slide-up"}
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
      {/* Embedded Style Block - Universal for ALL Tabs */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes ambientGoldBreathing {
          0%, 100% {
            box-shadow: 0 4px 18px -2px rgba(245, 158, 11, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.50);
            border-color: rgba(253, 224, 71, 0.70);
          }
          50% {
            box-shadow: 0 4px 28px 3px rgba(251, 191, 36, 0.65), inset 0 1px 3px rgba(255, 255, 255, 0.85);
            border-color: rgba(253, 224, 71, 0.95);
          }
        }
        .modal-content-container {
          display: flex !important;
          flex-direction: row !important;
        }
        
        @media (max-width: 900px) {
          .modal-header-container {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 8px 12px 6px 12px !important;
            gap: 4px !important;
            flex: 0 0 auto !important;
            flex-shrink: 0 !important;
            height: auto !important;
            min-height: auto !important;
          }
          .header-top-row {
            width: 100% !important;
          }
          .header-tabs-desktop-container {
            display: none !important;
          }
          .header-desktop-archiv {
            display: none !important;
          }
          .header-mobile-menu-row {
            display: flex !important;
          }
          .header-left-info {
            flex-wrap: nowrap !important;
            width: auto !important;
            gap: 8px !important;
          }
          
          .modal-content-container {
            flex-direction: column !important;
            overflow-y: auto !important;
            height: auto !important;
            flex: 1 1 0% !important;
            min-height: 0 !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .modal-content-container > div {
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            flex: none !important;
            min-height: 0 !important;
            overflow-y: visible !important;
            box-sizing: border-box !important;
            border-right: none !important;
            border-left: none !important;
          }
        }

        [class*="sim-viewport"] .modal-header-container,
        .sim-viewport-mobile .modal-header-container,
        .sim-viewport-portrait .modal-header-container,
        .sim-viewport-tablet .modal-header-container {
          flex-direction: column !important;
          align-items: stretch !important;
          padding: 8px 12px 6px 12px !important;
          gap: 4px !important;
          flex: 0 0 auto !important;
          flex-shrink: 0 !important;
          height: auto !important;
          min-height: auto !important;
        }
        [class*="sim-viewport"] .header-top-row,
        .sim-viewport-mobile .header-top-row,
        .sim-viewport-portrait .header-top-row,
        .sim-viewport-tablet .header-top-row {
          width: 100% !important;
        }
        [class*="sim-viewport"] .header-tabs-desktop-container,
        .sim-viewport-mobile .header-tabs-desktop-container,
        .sim-viewport-portrait .header-tabs-desktop-container,
        .sim-viewport-tablet .header-tabs-desktop-container {
          display: none !important;
        }
        [class*="sim-viewport"] .header-desktop-archiv,
        .sim-viewport-mobile .header-desktop-archiv,
        .sim-viewport-portrait .header-desktop-archiv,
        .sim-viewport-tablet .header-desktop-archiv {
          display: none !important;
        }
        [class*="sim-viewport"] .header-mobile-menu-row,
        .sim-viewport-mobile .header-mobile-menu-row,
        .sim-viewport-portrait .header-mobile-menu-row,
        .sim-viewport-tablet .header-mobile-menu-row {
          display: flex !important;
        }
        [class*="sim-viewport"] .header-left-info,
        .sim-viewport-mobile .header-left-info,
        .sim-viewport-portrait .header-left-info,
        .sim-viewport-tablet .header-left-info {
          flex-wrap: nowrap !important;
          width: auto !important;
          gap: 8px !important;
        }
        [class*="sim-viewport"] .modal-content-container,
        .sim-viewport-mobile .modal-content-container,
        .sim-viewport-portrait .modal-content-container,
        .sim-viewport-tablet .modal-content-container {
          flex-direction: column !important;
          overflow-y: auto !important;
          height: auto !important;
          flex: 1 1 0% !important;
          min-height: 0 !important;
          -webkit-overflow-scrolling: touch !important;
        }
        [class*="sim-viewport"] .modal-content-container > div,
        .sim-viewport-mobile .modal-content-container > div,
        .sim-viewport-portrait .modal-content-container > div,
        .sim-viewport-tablet .modal-content-container > div {
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          max-height: none !important;
          flex: none !important;
          min-height: 0 !important;
          overflow-y: visible !important;
          box-sizing: border-box !important;
          border-right: none !important;
          border-left: none !important;
        }
      `}} />
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

      <div
        onTouchStart={(e) => {
          if (!isMobileView || activeModalTab !== 'document') return;
          touchStartXRef.current = e.touches[0].clientX;
          touchStartYRef.current = e.touches[0].clientY;
        }}
        onTouchEnd={(e) => {
          if (!isMobileView || activeModalTab !== 'document' || touchStartXRef.current === null || touchStartYRef.current === null) return;
          const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
          const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
          touchStartXRef.current = null;
          touchStartYRef.current = null;

          if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
            if (deltaX < -40) {
              setMobileProtokollTab('homework');
            } else if (deltaX > 40) {
              setMobileProtokollTab('repertoire');
            }
          }
        }}
        style={{
          display: 'flex',
          flexDirection: (isMobileOrSim || activeViewMode !== 'document' || activeModalTab !== 'document') ? 'column' : 'row',
          flex: 1,
          overflowY: (isMobileOrSim || activeViewMode !== 'document' || activeModalTab !== 'document') ? 'auto' : 'hidden',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          minHeight: 0,
          background: '#ffffff',
          padding: '0',
          position: 'relative'
        }}
        className="modal-content-container"
      >
        {!student.is_campus_active && (activeModalTab !== 'document' || activeViewMode !== 'document') && (
          <div style={{
            width: '100%',
            background: '#f8fafc',
            borderBottom: '1.5px solid #e2e8f0',
            color: '#475569',
            padding: '8px 16px',
            fontSize: '0.78rem',
            fontWeight: 750,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            flexShrink: 0,
            boxSizing: 'border-box'
          }}>
            <Lock size={13} color="#64748b" />
            <span>Lehrer-Demo-Modus • Dieses Modul ist für Schüler im Basis-Status inaktiv. Hausaufgaben im Protokoll werden direkt synchronisiert.</span>
          </div>
        )}
        {activeModalTab === 'skillradar' ? (
          <div style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: isMobileOrSim ? '16px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '20px 24px 80px 24px'
          }}>
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
          </div>
        ) : activeViewMode === 'groovetrainer' ? (
          <div style={{
            width: '100%',
            flex: 1,
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderTop: '1px solid #e2e8f0',
            boxSizing: 'border-box',
            padding: isMobileOrSim ? '16px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '24px 32px 80px 32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
            minHeight: isMobileOrSim ? 'auto' : 'calc(70vh - 60px)'
          }}>
            <GrooveTrainerStudioView
              student={student}
              onClose={() => { setActiveViewMode('document'); setHubTab('modules'); }}
              uiLevel={uiLevel}
              useNotebookLayout={true}
              homeworkNotesList={homeworkNotesList}
              onRewardXp={() => {}}
            />
          </div>
        ) : activeViewMode === 'loopstation' ? (
          <div style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: isMobileOrSim ? '16px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '20px 24px 80px 24px'
          }}>
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
          </div>
        ) : activeViewMode === 'practice' ? (
          <div style={{
            width: '100%',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            boxSizing: 'border-box',
            padding: isMobileOrSim ? '16px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '16px 20px 20px 20px'
          }}>
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
          </div>
        ) : activeViewMode === 'tuner' ? (
          <div style={{
            width: '100%',
            flex: 1,
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderTop: '1px solid #e2e8f0',
            boxSizing: 'border-box',
            padding: isMobileOrSim ? '16px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '28px 24px 80px 24px',
            minHeight: isMobileOrSim ? 'auto' : 'calc(70vh - 60px)'
          }}>
            <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Stimmgerät...</div>}>
              <CampusTuner uiLevel={uiLevel} />
            </Suspense>
          </div>
        ) : activeViewMode === 'earlab' ? (
          <div style={{
            width: '100%',
            flex: 1,
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderTop: '1px solid #e2e8f0',
            boxSizing: 'border-box',
            padding: isMobileOrSim ? '16px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '24px 32px 80px 32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
            minHeight: isMobileOrSim ? 'auto' : 'calc(70vh - 60px)'
          }}>
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
          </div>
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
            expandedStudentAudioWeeks={expandedStudentAudioWeeks}
            expandedTeacherAudioWeeks={expandedTeacherAudioWeeks}
            favoriteAudioUrls={favoriteAudioUrls}
            formatRecordTime={formatRecordTime}
            getISOWeek={getISOWeek}
            getMonthAlbumTheme={() => 'Aufnahmen'}
            getNormalizedSongTitle={(s: any) => typeof s === 'string' ? s : (s?.topic_name || '')}
            handleDeleteNote={handleDeleteNote}
            handleDeleteStudentAudio={handleDeleteStudentAudio}
            handleRenameStudentAudio={handleRenameStudentAudio}
            handleRenameTeacherAudio={handleRenameTeacherAudio}
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
            openHomeworkWeekAccordions={openHomeworkWeekAccordions}
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
            setOpenHomeworkWeekAccordions={setOpenHomeworkWeekAccordions}
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
            toggleStudentAudioWeek={toggleStudentAudioWeek}
            toggleTeacherAudioWeek={toggleTeacherAudioWeek}
            topicName={topicName}
            useNotebookLayout={useNotebookLayout}
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
              student={{
                ...student,
                hasTresorStorage: propHasTresor ?? (checkIsAudioTresorActive(student) || true),
                campus_ui_level: uiLevel || student?.campus_ui_level
              }}
              teacherId={teacherId}
              isTeacher={isTeacherTools}
              onBackToHub={() => { setActiveModalTab('document'); setActiveSubView('hub'); }}
              isMobileOrSim={isMobileOrSim}
              studentUiLevel={uiLevel}
              hasTresorStorage={propHasTresor ?? (checkIsAudioTresorActive(student) || true)}
            />
          </Suspense>
        ) : activeModalTab === 'logbook' ? (
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
        ) : (
          <MeisterwerkDocumentTab
            DIDACTIC_QUICK_TAGS={DIDACTIC_QUICK_TAGS}
            PRESET_CHIPS={PRESET_CHIPS}
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
            cancelPlayAlongCountIn={cancelPlayAlongCountIn}
            clickTimeoutRef={{ current: null } as any}
            collectedStickers={{}}
            customTags={customTags}
            effectiveGroupStudents={effectiveGroupStudents}
            effectiveTeacherFullName={displayedStudentName}
            expressionVal={50}
            fingerVal={50}
            formatRecordTime={formatRecordTime}
            generalHomeworkNotes={generalHomeworkNotes}
            getCanonicalSongKey={getCanonicalSongKey}
            getFeedbackForWeek={() => null}
            getHomeworkNoteItems={getHomeworkNoteItems}
            getISOWeek={getISOWeek}
            getItemWeek={getItemWeek}
            getLehrwerkColor={getLehrwerkColor}
            getNormalizedSongTitle={getNormalizedSongTitle}
            getSongColor={() => ({ from: '#facc15', to: '#eab308', text: '#854d0e' })}
            getTargetWeekIso={getTargetWeekIso}
            getWeekDateRange={getWeekDateRange}
            getWeeksBetween={() => 0}
            globalLehrwerke={globalLehrwerke}
            handleAddCustomTag={handleAddCustomTag}
            handleAssignLehrwerk={handleAssignLehrwerk}
            handleAssignSongFromCatalog={handleAssignSongFromCatalog}
            handleBackToHub={() => { setActiveSubView('hub'); }}
            handleCheckMatch={() => {}}
            handleCommitStudentRating={handleCommitStudentRating}
            handleCopyShareLink={handleCopyShareLink}
            handleCreateAndAssignLehrwerk={() => {}}
            handleCreateAndAssignSong={handleCreateAndAssignSong}
            handleDeleteNote={handleDeleteNote}
            handleDeletePageNote={handleDeletePageNote}
            handleDeleteSingleNoteItem={() => {}}
            handlePageDoubleClick={() => {}}
            handleRemoveLehrwerk={() => {}}
            handleRemoveSong={handleRemoveSong}
            handleResetAllCurrentHomework={handleResetAllCurrentHomework}
            handleResolveStudentQuestion={handleResolveStudentQuestion}
            handleSave={handleSave}
            handleSaveStudentQuestion={handleSaveStudentQuestion}
            handleSetRowTag={() => {}}
            handleShareEmail={handleShareEmail}
            handleSpeakText={handleSpeakText}
            handleStartPlayAlongRecording={handleStartPlayAlongRecording}
            handleStopSpeaking={handleStopSpeaking}
            handleStudentRatingChange={() => {}}
            handleToggleMatchMode={() => {}}
            handleTogglePresetChip={handleTogglePresetChip}
            hasTresorStorage={propHasTresor ?? false}
            hasTransferableHomework={hasTransferableHomework}
            homeworkNotes={generalHomeworkNotes}
            homeworkNotesList={homeworkNotesList}
            hubTab={hubTab}
            insertOrToggleTagInText={insertOrToggleTagInText}
            isCampusActive={student.is_campus_active ?? true}
            isCountInEnabled={isCountInEnabled}
            isCurrentHomework={isCurrentHomework}
            isFullscreen={isFullscreen}
            isInsideSim={isInsideSim}
            isLinkCopied={isLinkCopied}
            isMatchModeEnabled={false}
            isMatchRevealed={false}
            isMobileOrSim={isMobileOrSim}
            isMobileView={isMobileView}
            isQuestionEditorOpen={false}
            isRecordingAudio={isRecordingAudio}
            isRecordingMetronomeActive={isRecordingMetronomeActive}
            isSavingFeedback={false}
            isSavingQuestion={false}
            isShareMenuOpen={isShareMenuOpen}
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
            parsedStudentQuestion={parsedStudentQuestion}
            pendingFeedbackStatus={null}
            pendingFeedbackTags={[]}
            playAlongCountInRemaining={playAlongCountInRemaining}
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
            selectActiveSong={(skill: any) => {
              if (skill?.id) {
                setSelectedActiveSongId(skill.id);
                setActiveInputTab('active_song');
              }
            }}
            selectTextbookPage={(bookId: string, pageNum: number) => {
              setActiveLehrwerkId(bookId);
              setActivePageNumber(pageNum);
              setActiveInputTab('lehrwerk_page');
            }}
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
            setIsCountInEnabled={setIsCountInEnabled}
            setIsCurrentHomework={setIsCurrentHomework}
            setIsNotesFocused={() => {}}
            setIsQuestionEditorOpen={() => {}}
            setIsRecordingMetronomeActive={setIsRecordingMetronomeActive}
            setIsSavingFeedback={() => {}}
            setIsShareMenuOpen={setIsShareMenuOpen}
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

  // Embed-Modus ohne Fullscreen: normal eingebettet in StudentAvatarDashboard (kein Overlay/Portal)
  if (isEmbed && !isFullscreen) {
    return (
      <>
        <div style={{ width: '100%', height: (isMobileOrSim || isMobileView) ? '100%' : 'calc(100vh - 120px)', minHeight: (isMobileOrSim || isMobileView) ? '100%' : '600px', fontFamily: '"Inter", sans-serif' }}>
          {content}
        </div>

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
  }

  const isRealDomElement = Boolean(portalTarget && typeof (portalTarget as any).nodeType === 'number');

  return (
    <>
      {isRealDomElement ? (
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
          portalTarget!
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
