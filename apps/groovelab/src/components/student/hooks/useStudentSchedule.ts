import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, checkSupabaseConnection } from '../../../lib/supabase';
import { formatTeacherFullName } from '../../../utils/nameHelper';

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

  const isStudentAbsenceAllowed = Boolean(studentUser?.parent_allow_absences ?? (studentUiLevel === 'pro'));
  const isStudentRescheduleAllowed = Boolean(studentUser?.parent_allow_reschedule_confirm ?? (studentUiLevel === 'pro'));

  const fetchSchedule = useCallback(async () => {
    if (!studentId) return;
    setScheduleLoading(true);
    try {
      const { data, error } = await supabase
        .from('schedule_occurrences')
        .select('*, teacher:users!schedule_occurrences_teacher_id_fkey(id, first_name, last_name, nickname, photo_url, avatar_url, instrument, role, email)')
        .eq('student_id', studentId)
        .order('date', { ascending: true });

      if (!error && data) {
        setScheduleOccurrences(data);
        setIsOfflineScheduleActive(false);
        try {
          localStorage.setItem(`campus_schedule_cache_${studentId}`, JSON.stringify(data));
        } catch (e) {}
      } else {
        // Fallback to cache
        try {
          const cached = localStorage.getItem(`campus_schedule_cache_${studentId}`);
          if (cached) {
            setScheduleOccurrences(JSON.parse(cached));
            setIsOfflineScheduleActive(true);
          }
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Schedule fetch exception:', err);
      try {
        const cached = localStorage.getItem(`campus_schedule_cache_${studentId}`);
        if (cached) {
          setScheduleOccurrences(JSON.parse(cached));
          setIsOfflineScheduleActive(true);
        }
      } catch (e) {}
    } finally {
      setScheduleLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const cancelledSchoolYearOccurrences = useMemo(() => {
    return scheduleOccurrences.filter(o => o.status === 'cancelled' || o.status === 'canceled_by_student');
  }, [scheduleOccurrences]);

  // Actions
  const handleConfirmReschedule = async (occId: string) => {
    try {
      await supabase
        .from('schedule_occurrences')
        .update({
          status: 'rescheduled',
          student_acknowledged: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', occId);

      setScheduleOccurrences(prev => prev.map(o => o.id === occId ? { ...o, status: 'rescheduled', student_acknowledged: true } : o));
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

  const handleRejectReschedule = async (occ: any) => {
    try {
      await supabase
        .from('schedule_occurrences')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', occ.id);

      setScheduleOccurrences(prev => prev.map(o => o.id === occ.id ? { ...o, status: 'rejected' } : o));
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
