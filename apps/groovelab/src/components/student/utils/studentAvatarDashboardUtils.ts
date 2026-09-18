import { WeeklyDayState, WeeklyStreakDay, WeeklyStreakMetrics } from '../studentAvatars.constants';
import { toLocalYYYYMMDD, getSimulatedNow } from '../studentDateUtils';

export const sanitizeTextInput = (text: string | null | undefined): string => {
  if (!text) return '';
  return String(text).trim();
};

export const cleanTitle = (t: string | null | undefined): string =>
  (t || '').replace(/\s*\((gitarre|guitar|e-gitarre|bass|e-bass|drums|schlagzeug|klavier|piano|keys|keyboard|vocals|gesang|stimme|allgemein)\)/i, '');

// Habit-Building & Kinderschutz Konstanten (DSA Art. 28 Compliance)
export const MIN_PRACTICE_SECONDS = 180; // 3 Minuten für Flamme/Qualifikation
export const MAX_WEEKLY_SHIELDS = 3;     // 3 Schutzschilde pro Woche

/**
 * Kindgerechte Streak & Schutzschild State Machine
 */
export function calculateWeeklyStreakState(
  now: Date,
  currentFokusLogs: any[],
  currentStudentId: string | null | undefined,
  currentStudentUser: any,
  isSessionActive: boolean,
  currentSecondsElapsed: number
): WeeklyStreakMetrics {
  const currentDay = now.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const dayNamesShort = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];
  const dayNamesFull = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

  // Map mastered dates across all logs
  const masteredDates = new Set<string>();
  const logsByDateStr: Record<string, any[]> = {};

  (currentFokusLogs || []).forEach(log => {
    if (!log.created_at) return;
    const dStr = toLocalYYYYMMDD(new Date(log.created_at));
    if (!logsByDateStr[dStr]) logsByDateStr[dStr] = [];
    logsByDateStr[dStr].push(log);

    const isMastered = !log.is_extra && (log.duration_seconds >= MIN_PRACTICE_SECONDS || (log.duration_minutes || 0) >= 3);
    if (isMastered) masteredDates.add(dStr);
  });

  // Check streak entering this week (before Monday)
  let initialStreak = 0;
  let checkPriorDate = new Date(monday);
  checkPriorDate.setDate(checkPriorDate.getDate() - 1);
  const priorSundayStr = toLocalYYYYMMDD(checkPriorDate);
  
  let priorShieldDatesArr: string[] = [];
  try {
    priorShieldDatesArr = JSON.parse(localStorage.getItem(`cg_shield_usage_dates_${currentStudentId}`) || '[]');
    if (!Array.isArray(priorShieldDatesArr)) priorShieldDatesArr = [];
  } catch (e) {
    priorShieldDatesArr = [];
  }
  const priorShieldDatesSet = new Set(priorShieldDatesArr);
  if (currentStudentUser?.joker_used_at) {
    priorShieldDatesSet.add(toLocalYYYYMMDD(new Date(currentStudentUser.joker_used_at)));
  }

  if (masteredDates.has(priorSundayStr) || priorShieldDatesSet.has(priorSundayStr)) {
    if (masteredDates.has(priorSundayStr)) {
      initialStreak = 1;
    }
    while (true) {
      checkPriorDate.setDate(checkPriorDate.getDate() - 1);
      const prevStr = toLocalYYYYMMDD(checkPriorDate);
      if (masteredDates.has(prevStr)) {
        initialStreak += 1;
      } else if (priorShieldDatesSet.has(prevStr)) {
        continue;
      } else {
        break;
      }
    }
  }

  let runningStreak = initialStreak;
  const weekDays: WeeklyStreakDay[] = [];
  let weekPracticedCount = 0;
  let weekShieldedCount = 0;
  let weekTotalSeconds = 0;
  let consumedShieldsCount = 0;
  const newlyShieldedDates: string[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dStr = toLocalYYYYMMDD(d);

    const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    const isFuture = d > now && !isToday;

    const dayLogs = logsByDateStr[dStr] || [];
    let totalDaySecs = dayLogs.reduce((sum, log) => {
      return sum + (log.duration_seconds || ((log.duration_minutes || 0) * 60));
    }, 0);

    if (isToday && isSessionActive && currentSecondsElapsed > 0) {
      totalDaySecs += currentSecondsElapsed;
    }

    const hasMastered = dayLogs.some(log => !log.is_extra && (log.duration_seconds >= MIN_PRACTICE_SECONDS || (log.duration_minutes || 0) >= 3)) || totalDaySecs >= MIN_PRACTICE_SECONDS;
    
    let isJoker = false;
    let shieldNumber = 0;
    let dayState: WeeklyDayState = 'future';

    if (isToday) {
      if (hasMastered) {
        dayState = 'mastered';
        runningStreak += 1;
        weekPracticedCount += 1;
      } else {
        dayState = 'today_standby';
      }
    } else if (isFuture) {
      dayState = 'future';
    } else {
      // Past day (Montag bis gestern)
      if (hasMastered) {
        dayState = 'mastered';
        runningStreak += 1;
        weekPracticedCount += 1;
      } else {
        // Versäumter Tag ohne Übung
        if (runningStreak > 0 && consumedShieldsCount < MAX_WEEKLY_SHIELDS) {
          consumedShieldsCount += 1;
          weekShieldedCount += 1;
          isJoker = true;
          shieldNumber = consumedShieldsCount;
          dayState = 'shielded';
          newlyShieldedDates.push(dStr);
        } else {
          dayState = 'pause';
          // Soft Decay nach DSA Art. 28
          runningStreak = Math.max(0, runningStreak - 1);
        }
      }
    }

    weekTotalSeconds += totalDaySecs;

    weekDays.push({
      dayName: dayNamesShort[i],
      dayFullName: dayNamesFull[d.getDay()],
      dayNumber: d.getDate(),
      dateStr: dStr,
      isToday,
      isFuture,
      totalDaySecs,
      totalMins: Math.floor(totalDaySecs / 60),
      hasMastered,
      isJoker,
      shieldNumber,
      dayState
    });
  }

  const availableShields = Math.max(0, MAX_WEEKLY_SHIELDS - consumedShieldsCount);
  const calculatedStreak = runningStreak;

  return {
    monday,
    now,
    weekDays,
    weekPracticedCount,
    weekShieldedCount,
    weekTotalSeconds,
    weekTotalMins: Math.floor(weekTotalSeconds / 60),
    consumedShieldsCount,
    availableShields,
    calculatedStreak,
    newlyShieldedDates
  };
}
