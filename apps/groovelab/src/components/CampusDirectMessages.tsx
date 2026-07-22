import React, { useState, useEffect, useRef } from 'react';
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
  
  if (role === 'admin' || role === 'secretary' || roles.includes('admin') || roles.includes('secretary')) {
    return '/campus_login_hero.png';
  }
  
  if (role === 'student') {
    const studentInstrument = u.instrument || 'Nicht festgelegt';
    const inst = studentInstrument.toLowerCase().trim();
    if (inst.includes('guitar') || inst.includes('gitarre')) {
      if (u.photo_url && (u.photo_url.includes('egitarre_avatar') || u.photo_url.includes('gitarre_avatar_new'))) {
        return u.photo_url;
      }
      return '/avatars/gitarre_avatar_new.png';
    }
    return getInstrumentAvatarUrl(studentInstrument);
  } else {
    // Teachers
    return getInstrumentAvatarUrl(u.instrument);
  }
};

const formatStudentDisplayName = (u: any): string => {
  if (!u) return '';
  const firstName = u.first_name || '';
  const lastName = u.last_name || '';
  if (u.role === 'student' && lastName.trim()) {
    return `${firstName} ${lastName.trim().charAt(0)}.`;
  }
  return `${firstName} ${lastName}`.trim();
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
}

export default function CampusDirectMessages({
  user,
  schoolUsers,
  campusMessages,
  onSendMessage,
  onMarkAsRead,
  selectedRecipient,
  setSelectedRecipient,
  studentToTeacherChat = true
}: CampusDirectMessagesProps) {
  console.log('[CampusDirectMessages Debug]', {
    user,
    schoolUsersLength: schoolUsers?.length,
    schoolUsersSample: schoolUsers?.[0],
    isStudent: user?.role?.toLowerCase() === 'student'
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [typedMessage, setTypedMessage] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'system'>('chat');
  const [assignedStudents, setAssignedStudents] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  const isTeacherOrStaff = 
    user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'secretary' ||
    (typeof window !== 'undefined' && ['teacher', 'admin', 'secretary'].includes((sessionStorage.getItem('groovelab_user_role') || localStorage.getItem('groovelab_user_role') || '').toLowerCase()));

  const isStudent = !isTeacherOrStaff && (user?.role?.toLowerCase() === 'student' || (typeof window !== 'undefined' && sessionStorage.getItem('groovelab_user_role') === 'student'));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isStudent) return;
    const fetchAssignedStudents = async () => {
      try {
        const teacherId = user?.id || (typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_user_id') || localStorage.getItem('groovelab_user_id')) : null);
        const studentMap = new Map<string, any>();

        // 1. Unconditional direct queries for all non-staff users and pending_students
        try {
          const { data: allUsersInDb } = await supabase.from('users').select('*');
          (allUsersInDb || []).forEach((u: any) => {
            if (u && u.id && u.id !== teacherId) {
              const r = (u.role || '').toLowerCase();
              if (r !== 'teacher' && r !== 'admin' && r !== 'secretary') {
                studentMap.set(u.id, u);
              }
            }
          });
        } catch (e) {}

        try {
          const { data: allPendingInDb } = await supabase.from('pending_students_decrypted').select('*');
          (allPendingInDb || []).forEach((p: any) => {
            if (p && p.id && p.id !== teacherId) {
              studentMap.set(p.id, { ...p, role: 'student', isPendingOnboarding: true });
            }
          });
        } catch (e) {}

        // 1b. Fetch current user's profile to resolve exact school_id from all possible sources
        let targetSchoolId = user?.school_id || user?.schoolId || (Array.isArray(user?.schools) ? user.schools[0]?.id : user?.schools?.id);
        if (!targetSchoolId && typeof window !== 'undefined') {
          targetSchoolId = sessionStorage.getItem('groovelab_school_id') || 
                           localStorage.getItem('groovelab_school_id') || 
                           sessionStorage.getItem('school_id') || 
                           localStorage.getItem('school_id');
        }
        if (!targetSchoolId && teacherId) {
          try {
            const { data: me } = await supabase.from('users').select('school_id').eq('id', teacherId).maybeSingle();
            if (me?.school_id) targetSchoolId = me.school_id;
          } catch (e) {}
        }
        if (!targetSchoolId) {
          try {
            const { data: anyUser } = await supabase.from('users').select('school_id').not('school_id', 'is', null).limit(1).maybeSingle();
            if (anyUser?.school_id) targetSchoolId = anyUser.school_id;
          } catch (e) {}
        }

        const schoolIds = new Set<string>();
        if (targetSchoolId) schoolIds.add(targetSchoolId);
        if (user?.school_id) schoolIds.add(user.school_id);
        if (Array.isArray(user?.schools)) user.schools.forEach((s: any) => { if (s?.id) schoolIds.add(s.id); });

        try {
          const { data: allSchools } = await supabase.from('schools').select('id');
          (allSchools || []).forEach(s => { if (s?.id) schoolIds.add(s.id); });
        } catch (e) {}

        // 1b. Direct teacher_id queries (Fetch all students assigned to this teacher regardless of onboarding or activation)
        if (teacherId) {
          try {
            const { data: byTeacher } = await supabase.from('users').select('*').eq('teacher_id', teacherId);
            (byTeacher || []).forEach(u => {
              if (u && u.id && u.id !== teacherId) studentMap.set(u.id, u);
            });
          } catch (e) {}

          try {
            const { data: pByTeacher } = await supabase.from('pending_students_decrypted').select('*').eq('teacher_id', teacherId);
            (pByTeacher || []).forEach(p => {
              if (p && p.id && p.id !== teacherId) studentMap.set(p.id, { ...p, role: 'student', isPendingOnboarding: true });
            });
          } catch (e) {}

          try {
            const { data: schedByTeacher } = await supabase.from('schedules').select('*, student:users!student_id(*)').eq('teacher_id', teacherId);
            (schedByTeacher || []).forEach((sc: any) => {
              const u = sc.student || sc.users;
              if (u && u.id && u.id !== teacherId) studentMap.set(u.id, u);
            });
          } catch (e) {}
        }

        // 2. Query each school using exact TeacherDashboard query pattern: eq('school_id', sid).eq('role', 'student')
        for (const sid of Array.from(schoolIds)) {
          try {
            const { data: sExact } = await supabase.from('users').select('*').eq('school_id', sid).eq('role', 'student').order('first_name');
            (sExact || []).forEach(u => {
              if (u && u.id && u.id !== teacherId) {
                studentMap.set(u.id, u);
              }
            });
          } catch (e) {}

          try {
            const { data: sData } = await supabase.from('users').select('*').eq('school_id', sid).order('first_name');
            (sData || []).forEach(u => {
              if (u && u.id && u.id !== teacherId) {
                const r = (u.role || '').toLowerCase();
                if (r !== 'teacher' && r !== 'admin' && r !== 'secretary') {
                  studentMap.set(u.id, u);
                }
              }
            });
          } catch (e) {}

          try {
            const { data: scheds } = await supabase.from('schedules').select('*, student:users!student_id(*)').eq('school_id', sid);
            (scheds || []).forEach((sc: any) => {
              const u = sc.student || sc.users;
              if (u && u.id && u.id !== teacherId) {
                const r = (u.role || '').toLowerCase();
                if (r !== 'teacher' && r !== 'admin' && r !== 'secretary') {
                  studentMap.set(u.id, u);
                }
              }
            });
          } catch (e) {}

          try {
            const { data: occs } = await supabase.from('schedule_occurrences').select('*, student:users!student_id(*)').eq('school_id', sid);
            (occs || []).forEach((sc: any) => {
              const u = sc.student || sc.users;
              if (u && u.id && u.id !== teacherId) {
                const r = (u.role || '').toLowerCase();
                if (r !== 'teacher' && r !== 'admin' && r !== 'secretary') {
                  studentMap.set(u.id, u);
                }
              }
            });
          } catch (e) {}
        }

        // 3. Global fallbacks across role = 'student' and all non-staff users
        try {
          const { data: sRoles } = await supabase.from('users').select('*').eq('role', 'student').order('first_name');
          (sRoles || []).forEach(u => {
            if (u && u.id && u.id !== teacherId) studentMap.set(u.id, u);
          });
        } catch (e) {}

        try {
          const { data: sAll } = await supabase.from('users').select('*').order('first_name');
          (sAll || []).forEach(u => {
            if (u && u.id && u.id !== teacherId) {
              const r = (u.role || '').toLowerCase();
              if (r !== 'teacher' && r !== 'admin' && r !== 'secretary') {
                studentMap.set(u.id, u);
              }
            }
          });
        } catch (e) {}

        // 4. Also fetch pending_students for each school and globally
        for (const sid of Array.from(schoolIds)) {
          try {
            const { data: pStudents } = await supabase.from('pending_students_decrypted').select('*').eq('school_id', sid);
            (pStudents || []).forEach(p => {
              if (p && p.id && p.id !== teacherId && !studentMap.has(p.id)) {
                studentMap.set(p.id, { ...p, role: 'student', isPendingOnboarding: true });
              }
            });
          } catch (e) {}
        }

        try {
          const { data: pAll } = await supabase.from('pending_students_decrypted').select('*');
          (pAll || []).forEach(p => {
            if (p && p.id && p.id !== teacherId && !studentMap.has(p.id)) {
              studentMap.set(p.id, { ...p, role: 'student', isPendingOnboarding: true });
            }
          });
        } catch (e) {}

        // 5. Incorporate window.__groovelabAllStudents if set by TeacherDashboard
        if (typeof window !== 'undefined' && Array.isArray((window as any).__groovelabAllStudents)) {
          (window as any).__groovelabAllStudents.forEach((u: any) => {
            if (u && u.id && u.id !== teacherId && !studentMap.has(u.id)) {
              studentMap.set(u.id, u);
            }
          });
        }

        // Incorporate all users passed from parent schoolUsers
        (schoolUsers || []).forEach((u: any) => {
          if (u && u.id && u.id !== teacherId) {
            const r = (u.role || '').toLowerCase();
            if (r !== 'teacher' && r !== 'admin' && r !== 'secretary') {
              studentMap.set(u.id, u);
            }
          }
        });

        // Incorporate message partners from campusMessages
        if (campusMessages && campusMessages.length > 0) {
          campusMessages.forEach((m: any) => {
            const partnerId = m.sender_id === user?.id ? m.recipient_id : m.sender_id;
            if (partnerId && partnerId !== teacherId && !studentMap.has(partnerId)) {
              const existingInSchool = (schoolUsers || []).find((su: any) => su.id === partnerId);
              if (existingInSchool) {
                studentMap.set(partnerId, existingInSchool);
              }
            }
          });
        }

        const result = Array.from(studentMap.values());
        console.log('[CampusDirectMessages] Total fetched students:', result.length, result.map(s => s.first_name));
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
    if (msg.occurrence_id) return true;
    const content = msg.content || '';
    if (content.includes('Unterrichtstermin') || 
        content.includes('Termin wurde') || 
        content.includes('Termin storniert') || 
        content.includes('Termin bestätigt') ||
        content.includes('regulären Termin') ||
        content.includes('verschoben von:') ||
        content.includes('wieder auf deinen ursprünglichen') ||
        content.includes('abgesagt.') ||
        content.includes('Verschiebung') ||
        content.includes('abgelehnt')) {
      return true;
    }
    return false;
  };

  // Combine schoolUsers, window.__groovelabAllStudents, and assignedStudents
  const windowStudents = (typeof window !== 'undefined' && Array.isArray((window as any).__groovelabAllStudents)) ? (window as any).__groovelabAllStudents : [];
  const allAvailableUsersMap = new Map<string, any>();
  [...schoolUsers, ...windowStudents, ...assignedStudents].forEach(u => {
    if (u && u.id) {
      allAvailableUsersMap.set(u.id, u);
    }
  });
  const allAvailableUsers = Array.from(allAvailableUsersMap.values());

  // Get potential chat partners (Includes ALL non-staff students in the school)
  const chatPartners = allAvailableUsers.filter(u => {
    if (u.id === user.id) return false;
    if (selectedRecipient && u.id === selectedRecipient.id) return true;
    if (isStudent) {
      return (u.role === 'teacher' || (Array.isArray(u.roles) && u.roles.includes('teacher'))) && 
        (String(u.id) === String(user.teacher_id) || (Array.isArray(user.teacher_ids) && user.teacher_ids.map(String).includes(String(u.id))));
    }

    const role = (u.role || '').toLowerCase();
    const roles = Array.isArray(u.roles) ? u.roles.map((r: any) => String(r).toLowerCase()) : [];
    const isStaffUser = role === 'teacher' || role === 'admin' || role === 'secretary' ||
                        roles.includes('teacher') || roles.includes('admin') || roles.includes('secretary');

    if (isStaffUser) return false;

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

    const lastMessage = threadMessages[threadMessages.length - 1];
    const unreadCount = threadMessages.filter(m => 
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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !selectedRecipient) return;
    
    const messageText = typedMessage.trim();
    setTypedMessage('');
    await onSendMessage(selectedRecipient.id, messageText);
    setTimeout(scrollToBottom, 50);
  };

  // Get active messages in the current thread (sorted chronologically)
  const activeThreadMessages = selectedRecipient
    ? [...campusMessages]
        .filter(m => 
          (m.sender_id === user.id && m.recipient_id === selectedRecipient.id) ||
          (m.sender_id === selectedRecipient.id && m.recipient_id === user.id)
        )
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    : [];

  const systemMessages = activeThreadMessages.filter(isSystemMessage);
  const directChatMessages = activeThreadMessages.filter(m => !isSystemMessage(m));
  const displayedMessages = activeSubTab === 'chat' ? directChatMessages : systemMessages;

  return (
    <div className="animation-slide-up" style={{ 
      padding: isMobile ? '8px 4px 4px 4px' : '24px 10px 10px 10px', 
      display: 'flex', 
      gap: isMobile ? '0' : '24px', 
      height: 'calc(100vh - 140px)', 
      minHeight: isMobile ? '550px' : '700px',
      fontFamily: '"Outfit", "Inter", sans-serif'
    }}>
      {/* Left Pane: Partners / Chats List */}
      <div className="glass-panel" style={{ 
        background: 'white', 
        borderRadius: isMobile ? '16px' : '24px', 
        width: isMobile && selectedRecipient ? '0px' : isMobile ? '100%' : '380px', 
        display: isMobile && selectedRecipient ? 'none' : 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden', 
        border: '1px solid #f1f5f9',
        boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
        flexShrink: 0,
        transition: 'all 0.3s ease'
      }}>
        {/* Search & Header */}
        <div style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={22} color="#1e293b" />
                <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1e293b', margin: '0' }}>Nachrichten</h2>
              </div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginTop: '2px' }}>
                {isStudent ? 'Kommunikation mit deinen Lehrern' : 'Kommunikation mit deinen Schülern'}
              </p>
            </div>
            {(!isStudent || studentToTeacherChat) && (
              <button 
                onClick={() => setShowNewChatModal(true)}
                style={{
                  background: '#34a853',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 8px rgba(52, 168, 83, 0.15)'
                }}
                className="hover-scale"
                type="button"
              >
                <Plus size={14} />
                <span>Neu</span>
              </button>
            )}
          </div>
          
          <div style={{ position: 'relative' }}>
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
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={() => setFilterType('all')}
              style={{
                padding: '6px 16px',
                borderRadius: '999px',
                border: 'none',
                background: filterType === 'all' ? '#34a853' : '#e2e8f0',
                color: filterType === 'all' ? 'white' : '#64748b',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Alle
            </button>
            <button
              onClick={() => setFilterType('unread')}
              style={{
                padding: '6px 16px',
                borderRadius: '999px',
                border: 'none',
                background: filterType === 'unread' ? '#34a853' : '#e2e8f0',
                color: filterType === 'unread' ? 'white' : '#64748b',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
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

        {/* Partners List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }} className="custom-scrollbar">
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
                    padding: '14px 16px',
                    borderRadius: '16px',
                    background: isSelected ? 'linear-gradient(135deg, #e6f4ea, #e6f4ea)' : 'transparent',
                    border: '1px solid transparent',
                    cursor: 'pointer',
                    marginBottom: '6px',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    textAlign: 'left'
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
                        background: '#34a853',
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
                        boxShadow: '0 2px 5px rgba(52, 168, 83, 0.3)'
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
                    onClick={() => setSelectedRecipient(null)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      color: '#ffffff',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backdropFilter: 'blur(4px)'
                    }}
                  >
                    <ArrowLeft size={18} />
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
                  <span>100% DSGVO-konformer Schulchat</span>
                </span>
              </div>
            </div>

            {/* Sub-Tab Bar: Direktnachrichten vs. Termin-System */}
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              padding: '10px 20px', 
              background: '#ffffff', 
              borderBottom: '1px solid #f1f5f9',
              alignItems: 'center'
            }}>
              <button
                type="button"
                onClick={() => setActiveSubTab('chat')}
                style={{
                  padding: '7px 16px',
                  borderRadius: '100px',
                  border: 'none',
                  background: activeSubTab === 'chat' ? '#34a853' : '#f1f5f9',
                  color: activeSubTab === 'chat' ? 'white' : '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                className="hover-scale"
              >
                <MessageSquare size={13} />
                <span>Direktnachrichten ({directChatMessages.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('system')}
                style={{
                  padding: '7px 16px',
                  borderRadius: '100px',
                  border: 'none',
                  background: activeSubTab === 'system' ? '#34a853' : '#f1f5f9',
                  color: activeSubTab === 'system' ? 'white' : '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                className="hover-scale"
              >
                <Calendar size={13} />
                <span>Termin-System ({systemMessages.length})</span>
              </button>
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
              {displayedMessages.length === 0 ? (
                activeSubTab === 'chat' ? (
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
                      Noch keine Direktnachrichten mit {formatStudentDisplayName(selectedRecipient)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '320px' }}>
                      Schreibe eine persönliche Nachricht oder Fragen zum Unterricht!
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', gap: '12px', padding: '40px 20px', textAlign: 'center' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b'
                    }}>
                      <Calendar size={30} strokeWidth={2} />
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                      Keine Termin-Systemnachrichten
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '320px' }}>
                      Hier erscheinen automatische Nachrichten zu Terminverlegungen und Absagen.
                    </div>
                  </div>
                )
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
                        flexDirection: 'column',
                        alignItems: isSelf ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        alignSelf: isSelf ? 'flex-end' : 'flex-start',
                        gap: '4px'
                      }}
                    >
                      {/* Appointment Badge */}
                      {isAppointmentLinked && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: isSelf ? 'rgba(52, 168, 83, 0.12)' : '#e6f4ea',
                          border: '1px solid rgba(52, 168, 83, 0.25)',
                          color: '#15803d',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: '8px',
                          marginBottom: '2px'
                        }}>
                          <Calendar size={11} color="#34a853" />
                          <span>Termin-Bezug</span>
                        </div>
                      )}

                      <div 
                        style={{
                          padding: '12px 18px',
                          borderRadius: isSelf ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
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
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8' }}>
                        <span>
                          {new Date(msg.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}, {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isSelf && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '2px' }}>
                            <CheckCheck size={14} color={msg.is_read ? '#15803d' : '#94a3b8'} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer with Quick Replies */}
            {isStudent && user?.app_usage_mode === 'parent_hybrid' && !user?.parent_allow_chat ? (
              <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#fef2f2', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center' }}>
                🔒 Eltern-Sperre: Das Senden von Chat-Nachrichten wurde von deinen Eltern deaktiviert.
              </div>
            ) : (
              <div style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc', padding: isMobile ? '8px 12px 12px 12px' : '12px 24px' }}>
                {/* Quick Replies Pill Bar */}
                <div style={{
                  display: 'flex',
                  gap: '6px',
                  overflowX: 'auto',
                  paddingBottom: '8px',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}>
                  {['👍 Daumen hoch', '🎶 Passt, danke!', '⏳ 5 Min später', '📅 Termin bestätigt', '🎹 Alles klar!'].map((reply, idx) => (
                    <button
                      key={`qr-${idx}`}
                      type="button"
                      onClick={() => setTypedMessage(reply)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '100px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        color: '#475569',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        flexShrink: 0
                      }}
                      className="hover-scale"
                    >
                      {reply}
                    </button>
                  ))}
                </div>

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
                    Campus-Groovelab Nachrichten & Shoutbox
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                    100% DSGVO-konforme Direktnachrichten & termingekoppelte Abstimmungen
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
                    Wähle einen Chat aus der linken Liste oder starte direkt eine neue Unterhaltung.
                  </p>
                </div>

                {(!isStudent || studentToTeacherChat) && (
                  <button
                    onClick={() => setShowNewChatModal(true)}
                    style={{
                      background: '#34a853',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px 18px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(52, 168, 83, 0.25)',
                      whiteSpace: 'nowrap'
                    }}
                    className="hover-scale"
                    type="button"
                  >
                    <Plus size={16} />
                    <span>Neuen Chat starten</span>
                  </button>
                )}
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

      {showNewChatModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 4000,
          background: 'rgba(242, 242, 247, 0.65)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel animation-slide-up" style={{
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '28px',
            borderRadius: '24px',
            maxWidth: '460px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            position: 'relative',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            boxShadow: '0 30px 60px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <button 
              onClick={() => {
                setShowNewChatModal(false);
                setNewChatSearch('');
              }} 
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'rgba(0,0,0,0.05)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
              type="button"
            >
              <X size={16} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', margin: '0 0 4px 0' }}>
              Neue Nachricht ({chatPartners.length})
            </h3>
            
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder={isStudent ? "Lehrer suchen..." : "Schüler suchen..."}
                value={newChatSearch}
                onChange={e => setNewChatSearch(e.target.value)}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '45vh', paddingRight: '4px' }}>
              {chatPartners
                .filter(u => `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(newChatSearch.toLowerCase()))
                .map(u => {
                  const avatarSrc = resolveCampusAvatar(u);
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSelectedRecipient(u);
                        setShowNewChatModal(false);
                        setNewChatSearch('');
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '14px',
                        border: '1px solid #f1f5f9',
                        background: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                      className="hover-scale-mini"
                      type="button"
                    >
                      <img 
                        src={avatarSrc} 
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} 
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.85rem' }}>{formatStudentDisplayName(u)}</span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{u.instrument || (u.role === 'teacher' ? 'Lehrer' : 'Schüler')}</span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

