import React from 'react';
import { StudentBriefingTabProps } from './StudentBriefingTab';
import { DEFAULT_FOKUS_LEVELS } from '../../../utils/studentProgressEngine';

export interface BuildStudentBriefingParams {
  studentId: string;
  profile: any;
  practice: any;
  streaks: any;
  parent: any;
  schedule: any;
  feed: any;
  assignedCampusSongs: any[];
  activeSongSkills: any[];
  lehrwerke: any[];
  localProgress: any;
  progressItems: any[];
  homeworkBookTab?: any;
  homeworkBookViewMode?: any;
  selectedLehrwerkForDetail?: any;
  selectedSongForDetail?: any;
  selectedTopic?: any;
  setCertificateSong?: (s: any) => void;
  setContributionsModalData?: (d: any) => void;
  setHomeworkBookTab?: (t: any) => void;
  setHomeworkBookViewMode?: (m: any) => void;
  setJuniorSelectedPreviewSticker?: (st: any) => void;
  setSelectedLehrwerkForDetail?: (b: any) => void;
  setSelectedSongForDetail?: (s: any) => void;
  setSelectedTopic?: (t: any) => void;
  setShowJuniorPreFlightModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowJuniorStickerModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowRulesModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowStudentToolbox: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPushSoftPrompt: React.Dispatch<React.SetStateAction<boolean>>;
  handleOpenHomeworkBookWithView: (...args: any[]) => void;
}

export function buildStudentBriefingProps(params: BuildStudentBriefingParams): StudentBriefingTabProps {
  const {
    studentId,
    profile,
    practice,
    streaks,
    parent,
    schedule,
    feed,
    assignedCampusSongs,
    activeSongSkills,
    lehrwerke,
    localProgress,
    progressItems,
    setShowJuniorPreFlightModal,
    setShowJuniorStickerModal,
    setShowRulesModal,
    setShowStudentToolbox,
    setShowPushSoftPrompt,
    handleOpenHomeworkBookWithView
  } = params;

  return {
    studentId,
    DEFAULT_FOKUS_LEVELS,
    activeSongSkills,
    activeTab: profile.activeTab,
    activeTtsKey: feed.activeTtsKey,
    avatar: streaks.avatar,
    briefingData: schedule.briefingData,
    campusFeedAnnouncements: feed.campusFeedAnnouncements,
    cancelJuniorRecording: practice.cancelJuniorRecording,
    checkIsParentUnlockedGlobal: parent.checkIsParentUnlockedGlobal,
    checkOccurrenceHasMessages: () => false,
    circleRadius: streaks.circleRadius,
    classFeedInteractions: feed.classFeedInteractions,
    classFeedPosts: feed.classFeedPosts,
    classGoals: [],
    classWeeklyMins: 0,
    currentPlatform: profile.currentPlatform,
    currentXp: streaks.currentXp,
    downloadJuniorRecording: practice.downloadJuniorRecording,
    draftAllowTts: feed.draftAllowTts,
    effectiveLevel: streaks.currentLevel,
    effectivePracticeMinutes: Math.floor(practice.secondsElapsed / 60),
    feedInteractions: feed.feedInteractions,
    finishPracticeSession: practice.finishPracticeSession,
    flamesActive: streaks.flamesActive,
    fokusLogs: practice.fokusLogs,
    getDeterministicWeekMetrics: streaks.getDeterministicWeekMetrics,
    getExactLogSeconds: (log: any) => log.duration_seconds || (log.duration_minutes || 0) * 60,
    getJuniorWeeklyHomeworkSummary: () => ({
      formattedJuniorBooks: [],
      otherActiveSongs: [],
      audioTracks: [],
      generalNote: null,
      studentQuestionText: null,
      hasAnyHomework: false
    }),
    getOccRoomName: (occ: any) => occ?.room_name || occ?.room || 'Musikraum',
    getOccurrenceUnreadCount: () => 0,
    getTargetMinutes: streaks.getTargetMinutes,
    graceSecondsLeft: practice.graceSecondsLeft,
    handleAcknowledgeCancellation: schedule.handleAcknowledgeCancellation,
    handleOpenContributions: () => {},
    handleOpenHomeworkBookWithView,
    handleReactToPost: feed.handleReactToPost,
    handleRejectReschedule: schedule.handleRejectReschedule,
    handleSpeakText: feed.handleSpeakText,
    handleStopSpeaking: feed.handleStopSpeaking,
    handleSubmitClassFeedInteraction: feed.handleSubmitClassFeedInteraction,
    handleTabChangeLocal: profile.handleTabChangeLocal,
    handleToggleRightSidebar: profile.handleToggleRightSidebar,
    handleTriggerCancelOccurrence: (occ: any) => schedule.handleCancelOccurrence(occ),
    handleTriggerConfirmReschedule: (occId: any) => schedule.handleConfirmReschedule(occId),
    handleTriggerUndoCancelOccurrence: (occ: any) => schedule.handleUndoCancelOccurrence(occ),
    isExtraTime: practice.isExtraTime || false,
    isGraceActive: practice.isGraceActive || false,
    isMobile: profile.isMobile,
    isMusicStandMode: profile.isMusicStandMode,
    isRightSidebarCollapsed: profile.isRightSidebarCollapsed,
    isStudentAbsenceAllowed: true,
    isStudentRescheduleAllowed: true,
    isTodayHoliday: schedule.isTodayHoliday || false,
    isTtsSpeaking: feed.isTtsSpeaking,
    juniorActivePlayingAudioId: practice.juniorActivePlayingAudioId || null,
    juniorAudioPlayerRef: practice.juniorAudioPlayerRef,
    juniorCountdown: practice.juniorCountdown ?? null,
    juniorIsRecording: practice.juniorIsRecording,
    juniorIsSaving: practice.juniorIsSaving || false,
    juniorPreviewAudioRef: practice.juniorPreviewAudioRef,
    juniorPreviewCurrentTime: practice.juniorPreviewCurrentTime || 0,
    juniorPreviewDuration: practice.juniorPreviewDuration || 0,
    juniorPreviewPlaying: practice.juniorPreviewPlaying || false,
    juniorRecordDuration: practice.juniorRecordDuration || 0,
    juniorRecordTitle: practice.juniorRecordTitle || '',
    juniorRecordedUrl: practice.juniorRecordedUrl || null,
    juniorRecordedBlob: practice.juniorRecordedBlob || null,
    juniorTeacherRecordings: practice.juniorTeacherRecordings || [],
    lehrwerke,
    localProgress,
    progressItems,
    saveJuniorRecording: practice.saveJuniorRecording,
    scheduleOccurrences: schedule.scheduleOccurrences,
    schoolFokusLevels: streaks.schoolFokusLevels || {},
    schoolYearOccurrences: schedule.schoolYearOccurrences || [],
    secondsElapsed: practice.secondsElapsed,
    secondsToDisplayMinutes: practice.secondsToDisplayMinutes || ((s: number) => Math.floor(s / 60)),
    sessionActive: practice.sessionActive,
    setActiveTab: profile.setActiveTab,
    setAppointmentChatData: schedule.setAppointmentChatData,
    setIsPhoneFlat: practice.setIsPhoneFlat || (() => {}),
    setJuniorActivePlayingAudioId: practice.setJuniorActivePlayingAudioId || (() => {}),
    setJuniorMissionPhase: practice.setJuniorMissionPhase || (() => {}),
    setJuniorPreviewCurrentTime: practice.setJuniorPreviewCurrentTime || (() => {}),
    setJuniorRecordTitle: practice.setJuniorRecordTitle || (() => {}),
    setSessionActive: practice.setSessionActive,
    setShowAppointmentChat: schedule.setShowAppointmentChat,
    setShowJuniorHomeworkModal: () => {},
    setShowJuniorPreFlightModal,
    setShowJuniorRecordingsModal: () => {},
    setShowJuniorStickerModal,
    setShowJuniorTimerModal: () => {},
    setShowRulesModal,
    setShowStudentToolbox,
    setStudentFeedTab: () => {},
    showJuniorHomeworkModal: false,
    showJuniorRecordModal: practice.showJuniorRecordModal,
    showJuniorRecordingsModal: false,
    showJuniorTimerModal: false,
    isJuniorPadActive: false,
    setIsJuniorPadActive: () => {},
    songStats: { masteredCount: 0 },
    songs: assignedCampusSongs,
    assignedCampusSongs,
    startJuniorRecordingFlow: practice.startJuniorRecordingFlow,
    stopJuniorRecording: practice.stopJuniorRecording,
    strokeDashoffset: streaks.strokeDashoffset,
    studentFeedTab: 'feed',
    studentInstrumentName: profile.studentUser?.instrument || 'Instrument',
    studentUiLevel: profile.studentUiLevel,
    studentUser: profile.studentUser,
    togglePlayJuniorPreview: () => {},
    togglePlayJuniorRecording: () => {},
    totalUnreadDirectMessages: 0,
    unifiedStickersMap: {},
    unreadClassFeedCount: 0,
    xpActive: true,
    pushEnabled: false,
    setShowPushSoftPrompt,
    onOpenRescheduleBottomSheet: (occ: any) => {
      schedule.setActiveRescheduleBottomSheetOcc(occ);
      schedule.setIsRescheduleSheetOpen(true);
    },
    isOfflineScheduleActive: schedule.isOfflineScheduleActive,
    carrierGhostingDetected: schedule.carrierGhostingDetected,
    onRefreshConnection: () => {
      schedule.fetchSchedule();
    }
  };
}
