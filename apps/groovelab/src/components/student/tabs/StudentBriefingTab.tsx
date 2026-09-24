import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import {
  Award, Lock, HelpCircle, Trophy, Sparkles, Star, Rocket, ChevronLeft, ChevronRight,
  Clock, Timer, Flame, BookOpen, Play, Pause, Square, RotateCcw, Volume2, VolumeX, X,
  Zap, Music, School, Calendar, CalendarX, Check, Target, MessageSquare, Pencil, User,
  Phone, Users, Shield, Palmtree, Settings, FileText, ThumbsUp, Heart, AlertTriangle,
  Mic, Disc, Download, Key, Headphones, Sliders, SlidersHorizontal, Bell, Crown, RefreshCw,
  Signal, Wifi, WifiOff
} from 'lucide-react';
import { useNetworkProfile } from '../../../hooks/useNetworkProfile';
import { ALL_STICKERS } from '../../../domain/stickersAndTresor';
import { UpdateAnnouncementHero } from '../../common/UpdateAnnouncementHero';
import { AudioTrackCarousel, AudioTrackItem } from '../../AudioTrackCarousel';
import { usePwaWakeLock } from '../../../hooks/usePwaWakeLock';
import { DEFAULT_FOKUS_LEVELS } from '../../../utils/studentProgressEngine';
import { buildContinuousHomeworkNarrative } from '../../../services/neuralTtsService';
import { formatTeacherFullName } from '../../../utils/nameHelper';
import { Avatar, getInstrumentAvatarUrl, resolveCampusStudentAvatar } from '../studentAvatars.constants';
import { getSimulatedNow, toLocalYYYYMMDD, getISOWeekRaw, getISOWeek, getItemWeek, getLehrwerkColor, getSongColor } from '../studentDateUtils';
import { playTriumphantXpChime, animateXpCountUp, CAMPUS_XP_EFFECTS_CSS } from '../../../utils/campusXpEffects';
import { supabase } from '../../../lib/supabase';
import { resolvePlayableAudioSource } from '../../../utils/audioStorageHelper';
import { useDictationInput } from '../../../hooks/useVoiceToText';
import { StudentBriefingModalsHub } from './briefing/StudentBriefingModalsHub';
import { StudentBriefingRightSidebar } from './briefing/StudentBriefingRightSidebar';
import { deriveActiveHomeworkSummary, deriveJuniorHomeworkSummary } from './briefing/homeworkSummaryHelper';

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
  juniorRecordedBlob?: Blob | null;
  saveJuniorRecording?: (...args: any[]) => any;
  isJuniorPadActive?: boolean;
  setIsJuniorPadActive?: React.Dispatch<React.SetStateAction<boolean>>;
  songStats: any;
  songs: any[];
  startJuniorRecordingFlow: () => void;
  stopJuniorRecording: (...args: any[]) => void;
  strokeDashoffset: number;
  studentFeedTab: any;
  assignedCampusSongs?: any[];
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
  isOfflineScheduleActive?: boolean;
  carrierGhostingDetected?: boolean;
  onRefreshConnection?: () => void;
}

export function StudentBriefingTab(props: StudentBriefingTabProps) {
  const {
    studentId,
    assignedCampusSongs,
    onOpenRescheduleBottomSheet,
    isOfflineScheduleActive = false,
    carrierGhostingDetected = false,
    onRefreshConnection,
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
    juniorRecordedBlob,
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
    isJuniorPadActive,
    setIsJuniorPadActive,
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

  // 📱 Prevent tablet display sleep during music practice on music stand
  usePwaWakeLock(true);

  // 📶 1% Goldstandard Network Awareness for Mobile Audio Recording & Streaming
  const { isCellular, formatBytes, badgeText } = useNetworkProfile();

  // 🌟 1% Goldstandard: Real-Time Live XP Deposit Animation & Triumphant Audio Feedback
  const [displayXp, setDisplayXp] = useState<number>(() => {
    if (typeof currentXp === 'number' && currentXp > 0) return currentXp;
    if (typeof window !== 'undefined') {
      const effectiveId = props.studentId || studentUser?.id;
      if (effectiveId) {
        const cached = localStorage.getItem(`campus_bonus_xp_${effectiveId}`);
        if (cached !== null) {
          const parsed = parseInt(cached, 10);
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
      }
    }
    return currentXp || 0;
  });
  const [isXpPulsing, setIsXpPulsing] = useState<boolean>(false);
  const [floatingDepositAmount, setFloatingDepositAmount] = useState<number | null>(null);
  const pendingDepositRef = useRef<{ amount: number; oldVal: number } | null>(null);

  // Trigger deposit animation helper
  const triggerDepositAnimation = useCallback((amount: number, fromVal: number, toVal: number) => {
    setIsXpPulsing(true);
    setFloatingDepositAmount(amount);
    playTriumphantXpChime();

    const cancelAnim = animateXpCountUp(fromVal, toVal, 1200, (val) => {
      setDisplayXp(val);
    }, () => {
      setDisplayXp(toVal);
      setTimeout(() => {
        setIsXpPulsing(false);
      }, 600);
      setTimeout(() => {
        setFloatingDepositAmount(null);
      }, 1200);
    });

    return cancelAnim;
  }, []);

  // Real-time listener for 'campus-xp-awarded'
  useEffect(() => {
    let cleanupAnim: (() => void) | null = null;
    const handleXpAwarded = (e: Event) => {
      const customEvent = e as CustomEvent<{ studentId?: string; amount?: number }>;
      const { studentId: targetId, amount } = customEvent.detail || {};
      const currentEffectiveId = props.studentId || studentUser?.id;
      if (!targetId || targetId === currentEffectiveId) {
        if (typeof amount === 'number' && amount > 0) {
          const oldVal = displayXp;
          const newVal = oldVal + amount;
          if (activeTab === 'briefing') {
            setTimeout(() => {
              cleanupAnim = triggerDepositAnimation(amount, oldVal, newVal);
            }, 250);
          } else {
            pendingDepositRef.current = { amount, oldVal };
          }
        }
      }
    };
    window.addEventListener('campus-xp-awarded', handleXpAwarded);
    return () => {
      window.removeEventListener('campus-xp-awarded', handleXpAwarded);
      if (cleanupAnim) cleanupAnim();
    };
  }, [activeTab, displayXp, props.studentId, studentUser?.id, triggerDepositAnimation]);

  // Tab switch listener / pending deposit trigger
  useEffect(() => {
    if (activeTab === 'briefing') {
      if (pendingDepositRef.current) {
        const { amount, oldVal } = pendingDepositRef.current;
        pendingDepositRef.current = null;
        const target = Math.max(oldVal + amount, currentXp || 0);
        const timer = setTimeout(() => {
          triggerDepositAnimation(amount, oldVal, target);
        }, 300);
        return () => clearTimeout(timer);
      } else if (currentXp > displayXp && displayXp > 0 && !isXpPulsing) {
        const diff = currentXp - displayXp;
        const oldVal = displayXp;
        const timer = setTimeout(() => {
          triggerDepositAnimation(diff, oldVal, currentXp);
        }, 300);
        return () => clearTimeout(timer);
      } else if (currentXp !== displayXp && !isXpPulsing) {
        setDisplayXp(currentXp || 0);
      }
    }
  }, [activeTab, currentXp, displayXp, isXpPulsing, triggerDepositAnimation]);

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

  // ⚡ 0.1% Goldstandard: Memoized Homework Summary (Eliminates sync localStorage blocking queries & JSON parsing)
  const currentWeekIso = useMemo(() => getISOWeek(getSimulatedNow()), []);
  const memoizedHomeworkSummary = useMemo(() => {
    return deriveActiveHomeworkSummary({
      effectiveId: props.studentId || studentUser?.id,
      studentId: props.studentId || studentUser?.id,
      localProgress,
      lehrwerke,
      progressItems,
      activeSongSkills,
      assignedCampusSongs,
      currentWeekStr: currentWeekIso
    });
  }, [
    props.studentId,
    studentUser?.id,
    localProgress,
    lehrwerke,
    progressItems,
    activeSongSkills,
    assignedCampusSongs,
    currentWeekIso
  ]);

  const memoizedJuniorHomework = useMemo(() => {
    return deriveJuniorHomeworkSummary({
      studentId: props.studentId || studentUser?.id,
      localProgress,
      lehrwerke,
      progressItems,
      activeSongSkills,
      assignedCampusSongs
    });
  }, [
    props.studentId,
    studentUser?.id,
    localProgress,
    lehrwerke,
    progressItems,
    activeSongSkills,
    assignedCampusSongs
  ]);

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

  // 📅 1% Goldstandard: Termin-Aktions & Detail-Modal (Sichere Absage & Shoutbox)
  const [selectedAppointmentForDetail, setSelectedAppointmentForDetail] = useState<any | null>(null);
  const [showCancelConfirmStep, setShowCancelConfirmStep] = useState<boolean>(false);

  // 🎧 1% Goldstandard: Aufnahmen-Modal (Studio Audio-Player)
  const [showRecordingsModal, setShowRecordingsModal] = useState<boolean>(false);
  const [recordingsModalTracks, setRecordingsModalTracks] = useState<any[]>([]);
  const [activeRecordingTrack, setActiveRecordingTrack] = useState<any | null>(null);

  // ❓ 0.1% Goldstandard Single Source of Truth for Student Question
  const [activeStudentQuestion, setActiveStudentQuestion] = useState<string>(() => {
    const effectiveId = props.studentId || studentUser?.id;
    if (!effectiveId) return '';
    try {
      const directQ = localStorage.getItem(`campus_student_question_${effectiveId}`);
      if (directQ) return directQ.trim();
      const rawNotes = localStorage.getItem(`campus_homework_notes_${effectiveId}`);
      if (rawNotes) {
        const list = JSON.parse(rawNotes);
        if (Array.isArray(list)) {
          const found = list.find((n: any) => typeof n === 'string' && (n.startsWith('STUDENT_QUESTION:') || n.startsWith('❓ Frage für den Unterricht:')));
          if (found) {
            if (found.startsWith('STUDENT_QUESTION:')) {
              const withoutPrefix = found.replace(/^STUDENT_QUESTION:/, '');
              const pipeIdx = withoutPrefix.indexOf('|');
              return pipeIdx !== -1 ? withoutPrefix.slice(pipeIdx + 1).trim() : withoutPrefix.trim();
            }
            return found.replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
          }
        }
      }
    } catch {}
    return '';
  });

  // ❓ 1% Goldstandard: Schülerfrage mit kompakter Maske & Diktierfunktion (Speech-to-Text)
  const [showQuestionModal, setShowQuestionModal] = useState<boolean>(false);
  const [questionInput, setQuestionInput] = useState<string>(() => {
    const effectiveId = props.studentId || studentUser?.id;
    if (!effectiveId) return '';
    try {
      const draft = localStorage.getItem(`campus_student_question_draft_${effectiveId}`);
      if (draft !== null && draft !== undefined) return draft;
      const directQ = localStorage.getItem(`campus_student_question_${effectiveId}`);
      if (directQ) return directQ.trim();
    } catch {}
    return '';
  });
  const [isSavingQuestion, setIsSavingQuestion] = useState<boolean>(false);
  const [questionToast, setQuestionToast] = useState<string | null>(null);

  // 🔄 Real-time Draft & Typing Synchronizer
  const handleQuestionInputChange = useCallback((newVal: string) => {
    setQuestionInput(newVal);
    const effectiveId = props.studentId || studentUser?.id;
    if (effectiveId) {
      try {
        localStorage.setItem(`campus_student_question_draft_${effectiveId}`, newVal);
      } catch {}
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus_student_question_draft_updated', {
          detail: { studentId: effectiveId, text: newVal }
        }));
      }
    }
  }, [props.studentId, studentUser?.id]);

  // 🎙️ 0.1% Goldstandard Universal Dictation Engine
  const { isListening: isListeningSpeech, toggleListening: toggleSpeechRecognition } = useDictationInput({
    value: questionInput,
    onChange: handleQuestionInputChange,
    onError: (err) => {
      setQuestionToast('Diktierfunktion: ' + err);
      setTimeout(() => setQuestionToast(null), 3500);
    }
  });

  const openQuestionModal = useCallback(() => {
    const effectiveId = props.studentId || studentUser?.id;
    let textToUse = activeStudentQuestion || '';
    if (effectiveId) {
      try {
        const draft = localStorage.getItem(`campus_student_question_draft_${effectiveId}`);
        if (draft !== null && draft !== undefined) {
          textToUse = draft;
        } else {
          const directQ = localStorage.getItem(`campus_student_question_${effectiveId}`);
          if (directQ) textToUse = directQ.trim();
        }
      } catch {}
    }
    setQuestionInput(textToUse);
    setShowQuestionModal(true);
  }, [props.studentId, studentUser?.id, activeStudentQuestion]);

  // 🛰️ Cross-Tab & Cross-Component Real-Time Question & Draft Listener
  useEffect(() => {
    const effectiveId = props.studentId || studentUser?.id;
    if (!effectiveId) return;

    const handleQuestionUpdated = (e: any) => {
      const detailId = e?.detail?.studentId;
      if (detailId && String(detailId) !== String(effectiveId)) return;
      let q = typeof e?.detail?.question === 'string' ? e.detail.question.trim() : null;
      if (q === null) {
        try {
          const directQ = localStorage.getItem(`campus_student_question_${effectiveId}`);
          if (directQ !== null) {
            q = directQ.trim();
          } else {
            const rawNotes = localStorage.getItem(`campus_homework_notes_${effectiveId}`);
            if (rawNotes) {
              const list = JSON.parse(rawNotes);
              if (Array.isArray(list)) {
                const found = list.find((n: any) => typeof n === 'string' && (n.startsWith('STUDENT_QUESTION:') || n.startsWith('❓ Frage für den Unterricht:')));
                if (found) {
                  if (found.startsWith('STUDENT_QUESTION:')) {
                    const withoutPrefix = found.replace(/^STUDENT_QUESTION:/, '');
                    const pipeIdx = withoutPrefix.indexOf('|');
                    q = pipeIdx !== -1 ? withoutPrefix.slice(pipeIdx + 1).trim() : withoutPrefix.trim();
                  } else {
                    q = found.replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
                  }
                }
              }
            }
          }
        } catch {}
      }
      const finalQ = q || '';
      setActiveStudentQuestion(finalQ);
      setQuestionInput(finalQ);
    };

    const handleDraftUpdated = (e: any) => {
      const detailId = e?.detail?.studentId;
      if (detailId && String(detailId) !== String(effectiveId)) return;
      if (typeof e?.detail?.text === 'string') {
        setQuestionInput(e.detail.text);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === `campus_student_question_${effectiveId}` || e.key === `campus_homework_notes_${effectiveId}`) {
        handleQuestionUpdated({ detail: { studentId: effectiveId } });
      } else if (e.key === `campus_student_question_draft_${effectiveId}`) {
        if (typeof e.newValue === 'string') {
          setQuestionInput(e.newValue);
        }
      }
    };

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
  }, [props.studentId, studentUser?.id]);

  const handleSaveQuestion = useCallback(async (textToSave: string) => {
    const effectiveId = props.studentId || studentUser?.id;
    if (!effectiveId) return;
    const trimmed = textToSave.trim();
    setIsSavingQuestion(true);
    try {
      const isoNow = new Date().toISOString();
      const tag = trimmed ? `STUDENT_QUESTION:${isoNow}|${trimmed}` : '';

      // 1. Update localStorage cache
      const cacheKey = `campus_homework_notes_${effectiveId}`;
      let cachedList: any[] = [];
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) cachedList = JSON.parse(raw);
      } catch {}

      const filtered = (Array.isArray(cachedList) ? cachedList : []).filter(
        (n: any) => typeof n === 'string' && !n.startsWith('STUDENT_QUESTION:') && !n.startsWith('❓ Frage für den Unterricht:')
      );

      const updatedList = tag ? [tag, ...filtered] : filtered;
      try {
        localStorage.setItem(cacheKey, JSON.stringify(updatedList));
        if (trimmed) {
          localStorage.setItem(`campus_student_question_${effectiveId}`, trimmed);
        } else {
          localStorage.removeItem(`campus_student_question_${effectiveId}`);
        }
        localStorage.removeItem(`campus_student_question_draft_${effectiveId}`);
      } catch {}

      // Update active states
      setActiveStudentQuestion(trimmed);
      setQuestionInput(trimmed);

      // 2. Call Supabase RPC
      if (trimmed) {
        const { error } = await supabase.rpc('save_student_homework_question', {
          p_student_id: effectiveId,
          p_question_text: trimmed
        });
        if (error) {
          console.warn('[save_student_homework_question] fallback notice:', error);
        }
      } else {
        const { error } = await supabase.rpc('resolve_student_homework_question', {
          p_student_id: effectiveId
        });
        if (error) {
          console.warn('[resolve_student_homework_question] fallback notice:', error);
        }
      }

      // 3. Dispatch real-time events
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus_student_question_updated', {
          detail: { studentId: effectiveId, question: trimmed }
        }));
        window.dispatchEvent(new CustomEvent('campus_homework_notes_updated', {
          detail: { studentId: effectiveId }
        }));
      }

      setQuestionToast(trimmed ? 'Frage für deine Stunde gespeichert! ✨' : 'Frage gelöscht.');
      setTimeout(() => setQuestionToast(null), 3000);
      setShowQuestionModal(false);
    } catch (err) {
      console.error('[handleSaveQuestion] Error:', err);
      setQuestionToast('Fehler beim Speichern der Frage.');
      setTimeout(() => setQuestionToast(null), 3000);
    } finally {
      setIsSavingQuestion(false);
    }
  }, [props.studentId, studentUser?.id]);

  // 🎧 Audio-Quickie In-Place Mini-Player State
  const [quickieAudioUrl, setQuickieAudioUrl] = useState<string | null>(null);
  const [quickiePlaying, setQuickiePlaying] = useState<boolean>(false);
  const [quickieCurrentTime, setQuickieCurrentTime] = useState<number>(0);
  const [quickieDuration, setQuickieDuration] = useState<number>(0);
  const quickieAudioRef = useRef<HTMLAudioElement | null>(null);

  const toggleQuickieAudio = useCallback((url: string) => {
    if (!url) return;
    if (quickieAudioUrl === url) {
      if (quickiePlaying) {
        quickieAudioRef.current?.pause();
        setQuickiePlaying(false);
      } else {
        quickieAudioRef.current?.play().then(() => setQuickiePlaying(true)).catch(e => {
          console.warn('[AudioQuickie] play blocked:', e);
          setQuickiePlaying(false);
        });
      }
    } else {
      setQuickieAudioUrl(url);
      setQuickiePlaying(true);
      if (quickieAudioRef.current) {
        quickieAudioRef.current.src = url;
        quickieAudioRef.current.play().then(() => setQuickiePlaying(true)).catch(e => {
          console.warn('[AudioQuickie] play blocked:', e);
          setQuickiePlaying(false);
        });
      }
    }
  }, [quickieAudioUrl, quickiePlaying]);

  const formatQuickieDuration = (secs?: number | null) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ⭕ 1% Apple-Fitness-Style Radial Wow-Gauge (104px SVG mit zentrierter Minutenzahl / Checkmark)
  const renderCircularGauge = (
    progressPercent: number, 
    isGoalAchieved: boolean,
    size = 104,
    stroke = 10,
    todayMins = 0,
    requiredMins = 15
  ) => {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const clampedPercent = Math.min(100, Math.max(0, progressPercent));
    const strokeDashoffset = circumference * (1 - clampedPercent / 100);

    const gradientId = `ring-grad-${size}-${isGoalAchieved ? 'done' : 'prog'}`;
    const startColor = isGoalAchieved ? '#22c55e' : '#6366f1';
    const stopColor = isGoalAchieved ? '#16a34a' : '#8b5cf6';
    const glowColor = isGoalAchieved ? 'rgba(34, 197, 94, 0.45)' : 'rgba(99, 102, 241, 0.4)';

    return (
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={startColor} />
              <stop offset="100%" stopColor={stopColor} />
            </linearGradient>
          </defs>
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={stroke}
            opacity={0.8}
          />
          {/* Animated Progress Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: `drop-shadow(0 0 6px ${glowColor})`
            }}
          />
        </svg>
        {/* Center Label: Apple Watch Fitness Ring Style */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          {isGoalAchieved ? (
            <Check size={size >= 120 ? 38 : size >= 90 ? 30 : 20} strokeWidth={3.5} color="#16a34a" />
          ) : size >= 90 ? (
            <div style={{ textAlign: 'center', lineHeight: 1.05 }}>
              <div style={{
                fontSize: size >= 120 ? '1.85rem' : '1.25rem',
                fontWeight: 950,
                color: '#0f172a',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                letterSpacing: '-0.03em'
              }}>
                {todayMins}
              </div>
              <div style={{
                fontSize: size >= 120 ? '0.72rem' : '0.62rem',
                fontWeight: 850,
                color: '#64748b',
                textTransform: 'uppercase',
                marginTop: size >= 120 ? '3px' : '2px',
                letterSpacing: '0.04em'
              }}>
                / {requiredMins} Min.
              </div>
            </div>
          ) : (
            <span style={{
              fontSize: size >= 74 ? '1.05rem' : '0.90rem',
              fontWeight: 950,
              color: '#0f172a',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              letterSpacing: '-0.02em',
              lineHeight: 1
            }}>
              {progressPercent}%
            </span>
          )}
        </div>
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
          <style>{CAMPUS_XP_EFFECTS_CSS}</style>
          
          {/* MAIN LAYOUT (Full-width for Junior Level 1 or when Right Sidebar is Collapsed, 2-column when Open) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: (isMobile || studentUiLevel === 'junior' || isRightSidebarCollapsed) ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) 340px', 
            gap: isRightSidebarCollapsed ? '0px' : '32px', 
            paddingRight: '0px',
            alignItems: 'start',
            boxSizing: 'border-box',
            width: '100%',
            minWidth: 0,
            overflowX: 'clip',
            transition: 'grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1), gap 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            
            {/* MAIN COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', minWidth: 0, width: '100%' }}>
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
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(180px, 1fr))', 
                    gap: isMobile ? '10px' : '18px', 
                    width: '100%',
                    minWidth: 0,
                    boxSizing: 'border-box'
                  }}>
                    {/* KPI 1: Zauber-XP */}
                    {xpActive && (
                      <div style={{ 
                        position: 'relative', overflow: 'visible',
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        color: 'white',
                        borderRadius: '28px',
                        boxShadow: isXpPulsing 
                          ? '0 0 35px 8px rgba(250, 204, 21, 0.85), 0 14px 30px -6px rgba(99, 102, 241, 0.35)'
                          : '0 14px 30px -6px rgba(99, 102, 241, 0.35)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        minHeight: '100px',
                        padding: '20px 24px',
                        boxSizing: 'border-box',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: isXpPulsing ? '2px solid #facc15' : '1.5px solid rgba(255, 255, 255, 0.25)'
                      }} className={`hover-scale ${isXpPulsing ? 'campus-xp-pulsing' : ''}`}>
                        {floatingDepositAmount !== null && (
                          <div className="campus-xp-floating-badge">
                            +{floatingDepositAmount} XP eingezahlt! 🌟
                          </div>
                        )}
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
                            background: isXpPulsing ? 'rgba(250, 204, 21, 0.4)' : 'rgba(255, 255, 255, 0.25)', 
                            padding: '8px', 
                            borderRadius: '12px',
                            transition: 'all 0.3s ease'
                          }}>
                            <Star size={20} color={isXpPulsing ? '#fef08a' : 'white'} fill={isXpPulsing ? '#fef08a' : 'white'} />
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
                            {displayXp}
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
                            alt={studentUser?.first_name ? `${studentUser.first_name} Avatar` : "Musiker Instrument"} 
                            width={190}
                            height={160}
                            loading="eager"
                            decoding="async"
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'cover',
                              zIndex: 2,
                              transform: 'scale(1.06)',
                              transition: 'transform 0.5s ease',
                              aspectRatio: isMobile ? '16/9' : '190/160'
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
                            Schön, dass du da bist! Lass uns Musik machen! 🎵
                          </p>

                          {(() => {
                            const nextOcc = (scheduleOccurrences || [])[0] || (schoolYearOccurrences || [])[0];
                            const hasToday = !!briefingData?.todayLesson;
                            const teacherId = hasToday ? briefingData.todayLesson.teacher_id : (nextOcc?.teacher_id || studentUser?.teacher_id);
                            const timeLabel = hasToday ? briefingData.todayLesson.time : (nextOcc?.start_time?.substring(0, 5) || '15:15');
                            const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                            const todayStr = toLocalYYYYMMDD(getSimulatedNow());
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
                            const isCanceled = nextOcc?.status === 'canceled_by_student' || nextOcc?.status === 'cancelled' || nextOcc?.status === 'teacher_ausfall' || nextOcc?.status === 'canceled_by_teacher_ausfall';

                            return (
                              <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                {/* 1. Next Lesson Status & Action Button */}
                                {nextOcc ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedAppointmentForDetail(nextOcc);
                                      setShowCancelConfirmStep(false);
                                    }}
                                    style={{ 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: '8px', 
                                      background: isCanceled ? '#fee2e2' : 'linear-gradient(135deg, rgba(52, 168, 83, 0.09) 0%, rgba(52, 168, 83, 0.03) 100%)', 
                                      color: isCanceled ? '#dc2626' : '#2e7d32', 
                                      padding: isMusicStandMode ? '10px 20px' : '8px 16px', 
                                      minHeight: isMusicStandMode ? '44px' : '38px', 
                                      boxSizing: 'border-box', 
                                      borderRadius: '14px', 
                                      fontSize: isMusicStandMode ? '0.94rem' : '0.86rem', 
                                      fontWeight: 850, 
                                      border: isCanceled ? '1px dashed rgba(239, 68, 68, 0.5)' : '1.5px solid rgba(52, 168, 83, 0.2)',
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                                      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}
                                    className="hover-scale"
                                    title="Nächste Musikstunde – Klicke für Details & Aktionen"
                                  >
                                    {(() => {
                                      const isUnlocked = isStudentAbsenceAllowed || checkIsParentUnlockedGlobal();
                                      if (isCanceled) {
                                        return (
                                          <>
                                            {!isUnlocked ? <Lock size={isMusicStandMode ? 16 : 14} color="#dc2626" /> : <CalendarX size={isMusicStandMode ? 16 : 14} color="#dc2626" />}
                                            <span>Abgesagt: {lessonText} <span style={{ fontSize: '0.74rem', opacity: 0.85, fontWeight: 700 }}>(Reaktivieren)</span></span>
                                          </>
                                        );
                                      }
                                      return (
                                        <>
                                          <Calendar size={isMusicStandMode ? 16 : 14} color="#34a853" />
                                          <span>Nächste Musikstunde: {lessonText}</span>
                                        </>
                                      );
                                    })()}
                                  </button>
                                ) : (
                                  <div style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '8px', 
                                    background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.09) 0%, rgba(52, 168, 83, 0.03) 100%)', 
                                    color: '#2e7d32', 
                                    padding: isMusicStandMode ? '10px 20px' : '8px 16px', 
                                    minHeight: isMusicStandMode ? '44px' : '38px', 
                                    boxSizing: 'border-box', 
                                    borderRadius: '14px', 
                                    fontSize: isMusicStandMode ? '0.94rem' : '0.86rem', 
                                    fontWeight: 850, 
                                    border: '1.5px solid rgba(52, 168, 83, 0.2)'
                                  }}>
                                    <Calendar size={isMusicStandMode ? 16 : 14} color="#34a853" />
                                    <span>Nächste Musikstunde: Demnächst</span>
                                  </div>
                                )}

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

                    // 1. Gather all active homework books & pages (Memoized 0.1% Goldstandard)
                    const { activeJuniorBooks, activeJuniorSongs } = memoizedJuniorHomework;

                    let isBooksCarriedOver = false;
                    let isSongsCarriedOver = false;
                    let carriedOverWeekLabel = '';

                    // 2b. 📦 Snapshot Hydration: Falls activeJuniorBooks oder activeJuniorSongs leer sind, aus jüngstem SNAPSHOT hydrieren
                    if (activeJuniorBooks.length === 0 || activeJuniorSongs.length === 0) {
                      const allSnapshotCandidates = (progressItems || []).filter((item: any) => item.topic_name?.startsWith('Hausaufgabe KW '));
                      allSnapshotCandidates.sort((a: any, b: any) => {
                        const wA = getItemWeek(a);
                        const wB = getItemWeek(b);
                        if (wA && wB && wA !== wB) return wB.localeCompare(wA);
                        const tA = new Date(a.updated_at || a.created_at || 0).getTime();
                        const tB = new Date(b.updated_at || b.created_at || 0).getTime();
                        return tB - tA;
                      });

                      for (const snapItem of allSnapshotCandidates) {
                        const rawNotes = snapItem.homework_notes || snapItem.teacher_notes;
                        if (!rawNotes) continue;
                        let parsedSnapNotes: any = null;
                        try {
                          parsedSnapNotes = typeof rawNotes === 'string' ? JSON.parse(rawNotes) : rawNotes;
                        } catch {}
                        if (!Array.isArray(parsedSnapNotes)) {
                          if (typeof rawNotes === 'string' && rawNotes.includes('SNAPSHOT_')) {
                            parsedSnapNotes = [rawNotes];
                          } else {
                            continue;
                          }
                        }

                        if (activeJuniorBooks.length === 0) {
                          const snapLwEntry = parsedSnapNotes.find((n: any) => typeof n === 'string' && n.includes('SNAPSHOT_LEHRWERKE:'));
                          if (snapLwEntry) {
                            try {
                              const sIdx = snapLwEntry.indexOf('SNAPSHOT_LEHRWERKE:');
                              const after = snapLwEntry.slice(sIdx + 'SNAPSHOT_LEHRWERKE:'.length);
                              const endIdx = after.search(/\n\n--- [A-Z_]+ ---|\n\nSNAPSHOT_/);
                              const jsonStr = (endIdx !== -1 ? after.slice(0, endIdx) : after).trim();
                              const parsedLw = JSON.parse(jsonStr);
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
                                    isBooksCarriedOver = true;
                                  }
                                });
                              }
                            } catch (e) {
                              console.warn('Error hydrating SNAPSHOT_LEHRWERKE in Junior:', e);
                            }
                          }
                        }

                        if (activeJuniorSongs.length === 0) {
                          const snapSongEntry = parsedSnapNotes.find((n: any) => typeof n === 'string' && n.includes('SNAPSHOT_SONGS:'));
                          if (snapSongEntry) {
                            try {
                              const sIdx = snapSongEntry.indexOf('SNAPSHOT_SONGS:');
                              const after = snapSongEntry.slice(sIdx + 'SNAPSHOT_SONGS:'.length);
                              const endIdx = after.search(/\n\n--- [A-Z_]+ ---|\n\nSNAPSHOT_/);
                              const jsonStr = (endIdx !== -1 ? after.slice(0, endIdx) : after).trim();
                              const parsedSongs = JSON.parse(jsonStr);
                              if (Array.isArray(parsedSongs) && parsedSongs.length > 0) {
                                parsedSongs.forEach((song: any) => {
                                  const tName = cleanTitle(song.topic_name || song.title || '');
                                  if (tName && !activeJuniorSongs.some(s => cleanTitle(s.topic_name || s.title || '').toLowerCase() === tName.toLowerCase())) {
                                    activeJuniorSongs.push({
                                      ...song,
                                      topic_name: tName,
                                      title: tName,
                                      is_current_homework: true
                                    });
                                    isSongsCarriedOver = true;
                                  }
                                });
                              }
                            } catch (e) {
                              console.warn('Error hydrating SNAPSHOT_SONGS in Junior:', e);
                            }
                          }
                        }

                        if ((isBooksCarriedOver || isSongsCarriedOver) && !carriedOverWeekLabel) {
                          const kwMatch = snapItem.topic_name?.match(/Hausaufgabe KW\s*(\d+)/i);
                          if (kwMatch) carriedOverWeekLabel = `KW ${kwMatch[1]}`;
                        }

                        if (activeJuniorBooks.length > 0 && activeJuniorSongs.length > 0) break;
                      }
                    }

                    // 3. Notes & Audio
                    const currentWeekNotes: string[] = [];
                    const directAudioCandidates: Array<{ url: string; date?: string; label?: string; author?: string; duration?: number; idx?: number }> = [];

                    const allSnapshotCandidates = (progressItems || []).filter((item: any) => item.topic_name?.startsWith('Hausaufgabe KW '));
                    const curWkNum = (currentWeekStr.split('-W')[1] || '').replace(/^0+/, '');
                    let resolvedSnapshot = allSnapshotCandidates.find((item: any) => {
                      const itemW = getItemWeek(item);
                      return item.topic_name === `Hausaufgabe KW ${curWkNum}` || item.topic_name === `Hausaufgabe KW ${currentWeekStr.split('-W')[1] || ''}` || itemW === currentWeekStr;
                    });
                    if (!resolvedSnapshot && allSnapshotCandidates.length > 0) {
                      const sortedSnaps = [...allSnapshotCandidates].sort((a: any, b: any) => {
                        const wA = getItemWeek(a);
                        const wB = getItemWeek(b);
                        if (wA && wB && wA !== wB) return wB.localeCompare(wA);
                        const tA = new Date(a.updated_at || a.created_at || 0).getTime();
                        const tB = new Date(b.updated_at || b.created_at || 0).getTime();
                        return tB - tA;
                      });
                      resolvedSnapshot = sortedSnaps.find(s => s.is_current_homework) || sortedSnaps[0];
                    }

                    (progressItems || []).forEach(item => {
                      const isCurrentHwSnapshot = resolvedSnapshot ? (item.id === resolvedSnapshot.id || item.topic_name === resolvedSnapshot.topic_name) : false;
                      const isOtherActiveHw = Boolean(item.is_current_homework) && !item.topic_name?.startsWith('Hausaufgabe KW ');
                      const isActive = isCurrentHwSnapshot || isOtherActiveHw;

                      // Direct recording_url
                      if (isActive && item.recording_url && typeof item.recording_url === 'string' && item.recording_url.trim()) {
                        directAudioCandidates.push({
                          url: item.recording_url.trim(),
                          date: item.updated_at || item.created_at,
                          label: item.topic_name || 'Aufnahme',
                          author: 'teacher'
                        });
                      }

                      if (isActive) {
                        [item.homework_notes, item.teacher_notes].forEach(noteField => {
                          if (noteField && typeof noteField === 'string' && noteField.trim()) {
                            try {
                              const parsed = JSON.parse(noteField);
                              if (Array.isArray(parsed)) {
                                parsed.forEach((n: any) => {
                                  if (typeof n === 'string' && n.trim() && !currentWeekNotes.includes(n.trim())) currentWeekNotes.push(n.trim());
                                });
                              } else if (typeof parsed === 'string' && parsed.trim() && !currentWeekNotes.includes(parsed.trim())) {
                                currentWeekNotes.push(parsed.trim());
                              }
                            } catch {
                              if (!currentWeekNotes.includes(noteField.trim())) currentWeekNotes.push(noteField.trim());
                            }
                          }
                        });
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

                    directAudioCandidates.forEach((cand, idx) => {
                      if (!audioTracks.some(t => t.url === cand.url)) {
                        audioTracks.push({
                          url: cand.url,
                          duration: cand.duration || 0,
                          date: cand.date || '',
                          label: cand.label || `Aufnahme #${audioTracks.length + 1}`,
                          author: cand.author || 'teacher',
                          idx
                        });
                      }
                    });

                    currentWeekNotes.forEach((n, idx) => {
                      if (typeof n === 'string') {
                        if (n.startsWith('AUDIO:')) {
                          const parts = n.substring(6).split('|');
                          if (!audioTracks.some(t => t.url === parts[0])) {
                            audioTracks.push({
                              url: parts[0],
                              duration: parseFloat(parts[1]) || 0,
                              date: parts[2],
                              label: parts[3] || `Aufnahme #${audioTracks.length + 1}`,
                              author: parts[4] || 'teacher',
                              songTag: parts[7] || undefined,
                              idx: audioTracks.length
                            });
                          }
                        } else if (n.startsWith('[') || n.startsWith('{')) {
                          try {
                            const parsed = JSON.parse(n);
                            if (Array.isArray(parsed)) {
                              parsed.forEach((item: string) => {
                                if (typeof item === 'string' && item.startsWith('AUDIO:')) {
                                  const parts = item.substring(6).split('|');
                                  if (!audioTracks.some(t => t.url === parts[0])) {
                                    audioTracks.push({
                                      url: parts[0],
                                      duration: parseFloat(parts[1]) || 0,
                                      date: parts[2],
                                      label: parts[3] || `Aufnahme #${audioTracks.length + 1}`,
                                      author: parts[4] || 'teacher',
                                      songTag: parts[7] || undefined,
                                      idx: audioTracks.length
                                    });
                                  }
                                }
                              });
                            }
                          } catch {}
                        }
                      }
                    });

                    // 🌉 Smart Audio Bridge: Bridge active practice tracks from latest snapshot or progressItems if current week has none
                    if (audioTracks.length === 0) {
                      const allAudioSnapshots = (progressItems || []).filter((item: any) => item.topic_name?.startsWith('Hausaufgabe KW '));
                      allAudioSnapshots.sort((a: any, b: any) => {
                        const wA = getItemWeek(a);
                        const wB = getItemWeek(b);
                        if (wA && wB && wA !== wB) return wB.localeCompare(wA);
                        const tA = new Date(a.updated_at || a.created_at || 0).getTime();
                        const tB = new Date(b.updated_at || b.created_at || 0).getTime();
                        return tB - tA;
                      });

                      for (const snap of allAudioSnapshots) {
                        if (snap.recording_url && typeof snap.recording_url === 'string' && snap.recording_url.trim()) {
                          audioTracks.push({
                            url: snap.recording_url.trim(),
                            duration: 0,
                            date: snap.updated_at || snap.created_at,
                            label: snap.topic_name || 'Aufnahme #1',
                            author: 'teacher',
                            isCarriedOver: true,
                            idx: audioTracks.length
                          });
                        }
                        const snapNotesStr = snap.homework_notes || snap.teacher_notes;
                        if (snapNotesStr) {
                          try {
                            const parsed = typeof snapNotesStr === 'string' && (snapNotesStr.startsWith('[') || snapNotesStr.startsWith('{')) ? JSON.parse(snapNotesStr) : (Array.isArray(snapNotesStr) ? snapNotesStr : [snapNotesStr]);
                            if (Array.isArray(parsed)) {
                              parsed.forEach((item: any) => {
                                if (typeof item === 'string' && item.includes('AUDIO:')) {
                                  const cleanStr = item.startsWith('[') ? item.replace(/[\[\]"]/g, '') : item;
                                  const parts = cleanStr.substring(cleanStr.indexOf('AUDIO:') + 6).split('|');
                                  if (!audioTracks.some(t => t.url === parts[0])) {
                                    audioTracks.push({
                                      url: parts[0],
                                      duration: parseFloat(parts[1]) || 0,
                                      date: parts[2],
                                      label: parts[3] || ('Aufnahme #' + (audioTracks.length + 1)),
                                      author: parts[4] || 'teacher',
                                      songTag: parts[7] || undefined,
                                      isCarriedOver: true,
                                      idx: audioTracks.length
                                    });
                                    if (!carriedOverWeekLabel) {
                                      const kwMatch = snap.topic_name?.match(/Hausaufgabe KW\s*(\d+)/i);
                                      if (kwMatch) carriedOverWeekLabel = `KW ${kwMatch[1]}`;
                                    }
                                  }
                                }
                              });
                            }
                          } catch {}
                        }
                        if (audioTracks.length > 0) break;
                      }

                      // Fallback: check any recording_url or AUDIO: in individual song / lehrwerk progress items
                      if (audioTracks.length === 0) {
                        (progressItems || []).forEach((item: any) => {
                          if (item.recording_url && typeof item.recording_url === 'string' && item.recording_url.trim()) {
                            if (!audioTracks.some(t => t.url === item.recording_url.trim())) {
                              audioTracks.push({
                                url: item.recording_url.trim(),
                                duration: 0,
                                date: item.updated_at || item.created_at,
                                label: item.topic_name || 'Aufnahme',
                                author: 'teacher',
                                isCarriedOver: true,
                                idx: audioTracks.length
                              });
                            }
                          }
                          const nStr = item.homework_notes || item.teacher_notes;
                          if (nStr && typeof nStr === 'string' && nStr.includes('AUDIO:')) {
                            try {
                              const parsed = nStr.startsWith('[') || nStr.startsWith('{') ? JSON.parse(nStr) : [nStr];
                              if (Array.isArray(parsed)) {
                                parsed.forEach((n: any) => {
                                  if (typeof n === 'string' && n.includes('AUDIO:')) {
                                    const cleanStr = n.startsWith('[') ? n.replace(/[\[\]"]/g, '') : n;
                                    const parts = cleanStr.substring(cleanStr.indexOf('AUDIO:') + 6).split('|');
                                    if (!audioTracks.some(t => t.url === parts[0])) {
                                      audioTracks.push({
                                        url: parts[0],
                                        duration: parseFloat(parts[1]) || 0,
                                        date: parts[2],
                                        label: parts[3] || ('Aufnahme #' + (audioTracks.length + 1)),
                                        author: parts[4] || 'teacher',
                                        songTag: parts[7] || undefined,
                                        isCarriedOver: true,
                                        idx: audioTracks.length
                                      });
                                    }
                                  }
                                });
                              }
                            } catch {}
                          }
                        });
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
                    const isDidacticNote = (n: any) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.startsWith('LATENCY:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('SNAPSHOT_') && !n.startsWith('FEEDBACK:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:') && !n.startsWith('STUDENT_QUESTION:') && !n.startsWith('❓ Frage für den Unterricht:');

                    let generalNotesList: string[] = currentWeekNotes.filter(isDidacticNote).map(cleanGeneralNote).filter(Boolean);

                    if (generalNotesList.length === 0) {
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
                            const pastNotes = parsed.filter(isDidacticNote).map(cleanGeneralNote).filter(Boolean);
                            if (pastNotes.length > 0) {
                              generalNotesList = pastNotes;
                              isPastNoteCarriedOver = true;
                              if (!carriedOverWeekLabel) {
                                const kwMatch = latestPast.topic_name?.match(/Hausaufgabe KW\s*(\d+)/i);
                                if (kwMatch) carriedOverWeekLabel = `KW ${kwMatch[1]}`;
                              }
                            }
                          } else if (typeof parsed === 'string') {
                            const cleanP = cleanGeneralNote(parsed);
                            if (cleanP) {
                              generalNotesList = [cleanP];
                              isPastNoteCarriedOver = true;
                              if (!carriedOverWeekLabel) {
                                const kwMatch = latestPast.topic_name?.match(/Hausaufgabe KW\s*(\d+)/i);
                                if (kwMatch) carriedOverWeekLabel = `KW ${kwMatch[1]}`;
                              }
                            }
                          }
                        } catch {}
                      }
                    }
                    const generalNote = generalNotesList[0] || '';

                    const isAudioCarriedOver = audioTracks.some(t => t.isCarriedOver);
                    const isCarriedOverPlan = isAudioCarriedOver || isPastNoteCarriedOver || isBooksCarriedOver || isSongsCarriedOver;

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
                            padding: isMusicStandMode ? '32px' : '26px 20px',
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
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              gap: '8px', 
                              width: '100%',
                              flexWrap: 'nowrap' 
                            }}>
                              <div style={{
                                background: 'linear-gradient(135deg, #e6f4ea 0%, #d1fae5 100%)',
                                color: '#34a853',
                                width: isMusicStandMode ? '52px' : '42px',
                                height: isMusicStandMode ? '52px' : '42px',
                                borderRadius: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(52, 168, 83, 0.16)',
                                flexShrink: 0
                              }}>
                                <BookOpen size={isMusicStandMode ? 26 : 22} />
                              </div>

                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                flexWrap: 'nowrap',
                                minWidth: 0 
                              }}>
                                {/* 3D-TOY-BUTTON FÜR VORLESEN (Hör zu!) */}
                                {(draftAllowTts ?? (studentUser as any)?.parent_allow_tts ?? (studentUiLevel === 'junior')) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const narrative = buildContinuousHomeworkNarrative({
                                        teacherName: formatTeacherFullName(studentUser?.teacher_name || studentUser?.teacher || briefingData?.todayLesson?.teacher_name || briefingData?.todayLesson?.teacher),
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
                                      padding: isMusicStandMode ? '8px 14px' : '6px 11px',
                                      minHeight: '38px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      cursor: 'pointer',
                                      color: '#ffffff',
                                      fontSize: isMusicStandMode ? '0.86rem' : '0.78rem',
                                      fontWeight: 950,
                                      whiteSpace: 'nowrap',
                                      boxShadow: isTtsSpeaking && activeTtsKey === 'junior_box1' 
                                        ? '0 3px 0 #991b1b, 0 6px 14px rgba(239, 68, 68, 0.35)' 
                                        : '0 3px 0 #1e7037, 0 6px 14px rgba(52, 168, 83, 0.32)',
                                      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}
                                    title={isTtsSpeaking && activeTtsKey === 'junior_box1' ? "Vorlesen stoppen" : "Hausaufgaben vorlesen lassen"}
                                    aria-label={isTtsSpeaking && activeTtsKey === 'junior_box1' ? "Vorlesen stoppen" : "Hausaufgaben vorlesen lassen"}
                                  >
                                    {isTtsSpeaking && activeTtsKey === 'junior_box1' ? (
                                      <span>Stopp ⏹</span>
                                    ) : (
                                      <>
                                        <Volume2 size={15} color="#ffffff" strokeWidth={2.8} />
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
                                        padding: isMusicStandMode ? '8px 14px' : '6px 10px',
                                        minHeight: '38px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        cursor: 'pointer',
                                        color: '#1e7037',
                                        fontSize: isMusicStandMode ? '0.86rem' : '0.78rem',
                                        fontWeight: 900,
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 2px 8px rgba(52, 168, 83, 0.12)',
                                        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                                      }}
                                      className="hover-scale-mini"
                                      title="Aufnahmen deiner Lehrkraft anhören"
                                      aria-label="Aufnahmen deiner Lehrkraft anhören"
                                    >
                                      <Headphones size={15} color="#1e7037" strokeWidth={2.4} />
                                      <span>{audioTracks.length === 1 ? '1 Aufnahme' : `${audioTracks.length} Aufnahmen`}</span>
                                    </button>
                                  )}

                                  {/* 1-Touch Praxis-Tools Direktzugriff (ehemals Metronom) */}
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
                                        padding: isMusicStandMode ? '8px 14px' : '6px 10px',
                                        minHeight: '38px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        cursor: 'pointer',
                                        color: '#0f172a',
                                        fontSize: isMusicStandMode ? '0.86rem' : '0.78rem',
                                        fontWeight: 900,
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                                        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                                      }}
                                      className="hover-scale-mini"
                                      title="Praxis-Tools: Metronom, Stimmgerät & Toolbox öffnen"
                                      aria-label="Praxis-Tools öffnen"
                                    >
                                      <Sliders size={15} color="#34a853" strokeWidth={2.4} />
                                      <span>Tools</span>
                                    </button>
                                  )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                                <div style={{ fontSize: isMusicStandMode ? '0.92rem' : '0.84rem', fontWeight: 950, color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Hausaufgaben
                                </div>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  fontSize: isMusicStandMode ? '0.78rem' : '0.74rem',
                                  fontWeight: 800,
                                  color: '#16a34a',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  <Music size={12} color="#16a34a" strokeWidth={2.4} />
                                  <span>Dein Wochen-Fahrplan</span>
                                </div>
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
                                      background: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#e11d48',
                                      boxShadow: '0 1px 3px rgba(225, 29, 72, 0.12)',
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
                                const songColor = getSongColor(songTitle);
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
                                        background: `linear-gradient(135deg, ${songColor.from}, ${songColor.to})`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: songColor.text || '#0f172a',
                                        boxShadow: `0 2px 6px ${songColor.shadowFrom || 'rgba(0,0,0,0.06)'}`,
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

                              {/* Zusätzliche Bemerkung / Notizen (Aufbau wie Wochen-Fahrplan im Aufgaben Board) */}
                              {generalNotesList && generalNotesList.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {generalNotesList.map((noteItem: string, nIdx: number) => (
                                    <div key={`j-gn-${nIdx}`} style={{
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
                                        background: '#dcfce7',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#15803d',
                                        flexShrink: 0
                                      }}>
                                        <FileText size={14} strokeWidth={2.4} />
                                      </div>
                                      <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {noteItem}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Frage des Schülers für die Stunde (Gelber Text & Gelbe Kennzeichnung) */}
                              {(() => {
                                const displayedStudentQuestion = activeStudentQuestion || studentQuestionText;
                                if (!displayedStudentQuestion) return null;
                                return (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '0.88rem',
                                    padding: '8px 12px',
                                    borderRadius: '12px',
                                    background: '#fffdf0',
                                    border: '1px solid #fde047',
                                    boxShadow: '0 1px 3px rgba(250, 204, 21, 0.15)'
                                  }}>
                                    <HelpCircle size={14} style={{ color: '#ca8a04', flexShrink: 0 }} strokeWidth={2.5} />
                                    <strong style={{ color: '#ca8a04', fontWeight: 850, flexShrink: 0 }}>Deine Frage:</strong>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#713f12', fontWeight: 700 }}>
                                      „{displayedStudentQuestion}“
                                    </span>
                                  </div>
                                );
                              })()}

                              {/* Wenn weder noch */}
                              {activeJuniorBooks.length === 0 && activeJuniorSongs.length === 0 && (!generalNotesList || generalNotesList.length === 0) && (
                                <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                  Keine offenen Aufgaben für diese Woche erfasst
                                </div>
                              )}
                            </div>
                            {/* Audio-Quickie: In-Place Mini-Player falls Lehreraufnahme vorhanden */}
                            {audioTracks && audioTracks.length > 0 && (
                              <div style={{
                                background: '#f8fafc',
                                border: '1.5px solid #e2e8f0',
                                borderRadius: '16px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                                marginTop: '4px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                  <button
                                    type="button"
                                    role="button"
                                    tabIndex={0}
                                    aria-label={quickieAudioUrl === audioTracks[0].url && quickiePlaying ? "Aufnahme pausieren" : "Aufnahme abspielen"}
                                    onClick={(e) => { e.stopPropagation(); toggleQuickieAudio(audioTracks[0].url); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleQuickieAudio(audioTracks[0].url); } }}
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '50%',
                                      background: quickieAudioUrl === audioTracks[0].url && quickiePlaying ? '#16a34a' : '#ffffff',
                                      color: quickieAudioUrl === audioTracks[0].url && quickiePlaying ? '#ffffff' : '#16a34a',
                                      border: '1.5px solid #bbf7d0',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      flexShrink: 0,
                                      boxShadow: '0 2px 6px rgba(22, 163, 74, 0.15)',
                                      transition: 'all 0.15s ease'
                                    }}
                                    className="hover-scale-mini"
                                  >
                                    {quickieAudioUrl === audioTracks[0].url && quickiePlaying ? (
                                      <Pause size={16} fill="currentColor" />
                                    ) : (
                                      <Play size={16} fill="currentColor" style={{ marginLeft: '2px' }} />
                                    )}
                                  </button>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      <Headphones size={12} color="#16a34a" />
                                      <span style={{ fontSize: '0.70rem', fontWeight: 900, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Vorspiel / Feedback
                                      </span>
                                    </div>
                                    <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {audioTracks[0].label || 'Aufnahme deiner Lehrkraft'}
                                    </span>
                                  </div>
                                </div>
                                <span style={{ fontSize: '0.76rem', fontWeight: 850, color: '#64748b', background: '#ffffff', padding: '3px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                                  {quickieAudioUrl === audioTracks[0].url && quickieCurrentTime > 0 
                                    ? `${formatQuickieDuration(quickieCurrentTime)} / ${formatQuickieDuration(quickieDuration || audioTracks[0].duration)}`
                                    : formatQuickieDuration(audioTracks[0].duration)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* 2-Button Action Footer */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '10px' }}>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setShowJuniorHomeworkModal(true); }}
                              style={{
                                padding: isMusicStandMode ? '16px 14px' : '14px 12px',
                                minHeight: '48px',
                                borderRadius: '18px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #34a853 0%, #2e9549 100%)',
                                color: '#ffffff',
                                fontSize: isMusicStandMode ? '1.05rem' : '0.96rem',
                                fontWeight: 950,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 6px 18px rgba(52, 168, 83, 0.28)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                              className="hover-scale"
                            >
                              <BookOpen size={isMusicStandMode ? 18 : 16} style={{ flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Hausaufgaben</span>
                            </button>

                            {(() => {
                              const displayedStudentQuestion = activeStudentQuestion || studentQuestionText;
                              return (
                                <button
                                  type="button"
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openQuestionModal();
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      openQuestionModal();
                                    }
                                  }}
                                  style={{
                                    padding: isMusicStandMode ? '16px 12px' : '14px 10px',
                                    minHeight: '48px',
                                    borderRadius: '18px',
                                    border: displayedStudentQuestion ? 'none' : '1.5px solid #fde047',
                                    background: displayedStudentQuestion ? '#facc15' : '#fef9c3',
                                    color: displayedStudentQuestion ? '#0f172a' : '#713f12',
                                    fontSize: isMusicStandMode ? '1.05rem' : '0.96rem',
                                    fontWeight: 950,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s',
                                    boxShadow: displayedStudentQuestion ? '0 4px 14px rgba(250, 204, 21, 0.35)' : 'none'
                                  }}
                                  className="hover-scale"
                                  title={displayedStudentQuestion ? "Hinterlegte Frage bearbeiten" : "Frage für den Unterricht stellen"}
                                  aria-label={displayedStudentQuestion ? "Hinterlegte Frage bearbeiten" : "Frage für den Unterricht stellen"}
                                >
                                  <HelpCircle size={isMusicStandMode ? 18 : 16} color="currentColor" style={{ flexShrink: 0 }} />
                                  <span>{displayedStudentQuestion ? 'Frage aktiv' : 'Frage?'}</span>
                                </button>
                              );
                            })()}
                          </div>
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

                              {/* 3 Zauber-Schilde Puffer-Schutz */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 12px',
                                background: '#ecfdf5',
                                borderRadius: '12px',
                                border: '1px solid #a7f3d0',
                                fontSize: isMusicStandMode ? '0.86rem' : '0.78rem',
                                fontWeight: 800,
                                color: '#065f46'
                              }}>
                                <Shield size={14} color="#059669" fill="#059669" style={{ flexShrink: 0 }} />
                                <span>3 Zauber-Schilde halten Wache • Dein Stern ist sicher!</span>
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
                          const { formattedJuniorBooks, otherActiveSongs, audioTracks, generalNote, allTeacherNotes, studentQuestionText, hasAnyHomework } = getJuniorWeeklyHomeworkSummary() as any;
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
                                            teacherName: formatTeacherFullName(studentUser?.teacher_name || studentUser?.teacher || briefingData?.todayLesson?.teacher_name || briefingData?.todayLesson?.teacher),
                                            instrument: studentUser?.instrument_type || (studentUser as any)?.instrument || avatar?.instrument_type,
                                            books: formattedJuniorBooks.map((b: any) => ({
                                              title: b.title,
                                              pageNums: b.pageNums,
                                              notes: b.notesList ? b.notesList.map((n: any) => n.text) : []
                                            })),
                                            songs: otherActiveSongs.map((s: any) => ({
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
                                    {formattedJuniorBooks.map((bookItem: any, idx: number) => (
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
                                              background: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              color: '#e11d48',
                                              boxShadow: '0 1px 3px rgba(225, 29, 72, 0.12)',
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
                                    {otherActiveSongs.map((item: any, idx: number) => {
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
                                        <AudioTrackCarousel
                                          tracks={audioTracks}
                                          isTeacher={false}
                                          readOnly={true}
                                          uiLevel={(studentUiLevel as any) || 'junior'}
                                        />
                                      </div>
                                    )}

                                     {/* General Notes */}
                                     {((allTeacherNotes && allTeacherNotes.length > 0) || generalNote) && (
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
                                         <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                                           <strong style={{ color: '#15803d', fontWeight: 850 }}>
                                             {allTeacherNotes && allTeacherNotes.length > 1 ? 'Hinweise deiner Lehrkraft:' : 'Hinweis:'}
                                           </strong>
                                           {allTeacherNotes && allTeacherNotes.length > 0 ? (
                                             <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                                               {allTeacherNotes.map((noteItem: string, nIdx: number) => (
                                                 <div key={nIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                                   {allTeacherNotes.length > 1 && <span style={{ color: '#15803d', fontWeight: 900 }}>•</span>}
                                                   <span>{noteItem}</span>
                                                 </div>
                                               ))}
                                             </div>
                                           ) : (
                                             <div>{generalNote}</div>
                                           )}
                                         </div>
                                       </div>
                                     )}

                                    {/* Student Question */}
                                    {studentQuestionText && (() => {
                                      const effectiveTeacherName = formatTeacherFullName(studentUser?.teacher_name || studentUser?.teacher || briefingData?.todayLesson?.teacher_name || briefingData?.todayLesson?.teacher);
                                      return (
                                        <div style={{
                                          marginTop: '4px',
                                          background: '#fefce8',
                                          border: '1px solid #fef08a',
                                          borderRadius: '14px',
                                          padding: '10px 14px',
                                          boxShadow: '0 2px 6px rgba(234, 179, 8, 0.06)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '5px'
                                        }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
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
                                              „{studentQuestionText}“
                                            </span>
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
                                            <span>Für {effectiveTeacherName} zur nächsten Stunde vorgemerkt</span>
                                          </div>
                                        </div>
                                      );
                                    })()}
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
                        {/* 🎛️ Instrumenten-PAD Button (-6 dB Dämpfung für dynamikstarke Instrumente / Slap-Transienten) */}
                        {setIsJuniorPadActive && (
                          <button
                            type="button"
                            onClick={() => setIsJuniorPadActive(prev => !prev)}
                            aria-label={isJuniorPadActive ? "Instrumenten-PAD aktiv (-6 dB Headroom-Dämpfung)" : "Instrumenten-PAD inaktiv (Standard 0 dB)"}
                            title={isJuniorPadActive ? "PAD aktiv: -6 dB Headroom für dynamikstarke Instrumente / Slap-Gitarre" : "PAD: -6 dB Headroom-Dämpfung zuschalten"}
                            style={{
                              position: 'absolute',
                              top: '24px',
                              left: '24px',
                              background: isJuniorPadActive ? '#0f172a' : '#f1f5f9',
                              border: isJuniorPadActive ? '1.5px solid #0f172a' : '1.5px solid #cbd5e1',
                              width: '44px',
                              height: '44px',
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: isJuniorPadActive ? '#ffffff' : '#64748b',
                              boxShadow: isJuniorPadActive ? '0 2px 8px rgba(15, 23, 42, 0.25)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                            className="hover-scale-mini"
                          >
                            <SlidersHorizontal size={18} color={isJuniorPadActive ? '#ffffff' : '#64748b'} strokeWidth={isJuniorPadActive ? 2.4 : 2} />
                          </button>
                        )}

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
                              <div style={{ marginTop: '6px' }}>
                                <span style={{ 
                                  fontSize: '0.74rem', 
                                  fontWeight: 800, 
                                  color: isCellular ? '#b45309' : '#15803d', 
                                  background: isCellular ? '#fef3c7' : '#dcfce7', 
                                  padding: '3px 10px', 
                                  borderRadius: '12px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  {isCellular ? <Signal size={12} /> : <Wifi size={12} />}
                                  {isCellular ? 'Smart-Audio (128k • Spart 60% Daten)' : 'Studio-Qualität (320k)'}
                                </span>
                              </div>
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

                            {/* 🛡️ 1% Goldstandard Mobile & Network Awareness Cardlet */}
                            <div style={{
                              width: '100%',
                              background: isCellular ? '#fffbeb' : '#f0fdf4',
                              border: isCellular ? '1.5px solid #fef3c7' : '1.5px solid #dcfce7',
                              borderRadius: '16px',
                              padding: '12px 14px',
                              boxSizing: 'border-box',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              textAlign: 'left'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Shield size={16} color={isCellular ? '#d97706' : '#16a34a'} />
                                  <span style={{ fontSize: '0.82rem', fontWeight: 850, color: isCellular ? '#92400e' : '#15803d' }}>
                                    {isCellular ? 'Im lokalen Tresor gesichert' : 'WLAN • Bereit zur Synchronisation'}
                                  </span>
                                </div>
                                {juniorRecordedBlob?.size ? (
                                  <span style={{ 
                                    fontSize: '0.74rem', 
                                    fontWeight: 800, 
                                    color: '#475569', 
                                    background: '#ffffff', 
                                    padding: '2px 8px', 
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0'
                                  }}>
                                    {formatBytes(juniorRecordedBlob.size)}
                                  </span>
                                ) : null}
                              </div>

                              {isCellular && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '2px', flexWrap: 'wrap' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Signal size={13} color="#b45309" />
                                    <span style={{ fontSize: '0.74rem', color: '#78350f', fontWeight: 600 }}>
                                      Mobiles Netz: Smart-Audio. Upload erfolgt im WLAN.
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => saveJuniorRecording && saveJuniorRecording(true)}
                                    disabled={juniorIsSaving}
                                    title="Trotzdem sofort über Mobilfunk übertragen"
                                    style={{
                                      background: '#0f172a',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '10px',
                                      padding: '6px 12px',
                                      fontSize: '0.74rem',
                                      fontWeight: 800,
                                      cursor: juniorIsSaving ? 'not-allowed' : 'pointer',
                                      whiteSpace: 'nowrap',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      minHeight: '32px'
                                    }}
                                    className="hover-scale-mini"
                                  >
                                    <Zap size={12} color="#facc15" />
                                    <span>Jetzt mobil senden</span>
                                  </button>
                                </div>
                              )}
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
                              {(() => {
                                const tName = formatTeacherFullName(briefingData?.todayLesson?.teacher_name || briefingData?.todayLesson?.teacher || studentUser?.teacher_name || studentUser?.teacher);
                                return (tName && tName !== 'Lehrkraft') ? `Eingespielt von ${tName}` : 'Hörbeispiele & Play-Alongs aus deinem Unterricht';
                              })()}
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
                    gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(180px, 1fr))', 
                    gap: isMobile ? '10px' : '16px', 
                    width: '100%',
                    minWidth: 0,
                    boxSizing: 'border-box'
                  }}>
                    {/* KPI 1: XP-Punkte */}
                    {xpActive && (
                      <div style={{ 
                        flex: '1 1 0px',
                        minWidth: 0,
                        position: 'relative', overflow: 'visible',
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        color: 'white',
                        borderRadius: '20px',
                        boxShadow: isXpPulsing 
                          ? '0 0 35px 8px rgba(250, 204, 21, 0.85), 0 10px 25px -5px rgba(99, 102, 241, 0.35)'
                          : '0 10px 25px -5px rgba(99, 102, 241, 0.35)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        minHeight: '70px',
                        padding: '16px',
                        boxSizing: 'border-box',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: isXpPulsing ? '2px solid #facc15' : '1px solid rgba(255, 255, 255, 0.15)'
                      }} className={`hover-scale ${isXpPulsing ? 'campus-xp-pulsing' : ''}`}>
                        {floatingDepositAmount !== null && (
                          <div className="campus-xp-floating-badge">
                            +{floatingDepositAmount} XP eingezahlt! ⚡
                          </div>
                        )}
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
                            background: isXpPulsing ? 'rgba(250, 204, 21, 0.4)' : 'rgba(255, 255, 255, 0.2)', 
                            padding: '6px', 
                            borderRadius: '10px',
                            transition: 'all 0.3s ease'
                          }}>
                            <Star size={14} color={isXpPulsing ? '#fef08a' : 'white'} fill={isXpPulsing ? '#fef08a' : 'white'} />
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
                            {displayXp}
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
                          {songStats.assignedCount ? `${songStats.masteredCount}/${songStats.assignedCount}` : `${songStats.masteredCount || 0}`}
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
                        alt={studentUser?.first_name ? `${studentUser.first_name} Avatar` : "Musiker Instrument"} 
                        width={190}
                        height={160}
                        loading="eager"
                        decoding="async"
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          zIndex: 2,
                          transform: 'scale(1.05)',
                          transition: 'transform 0.5s ease',
                          aspectRatio: isMobile ? '16/9' : '190/160'
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

                        {/* TOGGLE RIGHT SIDEBAR (Termine & News) */}
                        <button
                          type="button"
                          onClick={() => handleToggleRightSidebar(!isRightSidebarCollapsed)}
                          style={{
                            marginLeft: 'auto',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#ffffff',
                            color: '#0f172a',
                            padding: '7px 16px',
                            borderRadius: '12px',
                            fontSize: '0.84rem',
                            fontWeight: 850,
                            border: '1.5px solid #e2e8f0',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                          className="hover-scale"
                          title={isRightSidebarCollapsed ? "Termine, Neuigkeiten & Mitteilungen einblenden" : "Seitenleiste ausblenden"}
                          aria-label={isRightSidebarCollapsed ? "Termine und Neuigkeiten einblenden" : "Seitenleiste ausblenden"}
                        >
                          <Calendar size={15} color="#0284c7" />
                          <span>Termine & News</span>
                          {sidebarTotalAlertsCount > 0 && (
                            <span style={{
                              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                              color: '#ffffff',
                              fontSize: '0.68rem',
                              fontWeight: 950,
                              padding: '2px 7px',
                              borderRadius: '100px',
                              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.35)',
                              letterSpacing: '-0.01em'
                            }}>
                              {sidebarTotalAlertsCount}
                            </span>
                          )}
                        </button>
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
                            Bereit für deine Session? Bleib am Ball und leg direkt los! 🎧
                          </p>
                        );
                      })()}

                      {(() => {
                        const nextOcc = (scheduleOccurrences || [])[0] || (schoolYearOccurrences || [])[0];
                        const hasToday = !!briefingData?.todayLesson;
                        const teacherId = hasToday ? briefingData.todayLesson.teacher_id : (nextOcc?.teacher_id || studentUser?.teacher_id);
                        const timeLabel = hasToday ? briefingData.todayLesson.time : (nextOcc?.start_time?.substring(0, 5) || '15:15');
                        const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                        const todayStr = toLocalYYYYMMDD(getSimulatedNow());
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
                        const isCanceled = nextOcc?.status === 'canceled_by_student' || nextOcc?.status === 'cancelled' || nextOcc?.status === 'teacher_ausfall' || nextOcc?.status === 'canceled_by_teacher_ausfall';

                        return (
                          <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            {/* 1. Next Lesson Status & Action Button */}
                            {nextOcc ? (
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAppointmentForDetail(nextOcc);
                                  setShowCancelConfirmStep(false);
                                }}
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '8px', 
                                  background: isCanceled ? '#fee2e2' : 'rgba(52, 168, 83, 0.08)', 
                                  color: isCanceled ? '#dc2626' : '#2e7d32', 
                                  padding: '8px 16px', 
                                  minHeight: '38px', 
                                  boxSizing: 'border-box', 
                                  borderRadius: '12px', 
                                  fontSize: '0.78rem', 
                                  fontWeight: 800, 
                                  border: isCanceled ? '1px dashed rgba(239, 68, 68, 0.5)' : '1px solid rgba(52, 168, 83, 0.2)',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                                  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                                className="hover-scale"
                                title="Nächste Session – Klicke für Details & Aktionen"
                              >
                                {(() => {
                                  const isUnlocked = isStudentAbsenceAllowed || checkIsParentUnlockedGlobal();
                                  if (isCanceled) {
                                    return (
                                      <>
                                        {!isUnlocked ? <Lock size={14} color="#dc2626" /> : <CalendarX size={14} color="#dc2626" />}
                                        <span>Abgesagt: {lessonText} <span style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 700 }}>(Reaktivieren)</span></span>
                                      </>
                                    );
                                  }
                                  return (
                                    <>
                                      <Calendar size={14} color="#34a853" />
                                      <span>Nächste Session: {lessonText}</span>
                                    </>
                                  );
                                })()}
                              </button>
                            ) : (
                              <div style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                background: 'rgba(52, 168, 83, 0.08)', 
                                color: '#34a853', 
                                padding: '8px 16px', 
                                minHeight: '38px', 
                                boxSizing: 'border-box', 
                                borderRadius: '12px', 
                                fontSize: '0.78rem', 
                                fontWeight: 800, 
                                border: '1px solid rgba(52, 168, 83, 0.15)'
                              }}>
                                <Calendar size={14} color="#34a853" />
                                <span>Nächste Session: Demnächst</span>
                              </div>
                            )}

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
                      let isBooksCarriedOver = false;
                      let isSongsCarriedOver = false;
                      let carriedOverWeekLabel = '';

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
                        const wkNum = (weekStr.split('-W')[1] || '').replace(/^0+/, '');
                        const allSnaps = (progressItems || []).filter(item => item.topic_name?.startsWith('Hausaufgabe KW '));
                        let activeSnap = allSnaps.find(item => {
                          const itemW = getItemWeek(item);
                          return item.topic_name === `Hausaufgabe KW ${wkNum}` || item.topic_name === `Hausaufgabe KW ${weekStr.split('-W')[1] || ''}` || itemW === weekStr;
                        });
                        if (!activeSnap && allSnaps.length > 0) {
                          const sortedSnaps = [...allSnaps].sort((a: any, b: any) => {
                            const wA = getItemWeek(a);
                            const wB = getItemWeek(b);
                            if (wA && wB && wA !== wB) return wB.localeCompare(wA);
                            const tA = new Date(a.updated_at || a.created_at || 0).getTime();
                            const tB = new Date(b.updated_at || b.created_at || 0).getTime();
                            return tB - tA;
                          });
                          activeSnap = sortedSnaps.find(s => s.is_current_homework) || sortedSnaps[0];
                        }

                        (progressItems || []).forEach(item => {
                          const isThisWeekSnapshot = activeSnap ? (item.id === activeSnap.id || item.topic_name === activeSnap.topic_name) : false;
                          const isOtherActiveHw = Boolean(item.is_current_homework) && !item.topic_name?.startsWith('Hausaufgabe KW ');
                          const isActive = isThisWeekSnapshot || isOtherActiveHw;
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

                      // 🌉 Smart Audio Bridge: Bridge active practice tracks from latest snapshot or progressItems if current week has none
                      if (audioTracks.length === 0) {
                        const allAudioSnapshots = (progressItems || []).filter((item: any) => item.topic_name?.startsWith('Hausaufgabe KW '));
                        allAudioSnapshots.sort((a: any, b: any) => {
                          const wA = getItemWeek(a);
                          const wB = getItemWeek(b);
                          if (wA && wB && wA !== wB) return wB.localeCompare(wA);
                          const tA = new Date(a.updated_at || a.created_at || 0).getTime();
                          const tB = new Date(b.updated_at || b.created_at || 0).getTime();
                          return tB - tA;
                        });

                        for (const snap of allAudioSnapshots) {
                          if (snap.recording_url && typeof snap.recording_url === 'string' && snap.recording_url.trim()) {
                            audioTracks.push({
                              url: snap.recording_url.trim(),
                              duration: 0,
                              date: snap.updated_at || snap.created_at,
                              label: snap.topic_name || 'Aufnahme #1',
                              author: 'teacher',
                              isCarriedOver: true,
                              idx: audioTracks.length
                            });
                          }
                          const snapNotesStr = snap.homework_notes || snap.teacher_notes;
                          if (snapNotesStr) {
                            try {
                              const parsed = typeof snapNotesStr === 'string' && (snapNotesStr.startsWith('[') || snapNotesStr.startsWith('{')) ? JSON.parse(snapNotesStr) : (Array.isArray(snapNotesStr) ? snapNotesStr : [snapNotesStr]);
                              if (Array.isArray(parsed)) {
                                parsed.forEach((item: any) => {
                                  if (typeof item === 'string' && item.includes('AUDIO:')) {
                                    const cleanStr = item.startsWith('[') ? item.replace(/[\[\]"]/g, '') : item;
                                    const parts = cleanStr.substring(cleanStr.indexOf('AUDIO:') + 6).split('|');
                                    if (!audioTracks.some(t => t.url === parts[0])) {
                                      audioTracks.push({
                                        url: parts[0],
                                        duration: parseFloat(parts[1]) || 0,
                                        date: parts[2],
                                        label: parts[3] || ('Aufnahme #' + (audioTracks.length + 1)),
                                        author: parts[4] || 'teacher',
                                        songTag: parts[7] || undefined,
                                        isCarriedOver: true,
                                        idx: audioTracks.length
                                      });
                                      if (!carriedOverWeekLabel) {
                                        const kwMatch = snap.topic_name?.match(/Hausaufgabe KW\s*(\d+)/i);
                                        if (kwMatch) carriedOverWeekLabel = `KW ${kwMatch[1]}`;
                                      }
                                    }
                                  }
                                });
                              }
                            } catch {}
                          }
                          if (audioTracks.length > 0) break;
                        }

                        // Fallback: check any recording_url or AUDIO: in individual song / lehrwerk progress items
                        if (audioTracks.length === 0) {
                          (progressItems || []).forEach((item: any) => {
                            if (item.recording_url && typeof item.recording_url === 'string' && item.recording_url.trim()) {
                              if (!audioTracks.some(t => t.url === item.recording_url.trim())) {
                                audioTracks.push({
                                  url: item.recording_url.trim(),
                                  duration: 0,
                                  date: item.updated_at || item.created_at,
                                  label: item.topic_name || `Aufnahme #${audioTracks.length + 1}`,
                                  author: 'teacher',
                                  isCarriedOver: true,
                                  idx: audioTracks.length
                                });
                              }
                            }
                            if (item.homework_notes && typeof item.homework_notes === 'string' && item.homework_notes.includes('AUDIO:')) {
                              try {
                                const parsed = JSON.parse(item.homework_notes);
                                if (Array.isArray(parsed)) {
                                  parsed.forEach((n: any) => {
                                    if (typeof n === 'string' && n.includes('AUDIO:')) {
                                      const parts = n.substring(n.indexOf('AUDIO:') + 6).split('|');
                                      if (!audioTracks.some(t => t.url === parts[0])) {
                                        audioTracks.push({
                                          url: parts[0],
                                          duration: parseFloat(parts[1]) || 0,
                                          date: parts[2],
                                          label: parts[3] || `Aufnahme #${audioTracks.length + 1}`,
                                          author: parts[4] || 'teacher',
                                          isCarriedOver: true,
                                          idx: audioTracks.length
                                        });
                                      }
                                    }
                                  });
                                }
                              } catch {}
                            }
                          });
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
                      const isDidacticNote = (n: any) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.startsWith('LATENCY:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('SNAPSHOT_') && !n.startsWith('FEEDBACK:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:') && !n.startsWith('STUDENT_QUESTION:') && !n.startsWith('❓ Frage für den Unterricht:');

                      let generalNotesList: string[] = currentWeekNotes.filter(isDidacticNote).map(cleanGeneralNote).filter(Boolean);

                      if (generalNotesList.length === 0) {
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
                          const kwMatch = latestPast.topic_name?.match(/Hausaufgabe KW\s*(\d+)/i);
                          if (!carriedOverWeekLabel && kwMatch) carriedOverWeekLabel = `KW ${kwMatch[1]}`;
                          try {
                            const parsed = typeof latestPast.homework_notes === 'string' ? JSON.parse(latestPast.homework_notes) : latestPast.homework_notes;
                            if (Array.isArray(parsed)) {
                              const pastNotes = parsed.filter(isDidacticNote).map(cleanGeneralNote).filter(Boolean);
                              if (pastNotes.length > 0) {
                                generalNotesList = pastNotes;
                                isPastNoteCarriedOver = true;
                              }
                            } else if (typeof parsed === 'string') {
                              const cleanP = cleanGeneralNote(parsed);
                              if (cleanP) {
                                generalNotesList = [cleanP];
                                isPastNoteCarriedOver = true;
                              }
                            }
                          } catch {}
                        }
                      }
                      const generalNote = generalNotesList[0] || '';

                      const isAudioCarriedOver = audioTracks.some(t => t.isCarriedOver);
                      let isCarriedOverPlan = isAudioCarriedOver || isPastNoteCarriedOver;

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

                      // 1. Memoized Active Homework & Books Collation (0.1% Goldstandard)
                      const {
                        activeLehrwerkeMap,
                        otherActiveHWItems,
                        isBooksCarriedOver: memoBooksCarriedOver,
                        isSongsCarriedOver: memoSongsCarriedOver,
                        carriedOverWeekLabel: memoCarriedOverWeekLabel
                      } = memoizedHomeworkSummary;
                      if (memoBooksCarriedOver) isBooksCarriedOver = true;
                      if (memoSongsCarriedOver) isSongsCarriedOver = true;
                      if (memoCarriedOverWeekLabel && !carriedOverWeekLabel) carriedOverWeekLabel = memoCarriedOverWeekLabel;

                      isCarriedOverPlan = isAudioCarriedOver || isPastNoteCarriedOver || isBooksCarriedOver || isSongsCarriedOver;

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

                      const hasActiveHomework = formattedActiveBooks.length > 0 || otherActiveHWItems.length > 0 || currentWeekNotes.length > 0 || !!generalNote || !!studentQuestionText;

                      return (
                        <div style={{ 
                          background: '#ffffff', 
                          borderRadius: '24px', 
                          padding: isMobile ? '18px' : '18px 20px', 
                          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.03)',
                          border: '1px solid rgba(0, 0, 0, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <div style={{ 
                                  background: 'rgba(22, 163, 74, 0.12)', 
                                  color: '#16a34a', 
                                  width: '34px', 
                                  height: '34px', 
                                  borderRadius: '11px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <BookOpen size={17} strokeWidth={2.2} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                  <h4 style={{ margin: 0, fontSize: '1.0rem', fontWeight: 950, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.2 }}>
                                    Hausaufgaben
                                  </h4>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: isMusicStandMode ? '0.78rem' : '0.74rem',
                                    fontWeight: 800,
                                    color: '#16a34a',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    <Music size={12} color="#16a34a" strokeWidth={2.4} />
                                    <span>Dein Wochen-Fahrplan</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Audio Indicator Pill beside Title */}
                              {audioTracks.length > 0 ? (
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => {
                                    if (handleOpenHomeworkBookWithView) {
                                      handleOpenHomeworkBookWithView('document', 'recordings');
                                    } else {
                                      handleTabChangeLocal('homework_book');
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      if (handleOpenHomeworkBookWithView) {
                                        handleOpenHomeworkBookWithView('document', 'recordings');
                                      } else {
                                        handleTabChangeLocal('homework_book');
                                      }
                                    }
                                  }}
                                  style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '100px',
                                    padding: '4px 10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                  }}
                                  className="hover-scale"
                                  title="Unterrichtsaufnahmen im Aufgabenheft anhören"
                                  aria-label="Unterrichtsaufnahmen im Aufgabenheft anhören"
                                >
                                  <Headphones size={12} color="#475569" strokeWidth={2.2} />
                                  <span style={{ fontSize: '0.72rem', fontWeight: 850, color: '#334155' }}>
                                    {audioTracks.length === 1 ? '1 Aufnahme' : `${audioTracks.length} Aufnahmen`}
                                  </span>
                                </div>
                              ) : (
                                <span style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.62rem', fontWeight: 850, padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap', flexShrink: 0 }}>
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
                                            background: `linear-gradient(135deg, ${bookGradient.from}, ${bookGradient.to})`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: bookGradient.text,
                                            boxShadow: '0 1px 3px rgba(225, 29, 72, 0.12)',
                                            flexShrink: 0
                                          }}>
                                            <BookOpen size={14} strokeWidth={2.4} />
                                          </div>
                                          <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                            {item.title}
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', flexShrink: 0 }}>
                                          <span style={{
                                            fontSize: '0.80rem',
                                            fontWeight: 850,
                                            color: '#15803d',
                                            background: '#dcfce7',
                                            padding: '3px 10px',
                                            borderRadius: '99px',
                                            border: '1px solid #bbf7d0',
                                            flexShrink: 0
                                          }}>
                                            {item.formattedPages || (item.pageNums?.length === 1 ? `S. ${item.pageNums[0]}` : `S. ${item.pageNums.join(', ')}`)}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {otherActiveHWItems.map((item, idx) => {
                                    const songTitle = cleanTitle(item.title || item.topic_name);
                                    const songColor = getSongColor(songTitle);
                                    return (
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
                                          background: `linear-gradient(135deg, ${songColor.from}, ${songColor.to})`,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: songColor.text || '#0f172a',
                                          boxShadow: `0 2px 6px ${songColor.shadowFrom || 'rgba(0,0,0,0.06)'}`,
                                          flexShrink: 0
                                        }}>
                                          <Music size={14} strokeWidth={2.4} />
                                        </div>
                                        <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {songTitle}
                                        </span>
                                      </div>
                                    );
                                  })}

                                  {/* Zusätzliche Bemerkung / Notizen (Aufbau wie Wochen-Fahrplan im Aufgaben Board) */}
                                  {generalNotesList && generalNotesList.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      {generalNotesList.map((noteItem: string, nIdx: number) => (
                                        <div key={`teen-gn-${nIdx}`} style={{
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
                                            background: '#dcfce7',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#15803d',
                                            flexShrink: 0
                                          }}>
                                            <FileText size={14} strokeWidth={2.4} />
                                          </div>
                                          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {noteItem}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Frage des Schülers für die Stunde (Gelber Text & Gelbe Kennzeichnung) */}
                                  {(() => {
                                    const displayedTeenQuestion = activeStudentQuestion || studentQuestionText;
                                    if (!displayedTeenQuestion) return null;
                                    return (
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontSize: '0.88rem',
                                        padding: '8px 12px',
                                        borderRadius: '12px',
                                        background: '#fffdf0',
                                        border: '1px solid #fde047',
                                        boxShadow: '0 1px 3px rgba(250, 204, 21, 0.15)'
                                      }}>
                                        <HelpCircle size={14} style={{ color: '#ca8a04', flexShrink: 0 }} strokeWidth={2.5} />
                                        <strong style={{ color: '#ca8a04', fontWeight: 850, flexShrink: 0 }}>Deine Frage:</strong>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#713f12', fontWeight: 700 }}>
                                          „{displayedTeenQuestion}“
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </>
                              ) : (
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                  Keine offenen Aufgaben für diese Woche erfasst
                                </div>
                              )}
                            </div>
                            {/* Ausgelagertes Aufnahmen-Pill-Button */}
                            {audioTracks && audioTracks.length > 0 && (
                              <div style={{ marginTop: '6px' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveRecordingTrack(audioTracks[0]);
                                    setRecordingsModalTracks(audioTracks);
                                    setShowRecordingsModal(true);
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '5px 12px',
                                    borderRadius: '100px',
                                    background: '#f0fdf4',
                                    border: '1.5px solid #bbf7d0',
                                    color: '#15803d',
                                    fontSize: '0.74rem',
                                    fontWeight: 850,
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 3px rgba(22, 163, 74, 0.08)',
                                    transition: 'all 0.15s ease'
                                  }}
                                  className="hover-scale"
                                  title="Aufnahmen deiner Lehrkraft öffnen"
                                >
                                  <Headphones size={13} color="currentColor" />
                                  <span>{audioTracks.length === 1 ? '1 Aufnahme anhören' : `${audioTracks.length} Aufnahmen anhören`}</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* 2-Button Action Footer */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleTabChangeLocal('homework_book')}
                              style={{
                                padding: '10px 14px',
                                borderRadius: '14px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                                color: '#ffffff',
                                fontSize: '0.86rem',
                                fontWeight: 900,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s',
                                minHeight: '44px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.28)'
                              }}
                              className="hover-scale"
                              title="Alle Hausaufgaben ansehen"
                            >
                              <BookOpen size={15} color="currentColor" style={{ flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Aufgaben ansehen →</span>
                            </button>

                            {(() => {
                              const displayedTeenQuestion = activeStudentQuestion || studentQuestionText;
                              return (
                                <button
                                  type="button"
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openQuestionModal();
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      openQuestionModal();
                                    }
                                  }}
                                  style={{
                                    padding: '10px 14px',
                                    borderRadius: '14px',
                                    border: displayedTeenQuestion ? 'none' : '1.5px solid #e2e8f0',
                                    background: displayedTeenQuestion ? '#facc15' : '#f8fafc',
                                    color: displayedTeenQuestion ? '#0f172a' : '#475569',
                                    fontSize: '0.86rem',
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s',
                                    minHeight: '44px',
                                    whiteSpace: 'nowrap',
                                    boxShadow: displayedTeenQuestion ? '0 4px 14px rgba(250, 204, 21, 0.35)' : 'none'
                                  }}
                                  className="hover-scale"
                                  title={displayedTeenQuestion ? "Hinterlegte Schülerfrage bearbeiten" : "Frage für die nächste Stunde stellen"}
                                  aria-label={displayedTeenQuestion ? "Hinterlegte Schülerfrage bearbeiten" : "Frage für die nächste Stunde stellen"}
                                >
                                  <HelpCircle size={15} color="currentColor" style={{ flexShrink: 0 }} />
                                  <span>{displayedTeenQuestion ? 'Frage aktiv' : 'Frage?'}</span>
                                </button>
                              );
                            })()}
                          </div>
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

                      const todayStr = toLocalYYYYMMDD(new Date());
                      const todayLogs = (fokusLogs || []).filter((log: any) => log.created_at && toLocalYYYYMMDD(new Date(log.created_at)) === todayStr);
                      const dbTodaySecs = todayLogs.reduce((sum: number, log: any) => sum + (log.duration_seconds || ((log.duration_minutes || 0) * 60)), 0);
                      const liveTodaySecs = sessionActive ? secondsElapsed : 0;
                      const totalTodaySecs = dbTodaySecs + liveTodaySecs;
                      const todayMins = Math.floor(totalTodaySecs / 60);
                      const isGoalAchieved = totalTodaySecs >= (requiredMins * 60);
                      const progressPercent = Math.min(100, Math.round((totalTodaySecs / (requiredMins * 60)) * 100));

                      return (
                        <div style={{ 
                          background: '#ffffff', 
                          borderRadius: '24px', 
                          padding: isMobile ? '18px' : '18px 20px', 
                          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.03)',
                          border: isGoalAchieved ? '1px solid rgba(52, 168, 83, 0.25)' : '1px solid rgba(0, 0, 0, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* Header: Icon + Title + Status Pill */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ 
                                  background: isGoalAchieved ? 'rgba(52, 168, 83, 0.12)' : 'rgba(124, 58, 237, 0.12)', 
                                  color: isGoalAchieved ? '#16a34a' : '#7c3aed', 
                                  width: '34px', 
                                  height: '34px', 
                                  borderRadius: '11px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  {isGoalAchieved ? <Check size={18} /> : <Timer size={17} />}
                                </div>
                                <h4 style={{ margin: 0, fontSize: isMusicStandMode ? '1.18rem' : '1.05rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                  Tägliche Übezeit
                                </h4>
                              </div>

                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: isGoalAchieved ? '#dcfce7' : '#f8fafc',
                                color: isGoalAchieved ? '#15803d' : '#475569',
                                border: isGoalAchieved ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                                padding: '4px 10px',
                                borderRadius: '100px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                letterSpacing: '0.02em',
                                flexShrink: 0
                              }}>
                                <span>{isGoalAchieved ? 'Erledigt ✨' : `Ziel: ${requiredMins} Min.`}</span>
                              </div>
                            </div>

                            {/* 1% Apple-Fitness-Style Radial Wow-Gauge (126px) - Zentriert, ohne grauen Kasten */}
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '12px',
                              padding: '12px 0 6px 0',
                              width: '100%'
                            }}>
                              {renderCircularGauge(progressPercent, isGoalAchieved, 126, 12, todayMins, requiredMins)}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', textAlign: 'center', width: '100%' }}>
                                <div style={{ fontSize: '1.10rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.01em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                  {isGoalAchieved ? 'Tagesziel erreicht' : 'Tagesfokus'}
                                </div>
                                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: isGoalAchieved ? '#15803d' : '#64748b', lineHeight: 1.35 }}>
                                  {isGoalAchieved ? 'Serie für heute gesichert' : `${Math.max(1, requiredMins - todayMins)} Min. bis zum Streak-Schutz`}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* CTA Button */}
                          <button 
                            type="button"
                            onClick={() => setActiveTab('practice_board')}
                            style={{ 
                              background: isGoalAchieved 
                                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                                : 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', 
                              color: '#ffffff', 
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
                              boxShadow: isGoalAchieved 
                                ? '0 8px 20px rgba(16, 185, 129, 0.25)' 
                                : '0 8px 20px rgba(79, 70, 229, 0.28)', 
                              transition: 'all 0.2s', 
                              width: '100%' 
                            }}
                            className="hover-scale"
                          >
                            {isGoalAchieved ? <Check size={16} /> : <Play size={15} fill="currentColor" color="currentColor" />}
                            <span>{isGoalAchieved ? 'Tagesziel erreicht • Session starten' : `${requiredMins} Min. Übe-Timer starten`}</span>
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
                      const currentTier = isTier3Unlocked ? 3 : isTier2Unlocked ? 2 : isTier1Unlocked ? 1 : 0;

                      const weekMetrics = getDeterministicWeekMetrics();
                      const availableShields = weekMetrics.availableShields;
                      const weekShieldedCount = weekMetrics.weekShieldedCount;

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
                          padding: isMobile ? '18px' : '18px 20px', 
                          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.03)',
                          border: '1px solid rgba(0, 0, 0, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Header: Title + Rules Button + Dynamic Tier Badge */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ 
                                  background: isTier3Unlocked ? 'rgba(239, 68, 68, 0.12)' : 'rgba(249, 115, 22, 0.12)', 
                                  color: isTier3Unlocked ? '#dc2626' : '#ea580c', 
                                  width: '34px', 
                                  height: '34px', 
                                  borderRadius: '11px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <Flame size={17} strokeWidth={2.2} fill={streak > 0 ? "currentColor" : "none"} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <h4 style={{ margin: 0, fontSize: isMusicStandMode ? '1.18rem' : '1.05rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    Flammen-Pfad
                                  </h4>
                                  <button 
                                    onClick={() => setShowRulesModal(true)}
                                    style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8', transition: 'color 0.15s' }}
                                    onMouseOver={e => e.currentTarget.style.color = '#64748b'}
                                    onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                                    title="Spielregeln anzeigen"
                                    aria-label="Spielregeln anzeigen"
                                  >
                                    <HelpCircle size={15} />
                                  </button>
                                </div>
                              </div>
                              <span style={{ 
                                background: streak === 0 
                                  ? '#fef3c7' 
                                  : 'linear-gradient(135deg, #ff4b4b 0%, #dc2626 100%)', 
                                color: streak === 0 ? '#92400e' : '#ffffff', 
                                fontSize: '0.72rem', 
                                fontWeight: 950, 
                                padding: '3px 10px', 
                                borderRadius: '100px',
                                border: streak === 0 ? '1px solid #fde68a' : '1px solid rgba(255, 255, 255, 0.3)',
                                boxShadow: streak === 0 ? 'none' : '0 3px 10px rgba(220, 38, 38, 0.22)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                {streak === 0 ? (
                                  <>Bereit zum Start ✨</>
                                ) : (
                                  <>{streak} {streak === 1 ? 'Tag' : 'Tage'} • Stufe {currentTier} 🔥</>
                                )}
                              </span>
                            </div>

                            {/* FERIEN-FREEZE ODER SCHLANKE INLINE-SCHUTZSCHILDE */}
                            {isTodayHoliday ? (
                              <div style={{
                                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                                border: '1px solid #a7f3d0',
                                borderRadius: '12px',
                                padding: '6px 10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '6px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Palmtree size={14} color="#059669" />
                                  <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#065f46' }}>
                                    Ferienpause: Flamme gesichert
                                  </span>
                                </div>
                                <span style={{
                                  fontSize: '0.66rem',
                                  fontWeight: 900,
                                  background: '#059669',
                                  color: '#ffffff',
                                  padding: '2px 8px',
                                  borderRadius: '100px'
                                }}>
                                  ✨ 2× XP-Booster
                                </span>
                              </div>
                            ) : (
                              <div style={{
                                background: 'linear-gradient(135deg, #f8f7ff 0%, #f1f0fb 100%)',
                                borderRadius: '12px',
                                padding: '6px 10px',
                                border: '1px solid #e0e7ff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Shield size={13} color="#7c3aed" fill="#7c3aed" />
                                  <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#4338ca' }}>
                                    Schutzschilde:
                                  </span>
                                  <span style={{ fontSize: '0.74rem', fontWeight: 950, color: availableShields > 0 ? '#6d28d9' : '#b91c1c' }}>
                                    {availableShields}/3 bereit
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                  {[1, 2, 3].map((shieldNum) => {
                                    const isConsumed = shieldNum <= weekShieldedCount;
                                    const isShieldActive = shieldNum > weekShieldedCount;
                                    const shieldedDay = weekMetrics.weekDays.find(d => d.shieldNumber === shieldNum);
                                    const dayLabel = shieldedDay ? shieldedDay.dayName : '';

                                    return (
                                      <span key={`teen-shield-${shieldNum}`} style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        padding: '2px 7px',
                                        borderRadius: '6px',
                                        background: isConsumed ? '#f1f5f9' : '#ffffff',
                                        border: isConsumed ? '1px solid #cbd5e1' : '1px solid #8b5cf6',
                                        boxShadow: isShieldActive ? '0 1px 4px rgba(124, 58, 237, 0.12)' : 'none',
                                        fontSize: '0.66rem',
                                        fontWeight: 900,
                                        color: isConsumed ? '#64748b' : '#6d28d9',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        <Shield size={10} color={isConsumed ? '#64748b' : '#7c3aed'} fill={isConsumed ? '#cbd5e1' : '#7c3aed'} />
                                        <span>{isConsumed ? `${dayLabel} ✓` : 'Bereit'}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* CONDENSED ACTIVE TIER CARD & MILESTONE STEPPER */}
                            {(() => {
                              const isMeister = isTier3Unlocked;
                              const isPower = !isMeister && isTier2Unlocked;
                              const isStart = !isMeister && !isPower;

                              const tierTitle = isMeister ? 'Stufe 3: Meister-Feuer' : isPower ? 'Stufe 2: Power-Flamme' : 'Stufe 1: Start-Funke';
                              const tierIcon = isMeister 
                                ? <Crown size={16} color="#dc2626" fill="#ef4444" /> 
                                : isPower 
                                ? <Zap size={16} color="#ea580c" fill="#f97316" /> 
                                : <Flame size={16} color={isTier1Unlocked ? '#d97706' : '#94a3b8'} fill={isTier1Unlocked ? '#f59e0b' : 'none'} />;
                              const tierIconBg = isMeister ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' : isPower ? 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)' : isTier1Unlocked ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : '#e2e8f0';
                              const tierBorder = isMeister ? '1.5px solid rgba(239, 68, 68, 0.45)' : isPower ? '1.5px solid rgba(249, 115, 22, 0.45)' : isTier1Unlocked ? '1.5px solid rgba(245, 158, 11, 0.45)' : '1px solid rgba(0,0,0,0.06)';
                              const tierShadow = isMeister ? '0 3px 12px rgba(239, 68, 68, 0.15)' : isPower ? '0 3px 12px rgba(249, 115, 22, 0.15)' : isTier1Unlocked ? '0 3px 12px rgba(245, 158, 11, 0.12)' : 'none';
                              const tierRequirement = isMeister ? `9+ Tage • ${heldenMins} Min. täglich` : isPower ? `4–8 Tage • ${mittlereMins} Min. täglich` : `1–3 Tage • ${kleineMins} Min. täglich`;
                              const tierStatus = isMeister 
                                ? '👑 Meister-Level aktiv! Volle Power!' 
                                : isPower 
                                ? `⚡ Aktiv • Noch ${Math.max(1, 9 - streak)} ${Math.max(1, 9 - streak) === 1 ? 'Tag' : 'Tage'} bis Meister-Feuer` 
                                : (isTier1Unlocked 
                                  ? `✨ Aktiv • Noch ${Math.max(1, 4 - streak)} ${Math.max(1, 4 - streak) === 1 ? 'Tag' : 'Tage'} bis Power-Flamme` 
                                  : 'Bereit für deinen ersten Funken');

                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <div 
                                    onClick={() => setShowRulesModal(true)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowRulesModal(true); }}
                                    style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '12px', 
                                      background: '#ffffff', 
                                      padding: '10px 14px', 
                                      borderRadius: '14px', 
                                      border: tierBorder, 
                                      boxShadow: tierShadow, 
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease'
                                    }}
                                    className="hover-scale"
                                    title="Klicke hier, um alle Stufen und Regeln einzusehen"
                                  >
                                    <div style={{ 
                                      width: '32px', 
                                      height: '32px', 
                                      borderRadius: '50%', 
                                      background: tierIconBg, 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      flexShrink: 0 
                                    }}>
                                      {tierIcon}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: isMusicStandMode ? '0.96rem' : '0.86rem', fontWeight: 950, color: '#0f172a' }}>
                                          {tierTitle}
                                        </span>
                                        <span style={{ fontSize: isMusicStandMode ? '0.78rem' : '0.72rem', fontWeight: 850, color: '#64748b', flexShrink: 0 }}>
                                          {tierRequirement}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: isMusicStandMode ? '0.78rem' : '0.72rem', color: isMeister ? '#dc2626' : isPower ? '#ea580c' : isTier1Unlocked ? '#d97706' : '#64748b', fontWeight: 800, marginTop: '2px' }}>
                                        {tierStatus}
                                      </div>
                                    </div>
                                  </div>

                                  {/* 3-Step Milestone Stepper as unified Segment Track */}
                                  <div style={{
                                    display: 'flex',
                                    gap: '4px',
                                    background: '#f1f5f9',
                                    padding: '4px',
                                    borderRadius: '14px',
                                    border: '1px solid #e2e8f0'
                                  }}>
                                    {[
                                      { 
                                        label: '1–3 T', 
                                        name: 'Funke', 
                                        active: streak >= 1, 
                                        done: streak >= 4,
                                        activeBg: '#facc15',
                                        activeBorder: '#eab308',
                                        activeColor: '#0f172a',
                                        activeShadow: '0 2px 8px rgba(250, 204, 21, 0.35)',
                                        doneBg: '#fef08a',
                                        doneBorder: '#facc15',
                                        doneColor: '#713f12'
                                      },
                                      { 
                                        label: '4–8 T', 
                                        name: 'Power', 
                                        active: streak >= 4, 
                                        done: streak >= 9,
                                        activeBg: '#f97316',
                                        activeBorder: '#ea580c',
                                        activeColor: '#ffffff',
                                        activeShadow: '0 2px 8px rgba(249, 115, 22, 0.35)',
                                        doneBg: '#ffedd5',
                                        doneBorder: '#f97316',
                                        doneColor: '#9a3412'
                                      },
                                      { 
                                        label: '9+ T', 
                                        name: 'Meister', 
                                        active: streak >= 9, 
                                        done: streak >= 9,
                                        activeBg: '#ef4444',
                                        activeBorder: '#dc2626',
                                        activeColor: '#ffffff',
                                        activeShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
                                        doneBg: '#fee2e2',
                                        doneBorder: '#ef4444',
                                        doneColor: '#991b1b'
                                      }
                                    ].map((step, idx) => {
                                      const isCurrent = step.active && !step.done;
                                      const bg = step.done ? step.doneBg : step.active ? step.activeBg : 'transparent';
                                      const border = step.done ? `1px solid ${step.doneBorder}` : step.active ? `1px solid ${step.activeBorder}` : '1px solid transparent';
                                      const textColor = step.done ? step.doneColor : step.active ? step.activeColor : '#64748b';
                                      const shadow = isCurrent ? step.activeShadow : 'none';

                                      return (
                                        <div 
                                          key={idx}
                                          onClick={() => setShowRulesModal(true)}
                                          role="button"
                                          tabIndex={0}
                                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowRulesModal(true); }}
                                          style={{
                                            flex: 1,
                                            padding: '8px 4px',
                                            borderRadius: '10px',
                                            background: bg,
                                            border: border,
                                            boxShadow: shadow,
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                          }}
                                          title={`${step.name} (${step.label}) – Klicke für Details`}
                                        >
                                          <div style={{ fontSize: '0.64rem', fontWeight: 900, color: textColor, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                            {step.done ? <span>✓ {step.name}</span> : <span>{step.name}</span>}
                                          </div>
                                          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: textColor, opacity: step.active ? 1 : 0.75, marginTop: '1px' }}>
                                            {step.label}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Gamification-Sog Countdown (Pure White Background, No Gray Box, Monochrome Icon) */}
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    padding: '6px 0 0 0',
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    color: streak >= 9 ? '#dc2626' : streak >= 4 ? '#ea580c' : streak >= 1 ? '#b45309' : '#64748b',
                                    textAlign: 'center'
                                  }}>
                                    <Flame size={14} color="currentColor" />
                                    {streak >= 9 ? (
                                      <span>Meister-Stufe aktiv (9+ T)! Maximaler Streak.</span>
                                    ) : streak >= 4 ? (
                                      <span>Noch {9 - streak} {9 - streak === 1 ? 'Tag' : 'Tage'} bis zur Meister-Stufe (9+ T)</span>
                                    ) : streak >= 1 ? (
                                      <span>Noch {4 - streak} {4 - streak === 1 ? 'Tag' : 'Tage'} bis zur Power-Stufe (4–8 T)</span>
                                    ) : (
                                      <span>Erste Session starten für den ersten Funken (1–3 T)</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
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
                    gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(180px, 1fr))', 
                    gap: isMobile ? '10px' : '16px', 
                    width: '100%',
                    minWidth: 0
                  }}>
                    {/* KPI 1: XP (Vibrant Indigo-Blue) */}
                    {xpActive && (
                      <div style={{ 
                        flex: '1 1 0px',
                        minWidth: 0,
                        position: 'relative', overflow: 'visible',
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        color: 'white',
                        borderRadius: '20px',
                        boxShadow: isXpPulsing 
                          ? '0 0 35px 8px rgba(250, 204, 21, 0.85), 0 10px 25px -5px rgba(99, 102, 241, 0.35)'
                          : '0 10px 25px -5px rgba(99, 102, 241, 0.35)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        minHeight: '70px',
                        padding: '16px',
                        boxSizing: 'border-box',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: isXpPulsing ? '2px solid #facc15' : '1px solid rgba(255, 255, 255, 0.15)'
                      }} className={`hover-scale ${isXpPulsing ? 'campus-xp-pulsing' : ''}`}>
                        {floatingDepositAmount !== null && (
                          <div className="campus-xp-floating-badge">
                            +{floatingDepositAmount} XP eingezahlt! 🏆
                          </div>
                        )}
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
                            background: isXpPulsing ? 'rgba(250, 204, 21, 0.4)' : 'rgba(255, 255, 255, 0.2)', 
                            padding: '6px', 
                            borderRadius: '10px',
                            transition: 'all 0.3s ease'
                          }}>
                            <Star size={14} color={isXpPulsing ? '#fef08a' : 'white'} fill={isXpPulsing ? '#fef08a' : 'white'} />
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
                            {displayXp}
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
                          {songStats.assignedCount ? `${songStats.masteredCount}/${songStats.assignedCount}` : `${songStats.masteredCount || 0}`}
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
                        alt={studentUser?.first_name ? `${studentUser.first_name} Avatar` : "Musiker Instrument"} 
                        width={190}
                        height={160}
                        loading="eager"
                        decoding="async"
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          zIndex: 2,
                          transform: 'scale(1.05)',
                          transition: 'transform 0.5s ease',
                          aspectRatio: isMobile ? '16/9' : '190/160'
                        }} 
                        className="hover-zoom"
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, flex: 1, zIndex: 2, padding: isMobile ? '16px 18px' : '24px 32px', boxSizing: 'border-box', maxWidth: '100%' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '100px',
                          padding: '3px 12px 3px 6px',
                          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)'
                        }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#f1f5f9',
                            padding: '3px 8px',
                            borderRadius: '100px'
                          }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34a853', animation: 'pulse 2s infinite' }} />
                            <span style={{ 
                              fontSize: '0.66rem', 
                              fontWeight: 800, 
                              color: '#334155', 
                              letterSpacing: '0.04em'
                            }}>
                              {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} UHR
                            </span>
                          </div>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            color: '#4f46e5',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase'
                          }}>
                            STUDIO MODE • PRO
                          </span>
                        </div>

                        {/* Offline- & Keller-Bereit Status Badge */}
                        {/* 1% Goldstandard Offline-Pill: Nur anzeigen wenn TATSÄCHLICH offline oder Signalstau */}
                        {(((typeof navigator !== 'undefined' && !navigator.onLine) || isOfflineScheduleActive || carrierGhostingDetected)) && (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: carrierGhostingDetected
                              ? '#fef3c7'
                              : (((typeof navigator !== 'undefined' && !navigator.onLine) || isOfflineScheduleActive) 
                                ? '#fef9c3' 
                                : 'rgba(52, 168, 83, 0.08)'),
                            border: carrierGhostingDetected
                              ? '1px solid #fde68a'
                              : (((typeof navigator !== 'undefined' && !navigator.onLine) || isOfflineScheduleActive) 
                                ? '1px solid #fef08a' 
                                : '1px solid rgba(52, 168, 83, 0.2)'),
                            borderRadius: '100px',
                            padding: '4px 12px',
                            color: carrierGhostingDetected
                              ? '#92400e'
                              : (((typeof navigator !== 'undefined' && !navigator.onLine) || isOfflineScheduleActive) 
                                ? '#854d0e' 
                                : '#15803d'),
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                          }}>
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: carrierGhostingDetected ? '#f59e0b' : '#eab308'
                            }} />
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 900,
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase'
                            }}>
                              {carrierGhostingDetected 
                                ? '📶 5G-Signalstau • Offline-Plan' 
                                : '☁️ Offline-Modus'}
                            </span>
                          </div>
                        )}

                        {onRefreshConnection && (carrierGhostingDetected || isOfflineScheduleActive) && (
                          <button
                            type="button"
                            onClick={onRefreshConnection}
                            title="Mobilfunk-Verbindung erneut prüfen"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '100px',
                              padding: '4px 10px',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              color: '#334155',
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                              touchAction: 'manipulation'
                            }}
                          >
                            <RefreshCw size={11} color="#64748b" />
                            <span>Verbindung prüfen</span>
                          </button>
                        )}



                        {/* TOGGLE RIGHT SIDEBAR (Termine & News) */}
                        <button
                          type="button"
                          onClick={() => handleToggleRightSidebar(!isRightSidebarCollapsed)}
                          style={{
                            marginLeft: 'auto',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#ffffff',
                            color: '#0f172a',
                            padding: '7px 16px',
                            borderRadius: '12px',
                            fontSize: '0.84rem',
                            fontWeight: 850,
                            border: '1.5px solid #e2e8f0',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                          className="hover-scale"
                          title={isRightSidebarCollapsed ? "Termine, Neuigkeiten & Mitteilungen einblenden" : "Seitenleiste ausblenden"}
                          aria-label={isRightSidebarCollapsed ? "Termine und Neuigkeiten einblenden" : "Seitenleiste ausblenden"}
                        >
                          <Calendar size={15} color="currentColor" />
                          <span>Termine & News</span>
                          {sidebarTotalAlertsCount > 0 && (
                            <span style={{
                              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                              color: '#ffffff',
                              fontSize: '0.68rem',
                              fontWeight: 950,
                              padding: '2px 7px',
                              borderRadius: '100px',
                              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.35)',
                              letterSpacing: '-0.01em'
                            }}>
                              {sidebarTotalAlertsCount}
                            </span>
                          )}
                        </button>
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
                        Willkommen zurück{studentUser?.first_name ? `, ${studentUser.first_name}` : ''}!
                      </h3>
                      
                      <p style={{ 
                        margin: '8px 0 0 0', 
                        fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', 
                        color: '#475569', 
                        fontWeight: 650, 
                        lineHeight: 1.45, 
                        maxWidth: '95%' 
                      }}>
                        Zeit für dein Repertoire und deinen musikalischen Fokus.
                      </p>

                      {(() => {
                        const nextOcc = (scheduleOccurrences || [])[0] || (schoolYearOccurrences || [])[0];
                        const hasToday = !!briefingData?.todayLesson;
                        const teacherId = hasToday ? briefingData.todayLesson.teacher_id : (nextOcc?.teacher_id || studentUser?.teacher_id);
                        const timeLabel = hasToday ? briefingData.todayLesson.time : (nextOcc?.start_time?.substring(0, 5) || '15:15');
                        const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                        const todayStr = toLocalYYYYMMDD(getSimulatedNow());
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
                        const isCanceled = nextOcc?.status === 'canceled_by_student' || nextOcc?.status === 'cancelled' || nextOcc?.status === 'teacher_ausfall' || nextOcc?.status === 'canceled_by_teacher_ausfall';

                        return (
                          <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            {/* 1. Next Lesson Status & Action Button */}
                            {nextOcc ? (
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAppointmentForDetail(nextOcc);
                                  setShowCancelConfirmStep(false);
                                }}
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '8px', 
                                  background: isCanceled ? '#fee2e2' : 'linear-gradient(135deg, rgba(52, 168, 83, 0.08) 0%, rgba(52, 168, 83, 0.02) 100%)', 
                                  color: isCanceled ? '#dc2626' : '#2e7d32', 
                                  padding: '8px 16px', 
                                  minHeight: '38px', 
                                  boxSizing: 'border-box', 
                                  borderRadius: '12px', 
                                  fontSize: '0.78rem', 
                                  fontWeight: 800, 
                                  border: isCanceled ? '1px dashed rgba(239, 68, 68, 0.5)' : '1px solid rgba(52, 168, 83, 0.2)',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                                  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                                className="hover-scale"
                                title="Nächster Unterricht – Klicke für Details & Aktionen"
                              >
                                {(() => {
                                  const isUnlocked = isStudentAbsenceAllowed || checkIsParentUnlockedGlobal();
                                  if (isCanceled) {
                                    return (
                                      <>
                                        {!isUnlocked ? <Lock size={14} color="currentColor" /> : <CalendarX size={14} color="currentColor" />}
                                        <span>Abgesagt: {lessonText} <span style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 700 }}>(Reaktivieren)</span></span>
                                      </>
                                    );
                                  }
                                  return (
                                    <>
                                      <Calendar size={14} color="currentColor" />
                                      <span>Nächster Unterricht: {lessonText}</span>
                                    </>
                                  );
                                })()}
                              </button>
                            ) : (
                              <div style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.08) 0%, rgba(52, 168, 83, 0.02) 100%)', 
                                color: '#34a853', 
                                padding: '8px 16px', 
                                minHeight: '38px', 
                                boxSizing: 'border-box', 
                                borderRadius: '12px', 
                                fontSize: '0.78rem', 
                                fontWeight: 800, 
                                border: '1px solid rgba(52, 168, 83, 0.18)'
                              }}>
                                <Calendar size={14} color="currentColor" />
                                <span>Nächster Unterricht: Demnächst</span>
                              </div>
                            )}

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
                                  color="currentColor" 
                                  fill="none" 
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
                              title="Praxis-Toolbox: Metronom & Stimmgerät öffnen"
                            >
                              <Sliders size={14} color="currentColor" />
                              <span>Praxis-Toolbox</span>
                            </button>

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
                      let isBooksCarriedOver = false;
                      let isSongsCarriedOver = false;
                      let carriedOverWeekLabel = '';

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
                        const wkNum = (weekStr.split('-W')[1] || '').replace(/^0+/, '');
                        const allSnaps = (progressItems || []).filter(item => item.topic_name?.startsWith('Hausaufgabe KW '));
                        let activeSnap = allSnaps.find(item => {
                          const itemW = getItemWeek(item);
                          return item.topic_name === `Hausaufgabe KW ${wkNum}` || item.topic_name === `Hausaufgabe KW ${weekStr.split('-W')[1] || ''}` || itemW === weekStr;
                        });
                        if (!activeSnap && allSnaps.length > 0) {
                          const sortedSnaps = [...allSnaps].sort((a: any, b: any) => {
                            const wA = getItemWeek(a);
                            const wB = getItemWeek(b);
                            if (wA && wB && wA !== wB) return wB.localeCompare(wA);
                            const tA = new Date(a.updated_at || a.created_at || 0).getTime();
                            const tB = new Date(b.updated_at || b.created_at || 0).getTime();
                            return tB - tA;
                          });
                          activeSnap = sortedSnaps.find(s => s.is_current_homework) || sortedSnaps[0];
                        }

                        (progressItems || []).forEach(item => {
                          const isThisWeekSnapshot = activeSnap ? (item.id === activeSnap.id || item.topic_name === activeSnap.topic_name) : false;
                          const isOtherActiveHw = Boolean(item.is_current_homework) && !item.topic_name?.startsWith('Hausaufgabe KW ');
                          const isActive = isThisWeekSnapshot || isOtherActiveHw;
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

                      // 🌉 Smart Audio Bridge: Bridge active practice tracks from latest snapshot or progressItems if current week has none
                      if (audioTracks.length === 0) {
                        const allAudioSnapshots = (progressItems || []).filter((item: any) => item.topic_name?.startsWith('Hausaufgabe KW '));
                        allAudioSnapshots.sort((a: any, b: any) => {
                          const wA = getItemWeek(a);
                          const wB = getItemWeek(b);
                          if (wA && wB && wA !== wB) return wB.localeCompare(wA);
                          const tA = new Date(a.updated_at || a.created_at || 0).getTime();
                          const tB = new Date(b.updated_at || b.created_at || 0).getTime();
                          return tB - tA;
                        });

                        for (const snap of allAudioSnapshots) {
                          if (snap.recording_url && typeof snap.recording_url === 'string' && snap.recording_url.trim()) {
                            audioTracks.push({
                              url: snap.recording_url.trim(),
                              duration: 0,
                              date: snap.updated_at || snap.created_at,
                              label: snap.topic_name || 'Aufnahme #1',
                              author: 'teacher',
                              isCarriedOver: true,
                              idx: audioTracks.length
                            });
                          }
                          const snapNotesStr = snap.homework_notes || snap.teacher_notes;
                          if (snapNotesStr) {
                            try {
                              const parsed = typeof snapNotesStr === 'string' && (snapNotesStr.startsWith('[') || snapNotesStr.startsWith('{')) ? JSON.parse(snapNotesStr) : (Array.isArray(snapNotesStr) ? snapNotesStr : [snapNotesStr]);
                              if (Array.isArray(parsed)) {
                                parsed.forEach((item: any) => {
                                  if (typeof item === 'string' && item.includes('AUDIO:')) {
                                    const cleanStr = item.startsWith('[') ? item.replace(/[\[\]"]/g, '') : item;
                                    const parts = cleanStr.substring(cleanStr.indexOf('AUDIO:') + 6).split('|');
                                    if (!audioTracks.some(t => t.url === parts[0])) {
                                      audioTracks.push({
                                        url: parts[0],
                                        duration: parseFloat(parts[1]) || 0,
                                        date: parts[2],
                                        label: parts[3] || ('Aufnahme #' + (audioTracks.length + 1)),
                                        author: parts[4] || 'teacher',
                                        songTag: parts[7] || undefined,
                                        isCarriedOver: true,
                                        idx: audioTracks.length
                                      });
                                      if (!carriedOverWeekLabel) {
                                        const kwMatch = snap.topic_name?.match(/Hausaufgabe KW\s*(\d+)/i);
                                        if (kwMatch) carriedOverWeekLabel = `KW ${kwMatch[1]}`;
                                      }
                                    }
                                  }
                                });
                              }
                            } catch {}
                          }
                          if (audioTracks.length > 0) break;
                        }

                        // Fallback: check any recording_url or AUDIO: in individual song / lehrwerk progress items
                        if (audioTracks.length === 0) {
                          (progressItems || []).forEach((item: any) => {
                            if (item.recording_url && typeof item.recording_url === 'string' && item.recording_url.trim()) {
                              if (!audioTracks.some(t => t.url === item.recording_url.trim())) {
                                audioTracks.push({
                                  url: item.recording_url.trim(),
                                  duration: 0,
                                  date: item.updated_at || item.created_at,
                                  label: item.topic_name || `Aufnahme #${audioTracks.length + 1}`,
                                  author: 'teacher',
                                  isCarriedOver: true,
                                  idx: audioTracks.length
                                });
                              }
                            }
                            if (item.homework_notes && typeof item.homework_notes === 'string' && item.homework_notes.includes('AUDIO:')) {
                              try {
                                const parsed = JSON.parse(item.homework_notes);
                                if (Array.isArray(parsed)) {
                                  parsed.forEach((n: any) => {
                                    if (typeof n === 'string' && n.includes('AUDIO:')) {
                                      const parts = n.substring(n.indexOf('AUDIO:') + 6).split('|');
                                      if (!audioTracks.some(t => t.url === parts[0])) {
                                        audioTracks.push({
                                          url: parts[0],
                                          duration: parseFloat(parts[1]) || 0,
                                          date: parts[2],
                                          label: parts[3] || `Aufnahme #${audioTracks.length + 1}`,
                                          author: parts[4] || 'teacher',
                                          isCarriedOver: true,
                                          idx: audioTracks.length
                                        });
                                      }
                                    }
                                  });
                                }
                              } catch {}
                            }
                          });
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
                      const isDidacticNote = (n: any) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.startsWith('LATENCY:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('SNAPSHOT_') && !n.startsWith('FEEDBACK:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:') && !n.startsWith('STUDENT_QUESTION:') && !n.startsWith('❓ Frage für den Unterricht:');

                      let generalNotesList: string[] = currentWeekNotes.filter(isDidacticNote).map(cleanGeneralNote).filter(Boolean);

                      if (generalNotesList.length === 0) {
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
                          const kwMatch = latestPast.topic_name?.match(/Hausaufgabe KW\s*(\d+)/i);
                          if (!carriedOverWeekLabel && kwMatch) carriedOverWeekLabel = `KW ${kwMatch[1]}`;
                          try {
                            const parsed = typeof latestPast.homework_notes === 'string' ? JSON.parse(latestPast.homework_notes) : latestPast.homework_notes;
                            if (Array.isArray(parsed)) {
                              const pastNotes = parsed.filter(isDidacticNote).map(cleanGeneralNote).filter(Boolean);
                              if (pastNotes.length > 0) {
                                generalNotesList = pastNotes;
                                isPastNoteCarriedOver = true;
                              }
                            } else if (typeof parsed === 'string') {
                              const cleanP = cleanGeneralNote(parsed);
                              if (cleanP) {
                                generalNotesList = [cleanP];
                                isPastNoteCarriedOver = true;
                              }
                            }
                          } catch {}
                        }
                      }
                      const generalNote = generalNotesList[0] || '';

                      const isAudioCarriedOver = audioTracks.some(t => t.isCarriedOver);
                      let isCarriedOverPlan = isAudioCarriedOver || isPastNoteCarriedOver;

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

                      // 1. Memoized Active Homework & Books Collation (0.1% Goldstandard)
                      const {
                        activeLehrwerkeMap,
                        otherActiveHWItems,
                        isBooksCarriedOver: memoBooksCarriedOver,
                        isSongsCarriedOver: memoSongsCarriedOver,
                        carriedOverWeekLabel: memoCarriedOverWeekLabel
                      } = memoizedHomeworkSummary;
                      if (memoBooksCarriedOver) isBooksCarriedOver = true;
                      if (memoSongsCarriedOver) isSongsCarriedOver = true;
                      if (memoCarriedOverWeekLabel && !carriedOverWeekLabel) carriedOverWeekLabel = memoCarriedOverWeekLabel;

                      isCarriedOverPlan = isAudioCarriedOver || isPastNoteCarriedOver || isBooksCarriedOver || isSongsCarriedOver;

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

                      const hasActiveHomework = formattedActiveBooks.length > 0 || otherActiveHWItems.length > 0 || currentWeekNotes.length > 0 || !!generalNote || !!studentQuestionText;

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
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <div style={{ 
                                  background: 'rgba(22, 163, 74, 0.12)', 
                                  color: '#16a34a', 
                                  width: '34px', 
                                  height: '34px', 
                                  borderRadius: '11px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <BookOpen size={17} strokeWidth={2.2} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                  <h4 style={{ margin: 0, fontSize: '1.0rem', fontWeight: 950, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.2 }}>
                                    Hausaufgaben
                                  </h4>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: isMusicStandMode ? '0.78rem' : '0.74rem',
                                    fontWeight: 800,
                                    color: '#16a34a',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    <Music size={12} color="#16a34a" strokeWidth={2.4} />
                                    <span>Dein Wochen-Fahrplan</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Audio Indicator Pill beside Title */}
                              {audioTracks.length > 0 ? (
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => {
                                    if (handleOpenHomeworkBookWithView) {
                                      handleOpenHomeworkBookWithView('document', 'recordings');
                                    } else {
                                      handleTabChangeLocal('homework_book');
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      if (handleOpenHomeworkBookWithView) {
                                        handleOpenHomeworkBookWithView('document', 'recordings');
                                      } else {
                                        handleTabChangeLocal('homework_book');
                                      }
                                    }
                                  }}
                                  style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '100px',
                                    padding: '4px 10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                  }}
                                  className="hover-scale"
                                  title="Unterrichtsaufnahmen im Aufgabenheft anhören"
                                  aria-label="Unterrichtsaufnahmen im Aufgabenheft anhören"
                                >
                                  <Headphones size={12} color="#475569" strokeWidth={2.2} />
                                  <span style={{ fontSize: '0.72rem', fontWeight: 850, color: '#334155' }}>
                                    {audioTracks.length === 1 ? '1 Aufnahme' : `${audioTracks.length} Aufnahmen`}
                                  </span>
                                </div>
                              ) : (
                                <span style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.62rem', fontWeight: 850, padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap', flexShrink: 0 }}>
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
                                            background: `linear-gradient(135deg, ${bookGradient.from}, ${bookGradient.to})`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: bookGradient.text,
                                            boxShadow: '0 1px 3px rgba(225, 29, 72, 0.12)',
                                            flexShrink: 0
                                          }}>
                                            <BookOpen size={14} strokeWidth={2.4} />
                                          </div>
                                          <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                            {item.title}
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', flexShrink: 0 }}>
                                          <span style={{
                                            fontSize: '0.80rem',
                                            fontWeight: 850,
                                            color: '#15803d',
                                            background: '#dcfce7',
                                            padding: '3px 10px',
                                            borderRadius: '99px',
                                            border: '1px solid #bbf7d0',
                                            flexShrink: 0
                                          }}>
                                            {item.formattedPages || (item.pageNums?.length === 1 ? `S. ${item.pageNums[0]}` : `S. ${item.pageNums.join(', ')}`)}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {otherActiveHWItems.map((item, idx) => {
                                    const songTitle = cleanTitle(item.title || item.topic_name);
                                    const songColor = getSongColor(songTitle);
                                    return (
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
                                          background: `linear-gradient(135deg, ${songColor.from}, ${songColor.to})`,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: songColor.text || '#0f172a',
                                          boxShadow: `0 2px 6px ${songColor.shadowFrom || 'rgba(0,0,0,0.06)'}`,
                                          flexShrink: 0
                                        }}>
                                          <Music size={14} strokeWidth={2.4} />
                                        </div>
                                        <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {songTitle}
                                        </span>
                                      </div>
                                    );
                                  })}

                                  {/* Zusätzliche Bemerkung / Notizen (Aufbau wie Wochen-Fahrplan im Aufgaben Board) */}
                                  {generalNotesList && generalNotesList.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      {generalNotesList.map((noteItem: string, nIdx: number) => (
                                        <div key={`pro-gn-${nIdx}`} style={{
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
                                            background: '#dcfce7',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#15803d',
                                            flexShrink: 0
                                          }}>
                                            <FileText size={14} strokeWidth={2.4} />
                                          </div>
                                          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {noteItem}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Frage des Schülers für die Stunde (Gelber Text & Gelbe Kennzeichnung) */}
                                  {(() => {
                                    const displayedProQuestion = activeStudentQuestion || studentQuestionText;
                                    if (!displayedProQuestion) return null;
                                    return (
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontSize: '0.88rem',
                                        padding: '8px 12px',
                                        borderRadius: '12px',
                                        background: '#fffdf0',
                                        border: '1px solid #fde047',
                                        boxShadow: '0 1px 3px rgba(250, 204, 21, 0.15)'
                                      }}>
                                        <HelpCircle size={14} style={{ color: '#ca8a04', flexShrink: 0 }} strokeWidth={2.5} />
                                        <strong style={{ color: '#ca8a04', fontWeight: 850, flexShrink: 0 }}>Deine Frage:</strong>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#713f12', fontWeight: 700 }}>
                                          „{displayedProQuestion}“
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </>
                              ) : (
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                  Keine offenen Aufgaben für diese Woche erfasst
                                </div>
                              )}
                            </div>
                            {/* Ausgelagertes Aufnahmen-Pill-Button */}
                            {audioTracks && audioTracks.length > 0 && (
                              <div style={{ marginTop: '6px' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveRecordingTrack(audioTracks[0]);
                                    setRecordingsModalTracks(audioTracks);
                                    setShowRecordingsModal(true);
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '5px 12px',
                                    borderRadius: '100px',
                                    background: '#f0fdf4',
                                    border: '1.5px solid #bbf7d0',
                                    color: '#15803d',
                                    fontSize: '0.74rem',
                                    fontWeight: 850,
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 3px rgba(22, 163, 74, 0.08)',
                                    transition: 'all 0.15s ease'
                                  }}
                                  className="hover-scale"
                                  title="Aufnahmen deiner Lehrkraft öffnen"
                                >
                                  <Headphones size={13} color="currentColor" />
                                  <span>{audioTracks.length === 1 ? '1 Aufnahme anhören' : `${audioTracks.length} Aufnahmen anhören`}</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* 2-Button Action Footer */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleTabChangeLocal('homework_book')}
                              style={{
                                padding: '10px 14px',
                                borderRadius: '14px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                                color: '#ffffff',
                                fontSize: '0.86rem',
                                fontWeight: 900,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s',
                                minHeight: '44px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.28)'
                              }}
                              className="hover-scale"
                              title="Alle Hausaufgaben ansehen"
                            >
                              <BookOpen size={15} color="currentColor" style={{ flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Aufgaben ansehen →</span>
                            </button>

                            {(() => {
                              const displayedProQuestion = activeStudentQuestion || studentQuestionText;
                              return (
                                <button
                                  type="button"
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openQuestionModal();
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      openQuestionModal();
                                    }
                                  }}
                                  style={{
                                    padding: '10px 14px',
                                    borderRadius: '14px',
                                    border: displayedProQuestion ? 'none' : '1.5px solid #e2e8f0',
                                    background: displayedProQuestion ? '#facc15' : '#f8fafc',
                                    color: displayedProQuestion ? '#0f172a' : '#475569',
                                    fontSize: '0.86rem',
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s',
                                    minHeight: '44px',
                                    whiteSpace: 'nowrap',
                                    boxShadow: displayedProQuestion ? '0 4px 14px rgba(250, 204, 21, 0.35)' : 'none'
                                  }}
                                  className="hover-scale"
                                  title={displayedProQuestion ? "Hinterlegte Schülerfrage bearbeiten" : "Frage für die nächste Stunde stellen"}
                                  aria-label={displayedProQuestion ? "Hinterlegte Schülerfrage bearbeiten" : "Frage für die nächste Stunde stellen"}
                                >
                                  <HelpCircle size={15} color="currentColor" style={{ flexShrink: 0 }} />
                                  <span>{displayedProQuestion ? 'Frage aktiv' : 'Frage?'}</span>
                                </button>
                              );
                            })()}
                          </div>
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

                      const instName = studentInstrumentName || 'an deinem Instrument';
                      const instPrep = ['Gitarre', 'Blockflöte', 'Querflöte', 'Violine', 'Geige', 'Bratsche', 'Posaune', 'Trompete', 'Harfe', 'Ukulele'].some(w => instName.toLowerCase().includes(w.toLowerCase()))
                        ? `an der ${instName}`
                        : ['Klavier', 'Schlagzeug', 'Cello', 'Saxophon', 'Akkordeon', 'Keyboard', 'Horn', 'Fagott'].some(w => instName.toLowerCase().includes(w.toLowerCase()))
                        ? `am ${instName}`
                        : `an deinem Instrument`;

                      const todayStr = toLocalYYYYMMDD(new Date());
                      const todayLogs = (fokusLogs || []).filter((log: any) => log.created_at && toLocalYYYYMMDD(new Date(log.created_at)) === todayStr);
                      const dbTodaySecs = todayLogs.reduce((sum: number, log: any) => sum + (log.duration_seconds || ((log.duration_minutes || 0) * 60)), 0);
                      const liveTodaySecs = sessionActive ? secondsElapsed : 0;
                      const totalTodaySecs = dbTodaySecs + liveTodaySecs;
                      const todayMins = Math.floor(totalTodaySecs / 60);
                      const isGoalAchieved = totalTodaySecs >= (requiredMins * 60);
                      const progressPercent = Math.min(100, Math.round((totalTodaySecs / (requiredMins * 60)) * 100));

                      return (
                        <div style={{ 
                          background: '#ffffff', 
                          borderRadius: '24px', 
                          padding: '24px', 
                          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.03)',
                          border: isGoalAchieved ? '1px solid rgba(52, 168, 83, 0.25)' : '1px solid rgba(0, 0, 0, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '16px'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Header: Icon + Title + Status Pill */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ 
                                  background: isGoalAchieved ? 'rgba(52, 168, 83, 0.12)' : 'rgba(124, 58, 237, 0.12)', 
                                  color: isGoalAchieved ? '#16a34a' : '#7c3aed', 
                                  width: '34px', 
                                  height: '34px', 
                                  borderRadius: '11px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  {isGoalAchieved ? <Check size={18} /> : <Timer size={17} />}
                                </div>
                                <h4 style={{ margin: 0, fontSize: isMusicStandMode ? '1.18rem' : '1.05rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                  Fokus-Session
                                </h4>
                              </div>

                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: isGoalAchieved ? '#dcfce7' : '#f8fafc',
                                color: isGoalAchieved ? '#15803d' : '#475569',
                                border: isGoalAchieved ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                                padding: '4px 10px',
                                borderRadius: '100px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                letterSpacing: '0.02em',
                                flexShrink: 0
                              }}>
                                <span>{isGoalAchieved ? 'Erledigt ✨' : `Ziel: ${requiredMins} Min.`}</span>
                              </div>
                            </div>

                            {/* 1% Apple-Fitness-Style Radial Wow-Gauge (126px) - Zentriert, ohne grauen Kasten */}
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '12px',
                              padding: '12px 0 6px 0',
                              width: '100%'
                            }}>
                              {renderCircularGauge(progressPercent, isGoalAchieved, 126, 12, todayMins, requiredMins)}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', textAlign: 'center', width: '100%' }}>
                                <div style={{ fontSize: '1.10rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.01em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                  {isGoalAchieved ? 'Tagesziel erreicht' : 'Tagesfokus'}
                                </div>
                                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: isGoalAchieved ? '#15803d' : '#64748b', lineHeight: 1.35 }}>
                                  {isGoalAchieved ? 'Serie für heute gesichert' : `${Math.max(1, requiredMins - todayMins)} Min. bis zum Streak-Schutz`}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* CTA Button */}
                          <button 
                            type="button"
                            onClick={() => handleTabChangeLocal('practice_board')}
                            style={{ 
                              background: isGoalAchieved 
                                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                                : 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', 
                              color: '#ffffff', 
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
                              boxShadow: isGoalAchieved 
                                ? '0 8px 20px rgba(16, 185, 129, 0.25)' 
                                : '0 8px 20px rgba(79, 70, 229, 0.28)', 
                              transition: 'all 0.2s', 
                              width: '100%' 
                            }}
                            className="hover-scale"
                          >
                            {isGoalAchieved ? <Check size={16} /> : <Play size={15} fill="currentColor" color="currentColor" />}
                            <span>{isGoalAchieved ? 'Tagesziel erreicht • Session starten' : `${requiredMins} Min. Übe-Timer starten`}</span>
                          </button>
                        </div>
                      );
                    })()}

                    {/* Spalte 3: Übe-Kontinuität & Wochen-Puffer (Pro Mode) */}
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
                      const currentTier = isTier3Unlocked ? 3 : isTier2Unlocked ? 2 : isTier1Unlocked ? 1 : 0;

                      const weekMetrics = getDeterministicWeekMetrics();
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
                          justifyContent: 'space-between',
                          gap: '16px'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Header: Title + Rules + Minimalist Badge */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ 
                                  background: isTier3Unlocked ? 'rgba(239, 68, 68, 0.12)' : 'rgba(249, 115, 22, 0.12)', 
                                  color: isTier3Unlocked ? '#dc2626' : '#ea580c', 
                                  width: '34px', 
                                  height: '34px', 
                                  borderRadius: '11px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <Flame size={17} strokeWidth={2.2} fill={streak > 0 ? "currentColor" : "none"} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <h4 style={{ margin: 0, fontSize: isMusicStandMode ? '1.18rem' : '1.05rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    Übe-Kontinuität
                                  </h4>
                                  <button 
                                    onClick={() => setShowRulesModal(true)}
                                    style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8', transition: 'color 0.15s' }}
                                    onMouseOver={e => e.currentTarget.style.color = '#64748b'}
                                    onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                                    title="Regeln & Meilensteine anzeigen"
                                    aria-label="Regeln & Meilensteine anzeigen"
                                  >
                                    <HelpCircle size={15} />
                                  </button>
                                </div>
                              </div>
                              <span style={{ 
                                background: streak === 0 ? '#f1f5f9' : '#ecfdf5', 
                                color: streak === 0 ? '#475569' : '#047857', 
                                fontSize: '0.74rem', 
                                fontWeight: 950, 
                                padding: '4px 12px', 
                                borderRadius: '100px',
                                border: streak === 0 ? '1px solid #e2e8f0' : '1px solid #a7f3d0',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                {streak === 0 ? 'Startklar' : `${streak} ${streak === 1 ? 'Tag' : 'Tage'} Serie • Stufe ${currentTier}`}
                              </span>
                            </div>

                            {/* FERIEN-FREEZE ODER WOCHEN-PUFFER */}
                            {isTodayHoliday ? (
                              <div style={{
                                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                                border: '1.5px solid #a7f3d0',
                                borderRadius: '16px',
                                padding: '12px 14px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '5px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Palmtree size={16} color="#059669" />
                                    <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#065f46' }}>
                                      Ferienpause aktiv
                                    </span>
                                  </div>
                                  <span style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 900,
                                    background: '#059669',
                                    color: '#ffffff',
                                    padding: '2px 9px',
                                    borderRadius: '100px'
                                  }}>
                                    ✨ 2× XP-Booster
                                  </span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.72rem', color: '#047857', lineHeight: 1.35, fontWeight: 600 }}>
                                  Ferienzeit: Deine Serie ist gesichert. Freiwilliges Üben bringt <strong>2× XP</strong>.
                                </p>
                              </div>
                            ) : (
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: isMusicStandMode ? '0.88rem' : '0.80rem', fontWeight: 900, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Shield size={14} color="#059669" fill="#059669" />
                                    Wochen-Puffer (Ruhetage):
                                  </span>
                                  <span style={{ fontSize: isMusicStandMode ? '0.86rem' : '0.78rem', fontWeight: 950, color: availableShields > 0 ? '#059669' : '#b91c1c' }}>
                                    {availableShields}/3 Tage verfügbar
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  {[1, 2, 3].map((shieldNum) => {
                                    const isConsumed = shieldNum <= weekShieldedCount;
                                    const isShieldActive = shieldNum > weekShieldedCount;
                                    const shieldedDay = weekMetrics.weekDays.find(d => d.shieldNumber === shieldNum);
                                    const dayLabel = shieldedDay ? shieldedDay.dayName : '';

                                    return (
                                      <div key={`pro-shield-${shieldNum}`} style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '3px',
                                        padding: '7px 4px',
                                        borderRadius: '10px',
                                        background: isConsumed ? '#f1f5f9' : '#ffffff',
                                        border: isConsumed ? '1px solid #cbd5e1' : '1.5px solid #10b981',
                                        boxShadow: isShieldActive ? '0 1px 4px rgba(16, 185, 129, 0.12)' : 'none',
                                        transition: 'all 0.2s ease'
                                      }}>
                                        <Shield size={14} color={isConsumed ? '#64748b' : '#059669'} fill={isConsumed ? '#cbd5e1' : '#10b981'} />
                                        <span style={{
                                          fontSize: isMusicStandMode ? '0.74rem' : '0.68rem',
                                          fontWeight: 900,
                                          color: isConsumed ? '#475569' : '#047857',
                                          letterSpacing: '0.02em',
                                          whiteSpace: 'nowrap'
                                        }}>
                                          {isConsumed ? `${dayLabel} ✓` : 'Puffer'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                                <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b', lineHeight: 1.35, fontWeight: 650 }}>
                                  Musikergesundheit: Bis zu 3 Ruhetage pro Woche sichern deine Serie automatisch.
                                </p>
                              </div>
                            )}

                            {/* CONDENSED ACTIVE TIER CARD & MILESTONE STEPPER */}
                            {(() => {
                              const isMeister = isTier3Unlocked;
                              const isFlow = !isMeister && isTier2Unlocked;
                              const isBasis = !isMeister && !isFlow;

                              const tierTitle = isMeister ? 'Stufe 3: Meister-Fokus' : isFlow ? 'Stufe 2: Flow-Fokus' : 'Stufe 1: Basis-Fokus';
                              const tierIcon = isMeister 
                                ? <Crown size={16} color="#dc2626" fill="#ef4444" /> 
                                : isFlow 
                                ? <Zap size={16} color="#ea580c" fill="#f97316" /> 
                                : <Flame size={16} color={isTier1Unlocked ? '#d97706' : '#94a3b8'} fill={isTier1Unlocked ? '#facc15' : 'none'} />;
                              const tierIconBg = isMeister ? '#fee2e2' : isFlow ? '#ffedd5' : isTier1Unlocked ? '#fef9c3' : '#f1f5f9';
                              const tierBorder = isMeister ? '1.5px solid #ef4444' : isFlow ? '1.5px solid #f97316' : isTier1Unlocked ? '1.5px solid #facc15' : '1px solid #e2e8f0';
                              const tierShadow = isMeister 
                                ? '0 4px 14px rgba(239, 68, 68, 0.16)' 
                                : isFlow 
                                ? '0 4px 14px rgba(249, 115, 22, 0.16)' 
                                : isTier1Unlocked 
                                ? '0 4px 14px rgba(250, 204, 21, 0.16)' 
                                : 'none';
                              const tierRequirement = isMeister ? `9+ Tage • ${heldenMins} Min. täglich` : isFlow ? `4–8 Tage • ${mittlereMins} Min. täglich` : `1–3 Tage • ${kleineMins} Min. täglich`;
                              const tierStatus = isMeister 
                                ? '★ Meister-Fokus aktiv • Volle Flamme' 
                                : isFlow 
                                ? `● Flow-Phase aktiv • Noch ${Math.max(1, 9 - streak)} ${Math.max(1, 9 - streak) === 1 ? 'Tag' : 'Tage'} bis Meister` 
                                : (isTier1Unlocked 
                                  ? `● Basis-Fokus aktiv • Noch ${Math.max(1, 4 - streak)} ${Math.max(1, 4 - streak) === 1 ? 'Tag' : 'Tage'} bis Flow` 
                                  : 'Bereit zum Start');
                              const tierTitleColor = isMeister ? '#991b1b' : isFlow ? '#9a3412' : isTier1Unlocked ? '#713f12' : '#0f172a';

                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <div 
                                    onClick={() => setShowRulesModal(true)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowRulesModal(true); }}
                                    style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '12px', 
                                      background: '#ffffff', 
                                      padding: '10px 14px', 
                                      borderRadius: '16px', 
                                      border: tierBorder, 
                                      boxShadow: tierShadow, 
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease'
                                    }}
                                    className="hover-scale"
                                    title="Klicke hier, um alle Meilensteine und Regeln einzusehen"
                                  >
                                    <div style={{ 
                                      width: '32px', 
                                      height: '32px', 
                                      borderRadius: '50%', 
                                      background: tierIconBg, 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      flexShrink: 0 
                                    }}>
                                      {tierIcon}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: isMusicStandMode ? '1.02rem' : '0.90rem', fontWeight: 950, color: tierTitleColor }}>
                                          {tierTitle}
                                        </span>
                                        <span style={{ fontSize: isMusicStandMode ? '0.84rem' : '0.76rem', fontWeight: 900, color: '#64748b', flexShrink: 0 }}>
                                          {tierRequirement}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: isMusicStandMode ? '0.84rem' : '0.76rem', color: isMeister ? '#dc2626' : isFlow ? '#ea580c' : isTier1Unlocked ? '#d97706' : '#64748b', fontWeight: 750, marginTop: '2px' }}>
                                        {tierStatus}
                                      </div>
                                    </div>
                                  </div>

                                  {/* 3-Step Milestone Stepper as unified Segment Track */}
                                  <div style={{
                                    display: 'flex',
                                    gap: '4px',
                                    background: '#f1f5f9',
                                    padding: '4px',
                                    borderRadius: '14px',
                                    border: '1px solid #e2e8f0'
                                  }}>
                                    {[
                                      { 
                                        label: '1–3 T', 
                                        name: 'Basis', 
                                        active: streak >= 1, 
                                        done: streak >= 4,
                                        activeBg: '#facc15',
                                        activeBorder: '#eab308',
                                        activeColor: '#0f172a',
                                        activeShadow: '0 2px 8px rgba(250, 204, 21, 0.35)',
                                        doneBg: '#fef08a',
                                        doneBorder: '#facc15',
                                        doneColor: '#713f12'
                                      },
                                      { 
                                        label: '4–8 T', 
                                        name: 'Flow', 
                                        active: streak >= 4, 
                                        done: streak >= 9,
                                        activeBg: '#f97316',
                                        activeBorder: '#ea580c',
                                        activeColor: '#ffffff',
                                        activeShadow: '0 2px 8px rgba(249, 115, 22, 0.35)',
                                        doneBg: '#ffedd5',
                                        doneBorder: '#f97316',
                                        doneColor: '#9a3412'
                                      },
                                      { 
                                        label: '9+ T', 
                                        name: 'Meister', 
                                        active: streak >= 9, 
                                        done: streak >= 9,
                                        activeBg: '#ef4444',
                                        activeBorder: '#dc2626',
                                        activeColor: '#ffffff',
                                        activeShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
                                        doneBg: '#fee2e2',
                                        doneBorder: '#ef4444',
                                        doneColor: '#991b1b'
                                      }
                                    ].map((step, idx) => {
                                      const isCurrent = step.active && !step.done;
                                      const bg = step.done ? step.doneBg : step.active ? step.activeBg : 'transparent';
                                      const border = step.done ? `1px solid ${step.doneBorder}` : step.active ? `1px solid ${step.activeBorder}` : '1px solid transparent';
                                      const textColor = step.done ? step.doneColor : step.active ? step.activeColor : '#64748b';
                                      const shadow = isCurrent ? step.activeShadow : 'none';

                                      return (
                                        <div 
                                          key={idx}
                                          onClick={() => setShowRulesModal(true)}
                                          role="button"
                                          tabIndex={0}
                                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowRulesModal(true); }}
                                          style={{
                                            flex: 1,
                                            padding: '8px 4px',
                                            borderRadius: '10px',
                                            background: bg,
                                            border: border,
                                            boxShadow: shadow,
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                          }}
                                          title={`${step.name} (${step.label}) – Klicke für Details`}
                                        >
                                          <div style={{ fontSize: '0.64rem', fontWeight: 900, color: textColor, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                            {step.done ? <span>✓ {step.name}</span> : <span>{step.name}</span>}
                                          </div>
                                          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: textColor, opacity: step.active ? 1 : 0.75, marginTop: '1px' }}>
                                            {step.label}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Gamification-Sog Countdown (Pure White Background, No Gray Box, Monochrome Icon) */}
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    padding: '6px 0 0 0',
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    color: streak >= 9 ? '#dc2626' : streak >= 4 ? '#ea580c' : streak >= 1 ? '#b45309' : '#64748b',
                                    textAlign: 'center'
                                  }}>
                                    <Flame size={14} color="currentColor" />
                                    {streak >= 9 ? (
                                      <span>Meister-Stufe erreicht (9+ T) • Maximale Routine gesichert.</span>
                                    ) : streak >= 4 ? (
                                      <span>Noch {9 - streak} {9 - streak === 1 ? 'Tag' : 'Tage'} bis Meister (9+ T)</span>
                                    ) : streak >= 1 ? (
                                      <span>Noch {4 - streak} {4 - streak === 1 ? 'Tag' : 'Tage'} bis Flow (4–8 T)</span>
                                    ) : (
                                      <span>Erste Session starten für Basis (1–3 T)</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
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
              <StudentBriefingRightSidebar
                isRightSidebarCollapsed={isRightSidebarCollapsed}
                handleToggleRightSidebar={handleToggleRightSidebar}
                sidebarTotalAlertsCount={sidebarTotalAlertsCount}
                hasSidebarAppointmentAlerts={hasSidebarAppointmentAlerts}
                handleTabChangeLocal={handleTabChangeLocal}
                scheduleOccurrences={scheduleOccurrences}
                schoolYearOccurrences={schoolYearOccurrences}
                isMusicStandMode={isMusicStandMode}
                getOccRoomName={getOccRoomName}
                checkOccurrenceHasMessages={checkOccurrenceHasMessages}
                getOccurrenceUnreadCount={getOccurrenceUnreadCount}
                setAppointmentChatData={setAppointmentChatData}
                setShowAppointmentChat={setShowAppointmentChat}
                handleTriggerConfirmReschedule={handleTriggerConfirmReschedule}
                handleRejectReschedule={handleRejectReschedule}
                handleAcknowledgeCancellation={handleAcknowledgeCancellation}
                onOpenRescheduleBottomSheet={onOpenRescheduleBottomSheet}
                studentFeedTab={studentFeedTab}
                setStudentFeedTab={setStudentFeedTab}
                campusFeedAnnouncements={campusFeedAnnouncements}
                classFeedPosts={classFeedPosts}
                classFeedInteractions={classFeedInteractions}
                unreadClassFeedCount={unreadClassFeedCount}
                studentId={studentId}
                handleReactToPost={handleReactToPost}
                handleSubmitClassFeedInteraction={handleSubmitClassFeedInteraction}
                handleOpenContributions={handleOpenContributions}
                isStudentRescheduleAllowed={isStudentRescheduleAllowed}
                classGoals={classGoals}
                classWeeklyMins={classWeeklyMins}
                feedInteractions={feedInteractions}
                effectiveLevel={effectiveLevel}
              />
            )}

          </div>
        </div>
        );
      })()}

      {/* 🎧 Hidden Quickie Audio Element */}
      <audio
        ref={quickieAudioRef}
        onTimeUpdate={(e) => setQuickieCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setQuickieDuration(e.currentTarget.duration)}
        onEnded={() => setQuickiePlaying(false)}
        style={{ display: 'none' }}
      />

      {/* 🚀 0.1% GOLDSTANDARD: MODALS HUB (Leaf Extraction) */}
      <StudentBriefingModalsHub
        showQuestionModal={showQuestionModal}
        setShowQuestionModal={setShowQuestionModal}
        questionInput={questionInput}
        setQuestionInput={setQuestionInput}
        handleQuestionInputChange={handleQuestionInputChange}
        isSavingQuestion={isSavingQuestion}
        handleSaveQuestion={handleSaveQuestion}
        questionToast={questionToast}
        isListeningSpeech={isListeningSpeech}
        toggleSpeechRecognition={toggleSpeechRecognition}

        selectedAppointmentForDetail={selectedAppointmentForDetail}
        setSelectedAppointmentForDetail={setSelectedAppointmentForDetail}
        showCancelConfirmStep={showCancelConfirmStep}
        setShowCancelConfirmStep={setShowCancelConfirmStep}
        handleTriggerCancelOccurrence={handleTriggerCancelOccurrence}
        handleTriggerUndoCancelOccurrence={handleTriggerUndoCancelOccurrence}
        studentUser={studentUser}
        briefingData={briefingData}
        studentInstrumentName={studentInstrumentName}
        setAppointmentChatData={setAppointmentChatData}
        setShowAppointmentChat={setShowAppointmentChat}

        showRecordingsModal={showRecordingsModal}
        setShowRecordingsModal={setShowRecordingsModal}
        recordingsModalTracks={recordingsModalTracks}
        activeRecordingTrack={activeRecordingTrack}
        setActiveRecordingTrack={setActiveRecordingTrack}
        getJuniorWeeklyHomeworkSummary={getJuniorWeeklyHomeworkSummary}
        handleOpenHomeworkBookWithView={handleOpenHomeworkBookWithView}
        handleTabChangeLocal={handleTabChangeLocal}
      />
      </div>
  );
}
