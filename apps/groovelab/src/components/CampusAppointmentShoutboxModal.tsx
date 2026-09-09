import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  const containerRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [windowWidth, setWindowWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const isInsideSim = typeof document !== 'undefined' && Boolean(document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait, .sim-viewport-iphone14, [class*="sim-viewport-mobile"]'));
    return windowWidth <= 768 || isInsideSim;
  }, [windowWidth]);

  // Lock body scroll when modal is open to prevent background scrolling
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const simTarget = typeof document !== 'undefined'
    ? (document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait, .sim-viewport-iphone14, [class*="sim-viewport-mobile"]') as HTMLElement)
    : null;
  const isInsideSim = Boolean(simTarget);
  const portalTarget = mounted
    ? ((isMobile && simTarget) ? simTarget : (typeof document !== 'undefined' ? document.body : null))
    : null;

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
        content: `[Termin ${weekdayShort}., ${formattedOccDate}, ${timeLabel} Uhr] Termin reaktiviert: Der Unterricht findet planmäßig statt.`,
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
    const isParentSender = Boolean(isParentUnlocked);
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId,
      recipient_id: recipientId,
      content: text,
      created_at: new Date().toISOString(),
      is_read: false,
      occurrence_id: occRefId,
      is_system: false,
      sender_role: isParentSender ? 'parent' : (currentUserRole === 'teacher' ? 'teacher' : 'student')
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
        is_system: false,
        sender_role: isParentSender ? 'parent' : (currentUserRole === 'teacher' ? 'teacher' : 'student')
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
        const cancelMsgContent = `Terminabsage: Dein Unterrichtstermin am ${weekdayShort} ${formattedOccDate} um ${timeLabel} Uhr fällt aus.\nAbgemeldet am: ${execTimestampStr} durch ${actorName}.`;
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
            message: `Absage: ${actorName} hat den Termin am ${formattedOccDate} um ${timeLabel} Uhr abgesagt (Eingang: ${execTimestampStr}).`
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

    // Check if appointment is short-term (< 2 hours away)
    let isShortNotice = false;
    try {
      const timePart = startTimeRaw.includes(':') ? startTimeRaw : `${startTimeRaw}:00`;
      const lessonDateTime = new Date(`${targetDate}T${timePart}`);
      const diffMs = lessonDateTime.getTime() - Date.now();
      isShortNotice = diffMs > 0 && diffMs < 2 * 60 * 60 * 1000;
    } catch (e) {}

    const shortNoticeWarning = isShortNotice 
      ? '\n\n⚠️ Kurzfristige Absage: Da dieser Termin in weniger als 2 Stunden beginnt, bitten wir dich, deine Lehrkraft oder das Schulsekretariat zusätzlich telefonisch zu informieren.'
      : '';
    const contractualHint = '\n\n📋 Hinweis: Die Plattform übermittelt deine Absage als Bote an deine Lehrkraft. Es gelten die im Musikschulvertrag vereinbarten Absage- und Nachholregeln.';

    if (confirm(`Möchtest du deine Absage für den Termin am ${weekdayShort} ${formattedOccDate} um ${timeLabel} Uhr an deine Lehrkraft übermitteln?${shortNoticeWarning}${contractualHint}`)) {
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
        const reactivateMsgContent = `Termin reaktiviert: Dein Unterrichtstermin am ${weekdayShort} ${formattedOccDate} um ${timeLabel} Uhr findet regulär statt.\nReaktiviert am: ${execTimestampStr} durch ${actorName}.`;
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
            message: `Reaktiviert: ${actorName} hat den Termin am ${weekdayShort} ${formattedOccDate} um ${timeLabel} Uhr wieder reaktiviert (Eingang: ${execTimestampStr}).`
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

  const content = (
    <div
      ref={containerRef}
      onClick={onClose}
      className="pwa-modal-drawer"
      style={{
        position: (isMobile && isInsideSim) ? 'absolute' : 'fixed',
        inset: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        zIndex: 99999,
        background: isMobile ? '#ffffff' : 'rgba(15, 23, 42, 0.65)',
        backdropFilter: isMobile ? 'none' : 'blur(8px)',
        WebkitBackdropFilter: isMobile ? 'none' : 'blur(8px)',
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : '24px',
        animation: 'fadeIn 0.15s ease'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="pwa-modal-drawer"
        style={{
          background: '#ffffff',
          borderRadius: isMobile ? 0 : '28px',
          width: '100%',
          maxWidth: isMobile ? '100%' : '500px',
          height: isMobile ? '100%' : 'auto',
          maxHeight: isMobile ? '100%' : '85vh',
          boxShadow: isMobile ? 'none' : '0 32px 80px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}
      >
        {/* iOS Sheet Grabber Pill (Desktop modal only) */}
        {!isMobile && (
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
        )}

        {/* Header: Apple HIG Morphing Glass Stage */}
        <div style={{
          background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
          padding: isMobile
            ? 'calc(12px + env(safe-area-inset-top, 0px)) 16px 13px 16px'
            : '24px 22px 18px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          color: '#ffffff',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 4px 16px rgba(0,0,0,0.06)',
          transition: 'background 0.3s ease',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px', minWidth: 0, flex: 1 }}>
            {/* Apple Glas-Squircle */}
            <div style={{
              width: isMobile ? '38px' : '44px',
              height: isMobile ? '38px' : '44px',
              borderRadius: '13px',
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
              <MessageSquare size={isMobile ? 19 : 22} strokeWidth={2.2} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                <h3 style={{
                  margin: 0,
                  fontSize: isMobile ? '1.08rem' : '1.18rem',
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {isMobile ? otherPartyDisplayName : titleText}
                </h3>
                {/* Translucent Status Badge */}
                <span style={{
                  padding: '2.5px 8px',
                  borderRadius: '100px',
                  background: isCanceled ? 'rgba(220, 38, 38, 0.35)' : 'rgba(255, 255, 255, 0.22)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  color: '#ffffff',
                  border: isCanceled ? '1px solid rgba(254, 202, 202, 0.4)' : '1px solid rgba(255, 255, 255, 0.3)',
                  fontSize: isMobile ? '0.68rem' : '0.74rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}>
                  {isCanceled ? <X size={10} strokeWidth={3} /> : (isReactivated ? <RotateCcw size={10} strokeWidth={2.5} /> : (isRescheduled ? <Clock size={10} strokeWidth={2.5} /> : <Check size={10} strokeWidth={3} />))}
                  <span>{isCanceled ? 'Termin abgesagt' : (isReactivated ? 'Regulär (Reaktiviert)' : (isRescheduled ? 'Verschoben' : 'Regulär'))}</span>
                </span>
              </div>

              <p style={{
                margin: '2px 0 0 0',
                color: 'rgba(255, 255, 255, 0.90)',
                fontSize: isMobile ? '0.76rem' : '0.84rem',
                fontWeight: 650,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                <span>{weekdayShort}, {formattedOccDate}</span>
                <span style={{ opacity: 0.6 }}>•</span>
                <span>{timeLabel} Uhr</span>
                {!isMobile && (
                  <>
                    <span style={{ opacity: 0.6 }}>•</span>
                    <span style={{ color: '#ffffff', fontWeight: 800 }}>{otherPartyDisplayName}</span>
                  </>
                )}
                {isGroupOcc && (
                  <>
                    <span style={{ opacity: 0.6 }}>•</span>
                    <span style={{ opacity: 0.9 }}>Gruppe</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Frosted Glass Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            style={{
              border: '1px solid rgba(255, 255, 255, 0.25)',
              background: 'rgba(255, 255, 255, 0.18)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              color: '#ffffff',
              borderRadius: '50%',
              width: isMobile ? '34px' : '32px',
              height: isMobile ? '34px' : '32px',
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

        {/* Child Protection Banner (§ 8a SGB VIII) - Desktop Only */}
        {!isMobile && (
          <div style={{
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '7px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.69rem',
            color: '#64748b',
            lineHeight: '1.35',
            flexShrink: 0
          }}>
            <ShieldCheck size={13} color="#15803d" style={{ flexShrink: 0 }} />
            <span>
              <strong>Didaktischer Schul-Chat (§ 8a SGB VIII):</strong> Nur für Unterrichtszwecke • Für Erziehungsberechtigte transparent einsehbar.
            </span>
          </div>
        )}

        {/* Cancelled Alert Banner with In-Chat Reactivation */}
        {isCanceled && (
          <div style={{
            margin: isMobile ? '10px 14px 0 14px' : '12px 20px 0 20px',
            padding: isMobile ? '10px 14px' : '12px 16px',
            borderRadius: '16px',
            background: '#fff5f5',
            border: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.04)',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
              <div style={{
                width: isMobile ? '28px' : '32px',
                height: isMobile ? '28px' : '32px',
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <X size={isMobile ? 14 : 16} strokeWidth={2.5} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? '0.80rem' : '0.86rem', fontWeight: 800, color: '#991b1b', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Dieser Termin wurde abgesagt
                </div>
                <div style={{ fontSize: '0.70rem', color: '#b91c1c', fontWeight: 650, marginTop: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={10} color="#b91c1c" strokeWidth={2.5} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cancelTimestampStr ? `Abgesagt am ${cancelTimestampStr} (${cancelledByLabel})` : 'Absage kann direkt reaktiviert werden.'}
                  </span>
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
                padding: '6px 13px',
                fontSize: '0.76rem',
                fontWeight: 850,
                cursor: isLessonPast ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
                boxShadow: isLessonPast ? 'none' : '0 2px 8px rgba(21, 128, 61, 0.25)',
                transition: 'background 0.15s ease',
                flexShrink: 0
              }}
              onMouseEnter={e => { if (!isLessonPast) e.currentTarget.style.background = '#166534'; }}
              onMouseLeave={e => { if (!isLessonPast) e.currentTarget.style.background = '#15803d'; }}
            >
              <RotateCcw size={12} strokeWidth={2.5} />
              <span>Reaktivieren</span>
            </button>
          </div>
        )}

        {/* Messages Viewport */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: isMobile ? '12px 14px' : '20px 24px',
          background: '#fafbfc',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          minHeight: isMobile ? '160px' : '260px',
          maxHeight: isMobile ? 'none' : '440px'
        }} className="custom-scrollbar">
          {/* Centered Child Protection Whisper Badge (Mobile Only) */}
          {isMobile && (
            <div style={{
              alignSelf: 'center',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '100px',
              background: 'rgba(241, 245, 249, 0.85)',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              fontSize: '0.68rem',
              fontWeight: 650,
              margin: '2px 0 6px 0',
              textAlign: 'center',
              maxWidth: '92%'
            }}>
              <ShieldCheck size={12} color="#15803d" style={{ flexShrink: 0 }} />
              <span>Schul-Chat (§ 8a SGB VIII) • Für Erziehungsberechtigte einsehbar</span>
            </div>
          )}
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

              // 1. Reaktivierungs-Eventpill (Monochrom & Apple HIG)
              if (isReactivation) {
                const dateObj = new Date(msg.created_at);
                const timeFormatted = dateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                const dateFormatted = dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

                return (
                  <div key={msg.id || idx} style={{ alignSelf: 'center', margin: '6px 0', maxWidth: '92%' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '100px',
                      padding: '5px 14px',
                      boxShadow: '0 1px 3px rgba(34, 197, 94, 0.08)'
                    }}>
                      <RotateCcw size={12} color="#15803d" strokeWidth={2.6} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#15803d' }}>
                        Termin reaktiviert
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 650 }}>
                        • {dateFormatted}, {timeFormatted} Uhr
                      </span>
                    </div>
                  </div>
                );
              }

              // 2. Stornierungs-/Absage-Eventpill (Monochrom & Apple HIG)
              if (isCancellation) {
                const dateObj = new Date(msg.created_at);
                const timeFormatted = dateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                const dateFormatted = dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

                return (
                  <div key={msg.id || idx} style={{ alignSelf: 'center', margin: '6px 0', maxWidth: '92%' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '100px',
                      padding: '5px 14px',
                      boxShadow: '0 1px 3px rgba(239, 68, 68, 0.06)'
                    }}>
                      <X size={12} color="#dc2626" strokeWidth={2.8} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#991b1b' }}>
                        Termin abgesagt
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 650 }}>
                        • {dateFormatted}, {timeFormatted} Uhr
                      </span>
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
                  {(!isMe || msg.sender_role === 'parent') && (
                    <span style={{
                      fontSize: '0.80rem',
                      fontWeight: 800,
                      color: msg.sender_role === 'parent' ? '#1d4ed8' : (currentUserRole === 'student' ? '#15803d' : '#2563eb'),
                      marginBottom: '2px',
                      marginLeft: isMe ? '0px' : '6px',
                      marginRight: isMe ? '6px' : '0px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <span>{senderDisplayName}</span>
                      {msg.sender_role === 'parent' && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '1px 6px',
                          borderRadius: '6px',
                          background: '#eff6ff',
                          border: '1px solid #dbeafe',
                          color: '#1d4ed8',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          lineHeight: 1
                        }}>
                          <ShieldCheck size={11} color="#1d4ed8" strokeWidth={2.5} />
                          <span>Eltern</span>
                        </span>
                      )}
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
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: isMobile
            ? '10px 14px calc(12px + env(safe-area-inset-bottom, 0px)) 14px'
            : '10px 20px 14px 20px',
          flexShrink: 0
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
              {/* Primary Contextual Action Chip (Absagen or Reaktivieren) */}
              {isCanceled ? (
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
                    fontSize: '0.80rem',
                    fontWeight: 850,
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
                  <RotateCcw size={12} strokeWidth={2.6} />
                  <span>Termin reaktivieren</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isLessonPast || isActionLoading}
                  onClick={handleCancel}
                  style={{
                    padding: '7px 13px',
                    minHeight: '34px',
                    borderRadius: '100px',
                    background: isLessonPast ? '#f1f5f9' : '#fff5f5',
                    border: isLessonPast ? '1.5px solid #cbd5e1' : '1.5px solid #fca5a5',
                    color: isLessonPast ? '#94a3b8' : '#dc2626',
                    fontSize: '0.80rem',
                    fontWeight: 850,
                    whiteSpace: 'nowrap',
                    cursor: isLessonPast ? 'not-allowed' : 'pointer',
                    opacity: isLessonPast ? 0.6 : 1,
                    boxShadow: isLessonPast ? 'none' : '0 1px 3px rgba(220, 38, 38, 0.10)',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  className={isLessonPast ? '' : 'hover-scale'}
                >
                  <X size={12} strokeWidth={2.6} />
                  <span>Termin absagen</span>
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
                      fontSize: '0.80rem',
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
                    <IconComp size={12} color="#15803d" strokeWidth={2.4} />
                    <span>{phrase.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Input Row - Full Width Text Field & Clean Send Button */}
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
                minWidth: 0,
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

            {/* Send Message Button */}
            <button
              type="submit"
              disabled={isFrozen || isSending || !chatTypedMessage.trim()}
              aria-label="Nachricht senden"
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

          {/* Discreet 1-Line Legal Whisper Notice */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            textAlign: 'center',
            fontSize: '0.64rem',
            color: '#94a3b8',
            lineHeight: 1.3
          }}>
            <Lock size={11} color="#94a3b8" style={{ flexShrink: 0 }} />
            <span>Elektronischer Bote • Fristen des Musikschulvertrags beachten • TLS 1.3</span>
          </div>
        </div>
      </div>
    </div>
  );

  return portalTarget ? createPortal(content, portalTarget) : content;
};

export default CampusAppointmentShoutboxModal;
