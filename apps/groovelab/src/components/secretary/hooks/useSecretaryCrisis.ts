import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export interface CrisisNotificationItem {
  id: string;
  slot_start_datetime: string;
  status: 'UNREAD' | 'READ' | 'ARCHIVED';
  notified_at?: string;
  teacher_id?: string;
  student_id?: string;
  handling_owner?: 'secretariat' | 'teacher';
  student?: {
    id?: string;
    first_name: string;
    last_name: string;
    instrument?: string;
  };
  teacher?: {
    id: string;
    first_name: string;
    last_name: string;
    ausfall_until?: string | null;
    ausfallUntil?: string | null;
  };
}

export interface UseSecretaryCrisisOptions {
  schoolId: string;
  onRefreshDashboard?: () => Promise<void> | void;
}

export function useSecretaryCrisis({
  schoolId,
  onRefreshDashboard
}: UseSecretaryCrisisOptions) {
  const [crisisNotifications, setCrisisNotifications] = useState<any[]>([]);
  const [crisisTabMode, setCrisisTabMode] = useState<'live' | 'history'>('live');
  const [selectedCrisisTeacherId, setSelectedCrisisTeacherId] = useState<string | null>(null);
  const [selectedArchiveLog, setSelectedArchiveLog] = useState<any | null>(null);
  const [expandedLiveDayStr, setExpandedLiveDayStr] = useState<string | null>(null);

  const crisisTimeoutRef = useRef<any>(null);

  const fetchCrisisNotifications = useCallback(async () => {
    if (!schoolId) return;
    try {
      let query = supabase
        .from('crisis_notifications')
        .select(`
          id,
          teacher_id,
          student_id,
          slot_start_datetime,
          status,
          notified_at,
          handling_owner,
          student:users!crisis_notifications_student_id_fkey (first_name, last_name, instrument),
          teacher:users!crisis_notifications_teacher_id_fkey (id, first_name, last_name, ausfall_until)
        `)
        .order('slot_start_datetime', { ascending: true });

      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        setCrisisNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching crisis notifications:', err);
    }
  }, [schoolId]);

  const debouncedFetchCrisisNotifications = useCallback(() => {
    if (crisisTimeoutRef.current) clearTimeout(crisisTimeoutRef.current);
    crisisTimeoutRef.current = setTimeout(() => {
      fetchCrisisNotifications();
    }, 500);
  }, [fetchCrisisNotifications]);

  // Realtime subscription for crisis notifications and related user changes
  useEffect(() => {
    if (!schoolId) return;

    fetchCrisisNotifications();

    const channel = supabase
      .channel(`realtime_secretary_crisis_notifs_${schoolId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'crisis_notifications', filter: `school_id=eq.${schoolId}` },
        (payload) => {
          const updatedRow = payload.new as any;
          if (updatedRow) {
            setCrisisNotifications((prev) =>
              prev.map((n) =>
                n.id === updatedRow.id
                  ? { ...n, status: updatedRow.status, notified_at: updatedRow.notified_at, handling_owner: updatedRow.handling_owner }
                  : n
              )
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'crisis_notifications', filter: `school_id=eq.${schoolId}` },
        () => {
          debouncedFetchCrisisNotifications();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'crisis_notifications', filter: `school_id=eq.${schoolId}` },
        () => {
          debouncedFetchCrisisNotifications();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users', filter: `school_id=eq.${schoolId}` },
        () => {
          debouncedFetchCrisisNotifications();
        }
      )
      .subscribe();

    return () => {
      if (crisisTimeoutRef.current) clearTimeout(crisisTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [schoolId, fetchCrisisNotifications, debouncedFetchCrisisNotifications]);

  const handleMarkAsNotified = useCallback(async (notificationId: string) => {
    // Optimistic UI update
    setCrisisNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, status: 'READ', notified_at: new Date().toISOString() } : n))
    );
    try {
      await supabase
        .from('crisis_notifications')
        .update({ status: 'READ' })
        .eq('id', notificationId);
    } catch (err: any) {
      console.error('Error marking notification as notified:', err);
    }
  }, []);

  const handleArchiveCrisisTicket = useCallback(async (notificationId: string) => {
    // Optimistic UI update
    setCrisisNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, status: 'ARCHIVED' } : n))
    );
    try {
      await supabase
        .from('crisis_notifications')
        .update({ status: 'ARCHIVED' })
        .eq('id', notificationId);
    } catch (err: any) {
      console.error('Error archiving crisis ticket:', err);
    }
  }, []);

  const handleArchiveAllResolvedTickets = useCallback(async (ticketIds: string[]) => {
    // Optimistic UI update
    setCrisisNotifications((prev) =>
      prev.map((n) => (ticketIds.includes(n.id) ? { ...n, status: 'ARCHIVED' } : n))
    );
    try {
      await supabase
        .from('crisis_notifications')
        .update({ status: 'ARCHIVED' })
        .in('id', ticketIds);
    } catch (err: any) {
      console.error('Error archiving crisis tickets:', err);
    }
  }, []);

  const handleClaimTicket = useCallback(async (ticketId: string) => {
    // Optimistic UI update
    setCrisisNotifications((prev) =>
      prev.map((n) => (n.id === ticketId ? { ...n, handling_owner: 'secretariat' } : n))
    );
    try {
      const { error } = await supabase.rpc('claim_crisis_ticket_by_secretariat', {
        p_ticket_id: ticketId
      });
      if (error) {
        // Fallback falls RPC nicht deployt
        await supabase
          .from('crisis_notifications')
          .update({ handling_owner: 'secretariat' })
          .eq('id', ticketId);
      }
    } catch (err: any) {
      console.error('Error claiming crisis ticket:', err);
    }
  }, []);

  const handleEndAbsenceOnBehalf = useCallback(async (teacherId: string, teacherName: string) => {
    try {
      const confirmOk = window.confirm(
        `Möchten Sie ${teacherName} wirklich als wieder im Dienst verfügbar melden? Alle betroffenen zukünftigen Stunden werden reaktiviert.`
      );
      if (!confirmOk) return;

      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', teacherId)
        .single();

      if (profileErr || !profile) {
        throw new Error('Lehrerprofil nicht gefunden.');
      }

      // 1. Clear user absence columns (Neutral: Ausfall)
      const { error: userErr } = await supabase
        .from('users')
        .update({ 
          ausfall_until: null,
          ausfall_start: null
        })
        .eq('id', teacherId);

      if (userErr) throw userErr;

      // 2. Fetch weekly schedules
      const { data: schedules, error: schedError } = await supabase
        .from('schedules')
        .select('*')
        .eq('school_id', schoolId)
        .eq('teacher_id', teacherId);

      if (schedError) throw schedError;

      // 3. Fetch occurrences
      const { data: occurrences } = await supabase
        .from('schedule_occurrences')
        .select('*')
        .eq('school_id', schoolId)
        .eq('teacher_id', teacherId);

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const maxDate = new Date(now);
      maxDate.setDate(maxDate.getDate() + 30); // 30 days window

      const currentDate = new Date(todayStart);
      const scheduleIdsToRestore = new Set<string>();
      const datesToDeleteNotifs: string[] = [];

      while (currentDate <= maxDate) {
        const rawDay = currentDate.getDay();
        const currentDayOfWeek = rawDay === 0 ? 7 : rawDay;
        const daySchedules = (schedules || []).filter((s) => s.day_of_week === currentDayOfWeek);

        daySchedules.forEach((sched) => {
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
      (occurrences || []).forEach((occ) => {
        const startDateTime = new Date(`${occ.date}T${occ.start_time}`);
        if (startDateTime >= now) {
          occurrenceIdsToRestore.add(occ.id);
          datesToDeleteNotifs.push(startDateTime.toISOString());
        }
      });

      // Restore schedules
      if (scheduleIdsToRestore.size > 0) {
        await supabase
          .from('schedules')
          .update({ status: 'approved' })
          .in('id', Array.from(scheduleIdsToRestore))
          .in('status', ['canceled_by_teacher_ausfall', 'teacher_ausfall']);
      }

      // Restore occurrences
      if (occurrenceIdsToRestore.size > 0) {
        await supabase
          .from('schedule_occurrences')
          .update({ status: 'rescheduled_confirmed' })
          .in('id', Array.from(occurrenceIdsToRestore))
          .eq('status', 'cancelled');
      }

      // Re-enable and mark future notifications as reinstated for students instead of deleting them
      if (datesToDeleteNotifs.length > 0) {
        await supabase
          .from('crisis_notifications')
          .update({ is_reinstated: true, status: 'UNREAD' })
          .eq('teacher_id', teacherId)
          .in('slot_start_datetime', datesToDeleteNotifs)
          .or('is_reinstated.eq.false,status.neq.READ');
      }

      // Add healthy alert
      const alertMessage = `🟢 WIEDER IM DIENST: Lehrkraft ${teacherName} wurde durch die Disposition wieder als verfügbar gemeldet.`;
      await supabase
        .from('system_alerts')
        .insert({
          school_id: profile.school_id,
          teacher_id: teacherId,
          type: 'Teacher Return Alert',
          message: alertMessage,
          resolved: false
        });

      alert('Erfolgreich als verfügbar gemeldet! Zukünftige Stundenplandaten wurden wieder aktiviert.');
      await fetchCrisisNotifications();
      if (onRefreshDashboard) {
        await onRefreshDashboard();
      }
    } catch (err: any) {
      console.error(err);
      alert('Fehler bei der Statusaktualisierung: ' + err.message);
    }
  }, [schoolId, fetchCrisisNotifications, onRefreshDashboard]);

  return {
    crisisNotifications,
    setCrisisNotifications,
    crisisTabMode,
    setCrisisTabMode,
    selectedCrisisTeacherId,
    setSelectedCrisisTeacherId,
    selectedArchiveLog,
    setSelectedArchiveLog,
    expandedLiveDayStr,
    setExpandedLiveDayStr,
    fetchCrisisNotifications,
    handleMarkAsNotified,
    handleArchiveCrisisTicket,
    handleArchiveAllResolvedTickets,
    handleClaimTicket,
    handleEndAbsenceOnBehalf
  };
}
