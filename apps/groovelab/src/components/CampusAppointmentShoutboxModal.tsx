import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  X,
  RotateCcw,
  Check,
  CheckCheck,
  Clock,
  Send,
  Calendar,
  Music,
  FileText,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatTeacherFullName, formatSingleStudentAnonymized } from '../utils/nameHelper';

export interface CampusAppointmentShoutboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  occurrence: any;
  currentUserId: string;
  currentUserRole: 'student' | 'teacher' | 'admin' | 'secretary';
  currentUserProfile?: any;
  isParentUnlocked?: boolean;
  onRequestPinGate?: (action: () => Promise<void>) => void;
  onStatusChange?: (newStatus: 'scheduled' | 'cancelled' | 'canceled_by_student', updatedOcc?: any) => void;
}

export const CampusAppointmentShoutboxModal: React.FC<CampusAppointmentShoutboxModalProps> = ({
  isOpen,
  onClose,
  occurrence,
  currentUserId,
  currentUserRole,
  currentUserProfile,
  isParentUnlocked = false,
  onRequestPinGate,
  onStatusChange
}) => {
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatTypedMessage, setChatTypedMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !occurrence) return null;

  // Extract core occurrence identifiers
  const targetOccId = occurrence.id ? String(occurrence.id) : null;
  const targetScheduleId = occurrence.schedule_id || occurrence.schedule?.id || null;
  const targetDate: string = occurrence.date || (occurrence.start_date ? String(occurrence.start_date).split('T')[0] : '');
  const startTimeRaw: string = occurrence.start_time || occurrence.time || '15:00';
  const timeLabel = startTimeRaw.includes(':') ? startTimeRaw.slice(0, 5) : `${startTimeRaw.slice(0, 2)}:${startTimeRaw.slice(2, 4)}`;

  // Determine participants
  const studentObj = occurrence.student || occurrence.student_user || (currentUserRole === 'student' ? currentUserProfile : null);
  const studentId = occurrence.student_id || studentObj?.id || (currentUserRole === 'student' ? currentUserId : null);
  
  const teacherObj = occurrence.teacher || occurrence.teacher_profile || (currentUserRole === 'teacher' ? currentUserProfile : null);
  const teacherId = occurrence.teacher_id || teacherObj?.id || (currentUserRole === 'teacher' ? currentUserId : null);

  const isGroupOcc = Boolean(
    occurrence.isGroup ||
    (occurrence.student?.first_name && occurrence.student.first_name.includes('&')) ||
    (occurrence.studentName && occurrence.studentName.includes('&')) ||
    (occurrence.student_name && occurrence.student_name.includes('&'))
  );

  // Anonymized student display name vs. full teacher name
  const studentDisplayName = studentObj
    ? formatSingleStudentAnonymized(studentObj.first_name || '', studentObj.last_name, studentObj.id)
    : (occurrence.studentName || occurrence.student_name || 'Schüler:in');

  const teacherDisplayName = teacherObj
    ? formatTeacherFullName(teacherObj)
    : (occurrence.teacher_name ? formatTeacherFullName(occurrence.teacher_name) : 'Deine Lehrkraft');

  const otherPartyDisplayName = currentUserRole === 'student'
    ? teacherDisplayName
    : (isGroupOcc ? (occurrence.group_name || 'Gruppe') : studentDisplayName);

  const titleText = isGroupOcc ? `Gruppen-Shoutbox: ${otherPartyDisplayName}` : `1:1 Shoutbox: ${otherPartyDisplayName}`;

  // Time & Frozen status calculations
  let isFrozen = false;
  let isLessonPast = false;
  try {
    const timePart = startTimeRaw.includes(':') ? startTimeRaw : `${startTimeRaw}:00`;
    const lessonDateTime = new Date(`${targetDate}T${timePart}`);
    isFrozen = Date.now() > lessonDateTime.getTime() + 48 * 60 * 60 * 1000;
    isLessonPast = Date.now() > lessonDateTime.getTime();
  } catch (e) {}

  // Occurrence status flags
  const statusStr = String(occurrence.status || 'scheduled').toLowerCase();
  const isCanceled = ['cancelled', 'canceled_by_student', 'canceled', 'teacher_sick', 'canceled_by_teacher_sick'].includes(statusStr);

  const isRescheduled = Boolean(
    !isCanceled && (
      ['rescheduled_confirmed', 'rescheduled', 'pending_reschedule', 'changed', 'open_reschedule'].includes(statusStr) ||
      occurrence.rescheduled_from ||
      occurrence.original_date
    )
  );

  // Formatted date values
  const [y, m, d] = targetDate.split('-').map(Number);
  const occDateObj = (y && m && d) ? new Date(y, m - 1, d) : new Date();
  const weekdayShort = occDateObj.toLocaleDateString('de-DE', { weekday: 'short' });
  const formattedOccDate = occDateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // 1. Helper to extract date from message content
  const extractDateFromMessage = (msg: any): string | null => {
    if (!msg) return null;
    if (msg.occurrence_id) {
      const matchVirtual = String(msg.occurrence_id).match(/\d{4}-\d{2}-\d{2}/);
      if (matchVirtual) return matchVirtual[0];
    }
    const text = String(msg.content || '');
    const matchIso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (matchIso) return `${matchIso[1]}-${matchIso[2]}-${matchIso[3]}`;
    const matchFullYear = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
    if (matchFullYear) {
      const day = matchFullYear[1].padStart(2, '0');
      const month = matchFullYear[2].padStart(2, '0');
      let year = matchFullYear[3];
      if (year.length === 2) year = `20${year}`;
      return `${year}-${month}-${day}`;
    }
    return null;
  };

  // 2. Fetch Chat Messages (Comprehensive & Deterministic)
  const fetchMessages = async () => {
    if (!studentId || !teacherId) return;

    try {
      let query = supabase
        .from('campus_direct_messages')
        .select('*')
        .order('created_at', { ascending: true });

      query = query.or(
        `and(sender_id.eq.${studentId},recipient_id.eq.${teacherId}),and(sender_id.eq.${teacherId},recipient_id.eq.${studentId})`
      );

      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        // Filter strictly for this appointment slot (by occurrence_id, virtual-id, or extracted date)
        const filtered = data.filter((m: any) => {
          if (targetOccId && String(m.occurrence_id) === targetOccId) return true;
          if (targetScheduleId && targetDate && String(m.occurrence_id) === `virtual-${targetScheduleId}-${targetDate}`) return true;
          if (targetDate && String(m.occurrence_id).includes(targetDate)) return true;
          if (targetDate) {
            const extDate = extractDateFromMessage(m);
            if (extDate === targetDate) return true;
          }
          return false;
        });

        setChatMessages(filtered);
        setTimeout(() => chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

        // Mark incoming messages as read
        const unreadIncoming = filtered.filter((m: any) => m.recipient_id === currentUserId && !m.is_read);
        if (unreadIncoming.length > 0) {
          const unreadIds = unreadIncoming.map((m: any) => m.id);
          await supabase
            .from('campus_direct_messages')
            .update({ is_read: true })
            .in('id', unreadIds);
        }
      }
    } catch (err) {
      console.error('[CampusAppointmentShoutboxModal] Error fetching chat messages:', err);
    }
  };

  // Lifecycle & Realtime Subscription
  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`chat_modal_${targetOccId || targetDate}_${studentId}_${teacherId}`)
      .on('postgres_changes', {
        schema: 'public',
        event: '*',
        table: 'campus_direct_messages'
      }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetOccId, targetDate, studentId, teacherId]);

  // 3. Chronological Timeline Reconciliation (Self-Healing Audit Trail)
  const reconciledMessages = useMemo(() => {
    if (!chatMessages || chatMessages.length === 0) return [];

    // Find last cancellation
    const lastCancelIdx = chatMessages.reduce((lastIdx, m, idx) => {
      const isCancel = m.message_type === 'reschedule_notification' ||
        (m.content && (m.content.includes('❌') || m.content.includes('Termin abgesagt') || m.content.includes('fällt aus') || m.content.includes('abgesagt') || m.content.includes('storniert') || m.content.includes('wurde abgesagt')));
      return isCancel ? idx : lastIdx;
    }, -1);

    const hasReactivationAfterCancel = lastCancelIdx !== -1 && chatMessages.slice(lastCancelIdx + 1).some(m => {
      return m.message_type === 'cancellation_reset' ||
        (m.content && (m.content.includes('🔄') || m.content.includes('reaktiviert') || m.content.includes('zurückgenommen') || m.content.includes('regulär statt') || m.content.includes('zurückgesetzt')));
    });

    // If appointment is active (!isCanceled) but has an unresolved cancellation in history:
    if (!isCanceled && lastCancelIdx !== -1 && !hasReactivationAfterCancel) {
      const cancelMsg = chatMessages[lastCancelIdx];
      const cancelTime = new Date(cancelMsg.created_at).getTime();

      let reactivateIso = occurrence.updated_at || occurrence.created_at;
      if (reactivateIso) {
        const occTime = new Date(reactivateIso).getTime();
        if (isNaN(occTime) || occTime <= cancelTime) {
          reactivateIso = new Date(cancelTime + 30 * 1000).toISOString();
        }
      } else {
        reactivateIso = new Date(cancelTime + 30 * 1000).toISOString();
      }

      const syntheticReactivationMsg = {
        id: `synthetic-reactivate-${targetOccId || targetDate}`,
        sender_id: occurrence.teacher_id || teacherId || currentUserId,
        recipient_id: occurrence.student_id || studentId,
        content: `[Termin ${weekdayShort}., ${formattedOccDate}, ${timeLabel} Uhr] 🔄 Termin reaktiviert: Der Unterricht findet planmäßig statt.`,
        message_type: 'cancellation_reset',
        created_at: reactivateIso,
        occurrence_id: targetOccId || (targetScheduleId ? `virtual-${targetScheduleId}-${targetDate}` : null),
        is_read: true,
        is_system: true,
        is_synthetic: true
      };

      const listCopy = [...chatMessages];
      listCopy.splice(lastCancelIdx + 1, 0, syntheticReactivationMsg);
      return listCopy.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    return chatMessages;
  }, [chatMessages, isCanceled, occurrence.updated_at, occurrence.created_at, targetOccId, targetDate, weekdayShort, formattedOccDate, timeLabel, teacherId, studentId, currentUserId, targetScheduleId]);

  // Asynchronous Self-Healing: Persist missing reactivation audit record to PostgreSQL if absent
  useEffect(() => {
    if (!studentId || !teacherId) return;
    const syntheticMsg = reconciledMessages.find((m: any) => m.is_synthetic && m.message_type === 'cancellation_reset');
    if (syntheticMsg) {
      const persistMissingAudit = async () => {
        try {
          const occFilter = targetOccId || (targetScheduleId ? `virtual-${targetScheduleId}-${targetDate}` : null);
          let query = supabase
            .from('campus_direct_messages')
            .select('id')
            .eq('message_type', 'cancellation_reset');

          if (occFilter) {
            query = query.eq('occurrence_id', occFilter);
          }

          const { data: existing } = await query.limit(1);

          if (!existing || existing.length === 0) {
            await supabase.from('campus_direct_messages').insert({
              sender_id: syntheticMsg.sender_id,
              recipient_id: syntheticMsg.recipient_id,
              content: syntheticMsg.content,
              message_type: 'cancellation_reset',
              occurrence_id: syntheticMsg.occurrence_id,
              is_read: true,
              created_at: syntheticMsg.created_at
            });
            console.log('[CampusAppointmentShoutboxModal] Audit Self-Healing: Persisted missing cancellation_reset event to DB.');
          }
        } catch (err) {
          console.warn('[CampusAppointmentShoutboxModal] Could not persist self-healing audit message:', err);
        }
      };
      persistMissingAudit();
    }
  }, [reconciledMessages, studentId, teacherId, targetOccId, targetScheduleId, targetDate]);

  const isReactivated = !isCanceled && (
    reconciledMessages.some((m: any) =>
      m.message_type === 'cancellation_reset' ||
      (m.content && (m.content.includes('Termin reaktiviert') || m.content.includes('reaktiviert')))
    ) ||
    occurrence.status === 'rescheduled_confirmed'
  );

  // Find latest cancellation message to extract exact timestamp and author
  const lastCancellationMsg = [...reconciledMessages].reverse().find(m =>
    m.message_type === 'reschedule_notification' ||
    (m.content && (m.content.includes('❌') || m.content.includes('Termin abgesagt') || m.content.includes('fällt aus') || m.content.includes('abgesagt') || m.content.includes('storniert') || m.content.includes('wurde abgesagt')))
  );

  let cancelTimestampStr: string | null = null;
  let cancelledByLabel = currentUserRole === 'student' ? 'durch Schüler:in' : 'durch Lehrkraft';

  if (lastCancellationMsg?.created_at) {
    const cDate = new Date(lastCancellationMsg.created_at);
    cancelTimestampStr = `${cDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um ${cDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
    if (lastCancellationMsg.sender_id === currentUserId) {
      cancelledByLabel = 'durch dich';
    } else {
      cancelledByLabel = currentUserRole === 'student' ? `durch ${teacherDisplayName}` : `durch ${studentDisplayName}`;
    }
  } else if (occurrence.updated_at && isCanceled) {
    const cDate = new Date(occurrence.updated_at);
    cancelTimestampStr = `${cDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um ${cDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
    cancelledByLabel = (occurrence.canceled_by_role === 'student' || occurrence.status === 'canceled_by_student')
      ? (currentUserRole === 'student' ? 'durch dich' : `durch ${studentDisplayName}`)
      : (currentUserRole === 'student' ? `durch ${teacherDisplayName}` : 'durch dich');
  }

  // Handle Send Message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || chatTypedMessage).trim();
    if (!text || !studentId || !teacherId || isSending) return;

    setIsSending(true);
    const recipientId = currentUserRole === 'student' ? teacherId : studentId;
    const occRefId = targetOccId || (targetScheduleId ? `virtual-${targetScheduleId}-${targetDate}` : null);

    // Optimistic message
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId,
      recipient_id: recipientId,
      content: text,
      created_at: new Date().toISOString(),
      is_read: false,
      occurrence_id: occRefId,
      is_system: false
    };
    setChatMessages(prev => [...prev, optimisticMessage]);
    setChatTypedMessage('');
    setTimeout(() => chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 40);

    try {
      const { error } = await supabase.from('campus_direct_messages').insert({
        sender_id: currentUserId,
        recipient_id: recipientId,
        content: text,
        occurrence_id: occRefId,
        is_read: false,
        is_system: false
      });
      if (error) throw error;
      await fetchMessages();
    } catch (err) {
      console.error('[CampusAppointmentShoutboxModal] Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Cancel Occurrence
  const handleCancel = async () => {
    if (isLessonPast || isActionLoading) return;

    const executeCancelAction = async () => {
      setIsActionLoading(true);
      try {
        const now = new Date();
        const execDateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const execTimeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const execTimestampStr = `${execDateStr} um ${execTimeStr} Uhr`;

        const actorName = currentUserRole === 'student'
          ? `${studentDisplayName}${isParentUnlocked ? ' (Eltern-PIN autorisiert)' : ''}`
          : `${teacherDisplayName} (Lehrkraft)`;

        const recipientId = currentUserRole === 'student' ? teacherId : studentId;
        const newStatus = currentUserRole === 'student' ? 'canceled_by_student' : 'cancelled';

        let effectiveOccId = targetOccId;

        // 1. Update or Insert in schedule_occurrences
        if (!targetOccId || targetOccId.startsWith('virtual-') || targetOccId.startsWith('virt_') || targetOccId.startsWith('sched-')) {
          const { data: insData, error: insErr } = await supabase
            .from('schedule_occurrences')
            .insert({
              schedule_id: targetScheduleId,
              student_id: studentId,
              teacher_id: teacherId,
              date: targetDate,
              start_time: startTimeRaw,
              duration: occurrence.duration || 45,
              status: newStatus,
              canceled_by_role: currentUserRole,
              student_acknowledged: true,
              teacher_acknowledged: false,
              school_id: occurrence.school_id || currentUserProfile?.school_id || null
            })
            .select('id')
            .single();

          if (!insErr && insData?.id) {
            effectiveOccId = insData.id;
          }
        } else {
          await supabase
            .from('schedule_occurrences')
            .update({
              status: newStatus,
              canceled_by_role: currentUserRole,
              student_acknowledged: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', targetOccId);
        }

        // 2. Insert unlöschbare Audit-Nachricht in campus_direct_messages
        const cancelMsgContent = `❌ Terminabsage: Dein Unterrichtstermin am ${weekdayShort} ${formattedOccDate} um ${timeLabel} Uhr fällt aus.\n🕒 Abgemeldet am: ${execTimestampStr} durch ${actorName}.`;
        await supabase.from('campus_direct_messages').insert({
          sender_id: currentUserId,
          recipient_id: recipientId,
          content: cancelMsgContent,
          occurrence_id: effectiveOccId || (targetScheduleId ? `virtual-${targetScheduleId}-${targetDate}` : null),
          is_system: true,
          message_type: 'reschedule_notification'
        });

        // 3. System Alerts
        try {
          await supabase.from('system_alerts').insert({
            school_id: occurrence.school_id || currentUserProfile?.school_id || null,
            teacher_id: teacherId,
            type: 'Termin abgesagt',
            message: `❌ Absage: ${actorName} hat den Termin am ${formattedOccDate} um ${timeLabel} Uhr abgesagt (Eingang: ${execTimestampStr}).`
          });
        } catch (e) {}

        // 4. Trigger real-time cross-tab sync
        if (typeof window !== 'undefined') {
          localStorage.setItem('campus_schedule_sync', Date.now().toString());
          window.dispatchEvent(new CustomEvent('campus_schedule_sync'));
        }

        if (onStatusChange) {
          onStatusChange(newStatus, { ...occurrence, id: effectiveOccId, status: newStatus });
        }

        await fetchMessages();
      } catch (err) {
        console.error('[CampusAppointmentShoutboxModal] Error cancelling appointment:', err);
        alert('Fehler beim Absagen des Termins.');
      } finally {
        setIsActionLoading(false);
      }
    };

    if (currentUserRole === 'student' && !isParentUnlocked && onRequestPinGate) {
      onRequestPinGate(executeCancelAction);
      return;
    }

    if (confirm(`Möchtest du den Termin am ${weekdayShort} ${formattedOccDate} um ${timeLabel} Uhr wirklich absagen?`)) {
      await executeCancelAction();
    }
  };

  // Handle Reactivate (Undo Cancel) Occurrence
  const handleReactivate = async () => {
    if (isLessonPast || isActionLoading) return;

    const executeReactivateAction = async () => {
      setIsActionLoading(true);
      try {
        const now = new Date();
        const execDateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const execTimeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const execTimestampStr = `${execDateStr} um ${execTimeStr} Uhr`;

        const actorName = currentUserRole === 'student'
          ? `${studentDisplayName}${isParentUnlocked ? ' (Eltern-PIN autorisiert)' : ''}`
          : `${teacherDisplayName} (Lehrkraft)`;

        const recipientId = currentUserRole === 'student' ? teacherId : studentId;
        let effectiveOccId = targetOccId;

        // 1. Update status in schedule_occurrences
        if (targetOccId && !targetOccId.startsWith('virtual-') && !targetOccId.startsWith('virt_') && !targetOccId.startsWith('sched-')) {
          await supabase
            .from('schedule_occurrences')
            .update({
              status: 'scheduled',
              canceled_by_role: null,
              student_acknowledged: true,
              teacher_acknowledged: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', targetOccId);
        } else {
          // If occurrence didn't have clean UUID, check if one exists in DB
          const { data: existingOcc } = await supabase
            .from('schedule_occurrences')
            .select('id')
            .eq('student_id', studentId)
            .eq('date', targetDate)
            .maybeSingle();

          if (existingOcc?.id) {
            effectiveOccId = existingOcc.id;
            await supabase
              .from('schedule_occurrences')
              .update({
                status: 'scheduled',
                canceled_by_role: null,
                student_acknowledged: true,
                teacher_acknowledged: false,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingOcc.id);
          }
        }

        // 2. Insert unlöschbare Audit-Nachricht in campus_direct_messages
        const reactivateMsgContent = `🔄 Termin reaktiviert: Dein Unterrichtstermin am ${weekdayShort} ${formattedOccDate} um ${timeLabel} Uhr findet regulär statt.\n🕒 Reaktiviert am: ${execTimestampStr} durch ${actorName}.`;
        await supabase.from('campus_direct_messages').insert({
          sender_id: currentUserId,
          recipient_id: recipientId,
          content: reactivateMsgContent,
          occurrence_id: effectiveOccId || (targetScheduleId ? `virtual-${targetScheduleId}-${targetDate}` : null),
          is_system: true,
          message_type: 'cancellation_reset'
        });

        // 3. System Alerts
        try {
          await supabase.from('system_alerts').insert({
            school_id: occurrence.school_id || currentUserProfile?.school_id || null,
            teacher_id: teacherId,
            type: 'Termin wiederhergestellt',
            message: `✅ Reaktiviert: ${actorName} hat den Termin am ${weekdayShort} ${formattedOccDate} um ${timeLabel} Uhr wieder reaktiviert (Eingang: ${execTimestampStr}).`
          });
        } catch (e) {}

        // 4. Trigger real-time cross-tab sync
        if (typeof window !== 'undefined') {
          localStorage.setItem('campus_schedule_sync', Date.now().toString());
          window.dispatchEvent(new CustomEvent('campus_schedule_sync'));
        }

        if (onStatusChange) {
          onStatusChange('scheduled', { ...occurrence, id: effectiveOccId, status: 'scheduled' });
        }

        await fetchMessages();
      } catch (err) {
        console.error('[CampusAppointmentShoutboxModal] Error reactivating appointment:', err);
        alert('Fehler beim Reaktivieren des Termins.');
      } finally {
        setIsActionLoading(false);
      }
    };

    if (currentUserRole === 'student' && !isParentUnlocked && onRequestPinGate) {
      onRequestPinGate(executeReactivateAction);
      return;
    }

    await executeReactivateAction();
  };

  // Music Pedagogical Quick Reply Chips
  const isTeacherRole = currentUserRole === 'teacher' || currentUserRole === 'admin' || currentUserRole === 'secretary';
  const phrases = isTeacherRole
    ? (isCanceled ? [
        { label: 'Gute Besserung!', text: 'Vielen Dank für die Nachricht! Gute Besserung und bis nächste Woche!', icon: ShieldCheck },
        { label: 'Stunde nachholen?', text: 'Schade, dass es heute nicht klappt! Wir können gerne schauen, ob wir die Stunde nachholen können.', icon: Calendar },
        { label: 'Hausaufgabe im Heft', text: 'Die Hausaufgabe ist im Aufgabenheft eingetragen – einfach bis nächste Woche daran weiterüben!', icon: FileText },
        { label: 'Alles klar, danke', text: 'Alles klar, vielen Dank für die Nachricht! Bis nächste Woche.', icon: Check }
      ] : [
        { label: 'Bin im Raum, gerne reinkommen!', text: 'Bin im Raum – einfach kurz anklopfen und reinkommen!', icon: Check },
        { label: 'Kein Problem wegen Noten!', text: 'Gar kein Problem! Noten sind hier im Raum vorhanden, bis gleich!', icon: Music },
        { label: 'Alles klar, kein Problem!', text: 'Alles klar, kein Problem! Bis gleich.', icon: Clock },
        { label: 'Hausaufgabe bereit', text: 'Die neue Aufgabe steht im Hausaufgabenheft bereit.', icon: FileText }
      ])
    : (isCanceled ? [
        { label: 'Was soll geübt werden?', text: 'Hallo! Was soll bis zur nächsten Stunde am besten geübt werden?', icon: MessageSquare },
        { label: 'Nachholen möglich?', text: 'Hallo! Gibt es vielleicht die Möglichkeit, die Stunde nachzuholen?', icon: Calendar },
        { label: 'Danke, bis nächste Woche!', text: 'Alles klar, vielen Dank! Dann bis nächste Woche.', icon: Check }
      ] : [
        { label: '5–10 Min. später', text: 'Hallo! Es wird leider ca. 5 bis 10 Minuten später, bin aber gleich da!', icon: Clock },
        { label: 'Noten vergessen', text: 'Hallo! Die Noten liegen leider noch zuhause. Können wir die Stunde trotzdem machen? Instrument ist dabei!', icon: Music },
        { label: 'Bis nachher!', text: 'Alles klar, bis nachher beim Unterricht!', icon: Check }
      ]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.15s ease'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '28px',
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          maxHeight: '85vh',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}
      >
        {/* iOS Sheet Grabber Pill */}
        <div style={{
          position: 'absolute',
          top: '7px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '36px',
          height: '4.5px',
          borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.4)',
          zIndex: 10
        }} />

        {/* Header: Apple HIG Morphing Glass Stage */}
        <div style={{
          background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
          padding: '24px 22px 18px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          color: '#ffffff',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 4px 16px rgba(0,0,0,0.06)',
          transition: 'background 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            {/* Apple Glas-Squircle */}
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.18)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}>
              <MessageSquare size={22} strokeWidth={2.2} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.18rem',
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                  whiteSpace: 'nowrap'
                }}>
                  {titleText}
                </h3>
                {/* Translucent Status Badge */}
                <span style={{
                  padding: '3px 9px',
                  borderRadius: '100px',
                  background: 'rgba(255, 255, 255, 0.22)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {isCanceled ? <X size={11} strokeWidth={3} /> : (isReactivated ? <RotateCcw size={11} strokeWidth={2.5} /> : (isRescheduled ? <Clock size={11} strokeWidth={2.5} /> : <Check size={11} strokeWidth={3} />))}
                  <span>{isCanceled ? 'Termin abgesagt' : (isReactivated ? 'Regulär (Reaktiviert)' : (isRescheduled ? 'Verschoben' : 'Regulär'))}</span>
                </span>
              </div>

              <p style={{
                margin: '3px 0 0 0',
                color: 'rgba(255, 255, 255, 0.92)',
                fontSize: '0.84rem',
                fontWeight: 650,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>Termin am {formattedOccDate} um {timeLabel} Uhr</span>
                <span style={{ opacity: 0.6 }}>•</span>
                <span style={{ color: '#ffffff', fontWeight: 800 }}>{otherPartyDisplayName}</span>
              </p>
            </div>
          </div>

          {/* Frosted Glass Close Button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              border: '1px solid rgba(255, 255, 255, 0.25)',
              background: 'rgba(255, 255, 255, 0.18)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              color: '#ffffff',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.32)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Cancelled Alert Banner with In-Chat Reactivation */}
        {isCanceled && (
          <div style={{
            margin: '12px 20px 0 20px',
            padding: '12px 16px',
            borderRadius: '16px',
            background: '#fff5f5',
            border: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <X size={16} strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#991b1b', letterSpacing: '-0.01em' }}>
                  Dieser Termin wurde abgesagt
                </div>
                <div style={{ fontSize: '0.74rem', color: '#b91c1c', fontWeight: 650, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={11} color="#b91c1c" strokeWidth={2.5} />
                  <span>{cancelTimestampStr ? `Abgesagt am ${cancelTimestampStr} (${cancelledByLabel})` : 'Absage kann hier direkt rückgängig gemacht werden.'}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={isLessonPast || isActionLoading}
              onClick={handleReactivate}
              style={{
                background: isLessonPast ? '#f1f5f9' : '#15803d',
                color: isLessonPast ? '#94a3b8' : '#ffffff',
                border: isLessonPast ? '1px solid #cbd5e1' : 'none',
                borderRadius: '100px',
                padding: '7px 15px',
                fontSize: '0.80rem',
                fontWeight: 850,
                cursor: isLessonPast ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
                boxShadow: isLessonPast ? 'none' : '0 2px 8px rgba(21, 128, 61, 0.25)',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={e => { if (!isLessonPast) e.currentTarget.style.background = '#166534'; }}
              onMouseLeave={e => { if (!isLessonPast) e.currentTarget.style.background = '#15803d'; }}
            >
              <RotateCcw size={13} strokeWidth={2.5} />
              <span>Reaktivieren</span>
            </button>
          </div>
        )}

        {/* Messages Viewport */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          background: '#fafbfc',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          minHeight: '260px',
          maxHeight: '440px'
        }} className="custom-scrollbar">
          {isFrozen && (
            <div style={{ background: '#fef2f2', border: '1px solid #fee2f2', color: '#991b1b', padding: '8px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', textAlign: 'center' }}>
              <Lock size={14} /> <span>Shoutbox eingefroren (Schreibschutz nach 48h aktiv)</span>
            </div>
          )}

          {reconciledMessages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.82rem', textAlign: 'center', padding: '24px 16px', gap: '8px', background: 'rgba(255,255,255,0.7)', border: '1.5px dashed #cbd5e1', borderRadius: '16px', margin: 'auto 0' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#e6f4ea', color: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                <Calendar size={20} />
              </div>
              <h5 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                Termingekoppelter Schulchat
              </h5>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4, maxWidth: '240px' }}>
                Geschützte Direktnachrichten für diesen Unterrichtstermin – DSGVO- &amp; datenschutzkonform.
              </p>
            </div>
          ) : (
            reconciledMessages.map((msg, idx) => {
              const isMe = msg.sender_id === currentUserId;
              const cleanContent = String(msg.content || '').replace(/^\[Termin[^\]]+\]\s*/i, '').trim();

              const isCancellation = msg.message_type === 'reschedule_notification' ||
                (msg.content && (msg.content.includes('❌') || msg.content.includes('fällt aus') || msg.content.includes('Termin abgesagt') || msg.content.includes('wurde abgesagt') || msg.content.includes('storniert') || msg.content.includes('abgesagt')));

              const isReactivation = msg.message_type === 'cancellation_reset' ||
                (msg.content && (msg.content.includes('🔄') || msg.content.includes('reaktiviert') || msg.content.includes('zurückgenommen') || msg.content.includes('regulär statt') || msg.content.includes('zurückgesetzt')));

              // 1. Reaktivierungs-Eventkarte (Audit-Proof)
              if (isReactivation) {
                return (
                  <div key={msg.id || idx} style={{ alignSelf: 'center', width: '100%', maxWidth: '96%', margin: '4px 0' }}>
                    <div style={{
                      background: '#f0fdf4',
                      border: '1.5px solid #86efac',
                      borderRadius: '18px',
                      padding: '12px 18px',
                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <RotateCcw size={14} color="#15803d" strokeWidth={2.5} />
                        </div>
                        <span style={{ fontSize: '0.86rem', fontWeight: 900, color: '#15803d', letterSpacing: '-0.01em' }}>
                          Termin reaktiviert
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>
                          {new Date(msg.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}, {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                        </span>
                      </div>
                      <div style={{ fontSize: '0.92rem', color: '#166534', fontWeight: 650, lineHeight: 1.45, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                        {cleanContent}
                        {!cleanContent.includes('Reaktiviert am') && (
                          <div style={{ marginTop: '6px', fontSize: '0.76rem', color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={11} color="#166534" />
                            <span>Reaktiviert am {new Date(msg.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // 2. Stornierungs-/Absage-Eventkarte (Audit-Proof)
              if (isCancellation) {
                return (
                  <div key={msg.id || idx} style={{ alignSelf: 'center', width: '100%', maxWidth: '96%', margin: '4px 0' }}>
                    <div style={{
                      background: '#fef2f2',
                      border: '1.5px dashed #fca5a5',
                      borderRadius: '18px',
                      padding: '12px 18px',
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <X size={14} color="#dc2626" strokeWidth={2.5} />
                        </div>
                        <span style={{ fontSize: '0.86rem', fontWeight: 900, color: '#991b1b', letterSpacing: '-0.01em' }}>
                          Termin abgesagt
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#b91c1c', fontWeight: 700 }}>
                          {new Date(msg.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}, {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                        </span>
                      </div>
                      <div style={{ fontSize: '0.92rem', color: '#991b1b', fontWeight: 650, lineHeight: 1.45, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                        {cleanContent}
                        {!cleanContent.includes('Abgemeldet am') && !cleanContent.includes('Abgesagt am') && (
                          <div style={{ marginTop: '6px', fontSize: '0.76rem', color: '#b91c1c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={11} color="#b91c1c" />
                            <span>Abgemeldet am {new Date(msg.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // 3. Reguläre Chat-Nachricht
              const senderDisplayName = isMe
                ? 'Du'
                : (currentUserRole === 'student' ? teacherDisplayName : studentDisplayName);

              return (
                <div key={msg.id || idx} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                  gap: '2px'
                }}>
                  {!isMe && (
                    <span style={{
                      fontSize: '0.80rem',
                      fontWeight: 800,
                      color: currentUserRole === 'student' ? '#15803d' : '#2563eb',
                      marginBottom: '2px',
                      marginLeft: '6px'
                    }}>
                      {senderDisplayName}
                    </span>
                  )}
                  <div style={{
                    background: isMe ? 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)' : '#ffffff',
                    color: isMe ? '#ffffff' : '#0f172a',
                    padding: '12px 16px',
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    fontSize: '0.96rem',
                    lineHeight: 1.45,
                    wordBreak: 'break-word',
                    border: isMe ? 'none' : '1px solid #e2e8f0',
                    boxShadow: isMe ? '0 2px 8px rgba(21, 128, 61, 0.22)' : '0 2px 6px rgba(0,0,0,0.04)'
                  }}>
                    {cleanContent}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px', marginTop: '6px' }}>
                      <span style={{ fontSize: '0.74rem', color: isMe ? 'rgba(255, 255, 255, 0.85)' : '#64748b', fontWeight: 650 }}>
                        {new Date(msg.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}, {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && <CheckCheck size={14} color="#ffffff" style={{ marginLeft: '2px', opacity: 0.95 }} />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatMessagesEndRef} />
        </div>

        {/* Quick Reply Chips & Action Bar */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '10px 20px 14px 20px'
        }}>
          {/* Music Pedagogical Quick Reply Chips */}
          {!isFrozen && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflowX: 'auto',
              padding: '2px 0 4px 0',
              scrollbarWidth: 'none',
              maskImage: 'linear-gradient(to right, black 94%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 94%, transparent 100%)'
            }}>
              {/* Reaktivieren Quick Action Chip when Cancelled */}
              {isCanceled && (
                <button
                  type="button"
                  disabled={isLessonPast || isActionLoading}
                  onClick={handleReactivate}
                  style={{
                    padding: '7px 13px',
                    minHeight: '34px',
                    borderRadius: '100px',
                    background: isLessonPast ? '#f1f5f9' : '#f0fdf4',
                    border: isLessonPast ? '1.5px solid #cbd5e1' : '1.5px solid #86efac',
                    color: isLessonPast ? '#94a3b8' : '#15803d',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    cursor: isLessonPast ? 'not-allowed' : 'pointer',
                    opacity: isLessonPast ? 0.6 : 1,
                    boxShadow: isLessonPast ? 'none' : '0 1px 3px rgba(34, 197, 94, 0.12)',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  className={isLessonPast ? '' : 'hover-scale'}
                >
                  <RotateCcw size={13} strokeWidth={2.5} />
                  <span>Termin reaktivieren</span>
                </button>
              )}

              {phrases.map((phrase, pIdx) => {
                const IconComp = phrase.icon;
                return (
                  <button
                    key={`phrase-${pIdx}`}
                    type="button"
                    onClick={() => setChatTypedMessage(phrase.text)}
                    style={{
                      padding: '7px 13px',
                      minHeight: '34px',
                      borderRadius: '100px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      color: '#334155',
                      fontSize: '0.82rem',
                      fontWeight: 750,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.color = '#0f172a';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.color = '#334155';
                    }}
                  >
                    <IconComp size={13} color="#15803d" strokeWidth={2.4} />
                    <span>{phrase.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Input Row & Action Buttons */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%'
            }}
          >
            <input
              type="text"
              placeholder={isFrozen ? 'Shoutbox ist schreibgeschützt...' : 'Nachricht schreiben...'}
              disabled={isFrozen || isSending}
              value={chatTypedMessage}
              onChange={e => setChatTypedMessage(e.target.value)}
              style={{
                flex: 1,
                padding: '11px 18px',
                minHeight: '44px',
                borderRadius: '100px',
                border: '1.5px solid #e2e8f0',
                background: isFrozen ? '#f1f5f9' : '#ffffff',
                fontSize: '0.90rem',
                fontWeight: 550,
                outline: 'none',
                color: '#0f172a',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'border-color 0.15s, box-shadow 0.15s'
              }}
              onFocus={e => {
                if (!isFrozen) {
                  e.target.style.borderColor = '#15803d';
                  e.target.style.boxShadow = '0 0 0 3px rgba(21, 128, 61, 0.15)';
                }
              }}
              onBlur={e => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
              }}
            />

            {/* Contextual Action Button (Absagen / Reaktivieren) */}
            {isCanceled ? (
              <button
                type="button"
                disabled={isLessonPast || isActionLoading}
                onClick={handleReactivate}
                title={isLessonPast ? 'Termin liegt in der Vergangenheit' : 'Termin reaktivieren'}
                style={{
                  background: isLessonPast ? '#f1f5f9' : '#f0fdf4',
                  color: isLessonPast ? '#94a3b8' : '#15803d',
                  border: isLessonPast ? '1.5px solid #cbd5e1' : '1.5px solid #86efac',
                  borderRadius: '100px',
                  padding: '8px 15px',
                  minHeight: '42px',
                  fontSize: '0.82rem',
                  fontWeight: 850,
                  cursor: isLessonPast ? 'not-allowed' : 'pointer',
                  opacity: isLessonPast ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
                onMouseEnter={e => { if (!isLessonPast) e.currentTarget.style.background = '#dcfce7'; }}
                onMouseLeave={e => { if (!isLessonPast) e.currentTarget.style.background = '#f0fdf4'; }}
              >
                <RotateCcw size={13} strokeWidth={2.5} />
                <span>Reaktivieren</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isLessonPast || isActionLoading}
                onClick={handleCancel}
                title={isLessonPast ? 'Termin liegt in der Vergangenheit' : 'Termin absagen...'}
                style={{
                  background: isLessonPast ? '#f1f5f9' : '#fee2e2',
                  color: isLessonPast ? '#94a3b8' : '#dc2626',
                  border: isLessonPast ? '1.5px solid #cbd5e1' : '1.5px solid #fca5a5',
                  borderRadius: '100px',
                  padding: '8px 15px',
                  minHeight: '42px',
                  fontSize: '0.82rem',
                  fontWeight: 850,
                  cursor: isLessonPast ? 'not-allowed' : 'pointer',
                  opacity: isLessonPast ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
                onMouseEnter={e => { if (!isLessonPast) e.currentTarget.style.background = '#fecaca'; }}
                onMouseLeave={e => { if (!isLessonPast) e.currentTarget.style.background = '#fee2e2'; }}
              >
                <X size={13} strokeWidth={2.5} />
                <span>Absagen</span>
              </button>
            )}

            {/* Send Message Button */}
            <button
              type="submit"
              disabled={isFrozen || isSending || !chatTypedMessage.trim()}
              style={{
                background: isFrozen || !chatTypedMessage.trim() ? '#f1f5f9' : '#15803d',
                color: isFrozen || !chatTypedMessage.trim() ? '#94a3b8' : '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isFrozen || !chatTypedMessage.trim() ? 'not-allowed' : 'pointer',
                boxShadow: isFrozen || !chatTypedMessage.trim() ? 'none' : '0 2px 8px rgba(21, 128, 61, 0.25)',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
              onMouseEnter={e => {
                if (!isFrozen && chatTypedMessage.trim()) e.currentTarget.style.background = '#166534';
              }}
              onMouseLeave={e => {
                if (!isFrozen && chatTypedMessage.trim()) e.currentTarget.style.background = '#15803d';
              }}
            >
              <Send size={16} />
            </button>
          </form>

          <div style={{ textAlign: 'center', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>
            🔒 DSGVO-konforme Schulkommunikation · TLS 1.3 &amp; AES-256
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampusAppointmentShoutboxModal;
