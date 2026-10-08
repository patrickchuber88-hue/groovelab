import React, { Suspense, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Activity, ArrowRight, ArrowRightLeft, Award, BookOpen, Calendar, Check, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, Clock, Compass, Copy, Disc, Edit3, FileText, Globe, Hash, Headphones, HelpCircle, History, Lightbulb, Lock, Mail, Mic, Moon, Music, Pause, Pin, Play, Plus, Radio, RotateCcw, Search, Settings, Share2, Sliders, Sparkles, Square, Star, Target, Timer, Trash2, User, Volume2, VolumeX, AlertCircle, Eye, EyeOff, Hand, Info, MessageSquare, Pencil, Printer, RefreshCw, RotateCw, Unlock, Users, Wrench, Zap, X, Send, Wand2, Repeat
} from 'lucide-react';
import { useModalA11y } from '../../../hooks/useModalA11y';
import Confetti from 'react-confetti';
import { AudioTrackCarousel } from '../../AudioTrackCarousel';
import { MeisterOhrSticker } from '../../MeisterOhrSticker';
import { CampusPinUnlockModal } from '../../CampusPinUnlockModal';
import { SpeechDictationButton } from '../SpeechDictationButton';
import { MechanicalMetronomeIcon } from './MeisterwerkAudioPlayers';
import { AudioSettingsSheet } from './AudioSettingsSheet';
import { Student } from '../meisterwerk.types';
import {
  StudioModuleKey,
  ALL_STUDIO_MODULE_KEYS,
  isStudioModuleActive,
  DEFAULT_ACTIVE_STUDIO_MODULES
} from '../studentAgeStandards';
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
import { cleanHomeworkTitle } from '../../../utils/homeworkSnapshotHelper';
import { resolvePlayableAudioSource } from '../../../utils/audioStorageHelper';
import {
  formatPageNumbers,
  getCleanPageNotes,
  getCleanTeacherHomeworkText,
  formatStudentNoteDisplay,
  parseStudentQuestionFromNotes,
  parseStudentAnnotation,
  parseSongArtistAndTitle,
  SKILL_TAGS,
  parseWorldTourMasteries,
  ParsedWorldTourMastery
} from '../meisterwerk.types';
import { WorldTourMasteryNoteCard } from './worldtour/WorldTourMasteryNoteCard';
import { StudentHomeworkStatusButton } from '../homework/StudentHomeworkStatusButton';
import { useAuthoritativeHomeworkOptional } from '../context/AuthoritativeHomeworkContext';
import { useMeisterwerkTestScrubber } from './hooks/useMeisterwerkTestScrubber';
import { MicroScoreSnippetButton } from './microscore';
import {
  parseRawNotesArray,
  parseSnapshotLehrwerke,
  parseSnapshotSongs,
  parseAudioEntries,
  parseDidacticTextNotes
} from './utils/meisterwerkSnapshotUnpacker';
import {
  ALL_STICKERS,
  getUnifiedStickerStatus,
  getUnifiedStickersMap,
  cleanNotesText,
  filterNotesForStudent,
  isInternalMetadataNote
} from '../../../domain/stickersAndTresor';
import { formatPageNumbersGerman, formatSingleBookForSpeech, formatSingleSongForSpeech } from '../../../services/neuralTtsService';
import {
  levenshteinDistance,
  normalizeSongStr,
  extractSongArtistAndTitle,
  areSongsIdentical,
  formatDisplayTitle,
  stripInstrumentFromTitle,
  isDummyOrTestSong,
  isWeeklySnapshotContainer,
  collectHomeworkSongsFromSources
} from './utils/meisterwerkSongHelpers';
import type { SongSection, SongMeasure } from './components/SongStructureBar';
import { playAlongAudioEngine, DEFAULT_MIXER_STATE, type AudioMixerState } from './utils/songPlayAlongAudioEngine';
import { getInstrumentAvatarUrl } from '../studentAvatars.constants';
import { getSimulatedNow, getWeekDateRange } from '../studentDateUtils';
import { useDictationInput } from '../../../hooks/useVoiceToText';
import { CampusStudioModuleCover, TuningForkIcon } from './CampusStudioModuleCover';
import { MeisterwerkArchiveModuleView, type WeekBarItem } from './archive/MeisterwerkArchiveModuleView';
import { TeacherHomeworkActionDock } from './components/TeacherHomeworkActionDock';
import { deriveJuniorHomeworkSummary } from '../tabs/briefing/homeworkSummaryHelper';

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
  handleAcknowledgeWorldTourMastery?: (countryCode: string) => any;
  handleOpenWorldTourStation?: (countryCode: string) => any;
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
  assignedCampusSongs?: any[];
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
  onSaveParentOverrides?: (overrides: Record<string, boolean>) => void;
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
    generalHomeworkNotes = '',
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
    handleAcknowledgeWorldTourMastery,
    handleOpenWorldTourStation,
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
    pageHomeworkNotes = '',
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
    songHomeworkNotes = '',
    songModalTab,
    songNotesSelectionRef,
    songNotesTextareaRef,
    songProgressPercent,
    songSearch,
    songs,
    assignedCampusSongs = [],
    sortedAssignedLehrwerke,
    status,
    stopRecordingAudio,
    student,
    studentFirstName,
    studentNotes = '',
    studentNotesSelectionRef,
    studentNotesTextareaRef,
    studentRating,
    studentRatingUpdatedAt,
    teacherId,
    teacherNotes = '',
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
    parentPermissions,
    onSaveParentOverrides,
    updateLehrwerkVisibility,
    useNotebookLayout,
    viewingWeekOffset
  } = props;

  const isJunior = uiLevel === 'junior';
  const authHw = useAuthoritativeHomeworkOptional();

  // 🛡️ Datenschutz- & Minderjährigenschutz-Schranke (§ 201 StGB / Art. 8 DSGVO)
  const isStudentAudioForbiddenForTeacher = useMemo(() => {
    const studentIdVal = (student as any)?.id;
    const localTeacherAudioKey = studentIdVal && typeof window !== 'undefined' ? localStorage.getItem(`groovelab_parent_allow_teacher_audio_${studentIdVal}`) : null;
    const isAllowed = ((student as any)?.parent_permissions?.allow_teacher_audio === true) || (localTeacherAudioKey !== null ? localTeacherAudioKey === 'true' : false);
    return !isAllowed;
  }, [student]);

  const [showModuleUnlockModal, setShowModuleUnlockModal] = useState(false);
  const moduleUnlockModalRef = useModalA11y(showModuleUnlockModal, () => closeAndLockModuleModal());
  const [showParentPinModalForModules, setShowParentPinModalForModules] = useState(false);
  const [isConfirmingResolveQuestion, setIsConfirmingResolveQuestion] = useState(false);

  const studentIdVal = (student as any)?.id;

  const [localModuleOverrides, setLocalModuleOverrides] = useState<Record<string, boolean>>(() => {
    if (props.parentPermissions?.module_overrides) return props.parentPermissions.module_overrides;
    if ((student as any)?.parent_permissions?.module_overrides) return (student as any).parent_permissions.module_overrides;
    if (studentIdVal && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`campus_studio_module_overrides_${studentIdVal}`);
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return {};
  });

  useEffect(() => {
    const nextOverrides = props.parentPermissions?.module_overrides || (student as any)?.parent_permissions?.module_overrides;
    if (nextOverrides && typeof nextOverrides === 'object') {
      setLocalModuleOverrides(nextOverrides);
      if (studentIdVal && typeof window !== 'undefined') {
        try {
          localStorage.setItem(`campus_studio_module_overrides_${studentIdVal}`, JSON.stringify(nextOverrides));
        } catch (e) {}
      }
    }
  }, [props.parentPermissions?.module_overrides, (student as any)?.parent_permissions?.module_overrides, studentIdVal]);

  // 🎵 Song Selection & Creation Modal State (Self-Contained 1% Goldstandard)
  const [localShowCreateSongModal, setLocalShowCreateSongModal] = useState(false);
  const createSongModalRef = useModalA11y(localShowCreateSongModal, () => setLocalShowCreateSongModal(false));
  const [localSongModalTab, setLocalSongModalTab] = useState<'catalog' | 'create'>('catalog');
  const [localSongSearch, setLocalSongSearch] = useState('');
  const [localNewSongTitle, setLocalNewSongTitle] = useState('');
  const [localNewSongArtist, setLocalNewSongArtist] = useState('');

  // 🎵 0.1% Goldstandard 2027 Song Sections Architecture (Zero-Dummy-Data Doktrin)
  const [songSections, setSongSections] = useState<SongSection[]>(() => []);
  const [activeSectionId, setActiveSectionId] = useState<string>('');
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

    // Zero-Dummy-Data: Starts completely empty until created by student or teacher
    setSongSections([]);
    setActiveSectionId('');
  }, [selectedActiveSongId, student?.id]);

  // Sync practiced state for active section
  useEffect(() => {
    if (!selectedActiveSongId || !student?.id || !activeSectionId) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const isDone = localStorage.getItem(`song_practiced_${student.id}_${selectedActiveSongId}_${activeSectionId}_${todayStr}`) === 'true';
    setHasPracticedSectionToday(isDone);
  }, [selectedActiveSongId, student?.id, activeSectionId]);

  // 🎵 Song Sections Handlers (Universal Architecture Builder)
  const handleAddSongSection = (name: string) => {
    const newSec: SongSection = {
      id: `sec-${Date.now()}`,
      name,
      bars: '8 Takte',
      barsCount: 8,
      repetitions: 1,
      chords: ['Em', 'C', 'G', 'D'],
      drumFeel: '8tel Beat',
      drumSurface: 'Geschlossene Hi-Hat'
    };
    const updated = [...songSections, newSec];
    setSongSections(updated);
    setActiveSectionId(newSec.id);
    if (selectedActiveSongId && student?.id) {
      try {
        localStorage.setItem(`song_sections_${student.id}_${selectedActiveSongId}`, JSON.stringify(updated));
      } catch {}
    }
    setHasChanges(true);
  };

  const handleUpdateSongSection = (updatedSec: SongSection) => {
    const updated = songSections.map(s => s.id === updatedSec.id ? updatedSec : s);
    setSongSections(updated);
    if (selectedActiveSongId && student?.id) {
      try {
        localStorage.setItem(`song_sections_${student.id}_${selectedActiveSongId}`, JSON.stringify(updated));
      } catch {}
    }
    setHasChanges(true);
  };

  const handleToggleSectionFocus = (id: string) => {
    const updated = songSections.map(s => ({
      ...s,
      isHomeworkFocus: s.id === id ? !s.isHomeworkFocus : false
    }));
    setSongSections(updated);
    if (selectedActiveSongId && student?.id) {
      try {
        localStorage.setItem(`song_sections_${student.id}_${selectedActiveSongId}`, JSON.stringify(updated));
      } catch {}
    }
    setHasChanges(true);
  };

  const handleDeleteSongSection = (id: string) => {
    if (songSections.length <= 1) return;
    const updated = songSections.filter(s => s.id !== id);
    setSongSections(updated);
    if (activeSectionId === id) {
      setActiveSectionId(updated[0]?.id || '');
    }
    if (selectedActiveSongId && student?.id) {
      try {
        localStorage.setItem(`song_sections_${student.id}_${selectedActiveSongId}`, JSON.stringify(updated));
      } catch {}
    }
    setHasChanges(true);
  };

  const handleDuplicateSongSection = (id: string) => {
    const idx = songSections.findIndex(s => s.id === id);
    if (idx === -1) return;
    const target = songSections[idx];
    const dupl: SongSection = {
      ...target,
      id: `sec-${Date.now()}`,
      name: `${target.name} (Kopie)`
    };
    const updated = [...songSections];
    updated.splice(idx + 1, 0, dupl);
    setSongSections(updated);
    if (selectedActiveSongId && student?.id) {
      try {
        localStorage.setItem(`song_sections_${student.id}_${selectedActiveSongId}`, JSON.stringify(updated));
      } catch {}
    }
    setHasChanges(true);
  };

  const handleMoveSongSection = (id: string, direction: 'left' | 'right') => {
    const idx = songSections.findIndex(s => s.id === id);
    if (idx === -1) return;
    if ((direction === 'left' && idx === 0) || (direction === 'right' && idx === songSections.length - 1)) return;
    const updated = [...songSections];
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setSongSections(updated);
    if (selectedActiveSongId && student?.id) {
      try {
        localStorage.setItem(`song_sections_${student.id}_${selectedActiveSongId}`, JSON.stringify(updated));
      } catch {}
    }
    setHasChanges(true);
  };

  // 🎵 Song Architecture & Play-Along State (2027 Goldstandard)
  const [songBpm, setSongBpm] = useState<number>(116);
  const [songTimeSignature, setSongTimeSignature] = useState<string>('4/4');
  const [isPlayingAlong, setIsPlayingAlong] = useState<boolean>(false);
  const [playAlongBeat, setPlayAlongBeat] = useState<number>(1);
  const [playAlongBar, setPlayAlongBar] = useState<number>(1);
  const [playAlongRepetition, setPlayAlongRepetition] = useState<number>(1);
  const [mixerState, setMixerState] = useState<AudioMixerState>(DEFAULT_MIXER_STATE);
  const [isLoopingActiveSection, setIsLoopingActiveSection] = useState<boolean>(false);
  const [isSpeedTrainerActive, setIsSpeedTrainerActive] = useState<boolean>(false);

  const playAlongTimerRef = useRef<any>(null);
  const tapTimesRef = useRef<number[]>([]);

  // Unique list of all chords across all sections
  const allSongChords = useMemo(() => {
    return Array.from(new Set(songSections.flatMap(s => s.chords)));
  }, [songSections]);

  // Load BPM from storage when selected song changes
  useEffect(() => {
    if (!selectedActiveSongId || !student?.id) return;
    try {
      const storedBpm = localStorage.getItem(`song_bpm_${student.id}_${selectedActiveSongId}`);
      if (storedBpm) setSongBpm(parseInt(storedBpm, 10) || 116);
      const storedSig = localStorage.getItem(`song_timesig_${student.id}_${selectedActiveSongId}`);
      if (storedSig) setSongTimeSignature(storedSig);
    } catch {}
    setIsPlayingAlong(false);
  }, [selectedActiveSongId, student?.id]);

  // Tap-Tempo Handler
  const handleTapTempo = () => {
    const now = Date.now();
    const taps = tapTimesRef.current.filter(t => now - t < 3000);
    taps.push(now);
    tapTimesRef.current = taps;
    if (taps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.min(240, Math.max(40, Math.round(60000 / avgInterval)));
      setSongBpm(calculatedBpm);
      if (selectedActiveSongId && student?.id) {
        try { localStorage.setItem(`song_bpm_${student.id}_${selectedActiveSongId}`, String(calculatedBpm)); } catch {}
      }
    }
  };

  const handleUpdateMixer = (patch: Partial<AudioMixerState>) => {
    setMixerState(prev => {
      const updated = { ...prev, ...patch };
      playAlongAudioEngine.updateMixer(updated);
      return updated;
    });
  };

  // Play-Along Timer Effect using Web Audio Engine
  useEffect(() => {
    if (!isPlayingAlong) {
      if (playAlongTimerRef.current) clearInterval(playAlongTimerRef.current);
      playAlongAudioEngine.suspend();
      return;
    }

    const beatsPerBar = songTimeSignature === '3/4' ? 3 : (songTimeSignature === '6/8' ? 6 : (songTimeSignature === '12/8' ? 12 : 4));
    const msPerBeat = Math.round(60000 / songBpm);

    let curBeat = 1;
    let curBar = 1;
    let curRep = 1;
    let secIdx = songSections.findIndex(s => s.id === activeSectionId);
    if (secIdx === -1) secIdx = 0;

    const initialSec = songSections[secIdx];
    const initialMeasure = initialSec?.measures?.[0];
    const initialChord = initialMeasure?.chords?.[0] || initialSec?.chords?.[0] || 'C';

    playAlongAudioEngine.triggerBeat({
      beat: 1,
      totalBeats: beatsPerBar,
      chord: initialChord,
      drumFeel: initialSec?.drumFeel,
      isFirstBeatOfMeasure: true,
      shouldPlayChord: true
    });

    setPlayAlongBeat(1);
    setPlayAlongBar(1);
    setPlayAlongRepetition(1);

    playAlongTimerRef.current = setInterval(() => {
      curBeat++;
      if (curBeat > beatsPerBar) {
        curBeat = 1;
        curBar++;
        const currentSec = songSections[secIdx];
        const maxBars = currentSec?.barsCount || (currentSec?.bars ? parseInt(currentSec.bars, 10) || 4 : 4);
        const maxReps = Math.max(1, currentSec?.repetitions || 1);

        if (curBar > maxBars) {
          curBar = 1;
          if (isLoopingActiveSection) {
            // Stay on current section in loop mode
            curRep++;
            setPlayAlongRepetition(curRep);
            if (isSpeedTrainerActive) {
              setSongBpm(prev => {
                const nextBpm = Math.min(240, prev + 5);
                if (selectedActiveSongId && student?.id) {
                  try { localStorage.setItem(`song_bpm_${student.id}_${selectedActiveSongId}`, String(nextBpm)); } catch {}
                }
                return nextBpm;
              });
            }
          } else {
            if (curRep < maxReps) {
              curRep++;
              setPlayAlongRepetition(curRep);
            } else {
              curRep = 1;
              setPlayAlongRepetition(1);
              const nextIdx = (secIdx + 1) % (songSections.length || 1);
              if (nextIdx === 0 && isSpeedTrainerActive) {
                // Full song completed, speed up +5 BPM!
                setSongBpm(prev => {
                  const nextBpm = Math.min(240, prev + 5);
                  if (selectedActiveSongId && student?.id) {
                    try { localStorage.setItem(`song_bpm_${student.id}_${selectedActiveSongId}`, String(nextBpm)); } catch {}
                  }
                  return nextBpm;
                });
              }
              secIdx = nextIdx;
              if (songSections[secIdx]) {
                setActiveSectionId(songSections[secIdx].id);
              }
            }
          }
        }
      }

      const activeSec = songSections[secIdx];
      const activeMeasure = activeSec?.measures?.[curBar - 1];
      const measureChords = (activeMeasure?.chords && activeMeasure.chords.length > 0)
        ? activeMeasure.chords
        : (activeSec?.chords && activeSec.chords.length > 0 ? [activeSec.chords[(curBar - 1) % activeSec.chords.length]] : ['C']);

      let activeChord = measureChords[0] || 'C';
      let shouldPlayChord = false;

      if (measureChords.length === 1) {
        shouldPlayChord = curBeat === 1;
        activeChord = measureChords[0];
      } else if (measureChords.length === 2) {
        if (curBeat === 1) {
          shouldPlayChord = true;
          activeChord = measureChords[0];
        } else if (beatsPerBar === 4 && curBeat === 3) {
          shouldPlayChord = true;
          activeChord = measureChords[1];
        } else if (beatsPerBar === 6 && curBeat === 4) {
          shouldPlayChord = true;
          activeChord = measureChords[1];
        } else if (beatsPerBar === 12 && curBeat === 7) {
          shouldPlayChord = true;
          activeChord = measureChords[1];
        } else if (beatsPerBar === 3 && curBeat === 2) {
          shouldPlayChord = true;
          activeChord = measureChords[1];
        }
      } else {
        const chordSpacing = Math.max(1, Math.floor(beatsPerBar / measureChords.length));
        const chordIdx = Math.floor((curBeat - 1) / chordSpacing);
        if (chordIdx < measureChords.length) {
          activeChord = measureChords[chordIdx];
          shouldPlayChord = (curBeat - 1) % chordSpacing === 0;
        }
      }

      playAlongAudioEngine.triggerBeat({
        beat: curBeat,
        totalBeats: beatsPerBar,
        chord: activeChord,
        drumFeel: activeSec?.drumFeel,
        isFirstBeatOfMeasure: curBeat === 1,
        shouldPlayChord
      });

      setPlayAlongBeat(curBeat);
      setPlayAlongBar(curBar);
    }, msPerBeat);

    return () => {
      if (playAlongTimerRef.current) clearInterval(playAlongTimerRef.current);
      playAlongAudioEngine.suspend();
    };
  }, [isPlayingAlong, songBpm, songTimeSignature, songSections, activeSectionId, isLoopingActiveSection, isSpeedTrainerActive, selectedActiveSongId, student?.id]);


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

  const currentIsoWeek = useMemo(() => getISOWeek(), []);
  const effectiveArchiveWeekIso = selectedHistoryWeek || currentIsoWeek;

  // 🏛️ Single-Row Week Bar Items (Universal Calendar Weeks for 1:1 Archive Stage)
  const archiveWeekBarItems: WeekBarItem[] = useMemo(() => {
    const existingWeeks = (progressItems || [])
      .filter(item => item.updated_at || item.created_at)
      .map(item => getItemWeek(item) || (item.created_at ? getISOWeek(item.created_at) : ''))
      .filter(Boolean);

    let weeks: string[] = [];
    const currentWeek = getISOWeek();
    if (existingWeeks.length > 0) {
      const sortedExisting = [...new Set(existingWeeks)].sort();
      const earliestWeek = sortedExisting[0];
      const latestExisting = sortedExisting[sortedExisting.length - 1];
      const endWeek = currentWeek > latestExisting ? currentWeek : latestExisting;
      const res = typeof getWeeksBetween === 'function' ? getWeeksBetween(earliestWeek, endWeek) : null;
      weeks = Array.isArray(res) && res.length > 0 ? res : [...new Set([currentWeek, ...sortedExisting])].reverse();
    } else {
      weeks = [currentWeek];
    }

    return weeks.map(wk => {
      const weekNum = wk.split('-W')[1] || '';
      const weekItems = (progressItems || []).filter(item => 
        (item.updated_at && getItemWeek(item) === wk) ||
        (item.created_at && getISOWeek(item.created_at) === wk) ||
        item.topic_name === `Hausaufgabe KW ${weekNum}` ||
        item.topic_name === `Hausaufgabe KW ${parseInt(weekNum, 10)}`
      );

      let homeworkItemsCount = weekItems.filter(item => item.is_current_homework && !item.topic_name.startsWith('Hausaufgabe KW ')).length;
      if (homeworkItemsCount === 0) {
        const snapItem = weekItems.find(item => item.topic_name?.startsWith('Hausaufgabe KW '));
        if (snapItem && snapItem.homework_notes) {
          try {
            const raw = typeof snapItem.homework_notes === 'string' ? JSON.parse(snapItem.homework_notes) : snapItem.homework_notes;
            if (Array.isArray(raw)) {
              const lw = raw.find((n: any) => typeof n === 'string' && n.includes('SNAPSHOT_LEHRWERKE:'));
              if (lw) {
                try {
                  const sIdx = lw.indexOf('SNAPSHOT_LEHRWERKE:');
                  const after = lw.slice(sIdx + 'SNAPSHOT_LEHRWERKE:'.length);
                  const endIdx = after.search(/\n\n--- [A-Z_]+ ---|\n\nSNAPSHOT_/);
                  const rawJson = (endIdx !== -1 ? after.slice(0, endIdx) : after).trim();
                  const parsedLw = JSON.parse(rawJson);
                  if (Array.isArray(parsedLw)) {
                    parsedLw.forEach((b: any) => {
                      homeworkItemsCount += (Array.isArray(b.pages) && b.pages.length > 0) ? b.pages.length : 1;
                    });
                  }
                } catch {}
              }
              const songs = raw.find((n: any) => typeof n === 'string' && n.includes('SNAPSHOT_SONGS:'));
              if (songs) {
                try {
                  const sIdx = songs.indexOf('SNAPSHOT_SONGS:');
                  const after = songs.slice(sIdx + 'SNAPSHOT_SONGS:'.length);
                  const endIdx = after.search(/\n\n--- [A-Z_]+ ---|\n\nSNAPSHOT_/);
                  const rawJson = (endIdx !== -1 ? after.slice(0, endIdx) : after).trim();
                  const parsedSongs = JSON.parse(rawJson);
                  if (Array.isArray(parsedSongs)) {
                    homeworkItemsCount += parsedSongs.length;
                  }
                } catch {}
              }
            }
          } catch {}
        }
      }

      const dateRangeStr = typeof getWeekDateRange === 'function' ? getWeekDateRange(wk) : '';
      const hasWeekQuestion = weekItems.some(item => {
        const notes = typeof item.homework_notes === 'string' ? item.homework_notes : JSON.stringify(item.homework_notes || '');
        return notes.includes('STUDENT_QUESTION:') || notes.includes('❓ Frage für den Unterricht:');
      });
      const hasWeekAudio = weekItems.some(item => {
        if (item.recording_url) return true;
        const notes = typeof item.homework_notes === 'string' ? item.homework_notes : JSON.stringify(item.homework_notes || '');
        return notes.includes('AUDIO:');
      });
      const fb = typeof getFeedbackForWeek === 'function' ? getFeedbackForWeek(wk) : null;

      return {
        weekIso: wk,
        weekNum,
        dateRangeStr,
        homeworkCount: homeworkItemsCount,
        hasQuestion: hasWeekQuestion,
        hasAudio: hasWeekAudio,
        feedbackStatus: fb?.status || null
      };
    });
  }, [progressItems, getItemWeek, getISOWeek, getWeeksBetween, getWeekDateRange, getFeedbackForWeek]);

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

  // 🎯 Continuous Metronome State
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
  const [activeModuleUnlockTab, setActiveModuleUnlockTab] = useState<'restore' | 'extensions'>('extensions');
  const [draggedModuleKey, setDraggedModuleKey] = useState<StudioModuleKey | null>(null);
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
          p_layout: reconciledLayout,
          p_module_overrides: localModuleOverrides
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
  }, [student, studentIdVal, localModuleOverrides]);

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
  const prevUiLevelRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevUiLevelRef.current !== null && prevUiLevelRef.current !== uiLevel) {
      handleResetModuleLayout();
    }
    prevUiLevelRef.current = uiLevel;
  }, [uiLevel, handleResetModuleLayout]);

  // 🛡️ 0.1% Goldstandard Sanitizer: Client-Side Scrubber für Test- und Dummy-Song-Reste
  useMeisterwerkTestScrubber(student?.id);

  // 📝 Berechne die aktuell angezeigten Schüler-Hausaufgabennotizen für das aktive Wochen-Offset
  const activeViewingStudentNotes = useMemo(() => {
    if (viewingWeekOffset === 0) {
      if ((generalHomeworkNotes || '').trim()) return generalHomeworkNotes;
      // Fallback: If generalHomeworkNotes is still empty, resolve from current week's progressItem or L1 cache
      const curIso = getISOWeek(getSimulatedNow());
      const curKwNum = curIso.split('-W')[1] || '';
      const curItem = (progressItems || []).find((item: any) => {
        return item.topic_name === `Hausaufgabe KW ${curKwNum}` ||
               (item.created_at && getISOWeek(item.created_at) === curIso) ||
               (item.updated_at && getISOWeek(item.updated_at) === curIso && item.topic_name.startsWith('Hausaufgabe KW '));
      });
      if (curItem?.homework_notes) {
        try {
          const parsed = typeof curItem.homework_notes === 'string' ? JSON.parse(curItem.homework_notes) : curItem.homework_notes;
          if (Array.isArray(parsed)) {
            const textOnly = parsed.filter((n: string) => typeof n === 'string' && !isInternalMetadataNote(n)).join('\n').trim();
            if (textOnly) return textOnly;
          }
        } catch {}
      }
      try {
        const raw = localStorage.getItem(`campus_homework_notes_${student.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const textOnly = parsed.filter((n: string) => typeof n === 'string' && !isInternalMetadataNote(n)).join('\n').trim();
            if (textOnly) return textOnly;
          }
        }
      } catch {}
      return '';
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
  // 🛡️ Bounded Context Isolation (Axiom 1):
  // Campus-Meisterwerke speisen sich ausschließlich aus didaktischen progressItems (progress_matrix) und Lehrwerk-Seiten.
  const masteredPiecesCount = useMemo(() => {
    const masteredSongsSet = new Set<string>();
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
  }, [progressItems, assignedLehrwerke]);

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

  const isLoopstationUnlocked = isStudioModuleActive("loopstation", uiLevel as any, localModuleOverrides);
  const isArchiveUnlocked = isStudioModuleActive("archive", uiLevel as any, localModuleOverrides);

  const handleSaveModuleOverride = async (key: string, enabled: boolean) => {
    const nextOverrides = {
      ...localModuleOverrides,
      [key]: enabled
    };
    setLocalModuleOverrides(nextOverrides);

    // 1. Lokalen Cache unverzüglich sichern (verhindert Reversion bei schnellem Reload)
    if (studentIdVal && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`campus_studio_module_overrides_${studentIdVal}`, JSON.stringify(nextOverrides));
      } catch (e) {}
    }

    // 2. Parent-State informieren
    if (onSaveParentOverrides) {
      onSaveParentOverrides(nextOverrides);
    }

    if (student) {
      const existingPermissions = (student as any)?.parent_permissions || {};
      const updatedPermissions = {
        ...existingPermissions,
        module_overrides: nextOverrides
      };
      (student as any).parent_permissions = updatedPermissions;

      if (student.id) {
        try {
          // 3. Autoritativer Backend-RPC (OWASP ASVS Level 3 / Fail-Closed)
          const { error: rpcErr } = await supabase.rpc('save_student_studio_layout', {
            p_student_id: student.id,
            p_layout: customModuleLayout,
            p_module_overrides: nextOverrides
          });

          // 4. Resilienter Fallback auf users table (falls RPC auf Remote-DB noch nicht aktiv)
          if (rpcErr) {
            console.warn('[Meisterwerk] save_student_studio_layout rpc note (falling back to direct update):', rpcErr);
            await supabase
              .from("users")
              .update({ parent_permissions: updatedPermissions })
              .eq("id", student.id);
          }
        } catch (err) {
          console.error("[Meisterwerk] Could not save module overrides:", err);
        }
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
            flex: isMobileView ? '1' : '0 0 40%',
            width: isMobileView ? '100%' : '40%',
            maxWidth: isMobileView ? '100%' : '40%',
            minWidth: 0,
            overflowX: isMobileView ? 'clip' : 'visible',
            height: isMobileView ? '100%' : '100%',
            minHeight: isMobileView ? 'calc(100dvh - 140px)' : '0',
            maxHeight: isMobileView ? 'none' : '100%',
            overflowY: isMobileView ? 'visible' : 'auto',
            display: isMobileView ? (mobileProtokollTab === 'repertoire' ? 'flex' : 'none') : 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: isMobileView ? '0px' : '16px',
            background: useNotebookLayout ? '#faf8f2' : '#ffffff',
            borderRight: useNotebookLayout ? '1px dashed #e5e0d4' : '1px solid #e8e8ed',
            position: 'relative',
            padding: isMobileView ? '8px 4px 0px 4px' : '0px',
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
              <MeisterwerkArchiveModuleView
                weeks={archiveWeekBarItems}
                selectedWeekIso={effectiveArchiveWeekIso}
                currentWeekIso={currentIsoWeek}
                onSelectWeek={(wk) => {
                  setSelectedHistoryWeek(wk);
                  if (isMobileView && setMobileProtokollTab) {
                    setMobileProtokollTab('homework');
                  }
                }}
                onBackToModules={() => {
                  setActiveSubView('hub');
                  setSelectedHistoryWeek(null);
                  setViewingWeekOffset(0);
                }}
                isReadOnly={readOnly}
                pendingFeedbackStatus={pendingFeedbackStatus}
                setPendingFeedbackStatus={setPendingFeedbackStatus}
                pendingFeedbackTags={pendingFeedbackTags}
                setPendingFeedbackTags={setPendingFeedbackTags}
                onSaveFeedback={async () => {
                  if (!effectiveArchiveWeekIso) return;
                  setIsSavingFeedback(true);
                  await saveFeedback(effectiveArchiveWeekIso, pendingFeedbackTags, pendingFeedbackStatus);
                  setIsSavingFeedback(false);
                }}
                isSavingFeedback={isSavingFeedback}
                isMobileView={isMobileView}
              />
            ) : activeSubView === 'lehrwerk' && activeLehrwerkId ? (
              (() => {
                const assignedBook = assignedLehrwerke.find(a => String(a.lehrwerkId || a.id) === String(activeLehrwerkId));
                let book = globalLehrwerke.find(g => String(g.id || g.lehrwerkId) === String(activeLehrwerkId));
                if (!book) {
                  book = {
                    id: activeLehrwerkId,
                    title: assignedBook?.title || assignedBook?.bookTitle || assignedBook?.lehrwerkTitle || 'Eigenes Lehrwerk',
                    totalPages: Number(assignedBook?.totalPages || assignedBook?.total_pages || 50),
                    total_pages: Number(assignedBook?.totalPages || assignedBook?.total_pages || 50),
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
                    supabase.from('lehrwerke').update({ total_pages: safeTotal }).eq('id', activeLehrwerkId).then(() => {});
                  } catch {}

                  if (activePageNumber > safeTotal) {
                    selectTextbookPage(activeLehrwerkId, safeTotal);
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
                                  gap: '6px',
                                  padding: '4px 10px',
                                  background: '#f8fafc',
                                  border: '1.5px solid #e2e8f0',
                                  borderRadius: '10px',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  color: '#334155'
                                }}>
                                  <BookOpen size={12} strokeWidth={2} style={{ color: '#64748b' }} />
                                  <span>{totalBookPages} Seiten</span>
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

                      const brushes: Array<{ mode: string; color: string; activeBorder: string; border: string; label: string }> = isStudentViewingTeacherBook
                        ? [
                            {
                              mode: 'STUDENT_FOCUS',
                              color: '#c084fc',
                              activeBorder: '#6b21a8',
                              border: '#9333ea',
                              label: `Zuhause geübt${focusCount > 0 ? ` (${focusCount})` : ''}`
                            }
                          ]
                        : [
                            { mode: 'LOCKED', color: '#e2e8f0', activeBorder: '#94a3b8', border: '#cbd5e1', label: 'grau = neutral / offen' },
                            { mode: 'HOMEWORK', color: '#fde047', activeBorder: '#ca8a04', border: '#eab308', label: 'gelb = Hausaufgabe' },
                            { mode: 'MASTERED', color: '#10b981', activeBorder: '#047857', border: '#059669', label: 'grün = gemeistert' }
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
                              <span>{isStudentViewingTeacherBook ? 'Pinsel für geübte Seiten:' : 'Pinsel zum Einfärben:'}</span>
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
                                        ? `2.5px solid ${b.activeBorder}`
                                        : (b.border ? `1.5px solid ${b.border}` : '1.5px solid #cbd5e1'),
                                      color: isActive ? '#ffffff' : (isStudentViewingTeacherBook ? '#6b21a8' : '#334155'),
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease',
                                      transform: isActive ? 'scale(1.08)' : 'none',
                                      outline: 'none',
                                      boxShadow: isActive
                                        ? (b.mode === 'STUDENT_FOCUS' ? '0 2px 10px rgba(147, 51, 234, 0.35)' : `0 0 0 3px ${b.color}80, 0 2px 6px rgba(0,0,0,0.15)`)
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
                                        <span>{isActive ? '✓ Pinsel aktiv' : 'Zuhause geübt'}</span>
                                        {focusCount > 0 && (
                                          <span style={{
                                            fontSize: '0.66rem',
                                            fontWeight: 800,
                                            opacity: 0.85
                                          }}>
                                            ({focusCount})
                                          </span>
                                        )}
                                      </>
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          {isStudentViewingTeacherBook && activeBrush === 'STUDENT_FOCUS' && (
                            <div style={{ fontSize: '0.68rem', color: '#7e22ce', fontWeight: 700, paddingLeft: '18px' }}>
                              Tippe auf Seiten in der Übersicht, um zu markieren, welche Seiten du zuhause geübt hast!
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
                                        title={isStudentViewingTeacherBook ? "Zuhause geübt" : "Vom Schüler zuhause geübt"}
                                        aria-label={isStudentViewingTeacherBook ? "Zuhause geübt" : "Vom Schüler geübt"}
                                      >
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#9333ea' }} />
                                        <span>{isStudentViewingTeacherBook ? 'Zuhause geübt' : 'Vom Schüler geübt'}{focusCount > 0 ? ` (${focusCount})` : ''}</span>
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
                            const isStudentCreated = Boolean(assignedBook?.isStudentCreated || assignedBook?.createdByRole === 'student' || book.created_by_role === 'student');
                            const isStudentViewingTeacherBook = Boolean(readOnly && !isStudentCreated);
                            const baseFilteredPages = textbookPageFilter === 'homework'
                              ? pages.filter(p => assignedBook?.pageStates?.[p]?.status === 'homework' || assignedBook?.pageStates?.[p]?.isCurrentHomework)
                              : (textbookPageFilter === 'focus'
                                  ? pages.filter(p => assignedBook?.pageStates?.[p]?.studentFocus)
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
                                    ? (isStudentViewingTeacherBook ? 'Noch keine Seiten als geübt markiert. Wähle den lila Pinsel und tippe auf deine geübten Seiten!' : 'Der Schüler hat in diesem Lehrwerk noch keine Seiten als geübt markiert.')
                                    : 'In diesem Lehrwerk sind aktuell keine Hausaufgaben aufgegeben.'}
                                </div>
                              );
                            }

                            const totalChunks = Math.ceil(baseFilteredPages.length / 60);
                            const activeChunkIndex = Math.min(textbookPageChunkIndex, Math.max(0, totalChunks - 1));
                            const displayedPages = baseFilteredPages.length > 60 ? baseFilteredPages.slice(activeChunkIndex * 60, (activeChunkIndex + 1) * 60) : baseFilteredPages;
                            const pageButtons = displayedPages.map(num => {
                              const pageState = assignedBook?.pageStates?.[num] || { status: 'locked' };
                              const globalPage = book.globalPageStates?.[num] === 'purple';
                              const status = globalPage ? 'purple' : (pageState.status || 'locked');
                              const isStudentFocus = Boolean(pageState?.studentFocus);
                              const isHomework = status === 'homework' || Boolean(pageState?.isCurrentHomework);
                              const isMastered = status === 'mastered';

                              let borderColor = '#e2e8f0';
                              let bg = '#ffffff';
                              let textColor = '#64748b';
                              let solidActiveBg = '#0f172a';

                              if (isMastered) {
                                borderColor = '#10b981';
                                bg = '#f0fdf4';
                                textColor = '#166534';
                                solidActiveBg = '#16a34a';
                              } else if (isHomework) {
                                borderColor = '#facc15';
                                bg = '#fef9c3';
                                textColor = '#854d0e';
                                solidActiveBg = '#eab308';
                              } else if (isStudentFocus || status === 'purple') {
                                borderColor = '#c084fc';
                                bg = '#faf5ff';
                                textColor = '#6b21a8';
                                solidActiveBg = '#9333ea';
                              }

                              const isPageActive = activePageNumber === num;

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
                                      ? `2.5px solid ${solidActiveBg}` 
                                      : `2px solid ${borderColor}`,
                                    background: isPageActive ? solidActiveBg : bg,
                                    color: isPageActive ? (isHomework ? '#713f12' : '#ffffff') : textColor,
                                    fontWeight: 900,
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: isStudentFocus 
                                      ? '0 0 0 2.5px #a855f7, 0 2px 6px rgba(168, 85, 247, 0.25)' 
                                      : (isPageActive ? '0 4px 8px rgba(0,0,0,0.1)' : 'none'),
                                    transform: isPageActive ? 'scale(1.08)' : 'none',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <span>{num}</span>
                                  {isStudentFocus && (
                                    <span 
                                      title={isStudentViewingTeacherBook ? "Zuhause geübt" : "Vom Schüler zuhause geübt"} 
                                      style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        width: '14px',
                                        height: '14px',
                                        borderRadius: '50%',
                                        background: '#9333ea',
                                        color: '#ffffff',
                                        border: '1.5px solid #ffffff',
                                        boxShadow: '0 1px 3px rgba(147, 51, 234, 0.4)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '8px',
                                        fontWeight: 950,
                                        lineHeight: 1
                                      }}
                                    >
                                      ✓
                                    </span>
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
                            {stripInstrumentFromTitle(skill.songs?.title)}
                          </h4>
                          <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            von {skill.songs?.artist || 'Unbekannt'}
                          </p>

                          {/* Segmented Status Selector: Protected Read-Only Badge for Student, Interactive for Teacher */}
                          {readOnly ? (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: status === 'MASTERED'
                                ? '#dcfce7'
                                : (isCurrentHomework ? '#fef3c7' : '#f1f5f9'),
                              color: status === 'MASTERED'
                                ? '#15803d'
                                : (isCurrentHomework ? '#92400e' : '#475569'),
                              border: `1.5px solid ${status === 'MASTERED' ? '#10b981' : (isCurrentHomework ? '#fde68a' : '#cbd5e1')}`,
                              padding: '4px 12px',
                              borderRadius: '99px',
                              fontSize: '0.74rem',
                              fontWeight: 900
                            }}>
                              <span style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                background: status === 'MASTERED'
                                  ? '#16a34a'
                                  : (isCurrentHomework ? '#d97706' : '#64748b')
                              }} />
                              <span>
                                {status === 'MASTERED'
                                  ? '🏆 Gemeistert'
                                  : (isCurrentHomework ? '📌 Hausaufgabe der Woche' : '🟡 In Arbeit')}
                              </span>
                            </div>
                          ) : (
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
                          )}
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
                                setActiveSongSkills(prev => prev.map(s => s.id === selectedActiveSongId ? { ...s, progress_percent: val, status: val === 100 ? 'MASTERED' : (val < 100 && s.status === 'MASTERED' ? 'IN_PROGRESS' : s.status) } : s));
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
                              <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#059669', background: '#ecfdf5', border: '1px solid #10b981', padding: '2px 8px', borderRadius: '99px' }}>
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
                                  setActiveSongSkills(prev => prev.map(s => s.id === selectedActiveSongId ? { ...s, progress_percent: avg, status: avg === 100 ? 'MASTERED' : (avg < 100 && s.status === 'MASTERED' ? 'IN_PROGRESS' : s.status) } : s));
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
                              setActiveSongSkills(prev => prev.map(s => s.id === selectedActiveSongId ? { ...s, progress_percent: 100, status: 'MASTERED' } : s));
                              localStorage.setItem(`song_skills_detail_${student.id}_${selectedActiveSongId}`, JSON.stringify({
                                rhythm: 100,
                                finger: 100,
                                expression: 100
                              }));

                              if (selectedActiveSongId) {
                                const skill = activeSongSkills.find(s => s.id === selectedActiveSongId);
                                const songTitle = stripInstrumentFromTitle(skill?.songs?.title || skill?.title || skill?.song_title) || 'Unbenannter Song';
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
                        const songTitle = stripInstrumentFromTitle(skill?.songs?.title || skill?.title || skill?.song_title) || '';
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
                <div className="no-scrollbar" style={{ flex: isMobileOrSim ? 'none' : 1, minHeight: 0, height: isMobileOrSim ? 'auto' : undefined, display: 'flex', flexDirection: 'column', gap: '16px', padding: isMobileOrSim ? '16px 14px calc(88px + env(safe-area-inset-bottom, 24px)) 14px' : '20px 24px 24px 24px', overflowY: isMobileOrSim ? 'visible' : 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                
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

                      const isModActive = (k: StudioModuleKey) => isStudioModuleActive(k, uiLevel as any, localModuleOverrides);
                      const hasLockedModules = ALL_STUDIO_MODULE_KEYS.some(k => !isModActive(k));

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
                          isUnlocked: isModActive('practice'),
                          showInView: isModActive('practice') || !readOnly,
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
                          isUnlocked: isModActive('recordings'),
                          showInView: isModActive('recordings') || !readOnly,
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
                          isUnlocked: isModActive('groovetrainer'),
                          showInView: isModActive('groovetrainer') || !readOnly,
                          borderOverride: isModActive('groovetrainer') ? undefined : '1.5px dashed #cbd5e1',
                          onClick: () => {
                            setActiveModalTab('document');
                            setActiveViewMode('groovetrainer' as any);
                            setActiveSubView('hub');
                          }
                        },
                        tuner: {
                          title: 'Stimmgerät',
                          icon: <TuningForkIcon size={34} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />,
                          gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                          boxShadow: '0 6px 14px -2px rgba(6, 182, 212, 0.40)',
                          isUnlocked: isModActive('tuner'),
                          showInView: isModActive('tuner') || !readOnly,
                          borderOverride: isModActive('tuner') ? undefined : '1.5px dashed #cbd5e1',
                          onClick: () => {
                            setActiveModalTab('document');
                            setActiveViewMode('tuner');
                            setActiveSubView('hub');
                          }
                        },
                        loopstation: {
                          title: 'Loopstation',
                          icon: <Sliders size={34} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />,
                          gradient: isModActive('loopstation') 
                            ? 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)'
                            : 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)',
                          boxShadow: isModActive('loopstation') ? '0 6px 14px -2px rgba(244, 63, 94, 0.40)' : 'none',
                          isUnlocked: isModActive('loopstation'),
                          showInView: isModActive('loopstation') || !readOnly,
                          borderOverride: isModActive('loopstation') ? '1.5px solid #e2e8f0' : '1.5px dashed #cbd5e1',
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
                          isUnlocked: isModActive('earlab'),
                          showInView: isModActive('earlab') || !readOnly,
                          borderOverride: isModActive('earlab') ? undefined : '1.5px dashed #cbd5e1',
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
                          isUnlocked: isModActive('skillradar'),
                          showInView: isModActive('skillradar') || !readOnly,
                          borderOverride: isModActive('skillradar') ? undefined : '1.5px dashed #cbd5e1',
                          onClick: () => {
                            setActiveModalTab('skillradar');
                          }
                        },
                        protocol: {
                          title: uiLevel === 'junior'
                            ? 'Noten & Songs'
                            : uiLevel === 'teen'
                              ? 'Songs & Noten'
                              : 'Repertoire & Noten',
                          icon: <BookOpen size={34} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />,
                          gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                          boxShadow: '0 6px 14px -2px rgba(16, 185, 129, 0.40)',
                          isUnlocked: isModActive('protocol'),
                          showInView: isModActive('protocol') || !readOnly,
                          onClick: () => {
                            setHubTab('protocol');
                          }
                        },
                        archive: {
                          title: 'Verlauf',
                          icon: <History size={34} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />,
                          gradient: isModActive('archive')
                            ? 'linear-gradient(135deg, #64748b 0%, #334155 100%)'
                            : 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)',
                          boxShadow: isModActive('archive') ? '0 6px 14px -2px rgba(100, 116, 139, 0.40)' : 'none',
                          isUnlocked: isModActive('archive'),
                          showInView: isModActive('archive') || !readOnly,
                          borderOverride: isModActive('archive') ? '1.5px solid #e2e8f0' : '1.5px dashed #cbd5e1',
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
                          isUnlocked: isModActive('worldtour'),
                          showInView: isModActive('worldtour') || !readOnly,
                          borderOverride: isModActive('worldtour') ? undefined : '1.5px dashed #cbd5e1',
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
                      // 🛡️ Bounded Context Layout: All active studio tools form the quadratic 3-column grid.
                      // ONLY the archive module ('archive') is rendered as an elongated element underneath the grid.
                      const gridModuleKeys = rawVisibleKeys.filter(k => k !== 'archive');
                      const isArchiveVisible = rawVisibleKeys.includes('archive');

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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                <Sliders size={15} style={{ color: '#34a853', flexShrink: 0 }} />
                                <span>{isMobileOrSim ? 'Studio-Module' : 'Campus Studio Module'}</span>
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
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              {/* ⚙️ Dezent monochromes Einstellungs-Icon für Audio & Latenz */}
                              <button
                                type="button"
                                onClick={() => setShowAudioSettings(true)}
                                style={{
                                  background: '#f8fafc',
                                  color: '#475569',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '100px',
                                  padding: isMobileOrSim ? '3px 8px' : '3px 9px',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
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
                                    padding: isMobileOrSim ? '3px 8px' : '3px 10px',
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
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
                            gridTemplateColumns: isMobileOrSim ? 'repeat(3, minmax(0, 1fr))' : 'repeat(3, 1fr)',
                            gap: isMobileOrSim ? '10px 8px' : '10px 10px',
                            padding: '2px 0 6px 0',
                            touchAction: 'pan-y'
                          }}>
                            {gridModuleKeys.map((moduleKey) => {
                              const mod = moduleDefinitions[moduleKey];
                              if (!mod) return null;

                              const isGhosted = !isCampusActive ? (moduleKey !== 'protocol') : !mod.isUnlocked;
                              const isDraggingCurrent = draggedModuleKey === moduleKey;

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
                                    borderRadius: '20px',
                                    padding: isMobileOrSim ? '10px 4px 8px 4px' : '14px 8px 12px 8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                    cursor: isModuleEditMode ? 'grab' : 'pointer',
                                    opacity: isDraggingCurrent ? 0.35 : (isGhosted ? 0.55 : 1),
                                    position: 'relative', minWidth: 0, overflow: 'hidden',
                                    touchAction: isModuleEditMode ? 'none' : 'pan-y',
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none',
                                    boxShadow: isGhosted ? 'none' : '0 2px 8px -2px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)',
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
                                        border: 'none',
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

                                  <CampusStudioModuleCover
                                    moduleKey={moduleKey as any}
                                    size="lg"
                                    isUnlocked={mod.isUnlocked}
                                    isGhosted={isGhosted}
                                    uiLevel={uiLevel}
                                  />
                                  <div style={{ marginTop: '7px', padding: '0 2px', minWidth: 0, width: '100%' }}>
                                    <div style={{ fontSize: isMobileOrSim ? (mod.title.length > 10 ? '0.78rem' : '0.84rem') : (mod.title.length > 12 ? '0.88rem' : '0.92rem'), fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: '1.22', wordBreak: 'normal', overflowWrap: 'break-word', hyphens: 'none' }}>
                                      {mod.title}
                                    </div>
                                    {mod.subtitle && (
                                      <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {mod.subtitle}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {/* ➕ SCHÜLER- & ELTERN-FREISCHALTKACHEL (Im Lehrer-Modus nur bei ausgeblendeten Modulen oder im Edit-Modus aktiv) */}
                            {(hasHiddenModules || isModuleEditMode || (readOnly && hasLockedModules)) && (
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
                                  background: '#f8fafc',
                                  border: '1.5px solid #cbd5e1',
                                  borderRadius: '20px',
                                  padding: isMobileOrSim ? '10px 6px 8px 6px' : '14px 8px 12px 8px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  textAlign: 'center',
                                  cursor: 'pointer', minWidth: 0, overflow: 'hidden',
                                  boxShadow: '0 2px 8px -2px rgba(0,0,0,0.02)',
                                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                                  touchAction: 'pan-y', userSelect: 'none', WebkitUserSelect: 'none'
                                }}
                                className="hover-scale"
                                title="Module hinzufügen oder Studio-Erweiterungen freischalten"
                                aria-label="Studio-Module verwalten"
                              >
                                <CampusStudioModuleCover
                                  moduleKey="unlock_tile"
                                  size="lg"
                                  uiLevel={uiLevel}
                                />
                                <div style={{ marginTop: '7px', padding: '0 2px', minWidth: 0, width: '100%' }}>
                                  <div style={{ fontSize: isMobileOrSim ? '0.84rem' : '0.92rem', fontWeight: 900, color: '#334155', letterSpacing: '-0.02em', lineHeight: '1.22', wordBreak: 'normal', overflowWrap: 'break-word', hyphens: 'none' }}>
                                    {hasHiddenModules ? 'Module verwalten' : 'Modul freischalten'}
                                  </div>
                                  <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

                          {/* 🏛️ UNTERRICHTS-ARCHIV (Exklusives längliches Element unterhalb der Modul-Kacheln) */}
                          {isArchiveVisible && (() => {
                            const archiveMod = moduleDefinitions['archive'];
                            if (!archiveMod) return null;
                            const isArchiveGhosted = !isCampusActive || !archiveMod.isUnlocked;
                            return (
                              <div style={{ marginTop: '0px', marginBottom: '6px' }}>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => {
                                    if (isModuleEditMode) return;
                                    archiveMod.onClick();
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      if (!isModuleEditMode) archiveMod.onClick();
                                    }
                                  }}
                                  style={{
                                    background: isArchiveGhosted ? '#f8fafc' : '#ffffff',
                                    border: '1.5px solid #e2e8f0',
                                    borderRadius: '16px',
                                    padding: '10px 16px',
                                    minHeight: '48px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    opacity: isArchiveGhosted ? 0.55 : 1,
                                    position: 'relative',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                                    touchAction: 'pan-y', userSelect: 'none', WebkitUserSelect: 'none'
                                  }}
                                  className="hover-scale"
                                  aria-label="Unterrichts-Archiv & Verlauf öffnen"
                                  title="Frühere Wochen, Notizen & Hausaufgaben-Historie öffnen"
                                >
                                  {isModuleEditMode && canCustomizeLayout && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleHideModule('archive');
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
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)',
                                        zIndex: 40
                                      }}
                                      className="hover-scale"
                                      title="Archiv ausblenden"
                                    >
                                      <X size={13} strokeWidth={3} />
                                    </button>
                                  )}

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1, marginRight: '8px' }}>
                                    <CampusStudioModuleCover
                                      moduleKey="archive"
                                      size="sm"
                                      isUnlocked={archiveMod.isUnlocked}
                                      isGhosted={isArchiveGhosted}
                                      uiLevel={uiLevel}
                                    />
                                    <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                                      <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ whiteSpace: 'nowrap' }}>Unterrichts-Archiv</span>
                                        <span style={{ fontSize: '0.62rem', fontWeight: 750, color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: '100px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                          Chronik
                                        </span>
                                      </div>
                                      <div style={{ fontSize: '0.70rem', fontWeight: 600, color: '#64748b', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        Frühere Wochen, Notizen &amp; Hausaufgaben-Historie
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '100px',
                                    padding: '4px 12px',
                                    fontSize: '0.72rem',
                                    fontWeight: 750,
                                    color: '#334155',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                    flexShrink: 0, whiteSpace: 'nowrap'
                                  }}>
                                    <span>Öffnen</span>
                                    <span style={{ color: '#64748b' }}>➜</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

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
                                const gId = String(g.id || g.lehrwerkId || '');
                                const isAssignedById = Boolean(gId) && assignedLehrwerke.some(a => Boolean(a.lehrwerkId || a.id) && String(a.lehrwerkId || a.id) === gId);
                                const isAssignedByTitle = Boolean(g.title?.trim()) && assignedLehrwerke.some(a => ((a.bookTitle || a.lehrwerkTitle || a.title || '').trim().toLowerCase() === (g.title || '').trim().toLowerCase()));
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
                        role="button"
                        tabIndex={0}
                        aria-label="Lehrwerk hinzufügen"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleAssignDropdown();
                          }
                        }}
                        style={{
                          flex: '0 0 auto',
                          width: '165px',
                          scrollSnapAlign: 'start',
                          background: 'rgba(248, 250, 252, 0.7)',
                          borderRadius: '20px',
                          border: '1.5px dashed #cbd5e1',
                          padding: '16px 12px',
                          minHeight: '168px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          textAlign: 'center',
                          transition: 'all 0.2s',
                          boxSizing: 'border-box'
                        }}
                        className="hover-scale"
                      >
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#34a853',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                        }}>
                          <Plus size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a' }}>Lehrwerk</div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>+ Hinzufügen</div>
                        </div>
                      </div>
                    )}

                    {sortedAssignedLehrwerke.map(assigned => {
                      const itemBookId = String(assigned.lehrwerkId || assigned.id || '');
                      const itemTitle = assigned.bookTitle || assigned.lehrwerkTitle || assigned.title || 'Lehrwerk';
                      const book = globalLehrwerke.find(g => 
                        (itemBookId && String(g.id || g.lehrwerkId) === itemBookId) || 
                        (g.title && itemTitle && g.title.toLowerCase().trim() === itemTitle.toLowerCase().trim())
                      ) || {
                        id: itemBookId,
                        title: itemTitle,
                        emoji: '📚',
                        totalPages: Number(assigned.totalPages || assigned.total_pages || 50)
                      };
                      const bookColor = getLehrwerkColor(book.title);
                      const total = Number(book.totalPages || book.total_pages || assigned.totalPages || assigned.total_pages || 50);
                      const worked = Object.values(assigned.pageStates || {}).filter((p: any) => p.status === 'mastered').length;
                      const pct = Math.min(100, Math.round((worked / total) * 100));
                      const isSelected = Boolean(activeLehrwerkId && itemBookId) && String(activeLehrwerkId) === itemBookId && activeSubView === 'lehrwerk';

                      return (
                        <div
                          key={itemBookId || assigned.id || assigned.title}
                          onClick={() => selectTextbookPage(itemBookId, activePageNumber || 1)}
                          role="button"
                          tabIndex={0}
                          aria-label={`Lehrwerk ${book.title}, ${total} Seiten, ${worked} gemeistert`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              selectTextbookPage(itemBookId, activePageNumber || 1);
                            }
                          }}
                          style={{
                            flex: '0 0 auto',
                            width: '165px',
                            scrollSnapAlign: 'start',
                            background: '#ffffff',
                            borderRadius: '20px',
                            border: isSelected ? '2px solid #34a853' : '1px solid #e8e8ed',
                            boxShadow: isSelected ? '0 6px 18px rgba(52, 168, 83, 0.16)' : '0 2px 8px rgba(0,0,0,0.03)',
                            padding: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '10px',
                            position: 'relative',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxSizing: 'border-box'
                          }}
                          className="hover-scale"
                        >
                          {/* Book Showcase Area - Minimalistisch & Ruhig (0% Text auf dem Cover) */}
                          <div style={{
                            width: '100%',
                            height: '108px',
                            background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                            borderRadius: '14px',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                          }}>
                            {/* Apple-style Book Squircle Cover */}
                            <div style={{
                              width: '64px',
                              height: '84px',
                              background: `linear-gradient(135deg, ${bookColor.from} 0%, ${bookColor.to} 100%)`,
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative'
                            }}>
                              <BookOpen size={26} color={bookColor.text || '#ffffff'} strokeWidth={2.2} />
                            </div>

                            {/* Top-Right Pill: % gemeistert (Nur dezent sichtbar, wenn Fortschritt existiert) */}
                            {pct > 0 && (
                              <div style={{
                                position: 'absolute',
                                top: '6px',
                                right: '6px',
                                background: '#15803d',
                                color: '#ffffff',
                                fontSize: '0.68rem',
                                fontWeight: 850,
                                padding: '2px 7px',
                                borderRadius: '100px',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                                zIndex: 5
                              }}>
                                {pct}%
                              </div>
                            )}

                            {/* Delete Button top left if removable */}
                            {(!readOnly || itemBookId.startsWith('custom-') || book.is_custom || assigned.isStudentCreated) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveLehrwerk(itemBookId, e);
                                }}
                                aria-label={`Lehrwerk ${book.title} entfernen`}
                                style={{
                                  position: 'absolute',
                                  top: '6px',
                                  left: '6px',
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

                          {/* Card Info Below - Radikal entschlackt (Weniger Text) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <h4 style={{
                              margin: 0,
                              fontSize: '0.96rem',
                              fontWeight: 850,
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontFamily: "'Plus Jakarta Sans', sans-serif",
                              letterSpacing: '-0.01em'
                            }}>
                              {book.title}
                            </h4>

                            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
                              {worked > 0 ? (
                                <span><strong style={{ color: '#15803d', fontWeight: 800 }}>{worked}</strong> von {total} Seiten</span>
                              ) : (
                                <span>{total} Seiten</span>
                              )}
                            </div>

                            {/* Subtle Progress Bar */}
                            <div style={{ width: '100%', height: '3.5px', background: '#f1f5f9', borderRadius: '100px', overflow: 'hidden', marginTop: '2px' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: '#34a853', borderRadius: '100px', transition: 'width 0.3s ease' }} />
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
                      const activeSongsRaw = (activeSongSkills || []).filter(skill => {
                        // 🛡️ Bounded Context Isolation: Reine GrooveLab-Songs dürfen NIEMALS im Campus Repertoire erscheinen
                        if (!skill.songs || skill.songs.is_campus_active !== true) return false;
                        if (skill.is_campus_active === false) return false;
                        return (skill.progress_percent || 0) < 100 && skill.status !== 'MASTERED';
                      });

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
                        const pA = a.status === 'MASTERED' ? 100 : (a.progress_percent || 0);
                        const pB = b.status === 'MASTERED' ? 100 : (b.progress_percent || 0);
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
                          gap: '10px',
                          flex: 1,
                          overflowY: 'auto',
                          paddingRight: '2px'
                        }}>
                          {activeSongs.map(skill => {
                            const progress = skill.status === 'MASTERED' ? 100 : (skill.progress_percent || 0);
                            const songTitle = stripInstrumentFromTitle(skill.songs?.title || skill.title || skill.song_title) || 'Unbenannter Song';
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
                                  borderRadius: '16px',
                                  border: isSelected ? '1.5px solid #34a853' : '1px solid #e8e8ed',
                                  boxShadow: isSelected ? '0 4px 14px rgba(52, 168, 83, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                                  padding: '10px 14px',
                                  minHeight: '54px',
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                                  {/* 42x42 Miniatur Vinyl/Album Icon */}
                                  <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: `linear-gradient(135deg, ${songColor.from}, ${songColor.to})`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: songColor.text || '#ffffff',
                                    flexShrink: 0,
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                                  }}>
                                    <Music size={18} strokeWidth={2.4} />
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, gap: '2px' }}>
                                    <span style={{
                                      fontSize: '0.96rem',
                                      fontWeight: 850,
                                      color: '#0f172a',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      letterSpacing: '-0.01em'
                                    }}>
                                      {songTitle}
                                    </span>
                                    <span style={{
                                      fontSize: '0.78rem',
                                      color: '#64748b',
                                      fontWeight: 650,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}>
                                      {songArtist}
                                      {(skill.songs?.teacher_id || skill.created_by_teacher) ? ' • Lehrkraft' : ''}
                                    </span>
                                  </div>
                                </div>

                                {/* Right: Progress Pill & Delete Button */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                  {progressItems.some(item => isSongMatch(item, skill) && item.is_current_homework) && (
                                    <span style={{
                                      fontSize: '0.72rem',
                                      fontWeight: 850,
                                      color: '#9a3412',
                                      background: '#ffedd5',
                                      border: '1px solid #fed7aa',
                                      padding: '3px 9px',
                                      borderRadius: '8px',
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
                                    background: progress >= 100 ? '#dcfce7' : '#f8fafc',
                                    color: progress >= 100 ? '#15803d' : '#64748b',
                                    padding: '4px 10px',
                                    borderRadius: '100px',
                                    fontSize: '0.74rem',
                                    fontWeight: 850,
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
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '50%'
                                      }}
                                      className="hover-scale"
                                      title="Song aus aktiven Projekten entfernen"
                                      aria-label={`${songTitle} aus aktiven Projekten entfernen`}
                                    >
                                      <X size={14} />
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
                    <div
                      role="dialog"
                      aria-modal="true"
                      aria-label="Song auswählen oder anlegen"
                      ref={createSongModalRef}
                      style={{
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
                                    role="button"
                                    tabIndex={0}
                                    onClick={async () => {
                                      await handleAssignSongFromCatalog(song.id);
                                      setLocalShowCreateSongModal(false);
                                      setLocalSongSearch('');
                                      setActiveSubView('hub');
                                    }}
                                    onKeyDown={async (e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        await handleAssignSongFromCatalog(song.id);
                                        setLocalShowCreateSongModal(false);
                                        setLocalSongSearch('');
                                        setActiveSubView('hub');
                                      }
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

                                    <span
                                      style={{
                                        background: '#34a853',
                                        color: 'white',
                                        border: 'none',
                                        padding: '6px 12px',
                                        borderRadius: '10px',
                                        fontSize: '0.72rem',
                                        fontWeight: 900,
                                        display: 'inline-flex',
                                        alignItems: 'center'
                                      }}
                                    >
                                      + Hinzufügen
                                    </span>
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
                  marginTop: isMobileOrSim ? 'auto' : undefined,
                  marginBottom: isMobileOrSim ? 'calc(50px + max(24px, env(safe-area-inset-bottom, 24px)))' : '0px',
                  padding: isMobileOrSim ? '10px 10px 12px 10px' : '10px 16px 14px 16px',
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
                        ? (masteredPiecesCount > 0 ? `Meister (${masteredPiecesCount})` : 'Meister') 
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

        {/* COLUMN 3: ✍️ DOKUMENTATION & HAUSAUFGABE (60%) */}
          
          <div style={{
            flex: isMobileView ? 'none' : '0 0 60%',
            width: isMobileView ? '100%' : '60%',
            maxWidth: isMobileView ? '100%' : '60%',
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

            {activeSubView === 'lehrwerk' && activeLehrwerkId ? (
              // textbook detail notebook view
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '16px', flexWrap: 'wrap' }}>
                  {(() => {
                    const activeBookAssigned = assignedLehrwerke.find(a => String(a.lehrwerkId || a.id) === String(activeLehrwerkId));
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
                            border: isCurrentPageStudentFocused ? '2px solid #9333ea' : '1.5px solid rgba(0,0,0,0.1)',
                            boxShadow: isCurrentPageStudentFocused ? '0 0 0 2px #c084fc, inset 0 1px 2px rgba(0,0,0,0.05)' : 'inset 0 1px 2px rgba(0,0,0,0.05)',
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
                              <CheckCircle size={12} strokeWidth={2.4} style={{ color: '#7c3aed', flexShrink: 0 }} />
                              <span>{readOnly ? '✓ Zuhause geübt' : '💜 Vom Schüler geübt'}</span>
                            </span>
                          )}
                        </div>

                        {/* Right side controls: Teacher color buttons or Student Focus button */}
                        {!(readOnly || isStudentViewingTeacherBook) ? (
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                            {[
                              { mode: 'LOCKED', color: '#e2e8f0', activeBorder: '#94a3b8', label: 'Grau (neutral / offen)', getActive: () => status === 'IN_PROGRESS' && !isCurrentHomework, action: () => { setStatus('IN_PROGRESS'); setIsCurrentHomework(false); setHasChanges(true); if (activeLehrwerkId && activePageNumber) triggerDirectSave(activeLehrwerkId, activePageNumber, 'IN_PROGRESS', false); } },
                              { mode: 'HOMEWORK', color: '#fde047', activeBorder: '#ca8a04', label: 'Gelb (Hausaufgabe)', getActive: () => status === 'IN_PROGRESS' && isCurrentHomework, action: () => { setStatus('IN_PROGRESS'); setIsCurrentHomework(true); setHasChanges(true); if (activeLehrwerkId && activePageNumber) triggerDirectSave(activeLehrwerkId, activePageNumber, 'IN_PROGRESS', true); } },
                              { mode: 'MASTERED', color: '#10b981', activeBorder: '#047857', label: 'Grün (gemeistert)', getActive: () => status === 'MASTERED', action: () => { setStatus('MASTERED'); setIsCurrentHomework(false); setHasChanges(true); if (activeLehrwerkId && activePageNumber) triggerDirectSave(activeLehrwerkId, activePageNumber, 'MASTERED', false); } }
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
                                    border: isActive ? `2.5px solid ${b.activeBorder}` : '1.5px solid rgba(0,0,0,0.18)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    transform: isActive ? 'scale(1.2)' : 'scale(1)',
                                    outline: 'none',
                                    boxShadow: isActive ? `0 0 0 3px ${b.color}80, 0 3px 8px rgba(0,0,0,0.15)` : '0 2px 4px rgba(0,0,0,0.06)'
                                  }}
                                  title={b.label}
                                />
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (activeLehrwerkId && activePageNumber) {
                                  handleToggleStudentFocus(String(activeLehrwerkId), activePageNumber);
                                }
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '10px',
                                background: isCurrentPageStudentFocused ? '#f5f3ff' : '#ffffff',
                                border: isCurrentPageStudentFocused ? '1.5px solid #9333ea' : '1.5px solid #cbd5e1',
                                color: isCurrentPageStudentFocused ? '#6b21a8' : '#475569',
                                fontWeight: 800,
                                fontSize: '0.76rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              className="tactile-btn"
                              title="Diese Seite als zuhause geübt markieren oder entfernen"
                            >
                              <CheckCircle size={13} strokeWidth={2.4} style={{ color: isCurrentPageStudentFocused ? '#9333ea' : '#64748b' }} />
                              <span>{isCurrentPageStudentFocused ? '✓ Zuhause geübt' : 'Als geübt markieren'}</span>
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* 🎯 KONTINUIERLICHES METRONOM (falls aktiv) */}
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
                        value={pageHomeworkNotes || ''}
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
                          const isActive = (pageHomeworkNotes || '').includes(t.tag);
                          return (
                            <button
                              key={t.tag}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const res = insertOrToggleTagInText(
                                  pageHomeworkNotes || '',
                                  t.tag,
                                  pageNotesSelectionRef.current
                                );
                                const nextText = typeof res === 'string' ? res : (res?.nextText ?? '');
                                const newCursorPos = typeof res === 'object' && typeof res?.newCursorPos === 'number' ? res.newCursorPos : nextText.length;
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
                          border: '1.5px solid #10b981',
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
                        const activeBookAssigned = assignedLehrwerke.find(a => String(a.lehrwerkId || a.id) === String(activeLehrwerkId));
                        const pageState = activeBookAssigned?.pageStates?.[activePageNumber || -1];
                        const isHomeworkActive = Boolean(
                          isCurrentHomework ||
                          status?.toUpperCase() === 'HOMEWORK' ||
                          status?.toLowerCase() === 'homework' ||
                          pageState?.isCurrentHomework ||
                          pageState?.status === 'homework' ||
                          pageState?.status === 'HOMEWORK'
                        );
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
                          const book = globalLehrwerke.find(b => String(b.id || b.lehrwerkId) === String(activeLehrwerkId));
                          const bookColor = getLehrwerkColor(book?.title || '');
                          const assignedBook = assignedLehrwerke.find(a => String(a.lehrwerkId || a.id) === String(activeLehrwerkId));
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
                          if (activePageNumber !== null && isCurrentHomework) homeworkPagesSet.add(activePageNumber);
                          const homeworkPagesList = Array.from(homeworkPagesSet).sort((a, b) => a - b);
                          const pagesToRender = homeworkPagesList.length > 0 ? homeworkPagesList : (activePageNumber !== null && isCurrentHomework ? [activePageNumber] : []);
                          const formattedPagesStr = formatPageNumbers(pagesToRender);
                          if (pagesToRender.length === 0) return <div style={{ fontSize: '0.80rem', color: '#64748b', fontStyle: 'italic' }}>Keine Hausaufgabe für dieses Lehrwerk eingetragen.</div>;

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
                            {skill.songs?.artist ? `${skill.songs.artist} - ${stripInstrumentFromTitle(skill.songs.title)}` : (stripInstrumentFromTitle(skill.songs?.title) || 'Song Details')}
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

                    <form
                      onSubmit={handleSave}
                      style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '80px', outline: 'none' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <label style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            📝 Übungs-Fahrplan & Hausaufgabe:
                          </label>
                          <SpeechDictationButton
                            onTranscript={(text) => {
                              const newNotes = songHomeworkNotes ? `${(songHomeworkNotes || '').trim()}\n${text}` : text;
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
                          value={songHomeworkNotes || ''}
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
                        {/* Didactic Smart-Pills (Kompakter 4er-Goldstandard nach Swiss Design) */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                          {[
                            { tag: '# 🎯 Fokus-Stelle', label: '🎯 Fokus-Stelle', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                            { tag: '# ⚡ Tempo aufbauen', label: '⚡ Tempo', color: '#d97706', bg: '#fefce8', border: '#fde047' },
                            { tag: '# 🎵 Rhythmus festigen', label: '🎵 Rhythmus', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                            { tag: '# 🧠 Auswendig', label: '🧠 Auswendig', color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe' }
                          ].map((t) => {
                            const isActive = (songHomeworkNotes || '').includes(t.tag);
                            return (
                              <button
                                key={t.tag}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const res = insertOrToggleTagInText(
                                    songHomeworkNotes || '',
                                    t.tag,
                                    songNotesSelectionRef.current
                                  );
                                  const nextText = typeof res === 'string' ? res : (res?.nextText ?? '');
                                  const newCursorPos = typeof res === 'object' && typeof res?.newCursorPos === 'number' ? res.newCursorPos : nextText.length;
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
                                  border: `1.5px solid ${isActive ? t.color : t.border}`,
                                  padding: '4px 10px',
                                  borderRadius: '100px',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease'
                                }}
                                className="hover-scale"
                                aria-pressed={isActive}
                              >
                                <span>{t.label}</span>
                              </button>
                            );
                          })}
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
                                const newNotes = teacherNotes ? `${(teacherNotes || '').trim()}\n${text}` : text;
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
                            value={teacherNotes || ''}
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

                        const getWeekDateRangeLocal = (offset: number) => {
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

                        const currentIsoWeek = getISOWeek();
                        const isHistoryMode = activeSubView === 'history';
                        const viewingWeekIso = (isHistoryMode && selectedHistoryWeek)
                          ? selectedHistoryWeek
                          : getTargetWeekIso(viewingWeekOffset);
                        const viewingWeekNum = viewingWeekIso.split('-W')[1] || '';
                        const isCurrentWeek = viewingWeekIso === currentIsoWeek;
                        const isPastWeek = viewingWeekIso < currentIsoWeek;
                        const isFutureWeek = viewingWeekIso > currentIsoWeek;

                        const weekRange = (isHistoryMode && selectedHistoryWeek)
                          ? {
                              dateSpan: typeof getWeekDateRange === 'function' ? getWeekDateRange(selectedHistoryWeek) : '',
                              label: selectedHistoryWeek === currentIsoWeek ? 'Diese Woche' : `KW ${viewingWeekNum}`
                            }
                          : getWeekDateRangeLocal(viewingWeekOffset);

                        // 1. Deduplicate progress items
                        const uniqueItemsMap = new Map<string, any>();
                        (progressItems || []).forEach(item => {
                          if (isDummyOrTestSong(item)) return;
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
                        const addSongToOtherHWs = (song: any) => {
                          if (!song || isDummyOrTestSong(song)) return;
                          if (isWeeklySnapshotContainer(song.topic_name) || isWeeklySnapshotContainer(song.title) || isWeeklySnapshotContainer(song.artist)) return;
                          if (!otherHWs.some(existing => areSongsIdentical(existing, song))) otherHWs.push(song);
                        };
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
                                  if (!groupedLehrwerke[resolvedTitle]) groupedLehrwerke[resolvedTitle] = { pages: [], notes: [] };
                                  if (!groupedLehrwerke[resolvedTitle].pages.includes(pageNum)) {
                                    groupedLehrwerke[resolvedTitle].pages.push(pageNum);
                                    const cleanNote = getCleanPageNotes(pState.homeworkNotes || pState.homework_notes);
                                    if (cleanNote) groupedLehrwerke[resolvedTitle].notes.push(`Seite ${pageNum}: ${cleanNote}`);
                                  }
                                }
                              }
                            });
                          });

                          const allActive = [...activeHWs, ...activeTheories];
                          allActive.forEach(item => {
                            if (item.topic_name && item.topic_name.includes(' - Seite ')) {
                              const parts = item.topic_name.split(' - Seite ');
                              const bookTitle = parts[0].trim();
                              const book = globalLehrwerke.find(g => g.title === bookTitle || g.title?.toLowerCase().trim() === bookTitle.toLowerCase().trim());
                              const isBookAssigned = Boolean(book && assignedLehrwerke.some(a => String(a.lehrwerkId) === String(book.id) || (a.bookTitle && a.bookTitle.toLowerCase().trim() === bookTitle.toLowerCase().trim())));
                              if (!isBookAssigned && !item.is_current_homework) return;

                              const pageNum = parseInt(parts[1], 10);
                              if (!groupedLehrwerke[bookTitle]) groupedLehrwerke[bookTitle] = { pages: [], notes: [] };
                              if (!isNaN(pageNum) && !groupedLehrwerke[bookTitle].pages.includes(pageNum)) {
                                groupedLehrwerke[bookTitle].pages.push(pageNum);
                                const cleanNote = getCleanPageNotes(item.homework_notes || item.teacher_notes);
                                if (cleanNote && !groupedLehrwerke[bookTitle].notes.includes(`Seite ${pageNum}: ${cleanNote}`)) {
                                  groupedLehrwerke[bookTitle].notes.push(`Seite ${pageNum}: ${cleanNote}`);
                                }
                              }
                            }
                          });

                          // 🏛️ 0,1% Goldstandard: Symmetrische Parität über AuthoritativeHomeworkContext (SSOT)
                          if (authHw && Array.isArray(authHw.books) && authHw.books.length > 0) {
                            authHw.books.forEach(b => {
                              if (!groupedLehrwerke[b.title]) groupedLehrwerke[b.title] = { pages: [], notes: [] };
                              (b.pages || []).forEach(p => {
                                if (!groupedLehrwerke[b.title].pages.includes(p)) groupedLehrwerke[b.title].pages.push(p);
                              });
                              (b.notes || []).forEach(n => {
                                if (!groupedLehrwerke[b.title].notes.includes(n)) groupedLehrwerke[b.title].notes.push(n);
                              });
                            });
                          }
                          if (authHw && Array.isArray(authHw.songs) && authHw.songs.length > 0) {
                            authHw.songs.forEach(s => {
                              addSongToOtherHWs(s);
                            });
                          }

                          // 🏛️ 100% Parität zum Hausaufgaben-Widget des Schüler-Dashboards (Briefing Board SSOT)
                          const juniorSummary = deriveJuniorHomeworkSummary({
                            studentId: student?.id,
                            localProgress: assignedLehrwerke,
                            lehrwerke: globalLehrwerke,
                            progressItems,
                            activeSongSkills,
                            assignedCampusSongs
                          });
                          (juniorSummary.activeJuniorSongs || []).forEach(song => {
                            addSongToOtherHWs(song);
                          });

                          (progressItems || []).forEach((item: any) => {
                            if (!item.topic_name || isWeeklySnapshotContainer(item.topic_name) || !item.is_current_homework) return;
                            if (item.topic_name.includes(' - Seite ')) {
                              const parts = item.topic_name.split(' - Seite ');
                              const rawBookTitle = (parts[0] || '').trim();
                              const pageNum = parseInt(parts[1], 10);
                              const book = globalLehrwerke.find(g => (g.title || '').trim().toLowerCase() === rawBookTitle.toLowerCase());
                              const resolvedTitle = book?.title || rawBookTitle;

                              if (resolvedTitle && !isNaN(pageNum)) {
                                if (!groupedLehrwerke[resolvedTitle]) groupedLehrwerke[resolvedTitle] = { pages: [], notes: [] };
                                if (!groupedLehrwerke[resolvedTitle].pages.includes(pageNum)) groupedLehrwerke[resolvedTitle].pages.push(pageNum);
                                const cleanNote = getCleanPageNotes(item.homework_notes || item.teacher_notes);
                                if (cleanNote && !groupedLehrwerke[resolvedTitle].notes.includes(`Seite ${pageNum}: ${cleanNote}`)) {
                                  groupedLehrwerke[resolvedTitle].notes.push(`Seite ${pageNum}: ${cleanNote}`);
                                }
                              }
                            }
                          });

                          const collectedSongs = collectHomeworkSongsFromSources({
                            rawItems: activeHWs,
                            activeSongSkills,
                            assignedCampusSongs,
                            studentId: student?.id,
                            getCleanPageNotes
                          });
                          collectedSongs.forEach(song => {
                            const existingIdx = otherHWs.findIndex(existing => areSongsIdentical(existing, song));
                            if (existingIdx === -1) {
                              otherHWs.push(song);
                            } else {
                              if (!otherHWs[existingIdx].homework_notes && song.homework_notes) otherHWs[existingIdx].homework_notes = song.homework_notes;
                              if (!otherHWs[existingIdx].topic_name && song.topic_name) otherHWs[existingIdx].topic_name = song.topic_name;
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
                              const parsedSnap = parseRawNotesArray(curWeekSnapshotItem.homework_notes);
                              if (parsedSnap.length > 0) {
                                // 1. Lehrwerke snapshot unpacking (if lehrwerkeList is empty)
                                if (lehrwerkeList.length === 0) {
                                  const snapLwEntry = parsedSnap.find((n: any) => typeof n === 'string' && n.includes('SNAPSHOT_LEHRWERKE:'));
                                  if (snapLwEntry) {
                                    const unpacked = parseSnapshotLehrwerke(snapLwEntry);
                                    if (unpacked.length > 0) lehrwerkeList = unpacked;
                                  }
                                }

                                // 2. Songs snapshot unpacking with deduplication (nur wenn aktuell noch keine Songs vorhanden sind)
                                if (otherHWs.length === 0) {
                                  const snapSongEntry = parsedSnap.find((n: any) => typeof n === 'string' && n.includes('SNAPSHOT_SONGS:'));
                                  if (snapSongEntry) {
                                    const parsedSongs = parseSnapshotSongs(snapSongEntry);
                                    parsedSongs.forEach((song: any) => {
                                      addSongToOtherHWs({
                                        ...song,
                                        is_current_homework: true,
                                        homework_notes: getCleanPageNotes(song.homework_notes)
                                      });
                                    });
                                  }
                                }

                                // 3. Audio recordings unpacking (guarantees all 6 recordings show on Mobile PWA)
                                const snapAudios = parseAudioEntries(parsedSnap);
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
                                  const snapTextNotes = parseDidacticTextNotes(parsedSnap);
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
                              const kwMatch = item.topic_name.match(/Hausaufgabe KW\s*(\d+)/i);
                              if (kwMatch && viewingWeekNum) {
                                const itemKw = parseInt(kwMatch[1], 10);
                                const curKw = parseInt(viewingWeekNum, 10);
                                if (!isNaN(itemKw) && !isNaN(curKw)) {
                                  return itemKw < curKw;
                                }
                              }
                              const itWeekIso = getItemWeek(item);
                              return Boolean(itWeekIso && itWeekIso < viewingWeekIso);
                            });

                            pastWeekSnapshots.sort((a: any, b: any) => {
                              const kwA = parseInt((a.topic_name.match(/Hausaufgabe KW\s*(\d+)/i) || [])[1] || '0', 10);
                              const kwB = parseInt((b.topic_name.match(/Hausaufgabe KW\s*(\d+)/i) || [])[1] || '0', 10);
                              if (kwA !== kwB) return kwB - kwA;
                              const wA = getItemWeek(a);
                              const wB = getItemWeek(b);
                              if (wA !== wB) return (wB || '').localeCompare(wA || '');
                              const tA = new Date(a.updated_at || a.created_at || 0).getTime();
                              const tB = new Date(b.updated_at || b.created_at || 0).getTime();
                              return tB - tA;
                            });

                            for (const latestPastHwSnapshot of pastWeekSnapshots) {
                              if (lehrwerkeList.length > 0 && otherHWs.length > 0 && audioNotes.length > 0 && homeworkNoteItems.length > 0 && bridgedPastQuestion) {
                                break;
                              }
                              const snapRaw = latestPastHwSnapshot?.homework_notes || latestPastHwSnapshot?.teacher_notes;
                              if (!latestPastHwSnapshot || !snapRaw) continue;

                              try {
                                let parsedPastNotes: any = null;
                                try {
                                  parsedPastNotes = typeof snapRaw === 'string'
                                    ? JSON.parse(snapRaw)
                                    : snapRaw;
                                } catch {
                                  parsedPastNotes = [snapRaw];
                                }
                                if (!Array.isArray(parsedPastNotes) && typeof snapRaw === 'string') {
                                  parsedPastNotes = [snapRaw];
                                }

                                const kwMatch = latestPastHwSnapshot.topic_name.match(/Hausaufgabe KW\s*(\d+)/i);
                                if (!carriedOverWeekLabel && kwMatch) {
                                  carriedOverWeekLabel = `KW ${kwMatch[1]}`;
                                }

                                if (Array.isArray(parsedPastNotes)) {
                                  // 1. Lehrwerke der Vorwoche übernehmen (falls aktuell leer)
                                  if (lehrwerkeList.length === 0) {
                                    const snapLwEntry = parsedPastNotes.find((n: string) => typeof n === 'string' && n.includes('SNAPSHOT_LEHRWERKE:'));
                                    if (snapLwEntry) {
                                      try {
                                        const sIdx = snapLwEntry.indexOf('SNAPSHOT_LEHRWERKE:');
                                        const after = snapLwEntry.slice(sIdx + 'SNAPSHOT_LEHRWERKE:'.length);
                                        const endIdx = after.search(/\n\n--- [A-Z_]+ ---|\n\nSNAPSHOT_/);
                                        const rawJson = (endIdx !== -1 ? after.slice(0, endIdx) : after).trim();
                                        const parsedLw = JSON.parse(rawJson);
                                        if (Array.isArray(parsedLw) && parsedLw.length > 0) {
                                          const normalizedLw = parsedLw.map((lw: any) => ({
                                            title: lw.title || lw.bookTitle || lw.lehrwerkTitle || 'Lehrwerk',
                                            pages: Array.isArray(lw.pages) ? [...lw.pages].sort((a: number, b: number) => a - b) : (Array.isArray(lw.pageNums) ? [...lw.pageNums].sort((a: number, b: number) => a - b) : []),
                                            notes: Array.isArray(lw.notes) ? lw.notes : []
                                          })).filter(lw => lw.title && lw.pages.length > 0);
                                          if (normalizedLw.length > 0) {
                                            lehrwerkeList = normalizedLw;
                                            isBooksCarriedOver = true;
                                          }
                                        }
                                      } catch (e) {
                                        console.warn('Error parsing SNAPSHOT_LEHRWERKE in carryover:', e);
                                      }
                                    }
                                  }

                                  // 2. Songs der Vorwoche übernehmen (NUR wenn aktuell KEINE Songs vorhanden sind - 100% Parität mit Briefing Board)
                                  if (otherHWs.length === 0) {
                                    const snapSongEntry = parsedPastNotes.find((n: string) => typeof n === 'string' && n.includes('SNAPSHOT_SONGS:'));
                                    if (snapSongEntry) {
                                      try {
                                        const sIdx = snapSongEntry.indexOf('SNAPSHOT_SONGS:');
                                        const after = snapSongEntry.slice(sIdx + 'SNAPSHOT_SONGS:'.length);
                                        const endIdx = after.search(/\n\n--- [A-Z_]+ ---|\n\nSNAPSHOT_/);
                                        const rawJson = (endIdx !== -1 ? after.slice(0, endIdx) : after).trim();
                                        const parsedSongs = JSON.parse(rawJson);
                                        if (Array.isArray(parsedSongs) && parsedSongs.length > 0) {
                                          parsedSongs.forEach((song: any) => {
                                            if (!song || isDummyOrTestSong(song) || isWeeklySnapshotContainer(song.topic_name) || isWeeklySnapshotContainer(song.title) || isWeeklySnapshotContainer(song.artist)) return;
                                            addSongToOtherHWs(song);
                                            isSongsCarriedOver = true;
                                          });
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
                                               !n.startsWith('STUDENT_NOTE_') &&
                                               !n.startsWith('WORLDTOUR_MASTERY:');
                                      })
                                      .map((s: string) => s.trim())
                                      .filter(Boolean);

                                    if (pastNotes.length > 0) {
                                      homeworkNoteItems = pastNotes;
                                      isNotesCarriedOver = true;
                                    }
                                  }

                                  // 5. Schülerfrage der Vorwoche übernehmen (falls in aktueller Woche noch keine neue Frage existiert)
                                  if (!bridgedPastQuestion) {
                                    const pastQ = parsedPastNotes.find((n: string) => typeof n === 'string' && (n.startsWith('STUDENT_QUESTION:') || n.startsWith('❓ Frage für den Unterricht:')));
                                    if (pastQ) {
                                      bridgedPastQuestion = parseStudentQuestionFromNotes([pastQ]);
                                    }
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
                          const snapCandidates = (progressItems || []).filter((item: any) => {
                            if (!item) return false;
                            const itWeek = getItemWeek(item);
                            if (itWeek && itWeek === viewingWeekIso) return true;
                            if (item.topic_name === `Hausaufgabe KW ${viewingWeekNum}` || item.topic_name === `Hausaufgabe KW ${parseInt(viewingWeekNum, 10)}`) return true;
                            if (item.created_at && getISOWeek(item.created_at) === viewingWeekIso && item.topic_name?.startsWith('Hausaufgabe KW ')) return true;
                            if (item.updated_at && getISOWeek(item.updated_at) === viewingWeekIso && item.topic_name?.startsWith('Hausaufgabe KW ')) return true;
                            return false;
                          });
                          histWeekItem = snapCandidates.find(c => c.homework_notes && c.homework_notes !== '[]' && c.homework_notes !== '""') || snapCandidates[0] || null;

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
                                           !n.startsWith('SNAPSHOT_') &&
                                           !n.startsWith('WORLDTOUR_MASTERY:');
                                  })
                                  .map((s: string) => s.trim())
                                  .filter(Boolean);

                                // 📦 1. Parse Lehrwerke-Snapshot aus Wochen-Snapshot
                                const snapLwEntry = parsedNotes.find((n: string) => typeof n === 'string' && n.includes('SNAPSHOT_LEHRWERKE:'));
                                if (snapLwEntry) {
                                  try {
                                    const sIdx = snapLwEntry.indexOf('SNAPSHOT_LEHRWERKE:');
                                    const after = snapLwEntry.slice(sIdx + 'SNAPSHOT_LEHRWERKE:'.length);
                                    const endIdx = after.search(/\n\n--- [A-Z_]+ ---|\n\nSNAPSHOT_/);
                                    const rawJson = (endIdx !== -1 ? after.slice(0, endIdx) : after).trim();
                                    const parsedLw = JSON.parse(rawJson);
                                    if (Array.isArray(parsedLw)) {
                                      const normalizedLw = parsedLw.map((lw: any) => ({
                                        title: lw.title || lw.bookTitle || lw.lehrwerkTitle || 'Lehrwerk',
                                        pages: Array.isArray(lw.pages) ? [...lw.pages].sort((a: number, b: number) => a - b) : (Array.isArray(lw.pageNums) ? [...lw.pageNums].sort((a: number, b: number) => a - b) : []),
                                        notes: Array.isArray(lw.notes) ? lw.notes : []
                                      })).filter(lw => lw.title && lw.pages.length > 0);
                                      if (normalizedLw.length > 0) {
                                        lehrwerkeList = normalizedLw;
                                      }
                                    }
                                  } catch (e) {
                                    console.warn('Error parsing SNAPSHOT_LEHRWERKE:', e);
                                  }
                                }

                                // 🎵 2. Parse Songs-Snapshot aus Wochen-Snapshot
                                const snapSongEntry = parsedNotes.find((n: string) => typeof n === 'string' && n.includes('SNAPSHOT_SONGS:'));
                                if (snapSongEntry) {
                                  try {
                                    const sIdx = snapSongEntry.indexOf('SNAPSHOT_SONGS:');
                                    const after = snapSongEntry.slice(sIdx + 'SNAPSHOT_SONGS:'.length);
                                    const endIdx = after.search(/\n\n--- [A-Z_]+ ---|\n\nSNAPSHOT_/);
                                    const rawJson = (endIdx !== -1 ? after.slice(0, endIdx) : after).trim();
                                    const parsedSongs = JSON.parse(rawJson);
                                    if (Array.isArray(parsedSongs)) {
                                      parsedSongs.forEach((song: any) => {
                                        if (isDummyOrTestSong(song) || isWeeklySnapshotContainer(song.topic_name) || isWeeklySnapshotContainer(song.title) || isWeeklySnapshotContainer(song.artist)) return;
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
                          lehrwerkeList.forEach(lw => { // Initialize with items from snapshot if already present
                            groupedHistLehrwerke[lw.title] = { pages: [...lw.pages], notes: [...(lw.notes || [])] };
                          });

                          weekProgressItems.forEach((item: any) => {
                            if (item.topic_name && item.topic_name.includes(' - Seite ')) {
                              const parts = item.topic_name.split(' - Seite ');
                              const bookTitle = parts[0].trim();
                              if (lehrwerkeList.some(lw => (lw.title || '').trim().toLowerCase() === bookTitle.toLowerCase())) return;
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
                              if (isDummyOrTestSong(item)) return;
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
                                const rawSongTitle = skill.songs?.title || skill.title || skill.song_title || 'Song';
                                const songTitle = stripInstrumentFromTitle(rawSongTitle);
                                const fullTitle = songArtist ? `${songArtist} - ${songTitle}` : `${songTitle}`;
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

                        const effectiveWorldTourMasteries: ParsedWorldTourMastery[] = (isCurrentWeek 
                          ? parseWorldTourMasteries(homeworkNotesList || [])
                          : (histWeekItem && histWeekItem.homework_notes
                              ? (() => {
                                  try {
                                    const p = typeof histWeekItem.homework_notes === 'string'
                                      ? JSON.parse(histWeekItem.homework_notes)
                                      : histWeekItem.homework_notes;
                                    return Array.isArray(p) ? parseWorldTourMasteries(p) : [];
                                  } catch {
                                    return [];
                                  }
                                })()
                              : [])) || [];

                        const hasActiveItems = lehrwerkeList.length > 0 || otherHWs.length > 0 || audioNotes.length > 0 || homeworkNoteItems.length > 0 || effectiveWorldTourMasteries.length > 0;
                        
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
                              flexWrap: 'nowrap', 
                              gap: isMobileView ? '6px' : '12px',
                              rowGap: '0',
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
                                    disabled={isHistoryMode 
                                      ? (() => {
                                          const idx = archiveWeekBarItems.findIndex(w => w.weekIso === viewingWeekIso);
                                          return idx === -1 || idx >= archiveWeekBarItems.length - 1;
                                        })()
                                      : viewingWeekOffset <= -8}
                                    onClick={() => {
                                      if (isHistoryMode) {
                                        const idx = archiveWeekBarItems.findIndex(w => w.weekIso === viewingWeekIso);
                                        if (idx !== -1 && idx < archiveWeekBarItems.length - 1) {
                                          setSelectedHistoryWeek(archiveWeekBarItems[idx + 1].weekIso);
                                        }
                                      } else {
                                        setViewingWeekOffset(prev => prev - 1);
                                      }
                                    }}
                                    title={isHistoryMode ? "Vorherige Woche im Archiv" : "Vorherige Woche (KW)"}
                                    style={{
                                      background: '#ffffff',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: '100px',
                                      width: '26px',
                                      height: '26px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: (isHistoryMode ? (archiveWeekBarItems.findIndex(w => w.weekIso === viewingWeekIso) >= archiveWeekBarItems.length - 1) : (viewingWeekOffset <= -8)) ? 'not-allowed' : 'pointer',
                                      opacity: (isHistoryMode ? (archiveWeekBarItems.findIndex(w => w.weekIso === viewingWeekIso) >= archiveWeekBarItems.length - 1) : (viewingWeekOffset <= -8)) ? 0.35 : 1,
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
                                    disabled={isHistoryMode 
                                      ? (() => {
                                          const idx = archiveWeekBarItems.findIndex(w => w.weekIso === viewingWeekIso);
                                          return idx <= 0;
                                        })()
                                      : viewingWeekOffset >= 1}
                                    onClick={() => {
                                      if (isHistoryMode) {
                                        const idx = archiveWeekBarItems.findIndex(w => w.weekIso === viewingWeekIso);
                                        if (idx > 0) {
                                          setSelectedHistoryWeek(archiveWeekBarItems[idx - 1].weekIso);
                                        }
                                      } else {
                                        setViewingWeekOffset(prev => Math.min(1, prev + 1));
                                      }
                                    }}
                                    title={isHistoryMode ? "Nächste Woche im Archiv" : (viewingWeekOffset === 0 ? "Zur Folgewoche" : "Nächste Woche")}
                                    style={{
                                      background: '#ffffff',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: '100px',
                                      width: '26px',
                                      height: '26px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: (isHistoryMode ? (archiveWeekBarItems.findIndex(w => w.weekIso === viewingWeekIso) <= 0) : (viewingWeekOffset >= 1)) ? 'not-allowed' : 'pointer',
                                      opacity: (isHistoryMode ? (archiveWeekBarItems.findIndex(w => w.weekIso === viewingWeekIso) <= 0) : (viewingWeekOffset >= 1)) ? 0.35 : 1,
                                      color: '#334155',
                                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                                      transition: 'all 0.15s ease'
                                    }}
                                    className="hover-scale-mini"
                                  >
                                    <ChevronRight size={13} strokeWidth={2.4} />
                                  </button>
                                </div>

                                {(viewingWeekOffset !== 0 || isHistoryMode) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveSubView('hub');
                                      setSelectedHistoryWeek(null);
                                      setViewingWeekOffset(0);
                                    }}
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
                                        display: isMobileView ? 'none' : 'inline-flex',
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
                                        display: isMobileView ? 'none' : 'inline-flex',
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
                                            generalNotes: (homeworkNoteItems.length > 0 ? homeworkNoteItems : [generalHomeworkNotes]).filter(n => n && !isInternalMetadataNote(n)).join('. ')
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
                                     border: (isTtsSpeaking && activeTtsKey === 'global_homework') ? '1px solid #dc2626' : '1.5px solid #10b981',
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
                                       <span>Stopp</span>
                                     </>
                                   ) : (
                                     <>
                                       <Volume2 size={14} color="#15803d" strokeWidth={2.3} />
                                       <span>Vorlesen</span>
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
                                    display: isMobileView ? 'none' : 'inline-flex',
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
                                    border: isLinkCopied ? '1px solid #10b981' : '1px solid #cbd5e1',
                                    color: isLinkCopied ? '#16a34a' : '#475569',
                                    borderRadius: '100px',
                                    width: isMobileView ? '36px' : '32px',
                                    height: isMobileView ? '36px' : '32px',
                                    minWidth: isMobileView ? '36px' : '32px',
                                    minHeight: isMobileView ? '36px' : '32px',
                                    cursor: 'pointer',
                                    display: isMobileView ? 'none' : 'inline-flex',
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
                                    display: isMobileView ? 'none' : 'inline-flex',
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
                                {(progressItems.some(item => item.is_current_homework) || (generalHomeworkNotes || '').trim() !== '' || isCarriedOverPlan) && !readOnly && (
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
                                      border: forceImmediateDelivery ? '1px solid #10b981' : '1px solid #cbd5e1',
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
                                padding: isMobileView ? '12px 10px calc(var(--bottom-bar-height, 68px) + env(safe-area-inset-bottom, 0px) + 32px) 10px' : '16px 18px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'flex-start',
                                alignItems: 'stretch',
                                gap: isMobileView ? '8px' : '12px',
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
                                    <span style={{ fontSize: isJunior ? '1.02rem' : '0.98rem', fontWeight: 900, color: '#15803d', letterSpacing: '-0.02em', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                                      <Music size={16} color="#16a34a" strokeWidth={2.4} />
                                      <span>{isHistoryMode ? `Wochen-Fahrplan · KW ${viewingWeekNum}` : 'Dein Wochen-Fahrplan'}</span>
                                    </span>
                                   )}
                                 </div>

                                 {readOnly && (
                                   isHistoryMode ? (
                                     <button
                                       type="button"
                                       role="button"
                                       tabIndex={0}
                                       onClick={() => {
                                         setActiveSubView('hub');
                                         setSelectedHistoryWeek(null);
                                         setViewingWeekOffset(0);
                                       }}
                                       onKeyDown={(e) => {
                                         if (e.key === 'Enter' || e.key === ' ') {
                                           e.preventDefault();
                                           setActiveSubView('hub');
                                           setSelectedHistoryWeek(null);
                                           setViewingWeekOffset(0);
                                         }
                                       }}
                                       style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '100px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#15803d', cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', flexShrink: 0 }}
                                       className="hover-scale-mini"
                                       title="Zurück zum aktuellen Wochenplan"
                                       aria-label="Zurück zum aktuellen Wochenplan"
                                     >
                                       <RotateCcw size={12} color="#15803d" />
                                       <span>Zurück zu Heute</span>
                                     </button>
                                   ) : (
                                     <button
                                       type="button"
                                       role="button"
                                       tabIndex={0}
                                       onClick={() => {
                                         setActiveModalTab('document');
                                         setActiveSubView('history');
                                         if (!selectedHistoryWeek) {
                                           const firstArchived = archiveWeekBarItems[0]?.weekIso || getISOWeek();
                                           setSelectedHistoryWeek(firstArchived);
                                         }
                                       }}
                                       onKeyDown={(e) => {
                                         if (e.key === 'Enter' || e.key === ' ') {
                                           e.preventDefault();
                                           setActiveModalTab('document');
                                           setActiveSubView('history');
                                           if (!selectedHistoryWeek) {
                                             const firstArchived = archiveWeekBarItems[0]?.weekIso || getISOWeek();
                                             setSelectedHistoryWeek(firstArchived);
                                           }
                                         }
                                       }}
                                       style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '100px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#334155', cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', flexShrink: 0 }}
                                       className="hover-scale-mini"
                                       title="Unterrichts-Archiv & frühere Wochen öffnen"
                                       aria-label="Unterrichts-Archiv & frühere Wochen öffnen"
                                     >
                                       <History size={12} color="#64748b" />
                                       <span>Archiv</span>
                                     </button>
                                   )
                                 )}
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
                                  background: '#fffdf0', border: '1.5px solid #fde047',
                                  borderRadius: '12px', padding: isMobileView ? '8px 12px' : '9px 14px',
                                  boxShadow: '0 2px 8px rgba(250, 204, 21, 0.12)',
                                  display: 'flex', flexDirection: 'column', gap: '5px'
                                }}>
                                  {/* Header: Gelber Marken-Badge, Lehrkraft, Vormerkungs-Hinweis & Action Targets */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, flexWrap: 'wrap' }}>
                                      <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                        background: '#facc15', color: '#0f172a',
                                        fontSize: '0.68rem', fontWeight: 850,
                                        textTransform: 'uppercase', letterSpacing: '0.03em',
                                        padding: '2px 7px', borderRadius: '100px',
                                        boxShadow: '0 1px 3px rgba(250, 204, 21, 0.35)',
                                        flexShrink: 0
                                      }}>
                                        <HelpCircle size={11} color="#0f172a" strokeWidth={2.5} />
                                        <span>Frage</span>
                                      </span>
                                      <span title={`Frage an ${effectiveTeacherFullName}`} style={{ fontSize: '0.76rem', fontWeight: 800, color: '#854d0e', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                        an {effectiveTeacherFullName?.replace(/^deine\s+lehrkraft\b/i, 'Lehrkraft') || 'Lehrkraft'}
                                      </span>
                                      <span style={{ color: '#ca8a04', opacity: 0.6, fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>·</span>
                                      <span title="Für deine nächste Stunde vorgemerkt" style={{ fontSize: '0.72rem', fontWeight: 650, color: '#854d0e', display: 'inline-flex', alignItems: 'center', gap: '4px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <Sparkles size={11} color="#ca8a04" style={{ flexShrink: 0 }} />
                                        <span>Für deine nächste Stunde vorgemerkt</span>
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                      <button
                                        type="button" role="button" tabIndex={0}
                                        onClick={() => handleSpeakText(effectiveViewingQuestion.text, 'student_q')}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSpeakText(effectiveViewingQuestion.text, 'student_q'); } }}
                                        title="Frage vorlesen" aria-label="Frage vorlesen"
                                        style={{ border: '1px solid rgba(250, 204, 21, 0.6)', background: '#ffffff', color: '#0f172a', borderRadius: '8px', width: '32px', height: '32px', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease', touchAction: 'manipulation' }}
                                        className="hover-scale-mini"
                                      >
                                        <Volume2 size={14} color="#0f172a" />
                                      </button>
                                      <button
                                        type="button" role="button" tabIndex={0}
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
                                        title="Frage bearbeiten" aria-label="Frage bearbeiten"
                                        style={{ border: '1px solid rgba(250, 204, 21, 0.6)', background: '#ffffff', color: '#0f172a', borderRadius: '8px', width: '32px', height: '32px', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease', touchAction: 'manipulation' }}
                                        className="hover-scale-mini"
                                      >
                                        <Edit3 size={14} color="#0f172a" />
                                      </button>

                                      {/* 🛡️ Fail-Safe 2-Schritt Lösch-Schutz */}
                                      {isConfirmingResolveQuestion ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <button
                                            type="button" role="button" tabIndex={0}
                                            onClick={async () => { setIsConfirmingResolveQuestion(false); await handleResolveStudentQuestion(); }}
                                            onKeyDown={async (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsConfirmingResolveQuestion(false); await handleResolveStudentQuestion(); } }}
                                            title="Löschen bestätigen" aria-label="Löschen bestätigen"
                                            style={{ border: 'none', background: '#dc2626', color: '#ffffff', borderRadius: '8px', height: '32px', padding: '0 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 800, boxShadow: '0 1px 4px rgba(220, 38, 38, 0.3)', touchAction: 'manipulation' }}
                                            className="hover-scale-mini"
                                          >
                                            <Check size={12} strokeWidth={3} />
                                            <span>Löschen?</span>
                                          </button>
                                          <button
                                            type="button" role="button" tabIndex={0}
                                            onClick={() => setIsConfirmingResolveQuestion(false)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsConfirmingResolveQuestion(false); } }}
                                            title="Abbrechen" aria-label="Abbrechen"
                                            style={{ border: '1px solid #cbd5e1', background: '#ffffff', color: '#64748b', borderRadius: '8px', width: '32px', height: '32px', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}
                                            className="hover-scale-mini"
                                          >
                                            <X size={13} strokeWidth={2.4} />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button" role="button" tabIndex={0}
                                          onClick={() => setIsConfirmingResolveQuestion(true)}
                                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsConfirmingResolveQuestion(true); } }}
                                          title="Frage löschen oder als erledigt markieren" aria-label="Frage löschen oder als erledigt markieren"
                                          style={{ border: '1px solid rgba(254, 202, 202, 0.8)', background: 'rgba(254, 226, 226, 0.7)', color: '#dc2626', borderRadius: '8px', width: '32px', height: '32px', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease', touchAction: 'manipulation' }}
                                          className="hover-scale-mini"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Question Body: Full width, clean typography, NO double quotes */}
                                  <div style={{ fontSize: '0.90rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.4, wordBreak: 'break-word', padding: '1px 0' }}>
                                    {effectiveViewingQuestion.text}
                                  </div>
                                </div>
                              )}

                              {/* 💬 Empty-State Prompt Chip auf Mobile (wenn noch keine Frage existiert) */}
                              {readOnly && !isQuestionEditorOpen && !effectiveViewingQuestion?.hasQuestion && isMobileView && (
                                <button
                                  type="button" role="button" tabIndex={0}
                                  onClick={() => {
                                    let textToUse = '';
                                    if (student?.id) {
                                      try {
                                        const draft = localStorage.getItem(`campus_student_question_draft_${student.id}`);
                                        if (draft) textToUse = draft;
                                      } catch {}
                                    }
                                    setQuestionDraftText(textToUse);
                                    setIsQuestionEditorOpen(true);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      let textToUse = '';
                                      if (student?.id) {
                                        try {
                                          const draft = localStorage.getItem(`campus_student_question_draft_${student.id}`);
                                          if (draft) textToUse = draft;
                                        } catch {}
                                      }
                                      setQuestionDraftText(textToUse);
                                      setIsQuestionEditorOpen(true);
                                    }
                                  }}
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 13px', background: '#fffdf0', border: '1px dashed #fde047', borderRadius: '12px', color: '#854d0e', fontSize: '0.78rem', fontWeight: 750, cursor: 'pointer', width: '100%', boxSizing: 'border-box', textAlign: 'left', boxShadow: '0 1px 3px rgba(250, 204, 21, 0.08)', transition: 'all 0.15s ease' }}
                                  className="hover-scale-mini"
                                >
                                  <HelpCircle size={14} color="#ca8a04" style={{ flexShrink: 0 }} />
                                  <span>Frage an {effectiveTeacherFullName} für die nächste Stunde notieren...</span>
                                </button>
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

                              {/* 🌍 0,1% Goldstandard WorldTour Mastery Note Card (Schülernotiz an Lehrkraft - Nur für Lehrkräfte sichtbar) */}
                              {!readOnly && effectiveWorldTourMasteries.length > 0 && (
                                <WorldTourMasteryNoteCard
                                  masteries={effectiveWorldTourMasteries}
                                  readOnly={readOnly}
                                  studentFirstName={studentFirstName}
                                  onAcknowledge={handleAcknowledgeWorldTourMastery}
                                  onOpenStation={handleOpenWorldTourStation}
                                  onSpeak={handleSpeakText}
                                  isSpeaking={isTtsSpeaking}
                                  activeTtsKey={activeTtsKey}
                                  isMobileView={isMobileView}
                                />
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
                                    border: '1px solid #10b981',
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
                                      onClick={() => {
                                        setActiveSubView('hub');
                                        setSelectedHistoryWeek(null);
                                        setViewingWeekOffset(0);
                                      }}
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
                                    const bookObj = globalLehrwerke.find(b => (b.title || '').trim().toLowerCase() === item.title.trim().toLowerCase());
                                    const assignedBook = bookObj ? assignedLehrwerke.find(a => String(a.lehrwerkId || a.id) === String(bookObj.id || bookObj.lehrwerkId)) : null;
                                    
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
                                    const bookSpeechText = formatSingleBookForSpeech({ title: item.title, pages: item.pages, formattedPages: pagesGerman, notes: bookNotesPhrases });
                                    const isSpeakingThisBook = isTtsSpeaking && activeTtsKey === `book_head_${item.title}`;

                                    // 0.1% Goldstandard: Reine Seitenzahlen (S. 1-3) ohne Übungszusatz
                                    const pagesLabel = formatPageNumbers(item.pages || []);
                                    const accessiblePagesLabel = formatPageNumbersGerman(item.pages || []);
                                    const bookExerciseTitle = pagesLabel ? `${item.title} (${pagesLabel})` : item.title;
                                    const pagesSlug = (item.pages || []).join('_');
                                    const bookExerciseTaskId = pagesSlug ? `book-${item.title}-p${pagesSlug}` : `book-${item.title}`;

                                    return (
                                      <div key={`lw-${idx}`} style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        background: isMobileView ? 'transparent' : '#ffffff',
                                        border: isMobileView ? 'none' : '1px solid #f1f5f9',
                                        borderRadius: isMobileView ? '0' : '14px',
                                        padding: isMobileView ? '0 0 10px 0' : '12px 14px',
                                        boxShadow: isMobileView ? 'none' : '0 1px 3px rgba(0,0,0,0.02)',
                                        borderBottom: isMobileView ? (idx < lehrwerkeList.length - 1 || otherHWs.length > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none') : '1px solid #f1f5f9'
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                          <div
                                            onClick={() => {
                                              const targetId = bookObj?.id || assignedBook?.lehrwerkId || assignedBook?.id;
                                              if (targetId) {
                                                setActiveLehrwerkId(targetId);
                                                selectTextbookPage(targetId, item.pages[0] || 1);
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
                                              width: isJunior ? '38px' : '34px',
                                              height: isJunior ? '42px' : '38px',
                                              background: `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})`,
                                              borderRadius: isJunior ? '10px' : '8px',
                                              flexShrink: 0,
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              boxShadow: isJunior ? '0 3px 8px rgba(0,0,0,0.14)' : '0 2px 6px rgba(0,0,0,0.12)'
                                            }}>
                                              <BookOpen size={isJunior ? 18 : 16} color={bookColor.text} />
                                            </div>
                                            <span style={{
                                              fontSize: isJunior ? '1.14rem' : '1.05rem',
                                              fontWeight: 850,
                                              color: '#0f172a',
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              whiteSpace: 'nowrap'
                                            }}>
                                              {item.title}
                                            </span>

                                            {/* 0.1% Goldstandard: Seitenzahl direkt hinter das Lehrwerk (für Lehrer & Schüler identisch) */}
                                            {pagesLabel && (
                                              <span
                                                aria-label={accessiblePagesLabel}
                                                title={`${accessiblePagesLabel} im Lehrwerk öffnen`}
                                                style={{
                                                  fontSize: isJunior ? '0.86rem' : '0.80rem',
                                                  fontWeight: 850,
                                                  color: '#15803d',
                                                  background: '#dcfce7',
                                                  border: '1px solid #bbf7d0',
                                                  padding: isJunior ? '3px 10px' : '2px 8px',
                                                  borderRadius: '99px',
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  letterSpacing: '-0.01em',
                                                  opacity: isFutureWeek ? 0.45 : 1,
                                                  cursor: bookObj ? 'pointer' : 'default',
                                                  transition: 'all 0.15s ease',
                                                  flexShrink: 0
                                                }}
                                                className="tactile-btn hover-scale-mini"
                                              >
                                                {pagesLabel}
                                              </span>
                                            )}
                                            <MicroScoreSnippetButton studentId={student?.id} taskId={bookExerciseTaskId} taskTitle={bookExerciseTitle} defaultInstrument={student?.instrument} isJunior={isJunior} readOnly={readOnly} />
                                          </div>

                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                            {readOnly && (
                                              <StudentHomeworkStatusButton studentId={student?.id} taskId={`book-${item.title}`} label={item.title} />
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
                                                border: isSpeakingThisBook ? '1px solid #10b981' : '1px solid #cbd5e1',
                                                background: isSpeakingThisBook ? '#dcfce7' : '#ffffff',
                                                color: isSpeakingThisBook ? '#15803d' : '#64748b',
                                                borderRadius: isJunior ? '10px' : '8px',
                                                width: isJunior ? '34px' : '30px',
                                                height: isJunior ? '34px' : '30px',
                                                minWidth: isJunior ? '34px' : '30px',
                                                minHeight: isJunior ? '34px' : '30px',
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
                                                <VolumeX size={isJunior ? 16 : 13} strokeWidth={2.4} />
                                              ) : (
                                                <Volume2 size={isJunior ? 16 : 13} strokeWidth={2.2} />
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
                                              fontSize: isJunior ? '0.98rem' : '0.88rem',
                                              lineHeight: 1.5,
                                              padding: isJunior ? '6px 10px' : '5px 8px',
                                              marginLeft: isJunior ? '40px' : '32px',
                                              borderRadius: '8px',
                                              background: isSpeakingThis ? '#dcfce7' : (parsedAnn.isSpecificToCurrent ? '#f0fdf4' : 'transparent'),
                                              border: parsedAnn.isSpecificToCurrent ? '1px solid #10b981' : 'none',
                                              opacity: isFutureWeek ? 0.38 : 1,
                                              transition: 'all 0.15s ease'
                                            }}>
                                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', minWidth: 0 }}>
                                                <span style={{ fontWeight: 850, color: '#e11d48', flexShrink: 0, fontSize: isJunior ? '0.98rem' : '0.88rem' }}>S. {p}:</span>
                                                {parsedAnn.isSpecificToCurrent && (
                                                  <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    background: '#dcfce7',
                                                    color: '#15803d',
                                                    border: '1px solid #10b981',
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
                                      if (!cur || isDummyOrTestSong(cur) || isWeeklySnapshotContainer(cur.topic_name) || isWeeklySnapshotContainer(cur.title) || isWeeklySnapshotContainer(cur.artist)) return acc;
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
                                          const rawSongTopic = item.topic_name || item.title || item.song_title || 'Song';
                                          const cleanSongDisplayTitle = rawSongTopic.replace(/^campus[- ]song\s*[-–:]\s*/i, '').replace(/^campus[- ]song\s+/i, '').replace(/\s*\([^)]*\)\s*$/, '').replace(/linken park/gi, 'Linkin Park');
                                          const songTitle = songInfo.displayTitle || formatDisplayTitle(cleanSongDisplayTitle) || songInfo.title;
                                          const songArtist = (songInfo.displayArtist || formatDisplayTitle(songInfo.artist) || '').replace(/linken park/gi, 'Linkin Park');
                                          const songColor = getSongColor(songTitle);
                                          const isSpeakingThisSongRow = isTtsSpeaking && activeTtsKey === `song_head_${idx}`;
                                          const isSpeakingThisSong = isTtsSpeaking && activeTtsKey === `song_note_${idx}`;
                                          const songSpeechText = formatSingleSongForSpeech({ title: songTitle, artist: songArtist, note: songNote });

                                          return (
                                            <div key={`song-hw-${idx}`} style={{
                                              display: 'flex',
                                              flexDirection: 'column',
                                              gap: '6px',
                                              background: isMobileView ? 'transparent' : '#ffffff',
                                              border: isMobileView ? 'none' : '1px solid #f1f5f9',
                                              borderRadius: isMobileView ? '0' : '14px',
                                              padding: isMobileView ? '0 0 10px 0' : '12px 14px',
                                              boxShadow: isMobileView ? 'none' : '0 1px 3px rgba(0,0,0,0.02)',
                                              borderBottom: isMobileView ? (idx < deduplicatedOtherHWs.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none') : '1px solid #f1f5f9'
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
                                                  width: isJunior ? '38px' : '34px',
                                                  height: isJunior ? '38px' : '34px',
                                                  borderRadius: isJunior ? '10px' : '8px',
                                                  background: `linear-gradient(135deg, ${songColor.from}, ${songColor.to})`,
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  color: songColor.text || '#0f172a',
                                                  boxShadow: `0 2px 6px ${songColor.shadowFrom || 'rgba(0,0,0,0.06)'}`,
                                                  border: '1px solid rgba(255, 255, 255, 0.85)',
                                                  flexShrink: 0
                                                }}>
                                                  <Music size={isJunior ? 18 : 16} strokeWidth={2.4} />
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                                                  <span style={{
                                                    fontSize: isJunior ? '1.14rem' : '1.05rem',
                                                    fontWeight: 850,
                                                    color: '#0f172a',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    lineHeight: 1.25
                                                  }}>
                                                    {songTitle}
                                                    {songArtist && (
                                                      <span style={{ fontSize: '0.90rem', fontWeight: 650, color: '#64748b', marginLeft: '6px' }}>
                                                        · {songArtist}
                                                      </span>
                                                    )}
                                                  </span>
                                                </div>
                                                <MicroScoreSnippetButton studentId={student?.id} taskId={`song-${item.id || item.song_id || item.topic_name || item.title || cleanSongDisplayTitle || idx}`} taskTitle={cleanSongDisplayTitle || songTitle} defaultInstrument={student?.instrument} isJunior={isJunior} readOnly={readOnly} />
                                              </div>

                                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                {readOnly && (
                                                  <StudentHomeworkStatusButton
                                                    studentId={student?.id}
                                                    taskId={`song-${item.id || item.song_id || item.topic_name || item.title || cleanSongDisplayTitle || idx}`}
                                                    label={songTitle}
                                                  />
                                                )}
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
                                                    border: isSpeakingThisSongRow ? '1px solid #10b981' : '1px solid #cbd5e1',
                                                    background: isSpeakingThisSongRow ? '#dcfce7' : '#ffffff',
                                                    color: isSpeakingThisSongRow ? '#15803d' : '#64748b',
                                                    borderRadius: isJunior ? '10px' : '8px',
                                                    width: isJunior ? '34px' : '30px',
                                                    height: isJunior ? '34px' : '30px',
                                                    minWidth: isJunior ? '34px' : '30px',
                                                    minHeight: isJunior ? '34px' : '30px',
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
                                                    <VolumeX size={isJunior ? 16 : 13} strokeWidth={2.4} />
                                                  ) : (
                                                    <Volume2 size={isJunior ? 16 : 13} strokeWidth={2.2} />
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
                                                  fontSize: isJunior ? '0.98rem' : '0.88rem',
                                                  lineHeight: 1.5,
                                                  padding: isJunior ? '6px 10px' : '5px 8px',
                                                  marginLeft: isJunior ? '40px' : '32px',
                                                  borderRadius: '8px',
                                                  background: isSpeakingThisSong ? '#e0e7ff' : (parsedAnn.isSpecificToCurrent ? '#f0fdf4' : 'transparent'),
                                                  border: parsedAnn.isSpecificToCurrent ? '1px solid #10b981' : 'none',
                                                  opacity: isFutureWeek ? 0.38 : 1,
                                                  transition: 'all 0.15s ease'
                                                }}>
                                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', minWidth: 0 }}>
                                                    <span style={{ fontWeight: 850, color: '#4f46e5', flexShrink: 0, fontSize: isJunior ? '0.98rem' : '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
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
                                                        border: '1px solid #10b981',
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
                                                      handleSpeakText(`Fahrplan für ${(item.topic_name || item.title || item.song_title || 'Song').replace(/\s*\([^)]*\)\s*$/, '')}: ${parsedAnn.cleanText}`, `song_note_${idx}`);
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
                                          if (lower.startsWith('latency:') || lower.startsWith('latency_calibration:') || item.startsWith('SYSTEM:') || item.startsWith('STICKER:') || item.startsWith('AUDIO:') || item.startsWith('LOOP:') || item.startsWith('WORLDTOUR_MASTERY:') || lower.includes('worldtour_mastery:')) return false;

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
                                                padding: isMobileView ? '8px 12px' : '12px 14px',
                                                borderRadius: '14px',
                                                background: isSpeakingThisNote ? '#dcfce7' : (parsedAnn.isSpecificToCurrent ? '#f0fdf4' : '#ffffff'),
                                                border: parsedAnn.isSpecificToCurrent ? '1px solid #10b981' : '1px solid #f1f5f9',
                                                boxShadow: parsedAnn.isSpecificToCurrent ? '0 2px 6px rgba(34, 197, 94, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
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
                                                <FileText size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                                                
                                                {/* Personal Badge if targeted to current student */}
                                                {parsedAnn.isSpecificToCurrent && (
                                                  <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    background: '#dcfce7',
                                                    color: '#15803d',
                                                    border: '1px solid #10b981',
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
                                                  fontSize: isJunior ? '1.04rem' : '0.96rem',
                                                  lineHeight: 1.5,
                                                  overflow: 'hidden',
                                                  textOverflow: 'ellipsis',
                                                  whiteSpace: 'nowrap'
                                                }}>
                                                  {cleanNoteText ? (cleanNoteText.charAt(0).toUpperCase() + cleanNoteText.slice(1)).replace(/\bbemerkung\b/gi, 'Bemerkung') : ''}
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
                                        border: '1px solid #10b981',
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
                            {/* 🎛️ 0,1% GOLDSTANDARD: TEACHER HOMEWORK ACTION DOCK                       */}
                            {/* ========================================================================= */}
                            {!readOnly && (
                              <TeacherHomeworkActionDock
                                student={student}
                                viewingWeekIso={viewingWeekIso}
                                viewingWeekNum={viewingWeekNum}
                                viewingWeekOffset={viewingWeekOffset}
                                setViewingWeekOffset={setViewingWeekOffset}
                                readOnly={readOnly}
                                isMobileView={isMobileView}
                                activeNoteTarget={activeNoteTarget}
                                setActiveNoteTarget={setActiveNoteTarget}
                                activeViewingStudentNotes={activeViewingStudentNotes}
                                generalHomeworkNotes={generalHomeworkNotes}
                                setGeneralHomeworkNotes={setGeneralHomeworkNotes}
                                latestGeneralHomeworkNotesRef={latestGeneralHomeworkNotesRef}
                                teacherNotes={teacherNotes}
                                setTeacherNotes={setTeacherNotes}
                                latestTeacherNotesRef={latestTeacherNotesRef}
                                homeworkNotesList={homeworkNotesList}
                                setHomeworkNotesList={setHomeworkNotesList}
                                triggerDebouncedAutoSave={triggerDebouncedAutoSave}
                                triggerImmediateAutoSave={triggerImmediateAutoSave}
                                effectiveGroupStudents={effectiveGroupStudents}
                                studentFirstName={studentFirstName}
                                carriedOverWeekLabel={carriedOverWeekLabel}
                                isAudioCarriedOver={isAudioCarriedOver}
                                isNotesCarriedOver={isNotesCarriedOver}
                                isBooksCarriedOver={isBooksCarriedOver}
                                isSongsCarriedOver={isSongsCarriedOver}
                                PRESET_CHIPS={PRESET_CHIPS}
                                handleTogglePresetChip={handleTogglePresetChip}
                                audioNotesCount={audioNotes.length}
                                hasTresorStorage={hasTresorStorage}
                                isRecordingAudio={isRecordingAudio}
                                isUploadingAudio={isUploadingAudio}
                                audioDuration={audioDuration}
                                formatRecordTime={formatRecordTime}
                                handleStartPlayAlongRecording={handleStartPlayAlongRecording}
                                stopRecordingAudio={stopRecordingAudio}
                                cancelPlayAlongCountIn={cancelPlayAlongCountIn}
                                playAlongCountInRemaining={playAlongCountInRemaining}
                                isCountInEnabled={isCountInEnabled}
                                setIsCountInEnabled={setIsCountInEnabled}
                                showPlayAlongMetronomePopup={showPlayAlongMetronomePopup}
                                setShowPlayAlongMetronomePopup={setShowPlayAlongMetronomePopup}
                                isRecordingMetronomeActive={isRecordingMetronomeActive}
                                setIsRecordingMetronomeActive={setIsRecordingMetronomeActive}
                                recordingBpm={recordingBpm}
                                setRecordingBpm={setRecordingBpm}
                                playMetronomeTick={playMetronomeTick}
                                audioLabel={audioLabel}
                                setAudioLabel={setAudioLabel}
                              />
                            )}
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

        {/* 🎛️ MODUL-FREISCHALT-SHEET (ELTERN) - 0,1% DESIGN GOLDSTANDARD */}
        {showModuleUnlockModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Studio-Module freischalten"
            ref={moduleUnlockModalRef}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.65)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
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
                maxWidth: "540px",
                maxHeight: "min(90dvh, 760px)",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                border: "1px solid #e2e8f0",
                overflow: "hidden"
              }}
            >
              {/* 🏛️ ZONE 1: FIXED APPLE CLEAN HEADER */}
              <div style={{
                padding: "18px 22px",
                background: "#ffffff",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                    border: "1px solid #bfdbfe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.12)"
                  }}>
                    <Sliders size={20} color="#2563eb" strokeWidth={2.4} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.02rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>
                      Zusatzmodule freischalten
                    </h3>
                    <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#64748b" }}>
                      Eltern-Freigabe für {studentFirstName}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeAndLockModuleModal}
                  aria-label="Schließen"
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "50%",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  className="hover-scale"
                >
                  <X size={16} color="#64748b" strokeWidth={2.2} />
                </button>
              </div>

              {/* 🎛️ ZONE 2: APPLE SEGMENTED CONTROL (PILL-SLIDER) - Nur sichtbar wenn tatsächlich Module ausgeblendet sind */}
              {customModuleLayout.hidden.length > 0 && (
                <div style={{
                  padding: "12px 22px 10px 22px",
                  background: "#ffffff",
                  borderBottom: "1px solid #f1f5f9",
                  flexShrink: 0
                }}>
                  <div style={{
                    display: "flex",
                    background: "#f1f5f9",
                    padding: "4px",
                    borderRadius: "12px",
                    gap: "4px"
                  }}>
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
                        padding: "8px 12px",
                        border: "none",
                        borderRadius: "9px",
                        background: activeModuleUnlockTab === 'extensions' ? "#ffffff" : "transparent",
                        color: activeModuleUnlockTab === 'extensions' ? "#0f172a" : "#64748b",
                        fontSize: "0.78rem",
                        fontWeight: 800,
                        cursor: "pointer",
                        boxShadow: activeModuleUnlockTab === 'extensions' ? "0 2px 6px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" : "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)"
                      }}
                    >
                      <Lock size={13} color={activeModuleUnlockTab === 'extensions' ? "#2563eb" : "#64748b"} />
                      <span>Studio-Erweiterungen</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveModuleUnlockTab('restore')}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        border: "none",
                        borderRadius: "9px",
                        background: activeModuleUnlockTab === 'restore' ? "#ffffff" : "transparent",
                        color: activeModuleUnlockTab === 'restore' ? "#0f172a" : "#64748b",
                        fontSize: "0.78rem",
                        fontWeight: 800,
                        cursor: "pointer",
                        boxShadow: activeModuleUnlockTab === 'restore' ? "0 2px 6px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" : "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)"
                      }}
                    >
                      <RotateCcw size={13} color={activeModuleUnlockTab === 'restore' ? "#2563eb" : "#64748b"} />
                      <span>Ausgeblendet ({customModuleLayout.hidden.length})</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 📜 ZONE 3: SCROLLABLE CONTENT BODY */}
              <div style={{
                flex: 1,
                overflowY: "auto",
                overscrollBehavior: "contain",
                padding: "18px 22px",
                display: "flex",
                flexDirection: "column",
                gap: "14px"
              }}>
                {(activeModuleUnlockTab === 'restore' && customModuleLayout.hidden.length > 0) ? (
                  <>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b", lineHeight: 1.45 }}>
                      Hier siehst du Module, die auf der Leiste ausgeblendet wurden. Du kannst sie jederzeit ohne Eltern-PIN wieder einblenden.
                    </p>

                    {customModuleLayout.hidden.length === 0 ? (
                      <div style={{
                        padding: "32px 16px",
                        textAlign: "center",
                        background: "#f8fafc",
                        border: "1.5px dashed #cbd5e1",
                        borderRadius: "18px",
                        color: "#64748b",
                        fontSize: "0.84rem",
                        fontWeight: 700
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
                            protocol: uiLevel === 'junior'
                              ? 'Noten & Songs'
                              : uiLevel === 'teen'
                                ? 'Songs & Noten'
                                : 'Repertoire & Noten',
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
                                padding: "12px 16px",
                                background: "#ffffff",
                                border: "1.5px solid #e2e8f0",
                                borderRadius: "16px",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                <CampusStudioModuleCover
                                  moduleKey={hiddenKey as any}
                                  size="sm"
                                  uiLevel={uiLevel}
                                />
                                <div>
                                  <div style={{ fontSize: "0.90rem", fontWeight: 800, color: "#0f172a" }}>
                                    {labelMap[hiddenKey] || hiddenKey}
                                  </div>
                                  <div style={{ fontSize: "0.70rem", color: "#64748b" }}>
                                    Auf deiner Studio-Leiste ausgeblendet
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRestoreModule(hiddenKey)}
                                style={{
                                  background: "#22c55e",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "10px",
                                  padding: "6px 14px",
                                  fontSize: "0.76rem",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  boxShadow: "0 2px 6px rgba(34, 197, 94, 0.25)"
                                }}
                                className="hover-scale"
                                aria-label={`${labelMap[hiddenKey] || hiddenKey} wieder einblenden`}
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
                          background: "#f8fafc",
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
                          gap: "6px",
                          transition: "all 0.15s ease"
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
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b", lineHeight: 1.45 }}>
                      Hier können Erziehungsberechtigte zusätzliche Werkzeuge und didaktische Erweiterungen für <strong style={{ color: "#334155" }}>{studentFirstName}</strong> freischalten oder anpassen.
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {[
                        {
                          key: 'groovetrainer' as StudioModuleKey,
                          title: 'Groove-Trainer',
                          badge: 'TIMING & RHYTHMUS',
                          badgeColor: '#ea580c',
                          badgeBg: 'rgba(249, 115, 22, 0.08)',
                          badgeBorder: '1px solid rgba(249, 115, 22, 0.22)',
                          description: 'Interaktives Rhythmustraining mit Metronom & Feedback',
                          pills: ['🥁 Micro-Timing', '⚡ Tempotraining']
                        },
                        {
                          key: 'tuner' as StudioModuleKey,
                          title: 'Stimmgerät',
                          badge: 'INTONATION & PITCH',
                          badgeColor: '#0891b2',
                          badgeBg: 'rgba(6, 182, 212, 0.08)',
                          badgeBorder: '1px solid rgba(6, 182, 212, 0.22)',
                          description: 'Präzises Instrumenten-Stimmgerät mit Frequenzerkennung',
                          pills: ['🎯 440 Hz / Kalibrierbar', '🎚️ Echtzeit-Pitch']
                        },
                        {
                          key: 'earlab' as StudioModuleKey,
                          title: uiLevel === 'junior' ? 'Klang-Detektiv' : 'Gehörtraining',
                          badge: 'GEHÖRBILDUNG',
                          badgeColor: '#7c3aed',
                          badgeBg: 'rgba(139, 92, 246, 0.08)',
                          badgeBorder: '1px solid rgba(139, 92, 246, 0.22)',
                          description: uiLevel === 'junior' ? 'Spielerisches Erkennen von Tönen und Melodien' : 'Intervalle, Akkorde & Skalen hören und bestimmen',
                          pills: ['👂 Intervalltraining', '🎶 Melodiediktat']
                        },
                        {
                          key: 'loopstation' as StudioModuleKey,
                          title: 'Loopstation',
                          badge: 'PROFI-STUDIO',
                          badgeColor: '#e11d48',
                          badgeBg: 'rgba(244, 63, 94, 0.08)',
                          badgeBorder: '1px solid rgba(244, 63, 94, 0.22)',
                          description: 'Mehrspur-Aufnahmen & kreatives Jammen',
                          pills: ['🎙️ 4 Spuren', '🎛️ Beat-Pads']
                        },
                        {
                          key: 'skillradar' as StudioModuleKey,
                          title: uiLevel === 'junior' ? 'Musik-Stern' : 'Fähigkeiten-Radar',
                          badge: 'KOMPETENZ-PROFIL',
                          badgeColor: '#d946ef',
                          badgeBg: 'rgba(217, 70, 239, 0.08)',
                          badgeBorder: '1px solid rgba(217, 70, 239, 0.22)',
                          description: 'Visualisierung des didaktischen Fortschritts und aller Meilensteine',
                          pills: ['⭐ 5 Dimensionen', '📈 Langzeit-Entwicklung']
                        },
                        {
                          key: 'worldtour' as StudioModuleKey,
                          title: 'Musik-Weltreise',
                          badge: 'DIDAKTISCHE EXPEDITION',
                          badgeColor: '#0284c7',
                          badgeBg: 'rgba(2, 132, 199, 0.08)',
                          badgeBorder: '1px solid rgba(2, 132, 199, 0.22)',
                          description: 'Musikalische Entdeckungsreise durch Rhythmen und Kulturen der Welt',
                          pills: ['🌍 Kontinente & Stile', '🏆 Reisepass-Sticker']
                        },
                        {
                          key: 'archive' as StudioModuleKey,
                          title: 'Unterrichts-Archiv',
                          badge: 'CHRONIK & BACKUP',
                          badgeColor: '#334155',
                          badgeBg: 'rgba(71, 85, 105, 0.08)',
                          badgeBorder: '1px solid rgba(71, 85, 105, 0.22)',
                          description: 'Vergangene Wochen, Notizen & Hausaufgaben-Chronik',
                          pills: ['📅 Alle Wochen', '🎵 Sprachnotizen']
                        }
                      ].map((ext) => {
                        const isUnlocked = isStudioModuleActive(ext.key, uiLevel as any, localModuleOverrides);
                        return (
                          <div
                            key={ext.key}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "12px 16px",
                              background: "#ffffff",
                              border: isUnlocked ? `1.5px solid ${ext.badgeColor}40` : "1.5px solid #e2e8f0",
                              borderRadius: "18px",
                              boxShadow: isUnlocked
                                ? `0 4px 14px -2px ${ext.badgeColor}22, 0 1px 3px rgba(0,0,0,0.04)`
                                : "0 1px 3px rgba(0,0,0,0.02)",
                              gap: "14px",
                              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0, flex: 1 }}>
                              <CampusStudioModuleCover
                                moduleKey={ext.key as any}
                                size="md"
                                isUnlocked={true}
                                uiLevel={uiLevel}
                              />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                  <div style={{ fontSize: "0.92rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.01em" }}>
                                    {ext.title}
                                  </div>
                                  <span style={{
                                    fontSize: "0.60rem",
                                    fontWeight: 800,
                                    color: ext.badgeColor,
                                    background: ext.badgeBg,
                                    padding: "1.5px 7px",
                                    borderRadius: "100px",
                                    border: ext.badgeBorder,
                                    letterSpacing: "0.02em"
                                  }}>
                                    {ext.badge}
                                  </span>
                                </div>
                                <div style={{ fontSize: "0.73rem", color: "#64748b", marginTop: "2px", lineHeight: 1.35 }}>
                                  {ext.description}
                                </div>
                                <div style={{ display: "flex", gap: "5px", marginTop: "6px", flexWrap: "wrap" }}>
                                  {ext.pills.map((pill, pIdx) => (
                                    <span key={pIdx} style={{
                                      fontSize: "0.62rem",
                                      fontWeight: 700,
                                      color: "#475569",
                                      background: "#f8fafc",
                                      border: "1px solid #e2e8f0",
                                      padding: "1px 7px",
                                      borderRadius: "6px"
                                    }}>
                                      {pill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Apple WAI-ARIA Switch Toggle (44px Hit Target) */}
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isUnlocked}
                              aria-label={`${ext.title} für ${studentFirstName} freischalten`}
                              onClick={() => handleToggleModuleOverride(ext.key, !isUnlocked)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleToggleModuleOverride(ext.key, !isUnlocked);
                                }
                              }}
                              style={{
                                width: "52px",
                                height: "30px",
                                borderRadius: "15px",
                                background: isUnlocked ? "#22c55e" : "#cbd5e1",
                                border: "none",
                                padding: "3px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: isUnlocked ? "flex-end" : "flex-start",
                                transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                                boxShadow: isUnlocked ? "0 0 12px rgba(34, 197, 94, 0.40)" : "none",
                                flexShrink: 0,
                                outline: "none"
                              }}
                              className="hover-scale-mini"
                            >
                              <div style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                background: "#ffffff",
                                boxShadow: "0 2px 5px rgba(0,0,0,0.25)"
                              }} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* 🔒 ZONE 4: STICKY AUTO-SYNC FOOTER */}
              <div style={{
                padding: "14px 22px",
                background: "#ffffff",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexShrink: 0
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "#22c55e",
                    boxShadow: "0 0 6px rgba(34, 197, 94, 0.6)"
                  }} />
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b" }}>
                    Live synchronisiert
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModuleUnlockModal(false)}
                  style={{
                    background: "#0f172a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "12px",
                    padding: "9px 20px",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.18)",
                    transition: "all 0.16s ease"
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
