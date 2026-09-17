import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';

export interface PendingSchedule {
  id: string;
  teacher_id: string;
  student_id: string;
  day_of_week: number;
  time_slot: string;
  status: string;
  room_id: string | null;
  teacher_name?: string;
  student_name?: string;
  room_name?: string;
}

export interface UseSecretarySchedulesProps {
  schoolId: string;
  rooms: any[];
  setRooms: React.Dispatch<React.SetStateAction<any[]>>;
  openingHours: any;
  campusTeachers: any[];
  bypassTeachers: any[];
  coaches: any[];
  fetchDashboardData: () => Promise<void>;
}

export function useSecretarySchedules({
  schoolId,
  rooms,
  setRooms,
  openingHours,
  campusTeachers,
  bypassTeachers,
  coaches,
  fetchDashboardData
}: UseSecretarySchedulesProps) {
  const [pendingSchedules, setPendingSchedules] = useState<PendingSchedule[]>([]);

  // Room Planner Matrix states
  const [matrixAllocations, setMatrixAllocations] = useState<any[]>([]);
  const [unsubmittedTeachers, setUnsubmittedTeachers] = useState<Record<string, boolean>>({});
  const [selectedDayPlan, setSelectedDayPlan] = useState<any | null>(null);
  const [draggedPlanId, setDraggedPlanId] = useState<string | null>(null);
  const [draggedPlanDay, setDraggedPlanDay] = useState<number | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ roomId: string | null; day: number | null }>({ roomId: null, day: null });
  const [isSavingApproval, setIsSavingApproval] = useState<boolean>(false);
  const [approvalToast, setApprovalToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showUnassignedWarning, setShowUnassignedWarning] = useState<boolean>(false);
  const approvalDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isApprovingAllSchedules, setIsApprovingAllSchedules] = useState<boolean>(false);
  const [showOnlyPendingReviews, setShowOnlyPendingReviews] = useState<boolean>(false);

  const [hoveredUnassignedDayNum, setHoveredUnassignedDayNum] = useState<number | null>(null);
  const [clickedUnassignedDayNum, setClickedUnassignedDayNum] = useState<number | null>(null);
  const [schedulesSidebarTab, setSchedulesSidebarTab] = useState<'submissions' | 'stats'>('submissions');
  const [sidebarTeacherSearch, setSidebarTeacherSearch] = useState<string>('');
  const [expandedSidebarTeacherId, setExpandedSidebarTeacherId] = useState<string | null>(null);
  const [selectedFilterTeacherId, setSelectedFilterTeacherId] = useState<string | null>(null);

  // Approve all pending schedules from teachers
  const handleApproveAllPendingSchedules = async () => {
    if (pendingSchedules.length === 0) return;
    setIsApprovingAllSchedules(true);
    try {
      const pendingIds = pendingSchedules.map(s => s.id);

      // Targeted notifications to affected students
      const dayNamesMap: Record<number, string> = { 1: 'Montag', 2: 'Dienstag', 3: 'Mittwoch', 4: 'Donnerstag', 5: 'Freitag', 6: 'Samstag', 7: 'Sonntag' };
      pendingSchedules.forEach(item => {
        if (item.student_id && item.student_id !== 'vacant') {
          const studentName = item.student_name || 'Schüler';
          const timeSlot = item.time_slot ? item.time_slot.substring(0, 5) : '';
          const dayName = dayNamesMap[item.day_of_week] || 'Unterrichtstag';

          const studentTitle = '✅ Neuer Unterrichtstermin zugeteilt';
          const studentMsg = `Hallo ${studentName.split(' ')[0]}, dein neuer Unterrichtstermin wurde offiziell freigegeben: ${dayName} um ${timeSlot} Uhr.`;

          supabase.from('notifications')
            .insert({ user_id: item.student_id, title: studentTitle, message: studentMsg, metadata: { type: 'schedule_approved', day_of_week: item.day_of_week } })
            .select('id').single()
            .then(async ({ data: notif }: any) => {
              if (notif?.id) {
                try {
                  await supabase.functions.invoke('send-push', { body: { userId: item.student_id, title: studentTitle, body: studentMsg, url: '/', notificationId: notif.id } });
                } catch {
                  // Silence push errors
                }
              }
            });
        }
      });

      const { error } = await supabase
        .from('schedules')
        .update({ status: 'approved' })
        .in('id', pendingIds);

      if (error) throw error;

      setPendingSchedules([]);
      setShowOnlyPendingReviews(false);
      setApprovalToast({
        message: `Erfolgreich: Alle ${pendingIds.length} Stundenpläne wurden freigegeben und betroffene Nutzer benachrichtigt!`,
        type: 'success'
      });
      setTimeout(() => setApprovalToast(null), 4000);
    } catch (err) {
      console.error('Error approving all pending schedules:', err);
      setApprovalToast({
        message: 'Fehler beim Freigeben der Stundenpläne.',
        type: 'error'
      });
      setTimeout(() => setApprovalToast(null), 4000);
    } finally {
      setIsApprovingAllSchedules(false);
    }
  };

  // Dynamic centering auto-scroll when dragging schedule blocks (high performance requestAnimationFrame)
  useEffect(() => {
    if (!draggedPlanId) return;

    let currentSpeed = 0;
    let animationFrameId: number | null = null;
    const scrollContainer = document.getElementById('secretary-main-scroll-container');

    const updateScroll = () => {
      if (currentSpeed !== 0) {
        if (scrollContainer) {
          scrollContainer.scrollBy(0, currentSpeed);
        } else {
          window.scrollBy(0, currentSpeed);
        }
      }
      animationFrameId = requestAnimationFrame(updateScroll);
    };

    animationFrameId = requestAnimationFrame(updateScroll);

    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();

      const clientY = e.clientY;
      const viewHeight = window.innerHeight;
      const centerY = viewHeight / 2;
      const deltaY = clientY - centerY;
      const absDelta = Math.abs(deltaY);

      if (absDelta > 80) {
        const direction = Math.sign(deltaY);
        const maxScrollContainerDist = viewHeight / 2 - 80;
        const ratio = Math.min(1, (absDelta - 80) / Math.max(1, maxScrollContainerDist));
        currentSpeed = direction * ratio * 7;
      } else {
        currentSpeed = 0;
      }
    };

    const handleGlobalDragEnd = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      setDraggedPlanId(null);
      setDraggedPlanDay(null);
      setDragOverCell({ roomId: null, day: null });
    };

    window.addEventListener('dragover', handleGlobalDragOver);
    window.addEventListener('dragend', handleGlobalDragEnd);

    return () => {
      window.removeEventListener('dragover', handleGlobalDragOver);
      window.removeEventListener('dragend', handleGlobalDragEnd);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [draggedPlanId]);

  // Helper to identify GrooveLab plans & GrooveLab rooms
  const isGroovelabPlan = (plan: any) => {
    if (!plan) return false;
    const tId = plan.teacherId || '';
    const tName = (plan.teacherName || '').toLowerCase();
    const instr = (plan.instrument || '').toLowerCase();
    return tId === 'groovelab' || tName.includes('groove lab') || tName.includes('groovelab') || instr.includes('plattform');
  };

  const isGroovelabRoom = (room: any) => {
    if (!room) return false;
    if (room.is_groovelab_active === true) return true;
    const name = (room.name || '').toLowerCase();
    return name.includes('groovelab') || name.includes('groove lab') || name.includes('band');
  };

  // Multi-Iteration Smart Solver for Room Allocation
  const runAutoRoomAllocation = () => {
    const activeRooms = rooms.filter(r => r.is_campus_active !== false);
    if (activeRooms.length === 0) {
      alert('Keine aktiven Räume für die Autozuweisung vorhanden!');
      return;
    }

    const isOverlap = (p1: any, p2: any) => {
      return p1.startTime < p2.endTime && p2.startTime < p1.endTime;
    };

    const isRoomUnsuitable = (r: any, instrumentName: string) => {
      if (!r || !instrumentName) return false;
      const unsuitable = r.unsuitable_instruments || (() => {
        try {
          const map = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
          return map[r.id] || [];
        } catch { return []; }
      })();
      return unsuitable.some((inst: string) => inst.toLowerCase() === instrumentName.toLowerCase());
    };

    const allTeachersList = [...campusTeachers, ...bypassTeachers, ...coaches];
    const teacherProfileMap = new Map<string, any>();
    allTeachersList.forEach(t => teacherProfileMap.set(t.id, t));

    // 1. Detect plans with time conflicts or unassigned rooms
    const conflictingPlanIds = new Set<string>();
    matrixAllocations.forEach(p1 => {
      if (!p1.roomId) return;
      matrixAllocations.forEach(p2 => {
        if (p1.id !== p2.id && p1.roomId === p2.roomId && p1.dayOfWeek === p2.dayOfWeek && isOverlap(p1, p2)) {
          conflictingPlanIds.add(p1.id);
          conflictingPlanIds.add(p2.id);
        }
      });
    });

    const initialAssigned: Record<string, string> = {};
    matrixAllocations.forEach(p => {
      if (p.roomId && !conflictingPlanIds.has(p.id)) {
        initialAssigned[p.id] = p.roomId;
      }
    });

    const unassignedPlans = matrixAllocations.filter(p => !p.roomId || conflictingPlanIds.has(p.id));
    if (unassignedPlans.length === 0) {
      alert('Alle Einheiten haben bereits einen zugewiesenen Raum ohne Konflikte!');
      return;
    }

    // Separate rooms into GrooveLab rooms and Standard rooms
    const activeGroovelabRooms = activeRooms.filter(r => isGroovelabRoom(r));
    const activeStandardRooms = activeRooms.filter(r => !isGroovelabRoom(r));

    const getTeacherFavoriteRoomIds = (tId: string) => {
      const teacherProfile = teacherProfileMap.get(tId);
      const dbFavs: string[] = teacherProfile?.preferred_room_ids || [];
      const localFav = localStorage.getItem(`groovelab_favorite_room_id_${tId}`);
      const combined = new Set<string>([
        ...dbFavs,
        ...(localFav ? [localFav] : [])
      ]);
      return Array.from(combined);
    };

    const candidateRoomsPerPlan = new Map<string, any[]>();
    unassignedPlans.forEach(plan => {
      if (isGroovelabPlan(plan)) {
        const targetGLRooms = activeGroovelabRooms.length > 0 ? activeGroovelabRooms : activeRooms;
        candidateRoomsPerPlan.set(plan.id, targetGLRooms);
      } else {
        const instr = plan.instrument?.toLowerCase() || '';
        let candidates = activeStandardRooms.length > 0 ? [...activeStandardRooms] : [...activeRooms];

        if (instr.includes('schlagzeug') || instr.includes('drums')) {
          const drumRooms = candidates.filter(r => {
            const eq = r.equipment;
            const hasEquip = Array.isArray(eq) && (eq.includes('drums') || eq.includes('schlagzeug') || eq.includes('drum'));
            return hasEquip || r.name.toLowerCase().includes('schlagzeug') || r.name.toLowerCase().includes('drums') || r.name.toLowerCase().includes('band') || r.name.toLowerCase().includes('drum');
          });
          if (drumRooms.length > 0) candidates = drumRooms;
        } else if (instr.includes('klavier') || instr.includes('piano')) {
          const pianoRooms = candidates.filter(r => {
            const eq = r.equipment;
            const hasEquip = Array.isArray(eq) && (eq.includes('piano') || eq.includes('klavier') || eq.includes('keys'));
            return hasEquip || r.name.toLowerCase().includes('klavier') || r.name.toLowerCase().includes('piano') || r.name.toLowerCase().includes('flügel');
          });
          if (pianoRooms.length > 0) candidates = pianoRooms;
        }

        let suitableCandidates = candidates.filter(r => !isRoomUnsuitable(r, plan.instrument));

        if (activeGroovelabRooms.length > 0) {
          const suitableGLRooms = activeGroovelabRooms.filter(r => !isRoomUnsuitable(r, plan.instrument));
          suitableCandidates = [...suitableCandidates, ...suitableGLRooms];
        }

        const favRoomIds = getTeacherFavoriteRoomIds(plan.teacherId);
        if (favRoomIds.length > 0) {
          const favCandidates = suitableCandidates.filter(r => favRoomIds.includes(r.id));
          const nonFavCandidates = suitableCandidates.filter(r => !favRoomIds.includes(r.id));
          suitableCandidates = [...favCandidates, ...nonFavCandidates];
        }

        candidateRoomsPerPlan.set(plan.id, suitableCandidates.length > 0 ? suitableCandidates : activeRooms.filter(r => !isRoomUnsuitable(r, plan.instrument)));
      }
    });

    // 2. MONTE-CARLO SOLVER (100 Iterations)
    const RUN_ITERATIONS = 100;
    let bestGlobalScore = -Infinity;
    let bestAssigned: Record<string, string> = { ...initialAssigned };

    for (let iter = 0; iter < RUN_ITERATIONS; iter++) {
      const currentAssigned: Record<string, string> = { ...initialAssigned };

      const iterPlans = [...unassignedPlans].sort((a, b) => {
        const aIsGL = isGroovelabPlan(a);
        const bIsGL = isGroovelabPlan(b);
        if (aIsGL && !bIsGL) return -1;
        if (!aIsGL && bIsGL) return 1;

        const aIsDrums = a.instrument?.toLowerCase().includes('schlagzeug') || a.instrument?.toLowerCase().includes('drums');
        const bIsDrums = b.instrument?.toLowerCase().includes('schlagzeug') || b.instrument?.toLowerCase().includes('drums');
        if (aIsDrums && !bIsDrums) return -1;
        if (!aIsDrums && bIsDrums) return 1;

        if (iter > 0) {
          return (Math.random() - 0.5);
        }
        return 0;
      });

      for (const plan of iterPlans) {
        const candidateRooms = candidateRoomsPerPlan.get(plan.id) || activeRooms;
        let bestRoomIdForPlan: string | null = null;
        let highestRoomScore = -Infinity;

        for (const room of candidateRooms) {
          const hasConflict = matrixAllocations.some(otherPlan => {
            if (otherPlan.id === plan.id) return false;
            const allocatedRoom = currentAssigned[otherPlan.id];
            return allocatedRoom === room.id && otherPlan.dayOfWeek === plan.dayOfWeek && isOverlap(otherPlan, plan);
          });

          if (hasConflict) continue;

          let roomScore = 0;

          if (isGroovelabPlan(plan) && isGroovelabRoom(room)) {
            roomScore += 50000;
          }

          const favRoomIds = getTeacherFavoriteRoomIds(plan.teacherId);
          if (favRoomIds.includes(room.id)) {
            roomScore += 30000;
          }

          const teacherSameDaySlots = matrixAllocations.filter(p => p.teacherId === plan.teacherId && p.dayOfWeek === plan.dayOfWeek && p.id !== plan.id);
          const sameDayRoomUsageCount = teacherSameDaySlots.filter(p => currentAssigned[p.id] === room.id).length;
          if (sameDayRoomUsageCount > 0) {
            roomScore += 20000 * sameDayRoomUsageCount;
          }

          const anchorRoom = teacherSameDaySlots.find(p => initialAssigned[p.id])?.roomId;
          if (anchorRoom && anchorRoom === room.id) {
            roomScore += 8000;
          }

          const teacherProfile = teacherProfileMap.get(plan.teacherId);
          const prefRooms: string[] = teacherProfile?.preferred_room_ids || [];
          if (prefRooms.includes(room.id)) {
            roomScore += 4000;
          }

          const isAdjacent = matrixAllocations.some(otherPlan => {
            if (otherPlan.id === plan.id) return false;
            const allocatedRoom = currentAssigned[otherPlan.id];
            if (allocatedRoom !== room.id || otherPlan.dayOfWeek !== plan.dayOfWeek) return false;
            return (otherPlan.endTime === plan.startTime || otherPlan.startTime === plan.endTime);
          });
          if (isAdjacent) {
            roomScore += 1000;
          }

          roomScore += 100;

          if (roomScore > highestRoomScore) {
            highestRoomScore = roomScore;
            bestRoomIdForPlan = room.id;
          }
        }

        if (bestRoomIdForPlan) {
          currentAssigned[plan.id] = bestRoomIdForPlan;
        }
      }

      let iterationGlobalScore = 0;

      unassignedPlans.forEach(plan => {
        const assignedRoomId = currentAssigned[plan.id];
        if (assignedRoomId) {
          iterationGlobalScore += 100000;

          const teacherProfile = teacherProfileMap.get(plan.teacherId);
          if (teacherProfile?.preferred_room_ids?.includes(assignedRoomId)) {
            iterationGlobalScore += 4000;
          }
        }
      });

      const teacherDays = new Set<string>();
      matrixAllocations.forEach(p => teacherDays.add(`${p.teacherId}_${p.dayOfWeek}`));

      let zeroSwitchTeacherDays = 0;
      teacherDays.forEach(tdKey => {
        const [tId, dayStr] = tdKey.split('_');
        const dayNum = Number(dayStr);
        const slotsForTeacherDay = matrixAllocations.filter(p => p.teacherId === tId && p.dayOfWeek === dayNum);
        const assignedRooms = new Set(slotsForTeacherDay.map(p => currentAssigned[p.id]).filter(Boolean));
        if (assignedRooms.size === 1) {
          zeroSwitchTeacherDays++;
          iterationGlobalScore += 20000;
        }
      });

      if (iterationGlobalScore > bestGlobalScore) {
        bestGlobalScore = iterationGlobalScore;
        bestAssigned = { ...currentAssigned };
      }
    }

    setMatrixAllocations(prev => prev.map(p => ({
      ...p,
      roomId: bestAssigned[p.id] || p.roomId
    })));

    const newlyAssignedCount = unassignedPlans.filter(p => bestAssigned[p.id]).length;
    const unassignedRemainingCount = unassignedPlans.length - newlyAssignedCount;

    const teacherDays = new Set<string>();
    matrixAllocations.forEach(p => teacherDays.add(`${p.teacherId}_${p.dayOfWeek}`));
    let zeroSwitchCount = 0;
    let totalTeacherDaysCount = 0;

    teacherDays.forEach(tdKey => {
      const [tId, dayStr] = tdKey.split('_');
      const dayNum = Number(dayStr);
      const slots = matrixAllocations.filter(p => p.teacherId === tId && p.dayOfWeek === dayNum);
      const roomsUsed = new Set(slots.map(p => bestAssigned[p.id] || p.roomId).filter(Boolean));
      if (roomsUsed.size === 1 && slots.length > 1) {
        zeroSwitchCount++;
      }
      if (slots.length > 1) {
        totalTeacherDaysCount++;
      }
    });

    const continuityPercentage = totalTeacherDaysCount > 0 ? Math.round((zeroSwitchCount / totalTeacherDaysCount) * 100) : 100;

    alert(
      `⚡ Smart Auto-Zuweisung abgeschlossen!\n\n` +
      `• Erreichter Gesamt-Score: ${bestGlobalScore.toLocaleString()}\n` +
      `• Zugewiesene Einheiten: ${newlyAssignedCount} von ${unassignedPlans.length}\n` +
      `• Raumtreue (0 Raumwechsel am Tag): ${continuityPercentage}% der Lehrkräfte\n` +
      (unassignedRemainingCount > 0 ? `⚠️ ${unassignedRemainingCount} Einheiten konnten wegen Raumkonflikten nicht platziert werden.` : `✅ Alle Einheiten optimal verteilt.`)
    );
  };

  // Bulk save and approve to database
  const handleSaveAndApproveAll = async (skipUnassignedWarning = false) => {
    const unassignedPlans = matrixAllocations.filter(p => !p.roomId);
    if (!skipUnassignedWarning && unassignedPlans.length > 0) {
      setShowUnassignedWarning(true);
      return;
    }

    setIsSavingApproval(true);
    try {
      const assignedPlans = matrixAllocations.filter(p => p.roomId);
      const approvedDraftMap: Record<string, string | null> = {};
      assignedPlans.forEach(p => {
        approvedDraftMap[p.id] = p.roomId;
        if (p.teacherId && p.dayOfWeek) {
          approvedDraftMap[`${p.teacherId}_${p.dayOfWeek}`] = p.roomId;
        }
      });

      const dayNames = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
      const scheduleUpdatePromises: any[] = [];
      const slotsToInsert: any[] = [];
      const teacherRoomMap: Record<string, Record<number, string | null>> = {};

      for (const plan of assignedPlans) {
        if (!plan) continue;
        const targetRoomId = plan.roomId;

        if (plan.teacherId && plan.teacherId !== 'groovelab') {
          scheduleUpdatePromises.push(
            supabase
              .from('schedules')
              .delete()
              .eq('school_id', schoolId)
              .eq('teacher_id', plan.teacherId)
              .eq('day_of_week', plan.dayOfWeek)
          );

          if (plan.slots && plan.slots.length > 0) {
            for (const slot of plan.slots) {
              if (!slot.isBreak) {
                if (slot.isGroup && slot.groupStudents && slot.groupStudents.length > 0) {
                  slot.groupStudents.forEach((gs: any) => {
                    slotsToInsert.push({
                      school_id: schoolId,
                      teacher_id: plan.teacherId,
                      student_id: gs.id,
                      day_of_week: plan.dayOfWeek,
                      time_slot: slot.time_slot || slot.startTime || '14:00',
                      room_id: targetRoomId,
                      duration: slot.duration || 30,
                      status: 'approved',
                      instrument: gs.instrument || slot.instrument || plan.instrument || 'Musiker'
                    });
                  });
                } else if (slot.student_id) {
                  slotsToInsert.push({
                    school_id: schoolId,
                    teacher_id: plan.teacherId,
                    student_id: slot.student_id,
                    day_of_week: plan.dayOfWeek,
                    time_slot: slot.time_slot || slot.startTime || '14:00',
                    room_id: targetRoomId,
                    duration: slot.duration || 30,
                    status: 'approved',
                    instrument: slot.instrument || plan.instrument || 'Musiker'
                  });
                }
              }
            }
          }

          if (!teacherRoomMap[plan.teacherId]) teacherRoomMap[plan.teacherId] = {};
          teacherRoomMap[plan.teacherId][plan.dayOfWeek] = plan.roomId || null;
        }
      }

      const groovelabRoomsMap: Record<number, string | null> = {};
      assignedPlans.forEach((p: any) => {
        if (p.teacherId === 'groovelab') groovelabRoomsMap[p.dayOfWeek] = p.roomId || null;
      });

      const updatedOpHours = { ...openingHours };
      const dayKeys = ['', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      let opHoursChanged = false;
      for (let d = 1; d <= 7; d++) {
        const dayKey = dayKeys[d];
        if (updatedOpHours[dayKey] && groovelabRoomsMap[d] !== undefined) {
          updatedOpHours[dayKey] = { ...updatedOpHours[dayKey], roomId: groovelabRoomsMap[d] };
          opHoursChanged = true;
        }
      }

      if (scheduleUpdatePromises.length > 0) {
        await Promise.all(scheduleUpdatePromises);
      }

      const [, teacherUsersResult] = await Promise.all([
        slotsToInsert.length > 0
          ? supabase.from('schedules').insert(slotsToInsert).then(({ error }) => {
              if (error) console.error('[SecretaryDashboard] Error inserting clean schedules:', error);
            })
          : Promise.resolve(),
        supabase.from('users').select('*').eq('school_id', schoolId),
        opHoursChanged
          ? supabase.from('schools').update({ opening_hours: updatedOpHours }).eq('id', schoolId)
          : Promise.resolve()
      ]);

      const teacherUsers = (teacherUsersResult as any)?.data || [];

      const userUpdatePromises: any[] = [];
      for (const tu of teacherUsers) {
        const roomMap = teacherRoomMap[tu.id];
        if (!roomMap) continue;
        const rawPlanned = tu.planned_boards || (tu as any).campus_räume || (tu as any).groovelab_räume;
        if (rawPlanned && typeof rawPlanned === 'object') {
          const updatedPlanned = { ...rawPlanned, status: 'approved' };
          if (Array.isArray((rawPlanned as any).drafts)) {
            updatedPlanned.drafts = (rawPlanned as any).drafts.map((d: any) => ({
              ...d,
              status: 'approved',
              boards: (d.boards || []).map((b: any) => ({
                ...b,
                roomId: roomMap[b.dayOfWeek] !== undefined ? roomMap[b.dayOfWeek] : (b.roomId || null)
              }))
            }));
          } else if (Array.isArray((rawPlanned as any).boards)) {
            updatedPlanned.boards = (rawPlanned as any).boards.map((b: any) => ({
              ...b,
              roomId: roomMap[b.dayOfWeek] !== undefined ? roomMap[b.dayOfWeek] : (b.roomId || null)
            }));
          }
          userUpdatePromises.push(
            supabase.from('users').update({
              planned_boards: updatedPlanned,
              campus_räume: updatedPlanned,
              groovelab_räume: updatedPlanned
            }).eq('id', tu.id)
          );
        }
      }

      const [, allApprovedSchedulesResult] = await Promise.all([
        Promise.all(userUpdatePromises),
        supabase.from('schedules').select('*').eq('school_id', schoolId).eq('status', 'approved')
      ]);

      const allApprovedSchedules = (allApprovedSchedulesResult as any)?.data || [];

      if (allApprovedSchedules.length > 0) {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;

        const schoolStartYear = today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1;
        const schoolYearEnd = new Date(`${schoolStartYear + 1}-08-31T23:59:59`);

        const occurrences: any[] = [];
        allApprovedSchedules.forEach((sch: any) => {
          const { id: scheduleId, student_id, teacher_id, day_of_week, time_slot, duration, school_id: schSchoolId } = sch;
          if (!student_id || !day_of_week || !time_slot) return;
          const dayNum = typeof day_of_week === 'number' ? day_of_week : (parseInt(day_of_week, 10) || 1);

          const current = new Date(today);
          current.setHours(0, 0, 0, 0);
          const currentDay = current.getDay() || 7;
          const diff = dayNum - currentDay;
          const targetDate = new Date(current);
          targetDate.setDate(current.getDate() + diff);

          const todayZero = new Date(today);
          todayZero.setHours(0, 0, 0, 0);
          if (targetDate < todayZero) {
            targetDate.setDate(targetDate.getDate() + 7);
          }

          while (targetDate <= schoolYearEnd) {
            const ty = targetDate.getFullYear();
            const tm = String(targetDate.getMonth() + 1).padStart(2, '0');
            const td = String(targetDate.getDate()).padStart(2, '0');
            const dateStr = `${ty}-${tm}-${td}`;
            const startTime = time_slot.includes(':') && time_slot.split(':').length === 2 ? time_slot + ':00' : time_slot;
            occurrences.push({
              school_id: schSchoolId || schoolId,
              schedule_id: scheduleId,
              student_id,
              teacher_id,
              date: dateStr,
              start_time: startTime,
              duration: duration || 45,
              status: 'scheduled'
            });
            targetDate.setDate(targetDate.getDate() + 7);
          }
        });

        const teacherIds = Array.from(new Set(allApprovedSchedules.map((s: any) => s.teacher_id).filter(Boolean))) as string[];

        await Promise.all([
          teacherIds.length > 0
            ? supabase.from('schedule_occurrences').delete().in('teacher_id', teacherIds).gte('date', todayStr)
            : Promise.resolve()
        ]);

        if (occurrences.length > 0) {
          await supabase.from('schedule_occurrences').insert(occurrences);
        }
      }

      localStorage.setItem(`groovelab_matrix_allocations_draft_${schoolId}`, JSON.stringify(approvedDraftMap));
      setApprovalToast({ message: `✅ Raumplan freigegeben! ${assignedPlans.length} Einheiten wurden gespeichert.`, type: 'success' });
      setTimeout(() => setApprovalToast(null), 4000);

      fetchDashboardData();

      const teacherUsersData = teacherUsers;
      const notificationPromises: any[] = [];
      for (const plan of assignedPlans) {
        if (!plan || plan.teacherId === 'groovelab' || !plan.teacherId) continue;
        const rName = (rooms.find((r: any) => r.id === plan.roomId)?.name) || plan.roomId || 'dem zugewiesenen Raum';
        const dayName = dayNames[plan.dayOfWeek] || '';

        const teacherTitle = '✅ Stundenplan freigegeben';
        const teacherMsg = `Dein Stundenplan für ${dayName} wurde freigegeben! Ab sofort unterrichtest du in ${rName}.`;
        notificationPromises.push(
          Promise.resolve(
            supabase.from('notifications').insert({ user_id: plan.teacherId, title: teacherTitle, message: teacherMsg, metadata: { type: 'schedule_approved', day_of_week: plan.dayOfWeek, room_id: plan.roomId } }).select('id').single()
          ).then(async ({ data: notif }: any) => {
            if (notif?.id) await supabase.functions.invoke('send-push', { body: { userId: plan.teacherId, title: teacherTitle, body: teacherMsg, url: '/', notificationId: notif.id } });
          }).catch(() => {})
        );

        if (plan.slots) {
          const teacherUser = teacherUsersData.find((u: any) => u.id === plan.teacherId);
          const tName = teacherUser ? `${teacherUser.first_name || ''} ${(teacherUser.last_name || '')[0] || ''}.`.trim() : 'deiner Lehrkraft';
          for (const slot of plan.slots) {
            const studentId = slot.student_id;
            if (!studentId || slot.isBreak) continue;
            const slotTime = (slot.time_slot || '').substring(0, 5);
            const studentTitle = '✅ Unterricht bestätigt';
            const studentMsg = `Dein Unterricht am ${dayName} um ${slotTime} Uhr in ${rName} bei ${tName} wurde bestätigt!`;
            notificationPromises.push(
              Promise.resolve(
                supabase.from('notifications').insert({ user_id: studentId, title: studentTitle, message: studentMsg, metadata: { type: 'schedule_approved', day_of_week: plan.dayOfWeek, room_id: plan.roomId } }).select('id').single()
              ).then(async ({ data: notif }: any) => {
                if (notif?.id) await supabase.functions.invoke('send-push', { body: { userId: studentId, title: studentTitle, body: studentMsg, url: '/', notificationId: notif.id } });
              }).catch(() => {})
            );
          }
        }
      }
      Promise.allSettled(notificationPromises);

    } catch (err: any) {
      console.error('Error saving allocations:', err);
      setApprovalToast({ message: `❌ Fehler: ${err.message}`, type: 'error' });
      setTimeout(() => setApprovalToast(null), 5000);
    } finally {
      setIsSavingApproval(false);
    }
  };

  // Reject an entire teacher's day plan back to draft
  const handleRejectTeacherDayPlan = async (plan: any) => {
    if (!window.confirm(`Möchtest du den Stundenplan von ${plan.teacherName} für diesen Tag wirklich zur Überarbeitung zurückweisen?`)) return;
    try {
      const slotIds = plan.slots.map((s: any) => s.id);
      if (slotIds.length === 0) return;

      const { error } = await supabase
        .from('schedules')
        .update({ status: 'draft' })
        .in('id', slotIds);

      if (error) throw error;
      setSelectedDayPlan(null);
      alert('Stundenplan erfolgreich zur Überarbeitung zurückgewiesen.');
      fetchDashboardData();
    } catch (err: any) {
      console.error('Error rejecting plan:', err);
      alert('Fehler: ' + err.message);
    }
  };

  // Split points search: scan for pause slots >= 15 mins
  const getSplitPoints = (plan: any) => {
    if (!plan || !plan.slots || plan.slots.length <= 1) return [];
    const points: Array<{ index: number; time: string; duration: number }> = [];
    plan.slots.forEach((slot: any, idx: number) => {
      if (idx > 0 && idx < plan.slots.length - 1) {
        const isBreak = !slot.student_id && !plan.id.startsWith('adhoc_');
        if (isBreak && (slot.duration || 0) >= 15) {
          points.push({ index: idx, time: slot.time_slot, duration: slot.duration });
        }
      }
    });
    return points;
  };

  const handleSplitPlan = (plan: any, splitIdx: number) => {
    const slotsBefore = plan.slots.slice(0, splitIdx);
    const slotsAfter = plan.slots.slice(splitIdx);

    if (slotsBefore.length === 0 || slotsAfter.length === 0) return;

    const addMins = (t: string, m: number) => {
      const [hStr, mStr] = t.split(':');
      let h = parseInt(hStr) || 0;
      let mVal = parseInt(mStr) || 0;
      mVal += m;
      h += Math.floor(mVal / 60);
      mVal = mVal % 60;
      h = h % 24;
      return `${String(h).padStart(2, '0')}:${String(mVal).padStart(2, '0')}`;
    };

    const lastSlot1 = slotsBefore[slotsBefore.length - 1];
    const endTime1 = lastSlot1 ? addMins(lastSlot1.time_slot, lastSlot1.duration || 45) : plan.endTime;
    const firstSlot2 = slotsAfter[0];
    const startTime2 = firstSlot2 ? firstSlot2.time_slot : plan.startTime;

    const plan1 = {
      ...plan,
      id: `${plan.id}_split1`,
      endTime: endTime1,
      slots: slotsBefore
    };

    const plan2 = {
      ...plan,
      id: `${plan.id}_split2`,
      startTime: startTime2,
      slots: slotsAfter
    };

    setMatrixAllocations(prev => {
      const next = [];
      for (const p of prev) {
        if (p.id === plan.id) {
          next.push(plan1, plan2);
        } else {
          next.push(p);
        }
      }
      return next;
    });

    setSelectedDayPlan(null);
    alert(`Unterrichtsblock erfolgreich in 2 Teile aufgeteilt!`);
  };

  const handleMergePlans = (splitPlan: any) => {
    const baseId = splitPlan.id.split('_split')[0];
    const relatedSplits = matrixAllocations.filter(p => p.id.startsWith(baseId + '_split') || p.id === baseId);
    if (relatedSplits.length <= 1) return;

    const sortedSplits = [...relatedSplits].sort((a, b) => a.startTime.localeCompare(b.startTime));

    const mergedSlots: any[] = [];
    const slotIdsSeen = new Set();
    for (const p of sortedSplits) {
      for (const s of p.slots) {
        if (!slotIdsSeen.has(s.id)) {
          slotIdsSeen.add(s.id);
          mergedSlots.push(s);
        }
      }
    }
    mergedSlots.sort((a, b) => (a.time_slot || '').localeCompare(b.time_slot || ''));

    const addMins = (t: string, m: number) => {
      const [hStr, mStr] = t.split(':');
      let h = parseInt(hStr) || 0;
      let mVal = parseInt(mStr) || 0;
      mVal += m;
      h += Math.floor(mVal / 60);
      mVal = mVal % 60;
      h = h % 24;
      return `${String(h).padStart(2, '0')}:${String(mVal).padStart(2, '0')}`;
    };

    const startTime = mergedSlots[0]?.time_slot || splitPlan.startTime;
    const lastSlot = mergedSlots[mergedSlots.length - 1];
    const endTime = lastSlot ? addMins(lastSlot.time_slot, lastSlot.duration || 45) : splitPlan.endTime;

    const mergedPlan = {
      ...sortedSplits[0],
      id: baseId,
      startTime,
      endTime,
      slots: mergedSlots,
      roomId: sortedSplits[0].roomId || null
    };

    setMatrixAllocations(prev => {
      const next = [];
      let inserted = false;
      for (const p of prev) {
        if (p.id.startsWith(baseId + '_split') || p.id === baseId) {
          if (!inserted) {
            next.push(mergedPlan);
            inserted = true;
          }
        } else {
          next.push(p);
        }
      }
      return next;
    });

    setSelectedDayPlan(null);
    alert(`Unterrichtsblöcke wieder erfolgreich zusammengefügt!`);
  };

  const getPlanDisplayName = (plan: any) => {
    if (!plan) return '';
    if (plan.id.includes('_split1')) {
      return `${plan.teacherName} (Teil 1)`;
    }
    if (plan.id.includes('_split2')) {
      return `${plan.teacherName} (Teil 2)`;
    }
    return plan.teacherName;
  };

  const handleApproveSingleSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ status: 'approved' })
        .eq('id', scheduleId);

      if (error) throw error;
      alert('Stundenplan-Eintrag erfolgreich genehmigt.');
      fetchDashboardData();
    } catch (err: any) {
      console.error('Error approving schedule slot:', err);
      alert('Fehler: ' + err.message);
    }
  };

  const handleRejectSingleSchedule = async (scheduleId: string) => {
    if (!window.confirm('Möchtest du diesen Stundenplan-Eintrag zur Überarbeitung zurückweisen?')) return;
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ status: 'draft' })
        .eq('id', scheduleId);

      if (error) throw error;
      alert('Stundenplan-Eintrag zur Überarbeitung zurückgewiesen.');
      fetchDashboardData();
    } catch (err: any) {
      console.error('Error rejecting schedule slot:', err);
      alert('Fehler: ' + err.message);
    }
  };

  // Drag and drop matrix logic
  const handleDragStartMatrix = (e: React.DragEvent, planId: string) => {
    try {
      e.dataTransfer.setData('text/plain', planId);
      e.dataTransfer.effectAllowed = 'move';
    } catch (err) {
      console.warn('dataTransfer error', err);
    }
    setTimeout(() => {
      setDraggedPlanId(planId);
      const plan = matrixAllocations.find(p => p.id === planId);
      setDraggedPlanDay(plan?.dayOfWeek ?? null);
    }, 0);
  };

  const handleDropOnMatrix = (e: React.DragEvent | null, targetRoomId: string | null, targetDay: number) => {
    let activePlanId = draggedPlanId;
    if (e && e.dataTransfer) {
      try {
        const dataId = e.dataTransfer.getData('text/plain');
        if (dataId) activePlanId = dataId;
      } catch (err) {
        console.warn('dataTransfer error on drop', err);
      }
    }
    const plan = activePlanId ? matrixAllocations.find(p => p.id === activePlanId) : null;
    const activePlanDay = plan?.dayOfWeek ?? draggedPlanDay;

    if (!activePlanId || activePlanDay === null) {
      return;
    }
    // Day-lock: only allow drops within the same weekday column
    if (targetDay !== activePlanDay) {
      setDraggedPlanId(null);
      setDraggedPlanDay(null);
      return;
    }
    const dayKeys = ['', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayHours = openingHours?.[dayKeys[targetDay]];
    const isGroovelab = plan && plan.teacherId === 'groovelab';

    if (isGroovelab && dayHours) {
      if (dayHours.active === false) {
        if (!confirm('Das Groovelab ist an diesem Tag geschlossen. Möchtest du die Zuweisung trotzdem durchführen?')) {
          setDraggedPlanId(null);
          setDraggedPlanDay(null);
          return;
        }
      } else {
        if (plan && dayHours.start && dayHours.end && (plan.startTime < dayHours.start || plan.endTime > dayHours.end)) {
          if (!confirm(`Die Unterrichtszeit (${plan.startTime}–${plan.endTime}) liegt außerhalb der Öffnungszeiten des Groovelabs (${dayHours.start}–${dayHours.end}). Zuweisung trotzdem durchführen?`)) {
            setDraggedPlanId(null);
            setDraggedPlanDay(null);
            return;
          }
        }
      }
    }

    if (targetRoomId) {
      const room = rooms.find(r => r.id === targetRoomId);
      if (room && plan) {
        const unsuitable = room.unsuitable_instruments || (() => {
          try {
            const map = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
            return map[room.id] || [];
          } catch { return []; }
        })();
        if (unsuitable.some((inst: string) => inst.toLowerCase() === plan.instrument?.toLowerCase())) {
          alert(`Zuteilung verweigert: Raum "${room.name}" ist akustisch ungeeignet für das Instrument "${plan.instrument}".`);
          setDraggedPlanId(null);
          setDraggedPlanDay(null);
          return;
        }
      }
    }

    setMatrixAllocations(prev => {
      const updated = prev.map(p => {
        if (p.id === activePlanId) {
          return { ...p, roomId: targetRoomId };
        }
        return p;
      });

      // Immediately persist draftMap in localStorage
      if (schoolId) {
        const draftMap: Record<string, string | null> = {};
        updated.forEach(p => {
          draftMap[p.id] = p.roomId;
          if (p.teacherId && p.dayOfWeek) {
            draftMap[`${p.teacherId}_${p.dayOfWeek}`] = p.roomId;
          }
        });
        localStorage.setItem(`groovelab_matrix_allocations_draft_${schoolId}`, JSON.stringify(draftMap));
      }

      return updated;
    });

    // Auto-sync room assignment to database schedules so teacher dashboard receives realtime update
    if (plan && plan.teacherId && plan.teacherId !== 'groovelab' && schoolId) {
      supabase
        .from('schedules')
        .update({ room_id: targetRoomId })
        .eq('school_id', schoolId)
        .eq('teacher_id', plan.teacherId)
        .eq('day_of_week', targetDay)
        .then(({ error }) => {
          if (error) console.error('Error auto-syncing room_id to schedules:', error);
        });
    }

    setDraggedPlanId(null);
    setDraggedPlanDay(null);
  };

  // Download Teacher Schedule Report
  const handleDownloadTeacherSchedule = (tId: string, teacherName: string, instrument: string) => {
    const cleanTId = tId ? tId.replace(/^teacher-/i, '') : '';
    const teacherAllocations = matrixAllocations.filter(p => {
      const cleanPId = p.teacherId ? p.teacherId.replace(/^teacher-/i, '') : '';
      return p.teacherId === tId || (cleanPId && cleanPId === cleanTId);
    });

    const daysMap: Record<number, string> = {
      1: 'Montag',
      2: 'Dienstag',
      3: 'Mittwoch',
      4: 'Donnerstag',
      5: 'Freitag',
      6: 'Samstag',
      7: 'Sonntag'
    };

    let content = `=======================================================\n`;
    content += `CAMPUS-GROOVELAB UNTERRICHTSZEITEN & WOCHENPLAN\n`;
    content += `=======================================================\n`;
    content += `Lehrkraft:   ${teacherName}\n`;
    content += `Instrument:  ${instrument || 'Allgemein'}\n`;
    content += `Erstellt am: ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}\n`;
    content += `=======================================================\n\n`;

    let totalSlotsCount = 0;

    for (let d = 1; d <= 7; d++) {
      const dayName = daysMap[d];
      const dayAllocations = teacherAllocations
        .filter(p => p.dayOfWeek === d)
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

      content += `--- ${dayName.toUpperCase()} ---\n`;
      if (dayAllocations.length === 0) {
        content += `  Kein Unterricht eingetragen\n\n`;
      } else {
        dayAllocations.forEach(plan => {
          totalSlotsCount++;
          const roomName = plan.roomId
            ? (rooms.find(r => r.id === plan.roomId)?.name || 'Raum ' + plan.roomId)
            : '⚠️ Noch kein Raum zugewiesen';
          content += `  ⏱ ${plan.startTime} - ${plan.endTime} Uhr\n`;
          content += `     Raum:       ${roomName}\n`;
          content += `     Instrument: ${plan.instrument || instrument || 'Unterricht'}\n`;

          if (plan.slots && Array.isArray(plan.slots) && plan.slots.length > 0) {
            content += `     Schüler/Einheiten (${plan.slots.length}):\n`;
            plan.slots.forEach((s: any, idx: number) => {
              const studentName = s.student_name || s.name || `Schüler ${idx + 1}`;
              const timeInfo = s.time_slot ? ` (${s.time_slot}${s.duration ? `, ${s.duration} Min.` : ''})` : '';
              content += `       • ${studentName}${timeInfo}\n`;
            });
          }
          content += `\n`;
        });
      }
    }

    content += `=======================================================\n`;
    content += `GESAMTÜBERSICHT: ${totalSlotsCount} Unterrichtsblock/Blöcke in der Woche\n`;
    content += `=======================================================\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = teacherName.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `Unterrichtszeiten_${safeName}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
    pendingSchedules,
    setPendingSchedules,
    matrixAllocations,
    setMatrixAllocations,
    unsubmittedTeachers,
    setUnsubmittedTeachers,
    selectedDayPlan,
    setSelectedDayPlan,
    draggedPlanId,
    setDraggedPlanId,
    draggedPlanDay,
    setDraggedPlanDay,
    dragOverCell,
    setDragOverCell,
    isSavingApproval,
    setIsSavingApproval,
    approvalToast,
    setApprovalToast,
    showUnassignedWarning,
    setShowUnassignedWarning,
    approvalDebounceRef,
    isApprovingAllSchedules,
    setIsApprovingAllSchedules,
    showOnlyPendingReviews,
    setShowOnlyPendingReviews,
    hoveredUnassignedDayNum,
    setHoveredUnassignedDayNum,
    clickedUnassignedDayNum,
    setClickedUnassignedDayNum,
    schedulesSidebarTab,
    setSchedulesSidebarTab,
    sidebarTeacherSearch,
    setSidebarTeacherSearch,
    expandedSidebarTeacherId,
    setExpandedSidebarTeacherId,
    selectedFilterTeacherId,
    setSelectedFilterTeacherId,

    handleApproveAllPendingSchedules,
    isGroovelabPlan,
    isGroovelabRoom,
    runAutoRoomAllocation,
    handleSaveAndApproveAll,
    handleRejectTeacherDayPlan,
    getSplitPoints,
    handleSplitPlan,
    handleMergePlans,
    getPlanDisplayName,
    handleApproveSingleSchedule,
    handleRejectSingleSchedule,
    handleDragStartMatrix,
    handleDropOnMatrix,
    handleDownloadTeacherSchedule
  };
}
