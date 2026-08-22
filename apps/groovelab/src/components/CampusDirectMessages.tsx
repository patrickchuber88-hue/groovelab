import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Send, 
  Search, 
  MessageSquare, 
  User, 
  ArrowLeft, 
  Check, 
  Clock, 
  Inbox,
  Plus,
  X,
  Calendar,
  ShieldCheck,
  Lock,
  Sparkles,
  CheckCheck
} from 'lucide-react';
import { formatTeacherFullName, formatSingleStudentAnonymized } from '../utils/nameHelper';

const getInstrumentAvatarUrl = (instrument: string | null | undefined): string => {
  if (!instrument) return '/avatars/gitarre_avatar_new.png';
  const inst = instrument.toLowerCase();
  if (inst.includes('e-gitarre')) return '/avatars/egitarre_avatar.png';
  if (inst.includes('guitar') || inst.includes('gitarre')) return '/avatars/gitarre_avatar_new.png';
  if (inst.includes('e-bass')) return '/avatars/ebass_avatar.png';
  if (inst.includes('kontrabass') || inst.includes('double bass')) return '/avatars/kontrabass_avatar.png';
  if (inst.includes('bass')) return '/avatars/bass_avatar.png';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return '/avatars/schlagzeug_avatar.png';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return '/avatars/klavier_avatar_new.png';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return '/avatars/gesang_avatar.png';
  if (inst.includes('trompete') || inst.includes('trumpet')) return '/avatars/trompete_avatar_new.png';
  if (inst.includes('posaune') || inst.includes('trombone')) return '/avatars/posaune_avatar.png';
  if (inst.includes('horn')) return '/avatars/horn_avatar_new.png';
  if (inst.includes('cello')) return '/avatars/cello_avatar_new.png';
  if (inst.includes('geige') || inst.includes('violin') || inst.includes('violine')) return '/avatars/violine_avatar_new.png';
  if (inst.includes('klarinette') || inst.includes('clarinet')) return '/avatars/klarinette_avatar_new.png';
  if (inst.includes('querflöte') || inst.includes('flute')) return '/avatars/querfloete.png';
  if (inst.includes('saxofon') || inst.includes('saxophone') || inst.includes('sax')) return '/avatars/saxophon_avatar.png';
  if (inst.includes('blockflöte') || inst.includes('recorder') || inst.includes('blockfloete')) return '/avatars/blockfloete_avatar.png';
  if (inst.includes('bariton') || inst.includes('baritone')) return '/avatars/bariton_avatar.png';
  if (inst.includes('oboe')) return '/avatars/oboe_avatar.png';
  return '/avatars/gitarre_avatar_new.png';
};

const resolveCampusAvatar = (u: any): string => {
  if (!u) return '/avatar_ghost.jpg';
  const role = (u.role || '').toLowerCase();
  const roles = Array.isArray(u.roles) ? u.roles.map((r: any) => String(r).toLowerCase()) : [];
  
  // Teachers in Campus module must ALWAYS display their instrument avatar (per AGENTS.md)!
  const isTeacher = role === 'teacher' || roles.includes('teacher');
  if (isTeacher) {
    return getInstrumentAvatarUrl(u.instrument || 'Gitarre');
  }

  if (role === 'admin' || role === 'secretary' || roles.includes('admin') || roles.includes('secretary')) {
    return '/campus_login_hero.png';
  }
  
  if (role === 'student') {
    const studentInstrument = u.instrument || 'Nicht festgelegt';
    return getInstrumentAvatarUrl(studentInstrument);
  }
  return getInstrumentAvatarUrl(u.instrument || 'Gitarre');
};

const formatStudentDisplayName = (u: any): string => {
  if (!u) return '';
  const role = (u.role || '').toLowerCase();
  const roles = Array.isArray(u.roles) ? u.roles.map((r: any) => String(r).toLowerCase()) : [];
  const isTeacherRole = role === 'teacher' || roles.includes('teacher');

  if (isTeacherRole) {
    return formatTeacherFullName(u);
  }

  const isAdminRole = role === 'admin' || role === 'secretary' || roles.includes('admin') || roles.includes('secretary');
  if (isAdminRole) {
    const fn = (u.first_name || '').trim();
    const ln = (u.full_last_name || u.last_name || '').trim();
    return `${fn} ${ln}`.trim() || 'Schulverwaltung';
  }

  // Only abbreviate last name for STUDENTS (per AGENTS.md rule)
  if (role === 'student' || role === 'pupil') {
    return formatSingleStudentAnonymized(u.first_name, u.full_last_name || u.last_name, u.id);
  }

  if (u.first_name && (u.full_last_name || u.last_name)) {
    return `${u.first_name} ${u.full_last_name || u.last_name}`.trim();
  }
  return u.first_name || u.name || 'Benutzer';
};

const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(dateStr);
};

const AppleSystemNotificationCard: React.FC<{ 
  msg: any; 
  selectedRecipient?: any;
  onSendMessage?: (recipientId: string, content: string) => Promise<void>;
}> = ({ msg, selectedRecipient, onSendMessage }) => {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDoneStatus, setActionDoneStatus] = useState<'confirmed' | 'rejected' | null>(null);

  const content: string = msg.content || '';
  const dateStr = new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + 
    ', ' + new Date(msg.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

  let title = 'Stundenplan-Update';
  let badgeText = 'Systemnachricht';
  let isPending = false;
  let isShift = false;
  let oldTime = '';
  let newTime = '';
  let note = '';

  const arrowIndex = content.indexOf('->');
  if (arrowIndex !== -1) {
    title = 'Terminverschiebung angefragt';
    badgeText = 'Bestätigung ausstehend';
    isPending = true;
    isShift = true;

    const leftRaw = content.substring(0, arrowIndex)
      .replace(/Dein Termin wurde verschoben:/i, '')
      .replace(/verschoben von:/i, '')
      .trim();
    const rightRaw = content.substring(arrowIndex + 2).trim();

    const uhrIndex = rightRaw.toLowerCase().indexOf('uhr');
    if (uhrIndex !== -1) {
      newTime = rightRaw.substring(0, uhrIndex + 3).trim();
      note = rightRaw.substring(uhrIndex + 3).replace(/^[.\s]+/, '').trim();
    } else {
      newTime = rightRaw;
    }
    oldTime = leftRaw;
  } else if (content.includes('zurückgesetzt')) {
    title = 'Regulärer Termin wiederhergestellt';
    badgeText = 'Termin zurückgesetzt';
    note = content.replace(/Der verschobene oder abgesagte Termin wurde auf den regulären Termin zurückgesetzt:/i, '').trim();
  } else if (content.includes('abgelehnt')) {
    title = 'Verschiebung abgelehnt';
    badgeText = 'Abgelehnt';
    note = content.replace(/❌/g, '').trim();
  } else if (content.includes('storniert') || content.includes('abgesagt')) {
    title = 'Termin abgesagt';
    badgeText = 'Abgesagt';
    note = content;
  } else if (content.includes('bestätigt')) {
    title = 'Termin bestätigt';
    badgeText = 'Bestätigt';
    note = content;
  } else {
    note = content;
  }

  // Override status if action was taken in this card
  if (actionDoneStatus === 'confirmed') {
    badgeText = 'Bestätigt';
    isPending = false;
  } else if (actionDoneStatus === 'rejected') {
    badgeText = 'Abgelehnt';
    isPending = false;
  }

  // Unified, Understated Apple Palette (Schlicht & Glassmorphism)
  let badgeBg = '#f1f5f9';
  let badgeColor = '#475569';
  let badgeBorder = '#e2e8f0';

  if (isPending) {
    // Soft Amber (Pending)
    badgeBg = '#fffbe6';
    badgeColor = '#b45309';
    badgeBorder = '#fde68a';
  } else if (badgeText === 'Bestätigt') {
    // Soft Muted Green (Confirmed)
    badgeBg = '#e6f4ea';
    badgeColor = '#15803d';
    badgeBorder = '#bbf7d0';
  } else if (badgeText === 'Termin zurückgesetzt') {
    // Soft Slate Gray (Reset - Not bright blue!)
    badgeBg = '#f1f5f9';
    badgeColor = '#475569';
    badgeBorder = '#e2e8f0';
  } else if (badgeText === 'Abgelehnt' || badgeText === 'Abgesagt') {
    // Soft Muted Rose (Rejected)
    badgeBg = '#fef2f2';
    badgeColor = '#991b1b';
    badgeBorder = '#fecaca';
  }

  const handleConfirm = async () => {
    try {
      setActionLoading(true);
      if (msg.occurrence_id) {
        await supabase
          .from('schedule_occurrences')
          .update({ status: 'confirmed', student_acknowledged: true })
          .eq('id', msg.occurrence_id);
      }
      if (selectedRecipient && onSendMessage) {
        const text = newTime ? `Unterrichtstermin bestätigt: ${newTime}` : 'Unterrichtstermin bestätigt.';
        await onSendMessage(selectedRecipient.id, text);
      }
      setActionDoneStatus('confirmed');
    } catch (err) {
      console.error('Error confirming shift:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setActionLoading(true);
      if (msg.occurrence_id) {
        await supabase
          .from('schedule_occurrences')
          .update({ status: 'cancelled' })
          .eq('id', msg.occurrence_id);
      }
      if (selectedRecipient && onSendMessage) {
        const text = oldTime ? `Verschiebung abgelehnt. Belasse Termin bei: ${oldTime}` : 'Verschiebung abgelehnt.';
        await onSendMessage(selectedRecipient.id, text);
      }
      setActionDoneStatus('rejected');
    } catch (err) {
      console.error('Error rejecting shift:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '4px 0' }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '14px 18px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        border: '1px solid #f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxSizing: 'border-box'
      }}>
        {/* Top bar: Calm Timestamp & Icon */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
            {title}
          </span>
          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={11} color="#94a3b8" />
            <span>{dateStr}</span>
          </div>
        </div>

        {/* Time Transition Box */}
        {isShift && oldTime && newTime ? (
          <div style={{
            background: '#f8fafc',
            border: '1px solid #f1f5f9',
            borderRadius: '10px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            margin: '2px 0'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Bisher</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>{oldTime}</span>
            </div>

            <div style={{
              color: '#34a853',
              fontWeight: 800,
              fontSize: '0.85rem',
              flexShrink: 0
            }}>
              ➔
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>Neu</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#15803d' }}>{newTime}</span>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500, margin: 0, lineHeight: 1.4 }}>
            {note}
          </p>
        )}

        {/* Status Line */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '6px',
            background: badgeBg,
            color: badgeColor,
            border: `1px solid ${badgeBorder}`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {badgeColor === '#991b1b' ? <X size={11} /> : badgeColor === '#b45309' ? <Clock size={11} /> : <Check size={11} />}
            <span>{badgeText}</span>
          </span>

          {note && isShift && (
            <span style={{ fontSize: '0.70rem', fontWeight: 500, color: '#94a3b8' }}>
              {note}
            </span>
          )}
        </div>

        {/* Interactive Apple Action Buttons (If Confirmation Pending) */}
        {isPending && (
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            marginTop: '2px', 
            paddingTop: '8px', 
            borderTop: '1px solid #f8fafc' 
          }}>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleConfirm}
              style={{
                flex: 1,
                padding: '8px 14px',
                borderRadius: '100px',
                border: 'none',
                background: '#34a853',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                boxShadow: '0 2px 6px rgba(52, 168, 83, 0.15)'
              }}
              className="hover-scale"
            >
              <Check size={12} color="#ffffff" />
              <span>{actionLoading ? 'Bestätige...' : 'Bestätigen'}</span>
            </button>

            <button
              type="button"
              disabled={actionLoading}
              onClick={handleReject}
              style={{
                flex: 1,
                padding: '8px 14px',
                borderRadius: '100px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#64748b',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px'
              }}
              className="hover-scale"
            >
              <X size={12} color="#64748b" />
              <span>{actionLoading ? 'Lehne ab...' : 'Ablehnen'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface CampusDirectMessagesProps {
  user: any;
  schoolUsers: any[];
  campusMessages: any[];
  onSendMessage: (recipientId: string, content: string) => Promise<void>;
  onMarkAsRead: (senderId: string) => Promise<void>;
  selectedRecipient: any;
  setSelectedRecipient: (recipient: any) => void;
  studentToTeacherChat?: boolean;
  onNavigateToSchedule?: (dateStr?: string) => void;
}

export default function CampusDirectMessages({
  user,
  schoolUsers,
  campusMessages,
  onSendMessage,
  onMarkAsRead,
  selectedRecipient,
  setSelectedRecipient,
  studentToTeacherChat = true,
  onNavigateToSchedule
}: CampusDirectMessagesProps) {
  console.log('[CampusDirectMessages Debug]', {
    user,
    schoolUsersLength: schoolUsers?.length,
    schoolUsersSample: schoolUsers?.[0],
    isStudent: user?.role?.toLowerCase() === 'student'
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [typedMessage, setTypedMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');
  const [activeSubTab, setActiveSubTab] = useState<string>('general');
  const [assignedStudents, setAssignedStudents] = useState<any[]>([]);
  const checkIsMobile = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || Boolean(document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait'));
  };

  const [isMobile, setIsMobile] = useState(checkIsMobile);

  const isTeacherOrStaff = 
    user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'secretary' ||
    (typeof window !== 'undefined' && ['teacher', 'admin', 'secretary'].includes((sessionStorage.getItem('groovelab_user_role') || localStorage.getItem('groovelab_user_role') || '').toLowerCase()));

  const isStudent = !isTeacherOrStaff && (user?.role?.toLowerCase() === 'student' || (typeof window !== 'undefined' && sessionStorage.getItem('groovelab_user_role') === 'student'));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobile(checkIsMobile());
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('groovelab_orientation_changed', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('groovelab_orientation_changed', handleResize);
    };
  }, []);

  // Parent Protection & PIN Gate States
  const [showParentPinModal, setShowParentPinModal] = useState(false);
  const [parentPinInput, setParentPinInput] = useState('');
  const [parentPinError, setParentPinError] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [, setForceUpdateTick] = useState(0);

  const handleVerifyParentPin = async (inputPin: string) => {
    if (!inputPin || inputPin.length < 4) {
      setParentPinError('Bitte gib die 6-stellige Eltern-Master-PIN ein.');
      return;
    }
    setIsVerifyingPin(true);
    setParentPinError('');
    try {
      const cleanInput = inputPin.trim();
      let isMatch = false;

      const cachedParentPin = localStorage.getItem(`groovelab_parent_pin_${user?.id}`);
      const cachedUserPin = localStorage.getItem(`groovelab_user_pin_${user?.id}`);
      const cachedStudentPin = localStorage.getItem(`groovelab_student_pin_${user?.id}`);
      if ((cachedParentPin && cachedParentPin === cleanInput) ||
          (cachedUserPin && cachedUserPin === cleanInput) ||
          (cachedStudentPin && cachedStudentPin === cleanInput)) {
        isMatch = true;
      }

      if (!isMatch && user) {
        if (user.parent_pin && String(user.parent_pin).trim() === cleanInput) {
          isMatch = true;
        } else if (user.personal_pin && String(user.personal_pin).trim() === cleanInput) {
          isMatch = true;
        }
      }

      if (!isMatch && user?.id) {
        try {
          const { data: parentOk } = await supabase.rpc('verify_parent_pin', {
            student_id: user.id,
            input_pin: cleanInput
          });
          if (parentOk === true) isMatch = true;
        } catch (e) {}
      }

      if (!isMatch && user?.id) {
        try {
          const { data: personalOk } = await supabase.rpc('verify_personal_pin', {
            user_uuid: user.id,
            input_pin: cleanInput
          });
          if (personalOk === true) isMatch = true;
        } catch (e) {}
      }

      if (!isMatch && user?.id) {
        const { data: uData } = await supabase
          .from('users')
          .select('parent_pin, personal_pin, onboarding_pin')
          .eq('id', user.id)
          .maybeSingle();
        if (uData) {
          if (String(uData.parent_pin || '').trim() === cleanInput || 
              String(uData.personal_pin || '').trim() === cleanInput ||
              String(uData.onboarding_pin || '').trim() === cleanInput) {
            isMatch = true;
          }
        }
      }

      if (isMatch) {
        sessionStorage.setItem('groovelab_parent_unlocked_global', 'true');
        sessionStorage.setItem(`groovelab_parent_session_${user?.id}`, String(Date.now() + 60 * 60 * 1000));
        setShowParentPinModal(false);
        setParentPinInput('');
        setForceUpdateTick(prev => prev + 1);
      } else {
        setParentPinError('Falsche Master-PIN. Bitte versuche es erneut.');
        setParentPinInput('');
      }
    } catch (err: any) {
      setParentPinError('Fehler bei der PIN-Prüfung: ' + (err?.message || 'Unbekannt'));
    } finally {
      setIsVerifyingPin(false);
    }
  };


  useEffect(() => {
    if (isStudent) {
      const fetchStudentTeachers = async () => {
        try {
          const studentId = user?.id || (typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_user_id') || localStorage.getItem('groovelab_user_id')) : null);
          if (!studentId) return;

          const teacherMap = new Map<string, any>();

          // 1. Direct teacher_id on student profile
          const directTeacherId = user?.teacher_id;
          if (directTeacherId) {
            const { data: directTeacher } = await supabase
              .from('users')
              .select('*')
              .eq('id', directTeacherId)
              .maybeSingle();
            if (directTeacher) {
              teacherMap.set(directTeacher.id, directTeacher);
            }
          }

          // 2. Teachers from schedules
          try {
            const { data: scheds } = await supabase
              .from('schedules')
              .select('teacher_id, teacher:users!schedules_teacher_id_fkey(*)')
              .eq('student_id', studentId);
            (scheds || []).forEach((sc: any) => {
              if (sc.teacher && sc.teacher.id) {
                teacherMap.set(sc.teacher.id, sc.teacher);
              } else if (sc.teacher_id && !teacherMap.has(sc.teacher_id)) {
                const matchInSchool = (schoolUsers || []).find((su: any) => su.id === sc.teacher_id);
                if (matchInSchool) teacherMap.set(sc.teacher_id, matchInSchool);
              }
            });
          } catch (e) {}

          // 3. Teachers from schedule_occurrences
          try {
            const { data: occs } = await supabase
              .from('schedule_occurrences')
              .select('teacher_id, teacher:users!schedule_occurrences_teacher_id_fkey(*)')
              .eq('student_id', studentId);
            (occs || []).forEach((o: any) => {
              if (o.teacher && o.teacher.id) {
                teacherMap.set(o.teacher.id, o.teacher);
              } else if (o.teacher_id && !teacherMap.has(o.teacher_id)) {
                const matchInSchool = (schoolUsers || []).find((su: any) => su.id === o.teacher_id);
                if (matchInSchool) teacherMap.set(o.teacher_id, matchInSchool);
              }
            });
          } catch (e) {}

          // 4. Teachers with existing 1:1 messages
          if (campusMessages && campusMessages.length > 0) {
            campusMessages.forEach((m: any) => {
              const partnerId = m.sender_id === studentId ? m.recipient_id : m.sender_id;
              if (partnerId && partnerId !== studentId && !teacherMap.has(partnerId)) {
                const existingInSchool = (schoolUsers || []).find((su: any) => su.id === partnerId);
                if (existingInSchool && (existingInSchool.role === 'teacher' || (Array.isArray(existingInSchool.roles) && existingInSchool.roles.includes('teacher')))) {
                  teacherMap.set(partnerId, existingInSchool);
                }
              }
            });
          }

          const result = Array.from(teacherMap.values());
          console.log('[CampusDirectMessages] Teachers for student:', studentId, 'Count:', result.length);
          setAssignedStudents(result);
        } catch (err) {
          console.error('[CampusDirectMessages] Error fetching student teachers:', err);
        }
      };

      fetchStudentTeachers();
      const timer = setTimeout(fetchStudentTeachers, 800);
      return () => clearTimeout(timer);
    }

    const fetchAssignedStudents = async () => {
      try {
        const teacherId = user?.id || (typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_user_id') || localStorage.getItem('groovelab_user_id')) : null);
        if (!teacherId) return;

        const userRole = (user?.role || '').toLowerCase();
        const isAdminOrSecretary = userRole === 'admin' || userRole === 'secretary';
        const studentMap = new Map<string, any>();

        if (isAdminOrSecretary) {
          // Admins & Secretariats see all students in their school
          let targetSchoolId = user?.school_id || user?.schoolId || (Array.isArray(user?.schools) ? user.schools[0]?.id : user?.schools?.id);
          if (!targetSchoolId && typeof window !== 'undefined') {
            targetSchoolId = sessionStorage.getItem('groovelab_school_id') || localStorage.getItem('groovelab_school_id');
          }

          let query = supabase.from('users').select('*').eq('role', 'student').order('first_name');
          if (targetSchoolId) {
            query = query.eq('school_id', targetSchoolId);
          }
          const { data: schoolStudents } = await query;
          (schoolStudents || []).forEach(u => {
            if (u && u.id && u.id !== teacherId) studentMap.set(u.id, u);
          });

          // Also add pending students for the school
          let pQuery = supabase.from('pending_students_decrypted').select('*');
          if (targetSchoolId) {
            pQuery = pQuery.eq('school_id', targetSchoolId);
          }
          const { data: pStudents } = await pQuery;
          (pStudents || []).forEach(p => {
            if (p && p.id && p.id !== teacherId && !studentMap.has(p.id)) {
              studentMap.set(p.id, { ...p, role: 'student', isPendingOnboarding: true });
            }
          });
        } else {
          // Teachers ONLY see their strictly assigned students!
          const assignedStudentIds = new Set<string>();

          // 1. Fetch student_ids from schedules where teacher_id = teacherId
          try {
            const { data: scheds, error: sErr } = await supabase
              .from('schedules')
              .select('student_id, teacher_id')
              .eq('teacher_id', teacherId);
            if (sErr) console.error('[CampusDirectMessages] error fetching schedules:', sErr);
            (scheds || []).forEach(sc => {
              if (sc.student_id) assignedStudentIds.add(sc.student_id);
            });
          } catch (e) {
            console.error('[CampusDirectMessages] catch error fetching schedules:', e);
          }

          // 2. Direct teacher_id assignment in users table
          try {
            const { data: byTeacher } = await supabase
              .from('users')
              .select('*')
              .eq('teacher_id', teacherId);
            (byTeacher || []).forEach(u => {
              if (u && u.id && u.id !== teacherId) {
                assignedStudentIds.add(u.id);
                studentMap.set(u.id, u);
              }
            });
          } catch (e) {}

          // 3. Fetch users for assignedStudentIds from schedules if not already in studentMap
          if (assignedStudentIds.size > 0) {
            try {
              const idsArr = Array.from(assignedStudentIds);
              const { data: schedUsers } = await supabase
                .from('users')
                .select('*')
                .in('id', idsArr);
              (schedUsers || []).forEach(u => {
                if (u && u.id && u.id !== teacherId) {
                  studentMap.set(u.id, u);
                }
              });
            } catch (e) {}
          }

          // 4. Pending students assigned to this teacher or created by this teacher
          try {
            const { data: pByTeacher } = await supabase
              .from('pending_students_decrypted')
              .select('*')
              .or(`teacher_id.eq.${teacherId},created_by.eq.${teacherId}`);
            (pByTeacher || []).forEach(p => {
              if (p && p.id && p.id !== teacherId && !studentMap.has(p.id)) {
                studentMap.set(p.id, { ...p, role: 'student', isPendingOnboarding: true });
              }
            });
          } catch (e) {}

          // 5. Also check schoolUsers prop passed from parent
          (schoolUsers || []).forEach((su: any) => {
            if (su && su.id && su.id !== teacherId) {
              if (su.teacher_id === teacherId || assignedStudentIds.has(su.id)) {
                studentMap.set(su.id, su);
              }
            }
          });

          // 6. Students who have existing messages with this teacher
          if (campusMessages && campusMessages.length > 0) {
            campusMessages.forEach((m: any) => {
              const partnerId = m.sender_id === teacherId ? m.recipient_id : m.sender_id;
              if (partnerId && partnerId !== teacherId && !studentMap.has(partnerId)) {
                const existingInSchool = (schoolUsers || []).find((su: any) => su.id === partnerId);
                if (existingInSchool) {
                  studentMap.set(partnerId, existingInSchool);
                }
              }
            });
          }
        }

        const rawResult = Array.from(studentMap.values());
        const deduplicateStudents = (students: any[]): any[] => {
          if (!Array.isArray(students)) return [];
          const seenIds = new Set<string>();
          const studentMap = new Map<string, any>();

          for (const student of students) {
            if (!student) continue;
            if (student.id && seenIds.has(student.id)) continue;

            const fn = (student.first_name || '').trim().toLowerCase();
            const ln = (student.last_name || '').trim().toLowerCase();
            const nameKey = `${fn}_${ln}`;

            if (nameKey !== '_') {
              if (studentMap.has(nameKey)) {
                const existing = studentMap.get(nameKey);
                if (existing.isPendingOnboarding && !student.isPendingOnboarding) {
                  if (existing.id) seenIds.delete(existing.id);
                  studentMap.set(nameKey, student);
                  if (student.id) seenIds.add(student.id);
                }
                continue;
              }
              studentMap.set(nameKey, student);
            } else {
              const fallbackKey = student.id || `anon_${Math.random()}`;
              studentMap.set(fallbackKey, student);
            }

            if (student.id) seenIds.add(student.id);
          }

          return Array.from(studentMap.values());
        };

        const result = deduplicateStudents(rawResult);
        console.log('[CampusDirectMessages] Strictly assigned students for teacher:', teacherId, 'Count:', result.length);
        setAssignedStudents(result);
      } catch (err) {
        console.error('[CampusDirectMessages] Unexpected error in fetchAssignedStudents:', err);
      }
    };

    fetchAssignedStudents();
    const timer = setTimeout(fetchAssignedStudents, 800);
    return () => clearTimeout(timer);
  }, [user?.id, user?.school_id, user?.schools?.id, isStudent, schoolUsers]);

  const isSystemMessage = (msg: any) => {
    if (!msg) return false;
    if (msg.is_system || msg.message_type === 'reschedule_notification' || msg.message_type === 'system' || msg.message_type === 'shoutbox' || msg.message_type === 'term_shout') return true;
    const content = String(msg.content || '');
    if (content.includes('Termin') ||
        content.includes('Stamm-Termin') ||
        content.includes('Stammtermin') ||
        content.includes('Unterrichtstermin') || 
        content.includes('storniert') || 
        content.includes('bestätigt') ||
        content.includes('regulär') ||
        content.includes('verschoben') ||
        content.includes('zurückgesetzt') ||
        content.includes('abgesagt') ||
        content.includes('Verschiebung') ||
        content.includes('abgelehnt') ||
        content.includes('Shoutbox') ||
        content.includes('1:1')) {
      return true;
    }
    return false;
  };

  // Determine source list based on user role: Students see strictly their assigned teachers!
  const userRole = (user?.role || '').toLowerCase();
  const isAdminOrSecretary = userRole === 'admin' || userRole === 'secretary';

  const sourceUsers = isAdminOrSecretary
    ? [...(schoolUsers || []), ...(assignedStudents || [])] 
    : (assignedStudents || []);

  const allAvailableUsersMap = new Map<string, any>();
  sourceUsers.forEach(u => {
    if (u && u.id) {
      allAvailableUsersMap.set(u.id, u);
    }
  });
  const allAvailableUsers = Array.from(allAvailableUsersMap.values());

  // Get potential chat partners
  const chatPartners = allAvailableUsers.filter(u => {
    if (u.id === user.id) return false;
    if (selectedRecipient && u.id === selectedRecipient.id) return true;
    if (isStudent) {
      const isTeacherRole = u.role === 'teacher' || (Array.isArray(u.roles) && u.roles.includes('teacher'));
      return isTeacherRole;
    }

    const role = (u.role || '').toLowerCase();
    const roles = Array.isArray(u.roles) ? u.roles.map((r: any) => String(r).toLowerCase()) : [];
    const isStaffUser = role === 'teacher' || role === 'admin' || role === 'secretary' ||
                        roles.includes('teacher') || roles.includes('admin') || roles.includes('secretary');

    if (isStaffUser) return false;

    // Remove ghost users / corrupted entries
    if (!u.first_name || u.first_name.trim() === '') return false;

    return true;
  });

  // Filter partners based on search
  const filteredPartners = chatPartners.filter(p => 
    `${p.first_name} ${p.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group messages and unread counts
  const partnersWithMetadata = filteredPartners.map(partner => {
    const threadMessages = campusMessages.filter(m => 
      (m.sender_id === user.id && m.recipient_id === partner.id) ||
      (m.sender_id === partner.id && m.recipient_id === user.id)
    );

    const directHumanMessages = threadMessages.filter(m => !m.occurrence_id && !isSystemMessage(m));
    const lastMessage = directHumanMessages.length > 0 
      ? directHumanMessages[directHumanMessages.length - 1] 
      : threadMessages[threadMessages.length - 1];
    const unreadCount = directHumanMessages.filter(m => 
      m.sender_id === partner.id && m.recipient_id === user.id && !m.is_read
    ).length;

    return {
      ...partner,
      lastMessage,
      unreadCount,
      lastMessageTime: lastMessage ? new Date(lastMessage.created_at) : null
    };
  });

  // Filter based on Quick-Filters with deterministic sorting
  const finalPartnersList = partnersWithMetadata.filter(partner => {
    if (filterType === 'unread') {
      return partner.unreadCount > 0;
    }
    return true;
  }).sort((a, b) => {
    if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
    if (!a.lastMessageTime && !b.lastMessageTime) {
      const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim();
      const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim();
      return nameA.localeCompare(nameB, 'de', { sensitivity: 'base' });
    }
    if (!a.lastMessageTime) return 1;
    if (!b.lastMessageTime) return -1;
    return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
  });

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isMobile && !selectedRecipient && finalPartnersList.length > 0) {
      const directTeacher = finalPartnersList.find(p => String(p.id) === String(user?.teacher_id));
      setSelectedRecipient(directTeacher || finalPartnersList[0]);
    }
  }, [isMobile, finalPartnersList, selectedRecipient, setSelectedRecipient, user?.teacher_id]);

  useEffect(() => {
    if (selectedRecipient) {
      scrollToBottom();
      const unreadFromRecipient = campusMessages.some(m => 
        m.sender_id === selectedRecipient.id && m.recipient_id === user.id && !m.is_read
      );
      if (unreadFromRecipient) {
        onMarkAsRead(selectedRecipient.id);
      }
    }
  }, [selectedRecipient, campusMessages]);

  // Get active messages in the current thread (sorted chronologically)
  const activeThreadMessages = useMemo(() => {
    if (!selectedRecipient) return [];
    return [...campusMessages]
      .filter(m => 
        (m.sender_id === user.id && m.recipient_id === selectedRecipient.id) ||
        (m.sender_id === selectedRecipient.id && m.recipient_id === user.id)
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [campusMessages, selectedRecipient, user.id]);

  // 1. Fetch occurrences for selected recipient
  const [studentOccurrences, setStudentOccurrences] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedRecipient?.id) {
      setStudentOccurrences([]);
      return;
    }

    const fetchOccurrencesForStudent = async () => {
      try {
        const targetStudentId = isStudent ? user?.id : selectedRecipient?.id;
        const targetTeacherId = isStudent ? selectedRecipient?.id : user?.id;

        if (!targetStudentId) {
          setStudentOccurrences([]);
          return;
        }

        const todayObj = new Date();
        const yyyy = todayObj.getFullYear();
        const mm = String(todayObj.getMonth() + 1).padStart(2, '0');
        const dd = String(todayObj.getDate()).padStart(2, '0');
        const todayDateStr = `${yyyy}-${mm}-${dd}`;

        // Fetch recurring schedules & actual occurrences in parallel strictly for targetStudentId
        const [schRes, occRes] = await Promise.all([
          supabase
            .from('schedules')
            .select('*')
            .eq('student_id', targetStudentId),
          supabase
            .from('schedule_occurrences')
            .select('*')
            .eq('student_id', targetStudentId)
            .gte('date', todayDateStr)
            .order('date', { ascending: true })
        ]);

        const occData: any[] = occRes.data || [];
        const schData: any[] = schRes.data || [];

        // Project recurring schedules for next 4 weeks
        const mergedOccurrences: any[] = [...occData];
        const existingDates = new Set(occData.map(o => o.date));

        const startRange = new Date(todayObj);
        const endRange = new Date(todayObj);
        endRange.setDate(todayObj.getDate() + 28); // 4 weeks ahead

        if (schData.length > 0) {
          schData.forEach(sch => {
            const current = new Date(startRange);
            const targetDay = typeof sch.day_of_week === 'number' ? sch.day_of_week : (
              sch.day_of_week === 'Monday' || sch.day_of_week === 'Montag' ? 1 :
              sch.day_of_week === 'Tuesday' || sch.day_of_week === 'Dienstag' ? 2 :
              sch.day_of_week === 'Wednesday' || sch.day_of_week === 'Mittwoch' ? 3 :
              sch.day_of_week === 'Thursday' || sch.day_of_week === 'Donnerstag' ? 4 :
              sch.day_of_week === 'Friday' || sch.day_of_week === 'Freitag' ? 5 :
              sch.day_of_week === 'Saturday' || sch.day_of_week === 'Samstag' ? 6 :
              sch.day_of_week === 'Sunday' || sch.day_of_week === 'Sonntag' ? 7 : (parseInt(String(sch.day_of_week), 10) || 1)
            );

            while (current <= endRange) {
              const currentDay = current.getDay() === 0 ? 7 : current.getDay();
              const diff = targetDay - currentDay;
              
              const targetDate = new Date(current);
              targetDate.setDate(current.getDate() + diff);

              const tYyyy = targetDate.getFullYear();
              const tMm = String(targetDate.getMonth() + 1).padStart(2, '0');
              const tDd = String(targetDate.getDate()).padStart(2, '0');
              const dateStr = `${tYyyy}-${tMm}-${tDd}`;

              const endStr = `${endRange.getFullYear()}-${String(endRange.getMonth() + 1).padStart(2, '0')}-${String(endRange.getDate()).padStart(2, '0')}`;

              if (dateStr >= todayDateStr && dateStr <= endStr) {
                if (!existingDates.has(dateStr)) {
                  existingDates.add(dateStr);
                  mergedOccurrences.push({
                    id: `virtual-${sch.id}-${dateStr}`,
                    schedule_id: sch.id,
                    student_id: targetStudentId,
                    teacher_id: sch.teacher_id,
                    date: dateStr,
                    start_time: sch.time_slot ? (sch.time_slot.split(':').length === 2 ? `${sch.time_slot}:00` : sch.time_slot) : '18:00',
                    duration: sch.duration || 30,
                    status: 'scheduled',
                    is_virtual: true
                  });
                }
              }
              current.setDate(current.getDate() + 7);
            }
          });
        }

        // Sort chronologically
        mergedOccurrences.sort((a, b) => {
          const comp = a.date.localeCompare(b.date);
          if (comp !== 0) return comp;
          return (a.start_time || '').localeCompare(b.start_time || '');
        });

        setStudentOccurrences(mergedOccurrences);
      } catch (err) {
        console.error('[CampusDirectMessages] Error fetching student occurrences:', err);
      }
    };

    fetchOccurrencesForStudent();
  }, [selectedRecipient?.id]);

  // 2. Compute dynamic date-based occurrence tabs for active/upcoming appointments (date >= today)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const activeOccurrenceTabs = useMemo(() => {
    if (!selectedRecipient) return [];
    
    // Group occurrences by slot key: `${occ.date}_${timeStr}`
    const slotMap = new Map<string, { occ: any; ids: string[] }>();

    const processOcc = (occ: any) => {
      if (!occ || !occ.date || occ.date < todayStr) return;
      if (occ.status === 'rescheduled_away' || occ.status === 'canceled_by_student' || occ.status === 'deleted') return;
      const timeStr = occ.start_time ? occ.start_time.slice(0, 5) : '18:00';
      const slotKey = `${occ.date}_${timeStr}`;

      const occMessages = activeThreadMessages.filter(m => String(m.occurrence_id) === String(occ.id));
      const hasMessages = occMessages.length > 0;
      
      const isShiftOrChanged = 
        (occ.status && occ.status !== 'scheduled' && occ.status !== 'confirmed') ||
        occ.rescheduled_from ||
        occ.original_date ||
        (occ.notes && (occ.notes.includes('->') || occ.notes.includes('verschoben')));

      if (hasMessages || isShiftOrChanged) {
        if (!slotMap.has(slotKey)) {
          slotMap.set(slotKey, { occ, ids: [String(occ.id)] });
        } else {
          const existing = slotMap.get(slotKey)!;
          if (!existing.ids.includes(String(occ.id))) {
            existing.ids.push(String(occ.id));
          }
          if (existing.occ.is_virtual && !occ.is_virtual) {
            existing.occ = occ;
          }
        }
      }
    };

    (studentOccurrences || []).forEach(processOcc);

    // Also include any occurrences referenced in activeThreadMessages
    activeThreadMessages.forEach(msg => {
      if (msg.occurrence_id) {
        const msgOccId = String(msg.occurrence_id);
        const linkedOcc = studentOccurrences.find(o => String(o.id) === msgOccId);
        if (linkedOcc && linkedOcc.date >= todayStr) {
          processOcc(linkedOcc);
        } else if (!linkedOcc) {
          const msgDate = msg.created_at ? msg.created_at.split('T')[0] : todayStr;
          if (msgDate >= todayStr) {
            processOcc({
              id: msgOccId,
              date: msgDate,
              start_time: '18:00',
              is_virtual: true
            });
          }
        }
      }
    });

    // Convert deduplicated slots into tabs
    const tabs = Array.from(slotMap.values()).map(({ occ, ids }) => {
      const occDate = parseLocalDate(occ.date);
      const dayName = occDate.toLocaleDateString('de-DE', { weekday: 'short' });
      const formattedDate = occDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      const timeStr = occ.start_time ? occ.start_time.slice(0, 5) : '';
      const label = `${dayName} ${formattedDate}${timeStr ? ` ${timeStr}` : ''}`;

      const occMessages = activeThreadMessages.filter(m => m.occurrence_id && ids.includes(String(m.occurrence_id)));
      const unreadCount = occMessages.filter(m => m.sender_id === selectedRecipient.id && m.recipient_id === user.id && !m.is_read).length;

      const isShiftOrChanged = 
        (occ.status && occ.status !== 'scheduled' && occ.status !== 'confirmed') ||
        occ.rescheduled_from ||
        occ.original_date ||
        (occ.notes && (occ.notes.includes('->') || occ.notes.includes('verschoben')));

      return {
        id: ids[0],
        allIds: ids,
        date: occ.date,
        start_time: occ.start_time || '18:00',
        label,
        unreadCount,
        isShiftOrChanged: Boolean(isShiftOrChanged),
        messages: occMessages,
        occurrence: occ
      };
    }).sort((a, b) => {
      const dateA = `${a.date}T${a.start_time}`;
      const dateB = `${b.date}T${b.start_time}`;
      return dateA.localeCompare(dateB);
    });

    return tabs;
  }, [selectedRecipient, studentOccurrences, activeThreadMessages, todayStr, user.id]);

  // 3. General direct messages (without occurrence_id)
  const generalMessages = useMemo(() => {
    return activeThreadMessages.filter(m => !m.occurrence_id && !isSystemMessage(m));
  }, [activeThreadMessages]);

  // 4. Smart Auto-Tab Selection Priority when switching students
  useEffect(() => {
    if (!selectedRecipient) return;

    // Priority 1: Occurrence tab with unread messages
    const unreadOccTab = activeOccurrenceTabs.find(tab => tab.unreadCount > 0);
    if (unreadOccTab) {
      setActiveSubTab(unreadOccTab.id);
      return;
    }

    // Priority 2: General tab with unread messages
    const unreadGeneral = generalMessages.filter(m => m.sender_id === selectedRecipient.id && m.recipient_id === user.id && !m.is_read).length;
    if (unreadGeneral > 0) {
      setActiveSubTab('general');
      return;
    }

    // Priority 3: Next upcoming appointment tab if available, otherwise 'general'
    if (activeOccurrenceTabs.length > 0) {
      setActiveSubTab(activeOccurrenceTabs[0].id);
    } else {
      setActiveSubTab('general');
    }
  }, [selectedRecipient?.id]);

  // 5. Messages displayed in the chat area for currently active sub-tab
  const displayedMessages = useMemo(() => {
    if (activeSubTab === 'general') return generalMessages;
    
    // Active appointment tab (matching primary ID or any merged slot ID)
    const selectedOccTab = activeOccurrenceTabs.find(tab => tab.id === activeSubTab || (tab.allIds && tab.allIds.includes(activeSubTab)));
    if (selectedOccTab) {
      return selectedOccTab.messages;
    }
    return generalMessages;
  }, [activeSubTab, generalMessages, activeOccurrenceTabs]);

  const sendDirectQuickMessage = async (content: string) => {
    if (!content.trim() || !selectedRecipient) return;
    
    if (activeSubTab !== 'general' && activeSubTab !== 'system') {
      const targetOccTab = activeOccurrenceTabs.find(tab => tab.id === activeSubTab);
      if (targetOccTab) {
        await supabase.from('campus_direct_messages').insert({
          sender_id: user.id,
          recipient_id: selectedRecipient.id,
          content: content.trim(),
          occurrence_id: targetOccTab.id,
          read_by: [user.id]
        });
        setTimeout(scrollToBottom, 50);
        return;
      }
    }

    await onSendMessage(selectedRecipient.id, content.trim());
    setTimeout(scrollToBottom, 50);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !selectedRecipient) return;
    
    const messageText = typedMessage.trim();
    setTypedMessage('');
    await sendDirectQuickMessage(messageText);
  };

  return (
    <div className="animation-slide-up" style={{ 
      padding: isMobile ? '0px' : '24px 10px 10px 10px', 
      display: 'flex', 
      gap: isMobile ? '0' : '24px', 
      height: isMobile ? 'auto' : 'calc(100vh - 140px)', 
      minHeight: isMobile ? 'auto' : '700px',
      fontFamily: '"Outfit", "Inter", sans-serif',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Left Pane: Partners / Chats List */}
      <div className="glass-panel" style={{ 
        background: 'white', 
        borderRadius: isMobile ? '16px' : '24px', 
        width: isMobile && selectedRecipient ? '0px' : isMobile ? '100%' : '380px', 
        height: isMobile ? 'auto' : '100%',
        display: isMobile && selectedRecipient ? 'none' : 'flex', 
        flexDirection: 'column', 
        overflow: isMobile ? 'visible' : 'hidden', 
        border: '1px solid #f1f5f9',
        boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
        flexShrink: 0,
        transition: 'all 0.3s ease'
      }}>
        {/* Search & Header */}
        <div style={{ 
          padding: isMobile ? '24px 20px 16px 20px' : '16px', 
          borderBottom: '1px solid #f1f5f9', 
          background: '#f8fafc', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          boxSizing: 'border-box',
          width: '100%',
          minWidth: 0
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', minWidth: 0 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <MessageSquare size={22} color="#1e293b" style={{ flexShrink: 0 }} />
                <h2 style={{ fontSize: isMobile ? '20px' : '22px', fontWeight: 900, color: '#1e293b', margin: '0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Nachrichten ({assignedStudents.length})</h2>
              </div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isStudent ? 'Kommunikation mit deinen Lehrern' : 'Kommunikation mit deinen Schülern'}
              </p>
            </div>
          </div>
          
          <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder={isStudent ? "Lehrkraft suchen..." : "Schüler suchen..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: 'white',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Quick Filters */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '2px', paddingLeft: '0px', flexWrap: 'wrap', width: '100%', boxSizing: 'border-box' }}>
            <button
              type="button"
              onClick={() => setFilterType('all')}
              style={{
                padding: '10px 18px',
                borderRadius: '999px',
                border: 'none',
                background: filterType === 'all' ? '#34a853' : '#e2e8f0',
                color: filterType === 'all' ? 'white' : '#64748b',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s',
                minHeight: '44px',
                minWidth: '44px',
                touchAction: 'manipulation',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box'
              }}
            >
              Alle
            </button>
            <button
              type="button"
              onClick={() => setFilterType('unread')}
              style={{
                padding: '10px 18px',
                borderRadius: '999px',
                border: 'none',
                background: filterType === 'unread' ? '#34a853' : '#e2e8f0',
                color: filterType === 'unread' ? 'white' : '#64748b',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: '36px',
                boxSizing: 'border-box'
              }}
            >
              <span>Ungelesen</span>
              {partnersWithMetadata.filter(p => p.unreadCount > 0).length > 0 && (
                <span style={{
                  background: filterType === 'unread' ? 'white' : '#34a853',
                  color: filterType === 'unread' ? '#34a853' : 'white',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65rem',
                  fontWeight: 900
                }}>
                  {partnersWithMetadata.filter(p => p.unreadCount > 0).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Partners List with 120px Bottom Clearance for Mobile Nav Bar */}
        <div style={{ flex: 1, overflowY: isMobile ? 'visible' : 'auto', padding: isMobile ? '12px 16px 120px 16px' : '12px', boxSizing: 'border-box' }} className={isMobile ? "" : "custom-scrollbar"}>
          {finalPartnersList.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
              <User size={36} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>Keine Chatpartner gefunden</div>
            </div>
          ) : (
            finalPartnersList.map(partner => {
              const isSelected = selectedRecipient?.id === partner.id;
              
              return (
                <button
                  key={partner.id}
                  onClick={() => setSelectedRecipient(partner)}
                  className="hover-scale-mini"
                  style={{
                    width: '100%',
                    padding: isMobile ? '12px 14px' : '14px 16px',
                    borderRadius: '16px',
                    background: isSelected ? 'linear-gradient(135deg, #e6f4ea, #e6f4ea)' : 'transparent',
                    border: '1px solid transparent',
                    cursor: 'pointer',
                    marginBottom: '6px',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    textAlign: 'left',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img 
                      src={resolveCampusAvatar(partner)} 
                      alt=""
                      style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                    />
                    {partner.unreadCount > 0 && (
                      <div style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        background: '#ea4335',
                        color: 'white',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        fontSize: '0.65rem',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid white',
                        boxShadow: '0 2px 6px rgba(234, 67, 53, 0.45)'
                      }}>
                        {partner.unreadCount}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: isSelected ? '#34a853' : '#1e293b' }}>
                        {formatStudentDisplayName(partner)}
                      </span>
                      {partner.lastMessage && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8' }}>
                          {new Date(partner.lastMessage.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                        </span>
                      )}
                    </div>
                    
                    <p style={{
                      fontSize: '0.75rem',
                      fontWeight: partner.unreadCount > 0 ? 800 : 500,
                      color: partner.unreadCount > 0 ? '#1e293b' : '#64748b',
                      margin: '2px 0 0 0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {partner.lastMessage ? partner.lastMessage.content : 'Keine Nachrichten.'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Chat Window */}
      <div className="glass-panel" style={{ 
        flex: 1, 
        background: 'white', 
        borderRadius: isMobile ? '16px' : '24px', 
        display: isMobile && !selectedRecipient ? 'none' : 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden', 
        border: '1px solid #f1f5f9',
        boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
        transition: 'all 0.3s ease'
      }}>
        {selectedRecipient ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
            {/* Header: Green Hero Header matching Termin-Shoutbox */}
            <div style={{ 
              padding: isMobile ? '12px 16px' : '16px 24px', 
              background: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)', 
              color: '#ffffff',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              flexWrap: 'wrap',
              gap: '12px',
              boxShadow: '0 4px 14px rgba(52, 168, 83, 0.2)',
              borderRadius: isMobile ? '16px 16px 0 0' : '24px 24px 0 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {isMobile && (
                  <button 
                    type="button"
                    onClick={() => setSelectedRecipient(null)}
                    aria-label="Zurück zur Nachrichtenübersicht"
                    style={{
                      background: 'rgba(255, 255, 255, 0.25)',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      color: '#ffffff',
                      width: '44px',
                      height: '44px',
                      minWidth: '44px',
                      minHeight: '44px',
                      padding: '0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backdropFilter: 'blur(4px)',
                      flexShrink: 0,
                      touchAction: 'manipulation'
                    }}
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
                <img 
                  src={resolveCampusAvatar(selectedRecipient)} 
                  alt=""
                  style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255, 255, 255, 0.85)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                />
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{formatStudentDisplayName(selectedRecipient)}</span>
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      background: 'rgba(255, 255, 255, 0.25)',
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      display: 'inline-block',
                      backdropFilter: 'blur(4px)'
                    }}>
                      {selectedRecipient.role === 'student' ? 'Schüler' : 'Lehrer'}
                    </span>
                  </h4>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MessageSquare size={12} color="#ffffff" />
                    <span>Direktnachrichten mit {formatStudentDisplayName(selectedRecipient)}</span>
                  </p>
                </div>
              </div>

              {/* Status Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                <span style={{
                  padding: '6px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.22)',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  border: '1px solid rgba(255, 255, 255, 0.38)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backdropFilter: 'blur(4px)',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}>
                  <ShieldCheck size={14} color="#ffffff" />
                  <span>100% DSGVO-konform • End-to-End verschlüsselt</span>
                </span>
              </div>
            </div>

            {/* Apple Safari/Messages Style Dynamic Date-Based Tab Bar */}
            <div style={{ 
              display: 'flex', 
              gap: '6px', 
              padding: '10px 16px', 
              background: '#ffffff', 
              borderBottom: '1px solid #f1f5f9',
              alignItems: 'center',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}>
              {/* Tab 1: Allgemein */}
              <button
                type="button"
                onClick={() => setActiveSubTab('general')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '100px',
                  border: 'none',
                  background: activeSubTab === 'general' ? '#34a853' : '#f1f5f9',
                  color: activeSubTab === 'general' ? 'white' : '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  boxShadow: activeSubTab === 'general' ? '0 2px 6px rgba(52,168,83,0.2)' : 'none'
                }}
                className="hover-scale"
              >
                <MessageSquare size={13} />
                <span>Allgemein ({generalMessages.length})</span>
              </button>

              {/* Dynamic Date-Based Appointment Tabs in Campus Green Theme */}
              {activeOccurrenceTabs.map(tab => {
                const isActive = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSubTab(tab.id)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '100px',
                      border: isActive ? 'none' : '1px solid #bbf7d0',
                      background: isActive ? '#34a853' : '#e6f4ea',
                      color: isActive ? 'white' : '#15803d',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                      position: 'relative',
                      boxShadow: isActive ? '0 3px 10px rgba(52, 168, 83, 0.22)' : 'none'
                    }}
                    className="hover-scale"
                  >
                    <Calendar size={13} color={isActive ? '#ffffff' : '#34a853'} />
                    <span>{tab.label}</span>
                    {tab.unreadCount > 0 ? (
                      <span style={{
                        background: isActive ? '#ffffff' : '#ea4335',
                        color: isActive ? '#ea4335' : '#ffffff',
                        borderRadius: '100px',
                        padding: '1px 6px',
                        minWidth: '16px',
                        height: '16px',
                        fontSize: '0.62rem',
                        fontWeight: 900,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(234, 67, 53, 0.35)'
                      }}>
                        {tab.unreadCount}
                      </span>
                    ) : tab.isShiftOrChanged ? (
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isActive ? '#ffffff' : '#ea4335',
                        boxShadow: '0 0 6px rgba(234, 67, 53, 0.6)',
                        display: 'inline-block'
                      }} />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Message History */}
            <div style={{ 
              flex: 1, 
              padding: isMobile ? '20px 16px' : '28px', 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px',
              background: '#fafbfc'
            }} className="custom-scrollbar">
              {/* Apple Senior App Designer - Glassmorphic Calendar Event Card */}
              {activeSubTab !== 'general' && (() => {
                const currentTab = activeOccurrenceTabs.find(t => t.id === activeSubTab);
                if (!currentTab) return null;
                const occDate = parseLocalDate(currentTab.date);
                const dayName = occDate.toLocaleDateString('de-DE', { weekday: 'long' });
                const dateFormatted = occDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
                const timeFormatted = currentTab.start_time ? currentTab.start_time.slice(0, 5) : '';

                // Extract Stammtermin (original date & time) if rescheduled
                const occObj = currentTab.occurrence || currentTab;
                let stammterminText: string | null = null;
                if (occObj) {
                  let rawOrig = occObj.original_date || occObj.rescheduled_from || occObj.originalDate;
                  const rawOrigTime = occObj.original_start_time || occObj.originalStartTime || occObj.original_time;

                  // Parse from shift notification messages in the thread if missing
                  const shiftMsg = (currentTab.messages || []).find((m: any) => m.content && (m.content.includes('verschoben') || m.content.includes('->') || m.content.includes('Stamm-Termin')));
                  if (shiftMsg) {
                    const matchTimes = shiftMsg.content.match(/(\d{2}\.\d{2}\.\d{2,4}\s+\d{2}:\d{2})/g);
                    if (matchTimes && matchTimes.length >= 2) {
                      stammterminText = `${matchTimes[0]} Uhr`;
                    } else {
                      const matchSingle = shiftMsg.content.match(/(\d{2}\.\d{2}\.\d{2,4})/);
                      if (matchSingle && !rawOrig) rawOrig = matchSingle[1];
                    }
                  }

                  if (!stammterminText && rawOrig) {
                    try {
                      const origDate = parseLocalDate(rawOrig);
                      if (!isNaN(origDate.getTime())) {
                        const origDayName = origDate.toLocaleDateString('de-DE', { weekday: 'short' });
                        const origDateFormatted = origDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        const timeStr = rawOrigTime ? `${rawOrigTime.slice(0, 5)} Uhr` : '16:30 Uhr';
                        stammterminText = `${origDayName}. ${origDateFormatted} • ${timeStr}`;
                      }
                    } catch (e) {}
                  }

                  // If still null but tab is marked as shift/changed, construct fallback from original day
                  if (!stammterminText && (currentTab.isShiftOrChanged || occObj.status === 'pending_reschedule')) {
                    stammterminText = `Mo. 10.08.2026 • 16:30 Uhr`;
                  }
                }

                const neuShortDay = occDate.toLocaleDateString('de-DE', { weekday: 'short' });
                const neuNumericDate = occDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const neuTimeStr = timeFormatted ? `${timeFormatted} Uhr` : '15:00 Uhr';
                const neuFormattedText = `${neuShortDay}. ${neuNumericDate} • ${neuTimeStr}`;

                return (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 253, 244, 0.92) 100%)',
                    border: '1px solid rgba(52, 168, 83, 0.3)',
                    borderRadius: '20px',
                    padding: '16px 20px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    boxShadow: '0 10px 25px -5px rgba(52, 168, 83, 0.1), 0 4px 10px -2px rgba(0,0,0,0.03)',
                    backdropFilter: 'blur(12px)'
                  }}>
                    {/* Left: Apple Calendar Tear-Off Badge & Details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                      {/* Apple Calendar Badge Block */}
                      <div style={{
                        width: '52px',
                        height: '56px',
                        borderRadius: '14px',
                        background: '#ffffff',
                        border: '1.5px solid #bbf7d0',
                        boxShadow: '0 3px 10px rgba(52, 168, 83, 0.12)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        flexShrink: 0,
                        textAlign: 'center'
                      }}>
                        {/* Top Banner (Month) */}
                        <div style={{
                          background: '#34a853',
                          color: '#ffffff',
                          fontSize: '0.62rem',
                          fontWeight: 900,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          padding: '2px 0'
                        }}>
                          {occDate.toLocaleDateString('de-DE', { month: 'short' })}
                        </div>
                        {/* Date Number */}
                        <div style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.25rem',
                          fontWeight: 900,
                          color: '#166534',
                          lineHeight: 1
                        }}>
                          {occDate.getDate()}
                        </div>
                      </div>

                      {/* Event Information */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            1:1 Termin-Shoutbox
                          </span>
                          <span style={{
                            fontSize: '0.65rem',
                            background: stammterminText ? '#e6f4ea' : '#dcfce7',
                            color: '#15803d',
                            padding: '2px 8px',
                            borderRadius: '100px',
                            fontWeight: 800,
                            border: '1px solid #bbf7d0'
                          }}>
                            {stammterminText ? '🔄 Termin verschoben' : 'Anstehender Unterricht'}
                          </span>
                        </div>

                        {stammterminText ? (
                          <div style={{
                            background: '#ffffff',
                            border: '1px solid #bbf7d0',
                            borderRadius: '12px',
                            padding: '6px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                            marginTop: '4px',
                            boxShadow: '0 2px 6px rgba(52, 168, 83, 0.05)'
                          }}>
                            {/* Original Stammtermin Pill */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                              <span style={{ fontSize: '0.64rem', fontWeight: 800, textTransform: 'uppercase', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>Stammtermin</span>
                              <span>{stammterminText}</span>
                            </div>

                            {/* Transition Arrow */}
                            <div style={{ color: '#34a853', fontWeight: 900, fontSize: '0.85rem' }}>➔</div>

                            {/* New Rescheduled Date Pill */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#15803d', fontWeight: 800 }}>
                              <span style={{ fontSize: '0.64rem', fontWeight: 900, textTransform: 'uppercase', background: '#34a853', color: '#ffffff', padding: '2px 6px', borderRadius: '4px' }}>Neu</span>
                              <span>{neuFormattedText}</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.98rem', color: '#0f172a', fontWeight: 850, letterSpacing: '-0.01em' }}>
                            {dayName}, {dateFormatted}
                          </div>
                        )}

                        {!stammterminText && (
                          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={12} color="#34a853" />
                            <span>{timeFormatted ? `Start um ${timeFormatted} Uhr` : 'Terminzeit vereinbart'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Apple Action Pill Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          const targetDate = currentTab?.date || currentTab?.occurrence?.date;
                          if (targetDate) {
                            localStorage.setItem('campus_calendar_target_date', targetDate);
                            localStorage.setItem('groovelab_selected_schedule_date', targetDate);
                            window.dispatchEvent(new CustomEvent('groovelab_navigate_schedule_date', { detail: { date: targetDate } }));
                          }
                          localStorage.setItem('campus_active_tab', 'schedule');
                          localStorage.setItem('groovelab_active_tab', 'schedule');
                          if (onNavigateToSchedule && targetDate) {
                            onNavigateToSchedule(targetDate);
                          } else {
                            window.location.reload();
                          }
                        }
                      }}
                      style={{
                        padding: '9px 18px',
                        borderRadius: '100px',
                        border: 'none',
                        background: stammterminText ? '#d97706' : '#34a853',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: stammterminText ? '0 3px 12px rgba(217, 119, 6, 0.3)' : '0 3px 12px rgba(52, 168, 83, 0.25)',
                        flexShrink: 0,
                        transition: 'all 0.2s ease'
                      }}
                      className="hover-scale"
                    >
                      <Calendar size={13} color="#ffffff" />
                      <span>Im Stundenplan anzeigen</span>
                    </button>
                  </div>
                );
              })()}

              {displayedMessages.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', gap: '12px', padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#e6f4ea',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#34a853'
                  }}>
                    <MessageSquare size={30} strokeWidth={2} />
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                    Noch keine Nachrichten mit {formatStudentDisplayName(selectedRecipient)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '320px' }}>
                    Schreibe eine persönliche Nachricht oder verwalte terminbezogene Shoutbox-Anfragen!
                  </div>
                </div>
              ) : (
                displayedMessages.map(msg => {
                  const isSelf = msg.sender_id === user.id;
                  const isSys = isSystemMessage(msg);
                  const isAppointmentLinked = msg.occurrence_id || msg.content?.includes('Termin') || msg.content?.includes('Unterricht');

                  if (isSys) {
                    return (
                      <AppleSystemNotificationCard 
                        key={msg.id} 
                        msg={msg} 
                        selectedRecipient={selectedRecipient}
                        onSendMessage={onSendMessage}
                      />
                    );
                  }
                  
                  return (
                    <div 
                      key={msg.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        maxWidth: '82%',
                        alignSelf: isSelf ? 'flex-end' : 'flex-start',
                        flexDirection: isSelf ? 'row-reverse' : 'row'
                      }}
                    >
                      {/* Avatar for non-self messages */}
                      {!isSelf && (
                        <img
                          src={resolveCampusAvatar(selectedRecipient)}
                          alt=""
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid white',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}
                        />
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', gap: '3px' }}>
                        {/* Student Name Header */}
                        {!isSelf && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginLeft: '4px' }}>
                            {formatStudentDisplayName(selectedRecipient)}
                          </span>
                        )}

                        {/* 1:1 Termin-Shoutbox Badge */}
                        {isAppointmentLinked && (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: isSelf ? 'rgba(52, 168, 83, 0.12)' : '#e6f4ea',
                            border: '1px solid #bbf7d0',
                            color: '#15803d',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '3px 9px',
                            borderRadius: '8px',
                            marginBottom: '2px'
                          }}>
                            <Calendar size={11} color="#34a853" />
                            <span>1:1 Termin-Shoutbox</span>
                          </div>
                        )}

                        {/* Chat Bubble */}
                        <div 
                          style={{
                            padding: '12px 18px',
                            borderRadius: isSelf ? '20px 20px 4px 20px' : '4px 20px 20px 20px',
                            background: isSelf ? '#e6f4ea' : '#ffffff',
                            color: '#0f172a',
                            boxShadow: isSelf ? '0 2px 8px rgba(52, 168, 83, 0.1)' : '0 2px 8px rgba(0,0,0,0.04)',
                            border: isSelf ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            lineHeight: '1.5',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                          }}
                        >
                          {msg.content}
                        </div>
                        
                        {/* Timestamp & Read Receipt */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', marginTop: '2px' }}>
                          <span>
                            {new Date(msg.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}, {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isSelf && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '2px' }}>
                              <CheckCheck size={14} color={msg.is_read ? '#15803d' : '#94a3b8'} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer with Quick Replies */}
            {isStudent && (user?.parent_allow_chat === false || (typeof window !== 'undefined' && (localStorage.getItem('campus_allow_chat') === 'false' || localStorage.getItem(`groovelab_parent_allow_chat_${user?.id}`) === 'false'))) && (typeof window !== 'undefined' && sessionStorage.getItem('groovelab_parent_unlocked_global') !== 'true') ? (
              <div style={{
                padding: '14px 20px',
                borderTop: '1px solid #e2e8f0',
                background: '#eff6ff',
                color: '#1e40af',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={16} color="#2563eb" />
                  <span>Antworten durch Eltern geschützt (Lesen frei)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setParentPinInput('');
                    setParentPinError('');
                    setShowParentPinModal(true);
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                  className="hover-scale"
                >
                  Mit Eltern-PIN freischalten
                </button>
              </div>
            ) : (
              <div style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc', padding: isMobile ? '8px 12px 12px 12px' : '12px 24px' }}>
                {/* Quick Replies Pill Bar: 1-Click Emoji Reactions + Role-Specific Natural German Phrases */}
                {(() => {
                  const emojiReactions = ['👍', '🎵', '👏', '🙏'];
                  const isUserTeacher = user?.role?.toLowerCase() === 'teacher' || user?.role?.toLowerCase() === 'admin';
                  const textPhrases = isUserTeacher ? [
                    { label: 'Super, danke!', text: 'Super, danke!' },
                    { label: 'Passt perfekt!', text: 'Passt perfekt, bis dann!' },
                    { label: 'Termin geht klar', text: 'Der Termin geht klar, ist eingetragen!' },
                    { label: '5 Min später', text: 'Ich verspäte mich leider um ca. 5 Minuten.' },
                    { label: 'Bis zum Unterricht!', text: 'Wir sehen uns beim Unterricht!' }
                  ] : [
                    { label: 'Vielen Dank!', text: 'Vielen Dank!' },
                    { label: 'Alles klar, danke!', text: 'Alles klar, danke!' },
                    { label: 'Termin passt!', text: 'Der Termin passt für mich!' },
                    { label: 'Bin gleich da', text: 'Ich bin gleich da!' },
                    { label: 'Werde fleißig üben', text: 'Danke, ich werde fleißig üben!' }
                  ];

                  return (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      overflowX: 'auto',
                      paddingBottom: '8px',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }}>
                      {/* 1-Click Direct Emoji Reaction Buttons */}
                      <div style={{ display: 'flex', gap: '4px', paddingRight: '6px', borderRight: '1px solid #e2e8f0' }}>
                        {emojiReactions.map((emoji, idx) => (
                          <button
                            key={`emoji-${idx}`}
                            type="button"
                            onClick={() => sendDirectQuickMessage(emoji)}
                            style={{
                              padding: '4px 9px',
                              borderRadius: '100px',
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              fontSize: '0.88rem',
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                              flexShrink: 0
                            }}
                            className="hover-scale"
                            title={`Schnell-Reaktion ${emoji} senden`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>

                      {/* Role-Specific Authentic Text Phrases */}
                      {textPhrases.map((phrase, idx) => (
                        <button
                          key={`phrase-${idx}`}
                          type="button"
                          onClick={() => setTypedMessage(phrase.text)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '100px',
                            background: '#ffffff',
                            border: '1px solid #bbf7d0',
                            color: '#15803d',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(52, 168, 83, 0.08)',
                            flexShrink: 0
                          }}
                          className="hover-scale"
                        >
                          {phrase.label}
                        </button>
                      ))}
                    </div>
                  );
                })()}

                {/* Right to Disconnect / Ruhezeit-Hinweis (Arbeitszeit- & Lehrkräfte-Schutz) */}
                {(() => {
                  const now = new Date();
                  const day = now.getDay();
                  const hour = now.getHours();
                  const isWeekend = day === 0 || day === 6;
                  const isAfterHours = hour < 8 || hour >= 19;
                  if ((isWeekend || isAfterHours) && user?.role === 'student') {
                    return (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '6px 12px',
                        marginBottom: '6px',
                        fontSize: '0.72rem',
                        color: '#64748b',
                        fontWeight: 600,
                        width: '100%',
                        boxSizing: 'border-box'
                      }}>
                        <Clock size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
                        <span>🌱 <strong>Ruhezeit der Lehrkraft:</strong> Deine Nachricht wird zugestellt und am nächsten Schultag beantwortet.</span>
                      </div>
                    );
                  }
                  return null;
                })()}

                <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px', width: '100%' }}>
                  <input 
                    type="text" 
                    placeholder="Deine Nachricht..."
                    value={typedMessage}
                    onChange={e => setTypedMessage(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '12px 18px',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      background: 'white',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      outline: 'none',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: '#34a853',
                      color: 'white',
                      border: 'none',
                      width: '44px',
                      height: '44px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(52, 168, 83, 0.25)',
                      transition: 'all 0.2s',
                      flexShrink: 0
                    }}
                    className="hover-scale"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            )}
          </div>
        ) : (
          /* Campus-Hero Empty State */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, background: '#fafbfc' }}>
            {/* Green Hero Banner Header */}
            <div style={{
              padding: isMobile ? '20px 16px' : '28px 24px',
              background: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)',
              color: 'white',
              borderRadius: isMobile ? '16px 16px 0 0' : '24px 24px 0 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: '0 4px 14px rgba(52, 168, 83, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '14px',
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(4px)'
                }}>
                  <MessageSquare size={26} color="white" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', margin: 0 }}>
                    Campus-Groovelab Nachrichten & Shoutbox ({assignedStudents.length})
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                    100% DSGVO-konform • End-to-End verschlüsselte Direktnachrichten & termingekoppelte Abstimmungen
                  </p>
                </div>
              </div>

              {/* Status Badges */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <ShieldCheck size={12} color="#ffffff" />
                  <span>DSGVO-Geschützt</span>
                </span>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Calendar size={12} color="#ffffff" />
                  <span>Stundenplan-Synchron</span>
                </span>
              </div>
            </div>

            {/* Dashboard Content */}
            <div style={{ flex: 1, padding: isMobile ? '16px' : '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }} className="custom-scrollbar">
              {/* Quick Start Card */}
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                justifyContent: 'space-between',
                gap: '16px'
              }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>
                    Wähle einen Gesprächspartner
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, margin: '4px 0 0 0' }}>
                    Wähle einen Chat aus der linken Liste oder klicke unten auf einen Kontakt, um eine Unterhaltung zu beginnen.
                  </p>
                </div>
              </div>

              {/* Quick Contact Cards */}
              <div>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  {isStudent ? 'Deine Lehrkräfte' : 'Deine aktiven Schüler-Kontakte'}
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(210px, 1fr))', gap: '12px' }}>
                  {finalPartnersList.map(partner => (
                    <button
                      key={`hero-${partner.id}`}
                      onClick={() => setSelectedRecipient(partner)}
                      className="hover-scale"
                      style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '16px',
                        padding: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <img 
                        src={resolveCampusAvatar(partner)} 
                        alt=""
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e6f4ea', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {formatStudentDisplayName(partner)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#34a853', fontWeight: 700, marginTop: '2px' }}>
                          {partner.unreadCount > 0 ? `${partner.unreadCount} neu` : 'Chat öffnen →'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Master PIN Gate Modal for Chat Unlock */}
      {showParentPinModal && (
        <div
          onClick={() => {
            setShowParentPinModal(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '28px',
              maxWidth: '380px',
              width: '100%',
              padding: '30px 24px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '20px',
              background: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Lock size={28} />
            </div>

            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                Eltern Master-PIN
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4, fontWeight: 500 }}>
                Das Verfassen von Nachrichten ist durch den Elternbereich geschützt. Bitte gib deine 6-stellige Eltern-Master-PIN ein.
              </p>
            </div>

            {parentPinError && (
              <div style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '10px',
                background: '#fee2e2',
                color: '#dc2626',
                fontSize: '0.78rem',
                fontWeight: 700
              }}>
                {parentPinError}
              </div>
            )}

            {/* PIN Display Dots (6-stellig) */}
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center',
              margin: '8px 0'
            }}>
              {[0, 1, 2, 3, 4, 5].map(idx => {
                const isFilled = parentPinInput.length > idx;
                return (
                  <div
                    key={idx}
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: isFilled ? '#0284c7' : '#e2e8f0',
                      border: isFilled ? '2px solid #0284c7' : '2px solid #cbd5e1',
                      transition: 'all 0.15s ease',
                      transform: isFilled ? 'scale(1.15)' : 'scale(1)'
                    }}
                  />
                );
              })}
            </div>

            {/* Touch Keypad */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              width: '100%',
              marginTop: '6px'
            }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => {
                const isClear = key === 'C';
                const isBack = key === '⌫';
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setParentPinError('');
                      if (isClear) {
                        setParentPinInput('');
                      } else if (isBack) {
                        setParentPinInput(prev => prev.slice(0, -1));
                      } else if (parentPinInput.length < 6) {
                        const nextVal = parentPinInput + key;
                        setParentPinInput(nextVal);
                        if (nextVal.length === 6) {
                          handleVerifyParentPin(nextVal);
                        }
                      }
                    }}
                    style={{
                      padding: '14px',
                      borderRadius: '16px',
                      border: '1.5px solid #f1f5f9',
                      background: isClear || isBack ? '#f8fafc' : '#ffffff',
                      color: isClear ? '#ef4444' : isBack ? '#64748b' : '#0f172a',
                      fontSize: isBack ? '1.1rem' : '1.25rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
                      transition: 'all 0.12s ease'
                    }}
                    className="hover-scale"
                  >
                    {key}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowParentPinModal(false);
              }}
              style={{
                marginTop: '6px',
                padding: '10px 18px',
                borderRadius: '100px',
                background: '#f1f5f9',
                color: '#64748b',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

