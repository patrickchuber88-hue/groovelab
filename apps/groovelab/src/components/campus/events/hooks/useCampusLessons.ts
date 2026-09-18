import { useState, useEffect, useCallback, useRef } from 'react';
import { LessonOccurrence, CollisionConflictData } from '../types/campusEvents.types';
import { isUUID } from '../../../../utils/uuidValidator';
import { supabase as defaultSupabase } from '../../../../lib/supabase';

interface UseCampusLessonsParams {
  userId: string;
  role: 'student' | 'teacher' | 'admin' | 'secretary';
  schoolId: string;
  supabase?: any;
  studentUser?: any;
  brandColor?: string;
  openParentPinGate?: any;
  checkIsParentUnlocked?: any;
  openIcalDirectly?: boolean;
  onCloseIcalDirectly?: () => void;
}

export function useCampusLessons({
  userId,
  role,
  schoolId,
  supabase = defaultSupabase,
  studentUser,
  brandColor,
  openParentPinGate,
  checkIsParentUnlocked,
  openIcalDirectly,
  onCloseIcalDirectly
}: UseCampusLessonsParams) {
  const [lessons, setLessons] = useState<LessonOccurrence[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [lessonTab, setLessonTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [confirmCancelOccId, setConfirmCancelOccId] = useState<string | null>(null);

  // iCal subscription & sync
  const [showIcalModal, setShowIcalModal] = useState(false);
  const [calendarToken, setCalendarToken] = useState<string>('');
  const [generatingToken, setGeneratingToken] = useState<boolean>(false);
  const tokenFetchAttemptedRef = useRef(false);

  // Active 1:1 Shoutbox conversation
  const [activeChatOcc, setActiveChatOcc] = useState<LessonOccurrence | null>(null);
  const [activeChatOccIds, setActiveChatOccIds] = useState<Set<string>>(new Set());
  const [activeChatStudentIds, setActiveChatStudentIds] = useState<Set<string>>(new Set());

  // Collision Conflict State
  const [collisionConflictData, setCollisionConflictData] = useState<CollisionConflictData | null>(null);
  const [collisionRequestSent, setCollisionRequestSent] = useState(false);
  const [collisionRequestLoading, setCollisionRequestLoading] = useState(false);

  const fetchOrCreateCalendarToken = useCallback(async (forceRotate = false) => {
    if (!userId) return;
    try {
      setGeneratingToken(true);
      const { data, error } = await supabase.rpc('get_or_rotate_calendar_token', {
        p_user_id: userId,
        p_force_rotate: forceRotate
      });
      if (error) {
        const { data: userData } = await supabase
          .from('users')
          .select('calendar_token')
          .eq('id', userId)
          .maybeSingle();
        if (userData?.calendar_token) {
          setCalendarToken(userData.calendar_token);
        }
      } else if (data) {
        setCalendarToken(data);
      }
    } catch (err) {
      console.warn('Error fetching or rotating calendar token:', err);
    } finally {
      setGeneratingToken(false);
    }
  }, [userId, supabase]);

  const fetchLessons = useCallback(async (loadFullYear = false) => {
    if (!loadFullYear) {
      setLoadingLessons(true);
    }
    try {
      const simStr = typeof window !== 'undefined' ? localStorage.getItem('groovelab_simulated_date') : null;
      const now = simStr ? new Date(simStr + 'T14:00:00') : new Date();

      const startRange = new Date(now);
      const day = startRange.getDay() || 7;
      startRange.setDate(startRange.getDate() - day + 1); // Monday of current week

      const endRange = new Date(startRange);
      const rollingDays = loadFullYear ? 365 : 70;
      endRange.setDate(startRange.getDate() + rollingDays);

      const startYear = `${startRange.getFullYear()}-${String(startRange.getMonth() + 1).padStart(2, '0')}-${String(startRange.getDate()).padStart(2, '0')}`;
      const endYear = `${endRange.getFullYear()}-${String(endRange.getMonth() + 1).padStart(2, '0')}-${String(endRange.getDate()).padStart(2, '0')}`;

      let effectiveSchoolId = schoolId;
      if (!effectiveSchoolId && userId) {
        try {
          const { data: u } = await supabase
            .from('users')
            .select('school_id')
            .eq('id', userId)
            .maybeSingle();
          if (u?.school_id) effectiveSchoolId = u.school_id;
        } catch (e) {}
      }

      // 1. Load schedules
      let scheduleQuery = supabase.from('schedules').select('*');
      if (effectiveSchoolId) {
        scheduleQuery = scheduleQuery.eq('school_id', effectiveSchoolId);
      }
      if (role === 'student') {
        scheduleQuery = scheduleQuery.eq('student_id', userId);
      } else if (role === 'teacher' || (role === 'admin' && userId)) {
        scheduleQuery = scheduleQuery.eq('teacher_id', userId);
      }

      const { data: schedules } = await scheduleQuery;

      // 2. Load occurrences
      let occurrenceQuery = supabase.from('schedule_occurrences').select('*');
      if (role === 'student') {
        occurrenceQuery = occurrenceQuery.eq('student_id', userId);
      } else if (role === 'teacher' || (role === 'admin' && userId)) {
        occurrenceQuery = occurrenceQuery.eq('teacher_id', userId);
      }
      const { data: occurrencesData } = await occurrenceQuery;
      let occurrences: any[] = occurrencesData || [];

      // 3. Load users for teacher/student enrichment
      if (occurrences.length > 0) {
        const stIds = Array.from(new Set(occurrences.map((o: any) => o.student_id).filter(Boolean)));
        const teachIds = Array.from(new Set(occurrences.map((o: any) => o.teacher_id).filter(Boolean)));

        const [stRes, teachRes] = await Promise.all([
          stIds.length > 0 ? supabase.from('users').select('id, first_name, last_name, instrument').in('id', stIds) : Promise.resolve({ data: [] }),
          teachIds.length > 0 ? supabase.from('users').select('id, first_name, last_name, photo_url, instrument').in('id', teachIds) : Promise.resolve({ data: [] })
        ]);

        const stMap = new Map<string, any>();
        (stRes.data || []).forEach((u: any) => stMap.set(u.id, u));
        const teachMap = new Map<string, any>();
        (teachRes.data || []).forEach((t: any) => teachMap.set(t.id, t));

        occurrences = occurrences.map((o: any) => ({
          ...o,
          student: o.student || stMap.get(o.student_id) || null,
          teacher: o.teacher || teachMap.get(o.teacher_id) || null
        }));
      }

      // Merge virtual occurrences from recurring schedules
      const virtualOccurrences: any[] = [];
      if (schedules && schedules.length > 0) {
        const teacherIds = Array.from(new Set(schedules.map((s: any) => s.teacher_id).filter(Boolean)));
        const studentIds = Array.from(new Set(schedules.map((s: any) => s.student_id).filter(Boolean)));

        const [tUsers, sUsers] = await Promise.all([
          teacherIds.length > 0 ? supabase.from('users').select('id, first_name, last_name, photo_url, instrument').in('id', teacherIds) : Promise.resolve({ data: [] }),
          studentIds.length > 0 ? supabase.from('users').select('id, first_name, last_name, instrument').in('id', studentIds) : Promise.resolve({ data: [] })
        ]);

        const tMap = new Map<string, any>();
        (tUsers.data || []).forEach((u: any) => tMap.set(u.id, u));
        const sMap = new Map<string, any>();
        (sUsers.data || []).forEach((u: any) => sMap.set(u.id, u));

        schedules.forEach((sch: any) => {
          if (!sch.day_of_week) return;
          const dayNum = typeof sch.day_of_week === 'number' ? sch.day_of_week : parseInt(sch.day_of_week, 10);
          if (isNaN(dayNum)) return;

          // Expand each week in date range
          const cur = new Date(startRange);
          while (cur <= endRange) {
            const currentDayOfWeek = cur.getDay() === 0 ? 7 : cur.getDay();
            if (currentDayOfWeek === dayNum) {
              const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
              const exists = occurrences.some((o: any) => o.schedule_id === sch.id && o.date === dateStr);
              if (!exists) {
                virtualOccurrences.push({
                  id: `virtual-${sch.id}-${dateStr}`,
                  schedule_id: sch.id,
                  student_id: sch.student_id,
                  teacher_id: sch.teacher_id,
                  date: dateStr,
                  start_time: sch.start_time || '14:00',
                  duration: sch.duration || 45,
                  status: 'scheduled',
                  is_virtual: true,
                  teacher: tMap.get(sch.teacher_id) || null,
                  student: sMap.get(sch.student_id) || null,
                  room_name: sch.room_name || null
                });
              }
            }
            cur.setDate(cur.getDate() + 1);
          }
        });
      }

      const allMerged = [...occurrences, ...virtualOccurrences];
      allMerged.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.start_time || '').localeCompare(b.start_time || '');
      });

      setLessons(allMerged);

      // Fetch active conversations
      let chatQuery = supabase
        .from('campus_direct_messages')
        .select('occurrence_id, sender_id, recipient_id, content');

      if (userId && (role === 'student' || role === 'teacher')) {
        chatQuery = chatQuery.or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
      }

      const { data: activeChats } = await chatQuery;
      if (activeChats) {
        const occIds = new Set<string>();
        const studentIds = new Set<string>();
        activeChats.forEach((c: any) => {
          if ((c.content || '').trim().length > 0) {
            if (c.occurrence_id) occIds.add(String(c.occurrence_id));
            if (c.sender_id) studentIds.add(String(c.sender_id));
            if (c.recipient_id) studentIds.add(String(c.recipient_id));
          }
        });
        setActiveChatOccIds(occIds);
        setActiveChatStudentIds(studentIds);
      }
    } catch (err) {
      console.error('Error fetching lessons:', err);
    } finally {
      setLoadingLessons(false);
    }
  }, [userId, role, schoolId, supabase]);

  const handleCancelOccWithDoubleConfirm = useCallback(async (occ: LessonOccurrence) => {
    try {
      if (!occ.date) return;
      const cancelStatus = 'cancelled';
      const isVirtual = Boolean(
        occ.is_virtual ||
        (occ.id && (String(occ.id).startsWith('virt_') || String(occ.id).startsWith('virtual-')))
      );

      if (isVirtual) {
        let existingId: string | null = null;
        if (occ.schedule_id && occ.date) {
          const { data: existingOcc } = await supabase
            .from('schedule_occurrences')
            .select('id')
            .eq('schedule_id', occ.schedule_id)
            .eq('date', occ.date)
            .maybeSingle();
          if (existingOcc?.id) {
            existingId = existingOcc.id;
          }
        }

        if (existingId) {
          await supabase
            .from('schedule_occurrences')
            .update({
              status: cancelStatus,
              student_acknowledged: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingId);
        } else {
          await supabase
            .from('schedule_occurrences')
            .insert({
              schedule_id: occ.schedule_id || null,
              student_id: occ.student_id || null,
              teacher_id: occ.teacher_id || userId,
              date: occ.date,
              start_time: occ.start_time,
              duration: occ.duration || 45,
              status: cancelStatus,
              student_acknowledged: true
            });
        }
      } else if (occ.id) {
        await supabase
          .from('schedule_occurrences')
          .update({
            status: cancelStatus,
            student_acknowledged: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', occ.id);
      }

      await fetchLessons();
    } catch (err: any) {
      console.error('Error canceling occurrence:', err);
      alert('Fehler beim Absagen des Termins: ' + err.message);
    } finally {
      setConfirmCancelOccId(null);
    }
  }, [userId, supabase, fetchLessons]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  useEffect(() => {
    if (userId) {
      fetchOrCreateCalendarToken(false);
    }
  }, [userId, fetchOrCreateCalendarToken]);

  return {
    lessons,
    setLessons,
    loadingLessons,
    lessonTab,
    setLessonTab,
    confirmCancelOccId,
    setConfirmCancelOccId,
    showIcalModal,
    setShowIcalModal,
    calendarToken,
    generatingToken,
    fetchOrCreateCalendarToken,
    activeChatOcc,
    setActiveChatOcc,
    activeChatOccIds,
    activeChatStudentIds,
    collisionConflictData,
    setCollisionConflictData,
    collisionRequestSent,
    setCollisionRequestSent,
    collisionRequestLoading,
    setCollisionRequestLoading,
    fetchLessons,
    handleCancelOccWithDoubleConfirm,
    setCancelDoubleConfirmOcc: handleCancelOccWithDoubleConfirm
  };
}
