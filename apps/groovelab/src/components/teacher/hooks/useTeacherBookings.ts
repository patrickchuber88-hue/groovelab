import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { areArraysEqualFast } from '../../../utils/fastCompare';
import { fetchHolidaysCached, HolidayRange } from '../../../utils/holidayHelper';
import { isTeacherCurrentlyAbsent } from '../../../utils/teacherAbsenceHelper';
import { maskLastName } from '../../../utils/nameHelper';
import { getSimulatedNow } from '../utils/teacherDashboardUtils';

export interface UseTeacherBookingsProps {
  userId: string;
  teacher: any;
  activePlatform: 'campus' | 'groovelab';
  rooms?: any[];
  showRealNames?: boolean;
  adminFeedbackRequests?: any[];
  adminFeedbackResponses?: any[];
  campusFeedAnnouncements?: any[];
  classFeedPosts?: any[];
  feedInteractions?: any[];
  activePlanningEvents?: any[];
  mySubmittedProgramPoints?: any[];
  isTeacherBriefingSidebarCollapsed?: boolean;
  lastSeenFeedTime?: number;
  onTabChange?: (tab: string) => void;
}

export function useTeacherBookings({
  userId,
  teacher,
  activePlatform,
  rooms = [],
  showRealNames = false,
  adminFeedbackRequests = [],
  adminFeedbackResponses = [],
  campusFeedAnnouncements = [],
  classFeedPosts = [],
  feedInteractions = [],
  activePlanningEvents = [],
  mySubmittedProgramPoints = [],
  isTeacherBriefingSidebarCollapsed = false,
  lastSeenFeedTime = 0,
  onTabChange
}: UseTeacherBookingsProps) {
  const [holidays, setHolidays] = useState<HolidayRange[]>([]);
  const [briefingRefreshTicker, setBriefingRefreshTicker] = useState(0);

  useEffect(() => {
    const calendarUrl = teacher?.schools?.calendar_url;
    if (calendarUrl) {
      fetchHolidaysCached(calendarUrl).then(h => {
        if (h && h.length > 0) setHolidays(h);
      });
    }
  }, [teacher?.schools?.calendar_url]);

  const isTodayHoliday = useMemo(() => {
    const todayStr = getSimulatedNow().toLocaleDateString('sv-SE');
    return holidays.find(h => todayStr >= h.start && todayStr <= h.end) || null;
  }, [holidays, briefingRefreshTicker]);

  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [myChangedAppointments, setMyChangedAppointments] = useState<any[]>([]);
  const [showAllChangedAppointments, setShowAllChangedAppointments] = useState<boolean>(false);
  const [showAllBookings, setShowAllBookings] = useState<boolean>(false);
  const [scheduleChangesTimeWindow, setScheduleChangesTimeWindow] = useState<'7days' | 'all'>('7days');

  const loadMyBookings = useCallback(async () => {
    if (!userId) return;
    try {
      let allBookings: any[] = [];
      const sId = teacher?.school_id || '';
      const stored = (sId ? localStorage.getItem(`groovelab_campus_bookings_${sId}`) : null) || localStorage.getItem('groovelab_campus_bookings');
      if (stored) {
        try {
          allBookings = JSON.parse(stored);
        } catch (e) {}
      }

      const toMinutes = (timeStr?: string | null) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.substring(0, 5).split(':');
        return (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
      };

      let teacherBoards: any[] = [];
      try {
        const storedBoards = localStorage.getItem(`groovelab_teacher_boards_${activePlatform}_${userId}`) || 
                             localStorage.getItem(`groovelab_teacher_boards_${userId}`) ||
                             localStorage.getItem(`groovelab_teacher_draft_state_${activePlatform}_${userId}`) ||
                             localStorage.getItem(`groovelab_teacher_draft_state_campus_${userId}`);
        if (storedBoards) {
          const parsed = JSON.parse(storedBoards);
          teacherBoards = Array.isArray(parsed) ? parsed : (parsed.boards || []);
        }
      } catch (e) {}

      const [{ data: dbBookings }, { data: teacherSchedules }] = await Promise.all([
        supabase
          .from('room_bookings')
          .select(`
            id,
            room_id,
            date,
            start_time,
            end_time,
            title,
            rooms (
              id,
              name
            )
          `)
          .eq('booked_by', userId),
        supabase
          .from('schedules')
          .select('room_id, time_slot, duration, day_of_week')
          .eq('teacher_id', userId)
      ]);

      const getTeacherRegularWindow = (dayOfWeek: number) => {
        let regularRoomId: string | null = null;
        let regMin = Infinity;
        let regMax = -Infinity;

        if (teacherBoards && teacherBoards.length > 0) {
          const mb = teacherBoards.find((b: any) => b.dayOfWeek === dayOfWeek);
          if (mb) {
            if (mb.roomId) regularRoomId = mb.roomId;
            (mb.students || []).forEach((st: any) => {
              const tStr = st.assignedTime || '';
              if (tStr) {
                const s = toMinutes(tStr);
                const dur = st.duration || 30;
                const e = s + dur;
                if (s < regMin) regMin = s;
                if (e > regMax) regMax = e;
              }
            });
          }
        }

        if (teacherSchedules && teacherSchedules.length > 0) {
          teacherSchedules.forEach((s: any) => {
            if (s.day_of_week === dayOfWeek) {
              if (!regularRoomId && s.room_id) regularRoomId = s.room_id;
              if (s.time_slot) {
                const sStart = toMinutes(s.time_slot);
                const sEnd = sStart + (s.duration || 45);
                if (sStart < regMin) regMin = sStart;
                if (sEnd > regMax) regMax = sEnd;
              }
            }
          });
        }

        return { regularRoomId, regMin, regMax };
      };

      const spuriousBookingIds: string[] = [];

      if (dbBookings && dbBookings.length > 0) {
        dbBookings.forEach((db: any) => {
          const startTimeStr = db.start_time ? db.start_time.substring(0, 5) : '00:00';
          const endTimeStr = db.end_time ? db.end_time.substring(0, 5) : '00:00';

          if (db.title && db.title.startsWith('Unterricht: ') && db.date) {
            const bDate = new Date(db.date + 'T00:00:00');
            const bDayOfWeek = bDate.getDay() || 7;
            const { regularRoomId, regMin, regMax } = getTeacherRegularWindow(bDayOfWeek);
            const bStart = toMinutes(startTimeStr);
            const bEnd = toMinutes(endTimeStr);

            const isInsideRegular = regMin !== Infinity && bStart >= regMin && bEnd <= regMax;
            const isSameRoom = !regularRoomId || db.room_id === regularRoomId;

            if (isInsideRegular && isSameRoom) {
              spuriousBookingIds.push(db.id);
              return;
            }
          }

          const isDup = allBookings.some((b: any) => 
            b.date === db.date && 
            b.startTime === startTimeStr && 
            b.roomId === db.room_id
          );

          if (!isDup) {
            const studentName = db.title && db.title.startsWith('Unterricht: ') 
              ? db.title.substring('Unterricht: '.length) 
              : null;

            allBookings.push({
              id: db.id,
              roomId: db.room_id,
              roomName: db.rooms?.name || 'Raum',
              date: db.date,
              startTime: startTimeStr,
              endTime: endTimeStr,
              purpose: db.title || 'Unterricht',
              teacherId: userId,
              teacherName: '',
              isSchedule: false,
              status: 'approved',
              studentName: studentName
            });
          }
        });

        if (spuriousBookingIds.length > 0) {
          supabase.from('room_bookings').delete().in('id', spuriousBookingIds).then(({ error }) => {
            if (!error) {
              window.dispatchEvent(new CustomEvent('refresh-bookings'));
            }
          });
        }
      }

      const { data: occurs } = await supabase
        .from('schedule_occurrences')
        .select(`
          id,
          date,
          original_date,
          start_time,
          status,
          teacher_id,
          student_id,
          student_acknowledged,
          schedules (
            duration,
            room_id,
            teacher_id,
            rooms (id, name)
          )
        `);

      const localOccurs: any[] = [];
      try {
        const pendingSaved = typeof window !== 'undefined' ? ((userId ? localStorage.getItem(`groovelab_pending_schedule_changes_${userId}`) : null) || localStorage.getItem('groovelab_pending_schedule_changes')) : null;
        if (pendingSaved) {
          const parsedPending = JSON.parse(pendingSaved);
          Object.values(parsedPending).forEach((item: any) => {
            if (item && item.date) {
              const itemTeacherId = item.teacher_id || item.teacherId;
              if (itemTeacherId && String(itemTeacherId).replace(/^teacher-/i, '') !== String(userId).replace(/^teacher-/i, '')) return;
              localOccurs.push({
                ...item,
                is_rescheduled: true,
                is_moved: true,
                status: item.status || 'pending_reschedule'
              });
            }
          });
        }
        const latestSaved = typeof window !== 'undefined' ? (userId ? localStorage.getItem('groovelab_calendar_active_occurrences_' + userId) : null) : null;
        if (latestSaved) {
          const parsedLatest = JSON.parse(latestSaved);
          if (Array.isArray(parsedLatest)) {
            parsedLatest.forEach((item: any) => {
              if (item && item.date) {
                const itemTeacherId = item.teacher_id || item.teacherId;
                if (itemTeacherId && String(itemTeacherId).replace(/^teacher-/i, '') !== String(userId).replace(/^teacher-/i, '')) return;
                const isItemChanged = Boolean(
                  item.is_rescheduled || item.isRescheduled || item.is_moved || item.isMoved ||
                  (item.status && item.status !== 'scheduled') ||
                  (item.original_date && item.original_date !== item.date) ||
                  (item.original_start_time && item.start_time && item.original_start_time.substring(0, 5) !== item.start_time.substring(0, 5))
                );
                if (isItemChanged && !localOccurs.some(lo => String(lo.id) === String(item.id))) {
                  localOccurs.push({
                    ...item,
                    is_rescheduled: true,
                    is_moved: true
                  });
                }
              }
            });
          }
        }
      } catch (e) {}

      const combinedRawOccurs = [...(occurs || [])];
      localOccurs.forEach((loc: any) => {
        if (!loc || !loc.date) return;
        const locTeacherId = loc.teacher_id || loc.teacherId;
        if (locTeacherId && String(locTeacherId).replace(/^teacher-/i, '') !== String(userId).replace(/^teacher-/i, '')) return;

        const existingIdx = combinedRawOccurs.findIndex(o => String(o.id) === String(loc.id));
        if (existingIdx >= 0) {
          combinedRawOccurs[existingIdx] = { ...combinedRawOccurs[existingIdx], ...loc };
        } else {
          combinedRawOccurs.push(loc);
        }
      });

      const mappedOccurs = combinedRawOccurs.map((occ: any) => {
        const startTimeStr = occ.start_time ? occ.start_time.substring(0, 5) : '00:00';
        const origStartTimeStr = occ.original_start_time ? occ.original_start_time.substring(0, 5) : null;
        const durationMin = occ.schedules?.duration || occ.duration || 45;
        const [shStr, smStr] = startTimeStr.split(':');
        const sh = parseInt(shStr, 10) || 0;
        const sm = parseInt(smStr, 10) || 0;
        const totalMin = sh * 60 + sm + durationMin;
        const eh = Math.floor(totalMin / 60) % 24;
        const em = totalMin % 60;
        const endTimeStr = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
        
        let rName = occ.schedules?.rooms?.name || occ.schedules?.room?.name || occ.roomName || occ.room_name;
        const rId = occ.room_id || occ.schedules?.room_id || occ.schedules?.rooms?.id;
        if ((!rName || rName === 'Raum') && rId && rooms && rooms.length > 0) {
          const foundRoom = rooms.find((r: any) => String(r.id) === String(rId));
          if (foundRoom) rName = foundRoom.name;
        }

        const studentDisplayName = (() => {
          if (occ.student) {
            const fn = occ.student.first_name || occ.student.firstName || '';
            const ln = occ.student.last_name || occ.student.lastName || '';
            const full = `${fn} ${maskLastName(ln, showRealNames)}`.trim();
            if (full) return full;
          }
          if (occ.student_name || occ.studentName || occ.name) {
            return occ.student_name || occ.studentName || occ.name;
          }
          if (occ.student_id && occ.student_id !== 'vacant' && !occ.student_id.startsWith('break-')) {
            return 'Schüler';
          }
          return null;
        })();

        return {
          id: occ.id,
          roomId: rId,
          roomName: (rName && rName !== 'Raum') ? rName : '',
          date: occ.date,
          original_date: occ.original_date,
          startTime: startTimeStr,
          original_start_time: origStartTimeStr,
          endTime: endTimeStr,
          purpose: studentDisplayName ? `Unterricht: ${studentDisplayName}` : 'Unterricht',
          teacherId: occ.teacher_id || occ.teacherId || userId,
          status: occ.status,
          isSchedule: true,
          studentName: studentDisplayName,
          student_acknowledged: occ.student_acknowledged,
          studentAcknowledged: occ.studentAcknowledged,
          canceled_by_role: occ.canceled_by_role || ((occ.status === 'canceled_by_teacher_ausfall' || isTeacherCurrentlyAbsent(teacher)) ? 'teacher' : undefined),
          teacher_acknowledged: (occ.status === 'canceled_by_teacher_ausfall' || occ.canceled_by_role === 'teacher' || isTeacherCurrentlyAbsent(teacher)) ? true : occ.teacher_acknowledged,
          teacherAcknowledged: (occ.status === 'canceled_by_teacher_ausfall' || occ.canceled_by_role === 'teacher' || isTeacherCurrentlyAbsent(teacher)) ? true : occ.teacherAcknowledged,
          is_rescheduled: occ.is_rescheduled || occ.isRescheduled,
          is_moved: occ.is_moved || occ.isMoved,
          is_room_booking: Boolean(occ.is_room_booking || occ.isRoomBooking || occ.room_override_id || occ.roomOverrideId || occ.is_room_changed || occ.isRoomChanged),
          room_override_id: occ.room_override_id || occ.roomOverrideId,
          isGroup: occ.isGroup || (studentDisplayName && studentDisplayName.includes('&'))
        };
      });

      const getLocalYYYYMMDD = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const simStr = typeof window !== 'undefined' ? localStorage.getItem('groovelab_simulated_date') : null;
      const today = simStr ? new Date(simStr + 'T14:00:00') : new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = getLocalYYYYMMDD(today);
      
      const twoWeeksLater = new Date(today);
      twoWeeksLater.setDate(today.getDate() + 14);
      const twoWeeksLaterStr = getLocalYYYYMMDD(twoWeeksLater);

      const filteredBookings = allBookings.filter((b: any) => {
        const bTeacherId = b.teacherId || b.teacher_id;
        if (bTeacherId && String(bTeacherId).replace(/^teacher-/i, '') !== String(userId).replace(/^teacher-/i, '')) return false;
        if (!b.date) return false;
        return b.date >= todayStr && b.date <= twoWeeksLaterStr;
      });

      const filteredOccurs = mappedOccurs.filter((b: any) => {
        const bTeacherId = b.teacherId || b.teacher_id;
        if (bTeacherId && String(bTeacherId).replace(/^teacher-/i, '') !== String(userId).replace(/^teacher-/i, '')) return false;
        if (!b.date) return false;
        if (b.student_id === 'vacant' || (typeof b.student_id === 'string' && b.student_id.startsWith('break-'))) return false;
        
        const isDateMoved = Boolean(b.original_date && b.original_date !== b.date);
        const isTimeMoved = Boolean(b.original_start_time && b.startTime && b.original_start_time.substring(0, 5) !== b.startTime.substring(0, 5));
        const isChangedStatus = Boolean(b.status && ['pending_reschedule', 'rescheduled_confirmed', 'rescheduled', 'cancelled', 'canceled_by_student', 'teacher_ausfall', 'canceled_by_teacher_ausfall', 'open_reschedule', 'changed'].includes(b.status));
        const isExplicitChange = Boolean(b.is_rescheduled || b.isRescheduled || b.is_changed || b.isChanged || b.is_moved || b.isMoved);
        const isReactivatedUnacknowledged = Boolean(b.status === 'scheduled' && b.original_date && (b.teacher_acknowledged === false || b.teacherAcknowledged === false));

        const isRealReschedule = isDateMoved || isTimeMoved || isChangedStatus || isExplicitChange || isReactivatedUnacknowledged;
        if (!isRealReschedule) return false;

        let normDate = b.date || '';
        if (normDate.includes('.')) {
          const parts = normDate.split('.');
          if (parts.length === 3) {
            normDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }

        let normOrigDate = b.original_date || '';
        if (normOrigDate.includes('.')) {
          const parts = normOrigDate.split('.');
          if (parts.length === 3) {
            normOrigDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }

        return (normDate && normDate >= todayStr) || (normOrigDate && normOrigDate >= todayStr);
      });

      const groupedOccursMap: Record<string, any> = {};
      filteredOccurs.forEach((occ: any) => {
        const key = `${occ.status}_${occ.date}_${occ.startTime}_${occ.roomId || occ.roomName}`;
        if (!groupedOccursMap[key]) {
          groupedOccursMap[key] = {
            ...occ,
            studentNames: occ.studentName ? [occ.studentName] : [],
            ids: [occ.id]
          };
        } else {
          if (occ.studentName && !groupedOccursMap[key].studentNames.includes(occ.studentName)) {
            groupedOccursMap[key].studentNames.push(occ.studentName);
          }
          groupedOccursMap[key].ids.push(occ.id);
        }
      });

      const finalOccurs = Object.values(groupedOccursMap).map((occ: any) => {
        if (occ.studentNames.length > 1) {
          return {
            ...occ,
            studentName: occ.studentNames.join(' & '),
            isGroup: true
          };
        }
        return occ;
      });

      filteredBookings.sort((a: any, b: any) => {
        const dateDiff = a.date.localeCompare(b.date);
        if (dateDiff !== 0) return dateDiff;
        return a.startTime.localeCompare(b.startTime);
      });

      finalOccurs.sort((a: any, b: any) => {
        const dateDiff = a.date.localeCompare(b.date);
        if (dateDiff !== 0) return dateDiff;
        return a.startTime.localeCompare(b.startTime);
      });

      setMyBookings(prev => areArraysEqualFast(prev, filteredBookings) ? prev : filteredBookings);
      setMyChangedAppointments(prev => areArraysEqualFast(prev, finalOccurs) ? prev : finalOccurs);
    } catch (err) {
      console.error('Failed to load my bookings:', err);
    }
  }, [userId, teacher, activePlatform, rooms, showRealNames]);

  useEffect(() => {
    const handleFilteredStorage = (e: StorageEvent) => {
      if (e.key && !['campus_bookings_sync', 'groovelab_schedule_changed', 'campus_schedule_sync'].includes(e.key)) {
        return;
      }
      loadMyBookings();
    };

    loadMyBookings();
    window.addEventListener('storage', handleFilteredStorage);
    window.addEventListener('refresh-bookings', loadMyBookings);
    window.addEventListener('groovelab_schedule_changed', loadMyBookings);
    return () => {
      window.removeEventListener('storage', handleFilteredStorage);
      window.removeEventListener('refresh-bookings', loadMyBookings);
      window.removeEventListener('groovelab_schedule_changed', loadMyBookings);
    };
  }, [loadMyBookings]);

  const visibleChangedAppointments = useMemo(() => {
    if (!myChangedAppointments || myChangedAppointments.length === 0) return [];
    if (scheduleChangesTimeWindow === 'all') return myChangedAppointments;
    
    const simStr = typeof window !== 'undefined' ? localStorage.getItem('groovelab_simulated_date') : null;
    const today = simStr ? new Date(simStr + 'T14:00:00') : new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);
    const getLocalYYYYMMDD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const todayStr = getLocalYYYYMMDD(today);
    const maxDateStr = getLocalYYYYMMDD(sevenDaysLater);
    return myChangedAppointments.filter((b: any) => {
      if (!b) return false;
      let normDate = b.date || '';
      if (normDate.includes('.')) {
        const parts = normDate.split('.');
        if (parts.length === 3) {
          normDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      let normOrigDate = b.original_date || '';
      if (normOrigDate.includes('.')) {
        const parts = normOrigDate.split('.');
        if (parts.length === 3) {
          normOrigDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }

      const isNewDateInWindow = Boolean(normDate && normDate >= todayStr && normDate <= maxDateStr);
      const isOrigDateInWindow = Boolean(normOrigDate && normOrigDate >= todayStr && normOrigDate <= maxDateStr);

      return isNewDateInWindow || isOrigDateInWindow;
    });
  }, [myChangedAppointments, scheduleChangesTimeWindow]);

  const emergencyUnconfirmedAppointments = useMemo(() => {
    if (!myChangedAppointments || myChangedAppointments.length === 0) return [];
    const simNow = getSimulatedNow();
    const getLocalYYYYMMDD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const todayStr = getLocalYYYYMMDD(simNow);

    return myChangedAppointments.filter((a: any) => {
      if (a.teacher_acknowledged || a.teacherAcknowledged) return false;
      if (a.status === 'cancelled_acknowledged' || a.status === 'rescheduled_confirmed') return false;
      if (a.date !== todayStr) return false;

      const [startHour, startMin] = (a.startTime || '00:00').split(':').map(Number);
      const apptTime = new Date(simNow);
      apptTime.setHours(startHour, startMin, 0, 0);

      const diffMs = apptTime.getTime() - simNow.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      return diffHours >= 0 && diffHours <= 2;
    });
  }, [myChangedAppointments]);

  const teacherScheduleChangesCount = useMemo(() => {
    return (visibleChangedAppointments || []).filter((a: any) => 
      !a.teacher_acknowledged && !a.teacherAcknowledged && a.status !== 'cancelled_acknowledged'
    ).length;
  }, [visibleChangedAppointments]);

  const teacherOpenAdminFeedbackCount = useMemo(() => {
    const openFeedback = (adminFeedbackRequests || []).filter(r => !(adminFeedbackResponses || []).find(res => res.request_id === r.id)).length;
    const pendingFeedbackPoints = (mySubmittedProgramPoints || []).filter(pp => 
      pp.additional_feedback_responses?.questions?.some((_: any, idx: number) => !pp.additional_feedback_responses.answers?.[idx])
    ).length;
    return openFeedback + (activePlanningEvents || []).length + pendingFeedbackPoints;
  }, [adminFeedbackRequests, adminFeedbackResponses, mySubmittedProgramPoints, activePlanningEvents]);

  const teacherUnreadFeedCount = useMemo(() => {
    if (!userId) return 0;
    if (!isTeacherBriefingSidebarCollapsed) return 0;

    const unreadCampus = (campusFeedAnnouncements || []).filter((post: any) => {
      if (feedInteractions.some(i => i.post_id === post.id && i.user_id === userId)) return false;
      if (lastSeenFeedTime && post.created_at) {
        const postTime = new Date(post.created_at).getTime();
        if (postTime <= lastSeenFeedTime) return false;
      }
      return true;
    }).length;

    const unreadClass = (classFeedPosts || []).filter((post: any) => {
      if (feedInteractions.some(i => i.post_id === post.id && i.user_id === userId)) return false;
      if (lastSeenFeedTime && post.created_at) {
        const postTime = new Date(post.created_at).getTime();
        if (postTime <= lastSeenFeedTime) return false;
      }
      return true;
    }).length;

    return unreadCampus + unreadClass;
  }, [campusFeedAnnouncements, classFeedPosts, feedInteractions, userId, isTeacherBriefingSidebarCollapsed, lastSeenFeedTime]);

  const teacherSidebarTotalAlertsCount = teacherScheduleChangesCount + teacherOpenAdminFeedbackCount + teacherUnreadFeedCount;
  const hasTeacherAppointmentAlerts = teacherScheduleChangesCount > 0;
  const hasTeacherFeedAlerts = (teacherOpenAdminFeedbackCount > 0) || (teacherUnreadFeedCount > 0);

  const getCountdownString = useCallback((deadlineStr: string) => {
    const diff = new Date(deadlineStr).getTime() - Date.now();
    if (diff <= 0) return 'Abgelaufen';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}T ${hours}Std übrig`;
    if (hours > 0) return `${hours}Std ${minutes}Min übrig`;
    return `${minutes}Min übrig`;
  }, []);

  const handleBookingClick = useCallback((b: any) => {
    if (b.date) {
      localStorage.setItem('campus_calendar_target_date', b.date);
      localStorage.setItem('groovelab_selected_schedule_date', b.date);
      localStorage.setItem('groovelab_selected_booking_date', b.date);
      window.dispatchEvent(new CustomEvent('groovelab_navigate_schedule_date', { detail: { date: b.date } }));
    }
    const rid = b.roomId || b.rooms?.id || '';
    if (rid) localStorage.setItem('groovelab_selected_booking_room_id', rid);
    if (b.startTime) localStorage.setItem('groovelab_selected_booking_start_time', b.startTime);
    if (b.endTime) localStorage.setItem('groovelab_selected_booking_end_time', b.endTime);
    
    if (onTabChange) {
      onTabChange('schedule');
    }
  }, [onTabChange]);

  const handleDeleteMyBooking = useCallback(async (b: any) => {
    if (!window.confirm('Möchtest du diese Buchung wirklich löschen/stornieren?')) {
      return;
    }
    
    try {
      const { data: occ, error: occErr } = await supabase
        .from('schedule_occurrences')
        .select('*, schedules(*)')
        .eq('teacher_id', userId)
        .eq('date', b.date)
        .eq('start_time', b.startTime.length === 5 ? `${b.startTime}:00` : b.startTime)
        .maybeSingle();

      if (occErr) {
        console.warn('Error checking schedule occurrence:', occErr);
      }

      if (occ) {
        const regularRoomId = occ.schedules?.room_id;
        
        if (regularRoomId) {
          if (b.roomId === regularRoomId) {
            const { error: roomBookingDelErr } = await supabase
              .from('room_bookings')
              .delete()
              .eq('booked_by', userId)
              .eq('date', b.date)
              .eq('start_time', b.startTime.length === 5 ? `${b.startTime}:00` : b.startTime);
            if (roomBookingDelErr) {
              console.warn('Error clearing associated room booking by coordinates:', roomBookingDelErr);
            }

            const { error: updErr } = await supabase
              .from('schedule_occurrences')
              .update({
                date: occ.original_date || occ.date,
                start_time: occ.original_start_time || occ.start_time,
                status: 'scheduled',
                student_acknowledged: false,
                original_date: occ.original_date || occ.date
              })
              .eq('id', occ.id);
            if (updErr) throw updErr;
            
            const { error: delErr } = await supabase
              .from('room_bookings')
              .delete()
              .eq('id', b.id);
            if (delErr) throw delErr;
            
            alert('Die Terminverschiebung wurde storniert und auf die ursprüngliche Zeit zurückgesetzt.');
          } else {
            const { error: updateErr } = await supabase
              .from('room_bookings')
              .update({ room_id: regularRoomId })
              .eq('id', b.id);
              
            if (updateErr) throw updateErr;
            
            const { data: roomData } = await supabase
              .from('rooms')
              .select('name')
              .eq('id', regularRoomId)
              .maybeSingle();
              
            const roomName = roomData?.name || 'regulären Unterrichtsraum';
            alert(`Der Raum für den Termin wurde wieder auf den ${roomName} zurückgesetzt.`);
          }
        } else {
          alert('Für diesen Termin wurde noch kein regulärer Raum zugeordnet.');
          return;
        }
      } else {
        const { error: delErr } = await supabase
          .from('room_bookings')
          .delete()
          .eq('id', b.id);
          
        if (delErr) throw delErr;
      }
      
      window.dispatchEvent(new CustomEvent('refresh-bookings'));
      setBriefingRefreshTicker(prev => prev + 1);
      loadMyBookings();
    } catch (err) {
      console.error('Failed to delete booking:', err);
      alert('Fehler beim Löschen der Buchung.');
    }
  }, [userId, loadMyBookings]);

  return {
    holidays,
    isTodayHoliday,
    myBookings,
    setMyBookings,
    myChangedAppointments,
    setMyChangedAppointments,
    showAllChangedAppointments,
    setShowAllChangedAppointments,
    showAllBookings,
    setShowAllBookings,
    scheduleChangesTimeWindow,
    setScheduleChangesTimeWindow,
    visibleChangedAppointments,
    emergencyUnconfirmedAppointments,
    teacherScheduleChangesCount,
    teacherOpenAdminFeedbackCount,
    teacherUnreadFeedCount,
    teacherSidebarTotalAlertsCount,
    hasTeacherAppointmentAlerts,
    hasTeacherFeedAlerts,
    handleBookingClick,
    handleDeleteMyBooking,
    getCountdownString,
    loadMyBookings
  };
}
