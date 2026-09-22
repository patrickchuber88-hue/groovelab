import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { getSimulatedNow } from '../../../hooks/useSimulatedTime';
import { 
  isTeacherCurrentlyAbsent, 
  ABSENCE_RESET_SENTINEL 
} from '../../../utils/teacherAbsenceHelper';
import { maskLastName, formatTeacherFullName } from '../../../utils/nameHelper';
import { UrgentCancellationItem } from '../TeacherUrgentCancellationsModal';
import { ActiveMakeupTokenItem } from '../TeacherMakeupRadarWidget';
import { AbsenceNotifData } from '../TeacherAbsenceNotifModal';
import { TEACHER_WITH_SCHOOL_SELECT } from './useTeacherData';

export interface UseTeacherAbsenceProps {
  userId: string;
  teacher: any;
  setTeacher: React.Dispatch<React.SetStateAction<any>>;
  schoolData: any;
  allStudents: any[];
  briefingData: any;
  crisisNotifications: any[];
  showRealNames: boolean;
  onRefresh?: () => Promise<void> | void;
}

export function useTeacherAbsence({
  userId,
  teacher,
  setTeacher,
  schoolData,
  allStudents,
  briefingData,
  crisisNotifications,
  showRealNames,
  onRefresh
}: UseTeacherAbsenceProps) {
  const [quickAbsencePreset, setQuickAbsencePreset] = useState<'today' | 'tomorrow' | 'week' | 'custom'>('today');
  const [absenceStartDate, setAbsenceStartDate] = useState(() => getSimulatedNow().toLocaleDateString('sv-SE'));
  const [absenceUntilDate, setAbsenceUntilDate] = useState(() => getSimulatedNow().toLocaleDateString('sv-SE'));
  const [showCustomStart, setShowCustomStart] = useState(false);
  const [absenceHandlingOwner, setAbsenceHandlingOwner] = useState<'secretariat' | 'teacher'>('secretariat');
  const [absenceOfficialNote, setAbsenceOfficialNote] = useState('');
  const [submittingAbsence, setSubmittingAbsence] = useState(false);
  const [cancellationsCount, setCancellationsCount] = useState(0);

  // 🏛️ Synchronize absence date defaults whenever the simulation date changes
  useEffect(() => {
    const handleSimDateSync = () => {
      const simNow = getSimulatedNow();
      const simTodayStr = simNow.toLocaleDateString('sv-SE');
      setAbsenceStartDate(simTodayStr);
      setAbsenceUntilDate(simTodayStr);
    };
    window.addEventListener('groovelab_simulated_date_changed', handleSimDateSync);
    return () => window.removeEventListener('groovelab_simulated_date_changed', handleSimDateSync);
  }, []);

  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [absenceNotifModal, setAbsenceNotifModal] = useState<AbsenceNotifData | null>(null);
  const [showAbsenceEndedModal, setShowAbsenceEndedModal] = useState(false);
  const [showAbsenceOverviewModal, setShowAbsenceOverviewModal] = useState(false);

  // Urgent cancellations radar
  const [urgentCancellations, setUrgentCancellations] = useState<UrgentCancellationItem[]>([]);
  const [isUrgentModalOpen, setIsUrgentModalOpen] = useState(false);
  const [urgentSnoozeUntil, setUrgentSnoozeUntil] = useState<number | null>(null);

  // 📞 Optimistic teacher-contacted state for 0ms instant feedback
  const [optimisticContacted, setOptimisticContacted] = useState<Record<string, { status: string; at: string }>>({});

  const fetchUrgentCancellations = useCallback(async () => {
    if (!userId || teacher?.role?.toLowerCase() === 'student') return;
    try {
      const { data, error } = await supabase.rpc('get_urgent_unacknowledged_cancellations', {
        p_teacher_id: userId
      });
      if (error) {
        console.warn('Error fetching urgent cancellations:', error);
        return;
      }
      const list = (data || []) as UrgentCancellationItem[];
      setUrgentCancellations(list);

      if (list.length > 0) {
        const nowMs = Date.now();
        const isSnoozed = urgentSnoozeUntil && urgentSnoozeUntil > nowMs;
        const hasUnresolved = list.some(i => !i.student_acknowledged && !i.teacher_contact_status);
        if (hasUnresolved && !isSnoozed) {
          setIsUrgentModalOpen(true);
        }
      } else {
        setIsUrgentModalOpen(false);
      }
    } catch (err) {
      console.warn('Exception in fetchUrgentCancellations:', err);
    }
  }, [userId, urgentSnoozeUntil]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('urgent_radar') === 'true') {
        setIsUrgentModalOpen(true);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, []);

  useEffect(() => {
    fetchUrgentCancellations();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUrgentCancellations();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUrgentCancellations]);

  const handleUrgentSnooze = useCallback((minutes: number) => {
    const snoozeTime = Date.now() + minutes * 60 * 1000;
    setUrgentSnoozeUntil(snoozeTime);
    setIsUrgentModalOpen(false);
  }, []);

  const unresolvedUrgentCount = useMemo(() => {
    return urgentCancellations.filter(i => !i.student_acknowledged && !i.teacher_contact_status).length;
  }, [urgentCancellations]);

  // Makeup tokens
  const [activeMakeupTokens, setActiveMakeupTokens] = useState<ActiveMakeupTokenItem[]>([]);
  const [isMakeupModalOpen, setIsMakeupModalOpen] = useState(false);
  const [makeupModalMode, setMakeupModalMode] = useState<'create' | 'redeem' | 'cancel'>('create');
  const [selectedMakeupSlot, setSelectedMakeupSlot] = useState<any>(null);
  const [selectedMakeupToken, setSelectedMakeupToken] = useState<any>(null);

  const fetchActiveMakeupTokens = useCallback(async () => {
    if (!userId || teacher?.role?.toLowerCase() === 'student') return;
    try {
      const { data, error } = await supabase.rpc('get_teacher_active_makeup_tokens', {
        p_teacher_id: userId
      });
      if (!error && data) {
        setActiveMakeupTokens(data as ActiveMakeupTokenItem[]);
      }
    } catch (err) {
      console.warn('Exception in fetchActiveMakeupTokens:', err);
    }
  }, [userId]);

  useEffect(() => {
    fetchActiveMakeupTokens();
  }, [fetchActiveMakeupTokens]);

  // Active absence cancellations calculation
  const activeAbsenceCancellations = useMemo(() => {
    if (!isTeacherCurrentlyAbsent(teacher)) return [];

    let startDateTime: Date;
    const teacherAusfallStart = teacher.ausfall_start ?? (teacher as any).ausfallStart;
    const teacherAusfallUntil = teacher.ausfall_until ?? (teacher as any).ausfallUntil;
    if (teacherAusfallStart) {
      const rawStart = String(teacherAusfallStart).trim();
      if (rawStart.includes('T') && !rawStart.endsWith('00:00:00.000Z') && !rawStart.endsWith('00:00:00')) {
        startDateTime = new Date(rawStart);
      } else {
        const [stYear, stMonth, stDay] = rawStart.substring(0, 10).split('-').map(Number);
        const today = getSimulatedNow();
        const isTodayStart = today.getFullYear() === stYear && today.getMonth() === (stMonth - 1) && today.getDate() === stDay;
        if (isTodayStart) {
          startDateTime = teacher.updated_at ? new Date(teacher.updated_at) : today;
        } else {
          startDateTime = new Date(stYear, (stMonth || 1) - 1, stDay || 1, 0, 0, 0, 0);
        }
      }
    } else {
      const rawUntil = String(teacherAusfallUntil).trim();
      const [uYear, uMonth, uDay] = rawUntil.substring(0, 10).split('-').map(Number);
      const today = getSimulatedNow();
      if (today.getFullYear() === uYear && today.getMonth() === (uMonth - 1) && today.getDate() === uDay) {
        startDateTime = teacher.updated_at ? new Date(teacher.updated_at) : today;
      } else {
        startDateTime = new Date(uYear, (uMonth || 1) - 1, uDay || 1, 0, 0, 0, 0);
      }
    }

    const rawUntilStr = String(teacherAusfallUntil).trim();
    let endDateTime: Date;
    if (rawUntilStr.includes('T') && !rawUntilStr.endsWith('00:00:00.000Z') && !rawUntilStr.endsWith('00:00:00')) {
      endDateTime = new Date(rawUntilStr);
    } else {
      const [uYear, uMonth, uDay] = rawUntilStr.substring(0, 10).split('-').map(Number);
      endDateTime = new Date(uYear, (uMonth || 1) - 1, uDay || 1, 23, 59, 59, 999);
    }

    const resultMap = new Map<string, any>();

    (crisisNotifications || []).forEach((n: any) => {
      if (n.is_reinstated) return;
      const slotDate = new Date(n.slot_start_datetime);
      if (isNaN(slotDate.getTime())) return;
      if (slotDate.getTime() < startDateTime.getTime() || slotDate.getTime() > endDateTime.getTime()) return;

      const student = n.student || allStudents.find(s => s.id === n.student_id);
      const dateKey = slotDate.toISOString().substring(0, 10);
      const timeKey = `${String(slotDate.getHours()).padStart(2, '0')}:${String(slotDate.getMinutes()).padStart(2, '0')}`;
      const uniqueKey = `${dateKey}_${timeKey}_${n.student_id}`;

      const opt = (n.id && optimisticContacted[n.id]) || optimisticContacted[uniqueKey];
      const teacherContactStatus = opt?.status || n.teacher_contact_status || null;
      const teacherContactedAt = opt?.at || n.teacher_contacted_at || null;

      resultMap.set(uniqueKey, {
        id: n.id,
        slot_start_datetime: n.slot_start_datetime,
        student_id: n.student_id,
        status: n.status || 'UNREAD',
        read_at: n.read_at,
        acknowledged_at: n.acknowledged_at,
        is_reinstated: n.is_reinstated,
        teacher_contact_status: teacherContactStatus,
        teacher_contacted_at: teacherContactedAt,
        student,
        studentName: student ? `${student.first_name} ${maskLastName(student.last_name, showRealNames)}`.trim() : (n.student_name || 'Schüler'),
        instrument: student?.instrument || n.instrument || 'Unterricht'
      });
    });

    if (briefingData?.timeline) {
      const simNow = getSimulatedNow();
      const simTodayStr = simNow.toLocaleDateString('sv-SE');
      briefingData.timeline.forEach((s: any) => {
        const isCancelled = s.status === 'canceled_by_teacher_ausfall' || 
          s.status === 'teacher_ausfall' || 
          s.status === 'cancelled';
        if (!isCancelled) return;

        // 🏛️ 1% Goldstandard: Der Slot behält sein originäres Datum (s.date) oder das simuliertes Datum.
        // Keine willkürliche Projektion auf das unsimulierte physische Datum der Systemuhr!
        const slotDateStr = s.date || (briefingData as any)?.selectedDate || simTodayStr;
        const timeSlot = s.start_time || s.time_slot || '14:00';
        const [slotH, slotM] = timeSlot.substring(0, 5).split(':').map(Number);
        const [sYear, sMonth, sDay] = slotDateStr.split('-').map(Number);
        const slotDateTime = new Date(sYear, sMonth - 1, sDay, slotH || 0, slotM || 0, 0, 0);

        if (slotDateTime.getTime() < startDateTime.getTime() || slotDateTime.getTime() > endDateTime.getTime()) return;

        const student = s.student || allStudents.find((st: any) => st.id === s.student_id);
        const timeKey = `${String(slotH || 0).padStart(2, '0')}:${String(slotM || 0).padStart(2, '0')}`;
        const uniqueKey = `${slotDateStr}_${timeKey}_${s.student_id || student?.id}`;

        const itemId = s.id || `timeline-${s.schedule_id || 'slot'}`;
        const opt = (s.id && optimisticContacted[s.id]) || optimisticContacted[uniqueKey];
        const teacherContactStatus = opt?.status || s.teacher_contact_status || null;
        const teacherContactedAt = opt?.at || s.teacher_contacted_at || null;

        if (!resultMap.has(uniqueKey)) {
          resultMap.set(uniqueKey, {
            id: itemId,
            slot_start_datetime: `${slotDateStr}T${timeSlot.length === 5 ? `${timeSlot}:00` : timeSlot}`,
            student_id: s.student_id || student?.id,
            status: s.student_acknowledged === true ? 'READ' : 'UNREAD',
            read_at: s.read_at || null,
            acknowledged_at: s.acknowledged_at || null,
            teacher_contact_status: teacherContactStatus,
            teacher_contacted_at: teacherContactedAt,
            student,
            studentName: student ? `${student.first_name} ${maskLastName(student.last_name, showRealNames)}`.trim() : (s.title || 'Schüler'),
            instrument: s.instrument || student?.instrument || 'Unterricht'
          });
        }
      });
    }

    return Array.from(resultMap.values()).sort((a, b) => {
      return new Date(a.slot_start_datetime).getTime() - new Date(b.slot_start_datetime).getTime();
    });
  }, [teacher?.ausfall_until, (teacher as any)?.ausfallUntil, teacher?.ausfall_start, (teacher as any)?.ausfallStart, teacher?.updated_at, crisisNotifications, briefingData?.timeline, allStudents, showRealNames, optimisticContacted]);

  // Grouped absence cancellations by date
  const groupedAbsenceCancellations = useMemo(() => {
    const groups: Record<string, {
      dateStr: string;
      formattedDate: string;
      dayOfWeek: string;
      dayNum: string;
      items: typeof activeAbsenceCancellations;
      readCount: number;
      unreadCount: number;
    }> = {};

    const simNow = getSimulatedNow();
    const todayStr = simNow.toLocaleDateString('sv-SE');

    activeAbsenceCancellations.forEach((item: any) => {
      const dt = new Date(item.slot_start_datetime);
      const dateKey = !isNaN(dt.getTime())
        ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
        : item.slot_start_datetime.substring(0, 10);

      if (!groups[dateKey]) {
        const isToday = dateKey === todayStr;
        const weekdayLong = dt.toLocaleDateString('de-DE', { weekday: 'long' });
        const shortDateStr = dt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const weekdayShort = dt.toLocaleDateString('de-DE', { weekday: 'short' }).replace(/\.+$/, '');
        const dayMonth = dt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        const formattedDate = isToday 
          ? `Heute, ${weekdayShort}. ${dayMonth}`
          : `${weekdayLong}, ${shortDateStr}`;

        groups[dateKey] = {
          dateStr: dateKey,
          formattedDate,
          dayOfWeek: weekdayShort,
          dayNum: String(dt.getDate()).padStart(2, '0'),
          items: [],
          readCount: 0,
          unreadCount: 0
        };
      }

      groups[dateKey].items.push(item);
      const isHandled = item.status === 'READ' || item.teacher_contact_status === 'reached';
      if (isHandled) {
        groups[dateKey].readCount += 1;
      } else {
        groups[dateKey].unreadCount += 1;
      }
    });

    return Object.keys(groups).sort().map(key => groups[key]);
  }, [activeAbsenceCancellations]);

  const [collapsedAbsenceDates, setCollapsedAbsenceDates] = useState<Record<string, boolean>>({});

  const toggleAbsenceDateCollapse = useCallback((dateKey: string) => {
    setCollapsedAbsenceDates(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  }, []);

  const areAllAbsenceDatesCollapsed = useMemo(() => {
    if (groupedAbsenceCancellations.length === 0) return false;
    return groupedAbsenceCancellations.every(g => !!collapsedAbsenceDates[g.dateStr]);
  }, [groupedAbsenceCancellations, collapsedAbsenceDates]);

  const toggleAllAbsenceDates = useCallback(() => {
    if (areAllAbsenceDatesCollapsed) {
      setCollapsedAbsenceDates({});
    } else {
      const allCollapsed: Record<string, boolean> = {};
      groupedAbsenceCancellations.forEach(g => {
        allCollapsed[g.dateStr] = true;
      });
      setCollapsedAbsenceDates(allCollapsed);
    }
  }, [areAllAbsenceDatesCollapsed, groupedAbsenceCancellations]);

  const totalAbsenceCancellationsCount = activeAbsenceCancellations.length || cancellationsCount;
  const readCancellationsCount = activeAbsenceCancellations.filter((c: any) => c.status === 'READ' || c.teacher_contact_status === 'reached').length;
  const unreadCancellationsCount = activeAbsenceCancellations.filter((c: any) => c.status !== 'READ' && c.teacher_contact_status !== 'reached').length;

  // 📞 1-Tap Handler: Schüler als telefonisch / persönlich erreicht markieren (aktuelle Uhrzeit als Stempel)
  const handleMarkStudentContacted = useCallback(async (targetId: string, contactType: 'reached' | 'voicemail' = 'reached') => {
    if (!targetId) return;
    const nowIso = getSimulatedNow().toISOString();

    // 1. 0ms Optimistic UI Update (keine UI-Verzögerung)
    setOptimisticContacted(prev => ({
      ...prev,
      [targetId]: { status: contactType, at: nowIso }
    }));

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
      if (isUuid) {
        const { error } = await supabase.rpc('mark_cancellation_teacher_contacted', {
          p_notification_id: targetId,
          p_contact_status: contactType
        });
        if (error) {
          console.error('Error marking cancellation teacher contacted:', error);
        }
      }
      fetchUrgentCancellations();
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error('Exception in handleMarkStudentContacted:', err);
    }
  }, [fetchUrgentCancellations, onRefresh]);

  // MAX_SELF_REPORT_DAYS = 28 (4 weeks)
  const MAX_SELF_REPORT_DAYS = 28;

  const handleReportAbsence = useCallback(async () => {
    if (!absenceUntilDate) {
      alert('Bitte wähle ein bis-Datum aus.');
      return;
    }
    if (!absenceStartDate) {
      alert('Bitte wähle ein von-Datum aus.');
      return;
    }
    if (!absenceHandlingOwner) {
      alert('Bitte wähle aus, wer die Schüler telefonisch kontaktiert (Sekretariat beauftragen oder Ich übernehme selbst).');
      return;
    }

    const startD = new Date(absenceStartDate);
    const untilD = new Date(absenceUntilDate);
    startD.setHours(0, 0, 0, 0);
    untilD.setHours(0, 0, 0, 0);
    const diffDays = Math.round((untilD.getTime() - startD.getTime()) / (24 * 3600 * 1000)) + 1;
    if (diffDays > MAX_SELF_REPORT_DAYS) {
      alert(
        `Abwesenheiten / Ausfälle von mehr als 4 Wochen (${diffDays} Tage) können nicht selbst eingetragen werden.\n\nBitte wende dich an die Verwaltung, damit diese die Abwesenheit für dich hinterlegt. Es gilt keine 30-Tage-Sperre für Verwaltungseinträge.`
      );
      return;
    }

    const confirmMsg = `Möchtest du die Unterrichtstermine vom ${new Date(absenceStartDate + 'T00:00:00').toLocaleDateString('de-DE')} bis zum ${new Date(absenceUntilDate + 'T00:00:00').toLocaleDateString('de-DE')} wirklich absagen?`;
    if (!confirm(confirmMsg)) return;

    try {
      setSubmittingAbsence(true);
      const todayD = getSimulatedNow();
      const localTodayStr = `${todayD.getFullYear()}-${String(todayD.getMonth() + 1).padStart(2, '0')}-${String(todayD.getDate()).padStart(2, '0')}`;
      const absenceStartVal = (absenceStartDate === localTodayStr) 
        ? todayD.toISOString() 
        : (absenceStartDate ? `${absenceStartDate}T00:00:00.000Z` : todayD.toISOString());
      
      const absenceUntilVal = absenceUntilDate.includes('T') ? absenceUntilDate : `${absenceUntilDate}T23:59:59.999Z`;

      let affectedSlots: any[] = [];
      let teacherDisplayName = '';

      const { data: rpcRes, error: rpcErr } = await supabase.rpc('report_teacher_absence', {
        p_teacher_id: userId,
        p_start_date: absenceStartVal,
        p_until_date: absenceUntilVal,
        p_handling_owner: absenceHandlingOwner || 'secretariat'
      });

      if (rpcErr) {
        console.error('[report_teacher_absence RPC failed]:', rpcErr);
        throw new Error(rpcErr.message || 'Fehler bei der Übermittlung der Terminabsage.');
      }

      if (rpcRes && rpcRes.success) {
        affectedSlots = rpcRes.affected_slots || [];
        teacherDisplayName = rpcRes.teacher_name || formatTeacherFullName(teacher) || '';
      } else {
        throw new Error((rpcRes as any)?.error || 'Die Terminabsage konnte nicht verarbeitet werden.');
      }

      const pushTeacherName = teacherDisplayName || formatTeacherFullName(teacher) || 'deiner Lehrkraft';
      affectedSlots.forEach((slot: any) => {
        if (slot.student_id) {
          const dateObj = slot.date_str ? new Date(slot.date_str + 'T00:00:00') : new Date(slot.datetime || Date.now());
          const dateFormatted = !isNaN(dateObj.getTime())
            ? dateObj.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
            : 'in Kürze';
          const pushTitle = 'Terminabsage ✕';
          const pushBody = `Terminabsage: Dein Unterricht am ${dateFormatted} um ${slot.time_str} Uhr bei ${pushTeacherName} entfällt.`;

          supabase.functions.invoke('send-push', {
            body: {
              userId: slot.student_id,
              title: pushTitle,
              body: pushBody,
              url: '/'
            }
          }).catch(pushErr => console.warn('Non-blocking push error:', pushErr));
        }
      });

      setTeacher((prev: any) => prev ? { ...prev, ausfall_until: absenceUntilVal, ausfall_start: absenceStartVal } : prev);
      setShowAbsenceModal(false);

      setAbsenceNotifModal({
        notifs: affectedSlots.map(s => ({
          student_id: s.student_id,
          student_name: s.student_name,
          slot_start_datetime: `${s.date_str}T${s.time_str}:00`
        })),
        absenceUntilDateStr: absenceUntilDate,
        absenceStartDateStr: absenceStartDate,
        handlingOwner: absenceHandlingOwner,
        officialNote: absenceOfficialNote
      });

      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Fehler bei handleReportAbsence:', err);
      alert(err?.message || 'Fehler bei der Terminabsage.');
    } finally {
      setSubmittingAbsence(false);
    }
  }, [absenceUntilDate, absenceStartDate, absenceHandlingOwner, absenceOfficialNote, userId, teacher, allStudents, showRealNames, setTeacher, onRefresh]);

  const handleEndAbsence = useCallback(async () => {
    if (!confirm('Möchtest du die Abwesenheit wirklich beenden und dich wieder verfügbar melden? Alle zukünftigen Termine werden reaktiviert und die betroffenen Schüler per Direktnachricht und Push informiert.')) return;

    try {
      setSubmittingAbsence(true);
      setAbsenceUntilDate('');
      const today = getSimulatedNow();
      setAbsenceStartDate(today.toLocaleDateString('sv-SE'));
      setTeacher((prev: any) => prev ? { ...prev, ausfall_until: null, ausfall_start: null } : prev);

      const { data: profile } = await supabase
        .from('users')
        .select('school_id, first_name, last_name, ausfall_start, ausfall_until')
        .eq('id', userId)
        .maybeSingle();

      const effectiveProfile = profile || teacher || {};
      const teacherDisplayName = formatTeacherFullName(effectiveProfile) || 'deiner Lehrkraft';

      let rpcReinstatedSlots: any[] = [];
      try {
        const { data: rpcRes } = await supabase.rpc('end_teacher_absence', { p_teacher_id: userId });
        if (rpcRes?.reinstated_slots) {
          rpcReinstatedSlots = rpcRes.reinstated_slots;
        }
      } catch (rpcErr) {}

      await supabase
        .from('users')
        .update({ 
          ausfall_until: ABSENCE_RESET_SENTINEL,
          ausfall_start: ABSENCE_RESET_SENTINEL
        })
        .eq('id', userId);

      const notifiedStudents = new Set<string>();
      rpcReinstatedSlots.forEach((slot: any) => {
        if (slot.student_id && !notifiedStudents.has(slot.student_id)) {
          notifiedStudents.add(slot.student_id);
          const dateObj = slot.date_str ? new Date(slot.date_str + 'T00:00:00') : null;
          const dateFormatted = dateObj && !isNaN(dateObj.getTime())
            ? dateObj.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
            : '';
          const pushTitle = 'Unterricht findet statt ✨';
          const pushBody = dateFormatted && slot.time_str
            ? `Gute Neuigkeiten: Dein Unterricht am ${dateFormatted} um ${slot.time_str} Uhr bei ${teacherDisplayName} findet wieder regulär statt!`
            : `Gute Neuigkeiten: ${teacherDisplayName} steht wieder regulär zur Verfügung. Dein Unterricht findet wie gewohnt statt!`;

          supabase.functions.invoke('send-push', {
            body: {
              userId: slot.student_id,
              title: pushTitle,
              body: pushBody,
              url: '/'
            }
          }).catch(e => console.warn('Push error on reinstate:', e));
        }
      });

      try {
        const { data: schedules } = await supabase
          .from('schedules')
          .select('*')
          .eq('teacher_id', userId);

        const { data: occurrences } = await supabase
          .from('schedule_occurrences')
          .select('*')
          .eq('teacher_id', userId);

        const now = getSimulatedNow();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const maxDate = new Date(now);
        maxDate.setDate(maxDate.getDate() + 30);

        const currentDate = new Date(todayStart);
        const scheduleIdsToRestore = new Set<string>();
        const datesToDeleteNotifs: string[] = [];

        while (currentDate <= maxDate) {
          const rawDay = currentDate.getDay();
          const currentDayOfWeek = rawDay === 0 ? 7 : rawDay;
          const daySchedules = (schedules || []).filter(s => s.day_of_week === currentDayOfWeek);

          daySchedules.forEach(sched => {
            const [hours, minutes] = (sched.time_slot || '00:00').split(':').map(Number);
            const startDateTime = new Date(currentDate);
            startDateTime.setHours(hours, minutes, 0, 0);

            if (startDateTime >= now) {
              scheduleIdsToRestore.add(sched.id);
              datesToDeleteNotifs.push(startDateTime.toISOString());
            }
          });

          currentDate.setDate(currentDate.getDate() + 1);
        }

        const occurrenceIdsToRestore = new Set<string>();
        (occurrences || []).forEach(occ => {
          const startDateTime = new Date(`${occ.date}T${occ.start_time}`);
          if (startDateTime >= now) {
            occurrenceIdsToRestore.add(occ.id);
            datesToDeleteNotifs.push(startDateTime.toISOString());
          }
        });

        if (scheduleIdsToRestore.size > 0) {
          await supabase
            .from('schedules')
            .update({ status: 'approved' })
            .in('id', Array.from(scheduleIdsToRestore))
            .eq('status', 'canceled_by_teacher_ausfall');
        }

        if (occurrenceIdsToRestore.size > 0) {
          await supabase
            .from('schedule_occurrences')
            .update({ status: 'rescheduled_confirmed' })
            .in('id', Array.from(occurrenceIdsToRestore))
            .eq('status', 'cancelled');
        }

        if (datesToDeleteNotifs.length > 0) {
          await supabase
            .from('crisis_notifications')
            .update({ is_reinstated: true, status: 'UNREAD' })
            .eq('teacher_id', userId)
            .in('slot_start_datetime', datesToDeleteNotifs)
            .or('is_reinstated.eq.false,status.neq.READ');
        }

        const affectedStudentIds = new Set<string>();
        (schedules || []).forEach(sched => {
          if (scheduleIdsToRestore.has(sched.id) && sched.student_id) {
            affectedStudentIds.add(sched.student_id);
          }
        });
        (occurrences || []).forEach(occ => {
          if (occurrenceIdsToRestore.has(occ.id) && occ.student_id) {
            affectedStudentIds.add(occ.student_id);
          }
        });

        for (const studentId of Array.from(affectedStudentIds)) {
          try {
            await supabase.from('campus_direct_messages').insert({
              sender_id: userId,
              recipient_id: studentId,
              content: `🔄 Unterricht reaktiviert: Lehrkraft ${teacherDisplayName} steht wieder regulär für den Unterricht zur Verfügung. Dein Unterrichtstermin findet wie gewohnt statt.`,
              is_system: true,
              message_type: 'cancellation_reset'
            });
          } catch (dmErr) {}
        }
      } catch (schedErr) {
        console.warn('Non-blocking schedule restoration warning:', schedErr);
      }

      if (effectiveProfile.school_id) {
        try {
          const alertMessage = `🟢 WIEDER VERFÜGBAR: Lehrkraft ${formatTeacherFullName(effectiveProfile)} hat die Abwesenheit beendet und steht wieder regulär für den Unterricht zur Verfügung.`;
          await supabase
            .from('system_alerts')
            .insert({
              school_id: effectiveProfile.school_id,
              teacher_id: userId,
              type: 'Teacher Available Alert',
              message: alertMessage,
              resolved: false
            });
        } catch (alertErr) {}
      }

      window.dispatchEvent(new CustomEvent('groovelab_teacher_status_changed', {
        detail: { teacherId: userId, ausfall_until: null, ausfall_start: null }
      }));

      const { data: updatedTeacher } = await supabase
        .from('users')
        .select(TEACHER_WITH_SCHOOL_SELECT)
        .eq('id', userId)
        .maybeSingle();

      if (updatedTeacher) {
        const cleanUpdated = {
          ...updatedTeacher,
          ausfall_until: isTeacherCurrentlyAbsent(updatedTeacher) ? (updatedTeacher.ausfall_until ?? (updatedTeacher as any).ausfallUntil) : null,
          ausfall_start: isTeacherCurrentlyAbsent(updatedTeacher) ? (updatedTeacher.ausfall_start ?? (updatedTeacher as any).ausfallStart) : null
        };
        setTeacher(cleanUpdated);
      } else {
        setTeacher((prev: any) => prev ? { ...prev, ausfall_until: null, ausfall_start: null } : prev);
      }

      setShowAbsenceEndedModal(true);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Fehler bei Verfügbarkeitsmeldung:', err);
      setTeacher((prev: any) => prev ? { ...prev, ausfall_until: null, ausfall_start: null } : prev);
      setShowAbsenceEndedModal(true);
    } finally {
      setSubmittingAbsence(false);
    }
  }, [userId, teacher, setTeacher, onRefresh]);

  return {
    quickAbsencePreset,
    setQuickAbsencePreset,
    absenceStartDate,
    setAbsenceStartDate,
    absenceUntilDate,
    setAbsenceUntilDate,
    showCustomStart,
    setShowCustomStart,
    absenceHandlingOwner,
    setAbsenceHandlingOwner,
    absenceOfficialNote,
    setAbsenceOfficialNote,
    submittingAbsence,
    cancellationsCount,
    setCancellationsCount,
    showAbsenceModal,
    setShowAbsenceModal,
    absenceNotifModal,
    setAbsenceNotifModal,
    showAbsenceEndedModal,
    setShowAbsenceEndedModal,
    showAbsenceOverviewModal,
    setShowAbsenceOverviewModal,
    urgentCancellations,
    isUrgentModalOpen,
    setIsUrgentModalOpen,
    unresolvedUrgentCount,
    fetchUrgentCancellations,
    handleUrgentSnooze,
    activeMakeupTokens,
    isMakeupModalOpen,
    setIsMakeupModalOpen,
    makeupModalMode,
    setMakeupModalMode,
    selectedMakeupSlot,
    setSelectedMakeupSlot,
    selectedMakeupToken,
    setSelectedMakeupToken,
    fetchActiveMakeupTokens,
    activeAbsenceCancellations,
    groupedAbsenceCancellations,
    collapsedAbsenceDates,
    toggleAbsenceDateCollapse,
    areAllAbsenceDatesCollapsed,
    toggleAllAbsenceDates,
    totalAbsenceCancellationsCount,
    readCancellationsCount,
    unreadCancellationsCount,
    handleMarkStudentContacted,
    handleReportAbsence,
    handleEndAbsence
  };
}
