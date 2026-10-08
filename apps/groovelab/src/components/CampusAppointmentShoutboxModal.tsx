import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageSquare,
  X,
  ArrowLeft,
  RotateCcw,
  Check,
  CheckCheck,
  Clock,
  Send,
  Calendar,
  Music,
  FileText,
  ShieldCheck,
  Lock,
  User,
  Fingerprint
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatTeacherFullName, formatSingleStudentAnonymized } from '../utils/nameHelper';
import { decryptMessagesBatch, primeDecryptedCache } from '../lib/security/messageCrypto';
import { isWebAuthnSupported, getSanitizedRpId } from '../utils/webauthn';
import { CampusDynamicAvatar } from './CampusDirectMessages';
import { CampusUnifiedChatMessage, isChatMessageSystem } from './messages/CampusUnifiedChatMessage';

export interface CampusAppointmentShoutboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  occurrence: any;
  currentUserId: string;
  currentUserRole: 'student' | 'teacher' | 'admin' | 'secretary';
  currentUserProfile?: any;
  isParentUnlocked?: boolean;
  isChatAllowed?: boolean;
  isAbsenceAllowed?: boolean;
  onRequestPinGate?: (action: () => Promise<void>) => void;
  onStatusChange?: (newStatus: 'scheduled' | 'cancelled' | 'canceled_by_student', updatedOcc?: any) => void;
  initialDraftMessage?: string;
}

export const CampusAppointmentShoutboxModal: React.FC<CampusAppointmentShoutboxModalProps> = ({
  isOpen,
  onClose,
  occurrence,
  currentUserId,
  currentUserRole,
  currentUserProfile,
  isParentUnlocked = false,
  isChatAllowed: propIsChatAllowed,
  isAbsenceAllowed: propIsAbsenceAllowed,
  onRequestPinGate,
  onStatusChange,
  initialDraftMessage
}) => {
  const isChatAllowed = useMemo(() => {
    if (currentUserRole !== 'student') return true;
    if (propIsChatAllowed !== undefined) return propIsChatAllowed;
    const profile = currentUserProfile || occurrence?.student || occurrence?.student_user;
    if (profile?.parent_permissions?.allow_chat !== undefined) return Boolean(profile.parent_permissions.allow_chat);
    if (profile?.parent_allow_chat !== undefined) return Boolean(profile.parent_allow_chat);
    return true;
  }, [currentUserRole, propIsChatAllowed, currentUserProfile, occurrence]);

  const isAbsenceAllowed = useMemo(() => {
    if (currentUserRole !== 'student') return true;
    if (propIsAbsenceAllowed !== undefined) return propIsAbsenceAllowed;
    const profile = currentUserProfile || occurrence?.student || occurrence?.student_user;
    if (profile?.parent_permissions?.allow_absences !== undefined) return Boolean(profile.parent_permissions.allow_absences);
    if (profile?.parent_allow_absences !== undefined) return Boolean(profile.parent_allow_absences);
    return true;
  }, [currentUserRole, propIsAbsenceAllowed, currentUserProfile, occurrence]);

  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatTypedMessage, setChatTypedMessage] = useState(initialDraftMessage || '');
  const [isSending, setIsSending] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local Parent Opt-In & PIN Verification
  const [localParentUnlocked, setLocalParentUnlocked] = useState<boolean>(isParentUnlocked);
  useEffect(() => {
    setLocalParentUnlocked(isParentUnlocked);
  }, [isParentUnlocked]);

  const effectiveIsParentUnlocked = Boolean(isParentUnlocked || localParentUnlocked);

  const [showPinDialog, setShowPinDialog] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);
  const [pinShake, setPinShake] = useState<boolean>(false);
  const [failedPinAttempts, setFailedPinAttempts] = useState<number>(0);
  const [pinCooldownSeconds, setPinCooldownSeconds] = useState<number>(0);

  // Anti-Brute-Force Cooldown Timer
  useEffect(() => {
    if (pinCooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setPinCooldownSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [pinCooldownSeconds]);

  useEffect(() => {
    if (isOpen && initialDraftMessage) {
      setChatTypedMessage(initialDraftMessage);
    }
  }, [isOpen, initialDraftMessage]);

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
  const [fetchedTeacher, setFetchedTeacher] = useState<any | null>(null);

  const studentObj = occurrence.student || occurrence.student_user || (currentUserRole === 'student' ? currentUserProfile : null);
  const studentId = occurrence.student_id || occurrence.studentId || studentObj?.id || (currentUserRole === 'student' ? currentUserId : null);
  
  const teacherObj = occurrence.teacher 
    || occurrence.teacher_profile 
    || occurrence.teacherUser 
    || occurrence.teachers
    || (currentUserRole === 'teacher' ? currentUserProfile : (currentUserProfile?.teacher || currentUserProfile?.teachers || null))
    || fetchedTeacher;

  const teacherId = occurrence.teacher_id 
    || occurrence.teacherId 
    || teacherObj?.id 
    || (currentUserRole === 'teacher' ? currentUserId : (currentUserProfile?.teacher_id || studentObj?.teacher_id || null));

  useEffect(() => {
    if (currentUserRole === 'student' && !teacherObj && teacherId) {
      supabase
        .from('users')
        .select('id, first_name, last_name, role, avatar_url, photo_url')
        .eq('id', teacherId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setFetchedTeacher(data);
        });
    }
  }, [currentUserRole, teacherObj, teacherId]);

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
    : (occurrence.teacher_name || occurrence.teacherName || currentUserProfile?.teacher_name || currentUserProfile?.teacherName
        ? formatTeacherFullName(occurrence.teacher_name || occurrence.teacherName || currentUserProfile?.teacher_name || currentUserProfile?.teacherName)
        : (fetchedTeacher ? formatTeacherFullName(fetchedTeacher) : 'Deine Lehrkraft'));

  const otherPartyDisplayName = currentUserRole === 'student'
    ? teacherDisplayName
    : (isGroupOcc ? (occurrence.group_name || 'Gruppe') : studentDisplayName);

  const otherPartyUser = useMemo(() => {
    if (isGroupOcc) {
      return { is_group: true, name: occurrence.group_name || otherPartyDisplayName, role: 'group' };
    }
    if (currentUserRole === 'student') {
      return teacherObj || fetchedTeacher || { first_name: teacherDisplayName, role: 'teacher' };
    }
    return studentObj || { first_name: studentDisplayName, role: 'student' };
  }, [isGroupOcc, currentUserRole, teacherObj, fetchedTeacher, teacherDisplayName, studentObj, studentDisplayName, occurrence.group_name, otherPartyDisplayName]);

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
  const isCanceled = ['cancelled', 'canceled_by_student', 'canceled', 'teacher_ausfall', 'canceled_by_teacher_ausfall'].includes(statusStr);

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
  const formattedOccDateShort = occDateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  const appointmentSubject = occurrence.instrument || occurrence.subject || occurrence.title || '';

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

        const effectiveSchoolId = currentUserProfile?.school_id || 
          (Array.isArray(currentUserProfile?.schools) ? currentUserProfile?.schools[0]?.id : currentUserProfile?.schools?.id) || 
          occurrence?.school_id || 
          occurrence?.schoolId ||
          occurrence?.schedule?.school_id ||
          teacherObj?.school_id ||
          studentObj?.school_id ||
          filtered[0]?.school_id ||
          (typeof window !== 'undefined' ? (localStorage.getItem('campus_school_id') || localStorage.getItem('groovelab_school_id')) : null);
        const decrypted = await decryptMessagesBatch(filtered, effectiveSchoolId);

        setChatMessages(decrypted);
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

  // Server-Side Parent PIN Verification for In-Chat Opt-In (6-stellige Eltern-Master-PIN)
  const handleVerifyParentPin = async (inputPin: string) => {
    if (pinCooldownSeconds > 0 || isVerifyingPin) return;
    const cleanPin = inputPin.trim();
    if (cleanPin.length !== 6) return;

    const targetStudentId = studentId || occurrence?.student_id || currentUserId;
    if (!targetStudentId) {
      setPinError('Kein Schülerprofil zugeordnet.');
      return;
    }

    setIsVerifyingPin(true);
    setPinError('');

    try {
      let isOk = false;

      // 1. Primary: Server-side lease verification
      try {
        const { data: leaseData, error: leaseErr } = await supabase.rpc('verify_parent_pin_with_lease', {
          p_student_id: targetStudentId,
          p_input_pin: cleanPin,
          p_device_key: `shoutbox-optin-${Date.now()}`
        });
        if (!leaseErr && leaseData?.success === true) {
          isOk = true;
          if (leaseData?.lease_token) {
            try {
              sessionStorage.setItem('gl_parent_session_lease', String(leaseData.lease_token));
            } catch (e) {}
          }
        }
      } catch (e) {}

      // 2. Fallback: Standard server-side verification
      if (!isOk) {
        try {
          const { data: parentOk, error: pinErr } = await supabase.rpc('verify_parent_pin', {
            student_id: targetStudentId,
            input_pin: cleanPin
          });
          if (!pinErr && parentOk === true) {
            isOk = true;
          }
        } catch (e) {}
      }

      if (isOk) {
        setLocalParentUnlocked(true);
        setShowPinDialog(false);
        setPinInput('');
        setPinError('');
        setFailedPinAttempts(0);
        try {
          sessionStorage.setItem(`groovelab_parent_unlocked_${targetStudentId}`, 'true');
          sessionStorage.setItem('groovelab_parent_unlocked_global', 'true');
          window.dispatchEvent(new CustomEvent('groovelab_parent_mode_changed', { detail: true }));
        } catch (e) {}
      } else {
        setPinShake(true);
        setTimeout(() => setPinShake(false), 420);
        const nextCount = failedPinAttempts + 1;
        setFailedPinAttempts(nextCount);
        if (nextCount >= 5) {
          setPinCooldownSeconds(30);
          setPinError('Zu viele Fehlversuche. Bitte 30 Sekunden warten.');
        } else {
          setPinError(`Falsche PIN (${5 - nextCount} Versuche verbleibend).`);
        }
        setPinInput('');
      }
    } catch (err: any) {
      setPinError(err.message || 'Verbindung fehlgeschlagen.');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // Biometric Face ID / Touch ID Unlock (WebAuthn Passkey)
  const handleBiometricUnlock = async () => {
    if (isVerifyingPin || pinCooldownSeconds > 0) return;
    const targetStudentId = studentId || occurrence?.student_id || currentUserId;
    if (!targetStudentId) {
      setPinError('Kein Schülerprofil zugeordnet.');
      return;
    }

    setIsVerifyingPin(true);
    setPinError('');

    try {
      const { data: chalData, error: chalErr } = await supabase.rpc('generate_webauthn_challenge', {
        p_user_id: targetStudentId,
        p_type: 'login'
      });
      if (chalErr || !chalData?.challenge) {
        throw new Error('Sicherheits-Challenge nicht verfügbar.');
      }

      const challengeBuffer = new Uint8Array(
        chalData.challenge.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || []
      ).buffer;

      const rpId = getSanitizedRpId();
      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge: challengeBuffer,
          userVerification: 'required',
          timeout: 60000,
          ...(rpId ? { rpId } : {})
        }
      })) as PublicKeyCredential;

      if (!assertion) {
        throw new Error('Biometrie abgebrochen.');
      }

      const effectiveSchoolId = currentUserProfile?.school_id || 
        (Array.isArray(currentUserProfile?.schools) ? currentUserProfile?.schools[0]?.id : currentUserProfile?.schools?.id) || 
        occurrence?.school_id;

      const { data: authResult, error: authErr } = await supabase.rpc('authenticate_webauthn_credential', {
        p_credential_id: assertion.id,
        p_challenge: chalData.challenge,
        p_school_id: effectiveSchoolId || null
      });

      if (authErr || !authResult?.success) {
        throw new Error(authResult?.error || authErr?.message || 'Passkey nicht erkannt.');
      }

      setLocalParentUnlocked(true);
      setShowPinDialog(false);
      setPinInput('');
      setPinError('');
      setFailedPinAttempts(0);
      try {
        sessionStorage.setItem(`groovelab_parent_unlocked_${targetStudentId}`, 'true');
        sessionStorage.setItem('groovelab_parent_unlocked_global', 'true');
        window.dispatchEvent(new CustomEvent('groovelab_parent_mode_changed', { detail: true }));
      } catch (e) {}
    } catch (err: any) {
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        setPinError(err.message || 'FaceID/TouchID Entsperrung fehlgeschlagen.');
      }
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // Physical Keyboard Listener for In-Modal PIN Dialog (BFSG 2025 / WCAG 2.1.1)
  useEffect(() => {
    if (!showPinDialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowPinDialog(false);
        setPinInput('');
        setPinError('');
        return;
      }

      if (isVerifyingPin || pinCooldownSeconds > 0) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setPinError('');
        setPinInput(prev => {
          if (prev.length < 6) {
            const next = prev + e.key;
            if (next.length === 6) {
              handleVerifyParentPin(next);
            }
            return next;
          }
          return prev;
        });
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setPinError('');
        setPinInput(prev => prev.slice(0, -1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPinDialog, isVerifyingPin, pinCooldownSeconds]);

  // Handle Send Message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || chatTypedMessage).trim();
    if (!text || !studentId || !teacherId || isSending) return;

    if (currentUserRole === 'student' && !isChatAllowed && !effectiveIsParentUnlocked) {
      if (onRequestPinGate) {
        onRequestPinGate(async () => {
          setLocalParentUnlocked(true);
          await handleSendMessage(textToSend);
        });
      } else {
        setShowPinDialog(true);
      }
      return;
    }

    setIsSending(true);
    const recipientId = currentUserRole === 'student' ? teacherId : studentId;
    const occRefId = targetOccId || (targetScheduleId ? `virtual-${targetScheduleId}-${targetDate}` : null);

    // Optimistic message
    const isParentSender = Boolean(effectiveIsParentUnlocked);
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
      let data, error;
      if (isParentSender) {
        const leaseToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('gl_parent_session_lease') : null;
        if (!leaseToken) {
          throw new Error('Lease-Token abgelaufen oder nicht gefunden. Bitte PIN erneut eingeben.');
        }
        const res = await supabase.rpc('send_campus_message_as_parent', {
          p_recipient_id: recipientId,
          p_content: text,
          p_occurrence_id: occRefId,
          p_lease_token: leaseToken
        });
        if (res.error) throw res.error;
      } else {
        const res = await supabase.from('campus_direct_messages').insert({
          sender_id: currentUserId,
          recipient_id: recipientId,
          content: text,
          occurrence_id: occRefId,
          is_read: false,
          is_system: false,
          sender_role: currentUserRole === 'teacher' ? 'teacher' : 'student'
        }).select().single();
        data = res.data;
        error = res.error;
        if (error) throw error;
      }
      
      const effectiveSchoolId = currentUserProfile?.school_id || 
        (Array.isArray(currentUserProfile?.schools) ? currentUserProfile?.schools[0]?.id : currentUserProfile?.schools?.id) || 
        occurrence?.school_id;
      if (data?.content && typeof data.content === 'string' && data.content.startsWith('enc:')) {
        primeDecryptedCache(effectiveSchoolId, data.content, text);
      }
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
          ? `${studentDisplayName}${effectiveIsParentUnlocked ? ' (Eltern-PIN autorisiert)' : ''}`
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

    if (currentUserRole === 'student' && !isAbsenceAllowed && !effectiveIsParentUnlocked) {
      if (onRequestPinGate) {
        onRequestPinGate(executeCancelAction);
      } else {
        setShowPinDialog(true);
      }
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
          ? `${studentDisplayName}${effectiveIsParentUnlocked ? ' (Eltern-PIN autorisiert)' : ''}`
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

    if (currentUserRole === 'student' && !effectiveIsParentUnlocked) {
      if (onRequestPinGate) {
        onRequestPinGate(executeReactivateAction);
      } else {
        setShowPinDialog(true);
      }
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
        role="dialog"
        aria-modal="true"
        aria-label="Termin-Details & Chat"
        onClick={e => e.stopPropagation()}
        className="pwa-modal-drawer"
        style={{
          background: '#ffffff',
          borderRadius: isMobile ? 0 : '26px',
          width: '100%',
          maxWidth: isMobile ? '100%' : '680px',
          height: isMobile ? '100%' : 'auto',
          maxHeight: isMobile ? '100%' : 'min(820px, 88vh)',
          boxShadow: isMobile ? 'none' : '0 32px 84px -12px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.1)',
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

        {/* Header: Apple HIG Dual-Tier Full-Width Stage */}
        <div style={{ background: "linear-gradient(135deg, #15803d 0%, #166534 100%)", display: "flex", flexDirection: "column", color: "#ffffff", boxShadow: "0 4px 16px rgba(21, 128, 61, 0.16)", flexShrink: 0, width: "100%", boxSizing: "border-box" }}>
          {/* Tier 1: Identitäts- & Steuerungs-Ebene (100% Breite) */}
          <div style={{ padding: isMobile ? "calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 10px) 14px 8px 14px" : "14px 24px 10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", width: "100%", boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "9px" : "12px", minWidth: 0, flex: 1, overflow: "hidden" }}>
              <button type="button" onClick={onClose} aria-label="Zurück" style={{ background: "rgba(255, 255, 255, 0.2)", border: "none", borderRadius: "10px", cursor: "pointer", color: "#ffffff", width: "32px", height: "32px", minWidth: "32px", minHeight: "32px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, touchAction: "manipulation" }}>
                <ArrowLeft size={16} />
              </button>
              <CampusDynamicAvatar user={{ ...otherPartyUser, roles: [] }} size={isMobile ? 36 : 40} variant="on-dark" />
              <div style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: 0, overflow: "hidden" }}>
                <h4 style={{ margin: 0, fontSize: isMobile ? "0.98rem" : "1.10rem", fontWeight: 850, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {otherPartyDisplayName}
                </h4>
                <span style={{ fontSize: "0.62rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", background: "rgba(255, 255, 255, 0.22)", color: "#ffffff", border: "1px solid rgba(255, 255, 255, 0.35)", padding: "2px 6px", borderRadius: "6px", display: "inline-block", flexShrink: 0 }}>
                  {currentUserRole === "student" ? "Lehrer" : "Schüler"}
                </span>
              </div>
            </div>
          </div>

          {/* Tier 2: Termin-Bühne & Status-Ribbon (100% Volle Breite) */}
          <div style={{ width: "100%", boxSizing: "border-box", background: "rgba(0, 0, 0, 0.14)", borderTop: "1px solid rgba(255, 255, 255, 0.12)", padding: isMobile ? "6px 14px 7px 14px" : "7px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, overflow: "hidden", color: "rgba(255, 255, 255, 0.95)", fontSize: isMobile ? "0.74rem" : "0.80rem", fontWeight: 700, whiteSpace: "nowrap" }}>
              <Calendar size={isMobile ? 12 : 13} color="#ffffff" style={{ flexShrink: 0, opacity: 0.9 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {weekdayShort}, {formattedOccDateShort} • {timeLabel} Uhr{appointmentSubject ? ` • ${appointmentSubject}` : ""}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
              <span title="DSGVO-konform geschützt" style={{ fontSize: "0.64rem", fontWeight: 750, background: "rgba(255, 255, 255, 0.16)", border: "1px solid rgba(255, 255, 255, 0.28)", color: "#ffffff", padding: "2px 7px", borderRadius: "100px", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                <ShieldCheck size={11} color="#ffffff" />
                <span>DSGVO</span>
              </span>

              {isCanceled ? (
                <span style={{ fontSize: "0.66rem", fontWeight: 800, background: "rgba(239, 68, 68, 0.25)", border: "1px solid rgba(252, 165, 165, 0.45)", color: "#fecaca", padding: "2px 8px", borderRadius: "100px", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                  <X size={10} strokeWidth={3} /> <span>Entfällt</span>
                </span>
              ) : isRescheduled ? (
                <span style={{ fontSize: "0.66rem", fontWeight: 800, background: "rgba(245, 158, 11, 0.25)", border: "1px solid rgba(253, 230, 138, 0.45)", color: "#fef08a", padding: "2px 8px", borderRadius: "100px", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                  <RotateCcw size={9} strokeWidth={2.6} /> <span>Verlegt</span>
                </span>
              ) : (
                <span style={{ fontSize: "0.66rem", fontWeight: 800, background: "rgba(16, 185, 129, 0.22)", border: "1px solid rgba(16, 185, 129, 0.40)", color: "#a7f3d0", padding: "2px 8px", borderRadius: "100px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                  <span>Planmäßig</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Child Protection Banner (§ 8a SGB VIII) - Desktop Only */}
        {!isMobile && (
          <div style={{
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '9px 26px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.80rem',
            color: '#64748b',
            lineHeight: '1.4',
            flexShrink: 0
          }}>
            <ShieldCheck size={16} color="#15803d" style={{ flexShrink: 0 }} />
            <span>
              <strong style={{ color: '#0f172a' }}>Didaktischer Schul-Chat:</strong> Nur für Unterrichtszwecke • Für Erziehungsberechtigte transparent einsehbar.
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
          padding: isMobile ? '12px 14px' : '22px 28px',
          background: '#fafbfc',
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? '12px' : '16px',
          minHeight: isMobile ? '160px' : '280px',
          maxHeight: isMobile ? 'none' : '520px'
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
              <span>Didaktischer Schul-Chat: Nur für Unterrichtszwecke • Für Erziehungsberechtigte transparent einsehbar.</span>
            </div>
          )}
          {isFrozen && (
            <div style={{ background: '#fef2f2', border: '1px solid #fee2f2', color: '#991b1b', padding: '10px 14px', borderRadius: '12px', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', textAlign: 'center' }}>
              <Lock size={16} /> <span>Shoutbox eingefroren (Schreibschutz nach 48h aktiv)</span>
            </div>
          )}

          {reconciledMessages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: 'auto 0', padding: isMobile ? '16px 12px' : '26px 20px', gap: '12px', width: '100%', maxWidth: '380px', alignSelf: 'center' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '14px 18px', width: '100%', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '14px', boxSizing: 'border-box' }}>
                <div style={{ width: '44px', height: '46px', borderRadius: '12px', background: isCanceled ? '#fef2f2' : '#f0fdf4', border: isCanceled ? '1px solid #fecaca' : '1px solid #bbf7d0', color: isCanceled ? '#dc2626' : '#15803d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 850, textTransform: 'uppercase', lineHeight: 1 }}>{weekdayShort}</span>
                  <span style={{ fontSize: '1.08rem', fontWeight: 900, lineHeight: 1.15 }}>{formattedOccDate.split('.')[0]}</span>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{occurrence.instrument || occurrence.subject || 'Unterrichtstermin'}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 750, padding: '2px 7px', borderRadius: '100px', background: isCanceled ? '#fef2f2' : '#f0fdf4', color: isCanceled ? '#b91c1c' : '#15803d', flexShrink: 0 }}>{isCanceled ? 'Entfällt' : `${timeLabel} Uhr`}</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>{isCanceled ? 'Termin wurde storniert' : 'Geschützte Direktnachrichten für diesen Termin'}</div>
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 650, textAlign: 'center' }}>Tippe auf eine Schnellnachricht oder gib unten Text ein:</div>
            </div>
          ) : (
            reconciledMessages.map((msg, idx) => {
              const prevMsg = idx > 0 ? reconciledMessages[idx - 1] : null;
              const isMe = msg.sender_id === currentUserId;
              const senderUser = isMe
                ? (currentUserRole === 'student' ? studentObj : (teacherObj || fetchedTeacher))
                : (currentUserRole === 'student' ? (teacherObj || fetchedTeacher) : studentObj);

              const laterSysMsg = reconciledMessages.slice(idx + 1).find(m => isChatMessageSystem(m));
              const isSuperseded = Boolean(laterSysMsg);

              return (
                <CampusUnifiedChatMessage
                  key={msg.id || idx}
                  msg={msg}
                  prevMsg={prevMsg}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  senderUser={senderUser}
                  isMobile={isMobile}
                  currentOcc={occurrence}
                  isSuperseded={isSuperseded}
                />
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
          gap: isMobile ? '8px' : '10px',
          padding: isMobile
            ? '10px 14px calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 10px) 14px'
            : '12px 24px 16px 24px',
          flexShrink: 0
        }}>
          {/* Music Pedagogical Quick Reply Chips */}
          {!isFrozen && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '8px' : '10px',
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
                    padding: isMobile ? '7px 13px' : '9px 16px',
                    minHeight: isMobile ? '34px' : '40px',
                    borderRadius: '100px',
                    background: isLessonPast ? '#f1f5f9' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: isLessonPast ? '1.5px solid #cbd5e1' : 'none',
                    color: isLessonPast ? '#94a3b8' : '#ffffff',
                    fontSize: isMobile ? '0.80rem' : '0.88rem',
                    fontWeight: 850,
                    whiteSpace: 'nowrap',
                    cursor: isLessonPast ? 'not-allowed' : 'pointer',
                    opacity: isLessonPast ? 0.6 : 1,
                    boxShadow: isLessonPast ? 'none' : '0 2px 8px rgba(16, 185, 129, 0.28)',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  className={isLessonPast ? '' : 'hover-scale'}
                >
                  <RotateCcw size={isMobile ? 12 : 14} strokeWidth={2.6} />
                  <span>Termin reaktivieren</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isLessonPast || isActionLoading}
                  onClick={handleCancel}
                  style={{
                    padding: isMobile ? '7px 13px' : '9px 16px',
                    minHeight: isMobile ? '34px' : '40px',
                    borderRadius: '100px',
                    background: isLessonPast ? '#f1f5f9' : '#fff5f5',
                    border: isLessonPast ? '1.5px solid #cbd5e1' : '1.5px solid #fca5a5',
                    color: isLessonPast ? '#94a3b8' : '#dc2626',
                    fontSize: isMobile ? '0.80rem' : '0.88rem',
                    fontWeight: 850,
                    whiteSpace: 'nowrap',
                    cursor: isLessonPast ? 'not-allowed' : 'pointer',
                    opacity: isLessonPast ? 0.6 : 1,
                    boxShadow: isLessonPast ? 'none' : '0 1px 3px rgba(220, 38, 38, 0.10)',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  className={isLessonPast ? '' : 'hover-scale'}
                >
                  {currentUserRole === 'student' && !isAbsenceAllowed && !effectiveIsParentUnlocked ? (
                    <Lock size={isMobile ? 12 : 14} strokeWidth={2.4} color="#dc2626" />
                  ) : (
                    <X size={isMobile ? 12 : 14} strokeWidth={2.6} />
                  )}
                  <span>Termin absagen{currentUserRole === 'student' && !isAbsenceAllowed && !effectiveIsParentUnlocked ? ' (Eltern-PIN)' : ''}</span>
                </button>
              )}

              {!(currentUserRole === 'student' && !isChatAllowed && !effectiveIsParentUnlocked) && phrases.map((phrase, pIdx) => {
                const IconComp = phrase.icon;
                return (
                  <button
                    key={`phrase-${pIdx}`}
                    type="button"
                    onClick={() => setChatTypedMessage(phrase.text)}
                    style={{
                      padding: isMobile ? '7px 13px' : '9px 16px',
                      minHeight: isMobile ? '34px' : '40px',
                      borderRadius: '100px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      color: '#334155',
                      fontSize: isMobile ? '0.80rem' : '0.88rem',
                      fontWeight: 750,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
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
                    <IconComp size={isMobile ? 12 : 14} color="#15803d" strokeWidth={2.4} />
                    <span>{phrase.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Input Row - Full Width Text Field or Protected Notice */}
          {currentUserRole === 'student' && !isChatAllowed && !effectiveIsParentUnlocked ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: isMobile ? '6px 6px 6px 14px' : '8px 8px 8px 16px',
              borderRadius: '100px',
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              width: '100%',
              minHeight: isMobile ? '44px' : '48px',
              boxSizing: 'border-box',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: isMobile ? '0.78rem' : '0.86rem', fontWeight: 700, minWidth: 0, overflow: 'hidden' }}>
                <Lock size={15} color="#64748b" style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Antworten durch Eltern geschützt (Lesen frei)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPinError('');
                  setPinInput('');
                  setShowPinDialog(true);
                  if (onRequestPinGate) {
                    onRequestPinGate(async () => setLocalParentUnlocked(true));
                  }
                }}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '100px',
                  padding: isMobile ? '6px 13px' : '8px 16px',
                  fontSize: isMobile ? '0.74rem' : '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.22)',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  flexShrink: 0
                }}
              >
                <ShieldCheck size={14} color="#ffffff" strokeWidth={2.4} />
                <span>Mit PIN freischalten</span>
              </button>
            </div>
          ) : (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Sender Role Status & Opt-In Bar for Students & Parents */}
              {currentUserRole === 'student' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '2px 4px'
                }}>
                  {effectiveIsParentUnlocked ? (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      color: '#1d4ed8',
                      fontSize: isMobile ? '0.78rem' : '0.84rem',
                      fontWeight: 800,
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      padding: '4px 12px',
                      borderRadius: '100px'
                    }}>
                      <ShieldCheck size={14} color="#1d4ed8" strokeWidth={2.5} />
                      <span>Antwort wird als Erziehungsberechtigte/r signiert</span>
                    </div>
                  ) : (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: '#64748b',
                      fontSize: isMobile ? '0.74rem' : '0.80rem',
                      fontWeight: 750
                    }}>
                      <User size={13} color="#94a3b8" />
                      <span>Antwort als Schüler:in</span>
                    </div>
                  )}

                  {effectiveIsParentUnlocked ? (
                    <button
                      type="button"
                      onClick={() => setLocalParentUnlocked(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: isMobile ? '0.72rem' : '0.78rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: '4px 8px'
                      }}
                      title="Zum Schüler-Modus wechseln"
                    >
                      Als Schüler:in wechseln
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPinError('');
                        setPinInput('');
                        setShowPinDialog(true);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: isMobile ? '5px 11px' : '6px 14px',
                        minHeight: isMobile ? '34px' : '36px',
                        borderRadius: '100px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#1d4ed8',
                        fontSize: isMobile ? '0.74rem' : '0.80rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#eff6ff';
                        e.currentTarget.style.borderColor = '#93c5fd';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }}
                      title="Mit Eltern-PIN freischalten, um die Nachricht als Elternteil zu signieren"
                    >
                      <ShieldCheck size={14} color="#1d4ed8" strokeWidth={2.4} />
                      <span>Als Elternteil antworten (PIN)</span>
                    </button>
                  )}
                </div>
              )}

              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? '10px' : '12px',
                  width: '100%'
                }}
              >
                <input
                  type="text"
                  placeholder={
                    isFrozen
                      ? 'Shoutbox ist schreibgeschützt...'
                      : (effectiveIsParentUnlocked
                          ? 'Nachricht als Erziehungsberechtigte/r schreiben...'
                          : 'Nachricht schreiben...')
                  }
                  disabled={isFrozen || isSending}
                  value={chatTypedMessage}
                  onChange={e => setChatTypedMessage(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: isMobile ? '11px 18px' : '13px 22px',
                    minHeight: isMobile ? '44px' : '50px',
                    borderRadius: '100px',
                    border: effectiveIsParentUnlocked ? '1.5px solid #93c5fd' : '1.5px solid #e2e8f0',
                    background: isFrozen ? '#f1f5f9' : (effectiveIsParentUnlocked ? '#fbfdff' : '#ffffff'),
                    fontSize: isMobile ? '0.90rem' : '1.02rem',
                    fontWeight: 550,
                    outline: 'none',
                    color: '#0f172a',
                    boxShadow: effectiveIsParentUnlocked ? '0 0 0 1px #bfdbfe' : '0 1px 3px rgba(0,0,0,0.02)',
                    transition: 'border-color 0.15s, box-shadow 0.15s'
                  }}
                  onFocus={e => {
                    if (!isFrozen) {
                      e.target.style.borderColor = effectiveIsParentUnlocked ? '#2563eb' : '#15803d';
                      e.target.style.boxShadow = effectiveIsParentUnlocked ? '0 0 0 3px rgba(37, 99, 235, 0.18)' : '0 0 0 3px rgba(21, 128, 61, 0.15)';
                    }
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = effectiveIsParentUnlocked ? '#93c5fd' : '#e2e8f0';
                    e.target.style.boxShadow = effectiveIsParentUnlocked ? '0 0 0 1px #bfdbfe' : '0 1px 3px rgba(0,0,0,0.02)';
                  }}
                />

                {/* Send Message Button */}
                <button
                  type="submit"
                  disabled={isFrozen || isSending || !chatTypedMessage.trim()}
                  aria-label="Nachricht senden"
                  style={{
                    background: isFrozen || !chatTypedMessage.trim() ? '#f1f5f9' : (effectiveIsParentUnlocked ? '#2563eb' : '#15803d'),
                    color: isFrozen || !chatTypedMessage.trim() ? '#94a3b8' : '#ffffff',
                    border: 'none',
                    borderRadius: '50%',
                    width: isMobile ? '42px' : '50px',
                    height: isMobile ? '42px' : '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isFrozen || !chatTypedMessage.trim() ? 'not-allowed' : 'pointer',
                    boxShadow: isFrozen || !chatTypedMessage.trim() ? 'none' : (effectiveIsParentUnlocked ? '0 2px 8px rgba(37, 99, 235, 0.28)' : '0 2px 8px rgba(21, 128, 61, 0.25)'),
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}
                  onMouseEnter={e => {
                    if (!isFrozen && chatTypedMessage.trim()) {
                      e.currentTarget.style.background = effectiveIsParentUnlocked ? '#1d4ed8' : '#166534';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isFrozen && chatTypedMessage.trim()) {
                      e.currentTarget.style.background = effectiveIsParentUnlocked ? '#2563eb' : '#15803d';
                    }
                  }}
                >
                  <Send size={isMobile ? 18 : 22} strokeWidth={2.4} />
                </button>
              </form>
            </div>
          )}

          {/* Discreet 1-Line Legal Whisper Notice */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            textAlign: 'center',
            fontSize: isMobile ? '0.64rem' : '0.74rem',
            color: '#64748b',
            lineHeight: 1.3
          }}>
            <Lock size={isMobile ? 11 : 12} color="#64748b" style={{ flexShrink: 0 }} />
            <span>Elektronischer Bote • Bitte keine Diagnosen oder Gesundheitsdaten senden • 60-Tage-Auto-Purge</span>
          </div>
        </div>
        {/* IN-MODAL PARENT PIN VERIFICATION DIALOG (0,1% GOLDSTANDARD APPLE NUMPAD) */}
        {showPinDialog && (
          <div
            onClick={() => {
              setShowPinDialog(false);
              setPinInput('');
              setPinError('');
            }}
            role="presentation"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '20px',
              animation: 'fadeIn 0.15s ease'
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Eltern-Autorisierung"
              onClick={e => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: '28px',
                padding: '26px 22px 20px 22px',
                maxWidth: '340px',
                width: '100%',
                boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                position: 'relative'
              }}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setShowPinDialog(false);
                  setPinInput('');
                  setPinError('');
                }}
                disabled={isVerifyingPin}
                aria-label="Abbrechen"
                style={{
                  position: 'absolute',
                  top: '14px',
                  right: '14px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>

              {/* Icon Squircle */}
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '16px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
                marginBottom: '10px'
              }}>
                <ShieldCheck size={26} strokeWidth={2.4} />
              </div>

              <h4 style={{
                margin: '0 0 4px 0',
                fontSize: '1.18rem',
                fontWeight: 900,
                color: '#0f172a',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}>
                Eltern-Autorisierung
              </h4>

              <p style={{
                margin: '0 0 14px 0',
                fontSize: '0.82rem',
                color: '#64748b',
                lineHeight: 1.45
              }}>
                Gib deine 6-stellige Eltern-Master-PIN ein, um deine Antwort als Erziehungsberechtigte/r zu signieren.
              </p>

              {/* Error Message */}
              {pinError && (
                <div 
                  role="alert"
                  aria-live="assertive"
                  style={{
                    color: '#dc2626',
                    fontSize: '0.80rem',
                    fontWeight: 750,
                    marginBottom: '10px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  {pinError}
                </div>
              )}

              {/* Cooldown Warning */}
              {pinCooldownSeconds > 0 && (
                <div style={{
                  color: '#ea580c',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  marginBottom: '10px'
                }}>
                  Sicherheits-Sperre: Noch {pinCooldownSeconds} Sekunden
                </div>
              )}

              {/* Haptische Apple PIN-Dots (6-stellig) mit Shake-Animation */}
              <div style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'center',
                alignItems: 'center',
                margin: '2px 0 14px 0',
                animation: pinShake ? 'pinModalShake 0.35s ease' : 'none'
              }}>
                {[0, 1, 2, 3, 4, 5].map(idx => {
                  const isFilled = pinInput.length > idx;
                  return (
                    <div
                      key={`pin-dot-${idx}`}
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: isFilled ? '#2563eb' : '#f1f5f9',
                        border: isFilled ? '2px solid #2563eb' : '2px solid #cbd5e1',
                        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: isFilled ? 'scale(1.15)' : 'scale(1)',
                        boxShadow: isFilled ? '0 0 10px rgba(37, 99, 235, 0.35)' : 'none'
                      }}
                    />
                  );
                })}
              </div>

              {/* Touch Numpad (3x4 Grid) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                width: '100%',
                maxWidth: '280px',
                marginTop: '2px'
              }}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(key => {
                  const isClear = key === 'C';
                  const isBack = key === '⌫';
                  return (
                    <button
                      key={`keypad-${key}`}
                      type="button"
                      disabled={isVerifyingPin || pinCooldownSeconds > 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isVerifyingPin || pinCooldownSeconds > 0) return;
                        setPinError('');
                        if (isClear) {
                          setPinInput('');
                        } else if (isBack) {
                          setPinInput(prev => prev.slice(0, -1));
                        } else {
                          setPinInput(prev => {
                            if (prev.length < 6) {
                              const next = prev + key;
                              if (next.length === 6) {
                                handleVerifyParentPin(next);
                              }
                              return next;
                            }
                            return prev;
                          });
                        }
                      }}
                      style={{
                        padding: '12px',
                        minHeight: '48px',
                        borderRadius: '16px',
                        border: '1.5px solid #f1f5f9',
                        background: isClear || isBack ? '#f8fafc' : '#ffffff',
                        color: isClear ? '#ef4444' : isBack ? '#64748b' : '#0f172a',
                        fontSize: isBack ? '1.15rem' : '1.25rem',
                        fontWeight: 800,
                        cursor: isVerifyingPin || pinCooldownSeconds > 0 ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                        transition: 'all 0.12s ease',
                        touchAction: 'manipulation',
                        userSelect: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      className="hover-scale"
                    >
                      {key}
                    </button>
                  );
                })}
              </div>

              {/* Status Indicator during verification */}
              {isVerifyingPin && (
                <div style={{
                  marginTop: '10px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#2563eb',
                    animation: 'pulse 1s infinite'
                  }} />
                  <span>PIN wird geprüft...</span>
                </div>
              )}

              {/* Biometric Passkey Unlock (Face ID / Touch ID) */}
              {isWebAuthnSupported() && (
                <button
                  type="button"
                  disabled={isVerifyingPin || pinCooldownSeconds > 0}
                  onClick={handleBiometricUnlock}
                  style={{
                    marginTop: '10px',
                    width: '100%',
                    maxWidth: '280px',
                    padding: '10px 14px',
                    minHeight: '44px',
                    borderRadius: '14px',
                    border: '1px solid #bfdbfe',
                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    color: '#1d4ed8',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: isVerifyingPin || pinCooldownSeconds > 0 ? 'not-allowed' : 'pointer',
                    opacity: isVerifyingPin ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.08)',
                    transition: 'all 0.15s ease',
                    touchAction: 'manipulation'
                  }}
                  className="hover-scale"
                >
                  <Fingerprint size={18} />
                  <span>Mit Face ID / Touch ID entsperren</span>
                </button>
              )}

              {/* Abbrechen Button */}
              <button
                type="button"
                onClick={() => {
                  setShowPinDialog(false);
                  setPinInput('');
                  setPinError('');
                }}
                disabled={isVerifyingPin}
                style={{
                  marginTop: '8px',
                  padding: '8px 16px',
                  borderRadius: '100px',
                  background: 'transparent',
                  color: '#64748b',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                className="hover-opacity"
              >
                Abbrechen
              </button>

              {/* Embedded CSS Shake Animation */}
              <style>{`
                @keyframes pinModalShake {
                  0%, 100% { transform: translateX(0); }
                  20%, 60% { transform: translateX(-8px); }
                  40%, 80% { transform: translateX(8px); }
                }
              `}</style>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return portalTarget ? createPortal(content, portalTarget) : content;
};

export default CampusAppointmentShoutboxModal;
