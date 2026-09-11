import React, { Suspense, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Activity, ArrowRightLeft, Award, BookOpen, Calendar, Check, CheckCircle, ChevronDown, ChevronLeft,
  ChevronRight, Clock, Copy, Disc, Edit3, FileText, Hash, Headphones, HelpCircle, History, Lightbulb,
  Lock, Mail, Mic, Moon, Music, Pin, Plus, Radio, RotateCcw, Search, Share2, Sliders,
  Sparkles, Square, Star, Target, Timer, Trash2, User, Volume2, VolumeX, AlertCircle,
  EyeOff, Hand, Info, MessageSquare, MoreHorizontal, Printer, RotateCw, Unlock, Wrench, Zap, X
} from 'lucide-react';
import Confetti from 'react-confetti';
import { AudioTrackCarousel } from '../../AudioTrackCarousel';
import { CampusPinUnlockModal } from '../../CampusPinUnlockModal';
import { SpeechDictationButton } from '../SpeechDictationButton';
import { MechanicalMetronomeIcon } from './MeisterwerkAudioPlayers';
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
import { getInstrumentAvatarUrl } from '../studentAvatars.constants';
import { getSimulatedNow, getWeekDateRange } from '../studentDateUtils';

export type MeisterwerkBrushType = 'NONE' | 'LOCKED' | 'HOMEWORK' | 'MASTERED' | 'THEORY' | 'STUDENT_FOCUS';
export type MeisterwerkFeedbackStatus = 'beherrscht' | 'in_entwicklung' | 'wiederholen' | null;

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
  updateLehrwerkVisibility: (...args: any[]) => any;
  useNotebookLayout: boolean;
  viewingWeekOffset: number;
}

export function MeisterwerkDocumentTab(props: MeisterwerkDocumentTabProps) {
  const {
    DIDACTIC_QUICK_TAGS,
    PRESET_CHIPS,
    activeBrush,
    activeLehrwerkId,
    activeNoteTarget,
    activePageNumber,
    activeSongSkills,
    activeSubView,
    activeTagPickerRowIndex,
    activeTtsKey,
    adjustTextareaHeight,
    assignedLehrwerke,
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
    isCountInEnabled,
    isCurrentHomework,
    isFullscreen,
    isInsideSim,
    isLinkCopied,
    isMatchModeEnabled,
    isMatchRevealed,
    isMobileOrSim,
    isMobileView,
    isQuestionEditorOpen,
    isRecordingAudio,
    isRecordingMetronomeActive,
    isSavingFeedback,
    isSavingQuestion,
    isShareMenuOpen,
    isSongMatch,
    isStudentNotePrivate,
    isStudentRatingCommitted,
    isSubSlidersExpanded,
    isTeacherMode,
    isTeacherTools,
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
    pageHomeworkNotes,
    pageNotesSelectionRef,
    pageNotesTextareaRef,
    parsedStudentQuestion,
    pendingFeedbackStatus,
    pendingFeedbackTags,
    playAlongCountInRemaining,
    playMetronomeTick,
    progressItems,
    questionDraftText,
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
    selectedHistoryWeek,
    setActiveBrush,
    setActiveInputTab,
    setActiveLehrwerkId,
    setActiveModalTab,
    setActiveNoteTarget,
    setActivePageNumber,
    setActiveSongSkills,
    setActiveSubView,
    setActiveTagPickerRowIndex,
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
    setIsQuestionEditorOpen,
    setIsRecordingMetronomeActive,
    setIsSavingFeedback,
    setIsShareMenuOpen,
    setIsStudentNotePrivate,
    setIsSubSlidersExpanded,
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
    setQuestionDraftText,
    setRecordingBpm,
    setRhythmVal,
    setSelectedHistoryWeek,
    setShowAllPagesGrid,
    setShowAssignDropdown,
    setShowCreateLehrwerkModal,
    setShowCreateSongModal,
    setShowPlayAlongMetronomePopup,
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
    showPlayAlongMetronomePopup,
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
  const [localModuleOverrides, setLocalModuleOverrides] = useState<Record<string, boolean>>(() => {
    return (student as any)?.parent_permissions?.module_overrides || {};
  });

  // 🎛️ STUDIO MODULES CUSTOM DRAG & DROP + JIGGLE MODE STATE
  const [isModuleEditMode, setIsModuleEditMode] = useState(false);
  const [activeModuleUnlockTab, setActiveModuleUnlockTab] = useState<'restore' | 'extensions'>('restore');
  const [draggedModuleKey, setDraggedModuleKey] = useState<StudioModuleKey | null>(null);

  const studentIdVal = (student as any)?.id;
  const [customModuleLayout, setCustomModuleLayout] = useState<{ order: StudioModuleKey[]; hidden: StudioModuleKey[] }>(() => {
    if (typeof window !== 'undefined' && studentIdVal) {
      try {
        const cached = localStorage.getItem(`campus_studio_modules_layout_${studentIdVal}`);
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    const dbLayout = (student as any)?.parent_permissions?.custom_layout;
    return {
      order: dbLayout?.order && Array.isArray(dbLayout.order) && dbLayout.order.length > 0 ? dbLayout.order : [...ALL_STUDIO_MODULE_KEYS],
      hidden: dbLayout?.hidden && Array.isArray(dbLayout.hidden) ? dbLayout.hidden : []
    };
  });

  useEffect(() => {
    if ((student as any)?.parent_permissions?.custom_layout) {
      const dbLayout = (student as any).parent_permissions.custom_layout;
      setCustomModuleLayout(prev => ({
        order: dbLayout.order && Array.isArray(dbLayout.order) && dbLayout.order.length > 0 ? dbLayout.order : prev.order,
        hidden: dbLayout.hidden && Array.isArray(dbLayout.hidden) ? dbLayout.hidden : prev.hidden
      }));
    }
  }, [(student as any)?.parent_permissions?.custom_layout]);

  const saveCustomLayout = useCallback(async (nextLayout: { order: StudioModuleKey[]; hidden: StudioModuleKey[] }) => {
    setCustomModuleLayout(nextLayout);
    if (studentIdVal && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`campus_studio_modules_layout_${studentIdVal}`, JSON.stringify(nextLayout));
      } catch (e) {}
    }
    if (student?.id) {
      try {
        const existingPermissions = (student as any)?.parent_permissions || {};
        const updatedPermissions = {
          ...existingPermissions,
          custom_layout: nextLayout
        };
        await supabase
          .from('users')
          .update({ parent_permissions: updatedPermissions })
          .eq('id', student.id);
        (student as any).parent_permissions = updatedPermissions;
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
    await saveCustomLayout(defaultLayout);
    setIsModuleEditMode(false);
    setShowModuleUnlockModal(false);
    setModuleToast(isTeacherMode 
      ? `Standard-Anordnung für ${studentDisplayName} wiederhergestellt` 
      : 'Standard-Anordnung wiederhergestellt'
    );
  }, [saveCustomLayout, isTeacherMode, studentDisplayName]);

  // 🔄 Automatic Layout Reset on UI Level change by parents (Junior <-> Teen <-> Pro)
  const prevUiLevelRef = useRef(uiLevel);
  useEffect(() => {
    if (prevUiLevelRef.current && prevUiLevelRef.current !== uiLevel) {
      handleResetModuleLayout();
    }
    prevUiLevelRef.current = uiLevel;
  }, [uiLevel, handleResetModuleLayout]);

  // 📱 Long-Press Handlers for iPads / Tablets (500ms)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleTouchStartTile = useCallback(() => {
    if (readOnly) return;
    longPressTimerRef.current = setTimeout(() => {
      setIsModuleEditMode(true);
      if (typeof navigator !== 'undefined' && (navigator as any).vibrate) {
        (navigator as any).vibrate(50);
      }
    }, 500);
  }, [readOnly]);

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
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState(false);
  const [isCarriedOverDismissed, setIsCarriedOverDismissed] = useState(false);
  const mobileMoreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsCarriedOverDismissed(false);
  }, [viewingWeekOffset, student?.id]);

  useEffect(() => {
    if (!showMobileMoreMenu) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (mobileMoreMenuRef.current && !mobileMoreMenuRef.current.contains(e.target as Node)) {
        setShowMobileMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showMobileMoreMenu]);

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
            flex: isMobileView ? 'none' : '1 1 0%',
            height: isMobileView ? 'auto' : '100%',
            minHeight: '0',
            maxHeight: isMobileView ? 'none' : '100%',
            overflowY: isMobileView ? 'visible' : 'auto',
            display: isMobileView ? (mobileProtokollTab === 'repertoire' ? 'flex' : 'none') : 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: '16px',
            background: useNotebookLayout ? '#faf8f2' : '#ffffff',
            borderRadius: '0',
            boxShadow: 'none',
            borderRight: useNotebookLayout ? '1px dashed #e5e0d4' : '1px solid #e8e8ed',
            position: 'relative',
            padding: isMobileView ? '8px 4px calc(140px + env(safe-area-inset-bottom, 20px)) 4px' : '0px',
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
                const pct = assignedBook ? Math.min(100, Math.round((Object.values(assignedBook.pageStates || {}).filter((p: any) => p.status === 'mastered').length / (book.totalPages || 50)) * 100)) : 0;
                const pages = Array.from({ length: book.totalPages || 50 }, (_, i) => i + 1);
                const currentVisibility = assignedBook?.visibility || 'private';

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
                        background: bookColor ? `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})` : '#e2e8f0',
                        borderRadius: '6px',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                        border: 'none',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {bookColor && <BookOpen size={22} color={bookColor.text} />}
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '6px',
                          background: 'rgba(0,0,0,0.08)',
                          borderRight: '1px solid rgba(255,255,255,0.1)'
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
                                  <span style={{ color: '#d97706', fontSize: '0.72rem', fontWeight: 800, background: '#fffbeb', border: '1px solid #fef3c7', padding: '2px 8px', borderRadius: '10px' }}>
                                    🙋 Vom Schüler angelegt
                                  </span>
                                ) : activeLehrwerkId.startsWith('custom-') || book.is_custom || assignedBook?.createdByRole === 'teacher' || book.created_by_teacher ? (
                                  <span style={{ color: '#0284c7', fontSize: '0.72rem', fontWeight: 800, background: '#f0f9ff', border: '1px solid #e0f2fe', padding: '2px 8px', borderRadius: '10px' }}>
                                    👨‍🏫 Vom Lehrer angelegt
                                  </span>
                                ) : (
                                  <span style={{ color: '#16a34a', fontSize: '0.72rem', fontWeight: 800, background: '#f0fdf4', border: '1px solid #dcfce7', padding: '2px 8px', borderRadius: '10px' }}>
                                    🎓 Vom Lehrer zugewiesen
                                  </span>
                                )}
                              </div>

                              {/* Expressive Apple Access Control Bar */}
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
                                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span>🛡️</span> Sichtbarkeit & Rechte:
                                </span>

                                {isStudentViewingTeacherBook ? (
                                  <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    padding: '4px 10px',
                                    gap: '6px',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    color: '#334155'
                                  }}>
                                    <span>
                                      {currentVisibility === 'private' ? '🔒 Nur für mich (Privat)' : currentVisibility === 'read' ? '👁️ Lehrer liest mit' : '🤝 Lehrer darf eintragen'}
                                    </span>
                                    <span style={{ fontSize: '0.65rem', color: '#047857', background: '#e6f4ea', padding: '1px 6px', borderRadius: '6px', fontWeight: 800 }}>
                                      👨‍🏫 Vom Lehrer gesteuert
                                    </span>
                                  </div>
                                ) : (
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
                                      🔒 Nur für mich (Privat)
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
                                      👁️ Lehrer liest mit
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
                                      🤝 Lehrer darf eintragen
                                    </button>
                                  </div>
                                )}
                              </div>

                              {book.author && (
                                <p style={{ margin: '0 0 2px 0', fontSize: '0.76rem', color: '#64748b', fontWeight: 650 }}>
                                  von {book.author}
                                </p>
                              )}
                              <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 800 }}>
                                📖 {book.totalPages || 50} Seiten • {pct}% gemeistert
                              </span>
                              <div style={{ width: '100%', height: '6px', background: '#e8e8ed', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #34a853, #34a853)', transition: 'width 0.4s ease' }} />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Brushes Panel for Textbooks - Protected for Teacher-assigned Books */}
                    {(() => {
                      const isStudentCreated = Boolean(assignedBook?.isStudentCreated || assignedBook?.createdByRole === 'student' || book.created_by_role === 'student');
                      const isStudentViewingTeacherBook = Boolean(readOnly && !isStudentCreated);

                      if (isStudentViewingTeacherBook) {
                        const isFocusActive = activeBrush === 'STUDENT_FOCUS';
                        return (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            background: 'white',
                            borderRadius: '18px',
                            padding: '12px 16px',
                            border: '1px solid rgba(0, 0, 0, 0.08)',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4b5563', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>🖌️</span> Dein Übe-Pinsel:
                              </span>
                              <button
                                type="button"
                                onClick={() => setActiveBrush(prev => prev === 'STUDENT_FOCUS' ? 'NONE' : 'STUDENT_FOCUS')}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '6px 14px',
                                  borderRadius: '999px',
                                  background: isFocusActive ? '#f5f3ff' : '#ffffff',
                                  border: isFocusActive ? '2px solid #8b5cf6' : '1.5px solid #cbd5e1',
                                  color: isFocusActive ? '#6d28d9' : '#475569',
                                  fontWeight: 800,
                                  fontSize: '0.74rem',
                                  cursor: 'pointer',
                                  boxShadow: isFocusActive ? '0 0 12px rgba(139, 92, 246, 0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
                                  transition: 'all 0.15s ease'
                                }}
                                className="tactile-btn"
                              >
                                <span style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  background: '#8b5cf6',
                                  display: 'inline-block',
                                  boxShadow: '0 0 6px rgba(139, 92, 246, 0.6)'
                                }} />
                                <span>🟣 Mein Übe-Fokus (Max. 3)</span>
                                {isFocusActive && <span style={{ color: '#8b5cf6', fontWeight: 900 }}>✓ Aktiv</span>}
                              </button>
                            </div>

                            <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.05)', paddingTop: '8px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: 'hsl(47, 85%, 84%)' }}>●</span> Gelb (Hausaufgabe)</span>
                              <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: 'hsl(130, 65%, 82%)' }}>●</span> Grün (erledigt)</span>
                              <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: 'hsl(355, 75%, 84%)' }}>●</span> Rot (unbearbeitet)</span>
                              <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: '#8b5cf6' }}>🟣</span> Lila Ring (Dein Übe-Fokus)</span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          background: 'white',
                          borderRadius: '18px',
                          padding: '12px 16px',
                          border: '1px solid rgba(0, 0, 0, 0.08)',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4b5563', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>🖌️</span> Pinsel zum Einfärben:
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {[
                                { mode: 'LOCKED', color: 'hsl(355, 75%, 84%)', label: 'rot = unbearbeitet' },
                                { mode: 'HOMEWORK', color: 'hsl(47, 85%, 84%)', label: 'gelb = Hausaufgabe' },
                                { mode: 'MASTERED', color: 'hsl(130, 65%, 82%)', label: 'grün = erledigt' }
                              ].map(b => {
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
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '50%',
                                      background: b.color,
                                      border: isActive ? '3px solid #0f172a' : '1.5px solid #cbd5e1',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease',
                                      transform: isActive ? 'scale(1.15)' : 'none',
                                      outline: 'none'
                                    }}
                                    title={b.label}
                                  />
                                );
                              })}
                            </div>
                          </div>
                          <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.05)', paddingTop: '8px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: 'hsl(355, 75%, 84%)' }}>●</span> Rot (unbearbeitet)</span>
                            <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: 'hsl(47, 85%, 84%)' }}>●</span> Gelb (Hausaufgabe)</span>
                            <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: 'hsl(130, 65%, 82%)' }}>●</span> Grün (erledigt)</span>
                            <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: '#8b5cf6' }}>🟣</span> Lila Ring (Schüler-Fokus)</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Page Grid preview scroll for active textbook */}
                    {assignedBook && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '24px', padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#7d7d82' }}>Seitenübersicht:</span>
                          <button
                            type="button"
                            onClick={() => setShowAllPagesGrid(true)}
                            style={{ background: 'transparent', border: 'none', color: '#34a853', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            className="hover-scale"
                          >
                            Ganzes Lehrwerk anzeigen
                          </button>
                        </div>
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
                            const totalChunks = Math.ceil(pages.length / 60);
                            const activeChunkIndex = Math.min(textbookPageChunkIndex, Math.max(0, totalChunks - 1));
                            const displayedPages = pages.length > 60 ? pages.slice(activeChunkIndex * 60, (activeChunkIndex + 1) * 60) : pages;
                            return displayedPages.map(num => {
                              const pageState = assignedBook.pageStates[num] || { status: 'locked' };
                              const globalPage = book.globalPageStates?.[num] === 'purple';
                              const status = globalPage ? 'purple' : (pageState.status || 'locked');
                              const isStudentFocus = Boolean(pageState?.studentFocus);

                              let borderColor = 'hsl(355, 70%, 73%)';
                              let bg = 'hsl(355, 80%, 94%)';
                              let textColor = 'hsl(355, 80%, 30%)';

                              if (status === 'homework') {
                                borderColor = 'hsl(47, 80%, 68%)';
                                bg = 'hsl(47, 90%, 93%)';
                                textColor = 'hsl(47, 85%, 28%)';
                              } else if (status === 'mastered') {
                                borderColor = 'hsl(130, 60%, 70%)';
                                bg = 'hsl(130, 70%, 93%)';
                                textColor = 'hsl(130, 70%, 25%)';
                              } else if (status === 'purple') {
                                borderColor = 'hsl(255, 65%, 73%)';
                                bg = 'hsl(255, 80%, 94%)';
                                textColor = 'hsl(255, 75%, 32%)';
                              }

                              let solidActiveBg = 'hsl(355, 75%, 84%)';
                              if (status === 'homework') solidActiveBg = 'hsl(47, 85%, 84%)';
                              else if (status === 'mastered') solidActiveBg = 'hsl(130, 65%, 82%)';
                              else if (status === 'purple') solidActiveBg = 'hsl(255, 75%, 84%)';

                              const isPageActive = activePageNumber === num;

                              return (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => {
                                    const isStudentCreated = Boolean(assignedBook?.isStudentCreated || assignedBook?.createdByRole === 'student' || book.created_by_role === 'student');
                                    const isStudentViewingTeacherBook = Boolean(readOnly && !isStudentCreated);

                                    if (activeBrush === 'STUDENT_FOCUS') {
                                      toggleStudentFocusPage(activeLehrwerkId!, num);
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
                                      : (isStudentFocus ? '2.5px solid #8b5cf6' : `2px solid ${borderColor}`),
                                    background: isPageActive ? solidActiveBg : bg,
                                    color: isPageActive ? 'white' : textColor,
                                    fontWeight: 900,
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: isStudentFocus 
                                      ? (isPageActive ? '0 0 0 3px #8b5cf6, 0 4px 12px rgba(139, 92, 246, 0.4)' : '0 0 0 2px #8b5cf6, 0 2px 8px rgba(139, 92, 246, 0.35)')
                                      : (isPageActive ? '0 4px 8px rgba(0,0,0,0.1)' : 'none'),
                                    transform: isPageActive ? 'scale(1.08)' : 'none',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <span>{num}</span>
                                  {isStudentFocus && (
                                    <span 
                                      title="Schüler-Übefokus" 
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
                    {/* Song Cover Card */}
                    <div style={{
                      background: 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '24px',
                      padding: '20px',
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                    }}>
                      {renderSongVinylCover(songColor, 'sm')}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {skill.songs?.title}
                        </h4>
                        <p style={{ margin: '0 0 2px 0', fontSize: '0.76rem', color: '#64748b', fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          von {skill.songs?.artist}
                        </p>
                        <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 800 }}>
                          {progress}%
                        </span>
                        <div style={{ width: '100%', height: '7px', background: '#e8e8ed', borderRadius: '3.5px', marginTop: '6px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${progress}%`,
                            height: '100%',
                            background: (status === 'MASTERED' || skill.is_stage_ready || progress === 100)
                              ? 'hsl(130, 65%, 82%)'
                              : 'hsl(47, 85%, 84%)',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                      </div>
                    </div>

                    {/* Brushes Panel for Songs */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      background: 'white',
                      borderRadius: '18px',
                      padding: '12px 16px',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4b5563', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>🎵</span> Songstatus:
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {[
                            { mode: 'LOCKED', color: 'hsl(355, 75%, 84%)', label: 'Rot (keine Hausaufgabe)', getActive: () => status === 'IN_PROGRESS' && !isCurrentHomework, action: () => {
                               setStatus('IN_PROGRESS');
                               setIsCurrentHomework(false);
                               setHasChanges(true);
                               if (selectedActiveSongId) triggerDirectSongSave(selectedActiveSongId, 'IN_PROGRESS', false);
                             } },
                            { mode: 'HOMEWORK', color: 'hsl(47, 85%, 84%)', label: 'Gelb (Hausaufgabe)', getActive: () => status === 'IN_PROGRESS' && isCurrentHomework, action: () => {
                               setStatus('IN_PROGRESS');
                               setIsCurrentHomework(true);
                               setHasChanges(true);
                               if (selectedActiveSongId) triggerDirectSongSave(selectedActiveSongId, 'IN_PROGRESS', true);
                             } },
                            { mode: 'MASTERED', color: 'hsl(130, 65%, 82%)', label: 'Grün (erledigt)', getActive: () => status === 'MASTERED', action: () => {
                               setStatus('MASTERED');
                               setIsCurrentHomework(false);
                               setHasChanges(true);
                               if (selectedActiveSongId) triggerDirectSongSave(selectedActiveSongId, 'MASTERED', false);
                             } }
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
                                  border: isActive ? '3px solid #0f172a' : '1.5px solid #cbd5e1',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  transform: isActive ? 'scale(1.15)' : 'none',
                                  outline: 'none'
                                }}
                                title={b.label}
                              />
                            );
                          })}
                        </div>
                      </div>
                      <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.05)', paddingTop: '8px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: 'hsl(355, 75%, 84%)' }}>●</span> Rot (keine Hausaufgabe)</span>
                        <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: 'hsl(47, 85%, 84%)' }}>●</span> Gelb (Hausaufgabe)</span>
                        <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: 'hsl(130, 65%, 82%)' }}>●</span> Grün (erledigt)</span>
                      </div>
                    </div>

                    {/* Collapsible Progress & Dual Match Widget */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      background: 'white',
                      borderRadius: '20px',
                      padding: '16px 18px',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                      transition: 'all 0.3s ease',
                      position: 'relative'
                    }}>
                      {/* Match Confetti Flash */}
                      {showMatchConfetti && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 10 }}>
                          <Confetti width={500} height={300} recycle={false} numberOfPieces={120} />
                        </div>
                      )}

                      {/* Header row: Progress Title & Mode Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.86rem', fontWeight: 900, color: songProgressPercent === 100 ? '#34a853' : '#0f172a', transition: 'color 0.3s ease' }}>
                            {`Fortschritt: ${songProgressPercent}%`}
                          </span>
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

                      {/* READ-ONLY PROGRESS DISPLAY FOR STUDENT */}
                      {readOnly && (
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
                      const isOrderCustomized = customModuleLayout.order.some((key, idx) => key !== ALL_STUDIO_MODULE_KEYS[idx]);
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
                          title: 'Übe-Begleiter',
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
                          title: uiLevel === 'junior' ? 'Klang-Detektiv' : 'EarLab & Harmony',
                          icon: <Headphones size={34} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />,
                          gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          boxShadow: '0 6px 14px -2px rgba(16, 185, 129, 0.40)',
                          isUnlocked: true,
                          showInView: true,
                          onClick: () => {
                            setActiveModalTab('document');
                            setActiveViewMode('earlab' as any);
                            setActiveSubView('hub');
                          }
                        },
                        skillradar: {
                          title: uiLevel === 'junior' ? 'Musik-Stern ⭐' : uiLevel === 'pro' ? 'Kompetenz-Radar' : 'Skill-Radar',
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
                          title: 'Protokoll',
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
                          title: 'Archiv',
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
                        }
                      };

                      // Filter visible ordered modules
                      const visibleModuleKeys = customModuleLayout.order.filter(key => {
                        const def = moduleDefinitions[key];
                        if (!def) return false;
                        if (!def.showInView) return false;
                        return !customModuleLayout.hidden.includes(key);
                      });

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
                              {hasLayoutModifications && !readOnly && (
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

                            {/* ✏️ EDIT-MODUS (JIGGLE) BUTTON */}
                            {!readOnly && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                              </div>
                            )}
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

                              const isGhosted = !mod.isUnlocked;
                              const isDraggingCurrent = draggedModuleKey === moduleKey;

                              return (
                                <div
                                  key={moduleKey}
                                  draggable={isModuleEditMode && !readOnly}
                                  onDragStart={(e) => {
                                    if (readOnly) return;
                                    setDraggedModuleKey(moduleKey);
                                    e.dataTransfer.effectAllowed = 'move';
                                  }}
                                  onDragOver={(e) => {
                                    if (readOnly) return;
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                  }}
                                  onDrop={(e) => {
                                    if (readOnly) return;
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
                                  title={isGhosted ? `In ${uiLevel === 'junior' ? 'Junior' : 'Teen'} inaktiv – Klick für Lehrer-Demo-Modus` : undefined}
                                >
                                  {/* ❌ AUSBLENDEN-BADGE IM EDIT-MODUS */}
                                  {isModuleEditMode && !readOnly && (
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

                                  {/* 🔒 INAKTIV-BADGE FÜR LEHRER-GHOSTING */}
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
                                      <span>Inaktiv</span>
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

                            {/* ➕ SCHÜLER- & ELTERN-FREISCHALTKACHEL (Bei ausgeblendeten Modulen oder inaktiven Studio-Erweiterungen) */}
                            {(hasHiddenModules || !isLoopstationUnlocked || !isArchiveUnlocked) && (
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
                        onClick={() => setShowAssignDropdown(!showAssignDropdown)}
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

                      {showAssignDropdown && (
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
                              onClick={(e) => { e.stopPropagation(); setShowAssignDropdown(false); }}
                              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                          {globalLehrwerke
                            .filter(g => {
                              const isAssignedById = assignedLehrwerke.some(a => String(a.lehrwerkId) === String(g.id));
                              const isAssignedByTitle = assignedLehrwerke.some(a => (a.bookTitle || a.lehrwerkTitle || '').trim().toLowerCase() === (g.title || '').trim().toLowerCase());
                              return !isAssignedById && !isAssignedByTitle;
                            })
                            .filter((g, idx, arr) => arr.findIndex(x => (x.title || '').trim().toLowerCase() === (g.title || '').trim().toLowerCase()) === idx)
                            .map(g => (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => {
                                  handleAssignLehrwerk(g.id);
                                  setShowAssignDropdown(false);
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
                            ))
                          }
                          {globalLehrwerke.filter(g => {
                            const isAssignedById = assignedLehrwerke.some(a => String(a.lehrwerkId) === String(g.id));
                            const isAssignedByTitle = assignedLehrwerke.some(a => (a.bookTitle || a.lehrwerkTitle || '').trim().toLowerCase() === (g.title || '').trim().toLowerCase());
                            return !isAssignedById && !isAssignedByTitle;
                          }).length === 0 && (
                            <span style={{ fontSize: '0.72rem', color: '#7d7d82', padding: '6px 8px', textAlign: 'center', fontStyle: 'italic' }}>
                              Alle Mediathek-Bücher zugewiesen
                            </span>
                          )}
                          <div style={{ borderTop: '1px solid #e8e8ed', margin: '4px 0' }} />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowCreateLehrwerkModal(true);
                              setShowAssignDropdown(false);
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

                  {showCreateLehrwerkModal && (
                    <form onSubmit={handleCreateAndAssignLehrwerk} style={{
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
                          onClick={() => setShowCreateLehrwerkModal(false)}
                          style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          placeholder="Buchtitel (z.B. Mein Gitarrenbuch 2026)..."
                          value={newLehrwerkTitle}
                          onChange={(e) => setNewLehrwerkTitle(e.target.value)}
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
                          value={newLehrwerkPages}
                          onChange={(e) => setNewLehrwerkPages(e.target.value)}
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
                          disabled={newLehrwerkLoading || !newLehrwerkTitle.trim()}
                          style={{
                            background: '#34a853',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            cursor: newLehrwerkTitle.trim() ? 'pointer' : 'not-allowed',
                            opacity: newLehrwerkTitle.trim() ? 1 : 0.6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {newLehrwerkLoading ? 'Erstelle...' : 'Speichern & Aktivieren'}
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
                    {/* 1. Kompakte Quick-Add Card GANZ VORNE (LINKS) */}
                    <div
                      onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                      style={{
                        flex: '0 0 auto',
                        width: sortedAssignedLehrwerke.length === 0 ? '140px' : '122px',
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
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                      }}>
                        <Plus size={18} strokeWidth={2.5} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.80rem', fontWeight: 900, color: '#0f172a' }}>Lehrwerk</div>
                        <div style={{ fontSize: '0.67rem', fontWeight: 700, color: '#64748b', marginTop: '1px' }}>+ Hinzufügen</div>
                      </div>
                    </div>

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
                                color: bookColor.text || '#ffffff',
                                textAlign: 'center',
                                lineHeight: 1.15,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textShadow: '0 1px 2px rgba(0,0,0,0.15)'
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
                              <span>{total} S.</span>
                              <span style={{ color: worked > 0 ? '#15803d' : '#64748b', fontWeight: 800 }}>{worked} gem.</span>
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

                    {(!readOnly && isTeacherTools) && (
                      <button
                        type="button"
                        onClick={() => setShowCreateSongModal(!showCreateSongModal)}
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
                        <span>Song anlegen</span>
                      </button>
                    )}
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
                        const canCreate = !readOnly && isTeacherTools;
                        return (
                          <div
                            onClick={() => {
                              if (canCreate) setShowCreateSongModal(true);
                            }}
                            role={canCreate ? 'button' : undefined}
                            tabIndex={canCreate ? 0 : undefined}
                            onKeyDown={canCreate ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setShowCreateSongModal(true);
                              }
                            } : undefined}
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
                                {canCreate ? '+ Klicke hier, um deinen ersten Song anzulegen' : 'Noch kein Song-Projekt von deiner Lehrkraft zugewiesen.'}
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

                                  {!readOnly && (skill.songs?.teacher_id || skill.created_by_teacher) && (
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
                                      title="Song entfernen"
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

                {/* SaaS Enterprise+ Song Selection & Creation Modal */}
                {showCreateSongModal && (
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
                  }} onClick={() => setShowCreateSongModal(false)}>
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
                            background: 'rgba(52, 168, 83, 0.1)',
                            color: '#34a853',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Music size={18} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>Song hinzufügen</h3>
                            <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Aus Schulkatalog wählen oder eigenen Song anlegen</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowCreateSongModal(false)}
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
                            onClick={() => setSongModalTab('catalog')}
                            style={{
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              fontSize: '0.78rem',
                              fontWeight: 850,
                              cursor: 'pointer',
                              background: songModalTab === 'catalog' ? '#ffffff' : 'transparent',
                              color: songModalTab === 'catalog' ? '#0f172a' : '#64748b',
                              boxShadow: songModalTab === 'catalog' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            📚 Schulkatalog
                          </button>
                          <button
                            type="button"
                            onClick={() => setSongModalTab('create')}
                            style={{
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              fontSize: '0.78rem',
                              fontWeight: 850,
                              cursor: 'pointer',
                              background: songModalTab === 'create' ? '#ffffff' : 'transparent',
                              color: songModalTab === 'create' ? '#0f172a' : '#64748b',
                              boxShadow: songModalTab === 'create' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            ✨ Neu erstellen
                          </button>
                        </div>
                      </div>

                      {/* Modal Body */}
                      <div style={{ padding: '12px 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {songModalTab === 'catalog' ? (
                          <>
                            <div style={{ position: 'relative' }}>
                              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                              <input
                                type="text"
                                placeholder="Song oder Künstler suchen..."
                                value={songSearch}
                                onChange={(e) => setSongSearch(e.target.value)}
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
                                const filtered = songs.filter(s => {
                                  const t = (s.title || '').toLowerCase().trim();
                                  if (t === 'test' || t === 'test - test' || t === 'test-test') return false;
                                  if (!songSearch.trim()) return true;
                                  return (s.title || '').toLowerCase().includes(songSearch.toLowerCase()) || 
                                         (s.artist || '').toLowerCase().includes(songSearch.toLowerCase());
                                });

                                if (filtered.length === 0) {
                                  return (
                                    <div style={{ padding: '30px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                      <span>Kein passender Song im Katalog gefunden.</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewSongTitle(songSearch);
                                          setSongModalTab('create');
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
                                        ✨ "{songSearch}" als neuen Song anlegen
                                      </button>
                                    </div>
                                  );
                                }

                                return filtered.map((song) => (
                                  <div
                                    key={song.id}
                                    onClick={() => {
                                      handleAssignSongFromCatalog(song.id);
                                      setShowCreateSongModal(false);
                                      setSongSearch('');
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
                                        background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                      }}>
                                        <Music size={14} color="#475569" />
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 900, fontSize: '0.85rem', color: '#0f172a' }}>{song.title}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>{song.artist || 'Unbekannter Künstler'}</div>
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
                          <form onSubmit={(e) => {
                            handleCreateAndAssignSong(e);
                            setShowCreateSongModal(false);
                          }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155' }}>Songtitel</label>
                              <input
                                type="text"
                                placeholder="z. B. Wonderwall..."
                                value={newSongTitle}
                                onChange={(e) => setNewSongTitle(e.target.value)}
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
                                value={newSongArtist}
                                onChange={(e) => setNewSongArtist(e.target.value)}
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
                              />
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              <button
                                type="button"
                                onClick={() => setShowCreateSongModal(false)}
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
                  background: '#ffffff',
                  boxSizing: 'border-box',
                  width: '100%'
                }}>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('logbook')}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      minHeight: isMobileOrSim ? '46px' : '52px',
                      padding: isMobileOrSim ? '10px 6px' : '13px 10px',
                      borderRadius: '16px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: isMobileOrSim ? '0.80rem' : '0.86rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.28)',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isMobileOrSim ? '5px' : '7px'
                    }}
                    className="hover-scale"
                    title={isMobileOrSim ? 'Deine Meisterwerke' : undefined}
                  >
                    <Award size={isMobileOrSim ? 16 : 17} strokeWidth={2.4} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isMobileOrSim ? 'Meisterwerke' : 'Deine Meisterwerke'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveModalTab('stickeralbum'); setActiveSubView('hub'); }}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      minHeight: isMobileOrSim ? '46px' : '52px',
                      padding: isMobileOrSim ? '10px 6px' : '13px 10px',
                      borderRadius: '16px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: isMobileOrSim ? '0.80rem' : '0.86rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(217, 119, 6, 0.28)',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isMobileOrSim ? '5px' : '7px'
                    }}
                    className="hover-scale"
                    title={isMobileOrSim ? (uiLevel === 'junior' ? 'Sticker-Album' : uiLevel === 'teen' ? 'Badges & Trophäen' : 'Meilensteine') : undefined}
                  >
                    <Star size={isMobileOrSim ? 16 : 17} fill="#fff" />
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
                      minHeight: isMobileOrSim ? '46px' : '52px',
                      padding: isMobileOrSim ? '10px 6px' : '13px 10px',
                      borderRadius: '16px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: isMobileOrSim ? '0.80rem' : '0.86rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.28)',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isMobileOrSim ? '5px' : '7px'
                    }}
                    className="hover-scale"
                    title={isMobileOrSim ? 'Audio-Biografie (Tresor)' : undefined}
                  >
                    <Disc size={isMobileOrSim ? 16 : 17} strokeWidth={2.4} />
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

        {/* COLUMN 3: ✍️ DOKUMENTATION & HAUSAUFGABE (32%) */}
          
          <div style={{
            flex: isMobileView ? 'none' : '1 1 0%',
            width: 'auto',
            maxWidth: 'none',
            margin: '0',
            height: isMobileView ? 'auto' : '100%',
            minHeight: '0',
            maxHeight: isMobileView ? 'none' : '100%',
            padding: useNotebookLayout ? (isMobileView ? '8px 4px calc(140px + env(safe-area-inset-bottom, 20px)) 4px' : '24px 24px 24px 60px') : (isMobileView ? '8px 4px calc(140px + env(safe-area-inset-bottom, 20px)) 4px' : '24px'),
            overflowY: isMobileView ? 'visible' : 'auto',
            display: isMobileView ? (mobileProtokollTab === 'homework' ? 'flex' : 'none') : 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: '20px',
            background: useNotebookLayout ? 'white' : '#f8fafc',
            backgroundImage: useNotebookLayout ? 'repeating-linear-gradient(white, white 27px, #e5e0d4 27px, #e5e0d4 28px)' : 'none',
            borderLeft: useNotebookLayout ? 'none' : '1px solid #e4e4e7',
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
                          const songName = song.topic_name || song.title;
                          if (songName && !otherHWs.some(existing => (existing.topic_name || existing.title) === songName)) {
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
                            {otherHWs.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '1px solid rgba(251, 191, 36, 0.2)', paddingTop: '8px' }}>
                                {otherHWs.map((item, idx) => (
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
                            )}
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
                          <label style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e293b' }}>
                            🔒 Interne Notiz (nur für Lehrer)
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
                    const isCurrentPageStudentFocused = Boolean(activeBookAssigned?.pageStates?.[activePageNumber || -1]?.studentFocus);
                    const isStudentCreated = Boolean(activeBookAssigned?.isStudentCreated || activeBookAssigned?.createdByRole === 'student');
                    const isStudentViewingTeacherBook = Boolean(readOnly && !isStudentCreated);

                    return (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: status === 'MASTERED' ? 'hsl(130, 65%, 82%)' : (isCurrentHomework ? 'hsl(47, 85%, 84%)' : 'hsl(355, 75%, 84%)'),
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
                              <span>🟣</span>
                              <span>{readOnly ? 'Dein Übe-Fokus' : 'Schüler-Übefokus'}</span>
                            </span>
                          )}
                        </div>

                        {/* Right side controls: If student on teacher-assigned book, show focus toggle; otherwise teacher color buttons */}
                        {isStudentViewingTeacherBook ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (activeLehrwerkId && activePageNumber) {
                                toggleStudentFocusPage(activeLehrwerkId, activePageNumber);
                              }
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 12px',
                              borderRadius: '999px',
                              background: isCurrentPageStudentFocused ? '#f5f3ff' : '#ffffff',
                              border: isCurrentPageStudentFocused ? '2px solid #8b5cf6' : '1.5px solid #cbd5e1',
                              color: isCurrentPageStudentFocused ? '#6d28d9' : '#475569',
                              fontWeight: 800,
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              boxShadow: isCurrentPageStudentFocused ? '0 0 10px rgba(139, 92, 246, 0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
                              transition: 'all 0.15s ease'
                            }}
                            className="tactile-btn"
                            title={isCurrentPageStudentFocused ? "Übe-Fokus aufheben" : "Als Übe-Fokus markieren (Max. 3)"}
                          >
                            <span style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: '#8b5cf6',
                              display: 'inline-block'
                            }} />
                            <span>{isCurrentPageStudentFocused ? '🟣 Im Übe-Fokus (Klick zum Entfernen)' : '🟣 Als Übe-Fokus markieren'}</span>
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                            {[
                              { mode: 'LOCKED', color: '#fca5a5', label: 'Rot (keine Hausaufgabe)', getActive: () => status === 'IN_PROGRESS' && !isCurrentHomework, action: () => { setStatus('IN_PROGRESS'); setIsCurrentHomework(false); setHasChanges(true); if (activeLehrwerkId && activePageNumber) triggerDirectSave(activeLehrwerkId, activePageNumber, 'IN_PROGRESS', false); } },
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

                {/* textbook page documentation form */}
                <form onSubmit={(e) => handleSave(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '80px' }}>
                  {/* Teacher View: Homework & Notes Editor */}
                  {!readOnly ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <label style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          📝 Hausaufgabe & Notiz für diese Seite:
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

                      {/* Presets Grid */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                        {[
                          { label: '🎯 Ziel-Tempo', text: '🎯 Ziel-Tempo: Metronom schrittweise auf Ziel-Geschwindigkeit steigern.' },
                          { label: '🐢 Langsam & sauber', text: '🐢 Langsam & sauber: Knifflige Takte isoliert im Schnecken-Tempo üben.' },
                          { label: '🔂 3x fehlerfrei', text: '🔂 3x-Regel: Den Übergang 3 Mal hintereinander fehlerfrei wiederholen.' },
                          { label: '🎵 Dynamik', text: '🎵 Dynamik: Auf präzisen Ausdruck und Laut-Leise-Kontraste achten.' }
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
                            {tpl.label}
                          </button>
                        ))}
                      </div>

                      {/* Display Student Note to Teacher if visible */}
                      {studentNotes && !isStudentNotePrivate && (
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
                            <span>🧑‍🎓 Schüler-Übenotiz / Rückmeldung vom Schüler:</span>
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
                        if (!cleanTeacherNotes) return null;
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
                              <span>👨‍🏫 Hausaufgabe von deiner Lehrkraft:</span>
                            </div>
                            <div style={{ fontSize: '0.94rem', fontWeight: 650, color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: '1.55' }}>
                              {cleanTeacherNotes}
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
                            🧑‍🎓 Meine Übe-Notizen & Fragen an den Lehrer:
                          </label>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <SpeechDictationButton
                              onTranscript={(text) => {
                                setStudentNotes(prev => {
                                  const trimmed = prev.trim();
                                  return trimmed ? `${trimmed}\n${text}` : text;
                                });
                              }}
                              title="Diktieren"
                            />

                            <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '999px', padding: '2px' }}>
                              <button
                                type="button"
                                onClick={() => setIsStudentNotePrivate(false)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '999px',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  border: 'none',
                                  cursor: 'pointer',
                                  background: !isStudentNotePrivate ? '#ffffff' : 'transparent',
                                  color: !isStudentNotePrivate ? '#059669' : '#64748b',
                                  boxShadow: !isStudentNotePrivate ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                👁️ Für Lehrer sichtbar
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsStudentNotePrivate(true)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '999px',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  border: 'none',
                                  cursor: 'pointer',
                                  background: isStudentNotePrivate ? '#ffffff' : 'transparent',
                                  color: isStudentNotePrivate ? '#6366f1' : '#64748b',
                                  boxShadow: isStudentNotePrivate ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                🔒 Privat (Nur für mich)
                              </button>
                            </div>
                          </div>
                        </div>

                        <textarea
                          placeholder={isStudentNotePrivate ? "Trage hier deine privaten Übe-Notizen ein (nur für dich sichtbar)..." : "Schreibe hier Fragen oder Übe-Notizen für deine nächste Unterrichtsstunde..."}
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

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            💡 Schnell-Textbausteine (Antippen zum Hinzufügen / Entfernen):
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {[
                              { 
                                id: 'frage', 
                                label: '❓ Frage im Unterricht', 
                                prefix: '❓ Frage für die nächste Stunde:',
                                getSnippet: () => '❓ Frage für die nächste Stunde: '
                              },
                              { 
                                id: 'takt', 
                                label: '🛑 Takt unklar', 
                                prefix: '🛑 Takt',
                                getSnippet: () => {
                                  const takt = prompt("Welcher Takt ist noch unklar? (z. B. Takt 4)", "Takt 4");
                                  return `🛑 ${takt || 'Takt 4'} bereitet mir noch Schwierigkeiten.`;
                                }
                              },
                              { 
                                id: 'fingersatz', 
                                label: '🖐️ Fingersatz / Haltung', 
                                prefix: '🖐️ Fingersatz',
                                getSnippet: () => '🖐️ Fingersatz & Handhaltung fühlen sich noch ungewohnt an.'
                              },
                              { 
                                id: 'bpm', 
                                label: '🎯 Ziel-BPM erreicht', 
                                prefix: '🎯 Geschafft: Ziel-Tempo auf',
                                getSnippet: () => {
                                  const bpm = prompt("Welches Tempo hast du erreicht? (BPM)", "120");
                                  return `🎯 Geschafft: Ziel-Tempo auf ${bpm || '120'} BPM gesteigert!`;
                                }
                              },
                              { 
                                id: 'metronom', 
                                label: '🥁 Mit Metronom geübt', 
                                prefix: '🥁 Regelmäßig mit Metronom',
                                getSnippet: () => '🥁 Regelmäßig mit Metronom & Begleit-Beat geübt.'
                              },
                              { 
                                id: 'auswendig', 
                                label: '⭐ Auswendig geübt', 
                                prefix: '⭐ Kann den Abschnitt bereits auswendig',
                                getSnippet: () => '⭐ Kann den Abschnitt bereits auswendig spielen.'
                              }
                            ].map((chip) => {
                              const isActive = studentNotes.includes(chip.prefix);
                              return (
                                <button
                                  key={chip.id}
                                  type="button"
                                  onClick={() => {
                                    if (isActive) {
                                      const lines = studentNotes.split('\n').filter(line => !line.includes(chip.prefix));
                                      setStudentNotes(lines.join('\n').trim());
                                    } else {
                                      const snippet = chip.getSnippet();
                                      setStudentNotes(prev => prev ? `${prev.trim()}\n${snippet}` : snippet);
                                    }
                                  }}
                                  style={{
                                    background: isActive ? '#e6f4ea' : '#ffffff',
                                    color: isActive ? '#137333' : '#334155',
                                    border: isActive ? '1.5px solid #34a853' : '1.5px solid #cbd5e1',
                                    padding: '8px 14px',
                                    borderRadius: '12px',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: isActive ? '0 2px 6px rgba(52, 168, 83, 0.2)' : '0 1px 3px rgba(0,0,0,0.04)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s ease'
                                  }}
                                  className="hover-scale"
                                >
                                  {isActive && <span style={{ color: '#34a853', fontWeight: 900 }}>✓</span>}
                                  <span>{chip.label}</span>
                                </button>
                              );
                            })}
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
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>👁️ Live-Vorschau (im Hausaufgaben-Widget des Schülers):</span>
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
                                <span>📄 {formattedPagesStr ? formattedPagesStr : `S. ${activePageNumber}`}</span>
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
                          <span>🔒 Interne Notiz (nur für Lehrer)</span>
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

                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px', paddingBottom: (isMobileView || isInsideSim || isFullscreen) ? '180px' : '48px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        triggerImmediateAutoSave();
                        setActiveSubView('hub');
                        setActiveLehrwerkId(null);
                        setActivePageNumber(null);
                      }}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1',
                        background: 'white', color: '#1e293b', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                      }}
                      className="hover-scale"
                    >
                      <span>← Zurück zur Übersicht</span>
                    </button>
                  </div>
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

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                          {[
                             { mode: 'LOCKED', color: 'hsl(355, 75%, 84%)', label: 'Rot (keine Hausaufgabe)', getActive: () => status === 'IN_PROGRESS' && !isCurrentHomework, action: () => { setStatus('IN_PROGRESS'); setIsCurrentHomework(false); setHasChanges(true); if (selectedActiveSongId) triggerDirectSongSave(selectedActiveSongId, 'IN_PROGRESS', false); } },
                             { mode: 'HOMEWORK', color: 'hsl(47, 85%, 84%)', label: 'Gelb (Hausaufgabe)', getActive: () => status === 'IN_PROGRESS' && isCurrentHomework, action: () => { setStatus('IN_PROGRESS'); setIsCurrentHomework(true); setHasChanges(true); if (selectedActiveSongId) triggerDirectSongSave(selectedActiveSongId, 'IN_PROGRESS', true); } },
                             { mode: 'MASTERED', color: 'hsl(130, 65%, 82%)', label: 'Grün (erledigt)', getActive: () => status === 'MASTERED', action: () => { setStatus('MASTERED'); setIsCurrentHomework(false); setHasChanges(true); if (selectedActiveSongId) triggerDirectSongSave(selectedActiveSongId, 'MASTERED', false); } }
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
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: b.color,
                                  border: isActive ? '3.5px solid #0f172a' : '1px solid rgba(0,0,0,0.15)',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  transform: isActive ? 'scale(1.1)' : 'none',
                                  outline: 'none',
                                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                                }}
                                title={b.label}
                              />
                            );
                          })}
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
                              <span>🔒 Interne Notiz (nur für Lehrer):</span>
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
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: readOnly ? '0px' : '16px' }}>
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
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
                        let pastBridgedQuestion: any = null;

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
                              const cleanTopic = getNormalizedSongTitle(item);
                              const canKey = getCanonicalSongKey(item);
                              if (cleanTopic && !otherHWs.some(existing => getCanonicalSongKey(existing) === canKey || getNormalizedSongTitle(existing) === cleanTopic)) {
                                const cachedNote = localStorage.getItem(`song_note_${student.id}_${item.id}`) ||
                                                   localStorage.getItem(`song_note_${student.id}_${item.song_id}`) ||
                                                   item.homework_notes ||
                                                   item.teacher_notes ||
                                                   '';
                                otherHWs.push({
                                  ...item,
                                  homework_notes: cachedNote
                                });
                              }
                            }
                          });

                          // Also check activeSongSkills with localStorage backup for instant sync
                          (activeSongSkills || []).forEach(skill => {
                            const isHwInLs = localStorage.getItem(`song_hw_${student.id}_${skill.id}`) === 'true' ||
                                             localStorage.getItem(`song_hw_${student.id}_${skill.song_id}`) === 'true' ||
                                             Boolean(skill.is_current_homework);
                            if (isHwInLs) {
                              const cleanTopic = getNormalizedSongTitle(skill);
                              const canKey = getCanonicalSongKey(skill);
                              const alreadyExists = otherHWs.some(existing => 
                                getCanonicalSongKey(existing) === canKey || getNormalizedSongTitle(existing) === cleanTopic
                              );
                              if (!alreadyExists) {
                                const songArtist = skill.songs?.artist || skill.artist || '';
                                const songTitle = skill.songs?.title || skill.title || skill.song_title || 'Song';
                                const songInstrument = skill.instrument ? ` (${skill.instrument})` : '';
                                const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;
                                const cachedNote = localStorage.getItem(`song_note_${student.id}_${skill.id}`) ||
                                                   localStorage.getItem(`song_note_${student.id}_${skill.song_id}`) ||
                                                   skill.homework_notes ||
                                                   skill.teacher_notes ||
                                                   '';
                                otherHWs.push({
                                  id: skill.id,
                                  topic_name: fullTitle,
                                  is_current_homework: true,
                                  status: 'IN_PROGRESS',
                                  homework_notes: cachedNote
                                });
                              }
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
                                url: parts[0]?.trim(),
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

                          // 🌉 SMART VORWOCHEN-FALLBACK & AUDIO/NOTE BRIDGE: Pädagogische Kontinuität (Zero-LocalStorage)
                          // Wenn für die aktuelle Woche noch keine neuen Hausaufgaben eingetragen sind (oder auf Mobile/Cold Cache),
                          // übernehme nahtlos Lehrwerke, Songs, Audioaufnahmen und Notizen der vorherigen Unterrichtsstunde
                          // aus dem jüngsten Wochen-Snapshot.
                          const hasActiveCurrentHomework = (lehrwerkeList.length > 0 || otherHWs.length > 0 || audioNotes.length > 0 || homeworkNoteItems.length > 0);
                          if (isCurrentWeek && (!hasActiveCurrentHomework || audioNotes.length === 0 || homeworkNoteItems.length === 0)) {
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
                                  // 0. Noch offene Schülerfrage aus jüngstem Snapshot übernehmen
                                  const candidatePastQ = parseStudentQuestionFromNotes(parsedPastNotes);
                                  if (candidatePastQ && candidatePastQ.hasQuestion) {
                                    pastBridgedQuestion = candidatePastQ;
                                  }

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
                                          otherHWs = parsedSongs;
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
                                          url: parts[0]?.trim(),
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
                                } else if (typeof parsedPastNotes === 'string') {
                                  try {
                                    const p = JSON.parse(parsedPastNotes);
                                    if (Array.isArray(p)) {
                                      const candidatePastQ = parseStudentQuestionFromNotes(p);
                                      if (candidatePastQ && candidatePastQ.hasQuestion) {
                                        pastBridgedQuestion = candidatePastQ;
                                      }
                                    }
                                  } catch {}
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
                                      url: parts[0]?.trim(),
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
                                      otherHWs = parsedSongs;
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
                              const cleanTopic = getNormalizedSongTitle(item);
                              if (cleanTopic && !otherHWs.some(existing => getNormalizedSongTitle(existing) === cleanTopic)) {
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
                                const cleanTopic = getNormalizedSongTitle(item);
                                const canKey = getCanonicalSongKey(item);
                                if (cleanTopic && !recoveredSongs.some(existing => getCanonicalSongKey(existing) === canKey || getNormalizedSongTitle(existing) === cleanTopic)) {
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
                                const cleanTopic = getNormalizedSongTitle(skill);
                                const canKey = getCanonicalSongKey(skill);
                                if (!recoveredSongs.some(x => getCanonicalSongKey(x) === canKey || getNormalizedSongTitle(x) === cleanTopic)) {
                                  const songArtist = skill.songs?.artist || skill.artist || '';
                                  const songTitle = skill.songs?.title || skill.title || skill.song_title || 'Song';
                                  const songInstrument = skill.instrument ? ` (${skill.instrument})` : '';
                                  const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;
                                  recoveredSongs.push({
                                    id: skill.id,
                                    topic_name: fullTitle,
                                    is_current_homework: true,
                                    status: 'IN_PROGRESS',
                                    homework_notes: skill.homework_notes || ''
                                  });
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

                        const effectiveViewingQuestion = isCurrentWeek 
                          ? (parsedStudentQuestion?.hasQuestion ? parsedStudentQuestion : (pastBridgedQuestion?.hasQuestion ? pastBridgedQuestion : parsedStudentQuestion))
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
                              : { hasQuestion: false, rawEntry: null, text: '', timestamp: null });

                        const isCarriedOverPlan = isCurrentWeek && (isAudioCarriedOver || isNotesCarriedOver || isBooksCarriedOver || isSongsCarriedOver) && !isCarriedOverDismissed;

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* ========================================================================= */}
                            {/* KÖRPER 1: DAS NOTENHEFT (Schüler-Bühne / Das fertige Ergebnis)            */}
                            {/* ========================================================================= */}
                            <div style={{
                              background: '#ffffff',
                              border: '1px solid rgba(0, 0, 0, 0.08)',
                              borderRadius: isMobileView ? '20px' : '24px',
                              padding: isMobileView ? '14px 12px' : '18px 20px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: isMobileView ? '10px' : '14px',
                              boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.04), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
                              maxWidth: '100%',
                              boxSizing: 'border-box',
                              overflow: 'hidden'
                            }}>
                              {/* 1. Responsive Header Bar (Desktop: 1-Line, Mobile: Adaptive Wrap) */}
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              flexWrap: 'nowrap', 
                              gap: isMobileView ? '8px' : '12px',
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
                                flexShrink: 1, 
                                flexWrap: 'nowrap' 
                              }}>
                                <div style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '100px',
                                  padding: '2px 4px',
                                  height: '32px',
                                  boxSizing: 'border-box',
                                  gap: '2px',
                                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                                  flexShrink: 0,
                                  minWidth: 0,
                                  justifyContent: 'flex-start'
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
                                      transition: 'all 0.15s ease'
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
                                      padding: isMobileView ? '0 4px' : '0 6px',
                                      whiteSpace: 'nowrap',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      minWidth: 0,
                                      overflow: 'hidden'
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

                              {/* 🍏 Right: Mobile 3-Dots Popover OR Desktop Action Hub */}
                              {isMobileView ? (
                                <div ref={mobileMoreMenuRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                                  <button
                                    type="button"
                                    onClick={() => setShowMobileMoreMenu(prev => !prev)}
                                    aria-label="Weitere Optionen"
                                    aria-expanded={showMobileMoreMenu}
                                    style={{
                                      background: showMobileMoreMenu ? '#e2e8f0' : '#f8fafc',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: '100px',
                                      width: '32px',
                                      height: '32px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#334155',
                                      cursor: 'pointer',
                                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                                      transition: 'all 0.15s ease'
                                    }}
                                    className="hover-scale-mini"
                                  >
                                    <MoreHorizontal size={16} strokeWidth={2.4} />
                                    {effectiveViewingQuestion?.hasQuestion && (
                                      <span style={{
                                        position: 'absolute',
                                        top: '-2px',
                                        right: '-2px',
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: '#eab308',
                                        border: '1.5px solid #ffffff'
                                      }} />
                                    )}
                                  </button>

                                  {/* Popover Menu */}
                                  {showMobileMoreMenu && (
                                    <div style={{
                                      position: 'absolute',
                                      top: 'calc(100% + 6px)',
                                      right: 0,
                                      zIndex: 100,
                                      background: '#ffffff',
                                      border: '1px solid rgba(0,0,0,0.12)',
                                      borderRadius: '16px',
                                      padding: '6px',
                                      minWidth: '210px',
                                      boxShadow: '0 10px 30px -5px rgba(0,0,0,0.15), 0 4px 10px -2px rgba(0,0,0,0.05)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '2px'
                                    }}>
                                      {/* Vorlesen Action */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowMobileMoreMenu(false);
                                          if (isTtsSpeaking && activeTtsKey === 'global_homework') {
                                            handleStopSpeaking();
                                          } else {
                                            const speechPhrases = buildCompleteWeeklyHomeworkSpeechPhrases(
                                              viewingWeekNum,
                                              lehrwerkeList,
                                              otherHWs.map(s => ({
                                                title: s.topic_name?.replace(/\s*\([^)]*\)\s*$/, '') || '',
                                                note: getCleanPageNotes(s.homework_notes)
                                              })),
                                              audioNotes,
                                              generalHomeworkNotes
                                            );
                                            handleSpeakText(speechPhrases, 'global_homework');
                                          }
                                        }}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '10px',
                                          width: '100%',
                                          padding: '9px 12px',
                                          borderRadius: '10px',
                                          border: 'none',
                                          background: (isTtsSpeaking && activeTtsKey === 'global_homework') ? '#fee2e2' : 'transparent',
                                          color: (isTtsSpeaking && activeTtsKey === 'global_homework') ? '#dc2626' : '#1e293b',
                                          fontSize: '0.84rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          textAlign: 'left'
                                        }}
                                      >
                                        {isTtsSpeaking && activeTtsKey === 'global_homework' ? (
                                          <>
                                            <VolumeX size={15} color="#dc2626" strokeWidth={2.2} />
                                            <span>Vorlesen stoppen</span>
                                          </>
                                        ) : (
                                          <>
                                            <Volume2 size={15} color="#475569" strokeWidth={2.2} />
                                            <span>Wochenplan vorlesen</span>
                                          </>
                                        )}
                                      </button>

                                      {/* E-Mail Senden */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowMobileMoreMenu(false);
                                          handleShareEmail();
                                        }}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '10px',
                                          width: '100%',
                                          padding: '9px 12px',
                                          borderRadius: '10px',
                                          border: 'none',
                                          background: 'transparent',
                                          color: '#1e293b',
                                          fontSize: '0.84rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          textAlign: 'left'
                                        }}
                                      >
                                        <Mail size={15} color="#16a34a" strokeWidth={2.2} />
                                        <span>Per E-Mail senden</span>
                                      </button>

                                      {/* Wochenplan kopieren */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowMobileMoreMenu(false);
                                          handleCopyShareLink();
                                        }}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '10px',
                                          width: '100%',
                                          padding: '9px 12px',
                                          borderRadius: '10px',
                                          border: 'none',
                                          background: isLinkCopied ? '#f0fdf4' : 'transparent',
                                          color: isLinkCopied ? '#16a34a' : '#1e293b',
                                          fontSize: '0.84rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          textAlign: 'left'
                                        }}
                                      >
                                        {isLinkCopied ? (
                                          <>
                                            <Check size={15} color="#16a34a" strokeWidth={2.5} />
                                            <span>Kopiert!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy size={15} color="#475569" strokeWidth={2.2} />
                                            <span>Wochenplan kopieren</span>
                                          </>
                                        )}
                                      </button>

                                      {/* Frage stellen (falls Schüler) */}
                                      {readOnly && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setShowMobileMoreMenu(false);
                                            if (!isQuestionEditorOpen && effectiveViewingQuestion.hasQuestion) {
                                              setQuestionDraftText(effectiveViewingQuestion.text);
                                            }
                                            setIsQuestionEditorOpen(prev => !prev);
                                          }}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: effectiveViewingQuestion.hasQuestion ? '#fef9c3' : 'transparent',
                                            color: effectiveViewingQuestion.hasQuestion ? '#854d0e' : '#1e293b',
                                            fontSize: '0.84rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            textAlign: 'left'
                                          }}
                                        >
                                          <HelpCircle size={15} strokeWidth={2.2} color={effectiveViewingQuestion.hasQuestion ? '#854d0e' : '#64748b'} />
                                          <span>{effectiveViewingQuestion.hasQuestion ? '1 Frage notiert' : 'Frage stellen'}</span>
                                        </button>
                                      )}

                                      {/* Leeren (falls Lehrer und Inhalte vorhanden) */}
                                      {(progressItems.some(item => item.is_current_homework) || generalHomeworkNotes.trim() !== '') && !readOnly && (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            setShowMobileMoreMenu(false);
                                            await handleResetAllCurrentHomework();
                                            setGeneralHomeworkNotes('');
                                          }}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: 'transparent',
                                            color: '#ef4444',
                                            fontSize: '0.84rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            borderTop: '1px solid #f1f5f9'
                                          }}
                                        >
                                          <RotateCcw size={15} color="#ef4444" strokeWidth={2.2} />
                                          <span>Hausaufgaben leeren</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  flexShrink: 0,
                                  width: 'auto',
                                  justifyContent: 'flex-end',
                                  marginLeft: 'auto',
                                  boxSizing: 'border-box'
                                }}>
                                  {/* ❓ 1. Student Question Button / Teacher Live Status Pill */}
                                  {readOnly ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!isQuestionEditorOpen && effectiveViewingQuestion.hasQuestion) {
                                          setQuestionDraftText(effectiveViewingQuestion.text);
                                        }
                                        setIsQuestionEditorOpen(prev => !prev);
                                      }}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '0 12px',
                                        minHeight: '32px',
                                        borderRadius: '100px',
                                        border: effectiveViewingQuestion.hasQuestion ? '1px solid #fde047' : '1px solid #e2e8f0',
                                        background: effectiveViewingQuestion.hasQuestion ? '#fef9c3' : '#f8fafc',
                                        color: effectiveViewingQuestion.hasQuestion ? '#854d0e' : '#475569',
                                        fontSize: '0.80rem',
                                        fontWeight: 750,
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                        transition: 'all 0.15s ease'
                                      }}
                                      className="hover-scale-mini"
                                      title={effectiveViewingQuestion.hasQuestion ? "Deine Frage ansehen oder ändern" : `Frage an ${effectiveTeacherFullName} stellen`}
                                    >
                                      <HelpCircle size={13} strokeWidth={2.4} color={effectiveViewingQuestion.hasQuestion ? '#854d0e' : '#64748b'} />
                                      <span>{effectiveViewingQuestion.hasQuestion ? '1 Frage notiert' : 'Frage stellen'}</span>
                                    </button>
                                  ) : (
                                    <span style={{
                                      fontSize: '0.76rem',
                                      color: '#15803d',
                                      background: '#dcfce7',
                                      border: '1px solid #bbf7d0',
                                      padding: '0 11px',
                                      minHeight: '32px',
                                      borderRadius: '100px',
                                      fontWeight: 800,
                                      letterSpacing: '0.02em',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px'
                                    }}>
                                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
                                      <span>Live-Schülersicht</span>
                                    </span>
                                  )}

                                  {/* 🔊 2. Global TTS Audio Assistant Vorlese-Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isTtsSpeaking && activeTtsKey === 'global_homework') {
                                        handleStopSpeaking();
                                      } else {
                                        const speechPhrases = buildCompleteWeeklyHomeworkSpeechPhrases(
                                          viewingWeekNum,
                                          lehrwerkeList,
                                          otherHWs.map(s => ({
                                            title: s.topic_name?.replace(/\s*\([^)]*\)\s*$/, '') || '',
                                            note: getCleanPageNotes(s.homework_notes)
                                          })),
                                          audioNotes,
                                          generalHomeworkNotes
                                        );
                                        handleSpeakText(speechPhrases, 'global_homework');
                                      }
                                    }}
                                    style={{
                                      background: (isTtsSpeaking && activeTtsKey === 'global_homework') 
                                        ? '#ef4444' 
                                        : '#f8fafc',
                                      border: (isTtsSpeaking && activeTtsKey === 'global_homework') ? '1px solid #dc2626' : '1px solid #e2e8f0',
                                      color: (isTtsSpeaking && activeTtsKey === 'global_homework') ? '#ffffff' : '#0f172a',
                                      borderRadius: '100px',
                                      padding: '0 12px',
                                      minHeight: '32px',
                                      fontSize: '0.80rem',
                                      fontWeight: 750,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      transition: 'all 0.15s ease',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                    }}
                                    className="hover-scale-mini"
                                    title={isTtsSpeaking && activeTtsKey === 'global_homework' ? "Vorlesen stoppen" : "Gesamte Hausaufgabe vorlesen lassen"}
                                  >
                                    {isTtsSpeaking && activeTtsKey === 'global_homework' ? (
                                      <>
                                        <VolumeX size={13} />
                                        <span>Stopp</span>
                                      </>
                                    ) : (
                                      <>
                                        <Volume2 size={13} color="#475569" strokeWidth={2.2} />
                                        <span>Vorlesen</span>
                                      </>
                                    )}
                                  </button>

                                  {/* ✉️ 3. Direct E-Mail Send Button & Quick-Copy Icon Button */}
                                  <div ref={shareMenuRef} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <button
                                      type="button"
                                      onClick={handleShareEmail}
                                      style={{
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        color: '#0f172a',
                                        borderRadius: '100px',
                                        padding: '0 12px',
                                        minHeight: '32px',
                                        fontSize: '0.80rem',
                                        fontWeight: 750,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 0.15s ease',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                      }}
                                      className="hover-scale-mini"
                                      title="Wochenplan per E-Mail versenden"
                                    >
                                      <Mail size={13} color="#16a34a" strokeWidth={2.2} />
                                      <span>Per E-Mail senden</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={handleCopyShareLink}
                                      style={{
                                        background: isLinkCopied ? '#f0fdf4' : '#f8fafc',
                                        border: isLinkCopied ? '1px solid #86efac' : '1px solid #e2e8f0',
                                        color: isLinkCopied ? '#16a34a' : '#475569',
                                        borderRadius: '100px',
                                        padding: '0 9px',
                                        minHeight: '32px',
                                        fontSize: '0.78rem',
                                        fontWeight: 750,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.15s ease',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                      }}
                                      className="hover-scale-mini"
                                      title={isLinkCopied ? 'In Zwischenablage kopiert!' : 'Wochenplan-Text in Zwischenablage kopieren'}
                                    >
                                      {isLinkCopied ? (
                                        <>
                                          <Check size={13} color="#16a34a" strokeWidth={2.5} />
                                          <span style={{ fontSize: '0.74rem' }}>Kopiert!</span>
                                        </>
                                      ) : (
                                        <Copy size={13} color="#475569" strokeWidth={2.2} />
                                      )}
                                    </button>
                                  </div>

                                   {(progressItems.some(item => item.is_current_homework) || generalHomeworkNotes.trim() !== '' || isCarriedOverPlan) && !readOnly && (
                                     <button 
                                       type="button" 
                                       onClick={async () => {
                                         await handleResetAllCurrentHomework();
                                         setGeneralHomeworkNotes('');
                                         setIsCarriedOverDismissed(true);
                                       }}
                                       style={{ 
                                         border: 'none', 
                                         background: 'transparent', 
                                         color: '#94a3b8', 
                                         fontSize: '0.76rem', 
                                         fontWeight: 750, 
                                         cursor: 'pointer', 
                                         padding: '4px 6px',
                                         borderRadius: '6px',
                                         display: 'inline-flex',
                                         alignItems: 'center',
                                         gap: '4px',
                                         transition: 'all 0.15s ease'
                                       }}
                                       className="hover-scale-mini"
                                       title="Hausaufgaben für diese Woche zurücksetzen"
                                     >
                                       <RotateCcw size={11} />
                                       <span>Leeren</span>
                                     </button>
                                   )}
                                </div>
                              )}
                            </div>

                            {/* 1.5 Globaler Übertrag-Statuskopf (Monolith Goldstandard: Gilt für alle Inhalte der Seite) */}
                            {isCarriedOverPlan && (
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                alignSelf: 'flex-start',
                                gap: '6px',
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                color: '#475569',
                                borderRadius: '100px',
                                padding: '3px 12px',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                letterSpacing: '0.01em',
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
                              }}>
                                <RotateCcw size={11} color="#0284c7" strokeWidth={2.5} />
                                <span>Fortlaufender Übeplan • Übertrag aus {carriedOverWeekLabel || 'der Vorwoche'}</span>
                              </div>
                            )}

                            {/* 2. Silent Mode Banner (falls aktiv) */}
                            {isSilentTime && (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.76rem',
                                fontWeight: 650,
                                color: '#64748b',
                                padding: '3px 0',
                                flexShrink: 0
                              }}>
                                <Moon size={12} color="#64748b" />
                                <span>
                                  {readOnly
                                    ? 'Nachtruhe aktiv: Keine störenden Benachrichtigungen bis 07:00 Uhr.'
                                    : 'Silent-Modus aktiv: Der Schüler erhält die Aufgabe morgen ab 07:00 Uhr.'}
                                </span>
                              </div>
                            )}

                            {/* 3. Schülervorschau-Bühne (Master Stage Box: Der gerahmte Wochen-Fahrplan) */}
                            <div style={{
                              minHeight: !hasActiveItems ? 'auto' : (isMobileView ? '100px' : '140px'),
                              background: !hasActiveItems ? 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' : 'linear-gradient(180deg, #fcfdfe 0%, #f8fafc 100%)',
                              border: !hasActiveItems ? '1px solid #e2e8f0' : '1px solid #f1f5f9',
                              borderRadius: !hasActiveItems ? (isMobileView ? '12px' : '14px') : (isMobileView ? '14px' : '18px'),
                              padding: !hasActiveItems ? (isMobileView ? '10px 12px' : '12px 16px') : (isMobileView ? '12px 10px' : '16px 18px'),
                              display: 'flex',
                              flexDirection: 'column',
                              gap: isMobileView ? '8px' : '12px',
                              boxShadow: !hasActiveItems ? '0 1px 3px rgba(0, 0, 0, 0.02)' : 'inset 0 1px 3px rgba(0, 0, 0, 0.02)'
                            }}>
                              {!hasActiveItems ? (
                                <div style={{
                                  display: 'flex',
                                  flexDirection: isMobileView ? 'column' : 'row',
                                  alignItems: isMobileView ? 'flex-start' : 'center',
                                  justifyContent: 'space-between',
                                  gap: isMobileView ? '10px' : '14px',
                                  padding: 0
                                }}>
                                  {/* Left: Subtle Icon + Compact Information */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                    <div style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '9px',
                                      background: '#f8fafc',
                                      border: '1px solid #e2e8f0',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0
                                    }}>
                                      <BookOpen size={15} color="#64748b" strokeWidth={1.8} />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
                                      <span style={{
                                        fontSize: isMobileView ? '0.82rem' : '0.86rem',
                                        color: '#0f172a',
                                        fontWeight: 800,
                                        letterSpacing: '-0.01em',
                                        lineHeight: 1.3
                                      }}>
                                        {isPastWeek
                                          ? (isMobileView ? `Keine Hausaufgaben (${weekRange.dateSpan})` : `Keine Hausaufgaben archiviert (${weekRange.dateSpan})`)
                                          : `Leeres Hausaufgabenheft (${weekRange.dateSpan})`}
                                      </span>
                                      <span style={{
                                        fontSize: isMobileView ? '0.72rem' : '0.75rem',
                                        color: '#64748b',
                                        fontWeight: 500,
                                        lineHeight: 1.35
                                      }}>
                                        {isPastWeek
                                          ? 'Unterrichtsfreie Zeit oder keine Notizen hinterlegt.'
                                          : (hasTransferableHomework
                                            ? 'Aus Vorwoche übernehmen oder neue Aufgaben starten.'
                                            : 'Noch keine Aufgaben für diesen Zeitraum eingetragen.')}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Right: Sleek Action Pills */}
                                  {!isPastWeek && !readOnly && (
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      flexWrap: 'wrap',
                                      flexShrink: 0,
                                      width: isMobileView ? '100%' : 'auto',
                                      justifyContent: isMobileView ? 'flex-start' : 'flex-end'
                                    }}>
                                      {hasTransferableHomework && (
                                        <button
                                          type="button"
                                          onClick={() => setIsTransferModalOpen(true)}
                                          style={{
                                            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                                            color: '#ffffff',
                                            border: 'none',
                                            fontSize: '0.74rem',
                                            fontWeight: 800,
                                            padding: '5px 12px',
                                            borderRadius: '100px',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            boxShadow: '0 2px 6px rgba(22, 163, 74, 0.22)',
                                            transition: 'all 0.15s ease'
                                          }}
                                          className="hover-scale"
                                          title="Hausaufgaben aus der Vorwoche übernehmen, abhaken oder pausieren"
                                        >
                                          <ArrowRightLeft size={12} strokeWidth={2.4} />
                                          <span>Aus Vorwoche übertragen</span>
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveSubView('hub');
                                          setActiveInputTab('free');
                                        }}
                                        style={{
                                          background: '#ffffff',
                                          border: '1px solid #e2e8f0',
                                          color: '#334155',
                                          fontSize: '0.74rem',
                                          fontWeight: 700,
                                          padding: '5px 11px',
                                          borderRadius: '100px',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                          transition: 'all 0.15s ease'
                                        }}
                                        className="hover-scale"
                                      >
                                        <BookOpen size={12} color="#16a34a" />
                                        <span>Lehrwerk aufschlagen</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveSubView('hub');
                                          setActiveInputTab('free');
                                        }}
                                        style={{
                                          background: '#ffffff',
                                          border: '1px solid #e2e8f0',
                                          color: '#334155',
                                          fontSize: '0.74rem',
                                          fontWeight: 700,
                                          padding: '5px 11px',
                                          borderRadius: '100px',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                          transition: 'all 0.15s ease'
                                        }}
                                        className="hover-scale"
                                      >
                                        <Music size={12} color="#4f46e5" />
                                        <span>Song zuweisen</span>
                                      </button>
                                    </div>
                                  )}

                                  {isPastWeek && (
                                    <button
                                      type="button"
                                      onClick={() => setViewingWeekOffset(0)}
                                      style={{
                                        padding: '5px 12px',
                                        borderRadius: '100px',
                                        background: '#0f172a',
                                        color: '#ffffff',
                                        border: 'none',
                                        fontSize: '0.74rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        flexShrink: 0
                                      }}
                                      className="hover-scale"
                                    >
                                      Zurück zur aktuellen Woche
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                                  {/* Stage Header */}
                                  <div style={{
                                    display: 'none',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingBottom: '8px',
                                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                                    gap: '8px',
                                    flexWrap: 'wrap'
                                  }}>
                                    <span style={{
                                      fontSize: '0.84rem',
                                      fontWeight: 850,
                                      color: '#64748b',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.04em',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}>
                                      <BookOpen size={14} color="#64748b" />
                                      <span>Wochen-Fahrplan • {weekRange.label.toUpperCase()}</span>
                                      <span style={{ fontSize: '0.76rem', fontWeight: 650, color: '#94a3b8', textTransform: 'none', letterSpacing: '0' }}>
                                        ({weekRange.dateSpan})
                                      </span>
                                    </span>
                                    {readOnly ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (!isQuestionEditorOpen && effectiveViewingQuestion.hasQuestion) {
                                            setQuestionDraftText(effectiveViewingQuestion.text);
                                          }
                                          setIsQuestionEditorOpen(prev => !prev);
                                        }}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          padding: '5px 12px',
                                          minHeight: '32px',
                                          borderRadius: '100px',
                                          border: effectiveViewingQuestion.hasQuestion ? '1px solid #fde047' : '1px solid #bbf7d0',
                                          background: effectiveViewingQuestion.hasQuestion ? '#fef9c3' : '#f0fdf4',
                                          color: effectiveViewingQuestion.hasQuestion ? '#854d0e' : '#15803d',
                                          fontSize: '0.80rem',
                                          fontWeight: 800,
                                          cursor: 'pointer',
                                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                          transition: 'all 0.15s ease'
                                        }}
                                        className="hover-scale-mini"
                                        title={effectiveViewingQuestion.hasQuestion ? "Deine Frage ansehen oder ändern" : `Frage an ${effectiveTeacherFullName} stellen`}
                                      >
                                        <HelpCircle size={14} strokeWidth={2.4} />
                                        <span>{effectiveViewingQuestion.hasQuestion ? '1 Frage notiert' : 'Frage an Lehrkraft'}</span>
                                      </button>
                                    ) : (
                                      <span style={{
                                        fontSize: '0.78rem',
                                        color: '#15803d',
                                        background: '#dcfce7',
                                        padding: '4px 10px',
                                        borderRadius: '100px',
                                        fontWeight: 850,
                                        letterSpacing: '0.02em'
                                      }}>
                                        Live-Schülersicht
                                      </span>
                                    )}
                                  </div>

                                  {/* 💬 SCHÜLER-FRAGE FÜR DEN UNTERRICHT (KIDS GOLDSTANDARD) */}
                                  {readOnly && isQuestionEditorOpen && (
                                    <div style={{
                                      background: '#ffffff',
                                      border: '1.5px solid #eab308',
                                      borderRadius: '18px',
                                      padding: '14px',
                                      boxShadow: '0 4px 16px rgba(234, 179, 8, 0.12)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '12px'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '10px',
                                            background: '#dcfce7',
                                            color: '#15803d',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                          }}>
                                            <HelpCircle size={17} strokeWidth={2.4} />
                                          </div>
                                          <div>
                                            <span style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a', display: 'block', lineHeight: 1.2 }}>
                                              Frage an {effectiveTeacherFullName}
                                            </span>
                                            <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                                              Deine Lehrkraft sieht deine Frage direkt zu Beginn der nächsten Stunde.
                                            </p>
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => setIsQuestionEditorOpen(false)}
                                          style={{
                                            border: 'none',
                                            background: 'transparent',
                                            color: '#94a3b8',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            display: 'flex',
                                            alignItems: 'center'
                                          }}
                                          title="Schließen"
                                        >
                                          <X size={16} />
                                        </button>
                                      </div>

                                      <textarea
                                        rows={3}
                                        value={questionDraftText}
                                        onChange={(e) => setQuestionDraftText(e.target.value)}
                                        placeholder="z. B. Ich weiß bei Takt 8 nicht, wie ich zählen soll..."
                                        style={{
                                          width: '100%',
                                          boxSizing: 'border-box',
                                          borderRadius: '12px',
                                          border: '1px solid #cbd5e1',
                                          padding: '10px 12px',
                                          fontSize: '16px',
                                          lineHeight: 1.4,
                                          fontFamily: 'inherit',
                                          resize: 'none',
                                          minHeight: '84px',
                                          color: '#1e293b',
                                          background: '#f8fafc',
                                          outline: 'none'
                                        }}
                                      />

                                      {/* 💡 Schnell-Tipp Ideen (vor den Action-Buttons platziert für perfekten UX-Flow) */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                          <Lightbulb size={12} color="#15803d" strokeWidth={2.4} />
                                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                            Schnelle Ideen für deine Frage:
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                          {[
                                            { label: 'Welcher Fingersatz?', icon: Hand, text: 'Welchen Fingersatz soll ich hier spielen?' },
                                            { label: 'Welches Tempo?', icon: Timer, text: 'Welches Tempo soll ich beim Üben einstellen?' },
                                            { label: 'Takt unklar', icon: Music, text: 'Ich verstehe diesen Takt noch nicht ganz.' },
                                            { label: 'Zählen bei Pause', icon: RotateCcw, text: 'Wie zähle ich die Pause richtig mit?' }
                                          ].map(item => {
                                            const IconComp = item.icon;
                                            return (
                                              <button
                                                key={item.label}
                                                type="button"
                                                onClick={() => {
                                                  setQuestionDraftText(prev => {
                                                    const trimmed = prev.trim();
                                                    if (!trimmed) return item.text;
                                                    if (trimmed.includes(item.text)) return prev;
                                                    return `${trimmed} ${item.text}`;
                                                  });
                                                }}
                                                style={{
                                                  background: '#ffffff',
                                                  border: '1px solid #cbd5e1',
                                                  borderRadius: '100px',
                                                  padding: '5px 11px',
                                                  minHeight: '32px',
                                                  fontSize: '0.80rem',
                                                  fontWeight: 750,
                                                  color: '#334155',
                                                  cursor: 'pointer',
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '5px',
                                                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                                  transition: 'all 0.15s ease'
                                                }}
                                                className="hover-scale-mini"
                                              >
                                                <IconComp size={13} strokeWidth={2.2} color="#15803d" />
                                                <span>{item.label}</span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      {/* Action Buttons: Diktat links, Abbrechen & Merken rechts */}
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                                        <SpeechDictationButton
                                          onTranscript={(text) => {
                                            setQuestionDraftText(prev => prev.trim() ? `${prev.trim()} ${text}` : text);
                                          }}
                                          title="Frage einsprechen"
                                          size="md"
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <button
                                            type="button"
                                            onClick={() => setIsQuestionEditorOpen(false)}
                                            style={{
                                              border: 'none',
                                              background: '#f1f5f9',
                                              color: '#475569',
                                              fontSize: '0.82rem',
                                              fontWeight: 800,
                                              padding: '7px 14px',
                                              minHeight: '36px',
                                              borderRadius: '10px',
                                              cursor: 'pointer'
                                            }}
                                            className="hover-scale-mini"
                                          >
                                            Abbrechen
                                          </button>
                                          <button
                                            type="button"
                                            disabled={isSavingQuestion || !questionDraftText.trim()}
                                            onClick={() => handleSaveStudentQuestion(questionDraftText)}
                                            style={{
                                              border: 'none',
                                              background: '#34a853',
                                              color: '#ffffff',
                                              fontSize: '0.84rem',
                                              fontWeight: 800,
                                              padding: '7px 16px',
                                              minHeight: '36px',
                                              borderRadius: '10px',
                                              cursor: (!isSavingQuestion && questionDraftText.trim()) ? 'pointer' : 'not-allowed',
                                              opacity: (!isSavingQuestion && questionDraftText.trim()) ? 1 : 0.5,
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '6px',
                                              boxShadow: '0 2px 6px rgba(52, 168, 83, 0.25)'
                                            }}
                                            className="hover-scale-mini"
                                          >
                                            <Check size={14} strokeWidth={2.4} />
                                            <span>{isSavingQuestion ? 'Speichern...' : 'Frage merken'}</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                   {readOnly && !isQuestionEditorOpen && effectiveViewingQuestion.hasQuestion && (
                                     <div style={{
                                       background: '#fefce8',
                                       border: '1px solid #fef08a',
                                       borderRadius: '14px',
                                       padding: '8px 12px',
                                       boxShadow: '0 2px 6px rgba(234, 179, 8, 0.06)',
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
                                             background: '#fef08a',
                                             border: '1px solid #fde047',
                                             color: '#854d0e',
                                             fontSize: '0.70rem',
                                             fontWeight: 850,
                                             textTransform: 'uppercase',
                                             letterSpacing: '0.03em',
                                             padding: '2px 7px',
                                             borderRadius: '100px',
                                             flexShrink: 0
                                           }}>
                                             <HelpCircle size={12} color="#ca8a04" strokeWidth={2.5} />
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
                                         <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                           <button
                                             type="button"
                                             onClick={() => handleSpeakText(effectiveViewingQuestion.text, 'student_q')}
                                             title="Frage vorlesen"
                                             aria-label="Frage vorlesen"
                                             style={{
                                               border: '1px solid rgba(253, 224, 71, 0.6)',
                                               background: 'rgba(254, 240, 138, 0.7)',
                                               color: '#854d0e',
                                               borderRadius: '7px',
                                               width: '28px',
                                               height: '28px',
                                               padding: 0,
                                               cursor: 'pointer',
                                               display: 'flex',
                                               alignItems: 'center',
                                               justifyContent: 'center',
                                               transition: 'all 0.15s ease'
                                             }}
                                             className="hover-scale-mini"
                                           >
                                             <Volume2 size={14} />
                                           </button>
                                           <button
                                             type="button"
                                             onClick={() => {
                                               setQuestionDraftText(effectiveViewingQuestion.text);
                                               setIsQuestionEditorOpen(true);
                                             }}
                                             title="Frage bearbeiten"
                                             aria-label="Frage bearbeiten"
                                             style={{
                                               border: '1px solid rgba(253, 224, 71, 0.6)',
                                               background: 'rgba(254, 240, 138, 0.7)',
                                               color: '#854d0e',
                                               borderRadius: '7px',
                                               width: '28px',
                                               height: '28px',
                                               padding: 0,
                                               cursor: 'pointer',
                                               display: 'flex',
                                               alignItems: 'center',
                                               justifyContent: 'center',
                                               transition: 'all 0.15s ease'
                                             }}
                                             className="hover-scale-mini"
                                           >
                                             <Edit3 size={14} />
                                           </button>
                                           <button
                                             type="button"
                                             onClick={handleResolveStudentQuestion}
                                             title="Frage löschen oder als erledigt markieren"
                                             aria-label="Frage löschen oder als erledigt markieren"
                                             style={{
                                               border: '1px solid rgba(254, 202, 202, 0.8)',
                                               background: 'rgba(254, 226, 226, 0.7)',
                                               color: '#dc2626',
                                               borderRadius: '7px',
                                               width: '28px',
                                               height: '28px',
                                               padding: 0,
                                               cursor: 'pointer',
                                               display: 'flex',
                                               alignItems: 'center',
                                               justifyContent: 'center',
                                               transition: 'all 0.15s ease'
                                             }}
                                             className="hover-scale-mini"
                                           >
                                             <Trash2 size={14} />
                                           </button>
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
                                  {!readOnly && effectiveViewingQuestion.hasQuestion && (
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
                                          onClick={() => handleSpeakText(effectiveViewingQuestion.text, 'teacher_view_student_q')}
                                          title="Frage vorlesen"
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
                                          onClick={handleResolveStudentQuestion}
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

                                    return (
                                      <div key={`lw-${idx}`} style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        paddingBottom: idx < lehrwerkeList.length - 1 || otherHWs.length > 0 ? '10px' : '0',
                                        borderBottom: idx < lehrwerkeList.length - 1 || otherHWs.length > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none'
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                          <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            minWidth: 0,
                                            flex: 1,
                                            opacity: isFutureWeek ? 0.38 : 1,
                                            transition: 'opacity 0.15s ease'
                                          }}>
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
                                            {isFutureWeek && (
                                              <span style={{
                                                fontSize: '0.68rem',
                                                fontWeight: 800,
                                                color: '#15803d',
                                                background: '#dcfce7',
                                                padding: '2px 7px',
                                                borderRadius: '6px',
                                                letterSpacing: '0.02em',
                                                flexShrink: 0
                                              }}>
                                                Übertrag
                                              </span>
                                            )}
                                          </div>

                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                            {readOnly ? (
                                              /* Kompakte zusammenhängende Seiten-Pille für Schüler (z.B. S. 1–3) */
                                              <span
                                                aria-label={formatPageNumbersGerman(item.pages)}
                                                title={formatPageNumbersGerman(item.pages)}
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
                                                  transition: 'opacity 0.15s ease'
                                                }}
                                              >
                                                {formatPageNumbers(item.pages)}
                                              </span>
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
                                  {otherHWs.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      {otherHWs.map((item, idx) => {
                                        const songNote = getCleanPageNotes(item.homework_notes);
                                        const isSpeakingThisSong = isTtsSpeaking && activeTtsKey === `song_note_${idx}`;
                                        return (
                                          <div key={`song-hw-${idx}`} style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                            paddingBottom: idx < otherHWs.length - 1 ? '10px' : '0',
                                            borderBottom: idx < otherHWs.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none'
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
                                                  width: '26px',
                                                  height: '26px',
                                                  borderRadius: '8px',
                                                  background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  color: '#4338ca',
                                                  flexShrink: 0
                                                }}>
                                                  <Music size={13} strokeWidth={2.4} />
                                                </div>
                                                <span style={{
                                                  fontSize: '0.96rem',
                                                  fontWeight: 850,
                                                  color: '#0f172a',
                                                  overflow: 'hidden',
                                                  textOverflow: 'ellipsis',
                                                  whiteSpace: 'nowrap'
                                                }}>
                                                  {item.topic_name.replace(/\s*\([^)]*\)\s*$/, '')}
                                                </span>
                                                {isFutureWeek && (
                                                  <span style={{
                                                    fontSize: '0.68rem',
                                                    fontWeight: 800,
                                                    color: '#15803d',
                                                    background: '#dcfce7',
                                                    padding: '2px 7px',
                                                    borderRadius: '6px',
                                                    letterSpacing: '0.02em',
                                                    flexShrink: 0
                                                  }}>
                                                    Übertrag
                                                  </span>
                                                )}
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
                                  )}

                                  {/* Audio Badges in Live Preview */}
                                  {audioNotes.length > 0 && (
                                    <div style={{ paddingTop: '2px' }}>
                                      <AudioTrackCarousel
                                        tracks={audioNotes}
                                        onDelete={!readOnly && !isAudioCarriedOver ? handleDeleteNote : undefined}
                                        readOnly={readOnly || isAudioCarriedOver}
                                        isFutureWeek={isFutureWeek}
                                        isTeacher={true}
                                        activeTopicContext={topicName}
                                        defaultExpanded={readOnly}
                                        isCarriedOver={isAudioCarriedOver}
                                        hideCarriedOverBadge={true}
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
                                                  {cleanNoteText}
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
                            {/* KÖRPER 2: DAS PLAY-ALONG STUDIO (Akustik-Werkzeugbank)                    */}
                            {/* ========================================================================= */}
                            {!readOnly && (
                              <div style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '18px',
                                padding: '14px 18px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '7px',
                                      background: '#e6f4ea',
                                      color: '#16a34a',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0
                                    }}>
                                      <Mic size={13} strokeWidth={2.4} />
                                    </div>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 850, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                      Play-Along & Audio-Aufnahme
                                    </span>
                                  </div>
                                  <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 650 }}>
                                    {hasTresorStorage ? 'Tresor aktiv (bis 7 Min.)' : 'Direktaufnahme (bis 60s)'}
                                  </span>
                                </div>

                                {/* 🎙️ Didaktisches Hörbeispiel & 1:1-Übungs-Track (§ 60a Abs. 1 UrhG & § 15 Abs. 3 UrhG) */}
                                <div style={{
                                  fontSize: '0.67rem',
                                  color: '#64748b',
                                  background: '#ffffff',
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid #e2e8f0',
                                  lineHeight: '1.35',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  <span style={{ fontSize: '0.75rem' }}>🎙️</span>
                                  <span><strong>Didaktisches Hörbeispiel & Übungs-Track:</strong> Diese Aufnahme dient ausschließlich dem persönlichen 1:1-Übungsgebrauch dieses Schülers. Eine öffentliche Verbreitung oder Weitergabe im Internet ist unzulässig.</span>
                                </div>

                                {/* 🛡️ Eltern-Veto Schranke & Exkulpations-Banner (§ 201 StGB / Art. 8 DSGVO) */}
                                {isTeacherTools && isStudentAudioForbiddenForTeacher && (
                                  <div style={{
                                    background: '#fffbeb',
                                    border: '1.5px solid #fef3c7',
                                    borderRadius: '12px',
                                    padding: '10px 14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    flexWrap: 'wrap'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
                                      <span style={{ fontSize: '1rem' }}>⚠️</span>
                                      <div style={{ fontSize: '0.72rem', color: '#92400e', lineHeight: 1.35 }}>
                                        <strong>Eltern-Veto aktiv:</strong> Erziehungsberechtigte untersagen Tonaufnahmen des Schülers. Bitte <strong>ausschließlich eigenes Lehrkraft-Vorspiel</strong> aufnehmen (§ 201 StGB)!
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
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        cursor: teacherConsentRequested ? 'default' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                        flexShrink: 0
                                      }}
                                      className={teacherConsentRequested ? '' : 'hover-scale'}
                                    >
                                      <Mail size={12} />
                                      <span>{teacherConsentRequested ? '✓ Anfrage gesendet' : 'Eltern-Freigabe anfragen'}</span>
                                    </button>
                                  </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  {playAlongCountInRemaining !== null ? (
                                    <button
                                      type="button"
                                      onClick={cancelPlayAlongCountIn}
                                      style={{
                                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                        color: '#ffffff',
                                        border: 'none',
                                        padding: '8px 16px',
                                        minHeight: '38px',
                                        borderRadius: '100px',
                                        fontSize: '0.80rem',
                                        fontWeight: 900,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 0 12px rgba(245, 158, 11, 0.4)',
                                        flexShrink: 0
                                      }}
                                      title="Einzähler abbrechen"
                                    >
                                      <Timer size={14} />
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
                                        padding: '8px 16px',
                                        minHeight: '38px',
                                        borderRadius: '100px',
                                        fontSize: '0.80rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                                        flexShrink: 0
                                      }}
                                      className="hover-scale"
                                    >
                                      <Mic size={14} color="#22c55e" strokeWidth={2.4} style={{ filter: 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.35))' }} />
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
                                        padding: '8px 16px',
                                        minHeight: '38px',
                                        borderRadius: '100px',
                                        fontSize: '0.80rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 0 12px rgba(239, 68, 68, 0.4)',
                                        flexShrink: 0
                                      }}
                                    >
                                      <Square size={13} fill="#ffffff" />
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
                                          padding: '0 11px',
                                          height: '38px',
                                          borderRadius: '100px',
                                          fontSize: '0.74rem',
                                          fontWeight: 800,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                          flexShrink: 0,
                                          transition: 'all 0.15s ease'
                                        }}
                                        title={isCountInEnabled ? 'Einzählen aktiv (4 Klicks vor Start)' : 'Einzählen vor Aufnahme aktivieren'}
                                      >
                                        <Timer size={13} strokeWidth={isCountInEnabled ? 2.5 : 2} />
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
                                            padding: '0 11px',
                                            height: '38px',
                                            borderRadius: '100px',
                                            fontSize: '0.74rem',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            boxShadow: isRecordingMetronomeActive ? '0 2px 6px rgba(22, 163, 74, 0.15)' : 'none',
                                            transition: 'all 0.15s ease'
                                          }}
                                          title="Klick & Tempo (BPM) einstellen"
                                        >
                                          <MechanicalMetronomeIcon size={14} color={isRecordingMetronomeActive ? '#15803d' : '#64748b'} strokeWidth={isRecordingMetronomeActive ? 2.5 : 2} />
                                          <span>{recordingBpm} BPM</span>
                                          <ChevronDown size={12} strokeWidth={2.5} style={{ transform: showPlayAlongMetronomePopup ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
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
                                      fontSize: '0.78rem',
                                      color: '#d97706',
                                      fontWeight: 750,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      paddingLeft: '4px'
                                    }}>
                                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', animation: 'pulse 0.5s infinite' }} />
                                      <span>Einzähler läuft ({recordingBpm} BPM)... Aufnahme startet bei 1.</span>
                                    </div>
                                  ) : !isRecordingAudio ? (
                                    <input
                                      type="text"
                                      placeholder="Titel der Begleitspur (optional, z. B. Play-Along Tempo 70)..."
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
                                        minWidth: '130px',
                                        fontSize: '0.82rem',
                                        padding: '8px 12px',
                                        minHeight: '38px',
                                        borderRadius: '10px',
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
                                      fontSize: '0.78rem',
                                      color: '#dc2626',
                                      fontWeight: 750,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      paddingLeft: '4px'
                                    }}>
                                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
                                      <span>Audioaufnahme läuft... {isRecordingMetronomeActive ? `(Klick: ${recordingBpm} BPM)` : 'Sprich oder spiele dein Instrument.'}</span>
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

                              const getViewingNotesForCurrentOffset = (): string => {
                                if (viewingWeekOffset === 0) {
                                  return generalHomeworkNotes;
                                }
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
                              };

                              const activeViewingStudentNotes = getViewingNotesForCurrentOffset();

                              return (
                                <div style={{
                                  background: activeNoteTarget === 'student' ? '#ffffff' : '#fffbeb',
                                  border: activeNoteTarget === 'student' ? '1px solid #e2e8f0' : '1.5px solid #fcd34d',
                                  borderRadius: '20px',
                                  boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  transition: 'all 0.2s ease'
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
                                    {/* Apple Segmented Switcher */}
                                    <div style={{
                                      display: 'flex',
                                      background: '#f1f5f9',
                                      border: '1px solid #e2e8f0',
                                      padding: '3px',
                                      borderRadius: '10px',
                                      gap: '3px'
                                    }}>
                                      <button
                                        type="button"
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
                                          boxShadow: activeNoteTarget === 'student' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
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
                                          boxShadow: activeNoteTarget === 'teacher' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
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
                                            const specialNotes = (homeworkNotesList || []).filter(n => typeof n === 'string' && isInternalMetadataNote(n));
                                            const noteLines = val.split('\n').map(s => s.trim()).filter(s => s.length > 0 && !isInternalMetadataNote(s));
                                            const combined = [...specialNotes, ...noteLines];
                                            setHomeworkNotesList(combined);
                                            try { localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(combined)); } catch {}
                                            triggerDebouncedAutoSave(350);
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
                                          display: 'block'
                                        }}
                                      />
                                    ) : (
                                      <textarea
                                        ref={teacherNotesTextareaRef}
                                        placeholder="Vertrauliche Notizen zum Schüler (nur für dich sichtbar)..."
                                        value={teacherNotes}
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
                                          display: 'block'
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
                                      overflowX: 'auto'
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
                  <div style={{ paddingBottom: (isMobileView || isInsideSim || isFullscreen) ? '24px' : '8px' }} />
                </form>
              </>
            )}
          </div>

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
                            practice: 'Übe-Begleiter',
                            recordings: 'Aufnahmen',
                            groovetrainer: 'Groove-Trainer',
                            tuner: 'Stimmgerät',
                            loopstation: 'Loopstation',
                            earlab: uiLevel === 'junior' ? 'Klang-Detektiv' : 'EarLab & Harmony',
                            skillradar: uiLevel === 'junior' ? 'Musik-Stern ⭐' : uiLevel === 'pro' ? 'Kompetenz-Radar' : 'Skill-Radar',
                            protocol: 'Protokoll',
                            archive: 'Archiv'
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
