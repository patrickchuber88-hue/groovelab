import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CampusUiLevel } from '../../campus/CampusLevelSwitcher';
import { JuniorStickerCategory } from '../modals/StudentJuniorStickerModal';
import { resolveJuniorMissionDetails, calculateJuniorMissionResult } from '../utils/juniorMissionDetailsResolver';
import { 
  playRocketSputterSound, 
  playOrbitLaunchSound, 
  playCelestialVictoryChime, 
  playHyperspaceWarpSound 
} from '../utils/juniorRocketAudio';
import { toLocalYYYYMMDD, getSimulatedNow, getSchoolYearString } from '../studentDateUtils';
import { ALL_STICKERS, getUnifiedStickersMap } from '../../../domain/stickersAndTresor';

export interface UseStudentJuniorMissionParams {
  studentId: string;
  studentUser: any;
  studentUiLevel: CampusUiLevel;
  practice: {
    sessionActive: boolean;
    secondsElapsed: number;
    setSessionActive: (active: boolean) => void;
    setSecondsElapsed: (secs: number) => void;
    setShowCelebration: (show: boolean) => void;
    finishPracticeSession: (xpBonus?: number) => Promise<any>;
    fokusLogs?: any[];
  };
  streaks: {
    avatar: any;
    getTargetMinutes: (streak: number) => number;
  };
  localProgress: any;
  lehrwerke: any[];
  progressItems: any[];
  activeSongSkills: any;
  assignedCampusSongs: any[];
}

export function useStudentJuniorMission({
  studentId,
  studentUser,
  studentUiLevel,
  practice,
  streaks,
  localProgress,
  lehrwerke,
  progressItems,
  activeSongSkills,
  assignedCampusSongs,
}: UseStudentJuniorMissionParams) {
  // Junior sticker states
  const [showJuniorStickerModal, setShowJuniorStickerModal] = useState(false);
  const [juniorStickerCategory, setJuniorStickerCategory] = useState<JuniorStickerCategory>('all');
  const [juniorSelectedPreviewSticker, setJuniorSelectedPreviewSticker] = useState<any | null>(null);
  const [juniorAwardedStickerToCelebrate, setJuniorAwardedStickerToCelebrate] = useState<any | null>(null);
  const [showJuniorPreFlightModal, setShowJuniorPreFlightModal] = useState(false);
  const [juniorSelectedTrackIndex, setJuniorSelectedTrackIndex] = useState(0);

  // 🚀 Junior Space Mission States (Kindgerechte Treibstoff-Physik & Raketen-Starts)
  const [juniorMissionPhase, setJuniorMissionPhase] = useState<'idle' | 'zen' | 'celebrating'>('idle');
  const [juniorLaunchStage, setJuniorLaunchStage] = useState<'launching' | 'summary'>('launching');
  const [juniorMissionTier, setJuniorMissionTier] = useState<1 | 2 | 3>(2);
  const [juniorCelebrationSummary, setJuniorCelebrationSummary] = useState<{
    elapsedSecs: number;
    targetMins: number;
    bonusMins: number;
    xpGained: number;
    flightDurationMs?: number;
    message: string;
  } | null>(null);
  const [isJuniorTabPaused, setIsJuniorTabPaused] = useState(false);
  const [isJuniorMissionPaused, setIsJuniorMissionPaused] = useState(false);
  const isJuniorMissionPausedRef = useRef(false);
  const [showJuniorCheatSheet, setShowJuniorCheatSheet] = useState(false);
  const [juniorMissionCountdown, setJuniorMissionCountdown] = useState<number | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  // ⏱️ Kumulierte Gesamt-Übezeit (Summe aller historischen fokus_logs + laufende Session-Minuten)
  const totalPracticeMinutes = useMemo(() => {
    const historicalMinutes = (practice.fokusLogs || []).reduce((sum: number, log: any) => {
      return sum + (log.duration_minutes || Math.floor((log.duration_seconds || 0) / 60));
    }, 0);
    const liveSessionMinutes = Math.floor(practice.secondsElapsed / 60);
    return historicalMinutes + liveSessionMinutes;
  }, [practice.fokusLogs, practice.secondsElapsed]);

  // 🏆 Autoritatives Unified Stickers Map (100% harmonisiert mit Übezeit, XP, Streak, Schuljahr)
  const unifiedStickersMap = useMemo(() => {
    const streak = streaks.avatar?.streak_flame || 0;
    const xp = streaks.avatar?.xp || 0;
    return getUnifiedStickersMap({
      practiceMinutes: totalPracticeMinutes,
      xp,
      streakDays: streak,
      progressItems,
      studentCreatedAt: studentUser?.created_at,
      activatedAt: studentUser?.activated_at,
      registeredAt: studentUser?.created_at,
      selectedSchoolYear: getSchoolYearString()
    });
  }, [streaks.avatar, totalPracticeMinutes, progressItems, studentUser]);

  // 🚀 Junior Space Mission: Auto-sync juniorMissionPhase mit practice.sessionActive
  useEffect(() => {
    if (studentUiLevel === 'junior') {
      if (practice.sessionActive && juniorMissionPhase === 'idle') {
        setJuniorMissionPhase('zen');
      } else if (!practice.sessionActive && juniorMissionPhase === 'zen' && juniorMissionCountdown === null) {
        setJuniorMissionPhase('idle');
      }
    }
  }, [studentUiLevel, practice.sessionActive, juniorMissionPhase, juniorMissionCountdown]);

  // Timers für kindgerechten 3-2-1 Start-Countdown
  const countdownTimersRef = useRef<any[]>([]);
  const clearCountdownTimers = useCallback(() => {
    countdownTimersRef.current.forEach(t => clearTimeout(t));
    countdownTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearCountdownTimers();
    };
  }, [clearCountdownTimers]);

  // Zwischenspeicher für neu freigeschalteten Sticker
  const pendingStickerAwardRef = useRef<any | null>(null);

  const getJuniorMissionDetails = useCallback(() => {
    return resolveJuniorMissionDetails({
      localProgress,
      lehrwerke,
      progressItems,
      activeSongSkills,
      assignedCampusSongs,
      studentId,
      studentUser
    });
  }, [localProgress, lehrwerke, progressItems, activeSongSkills, assignedCampusSongs, studentId, studentUser]);

  // 🚀 3-2-1 Zündungs-Countdown am Instrument mit klangvollen Zaubertönen
  const startJuniorMissionImmediately = useCallback(() => {
    clearCountdownTimers();
    setIsJuniorMissionPaused(false);
    isJuniorMissionPausedRef.current = false;
    setShowJuniorCheatSheet(false);
    setJuniorMissionPhase('zen');
    setJuniorMissionCountdown(3);
    playCelestialVictoryChime();

    const t1 = setTimeout(() => {
      setJuniorMissionCountdown(2);
      playCelestialVictoryChime();
    }, 1000);

    const t2 = setTimeout(() => {
      setJuniorMissionCountdown(1);
      playCelestialVictoryChime();
    }, 2000);

    const t3 = setTimeout(() => {
      setJuniorMissionCountdown(null);
      practice.setSessionActive(true);
    }, 3000);

    countdownTimersRef.current = [t1, t2, t3];
  }, [practice, clearCountdownTimers]);

  const handleFinishJuniorMission = useCallback(() => {
    clearCountdownTimers();
    setJuniorMissionCountdown(null);
    setIsJuniorMissionPaused(false);
    isJuniorMissionPausedRef.current = false;
    setShowJuniorCheatSheet(false);

    const elapsedSecs = practice.secondsElapsed;
    const streak = streaks.avatar?.streak_flame || 0;
    const targetMins = streaks.getTargetMinutes(streak);
    const missionInfo = getJuniorMissionDetails();

    const simNow = getSimulatedNow();
    const todayStr = toLocalYYYYMMDD(simNow);
    const abortBonusKey = `cg_abort_bonus_claimed_${studentId}_${todayStr}`;
    let alreadyClaimedAbortBonusToday = false;
    try {
      alreadyClaimedAbortBonusToday = localStorage.getItem(abortBonusKey) === 'true';
    } catch (e) {}

    const result = calculateJuniorMissionResult(
      elapsedSecs,
      targetMins,
      missionInfo.shortTitle,
      alreadyClaimedAbortBonusToday
    );

    if (result.shouldMarkAbortBonus) {
      try {
        localStorage.setItem(abortBonusKey, 'true');
      } catch (e) {}
    }

    if (result.tier === 1) {
      playRocketSputterSound();
    } else if (result.tier === 2) {
      playOrbitLaunchSound();
      playCelestialVictoryChime();
    } else {
      playHyperspaceWarpSound();
    }

    // 🎖️ Automatische Meilenstein-Detektion: Prüfen, ob durch diesen Flug ein neuer Sticker freigeschaltet wurde
    try {
      const seenKey = `cg_seen_sticker_awards_${studentId}`;
      let seenIds: string[] = [];
      const rawSeen = localStorage.getItem(seenKey);
      if (rawSeen) {
        try {
          seenIds = JSON.parse(rawSeen) || [];
        } catch {
          seenIds = [];
        }
      } else {
        seenIds = ALL_STICKERS.filter(st => unifiedStickersMap[st.id]?.isUnlocked).map(st => st.id);
        localStorage.setItem(seenKey, JSON.stringify(seenIds));
      }

      // Projizierter Status nach dieser Einheit
      const durationMinutes = Math.max(1, Math.floor(elapsedSecs / 60));
      const projectedTotalMins = totalPracticeMinutes + durationMinutes;
      const projectedXp = (streaks.avatar?.xp || 0) + result.xpBonus;
      const projectedStreak = result.tier >= 2 && streak === 0 ? 1 : streak;

      const projectedMap = getUnifiedStickersMap({
        practiceMinutes: projectedTotalMins,
        xp: projectedXp,
        streakDays: projectedStreak,
        progressItems,
        studentCreatedAt: studentUser?.created_at,
        activatedAt: studentUser?.activated_at,
        registeredAt: studentUser?.created_at,
        selectedSchoolYear: getSchoolYearString()
      });

      const newSticker = ALL_STICKERS.find(st => projectedMap[st.id]?.isUnlocked && !seenIds.includes(st.id));
      if (newSticker) {
        pendingStickerAwardRef.current = {
          ...newSticker,
          isUnlocked: true,
          progressText: projectedMap[newSticker.id]?.progressText || 'Freigeschaltet!'
        };
      } else {
        pendingStickerAwardRef.current = null;
      }
    } catch (e) {
      console.warn('Error checking sticker unlocks:', e);
      pendingStickerAwardRef.current = null;
    }

    setJuniorMissionTier(result.tier);
    setJuniorMissionPhase('celebrating');
    setJuniorLaunchStage('launching');
    setJuniorCelebrationSummary({
      elapsedSecs,
      targetMins,
      bonusMins: result.bonusMins,
      xpGained: result.xpBonus,
      flightDurationMs: result.flightDurationMs,
      message: result.msg
    });

    setTimeout(() => {
      setJuniorLaunchStage('summary');
      if (result.tier >= 2) {
        playCelestialVictoryChime();
      }
    }, result.flightDurationMs);

    setTimeout(async () => {
      await practice.finishPracticeSession(result.xpBonus);
    }, result.flightDurationMs + 1200);
  }, [
    streaks, 
    practice, 
    studentId, 
    getJuniorMissionDetails, 
    totalPracticeMinutes, 
    unifiedStickersMap, 
    progressItems, 
    studentUser, 
    clearCountdownTimers
  ]);

  const handleEmergencyExitJuniorMission = useCallback(() => {
    clearCountdownTimers();
    setJuniorMissionCountdown(null);
    setIsJuniorMissionPaused(false);
    isJuniorMissionPausedRef.current = false;
    setShowJuniorCheatSheet(false);
    setJuniorMissionPhase('idle');
    setJuniorLaunchStage('launching');
    setJuniorCelebrationSummary(null);
    practice.setSessionActive(false);
    practice.setSecondsElapsed(0);
    try {
      localStorage.removeItem('groovelab_active_practice_session');
    } catch (e) {}
  }, [practice, clearCountdownTimers]);

  const handleCloseJuniorCelebration = useCallback(() => {
    clearCountdownTimers();
    setJuniorMissionCountdown(null);
    setJuniorMissionPhase('idle');
    setJuniorLaunchStage('launching');
    setJuniorCelebrationSummary(null);
    practice.setSessionActive(false);
    practice.setSecondsElapsed(0);
    practice.setShowCelebration(false);
    setIsJuniorMissionPaused(false);
    isJuniorMissionPausedRef.current = false;
    setShowJuniorCheatSheet(false);
    try {
      localStorage.removeItem('groovelab_active_practice_session');
    } catch (e) {}

    // 🌟 Wenn während des Flugs ein Meilenstein-Sticker geknackt wurde: 3D Hologramm-Celebration öffnen!
    if (pendingStickerAwardRef.current) {
      const awarded = pendingStickerAwardRef.current;
      pendingStickerAwardRef.current = null;
      try {
        const seenKey = `cg_seen_sticker_awards_${studentId}`;
        const existing = JSON.parse(localStorage.getItem(seenKey) || '[]');
        if (!existing.includes(awarded.id)) {
          localStorage.setItem(seenKey, JSON.stringify([...existing, awarded.id]));
        }
      } catch (e) {}
      setJuniorAwardedStickerToCelebrate(awarded);
    }
  }, [practice, studentId, clearCountdownTimers]);

  return {
    showJuniorStickerModal,
    setShowJuniorStickerModal,
    juniorStickerCategory,
    setJuniorStickerCategory,
    juniorSelectedPreviewSticker,
    setJuniorSelectedPreviewSticker,
    juniorAwardedStickerToCelebrate,
    setJuniorAwardedStickerToCelebrate,
    showJuniorPreFlightModal,
    setShowJuniorPreFlightModal,
    juniorSelectedTrackIndex,
    setJuniorSelectedTrackIndex,
    juniorMissionPhase,
    setJuniorMissionPhase,
    juniorLaunchStage,
    setJuniorLaunchStage,
    juniorMissionTier,
    setJuniorMissionTier,
    juniorCelebrationSummary,
    setJuniorCelebrationSummary,
    isJuniorTabPaused,
    setIsJuniorTabPaused,
    isJuniorMissionPaused,
    setIsJuniorMissionPaused,
    isJuniorMissionPausedRef,
    showJuniorCheatSheet,
    setShowJuniorCheatSheet,
    juniorMissionCountdown,
    setJuniorMissionCountdown,
    expandedMonths,
    setExpandedMonths,
    totalPracticeMinutes,
    unifiedStickersMap,
    getJuniorMissionDetails,
    startJuniorMissionImmediately,
    handleFinishJuniorMission,
    handleEmergencyExitJuniorMission,
    handleCloseJuniorCelebration
  };
}
