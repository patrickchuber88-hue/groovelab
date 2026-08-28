/**
 * Campus-Groovelab Shared Ground-Truth Student Progress Engine
 * 
 * Provides single-source-of-truth mathematical calculation and synchronization
 * for student XP, streak flame, daily focus time, mastered songs, and lehrwerke.
 * Used identically across:
 * - QR Landing Page (Mobile Practice Companion)
 * - Student Avatar Dashboard (WebApp Desktop & Tablet)
 * - Campus Mobile PWA App
 */

export interface StudentProgressMetrics {
  totalXp: number;
  streakFlame: number;
  totalFocusSeconds: number;
  totalFocusMinutes: number;
  todayFocusSeconds: number;
  todayExtraSeconds: number;
  todayTotalSeconds: number;
  todayTotalMinutes: number;
  hasCompletedTargetToday: boolean;
  activeFlameLevel: 'Helden-Feuer' | 'Mittlere Flamme' | 'Kleine Flamme' | 'Keine Flamme';
  masteredSongsCount: number;
  masteredPagesCount: number;
  masteredDates: string[];
}

export interface ComputeProgressParams {
  fokusLogs?: any[];
  songSkills?: any[];
  progressMatrix?: any[];
  user?: any;
  avatar?: any;
  stats?: any;
  simulatedDate?: Date;
  targetMinutes?: number;
  shieldDates?: string[] | Set<string>;
}

export const DEFAULT_FOKUS_LEVELS = {
  level1: { kleine: 3, mittlere: 5, helden: 10 },
  level2: { kleine: 5, mittlere: 10, helden: 15 },
  level3: { kleine: 10, mittlere: 15, helden: 20 }
};

/**
 * Computes the effective evolution level for a student.
 * 
 * CORE RULE (Age-Agnostic Streak Progression):
 * - ALL students start in Level 1 (evolution_level = 1).
 * - Progression into Level 2 (5/10/15m) requires consistent streak habit (streak >= 14 days OR practiceMinutes >= 250 OR trimesterPracticedDays >= 20).
 * - Progression into Level 3 (10/15/20m) requires long-term mastery (streak >= 45 days OR practiceMinutes >= 1000 OR trimesterPracticedDays >= 45).
 * - dbLevel acts as a permanent threshold floor (no de-leveling).
 */
export const getEngineEffectiveLevel = (
  dbLevel: number = 1,
  totalPracticeMinutes: number = 0,
  currentStreak: number = 0,
  trimesterPracticedDays: number = 0
): number => {
  const baseLevel = Math.max(1, Math.min(3, Number(dbLevel) || 1));
  let earnedLevel = 1;
  if (totalPracticeMinutes >= 1000 || currentStreak >= 45 || trimesterPracticedDays >= 45) {
    earnedLevel = 3;
  } else if (totalPracticeMinutes >= 250 || currentStreak >= 14 || trimesterPracticedDays >= 20) {
    earnedLevel = 2;
  }
  return Math.max(baseLevel, earnedLevel);
};

export const getEngineFlameCategory = (streak: number): 'kleine' | 'mittlere' | 'helden' => {
  if (streak >= 9) return 'helden';
  if (streak >= 4) return 'mittlere';
  return 'kleine';
};

export const getEngineTargetMinutes = (
  level: number = 1,
  streak: number = 0,
  schoolFokusLevels?: any
): number => {
  const normalizedLevel = Math.max(1, Math.min(3, level || 1));
  const cat = getEngineFlameCategory(streak);
  const config = schoolFokusLevels || DEFAULT_FOKUS_LEVELS;
  const levelKey = `level${normalizedLevel}` as 'level1' | 'level2' | 'level3';
  const levelConfig = config[levelKey] || DEFAULT_FOKUS_LEVELS[levelKey];
  return levelConfig[cat] || DEFAULT_FOKUS_LEVELS[levelKey][cat];
};

/**
 * Returns current simulated date or real date from localStorage
 */
export const getEngineSimulatedNow = (): Date => {
  try {
    const simDateStr = localStorage.getItem('groovelab_simulated_date');
    if (simDateStr) {
      const parts = simDateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const simDate = new Date(y, m, d);
        const startTsStr = localStorage.getItem('groovelab_simulated_start_timestamp');
        const startTs = startTsStr ? parseInt(startTsStr, 10) : null;
        if (startTs) {
          const elapsed = Date.now() - startTs;
          return new Date(simDate.getTime() + elapsed);
        }
        const realNow = new Date();
        simDate.setHours(realNow.getHours(), realNow.getMinutes(), realNow.getSeconds(), realNow.getMilliseconds());
        return simDate;
      }
    }
  } catch (e) {}
  return new Date();
};

/**
 * Formats a Date object to YYYY-MM-DD in local time
 */
export const toEngineYYYYMMDD = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Returns ISO week number for a given date
 */
export const getEngineISOWeek = (d: Date): number => {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return Math.ceil((firstThursday - target.valueOf()) / 604800000) + 1;
};

/**
 * Calculates days difference between two YYYY-MM-DD strings
 */
export const getEngineDaysBetween = (d1: string, d2: string): number => {
  const dt1 = new Date(d1 + 'T12:00:00');
  const dt2 = new Date(d2 + 'T12:00:00');
  return Math.round((dt2.getTime() - dt1.getTime()) / 86400000);
};

/**
 * Returns flame level name from streak count
 */
export const getEngineFlameLevelName = (streak: number): 'Helden-Feuer' | 'Mittlere Flamme' | 'Kleine Flamme' | 'Keine Flamme' => {
  if (streak >= 9) return 'Helden-Feuer';
  if (streak >= 4) return 'Mittlere Flamme';
  if (streak >= 1) return 'Kleine Flamme';
  return 'Keine Flamme';
};

/**
 * Extracts mastered songs set from song skills and progress matrix
 */
export const getMasteredSongsSet = (songSkills?: any[], progressMatrix?: any[]): Set<string> => {
  const masteredSongs = new Set<string>();

  (songSkills || []).forEach(skill => {
    if (skill.is_stage_ready || skill.progress_percent === 100 || skill.status === 'MASTERED') {
      const title = skill.songs?.title || skill.title || skill.song_title;
      if (title) masteredSongs.add(String(title).toLowerCase().trim());
    }
  });

  (progressMatrix || []).forEach(item => {
    const rawTopic = String(item.topic_name || item.title || '').trim();
    if (!rawTopic || rawTopic.includes(' - Seite ') || rawTopic.startsWith('Hausaufgabe KW ') || rawTopic.toLowerCase().startsWith('test')) return;
    if (item.status === 'MASTERED' || (item.progress_percent || 0) === 100) {
      const cleanT = rawTopic.replace(/\s*\([^)]*\)\s*$/, '').trim();
      if (cleanT) masteredSongs.add(cleanT.toLowerCase());
    }
  });

  return masteredSongs;
};

/**
 * Extracts mastered lehrwerk pages set from progress matrix
 */
export const getMasteredPagesSet = (progressMatrix?: any[]): Set<string> => {
  const masteredPages = new Set<string>();

  (progressMatrix || []).forEach(item => {
    const rawTopic = String(item.topic_name || item.title || '').trim();
    if (rawTopic.includes(' - Seite ') && (item.status === 'MASTERED' || (item.progress_percent || 0) === 100)) {
      masteredPages.add(rawTopic.toLowerCase());
    }
  });

  return masteredPages;
};

/**
 * Single Source of Truth: Computes ground-truth progress metrics
 */
export function computeGroundTruthMetrics({
  fokusLogs = [],
  songSkills = [],
  progressMatrix = [],
  user,
  avatar,
  stats,
  simulatedDate,
  targetMinutes = 3,
  shieldDates
}: ComputeProgressParams): StudentProgressMetrics {
  const now = simulatedDate || getEngineSimulatedNow();
  const todayStr = toEngineYYYYMMDD(now);

  // Merge any local logs from localStorage for offline/local simulation resilience
  let mergedLogs: any[] = [...(fokusLogs || [])];
  const candidateIds = new Set<string>();
  if (user?.id) candidateIds.add(String(user.id));
  if (stats?.student_id) candidateIds.add(String(stats.student_id));
  if (avatar?.user_id) candidateIds.add(String(avatar.user_id));

  try {
    if (typeof window !== 'undefined') {
      candidateIds.forEach(id => {
        const localLogsKey = `cg_local_fokus_logs_${id}`;
        const localLogs = JSON.parse(localStorage.getItem(localLogsKey) || '[]');
        if (Array.isArray(localLogs) && localLogs.length > 0) {
          const remoteIds = new Set(mergedLogs.map((l: any) => l.id));
          const missing = localLogs.filter((l: any) => l && l.id && !remoteIds.has(l.id));
          mergedLogs = [...missing, ...mergedLogs];
        }
      });
    }
  } catch (e) {}

  // 1. Compute XP from all logs
  const computedXpFromLogs = mergedLogs.reduce((sum: number, log: any) => {
    if (log.xp_earned) return sum + log.xp_earned;
    const isMastered = !log.is_extra && ((log.duration_seconds || 0) >= 180 || (log.duration_minutes || 0) >= 3);
    const extraMins = log.is_extra ? Math.floor((log.duration_seconds || ((log.duration_minutes || 0) * 60)) / 60) : 0;
    return sum + (isMastered ? 3 : 0) + extraMins;
  }, 0);

  // 2. Compute XP from Mastered Songs (+50 XP) & Pages (+10 XP)
  const masteredSongsSet = getMasteredSongsSet(songSkills, progressMatrix);
  const masteredPagesSet = getMasteredPagesSet(progressMatrix);
  const songsXp = masteredSongsSet.size * 50;
  const lehrwerkPagesXp = masteredPagesSet.size * 10;
  
  let offlineXp = 0;
  let offlineStreak = 0;
  let offlineTotalFocus = 0;
  try {
    if (typeof window !== 'undefined') {
      candidateIds.forEach(id => {
        const s = JSON.parse(localStorage.getItem(`cg_offline_stats_${id}`) || 'null');
        if (s) {
          if (s.current_xp) offlineXp = Math.max(offlineXp, s.current_xp);
          if (s.streak_flame) offlineStreak = Math.max(offlineStreak, s.streak_flame);
          if (s.total_focus_minutes) offlineTotalFocus = Math.max(offlineTotalFocus, s.total_focus_minutes);
        }
        const p = JSON.parse(localStorage.getItem(`cg_offline_practice_${id}`) || 'null');
        if (p) {
          if (p.xp) offlineXp = Math.max(offlineXp, p.xp);
          if (p.streak_flame) offlineStreak = Math.max(offlineStreak, p.streak_flame);
          if (p.total_focus_minutes) offlineTotalFocus = Math.max(offlineTotalFocus, p.total_focus_minutes);
        }
      });
    }
  } catch (e) {}

  const groundTruthTotalXp = Math.max(
    avatar?.xp || 0,
    stats?.current_xp || 0,
    offlineXp,
    computedXpFromLogs + songsXp + lehrwerkPagesXp
  );

  // 3. Compute distinct mastered dates
  const masteredDatesSet = new Set<string>();
  mergedLogs.forEach((log: any) => {
    if (!log.created_at) return;
    const dStr = toEngineYYYYMMDD(new Date(log.created_at));
    const isMastered = !log.is_extra && ((log.duration_seconds || 0) >= 180 || (log.duration_minutes || 0) >= 3);
    if (isMastered) masteredDatesSet.add(dStr);
  });

  // 4. Compute deterministic streak from logs & shield bridges
  const shieldDatesSet = new Set<string>();
  if (shieldDates) {
    if (Array.isArray(shieldDates)) {
      shieldDates.forEach(d => shieldDatesSet.add(d));
    } else if (shieldDates instanceof Set) {
      shieldDates.forEach(d => shieldDatesSet.add(d));
    }
  }
  if (user?.joker_used_at) {
    shieldDatesSet.add(toEngineYYYYMMDD(new Date(user.joker_used_at)));
  }
  try {
    if (typeof window !== 'undefined') {
      candidateIds.forEach(id => {
        const localShields = JSON.parse(localStorage.getItem(`cg_shield_usage_dates_${id}`) || '[]');
        if (Array.isArray(localShields)) {
          localShields.forEach((d: string) => shieldDatesSet.add(d));
        }
      });
    }
  } catch (e) {}

  let computedStreak = 0;
  let checkDate = new Date(now);
  let checkDateStr = toEngineYYYYMMDD(checkDate);

  if (masteredDatesSet.has(checkDateStr)) {
    computedStreak = 1;
    while (true) {
      checkDate.setDate(checkDate.getDate() - 1);
      const prevStr = toEngineYYYYMMDD(checkDate);
      if (masteredDatesSet.has(prevStr)) {
        computedStreak += 1;
      } else if (shieldDatesSet.has(prevStr)) {
        // Shielded day preserves streak continuity (bridge)
        continue;
      } else {
        break;
      }
    }
  } else {
    checkDate.setDate(checkDate.getDate() - 1);
    const yestStr = toEngineYYYYMMDD(checkDate);
    if (masteredDatesSet.has(yestStr) || shieldDatesSet.has(yestStr)) {
      if (masteredDatesSet.has(yestStr)) {
        computedStreak = 1;
      }
      while (true) {
        checkDate.setDate(checkDate.getDate() - 1);
        const prevStr = toEngineYYYYMMDD(checkDate);
        if (masteredDatesSet.has(prevStr)) {
          computedStreak += 1;
        } else if (shieldDatesSet.has(prevStr)) {
          // Shielded day preserves streak continuity (bridge)
          continue;
        } else {
          break;
        }
      }
    }
  }

  // Fallback to avatar/stats streak if higher and valid
  const finalStreak = Math.max(computedStreak, avatar?.streak_flame || 0, stats?.streak_flame || 0, offlineStreak);

  // 5. Compute today's practice seconds & minutes
  const todayLogs = mergedLogs.filter((log: any) => log.created_at && toEngineYYYYMMDD(new Date(log.created_at)) === todayStr);
  
  let todayFocusSecs = 0;
  let todayExtraSecs = 0;

  todayLogs.forEach((log: any) => {
    const secs = log.duration_seconds || ((log.duration_minutes || 0) * 60);
    if (log.is_extra) {
      todayExtraSecs += secs;
    } else {
      todayFocusSecs += secs;
    }
  });

  const todayTotalSecs = todayFocusSecs + todayExtraSecs;
  const todayTotalMins = Math.round(todayTotalSecs / 60);

  // 6. Compute total all-time focus seconds & minutes
  const totalFocusSecs = mergedLogs.reduce((sum: number, log: any) => {
    return sum + (log.duration_seconds || ((log.duration_minutes || 0) * 60));
  }, 0);
  const totalFocusMins = Math.max(stats?.total_focus_minutes || 0, offlineTotalFocus, Math.round(totalFocusSecs / 60));

  // 7. Check if daily target is completed
  const hasCompletedTargetToday = (
    todayFocusSecs >= targetMinutes * 60 ||
    todayLogs.some((l: any) => (l.duration_seconds || 0) >= targetMinutes * 60 || (l.duration_minutes || 0) >= targetMinutes) ||
    masteredDatesSet.has(todayStr)
  );

  return {
    totalXp: groundTruthTotalXp,
    streakFlame: finalStreak,
    totalFocusSeconds: totalFocusSecs,
    totalFocusMinutes: totalFocusMins,
    todayFocusSeconds: todayFocusSecs,
    todayExtraSeconds: todayExtraSecs,
    todayTotalSeconds: todayTotalSecs,
    todayTotalMinutes: todayTotalMins,
    hasCompletedTargetToday,
    activeFlameLevel: getEngineFlameLevelName(finalStreak),
    masteredSongsCount: masteredSongsSet.size,
    masteredPagesCount: masteredPagesSet.size,
    masteredDates: Array.from(masteredDatesSet).sort()
  };
}

/**
 * Realtime broadcast helper: notifies all open tabs and components
 */
export function broadcastPracticeUpdate(studentId: string, payload?: any) {
  try {
    // 1. BroadcastChannel for cross-tab sync (< 5ms)
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(`cg_practice_sync_${studentId}`);
      channel.postMessage({
        type: 'PRACTICE_UPDATED',
        studentId,
        timestamp: Date.now(),
        payload
      });
      channel.close();
    }
  } catch (e) {}

  try {
    // 2. DOM CustomEvent for in-window component sync
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cg_practice_updated', {
        detail: { studentId, timestamp: Date.now(), payload }
      }));
    }
  } catch (e) {}
}

/**
 * Calculates remaining available shields for the current week (max 3 per week)
 */
export function getAvailableShieldsCount(user: any, simulatedDate?: Date): number {
  const now = simulatedDate || getEngineSimulatedNow();
  const currentWeek = getEngineISOWeek(now);
  const lastJokerWeek = user?.joker_used_at ? getEngineISOWeek(new Date(user.joker_used_at)) : null;
  const usedThisWeek = lastJokerWeek === currentWeek ? (user?.weekly_jokers_used || 1) : 0;
  return Math.max(0, 3 - usedThisWeek);
}

