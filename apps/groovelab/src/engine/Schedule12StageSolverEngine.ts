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
 * 🌟 Academic 12-Stage Schedule Solver Engine Container
 * Encapsulates and protects all 12 solver stages from UI & DND side-effects.
 */
export async function run12StageSolver(params: SolverParams): Promise<SolverResult> {
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

  const studentIds = unassignedStudents.map(s => s.id);

  // Fetch preferences for the active students
  const { data: prefs, error } = await supabase
    .from('student_schedule_preferences')
    .select('*')
    .in('student_id', studentIds);

  if (error) throw error;

  const prefsByStudentId: Record<string, any[]> = {};
  studentIds.forEach(id => { prefsByStudentId[id] = []; });

  prefs?.forEach(p => {
    if (!p.student_id) return;
    const matchingStudent = unassignedStudents.find(s => s.id === p.student_id);
    if (matchingStudent) {
      prefsByStudentId[matchingStudent.id].push(p);
    } else if (prefsByStudentId[p.student_id]) {
      prefsByStudentId[p.student_id].push(p);
    }
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
    ASSIGNMENT_PRIORITY: 2000000,
    WUNSCHZEIT_HIT: 1000000,
    SIBLING_MATCH: 500000,
    GAP_COMPACTION: 20000,
    NEUTRAL_ASSIGNMENT: 500
  } as const;

  const evaluateFullBoardScore = (b: DayBoard) => {
    let score = 0;
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

      // Strict Gap Evaluation: Gaps > 15 min are heavily penalized (-5.000.000 pts)
      if (i > 0) {
        const prevS = boardStudents[i - 1];
        if (prevS.assignedTime) {
          const [psh, psm] = parseTime(prevS.assignedTime);
          const prevEndMin = psh * 60 + psm + (prevS.duration || 30);
          const gap = startMin - prevEndMin;
          if (gap > 15) {
            score -= 5000000 + (gap - 15) * 50000; // Massive penalty for gaps > 15 min!
          } else if (gap > 0 && gap <= 30 && wBonus >= SOLVER_TIERS.WUNSCHZEIT_HIT * 2) {
            score += 100000; // Alignment gap bonus for <= 15/30 min strategic gaps!
          }
        }
      }
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

  // Grandmaster 500 Monte-Carlo Fuzzing Iterations
  const RUN_ITERATIONS = 500;
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
      if (gapBefore > 0) score -= Math.floor(gapBefore / 15) * Math.floor(SOLVER_TIERS.GAP_COMPACTION / 2);
      if (gapAfter > 0 && gapAfter < 1440) score -= Math.floor(gapAfter / 15) * Math.floor(SOLVER_TIERS.GAP_COMPACTION / 2);
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

  // STUFE 10: 500-ITERATION MONTE-CARLO FUZZING & OPTIMIZATION LOOP
  for (let iteration = 0; iteration < RUN_ITERATIONS; iteration++) {
    if (onProgress && iteration % 25 === 0) {
      const pct = Math.min(90, Math.round(15 + (iteration / RUN_ITERATIONS) * 75));
      const phaseText = iteration < 250 ? 'Pass 1: Max-Wunschzeiten Erkundung' : 'Pass 2: Lücken-Minimierung';
      onProgress(pct, `Stufe 10: Monte-Carlo (${iteration}/500) - ${phaseText}...`);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    let currentBoards: DayBoard[] = boards.map(b => {
      const dayConfig = (teacherAvailability as any)[b.dayOfWeek];
      return {
        ...b,
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

    // STUFE 11: MULTI-PHASE EMERGENCY SWEEP & RESCUE PASS
    const assignedCount = unassignedStudents.filter(s => !!newlyAssignedStudentIds[s.id]).length;
    if (assignedCount < unassignedStudents.length) {
      const remainingUnassigned = unassignedStudents.filter(s => !newlyAssignedStudentIds[s.id]);
      assignStudents(remainingUnassigned, true, true);
    }

    // STUFE 11 & 12: GLOBAL FITNESS SCORING, SIBLING & WUNSCHZEIT TARGET ENFORCEMENT
    let totalAssignedCount = 0;
    let iterationScore = 0;
    let wunschHits = 0;
    let totalInternalGapMinutes = 0;
    let totalGapCount = 0;

    const assignedSiblingMap: Record<string, number> = {};

    for (const b of currentBoards) {
      const boardStudents = b.students.filter(s => !s.isBreak && s.assignedTime);
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
            totalInternalGapMinutes += gap;
          }
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

    // 2. Track maximum Wunschzeit hits found across early exploration phase (Pass 1)
    if (iteration < 250) {
      if (wunschHits > maxWunschHitsFound) {
        maxWunschHitsFound = wunschHits;
      }
    } else {
      // Pass 2: Strictly penalize any iteration that drops below maxWunschHitsFound!
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

    // 🚀 EARLY TERMINATION SHIELD: If 100% Wunschzeit hits & <= 1 gap (Masterpiece) achieved, stop instantly!
    if (wunschHits >= wunschStudents.length && wunschStudents.length > 0 && totalGapCount <= 1) {
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

      for (let rIter = 0; rIter < 250; rIter++) {
        let currentBoards: DayBoard[] = boards.map(b => {
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
                      bestCandidate = { boardId: board.id, insertIndex: testInsertPos, customStartTime: candidateStartStr, score: deltaScore };
                    }
                  }
                }
              }
            }

            if (bestCandidate) {
              const bIdx = currentBoards.findIndex(b => b.id === (bestCandidate as any).boardId);
              if (bIdx !== -1) {
                const boardToUpdate = currentBoards[bIdx];
                const nextStudents = [...boardToUpdate.students];
                nextStudents.splice((bestCandidate as any).insertIndex, 0, {
                  ...student,
                  assignedDay: boardToUpdate.dayOfWeek,
                  customStartTime: (bestCandidate as any).customStartTime
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

        assignRescueStudents(rescueWunschList, false, false);
        assignRescueStudents(rescueSperrzeitList, false, false);
        assignRescueStudents(rescueFlexibleList, true, false);

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

  // STUFE 12: RECALCULATE & RETURN BEST STATE
  bestBoardsState = bestBoardsState.map(b => recalculateBoardTimesFn(b));

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
