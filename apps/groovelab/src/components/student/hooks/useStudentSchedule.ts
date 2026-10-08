import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, checkSupabaseConnection } from '../../../lib/supabase';
import { formatTeacherFullName } from '../../../utils/nameHelper';
import { getSimulatedNow, toLocalYYYYMMDD } from '../studentDateUtils';
import {
  respondToRescheduleProposal,
  isRescheduleAcknowledged,
  recordRescheduleAcknowledgement
} from '../../../services/studentRescheduleService';

interface UseStudentScheduleProps {
  studentId: string;
  studentUser: any;
  studentUiLevel: string;
  inMemoryParentPinRef: React.MutableRefObject<string>;
  onRefreshData?: () => Promise<void>;
}

export function useStudentSchedule({
  studentId,
  studentUser,
  studentUiLevel,
  inMemoryParentPinRef,
  onRefreshData
}: UseStudentScheduleProps) {
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleOccurrences, setScheduleOccurrences] = useState<any[]>([]);
  const [schoolYearOccurrences, setSchoolYearOccurrences] = useState<any[]>([]);
  const [briefingData, setBriefingData] = useState<any>(null);
  const [isOfflineScheduleActive, setIsOfflineScheduleActive] = useState(false);
  const [carrierGhostingDetected, setCarrierGhostingDetected] = useState(false);

  // Global Master PIN Gate for appointment modifications & absence
  const [showGlobalParentPinModal, setShowGlobalParentPinModal] = useState(false);
  const [globalPinInput, setGlobalPinInput] = useState('');
  const [globalPinError, setGlobalPinError] = useState('');
  const [globalPinPendingAction, setGlobalPinPendingAction] = useState<(() => void) | null>(null);
  const [isVerifyingGlobalPin, setIsVerifyingGlobalPin] = useState(false);

  // Reschedule Bottom Sheet
  const [isRescheduleSheetOpen, setIsRescheduleSheetOpen] = useState(false);
  const [activeRescheduleBottomSheetOcc, setActiveRescheduleBottomSheetOcc] = useState<any | null>(null);
  const [isRescheduleLoading, setIsRescheduleLoading] = useState(false);

  // Quick Appointment Chat (Shoutbox)
  const [showAppointmentChat, setShowAppointmentChat] = useState(false);
  const [appointmentChatData, setAppointmentChatData] = useState<any | null>(null);
  const [rescheduleChatDraft, setRescheduleChatDraft] = useState('');

  // Crisis Notifications
  const [unreadCrisisNotifs, setUnreadCrisisNotifs] = useState<any[]>([]);

  const isJuniorLevel = studentUiLevel === 'junior' || studentUser?.campus_ui_level === 'junior';
  const isStudentAbsenceAllowed = isJuniorLevel ? false : Boolean(studentUser?.parent_allow_absences ?? (studentUiLevel === 'pro'));
  const isStudentRescheduleAllowed = isJuniorLevel ? false : Boolean(studentUser?.parent_allow_reschedule_confirm ?? (studentUiLevel === 'pro'));

  const fetchSchedule = useCallback(async () => {
    if (!studentId) return;
    setScheduleLoading(true);
    try {
      const simNow = getSimulatedNow();
      const todayStr = toLocalYYYYMMDD(simNow);
      const effectiveSchoolId = studentUser?.school_id || '';

      // 0. SWR Fast-Path: Prüfe zuerst den synchronisierten Events-Cache von CampusEventsBoard (SSOT)
      let swrLessons: any[] = [];
      try {
        const swrKeys = [
          effectiveSchoolId ? `cg_events_swr_${effectiveSchoolId}_${studentId}` : null,
          `cg_events_swr_global_${studentId}`
        ].filter(Boolean) as string[];

        for (const k of swrKeys) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed?.lessons) && parsed.lessons.length > 0) {
              swrLessons = parsed.lessons.filter((l: any) => {
                const sId = l.student_id || l.student?.id || l.board_student_id;
                return !sId || String(sId) === String(studentId) || (l.students && Array.isArray(l.students) && l.students.some((st: any) => String(st.id) === String(studentId)));
              });
              if (swrLessons.length > 0) break;
            }
          }
        }
      } catch (e) {}

      // 1. Fetch upcoming occurrences
      const { data: occData, error: occError } = await supabase
        .from('schedule_occurrences')
        .select('*, teacher:users!schedule_occurrences_teacher_id_fkey(id, first_name, last_name, nickname, photo_url, avatar_url, instrument, role), rooms(name)')
        .eq('student_id', studentId)
        .gte('date', todayStr)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      // 2. Fetch master schedule (schedules) for SSOT fallback & todayLesson calculation
      const { data: masterSchedules } = await supabase
        .from('schedules')
        .select('*, teacher:users!schedules_teacher_id_fkey(id, first_name, last_name, nickname, photo_url, avatar_url, instrument, role), rooms(name)')
        .eq('student_id', studentId)
        .eq('status', 'approved');

      // 3. Stundenplan-Designer Entwürfe (teacherPlannedBoards) einbinden (SSOT-Parität zu CampusEventsBoard)
      const primaryTeacherId = studentUser?.teacher_id || masterSchedules?.[0]?.teacher_id;
      let teacherPlannedSlot: { dayOfWeek: number; timeSlot: string; origTimeSlot?: string; isMoved: boolean; roomName?: string } | null = null;

      try {
        const activePlatform = (typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_platform') || localStorage.getItem('groovelab_active_platform')) : null) || 'campus';
        const teacherDraftKeys = [
          primaryTeacherId ? `groovelab_teacher_draft_state_${activePlatform}_${primaryTeacherId}` : null,
          primaryTeacherId ? `groovelab_teacher_draft_state_campus_${primaryTeacherId}` : null,
          primaryTeacherId ? `groovelab_teacher_draft_state_groovelab_${primaryTeacherId}` : null,
          primaryTeacherId ? `groovelab_teacher_boards_${activePlatform}_${primaryTeacherId}` : null,
          primaryTeacherId ? `groovelab_teacher_boards_campus_${primaryTeacherId}` : null,
          primaryTeacherId ? `groovelab_teacher_boards_${primaryTeacherId}` : null,
          `groovelab_schedule_boards`,
          `planned_boards`
        ].filter(Boolean) as string[];

        let loadedBoards: any[] = [];
        for (const k of teacherDraftKeys) {
          const stored = localStorage.getItem(k);
          if (stored) {
            try {
              let parsed = JSON.parse(stored);
              if (typeof parsed === 'string') parsed = JSON.parse(parsed);
              if (parsed?.drafts && Array.isArray(parsed.drafts) && parsed.drafts.length > 0) {
                const targetDraftId = parsed.submittedDraftId || parsed.activeDraftId || parsed.drafts[0]?.id;
                const d = parsed.drafts.find((dr: any) => dr.id === targetDraftId) || parsed.drafts[0];
                if (Array.isArray(d?.boards)) { loadedBoards = d.boards; break; }
              } else if (Array.isArray(parsed) && parsed.length > 0) {
                loadedBoards = parsed;
                break;
              }
            } catch (e) {}
          }
        }

        if (loadedBoards.length > 0) {
          const parseDay = (d: any): number => {
            if (typeof d === 'number') return d;
            const s = String(d || '').trim().toLowerCase();
            if (s.startsWith('mo') || s === '1') return 1;
            if (s.startsWith('di') || s === '2') return 2;
            if (s.startsWith('mi') || s === '3') return 3;
            if (s.startsWith('do') || s === '4') return 4;
            if (s.startsWith('fr') || s === '5') return 5;
            if (s.startsWith('sa') || s === '6') return 6;
            if (s.startsWith('so') || s === '7') return 7;
            return 1;
          };

          for (const b of loadedBoards) {
            const bDay = parseDay(b.day || b.day_of_week || 1);
            if (Array.isArray(b.students)) {
              const matchedStudent = b.students.find((st: any) => 
                String(st.id) === String(studentId) ||
                (st.firstName && studentUser?.first_name && String(st.firstName).trim().toLowerCase() === String(studentUser.first_name).trim().toLowerCase()) ||
                (st.name && studentUser?.first_name && String(st.name).toLowerCase().includes(String(studentUser.first_name).toLowerCase()))
              );
              if (matchedStudent) {
                const assigned = matchedStudent.assignedTime || matchedStudent.customStartTime || matchedStudent.startTime || b.startTime || '14:00';
                const orig = masterSchedules?.[0]?.time_slot || '14:00';
                const isMoved = (assigned.substring(0, 5) !== orig.substring(0, 5)) || Boolean(matchedStudent.isPinned);
                teacherPlannedSlot = {
                  dayOfWeek: bDay,
                  timeSlot: assigned.substring(0, 5),
                  origTimeSlot: orig.substring(0, 5),
                  isMoved,
                  roomName: b.room_name || b.roomName || 'Raum 4'
                };
                break;
              }
            }
          }
        }
      } catch (e) {
        console.warn('[useStudentSchedule] Error reading teacher drafts:', e);
      }

      // 4. Goldstandard Unified Merge Engine: Projiziere Stamm-Termine und überschreibe mit echten DB-Occurrences & Designer-Verschiebungen
      let finalMergedOccurrences: any[] = [];

      if (swrLessons.length > 0) {
        // Wenn CampusEventsBoard bereits autoritativ berechnet hat, übernimm diese 1:1 als SSOT,
        // prüfe aber das Acknowledgement-Ledger gegen veraltete SWR-Snapshots
        finalMergedOccurrences = swrLessons.map((l: any) => {
          if (l.date && isRescheduleAcknowledged(studentId, l.date, l.start_time, l.id)) {
            return { ...l, status: 'rescheduled_confirmed', student_acknowledged: true };
          }
          return l;
        });
      } else {
        const enrichedDbOccs = (!occError && occData) ? occData.map((occ: any) => {
          const matchingMaster = (masterSchedules || []).find((s: any) => s.id === occ.schedule_id || s.teacher_id === occ.teacher_id);
          const resolvedRoom = occ.room_name || occ.room?.name || occ.rooms?.name || (matchingMaster?.rooms as any)?.name || 'Raum 4';
          const resolvedInst = occ.instrument || matchingMaster?.instrument || studentUser?.instrument || 'Gitarre';
          return {
            ...occ,
            room: resolvedRoom,
            room_name: resolvedRoom,
            instrument: resolvedInst,
            subject: occ.subject || resolvedInst,
            teacher: occ.teacher || matchingMaster?.teacher || null
          };
        }) : [];

        const projectedOccurrences: any[] = [];
        if (masterSchedules && masterSchedules.length > 0) {
          masterSchedules.forEach((sch: any) => {
            const dayNum = typeof sch.day_of_week === 'number' ? sch.day_of_week : (parseInt(sch.day_of_week, 10) || 1);
            const current = new Date(simNow);
            current.setHours(0, 0, 0, 0);
            const currentDay = current.getDay() || 7;
            let diff = dayNum - currentDay;
            if (diff < 0) diff += 7;
            const targetDate = new Date(current);
            targetDate.setDate(current.getDate() + diff);

            const isMatchingDraftSlot = teacherPlannedSlot && teacherPlannedSlot.dayOfWeek === dayNum;
            const effectiveTimeSlot = isMatchingDraftSlot ? teacherPlannedSlot!.timeSlot : (sch.time_slot || '14:00');
            const isMovedFromDraft = isMatchingDraftSlot ? teacherPlannedSlot!.isMoved : false;
            const startTime = effectiveTimeSlot.includes(':') && effectiveTimeSlot.split(':').length === 2 ? `${effectiveTimeSlot}:00` : effectiveTimeSlot;
            const teacherObj = sch.teacher || null;
            const roomName = (isMatchingDraftSlot && teacherPlannedSlot!.roomName) || (sch.rooms as any)?.name || 'Raum 4';

            for (let i = 0; i < 12; i++) {
              const d = new Date(targetDate);
              d.setDate(targetDate.getDate() + (i * 7));
              const dateStr = toLocalYYYYMMDD(d);

              // Gibt es eine konkrete Occurrence in der Datenbank für diesen Tag?
              const dbMatch = enrichedDbOccs.find((o: any) => o.date === dateStr);
              if (dbMatch) {
                const isAckedSlot = isRescheduleAcknowledged(studentId, dateStr, dbMatch.start_time, dbMatch.id);
                if (isAckedSlot && dbMatch.status !== 'cancelled' && dbMatch.status !== 'canceled_by_student') {
                  projectedOccurrences.push({
                    ...dbMatch,
                    status: 'rescheduled_confirmed',
                    student_acknowledged: true
                  });
                } else {
                  projectedOccurrences.push(dbMatch);
                }
              } else {
                const isAckedSlot = isRescheduleAcknowledged(studentId, dateStr, startTime);
                const projectedStatus = isAckedSlot
                  ? 'rescheduled_confirmed'
                  : (isMovedFromDraft ? 'pending_reschedule' : 'scheduled');

                projectedOccurrences.push({
                  id: `projected-${sch.id}-${dateStr}`,
                  schedule_id: sch.id,
                  student_id: studentId,
                  teacher_id: sch.teacher_id,
                  teacher: teacherObj,
                  date: dateStr,
                  start_time: startTime,
                  original_start_time: (sch.time_slot || '14:00').includes(':') && (sch.time_slot || '14:00').split(':').length === 2 ? `${sch.time_slot}:00` : sch.time_slot,
                  duration: sch.duration || 30,
                  status: projectedStatus,
                  student_acknowledged: isAckedSlot ? true : false,
                  is_moved: isMovedFromDraft,
                  is_rescheduled: isMovedFromDraft,
                  room_name: roomName
                });
              }
            }
          });
        }

        // DB Occurrences hinzufügen, die nicht in den wöchentlichen Slot fielen
        enrichedDbOccs.forEach((o: any) => {
          if (!projectedOccurrences.some((po: any) => po.id === o.id || po.date === o.date)) {
            projectedOccurrences.push(o);
          }
        });

        projectedOccurrences.sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return (a.start_time || '').localeCompare(b.start_time || '');
        });

        finalMergedOccurrences = projectedOccurrences;
      }

      // 5. Hydrate todayLesson mit autoritativer Uhrzeit
      let todayLesson: any = null;
      const todayOcc = finalMergedOccurrences.find((o: any) => o.date === todayStr && o.status !== 'cancelled' && o.status !== 'canceled_by_student');
      if (todayOcc) {
        todayLesson = {
          id: todayOcc.id,
          time: todayOcc.start_time ? todayOcc.start_time.substring(0, 5) : '14:00',
          room: todayOcc.room_name || todayOcc.template_room_id || 'Raum 4',
          teacher: todayOcc.teacher ? formatTeacherFullName(todayOcc.teacher) : 'Lehrkraft',
          teacher_id: todayOcc.teacher_id,
          status: todayOcc.status,
          is_moved: todayOcc.is_moved,
          is_rescheduled: todayOcc.is_rescheduled
        };
      }

      setBriefingData({ todayLesson });

      if (finalMergedOccurrences.length > 0) {
        setScheduleOccurrences(finalMergedOccurrences);
        setSchoolYearOccurrences(finalMergedOccurrences);
        setIsOfflineScheduleActive(false);
        try {
          localStorage.setItem(`campus_schedule_cache_${studentId}`, JSON.stringify(finalMergedOccurrences));
        } catch (e) {}
      } else {
        // Fallback to cache
        try {
          const cached = localStorage.getItem(`campus_schedule_cache_${studentId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            setScheduleOccurrences(parsed);
            setSchoolYearOccurrences(parsed);
            setIsOfflineScheduleActive(true);
          }
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Schedule fetch exception:', err);
      try {
        const cached = localStorage.getItem(`campus_schedule_cache_${studentId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setScheduleOccurrences(parsed);
          setSchoolYearOccurrences(parsed);
          setIsOfflineScheduleActive(true);
        }
      } catch (e) {}
    } finally {
      setScheduleLoading(false);
    }
  }, [studentId, studentUser]);

  useEffect(() => {
    fetchSchedule();

    // 🏛️ 0,1% Goldstandard: Cross-Device Realtime-Synchronisation via Supabase WebSocket
    const channel = studentId ? supabase
      .channel(`student_schedule_realtime_${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedule_occurrences',
          filter: `student_id=eq.${studentId}`
        },
        () => {
          fetchSchedule();
        }
      )
      .subscribe() : null;

    // 🏛️ 0,1% Goldstandard: Lokale Synchronisation zwischen Termine Board, Kalender & Briefing
    const handleSync = () => {
      fetchSchedule();
    };

    window.addEventListener('campus_schedule_sync', handleSync);
    window.addEventListener('campus_schedule_changed', handleSync);
    window.addEventListener('campus_schedule_mutated', handleSync);
    window.addEventListener('groovelab_schedule_changed', handleSync);
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === 'campus_schedule_sync' || 
        e.key === 'groovelab_schedule_changed' || 
        (e.key && e.key.startsWith('cg_events_swr_')) ||
        (e.key && e.key.startsWith('campus_reschedule_ack_')) ||
        (e.key && e.key.startsWith('groovelab_acked_'))
      ) {
        fetchSchedule();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('campus_schedule_sync', handleSync);
      window.removeEventListener('campus_schedule_changed', handleSync);
      window.removeEventListener('campus_schedule_mutated', handleSync);
      window.removeEventListener('groovelab_schedule_changed', handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchSchedule, studentId]);

  const cancelledSchoolYearOccurrences = useMemo(() => {
    return scheduleOccurrences.filter(o => {
      const s = String(o.status || '').toLowerCase();
      const role = String(o.canceled_by_role || '').toLowerCase();
      const notes = String(o.notes || '').toLowerCase();

      // Ausschluss jeglicher Lehrkraft- oder Schulausfälle (Art. 9 DSGVO, § 26 BDSG)
      if (
        role === 'teacher' ||
        s === 'teacher_ausfall' ||
        s === 'canceled_by_teacher_ausfall' ||
        s === 'canceled_by_teacher' ||
        notes.includes('abwesend: lehrkraft') ||
        notes.includes('abwesend: schulausfall')
      ) {
        return false;
      }

      // Schüler-ID Matching wenn vorhanden
      if (studentId && o.student_id && o.student_id !== studentId) {
        return false;
      }

      // Ausschließlich eigene Absagen des Schülers / der Familie
      return s === 'canceled_by_student' || role === 'student' || s === 'absent' || notes.includes('abwesend: schüler');
    });
  }, [scheduleOccurrences, studentId]);

  // Actions
  const handleConfirmReschedule = async (occId: string) => {
    try {
      const targetOcc = scheduleOccurrences.find(o => o.id === occId);
      const teacherId = targetOcc?.teacher_id || targetOcc?.teacher?.id;

      if (studentId && targetOcc?.date) {
        recordRescheduleAcknowledgement(studentId, targetOcc.date, targetOcc.start_time, 'accept');
      }

      await respondToRescheduleProposal({
        occurrenceId: occId,
        decision: 'accept',
        studentId,
        teacherId,
        occurrenceDate: targetOcc?.date,
        occurrenceStartTime: targetOcc?.start_time,
        client: supabase
      });

      setScheduleOccurrences(prev => prev.map(o => (o.id === occId || (targetOcc?.date && o.date === targetOcc.date)) ? { ...o, status: 'rescheduled_confirmed', student_acknowledged: true } : o));

      if (onRefreshData) {
        await onRefreshData();
      } else {
        await fetchSchedule();
      }
    } catch (e) {
      console.error('Error confirming reschedule:', e);
    }
  };

  const handleCancelOccurrence = async (occ: any, skipPinCheck = false) => {
    // Fail-Closed Vergangenheits-Sperre
    const simStr = typeof window !== 'undefined' ? localStorage.getItem('groovelab_simulated_date') : null;
    const d = simStr ? new Date(simStr + 'T14:00:00') : new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const nowTimeStr = simStr ? '14:00:00' : d.toTimeString().substring(0, 8);
    const isPastOcc = occ.date < todayStr || (occ.date === todayStr && (occ.start_time || '00:00') < nowTimeStr);
    if (isPastOcc) {
      alert('Vergangene Termine können nicht mehr abgesagt werden.');
      return;
    }

    if (!skipPinCheck && !isStudentAbsenceAllowed) {
      setGlobalPinPendingAction(() => () => handleCancelOccurrence(occ, true));
      setGlobalPinInput('');
      setGlobalPinError('');
      setShowGlobalParentPinModal(true);
      return;
    }

    try {
      const targetId = occ.id;
      const { data, error } = await supabase.rpc('cancel_student_schedule_occurrence', {
        p_student_id: studentId,
        p_occurrence_id: targetId ? String(targetId) : null,
        p_date: occ.date,
        p_start_time: occ.start_time ? occ.start_time.substring(0, 5) : '15:00',
        p_duration: Number(occ.duration) || 45,
        p_teacher_id: occ.teacher_id || null,
        p_schedule_id: occ.schedule_id || null,
        p_notes: 'canceled_by_student'
      });

      if (error) {
        console.error('Error calling cancel_student_schedule_occurrence:', error);
        throw error;
      }

      const newOccId = (data as any)?.occurrence_id || targetId;

      setScheduleOccurrences(prev => prev.map(o => {
        if (o.id === targetId || (o.date === occ.date && o.start_time === occ.start_time)) {
          return {
            ...o,
            id: newOccId,
            status: 'canceled_by_student',
            canceled_by_role: 'student',
            student_acknowledged: true
          };
        }
        return o;
      }));

      if (onRefreshData) {
        await onRefreshData();
      } else {
        await fetchSchedule();
      }
    } catch (e) {
      console.error('Error cancelling occurrence via RPC, applying fallback:', e);
      try {
        const targetId = occ.id;
        await supabase
          .from('schedule_occurrences')
          .update({
            status: 'canceled_by_student',
            canceled_by_role: 'student',
            student_acknowledged: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', targetId);

        setScheduleOccurrences(prev => prev.map(o => o.id === targetId ? { ...o, status: 'canceled_by_student' } : o));
      } catch (fallbackErr) {
        console.error('Fallback cancellation failed:', fallbackErr);
      }
    }
  };

  const handleUndoCancelOccurrence = async (occ: any, skipPinCheck = false) => {
    if (!skipPinCheck && !isStudentAbsenceAllowed) {
      setGlobalPinPendingAction(() => () => handleUndoCancelOccurrence(occ, true));
      setGlobalPinInput('');
      setGlobalPinError('');
      setShowGlobalParentPinModal(true);
      return;
    }

    try {
      const targetId = occ.id;
      const { data, error } = await supabase.rpc('undo_cancel_student_schedule_occurrence', {
        p_student_id: studentId,
        p_occurrence_id: targetId ? String(targetId) : null,
        p_date: occ.date,
        p_start_time: occ.start_time ? occ.start_time.substring(0, 5) : '15:00',
        p_duration: Number(occ.duration) || 45,
        p_teacher_id: occ.teacher_id || null,
        p_schedule_id: occ.schedule_id || null
      });

      if (error) {
        console.error('Error calling undo_cancel_student_schedule_occurrence:', error);
        throw error;
      }

      const restoredOccId = (data as any)?.occurrence_id || targetId;

      setScheduleOccurrences(prev => prev.map(o => {
        if (o.id === targetId || (o.date === occ.date && o.start_time === occ.start_time)) {
          return {
            ...o,
            id: restoredOccId,
            status: 'scheduled',
            canceled_by_role: null,
            student_acknowledged: true
          };
        }
        return o;
      }));

      if (onRefreshData) {
        await onRefreshData();
      } else {
        await fetchSchedule();
      }
    } catch (e) {
      console.error('Error un-cancelling occurrence via RPC, applying fallback:', e);
      try {
        const targetId = occ.id;
        await supabase
          .from('schedule_occurrences')
          .update({
            status: 'scheduled',
            canceled_by_role: null,
            student_acknowledged: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', targetId);

        setScheduleOccurrences(prev => prev.map(o => o.id === targetId ? { ...o, status: 'scheduled' } : o));
      } catch (fallbackErr) {
        console.error('Fallback undo failed:', fallbackErr);
      }
    }
  };

  const handleRejectReschedule = async (occ: any, reason?: string) => {
    try {
      const occId = occ?.id;
      if (!occId) return;
      const teacherId = occ.teacher_id || occ.teacher?.id;

      if (studentId && occ.date) {
        recordRescheduleAcknowledgement(studentId, occ.date, occ.start_time, 'reject');
      }

      await respondToRescheduleProposal({
        occurrenceId: occId,
        decision: 'reject',
        rejectionReason: reason || 'Termin passt nicht',
        studentId,
        teacherId,
        occurrenceDate: occ.date,
        occurrenceStartTime: occ.start_time,
        client: supabase
      });

      setScheduleOccurrences(prev => prev.map(o => (o.id === occId || (occ.date && o.date === occ.date)) ? { ...o, status: 'reschedule_rejected', student_acknowledged: true } : o));

      if (onRefreshData) {
        await onRefreshData();
      } else {
        await fetchSchedule();
      }
    } catch (e) {
      console.error('Error rejecting reschedule:', e);
    }
  };

  const handleAcknowledgeCancellation = async (occId: string) => {
    try {
      await supabase
        .from('schedule_occurrences')
        .update({
          student_acknowledged: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', occId);

      setScheduleOccurrences(prev => prev.map(o => o.id === occId ? { ...o, student_acknowledged: true } : o));
    } catch (e) {
      console.error('Error acknowledging cancellation:', e);
    }
  };

  const handleConfirmCrisisNotification = async (notifId: string) => {
    setUnreadCrisisNotifs(prev => prev.filter(n => n.id !== notifId));
  };

  // Global Parent PIN Verification
  const handleVerifyGlobalParentPin = async (inputPin: string) => {
    setIsVerifyingGlobalPin(true);
    setGlobalPinError('');
    try {
      const { data: ok, error } = await supabase.rpc('verify_parent_pin', {
        student_id: studentId,
        input_pin: inputPin
      });

      if (!error && ok) {
        inMemoryParentPinRef.current = inputPin;
        setShowGlobalParentPinModal(false);
        setGlobalPinInput('');
        if (globalPinPendingAction) {
          const action = globalPinPendingAction;
          setGlobalPinPendingAction(null);
          action();
        }
      } else {
        setGlobalPinError('Falsche Eltern-Master-PIN.');
      }
    } catch (e: any) {
      setGlobalPinError(e.message || 'Prüfung fehlgeschlagen.');
    } finally {
      setIsVerifyingGlobalPin(false);
    }
  };

  const handleVerifyGlobalParentPinAsync = async (inputPin: string): Promise<boolean> => {
    try {
      const { data: ok } = await supabase.rpc('verify_parent_pin', {
        student_id: studentId,
        input_pin: inputPin
      });
      if (ok) {
        inMemoryParentPinRef.current = inputPin;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleBiometricUnlockForGlobalPin = async () => {
    setShowGlobalParentPinModal(false);
    if (globalPinPendingAction) {
      const action = globalPinPendingAction;
      setGlobalPinPendingAction(null);
      action();
    }
  };

  return {
    scheduleLoading,
    setScheduleLoading,
    scheduleOccurrences,
    setScheduleOccurrences,
    schoolYearOccurrences,
    setSchoolYearOccurrences,
    cancelledSchoolYearOccurrences,
    briefingData,
    setBriefingData,
    isOfflineScheduleActive,
    carrierGhostingDetected,
    setCarrierGhostingDetected,
    fetchSchedule,
    handleConfirmReschedule,
    handleCancelOccurrence,
    handleUndoCancelOccurrence,
    handleRejectReschedule,
    handleAcknowledgeCancellation,
    unreadCrisisNotifs,
    setUnreadCrisisNotifs,
    handleConfirmCrisisNotification,
    isRescheduleSheetOpen,
    setIsRescheduleSheetOpen,
    activeRescheduleBottomSheetOcc,
    setActiveRescheduleBottomSheetOcc,
    isRescheduleLoading,
    showAppointmentChat,
    setShowAppointmentChat,
    appointmentChatData,
    setAppointmentChatData,
    rescheduleChatDraft,
    setRescheduleChatDraft,
    showGlobalParentPinModal,
    setShowGlobalParentPinModal,
    globalPinInput,
    setGlobalPinInput,
    globalPinError,
    setGlobalPinError,
    globalPinPendingAction,
    setGlobalPinPendingAction,
    handleVerifyGlobalParentPin,
    handleVerifyGlobalParentPinAsync,
    handleBiometricUnlockForGlobalPin,
    isStudentAbsenceAllowed,
    isStudentRescheduleAllowed
  };
}
