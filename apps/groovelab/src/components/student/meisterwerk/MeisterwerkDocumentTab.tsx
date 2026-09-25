import React, { Suspense, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Activity, ArrowRightLeft, Award, BookOpen, Calendar, Check, CheckCircle, ChevronDown, ChevronLeft,
  ChevronRight, Clock, Compass, Copy, Disc, Edit3, FileText, Globe, Hash, Headphones, HelpCircle, History, Lightbulb,
  Lock, Mail, Mic, Moon, Music, Pin, Play, Plus, Radio, RotateCcw, Search, Settings, Share2, Sliders,
  Sparkles, Square, Star, Target, Timer, Trash2, User, Volume2, VolumeX, AlertCircle,
  Eye, EyeOff, Hand, Info, MessageSquare, Pencil, Printer, RefreshCw, RotateCw, Unlock, Users, Wrench, Zap, X, Send
} from 'lucide-react';
import Confetti from 'react-confetti';
import { AudioTrackCarousel } from '../../AudioTrackCarousel';
import { MeisterOhrSticker } from '../../MeisterOhrSticker';
import { CampusPinUnlockModal } from '../../CampusPinUnlockModal';
import { SpeechDictationButton } from '../SpeechDictationButton';
import { MechanicalMetronomeIcon } from './MeisterwerkAudioPlayers';
import { AudioSettingsSheet } from './AudioSettingsSheet';
import { Student } from '../meisterwerk.types';
import { StudioModuleKey, ALL_STUDIO_MODULE_KEYS } from '../studentAgeStandards';
import {
  cleanSongOrBookTitle,
  formatHarmonizedAudioTitle,
  formatAudioDate
} from '../../../utils/audioNamingHelper';
import {
  formatTeacherFullName,
  capitalizeFirstLetter,
  formatSongTitleCase,
  copyTextToClipboard,
  maskLastName
} from '../../../utils/nameHelper';
import { getCanonicalQrLandingUrl } from '../../../utils/tenantUrlHelper';
import {
  formatPageNumbers,
  getCleanPageNotes,
  getCleanTeacherHomeworkText,
  formatStudentNoteDisplay,
  parseStudentQuestionFromNotes,
  parseStudentAnnotation,
  parseSongArtistAndTitle,
  SKILL_TAGS
} from '../meisterwerk.types';
import {
  ALL_STICKERS,
  getUnifiedStickerStatus,
  getUnifiedStickersMap,
  cleanNotesText,
  filterNotesForStudent,
  isInternalMetadataNote
} from '../../../domain/stickersAndTresor';
import { formatPageNumbersGerman } from '../../../services/neuralTtsService';
import {
  levenshteinDistance,
  normalizeSongStr,
  extractSongArtistAndTitle,
  areSongsIdentical,
  formatDisplayTitle
} from './utils/meisterwerkSongHelpers';
import { SongStructureBar, type SongSection } from './components/SongStructureBar';
import { SongSectionCard } from './components/SongSectionCard';
import { getInstrumentAvatarUrl } from '../studentAvatars.constants';
import { getSimulatedNow, getWeekDateRange } from '../studentDateUtils';
import { useDictationInput } from '../../../hooks/useVoiceToText';

export type MeisterwerkBrushType = 'NONE' | 'LOCKED' | 'HOMEWORK' | 'MASTERED' | 'THEORY' | 'STUDENT_FOCUS';
export type MeisterwerkFeedbackStatus = 'beherrscht' | 'in_entwicklung' | 'wiederholen' | null;

export interface LehrwerkExercise {
  id: string;
  label: string;
  status: 'locked' | 'homework' | 'mastered';
  targetBpm?: number;
  notes?: string;
  createdBy?: 'teacher' | 'student';
}

export interface MeisterwerkDocumentTabProps {
  DIDACTIC_QUICK_TAGS: any[];
  PRESET_CHIPS: any[];
  activeBrush: MeisterwerkBrushType;
  activeLehrwerkId: any;
  activeNoteTarget: any;
  activePageNumber: any;
  activeSongSkills: any[];
  activeSubView: any;
  activeTagPickerRowIndex: number | null;
  activeTtsKey: any;
  adjustTextareaHeight: (...args: any[]) => any;
  assignedLehrwerke: any[];
  setAssignedLehrwerke?: (val: any) => void;
  audioDuration: number;
  audioLabel: any;
  awardSticker: (...args: any[]) => any;
  buildCompleteWeeklyHomeworkSpeechPhrases: (...args: any[]) => any;
  cancelPlayAlongCountIn: (...args: any[]) => any;
  clickTimeoutRef: React.MutableRefObject<any>;
  collectedStickers: Record<string, any>;
  customTags: any[];
  effectiveGroupStudents: any[];
  effectiveTeacherFullName: any;
  expressionVal: number;
  fingerVal: number;
  formatRecordTime: (...args: any[]) => any;
  generalHomeworkNotes: string;
  getCanonicalSongKey: (...args: any[]) => any;
  getFeedbackForWeek: (...args: any[]) => any;
  getHomeworkNoteItems: (...args: any[]) => any;
  getISOWeek: (...args: any[]) => any;
  getItemWeek: (...args: any[]) => any;
  getLehrwerkColor: (...args: any[]) => any;
  getNormalizedSongTitle: (...args: any[]) => any;
  getSongColor: (...args: any[]) => any;
  getTargetWeekIso: (...args: any[]) => any;
  getWeekDateRange: (...args: any[]) => any;
  getWeeksBetween: (...args: any[]) => any;
  globalLehrwerke: any[];
  handleAddCustomTag: (...args: any[]) => any;
  handleAssignLehrwerk: (...args: any[]) => any;
  handleAssignSongFromCatalog: (...args: any[]) => any;
  handleBackToHub: (...args: any[]) => any;
  handleCheckMatch: (...args: any[]) => any;
  handleCommitStudentRating: (...args: any[]) => any;
  handleCopyShareLink: (...args: any[]) => any;
  handlePrintHomeworkSheet?: (...args: any[]) => any;
  handleCreateAndAssignLehrwerk: (...args: any[]) => any;
  handleCreateAndAssignSong: (...args: any[]) => any;
  handleDeleteNote: (...args: any[]) => any;
  handleDeletePageNote: (...args: any[]) => any;
  handleDeleteSingleNoteItem: (...args: any[]) => any;
  handlePageDoubleClick: (...args: any[]) => any;
  handleRemoveLehrwerk: (...args: any[]) => any;
  handleRemoveSong: (...args: any[]) => any;
  handleResetAllCurrentHomework: (...args: any[]) => any;
  handleResolveStudentQuestion: (...args: any[]) => any;
  handleSave: (...args: any[]) => any;
  handleSaveStudentQuestion: (...args: any[]) => any;
  handleSetRowTag: (...args: any[]) => any;
  handleShareEmail: (...args: any[]) => any;
  handleSpeakText: (...args: any[]) => any;
  handleStartPlayAlongRecording: (...args: any[]) => any;
  handleStopSpeaking: (...args: any[]) => any;
  handleStudentRatingChange: (...args: any[]) => any;
  handleToggleMatchMode: (...args: any[]) => any;
  handleTogglePresetChip: (...args: any[]) => any;
  hasTresorStorage: boolean;
  hasTransferableHomework?: boolean;
  homeworkNotes: any;
  homeworkNotesList: any[];
  hubTab: any;
  insertOrToggleTagInText: (...args: any[]) => any;
  isCampusActive?: boolean;
  isCountInEnabled: boolean;
  isCurrentHomework: boolean;
  isFullscreen: boolean;
  isInsideSim: boolean;
  isLinkCopied: boolean;
  isMatchModeEnabled: boolean;
  isMatchRevealed: boolean;
  isMobileOrSim: boolean;
  isMobileView: boolean;
  isQuestionEditorOpen: boolean;
  isRecordingAudio: boolean;
  isRecordingMetronomeActive: boolean;
  isSavingFeedback: boolean;
  isSavingQuestion: boolean;
  isShareMenuOpen: boolean;
  isSongMatch: (item: any, skill: any) => boolean;
  isStudentNotePrivate: boolean;
  isStudentRatingCommitted: boolean;
  isSubSlidersExpanded: boolean;
  isTeacherMode: boolean;
  isTeacherTools: boolean;
  isTeacherSelf?: boolean;
  isTtsSpeaking: boolean;
  isUploadingAudio: boolean;
  lastClickRef: React.MutableRefObject<any>;
  lastMatchedAt: any;
  lastMatchedStudentPercent: any;
  lastMatchedTeacherPercent: any;
  latestGeneralHomeworkNotesRef: React.MutableRefObject<any>;
  latestTeacherNotesRef: React.MutableRefObject<any>;
  matchHistory: any[];
  mobileProtokollTab: any;
  newCustomTagInput: any;
  newLehrwerkLoading: boolean;
  newLehrwerkPages: string;
  newLehrwerkTitle: any;
  newSongArtist: any;
  newSongTitle: any;
  onClose?: () => void;
  onOpenAssignModal?: () => void;
  pageHomeworkNotes: string;
  pageNotesSelectionRef: React.MutableRefObject<any>;
  pageNotesTextareaRef: React.MutableRefObject<any>;
  parsedStudentQuestion: any;
  pendingFeedbackStatus: MeisterwerkFeedbackStatus;
  pendingFeedbackTags: any[];
  playAlongCountInRemaining: number | null;
  playMetronomeTick: (...args: any[]) => any;
  progressItems: any[];
  questionDraftText: any;
  readOnly: boolean;
  recordingBpm: number;
  renderSongVinylCover: (...args: any[]) => any;
  renderTextWithDidacticBadges: (...args: any[]) => any;
  rhythmVal: number;
  saveFeedback: (...args: any[]) => any;
  schoolId: any;
  selectActiveSong: (...args: any[]) => any;
  selectTextbookPage: (...args: any[]) => any;
  selectedActiveSongId: string | null;
  selectedCategoryFilter: string | null;
  selectedHistoryWeek: string | null;
  setActiveBrush: React.Dispatch<React.SetStateAction<MeisterwerkBrushType>>;
  setActiveInputTab: React.Dispatch<React.SetStateAction<any>>;
  setActiveLehrwerkId: React.Dispatch<React.SetStateAction<any>>;
  setActiveModalTab: React.Dispatch<React.SetStateAction<any>>;
  setActiveNoteTarget: React.Dispatch<React.SetStateAction<any>>;
  setActivePageNumber: React.Dispatch<React.SetStateAction<any>>;
  setActiveSongSkills: React.Dispatch<React.SetStateAction<any[]>>;
  setActiveSubView: React.Dispatch<React.SetStateAction<any>>;
  setActiveTagPickerRowIndex: React.Dispatch<React.SetStateAction<any>>;
  setActiveViewMode: React.Dispatch<React.SetStateAction<any>>;
  setAudioLabel: React.Dispatch<React.SetStateAction<any>>;
  setExpressionVal: React.Dispatch<React.SetStateAction<any>>;
  setFingerVal: React.Dispatch<React.SetStateAction<any>>;
  setGeneralHomeworkNotes: React.Dispatch<React.SetStateAction<string>>;
  setHasChanges: React.Dispatch<React.SetStateAction<any>>;
  setHomeworkNotesList: React.Dispatch<React.SetStateAction<any[]>>;
  setHubTab: React.Dispatch<React.SetStateAction<any>>;
  setIsCountInEnabled: React.Dispatch<React.SetStateAction<any>>;
  setIsCurrentHomework: React.Dispatch<React.SetStateAction<any>>;
  setIsNotesFocused: React.Dispatch<React.SetStateAction<any>>;
  setIsQuestionEditorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsRecordingMetronomeActive: React.Dispatch<React.SetStateAction<any>>;
  setIsSavingFeedback: React.Dispatch<React.SetStateAction<any>>;
  setIsShareMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsStudentNotePrivate: React.Dispatch<React.SetStateAction<any>>;
  setIsSubSlidersExpanded: React.Dispatch<React.SetStateAction<any>>;
  setIsTransferModalOpen: React.Dispatch<React.SetStateAction<any>>;
  setMobileProtokollTab: React.Dispatch<React.SetStateAction<any>>;
  setNewCustomTagInput: React.Dispatch<React.SetStateAction<any>>;
  setNewLehrwerkPages: React.Dispatch<React.SetStateAction<any>>;
  setNewLehrwerkTitle: React.Dispatch<React.SetStateAction<any>>;
  setNewSongArtist: React.Dispatch<React.SetStateAction<any>>;
  setNewSongTitle: React.Dispatch<React.SetStateAction<any>>;
  setPageChunk: React.Dispatch<React.SetStateAction<any>>;
  setPageHomeworkNotes: React.Dispatch<React.SetStateAction<string>>;
  setPendingFeedbackStatus: React.Dispatch<React.SetStateAction<MeisterwerkFeedbackStatus>>;
  setPendingFeedbackTags: React.Dispatch<React.SetStateAction<string[]>>;
  setQuestionDraftText: React.Dispatch<React.SetStateAction<string>>;
  setRecordingBpm: React.Dispatch<React.SetStateAction<number>>;
  setRhythmVal: React.Dispatch<React.SetStateAction<any>>;
  setSelectedHistoryWeek: React.Dispatch<React.SetStateAction<any>>;
  setShowAllPagesGrid: React.Dispatch<React.SetStateAction<any>>;
  setShowAssignDropdown: React.Dispatch<React.SetStateAction<any>>;
  setShowCreateLehrwerkModal: React.Dispatch<React.SetStateAction<any>>;
  setShowCreateSongModal: React.Dispatch<React.SetStateAction<any>>;
  setShowPlayAlongMetronomePopup: React.Dispatch<React.SetStateAction<any>>;
  setSongHomeworkNotes: React.Dispatch<React.SetStateAction<string>>;
  setSongModalTab: React.Dispatch<React.SetStateAction<any>>;
  setSongProgressPercent: React.Dispatch<React.SetStateAction<any>>;
  setSongSearch: React.Dispatch<React.SetStateAction<any>>;
  setStatus: React.Dispatch<React.SetStateAction<any>>;
  setStudentNotes: React.Dispatch<React.SetStateAction<string>>;
  setTeacherNotes: React.Dispatch<React.SetStateAction<string>>;
  setViewingWeekOffset: React.Dispatch<React.SetStateAction<number>>;
  shareMenuRef: React.MutableRefObject<any>;
  showAssignDropdown: boolean;
  showCreateLehrwerkModal: boolean;
  showCreateSongModal: boolean;
  showMatchConfetti: boolean;
  showPlayAlongMetronomePopup: boolean;
  showdownState: any;
  songHomeworkNotes: string;
  songModalTab: any;
  songNotesSelectionRef: React.MutableRefObject<any>;
  songNotesTextareaRef: React.MutableRefObject<any>;
  songProgressPercent: any;
  songSearch: any;
  songs: any[];
  sortedAssignedLehrwerke: any[];
  status: string;
  stopRecordingAudio: (...args: any[]) => any;
  student: Student;
  studentFirstName: any;
  studentNotes: string;
  studentNotesSelectionRef: React.MutableRefObject<any>;
  studentNotesTextareaRef: React.MutableRefObject<any>;
  studentRating: any;
  studentRatingUpdatedAt: any;
  teacherId: any;
  teacherNotes: string;
  teacherNotesTextareaRef: React.MutableRefObject<any>;
  textbookPageChunkIndex: number;
  toggleStudentFocusPage: (...args: any[]) => any;
  topicName: any;
  triggerDebouncedAutoSave: (...args: any[]) => any;
  triggerDebouncedSongSave: (...args: any[]) => any;
  triggerDebouncedTeacherNoteSave: (...args: any[]) => any;
  triggerDirectSave: (...args: any[]) => any;
  triggerDirectSongSave: (...args: any[]) => any;
  triggerImmediateAutoSave: (...args: any[]) => any;
  uiLevel: any;
  parentPermissions?: any;
  updateLehrwerkVisibility: (...args: any[]) => any;
  useNotebookLayout: boolean;
  viewingWeekOffset: number;
}

export function MeisterwerkDocumentTab(props: MeisterwerkDocumentTabProps) {
  const {
    DIDACTIC_QUICK_TAGS,
    PRESET_CHIPS,
    activeBrush: propActiveBrush,
    activeLehrwerkId,
    activeNoteTarget,
    activePageNumber,
    activeSongSkills,
    activeSubView,
    activeTagPickerRowIndex: propActiveTagPickerRowIndex,
    activeTtsKey,
    adjustTextareaHeight,
    assignedLehrwerke,
    setAssignedLehrwerke,
    audioDuration,
    audioLabel,
    awardSticker,
    buildCompleteWeeklyHomeworkSpeechPhrases,
    cancelPlayAlongCountIn,
    clickTimeoutRef,
    collectedStickers,
    customTags,
    effectiveGroupStudents,
    effectiveTeacherFullName,
    expressionVal,
    fingerVal,
    formatRecordTime,
    generalHomeworkNotes,
    getCanonicalSongKey,
    getFeedbackForWeek,
    getHomeworkNoteItems,
    getISOWeek,
    getItemWeek,
    getLehrwerkColor,
    getNormalizedSongTitle,
    getSongColor,
    getTargetWeekIso,
    getWeekDateRange,
    getWeeksBetween,
    globalLehrwerke,
    handleAddCustomTag,
    handleAssignLehrwerk,
    handleAssignSongFromCatalog,
    handleBackToHub,
    handleCheckMatch,
    handleCommitStudentRating,
    handleCopyShareLink,
    handlePrintHomeworkSheet,
    handleCreateAndAssignLehrwerk,
    handleCreateAndAssignSong,
    handleDeleteNote,
    handleDeletePageNote,
    handleDeleteSingleNoteItem,
    handlePageDoubleClick,
    handleRemoveLehrwerk,
    handleRemoveSong,
    handleResetAllCurrentHomework,
    handleResolveStudentQuestion,
    handleSave,
    handleSaveStudentQuestion,
    handleSetRowTag,
    handleShareEmail,
    handleSpeakText,
    handleStartPlayAlongRecording,
    handleStopSpeaking,
    handleStudentRatingChange,
    handleToggleMatchMode,
    handleTogglePresetChip,
    hasTresorStorage,
    hasTransferableHomework = false,
    homeworkNotes,
    homeworkNotesList,
    hubTab,
    insertOrToggleTagInText,
    isCampusActive = true,
    isCountInEnabled,
    isCurrentHomework,
    isFullscreen,
    isInsideSim,
    isLinkCopied,
    isMatchModeEnabled,
    isMatchRevealed,
    isMobileOrSim,
    isMobileView,
    isQuestionEditorOpen: propIsQuestionEditorOpen,
    isRecordingAudio,
    isRecordingMetronomeActive,
    isSavingFeedback,
    isSavingQuestion: propIsSavingQuestion,
    isShareMenuOpen,
    isSongMatch,
    isStudentNotePrivate,
    isStudentRatingCommitted,
    isSubSlidersExpanded: propIsSubSlidersExpanded,
    isTeacherMode,
    isTeacherTools,
    isTeacherSelf = false,
    isTtsSpeaking,
    isUploadingAudio,
    lastClickRef,
    lastMatchedAt,
    lastMatchedStudentPercent,
    lastMatchedTeacherPercent,
    latestGeneralHomeworkNotesRef,
    latestTeacherNotesRef,
    matchHistory,
    mobileProtokollTab,
    newCustomTagInput,
    newLehrwerkLoading,
    newLehrwerkPages,
    newLehrwerkTitle,
    newSongArtist,
    newSongTitle,
    onClose,
    onOpenAssignModal,
    pageHomeworkNotes,
    pageNotesSelectionRef,
    pageNotesTextareaRef,
    parsedStudentQuestion,
    pendingFeedbackStatus,
    pendingFeedbackTags,
    playAlongCountInRemaining,
    playMetronomeTick,
    progressItems,
    questionDraftText: propQuestionDraftText,
    readOnly,
    recordingBpm,
    renderSongVinylCover,
    renderTextWithDidacticBadges,
    rhythmVal,
    saveFeedback,
    schoolId,
    selectActiveSong,
    selectTextbookPage,
    selectedActiveSongId,
    selectedCategoryFilter,
    selectedHistoryWeek: propSelectedHistoryWeek,
    setActiveBrush: propSetActiveBrush,
    setActiveInputTab,
    setActiveLehrwerkId,
    setActiveModalTab,
    setActiveNoteTarget,
    setActivePageNumber,
    setActiveSongSkills,
    setActiveSubView,
    setActiveTagPickerRowIndex: propSetActiveTagPickerRowIndex,
    setActiveViewMode,
    setAudioLabel,
    setExpressionVal,
    setFingerVal,
    setGeneralHomeworkNotes,
    setHasChanges,
    setHomeworkNotesList,
    setHubTab,
    setIsCountInEnabled,
    setIsCurrentHomework,
    setIsNotesFocused,
    setIsQuestionEditorOpen: propSetIsQuestionEditorOpen,
    setIsRecordingMetronomeActive,
    setIsSavingFeedback,
    setIsShareMenuOpen,
    setIsStudentNotePrivate,
    setIsSubSlidersExpanded: propSetIsSubSlidersExpanded,
    setIsTransferModalOpen,
    setMobileProtokollTab,
    setNewCustomTagInput,
    setNewLehrwerkPages,
    setNewLehrwerkTitle,
    setNewSongArtist,
    setNewSongTitle,
    setPageChunk,
    setPageHomeworkNotes,
    setPendingFeedbackStatus,
    setPendingFeedbackTags,
    setQuestionDraftText: propSetQuestionDraftText,
    setRecordingBpm,
    setRhythmVal,
    setSelectedHistoryWeek: propSetSelectedHistoryWeek,
    setShowAllPagesGrid,
    setShowAssignDropdown,
    setShowCreateLehrwerkModal,
    setShowCreateSongModal,
    setShowPlayAlongMetronomePopup: propSetShowPlayAlongMetronomePopup,
    setSongHomeworkNotes,
    setSongModalTab,
    setSongProgressPercent,
    setSongSearch,
    setStatus,
    setStudentNotes,
    setTeacherNotes,
    setViewingWeekOffset,
    shareMenuRef,
    showAssignDropdown,
    showCreateLehrwerkModal,
    showCreateSongModal,
    showMatchConfetti,
    showPlayAlongMetronomePopup: propShowPlayAlongMetronomePopup,
    showdownState,
    songHomeworkNotes,
    songModalTab,
    songNotesSelectionRef,
    songNotesTextareaRef,
    songProgressPercent,
    songSearch,
    songs,
    sortedAssignedLehrwerke,
    status,
    stopRecordingAudio,
    student,
    studentFirstName,
    studentNotes,
    studentNotesSelectionRef,
    studentNotesTextareaRef,
    studentRating,
    studentRatingUpdatedAt,
    teacherId,
    teacherNotes,
    teacherNotesTextareaRef,
    textbookPageChunkIndex,
    toggleStudentFocusPage,
    topicName,
    triggerDebouncedAutoSave,
    triggerDebouncedSongSave,
    triggerDebouncedTeacherNoteSave,
    triggerDirectSave,
    triggerDirectSongSave,
    triggerImmediateAutoSave,
    uiLevel,
    updateLehrwerkVisibility,
    useNotebookLayout,
    viewingWeekOffset
  } = props;

  // 🛡️ Datenschutz- & Minderjährigenschutz-Schranke (§ 201 StGB / Art. 8 DSGVO)
  const isStudentAudioForbiddenForTeacher = useMemo(() => {
    const studentIdVal = (student as any)?.id;
    const localTeacherAudioKey = studentIdVal && typeof window !== 'undefined' ? localStorage.getItem(`groovelab_parent_allow_teacher_audio_${studentIdVal}`) : null;
    const isAllowed = ((student as any)?.parent_permissions?.allow_teacher_audio === true) || (localTeacherAudioKey !== null ? localTeacherAudioKey === 'true' : false);
    return !isAllowed;
  }, [student]);

  const [showModuleUnlockModal, setShowModuleUnlockModal] = useState(false);
  const [showParentPinModalForModules, setShowParentPinModalForModules] = useState(false);
  const [isConfirmingResolveQuestion, setIsConfirmingResolveQuestion] = useState(false);
  const [localModuleOverrides, setLocalModuleOverrides] = useState<Record<string, boolean>>(() => {
    return props.parentPermissions?.module_overrides || (student as any)?.parent_permissions?.module_overrides || {};
  });

  useEffect(() => {
    const nextOverrides = props.parentPermissions?.module_overrides || (student as any)?.parent_permissions?.module_overrides;
    if (nextOverrides) {
      setLocalModuleOverrides(nextOverrides);
    }
  }, [props.parentPermissions, (student as any)?.parent_permissions]);

  // 🎵 Song Selection & Creation Modal State (Self-Contained 1% Goldstandard)
  const [localShowCreateSongModal, setLocalShowCreateSongModal] = useState(false);
  const [localSongModalTab, setLocalSongModalTab] = useState<'catalog' | 'create'>('catalog');
  const [localSongSearch, setLocalSongSearch] = useState('');
  const [localNewSongTitle, setLocalNewSongTitle] = useState('');
  const [localNewSongArtist, setLocalNewSongArtist] = useState('');

  // 🎵 0.1% Goldstandard 2027 Song Sections Architecture
  const [songSections, setSongSections] = useState<SongSection[]>(() => {
    return [
      { id: 'sec-intro', name: 'Intro', bars: '4 Takte', chords: ['Em', 'C', 'G', 'D'], drumFeel: '8tel Beat', drumSurface: 'Geschlossene Hi-Hat' },
      { id: 'sec-verse', name: 'Strophe', bars: '8 Takte', chords: ['Em', 'C', 'G', 'D'], drumFeel: '8tel Rock', drumSurface: 'Geschlossene Hi-Hat' },
      { id: 'sec-chorus', name: 'Refrain', bars: '8 Takte', isHomeworkFocus: true, chords: ['Em', 'C', 'G', 'D'], drumFeel: 'Druckvoller 8tel Rock', drumSurface: 'Offene Hi-Hat', drumDynamics: 'Laut (f)', drumFill: '⚡ Snare Roll in Takt 8' },
      { id: 'sec-bridge', name: 'Bridge', bars: '8 Takte', chords: ['C', 'D', 'Em', 'Em'], drumFeel: 'Halftime Beat', drumSurface: 'Ride-Becken' },
      { id: 'sec-outro', name: 'Outro', bars: '4 Takte', chords: ['Em', 'C', 'G', 'D'], drumSurface: 'Crash on 1' }
    ];
  });
  const [activeSectionId, setActiveSectionId] = useState<string>('sec-chorus');
  const [hasPracticedSectionToday, setHasPracticedSectionToday] = useState<boolean>(false);
  const [textbookPageFilter, setTextbookPageFilter] = useState<'all' | 'homework' | 'focus'>('all');

  // Load song sections whenever selectedActiveSongId changes
  useEffect(() => {
    if (!selectedActiveSongId || !student?.id) return;
    try {
      const stored = localStorage.getItem(`song_sections_${student.id}_${selectedActiveSongId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSongSections(parsed);
          const focusSec = parsed.find(s => s.isHomeworkFocus) || parsed[0];
          setActiveSectionId(focusSec.id);
          return;
        }
      }
    } catch {}

    const defaultSecs: SongSection[] = [
      { id: 'sec-intro', name: 'Intro', bars: '4 Takte', chords: ['Em', 'C', 'G', 'D'], drumFeel: '8tel Beat', drumSurface: 'Geschlossene Hi-Hat' },
      { id: 'sec-verse', name: 'Strophe', bars: '8 Takte', chords: ['Em', 'C', 'G', 'D'], drumFeel: '8tel Rock', drumSurface: 'Geschlossene Hi-Hat' },
      { id: 'sec-chorus', name: 'Refrain', bars: '8 Takte', isHomeworkFocus: true, chords: ['Em', 'C', 'G', 'D'], drumFeel: 'Druckvoller 8tel Rock', drumSurface: 'Offene Hi-Hat', drumDynamics: 'Laut (f)', drumFill: '⚡ Snare Roll in Takt 8' },
      { id: 'sec-bridge', name: 'Bridge', bars: '8 Takte', chords: ['C', 'D', 'Em', 'Em'], drumFeel: 'Halftime Beat', drumSurface: 'Ride-Becken' },
      { id: 'sec-outro', name: 'Outro', bars: '4 Takte', chords: ['Em', 'C', 'G', 'D'], drumSurface: 'Crash on 1' }
    ];
    setSongSections(defaultSecs);
    setActiveSectionId('sec-chorus');
  }, [selectedActiveSongId, student?.id]);

  // Sync practiced state for active section
  useEffect(() => {
    if (!selectedActiveSongId || !student?.id || !activeSectionId) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const isDone = localStorage.getItem(`song_practiced_${student.id}_${selectedActiveSongId}_${activeSectionId}_${todayStr}`) === 'true';
    setHasPracticedSectionToday(isDone);
  }, [selectedActiveSongId, student?.id, activeSectionId]);


  // 📚 Lehrwerke Selection & Creation State (Self-Contained 1% Goldstandard)
  const [localShowAssignDropdown, setLocalShowAssignDropdown] = useState(false);
  const [localShowCreateLehrwerkModal, setLocalShowCreateLehrwerkModal] = useState(false);
  const [localNewLehrwerkTitle, setLocalNewLehrwerkTitle] = useState('');
  const [localNewLehrwerkPages, setLocalNewLehrwerkPages] = useState('50');
  const [localNewLehrwerkLoading, setLocalNewLehrwerkLoading] = useState(false);

  const effectiveShowAssignDropdown = props.showAssignDropdown !== undefined && props.setShowAssignDropdown !== undefined
    ? props.showAssignDropdown
    : localShowAssignDropdown;

  const toggleAssignDropdown = (val?: boolean) => {
    const nextVal = typeof val === 'boolean' ? val : !effectiveShowAssignDropdown;
    setLocalShowAssignDropdown(nextVal);
    if (typeof props.setShowAssignDropdown === 'function') {
      props.setShowAssignDropdown(nextVal);
    }
  };

  const effectiveShowCreateLehrwerkModal = props.showCreateLehrwerkModal !== undefined && props.setShowCreateLehrwerkModal !== undefined
    ? props.showCreateLehrwerkModal
    : localShowCreateLehrwerkModal;

  const toggleCreateLehrwerkModal = (val?: boolean) => {
    const nextVal = typeof val === 'boolean' ? val : !effectiveShowCreateLehrwerkModal;
    setLocalShowCreateLehrwerkModal(nextVal);
    if (typeof props.setShowCreateLehrwerkModal === 'function') {
      props.setShowCreateLehrwerkModal(nextVal);
    }
  };

  const effectiveNewLehrwerkTitle = props.newLehrwerkTitle !== undefined && props.setNewLehrwerkTitle !== undefined
    ? props.newLehrwerkTitle
    : localNewLehrwerkTitle;

  const setEffectiveNewLehrwerkTitle = (title: string) => {
    setLocalNewLehrwerkTitle(title);
    if (typeof props.setNewLehrwerkTitle === 'function') {
      props.setNewLehrwerkTitle(title);
    }
  };

  const effectiveNewLehrwerkPages = props.newLehrwerkPages !== undefined && props.setNewLehrwerkPages !== undefined
    ? props.newLehrwerkPages
    : localNewLehrwerkPages;

  const setEffectiveNewLehrwerkPages = (pages: string) => {
    setLocalNewLehrwerkPages(pages);
    if (typeof props.setNewLehrwerkPages === 'function') {
      props.setNewLehrwerkPages(pages);
    }
  };

  const effectiveNewLehrwerkLoading = props.newLehrwerkLoading ?? localNewLehrwerkLoading;

  const handleLocalCreateAndAssignLehrwerk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveNewLehrwerkTitle.trim() || effectiveNewLehrwerkLoading) return;
    setLocalNewLehrwerkLoading(true);
    try {
      if (typeof props.handleCreateAndAssignLehrwerk === 'function') {
        await props.handleCreateAndAssignLehrwerk(effectiveNewLehrwerkTitle, effectiveNewLehrwerkPages);
      }
      setEffectiveNewLehrwerkTitle('');
      setEffectiveNewLehrwerkPages('50');
      toggleCreateLehrwerkModal(false);
      toggleAssignDropdown(false);
    } catch (err) {
      console.error('Error creating lehrwerk in MeisterwerkDocumentTab:', err);
    } finally {
      setLocalNewLehrwerkLoading(false);
    }
  };

  // 🛡️ Fail-Safe Fallbacks (Correct-by-Construction)
  const [fallbackIsQuestionEditorOpen, setFallbackIsQuestionEditorOpen] = useState(false);
  const [fallbackQuestionDraftText, setFallbackQuestionDraftText] = useState('');
  const [fallbackIsSavingQuestion, setFallbackIsSavingQuestion] = useState(false);
  const [fallbackIsSubSlidersExpanded, setFallbackIsSubSlidersExpanded] = useState(false);
  const [fallbackShowPlayAlongMetronomePopup, setFallbackShowPlayAlongMetronomePopup] = useState(false);
  const [fallbackSelectedHistoryWeek, setFallbackSelectedHistoryWeek] = useState<string | null>(null);
  const [fallbackActiveTagPickerRowIndex, setFallbackActiveTagPickerRowIndex] = useState<number | null>(null);

  const isQuestionEditorOpen = propIsQuestionEditorOpen !== undefined ? propIsQuestionEditorOpen : fallbackIsQuestionEditorOpen;
  const setIsQuestionEditorOpen: React.Dispatch<React.SetStateAction<boolean>> = useCallback((action) => {
    setFallbackIsQuestionEditorOpen(action);
    if (typeof propSetIsQuestionEditorOpen === 'function') propSetIsQuestionEditorOpen(action);
  }, [propSetIsQuestionEditorOpen]);

  const questionDraftText = propQuestionDraftText !== undefined ? propQuestionDraftText : fallbackQuestionDraftText;
  const setQuestionDraftText: React.Dispatch<React.SetStateAction<string>> = useCallback((action) => {
    setFallbackQuestionDraftText(action);
    if (typeof propSetQuestionDraftText === 'function') propSetQuestionDraftText(action);
  }, [propSetQuestionDraftText]);

  const isSavingQuestion = propIsSavingQuestion !== undefined ? propIsSavingQuestion : fallbackIsSavingQuestion;

  // 🎙️ 0.1% Goldstandard Universal Dictation Engine
  const { isListening: isListeningSpeech, toggleListening: toggleSpeechRecognition } = useDictationInput({
    value: questionDraftText,
    onChange: setQuestionDraftText
  });

  const isSubSlidersExpanded = propIsSubSlidersExpanded !== undefined ? propIsSubSlidersExpanded : fallbackIsSubSlidersExpanded;
  const setIsSubSlidersExpanded: React.Dispatch<React.SetStateAction<any>> = useCallback((action) => {
    setFallbackIsSubSlidersExpanded(action);
    if (typeof propSetIsSubSlidersExpanded === 'function') propSetIsSubSlidersExpanded(action);
  }, [propSetIsSubSlidersExpanded]);

  const showPlayAlongMetronomePopup = propShowPlayAlongMetronomePopup !== undefined ? propShowPlayAlongMetronomePopup : fallbackShowPlayAlongMetronomePopup;
  const setShowPlayAlongMetronomePopup: React.Dispatch<React.SetStateAction<any>> = useCallback((action) => {
    setFallbackShowPlayAlongMetronomePopup(action);
    if (typeof propSetShowPlayAlongMetronomePopup === 'function') propSetShowPlayAlongMetronomePopup(action);
  }, [propSetShowPlayAlongMetronomePopup]);

  const selectedHistoryWeek = propSelectedHistoryWeek !== undefined ? propSelectedHistoryWeek : fallbackSelectedHistoryWeek;
  const setSelectedHistoryWeek: React.Dispatch<React.SetStateAction<any>> = useCallback((action) => {
    setFallbackSelectedHistoryWeek(action);
    if (typeof propSetSelectedHistoryWeek === 'function') propSetSelectedHistoryWeek(action);
  }, [propSetSelectedHistoryWeek]);

  const activeTagPickerRowIndex = propActiveTagPickerRowIndex !== undefined ? propActiveTagPickerRowIndex : fallbackActiveTagPickerRowIndex;
  const setActiveTagPickerRowIndex: React.Dispatch<React.SetStateAction<any>> = useCallback((action) => {
    setFallbackActiveTagPickerRowIndex(action);
    if (typeof propSetActiveTagPickerRowIndex === 'function') propSetActiveTagPickerRowIndex(action);
  }, [propSetActiveTagPickerRowIndex]);

  // 🖌️ Active Brush State & Dispatcher (100% reactive with local fallback)
  const [localActiveBrush, setLocalActiveBrush] = useState<MeisterwerkBrushType>(propActiveBrush || 'NONE');

  useEffect(() => {
    if (propActiveBrush !== undefined) {
      setLocalActiveBrush(propActiveBrush);
    }
  }, [propActiveBrush]);

  const activeBrush = localActiveBrush;

  const setActiveBrush: React.Dispatch<React.SetStateAction<MeisterwerkBrushType>> = useCallback((action: any) => {
    setLocalActiveBrush(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (typeof propSetActiveBrush === 'function') {
        try {
          propSetActiveBrush(next);
        } catch (e) {}
      }
      return next;
    });
  }, [propSetActiveBrush]);

  // 🎯 2027 Lehrwerk-Übungen State & Continuous Metronome (100% Nutzen)
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [activeMetronomeBpm, setActiveMetronomeBpm] = useState<number | null>(null);
  const metronomeTimerRef = useRef<any>(null);
  const playMetronomeTickRef = useRef(playMetronomeTick);

  useEffect(() => {
    playMetronomeTickRef.current = playMetronomeTick;
  }, [playMetronomeTick]);

  const toggleContinuousMetronome = useCallback((bpm: number) => {
    if (activeMetronomeBpm === bpm) {
      if (metronomeTimerRef.current) {
        clearInterval(metronomeTimerRef.current);
        metronomeTimerRef.current = null;
      }
      setActiveMetronomeBpm(null);
    } else {
      if (metronomeTimerRef.current) {
        clearInterval(metronomeTimerRef.current);
      }
      setActiveMetronomeBpm(bpm);
      playMetronomeTickRef.current?.(true);
      const intervalMs = Math.max(100, Math.round(60000 / bpm));
      let beat = 1;
      metronomeTimerRef.current = setInterval(() => {
        beat = (beat % 4) + 1;
        playMetronomeTickRef.current?.(beat === 1);
      }, intervalMs);
    }
  }, [activeMetronomeBpm]);

  useEffect(() => {
    return () => {
      if (metronomeTimerRef.current) {
        clearInterval(metronomeTimerRef.current);
      }
    };
  }, []);

  // 🟣 0.1% Goldstandard Fail-Safe Student Focus Toggle
  const handleToggleStudentFocus = useCallback((lehrwerkId: string, pageNum: number) => {
    if (!lehrwerkId || !pageNum) return;
    if (typeof toggleStudentFocusPage === 'function') {
      try {
        toggleStudentFocusPage(lehrwerkId, pageNum);
        return; // 🎯 CRITICAL: Do NOT execute updateFn below when toggleStudentFocusPage handled it, preventing double-toggle race condition!
      } catch (err) {
        console.warn('toggleStudentFocusPage call failed:', err);
      }
    }
    const updateFn = setAssignedLehrwerke || props.setAssignedLehrwerke;
    if (typeof updateFn === 'function') {
      updateFn((prev: any[] = []) => {
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
              if (!isFocused && focusedCount >= 3) return book;
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
        } catch (e) {}
        return updated;
      });
    }
  }, [toggleStudentFocusPage, setAssignedLehrwerke, props.setAssignedLehrwerke, student?.id]);

  // 🎯 Smart Cross-Page Exercise Numbering & Self-Learning Prefix (0.1% Goldstandard)
  const getSmartNextExerciseInfo = useCallback((
    activeBookAssigned: any,
    pageNumber: number | null,
    currentExercises: LehrwerkExercise[]
  ): { nextNum: number | string; prefix: string } => {
    // 1. Gather all page states hybrid from active state + localStorage
    let combinedPageStates: Record<string | number, any> = { ...(activeBookAssigned?.pageStates || {}) };
    let storedBookPrefix: string | undefined = activeBookAssigned?.exercisePrefix;

    try {
      const raw = localStorage.getItem('student_lehrwerke_progress');
      const parsed = raw ? JSON.parse(raw) : [];
      const bookInStore = parsed.find((b: any) => 
        (b.lehrwerkId === activeLehrwerkId || b.id === activeLehrwerkId)
      );
      if (bookInStore?.exercisePrefix) {
        storedBookPrefix = bookInStore.exercisePrefix;
      }
      if (bookInStore?.pageStates) {
        combinedPageStates = { ...bookInStore.pageStates, ...combinedPageStates };
      }
    } catch (e) {}

    // 2. Determine prefix: Stored book prefix > detected prefix from custom naming > default 'Nr. '
    let detectedPrefix = storedBookPrefix;
    if (!detectedPrefix) {
      for (const pState of Object.values(combinedPageStates)) {
        for (const ex of (pState?.exercises || [])) {
          if (!ex?.label) continue;
          const match = ex.label.match(/^([^\d]+)(\d+)/);
          if (match && match[1]) {
            const candidate = match[1];
            if (!/^(?:Üb\.|Eigene\s*Üb\.|Übung)\s*/i.test(candidate)) {
              detectedPrefix = candidate;
              break;
            }
          }
        }
        if (detectedPrefix) break;
      }
    }
    const finalPrefix = (detectedPrefix && !/^(?:Üb\.|Eigene\s*Üb\.|Übung)\s*/i.test(detectedPrefix)) ? detectedPrefix : 'Nr. ';

    // 3. Find next number:
    // If current page already has numbered exercises, continue from its maximum
    const currentNums = (currentExercises || [])
      .map(ex => {
        const match = ex.label?.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter(n => n > 0);

    if (currentNums.length > 0) {
      const currentMax = Math.max(...currentNums);
      const candidateNum = currentMax + 1;

      // 🛡️ Predictive Collision Check on subsequent pages (p > pageNumber)
      let hasCollisionLater = false;
      if (pageNumber) {
        for (const [pStr, pState] of Object.entries(combinedPageStates)) {
          const p = parseInt(pStr, 10);
          if (!isNaN(p) && p > pageNumber) {
            const pExs: LehrwerkExercise[] = pState?.exercises || [];
            if (pExs.some(ex => {
              const m = ex.label?.match(/\d+/);
              return m && parseInt(m[0], 10) === candidateNum;
            })) {
              hasCollisionLater = true;
              break;
            }
          }
        }
      }

      if (hasCollisionLater) {
        // Find existing letter suffixes for currentMax (e.g. 5a, 5b)
        const existingSuffixes = (currentExercises || [])
          .map(ex => {
            const m = ex.label?.match(new RegExp(`${currentMax}([a-z])`, 'i'));
            return m ? m[1].toLowerCase() : null;
          })
          .filter(Boolean) as string[];

        if (existingSuffixes.length > 0) {
          const lastChar = existingSuffixes.sort()[existingSuffixes.length - 1];
          const nextChar = String.fromCharCode(lastChar.charCodeAt(0) + 1);
          return { nextNum: `${currentMax}${nextChar}`, prefix: finalPrefix };
        } else {
          return { nextNum: `${currentMax}b`, prefix: finalPrefix };
        }
      }

      return { nextNum: candidateNum, prefix: finalPrefix };
    }

    // 4. If current page has no exercises, scan all preceding pages in the book for the highest exercise number
    let maxPreviousNum = 0;
    if (pageNumber && pageNumber > 1) {
      for (let p = 1; p < pageNumber; p++) {
        const pState = combinedPageStates[p] || combinedPageStates[String(p)];
        const pExercises: LehrwerkExercise[] = pState?.exercises || [];
        for (const ex of pExercises) {
          const match = ex.label?.match(/\d+/);
          if (match) {
            const val = parseInt(match[0], 10);
            if (val > maxPreviousNum) {
              maxPreviousNum = val;
            }
          }
        }
      }
    }

    if (maxPreviousNum > 0) {
      return { nextNum: maxPreviousNum + 1, prefix: finalPrefix };
    }

    return { nextNum: 1, prefix: finalPrefix };
  }, [activeLehrwerkId]);

  // 📝 Update Book Exercise Prefix across localStorage & State
  const updateBookExercisePrefix = useCallback((newPrefix: string) => {
    if (!activeLehrwerkId) return;
    try {
      const raw = localStorage.getItem('student_lehrwerke_progress');
      const parsed = raw ? JSON.parse(raw) : [];
      const updated = parsed.map((item: any) => {
        if ((item.studentId === student?.id || !item.studentId) && (item.lehrwerkId === activeLehrwerkId || item.id === activeLehrwerkId)) {
          return { ...item, exercisePrefix: newPrefix };
        }
        return item;
      });
      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));

      const updateFn = setAssignedLehrwerke || props.setAssignedLehrwerke;
      if (typeof updateFn === 'function') {
        updateFn((prev: any[] = []) =>
          prev.map(book => {
            if (book.lehrwerkId === activeLehrwerkId || book.id === activeLehrwerkId) {
              return { ...book, exercisePrefix: newPrefix };
            }
            return book;
          })
        );
      }
    } catch (err) {
      console.warn('[Meisterwerk] Error updating book prefix:', err);
    }
  }, [activeLehrwerkId, student?.id, setAssignedLehrwerke, props.setAssignedLehrwerke]);

  const updateExercisesForCurrentPage = useCallback((newExercises: LehrwerkExercise[]) => {
    if (!activeLehrwerkId || !activePageNumber) return;
    try {
      const raw = localStorage.getItem('student_lehrwerke_progress');
      const parsed = raw ? JSON.parse(raw) : [];
      const existsInStorage = parsed.some((item: any) => (item.studentId === student.id || !item.studentId) && (item.lehrwerkId === activeLehrwerkId || item.id === activeLehrwerkId));
      let updated: any[];
      if (!existsInStorage) {
        const newEntry = {
          id: activeLehrwerkId,
          lehrwerkId: activeLehrwerkId,
          studentId: student.id,
          pageStates: {
            [activePageNumber]: {
              exercises: newExercises,
              updatedAt: new Date().toISOString()
            }
          }
        };
        updated = [...parsed, newEntry];
      } else {
        updated = parsed.map((item: any) => {
          if ((item.studentId === student.id || !item.studentId) && (item.lehrwerkId === activeLehrwerkId || item.id === activeLehrwerkId)) {
            const existingPageState = item.pageStates?.[activePageNumber] || {};
            return {
              ...item,
              pageStates: {
                ...item.pageStates,
                [activePageNumber]: {
                  ...existingPageState,
                  exercises: newExercises,
                  updatedAt: new Date().toISOString()
                }
              }
            };
          }
          return item;
        });
      }
      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));

      const updateFn = setAssignedLehrwerke || props.setAssignedLehrwerke;
      if (typeof updateFn === 'function') {
        updateFn((prev: any[] = []) => {
          const bookExists = prev.some(b => b.lehrwerkId === activeLehrwerkId || b.id === activeLehrwerkId);
          if (!bookExists) {
            return [...prev, {
              id: activeLehrwerkId,
              lehrwerkId: activeLehrwerkId,
              studentId: student.id,
              pageStates: {
                [activePageNumber]: {
                  exercises: newExercises,
                  updatedAt: new Date().toISOString()
                }
              }
            }];
          }
          return prev.map(book => {
            if (book.lehrwerkId === activeLehrwerkId || book.id === activeLehrwerkId) {
              return {
                ...book,
                pageStates: {
                  ...book.pageStates,
                  [activePageNumber]: {
                    ...(book.pageStates?.[activePageNumber] || {}),
                    exercises: newExercises,
                    updatedAt: new Date().toISOString()
                  }
                }
              };
            }
            return book;
          });
        });
      }

      // Bottom-Up Mastery check: if all exercises are mastered, mark page mastered!
      if (newExercises.length > 0 && newExercises.every(ex => ex.status === 'mastered')) {
        triggerDirectSave(activeLehrwerkId, activePageNumber, 'MASTERED', false);
      } else if (newExercises.some(ex => ex.status === 'homework')) {
        triggerDirectSave(activeLehrwerkId, activePageNumber, 'IN_PROGRESS', true);
      }

      window.dispatchEvent(new CustomEvent('campus_homework_updated', { detail: { studentId: student.id } }));
    } catch (err) {
      console.warn('[Meisterwerk] Error saving exercises:', err);
    }
  }, [activeLehrwerkId, activePageNumber, student.id, setAssignedLehrwerke, props.setAssignedLehrwerke, triggerDirectSave]);

  const parseExercisesFromNotes = useCallback((text: string): { label: string; targetBpm?: number }[] => {
    if (!text || !text.trim()) return [];
    const results: { label: string; targetBpm?: number }[] = [];
    
    let globalBpm: number | undefined;
    const bpmMatch = text.match(/([0-9]{2,3})\s*(?:bpm|tempo)/i);
    if (bpmMatch) {
      globalBpm = parseInt(bpmMatch[1], 10);
    }

    const regex = /(?:Übung|Üb\.|Nr\.|Nummer)\s*([0-9]+[a-z]?)/gi;
    let match;
    const seen = new Set<string>();
    while ((match = regex.exec(text)) !== null) {
      const num = match[1];
      const label = `Üb. ${num}`;
      if (!seen.has(label)) {
        seen.add(label);
        results.push({ label, targetBpm: globalBpm });
      }
    }
    return results;
  }, []);

  // 🎛️ STUDIO MODULES CUSTOM DRAG & DROP + JIGGLE MODE STATE
  // 🛡️ Goldstandard Separation: UI-Layout-Personalisierung ist entkoppelt vom didaktischen readOnly-Inhaltsschutz
  const canCustomizeLayout = true;
  const [isModuleEditMode, setIsModuleEditMode] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  useEffect(() => {
    const handleOpenAudioSettings = () => setShowAudioSettings(true);
    window.addEventListener('campus_open_audio_settings', handleOpenAudioSettings);
    return () => window.removeEventListener('campus_open_audio_settings', handleOpenAudioSettings);
  }, []);
  const [activeModuleUnlockTab, setActiveModuleUnlockTab] = useState<'restore' | 'extensions'>('restore');
  const [draggedModuleKey, setDraggedModuleKey] = useState<StudioModuleKey | null>(null);

  const studentIdVal = (student as any)?.id;
  const [customModuleLayout, setCustomModuleLayout] = useState<{ order: StudioModuleKey[]; hidden: StudioModuleKey[] }>(() => {
    let parsed: { order: StudioModuleKey[]; hidden: StudioModuleKey[]; isDefault?: boolean; resetAt?: number } | null = null;
    let fromCache = false;
    if (typeof window !== 'undefined' && studentIdVal) {
      try {
        const cached = localStorage.getItem(`campus_studio_modules_layout_${studentIdVal}`);
        if (cached) {
          parsed = JSON.parse(cached);
          fromCache = true;
        }
      } catch (e) {}
    }
    
    // If cache explicitly marks layout as default tombstone, ignore stale dbLayout
    if (!parsed || (parsed.isDefault && (!parsed.order || parsed.order.length === 0))) {
      const dbLayout = (student as any)?.parent_permissions?.custom_layout;
      if (dbLayout?.order && Array.isArray(dbLayout.order) && dbLayout.order.length > 0 && !parsed?.isDefault) {
        parsed = {
          order: dbLayout.order,
          hidden: dbLayout.hidden && Array.isArray(dbLayout.hidden) ? dbLayout.hidden : []
        };
      }
    }

    if (parsed?.isDefault) {
      return {
        order: [...ALL_STUDIO_MODULE_KEYS],
        hidden: []
      };
    }

    const baseOrder: StudioModuleKey[] = parsed?.order && Array.isArray(parsed.order) ? parsed.order : [...ALL_STUDIO_MODULE_KEYS];
    const baseHidden: StudioModuleKey[] = parsed?.hidden && Array.isArray(parsed.hidden) ? parsed.hidden : [];

    // 🛡️ Auto-Reconciliation: Append any newly introduced studio modules from ALL_STUDIO_MODULE_KEYS
    // and guarantee 'archive' is always anchored at the very end
    const knownKeys = new Set([...baseOrder, ...baseHidden]);
    const missingKeys = ALL_STUDIO_MODULE_KEYS.filter(k => !knownKeys.has(k));
    const combinedOrder = [...baseOrder, ...missingKeys];
    const orderWithoutArchive = combinedOrder.filter(k => k !== 'archive');
    const finalOrder = combinedOrder.includes('archive')
      ? [...orderWithoutArchive, 'archive' as StudioModuleKey]
      : orderWithoutArchive;

    const finalLayout = {
      order: finalOrder,
      hidden: baseHidden
    };

    if (missingKeys.length > 0 && fromCache && typeof window !== 'undefined' && studentIdVal) {
      try {
        localStorage.setItem(`campus_studio_modules_layout_${studentIdVal}`, JSON.stringify(finalLayout));
      } catch (e) {}
    }

    return finalLayout;
  });

  useEffect(() => {
    const dbLayout = (student as any)?.parent_permissions?.custom_layout;
    if (!dbLayout) return;

    // Check if the user recently performed an authoritative reset
    if (typeof window !== 'undefined' && studentIdVal) {
      try {
        const cachedStr = localStorage.getItem(`campus_studio_modules_layout_${studentIdVal}`);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          // If cached marks this as an explicit default reset and DB is not newer:
          if (cached.isDefault === true) {
            const dbTimestamp = dbLayout.updated_at ? new Date(dbLayout.updated_at).getTime() : 0;
            const resetTimestamp = cached.resetAt || 0;
            if (dbTimestamp <= resetTimestamp) {
              // 🛡️ Revisionssicherer Tombstone: Stale DB-Prop überschreibt kein explizites Zurücksetzen!
              return;
            }
          }
        }
      } catch (e) {}
    }

    setCustomModuleLayout(prev => {
      const nextOrder = dbLayout.order && Array.isArray(dbLayout.order) && dbLayout.order.length > 0 ? dbLayout.order : prev.order;
      const nextHidden = dbLayout.hidden && Array.isArray(dbLayout.hidden) ? dbLayout.hidden : prev.hidden;
      const knownKeys = new Set([...nextOrder, ...nextHidden]);
      const missingKeys = ALL_STUDIO_MODULE_KEYS.filter(k => !knownKeys.has(k));
      const combined = [...nextOrder, ...missingKeys];
      const withoutArchive = combined.filter(k => k !== 'archive');
      const finalOrder = combined.includes('archive')
        ? [...withoutArchive, 'archive' as StudioModuleKey]
        : withoutArchive;
      const finalLayout = {
        order: finalOrder,
        hidden: nextHidden
      };
      if (studentIdVal && typeof window !== 'undefined') {
        try {
          localStorage.setItem(`campus_studio_modules_layout_${studentIdVal}`, JSON.stringify(finalLayout));
        } catch (e) {}
      }
      return finalLayout;
    });
  }, [(student as any)?.parent_permissions?.custom_layout, studentIdVal]);

  const saveCustomLayout = useCallback(async (nextLayout: { order: StudioModuleKey[]; hidden: StudioModuleKey[] }) => {
    // Ensure archive is always placed at the end of nextLayout.order
    const orderWithoutArchive = nextLayout.order.filter(k => k !== 'archive');
    const reconciledLayout = {
      ...nextLayout,
      order: nextLayout.order.includes('archive') 
        ? [...orderWithoutArchive, 'archive' as StudioModuleKey]
        : orderWithoutArchive
    };

    setCustomModuleLayout(reconciledLayout);
    const nowIso = new Date().toISOString();
    if (studentIdVal && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`campus_studio_modules_layout_${studentIdVal}`, JSON.stringify({
          ...reconciledLayout,
          isDefault: false,
          updated_at: nowIso
        }));
      } catch (e) {}
    }
    if (student?.id) {
      try {
        // 1. In-Memory sofort synchronisieren
        const existingPermissions = (student as any)?.parent_permissions || {};
        const updatedPermissions = {
          ...existingPermissions,
          custom_layout: {
            ...reconciledLayout,
            updated_at: nowIso
          }
        };
        (student as any).parent_permissions = updatedPermissions;

        // 2. Autoritativer Backend-RPC (OWASP ASVS Level 3 / Fail-Closed)
        const { error: rpcErr } = await supabase.rpc('save_student_studio_layout', {
          p_student_id: student.id,
          p_layout: reconciledLayout
        });

        // 3. Resilienter Fallback auf users table (falls RPC auf Remote-DB noch nicht aktiv)
        if (rpcErr) {
          console.warn('[Meisterwerk] save_student_studio_layout note (falling back to direct update):', rpcErr);
          await supabase
            .from("users")
            .update({ parent_permissions: updatedPermissions })
            .eq("id", student.id);
        }
      } catch (err) {
        console.error('[Meisterwerk] Could not save custom module layout:', err);
      }
    }
  }, [student, studentIdVal]);

  // 🔔 Local Toast Feedback for Module Layout Actions
  const [moduleToast, setModuleToast] = useState<string | null>(null);
  useEffect(() => {
    if (moduleToast) {
      const timer = setTimeout(() => setModuleToast(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [moduleToast]);

  const studentDisplayName = (student as any)?.first_name || 'Schüler';

  const handleResetModuleLayout = useCallback(async () => {
    const defaultLayout = {
      order: [...ALL_STUDIO_MODULE_KEYS],
      hidden: [] as StudioModuleKey[]
    };
    const tombstoneLayout = {
      ...defaultLayout,
      isDefault: true,
      resetAt: Date.now()
    };
    
    // 1. Sofortige lokale State-Rücksetzung
    setCustomModuleLayout(defaultLayout);
    
    // 2. Lokalen Cache mit unbestechlichem Reset-Tombstone markieren (verhindert Reversion)
    if (studentIdVal && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`campus_studio_modules_layout_${studentIdVal}`, JSON.stringify(tombstoneLayout));
      } catch (e) {}
    }

    // 3. In-Memory Bereinigung VOR async DB Call, damit Re-Renders das Zurücksetzen nicht überschreiben
    if (student?.id) {
      if ((student as any)?.parent_permissions?.custom_layout) {
        delete (student as any).parent_permissions.custom_layout;
      }

      try {
        // 4. Autoritativer Reset via RPC
        const { error: rpcErr } = await supabase.rpc('save_student_studio_layout', {
          p_student_id: student.id,
          p_layout: null
        });

        // 5. Fallback auf users Tabelle: custom_layout aus parent_permissions entfernen
        const existingPermissions = { ...((student as any)?.parent_permissions || {}) };
        delete existingPermissions.custom_layout;
        (student as any).parent_permissions = existingPermissions;

        if (rpcErr) {
          console.warn('[Meisterwerk] RPC save_student_studio_layout reset note (fallback to direct table update):', rpcErr);
          await supabase
            .from("users")
            .update({ parent_permissions: existingPermissions })
            .eq("id", student.id);
        }
      } catch (auditErr) {
        console.warn('[Meisterwerk] Error during module layout reset:', auditErr);
      }
    }

    setIsModuleEditMode(false);
    setShowModuleUnlockModal(false);
    setModuleToast(isTeacherMode 
      ? `Standard-Anordnung für ${studentDisplayName} wiederhergestellt` 
      : 'Standard-Anordnung wiederhergestellt'
    );
  }, [student, studentIdVal, isTeacherMode, studentDisplayName]);

  // 🔄 Automatic Layout Reset on UI Level change by parents (Junior <-> Teen <-> Pro)
  const prevUiLevelRef = useRef(uiLevel);
  useEffect(() => {
    if (prevUiLevelRef.current && prevUiLevelRef.current !== uiLevel) {
      handleResetModuleLayout();
    }
    prevUiLevelRef.current = uiLevel;
  }, [uiLevel, handleResetModuleLayout]);

  // 📝 Berechne die aktuell angezeigten Schüler-Hausaufgabennotizen für das aktive Wochen-Offset
  const activeViewingStudentNotes = useMemo(() => {
    if (viewingWeekOffset === 0) {
      return generalHomeworkNotes || '';
    }
    const toolboxViewingWeekIso = (() => {
      const d = new Date();
      d.setDate(d.getDate() + (viewingWeekOffset * 7));
      return getISOWeek(d);
    })();
    const toolboxViewingWeekNum = toolboxViewingWeekIso.split('-W')[1] || '';

    const histWeekItem = (progressItems || []).find((item: any) => {
      return item.topic_name === `Hausaufgabe KW ${toolboxViewingWeekNum}` ||
             (item.created_at && getISOWeek(item.created_at) === toolboxViewingWeekIso) ||
             (item.updated_at && getISOWeek(item.updated_at) === toolboxViewingWeekIso && item.topic_name.startsWith('Hausaufgabe KW '));
    });

    if (!histWeekItem || !histWeekItem.homework_notes) return '';
    try {
      const parsed = typeof histWeekItem.homework_notes === 'string'
        ? JSON.parse(histWeekItem.homework_notes)
        : histWeekItem.homework_notes;
      if (Array.isArray(parsed)) {
        return parsed
          .filter((n: string) => typeof n === 'string' && !isInternalMetadataNote(n))
          .join('\n')
          .trim();
      } else if (typeof parsed === 'string') {
        return parsed.split('\n').filter((s: string) => !isInternalMetadataNote(s)).join('\n').trim();
      }
    } catch (e) {
      return cleanNotesText(histWeekItem.homework_notes);
    }
    return '';
  }, [viewingWeekOffset, generalHomeworkNotes, progressItems, getISOWeek]);

  // 🏆 0.1% Goldstandard: Live Mastered Pieces Count (Gemeisterte Songs + Lehrwerk-Abschlüsse)
  const masteredPiecesCount = useMemo(() => {
    const masteredSongsSet = new Set<string>();
    (activeSongSkills || []).forEach((skill: any) => {
      if (skill.is_stage_ready || skill.progress_percent === 100 || skill.status === 'MASTERED') {
        const title = skill.songs?.title || skill.title || skill.song_title;
        if (title) masteredSongsSet.add(title.toLowerCase().trim());
      }
    });
    (progressItems || []).forEach((item: any) => {
      const rawTopic = (item.topic_name || item.title || '').trim();
      if (!rawTopic || rawTopic.includes(' - Seite ') || rawTopic.startsWith('Hausaufgabe KW ') || rawTopic.toLowerCase() === 'test') return;
      if (item.status === 'MASTERED' || (item.progress_percent || 0) === 100) {
        const cleanT = rawTopic.replace(/\s*\([^)]*\)\s*$/, '').trim();
        masteredSongsSet.add(cleanT.toLowerCase());
      }
    });
    let masteredPagesCount = 0;
    (assignedLehrwerke || []).forEach((assigned: any) => {
      Object.values(assigned.pageStates || {}).forEach((state: any) => {
        if (state?.status === 'mastered') masteredPagesCount++;
      });
    });
    return masteredSongsSet.size + (masteredPagesCount > 0 ? 1 : 0);
  }, [activeSongSkills, progressItems, assignedLehrwerke]);

  // 🎯 Cursor-Preservation für Hausaufgaben-Bemerkung: Verhindert Cursor-Sprünge beim Tippen & Zeilenumbrüchen
  React.useLayoutEffect(() => {
    if (typeof document !== 'undefined' && studentNotesTextareaRef.current && document.activeElement === studentNotesTextareaRef.current) {
      const pos = studentNotesSelectionRef.current;
      if (pos && typeof pos.start === 'number' && typeof pos.end === 'number') {
        try {
          studentNotesTextareaRef.current.setSelectionRange(pos.start, pos.end);
        } catch {}
      }
    }
  }, [activeViewingStudentNotes]);

  // 📱 Long-Press Handlers for iPads / Tablets (500ms)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleTouchStartTile = useCallback(() => {
    if (!canCustomizeLayout) return;
    longPressTimerRef.current = setTimeout(() => {
      setIsModuleEditMode(true);
      if (typeof navigator !== 'undefined' && (navigator as any).vibrate) {
        (navigator as any).vibrate(50);
      }
    }, 500);
  }, [canCustomizeLayout]);

  const handleTouchCancelTile = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleHideModule = useCallback(async (key: StudioModuleKey) => {
    const nextHidden = customModuleLayout.hidden.includes(key) 
      ? customModuleLayout.hidden 
      : [...customModuleLayout.hidden, key];
    await saveCustomLayout({
      ...customModuleLayout,
      hidden: nextHidden
    });
    setModuleToast(isTeacherMode 
      ? `Modul für ${studentDisplayName} ausgeblendet` 
      : 'Modul ausgeblendet'
    );
  }, [customModuleLayout, saveCustomLayout, isTeacherMode, studentDisplayName]);

  const handleRestoreModule = useCallback(async (key: StudioModuleKey) => {
    const nextHidden = customModuleLayout.hidden.filter(k => k !== key);
    let nextOrder = [...customModuleLayout.order];
    if (!nextOrder.includes(key)) {
      nextOrder.push(key);
    }
    await saveCustomLayout({
      order: nextOrder,
      hidden: nextHidden
    });
    setModuleToast(isTeacherMode 
      ? `Modul für ${studentDisplayName} wiederhergestellt` 
      : 'Modul wiederhergestellt'
    );
  }, [customModuleLayout, saveCustomLayout, isTeacherMode, studentDisplayName]);

  const handleDropOnModule = useCallback(async (targetKey: StudioModuleKey) => {
    if (!draggedModuleKey || draggedModuleKey === targetKey) {
      setDraggedModuleKey(null);
      return;
    }
    const currentOrder = [...customModuleLayout.order];
    const sourceIdx = currentOrder.indexOf(draggedModuleKey);
    const targetIdx = currentOrder.indexOf(targetKey);
    if (sourceIdx !== -1 && targetIdx !== -1) {
      currentOrder.splice(sourceIdx, 1);
      currentOrder.splice(targetIdx, 0, draggedModuleKey);
      await saveCustomLayout({
        ...customModuleLayout,
        order: currentOrder
      });
      if (isTeacherMode) {
        setModuleToast(`Layout für ${studentDisplayName} gespeichert`);
      }
    }
    setDraggedModuleKey(null);
  }, [draggedModuleKey, customModuleLayout, saveCustomLayout, isTeacherMode, studentDisplayName]);

  useEffect(() => {
    if ((student as any)?.parent_permissions?.module_overrides) {
      setLocalModuleOverrides((student as any).parent_permissions.module_overrides);
    }
  }, [(student as any)?.parent_permissions?.module_overrides]);

  const isLoopstationUnlocked = uiLevel !== "junior" || Boolean(localModuleOverrides.loopstation);
  const isArchiveUnlocked = uiLevel === "pro" || Boolean(localModuleOverrides.archive);

  const handleSaveModuleOverride = async (key: string, enabled: boolean) => {
    const nextOverrides = {
      ...localModuleOverrides,
      [key]: enabled
    };
    setLocalModuleOverrides(nextOverrides);

    if (student?.id) {
      try {
        const existingPermissions = (student as any)?.parent_permissions || {};
        const updatedPermissions = {
          ...existingPermissions,
          module_overrides: nextOverrides
        };
        await supabase
          .from("users")
          .update({ parent_permissions: updatedPermissions })
          .eq("id", student.id);
        
        (student as any).parent_permissions = updatedPermissions;
      } catch (err) {
        console.error("[Meisterwerk] Could not save module overrides:", err);
      }
    }
  };

  const checkIsParentModuleUnlocked = useCallback(() => {
    if (typeof window === 'undefined' || !student?.id) return false;
    const expiresAtStr = sessionStorage.getItem(`campus_parent_module_unlock_${student.id}`);
    if (!expiresAtStr) return false;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      sessionStorage.removeItem(`campus_parent_module_unlock_${student.id}`);
      return false;
    }
    return true;
  }, [student?.id]);

  const closeAndLockModuleModal = useCallback(() => {
    if (typeof window !== 'undefined' && student?.id) {
      sessionStorage.removeItem(`campus_parent_module_unlock_${student.id}`);
      sessionStorage.removeItem('campus_parent_unlocked');
    }
    setShowModuleUnlockModal(false);
    setShowParentPinModalForModules(false);
  }, [student?.id]);

  // 🛡️ Fail-Closed Parent Auto-Lock on Tab Switch, Pagehide, or 3-Minute Timeout
  useEffect(() => {
    if (!showModuleUnlockModal && !showParentPinModalForModules) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        closeAndLockModuleModal();
      }
    };
    const handlePageHide = () => {
      closeAndLockModuleModal();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    const timer = setInterval(() => {
      if (showModuleUnlockModal && activeModuleUnlockTab === 'extensions') {
        if (!checkIsParentModuleUnlocked()) {
          closeAndLockModuleModal();
        }
      }
    }, 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      clearInterval(timer);
    };
  }, [showModuleUnlockModal, showParentPinModalForModules, activeModuleUnlockTab, closeAndLockModuleModal, checkIsParentModuleUnlocked]);

  const handleToggleModuleOverride = (key: string, enabled: boolean) => {
    if (!checkIsParentModuleUnlocked()) {
      setShowParentPinModalForModules(true);
      return;
    }
    handleSaveModuleOverride(key, enabled);
  };

  const handleOpenModuleUnlock = () => {
    if (customModuleLayout.hidden.length > 0) {
      setActiveModuleUnlockTab('restore');
      setShowModuleUnlockModal(true);
      return;
    }
    if (checkIsParentModuleUnlocked()) {
      setActiveModuleUnlockTab('extensions');
      setShowModuleUnlockModal(true);
    } else {
      setShowParentPinModalForModules(true);
    }
  };
  const [teacherConsentRequested, setTeacherConsentRequested] = useState(false);
  const [isCarriedOverDismissed, setIsCarriedOverDismissed] = useState(false);
  const [forceImmediateDelivery, setForceImmediateDelivery] = useState(false);

  useEffect(() => {
    setIsCarriedOverDismissed(false);
  }, [viewingWeekOffset, student?.id]);

  const handleRequestParentAudioConsent = useCallback(async () => {
    if (!student?.id) return;
    const reqPayload = {
      requestedAt: new Date().toISOString(),
      teacherName: effectiveTeacherFullName || 'Deine Lehrkraft'
    };
    localStorage.setItem(`groovelab_parent_req_teacher_audio_${student.id}`, JSON.stringify(reqPayload));
    setTeacherConsentRequested(true);

    try {
      const senderId = (student as any)?.teacher_id || (typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_user_id') : null);
      if (senderId) {
        await supabase.from('campus_direct_messages').insert({
          sender_id: senderId,
          recipient_id: student.id,
          school_id: student.school_id,
          sender_role: 'teacher',
          recipient_role: 'student',
          content: `🎵 Didaktische Audio-Freigabe erbeten: ${effectiveTeacherFullName || 'Deine Lehrkraft'} möchte dir im Unterricht kurze Tonaufnahmen für didaktische Übungszwecke (Korrektur, Play-Along) anfertigen. Bitte deine Eltern, dies im Elternbereich kurz freizugeben.`,
          message_type: 'audio_consent_request'
        });
      }
    } catch (e) {}

    alert(`✓ Freigabe-Anfrage an die Erziehungsberechtigten von ${studentFirstName || 'dem Schüler'} übermittelt.`);
  }, [student, effectiveTeacherFullName, studentFirstName]);

  return (
            <>
          
          {/* LEFT COLUMN: 🎯 FOKUS-ARBEITSPLATZ (Lehrwerke & Songs) */}



          <div style={{
            flex: isMobileView ? 'none' : '0 0 45%',
            width: isMobileView ? '100%' : '45%',
            maxWidth: isMobileView ? '100%' : '45%',
            minWidth: 0,
            overflowX: isMobileView ? 'clip' : 'visible',
            height: isMobileView ? 'auto' : '100%',
            minHeight: '0',
            maxHeight: isMobileView ? 'none' : '100%',
            overflowY: isMobileView ? 'visible' : 'auto',
            display: isMobileView ? (mobileProtokollTab === 'repertoire' ? 'flex' : 'none') : 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: '16px',
            background: useNotebookLayout ? '#faf8f2' : '#ffffff',
            borderRight: useNotebookLayout ? '1px dashed #e5e0d4' : '1px solid #e8e8ed',
            position: 'relative',
            padding: isMobileView ? '8px 4px var(--mobile-scroll-clearance-bottom, calc(96px + env(safe-area-inset-bottom, 20px))) 4px' : '0px',
            boxSizing: 'border-box'
          }}>
            
            {useNotebookLayout && !isMobileView && (
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

            {activeSubView === 'history' ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease', overflowY: 'auto', padding: '24px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><BookOpen size={18} style={{ color: '#34a853', verticalAlign: 'middle' }} /> Hausaufgaben-Archiv</span>
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: '#64748b', fontWeight: 650 }}>
                    Hier findest du alle vergangenen, archivierten Hausaufgaben-Wochen.
                  </p>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                  {(() => {
                    const existingWeeks = progressItems
                      .filter(item => item.updated_at)
                      .map(item => getItemWeek(item))
                      .filter(Boolean);

                    let weeks: string[] = [];
                    if (existingWeeks.length > 0) {
                      const sortedExisting = [...existingWeeks].sort();
                      const earliestWeek = sortedExisting[0];
                      const currentWeek = getISOWeek();
                      const latestExisting = sortedExisting[sortedExisting.length - 1];
                      const endWeek = currentWeek > latestExisting ? currentWeek : latestExisting;
                      weeks = getWeeksBetween(earliestWeek, endWeek);
                    } else {
                      weeks = [getISOWeek()];
                    }
                    
                    if (weeks.length === 0) {
                      return (
                        <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.8rem' }}>
                          Keine vergangenen Hausaufgaben gefunden.
                        </div>
                      );
                    }
                    
                    return weeks.map(wk => {
                      const isSelected = selectedHistoryWeek === wk;
                      const weekNum = wk.split('-W')[1] || '';
                      
                      // Count how many items were checked or active in this week (including snapshot fallback)
                      const weekItems = progressItems.filter(item => item.updated_at && getItemWeek(item) === wk);
                      let homeworkItemsCount = weekItems.filter(item => item.is_current_homework && !item.topic_name.startsWith('Hausaufgabe KW ')).length;
                      
                      if (homeworkItemsCount === 0) {
                        const snapItem = weekItems.find(item => item.topic_name?.startsWith('Hausaufgabe KW '));
                        if (snapItem && snapItem.homework_notes) {
                          try {
                            const raw = typeof snapItem.homework_notes === 'string' ? JSON.parse(snapItem.homework_notes) : snapItem.homework_notes;
                            if (Array.isArray(raw)) {
                              const lw = raw.find((n: any) => typeof n === 'string' && n.startsWith('SNAPSHOT_LEHRWERKE:'));
                              if (lw) {
                                const parsedLw = JSON.parse(lw.substring('SNAPSHOT_LEHRWERKE:'.length));
                                if (Array.isArray(parsedLw)) {
                                  parsedLw.forEach((b: any) => {
                                    homeworkItemsCount += (Array.isArray(b.pages) && b.pages.length > 0) ? b.pages.length : 1;
                                  });
                                }
                              }
                              const songs = raw.find((n: any) => typeof n === 'string' && n.startsWith('SNAPSHOT_SONGS:'));
                              if (songs) {
                                const parsedSongs = JSON.parse(songs.substring('SNAPSHOT_SONGS:'.length));
                                if (Array.isArray(parsedSongs)) {
                                  homeworkItemsCount += parsedSongs.length;
                                }
                              }
                            }
                          } catch {}
                        }
                      }
                      const isCompact = homeworkItemsCount === 0;
                      const dateRangeStr = getWeekDateRange(wk);
                      
                      return (
                        <div
                          key={wk}
                          onClick={() => setSelectedHistoryWeek(wk)}
                          style={{
                            background: isSelected ? '#f1f5f9' : 'white',
                            border: isSelected ? '1.5px solid #34a853' : '1px solid #cbd5e1',
                            borderRadius: '16px',
                            padding: isCompact ? '10px 16px' : '16px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: isCompact ? '2px' : '4px',
                            boxShadow: isSelected ? '0 4px 12px rgba(19, 115, 51, 0.08)' : '0 2px 4px rgba(0,0,0,0.01)'
                          }}
                          className="hover-scale"
                        >
                          {/* Week header row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.86rem', fontWeight: 900, color: isSelected ? '#34a853' : '#0f172a' }}>
                              KW {weekNum}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {(() => {
                                const fb = getFeedbackForWeek(wk);
                                if (!fb?.status) return null;
                                const badges: Record<string, { bg: string; color: string; label: string }> = {
                                  beherrscht: { bg: '#dcfce7', color: '#16a34a', label: '✓ Beherrscht' },
                                  in_entwicklung: { bg: '#fefce8', color: '#ca8a04', label: '~ In Entwicklung' },
                                  wiederholen: { bg: '#fee2e2', color: '#dc2626', label: '↩ Wiederholen' },
                                };
                                const badge = badges[fb.status];
                                if (!badge) return null;
                                return (
                                  <span style={{ fontSize: '0.62rem', background: badge.bg, color: badge.color, padding: '2px 8px', borderRadius: '10px', fontWeight: 800, flexShrink: 0 }}>
                                    {badge.label}
                                  </span>
                                );
                              })()}
                              <span style={{ 
                                fontSize: '0.68rem', 
                                background: isSelected ? '#34a853' : homeworkItemsCount > 0 ? '#dcfce7' : '#f1f5f9', 
                                color: isSelected ? 'white' : homeworkItemsCount > 0 ? '#15803d' : '#64748b', 
                                padding: '2px 8px', 
                                borderRadius: '10px', 
                                fontWeight: 800 
                              }}>
                                {homeworkItemsCount} {homeworkItemsCount === 1 ? 'Aufgabe' : 'Aufgaben'}
                              </span>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                            {dateRangeStr ? `${dateRangeStr} · Woche ${weekNum}` : `Dokumentiert in Woche ${weekNum}`}
                          </span>

                          {/* Inline Feedback Panel — only when selected and not readOnly */}
                          {isSelected && !readOnly && (
                            <div
                              onClick={e => e.stopPropagation()}
                              style={{ marginTop: '10px', padding: '14px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}
                            >
                              {/* Status */}
                              <div>
                                <span style={{ fontSize: '0.66rem', fontWeight: 850, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Wie lief die Aufgabe?
                                </span>
                                <div style={{ display: 'flex', gap: '5px', marginTop: '6px' }}>
                                  {([
                                    { key: 'beherrscht', label: '✓ Beherrscht', bg: '#dcfce7', color: '#16a34a', border: '#86efac' },
                                    { key: 'in_entwicklung', label: '~ In Entwicklung', bg: '#fefce8', color: '#ca8a04', border: '#fde68a' },
                                    { key: 'wiederholen', label: '↩ Wiederholen', bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
                                  ] as const).map(opt => (
                                    <button
                                      key={opt.key}
                                      type="button"
                                      onClick={() => setPendingFeedbackStatus(prev => prev === opt.key ? null : opt.key)}
                                      style={{
                                        flex: 1, padding: '6px 3px',
                                        background: pendingFeedbackStatus === opt.key ? opt.bg : 'white',
                                        border: `1.5px solid ${pendingFeedbackStatus === opt.key ? opt.border : '#e2e8f0'}`,
                                        borderRadius: '10px', cursor: 'pointer', fontSize: '0.62rem', fontWeight: 800,
                                        color: pendingFeedbackStatus === opt.key ? opt.color : '#64748b',
                                        transition: 'all 0.15s ease'
                                      }}
                                    >{opt.label}</button>
                                  ))}
                                </div>
                              </div>

                              {/* Tags & Skill Categories */}
                              <div>
                                <span style={{ fontSize: '0.66rem', fontWeight: 850, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Übe-Schwerpunkte & Förderbereiche
                                </span>

                                {/* 5 Universelle Musikalische Kern-Säulen */}
                                <div style={{ marginTop: '6px' }}>
                                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                                    Musikalische Kern-Dimensionen
                                  </span>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {SKILL_TAGS.map(tag => {
                                      const active = pendingFeedbackTags.includes(tag.key);
                                      const limitReached = !active && pendingFeedbackTags.length >= 2;
                                      return (
                                        <button
                                          key={tag.key}
                                          type="button"
                                          onClick={() => setPendingFeedbackTags(prev => {
                                            if (prev.includes(tag.key)) return prev.filter(t => t !== tag.key);
                                            if (prev.length >= 2) return prev;
                                            return [...prev, tag.key];
                                          })}
                                          style={{
                                            padding: '4px 9px',
                                            background: active ? '#fef2f2' : '#f8fafc',
                                            border: `1.5px solid ${active ? '#fca5a5' : '#e2e8f0'}`,
                                            borderRadius: '20px', cursor: 'pointer', fontSize: '0.66rem', fontWeight: 800,
                                            color: active ? '#dc2626' : '#64748b', transition: 'all 0.15s ease',
                                            opacity: limitReached ? 0.45 : 1
                                          }}
                                        >{tag.icon} {tag.label}</button>
                                      );
                                    })}
                                    {customTags.map(tag => {
                                      const active = pendingFeedbackTags.includes(tag);
                                      const limitReached = !active && pendingFeedbackTags.length >= 2;
                                      return (
                                        <button
                                          key={tag}
                                          type="button"
                                          onClick={() => setPendingFeedbackTags(prev => {
                                            if (prev.includes(tag)) return prev.filter(t => t !== tag);
                                            if (prev.length >= 2) return prev;
                                            return [...prev, tag];
                                          })}
                                          style={{
                                            padding: '4px 9px',
                                            background: active ? '#fef2f2' : '#f8fafc',
                                            border: `1.5px solid ${active ? '#fca5a5' : '#e2e8f0'}`,
                                            borderRadius: '20px', cursor: 'pointer', fontSize: '0.66rem', fontWeight: 800,
                                            color: active ? '#dc2626' : '#64748b', transition: 'all 0.15s ease',
                                            opacity: limitReached ? 0.45 : 1
                                          }}
                                        >✏️ {tag}</button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '8px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span>💡</span>
                                  <span style={{ fontWeight: 600 }}>Wähle maximal 2 Schwerpunkte aus, um den Schüler gezielt zu fördern.</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
                                  <input
                                    type="text"
                                    placeholder="Eigene Schwierigkeit..."
                                    value={newCustomTagInput}
                                    onChange={e => setNewCustomTagInput(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddCustomTag();
                                      }
                                    }}
                                    style={{
                                      padding: '4px 10px',
                                      fontSize: '0.66rem',
                                      border: '1.5px solid #cbd5e1',
                                      borderRadius: '20px',
                                      background: '#f8fafc',
                                      color: '#334155',
                                      outline: 'none',
                                      fontWeight: 650,
                                      width: '140px'
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={handleAddCustomTag}
                                    style={{
                                      background: '#34a853',
                                      border: 'none',
                                      borderRadius: '50%',
                                      width: '22px',
                                      height: '22px',
                                      color: 'white',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 900,
                                      fontSize: '0.8rem'
                                    }}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* Save */}
                              <button
                                type="button"
                                onClick={async () => {
                                  setIsSavingFeedback(true);
                                  await saveFeedback(wk, pendingFeedbackTags, pendingFeedbackStatus);
                                  setIsSavingFeedback(false);
                                }}
                                disabled={isSavingFeedback}
                                style={{
                                  background: '#34a853', color: 'white', border: 'none', borderRadius: '10px',
                                  padding: '9px', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer',
                                  opacity: isSavingFeedback ? 0.7 : 1, transition: 'all 0.15s ease'
                                }}
                              >{isSavingFeedback ? 'Speichern...' : 'Bewertung speichern'}</button>
                            </div>
                          )}
                        </div>
                      );
                    });

                  })()}
                </div>

                {/* Back button to active hub */}
                <button
                  type="button"
                  onClick={() => setActiveSubView('hub')}
                  style={{
                    background: '#34a853',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '14px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(19, 115, 51, 0.2)',
                    transition: 'all 0.15s ease',
                    width: '100%',
                    textAlign: 'center'
                  }}
                  className="hover-scale"
                >
                  Zurück zum aktuellen Tag
                </button>
              </div>
            ) : activeSubView === 'lehrwerk' && activeLehrwerkId ? (
              (() => {
                const assignedBook = assignedLehrwerke.find(a => a.lehrwerkId === activeLehrwerkId);
                let book = globalLehrwerke.find(g => g.id === activeLehrwerkId);
                if (!book) {
                  book = {
                    id: activeLehrwerkId,
                    title: assignedBook?.title || 'Eigenes Lehrwerk',
                    totalPages: 50,
                    total_pages: 50,
                    emoji: '📚',
                    color: '#34a853',
                    is_custom: true
                  };
                }
                const bookColor = getLehrwerkColor(book.title);
                const totalBookPages = Number(assignedBook?.totalPages || assignedBook?.total_pages || book?.totalPages || book?.total_pages || 50);
                const pct = assignedBook ? Math.min(100, Math.round((Object.values(assignedBook.pageStates || {}).filter((p: any) => p.status === 'mastered').length / totalBookPages) * 100)) : 0;
                const pages = Array.from({ length: totalBookPages }, (_, i) => i + 1);
                const currentVisibility = assignedBook?.visibility || 'private';

                const handleUpdateBookPages = (newTotal: number) => {
                  if (isNaN(newTotal) || newTotal < 1) return;
                  const safeTotal = Math.min(999, Math.max(1, Math.round(newTotal)));

                  try {
                    const stored = localStorage.getItem('student_lehrwerke_progress');
                    const parsed = stored ? JSON.parse(stored) : [];
                    let found = false;
                    const updated = parsed.map((item: any) => {
                      if ((student?.id ? String(item.studentId) === String(student.id) : true) && String(item.lehrwerkId) === String(activeLehrwerkId)) {
                        found = true;
                        return {
                          ...item,
                          totalPages: safeTotal,
                          total_pages: safeTotal
                        };
                      }
                      return item;
                    });
                    if (!found) {
                      updated.push({
                        studentId: student?.id,
                        lehrwerkId: activeLehrwerkId,
                        bookTitle: book.title,
                        totalPages: safeTotal,
                        total_pages: safeTotal,
                        assignedAt: new Date().toISOString(),
                        visibility: 'private',
                        pageStates: {}
                      });
                    }
                    localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
                  } catch (err) {
                    console.warn('[handleUpdateBookPages] localStorage error:', err);
                  }

                  if (typeof setAssignedLehrwerke === 'function') {
                    setAssignedLehrwerke((prev: any[]) => {
                      const exists = prev.some(a => String(a.lehrwerkId) === String(activeLehrwerkId));
                      if (exists) {
                        return prev.map(a => String(a.lehrwerkId) === String(activeLehrwerkId) ? { ...a, totalPages: safeTotal, total_pages: safeTotal } : a);
                      } else {
                        return [...prev, {
                          studentId: student?.id,
                          lehrwerkId: activeLehrwerkId,
                          bookTitle: book.title,
                          totalPages: safeTotal,
                          total_pages: safeTotal,
                          pageStates: {}
                        }];
                      }
                    });
                  }

                  book.totalPages = safeTotal;
                  book.total_pages = safeTotal;
                  if (assignedBook) {
                    assignedBook.totalPages = safeTotal;
                    assignedBook.total_pages = safeTotal;
                  }

                  try {
                    supabase.from('campus_lehrwerke').update({ total_pages: safeTotal }).eq('id', activeLehrwerkId).then(() => {});
                  } catch {}

                  if (activePageNumber > safeTotal) {
                    selectTextbookPage(activeLehrwerkId, safeTotal);
                  }
                };

                const handleAddPage = () => {
                  const currentTotal = totalBookPages;
                  const newTotal = currentTotal + 1;
                  handleUpdateBookPages(newTotal);
                  selectTextbookPage(activeLehrwerkId, newTotal);
                };

                const handleRemovePage = () => {
                  const currentTotal = totalBookPages;
                  if (currentTotal <= 1) {
                    alert('Ein Lehrwerk muss mindestens eine Seite haben.');
                    return;
                  }
                  const lastPage = currentTotal;
                  const lastPageState = assignedBook?.pageStates?.[lastPage];
                  const lastPageExercises = (lastPageState?.exercises || []).length;
                  const hasContent = Boolean(lastPageState?.homeworkNotes || lastPageState?.homework_notes || lastPageState?.status === 'mastered' || lastPageState?.status === 'homework' || lastPageExercises > 0);
                  
                  if (hasContent) {
                    const confirmDelete = window.confirm(`Auf Seite ${lastPage} sind bereits Hausaufgaben oder Übungen notiert. Möchtest du Seite ${lastPage} wirklich entfernen?`);
                    if (!confirmDelete) return;
                  }
                  
                  const newTotal = currentTotal - 1;
                  handleUpdateBookPages(newTotal);
                  if (activePageNumber >= lastPage) {
                    selectTextbookPage(activeLehrwerkId, newTotal);
                  }
                };

                const handlePromptSetPages = () => {
                  const currentTotal = totalBookPages;
                  const input = window.prompt(`Wie viele Seiten hat dieses Lehrwerk insgesamt? (Aktuell: ${currentTotal})`, String(currentTotal));
                  if (input !== null) {
                    const parsed = parseInt(input.trim(), 10);
                    if (!isNaN(parsed) && parsed >= 1 && parsed <= 999) {
                      if (parsed < currentTotal) {
                        const confirmShrink = window.confirm(`Möchtest du die Seitenanzahl wirklich von ${currentTotal} auf ${parsed} reduzieren?`);
                        if (!confirmShrink) return;
                      }
                      handleUpdateBookPages(parsed);
                    }
                  }
                };

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease', flex: 1, overflowY: 'auto', padding: '24px' }}>
                    {/* Textbook Cover Card */}
                    <div style={{
                      background: 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '24px',
                      padding: '20px',
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{
                        width: '54px',
                        height: '70px',
                        background: `linear-gradient(135deg, ${bookColor.from} 0%, ${bookColor.to} 100%)`,
                        borderRadius: '10px',
                        boxShadow: `0 6px 16px ${bookColor.from}40`,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <BookOpen size={22} color="#ffffff" strokeWidth={1.8} />
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '7px',
                          background: 'rgba(255,255,255,0.22)',
                          borderRight: '1px solid rgba(0,0,0,0.15)',
                          borderTopLeftRadius: '10px',
                          borderBottomLeftRadius: '10px'
                        }} />
                      </div>
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        {(() => {
                          const isStudentCreated = Boolean(assignedBook?.isStudentCreated || assignedBook?.createdByRole === 'student' || book.created_by_role === 'student');
                          const isTeacherAssigned = !isStudentCreated;
                          const isStudentViewingTeacherBook = Boolean(readOnly && isTeacherAssigned);

                          return (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>
                                  {book.title}
                                </h4>
                                {isStudentCreated ? (
                                  <span style={{ color: '#475569', fontSize: '0.72rem', fontWeight: 800, background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <BookOpen size={11} strokeWidth={2} style={{ color: '#64748b' }} /> Eigenes Lehrwerk
                                  </span>
                                ) : isStudentViewingTeacherBook ? (
                                  <span style={{ color: '#166534', fontSize: '0.72rem', fontWeight: 800, background: '#f0fdf4', border: '1px solid #dcfce7', padding: '2px 8px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Users size={11} strokeWidth={2} style={{ color: '#16a34a' }} /> Von deiner Lehrkraft begleitet
                                  </span>
                                ) : activeLehrwerkId.startsWith('custom-') || book.is_custom || assignedBook?.createdByRole === 'teacher' || book.created_by_teacher ? (
                                  <span style={{ color: '#475569', fontSize: '0.72rem', fontWeight: 800, background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Users size={11} strokeWidth={2} style={{ color: '#64748b' }} /> Vom Lehrer angelegt
                                  </span>
                                ) : (
                                  <span style={{ color: '#475569', fontSize: '0.72rem', fontWeight: 800, background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <BookOpen size={11} strokeWidth={2} style={{ color: '#64748b' }} /> Lehrwerk
                                  </span>
                                )}
                              </div>

                              {/* Expressive Apple Access Control Bar */}
                              {isStudentCreated && (
                                <div style={{
                                  margin: '8px 0 10px 0',
                                  padding: '6px 12px',
                                  background: '#f8fafc',
                                  border: '1.5px solid #e2e8f0',
                                  borderRadius: '16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '8px'
                                }}>
                                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Lock size={12} strokeWidth={2} style={{ color: '#64748b' }} /> Sichtbarkeit & Rechte:
                                  </span>
                                  <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    background: '#cbd5e1',
                                    borderRadius: '11px',
                                    padding: '2px',
                                    gap: '2px'
                                  }}>
                                    <button
                                      type="button"
                                      onClick={() => updateLehrwerkVisibility(book.id, 'private')}
                                      style={{
                                        border: 'none',
                                        background: currentVisibility === 'private' ? '#ffffff' : 'transparent',
                                        color: currentVisibility === 'private' ? '#0f172a' : '#475569',
                                        padding: '4px 10px',
                                        borderRadius: '9px',
                                        fontSize: '0.71rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        boxShadow: currentVisibility === 'private' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.15s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      <Lock size={11} strokeWidth={2} /> Privat
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => updateLehrwerkVisibility(book.id, 'read')}
                                      style={{
                                        border: 'none',
                                        background: currentVisibility === 'read' ? '#ffffff' : 'transparent',
                                        color: currentVisibility === 'read' ? '#047857' : '#475569',
                                        padding: '4px 10px',
                                        borderRadius: '9px',
                                        fontSize: '0.71rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        boxShadow: currentVisibility === 'read' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.15s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      <Eye size={11} strokeWidth={2} /> Lehrer liest mit
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => updateLehrwerkVisibility(book.id, 'control')}
                                      style={{
                                        border: 'none',
                                        background: currentVisibility === 'control' ? '#ffffff' : 'transparent',
                                        color: currentVisibility === 'control' ? '#6d28d9' : '#475569',
                                        padding: '4px 10px',
                                        borderRadius: '9px',
                                        fontSize: '0.71rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        boxShadow: currentVisibility === 'control' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.15s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      <Users size={11} strokeWidth={2} /> Lehrer darf eintragen
                                    </button>
                                  </div>
                                </div>
                              )}

                              {book.author && (
                                <p style={{ margin: '0 0 2px 0', fontSize: '0.76rem', color: '#64748b', fontWeight: 650 }}>
                                  von {book.author}
                                </p>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', margin: '4px 0 2px 0' }}>
                                <div style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  background: '#f8fafc',
                                  border: '1.5px solid #e2e8f0',
                                  borderRadius: '11px',
                                  padding: '2px',
                                  gap: '2px'
                                }}>
                                  <button
                                    type="button"
                                    onClick={handleRemovePage}
                                    disabled={totalBookPages <= 1}
                                    title={`Letzte Seite (Seite ${totalBookPages}) entfernen`}
                                    aria-label="Letzte Seite entfernen"
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '8px',
                                      border: 'none',
                                      background: 'transparent',
                                      color: totalBookPages <= 1 ? '#cbd5e1' : '#475569',
                                      fontSize: '0.9rem',
                                      fontWeight: 900,
                                      cursor: totalBookPages <= 1 ? 'not-allowed' : 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'all 0.15s ease'
                                    }}
                                    className="hover-scale-mini"
                                  >
                                    −
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handlePromptSetPages}
                                    title="Klicken, um Gesamtseitenzahl direkt anzupassen"
                                    aria-label="Gesamtseitenzahl anpassen"
                                    style={{
                                      border: 'none',
                                      background: '#ffffff',
                                      color: '#0f172a',
                                      padding: '3px 8px',
                                      borderRadius: '7px',
                                      fontSize: '0.74rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <BookOpen size={11} strokeWidth={2} style={{ color: '#475569' }} />
                                    <span>{totalBookPages} Seiten</span>
                                    <Pencil size={9} strokeWidth={2} style={{ color: '#94a3b8' }} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleAddPage}
                                    title="Neue Seite am Ende anhängen"
                                    aria-label="Neue Seite hinzufügen"
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '8px',
                                      border: 'none',
                                      background: 'transparent',
                                      color: '#166534',
                                      fontSize: '0.9rem',
                                      fontWeight: 900,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'all 0.15s ease'
                                    }}
                                    className="hover-scale-mini"
                                  >
                                    +
                                  </button>
                                </div>
                                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
                                  {pct}% gemeistert
                                </span>
                              </div>
                              <div style={{ width: '100%', height: '6px', background: '#e8e8ed', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #34a853, #34a853)', transition: 'width 0.4s ease' }} />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* 🖌️ Pinsel zum Einfärben (Lehrkraft: 4 Pinsel, Schüler: Mein Fokus Pinsel) */}
                    {(() => {
                      const isStudentCreated = Boolean(assignedBook?.isStudentCreated || assignedBook?.createdByRole === 'student' || book.created_by_role === 'student');
                      const isStudentViewingTeacherBook = Boolean(readOnly && !isStudentCreated);

                      const focusCount = pages.filter(p => assignedBook.pageStates?.[p]?.studentFocus).length;

                      const brushes = isStudentViewingTeacherBook
                        ? [
                            {
                              mode: 'STUDENT_FOCUS',
                              color: '#c084fc',
                              border: '#9333ea',
                              label: `Mein Fokus (Max. 3)${focusCount > 0 ? ` (${focusCount}/3)` : ''}`
                            }
                          ]
                        : [
                            { mode: 'LOCKED', color: '#e2e8f0', label: 'grau = offen' },
                            { mode: 'HOMEWORK', color: '#fde047', label: 'gelb = Hausaufgabe' },
                            { mode: 'MASTERED', color: '#86efac', label: 'grün = erledigt' },
                            { mode: 'STUDENT_FOCUS', color: '#c084fc', border: '#9333ea', label: `lila = Mein Fokus (Max. 3)${focusCount > 0 ? ` (${focusCount}/3)` : ''}` }
                          ];

                      return (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          background: 'white',
                          borderRadius: '18px',
                          padding: isStudentViewingTeacherBook ? '10px 16px' : '12px 16px',
                          border: isStudentViewingTeacherBook && activeBrush === 'STUDENT_FOCUS'
                            ? '1.5px solid #a855f7'
                            : '1px solid rgba(0, 0, 0, 0.08)',
                          boxShadow: isStudentViewingTeacherBook && activeBrush === 'STUDENT_FOCUS'
                            ? '0 3px 12px rgba(168, 85, 247, 0.12)'
                            : '0 4px 15px rgba(0,0,0,0.02)',
                          transition: 'all 0.15s ease'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4b5563', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Edit3 size={13} strokeWidth={2.2} style={{ color: isStudentViewingTeacherBook && activeBrush === 'STUDENT_FOCUS' ? '#7e22ce' : '#4b5563' }} />
                              <span>{isStudentViewingTeacherBook ? 'Pinsel für deinen Fokus:' : 'Pinsel zum Einfärben:'}</span>
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {brushes.map(b => {
                                const isActive = activeBrush === b.mode;
                                return (
                                  <button
                                    key={b.mode}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveBrush(prev => prev === b.mode ? 'NONE' : b.mode as any);
                                    }}
                                    style={{
                                      height: isStudentViewingTeacherBook ? '30px' : '28px',
                                      borderRadius: isStudentViewingTeacherBook ? '12px' : '50%',
                                      padding: isStudentViewingTeacherBook ? '0 12px' : '0',
                                      minWidth: isStudentViewingTeacherBook ? 'auto' : '28px',
                                      background: isActive
                                        ? (b.mode === 'STUDENT_FOCUS' ? '#9333ea' : b.color)
                                        : (isStudentViewingTeacherBook ? '#f3e8ff' : b.color),
                                      border: isActive
                                        ? (b.mode === 'STUDENT_FOCUS' ? '2.5px solid #6b21a8' : '3px solid #0f172a')
                                        : (b.border ? `1.5px solid ${b.border}` : '1.5px solid #cbd5e1'),
                                      color: isActive ? '#ffffff' : (isStudentViewingTeacherBook ? '#6b21a8' : '#334155'),
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease',
                                      transform: isActive ? 'scale(1.05)' : 'none',
                                      outline: 'none',
                                      boxShadow: isActive
                                        ? (b.mode === 'STUDENT_FOCUS' ? '0 2px 10px rgba(147, 51, 234, 0.35)' : '0 2px 6px rgba(0,0,0,0.15)')
                                        : 'none',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px',
                                      fontSize: '0.74rem',
                                      fontWeight: 850
                                    }}
                                    className="hover-scale-mini"
                                    title={b.label}
                                  >
                                    {isStudentViewingTeacherBook ? (
                                      <>
                                        <span style={{
                                          width: '7px',
                                          height: '7px',
                                          borderRadius: '50%',
                                          background: isActive ? '#ffffff' : '#9333ea'
                                        }} />
                                        <span>{isActive ? '✓ Pinsel aktiv' : 'Mein Fokus (Max. 3)'}</span>
                                        <span style={{
                                          fontSize: '0.66rem',
                                          fontWeight: 800,
                                          opacity: 0.85
                                        }}>
                                          ({focusCount}/3)
                                        </span>
                                      </>
                                    ) : (
                                      b.mode === 'STUDENT_FOCUS' && focusCount > 0 && (
                                        <span style={{ fontSize: '0.62rem', fontWeight: 950, color: isActive ? '#ffffff' : '#6b21a8' }}>
                                          {focusCount}
                                        </span>
                                      )
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          {isStudentViewingTeacherBook && activeBrush === 'STUDENT_FOCUS' && (
                            <div style={{ fontSize: '0.68rem', color: '#7e22ce', fontWeight: 700, paddingLeft: '18px' }}>
                              Tippe auf Seiten in der Übersicht, um bis zu 3 Fokus-Seiten einzufärben!
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Page Grid preview scroll for active textbook */}
                    {assignedBook && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '24px', padding: '16px' }}>
                        {(() => {
                          const isStudentCreated = Boolean(assignedBook?.isStudentCreated || assignedBook?.createdByRole === 'student' || book.created_by_role === 'student');
                          const isStudentViewingTeacherBook = Boolean(readOnly && !isStudentCreated);

                          return (
                            <>
                              {(() => {
                                const homeworkCount = pages.filter(p => assignedBook.pageStates?.[p]?.status === 'homework' || assignedBook.pageStates?.[p]?.isCurrentHomework).length;
                                const focusCount = pages.filter(p => assignedBook.pageStates?.[p]?.studentFocus).length;

                                return (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                    {/* Apple 2027 Segmented Control Filter */}
                                    <div style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      background: '#f1f5f9',
                                      padding: '3px',
                                      borderRadius: '12px',
                                      gap: '2px',
                                      border: '1px solid #e2e8f0'
                                    }}>
                                      <button
                                        type="button"
                                        onClick={() => setTextbookPageFilter('all')}
                                        style={{
                                          padding: '4px 10px',
                                          borderRadius: '9px',
                                          border: 'none',
                                          background: textbookPageFilter === 'all' ? '#ffffff' : 'transparent',
                                          color: textbookPageFilter === 'all' ? '#0f172a' : '#64748b',
                                          fontWeight: 800,
                                          fontSize: '0.72rem',
                                          cursor: 'pointer',
                                          boxShadow: textbookPageFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                          transition: 'all 0.15s ease'
                                        }}
                                      >
                                        Alle ({pages.length})
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setTextbookPageFilter('homework')}
                                        style={{
                                          padding: '4px 10px',
                                          borderRadius: '9px',
                                          border: 'none',
                                          background: textbookPageFilter === 'homework' ? '#ffffff' : 'transparent',
                                          color: textbookPageFilter === 'homework' ? '#854d0e' : '#64748b',
                                          fontWeight: 800,
                                          fontSize: '0.72rem',
                                          cursor: 'pointer',
                                          boxShadow: textbookPageFilter === 'homework' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                          transition: 'all 0.15s ease',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                      >
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#eab308' }} />
                                        <span>Hausaufgaben ({homeworkCount})</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setTextbookPageFilter('focus')}
                                        style={{
                                          padding: '4px 10px',
                                          borderRadius: '9px',
                                          border: 'none',
                                          background: textbookPageFilter === 'focus' ? '#ffffff' : 'transparent',
                                          color: textbookPageFilter === 'focus' ? '#6b21a8' : '#64748b',
                                          fontWeight: 800,
                                          fontSize: '0.72rem',
                                          cursor: 'pointer',
                                          boxShadow: textbookPageFilter === 'focus' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                          transition: 'all 0.15s ease',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                        title="Mein Fokus (Max. 3 Seiten)"
                                        aria-label="Mein Fokus (Max. 3 Seiten)"
                                      >
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#9333ea' }} />
                                        <span>Mein Fokus (Max. 3){focusCount > 0 ? ` (${focusCount}/3)` : ''}</span>
                                      </button>
                                    </div>

                                    {(() => {
                                      const quickHwPage = pages.find(p => assignedBook.pageStates?.[p]?.status === 'homework' || assignedBook.pageStates?.[p]?.isCurrentHomework);
                                      const quickFocusPage = pages.find(p => assignedBook.pageStates?.[p]?.studentFocus);
                                      const targetPage = quickHwPage || quickFocusPage;
                                      if (!targetPage || activePageNumber === targetPage) return null;
                                      return (
                                        <button
                                          type="button"
                                          onClick={() => selectTextbookPage(activeLehrwerkId!, targetPage)}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            background: '#fef9c3',
                                            border: '1.5px solid #fde047',
                                            color: '#854d0e',
                                            padding: '3px 9px',
                                            borderRadius: '999px',
                                            fontSize: '0.69rem',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                          }}
                                          className="hover-scale-mini"
                                          title={`Sofort zu Seite ${targetPage} springen`}
                                        >
                                          <Zap size={11} strokeWidth={2.5} style={{ color: '#854d0e' }} />
                                          <span>Zur Hausaufgabe (S. {targetPage})</span>
                                        </button>
                                      );
                                    })()}
                                  </div>
                                );
                              })()}
                            </>
                          );
                        })()}
                        {pages.length > 60 && (
                          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            {Array.from({ length: Math.ceil(pages.length / 60) }).map((_, idx) => {
                              const startPage = idx * 60 + 1;
                              const endPage = Math.min((idx + 1) * 60, pages.length);
                              const totalChunks = Math.ceil(pages.length / 60);
                              const activeChunkIndex = Math.min(textbookPageChunkIndex, Math.max(0, totalChunks - 1));
                              const isSelected = activeChunkIndex === idx;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setPageChunk(idx)}
                                  style={{
                                    background: isSelected ? '#34a853' : '#f1f5f9',
                                    color: isSelected ? 'white' : '#475569',
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '12px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    boxShadow: isSelected ? '0 2px 6px rgba(19, 115, 51, 0.2)' : 'none'
                                  }}
                                  className="hover-scale"
                                >
                                  {startPage}-{endPage}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
                          gap: '8px',
                          maxHeight: '320px',
                          overflowY: 'auto',
                          padding: '4px'
                        }}>
                          {(() => {
                            const baseFilteredPages = textbookPageFilter === 'homework'
                              ? pages.filter(p => assignedBook.pageStates?.[p]?.status === 'homework' || assignedBook.pageStates?.[p]?.isCurrentHomework)
                              : (textbookPageFilter === 'focus'
                                  ? pages.filter(p => assignedBook.pageStates?.[p]?.studentFocus)
                                  : pages);

                            if (baseFilteredPages.length === 0) {
                              return (
                                <div style={{
                                  gridColumn: '1 / -1',
                                  padding: '32px 16px',
                                  textAlign: 'center',
                                  background: '#f8fafc',
                                  borderRadius: '16px',
                                  border: '1.5px dashed #cbd5e1',
                                  color: '#64748b',
                                  fontSize: '0.82rem',
                                  fontWeight: 650,
                                  lineHeight: 1.5
                                }}>
                                  {textbookPageFilter === 'focus' 
                                    ? 'Noch keine Fokus-Seiten gewählt. Wähle bis zu 3 Seiten aus, auf die du dich konzentrieren möchtest (Klick auf „Zu Mein Fokus (Max. 3)“ auf der Seite).'
                                    : 'In diesem Lehrwerk sind aktuell keine Hausaufgaben aufgegeben.'}
                                </div>
                              );
                            }

                            const totalChunks = Math.ceil(baseFilteredPages.length / 60);
                            const activeChunkIndex = Math.min(textbookPageChunkIndex, Math.max(0, totalChunks - 1));
                            const displayedPages = baseFilteredPages.length > 60 ? baseFilteredPages.slice(activeChunkIndex * 60, (activeChunkIndex + 1) * 60) : baseFilteredPages;
                            const pageButtons = displayedPages.map(num => {
                              const pageState = assignedBook.pageStates?.[num] || { status: 'locked' };
                              const globalPage = book.globalPageStates?.[num] === 'purple';
                              const status = globalPage ? 'purple' : (pageState.status || 'locked');
                              const isStudentFocus = Boolean(pageState?.studentFocus);

                              let borderColor = '#e2e8f0';
                              let bg = '#ffffff';
                              let textColor = '#64748b';

                              if (isStudentFocus) {
                                borderColor = '#c084fc';
                                bg = '#f3e8ff';
                                textColor = '#6b21a8';
                              } else if (status === 'homework') {
                                borderColor = '#facc15';
                                bg = '#fef9c3';
                                textColor = '#854d0e';
                              } else if (status === 'mastered') {
                                borderColor = '#86efac';
                                bg = '#f0fdf4';
                                textColor = '#166534';
                              } else if (status === 'purple') {
                                borderColor = '#c084fc';
                                bg = '#f3e8ff';
                                textColor = '#6b21a8';
                              }

                              let solidActiveBg = '#0f172a';
                              if (isStudentFocus) solidActiveBg = '#9333ea';
                              else if (status === 'homework') solidActiveBg = '#facc15';
                              else if (status === 'mastered') solidActiveBg = '#22c55e';
                              else if (status === 'purple') solidActiveBg = '#9333ea';

                              const isPageActive = activePageNumber === num;
                              const pageExercises = (pageState?.exercises || []) as LehrwerkExercise[];
                              const totalEx = pageExercises.length;

                              return (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => {
                                    const isStudentCreated = Boolean(assignedBook?.isStudentCreated || assignedBook?.createdByRole === 'student' || book.created_by_role === 'student');
                                    const isStudentViewingTeacherBook = Boolean(readOnly && !isStudentCreated);

                                    if (activeBrush === 'STUDENT_FOCUS') {
                                      handleToggleStudentFocus(activeLehrwerkId!, num);
                                      selectTextbookPage(activeLehrwerkId!, num);
                                      return;
                                    }

                                    if (activeBrush !== 'NONE' && !isStudentViewingTeacherBook) {
                                      let targetStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED' = 'IN_PROGRESS';
                                      let targetHomework = false;

                                      if (activeBrush === 'LOCKED') {
                                        targetStatus = 'IN_PROGRESS';
                                        targetHomework = false;
                                      } else if (activeBrush === 'HOMEWORK') {
                                        targetStatus = 'IN_PROGRESS';
                                        targetHomework = true;
                                      } else if (activeBrush === 'MASTERED') {
                                        targetStatus = 'MASTERED';
                                        targetHomework = false;
                                      } else if (activeBrush === 'THEORY') {
                                        targetStatus = 'THEORY_DONE';
                                        targetHomework = false;
                                      }

                                      triggerDirectSave(activeLehrwerkId!, num, targetStatus, targetHomework);
                                      selectTextbookPage(activeLehrwerkId!, num, targetStatus, targetHomework);
                                      return;
                                    }

                                    const now = Date.now();
                                    if (lastClickRef.current && lastClickRef.current.pageNum === num && (now - lastClickRef.current.timestamp) < 250) {
                                      if (clickTimeoutRef.current) {
                                        clearTimeout(clickTimeoutRef.current);
                                        clickTimeoutRef.current = null;
                                      }
                                      lastClickRef.current = null;
                                      if (!isStudentViewingTeacherBook) {
                                        handlePageDoubleClick(activeLehrwerkId!, num);
                                      } else {
                                        selectTextbookPage(activeLehrwerkId!, num);
                                      }
                                    } else {
                                      lastClickRef.current = { pageNum: num, timestamp: now };
                                      if (clickTimeoutRef.current) {
                                        clearTimeout(clickTimeoutRef.current);
                                      }
                                      clickTimeoutRef.current = setTimeout(() => {
                                        clickTimeoutRef.current = null;
                                        lastClickRef.current = null;
                                        selectTextbookPage(activeLehrwerkId!, num);
                                      }, 250);
                                    }
                                  }}
                                  style={{
                                    position: 'relative',
                                    height: '44px',
                                    borderRadius: '50%',
                                    border: isPageActive 
                                      ? `2px solid ${solidActiveBg}` 
                                      : `2px solid ${borderColor}`,
                                    background: isPageActive ? solidActiveBg : bg,
                                    color: isPageActive ? ((status === 'homework' && !isStudentFocus) ? '#713f12' : '#ffffff') : textColor,
                                    fontWeight: 900,
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: isPageActive ? '0 4px 8px rgba(0,0,0,0.1)' : 'none',
                                    transform: isPageActive ? 'scale(1.08)' : 'none',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <span>{num}</span>
                                  {/* Sub-Progress Dots for Exercises on this Page */}
                                  {totalEx > 0 && (
                                    <div style={{
                                      position: 'absolute',
                                      bottom: '3px',
                                      display: 'flex',
                                      gap: '2px',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      pointerEvents: 'none'
                                    }}>
                                      {pageExercises.slice(0, 4).map((ex, i) => (
                                        <span
                                          key={i}
                                          style={{
                                            width: '4px',
                                            height: '4px',
                                            borderRadius: '50%',
                                            background: ex.status === 'mastered' ? '#22c55e' : (ex.status === 'homework' ? '#eab308' : '#cbd5e1')
                                          }}
                                        />
                                      ))}
                                      {totalEx > 4 && (
                                        <span style={{ fontSize: '0.45rem', lineHeight: 1, color: isPageActive ? '#cbd5e1' : '#94a3b8' }}>+</span>
                                      )}
                                    </div>
                                  )}
                                  {isStudentFocus && (
                                    <span 
                                      title="Mein Fokus (Max. 3)" 
                                      style={{
                                        position: 'absolute',
                                        top: '-3px',
                                        right: '-3px',
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        background: '#8b5cf6',
                                        border: '2px solid #ffffff',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                        display: 'inline-block'
                                      }}
                                    />
                                  )}
                                </button>
                              );
                            });

                            return pageButtons;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : activeSubView === 'song' && selectedActiveSongId ? (
              (() => {
                const skill = activeSongSkills.find(s => s.id === selectedActiveSongId);
                if (!skill) return null;
                const songColor = getSongColor(skill.songs?.title || 'Song');
                const progress = songProgressPercent;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease', flex: 1, overflowY: 'auto', padding: '24px' }}>
                    {/* 🎵 0.1% Goldstandard 2027 Song Hero Card */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      background: 'white',
                      borderRadius: '24px',
                      padding: '20px',
                      border: '1px solid #cbd5e1',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                      transition: 'all 0.3s ease',
                      position: 'relative'
                    }}>
                      {/* Match Confetti Flash */}
                      {showMatchConfetti && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 10, borderRadius: '24px', overflow: 'hidden' }}>
                          <Confetti width={500} height={300} recycle={false} numberOfPieces={120} />
                        </div>
                      )}

                      {/* Top Header: Cover + Info + Didactic Status */}
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        {renderSongVinylCover(songColor, 'md')}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ margin: '0 0 2px 0', fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>
                            {skill.songs?.title}
                          </h4>
                          <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            von {skill.songs?.artist || 'Unbekannt'}
                          </p>

                          {/* Segmented Status Selector (Simple, schlicht, kompakt) */}
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#f8fafc',
                            padding: '3px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0'
                          }}>
                            {[
                              {
                                mode: 'LOCKED',
                                color: 'hsl(355, 75%, 84%)',
                                text: '#991b1b',
                                label: 'In Arbeit',
                                getActive: () => status === 'IN_PROGRESS' && !isCurrentHomework,
                                action: () => {
                                  setStatus('IN_PROGRESS');
                                  setIsCurrentHomework(false);
                                  setHasChanges(true);
                                  if (selectedActiveSongId) triggerDirectSongSave(selectedActiveSongId, 'IN_PROGRESS', false);
                                }
                              },
                              {
                                mode: 'HOMEWORK',
                                color: 'hsl(47, 85%, 84%)',
                                text: '#854d0e',
                                label: 'Hausaufgabe',
                                getActive: () => status === 'IN_PROGRESS' && isCurrentHomework,
                                action: () => {
                                  setStatus('IN_PROGRESS');
                                  setIsCurrentHomework(true);
                                  setHasChanges(true);
                                  if (selectedActiveSongId) triggerDirectSongSave(selectedActiveSongId, 'IN_PROGRESS', true);
                                }
                              },
                              {
                                mode: 'MASTERED',
                                color: 'hsl(130, 65%, 82%)',
                                text: '#166534',
                                label: 'Gemeistert',
                                getActive: () => status === 'MASTERED',
                                action: () => {
                                  setStatus('MASTERED');
                                  setIsCurrentHomework(false);
                                  setHasChanges(true);
                                  if (selectedActiveSongId) triggerDirectSongSave(selectedActiveSongId, 'MASTERED', false);
                                }
                              }
                            ].map(b => {
                              const isActive = b.getActive();
                              return (
                                <button
                                  key={b.mode}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    b.action();
                                  }}
                                  aria-label={b.label}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '4px 8px',
                                    borderRadius: '8px',
                                    border: isActive ? '1px solid rgba(0,0,0,0.1)' : '1px solid transparent',
                                    background: isActive ? b.color : 'transparent',
                                    color: isActive ? b.text : '#64748b',
                                    fontWeight: isActive ? 800 : 600,
                                    fontSize: '0.72rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <span style={{
                                    width: '7px',
                                    height: '7px',
                                    borderRadius: '50%',
                                    background: b.color,
                                    border: '1px solid rgba(0,0,0,0.2)'
                                  }} />
                                  <span>{b.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Subtle Divider */}
                      <div style={{ height: '1px', background: '#f1f5f9', margin: '2px 0' }} />

                      {/* Header row: Progress Title & Mode Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.86rem', fontWeight: 900, color: songProgressPercent === 100 ? '#34a853' : '#0f172a', transition: 'color 0.3s ease' }}>
                            {readOnly && isMatchModeEnabled
                              ? (lastMatchedTeacherPercent !== null ? `Lehrer-Stand: ${lastMatchedTeacherPercent}%` : 'Fortschritt (Wird im Unterricht gematcht)')
                              : `Fortschritt: ${songProgressPercent}%`}
                          </span>

                          {/* Teacher's Match-Mode Toggle Pill */}
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={handleToggleMatchMode}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '99px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                border: isMatchModeEnabled ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                                background: isMatchModeEnabled ? '#f0fdf4' : '#f8fafc',
                                color: isMatchModeEnabled ? '#166534' : '#64748b',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              className="hover-scale"
                              title={isMatchModeEnabled ? 'Match-Modus ist aktiv (Schüler schätzt heimlich mit)' : 'Match-Modus ist aus (Schüler sieht nur Read-Only)'}
                            >
                              <span>🎯 Match-Modus:</span>
                              <span style={{ fontWeight: 900 }}>{isMatchModeEnabled ? 'Aktiv' : 'Aus'}</span>
                            </button>
                          )}
                        </div>
                        
                        {songProgressPercent === 100 ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#eab308',
                            fontSize: '0.84rem',
                            fontWeight: 900,
                            animation: 'fadeIn 0.3s ease'
                          }}>
                            <span>Song gemeistert</span>
                            <Star size={16} fill="#eab308" color="#eab308" style={{ filter: 'drop-shadow(0 0 3px rgba(234, 179, 8, 0.5))' }} />
                          </div>
                        ) : (
                          !readOnly && (
                            <button
                              type="button"
                              onClick={() => setIsSubSlidersExpanded(!isSubSlidersExpanded)}
                              style={{
                                background: '#f1f5f9',
                                border: 'none',
                                color: '#4b5563',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {isSubSlidersExpanded ? 'Details ausblenden ▲' : 'Details einblenden ▼'}
                            </button>
                          )
                        )}
                      </div>

                      {/* TEACHER SLIDER (Master Rating) */}
                      {!readOnly && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={songProgressPercent}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setSongProgressPercent(val);
                                setRhythmVal(val);
                                setFingerVal(val);
                                setExpressionVal(val);
                                if (val === 100) {
                                  setStatus('MASTERED');
                                  setIsCurrentHomework(false);
                                  setIsSubSlidersExpanded(false);
                                } else if (status === 'MASTERED') {
                                  setStatus('IN_PROGRESS');
                                }
                                setHasChanges(true);
                                setActiveSongSkills(prev => prev.map(s => s.id === selectedActiveSongId ? { ...s, progress_percent: val, is_stage_ready: val === 100 } : s));
                                localStorage.setItem(`song_skills_detail_${student.id}_${selectedActiveSongId}`, JSON.stringify({
                                  rhythm: val,
                                  finger: val,
                                  expression: val
                                }));
                                triggerDebouncedAutoSave(300);
                              }}
                              style={{
                                flex: 1,
                                accentColor: songProgressPercent === 100 ? '#34a853' : (songProgressPercent >= 50 ? '#eab308' : '#64748b'),
                                height: '9px',
                                borderRadius: '4.5px',
                                cursor: 'pointer',
                                background: songProgressPercent === 100
                                  ? `linear-gradient(to right, #34a853 0%, #34a853 100%)`
                                  : (songProgressPercent >= 50
                                    ? `linear-gradient(to right, #eab308 0%, #eab308 ${songProgressPercent}%, #e2e8f0 ${songProgressPercent}%, #e2e8f0 100%)`
                                    : `linear-gradient(to right, #64748b 0%, #64748b ${songProgressPercent}%, #e2e8f0 ${songProgressPercent}%, #e2e8f0 100%)`),
                                WebkitAppearance: 'none',
                                outline: 'none',
                                transition: 'all 0.3s ease'
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* READ-ONLY FALLBACK (When Match-Modus is OFF for Student) */}
                      {readOnly && !isMatchModeEnabled && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              disabled={true}
                              value={songProgressPercent}
                              style={{
                                flex: 1,
                                accentColor: songProgressPercent === 100 ? '#34a853' : (songProgressPercent >= 50 ? '#eab308' : '#64748b'),
                                height: '10px',
                                borderRadius: '5px',
                                cursor: 'default',
                                opacity: 0.85,
                                background: songProgressPercent === 100
                                  ? `linear-gradient(to right, #34a853 0%, #34a853 100%)`
                                  : (songProgressPercent >= 50
                                    ? `linear-gradient(to right, #eab308 0%, #eab308 ${songProgressPercent}%, #e2e8f0 ${songProgressPercent}%, #e2e8f0 100%)`
                                    : `linear-gradient(to right, #64748b 0%, #64748b ${songProgressPercent}%, #e2e8f0 ${songProgressPercent}%, #e2e8f0 100%)`),
                                WebkitAppearance: 'none',
                                outline: 'none'
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* STUDENT BLIND-RATING SLIDER (With Zero-Bias Protection) */}
                      {readOnly && isMatchModeEnabled && (() => {
                        const currentPct = studentRating ?? 0;
                        const feelings = [
                          { max: 15, text: 'Aller Anfang!', icon: '🐌' },
                          { max: 40, text: 'Wird schon!', icon: '🐢' },
                          { max: 65, text: 'Groovt gut!', icon: '🎸' },
                          { max: 85, text: 'Fast da!', icon: '⚡' },
                          { max: 100, text: 'Bühnenreif!', icon: '🚀' }
                        ];
                        const feeling = feelings.find(f => currentPct <= f.max) || feelings[feelings.length - 1];

                        return (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            background: '#f0fdf4',
                            padding: '14px 16px',
                            borderRadius: '16px',
                            border: '1.5px solid #bbf7d0',
                            animation: 'fadeIn 0.2s ease'
                          }}>
                            {/* Top Header Row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                              <span style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                🎧 Wie gut klappt es schon:
                                <span style={{ color: currentPct > 0 ? '#15803d' : '#64748b', fontWeight: 950, fontSize: '0.94rem' }}>
                                  {currentPct}% • {feeling.icon} {feeling.text}
                                </span>
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: '99px', fontWeight: 800 }}>
                                🔒 Lehrer-Wertung verdeckt
                              </span>
                            </div>

                            {/* Interactive Slider */}
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={studentRating ?? 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                handleStudentRatingChange(val);
                              }}
                              style={{
                                width: '100%',
                                accentColor: '#16a34a',
                                height: '14px',
                                borderRadius: '7px',
                                cursor: 'pointer',
                                touchAction: 'manipulation',
                                pointerEvents: 'auto',
                                background: currentPct > 0
                                  ? `linear-gradient(to right, #16a34a 0%, #16a34a ${currentPct}%, #e2e8f0 ${currentPct}%, #e2e8f0 100%)`
                                  : '#e2e8f0',
                                WebkitAppearance: 'none',
                                outline: 'none',
                                transition: 'all 0.15s ease'
                              }}
                            />

                            {/* Action & Status Row: Lifecycle-Aware Child-Friendly Commit Button */}
                            {(() => {
                              const isFullyCompleted = matchHistory.length >= 3;
                              const targetMatchNum = Math.min(matchHistory.length + 1, 3);
                              const hasFreshStudentRating = Boolean(
                                studentRating !== null &&
                                studentRating !== undefined &&
                                studentRatingUpdatedAt &&
                                (!lastMatchedAt || new Date(studentRatingUpdatedAt).getTime() > new Date(lastMatchedAt).getTime())
                              );

                              return (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {isFullyCompleted ? (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        background: '#dcfce7',
                                        color: '#15803d',
                                        padding: '5px 12px',
                                        borderRadius: '99px',
                                        fontSize: '0.74rem',
                                        fontWeight: 850
                                      }}>
                                        <span>🏆 Alle 3 Meilensteine gemeistert!</span>
                                      </span>
                                    ) : (hasFreshStudentRating && isStudentRatingCommitted) ? (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        background: '#dcfce7',
                                        color: '#15803d',
                                        padding: '5px 12px',
                                        borderRadius: '99px',
                                        fontSize: '0.74rem',
                                        fontWeight: 850
                                      }}>
                                        <Check size={14} strokeWidth={3} />
                                        <span>Tipp für Match {targetMatchNum} ist sicher bei deiner Lehrkraft!</span>
                                      </span>
                                    ) : (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: matchHistory.length > 0 ? '#f0fdf4' : '#fffbeb',
                                        color: matchHistory.length > 0 ? '#15803d' : '#b45309',
                                        padding: '4px 10px',
                                        borderRadius: '99px',
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        border: `1px solid ${matchHistory.length > 0 ? '#bbf7d0' : '#fde68a'}`
                                      }}>
                                        <span>{matchHistory.length > 0 ? `🌱 Tipp für Match ${targetMatchNum} einstellen (${currentPct}%)` : '⚠️ 1. Tipp noch nicht abgeschickt'}</span>
                                      </span>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={handleCommitStudentRating}
                                    disabled={isFullyCompleted || (hasFreshStudentRating && isStudentRatingCommitted)}
                                    style={{
                                      border: 'none',
                                      background: (isFullyCompleted || (hasFreshStudentRating && isStudentRatingCommitted))
                                        ? '#e2e8f0'
                                        : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                                      color: (isFullyCompleted || (hasFreshStudentRating && isStudentRatingCommitted)) ? '#475569' : '#ffffff',
                                      padding: '9px 20px',
                                      borderRadius: '99px',
                                      fontSize: '0.78rem',
                                      fontWeight: 900,
                                      cursor: (isFullyCompleted || (hasFreshStudentRating && isStudentRatingCommitted)) ? 'default' : 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      boxShadow: (isFullyCompleted || (hasFreshStudentRating && isStudentRatingCommitted)) ? 'none' : '0 3px 10px rgba(22, 163, 74, 0.35)',
                                      transition: 'all 0.15s ease'
                                    }}
                                    className={(isFullyCompleted || (hasFreshStudentRating && isStudentRatingCommitted)) ? '' : 'hover-scale'}
                                  >
                                    {isFullyCompleted ? (
                                      <span>✓ Alle Matches abgeschlossen</span>
                                    ) : (hasFreshStudentRating && isStudentRatingCommitted) ? (
                                      <>
                                        <Check size={14} strokeWidth={3} />
                                        <span>Tipp {targetMatchNum} eingeloggt ({studentRating}%)</span>
                                      </>
                                    ) : (
                                      <>
                                        <Lock size={14} />
                                        <span>🔒 Tipp für Match {targetMatchNum} abschicken ({currentPct}%)</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              );
                            })()}

                            {/* 3 VISUAL REWARD TIERS (Kid-Friendly & Gamified) */}
                            <div style={{ marginTop: '4px' }}>
                              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                                🎁 Belohnungs-Stufen für dein nächstes Match:
                              </div>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                gap: '8px'
                              }}>
                                <div style={{
                                  background: '#fefce8',
                                  border: '1.5px solid #fde047',
                                  borderRadius: '12px',
                                  padding: '8px 10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  <span style={{ fontSize: '1.2rem' }}>🎯</span>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#854d0e' }}>Volltreffer (±10%)</span>
                                    <span style={{ fontSize: '0.66rem', fontWeight: 750, color: '#a16207' }}>+50 XP & Meister-Ohr</span>
                                  </div>
                                </div>

                                <div style={{
                                  background: '#f0f9ff',
                                  border: '1.5px solid #bae6fd',
                                  borderRadius: '12px',
                                  padding: '8px 10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  <span style={{ fontSize: '1.2rem' }}>✨</span>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#0369a1' }}>Super Gehör (±20%)</span>
                                    <span style={{ fontSize: '0.66rem', fontWeight: 750, color: '#0284c7' }}>+25 XP</span>
                                  </div>
                                </div>

                                <div style={{
                                  background: '#faf5ff',
                                  border: '1.5px solid #e9d5ff',
                                  borderRadius: '12px',
                                  padding: '8px 10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  <span style={{ fontSize: '1.2rem' }}>🚀</span>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#7e22ce' }}>Weiter-Rocker (&gt;20%)</span>
                                    <span style={{ fontSize: '0.66rem', fontWeight: 750, color: '#9333ea' }}>+5 XP Mut-Bonus</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 1. DUAL-BALKEN SHOWDOWN RACE BOX (Animated 1.2s Comparison) */}
                      {showdownState && (
                        <div style={{
                          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                          borderRadius: '20px',
                          padding: '16px 20px',
                          color: '#ffffff',
                          margin: '8px 0',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                          border: '1.5px solid rgba(255,255,255,0.12)',
                          animation: 'fadeIn 0.25s ease'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 900, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              <span>🏁 LIVE-MATCH SHOWDOWN</span>
                            </div>
                            {showdownState.isRunning ? (
                              <span style={{ fontSize: '0.72rem', color: '#facc15', fontWeight: 800, animation: 'pulse 1s infinite' }}>
                                ⚡ Showdown läuft...
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#86efac', background: 'rgba(34,197,94,0.2)', padding: '2px 8px', borderRadius: '99px' }}>
                                Δ {Math.abs(showdownState.teacherTarget - showdownState.studentTarget)}% Differenz
                              </span>
                            )}
                          </div>

                          {/* Top Bar: Lehrkraft */}
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: '#cbd5e1', marginBottom: '4px' }}>
                              <span>👨‍🏫 Lehrkraft:</span>
                              <span style={{ color: '#4ade80', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                                {Math.round(showdownState.currentTeacherVal)}%
                              </span>
                            </div>
                            <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${showdownState.currentTeacherVal}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #16a34a, #4ade80)',
                                borderRadius: '99px',
                                transition: showdownState.isRunning ? 'none' : 'width 0.2s ease',
                                boxShadow: '0 0 10px rgba(74, 222, 128, 0.4)'
                              }} />
                            </div>
                          </div>

                          {/* Bottom Bar: Schüler */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: '#cbd5e1', marginBottom: '4px' }}>
                              <span>👧 {readOnly ? 'Dein Tipp:' : 'Schüler-Tipp:'}</span>
                              <span style={{ color: '#facc15', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                                {Math.round(showdownState.currentStudentVal)}%
                              </span>
                            </div>
                            <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${showdownState.currentStudentVal}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #eab308, #fde047)',
                                borderRadius: '99px',
                                transition: showdownState.isRunning ? 'none' : 'width 0.2s ease',
                                boxShadow: '0 0 10px rgba(250, 204, 21, 0.4)'
                              }} />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TEACHER MATCH STATUS & ACTION BAR (Apple-Grade Lifecycle-Aware Single-Line) */}
                      {!readOnly && isMatchModeEnabled && (() => {
                        const targetMatchNum = Math.min(matchHistory.length + 1, 3);
                        const isFullyCompleted = matchHistory.length >= 3;
                        const latestMatch = matchHistory.length > 0 ? matchHistory[matchHistory.length - 1] : null;
                        const diff = (lastMatchedTeacherPercent !== null && lastMatchedStudentPercent !== null)
                          ? Math.abs(lastMatchedTeacherPercent - lastMatchedStudentPercent)
                          : (studentRating !== null ? Math.abs(songProgressPercent - studentRating) : null);

                        const hasFreshStudentRating = Boolean(
                          studentRating !== null &&
                          studentRating !== undefined &&
                          studentRatingUpdatedAt &&
                          (!lastMatchedAt || new Date(studentRatingUpdatedAt).getTime() > new Date(lastMatchedAt).getTime())
                        );

                        const canExecuteMatch = !isFullyCompleted && hasFreshStudentRating && !showdownState?.isRunning;

                        return (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#f8fafc',
                            padding: '10px 14px',
                            borderRadius: '14px',
                            border: canExecuteMatch ? '1.5px solid #bbf7d0' : '1px solid #e2e8f0',
                            gap: '10px',
                            flexWrap: 'wrap',
                            marginTop: '2px'
                          }}>
                            {/* Left Side: Student Tip Status, Compact Result Pill & 3-Dot Milestone Tracker */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              {isFullyCompleted ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  padding: '4px 10px',
                                  borderRadius: '99px',
                                  fontWeight: 900,
                                  fontSize: '0.74rem'
                                }}>
                                  <span>🏆 Song komplett gematcht (3/3)</span>
                                </span>
                              ) : hasFreshStudentRating ? (
                                <>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: '#dcfce7',
                                    color: '#15803d',
                                    padding: '4px 10px',
                                    borderRadius: '99px',
                                    fontWeight: 900,
                                    fontSize: '0.74rem'
                                  }}>
                                    <Check size={13} strokeWidth={3} />
                                    <span>Tipp {targetMatchNum} liegt bereit: {studentRating}%</span>
                                  </span>
                                </>
                              ) : matchHistory.length > 0 ? (
                                <>
                                  {latestMatch && (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      background: latestMatch.tier === 'tier1' ? '#fef3c7' : (latestMatch.tier === 'tier2' ? '#e0f2fe' : '#f3e8ff'),
                                      color: latestMatch.tier === 'tier1' ? '#92400e' : (latestMatch.tier === 'tier2' ? '#075985' : '#6b21a8'),
                                      border: `1px solid ${latestMatch.tier === 'tier1' ? '#fde68a' : (latestMatch.tier === 'tier2' ? '#bae6fd' : '#e9d5ff')}`,
                                      padding: '4px 9px',
                                      borderRadius: '99px',
                                      fontWeight: 850,
                                      fontSize: '0.72rem'
                                    }}>
                                      <span>{latestMatch.tier === 'tier1' ? '🎯' : (latestMatch.tier === 'tier2' ? '✨' : '🚀')}</span>
                                      <span>
                                        Match #{matchHistory.length} beendet
                                        {diff !== null && ` (Δ ${diff}%)`} • +{latestMatch.xp_amount} XP
                                      </span>
                                    </span>
                                  )}
                                  <span style={{ fontWeight: 700, color: '#64748b', fontSize: '0.74rem' }}>
                                    ⏳ Wartet auf Schüler-Tipp für Match {targetMatchNum}
                                  </span>
                                </>
                              ) : (
                                <span style={{ fontWeight: 700, color: '#64748b', fontSize: '0.74rem' }}>
                                  ⏳ Schüler-Tipp steht noch aus (Match 1/3)
                                </span>
                              )}

                              {/* Apple-Style 3-Dot Milestone Tracker */}
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                padding: '4px 8px',
                                borderRadius: '99px'
                              }} title={`Match ${matchHistory.length} von 3 belegt`}>
                                {[0, 1, 2].map((idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      width: '7px',
                                      height: '7px',
                                      borderRadius: '50%',
                                      background: idx < matchHistory.length
                                        ? '#16a34a'
                                        : (idx === matchHistory.length && hasFreshStudentRating ? '#38bdf8' : '#cbd5e1')
                                    }}
                                  />
                                ))}
                                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', marginLeft: '2px' }}>
                                  {matchHistory.length}/3
                                </span>
                              </div>
                            </div>

                            {/* Right Side: Action Button */}
                            <button
                              type="button"
                              onClick={handleCheckMatch}
                              disabled={!canExecuteMatch}
                              style={{
                                border: 'none',
                                background: canExecuteMatch
                                  ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                                  : '#cbd5e1',
                                color: canExecuteMatch ? '#ffffff' : '#64748b',
                                padding: '7px 16px',
                                borderRadius: '99px',
                                fontSize: '0.76rem',
                                fontWeight: 900,
                                cursor: canExecuteMatch ? 'pointer' : 'not-allowed',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: canExecuteMatch ? '0 2px 8px rgba(22, 163, 74, 0.3)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                              className={canExecuteMatch ? 'hover-scale' : ''}
                            >
                              <Sparkles size={13} />
                              <span>
                                {isFullyCompleted
                                  ? '🏆 3/3 Meilensteine belegt'
                                  : (!hasFreshStudentRating && matchHistory.length > 0)
                                    ? `⏳ Wartet auf Tipp ${targetMatchNum}`
                                    : `🎯 Match ${targetMatchNum} prüfen`}
                              </span>
                            </button>
                          </div>
                        );
                      })()}

                      {/* Sub sliders (Rhythm, Finger, Expression) */}
                      {isSubSlidersExpanded && (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                          borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                          padding: '14px 0 0 0',
                          marginTop: '10px',
                          background: 'transparent',
                          animation: 'fadeIn 0.2s ease'
                        }}>
                          {songProgressPercent < 100 && [
                            { label: 'Rhythmus & Timing', value: rhythmVal, type: 'rhythm', color: '#16a34a' },
                            { label: 'Finger & Technik', value: fingerVal, type: 'finger', color: '#0284c7' },
                            { label: 'Ausdruck & Performance', value: expressionVal, type: 'expression', color: '#d97706' }
                          ].map(sub => (
                            <div key={sub.type} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', fontWeight: 800, color: '#475569' }}>
                                <span>{sub.label}</span>
                                <span style={{ color: sub.color, fontWeight: 900 }}>{sub.value}%</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={sub.value}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  let r = rhythmVal;
                                  let f = fingerVal;
                                  let eVal = expressionVal;
                                  if (sub.type === 'rhythm') {
                                    r = val;
                                    setRhythmVal(val);
                                  } else if (sub.type === 'finger') {
                                    f = val;
                                    setFingerVal(val);
                                  } else if (sub.type === 'expression') {
                                    eVal = val;
                                    setExpressionVal(val);
                                  }
                                  setHasChanges(true);
                                  const avg = Math.round((r + f + eVal) / 3);
                                  setSongProgressPercent(avg);
                                  if (avg < 100) {
                                    if (status === 'MASTERED') setStatus('IN_PROGRESS');
                                  } else {
                                    setStatus('MASTERED');
                                    setIsCurrentHomework(false);
                                  }
                                  setActiveSongSkills(prev => prev.map(s => s.id === selectedActiveSongId ? { ...s, progress_percent: avg, is_stage_ready: avg === 100 } : s));
                                  localStorage.setItem(`song_skills_detail_${student.id}_${selectedActiveSongId}`, JSON.stringify({
                                    rhythm: r,
                                    finger: f,
                                    expression: eVal
                                  }));
                                  triggerDebouncedAutoSave(300);
                                }}
                                style={{
                                  width: '100%',
                                  accentColor: sub.color,
                                  height: '3.5px',
                                  borderRadius: '2px',
                                  cursor: 'pointer',
                                  background: `linear-gradient(to right, ${sub.color} 0%, ${sub.color} ${sub.value}%, #e2e8f0 ${sub.value}%, #e2e8f0 100%)`,
                                  WebkitAppearance: 'none',
                                  outline: 'none',
                                  padding: '6px 0'
                                }}
                              />
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setStatus('MASTERED');
                              setIsCurrentHomework(false);
                              setSongProgressPercent(100);
                              setRhythmVal(100);
                              setFingerVal(100);
                              setExpressionVal(100);
                              setIsSubSlidersExpanded(false);
                              setHasChanges(true);
                              setActiveSongSkills(prev => prev.map(s => s.id === selectedActiveSongId ? { ...s, progress_percent: 100, is_stage_ready: true } : s));
                              localStorage.setItem(`song_skills_detail_${student.id}_${selectedActiveSongId}`, JSON.stringify({
                                rhythm: 100,
                                finger: 100,
                                expression: 100
                              }));

                              if (selectedActiveSongId) {
                                const skill = activeSongSkills.find(s => s.id === selectedActiveSongId);
                                const songTitle = skill?.songs?.title || skill?.title || skill?.song_title || 'Unbenannter Song';
                                const songArtist = skill?.songs?.artist || skill?.artist || '';
                                const songTopic = songArtist ? `${songArtist} – ${songTitle}` : songTitle;
                                awardSticker('song-master', songTopic);
                              }
                              triggerDebouncedAutoSave(100);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              background: '#f1f5f9',
                              border: 'none',
                              color: '#374151',
                              fontSize: '0.8rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              padding: '10px 16px',
                              borderRadius: '20px',
                              marginTop: '8px',
                              width: 'fit-content',
                              alignSelf: 'flex-end',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                              transition: 'all 0.15s ease'
                            }}
                            className="hover-scale"
                          >
                            <span>{songProgressPercent === 100 ? 'Song gemeistert' : 'Song als gemeistert markieren'}</span>
                            <Star size={16} fill="#facc15" color="#eab308" style={{ filter: 'drop-shadow(0 0 3px rgba(250, 204, 21, 0.6))' }} />
                          </button>
                        </div>
                      )}

                      {/* Claim Mastery Sticker Button */}
                      {(() => {
                        const skill = activeSongSkills.find(s => s.id === selectedActiveSongId);
                        const songTitle = skill?.songs?.title || skill?.title || skill?.song_title || '';
                        const songArtist = skill?.songs?.artist || skill?.artist || '';
                        const songTopic = songArtist ? `${songArtist} – ${songTitle}` : songTitle;
                        const songMasterInfo = collectedStickers['song-master'];
                        const isSongMasterStickerAwarded = songTopic && songMasterInfo?.details.some(
                          (d: any) => d.topic.toLowerCase().trim() === songTopic.toLowerCase().trim()
                        );
                        
                        if ((songProgressPercent === 100 || status === 'MASTERED') && songTopic && !isSongMasterStickerAwarded) {
                          return (
                            <button
                              type="button"
                              onClick={() => awardSticker('song-master', songTopic)}
                              style={{
                                marginTop: '12px',
                                width: '100%',
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '10px 16px',
                                borderRadius: '20px',
                                fontWeight: 'bold',
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease'
                              }}
                              className="hover-scale"
                            >
                              <span>🏆 Song-Master Sticker erhalten ({songTopic})</span>
                            </button>
                          );
                        }
                        return null;
                      })()}

                      {/* Song Match Milestone Stickers Pass */}
                      {matchHistory && matchHistory.length > 0 && (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          marginTop: '12px',
                          padding: '14px 16px',
                          background: '#f8fafc',
                          borderRadius: '16px',
                          border: '1px solid #e2e8f0'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.74rem',
                            fontWeight: 900,
                            color: '#475569',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>🎯</span> Meilenstein-Pass ({matchHistory.length}/3 Matches)
                            </span>
                          </div>
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                          }}>
                            {matchHistory.map((entry: any, idx: number) => (
                              <MeisterOhrSticker
                                key={`match-sticker-${idx}`}
                                matchedAt={entry.matched_at}
                                teacherPercent={entry.teacher_percent}
                                studentPercent={entry.student_percent}
                                xpAmount={entry.xp_amount}
                                isCompact={true}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              <>
                {/* Hub-view inner scrollable area */}
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 24px', paddingBottom: '16px', overflowY: 'auto' }}>
                
                {hubTab === 'modules' ? (
                  /* ========================================================================= */
                  /* TAB 1: 🎧 MODULE (Kompaktes Apple Music / Spotify 7er-Raster)             */
                  /* ========================================================================= */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} className="animation-fade-in">
                    {(() => {
                      const activeModulesCount = 5 + (isLoopstationUnlocked ? 1 : 0) + (isArchiveUnlocked ? 1 : 0);

                      // Check if customized (either order changed from default or any modules hidden)
                      const isOrderCustomized = customModuleLayout.order.length !== ALL_STUDIO_MODULE_KEYS.length ||
                        customModuleLayout.order.some((key, idx) => key !== ALL_STUDIO_MODULE_KEYS[idx]);
                      const hasHiddenModules = customModuleLayout.hidden.length > 0;
                      const hasLayoutModifications = isOrderCustomized || hasHiddenModules;

                      // Module definitions map for dynamic rendering
                      const moduleDefinitions: Record<StudioModuleKey, {
                        title: string;
                        subtitle?: string;
                        icon: React.ReactNode;
                        gradient: string;
                        boxShadow: string;
                        onClick: () => void;
                        isUnlocked: boolean;
                        showInView: boolean;
                        borderOverride?: string;
                      }> = {
                        practice: {
                          title: 'Üben',
                          icon: <Clock size={34} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />,
                          gradient: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
                          boxShadow: '0 6px 14px -2px rgba(234, 179, 8, 0.40)',
                          isUnlocked: true,
                          showInView: true,
                          onClick: () => {
                            setActiveModalTab('document');
                            setActiveViewMode('practice');
                            setActiveSubView('hub');
                          }
                        },
                        recordings: {
                          title: 'Aufnahmen',
                          icon: <Mic size={34} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />,
                          gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                          boxShadow: '0 6px 14px -2px rgba(99, 102, 241, 0.40)',
                          isUnlocked: true,
                          showInView: true,
                          onClick: () => {
                            setActiveModalTab('document');
                            setActiveViewMode('recordings');
                            setActiveSubView('hub');
                          }
                        },
                        groovetrainer: {
                          title: 'Groove-Trainer',
                          icon: <Radio size={34} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />,
                          gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                          boxShadow: '0 6px 14px -2px rgba(249, 115, 22, 0.40)',
                          isUnlocked: true,
                          showInView: true,
                          onClick: () => {
                            setActiveModalTab('document');
                            setActiveViewMode('groovetrainer' as any);
                            setActiveSubView('hub');
                          }
                        },
                        tuner: {
                          title: 'Stimmgerät',
                          icon: <Radio size={34} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />,
                          gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                          boxShadow: '0 6px 14px -2px rgba(6, 182, 212, 0.40)',
                          isUnlocked: true,
                          showInView: true,
                          onClick: () => {
                            setActiveModalTab('document');
                            setActiveViewMode('tuner');
                            setActiveSubView('hub');
                          }
                        },
                        loopstation: {
                          title: 'Loopstation',
                          icon: <Sliders size={34} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />,
                          gradient: isLoopstationUnlocked 
                            ? 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)'
                            : 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)',
                          boxShadow: isLoopstationUnlocked ? '0 6px 14px -2px rgba(244, 63, 94, 0.40)' : 'none',
                          isUnlocked: isLoopstationUnlocked,
                          showInView: isLoopstationUnlocked || !readOnly,
                          borderOverride: isLoopstationUnlocked ? '1.5px solid #e2e8f0' : '1.5px dashed #cbd5e1',
                          onClick: () => {
                            setActiveModalTab('document');
                            setActiveViewMode('loopstation');
                            setActiveSubView('hub');
                          }
                        },
                        earlab: {
                          title: uiLevel === 'junior' ? 'Klang-Detektiv' : 'Gehörtraining',
                          icon: <Headphones size={34} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />,
                          gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                          boxShadow: '0 6px 14px -2px rgba(139, 92, 246, 0.40)',
                          isUnlocked: true,
                          showInView: true,
                          onClick: () => {
                            setActiveModalTab('document');
                            setActiveViewMode('earlab' as any);
                            setActiveSubView('hub');
                          }
                        },
                        skillradar: {
                          title: uiLevel === 'junior' ? 'Musik-Stern' : 'Fähigkeiten',
                          icon: uiLevel === 'junior' ? (
                            <Star size={34} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />
                          ) : (
                            <Activity size={34} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />
                          ),
                          gradient: uiLevel === 'junior'
                            ? 'linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #8b5cf6 100%)'
                            : 'linear-gradient(135deg, #d946ef 0%, #a21caf 100%)',
                          boxShadow: uiLevel === 'junior'
                            ? '0 6px 14px -2px rgba(245, 158, 11, 0.40)'
                            : '0 6px 14px -2px rgba(217, 70, 239, 0.40)',
                          isUnlocked: true,
                          showInView: true,
                          onClick: () => {
                            setActiveModalTab('skillradar');
                          }
                        },
                        protocol: {
                          title: 'Aufgabenheft',
                          icon: <BookOpen size={34} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />,
                          gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                          boxShadow: '0 6px 14px -2px rgba(16, 185, 129, 0.40)',
                          isUnlocked: true,
                          showInView: true,
                          onClick: () => {
                            setHubTab('protocol');
                          }
                        },
                        archive: {
                          title: 'Verlauf',
                          icon: <History size={34} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />,
                          gradient: isArchiveUnlocked
                            ? 'linear-gradient(135deg, #64748b 0%, #334155 100%)'
                            : 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)',
                          boxShadow: isArchiveUnlocked ? '0 6px 14px -2px rgba(100, 116, 139, 0.40)' : 'none',
                          isUnlocked: isArchiveUnlocked,
                          showInView: isArchiveUnlocked || !readOnly,
                          borderOverride: isArchiveUnlocked ? '1.5px solid #e2e8f0' : '1.5px dashed #cbd5e1',
                          onClick: () => {
                            setActiveModalTab('document');
                            setActiveSubView('history');
                            if (!selectedHistoryWeek) {
                              setSelectedHistoryWeek(getISOWeek());
                            }
                          }
                        },
                        worldtour: {
                          title: 'Musik-Weltreise',
                          icon: <Compass size={34} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />,
                          gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                          boxShadow: '0 6px 14px -2px rgba(2, 132, 199, 0.40)',
                          isUnlocked: true,
                          showInView: true,
                          onClick: () => {
                            setActiveModalTab('document');
                            setActiveViewMode('worldtour' as any);
                            setActiveSubView('hub');
                          }
                        }
                      };

                      // Filter visible ordered modules
                      // 🛡️ Auto-Reconciliation fallback: Ensure any keys missing from both order & hidden are included
                      const currentOrder = customModuleLayout.order || [];
                      const currentHidden = customModuleLayout.hidden || [];
                      const missingFromBoth = ALL_STUDIO_MODULE_KEYS.filter(k => !currentOrder.includes(k) && !currentHidden.includes(k));
                      const effectiveOrder = [...currentOrder, ...missingFromBoth];

                      // 🛡️ 0.1% Goldstandard ($3x3 + 1 Layout):
                      // Die ersten 9 interaktiven Studio-Werkzeuge (inkl. Musik-Weltreise auf Platz 9) bilden ein
                      // harmonisches 3x3 Raster. Das Aufgabenheft-Archiv ('archive') ist als 10. Modul das diskrete
                      // Banner unterhalb des Rasters verankert.
                      const rawVisibleKeys = effectiveOrder.filter(key => {
                        const def = moduleDefinitions[key];
                        if (!def) return false;
                        if (!def.showInView) return false;
                        return !currentHidden.includes(key);
                      });
                      const hasArchive = rawVisibleKeys.includes('archive');
                      const visibleModuleKeys = hasArchive 
                        ? [...rawVisibleKeys.filter(k => k !== 'archive'), 'archive' as StudioModuleKey]
                        : rawVisibleKeys;

                      return (
                        <>
                          <style>{`
                            @keyframes campusJiggle {
                              0% { transform: rotate(-1deg); }
                              50% { transform: rotate(1deg); }
                              100% { transform: rotate(-1deg); }
                            }
                            .campus-jiggle-tile {
                              animation: campusJiggle 0.28s infinite ease-in-out;
                            }
                          `}</style>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Sliders size={15} style={{ color: '#34a853' }} />
                                <span>Campus Studio Module</span>
                              </span>

                              {/* 🔄 DEZENTER ZURÜCKSETZEN-KNOPF (sichtbar wenn Layout angepasst wurde) */}
                              {hasLayoutModifications && canCustomizeLayout && (
                                <button
                                  type="button"
                                  onClick={handleResetModuleLayout}
                                  style={{
                                    background: 'rgba(241, 245, 249, 0.85)',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '100px',
                                    padding: '3px 8px',
                                    fontSize: '0.68rem',
                                    fontWeight: 750,
                                    color: '#475569',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s ease'
                                  }}
                                  className="hover-scale-mini"
                                  title="Standard-Anordnung des aktuellen UI-Levels wiederherstellen"
                                >
                                  <RotateCcw size={11} color="#475569" strokeWidth={2.4} />
                                  <span>Zurücksetzen</span>
                                </button>
                              )}
                            </div>

                            {/* ✏️ EDIT-MODUS (JIGGLE) & 🎧 AUDIO-EINSTELLUNGEN BUTTONS */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {/* ⚙️ Dezent monochromes Einstellungs-Icon für Audio & Latenz */}
                              <button
                                type="button"
                                onClick={() => setShowAudioSettings(true)}
                                style={{
                                  background: '#f8fafc',
                                  color: '#475569',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '100px',
                                  padding: '3px 9px',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease'
                                }}
                                className="hover-scale-mini"
                                title="Audio-Latenz & Hardware-Synchronisation einstellen"
                                aria-label="Audio-Latenz & Hardware-Synchronisation einstellen"
                              >
                                <Settings size={11} strokeWidth={2.4} />
                                <span>Audio</span>
                              </button>

                              {canCustomizeLayout && (
                                <button
                                  type="button"
                                  onClick={() => setIsModuleEditMode(!isModuleEditMode)}
                                  style={{
                                    background: isModuleEditMode ? '#0f172a' : '#f8fafc',
                                    color: isModuleEditMode ? '#ffffff' : '#475569',
                                    border: `1px solid ${isModuleEditMode ? '#0f172a' : '#e2e8f0'}`,
                                    borderRadius: '100px',
                                    padding: '3px 10px',
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: isModuleEditMode ? '0 2px 6px rgba(15, 23, 42, 0.25)' : 'none',
                                    transition: 'all 0.18s ease'
                                  }}
                                  className="hover-scale-mini"
                                  title={isModuleEditMode ? 'Bearbeitungsmodus beenden' : 'Module sortieren oder ausblenden'}
                                >
                                  {isModuleEditMode ? (
                                    <>
                                      <Check size={12} strokeWidth={3} />
                                      <span>Fertig</span>
                                    </>
                                  ) : (
                                    <>
                                      <Edit3 size={12} strokeWidth={2.4} />
                                      <span>Anpassen</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 🧩 KACHEL-RASTER */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '14px 12px',
                            padding: '4px 0 12px 0'
                          }}>
                            {visibleModuleKeys.map((moduleKey) => {
                              const mod = moduleDefinitions[moduleKey];
                              if (!mod) return null;

                              const isGhosted = !isCampusActive ? (moduleKey !== 'protocol') : !mod.isUnlocked;
                              const isDraggingCurrent = draggedModuleKey === moduleKey;
                              const isLastOrphanBanner = !isModuleEditMode && visibleModuleKeys.length % 3 === 1 && moduleKey === visibleModuleKeys[visibleModuleKeys.length - 1];

                              if (isLastOrphanBanner) {
                                if (moduleKey === 'archive') {
                                  return (
                                    <div
                                      key={moduleKey}
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => {
                                        if (isModuleEditMode) return;
                                        mod.onClick();
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          if (!isModuleEditMode) mod.onClick();
                                        }
                                      }}
                                      style={{
                                        gridColumn: '1 / -1',
                                        background: isGhosted ? '#f8fafc' : '#f8fafc',
                                        border: '1.5px solid #e2e8f0',
                                        borderRadius: '14px',
                                        padding: '8px 14px',
                                        minHeight: '44px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        opacity: isGhosted ? 0.55 : 1,
                                        position: 'relative',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                                      }}
                                      className="hover-scale-mini"
                                      aria-label="Aufgabenheft-Verlauf öffnen"
                                      title="Frühere Wochen & Aufgabenheft-Archiv öffnen"
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                          width: '32px',
                                          height: '32px',
                                          borderRadius: '9px',
                                          background: mod.gradient,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          boxShadow: isGhosted ? 'none' : '0 2px 6px rgba(100, 116, 139, 0.25)',
                                          flexShrink: 0
                                        }}>
                                          <History size={16} color="#ffffff" strokeWidth={2.4} />
                                        </div>
                                        <div style={{ textAlign: 'left' }}>
                                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>Aufgabenheft-Verlauf</span>
                                            <span style={{ fontSize: '0.62rem', fontWeight: 750, color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: '100px', border: '1px solid #e2e8f0' }}>
                                              Archiv
                                            </span>
                                          </div>
                                          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b', marginTop: '1px' }}>
                                            Frühere Wochen, Notizen & Hausaufgaben-Historie
                                          </div>
                                        </div>
                                      </div>
                                      <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: '#ffffff',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '100px',
                                        padding: '4px 10px',
                                        fontSize: '0.70rem',
                                        fontWeight: 750,
                                        color: '#334155',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                      }}>
                                        <span>Öffnen</span>
                                        <span style={{ color: '#64748b' }}>➜</span>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={moduleKey}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => {
                                      if (isModuleEditMode) return;
                                      mod.onClick();
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        if (!isModuleEditMode) mod.onClick();
                                      }
                                    }}
                                    style={{
                                      gridColumn: '1 / -1',
                                      background: isGhosted ? '#f8fafc' : '#ffffff',
                                      border: mod.borderOverride || '1.5px solid #e2e8f0',
                                      borderRadius: '16px',
                                      padding: '10px 16px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      cursor: 'pointer',
                                      opacity: isGhosted ? 0.55 : 1,
                                      position: 'relative',
                                      boxShadow: isGhosted ? 'none' : '0 2px 8px -2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                                    }}
                                    className="hover-scale"
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '12px',
                                        background: mod.gradient,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: isGhosted ? 'none' : mod.boxShadow,
                                        flexShrink: 0
                                      }}>
                                        <div style={{ transform: 'scale(0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          {mod.icon}
                                        </div>
                                      </div>
                                      <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontSize: '0.90rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <span>{mod.title}</span>
                                          {mod.subtitle && (
                                            <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#64748b', background: '#f1f5f9', padding: '1px 7px', borderRadius: '100px' }}>
                                              {mod.subtitle}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      background: '#f8fafc',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: '100px',
                                      padding: '5px 12px',
                                      fontSize: '0.74rem',
                                      fontWeight: 800,
                                      color: '#0f172a',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                    }}>
                                      <span>Öffnen</span>
                                      <span style={{ color: '#64748b' }}>➜</span>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={moduleKey}
                                  draggable={isModuleEditMode && canCustomizeLayout}
                                  onDragStart={(e) => {
                                    if (!canCustomizeLayout) return;
                                    setDraggedModuleKey(moduleKey);
                                    e.dataTransfer.effectAllowed = 'move';
                                  }}
                                  onDragOver={(e) => {
                                    if (!canCustomizeLayout) return;
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                  }}
                                  onDrop={(e) => {
                                    if (!canCustomizeLayout) return;
                                    e.preventDefault();
                                    handleDropOnModule(moduleKey);
                                  }}
                                  onTouchStart={handleTouchStartTile}
                                  onTouchEnd={handleTouchCancelTile}
                                  onTouchMove={handleTouchCancelTile}
                                  onClick={() => {
                                    if (isModuleEditMode) return;
                                    mod.onClick();
                                  }}
                                  style={{
                                    background: isGhosted ? '#f8fafc' : '#ffffff',
                                    border: isDraggingCurrent ? '2px dashed #3b82f6' : (mod.borderOverride || '1.5px solid #e2e8f0'),
                                    borderRadius: '18px',
                                    padding: '16px 8px 14px 8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                    cursor: isModuleEditMode ? 'grab' : 'pointer',
                                    opacity: isDraggingCurrent ? 0.35 : (isGhosted ? 0.55 : 1),
                                    position: 'relative',
                                    boxShadow: isGhosted ? 'none' : '0 2px 8px -2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                                    transition: isModuleEditMode ? 'transform 0.15s ease' : 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                                  }}
                                  className={`${isModuleEditMode ? 'campus-jiggle-tile' : 'hover-scale'}`}
                                  title={isGhosted ? (!isCampusActive ? 'Im Basis-Status inaktiv – Klick für Lehrer-Demo-Modus' : `In ${uiLevel === 'junior' ? 'Junior' : 'Teen'} inaktiv – Klick für Lehrer-Demo-Modus`) : undefined}
                                >
                                  {/* ❌ AUSBLENDEN-BADGE IM EDIT-MODUS */}
                                  {isModuleEditMode && canCustomizeLayout && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleHideModule(moduleKey);
                                      }}
                                      style={{
                                        position: 'absolute',
                                        top: '-7px',
                                        left: '-7px',
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: '#ef4444',
                                        color: '#ffffff',
                                        border: '2px solid #ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)',
                                        zIndex: 40
                                      }}
                                      className="hover-scale"
                                      title="Modul von dieser Leiste ausblenden (kann über '+' wiederhergestellt werden)"
                                    >
                                      <X size={13} strokeWidth={3} />
                                    </button>
                                  )}

                                  {/* 🔒 BASIS-BADGE FÜR LEHRER-GHOSTING */}
                                  {isGhosted && !isModuleEditMode && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '8px',
                                      right: '8px',
                                      background: 'rgba(100, 116, 139, 0.12)',
                                      color: '#64748b',
                                      padding: '2px 6px',
                                      borderRadius: '6px',
                                      fontSize: '0.62rem',
                                      fontWeight: 800,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}>
                                      <Lock size={10} />
                                      <span>Basis</span>
                                    </div>
                                  )}

                                  <div style={{
                                    width: '72px',
                                    height: '72px',
                                    borderRadius: '18px',
                                    background: mod.gradient,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: isGhosted ? 'none' : mod.boxShadow
                                  }}>
                                    {mod.icon}
                                  </div>
                                  <div style={{ marginTop: '10px', padding: '0 2px' }}>
                                    <div style={{ fontSize: '0.90rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                                      {mod.title}
                                    </div>
                                    {mod.subtitle && (
                                      <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', marginTop: '3px' }}>
                                        {mod.subtitle}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {/* ➕ SCHÜLER- & ELTERN-FREISCHALTKACHEL (Im Lehrer-Modus nur bei ausgeblendeten Modulen oder im Edit-Modus aktiv) */}
                            {(hasHiddenModules || isModuleEditMode || (readOnly && (!isLoopstationUnlocked || !isArchiveUnlocked))) && (
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={handleOpenModuleUnlock}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleOpenModuleUnlock();
                                  }
                                }}
                                style={{
                                  background: 'rgba(248, 250, 252, 0.7)',
                                  border: '2px dashed #94a3b8',
                                  borderRadius: '18px',
                                  padding: '16px 8px 14px 8px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 8px -2px rgba(0,0,0,0.02)',
                                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                                }}
                                className="hover-scale"
                                title="Module hinzufügen oder Studio-Erweiterungen freischalten"
                                aria-label="Studio-Module verwalten"
                              >
                                <div style={{
                                  width: '72px',
                                  height: '72px',
                                  borderRadius: '18px',
                                  background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '1px solid rgba(255, 255, 255, 0.5)'
                                }}>
                                  <Plus size={34} color="#64748b" strokeWidth={2.3} />
                                </div>
                                <div style={{ marginTop: '10px', padding: '0 2px' }}>
                                  <div style={{ fontSize: '0.90rem', fontWeight: 900, color: '#334155', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                                    {hasHiddenModules ? 'Module verwalten' : 'Modul freischalten'}
                                  </div>
                                  <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                    {hasHiddenModules ? (
                                      <span>{customModuleLayout.hidden.length} ausgeblendet</span>
                                    ) : (
                                      <>
                                        <Lock size={10} />
                                        <span>Eltern-Freigabe</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 🔔 FLOATING TOAST NOTIFICATION */}
                          {moduleToast && (
                            <div style={{
                              position: 'fixed',
                              bottom: '28px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              background: '#0f172a',
                              color: '#ffffff',
                              padding: '9px 18px',
                              borderRadius: '100px',
                              fontSize: '0.80rem',
                              fontWeight: 750,
                              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4)',
                              zIndex: 9999,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '7px',
                              animation: 'fadeIn 0.2s ease'
                            }}>
                              <CheckCircle size={15} color="#34a853" strokeWidth={2.6} />
                              <span>{moduleToast}</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  /* ========================================================================= */
                  /* TAB 2: 📋 PROTOKOLL (Ausschließlich Lehrwerke & Songs)                    */
                  /* ========================================================================= */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} className="animation-fade-in">
                {/* 1. LEHRWERKE & ÜBUNGEN (Kompakt & minimalistisch, ca. 1/3) */}
                <div>
                  {/* Clean Apple-style Header Row with Quick-Add Action */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BookOpen size={16} style={{ color: '#34a853' }} />
                      <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#000', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                        Lehrwerke & Übungen
                      </h3>
                    </div>

                    {/* Kompakter Apple-Style Header Action Button */}
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => toggleAssignDropdown()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: '#f0fdf4',
                          border: '1.5px solid #bbf7d0',
                          color: '#15803d',
                          padding: '4px 10px',
                          borderRadius: '100px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        className="hover-scale"
                      >
                        <Plus size={12} strokeWidth={3} />
                        <span>Lehrwerk hinzufügen</span>
                      </button>

                      {effectiveShowAssignDropdown && (
                        <div style={{
                          position: 'absolute',
                          right: 0,
                          top: '32px',
                          background: 'white',
                          border: '1px solid #e8e8ed',
                          borderRadius: '18px',
                          boxShadow: '0 16px 36px rgba(0,0,0,0.16)',
                          zIndex: 100,
                          minWidth: '240px',
                          padding: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #f1f5f9', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Aus Mediathek wählen</span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleAssignDropdown(false); }}
                              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                          {(() => {
                            const availableBooks = (globalLehrwerke || [])
                              .filter(g => {
                                if (!g || !g.id) return false;
                                const isAssignedById = Boolean(g.id) && assignedLehrwerke.some(a => Boolean(a.lehrwerkId) && String(a.lehrwerkId) === String(g.id));
                                const isAssignedByTitle = Boolean(g.title?.trim()) && assignedLehrwerke.some(a => {
                                  const aTitle = (a.bookTitle || a.lehrwerkTitle || '').trim().toLowerCase();
                                  return aTitle.length > 0 && aTitle === (g.title || '').trim().toLowerCase();
                                });
                                return !isAssignedById && !isAssignedByTitle;
                              })
                              .filter((g, idx, arr) => arr.findIndex(x => (x.title || '').trim().toLowerCase() === (g.title || '').trim().toLowerCase()) === idx);

                            return (
                              <>
                                {availableBooks.map(g => (
                                  <button
                                    key={g.id}
                                    type="button"
                                    onClick={() => {
                                      handleAssignLehrwerk(g.id);
                                      toggleAssignDropdown(false);
                                    }}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      padding: '8px 10px',
                                      borderRadius: '10px',
                                      fontSize: '0.78rem',
                                      fontWeight: 700,
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                      color: '#000',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f3f3f6'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                  >
                                    {(() => {
                                      const bookColor = getLehrwerkColor(g.title);
                                      return (
                                        <div style={{
                                          width: '18px',
                                          height: '24px',
                                          background: `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})`,
                                          borderRadius: '3px',
                                          boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          flexShrink: 0
                                        }}>
                                          <BookOpen size={9} color={bookColor.text} />
                                        </div>
                                      );
                                    })()}
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.title}</span>
                                  </button>
                                ))}

                                {(!globalLehrwerke || globalLehrwerke.length === 0) ? (
                                  <span style={{ fontSize: '0.72rem', color: '#7d7d82', padding: '6px 8px', textAlign: 'center', fontStyle: 'italic' }}>
                                    Keine Lehrwerke in der Mediathek hinterlegt
                                  </span>
                                ) : availableBooks.length === 0 ? (
                                  <span style={{ fontSize: '0.72rem', color: '#7d7d82', padding: '6px 8px', textAlign: 'center', fontStyle: 'italic' }}>
                                    Alle Mediathek-Bücher zugewiesen
                                  </span>
                                ) : null}
                              </>
                            );
                          })()}
                          <div style={{ borderTop: '1px solid #e8e8ed', margin: '4px 0' }} />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCreateLehrwerkModal(true);
                              toggleAssignDropdown(false);
                            }}
                            style={{
                              border: 'none',
                              background: '#34a853',
                              color: 'white',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 6px rgba(52, 168, 83, 0.2)'
                            }}
                            className="hover-scale-mini"
                          >
                            <Plus size={14} /> Eigenes Lehrwerk neu anlegen
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {effectiveShowCreateLehrwerkModal && (
                    <form onSubmit={handleLocalCreateAndAssignLehrwerk} style={{
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '12px',
                      marginBottom: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
                    }} className="animation-slide-up">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <BookOpen size={13} style={{ color: '#34a853' }} />
                          <span>Eigenes Lehrwerk erstellen</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCreateLehrwerkModal(false)}
                          style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          placeholder="Buchtitel (z.B. Mein Gitarrenbuch 2026)..."
                          value={effectiveNewLehrwerkTitle}
                          onChange={(e) => setEffectiveNewLehrwerkTitle(e.target.value)}
                          style={{
                            flex: 2,
                            minWidth: '160px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            outline: 'none'
                          }}
                          autoFocus
                        />
                        <input
                          type="number"
                          placeholder="Seiten (z.B. 50)"
                          value={effectiveNewLehrwerkPages}
                          onChange={(e) => setEffectiveNewLehrwerkPages(e.target.value)}
                          style={{
                            width: '80px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            outline: 'none'
                          }}
                          min="1"
                          max="500"
                        />
                        <button
                          type="submit"
                          disabled={effectiveNewLehrwerkLoading || !effectiveNewLehrwerkTitle.trim()}
                          style={{
                            background: '#34a853',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            cursor: effectiveNewLehrwerkTitle.trim() ? 'pointer' : 'not-allowed',
                            opacity: effectiveNewLehrwerkTitle.trim() ? 1 : 0.6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {effectiveNewLehrwerkLoading ? 'Erstelle...' : 'Speichern & Aktivieren'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Horizontal Scroll-Container - Kompakt & Minimalistisch */}
                  <div 
                    className="custom-horizontal-scrollbar"
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: '10px',
                      overflowX: 'auto',
                      paddingBottom: '8px',
                      scrollSnapType: 'x mandatory',
                      WebkitOverflowScrolling: 'touch',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#cbd5e1 #f8fafc'
                    }}
                  >
                    {/* 1. Kompakte Quick-Add Card (nur als Empty-State, wenn noch kein Lehrwerk vorhanden) */}
                    {sortedAssignedLehrwerke.length === 0 && (
                      <div
                        onClick={() => toggleAssignDropdown()}
                        style={{
                          flex: '0 0 auto',
                          width: '140px',
                          scrollSnapAlign: 'start',
                          background: 'rgba(248, 250, 252, 0.7)',
                          borderRadius: '18px',
                          border: '1.5px dashed #cbd5e1',
                          padding: '12px 8px',
                          minHeight: '154px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          textAlign: 'center',
                          transition: 'all 0.2s',
                          boxSizing: 'border-box'
                        }}
                        className="hover-scale"
                      >
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#34a853',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                        }}>
                          <Plus size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.80rem', fontWeight: 900, color: '#0f172a' }}>Lehrwerk</div>
                          <div style={{ fontSize: '0.67rem', fontWeight: 700, color: '#64748b', marginTop: '1px' }}>+ Hinzufügen</div>
                        </div>
                      </div>
                    )}

                    {sortedAssignedLehrwerke.map(assigned => {
                      const book = globalLehrwerke.find(g => 
                        String(g.id) === String(assigned.lehrwerkId) || 
                        (g.title && (assigned.bookTitle || assigned.lehrwerkTitle) && g.title.toLowerCase().trim() === (assigned.bookTitle || assigned.lehrwerkTitle).toLowerCase().trim())
                      ) || {
                        title: assigned.bookTitle || assigned.lehrwerkTitle || 'Lehrwerk',
                        emoji: '📚',
                        totalPages: assigned.totalPages || 50
                      };
                      const bookColor = getLehrwerkColor(book.title);
                      const total = book.totalPages || 50;
                      const worked = Object.values(assigned.pageStates || {}).filter((p: any) => p.status === 'mastered').length;
                      const pct = Math.min(100, Math.round((worked / total) * 100));
                      const isSelected = activeLehrwerkId === assigned.lehrwerkId && activeSubView === 'lehrwerk';

                      return (
                        <div
                          key={assigned.lehrwerkId}
                          onClick={() => selectTextbookPage(assigned.lehrwerkId, activePageNumber || 1)}
                          role="button"
                          tabIndex={0}
                          aria-label={`Lehrwerk ${book.title}, ${total} Seiten, ${worked} gemeistert`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              selectTextbookPage(assigned.lehrwerkId, activePageNumber || 1);
                            }
                          }}
                          style={{
                            flex: '0 0 auto',
                            width: '136px',
                            scrollSnapAlign: 'start',
                            background: '#ffffff',
                            borderRadius: '18px',
                            border: isSelected ? '2px solid #34a853' : '1px solid #e8e8ed',
                            boxShadow: isSelected ? '0 6px 18px rgba(52, 168, 83, 0.16)' : '0 2px 8px rgba(0,0,0,0.03)',
                            padding: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '8px',
                            position: 'relative',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxSizing: 'border-box'
                          }}
                          className="hover-scale"
                        >
                          {/* Book Showcase Area with realistic 3D portrait book */}
                          <div style={{
                            width: '100%',
                            height: '96px',
                            background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                            borderRadius: '12px',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                          }}>
                            {/* Realistic Portrait Book */}
                            <div style={{
                              width: '58px',
                              height: '78px',
                              background: `linear-gradient(135deg, ${bookColor.from} 0%, ${bookColor.to} 100%)`,
                              borderRadius: '4px 7px 7px 4px',
                              boxShadow: '2px 4px 12px rgba(0,0,0,0.16), inset -1.5px 0 3px rgba(0,0,0,0.08)',
                              position: 'relative',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                              padding: '5px'
                            }}>
                              {/* Spine groove on left */}
                              <div style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: '5px',
                                background: 'rgba(0,0,0,0.18)',
                                borderRight: '1px solid rgba(255,255,255,0.25)',
                                borderRadius: '4px 0 0 4px'
                              }} />

                              {/* Realistic page edges on right */}
                              <div style={{
                                position: 'absolute',
                                right: '-2.5px',
                                top: '2.5px',
                                bottom: '2.5px',
                                width: '2.5px',
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '0 1.5px 1.5px 0'
                              }} />

                              {/* Book Icon Capsule */}
                              <div style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.25)',
                                backdropFilter: 'blur(4px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                              }}>
                                <BookOpen size={13} color={bookColor.text || '#ffffff'} />
                              </div>

                              {/* Mini Book Title on Cover */}
                              <span style={{
                                fontSize: '0.62rem',
                                fontWeight: 900,
                                color: '#ffffff',
                                textAlign: 'center',
                                lineHeight: 1.15,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textShadow: '0 1px 3px rgba(0,0,0,0.35)'
                              }}>
                                {book.title}
                              </span>
                            </div>

                            {/* Top-Right Pill: % gemeistert */}
                            <div style={{
                              position: 'absolute',
                              top: '5px',
                              right: '5px',
                              background: pct > 0 ? '#15803d' : 'rgba(15,23,42,0.65)',
                              backdropFilter: 'blur(6px)',
                              color: '#ffffff',
                              fontSize: '0.68rem',
                              fontWeight: 900,
                              padding: '2px 7px',
                              borderRadius: '100px',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                              zIndex: 5
                            }}>
                              {pct}%
                            </div>

                            {/* Delete Button top left if removable */}
                            {(!readOnly || assigned.lehrwerkId?.startsWith('custom-') || book.is_custom || assigned.isStudentCreated) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveLehrwerk(assigned.lehrwerkId, e);
                                }}
                                aria-label={`Lehrwerk ${book.title} entfernen`}
                                style={{
                                  position: 'absolute',
                                  top: '5px',
                                  left: '5px',
                                  background: 'rgba(255, 255, 255, 0.95)',
                                  border: 'none',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                                  transition: 'all 0.2s',
                                  zIndex: 10
                                }}
                                title="Lehrwerk entfernen"
                              >
                                <X size={13} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>

                          {/* Card Info Below */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <h4 style={{
                              margin: 0,
                              fontSize: '0.84rem',
                              fontWeight: 900,
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontFamily: "'Plus Jakarta Sans', sans-serif"
                            }}>
                              {book.title}
                            </h4>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: '#475569', fontWeight: 750 }}>
                              <span>{total} Seiten</span>
                              <span style={{ color: worked > 0 ? '#15803d' : '#64748b', fontWeight: 800 }}>
                                {worked > 0 ? `${worked} gemeistert` : '0 gemeistert'}
                              </span>
                            </div>

                            {/* Subtle Progress Bar */}
                            <div style={{ width: '100%', height: '3.5px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden', marginTop: '3px' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: '#34a853', transition: 'width 0.3s ease' }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', margin: '2px 0' }} />
                
                {/* 2. AKTIVE SONG-PROJEKTE (Nimmt ca. 2/3 des Raums ein, sortiert nach Fortschritt absteigend) */}
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  {/* Header Row mit Quick-Add Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Music size={16} style={{ color: '#000' }} />
                      <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#000', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                        Aktive Song-Projekte
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLocalShowCreateSongModal(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#f0fdf4',
                        border: '1.5px solid #bbf7d0',
                        color: '#15803d',
                        padding: '4px 10px',
                        borderRadius: '100px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-scale"
                      aria-label="Song aus Mediathek wählen oder anlegen"
                    >
                      <Plus size={12} strokeWidth={3} />
                      <span>Song hinzufügen</span>
                    </button>
                  </div>

                  {(() => {
                      const activeSongsRaw = (activeSongSkills || []).filter(skill =>
                        !skill.is_stage_ready && (skill.progress_percent || 0) < 100 && skill.status !== 'MASTERED'
                      );

                      // Deduplicate active songs so each unique song is only listed once
                      const uniqueActiveMap = new Map<string, any>();
                      activeSongsRaw.forEach(skill => {
                        const key = String(skill.song_id || skill.songs?.id || skill.songs?.title || skill.title || skill.id);
                        const existing = uniqueActiveMap.get(key);
                        if (!existing || (skill.progress_percent || 0) > (existing.progress_percent || 0)) {
                          uniqueActiveMap.set(key, skill);
                        }
                      });

                      // Sortierung: Höchster prozentualer Fortschritt oben, niedrigster unten
                      const activeSongs = Array.from(uniqueActiveMap.values()).sort((a, b) => {
                        const pA = a.is_stage_ready ? 100 : (a.progress_percent || 0);
                        const pB = b.is_stage_ready ? 100 : (b.progress_percent || 0);
                        if (pB !== pA) return pB - pA;
                        const titleA = (a.songs?.title || a.title || a.song_title || '').toLowerCase();
                        const titleB = (b.songs?.title || b.title || b.song_title || '').toLowerCase();
                        return titleA.localeCompare(titleB);
                      });

                      if (activeSongs.length === 0) {
                        const canCreate = true;
                        return (
                          <div
                            onClick={() => {
                              if (canCreate) setLocalShowCreateSongModal(true);
                            }}
                            role={canCreate ? 'button' : undefined}
                            tabIndex={canCreate ? 0 : undefined}
                            onKeyDown={canCreate ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setLocalShowCreateSongModal(true);
                              }
                            } : undefined}
                            aria-label={canCreate ? "Ersten Song aus Mediathek wählen oder anlegen" : "Noch kein aktives Song-Projekt"}
                            style={{
                              background: 'rgba(248, 250, 252, 0.7)',
                              borderRadius: '16px',
                              border: '2px dashed #cbd5e1',
                              padding: '20px 16px',
                              cursor: canCreate ? 'pointer' : 'default',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              textAlign: 'center',
                              transition: 'all 0.2s',
                              flex: 1
                            }}
                            className={canCreate ? "hover-scale" : undefined}
                          >
                            <div style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: '#ffffff',
                              border: '1.5px solid #e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: canCreate ? '#34a853' : '#94a3b8',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                            }}>
                              {canCreate ? <Plus size={16} strokeWidth={2.5} /> : <Music size={16} />}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.80rem', fontWeight: 900, color: '#0f172a' }}>Noch kein aktives Song-Projekt</div>
                              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>
                                {canCreate ? '+ Klicke hier, um deinen ersten Song aus der Mediathek zu wählen oder anzulegen' : 'Noch kein aktives Song-Projekt vorhanden.'}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          flex: 1,
                          overflowY: 'auto',
                          paddingRight: '2px'
                        }}>
                          {activeSongs.map(skill => {
                            const progress = skill.is_stage_ready ? 100 : (skill.progress_percent || 0);
                            const songTitle = skill.songs?.title || skill.title || skill.song_title || 'Unbenannter Song';
                            const songArtist = skill.songs?.artist || skill.artist || 'Song-Projekt';
                            const songColor = getSongColor(songTitle);
                            const isSelected = selectedActiveSongId === skill.id && activeSubView === 'song';

                            return (
                              <div
                                key={skill.id}
                                onClick={() => selectActiveSong(skill)}
                                role="button"
                                tabIndex={0}
                                aria-label={`Song ${songTitle} von ${songArtist}, ${progress}% Fortschritt`}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    selectActiveSong(skill);
                                  }
                                }}
                                style={{
                                  background: isSelected ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : '#ffffff',
                                  borderRadius: '14px',
                                  border: isSelected ? '1.5px solid #34a853' : '1px solid #e8e8ed',
                                  boxShadow: isSelected ? '0 4px 14px rgba(52, 168, 83, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                                  padding: '8px 12px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '12px',
                                  transition: 'all 0.16s ease'
                                }}
                                className="hover-scale"
                              >
                                {/* Left: Miniatur Cover & Typography */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                  {/* 34x34 Miniatur Vinyl/Album Icon */}
                                  <div style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '10px',
                                    background: `linear-gradient(135deg, ${songColor.from}, ${songColor.to})`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: songColor.text || '#ffffff',
                                    flexShrink: 0,
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                                  }}>
                                    <Music size={15} strokeWidth={2.4} />
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{
                                        fontSize: '0.86rem',
                                        fontWeight: 900,
                                        color: '#0f172a',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                      }}>
                                        {songTitle}
                                      </span>
                                      {skill.songs?.teacher_id || skill.created_by_teacher ? (
                                        <span style={{
                                          fontSize: '0.68rem',
                                          fontWeight: 850,
                                          color: '#15803d',
                                          background: '#dcfce7',
                                          padding: '2px 6px',
                                          borderRadius: '6px',
                                          flexShrink: 0
                                        }}>
                                          Lehrer
                                        </span>
                                      ) : null}
                                    </div>
                                    <span style={{
                                      fontSize: '0.74rem',
                                      color: '#475569',
                                      fontWeight: 650,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}>
                                      {songArtist}
                                    </span>
                                  </div>
                                </div>

                                {/* Right: Progress Pill & Delete Button */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                  {progressItems.some(item => isSongMatch(item, skill) && item.is_current_homework) && (
                                    <span style={{
                                      fontSize: '0.70rem',
                                      fontWeight: 850,
                                      color: '#9a3412',
                                      background: '#ffedd5',
                                      border: '1px solid #fed7aa',
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}>
                                      <Pin size={12} strokeWidth={2.4} />
                                      <span>Hausaufgabe</span>
                                    </span>
                                  )}

                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: progress >= 100 ? '#dcfce7' : '#f1f5f9',
                                    color: progress >= 100 ? '#15803d' : '#475569',
                                    padding: '3px 9px',
                                    borderRadius: '100px',
                                    fontSize: '0.72rem',
                                    fontWeight: 900,
                                    border: progress >= 100 ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
                                  }}>
                                    <span>{progress}%</span>
                                  </div>

                                  {!readOnly && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveSong(skill.id, e);
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                        padding: '3px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '50%'
                                      }}
                                      className="hover-scale"
                                      title="Song aus aktiven Projekten entfernen"
                                      aria-label={`${songTitle} aus aktiven Projekten entfernen`}
                                    >
                                      <X size={13} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                </div>

                {/* SaaS Enterprise+ Song Selection & Creation Modal (1% Goldstandard) */}
                {localShowCreateSongModal && (
                  <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.55)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                  }} onClick={() => setLocalShowCreateSongModal(false)}>
                    <div style={{
                      background: '#ffffff',
                      borderRadius: '24px',
                      boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(0,0,0,0.08)',
                      width: '100%',
                      maxWidth: '480px',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden'
                    }} onClick={(e) => e.stopPropagation()}>
                      
                      {/* Modal Header */}
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
                            background: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            color: '#0f172a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Music size={18} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>Song hinzufügen</h3>
                            <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>Aus der Mediathek wählen oder eigenen Song anlegen</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setLocalShowCreateSongModal(false)}
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
                          aria-label="Dialog schließen"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Segmented Control / Tabs */}
                      <div style={{ padding: '16px 24px 8px 24px' }}>
                        <div style={{
                          background: '#f1f5f9',
                          borderRadius: '14px',
                          padding: '4px',
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '4px'
                        }}>
                          <button
                            type="button"
                            onClick={() => setLocalSongModalTab('catalog')}
                            style={{
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              fontSize: '0.78rem',
                              fontWeight: 850,
                              cursor: 'pointer',
                              background: localSongModalTab === 'catalog' ? '#ffffff' : 'transparent',
                              color: localSongModalTab === 'catalog' ? '#0f172a' : '#64748b',
                              boxShadow: localSongModalTab === 'catalog' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            📚 Mediathek
                          </button>
                          <button
                            type="button"
                            onClick={() => setLocalSongModalTab('create')}
                            style={{
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              fontSize: '0.78rem',
                              fontWeight: 850,
                              cursor: 'pointer',
                              background: localSongModalTab === 'create' ? '#ffffff' : 'transparent',
                              color: localSongModalTab === 'create' ? '#0f172a' : '#64748b',
                              boxShadow: localSongModalTab === 'create' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            ✨ Neu erstellen
                          </button>
                        </div>
                      </div>

                      {/* Modal Body */}
                      <div style={{ padding: '12px 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {localSongModalTab === 'catalog' ? (
                          <>
                            <div style={{ position: 'relative' }}>
                              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                              <input
                                type="text"
                                placeholder="Song oder Künstler suchen..."
                                value={localSongSearch}
                                onChange={(e) => setLocalSongSearch(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '10px 14px 10px 36px',
                                  borderRadius: '12px',
                                  border: '1.5px solid #e2e8f0',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  outline: 'none',
                                  background: '#f8fafc',
                                  boxSizing: 'border-box'
                                }}
                                autoFocus
                              />
                            </div>

                            <div style={{
                              maxHeight: '260px',
                              overflowY: 'auto',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              paddingRight: '4px'
                            }}>
                              {(() => {
                                const assignedSongIds = new Set(
                                  (activeSongSkills || [])
                                    .map((sk: any) => sk.song_id || sk.songs?.id)
                                    .filter(Boolean)
                                );
                                const assignedSongTitles = new Set(
                                  (activeSongSkills || [])
                                    .map((sk: any) => (sk.songs?.title || sk.title || sk.song_title || '').toLowerCase().trim())
                                    .filter(Boolean)
                                );

                                const filtered = (songs || []).filter((s: any) => {
                                  const t = (s.title || '').toLowerCase().trim();
                                  if (t === 'test' || t === 'test - test' || t === 'test-test') return false;
                                  // Exclude songs already in the student's active projects / homework
                                  if (assignedSongIds.has(s.id)) return false;
                                  if (assignedSongTitles.has(t)) return false;

                                  if (!localSongSearch.trim()) return true;
                                  return (s.title || '').toLowerCase().includes(localSongSearch.toLowerCase()) || 
                                         (s.artist || '').toLowerCase().includes(localSongSearch.toLowerCase());
                                });

                                if (filtered.length === 0) {
                                  return (
                                    <div style={{ padding: '30px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                      <span>Kein passender Song in der Mediathek gefunden.</span>
                                      {localSongSearch.trim() && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setLocalNewSongTitle(localSongSearch.trim());
                                            setLocalSongModalTab('create');
                                          }}
                                          style={{
                                            background: '#e6f4ea',
                                            color: '#34a853',
                                            border: 'none',
                                            padding: '6px 14px',
                                            borderRadius: '10px',
                                            fontSize: '0.75rem',
                                            fontWeight: 850,
                                            cursor: 'pointer'
                                          }}
                                        >
                                          ✨ "{localSongSearch.trim()}" als neuen Song anlegen
                                        </button>
                                      )}
                                    </div>
                                  );
                                }

                                return filtered.map((song: any) => (
                                  <div
                                    key={song.id}
                                    onClick={async () => {
                                      await handleAssignSongFromCatalog(song.id);
                                      setLocalShowCreateSongModal(false);
                                      setLocalSongSearch('');
                                      setActiveSubView('hub');
                                    }}
                                    style={{
                                      padding: '10px 14px',
                                      borderRadius: '14px',
                                      border: '1.5px solid #f1f5f9',
                                      background: '#ffffff',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      transition: 'all 0.15s ease'
                                    }}
                                    className="hover-scale"
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        background: '#f1f5f9',
                                        border: '1px solid #e2e8f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#475569',
                                        flexShrink: 0
                                      }}>
                                        <Music size={15} strokeWidth={2.2} />
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 900, fontSize: '0.85rem', color: '#0f172a' }}>{song.title}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>{song.artist || 'Traditionell / Unbekannt'}</div>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      style={{
                                        background: '#34a853',
                                        color: 'white',
                                        border: 'none',
                                        padding: '6px 12px',
                                        borderRadius: '10px',
                                        fontSize: '0.72rem',
                                        fontWeight: 900,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      + Hinzufügen
                                    </button>
                                  </div>
                                ));
                              })()}
                            </div>
                          </>
                        ) : (
                          <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!localNewSongTitle.trim()) return;
                            await handleCreateAndAssignSong(localNewSongTitle, localNewSongArtist);
                            setLocalShowCreateSongModal(false);
                            setLocalNewSongTitle('');
                            setLocalNewSongArtist('');
                          }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155' }}>Songtitel</label>
                              <input
                                type="text"
                                placeholder="z. B. Wonderwall..."
                                value={localNewSongTitle}
                                onChange={(e) => setLocalNewSongTitle(e.target.value)}
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
                                required
                                autoFocus
                              />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155' }}>Künstler / Band</label>
                              <input
                                type="text"
                                placeholder="z. B. Oasis..."
                                value={localNewSongArtist}
                                onChange={(e) => setLocalNewSongArtist(e.target.value)}
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

                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              <button
                                type="button"
                                onClick={() => setLocalShowCreateSongModal(false)}
                                style={{
                                  flex: 1,
                                  background: '#f1f5f9',
                                  color: '#64748b',
                                  border: 'none',
                                  borderRadius: '12px',
                                  padding: '10px',
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                              >
                                Abbrechen
                              </button>
                              <button
                                type="submit"
                                style={{
                                  flex: 2,
                                  background: '#34a853',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '12px',
                                  padding: '10px',
                                  fontSize: '0.8rem',
                                  fontWeight: 900,
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 12px rgba(52, 168, 83, 0.25)'
                                }}
                              >
                                ✨ Song erstellen & zuweisen
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>{/* close inner scrollable div */}

          {/* Meisterwerke, Sticker-Album & Audio-Biografie Buttons - pinned at bottom (Trophy Dock) */}
                <div style={{
                  padding: isMobileOrSim ? '8px 10px calc(8px + env(safe-area-inset-bottom, 0px)) 10px' : '10px 16px 14px 16px',
                  display: 'flex',
                  gap: isMobileOrSim ? '6px' : '10px',
                  borderTop: '1px solid #f1f5f9',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  boxSizing: 'border-box',
                  width: '100%',
                  flexShrink: 0
                }}>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('logbook')}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      minHeight: isMobileOrSim ? '42px' : '44px',
                      padding: isMobileOrSim ? '8px 6px' : '10px 12px',
                      borderRadius: '14px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: isMobileOrSim ? '0.78rem' : '0.82rem',
                      letterSpacing: '-0.01em',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(99, 102, 241, 0.20)',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isMobileOrSim ? '5px' : '7px'
                    }}
                    className="hover-scale"
                    title={isMobileOrSim ? 'Meine Meisterwerke' : undefined}
                  >
                    <Award size={isMobileOrSim ? 15 : 16} strokeWidth={2.4} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isMobileOrSim 
                        ? (masteredPiecesCount > 0 ? `Meister (${masteredPiecesCount})` : 'Meisterwerke') 
                        : (masteredPiecesCount > 0 ? `Meine Meisterwerke (${masteredPiecesCount})` : 'Meine Meisterwerke')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveModalTab('stickeralbum'); setActiveSubView('hub'); }}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      minHeight: isMobileOrSim ? '42px' : '44px',
                      padding: isMobileOrSim ? '8px 6px' : '10px 12px',
                      borderRadius: '14px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: isMobileOrSim ? '0.78rem' : '0.82rem',
                      letterSpacing: '-0.01em',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(217, 119, 6, 0.20)',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isMobileOrSim ? '5px' : '7px'
                    }}
                    className="hover-scale"
                    title={isMobileOrSim ? (uiLevel === 'junior' ? 'Sticker-Album' : uiLevel === 'teen' ? 'Badges & Trophäen' : 'Meilensteine') : undefined}
                  >
                    <Star size={isMobileOrSim ? 15 : 16} fill="#fff" />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isMobileOrSim 
                        ? (uiLevel === 'junior' ? 'Sticker' : uiLevel === 'teen' ? 'Trophäen' : 'Meilensteine')
                        : (uiLevel === 'junior' ? 'Sticker-Album' : uiLevel === 'teen' ? 'Badges & Trophäen' : 'Meilensteine')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveModalTab('audiobiography'); setActiveSubView('hub'); }}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      minHeight: isMobileOrSim ? '42px' : '44px',
                      padding: isMobileOrSim ? '8px 6px' : '10px 12px',
                      borderRadius: '14px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: isMobileOrSim ? '0.78rem' : '0.82rem',
                      letterSpacing: '-0.01em',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.20)',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isMobileOrSim ? '5px' : '7px'
                    }}
                    className="hover-scale"
                    title={isMobileOrSim ? 'Audio-Biografie (Tresor)' : undefined}
                  >
                    <Disc size={isMobileOrSim ? 15 : 16} strokeWidth={2.4} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isMobileOrSim ? 'Biografie' : 'Audio-Biografie'}
                    </span>
                  </button>
                </div>
              </>
        )}
      </div>

        {useNotebookLayout && !isMobileView && (
          <div style={{
            width: '6px',
            background: '#18181b',
            position: 'relative',
            zIndex: 30,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '20px 0',
            alignSelf: 'stretch'
          }}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  width: '40px',
                  height: '4px',
                  borderRadius: '2px',
                  background: 'linear-gradient(180deg, #ffd54f 0%, #ff9100 100%)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                  zIndex: 35,
                  position: 'absolute',
                  left: '-17px'
                }} />
              </div>
            ))}
          </div>
        )}

        {/* COLUMN 3: ✍️ DOKUMENTATION & HAUSAUFGABE (62%) */}
          
          <div style={{
            flex: isMobileView ? 'none' : '0 0 55%',
            width: isMobileView ? '100%' : '55%',
            maxWidth: isMobileView ? '100%' : '55%',
            minWidth: 0,
            overflowX: isMobileView ? 'clip' : 'visible',
            margin: '0',
            height: isMobileView ? 'auto' : '100%',
            minHeight: '0',
            maxHeight: isMobileView ? 'none' : '100%',
            padding: isMobileView ? '8px 4px var(--mobile-scroll-clearance-bottom, calc(96px + env(safe-area-inset-bottom, 20px))) 4px' : '0px',
            overflowY: isMobileView ? 'visible' : 'hidden',
            display: isMobileView ? (mobileProtokollTab === 'homework' ? 'flex' : 'none') : 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: 0,
            background: '#ffffff',
            backgroundImage: useNotebookLayout ? 'repeating-linear-gradient(white, white 27px, #e5e0d4 27px, #e5e0d4 28px)' : 'none',
            borderLeft: useNotebookLayout ? 'none' : '1px solid #f1f5f9',
            borderRadius: '0',
            boxShadow: 'none',
            position: 'relative',
            boxSizing: 'border-box'
          }}>
            {useNotebookLayout && !isMobileView && (
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

            {/* Inner scrollable area for Column 3 */}
            <div style={{
              flex: 1,
              minHeight: 0,
              height: isMobileView ? 'auto' : '100%',
              overflowY: isMobileView ? 'visible' : (activeSubView === 'hub' ? 'hidden' : 'auto'),
              padding: isMobileView ? '0' : (useNotebookLayout ? '20px 20px 20px 60px' : '16px 20px 16px 20px'),
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxSizing: 'border-box'
            }}>

            {activeSubView === 'history' ? (
              (() => {
                if (!selectedHistoryWeek) {
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: '0.86rem', fontStyle: 'italic' }}>
                      Wähle links eine Unterrichtswoche aus.
                    </div>
                  );
                }

                const weekNum = selectedHistoryWeek.split('-W')[1] || '';
                const weekItems = progressItems.filter(item => 
                  item.updated_at && getItemWeek(item) === selectedHistoryWeek
                );

                // Group page numbers by book title
                const groupedLehrwerke: Record<string, { pages: number[] }> = {};
                const otherHWs: any[] = [];
                const allActive = weekItems.filter(item => 
                  (item.is_current_homework || item.status === 'THEORY_DONE') && 
                  !item.topic_name.startsWith('Hausaufgabe KW ')
                );

                allActive.forEach(item => {
                  if (item.topic_name.includes(' - Seite ')) {
                    const parts = item.topic_name.split(' - Seite ');
                    const bookTitle = parts[0].trim();
                    const pageNum = parseInt(parts[1], 10);
                    if (!groupedLehrwerke[bookTitle]) {
                      groupedLehrwerke[bookTitle] = { pages: [] };
                    }
                    if (!isNaN(pageNum) && !groupedLehrwerke[bookTitle].pages.includes(pageNum)) {
                      groupedLehrwerke[bookTitle].pages.push(pageNum);
                    }
                  } else {
                    otherHWs.push(item);
                  }
                });

                // 📦 Snapshot Fallback & Hydration for archived weeks (e.g. KW 36)
                const snapshotItem = weekItems.find(item => item.topic_name?.startsWith('Hausaufgabe KW '));
                if (snapshotItem && snapshotItem.homework_notes) {
                  let parsedNotes: any[] = [];
                  try {
                    const raw = typeof snapshotItem.homework_notes === 'string'
                      ? JSON.parse(snapshotItem.homework_notes)
                      : snapshotItem.homework_notes;
                    if (Array.isArray(raw)) parsedNotes = raw;
                  } catch (e) {
                    console.warn('Error parsing snapshot notes:', e);
                  }

                  // 1. Lehrwerke aus SNAPSHOT_LEHRWERKE hydrieren
                  const snapLwEntry = parsedNotes.find((n: any) => typeof n === 'string' && n.startsWith('SNAPSHOT_LEHRWERKE:'));
                  if (snapLwEntry) {
                    try {
                      const rawJson = snapLwEntry.substring('SNAPSHOT_LEHRWERKE:'.length);
                      const parsedLw = JSON.parse(rawJson);
                      if (Array.isArray(parsedLw)) {
                        parsedLw.forEach((lw: { title: string; pages: number[]; notes?: any }) => {
                          if (!groupedLehrwerke[lw.title]) {
                            groupedLehrwerke[lw.title] = { pages: [] };
                          }
                          if (Array.isArray(lw.pages)) {
                            lw.pages.forEach(p => {
                              if (!groupedLehrwerke[lw.title].pages.includes(p)) {
                                groupedLehrwerke[lw.title].pages.push(p);
                              }
                            });
                          }
                        });
                      }
                    } catch (e) {
                      console.warn('Error hydrating SNAPSHOT_LEHRWERKE:', e);
                    }
                  }

                  // 2. Songs aus SNAPSHOT_SONGS hydrieren
                  const snapSongEntry = parsedNotes.find((n: any) => typeof n === 'string' && n.startsWith('SNAPSHOT_SONGS:'));
                  if (snapSongEntry) {
                    try {
                      const rawJson = snapSongEntry.substring('SNAPSHOT_SONGS:'.length);
                      const parsedSongs = JSON.parse(rawJson);
                      if (Array.isArray(parsedSongs)) {
                        parsedSongs.forEach((song: any) => {
                          if (!otherHWs.some(existing => areSongsIdentical(existing, song))) {
                            otherHWs.push(song);
                          }
                        });
                      }
                    } catch (e) {
                      console.warn('Error hydrating SNAPSHOT_SONGS:', e);
                    }
                  }
                }

                // Sort pages for each textbook in ascending order
                Object.keys(groupedLehrwerke).forEach(title => {
                  groupedLehrwerke[title].pages.sort((a, b) => a - b);
                });

                // Extract unique clean homework notes & student questions
                const uniqueHomeworkNotes: string[] = [];
                const studentQuestions: Array<{ timestamp?: string; question: string }> = [];

                weekItems.forEach(item => {
                  if (item.homework_notes && item.homework_notes.trim() !== '') {
                    let noteLines: string[] = [];
                    try {
                      const parsed = JSON.parse(item.homework_notes);
                      if (Array.isArray(parsed)) {
                        parsed.forEach((n: any) => {
                          if (typeof n === 'string') noteLines.push(n);
                        });
                      } else if (typeof parsed === 'string') {
                        noteLines = parsed.split('\n');
                      }
                    } catch {
                      noteLines = item.homework_notes.split('\n');
                    }

                    noteLines.forEach(line => {
                      const trimmed = line.trim();
                      if (!trimmed) return;

                      // Extract student questions (STUDENT_QUESTION:timestamp|question)
                      if (trimmed.startsWith('STUDENT_QUESTION:')) {
                        const payload = trimmed.substring('STUDENT_QUESTION:'.length).trim();
                        if (payload.includes('|')) {
                          const [ts, q] = payload.split('|');
                          if (q && q.trim()) {
                            studentQuestions.push({ timestamp: ts.trim(), question: q.trim() });
                          }
                        } else {
                          studentQuestions.push({ question: payload });
                        }
                        return;
                      }

                      // Guard: Filter out all internal metadata strings (SNAPSHOT_*, LATENCY:*, AUDIO:*, etc.)
                      if (isInternalMetadataNote(trimmed)) {
                        return;
                      }

                      const cleaned = trimmed.replace(/^[•\-\*\s]+/, '').trim();
                      if (cleaned && !uniqueHomeworkNotes.includes(cleaned)) {
                        uniqueHomeworkNotes.push(cleaned);
                      }
                    });
                  }
                });

                // Extract clean teacher notes
                const weekTeacherNotes = weekItems
                  .map(item => item.teacher_notes)
                  .filter(n => n && n.trim() !== '' && !isInternalMetadataNote(n))
                  .map(n => cleanNotesText(n))
                  .filter(Boolean)
                  .join('\n\n');

                const selectedDateRangeStr = getWeekDateRange(selectedHistoryWeek);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease', height: '100%' }}>
                    <div>
                      <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Calendar size={15} style={{ color: '#34a853', verticalAlign: 'middle', marginTop: '-2px' }} /> Details KW {weekNum} {selectedDateRangeStr ? `(${selectedDateRangeStr})` : ''}</span>
                      </span>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: '#71717a', fontWeight: 550, lineHeight: '1.3' }}>
                        Hausaufgaben und Notizen aus dieser Woche (Schreibgeschützt).
                      </p>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>
                      {/* Active Homework Items Box */}
                      <div style={{
                        background: '#fffbeb',
                        border: '1px solid #fef08a',
                        borderRadius: '16px',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                      }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#18181b' }}>
                          Hausaufgaben KW {weekNum}
                        </span>

                        {Object.keys(groupedLehrwerke).length === 0 && otherHWs.length === 0 ? (
                          <span style={{ fontSize: '0.80rem', color: '#71717a', fontStyle: 'italic' }}>
                            Keine Hausaufgaben erfasst.
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {Object.entries(groupedLehrwerke).map(([title, info]) => (
                              <div key={title} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ 
                                  fontSize: '0.96rem', 
                                  color: '#09090b', 
                                  fontWeight: 900,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  {(() => {
                                    const bookColor = getLehrwerkColor(title);
                                    return (
                                      <div style={{
                                        width: '16px',
                                        height: '20px',
                                        background: `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})`,
                                        borderRadius: '3px',
                                        border: 'none',
                                        position: 'relative',
                                        flexShrink: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}>
                                        <BookOpen size={9} color={bookColor.text} />
                                        <div style={{
                                          position: 'absolute',
                                          left: 0,
                                          top: 0,
                                          bottom: 0,
                                          width: '2px',
                                          background: 'rgba(0,0,0,0.08)',
                                          borderRight: '1px solid rgba(255,255,255,0.05)'
                                        }} />
                                      </div>
                                    );
                                  })()}
                                  <span>{title}</span> · <span style={{ color: '#4b5563', fontWeight: 700 }}>S. {info.pages.join(', ')}</span>
                                </div>
                                {(() => {
                                  const bookObj = globalLehrwerke.find(b => b.title === title);
                                  const assignedBook = bookObj ? assignedLehrwerke.find(a => a.lehrwerkId === bookObj.id) : null;
                                  if (!assignedBook) return null;
                                  
                                  const pagesWithNotes = info.pages.filter((p: number) => {
                                    const pState = assignedBook.pageStates?.[p];
                                    if (pState && getCleanPageNotes(pState.homeworkNotes || pState.homework_notes) !== '') return true;
                                    
                                    const dbItem = weekItems.find(x => x.topic_name === `${title} - Seite ${p}`);
                                    if (dbItem && getCleanPageNotes(dbItem.homework_notes) !== '') return true;
                                    return false;
                                  });
                                  
                                  if (pagesWithNotes.length === 0) return null;
                                  
                                  return (
                                    <div style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '4px',
                                      padding: '8px 12px',
                                      background: '#ffffff',
                                      border: '1px solid rgba(251, 191, 36, 0.15)',
                                      borderRadius: '12px',
                                      marginTop: '6px',
                                      marginLeft: '22px',
                                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                                    }}>
                                      {pagesWithNotes.map((p: number) => {
                                        const pState = assignedBook.pageStates?.[p];
                                        let noteText = getCleanPageNotes(pState?.homeworkNotes || pState?.homework_notes);
                                        
                                        if (!noteText) {
                                          const dbItem = weekItems.find(x => x.topic_name === `${title} - Seite ${p}`);
                                          if (dbItem?.homework_notes) {
                                            noteText = getCleanPageNotes(dbItem.homework_notes);
                                          }
                                        }
                                        
                                        return (
                                          <div key={`p-note-${p}`} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', fontSize: '0.88rem', color: '#1e293b', lineHeight: 1.5 }}>
                                            <span style={{ fontWeight: 800, color: '#b45309', flexShrink: 0 }}>S. {p}:</span>
                                            <span style={{ fontWeight: 650, color: '#1e293b' }}>{noteText}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </div>
                            ))}
                            {(() => {
                              const dedupedHWs = otherHWs.reduce<any[]>((acc, cur) => {
                                if (!acc.some(existing => areSongsIdentical(existing, cur))) {
                                  acc.push(cur);
                                }
                                return acc;
                              }, []);
                              if (dedupedHWs.length === 0) return null;
                              return (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '1px solid rgba(251, 191, 36, 0.2)', paddingTop: '8px' }}>
                                  {dedupedHWs.map((item, idx) => (
                                    <div key={idx} style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      background: '#ffffff',
                                      color: '#475569',
                                      padding: '4px 10px',
                                      borderRadius: '999px',
                                      fontSize: '0.82rem',
                                      fontWeight: 900,
                                      border: '1px solid rgba(251, 191, 36, 0.3)',
                                      boxShadow: '0 3px 8px rgba(0,0,0,0.03), 0 0 12px rgba(251, 191, 36, 0.32)'
                                    }}>
                                      <span>🎵 {item.topic_name}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Homework notes */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e293b' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><FileText size={15} style={{ color: '#34a853', verticalAlign: 'middle', marginTop: '-2px' }} /> Hausaufgaben-Bemerkungen</span>
                        </label>
                        <div style={{
                          width: '100%', minHeight: '80px', padding: '12px 14px', borderRadius: '16px',
                          border: '1px solid #e2e8f0', fontSize: '0.88rem', fontWeight: 550, lineHeight: 1.5, background: '#fafafa', color: '#0f172a',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {uniqueHomeworkNotes.length > 0 ? uniqueHomeworkNotes.join('\n\n') : 'Keine Bemerkungen hinterlegt.'}
                        </div>
                      </div>

                      {/* Student question(s) */}
                      {studentQuestions.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e40af' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <HelpCircle size={15} style={{ color: '#2563eb', verticalAlign: 'middle', marginTop: '-2px' }} />
                              Frage für den Unterricht
                            </span>
                          </label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {studentQuestions.map((sq, idx) => {
                              const formattedDate = (() => {
                                if (!sq.timestamp) return null;
                                try {
                                  const d = new Date(sq.timestamp);
                                  return isNaN(d.getTime()) ? null : d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                                } catch {
                                  return null;
                                }
                              })();

                              return (
                                <div
                                  key={idx}
                                  style={{
                                    padding: '12px 14px',
                                    background: '#eff6ff',
                                    borderRadius: '16px',
                                    border: '1px solid #bfdbfe',
                                    fontSize: '0.88rem',
                                    fontWeight: 550,
                                    lineHeight: 1.5,
                                    color: '#1e3a8a',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                  }}
                                >
                                  {formattedDate && (
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6' }}>
                                      {formattedDate} Uhr
                                    </div>
                                  )}
                                  <div style={{ fontWeight: 600 }}>{sq.question}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Internal teacher notes */}
                      {!readOnly && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Lock size={13} strokeWidth={2} style={{ color: '#64748b' }} />
                            <span>Interne Notiz (nur für Lehrer)</span>
                          </label>
                          <div style={{
                            width: '100%', minHeight: '60px', padding: '12px 14px', borderRadius: '16px',
                            border: '1px solid #e2e8f0', fontSize: '0.88rem', fontWeight: 550, lineHeight: 1.5, background: '#fafafa', color: '#0f172a',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {weekTeacherNotes || 'Keine internen Notizen.'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : activeSubView === 'lehrwerk' && activeLehrwerkId ? (
              // textbook detail notebook view
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '16px', flexWrap: 'wrap' }}>
                  {(() => {
                    const activeBookAssigned = assignedLehrwerke.find(a => a.lehrwerkId === activeLehrwerkId);
                    const currentPageState = activeBookAssigned?.pageStates?.[activePageNumber || -1];
                    const isCurrentPageStudentFocused = Boolean(currentPageState?.studentFocus);
                    const isStudentCreated = Boolean(activeBookAssigned?.isStudentCreated || activeBookAssigned?.createdByRole === 'student');
                    const isStudentViewingTeacherBook = Boolean(readOnly && !isStudentCreated);

                    const isPageHomework = Boolean(isCurrentHomework || currentPageState?.isCurrentHomework || currentPageState?.status === 'homework' || status === 'homework');
                    const isPageMastered = Boolean(status === 'MASTERED' || status === 'mastered' || currentPageState?.status === 'mastered');

                    return (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: isPageMastered ? '#22c55e' : (isPageHomework ? '#facc15' : '#cbd5e1'),
                            border: '1.5px solid rgba(0,0,0,0.1)',
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                            flexShrink: 0
                          }} />
                          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                            {activePageNumber ? `Seite ${activePageNumber}` : 'Keine Seite ausgewählt'}
                          </h3>
                          {isCurrentPageStudentFocused && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: '#6d28d9',
                              background: '#f5f3ff',
                              border: '1.5px solid #c4b5fd',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              boxShadow: '0 1px 3px rgba(109, 40, 217, 0.1)'
                            }}>
                              <Target size={12} strokeWidth={2.2} style={{ color: '#6d28d9', flexShrink: 0 }} />
                              <span>{readOnly ? 'Mein Fokus (Max. 3)' : 'Schüler-Übefokus (Max. 3)'}</span>
                            </span>
                          )}
                        </div>

                        {/* Right side controls: Teacher color buttons (student focus is controlled via left-hand palette brush) */}
                        {!(readOnly || isStudentViewingTeacherBook) && (
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                            {[
                              { mode: 'LOCKED', color: '#e2e8f0', label: 'Grau (offen)', getActive: () => status === 'IN_PROGRESS' && !isCurrentHomework, action: () => { setStatus('IN_PROGRESS'); setIsCurrentHomework(false); setHasChanges(true); if (activeLehrwerkId && activePageNumber) triggerDirectSave(activeLehrwerkId, activePageNumber, 'IN_PROGRESS', false); } },
                              { mode: 'HOMEWORK', color: '#fde047', label: 'Gelb (Hausaufgabe)', getActive: () => status === 'IN_PROGRESS' && isCurrentHomework, action: () => { setStatus('IN_PROGRESS'); setIsCurrentHomework(true); setHasChanges(true); if (activeLehrwerkId && activePageNumber) triggerDirectSave(activeLehrwerkId, activePageNumber, 'IN_PROGRESS', true); } },
                              { mode: 'MASTERED', color: '#86efac', label: 'Grün (erledigt)', getActive: () => status === 'MASTERED', action: () => { setStatus('MASTERED'); setIsCurrentHomework(false); setHasChanges(true); if (activeLehrwerkId && activePageNumber) triggerDirectSave(activeLehrwerkId, activePageNumber, 'MASTERED', false); } }
                            ].map(b => {
                              const isActive = b.getActive();
                              return (
                                <button
                                  key={b.mode}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    b.action();
                                  }}
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    background: b.color,
                                    border: isActive ? '3px solid #0f172a' : '1.5px solid rgba(0,0,0,0.18)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    transform: isActive ? 'scale(1.25)' : 'scale(1)',
                                    outline: 'none',
                                    boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.06)'
                                  }}
                                  title={b.label}
                                />
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* 🎯 2027 INTELLIGENTE ÜBUNGS-CHIPS & METRONOM MISSION STRIP (100% NUTZEN) */}
                {(() => {
                  const activeBookAssigned = assignedLehrwerke.find(a => a.lehrwerkId === activeLehrwerkId);
                  const isStudentCreated = Boolean(activeBookAssigned?.isStudentCreated || activeBookAssigned?.createdByRole === 'student');
                  const isStudentViewingTeacherBook = Boolean(readOnly && !isStudentCreated);
                  const currentPageState = activeBookAssigned?.pageStates?.[activePageNumber || -1];
                  const currentExercises: LehrwerkExercise[] = currentPageState?.exercises || [];
                  const selectedEx = currentExercises.find(e => e.id === selectedExerciseId);
                  const detectedFromNotes = parseExercisesFromNotes(pageHomeworkNotes);

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Live Continuous Metronome Bar */}
                      {activeMetronomeBpm && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 14px',
                          background: 'linear-gradient(90deg, #fef9c3 0%, #fef08a 100%)',
                          border: '1.5px solid #eab308',
                          borderRadius: '14px',
                          boxShadow: '0 2px 8px rgba(234, 179, 8, 0.2)',
                          animation: 'pulse 2s infinite'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', fontWeight: 800, color: '#854d0e' }}>
                            <Clock size={16} strokeWidth={2.2} style={{ color: '#854d0e', flexShrink: 0 }} />
                            <span>Metronom läuft kontinuierlich: <strong>{activeMetronomeBpm} BPM</strong></span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleContinuousMetronome(activeMetronomeBpm)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '5px 12px',
                              borderRadius: '8px',
                              background: '#854d0e',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                            className="tactile-btn"
                          >
                            <Square size={12} fill="#ffffff" /> Stoppen
                          </button>
                        </div>
                      )}

                      {/* Exercise Chip Strip */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                        padding: '8px 12px',
                        background: '#f8fafc',
                        borderRadius: '16px',
                        border: '1.5px solid #e2e8f0'
                      }}>
                        {/* Chip 1: Ganze Seite */}
                        <button
                          type="button"
                          onClick={() => setSelectedExerciseId(null)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 12px',
                            borderRadius: '10px',
                            background: selectedExerciseId === null ? '#0f172a' : '#ffffff',
                            color: selectedExerciseId === null ? '#ffffff' : '#475569',
                            border: selectedExerciseId === null ? '1.5px solid #0f172a' : '1.5px solid #cbd5e1',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          className="tactile-btn"
                        >
                          <span>Ganze Seite</span>
                        </button>

                        {/* 0.1% Goldstandard Clean Exercise Chips */}
                        {currentExercises.map((ex) => {
                          const isSelected = selectedExerciseId === ex.id;
                          const isMastered = ex.status === 'mastered';
                          const isMetronomeActiveForEx = ex.targetBpm && activeMetronomeBpm === ex.targetBpm;
                          const cleanLabel = ex.label.replace(/[✓✔]/g, '').trim();
                          // Canonical standard is "Nr. X" (cleanly maps legacy "Üb. X" and "Eigene Üb. X")
                          const displayLabel = cleanLabel.replace(/^(?:Eigene\s*Üb\.|Üb\.|Übung)\s*/i, 'Nr. ');
                          const canDeleteEx = true;

                          return (
                            <div
                              key={ex.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 8px 4px 10px',
                                borderRadius: '10px',
                                background: isSelected
                                  ? (isMastered ? '#dcfce7' : '#fef9c3')
                                  : (isMastered ? '#f0fdf4' : '#ffffff'),
                                border: isSelected
                                  ? (isMastered ? '1.5px solid #16a34a' : '1.5px solid #ca8a04')
                                  : (isMastered ? '1.5px solid #86efac' : '1.5px solid #cbd5e1'),
                                color: isMastered ? '#166534' : '#0f172a',
                                fontWeight: 800,
                                fontSize: '0.78rem',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {/* 1-Tap Checkmark Ring: Minimalist status toggle */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updated = currentExercises.map(item =>
                                    item.id === ex.id
                                      ? { ...item, status: item.status === 'mastered' ? ('homework' as const) : ('mastered' as const) }
                                      : item
                                  );
                                  updateExercisesForCurrentPage(updated);
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  background: isMastered ? '#16a34a' : '#f8fafc',
                                  color: isMastered ? '#ffffff' : '#94a3b8',
                                  border: isMastered ? 'none' : '1.5px solid #cbd5e1',
                                  cursor: 'pointer',
                                  padding: 0,
                                  transition: 'all 0.15s ease'
                                }}
                                title={isMastered ? 'Als noch zu üben markieren' : 'Als erledigt markieren'}
                                aria-label={isMastered ? 'Als noch zu üben markieren' : 'Als erledigt markieren'}
                              >
                                {isMastered && <Check size={11} strokeWidth={3} />}
                              </button>

                              {/* Clean Exercise Label (No distracting target icon) */}
                              <button
                                type="button"
                                onClick={() => setSelectedExerciseId(isSelected ? null : ex.id)}
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  const custom = window.prompt('Übungsbezeichnung anpassen (z. B. Nr. 1, Groove 1, 1). Leer lassen zum Löschen:', displayLabel);
                                  if (custom !== null) {
                                    const trimmed = custom.trim();
                                    if (!trimmed) {
                                      // Empty input -> delete exercise!
                                      const updated = currentExercises.filter(item => item.id !== ex.id);
                                      updateExercisesForCurrentPage(updated);
                                      if (selectedExerciseId === ex.id) setSelectedExerciseId(null);
                                    } else {
                                      const prefixMatch = trimmed.match(/^([^\d]*)(\d+)/);
                                      if (prefixMatch) {
                                        const newPrefix = prefixMatch[1];
                                        updateBookExercisePrefix(newPrefix);
                                      }
                                      const updated = currentExercises.map(item =>
                                        item.id === ex.id ? { ...item, label: trimmed } : item
                                      );
                                      updateExercisesForCurrentPage(updated);
                                    }
                                  }
                                }}
                                title={`${displayLabel} • Doppelklick zum Umbenennen (oder Leer lassen zum Löschen)`}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'inherit',
                                  fontWeight: 'inherit',
                                  fontSize: 'inherit',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: 0
                                }}
                              >
                                <span>{displayLabel}</span>
                              </button>

                              {/* 1-Tap BPM Metronome Trigger (only if target BPM exists) */}
                              {ex.targetBpm && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleContinuousMetronome(ex.targetBpm!);
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '2px 5px',
                                    borderRadius: '6px',
                                    background: isMetronomeActiveForEx ? '#0f172a' : '#f8fafc',
                                    color: isMetronomeActiveForEx ? '#ffffff' : '#0f172a',
                                    border: isMetronomeActiveForEx ? '1px solid #0f172a' : '1px solid #cbd5e1',
                                    fontSize: '0.68rem',
                                    fontWeight: 900,
                                    cursor: 'pointer'
                                  }}
                                  title={`Metronom ${ex.targetBpm} BPM`}
                                  aria-label={`Metronom ${ex.targetBpm} BPM`}
                                >
                                  {isMetronomeActiveForEx ? <Square size={9} fill="#ffffff" /> : <Play size={9} fill="#0f172a" />}
                                  <span>{ex.targetBpm}</span>
                                </button>
                              )}

                              {/* Delete button: Permanently visible (User Requirement & 0.1% Goldstandard) */}
                              {canDeleteEx && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const updated = currentExercises.filter(item => item.id !== ex.id);
                                    updateExercisesForCurrentPage(updated);
                                    if (selectedExerciseId === ex.id) setSelectedExerciseId(null);
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    background: isSelected ? 'rgba(0,0,0,0.06)' : '#f1f5f9',
                                    color: '#475569',
                                    border: '1px solid #cbd5e1',
                                    cursor: 'pointer',
                                    padding: 0,
                                    marginLeft: '3px',
                                    transition: 'all 0.15s ease'
                                  }}
                                  title="Übung entfernen"
                                  aria-label="Übung entfernen"
                                  className="tactile-btn hover-scale-mini"
                                >
                                  <X size={11} strokeWidth={2.5} />
                                </button>
                              )}
                            </div>
                          );
                        })}

                        {/* 0.1% Goldstandard Placeholder Button to Add Exercise Numbers */}
                        {(() => {
                          const { nextNum, prefix } = getSmartNextExerciseInfo(activeBookAssigned, activePageNumber, currentExercises);
                          const cleanPrefix = (prefix && !/^(?:Üb\.|Eigene\s*Üb\.|Übung)\s*/i.test(prefix)) ? prefix : 'Nr. ';
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                const newEx: LehrwerkExercise = {
                                  id: `ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                                  label: `${cleanPrefix}${nextNum}`,
                                  status: 'homework',
                                  createdBy: readOnly ? 'student' : 'teacher'
                                };
                                updateExercisesForCurrentPage([...currentExercises, newEx]);
                                setSelectedExerciseId(newEx.id);
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                const custom = window.prompt(`Übungsbezeichnung eingeben (z. B. ${cleanPrefix}${nextNum}, Groove 1, Etüde 3):`, `${cleanPrefix}${nextNum}`);
                                if (custom && custom.trim()) {
                                  const trimmed = custom.trim();
                                  const prefixMatch = trimmed.match(/^([^\d]*)(\d+)/);
                                  if (prefixMatch) {
                                    const newPrefix = prefixMatch[1];
                                    updateBookExercisePrefix(newPrefix);
                                  }
                                  const newEx: LehrwerkExercise = {
                                    id: `ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                                    label: trimmed,
                                    status: 'homework',
                                    createdBy: readOnly ? 'student' : 'teacher'
                                  };
                                  updateExercisesForCurrentPage([...currentExercises, newEx]);
                                  setSelectedExerciseId(newEx.id);
                                }
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '5px 12px',
                                borderRadius: '10px',
                                background: 'rgba(248, 250, 252, 0.85)',
                                border: '1.5px dashed #94a3b8',
                                color: '#475569',
                                fontWeight: 800,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              className="tactile-btn hover-scale-mini"
                              title={`Übung ${cleanPrefix}${nextNum} anlegen (Klick) oder anpassen (Doppelklick)`}
                              aria-label={`Übung ${cleanPrefix}${nextNum} anlegen`}
                            >
                              <Plus size={13} strokeWidth={2.5} style={{ color: '#64748b' }} />
                              <span>+ {cleanPrefix}{nextNum}</span>
                            </button>
                          );
                        })()}
                      </div>

                      {/* 🎯 Kompakte Übungs-Fokusleiste für Schüler (0.1% Goldstandard) */}
                      {selectedEx && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          padding: '8px 14px',
                          background: selectedEx.status === 'mastered' ? '#f0fdf4' : '#fefce8',
                          border: selectedEx.status === 'mastered' ? '1.5px solid #86efac' : '1.5px solid #fde047',
                          borderRadius: '12px',
                          fontSize: '0.80rem',
                          color: '#0f172a',
                          fontWeight: 750,
                          flexWrap: 'wrap',
                          animation: 'fadeIn 0.15s ease'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                            <span style={{
                              fontWeight: 900,
                              color: selectedEx.status === 'mastered' ? '#15803d' : '#854d0e',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Target size={14} strokeWidth={2.2} />
                              <span>{selectedEx.label}</span>
                            </span>

                            {/* Metronom Trigger if BPM exists */}
                            {selectedEx.targetBpm && (
                              <button
                                type="button"
                                onClick={() => toggleContinuousMetronome(selectedEx.targetBpm!)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: activeMetronomeBpm === selectedEx.targetBpm ? '#0f172a' : '#ffffff',
                                  color: activeMetronomeBpm === selectedEx.targetBpm ? '#ffffff' : '#0f172a',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                                className="tactile-btn"
                                title="Metronom für diese Übung starten"
                              >
                                <Play size={10} fill={activeMetronomeBpm === selectedEx.targetBpm ? '#ffffff' : '#0f172a'} />
                                <span>{selectedEx.targetBpm} BPM</span>
                              </button>
                            )}

                            {/* Optional micro note / tip */}
                            {selectedEx.notes && (
                              <span style={{ color: '#475569', fontSize: '0.76rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                💡 {selectedEx.notes}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {/* 1-Tap Status Toggle */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextStatus = selectedEx.status === 'mastered' ? 'homework' : 'mastered';
                                const updated = currentExercises.map(item => item.id === selectedEx.id ? { ...item, status: nextStatus as any } : item);
                                updateExercisesForCurrentPage(updated);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 9px',
                                borderRadius: '8px',
                                background: selectedEx.status === 'mastered' ? '#16a34a' : '#eab308',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                              className="tactile-btn"
                            >
                              <Check size={11} strokeWidth={2.5} />
                              <span>{selectedEx.status === 'mastered' ? 'Gemeistert' : 'Als erledigt markieren'}</span>
                            </button>

                            {/* Close / Return to whole page */}
                            <button
                              type="button"
                              onClick={() => setSelectedExerciseId(null)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: 'transparent',
                                border: 'none',
                                color: '#64748b',
                                cursor: 'pointer'
                              }}
                              title="Fokus aufheben (Ganze Seite)"
                              aria-label="Fokus aufheben"
                            >
                              <X size={13} strokeWidth={2.5} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Smart-Parser 1-Tap Assistant Banner (When no exercises are set, but notes contain exercises) */}
                      {currentExercises.length === 0 && detectedFromNotes.length > 0 && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          padding: '10px 14px',
                          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                          border: '1.5px solid #86efac',
                          borderRadius: '14px',
                          flexWrap: 'wrap'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 700, color: '#166534' }}>
                            <Sparkles size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                            <span>Im Notiztext erkannt: <strong>{detectedFromNotes.map(d => `${d.label}${d.targetBpm ? ` (${d.targetBpm} BPM)` : ''}`).join(', ')}</strong></span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newExercises: LehrwerkExercise[] = detectedFromNotes.map((d, idx) => ({
                                id: `ex_${Date.now()}_${idx}`,
                                label: d.label,
                                status: 'homework',
                                targetBpm: d.targetBpm
                              }));
                              updateExercisesForCurrentPage(newExercises);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: '#16a34a',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
                            }}
                            className="tactile-btn"
                          >
                            <Zap size={13} fill="#ffffff" />
                            <span>Als {detectedFromNotes.length === 1 ? 'Übungs-Chip' : 'Übungs-Chips'} anlegen</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* textbook page documentation form */}
                <form onSubmit={(e) => handleSave(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '80px' }}>
                  {/* Teacher View: Homework & Notes Editor */}
                  {!readOnly ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <label style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={15} strokeWidth={2.2} style={{ color: '#0f172a' }} />
                          <span>Hausaufgabe & Notiz für diese Seite:</span>
                        </label>
                        <SpeechDictationButton
                          onTranscript={(text) => {
                            setPageHomeworkNotes(prev => {
                              const trimmed = prev.trim();
                              return trimmed ? `${trimmed}\n${text}` : text;
                            });
                            triggerDebouncedAutoSave();
                          }}
                          title="Diktieren"
                        />
                      </div>
                      <textarea
                        ref={(el) => { pageNotesTextareaRef.current = el; }}
                        placeholder="Trage hier die Hausaufgabe oder Notizen für diese Seite ein..."
                        value={pageHomeworkNotes}
                        onInput={(e) => {
                          const target = e.currentTarget;
                          pageNotesSelectionRef.current = {
                            start: target.selectionStart ?? target.value.length,
                            end: target.selectionEnd ?? target.value.length
                          };
                        }}
                        onSelect={(e) => {
                          const target = e.currentTarget;
                          pageNotesSelectionRef.current = {
                            start: target.selectionStart ?? target.value.length,
                            end: target.selectionEnd ?? target.value.length
                          };
                        }}
                        onClick={(e) => {
                          const target = e.currentTarget;
                          pageNotesSelectionRef.current = {
                            start: target.selectionStart ?? target.value.length,
                            end: target.selectionEnd ?? target.value.length
                          };
                        }}
                        onKeyUp={(e) => {
                          const target = e.currentTarget;
                          pageNotesSelectionRef.current = {
                            start: target.selectionStart ?? target.value.length,
                            end: target.selectionEnd ?? target.value.length
                          };
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          const target = e.currentTarget;
                          pageNotesSelectionRef.current = {
                            start: target.selectionStart ?? val.length,
                            end: target.selectionEnd ?? val.length
                          };
                          setPageHomeworkNotes(val);
                          triggerDebouncedAutoSave();
                        }}
                        style={{
                          width: '100%',
                          height: '95px',
                          padding: '12px 14px',
                          borderRadius: '16px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.94rem',
                          fontWeight: 650,
                          lineHeight: '1.55',
                          outline: 'none',
                          resize: 'none',
                          background: '#fefdf8',
                          color: '#1e293b',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.02), inset 0 2px 4px rgba(0,0,0,0.02)',
                          transition: 'all 0.2s ease'
                        }}
                        onFocus={e => {
                          e.currentTarget.style.borderColor = '#34a853';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(19, 115, 51, 0.15)';
                          const target = e.currentTarget;
                          pageNotesSelectionRef.current = {
                            start: target.selectionStart ?? target.value.length,
                            end: target.selectionEnd ?? target.value.length
                          };
                        }}
                        onBlur={e => {
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02), inset 0 2px 4px rgba(0,0,0,0.02)';
                          const target = e.currentTarget;
                          pageNotesSelectionRef.current = {
                            start: target.selectionStart ?? target.value.length,
                            end: target.selectionEnd ?? target.value.length
                          };
                        }}
                      />
                      
                      {/* Didactic Quick-Tag Chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '4px' }}>
                        {DIDACTIC_QUICK_TAGS.map((t) => {
                          const isActive = pageHomeworkNotes.includes(t.tag);
                          return (
                            <button
                              key={t.tag}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const { nextText, newCursorPos } = insertOrToggleTagInText(
                                  pageHomeworkNotes,
                                  t.tag,
                                  pageNotesSelectionRef.current
                                );
                                setPageHomeworkNotes(nextText);
                                pageNotesSelectionRef.current = { start: newCursorPos, end: newCursorPos };
                                triggerDebouncedAutoSave();
                                setTimeout(() => {
                                  if (pageNotesTextareaRef.current) {
                                    pageNotesTextareaRef.current.focus();
                                    try { pageNotesTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos); } catch {}
                                  }
                                }, 10);
                              }}
                              style={{
                                background: isActive ? t.color : t.bg,
                                color: isActive ? '#ffffff' : t.color,
                                border: `1px solid ${isActive ? t.color : t.border}`,
                                padding: '3px 8px',
                                borderRadius: '100px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'all 0.15s'
                              }}
                              className="hover-scale-mini"
                            >
                              <Hash size={9} strokeWidth={2.5} />
                              <span>{t.tag.replace(/^#/, '')}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Presets Grid (0.1% Monochrome Goldstandard) */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                        {[
                          { icon: <Target size={11} strokeWidth={2.2} />, label: 'Ziel-Tempo', text: 'Ziel-Tempo: Metronom schrittweise auf Ziel-Geschwindigkeit steigern.' },
                          { icon: <Clock size={11} strokeWidth={2.2} />, label: 'Langsam & sauber', text: 'Langsam & sauber: Knifflige Takte isoliert im Schnecken-Tempo üben.' },
                          { icon: <RotateCcw size={11} strokeWidth={2.2} />, label: '3x fehlerfrei', text: '3x-Regel: Den Übergang 3 Mal hintereinander fehlerfrei wiederholen.' },
                          { icon: <Activity size={11} strokeWidth={2.2} />, label: 'Dynamik', text: 'Dynamik: Auf präzisen Ausdruck und Laut-Leise-Kontraste achten.' }
                        ].map((tpl, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              const newNotes = pageHomeworkNotes ? `${pageHomeworkNotes}\n${tpl.text}` : tpl.text;
                              setPageHomeworkNotes(newNotes);
                              triggerDebouncedAutoSave();
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#f8fafc',
                              color: '#334155',
                              border: '1.5px solid #e2e8f0',
                              padding: '5px 10px',
                              borderRadius: '99px',
                              fontSize: '0.70rem',
                              fontWeight: 750,
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                            className="hover-scale"
                          >
                            {tpl.icon}
                            <span>{tpl.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Display Student Note to Teacher */}
                      {studentNotes && (
                        <div style={{
                          marginTop: '12px',
                          background: '#f0fdf4',
                          border: '1.5px solid #86efac',
                          borderRadius: '16px',
                          padding: '12px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <div style={{ fontSize: '0.76rem', fontWeight: 900, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={13} strokeWidth={2.2} style={{ color: '#166534' }} />
                            <span>Schüler-Übenotiz / Rückmeldung vom Schüler:</span>
                          </div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 650, color: '#14532d', whiteSpace: 'pre-wrap' }}>
                            {studentNotes}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Student View: Read-Only Teacher Homework + Student Practice Notes & Tagebuch Widget */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {(() => {
                        const cleanTeacherNotes = getCleanTeacherHomeworkText(pageHomeworkNotes);
                        const isHomeworkActive = isCurrentHomework || status === 'HOMEWORK';
                        if (!cleanTeacherNotes && !isHomeworkActive) return null;
                        const displayText = cleanTeacherNotes || `Ganze Seite ${activePageNumber || ''} im Unterricht durchgehen & üben.`;
                        return (
                          <div style={{
                            background: '#fefdf8',
                            border: '1.5px solid #fde68a',
                            borderRadius: '16px',
                            padding: '14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}>
                            <div style={{ fontSize: '0.76rem', fontWeight: 900, color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Users size={13} strokeWidth={2.2} style={{ color: '#b45309' }} />
                              <span>Hausaufgabe von deiner Lehrkraft:</span>
                            </div>
                            <div style={{ fontSize: '0.94rem', fontWeight: 650, color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: '1.55' }}>
                              {displayText}
                            </div>
                          </div>
                        );
                      })()}

                      <div style={{
                        background: '#f8fafc',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '20px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <label style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MessageSquare size={16} strokeWidth={2.2} style={{ color: '#0f172a' }} />
                            <span>Frage oder Notiz an deine Lehrkraft:</span>
                          </label>

                          <SpeechDictationButton
                            onTranscript={(text) => {
                              setStudentNotes(prev => {
                                const trimmed = prev.trim();
                                return trimmed ? `${trimmed}\n${text}` : text;
                              });
                            }}
                            title="Diktieren"
                          />
                        </div>

                        <textarea
                          placeholder="Schreibe hier eine Frage oder Notiz für deine nächste Unterrichtsstunde..."
                          value={studentNotes}
                          onChange={(e) => setStudentNotes(e.target.value)}
                          style={{
                            width: '100%',
                            height: '110px',
                            padding: '14px',
                            borderRadius: '16px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '0.94rem',
                            fontWeight: 650,
                            lineHeight: '1.55',
                            outline: 'none',
                            resize: 'none',
                            background: '#ffffff',
                            color: '#1e293b',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                            transition: 'all 0.2s ease'
                          }}
                        />
                      </div>

                      {/* 0.1% Goldstandard Apple Practice Companion (Closing the White Desert) */}
                      <div style={{
                        background: '#ffffff',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '20px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                            <Activity size={15} strokeWidth={2.2} style={{ color: '#0f172a' }} />
                            <span>Übe-Assistent & Tempo-Trainer</span>
                          </div>
                          {activeMetronomeBpm && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              color: '#16a34a',
                              background: '#dcfce7',
                              padding: '2px 8px',
                              borderRadius: '999px'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
                              Aktiv ({activeMetronomeBpm} BPM)
                            </span>
                          )}
                        </div>

                        {/* Quick BPM Selector + Play/Stop Stepper */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          background: '#f8fafc',
                          padding: '8px 12px',
                          borderRadius: '14px',
                          border: '1px solid #e2e8f0',
                          flexWrap: 'wrap'
                        }}>
                          {/* Quick BPM Pills */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {[60, 80, 100, 120].map((bpm) => {
                              const isCurrentActive = activeMetronomeBpm === bpm;
                              return (
                                <button
                                  key={bpm}
                                  type="button"
                                  onClick={() => toggleContinuousMetronome(bpm)}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    border: isCurrentActive ? '1.5px solid #0f172a' : '1px solid #cbd5e1',
                                    background: isCurrentActive ? '#0f172a' : '#ffffff',
                                    color: isCurrentActive ? '#ffffff' : '#334155',
                                    fontWeight: 800,
                                    fontSize: '0.74rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  className="tactile-btn hover-scale-mini"
                                  title={`${bpm} BPM ${isCurrentActive ? 'stoppen' : 'starten'}`}
                                >
                                  {bpm} BPM
                                </button>
                              );
                            })}
                          </div>

                          {/* Stepper + Big Toggle Button */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const nextBpm = Math.max(40, (activeMetronomeBpm || 80) - 5);
                                toggleContinuousMetronome(nextBpm);
                              }}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#0f172a',
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="-5 BPM"
                              aria-label="-5 BPM"
                            >
                              −
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const nextBpm = Math.min(240, (activeMetronomeBpm || 80) + 5);
                                toggleContinuousMetronome(nextBpm);
                              }}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#0f172a',
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="+5 BPM"
                              aria-label="+5 BPM"
                            >
                              +
                            </button>
                            {activeMetronomeBpm ? (
                              <button
                                type="button"
                                onClick={() => toggleContinuousMetronome(activeMetronomeBpm)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '5px 12px',
                                  borderRadius: '9px',
                                  background: '#0f172a',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontWeight: 800,
                                  fontSize: '0.74rem',
                                  cursor: 'pointer'
                                }}
                                className="tactile-btn"
                                title="Metronom anhalten"
                              >
                                <Square size={11} fill="#ffffff" />
                                <span>Stopp</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleContinuousMetronome(80)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '5px 12px',
                                  borderRadius: '9px',
                                  background: '#0f172a',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontWeight: 800,
                                  fontSize: '0.74rem',
                                  cursor: 'pointer'
                                }}
                                className="tactile-btn"
                                title="Metronom mit 80 BPM starten"
                              >
                                <Play size={11} fill="#ffffff" />
                                <span>Start</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Interactive Übe-Tipp Box */}
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: '12px',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          border: '1px solid #f1f5f9'
                        }}>
                          <Clock size={16} strokeWidth={2} style={{ color: '#64748b', flexShrink: 0 }} />
                          <div style={{ fontSize: '0.76rem', color: '#475569', lineHeight: '1.45' }}>
                            <strong style={{ color: '#0f172a' }}>Tipp:</strong> Starte zunächst 15–20 BPM unter deinem Zieltempo und steigere erst, wenn du den Übergang 3× hintereinander fehlerfrei spielen kannst.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                    {!readOnly && (
                      <div style={{
                        marginTop: '12px',
                        background: 'rgba(251, 191, 36, 0.05)',
                        border: '1.5px dashed rgba(251, 191, 36, 0.3)',
                        borderRadius: '16px',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Eye size={12} strokeWidth={2.2} style={{ color: '#b45309' }} />
                          <span>Live-Vorschau (im Hausaufgaben-Widget des Schülers):</span>
                        </div>
                        {(() => {
                          const book = globalLehrwerke.find(b => b.id === activeLehrwerkId);
                          const bookColor = getLehrwerkColor(book?.title || '');
                          const assignedBook = assignedLehrwerke.find(a => a.lehrwerkId === activeLehrwerkId);
                          const pageStates = assignedBook?.pageStates || {};

                          // Collect all pages assigned as homework for this book
                          const homeworkPagesSet = new Set<number>();
                          Object.entries(pageStates).forEach(([pNumStr, pState]: [string, any]) => {
                            if (pState?.status === 'homework' || pState?.isCurrentHomework) {
                              const num = parseInt(pNumStr, 10);
                              if (!isNaN(num)) homeworkPagesSet.add(num);
                            }
                          });

                          // Include active page if marked as homework in current form state
                          if (activePageNumber !== null && (isCurrentHomework || status === 'IN_PROGRESS')) {
                            homeworkPagesSet.add(activePageNumber);
                          }

                          const homeworkPagesList = Array.from(homeworkPagesSet).sort((a, b) => a - b);
                          const pagesToRender = homeworkPagesList.length > 0 ? homeworkPagesList : (activePageNumber !== null ? [activePageNumber] : [1]);
                          const formattedPagesStr = formatPageNumbers(pagesToRender);

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '0.88rem', color: '#09090b', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{
                                  width: '14px',
                                  height: '18px',
                                  background: `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})`,
                                  borderRadius: '3px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <BookOpen size={8} color={bookColor.text} />
                                </div>
                                <span>{book?.title || 'Lehrwerk'}</span>
                                {formattedPagesStr && (
                                  <span style={{ color: '#4b5563', fontWeight: 700 }}>· {formattedPagesStr}</span>
                                )}
                              </div>

                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: '#ffffff',
                                color: '#475569',
                                padding: '4px 12px',
                                borderRadius: '999px',
                                fontSize: '0.74rem',
                                fontWeight: 900,
                                border: '1px solid rgba(251, 191, 36, 0.3)',
                                boxShadow: '0 3px 8px rgba(0,0,0,0.03), 0 0 12px rgba(251, 191, 36, 0.2)',
                                alignSelf: 'flex-start'
                              }}>
                                <FileText size={11} strokeWidth={2} style={{ color: '#64748b' }} />
                                <span>{formattedPagesStr ? formattedPagesStr : `S. ${activePageNumber}`}</span>
                              </div>

                              {/* Stacked notes for all homework pages in this book */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                                {pagesToRender.map(pNum => {
                                  let pageNoteText = '';
                                  if (pNum === activePageNumber) {
                                    pageNoteText = cleanNotesText(homeworkNotes);
                                  } else {
                                    const savedPageState = pageStates[pNum];
                                    const rawSavedNote = savedPageState?.homeworkNotes || savedPageState?.notes || '';
                                    pageNoteText = cleanNotesText(rawSavedNote);
                                    
                                    if (!pageNoteText) {
                                      // Fallback search in progressItems
                                      const matchProgress = progressItems.find(pi => pi.topic_name === `${book?.title} - Seite ${pNum}`);
                                      if (matchProgress?.homework_notes) {
                                        pageNoteText = cleanNotesText(matchProgress.homework_notes);
                                      }
                                    }
                                  }

                                  return (
                                    <div key={pNum} style={{ 
                                      display: 'flex', 
                                      gap: '6px', 
                                      alignItems: 'flex-start', 
                                      fontSize: '0.75rem', 
                                      color: '#475569', 
                                      lineHeight: '1.4',
                                      background: '#ffffff',
                                      border: pNum === activePageNumber ? '1.5px solid rgba(251, 191, 36, 0.4)' : '1px solid rgba(251, 191, 36, 0.18)',
                                      borderRadius: '12px',
                                      padding: '8px 12px',
                                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                                    }}>
                                      <span style={{ fontWeight: 800, color: '#b45309', flexShrink: 0 }}>S. {pNum}:</span>
                                      <span style={{ fontWeight: 650, color: pageNoteText ? '#1e293b' : '#94a3b8', fontStyle: pageNoteText ? 'normal' : 'italic', whiteSpace: 'pre-wrap' }}>
                                        {pageNoteText ? renderTextWithDidacticBadges(pageNoteText) : 'Keine Hausaufgabe eingetragen'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                  {!readOnly && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <Lock size={12} strokeWidth={2} style={{ color: '#64748b' }} />
                          <span>Interne Notiz (nur für Lehrer)</span>
                          <span style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>• Didaktischer Verlauf (Keine Diagnosen gem. Art. 9 DSGVO)</span>
                        </label>
                        <SpeechDictationButton
                          onTranscript={(text) => {
                            setTeacherNotes(prev => {
                              const trimmed = prev.trim();
                              return trimmed ? `${trimmed}\n${text}` : text;
                            });
                            triggerDebouncedAutoSave();
                          }}
                          title="Diktieren"
                        />
                      </div>
                      <textarea
                        placeholder="Didaktischer Verlauf &amp; Notizen... (Hinweis: Keine Diagnosen oder Gesundheitsdaten gem. Art. 9 DSGVO erfassen)"
                        value={teacherNotes}
                        onChange={(e) => {
                          setTeacherNotes(e.target.value);
                          triggerDebouncedAutoSave();
                        }}
                        style={{
                          width: '100%', height: '50px', padding: '8px 12px', borderRadius: '12px',
                          border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 600, outline: 'none', resize: 'none', background: 'white'
                        }}
                      />
                    </div>
                  )}

                  <div style={{ paddingBottom: (isMobileView || isInsideSim || isFullscreen) ? '180px' : '48px' }} />
                </form>
              </div>
            ) : activeSubView === 'song' && selectedActiveSongId ? (
              // song detail notebook view
              (() => {
                const skill = activeSongSkills.find(s => s.id === selectedActiveSongId);
                if (!skill) return null;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', animation: 'fadeIn 0.25s ease' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: status === 'MASTERED' ? 'hsl(130, 65%, 82%)' : (isCurrentHomework ? 'hsl(47, 85%, 84%)' : 'hsl(355, 75%, 84%)'),
                            border: '1.5px solid rgba(0,0,0,0.1)',
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                            flexShrink: 0
                          }} />
                          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#000' }}>
                            {skill.songs?.artist ? `${skill.songs.artist} - ${skill.songs.title}` : (skill.songs?.title || 'Song Details')}
                          </h3>
                          <span style={{
                            fontSize: '0.70rem',
                            fontWeight: 800,
                            color: '#10b981',
                            background: '#ecfdf5',
                            border: '1px solid #d1fae5',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            flexShrink: 0
                          }}>
                            <Check size={12} strokeWidth={2.5} />
                            <span>Auto-Save aktiv</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '80px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <label style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            📝 Übungs-Fahrplan & Hausaufgabe:
                          </label>
                          <SpeechDictationButton
                            onTranscript={(text) => {
                              const newNotes = songHomeworkNotes ? `${songHomeworkNotes.trim()}\n${text}` : text;
                              setSongHomeworkNotes(newNotes);
                              setHasChanges(true);
                              if (selectedActiveSongId) {
                                try {
                                  localStorage.setItem(`song_note_${student.id}_${selectedActiveSongId}`, newNotes);
                                } catch (err) {}
                                triggerDebouncedSongSave(newNotes);
                              }
                            }}
                            title="Diktieren"
                          />
                        </div>
                        <textarea
                          ref={(el) => { songNotesTextareaRef.current = el; }}
                          placeholder="Passagen, Anschlagstechniken oder Rhythmen eintragen..."
                          value={songHomeworkNotes}
                          onInput={(e) => {
                            const target = e.currentTarget;
                            songNotesSelectionRef.current = {
                              start: target.selectionStart ?? target.value.length,
                              end: target.selectionEnd ?? target.value.length
                            };
                          }}
                          onSelect={(e) => {
                            const target = e.currentTarget;
                            songNotesSelectionRef.current = {
                              start: target.selectionStart ?? target.value.length,
                              end: target.selectionEnd ?? target.value.length
                            };
                          }}
                          onClick={(e) => {
                            const target = e.currentTarget;
                            songNotesSelectionRef.current = {
                              start: target.selectionStart ?? target.value.length,
                              end: target.selectionEnd ?? target.value.length
                            };
                          }}
                          onKeyUp={(e) => {
                            const target = e.currentTarget;
                            songNotesSelectionRef.current = {
                              start: target.selectionStart ?? target.value.length,
                              end: target.selectionEnd ?? target.value.length
                            };
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            const target = e.currentTarget;
                            songNotesSelectionRef.current = {
                              start: target.selectionStart ?? val.length,
                              end: target.selectionEnd ?? val.length
                            };
                            setSongHomeworkNotes(val);
                            setHasChanges(true);
                            if (selectedActiveSongId) {
                              try {
                                localStorage.setItem(`song_note_${student.id}_${selectedActiveSongId}`, val);
                              } catch (err) {}
                              triggerDebouncedSongSave(val);
                            }
                          }}
                          style={{
                            width: '100%',
                            height: '140px',
                            padding: '16px',
                            borderRadius: '20px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '0.94rem',
                            fontWeight: 650,
                            lineHeight: '1.55',
                            outline: 'none',
                            resize: 'none',
                            background: '#fefdf8',
                            color: '#1e293b',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02), inset 0 2px 4px rgba(0,0,0,0.02)',
                            transition: 'all 0.2s ease'
                          }}
                          onFocus={e => {
                            e.currentTarget.style.borderColor = 'var(--primary-color, #34a853)';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(52, 168, 83, 0.15)';
                            const target = e.currentTarget;
                            songNotesSelectionRef.current = {
                              start: target.selectionStart ?? target.value.length,
                              end: target.selectionEnd ?? target.value.length
                            };
                          }}
                          onBlur={e => {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02), inset 0 2px 4px rgba(0,0,0,0.02)';
                            const target = e.currentTarget;
                            songNotesSelectionRef.current = {
                              start: target.selectionStart ?? target.value.length,
                              end: target.selectionEnd ?? target.value.length
                            };
                          }}
                        />
                        {/* Didactic Quick-Tag Chips */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '4px' }}>
                          {DIDACTIC_QUICK_TAGS.map((t) => {
                            const isActive = songHomeworkNotes.includes(t.tag);
                            return (
                              <button
                                key={t.tag}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const { nextText, newCursorPos } = insertOrToggleTagInText(
                                    songHomeworkNotes,
                                    t.tag,
                                    songNotesSelectionRef.current
                                  );
                                  setSongHomeworkNotes(nextText);
                                  songNotesSelectionRef.current = { start: newCursorPos, end: newCursorPos };
                                  setHasChanges(true);
                                  if (selectedActiveSongId) {
                                    try {
                                      localStorage.setItem(`song_note_${student.id}_${selectedActiveSongId}`, nextText);
                                    } catch (err) {}
                                    triggerDebouncedSongSave(nextText);
                                  }
                                  setTimeout(() => {
                                    if (songNotesTextareaRef.current) {
                                      songNotesTextareaRef.current.focus();
                                      try { songNotesTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos); } catch {}
                                    }
                                  }, 10);
                                }}
                                style={{
                                  background: isActive ? t.color : t.bg,
                                  color: isActive ? '#ffffff' : t.color,
                                  border: `1px solid ${isActive ? t.color : t.border}`,
                                  padding: '3px 8px',
                                  borderRadius: '100px',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  transition: 'all 0.15s'
                                }}
                                className="hover-scale-mini"
                              >
                                <Hash size={9} strokeWidth={2.5} />
                                <span>{t.tag.replace(/^#/, '')}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Schnell-Textbausteine */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                          {[
                            { label: '🐌 Schnecke', text: '• 🐌 Schnecken-Tempo: Schwierige Passage ganz langsam & präzise üben.' },
                            { label: '🔂 Ritter-Drei', text: '• 🔂 Ritter-Drei: Kniffligen Übergang 3x hintereinander fehlerfrei spielen.' },
                            { label: '🎵 Laut-Leise', text: '• 🎵 Dynamik: Auf deutliche Laut-Leise-Unterschiede achten.' },
                            { label: '⏱️ 10-Min.', text: '• ⏱️ Fokus-Timer: 10 Minuten täglich konzentriert wiederholen.' }
                          ].map((tpl, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                const newNotes = songHomeworkNotes ? `${songHomeworkNotes}\n${tpl.text}` : tpl.text;
                                setSongHomeworkNotes(newNotes);
                                setStatus('IN_PROGRESS');
                                setIsCurrentHomework(true);
                                setHasChanges(true);
                                if (selectedActiveSongId) {
                                  try {
                                    localStorage.setItem(`song_note_${student.id}_${selectedActiveSongId}`, newNotes);
                                  } catch (err) {}
                                  triggerDirectSongSave(selectedActiveSongId, 'IN_PROGRESS', true, newNotes, teacherNotes);
                                }
                              }}
                              style={{
                                background: '#f8fafc',
                                color: '#334155',
                                border: '1.5px solid #e2e8f0',
                                padding: '6px 12px',
                                borderRadius: '99px',
                                fontSize: '0.72rem',
                                fontWeight: 750,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                              className="hover-scale"
                            >
                              {tpl.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {!readOnly && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <label style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <Lock size={12} strokeWidth={2} style={{ color: '#64748b' }} />
                              <span>Interne Notiz (nur für Lehrer):</span>
                              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>• Didaktischer Verlauf (Keine Diagnosen gem. Art. 9 DSGVO)</span>
                            </label>
                            <SpeechDictationButton
                              onTranscript={(text) => {
                                const newNotes = teacherNotes ? `${teacherNotes.trim()}\n${text}` : text;
                                setTeacherNotes(newNotes);
                                setHasChanges(true);
                                if (selectedActiveSongId) {
                                  try {
                                    localStorage.setItem(`song_teacher_note_${student.id}_${selectedActiveSongId}`, newNotes);
                                  } catch (err) {}
                                  triggerDebouncedTeacherNoteSave(newNotes);
                                } else {
                                  triggerDebouncedAutoSave();
                                }
                              }}
                              title="Diktieren"
                            />
                          </div>
                          <textarea
                            placeholder="Didaktischer Verlauf &amp; Songnotizen... (Hinweis: Keine Diagnosen oder Gesundheitsdaten gem. Art. 9 DSGVO erfassen)"
                            value={teacherNotes}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTeacherNotes(val);
                              setHasChanges(true);
                              if (selectedActiveSongId) {
                                try {
                                  localStorage.setItem(`song_teacher_note_${student.id}_${selectedActiveSongId}`, val);
                                } catch (err) {}
                                triggerDebouncedTeacherNoteSave(val);
                              } else {
                                triggerDebouncedAutoSave();
                              }
                            }}
                            style={{
                              width: '100%',
                              height: '100px',
                              padding: '16px',
                              borderRadius: '20px',
                              border: '1.5px solid #cbd5e1',
                              fontSize: '0.88rem',
                              fontWeight: 650,
                              lineHeight: '1.5',
                              outline: 'none',
                              resize: 'none',
                              background: '#fefdf8',
                              color: '#1e293b',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.02), inset 0 2px 4px rgba(0,0,0,0.02)',
                              transition: 'all 0.2s ease'
                            }}
                            onFocus={e => {
                              e.currentTarget.style.borderColor = 'var(--primary-color, #34a853)';
                              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(52, 168, 83, 0.15)';
                            }}
                            onBlur={e => {
                              e.currentTarget.style.borderColor = '#cbd5e1';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02), inset 0 2px 4px rgba(0,0,0,0.02)';
                            }}
                          />
                        </div>
                      )}


                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', paddingBottom: (isMobileView || isInsideSim || isFullscreen || isMobileOrSim) ? '180px' : '48px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            handleBackToHub();
                          }}
                          style={{
                            flex: 1,
                            padding: '14px 20px',
                            borderRadius: '16px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                          className="hover-scale"
                        >
                          <Check size={18} strokeWidth={2.5} />
                          <span>Fertig & Schließen</span>
                        </button>
                      </div>
                    </form>
                  </div>
                );
              })()
            ) : isTeacherSelf ? (
              // 🎓 TEACHER STUDIO INFO-BOARD & QUICK GUIDE
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '16px', padding: isMobileView ? '16px 12px 100px 12px' : '20px 24px', animation: 'fadeIn 0.2s ease', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={16} style={{ color: '#34a853' }} />
                      <span>Vorbereitungsraum & Aufgaben-Studio</span>
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#15803d', background: '#e6f4ea', border: '1px solid #bbf7d0', padding: '2px 10px', borderRadius: '100px' }}>
                    Lehrer-Cockpit
                  </span>
                </div>

                {/* Hero Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(52, 168, 83, 0.25)',
                      flexShrink: 0
                    }}>
                      <Sliders size={18} color="#ffffff" strokeWidth={2.4} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#0f172a' }}>
                        Willkommen in deinem Aufgaben-Studio!
                      </h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.45, fontWeight: 600 }}>
                        Hier testest du alle Schüler-Module uneingeschränkt, spielst didaktische Referenz-Tracks ein und bereitest deinen Unterricht vor.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3-Schritte Didaktik-Leitfaden */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Schritt 1 */}
                  <div style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
                    }}>
                      <Sliders size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 850, color: '#0f172a' }}>
                        1. Didaktische Werkzeuge flexibel nutzen
                      </div>
                      <p style={{ margin: '3px 0 8px 0', fontSize: '0.74rem', color: '#64748b', lineHeight: 1.45, fontWeight: 550 }}>
                        Wähle links ein Modul wie Loopstation, Stimmgerät, Groove-Trainer oder EarLab, um es live im Unterricht vorzuführen oder für dich selbst zum Üben einzusetzen.
                      </p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveModalTab('document');
                            setActiveViewMode('loopstation');
                            setActiveSubView('hub');
                          }}
                          style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '100px',
                            padding: '4px 11px',
                            fontSize: '0.71rem',
                            fontWeight: 800,
                            color: '#15803d',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          className="hover-scale-mini"
                        >
                          <Sliders size={11} />
                          <span>Loopstation öffnen</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveModalTab('document');
                            setActiveViewMode('tuner');
                            setActiveSubView('hub');
                          }}
                          style={{
                            background: '#ecfeff',
                            border: '1px solid #a5f3fc',
                            borderRadius: '100px',
                            padding: '4px 11px',
                            fontSize: '0.71rem',
                            fontWeight: 800,
                            color: '#0891b2',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          className="hover-scale-mini"
                        >
                          <Radio size={11} />
                          <span>Stimmgerät öffnen</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Schritt 2 */}
                  <div style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)'
                    }}>
                      <Mic size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 850, color: '#0f172a' }}>
                        2. Eigene Referenzen & Play-Alongs einspielen
                      </div>
                      <p style={{ margin: '3px 0 8px 0', fontSize: '0.74rem', color: '#64748b', lineHeight: 1.45, fontWeight: 550 }}>
                        Nimm didaktische Master-Spuren und Play-Along-Tracks mit Metronom auf. Alle Aufnahmen stehen dir in der Audio-Biografie und im Audio-Tresor zur Verfügung.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModalTab('document');
                          setActiveViewMode('recordings');
                          setActiveSubView('hub');
                        }}
                        style={{
                          background: '#eef2ff',
                          border: '1px solid #c7d2fe',
                          borderRadius: '100px',
                          padding: '4px 11px',
                          fontSize: '0.71rem',
                          fontWeight: 800,
                          color: '#4338ca',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        className="hover-scale-mini"
                      >
                        <Mic size={11} />
                        <span>Aufnahmen-Studio öffnen</span>
                      </button>
                    </div>
                  </div>

                  {/* Schritt 3 */}
                  <div style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                    }}>
                      <BookOpen size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 850, color: '#0f172a' }}>
                        3. Vorbereitete Aufgaben & Referenzen an Schüler zuweisen
                      </div>
                      <p style={{ margin: '3px 0 8px 0', fontSize: '0.74rem', color: '#64748b', lineHeight: 1.45, fontWeight: 550 }}>
                        Erstelle deine didaktischen Play-Alongs, Lehrwerkseiten und Übenotizen zentral im Studio und weise sie per 1-Klick an alle heutigen Schüler oder Fachgruppen zu – spart 2–3 Stunden wöchentlich.
                      </p>
                      {onOpenAssignModal && (
                        <button
                          type="button"
                          onClick={onOpenAssignModal}
                          style={{
                            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                            border: 'none',
                            borderRadius: '100px',
                            padding: '6px 14px',
                            fontSize: '0.74rem',
                            fontWeight: 850,
                            color: '#ffffff',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                            transition: 'transform 0.15s ease'
                          }}
                          className="hover-scale-mini"
                        >
                          <Send size={12} />
                          <span>An Schüler zuweisen...</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Schnellaktionen Footer */}
                {onClose && (
                  <div style={{
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      type="button"
                      onClick={onClose}
                      style={{
                        background: 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '100px',
                        padding: '8px 18px',
                        fontSize: '0.78rem',
                        fontWeight: 850,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(52, 168, 83, 0.25)',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-scale"
                    >
                      <Check size={14} strokeWidth={2.4} />
                      <span>Zurück zum Dashboard</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // GENERAL HUB VIEW (only homework Checklist + general notes textarea)
              <>
                {!readOnly && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Edit3 size={15} style={{ color: '#0f172a' }} />
                        <span>Eintrag & Hausaufgabe</span>
                      </span>
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#15803d', background: '#e6f4ea', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '100px' }}>
                      Schüler-Vorschau
                    </span>
                  </div>
                )}

                {/* The Main Input Form Card */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: isMobileView ? 'auto' : '100%', gap: readOnly ? '0px' : '20px' }}>
                  <div style={{
                    flex: 1,
                    minHeight: 0,
                    height: isMobileView ? 'auto' : '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                  }}>
                    <div style={{
                      flex: 1,
                      minHeight: 0,
                      height: isMobileView ? 'auto' : '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px'
                    }}>
                      {/* ========================================================================= */}
                      {/* HERO CARD CONTENT (100% SSOT: Single Source of Truth for Voice & UI)     */}
                      {/* ========================================================================= */}
                      {(() => {
                        const getTargetWeekIso = (offset: number): string => {
                          const target = getSimulatedNow();
                          if (offset !== 0) {
                            target.setDate(target.getDate() + (offset * 7));
                          }
                          return getISOWeek(target);
                        };

                        const getWeekDateRange = (offset: number) => {
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
                        };

                        const viewingWeekIso = getTargetWeekIso(viewingWeekOffset);
                        const viewingWeekNum = viewingWeekIso.split('-W')[1] || '';
                        const weekRange = getWeekDateRange(viewingWeekOffset);
                        const isPastWeek = viewingWeekOffset < 0;
                        const isFutureWeek = viewingWeekOffset > 0;
                        const isCurrentWeek = viewingWeekOffset === 0;

                        // 1. Deduplicate progress items
                        const uniqueItemsMap = new Map<string, any>();
                        (progressItems || []).forEach(item => {
                          const canonicalKey = getCanonicalSongKey(item);
                          const normTitle = getNormalizedSongTitle(item).toLowerCase();
                          const name = canonicalKey || normTitle || (item.topic_name || '').trim().toLowerCase();
                          if (name && !uniqueItemsMap.has(name)) {
                            uniqueItemsMap.set(name, item);
                          }
                        });
                        const deduplicatedItems = Array.from(uniqueItemsMap.values());

                        let lehrwerkeList: { title: string; pages: number[]; notes: string[] }[] = [];
                        let otherHWs: any[] = [];
                        let audioNotes: any[] = [];
                        let homeworkNoteItems: string[] = [];
                        let histWeekItem: any = null;
                        let isAudioCarriedOver = false;
                        let isNotesCarriedOver = false;
                        let isBooksCarriedOver = false;
                        let isSongsCarriedOver = false;
                        let carriedOverWeekLabel = '';
                        let bridgedPastQuestion: any = null;

                        const hasTransferredWeek = Boolean(
                          localStorage.getItem(`week_transferred_${student.id}_${viewingWeekIso}`) === 'true' ||
                          (progressItems || []).some((item: any) => 
                            (item.topic_name === `Hausaufgabe KW ${viewingWeekNum}` || item.topic_name === `Hausaufgabe KW ${parseInt(viewingWeekNum, 10)}`) && 
                            item.homework_notes && 
                            item.homework_notes !== '[]' && 
                            item.homework_notes !== '""'
                          )
                        );

                        if (isCurrentWeek || (isFutureWeek && hasTransferredWeek)) {
                          // === LIVE DRAFT FOR CURRENT ACTIVE LESSON WEEK & FUTURE WEEK PREVIEW ===
                          const activeHWs = deduplicatedItems.filter(item => {
                            if (item.topic_name && item.topic_name.includes(' - Seite ')) {
                              const parts = item.topic_name.split(' - Seite ');
                              const bookTitle = parts[0].trim();
                              const pageNum = parseInt(parts[1], 10);
                              const book = globalLehrwerke.find(g => g.title === bookTitle || g.title?.toLowerCase().trim() === bookTitle.toLowerCase().trim());
                              if (book) {
                                const assignment = assignedLehrwerke.find(a => String(a.lehrwerkId) === String(book.id) || (a.bookTitle && a.bookTitle.toLowerCase().trim() === bookTitle.toLowerCase().trim()));
                                const pageState = assignment?.pageStates?.[pageNum];
                                if (pageState?.status === 'homework' || pageState?.isCurrentHomework) {
                                  return true;
                                }
                              }
                              return Boolean(item.is_current_homework);
                            }
                            return Boolean(item.is_current_homework) && !item.topic_name?.startsWith('Hausaufgabe KW ');
                          });

                          const activeTheories = deduplicatedItems.filter(item => {
                            if (item.topic_name && item.topic_name.includes(' - Seite ')) {
                              const parts = item.topic_name.split(' - Seite ');
                              const bookTitle = parts[0].trim();
                              const pageNum = parseInt(parts[1], 10);
                              const book = globalLehrwerke.find(g => g.title === bookTitle || g.title?.toLowerCase().trim() === bookTitle.toLowerCase().trim());
                              if (book) {
                                const assignment = assignedLehrwerke.find(a => String(a.lehrwerkId) === String(book.id) || (a.bookTitle && a.bookTitle.toLowerCase().trim() === bookTitle.toLowerCase().trim()));
                                const pageState = assignment?.pageStates?.[pageNum];
                                if (pageState?.status === 'purple') return true;
                              }
                              return item.status === 'THEORY_DONE';
                            }
                            return item.status === 'THEORY_DONE' && 
                                   item.updated_at && 
                                   (getISOWeek(item.updated_at) === viewingWeekIso || (isFutureWeek && getISOWeek(item.updated_at) === getISOWeek(getSimulatedNow()))) &&
                                   !item.topic_name?.startsWith('Hausaufgabe KW ');
                          });

                          const groupedLehrwerke: Record<string, { pages: number[]; notes: string[] }> = {};
                          
                          // Process assignedLehrwerke page states
                          (assignedLehrwerke || []).forEach(assignment => {
                            const book = globalLehrwerke.find(g => String(g.id) === String(assignment.lehrwerkId) || (g.title && assignment.bookTitle && g.title.toLowerCase().trim() === assignment.bookTitle.toLowerCase().trim()));
                            const resolvedTitle = book?.title || assignment.bookTitle || assignment.lehrwerkTitle;
                            if (!resolvedTitle || !assignment.pageStates) return;
                            
                            Object.entries(assignment.pageStates).forEach(([pNumStr, pState]: [string, any]) => {
                              if (pState?.status === 'homework' || pState?.isCurrentHomework) {
                                const pageNum = parseInt(pNumStr, 10);
                                if (!isNaN(pageNum)) {
                                  if (!groupedLehrwerke[resolvedTitle]) {
                                    groupedLehrwerke[resolvedTitle] = { pages: [], notes: [] };
                                  }
                                  if (!groupedLehrwerke[resolvedTitle].pages.includes(pageNum)) {
                                    groupedLehrwerke[resolvedTitle].pages.push(pageNum);
                                    const cleanNote = getCleanPageNotes(pState.homeworkNotes || pState.homework_notes);
                                    if (cleanNote) {
                                      groupedLehrwerke[resolvedTitle].notes.push(`Seite ${pageNum}: ${cleanNote}`);
                                    }
                                  }
                                }
                              }
                            });
                          });

                          const addSongToOtherHWs = (candidateSong: any) => {
                            if (!candidateSong) return;
                            const existingIdx = otherHWs.findIndex(existing => areSongsIdentical(existing, candidateSong));
                            if (existingIdx === -1) {
                              otherHWs.push(candidateSong);
                            } else {
                              const existing = otherHWs[existingIdx];
                              if (!existing.homework_notes && candidateSong.homework_notes) {
                                existing.homework_notes = candidateSong.homework_notes;
                              }
                              if (!existing.topic_name && candidateSong.topic_name) {
                                existing.topic_name = candidateSong.topic_name;
                              }
                            }
                          };

                          const allActive = [...activeHWs, ...activeTheories];
                          allActive.forEach(item => {
                            if (item.topic_name && item.topic_name.includes(' - Seite ')) {
                              const parts = item.topic_name.split(' - Seite ');
                              const bookTitle = parts[0].trim();
                              const book = globalLehrwerke.find(g => g.title === bookTitle || g.title?.toLowerCase().trim() === bookTitle.toLowerCase().trim());
                              const isBookAssigned = Boolean(book && assignedLehrwerke.some(a => String(a.lehrwerkId) === String(book.id) || (a.bookTitle && a.bookTitle.toLowerCase().trim() === bookTitle.toLowerCase().trim())));
                              if (!isBookAssigned && !item.is_current_homework) return;

                              const pageNum = parseInt(parts[1], 10);
                              if (!groupedLehrwerke[bookTitle]) {
                                groupedLehrwerke[bookTitle] = { pages: [], notes: [] };
                              }
                              if (!isNaN(pageNum) && !groupedLehrwerke[bookTitle].pages.includes(pageNum)) {
                                groupedLehrwerke[bookTitle].pages.push(pageNum);
                                if (item.homework_notes || item.teacher_notes) {
                                  const cleanNote = getCleanPageNotes(item.homework_notes || item.teacher_notes);
                                  if (cleanNote && !groupedLehrwerke[bookTitle].notes.includes(`Seite ${pageNum}: ${cleanNote}`)) {
                                    groupedLehrwerke[bookTitle].notes.push(`Seite ${pageNum}: ${cleanNote}`);
                                  }
                                }
                              }
                            } else {
                              const cachedNote = localStorage.getItem(`song_note_${student.id}_${item.id}`) ||
                                                 localStorage.getItem(`song_note_${student.id}_${item.song_id}`) ||
                                                 item.homework_notes ||
                                                 item.teacher_notes ||
                                                 '';
                              addSongToOtherHWs({
                                ...item,
                                homework_notes: cachedNote
                              });
                            }
                          });

                          // Also check activeSongSkills with localStorage backup for instant sync
                          (activeSongSkills || []).forEach(skill => {
                            const isHwInLs = localStorage.getItem(`song_hw_${student.id}_${skill.id}`) === 'true' ||
                                             localStorage.getItem(`song_hw_${student.id}_${skill.song_id}`) === 'true' ||
                                             Boolean(skill.is_current_homework);
                            if (isHwInLs) {
                              const songArtist = skill.songs?.artist || skill.artist || '';
                              const songTitle = skill.songs?.title || skill.title || skill.song_title || 'Song';
                              const songInstrument = skill.instrument ? ` (${skill.instrument})` : '';
                              const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;
                              const cachedNote = localStorage.getItem(`song_note_${student.id}_${skill.id}`) ||
                                                 localStorage.getItem(`song_note_${student.id}_${skill.song_id}`) ||
                                                 skill.homework_notes ||
                                                 skill.teacher_notes ||
                                                 '';
                              addSongToOtherHWs({
                                id: skill.id,
                                song_id: skill.song_id,
                                topic_name: fullTitle,
                                is_current_homework: true,
                                status: 'IN_PROGRESS',
                                homework_notes: cachedNote,
                                songs: skill.songs
                              });
                            }
                          });

                          lehrwerkeList = Object.entries(groupedLehrwerke).map(([title, info]) => {
                            info.pages.sort((a: number, b: number) => a - b);
                            return { title, pages: info.pages, notes: info.notes };
                          });

                          audioNotes = (homeworkNotesList || [])
                            .map((note, idx) => ({ note: typeof note === 'string' ? note : String(note || ''), idx }))
                            .filter(item => item.note.includes("AUDIO:"))
                            .map((item, index) => {
                              const cleanStr = item.note.startsWith('[') ? item.note.replace(/[\[\]"]/g, '') : item.note;
                              const parts = cleanStr.substring(cleanStr.indexOf('AUDIO:') + 6).split('|');
                              return {
                                url: parts[0]?.replace(/^["']|["']$/g, '').trim(),
                                duration: parseInt(parts[1] || '0', 10),
                                date: parts[2]?.trim(),
                                label: parts[3]?.trim() || `Aufnahme #${index + 1}`,
                                author: parts[4]?.trim() || 'teacher',
                                songTag: parts[7]?.trim() || undefined,
                                originalIdx: item.idx,
                                idx: item.idx
                              };
                            })
                            .filter(a => !!a.url);

                          homeworkNoteItems = getHomeworkNoteItems(generalHomeworkNotes);

                          // 🛡️ Enterprise+ Cold-Cache & Mobile PWA Hydration: Symmetrical Snapshot Unpacking (Lehrwerke, Songs, Audios & Notes)
                          const curWeekSnapshotItem = deduplicatedItems.find(item => {
                            if (!item.topic_name?.startsWith('Hausaufgabe KW ')) return false;
                            const itWeek = getItemWeek(item);
                            if (itWeek && itWeek === viewingWeekIso) return true;
                            if (item.updated_at && getISOWeek(item.updated_at) === viewingWeekIso) return true;
                            if (item.created_at && getISOWeek(item.created_at) === viewingWeekIso) return true;
                            if (viewingWeekNum) {
                              const matchNum = item.topic_name.match(/Hausaufgabe KW\s*(\d+)/i);
                              if (matchNum && parseInt(matchNum[1], 10) === parseInt(viewingWeekNum, 10)) return true;
                            }
                            return false;
                          });

                          if (curWeekSnapshotItem && curWeekSnapshotItem.homework_notes) {
                            try {
                              const parsedSnap = typeof curWeekSnapshotItem.homework_notes === 'string'
                                ? JSON.parse(curWeekSnapshotItem.homework_notes)
                                : curWeekSnapshotItem.homework_notes;
                              if (Array.isArray(parsedSnap)) {
                                // 1. Lehrwerke snapshot unpacking (if lehrwerkeList is empty)
                                if (lehrwerkeList.length === 0) {
                                  const snapLwEntry = parsedSnap.find((n: any) => typeof n === 'string' && n.startsWith('SNAPSHOT_LEHRWERKE:'));
                                  if (snapLwEntry) {
                                    try {
                                      const rawJson = snapLwEntry.substring('SNAPSHOT_LEHRWERKE:'.length);
                                      const parsedLw = JSON.parse(rawJson);
                                      if (Array.isArray(parsedLw) && parsedLw.length > 0) {
                                        lehrwerkeList = parsedLw;
                                      }
                                    } catch (lwErr) {
                                      console.warn('[MeisterwerkDocumentTab] Error unpacking SNAPSHOT_LEHRWERKE:', lwErr);
                                    }
                                  }
                                }

                                // 2. Songs snapshot unpacking with deduplication
                                const snapSongEntry = parsedSnap.find((n: any) => typeof n === 'string' && n.startsWith('SNAPSHOT_SONGS:'));
                                if (snapSongEntry) {
                                  try {
                                    const rawJson = snapSongEntry.substring('SNAPSHOT_SONGS:'.length);
                                    const parsedSongs = JSON.parse(rawJson);
                                    if (Array.isArray(parsedSongs)) {
                                      parsedSongs.forEach((song: any) => {
                                        addSongToOtherHWs({
                                          ...song,
                                          is_current_homework: true,
                                          homework_notes: getCleanPageNotes(song.homework_notes)
                                        });
                                      });
                                    }
                                  } catch (sErr) {
                                    console.warn('[MeisterwerkDocumentTab] Error unpacking SNAPSHOT_SONGS in current week:', sErr);
                                  }
                                }

                                // 3. Audio recordings unpacking (guarantees all 6 recordings show on Mobile PWA)
                                const snapAudios = parsedSnap
                                  .filter((n: any) => typeof n === 'string' && n.includes('AUDIO:'))
                                  .map((cleanStr: string, index: number) => {
                                    const parts = cleanStr.substring(cleanStr.indexOf('AUDIO:') + 6).split('|');
                                    return {
                                      url: parts[0]?.replace(/^["']|["']$/g, '').trim(),
                                      duration: parseInt(parts[1] || '0', 10),
                                      date: parts[2]?.trim(),
                                      label: parts[3]?.trim() || `Aufnahme #${index + 1}`,
                                      author: parts[4]?.trim() || 'teacher',
                                      songTag: parts[7]?.trim() || undefined,
                                      originalIdx: index,
                                      idx: index
                                    };
                                  })
                                  .filter(a => !!a.url);

                                if (snapAudios.length > 0) {
                                  if (audioNotes.length === 0) {
                                    audioNotes = snapAudios;
                                  } else {
                                    snapAudios.forEach(sa => {
                                      if (!audioNotes.some(ea => ea.url === sa.url)) {
                                        audioNotes.push(sa);
                                      }
                                    });
                                  }
                                }

                                // 4. Didactic teacher remarks / text notes unpacking ("zusätzliche bemerkung")
                                if (homeworkNoteItems.length === 0) {
                                  const snapTextNotes = parsedSnap
                                    .filter((n: any) => {
                                      if (typeof n !== 'string') return false;
                                      return !isInternalMetadataNote(n) &&
                                             !n.startsWith('AUDIO:') &&
                                             !n.startsWith('STICKER:') &&
                                             !n.startsWith('LOOP:') &&
                                             !n.startsWith('SNAPSHOT_') &&
                                             !n.startsWith('FEEDBACK:') &&
                                             !n.startsWith('STUDENT_NOTE_');
                                    })
                                    .map((s: string) => s.trim())
                                    .filter(Boolean);
                                  if (snapTextNotes.length > 0) {
                                    homeworkNoteItems = snapTextNotes;
                                  }
                                }
                              }
                            } catch (snapErr) {
                              console.warn('[MeisterwerkDocumentTab] Error unpacking curWeekSnapshotItem in current week:', snapErr);
                            }
                          }

                          // 🌉 SMART VORWOCHEN-FALLBACK & AUDIO/NOTE BRIDGE: Pädagogische Kontinuität (Zero-LocalStorage)
                          // Wenn für die aktuelle Woche noch keine neuen Hausaufgaben eingetragen sind (oder auf Mobile/Cold Cache),
                          // übernehme nahtlos Lehrwerke, Songs, Audioaufnahmen und Notizen der vorherigen Unterrichtsstunde
                          // aus dem jüngsten Wochen-Snapshot.
                          const hasActiveCurrentHomework = (lehrwerkeList.length > 0 || otherHWs.length > 0 || audioNotes.length > 0 || homeworkNoteItems.length > 0);
                          if (isCurrentWeek && (!hasActiveCurrentHomework || audioNotes.length === 0 || homeworkNoteItems.length === 0 || otherHWs.length === 0 || lehrwerkeList.length === 0)) {
                            const pastWeekSnapshots = (progressItems || []).filter((item: any) => {
                              if (!item.topic_name?.startsWith('Hausaufgabe KW ')) return false;
                              const itWeekIso = getItemWeek(item);
                              return itWeekIso && itWeekIso < viewingWeekIso;
                            });

                            pastWeekSnapshots.sort((a: any, b: any) => {
                              const wA = getItemWeek(a);
                              const wB = getItemWeek(b);
                              if (wA !== wB) return (wB || '').localeCompare(wA || '');
                              const tA = new Date(a.updated_at || a.created_at || 0).getTime();
                              const tB = new Date(b.updated_at || b.created_at || 0).getTime();
                              return tB - tA;
                            });

                            const latestPastHwSnapshot = pastWeekSnapshots[0];
                            if (latestPastHwSnapshot && latestPastHwSnapshot.homework_notes) {
                              try {
                                const parsedPastNotes = typeof latestPastHwSnapshot.homework_notes === 'string'
                                  ? JSON.parse(latestPastHwSnapshot.homework_notes)
                                  : latestPastHwSnapshot.homework_notes;

                                const kwMatch = latestPastHwSnapshot.topic_name.match(/Hausaufgabe KW\s*(\d+)/i);
                                carriedOverWeekLabel = kwMatch ? `KW ${kwMatch[1]}` : 'der Vorwoche';

                                if (Array.isArray(parsedPastNotes)) {
                                  // 1. Lehrwerke der Vorwoche übernehmen (falls aktuell leer)
                                  if (lehrwerkeList.length === 0) {
                                    const snapLwEntry = parsedPastNotes.find((n: string) => typeof n === 'string' && n.startsWith('SNAPSHOT_LEHRWERKE:'));
                                    if (snapLwEntry) {
                                      try {
                                        const rawJson = snapLwEntry.substring('SNAPSHOT_LEHRWERKE:'.length);
                                        const parsedLw = JSON.parse(rawJson);
                                        if (Array.isArray(parsedLw) && parsedLw.length > 0) {
                                          lehrwerkeList = parsedLw;
                                          isBooksCarriedOver = true;
                                        }
                                      } catch (e) {
                                        console.warn('Error parsing SNAPSHOT_LEHRWERKE in carryover:', e);
                                      }
                                    }
                                  }

                                  // 2. Songs der Vorwoche übernehmen (falls aktuell leer)
                                  if (otherHWs.length === 0) {
                                    const snapSongEntry = parsedPastNotes.find((n: string) => typeof n === 'string' && n.startsWith('SNAPSHOT_SONGS:'));
                                    if (snapSongEntry) {
                                      try {
                                        const rawJson = snapSongEntry.substring('SNAPSHOT_SONGS:'.length);
                                        const parsedSongs = JSON.parse(rawJson);
                                        if (Array.isArray(parsedSongs) && parsedSongs.length > 0) {
                                          parsedSongs.forEach((song: any) => addSongToOtherHWs(song));
                                          isSongsCarriedOver = true;
                                        }
                                      } catch (e) {
                                        console.warn('Error parsing SNAPSHOT_SONGS in carryover:', e);
                                      }
                                    }
                                  }

                                  // 3. Audio-Aufnahmen der Vorwoche übernehmen
                                  if (audioNotes.length === 0) {
                                    const pastAudios = parsedPastNotes
                                      .filter((n: string) => typeof n === 'string' && n.includes('AUDIO:'))
                                      .map((cleanStr: string, index: number) => {
                                        const parts = cleanStr.substring(cleanStr.indexOf('AUDIO:') + 6).split('|');
                                        return {
                                          url: parts[0]?.replace(/^["']|["']$/g, '').trim(),
                                          duration: parseInt(parts[1] || '0', 10),
                                          date: parts[2]?.trim(),
                                          label: parts[3]?.trim() || `Aufnahme #${index + 1}`,
                                          author: parts[4]?.trim() || 'teacher',
                                          songTag: parts[7]?.trim() || undefined,
                                          originalIdx: index,
                                          idx: index,
                                          isCarriedOver: true
                                        };
                                      })
                                      .filter(a => !!a.url);

                                    if (pastAudios.length > 0) {
                                      audioNotes = pastAudios;
                                      isAudioCarriedOver = true;
                                    }
                                  }

                                  // 4. Lehrkraft-Notiz der Vorwoche übernehmen (strikt ohne Rohcode / Metadaten)
                                  if (homeworkNoteItems.length === 0) {
                                    const pastNotes = parsedPastNotes
                                      .filter((n: string) => {
                                        if (typeof n !== 'string') return false;
                                        return !isInternalMetadataNote(n) &&
                                               !n.startsWith('AUDIO:') &&
                                               !n.startsWith('STICKER:') &&
                                               !n.startsWith('LOOP:') &&
                                               !n.startsWith('SNAPSHOT_') &&
                                               !n.startsWith('FEEDBACK:') &&
                                               !n.startsWith('STUDENT_NOTE_');
                                      })
                                      .map((s: string) => s.trim())
                                      .filter(Boolean);

                                    if (pastNotes.length > 0) {
                                      homeworkNoteItems = pastNotes;
                                      isNotesCarriedOver = true;
                                    }
                                  }

                                  // 5. Schülerfrage der Vorwoche übernehmen (falls in aktueller Woche noch keine neue Frage existiert)
                                  const pastQ = parsedPastNotes.find((n: string) => typeof n === 'string' && (n.startsWith('STUDENT_QUESTION:') || n.startsWith('❓ Frage für den Unterricht:')));
                                  if (pastQ) {
                                    bridgedPastQuestion = parseStudentQuestionFromNotes([pastQ]);
                                  }
                                } else if (typeof parsedPastNotes === 'string') {
                                  if (homeworkNoteItems.length === 0) {
                                    const pastNotes = getHomeworkNoteItems(parsedPastNotes);
                                    if (pastNotes.length > 0) {
                                      homeworkNoteItems = pastNotes;
                                      isNotesCarriedOver = true;
                                    }
                                  }
                                }
                              } catch (bridgeErr) {
                                console.warn('[MeisterwerkDocumentTab] Error bridging past lesson notes:', bridgeErr);
                              }
                            }
                          }

                          // 🛡️ Lehrer-Vorschau: Wurde der Entwurf im Editor geleert ("Leeren"), zeige der Lehrkraft eine leere Seite
                          if (isCarriedOverDismissed && !readOnly) {
                            if (isBooksCarriedOver) lehrwerkeList = [];
                            if (isSongsCarriedOver) otherHWs = [];
                            if (isAudioCarriedOver) audioNotes = [];
                            if (isNotesCarriedOver) homeworkNoteItems = [];
                          }
                        } else {
                          // === HISTORICAL OR FUTURE WEEK ARCHIVED SNAPSHOT ===
                          histWeekItem = (progressItems || []).find((item: any) => {
                            return item.topic_name === `Hausaufgabe KW ${viewingWeekNum}` ||
                                   item.topic_name === `Hausaufgabe KW ${parseInt(viewingWeekNum, 10)}` ||
                                   (item.created_at && getISOWeek(item.created_at) === viewingWeekIso) ||
                                   (item.updated_at && getISOWeek(item.updated_at) === viewingWeekIso && item.topic_name.startsWith('Hausaufgabe KW '));
                          });

                          if (histWeekItem && histWeekItem.homework_notes) {
                            try {
                              const parsedNotes = typeof histWeekItem.homework_notes === 'string' 
                                ? JSON.parse(histWeekItem.homework_notes) 
                                : histWeekItem.homework_notes;
                              
                              if (Array.isArray(parsedNotes)) {
                                audioNotes = parsedNotes
                                  .filter((n: string) => typeof n === 'string' && n.includes('AUDIO:'))
                                  .map((cleanStr: string, index: number) => {
                                    const parts = cleanStr.substring(cleanStr.indexOf('AUDIO:') + 6).split('|');
                                    return {
                                      url: parts[0]?.replace(/^["']|["']$/g, '').trim(),
                                      duration: parseInt(parts[1] || '0', 10),
                                      date: parts[2]?.trim(),
                                      label: parts[3]?.trim() || `Aufnahme #${index + 1}`,
                                      author: parts[4]?.trim() || 'teacher',
                                      songTag: parts[7]?.trim() || undefined,
                                      originalIdx: index,
                                      idx: index
                                    };
                                  })
                                  .filter(a => !!a.url);

                                homeworkNoteItems = parsedNotes
                                  .filter((n: string) => {
                                    if (typeof n !== 'string') return false;
                                    const lower = n.toLowerCase();
                                    return !isInternalMetadataNote(n) &&
                                           !n.startsWith('AUDIO:') && 
                                           !n.startsWith('STICKER:') && 
                                           !n.startsWith('LOOP:') &&
                                           !lower.startsWith('latency:') && 
                                           !lower.startsWith('latency_calibration:') && 
                                           !n.startsWith('SYSTEM:') && 
                                           !n.startsWith('FEEDBACK:') && 
                                           !n.startsWith('STUDENT_NOTE_') &&
                                           !n.startsWith('SNAPSHOT_');
                                  })
                                  .map((s: string) => s.trim())
                                  .filter(Boolean);

                                // 📦 1. Parse Lehrwerke-Snapshot aus Wochen-Snapshot
                                const snapLwEntry = parsedNotes.find((n: string) => typeof n === 'string' && n.startsWith('SNAPSHOT_LEHRWERKE:'));
                                if (snapLwEntry) {
                                  try {
                                    const rawJson = snapLwEntry.substring('SNAPSHOT_LEHRWERKE:'.length);
                                    const parsedLw = JSON.parse(rawJson);
                                    if (Array.isArray(parsedLw)) {
                                      lehrwerkeList = parsedLw;
                                    }
                                  } catch (e) {
                                    console.warn('Error parsing SNAPSHOT_LEHRWERKE:', e);
                                  }
                                }

                                // 🎵 2. Parse Songs-Snapshot aus Wochen-Snapshot
                                const snapSongEntry = parsedNotes.find((n: string) => typeof n === 'string' && n.startsWith('SNAPSHOT_SONGS:'));
                                if (snapSongEntry) {
                                  try {
                                    const rawJson = snapSongEntry.substring('SNAPSHOT_SONGS:'.length);
                                    const parsedSongs = JSON.parse(rawJson);
                                    if (Array.isArray(parsedSongs)) {
                                      parsedSongs.forEach((song: any) => {
                                        if (!otherHWs.some(existing => areSongsIdentical(existing, song))) {
                                          otherHWs.push(song);
                                        }
                                      });
                                    }
                                  } catch (e) {
                                    console.warn('Error parsing SNAPSHOT_SONGS:', e);
                                  }
                                }
                              } else if (typeof parsedNotes === 'string') {
                                homeworkNoteItems = getHomeworkNoteItems(parsedNotes);
                              }
                            } catch (err) {
                              homeworkNoteItems = getHomeworkNoteItems(histWeekItem.homework_notes);
                            }
                          }

                          // Historical week Lehrwerke / Songs that were specifically active or updated in that week
                          const weekProgressItems = (progressItems || []).filter((item: any) => {
                            const itemWeek = (item.created_at && getISOWeek(item.created_at)) || 
                                             (item.updated_at && getISOWeek(item.updated_at));
                            return itemWeek === viewingWeekIso && !item.topic_name?.startsWith('Hausaufgabe KW ');
                          });

                          const groupedHistLehrwerke: Record<string, { pages: number[]; notes: string[] }> = {};
                          // Initialize with items from snapshot if already present
                          lehrwerkeList.forEach(lw => {
                            groupedHistLehrwerke[lw.title] = { pages: [...lw.pages], notes: [...(lw.notes || [])] };
                          });

                          weekProgressItems.forEach((item: any) => {
                            if (item.topic_name && item.topic_name.includes(' - Seite ')) {
                              const parts = item.topic_name.split(' - Seite ');
                              const bookTitle = parts[0].trim();
                              const pageNum = parseInt(parts[1], 10);
                              if (!groupedHistLehrwerke[bookTitle]) {
                                groupedHistLehrwerke[bookTitle] = { pages: [], notes: [] };
                              }
                              if (!isNaN(pageNum) && !groupedHistLehrwerke[bookTitle].pages.includes(pageNum)) {
                                groupedHistLehrwerke[bookTitle].pages.push(pageNum);
                                if (item.homework_notes) {
                                  const cleanNote = getCleanPageNotes(item.homework_notes);
                                  if (cleanNote) groupedHistLehrwerke[bookTitle].notes.push(`Seite ${pageNum}: ${cleanNote}`);
                                }
                              }
                            } else if (item.topic_name) {
                              if (!otherHWs.some(existing => areSongsIdentical(existing, item))) {
                                otherHWs.push({
                                  ...item,
                                  homework_notes: getCleanPageNotes(item.homework_notes)
                                });
                              }
                            }
                          });

                          lehrwerkeList = Object.entries(groupedHistLehrwerke).map(([title, info]) => {
                            info.pages.sort((a: number, b: number) => a - b);
                            return { title, pages: info.pages, notes: info.notes };
                          });

                          // 🌉 INTELLIGENTE SELBSTHEILUNG & BRÜCKE FÜR VORWOCHEN:
                          // Wenn in einer vergangenen Woche (z. B. KW 36) zwar ein Wochen-Snapshot (Hausaufgabe KW 36 mit Aufnahmen/Notizen)
                          // vorliegt, aber Lehrwerke und Songs fehlen (weil sie zuvor via Übertrag in die Folgewoche verschoben wurden),
                          // stellen wir Lehrwerk und Song aus den aktiven/übertragenen Hausaufgaben wieder her und sichern den Snapshot dauerhaft.
                          if (histWeekItem && lehrwerkeList.length === 0 && otherHWs.length === 0) {
                            const recoveredLwMap: Record<string, { pages: number[]; notes: string[] }> = {};
                            (assignedLehrwerke || []).forEach((assignment: any) => {
                              const book = globalLehrwerke.find(g => String(g.id) === String(assignment.lehrwerkId) || (g.title && assignment.bookTitle && g.title.toLowerCase().trim() === assignment.bookTitle.toLowerCase().trim()));
                              const bookTitle = book?.title || assignment.bookTitle || assignment.lehrwerkTitle;
                              if (!bookTitle || !assignment.pageStates) return;
                              Object.entries(assignment.pageStates).forEach(([pStr, pState]: [string, any]) => {
                                if (pState?.status === 'homework' || pState?.isCurrentHomework) {
                                  const pNum = parseInt(pStr, 10);
                                  if (!isNaN(pNum)) {
                                    if (!recoveredLwMap[bookTitle]) recoveredLwMap[bookTitle] = { pages: [], notes: [] };
                                    if (!recoveredLwMap[bookTitle].pages.includes(pNum)) {
                                      recoveredLwMap[bookTitle].pages.push(pNum);
                                      const cleanNote = getCleanPageNotes(pState.homeworkNotes || pState.homework_notes);
                                      if (cleanNote) recoveredLwMap[bookTitle].notes.push(`Seite ${pNum}: ${cleanNote}`);
                                    }
                                  }
                                }
                              });
                            });

                            const recoveredLw = Object.entries(recoveredLwMap).map(([title, info]) => {
                              info.pages.sort((a: number, b: number) => a - b);
                              return { title, pages: info.pages, notes: info.notes };
                            });

                            const recoveredSongs: any[] = [];
                            (progressItems || []).forEach((item: any) => {
                              if (item.is_current_homework && !item.topic_name?.includes(' - Seite ') && !item.topic_name?.startsWith('Hausaufgabe KW ')) {
                                if (!recoveredSongs.some(existing => areSongsIdentical(existing, item))) {
                                  recoveredSongs.push({
                                    ...item,
                                    homework_notes: getCleanPageNotes(item.homework_notes)
                                  });
                                }
                              }
                            });

                            (activeSongSkills || []).forEach((skill: any) => {
                              const isHwInLs = localStorage.getItem(`song_hw_${student.id}_${skill.id}`) === 'true' ||
                                               localStorage.getItem(`song_hw_${student.id}_${skill.song_id}`) === 'true' ||
                                               Boolean(skill.is_current_homework);
                              if (isHwInLs) {
                                const songArtist = skill.songs?.artist || skill.artist || '';
                                const songTitle = skill.songs?.title || skill.title || skill.song_title || 'Song';
                                const songInstrument = skill.instrument ? ` (${skill.instrument})` : '';
                                const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;
                                const candidate = {
                                  id: skill.id,
                                  song_id: skill.song_id,
                                  topic_name: fullTitle,
                                  is_current_homework: true,
                                  status: 'IN_PROGRESS',
                                  homework_notes: skill.homework_notes || '',
                                  songs: skill.songs
                                };
                                if (!recoveredSongs.some(x => areSongsIdentical(x, candidate))) {
                                  recoveredSongs.push(candidate);
                                }
                              }
                            });

                            if (recoveredLw.length > 0 || recoveredSongs.length > 0) {
                              lehrwerkeList = recoveredLw;
                              otherHWs = recoveredSongs;

                              // Asynchron in Supabase Snapshot absichern, damit die Vorwoche dauerhaft geheilt bleibt
                              if (histWeekItem?.id && !String(histWeekItem.id).startsWith('temp-')) {
                                try {
                                  const curNotes = typeof histWeekItem.homework_notes === 'string'
                                    ? JSON.parse(histWeekItem.homework_notes)
                                    : (Array.isArray(histWeekItem.homework_notes) ? histWeekItem.homework_notes : []);
                                  const cleanBase = curNotes.filter((n: string) => 
                                    typeof n === 'string' && !n.startsWith('SNAPSHOT_LEHRWERKE:') && !n.startsWith('SNAPSHOT_SONGS:')
                                  );
                                  const updatedWithSnap = [
                                    ...cleanBase,
                                    ...(recoveredLw.length > 0 ? [`SNAPSHOT_LEHRWERKE:${JSON.stringify(recoveredLw)}`] : []),
                                    ...(recoveredSongs.length > 0 ? [`SNAPSHOT_SONGS:${JSON.stringify(recoveredSongs)}`] : [])
                                  ];
                                  supabase.from('progress_matrix').update({
                                    homework_notes: JSON.stringify(updatedWithSnap)
                                  }).eq('id', histWeekItem.id).then(() => {});
                                } catch (patchErr) {
                                  console.warn('[MeisterwerkDocumentTab] Error persisting healed snapshot:', patchErr);
                                }
                              }
                            }
                          }
                        }

                        const hasActiveItems = lehrwerkeList.length > 0 || otherHWs.length > 0 || audioNotes.length > 0 || homeworkNoteItems.length > 0;
                        
                        const currentHour = getSimulatedNow().getHours();
                        const isSilentTime = currentHour >= 20 || currentHour < 7;

                        const effectiveViewingQuestion = (isCurrentWeek 
                          ? (parsedStudentQuestion?.hasQuestion 
                              ? parsedStudentQuestion 
                              : (() => {
                                  if (student?.id) {
                                    try {
                                      const directQ = localStorage.getItem(`campus_student_question_${student.id}`);
                                      if (directQ && directQ.trim()) {
                                        return { hasQuestion: true, rawEntry: null, text: directQ.trim(), timestamp: null };
                                      }
                                    } catch {}
                                  }
                                  if (bridgedPastQuestion?.hasQuestion) {
                                    return bridgedPastQuestion;
                                  }
                                  return { hasQuestion: false, rawEntry: null, text: '', timestamp: null };
                                })()
                            )
                          : (histWeekItem && histWeekItem.homework_notes
                              ? (() => {
                                  try {
                                    const p = typeof histWeekItem.homework_notes === 'string'
                                      ? JSON.parse(histWeekItem.homework_notes)
                                      : histWeekItem.homework_notes;
                                    return Array.isArray(p) ? parseStudentQuestionFromNotes(p) : { hasQuestion: false, rawEntry: null, text: '', timestamp: null };
                                  } catch {
                                    return { hasQuestion: false, rawEntry: null, text: '', timestamp: null };
                                  }
                                })()
                              : { hasQuestion: false, rawEntry: null, text: '', timestamp: null })) || { hasQuestion: false, rawEntry: null, text: '', timestamp: null };

                        const isCarriedOverPlan = isCurrentWeek && (isAudioCarriedOver || isNotesCarriedOver || isBooksCarriedOver || isSongsCarriedOver) && !isCarriedOverDismissed;

                        const getActiveWeekExportData = () => {
                          const targetToken = student?.qr_token || student?.id || '';
                          const appUrl = typeof getCanonicalQrLandingUrl === 'function' ? getCanonicalQrLandingUrl(targetToken) : '';
                          const stFirstName = student?.first_name || (student?.name ? student.name.split(' ')[0] : 'Schüler');
                          const stFullName = student?.name || (student?.first_name ? `${student.first_name} ${student.last_name || ''}`.trim() : 'Schüler');

                          const lehrwerkePayload = lehrwerkeList.map(lw => ({
                            title: lw.title,
                            pages: lw.pages,
                            notes: lw.notes
                          }));

                          const songsPayload = otherHWs.map(s => {
                            const rawArtist = (s.songs?.artist || s.artist || '').trim();
                            const rawTitle = (s.songs?.title || s.song_title || s.title || '').trim();
                            const displayTitle = rawTitle ? (rawArtist ? `${rawArtist} - ${rawTitle}` : rawTitle) : (s.topic_name || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
                            return {
                              title: displayTitle || 'Song',
                              notes: getCleanPageNotes(s.homework_notes)
                            };
                          });

                          const audioPayload = audioNotes.map(a => {
                            let durStr: string | undefined = undefined;
                            if (typeof a.duration === 'number' && a.duration > 0) {
                              durStr = `${Math.floor(a.duration / 60)}:${String(a.duration % 60).padStart(2, '0')} Min.`;
                            } else if (typeof a.duration === 'string' && a.duration) {
                              durStr = a.duration.includes(':') ? `${a.duration} Min.` : a.duration;
                            }
                            let dateStr = a.date;
                            if (dateStr) {
                              try {
                                const d = new Date(dateStr);
                                if (!isNaN(d.getTime())) {
                                  dateStr = d.toLocaleDateString('de-DE');
                                }
                              } catch {}
                            }
                            return {
                              label: a.label || 'Aufnahme',
                              duration: durStr,
                              date: dateStr,
                              url: a.url
                            };
                          });

                          const cleanTeacher = (effectiveTeacherFullName && effectiveTeacherFullName.trim().toLowerCase() !== 'aufgabenheft' && effectiveTeacherFullName !== 'Lehrkraft')
                            ? effectiveTeacherFullName
                            : 'Deine Lehrkraft';

                          return {
                            studentName: stFullName,
                            studentFirstName: stFirstName,
                            teacherName: cleanTeacher,
                            schoolName: student?.school_name || 'Campus-Groovelab',
                            instrument: student?.instrument || '',
                            weekNumber: viewingWeekNum,
                            date: new Date().toLocaleDateString('de-DE'),
                            appUrl,
                            lehrwerke: lehrwerkePayload,
                            songs: songsPayload,
                            notes: homeworkNoteItems,
                            studentQuestion: effectiveViewingQuestion?.hasQuestion ? effectiveViewingQuestion.text : undefined,
                            audioRecordings: audioPayload
                          };
                        };

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: 0, height: isMobileView ? 'auto' : '100%' }}>
                            {/* ========================================================================= */}
                            {/* KÖRPER 1: DAS NOTENHEFT (Schüler-Bühne / Das fertige Ergebnis)            */}
                            {/* ========================================================================= */}
                            <div style={{
                              background: '#ffffff',
                              border: '1px solid #eef2f6',
                              borderRadius: isMobileView ? '20px' : '24px',
                              padding: isMobileView ? '14px 12px' : '20px 22px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: isMobileView ? '12px' : '16px',
                              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
                              maxWidth: '100%',
                              boxSizing: 'border-box',
                              overflow: 'hidden',
                              flex: isMobileView ? '0 0 auto' : '1 1 0%',
                              height: isMobileView ? 'auto' : '100%',
                              minHeight: 0
                            }}>
                              {/* 1. Responsive Header Bar (Desktop: 1-Line, Mobile: Adaptive Wrap) */}
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              flexWrap: isMobileView ? 'wrap' : 'nowrap', 
                              gap: isMobileView ? '8px' : '12px',
                              rowGap: isMobileView ? '8px' : '0',
                              width: '100%',
                              minWidth: 0,
                              maxWidth: '100%',
                              boxSizing: 'border-box',
                              flexShrink: 0
                            }}>
                              {/* 🍏 Left: Apple Segmented Week Pager Capsule & Navigation Hub */}
                              <div style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: isMobileView ? '6px' : '8px', 
                                minWidth: 0, 
                                width: 'auto',
                                justifyContent: 'flex-start',
                                flexShrink: 0, 
                                flexWrap: 'nowrap' 
                              }}>
                                <div style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '100px',
                                  padding: '2px 4px',
                                  height: '32px',
                                  width: isMobileView ? '195px' : '260px',
                                  minWidth: isMobileView ? '195px' : '260px',
                                  maxWidth: isMobileView ? '195px' : '260px',
                                  boxSizing: 'border-box',
                                  gap: '2px',
                                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                                  flexShrink: 0
                                }}>
                                  <button
                                    type="button"
                                    disabled={viewingWeekOffset <= -8}
                                    onClick={() => setViewingWeekOffset(prev => prev - 1)}
                                    title="Vorherige Woche (KW)"
                                    style={{
                                      background: '#ffffff',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: '100px',
                                      width: '26px',
                                      height: '26px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: viewingWeekOffset <= -8 ? 'not-allowed' : 'pointer',
                                      opacity: viewingWeekOffset <= -8 ? 0.35 : 1,
                                      color: '#334155',
                                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                                      transition: 'all 0.15s ease',
                                      flexShrink: 0
                                    }}
                                    className="hover-scale-mini"
                                  >
                                    <ChevronLeft size={13} strokeWidth={2.4} />
                                  </button>

                                  <span 
                                    title={`Kalenderwoche ${viewingWeekNum} (ISO 8601)`}
                                    style={{
                                      fontSize: isMobileView ? '0.78rem' : '0.84rem',
                                      fontWeight: 850,
                                      color: '#0f172a',
                                      letterSpacing: '-0.015em',
                                      padding: '0 4px',
                                      whiteSpace: 'nowrap',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px',
                                      flex: 1,
                                      minWidth: 0,
                                      overflow: 'hidden',
                                      textAlign: 'center'
                                    }}
                                  >
                                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>{weekRange.label}</span>
                                    {!isMobileView && (
                                      <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b' }}>
                                        ({weekRange.dateSpan})
                                      </span>
                                    )}
                                  </span>

                                  <button
                                    type="button"
                                    disabled={viewingWeekOffset >= 1}
                                    onClick={() => setViewingWeekOffset(prev => Math.min(1, prev + 1))}
                                    title={viewingWeekOffset === 0 ? "Zur Folgewoche" : "Nächste Woche"}
                                    style={{
                                      background: '#ffffff',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: '100px',
                                      width: '26px',
                                      height: '26px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: viewingWeekOffset >= 1 ? 'not-allowed' : 'pointer',
                                      opacity: viewingWeekOffset >= 1 ? 0.35 : 1,
                                      color: '#334155',
                                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                                      transition: 'all 0.15s ease'
                                    }}
                                    className="hover-scale-mini"
                                  >
                                    <ChevronRight size={13} strokeWidth={2.4} />
                                  </button>
                                </div>

                                {viewingWeekOffset !== 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setViewingWeekOffset(0)}
                                    style={{
                                      background: '#f1f5f9',
                                      border: '1px solid #e2e8f0',
                                      color: '#0f172a',
                                      borderRadius: '100px',
                                      padding: isMobileView ? '0 8px' : '0 11px',
                                      height: '32px',
                                      boxSizing: 'border-box',
                                      fontSize: '0.75rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      whiteSpace: 'nowrap',
                                      transition: 'all 0.15s ease',
                                      flexShrink: 0
                                    }}
                                    className="hover-scale-mini"
                                    title="Zurück zur aktuellen Woche"
                                  >
                                    <RotateCcw size={11} strokeWidth={2.5} color="#475569" />
                                    <span>Heute</span>
                                  </button>
                                )}
                              </div>



                              {/* 🍏 Right: Compact Action Hub (32px Slim Icons) */}
                              <div 
                                ref={shareMenuRef}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  flexShrink: 0,
                                  width: 'auto',
                                  justifyContent: 'flex-end',
                                  marginLeft: 'auto',
                                  boxSizing: 'border-box'
                                }}
                              >
                                {/* ❓ 1. Student Question Button */}
                                {readOnly ? (
                                  effectiveViewingQuestion?.hasQuestion ? (
                                    <button
                                      type="button"
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => {
                                        if (!isQuestionEditorOpen) {
                                          let textToUse = effectiveViewingQuestion?.hasQuestion ? (effectiveViewingQuestion?.text || '') : '';
                                          if (student?.id) {
                                            try {
                                              const draft = localStorage.getItem(`campus_student_question_draft_${student.id}`);
                                              if (draft !== null && draft !== undefined) {
                                                textToUse = draft;
                                              } else {
                                                const directQ = localStorage.getItem(`campus_student_question_${student.id}`);
                                                if (directQ) textToUse = directQ.trim();
                                              }
                                            } catch {}
                                          }
                                          setQuestionDraftText(textToUse);
                                        }
                                        setIsQuestionEditorOpen(prev => !prev);
                                      }}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: isMobileView ? '4px' : '6px',
                                        padding: isMobileView ? '0 8px' : '0 10px',
                                        height: isMobileView ? '36px' : '32px',
                                        minHeight: isMobileView ? '36px' : '32px',
                                        borderRadius: '100px',
                                        border: 'none',
                                        background: '#facc15',
                                        color: '#0f172a',
                                        fontSize: '0.75rem',
                                        fontWeight: 850,
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(250, 204, 21, 0.35)',
                                        transition: 'all 0.15s ease',
                                        touchAction: 'manipulation',
                                        WebkitTapHighlightColor: 'transparent',
                                        boxSizing: 'border-box',
                                        flexShrink: 0
                                      }}
                                      className="hover-scale-mini"
                                      title="Deine Frage ansehen oder ändern"
                                      aria-label="1 Frage notiert - ansehen oder ändern"
                                    >
                                      <HelpCircle size={14} strokeWidth={2.4} color="currentColor" />
                                      {isMobileView ? (
                                        <span style={{
                                          background: '#0f172a',
                                          color: '#facc15',
                                          borderRadius: '100px',
                                          padding: '1px 5px',
                                          fontSize: '0.68rem',
                                          fontWeight: 900,
                                          lineHeight: 1
                                        }}>1</span>
                                      ) : (
                                        <span>1 Frage notiert</span>
                                      )}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => {
                                        if (!isQuestionEditorOpen) {
                                          let textToUse = effectiveViewingQuestion?.hasQuestion ? (effectiveViewingQuestion?.text || '') : '';
                                          if (student?.id) {
                                            try {
                                              const draft = localStorage.getItem(`campus_student_question_draft_${student.id}`);
                                              if (draft !== null && draft !== undefined) {
                                                textToUse = draft;
                                              } else {
                                                const directQ = localStorage.getItem(`campus_student_question_${student.id}`);
                                                if (directQ) textToUse = directQ.trim();
                                              }
                                            } catch {}
                                          }
                                          setQuestionDraftText(textToUse);
                                        }
                                        setIsQuestionEditorOpen(prev => !prev);
                                      }}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '5px',
                                        padding: isMobileView ? '0 9px' : '0 11px',
                                        height: isMobileView ? '36px' : '32px',
                                        minHeight: isMobileView ? '36px' : '32px',
                                        borderRadius: '100px',
                                        border: '1.5px solid #facc15',
                                        background: '#fef08a',
                                        color: '#713f12',
                                        fontSize: '0.74rem',
                                        fontWeight: 800,
                                        whiteSpace: 'nowrap',
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 3px rgba(250, 204, 21, 0.25)',
                                        transition: 'all 0.15s ease',
                                        touchAction: 'manipulation',
                                        WebkitTapHighlightColor: 'transparent',
                                        boxSizing: 'border-box',
                                        flexShrink: 0
                                      }}
                                      className="hover-scale-mini"
                                      title={`Frage an ${effectiveTeacherFullName} stellen`}
                                      aria-label={`Frage an ${effectiveTeacherFullName} stellen`}
                                    >
                                      <HelpCircle size={14} strokeWidth={2.4} color="#713f12" />
                                      <span>Frage?</span>
                                    </button>
                                  )
                                ) : null}

                                 {/* 🔊 0. Didaktischer Audio-Vorlese-Assistent (32px Pill im Header) */}
                                 <button
                                   type="button"
                                   role="button"
                                   tabIndex={0}
                                   onClick={() => {
                                     if (isTtsSpeaking && activeTtsKey === 'global_homework') {
                                       handleStopSpeaking();
                                     } else {
                                       if (hasActiveItems) {
                                         const speechPhrases = buildCompleteWeeklyHomeworkSpeechPhrases({
                                            studentFirstName: student?.first_name || (student?.name ? student.name.split(' ')[0] : undefined),
                                            teacherName: effectiveTeacherFullName,
                                            books: lehrwerkeList.map(lw => ({
                                              title: lw.title,
                                              pages: lw.pages,
                                              notes: lw.notes
                                            })),
                                            songs: otherHWs.map(s => {
                                              const rawArtist = (s.songs?.artist || s.artist || '').trim();
                                              const rawTitle = (s.songs?.title || s.song_title || s.title || '').trim();
                                              const displayTitle = rawTitle ? (rawArtist ? `${rawArtist} - ${rawTitle}` : rawTitle) : (s.topic_name || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
                                              return {
                                                title: displayTitle || 'Song',
                                                note: getCleanPageNotes(s.homework_notes)
                                              };
                                            }),
                                            audioRecordings: audioNotes.map(a => ({
                                              label: a.label || 'Aufnahme'
                                            })),
                                            generalNotes: homeworkNoteItems.length > 0 ? homeworkNoteItems.join('. ') : generalHomeworkNotes
                                          });
                                         handleSpeakText(speechPhrases, 'global_homework');
                                       } else {
                                         const speechPhrases = [
                                           'Bühne frei für deine Musik! Für diese Woche sind noch keine Aufgaben eingetragen. Zeit für freies Üben!'
                                         ];
                                         handleSpeakText(speechPhrases, 'global_homework');
                                       }
                                     }
                                   }}
                                   style={{
                                     background: (isTtsSpeaking && activeTtsKey === 'global_homework') ? '#ef4444' : '#f0fdf4',
                                     border: (isTtsSpeaking && activeTtsKey === 'global_homework') ? '1px solid #dc2626' : '1.5px solid #86efac',
                                     color: (isTtsSpeaking && activeTtsKey === 'global_homework') ? '#ffffff' : '#15803d',
                                     borderRadius: '100px',
                                     height: '32px',
                                     padding: isMobileView ? '0 8px' : '0 11px',
                                     cursor: 'pointer',
                                     display: 'inline-flex',
                                     alignItems: 'center',
                                     gap: '5px',
                                     fontSize: '0.74rem',
                                     fontWeight: 800,
                                     transition: 'all 0.15s ease',
                                     boxShadow: (isTtsSpeaking && activeTtsKey === 'global_homework') 
                                       ? '0 0 0 3px rgba(239, 68, 68, 0.25)' 
                                       : '0 1px 2px rgba(0,0,0,0.02)',
                                     touchAction: 'manipulation',
                                     flexShrink: 0
                                   }}
                                   className="hover-scale-mini"
                                   title={isTtsSpeaking && activeTtsKey === 'global_homework' ? "Vorlesen stoppen" : "Hausaufgabe vorlesen lassen"}
                                   aria-label={isTtsSpeaking && activeTtsKey === 'global_homework' ? "Vorlesen stoppen" : "Hausaufgabe vorlesen lassen"}
                                 >
                                   {isTtsSpeaking && activeTtsKey === 'global_homework' ? (
                                     <>
                                       <VolumeX size={14} strokeWidth={2.4} />
                                       {!isMobileView && <span>Stopp</span>}
                                     </>
                                   ) : (
                                     <>
                                       <Volume2 size={14} color="#15803d" strokeWidth={2.3} />
                                       {!isMobileView && <span>Vorlesen</span>}
                                     </>
                                   )}
                                 </button>

                                {/* ✉️ 1. Direct E-Mail Send Button (32px Icon Pill) */}
                                <button
                                  type="button"
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => handleShareEmail(getActiveWeekExportData())}
                                  style={{
                                    background: '#f8fafc',
                                    border: '1px solid #cbd5e1',
                                    color: '#16a34a',
                                    borderRadius: '100px',
                                    width: isMobileView ? '36px' : '32px',
                                    height: isMobileView ? '36px' : '32px',
                                    minWidth: isMobileView ? '36px' : '32px',
                                    minHeight: isMobileView ? '36px' : '32px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s ease',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                    touchAction: 'manipulation',
                                    WebkitTapHighlightColor: 'transparent',
                                    boxSizing: 'border-box',
                                    flexShrink: 0
                                  }}
                                  className="hover-scale-mini"
                                  title="Wochenplan per E-Mail versenden"
                                  aria-label="Wochenplan per E-Mail versenden"
                                >
                                  <Mail size={15} color="#16a34a" strokeWidth={2.2} />
                                </button>

                                {/* 📋 2. Quick-Copy Icon Button mit Inline-Feedback */}
                                <button
                                  type="button"
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => handleCopyShareLink(getActiveWeekExportData())}
                                  style={{
                                    background: isLinkCopied ? '#f0fdf4' : '#f8fafc',
                                    border: isLinkCopied ? '1px solid #86efac' : '1px solid #cbd5e1',
                                    color: isLinkCopied ? '#16a34a' : '#475569',
                                    borderRadius: '100px',
                                    width: isMobileView ? '36px' : '32px',
                                    height: isMobileView ? '36px' : '32px',
                                    minWidth: isMobileView ? '36px' : '32px',
                                    minHeight: isMobileView ? '36px' : '32px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s ease',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                    touchAction: 'manipulation',
                                    WebkitTapHighlightColor: 'transparent',
                                    boxSizing: 'border-box',
                                    flexShrink: 0
                                  }}
                                  className="hover-scale-mini"
                                  title={isLinkCopied ? 'In Zwischenablage kopiert!' : 'Wochenplan-Text in Zwischenablage kopieren'}
                                  aria-label={isLinkCopied ? 'In Zwischenablage kopiert!' : 'Wochenplan-Text in Zwischenablage kopieren'}
                                >
                                  {isLinkCopied ? (
                                    <Check size={15} color="#16a34a" strokeWidth={2.5} />
                                  ) : (
                                    <Copy size={14} color="#475569" strokeWidth={2.2} />
                                  )}
                                </button>

                                {/* 🖨️ 2b. Air-Gapped Notenständer-Druckversion (DIN-A4) */}
                                <button
                                  type="button"
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => {
                                    const activePayload = getActiveWeekExportData();
                                    if (handlePrintHomeworkSheet) {
                                      handlePrintHomeworkSheet(activePayload);
                                    } else {
                                      window.print();
                                    }
                                  }}
                                  style={{
                                    background: '#f8fafc',
                                    border: '1px solid #cbd5e1',
                                    color: '#475569',
                                    borderRadius: '100px',
                                    width: isMobileView ? '36px' : '32px',
                                    height: isMobileView ? '36px' : '32px',
                                    minWidth: isMobileView ? '36px' : '32px',
                                    minHeight: isMobileView ? '36px' : '32px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s ease',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                    touchAction: 'manipulation',
                                    WebkitTapHighlightColor: 'transparent',
                                    boxSizing: 'border-box',
                                    flexShrink: 0
                                  }}
                                  className="hover-scale-mini"
                                  title="Notenständer-Übeplan drucken (DIN-A4)"
                                  aria-label="Notenständer-Übeplan drucken"
                                >
                                  <Printer size={14} color="#475569" strokeWidth={2.2} />
                                </button>

                                {/* 🔄 3. Destruktives Lehrer-Reset (Hausaufgaben leeren mit Sicherheits-Trenner) */}
                                {(progressItems.some(item => item.is_current_homework) || generalHomeworkNotes.trim() !== '' || isCarriedOverPlan) && !readOnly && (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderLeft: '1px solid #e2e8f0',
                                    paddingLeft: '5px',
                                    marginLeft: '2px'
                                  }}>
                                    <button 
                                      type="button" 
                                      role="button"
                                      tabIndex={0}
                                      onClick={async () => {
                                        await handleResetAllCurrentHomework();
                                        setGeneralHomeworkNotes('');
                                        setIsCarriedOverDismissed(true);
                                      }}
                                      style={{ 
                                        border: '1px solid #fee2e2', 
                                        background: '#fff1f2', 
                                        color: '#ef4444', 
                                        cursor: 'pointer', 
                                        borderRadius: '100px',
                                        width: isMobileView ? '32px' : 'auto',
                                        height: '32px',
                                        minWidth: '32px',
                                        minHeight: '32px',
                                        padding: isMobileView ? 0 : '0 9px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px',
                                        fontSize: '0.74rem',
                                        fontWeight: 750,
                                        transition: 'all 0.15s ease',
                                        touchAction: 'manipulation',
                                        WebkitTapHighlightColor: 'transparent',
                                        boxSizing: 'border-box',
                                        flexShrink: 0
                                      }}
                                      className="hover-scale-mini"
                                      title="Hausaufgaben für diese Woche zurücksetzen"
                                      aria-label="Hausaufgaben für diese Woche zurücksetzen"
                                    >
                                      <RotateCcw size={12} color="#ef4444" strokeWidth={2.3} />
                                      {!isMobileView && <span>Leeren</span>}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>



                            {/* 2. Silent Mode Banner (falls aktiv) */}
                            {isSilentTime && (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                fontSize: '0.76rem',
                                fontWeight: 650,
                                color: forceImmediateDelivery ? '#15803d' : '#64748b',
                                background: forceImmediateDelivery ? '#f0fdf4' : 'transparent',
                                border: forceImmediateDelivery ? '1px solid #bbf7d0' : 'none',
                                borderRadius: forceImmediateDelivery ? '8px' : '0px',
                                padding: forceImmediateDelivery ? '4px 10px' : '3px 0',
                                flexShrink: 0,
                                transition: 'all 0.2s ease'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {forceImmediateDelivery ? (
                                    <Check size={13} color="#15803d" strokeWidth={2.5} />
                                  ) : (
                                    <Moon size={12} color="#64748b" />
                                  )}
                                  <span>
                                    {readOnly
                                      ? 'Nachtruhe aktiv: Keine störenden Benachrichtigungen bis 07:00 Uhr.'
                                      : forceImmediateDelivery
                                        ? 'Sofort-Zustellung aktiv: Schüler wird heute noch benachrichtigt.'
                                        : 'Silent-Modus aktiv: Der Schüler erhält die Aufgabe morgen ab 07:00 Uhr.'}
                                  </span>
                                </div>
                                {!readOnly && (
                                  <button
                                    type="button"
                                    onClick={() => setForceImmediateDelivery(prev => !prev)}
                                    style={{
                                      background: forceImmediateDelivery ? '#ffffff' : '#f1f5f9',
                                      border: forceImmediateDelivery ? '1px solid #86efac' : '1px solid #cbd5e1',
                                      color: forceImmediateDelivery ? '#15803d' : '#475569',
                                      padding: '2px 8px',
                                      borderRadius: '100px',
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease'
                                    }}
                                    className="hover-scale-mini"
                                    title={forceImmediateDelivery ? 'Zurück zu Silent-Modus' : 'Trotz Nachtzeit heute noch freigeben'}
                                  >
                                    {forceImmediateDelivery ? 'Widerrufen' : 'Heute noch zustellen'}
                                  </button>
                                )}
                              </div>
                            )}

                            {/* 3. Schülervorschau-Bühne (Master Stage Box: Der gerahmte Wochen-Fahrplan) */}
                            <div 
                              className="custom-scrollbar"
                              style={{
                                flex: 1,
                                minHeight: isMobileView ? (!hasActiveItems ? '160px' : '120px') : 0,
                                height: isMobileView ? 'auto' : '100%',
                                maxHeight: 'none',
                                overflowY: 'auto',
                                overflowX: 'hidden',
                                WebkitOverflowScrolling: 'touch',
                                background: !hasActiveItems ? 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' : 'linear-gradient(180deg, #fcfdfe 0%, #f8fafc 100%)',
                                border: !hasActiveItems ? '1px solid #e2e8f0' : '1px solid #f1f5f9',
                                borderRadius: isMobileView ? '14px' : '18px',
                                padding: isMobileView ? '12px 10px calc(var(--bottom-bar-height, 68px) + env(safe-area-inset-bottom, 0px) + 32px) 10px' : '14px 16px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'flex-start',
                                alignItems: 'stretch',
                                gap: isMobileView ? '8px' : '10px',
                                boxShadow: !hasActiveItems ? '0 1px 3px rgba(0, 0, 0, 0.02)' : 'inset 0 1px 3px rgba(0, 0, 0, 0.02)'
                              }}
                            >
                              {/* 🎛️ Bühnen-Kopf: Minimaler Corner-Badge ohne Datumsdopplung */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                width: '100%',
                                flexShrink: 0
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {!readOnly ? (
                                    <span 
                                      style={{
                                        fontSize: '0.70rem',
                                        color: '#15803d',
                                        background: '#dcfce7',
                                        border: '1px solid #bbf7d0',
                                        padding: '2px 8px',
                                        height: '24px',
                                        borderRadius: '100px',
                                        fontWeight: 800,
                                        letterSpacing: '0.02em',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                      title="Live-Schülersicht aktiv"
                                      aria-label="Live-Schülersicht aktiv"
                                    >
                                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16a34a' }} />
                                      <span>Live-Schülersicht</span>
                                    </span>
                                  ) : (
                                    <span style={{
                                      fontSize: '0.76rem',
                                      fontWeight: 800,
                                      color: '#16a34a',
                                      letterSpacing: '-0.01em',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px'
                                    }}>
                                      <Music size={13} color="#16a34a" />
                                      <span>Dein Wochen-Fahrplan</span>
                                    </span>
                                  )}
                                 </div>
                              </div>

                              {/* 💬 SCHÜLER-FRAGE FÜR DEN UNTERRICHT (KIDS & JUNIOR GOLDSTANDARD - SOWOHL BEI AUFGABEN ALS AUCH IN FREIEN WOCHEN) */}
                              {readOnly && isQuestionEditorOpen && (
                                <div style={{
                                  background: '#ffffff',
                                  border: '1.5px solid rgba(250, 204, 21, 0.40)',
                                  borderRadius: '20px',
                                  padding: '18px 20px',
                                  boxShadow: '0 8px 24px rgba(250, 204, 21, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '14px'
                                }}>
                                  {/* Header */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <div style={{
                                        width: '38px',
                                        height: '38px',
                                        borderRadius: '12px',
                                        background: 'rgba(250, 204, 21, 0.20)',
                                        border: '1.5px solid rgba(234, 179, 8, 0.40)',
                                        color: '#854d0e',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 2px 8px rgba(250, 204, 21, 0.20)',
                                        flexShrink: 0
                                      }}>
                                        <HelpCircle size={20} />
                                      </div>
                                      <div>
                                        <h3 id="student-question-title" style={{ margin: 0, fontSize: '1.02rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                          Frage für den Unterricht
                                        </h3>
                                        <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                                          Deine Lehrkraft sieht die Frage vor Beginn der Stunde
                                        </span>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => setIsQuestionEditorOpen(false)}
                                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsQuestionEditorOpen(false); } }}
                                      aria-label="Schließen"
                                      title="Schließen"
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
                                      className="hover-scale-mini"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>

                                  {/* Textarea with integrated dictation mic */}
                                  <div style={{ position: 'relative' }}>
                                    <textarea
                                      value={questionDraftText}
                                      onChange={(e) => setQuestionDraftText(e.target.value)}
                                      placeholder="Was möchtest du deinen Lehrer fragen? z. B. Takt 12 Rhythmus unklar, Fingersatz klemmt..."
                                      rows={3}
                                      style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        paddingRight: '46px',
                                        borderRadius: '14px',
                                        border: isListeningSpeech ? '2px solid #ef4444' : '1.5px solid #cbd5e1',
                                        background: isListeningSpeech ? '#fff5f5' : '#f8fafc',
                                        fontSize: '0.90rem',
                                        color: '#0f172a',
                                        fontFamily: 'inherit',
                                        resize: 'none',
                                        boxSizing: 'border-box',
                                        outline: 'none',
                                        transition: 'all 0.2s ease',
                                        lineHeight: 1.45
                                      }}
                                    />

                                    {/* Dictation Mic Button */}
                                    <button
                                      type="button"
                                      role="button"
                                      tabIndex={0}
                                      onClick={toggleSpeechRecognition}
                                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSpeechRecognition(); } }}
                                      title={isListeningSpeech ? "Aufnahme stoppen" : "Frage per Sprache einsprechen"}
                                      aria-label={isListeningSpeech ? "Aufnahme stoppen" : "Frage per Sprache einsprechen"}
                                      style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '10px',
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: isListeningSpeech ? '#ef4444' : '#ffffff',
                                        color: isListeningSpeech ? '#ffffff' : '#854d0e',
                                        border: isListeningSpeech ? 'none' : '1.5px solid #fde047',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: isListeningSpeech ? '0 0 12px rgba(239, 68, 68, 0.5)' : '0 2px 6px rgba(250, 204, 21, 0.20)',
                                        transition: 'all 0.2s ease'
                                      }}
                                      className="hover-scale-mini"
                                    >
                                      <Mic size={16} />
                                    </button>
                                  </div>

                                  {/* Live speech feedback if active */}
                                  {isListeningSpeech && (
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      background: '#fee2e2',
                                      borderRadius: '10px',
                                      padding: '6px 12px',
                                      fontSize: '0.76rem',
                                      fontWeight: 800,
                                      color: '#b91c1c'
                                    }}>
                                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626' }} />
                                      <span>Hört zu... Sprich jetzt deine Frage ein</span>
                                    </div>
                                  )}

                                  {/* Schnell-Chips */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                      Schnell-Bausteine:
                                    </span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                      {[
                                        'Takt unklar',
                                        'Tempo zu schnell',
                                        'Fingersatz klemmt',
                                        'Aufnahme vorspielen'
                                      ].map((chip, idx) => (
                                        <button
                                          key={idx}
                                          type="button"
                                          role="button"
                                          tabIndex={0}
                                          onClick={() => {
                                            setQuestionDraftText((prev: string) => {
                                              const trimmed = (prev || '').trim();
                                              return trimmed ? `${trimmed}, ${chip}` : chip;
                                            });
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault();
                                              setQuestionDraftText((prev: string) => {
                                                const trimmed = (prev || '').trim();
                                                return trimmed ? `${trimmed}, ${chip}` : chip;
                                              });
                                            }
                                          }}
                                          style={{
                                            background: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            padding: '4px 10px',
                                            fontSize: '0.74rem',
                                            fontWeight: 750,
                                            color: '#334155',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                          }}
                                          className="hover-scale-mini"
                                        >
                                          + {chip}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                                    {(questionDraftText.trim() || effectiveViewingQuestion?.hasQuestion) ? (
                                      <button
                                        type="button"
                                        role="button"
                                        tabIndex={0}
                                        onClick={async () => {
                                          try {
                                            if (typeof handleResolveStudentQuestion === 'function') {
                                              await handleResolveStudentQuestion();
                                            }
                                          } catch (err) {
                                            console.error('Error resolving student question:', err);
                                          }
                                          setQuestionDraftText('');
                                          setIsQuestionEditorOpen(false);
                                        }}
                                        onKeyDown={async (e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            try {
                                              if (typeof handleResolveStudentQuestion === 'function') {
                                                await handleResolveStudentQuestion();
                                              }
                                            } catch (err) {
                                              console.error('Error resolving student question:', err);
                                            }
                                            setQuestionDraftText('');
                                            setIsQuestionEditorOpen(false);
                                          }
                                        }}
                                        disabled={isSavingQuestion}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: '#dc2626',
                                          fontSize: '0.80rem',
                                          fontWeight: 800,
                                          cursor: 'pointer',
                                          padding: '6px 8px'
                                        }}
                                        title="Frage löschen"
                                        aria-label="Frage löschen"
                                      >
                                        Frage löschen
                                      </button>
                                    ) : <div />}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <button
                                        type="button"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setIsQuestionEditorOpen(false)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsQuestionEditorOpen(false); } }}
                                        style={{
                                          background: '#f1f5f9',
                                          border: 'none',
                                          borderRadius: '12px',
                                          padding: '8px 16px',
                                          fontSize: '0.84rem',
                                          fontWeight: 800,
                                          color: '#475569',
                                          cursor: 'pointer'
                                        }}
                                        className="hover-scale-mini"
                                      >
                                        Abbrechen
                                      </button>
                                      <button
                                        type="button"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleSaveStudentQuestion(questionDraftText)}
                                        onKeyDown={(e) => {
                                          if ((e.key === 'Enter' || e.key === ' ') && !isSavingQuestion && questionDraftText.trim()) {
                                            e.preventDefault();
                                            handleSaveStudentQuestion(questionDraftText);
                                          }
                                        }}
                                        disabled={isSavingQuestion || !questionDraftText.trim()}
                                        style={{
                                          background: !questionDraftText.trim() ? '#e2e8f0' : '#facc15',
                                          border: 'none',
                                          borderRadius: '12px',
                                          padding: '8px 18px',
                                          fontSize: '0.84rem',
                                          fontWeight: 950,
                                          color: !questionDraftText.trim() ? '#94a3b8' : '#0f172a',
                                          cursor: !questionDraftText.trim() ? 'not-allowed' : 'pointer',
                                          boxShadow: !questionDraftText.trim() ? 'none' : '0 4px 14px rgba(250, 204, 21, 0.35)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          transition: 'all 0.15s ease'
                                        }}
                                        className="hover-scale"
                                      >
                                        {isSavingQuestion ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} strokeWidth={3} />}
                                        <span>{isSavingQuestion ? 'Speichern...' : 'Speichern'}</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {readOnly && !isQuestionEditorOpen && effectiveViewingQuestion?.hasQuestion && (
                                <div style={{
                                  background: '#fffdf0',
                                  border: '1.5px solid #fde047',
                                  borderRadius: '14px',
                                  padding: '8px 12px',
                                  boxShadow: '0 2px 8px rgba(250, 204, 21, 0.12)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: '#facc15',
                                        border: 'none',
                                        color: '#0f172a',
                                        fontSize: '0.70rem',
                                        fontWeight: 850,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.03em',
                                        padding: '2px 8px',
                                        borderRadius: '100px',
                                        boxShadow: '0 1px 3px rgba(250, 204, 21, 0.3)',
                                        flexShrink: 0
                                      }}>
                                        <HelpCircle size={12} color="currentColor" strokeWidth={2.5} />
                                        Frage
                                      </span>
                                      <span style={{
                                        fontSize: '0.90rem',
                                        fontWeight: 700,
                                        color: '#0f172a',
                                        lineHeight: 1.35,
                                        wordBreak: 'break-word'
                                      }}>
                                        „{effectiveViewingQuestion.text}“
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                                      <button
                                        type="button"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleSpeakText(effectiveViewingQuestion.text, 'student_q')}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleSpeakText(effectiveViewingQuestion.text, 'student_q');
                                          }
                                        }}
                                        title="Frage vorlesen"
                                        aria-label="Frage vorlesen"
                                        style={{
                                          border: '1px solid rgba(250, 204, 21, 0.6)',
                                          background: '#ffffff',
                                          color: '#0f172a',
                                          borderRadius: '8px',
                                          width: isMobileView ? '32px' : '28px',
                                          height: isMobileView ? '32px' : '28px',
                                          padding: 0,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          transition: 'all 0.15s ease',
                                          touchAction: 'manipulation'
                                        }}
                                        className="hover-scale-mini"
                                      >
                                        <Volume2 size={14} color="currentColor" />
                                      </button>
                                      <button
                                        type="button"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => {
                                          let textToUse = effectiveViewingQuestion.text;
                                          if (student?.id) {
                                            try {
                                              const draft = localStorage.getItem(`campus_student_question_draft_${student.id}`);
                                              if (draft !== null && draft !== undefined) textToUse = draft;
                                            } catch {}
                                          }
                                          setQuestionDraftText(textToUse);
                                          setIsQuestionEditorOpen(true);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            let textToUse = effectiveViewingQuestion.text;
                                            if (student?.id) {
                                              try {
                                                const draft = localStorage.getItem(`campus_student_question_draft_${student.id}`);
                                                if (draft !== null && draft !== undefined) textToUse = draft;
                                              } catch {}
                                            }
                                            setQuestionDraftText(textToUse);
                                            setIsQuestionEditorOpen(true);
                                          }
                                        }}
                                        title="Frage bearbeiten"
                                        aria-label="Frage bearbeiten"
                                        style={{
                                          border: '1px solid rgba(250, 204, 21, 0.6)',
                                          background: '#ffffff',
                                          color: '#0f172a',
                                          borderRadius: '8px',
                                          width: isMobileView ? '32px' : '28px',
                                          height: isMobileView ? '32px' : '28px',
                                          padding: 0,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          transition: 'all 0.15s ease',
                                          touchAction: 'manipulation'
                                        }}
                                        className="hover-scale-mini"
                                      >
                                        <Edit3 size={14} color="currentColor" />
                                      </button>

                                      {/* 🛡️ Fail-Safe 2-Schritt Lösch-Schutz */}
                                      {isConfirmingResolveQuestion ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <button
                                            type="button"
                                            role="button"
                                            tabIndex={0}
                                            onClick={async () => {
                                              setIsConfirmingResolveQuestion(false);
                                              await handleResolveStudentQuestion();
                                            }}
                                            onKeyDown={async (e) => {
                                              if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setIsConfirmingResolveQuestion(false);
                                                await handleResolveStudentQuestion();
                                              }
                                            }}
                                            title="Löschen bestätigen"
                                            aria-label="Löschen bestätigen"
                                            style={{
                                              border: 'none',
                                              background: '#dc2626',
                                              color: '#ffffff',
                                              borderRadius: '8px',
                                              height: isMobileView ? '32px' : '28px',
                                              padding: '0 8px',
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              fontSize: '0.72rem',
                                              fontWeight: 800,
                                              boxShadow: '0 1px 4px rgba(220, 38, 38, 0.3)',
                                              touchAction: 'manipulation'
                                            }}
                                            className="hover-scale-mini"
                                          >
                                            <Check size={12} strokeWidth={3} />
                                            <span>Löschen?</span>
                                          </button>
                                          <button
                                            type="button"
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => setIsConfirmingResolveQuestion(false)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setIsConfirmingResolveQuestion(false);
                                              }
                                            }}
                                            title="Abbrechen"
                                            aria-label="Abbrechen"
                                            style={{
                                              border: '1px solid #cbd5e1',
                                              background: '#ffffff',
                                              color: '#64748b',
                                              borderRadius: '8px',
                                              width: isMobileView ? '32px' : '28px',
                                              height: isMobileView ? '32px' : '28px',
                                              padding: 0,
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              touchAction: 'manipulation'
                                            }}
                                            className="hover-scale-mini"
                                          >
                                            <X size={13} strokeWidth={2.4} />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          role="button"
                                          tabIndex={0}
                                          onClick={() => setIsConfirmingResolveQuestion(true)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault();
                                              setIsConfirmingResolveQuestion(true);
                                            }
                                          }}
                                          title="Frage löschen oder als erledigt markieren"
                                          aria-label="Frage löschen oder als erledigt markieren"
                                          style={{
                                            border: '1px solid rgba(254, 202, 202, 0.8)',
                                            background: 'rgba(254, 226, 226, 0.7)',
                                            color: '#dc2626',
                                            borderRadius: '8px',
                                            width: isMobileView ? '32px' : '28px',
                                            height: isMobileView ? '32px' : '28px',
                                            padding: 0,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.15s ease',
                                            touchAction: 'manipulation'
                                          }}
                                          className="hover-scale-mini"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div style={{
                                    fontSize: '0.74rem',
                                    fontWeight: 650,
                                    color: '#854d0e',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    paddingLeft: '2px'
                                  }}>
                                    <Sparkles size={11} color="#ca8a04" />
                                    <span>Für {effectiveTeacherFullName} zur nächsten Stunde vorgemerkt</span>
                                  </div>
                                </div>
                              )}

                              {/* 🍎 LEHRKRAFT-BANNER: Prominenter Schülerfrage-Hinweis */}
                              {!readOnly && effectiveViewingQuestion?.hasQuestion && (
                                <div style={{
                                  background: '#fffbeb',
                                  border: '1.5px solid #fcd34d',
                                  borderRadius: '16px',
                                  padding: '12px 16px',
                                  boxShadow: '0 3px 10px rgba(217, 119, 6, 0.08)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '12px',
                                  flexWrap: 'wrap'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0, flex: 1 }}>
                                    <div style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '10px',
                                      background: '#fef3c7',
                                      color: '#d97706',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0
                                    }}>
                                      <HelpCircle size={18} strokeWidth={2.5} />
                                    </div>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.80rem', fontWeight: 900, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                          Schülerfrage von {student.first_name} {maskLastName(student.last_name)}
                                        </span>
                                        {effectiveViewingQuestion.timestamp && (
                                          <span style={{ fontSize: '0.66rem', color: '#92400e', opacity: 0.8 }}>
                                            • {new Date(effectiveViewingQuestion.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#78350f', marginTop: '3px', lineHeight: 1.5 }}>
                                        „{effectiveViewingQuestion.text}“
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                    <button
                                      type="button"
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => handleSpeakText(effectiveViewingQuestion.text, 'teacher_view_student_q')}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          handleSpeakText(effectiveViewingQuestion.text, 'teacher_view_student_q');
                                        }
                                      }}
                                      title="Frage vorlesen"
                                      aria-label="Frage vorlesen"
                                      style={{
                                        border: '1px solid #fde68a',
                                        background: '#ffffff',
                                        color: '#b45309',
                                        borderRadius: '8px',
                                        padding: '6px 9px',
                                        minHeight: '34px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center'
                                      }}
                                    >
                                      <Volume2 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      role="button"
                                      tabIndex={0}
                                      onClick={handleResolveStudentQuestion}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          handleResolveStudentQuestion();
                                        }
                                      }}
                                      style={{
                                        background: '#16a34a',
                                        color: '#ffffff',
                                        border: 'none',
                                        padding: '6px 14px',
                                        minHeight: '34px',
                                        borderRadius: '100px',
                                        fontSize: '0.82rem',
                                        fontWeight: 850,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
                                      }}
                                      className="hover-scale-mini"
                                      title="Als im Unterricht besprochen markieren"
                                    >
                                      <Check size={14} strokeWidth={2.5} />
                                      <span>Im Unterricht besprochen</span>
                                    </button>
                                  </div>
                                </div>
                              )}

                              {!hasActiveItems ? (
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flex: 1,
                                  gap: isMobileView ? '8px' : '10px',
                                  padding: isMobileView ? '16px 8px' : '20px 12px',
                                  width: '100%',
                                  maxWidth: '460px',
                                  margin: '0 auto',
                                  textAlign: 'center'
                                }}>
                                  {/* Campus Musik-Bühne Visual: Kompaktes 46x46px Campus-Notenheft */}
                                  <div style={{
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '14px',
                                    background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                                    border: '1px solid #86efac',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.15)'
                                  }}>
                                    <Music size={22} color="#15803d" strokeWidth={2.4} />
                                  </div>

                                  {/* Motivierendes Wording im Campus-Modul */}
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', maxWidth: '420px' }}>
                                    <span style={{
                                      fontSize: isMobileView ? '0.92rem' : '0.98rem',
                                      color: '#0f172a',
                                      fontWeight: 800,
                                      letterSpacing: '-0.01em',
                                      lineHeight: 1.25
                                    }}>
                                      {isPastWeek
                                        ? (isMobileView ? `Unterrichtsfreie Woche` : `Keine Aufgaben archiviert`)
                                        : `Bühne frei für deine Musik! 🎶`}
                                    </span>
                                    <span style={{
                                      fontSize: isMobileView ? '0.72rem' : '0.76rem',
                                      color: '#64748b',
                                      fontWeight: 550,
                                      lineHeight: 1.4
                                    }}>
                                      {isPastWeek
                                        ? 'In dieser Woche wurden keine Übungen oder Notizen hinterlegt.'
                                        : 'Für diese Woche sind noch keine Aufgaben eingetragen. Zeit für freies Üben!'}
                                    </span>
                                  </div>

                                  {isPastWeek && (
                                    <button
                                      type="button"
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => setViewingWeekOffset(0)}
                                      style={{
                                        padding: '0 12px',
                                        height: '28px',
                                        borderRadius: '100px',
                                        background: '#0f172a',
                                        color: '#ffffff',
                                        border: 'none',
                                        fontSize: '0.72rem',
                                        fontWeight: 750,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.18)',
                                        transition: 'all 0.15s ease',
                                        touchAction: 'manipulation'
                                      }}
                                      className="hover-scale-mini"
                                    >
                                      <RotateCcw size={11} strokeWidth={2.4} />
                                      <span>Zurück zur aktuellen Woche</span>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  {/* Lehrwerke Books */}
                                  {lehrwerkeList.map((item, idx) => {
                                    const bookColor = getLehrwerkColor(item.title);
                                    const bookObj = globalLehrwerke.find(b => b.title === item.title);
                                    const assignedBook = bookObj ? assignedLehrwerke.find(a => a.lehrwerkId === bookObj.id) : null;
                                    
                                    const pagesWithNotes = assignedBook ? item.pages.filter((p: number) => {
                                      const pState = assignedBook.pageStates?.[p];
                                      if (pState && getCleanPageNotes(pState.homeworkNotes || pState.homework_notes) !== '') return true;
                                      const dbItem = deduplicatedItems.find((x: any) => x.topic_name === `${item.title} - Seite ${p}`);
                                      if (dbItem && getCleanPageNotes(dbItem.homework_notes) !== '') return true;
                                      return false;
                                    }) : [];

                                    const pagesGerman = formatPageNumbersGerman(item.pages);
                                    const bookNotesPhrases = pagesWithNotes.map((p: number) => {
                                      const pState = assignedBook?.pageStates?.[p];
                                      let noteText = getCleanPageNotes(pState?.homeworkNotes || pState?.homework_notes);
                                      if (!noteText) {
                                        const dbItem = deduplicatedItems.find((x: any) => x.topic_name === `${item.title} - Seite ${p}`);
                                        if (dbItem?.homework_notes) noteText = getCleanPageNotes(dbItem.homework_notes);
                                      }
                                      const parsedAnn = parseStudentAnnotation(noteText, studentFirstName, isTeacherMode);
                                      return parsedAnn.cleanText ? `Seite ${p}: ${parsedAnn.cleanText}` : '';
                                    }).filter(Boolean);
                                    const bookSpeechText = [`Lehrwerk: ${item.title}, ${pagesGerman}.`, ...bookNotesPhrases].join(' ');
                                    const isSpeakingThisBook = isTtsSpeaking && activeTtsKey === `book_head_${item.title}`;

                                    return (
                                      <div key={`lw-${idx}`} style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        paddingBottom: idx < lehrwerkeList.length - 1 || otherHWs.length > 0 ? '10px' : '0',
                                        borderBottom: idx < lehrwerkeList.length - 1 || otherHWs.length > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none'
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                          <div
                                            onClick={() => {
                                              if (bookObj) {
                                                setActiveLehrwerkId(bookObj.id);
                                                if (item.pages[0]) selectTextbookPage(bookObj.id, item.pages[0]);
                                                setActiveSubView('lehrwerk');
                                              }
                                            }}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '8px',
                                              minWidth: 0,
                                              flex: 1,
                                              cursor: bookObj ? 'pointer' : 'default',
                                              opacity: isFutureWeek ? 0.38 : 1,
                                              transition: 'opacity 0.15s ease'
                                            }}
                                          >
                                            <div style={{
                                              width: '26px',
                                              height: '30px',
                                              background: `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})`,
                                              borderRadius: '6px',
                                              flexShrink: 0,
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                                            }}>
                                              <BookOpen size={13} color={bookColor.text} />
                                            </div>
                                            <span style={{
                                              fontSize: '0.96rem',
                                              fontWeight: 850,
                                              color: '#0f172a',
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              whiteSpace: 'nowrap'
                                            }}>
                                              {item.title}
                                            </span>
                                          </div>

                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                            {readOnly ? (
                                              /* Kompakte zusammenhängende Seiten- & Übungs-Pille für Schüler */
                                              (() => {
                                                const activeHwExercises = assignedBook
                                                  ? item.pages.flatMap((p: number) => {
                                                      const pState = assignedBook.pageStates?.[p];
                                                      return (pState?.exercises || [])
                                                        .filter((e: any) => e.status === 'homework')
                                                        .map((e: any) => e.label.replace(/^(?:Nr\.|Üb\.|Übung)\s*/i, '').trim());
                                                    })
                                                  : [];
                                                const pagesLabel = formatPageNumbers(item.pages);
                                                const pillText = activeHwExercises.length > 0
                                                  ? `${pagesLabel} • Nr. ${activeHwExercises.slice(0, 3).join(', ')}${activeHwExercises.length > 3 ? '…' : ''}`
                                                  : pagesLabel;
                                                return (
                                                  <span
                                                    onClick={() => {
                                                      if (bookObj) {
                                                        setActiveLehrwerkId(bookObj.id);
                                                        if (item.pages[0]) selectTextbookPage(bookObj.id, item.pages[0]);
                                                        setActiveSubView('lehrwerk');
                                                      }
                                                    }}
                                                    aria-label={formatPageNumbersGerman(item.pages)}
                                                    title={`${formatPageNumbersGerman(item.pages)} öffnen`}
                                                    style={{
                                                      fontSize: '0.82rem',
                                                      fontWeight: 850,
                                                      color: '#15803d',
                                                      background: '#dcfce7',
                                                      padding: '4px 11px',
                                                      borderRadius: '99px',
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      letterSpacing: '-0.01em',
                                                      opacity: isFutureWeek ? 0.45 : 1,
                                                      cursor: bookObj ? 'pointer' : 'default',
                                                      transition: 'all 0.15s ease'
                                                    }}
                                                    className="tactile-btn hover-scale-mini"
                                                  >
                                                    {pillText}
                                                  </span>
                                                );
                                              })()
                                            ) : (
                                              /* Granular Page Badges for Teachers (mit Einzelseiten-Löschen) */
                                              <div style={{
                                                display: 'flex',
                                                gap: '4px',
                                                flexWrap: 'wrap',
                                                opacity: isFutureWeek ? 0.45 : 1,
                                                transition: 'opacity 0.15s ease'
                                              }}>
                                                {item.pages.map((p: number) => (
                                                  <span key={`p-pill-${p}`} style={{
                                                    fontSize: '0.80rem',
                                                    fontWeight: 850,
                                                    color: '#15803d',
                                                    background: '#dcfce7',
                                                    padding: '3px 8px',
                                                    borderRadius: '99px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                  }}>
                                                    S. {p}
                                                  </span>
                                                ))}
                                              </div>
                                            )}

                                            {/* 🔊 0.1% Goldstandard Lehrwerk-Vorlese-Button (BFSG 2025 & WCAG 2.2 AA) */}
                                            <button
                                              type="button"
                                              role="button"
                                              tabIndex={0}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (isSpeakingThisBook) {
                                                  handleStopSpeaking();
                                                } else {
                                                  handleSpeakText(bookSpeechText, `book_head_${item.title}`);
                                                }
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  if (isSpeakingThisBook) {
                                                    handleStopSpeaking();
                                                  } else {
                                                    handleSpeakText(bookSpeechText, `book_head_${item.title}`);
                                                  }
                                                }
                                              }}
                                              title={isSpeakingThisBook ? "Vorlesen stoppen" : `Lehrwerk ${item.title} vorlesen`}
                                              aria-label={isSpeakingThisBook ? "Vorlesen stoppen" : `Lehrwerk ${item.title} vorlesen`}
                                              style={{
                                                border: isSpeakingThisBook ? '1px solid #86efac' : '1px solid #cbd5e1',
                                                background: isSpeakingThisBook ? '#dcfce7' : '#ffffff',
                                                color: isSpeakingThisBook ? '#15803d' : '#64748b',
                                                borderRadius: '8px',
                                                width: '26px',
                                                height: '26px',
                                                minWidth: '26px',
                                                minHeight: '26px',
                                                padding: 0,
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.15s ease',
                                                boxShadow: isSpeakingThisBook ? '0 0 0 2px rgba(34, 197, 94, 0.2)' : '0 1px 2px rgba(0,0,0,0.02)',
                                                touchAction: 'manipulation',
                                                flexShrink: 0
                                              }}
                                              className="hover-scale-mini"
                                            >
                                              {isSpeakingThisBook ? (
                                                <VolumeX size={13} strokeWidth={2.4} />
                                              ) : (
                                                <Volume2 size={13} strokeWidth={2.2} />
                                              )}
                                            </button>
                                          </div>
                                        </div>

                                        {/* Specific Page Notes (Frameless Editorial Flow + Micro TTS Speaker Pill) */}
                                        {pagesWithNotes.map((p: number) => {
                                          const pState = assignedBook?.pageStates?.[p];
                                          let noteText = getCleanPageNotes(pState?.homeworkNotes || pState?.homework_notes);
                                          if (!noteText) {
                                            const dbItem = deduplicatedItems.find((x: any) => x.topic_name === `${item.title} - Seite ${p}`);
                                            if (dbItem?.homework_notes) {
                                              noteText = getCleanPageNotes(dbItem.homework_notes);
                                            }
                                          }
                                          const isSpeakingThis = isTtsSpeaking && activeTtsKey === `book_note_${item.title}_${p}`;

                                          const parsedAnn = parseStudentAnnotation(noteText, studentFirstName, isTeacherMode);
                                          if (readOnly && parsedAnn.isSpecificToAnother) return null;

                                          return (
                                            <div key={`p-note-${p}`} style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              gap: '8px',
                                              fontSize: '0.88rem',
                                              lineHeight: 1.5,
                                              padding: '5px 8px',
                                              marginLeft: '32px',
                                              borderRadius: '8px',
                                              background: isSpeakingThis ? '#dcfce7' : (parsedAnn.isSpecificToCurrent ? '#f0fdf4' : 'transparent'),
                                              border: parsedAnn.isSpecificToCurrent ? '1px solid #86efac' : 'none',
                                              opacity: isFutureWeek ? 0.38 : 1,
                                              transition: 'all 0.15s ease'
                                            }}>
                                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', minWidth: 0 }}>
                                                <span style={{ fontWeight: 850, color: '#e11d48', flexShrink: 0, fontSize: '0.88rem' }}>S. {p}:</span>
                                                {parsedAnn.isSpecificToCurrent && (
                                                  <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    background: '#dcfce7',
                                                    color: '#15803d',
                                                    border: '1px solid #86efac',
                                                    borderRadius: '6px',
                                                    padding: '2px 6px',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 800,
                                                    flexShrink: 0
                                                  }}>
                                                    <Target size={11} strokeWidth={2.4} />
                                                    <span>Für dich</span>
                                                  </span>
                                                )}
                                                {isTeacherMode && parsedAnn.targetStudentName && parsedAnn.targetStudentName !== 'Alle' && (
                                                  <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    background: '#ede9fe',
                                                    color: '#6d28d9',
                                                    border: '1px solid #c4b5fd',
                                                    borderRadius: '6px',
                                                    padding: '2px 6px',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 800,
                                                    flexShrink: 0
                                                  }}>
                                                    <User size={11} strokeWidth={2.4} />
                                                    <span>@{parsedAnn.targetStudentName}</span>
                                                  </span>
                                                )}
                                                <span style={{ fontSize: '0.88rem', lineHeight: 1.5, fontWeight: parsedAnn.isSpecificToCurrent ? 650 : 550, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                  {parsedAnn.cleanText}
                                                </span>
                                              </div>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSpeakText(`Seite ${p}: ${parsedAnn.cleanText}`, `book_note_${item.title}_${p}`);
                                                  }}
                                                  style={{
                                                    border: 'none',
                                                    background: isSpeakingThis ? '#bbf7d0' : 'none',
                                                    color: isSpeakingThis ? '#15803d' : '#94a3b8',
                                                    cursor: 'pointer',
                                                    padding: '2px 4px',
                                                    borderRadius: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    transition: 'transform 0.15s ease'
                                                  }}
                                                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                                                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                                                  title="Notiz vorlesen"
                                                >
                                                  <Volume2 size={13} strokeWidth={2.4} />
                                                </button>

                                                {!readOnly && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDeletePageNote(item.title, p)}
                                                    style={{
                                                      border: 'none',
                                                      background: 'none',
                                                      color: '#94a3b8',
                                                      cursor: 'pointer',
                                                      fontSize: '0.70rem',
                                                      fontWeight: 800,
                                                      padding: '2px'
                                                    }}
                                                    className="hover-scale-mini"
                                                    title="Notiz löschen"
                                                  >
                                                    ✕
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  })}

                                  {/* Songs List */}
                                  {(() => {
                                    const deduplicatedOtherHWs = otherHWs.reduce<any[]>((acc, cur) => {
                                      if (!acc.some(existing => areSongsIdentical(existing, cur))) {
                                        acc.push(cur);
                                      }
                                      return acc;
                                    }, []);
                                    if (deduplicatedOtherHWs.length === 0) return null;
                                    return (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {deduplicatedOtherHWs.map((item, idx) => {
                                          const songNote = getCleanPageNotes(item.homework_notes);
                                          const songInfo = extractSongArtistAndTitle(item);
                                          const cleanSongDisplayTitle = item.topic_name.replace(/\s*\([^)]*\)\s*$/, '').replace(/linken park/gi, 'Linkin Park');
                                          const songTitle = songInfo.displayTitle || formatDisplayTitle(cleanSongDisplayTitle) || songInfo.title;
                                          const songArtist = songInfo.displayArtist || formatDisplayTitle(songInfo.artist) || '';
                                          const songColor = getSongColor(songTitle);
                                          const isSpeakingThisSongRow = isTtsSpeaking && activeTtsKey === `song_head_${idx}`;
                                          const isSpeakingThisSong = isTtsSpeaking && activeTtsKey === `song_note_${idx}`;
                                          const songSpeechText = songNote ? `Song: ${songTitle}${songArtist ? ' von ' + songArtist : ''}. Fahrplan: ${songNote}` : `Song: ${songTitle}${songArtist ? ' von ' + songArtist : ''}.`;

                                          return (
                                            <div key={`song-hw-${idx}`} style={{
                                              display: 'flex',
                                              flexDirection: 'column',
                                              gap: '6px',
                                              paddingBottom: idx < deduplicatedOtherHWs.length - 1 ? '10px' : '0',
                                              borderBottom: idx < deduplicatedOtherHWs.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none'
                                            }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                              <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                minWidth: 0,
                                                opacity: isFutureWeek ? 0.38 : 1,
                                                transition: 'opacity 0.15s ease'
                                              }}>
                                                <div style={{
                                                  width: '28px',
                                                  height: '28px',
                                                  borderRadius: '8px',
                                                  background: `linear-gradient(135deg, ${songColor.from}, ${songColor.to})`,
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  color: songColor.text || '#0f172a',
                                                  boxShadow: `0 2px 6px ${songColor.shadowFrom || 'rgba(0,0,0,0.06)'}`,
                                                  border: '1px solid rgba(255, 255, 255, 0.85)',
                                                  flexShrink: 0
                                                }}>
                                                  <Music size={14} strokeWidth={2.4} />
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                                                  <span style={{
                                                    fontSize: '0.95rem',
                                                    fontWeight: 850,
                                                    color: '#0f172a',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    lineHeight: 1.25
                                                  }}>
                                                    {songTitle}
                                                    {songArtist && (
                                                      <span style={{ fontWeight: 650, color: '#64748b', marginLeft: '6px' }}>
                                                        · {songArtist}
                                                      </span>
                                                    )}
                                                  </span>
                                                </div>
                                              </div>

                                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                {/* 🔊 0.1% Goldstandard Song-Vorlese-Button (BFSG 2025 & WCAG 2.2 AA) */}
                                                <button
                                                  type="button"
                                                  role="button"
                                                  tabIndex={0}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isSpeakingThisSongRow) {
                                                      handleStopSpeaking();
                                                    } else {
                                                      handleSpeakText(songSpeechText, `song_head_${idx}`);
                                                    }
                                                  }}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      if (isSpeakingThisSongRow) {
                                                        handleStopSpeaking();
                                                      } else {
                                                        handleSpeakText(songSpeechText, `song_head_${idx}`);
                                                      }
                                                    }
                                                  }}
                                                  title={isSpeakingThisSongRow ? "Vorlesen stoppen" : `Song ${cleanSongDisplayTitle} vorlesen`}
                                                  aria-label={isSpeakingThisSongRow ? "Vorlesen stoppen" : `Song ${cleanSongDisplayTitle} vorlesen`}
                                                  style={{
                                                    border: isSpeakingThisSongRow ? '1px solid #86efac' : '1px solid #cbd5e1',
                                                    background: isSpeakingThisSongRow ? '#dcfce7' : '#ffffff',
                                                    color: isSpeakingThisSongRow ? '#15803d' : '#64748b',
                                                    borderRadius: '8px',
                                                    width: '26px',
                                                    height: '26px',
                                                    minWidth: '26px',
                                                    minHeight: '26px',
                                                    padding: 0,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.15s ease',
                                                    boxShadow: isSpeakingThisSongRow ? '0 0 0 2px rgba(34, 197, 94, 0.2)' : '0 1px 2px rgba(0,0,0,0.02)',
                                                    touchAction: 'manipulation',
                                                    flexShrink: 0
                                                  }}
                                                  className="hover-scale-mini"
                                                >
                                                  {isSpeakingThisSongRow ? (
                                                    <VolumeX size={13} strokeWidth={2.4} />
                                                  ) : (
                                                    <Volume2 size={13} strokeWidth={2.2} />
                                                  )}
                                                </button>
                                              </div>
                                            </div>

                                            {/* Specific Song Practice Note (Frameless Editorial Flow + Micro TTS Speaker Pill) */}
                                            {songNote ? (() => {
                                              const parsedAnn = parseStudentAnnotation(songNote, studentFirstName, isTeacherMode);
                                              if (readOnly && parsedAnn.isSpecificToAnother) return null;

                                              return (
                                                <div style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'space-between',
                                                  gap: '8px',
                                                  fontSize: '0.88rem',
                                                  lineHeight: 1.5,
                                                  padding: '5px 8px',
                                                  marginLeft: '32px',
                                                  borderRadius: '8px',
                                                  background: isSpeakingThisSong ? '#e0e7ff' : (parsedAnn.isSpecificToCurrent ? '#f0fdf4' : 'transparent'),
                                                  border: parsedAnn.isSpecificToCurrent ? '1px solid #86efac' : 'none',
                                                  opacity: isFutureWeek ? 0.38 : 1,
                                                  transition: 'all 0.15s ease'
                                                }}>
                                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', minWidth: 0 }}>
                                                    <span style={{ fontWeight: 850, color: '#4f46e5', flexShrink: 0, fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                      <Pin size={11} strokeWidth={2.4} />
                                                      <span>Fahrplan:</span>
                                                    </span>
                                                    {parsedAnn.isSpecificToCurrent && (
                                                      <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '3px',
                                                        background: '#dcfce7',
                                                        color: '#15803d',
                                                        border: '1px solid #86efac',
                                                        borderRadius: '6px',
                                                        padding: '2px 6px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 800,
                                                        flexShrink: 0
                                                      }}>
                                                        <Target size={11} strokeWidth={2.4} />
                                                        <span>Für dich</span>
                                                      </span>
                                                    )}
                                                    {isTeacherMode && parsedAnn.targetStudentName && parsedAnn.targetStudentName !== 'Alle' && (
                                                      <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '3px',
                                                        background: '#ede9fe',
                                                        color: '#6d28d9',
                                                        border: '1px solid #c4b5fd',
                                                        borderRadius: '6px',
                                                        padding: '2px 6px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 800,
                                                        flexShrink: 0
                                                      }}>
                                                        <User size={11} strokeWidth={2.4} />
                                                        <span>@{parsedAnn.targetStudentName}</span>
                                                      </span>
                                                    )}
                                                    <span style={{ fontSize: '0.88rem', lineHeight: 1.5, fontWeight: parsedAnn.isSpecificToCurrent ? 650 : 550, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                      {renderTextWithDidacticBadges(parsedAnn.cleanText)}
                                                    </span>
                                                  </div>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleSpeakText(`Fahrplan für ${item.topic_name.replace(/\s*\([^)]*\)\s*$/, '')}: ${parsedAnn.cleanText}`, `song_note_${idx}`);
                                                    }}
                                                    style={{
                                                      border: 'none',
                                                      background: isSpeakingThisSong ? '#c7d2fe' : 'none',
                                                      color: isSpeakingThisSong ? '#4338ca' : '#94a3b8',
                                                      cursor: 'pointer',
                                                      padding: '2px 4px',
                                                      borderRadius: '4px',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      flexShrink: 0,
                                                      transition: 'transform 0.15s ease'
                                                    }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                                                    title="Fahrplan vorlesen"
                                                  >
                                                    <Volume2 size={13} strokeWidth={2.4} />
                                                  </button>
                                                </div>
                                              );
                                            })() : null}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}

                                  {/* Audio Badges in Live Preview */}
                                  {audioNotes.length > 0 && (
                                    <div style={{ paddingTop: '2px' }}>
                                      <AudioTrackCarousel
                                        tracks={audioNotes}
                                        onDelete={!readOnly && !isAudioCarriedOver ? handleDeleteNote : undefined}
                                        readOnly={readOnly || isAudioCarriedOver}
                                        isFutureWeek={isFutureWeek}
                                        isTeacher={!readOnly}
                                        activeTopicContext={topicName}
                                        defaultExpanded={false}
                                        isCarriedOver={isAudioCarriedOver}
                                        hideCarriedOverBadge={true}
                                        uiLevel={uiLevel}
                                      />
                                    </div>
                                  )}

                                  {/* Individual Schnelltext / Notes Items in Schülervorschau Stage Box */}
                                  {homeworkNoteItems.length > 0 && (
                                    <div style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '6px',
                                      paddingTop: (lehrwerkeList.length > 0 || otherHWs.length > 0 || audioNotes.length > 0) ? '6px' : '0',
                                      borderTop: (lehrwerkeList.length > 0 || otherHWs.length > 0 || audioNotes.length > 0) ? '1px dashed #e2e8f0' : 'none'
                                    }}>
                                      {homeworkNoteItems
                                        .filter(item => {
                                          if (!item || typeof item !== 'string') return false;
                                          if (isInternalMetadataNote(item)) return false;
                                          const lower = item.toLowerCase();
                                          if (lower.startsWith('latency:') || lower.startsWith('latency_calibration:') || item.startsWith('SYSTEM:') || item.startsWith('STICKER:') || item.startsWith('AUDIO:') || item.startsWith('LOOP:')) return false;

                                          // 👥 DUO & GRUPPENUNTERRICHT: If in student mode (readOnly), filter out notes explicitly targeted to a different student
                                          if (readOnly) {
                                            const parsedAnn = parseStudentAnnotation(item, studentFirstName, false);
                                            if (parsedAnn.isSpecificToAnother) {
                                              return false;
                                            }
                                          }

                                          return !selectedCategoryFilter || item.toLowerCase().includes(selectedCategoryFilter.toLowerCase());
                                        })
                                        .map((noteItem, nIdx) => {
                                          const isSpeakingThisNote = isTtsSpeaking && activeTtsKey === `general_note_${nIdx}`;
                                          const parsedAnn = parseStudentAnnotation(noteItem, studentFirstName, isTeacherMode);
                                          const currentTag = DIDACTIC_QUICK_TAGS.find(t => noteItem.includes(t.tag));
                                          const cleanNoteText = currentTag 
                                            ? parsedAnn.cleanText.replace(new RegExp(`\\s*${currentTag.tag.replace('#', '\\#')}`, 'g'), '').trim() 
                                            : parsedAnn.cleanText;
                                          const isPickerOpen = activeTagPickerRowIndex === nIdx;

                                          return (
                                            <div
                                              key={`hw-note-row-${nIdx}`}
                                              style={{
                                                position: 'relative',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '10px',
                                                padding: '8px 12px',
                                                borderRadius: '10px',
                                                background: isSpeakingThisNote ? '#dcfce7' : (parsedAnn.isSpecificToCurrent ? '#f0fdf4' : '#ffffff'),
                                                border: parsedAnn.isSpecificToCurrent ? '1px solid #86efac' : '1px solid #e2e8f0',
                                                boxShadow: parsedAnn.isSpecificToCurrent ? '0 2px 6px rgba(34, 197, 94, 0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
                                                transition: 'all 0.15s ease'
                                              }}
                                            >
                                              <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                minWidth: 0,
                                                flex: 1,
                                                opacity: isFutureWeek ? 0.38 : 1,
                                                transition: 'opacity 0.15s ease'
                                              }}>
                                                <FileText size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                                                
                                                {/* Personal Badge if targeted to current student */}
                                                {parsedAnn.isSpecificToCurrent && (
                                                  <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    background: '#dcfce7',
                                                    color: '#15803d',
                                                    border: '1px solid #86efac',
                                                    borderRadius: '8px',
                                                    padding: '2px 7px',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 800,
                                                    flexShrink: 0
                                                  }}>
                                                    <span>🎯</span>
                                                    <span>Für dich ({studentFirstName})</span>
                                                  </span>
                                                )}

                                                {/* Teacher view badge if note has specific student tag */}
                                                {isTeacherMode && parsedAnn.targetStudentName && parsedAnn.targetStudentName !== 'Alle' && (
                                                  <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    background: '#ede9fe',
                                                    color: '#6d28d9',
                                                    border: '1px solid #c4b5fd',
                                                    borderRadius: '8px',
                                                    padding: '2px 7px',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 800,
                                                    flexShrink: 0
                                                  }}>
                                                    <span>👤</span>
                                                    <span>@{parsedAnn.targetStudentName}</span>
                                                  </span>
                                                )}

                                                {/* Group badge if @Alle */}
                                                {parsedAnn.targetStudentName === 'Alle' && (
                                                  <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    background: '#f1f5f9',
                                                    color: '#475569',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '8px',
                                                    padding: '2px 7px',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 800,
                                                    flexShrink: 0
                                                  }}>
                                                    <span>👥</span>
                                                    <span>@Alle</span>
                                                  </span>
                                                )}

                                                <span style={{
                                                  color: '#1e293b',
                                                  fontWeight: parsedAnn.isSpecificToCurrent ? 750 : 650,
                                                  fontSize: '0.88rem',
                                                  lineHeight: 1.5,
                                                  overflow: 'hidden',
                                                  textOverflow: 'ellipsis',
                                                  whiteSpace: 'nowrap'
                                                }}>
                                                  {cleanNoteText ? (cleanNoteText.charAt(0).toUpperCase() + cleanNoteText.slice(1)) : ''}
                                                </span>
                                              </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                              {/* Contextual Inline Tag Picker / Badge */}
                                              {!readOnly && !isNotesCarriedOver ? (
                                                <div style={{ position: 'relative' }}>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setActiveTagPickerRowIndex(isPickerOpen ? null : nIdx);
                                                    }}
                                                    style={{
                                                      border: currentTag ? `1px solid ${currentTag.border}` : '1px dashed #cbd5e1',
                                                      background: currentTag ? currentTag.bg : '#f8fafc',
                                                      color: currentTag ? currentTag.color : '#64748b',
                                                      fontSize: '0.72rem',
                                                      fontWeight: 800,
                                                      padding: '3px 9px',
                                                      borderRadius: '100px',
                                                      cursor: 'pointer',
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      gap: '3px',
                                                      transition: 'all 0.15s ease'
                                                    }}
                                                    className="hover-scale-mini"
                                                    title={currentTag ? `Tag: ${currentTag.tag} (Klicken zum Ändern)` : 'Didaktischen Tag zuweisen'}
                                                  >
                                                    {currentTag ? (
                                                      <>
                                                        <Hash size={8} strokeWidth={2.8} />
                                                        <span>{currentTag.tag.replace(/^#/, '')}</span>
                                                        <ChevronDown size={9} strokeWidth={2.5} style={{ opacity: 0.7 }} />
                                                      </>
                                                    ) : (
                                                      <>
                                                        <Plus size={9} strokeWidth={2.8} />
                                                        <span>Tag</span>
                                                      </>
                                                    )}
                                                  </button>

                                                  {/* Floating Apple Glassmorphism Popover */}
                                                  {isPickerOpen && (
                                                    <>
                                                      <div
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setActiveTagPickerRowIndex(null);
                                                        }}
                                                        style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                                                      />
                                                      <div
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                          position: 'absolute',
                                                          right: 0,
                                                          top: '100%',
                                                          marginTop: '4px',
                                                          background: '#ffffff',
                                                          border: '1px solid #e2e8f0',
                                                          borderRadius: '12px',
                                                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 4px 6px -2px rgba(0,0,0,0.05)',
                                                          padding: '8px',
                                                          zIndex: 1000,
                                                          display: 'flex',
                                                          flexDirection: 'column',
                                                          gap: '4px',
                                                          minWidth: '180px'
                                                        }}
                                                      >
                                                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '2px 4px' }}>
                                                          Schwerpunkt wählen:
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                                          {DIDACTIC_QUICK_TAGS.map(t => {
                                                            const isSelected = currentTag?.tag === t.tag;
                                                            return (
                                                              <button
                                                                key={t.tag}
                                                                type="button"
                                                                onClick={() => handleSetRowTag(nIdx, isSelected ? null : t.tag)}
                                                                style={{
                                                                  background: isSelected ? t.color : t.bg,
                                                                  color: isSelected ? '#ffffff' : t.color,
                                                                  border: `1px solid ${isSelected ? t.color : t.border}`,
                                                                  borderRadius: '8px',
                                                                  padding: '4px 6px',
                                                                  fontSize: '0.68rem',
                                                                  fontWeight: 800,
                                                                  cursor: 'pointer',
                                                                  display: 'flex',
                                                                  alignItems: 'center',
                                                                  gap: '4px',
                                                                  justifyContent: 'flex-start',
                                                                  transition: 'all 0.15s ease'
                                                                }}
                                                                className="hover-scale-mini"
                                                              >
                                                                <Hash size={8} strokeWidth={2.8} />
                                                                <span>{t.tag.replace(/^#/, '')}</span>
                                                              </button>
                                                            );
                                                          })}
                                                        </div>
                                                        {currentTag && (
                                                          <button
                                                            type="button"
                                                            onClick={() => handleSetRowTag(nIdx, null)}
                                                            style={{
                                                              border: 'none',
                                                              background: '#fef2f2',
                                                              color: '#dc2626',
                                                              borderRadius: '6px',
                                                              padding: '4px',
                                                              fontSize: '0.66rem',
                                                              fontWeight: 750,
                                                              cursor: 'pointer',
                                                              marginTop: '4px',
                                                              display: 'flex',
                                                              alignItems: 'center',
                                                              justifyContent: 'center',
                                                              gap: '4px'
                                                            }}
                                                          >
                                                            <Trash2 size={10} />
                                                            <span>Tag entfernen</span>
                                                          </button>
                                                        )}
                                                      </div>
                                                    </>
                                                  )}
                                                </div>
                                              ) : (
                                                currentTag && (
                                                  <span
                                                    style={{
                                                      background: currentTag.bg,
                                                      color: currentTag.color,
                                                      border: `1px solid ${currentTag.border}`,
                                                      fontSize: '0.66rem',
                                                      fontWeight: 800,
                                                      padding: '2px 7px',
                                                      borderRadius: '100px',
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      gap: '3px'
                                                    }}
                                                  >
                                                    <Hash size={8} strokeWidth={2.8} />
                                                    <span>{currentTag.tag.replace(/^#/, '')}</span>
                                                  </span>
                                                )
                                              )}

                                              {/* Micro TTS Speaker Pill */}
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleSpeakText(cleanNoteText, `general_note_${nIdx}`);
                                                }}
                                                style={{
                                                  border: 'none',
                                                  background: isSpeakingThisNote ? '#bbf7d0' : 'none',
                                                  color: isSpeakingThisNote ? '#15803d' : '#94a3b8',
                                                  cursor: 'pointer',
                                                  padding: '2px 4px',
                                                  borderRadius: '4px',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  transition: 'transform 0.15s ease'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                                                title="Diesen Baustein vorlesen"
                                              >
                                                <Volume2 size={12} strokeWidth={2.4} />
                                              </button>

                                              {/* Individual Delete Button */}
                                              {!readOnly && (
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteSingleNoteItem(nIdx);
                                                  }}
                                                  style={{
                                                    border: 'none',
                                                    background: 'rgba(239, 68, 68, 0.08)',
                                                    color: '#dc2626',
                                                    cursor: 'pointer',
                                                    fontSize: '0.68rem',
                                                    fontWeight: 800,
                                                    padding: '3px 6px',
                                                    borderRadius: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    lineHeight: 1
                                                  }}
                                                  className="hover-scale-mini"
                                                  title="Diesen Baustein entfernen"
                                                >
                                                  ✕
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Smart Ghost-Slots if only notes or partial content exist */}
                                  {lehrwerkeList.length === 0 && otherHWs.length === 0 && !readOnly && (
                                    <div style={{
                                      display: 'flex',
                                      gap: '8px',
                                      paddingTop: '6px',
                                      borderTop: '1px dashed #e2e8f0',
                                      justifyContent: 'center',
                                      flexWrap: 'wrap'
                                    }}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveSubView('hub');
                                          setHubTab('protocol');
                                          if (isMobileView) {
                                            setMobileProtokollTab('repertoire');
                                          }
                                        }}
                                        style={{
                                          background: 'transparent',
                                          border: '1px dashed #cbd5e1',
                                          color: '#64748b',
                                          fontSize: '0.78rem',
                                          fontWeight: 750,
                                          padding: '5px 12px',
                                          borderRadius: '100px',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                          transition: 'all 0.15s ease'
                                        }}
                                        className="hover-scale-mini"
                                      >
                                        <Plus size={11} />
                                        <span>Lehrwerk oder Song anhängen</span>
                                      </button>
                                    </div>
                                  )}

                                  {/* 🎧 Discrete EarLab Achievement Badge in Weekly Homework Chronicle */}
                                  {(() => {
                                    const earlabScoreNote = (homeworkNotesList || []).find((n: any) => typeof n === 'string' && n.startsWith('EARLAB_SCORE:'));
                                    if (!earlabScoreNote) return null;
                                    const parts = (earlabScoreNote as string).replace('EARLAB_SCORE:', '').split('|');
                                    const level = parts[0] || 'D1';
                                    const pillar = parts[1] || 'Intervalle';
                                    const acc = parts[2] || '100%';
                                    const xpBadge = parts[3] || '+50XP';
                                    return (
                                      <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                                        border: '1px solid #86efac',
                                        borderRadius: '12px',
                                        padding: '6px 12px',
                                        fontSize: '0.78rem',
                                        fontWeight: 800,
                                        color: '#15803d',
                                        marginTop: '10px',
                                        alignSelf: 'flex-start'
                                      }}>
                                        <Headphones size={14} color="#16a34a" />
                                        <span>EarLab: Stufe {level} ({pillar}) gemeistert • {acc} Trefferquote ({xpBadge})</span>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                          {/* KÖRPER 1 SCHLUSS */}

                            {/* ========================================================================= */}
                            {/* KÖRPER 2: DIE AUDIO-AUFNAHME (Akustik-Werkzeugbank)                       */}
                            {/* ========================================================================= */}
                            {!readOnly && (
                              <div style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '16px',
                                padding: '8px 12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                                flexShrink: 0
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{
                                      width: '20px',
                                      height: '20px',
                                      borderRadius: '6px',
                                      background: '#e6f4ea',
                                      color: '#16a34a',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0
                                    }}>
                                      <Mic size={11} strokeWidth={2.4} />
                                    </div>
                                    <span style={{ fontSize: '0.74rem', fontWeight: 850, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                      Audio-Aufnahme
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span 
                                      style={{ 
                                        fontSize: '0.64rem', 
                                        color: '#475569', 
                                        fontWeight: 750,
                                        background: '#f1f5f9',
                                        border: '1px solid #e2e8f0',
                                        padding: '2px 6px',
                                        borderRadius: '100px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                      }}
                                      title="Didaktisches Hörbeispiel: Dient ausschließlich dem persönlichen 1:1-Übungsgebrauch dieses Schülers."
                                    >
                                      <Lock size={9} color="#64748b" />
                                      <span>Unterrichtsgebrauch</span>
                                    </span>
                                    <span style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 650 }}>
                                      {hasTresorStorage ? 'Tresor (7 Min.)' : 'Direkt (60s)'}
                                    </span>
                                  </div>
                                </div>

                                {/* 🎙️ Didaktisches Hörbeispiel & 1:1-Übungs-Track Micro-Disclosure */}
                                <div style={{
                                  fontSize: '0.63rem',
                                  color: '#64748b',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '0 2px',
                                  lineHeight: 1.2
                                }}>
                                  <span style={{ fontSize: '0.65rem' }}>🔒</span>
                                  <span>
                                    <strong>Didaktischer Audio-Tresor:</strong> Nur für den 1:1-Übungsgebrauch. Keine öffentliche Weitergabe.
                                  </span>
                                </div>

                                {/* 🛡️ Eltern-Veto Schranke & Exkulpations-Banner */}
                                {isTeacherTools && isStudentAudioForbiddenForTeacher && (
                                  <div style={{
                                    background: '#fffbeb',
                                    border: '1px solid #fef3c7',
                                    borderRadius: '10px',
                                    padding: '6px 10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px',
                                    flexWrap: 'wrap'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '200px' }}>
                                      <span style={{ fontSize: '0.85rem' }}>⚠️</span>
                                      <div style={{ fontSize: '0.68rem', color: '#92400e', lineHeight: 1.25 }}>
                                        <strong>Eltern-Veto:</strong> Keine Schüleraufnahmen erlaubt. Nur <strong>Lehrkraft-Vorspiel</strong> aufnehmen (Vertraulichkeit).
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={handleRequestParentAudioConsent}
                                      disabled={teacherConsentRequested}
                                      style={{
                                        background: teacherConsentRequested ? '#f1f5f9' : '#ffffff',
                                        border: '1px solid #f59e0b',
                                        color: teacherConsentRequested ? '#64748b' : '#b45309',
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        cursor: teacherConsentRequested ? 'default' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                        flexShrink: 0
                                      }}
                                      className={teacherConsentRequested ? '' : 'hover-scale'}
                                    >
                                      <Mail size={11} />
                                      <span>{teacherConsentRequested ? '✓ Gesendet' : 'Freigabe anfragen'}</span>
                                    </button>
                                  </div>
                                )}

                                <div style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  padding: '3px',
                                  borderRadius: '100px',
                                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                                  flexWrap: 'wrap',
                                  width: 'fit-content',
                                  maxWidth: '100%'
                                }}>
                                  {playAlongCountInRemaining !== null ? (
                                    <button
                                      type="button"
                                      onClick={cancelPlayAlongCountIn}
                                      style={{
                                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                        color: '#ffffff',
                                        border: 'none',
                                        padding: '0 12px',
                                        height: '32px',
                                        minHeight: '32px',
                                        borderRadius: '100px',
                                        fontSize: '0.75rem',
                                        fontWeight: 900,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        boxShadow: '0 0 12px rgba(245, 158, 11, 0.4)',
                                        flexShrink: 0
                                      }}
                                      title="Einzähler abbrechen"
                                    >
                                      <Timer size={13} />
                                      <span>Einzählen: {playAlongCountInRemaining} (Stopp)</span>
                                    </button>
                                  ) : !isRecordingAudio ? (
                                    <button
                                      type="button"
                                      onClick={handleStartPlayAlongRecording}
                                      disabled={isUploadingAudio}
                                      style={{
                                        background: '#0f172a',
                                        color: '#ffffff',
                                        border: 'none',
                                        padding: '0 12px',
                                        height: '32px',
                                        minHeight: '32px',
                                        borderRadius: '100px',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                                        flexShrink: 0
                                      }}
                                      className="hover-scale"
                                    >
                                      <Mic size={13} color="#22c55e" strokeWidth={2.4} style={{ filter: 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.35))' }} />
                                      <span>Aufnahme</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => stopRecordingAudio()}
                                      style={{
                                        background: '#ef4444',
                                        color: '#ffffff',
                                        border: 'none',
                                        padding: '0 12px',
                                        height: '32px',
                                        minHeight: '32px',
                                        borderRadius: '100px',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        boxShadow: '0 0 12px rgba(239, 68, 68, 0.4)',
                                        flexShrink: 0
                                      }}
                                    >
                                      <Square size={12} fill="#ffffff" />
                                      <span>Stopp ({hasTresorStorage ? `${formatRecordTime(audioDuration)} / 7:00` : `${audioDuration}s / 60s`})</span>
                                    </button>
                                  )}

                                  {!isRecordingAudio && playAlongCountInRemaining === null && (
                                    <>
                                      {/* ⏱️ 4er Einzähler Toggle Pill */}
                                      <button
                                        type="button"
                                        onClick={() => setIsCountInEnabled(!isCountInEnabled)}
                                        style={{
                                          background: isCountInEnabled ? '#ecfdf5' : '#ffffff',
                                          color: isCountInEnabled ? '#15803d' : '#64748b',
                                          border: isCountInEnabled ? '1.5px solid #86efac' : '1px solid #cbd5e1',
                                          padding: '0 9px',
                                          height: '32px',
                                          borderRadius: '100px',
                                          fontSize: '0.72rem',
                                          fontWeight: 800,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          flexShrink: 0,
                                          transition: 'all 0.15s ease'
                                        }}
                                        title={isCountInEnabled ? 'Einzählen aktiv (4 Klicks vor Start)' : 'Einzählen vor Aufnahme aktivieren'}
                                      >
                                        <Timer size={12} strokeWidth={isCountInEnabled ? 2.5 : 2} />
                                        <span>Einzählen</span>
                                      </button>

                                      {/* ⏱️ Metronom & BPM Pill Button with Flyout */}
                                      <div style={{ position: 'relative', flexShrink: 0 }}>
                                        <button
                                          type="button"
                                          onClick={() => setShowPlayAlongMetronomePopup(!showPlayAlongMetronomePopup)}
                                          style={{
                                            background: isRecordingMetronomeActive ? '#ecfdf5' : '#ffffff',
                                            color: isRecordingMetronomeActive ? '#15803d' : '#64748b',
                                            border: isRecordingMetronomeActive ? '1.5px solid #86efac' : '1px solid #cbd5e1',
                                            padding: '0 9px',
                                            height: '32px',
                                            borderRadius: '100px',
                                            fontSize: '0.72rem',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            boxShadow: isRecordingMetronomeActive ? '0 1px 4px rgba(22, 163, 74, 0.15)' : 'none',
                                            transition: 'all 0.15s ease'
                                          }}
                                          title="Klick & Tempo (BPM) einstellen"
                                        >
                                          <MechanicalMetronomeIcon size={13} color={isRecordingMetronomeActive ? '#15803d' : '#64748b'} strokeWidth={isRecordingMetronomeActive ? 2.5 : 2} />
                                          <span>{recordingBpm} BPM</span>
                                          <ChevronDown size={11} strokeWidth={2.5} style={{ transform: showPlayAlongMetronomePopup ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
                                        </button>

                                        {/* Popover Flyout */}
                                        {showPlayAlongMetronomePopup && (
                                          <div style={{
                                            position: 'absolute',
                                            bottom: 'calc(100% + 8px)',
                                            left: 0,
                                            background: '#ffffff',
                                            borderRadius: '16px',
                                            border: '1.5px solid #e2e8f0',
                                            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0,0,0,0.05)',
                                            padding: '12px 14px',
                                            width: '230px',
                                            zIndex: 100,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '10px'
                                          }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                              <span style={{ fontSize: '0.80rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <MechanicalMetronomeIcon size={15} color="#16a34a" strokeWidth={2.2} />
                                                <span>Klick & Tempo</span>
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => setShowPlayAlongMetronomePopup(false)}
                                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
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
                                                fontSize: '0.75rem',
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
                                              <span>{isRecordingMetronomeActive ? '✓ Klick bei Aufnahme AN' : 'Klick bei Aufnahme einschalten'}</span>
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
                                                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', width: '24px', height: '24px', fontWeight: 900, cursor: 'pointer' }}
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
                                                  onClick={() => setRecordingBpm(b => Math.min(240, b + 5))}
                                                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', width: '24px', height: '24px', fontWeight: 900, cursor: 'pointer' }}
                                                >+</button>
                                              </div>
                                            </div>

                                            <button
                                              type="button"
                                              onClick={() => playMetronomeTick(true)}
                                              style={{
                                                background: '#f8fafc',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                padding: '5px 8px',
                                                fontSize: '0.70rem',
                                                fontWeight: 750,
                                                color: '#64748b',
                                                cursor: 'pointer'
                                              }}
                                            >
                                              🔊 Klick kurz testen
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}

                                  {playAlongCountInRemaining !== null ? (
                                    <div style={{
                                      flex: 1,
                                      fontSize: '0.75rem',
                                      color: '#d97706',
                                      fontWeight: 750,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      paddingLeft: '4px'
                                    }}>
                                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f59e0b', animation: 'pulse 0.5s infinite' }} />
                                      <span>Einzähler läuft ({recordingBpm} BPM)...</span>
                                    </div>
                                  ) : !isRecordingAudio ? (
                                    <input
                                      type="text"
                                      placeholder="Titel der Spur (optional)..."
                                      value={audioLabel}
                                      onChange={(e) => setAudioLabel(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleStartPlayAlongRecording();
                                        }
                                      }}
                                      style={{
                                        flex: 1,
                                        minWidth: '120px',
                                        fontSize: '0.78rem',
                                        padding: '0 10px',
                                        height: '32px',
                                        minHeight: '32px',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        background: '#ffffff',
                                        color: '#0f172a',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                      }}
                                    />
                                  ) : (
                                    <div style={{
                                      flex: 1,
                                      fontSize: '0.75rem',
                                      color: '#dc2626',
                                      fontWeight: 750,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      paddingLeft: '4px'
                                    }}>
                                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
                                      <span>Audioaufnahme läuft... {isRecordingMetronomeActive ? `(Klick: ${recordingBpm} BPM)` : ''}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* ========================================================================= */}
                            {/* KÖRPER 3: DIE HAUSAUFGABEN-REDAKTION (Text- & Redaktions-Werkbank)        */}
                            {/* ========================================================================= */}
                            {!readOnly && (() => {
                              const toolboxViewingWeekIso = (() => {
                                if (viewingWeekOffset === 0) return getISOWeek();
                                const d = new Date();
                                d.setDate(d.getDate() + (viewingWeekOffset * 7));
                                return getISOWeek(d);
                              })();
                              const toolboxViewingWeekNum = toolboxViewingWeekIso.split('-W')[1] || '';

                              return (
                                <div style={{
                                  background: activeNoteTarget === 'student' ? '#ffffff' : '#fffbeb',
                                  border: activeNoteTarget === 'student' ? '1px solid #e2e8f0' : '1.5px solid #fcd34d',
                                  borderRadius: '20px',
                                  boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  transition: 'all 0.2s ease',
                                  flexShrink: 0
                                }}>
                                  {/* 1. Redaktions-Kopf: Switcher & Diktieren */}
                                  <div style={{
                                    padding: '12px 16px',
                                    background: activeNoteTarget === 'student' ? '#fafafa' : '#fef3c7',
                                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px',
                                    flexWrap: 'wrap'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      {/* Apple Segmented Switcher */}
                                      <div 
                                        role="tablist"
                                        aria-label="Notiz-Kategorie"
                                        style={{
                                          display: 'flex',
                                          background: '#f1f5f9',
                                          border: '1px solid #e2e8f0',
                                          padding: '3px',
                                          borderRadius: '10px',
                                          gap: '3px'
                                        }}
                                      >
                                        <button
                                          type="button"
                                          role="tab"
                                          aria-selected={activeNoteTarget === 'student'}
                                          tabIndex={0}
                                          onClick={() => setActiveNoteTarget('student')}
                                          style={{
                                            border: 'none',
                                            background: activeNoteTarget === 'student' ? '#ffffff' : 'transparent',
                                            color: activeNoteTarget === 'student' ? '#15803d' : '#64748b',
                                            fontWeight: activeNoteTarget === 'student' ? 850 : 650,
                                            fontSize: '0.80rem',
                                            padding: '5px 12px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            boxShadow: activeNoteTarget === 'student' ? '0 1px 4px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)' : 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            transition: 'all 0.15s ease'
                                          }}
                                        >
                                          <BookOpen size={13} />
                                          <span>Hausaufgaben-Bemerkung</span>
                                          {activeViewingStudentNotes.trim() && (
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34a853' }} />
                                          )}
                                        </button>

                                        <button
                                          type="button"
                                          role="tab"
                                          aria-selected={activeNoteTarget === 'teacher'}
                                          tabIndex={0}
                                          onClick={() => setActiveNoteTarget('teacher')}
                                          style={{
                                            border: 'none',
                                            background: activeNoteTarget === 'teacher' ? '#ffffff' : 'transparent',
                                            color: activeNoteTarget === 'teacher' ? '#92400e' : '#64748b',
                                            fontWeight: activeNoteTarget === 'teacher' ? 850 : 650,
                                            fontSize: '0.80rem',
                                            padding: '5px 12px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            boxShadow: activeNoteTarget === 'teacher' ? '0 1px 4px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)' : 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            transition: 'all 0.15s ease'
                                          }}
                                        >
                                          <Lock size={12} />
                                          <span>Interne Notiz (Nur Lehrer)</span>
                                          {teacherNotes.trim() && (
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#b45309' }} />
                                          )}
                                        </button>
                                      </div>

                                      {activeNoteTarget === 'teacher' && (
                                        <span style={{
                                          fontSize: '0.68rem',
                                          fontWeight: 800,
                                          color: '#92400e',
                                          background: '#fef3c7',
                                          border: '1px solid #fde68a',
                                          padding: '3px 8px',
                                          borderRadius: '100px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}>
                                          <Lock size={10} />
                                          <span>Vertraulich • Schüler sieht dies nicht</span>
                                        </span>
                                      )}
                                    </div>

                                    {/* Diktier-Button */}
                                    <SpeechDictationButton
                                      onTranscript={(text) => {
                                        if (activeNoteTarget === 'student') {
                                          const current = latestGeneralHomeworkNotesRef.current !== undefined
                                            ? latestGeneralHomeworkNotesRef.current
                                            : generalHomeworkNotes;
                                          const trimmed = current.trim();
                                          const next = trimmed ? `${trimmed}\n${text}` : text;
                                          latestGeneralHomeworkNotesRef.current = next;
                                          setGeneralHomeworkNotes(next);
                                          const specialNotes = (homeworkNotesList || []).filter(n => typeof n === 'string' && isInternalMetadataNote(n));
                                          const noteLines = next.split('\n').map(s => s.trim()).filter(s => s.length > 0 && !isInternalMetadataNote(s));
                                          const combined = [...specialNotes, ...noteLines];
                                          setHomeworkNotesList(combined);
                                          try { localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(combined)); } catch {}
                                        } else {
                                          const current = latestTeacherNotesRef.current !== undefined
                                            ? latestTeacherNotesRef.current
                                            : teacherNotes;
                                          const trimmed = current.trim();
                                          const next = trimmed ? `${trimmed}\n${text}` : text;
                                          latestTeacherNotesRef.current = next;
                                          setTeacherNotes(next);
                                          try { localStorage.setItem(`campus_teacher_notes_${student.id}`, next); } catch {}
                                        }
                                        triggerDebouncedAutoSave(350);
                                      }}
                                      title="Diktieren"
                                    />
                                  </div>

                                  {/* Notice Pill when in historical or future week */}
                                  {viewingWeekOffset !== 0 && activeNoteTarget === 'student' && (
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      background: viewingWeekOffset < 0 ? '#f8fafc' : '#f0fdf4',
                                      borderBottom: `1px solid ${viewingWeekOffset < 0 ? '#e2e8f0' : '#bbf7d0'}`,
                                      padding: '6px 16px',
                                      fontSize: '0.74rem',
                                      fontWeight: 650,
                                      color: viewingWeekOffset < 0 ? '#475569' : '#166534'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>{viewingWeekOffset < 0 ? '📅' : '🚀'}</span>
                                        <span>
                                          {viewingWeekOffset < 0
                                            ? `Archivierte Woche (KW ${toolboxViewingWeekNum})`
                                            : `Planungs-Vorschau (KW ${toolboxViewingWeekNum})`}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setViewingWeekOffset(0)}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: viewingWeekOffset < 0 ? '#2563eb' : '#16a34a',
                                          fontWeight: 800,
                                          fontSize: '0.72rem',
                                          cursor: 'pointer',
                                          padding: 0
                                        }}
                                      >
                                        ➔ Zur aktuellen Woche
                                      </button>
                                    </div>
                                  )}

                                  {/* Duo/Gruppen-Zuweisung: NUR wenn effectiveGroupStudents.length > 1 */}
                                  {activeNoteTarget === 'student' && viewingWeekOffset === 0 && effectiveGroupStudents.length > 1 && (
                                    <div style={{
                                      padding: '10px 16px 2px 16px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      flexWrap: 'wrap'
                                    }}>
                                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b' }}>
                                        Duo/Gruppen-Zuweisung:
                                      </span>
                                      {effectiveGroupStudents.map((grpStud, gIdx) => {
                                        const gName = (grpStud?.first_name || (grpStud as any)?.name?.split(' ')[0] || '').trim();
                                        if (!gName) return null;
                                        const isCurrentStudent = gName.toLowerCase() === studentFirstName.toLowerCase();
                                        return (
                                          <button
                                            key={`group-tag-btn-${gIdx}-${gName}`}
                                            type="button"
                                            onClick={() => {
                                              const tagToInsert = `@${gName}: `;
                                              const currentText = generalHomeworkNotes || '';
                                              const cursor = studentNotesSelectionRef.current?.start ?? currentText.length;
                                              const nextText = currentText.slice(0, cursor) + (currentText.length > 0 && !currentText.endsWith('\n') ? '\n' : '') + tagToInsert + currentText.slice(cursor);
                                              latestGeneralHomeworkNotesRef.current = nextText;
                                              setGeneralHomeworkNotes(nextText);
                                              const specialNotes = (homeworkNotesList || []).filter((n: string) => typeof n === 'string' && isInternalMetadataNote(n));
                                              const noteLines = nextText.split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0 && !isInternalMetadataNote(s));
                                              const combined = [...specialNotes, ...noteLines];
                                              setHomeworkNotesList(combined);
                                              try { localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(combined)); } catch {}
                                              triggerDebouncedAutoSave(350);
                                              setTimeout(() => {
                                                if (studentNotesTextareaRef.current) {
                                                  studentNotesTextareaRef.current.focus();
                                                  const pos = cursor + tagToInsert.length + 1;
                                                  studentNotesTextareaRef.current.setSelectionRange(pos, pos);
                                                }
                                              }, 20);
                                            }}
                                            style={{
                                              background: isCurrentStudent ? '#e6f4ea' : '#ede9fe',
                                              border: isCurrentStudent ? '1px solid rgba(52, 168, 83, 0.4)' : '1px solid rgba(139, 92, 246, 0.4)',
                                              borderRadius: '6px',
                                              padding: '3px 8px',
                                              fontSize: '0.72rem',
                                              fontWeight: 800,
                                              color: isCurrentStudent ? '#15803d' : '#6d28d9',
                                              cursor: 'pointer',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              transition: 'all 0.15s'
                                            }}
                                            className="hover-scale-mini"
                                            title={`@${gName} zur Hausaufgabe zuweisen`}
                                          >
                                            + @{gName}
                                          </button>
                                        );
                                      })}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const tagToInsert = '@Alle: ';
                                          const currentText = generalHomeworkNotes || '';
                                          const cursor = studentNotesSelectionRef.current?.start ?? currentText.length;
                                          const nextText = currentText.slice(0, cursor) + (currentText.length > 0 && !currentText.endsWith('\n') ? '\n' : '') + tagToInsert + currentText.slice(cursor);
                                          latestGeneralHomeworkNotesRef.current = nextText;
                                          setGeneralHomeworkNotes(nextText);
                                          const specialNotes = (homeworkNotesList || []).filter(n => typeof n === 'string' && isInternalMetadataNote(n));
                                          const noteLines = nextText.split('\n').map(s => s.trim()).filter(s => s.length > 0 && !isInternalMetadataNote(s));
                                          const combined = [...specialNotes, ...noteLines];
                                          setHomeworkNotesList(combined);
                                          try { localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(combined)); } catch {}
                                          triggerDebouncedAutoSave(350);
                                          setTimeout(() => {
                                            if (studentNotesTextareaRef.current) {
                                              studentNotesTextareaRef.current.focus();
                                              const pos = cursor + tagToInsert.length + 1;
                                              studentNotesTextareaRef.current.setSelectionRange(pos, pos);
                                            }
                                          }, 20);
                                        }}
                                        style={{
                                          background: '#f1f5f9',
                                          border: '1px solid #cbd5e1',
                                          borderRadius: '6px',
                                          padding: '3px 8px',
                                          fontSize: '0.72rem',
                                          fontWeight: 800,
                                          color: '#475569',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          transition: 'all 0.15s'
                                        }}
                                        className="hover-scale-mini"
                                      >
                                        + @Alle
                                      </button>
                                    </div>
                                  )}

                                  {/* 2. Textarea Bereich */}
                                  <div style={{ padding: '12px 16px' }}>
                                    {activeNoteTarget === 'student' && viewingWeekOffset === 0 && (isAudioCarriedOver || isNotesCarriedOver || isBooksCarriedOver || isSongsCarriedOver) && !generalHomeworkNotes.trim() && (
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 12px',
                                        marginBottom: '10px',
                                        borderRadius: '10px',
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '0.78rem',
                                        color: '#475569',
                                        fontWeight: 650
                                      }}>
                                        <span style={{ fontSize: '0.9rem' }}>💡</span>
                                        <span>
                                          Schüler übt aktuell mit den Aufgaben, Unterrichtsaufnahmen & Notizen aus {carriedOverWeekLabel || 'der Vorwoche'}. Sobald du neue Einträge speicherst, lösen diese die Vorwoche ab.
                                        </span>
                                      </div>
                                    )}
                                    {activeNoteTarget === 'student' ? (
                                      <textarea
                                        ref={studentNotesTextareaRef}
                                        placeholder={viewingWeekOffset === 0
                                          ? "Trage hier Notizen, Hausaufgaben oder den Wochen-Fahrplan ein..."
                                          : (viewingWeekOffset < 0
                                            ? `Keine Notizen in KW ${toolboxViewingWeekNum} archiviert.`
                                            : `Noch keine Notizen für KW ${toolboxViewingWeekNum} geplant.`)}
                                        value={activeViewingStudentNotes}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.stopPropagation();
                                          }
                                        }}
                                        onInput={(e) => {
                                          adjustTextareaHeight(e.currentTarget);
                                          studentNotesSelectionRef.current = {
                                            start: e.currentTarget.selectionStart ?? e.currentTarget.value.length,
                                            end: e.currentTarget.selectionEnd ?? e.currentTarget.value.length
                                          };
                                        }}
                                        onSelect={(e) => {
                                          const target = e.currentTarget;
                                          studentNotesSelectionRef.current = {
                                            start: target.selectionStart ?? target.value.length,
                                            end: target.selectionEnd ?? target.value.length
                                          };
                                        }}
                                        onClick={(e) => {
                                          const target = e.currentTarget;
                                          studentNotesSelectionRef.current = {
                                            start: target.selectionStart ?? target.value.length,
                                            end: target.selectionEnd ?? target.value.length
                                          };
                                        }}
                                        onKeyUp={(e) => {
                                          const target = e.currentTarget;
                                          studentNotesSelectionRef.current = {
                                            start: target.selectionStart ?? target.value.length,
                                            end: target.selectionEnd ?? target.value.length
                                          };
                                        }}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const target = e.currentTarget;
                                          adjustTextareaHeight(target);
                                          studentNotesSelectionRef.current = {
                                            start: target.selectionStart ?? val.length,
                                            end: target.selectionEnd ?? val.length
                                          };
                                          if (viewingWeekOffset === 0) {
                                            latestGeneralHomeworkNotesRef.current = val;
                                            setGeneralHomeworkNotes(val);
                                            triggerDebouncedAutoSave(500);
                                          }
                                        }}
                                        onFocus={(e) => {
                                          setIsNotesFocused(true);
                                          adjustTextareaHeight(e.currentTarget);
                                          const target = e.currentTarget;
                                          studentNotesSelectionRef.current = {
                                            start: target.selectionStart ?? target.value.length,
                                            end: target.selectionEnd ?? target.value.length
                                          };
                                        }}
                                        onBlur={(e) => {
                                          const target = e.currentTarget;
                                          studentNotesSelectionRef.current = {
                                            start: target.selectionStart ?? target.value.length,
                                            end: target.selectionEnd ?? target.value.length
                                          };
                                          if (viewingWeekOffset === 0) {
                                            const currentVal = latestGeneralHomeworkNotesRef.current || target.value || '';
                                            const specialNotes = (homeworkNotesList || []).filter((n: string) => typeof n === 'string' && isInternalMetadataNote(n));
                                            const noteLines = currentVal.split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0 && !isInternalMetadataNote(s));
                                            const combined = [...specialNotes, ...noteLines];
                                            setHomeworkNotesList(combined);
                                            try { localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(combined)); } catch {}
                                          }
                                          triggerImmediateAutoSave();
                                          if (!activeViewingStudentNotes.trim()) setIsNotesFocused(false);
                                        }}
                                        style={{
                                          width: '100%',
                                          minHeight: '84px',
                                          height: 'auto',
                                          padding: '0',
                                          border: 'none',
                                          fontSize: '0.94rem',
                                          fontWeight: 550,
                                          lineHeight: 1.55,
                                          outline: 'none',
                                          resize: 'none',
                                          overflow: 'hidden',
                                          background: 'transparent',
                                          color: '#0f172a',
                                          boxSizing: 'border-box',
                                          display: 'block',
                                          whiteSpace: 'pre-wrap',
                                          wordBreak: 'break-word'
                                        }}
                                      />
                                    ) : (
                                      <textarea
                                        ref={teacherNotesTextareaRef}
                                        placeholder="Vertrauliche Notizen zum Schüler (nur für dich sichtbar)..."
                                        value={teacherNotes}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.stopPropagation();
                                          }
                                        }}
                                        onInput={(e) => {
                                          adjustTextareaHeight(e.currentTarget);
                                        }}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          adjustTextareaHeight(e.currentTarget);
                                          latestTeacherNotesRef.current = val;
                                          setTeacherNotes(val);
                                          try { localStorage.setItem(`campus_teacher_notes_${student.id}`, val); } catch {}
                                          triggerDebouncedAutoSave(350);
                                        }}
                                        onBlur={() => triggerImmediateAutoSave()}
                                        style={{
                                          width: '100%',
                                          minHeight: '84px',
                                          height: 'auto',
                                          padding: '0',
                                          border: 'none',
                                          fontSize: '0.94rem',
                                          fontWeight: 550,
                                          lineHeight: 1.55,
                                          outline: 'none',
                                          resize: 'none',
                                          overflow: 'hidden',
                                          background: 'transparent',
                                          color: '#78350f',
                                          boxSizing: 'border-box',
                                          display: 'block',
                                          whiteSpace: 'pre-wrap',
                                          wordBreak: 'break-word'
                                        }}
                                      />
                                    )}
                                  </div>

                                  {/* 3. Vorlagen-Dock: Nahtlos im Fuß der Redaktionskarte verankert */}
                                  {activeNoteTarget === 'student' && (
                                    <div style={{
                                      padding: '10px 16px',
                                      background: '#f8fafc',
                                      borderTop: '1px solid #f1f5f9',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      overflowX: 'auto',
                                      WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)',
                                      maskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)'
                                    }} className="hide-scrollbar">
                                      <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Sparkles size={11} color="#94a3b8" />
                                        <span>Vorlagen:</span>
                                      </span>
                                      {PRESET_CHIPS.map((chip, cIdx) => {
                                        const isActive = chip.isBpm 
                                          ? activeViewingStudentNotes.toLowerCase().includes('bpm')
                                          : activeViewingStudentNotes.includes(chip.text);

                                        return (
                                          <button
                                            key={`chip-${cIdx}`}
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={(e) => handleTogglePresetChip(chip, e)}
                                            style={{
                                              flexShrink: 0,
                                              background: isActive ? '#f0fdf4' : '#ffffff',
                                              color: isActive ? '#166534' : '#475569',
                                              border: `1px solid ${isActive ? '#86efac' : '#e2e8f0'}`,
                                              padding: '4px 11px',
                                              borderRadius: '100px',
                                              fontSize: '0.74rem',
                                              fontWeight: isActive ? 800 : 650,
                                              cursor: 'pointer',
                                              boxShadow: isActive ? '0 1px 3px rgba(22, 101, 52, 0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
                                              transition: 'all 0.15s ease',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px'
                                            }}
                                            className="hover-scale-mini"
                                            title={chip.text}
                                          >
                                            {isActive && <Check size={11} color="#166534" strokeWidth={3} />}
                                            <span>{chip.label}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            </div>
                          );
                        })()}
                    </div>
                  </div>
                  {/* Clean Bottom Spacing */}
                  <div style={{ paddingBottom: (isMobileView || isInsideSim || isFullscreen) ? '24px' : '0px' }} />
                </div>
              </>
            )}
            </div>{/* Close inner scrollable area */}
          </div>

        {/* 🎧 AUDIO & LATENZ EINSTELLUNGEN SHEET */}
        <AudioSettingsSheet
          isOpen={showAudioSettings}
          onClose={() => setShowAudioSettings(false)}
        />

        {/* 🔒 ELTERN-PIN MODAL FÜR MODUL-FREISCHALTUNG */}
        {showParentPinModalForModules && (
          <CampusPinUnlockModal
            user={student}
            supabase={supabase}
            schoolData={{ id: student?.school_id }}
            mode="parent_only"
            title="Module freischalten"
            subtitle="Eltern-Freigabe erforderlich: Bitte 6-stellige Eltern-Master-PIN eingeben."
            onUnlock={() => {
              setShowParentPinModalForModules(false);
              setActiveModuleUnlockTab('extensions');
              setShowModuleUnlockModal(true);
            }}
            onClose={closeAndLockModuleModal}
          />
        )}

        {/* 🎛️ MODUL-FREISCHALT-SHEET (ELTERN) */}
        {showModuleUnlockModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Studio-Module freischalten"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.65)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 99999,
              padding: "16px"
            }}
            onClick={closeAndLockModuleModal}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#ffffff",
                borderRadius: "24px",
                width: "100%",
                maxWidth: "480px",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                border: "1px solid #e2e8f0",
                overflow: "hidden"
              }}
            >
              <div style={{
                padding: "20px 24px",
                background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                borderBottom: "1px solid #bfdbfe",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "12px",
                    background: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
                  }}>
                    <Sliders size={20} color="#2563eb" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 900, color: "#1e3a8a" }}>
                      Zusatzmodule freischalten
                    </h3>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b" }}>
                      Eltern-Freigabe für {studentFirstName}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeAndLockModuleModal}
                  aria-label="Schließen"
                  style={{
                    background: "rgba(255,255,255,0.8)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: "50%",
                    width: "30px",
                    height: "30px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                  }}
                >
                  <X size={15} color="#475569" />
                </button>
              </div>

              {/* Tabs: Ausgeblendete Module vs. Erweiterungen */}
              <div style={{
                display: "flex",
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc"
              }}>
                <button
                  type="button"
                  onClick={() => setActiveModuleUnlockTab('restore')}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    border: "none",
                    background: activeModuleUnlockTab === 'restore' ? "#ffffff" : "transparent",
                    color: activeModuleUnlockTab === 'restore' ? "#0f172a" : "#64748b",
                    fontSize: "0.80rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    borderBottom: activeModuleUnlockTab === 'restore' ? "2px solid #2563eb" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  <RotateCcw size={14} color={activeModuleUnlockTab === 'restore' ? "#2563eb" : "#64748b"} />
                  <span>Ausgeblendet ({customModuleLayout.hidden.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (checkIsParentModuleUnlocked()) {
                      setActiveModuleUnlockTab('extensions');
                    } else {
                      setShowParentPinModalForModules(true);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    border: "none",
                    background: activeModuleUnlockTab === 'extensions' ? "#ffffff" : "transparent",
                    color: activeModuleUnlockTab === 'extensions' ? "#0f172a" : "#64748b",
                    fontSize: "0.80rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    borderBottom: activeModuleUnlockTab === 'extensions' ? "2px solid #2563eb" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  <Lock size={13} color={activeModuleUnlockTab === 'extensions' ? "#2563eb" : "#64748b"} />
                  <span>Studio-Erweiterungen</span>
                </button>
              </div>

              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {activeModuleUnlockTab === 'restore' ? (
                  <>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#475569", lineHeight: 1.45 }}>
                      Hier siehst du Module, die du auf deiner Leiste ausgeblendet hast. Du kannst sie jederzeit ohne Eltern-PIN wieder einblenden.
                    </p>

                    {customModuleLayout.hidden.length === 0 ? (
                      <div style={{
                        padding: "24px 16px",
                        textAlign: "center",
                        background: "#f8fafc",
                        border: "1px dashed #cbd5e1",
                        borderRadius: "16px",
                        color: "#64748b",
                        fontSize: "0.82rem",
                        fontWeight: 650
                      }}>
                        Aktuell sind alle verfügbaren Module auf deiner Leiste sichtbar! ✨
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {customModuleLayout.hidden.map((hiddenKey) => {
                          const labelMap: Record<string, string> = {
                            practice: 'Üben',
                            recordings: 'Aufnahmen',
                            groovetrainer: 'Groove-Trainer',
                            tuner: 'Stimmgerät',
                            loopstation: 'Loopstation',
                            earlab: uiLevel === 'junior' ? 'Klang-Detektiv' : 'Gehörtraining',
                            skillradar: uiLevel === 'junior' ? 'Musik-Stern' : 'Fähigkeiten',
                            protocol: 'Aufgabenheft',
                            archive: 'Verlauf',
                            worldtour: 'Musik-Weltreise'
                          };
                          return (
                            <div
                              key={hiddenKey}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "12px 14px",
                                background: "#f8fafc",
                                border: "1.5px solid #e2e8f0",
                                borderRadius: "14px"
                              }}
                            >
                              <span style={{ fontSize: "0.86rem", fontWeight: 800, color: "#0f172a" }}>
                                {labelMap[hiddenKey] || hiddenKey}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRestoreModule(hiddenKey)}
                                style={{
                                  background: "#22c55e",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "10px",
                                  padding: "6px 12px",
                                  fontSize: "0.76rem",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px"
                                }}
                                className="hover-scale"
                              >
                                <Plus size={13} strokeWidth={2.6} />
                                <span>Einblenden</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                      <button
                        type="button"
                        onClick={handleResetModuleLayout}
                        style={{
                          flex: 1,
                          background: "#f1f5f9",
                          color: "#475569",
                          border: "1px solid #cbd5e1",
                          borderRadius: "12px",
                          padding: "10px 14px",
                          fontSize: "0.80rem",
                          fontWeight: 750,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px"
                        }}
                        className="hover-scale"
                      >
                        <RotateCcw size={13} />
                        <span>Alles auf Standard zurücksetzen</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#475569", lineHeight: 1.45 }}>
                      Hier können Erziehungsberechtigte zusätzliche Profi-Werkzeuge für {studentFirstName} freischalten.
                    </p>

                    {/* Loopstation switch */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 16px",
                      background: "#f8fafc",
                      border: "1.5px solid #e2e8f0",
                      borderRadius: "16px"
                    }}>
                      <div>
                        <div style={{ fontSize: "0.86rem", fontWeight: 800, color: "#0f172a" }}>
                          Loopstation
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>
                          Mehrspur-Aufnahmen & kreatives Jammen
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleModuleOverride("loopstation", !isLoopstationUnlocked)}
                        style={{
                          width: "48px",
                          height: "28px",
                          borderRadius: "14px",
                          background: isLoopstationUnlocked ? "#22c55e" : "#cbd5e1",
                          border: "none",
                          padding: "2px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: isLoopstationUnlocked ? "flex-end" : "flex-start",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <div style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: "#ffffff",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                        }} />
                      </button>
                    </div>

                    {/* Archiv switch */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 16px",
                      background: "#f8fafc",
                      border: "1.5px solid #e2e8f0",
                      borderRadius: "16px"
                    }}>
                      <div>
                        <div style={{ fontSize: "0.86rem", fontWeight: 800, color: "#0f172a" }}>
                          Unterrichts-Archiv
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>
                          Vergangene Wochen & Hausaufgaben-Chronik
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleModuleOverride("archive", !isArchiveUnlocked)}
                        style={{
                          width: "48px",
                          height: "28px",
                          borderRadius: "14px",
                          background: isArchiveUnlocked ? "#22c55e" : "#cbd5e1",
                          border: "none",
                          padding: "2px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: isArchiveUnlocked ? "flex-end" : "flex-start",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <div style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: "#ffffff",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                        }} />
                      </button>
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setShowModuleUnlockModal(false)}
                  style={{
                    marginTop: "4px",
                    background: "#0f172a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "12px",
                    padding: "10px 16px",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                  className="hover-scale"
                >
                  Fertig
                </button>
              </div>
            </div>
          </div>
        )}
      </>
  );
}
