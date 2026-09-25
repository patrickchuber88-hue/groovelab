import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Maximize2, Minimize2, X, ArrowLeft } from 'lucide-react';
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
import { MeisterwerkDocumentTab, type MeisterwerkBrushType } from './student/meisterwerk/MeisterwerkDocumentTab';
import {
  areSongsIdentical,
  levenshteinDistance,
  normalizeSongStr,
  extractSongArtistAndTitle
} from './student/meisterwerk/utils/meisterwerkSongHelpers';
import { MeisterwerkRecordingsTab } from './student/meisterwerk/MeisterwerkRecordingsTab';
import { MeisterwerkLogbuchTab } from './student/meisterwerk/MeisterwerkLogbuchTab';
import { MeisterwerkStickerAlbumTab } from './student/meisterwerk/MeisterwerkStickerAlbumTab';
import { MeisterwerkSkillRadarTab } from './student/meisterwerk/MeisterwerkSkillRadarTab';
import { GrooveTrainerStudioView } from './campus/GrooveTrainerStudioView';
import { WorldTourMapSpread } from './student/meisterwerk/worldtour/WorldTourMapSpread';
import { GroovePracticeCompanion } from './groovelab/GroovePracticeCompanion';
import { resolveCampusStudentAvatar } from './student/studentAvatars.constants';
import { formatTeacherFullName, copyTextToClipboard, capitalizeFirstLetter, formatSongTitleCase } from '../utils/nameHelper';
import { getCanonicalQrLandingUrl } from '../utils/tenantUrlHelper';
import { getSimulatedNow, CANONICAL_LEHRWERK_COLOR, getLehrwerkColor as getLehrwerkColorUtil, getSongColor } from './student/studentDateUtils';
import { renderSongVinylCover } from './student/CampusVinylCoverArt';
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
  const [activeViewMode, setActiveViewMode] = useState<'document' | 'recordings' | 'groovetrainer' | 'loopstation' | 'practice' | 'tuner' | 'earlab' | 'worldtour'>((initialViewMode as any) || 'document');
  const [activeSubView, setActiveSubView] = useState<'hub' | 'history' | 'repertoire' | 'lehrwerk' | 'song'>('hub');
  const [hubTab, setHubTab] = useState<'modules' | 'protocol'>((student?.is_campus_active === false) ? 'protocol' : 'modules');
  const [recordingSearchQuery, setRecordingSearchQuery] = useState('');
  const [selectedTeacherMonth, setSelectedTeacherMonth] = useState<{ key: string; label: string } | null>(null);
  const [selectedStudentMonth, setSelectedStudentMonth] = useState<{ key: string; label: string } | null>(null);
  const [selectedTeacherSongAlbum, setSelectedTeacherSongAlbum] = useState<string | null>(null);
  const [selectedStudentSongAlbum, setSelectedStudentSongAlbum] = useState<string | null>(null);
  const [showTeacherFavoritesOnly, setShowTeacherFavoritesOnly] = useState<boolean>(false);
  const [showStudentFavoritesOnly, setShowStudentFavoritesOnly] = useState<boolean>(false);
  const [showTeacherHomeworkArchive, setShowTeacherHomeworkArchive] = useState<boolean>(false);
  const [openHomeworkWeekAccordions, setOpenHomeworkWeekAccordions] = useState<string[]>([]);
  const [isTeacherHomeworkExpanded, setIsTeacherHomeworkExpanded] = useState<boolean>(false);
  const [isStudentWeekExpanded, setIsStudentWeekExpanded] = useState<boolean>(false);
  const [mobileRecordingsTab, setMobileRecordingsTab] = useState<'teacher' | 'student'>('student');
  const [showRecordingMetronomePopup, setShowRecordingMetronomePopup] = useState<boolean>(false);
  const [isRecordingPadActive, setIsRecordingPadActive] = useState<boolean>(false);
  const recordingMetronomeRef = useRef<HTMLDivElement | null>(null);

  const matchesAudioSearch = useCallback((aud: any, searchQuery: string): boolean => {
    if (!searchQuery || !searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    
    const label = (aud.harmonizedTitle || aud.label || aud.title || '').toLowerCase();
    const songTag = (aud.songTag || '').toLowerCase();
    const baseTopic = (aud.baseTopic || '').toLowerCase();
    if (label.includes(q) || songTag.includes(q) || baseTopic.includes(q)) return true;

    const d = aud.date ? new Date(aud.date) : null;
    if (d && !isNaN(d.getTime())) {
      const weekdayFull = d.toLocaleDateString('de-DE', { weekday: 'long' }).toLowerCase();
      const weekdayShort = d.toLocaleDateString('de-DE', { weekday: 'short' }).toLowerCase();
      const monthFull = d.toLocaleDateString('de-DE', { month: 'long' }).toLowerCase();
      const monthShort = d.toLocaleDateString('de-DE', { month: 'short' }).toLowerCase();
      const dayNum = String(d.getDate());
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      if (
        weekdayFull.includes(q) ||
        weekdayShort.includes(q) ||
        monthFull.includes(q) ||
        monthShort.includes(q) ||
        dayNum === q ||
        monthNum === q
      ) return true;
    }
    return false;
  }, []);

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
  const [activeBrush, setActiveBrush] = useState<MeisterwerkBrushType>('NONE');
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
  const [mobileProtokollTab, setMobileProtokollTab] = useState<'homework' | 'repertoire'>('homework');
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
    const fName = (student.first_name || '').trim();
    const lInitial = student.last_name ? ' ' + student.last_name.trim().charAt(0) + '.' : '';
    return `${fName}${lInitial}`.trim() || 'Schüler';
  }, [isTeacherSelf, propTeacherName, student.first_name, student.last_name]);

  const effectiveTeacherFullName = useMemo(() => {
    if (propTeacherName) {
      const f = formatTeacherFullName(propTeacherName);
      if (f && f !== 'Lehrkraft' && f.toLowerCase() !== 'aufgabenheft') return f;
    }
    const stTeacher = (student as any)?.teacher || (student as any)?.teacher_name;
    if (stTeacher) {
      const f = formatTeacherFullName(stTeacher);
      if (f && f !== 'Lehrkraft' && f.toLowerCase() !== 'aufgabenheft') return f;
    }
    try {
      const cacheKeys = ['groovelab_cached_user', 'campus_cached_user', 'campus_user', 'groovelab_user'];
      for (const k of cacheKeys) {
        const raw = sessionStorage.getItem(k) || localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.role === 'teacher' || parsed.role === 'admin' || isTeacherTools) {
            const f = formatTeacherFullName(parsed);
            if (f && f !== 'Lehrkraft' && f.toLowerCase() !== 'aufgabenheft') return f;
          }
        }
      }
    } catch {}
    return 'Deine Lehrkraft';
  }, [propTeacherName, student, isTeacherTools]);

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
      let combined = data ? [...data] : [];
      try {
        const localStored = localStorage.getItem('campus_lehrwerke');
        const localBooks = localStored ? JSON.parse(localStored) : [];
        for (const lb of localBooks) {
          if (!combined.some(b => String(b.id) === String(lb.id) || b.title === lb.title)) {
            combined.push(lb);
          }
        }
      } catch {}
      setGlobalLehrwerke(combined);

      const stored = localStorage.getItem('student_lehrwerke_progress');
      if (stored) {
        const parsed = JSON.parse(stored);
        setAssignedLehrwerke(parsed.filter((item: any) => item.studentId === student.id));
      }
    } catch (e) {
      console.warn('[Meisterwerk] Error in loadLehrwerke:', e);
    }
  }, [student.id]);

  const loadActiveSongSkills = useCallback(async () => {
    if (!student.id) return;
    try {
      let combined: any[] = [];
      const { data, error } = await supabase
        .from('user_song_skills')
        .select('*, songs(*)')
        .eq('user_id', student.id);
      if (!error && data) combined = [...data];

      try {
        const localStored = localStorage.getItem('campus_user_song_skills');
        const localSkills = localStored ? JSON.parse(localStored) : [];
        for (const ls of localSkills) {
          if (String(ls.user_id) === String(student.id) && !combined.some(c => String(c.id) === String(ls.id))) {
            combined.push(ls);
          }
        }
      } catch {}

      setActiveSongSkills(combined);
    } catch (e) {
      console.warn('[Meisterwerk] Error in loadActiveSongSkills:', e);
    }
  }, [student.id]);

  const loadSongs = useCallback(async () => {
    const sId = student?.school_id || propSchoolId;
    try {
      let combined: any[] = [];
      let query = supabase.from('songs').select('*');
      if (sId) {
        query = query.or(`school_id.eq.${sId},school_id.is.null`);
      }
      const { data, error } = await query.order('title');
      if (!error && data) combined = [...data];

      try {
        const localStored = localStorage.getItem('campus_songs');
        const localSongs = localStored ? JSON.parse(localStored) : [];
        for (const ls of localSongs) {
          if (!combined.some(c => String(c.id) === String(ls.id) || c.title === ls.title)) {
            combined.push(ls);
          }
        }
      } catch {}

      setSongs(combined);
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

  // 📚 Lehrwerke Selection & Creation State
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [showCreateLehrwerkModal, setShowCreateLehrwerkModal] = useState(false);
  const [newLehrwerkTitle, setNewLehrwerkTitle] = useState('');
  const [newLehrwerkPages, setNewLehrwerkPages] = useState('50');
  const [newLehrwerkLoading, setNewLehrwerkLoading] = useState(false);

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

  // 🟣 0.1% Goldstandard Student Focus Toggle (Max 3 Focus Pages, Persistent in localStorage & reactive State)
  const toggleStudentFocusPage = useCallback((lehrwerkId: string, pageNum: number) => {
    if (!lehrwerkId || !pageNum) return;
    setAssignedLehrwerke((prev: any[] = []) => {
      const exists = prev.some(b => b.lehrwerkId === lehrwerkId || b.id === lehrwerkId);
      let updated: any[];
      if (!exists) {
        const newBook = {
          id: lehrwerkId,
          lehrwerkId: lehrwerkId,
          studentId: student?.id,
          pageStates: {
            [pageNum]: {
              studentFocus: true,
              updatedAt: new Date().toISOString()
            }
          }
        };
        updated = [...prev, newBook];
      } else {
        updated = prev.map(book => {
          if (book.lehrwerkId === lehrwerkId || book.id === lehrwerkId) {
            const pageStates = { ...(book.pageStates || {}) };
            const current = pageStates[pageNum] || {};
            const isFocused = Boolean(current.studentFocus);
            const focusedCount = Object.values(pageStates).filter((p: any) => Boolean(p?.studentFocus)).length;
            if (!isFocused && focusedCount >= 3) {
              return book;
            }
            pageStates[pageNum] = {
              ...current,
              studentFocus: !isFocused,
              updatedAt: new Date().toISOString()
            };
            return { ...book, pageStates };
          }
          return book;
        });
      }

      try {
        const stored = localStorage.getItem('student_lehrwerke_progress');
        const allBooks = stored ? JSON.parse(stored) : [];
        const studentId = student?.id;
        const existsInStorage = allBooks.some((item: any) => (item.studentId === studentId || !item.studentId) && (item.lehrwerkId === lehrwerkId || item.id === lehrwerkId));
        let merged: any[];
        if (!existsInStorage) {
          const match = updated.find(u => u.lehrwerkId === lehrwerkId || u.id === lehrwerkId);
          merged = [...allBooks, match || { lehrwerkId, studentId, pageStates: { [pageNum]: { studentFocus: true } } }];
        } else {
          merged = allBooks.map((item: any) => {
            if ((item.studentId === studentId || !item.studentId) && (item.lehrwerkId === lehrwerkId || item.id === lehrwerkId)) {
              const match = updated.find(u => u.lehrwerkId === lehrwerkId || u.id === lehrwerkId);
              return match ? { ...item, pageStates: match.pageStates } : item;
            }
            return item;
          });
        }
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(merged));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('campus_student_focus_updated', {
            detail: { lehrwerkId, pageNum, studentId }
          }));
        }
      } catch (e) {
        console.warn('Error saving student focus:', e);
      }
      return updated;
    });
  }, [student?.id, setAssignedLehrwerke]);

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
    recordCountInMode,
    cancelActiveRecordCountIn,
    playAlongCountInRemaining,
    cancelPlayAlongCountIn,
    handleStartPlayAlongRecording,
    startRecordingAudio,
    stopRecordingAudio,
    handleRetakeRecordingAudio,
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
    hasTresorStorage: propHasTresor ?? false,
    isTeacherMode: isTeacherTools,
    isTeacherSelf,
    activeSongSkills,
    setActiveSongSkills,
    setProgressItems,
    topicName,
    activeSubView,
    activeLehrwerkId,
    activePageNumber,
    selectedActiveSongId,
    homeworkNotesList,
    setHomeworkNotesList,
    syncHomeworkNotes,
    notifyHomeworkChange,
    isRecordingPadActive,
    setIsRecordingPadActive,
    isCountInEnabled,
    setIsCountInEnabled
  });

  // 🌟 Award Sticker Helper
  const awardSticker = useCallback((stickerId: string, topic?: string) => {
    if (!student?.id) return;
    try {
      const key = `campus_stickers_${student.id}`;
      const existing = JSON.parse(localStorage.getItem(key) || '{}');
      const now = new Date().toISOString();
      const current = existing[stickerId] || { count: 0, details: [] };
      current.count += 1;
      current.details = [...(current.details || []), { topic: topic || 'Allgemein', awarded_at: now }];
      existing[stickerId] = current;
      localStorage.setItem(key, JSON.stringify(existing));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus_stickers_updated', { detail: { studentId: student.id, stickerId } }));
      }
    } catch (e) {
      console.warn('awardSticker notice:', e);
    }
  }, [student?.id]);

  // Hook 3: Match Game
  const {
    isMatchModeEnabled,
    isMatchRevealed,
    isMatchSuccessful,
    showMatchConfetti: matchGameShowConfetti,
    matchFeedbackToast,
    studentRating,
    studentRatingUpdatedAt,
    isStudentRatingCommitted,
    showdownState,
    handleToggleMatchMode,
    handleStudentRatingChange,
    handleCommitStudentRating,
    handleCheckMatch,
    lastMatchedAt,
    lastMatchedStudentPercent,
    lastMatchedTeacherPercent,
    matchHistory
  } = useMeisterwerkMatchGame({
    student,
    topicName,
    selectedActiveSongId,
    progressItems,
    isTeacherMode: isTeacherTools,
    awardCampusXP: async () => {},
    awardSticker: (stickerId: string) => awardSticker(stickerId, topicName)
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
    // 1. Direct from current homeworkNotesList
    const directFromList = parseStudentQuestionFromNotes(homeworkNotesList || []);
    if (directFromList.hasQuestion) return directFromList;

    // 2. Direct from localStorage cache
    if (student?.id) {
      try {
        const directQ = localStorage.getItem(`campus_student_question_${student.id}`);
        if (directQ && directQ.trim()) {
          return {
            hasQuestion: true,
            rawEntry: null,
            text: directQ.trim(),
            timestamp: null
          };
        }
      } catch {}
    }

    // 3. From carried-over past snapshots if isCurrentWeek
    if (viewingWeekOffset === 0 && progressItems && Array.isArray(progressItems)) {
      try {
        const currentWeekStr = getTargetWeekIso(0);
        const pastHwSnapshots = progressItems.filter((item: any) => {
          if (!item.topic_name?.startsWith('Hausaufgabe KW ')) return false;
          const itWeekIso = getItemWeek(item);
          return itWeekIso && itWeekIso < currentWeekStr;
        });
        pastHwSnapshots.sort((a: any, b: any) => {
          const wA = getItemWeek(a);
          const wB = getItemWeek(b);
          if (wA !== wB) return (wB || '').localeCompare(wA || '');
          const tA = new Date(a.updated_at || a.created_at || 0).getTime();
          const tB = new Date(b.updated_at || b.created_at || 0).getTime();
          return tB - tA;
        });
        const latestPast = pastHwSnapshots[0];
        if (latestPast && latestPast.homework_notes) {
          const parsed = typeof latestPast.homework_notes === 'string' ? JSON.parse(latestPast.homework_notes) : latestPast.homework_notes;
          if (Array.isArray(parsed)) {
            const pastParsed = parseStudentQuestionFromNotes(parsed);
            if (pastParsed.hasQuestion) return pastParsed;
          }
        }
      } catch {}
    }

    return directFromList;
  }, [homeworkNotesList, student?.id, viewingWeekOffset, progressItems, getItemWeek, getTargetWeekIso]);

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

  // ❓ Student Question State
  const [isQuestionEditorOpen, setIsQuestionEditorOpen] = useState(false);
  const [questionDraftText, setQuestionDraftText] = useState(() => {
    if (!student?.id) return '';
    try {
      const draft = localStorage.getItem(`campus_student_question_draft_${student.id}`);
      if (draft !== null && draft !== undefined) return draft;
      const directQ = localStorage.getItem(`campus_student_question_${student.id}`);
      if (directQ) return directQ.trim();
    } catch {}
    return '';
  });
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // 🔄 Real-time Draft & Typing Synchronizer
  const handleQuestionDraftChange = useCallback((newVal: string | ((prev: string) => string)) => {
    setQuestionDraftText(prev => {
      const resolved = typeof newVal === 'function' ? newVal(prev) : newVal;
      if (student?.id) {
        try {
          localStorage.setItem(`campus_student_question_draft_${student.id}`, resolved);
        } catch {}
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('campus_student_question_draft_updated', {
            detail: { studentId: student.id, text: resolved }
          }));
        }
      }
      return resolved;
    });
  }, [student?.id]);

  // Sync questionDraftText from storage or parsedStudentQuestion when opened/available
  useEffect(() => {
    if (!student?.id) return;
    try {
      const draft = localStorage.getItem(`campus_student_question_draft_${student.id}`);
      if (draft !== null && draft !== undefined) {
        setQuestionDraftText(draft);
        return;
      }
      const directQ = localStorage.getItem(`campus_student_question_${student.id}`);
      if (directQ) {
        setQuestionDraftText(directQ.trim());
        return;
      }
    } catch {}
    if (parsedStudentQuestion?.hasQuestion && parsedStudentQuestion.text) {
      setQuestionDraftText(parsedStudentQuestion.text);
    }
  }, [student?.id, parsedStudentQuestion?.hasQuestion, parsedStudentQuestion?.text]);

  // 🛰️ Cross-Tab & Cross-Component Real-Time Question & Draft Listener
  useEffect(() => {
    if (!student?.id) return;

    const handleQuestionUpdated = (e: any) => {
      const detailId = e?.detail?.studentId;
      if (detailId && String(detailId) !== String(student.id)) return;

      let newQuestion = typeof e?.detail?.question === 'string' ? e.detail.question.trim() : null;
      if (newQuestion === null) {
        try {
          const directQ = localStorage.getItem(`campus_student_question_${student.id}`);
          if (directQ !== null) {
            newQuestion = directQ.trim();
          } else {
            const rawNotes = localStorage.getItem(`campus_homework_notes_${student.id}`);
            if (rawNotes) {
              const list = JSON.parse(rawNotes);
              if (Array.isArray(list)) {
                const found = list.find((n: any) => typeof n === 'string' && (n.startsWith('STUDENT_QUESTION:') || n.startsWith('❓ Frage für den Unterricht:')));
                if (found) {
                  if (found.startsWith('STUDENT_QUESTION:')) {
                    const withoutPrefix = found.replace(/^STUDENT_QUESTION:/, '');
                    const pipeIdx = withoutPrefix.indexOf('|');
                    newQuestion = pipeIdx !== -1 ? withoutPrefix.slice(pipeIdx + 1).trim() : withoutPrefix.trim();
                  } else {
                    newQuestion = found.replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
                  }
                }
              }
            }
          }
        } catch {}
      }

      const qStr = newQuestion || '';
      setQuestionDraftText(qStr);

      // Also update homeworkNotesList so parsedStudentQuestion & display banners update synchronously
      setHomeworkNotesList(prev => {
        const list = prev || [];
        const filtered = list.filter(
          n => typeof n === 'string' && !n.startsWith('STUDENT_QUESTION:') && !n.startsWith('❓ Frage für den Unterricht:')
        );
        if (qStr) {
          const isoNow = new Date().toISOString();
          return [`STUDENT_QUESTION:${isoNow}|${qStr}`, ...filtered];
        }
        return filtered;
      });
    };

    const handleDraftUpdated = (e: any) => {
      const detailId = e?.detail?.studentId;
      if (detailId && String(detailId) !== String(student.id)) return;
      if (typeof e?.detail?.text === 'string') {
        setQuestionDraftText(e.detail.text);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === `campus_student_question_${student.id}` || e.key === `campus_homework_notes_${student.id}`) {
        handleQuestionUpdated({ detail: { studentId: student.id } });
      } else if (e.key === `campus_student_question_draft_${student.id}`) {
        if (typeof e.newValue === 'string') {
          setQuestionDraftText(e.newValue);
        }
      }
    };

    // ⚡ Sofortige Synchronisation beim Mounten
    handleQuestionUpdated({ detail: { studentId: student.id } });

    window.addEventListener('campus_student_question_updated', handleQuestionUpdated);
    window.addEventListener('campus_homework_notes_updated', handleQuestionUpdated);
    window.addEventListener('campus_student_question_draft_updated', handleDraftUpdated);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('campus_student_question_updated', handleQuestionUpdated);
      window.removeEventListener('campus_homework_notes_updated', handleQuestionUpdated);
      window.removeEventListener('campus_student_question_draft_updated', handleDraftUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, [student?.id, setHomeworkNotesList]);

  // 🎚️ Active Song Subsliders State
  const [isSubSlidersExpanded, setIsSubSlidersExpanded] = useState(false);
  const [rhythmVal, setRhythmVal] = useState(50);
  const [fingerVal, setFingerVal] = useState(50);
  const [expressionVal, setExpressionVal] = useState(50);
  const [songProgressPercent, setSongProgressPercent] = useState(0);

  // ⏱️ Metronome & History State
  const [showPlayAlongMetronomePopup, setShowPlayAlongMetronomePopup] = useState(false);
  const [selectedHistoryWeek, setSelectedHistoryWeek] = useState<string | null>(null);
  const [activeTagPickerRowIndex, setActiveTagPickerRowIndex] = useState<number | null>(null);

  // Auto-resize helper for student note textareas
  const adjustTextareaHeight = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  // Sync songProgressPercent when selectedActiveSongId or activeSongSkills changes
  useEffect(() => {
    if (!selectedActiveSongId) return;
    const skill = activeSongSkills.find(s => s.id === selectedActiveSongId);
    if (skill && skill.progress_percent !== undefined) {
      setSongProgressPercent(skill.progress_percent || 0);
    }
  }, [selectedActiveSongId, activeSongSkills]);

  // Tag helper for homework note items
  const handleSetRowTag = useCallback((nIdx: number, newTag: string | null) => {
    setHomeworkNotesList(prev => {
      const list = [...(prev || [])];
      if (nIdx < 0 || nIdx >= list.length) return prev;
      let text = String(list[nIdx] || '');
      for (const t of DIDACTIC_QUICK_TAGS) {
        text = text.replace(t.tag, '').trim();
      }
      if (newTag) {
        text = `${newTag} ${text}`.trim();
      }
      list[nIdx] = text;
      syncHomeworkNotes(list);
      return list;
    });
    setActiveTagPickerRowIndex(null);
  }, [syncHomeworkNotes, setHomeworkNotesList]);

  const handleResolveStudentQuestion = useCallback(async () => {
    if (!student?.id) return;
    try {
      const updatedList = (homeworkNotesList || []).filter(
        n => typeof n === 'string' && !n.startsWith('STUDENT_QUESTION:') && !n.startsWith('❓ Frage für den Unterricht:')
      );
      setHomeworkNotesList(updatedList);
      try {
        localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(updatedList));
        localStorage.removeItem(`campus_student_question_${student.id}`);
        localStorage.removeItem(`campus_student_question_draft_${student.id}`);
      } catch {}

      // 🛡️ 0.1% Goldstandard: Bereinige den React-State progressItems im Speicher,
      // damit gespeicherte Snapshots nicht als "pastBridgedQuestion" wiederauferstehen.
      setProgressItems(prev => (prev || []).map(item => {
        if (!item.homework_notes) return item;
        try {
          const parsed = typeof item.homework_notes === 'string' ? JSON.parse(item.homework_notes) : item.homework_notes;
          if (Array.isArray(parsed)) {
            const sanitized = parsed.filter(
              n => typeof n === 'string' && !n.startsWith('STUDENT_QUESTION:') && !n.startsWith('❓ Frage für den Unterricht:')
            );
            return { ...item, homework_notes: JSON.stringify(sanitized) };
          }
        } catch {}
        return item;
      }));

      const { error } = await supabase.rpc('resolve_student_homework_question', {
        p_student_id: student.id
      });
      if (error) {
        console.warn('[handleResolveStudentQuestion] RPC notice, resolving via syncHomeworkNotes fallback:', error);
        await syncHomeworkNotes(updatedList);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus_student_question_updated', {
          detail: { studentId: student.id, question: '' }
        }));
        window.dispatchEvent(new CustomEvent('campus_homework_notes_updated', {
          detail: { studentId: student.id }
        }));
      }
      notifyHomeworkChange();
      setIsQuestionEditorOpen(false);
      setQuestionDraftText('');
    } catch (err) {
      console.error('Fehler beim Erledigen der Schülerfrage:', err);
    }
  }, [student?.id, homeworkNotesList, syncHomeworkNotes, notifyHomeworkChange, setHomeworkNotesList, setProgressItems]);

  const handleSaveStudentQuestion = useCallback(async (qText: string) => {
    const trimmed = qText.trim();
    if (!trimmed) {
      await handleResolveStudentQuestion();
      return;
    }
    if (!student?.id) return;
    setIsSavingQuestion(true);
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
        localStorage.setItem(`campus_student_question_${student.id}`, trimmed);
        localStorage.removeItem(`campus_student_question_draft_${student.id}`);
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
        window.dispatchEvent(new CustomEvent('campus_student_question_updated', {
          detail: { studentId: student.id, question: trimmed }
        }));
        window.dispatchEvent(new CustomEvent('campus_homework_notes_updated', {
          detail: { studentId: student.id }
        }));
      }
      notifyHomeworkChange();
      setStudentNotesSavedToast(true);
      setTimeout(() => setStudentNotesSavedToast(false), 2500);
      setIsQuestionEditorOpen(false);
      setQuestionDraftText(trimmed);
    } catch (err) {
      console.error('Fehler beim Speichern der Schülerfrage:', err);
    } finally {
      setIsSavingQuestion(false);
    }
  }, [student?.id, homeworkNotesList, syncHomeworkNotes, notifyHomeworkChange, setHomeworkNotesList, setStudentNotesSavedToast, handleResolveStudentQuestion]);

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
  const handleAssignLehrwerk = useCallback((lehrwerkId: string, directBookObj?: any) => {
    if (!lehrwerkId) return;
    const book = directBookObj || globalLehrwerke.find(b => String(b.id) === String(lehrwerkId));
    if (!book) return;

    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];

      if (parsed.some((item: any) => String(item.studentId) === String(student.id) && String(item.lehrwerkId) === String(lehrwerkId))) {
        setActiveLehrwerkId(lehrwerkId);
        setActiveSubView('lehrwerk');
        return;
      }

      const newAssignment = {
        studentId: student.id,
        lehrwerkId: lehrwerkId,
        bookTitle: book.title,
        lehrwerkTitle: book.title,
        totalPages: book.totalPages || book.total_pages || 50,
        assignedAt: new Date().toISOString(),
        visibility: 'private',
        pageStates: {}
      };

      const updated = [...parsed, newAssignment];
      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      setAssignedLehrwerke(prev => [...prev.filter(a => String(a.lehrwerkId) !== String(lehrwerkId)), newAssignment]);
      loadLehrwerke();
      setActiveLehrwerkId(lehrwerkId);
      setActiveSubView('lehrwerk');
    } catch (e) {
      console.error('Error assigning lehrwerk:', e);
    }
  }, [globalLehrwerke, student.id, loadLehrwerke, setActiveLehrwerkId, setActiveSubView, setAssignedLehrwerke]);

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

  // 📚 Neues Lehrwerk erstellen & dem Schüler zuweisen
  const handleCreateAndAssignLehrwerk = useCallback(async (titleOrEvent?: any, optionalPages?: number | string) => {
    if (titleOrEvent && typeof titleOrEvent.preventDefault === 'function') {
      titleOrEvent.preventDefault();
    }
    let title = typeof titleOrEvent === 'string' && titleOrEvent.trim() ? titleOrEvent.trim() : newLehrwerkTitle.trim();
    let pages = 50;
    if (typeof titleOrEvent === 'string') {
      if (optionalPages) {
        const p = parseInt(String(optionalPages), 10);
        if (!isNaN(p) && p > 0) pages = p;
      }
    } else if (newLehrwerkPages) {
      const p = parseInt(newLehrwerkPages, 10);
      if (!isNaN(p) && p > 0) pages = p;
    }
    if (!title || !student.id) return;
    setNewLehrwerkLoading(true);

    try {
      const sId = student.school_id || propSchoolId || null;
      const defaultInstrument = (student as any)?.instrument ||
        (student as any)?.instrument_name ||
        'Gitarre';

      let createdBook: any = null;
      try {
        const { data, error } = await supabase
          .from('campus_lehrwerke')
          .insert({
            title,
            totalPages: pages,
            total_pages: pages,
            instrument: defaultInstrument,
            school_id: sId
          })
          .select()
          .single();
        if (!error && data) {
          createdBook = data;
        }
      } catch (dbErr) {
        console.warn('[Meisterwerk] DB insert campus_lehrwerke fallback:', dbErr);
      }

      if (!createdBook) {
        createdBook = {
          id: `lw-${Date.now()}`,
          title,
          totalPages: pages,
          total_pages: pages,
          instrument: defaultInstrument,
          school_id: sId
        };
      }

      try {
        const globalStored = localStorage.getItem('campus_lehrwerke');
        const existingGlobal = globalStored ? JSON.parse(globalStored) : [];
        if (!existingGlobal.some((b: any) => b.id === createdBook.id || b.title === createdBook.title)) {
          localStorage.setItem('campus_lehrwerke', JSON.stringify([...existingGlobal, createdBook]));
        }
      } catch {}

      setGlobalLehrwerke(prev => [...prev.filter(b => b.id !== createdBook.id), createdBook]);
      handleAssignLehrwerk(createdBook.id, createdBook);
      await loadLehrwerke();
      notifyHomeworkChange();
      setNewLehrwerkTitle('');
      setNewLehrwerkPages('50');
      setShowCreateLehrwerkModal(false);
      setShowAssignDropdown(false);
      setActiveLehrwerkId(createdBook.id);
      setActiveSubView('lehrwerk');
    } catch (e) {
      console.error('[Meisterwerk] Error creating and assigning lehrwerk:', e);
    } finally {
      setNewLehrwerkLoading(false);
    }
  }, [newLehrwerkTitle, newLehrwerkPages, student, propSchoolId, handleAssignLehrwerk, loadLehrwerke, notifyHomeworkChange]);

  // 🗑️ Lehrwerk-Zuweisung entfernen
  const handleRemoveLehrwerk = useCallback((lehrwerkId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!lehrwerkId || !student.id) return;

    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      if (stored) {
        const parsed = JSON.parse(stored);
        const updated = parsed.filter((item: any) => !(String(item.studentId) === String(student.id) && String(item.lehrwerkId) === String(lehrwerkId)));
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        setAssignedLehrwerke(updated.filter((item: any) => String(item.studentId) === String(student.id)));
      }
      if (activeLehrwerkId === lehrwerkId) {
        setActiveLehrwerkId(null);
      }
      loadLehrwerke();
      notifyHomeworkChange();
    } catch (err) {
      console.error('Error removing lehrwerk:', err);
    }
  }, [student.id, activeLehrwerkId, setActiveLehrwerkId, setAssignedLehrwerke, loadLehrwerke, notifyHomeworkChange]);

  // 🗑️ Einzelnen Text-Baustein aus den Hausaufgaben entfernen
  const handleDeleteSingleNoteItem = useCallback((idx: number) => {
    const current = latestGeneralHomeworkNotesRef.current !== undefined
      ? latestGeneralHomeworkNotesRef.current
      : generalHomeworkNotes;
    const items = getHomeworkNoteItems(current);
    if (idx < 0 || idx >= items.length) return;
    const newItems = items.filter((_, i) => i !== idx);
    const nextText = newItems.join('\n');
    latestGeneralHomeworkNotesRef.current = nextText;
    setGeneralHomeworkNotes(nextText);
    studentNotesSelectionRef.current = { start: nextText.length, end: nextText.length };

    const specialNotes = (homeworkNotesList || []).filter(n => typeof n === 'string' && isInternalMetadataNote(n));
    const combined = [...specialNotes, ...newItems];
    setHomeworkNotesList(combined);

    try {
      localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(combined));
      localStorage.setItem(`campus_homework_week_${student.id}`, getISOWeek());
    } catch {}

    triggerImmediateAutoSave();
  }, [generalHomeworkNotes, latestGeneralHomeworkNotesRef, homeworkNotesList, setGeneralHomeworkNotes, setHomeworkNotesList, student.id, getISOWeek, triggerImmediateAutoSave]);

  // 📖 Doppelklick auf Lehrwerkseite
  const handlePageDoubleClick = useCallback((bookId: string, pageNum: number) => {
    setActiveLehrwerkId(bookId);
    setActivePageNumber(pageNum);
    setActiveInputTab('lehrwerk_page');
  }, [setActiveLehrwerkId, setActivePageNumber, setActiveInputTab]);

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
    const formatted = formatTeacherFullName(rawTeacher);
    const finalTeacher = (formatted && formatted !== 'Lehrkraft' && formatted.toLowerCase() !== 'aufgabenheft')
      ? formatted
      : effectiveTeacherFullName;
    const finalSchool = sName || 'Campus-Groovelab';
    const finalInstrument = (student as any)?.instrument || (student as any)?.instrument_name || 'Musik';
    const stName = `${student.first_name || ''} ${student.last_name ? student.last_name.trim().charAt(0) + '.' : ''}`.trim() || student.first_name || 'Schüler';
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
                       localStorage.getItem(`song_hw_${student.id}_${skill.song_id}`) === 'true' ||
                       Boolean(skill.is_current_homework);
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

    // 📖 Lehrwerke aus progressItems einbinden (Format "Buchtitel - Seite X")
    (progressItems || []).forEach(item => {
      if (item.is_current_homework && item.topic_name && item.topic_name.includes(' - Seite ')) {
        const parts = item.topic_name.split(' - Seite ');
        const bookTitle = parts[0].trim();
        const pageNum = parseInt(parts[1], 10);
        if (!groupedLehrwerke[bookTitle]) {
          groupedLehrwerke[bookTitle] = { pages: [], notes: [] };
        }
        if (!isNaN(pageNum) && !groupedLehrwerke[bookTitle].pages.includes(pageNum)) {
          groupedLehrwerke[bookTitle].pages.push(pageNum);
          const rawNote = item.homework_notes || item.teacher_notes || '';
          const cleanNote = capitalizeFirstLetter(getCleanPageNotes(rawNote));
          if (cleanNote && !groupedLehrwerke[bookTitle].notes.includes(`Seite ${pageNum}: ${cleanNote}`)) {
            groupedLehrwerke[bookTitle].notes.push(`Seite ${pageNum}: ${cleanNote}`);
          }
        }
      }
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
        if (cleanT && !cleanT.startsWith('[AUDIO:') && !cleanT.startsWith('AUDIO:') && !items.some(it => it.title.toLowerCase() === cleanT.toLowerCase())) {
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
    const audioList: Array<{ label: string; duration?: string; date?: string; url?: string }> = (homeworkNotesList || [])
      .map((note, idx) => ({ note: typeof note === 'string' ? note : String(note || ''), idx }))
      .filter(item => item.note.includes("AUDIO:"))
      .map((item, index) => {
        const cleanStr = item.note.startsWith('[') ? item.note.replace(/[\[\]"]/g, '') : item.note;
        const parts = cleanStr.substring(cleanStr.indexOf('AUDIO:') + 6).split('|');
        const durSec = parseInt(parts[1] || '0', 10);
        const durStr = durSec > 0 ? `${Math.floor(durSec / 60)}:${String(durSec % 60).padStart(2, '0')} Min.` : undefined;
        let dateStr = parts[2]?.trim() || undefined;
        if (dateStr) {
          try {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
              dateStr = d.toLocaleDateString('de-DE');
            }
          } catch {}
        }
        const rawLabel = parts[3]?.trim() || `Aufnahme #${index + 1}`;
        return {
          label: capitalizeFirstLetter(rawLabel),
          duration: durStr,
          date: dateStr,
          url: parts[0]?.trim()
        };
      })
      .filter(a => !!a.url);

    const parsedQ = parseStudentQuestionFromNotes(homeworkNotesList || []);
    const studentQuestion = parsedQ?.hasQuestion ? parsedQ.text : undefined;

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
      audioRecordings: audioList,
      studentQuestion
    };
  }, [propTeacherName, propSchoolName, student, isTeacherTools, readOnly, getISOWeek, progressItems, activeSongSkills, assignedLehrwerke, globalLehrwerke, generalHomeworkNotes, homeworkNotesList]);

  // 📝 Formatierter Text-Export für Zwischenablage & E-Mail (1% Goldstandard 4-Säulen-Synchronisation)
  const getHomeworkFormattedSummary = useCallback((customSnap?: any) => {
    const snap = getCurrentHomeworkSnapshot();
    const sections: string[] = [];

    // 1. 📖 Lehrwerke & Etüden
    const lehrwerkeList: Array<{ title: string; pages?: number[]; notes?: string[] | string }> =
      (customSnap?.lehrwerke && customSnap.lehrwerke.length > 0)
        ? customSnap.lehrwerke
        : snap.items.filter(it => it.type === 'lehrwerk').map(lw => ({
            title: lw.title,
            notes: lw.notes
          }));

    if (lehrwerkeList.length > 0) {
      const lwLines = lehrwerkeList.map(lw => {
        let pagesSuffix = '';
        if (lw.pages && lw.pages.length > 0) {
          const sortedPages = [...lw.pages].sort((a, b) => a - b);
          pagesSuffix = ` (S. ${sortedPages.join(', ')})`;
        }
        const cleanTitle = lw.title.replace(/\s*\(S\.\s*[^)]+\)$/i, '').trim();
        const fullBookTitle = `${cleanTitle}${pagesSuffix}`;

        const notesArr = Array.isArray(lw.notes)
          ? lw.notes
          : (lw.notes ? [lw.notes] : []);

        if (notesArr.length > 0) {
          const taskLines = notesArr.map(n => {
            const cleanN = capitalizeFirstLetter(n.replace(/^[📌📝•-]\s*/, '').trim());
            return `  • ${cleanN}`;
          }).join('\n');
          return `• ${fullBookTitle}\n${taskLines}`;
        }
        return `• ${fullBookTitle}`;
      });
      sections.push(`LEHRWERKE & ETÜDEN\n${lwLines.join('\n\n')}`);
    }

    // 2. Songs & Repertoire
    const songsList: Array<{ title: string; artist?: string; notes?: string }> =
      (customSnap?.songs && customSnap.songs.length > 0)
        ? customSnap.songs
        : snap.items.filter(it => it.type === 'song').map(s => ({
            title: s.title,
            notes: s.notes
          }));

    if (songsList.length > 0) {
      const songLines = songsList.map(s => {
        const rawArtist = (s.artist || '').trim();
        let displayTitle = (s.title || '').trim();
        if (rawArtist && !displayTitle.toLowerCase().includes(rawArtist.toLowerCase())) {
          displayTitle = `${rawArtist} – ${displayTitle}`;
        }
        if (s.notes) {
          const cleanF = capitalizeFirstLetter(s.notes.replace(/^[📌📝•-]\s*(Fahrplan:\s*)?/i, '').trim());
          return `• ${displayTitle}\n  Fahrplan: ${cleanF}`;
        }
        return `• ${displayTitle}`;
      });
      sections.push(`SONGS & REPERTOIRE\n${songLines.join('\n\n')}`);
    }

    // 3. Notizen & Schülerfragen
    const notesList: string[] =
      (customSnap?.notes && customSnap.notes.length > 0)
        ? customSnap.notes
        : snap.items.filter(it => it.type === 'note').map(n => n.title);

    const studentQuestion: string | undefined = customSnap?.studentQuestion || snap.studentQuestion;

    const noteLines: string[] = [];
    notesList.forEach(n => {
      const cleanN = capitalizeFirstLetter(cleanNotesText(n).replace(/^[📌📝•-]\s*/, '').trim());
      if (cleanN && !cleanN.startsWith('[AUDIO:') && !cleanN.startsWith('AUDIO:')) {
        noteLines.push(`• ${cleanN}`);
      }
    });
    if (noteLines.length > 0) {
      sections.push(`HAUSAUFGABEN & NOTIZEN\n${noteLines.join('\n')}`);
    }

    // 4. Unterrichtsaufnahmen zum Mitspielen
    const audioList: Array<{ label: string; duration?: string; date?: string; url?: string }> =
      (customSnap?.audioRecordings && customSnap.audioRecordings.length > 0)
        ? customSnap.audioRecordings
        : (snap.audioRecordings || []);

    if (audioList.length > 0) {
      const audioLines = audioList.map(a => {
        const dur = a.duration ? ` (${a.duration})` : '';
        let dt = '';
        if (a.date) {
          try {
            const d = new Date(a.date);
            if (!isNaN(d.getTime())) {
              dt = ` • ${d.toLocaleDateString('de-DE')}`;
            } else {
              dt = ` • ${a.date}`;
            }
          } catch {
            dt = ` • ${a.date}`;
          }
        }
        return `• ${a.label}${dur}${dt}`;
      });
      sections.push(`AUFNAHMEN ZUM MITSPIELEN\n${audioLines.join('\n')}`);
    }

    const tasksBlock = sections.length > 0
      ? sections.join('\n\n')
      : '• Aktuelle Übungen aus dem Unterricht wie besprochen fortführen.';

    const studentFirstName = customSnap?.studentFirstName || snap.studentFirstName || 'Schüler';
    const teacherName = customSnap?.teacherName || snap.teacherName;
    const schoolName = customSnap?.schoolName || snap.schoolName || 'Campus-Groovelab';
    const weekNumber = customSnap?.weekNumber || snap.weekNumber || '';
    const appUrl = customSnap?.appUrl || snap.appUrl;

    const divider = '────────────────────────────────────────';
    const shareSubject = `Wochenplan KW ${weekNumber} • ${studentFirstName} • ${schoolName}`;
    const isGenericTeacher = !teacherName ||
      teacherName === 'Lehrkraft' ||
      teacherName === 'deine Lehrkraft' ||
      teacherName.trim().toLowerCase() === 'aufgabenheft';
    const teacherSignOff = isGenericTeacher ? 'Deine Lehrkraft' : teacherName;

    const cleanSchoolName = schoolName || 'Campus-Groovelab';
    const closingSchool = !cleanSchoolName.toLowerCase().includes('campus-groovelab')
      ? `${cleanSchoolName} • Campus-Groovelab`
      : cleanSchoolName;

    const shareBody = `Hallo ${studentFirstName},\n\nhier ist dein persönlicher Wochenplan mit den aktuellen Übezielen aus unserem Unterricht:\n\n${divider}\nÜBE-ZIELE • KW ${weekNumber}\n${divider}\n\n${tasksBlock}\n\n${divider}\nDIGITALES AUFGABENHEFT\nAufnahmen zum Mitspielen, Songs & Übe-Tools:\n${appUrl}\n\nHerzliche Grüße\n${teacherSignOff}\n${closingSchool}`;

    return {
      shareSubject,
      shareBody,
      appUrl
    };
  }, [getCurrentHomeworkSnapshot]);

  const handleShareEmail = useCallback((customData?: any) => {
    const { shareSubject, shareBody } = getHomeworkFormattedSummary(customData);
    const mailUrl = `mailto:?subject=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareBody)}`;
    window.location.href = mailUrl;
    setIsShareMenuOpen(false);
  }, [getHomeworkFormattedSummary]);

  const handleCopyShareLink = useCallback((customData?: any) => {
    try {
      const { shareBody } = getHomeworkFormattedSummary(customData);
      const success = copyTextToClipboard(shareBody);
      if (success) {
        setIsLinkCopied(true);
        setTimeout(() => setIsLinkCopied(false), 2500);
      }
    } catch (e) {
      console.warn('Clipboard write failed', e);
    }
  }, [getHomeworkFormattedSummary]);

  // 🖨️ Air-Gapped Notenständer DIN-A4 Druckansicht (1% Goldstandard 4-Säulen-Dossier)
  const handlePrintHomeworkSheet = useCallback((customData?: any) => {
    try {
      const snap = getCurrentHomeworkSnapshot();

      const lehrwerkeList: Array<{ title: string; pages?: number[]; notes?: string[] | string }> =
        (customData?.lehrwerke && customData.lehrwerke.length > 0)
          ? customData.lehrwerke
          : snap.items.filter(it => it.type === 'lehrwerk').map(lw => ({
              title: lw.title,
              notes: lw.notes
            }));

      const songsList: Array<{ title: string; artist?: string; notes?: string }> =
        (customData?.songs && customData.songs.length > 0)
          ? customData.songs
          : snap.items.filter(it => it.type === 'song').map(s => ({
              title: s.title,
              notes: s.notes
            }));

      const notesList: string[] =
        (customData?.notes && customData.notes.length > 0)
          ? customData.notes
          : snap.items.filter(it => it.type === 'note').map(n => n.title);

      // 🛡️ Forensische Datentrennung: studentQuestion wird am Notenständer-Druckausdruck und in E-Mails
      // ausnahmslos weggelassen (vertraulicher didaktischer Dialog zwischen Schüler & Lehrkraft)

      const audioList: Array<{ label: string; duration?: string; date?: string; url?: string }> =
        (customData?.audioRecordings && customData.audioRecordings.length > 0)
          ? customData.audioRecordings
          : (snap.audioRecordings || []);

      const studentFirstName = customData?.studentFirstName || snap.studentFirstName || 'Schüler';
      const studentFullName = customData?.studentName || snap.studentName || studentFirstName;
      const teacherName = customData?.teacherName || snap.teacherName;
      const schoolName = customData?.schoolName || snap.schoolName || 'Campus-Groovelab';
      const instrument = customData?.instrument || snap.instrument || '';
      const weekNumber = customData?.weekNumber || snap.weekNumber || '';
      const date = customData?.date || snap.date || new Date().toLocaleDateString('de-DE');

      const printHtml = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Wochenplan • ${studentFirstName}</title>
  <style>
    @page { size: A4 portrait; margin: 16mm 16mm 16mm 16mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      line-height: 1.45;
      font-size: 11pt;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .header h1 {
      margin: 0;
      font-size: 19pt;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .header .meta {
      font-size: 10pt;
      color: #475569;
      font-weight: 600;
      margin-top: 4px;
    }
    .header-right {
      text-align: right;
    }
    .badge {
      display: inline-block;
      background: #f1f5f9;
      border: 1.5px solid #cbd5e1;
      padding: 3px 12px;
      border-radius: 20px;
      font-size: 10pt;
      font-weight: 800;
      color: #15803d;
    }
    .section-title {
      font-size: 10pt;
      font-weight: 800;
      color: #047857;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 16px 0 8px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .task-card {
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 14px;
      margin-bottom: 8px;
      background: #fafafa;
    }
    .task-title {
      font-weight: 750;
      font-size: 11pt;
      color: #0f172a;
    }
    .task-notes {
      font-size: 10pt;
      color: #475569;
      margin-top: 4px;
    }
    .task-subnote {
      font-size: 9.5pt;
      color: #334155;
      margin-top: 3px;
      padding-left: 8px;
      border-left: 2px solid #86efac;
    }
    .notes-box {
      border: 1.5px solid #cbd5e1;
      background: #ffffff;
      border-radius: 10px;
      padding: 10px 14px;
      min-height: 55px;
      font-size: 10.5pt;
    }
    .notes-line {
      margin-bottom: 4px;
      line-height: 1.4;
    }
    .audio-card {
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      padding: 10px 14px;
      background: #f8fafc;
      margin-bottom: 8px;
    }
    .audio-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      border-bottom: 1px dashed #e2e8f0;
      font-size: 10pt;
    }
    .audio-item:last-child {
      border-bottom: none;
    }
    .audio-item-title {
      font-weight: 700;
      color: #0f172a;
    }
    .audio-item-meta {
      font-size: 9pt;
      color: #64748b;
      font-weight: 600;
    }
    .audio-hint {
      font-size: 8.5pt;
      color: #64748b;
      margin-top: 6px;
      font-style: italic;
    }
    .practice-tracker {
      margin-top: 20px;
      border: 2px dashed #047857;
      border-radius: 12px;
      padding: 10px 14px;
      background: #f0fdf4;
    }
    .tracker-title {
      font-size: 10pt;
      font-weight: 800;
      color: #047857;
      margin-bottom: 8px;
    }
    .tracker-days {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .tracker-day {
      flex: 1;
      text-align: center;
      border: 1px solid #86efac;
      background: #ffffff;
      border-radius: 8px;
      padding: 6px 4px;
    }
    .day-name {
      font-size: 9pt;
      font-weight: 800;
      color: #15803d;
      text-transform: uppercase;
    }
    .day-box {
      width: 18px;
      height: 18px;
      border: 2px solid #cbd5e1;
      border-radius: 4px;
      margin: 4px auto 0 auto;
    }
    .footer {
      margin-top: 22px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5pt;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${studentFirstName ? `Wochenplan: ${studentFirstName}` : 'Wochen-Übeplan'}</h1>
      <div class="meta">${schoolName}${instrument ? ` • ${instrument}` : ''}</div>
    </div>
    <div class="header-right">
      <div class="badge">KW ${weekNumber}</div>
      <div class="meta" style="margin-top: 4px;">Stand: ${date}</div>
    </div>
  </div>

  ${lehrwerkeList.length > 0 ? `
    <div class="section-title">Lehrwerke & Etüden</div>
    ${lehrwerkeList.map(lw => {
      let pagesSuffix = '';
      if (lw.pages && lw.pages.length > 0) {
        const sortedPages = [...lw.pages].sort((a, b) => a - b);
        pagesSuffix = ` (S. ${sortedPages.join(', ')})`;
      }
      const cleanTitle = lw.title.replace(/\s*\(S\.\s*[^)]+\)$/i, '').trim();
      const notesArr = Array.isArray(lw.notes) ? lw.notes : (lw.notes ? [lw.notes] : []);
      return `
        <div class="task-card">
          <div class="task-title">${cleanTitle}${pagesSuffix}</div>
          ${notesArr.length > 0 ? notesArr.map(n => `<div class="task-subnote">${capitalizeFirstLetter(n.replace(/^[📌📝•-]\s*/, '').trim())}</div>`).join('') : ''}
        </div>
      `;
    }).join('')}
  ` : ''}

  ${songsList.length > 0 ? `
    <div class="section-title">Repertoire & Songs</div>
    ${songsList.map(s => {
      const rawArtist = (s.artist || '').trim();
      let displayTitle = (s.title || '').trim();
      if (rawArtist && !displayTitle.toLowerCase().includes(rawArtist.toLowerCase())) {
        displayTitle = `${rawArtist} – ${displayTitle}`;
      }
      return `
        <div class="task-card">
          <div class="task-title">${displayTitle}</div>
          ${s.notes ? `<div class="task-notes">Fahrplan: ${s.notes}</div>` : ''}
        </div>
      `;
    }).join('')}
  ` : ''}

  <div class="section-title">Hausaufgaben & Notizen</div>
  <div class="notes-box">
    ${notesList.length > 0 
      ? notesList.map(n => `<div class="notes-line">• ${capitalizeFirstLetter(cleanNotesText(n).replace(/^[📌📝•-]\s*/, '').trim())}</div>`).join('')
      : '<div class="notes-line">Aktuelle Übungen aus dem Unterricht wie besprochen fortführen.</div>'}
  </div>

  ${audioList.length > 0 ? `
    <div class="section-title">Aufnahmen zum Mitspielen</div>
    <div class="audio-card">
      ${audioList.map(a => `
        <div class="audio-item">
          <span class="audio-item-title">${a.label}</span>
          <span class="audio-item-meta">${a.duration ? a.duration : ''}${a.date ? ` • ${a.date}` : ''}</span>
        </div>
      `).join('')}
      <div class="audio-hint">Diese Aufnahmen sind in deiner Campus-Groovelab Web-App hinterlegt. Öffne die App, um direkt dazu mitzuspielen!</div>
    </div>
  ` : ''}

  <div class="practice-tracker">
    <div class="tracker-title">Meine Übe-Woche am Notenständer (Täglich nach dem Üben abhaken)</div>
    <div class="tracker-days">
      <div class="tracker-day"><div class="day-name">Mo</div><div class="day-box"></div></div>
      <div class="tracker-day"><div class="day-name">Di</div><div class="day-box"></div></div>
      <div class="tracker-day"><div class="day-name">Mi</div><div class="day-box"></div></div>
      <div class="tracker-day"><div class="day-name">Do</div><div class="day-box"></div></div>
      <div class="tracker-day"><div class="day-name">Fr</div><div class="day-box"></div></div>
      <div class="tracker-day"><div class="day-name">Sa</div><div class="day-box"></div></div>
      <div class="tracker-day"><div class="day-name">So</div><div class="day-box"></div></div>
    </div>
  </div>

  <div class="footer">
    <div>Persönlicher Übeplan für ${studentFullName}${teacherName && teacherName !== 'Lehrkraft' ? ` • Lehrkraft: ${teacherName}` : ''}</div>
    <div>Campus-Groovelab</div>
  </div>
</body>
</html>`;

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '10px';
      iframe.style.height = '10px';
      iframe.style.opacity = '0.01';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const contentWin = iframe.contentWindow;
      if (contentWin) {
        contentWin.document.open();
        contentWin.document.write(printHtml);
        contentWin.document.close();

        const triggerPrint = () => {
          try {
            contentWin.focus();
            contentWin.print();
          } catch (err) {
            console.error('[PrintHomework] print error:', err);
            window.print();
          } finally {
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 3000);
          }
        };

        // Give browser microtask delay to layout before print dialog opens
        setTimeout(triggerPrint, 350);
      } else {
        window.print();
      }
    } catch (e) {
      console.warn('[PrintHomework] failed', e);
      window.print();
    }
  }, [getCurrentHomeworkSnapshot]);

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

  // 🏷️ 2027 Goldstandard Song Tagging & Audio Customizations
  const [audioSongTags, setAudioSongTags] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`campus_audio_song_tags_${student.id}`) || localStorage.getItem('campus_audio_song_tags');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const availableSongsForTagging = useMemo(() => {
    const list: string[] = [];
    (activeSongSkills || []).forEach(s => {
      const title = s.songs?.title ? `${s.songs?.artist ? s.songs.artist + ' - ' : ''}${s.songs.title}` : (s.title || s.song_title);
      if (title && !list.includes(title)) list.push(title);
    });
    return list;
  }, [activeSongSkills]);

  const handleUpdateAudioSongTag = useCallback((url: string, tag: string | null) => {
    setAudioSongTags(prev => {
      const next = { ...prev };
      if (tag) next[url] = tag;
      else delete next[url];
      try {
        localStorage.setItem(`campus_audio_song_tags_${student.id}`, JSON.stringify(next));
        localStorage.setItem('campus_audio_song_tags', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [student.id]);

  const handleSaveEditedTeacherAudio = useCallback(async (result: { url: string; original_url?: string; duration: number; original_duration?: number; label: string; mode: 'overwrite' | 'duplicate'; is_edited?: boolean; loop_locator?: any }, originalIdx?: number, currentUrl?: string) => {
    if (result.loop_locator) {
      try {
        const { saveLoopLocator } = await import('../utils/audioLoopLocatorStorage');
        saveLoopLocator(result.url || currentUrl || '', result.loop_locator);
      } catch (err) {
        console.warn('Error saving loop locator:', err);
      }
    }
  }, []);

  const handleAssignSongFromCatalog = useCallback(async (songId: string) => {
    if (!songId || !student.id) return;

    const existing = activeSongSkills.find((s: any) => s.song_id === songId);
    if (existing) {
      setSelectedActiveSongId(existing.id);
      setActiveInputTab('active_song');
      setActiveSubView('song');
      return;
    }

    try {
      const defaultInstrument = (student as any)?.instrument ||
        (student as any)?.instrument_name ||
        activeSongSkills[0]?.instrument ||
        globalLehrwerke.find(l => assignedLehrwerke.some(a => a.lehrwerkId === l.id))?.instrument ||
        'Gitarre';

      let newSkill: any = null;
      try {
        const { data, error } = await supabase
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
        if (!error && data) newSkill = data;
      } catch (dbErr) {
        console.warn('[Meisterwerk] DB insert user_song_skills notice:', dbErr);
      }

      if (!newSkill) {
        const catalogSong = songs.find(s => s.id === songId);
        newSkill = {
          id: `skill-${Date.now()}`,
          user_id: student.id,
          song_id: songId,
          instrument: defaultInstrument,
          progress_percent: 0,
          is_stage_ready: false,
          songs: catalogSong || { id: songId, title: 'Neuer Song', artist: 'Unbekannt' }
        };
        try {
          const localStored = localStorage.getItem('campus_user_song_skills');
          const existingLocal = localStored ? JSON.parse(localStored) : [];
          localStorage.setItem('campus_user_song_skills', JSON.stringify([...existingLocal, newSkill]));
        } catch {}
      }

      setActiveSongSkills(prev => [...prev.filter(s => s.id !== newSkill.id), newSkill]);
      await loadActiveSongSkills();
      setSelectedActiveSongId(newSkill.id);
      setActiveInputTab('active_song');
      setActiveSubView('song');
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error assigning song from catalog:', e);
    }
  }, [student, activeSongSkills, globalLehrwerke, assignedLehrwerke, songs, loadActiveSongSkills, notifyHomeworkChange, setSelectedActiveSongId, setActiveInputTab, setActiveSubView]);

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
      let createdSong: any = null;

      // 1. Insert into songs catalog (with fallback)
      try {
        const { data, error } = await supabase
          .from('songs')
          .insert({
            title,
            artist,
            school_id: sId
          })
          .select()
          .single();
        if (!error && data) createdSong = data;
      } catch (dbSongErr) {
        console.warn('[Meisterwerk] DB insert songs notice:', dbSongErr);
      }

      if (!createdSong) {
        createdSong = {
          id: `song-${Date.now()}`,
          title,
          artist,
          school_id: sId
        };
        try {
          const localStored = localStorage.getItem('campus_songs');
          const existingLocal = localStored ? JSON.parse(localStored) : [];
          localStorage.setItem('campus_songs', JSON.stringify([...existingLocal, createdSong]));
        } catch {}
      }

      setSongs(prev => [...prev.filter(s => s.id !== createdSong.id), createdSong]);

      // 2. Assign to student
      const defaultInstrument = (student as any)?.instrument ||
        (student as any)?.instrument_name ||
        activeSongSkills[0]?.instrument ||
        globalLehrwerke.find(l => assignedLehrwerke.some(a => a.lehrwerkId === l.id))?.instrument ||
        'Gitarre';

      let newSkill: any = null;
      try {
        const { data, error } = await supabase
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
        if (!error && data) newSkill = data;
      } catch (dbSkillErr) {
        console.warn('[Meisterwerk] DB insert user_song_skills notice:', dbSkillErr);
      }

      if (!newSkill) {
        newSkill = {
          id: `skill-${Date.now()}`,
          user_id: student.id,
          song_id: createdSong.id,
          instrument: defaultInstrument,
          progress_percent: 0,
          is_stage_ready: false,
          songs: createdSong
        };
        try {
          const localStored = localStorage.getItem('campus_user_song_skills');
          const existingLocal = localStored ? JSON.parse(localStored) : [];
          localStorage.setItem('campus_user_song_skills', JSON.stringify([...existingLocal, newSkill]));
        } catch {}
      }

      setActiveSongSkills(prev => [...prev.filter(s => s.id !== newSkill.id), newSkill]);
      await Promise.all([loadSongs(), loadActiveSongSkills()]);

      setSelectedActiveSongId(newSkill.id);
      setActiveInputTab('active_song');
      setActiveSubView('song');
      notifyHomeworkChange();
    } catch (e) {
      console.error('[Meisterwerk] Error creating and assigning song:', e);
    }
  }, [student, propSchoolId, activeSongSkills, globalLehrwerke, assignedLehrwerke, loadSongs, loadActiveSongSkills, notifyHomeworkChange, setSelectedActiveSongId, setActiveInputTab, setActiveSubView]);

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

  // 🛡️ Fail-Safe Modal-Abschluss: Stoppt aktive Audio-/TTS-Prozesse, sichert Notizen sofort & schließt sauber
  const handleSafeClose = useCallback(() => {
    try {
      triggerImmediateAutoSave();
    } catch {}
    if (isRecordingAudio) {
      try {
        stopRecordingAudio();
      } catch {}
    }
    if (isTtsSpeaking) {
      try {
        handleStopSpeaking();
      } catch {}
    }
    onClose?.();
  }, [triggerImmediateAutoSave, isRecordingAudio, stopRecordingAudio, isTtsSpeaking, handleStopSpeaking, onClose]);

  const handleBackToHub = useCallback(() => {
    setActiveSubView('hub');
    setActiveLehrwerkId(null);
    setActivePageNumber(null);
    setSelectedActiveSongId(null);
    setActiveInputTab('free');
  }, []);

  // F-Key Fullscreen & Escape Key Modal-Close Listener (WAI-ARIA & WCAG 2.2 AA)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSafeClose();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setIsFullscreen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, isEmbed, handleSafeClose]);

  const renderFullscreenButton = () => (
    <button
      type="button"
      onClick={() => setIsFullscreen(prev => !prev)}
      aria-label={isFullscreen ? "Vollbild beenden" : "Vollbildmodus aktivieren"}
      title={isFullscreen ? "Vollbild beenden" : "Vollbildmodus aktivieren"}
      style={{
        background: 'rgba(255, 255, 255, 0.18)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.28)',
        borderRadius: '50%',
        width: '32px',
        height: '32px',
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
        <Minimize2 size={15} strokeWidth={2.4} color="#ffffff" />
      ) : (
        <Maximize2 size={15} strokeWidth={2.4} color="#ffffff" />
      )}
    </button>
  );

  const renderCloseButton = () => {
    if (isEmbed) return null;
    return (
      <button
        type="button"
        onClick={handleSafeClose}
        aria-label="Aufgabenheft schließen"
        title="Aufgabenheft schließen"
        style={{
          background: 'rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.28)',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
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
        border: isMobileOrSim ? 'none' : '1px solid #e2e8f0',
        borderRadius: isMobileOrSim ? '0' : '20px',
        boxShadow: isMobileOrSim
          ? 'none'
          : '0 12px 36px -8px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04)',
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
        onBackToHub={handleBackToHub}
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
          overflowY: (isMobileOrSim || activeViewMode !== 'document' || activeModalTab !== 'document') 
            ? (activeViewMode === 'groovetrainer' && !isMobileOrSim ? 'hidden' : 'auto') 
            : 'hidden',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          minHeight: 0,
          background: '#f8fafc',
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
              teacherName={effectiveTeacherFullName}
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
            height: '100%',
            maxHeight: '100%',
            flex: 1,
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderTop: '1px solid #e2e8f0',
            boxSizing: 'border-box',
            padding: isMobileOrSim ? '12px 12px calc(240px + env(safe-area-inset-bottom, 40px)) 12px' : '10px 20px 10px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: isMobileOrSim ? 'auto' : 'hidden',
            minHeight: 0
          }}>
            <GrooveTrainerStudioView
              student={student}
              onClose={() => { setActiveViewMode('document'); setHubTab('modules'); }}
              onExitToBriefing={() => {
                if (onClose) {
                  onClose();
                } else {
                  setActiveViewMode('document');
                  setHubTab('modules');
                }
              }}
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
              <CampusTuner
                uiLevel={uiLevel}
              />
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
        ) : activeViewMode === 'worldtour' ? (
          <div style={{
            width: '100%',
            height: '100%',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            boxSizing: 'border-box',
            padding: 0,
            overflow: 'hidden'
          }}>
            <WorldTourMapSpread
              studentName={displayedStudentName}
              studentInstrument={(student as any)?.instrument || (student as any)?.resolved_instrument || 'Klavier'}
              uiLevel={uiLevel}
              isMobileView={isMobileOrSim}
            />
          </div>
        ) : activeViewMode === 'recordings' ? (
          <div style={{
            width: '100%',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            boxSizing: 'border-box',
            padding: isMobileOrSim ? '16px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '16px 20px 20px 20px'
          }}>
            <MeisterwerkRecordingsTab
              isTeacherTools={isTeacherTools}
              readOnly={readOnly}
              student={student}
              activeSongSkills={activeSongSkills}
              audioDuration={audioDuration}
              audioLabel={audioLabel}
              audioSongTags={audioSongTags}
              availablePlaylists={[]}
              availableSongsForTagging={availableSongsForTagging}
              expandedStudentAudioWeeks={expandedStudentAudioWeeks}
              expandedTeacherAudioWeeks={expandedTeacherAudioWeeks}
              favoriteAudioUrls={favoriteAudioUrls}
              formatRecordTime={formatRecordTime}
              getISOWeek={getISOWeek}
              getMonthAlbumTheme={(monthKey: string) => {
                const monthNum = parseInt((monthKey || '').split('-')[1] || '1', 10);
                // 💎 Weltklasse 0,1% Goldstandard 12 Uni-Farben (Reine Farben ohne Schwarz/Grau)
                const palettes: Record<number, { bg: string; shadow: string; textColor?: string }> = {
                  1: { bg: '#0891b2', shadow: 'rgba(8, 145, 178, 0.40)' },   // Polar-Cyan (Januar)
                  2: { bg: '#4f46e5', shadow: 'rgba(79, 70, 229, 0.40)' },  // Tiefsee-Indigo (Februar)
                  3: { bg: '#7c3aed', shadow: 'rgba(124, 58, 237, 0.40)' },  // Iris-Violett (März)
                  4: { bg: '#9333ea', shadow: 'rgba(147, 51, 234, 0.40)' },  // Orchideen-Purpur (April)
                  5: { bg: '#65a30d', shadow: 'rgba(101, 163, 13, 0.40)' },  // Pistazie-Limette (Mai)
                  6: { bg: '#059669', shadow: 'rgba(5, 150, 105, 0.40)' },   // Minze-Jade (Juni)
                  7: { bg: '#0f766e', shadow: 'rgba(15, 118, 110, 0.40)' },  // Karibik-Petrol (Juli)
                  8: { bg: '#db2777', shadow: 'rgba(219, 39, 119, 0.40)' },  // Sommer-Himbeere (August)
                  9: { bg: '#b45309', shadow: 'rgba(180, 83, 9, 0.40)' },   // Safran-Kupfer (September)
                  10: { bg: '#ea580c', shadow: 'rgba(234, 88, 12, 0.40)' }, // Kürbis-Orange (Oktober)
                  11: { bg: '#e11d48', shadow: 'rgba(225, 29, 72, 0.40)' },  // Terrakotta-Koralle (November)
                  12: { bg: '#c026d3', shadow: 'rgba(192, 38, 211, 0.40)' }  // Winter-Pflaume (Dezember)
                };
                return palettes[monthNum] || { bg: '#3b82f6', shadow: 'rgba(59, 130, 246, 0.40)' };
              }}
              getNormalizedSongTitle={(s: any) => typeof s === 'string' ? s : (s?.topic_name || '')}
              handleDeleteNote={handleDeleteNote}
              handleDeleteStudentAudio={handleDeleteStudentAudio}
              handleRenameStudentAudio={handleRenameStudentAudio}
              handleRenameTeacherAudio={handleRenameTeacherAudio}
              handleSaveEditedTeacherAudio={handleSaveEditedTeacherAudio}
              handleRevertTeacherAudioToOriginal={async () => {}}
              handleSaveShareToPlaylist={async () => {}}
              handleUpdateAudioSongTag={handleUpdateAudioSongTag}
              hasTresorStorage={propHasTresor ?? false}
              homeworkNotes={generalHomeworkNotes}
              homeworkNotesList={homeworkNotesList}
              isBookAlbum={() => false}
              isCurrentHomework={isCurrentHomework}
              isMobileOrSim={isMobileOrSim}
              isRecordingAudio={isRecordingAudio}
              isRecordingMetronomeActive={isRecordingMetronomeActive}
              isRecordingPadActive={isRecordingPadActive}
              setIsRecordingPadActive={setIsRecordingPadActive}
              isSharingToPlaylist={false}
              isStudentWeekExpanded={isStudentWeekExpanded}
              isTeacherHomeworkExpanded={isTeacherHomeworkExpanded}
              isTeacherMode={isTeacherTools}
              isUploadingAudio={isUploadingAudio}
              matchesAudioSearch={matchesAudioSearch}
              mobileRecordingsTab={mobileRecordingsTab}
              newPlaylistTitle=""
              openHomeworkWeekAccordions={openHomeworkWeekAccordions}
              playMetronomeTick={playMetronomeTick}
              progressItems={progressItems}
              recordingBpm={recordingBpm}
              recordingMetronomeRef={recordingMetronomeRef}
              recordingSearchQuery={recordingSearchQuery}
              selectedStudentMonth={selectedStudentMonth}
              setSelectedStudentMonth={setSelectedStudentMonth}
              selectedStudentSongAlbum={selectedStudentSongAlbum}
              setSelectedStudentSongAlbum={setSelectedStudentSongAlbum}
              selectedTeacherMonth={selectedTeacherMonth}
              setSelectedTeacherMonth={setSelectedTeacherMonth}
              selectedTeacherSongAlbum={selectedTeacherSongAlbum}
              setSelectedTeacherSongAlbum={setSelectedTeacherSongAlbum}
              setAudioLabel={setAudioLabel}
              setIsRecordingMetronomeActive={setIsRecordingMetronomeActive}
              setIsStudentWeekExpanded={setIsStudentWeekExpanded}
              setIsTeacherHomeworkExpanded={setIsTeacherHomeworkExpanded}
              setLocalJuniorRecordingsTrigger={() => {}}
              setMobileRecordingsTab={setMobileRecordingsTab}
              setNewPlaylistTitle={() => {}}
              setOpenHomeworkWeekAccordions={setOpenHomeworkWeekAccordions}
              setRecordingBpm={setRecordingBpm}
              setShareAudioModal={() => {}}
              setShareCustomTitle={() => {}}
              setSharePlaylistId={() => {}}
              setShareProcessing={() => {}}
              setShowNewPlaylistInput={() => {}}
              setShowRecordingMetronomePopup={setShowRecordingMetronomePopup}
              setShowStudentFavoritesOnly={setShowStudentFavoritesOnly}
              setShowTeacherFavoritesOnly={setShowTeacherFavoritesOnly}
              setShowTeacherHomeworkArchive={setShowTeacherHomeworkArchive}
              shareAudioModal={null}
              shareCustomTitle=""
              sharePlaylistId=""
              shareProcessing="raw"
              showNewPlaylistInput={false}
              showRecordingMetronomePopup={showRecordingMetronomePopup}
              showStudentFavoritesOnly={showStudentFavoritesOnly}
              showTeacherFavoritesOnly={showTeacherFavoritesOnly}
              showTeacherHomeworkArchive={showTeacherHomeworkArchive}
              songs={songs}
              startRecordingAudio={startRecordingAudio}
              stopRecordingAudio={stopRecordingAudio}
              handleRetakeRecordingAudio={handleRetakeRecordingAudio}
              recordCountInRemaining={recordCountInRemaining}
              recordCountInMode={recordCountInMode}
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
          </div>
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
            getSongColor={getSongColor}
            renderSongVinylCover={renderSongVinylCover}
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
            activeBrush={activeBrush}
            activeLehrwerkId={activeLehrwerkId}
            activeNoteTarget={activeNoteTarget}
            activePageNumber={activePageNumber}
            activeSongSkills={activeSongSkills}
            activeSubView={activeSubView}
            activeTagPickerRowIndex={null}
            activeTtsKey={activeTtsKey}
            adjustTextareaHeight={adjustTextareaHeight}
            assignedLehrwerke={assignedLehrwerke}
            setAssignedLehrwerke={setAssignedLehrwerke}
            audioDuration={audioDuration}
            audioLabel={audioLabel}
            awardSticker={awardSticker}
            buildCompleteWeeklyHomeworkSpeechPhrases={buildCompleteWeeklyHomeworkSpeechPhrases}
            cancelPlayAlongCountIn={cancelPlayAlongCountIn}
            clickTimeoutRef={{ current: null } as any}
            collectedStickers={{}}
            customTags={customTags}
            effectiveGroupStudents={effectiveGroupStudents}
            effectiveTeacherFullName={effectiveTeacherFullName}
            expressionVal={expressionVal}
            fingerVal={fingerVal}
            formatRecordTime={formatRecordTime}
            generalHomeworkNotes={generalHomeworkNotes}
            getCanonicalSongKey={getCanonicalSongKey}
            getFeedbackForWeek={() => null}
            getHomeworkNoteItems={getHomeworkNoteItems}
            getISOWeek={getISOWeek}
            getItemWeek={getItemWeek}
            getLehrwerkColor={getLehrwerkColor}
            getNormalizedSongTitle={getNormalizedSongTitle}
            getSongColor={getSongColor}
            getTargetWeekIso={getTargetWeekIso}
            getWeekDateRange={getWeekDateRange}
            getWeeksBetween={() => 0}
            globalLehrwerke={globalLehrwerke}
            handleAddCustomTag={handleAddCustomTag}
            handleAssignLehrwerk={handleAssignLehrwerk}
            handleAssignSongFromCatalog={handleAssignSongFromCatalog}
            handleBackToHub={handleBackToHub}
            handleCheckMatch={handleCheckMatch}
            handleCommitStudentRating={handleCommitStudentRating}
            handleCopyShareLink={handleCopyShareLink}
            handlePrintHomeworkSheet={handlePrintHomeworkSheet}
            handleCreateAndAssignLehrwerk={handleCreateAndAssignLehrwerk}
            handleCreateAndAssignSong={handleCreateAndAssignSong}
            handleDeleteNote={handleDeleteNote}
            handleDeletePageNote={handleDeletePageNote}
            handleDeleteSingleNoteItem={handleDeleteSingleNoteItem}
            handlePageDoubleClick={handlePageDoubleClick}
            handleRemoveLehrwerk={handleRemoveLehrwerk}
            handleRemoveSong={handleRemoveSong}
            handleResetAllCurrentHomework={handleResetAllCurrentHomework}
            handleResolveStudentQuestion={handleResolveStudentQuestion}
            handleSave={handleSave}
            handleSaveStudentQuestion={handleSaveStudentQuestion}
            handleSetRowTag={handleSetRowTag}
            handleShareEmail={handleShareEmail}
            handleSpeakText={handleSpeakText}
            handleStartPlayAlongRecording={handleStartPlayAlongRecording}
            handleStopSpeaking={handleStopSpeaking}
            handleStudentRatingChange={handleStudentRatingChange}
            handleToggleMatchMode={handleToggleMatchMode}
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
            isMatchModeEnabled={isMatchModeEnabled}
            isMatchRevealed={isMatchRevealed}
            isMobileOrSim={isMobileOrSim}
            isMobileView={isMobileView}
            isQuestionEditorOpen={isQuestionEditorOpen}
            isRecordingAudio={isRecordingAudio}
            isRecordingMetronomeActive={isRecordingMetronomeActive}
            isSavingFeedback={false}
            isSavingQuestion={isSavingQuestion}
            isShareMenuOpen={isShareMenuOpen}
            isSongMatch={areSongsIdentical}
            isStudentNotePrivate={isStudentNotePrivate}
            isStudentRatingCommitted={isStudentRatingCommitted}
            isSubSlidersExpanded={isSubSlidersExpanded}
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
            newLehrwerkLoading={newLehrwerkLoading}
            newLehrwerkPages={newLehrwerkPages}
            newLehrwerkTitle={newLehrwerkTitle}
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
            questionDraftText={questionDraftText}
            readOnly={readOnly}
            recordingBpm={recordingBpm}
            renderSongVinylCover={renderSongVinylCover}
            renderTextWithDidacticBadges={(txt) => txt}
            rhythmVal={rhythmVal}
            saveFeedback={() => {}}
            schoolId={propSchoolId}
            selectActiveSong={(skill: any) => {
              if (skill?.id) {
                setSelectedActiveSongId(skill.id);
                setActiveInputTab('active_song');
                setActiveSubView('song');
              }
            }}
            selectTextbookPage={(bookId: string, pageNum: number) => {
              setActiveLehrwerkId(bookId);
              setActivePageNumber(pageNum);
              setActiveInputTab('lehrwerk_page');
              setActiveSubView('lehrwerk');
            }}
            selectedActiveSongId={selectedActiveSongId}
            selectedCategoryFilter={null}
            selectedHistoryWeek={selectedHistoryWeek}
            setActiveBrush={setActiveBrush}
            setActiveInputTab={setActiveInputTab}
            setActiveLehrwerkId={setActiveLehrwerkId}
            setActiveModalTab={setActiveModalTab}
            setActiveNoteTarget={setActiveNoteTarget}
            setActivePageNumber={setActivePageNumber}
            setActiveSongSkills={setActiveSongSkills}
            setActiveSubView={setActiveSubView}
            setActiveTagPickerRowIndex={setActiveTagPickerRowIndex}
            setActiveViewMode={setActiveViewMode}
            setAudioLabel={setAudioLabel}
            setExpressionVal={setExpressionVal}
            setFingerVal={setFingerVal}
            setGeneralHomeworkNotes={setGeneralHomeworkNotes}
            setHasChanges={setHasChanges}
            setHomeworkNotesList={setHomeworkNotesList}
            setHubTab={setHubTab}
            setIsCountInEnabled={setIsCountInEnabled}
            setIsCurrentHomework={setIsCurrentHomework}
            setIsNotesFocused={() => {}}
            setIsQuestionEditorOpen={setIsQuestionEditorOpen}
            setIsRecordingMetronomeActive={setIsRecordingMetronomeActive}
            setIsSavingFeedback={() => {}}
            setIsShareMenuOpen={setIsShareMenuOpen}
            setIsStudentNotePrivate={setIsStudentNotePrivate}
            setIsSubSlidersExpanded={setIsSubSlidersExpanded}
            setIsTransferModalOpen={setIsTransferModalOpen}
            setMobileProtokollTab={setMobileProtokollTab}
            setNewCustomTagInput={() => {}}
            setNewLehrwerkPages={setNewLehrwerkPages}
            setNewLehrwerkTitle={setNewLehrwerkTitle}
            setNewSongArtist={() => {}}
            setNewSongTitle={() => {}}
            setPageChunk={() => {}}
            setPageHomeworkNotes={setPageHomeworkNotes}
            setPendingFeedbackStatus={() => {}}
            setPendingFeedbackTags={() => {}}
            setQuestionDraftText={handleQuestionDraftChange}
            setRecordingBpm={setRecordingBpm}
            setRhythmVal={setRhythmVal}
            setSelectedHistoryWeek={setSelectedHistoryWeek}
            setShowAllPagesGrid={() => {}}
            setShowAssignDropdown={setShowAssignDropdown}
            setShowCreateLehrwerkModal={setShowCreateLehrwerkModal}
            setShowCreateSongModal={() => {}}
            setShowPlayAlongMetronomePopup={setShowPlayAlongMetronomePopup}
            setSongHomeworkNotes={setSongHomeworkNotes}
            setSongModalTab={() => {}}
            setSongProgressPercent={setSongProgressPercent}
            setSongSearch={() => {}}
            setStatus={setStatus}
            setStudentNotes={setStudentNotes}
            setTeacherNotes={setTeacherNotes}
            setViewingWeekOffset={setViewingWeekOffset}
            shareMenuRef={{ current: null } as any}
            showAssignDropdown={showAssignDropdown}
            showCreateLehrwerkModal={showCreateLehrwerkModal}
            showCreateSongModal={false}
            showMatchConfetti={showMatchConfetti || matchGameShowConfetti}
            showPlayAlongMetronomePopup={showPlayAlongMetronomePopup}
            showdownState={showdownState}
            songHomeworkNotes={songHomeworkNotes}
            songModalTab="search"
            songNotesSelectionRef={{ current: null } as any}
            songNotesTextareaRef={{ current: null } as any}
            songProgressPercent={songProgressPercent}
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
            studentRating={studentRating}
            studentRatingUpdatedAt={studentRatingUpdatedAt}
            teacherId={teacherId}
            teacherNotes={teacherNotes}
            teacherNotesTextareaRef={{ current: null } as any}
            textbookPageChunkIndex={0}
            toggleStudentFocusPage={toggleStudentFocusPage}
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
            teacherName={effectiveTeacherFullName}
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
          teacherName={effectiveTeacherFullName}
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
