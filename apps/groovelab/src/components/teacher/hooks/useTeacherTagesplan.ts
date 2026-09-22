import { useState, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { notesService, UserNote } from '../../../services/notesService';
import { formatTeacherFullName } from '../../../utils/nameHelper';
import { getSimulatedNow } from '../utils/teacherDashboardUtils';

export interface UseTeacherTagesplanProps {
  userId: string;
  teacher: any;
  schoolData: any;
  rooms: any[];
  allStudents: any[];
  onRefresh?: () => Promise<void> | void;
  onToast?: (msg: string) => void;
}

// 🏛️ Tier-1 Active Boards Resolution from LocalStorage or Teacher Profile
export const getTeacherActiveBoards = (teacherId: string, teacherObj?: any): any[] => {
  if (typeof window === 'undefined' || !teacherId) return [];
  try {
    const activePlatform = localStorage.getItem('groovelab_active_platform') || 'campus';
    const keys = [
      `groovelab_teacher_boards_${activePlatform}_${teacherId}`,
      `groovelab_teacher_boards_${teacherId}`,
      `groovelab_teacher_draft_state_${activePlatform}_${teacherId}`,
      `groovelab_teacher_draft_state_campus_${teacherId}`,
      `groovelab_teacher_draft_state_groovelab_${teacherId}`
    ];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        if (parsed?.drafts && Array.isArray(parsed.drafts)) {
          const activeDraft = parsed.drafts.find((d: any) => d.id === (parsed.activeDraftId || parsed.submittedDraftId)) || parsed.drafts[0];
          if (activeDraft?.boards && Array.isArray(activeDraft.boards) && activeDraft.boards.length > 0) {
            return activeDraft.boards;
          }
        }
        if (parsed?.boards && Array.isArray(parsed.boards) && parsed.boards.length > 0) {
          return parsed.boards;
        }
      }
    }
  } catch (e) {}

  if (teacherObj) {
    const pb = teacherObj.planned_boards || teacherObj.campus_räume || teacherObj.groovelab_räume;
    if (pb) {
      if (Array.isArray(pb) && pb.length > 0) return pb;
      if (pb.drafts && Array.isArray(pb.drafts)) {
        const activeDraft = pb.drafts.find((d: any) => d.id === (pb.activeDraftId || pb.submittedDraftId)) || pb.drafts[0];
        if (activeDraft?.boards && Array.isArray(activeDraft.boards) && activeDraft.boards.length > 0) {
          return activeDraft.boards;
        }
      }
      if (pb.boards && Array.isArray(pb.boards) && pb.boards.length > 0) {
        return pb.boards;
      }
    }
  }

  return [];
};

export const projectTimelineFromBoard = (
  board: any,
  todayStr: string,
  allStudents?: any[],
  rooms?: any[],
  occurrences: any[] = []
): any[] => {
  if (!board || !Array.isArray(board.students)) return [];
  const slots: any[] = [];
  const defaultBoardRoom = (rooms || []).find((r: any) => r.id === board.roomId)?.name || board.roomName || '';

  const resolveOccRoom = (occ: any): string => {
    if (!occ) return '';
    if (occ.override_room?.name) return occ.override_room.name;
    if (occ.template_room?.name) return occ.template_room.name;
    if (occ.schedules?.room?.name) return occ.schedules.room.name;
    if (occ.schedule?.room?.name) return occ.schedule.room.name;
    if (occ.room?.name) return occ.room.name;
    if (occ.room_override_id && rooms) {
      const found = rooms.find((r: any) => r.id === occ.room_override_id);
      if (found?.name) return found.name;
    }
    if (occ.template_room_id && rooms) {
      const found = rooms.find((r: any) => r.id === occ.template_room_id);
      if (found?.name) return found.name;
    }
    if (occ.room && typeof occ.room === 'string' && occ.room !== 'Raum' && occ.room !== 'Unbenannter Raum') {
      return occ.room;
    }
    return '';
  };

  board.students.forEach((s: any, idx: number) => {
    const timeShort = (s.assignedTime || s.customStartTime || s.time || '').substring(0, 5);
    if (!timeShort) return;
    const duration = s.duration || 30;

    const matchingDbOcc = occurrences.find(o => (o.start_time || '').substring(0, 5) === timeShort);
    const resolvedSlotRoom = resolveOccRoom(matchingDbOcc) || defaultBoardRoom;

    if (matchingDbOcc && ['cancelled', 'canceled_by_student', 'teacher_ausfall', 'canceled_by_teacher_ausfall'].includes(matchingDbOcc.status)) {
      slots.push({
        ...matchingDbOcc,
        timeSlot: timeShort,
        startTime: timeShort,
        duration,
        date: todayStr,
        status: matchingDbOcc.status,
        room: resolvedSlotRoom
      });
      return;
    }

    if (s.isBreak) {
      slots.push({
        id: matchingDbOcc?.id || `proj-break-${idx}-${todayStr}`,
        timeSlot: timeShort,
        startTime: timeShort,
        duration,
        date: todayStr,
        status: 'scheduled',
        isBreak: true,
        is_virtual: !matchingDbOcc?.id,
        room: resolvedSlotRoom,
        isGroup: false,
        students: []
      });
      return;
    }

    const isGroup = Boolean(
      s.isGroup ||
      (s.groupStudents && s.groupStudents.length > 0) ||
      (s.id && String(s.id).startsWith('group-')) ||
      (s.first_name && (s.first_name.includes('&') || s.first_name.includes(',') || /\b(und|and)\b/i.test(s.first_name))) ||
      (s.name && (s.name.includes('&') || s.name.includes(',') || /\b(und|and)\b/i.test(s.name)))
    );

    if (isGroup) {
      let rawMembers: any[] = Array.isArray(s.groupStudents) && s.groupStudents.length > 0 ? s.groupStudents : [];
      if (rawMembers.length === 0) {
        const textToSplit = s.first_name || s.name || '';
        if (textToSplit && (textToSplit.includes('&') || textToSplit.includes(',') || /\b(und|and)\b/i.test(textToSplit))) {
          const tokens = textToSplit.split(/&|,|\bund\b|\band\b/i).map((t: string) => t.trim()).filter(Boolean);
          rawMembers = tokens.map((tok: string) => {
            const parts = tok.split(/\s+/).filter(Boolean);
            return { first_name: parts[0] || tok, last_name: parts.slice(1).join(' ') || '' };
          });
        }
      }

      const resolvedGroupStudents = rawMembers.map((m: any, mIdx: number) => {
        const matched = allStudents?.find((st: any) => 
          (m.id && st.id === m.id) ||
          (m.studentId && st.id === m.studentId) ||
          (m.student_id && st.id === m.student_id) ||
          (m.first_name && st.first_name?.toLowerCase() === m.first_name.toLowerCase() && (!m.last_name || st.last_name?.toLowerCase() === m.last_name.toLowerCase() || st.last_name?.toLowerCase().startsWith(m.last_name[0].toLowerCase()))) ||
          (m.name && (st.name?.toLowerCase().includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(st.first_name?.toLowerCase())))
        );

        return {
          id: matched?.id || m.id || `group-member-${mIdx}-${todayStr}`,
          first_name: m.first_name || matched?.first_name || 'Schüler',
          last_name: m.last_name || matched?.last_name || '',
          name: `${m.first_name || matched?.first_name || ''} ${m.last_name || matched?.last_name || ''}`.trim() || 'Schüler',
          avatar_url: matched?.avatar_url || matched?.photo_url || '/avatars/gitarre_avatar_new.png',
          photo_url: matched?.photo_url || matched?.avatar_url || '/avatars/gitarre_avatar_new.png',
          instrument: m.instrument || matched?.instrument || s.instrument || 'Gitarre',
          birth_date: matched?.birth_date,
          day_of_birth: matched?.day_of_birth
        };
      });

      const firstMember = resolvedGroupStudents[0] || null;

      slots.push({
        id: matchingDbOcc?.id || `proj-grp-${s.id || idx}-${todayStr}`,
        scheduleId: s.id,
        schedule_id: s.id,
        timeSlot: timeShort,
        startTime: timeShort,
        duration,
        date: todayStr,
        status: matchingDbOcc?.status || 'scheduled',
        is_virtual: !matchingDbOcc?.id,
        room: resolvedSlotRoom,
        instrument: s.instrument || firstMember?.instrument || 'Gitarre',
        isGroup: true,
        student: firstMember,
        students: resolvedGroupStudents,
        slots: [{
          id: matchingDbOcc?.id || `proj-grp-${s.id || idx}-${todayStr}`,
          timeSlot: timeShort,
          startTime: timeShort,
          duration,
          date: todayStr,
          status: matchingDbOcc?.status || 'scheduled',
          room: resolvedSlotRoom,
          instrument: s.instrument || firstMember?.instrument || 'Gitarre',
          isGroup: true,
          students: resolvedGroupStudents
        }]
      });
    } else {
      const dbStudent = matchingDbOcc?.student;
      const matched = allStudents?.find((st: any) => 
        (s.id && st.id === s.id) ||
        (s.studentId && st.id === s.studentId) ||
        (s.student_id && st.id === s.student_id) ||
        (s.first_name && st.first_name?.toLowerCase() === s.first_name.toLowerCase() && (!s.last_name || st.last_name?.toLowerCase() === s.last_name.toLowerCase() || st.last_name?.toLowerCase().startsWith(s.last_name[0].toLowerCase())))
      );

      const studentObj = {
        id: dbStudent?.id || matched?.id || s.id || `proj-student-${idx}-${todayStr}`,
        first_name: dbStudent?.first_name || s.first_name || matched?.first_name || 'Schüler',
        last_name: dbStudent?.last_name || s.last_name || matched?.last_name || '',
        name: dbStudent?.name || `${s.first_name || matched?.first_name || ''} ${s.last_name || matched?.last_name || ''}`.trim() || 'Schüler',
        avatar_url: dbStudent?.avatar_url || dbStudent?.photo_url || matched?.avatar_url || matched?.photo_url || '/avatars/gitarre_avatar_new.png',
        photo_url: dbStudent?.photo_url || dbStudent?.avatar_url || matched?.photo_url || matched?.avatar_url || '/avatars/gitarre_avatar_new.png',
        instrument: s.instrument || dbStudent?.instrument || matched?.instrument || 'Gitarre',
        birth_date: dbStudent?.birth_date || matched?.birth_date,
        day_of_birth: dbStudent?.day_of_birth || matched?.day_of_birth
      };

      slots.push({
        id: matchingDbOcc?.id || `proj-${s.id || idx}-${todayStr}`,
        scheduleId: s.id,
        schedule_id: s.id,
        timeSlot: timeShort,
        startTime: timeShort,
        duration,
        date: todayStr,
        status: matchingDbOcc?.status || 'scheduled',
        is_virtual: !matchingDbOcc?.id,
        room: resolvedSlotRoom,
        instrument: s.instrument || studentObj.instrument || 'Gitarre',
        isGroup: false,
        student: studentObj,
        students: [studentObj]
      });
    }
  });

  return slots;
};

// Deprecated mock fallback kept only for backward compatibility with external imports
export const getCanonicalSeedTimeline = (todayStr: string, allStudents?: any[]) => {
  return [];
};

const readInitialBriefingTimeline = (teacherId?: string, todayStr?: string, teacherObj?: any, allStudents?: any[], rooms?: any[]) => {
  if (typeof window === 'undefined' || !teacherId) return { timeline: [] };
  try {
    if (todayStr) {
      const directKey = `groovelab_briefing_timeline_${teacherId}_${todayStr}`;
      const raw = localStorage.getItem(directKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.timeline) && parsed.timeline.length > 0) {
          const hasLegacySeed = parsed.timeline.some((t: any) => String(t.id).startsWith('seed-occ-'));
          if (!hasLegacySeed) {
            return parsed;
          }
        }
      }
    }

    // 🏛️ Fast L1 Cache: Synchronous projection from active template boards
    const boards = getTeacherActiveBoards(teacherId, teacherObj);
    if (boards.length > 0 && todayStr) {
      const now = getSimulatedNow();
      const jsDay = now.getDay();
      const dbDayOfWeek = jsDay === 0 ? 7 : jsDay;
      const todayBoard = boards.find((b: any) => b.dayOfWeek === dbDayOfWeek);
      if (todayBoard) {
        const projected = projectTimelineFromBoard(todayBoard, todayStr, allStudents, rooms);
        if (projected.length > 0) {
          return { timeline: projected };
        }
      }
    }
  } catch (e) {}
  return { timeline: [] };
};

export function useTeacherTagesplan({
  userId,
  teacher,
  schoolData,
  rooms,
  allStudents,
  onRefresh,
  onToast
}: UseTeacherTagesplanProps) {
  const effectiveTeacherId = userId || teacher?.id;
  const initialTimeline = useMemo(() => {
    const now = getSimulatedNow();
    const todayStr = now.toLocaleDateString('sv-SE');
    return readInitialBriefingTimeline(effectiveTeacherId, todayStr, teacher, allStudents, rooms);
  }, [effectiveTeacherId, teacher, allStudents, rooms]);

  const [briefingData, setBriefingData] = useState<any>(() => initialTimeline);
  const [selectedSlotOverride, setSelectedSlotOverride] = useState<any | null>(null);
  const [quickAudioStudent, setQuickAudioStudent] = useState<any | null>(null);

  // 🏛️ Intelligent Active Timeline Slot Resolution (Current Slot -> Upcoming -> First of day)
  const activeTimelineSlot = useMemo(() => {
    if (selectedSlotOverride) return selectedSlotOverride;
    if (!briefingData?.timeline || briefingData.timeline.length === 0) return null;
    
    const now = getSimulatedNow();
    const curTimeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    // 1. Slot that is currently active by time
    const activeSlot = briefingData.timeline.find((slot: any) => {
      const slotStart = slot.timeSlot;
      if (!slotStart) return false;
      const [sh, sm] = slotStart.split(':').map(Number);
      const totalMin = sh * 60 + sm + (slot.duration || 30);
      const slotEnd = `${String(Math.floor(totalMin / 60) % 24).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
      return curTimeStr >= slotStart && curTimeStr < slotEnd && (slot.student || (slot.students && slot.students.length > 0)) && !slot.is_room_booking && !slot.isRoomBooking;
    });
    if (activeSlot) return activeSlot;

    // 2. Fallback to first upcoming student
    const upcomingSlot = briefingData.timeline.find((slot: any) => {
      return curTimeStr < (slot.timeSlot || '') && (slot.student || (slot.students && slot.students.length > 0)) && !slot.is_room_booking && !slot.isRoomBooking;
    });
    if (upcomingSlot) return upcomingSlot;

    // 3. Fallback to first student of the day
    const firstStudentSlot = briefingData.timeline.find((slot: any) => (slot.student || (slot.students && slot.students.length > 0)) && !slot.is_room_booking && !slot.isRoomBooking);
    return firstStudentSlot || null;
  }, [briefingData?.timeline, selectedSlotOverride]);

  const setActiveTimelineSlot = useCallback((slot: any) => {
    setSelectedSlotOverride(slot);
  }, []);

  useEffect(() => {
    setSelectedSlotOverride(null);
  }, [briefingData]);

  // 🏛️ Authoritative Supabase Hydration for Teacher Tagesplan & Briefing Timeline
  const loadBriefingTimeline = useCallback(async () => {
    if (teacher?.role?.toLowerCase() === 'student') {
      setBriefingData([]);
      return;
    }
    const effectiveTeacherId = userId || teacher?.id;
    if (!effectiveTeacherId) return;

    try {
      const now = getSimulatedNow();
      const todayStr = now.toLocaleDateString('sv-SE'); // YYYY-MM-DD
      const jsDay = now.getDay();
      // DB convention: 1 = Monday, 2 = Tuesday, ..., 7 = Sunday
      const dbDayOfWeek = jsDay === 0 ? 7 : jsDay;

      // 1. Fetch regular recurring schedules for today's weekday
      // 2. Fetch specific schedule_occurrences for today
      // 3. Fetch room_bookings for today
      const [schedRes, occRes, bookingsRes] = await Promise.all([
        supabase
          .from('schedules')
          .select('*, student:users!schedules_student_id_fkey(id, first_name, last_name, nickname, avatar_url, photo_url, instrument, birth_date, day_of_birth, is_active), room:rooms(*)')
          .eq('teacher_id', effectiveTeacherId)
          .eq('day_of_week', dbDayOfWeek),
        supabase
          .from('schedule_occurrences')
          .select('*, student:users!schedule_occurrences_student_id_fkey(id, first_name, last_name, nickname, avatar_url, photo_url, instrument, birth_date, day_of_birth, is_active), schedules:schedules(room_id, room:rooms(name))')
          .eq('teacher_id', effectiveTeacherId)
          .eq('date', todayStr),
        supabase
          .from('room_bookings')
          .select('*, room:rooms(*)')
          .eq('booked_by', effectiveTeacherId)
          .eq('date', todayStr)
      ]);

      const schedules = schedRes.data || [];
      const occurrences = occRes.data || [];
      const roomBookings = bookingsRes.data || [];

      // Helper to resolve accurate room name for any occurrence or schedule item
      const getOccOrSchedRoom = (item: any): string => {
        if (!item) return '';
        if (item.override_room?.name) return item.override_room.name;
        if (item.template_room?.name) return item.template_room.name;
        if (item.schedules?.room?.name) return item.schedules.room.name;
        if (item.schedule?.room?.name) return item.schedule.room.name;
        if (item.room?.name) return item.room.name;
        if (item.room_override_id && rooms) {
          const found = rooms.find((r: any) => r.id === item.room_override_id);
          if (found?.name) return found.name;
        }
        if (item.template_room_id && rooms) {
          const found = rooms.find((r: any) => r.id === item.template_room_id);
          if (found?.name) return found.name;
        }
        if (item.room_id && rooms) {
          const found = rooms.find((r: any) => r.id === item.room_id);
          if (found?.name) return found.name;
        }
        if (item.schedule_id && schedules) {
          const sched = schedules.find((s: any) => s.id === item.schedule_id);
          if (sched?.room?.name) return sched.room.name;
          if (sched?.room_id && rooms) {
            const found = rooms.find((r: any) => r.id === sched.room_id);
            if (found?.name) return found.name;
          }
        }
        if (item.room && typeof item.room === 'string' && item.room !== 'Raum' && item.room !== 'Unbenannter Raum') {
          return item.room;
        }
        return '';
      };

      // Map occurrences by schedule_id
      const occBySchedId = new Map<string, any>();
      occurrences.forEach((occ: any) => {
        if (occ.schedule_id) {
          occBySchedId.set(occ.schedule_id, occ);
        }
      });

      const timelineSlots: any[] = [];

      // 🏛️ Tier-1 Template Boards Hydration (Single Source of Truth - 1:1 Parity with Stundenplan)
      const boards = getTeacherActiveBoards(effectiveTeacherId, teacher);
      const todayBoard = boards.find((b: any) => b.dayOfWeek === dbDayOfWeek);

      // Bruchkante 6 Fix: Reconcile secretariat-approved rooms into draft teacher board
      if (todayBoard && (!todayBoard.roomId || !todayBoard.roomName)) {
        const dbMatch = schedules.find((s: any) => s.room_id || s.room?.name);
        if (dbMatch) {
          todayBoard.roomId = todayBoard.roomId || dbMatch.room_id;
          todayBoard.roomName = todayBoard.roomName || dbMatch.room?.name;
        }
      }

      if (todayBoard && Array.isArray(todayBoard.students) && todayBoard.students.length > 0) {
        // Project timeline slots from active designer board
        const projected = projectTimelineFromBoard(todayBoard, todayStr, allStudents, rooms, occurrences);
        timelineSlots.push(...projected);

        // Also merge any standalone occurrences not in todayBoard (e.g. ad-hoc rescheduled appointments)
        occurrences.forEach((occ: any) => {
          const occTime = (occ.start_time || '').substring(0, 5);
          const alreadyCovered = timelineSlots.some(slot => 
            slot.id === occ.id || 
            (slot.timeSlot === occTime && (slot.student?.id === occ.student_id || slot.students?.some((st: any) => st.id === occ.student_id)))
          );
          if (!alreadyCovered) {
            const resolvedStudent = occ.student || (allStudents && allStudents.find((s: any) => s.id === occ.student_id));
            const occRoom = getOccOrSchedRoom(occ) || todayBoard.roomName || '';
            timelineSlots.push({
              id: occ.id,
              scheduleId: occ.schedule_id,
              schedule_id: occ.schedule_id,
              timeSlot: occTime,
              startTime: occTime,
              duration: occ.duration || 30,
              date: todayStr,
              status: occ.status || 'scheduled',
              is_virtual: false,
              room: occRoom,
              instrument: resolvedStudent?.instrument || 'Instrument',
              student: resolvedStudent ? {
                id: resolvedStudent.id,
                first_name: resolvedStudent.first_name,
                last_name: resolvedStudent.last_name,
                name: `${resolvedStudent.first_name || ''} ${resolvedStudent.last_name || ''}`.trim(),
                avatar_url: resolvedStudent.avatar_url || resolvedStudent.photo_url,
                instrument: resolvedStudent.instrument
              } : null,
              students: resolvedStudent ? [resolvedStudent] : [],
              isGroup: false
            });
          }
        });
      } else {
        // Fallback to database schedules table if no template board exists
        schedules.forEach((sched: any) => {
          const occ = occBySchedId.get(sched.id);
          const resolvedStudent = sched.student || (allStudents && allStudents.find((s: any) => s.id === sched.student_id));
          const slotTime = occ?.start_time || sched.time_slot || '14:00';
          const formattedTime = slotTime.substring(0, 5);
          const duration = occ?.duration || sched.duration_minutes || 30;
          const status = occ?.status || sched.status || 'scheduled';
          const roomName = sched.room?.name || (sched.room_id && (rooms || []).find((r: any) => r.id === sched.room_id)?.name) || '';

          timelineSlots.push({
            id: occ?.id || `sched-${sched.id}-${todayStr}`,
            scheduleId: sched.id,
            schedule_id: sched.id,
            timeSlot: formattedTime,
            startTime: formattedTime,
            duration: duration,
            date: todayStr,
            status: status,
            is_virtual: !occ?.id,
            room: roomName,
            instrument: sched.instrument || resolvedStudent?.instrument || 'Instrument',
            student: resolvedStudent ? {
              id: resolvedStudent.id,
              first_name: resolvedStudent.first_name,
              last_name: resolvedStudent.last_name,
              name: `${resolvedStudent.first_name || ''} ${resolvedStudent.last_name || ''}`.trim(),
              avatar_url: resolvedStudent.avatar_url || resolvedStudent.photo_url,
              instrument: resolvedStudent.instrument,
              birth_date: resolvedStudent.birth_date,
              day_of_birth: resolvedStudent.day_of_birth
            } : null,
            students: resolvedStudent ? [resolvedStudent] : [],
            isGroup: Boolean(sched.is_group)
          });
        });

        // Add standalone occurrences not linked to a regular schedule
        occurrences.forEach((occ: any) => {
          if (!occ.schedule_id || !schedules.some((s: any) => s.id === occ.schedule_id)) {
            const resolvedStudent = occ.student || (allStudents && allStudents.find((s: any) => s.id === occ.student_id));
            const slotTime = occ.start_time || '14:00';
            const formattedTime = slotTime.substring(0, 5);
            const occRoom = getOccOrSchedRoom(occ);

            timelineSlots.push({
              id: occ.id,
              scheduleId: occ.schedule_id,
              schedule_id: occ.schedule_id,
              timeSlot: formattedTime,
              startTime: formattedTime,
              duration: occ.duration || 30,
              date: todayStr,
              status: occ.status || 'scheduled',
              is_virtual: false,
              room: occRoom,
              instrument: resolvedStudent?.instrument || 'Instrument',
              student: resolvedStudent ? {
                id: resolvedStudent.id,
                first_name: resolvedStudent.first_name,
                last_name: resolvedStudent.last_name,
                name: `${resolvedStudent.first_name || ''} ${resolvedStudent.last_name || ''}`.trim(),
                avatar_url: resolvedStudent.avatar_url || resolvedStudent.photo_url,
                instrument: resolvedStudent.instrument
              } : null,
              students: resolvedStudent ? [resolvedStudent] : [],
              isGroup: false
            });
          }
        });
      }

      // Add room bookings
      roomBookings.forEach((rb: any) => {
        const slotTime = rb.start_time || '12:00';
        const formattedTime = slotTime.substring(0, 5);
        const [sh, sm] = formattedTime.split(':').map(Number);
        const [eh, em] = (rb.end_time || '13:00').substring(0, 5).split(':').map(Number);
        const duration = Math.max(15, (eh * 60 + em) - (sh * 60 + sm));

        timelineSlots.push({
          id: `rb-${rb.id}`,
          timeSlot: formattedTime,
          startTime: formattedTime,
          duration: duration,
          date: todayStr,
          status: 'booked',
          isBreak: rb.booking_type === 'break',
          room: rb.room?.name || 'Gebuchter Raum',
          isGroup: false,
          students: []
        });
      });

      // Sort chronological
      timelineSlots.sort((a, b) => (a.timeSlot || '00:00').localeCompare(b.timeSlot || '00:00'));

      const newBriefingData = { timeline: timelineSlots };
      setBriefingData(newBriefingData);
      try {
        localStorage.setItem(`groovelab_briefing_timeline_${effectiveTeacherId}_${todayStr}`, JSON.stringify(newBriefingData));
        localStorage.setItem(`groovelab_briefing_timeline_${effectiveTeacherId}_latest`, JSON.stringify(newBriefingData));
      } catch (e) {}
    } catch (err) {
      console.error('[useTeacherTagesplan] Failed to load briefing timeline:', err);
    }
  }, [effectiveTeacherId, teacher, allStudents, rooms]);

  useEffect(() => {
    loadBriefingTimeline();
    if (typeof window === 'undefined') return;

    const handleSync = () => {
      loadBriefingTimeline();
    };

    window.addEventListener('groovelab_simulated_date_changed', handleSync);
    window.addEventListener('groovelab_schedule_changed', handleSync);
    window.addEventListener('refresh-bookings', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('groovelab_simulated_date_changed', handleSync);
      window.removeEventListener('groovelab_schedule_changed', handleSync);
      window.removeEventListener('refresh-bookings', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadBriefingTimeline]);

  // Zoom
  const [zoomFactor, setZoomFactor] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`groovelab_zoom_${userId}`);
      if (saved) return parseFloat(saved);
    }
    return 1;
  });

  const handleZoomChange = useCallback((value: number) => {
    setZoomFactor(value);
    if (userId) {
      localStorage.setItem(`groovelab_zoom_${userId}`, value.toString());
    }
  }, [userId]);

  // Double confirm slot cancel
  const [confirmCancelSlotId, setConfirmCancelSlotId] = useState<string | null>(null);
  const [activeChatOccIds, setActiveChatOccIds] = useState<Set<string>>(new Set());
  const [activeChatOcc, setActiveChatOcc] = useState<any | null>(null);

  const handleCancelSlotWithDoubleConfirm = useCallback(async (slot: any) => {
    try {
      const targetSlot = slot.isGroup ? slot.slots[0] : slot;
      const slotId = targetSlot?.id;
      const scheduleId = targetSlot?.schedule_id || targetSlot?.scheduleId;
      const studentId = slot.isGroup ? slot.students[0]?.id : slot.student?.id;
      const dateStr = slot.date || (briefingData?.timeline?.[0]?.date);
      const startTime = slot.startTime || slot.timeSlot || slot.start_time || '14:00';
      const duration = slot.duration || 45;
      
      if (!dateStr) return;

      const isVirtual = Boolean(
        targetSlot?.is_virtual ||
        (slotId && (String(slotId).startsWith('virt_') || String(slotId).startsWith('virtual-')))
      );

      if (isVirtual) {
        let existingId: string | null = null;
        if (scheduleId && dateStr) {
          const { data: existingOcc } = await supabase
            .from('schedule_occurrences')
            .select('id')
            .eq('schedule_id', scheduleId)
            .eq('date', dateStr)
            .maybeSingle();
          if (existingOcc?.id) {
            existingId = existingOcc.id;
          }
        }

        let opError = null;
        if (existingId) {
          const { error } = await supabase
            .from('schedule_occurrences')
            .update({
              status: 'cancelled',
              student_acknowledged: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingId);
          opError = error;
        } else {
          const { error } = await supabase
            .from('schedule_occurrences')
            .insert({
              schedule_id: scheduleId || null,
              student_id: studentId || null,
              teacher_id: userId,
              date: dateStr,
              start_time: startTime,
              duration: duration,
              status: 'cancelled',
              student_acknowledged: true
            });
          opError = error;
        }

        if (opError) {
          console.error('Error inserting/updating cancellation:', opError);
          alert('Fehler beim Absagen des Termins: ' + opError.message);
        } else {
          if (onToast) onToast('Termin erfolgreich abgesagt.');
          try {
            if (studentId && userId && dateStr) {
              const [y, m, d] = String(dateStr).split('-').map(Number);
              const occDate = (y && m && d) ? new Date(y, m - 1, d) : new Date();
              const shortDay = occDate.toLocaleDateString('de-DE', { weekday: 'short' });
              const shortDate = occDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
              const timeLabel = startTime.substring(0, 5);
              const targetOccId = existingId || (scheduleId ? `virtual-${scheduleId}-${dateStr}` : null);

              const now = new Date();
              const execDateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
              const execTimeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
              const execTimestampStr = `${execDateStr} um ${execTimeStr} Uhr`;
              const teacherDisplayName = formatTeacherFullName(teacher) || 'Lehrkraft';

              await supabase.from('campus_direct_messages').insert({
                sender_id: userId,
                recipient_id: studentId,
                content: `❌ Terminabsage: Dein Unterrichtstermin am ${shortDay} ${shortDate} um ${timeLabel} Uhr fällt aus.\n🕒 Abgesagt am: ${execTimestampStr} durch Lehrkraft (${teacherDisplayName}).`,
                occurrence_id: targetOccId,
                is_system: true,
                message_type: 'reschedule_notification'
              });
            }
          } catch (dmErr) {
            console.warn('Could not insert cancellation system message in TeacherDashboard:', dmErr);
          }
          if (onRefresh) onRefresh();
        }
      } else if (slotId) {
        const { error } = await supabase
          .from('schedule_occurrences')
          .update({
            status: 'cancelled',
            student_acknowledged: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', slotId);

        if (error) {
          console.error('Error updating cancellation:', error);
          alert('Fehler beim Absagen des Termins: ' + error.message);
        } else {
          if (onToast) onToast('Termin erfolgreich abgesagt.');
          try {
            if (studentId && userId && dateStr) {
              const [y, m, d] = String(dateStr).split('-').map(Number);
              const occDate = (y && m && d) ? new Date(y, m - 1, d) : new Date();
              const shortDay = occDate.toLocaleDateString('de-DE', { weekday: 'short' });
              const shortDate = occDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
              const timeLabel = startTime.substring(0, 5);

              const now = new Date();
              const execDateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
              const execTimeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
              const execTimestampStr = `${execDateStr} um ${execTimeStr} Uhr`;
              const teacherDisplayName = formatTeacherFullName(teacher) || 'Lehrkraft';

              await supabase.from('campus_direct_messages').insert({
                sender_id: userId,
                recipient_id: studentId,
                content: `❌ Terminabsage: Dein Unterrichtstermin am ${shortDay} ${shortDate} um ${timeLabel} Uhr fällt aus.\n🕒 Abgesagt am: ${execTimestampStr} durch Lehrkraft (${teacherDisplayName}).`,
                occurrence_id: slotId,
                is_system: true,
                message_type: 'reschedule_notification'
              });
            }
          } catch (dmErr) {
            console.warn('Could not insert cancellation system message in TeacherDashboard:', dmErr);
          }
          if (onRefresh) onRefresh();
        }
      }
    } catch (err: any) {
      console.error('Error in handleCancelSlotWithDoubleConfirm:', err);
    } finally {
      setConfirmCancelSlotId(null);
    }
  }, [briefingData, userId, teacher, onRefresh, onToast]);

  const handleTeacherReactivateOccurrence = useCallback(async (occ: any) => {
    if (!confirm('Möchtest du diesen Unterrichtstermin wieder reaktivieren? Der Termin findet dann wieder regulär statt.')) return;
    try {
      const occId = occ.id;
      const scheduleId = occ.schedule_id || occ.scheduleId;
      const studentId = occ.student_id || occ.student?.id;
      const dateStr = occ.date;

      const isVirtual = Boolean(occ.is_virtual || (occId && (String(occId).startsWith('virt_') || String(occId).startsWith('virtual-'))));

      if (isVirtual && scheduleId && dateStr) {
        await supabase
          .from('schedule_occurrences')
          .delete()
          .eq('schedule_id', scheduleId)
          .eq('date', dateStr);
      } else if (occId) {
        await supabase
          .from('schedule_occurrences')
          .update({ status: 'rescheduled_confirmed', student_acknowledged: false })
          .eq('id', occId);
      }

      if (studentId && userId) {
        const teacherDisplayName = formatTeacherFullName(teacher) || 'Lehrkraft';
        await supabase.from('campus_direct_messages').insert({
          sender_id: userId,
          recipient_id: studentId,
          content: `🔄 Termin reaktiviert: Dein Unterrichtstermin findet wieder regulär statt.`,
          is_system: true,
          message_type: 'cancellation_reset'
        });
      }

      if (onToast) onToast('Unterrichtstermin erfolgreich reaktiviert.');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error reactivating occurrence:', err);
    }
  }, [teacher, userId, onToast, onRefresh]);

  // Room issues
  const [schoolRoomIssues, setSchoolRoomIssues] = useState<UserNote[]>([]);

  const teacherTodayRooms = useMemo(() => {
    const set = new Set<string>();
    (briefingData?.timeline || []).forEach((slot: any) => {
      const rName = slot.room || slot.rooms?.name;
      if (rName && typeof rName === 'string' && rName !== 'Raum' && rName !== 'Unbenannter Raum') {
        set.add(rName);
      }
    });
    return Array.from(set);
  }, [briefingData?.timeline]);

  const todayTagesplanStudents = useMemo(() => {
    const set = new Map<string, any>();
    (briefingData?.timeline || []).forEach((slot: any) => {
      if (slot.isGroup && slot.students) {
        slot.students.forEach((s: any) => {
          if (s && s.id) set.set(s.id, s);
        });
      } else if (slot.student && slot.student.id) {
        set.set(slot.student.id, slot.student);
      }
    });
    return Array.from(set.values());
  }, [briefingData?.timeline]);

  const tagesplanRoomIssues = useMemo(() => {
    if (teacherTodayRooms.length === 0) return [];
    return schoolRoomIssues.filter(issue => {
      const contentLower = (issue.content || '').toLowerCase();
      const roomIdLower = (issue.room_id || '').toLowerCase();
      const tagsLower = (issue.tags || []).map(t => t.toLowerCase());

      return teacherTodayRooms.some(todayRoom => {
        if (!todayRoom) return false;
        const roomNorm = todayRoom.toLowerCase().trim();
        if (roomIdLower && (roomIdLower === roomNorm || roomIdLower.includes(roomNorm) || roomNorm.includes(roomIdLower))) return true;
        if (tagsLower.some(t => t.includes(roomNorm) || (roomNorm.includes('raum') && t.includes(roomNorm.replace('raum', '').trim())))) return true;
        if (contentLower.includes(roomNorm)) return true;
        const numMatch = roomNorm.match(/\d+/);
        if (numMatch) {
          const num = numMatch[0];
          const regex = new RegExp(`\\braum\\s*#?${num}\\b|!raum\\s*#?${num}\\b|\\[raum\\s*#?${num}\\]`, 'i');
          if (regex.test(contentLower) || tagsLower.some(t => regex.test(t)) || regex.test(roomIdLower)) return true;
        }
        return false;
      });
    });
  }, [teacherTodayRooms, schoolRoomIssues]);

  const handleResolveRoomIssueInTagesplan = useCallback(async (issueId: string) => {
    try {
      const effectiveSchoolId = teacher?.school_id || 1;
      await notesService.resolveRoomIssue(issueId, 'teacher', effectiveSchoolId);
      setSchoolRoomIssues(prev => prev.filter(i => i.id !== issueId));
      if (onToast) onToast('✅ Raummangel als behoben gemeldet');
    } catch (err) {
      console.error('[TeacherDashboard] Error resolving room issue:', err);
    }
  }, [teacher?.school_id, onToast]);

  const handleUpdateIssueRoomInTagesplan = useCallback(async (issueId: string, newRoom: string) => {
    try {
      const effectiveSchoolId = teacher?.school_id || 1;
      await notesService.updateNoteRoom(issueId, newRoom, effectiveSchoolId);
      setSchoolRoomIssues(prev => prev.map(i => i.id === issueId ? { ...i, room_id: newRoom } : i));
      if (onToast) onToast(`📍 Mangel erfolgreich ${newRoom} zugeordnet`);
    } catch (err) {
      console.error('[TeacherDashboard] Error updating room issue room:', err);
    }
  }, [teacher?.school_id, onToast]);

  return {
    briefingData,
    setBriefingData,
    activeTimelineSlot,
    setActiveTimelineSlot,
    quickAudioStudent,
    setQuickAudioStudent,
    zoomFactor,
    setZoomFactor,
    handleZoomChange,
    confirmCancelSlotId,
    setConfirmCancelSlotId,
    activeChatOccIds,
    setActiveChatOccIds,
    activeChatOcc,
    setActiveChatOcc,
    handleCancelSlotWithDoubleConfirm,
    handleTeacherReactivateOccurrence,
    schoolRoomIssues,
    setSchoolRoomIssues,
    teacherTodayRooms,
    todayTagesplanStudents,
    tagesplanRoomIssues,
    handleResolveRoomIssueInTagesplan,
    handleUpdateIssueRoomInTagesplan,
    loadBriefingTimeline
  };
}
