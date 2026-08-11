import { SupabaseClient } from '@supabase/supabase-js';
import type { Student, DayBoard } from '../components/ScheduleBoard';

export type { Student, DayBoard };

export interface SolverParams {
  unassignedStudents: Student[];
  boards: DayBoard[];
  supabase: SupabaseClient;
  blockedSlots?: any[];
  otherTeachersSchedules?: any[];
  teacherAvailability?: Record<number, { start?: string; end?: string }>;
  recalculateBoardTimesFn: (board: DayBoard, priorityCardId?: string) => DayBoard;
  onProgress?: (progressPct: number, stageText: string) => void;
}

export interface SolverPlan {
  boardsState: DayBoard[];
  newlyAssignedMap: Record<string, { day: number; time: string }>;
  totalAssignedCount: number;
  wunschHits: number;
  studentsWithWunsch: number;
  theoreticalMaxWunschHits: number;
  gapCount: number;
  totalGapsMin: number;
}

export interface SolverResult {
  planWunschzeit: SolverPlan;
  planLueckenlos: SolverPlan;
  bestBoardsState: DayBoard[];
  newlyAssignedMap: Record<string, { day: number; time: string }>;
  totalAssignedCount: number;
  wunschHits: number;
  studentsWithWunsch: number;
  theoreticalMaxWunschHits: number;
  gapCount: number;
  totalGapsMin: number;
}

function parseTime(timeStr: string): [number, number] {
  if (!timeStr) return [0, 0];
  const parts = timeStr.split(':');
  return [parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0];
}

function snapTimeToGridHelper(timeStr: string, snapMinutes: number = 15): string {
  if (!timeStr) return timeStr;
  const [hours, minutes] = parseTime(timeStr);
  const totalMinutes = hours * 60 + minutes;
  const snappedMinutes = Math.round(totalMinutes / snapMinutes) * snapMinutes;
  const snappedHours = Math.floor(snappedMinutes / 60) % 24;
  const snappedMins = snappedMinutes % 60;
  return `${String(snappedHours).padStart(2, '0')}:${String(snappedMins).padStart(2, '0')}`;
}

function addMinutesToTimeHelper(timeStr: string, minutesToAdd: number): string {
  const [hours, minutes] = parseTime(timeStr);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseDayNumber(dayInput: any): number {
  if (typeof dayInput === 'number') return dayInput;
  if (!dayInput) return 1;
  const map: Record<string, number> = {
    'Montag': 1, 'Dienstag': 2, 'Mittwoch': 3, 'Donnerstag': 4, 'Freitag': 5, 'Samstag': 6, 'Sonntag': 7
  };
  return map[String(dayInput).trim()] || parseInt(String(dayInput), 10) || 1;
}

function getPrefStartEndMinutes(pref: any): { startMin: number; endMin: number } {
  const [sh, sm] = parseTime(pref.start_time || '00:00');
  const [eh, em] = parseTime(pref.end_time || '23:59');
  return { startMin: sh * 60 + sm, endMin: eh * 60 + em };
}

/**
 * 🌟 Academic 15-Stage Schedule Solver Engine Container
 * Encapsulates and protects all 15 solver stages from UI & DND side-effects.
 */
export async function run15StageSolver(params: SolverParams): Promise<SolverResult> {
  const {
    unassignedStudents,
    boards,
    supabase,
    blockedSlots = [],
    otherTeachersSchedules = [],
    teacherAvailability = {},
    recalculateBoardTimesFn,
    onProgress
  } = params;

  if (unassignedStudents.length === 0 || boards.length === 0) {
    const emptyPlan: SolverPlan = {
      boardsState: boards,
      newlyAssignedMap: {},
      totalAssignedCount: 0,
      wunschHits: 0,
      studentsWithWunsch: 0,
      theoreticalMaxWunschHits: 0,
      gapCount: 0,
      totalGapsMin: 0
    };
    return {
      planWunschzeit: emptyPlan,
      planLueckenlos: emptyPlan,
      bestBoardsState: boards,
      newlyAssignedMap: {},
      totalAssignedCount: 0,
      wunschHits: 0,
      studentsWithWunsch: 0,
      theoreticalMaxWunschHits: 0,
      gapCount: 0,
      totalGapsMin: 0
    };
  }

  const studentUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  const rawStudentIds: string[] = [];
  unassignedStudents.forEach(s => {
    if (s.id) {
      const cleanId = s.id.startsWith('group-') ? s.id.replace('group-', '') : s.id;
      if (studentUuidRegex.test(cleanId)) rawStudentIds.push(cleanId);
    }
    if (s.groupStudents && Array.isArray(s.groupStudents)) {
      s.groupStudents.forEach((gs: any) => {
        if (gs.id) {
          const cleanGsId = gs.id.startsWith('group-') ? gs.id.replace('group-', '') : gs.id;
          if (studentUuidRegex.test(cleanGsId)) rawStudentIds.push(cleanGsId);
        }
      });
    }
  });

  const studentIds = Array.from(new Set(rawStudentIds));

  // Fetch preferences for the active students
  let prefs: any[] = [];
  if (studentIds.length > 0) {
    const { data, error } = await supabase
      .from('student_schedule_preferences')
      .select('*')
      .in('student_id', studentIds);

    if (error) throw error;
    prefs = data || [];
  }

  const prefsByStudentId: Record<string, any[]> = {};
  unassignedStudents.forEach(s => { prefsByStudentId[s.id] = []; });

  prefs?.forEach(p => {
    if (!p.student_id) return;
    unassignedStudents.forEach(s => {
      if (s.id === p.student_id) {
        prefsByStudentId[s.id].push(p);
      } else if (s.isGroup && s.groupStudents && s.groupStudents.some((gs: any) => gs.id === p.student_id)) {
        prefsByStudentId[s.id].push(p);
      }
    });
  });

  // STUFE 1: PRE-COMPUTATION LOOKUP-MAPS FOR O(1) INSTANT LOOKUPS
  const precomputedWunschMap = new Map<string, Array<{ startMin: number; endMin: number }>>();
  const precomputedBlockedMap = new Map<string, Array<{ startMin: number; endMin: number }>>();
  const hasWunschPrefMap = new Map<string, boolean>();
  const hasSperrzeitPrefMap = new Map<string, boolean>();

  unassignedStudents.forEach((stud: Student) => {
    const sPrefs = prefsByStudentId[stud.id] || [];
    hasWunschPrefMap.set(stud.id, sPrefs.some(p => p.preference_type === 'wunsch'));
    hasSperrzeitPrefMap.set(stud.id, sPrefs.some(p => p.preference_type === 'gesperrt'));

    [1, 2, 3, 4, 5, 6, 7].forEach(dayNum => {
      const key = `${stud.id}_${dayNum}`;
      
      const blocked = sPrefs
        .filter(p => p.preference_type === 'gesperrt' && parseDayNumber(p.day_of_week) === dayNum)
        .map(p => getPrefStartEndMinutes(p));
      precomputedBlockedMap.set(key, blocked);

      const wunsch = sPrefs
        .filter(p => p.preference_type === 'wunsch' && parseDayNumber(p.day_of_week) === dayNum)
        .map(p => getPrefStartEndMinutes(p))
        .sort((a, b) => a.startMin - b.startMin);
      
      const mergedWunsch: Array<{ startMin: number; endMin: number }> = [];
      for (const w of wunsch) {
        if (mergedWunsch.length === 0) mergedWunsch.push({ ...w });
        else {
          const last = mergedWunsch[mergedWunsch.length - 1];
          if (w.startMin <= last.endMin) last.endMin = Math.max(last.endMin, w.endMin);
          else mergedWunsch.push({ ...w });
        }
      }
      precomputedWunschMap.set(key, mergedWunsch);
    });
  });

  const isSlotBlockedForStudent = (studentId: string, dayOfWeek: number, startMin: number, endMin: number) => {
    const key = `${studentId}_${parseDayNumber(dayOfWeek)}`;
    const blockedList = precomputedBlockedMap.get(key);
    if (!blockedList || blockedList.length === 0) return false;
    for (let i = 0; i < blockedList.length; i++) {
      if (startMin < blockedList[i].endMin && endMin > blockedList[i].startMin) {
        return true;
      }
    }
    return false;
  };

  const getMergedStudentWunschWindows = (studentId: string, dayOfWeek: number) => {
    const key = `${studentId}_${parseDayNumber(dayOfWeek)}`;
    return precomputedWunschMap.get(key) || [];
  };

  const calculateBlockedDuration = (studentPrefs: any[]) => {
    let totalMinutes = 0;
    for (const p of studentPrefs) {
      if (p.preference_type === 'gesperrt') {
        const { startMin, endMin } = getPrefStartEndMinutes(p);
        totalMinutes += Math.max(0, endMin - startMin);
      }
    }
    return totalMinutes;
  };

  const calculateWunschDuration = (studentPrefs: any[]) => {
    let totalMinutes = 0;
    for (const p of studentPrefs) {
      if (p.preference_type === 'wunsch') {
        const { startMin, endMin } = getPrefStartEndMinutes(p);
        totalMinutes += Math.max(0, endMin - startMin);
      }
    }
    return totalMinutes;
  };

  // STUFE 2: MINIMUM REMAINING VALUES (MRV) CONSTRAINT COMPLEXITY RANKING INDEX
  const calculateMRVDifficultyIndex = (stud: Student) => {
    const sPrefs = prefsByStudentId[stud.id] || [];
    const blockedMinutes = calculateBlockedDuration(sPrefs);
    const wunschMinutes = calculateWunschDuration(sPrefs);
    const siblingBonus = stud.sibling_group_id ? 100000 : 0;
    
    // Tighter wish window = Much higher difficulty penalty (prioritized placement)
    const wunschPenalty = wunschMinutes > 0 ? (2000000 / (wunschMinutes + 1)) : 0;
    const blockedBonus = (blockedMinutes / 60) * 20000;
    const durationBonus = stud.duration * 200;

    return wunschPenalty + blockedBonus + siblingBonus + durationBonus;
  };

  const flexibleStudents = unassignedStudents.filter(s => {
    const hasPrefs = prefsByStudentId[s.id] && prefsByStudentId[s.id].length > 0;
    const hasSib = !!s.sibling_group_id;
    return !hasPrefs && !hasSib;
  });

  const wunschStudents = unassignedStudents.filter(s => {
    const sPrefs = prefsByStudentId[s.id] || [];
    const hasDirectWunsch = sPrefs.some(p => p.preference_type === 'wunsch');
    const hasSiblingWunsch = s.sibling_group_id && unassignedStudents.some(other => 
      other.sibling_group_id === s.sibling_group_id && (prefsByStudentId[other.id] || []).some(p => p.preference_type === 'wunsch')
    );
    return hasDirectWunsch || hasSiblingWunsch;
  });

  const sperrzeitStudents = unassignedStudents.filter(s => {
    const sPrefs = prefsByStudentId[s.id] || [];
    const hasWunsch = sPrefs.some(p => p.preference_type === 'wunsch');
    const hasPrefs = sPrefs.length > 0;
    const hasSib = !!s.sibling_group_id;
    return !hasWunsch && (hasPrefs || hasSib);
  });

  wunschStudents.sort((a, b) => {
    const aScore = calculateMRVDifficultyIndex(a);
    const bScore = calculateMRVDifficultyIndex(b);
    if (aScore !== bScore) return bScore - aScore;
    return b.duration - a.duration;
  });

  const getSperrzeitScore = (s: any) => {
    const sSiblingBonus = s.sibling_group_id ? 100000 : 0;
    const sPrefs = prefsByStudentId[s.id] || [];
    const sBlockedMinutes = calculateBlockedDuration(sPrefs);
    const sConstraintScore = (sBlockedMinutes / 60) * 20000;
    return sSiblingBonus + sConstraintScore + (s.duration * 200);
  };

  sperrzeitStudents.sort((a, b) => {
    const aScore = getSperrzeitScore(a);
    const bScore = getSperrzeitScore(b);
    if (aScore !== bScore) return bScore - aScore;
    return a.first_name.localeCompare(b.first_name);
  });

  flexibleStudents.sort((a, b) => b.duration - a.duration);

  const SOLVER_TIERS = {
    ASSIGNMENT_PRIORITY: 10000000, // Prio 1: 100% Einteilungsquote (Kein Schüler bleibt unplatziert)
    SIBLING_MATCH: 5000000,        // Prio 2: Geschwister-Paare direkt hintereinander / am selben Tag
    WUNSCHZEIT_HIT: 1000000,       // Prio 3: Maximale Wunschzeiten-Erfüllung
    GAP_COMPACTION: 50000,         // Prio 4: Lückenlosigkeit & Kompaktheit (Max. 15 Min Lücke)
    NEUTRAL_ASSIGNMENT: 1000
  } as const;

  const evaluateFullBoardScore = (b: DayBoard) => {
    let score = 0;
    let gapCountOnBoard = 0;
    const boardStudents = b.students.filter(s => !s.isBreak && s.assignedTime);
    for (let i = 0; i < boardStudents.length; i++) {
      const s = boardStudents[i];
      const [sh, sm] = parseTime(s.assignedTime!);
      const startMin = sh * 60 + sm;
      const endMin = startMin + (s.duration || 30);

      score += SOLVER_TIERS.ASSIGNMENT_PRIORITY;

      const wBonus = calculateWunschBonus(s.id, b.dayOfWeek, startMin, endMin);
      score += wBonus;

      score += calculateSlotFitness(b, startMin, endMin);
      score += siblingMatchBonus(s, b, startMin, endMin);

      // Strict Gap Evaluation: Gaps > 15 min are heavily penalized (-100.000.000 pts)
      if (i > 0) {
        const prevS = boardStudents[i - 1];
        if (prevS.assignedTime) {
          const [psh, psm] = parseTime(prevS.assignedTime);
          const prevEndMin = psh * 60 + psm + (prevS.duration || 30);
          const gap = startMin - prevEndMin;
          if (gap > 15) {
            score -= 100000000 + (gap - 15) * 500000; // Fatal penalty: Gaps > 15 min strictly prohibited!
          } else if (gap > 0) {
            gapCountOnBoard++;
            score -= gap * 10000; // Small penalty for gaps <= 15 min to encourage contiguous scheduling
          }
        }
      }
    }

    // Max 1 Lücke pro Unterrichtstag: Force solver to evaluate other days first before creating a 2nd gap on this day!
    if (gapCountOnBoard > 1) {
      score -= 500000000 * (gapCountOnBoard - 1);
    }

    return score;
  };

  const shuffleArray = (arr: any[]) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // STUFE 1: Theoretical Upper Bound (W_max) Calculation
  let theoreticalMaxWunschHits = 0;
  wunschStudents.forEach(stud => {
    let studentCanHitWunsch = false;
    boards.forEach(board => {
      const mergedWindows = getMergedStudentWunschWindows(stud.id, board.dayOfWeek);
      mergedWindows.forEach(w => {
        for (let min = w.startMin; min + stud.duration <= w.endMin; min += 15) {
          if (!isSlotBlockedForStudent(stud.id, board.dayOfWeek, min, min + stud.duration)) {
            studentCanHitWunsch = true;
          }
        }
      });
    });
    if (studentCanHitWunsch) {
      theoreticalMaxWunschHits++;
    }
  });

  let bestWunschHits = 0;
  let bestStudentsWithWunsch = wunschStudents.length;
  let bestGapCount = 0;
  let bestTotalGapsMin = 0;
  let maxWunschHitsFound = 0;

  let bestWunschScore = -Infinity;
  let bestLueckenScore = -Infinity;

  let bestWunschPlan: SolverPlan | null = null;
  let bestLueckenPlan: SolverPlan | null = null;

  // Grandmaster 5000 Monte-Carlo Fuzzing Iterations
  const RUN_ITERATIONS = 5000;
  let bestGlobalScore = -Infinity;
  let bestBoardsState: DayBoard[] = boards;
  let bestNewlyAssigned: Record<string, { day: number; time: string }> = {};

  // STUFE 4: WUNSCHZEIT BONUS CALCULATOR (DOMINANT PRIORITY)
  const calculateWunschBonus = (studentId: string, dayOfWeek: number, startMin: number, endMin: number) => {
    const mergedWindows = getMergedStudentWunschWindows(studentId, dayOfWeek);
    for (const window of mergedWindows) {
      if (startMin >= window.startMin && endMin <= window.endMin) {
        if (startMin === window.startMin) {
          return SOLVER_TIERS.WUNSCHZEIT_HIT * 3; // 🌟 3.000.000 pts for exact start match!
        }
        return SOLVER_TIERS.WUNSCHZEIT_HIT * 2; // 🌟 2.000.000 pts for inside window hit!
      } else if (startMin < window.endMin && endMin > window.startMin) {
        return SOLVER_TIERS.WUNSCHZEIT_HIT; // 🌟 1.000.000 pts for partial overlap!
      }
    }
    return 0;
  };

  // STUFE 5 & 6 & 7 & 8: SLOT FITNESS, GAP COMPACTION & LOAD BALANCING
  const calculateSlotFitness = (board: any, startMin: number, endMin: number) => {
    let score = 0;
    
    // STUFE 5: Teacher Availability Shield
    const [bh, bm] = parseTime(board.startAnchor);
    const boardStartMin = bh * 60 + bm;
    const [beh, bem] = parseTime(board.availabilityEnd || '23:59');
    const boardEndMin = beh * 60 + bem;
    
    if (startMin < boardStartMin || endMin > boardEndMin) {
      return -9999999;
    }

    // Room Collision Shield
    if (board.roomId) {
      const hasBlockedConflict = blockedSlots.some((s: any) => {
        if (s.room_id !== board.roomId || Number(s.day_of_week) !== Number(board.dayOfWeek)) return false;
        const { startMin: bStart, endMin: bEnd } = getPrefStartEndMinutes(s);
        return (startMin < bEnd && endMin > bStart);
      });
      if (hasBlockedConflict) return -9999999;

      const hasOtherTeacherConflict = otherTeachersSchedules.some((os: any) => {
        if (Number(os.day_of_week) !== Number(board.dayOfWeek) || os.room_id !== board.roomId) return false;
        const [osh, osm] = parseTime(os.time_slot);
        const oStart = osh * 60 + osm;
        const oEnd = oStart + (os.duration || 30);
        return (startMin < oEnd && endMin > oStart);
      });
      if (hasOtherTeacherConflict) return -9999999;
    }

    // STUFE 7: Continuous Instruction & Break Monitoring (> 180 min penalty)
    let currentContinuousMins = 0;
    for (const s of board.students) {
      if (s.isBreak) {
        currentContinuousMins = 0;
      } else {
        currentContinuousMins += s.duration;
      }
    }
    if (currentContinuousMins + (endMin - startMin) > 180) {
      score -= 25000;
    }

    let lueckenlos = false;
    let gapBefore = 0;
    let gapAfter = 0;

    // STUFE 8: Multi-Day Load Balancing
    let totalAssignedMinutes = 0;
    for (const s of board.students) {
      totalAssignedMinutes += s.duration;
    }
    score -= totalAssignedMinutes * 15;

    let closestEndBefore = boardStartMin;
    let closestStartAfter = boardEndMin;

    if (board.students.length === 0) {
      gapBefore = startMin - boardStartMin;
      if (gapBefore === 0) lueckenlos = true;
    } else {
      for (const s of board.students) {
        if (!s.assignedTime) continue;
        const [sh, sm] = parseTime(s.assignedTime);
        const sStart = sh * 60 + sm;
        const sEnd = sStart + s.duration;
        
        if (sEnd <= startMin && sEnd > closestEndBefore) {
          closestEndBefore = sEnd;
        }
        if (sStart >= endMin && sStart < closestStartAfter) {
          closestStartAfter = sStart;
        }
      }

      gapBefore = startMin - closestEndBefore;
      gapAfter = closestStartAfter - endMin;

      if (gapBefore === 0 || gapAfter === 0) lueckenlos = true;
    }

    // STUFE 6: Lückenlos Compaction & Jackpot Internal Gap Filler
    if (lueckenlos) {
      score += SOLVER_TIERS.GAP_COMPACTION;
      if (gapBefore === 0 && gapAfter === 0 && closestEndBefore > boardStartMin && closestStartAfter < boardEndMin) {
        score += 600000; // 🌟 GRANDMASTER JACKPOT BONUS for filling an exact gap!
      }
    } else {
      const isInternalGapBefore = gapBefore > 0 && closestEndBefore > boardStartMin;
      const isInternalGapAfter = gapAfter > 0 && closestStartAfter < boardEndMin;
      const isStartGapBefore = gapBefore > 0 && closestEndBefore === boardStartMin;
      
      // 1. Interne Lücken (zwischen zwei Schülern) = SCHWERSTE STRAFE
      if (isInternalGapBefore) score -= Math.floor(gapBefore / 15) * Math.floor(SOLVER_TIERS.GAP_COMPACTION / 2);
      if (isInternalGapAfter) score -= Math.floor(gapAfter / 15) * Math.floor(SOLVER_TIERS.GAP_COMPACTION / 2);

      // 2. Start-Lücken (vor dem 1. Schüler des Tages) = MITTLERE STRAFE (Lieber am Ende frei als am Anfang!)
      if (isStartGapBefore) score -= Math.floor(gapBefore / 15) * 15000;

      // 3. End-Lücken (nach dem letzten Schüler) = 0 STRAFE (PERFEKT!)
    }

    return score;
  };

  // STUFE 3: GRANDMASTER SIBLING COORDINATION ENGINE
  const siblingMatchBonus = (student: any, board: any, startMin: number, endMin: number) => {
    if (!student.sibling_group_id) return 0;
    for (const s of board.students) {
      if (s.id !== student.id && s.sibling_group_id === student.sibling_group_id && s.assignedTime) {
        const [ssh, ssm] = parseTime(s.assignedTime);
        const sStart = ssh * 60 + ssm;
        const sEnd = sStart + s.duration;
        
        // Exact Back-to-Back Match
        if (startMin === sEnd || endMin === sStart) {
          return 1000000; // 1.000.000 Bonus for exact back-to-back sibling match!
        }
        // Same-Day Proximity Match (within 30 mins)
        if (Math.abs(startMin - sEnd) <= 30 || Math.abs(endMin - sStart) <= 30) {
          return 250000;
        }
        return 100000;
      }
    }
    return 0;
  };

  // REUSABLE DEEP INTER-BOARD CROSS-SWAP RESCUE PASS
  const performDeepCrossSwapRescue = (boardsState: DayBoard[], newlyAssignedMap: Record<string, { day: number; time: string }>) => {
    let anySwapped = false;
    for (const b1 of boardsState) {
      for (let i = 0; i < b1.students.length; i++) {
        const s1 = b1.students[i];
        if (s1.isBreak || !s1.assignedTime) continue;
        const [s1h, s1m] = parseTime(s1.assignedTime);
        const s1Start = s1h * 60 + s1m;
        const s1End = s1Start + s1.duration;
        const hasWunsch1 = (hasWunschPrefMap.get(s1.id) || false);
        const isHit1 = calculateWunschBonus(s1.id, b1.dayOfWeek, s1Start, s1End) > 0;

        if (hasWunsch1 && !isHit1) {
          let itemSwapped = false;
          for (const b2 of boardsState) {
            if (itemSwapped) break;
            for (let j = 0; j < b2.students.length; j++) {
              const s2 = b2.students[j];
              if (s2.isBreak || !s2.assignedTime) continue;
              const hasWunsch2 = (hasWunschPrefMap.get(s2.id) || false);

              if (!hasWunsch2 && s1.duration === s2.duration) {
                const [s2h, s2m] = parseTime(s2.assignedTime);
                const s2Start = s2h * 60 + s2m;
                const s2End = s2Start + s2.duration;

                const wunschBonusOnB2 = calculateWunschBonus(s1.id, b2.dayOfWeek, s2Start, s2End);
                const blockedOnB2 = isSlotBlockedForStudent(s1.id, b2.dayOfWeek, s2Start, s2End);
                const blockedOnB1 = isSlotBlockedForStudent(s2.id, b1.dayOfWeek, s1Start, s1End);

                if (wunschBonusOnB2 > 0 && !blockedOnB2 && !blockedOnB1) {
                  const t1Time = s1.assignedTime;
                  const t2Time = s2.assignedTime;

                  b1.students[i] = { ...s2, assignedDay: b1.dayOfWeek, assignedTime: t1Time, customStartTime: t1Time };
                  b2.students[j] = { ...s1, assignedDay: b2.dayOfWeek, assignedTime: t2Time, customStartTime: t2Time };

                  b1.students = recalculateBoardTimesFn(b1).students;
                  b2.students = recalculateBoardTimesFn(b2).students;

                  newlyAssignedMap[s1.id] = { day: b2.dayOfWeek, time: t2Time };
                  newlyAssignedMap[s2.id] = { day: b1.dayOfWeek, time: t1Time };

                  itemSwapped = true;
                  anySwapped = true;
                  break;
                }
              }
            }
          }
        }
      }
    }
    return anySwapped;
  };

  // STUFE 10: 5000-ITERATION MONTE-CARLO FUZZING & OPTIMIZATION LOOP
  const PASS_1_LIMIT = Math.floor(RUN_ITERATIONS * 0.5); // 2500 Iterationen (50% von 5000)
  for (let iteration = 0; iteration < RUN_ITERATIONS; iteration++) {
    if (onProgress && iteration % 150 === 0) {
      const pct = Math.min(85, Math.round(25 + (iteration / RUN_ITERATIONS) * 60));
      onProgress(pct, `Phase 3 von 4: Grandmaster Ring-Tausch (${iteration}/${RUN_ITERATIONS})...`);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    const currentBoards: DayBoard[] = boards.map(b => {
      const dayConfig = (teacherAvailability as any)[b.dayOfWeek];
      return {
        ...b,
        startAnchor: dayConfig?.start || b.startAnchor || '14:00',
        availabilityEnd: dayConfig?.end || b.availabilityEnd || '19:00',
        students: b.students.filter(s => s.isBreak)
      };
    });
    const newlyAssignedStudentIds: Record<string, { day: number; time: string }> = {};

    const fuzzedWunschStudents = iteration === 0 ? [...wunschStudents] : shuffleArray(wunschStudents);
    const fuzzedSperrzeitStudents = iteration === 0 ? [...sperrzeitStudents] : shuffleArray(sperrzeitStudents);
    const fuzzedFlexibleStudents = iteration === 0 ? [...flexibleStudents] : shuffleArray(flexibleStudents);

    const assignStudents = (studentsList: any[], isPhase3: boolean, isEmergencySweep = false) => {
      for (const student of studentsList) {
        let bestCandidate: { boardId: string; insertIndex: number; customStartTime?: string; score: number } | null = null;
        let highestScore = -Infinity;

        if (!isPhase3) {
          for (const board of currentBoards) {
            const mergedWindows = getMergedStudentWunschWindows(student.id, board.dayOfWeek);
            for (const window of mergedWindows) {
              const prefStartMin = window.startMin;
              const prefEndMin = window.endMin;

              const [bh, bm] = parseTime(board.startAnchor);
              const boardStartMin = bh * 60 + bm;
              const [beh, bem] = parseTime(board.availabilityEnd || '23:59');
              let boardEndMin = beh * 60 + bem;
              if (isEmergencySweep) boardEndMin = Math.max(boardEndMin, 20 * 60);

              const searchStartMin = Math.max(boardStartMin, prefStartMin - 30);
              const searchEndMin = Math.min(boardEndMin, prefEndMin + 30);
              for (let candidateMin = searchStartMin; candidateMin + student.duration <= searchEndMin; candidateMin += 15) {
                const candidateEndMin = candidateMin + student.duration;

                if (isSlotBlockedForStudent(student.id, board.dayOfWeek, candidateMin, candidateEndMin)) continue;
                if (candidateMin < boardStartMin || candidateEndMin > boardEndMin) continue;

                // Preserve candidateStartStr anchor to lock candidateMin inside Wunschzeit window
                let candidateStartStr: string | undefined = `${String(Math.floor(candidateMin / 60)).padStart(2, '0')}:${String(candidateMin % 60).padStart(2, '0')}`;
                const mergedWunsch = getMergedStudentWunschWindows(student.id, board.dayOfWeek);
                const isInsideWunsch = mergedWunsch.some(w => candidateMin >= w.startMin && candidateMin + student.duration <= w.endMin);

                // Only wipe customStartTime if NOT inside a Wunschzeit window and seamlessly adjacent to previous slot
                if (!isInsideWunsch && candidateMin > boardStartMin && !isSlotBlockedForStudent(student.id, board.dayOfWeek, candidateMin - 15, candidateMin)) {
                  candidateStartStr = undefined;
                }

                let testInsertPos = board.students.length;
                for (let i = 0; i < board.students.length; i++) {
                  if (board.students[i].assignedTime) {
                    const [sh, sm] = parseTime(board.students[i].assignedTime!);
                    if (candidateMin < sh * 60 + sm) {
                      testInsertPos = i;
                      break;
                    }
                  }
                }
                const tempStudentsTest = [...board.students];
                tempStudentsTest.splice(testInsertPos, 0, { ...student, assignedDay: board.dayOfWeek, customStartTime: candidateStartStr });
                const tempBoardTest = recalculateBoardTimesFn({ ...board, students: tempStudentsTest });
                
                let boardSperrzeitConflict = false;
                for (const bs of tempBoardTest.students) {
                  if (bs.isBreak || !bs.assignedTime) continue;
                  const [bsh, bsm] = parseTime(bs.assignedTime);
                  const bsStart = bsh * 60 + bsm;
                  const bsEnd = bsStart + bs.duration;
                  if (isSlotBlockedForStudent(bs.id, board.dayOfWeek, bsStart, bsEnd)) {
                    boardSperrzeitConflict = true;
                    break;
                  }
                }
                if (boardSperrzeitConflict) continue;

                const lastStudent = tempBoardTest.students[tempBoardTest.students.length - 1];
                if (lastStudent && lastStudent.assignedTime) {
                  const [lsh, lsm] = parseTime(lastStudent.assignedTime);
                  if (lsh * 60 + lsm + lastStudent.duration > boardEndMin) {
                    continue;
                  }
                }

                const prevBoardScore = evaluateFullBoardScore(board);
                const newBoardScore = evaluateFullBoardScore(tempBoardTest);
                const deltaScore = newBoardScore - prevBoardScore;

                if (deltaScore > highestScore) {
                  let insertPos = board.students.length;
                  for (let i = 0; i < board.students.length; i++) {
                    if (board.students[i].assignedTime) {
                      const [sh, sm] = parseTime(board.students[i].assignedTime!);
                      if (candidateMin < sh * 60 + sm) {
                        insertPos = i;
                        break;
                      }
                    }
                  }
                  highestScore = deltaScore;
                  bestCandidate = { boardId: board.id, insertIndex: insertPos, customStartTime: candidateStartStr, score: deltaScore };
                }
              }
            }
          }
        }

        // STUFE 9: Neutral Slot Fallback
        if (!bestCandidate) {
          for (const board of currentBoards) {
            const studentCount = board.students.length;
            for (let pos = 0; pos <= studentCount; pos++) {
              const prevStud = pos > 0 ? board.students[pos - 1] : null;
              const nextStud = pos < studentCount ? board.students[pos] : null;
              
              const customTimesToTest: Array<string | undefined> = [undefined];
              if (prevStud && nextStud && prevStud.assignedTime && nextStud.assignedTime) {
                const [psh, psm] = parseTime(prevStud.assignedTime);
                const pEndMin = psh * 60 + psm + prevStud.duration;
                const [nsh, nsm] = parseTime(nextStud.assignedTime);
                const nStartMin = nsh * 60 + nsm;
                if (nStartMin - pEndMin >= student.duration) {
                  const gapStartStr = `${String(Math.floor(pEndMin / 60)).padStart(2, '0')}:${String(pEndMin % 60).padStart(2, '0')}`;
                  customTimesToTest.push(gapStartStr);
                }
              }

              for (const candidateCustomStart of customTimesToTest) {
                const tempStudents = [...board.students];
                tempStudents.splice(pos, 0, { ...student, assignedDay: board.dayOfWeek, customStartTime: candidateCustomStart });
                const tempBoard = recalculateBoardTimesFn({ ...board, students: tempStudents });

                const newlyPlaced = tempBoard.students.find(s => s.id === student.id);
                if (!newlyPlaced || !newlyPlaced.assignedTime) continue;

                const [sh, sm] = parseTime(newlyPlaced.assignedTime);
                const startMin = sh * 60 + sm;
                const endMin = startMin + student.duration;

                if (isSlotBlockedForStudent(student.id, board.dayOfWeek, startMin, endMin)) continue;

                let sperrzeitConflict = false;
                for (const bs of tempBoard.students) {
                  if (bs.isBreak || !bs.assignedTime) continue;
                  const [bsh, bsm] = parseTime(bs.assignedTime);
                  const bsStart = bsh * 60 + bsm;
                  const bsEnd = bsStart + bs.duration;
                  if (isSlotBlockedForStudent(bs.id, board.dayOfWeek, bsStart, bsEnd)) {
                    sperrzeitConflict = true;
                    break;
                  }
                }
                if (sperrzeitConflict) continue;

                const [bh, bm] = parseTime(board.startAnchor);
                const boardStartMin = bh * 60 + bm;
                const [beh, bem] = parseTime(board.availabilityEnd || '23:59');
                let boardEndMin = beh * 60 + bem;
                if (isEmergencySweep) boardEndMin = Math.max(boardEndMin, 20 * 60);

                const lastStudent = tempBoard.students[tempBoard.students.length - 1];
                if (lastStudent && lastStudent.assignedTime) {
                  const [lsh, lsm] = parseTime(lastStudent.assignedTime);
                  if (lsh * 60 + lsm + lastStudent.duration > boardEndMin) continue;
                }

                const wunschBonus = calculateWunschBonus(student.id, board.dayOfWeek, startMin, endMin);
                const fitnessScore = calculateSlotFitness(board, startMin, endMin);
                const sibBonus = siblingMatchBonus(student, board, startMin, endMin);
                let totalScore = wunschBonus + fitnessScore + sibBonus + SOLVER_TIERS.NEUTRAL_ASSIGNMENT;

                const isFlexibleStudent = !hasWunschPrefMap.get(student.id);
                if (isFlexibleStudent && fitnessScore > 500000) {
                  totalScore += 5000000; // 🌟 Master Bonus: Flexible student bridges an exact gap between two Wunschzeit blocks!
                }

                if (totalScore > highestScore) {
                  highestScore = totalScore;
                  bestCandidate = { boardId: board.id, insertIndex: pos, customStartTime: candidateCustomStart, score: totalScore };
                }
              }
            }
          }
        }

        if (bestCandidate) {
          const bIdx = currentBoards.findIndex(b => b.id === bestCandidate!.boardId);
          if (bIdx !== -1) {
            const boardToUpdate = currentBoards[bIdx];
            const nextStudents = [...boardToUpdate.students];
            nextStudents.splice(bestCandidate.insertIndex, 0, {
              ...student,
              assignedDay: boardToUpdate.dayOfWeek,
              customStartTime: bestCandidate.customStartTime
            });

            currentBoards[bIdx] = recalculateBoardTimesFn({ ...boardToUpdate, students: nextStudents });
            const placed = currentBoards[bIdx].students.find(s => s.id === student.id);
            if (placed && placed.assignedTime) {
              newlyAssignedStudentIds[student.id] = { day: boardToUpdate.dayOfWeek, time: placed.assignedTime };
            }
          }
        }
      }
    };

    assignStudents(fuzzedWunschStudents, false, false);
    assignStudents(fuzzedSperrzeitStudents, false, false);
    assignStudents(fuzzedFlexibleStudents, true, false);

    // STUFE 11: MULTI-PHASE EMERGENCY SWEEP & INTER-BOARD DEEP CROSS-SWAP RESCUE PASS
    const assignedCount = unassignedStudents.filter(s => !!newlyAssignedStudentIds[s.id]).length;
    if (assignedCount < unassignedStudents.length) {
      const remainingUnassigned = unassignedStudents.filter(s => !newlyAssignedStudentIds[s.id]);
      assignStudents(remainingUnassigned, true, true);
    }

    // Checkpoint 1 (Stufe 11): Inter-Board Deep Cross-Swap Rescue
    performDeepCrossSwapRescue(currentBoards, newlyAssignedStudentIds);

    // STUFE 11 & 12: GLOBAL FITNESS SCORING, SIBLING & WUNSCHZEIT TARGET ENFORCEMENT
    let totalAssignedCount = 0;
    let iterationScore = 0;
    let wunschHits = 0;
    let totalInternalGapMinutes = 0;
    let totalGapCount = 0;

    const assignedSiblingMap: Record<string, number> = {};

    for (const b of currentBoards) {
      const boardStudents = b.students
        .filter(s => !s.isBreak && s.assignedTime)
        .sort((a, b) => {
          const [ah, am] = parseTime(a.assignedTime!);
          const [bh, bm] = parseTime(b.assignedTime!);
          return (ah * 60 + am) - (bh * 60 + bm);
        });
      let dayGapCount = 0;

      for (let i = 0; i < boardStudents.length; i++) {
        const s = boardStudents[i];
        totalAssignedCount++;

        if (s.sibling_group_id) {
          assignedSiblingMap[s.sibling_group_id] = (assignedSiblingMap[s.sibling_group_id] || 0) + 1;
        }

        const [sh, sm] = parseTime(s.assignedTime!);
        const startMin = sh * 60 + sm;
        const endMin = startMin + s.duration;

        iterationScore += SOLVER_TIERS.ASSIGNMENT_PRIORITY;

        const wBonus = calculateWunschBonus(s.id, b.dayOfWeek, startMin, endMin);
        if (wBonus > 0) wunschHits++;
        iterationScore += wBonus;

        iterationScore += calculateSlotFitness(b, startMin, endMin);
        iterationScore += siblingMatchBonus(s, b, startMin, endMin);

        // Track internal gaps between consecutive lessons
        if (i > 0) {
          const prevS = boardStudents[i - 1];
          const [psh, psm] = parseTime(prevS.assignedTime!);
          const prevEndMin = psh * 60 + psm + prevS.duration;
          const gap = startMin - prevEndMin;
          if (gap > 0) {
            totalGapCount++;
            dayGapCount++;
            totalInternalGapMinutes += gap;

            // Internal Gaps within a day are FATAL: Shift any offset to day start or end!
            iterationScore -= 50000000;

            // Anti-Sandwich Protection: Prevent a single student from being trapped between 2 gaps on the same day!
            if (i >= 2) {
              const prevPrevS = boardStudents[i - 2];
              const [ppsh, ppsm] = parseTime(prevPrevS.assignedTime!);
              const prevPrevEndMin = ppsh * 60 + ppsm + prevPrevS.duration;
              const gapBeforePrev = (psh * 60 + psm) - prevPrevEndMin;
              if (gapBeforePrev > 0) {
                // prevS was isolated between two gaps on the same day!
                iterationScore -= 20000000;
              }
            }
          }
        }
      }

      // Max 1 Lücke pro Unterrichtstag rule: Heavy penalty if a single day has > 1 gap
      if (dayGapCount > 1) {
        iterationScore -= 500000000 * (dayGapCount - 1);
      }

      // 15-Minuten Start-Verzögerungs-Strafe: Jede 15 Minuten Verspätung ab Schichtbeginn wird streng bestraft!
      if (boardStudents.length > 0) {
        const firstS = boardStudents[0];
        const [fsh, fsm] = parseTime(firstS.assignedTime!);
        const firstStartMin = fsh * 60 + fsm;
        const dayConfig = (teacherAvailability as any)[b.dayOfWeek];
        const teacherStartAnchorStr = (typeof dayConfig === 'string' ? dayConfig : (dayConfig?.start || dayConfig?.start_time)) || b.startAnchor || '13:00';
        const [bh, bm] = parseTime(teacherStartAnchorStr);
        const boardStartMin = bh * 60 + bm;
        if (firstStartMin > boardStartMin) {
          const startGapMin = firstStartMin - boardStartMin;
          const units15Min = Math.ceil(startGapMin / 15);
          iterationScore -= units15Min * 250000; // 250.000 Strafe pro 15 Minuten Verspätung!
        }
      }
    }

    // STUFE 12: 2-PASS GUIDED LOCAL SEARCH ENFORCEMENT
    // 1. Complete Sibling Family Placement Bonus (+2.000.000 pts)
    Object.keys(assignedSiblingMap).forEach(sibId => {
      const totalSiblingsInGroup = unassignedStudents.filter(s => s.sibling_group_id === sibId).length;
      if (assignedSiblingMap[sibId] >= totalSiblingsInGroup && totalSiblingsInGroup > 1) {
        iterationScore += 2000000;
      }
    });

    // 2. Track maximum Wunschzeit hits found across early exploration phase (Pass 1: 0 - 2500 Iterations)
    if (iteration < PASS_1_LIMIT) {
      if (wunschHits > maxWunschHitsFound) {
        maxWunschHitsFound = wunschHits;
      }
    } else {
      // Pass 2 (2500 - 5000 Iterations): Strictly penalize any iteration that drops below maxWunschHitsFound!
      if (wunschHits < maxWunschHitsFound) {
        iterationScore -= 100000000; // Disqualify states that sacrifice Wunschzeiten!
      }
    }

    // Track best Wunschzeit Plan (Max Wunschzeiten focus)
    const wunschPlanScore = (wunschHits * 10000000) - (totalGapCount * 100000) - totalInternalGapMinutes;
    if (wunschPlanScore > bestWunschScore) {
      bestWunschScore = wunschPlanScore;
      bestWunschPlan = {
        boardsState: currentBoards.map(b => recalculateBoardTimesFn(b)),
        newlyAssignedMap: { ...newlyAssignedStudentIds },
        totalAssignedCount: Object.keys(newlyAssignedStudentIds).length,
        wunschHits,
        studentsWithWunsch: wunschStudents.length,
        theoreticalMaxWunschHits,
        gapCount: totalGapCount,
        totalGapsMin: totalInternalGapMinutes
      };
    }

    // Track best Lückenlos Plan (Zero / Minimum Gaps focus)
    const lueckenPlanScore = (totalAssignedCount * 10000000) - (totalGapCount * 1000000) - (totalInternalGapMinutes * 5000) + (wunschHits * 10000);
    if (lueckenPlanScore > bestLueckenScore) {
      bestLueckenScore = lueckenPlanScore;
      bestLueckenPlan = {
        boardsState: currentBoards.map(b => recalculateBoardTimesFn(b)),
        newlyAssignedMap: { ...newlyAssignedStudentIds },
        totalAssignedCount: Object.keys(newlyAssignedStudentIds).length,
        wunschHits,
        studentsWithWunsch: wunschStudents.length,
        theoreticalMaxWunschHits,
        gapCount: totalGapCount,
        totalGapsMin: totalInternalGapMinutes
      };
    }

    if (iterationScore > bestGlobalScore) {
      bestGlobalScore = iterationScore;
      bestBoardsState = currentBoards;
      bestNewlyAssigned = { ...newlyAssignedStudentIds };
      bestWunschHits = wunschHits;
      bestStudentsWithWunsch = wunschStudents.length;
      bestGapCount = totalGapCount;
      bestTotalGapsMin = totalInternalGapMinutes;
    }

    // PERFECT SCORE EARLY CONVERGENCE (Perf-Triad Optimization):
    // If 100% Wunschzeiten and 0 Min Gaps are achieved, exit early!
    if (wunschHits >= theoreticalMaxWunschHits && totalInternalGapMinutes === 0 && iteration >= 50) {
      if (onProgress) {
        onProgress(90, `⚡ Gold-Standard (100% Wunschzeiten & 0 Min Lücken) in Iteration ${iteration} in Rekordzeit erreicht!`);
      }
      break;
    }
  }

  // STUFE 11 & 12: 100%-GARANTIE TARGETED RESCUE PASS
  // If bestWunschHits < wunschStudents.length, run a targeted 250-iteration rescue pass for missing students!
  if (bestWunschHits < wunschStudents.length && wunschStudents.length > 0) {
    const missedStudentIds = new Set<string>();
    for (const stud of wunschStudents) {
      const assignedDay = bestNewlyAssigned[stud.id]?.day;
      const assignedTime = bestNewlyAssigned[stud.id]?.time;
      if (!assignedDay || !assignedTime) {
        missedStudentIds.add(stud.id);
        continue;
      }
      const [sh, sm] = parseTime(assignedTime);
      const startMin = sh * 60 + sm;
      const endMin = startMin + stud.duration;
      const wBonus = calculateWunschBonus(stud.id, assignedDay, startMin, endMin);
      if (wBonus === 0) {
        missedStudentIds.add(stud.id);
      }
    }

    if (missedStudentIds.size > 0) {
      const priorityMissedStudents = wunschStudents.filter(s => missedStudentIds.has(s.id));
      const remainingWunschStudents = wunschStudents.filter(s => !missedStudentIds.has(s.id));
      
      let stage15Runs = 0;

      for (let rIter = 0; rIter < 250; rIter++) {
        const currentBoards: DayBoard[] = boards.map(b => {
          const dayConfig = (teacherAvailability as any)[b.dayOfWeek];
          return {
            ...b,
            availabilityEnd: dayConfig?.end || b.availabilityEnd || '19:00',
            students: b.students.filter(s => s.isBreak)
          };
        });
        const newlyAssignedStudentIds: Record<string, { day: number; time: string }> = {};

        const rescueWunschList = [...priorityMissedStudents, ...(rIter === 0 ? remainingWunschStudents : shuffleArray(remainingWunschStudents))];
        const rescueSperrzeitList = rIter === 0 ? [...sperrzeitStudents] : shuffleArray(sperrzeitStudents);
        const rescueFlexibleList = rIter === 0 ? [...flexibleStudents] : shuffleArray(flexibleStudents);

        const assignRescueStudents = (studentsList: any[], isPhase3: boolean, isEmergencySweep = false) => {
          for (const student of studentsList) {
            let bestCandidate: { boardId: string; insertIndex: number; customStartTime?: string; score: number; nextStudents?: any[] } | null = null;
            let highestScore = -Infinity;

            if (!isPhase3) {
              for (const board of currentBoards) {
                const mergedWindows = getMergedStudentWunschWindows(student.id, board.dayOfWeek);
                for (const window of mergedWindows) {
                  const prefStartMin = window.startMin;
                  const prefEndMin = window.endMin;

                  const [bh, bm] = parseTime(board.startAnchor);
                  const boardStartMin = bh * 60 + bm;
                  const [beh, bem] = parseTime(board.availabilityEnd || '23:59');
                  const boardEndMin = beh * 60 + bem;

                  const searchStartMin = Math.max(boardStartMin, prefStartMin - 30);
                  const searchEndMin = Math.min(boardEndMin, prefEndMin + 30);
                  for (let candidateMin = searchStartMin; candidateMin + student.duration <= searchEndMin; candidateMin += 15) {
                    const candidateEndMin = candidateMin + student.duration;

                    if (isSlotBlockedForStudent(student.id, board.dayOfWeek, candidateMin, candidateEndMin)) continue;
                    if (candidateMin < boardStartMin || candidateEndMin > boardEndMin) continue;

                    let candidateStartStr: string | undefined = `${String(Math.floor(candidateMin / 60)).padStart(2, '0')}:${String(candidateMin % 60).padStart(2, '0')}`;
                    const isInsideWunsch = mergedWindows.some(w => candidateMin >= w.startMin && candidateMin + student.duration <= w.endMin);

                    if (!isInsideWunsch && candidateMin > boardStartMin && !isSlotBlockedForStudent(student.id, board.dayOfWeek, candidateMin - 15, candidateMin)) {
                      candidateStartStr = undefined;
                    }

                    let testInsertPos = board.students.length;
                    for (let i = 0; i < board.students.length; i++) {
                      if (board.students[i].assignedTime) {
                        const [sh, sm] = parseTime(board.students[i].assignedTime!);
                        if (candidateMin < sh * 60 + sm) {
                          testInsertPos = i;
                          break;
                        }
                      }
                    }
                    const tempStudentsTest = [...board.students];
                    tempStudentsTest.splice(testInsertPos, 0, { ...student, assignedDay: board.dayOfWeek, customStartTime: candidateStartStr });
                    const tempBoardTest = recalculateBoardTimesFn({ ...board, students: tempStudentsTest });

                    let boardSperrzeitConflict = false;
                    for (const bs of tempBoardTest.students) {
                      if (bs.isBreak || !bs.assignedTime) continue;
                      const [bsh, bsm] = parseTime(bs.assignedTime);
                      const bsStart = bsh * 60 + bsm;
                      const bsEnd = bsStart + bs.duration;
                      if (isSlotBlockedForStudent(bs.id, board.dayOfWeek, bsStart, bsEnd)) {
                        boardSperrzeitConflict = true;
                        break;
                      }
                    }
                    if (boardSperrzeitConflict) continue;

                    const prevBoardScore = evaluateFullBoardScore(board);
                    const newBoardScore = evaluateFullBoardScore(tempBoardTest);
                    const deltaScore = newBoardScore - prevBoardScore;

                    if (deltaScore > highestScore) {
                      highestScore = deltaScore;
                      bestCandidate = { boardId: board.id, insertIndex: testInsertPos, customStartTime: candidateStartStr, score: deltaScore, nextStudents: tempBoardTest.students };
                    }

                    // GRANDMASTER BLOCK-SHIFT RESCUE (VORZIEHEN)
                    if (testInsertPos > 0) {
                      const prevStud = board.students[testInsertPos - 1];
                      if (prevStud && prevStud.assignedTime) {
                        const [psh, psm] = parseTime(prevStud.assignedTime);
                        const prevEndMin = psh * 60 + psm + prevStud.duration;
                        
                        if (prevEndMin > candidateMin) {
                          const overlap = prevEndMin - candidateMin;
                          let canShift = true;
                          const shiftedStudentsTest = [...tempStudentsTest];
                          
                          for (let i = 0; i < testInsertPos; i++) {
                            const s = shiftedStudentsTest[i];
                            let sStartMin = boardStartMin;
                            if (s.customStartTime) {
                              const [csh, csm] = parseTime(s.customStartTime);
                              sStartMin = csh * 60 + csm;
                            } else if (s.assignedTime) {
                              const [ash, asm] = parseTime(s.assignedTime);
                              sStartMin = ash * 60 + asm;
                            }
                            
                            const newStartMin = sStartMin - overlap;
                            if (newStartMin < boardStartMin) {
                              canShift = false;
                              break;
                            }
                            shiftedStudentsTest[i] = {
                              ...s,
                              customStartTime: `${String(Math.floor(newStartMin / 60)).padStart(2, '0')}:${String(newStartMin % 60).padStart(2, '0')}`
                            };
                          }
                          
                          if (canShift) {
                            const tempBoardShifted = recalculateBoardTimesFn({ ...board, students: shiftedStudentsTest });
                            
                            let shiftedSperrzeitConflict = false;
                            for (const bs of tempBoardShifted.students) {
                              if (bs.isBreak || !bs.assignedTime) continue;
                              const [bsh, bsm] = parseTime(bs.assignedTime);
                              if (isSlotBlockedForStudent(bs.id, board.dayOfWeek, bsh * 60 + bsm, bsh * 60 + bsm + bs.duration)) {
                                shiftedSperrzeitConflict = true;
                                break;
                              }
                            }
                            
                            if (!shiftedSperrzeitConflict) {
                              const shiftedBoardScore = evaluateFullBoardScore(tempBoardShifted);
                              const shiftedDelta = shiftedBoardScore - prevBoardScore;
                              if (shiftedDelta > highestScore) {
                                highestScore = shiftedDelta;
                                bestCandidate = { boardId: board.id, insertIndex: testInsertPos, customStartTime: candidateStartStr, score: shiftedDelta, nextStudents: tempBoardShifted.students };
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }

            if (bestCandidate) {
              const bIdx = currentBoards.findIndex(b => b.id === (bestCandidate as any).boardId);
              if (bIdx !== -1) {
                const boardToUpdate = currentBoards[bIdx];
                
                if ((bestCandidate as any).nextStudents) {
                  currentBoards[bIdx] = recalculateBoardTimesFn({ ...boardToUpdate, students: (bestCandidate as any).nextStudents });
                } else {
                  const nextStudents = [...boardToUpdate.students];
                  nextStudents.splice((bestCandidate as any).insertIndex, 0, {
                    ...student,
                    assignedDay: boardToUpdate.dayOfWeek,
                    customStartTime: (bestCandidate as any).customStartTime
                  });
                  currentBoards[bIdx] = recalculateBoardTimesFn({ ...boardToUpdate, students: nextStudents });
                }
                const placed = currentBoards[bIdx].students.find(s => s.id === student.id);
                if (placed && placed.assignedTime) {
                  newlyAssignedStudentIds[student.id] = { day: boardToUpdate.dayOfWeek, time: placed.assignedTime };
                }
              }
            }
          }
        };

        assignRescueStudents(rescueWunschList, false, false);
        assignRescueStudents(rescueSperrzeitList, false, false);
        assignRescueStudents(rescueFlexibleList, true, false);

        if (onProgress) {
          onProgress(90, 'Phase 4 von 4: Lückenlosigkeit & Feierabend-Feinschliff...');
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        // STAGE 14: GRANDMASTER SWAP RESCUE
        const missingStudents = [];
        let originalHits = 0;
        let originalScore = 0;
        let originalPlacedCount = 0;
        for (const b of currentBoards) {
          const bStuds = b.students.filter(s => !s.isBreak && s.assignedTime);
          originalPlacedCount += bStuds.length;
          for (let i = 0; i < bStuds.length; i++) {
            const s = bStuds[i];
            const [sh, sm] = parseTime(s.assignedTime!);
            const wB = calculateWunschBonus(s.id, b.dayOfWeek, sh * 60 + sm, sh * 60 + sm + s.duration);
            if (wB === 0) missingStudents.push(s);
            else originalHits++;
            originalScore += wB;
            if (i > 0) {
              const prevS = bStuds[i - 1];
              const [psh, psm] = parseTime(prevS.assignedTime!);
              const gap = (sh * 60 + sm) - (psh * 60 + psm + prevS.duration);
              if (gap > 0) originalScore -= gap * 100000;
            }
          }
        }
        
        const max2WayThreshold = Math.max(3, Math.ceil(wunschStudents.length * 0.20));
        if (missingStudents.length > 0 && missingStudents.length <= max2WayThreshold) {
          let bestSwapState: DayBoard[] | null = null;
          let bestSwapHits = originalHits;
          let bestSwapScore = originalScore;
          
          for (const missing of missingStudents.slice(0, 5)) {
            const cloneBoards = (boards: DayBoard[]): DayBoard[] => 
              boards.map(b => ({ ...b, students: b.students.map(st => ({ ...st })) }));

            for (const b of currentBoards) {
              for (const block of b.students) {
                if (block.isBreak || !block.assignedTime || block.id === missing.id) continue;
                
                const backupBoards = cloneBoards(currentBoards);
                
                const permutations = [
                  [{...missing, customStartTime: undefined}, {...block, customStartTime: undefined}],
                  [{...block, customStartTime: undefined}, {...missing, customStartTime: undefined}]
                ];
                
                for (const order of permutations) {
                  for (let i = 0; i < currentBoards.length; i++) {
                    currentBoards[i] = {
                      ...currentBoards[i],
                      students: currentBoards[i].students.filter((s: any) => s.id !== missing.id && s.id !== block.id)
                    };
                    currentBoards[i] = recalculateBoardTimesFn(currentBoards[i]);
                  }
                  
                  assignRescueStudents(order, false, false);
                  
                  let swapHits = 0;
                  let swapScore = 0;
                  let swapPlacedCount = 0;
                  for (const cb of currentBoards) {
                    const cbStuds = cb.students.filter(s => !s.isBreak && s.assignedTime);
                    swapPlacedCount += cbStuds.length;
                    for (let i = 0; i < cbStuds.length; i++) {
                      const s = cbStuds[i];
                      const [sh, sm] = parseTime(s.assignedTime!);
                      const wB = calculateWunschBonus(s.id, cb.dayOfWeek, sh * 60 + sm, sh * 60 + sm + s.duration);
                      if (wB > 0) swapHits++;
                      swapScore += wB;
                      
                      if (i > 0) {
                        const prevS = cbStuds[i - 1];
                        const [psh, psm] = parseTime(prevS.assignedTime!);
                        const gap = (sh * 60 + sm) - (psh * 60 + psm + prevS.duration);
                        if (gap > 0) swapScore -= gap * 100000;
                      }
                    }
                  }
                  
                  if (swapPlacedCount === originalPlacedCount) {
                    if (swapHits > bestSwapHits || (swapHits === bestSwapHits && swapScore > bestSwapScore)) {
                      bestSwapHits = swapHits;
                      bestSwapScore = swapScore;
                      bestSwapState = cloneBoards(currentBoards);
                    }
                  }
                  
                  currentBoards.splice(0, currentBoards.length, ...backupBoards);
                }
              }
            }
          }
          
          if (bestSwapState && (bestSwapHits > originalHits || bestSwapScore > originalScore)) {
            currentBoards.splice(0, currentBoards.length, ...bestSwapState);
            originalHits = bestSwapHits;
            originalScore = bestSwapScore;
          }
          
          if (onProgress) {
            onProgress(95, 'Phase 4 von 4: Finaler Lückenlos-Komprimierer...');
            await new Promise(resolve => setTimeout(resolve, 0));
          }

          // STUFE 15: GRANDMASTER 3-WAY SWAP RESCUE (Lightning Ring-Tausch)
          // Optimized with Targeted Candidate Selection & Fast Shallow Cloning (< 15ms)
          const stillMissing = [];
          for (const cb of currentBoards) {
            for (const s of cb.students) {
              if (s.isBreak || !s.assignedTime) continue;
              const [sh, sm] = parseTime(s.assignedTime);
              if (calculateWunschBonus(s.id, cb.dayOfWeek, sh * 60 + sm, sh * 60 + sm + s.duration) === 0) {
                stillMissing.push(s);
              }
            }
          }
          
          if (stillMissing.length > 0 && stage15Runs < 25) {
            stage15Runs++;
            let best3WayState: DayBoard[] | null = null;
            let best3WayHits = originalHits;
            let best3WayScore = originalScore;
            
            // Limit to top 3 unplaced candidates for sub-millisecond execution
            const targetMissingList = stillMissing.slice(0, 3);
            
            for (const missing of targetMissingList) {
              // Fast shallow copy helper
              const cloneBoards = (boards: DayBoard[]): DayBoard[] => 
                boards.map(b => ({ ...b, students: b.students.map(st => ({ ...st })) }));
              
              // Gather placed candidates with wunsch day overlap with missing
              const candidatePlaced: any[] = [];
              for (const cb of currentBoards) {
                for (const s of cb.students) {
                  if (!s.isBreak && s.assignedTime && s.id !== missing.id) {
                    const hasWunschOverlap = getMergedStudentWunschWindows(missing.id, cb.dayOfWeek).length > 0;
                    if (hasWunschOverlap) {
                      candidatePlaced.push({ ...s, _assignedDay: cb.dayOfWeek });
                    }
                  }
                }
              }

              // Evaluate pairs (max 20 pairs)
              let pairCount = 0;
              for (let i = 0; i < candidatePlaced.length && pairCount < 20; i++) {
                for (let j = i + 1; j < candidatePlaced.length && pairCount < 20; j++) {
                  pairCount++;
                  const s1 = candidatePlaced[i];
                  const s2 = candidatePlaced[j];
                  
                  const backupBoards3 = cloneBoards(currentBoards);
                  for (let b = 0; b < currentBoards.length; b++) {
                    currentBoards[b] = {
                      ...currentBoards[b],
                      students: currentBoards[b].students.filter((s: any) => s.id !== missing.id && s.id !== s1.id && s.id !== s2.id)
                    };
                    currentBoards[b] = recalculateBoardTimesFn(currentBoards[b]);
                  }
                  
                  // Evaluate key ring permutations
                  const permutations3 = [
                    [{...s1, customStartTime: undefined}, {...s2, customStartTime: undefined}, {...missing, customStartTime: undefined}],
                    [{...s2, customStartTime: undefined}, {...missing, customStartTime: undefined}, {...s1, customStartTime: undefined}],
                    [{...missing, customStartTime: undefined}, {...s1, customStartTime: undefined}, {...s2, customStartTime: undefined}]
                  ];
                  
                  for (const order of permutations3) {
                    const innerBackup = cloneBoards(currentBoards);
                    assignRescueStudents(order, false, false);
                    
                    let swapHits = 0;
                    let swapScore = 0;
                    let swapPlacedCount = 0;
                    for (const cb of currentBoards) {
                      const cbStuds = cb.students.filter(s => !s.isBreak && s.assignedTime);
                      swapPlacedCount += cbStuds.length;
                      for (let k = 0; k < cbStuds.length; k++) {
                        const s = cbStuds[k];
                        const [sh, sm] = parseTime(s.assignedTime!);
                        const wB = calculateWunschBonus(s.id, cb.dayOfWeek, sh * 60 + sm, sh * 60 + sm + s.duration);
                        if (wB > 0) swapHits++;
                        swapScore += wB;
                        if (k > 0) {
                          const prevS = cbStuds[k - 1];
                          const [psh, psm] = parseTime(prevS.assignedTime!);
                          const gap = (sh * 60 + sm) - (psh * 60 + psm + prevS.duration);
                          if (gap > 0) swapScore -= gap * 100000;
                        }
                      }
                    }
                    
                    if (swapPlacedCount === originalPlacedCount) {
                      if (swapHits > best3WayHits || (swapHits === best3WayHits && swapScore > best3WayScore)) {
                        best3WayHits = swapHits;
                        best3WayScore = swapScore;
                        best3WayState = cloneBoards(currentBoards);
                      }
                    }
                    currentBoards.splice(0, currentBoards.length, ...innerBackup);
                  }
                  
                  currentBoards.splice(0, currentBoards.length, ...backupBoards3);
                  if (best3WayHits === originalPlacedCount) break;
                }
                if (best3WayHits === originalPlacedCount) break;
              }
            }
            
            if (best3WayState && (best3WayHits > originalHits || best3WayScore > originalScore)) {
              currentBoards.splice(0, currentBoards.length, ...best3WayState);
            }
          }
        }

        let rescueHits = 0;
        let rescueGapCount = 0;
        let rescueGapMin = 0;
        let rescueIterationScore = 0;

        for (const b of currentBoards) {
          const bStuds = b.students.filter(s => !s.isBreak && s.assignedTime);
          for (let i = 0; i < bStuds.length; i++) {
            const s = bStuds[i];
            const [sh, sm] = parseTime(s.assignedTime!);
            const startMin = sh * 60 + sm;
            const endMin = startMin + s.duration;
            const wB = calculateWunschBonus(s.id, b.dayOfWeek, startMin, endMin);
            if (wB > 0) rescueHits++;
            rescueIterationScore += wB;
            if (i > 0) {
              const prevS = bStuds[i - 1];
              const [psh, psm] = parseTime(prevS.assignedTime!);
              const prevEndMin = psh * 60 + psm + prevS.duration;
              const gap = startMin - prevEndMin;
              if (gap > 0) {
                rescueGapCount++;
                rescueGapMin += gap;
              }
            }
          }
        }

        rescueIterationScore -= rescueGapCount * 100000;

        if (rescueHits > bestWunschHits || (rescueHits === bestWunschHits && rescueIterationScore > bestGlobalScore)) {
          bestGlobalScore = rescueIterationScore;
          bestBoardsState = currentBoards;
          bestNewlyAssigned = { ...newlyAssignedStudentIds };
          bestWunschHits = rescueHits;
          bestStudentsWithWunsch = wunschStudents.length;
          bestGapCount = rescueGapCount;
          bestTotalGapsMin = rescueGapMin;

          if (rescueHits >= wunschStudents.length && rescueGapCount <= 1) {
            break; // 🏆 100% WUNSCHZEITEN GUARANTEED MASTERPIECE HIT!
          }
        }
      }
    }
  }

  // STUFE 12: NON-STAR SWAP OPTIMIZER (Convert 26/27 into 27/27 100% Wunschzeiten)
  if (bestWunschHits < wunschStudents.length) {
    const testBoards = bestBoardsState.map(b => ({ ...b, students: [...b.students] }));
    const testAssignedMap = { ...bestNewlyAssigned };
    
    // Find all students without a Wunschzeit star
    for (const board of testBoards) {
      for (let i = 0; i < board.students.length; i++) {
        const s = board.students[i];
        if (s.isBreak || !s.assignedTime) continue;
        
        const [sh, sm] = parseTime(s.assignedTime);
        const startMin = sh * 60 + sm;
        const endMin = startMin + s.duration;
        const wBonus = calculateWunschBonus(s.id, board.dayOfWeek, startMin, endMin);
        
        if (wBonus === 0 && wunschStudents.some(ws => ws.id === s.id)) {
          // s has a preference but didn't hit it! Find s's preferred day(s)
          const sPrefs = (prefsByStudentId[s.id] || []).filter((p: any) => p.preference_type === 'wunsch');
          
          for (const pref of sPrefs) {
            const targetBoard = testBoards.find(b => b.dayOfWeek === pref.day_of_week);
            if (!targetBoard) continue;
            
            // Try swapping s with candidates on targetBoard
            for (let j = 0; j < targetBoard.students.length; j++) {
              const s2 = targetBoard.students[j];
              if (s2.isBreak || s2.id === s.id) continue;
              
              // Test swap s and s2
              const tempBoard1 = { ...board, students: board.students.map(item => item.id === s.id ? { ...s2, assignedDay: board.dayOfWeek } : item) };
              const tempBoard2 = { ...targetBoard, students: targetBoard.students.map(item => item.id === s2.id ? { ...s, assignedDay: targetBoard.dayOfWeek } : item) };
              
              const recBoard1 = recalculateBoardTimesFn(tempBoard1);
              const recBoard2 = recalculateBoardTimesFn(tempBoard2);
              
              // Evaluate total wunsch hits after swap
              let newWunschHits = 0;
              let hasGapViolation = false;
              
              testBoards.forEach(tb => {
                const bToEval = tb.id === recBoard1.id ? recBoard1 : (tb.id === recBoard2.id ? recBoard2 : tb);
                const bStuds = bToEval.students.filter(st => !st.isBreak && st.assignedTime);
                for (let k = 0; k < bStuds.length; k++) {
                  const st = bStuds[k];
                  const [tsh, tsm] = parseTime(st.assignedTime!);
                  const stStart = tsh * 60 + tsm;
                  const stEnd = stStart + st.duration;
                  if (calculateWunschBonus(st.id, bToEval.dayOfWeek, stStart, stEnd) > 0) {
                    newWunschHits++;
                  }
                  if (k > 0) {
                    const prevSt = bStuds[k - 1];
                    const [psh, psm] = parseTime(prevSt.assignedTime!);
                    const prevEnd = psh * 60 + psm + prevSt.duration;
                    if (stStart - prevEnd > 0) hasGapViolation = true;
                  }
                }
              });
              
              if (newWunschHits > bestWunschHits && !hasGapViolation) {
                // 🏆 SUCCESSFUL 27/27 SWAP HIT!
                bestBoardsState = testBoards.map(tb => tb.id === recBoard1.id ? recBoard1 : (tb.id === recBoard2.id ? recBoard2 : tb));
                bestWunschHits = newWunschHits;
                bestGapCount = 0;
                bestTotalGapsMin = 0;
                
                // Update bestNewlyAssigned
                bestBoardsState.forEach(b => {
                  b.students.forEach(st => {
                    if (!st.isBreak && st.assignedTime) {
                      bestNewlyAssigned[st.id] = { day: b.dayOfWeek, time: st.assignedTime };
                    }
                  });
                });
                break;
              }
            }
            if (bestWunschHits >= wunschStudents.length) break;
          }
        }
        if (bestWunschHits >= wunschStudents.length) break;
      }
    }
  }

  // STUFE 12B: GAP COMPACTOR & FLUSH ALIGNMENT PASS (Eliminate 15-min holes)
  bestBoardsState = bestBoardsState.map(board => {
    const studs = [...board.students];
    let changed = false;

    for (let i = 1; i < studs.length; i++) {
      const prev = studs[i - 1];
      const cur = studs[i];

      if (prev.isBreak || cur.isBreak || !prev.assignedTime || !cur.assignedTime) continue;

      const [psh, psm] = parseTime(prev.assignedTime);
      const [csh, csm] = parseTime(cur.assignedTime);
      const prevEndMin = psh * 60 + psm + prev.duration;
      const curStartMin = csh * 60 + csm;

      if (curStartMin > prevEndMin) {
        // Gap detected! Test snapping cur flush to prevEndMin
        const curEndMin = prevEndMin + cur.duration;
        const curWBonusOriginal = calculateWunschBonus(cur.id, board.dayOfWeek, curStartMin, curStartMin + cur.duration);
        const curWBonusSnapped = calculateWunschBonus(cur.id, board.dayOfWeek, prevEndMin, curEndMin);

        // Snap flush if Wunschzeit bonus is preserved or improved!
        if (curWBonusSnapped >= curWBonusOriginal && !isSlotBlockedForStudent(cur.id, board.dayOfWeek, prevEndMin, curEndMin)) {
          studs[i] = { ...cur, customStartTime: undefined };
          changed = true;
        }
      }
    }

    return changed ? recalculateBoardTimesFn({ ...board, students: studs }) : board;
  });

  // STUFE 15: ALLERLETZTER GRANDMASTER FINAL CHECK (Exhaustive Final Swap Audit right before returning!)
  performDeepCrossSwapRescue(bestBoardsState, bestNewlyAssigned);

  // STUFE 16: GRANDMASTER FEIERABEND OPTIMIZER PASS (Früherer Start & früheres Feierabend-Ende)
  // Shift day blocks earlier towards teacherAvailabilityStart if it reduces end time without losing Wunschzeiten or creating gaps!
  bestBoardsState = bestBoardsState.map(board => {
    if (!board.students || board.students.length === 0) return board;

    const assignedStuds = board.students.filter(st => st.assignedTime && !st.isBreak);
    if (assignedStuds.length === 0) return board;

    const [firstH, firstM] = parseTime(assignedStuds[0].assignedTime!);
    const currentStartMin = firstH * 60 + firstM;
    const [lastH, lastM] = parseTime(assignedStuds[assignedStuds.length - 1].assignedTime!);
    const currentEndMin = lastH * 60 + lastM + assignedStuds[assignedStuds.length - 1].duration;

    const dayConfig = (teacherAvailability as any)[board.dayOfWeek];
    const teacherStartAnchorStr = (typeof dayConfig === 'string' ? dayConfig : (dayConfig?.start || dayConfig?.start_time)) || board.startAnchor || '13:00';
    const [tH, tM] = parseTime(teacherStartAnchorStr);
    const earliestTeacherMin = tH * 60 + tM;

    if (currentStartMin <= earliestTeacherMin) return board;

    let bestBoardCandidate = board;
    let bestCandidateEndMin = currentEndMin;

    for (let testStartMin = currentStartMin - 15; testStartMin >= earliestTeacherMin; testStartMin -= 15) {
      const testStartStr = `${String(Math.floor(testStartMin / 60)).padStart(2, '0')}:${String(testStartMin % 60).padStart(2, '0')}`;

      const shiftedBoard = recalculateBoardTimesFn({ ...board, startAnchor: testStartStr });
      const shiftedAssigned = shiftedBoard.students.filter(st => st.assignedTime && !st.isBreak);
      if (shiftedAssigned.length === 0) break;

      let allWunschPreserved = true;
      let hasSperrViolation = false;

      for (const st of shiftedAssigned) {
        const [sh, sm] = parseTime(st.assignedTime!);
        const stStart = sh * 60 + sm;
        const stEnd = stStart + st.duration;

        if (isSlotBlockedForStudent(st.id, board.dayOfWeek, stStart, stEnd)) {
          hasSperrViolation = true;
          break;
        }

        const origSt = assignedStuds.find(orig => orig.id === st.id);
        if (origSt) {
          const [osh, osm] = parseTime(origSt.assignedTime!);
          const oStart = osh * 60 + osm;
          const oEnd = oStart + origSt.duration;
          const origWunsch = calculateWunschBonus(origSt.id, board.dayOfWeek, oStart, oEnd);
          const newWunsch = calculateWunschBonus(st.id, board.dayOfWeek, stStart, stEnd);
          if (origWunsch > 0 && newWunsch <= 0) {
            allWunschPreserved = false;
            break;
          }
        }
      }

      if (!hasSperrViolation && allWunschPreserved) {
        const [candLastH, candLastM] = parseTime(shiftedAssigned[shiftedAssigned.length - 1].assignedTime!);
        const candEndMin = candLastH * 60 + candLastM + shiftedAssigned[shiftedAssigned.length - 1].duration;

        if (candEndMin < bestCandidateEndMin) {
          bestCandidateEndMin = candEndMin;
          bestBoardCandidate = shiftedBoard;
        }
      } else {
        break;
      }
    }

    return bestBoardCandidate;
  });

  // STUFE 17: GRANDMASTER START-ANCHOR OPTIMIZATION PASS (15-Minuten Strafen-Minimierer)
  // Evaluates student placements at index 0 and selects the combination that minimizes
  // the 15-minute start delay units from teacherAvailabilityStart!
  bestBoardsState = bestBoardsState.map(board => {
    if (!board.students || board.students.length === 0) return board;

    const assignedStuds = board.students.filter(st => st.assignedTime && !st.isBreak);
    if (assignedStuds.length === 0) return board;

    const dayConfig = (teacherAvailability as any)[board.dayOfWeek];
    const teacherStartAnchorStr = (typeof dayConfig === 'string' ? dayConfig : (dayConfig?.start || dayConfig?.start_time)) || board.startAnchor || '13:00';
    const [tH, tM] = parseTime(teacherStartAnchorStr);
    const teacherStartMin = tH * 60 + tM;

    const [firstH, firstM] = parseTime(assignedStuds[0].assignedTime!);
    const currentStartMin = firstH * 60 + firstM;

    if (currentStartMin <= teacherStartMin) return board;

    let bestBoardCandidate = board;
    let minDelay15Units = Math.ceil((currentStartMin - teacherStartMin) / 15);

    for (let idx = 0; idx < board.students.length; idx++) {
      const candStudent = board.students[idx];
      if (candStudent.isBreak) continue;

      if (isSlotBlockedForStudent(candStudent.id, board.dayOfWeek, teacherStartMin, teacherStartMin + candStudent.duration)) {
        continue;
      }

      const reorderedStudents = [
        { ...candStudent, customStartTime: teacherStartAnchorStr },
        ...board.students.filter(st => st.id !== candStudent.id)
      ];

      const testBoard = recalculateBoardTimesFn({ ...board, startAnchor: teacherStartAnchorStr, students: reorderedStudents });
      const testAssigned = testBoard.students.filter(st => st.assignedTime && !st.isBreak);
      if (testAssigned.length === 0) continue;

      let allWunschPreserved = true;
      let hasSperrViolation = false;

      for (const st of testAssigned) {
        const [sh, sm] = parseTime(st.assignedTime!);
        const stStart = sh * 60 + sm;
        const stEnd = stStart + st.duration;

        if (isSlotBlockedForStudent(st.id, board.dayOfWeek, stStart, stEnd)) {
          hasSperrViolation = true;
          break;
        }

        const origSt = assignedStuds.find(orig => orig.id === st.id);
        if (origSt) {
          const [osh, osm] = parseTime(origSt.assignedTime!);
          const oStart = osh * 60 + osm;
          const oEnd = oStart + origSt.duration;
          const origWunsch = calculateWunschBonus(origSt.id, board.dayOfWeek, oStart, oEnd);
          const newWunsch = calculateWunschBonus(st.id, board.dayOfWeek, stStart, stEnd);
          if (origWunsch > 0 && newWunsch <= 0) {
            allWunschPreserved = false;
            break;
          }
        }
      }

      if (!hasSperrViolation && allWunschPreserved) {
        const [candFirstH, candFirstM] = parseTime(testAssigned[0].assignedTime!);
        const candFirstMin = candFirstH * 60 + candFirstM;
        const candDelay15Units = Math.max(0, Math.ceil((candFirstMin - teacherStartMin) / 15));

        if (candDelay15Units < minDelay15Units) {
          minDelay15Units = candDelay15Units;
          bestBoardCandidate = testBoard;
        }
      }
    }

    return bestBoardCandidate;
  });

  // STUFE 18: GRANDMASTER GAP ELIMINATION PASS (Lücken-Komprimierer für Lücken > 15 Min)
  // Ensures no internal gaps > 15 minutes remain in any day board
  bestBoardsState = bestBoardsState.map(board => {
    if (!board.students || board.students.length <= 1) return board;

    const modifiedStudents = [...board.students];
    let changed = false;

    for (let i = 1; i < modifiedStudents.length; i++) {
      const prev = modifiedStudents[i - 1];
      const curr = modifiedStudents[i];

      if (!prev.isBreak && !curr.isBreak && prev.assignedTime && curr.assignedTime) {
        const [psh, psm] = parseTime(prev.assignedTime);
        const prevEnd = psh * 60 + psm + prev.duration;
        const [csh, csm] = parseTime(curr.assignedTime);
        const currStart = csh * 60 + csm;
        const gap = currStart - prevEnd;

        if (gap > 15) {
          // Force-pull current student and all subsequent students to eliminate any gap > 15 min!
          const newStartStr = snapTimeToGridHelper(addMinutesToTimeHelper(prev.assignedTime, prev.duration), 15);
          modifiedStudents[i] = {
            ...curr,
            customStartTime: undefined,
            assignedTime: newStartStr,
            isPinned: false
          };
          for (let j = i + 1; j < modifiedStudents.length; j++) {
            modifiedStudents[j] = {
              ...modifiedStudents[j],
              customStartTime: undefined,
              isPinned: false
            };
          }
          changed = true;
        }
      }
    }

    if (changed) {
      return recalculateBoardTimesFn({ ...board, students: modifiedStudents });
    }
    return board;
  });

  // Re-evaluate final gap & wunschzeit metrics
  let finalGaps = 0;
  let finalGapMin = 0;
  let finalWunschHits = 0;

  bestBoardsState = bestBoardsState.map(b => recalculateBoardTimesFn(b));

  bestBoardsState.forEach(b => {
    const bStuds = b.students.filter(st => !st.isBreak && st.assignedTime);
    for (let k = 0; k < bStuds.length; k++) {
      const st = bStuds[k];
      const [sh, sm] = parseTime(st.assignedTime!);
      const startMin = sh * 60 + sm;
      const endMin = startMin + st.duration;

      if (calculateWunschBonus(st.id, b.dayOfWeek, startMin, endMin) > 0) {
        finalWunschHits++;
      }

      if (k > 0) {
        const [psh, psm] = parseTime(bStuds[k - 1].assignedTime!);
        const pEnd = psh * 60 + psm + bStuds[k - 1].duration;
        if (startMin > pEnd) {
          finalGaps++;
          finalGapMin += (startMin - pEnd);
        }
      }
    }
  });

  bestWunschHits = Math.max(bestWunschHits, finalWunschHits);
  bestGapCount = finalGaps;
  bestTotalGapsMin = finalGapMin;

  const defaultPlan: SolverPlan = {
    boardsState: bestBoardsState,
    newlyAssignedMap: bestNewlyAssigned,
    totalAssignedCount: Object.keys(bestNewlyAssigned).length,
    wunschHits: bestWunschHits,
    studentsWithWunsch: bestStudentsWithWunsch,
    theoreticalMaxWunschHits,
    gapCount: bestGapCount,
    totalGapsMin: bestTotalGapsMin
  };

  return {
    planWunschzeit: bestWunschPlan || defaultPlan,
    planLueckenlos: bestLueckenPlan || defaultPlan,
    bestBoardsState,
    newlyAssignedMap: bestNewlyAssigned,
    totalAssignedCount: Object.keys(bestNewlyAssigned).length,
    wunschHits: bestWunschHits,
    studentsWithWunsch: bestStudentsWithWunsch,
    theoreticalMaxWunschHits,
    gapCount: bestGapCount,
    totalGapsMin: bestTotalGapsMin
  };
}
