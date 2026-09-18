import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  Avatar, 
  WeeklyStreakMetrics, 
  getLevelProgress 
} from '../studentAvatars.constants';
import { 
  toLocalYYYYMMDD, 
  getSimulatedNow, 
  getISOWeek 
} from '../studentDateUtils';
import { 
  calculateWeeklyStreakState 
} from '../utils/studentAvatarDashboardUtils';
import { resolveCampusStudentAvatar } from '../../StudioAvatar';

interface UseStudentStreaksProps {
  studentId: string;
  studentUser: any;
  fokusLogs: any[];
  sessionActive: boolean;
  secondsElapsed: number;
  onRefreshStudentAndAvatar?: () => Promise<void>;
}

export function useStudentStreaks({
  studentId,
  studentUser,
  fokusLogs,
  sessionActive,
  secondsElapsed,
  onRefreshStudentAndAvatar
}: UseStudentStreaksProps) {
  const [avatarFromDb, setAvatar] = useState<Avatar | null>(null);
  const [hasMasteryCrown, setHasMasteryCrown] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`campus_mastery_complete_${studentId}`) === 'true' ||
        localStorage.getItem(`campus_mastery_complete_${studentUser?.id}`) === 'true';
    } catch {
      return false;
    }
  });

  const avatar: Avatar = useMemo(() => {
    return avatarFromDb || {
      avatar_style: 'standard',
      instrument_type: studentUser?.resolved_instrument || studentUser?.instrument || 'Guitar',
      evolution_level: 1,
      xp: 0,
      asset_path: resolveCampusStudentAvatar(studentUser),
      streak_flame: 0
    };
  }, [avatarFromDb, studentUser]);

  const currentLevel = avatar.evolution_level || 1;
  const currentXp = avatar.xp || 0;
  const { levelTitle, prevThreshold, nextThreshold, xpPercentage } = useMemo(() => {
    return getLevelProgress(currentLevel, currentXp, avatar.instrument_type);
  }, [currentLevel, currentXp, avatar.instrument_type]);

  // Circular progress calculations for fit style ring
  const circleRadius = 70;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (xpPercentage / 100) * circleCircumference;

  // Streak & Target states
  const [hasCompletedTargetToday, setHasCompletedTargetToday] = useState<boolean>(false);
  const streakFlamesCount = avatar?.streak_flame || 0;
  const flamesActive = streakFlamesCount > 0;

  const getTargetMinutes = useCallback((streak: number): number => {
    if (streak >= 14) return 20;
    if (streak >= 7) return 15;
    if (streak >= 3) return 10;
    return 5;
  }, []);

  const getDeterministicWeekMetrics = useCallback((): WeeklyStreakMetrics => {
    return calculateWeeklyStreakState(
      getSimulatedNow(),
      fokusLogs,
      studentId,
      studentUser,
      sessionActive,
      secondsElapsed
    );
  }, [fokusLogs, studentId, studentUser, sessionActive, secondsElapsed]);

  const handleUseJoker = async (dateStr: string) => {
    if (!studentId || !studentUser) return;
    
    const nowSim = getSimulatedNow();
    const currentWeek = getISOWeek(nowSim);
    const lastJokerWeek = studentUser?.joker_used_at ? getISOWeek(new Date(studentUser.joker_used_at)) : null;
    const usedJokersThisWeek = lastJokerWeek === currentWeek ? (studentUser?.weekly_jokers_used || 1) : 0;
    const availableShields = Math.max(0, 3 - usedJokersThisWeek);
    
    if (availableShields <= 0) {
      alert('Du hast alle 3 Schutzschilde für diese Woche bereits verbraucht!');
      return;
    }

    if (!window.confirm(`Möchtest du ein Schutzschild für den ${dateStr} einsetzen, um deinen Streak zu sichern? (Noch ${availableShields} von 3 Schilden verfügbar)`)) {
      return;
    }

    try {
      const parts = dateStr.split('.');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = 2000 + parseInt(parts[2], 10);
      const jokerDate = new Date(year, month, day, 12, 0, 0);
      const jokerDateStr = toLocalYYYYMMDD(jokerDate);

      let shieldDatesArr: string[] = [];
      try {
        shieldDatesArr = JSON.parse(localStorage.getItem(`cg_shield_usage_dates_${studentId}`) || '[]');
        if (!Array.isArray(shieldDatesArr)) shieldDatesArr = [];
      } catch (e) {
        shieldDatesArr = [];
      }
      if (!shieldDatesArr.includes(jokerDateStr)) {
        shieldDatesArr.push(jokerDateStr);
      }
      try {
        localStorage.setItem(`cg_shield_usage_dates_${studentId}`, JSON.stringify(shieldDatesArr));
      } catch (e) {}

      const newWeeklyUsed = Math.min(3, usedJokersThisWeek + 1);

      const { error: userErr } = await supabase
        .from('users')
        .update({ 
          joker_used_at: jokerDate.toISOString(),
          weekly_jokers_used: newWeeklyUsed
        })
        .eq('id', studentId);

      if (userErr) throw userErr;

      studentUser.joker_used_at = jokerDate.toISOString();
      studentUser.weekly_jokers_used = newWeeklyUsed;

      const currentStreak = avatar?.streak_flame || 0;
      const newStreak = currentStreak === 0 ? 1 : currentStreak;
      
      const { error: avatarErr } = await supabase
        .from('avatars')
        .update({ streak_flame: newStreak })
        .eq('user_id', studentId);

      if (avatarErr) throw avatarErr;

      if (onRefreshStudentAndAvatar) {
        await onRefreshStudentAndAvatar();
      }
    } catch (err) {
      console.error('Error using shield:', err);
      alert('Fehler beim Einsetzen des Schutzschildes. Bitte versuche es erneut.');
    }
  };

  const checkAndAutoApplyJoker = async (groupedList: any[]) => {
    if (!studentId || !studentUser || !avatar) return;

    const currentStreak = avatar?.streak_flame || 0;
    if (currentStreak <= 0) return;

    const nowSim = getSimulatedNow();
    const currentWeek = getISOWeek(nowSim);
    const lastJokerWeek = studentUser?.joker_used_at ? getISOWeek(new Date(studentUser.joker_used_at)) : null;
    const usedJokersThisWeek = lastJokerWeek === currentWeek ? (studentUser?.weekly_jokers_used || 1) : 0;
    const availableShields = Math.max(0, 3 - usedJokersThisWeek);

    if (availableShields <= 0) return;

    // Check if yesterday or previous days need shield
    const metrics = getDeterministicWeekMetrics();
    if (metrics.newlyShieldedDates.length > 0) {
      try {
        const latestShieldDateStr = metrics.newlyShieldedDates[metrics.newlyShieldedDates.length - 1];
        const parts = latestShieldDateStr.split('-');
        const shieldDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);

        const newWeeklyUsed = Math.min(3, usedJokersThisWeek + 1);
        await supabase
          .from('users')
          .update({
            joker_used_at: shieldDate.toISOString(),
            weekly_jokers_used: newWeeklyUsed
          })
          .eq('id', studentId);

        studentUser.joker_used_at = shieldDate.toISOString();
        studentUser.weekly_jokers_used = newWeeklyUsed;
      } catch (err) {
        console.warn('Auto shield application notice:', err);
      }
    }
  };

  return {
    avatar,
    setAvatar,
    hasMasteryCrown,
    setHasMasteryCrown,
    currentLevel,
    currentXp,
    levelTitle,
    prevThreshold,
    nextThreshold,
    xpPercentage,
    circleRadius,
    circleCircumference,
    strokeDashoffset,
    flamesActive,
    streakFlamesCount,
    hasCompletedTargetToday,
    setHasCompletedTargetToday,
    getTargetMinutes,
    getDeterministicWeekMetrics,
    handleUseJoker,
    checkAndAutoApplyJoker
  };
}
