import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import {
  Award, Lock, HelpCircle, Trophy, Sparkles, Star, Rocket, ChevronLeft, ChevronRight,
  Clock, Timer, Flame, BookOpen, Play, Pause, Square, RotateCcw, Volume2, VolumeX, X,
  Zap, Music, School, Calendar, CalendarX, Check, Target, MessageSquare, Pencil, User,
  Phone, Users, Shield, Palmtree, Settings, FileText, ThumbsUp, Heart, AlertTriangle,
  Mic, Disc, Download, Key, Headphones, Sliders, Bell
} from 'lucide-react';
import { ALL_STICKERS } from '../../../domain/stickersAndTresor';
import { UpdateAnnouncementHero } from '../../common/UpdateAnnouncementHero';
import { AudioTrackCarousel, AudioTrackItem } from '../../AudioTrackCarousel';
import { DEFAULT_FOKUS_LEVELS } from '../../../utils/studentProgressEngine';
import { buildContinuousHomeworkNarrative } from '../../../services/neuralTtsService';
import { Avatar, getInstrumentAvatarUrl, resolveCampusStudentAvatar } from '../studentAvatars.constants';
import { getSimulatedNow, toLocalYYYYMMDD, getISOWeekRaw, getISOWeek, getItemWeek, getLehrwerkColor } from '../studentDateUtils';

export interface StudentBriefingTabProps {
  studentId: string;
  DEFAULT_FOKUS_LEVELS: any;
  activeSongSkills: any;
  activeTab: string;
  activeTtsKey: string | null;
  avatar?: any;
  briefingData: any;
  campusFeedAnnouncements: any[];
  cancelJuniorRecording: () => void;
  checkIsParentUnlockedGlobal: () => boolean;
  checkOccurrenceHasMessages: (occ: any, dateStr?: string) => boolean;
  circleRadius: number;
  classFeedInteractions: any[];
  classFeedPosts: any[];
  classGoals: any[];
  classWeeklyMins: number;
  currentPlatform: string;
  currentXp: number;
  downloadJuniorRecording: (rec?: any) => void;
  draftAllowTts: boolean | null;
  effectiveLevel: number | string;
  effectivePracticeMinutes: number;
  feedInteractions: any[];
  finishPracticeSession: () => void;
  flamesActive: boolean;
  fokusLogs: any[];
  getDeterministicWeekMetrics: (dateStr?: string) => { weekDays: any[]; [key: string]: any };
  getExactLogSeconds: (item: any) => number;
  getJuniorWeeklyHomeworkSummary: () => { formattedJuniorBooks: any[]; otherActiveSongs: any[]; audioTracks: any[]; generalNote: any; studentQuestionText: any; hasAnyHomework: boolean };
  getOccRoomName: (occ: any) => string;
  getOccurrenceUnreadCount: (occ: any, dateStr?: string) => number;
  getTargetMinutes: (item: any) => number;
  graceSecondsLeft: number;
  handleAcknowledgeCancellation: (occ: any) => Promise<void>;
  handleOpenContributions: (...args: any[]) => void;
  handleOpenHomeworkBookWithView: (...args: any[]) => void;
  handleReactToPost: (postId: string, reactionType: string) => Promise<void>;
  handleRejectReschedule: (occ: any) => Promise<void>;
  handleSpeakText: (text: string, key?: string) => void;
  handleStopSpeaking: () => void;
  handleSubmitClassFeedInteraction: (...args: any[]) => Promise<void>;
  handleTabChangeLocal: (tab: string) => void;
  handleToggleRightSidebar: (collapsed: boolean) => any;
  handleTriggerCancelOccurrence: (...args: any[]) => void;
  handleTriggerConfirmReschedule: (...args: any[]) => void;
  handleTriggerUndoCancelOccurrence: (...args: any[]) => void;
  isExtraTime: boolean;
  isGraceActive: boolean;
  isMobile: boolean;
  isMusicStandMode: boolean;
  isRightSidebarCollapsed: boolean;
  isStudentAbsenceAllowed: boolean;
  isStudentRescheduleAllowed: boolean;
  isTodayHoliday: any;
  isTtsSpeaking: boolean;
  juniorActivePlayingAudioId: string | null;
  juniorAudioPlayerRef: React.MutableRefObject<any>;
  juniorCountdown: number | null;
  juniorIsRecording: boolean;
  juniorIsSaving: boolean;
  juniorPreviewAudioRef: React.MutableRefObject<any>;
  juniorPreviewCurrentTime: number;
  juniorPreviewDuration: number;
  juniorPreviewPlaying: boolean;
  juniorRecordDuration: number;
  juniorRecordTitle: string;
  juniorRecordedUrl: string | null;
  juniorTeacherRecordings: any[];
  lehrwerke: any[];
  localProgress: any;
  progressItems: any[];
  saveJuniorRecording: (...args: any[]) => void;
  scheduleOccurrences: any[];
  schoolFokusLevels: any;
  schoolYearOccurrences: any[];
  secondsElapsed: number;
  secondsToDisplayMinutes: (seconds: number) => number;
  sessionActive: boolean;
  setActiveTab: (tab: string) => void;
  setAppointmentChatData: (data: any) => void;
  setIsPhoneFlat: React.Dispatch<React.SetStateAction<boolean>>;
  setJuniorActivePlayingAudioId: React.Dispatch<React.SetStateAction<string | null>>;
  setJuniorMissionPhase: (phase: any) => void;
  setJuniorPreviewCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  setJuniorRecordTitle: React.Dispatch<React.SetStateAction<string>>;
  setSessionActive: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAppointmentChat: React.Dispatch<React.SetStateAction<boolean>>;
  setShowJuniorHomeworkModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowJuniorPreFlightModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowJuniorRecordingsModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowJuniorStickerModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowJuniorTimerModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowRulesModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowStudentToolbox: React.Dispatch<React.SetStateAction<boolean>>;
  setStudentFeedTab: (tab: any) => void;
  showJuniorHomeworkModal: boolean;
  showJuniorRecordModal: boolean;
  showJuniorRecordingsModal: boolean;
  showJuniorTimerModal: boolean;
  songStats: any;
  songs: any[];
  startJuniorRecordingFlow: () => void;
  stopJuniorRecording: (...args: any[]) => void;
  strokeDashoffset: number;
  studentFeedTab: any;
  studentInstrumentName: string;
  studentUiLevel?: string;
  studentUser: any;
  togglePlayJuniorPreview: () => void;
  togglePlayJuniorRecording: (...args: any[]) => void;
  totalUnreadDirectMessages: number;
  unifiedStickersMap: any;
  unreadClassFeedCount: number;
  xpActive: boolean;
  pushEnabled?: boolean;
  setShowPushSoftPrompt?: (val: boolean) => void;
  onOpenRescheduleBottomSheet?: (occ: any) => void;
}

export function StudentBriefingTab(props: StudentBriefingTabProps) {
  const {
    studentId,
    onOpenRescheduleBottomSheet,
    DEFAULT_FOKUS_LEVELS,
    activeSongSkills,
    activeTab,
    activeTtsKey,
    avatar,
    briefingData,
    campusFeedAnnouncements,
    cancelJuniorRecording,
    checkIsParentUnlockedGlobal,
    checkOccurrenceHasMessages,
    circleRadius,
    classFeedInteractions,
    classFeedPosts,
    classGoals,
    classWeeklyMins,
    currentPlatform,
    currentXp,
    downloadJuniorRecording,
    draftAllowTts,
    effectiveLevel,
    effectivePracticeMinutes,
    feedInteractions,
    finishPracticeSession,
    flamesActive,
    fokusLogs,
    getDeterministicWeekMetrics,
    getExactLogSeconds,
    getJuniorWeeklyHomeworkSummary,
    getOccRoomName,
    getOccurrenceUnreadCount,
    getTargetMinutes,
    graceSecondsLeft,
    handleAcknowledgeCancellation,
    handleOpenContributions,
    handleOpenHomeworkBookWithView,
    handleReactToPost,
    handleRejectReschedule,
    handleSpeakText,
    handleStopSpeaking,
    handleSubmitClassFeedInteraction,
    handleTabChangeLocal,
    handleToggleRightSidebar,
    handleTriggerCancelOccurrence,
    handleTriggerConfirmReschedule,
    handleTriggerUndoCancelOccurrence,
    isExtraTime,
    isGraceActive,
    isMobile,
    isMusicStandMode,
    isRightSidebarCollapsed,
    isStudentAbsenceAllowed,
    isStudentRescheduleAllowed,
    isTodayHoliday,
    isTtsSpeaking,
    juniorActivePlayingAudioId,
    juniorAudioPlayerRef,
    juniorCountdown,
    juniorIsRecording,
    juniorIsSaving,
    juniorPreviewAudioRef,
    juniorPreviewCurrentTime,
    juniorPreviewDuration,
    juniorPreviewPlaying,
    juniorRecordDuration,
    juniorRecordTitle,
    juniorRecordedUrl,
    juniorTeacherRecordings,
    lehrwerke,
    localProgress,
    progressItems,
    saveJuniorRecording,
    scheduleOccurrences,
    schoolFokusLevels,
    schoolYearOccurrences,
    secondsElapsed,
    secondsToDisplayMinutes,
    sessionActive,
    setActiveTab,
    setAppointmentChatData,
    setIsPhoneFlat,
    setJuniorActivePlayingAudioId,
    setJuniorMissionPhase,
    setJuniorPreviewCurrentTime,
    setJuniorRecordTitle,
    setSessionActive,
    setShowAppointmentChat,
    setShowJuniorHomeworkModal,
    setShowJuniorPreFlightModal,
    setShowJuniorRecordingsModal,
    setShowJuniorStickerModal,
    setShowJuniorTimerModal,
    setShowRulesModal,
    setShowStudentToolbox,
    setStudentFeedTab,
    showJuniorHomeworkModal,
    showJuniorRecordModal,
    showJuniorRecordingsModal,
    showJuniorTimerModal,
    songStats,
    songs,
    startJuniorRecordingFlow,
    stopJuniorRecording,
    strokeDashoffset,
    studentFeedTab,
    studentInstrumentName,
    studentUiLevel,
    studentUser,
    togglePlayJuniorPreview,
    togglePlayJuniorRecording,
    totalUnreadDirectMessages,
    unifiedStickersMap,
    unreadClassFeedCount,
    xpActive,
    pushEnabled,
    setShowPushSoftPrompt
  } = props;

  const activeWeeklyFocusKey = useMemo(() => {
    let focusKey: string | null = null;
    try {
      if (studentUser?.skill_radar_levels?.weekly_focus && studentUser.skill_radar_levels.weekly_focus !== 'ausgeglichen') {
        focusKey = studentUser.skill_radar_levels.weekly_focus;
      } else {
        const saved = localStorage.getItem(`groovelab_skill_overrides_${props.studentId || studentUser?.id || 'default'}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.weekly_focus && parsed.weekly_focus !== 'ausgeglichen') {
            focusKey = parsed.weekly_focus;
          }
        }
      }
    } catch (e) {}
    return focusKey;
  }, [studentUser?.skill_radar_levels, props.studentId, studentUser?.id]);

  const weeklyFocusMeta = useMemo(() => {
    if (!activeWeeklyFocusKey) return null;
    const key = activeWeeklyFocusKey.toLowerCase();
    if (key === 'rhythmus') {
      return { key, label: 'Rhythmus & Beat', icon: '🥁', color: '#b45309', bg: '#fef3c7', border: '#fde047' };
    }
    if (key === 'technik') {
      return { key, label: 'Technik & Finger', icon: '⚡', color: '#0369a1', bg: '#e0f2fe', border: '#bae6fd' };
    }
    if (key === 'intonation' || key === 'klang') {
      return { key, label: 'Klang & Ton', icon: '🎵', color: '#15803d', bg: '#dcfce7', border: '#bbf7d0' };
    }
    if (key === 'ausdruck') {
      return { key, label: 'Ausdruck & Gefühl', icon: '🎭', color: '#7e22ce', bg: '#f3e8ff', border: '#e9d5ff' };
    }
    if (key === 'repertoire') {
      return { key, label: 'Repertoire & Song', icon: '📚', color: '#be185d', bg: '#fce7f3', border: '#fbcfe8' };
    }
    return { key, label: activeWeeklyFocusKey, icon: '🎯', color: '#b45309', bg: '#fef3c7', border: '#fde047' };
  }, [activeWeeklyFocusKey]);

  // 🎯 Didaktische 3-Stufen-Reflexion für Hausaufgaben (🟢 Läuft super / 🟡 Noch wackelig / 🔴 Brauche Hilfe)
  const [taskReflections, setTaskReflections] = useState<Record<string, { status: 'super' | 'wackelig' | 'hilfe'; timestamp: string; label?: string }>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const sId = props.studentId || studentUser?.id || 'default';
      const raw = localStorage.getItem(`campus_student_task_reflections_${sId}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const sId = props.studentId || studentUser?.id || 'default';
    const handleSyncReflections = () => {
      try {
        const raw = localStorage.getItem(`campus_student_task_reflections_${sId}`);
        if (raw) setTaskReflections(JSON.parse(raw));
      } catch {}
    };
    window.addEventListener('campus_homework_reflection_updated', handleSyncReflections);
    window.addEventListener('storage', handleSyncReflections);
    return () => {
      window.removeEventListener('campus_homework_reflection_updated', handleSyncReflections);
      window.removeEventListener('storage', handleSyncReflections);
    };
  }, [props.studentId, studentUser?.id]);

  const handleSetTaskReflection = (taskId: string, status: 'super' | 'wackelig' | 'hilfe', label?: string) => {
    const sId = props.studentId || studentUser?.id || 'default';
    setTaskReflections(prev => {
      const current = prev[taskId]?.status;
      const next = current === status ? undefined : { status, timestamp: new Date().toISOString(), label };
      const updated = { ...prev };
      if (!next) {
        delete updated[taskId];
      } else {
        updated[taskId] = next;
      }
      try {
        localStorage.setItem(`campus_student_task_reflections_${sId}`, JSON.stringify(updated));
      } catch {}
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus_homework_reflection_updated', {
          detail: { studentId: sId, taskId, status: next?.status, label }
        }));
      }
      return updated;
    });
  };

  const renderReflectionPills = (taskId: string, label: string) => {
    const current = taskReflections[taskId]?.status;
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flexWrap: 'wrap',
        marginTop: '6px'
      }}>
        <span style={{ fontSize: isMusicStandMode ? '0.80rem' : '0.74rem', fontWeight: 850, color: '#64748b', marginRight: '4px' }}>
          Reflexion:
        </span>
        {/* 1. Läuft super */}
        <button
          type="button"
          role="button"
          tabIndex={0}
          aria-pressed={current === 'super'}
          aria-label={`${label}: Läuft super markieren`}
          onClick={(e) => {
            e.stopPropagation();
            handleSetTaskReflection(taskId, 'super', label);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              handleSetTaskReflection(taskId, 'super', label);
            }
          }}
          style={{
            background: current === 'super' ? '#16a34a' : '#f0fdf4',
            color: current === 'super' ? '#ffffff' : '#15803d',
            border: current === 'super' ? '1.5px solid #15803d' : '1px solid #bbf7d0',
            borderRadius: '100px',
            padding: isMusicStandMode ? '8px 16px' : '6px 14px',
            minHeight: '44px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: isMusicStandMode ? '0.88rem' : '0.82rem',
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: current === 'super' ? '0 2px 8px rgba(22, 163, 74, 0.35)' : 'none',
            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          className="hover-scale-mini"
        >
          <Check size={isMusicStandMode ? 16 : 14} strokeWidth={current === 'super' ? 3.2 : 2.5} />
          <span>Läuft super!</span>
        </button>

        {/* 2. Noch wackelig */}
        <button
          type="button"
          role="button"
          tabIndex={0}
          aria-pressed={current === 'wackelig'}
          aria-label={`${label}: Noch wackelig markieren`}
          onClick={(e) => {
            e.stopPropagation();
            handleSetTaskReflection(taskId, 'wackelig', label);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              handleSetTaskReflection(taskId, 'wackelig', label);
            }
          }}
          style={{
            background: current === 'wackelig' ? '#d97706' : '#fffbeb',
            color: current === 'wackelig' ? '#ffffff' : '#b45309',
            border: current === 'wackelig' ? '1.5px solid #b45309' : '1px solid #fde68a',
            borderRadius: '100px',
            padding: isMusicStandMode ? '8px 16px' : '6px 14px',
            minHeight: '44px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: isMusicStandMode ? '0.88rem' : '0.82rem',
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: current === 'wackelig' ? '0 2px 8px rgba(217, 119, 6, 0.35)' : 'none',
            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          className="hover-scale-mini"
        >
          <AlertTriangle size={isMusicStandMode ? 16 : 14} strokeWidth={current === 'wackelig' ? 2.8 : 2.2} />
          <span>Noch wackelig</span>
        </button>

        {/* 3. Brauche Hilfe */}
        <button
          type="button"
          role="button"
          tabIndex={0}
          aria-pressed={current === 'hilfe'}
          aria-label={`${label}: Brauche Hilfe markieren`}
          onClick={(e) => {
            e.stopPropagation();
            handleSetTaskReflection(taskId, 'hilfe', label);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              handleSetTaskReflection(taskId, 'hilfe', label);
            }
          }}
          style={{
            background: current === 'hilfe' ? '#dc2626' : '#fef2f2',
            color: current === 'hilfe' ? '#ffffff' : '#b91c1c',
            border: current === 'hilfe' ? '1.5px solid #b91c1c' : '1px solid #fecaca',
            borderRadius: '100px',
            padding: isMusicStandMode ? '8px 16px' : '6px 14px',
            minHeight: '44px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: isMusicStandMode ? '0.88rem' : '0.82rem',
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: current === 'hilfe' ? '0 2px 8px rgba(220, 38, 38, 0.35)' : 'none',
            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          className="hover-scale-mini"
        >
          <HelpCircle size={isMusicStandMode ? 16 : 14} strokeWidth={current === 'hilfe' ? 2.8 : 2.2} />
          <span>Brauche Hilfe</span>
        </button>
      </div>
    );
  };

  return (
      <div style={{ display: activeTab === 'briefing' ? 'block' : 'none' }}>
        {activeTab === 'briefing' && (() => {
          const sidebarAppointmentChanges = (scheduleOccurrences || []).filter(occ => 
            !occ.student_acknowledged && (
              occ.status === 'pending_reschedule' || 
              occ.status === 'cancelled' || 
              (occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date)
            )
          );
          const hasSidebarAppointmentAlerts = sidebarAppointmentChanges.length > 0;
          const hasSidebarFeedAlerts = (unreadClassFeedCount > 0) || (totalUnreadDirectMessages > 0);
          const sidebarTotalAlertsCount = sidebarAppointmentChanges.length + (unreadClassFeedCount || 0) + (totalUnreadDirectMessages || 0);

          return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
          
          {/* Floating Right-Edge Toggle Button when Collapsed (Desktop only, for Teen / Pro) */}
          {isRightSidebarCollapsed && studentUiLevel !== 'junior' && !isMobile && (
            <button
              onClick={() => handleToggleRightSidebar(false)}
              style={{
                position: 'fixed',
                right: '0px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 99,
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1.5px solid #bbf7d0',
                borderRight: 'none',
                borderRadius: '16px 0 0 16px',
                padding: '14px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                boxShadow: '-4px 0 20px rgba(52, 168, 83, 0.2)',
                color: '#15803d',
                fontWeight: 900,
                fontSize: '0.7rem',
                transition: 'all 0.2s ease-in-out'
              }}
              className="hover-scale"
              title="Termine & Mitteilungen ausklappen"
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={18} color="#15803d" />
                {(hasSidebarAppointmentAlerts || hasSidebarFeedAlerts) && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: hasSidebarAppointmentAlerts ? '#f59e0b' : '#34a853',
                    border: '2px solid #ffffff',
                    boxShadow: `0 0 8px ${hasSidebarAppointmentAlerts ? '#f59e0b' : '#34a853'}`,
                    animation: 'pulse 1.5s infinite'
                  }} />
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                }}>
                  <Calendar size={15} color="#15803d" />
                </div>
                
                {sidebarTotalAlertsCount > 0 && (
                  <span style={{
                    background: hasSidebarAppointmentAlerts ? '#f59e0b' : '#34a853',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 950,
                    padding: '2px 6px',
                    borderRadius: '100px',
                    minWidth: '16px',
                    textAlign: 'center',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }}>
                    {sidebarTotalAlertsCount}
                  </span>
                )}
              </div>

              <span style={{ 
                writingMode: 'vertical-rl', 
                textTransform: 'uppercase', 
                letterSpacing: '0.08em', 
                fontSize: '0.68rem',
                fontWeight: 900,
                color: '#166534',
                marginTop: '2px'
              }}>
                Termine & Mitteilungen
              </span>
            </button>
          )}

          {/* MAIN LAYOUT (Full-width for Junior Level 1 or when Right Sidebar is Collapsed, 2-column when Open) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: (isMobile || studentUiLevel === 'junior' || isRightSidebarCollapsed) ? '1fr' : '1fr 340px', 
            gap: isRightSidebarCollapsed ? '0px' : '32px', 
            paddingRight: (isRightSidebarCollapsed && studentUiLevel !== 'junior' && !isMobile) ? '56px' : '0px',
            alignItems: 'start',
            boxSizing: 'border-box',
            width: '100%',
            transition: 'grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1), gap 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            
            {/* MAIN COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {/* Community Update & Helden-Moment Hero */}
              <UpdateAnnouncementHero userId={studentId} activePlatform={currentPlatform} />
              
              {/* Quick-Action: Push-Nachrichten Aktivierung Banner (nur wenn noch keine finale Entscheidung vorliegt & kein Cooldown aktiv ist) */}
              {(() => {
                if (pushEnabled || !setShowPushSoftPrompt) return null;

                // 1. Check user record in database
                const dbDecision = studentUser?.push_prompt_decision;
                if (dbDecision === 'accepted' || dbDecision === 'declined') {
                  return null;
                }

                // 2. Check localStorage cache for decision
                const localDecision = typeof window !== 'undefined' ? localStorage.getItem(`campus_push_decision_${studentId}`) : null;
                if (localDecision === 'accepted' || localDecision === 'declined') {
                  return null;
                }

                // 3. Check 14-day deferral cooldown (both DB and LocalStorage)
                const localDeferredUntil = typeof window !== 'undefined' ? Number(localStorage.getItem(`campus_push_deferred_until_${studentId}`)) : 0;
                if (localDeferredUntil && Date.now() < localDeferredUntil) {
                  return null;
                }

                if (studentUser?.push_prompt_dismissed_at) {
                  const dismissedTime = new Date(studentUser.push_prompt_dismissed_at).getTime();
                  if (!isNaN(dismissedTime) && Date.now() - dismissedTime < 14 * 86400000) {
                    return null;
                  }
                }

                return (
                  <div 
                    role="button"
                    tabIndex={0}
                    onClick={() => setShowPushSoftPrompt(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setShowPushSoftPrompt(true);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      padding: '16px 20px',
                      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                      border: '1.5px solid #bfdbfe',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px -2px rgba(59, 130, 246, 0.12)',
                      transition: 'all 0.2s ease',
                    }}
                    className="hover-scale"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '14px',
                        background: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        flexShrink: 0,
                        boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)'
                      }}>
                        <Bell size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e3a8a', letterSpacing: '-0.01em' }}>
                          Push-Nachrichten aktivieren
                        </div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#3b82f6', marginTop: '2px' }}>
                          Erhalte Terminänderungen, Hausaufgaben & Chat-Nachrichten sofort aufs Smartphone
                        </div>
                      </div>
                    </div>
                    <div style={{
                      padding: '8px 16px',
                      background: '#2563eb',
                      color: '#ffffff',
                      borderRadius: '12px',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
                    }}>
                      Aktivieren
                    </div>
                  </div>
                );
              })()}
              
              {/* ========================================================================= */}
              {/* LEVEL 1: JUNIOR (6-10 JAHRE) - RADIKAL AUFGERÄUMT IM ANTON-STIL          */}
              {/* ========================================================================= */}
              {studentUiLevel === 'junior' && (
                <>
                  {/* JUNIOR: 2 GROSSE HERO-KPIS (Zauber-XP & Flammen-Serie) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px', width: '100%' }}>
                    {/* KPI 1: Zauber-XP */}
                    {xpActive && (
                      <div style={{ 
                        position: 'relative', overflow: 'hidden',
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        color: 'white',
                        borderRadius: '28px',
                        boxShadow: '0 14px 30px -6px rgba(99, 102, 241, 0.35)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        minHeight: '100px',
                        padding: '20px 24px',
                        boxSizing: 'border-box',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1.5px solid rgba(255, 255, 255, 0.25)'
                      }} className="hover-scale">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <span style={{ 
                            fontSize: '0.85rem', 
                            fontWeight: 950, 
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            color: 'white'
                          }}>
                            Zauber-XP ⭐
                          </span>
                          <div style={{ 
                            background: 'rgba(255, 255, 255, 0.25)', 
                            padding: '8px', 
                            borderRadius: '12px' 
                          }}>
                            <Star size={20} color="white" fill="white" />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
                          <span style={{ 
                            fontSize: '2.6rem', 
                            fontWeight: 950, 
                            fontFamily: "'Plus Jakarta Sans', sans-serif", 
                            letterSpacing: '-0.02em',
                            color: 'white',
                            lineHeight: 1
                          }}>
                            {currentXp || 0}
                          </span>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, opacity: 0.95, color: 'white' }}>
                            Punkte
                          </span>
                        </div>
                      </div>
                    )}

                    {/* KPI 2: Flammen-Serie / Sternen-Serie for Junior */}
                    {flamesActive && (
                      <div style={{ 
                        position: 'relative', overflow: 'hidden',
                        background: 'linear-gradient(135deg, #ff4b4b 0%, #dc2626 100%)',
                        color: 'white',
                        borderRadius: '28px',
                        boxShadow: '0 14px 30px -6px rgba(239, 68, 68, 0.35)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        minHeight: '100px',
                        padding: '20px 24px',
                        boxSizing: 'border-box',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1.5px solid rgba(255, 255, 255, 0.25)'
                      }} className="hover-scale">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <span style={{ 
                            fontSize: '0.85rem', 
                            fontWeight: 950, 
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            color: 'white'
                          }}>
                            {studentUiLevel === 'junior' ? 'Sternen-Serie ⭐' : 'Flammen-Serie 🔥'}
                          </span>
                          <div style={{ 
                            background: 'rgba(255, 255, 255, 0.25)', 
                            padding: '8px', 
                            borderRadius: '12px' 
                          }}>
                            {studentUiLevel === 'junior' ? (
                              <Star size={20} color="white" fill="white" />
                            ) : (
                              <Flame size={20} color="white" fill="white" />
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
                          <span style={{ 
                            fontSize: (avatar?.streak_flame || 0) === 0 ? '2.1rem' : '2.6rem', 
                            fontWeight: 950, 
                            fontFamily: "'Plus Jakarta Sans', sans-serif", 
                            letterSpacing: '-0.02em',
                            color: 'white',
                            lineHeight: 1
                          }}>
                            {(avatar?.streak_flame || 0) === 0 ? 'Startklar' : (avatar?.streak_flame || 0)}
                          </span>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, opacity: 0.95, color: 'white' }}>
                            {(avatar?.streak_flame || 0) === 0 ? 'Tag 1' : ((avatar?.streak_flame || 0) === 1 ? 'Tag' : 'Tage')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* JUNIOR: WEICHE, FREUNDLICHE HERO-BEGRÜSSUNG */}
                  {(() => {
                    const inst = (studentInstrumentName || '').toLowerCase();
                    let pronoun = `dein ${studentInstrumentName}`;
                    if (inst.includes('gitarre') || inst.includes('geige') || inst.includes('trompete') || inst.includes('flöte') || inst.includes('harfe') || inst.includes('klarinette') || inst.includes('posaune') || inst.includes('ukulele') || inst.includes('bratsche') || inst.includes('tuba') || inst.includes('harmonika')) {
                      pronoun = `deine ${studentInstrumentName}`;
                    } else if (inst.includes('bass') || inst.includes('kontrabass') || inst.includes('synthesizer') || inst.includes('flügel')) {
                      pronoun = `deinen ${studentInstrumentName}`;
                    }

                    return (
                      <div style={{
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.8) 100%)',
                        backdropFilter: 'blur(24px) saturate(1.8)',
                        WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                        border: '1.5px solid rgba(255, 255, 255, 0.8)',
                        borderRadius: '32px',
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems: 'stretch',
                        boxShadow: '0 20px 45px rgba(15, 23, 42, 0.04)',
                        width: '100%',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        position: 'relative',
                        minHeight: isMobile ? 'auto' : '180px'
                      }}>
                        <Music size={170} style={{ position: 'absolute', right: '4%', bottom: '-40px', opacity: 0.04, color: '#34a853', pointerEvents: 'none' }} />

                        {/* Grosser Avatar links */}
                        <div style={{
                          width: isMobile ? '100%' : '180px',
                          height: isMobile ? '150px' : 'auto',
                          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 2,
                          position: 'relative',
                          overflow: 'hidden',
                          borderRight: isMobile ? 'none' : '1px solid rgba(0, 0, 0, 0.08)',
                          borderBottom: isMobile ? '1px solid rgba(0, 0, 0, 0.08)' : 'none'
                        }}>
                          <div style={{
                            position: 'absolute',
                            width: '130px',
                            height: '130px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(52, 168, 83, 0.3) 0%, rgba(52, 168, 83, 0) 70%)',
                            filter: 'blur(12px)',
                            zIndex: 1
                          }} />
                          <img 
                            src={resolveCampusStudentAvatar({ ...studentUser, instrument: studentInstrumentName || studentUser?.instrument })} 
                            alt="" 
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'cover',
                              zIndex: 2,
                              transform: 'scale(1.06)',
                              transition: 'transform 0.5s ease'
                            }} 
                            className="hover-zoom"
                          />
                        </div>

                        {/* Begruessung & Termin-Badge */}
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, flex: 1, zIndex: 2, padding: '24px 32px' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{
                              background: '#dcfce7',
                              color: '#15803d',
                              fontSize: isMusicStandMode ? '0.90rem' : '0.82rem',
                              fontWeight: 950,
                              borderRadius: '100px',
                              padding: '6px 16px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}>
                              🌟 JUNIOR-STAR • LEVEL 1
                            </div>
                          </div>

                          <h3 style={{ 
                            margin: 0, 
                            fontSize: isMusicStandMode ? '34px' : '30px', 
                            fontWeight: 950, 
                            color: '#0f172a', 
                            fontFamily: "'Plus Jakarta Sans', sans-serif", 
                            lineHeight: 1.15,
                            letterSpacing: '-0.02em'
                          }}>
                            Hallo {studentUser?.first_name || 'Nachwuchs-Star'}! 🎵
                          </h3>
                          
                          <p style={{ 
                            margin: '8px 0 0 0', 
                            fontSize: isMusicStandMode ? '1.18rem' : '1.05rem', 
                            color: '#475569', 
                            fontWeight: 650, 
                            lineHeight: 1.45, 
                            maxWidth: '95%' 
                          }}>
                            Schnapp dir {pronoun} und hol dir deine Flamme! ✨
                          </p>

                          {(() => {
                            const nextOcc = (scheduleOccurrences || [])[0] || (schoolYearOccurrences || [])[0];
                            const hasToday = !!briefingData?.todayLesson;
                            const teacherId = hasToday ? briefingData.todayLesson.teacher_id : (nextOcc?.teacher_id || studentUser?.teacher_id);
                            const timeLabel = hasToday ? briefingData.todayLesson.time : (nextOcc?.start_time?.substring(0, 5) || '15:15');
                            const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                            const todayStr = new Date().toISOString().split('T')[0];
                            const targetDateStr = hasToday ? todayStr : (nextOcc?.date || todayStr);
                            const targetDayOfWeek = targetDateStr ? DAYS_DE[new Date(targetDateStr).getDay()] : 'Termin';
                            const formattedDate = targetDateStr ? new Date(targetDateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '';
                            const label = `${targetDayOfWeek} (${formattedDate}), ${timeLabel} Uhr`;
                            const finalOccurId = hasToday 
                              ? (briefingData?.todayLesson?.id || `today-${teacherId}-${todayStr}`) 
                              : (nextOcc?.id || `sched-${studentId}`);
                            const lessonText = hasToday 
                              ? `Heute, ${briefingData.todayLesson.time} Uhr` 
                              : (nextOcc ? (() => {
                                  const d = new Date(nextOcc.date);
                                  return `${d.toLocaleDateString('de-DE', {weekday: 'long', day: '2-digit', month: '2-digit'})} - ${nextOcc.start_time?.substring(0,5)} Uhr`;
                                })() : 'Demnächst');
                            const hasMessage = checkOccurrenceHasMessages(nextOcc || finalOccurId, targetDateStr);
                            const unreadMsgCount = getOccurrenceUnreadCount(nextOcc || finalOccurId, targetDateStr);
                            const isCanceled = nextOcc?.status === 'canceled_by_student' || nextOcc?.status === 'cancelled' || nextOcc?.status === 'teacher_sick' || nextOcc?.status === 'canceled_by_teacher_sick';

                            return (
                              <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                {/* 1. Next Lesson Status Badge */}
                                <div style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '8px', 
                                  background: isCanceled ? 'rgba(239, 68, 68, 0.08)' : 'linear-gradient(135deg, rgba(52, 168, 83, 0.09) 0%, rgba(52, 168, 83, 0.03) 100%)', 
                                  color: isCanceled ? '#dc2626' : '#2e7d32', 
                                  padding: isMusicStandMode ? '10px 20px' : '8px 16px', 
                                  minHeight: isMusicStandMode ? '44px' : '38px', 
                                  boxSizing: 'border-box',
                                  borderRadius: '14px', 
                                  fontSize: isMusicStandMode ? '0.94rem' : '0.86rem', 
                                  fontWeight: 850, 
                                  border: isCanceled ? '1px dashed rgba(239, 68, 68, 0.3)' : '1.5px solid rgba(52, 168, 83, 0.2)'
                                }}>
                                  <Calendar size={isMusicStandMode ? 16 : 14} color={isCanceled ? '#dc2626' : '#34a853'} />
                                  <span>{isCanceled ? `Abgesagt: ${lessonText}` : `Nächste Musikstunde: ${lessonText}`}</span>
                                </div>

                                {/* 2. Nachrichten / Shoutbox Button (1:1 synchron mit Termine-Board) */}
                                {teacherId && (
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAppointmentChatData({
                                        teacherId,
                                        date: targetDateStr,
                                        start_time: timeLabel,
                                        label,
                                        occurrenceId: finalOccurId,
                                        status: nextOcc?.status || (isCanceled ? 'cancelled' : 'scheduled'),
                                        isCancelled: isCanceled
                                      });
                                      setShowAppointmentChat(true);
                                    }}
                                    style={{ 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: '8px', 
                                      background: hasMessage ? '#fefce8' : '#ffffff', 
                                      color: hasMessage ? '#ca8a04' : '#475569', 
                                      padding: isMusicStandMode ? '10px 20px' : '8px 16px', 
                                      minHeight: isMusicStandMode ? '44px' : '38px', 
                                      boxSizing: 'border-box',
                                      borderRadius: '14px', 
                                      fontSize: isMusicStandMode ? '0.94rem' : '0.86rem', 
                                      fontWeight: 900, 
                                      border: hasMessage ? '1px solid #fde047' : '1px solid #cbd5e1', 
                                      cursor: 'pointer',
                                      boxShadow: hasMessage ? '0 2px 8px rgba(202, 138, 4, 0.18)' : '0 2px 6px rgba(0, 0, 0, 0.03)',
                                      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.transform = 'translateY(-1px)';
                                      e.currentTarget.style.background = hasMessage ? '#fef08a' : '#f8fafc';
                                      e.currentTarget.style.boxShadow = hasMessage ? '0 4px 12px rgba(202, 138, 4, 0.25)' : '0 4px 12px rgba(0, 0, 0, 0.08)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = 'none';
                                      e.currentTarget.style.background = hasMessage ? '#fefce8' : '#ffffff';
                                      e.currentTarget.style.boxShadow = hasMessage ? '0 2px 8px rgba(202, 138, 4, 0.18)' : '0 2px 6px rgba(0, 0, 0, 0.03)';
                                    }}
                                    title="1:1 Shoutbox zum Unterrichtstermin"
                                  >
                                    <MessageSquare 
                                      size={15} 
                                      color={hasMessage ? '#ca8a04' : '#64748b'} 
                                      fill={hasMessage ? '#eab308' : 'none'} 
                                    />
                                    <span>{unreadMsgCount > 0 ? (unreadMsgCount === 1 ? '1 neue Nachricht' : `${unreadMsgCount} neue Nachrichten`) : (hasMessage ? 'Nachrichten vorhanden' : 'Nachrichten')}</span>
                                    {unreadMsgCount > 0 && (
                                      <span style={{
                                        background: '#f59e0b',
                                        color: '#ffffff',
                                        fontSize: '0.70rem',
                                        fontWeight: 950,
                                        padding: '2px 8px',
                                        borderRadius: '100px',
                                        letterSpacing: '0.02em',
                                        boxShadow: '0 2px 6px rgba(245, 158, 11, 0.35)'
                                      }}>
                                        {unreadMsgCount === 1 ? '1 neu ★' : `${unreadMsgCount} neu ★`}
                                      </span>
                                    )}
                                  </button>
                                )}

                                {/* 3. Absage / Reaktivieren Button (Master-PIN geschützt für Junior) */}
                                {nextOcc && (isCanceled || isStudentAbsenceAllowed || checkIsParentUnlockedGlobal()) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isCanceled) {
                                        handleTriggerUndoCancelOccurrence(nextOcc);
                                      } else {
                                        handleTriggerCancelOccurrence(nextOcc);
                                      }
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      background: isCanceled ? '#fee2e2' : '#ffffff',
                                      color: isCanceled ? '#dc2626' : '#475569',
                                      padding: isMusicStandMode ? '10px 20px' : '8px 16px',
                                      minHeight: isMusicStandMode ? '44px' : '38px',
                                      boxSizing: 'border-box',
                                      borderRadius: '14px',
                                      fontSize: isMusicStandMode ? '0.94rem' : '0.86rem',
                                      fontWeight: 850,
                                      border: isCanceled ? '1px solid #f87171' : '1px solid #e2e8f0',
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                                      transition: 'all 0.2s'
                                    }}
                                    className="hover-scale"
                                    title={isCanceled ? "Absage zurücknehmen / Termin reaktivieren (Eltern-PIN)" : "Unterrichtstermin absagen"}
                                  >
                                    {isCanceled ? (
                                      <>
                                        <Lock size={14} color="#dc2626" />
                                        <span>Absage zurücknehmen (Eltern-PIN)</span>
                                      </>
                                    ) : (
                                      <>
                                        {!isStudentAbsenceAllowed ? <Lock size={14} color="#64748b" /> : <CalendarX size={14} color="#64748b" />}
                                        <span>{!isStudentAbsenceAllowed ? 'Unterricht absagen (Eltern-PIN)' : 'Unterricht absagen'}</span>
                                      </>
                                    )}
                                  </button>
                                )}

                                {/* 4. Wochenfokus / Musik-Stern Badge */}
                                {weeklyFocusMeta && (
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      if (handleOpenHomeworkBookWithView) {
                                        handleOpenHomeworkBookWithView('skillradar');
                                      }
                                    }}
                                    style={{ 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: '8px', 
                                      background: 'linear-gradient(135deg, #fef3c7 0%, #fefce8 100%)', 
                                      color: '#854d0e', 
                                      padding: isMusicStandMode ? '10px 20px' : '8px 16px', 
                                      minHeight: isMusicStandMode ? '44px' : '38px', 
                                      boxSizing: 'border-box', 
                                      borderRadius: '14px', 
                                      fontSize: isMusicStandMode ? '0.94rem' : '0.86rem', 
                                      fontWeight: 850, 
                                      border: '1.5px solid #fde047',
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 8px rgba(234, 179, 8, 0.15)',
                                      transition: 'all 0.18s ease'
                                    }}
                                    className="hover-scale"
                                    title="Zu deinem Musik-Stern im Aufgabenheft"
                                  >
                                    <span style={{ fontSize: '1.05rem' }}>⭐</span>
                                    <span>Wochenfokus: {weeklyFocusMeta.label}</span>
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })()}

                  {/* ========================================================================= */}
                  {/* JUNIOR: 3 GOLDSTANDARD HELDEN-KARTEN (HAUSAUFGABE • RAKETE • STICKER)     */}
                  {/* ========================================================================= */}
                  {(() => {
                    const currentWeekStr = getISOWeek(getSimulatedNow());
                    const cleanTitle = (t: string) => (t || '').replace(/linken park/gi, 'Linkin Park').replace(/\s*\((gitarre|guitar|e-gitarre|bass|e-bass|drums|schlagzeug|klavier|piano|keys|keyboard|vocals|gesang|stimme|allgemein)\)/i, '');

                    {/* 1. Gather all active homework books & pages from localProgress */}
                    const activeJuniorBooks: { title: string; pages: number[]; formattedPages: string; notes?: string[]; book?: any }[] = [];
                    (localProgress || []).forEach((assignment: any) => {
                      if (String(assignment.studentId) !== String(studentId) || !assignment.pageStates) return;
                      const book = lehrwerke.find(g => String(g.id) === String(assignment.lehrwerkId));
                      const bookTitle = book?.title || assignment.bookTitle || assignment.lehrwerkTitle;
                      if (!bookTitle) return;
                      const pages: number[] = [];
                      const notes: string[] = [];
                      Object.entries(assignment.pageStates).forEach(([pNumStr, pState]: [string, any]) => {
                        if (pState?.status === 'homework' || pState?.isCurrentHomework) {
                          const pNum = parseInt(pNumStr, 10);
                          if (!isNaN(pNum) && !pages.includes(pNum)) pages.push(pNum);
                          let cleanNote = pState.homeworkNotes || pState.homework_notes || pState.notes || '';
                          if (typeof cleanNote === 'string' && (cleanNote.startsWith('[') || cleanNote.startsWith('{'))) {
                            try {
                              const parsed = JSON.parse(cleanNote);
                              if (Array.isArray(parsed)) {
                                cleanNote = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('SNAPSHOT_') && !n.startsWith('FEEDBACK:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
                              }
                            } catch {}
                          }
                          cleanNote = String(cleanNote).replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '').replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
                          if (cleanNote) {
                            notes.push(`Seite ${pNum}: ${cleanNote}`);
                          }
                        }
                      });
                      if (pages.length > 0) {
                        pages.sort((a, b) => a - b);
                        const formattedPages = pages.length === 1 ? `S. ${pages[0]}` : `S. ${pages[0]}–${pages[pages.length - 1]}`;
                        const existingBook = activeJuniorBooks.find(b => b.title.toLowerCase() === bookTitle.toLowerCase());
                        if (existingBook) {
                          existingBook.book = existingBook.book || book;
                          pages.forEach(p => {
                            if (!existingBook.pages.includes(p)) existingBook.pages.push(p);
                          });
                          existingBook.pages.sort((a, b) => a - b);
                          existingBook.formattedPages = existingBook.pages.length === 1 
                            ? `S. ${existingBook.pages[0]}` 
                            : `S. ${existingBook.pages[0]}–${existingBook.pages[existingBook.pages.length - 1]}`;
                          if (notes.length > 0) {
                            existingBook.notes = Array.from(new Set([...(existingBook.notes || []), ...notes]));
                          }
                        } else {
                          activeJuniorBooks.push({ title: bookTitle, pages, formattedPages, notes, book });
                        }
                      }
                    });

                    // 1b. Also incorporate Lehrwerke pages from progressItems (database rows)
                    (progressItems || []).forEach((item: any) => {
                      if (!item.topic_name || item.topic_name.startsWith('Hausaufgabe KW ')) return;
                      if (item.topic_name.includes(' - Seite ')) {
                        const parts = item.topic_name.split(' - Seite ');
                        const bookTitle = cleanTitle(parts[0].trim());
                        const pageNum = parseInt(parts[1], 10);
                        const book = lehrwerke.find((g: any) => (g.title || '').trim().toLowerCase() === bookTitle.toLowerCase());
                        const resolvedTitle = book?.title || bookTitle;
                        if (!isNaN(pageNum)) {
                          let cleanNote = item.homework_notes || item.teacher_notes || '';
                          if (typeof cleanNote === 'string' && (cleanNote.startsWith('[') || cleanNote.startsWith('{'))) {
                            try {
                              const parsed = JSON.parse(cleanNote);
                              if (Array.isArray(parsed)) {
                                cleanNote = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('SNAPSHOT_') && !n.startsWith('FEEDBACK:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
                              }
                            } catch {}
                          }
                          cleanNote = String(cleanNote).replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '').replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
                          const formattedNote = cleanNote ? `Seite ${pageNum}: ${cleanNote}` : '';

                          const existingBook = activeJuniorBooks.find(b => (b.title || '').trim().toLowerCase() === resolvedTitle.trim().toLowerCase());
                          if (existingBook) {
                            if (!existingBook.pages.includes(pageNum)) {
                              existingBook.pages.push(pageNum);
                              existingBook.pages.sort((a, b) => a - b);
                              existingBook.formattedPages = existingBook.pages.length === 1 
                                ? `S. ${existingBook.pages[0]}` 
                                : `S. ${existingBook.pages[0]}–${existingBook.pages[existingBook.pages.length - 1]}`;
                            }
                            if (formattedNote && !existingBook.notes?.includes(formattedNote)) {
                              existingBook.notes = [...(existingBook.notes || []), formattedNote];
                            }
                          } else {
                            activeJuniorBooks.push({
                              title: resolvedTitle,
                              pages: [pageNum],
                              formattedPages: `S. ${pageNum}`,
                              notes: formattedNote ? [formattedNote] : [],
                              book
                            });
                          }
                        }
                      }
                    });

                    // 2. Songs & progress items
                    const activeJuniorSongs: any[] = [];
                    (progressItems || []).forEach(item => {
                      if (item.topic_name.startsWith('Hausaufgabe KW ') || item.topic_name.includes(' - Seite ')) return;
                      const localHw = localStorage.getItem(`song_hw_${studentId}_${item.id}`) ??
                                      (item.song_id ? localStorage.getItem(`song_hw_${studentId}_${item.song_id}`) : null);
                      if (localHw === 'false') return;
                      const isSongHw = (localHw === 'true') || Boolean(item.is_current_homework);
                      if (isSongHw) {
                        const cleanT = cleanTitle(item.topic_name.replace(/\s*\([^)]*\)\s*$/, ''));
                        if (!activeJuniorSongs.some(existing => cleanTitle(existing.topic_name.replace(/\s*\([^)]*\)\s*$/, '')) === cleanT)) {
                          let cleanNote = item.homework_notes || item.teacher_notes || '';
                          if (typeof cleanNote === 'string' && (cleanNote.startsWith('[') || cleanNote.startsWith('{'))) {
                            try {
                              const parsed = JSON.parse(cleanNote);
                              if (Array.isArray(parsed)) {
                                cleanNote = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
                              }
                            } catch {}
                          }
                          cleanNote = String(cleanNote).replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '').replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
                          activeJuniorSongs.push({
                            ...item,
                            homework_notes: cleanNote
                          });
                        }
                      }
                    });

                    (activeSongSkills || []).forEach((skill: any) => {
                      const localHw = localStorage.getItem(`song_hw_${studentId}_${skill.id}`) ??
                                      (skill.song_id ? localStorage.getItem(`song_hw_${studentId}_${skill.song_id}`) : null) ??
                                      (skill.songs?.id ? localStorage.getItem(`song_hw_${studentId}_${skill.songs.id}`) : null);

                      const isHw = (localHw === 'true') || (localHw !== 'false' && Boolean(skill.is_current_homework));

                      if (isHw) {
                        const songArtist = skill.songs?.artist || skill.artist || '';
                        const songTitle = skill.songs?.title || skill.title || skill.song_title || 'Song';
                        const songInstrument = skill.instrument ? ` (${skill.instrument})` : '';
                        const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;
                        const cleanT = cleanTitle(fullTitle);

                        if (!activeJuniorSongs.some(existing => cleanTitle((existing.topic_name || existing.title || '').replace(/\s*\([^)]*\)\s*$/, '')) === cleanT)) {
                          let cleanNote = localStorage.getItem(`song_note_${studentId}_${skill.id}`) ||
                                           (skill.song_id ? localStorage.getItem(`song_note_${studentId}_${skill.song_id}`) : '') ||
                                           (skill.songs?.id ? localStorage.getItem(`song_note_${studentId}_${skill.songs.id}`) : '') ||
                                           skill.homework_notes || '';
                          if (typeof cleanNote === 'string' && (cleanNote.startsWith('[') || cleanNote.startsWith('{'))) {
                            try {
                              const parsed = JSON.parse(cleanNote);
                              if (Array.isArray(parsed)) {
                                cleanNote = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
                              }
                            } catch {}
                          }
                          cleanNote = String(cleanNote).replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '').replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();

                          activeJuniorSongs.push({
                            id: skill.id,
                            song_id: skill.song_id || skill.songs?.id,
                            topic_name: fullTitle,
                            title: fullTitle,
                            is_current_homework: true,
                            status: 'IN_PROGRESS',
                            homework_notes: cleanNote
                          });
                        }
                      }
                    });

                    // 2b. 📦 Snapshot Hydration: Falls activeJuniorBooks oder activeJuniorSongs leer sind, aus jüngstem SNAPSHOT hydrieren
                    if (activeJuniorBooks.length === 0 || activeJuniorSongs.length === 0) {
                      const allSnapshotCandidates = (progressItems || []).filter((item: any) => item.topic_name?.startsWith('Hausaufgabe KW '));
                      allSnapshotCandidates.sort((a: any, b: any) => {
                        const wA = getItemWeek(a);
                        const wB = getItemWeek(b);
                        if (wA !== wB) return (wB || '').localeCompare(wA || '');
                        const tA = new Date(a.updated_at || a.created_at || 0).getTime();
                        const tB = new Date(b.updated_at || b.created_at || 0).getTime();
                        return tB - tA;
                      });

                      for (const snapItem of allSnapshotCandidates) {
                        if (!snapItem.homework_notes) continue;
                        let parsedSnapNotes: any = null;
                        try {
                          parsedSnapNotes = typeof snapItem.homework_notes === 'string' ? JSON.parse(snapItem.homework_notes) : snapItem.homework_notes;
                        } catch {}
                        if (!Array.isArray(parsedSnapNotes)) continue;

                        if (activeJuniorBooks.length === 0) {
                          const snapLwEntry = parsedSnapNotes.find((n: any) => typeof n === 'string' && n.startsWith('SNAPSHOT_LEHRWERKE:'));
                          if (snapLwEntry) {
                            try {
                              const rawJson = snapLwEntry.substring('SNAPSHOT_LEHRWERKE:'.length);
                              const parsedLw = JSON.parse(rawJson);
                              if (Array.isArray(parsedLw) && parsedLw.length > 0) {
                                parsedLw.forEach((lw: any) => {
                                  const title = cleanTitle(lw.title || '');
                                  const pages = Array.isArray(lw.pages) ? [...lw.pages].sort((a: number, b: number) => a - b) : [];
                                  if (title && pages.length > 0 && !activeJuniorBooks.some(b => b.title.toLowerCase() === title.toLowerCase())) {
                                    activeJuniorBooks.push({
                                      title,
                                      pages,
                                      formattedPages: pages.length === 1 ? `S. ${pages[0]}` : `S. ${pages[0]}–${pages[pages.length - 1]}`,
                                      notes: Array.isArray(lw.notes) ? lw.notes : []
                                    });
                                  }
                                });
                              }
                            } catch (e) {
                              console.warn('Error hydrating SNAPSHOT_LEHRWERKE in Junior:', e);
                            }
                          }
                        }

                        if (activeJuniorSongs.length === 0) {
                          const snapSongEntry = parsedSnapNotes.find((n: any) => typeof n === 'string' && n.startsWith('SNAPSHOT_SONGS:'));
                          if (snapSongEntry) {
                            try {
                              const rawJson = snapSongEntry.substring('SNAPSHOT_SONGS:'.length);
                              const parsedSongs = JSON.parse(rawJson);
                              if (Array.isArray(parsedSongs) && parsedSongs.length > 0) {
                                parsedSongs.forEach((song: any) => {
                                  const tName = cleanTitle(song.topic_name || song.title || '');
                                  if (tName && !activeJuniorSongs.some(s => cleanTitle(s.topic_name || s.title || '').toLowerCase() === tName.toLowerCase())) {
                                    activeJuniorSongs.push({
                                      ...song,
                                      topic_name: tName
                                    });
                                  }
                                });
                              }
                            } catch (e) {
                              console.warn('Error hydrating SNAPSHOT_SONGS in Junior:', e);
                            }
                          }
                        }

                        if (activeJuniorBooks.length > 0 && activeJuniorSongs.length > 0) break;
                      }
                    }

                    // 3. Notes & Audio
                    const currentWeekNotes: string[] = [];
                    (progressItems || []).forEach(item => {
                      const itemW = getItemWeek(item);
                      const isCurrentHwSnapshot = item.topic_name === 'Hausaufgabe KW ' + (currentWeekStr.split('-W')[1] || '') || itemW === currentWeekStr;
                      const isActive = Boolean(item.is_current_homework) || isCurrentHwSnapshot;
                      if (isActive && item.homework_notes && item.homework_notes.trim()) {
                        try {
                          const parsed = JSON.parse(item.homework_notes);
                          if (Array.isArray(parsed)) {
                            parsed.forEach((n: any) => {
                              if (typeof n === 'string' && n.trim() && !currentWeekNotes.includes(n.trim())) currentWeekNotes.push(n.trim());
                            });
                          } else if (typeof parsed === 'string' && parsed.trim() && !currentWeekNotes.includes(parsed.trim())) {
                            currentWeekNotes.push(parsed.trim());
                          }
                        } catch {
                          if (!currentWeekNotes.includes(item.homework_notes.trim())) currentWeekNotes.push(item.homework_notes.trim());
                        }
                      }
                    });

                    try {
                      const localGenNotes = localStorage.getItem(`campus_homework_notes_${studentId}`);
                      if (localGenNotes && localGenNotes.trim()) {
                        try {
                          const parsed = JSON.parse(localGenNotes);
                          if (Array.isArray(parsed)) {
                            parsed.forEach((n: any) => {
                              if (typeof n === 'string' && n.trim() && !currentWeekNotes.includes(n.trim())) currentWeekNotes.push(n.trim());
                            });
                          } else if (typeof parsed === 'string' && parsed.trim() && !currentWeekNotes.includes(parsed.trim())) {
                            currentWeekNotes.push(parsed.trim());
                          }
                        } catch {
                          if (!currentWeekNotes.includes(localGenNotes.trim())) currentWeekNotes.push(localGenNotes.trim());
                        }
                      }
                    } catch {}

                    const audioTracks: AudioTrackItem[] = [];
                    currentWeekNotes.forEach((n, idx) => {
                      if (n.startsWith('AUDIO:')) {
                        const parts = n.substring(6).split('|');
                        audioTracks.push({
                          url: parts[0],
                          duration: parseFloat(parts[1]) || 0,
                          date: parts[2],
                          label: parts[3] || `Aufnahme #${audioTracks.length + 1}`,
                          author: parts[4] || 'teacher',
                          songTag: parts[7] || undefined,
                          idx
                        });
                      }
                    });

                    // 🌉 Smart Audio Bridge: Bridge active practice tracks from latest past lesson if current week has none
                    if (audioTracks.length === 0 && (activeJuniorBooks.length > 0 || activeJuniorSongs.length > 0)) {
                      const pastHwSnapshots = (progressItems || []).filter((item: any) => {
                        if (!item.topic_name?.startsWith('Hausaufgabe KW ')) return false;
                        const itWeekIso = getItemWeek(item);
                        return itWeekIso && itWeekIso < currentWeekStr;
                      });
                      pastHwSnapshots.sort((a: any, b: any) => {
                        const wA = getItemWeek(a);
                        const wB = getItemWeek(b);
                        if (wA !== wB) return wB.localeCompare(wA);
                        const tA = new Date(a.updated_at || a.created_at || 0).getTime();
                        const tB = new Date(b.updated_at || b.created_at || 0).getTime();
                        return tB - tA;
                      });
                      const latestPast = pastHwSnapshots[0];
                      if (latestPast && latestPast.homework_notes) {
                        try {
                          const parsed = typeof latestPast.homework_notes === 'string' ? JSON.parse(latestPast.homework_notes) : latestPast.homework_notes;
                          if (Array.isArray(parsed)) {
                            parsed.forEach((item: string, index: number) => {
                              if (typeof item === 'string' && item.startsWith('AUDIO:')) {
                                const parts = item.substring(6).split('|');
                                audioTracks.push({
                                  url: parts[0],
                                  duration: parseFloat(parts[1]) || 0,
                                  date: parts[2],
                                  label: parts[3] || ('Aufnahme #' + (audioTracks.length + 1)),
                                  author: parts[4] || 'teacher',
                                  songTag: parts[7] || undefined,
                                  isCarriedOver: true,
                                  idx: index
                                });
                              }
                            });
                          }
                        } catch {}
                      }
                    }

                    const cleanGeneralNote = (text: string) => {
                      if (!text) return '';
                      let clean = text;
                      if (clean.startsWith('[') || clean.startsWith('{') || clean.startsWith('"')) {
                        try {
                          const p = JSON.parse(clean);
                          if (Array.isArray(p)) {
                            clean = p.filter((x: any) => typeof x === 'string' && !x.startsWith('AUDIO:') && !x.startsWith('STICKER:') && !x.startsWith('LATENCY:') && !x.startsWith('SNAPSHOT_') && !x.startsWith('FEEDBACK:') && !x.startsWith('STUDENT_NOTE_PUBLIC:') && !x.startsWith('STUDENT_NOTE_PRIVATE:') && !x.startsWith('STUDENT_QUESTION:')).join(' ');
                          } else if (typeof p === 'string') {
                            clean = p;
                          }
                        } catch {}
                      }
                      return clean
                        .replace(/\["AUDIO:[^"]*"\]/g, '')
                        .replace(/AUDIO:[^\s,|]+/g, '')
                        .replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE|STUDENT_QUESTION):[^|]*\|/, '')
                        .replace(/^STUDENT_QUESTION:[^|]*\|?/i, '')
                        .replace(/^❓\s*Frage für den Unterricht:\s*/i, '')
                        .trim();
                    };

                    let isPastNoteCarriedOver = false;
                    let generalNoteRaw = currentWeekNotes.find(n => !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.startsWith('LATENCY:') && !n.startsWith('SNAPSHOT_') && !n.startsWith('FEEDBACK:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:') && !n.startsWith('STUDENT_QUESTION:'));
                    if (!generalNoteRaw && (activeJuniorBooks.length > 0 || activeJuniorSongs.length > 0)) {
                      const pastHwSnapshots = (progressItems || []).filter((item: any) => {
                        if (!item.topic_name?.startsWith('Hausaufgabe KW ')) return false;
                        const itWeekIso = getItemWeek(item);
                        return itWeekIso && itWeekIso < currentWeekStr;
                      });
                      pastHwSnapshots.sort((a: any, b: any) => {
                        const wA = getItemWeek(a);
                        const wB = getItemWeek(b);
                        if (wA !== wB) return wB.localeCompare(wA);
                        const tA = new Date(a.updated_at || a.created_at || 0).getTime();
                        const tB = new Date(b.updated_at || b.created_at || 0).getTime();
                        return tB - tA;
                      });
                      const latestPast = pastHwSnapshots[0];
                      if (latestPast && latestPast.homework_notes) {
                        try {
                          const parsed = typeof latestPast.homework_notes === 'string' ? JSON.parse(latestPast.homework_notes) : latestPast.homework_notes;
                          if (Array.isArray(parsed)) {
                            const pastNote = parsed.find((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.startsWith('LATENCY:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('SNAPSHOT_') && !n.startsWith('FEEDBACK:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:') && !n.startsWith('STUDENT_QUESTION:'));
                            if (pastNote) {
                              generalNoteRaw = pastNote;
                              isPastNoteCarriedOver = true;
                            }
                          } else if (typeof parsed === 'string') {
                            generalNoteRaw = parsed;
                            isPastNoteCarriedOver = true;
                          }
                        } catch {}
                      }
                    }
                    const generalNote = generalNoteRaw ? cleanGeneralNote(generalNoteRaw) : '';

                    const isAudioCarriedOver = audioTracks.some(t => t.isCarriedOver);
                    const isCarriedOverPlan = isAudioCarriedOver || isPastNoteCarriedOver;

                    let studentQuestionRaw = currentWeekNotes.find(n => typeof n === 'string' && (n.startsWith('STUDENT_QUESTION:') || n.startsWith('❓ Frage für den Unterricht:')));
                    if (!studentQuestionRaw) {
                      const pastHwSnapshots = (progressItems || []).filter((item: any) => {
                        if (!item.topic_name?.startsWith('Hausaufgabe KW ')) return false;
                        const itWeekIso = getItemWeek(item);
                        return itWeekIso && itWeekIso < currentWeekStr;
                      });
                      pastHwSnapshots.sort((a: any, b: any) => {
                        const wA = getItemWeek(a);
                        const wB = getItemWeek(b);
                        if (wA !== wB) return wB.localeCompare(wA);
                        const tA = new Date(a.updated_at || a.created_at || 0).getTime();
                        const tB = new Date(b.updated_at || b.created_at || 0).getTime();
                        return tB - tA;
                      });
                      const latestPast = pastHwSnapshots[0];
                      if (latestPast && latestPast.homework_notes) {
                        try {
                          const parsed = typeof latestPast.homework_notes === 'string' ? JSON.parse(latestPast.homework_notes) : latestPast.homework_notes;
                          if (Array.isArray(parsed)) {
                            const pastQ = parsed.find((n: string) => typeof n === 'string' && (n.startsWith('STUDENT_QUESTION:') || n.startsWith('❓ Frage für den Unterricht:')));
                            if (pastQ) studentQuestionRaw = pastQ;
                          }
                        } catch {}
                      }
                    }

                    let studentQuestionText = '';
                    if (studentQuestionRaw) {
                      if (studentQuestionRaw.startsWith('STUDENT_QUESTION:')) {
                        const withoutPrefix = studentQuestionRaw.replace(/^STUDENT_QUESTION:/, '');
                        const pipeIdx = withoutPrefix.indexOf('|');
                        studentQuestionText = pipeIdx !== -1 ? withoutPrefix.slice(pipeIdx + 1).trim() : withoutPrefix.trim();
                      } else {
                        studentQuestionText = studentQuestionRaw.replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
                      }
                    }

                    let focusTitle = `${studentInstrumentName || 'Musik'}-Training`;
                    if (activeJuniorBooks.length > 0) {
                      focusTitle = `${activeJuniorBooks[0].title} (${activeJuniorBooks[0].formattedPages})`;
                    } else if (activeJuniorSongs.length > 0) {
                      focusTitle = cleanTitle(activeJuniorSongs[0]?.topic_name || activeJuniorSongs[0]?.title || 'Song');
                    }

                    const streak = avatar?.streak_flame || 0;
                    const levelKey = `level${effectiveLevel}` as 'level1' | 'level2' | 'level3';
                    const schoolConfig = (schoolFokusLevels && schoolFokusLevels[levelKey]) || DEFAULT_FOKUS_LEVELS[levelKey];
                    const kleineMins = schoolConfig.kleine || DEFAULT_FOKUS_LEVELS[levelKey].kleine;
                    const mittlereMins = schoolConfig.mittlere || DEFAULT_FOKUS_LEVELS[levelKey].mittlere;
                    const heldenMins = schoolConfig.helden || DEFAULT_FOKUS_LEVELS[levelKey].helden;
                    const requiredMins = streak >= 9 ? heldenMins : streak >= 4 ? mittlereMins : kleineMins;

                    return (
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', 
                        gap: '24px', 
                        width: '100%' 
                      }}>
                        
                        {/* HELDEN-KARTE 1: MEINE HAUSAUFGABE (mit integriertem Audio-Zugriff & TTS) */}
                        <div 
                          onClick={() => setShowJuniorHomeworkModal(true)}
                          style={{
                            background: isTtsSpeaking && activeTtsKey === 'junior_box1' ? 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)' : '#ffffff',
                            borderRadius: '32px',
                            padding: isMusicStandMode ? '32px' : '28px',
                            boxShadow: isTtsSpeaking && activeTtsKey === 'junior_box1' ? '0 16px 36px rgba(34, 197, 94, 0.16)' : '0 12px 30px rgba(15, 23, 42, 0.04)',
                            border: isTtsSpeaking && activeTtsKey === 'junior_box1' ? '2px solid #86efac' : '2px solid #e2e8f0',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '20px',
                            cursor: 'pointer',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                          className="hover-scale"
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                              <div style={{
                                background: 'linear-gradient(135deg, #e6f4ea 0%, #d1fae5 100%)',
                                color: '#34a853',
                                width: isMusicStandMode ? '64px' : '56px',
                                height: isMusicStandMode ? '64px' : '56px',
                                borderRadius: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 6px 16px rgba(52, 168, 83, 0.18)'
                              }}>
                                <BookOpen size={isMusicStandMode ? 32 : 28} />
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {/* 3D-TOY-BUTTON FÜR VORLESEN (Hör zu!) */}
                                {(draftAllowTts ?? (studentUser as any)?.parent_allow_tts ?? (studentUiLevel === 'junior')) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const narrative = buildContinuousHomeworkNarrative({
                                        teacherName: briefingData?.todayLesson?.teacher_name || (studentUser as any)?.teacher_name,
                                        instrument: studentUser?.instrument_type || (studentUser as any)?.instrument || avatar?.instrument_type,
                                        books: activeJuniorBooks.map(b => ({ 
                                          title: b.title, 
                                          formattedPages: b.formattedPages,
                                          pageNums: b.pages,
                                          notes: b.notes
                                        })),
                                        songs: activeJuniorSongs.map(s => ({ 
                                          title: cleanTitle(s.topic_name || s.title), 
                                          note: s.homework_notes || s.note 
                                        })),
                                        audioCount: audioTracks.length,
                                        generalNotes: generalNote
                                      });
                                      handleSpeakText(narrative, 'junior_box1');
                                    }}
                                    style={{
                                      background: isTtsSpeaking && activeTtsKey === 'junior_box1' 
                                        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                                        : 'linear-gradient(135deg, #34a853 0%, #2e9549 100%)',
                                      border: 'none',
                                      borderRadius: '100px',
                                      padding: '8px 16px',
                                      minHeight: '44px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      cursor: 'pointer',
                                      color: '#ffffff',
                                      fontSize: '0.84rem',
                                      fontWeight: 950,
                                      boxShadow: isTtsSpeaking && activeTtsKey === 'junior_box1' 
                                        ? '0 3px 0 #991b1b, 0 6px 14px rgba(239, 68, 68, 0.35)' 
                                        : '0 3px 0 #1e7037, 0 6px 14px rgba(52, 168, 83, 0.32)',
                                      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}
                                    title={isTtsSpeaking && activeTtsKey === 'junior_box1' ? "Vorlesen stoppen" : "Hausaufgaben vorlesen lassen"}
                                  >
                                    {isTtsSpeaking && activeTtsKey === 'junior_box1' ? (
                                      <span>Stopp ⏹</span>
                                    ) : (
                                      <>
                                        <Volume2 size={16} color="#ffffff" strokeWidth={2.8} />
                                        <span>Hör zu! ✨</span>
                                      </>
                                    )}
                                  </button>
                                )}

                                  {/* Audio-Pille direkt in Karte 1 */}
                                  {audioTracks.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenHomeworkBookWithView('document', 'recordings');
                                      }}
                                      style={{
                                        background: '#e6f4ea',
                                        border: '1.5px solid #c7eed2',
                                        borderRadius: '100px',
                                        padding: '8px 15px',
                                        minHeight: '44px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '7px',
                                        cursor: 'pointer',
                                        color: '#1e7037',
                                        fontSize: '0.84rem',
                                        fontWeight: 900,
                                        boxShadow: '0 2px 8px rgba(52, 168, 83, 0.12)',
                                        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                                      }}
                                      className="hover-scale-mini"
                                      title="Aufnahmen deiner Lehrkraft anhören"
                                    >
                                      <Headphones size={16} color="#1e7037" strokeWidth={2.4} />
                                      <span>{audioTracks.length === 1 ? '1 Aufnahme' : `${audioTracks.length} Aufnahmen`}</span>
                                    </button>
                                  )}

                                  {/* 1-Touch Metronom & Stimmgerät Direktzugriff */}
                                  {props.setShowStudentToolbox && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        props.setShowStudentToolbox(true);
                                      }}
                                      style={{
                                        background: '#ffffff',
                                        border: '1.5px solid #cbd5e1',
                                        borderRadius: '100px',
                                        padding: '8px 15px',
                                        minHeight: '44px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '7px',
                                        cursor: 'pointer',
                                        color: '#0f172a',
                                        fontSize: '0.84rem',
                                        fontWeight: 900,
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                                        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                                      }}
                                      className="hover-scale-mini"
                                      title="Praxis-Toolbox: Metronom & Stimmgerät öffnen"
                                    >
                                      <Timer size={16} color="#34a853" strokeWidth={2.4} />
                                      <span>Metronom</span>
                                    </button>
                                  )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                                <div style={{ fontSize: isMusicStandMode ? '0.92rem' : '0.84rem', fontWeight: 950, color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Hausaufgaben
                                </div>
                                {isCarriedOverPlan && (
                                  <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    background: '#f8fafc',
                                    border: '1px solid #cbd5e1',
                                    color: '#475569',
                                    borderRadius: '100px',
                                    padding: '2px 10px',
                                    fontSize: '0.72rem',
                                    fontWeight: 850,
                                    letterSpacing: '0.01em',
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
                                  }}>
                                    <RotateCcw size={10} color="#0284c7" strokeWidth={2.5} />
                                    <span>Fortlaufender Übeplan • Übertrag aus der Vorwoche</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Lehrwerke (harmonisiert wie im Teen-Widget) */}
                              {activeJuniorBooks.map((b, idx) => (
                                <div key={`j-b-${idx}`} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '8px',
                                  padding: '10px 14px',
                                  background: '#ffffff',
                                  border: '1px solid #f1f5f9',
                                  boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.04)',
                                  borderRadius: '14px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                    <div style={{
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '8px',
                                      background: '#fee2e2',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#dc2626',
                                      flexShrink: 0
                                    }}>
                                      <BookOpen size={14} strokeWidth={2.4} />
                                    </div>
                                    <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                      {b.title}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', flexShrink: 0 }}>
                                    {b.pages.map((pNum: number, pIdx: number) => {
                                      const taskId = `book-${b.title}-page-${pNum}`;
                                      const refl = taskReflections[taskId]?.status;
                                      return (
                                        <span key={`j-p-${pIdx}`} style={{
                                          fontSize: '0.82rem',
                                          fontWeight: 900,
                                          color: refl === 'super' ? '#15803d' : refl === 'wackelig' ? '#b45309' : refl === 'hilfe' ? '#b91c1c' : '#15803d',
                                          background: refl === 'super' ? '#dcfce7' : refl === 'wackelig' ? '#fef3c7' : refl === 'hilfe' ? '#fee2e2' : '#dcfce7',
                                          border: refl === 'super' ? '1px solid #86efac' : refl === 'wackelig' ? '1px solid #fde68a' : refl === 'hilfe' ? '1px solid #fca5a5' : '1px solid #bbf7d0',
                                          padding: '3px 9px',
                                          borderRadius: '7px',
                                          flexShrink: 0,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}>
                                          <span>S. {pNum}</span>
                                          {refl === 'super' && <Check size={12} strokeWidth={3} />}
                                          {refl === 'wackelig' && <AlertTriangle size={12} strokeWidth={2.5} />}
                                          {refl === 'hilfe' && <HelpCircle size={12} strokeWidth={2.5} />}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}

                              {/* Songs (harmonisiert wie im Teen-Widget) */}
                              {activeJuniorSongs.map((s, idx) => {
                                const songTitle = cleanTitle(s.topic_name || s.title || 'Song');
                                const taskId = `song-${s.id || s.topic_name || s.title || idx}`;
                                const refl = taskReflections[taskId]?.status;
                                return (
                                  <div key={`j-s-${idx}`} style={{
                                    background: '#ffffff',
                                    border: '1px solid #f1f5f9',
                                    boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.04)',
                                    padding: '10px 14px',
                                    borderRadius: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                      <div style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '8px',
                                        background: '#ede9fe',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#7c3aed',
                                        flexShrink: 0
                                      }}>
                                        <Music size={14} strokeWidth={2.4} />
                                      </div>
                                      <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {songTitle}
                                      </span>
                                    </div>
                                    {refl && (
                                      <span style={{
                                        fontSize: '0.74rem',
                                        fontWeight: 850,
                                        padding: '3px 8px',
                                        borderRadius: '100px',
                                        background: refl === 'super' ? '#dcfce7' : refl === 'wackelig' ? '#fef3c7' : '#fee2e2',
                                        color: refl === 'super' ? '#15803d' : refl === 'wackelig' ? '#b45309' : '#b91c1c',
                                        border: refl === 'super' ? '1px solid #86efac' : refl === 'wackelig' ? '1px solid #fde68a' : '1px solid #fca5a5',
                                        flexShrink: 0,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}>
                                        {refl === 'super' ? <Check size={11} strokeWidth={3} /> : refl === 'wackelig' ? <AlertTriangle size={11} strokeWidth={2.5} /> : <HelpCircle size={11} strokeWidth={2.5} />}
                                        <span>{refl === 'super' ? 'Läuft' : refl === 'wackelig' ? 'Wackelig' : 'Hilfe'}</span>
                                      </span>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Zusätzliche Bemerkung */}
                              {generalNote && generalNote.trim().toLowerCase() !== 'zusätzliche bemerkung' && (
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontSize: '0.88rem', color: '#334155', fontWeight: 600, paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                                  <FileText size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                                  <strong style={{ color: '#15803d', fontWeight: 850, flexShrink: 0 }}>Zusätzliche Bemerkung:</strong>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{generalNote}</span>
                                </div>
                              )}

                              {/* Frage des Schülers für die Stunde */}
                              {studentQuestionText && (
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontSize: '0.88rem', color: '#1e40af', fontWeight: 600, paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                                  <HelpCircle size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
                                  <strong style={{ color: '#2563eb', fontWeight: 850, flexShrink: 0 }}>Deine Frage für die Stunde:</strong>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{studentQuestionText}</span>
                                </div>
                              )}

                              {/* Audio-Karussell direkt in der Heldenkarte (Volle Parität mit Desktop-Schülervorschau) */}
                              {audioTracks.length > 0 && (
                                <div style={{ paddingTop: '4px' }}>
                                  <AudioTrackCarousel
                                    tracks={audioTracks}
                                    readOnly={true}
                                    isTeacher={false}
                                    activeTopicContext="Hausaufgabe"
                                    defaultExpanded={true}
                                    isCarriedOver={isAudioCarriedOver}
                                    hideCarriedOverBadge={true}
                                  />
                                </div>
                              )}

                              {/* Wenn weder noch */}
                              {activeJuniorBooks.length === 0 && activeJuniorSongs.length === 0 && (
                                <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                  Keine offenen Aufgaben für diese Woche erfasst
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setShowJuniorHomeworkModal(true); }}
                            style={{
                              width: '100%',
                              padding: isMusicStandMode ? '18px' : '16px',
                              minHeight: '48px',
                              borderRadius: '20px',
                              border: 'none',
                              background: 'linear-gradient(135deg, #34a853 0%, #2e9549 100%)',
                              color: '#ffffff',
                              fontSize: isMusicStandMode ? '1.15rem' : '1.05rem',
                              fontWeight: 950,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '10px',
                              boxShadow: '0 6px 18px rgba(52, 168, 83, 0.28)'
                            }}
                            className="hover-scale"
                          >
                            <BookOpen size={isMusicStandMode ? 20 : 18} />
                            <span>Hausaufgaben öffnen</span>
                          </button>
                        </div>

                        {/* HELDEN-KARTE 2: MEINE ÜBE-RAKETE (Schnellzugriff Übe-Pfad & Kosmische Mission) */}
                        {(() => {
                          const streak = avatar?.streak_flame || 0;
                          const levelKey = `level${effectiveLevel}` as 'level1' | 'level2' | 'level3';
                          const schoolConfig = (schoolFokusLevels && schoolFokusLevels[levelKey]) || DEFAULT_FOKUS_LEVELS[levelKey];
                          const kleineMins = schoolConfig.kleine || DEFAULT_FOKUS_LEVELS[levelKey].kleine;
                          const mittlereMins = schoolConfig.mittlere || DEFAULT_FOKUS_LEVELS[levelKey].mittlere;
                          const heldenMins = schoolConfig.helden || DEFAULT_FOKUS_LEVELS[levelKey].helden;
                          const requiredMins = streak >= 9 ? (schoolConfig.helden || 10) : streak >= 4 ? (schoolConfig.mittlere || 5) : (schoolConfig.kleine || 3);

                          const todayStr = toLocalYYYYMMDD(new Date());
                          const todayLogs = (fokusLogs || []).filter((log: any) => log.created_at && toLocalYYYYMMDD(new Date(log.created_at)) === todayStr);
                          const dbTodaySecs = todayLogs.reduce((sum: number, log: any) => sum + (log.duration_seconds || ((log.duration_minutes || 0) * 60)), 0);
                          const liveTodaySecs = sessionActive ? secondsElapsed : 0;
                          const totalTodaySecs = dbTodaySecs + liveTodaySecs;
                          const todayMins = Math.floor(totalTodaySecs / 60);
                          const isGoalAchieved = totalTodaySecs >= (requiredMins * 60);
                          const hasPracticedSome = totalTodaySecs > 0;
                          const progressPercent = Math.min(100, Math.round((totalTodaySecs / (requiredMins * 60)) * 100));

                          return (
                            <div 
                              onClick={() => handleTabChangeLocal('practice_board')}
                              style={{
                                background: '#ffffff',
                                borderRadius: '32px',
                                padding: isMusicStandMode ? '32px' : '28px',
                                boxShadow: isGoalAchieved ? '0 12px 32px rgba(99, 102, 241, 0.12)' : '0 12px 30px rgba(99, 102, 241, 0.06)',
                                border: isGoalAchieved ? '2px solid rgba(129, 140, 248, 0.45)' : '2px solid rgba(99, 102, 241, 0.25)',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '20px',
                                cursor: 'pointer',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                              }}
                              className="hover-scale"
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{
                                    background: isGoalAchieved ? 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)' : 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                                    color: isGoalAchieved ? '#7c3aed' : '#4f46e5',
                                    width: isMusicStandMode ? '64px' : '56px',
                                    height: isMusicStandMode ? '64px' : '56px',
                                    borderRadius: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: isGoalAchieved ? '0 6px 16px rgba(124, 58, 237, 0.25)' : '0 6px 16px rgba(99, 102, 241, 0.2)'
                                  }}>
                                    {isGoalAchieved ? (
                                      <Star size={isMusicStandMode ? 32 : 28} fill="currentColor" />
                                    ) : (
                                      <Rocket size={isMusicStandMode ? 32 : 28} />
                                    )}
                                  </div>

                                  <span style={{
                                    background: isGoalAchieved ? '#f5f3ff' : '#eef2ff',
                                    color: isGoalAchieved ? '#6d28d9' : '#4f46e5',
                                    fontSize: isMusicStandMode ? '0.92rem' : '0.84rem',
                                    fontWeight: 900,
                                    padding: isMusicStandMode ? '6px 14px' : '5px 12px',
                                    borderRadius: '100px',
                                    border: isGoalAchieved ? '1.5px solid #ddd6fe' : '1.5px solid #c7d2fe',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}>
                                    {isGoalAchieved ? (
                                      <>
                                        <span>{streak === 0 ? 'Startklar' : streak} {streak === 1 ? 'Tag' : 'Tage'} • Stern gesichert</span>
                                        <Check size={14} strokeWidth={3} color="#6d28d9" style={{ flexShrink: 0 }} />
                                      </>
                                    ) : (
                                      <span>{streak === 0 ? 'Startklar' : `${streak} ${streak === 1 ? 'Tag' : 'Tage'} Serie`}</span>
                                    )}
                                  </span>
                                </div>

                                <div>
                                  <div style={{ fontSize: isMusicStandMode ? '0.92rem' : '0.84rem', fontWeight: 900, color: isGoalAchieved ? '#7c3aed' : '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Übe-Rakete
                                  </div>
                                  <h3 style={{ margin: '4px 0 0 0', fontSize: isMusicStandMode ? '1.55rem' : '1.38rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                                    {isGoalAchieved 
                                      ? 'Tages-Stern entzündet!' 
                                      : `Tagesziel: ${requiredMins} Minuten`}
                                  </h3>
                                  <p style={{ margin: '4px 0 0 0', fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', color: isGoalAchieved ? '#5b21b6' : '#64748b', fontWeight: 650, lineHeight: 1.4 }}>
                                    {isGoalAchieved 
                                      ? `Heute ${todayMins} Min. geübt • Dein Stern leuchtet sicher!` 
                                      : hasPracticedSome 
                                        ? `${todayMins} von ${requiredMins} Min. geschafft` 
                                        : `${requiredMins} Min. üben & Stern entzünden`}
                                  </p>

                                  {/* Progress bar */}
                                  <div style={{ marginTop: '12px', width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '100px', overflow: 'hidden' }}>
                                    <div style={{
                                      width: `${progressPercent}%`,
                                      height: '100%',
                                      background: isGoalAchieved 
                                        ? 'linear-gradient(90deg, #818cf8 0%, #6366f1 50%, #c084fc 100%)' 
                                        : 'linear-gradient(90deg, #818cf8 0%, #6366f1 100%)',
                                      borderRadius: '100px',
                                      transition: 'width 0.4s ease'
                                    }} />
                                  </div>
                                </div>
                              </div>

                              {/* Sternen-Stufe Status & Zielzeit (Pädagogische Auto-Progression) */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                background: '#f5f3ff',
                                borderRadius: '16px',
                                border: '1.5px solid #e0e7ff',
                                fontSize: '0.86rem',
                                fontWeight: 900
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Star size={16} fill="#6366f1" color="#6366f1" style={{ flexShrink: 0 }} />
                                  <span style={{ color: '#4338ca' }}>
                                    {streak >= 9 ? 'Sternen-Königsstufe' : streak >= 4 ? 'Sternen-Stufe 2' : 'Sternen-Stufe 1'}
                                  </span>
                                </div>
                                <span style={{
                                  background: '#ede9fe',
                                  color: '#6d28d9',
                                  padding: '4px 10px',
                                  borderRadius: '100px',
                                  border: '1px solid #ddd6fe'
                                }}>
                                  {requiredMins} Min. Sternen-Ziel
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  handleTabChangeLocal('practice_board');
                                  if (sessionActive) {
                                    setJuniorMissionPhase('zen');
                                  } else {
                                    setShowJuniorPreFlightModal(true);
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  padding: isMusicStandMode ? '18px 22px' : '16px 20px',
                                  minHeight: '48px',
                                  boxSizing: 'border-box',
                                  borderRadius: '20px',
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                  color: '#ffffff',
                                  fontSize: isMusicStandMode ? '1.12rem' : '1.02rem',
                                  fontWeight: 900,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  whiteSpace: 'nowrap',
                                  boxShadow: '0 8px 20px rgba(99, 102, 241, 0.32)',
                                  transition: 'all 0.2s ease'
                                }}
                                className="hover-scale"
                              >
                                {sessionActive ? (
                                  <>
                                    <Rocket size={18} fill="white" color="white" />
                                    <span>Mission läuft • Zur Rakete 🚀</span>
                                  </>
                                ) : isGoalAchieved ? (
                                  <>
                                    <Sparkles size={18} fill="white" color="white" />
                                    <span>Weiterüben (+Bonus XP)</span>
                                  </>
                                ) : (
                                  <>
                                    <Rocket size={18} fill="white" color="white" />
                                    <span>{hasPracticedSome ? 'Rakete weiterfliegen' : 'Rakete zünden & Üben'}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })()}

                        {/* HELDEN-KARTE 3: MEIN STICKER-ALBUM (Belohnung & Meilenstein) */}
                        {(() => {
                          const totalStickersCount = (typeof ALL_STICKERS !== 'undefined' && ALL_STICKERS?.length) ? ALL_STICKERS.length : 20;
                          const unlockedStickersCount = (ALL_STICKERS || []).filter(st => unifiedStickersMap[st.id]?.isUnlocked).length;
                          const nextLockedSticker = (ALL_STICKERS || []).find(st => !unifiedStickersMap[st.id]?.isUnlocked) || (ALL_STICKERS || [])[0];
                          const nextStickerStatus = nextLockedSticker ? unifiedStickersMap[nextLockedSticker.id] : null;

                          // Laser-Synchronous progress percentage towards THIS next milestone sticker (matches Karte B 1:1)
                          const nextStickerProgressPercent = (() => {
                            if (!nextLockedSticker) return 100;
                            if (nextLockedSticker.category === 'ueben') {
                              const target = nextLockedSticker.id === 'fleiss-pionier' ? 20 : nextLockedSticker.id === 'uebe-meister' ? 100 : nextLockedSticker.id === 'uebe-legende' ? 500 : 1500;
                              const prev = nextLockedSticker.id === 'fleiss-pionier' ? 0 : nextLockedSticker.id === 'uebe-meister' ? 20 : nextLockedSticker.id === 'uebe-legende' ? 100 : 500;
                              return Math.min(100, Math.max(0, Math.round(((effectivePracticeMinutes - prev) / (target - prev)) * 100)));
                            }
                            if (nextLockedSticker.category === 'xp') {
                              const target = nextLockedSticker.id === 'xp-sammler' ? 100 : nextLockedSticker.id === 'xp-champion' ? 500 : nextLockedSticker.id === 'xp-meister' ? 1500 : 3500;
                              const prev = nextLockedSticker.id === 'xp-sammler' ? 0 : nextLockedSticker.id === 'xp-champion' ? 100 : nextLockedSticker.id === 'xp-meister' ? 500 : 1500;
                              return Math.min(100, Math.max(0, Math.round((((avatar?.xp || 0) - prev) / (target - prev)) * 100)));
                            }
                            if (nextLockedSticker.category === 'streaks') {
                              const target = nextLockedSticker.id === 'dranbleiber' ? 3 : nextLockedSticker.id === 'wochen-held' ? 7 : nextLockedSticker.id === 'streak-koenig' ? 21 : 30;
                              const prev = nextLockedSticker.id === 'dranbleiber' ? 0 : nextLockedSticker.id === 'wochen-held' ? 3 : nextLockedSticker.id === 'streak-koenig' ? 7 : 21;
                              return Math.min(100, Math.max(0, Math.round((((avatar?.streak_flame || 0) - prev) / (target - prev)) * 100)));
                            }
                            if (nextLockedSticker.category === 'songs') {
                              const target = nextLockedSticker.id === 'erster-erfolg' ? 1 : nextLockedSticker.id === 'song-sammler' ? 3 : nextLockedSticker.id === 'repertoire-riese' ? 5 : 10;
                              const prev = nextLockedSticker.id === 'erster-erfolg' ? 0 : nextLockedSticker.id === 'song-sammler' ? 1 : nextLockedSticker.id === 'repertoire-riese' ? 3 : 5;
                              return Math.min(100, Math.max(0, Math.round((((songStats?.masteredCount || 0) - prev) / (target - prev)) * 100)));
                            }
                            return 100;
                          })();

                          return (
                            <div 
                              onClick={() => setShowJuniorStickerModal(true)}
                              style={{
                                background: '#ffffff',
                                borderRadius: '32px',
                                padding: isMusicStandMode ? '32px' : '28px',
                                boxShadow: '0 12px 30px rgba(15, 23, 42, 0.04)',
                                border: '2px solid rgba(245, 158, 11, 0.35)',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '20px',
                                cursor: 'pointer',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                              }}
                              className="hover-scale"
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{
                                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                    color: '#d97706',
                                    width: isMusicStandMode ? '64px' : '56px',
                                    height: isMusicStandMode ? '64px' : '56px',
                                    borderRadius: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 6px 16px rgba(245, 158, 11, 0.18)'
                                  }}>
                                    <Trophy size={isMusicStandMode ? 32 : 28} color="#d97706" />
                                  </div>

                                  <span style={{
                                    background: '#fef3c7',
                                    color: '#b45309',
                                    fontSize: isMusicStandMode ? '0.92rem' : '0.84rem',
                                    fontWeight: 900,
                                    padding: isMusicStandMode ? '6px 14px' : '5px 12px',
                                    borderRadius: '100px',
                                    border: '1px solid #fde68a',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    ★ {unlockedStickersCount} von {totalStickersCount} gesammelt
                                  </span>
                                </div>

                                <div>
                                  <div style={{ fontSize: isMusicStandMode ? '0.92rem' : '0.84rem', fontWeight: 900, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Sammelalbum
                                  </div>
                                  <h3 style={{ margin: '4px 0 0 0', fontSize: isMusicStandMode ? '1.55rem' : '1.38rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                                    {nextLockedSticker ? `Nächster: ${nextLockedSticker.title}` : 'Alle Sticker gesammelt! 🌟'}
                                  </h3>
                                  <p style={{ margin: '4px 0 0 0', fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', color: '#64748b', fontWeight: 650, lineHeight: 1.4 }}>
                                    {nextStickerStatus?.progressText || nextLockedSticker?.desc || 'Öffne dein Sammelalbum und entdecke deine Meilensteine!'}
                                  </p>

                                  {/* Progress bar (100% Synchron zu Karte B) */}
                                  <div style={{ marginTop: '12px', width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '100px', overflow: 'hidden' }}>
                                    <div style={{
                                      width: `${nextStickerProgressPercent}%`,
                                      height: '100%',
                                      background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                                      borderRadius: '100px',
                                      transition: 'width 0.4s ease'
                                    }} />
                                  </div>
                                </div>
                              </div>

                              {/* Teaser Pill for next sticker with REAL collectible sticker graphic */}
                              {nextLockedSticker && (
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  padding: '10px 14px',
                                  background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
                                  borderRadius: '18px',
                                  border: '1.5px solid #fde68a',
                                  boxShadow: '0 3px 10px rgba(245, 158, 11, 0.08)'
                                }}>
                                  <div style={{
                                    width: isMusicStandMode ? '52px' : '44px',
                                    height: isMusicStandMode ? '52px' : '44px',
                                    borderRadius: '14px',
                                    background: '#0a0e1a',
                                    border: '1.5px solid #f59e0b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '3px',
                                    flexShrink: 0,
                                    boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
                                    overflow: 'hidden'
                                  }}>
                                    <img
                                      src={`/stickers/${nextLockedSticker.id}.png`}
                                      alt={nextLockedSticker.title}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                        borderRadius: '10px',
                                        filter: 'drop-shadow(0 2px 4px rgba(255,255,255,0.15))'
                                      }}
                                      onError={(e) => {
                                        (e.currentTarget as any).style.display = 'none';
                                        if (e.currentTarget.parentElement) {
                                          e.currentTarget.parentElement.innerText = nextLockedSticker.emoji;
                                        }
                                      }}
                                    />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.70rem', fontWeight: 950, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                      {nextLockedSticker.rarityLabel || 'Auszeichnung'}
                                    </div>
                                    <div style={{ fontSize: isMusicStandMode ? '1.02rem' : '0.94rem', fontWeight: 950, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {nextLockedSticker.title}
                                    </div>
                                  </div>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setShowJuniorStickerModal(true); }}
                                style={{
                                  width: '100%',
                                  padding: isMusicStandMode ? '18px 22px' : '16px 20px',
                                  minHeight: '48px',
                                  boxSizing: 'border-box',
                                  borderRadius: '20px',
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                  color: '#ffffff',
                                  fontSize: isMusicStandMode ? '1.12rem' : '1.02rem',
                                  fontWeight: 950,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '10px',
                                  whiteSpace: 'nowrap',
                                  boxShadow: '0 8px 20px rgba(217, 119, 6, 0.28)',
                                  transition: 'all 0.2s ease'
                                }}
                                className="hover-scale"
                              >
                                <Trophy size={18} fill="white" color="white" />
                                <span>Sticker-Album öffnen</span>
                              </button>
                            </div>
                          );
                        })()}

                      </div>
                    );
                  })()}

                  {/* ========================================================================= */}
                  {/* MODAL 1: JUNIOR HAUSAUFGABEN-MASKE                                        */}
                  {/* ========================================================================= */}
                  {showJuniorHomeworkModal && (
                    <div style={{
                      position: 'fixed',
                      inset: 0,
                      background: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(12px)',
                      zIndex: 99999,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px'
                    }}>
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '32px',
                        maxWidth: '600px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        padding: '32px',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.22)',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '22px'
                      }}>
                        <button
                          onClick={() => {
                            handleStopSpeaking();
                            setShowJuniorHomeworkModal(false);
                          }}
                          style={{
                            position: 'absolute',
                            top: '22px',
                            right: '22px',
                            background: '#f1f5f9',
                            border: 'none',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#64748b',
                            transition: 'all 0.15s ease'
                          }}
                          className="hover-scale"
                        >
                          <X size={20} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{
                            background: 'linear-gradient(135deg, #e6f4ea 0%, #d1fae5 100%)',
                            color: '#34a853',
                            width: '48px',
                            height: '48px',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(52, 168, 83, 0.15)'
                          }}>
                            <BookOpen size={24} strokeWidth={2.4} />
                          </div>
                          <div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 950, color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Mein Aufgabenheft
                            </span>
                            <h2 style={{ margin: '2px 0 0 0', fontSize: '1.35rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                              Deine aktuellen Aufgaben 🎵
                            </h2>
                          </div>
                        </div>

                        {(() => {
                          const { formattedJuniorBooks, otherActiveSongs, audioTracks, generalNote, studentQuestionText, hasAnyHomework } = getJuniorWeeklyHomeworkSummary();
                          const cleanTitle = (t: string) => (t || '').replace(/linken park/gi, 'Linkin Park').replace(/\s*\((gitarre|guitar|e-gitarre|bass|e-bass|drums|schlagzeug|klavier|piano|keys|keyboard|vocals|gesang|stimme|allgemein)\)/i, '');

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              {hasAnyHomework ? (
                                <>
                                  {/* KINDERGERECHTE 3D-VORLESE-LEISTE */}
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '14px 20px',
                                    background: isTtsSpeaking && activeTtsKey === 'junior_modal' 
                                      ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' 
                                      : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                                    borderRadius: '24px',
                                    border: isTtsSpeaking && activeTtsKey === 'junior_modal' ? '2px solid #fca5a5' : '2px solid #86efac',
                                    gap: '14px',
                                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.04)',
                                    transition: 'all 0.2s ease'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <div style={{
                                        width: '42px',
                                        height: '42px',
                                        borderRadius: '14px',
                                        background: isTtsSpeaking && activeTtsKey === 'junior_modal' 
                                          ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                                          : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: isTtsSpeaking && activeTtsKey === 'junior_modal' 
                                          ? '0 4px 10px rgba(239, 68, 68, 0.3)' 
                                          : '0 4px 10px rgba(34, 197, 94, 0.3)',
                                        flexShrink: 0
                                      }}>
                                        {isTtsSpeaking && activeTtsKey === 'junior_modal' ? (
                                          <VolumeX size={22} strokeWidth={2.6} />
                                        ) : (
                                          <Volume2 size={22} strokeWidth={2.6} />
                                        )}
                                      </div>

                                      <div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                          {isTtsSpeaking && activeTtsKey === 'junior_modal' ? 'Liest deine Aufgaben vor... 🎧' : 'Lass es dir einfach vorlesen! ✨'}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginTop: '1px' }}>
                                          {isTtsSpeaking && activeTtsKey === 'junior_modal' ? 'Tippe auf Stopp zum Anhalten' : 'Höre dir alle Hausaufgaben als Audio an'}
                                        </div>
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <button
                                      type="button"
                                      onClick={() => {
                                        if (isTtsSpeaking && activeTtsKey === 'junior_modal') {
                                          handleStopSpeaking();
                                        } else {
                                          const narrative = buildContinuousHomeworkNarrative({
                                            teacherName: briefingData?.todayLesson?.teacher_name || (studentUser as any)?.teacher_name,
                                            instrument: studentUser?.instrument_type || (studentUser as any)?.instrument || avatar?.instrument_type,
                                            books: formattedJuniorBooks.map(b => ({
                                              title: b.title,
                                              pageNums: b.pageNums,
                                              notes: b.notesList ? b.notesList.map((n: any) => n.text) : []
                                            })),
                                            songs: otherActiveSongs.map(s => ({
                                              title: cleanTitle(s.topic_name || s.title),
                                              note: s.homework_notes
                                            })),
                                            audioCount: audioTracks.length,
                                            generalNotes: generalNote
                                          });
                                          handleSpeakText(narrative, 'junior_modal');
                                        }
                                      }}
                                      style={{
                                        background: isTtsSpeaking && activeTtsKey === 'junior_modal' 
                                          ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                                          : 'linear-gradient(135deg, #34a853 0%, #2e9549 100%)',
                                        color: '#ffffff',
                                        border: 'none',
                                        padding: '11px 20px',
                                        borderRadius: '16px',
                                        fontSize: '0.90rem',
                                        fontWeight: 950,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: isTtsSpeaking && activeTtsKey === 'junior_modal' 
                                          ? '0 4px 0 #991b1b, 0 8px 18px rgba(239, 68, 68, 0.4)' 
                                          : '0 4px 0 #1e7037, 0 8px 18px rgba(52, 168, 83, 0.32)',
                                        transform: isTtsSpeaking && activeTtsKey === 'junior_modal' ? 'translateY(2px)' : 'none',
                                        flexShrink: 0,
                                        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.filter = 'brightness(1.06)';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.filter = 'none';
                                        e.currentTarget.style.transform = isTtsSpeaking && activeTtsKey === 'junior_modal' ? 'translateY(2px)' : 'none';
                                      }}
                                      onMouseDown={(e) => {
                                        e.currentTarget.style.transform = 'translateY(3px)';
                                        e.currentTarget.style.boxShadow = isTtsSpeaking && activeTtsKey === 'junior_modal' ? '0 1px 0 #991b1b' : '0 1px 0 #1e7037';
                                      }}
                                      onMouseUp={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = isTtsSpeaking && activeTtsKey === 'junior_modal' 
                                          ? '0 4px 0 #991b1b, 0 8px 18px rgba(239, 68, 68, 0.4)' 
                                          : '0 4px 0 #1e7037, 0 8px 18px rgba(52, 168, 83, 0.32)';
                                      }}
                                      title={isTtsSpeaking && activeTtsKey === 'junior_modal' ? "Vorlesen stoppen" : "Hausaufgaben vorlesen lassen"}
                                    >
                                      {isTtsSpeaking && activeTtsKey === 'junior_modal' ? (
                                        <>
                                          <VolumeX size={18} color="#ffffff" strokeWidth={2.8} />
                                          <span>Stopp ⏹</span>
                                        </>
                                      ) : (
                                        <>
                                          <Volume2 size={18} color="#ffffff" strokeWidth={2.8} />
                                          <span>Vorlesen 🔊</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>

                                  <div style={{
                                    background: '#ffffff',
                                    borderRadius: '24px',
                                    padding: '20px 24px',
                                    border: '1.5px solid #f1f5f9',
                                    boxShadow: '0 8px 24px -4px rgba(0,0,0,0.06)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px'
                                  }}>
                                    {/* Lehrwerke / Bücher Liste */}
                                    {formattedJuniorBooks.map((bookItem, idx) => (
                                      <div key={`j-modal-book-${idx}`} style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        padding: '12px 14px',
                                        background: '#ffffff',
                                        border: '1px solid #f1f5f9',
                                        boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.04)',
                                        borderRadius: '14px'
                                      }}>
                                        {/* Book Header */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                            <div style={{
                                              width: '28px',
                                              height: '28px',
                                              borderRadius: '8px',
                                              background: '#fee2e2',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              color: '#dc2626',
                                              flexShrink: 0
                                            }}>
                                              <BookOpen size={14} strokeWidth={2.4} />
                                            </div>
                                            <span style={{ fontSize: '1.02rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                              {bookItem.title}
                                            </span>
                                          </div>

                                          {/* Individual Page Pills */}
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                                            {bookItem.pageNums.map((pNum: any) => (
                                              <span key={`p-${pNum}`} style={{
                                                background: '#dcfce7',
                                                color: '#15803d',
                                                fontSize: '0.80rem',
                                                fontWeight: 900,
                                                padding: '3px 9px',
                                                borderRadius: '7px',
                                                border: '1px solid #bbf7d0',
                                                flexShrink: 0
                                              }}>
                                                S. {pNum}
                                              </span>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Direct Page Notes */}
                                        {bookItem.notesList && bookItem.notesList.length > 0 && (
                                          <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px',
                                            marginLeft: '38px',
                                            marginTop: '2px'
                                          }}>
                                            {bookItem.notesList.map((n: any, nIdx: number) => (
                                              <div key={`j-n-${nIdx}`} style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600, lineHeight: 1.4 }}>
                                                <strong style={{ color: '#dc2626', fontWeight: 850 }}>S. {n.num}:</strong> {n.text}
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Interactive Page Reflection Rows */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '38px', marginTop: '6px' }}>
                                          {bookItem.pageNums.map((pNum: any) => {
                                            const taskId = `book-${bookItem.title}-page-${pNum}`;
                                            const pageLabel = `${bookItem.title} S. ${pNum}`;
                                            const refl = taskReflections[taskId]?.status;
                                            return (
                                              <div key={`j-page-row-${pNum}`} style={{
                                                background: refl === 'super' ? '#f0fdf4' : refl === 'wackelig' ? '#fffbeb' : refl === 'hilfe' ? '#fef2f2' : '#f8fafc',
                                                border: refl === 'super' ? '1.5px solid #86efac' : refl === 'wackelig' ? '1.5px solid #fde68a' : refl === 'hilfe' ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
                                                borderRadius: '16px',
                                                padding: '10px 14px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px',
                                                transition: 'all 0.2s ease'
                                              }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                  <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a' }}>
                                                    📖 Seite {pNum}
                                                  </span>
                                                  {refl && (
                                                    <span style={{
                                                      fontSize: '0.74rem',
                                                      fontWeight: 900,
                                                      padding: '2px 8px',
                                                      borderRadius: '100px',
                                                      background: refl === 'super' ? '#dcfce7' : refl === 'wackelig' ? '#fef3c7' : '#fee2e2',
                                                      color: refl === 'super' ? '#15803d' : refl === 'wackelig' ? '#b45309' : '#b91c1c'
                                                    }}>
                                                      {refl === 'super' ? '🟢 Läuft super!' : refl === 'wackelig' ? '🟡 Noch wackelig' : '🔴 Brauche Hilfe'}
                                                    </span>
                                                  )}
                                                </div>
                                                {renderReflectionPills(taskId, pageLabel)}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}

                                    {/* Songs Liste */}
                                    {otherActiveSongs.map((item, idx) => {
                                      const songTitle = cleanTitle(item.topic_name || item.title);
                                      const taskId = `song-${item.id || item.topic_name || item.title || idx}`;
                                      const refl = taskReflections[taskId]?.status;
                                      return (
                                        <div key={`j-modal-song-${idx}`} style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '8px',
                                          padding: '14px 16px',
                                          background: refl === 'super' ? '#f0fdf4' : refl === 'wackelig' ? '#fffbeb' : refl === 'hilfe' ? '#fef2f2' : '#ffffff',
                                          border: refl === 'super' ? '1.5px solid #86efac' : refl === 'wackelig' ? '1.5px solid #fde68a' : refl === 'hilfe' ? '1.5px solid #fca5a5' : '1px solid #f1f5f9',
                                          boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.04)',
                                          borderRadius: '16px',
                                          transition: 'all 0.2s ease'
                                        }}>
                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                              <div style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '10px',
                                                background: '#ede9fe',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#7c3aed',
                                                flexShrink: 0
                                              }}>
                                                <Music size={16} strokeWidth={2.4} />
                                              </div>

                                              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {songTitle}
                                              </span>
                                            </div>

                                            {refl && (
                                              <span style={{
                                                fontSize: '0.76rem',
                                                fontWeight: 900,
                                                padding: '3px 10px',
                                                borderRadius: '100px',
                                                background: refl === 'super' ? '#dcfce7' : refl === 'wackelig' ? '#fef3c7' : '#fee2e2',
                                                color: refl === 'super' ? '#15803d' : refl === 'wackelig' ? '#b45309' : '#b91c1c',
                                                border: refl === 'super' ? '1px solid #86efac' : refl === 'wackelig' ? '1px solid #fde68a' : '1px solid #fca5a5',
                                                flexShrink: 0
                                              }}>
                                                {refl === 'super' ? '🟢 Läuft super!' : refl === 'wackelig' ? '🟡 Noch wackelig' : '🔴 Brauche Hilfe'}
                                              </span>
                                            )}
                                          </div>

                                          {item.homework_notes && (
                                            <div style={{ marginLeft: '42px', fontSize: '0.86rem', color: '#475569', fontWeight: 600, lineHeight: 1.4 }}>
                                              <span style={{ color: '#6366f1', fontWeight: 850 }}>🚀 Fahrplan:</span> {item.homework_notes}
                                            </div>
                                          )}

                                          <div style={{ marginLeft: '42px' }}>
                                            {renderReflectionPills(taskId, songTitle)}
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {/* Audio Tracks */}
                                    {audioTracks.length > 0 && (
                                      <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                        paddingTop: (formattedJuniorBooks.length > 0 || otherActiveSongs.length > 0) ? '4px' : '0'
                                      }}>
                                        <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <Headphones size={13} />
                                          <span>Unterrichtsaufnahmen ({audioTracks.length})</span>
                                        </div>
                                        <AudioTrackCarousel tracks={audioTracks} isTeacher={true} readOnly={true} />
                                      </div>
                                    )}

                                    {/* General Note */}
                                    {generalNote && (
                                      <div style={{
                                        marginTop: '4px',
                                        padding: '12px 14px',
                                        background: '#f8fafc',
                                        borderRadius: '14px',
                                        border: '1px solid #e2e8f0',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '8px',
                                        fontSize: '0.86rem',
                                        color: '#334155',
                                        fontWeight: 600
                                      }}>
                                        <FileText size={16} color="#15803d" style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <div>
                                          <strong style={{ color: '#15803d', fontWeight: 850 }}>Hinweis:</strong> {generalNote}
                                        </div>
                                      </div>
                                    )}

                                    {/* Student Question */}
                                    {studentQuestionText && (
                                      <div style={{
                                        marginTop: '4px',
                                        padding: '12px 14px',
                                        background: '#eff6ff',
                                        borderRadius: '14px',
                                        border: '1px solid #bfdbfe',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '8px',
                                        fontSize: '0.86rem',
                                        color: '#1e40af',
                                        fontWeight: 600
                                      }}>
                                        <HelpCircle size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <div>
                                          <strong style={{ color: '#2563eb', fontWeight: 850 }}>Deine Frage für den Unterricht:</strong> {studentQuestionText}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div style={{ padding: '30px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: '24px', border: '1.5px dashed #cbd5e1' }}>
                                  <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>🎉</div>
                                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 950, color: '#0f172a' }}>
                                    Keine offenen Aufgaben
                                  </h3>
                                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', fontWeight: 650 }}>
                                    Du hast für diese Woche alles erledigt oder kannst frei üben!
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        <button
                          onClick={() => {
                            handleStopSpeaking();
                            setShowJuniorHomeworkModal(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '16px 20px',
                            borderRadius: '20px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                            color: '#ffffff',
                            fontSize: '1.05rem',
                            fontWeight: 950,
                            cursor: 'pointer',
                            marginTop: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            boxShadow: '0 8px 24px rgba(34, 197, 94, 0.28)',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                          className="hover-scale"
                        >
                          <span>🚀 Verstanden & Jetzt loslegen!</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* MODAL 2: JUNIOR ÜBE-TIMER OVERLAY (MINIMALPRINZIP)                         */}
                  {/* ========================================================================= */}
                  {showJuniorTimerModal && (
                    <div style={{
                      position: 'fixed',
                      inset: 0,
                      background: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(16px)',
                      zIndex: 99999,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px'
                    }}>
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '40px',
                        maxWidth: '520px',
                        width: '100%',
                        padding: '40px 32px',
                        boxShadow: '0 30px 70px rgba(0, 0, 0, 0.3)',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '28px',
                        textAlign: 'center'
                      }}>
                        <button
                          onClick={() => {
                            if (sessionActive) {
                              const streak = avatar?.streak_flame || 0;
                              const targetMins = getTargetMinutes(streak);
                              const targetSecs = targetMins * 60;
                              if (secondsElapsed < targetSecs) {
                                const minsLeft = Math.max(1, Math.ceil((targetSecs - secondsElapsed) / 60));
                                if (window.confirm(`Möchtest du den Fokus-Timer wirklich abbrechen? Bis zum Tagesziel fehlen noch ${minsLeft} Min. Bei einem vorzeitigen Abbruch werden keine Übe-Minuten verbucht.`)) {
                                  finishPracticeSession();
                                  setShowJuniorTimerModal(false);
                                }
                              } else {
                                finishPracticeSession();
                                setShowJuniorTimerModal(false);
                              }
                            } else {
                              setShowJuniorTimerModal(false);
                            }
                          }}
                          style={{
                            position: 'absolute',
                            top: '24px',
                            right: '24px',
                            background: '#f1f5f9',
                            border: 'none',
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#64748b'
                          }}
                        >
                          <X size={24} />
                        </button>

                        <div>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: isExtraTime ? '#dcfce7' : '#eef2ff',
                            color: isExtraTime ? '#15803d' : '#4f46e5',
                            padding: '6px 18px',
                            borderRadius: '100px',
                            fontSize: '0.85rem',
                            fontWeight: 950,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase'
                          }}>
                            {isExtraTime ? '🎉 FREIE ÜBEZEIT' : '🚀 FOKUS-TIMER'}
                          </div>
                          <h2 style={{ margin: '10px 0 0 0', fontSize: '1.8rem', fontWeight: 950, color: '#0f172a' }}>
                            {isExtraTime ? 'Mega Leistung!' : 'Schnapp dir dein Instrument!'}
                          </h2>
                        </div>

                        {/* ⏳ 10-Sekunden Puffer-Banner bei Pause in freier Übezeit */}
                        {isExtraTime && isGraceActive && (
                          <div style={{
                            background: '#fffbeb',
                            border: '2px solid #f59e0b',
                            borderRadius: '18px',
                            padding: '10px 18px',
                            color: '#92400e',
                            fontSize: '0.88rem',
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            animation: 'pulse 1s infinite alternate'
                          }}>
                            <span>⏳ 10s Puffer: Noch {graceSecondsLeft}s Zeit zum Weiterspielen!</span>
                          </div>
                        )}

                        {/* Flammen-Stufe Status-Pille (Pädagogische Auto-Progression) */}
                        {!sessionActive && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            background: '#f8fafc',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '18px',
                            padding: '10px 22px',
                            color: '#1e293b',
                            fontSize: '0.92rem',
                            fontWeight: 900
                          }}>
                            {(() => {
                              const streak = avatar?.streak_flame || 0;
                              const targetMins = getTargetMinutes(streak);
                              return (
                                <>
                                  <span style={{ fontSize: '1.1rem' }}>{streak >= 9 ? '👑' : streak >= 4 ? '🔥🔥' : '🔥'}</span>
                                  <span>Flammen-Stufe {streak >= 9 ? '3 (Königsstufe)' : streak >= 4 ? '2 (Flammen-Stufe)' : '1 (Start-Stufe)'}:</span>
                                  <span style={{ color: '#15803d', fontWeight: 950 }}>{targetMins} Min. Fokus-Ziel</span>
                                </>
                              );
                            })()}
                          </div>
                        )}

                        {/* Runder Countdown-Ring */}
                        {(() => {
                          const streak = avatar?.streak_flame || 0;
                          const targetMins = getTargetMinutes(streak);
                          const targetSecs = targetMins * 60;
                          const secs = secondsElapsed;
                          const displayMins = String(Math.floor(secs / 60)).padStart(2, '0');
                          const displaySecs = String(secs % 60).padStart(2, '0');

                          const progress = Math.min(1, secs / targetSecs);
                          const circleRadius = 100;
                          const circumference = 2 * Math.PI * circleRadius;
                          const strokeDashoffset = circumference - (progress * circumference);

                          return (
                            <div style={{ position: 'relative', width: 'clamp(180px, 60vw, 230px)', height: 'clamp(180px, 60vw, 230px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg viewBox="0 0 230 230" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                <circle
                                  cx="115"
                                  cy="115"
                                  r={circleRadius}
                                  stroke="#f1f5f9"
                                  strokeWidth="16"
                                  fill="transparent"
                                />
                                <circle
                                  cx="115"
                                  cy="115"
                                  r={circleRadius}
                                  stroke={isExtraTime ? '#10b981' : '#6366f1'}
                                  strokeWidth="16"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={strokeDashoffset}
                                  strokeLinecap="round"
                                  fill="transparent"
                                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                                />
                              </svg>

                              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '2.8rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                  {displayMins}:{displaySecs}
                                </span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b' }}>
                                  {isExtraTime ? 'Bonus-Minuten' : `Ziel: ${targetMins} Min.`}
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Start / Stop Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                          {!sessionActive ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSessionActive(true);
                                setIsPhoneFlat(true);
                              }}
                              style={{
                                width: '100%',
                                padding: '20px',
                                minHeight: '48px',
                                borderRadius: '22px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                color: '#ffffff',
                                fontSize: '1.25rem',
                                fontWeight: 950,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                boxShadow: '0 12px 25px rgba(99, 102, 241, 0.4)'
                              }}
                              className="hover-scale"
                            >
                              <Play size={26} fill="currentColor" />
                              <span>Jetzt Timer starten! ▶️</span>
                            </button>
                          ) : isExtraTime ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  // Keep practicing (Open-End Flow)
                                }}
                                style={{
                                  width: '100%',
                                  padding: '18px',
                                  minHeight: '48px',
                                  borderRadius: '20px',
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                  color: '#ffffff',
                                  fontSize: '1.15rem',
                                  fontWeight: 950,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '10px',
                                  boxShadow: '0 10px 25px rgba(5, 150, 105, 0.35)'
                                }}
                                className="hover-scale"
                              >
                                <Sparkles size={22} fill="white" />
                                <span>Weiterüben (+Bonus XP) 🚀</span>
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  await finishPracticeSession();
                                  setShowJuniorTimerModal(false);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '14px',
                                  minHeight: '44px',
                                  borderRadius: '16px',
                                  border: '1.5px solid #cbd5e1',
                                  background: '#ffffff',
                                  color: '#475569',
                                  fontSize: '0.95rem',
                                  fontWeight: 900,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px'
                                }}
                                className="hover-scale"
                              >
                                <Check size={18} />
                                <span>Fertig! Session beenden 🏁</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={async () => {
                                await finishPracticeSession();
                                setShowJuniorTimerModal(false);
                              }}
                              style={{
                                width: '100%',
                                padding: '20px',
                                minHeight: '48px',
                                borderRadius: '22px',
                                border: 'none',
                                background: '#0f172a',
                                color: '#ffffff',
                                fontSize: '1.15rem',
                                fontWeight: 950,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)'
                              }}
                              className="hover-scale"
                            >
                              <Check size={24} />
                              <span>Fertig! Session beenden 🏁</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* MODAL 3: JUNIOR AUFNAHME STARTEN (3-2-1 + MIKROFON)                       */}
                  {/* ========================================================================= */}
                  {showJuniorRecordModal && (
                    <div style={{
                      position: 'fixed',
                      inset: 0,
                      background: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(16px)',
                      zIndex: 99999,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px'
                    }}>
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '40px',
                        maxWidth: '520px',
                        width: '100%',
                        padding: '40px 32px',
                        boxShadow: '0 30px 70px rgba(0, 0, 0, 0.3)',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '24px',
                        textAlign: 'center'
                      }}>
                        <button
                          onClick={cancelJuniorRecording}
                          style={{
                            position: 'absolute',
                            top: '24px',
                            right: '24px',
                            background: '#f1f5f9',
                            border: 'none',
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#64748b'
                          }}
                        >
                          <X size={24} />
                        </button>

                        {/* STUFE 1: 3-2-1 COUNTDOWN */}
                        {juniorCountdown !== null && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '24px 0' }}>
                            <span style={{ fontSize: '1.05rem', fontWeight: 950, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Mach dich bereit! 🎶
                            </span>
                            <div
                              key={`cd-${juniorCountdown}`}
                              style={{
                                fontSize: '6.5rem',
                                fontWeight: 950,
                                color: '#ef4444',
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                lineHeight: 1,
                                animation: 'countdownPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                              }}
                            >
                              {juniorCountdown}
                            </div>
                            <span style={{ fontSize: '0.92rem', color: '#64748b', fontWeight: 700 }}>
                              Aufnahme startet gleich...
                            </span>
                          </div>
                        )}

                        {/* STUFE 2: LIVE-AUFNAHME LÄUFT */}
                        {juniorIsRecording && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', width: '100%', padding: '20px 0' }}>
                            <div style={{
                              width: '120px',
                              height: '120px',
                              borderRadius: '50%',
                              background: '#fee2e2',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 0 0 16px rgba(239, 68, 68, 0.2)',
                              animation: 'pulse 1.5s infinite'
                            }}>
                              <Mic size={54} color="#ef4444" />
                            </div>

                            <div>
                              <div style={{ fontSize: '2.5rem', fontWeight: 950, color: '#ef4444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                {String(Math.floor(juniorRecordDuration / 60)).padStart(2, '0')}:{String(juniorRecordDuration % 60).padStart(2, '0')}
                              </div>
                              <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 700 }}>
                                🔴 Aufnahme läuft... Spiel dein Bestes!
                              </span>
                            </div>

                            <button
                              onClick={stopJuniorRecording}
                              style={{
                                width: '100%',
                                padding: '20px',
                                borderRadius: '22px',
                                border: 'none',
                                background: '#ef4444',
                                color: '#ffffff',
                                fontSize: '1.25rem',
                                fontWeight: 950,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                boxShadow: '0 12px 25px rgba(239, 68, 68, 0.4)'
                              }}
                              className="hover-scale"
                            >
                              <span>⏹️ Stopp & Speichern</span>
                            </button>
                          </div>
                        )}

                        {/* STUFE 3: AUFNAHME FERTIG (VORSCHAU & SPEICHERN) - MAGIC JUNIOR (6-10 JAHRE) */}
                        {!juniorIsRecording && juniorCountdown === null && juniorRecordedUrl && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', width: '100%' }}>
                            
                            {/* 1. Freundlicher Hero-Bereich */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                              <div style={{
                                width: '68px',
                                height: '68px',
                                borderRadius: '22px',
                                background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                                color: '#15803d',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 8px 20px rgba(34, 197, 94, 0.2)'
                              }}>
                                <Sparkles size={34} />
                              </div>

                              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em', textAlign: 'center' }}>
                                Klasse gespielt! 🎉
                              </h3>
                            </div>

                            {/* 2. Heller, kinderfreundlicher Audio-Player */}
                            <div style={{
                              width: '100%',
                              background: '#f8fafc',
                              border: '2px solid #e2e8f0',
                              borderRadius: '20px',
                              padding: '14px 16px',
                              boxSizing: 'border-box',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '14px'
                            }}>
                              {/* Big Play / Pause Button */}
                              <button
                                type="button"
                                onClick={togglePlayJuniorPreview}
                                style={{
                                  width: '48px',
                                  height: '48px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                  border: 'none',
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 6px 14px rgba(34, 197, 94, 0.35)',
                                  flexShrink: 0,
                                  transition: 'transform 0.15s ease'
                                }}
                                className="hover-scale"
                              >
                                {juniorPreviewPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" style={{ marginLeft: '2px' }} />}
                              </button>

                              {/* Progress Track & Time */}
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#15803d' }}>
                                    {juniorPreviewPlaying ? '🔊 Spielt ab...' : 'Aufnahme anhören'}
                                  </span>
                                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', fontFamily: 'monospace' }}>
                                    {String(Math.floor(juniorPreviewCurrentTime / 60)).padStart(2, '0')}:{String(Math.floor(juniorPreviewCurrentTime % 60)).padStart(2, '0')} / {String(Math.floor((juniorPreviewDuration || juniorRecordDuration) / 60)).padStart(2, '0')}:{String(Math.floor((juniorPreviewDuration || juniorRecordDuration) % 60)).padStart(2, '0')}
                                  </span>
                                </div>

                                <div 
                                  onClick={(e) => {
                                    if (juniorPreviewAudioRef.current && (juniorPreviewDuration || juniorRecordDuration)) {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const clickX = e.clientX - rect.left;
                                      const newPct = Math.max(0, Math.min(1, clickX / rect.width));
                                      const newTime = newPct * (juniorPreviewDuration || juniorRecordDuration);
                                      juniorPreviewAudioRef.current.currentTime = newTime;
                                      setJuniorPreviewCurrentTime(newTime);
                                    }
                                  }}
                                  style={{
                                    width: '100%',
                                    height: '8px',
                                    background: '#e2e8f0',
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    position: 'relative'
                                  }}
                                >
                                  <div style={{
                                    width: `${Math.min(100, (juniorPreviewCurrentTime / (juniorPreviewDuration || juniorRecordDuration || 1)) * 100)}%`,
                                    height: '100%',
                                    background: '#22c55e',
                                    borderRadius: '6px',
                                    transition: 'width 0.1s linear'
                                  }} />
                                </div>
                              </div>
                            </div>

                            {/* 3. Titel-Feld (Mit klarem Label & kinderleichter Editierbarkeit) */}
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                              <label style={{ fontSize: '0.80rem', fontWeight: 900, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                <Pencil size={14} color="#16a34a" /> Name deiner Aufnahme:
                              </label>
                              <div style={{ width: '100%', position: 'relative' }}>
                                <input
                                  type="text"
                                  value={juniorRecordTitle}
                                  onChange={(e) => setJuniorRecordTitle(e.target.value)}
                                  placeholder="z. B. Mein Gitarren-Solo"
                                  style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    paddingLeft: '44px',
                                    paddingRight: juniorRecordTitle ? '40px' : '16px',
                                    borderRadius: '16px',
                                    border: '2px solid #cbd5e1',
                                    background: '#ffffff',
                                    fontSize: '1.02rem',
                                    fontWeight: 800,
                                    color: '#0f172a',
                                    boxSizing: 'border-box',
                                    outline: 'none',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onFocus={(e) => {
                                    e.currentTarget.style.borderColor = '#22c55e';
                                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(34, 197, 94, 0.15)';
                                  }}
                                  onBlur={(e) => {
                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)';
                                  }}
                                />
                                <div style={{
                                  position: 'absolute',
                                  left: '15px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  color: '#16a34a',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}>
                                  <Music size={19} />
                                </div>
                                {juniorRecordTitle && (
                                  <button
                                    type="button"
                                    onClick={() => setJuniorRecordTitle('')}
                                    title="Titel leeren"
                                    style={{
                                      position: 'absolute',
                                      right: '12px',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      background: '#f1f5f9',
                                      border: 'none',
                                      borderRadius: '50%',
                                      width: '24px',
                                      height: '24px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      color: '#64748b',
                                      fontSize: '0.75rem',
                                      fontWeight: 900
                                    }}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                                💡 Tippe in das Feld, um deiner Aufnahme einen eigenen Namen zu geben.
                              </span>
                            </div>

                            {/* 4. Klare Kinder-Buttons */}
                            <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '2px' }}>
                              <button
                                onClick={startJuniorRecordingFlow}
                                style={{
                                  flex: 1,
                                  padding: '15px',
                                  borderRadius: '18px',
                                  border: '2px solid #e2e8f0',
                                  background: '#ffffff',
                                  color: '#64748b',
                                  fontSize: '0.96rem',
                                  fontWeight: 850,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px'
                                }}
                                className="hover-scale"
                              >
                                <RotateCcw size={17} />
                                <span>Nochmal</span>
                              </button>

                              <button
                                onClick={saveJuniorRecording}
                                disabled={juniorIsSaving}
                                style={{
                                  flex: 1.8,
                                  padding: '15px 18px',
                                  borderRadius: '18px',
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                  color: '#ffffff',
                                  fontSize: '1.02rem',
                                  fontWeight: 950,
                                  cursor: juniorIsSaving ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  boxShadow: '0 8px 20px rgba(34, 197, 94, 0.35)'
                                }}
                                className="hover-scale"
                              >
                                <Check size={20} strokeWidth={3} />
                                <span>{juniorIsSaving ? 'Speichere...' : 'Fertig! Speichern'}</span>
                              </button>
                            </div>

                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* MODAL 4: JUNIOR MEINE AUFNAHMEN (KASSETTEN-/COVER-PLAYLIST)               */}
                  {/* ========================================================================= */}
                  {showJuniorRecordingsModal && (
                    <div style={{
                      position: 'fixed',
                      inset: 0,
                      background: 'rgba(15, 23, 42, 0.8)',
                      backdropFilter: 'blur(14px)',
                      zIndex: 99999,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px'
                    }}>
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '36px',
                        maxWidth: '700px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        padding: '36px',
                        boxShadow: '0 30px 70px rgba(0, 0, 0, 0.25)',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px'
                      }}>
                        <button
                          onClick={() => {
                            if (juniorAudioPlayerRef.current) {
                              juniorAudioPlayerRef.current.pause();
                              juniorAudioPlayerRef.current = null;
                            }
                            setJuniorActivePlayingAudioId(null);
                            setShowJuniorRecordingsModal(false);
                          }}
                          style={{
                            position: 'absolute',
                            top: '24px',
                            right: '24px',
                            background: '#f1f5f9',
                            border: 'none',
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#64748b'
                          }}
                        >
                          <X size={24} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{
                            background: '#ede9fe',
                            color: '#7c3aed',
                            width: '56px',
                            height: '56px',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 6px 16px rgba(124, 58, 237, 0.15)'
                          }}>
                            <Headphones size={30} />
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 950, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Unterrichts-Mediathek
                            </span>
                            <h2 style={{ margin: '2px 0 0 0', fontSize: '1.55rem', fontWeight: 950, color: '#0f172a' }}>
                              Alle Lehrer-Aufnahmen 🎧
                            </h2>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 700 }}>
                              {briefingData?.todayLesson?.teacher_name ? `Eingespielt von ${briefingData.todayLesson.teacher_name}` : 'Hörbeispiele & Play-Alongs aus deinem Unterricht'}
                            </p>
                          </div>
                        </div>

                        {/* Lehrer-Aufnahmen Playlist */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {juniorTeacherRecordings.length > 0 ? (
                            juniorTeacherRecordings.map((rec) => {
                              const isPlaying = juniorActivePlayingAudioId === rec.id;
                              return (
                                <div key={rec.id} style={{
                                  background: isPlaying ? '#f5f3ff' : '#f8fafc',
                                  border: isPlaying ? '2px solid #a78bfa' : '2px solid #e2e8f0',
                                  borderRadius: '24px',
                                  padding: '18px 22px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '16px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                                    <button
                                      onClick={() => togglePlayJuniorRecording(rec.id, rec.url, rec.blobKey)}
                                      style={{
                                        background: isPlaying ? '#7c3aed' : '#16a34a',
                                        color: '#ffffff',
                                        border: 'none',
                                        width: '50px',
                                        height: '50px',
                                        borderRadius: '18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: isPlaying ? '0 6px 16px rgba(124, 58, 237, 0.35)' : '0 6px 16px rgba(22, 163, 74, 0.3)',
                                        flexShrink: 0
                                      }}
                                      className="hover-scale"
                                      title={isPlaying ? "Pause" : "Abspielen"}
                                    >
                                      {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
                                    </button>

                                    <div style={{ overflow: 'hidden' }}>
                                      <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 950, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {rec.title}
                                      </h4>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '3px' }}>
                                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
                                          📅 {new Date(rec.date).toLocaleDateString('de-DE')} {rec.duration ? `• ${rec.duration} Sek.` : ''}
                                        </span>
                                        {rec.topic && rec.topic !== rec.title && (
                                          <span style={{
                                            background: '#f1f5f9',
                                            color: '#475569',
                                            fontSize: '0.72rem',
                                            fontWeight: 800,
                                            padding: '2px 8px',
                                            borderRadius: '6px'
                                          }}>
                                            {rec.topic}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                    <button
                                      onClick={() => downloadJuniorRecording(rec)}
                                      style={{
                                        background: '#f1f5f9',
                                        border: 'none',
                                        color: '#334155',
                                        cursor: 'pointer',
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.15s ease'
                                      }}
                                      className="hover-scale"
                                      title="Aufnahme herunterladen"
                                    >
                                      <Download size={18} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎧</div>
                              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 950, color: '#0f172a' }}>
                                Noch keine Lehrer-Aufnahmen vorhanden
                              </h3>
                              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 650 }}>
                                Deine Lehrkraft hat noch keine Audio-Dateien im Unterricht hinterlegt. Sobald neue Hörbeispiele oder Aufgaben aufgenommen werden, findest du sie hier!
                              </p>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            if (juniorAudioPlayerRef.current) {
                              juniorAudioPlayerRef.current.pause();
                              juniorAudioPlayerRef.current = null;
                            }
                            setJuniorActivePlayingAudioId(null);
                            setShowJuniorRecordingsModal(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '18px',
                            borderRadius: '20px',
                            border: 'none',
                            background: '#0f172a',
                            color: '#ffffff',
                            fontSize: '1.05rem',
                            fontWeight: 950,
                            cursor: 'pointer',
                            marginTop: '10px'
                          }}
                        >
                          Schließen 👍
                        </button>
                      </div>
                    </div>
                  )}

                </>
              )}

              {/* ========================================================================= */}
              {/* LEVEL 2: TEEN (11-15 JAHRE) - HARMONISCH, JUGENDFREUNDLICH & DEUTSCH       */}
              {/* ========================================================================= */}
              {studentUiLevel === 'teen' && (
                <>
                  {/* TEEN: 4 HARMONISCHE KPIS */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(180px, 1fr))', 
                    gap: isMobile ? '10px' : '16px', 
                    width: '100%' 
                  }}>
                    {/* KPI 1: XP-Punkte */}
                    {xpActive && (
                      <div style={{ 
                        flex: '1 1 0px',
                        minWidth: 0,
                        position: 'relative', overflow: 'hidden',
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        color: 'white',
                        borderRadius: '20px',
                        boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.35)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        minHeight: '70px',
                        padding: '16px',
                        boxSizing: 'border-box',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1px solid rgba(255, 255, 255, 0.15)'
                      }} className="hover-scale">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                          <span style={{ 
                            fontSize: '0.68rem', 
                            fontWeight: 900, 
                            opacity: 0.95, 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.08em',
                            color: 'white'
                          }}>
                            XP-Punkte ⚡
                          </span>
                          <div style={{ 
                            background: 'rgba(255, 255, 255, 0.2)', 
                            padding: '6px', 
                            borderRadius: '10px' 
                          }}>
                            <Star size={14} color="white" fill="white" />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
                          <span style={{ 
                            fontSize: '1.6rem', 
                            fontWeight: 950, 
                            fontFamily: "'Plus Jakarta Sans', sans-serif", 
                            letterSpacing: '-0.02em',
                            color: 'white'
                          }}>
                            {currentXp || 0}
                          </span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.9, color: 'white' }}>
                            XP
                          </span>
                        </div>
                      </div>
                    )}

                    {/* KPI 2: Songs & Stücke */}
                    <div style={{ 
                      flex: '1 1 0px',
                      minWidth: 0,
                      position: 'relative', overflow: 'hidden',
                      background: 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)',
                      color: 'white',
                      borderRadius: '20px',
                      boxShadow: '0 10px 25px -5px rgba(52, 168, 83, 0.35)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      minHeight: '70px',
                      padding: '16px',
                      boxSizing: 'border-box',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid rgba(255, 255, 255, 0.15)'
                    }} className="hover-scale">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <span style={{ 
                          fontSize: '0.68rem', 
                          fontWeight: 900, 
                          opacity: 0.95, 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.08em',
                          color: 'white'
                        }}>
                          Songs &amp; Stücke
                        </span>
                        <div style={{ 
                          background: 'rgba(255, 255, 255, 0.2)', 
                          padding: '6px', 
                          borderRadius: '10px' 
                        }}>
                          <Music size={14} color="white" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
                        <span style={{ 
                          fontSize: '1.6rem', 
                          fontWeight: 950, 
                          fontFamily: "'Plus Jakarta Sans', sans-serif", 
                          letterSpacing: '-0.02em',
                          color: 'white'
                        }}>
                          {songStats.masteredCount}/{songStats.assignedCount}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.9, color: 'white' }}>
                          Songs
                        </span>
                      </div>
                    </div>

                    {/* KPI 3: Übeminuten */}
                    <div style={{ 
                      flex: '1 1 0px',
                      minWidth: 0,
                      position: 'relative', overflow: 'hidden',
                      background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
                      color: '#0f172a',
                      borderRadius: '20px',
                      boxShadow: '0 10px 25px -5px rgba(234, 179, 8, 0.35)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      minHeight: '70px',
                      padding: '16px',
                      boxSizing: 'border-box',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid rgba(255, 255, 255, 0.3)'
                    }} className="hover-scale">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <span style={{ 
                          fontSize: '0.68rem', 
                          fontWeight: 900, 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.08em',
                          color: '#78350f'
                        }}>
                          Übeminuten
                        </span>
                        <div style={{ 
                          background: 'rgba(0, 0, 0, 0.12)', 
                          padding: '6px', 
                          borderRadius: '10px' 
                        }}>
                          <Clock size={14} color="#451a03" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
                        {(() => {
                          const dbSecs = (fokusLogs || []).reduce((sum, log) => sum + getExactLogSeconds(log), 0);
                          const liveSecs = sessionActive ? secondsElapsed : 0;
                          const totalSecs = dbSecs + liveSecs;
                          if (totalSecs > 0 && totalSecs < 60) {
                            return (
                              <>
                                <span style={{ 
                                  fontSize: '1.6rem', 
                                  fontWeight: 950, 
                                  fontFamily: "'Plus Jakarta Sans', sans-serif", 
                                  letterSpacing: '-0.02em',
                                  color: '#0f172a'
                                }}>
                                  {Math.round(totalSecs)}
                                </span>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#78350f' }}>
                                  Sek.
                                </span>
                              </>
                            );
                          }
                          return (
                            <>
                              <span style={{ 
                                fontSize: '1.6rem', 
                                fontWeight: 950, 
                                fontFamily: "'Plus Jakarta Sans', sans-serif", 
                                letterSpacing: '-0.02em',
                                color: '#0f172a'
                              }}>
                                {secondsToDisplayMinutes(totalSecs)}
                              </span>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#78350f' }}>
                                Min.
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* KPI 4: Tagesserie (Ruby Flame) */}
                    {flamesActive && (
                      <div style={{ 
                        flex: '1 1 0px',
                        minWidth: 0,
                        position: 'relative', overflow: 'hidden',
                        background: 'linear-gradient(135deg, #ff4b4b 0%, #dc2626 100%)',
                        color: 'white',
                        borderRadius: '20px',
                        boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.35)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        minHeight: '70px',
                        padding: '16px',
                        boxSizing: 'border-box',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                      }} className="hover-scale">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                          <span style={{ 
                            fontSize: '0.68rem', 
                            fontWeight: 900, 
                            opacity: 0.95, 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.08em',
                            color: 'white'
                          }}>
                            Tagesserie
                          </span>
                          <div style={{ 
                            background: 'rgba(255, 255, 255, 0.25)', 
                            padding: '6px', 
                            borderRadius: '10px' 
                          }}>
                            <Flame size={14} color="white" fill="white" />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
                          {(avatar?.streak_flame || 0) === 0 ? (
                            <>
                              <span style={{ 
                                fontSize: '1.25rem', 
                                fontWeight: 950, 
                                fontFamily: "'Plus Jakarta Sans', sans-serif", 
                                letterSpacing: '-0.02em',
                                color: 'white'
                              }}>
                                Startklar
                              </span>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.95, color: 'white' }}>
                                Tag 1
                              </span>
                            </>
                          ) : (
                            <>
                              <span style={{ 
                                fontSize: '1.6rem', 
                                fontWeight: 950, 
                                fontFamily: "'Plus Jakarta Sans', sans-serif", 
                                letterSpacing: '-0.02em',
                                color: 'white'
                              }}>
                                {avatar?.streak_flame}
                              </span>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.95, color: 'white' }}>
                                {avatar?.streak_flame === 1 ? 'Tag' : 'Tage'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TEEN: HERO-DECK */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.65) 100%)',
                    backdropFilter: 'blur(24px) saturate(1.8)',
                    WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                    borderRadius: '24px',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: 'stretch',
                    boxShadow: '0 15px 40px rgba(15, 23, 42, 0.04)',
                    width: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    position: 'relative',
                    minHeight: isMobile ? 'auto' : '190px'
                  }}>
                    <div style={{
                      width: isMobile ? '100%' : '180px',
                      height: isMobile ? '150px' : 'auto',
                      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                      position: 'relative',
                      overflow: 'hidden',
                      borderRight: isMobile ? 'none' : '1px solid rgba(0, 0, 0, 0.1)',
                      borderBottom: isMobile ? '1px solid rgba(0, 0, 0, 0.1)' : 'none'
                    }}>
                      <img 
                        src={resolveCampusStudentAvatar({ ...studentUser, instrument: studentInstrumentName || studentUser?.instrument })} 
                        alt="" 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          zIndex: 2,
                          transform: 'scale(1.05)',
                          transition: 'transform 0.5s ease'
                        }} 
                        className="hover-zoom"
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, flex: 1, zIndex: 2, padding: '24px 32px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{
                          background: '#e0e7ff',
                          color: '#4f46e5',
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          borderRadius: '100px',
                          padding: '4px 12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          border: '1px solid #c7d2fe'
                        }}>
                          ⚡ TEEN LEVEL • 11–15 JAHRE
                        </div>
                      </div>

                      <h3 style={{ 
                        margin: 0, 
                        fontSize: '28px', 
                        fontWeight: 950, 
                        color: '#0f172a', 
                        fontFamily: "'Plus Jakarta Sans', sans-serif", 
                        lineHeight: 1.1,
                        letterSpacing: '-0.02em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span>Hi {studentUser?.first_name || 'Musiker'}!</span>
                        <Headphones size={24} color="#0f172a" style={{ opacity: 0.85 }} />
                      </h3>
                      
                      {(() => {
                        const instName = studentInstrumentName || 'an deinem Instrument';
                        const instPrep = ['Gitarre', 'Blockflöte', 'Querflöte', 'Violine', 'Geige', 'Bratsche', 'Posaune', 'Trompete', 'Harfe', 'Ukulele'].some(w => instName.toLowerCase().includes(w.toLowerCase()))
                          ? `an der ${instName}`
                          : ['Klavier', 'Schlagzeug', 'Cello', 'Saxophon', 'Akkordeon', 'Keyboard', 'Horn', 'Fagott'].some(w => instName.toLowerCase().includes(w.toLowerCase()))
                          ? `am ${instName}`
                          : `an deinem Instrument`;

                        return (
                          <p style={{ 
                            margin: '8px 0 0 0', 
                            fontSize: isMusicStandMode ? '1.10rem' : '0.96rem', 
                            color: '#475569', 
                            fontWeight: 650, 
                            lineHeight: 1.45, 
                            maxWidth: '95%' 
                          }}>
                            Track deine Songs, halte deinen Streak &amp; hol dir XP! 🎸
                          </p>
                        );
                      })()}

                      {(() => {
                        const nextOcc = (scheduleOccurrences || [])[0] || (schoolYearOccurrences || [])[0];
                        const hasToday = !!briefingData?.todayLesson;
                        const teacherId = hasToday ? briefingData.todayLesson.teacher_id : (nextOcc?.teacher_id || studentUser?.teacher_id);
                        const timeLabel = hasToday ? briefingData.todayLesson.time : (nextOcc?.start_time?.substring(0, 5) || '15:15');
                        const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                        const todayStr = new Date().toISOString().split('T')[0];
                        const targetDateStr = hasToday ? todayStr : (nextOcc?.date || todayStr);
                        const targetDayOfWeek = targetDateStr ? DAYS_DE[new Date(targetDateStr).getDay()] : 'Termin';
                        const formattedDate = targetDateStr ? new Date(targetDateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '';
                        const label = `${targetDayOfWeek} (${formattedDate}), ${timeLabel} Uhr`;
                        const finalOccurId = hasToday ? (briefingData?.todayLesson?.id || `today-${teacherId}-${todayStr}`) : (nextOcc?.id || `sched-${studentId}`);
                        const lessonText = hasToday 
                          ? `Heute, ${briefingData.todayLesson.time} Uhr` 
                          : (nextOcc ? (() => {
                              const d = new Date(nextOcc.date);
                              return `${d.toLocaleDateString('de-DE', {weekday: 'long', day: '2-digit', month: '2-digit'})} - ${nextOcc.start_time?.substring(0,5)} Uhr`;
                            })() : 'Demnächst');
                        const hasMessage = checkOccurrenceHasMessages(nextOcc || finalOccurId, targetDateStr);
                        const unreadMsgCount = getOccurrenceUnreadCount(nextOcc || finalOccurId, targetDateStr);
                        const isCanceled = nextOcc?.status === 'canceled_by_student' || nextOcc?.status === 'cancelled' || nextOcc?.status === 'teacher_sick' || nextOcc?.status === 'canceled_by_teacher_sick';

                        return (
                          <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            {/* 1. Next Lesson Status Badge */}
                            <div style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '8px', 
                              background: isCanceled ? 'rgba(239, 68, 68, 0.08)' : 'rgba(52, 168, 83, 0.08)', 
                              color: isCanceled ? '#dc2626' : '#34a853', 
                              padding: '8px 16px', 
                              minHeight: '38px',
                              boxSizing: 'border-box',
                              borderRadius: '12px', 
                              fontSize: '0.78rem', 
                              fontWeight: 800,
                              border: isCanceled ? '1px dashed rgba(239, 68, 68, 0.3)' : '1px solid rgba(52, 168, 83, 0.15)'
                            }}>
                              <Calendar size={14} color={isCanceled ? '#dc2626' : '#34a853'} />
                              <span>{isCanceled ? `Abgesagt: ${lessonText}` : `Nächste Session: ${lessonText}`}</span>
                            </div>

                            {/* 2. Nachrichten / Shoutbox Button (1:1 synchron mit Termine-Board) */}
                            {teacherId && (
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAppointmentChatData({
                                    teacherId,
                                    date: targetDateStr,
                                    start_time: timeLabel,
                                    label,
                                    occurrenceId: finalOccurId,
                                    status: nextOcc?.status || (isCanceled ? 'cancelled' : 'scheduled'),
                                    isCancelled: isCanceled
                                  });
                                  setShowAppointmentChat(true);
                                }}
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '8px', 
                                  background: hasMessage ? '#fefce8' : '#ffffff', 
                                  color: hasMessage ? '#ca8a04' : '#475569', 
                                  padding: '8px 16px', 
                                  minHeight: '38px',
                                  boxSizing: 'border-box',
                                  borderRadius: '14px', 
                                  fontSize: '0.80rem', 
                                  fontWeight: 900, 
                                  border: hasMessage ? '1px solid #fde047' : '1px solid #cbd5e1', 
                                  cursor: 'pointer',
                                  boxShadow: hasMessage ? '0 2px 8px rgba(202, 138, 4, 0.18)' : '0 2px 6px rgba(0, 0, 0, 0.03)',
                                  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                  e.currentTarget.style.background = hasMessage ? '#fef08a' : '#f8fafc';
                                  e.currentTarget.style.boxShadow = hasMessage ? '0 4px 12px rgba(202, 138, 4, 0.25)' : '0 4px 12px rgba(0, 0, 0, 0.08)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'none';
                                  e.currentTarget.style.background = hasMessage ? '#fefce8' : '#ffffff';
                                  e.currentTarget.style.boxShadow = hasMessage ? '0 2px 8px rgba(202, 138, 4, 0.18)' : '0 2px 6px rgba(0, 0, 0, 0.03)';
                                }}
                                title="1:1 Shoutbox zum Unterrichtstermin"
                              >
                                <MessageSquare 
                                  size={15} 
                                  color={hasMessage ? '#ca8a04' : '#64748b'} 
                                  fill={hasMessage ? '#eab308' : 'none'} 
                                />
                                <span>{unreadMsgCount > 0 ? (unreadMsgCount === 1 ? '1 neue Nachricht' : `${unreadMsgCount} neue Nachrichten`) : (hasMessage ? 'Nachrichten vorhanden' : 'Nachrichten')}</span>
                                {unreadMsgCount > 0 && (
                                  <span style={{
                                    background: '#f59e0b',
                                    color: '#ffffff',
                                    fontSize: '0.70rem',
                                    fontWeight: 950,
                                    padding: '2px 8px',
                                    borderRadius: '100px',
                                    letterSpacing: '0.02em',
                                    boxShadow: '0 2px 6px rgba(245, 158, 11, 0.35)'
                                  }}>
                                    {unreadMsgCount === 1 ? '1 neu ★' : `${unreadMsgCount} neu ★`}
                                  </span>
                                )}
                              </button>
                            )}

                            {/* 3. Absage / Reaktivieren Button */}
                            {nextOcc && (isCanceled || isStudentAbsenceAllowed || checkIsParentUnlockedGlobal()) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isCanceled) {
                                    handleTriggerUndoCancelOccurrence(nextOcc);
                                  } else {
                                    handleTriggerCancelOccurrence(nextOcc);
                                  }
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  background: isCanceled ? '#fee2e2' : '#ffffff',
                                  color: isCanceled ? '#dc2626' : '#475569',
                                  padding: '8px 16px',
                                  minHeight: '38px',
                                  boxSizing: 'border-box',
                                  borderRadius: '12px',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  border: isCanceled ? '1px solid #f87171' : '1px solid #e2e8f0',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                                  transition: 'all 0.2s'
                                }}
                                className="hover-scale"
                                title={isCanceled ? "Absage zurücknehmen / Termin reaktivieren" : "Unterrichtstermin absagen"}
                              >
                                {isCanceled ? (
                                  !isStudentAbsenceAllowed ? <Lock size={14} color="#dc2626" /> : <CalendarX size={14} color="#dc2626" />
                                ) : (
                                  !isStudentAbsenceAllowed ? <Lock size={14} color="#64748b" /> : <CalendarX size={14} color="#64748b" />
                                )}
                                <span>{isCanceled ? (!isStudentAbsenceAllowed ? 'Absage zurücknehmen (Eltern-PIN)' : 'Absage zurücknehmen') : (!isStudentAbsenceAllowed ? 'Unterricht absagen (Eltern-PIN)' : 'Unterricht absagen')}</span>
                              </button>
                            )}

                            {/* 4. Wochenfokus / Skill-Radar Badge */}
                            {weeklyFocusMeta && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (handleOpenHomeworkBookWithView) {
                                    handleOpenHomeworkBookWithView('skillradar');
                                  }
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                                  color: '#166534',
                                  padding: '8px 16px',
                                  minHeight: '38px',
                                  boxSizing: 'border-box',
                                  borderRadius: '12px',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  border: '1.5px solid #86efac',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.15)',
                                  transition: 'all 0.18s ease'
                                }}
                                className="hover-scale"
                                title="Zum Skill-Radar im Aufgabenheft"
                              >
                                <span>{weeklyFocusMeta.icon}</span>
                                <span>Wochenfokus: {weeklyFocusMeta.label}</span>
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* TEEN: 3-SPALTEN SESSION WORKFLOW */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'stretch' }}>
                    
                    {/* Spalte 1: Active Tracks & Lehrwerke 🎧 (Level 2: Teen) */}
                    {(() => {
                      const currentWeekStr = getISOWeek(getSimulatedNow());
                      const currentWeekNum = currentWeekStr.split('-W')[1] || '';

                      const parseHomeworkNotes = (rawNotes: any): string[] => {
                        if (!rawNotes) return [];
                        if (Array.isArray(rawNotes)) {
                          const res: string[] = [];
                          rawNotes.forEach(r => {
                            parseHomeworkNotes(r).forEach(x => res.push(x));
                          });
                          return res;
                        }
                        if (typeof rawNotes !== 'string') return [String(rawNotes).trim()];
                        const trimmed = rawNotes.trim();
                        if (!trimmed) return [];
                        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || trimmed.startsWith('"{') || trimmed.startsWith('"[') || trimmed.startsWith('{')) {
                          try {
                            const parsed = JSON.parse(trimmed);
                            if (Array.isArray(parsed)) {
                              const res: string[] = [];
                              parsed.forEach(r => {
                                parseHomeworkNotes(r).forEach(x => res.push(x));
                              });
                              return res;
                            }
                            if (typeof parsed === 'string' && parsed !== trimmed) {
                              return parseHomeworkNotes(parsed);
                            }
                          } catch {}
                        }
                        return [trimmed];
                      };

                      const getNotesForWeek = (weekStr: string): string[] => {
                        const notes: string[] = [];
                        (progressItems || []).forEach(item => {
                          const itemW = getItemWeek(item);
                          const isActive = item.is_current_homework || item.topic_name.startsWith('Hausaufgabe KW ') || itemW === weekStr;
                          if (isActive && item.homework_notes && item.homework_notes.trim()) {
                            parseHomeworkNotes(item.homework_notes).forEach(n => {
                              if (n && n.trim() && !notes.includes(n.trim())) notes.push(n.trim());
                            });
                          }
                        });

                        try {
                          const localGenNotes = localStorage.getItem(`campus_homework_notes_${studentId}`);
                          if (localGenNotes && localGenNotes.trim()) {
                            parseHomeworkNotes(localGenNotes).forEach(n => {
                              if (n && n.trim() && !notes.includes(n.trim())) notes.push(n.trim());
                            });
                          }
                        } catch {}

                        return notes;
                      };

                      const currentWeekNotes = getNotesForWeek(currentWeekStr);
                      const audioTracks: AudioTrackItem[] = [];
                      currentWeekNotes.forEach((n, idx) => {
                        if (n.startsWith('AUDIO:')) {
                          const parts = n.substring(6).split('|');
                          audioTracks.push({
                            url: parts[0],
                            duration: parseFloat(parts[1]) || 0,
                            date: parts[2],
                            label: parts[3] || `Aufnahme #${audioTracks.length + 1}`,
                            author: parts[4] || 'teacher',
                            songTag: parts[7] || undefined,
                            idx
                          });
                        }
                      });

                      // 🌉 Smart Audio Bridge: Bridge active practice tracks from latest past lesson if current week has none
                      if (audioTracks.length === 0) {
                        const pastHwSnapshots = (progressItems || []).filter((item: any) => {
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
                          try {
                            const parsed = typeof latestPast.homework_notes === 'string' ? JSON.parse(latestPast.homework_notes) : latestPast.homework_notes;
                            if (Array.isArray(parsed)) {
                              parsed.forEach((item: string, index: number) => {
                                if (typeof item === 'string' && item.startsWith('AUDIO:')) {
                                  const parts = item.substring(6).split('|');
                                  audioTracks.push({
                                    url: parts[0],
                                    duration: parseFloat(parts[1]) || 0,
                                    date: parts[2],
                                    label: parts[3] || ('Aufnahme #' + (audioTracks.length + 1)),
                                    author: parts[4] || 'teacher',
                                    songTag: parts[7] || undefined,
                                    isCarriedOver: true,
                                    idx: index
                                  });
                                }
                              });
                            }
                          } catch {}
                        }
                      }

                      const cleanGeneralNote = (text: string) => {
                        if (!text) return '';
                        let clean = text;
                        if (clean.startsWith('[') || clean.startsWith('{') || clean.startsWith('"')) {
                          try {
                            const p = JSON.parse(clean);
                            if (Array.isArray(p)) {
                              clean = p.filter((x: any) => typeof x === 'string' && !x.startsWith('AUDIO:') && !x.startsWith('STICKER:') && !x.startsWith('LATENCY:') && !x.startsWith('SNAPSHOT_') && !x.startsWith('FEEDBACK:') && !x.startsWith('STUDENT_NOTE_PUBLIC:') && !x.startsWith('STUDENT_NOTE_PRIVATE:') && !x.startsWith('STUDENT_QUESTION:')).join(' ');
                            } else if (typeof p === 'string') {
                              clean = p;
                            }
                          } catch {}
                        }
                        return clean
                          .replace(/\["AUDIO:[^"]*"\]/g, '')
                          .replace(/AUDIO:[^\s,|]+/g, '')
                          .replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE|STUDENT_QUESTION):[^|]*\|/, '')
                          .replace(/^STUDENT_QUESTION:[^|]*\|?/i, '')
                          .replace(/^❓\s*Frage für den Unterricht:\s*/i, '')
                          .trim();
                      };

                      let isPastNoteCarriedOver = false;
                      let generalNoteRaw = currentWeekNotes.find(n => !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.startsWith('LATENCY:') && !n.startsWith('SNAPSHOT_') && !n.startsWith('FEEDBACK:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:') && !n.startsWith('STUDENT_QUESTION:'));
                      if (!generalNoteRaw) {
                        const pastHwSnapshots = (progressItems || []).filter((item: any) => {
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
                          try {
                            const parsed = typeof latestPast.homework_notes === 'string' ? JSON.parse(latestPast.homework_notes) : latestPast.homework_notes;
                            if (Array.isArray(parsed)) {
                              const pastNote = parsed.find((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.startsWith('LATENCY:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('SNAPSHOT_') && !n.startsWith('FEEDBACK:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:') && !n.startsWith('STUDENT_QUESTION:'));
                              if (pastNote) {
                                generalNoteRaw = pastNote;
                                isPastNoteCarriedOver = true;
                              }
                            } else if (typeof parsed === 'string') {
                              generalNoteRaw = parsed;
                              isPastNoteCarriedOver = true;
                            }
                          } catch {}
                        }
                      }
                      const generalNote = generalNoteRaw ? cleanGeneralNote(generalNoteRaw) : '';

                      const isAudioCarriedOver = audioTracks.some(t => t.isCarriedOver);
                      const isCarriedOverPlan = isAudioCarriedOver || isPastNoteCarriedOver;

                      let studentQuestionEntry = currentWeekNotes.find(n => typeof n === 'string' && (n.startsWith('STUDENT_QUESTION:') || n.startsWith('❓ Frage für den Unterricht:')));
                      if (!studentQuestionEntry) {
                        const pastHwSnapshots = (progressItems || []).filter((item: any) => {
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
                          try {
                            const parsed = typeof latestPast.homework_notes === 'string' ? JSON.parse(latestPast.homework_notes) : latestPast.homework_notes;
                            if (Array.isArray(parsed)) {
                              const pastQ = parsed.find((n: string) => typeof n === 'string' && (n.startsWith('STUDENT_QUESTION:') || n.startsWith('❓ Frage für den Unterricht:')));
                              if (pastQ) studentQuestionEntry = pastQ;
                            }
                          } catch {}
                        }
                      }

                      let studentQuestionText = '';
                      if (studentQuestionEntry) {
                        if (studentQuestionEntry.startsWith('STUDENT_QUESTION:')) {
                          const withoutPrefix = studentQuestionEntry.replace(/^STUDENT_QUESTION:/, '');
                          const pipeIdx = withoutPrefix.indexOf('|');
                          studentQuestionText = pipeIdx !== -1 ? withoutPrefix.slice(pipeIdx + 1).trim() : withoutPrefix.trim();
                        } else {
                          studentQuestionText = studentQuestionEntry.replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
                        }
                      }

                      const cleanTitle = (t: string) => (t || '')
                        .replace(/\s*\((gitarre|guitar|e-gitarre|bass|e-bass|drums|schlagzeug|klavier|piano|keys|keyboard|vocals|gesang|stimme|allgemein)\)/i, '')
                        .replace(/^Linken Park/i, 'Linkin Park');
                      const effectiveId = studentId || studentUser?.id;

                      const formatPageNumbers = (pages: number[]): string => {
                        if (pages.length === 0) return '';
                        const sorted = [...pages].sort((a, b) => a - b);
                        const ranges: string[] = [];
                        let start = sorted[0];
                        let end = start;
                        for (let i = 1; i < sorted.length; i++) {
                          if (sorted[i] === end + 1) end = sorted[i];
                          else {
                            ranges.push(start === end ? `${start}` : `${start}–${end}`);
                            start = sorted[i];
                            end = start;
                          }
                        }
                        ranges.push(start === end ? `${start}` : `${start}–${end}`);
                        return `S. ${ranges.join(', ')}`;
                      };

                      // 1. Gather all active homework books & pages directly from localProgress (assigned Lehrwerke)
                      const activeLehrwerkeMap: Record<string, { pages: { num: number; notes: string; status: string }[] }> = {};

                      (localProgress || []).forEach((assignment: any) => {
                        const isStudentMatch = !effectiveId || String(assignment.studentId) === String(effectiveId) || String(assignment.student_id) === String(effectiveId);
                        if (!isStudentMatch || !assignment.pageStates) return;
                        const book = lehrwerke.find(g => String(g.id) === String(assignment.lehrwerkId));
                        const bookTitle = book?.title || assignment.bookTitle || assignment.lehrwerkTitle;
                        if (!bookTitle) return;

                        Object.entries(assignment.pageStates).forEach(([pNumStr, pState]: [string, any]) => {
                          if (pState?.status === 'homework' || pState?.isCurrentHomework) {
                            const pageNum = parseInt(pNumStr, 10);
                            if (!isNaN(pageNum)) {
                              if (!activeLehrwerkeMap[bookTitle]) {
                                activeLehrwerkeMap[bookTitle] = { pages: [] };
                              }
                              if (!activeLehrwerkeMap[bookTitle].pages.some(p => p.num === pageNum)) {
                                let cleanNote = pState.homeworkNotes || pState.homework_notes || pState.notes || '';
                                if (cleanNote.startsWith('[') || cleanNote.startsWith('{')) {
                                  try {
                                    const parsed = JSON.parse(cleanNote);
                                    if (Array.isArray(parsed)) {
                                      cleanNote = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('SNAPSHOT_') && !n.startsWith('FEEDBACK:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
                                    }
                                  } catch {}
                                }
                                cleanNote = cleanNote.replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '').replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
                                activeLehrwerkeMap[bookTitle].pages.push({
                                  num: pageNum,
                                  notes: cleanNote,
                                  status: pState.status || 'homework'
                                });
                              }
                            }
                          }
                        });
                      });

                      // 2. Also incorporate items from progressItems (songs, theory, database rows) and songs state
                      const otherActiveHWItems: any[] = [];
                      (progressItems || []).forEach(item => {
                        if (!item.topic_name || item.topic_name.startsWith('Hausaufgabe KW ')) return;
                        if (item.topic_name.includes(' - Seite ')) {
                          const parts = item.topic_name.split(' - Seite ');
                          const bookTitle = cleanTitle(parts[0].trim());
                          const pageNum = parseInt(parts[1], 10);
                          const book = lehrwerke.find(g => (g.title || '').trim().toLowerCase() === bookTitle.toLowerCase());
                          const resolvedTitle = book?.title || bookTitle;
                          if (!isNaN(pageNum)) {
                            if (!activeLehrwerkeMap[resolvedTitle]) {
                              activeLehrwerkeMap[resolvedTitle] = { pages: [] };
                            }
                            if (!activeLehrwerkeMap[resolvedTitle].pages.some(p => p.num === pageNum)) {
                              let cleanNote = item.homework_notes || '';
                              if (cleanNote.startsWith('[') || cleanNote.startsWith('{')) {
                                try {
                                  const parsed = JSON.parse(cleanNote);
                                  if (Array.isArray(parsed)) {
                                    cleanNote = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('SNAPSHOT_') && !n.startsWith('FEEDBACK:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
                                  }
                                } catch {}
                              }
                              cleanNote = cleanNote.replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '').replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
                              activeLehrwerkeMap[resolvedTitle].pages.push({
                                num: pageNum,
                                notes: cleanNote,
                                status: item.status || 'homework'
                              });
                            }
                          }
                        } else {
                          const localHw = effectiveId ? (localStorage.getItem(`song_hw_${effectiveId}_${item.id}`) ?? (item.song_id ? localStorage.getItem(`song_hw_${effectiveId}_${item.song_id}`) : null)) : null;
                          if (localHw !== 'false') {
                            const isSongHw = (localHw === 'true') || Boolean(item.is_current_homework);
                            if (isSongHw) {
                              const cleanT = cleanTitle((item.topic_name || item.title || '').replace(/\s*\([^)]*\)\s*$/, ''));
                              if (cleanT && !otherActiveHWItems.some(existing => cleanTitle((existing.topic_name || existing.title || '').replace(/\s*\([^)]*\)\s*$/, '')) === cleanT)) {
                                let cachedNote = (effectiveId ? (localStorage.getItem(`song_note_${effectiveId}_${item.id}`) || localStorage.getItem(`song_note_${effectiveId}_${item.song_id}`)) : '') ||
                                                 item.homework_notes || '';
                                if (cachedNote.startsWith('[') || cachedNote.startsWith('{')) {
                                  try {
                                    const parsed = JSON.parse(cachedNote);
                                    if (Array.isArray(parsed)) {
                                      cachedNote = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
                                    }
                                  } catch {}
                                }
                                cachedNote = cachedNote.replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '').replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();

                                otherActiveHWItems.push({
                                  ...item,
                                  homework_notes: cachedNote
                                });
                              }
                            }
                          }
                        }
                      });

                      // Also incorporate student's activeSongSkills (exact 1:1 match with MeisterwerkDocumentationModal)
                      (activeSongSkills || []).forEach((skill: any) => {
                        const localHw = effectiveId ? (localStorage.getItem(`song_hw_${effectiveId}_${skill.id}`) ??
                                        (skill.song_id ? localStorage.getItem(`song_hw_${effectiveId}_${skill.song_id}`) : null) ??
                                        (skill.songs?.id ? localStorage.getItem(`song_hw_${effectiveId}_${skill.songs.id}`) : null)) : null;

                        const isHw = (localHw === 'true') || (localHw !== 'false' && Boolean(skill.is_current_homework));

                        if (isHw) {
                          const songArtist = skill.songs?.artist || skill.artist || '';
                          const songTitle = skill.songs?.title || skill.title || skill.song_title || 'Song';
                          if (songTitle.includes(' - Seite ') || songTitle.startsWith('Hausaufgabe KW ')) return;
                          const songInstrument = skill.instrument ? ` (${skill.instrument})` : '';
                          const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;
                          const cleanT = cleanTitle(fullTitle);

                          if (cleanT && !otherActiveHWItems.some(existing => cleanTitle((existing.topic_name || existing.title || '').replace(/\s*\([^)]*\)\s*$/, '')) === cleanT)) {
                            let cachedNote = (effectiveId ? (localStorage.getItem(`song_note_${effectiveId}_${skill.id}`) ||
                                             (skill.song_id ? localStorage.getItem(`song_note_${effectiveId}_${skill.song_id}`) : '') ||
                                             (skill.songs?.id ? localStorage.getItem(`song_note_${effectiveId}_${skill.songs.id}`) : '')) : '') ||
                                             skill.homework_notes || '';
                            if (cachedNote.startsWith('[') || cachedNote.startsWith('{')) {
                              try {
                                const parsed = JSON.parse(cachedNote);
                                if (Array.isArray(parsed)) {
                                  cachedNote = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
                                }
                              } catch {}
                            }
                            cachedNote = cachedNote.replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '').replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();

                            otherActiveHWItems.push({
                              id: skill.id,
                              song_id: skill.song_id || skill.songs?.id,
                              topic_name: fullTitle,
                              title: fullTitle,
                              is_current_homework: true,
                              status: 'IN_PROGRESS',
                              homework_notes: cachedNote
                            });
                          }
                        }
                      });

                      // 2b. 📦 Snapshot Hydration: Falls activeLehrwerkeMap oder otherActiveHWItems leer sind, aus jüngstem SNAPSHOT hydrieren
                      if (Object.keys(activeLehrwerkeMap).length === 0 || otherActiveHWItems.length === 0) {
                        const allSnapshotCandidates = (progressItems || []).filter((item: any) => item.topic_name?.startsWith('Hausaufgabe KW '));
                        allSnapshotCandidates.sort((a: any, b: any) => {
                          const wA = getItemWeek(a);
                          const wB = getItemWeek(b);
                          if (wA !== wB) return (wB || '').localeCompare(wA || '');
                          const tA = new Date(a.updated_at || a.created_at || 0).getTime();
                          const tB = new Date(b.updated_at || b.created_at || 0).getTime();
                          return tB - tA;
                        });

                        for (const snapItem of allSnapshotCandidates) {
                          if (!snapItem.homework_notes) continue;
                          let parsedSnapNotes: any = null;
                          try {
                            parsedSnapNotes = typeof snapItem.homework_notes === 'string' ? JSON.parse(snapItem.homework_notes) : snapItem.homework_notes;
                          } catch {}
                          if (!Array.isArray(parsedSnapNotes)) continue;

                          if (Object.keys(activeLehrwerkeMap).length === 0) {
                            const snapLwEntry = parsedSnapNotes.find((n: any) => typeof n === 'string' && n.startsWith('SNAPSHOT_LEHRWERKE:'));
                            if (snapLwEntry) {
                              try {
                                const rawJson = snapLwEntry.substring('SNAPSHOT_LEHRWERKE:'.length);
                                const parsedLw = JSON.parse(rawJson);
                                if (Array.isArray(parsedLw) && parsedLw.length > 0) {
                                  parsedLw.forEach((lw: any) => {
                                    const title = cleanTitle(lw.title || '');
                                    const pages = Array.isArray(lw.pages) ? [...lw.pages].sort((a: number, b: number) => a - b) : [];
                                    if (title && pages.length > 0 && !activeLehrwerkeMap[title]) {
                                      activeLehrwerkeMap[title] = {
                                        pages: pages.map((pNum: number) => ({
                                          num: pNum,
                                          notes: '',
                                          status: 'homework'
                                        }))
                                      };
                                    }
                                  });
                                }
                              } catch (e) {
                                console.warn('Error hydrating SNAPSHOT_LEHRWERKE in Teen:', e);
                              }
                            }
                          }

                          if (otherActiveHWItems.length === 0) {
                            const snapSongEntry = parsedSnapNotes.find((n: any) => typeof n === 'string' && n.startsWith('SNAPSHOT_SONGS:'));
                            if (snapSongEntry) {
                              try {
                                const rawJson = snapSongEntry.substring('SNAPSHOT_SONGS:'.length);
                                const parsedSongs = JSON.parse(rawJson);
                                if (Array.isArray(parsedSongs) && parsedSongs.length > 0) {
                                  parsedSongs.forEach((song: any) => {
                                    const tName = cleanTitle(song.topic_name || song.title || '');
                                    if (tName && !otherActiveHWItems.some(s => cleanTitle(s.topic_name || s.title || '').toLowerCase() === tName.toLowerCase())) {
                                      otherActiveHWItems.push({
                                        ...song,
                                        topic_name: tName,
                                        title: tName
                                      });
                                    }
                                  });
                                }
                              } catch (e) {
                                console.warn('Error hydrating SNAPSHOT_SONGS in Teen:', e);
                              }
                            }
                          }

                          if (Object.keys(activeLehrwerkeMap).length > 0 && otherActiveHWItems.length > 0) break;
                        }
                      }

                      // Sort pages for all active books
                      Object.keys(activeLehrwerkeMap).forEach(title => {
                        activeLehrwerkeMap[title].pages.sort((a, b) => a.num - b.num);
                      });

                      const formattedActiveBooks = Object.entries(activeLehrwerkeMap).map(([title, info]) => {
                        const pageNums = info.pages.map(p => p.num);
                        const formattedPages = formatPageNumbers(pageNums);
                        const notesList = info.pages.filter(p => p.notes && p.notes.length > 0).map(p => ({ num: p.num, text: p.notes }));
                        const allDone = info.pages.every(p => p.status === 'MASTERED' || p.status === 'THEORY_DONE');
                        return {
                          title,
                          pageNums,
                          formattedPages,
                          notesList,
                          isDone: allDone,
                          isBook: true
                        };
                      });

                      const hasActiveHomework = formattedActiveBooks.length > 0 || otherActiveHWItems.length > 0 || currentWeekNotes.length > 0;

                      return (
                        <div style={{ 
                          background: '#ffffff', 
                          borderRadius: '24px', 
                          padding: '24px', 
                          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.03)',
                          border: '1px solid rgba(0, 0, 0, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '16px'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ 
                                  background: 'rgba(52, 168, 83, 0.08)', 
                                  color: '#34a853', 
                                  width: '34px', 
                                  height: '34px', 
                                  borderRadius: '10px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center' 
                                }}>
                                  <BookOpen size={17} />
                                </div>
                                <div>
                                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 950, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    Hausaufgaben
                                  </h4>
                                  <span style={{ fontSize: isMusicStandMode ? '0.80rem' : '0.72rem', fontWeight: 850, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Diese Woche · Deine Aufgaben
                                  </span>
                                  {isCarriedOverPlan && (
                                    <div style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      background: '#f8fafc',
                                      border: '1px solid #cbd5e1',
                                      color: '#475569',
                                      borderRadius: '100px',
                                      padding: '2px 10px',
                                      fontSize: '0.72rem',
                                      fontWeight: 850,
                                      letterSpacing: '0.01em',
                                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                                      marginTop: '4px'
                                    }}>
                                      <RotateCcw size={10} color="#0284c7" strokeWidth={2.5} />
                                      <span>Fortlaufender Übeplan • Übertrag aus der Vorwoche</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Audio Indicator Pill beside Title */}
                              {audioTracks.length > 0 ? (
                                <div
                                  onClick={() => handleTabChangeLocal('homework_book')}
                                  style={{
                                    background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                                    border: '1px solid #bbf7d0',
                                    borderRadius: '100px',
                                    padding: '4px 10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(34, 197, 94, 0.08)',
                                    transition: 'all 0.15s ease'
                                  }}
                                  className="hover-scale"
                                  title="Unterrichtsaufnahmen im Aufgabenheft anhören"
                                >
                                  <Headphones size={13} color="#15803d" />
                                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#15803d' }}>
                                    {audioTracks.length === 1 ? '1 Aufnahme' : `${audioTracks.length} Aufnahmen`}
                                  </span>
                                </div>
                              ) : (
                                <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '0.6rem', fontWeight: 900, padding: '3px 9px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                                  Aktiv
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {hasActiveHomework ? (
                                <>
                                  {formattedActiveBooks.map((item, idx) => {
                                    const bookGradient = getLehrwerkColor(item.title, lehrwerke);
                                    return (
                                      <div key={`teen-book-${idx}`} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px',
                                        padding: '10px 14px',
                                        background: '#ffffff',
                                        border: '1px solid #f1f5f9',
                                        boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.04)',
                                        borderRadius: '14px'
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                          <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '8px',
                                            background: '#fee2e2',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#dc2626',
                                            flexShrink: 0
                                          }}>
                                            <BookOpen size={14} strokeWidth={2.4} />
                                          </div>
                                          <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                            {item.title}
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', flexShrink: 0 }}>
                                          {item.pageNums.map((pNum: number, pIdx: number) => (
                                            <span key={`teen-p-${pIdx}`} style={{
                                              fontSize: '0.78rem',
                                              fontWeight: 900,
                                              color: '#15803d',
                                              background: '#dcfce7',
                                              padding: '3px 9px',
                                              borderRadius: '7px',
                                              border: '1px solid #bbf7d0',
                                              flexShrink: 0
                                            }}>
                                              S. {pNum}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {otherActiveHWItems.map((item, idx) => (
                                    <div key={`teen-song-${idx}`} style={{
                                      background: '#ffffff',
                                      border: '1px solid #f1f5f9',
                                      boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.04)',
                                      padding: '10px 14px',
                                      borderRadius: '14px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px'
                                    }}>
                                      <div style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '8px',
                                        background: '#ede9fe',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#7c3aed',
                                        flexShrink: 0
                                      }}>
                                        <Music size={14} strokeWidth={2.4} />
                                      </div>
                                      <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {cleanTitle(item.title || item.topic_name)}
                                      </span>
                                    </div>
                                  ))}

                                  {/* Zusätzliche Bemerkung */}
                                  {generalNote && generalNote.trim().toLowerCase() !== 'zusätzliche bemerkung' && (
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontSize: '0.88rem', color: '#334155', fontWeight: 600, paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                                      <FileText size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                                      <strong style={{ color: '#15803d', fontWeight: 850, flexShrink: 0 }}>Zusätzliche Bemerkung:</strong>
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{generalNote}</span>
                                    </div>
                                  )}

                                  {/* Frage des Schülers für die Stunde */}
                                  {studentQuestionText && (
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontSize: '0.88rem', color: '#1e40af', fontWeight: 600, paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                                      <HelpCircle size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
                                      <strong style={{ color: '#2563eb', fontWeight: 850, flexShrink: 0 }}>Deine Frage für die Stunde:</strong>
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{studentQuestionText}</span>
                                    </div>
                                  )}

                                  {/* Audio-Karussell direkt in der Teen-Karte (Volle Parität mit Desktop-Schülervorschau) */}
                                  {audioTracks.length > 0 && (
                                    <div style={{ paddingTop: '4px' }}>
                                      <AudioTrackCarousel
                                        tracks={audioTracks}
                                        readOnly={true}
                                        isTeacher={false}
                                        activeTopicContext="Hausaufgabe"
                                        defaultExpanded={true}
                                        isCarriedOver={isAudioCarriedOver}
                                        hideCarriedOverBadge={true}
                                      />
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  {/* Auch bei keinen Text-Aufgaben Aufnahmen anzeigen, falls vorhanden */}
                                  {audioTracks.length > 0 && (
                                    <div style={{ paddingTop: '4px' }}>
                                      <AudioTrackCarousel
                                        tracks={audioTracks}
                                        readOnly={true}
                                        isTeacher={false}
                                        activeTopicContext="Hausaufgabe"
                                        defaultExpanded={true}
                                        isCarriedOver={isAudioCarriedOver}
                                        hideCarriedOverBadge={true}
                                      />
                                    </div>
                                  )}
                                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                    Keine offenen Aufgaben für diese Woche erfasst
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => handleTabChangeLocal('homework_book')}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: '14px',
                              border: '1.5px solid #e2e8f0',
                              background: '#f8fafc',
                              color: '#0f172a',
                              fontSize: '0.88rem',
                              fontWeight: 900,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              transition: 'all 0.2s'
                            }}
                            className="hover-scale"
                          >
                            <BookOpen size={14} color="#34a853" />
                            <span>Alle Hausaufgaben ansehen →</span>
                          </button>
                        </div>
                      );
                    })()}

                    {/* 🎰 MEILENSTEIN-JUKEBOX: SONG DER WOCHE (+50 BONUS-XP) */}
                    {(() => {
                      const masteredSongs = (progressItems || []).filter(item => 
                        item.status === 'MASTERED' || 
                        item.topic_name?.includes('Meisterwerk') ||
                        item.is_mastered === true
                      );
                      if (masteredSongs.length === 0) return null;

                      const currentWeek = getISOWeekRaw(new Date(), 1);
                      const hashVal = currentWeek.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                      const jukeboxSong = masteredSongs[hashVal % masteredSongs.length];
                      const songTitle = (jukeboxSong.topic_name || jukeboxSong.title || 'Meisterwerk').replace(/\s*\([^)]*\)\s*$/, '');

                      return (
                        <div style={{
                          background: 'linear-gradient(135deg, #ffffff 0%, #fffdf0 100%)',
                          border: '1.5px solid #fde047',
                          borderRadius: '20px',
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '16px',
                          boxShadow: '0 8px 24px -4px rgba(234, 179, 8, 0.12), 0 2px 6px rgba(234, 179, 8, 0.06)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                            <div style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #fef08a 0%, #facc15 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '2px solid #eab308',
                              boxShadow: '0 4px 12px rgba(234, 179, 8, 0.25)',
                              flexShrink: 0
                            }}>
                              <Disc size={22} color="#854d0e" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  🎰 Jukebox-Song der Woche
                                </span>
                                <span style={{
                                  background: '#fef08a',
                                  border: '1px solid #fde047',
                                  borderRadius: '6px',
                                  padding: '1px 6px',
                                  fontSize: '0.66rem',
                                  fontWeight: 900,
                                  color: '#854d0e'
                                }}>
                                  +50 BONUS-XP
                                </span>
                              </div>
                              <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {songTitle}
                              </h4>
                              <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600 }}>
                                Halte dein Meisterwerk frisch! 1× spielen & Bonus-XP sichern.
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleTabChangeLocal('homework_book')}
                            style={{
                              background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                              border: 'none',
                              borderRadius: '12px',
                              padding: '8px 14px',
                              color: '#ffffff',
                              fontSize: '0.78rem',
                              fontWeight: 900,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 4px 12px rgba(234, 179, 8, 0.25)',
                              flexShrink: 0
                            }}
                            className="hover-scale"
                          >
                            <Play size={13} fill="#ffffff" />
                            <span>Jetzt spielen</span>
                          </button>
                        </div>
                      );
                    })()}

                    {/* Spalte 2: Tägliche Übezeit ⚡ */}
                    {flamesActive && (() => {
                      const streak = avatar?.streak_flame || 0;
                      const levelKey = `level${effectiveLevel}` as 'level1' | 'level2' | 'level3';
                      const schoolConfig = (schoolFokusLevels && schoolFokusLevels[levelKey]) || DEFAULT_FOKUS_LEVELS[levelKey];
                      const kleineMins = schoolConfig.kleine || DEFAULT_FOKUS_LEVELS[levelKey].kleine;
                      const mittlereMins = schoolConfig.mittlere || DEFAULT_FOKUS_LEVELS[levelKey].mittlere;
                      const heldenMins = schoolConfig.helden || DEFAULT_FOKUS_LEVELS[levelKey].helden;
                      const requiredMins = streak >= 9 ? heldenMins : streak >= 4 ? mittlereMins : kleineMins;

                      const instName = studentInstrumentName || 'an deinem Instrument';
                      const instPrep = ['Gitarre', 'Blockflöte', 'Querflöte', 'Violine', 'Geige', 'Bratsche', 'Posaune', 'Trompete', 'Harfe', 'Ukulele'].some(w => instName.toLowerCase().includes(w.toLowerCase()))
                        ? `an der ${instName}`
                        : ['Klavier', 'Schlagzeug', 'Cello', 'Saxophon', 'Akkordeon', 'Keyboard', 'Horn', 'Fagott'].some(w => instName.toLowerCase().includes(w.toLowerCase()))
                        ? `am ${instName}`
                        : `an deinem Instrument`;

                      return (
                        <div style={{ 
                          background: '#ffffff', 
                          borderRadius: '24px', 
                          padding: '24px', 
                          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.03)',
                          border: '1px solid rgba(0, 0, 0, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '16px'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ background: 'rgba(251, 188, 5, 0.12)', color: '#d97706', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Zap size={16} fill="currentColor" />
                              </div>
                              <h4 style={{ margin: 0, fontSize: isMusicStandMode ? '1.18rem' : '1.05rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                Tägliche Übezeit ⚡
                              </h4>
                            </div>
                            <div>
                              <p style={{ margin: 0, fontSize: isMusicStandMode ? '0.96rem' : '0.86rem', color: '#475569', lineHeight: 1.45, fontWeight: 600 }}>
                                Kurze Session, maximaler Groove: Schon {requiredMins} Minuten {instPrep} sichern heute deinen Flammen-Streak. ⚡
                              </p>
                            </div>
                          </div>

                          <button 
                            onClick={() => setActiveTab('practice_board')}
                            style={{ 
                              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '14px', 
                              padding: '14px 20px', 
                              minHeight: '44px',
                              boxSizing: 'border-box',
                              fontWeight: 950, 
                              fontSize: '0.88rem', 
                              cursor: 'pointer', 
                              display: 'flex', 
                              justifyContent: 'center', 
                              alignItems: 'center', 
                              gap: '8px', 
                              boxShadow: '0 8px 20px rgba(79, 70, 229, 0.28)', 
                              transition: 'all 0.2s', 
                              width: '100%' 
                            }}
                            className="hover-scale"
                          >
                            <Play size={16} fill="white" />
                            <span>{requiredMins} Min. Übe-Timer starten</span>
                          </button>
                        </div>
                      );
                    })()}

                    {/* Spalte 3: Flammen-Pfad & Schutzschilde 🔥 */}
                    {flamesActive && (() => {
                      const streak = avatar?.streak_flame || 0;
                      const levelKey = `level${effectiveLevel}` as 'level1' | 'level2' | 'level3';
                      const schoolConfig = (schoolFokusLevels && schoolFokusLevels[levelKey]) || DEFAULT_FOKUS_LEVELS[levelKey];
                      const kleineMins = schoolConfig.kleine || DEFAULT_FOKUS_LEVELS[levelKey].kleine;
                      const mittlereMins = schoolConfig.mittlere || DEFAULT_FOKUS_LEVELS[levelKey].mittlere;
                      const heldenMins = schoolConfig.helden || DEFAULT_FOKUS_LEVELS[levelKey].helden;

                      const isTier1Unlocked = streak >= 1;
                      const isTier2Unlocked = streak >= 4;
                      const isTier3Unlocked = streak >= 9;

                      const weekMetrics = getDeterministicWeekMetrics();
                      const currentWeek = getISOWeek(getSimulatedNow());
                      const availableShields = weekMetrics.availableShields;
                      const weekShieldedCount = weekMetrics.weekShieldedCount;

                      return (
                        <div style={{ 
                          background: '#ffffff', 
                          borderRadius: '24px', 
                          padding: '24px', 
                          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.03)',
                          border: '1px solid rgba(0, 0, 0, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 950, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                🔥 Flammen-Pfad
                              </span>
                              <button 
                                onClick={() => setShowRulesModal(true)}
                                style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}
                                title="Spielregeln anzeigen"
                              >
                                <HelpCircle size={14} />
                              </button>
                            </div>
                            <span style={{ 
                              background: streak === 0 ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' : 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', 
                              color: streak === 0 ? '#991b1b' : '#ea580c', 
                              fontSize: '0.75rem', 
                              fontWeight: 950, 
                              padding: '4px 10px', 
                              borderRadius: '100px',
                              border: streak === 0 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(249, 115, 22, 0.2)'
                            }}>
                              {streak === 0 ? 'Startklar 🔥' : `${streak} ${streak === 1 ? 'Tag' : 'Tage'} 🔥`}
                            </span>
                          </div>

                          {/* FERIEN-FREEZE ODER 3 SCHUTZSCHILDE */}
                          {isTodayHoliday ? (
                            <div style={{
                              background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                              border: '1.5px solid #a7f3d0',
                              borderRadius: '14px',
                              padding: '10px 12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Palmtree size={15} color="#059669" />
                                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#065f46' }}>
                                    Ferienpause aktiv
                                  </span>
                                </div>
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 900,
                                  background: '#059669',
                                  color: '#ffffff',
                                  padding: '2px 8px',
                                  borderRadius: '100px'
                                }}>
                                  ✨ 2× XP-Booster
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.70rem', color: '#047857', lineHeight: 1.35 }}>
                                Ferienpause: Streak ist gesichert. Üben bringt heute <strong>2× XP</strong>! ✨
                              </p>
                            </div>
                          ) : (
                            <div style={{
                              background: '#f8fafc',
                              borderRadius: '14px',
                              padding: '10px 12px',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: isMusicStandMode ? '0.86rem' : '0.78rem', fontWeight: 850, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Shield size={14} color="#7c3aed" />
                                  Wochen-Schutzschilde:
                                </span>
                                <span style={{ fontSize: isMusicStandMode ? '0.86rem' : '0.78rem', fontWeight: 900, color: availableShields > 0 ? '#7c3aed' : '#b91c1c' }}>
                                  {availableShields}/3 bereit
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {[1, 2, 3].map((shieldNum) => {
                                  const isConsumed = shieldNum <= weekShieldedCount;
                                  const isShieldActive = shieldNum > weekShieldedCount;
                                  const shieldedDay = weekMetrics.weekDays.find(d => d.shieldNumber === shieldNum);
                                  const dayLabel = shieldedDay ? shieldedDay.dayName : '';

                                  return (
                                    <div key={`teen-shield-${shieldNum}`} style={{
                                      flex: 1,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px',
                                      padding: '5px 6px',
                                      borderRadius: '6px',
                                      background: isConsumed ? '#f1f5f9' : (isShieldActive ? 'rgba(124, 58, 237, 0.08)' : 'rgba(217, 119, 6, 0.08)'),
                                      border: isConsumed ? '1px solid #cbd5e1' : (isShieldActive ? '1px solid rgba(124, 58, 237, 0.28)' : '1px dashed rgba(217, 119, 6, 0.3)'),
                                      color: isConsumed ? '#475569' : (isShieldActive ? '#6d28d9' : '#9a3412'),
                                      fontSize: isMusicStandMode ? '0.78rem' : '0.72rem',
                                      fontWeight: 800
                                    }}>
                                      <Shield size={11} color={isConsumed ? '#64748b' : (isShieldActive ? '#7c3aed' : '#d97706')} fill={isConsumed ? '#94a3b8' : (isShieldActive ? '#7c3aed' : 'none')} />
                                      <span>{isConsumed ? `Schild ${shieldNum} (${dayLabel})` : `Schild ${shieldNum}`}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', flex: 1, justifyContent: 'center' }}>
                            <div style={{ position: 'absolute', left: '17px', top: '20px', bottom: '20px', width: '2px', background: '#e2e8f0', zIndex: 1 }} />
                            <div style={{ position: 'absolute', left: '17px', top: '20px', height: streak >= 9 ? '100%' : streak >= 4 ? '50%' : '0%', width: '2px', background: 'linear-gradient(to bottom, #f97316 0%, #ef4444 100%)', zIndex: 1, transition: 'height 0.5s ease' }} />

                            {/* Tier 1 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '10px 14px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.03)', zIndex: 2, opacity: isTier1Unlocked ? 1 : 0.6 }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isTier1Unlocked ? '#eab308' : '#cbd5e1', boxShadow: isTier1Unlocked ? '0 0 8px #eab308' : 'none', zIndex: 3 }} />
                              <div style={{ color: isTier1Unlocked ? '#eab308' : '#64748b', display: 'flex', alignItems: 'center' }}>
                                <Flame size={18} fill={isTier1Unlocked ? 'currentColor' : 'none'} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', fontWeight: 950, color: isTier1Unlocked ? '#854d0e' : '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    Stufe 1: Start-Flamme
                                  </span>
                                  <span style={{ fontSize: isMusicStandMode ? '0.86rem' : '0.78rem', fontWeight: 900, color: isTier1Unlocked ? '#854d0e' : '#475569', flexShrink: 0 }}>
                                    1–3 Tage • {kleineMins}m
                                  </span>
                                </div>
                                <div style={{ fontSize: isMusicStandMode ? '0.88rem' : '0.80rem', color: streak > 0 ? '#15803d' : '#475569', fontWeight: 700, marginTop: '2px' }}>{streak > 0 ? '🎉 Aktiv!' : 'Bereit zum Start!'}</div>
                              </div>
                            </div>

                            {/* Tier 2 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '10px 14px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.03)', zIndex: 2, opacity: isTier2Unlocked ? 1 : 0.6 }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isTier2Unlocked ? '#f97316' : '#cbd5e1', boxShadow: isTier2Unlocked ? '0 0 8px #f97316' : 'none', zIndex: 3 }} />
                              <div style={{ color: isTier2Unlocked ? '#f97316' : '#64748b', display: 'flex', alignItems: 'center' }}>
                                <Flame size={18} fill={isTier2Unlocked ? 'currentColor' : 'none'} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', fontWeight: 950, color: isTier2Unlocked ? '#9a3412' : '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    Stufe 2: Power-Flamme
                                  </span>
                                  <span style={{ fontSize: isMusicStandMode ? '0.86rem' : '0.78rem', fontWeight: 900, color: isTier2Unlocked ? '#9a3412' : '#475569', flexShrink: 0 }}>
                                    4–8 Tage • {mittlereMins}m
                                  </span>
                                </div>
                                <div style={{ fontSize: isMusicStandMode ? '0.88rem' : '0.80rem', color: isTier2Unlocked ? '#15803d' : '#475569', fontWeight: 700, marginTop: '2px' }}>
                                  {isTier2Unlocked ? '🎉 Aktiv!' : `Noch ${Math.max(1, 4 - streak)}${Math.max(1, 4 - streak) === 1 ? ' Tag' : ' Tage'} bis Stufe 2`}
                                </div>
                              </div>
                            </div>

                            {/* Tier 3 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '10px 14px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.03)', zIndex: 2, opacity: isTier3Unlocked ? 1 : 0.6 }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isTier3Unlocked ? '#ef4444' : '#cbd5e1', boxShadow: isTier3Unlocked ? '0 0 8px #ef4444' : 'none', zIndex: 3 }} />
                              <div style={{ color: isTier3Unlocked ? '#ef4444' : '#64748b', display: 'flex', alignItems: 'center' }}>
                                <Flame size={18} fill={isTier3Unlocked ? 'currentColor' : 'none'} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', fontWeight: 950, color: isTier3Unlocked ? '#991b1b' : '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    Stufe 3: Meister-Flamme
                                  </span>
                                  <span style={{ fontSize: isMusicStandMode ? '0.86rem' : '0.78rem', fontWeight: 900, color: isTier3Unlocked ? '#991b1b' : '#475569', flexShrink: 0 }}>
                                    9+ Tage • {heldenMins}m
                                  </span>
                                </div>
                                <div style={{ fontSize: isMusicStandMode ? '0.88rem' : '0.80rem', color: isTier3Unlocked ? '#ea580c' : '#475569', fontWeight: 700, marginTop: '2px' }}>
                                  {isTier3Unlocked ? '🔥 Meister-Flamme aktiv!' : `Noch ${Math.max(1, 9 - streak)}${Math.max(1, 9 - streak) === 1 ? ' Tag' : ' Tage'} bis Meister-Flamme`}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                </>
              )}

              {/* ========================================================================= */}
              {/* LEVEL 3: PRO (16+ JAHRE) - 100% UNVERÄNDERTE MASTER-BLAUPAUSE            */}
              {/* ========================================================================= */}
              {(studentUiLevel === 'pro' || !studentUiLevel) && (
                <>
                  {/* TOP 4 KPIs ROW */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(180px, 1fr))', 
                    gap: isMobile ? '10px' : '16px', 
                    width: '100%' 
                  }}>
                    {/* KPI 1: XP (Vibrant Indigo-Blue) */}
                    {xpActive && (
                      <div style={{ 
                        flex: '1 1 0px',
                        minWidth: 0,
                        position: 'relative', overflow: 'hidden',
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        color: 'white',
                        borderRadius: '20px',
                        boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.35)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        minHeight: '70px',
                        padding: '16px',
                        boxSizing: 'border-box',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1px solid rgba(255, 255, 255, 0.15)'
                      }} className="hover-scale">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                          <span style={{ 
                            fontSize: '0.68rem', 
                            fontWeight: 900, 
                            opacity: 0.95, 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.08em',
                            color: 'white'
                          }}>
                            Level XP
                          </span>
                          <div style={{ 
                            background: 'rgba(255, 255, 255, 0.2)', 
                            padding: '6px', 
                            borderRadius: '10px' 
                          }}>
                            <Star size={14} color="white" fill="white" />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
                          <span style={{ 
                            fontSize: '1.6rem', 
                            fontWeight: 950, 
                            fontFamily: "'Plus Jakarta Sans', sans-serif", 
                            letterSpacing: '-0.02em',
                            color: 'white'
                          }}>
                            {currentXp || 0}
                          </span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.9, color: 'white' }}>
                            XP
                          </span>
                        </div>
                      </div>
                    )}

                    {/* KPI 2: Songs (Vibrant Campus Green) */}
                    <div style={{ 
                      flex: '1 1 0px',
                      minWidth: 0,
                      position: 'relative', overflow: 'hidden',
                      background: 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)',
                      color: 'white',
                      borderRadius: '20px',
                      boxShadow: '0 10px 25px -5px rgba(52, 168, 83, 0.35)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      minHeight: '70px',
                      padding: '16px',
                      boxSizing: 'border-box',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid rgba(255, 255, 255, 0.15)'
                    }} className="hover-scale">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <span style={{ 
                          fontSize: '0.68rem', 
                          fontWeight: 900, 
                          opacity: 0.95, 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.08em',
                          color: 'white'
                        }}>
                          Songs
                        </span>
                        <div style={{ 
                          background: 'rgba(255, 255, 255, 0.2)', 
                          padding: '6px', 
                          borderRadius: '10px' 
                        }}>
                          <Award size={14} color="white" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
                        <span style={{ 
                          fontSize: '1.6rem', 
                          fontWeight: 950, 
                          fontFamily: "'Plus Jakarta Sans', sans-serif", 
                          letterSpacing: '-0.02em',
                          color: 'white'
                        }}>
                          {songStats.masteredCount}/{songStats.assignedCount}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.9, color: 'white' }}>
                          Songs
                        </span>
                      </div>
                    </div>

                    {/* KPI 3: Übeminuten (Vibrant Sun Yellow with High-Contrast Deep Slate Typography) */}
                    {flamesActive && (
                      <div style={{ 
                        flex: '1 1 0px',
                        minWidth: 0,
                        position: 'relative', overflow: 'hidden',
                        background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
                        color: '#0f172a',
                        borderRadius: '20px',
                        boxShadow: '0 10px 25px -5px rgba(234, 179, 8, 0.35)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        minHeight: '70px',
                        padding: '16px',
                        boxSizing: 'border-box',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1px solid rgba(255, 255, 255, 0.3)'
                      }} className="hover-scale">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                          <span style={{ 
                            fontSize: '0.68rem', 
                            fontWeight: 900, 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.08em',
                            color: '#78350f'
                          }}>
                            Übeminuten
                          </span>
                          <div style={{ 
                            background: 'rgba(0, 0, 0, 0.12)', 
                            padding: '6px', 
                            borderRadius: '10px' 
                          }}>
                            <Clock size={14} color="#451a03" />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
                          {(() => {
                            const dbSecs = (fokusLogs || []).reduce((sum, log) => sum + getExactLogSeconds(log), 0);
                            const liveSecs = sessionActive ? secondsElapsed : 0;
                            const totalSecs = dbSecs + liveSecs;
                            if (totalSecs > 0 && totalSecs < 60) {
                              return (
                                <>
                                  <span style={{ 
                                    fontSize: '1.6rem', 
                                    fontWeight: 950, 
                                    fontFamily: "'Plus Jakarta Sans', sans-serif", 
                                    letterSpacing: '-0.02em',
                                    color: '#0f172a'
                                  }}>
                                    {Math.round(totalSecs)}
                                  </span>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#78350f' }}>
                                    Sek.
                                  </span>
                                </>
                              );
                            }
                            return (
                              <>
                                <span style={{ 
                                  fontSize: '1.6rem', 
                                  fontWeight: 950, 
                                  fontFamily: "'Plus Jakarta Sans', sans-serif", 
                                  letterSpacing: '-0.02em',
                                  color: '#0f172a'
                                }}>
                                  {secondsToDisplayMinutes(totalSecs)}
                                </span>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#78350f' }}>
                                  Min.
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* KPI 4: Tagesserie / Streak (Vibrant Ruby-Flame Red) */}
                    {flamesActive && (
                      <div style={{ 
                        flex: '1 1 0px',
                        minWidth: 0,
                        position: 'relative', overflow: 'hidden',
                        background: 'linear-gradient(135deg, #ff4b4b 0%, #dc2626 100%)',
                        color: 'white',
                        borderRadius: '20px',
                        boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.35)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        minHeight: '70px',
                        padding: '16px',
                        boxSizing: 'border-box',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                      }} className="hover-scale">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                          <span style={{ 
                            fontSize: '0.68rem', 
                            fontWeight: 900, 
                            opacity: 0.95, 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.08em',
                            color: 'white'
                          }}>
                            Tagesserie
                          </span>
                          <div style={{ 
                            background: 'rgba(255, 255, 255, 0.25)', 
                            padding: '6px', 
                            borderRadius: '10px' 
                          }}>
                            <Flame size={14} color="white" fill="white" />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
                          <span style={{ 
                            fontSize: '1.6rem', 
                            fontWeight: 950, 
                            fontFamily: "'Plus Jakarta Sans', sans-serif", 
                            letterSpacing: '-0.02em',
                            color: 'white'
                          }}>
                            {avatar?.streak_flame || 0}
                          </span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.95, color: 'white' }}>
                            {(avatar?.streak_flame || 0) === 1 ? 'Tag' : 'Tage'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PRO WELCOME BLOCK */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.6) 100%)',
                    backdropFilter: 'blur(24px) saturate(1.8)',
                    WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                    border: '1px solid rgba(255, 255, 255, 0.7)',
                    borderRadius: '30px',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: 'stretch',
                    boxShadow: '0 20px 50px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    position: 'relative',
                    minHeight: isMobile ? 'auto' : '200px'
                  }}>
                    <Music size={160} style={{ position: 'absolute', right: '5%', bottom: '-40px', opacity: 0.03, color: '#6366f1', pointerEvents: 'none' }} />

                    <div style={{
                      width: isMobile ? '100%' : '190px',
                      height: isMobile ? '160px' : 'auto',
                      minHeight: isMobile ? '160px' : 'auto',
                      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                      position: 'relative',
                      overflow: 'hidden',
                      borderRight: isMobile ? 'none' : '1px solid rgba(0, 0, 0, 0.1)',
                      borderBottom: isMobile ? '1px solid rgba(0, 0, 0, 0.1)' : 'none'
                    }}>
                      <div style={{
                        position: 'absolute',
                        width: '130px',
                        height: '130px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0) 70%)',
                        filter: 'blur(12px)',
                        zIndex: 1
                      }} />
                      <img 
                        src={resolveCampusStudentAvatar({ ...studentUser, instrument: studentInstrumentName || studentUser?.instrument })} 
                        alt="" 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          zIndex: 2,
                          transform: 'scale(1.05)',
                          transition: 'transform 0.5s ease'
                        }} 
                        className="hover-zoom"
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, flex: 1, zIndex: 2, padding: isMobile ? '16px 18px' : '24px 32px', boxSizing: 'border-box', maxWidth: '100%' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#ffffff',
                          border: '1px solid rgba(0, 0, 0, 0.05)',
                          borderRadius: '100px',
                          padding: '4px 12px',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                        }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34a853', animation: 'pulse 2s infinite' }} />
                          <span style={{ 
                            fontSize: '0.65rem', 
                            fontWeight: 800, 
                            color: '#475569', 
                            letterSpacing: '0.05em', 
                            textTransform: 'uppercase', 
                            fontFamily: 'monospace' 
                          }}>
                            {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} UHR
                          </span>
                        </div>

                        {/* Offline- & Keller-Bereit Status Badge */}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: typeof navigator !== 'undefined' && !navigator.onLine 
                            ? '#fefce8' 
                            : 'rgba(52, 168, 83, 0.08)',
                          border: typeof navigator !== 'undefined' && !navigator.onLine 
                            ? '1px solid #fef08a' 
                            : '1px solid rgba(52, 168, 83, 0.2)',
                          borderRadius: '100px',
                          padding: '4px 12px',
                          color: typeof navigator !== 'undefined' && !navigator.onLine 
                            ? '#854d0e' 
                            : '#15803d',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                        }}>
                          <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: typeof navigator !== 'undefined' && !navigator.onLine ? '#eab308' : '#34a853'
                          }} />
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 900,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase'
                          }}>
                            {typeof navigator !== 'undefined' && !navigator.onLine 
                              ? '☁️ Offline-Modus' 
                              : '● Offline-bereit'}
                          </span>
                        </div>

                        <div style={{
                          background: 'rgba(99, 102, 241, 0.08)',
                          color: '#4f46e5',
                          fontSize: isMusicStandMode ? '0.80rem' : '0.72rem',
                          fontWeight: 900,
                          borderRadius: '100px',
                          padding: '5px 14px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em'
                        }}>
                          STUDIO MODE • PRO
                        </div>
                      </div>

                      <h3 style={{ 
                        margin: 0, 
                        fontSize: isMobile ? '20px' : (isMusicStandMode ? '32px' : '28px'), 
                        fontWeight: 950, 
                        color: '#0f172a', 
                        fontFamily: "'Plus Jakarta Sans', sans-serif", 
                        lineHeight: 1.15,
                        letterSpacing: '-0.02em',
                        wordBreak: 'break-word'
                      }}>
                        Willkommen zurück{studentUser?.first_name ? `, ${studentUser.first_name}` : ''}! 👋
                      </h3>
                      
                      <p style={{ 
                        margin: '8px 0 0 0', 
                        fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', 
                        color: '#475569', 
                        fontWeight: 650, 
                        lineHeight: 1.45, 
                        maxWidth: '95%' 
                      }}>
                        {flamesActive 
                          ? 'Fokus auf dein Repertoire: Kurze, regelmäßige Sessions festigen deine Songs & sichern deinen Streak. ⚡'
                          : 'Fokus auf dein Repertoire: Kurze, regelmäßige Sessions festigen deine Songs. 🎵'}
                      </p>

                      {(() => {
                        const nextOcc = (scheduleOccurrences || [])[0] || (schoolYearOccurrences || [])[0];
                        const hasToday = !!briefingData?.todayLesson;
                        const teacherId = hasToday ? briefingData.todayLesson.teacher_id : (nextOcc?.teacher_id || studentUser?.teacher_id);
                        const timeLabel = hasToday ? briefingData.todayLesson.time : (nextOcc?.start_time?.substring(0, 5) || '15:15');
                        const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                        const todayStr = new Date().toISOString().split('T')[0];
                        const targetDateStr = hasToday ? todayStr : (nextOcc?.date || todayStr);
                        const targetDayOfWeek = targetDateStr ? DAYS_DE[new Date(targetDateStr).getDay()] : 'Termin';
                        const formattedDate = targetDateStr ? new Date(targetDateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '';
                        const label = `${targetDayOfWeek} (${formattedDate}), ${timeLabel} Uhr`;
                        const finalOccurId = hasToday ? (briefingData?.todayLesson?.id || `today-${teacherId}-${todayStr}`) : (nextOcc?.id || `sched-${studentId}`);
                        const lessonText = hasToday 
                          ? `Heute, ${briefingData.todayLesson.time} Uhr` 
                          : (nextOcc ? (() => {
                              const d = new Date(nextOcc.date);
                              return `${d.toLocaleDateString('de-DE', {weekday: 'long', day: '2-digit', month: '2-digit'})} - ${nextOcc.start_time?.substring(0,5)} Uhr`;
                            })() : 'Demnächst');
                        const hasMessage = checkOccurrenceHasMessages(nextOcc || finalOccurId, targetDateStr);
                        const unreadMsgCount = getOccurrenceUnreadCount(nextOcc || finalOccurId, targetDateStr);
                        const isCanceled = nextOcc?.status === 'canceled_by_student' || nextOcc?.status === 'cancelled' || nextOcc?.status === 'teacher_sick' || nextOcc?.status === 'canceled_by_teacher_sick';

                        return (
                          <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            {/* 1. Next Lesson Status Badge */}
                            <div style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '8px', 
                              background: isCanceled ? 'rgba(239, 68, 68, 0.08)' : 'linear-gradient(135deg, rgba(52, 168, 83, 0.08) 0%, rgba(52, 168, 83, 0.02) 100%)', 
                              color: isCanceled ? '#dc2626' : '#34a853', 
                              padding: '8px 16px', 
                              minHeight: '38px',
                              boxSizing: 'border-box',
                              borderRadius: '12px', 
                              fontSize: '0.78rem', 
                              fontWeight: 800, 
                              border: isCanceled ? '1px dashed rgba(239, 68, 68, 0.3)' : '1px solid rgba(52, 168, 83, 0.18)'
                            }}>
                              <Calendar size={14} color={isCanceled ? '#dc2626' : '#34a853'} />
                              <span>{isCanceled ? `Abgesagt: ${lessonText}` : `Nächster Unterricht: ${lessonText}`}</span>
                            </div>

                            {/* 2. Nachrichten / Shoutbox Button (1:1 synchron mit Termine-Board) */}
                            {teacherId && (
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAppointmentChatData({
                                    teacherId,
                                    date: targetDateStr,
                                    start_time: timeLabel,
                                    label,
                                    occurrenceId: finalOccurId,
                                    status: nextOcc?.status || (isCanceled ? 'cancelled' : 'scheduled'),
                                    isCancelled: isCanceled
                                  });
                                  setShowAppointmentChat(true);
                                }}
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '8px', 
                                  background: hasMessage ? '#fefce8' : '#ffffff', 
                                  color: hasMessage ? '#ca8a04' : '#475569', 
                                  padding: '8px 16px', 
                                  minHeight: '38px',
                                  boxSizing: 'border-box',
                                  borderRadius: '14px', 
                                  fontSize: '0.80rem', 
                                  fontWeight: 900, 
                                  border: hasMessage ? '1px solid #fde047' : '1px solid #cbd5e1', 
                                  cursor: 'pointer',
                                  boxShadow: hasMessage ? '0 2px 8px rgba(202, 138, 4, 0.18)' : '0 2px 6px rgba(0, 0, 0, 0.03)',
                                  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                  e.currentTarget.style.background = hasMessage ? '#fef08a' : '#f8fafc';
                                  e.currentTarget.style.boxShadow = hasMessage ? '0 4px 12px rgba(202, 138, 4, 0.25)' : '0 4px 12px rgba(0, 0, 0, 0.08)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'none';
                                  e.currentTarget.style.background = hasMessage ? '#fefce8' : '#ffffff';
                                  e.currentTarget.style.boxShadow = hasMessage ? '0 2px 8px rgba(202, 138, 4, 0.18)' : '0 2px 6px rgba(0, 0, 0, 0.03)';
                                }}
                                title="1:1 Shoutbox zum Unterrichtstermin"
                              >
                                <MessageSquare 
                                  size={15} 
                                  color={hasMessage ? '#ca8a04' : '#64748b'} 
                                  fill={hasMessage ? '#eab308' : 'none'} 
                                />
                                <span>{unreadMsgCount > 0 ? (unreadMsgCount === 1 ? '1 neue Nachricht' : `${unreadMsgCount} neue Nachrichten`) : (hasMessage ? 'Nachrichten vorhanden' : 'Nachrichten')}</span>
                                {unreadMsgCount > 0 && (
                                  <span style={{
                                    background: '#f59e0b',
                                    color: '#ffffff',
                                    fontSize: '0.70rem',
                                    fontWeight: 950,
                                    padding: '2px 8px',
                                    borderRadius: '100px',
                                    letterSpacing: '0.02em',
                                    boxShadow: '0 2px 6px rgba(245, 158, 11, 0.35)'
                                  }}>
                                    {unreadMsgCount === 1 ? '1 neu ★' : `${unreadMsgCount} neu ★`}
                                  </span>
                                )}
                              </button>
                            )}

                            {/* 3. Praxis-Toolbox (Metronom & Stimmgerät) Button */}
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowStudentToolbox(true);
                              }}
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                background: '#ffffff', 
                                color: '#0f172a', 
                                padding: '8px 16px', 
                                minHeight: '38px',
                                boxSizing: 'border-box',
                                borderRadius: '14px', 
                                fontSize: '0.80rem', 
                                fontWeight: 900, 
                                border: '1px solid #cbd5e1', 
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                                e.currentTarget.style.borderColor = '#34a853';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.03)';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                              }}
                              title="Praxis-Toolbox (Metronom, Rhythmus-Trainer & Stimmgerät) öffnen"
                            >
                              <Sliders size={15} color="#34a853" />
                              <span>Praxis-Toolbox</span>
                            </button>

                            {/* 4. Absage / Reaktivieren Button */}
                            {nextOcc && (isCanceled || isStudentAbsenceAllowed || checkIsParentUnlockedGlobal()) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isCanceled) {
                                    handleTriggerUndoCancelOccurrence(nextOcc);
                                  } else {
                                    handleTriggerCancelOccurrence(nextOcc);
                                  }
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  background: isCanceled ? '#fee2e2' : '#ffffff',
                                  color: isCanceled ? '#dc2626' : '#475569',
                                  padding: '8px 16px',
                                  minHeight: '38px',
                                  boxSizing: 'border-box',
                                  borderRadius: '12px',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  border: isCanceled ? '1px solid #f87171' : '1px solid #e2e8f0',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                                  transition: 'all 0.2s'
                                }}
                                className="hover-scale"
                                title={isCanceled ? "Absage zurücknehmen / Termin reaktivieren" : "Unterrichtstermin absagen"}
                              >
                                {isCanceled ? (
                                  !isStudentAbsenceAllowed ? <Lock size={14} color="#dc2626" /> : <CalendarX size={14} color="#dc2626" />
                                ) : (
                                  !isStudentAbsenceAllowed ? <Lock size={14} color="#64748b" /> : <CalendarX size={14} color="#64748b" />
                                )}
                                <span>{isCanceled ? (!isStudentAbsenceAllowed ? 'Absage zurücknehmen (Eltern-PIN)' : 'Absage zurücknehmen') : (!isStudentAbsenceAllowed ? 'Unterricht absagen (Eltern-PIN)' : 'Unterricht absagen')}</span>
                              </button>
                            )}

                            {/* 4. Wochenfokus / Kompetenz-Radar Badge */}
                            {weeklyFocusMeta && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (handleOpenHomeworkBookWithView) {
                                    handleOpenHomeworkBookWithView('skillradar');
                                  }
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                                  color: '#0f172a',
                                  padding: '8px 16px',
                                  minHeight: '38px',
                                  boxSizing: 'border-box',
                                  borderRadius: '12px',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  border: '1.5px solid #cbd5e1',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                                  transition: 'all 0.18s ease'
                                }}
                                className="hover-scale"
                                title="Zum Kompetenz-Radar im Aufgabenheft"
                              >
                                <Target size={14} color="#0f172a" />
                                <span>Fokus: {weeklyFocusMeta.label}</span>
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* PRO: PEDAGOGISCHER DREISPALTIER-ÜBEBEREICH */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                    gap: '24px', 
                    alignItems: 'stretch' 
                  }}>

                    {/* Spalte 1: Hausaufgaben (Level-optimiert: Junior L1, Teen L2, Pro L3) */}
                    {(() => {
                      const getPrevWeek = (wkStr: string): string => {
                        const [year, week] = wkStr.split('-W').map(Number);
                        const simple = new Date(year, 0, 4);
                        const day = simple.getDay() || 7;
                        const monday = new Date(simple.getTime() - (day - 1) * 24 * 3600000);
                        monday.setDate(monday.getDate() + (week - 1) * 7 - 7);
                        return getISOWeekRaw(monday, 1);
                      };

                      const currentWeekStr = getISOWeek(getSimulatedNow());
                      const prevWeekStr = getPrevWeek(currentWeekStr);
                      const currentWeekNum = currentWeekStr.split('-W')[1] || '';
                      const prevWeekNum = prevWeekStr.split('-W')[1] || '';

                      const parseHomeworkNotes = (rawNotes: any): string[] => {
                        if (!rawNotes) return [];
                        if (Array.isArray(rawNotes)) {
                          const res: string[] = [];
                          rawNotes.forEach(r => {
                            parseHomeworkNotes(r).forEach(x => res.push(x));
                          });
                          return res;
                        }
                        if (typeof rawNotes !== 'string') return [String(rawNotes).trim()];
                        const trimmed = rawNotes.trim();
                        if (!trimmed) return [];
                        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || trimmed.startsWith('"{') || trimmed.startsWith('"[') || trimmed.startsWith('{')) {
                          try {
                            const parsed = JSON.parse(trimmed);
                            if (Array.isArray(parsed)) {
                              const res: string[] = [];
                              parsed.forEach(r => {
                                parseHomeworkNotes(r).forEach(x => res.push(x));
                              });
                              return res;
                            }
                            if (typeof parsed === 'string' && parsed !== trimmed) {
                              return parseHomeworkNotes(parsed);
                            }
                          } catch {}
                        }
                        return [trimmed];
                      };

                      const getNotesForWeek = (weekStr: string): string[] => {
                        const notes: string[] = [];
                        (progressItems || []).forEach(item => {
                          const itemW = getItemWeek(item);
                          const isActive = item.is_current_homework || item.topic_name.startsWith('Hausaufgabe KW ') || itemW === weekStr;
                          if (isActive && item.homework_notes && item.homework_notes.trim()) {
                            parseHomeworkNotes(item.homework_notes).forEach(n => {
                              if (n && n.trim() && !notes.includes(n.trim())) notes.push(n.trim());
                            });
                          }
                        });

                        try {
                          const localGenNotes = localStorage.getItem(`campus_homework_notes_${studentId}`);
                          if (localGenNotes && localGenNotes.trim()) {
                            parseHomeworkNotes(localGenNotes).forEach(n => {
                              if (n && n.trim() && !notes.includes(n.trim())) notes.push(n.trim());
                            });
                          }
                        } catch {}

                        return notes;
                      };

                      const currentWeekNotes = getNotesForWeek(currentWeekStr);
                      const audioTracks: AudioTrackItem[] = [];
                      currentWeekNotes.forEach((n, idx) => {
                        if (n.startsWith('AUDIO:')) {
                          const parts = n.substring(6).split('|');
                          audioTracks.push({
                            url: parts[0],
                            duration: parseFloat(parts[1]) || 0,
                            date: parts[2],
                            label: parts[3] || `Aufnahme #${audioTracks.length + 1}`,
                            author: parts[4] || 'teacher',
                            songTag: parts[7] || undefined,
                            idx
                          });
                        }
                      });

                      // 🌉 Smart Audio Bridge: Bridge active practice tracks from latest past lesson if current week has none
                      if (audioTracks.length === 0) {
                        const pastHwSnapshots = (progressItems || []).filter((item: any) => {
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
                          try {
                            const parsed = typeof latestPast.homework_notes === 'string' ? JSON.parse(latestPast.homework_notes) : latestPast.homework_notes;
                            if (Array.isArray(parsed)) {
                              parsed.forEach((item: string, index: number) => {
                                if (typeof item === 'string' && item.startsWith('AUDIO:')) {
                                  const parts = item.substring(6).split('|');
                                  audioTracks.push({
                                    url: parts[0],
                                    duration: parseFloat(parts[1]) || 0,
                                    date: parts[2],
                                    label: parts[3] || ('Aufnahme #' + (audioTracks.length + 1)),
                                    author: parts[4] || 'teacher',
                                    songTag: parts[7] || undefined,
                                    isCarriedOver: true,
                                    idx: index
                                  });
                                }
                              });
                            }
                          } catch {}
                        }
                      }

                      const cleanGeneralNote = (text: string) => {
                        if (!text) return '';
                        let clean = text;
                        if (clean.startsWith('[') || clean.startsWith('{') || clean.startsWith('"')) {
                          try {
                            const p = JSON.parse(clean);
                            if (Array.isArray(p)) {
                              clean = p.filter((x: any) => typeof x === 'string' && !x.startsWith('AUDIO:') && !x.startsWith('STICKER:') && !x.startsWith('LATENCY:') && !x.startsWith('SNAPSHOT_') && !x.startsWith('FEEDBACK:') && !x.startsWith('STUDENT_NOTE_PUBLIC:') && !x.startsWith('STUDENT_NOTE_PRIVATE:') && !x.startsWith('STUDENT_QUESTION:')).join(' ');
                            } else if (typeof p === 'string') {
                              clean = p;
                            }
                          } catch {}
                        }
                        return clean
                          .replace(/\["AUDIO:[^"]*"\]/g, '')
                          .replace(/AUDIO:[^\s,|]+/g, '')
                          .replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE|STUDENT_QUESTION):[^|]*\|/, '')
                          .replace(/^STUDENT_QUESTION:[^|]*\|?/i, '')
                          .replace(/^❓\s*Frage für den Unterricht:\s*/i, '')
                          .trim();
                      };

                      let isPastNoteCarriedOver = false;
                      let generalNoteRaw = currentWeekNotes.find(n => !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.startsWith('LATENCY:') && !n.startsWith('SNAPSHOT_') && !n.startsWith('FEEDBACK:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:') && !n.startsWith('STUDENT_QUESTION:'));
                      if (!generalNoteRaw) {
                        const pastHwSnapshots = (progressItems || []).filter((item: any) => {
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
                          try {
                            const parsed = typeof latestPast.homework_notes === 'string' ? JSON.parse(latestPast.homework_notes) : latestPast.homework_notes;
                            if (Array.isArray(parsed)) {
                              const pastNote = parsed.find((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.startsWith('LATENCY:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('SNAPSHOT_') && !n.startsWith('FEEDBACK:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:') && !n.startsWith('STUDENT_QUESTION:'));
                              if (pastNote) {
                                generalNoteRaw = pastNote;
                                isPastNoteCarriedOver = true;
                              }
                            } else if (typeof parsed === 'string') {
                              generalNoteRaw = parsed;
                              isPastNoteCarriedOver = true;
                            }
                          } catch {}
                        }
                      }
                      const generalNote = generalNoteRaw ? cleanGeneralNote(generalNoteRaw) : '';

                      const isAudioCarriedOver = audioTracks.some(t => t.isCarriedOver);
                      const isCarriedOverPlan = isAudioCarriedOver || isPastNoteCarriedOver;

                      let studentQuestionEntry = currentWeekNotes.find(n => typeof n === 'string' && (n.startsWith('STUDENT_QUESTION:') || n.startsWith('❓ Frage für den Unterricht:')));
                      if (!studentQuestionEntry) {
                        const pastHwSnapshots = (progressItems || []).filter((item: any) => {
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
                          try {
                            const parsed = typeof latestPast.homework_notes === 'string' ? JSON.parse(latestPast.homework_notes) : latestPast.homework_notes;
                            if (Array.isArray(parsed)) {
                              const pastQ = parsed.find((n: string) => typeof n === 'string' && (n.startsWith('STUDENT_QUESTION:') || n.startsWith('❓ Frage für den Unterricht:')));
                              if (pastQ) studentQuestionEntry = pastQ;
                            }
                          } catch {}
                        }
                      }

                      let studentQuestionText = '';
                      if (studentQuestionEntry) {
                        if (studentQuestionEntry.startsWith('STUDENT_QUESTION:')) {
                          const withoutPrefix = studentQuestionEntry.replace(/^STUDENT_QUESTION:/, '');
                          const pipeIdx = withoutPrefix.indexOf('|');
                          studentQuestionText = pipeIdx !== -1 ? withoutPrefix.slice(pipeIdx + 1).trim() : withoutPrefix.trim();
                        } else {
                          studentQuestionText = studentQuestionEntry.replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
                        }
                      }

                      const cleanTitle = (t: string) => (t || '')
                        .replace(/\s*\((gitarre|guitar|e-gitarre|bass|e-bass|drums|schlagzeug|klavier|piano|keys|keyboard|vocals|gesang|stimme|allgemein)\)/i, '')
                        .replace(/^Linken Park/i, 'Linkin Park');
                      const effectiveId = studentId || studentUser?.id;

                      const formatPageNumbers = (pages: number[]): string => {
                        if (pages.length === 0) return '';
                        const sorted = [...pages].sort((a, b) => a - b);
                        const ranges: string[] = [];
                        let start = sorted[0];
                        let end = start;
                        for (let i = 1; i < sorted.length; i++) {
                          if (sorted[i] === end + 1) end = sorted[i];
                          else {
                            ranges.push(start === end ? `${start}` : `${start}–${end}`);
                            start = sorted[i];
                            end = start;
                          }
                        }
                        ranges.push(start === end ? `${start}` : `${start}–${end}`);
                        return `S. ${ranges.join(', ')}`;
                      };

                      // 1. Gather all active homework books & pages directly from localProgress (assigned Lehrwerke)
                      const activeLehrwerkeMap: Record<string, { pages: { num: number; notes: string; status: string }[] }> = {};

                      (localProgress || []).forEach((assignment: any) => {
                        const isStudentMatch = !effectiveId || String(assignment.studentId) === String(effectiveId) || String(assignment.student_id) === String(effectiveId);
                        if (!isStudentMatch || !assignment.pageStates) return;
                        const book = lehrwerke.find(g => String(g.id) === String(assignment.lehrwerkId));
                        const bookTitle = book?.title || assignment.bookTitle || assignment.lehrwerkTitle;
                        if (!bookTitle) return;

                        Object.entries(assignment.pageStates).forEach(([pNumStr, pState]: [string, any]) => {
                          if (pState?.status === 'homework' || pState?.isCurrentHomework) {
                            const pageNum = parseInt(pNumStr, 10);
                            if (!isNaN(pageNum)) {
                              if (!activeLehrwerkeMap[bookTitle]) {
                                activeLehrwerkeMap[bookTitle] = { pages: [] };
                              }
                              if (!activeLehrwerkeMap[bookTitle].pages.some(p => p.num === pageNum)) {
                                let cleanNote = pState.homeworkNotes || pState.homework_notes || pState.notes || '';
                                if (cleanNote.startsWith('[') || cleanNote.startsWith('{')) {
                                  try {
                                    const parsed = JSON.parse(cleanNote);
                                    if (Array.isArray(parsed)) {
                                      cleanNote = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
                                    }
                                  } catch {}
                                }
                                cleanNote = cleanNote.replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '').replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
                                activeLehrwerkeMap[bookTitle].pages.push({
                                  num: pageNum,
                                  notes: cleanNote,
                                  status: pState.status || 'homework'
                                });
                              }
                            }
                          }
                        });
                      });

                      // 2. Also incorporate items from progressItems (songs, theory, database rows) and songs state
                      const otherActiveHWItems: any[] = [];
                      (progressItems || []).forEach(item => {
                        if (!item.topic_name || item.topic_name.startsWith('Hausaufgabe KW ')) return;
                        if (item.topic_name.includes(' - Seite ')) {
                          const parts = item.topic_name.split(' - Seite ');
                          const rawBookTitle = cleanTitle(parts[0].trim());
                          const pageNum = parseInt(parts[1], 10);
                          const book = lehrwerke.find(g => cleanTitle(g.title).toLowerCase() === rawBookTitle.toLowerCase());
                          const resolvedTitle = book?.title || rawBookTitle;
                          if (resolvedTitle) {
                            if (!activeLehrwerkeMap[resolvedTitle]) {
                              activeLehrwerkeMap[resolvedTitle] = { pages: [] };
                            }
                            if (!isNaN(pageNum) && !activeLehrwerkeMap[resolvedTitle].pages.some(p => p.num === pageNum)) {
                              let cleanNote = item.homework_notes || '';
                              if (cleanNote.startsWith('[') || cleanNote.startsWith('{')) {
                                try {
                                  const parsed = JSON.parse(cleanNote);
                                  if (Array.isArray(parsed)) {
                                    cleanNote = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
                                  }
                                } catch {}
                              }
                              cleanNote = cleanNote.replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '').replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
                              activeLehrwerkeMap[resolvedTitle].pages.push({
                                num: pageNum,
                                notes: cleanNote,
                                status: item.status || 'homework'
                              });
                            }
                          }
                        } else {
                          const localHw = effectiveId ? (localStorage.getItem(`song_hw_${effectiveId}_${item.id}`) ?? (item.song_id ? localStorage.getItem(`song_hw_${effectiveId}_${item.song_id}`) : null)) : null;
                          if (localHw !== 'false') {
                            const isSongHw = (localHw === 'true') || Boolean(item.is_current_homework);
                            if (isSongHw) {
                              const cleanT = cleanTitle((item.topic_name || item.title || '').replace(/\s*\([^)]*\)\s*$/, ''));
                              if (cleanT && !otherActiveHWItems.some(existing => cleanTitle((existing.topic_name || existing.title || '').replace(/\s*\([^)]*\)\s*$/, '')) === cleanT)) {
                                let cachedNote = (effectiveId ? (localStorage.getItem(`song_note_${effectiveId}_${item.id}`) || localStorage.getItem(`song_note_${effectiveId}_${item.song_id}`)) : '') ||
                                                 item.homework_notes || '';
                                if (cachedNote.startsWith('[') || cachedNote.startsWith('{')) {
                                  try {
                                    const parsed = JSON.parse(cachedNote);
                                    if (Array.isArray(parsed)) {
                                      cachedNote = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
                                    }
                                  } catch {}
                                }
                                cachedNote = cachedNote.replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '').replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();

                                otherActiveHWItems.push({
                                  ...item,
                                  homework_notes: cachedNote
                                });
                              }
                            }
                          }
                        }
                      });

                      // Also incorporate student's activeSongSkills (exact 1:1 match with MeisterwerkDocumentationModal)
                      (activeSongSkills || []).forEach((skill: any) => {
                        const localHw = effectiveId ? (localStorage.getItem(`song_hw_${effectiveId}_${skill.id}`) ??
                                        (skill.song_id ? localStorage.getItem(`song_hw_${effectiveId}_${skill.song_id}`) : null) ??
                                        (skill.songs?.id ? localStorage.getItem(`song_hw_${effectiveId}_${skill.songs.id}`) : null)) : null;

                        const isHw = (localHw === 'true') || (localHw !== 'false' && Boolean(skill.is_current_homework));

                        if (isHw) {
                          const songArtist = skill.songs?.artist || skill.artist || '';
                          const songTitle = skill.songs?.title || skill.title || skill.song_title || 'Song';
                          if (songTitle.includes(' - Seite ') || songTitle.startsWith('Hausaufgabe KW ')) return;
                          const songInstrument = skill.instrument ? ` (${skill.instrument})` : '';
                          const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;
                          const cleanT = cleanTitle(fullTitle);

                          if (cleanT && !otherActiveHWItems.some(existing => cleanTitle((existing.topic_name || existing.title || '').replace(/\s*\([^)]*\)\s*$/, '')) === cleanT)) {
                            let cachedNote = (effectiveId ? (localStorage.getItem(`song_note_${effectiveId}_${skill.id}`) ||
                                             (skill.song_id ? localStorage.getItem(`song_note_${effectiveId}_${skill.song_id}`) : '') ||
                                             (skill.songs?.id ? localStorage.getItem(`song_note_${effectiveId}_${skill.songs.id}`) : '')) : '') ||
                                             skill.homework_notes || '';
                            if (cachedNote.startsWith('[') || cachedNote.startsWith('{')) {
                              try {
                                const parsed = JSON.parse(cachedNote);
                                if (Array.isArray(parsed)) {
                                  cachedNote = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
                                }
                              } catch {}
                            }
                            cachedNote = cachedNote.replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '').replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();

                            otherActiveHWItems.push({
                              id: skill.id,
                              song_id: skill.song_id || skill.songs?.id,
                              topic_name: fullTitle,
                              title: fullTitle,
                              is_current_homework: true,
                              status: 'IN_PROGRESS',
                              homework_notes: cachedNote
                            });
                          }
                        }
                      });

                      // 🔄 Snapshot Hydration for Pro Mode
                      if (Object.keys(activeLehrwerkeMap).length === 0 || otherActiveHWItems.length === 0) {
                        const allSnapshotCandidates = (progressItems || []).filter((item: any) => {
                          if (!item.topic_name?.startsWith('Hausaufgabe KW ')) return false;
                          const itWeekIso = getItemWeek(item);
                          return itWeekIso && itWeekIso <= currentWeekStr;
                        });
                        allSnapshotCandidates.sort((a: any, b: any) => {
                          const wA = getItemWeek(a);
                          const wB = getItemWeek(b);
                          if (wA !== wB) return (wB || '').localeCompare(wA || '');
                          const tA = new Date(a.updated_at || a.created_at || 0).getTime();
                          const tB = new Date(b.updated_at || b.created_at || 0).getTime();
                          return tB - tA;
                        });

                        for (const snapItem of allSnapshotCandidates) {
                          if (!snapItem.homework_notes) continue;
                          let parsedSnapNotes: any = null;
                          try {
                            parsedSnapNotes = typeof snapItem.homework_notes === 'string' ? JSON.parse(snapItem.homework_notes) : snapItem.homework_notes;
                          } catch {}
                          if (!Array.isArray(parsedSnapNotes)) continue;

                          if (Object.keys(activeLehrwerkeMap).length === 0) {
                            const snapLwEntry = parsedSnapNotes.find((n: any) => typeof n === 'string' && n.startsWith('SNAPSHOT_LEHRWERKE:'));
                            if (snapLwEntry) {
                              try {
                                const rawJson = snapLwEntry.substring('SNAPSHOT_LEHRWERKE:'.length);
                                const parsedLw = JSON.parse(rawJson);
                                if (Array.isArray(parsedLw) && parsedLw.length > 0) {
                                  parsedLw.forEach((lw: any) => {
                                    const title = cleanTitle(lw.title || '');
                                    const pages = Array.isArray(lw.pages) ? [...lw.pages].sort((a: number, b: number) => a - b) : [];
                                    if (title && pages.length > 0 && !activeLehrwerkeMap[title]) {
                                      activeLehrwerkeMap[title] = {
                                        pages: pages.map((pNum: number) => ({
                                          num: pNum,
                                          notes: '',
                                          status: 'homework'
                                        }))
                                      };
                                    }
                                  });
                                }
                              } catch (e) {
                                console.warn('Error hydrating SNAPSHOT_LEHRWERKE in Pro:', e);
                              }
                            }
                          }

                          if (otherActiveHWItems.length === 0) {
                            const snapSongEntry = parsedSnapNotes.find((n: any) => typeof n === 'string' && n.startsWith('SNAPSHOT_SONGS:'));
                            if (snapSongEntry) {
                              try {
                                const rawJson = snapSongEntry.substring('SNAPSHOT_SONGS:'.length);
                                const parsedSongs = JSON.parse(rawJson);
                                if (Array.isArray(parsedSongs) && parsedSongs.length > 0) {
                                  parsedSongs.forEach((song: any) => {
                                    const tName = cleanTitle(song.topic_name || song.title || '');
                                    if (tName && !otherActiveHWItems.some(s => cleanTitle(s.topic_name || s.title || '').toLowerCase() === tName.toLowerCase())) {
                                      otherActiveHWItems.push({
                                        ...song,
                                        topic_name: tName,
                                        title: tName
                                      });
                                    }
                                  });
                                }
                              } catch (e) {
                                console.warn('Error hydrating SNAPSHOT_SONGS in Pro:', e);
                              }
                            }
                          }

                          if (Object.keys(activeLehrwerkeMap).length > 0 && otherActiveHWItems.length > 0) break;
                        }
                      }

                      // Sort pages for all active books
                      Object.keys(activeLehrwerkeMap).forEach(title => {
                        activeLehrwerkeMap[title].pages.sort((a, b) => a.num - b.num);
                      });

                      const formattedActiveBooks = Object.entries(activeLehrwerkeMap).map(([title, info]) => {
                        const pageNums = info.pages.map(p => p.num);
                        const formattedPages = formatPageNumbers(pageNums);
                        const notesList = info.pages.filter(p => p.notes && p.notes.length > 0).map(p => ({ num: p.num, text: p.notes }));
                        const allDone = info.pages.every(p => p.status === 'MASTERED' || p.status === 'THEORY_DONE');
                        return {
                          title,
                          pageNums,
                          formattedPages,
                          notesList,
                          isDone: allDone,
                          isBook: true
                        };
                      });

                      const hasActiveHomework = formattedActiveBooks.length > 0 || otherActiveHWItems.length > 0 || currentWeekNotes.length > 0;

                      return (
                        <div style={{ 
                          background: '#ffffff', 
                          borderRadius: '24px', 
                          padding: '24px', 
                          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.03)',
                          border: '1px solid rgba(0, 0, 0, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '16px'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ 
                                  background: 'rgba(52, 168, 83, 0.08)', 
                                  color: '#34a853', 
                                  width: '34px', 
                                  height: '34px', 
                                  borderRadius: '10px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center' 
                                }}>
                                  <BookOpen size={17} />
                                </div>
                                <div>
                                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 950, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    Hausaufgaben
                                  </h4>
                                  <span style={{ fontSize: isMusicStandMode ? '0.80rem' : '0.72rem', fontWeight: 850, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Diese Woche · Deine Aufgaben
                                  </span>
                                  {isCarriedOverPlan && (
                                    <div style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      background: '#f8fafc',
                                      border: '1px solid #cbd5e1',
                                      color: '#475569',
                                      borderRadius: '100px',
                                      padding: '2px 10px',
                                      fontSize: '0.72rem',
                                      fontWeight: 850,
                                      letterSpacing: '0.01em',
                                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                                      marginTop: '4px'
                                    }}>
                                      <RotateCcw size={10} color="#0284c7" strokeWidth={2.5} />
                                      <span>Fortlaufender Übeplan • Übertrag aus der Vorwoche</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Audio Indicator Pill beside Title */}
                              {audioTracks.length > 0 ? (
                                <div
                                  onClick={() => handleTabChangeLocal('homework_book')}
                                  style={{
                                    background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                                    border: '1px solid #bbf7d0',
                                    borderRadius: '100px',
                                    padding: '4px 10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(34, 197, 94, 0.08)',
                                    transition: 'all 0.15s ease'
                                  }}
                                  className="hover-scale"
                                  title="Unterrichtsaufnahmen im Aufgabenheft anhören"
                                >
                                  <Headphones size={13} color="#15803d" />
                                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#15803d' }}>
                                    {audioTracks.length === 1 ? '1 Aufnahme' : `${audioTracks.length} Aufnahmen`}
                                  </span>
                                </div>
                              ) : (
                                <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '0.6rem', fontWeight: 900, padding: '3px 9px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                                  Aktiv
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {hasActiveHomework ? (
                                <>
                                  {formattedActiveBooks.map((item, idx) => {
                                    const bookGradient = getLehrwerkColor(item.title, lehrwerke);
                                    return (
                                      <div key={`pro-book-${idx}`} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px',
                                        padding: '10px 14px',
                                        background: '#ffffff',
                                        border: '1px solid #f1f5f9',
                                        boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.04)',
                                        borderRadius: '14px'
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                          <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '8px',
                                            background: '#fee2e2',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#dc2626',
                                            flexShrink: 0
                                          }}>
                                            <BookOpen size={14} strokeWidth={2.4} />
                                          </div>
                                          <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                            {item.title}
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', flexShrink: 0 }}>
                                          {item.pageNums.map((pNum: number, pIdx: number) => (
                                            <span key={`pro-p-${pIdx}`} style={{
                                              fontSize: '0.78rem',
                                              fontWeight: 900,
                                              color: '#15803d',
                                              background: '#dcfce7',
                                              padding: '3px 9px',
                                              borderRadius: '7px',
                                              border: '1px solid #bbf7d0',
                                              flexShrink: 0
                                            }}>
                                              S. {pNum}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {otherActiveHWItems.map((item, idx) => (
                                    <div key={`pro-song-${idx}`} style={{
                                      background: '#ffffff',
                                      border: '1px solid #f1f5f9',
                                      boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.04)',
                                      padding: '10px 14px',
                                      borderRadius: '14px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px'
                                    }}>
                                      <div style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '8px',
                                        background: '#ede9fe',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#7c3aed',
                                        flexShrink: 0
                                      }}>
                                        <Music size={14} strokeWidth={2.4} />
                                      </div>
                                      <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {cleanTitle(item.title || item.topic_name)}
                                      </span>
                                    </div>
                                  ))}

                                  {/* Zusätzliche Bemerkung */}
                                  {generalNote && generalNote.trim().toLowerCase() !== 'zusätzliche bemerkung' && (
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontSize: '0.88rem', color: '#334155', fontWeight: 600, paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                                      <FileText size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                                      <strong style={{ color: '#15803d', fontWeight: 850, flexShrink: 0 }}>Zusätzliche Bemerkung:</strong>
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{generalNote}</span>
                                    </div>
                                  )}

                                  {/* Frage des Schülers für die Stunde */}
                                  {studentQuestionText && (
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontSize: '0.88rem', color: '#1e40af', fontWeight: 600, paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                                      <HelpCircle size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
                                      <strong style={{ color: '#2563eb', fontWeight: 850, flexShrink: 0 }}>Deine Frage für die Stunde:</strong>
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{studentQuestionText}</span>
                                    </div>
                                  )}

                                  {/* Audio-Karussell direkt in der Pro-Karte (Volle Parität mit Desktop-Schülervorschau) */}
                                  {audioTracks.length > 0 && (
                                    <div style={{ paddingTop: '4px' }}>
                                      <AudioTrackCarousel
                                        tracks={audioTracks}
                                        readOnly={true}
                                        isTeacher={false}
                                        activeTopicContext="Hausaufgabe"
                                        defaultExpanded={true}
                                        isCarriedOver={isAudioCarriedOver}
                                        hideCarriedOverBadge={true}
                                      />
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  {/* Auch bei keinen Text-Aufgaben Aufnahmen anzeigen, falls vorhanden */}
                                  {audioTracks.length > 0 && (
                                    <div style={{ paddingTop: '4px' }}>
                                      <AudioTrackCarousel
                                        tracks={audioTracks}
                                        readOnly={true}
                                        isTeacher={false}
                                        activeTopicContext="Hausaufgabe"
                                        defaultExpanded={true}
                                        isCarriedOver={isAudioCarriedOver}
                                        hideCarriedOverBadge={true}
                                      />
                                    </div>
                                  )}
                                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                    Keine offenen Aufgaben für diese Woche erfasst
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => handleTabChangeLocal('homework_book')}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: '14px',
                              border: '1.5px solid #e2e8f0',
                              background: '#f8fafc',
                              color: '#0f172a',
                              fontSize: '0.88rem',
                              fontWeight: 900,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              transition: 'all 0.2s'
                            }}
                            className="hover-scale"
                          >
                            <BookOpen size={14} color="#34a853" />
                            <span>Hausaufgabenheft öffnen →</span>
                          </button>
                        </div>
                      );
                    })()}

                    {/* Spalte 2: Tägliche Übezeit */}
                    {flamesActive && (() => {
                      const streak = avatar?.streak_flame || 0;
                      const levelKey = `level${effectiveLevel}` as 'level1' | 'level2' | 'level3';
                      const schoolConfig = (schoolFokusLevels && schoolFokusLevels[levelKey]) || DEFAULT_FOKUS_LEVELS[levelKey];
                      const kleineMins = schoolConfig.kleine || DEFAULT_FOKUS_LEVELS[levelKey].kleine;
                      const mittlereMins = schoolConfig.mittlere || DEFAULT_FOKUS_LEVELS[levelKey].mittlere;
                      const heldenMins = schoolConfig.helden || DEFAULT_FOKUS_LEVELS[levelKey].helden;
                      const requiredMins = streak >= 9 ? heldenMins : streak >= 4 ? mittlereMins : kleineMins;

                      return (
                        <div style={{ 
                          background: '#ffffff', 
                          borderRadius: '24px', 
                          padding: '24px', 
                          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.03)',
                          border: '1px solid rgba(0, 0, 0, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '16px'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ background: 'rgba(251, 188, 5, 0.12)', color: '#d97706', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Zap size={16} fill="currentColor" />
                              </div>
                              <h4 style={{ margin: 0, fontSize: isMusicStandMode ? '1.18rem' : '1.05rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                Fokus-Session ⚡
                              </h4>
                            </div>
                            <div>
                              <p style={{ margin: 0, fontSize: isMusicStandMode ? '0.96rem' : '0.86rem', color: '#475569', lineHeight: 1.45, fontWeight: 600 }}>
                                Kurze Intervalle, maximale Präzision: Schon {requiredMins} Minuten sichern heute deinen Fortschritt. ⚡
                              </p>
                            </div>
                          </div>

                          <button 
                            onClick={() => handleTabChangeLocal('practice_board')}
                            style={{ 
                              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '14px', 
                              padding: '14px 20px', 
                              minHeight: '44px', 
                              boxSizing: 'border-box', 
                              fontWeight: 950, 
                              fontSize: isMusicStandMode ? '0.96rem' : '0.88rem', 
                              cursor: 'pointer', 
                              display: 'flex', 
                              justifyContent: 'center', 
                              alignItems: 'center', 
                              gap: '8px', 
                              boxShadow: '0 8px 20px rgba(79, 70, 229, 0.28)', 
                              transition: 'all 0.2s', 
                              width: '100%' 
                            }}
                            className="hover-scale"
                          >
                            <Play size={16} fill="white" />
                            <span>▶ Übe-Session starten</span>
                          </button>
                        </div>
                      );
                    })()}

                    {/* Spalte 3: Flammen-Pfad */}
                    {flamesActive && (() => {
                      const streak = avatar?.streak_flame || 0;
                      const levelKey = `level${effectiveLevel}` as 'level1' | 'level2' | 'level3';
                      const schoolConfig = (schoolFokusLevels && schoolFokusLevels[levelKey]) || DEFAULT_FOKUS_LEVELS[levelKey];
                      const kleineMins = schoolConfig.kleine || DEFAULT_FOKUS_LEVELS[levelKey].kleine;
                      const mittlereMins = schoolConfig.mittlere || DEFAULT_FOKUS_LEVELS[levelKey].mittlere;
                      const heldenMins = schoolConfig.helden || DEFAULT_FOKUS_LEVELS[levelKey].helden;

                      const isTier1Unlocked = streak >= 1;
                      const isTier2Unlocked = streak >= 4;
                      const isTier3Unlocked = streak >= 9;

                      const weekMetrics = getDeterministicWeekMetrics();
                      const currentWeek = getISOWeek(getSimulatedNow());
                      const availableShields = weekMetrics.availableShields;
                      const weekShieldedCount = weekMetrics.weekShieldedCount;

                      return (
                        <div style={{ 
                          background: '#ffffff', 
                          borderRadius: '24px', 
                          padding: '24px', 
                          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.03)',
                          border: '1px solid rgba(0, 0, 0, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 950, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                🔥 Flammen-Pfad
                              </span>
                              <button 
                                onClick={() => setShowRulesModal(true)}
                                style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}
                                title="Spielregeln anzeigen"
                              >
                                <HelpCircle size={14} />
                              </button>
                            </div>
                            <span style={{ 
                              background: streak === 0 ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' : 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', 
                              color: streak === 0 ? '#991b1b' : '#ea580c', 
                              fontSize: '0.75rem', 
                              fontWeight: 950, 
                              padding: '4px 10px', 
                              borderRadius: '100px',
                              border: streak === 0 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(249, 115, 22, 0.2)'
                            }}>
                              {streak} {streak === 1 ? 'Tag' : 'Tage'} 🔥
                            </span>
                          </div>

                          {/* FERIEN-FREEZE ODER 3 SCHUTZSCHILDE */}
                          {isTodayHoliday ? (
                            <div style={{
                              background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                              border: '1.5px solid #a7f3d0',
                              borderRadius: '14px',
                              padding: '10px 12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Palmtree size={15} color="#059669" />
                                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#065f46' }}>
                                    Ferienpause aktiv
                                  </span>
                                </div>
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 900,
                                  background: '#059669',
                                  color: '#ffffff',
                                  padding: '2px 8px',
                                  borderRadius: '100px'
                                }}>
                                  ✨ 2× XP-Booster
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.70rem', color: '#047857', lineHeight: 1.35 }}>
                                Ferienpause: Streak ist gesichert. Üben bringt heute <strong>2× XP</strong>! ✨
                              </p>
                            </div>
                          ) : (
                            <div style={{
                              background: '#f8fafc',
                              borderRadius: '14px',
                              padding: '10px 12px',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: isMusicStandMode ? '0.86rem' : '0.78rem', fontWeight: 850, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Shield size={14} color="#7c3aed" />
                                  Wochen-Schutzschilde:
                                </span>
                                <span style={{ fontSize: isMusicStandMode ? '0.86rem' : '0.78rem', fontWeight: 900, color: availableShields > 0 ? '#7c3aed' : '#b91c1c' }}>
                                  {availableShields}/3 bereit
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {[1, 2, 3].map((shieldNum) => {
                                  const isConsumed = shieldNum <= weekShieldedCount;
                                  const isShieldActive = shieldNum > weekShieldedCount;
                                  const shieldedDay = weekMetrics.weekDays.find(d => d.shieldNumber === shieldNum);
                                  const dayLabel = shieldedDay ? shieldedDay.dayName : '';

                                  return (
                                    <div key={`pro-shield-${shieldNum}`} style={{
                                      flex: 1,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px',
                                      padding: '5px 6px',
                                      borderRadius: '6px',
                                      background: isConsumed ? '#f1f5f9' : (isShieldActive ? 'rgba(124, 58, 237, 0.08)' : 'rgba(217, 119, 6, 0.08)'),
                                      border: isConsumed ? '1px solid #cbd5e1' : (isShieldActive ? '1px solid rgba(124, 58, 237, 0.28)' : '1px dashed rgba(217, 119, 6, 0.3)'),
                                      color: isConsumed ? '#475569' : (isShieldActive ? '#6d28d9' : '#9a3412'),
                                      fontSize: isMusicStandMode ? '0.78rem' : '0.72rem',
                                      fontWeight: 800
                                    }}>
                                      <Shield size={11} color={isConsumed ? '#64748b' : (isShieldActive ? '#7c3aed' : '#d97706')} fill={isConsumed ? '#94a3b8' : (isShieldActive ? '#7c3aed' : 'none')} />
                                      <span>{isConsumed ? `Schild ${shieldNum} (${dayLabel})` : `Schild ${shieldNum}`}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', flex: 1, justifyContent: 'center' }}>
                            <div style={{ position: 'absolute', left: '17px', top: '20px', bottom: '20px', width: '2px', background: '#e2e8f0', zIndex: 1 }} />
                            <div style={{ position: 'absolute', left: '17px', top: '20px', height: streak >= 9 ? '100%' : streak >= 4 ? '50%' : '0%', width: '2px', background: 'linear-gradient(to bottom, #f97316 0%, #ef4444 100%)', zIndex: 1, transition: 'height 0.5s ease' }} />

                            {/* Tier 1 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '10px 14px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.03)', zIndex: 2, opacity: isTier1Unlocked ? 1 : 0.6 }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isTier1Unlocked ? '#eab308' : '#cbd5e1', boxShadow: isTier1Unlocked ? '0 0 8px #eab308' : 'none', zIndex: 3 }} />
                              <div style={{ color: isTier1Unlocked ? '#eab308' : '#64748b', display: 'flex', alignItems: 'center' }}>
                                <Flame size={18} fill={isTier1Unlocked ? 'currentColor' : 'none'} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', fontWeight: 950, color: isTier1Unlocked ? '#854d0e' : '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    Stufe 1: Basis-Fokus
                                  </span>
                                  <span style={{ fontSize: isMusicStandMode ? '0.86rem' : '0.78rem', fontWeight: 900, color: isTier1Unlocked ? '#854d0e' : '#475569', flexShrink: 0 }}>
                                    1–3 Tage • {kleineMins}m
                                  </span>
                                </div>
                                <div style={{ fontSize: isMusicStandMode ? '0.88rem' : '0.80rem', color: streak > 0 ? '#15803d' : '#475569', fontWeight: 700, marginTop: '2px' }}>{streak > 0 ? '● Aktiv' : 'Bereit zum Start'}</div>
                              </div>
                            </div>

                            {/* Tier 2 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '10px 14px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.03)', zIndex: 2, opacity: isTier2Unlocked ? 1 : 0.6 }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isTier2Unlocked ? '#f97316' : '#cbd5e1', boxShadow: isTier2Unlocked ? '0 0 8px #f97316' : 'none', zIndex: 3 }} />
                              <div style={{ color: isTier2Unlocked ? '#f97316' : '#64748b', display: 'flex', alignItems: 'center' }}>
                                <Flame size={18} fill={isTier2Unlocked ? 'currentColor' : 'none'} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', fontWeight: 950, color: isTier2Unlocked ? '#9a3412' : '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    Stufe 2: Flow-Fokus
                                  </span>
                                  <span style={{ fontSize: isMusicStandMode ? '0.86rem' : '0.78rem', fontWeight: 900, color: isTier2Unlocked ? '#9a3412' : '#475569', flexShrink: 0 }}>
                                    4–8 Tage • {mittlereMins}m
                                  </span>
                                </div>
                                <div style={{ fontSize: isMusicStandMode ? '0.88rem' : '0.80rem', color: isTier2Unlocked ? '#15803d' : '#475569', fontWeight: 700, marginTop: '2px' }}>
                                  {isTier2Unlocked ? '● Aktiv' : `Noch ${Math.max(1, 4 - streak)}${Math.max(1, 4 - streak) === 1 ? ' Tag' : ' Tage'} bis Stufe 2`}
                                </div>
                              </div>
                            </div>

                            {/* Tier 3 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '10px 14px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.03)', zIndex: 2, opacity: isTier3Unlocked ? 1 : 0.6 }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isTier3Unlocked ? '#ef4444' : '#cbd5e1', boxShadow: isTier3Unlocked ? '0 0 8px #ef4444' : 'none', zIndex: 3 }} />
                              <div style={{ color: isTier3Unlocked ? '#ef4444' : '#64748b', display: 'flex', alignItems: 'center' }}>
                                <Flame size={18} fill={isTier3Unlocked ? 'currentColor' : 'none'} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', fontWeight: 950, color: isTier3Unlocked ? '#991b1b' : '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    Stufe 3: Meister-Fokus
                                  </span>
                                  <span style={{ fontSize: isMusicStandMode ? '0.86rem' : '0.78rem', fontWeight: 900, color: isTier3Unlocked ? '#991b1b' : '#475569', flexShrink: 0 }}>
                                    9+ Tage • {heldenMins}m
                                  </span>
                                </div>
                                <div style={{ fontSize: isMusicStandMode ? '0.88rem' : '0.80rem', color: isTier3Unlocked ? '#ea580c' : '#475569', fontWeight: 700, marginTop: '2px' }}>
                                  {isTier3Unlocked ? '★ Meister-Fokus aktiv' : `Noch ${Math.max(1, 9 - streak)}${Math.max(1, 9 - streak) === 1 ? ' Tag' : ' Tage'} bis Meister-Fokus`}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                </>
              )}

            </div>

            {/* RIGHT COLUMN (Only for Teen Level 2 and Pro Level 3 - Junior Level 1 gets full width) */}
            {studentUiLevel !== 'junior' && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '24px',
              width: isRightSidebarCollapsed ? '0px' : '340px',
              minWidth: isRightSidebarCollapsed ? '0px' : '340px',
              maxWidth: isRightSidebarCollapsed ? '0px' : '340px',
              opacity: isRightSidebarCollapsed ? 0 : 1,
              transform: isRightSidebarCollapsed ? 'translateX(20px)' : 'translateX(0)',
              pointerEvents: isRightSidebarCollapsed ? 'none' : 'auto',
              overflowY: isRightSidebarCollapsed ? 'hidden' : 'visible',
              overflowX: 'hidden',
              boxSizing: 'border-box',
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              {/* Sidebar Header with Collapse Button */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 2px 4px 2px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: '#e6f4ea',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Calendar size={15} color="#34a853" />
                  </div>
                  <span style={{ fontWeight: 950, fontSize: '0.88rem', color: '#1e293b', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                    Termine &amp; Mitteilungen
                  </span>
                  {sidebarTotalAlertsCount > 0 && (
                    <span style={{
                      background: hasSidebarAppointmentAlerts ? '#f59e0b' : '#34a853',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: 900,
                      padding: '2px 7px',
                      borderRadius: '100px'
                    }}>
                      {sidebarTotalAlertsCount}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleToggleRightSidebar(true)}
                  style={{
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    color: '#64748b',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale"
                  title="Sidebar einklappen"
                >
                  <span>Einklappen</span>
                  <ChevronRight size={14} color="#64748b" />
                </button>
              </div>

              {/* Nächste Termine */}
              <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={18} color="#34a853" />
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Nächste Termine</h3>
                  </div>
                  <button onClick={() => handleTabChangeLocal('events')} style={{ background: 'transparent', border: 'none', color: '#34a853', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Alle anzeigen</button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(() => {
                    const todayStr = new Date().toLocaleDateString('sv-SE');
                    const combinedList = [...(scheduleOccurrences || []), ...(schoolYearOccurrences || [])];
                    const seenKeys = new Set<string>();
                    const upcomingConfirmed = combinedList.filter(occ => {
                      if (!occ || !occ.date) return false;
                      if (occ.date < todayStr) return false;
                      if (occ.status === 'rescheduled_away' || occ.status === 'canceled_by_student') return false;
                      const key = `${occ.date}_${(occ.start_time || '').substring(0, 5)}`;
                      if (seenKeys.has(key)) return false;
                      seenKeys.add(key);
                      return true;
                    });
                    if (upcomingConfirmed.length > 0) {
                      return upcomingConfirmed.slice(0, 4).map(occ => {
                        const d = new Date(occ.date);
                        const isCancelled = occ.status === 'cancelled';
                        
                        if (isCancelled) {
                          return (
                            <div key={occ.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                              <div style={{ width: '48px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', textAlign: 'center', flexShrink: 0 }}>
                                 <div style={{ background: '#ef4444', color: 'white', fontSize: isMusicStandMode ? '0.80rem' : '0.72rem', fontWeight: 900, padding: '4px 0', textTransform: 'uppercase' }}>{d.toLocaleDateString('de-DE', {month: 'short'})}</div>
                                 <div style={{ background: 'white', color: '#1e293b', fontSize: isMusicStandMode ? '1.35rem' : '1.2rem', fontWeight: 900, padding: '6px 0' }}>{d.toLocaleDateString('de-DE', {day: '2-digit'})}</div>
                              </div>
                              
                              <div style={{ 
                                flex: 1, 
                                background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                                boxShadow: '0 4px 10px rgba(239, 68, 68, 0.1)',
                                borderRadius: '14px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                              }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', fontWeight: 850, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{d.toLocaleDateString('de-DE', {weekday: 'long'})}</span>
                                    <span style={{ fontSize: isMusicStandMode ? '0.76rem' : '0.68rem', fontWeight: 950, background: '#000000', color: '#ffffff', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>Ausfall</span>
                                  </div>
                                  <div style={{ fontSize: isMusicStandMode ? '0.88rem' : '0.80rem', color: 'rgba(255, 255, 255, 0.95)', fontWeight: 650, marginTop: '3px' }}>
                                    {occ.start_time?.substring(0,5)} Uhr <span style={{ color: '#fee2e2' }}>{getOccRoomName(occ)}</span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => {
                                    const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                                    const dayLabel = DAYS_DE[new Date(occ.date).getDay()];
                                    const formattedDate = new Date(occ.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                                    const label = `${dayLabel} (${formattedDate}), ${occ.start_time?.substring(0, 5)} Uhr (Ausfall)`;
                                    setAppointmentChatData({
                                      teacherId: occ.teacher_id,
                                      date: occ.date,
                                      start_time: occ.start_time?.substring(0, 5),
                                      label,
                                      occurrenceId: occ.id,
                                      status: 'cancelled',
                                      isCancelled: true
                                    });
                                    setShowAppointmentChat(true);
                                  }}
                                  title="Shoutbox zum Ausfall-Termin öffnen"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: getOccurrenceUnreadCount(occ) > 0 ? '#fef3c7' : (checkOccurrenceHasMessages(occ) ? '#fef3c7' : 'rgba(255, 255, 255, 0.2)'),
                                    color: (getOccurrenceUnreadCount(occ) > 0 || checkOccurrenceHasMessages(occ)) ? '#d97706' : '#ffffff',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    flexShrink: 0
                                  }}
                                  onMouseOver={e => { e.currentTarget.style.background = checkOccurrenceHasMessages(occ) ? '#fde68a' : 'rgba(255, 255, 255, 0.3)'; }}
                                  onMouseOut={e => { e.currentTarget.style.background = checkOccurrenceHasMessages(occ) ? '#fef3c7' : 'rgba(255, 255, 255, 0.2)'; }}
                                >
                                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MessageSquare size={14} fill={checkOccurrenceHasMessages(occ) ? 'currentColor' : 'none'} />
                                    {getOccurrenceUnreadCount(occ) > 0 && (
                                      <span style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        width: '7px',
                                        height: '7px',
                                        borderRadius: '50%',
                                        background: '#ea4335',
                                        border: '1.5px solid #ffffff',
                                        boxShadow: '0 0 4px rgba(234, 67, 53, 0.7)'
                                      }} />
                                    )}
                                  </div>
                                </button>
                              </div>
                            </div>
                          );
                        }

                        const isRescheduled = occ.status === 'rescheduled_confirmed';
                        if (isRescheduled) {
                          return (
                            <div key={occ.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                              <div style={{ width: '48px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', textAlign: 'center', flexShrink: 0 }}>
                                 <div style={{ background: '#eab308', color: 'white', fontSize: isMusicStandMode ? '0.80rem' : '0.72rem', fontWeight: 900, padding: '4px 0', textTransform: 'uppercase' }}>{d.toLocaleDateString('de-DE', {month: 'short'})}</div>
                                 <div style={{ background: 'white', color: '#1e293b', fontSize: isMusicStandMode ? '1.35rem' : '1.2rem', fontWeight: 900, padding: '6px 0' }}>{d.toLocaleDateString('de-DE', {day: '2-digit'})}</div>
                              </div>
                              
                              <div style={{ 
                                flex: 1, 
                                background: 'linear-gradient(135deg, #fef08a 0%, #eab308 100%)',
                                boxShadow: '0 4px 10px rgba(234, 179, 8, 0.1)',
                                borderRadius: '14px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                              }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', fontWeight: 850, color: '#78350f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{d.toLocaleDateString('de-DE', {weekday: 'long'})}</span>
                                    <span style={{ fontSize: isMusicStandMode ? '0.76rem' : '0.68rem', fontWeight: 950, background: '#000000', color: '#ffffff', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>Verschoben</span>
                                  </div>
                                  <div style={{ fontSize: isMusicStandMode ? '0.88rem' : '0.80rem', color: 'rgba(120, 53, 15, 0.95)', fontWeight: 650, marginTop: '3px' }}>
                                    {occ.start_time?.substring(0,5)} Uhr <span style={{ color: '#b45309' }}>{getOccRoomName(occ)}</span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => {
                                    const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                                    const dayLabel = DAYS_DE[new Date(occ.date).getDay()];
                                    const formattedDate = new Date(occ.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                                    const label = `${dayLabel} (${formattedDate}), ${occ.start_time?.substring(0, 5)} Uhr (Verschoben)`;
                                    setAppointmentChatData({
                                      teacherId: occ.teacher_id,
                                      date: occ.date,
                                      start_time: occ.start_time?.substring(0, 5),
                                      label,
                                      occurrenceId: occ.id,
                                      status: 'rescheduled_confirmed',
                                      isCancelled: false
                                    });
                                    setShowAppointmentChat(true);
                                  }}
                                  title="Shoutbox zum verschobenen Termin öffnen"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: getOccurrenceUnreadCount(occ) > 0 ? '#fef3c7' : (checkOccurrenceHasMessages(occ) ? '#f59e0b' : 'rgba(120, 53, 15, 0.12)'),
                                    color: checkOccurrenceHasMessages(occ) ? '#ffffff' : '#78350f',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    flexShrink: 0
                                  }}
                                  onMouseOver={e => { e.currentTarget.style.background = checkOccurrenceHasMessages(occ) ? '#d97706' : 'rgba(120, 53, 15, 0.22)'; }}
                                  onMouseOut={e => { e.currentTarget.style.background = checkOccurrenceHasMessages(occ) ? '#f59e0b' : 'rgba(120, 53, 15, 0.12)'; }}
                                >
                                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MessageSquare size={14} fill={checkOccurrenceHasMessages(occ) ? 'currentColor' : 'none'} />
                                    {getOccurrenceUnreadCount(occ) > 0 && (
                                      <span style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        width: '7px',
                                        height: '7px',
                                        borderRadius: '50%',
                                        background: '#ea4335',
                                        border: '1.5px solid #ffffff',
                                        boxShadow: '0 0 4px rgba(234, 67, 53, 0.7)'
                                      }} />
                                    )}
                                  </div>
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={occ.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                            <div style={{ width: '48px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
                              <div style={{ background: '#34a853', color: 'white', fontSize: isMusicStandMode ? '0.80rem' : '0.72rem', fontWeight: 900, padding: '4px 0', textTransform: 'uppercase' }}>{d.toLocaleDateString('de-DE', {month: 'short'})}</div>
                              <div style={{ background: 'white', color: '#1e293b', fontSize: isMusicStandMode ? '1.35rem' : '1.2rem', fontWeight: 900, padding: '6px 0' }}>{d.toLocaleDateString('de-DE', {day: '2-digit'})}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', fontWeight: 850, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{d.toLocaleDateString('de-DE', {weekday: 'long'})}</span>
                              </div>
                              <div style={{ fontSize: isMusicStandMode ? '0.88rem' : '0.80rem', color: '#475569', fontWeight: 650 }}>{occ.start_time?.substring(0,5)} <span style={{ color: '#15803d', fontWeight: 800 }}>{getOccRoomName(occ)}</span></div>
                            </div>
                            <button
                              onClick={() => {
                                const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                                const dayLabel = DAYS_DE[new Date(occ.date).getDay()];
                                const formattedDate = new Date(occ.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                                const label = `${dayLabel} (${formattedDate}), ${occ.start_time?.substring(0, 5)} Uhr`;
                                setAppointmentChatData({
                                  teacherId: occ.teacher_id,
                                  date: occ.date,
                                  start_time: occ.start_time?.substring(0, 5),
                                  label,
                                  occurrenceId: occ.id,
                                  status: occ.status || 'scheduled',
                                  isCancelled: false
                                });
                                setShowAppointmentChat(true);
                              }}
                              title="Shoutbox öffnen"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: getOccurrenceUnreadCount(occ) > 0 ? '#fef3c7' : (checkOccurrenceHasMessages(occ) ? '#fef3c7' : '#f8fafc'),
                                color: (getOccurrenceUnreadCount(occ) > 0 || checkOccurrenceHasMessages(occ)) ? '#d97706' : '#475569',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                marginLeft: 'auto',
                                flexShrink: 0
                              }}
                              onMouseOver={e => {
                                e.currentTarget.style.background = checkOccurrenceHasMessages(occ) ? '#fde68a' : '#f1f5f9';
                                e.currentTarget.style.color = checkOccurrenceHasMessages(occ) ? '#d97706' : '#1e293b';
                              }}
                              onMouseOut={e => {
                                e.currentTarget.style.background = checkOccurrenceHasMessages(occ) ? '#fef3c7' : '#ffffff';
                                e.currentTarget.style.color = checkOccurrenceHasMessages(occ) ? '#d97706' : '#475569';
                              }}
                            >
                              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MessageSquare size={14} fill={checkOccurrenceHasMessages(occ) ? 'currentColor' : 'none'} />
                                {getOccurrenceUnreadCount(occ) > 0 && (
                                  <span style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-4px',
                                    width: '7px',
                                    height: '7px',
                                    borderRadius: '50%',
                                    background: '#ea4335',
                                    border: '1.5px solid #ffffff',
                                    boxShadow: '0 0 4px rgba(234, 67, 53, 0.7)'
                                  }} />
                                )}
                              </div>
                            </button>
                          </div>
                        );
                      });
                    } else {
                      return <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>Keine Termine verfügbar.</div>;
                    }
                  })()}
                </div>
              </div>

              {/* Terminänderungen */}
              {(() => {
                const appointmentChanges = (scheduleOccurrences || []).filter(occ => 
                  !occ.student_acknowledged && (
                    occ.status === 'pending_reschedule' || 
                    occ.status === 'cancelled' || 
                    (occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date)
                  )
                );
                if (appointmentChanges.length === 0) return null;
                return (
                  <div style={{ background: '#ffffff', borderRadius: '24px', padding: '16px 18px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: appointmentChanges.length > 0 ? '1.5px dashed #f59e0b' : '1px solid #e2e8f0', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <Calendar size={16} color={appointmentChanges.length > 0 ? '#f59e0b' : '#475569'} />
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Terminänderungen</h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {appointmentChanges.map(occ => {
                        const d = new Date(occ.date);
                        const isReschedule = occ.status === 'pending_reschedule';
                        const isCancelled = occ.status === 'cancelled';
                        const isRegularReset = occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date;
                        
                        let cardBg = '#fef2f2';
                        let cardBorder = '#fecaca';
                        let badgeNode: React.ReactNode = (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CalendarX size={12} color="#991b1b" /> Termin abgesagt
                          </span>
                        );
                        let badgeColor = '#991b1b';
                        
                        if (isReschedule) {
                          cardBg = '#fffbeb';
                          cardBorder = '#fef08a';
                          badgeNode = (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <RotateCcw size={12} color="#854d0e" /> Verschiebung vorgeschlagen
                            </span>
                          );
                          badgeColor = '#854d0e';
                        } else if (isRegularReset) {
                          cardBg = '#e6f4ea';
                          cardBorder = '#e6f4ea';
                          badgeNode = (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Check size={12} color="#34a853" /> Findet wieder regulär statt
                            </span>
                          );
                          badgeColor = '#34a853';
                        }
                        
                        return (
                          <div key={occ.id} style={{ 
                            padding: '12px', 
                            borderRadius: '12px', 
                            background: cardBg, 
                            border: `1px solid ${cardBorder}`, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '8px',
                            position: 'relative',
                            zIndex: 5
                          }}>
                            <div>
                              <div style={{ fontSize: '9px', fontWeight: 800, color: badgeColor, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                                {badgeNode}
                              </div>
                              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#1e293b' }}>
                                {d.toLocaleDateString('de-DE', {weekday: 'long', day: '2-digit', month: '2-digit'})}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', gap: '8px' }}>
                                <div style={{ fontSize: '0.80rem', color: '#475569', fontWeight: 700 }}>
                                  {occ.start_time?.substring(0,5)} Uhr
                                </div>
                                {!isReschedule && (
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleAcknowledgeCancellation(occ.id);
                                    }}
                                    style={{ 
                                      background: (occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date) ? '#34a853' : '#ef4444', 
                                      color: 'white', 
                                      border: 'none', 
                                      minHeight: '40px',
                                      padding: '8px 14px', 
                                      borderRadius: '12px', 
                                      fontSize: '0.82rem', 
                                      fontWeight: 800, 
                                      cursor: 'pointer',
                                      boxShadow: `0 2px 6px ${(occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date) ? 'rgba(52, 168, 83, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                      transition: 'all 0.2s',
                                      flexShrink: 0,
                                      position: 'relative',
                                      zIndex: 10,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}
                                  >
                                    <Check size={13} strokeWidth={2.5} />
                                    <span>Gelesen abhaken</span>
                                  </button>
                                )}
                              </div>
                              {(occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date) && (
                                <div style={{ fontSize: '0.74rem', color: '#34a853', fontWeight: 600, marginTop: '4px', lineHeight: '1.3' }}>
                                  Findet wieder regulär statt.
                                </div>
                              )}
                            </div>
                            
                            {isReschedule && (
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  {onOpenRescheduleBottomSheet && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onOpenRescheduleBottomSheet(occ);
                                      }}
                                      style={{
                                        background: '#fef3c7',
                                        color: '#b45309',
                                        border: '1px solid #fde68a',
                                        minHeight: '40px',
                                        padding: '8px 14px',
                                        borderRadius: '12px',
                                        fontSize: '0.82rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 6px rgba(217, 119, 6, 0.15)',
                                        transition: 'all 0.2s',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                      }}
                                    >
                                      <Calendar size={14} strokeWidth={2.4} />
                                      <span>Termin prüfen</span>
                                    </button>
                                  )}
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleRejectReschedule(occ);
                                    }}
                                    style={{ 
                                      background: '#ef4444', 
                                      color: 'white', 
                                      border: 'none', 
                                      minHeight: '40px',
                                      padding: '8px 14px', 
                                      borderRadius: '12px', 
                                      fontSize: '0.82rem', 
                                      fontWeight: 800, 
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.2)',
                                      transition: 'all 0.2s',
                                      position: 'relative',
                                      zIndex: 10,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}
                                  >
                                    <X size={14} strokeWidth={2.5} />
                                    <span>Ablehnen</span>
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleTriggerConfirmReschedule(occ.id);
                                    }}
                                    style={{ 
                                      background: '#34a853', 
                                      color: 'white', 
                                      border: 'none', 
                                      minHeight: '40px',
                                      padding: '8px 14px', 
                                      borderRadius: '12px', 
                                      fontSize: '0.82rem', 
                                      fontWeight: 800, 
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 6px rgba(52, 168, 83, 0.2)',
                                      transition: 'all 0.2s',
                                      position: 'relative',
                                      zIndex: 10,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}
                                  >
                                    {!isStudentRescheduleAllowed ? <Lock size={14} strokeWidth={2.5} /> : <Check size={14} strokeWidth={2.5} />}
                                    <span>{!isStudentRescheduleAllowed ? 'Bestätigen (Eltern-PIN)' : 'Bestätigen'}</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ÜBE-ZIEL WIDGET (Crowdfunding-Stil) */}
              {classGoals.length > 0 && (
                <div style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '18px 20px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, sans-serif"
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '10px',
                      background: '#e6f4ea',
                      border: '1px solid #e6f4ea',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Target size={18} color="#34a853" />
                    </div>
                    <h3 style={{
                      fontSize: '0.92rem',
                      fontWeight: 750,
                      color: '#1c1c1e',
                      margin: 0,
                      letterSpacing: '-0.02em',
                      lineHeight: '1.2'
                    }}>
                      Klassen-Übe-Ziel
                    </h3>
                  </div>

                  {/* Goals */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {classGoals.map((goal: any) => {
                      const pct = goal.minutes > 0 ? Math.round((classWeeklyMins / goal.minutes) * 100) : 0;
                      const isDeadlinePassed = goal.deadline ? new Date(goal.deadline) < new Date() : false;
                      const maxPercentOnBar = 133;
                      const visualWidth = Math.min(100, (pct / maxPercentOnBar) * 100);
                      const isAchieved = pct >= 100;

                      return (
                        <div 
                          key={goal.id} 
                          onClick={() => handleOpenContributions(goal.title || 'Klassen-Übe-Ziel', goal.minutes)}
                          onMouseOver={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 10px 25px rgba(52, 168, 83, 0.22)';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(52, 168, 83, 0.12)';
                          }}
                          style={{
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            background: '#34a853',
                            boxShadow: '0 6px 20px rgba(52, 168, 83, 0.12)',
                            borderRadius: '16px',
                            padding: '12px 14px',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        >
                          {/* Row 1: Title, Deadline on left & Percentage on right */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                              <span style={{
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: '#ffffff',
                                letterSpacing: '-0.01em',
                                lineHeight: '1.25',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word'
                              }}>
                                {goal.title || 'Challenge'}
                              </span>
                              {goal.deadline && (
                                <span style={{
                                  fontSize: '0.62rem',
                                  fontWeight: 500,
                                  color: isDeadlinePassed ? '#ff8780' : 'rgba(255, 255, 255, 0.75)',
                                  lineHeight: '1.2',
                                  whiteSpace: 'normal'
                                }}>
                                  bis {new Date(goal.deadline).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                                  {isDeadlinePassed && ' (abgelaufen)'}
                                </span>
                              )}
                            </div>
                            <span style={{
                              fontSize: '1.1rem',
                              fontWeight: 800,
                              color: '#ffffff',
                              letterSpacing: '-0.02em',
                              fontFeatureSettings: '"tnum"',
                              flexShrink: 0,
                              alignSelf: 'flex-start'
                            }}>
                              {pct}%
                            </span>
                          </div>

                          {/* Progress bar container */}
                          <div style={{ position: 'relative', height: '6px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '99px' }}>
                            {/* Target marker (100% line) at 75% width */}
                            <div style={{
                              position: 'absolute',
                              left: '75%',
                              top: '-2px',
                              height: '10px',
                              width: '2px',
                              background: '#ffffff',
                              zIndex: 3,
                              borderRadius: '99px'
                            }} />

                            {/* Bar fill */}
                            <div style={{
                              width: `${visualWidth}%`,
                              height: '100%',
                              background: '#ffffff',
                              borderRadius: '99px',
                              transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                              boxShadow: '0 0 6px rgba(255, 255, 255, 0.25)'
                            }} />
                          </div>

                          {/* Row 3: Current / Target & Status label */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', gap: '10px' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontFeatureSettings: '"tnum"', fontWeight: 500, whiteSpace: 'normal' }}>
                              <span style={{ fontWeight: 700, color: '#ffffff' }}>{classWeeklyMins}</span> / {goal.minutes} Min.
                            </span>
                            <span style={{
                              fontWeight: 700,
                              color: isAchieved ? '#e6f4ea' : 'rgba(255, 255, 255, 0.8)',
                              whiteSpace: 'normal',
                              textAlign: 'right'
                            }}>
                              {isAchieved ? 'Erreicht 🎉' : `Noch ${Math.max(0, goal.minutes - classWeeklyMins)} Min.`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LIVE CAMPUS FEED (DESKTOP) */}
              <div style={{ 
                background: '#ffffff', 
                borderRadius: '24px', 
                padding: '24px', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Sparkles size={18} color="#34a853" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mitteilungen</h3>
                </div>

                {/* Tab switcher */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                  <button
                    onClick={() => setStudentFeedTab('campus')}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: studentFeedTab === 'campus' ? '#ffffff' : 'transparent',
                      color: studentFeedTab === 'campus' ? '#34a853' : '#64748b',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: studentFeedTab === 'campus' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <School size={16} />
                      <span>Campus</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setStudentFeedTab('class')}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: studentFeedTab === 'class' ? '#ffffff' : 'transparent',
                      color: studentFeedTab === 'class' ? '#34a853' : '#64748b',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: studentFeedTab === 'class' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', position: 'relative' }}>
                      <Users size={16} />
                      <span>Klassen-Feed</span>
                      {unreadClassFeedCount > 0 && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#ea4335',
                          color: '#ffffff',
                          fontSize: '9px',
                          fontWeight: 'bold',
                          borderRadius: '10px',
                          minWidth: '15px',
                          height: '15px',
                          padding: '0 3px',
                          marginLeft: '4px'
                        }}>
                          {unreadClassFeedCount}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {studentFeedTab === 'class' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {classFeedPosts.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 0', textAlign: 'center', opacity: 0.6 }}>
                          <Sparkles size={24} color="#94a3b8" style={{ strokeWidth: 1.5 }} />
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                            Keine Beiträge in deinem Klassen-Feed.
                          </span>
                        </div>
                      ) : (
                        classFeedPosts.map((post) => {
                          const myInteraction = classFeedInteractions.find(i => i.post_id === post.id && i.user_id === studentId);
                          const isAnswered = !!myInteraction;

                          let typeLabel = 'Mitteilung';
                          let typeBg = '#e6f4ea';
                          let typeColor = '#34a853';
                          if (post.post_type === 'homework') {
                            typeLabel = 'Hausaufgabe';
                            typeBg = '#fef3c7';
                            typeColor = '#b45309';
                          } else if (post.post_type === 'poll') {
                            typeLabel = 'Umfrage';
                            typeBg = '#e0f2fe';
                            typeColor = '#0369a1';
                          } else if (post.post_type === 'quiz') {
                            typeLabel = 'Quiz';
                            typeBg = '#f3e8ff';
                            typeColor = '#6b21a8';
                          }

                          return (
                            <div key={post.id} style={{
                              paddingBottom: '16px',
                              borderBottom: '1px solid #f1f5f9',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '9px', fontWeight: 800, color: typeColor, background: typeBg, padding: '2px 8px', borderRadius: '100px', textTransform: 'uppercase' }}>
                                  {typeLabel}
                                </span>
                                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 650 }}>
                                  {new Date(post.created_at).toLocaleDateString('de-DE')}
                                </span>
                              </div>

                              <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                                {post.title}
                              </h5>
                              <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
                                {post.content}
                              </p>

                              {post.attachment_url && (
                                <div style={{ marginTop: '4px' }}>
                                  {post.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                    <a href={post.attachment_url} target="_blank" rel="noopener noreferrer">
                                      <img src={post.attachment_url} alt="Anhang" style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                    </a>
                                  ) : (
                                    <a href={post.attachment_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#34a853', textDecoration: 'none', fontWeight: 650 }}>
                                      📄 Dokument öffnen
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* Interactive Poll / Quiz options */}
                              {(post.post_type === 'quiz' || post.post_type === 'poll') && post.quiz_data && (
                                <div style={{ marginTop: '8px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                                    {post.quiz_data.question}
                                  </span>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {Array.isArray(post.quiz_data.options) && post.quiz_data.options.map((opt: string, oIdx: number) => {
                                      const isSelectedByMe = myInteraction?.selected_option === oIdx;
                                      const isCorrectOption = post.post_type === 'quiz' && post.quiz_data.correctAnswer === oIdx;

                                      let btnBg = 'white';
                                      let btnBorder = '#cbd5e1';
                                      let btnColor = '#1e293b';

                                      if (isAnswered) {
                                        if (post.post_type === 'quiz') {
                                          if (isCorrectOption) {
                                            btnBg = '#e6f4ea';
                                            btnBorder = '#34a853';
                                            btnColor = '#34a853';
                                          } else if (isSelectedByMe) {
                                            btnBg = '#fce8e6';
                                            btnBorder = '#ea4335';
                                            btnColor = '#ea4335';
                                          }
                                        } else {
                                          if (isSelectedByMe) {
                                            btnBg = '#e0f2fe';
                                            btnBorder = '#0369a1';
                                            btnColor = '#0369a1';
                                          }
                                        }
                                      }

                                      return (
                                        <button
                                          key={oIdx}
                                          disabled={isAnswered}
                                          onClick={() => {
                                            if (post.post_type === 'quiz') {
                                              handleSubmitClassFeedInteraction(post.id, 'quiz_answer', oIdx, oIdx === post.quiz_data.correctAnswer);
                                            } else {
                                              handleSubmitClassFeedInteraction(post.id, 'poll_vote', oIdx);
                                            }
                                          }}
                                          style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            background: btnBg,
                                            border: `1.5px solid ${btnBorder}`,
                                            color: btnColor,
                                            fontSize: '0.78rem',
                                            fontWeight: isSelectedByMe || isCorrectOption ? 700 : 500,
                                            textAlign: 'left',
                                            cursor: isAnswered ? 'default' : 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                          }}
                                        >
                                          <span>{opt}</span>
                                          {isAnswered && (
                                            <span>
                                              {post.post_type === 'quiz' ? (
                                                isCorrectOption ? '✓ Richtig' : (isSelectedByMe ? '✗ Falsch' : '')
                                              ) : (
                                                isSelectedByMe ? '✓ Gewählt' : ''
                                              )}
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    campusFeedAnnouncements.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 0', textAlign: 'center', opacity: 0.6 }}>
                        <Sparkles size={24} color="#94a3b8" style={{ strokeWidth: 1.5 }} />
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                          Keine aktuellen Campus-Mitteilungen vorhanden.
                        </span>
                      </div>
                    ) : (
                      campusFeedAnnouncements.slice(0, 5).map((item, idx, arr) => {
                        const postReactions = feedInteractions.filter(i => i.post_id === item.id);
                        const thumbsUpCount = postReactions.filter(i => i.emoji_unicode === '👍').length;
                        const heartCount = postReactions.filter(i => i.emoji_unicode === '❤️').length;
                        const userHasThumbsUp = postReactions.some(i => i.emoji_unicode === '👍' && i.user_id === studentId);
                        const userHasHeart = postReactions.some(i => i.emoji_unicode === '❤️' && i.user_id === studentId);

                        let categoryLabel = 'Info';
                        let categoryBg = '#f1f5f9';
                        let categoryColor = '#475569';
                        if (item.category === 'announcement') {
                          categoryLabel = 'Ankündigung';
                        } else if (item.category === 'event') {
                          categoryLabel = 'Event';
                        } else if (item.category === 'holidays') {
                          categoryLabel = 'Ferien';
                        }

                        if (item.is_emergency) {
                          categoryColor = '#b91c1c';
                          categoryBg = '#fce8e6';
                        }

                        return (
                          <div key={item.id} style={{
                            paddingBottom: idx === arr.length - 1 ? '0' : '16px',
                            borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #f1f5f9',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{
                                  fontSize: '9px',
                                  fontWeight: 800,
                                  color: '#475569',
                                  background: '#f1f5f9',
                                  padding: '2px 8px',
                                  borderRadius: '100px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em'
                                }}>
                                  {item.target_type === 'all' ? 'Alle' : item.target_type === 'teachers' ? 'Lehrer' : item.target_type === 'students' ? 'Schüler' : 'Mitteilung'}
                                </span>
                                <span style={{
                                  fontSize: '9px',
                                  fontWeight: 800,
                                  color: categoryColor,
                                  background: categoryBg,
                                  padding: '2px 8px',
                                  borderRadius: '100px',
                                  textTransform: 'uppercase',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}>
                                  {item.is_emergency && <AlertTriangle size={9} color="#b91c1c" />}
                                  {categoryLabel}
                                </span>
                              </div>
                              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 650 }}>
                                {new Date(item.created_at).toLocaleDateString('de-DE')}
                              </span>
                            </div>
                            
                            <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                              {item.title}
                            </h5>
                            
                            <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
                              {item.content}
                            </p>

                            {item.attachment_url && (
                              <div style={{ marginTop: '4px' }}>
                                {item.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                  <a href={item.attachment_url} target="_blank" rel="noopener noreferrer">
                                    <img 
                                      src={item.attachment_url} 
                                      alt="Anhang" 
                                      style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                    />
                                  </a>
                                ) : (
                                  <a 
                                    href={item.attachment_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#34a853', textDecoration: 'none', fontWeight: 650 }}
                                  >
                                    📄 Dokument öffnen
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Monochrome Emoji Reactions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                              <button 
                                onClick={() => handleReactToPost(item.id, '👍')}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: userHasThumbsUp ? '#e6f4ea' : 'transparent',
                                  border: '1px solid',
                                  borderColor: userHasThumbsUp ? '#34a853' : '#e2e8f0',
                                  color: userHasThumbsUp ? '#34a853' : '#64748b',
                                  padding: '3px 8px',
                                  borderRadius: '9999px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <ThumbsUp size={11} color={userHasThumbsUp ? '#34a853' : '#64748b'} />
                                <span>{thumbsUpCount}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )
                  )}
                </div>
              </div>
            </div>
            )}

          </div>
        </div>
        );
      })()}
      </div>
  );
}
