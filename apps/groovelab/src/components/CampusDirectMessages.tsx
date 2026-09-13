import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { CampusGroovelabText } from './CampusGroovelabBrand';
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
  CheckCheck, 
  Loader2, 
  ChevronDown, 
  RotateCcw, 
  AlertTriangle, 
  ArrowRight, 
  Music, 
  HeartHandshake, 
  Moon, 
  Phone, 
  Fingerprint,
  Users,
  Guitar,
  Mic,
  Headphones,
  Radio,
  Trophy,
  Flame,
  Layers,
  Compass,
  Info,
  GraduationCap,
  Hash,
  Bell,
  Trash2,
  Sliders,
  MessageCircle,
  Flag
} from 'lucide-react';
import { isWebAuthnSupported, authenticateParentBiometricPasskey } from '../utils/webauthn';
import { formatTeacherFullName, formatSingleStudentAnonymized, formatStudentPureFirstName } from '../utils/nameHelper';
import { isUUID } from '../utils/uuidValidator';
import { 
  validateChatMessageContent, 
  isQuietHoursActive, 
  ChatRespectValidationResult,
  cleanChatMessageContent
} from '../utils/chatRespectGuard';
import { getInstrumentAvatarUrl, resolveCampusStudentAvatar } from './StudioAvatar';
import { CampusCreateGroupModal } from './CampusCreateGroupModal';
import { CampusCreateChannelModal } from './CampusCreateChannelModal';
import { CampusTopicCard, CampusTopicReaction } from './CampusTopicCard';
import { CampusTopicComposer } from './CampusTopicComposer';
import { logSecurityEvent } from '../services/auditLogService';

export const getGroupIconComponent = (iconId: string) => {
  switch (iconId) {
    case 'users': return Users;
    case 'guitar': return Guitar;
    case 'mic': return Mic;
    case 'headphones': return Headphones;
    case 'radio': return Radio;
    case 'sparkles': return Sparkles;
    case 'trophy': return Trophy;
    case 'flame': return Flame;
    case 'layers': return Layers;
    case 'compass': return Compass;
    case 'award': return Trophy;
    case 'music':
    default:
      return Music;
  }
};

const resolveCampusAvatar = (u: any): string => {
  if (!u) return '/avatars/gitarre_avatar_new.png';
  const role = (u.role || '').toLowerCase();
  const roles = Array.isArray(u.roles) ? u.roles.map((r: any) => String(r).toLowerCase()) : [];
  
  // Teachers in Campus module must ALWAYS display their instrument avatar (per AGENTS.md)!
  const isTeacher = role === 'teacher' || roles.includes('teacher');
  if (isTeacher) {
    return resolveCampusStudentAvatar({ ...u, role: 'teacher', isTeacherContext: true });
  }

  if (role === 'admin' || role === 'secretary' || roles.includes('admin') || roles.includes('secretary')) {
    return '/campus_login_hero.png';
  }
  
  if (role === 'student') {
    return resolveCampusStudentAvatar(u);
  }
  return resolveCampusStudentAvatar(u);
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
    return formatTeacherFullName(u);
  }

  // Only abbreviate last name for STUDENTS (per AGENTS.md rule)
  if (role === 'student' || role === 'pupil') {
    const isStudentViewer = typeof window !== 'undefined' && sessionStorage.getItem('groovelab_active_workspace') === 'student';
    if (isStudentViewer) {
      return formatStudentPureFirstName(u.first_name);
    }
    return formatSingleStudentAnonymized(u.first_name, u.full_last_name || u.last_name, u.id);
  }

  if (u.first_name && (u.full_last_name || u.last_name)) {
    return `${u.first_name} ${u.full_last_name || u.last_name}`.trim();
  }
  return u.first_name || u.name || 'Benutzer';
};

export { cleanChatMessageContent };

const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(dateStr);
};

interface AppleSystemNotificationCardProps {
  msg: any;
  selectedRecipient?: any;
  onSendMessage?: (recipientId: string, content: string) => Promise<void>;
  isSuperseded?: boolean;
  currentOcc?: any;
}

const AppleSystemNotificationCard: React.FC<AppleSystemNotificationCardProps> = ({ 
  msg, 
  selectedRecipient, 
  onSendMessage,
  isSuperseded = false,
  currentOcc
}) => {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDoneStatus, setActionDoneStatus] = useState<'confirmed' | 'rejected' | null>(null);

  const content: string = msg.content || '';
  const cleanContent = String(content || '').replace(/^\[Termin[^\]]+\]\s*/i, '').trim();

  const isReactivation = msg.message_type === 'cancellation_reset' ||
    (content && (content.includes('🔄') || content.includes('zurückgesetzt') || content.includes('wiederhergestellt') || content.includes('reaktiviert') || content.includes('zurückgenommen') || content.includes('regulär statt')));

  const isCancellation = msg.message_type === 'reschedule_notification' ||
    (content && (content.includes('❌') || content.includes('Termin abgesagt') || content.includes('fällt aus') || content.includes('abgesagt') || content.includes('storniert') || content.includes('wurde abgesagt')));

  // 1. Reaktivierungs-Eventkarte (Audit-Proof, 100% identisch mit Shoutbox-Modal)
  // 1. Reaktivierungs-Eventkarte (Audit-Proof & Monochrom)
  if (isReactivation) {
    const lines = cleanContent
      .replace(/[❌🔄🕒✅🔒⚠️]/gu, '')
      .split('\n')
      .map((l: string) => l.trim())
      .filter(Boolean);
    const mainMsg = lines[0] || 'Termin reaktiviert: Der Unterricht findet planmäßig statt.';
    const timeLine = lines.find((l: string) => l.toLowerCase().includes('reaktiviert am')) ||
      `Reaktiviert am ${new Date(msg.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um ${new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;

    return (
      <div style={{ alignSelf: 'center', width: '100%', maxWidth: '96%', margin: '4px 0' }}>
        <div style={{
          background: '#f0fdf4',
          border: '1.5px solid #86efac',
          borderRadius: '18px',
          padding: '12px 18px',
          boxShadow: '0 2px 8px rgba(34, 197, 94, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
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
          <div style={{ fontSize: '0.90rem', color: '#166534', fontWeight: 650, lineHeight: 1.45, wordBreak: 'break-word', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
              <RotateCcw size={13} color="#15803d" strokeWidth={2.4} style={{ flexShrink: 0, marginTop: '3px' }} />
              <span>{mainMsg}</span>
            </div>
            <div style={{ marginTop: '2px', fontSize: '0.76rem', color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Clock size={12} color="#166534" style={{ flexShrink: 0 }} />
              <span>{timeLine}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Stornierungs-/Absage-Eventkarte (Audit-Proof & Monochrom)
  if (isCancellation) {
    const lines = cleanContent
      .replace(/[❌🔄🕒✅🔒⚠️]/gu, '')
      .split('\n')
      .map((l: string) => l.trim())
      .filter(Boolean);
    const mainMsg = lines[0] || 'Dieser Termin wurde abgesagt.';
    const timeLine = lines.find((l: string) => l.toLowerCase().includes('abgemeldet am') || l.toLowerCase().includes('abgesagt am')) ||
      `Abgemeldet am ${new Date(msg.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um ${new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;

    return (
      <div style={{ alignSelf: 'center', width: '100%', maxWidth: '96%', margin: '4px 0' }}>
        <div style={{
          background: '#fef2f2',
          border: '1.5px dashed #fca5a5',
          borderRadius: '18px',
          padding: '12px 18px',
          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
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
          <div style={{ fontSize: '0.90rem', color: '#991b1b', fontWeight: 650, lineHeight: 1.45, wordBreak: 'break-word', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
              <X size={13} color="#dc2626" strokeWidth={2.4} style={{ flexShrink: 0, marginTop: '3px' }} />
              <span>{mainMsg}</span>
            </div>
            <div style={{ marginTop: '2px', fontSize: '0.76rem', color: '#b91c1c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Clock size={12} color="#b91c1c" style={{ flexShrink: 0 }} />
              <span>{timeLine}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
    isShift = true;

    // Check if shift is still active and pending confirmation
    if (isSuperseded) {
      badgeText = 'Nicht mehr aktuell';
      isPending = false;
    } else if (currentOcc && (currentOcc.status === 'confirmed' || (currentOcc.status === 'scheduled' && !currentOcc.is_rescheduled && !currentOcc.rescheduled_from))) {
      badgeText = currentOcc.status === 'confirmed' ? 'Bestätigt' : 'Nicht mehr aktuell';
      isPending = false;
    } else if (currentOcc && (currentOcc.status === 'cancelled' || currentOcc.status === 'canceled_by_student')) {
      badgeText = 'Abgesagt';
      isPending = false;
    } else {
      badgeText = 'Bestätigung ausstehend';
      isPending = true;
    }

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
  } else if (content.includes('abgelehnt')) {
    title = 'Verschiebung abgelehnt';
    badgeText = 'Abgelehnt';
    note = content.replace(/❌/g, '').trim();
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
  } else if (badgeText === 'Bestätigt' || badgeText === 'Termin regulär' || badgeText === 'Regulär' || badgeText === 'Reaktiviert') {
    // Soft Muted Green (Confirmed / Regular)
    badgeBg = '#e6f4ea';
    badgeColor = '#15803d';
    badgeBorder = '#bbf7d0';
  } else if (badgeText === 'Termin zurückgesetzt' || badgeText === 'Nicht mehr aktuell') {
    // Soft Slate Gray (Reset / Superseded)
    badgeBg = '#f1f5f9';
    badgeColor = '#475569';
    badgeBorder = '#e2e8f0';
  } else if (badgeText === 'Abgelehnt' || badgeText === 'Abgesagt') {
    // Soft Muted Rose (Rejected / Canceled)
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
            gap: '10px',
            margin: '2px 0',
            flexWrap: 'wrap',
            minWidth: 0
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Bisher</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', overflowWrap: 'break-word' }}>{oldTime}</span>
            </div>

            <div style={{
              color: '#34a853',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <ArrowRight size={14} strokeWidth={2.6} color="#34a853" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right', minWidth: 0 }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>Neu</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#15803d', overflowWrap: 'break-word' }}>{newTime}</span>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500, margin: 0, lineHeight: 1.5, whiteSpace: 'pre-line', overflowWrap: 'break-word' }}>
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
            borderTop: '1px solid #f8fafc',
            flexWrap: 'wrap'
          }}>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleConfirm}
              style={{
                flex: 1,
                minWidth: '120px',
                minHeight: '44px',
                padding: '8px 14px',
                borderRadius: '100px',
                border: 'none',
                background: '#34a853',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                boxShadow: '0 2px 6px rgba(52, 168, 83, 0.15)',
                touchAction: 'manipulation'
              }}
              className="hover-scale"
            >
              <Check size={13} color="#ffffff" strokeWidth={2.5} />
              <span>{actionLoading ? 'Bestätige...' : 'Bestätigen'}</span>
            </button>

            <button
              type="button"
              disabled={actionLoading}
              onClick={handleReject}
              style={{
                flex: 1,
                minWidth: '120px',
                minHeight: '44px',
                padding: '8px 14px',
                borderRadius: '100px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#64748b',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                touchAction: 'manipulation'
              }}
              className="hover-scale"
            >
              <X size={13} color="#64748b" strokeWidth={2.5} />
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
  currentUserId?: string;
  schoolUsers: any[];
  campusMessages: any[];
  onSendMessage: (
    recipientId: string, 
    content: string, 
    groupId?: string, 
    channelId?: string, 
    parentMessageId?: string, 
    subject?: string
  ) => Promise<any>;
  onMarkAsRead: (senderId: string) => Promise<void>;
  onMarkGroupAsRead?: (groupId: string) => Promise<void>;
  onMarkChannelAsRead?: (channelId: string, groupId: string) => Promise<void>;
  selectedRecipient: any;
  setSelectedRecipient: (recipient: any) => void;
  studentToTeacherChat?: boolean;
  onNavigateToSchedule?: (dateStr?: string) => void;
}

export function CampusDirectMessages({
  user,
  currentUserId,
  schoolUsers,
  campusMessages,
  onSendMessage,
  onMarkAsRead,
  onMarkGroupAsRead,
  onMarkChannelAsRead,
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
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');
  const [activeSubTab, setActiveSubTab] = useState<string>('all');
  const [assignedStudents, setAssignedStudents] = useState<any[]>([]);
  const [respectWarning, setRespectWarning] = useState<ChatRespectValidationResult | null>(null);

  // Groups & Channels State
  const [activeMainTab, setActiveMainTab] = useState<'students' | 'groups'>('students');
  const [campusGroups, setCampusGroups] = useState<any[]>([]);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [groupMembersDetails, setGroupMembersDetails] = useState<any[]>([]);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);
  const [groupChannels, setGroupChannels] = useState<any[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [channelViewModeOverrides, setChannelViewModeOverrides] = useState<Record<string, 'chat' | 'threads'>>({});
  const [oneOnOneMode, setOneOnOneMode] = useState<'chat' | 'threads'>('chat');
  const [isTopicComposerOpen, setIsTopicComposerOpen] = useState(false);
  const [focusedTopicId, setFocusedTopicId] = useState<string | null>(null);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [messageReactions, setMessageReactions] = useState<CampusTopicReaction[]>([]);
  const [reportingMessage, setReportingMessage] = useState<any | null>(null);
  const [reportToast, setReportToast] = useState<string | null>(null);

  const handleInitiateReport = (msg: any) => {
    const lastReportKey = `cgl_last_report_${selectedRecipient?.id || 'general'}`;
    const lastReportTime = Number(localStorage.getItem(lastReportKey) || 0);
    const now = Date.now();
    if (now - lastReportTime < 24 * 60 * 60 * 1000) {
      setReportToast('Du hast für diese Gruppe heute bereits eine Meldung gesendet. Deine Lehrkraft ist bereits informiert.');
      setTimeout(() => setReportToast(null), 4000);
      return;
    }
    setReportingMessage(msg);
  };

  const handleConfirmReport = async (reasonText: string) => {
    if (!reportingMessage) return;
    const lastReportKey = `cgl_last_report_${selectedRecipient?.id || 'general'}`;
    localStorage.setItem(lastReportKey, String(Date.now()));
    try {
      await supabase.from('audit_logs').insert({
        action: 'group_message_reported',
        entity_type: 'chat_message',
        entity_id: reportingMessage.id,
        details: {
          reason: reasonText,
          reporter_id: user?.id,
          group_id: selectedRecipient?.id,
          content_preview: String(reportingMessage.content || '').substring(0, 80)
        }
      });
    } catch (err) {
      console.warn('Silent audit log notice:', err);
    }
    setReportingMessage(null);
    setReportToast('Meldung vertraulich an deine Lehrkraft übermittelt. Danke für deine Mithilfe!');
    setTimeout(() => setReportToast(null), 4000);
  };

  const isRecipientInQuietHours = useMemo(() => {
    if (!selectedRecipient) return false;
    const role = (selectedRecipient.role || '').toLowerCase();
    const roles = Array.isArray(selectedRecipient.roles) ? selectedRecipient.roles.map((r: any) => String(r).toLowerCase()) : [];
    const isTeacher = role === 'teacher' || roles.includes('teacher');
    if (!isTeacher) return false;
    return isQuietHoursActive(selectedRecipient.quiet_hours);
  }, [selectedRecipient]);
  const checkIsMobile = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || Boolean(document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait'));
  };

  const [isMobile, setIsMobile] = useState(checkIsMobile);

// 🛡️ Tier-1 Enterprise+ Local Storage Read Receipts Cache (Offline-First / Zero-Bounce)
const getLocalChannelReads = (uid: string): Map<string, number> => {
  const map = new Map<string, number>();
  if (typeof window === 'undefined' || !uid) return map;
  try {
    const raw = localStorage.getItem(`cgl_channel_reads_${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.entries(parsed).forEach(([k, v]) => {
        if (typeof v === 'number') map.set(k, v);
      });
    }
  } catch (e) {}
  return map;
};

const saveLocalChannelRead = (uid: string, channelId: string, timestamp: number) => {
  if (typeof window === 'undefined' || !uid || !channelId) return;
  try {
    const key = `cgl_channel_reads_${uid}`;
    const raw = localStorage.getItem(key);
    const obj = raw ? JSON.parse(raw) : {};
    if (!obj[channelId] || obj[channelId] < timestamp) {
      obj[channelId] = timestamp;
      localStorage.setItem(key, JSON.stringify(obj));
    }
  } catch (e) {}
};

const getLocalGroupReads = (uid: string): Map<string, number> => {
  const map = new Map<string, number>();
  if (typeof window === 'undefined' || !uid) return map;
  try {
    const raw = localStorage.getItem(`cgl_group_reads_${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.entries(parsed).forEach(([k, v]) => {
        if (typeof v === 'number') map.set(k, v);
      });
    }
  } catch (e) {}
  return map;
};

const saveLocalGroupRead = (uid: string, groupId: string, timestamp: number) => {
  if (typeof window === 'undefined' || !uid || !groupId) return;
  try {
    const key = `cgl_group_reads_${uid}`;
    const raw = localStorage.getItem(key);
    const obj = raw ? JSON.parse(raw) : {};
    if (!obj[groupId] || obj[groupId] < timestamp) {
      obj[groupId] = timestamp;
      localStorage.setItem(key, JSON.stringify(obj));
    }
  } catch (e) {}
};

const getLocalDirectReads = (uid: string): Map<string, number> => {
  const map = new Map<string, number>();
  if (typeof window === 'undefined' || !uid) return map;
  try {
    const raw = localStorage.getItem(`cgl_direct_reads_${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.entries(parsed).forEach(([k, v]) => {
        if (typeof v === 'number') map.set(k, v);
      });
    }
  } catch (e) {}
  return map;
};

const saveLocalDirectRead = (uid: string, partnerId: string, timestamp: number) => {
  if (typeof window === 'undefined' || !uid || !partnerId) return;
  try {
    const key = `cgl_direct_reads_${uid}`;
    const raw = localStorage.getItem(key);
    const obj = raw ? JSON.parse(raw) : {};
    if (!obj[partnerId] || obj[partnerId] < timestamp) {
      obj[partnerId] = timestamp;
      localStorage.setItem(key, JSON.stringify(obj));
    }
  } catch (e) {}
};

const getLocalReadMsgIds = (uid: string): Set<string> => {
  const set = new Set<string>();
  if (typeof window === 'undefined' || !uid) return set;
  try {
    const raw = localStorage.getItem(`cgl_read_msg_ids_${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((id: string) => {
          if (typeof id === 'string') set.add(id);
        });
      }
    }
  } catch (e) {}
  return set;
};

const saveLocalReadMsgIds = (uid: string, msgIds: string[]) => {
  if (typeof window === 'undefined' || !uid || !msgIds || msgIds.length === 0) return;
  try {
    const key = `cgl_read_msg_ids_${uid}`;
    const raw = localStorage.getItem(key);
    let arr: string[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) arr = parsed;
      } catch (e) {}
    }
    const set = new Set(arr);
    msgIds.forEach(id => {
      if (id) set.add(id);
    });
    const updated = Array.from(set).slice(-1000);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {}
};

  const effectiveUid = currentUserId || 
    (typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_selected_student_id') || sessionStorage.getItem('groovelab_user_id')) : null) || 
    user?.id;

  const isStudentViewer = typeof window !== 'undefined' && (
    sessionStorage.getItem('groovelab_active_workspace') === 'student' ||
    Boolean(sessionStorage.getItem('groovelab_selected_student_id')) ||
    Boolean(currentUserId && currentUserId !== user?.id)
  );

  const isTeacherOrStaff = !isStudentViewer && (
    user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'secretary' ||
    (typeof window !== 'undefined' && ['teacher', 'admin', 'secretary'].includes((sessionStorage.getItem('groovelab_user_role') || localStorage.getItem('groovelab_user_role') || '').toLowerCase()))
  );

  const isStudent = isStudentViewer || (!isTeacherOrStaff && (user?.role?.toLowerCase() === 'student' || (typeof window !== 'undefined' && sessionStorage.getItem('groovelab_user_role') === 'student')));

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

      if (user?.id) {
        const { data: parentOk } = await supabase.rpc('verify_parent_pin', {
          student_id: user.id,
          input_pin: cleanInput
        });
        if (parentOk === true) isMatch = true;
      }

      if (isMatch) {
        sessionStorage.setItem('groovelab_parent_unlocked_global', 'true');
        sessionStorage.setItem(`groovelab_parent_session_${user?.id}`, String(Date.now() + 180 * 1000));
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

  const handleBiometricUnlock = async () => {
    if (!user?.id) return;
    setIsVerifyingPin(true);
    setParentPinError('');
    try {
      const authRes = await authenticateParentBiometricPasskey(
        supabase,
        user.id,
        (user as any)?.school_id || null
      );

      if (!authRes.success) {
        if (authRes.error && !authRes.error.includes('abgebrochen')) {
          setParentPinError(authRes.error);
        }
        return;
      }

      sessionStorage.setItem('groovelab_parent_unlocked_global', 'true');
      sessionStorage.setItem(`groovelab_parent_session_${user.id}`, String(Date.now() + 180 * 1000));
      setShowParentPinModal(false);
      setParentPinInput('');
      setForceUpdateTick(prev => prev + 1);
    } catch (err: any) {
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        setParentPinError(err.message || 'Passkey-Entsperrung fehlgeschlagen.');
      }
    } finally {
      setIsVerifyingPin(false);
    }
  };

  useEffect(() => {
    if (!showParentPinModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowParentPinModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showParentPinModal]);


  useEffect(() => {
    if (isStudent) {
      const fetchStudentTeachers = async () => {
        try {
          const studentId = effectiveUid || user?.id;
          if (!studentId || !isUUID(studentId)) return;

          const teacherMap = new Map<string, any>();

          // 1. Direct teacher_id on student profile
          const directTeacherId = user?.teacher_id;
          if (directTeacherId && isUUID(directTeacherId)) {
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
              .select('teacher_id')
              .eq('student_id', studentId);
            (scheds || []).forEach((sc: any) => {
              if (sc.teacher_id && !teacherMap.has(sc.teacher_id)) {
                const matchInSchool = (schoolUsers || []).find((su: any) => su.id === sc.teacher_id);
                if (matchInSchool) teacherMap.set(sc.teacher_id, matchInSchool);
              }
            });
          } catch (e) {}

          // 3. Teachers from schedule_occurrences
          try {
            const { data: occs } = await supabase
              .from('schedule_occurrences')
              .select('teacher_id')
              .eq('student_id', studentId);
            (occs || []).forEach((o: any) => {
              if (o.teacher_id && !teacherMap.has(o.teacher_id)) {
                const matchInSchool = (schoolUsers || []).find((su: any) => su.id === o.teacher_id);
                if (matchInSchool) teacherMap.set(o.teacher_id, matchInSchool);
              }
            });
          } catch (e) {}

          // 4. Staff & Teachers with existing 1:1 messages (including school administration / secretariat)
          if (campusMessages && campusMessages.length > 0) {
            campusMessages.forEach((m: any) => {
              if (m.group_id) return;
              const partnerId = m.sender_id === studentId ? m.recipient_id : m.sender_id;
              if (partnerId && partnerId !== studentId && !teacherMap.has(partnerId)) {
                const existingInSchool = (schoolUsers || []).find((su: any) => su.id === partnerId);
                if (existingInSchool) {
                  teacherMap.set(partnerId, existingInSchool);
                } else {
                  teacherMap.set(partnerId, {
                    id: partnerId,
                    first_name: 'Schulleitung',
                    last_name: 'Verwaltung',
                    role: 'admin'
                  });
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
        const teacherId = user?.id || (typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_user_id') : null);
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

  const [channelReads, setChannelReads] = useState<Map<string, number>>(() => getLocalChannelReads(effectiveUid || ''));
  const lastAutoReadRef = useRef<{ [key: string]: number }>({});
  const campusMessagesRef = useRef(campusMessages);
  campusMessagesRef.current = campusMessages;
  const channelReadsRef = useRef(channelReads);
  channelReadsRef.current = channelReads;

  const fetchCampusGroups = React.useCallback(async () => {
    const uid = effectiveUid;
    if (!uid) return;
    try {
      // 1. Groups where user is member & channel reads
      const [memberRes, channelReadsRes] = await Promise.all([
        supabase
          .from('campus_chat_group_members')
          .select('group_id, user_id, role, last_read_at')
          .eq('user_id', uid),
        supabase
          .from('campus_chat_channel_reads')
          .select('channel_id, last_read_at')
          .eq('user_id', uid)
      ]);

      const memberRows = memberRes.data;
      const mErr = memberRes.error;

      if (mErr) {
        if (mErr.message?.includes('schema cache') || mErr.code === 'PGRST205' || mErr.code === '42P01') {
          console.warn('[CampusDirectMessages] campus_chat_group_members table not in schema cache yet (Migration 407 pending).');
          setCampusGroups([]);
          return;
        }
      }

      const chReadMap = new Map<string, number>();

      // Merge local channel reads immediately (Offline-First)
      const localChReads = getLocalChannelReads(uid);
      localChReads.forEach((time, cId) => {
        chReadMap.set(cId, time);
      });

      if (channelReadsRes.data) {
        channelReadsRes.data.forEach((cr: any) => {
          if (cr.channel_id && cr.last_read_at) {
            const dbTime = new Date(cr.last_read_at).getTime();
            const existing = chReadMap.get(cr.channel_id) || 0;
            chReadMap.set(cr.channel_id, Math.max(dbTime, existing));
          }
        });
      }
      setChannelReads(prev => {
        let hasChanges = false;
        chReadMap.forEach((time, cId) => {
          if ((prev.get(cId) || 0) < time) {
            hasChanges = true;
          }
        });
        if (!hasChanges && chReadMap.size <= prev.size) {
          return prev;
        }
        const merged = new Map(prev);
        chReadMap.forEach((time, cId) => {
          const existing = merged.get(cId) || 0;
          if (time > existing) {
            merged.set(cId, time);
          }
        });
        return merged;
      });

      let groupIds: string[] = [];
      const membershipMap = new Map<string, any>();
      if (memberRows && memberRows.length > 0) {
        memberRows.forEach((r: any) => {
          if (r.group_id) {
            groupIds.push(r.group_id);
            membershipMap.set(r.group_id, r);
          }
        });
      }

      // Also if teacher/admin, check created groups
      if (!isStudent) {
        const { data: createdGroups, error: cErr } = await supabase
          .from('campus_chat_groups')
          .select('id')
          .eq('creator_id', uid)
          .eq('is_archived', false);

        if (cErr) {
          if (cErr.message?.includes('schema cache') || cErr.code === 'PGRST205' || cErr.code === '42P01') {
            console.warn('[CampusDirectMessages] campus_chat_groups table not in schema cache yet (Migration 407 pending).');
            setCampusGroups([]);
            return;
          }
        }

        (createdGroups || []).forEach((g: any) => {
          if (g.id && !groupIds.includes(g.id)) {
            groupIds.push(g.id);
          }
        });
      }

      if (groupIds.length === 0) {
        setCampusGroups([]);
        return;
      }

      // 2. Fetch full group details
      const { data: groupsData, error: gErr } = await supabase
        .from('campus_chat_groups')
        .select('*')
        .in('id', groupIds)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (gErr) {
        if (gErr.message?.includes('schema cache') || gErr.code === 'PGRST205' || gErr.code === '42P01') {
          console.warn('[CampusDirectMessages] campus_chat_groups table not in schema cache yet (Migration 407 pending).');
          setCampusGroups([]);
          return;
        }
        throw gErr;
      }
      if (!groupsData) return;

      // 3. Fetch member counts & last_read_at
      const { data: allMembers } = await supabase
        .from('campus_chat_group_members')
        .select('group_id, user_id, role, last_read_at')
        .in('group_id', groupIds);

      const membersByGroup = new Map<string, any[]>();
      (allMembers || []).forEach((m: any) => {
        const list = membersByGroup.get(m.group_id) || [];
        list.push(m);
        membersByGroup.set(m.group_id, list);
      });

      const processed = groupsData.map((g: any) => {
        const members = membersByGroup.get(g.id) || [];
        const myMembership = membershipMap.get(g.id);
        const localGrpReads = getLocalGroupReads(uid);
        const localGrpTime = localGrpReads.get(g.id) || 0;
        const dbGrpTime = myMembership?.last_read_at ? new Date(myMembership.last_read_at).getTime() : 0;
        const groupLastRead = Math.max(dbGrpTime, localGrpTime);

        const grpMessages = (campusMessages || []).filter((m: any) => m.group_id === g.id);
        const lastMsg = grpMessages.length > 0 ? grpMessages[grpMessages.length - 1] : null;

        // Channel-level accurate unread calculation
        const unreadCount = grpMessages.filter((m: any) => {
          if (m.sender_id === uid) return false;
          const msgTime = new Date(m.created_at).getTime();
          if (m.channel_id && chReadMap.has(m.channel_id)) {
            return msgTime > (chReadMap.get(m.channel_id) || 0);
          }
          return msgTime > groupLastRead;
        }).length;

        return {
          ...g,
          is_group: true,
          members,
          members_count: members.length,
          lastMessage: lastMsg,
          unreadCount,
          lastMessageTime: lastMsg ? new Date(lastMsg.created_at) : new Date(g.created_at)
        };
      });

      setCampusGroups(processed);
    } catch (err) {
      console.error('[CampusDirectMessages] Error in fetchCampusGroups:', err);
    }
  }, [user?.id, isStudent, campusMessages]);

  useEffect(() => {
    fetchCampusGroups();
  }, [fetchCampusGroups]);

  const fetchGroupMembersDetails = async (groupId: string) => {
    setGroupMembersLoading(true);
    try {
      const { data: members } = await supabase
        .from('campus_chat_group_members')
        .select('user_id, role, joined_at')
        .eq('group_id', groupId);

      if (!members || members.length === 0) {
        setGroupMembersDetails([]);
        return;
      }

      const userIds = members.map((m: any) => m.user_id);
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .in('id', userIds);

      const userMap = new Map<string, any>();
      (usersData || []).forEach((u: any) => userMap.set(u.id, u));
      (schoolUsers || []).forEach((su: any) => { if (su?.id && !userMap.has(su.id)) userMap.set(su.id, su); });
      (assignedStudents || []).forEach((s: any) => { if (s?.id && !userMap.has(s.id)) userMap.set(s.id, s); });

      const detailed = members.map((m: any) => {
        const u = userMap.get(m.user_id) || { id: m.user_id, first_name: 'Mitglied', last_name: '' };
        return {
          ...u,
          member_role: m.role,
          joined_at: m.joined_at
        };
      });

      setGroupMembersDetails(detailed);
    } catch (err) {
      console.error('[CampusDirectMessages] Error fetching group members:', err);
    } finally {
      setGroupMembersLoading(false);
    }
  };

  const fetchGroupChannels = React.useCallback(async (groupId: string) => {
    if (!groupId) {
      setGroupChannels([]);
      setActiveChannelId(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('campus_chat_channels')
        .select('*')
        .eq('group_id', groupId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        if (error.message?.includes('schema cache') || error.code === 'PGRST205' || error.code === '42P01') {
          console.warn('[CampusDirectMessages] campus_chat_channels not in schema cache yet.');
          setGroupChannels([]);
          return;
        }
        throw error;
      }

      const channels = data || [];
      setGroupChannels(channels);

      // Goldstandard: Set active channel to first channel with unread messages, or default # allgemein
      setActiveChannelId(prev => {
        const uid = effectiveUid;
        const currentMsgs = campusMessagesRef.current;
        const currentReads = channelReadsRef.current;
        // 1. Look for any channel with unread messages first
        if (uid && currentMsgs && currentMsgs.length > 0) {
          const unreadChannel = channels.find(ch => {
            const lastRead = currentReads.get(ch.id) || 0;
            return currentMsgs.some((m: any) => {
              if (m.group_id !== groupId || m.sender_id === uid) return false;
              const matches = m.channel_id ? m.channel_id === ch.id : ch.is_default;
              if (!matches) return false;
              return new Date(m.created_at).getTime() > lastRead;
            });
          });
          if (unreadChannel) {
            return unreadChannel.id;
          }
        }

        // 2. If no unread messages in other channels, keep previous channel if valid
        if (prev && channels.some(c => c.id === prev)) {
          return prev;
        }

        const defaultChannel = channels.find(c => c.is_default) || channels[0];
        return defaultChannel ? defaultChannel.id : null;
      });
    } catch (err) {
      console.error('[CampusDirectMessages] Error fetching group channels:', err);
    }
  }, [user?.id, effectiveUid]);

  useEffect(() => {
    if (selectedRecipient?.is_group && selectedRecipient?.id) {
      fetchGroupChannels(selectedRecipient.id);
    } else {
      setGroupChannels([]);
      setActiveChannelId(null);
    }
  }, [selectedRecipient?.id, selectedRecipient?.is_group, fetchGroupChannels]);

  const handleDeleteChannel = async (channelId: string, channelName: string) => {
    if (!channelId) return;
    const confirmDelete = window.confirm(`Möchtest du den Kanal „# ${channelName}“ wirklich unwiderruflich löschen? Alle Nachrichten in diesem Kanal werden entfernt.`);
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.rpc('delete_campus_chat_channel', {
        p_channel_id: channelId
      });
      if (error) throw error;

      if (selectedRecipient?.id) {
        await fetchGroupChannels(selectedRecipient.id);
      }
    } catch (err: any) {
      console.error('[CampusDirectMessages] Error deleting channel:', err);
      alert('Fehler beim Löschen des Kanals: ' + (err?.message || 'Unbekannt'));
    }
  };

  const handleToggleChannelType = async (channelId: string, targetType: 'chat' | 'threads') => {
    try {
      const ch = groupChannels.find(c => c.id === channelId);
      const allowStudents = ch?.allow_student_topics || false;
      const { error } = await supabase.rpc('update_campus_chat_channel_settings', {
        p_channel_id: channelId,
        p_channel_type: targetType,
        p_allow_student_topics: allowStudents
      });
      if (error) {
        await supabase
          .from('campus_chat_channels')
          .update({ channel_type: targetType })
          .eq('id', channelId);
      }
      setGroupChannels(prev => prev.map(c => c.id === channelId ? { ...c, channel_type: targetType } : c));
    } catch (err) {
      console.error('[CampusDirectMessages] Error switching channel type:', err);
    }
  };

  // Load reactions for active conversation (group or 1:1) and subscribe to realtime updates
  useEffect(() => {
    if (!selectedRecipient?.id) {
      setMessageReactions([]);
      return;
    }

    let isMounted = true;
    const loadReactions = async () => {
      try {
        const { data, error } = await supabase
          .from('campus_message_reactions')
          .select('*');
        if (!error && data && isMounted) {
          setMessageReactions(data);
        }
      } catch (e) {
        // fail-soft
      }
    };

    loadReactions();

    const channel = supabase
      .channel(`reactions-${selectedRecipient.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campus_message_reactions' },
        () => {
          loadReactions();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [selectedRecipient?.id]);

  const handlePublishTopic = async (subject: string, content?: string) => {
    if (!selectedRecipient) return;
    const cleanSub = subject.trim();
    const cleanBody = (content && content.trim()) || cleanSub;
    if (!cleanSub) return;

    const isGroup = Boolean(selectedRecipient.is_group);
    const effectiveChannelId = isGroup 
      ? (activeChannelId || groupChannels.find(c => c.is_default)?.id || groupChannels[0]?.id)
      : undefined;

    const validation = validateChatMessageContent(`${cleanSub} ${cleanBody}`);
    if (!validation.isValid) {
      setRespectWarning(validation);
      return;
    }
    setRespectWarning(null);

    let createdTopic: any = null;
    if (isGroup) {
      createdTopic = await onSendMessage(
        user.id,
        cleanBody,
        selectedRecipient.id,
        effectiveChannelId || undefined,
        undefined,
        cleanSub
      );
    } else {
      createdTopic = await onSendMessage(
        selectedRecipient.id,
        cleanBody,
        undefined,
        undefined,
        undefined,
        cleanSub
      );
    }
    setIsTopicComposerOpen(false);

    if (createdTopic?.id) {
      setFocusedTopicId(createdTopic.id);
      setTimeout(() => setFocusedTopicId(null), 4000);
    }

    setTimeout(() => scrollToBottom(true), 50);
    return createdTopic;
  };

  const handleSendTopicReply = async (topicId: string, content: string) => {
    if (!selectedRecipient) return;
    const isGroup = Boolean(selectedRecipient.is_group);
    if (isGroup && !activeChannelId) return;

    const validation = validateChatMessageContent(content);
    if (!validation.isValid) {
      setRespectWarning(validation);
      return;
    }
    setRespectWarning(null);

    if (isGroup) {
      await onSendMessage(
        user.id,
        content.trim(),
        selectedRecipient.id,
        activeChannelId || undefined,
        topicId,
        undefined
      );
    } else {
      await onSendMessage(
        selectedRecipient.id,
        content.trim(),
        undefined,
        undefined,
        topicId,
        undefined
      );
    }
    setTimeout(() => scrollToBottom(true), 50);
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      const { data, error } = await supabase.rpc('toggle_campus_message_reaction', {
        p_message_id: messageId,
        p_emoji: emoji
      });
      if (error) {
        // Fallback: direct table toggle
        const existing = messageReactions.find(r => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji);
        if (existing) {
          await supabase.from('campus_message_reactions').delete().eq('id', existing.id);
          setMessageReactions(prev => prev.filter(r => r.id !== existing.id));
        } else {
          const schoolId = selectedRecipient.school_id || (typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_school_id') : null);
          if (schoolId) {
            const { data: ins } = await supabase.from('campus_message_reactions').insert({
              school_id: schoolId,
              message_id: messageId,
              user_id: user.id,
              emoji: emoji
            }).select().single();
            if (ins) setMessageReactions(prev => [...prev, ins]);
          }
        }
        return;
      }
      if (data?.action === 'added') {
        setMessageReactions(prev => [...prev, {
          id: `tmp-${Date.now()}`,
          message_id: messageId,
          user_id: user.id,
          emoji: emoji
        }]);
      } else if (data?.action === 'removed') {
        setMessageReactions(prev => prev.filter(r => !(r.message_id === messageId && r.user_id === user.id && r.emoji === emoji)));
      }
    } catch (err) {
      console.error('[CampusDirectMessages] Error toggling reaction:', err);
    }
  };

  const isSystemMessage = (msg: any) => {
    if (!msg) return false;
    if (msg.is_system || msg.message_type === 'reschedule_notification' || msg.message_type === 'cancellation_reset' || msg.message_type === 'system') return true;
    const content = String(msg.content || '').trim();
    const lower = content.toLowerCase();
    
    // System notification patterns generated by the engine
    if (
      lower.includes('termin reaktiviert') ||
      lower.includes('reaktiviert') ||
      lower.includes('termin wurde verschoben') ||
      lower.includes('termin wurde auf den regulären') ||
      lower.includes('termin zurückgesetzt') ||
      lower.includes('stamm-termin zurückgesetzt') ||
      lower.includes('ausfall wurde zurückgenommen') ||
      lower.includes('ausfall für diesen termin wurde zurückgenommen') ||
      lower.includes('abgesagt') ||
      content.includes('❌') ||
      lower.includes('unterrichtstermin bestätigt') ||
      lower.includes('termin bestätigt') ||
      lower.includes('terminbestätigung') ||
      lower.includes('verschiebung abgelehnt') ||
      lower.includes('bitte bestätige den neuen termin') ||
      lower.includes('bitte bestätige, dass du dies gesehen hast') ||
      (content.includes('->') && (lower.includes('uhr') || lower.includes('termin')))
    ) {
      return true;
    }
    return false;
  };

  // Determine source list based on user role: Students see strictly their assigned teachers!
  const userRole = (user?.role || '').toLowerCase();
  const isAdminOrSecretary = userRole === 'admin' || userRole === 'secretary';

  const sourceUsers = useMemo(() => {
    return isAdminOrSecretary
      ? [...(schoolUsers || []), ...(assignedStudents || [])] 
      : (assignedStudents || []);
  }, [isAdminOrSecretary, schoolUsers, assignedStudents]);

  const allAvailableUsers = useMemo(() => {
    const map = new Map<string, any>();
    sourceUsers.forEach(u => {
      if (u && u.id) {
        map.set(u.id, u);
      }
    });
    return Array.from(map.values());
  }, [sourceUsers]);

  const allKnownUsersMap = useMemo(() => {
    const map = new Map<string, any>();
    (schoolUsers || []).forEach((u: any) => { if (u?.id) map.set(u.id, u); });
    (assignedStudents || []).forEach((u: any) => { if (u?.id) map.set(u.id, u); });
    (groupMembersDetails || []).forEach((u: any) => { if (u?.id) map.set(u.id, u); });
    if (user?.id) map.set(user.id, user);
    return map;
  }, [schoolUsers, assignedStudents, groupMembersDetails, user]);

  // Get potential chat partners
  const chatPartners = useMemo(() => {
    return allAvailableUsers.filter(u => {
      if (!u || u.id === user?.id) return false;
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
  }, [allAvailableUsers, user?.id, selectedRecipient, isStudent]);

  // Filter partners based on search
  const filteredPartners = useMemo(() => {
    return chatPartners.filter(p => 
      `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [chatPartners, searchQuery]);

  // Group messages and unread counts
  const partnersWithMetadata = useMemo(() => {
    const currentViewerId = effectiveUid || user?.id;
    const directReads = getLocalDirectReads(currentViewerId || '');
    const readMsgIds = getLocalReadMsgIds(currentViewerId || '');

    return filteredPartners.map(partner => {
      const threadMessages = (campusMessages || []).filter(m => 
        (m.sender_id === currentViewerId && m.recipient_id === partner.id) ||
        (m.sender_id === partner.id && m.recipient_id === currentViewerId)
      );

      const directHumanMessages = threadMessages.filter(m => !isSystemMessage(m));
      const lastMessage = directHumanMessages.length > 0 
        ? directHumanMessages[directHumanMessages.length - 1] 
        : threadMessages[threadMessages.length - 1];
      const partnerLastRead = directReads.get(partner.id) || 0;
      const unreadCount = directHumanMessages.filter(m => {
        if (m.sender_id !== partner.id || m.recipient_id !== currentViewerId) return false;
        if (m.is_read || readMsgIds.has(m.id)) return false;
        if (partnerLastRead > 0 && new Date(m.created_at).getTime() <= partnerLastRead) return false;
        return true;
      }).length;

      return {
        ...partner,
        lastMessage,
        unreadCount,
        lastMessageTime: lastMessage ? new Date(lastMessage.created_at) : null
      };
    });
  }, [filteredPartners, campusMessages, user?.id, effectiveUid]);

  // Filter based on Quick-Filters with deterministic alphabetical sorting (A-Z)
  const finalPartnersList = useMemo(() => {
    return partnersWithMetadata.filter(partner => {
      if (filterType === 'unread') {
        return partner.unreadCount > 0;
      }
      return true;
    }).sort((a, b) => {
      const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim();
      const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim();
      return nameA.localeCompare(nameB, 'de', { sensitivity: 'base' });
    });
  }, [partnersWithMetadata, filterType]);

  // Filter and process groups
  const filteredGroupsList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return campusGroups.filter(g => {
      if (filterType === 'unread' && (g.unreadCount || 0) === 0) return false;
      if (!q) return true;
      return (g.name || '').toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q);
    }).sort((a, b) => {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return (a.name || '').localeCompare(b.name || '', 'de');
    });
  }, [campusGroups, searchQuery, filterType]);

  const totalUnreadGroupsCount = useMemo(() => {
    return campusGroups.reduce((acc, g) => acc + (g.unreadCount || 0), 0);
  }, [campusGroups]);

  // Combined list for students (teachers + student's groups)
  const studentCombinedList = useMemo(() => {
    if (!isStudent) return [];
    const combined = [
      ...finalPartnersList.map(p => ({ ...p, is_group: false })),
      ...filteredGroupsList.map(g => ({ ...g, is_group: true }))
    ];
    return combined.sort((a, b) => {
      const unreadA = a.unreadCount || 0;
      const unreadB = b.unreadCount || 0;
      if (unreadA !== unreadB) return unreadB - unreadA;
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });
  }, [isStudent, finalPartnersList, filteredGroupsList]);

  // Controlled scroll to bottom of messages container
  const scrollToBottom = (smooth = false) => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  useEffect(() => {
    if (!isMobile && !selectedRecipient) {
      if (isStudent && studentCombinedList.length > 0) {
        const unreadConvo = studentCombinedList.find(p => (p.unreadCount || 0) > 0);
        const directTeacher = studentCombinedList.find(p => !p.is_group && String(p.id) === String(user?.teacher_id));
        setSelectedRecipient(unreadConvo || directTeacher || studentCombinedList[0]);
      } else if (!isStudent) {
        if (activeMainTab === 'groups' && filteredGroupsList.length > 0) {
          const unreadGroup = filteredGroupsList.find(g => (g.unreadCount || 0) > 0);
          setSelectedRecipient(unreadGroup || filteredGroupsList[0]);
        } else if (finalPartnersList.length > 0) {
          const unreadPartner = finalPartnersList.find(p => (p.unreadCount || 0) > 0);
          setSelectedRecipient(unreadPartner || finalPartnersList[0]);
        }
      }
    }
  }, [isMobile, finalPartnersList, filteredGroupsList, studentCombinedList, selectedRecipient, setSelectedRecipient, user?.teacher_id, isStudent, activeMainTab]);

  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);

  // 🛡️ Autoritativer, revisionssicherer Quittierungs- und Lese-Handler gem. § 130 BGB / GoBD
  const handleAcknowledgeAndMarkAsRead = async (targetRecipient?: any) => {
    const target = targetRecipient || selectedRecipient;
    const uid = effectiveUid || user?.id;
    if (!target || !uid || isMarkingAsRead) return;

    setIsMarkingAsRead(true);
    const nowTime = Date.now();
    const nowIso = new Date(nowTime).toISOString();

    try {
      if (target.is_group) {
        const groupId = target.id;
        saveLocalGroupRead(uid, groupId, nowTime);

        // 1. 0ms Optimistisches UI-Update: Unread auf 0 setzen
        setCampusGroups(prev => prev.map(g => {
          if (g.id === groupId) {
            return { ...g, unreadCount: 0 };
          }
          return g;
        }));

        // Alle Kanäle der Gruppe lokal als gelesen setzen
        setChannelReads(prev => {
          const next = new Map(prev);
          (groupChannels || []).forEach(ch => {
            if (ch.group_id === groupId || !ch.group_id) {
              next.set(ch.id, nowTime);
              saveLocalChannelRead(uid, ch.id, nowTime);
            }
          });
          if (activeChannelId) {
            next.set(activeChannelId, nowTime);
            saveLocalChannelRead(uid, activeChannelId, nowTime);
          }
          return next;
        });

        // 2. Revisionssicheres Audit-Logging gem. § 130 BGB / GoBD
        logSecurityEvent({
          action: 'QUITTUNG_LESEBESTAETIGUNG',
          schoolId: user?.school_id,
          userId: uid,
          targetId: groupId,
          metadata: {
            type: 'group_chat',
            group_name: target.name,
            channels_count: groupChannels.length,
            legal_basis: '§ 130 BGB / GoBD'
          }
        }).catch(e => console.warn('[CampusDirectMessages] Audit log error:', e));

        if (onMarkGroupAsRead) {
          await onMarkGroupAsRead(groupId);
        } else {
          // Serverseitiger, atomarer RPC nach OWASP ASVS Level 3
          await supabase.rpc('mark_campus_group_as_read', { p_group_id: groupId, p_user_id: uid });
        }
      } else {
        const partnerId = target.id;
        const targetSchoolId = user?.school_id || user?.schoolId || (Array.isArray(user?.schools) ? user.schools[0]?.id : user?.schools?.id);
        
        saveLocalDirectRead(uid, partnerId, nowTime);
        const targetMsgIds = (campusMessages || [])
          .filter(m => !m.group_id && m.sender_id === partnerId && m.recipient_id === uid)
          .map(m => m.id);
        if (targetMsgIds.length > 0) {
          saveLocalReadMsgIds(uid, targetMsgIds);
        }

        // 1. Revisionssicheres Audit-Logging gem. § 130 BGB / GoBD
        logSecurityEvent({
          action: 'QUITTUNG_LESEBESTAETIGUNG',
          schoolId: targetSchoolId,
          userId: uid,
          targetId: partnerId,
          metadata: {
            type: 'direct_chat',
            partner_name: `${target.first_name || ''} ${target.last_name || ''}`.trim(),
            legal_basis: '§ 130 BGB / GoBD'
          }
        }).catch(e => console.warn('[CampusDirectMessages] Audit log error:', e));

        if (onMarkAsRead) {
          await onMarkAsRead(partnerId);
        } else {
          await supabase.rpc('mark_campus_direct_chat_as_read', { p_partner_id: partnerId, p_user_id: uid });
        }
      }
    } catch (err) {
      console.error('[CampusDirectMessages] Error marking chat as read:', err);
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  // 1. Group members fetching: isolated strictly to selectedRecipient id changes
  useEffect(() => {
    if (selectedRecipient?.is_group && selectedRecipient?.id && user?.id) {
      fetchGroupMembersDetails(selectedRecipient.id);
    } else {
      setGroupMembersDetails([]);
    }
  }, [selectedRecipient?.id, selectedRecipient?.is_group, user?.id]);

  // 2. Instant scroll when changing recipient or channel (zero-wobble container scroll)
  useEffect(() => {
    if (!selectedRecipient) return;
    const timer = setTimeout(() => {
      scrollToBottom(false);
    }, 20);
    return () => clearTimeout(timer);
  }, [selectedRecipient?.id, activeChannelId, activeSubTab]);

  // 3. Automatische Gelesen-Funktion (Auto-Read Engine)
  // Wenn ein Kanal oder eine Nachricht geöffnet wurde, gilt sie sofort und revisionssicher als gelesen.
  useEffect(() => {
    const uid = effectiveUid;
    if (!selectedRecipient || !uid) return;

    if (selectedRecipient.is_group) {
      const activeChan = groupChannels.find(c => c.id === activeChannelId) || groupChannels.find(c => c.is_default) || groupChannels[0];
      const targetChanId = activeChannelId || activeChan?.id;
      if (!targetChanId) return;

      const readKey = `chan_${selectedRecipient.id}_${targetChanId}`;
      const now = Date.now();
      if (lastAutoReadRef.current[readKey] && (now - lastAutoReadRef.current[readKey]) < 2000) {
        return;
      }

      const myMembership = selectedRecipient.members?.find((mb: any) => mb.user_id === uid);
      const groupLastRead = myMembership?.last_read_at ? new Date(myMembership.last_read_at).getTime() : 0;
      const lastRead = channelReads.has(targetChanId) ? (channelReads.get(targetChanId) || 0) : groupLastRead;

      const unreadInActiveChannel = (campusMessages || []).filter((m: any) => {
        if (m.group_id !== selectedRecipient.id || m.sender_id === uid) return false;
        const matches = m.channel_id ? m.channel_id === targetChanId : activeChan?.is_default;
        if (!matches) return false;
        return new Date(m.created_at).getTime() > lastRead;
      });

      if (unreadInActiveChannel.length > 0 || (channelReads.get(targetChanId) || 0) === 0) {
        lastAutoReadRef.current[readKey] = now;
        const nowTime = now;
        // 0ms optimistisches lokales Update
        setChannelReads(prev => new Map(prev).set(targetChanId, nowTime));
        saveLocalChannelRead(uid, targetChanId, nowTime);

        // Optimistisch Gruppen-Ungelesen-Zähler herabsetzen
        if (unreadInActiveChannel.length > 0) {
          setCampusGroups(prev => prev.map(g => {
            if (g.id === selectedRecipient.id) {
              return { ...g, unreadCount: Math.max(0, (g.unreadCount || 0) - unreadInActiveChannel.length) };
            }
            return g;
          }));
        }

        // Revisionssicheres Audit-Logging gem. § 130 BGB / GoBD
        const targetSchoolId = user?.school_id || user?.schoolId || (Array.isArray(user?.schools) ? user.schools[0]?.id : user?.schools?.id);
        logSecurityEvent({
          action: 'QUITTUNG_LESEBESTAETIGUNG',
          schoolId: targetSchoolId,
          userId: uid,
          targetId: targetChanId,
          metadata: {
            type: 'channel_auto_read',
            group_id: selectedRecipient.id,
            channel_id: targetChanId,
            channel_name: activeChan?.name || 'default',
            messages_count: unreadInActiveChannel.length,
            legal_basis: '§ 130 BGB / GoBD'
          }
        }).catch(e => console.warn('[CampusDirectMessages] Channel auto-read audit error:', e));

        if (onMarkChannelAsRead) {
          onMarkChannelAsRead(targetChanId, selectedRecipient.id);
        } else {
          // Serverseitiger, atomarer RPC nach OWASP ASVS Level 3
          supabase.rpc('mark_campus_channel_as_read', { p_channel_id: targetChanId, p_user_id: uid })
            .then(({ error }: any) => {
              if (error && targetSchoolId) {
                supabase
                  .from('campus_chat_channel_reads')
                  .upsert({
                    channel_id: targetChanId,
                    user_id: uid,
                    school_id: targetSchoolId,
                    last_read_at: new Date(nowTime).toISOString()
                  }, { onConflict: 'channel_id,user_id' });
              }
            });
        }
      }
    } else {
      const partnerId = selectedRecipient.id;
      const readKey = `direct_${partnerId}`;
      const now = Date.now();

      // Immediately save to local direct reads (Zero-Bounce Guarantee)
      saveLocalDirectRead(uid, partnerId, now);

      const unreadFromRecipient = (campusMessages || []).filter(m => 
        !m.group_id && m.sender_id === partnerId && m.recipient_id === uid && !m.is_read
      );

      if (unreadFromRecipient.length > 0) {
        const unreadIds = unreadFromRecipient.map(m => m.id);
        saveLocalReadMsgIds(uid, unreadIds);

        if (lastAutoReadRef.current[readKey] && (now - lastAutoReadRef.current[readKey]) < 2000) {
          return;
        }
        lastAutoReadRef.current[readKey] = now;
        const targetSchoolId = user?.school_id || user?.schoolId || (Array.isArray(user?.schools) ? user.schools[0]?.id : user?.schools?.id);
        // Revisionssicheres Audit-Logging
        logSecurityEvent({
          action: 'QUITTUNG_LESEBESTAETIGUNG',
          schoolId: targetSchoolId,
          userId: uid,
          targetId: partnerId,
          metadata: {
            type: 'direct_chat_auto_read',
            partner_name: `${selectedRecipient.first_name || ''} ${selectedRecipient.last_name || ''}`.trim(),
            messages_count: unreadFromRecipient.length,
            legal_basis: '§ 130 BGB / GoBD'
          }
        }).catch(e => console.warn('[CampusDirectMessages] Direct auto-read audit error:', e));

        if (onMarkAsRead) {
          onMarkAsRead(partnerId);
        }
      }
    }
  }, [selectedRecipient?.id, selectedRecipient?.is_group, activeChannelId, campusMessages, effectiveUid, onMarkChannelAsRead, onMarkAsRead]);

  // Get active messages in the current thread (sorted chronologically)
  const activeThreadMessages = useMemo(() => {
    if (!selectedRecipient) return [];
    if (selectedRecipient.is_group) {
      const defaultChannel = groupChannels.find(c => c.is_default);
      return [...campusMessages]
        .filter(m => {
          if (m.group_id !== selectedRecipient.id) return false;
          // Channel filtering:
          if (activeChannelId) {
            // Match messages with this explicit channel_id OR legacy messages assigned to default channel
            if (m.channel_id) {
              return m.channel_id === activeChannelId;
            }
            // If message has no channel_id, show it in the default channel (# allgemein)
            return defaultChannel?.id === activeChannelId;
          }
          return true;
        })
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    const currentViewerId = effectiveUid || user.id;
    return [...campusMessages]
      .filter(m => 
        !m.group_id && (
          (m.sender_id === currentViewerId && m.recipient_id === selectedRecipient.id) ||
          (m.sender_id === selectedRecipient.id && m.recipient_id === currentViewerId)
        )
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [campusMessages, selectedRecipient, user.id, effectiveUid, activeChannelId, groupChannels]);

  const findUserById = React.useCallback((userId: string) => {
    if (!userId) return null;
    if (user?.id === userId) return user;
    if (selectedRecipient && selectedRecipient.id === userId) return selectedRecipient;
    if (selectedRecipient?.members) {
      const foundMember = selectedRecipient.members.find((m: any) => m.user_id === userId);
      if (foundMember?.user) return foundMember.user;
    }
    const known = allKnownUsersMap.get(userId);
    if (known) return known;
    const partner = (assignedStudents || []).find((s: any) => s.id === userId);
    if (partner) return partner;
    return { id: userId, first_name: 'Mitglied', role: 'student' };
  }, [user, selectedRecipient, allKnownUsersMap, assignedStudents]);

  // 1. Fetch occurrences for selected recipient
  const [studentOccurrences, setStudentOccurrences] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedRecipient?.id || selectedRecipient?.is_group) {
      setStudentOccurrences([]);
      return;
    }

    const fetchOccurrencesForStudent = async () => {
      try {
        const targetStudentId = isStudent ? user?.id : selectedRecipient?.id;
        const targetTeacherId = isStudent ? selectedRecipient?.id : user?.id;

        if (!targetStudentId || !isUUID(targetStudentId)) {
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

  // 1. Helper to extract date from message content if occurrence_id is missing or legacy
  const extractOccurrenceDateFromMessage = (msg: any): string | null => {
    if (!msg) return null;
    if (msg.occurrence_id) {
      const matchVirtual = String(msg.occurrence_id).match(/\d{4}-\d{2}-\d{2}/);
      if (matchVirtual) return matchVirtual[0];
    }
    const text = String(msg.content || '');
    // 1. ISO format: 2026-07-20
    const matchIso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (matchIso) {
      return `${matchIso[1]}-${matchIso[2]}-${matchIso[3]}`;
    }
    // 2. German format: 20.07.26 or 20.07.2026
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

  // Helper to get occurrence context label for a message (date, day of week, time)
  const getMessageOccurrenceContext = (msg: any): { date: string; label: string; occurrence?: any } | null => {
    if (!msg) return null;
    const occId = msg.occurrence_id ? String(msg.occurrence_id) : null;
    const extDate = extractOccurrenceDateFromMessage(msg);
    if (!occId && !extDate) return null;

    const matchOcc = (studentOccurrences || []).find(o => 
      (occId && String(o.id) === occId) || 
      (extDate && o.date === extDate)
    );

    const effectiveDate = matchOcc?.date || extDate;
    if (!effectiveDate) return null;

    try {
      const d = parseLocalDate(effectiveDate);
      if (isNaN(d.getTime())) return null;
      const dayName = d.toLocaleDateString('de-DE', { weekday: 'short' });
      const formattedDate = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      const timeStr = matchOcc?.start_time ? matchOcc.start_time.slice(0, 5) : null;
      return {
        date: effectiveDate,
        label: `${dayName} ${formattedDate}${timeStr ? ` • ${timeStr} Uhr` : ''}`,
        occurrence: matchOcc
      };
    } catch (e) {
      return null;
    }
  };

  // 2. Dynamic Date-Based Occurrence Tabs with Active & Archive Lifecycle
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const archiveDropdownRef = useRef<HTMLDivElement>(null);

  // Close archive dropdown when clicking outside
  useEffect(() => {
    if (!isArchiveOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (archiveDropdownRef.current && !archiveDropdownRef.current.contains(e.target as Node)) {
        setIsArchiveOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isArchiveOpen]);

  const { upcomingOccurrenceTabs, archivedOccurrenceTabs, allOccurrenceTabs } = useMemo(() => {
    if (!selectedRecipient) {
      return { upcomingOccurrenceTabs: [], archivedOccurrenceTabs: [], allOccurrenceTabs: [] };
    }

    const defaultStartTime = (studentOccurrences && studentOccurrences[0]?.start_time ? studentOccurrences[0].start_time.slice(0, 5) : '16:30');

    // Date-based Map to avoid duplicate tabs for the same calendar date
    const dateSlotMap = new Map<string, { occ: any; ids: string[]; start_time: string; isPast: boolean }>();

    const addOrUpdateSlot = (date: string, startTime: string | null, occObj: any) => {
      if (!date) return;
      const isPast = date < todayStr;
      const effectiveTime = (startTime && startTime !== '18:00') ? startTime.slice(0, 5) : defaultStartTime;

      const occIds: string[] = [];
      if (occObj?.id) occIds.push(String(occObj.id));
      if (occObj?.schedule_id && (occObj?.date || date)) {
        occIds.push(`virtual-${occObj.schedule_id}-${occObj.date || date}`);
      }

      if (!dateSlotMap.has(date)) {
        dateSlotMap.set(date, {
          occ: occObj || { date, start_time: effectiveTime, is_virtual: true },
          ids: occIds,
          start_time: effectiveTime,
          isPast
        });
      } else {
        const existing = dateSlotMap.get(date)!;
        occIds.forEach(id => {
          if (!existing.ids.includes(id)) {
            existing.ids.push(id);
          }
        });
        if (startTime && (!existing.start_time || existing.start_time === '18:00')) {
          existing.start_time = effectiveTime;
        }
        if (!existing.occ || (existing.occ.is_virtual && occObj && !occObj.is_virtual)) {
          existing.occ = occObj;
        }
      }
    };

    // 1. Process known student occurrences
    (studentOccurrences || []).forEach(occ => {
      if (!occ || !occ.date) return;
      if (occ.status === 'rescheduled_away' || occ.status === 'deleted') return;
      addOrUpdateSlot(occ.date, occ.start_time ? occ.start_time.slice(0, 5) : null, occ);
    });

    // 2. Process message dates / occurrence references
    activeThreadMessages.forEach(msg => {
      const extDate = extractOccurrenceDateFromMessage(msg);
      if (extDate) {
        // Extract time from message content if present
        const timeMatch = String(msg.content || '').match(/(\d{1,2}):(\d{2})\s*uhr/i);
        const timeInMsg = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : null;
        
        const linkedOcc = studentOccurrences?.find(o => o.date === extDate || String(o.id) === String(msg.occurrence_id));
        addOrUpdateSlot(extDate, timeInMsg || (linkedOcc?.start_time ? linkedOcc.start_time.slice(0, 5) : null), linkedOcc || null);
      } else if (msg.occurrence_id && String(msg.occurrence_id).startsWith('virtual-')) {
        const matchVirtual = String(msg.occurrence_id).match(/\d{4}-\d{2}-\d{2}/);
        if (matchVirtual) {
          addOrUpdateSlot(matchVirtual[0], null, null);
        }
      }
    });

    const allTabs = Array.from(dateSlotMap.values()).map(({ occ, ids, start_time, isPast }) => {
      const occDate = parseLocalDate(occ.date);
      const dayName = occDate.toLocaleDateString('de-DE', { weekday: 'short' });
      const formattedDate = occDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      const timeStr = start_time || (occ.start_time ? occ.start_time.slice(0, 5) : defaultStartTime);
      const label = `${dayName} ${formattedDate}${timeStr ? ` ${timeStr}` : ''}`;

      const occMessages = activeThreadMessages.filter(m => {
        if (m.occurrence_id && ids.includes(String(m.occurrence_id))) return true;
        const ext = extractOccurrenceDateFromMessage(m);
        return ext === occ.date;
      });

      const unreadCount = occMessages.filter(m => 
        m.sender_id === selectedRecipient.id && 
        m.recipient_id === user.id && 
        !m.is_read && 
        !isSystemMessage(m)
      ).length;

      const isShiftOrChanged = 
        (occ.status && occ.status !== 'scheduled' && occ.status !== 'confirmed') ||
        occ.rescheduled_from ||
        (occ.original_date && occ.original_date !== occ.date) ||
        (occ.notes && (occ.notes.includes('->') || occ.notes.includes('verschoben')));

      return {
        id: ids[0] || `tab-${occ.date}`,
        allIds: ids.length > 0 ? ids : [`tab-${occ.date}`],
        date: occ.date,
        start_time: timeStr,
        label,
        unreadCount,
        isShiftOrChanged: Boolean(isShiftOrChanged),
        isPast,
        messages: occMessages,
        occurrence: occ
      };
    }).filter(t => t.messages.length > 0);

    const upcoming = allTabs.filter(t => !t.isPast).sort((a, b) => {
      const dateA = `${a.date}T${a.start_time}`;
      const dateB = `${b.date}T${b.start_time}`;
      return dateA.localeCompare(dateB);
    });

    const archived = allTabs.filter(t => t.isPast).sort((a, b) => {
      const dateA = `${a.date}T${a.start_time}`;
      const dateB = `${b.date}T${b.start_time}`;
      return dateB.localeCompare(dateA); // Newest past lessons first
    });

    return {
      upcomingOccurrenceTabs: upcoming,
      archivedOccurrenceTabs: archived,
      allOccurrenceTabs: [...upcoming, ...archived]
    };
  }, [selectedRecipient, studentOccurrences, activeThreadMessages, todayStr, user.id]);

  const activeOccurrenceTabs = allOccurrenceTabs;

  // 3. General direct messages (strictly human messages without occurrence_id and without system notifications)
  const generalMessages = useMemo(() => {
    return activeThreadMessages.filter(m => !m.occurrence_id && !isSystemMessage(m) && !extractOccurrenceDateFromMessage(m));
  }, [activeThreadMessages]);

  // Genuine human messages in 1:1 chat (Chat tab: strictly human dialogues, excluding topics and thread replies)
  const humanMessages = useMemo(() => {
    return activeThreadMessages.filter(m => !isSystemMessage(m) && !m.parent_message_id && !m.subject && m.message_type !== 'topic' && !String(m.content || '').startsWith('📌 ['));
  }, [activeThreadMessages]);

  // Count of genuine human messages in 1:1 chat (Chat tab)
  const humanMessagesCount = humanMessages.length;

  // 4. Smart Auto-Tab Selection when switching students: Always default to 'all' (Unified Feed) & 'chat' mode
  useEffect(() => {
    if (!selectedRecipient) return;
    setActiveSubTab('all');
    setOneOnOneMode('chat');
    setIsTopicComposerOpen(false);
  }, [selectedRecipient?.id]);

  // 4b. Graceful fallback if selected subtab no longer exists (e.g. empty tab was filtered out)
  useEffect(() => {
    if (activeSubTab === 'all' || activeSubTab === 'general') return;
    const exists = allOccurrenceTabs.some(tab => 
      tab.id === activeSubTab || 
      (tab.allIds && tab.allIds.includes(activeSubTab)) ||
      tab.date === activeSubTab
    );
    if (!exists) {
      setActiveSubTab('all');
    }
  }, [activeSubTab, allOccurrenceTabs]);

  // 5. Messages displayed in the chat area for currently active sub-tab (Unified Timeline)
  const displayedMessages = useMemo(() => {
    if (selectedRecipient?.is_group) {
      return activeThreadMessages;
    }
    // Tab "Alle" (Unified Timeline for 1:1 chat):
    // strictly human dialogues, excluding replies inside topics and excluding structured topics
    return humanMessages;
  }, [activeThreadMessages, selectedRecipient?.is_group, humanMessages]);

  const activeRootTopics = useMemo(() => {
    if (selectedRecipient?.is_group) {
      return activeThreadMessages.filter(m => !m.parent_message_id);
    }
    // For 1:1 direct chats: topics are messages created with a subject, topic type, or fallback prefix
    return activeThreadMessages.filter(m => !m.parent_message_id && (
      Boolean(m.subject) || 
      m.message_type === 'topic' || 
      String(m.content || '').startsWith('📌 [')
    ));
  }, [selectedRecipient?.is_group, activeThreadMessages]);

  const unreadDirectChatCount = useMemo(() => {
    if (!selectedRecipient || selectedRecipient.is_group) return 0;
    const uid = effectiveUid || user?.id || '';
    const directReads = getLocalDirectReads(uid);
    const partnerLastRead = directReads.get(selectedRecipient.id) || 0;
    const readMsgIds = getLocalReadMsgIds(uid);

    return humanMessages.filter(m => {
      if (m.sender_id !== selectedRecipient.id) return false;
      if (m.recipient_id && m.recipient_id !== uid) return false;
      if (m.is_read || readMsgIds.has(m.id)) return false;
      if (partnerLastRead > 0 && new Date(m.created_at).getTime() <= partnerLastRead) return false;
      return true;
    }).length;
  }, [selectedRecipient, humanMessages, effectiveUid, user?.id]);

  const unreadGroupChatCount = useMemo(() => {
    if (!selectedRecipient || !selectedRecipient.is_group) return 0;
    const myMembership = selectedRecipient.members?.find((mb: any) => mb.user_id === effectiveUid);
    const localGrpReads = getLocalGroupReads(effectiveUid || '');
    const localGrpTime = localGrpReads.get(selectedRecipient.id) || 0;
    const dbGrpTime = myMembership?.last_read_at ? new Date(myMembership.last_read_at).getTime() : 0;
    const groupLastRead = Math.max(dbGrpTime, localGrpTime);
    const lastRead = (activeChannelId && channelReads.has(activeChannelId))
      ? (channelReads.get(activeChannelId) || 0)
      : groupLastRead;
    return humanMessages.filter(m => m.sender_id !== effectiveUid && new Date(m.created_at).getTime() > lastRead).length;
  }, [selectedRecipient, effectiveUid, activeChannelId, channelReads, humanMessages]);

  const unreadTopicsCount = useMemo(() => {
    if (!selectedRecipient) return 0;
    if (selectedRecipient.is_group) {
      const myMembership = selectedRecipient.members?.find((mb: any) => mb.user_id === effectiveUid);
      const localGrpReads = getLocalGroupReads(effectiveUid || '');
      const localGrpTime = localGrpReads.get(selectedRecipient.id) || 0;
      const dbGrpTime = myMembership?.last_read_at ? new Date(myMembership.last_read_at).getTime() : 0;
      const groupLastRead = Math.max(dbGrpTime, localGrpTime);
      const lastRead = (activeChannelId && channelReads.has(activeChannelId))
        ? (channelReads.get(activeChannelId) || 0)
        : groupLastRead;
      return activeRootTopics.filter(topic => {
        const replies = activeThreadMessages.filter(m => m.parent_message_id === topic.id);
        return Boolean(
          effectiveUid && (
            (topic.sender_id !== effectiveUid && new Date(topic.created_at).getTime() > lastRead) ||
            replies.some(r => r.sender_id !== effectiveUid && new Date(r.created_at).getTime() > lastRead)
          )
        );
      }).length;
    } else {
      const uid = effectiveUid || user?.id || '';
      const directReads = getLocalDirectReads(uid);
      const partnerLastRead = selectedRecipient ? (directReads.get(selectedRecipient.id) || 0) : 0;
      const readMsgIds = getLocalReadMsgIds(uid);

      return activeRootTopics.filter(topic => {
        const replies = activeThreadMessages.filter(m => m.parent_message_id === topic.id);
        const isTopicUnread = topic.sender_id !== effectiveUid && !topic.is_read && !readMsgIds.has(topic.id) && (partnerLastRead === 0 || new Date(topic.created_at).getTime() > partnerLastRead);
        const hasUnreadReply = replies.some(r => r.sender_id !== effectiveUid && !r.is_read && !readMsgIds.has(r.id) && (partnerLastRead === 0 || new Date(r.created_at).getTime() > partnerLastRead));
        return Boolean(effectiveUid && (isTopicUnread || hasUnreadReply));
      }).length;
    }
  }, [selectedRecipient, effectiveUid, activeChannelId, channelReads, activeRootTopics, activeThreadMessages, user?.id]);

  // Asynchronous Self-Healing: Persist missing reactivation audit record to PostgreSQL if absent
  useEffect(() => {
    if (!selectedRecipient || !user || selectedRecipient.is_group) return;
    const syntheticMsg = displayedMessages.find((m: any) => m.is_synthetic && m.message_type === 'cancellation_reset');
    if (syntheticMsg) {
      const persistMissingAudit = async () => {
        try {
          const { data: existing } = await supabase
            .from('campus_direct_messages')
            .select('id')
            .eq('message_type', 'cancellation_reset')
            .eq('occurrence_id', syntheticMsg.occurrence_id)
            .limit(1);

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
            console.log('[CampusDirectMessages] Audit Self-Healing: Persisted missing cancellation_reset event to DB.');
          }
        } catch (err) {
          console.warn('[CampusDirectMessages] Could not persist self-healing audit message:', err);
        }
      };
      persistMissingAudit();
    }
  }, [displayedMessages, selectedRecipient, user]);

  const sendDirectQuickMessage = async (content: string) => {
    if (!content.trim() || !selectedRecipient) return;

    const validation = validateChatMessageContent(content);
    if (!validation.isValid) {
      setRespectWarning(validation);
      return;
    }
    setRespectWarning(null);

    // Group message dispatch
    if (selectedRecipient.is_group) {
      await onSendMessage(
        user.id, 
        content.trim(), 
        selectedRecipient.id, 
        activeChannelId || undefined
      );
      setTimeout(() => scrollToBottom(true), 50);
      return;
    }
    
    if (activeSubTab !== 'all' && activeSubTab !== 'general' && activeSubTab !== 'system') {
      const targetOccTab = allOccurrenceTabs.find(tab => tab.id === activeSubTab || (tab.allIds && tab.allIds.includes(activeSubTab)));
      if (targetOccTab) {
        await supabase.from('campus_direct_messages').insert({
          sender_id: user.id,
          recipient_id: selectedRecipient.id,
          content: content.trim(),
          occurrence_id: targetOccTab.id,
          read_by: [user.id]
        });
        setTimeout(() => scrollToBottom(true), 50);
        return;
      }
    }

    await onSendMessage(selectedRecipient.id, content.trim());
    setTimeout(() => scrollToBottom(true), 50);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !selectedRecipient) return;
    
    const messageText = typedMessage.trim();
    const validation = validateChatMessageContent(messageText);
    if (!validation.isValid) {
      setRespectWarning(validation);
      return;
    }
    setRespectWarning(null);
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
        transition: isMobile ? 'width 0.25s ease, opacity 0.25s ease' : 'none'
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
                <h2 style={{ fontSize: isMobile ? '20px' : '22px', fontWeight: 900, color: '#1e293b', margin: '0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Nachrichten {isStudent ? '' : activeMainTab === 'groups' ? `(${campusGroups.length})` : `(${assignedStudents.length})`}
                </h2>
              </div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isStudent ? 'Kommunikation mit deinen Lehrern & Gruppen' : activeMainTab === 'groups' ? 'Ensembles, Bands & Projektgruppen' : 'Kommunikation mit deinen Schülern'}
              </p>
            </div>
          </div>

          {/* Teacher Main Switch: Schüler vs. Gruppen */}
          {!isStudent && (
            <div style={{
              display: 'flex',
              background: '#e2e8f0',
              padding: '3px',
              borderRadius: '12px',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <button
                type="button"
                onClick={() => setActiveMainTab('students')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: activeMainTab === 'students' ? '#ffffff' : 'transparent',
                  color: activeMainTab === 'students' ? '#0f172a' : '#64748b',
                  fontSize: '0.82rem',
                  fontWeight: activeMainTab === 'students' ? 800 : 700,
                  cursor: 'pointer',
                  boxShadow: activeMainTab === 'students' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                <User size={15} />
                <span>Schüler ({assignedStudents.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMainTab('groups')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: activeMainTab === 'groups' ? '#ffffff' : 'transparent',
                  color: activeMainTab === 'groups' ? '#0f172a' : '#64748b',
                  fontSize: '0.82rem',
                  fontWeight: activeMainTab === 'groups' ? 800 : 700,
                  cursor: 'pointer',
                  boxShadow: activeMainTab === 'groups' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                <Users size={15} />
                <span>Gruppen ({campusGroups.length})</span>
                {totalUnreadGroupsCount > 0 && (
                  <span style={{
                    background: '#34a853',
                    color: 'white',
                    borderRadius: '100px',
                    padding: '1px 6px',
                    fontSize: '0.68rem',
                    fontWeight: 900
                  }}>
                    {totalUnreadGroupsCount}
                  </span>
                )}
              </button>
            </div>
          )}
          
          <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder={isStudent ? "Suchen..." : activeMainTab === 'groups' ? "Gruppe suchen..." : "Schüler suchen..."}
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
              {(isStudent ? studentCombinedList.filter(p => (p.unreadCount || 0) > 0).length : activeMainTab === 'groups' ? filteredGroupsList.filter(g => (g.unreadCount || 0) > 0).length : partnersWithMetadata.filter(p => p.unreadCount > 0).length) > 0 && (
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
                  {isStudent ? studentCombinedList.filter(p => (p.unreadCount || 0) > 0).length : activeMainTab === 'groups' ? filteredGroupsList.filter(g => (g.unreadCount || 0) > 0).length : partnersWithMetadata.filter(p => p.unreadCount > 0).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Partners & Groups List with 120px Bottom Clearance for Mobile Nav Bar */}
        <div style={{ flex: 1, overflowY: isMobile ? 'visible' : 'auto', padding: isMobile ? '12px 16px 120px 16px' : '12px', boxSizing: 'border-box' }} className={isMobile ? "" : "custom-scrollbar"}>
          
          {/* TEACHER GROUPS VIEW */}
          {!isStudent && activeMainTab === 'groups' && (
            <div>
              {/* Gruppe erstellen Button */}
              <div style={{ marginBottom: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateGroupModalOpen(true)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    border: 'none',
                    background: '#34a853',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(52, 168, 83, 0.25)',
                    transition: 'all 0.2s',
                    minHeight: '44px'
                  }}
                  className="hover-scale"
                >
                  <Plus size={18} strokeWidth={3} />
                  <span>Gruppe erstellen</span>
                </button>
              </div>

              {filteredGroupsList.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '220px', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                  <Users size={38} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>Keine Gruppen gefunden</div>
                  <div style={{ fontSize: '0.78rem', marginTop: '4px', maxWidth: '240px' }}>
                    Erstelle deine erste Ensemble-, Band- oder Projektgruppe für deine Schüler!
                  </div>
                </div>
              ) : (
                filteredGroupsList.map(group => {
                  const isSelected = selectedRecipient?.is_group && selectedRecipient?.id === group.id;
                  const groupIconKey = group.icon || group.avatar_icon;
                  const groupColorKey = group.color || group.color_accent || '#34a853';
                  const GroupIcon = getGroupIconComponent(groupIconKey);

                  return (
                    <button
                      key={`grp-${group.id}`}
                      onClick={() => {
                        setSelectedRecipient(group);
                        setActiveSubTab('all');
                      }}
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
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '14px',
                          background: `${groupColorKey}18`,
                          border: `1.5px solid ${groupColorKey}40`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <GroupIcon size={22} color={groupColorKey} strokeWidth={2.4} />
                        </div>
                        {(group.unreadCount || 0) > 0 && (
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
                            boxShadow: '0 2px 6px rgba(52, 168, 83, 0.45)'
                          }}>
                            {group.unreadCount}
                          </div>
                        )}
                      </div>

                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: isSelected ? '#34a853' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {group.name}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '6px' }}>
                            {group.lastMessageTime && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8' }}>
                                {new Date(group.lastMessageTime).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: (group.unreadCount || 0) > 0 ? 800 : 500,
                            color: (group.unreadCount || 0) > 0 ? '#1e293b' : '#64748b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flex: 1
                          }}>
                            {group.lastMessage?.content ? cleanChatMessageContent(group.lastMessage.content) : `${group.members_count || group.members?.length || 0} Teilnehmer`}
                          </span>
                          {group.admin_only_messaging && (
                            <span style={{
                              fontSize: '0.6rem',
                              fontWeight: 800,
                              background: '#fef3c7',
                              color: '#92400e',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              flexShrink: 0
                            }}>
                              Ankündigung
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* STUDENT COMBINED LIST (TEACHERS + GROUPS) */}
          {isStudent && (
            <div>
              {studentCombinedList.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '220px', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                  {filterType === 'unread' ? (
                    <>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: '#f0fdf4',
                        border: '1.5px solid #bbf7d0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '10px'
                      }}>
                        <CheckCheck size={22} color="#15803d" strokeWidth={2.6} />
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 850, color: '#166534' }}>
                        Alles erledigt &amp; abgehakt
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#15803d', marginTop: '4px', fontWeight: 600 }}>
                        Keine offenen ungelesenen Nachrichten.
                      </div>
                    </>
                  ) : (
                    <>
                      <User size={36} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                      <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>Keine Chats oder Gruppen gefunden</div>
                    </>
                  )}
                </div>
              ) : (
                studentCombinedList.map(item => {
                  const isSelected = item.is_group 
                    ? (selectedRecipient?.is_group && selectedRecipient?.id === item.id)
                    : (!selectedRecipient?.is_group && selectedRecipient?.id === item.id);

                  if (item.is_group) {
                    const groupIconKey = item.icon || item.avatar_icon;
                    const groupColorKey = item.color || item.color_accent || '#34a853';
                    const GroupIcon = getGroupIconComponent(groupIconKey);
                    return (
                      <button
                        key={`std-grp-${item.id}`}
                        onClick={() => {
                          setSelectedRecipient(item);
                          setActiveSubTab('all');
                        }}
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
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '14px',
                            background: `${groupColorKey}18`,
                            border: `1.5px solid ${groupColorKey}40`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <GroupIcon size={22} color={groupColorKey} strokeWidth={2.4} />
                          </div>
                          {(item.unreadCount || 0) > 0 && (
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
                              {item.unreadCount}
                            </div>
                          )}
                        </div>

                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: isSelected ? '#34a853' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.name}
                              </span>
                              <span style={{
                                fontSize: '0.62rem',
                                fontWeight: 850,
                                background: '#e6f4ea',
                                color: '#166534',
                                padding: '1px 6px',
                                borderRadius: '6px',
                                flexShrink: 0
                              }}>
                                Gruppe
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '6px' }}>
                              {item.lastMessageTime && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8' }}>
                                  {new Date(item.lastMessageTime).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <p style={{
                            fontSize: '0.74rem',
                            fontWeight: (item.unreadCount || 0) > 0 ? 800 : 500,
                            color: (item.unreadCount || 0) > 0 ? '#1e293b' : '#64748b',
                            margin: '2px 0 0 0',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {item.lastMessage?.content ? cleanChatMessageContent(item.lastMessage.content) : `${item.members_count || 0} Teilnehmer`}
                          </p>
                        </div>
                      </button>
                    );
                  }

                  // Student 1:1 Teacher Item
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedRecipient(item);
                        const uid = effectiveUid || user?.id || '';
                        if (uid && item?.id) {
                          saveLocalDirectRead(uid, item.id, Date.now());
                          const unreads = (campusMessages || [])
                            .filter(m => !m.group_id && m.sender_id === item.id && m.recipient_id === uid)
                            .map(m => m.id);
                          if (unreads.length > 0) {
                            saveLocalReadMsgIds(uid, unreads);
                          }
                          if (onMarkAsRead) {
                            onMarkAsRead(item.id);
                          }
                        }
                      }}
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
                          src={resolveCampusAvatar(item)} 
                          alt="" 
                          style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} 
                        />
                        {(item.unreadCount || 0) > 0 && (
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
                            {item.unreadCount}
                          </div>
                        )}
                      </div>

                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: isSelected ? '#34a853' : '#1e293b' }}>
                            {formatStudentDisplayName(item)}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '6px' }}>
                            {item.lastMessage && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8' }}>
                                {new Date(item.lastMessage.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <p style={{
                          fontSize: '0.75rem',
                          fontWeight: (item.unreadCount || 0) > 0 ? 800 : 500,
                          color: (item.unreadCount || 0) > 0 ? '#1e293b' : '#64748b',
                          margin: '2px 0 0 0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {item.lastMessage?.content ? cleanChatMessageContent(item.lastMessage.content) : 'Keine Nachrichten'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* TEACHER STUDENTS LIST */}
          {!isStudent && activeMainTab === 'students' && (
            <div>
              {finalPartnersList.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                  <User size={36} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>Keine Chatpartner gefunden</div>
                </div>
              ) : (
                finalPartnersList.map(partner => {
                  const isSelected = !selectedRecipient?.is_group && selectedRecipient?.id === partner.id;
                  
                  return (
                    <button
                      key={partner.id}
                      onClick={() => {
                        setSelectedRecipient(partner);
                        const uid = effectiveUid || user?.id || '';
                        if (uid && partner?.id) {
                          saveLocalDirectRead(uid, partner.id, Date.now());
                          const unreads = (campusMessages || [])
                            .filter(m => !m.group_id && m.sender_id === partner.id && m.recipient_id === uid)
                            .map(m => m.id);
                          if (unreads.length > 0) {
                            saveLocalReadMsgIds(uid, unreads);
                          }
                          if (onMarkAsRead) {
                            onMarkAsRead(partner.id);
                          }
                        }
                      }}
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '6px' }}>
                            {partner.lastMessage && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8' }}>
                                {new Date(partner.lastMessage.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                    
                    <p style={{
                      fontSize: '0.75rem',
                      fontWeight: partner.unreadCount > 0 ? 800 : 500,
                      color: partner.unreadCount > 0 ? '#1e293b' : '#64748b',
                      margin: '2px 0 0 0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {partner.lastMessage?.sender_role === 'parent' && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #dbeafe',
                          padding: '1px 5px',
                          borderRadius: '5px',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          flexShrink: 0,
                          lineHeight: 1
                        }}>
                          <ShieldCheck size={10} color="#1d4ed8" strokeWidth={2.5} />
                          <span>Eltern</span>
                        </span>
                      )}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {partner.lastMessage ? cleanChatMessageContent(partner.lastMessage.content) : 'Keine Nachrichten.'}
                      </span>
                    </p>
                  </div>
                </button>
              );
            })
          )}
            </div>
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
        transition: isMobile ? 'opacity 0.25s ease' : 'none'
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
                {selectedRecipient.is_group ? (
                  <>
                    {(() => {
                      const GroupIcon = getGroupIconComponent(selectedRecipient.icon || selectedRecipient.avatar_icon);
                      return (
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '16px',
                          background: 'rgba(255, 255, 255, 0.25)',
                          border: '2px solid rgba(255, 255, 255, 0.85)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          flexShrink: 0
                        }}>
                          <GroupIcon size={24} color="#ffffff" strokeWidth={2.4} />
                        </div>
                      );
                    })()}
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{selectedRecipient.name}</span>
                        {selectedRecipient.admin_only_messaging && (
                          <span style={{
                            fontSize: '0.62rem',
                            fontWeight: 900,
                            background: '#fef3c7',
                            color: '#92400e',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Lock size={10} color="#92400e" />
                            Ankündigungskanal
                          </span>
                        )}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowGroupInfoModal(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '3px 0 0 0',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontSize: '0.75rem',
                          fontWeight: 750
                        }}
                      >
                        <Users size={13} color="#ffffff" />
                        <span>{selectedRecipient.members_count || selectedRecipient.members?.length || 0} Teilnehmer • Details &amp; Mitglieder</span>
                        <Info size={12} color="#ffffff" style={{ opacity: 0.85 }} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>

              {/* Status Badge: DSGVO-konform (OWASP ASVS Level 3 / Art. 32 DSGVO) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                <span 
                  title="DSGVO-konform: Transportverschlüsselung via TLS 1.3, Datenbank im Ruhezustand AES-256 geschützt (Art. 32 DSGVO)"
                  style={{
                    padding: isMobile ? '4px 10px' : '6px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.22)',
                    color: '#ffffff',
                    fontSize: isMobile ? '0.64rem' : '0.72rem',
                    fontWeight: 800,
                    border: '1px solid rgba(255, 255, 255, 0.38)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backdropFilter: 'blur(4px)',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    cursor: 'help'
                  }}
                >
                  <ShieldCheck size={14} color="#ffffff" style={{ flexShrink: 0 }} />
                  <span>DSGVO-konform</span>
                </span>
              </div>
            </div>

            {/* 💬 Teams-Style Channel Tab Bar (Only for Group Chats) */}
            {selectedRecipient.is_group && (
              <div 
                role="tablist"
                aria-label="Gruppen-Kanäle"
                style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '10px 16px',
                  background: '#ffffff',
                  borderBottom: '1px solid #f1f5f9',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  position: 'relative',
                  zIndex: 50
                }}
              >
                {/* Scrollable Channel Pills */}
                <div style={{
                  display: 'flex',
                  gap: '6px',
                  alignItems: 'center',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  flex: 1,
                  minWidth: 0,
                  paddingRight: '6px'
                }}>
                  {groupChannels.map((channel) => {
                    const isActive = activeChannelId === channel.id;
                    const isAnnounce = channel.is_announcement_only;
                    const isThreads = channel.channel_type === 'threads';
                    const IconComp = isAnnounce ? Bell : (isThreads ? MessageSquare : Hash);

                    // Unread count for this channel
                    const unreadCount = (campusMessages || []).filter((m: any) => {
                      if (m.group_id !== selectedRecipient.id) return false;
                      if (m.sender_id === effectiveUid) return false;
                      const msgChannelMatches = m.channel_id ? m.channel_id === channel.id : channel.is_default;
                      if (!msgChannelMatches) return false;
                      const myMembership = selectedRecipient.members?.find((mb: any) => mb.user_id === effectiveUid);
                      const groupLastRead = myMembership?.last_read_at ? new Date(myMembership.last_read_at).getTime() : 0;
                      const lastRead = channelReads.has(channel.id) ? (channelReads.get(channel.id) || 0) : groupLastRead;
                      return new Date(m.created_at).getTime() > lastRead;
                    }).length;

                    const canDelete = !channel.is_default && !isStudent;

                    return (
                      <div
                        key={channel.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          background: isActive ? '#34a853' : '#f1f5f9',
                          borderRadius: '100px',
                          padding: canDelete ? '2px 4px 2px 10px' : '2px 12px',
                          boxShadow: isActive ? '0 2px 6px rgba(52, 168, 83, 0.28)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <button
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          aria-controls={`panel-${channel.id}`}
                          id={`tab-${channel.id}`}
                          onClick={() => {
                            setActiveChannelId(channel.id);
                            const nowTime = Date.now();
                            lastAutoReadRef.current[`chan_${selectedRecipient.id}_${channel.id}`] = nowTime;
                            setChannelReads(prev => new Map(prev).set(channel.id, nowTime));
                            if (effectiveUid) {
                              saveLocalChannelRead(effectiveUid, channel.id, nowTime);
                            }
                            if (selectedRecipient?.id) {
                              if (unreadCount > 0) {
                                setCampusGroups(prev => prev.map(g => {
                                  if (g.id === selectedRecipient.id) {
                                    return { ...g, unreadCount: Math.max(0, (g.unreadCount || 0) - unreadCount) };
                                  }
                                  return g;
                                }));
                              }
                              if (onMarkChannelAsRead) {
                                onMarkChannelAsRead(channel.id, selectedRecipient.id);
                              }
                            }
                          }}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: isActive ? '#ffffff' : '#334155',
                            padding: '4px 0',
                            fontSize: '0.80rem',
                            fontWeight: isActive ? 800 : 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                            touchAction: 'manipulation'
                          }}
                        >
                          <IconComp size={13} color={isActive ? '#ffffff' : (isAnnounce ? '#eab308' : '#64748b')} strokeWidth={2.4} />
                          <span>{channel.name}</span>
                          {!isActive && unreadCount > 0 && (
                            <span style={{
                              marginLeft: '3px',
                              background: '#ea4335',
                              color: '#ffffff',
                              padding: '1px 6px',
                              borderRadius: '100px',
                              fontSize: '0.64rem',
                              fontWeight: 900
                            }}>
                              {unreadCount}
                            </span>
                          )}
                        </button>

                        {canDelete && (
                          <button
                            type="button"
                            title={`Kanal #${channel.name} löschen`}
                            aria-label={`Kanal #${channel.name} löschen`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteChannel(channel.id, channel.name);
                            }}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: isActive ? 'rgba(255, 255, 255, 0.8)' : '#94a3b8',
                              cursor: 'pointer',
                              padding: '3px 4px',
                              borderRadius: '50%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginLeft: '2px',
                              transition: 'color 0.15s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = isActive ? 'rgba(255, 255, 255, 0.8)' : '#94a3b8'; }}
                          >
                            <Trash2 size={12} strokeWidth={2.2} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Channel Actions: Segmented Mode Switch [ Chat | Themen ] & + Kanal */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {(() => {
                    const currentChannel = groupChannels.find(c => c.id === activeChannelId) || groupChannels.find(c => c.is_default) || groupChannels[0];
                    if (!currentChannel) return null;
                    const effectiveMode = (channelViewModeOverrides[currentChannel.id]) || currentChannel.channel_type || 'chat';
                    const isChat = effectiveMode === 'chat';
                    const isThreads = effectiveMode === 'threads';

                    return (
                      <div 
                        role="group"
                        aria-label="Kanalansicht umschalten"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          background: '#f1f5f9',
                          padding: '3px',
                          borderRadius: '100px',
                          border: '1px solid #e2e8f0',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)'
                        }}
                      >
                        <button
                          type="button"
                          role="button"
                          tabIndex={0}
                          aria-pressed={isChat}
                          onClick={() => {
                            setChannelViewModeOverrides(prev => ({ ...prev, [currentChannel.id]: 'chat' }));
                            if (!isStudent && currentChannel.channel_type !== 'chat') {
                              handleToggleChannelType(currentChannel.id, 'chat');
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setChannelViewModeOverrides(prev => ({ ...prev, [currentChannel.id]: 'chat' }));
                              if (!isStudent && currentChannel.channel_type !== 'chat') {
                                handleToggleChannelType(currentChannel.id, 'chat');
                              }
                            }
                          }}
                          style={{
                            border: 'none',
                            background: isChat ? '#ffffff' : 'transparent',
                            color: isChat ? '#0f172a' : '#64748b',
                            borderRadius: '100px',
                            padding: isMobile ? '5px 10px' : '5px 14px',
                            fontSize: '0.74rem',
                            fontWeight: isChat ? 850 : 650,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: isChat ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                            minHeight: '30px',
                            touchAction: 'manipulation'
                          }}
                        >
                          <MessageCircle size={13} color={isChat ? '#15803d' : '#64748b'} strokeWidth={2.4} />
                          <span>Chat</span>
                        </button>

                        <button
                          type="button"
                          role="button"
                          tabIndex={0}
                          aria-pressed={isThreads}
                          onClick={() => {
                            setChannelViewModeOverrides(prev => ({ ...prev, [currentChannel.id]: 'threads' }));
                            if (!isStudent && currentChannel.channel_type !== 'threads') {
                              handleToggleChannelType(currentChannel.id, 'threads');
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setChannelViewModeOverrides(prev => ({ ...prev, [currentChannel.id]: 'threads' }));
                              if (!isStudent && currentChannel.channel_type !== 'threads') {
                                handleToggleChannelType(currentChannel.id, 'threads');
                              }
                            }
                          }}
                          style={{
                            border: 'none',
                            background: isThreads ? '#ffffff' : 'transparent',
                            color: isThreads ? '#0f172a' : '#64748b',
                            borderRadius: '100px',
                            padding: isMobile ? '5px 10px' : '5px 14px',
                            fontSize: '0.74rem',
                            fontWeight: isThreads ? 850 : 650,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: isThreads ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                            minHeight: '30px',
                            touchAction: 'manipulation'
                          }}
                        >
                          <Layers size={13} color={isThreads ? '#15803d' : '#64748b'} strokeWidth={2.4} />
                          <span>Themen</span>
                          {unreadTopicsCount > 0 && (
                            <span style={{
                              background: '#ea4335',
                              color: '#ffffff',
                              borderRadius: '100px',
                              padding: '1px 6px',
                              fontSize: '0.65rem',
                              fontWeight: 800
                            }}>
                              {unreadTopicsCount}
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })()}

                  {/* + Kanal Button (Teachers / Admins only) */}
                  {!isStudent && (
                    <button
                      type="button"
                      onClick={() => setShowCreateChannelModal(true)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '100px',
                        border: '1.5px dashed #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.75rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease',
                        minHeight: '32px'
                      }}
                      className="hover-scale"
                    >
                      <Plus size={14} color="#15803d" strokeWidth={2.6} />
                      <span>Kanal</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Apple/Teams-Style Segmented Mode Switcher (Only for 1:1 Direct Chats) */}
            {!selectedRecipient.is_group && (
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                padding: '8px 16px', 
                background: '#ffffff', 
                borderBottom: '1px solid #f1f5f9',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
                zIndex: 40
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#f1f5f9',
                  padding: '3px',
                  borderRadius: '100px',
                  border: '1px solid #e2e8f0',
                  gap: '2px'
                }}>
                  <button
                    type="button"
                    role="button"
                    tabIndex={0}
                    aria-pressed={oneOnOneMode === 'chat'}
                    onClick={() => setOneOnOneMode('chat')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOneOnOneMode('chat');
                      }
                    }}
                    style={{
                      border: 'none',
                      background: oneOnOneMode === 'chat' ? '#ffffff' : 'transparent',
                      color: oneOnOneMode === 'chat' ? '#0f172a' : '#64748b',
                      borderRadius: '100px',
                      padding: isMobile ? '5px 12px' : '5px 16px',
                      fontSize: '0.76rem',
                      fontWeight: oneOnOneMode === 'chat' ? 850 : 650,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: oneOnOneMode === 'chat' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                      minHeight: '30px',
                      touchAction: 'manipulation'
                    }}
                  >
                    <MessageCircle size={13} color={oneOnOneMode === 'chat' ? '#15803d' : '#64748b'} strokeWidth={2.4} />
                    <span>Chat</span>
                    {unreadDirectChatCount > 0 && (
                      <span style={{
                        background: '#ea4335',
                        color: '#ffffff',
                        borderRadius: '100px',
                        padding: '1px 6px',
                        fontSize: '0.65rem',
                        fontWeight: 800
                      }}>
                        {unreadDirectChatCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    role="button"
                    tabIndex={0}
                    aria-pressed={oneOnOneMode === 'threads'}
                    onClick={() => setOneOnOneMode('threads')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOneOnOneMode('threads');
                      }
                    }}
                    style={{
                      border: 'none',
                      background: oneOnOneMode === 'threads' ? '#ffffff' : 'transparent',
                      color: oneOnOneMode === 'threads' ? '#0f172a' : '#64748b',
                      borderRadius: '100px',
                      padding: isMobile ? '5px 12px' : '5px 16px',
                      fontSize: '0.76rem',
                      fontWeight: oneOnOneMode === 'threads' ? 850 : 650,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: oneOnOneMode === 'threads' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                      minHeight: '30px',
                      touchAction: 'manipulation'
                    }}
                  >
                    <Layers size={13} color={oneOnOneMode === 'threads' ? '#15803d' : '#64748b'} strokeWidth={2.4} />
                    <span>Themen</span>
                    {unreadTopicsCount > 0 ? (
                      <span style={{
                        background: '#ea4335',
                        color: '#ffffff',
                        borderRadius: '100px',
                        padding: '1px 6px',
                        fontSize: '0.65rem',
                        fontWeight: 800
                      }}>
                        {unreadTopicsCount}
                      </span>
                    ) : activeRootTopics.length > 0 ? (
                      <span style={{
                        background: oneOnOneMode === 'threads' ? '#e6f4ea' : '#e2e8f0',
                        color: oneOnOneMode === 'threads' ? '#15803d' : '#475569',
                        borderRadius: '100px',
                        padding: '1px 6px',
                        fontSize: '0.65rem',
                        fontWeight: 800
                      }}>
                        {activeRootTopics.length}
                      </span>
                    ) : null}
                  </button>
                </div>

                {/* Right Context Hint & Quick Topic Action */}
                <div style={{
                  display: isMobile ? 'none' : 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  {oneOnOneMode === 'threads' && (
                    <button
                      type="button"
                      onClick={() => setIsTopicComposerOpen(true)}
                      aria-label="Neues Thema eröffnen"
                      style={{
                        padding: '4px 12px',
                        borderRadius: '100px',
                        border: '1px solid #bbf7d0',
                        background: '#f0fdf4',
                        color: '#15803d',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 1px 3px rgba(22, 163, 74, 0.08)'
                      }}
                      className="hover-scale"
                    >
                      <Plus size={13} strokeWidth={2.8} />
                      <span>Neues Thema</span>
                    </button>
                  )}

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.74rem',
                    color: '#94a3b8',
                    fontWeight: 650
                  }}>
                    <ShieldCheck size={12} color="#15803d" />
                    <span>Direktchat</span>
                  </div>
                </div>
              </div>
            )}

            {/* Message History */}
            <div 
              ref={chatScrollContainerRef}
              role="tabpanel"
              id={selectedRecipient.is_group ? `panel-${activeChannelId || 'default'}` : `panel-${activeSubTab}`}
              aria-labelledby={selectedRecipient.is_group ? `tab-${activeChannelId || 'default'}` : undefined}
              style={{ 
                flex: 1, 
                padding: isMobile ? '20px 16px' : '28px', 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                background: '#fafbfc'
              }} 
              className="custom-scrollbar"
            >
              {/* Apple Senior App Designer - Glassmorphic Calendar Event Card */}
              {activeSubTab !== 'all' && activeSubTab !== 'general' && (() => {
                const currentTab = activeOccurrenceTabs.find(t => t.id === activeSubTab || (t.allIds && t.allIds.includes(activeSubTab)));
                if (!currentTab) return null;
                const occDate = parseLocalDate(currentTab.date);
                const dayName = occDate.toLocaleDateString('de-DE', { weekday: 'long' });
                const dateFormatted = occDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
                const timeFormatted = currentTab.start_time ? currentTab.start_time.slice(0, 5) : '';

                // Extract Stammtermin (original date & time) if rescheduled
                const occObj = currentTab.occurrence || currentTab;
                let stammterminText: string | null = null;
                const isActuallyShifted = Boolean(
                  occObj.status === 'pending_reschedule' || 
                  occObj.status === 'rescheduled_confirmed' || 
                  occObj.status === 'reschedule_requested' ||
                  occObj.is_rescheduled || 
                  (occObj.original_date && occObj.original_date !== currentTab.date)
                );

                if (isActuallyShifted && occObj) {
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
                    padding: isMobile ? '14px' : '16px 20px',
                    marginBottom: '14px',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'center',
                    justifyContent: 'space-between',
                    gap: isMobile ? '14px' : '16px',
                    boxShadow: '0 10px 25px -5px rgba(52, 168, 83, 0.1), 0 4px 10px -2px rgba(0,0,0,0.03)',
                    backdropFilter: 'blur(12px)',
                    boxSizing: 'border-box'
                  }}>
                    {/* Left: Apple Calendar Tear-Off Badge & Details */}
                    <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '12px' : '16px', flex: 1, minWidth: 0 }}>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            1:1 Termin-Shoutbox
                          </span>
                          {(() => {
                            const occStatus = String(occObj?.status || 'scheduled').toLowerCase();
                            const isCurrentlyCancelled = ['cancelled', 'canceled_by_student', 'canceled', 'teacher_sick', 'canceled_by_teacher_sick'].includes(occStatus);
                            
                            const isReactivated = !isCurrentlyCancelled && (
                              (currentTab.messages || []).some((m: any) => 
                                m.message_type === 'cancellation_reset' || 
                                (m.content && (m.content.includes('reaktiviert') || m.content.includes('zurückgenommen') || m.content.includes('regulär statt') || m.content.includes('zurückgesetzt')))
                              ) ||
                              displayedMessages.some((m: any) => m.message_type === 'cancellation_reset')
                            );

                            let badgeIcon = <Check size={11} strokeWidth={3} />;
                            let badgeLabel = 'Planmäßiger Unterricht';
                            let badgeBg = '#dcfce7';
                            let badgeColor = '#15803d';
                            let badgeBorder = '1px solid #bbf7d0';

                            if (isCurrentlyCancelled) {
                              badgeIcon = <X size={11} strokeWidth={3} />;
                              badgeLabel = 'Termin abgesagt';
                              badgeBg = '#fef2f2';
                              badgeColor = '#991b1b';
                              badgeBorder = '1px solid #fecaca';
                            } else if (isReactivated) {
                              badgeIcon = <RotateCcw size={11} strokeWidth={2.5} />;
                              badgeLabel = 'Termin reaktiviert (Planmäßig)';
                              badgeBg = '#dcfce7';
                              badgeColor = '#15803d';
                              badgeBorder = '1px solid #86efac';
                            } else if (stammterminText) {
                              badgeIcon = <Clock size={11} strokeWidth={2.5} />;
                              badgeLabel = 'Termin verschoben';
                              badgeBg = '#fef3c7';
                              badgeColor = '#b45309';
                              badgeBorder = '1px solid #fde68a';
                            }

                            return (
                              <span style={{
                                fontSize: '0.68rem',
                                background: badgeBg,
                                color: badgeColor,
                                padding: '3px 10px',
                                borderRadius: '100px',
                                fontWeight: 850,
                                border: badgeBorder,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                {badgeIcon}
                                <span>{badgeLabel}</span>
                              </span>
                            );
                          })()}
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
                            boxShadow: '0 2px 6px rgba(52, 168, 83, 0.05)',
                            minWidth: 0
                          }}>
                            {/* Original Stammtermin Pill */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#64748b', fontWeight: 600, minWidth: 0 }}>
                              <span style={{ fontSize: '0.64rem', fontWeight: 800, textTransform: 'uppercase', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>Stammtermin</span>
                              <span style={{ overflowWrap: 'break-word' }}>{stammterminText}</span>
                            </div>

                            {/* Transition Arrow */}
                            <div style={{ color: '#34a853', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                              <ArrowRight size={13} color="#34a853" strokeWidth={2.6} />
                            </div>

                            {/* New Rescheduled Date Pill */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#15803d', fontWeight: 800, minWidth: 0 }}>
                              <span style={{ fontSize: '0.64rem', fontWeight: 900, textTransform: 'uppercase', background: '#34a853', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>Neu</span>
                              <span style={{ overflowWrap: 'break-word' }}>{neuFormattedText}</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.98rem', color: '#0f172a', fontWeight: 850, letterSpacing: '-0.01em', overflowWrap: 'break-word' }}>
                            {dayName}, {dateFormatted}
                          </div>
                        )}

                        {!stammterminText && (
                          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={12} color="#34a853" style={{ flexShrink: 0 }} />
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
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: stammterminText ? '0 3px 12px rgba(217, 119, 6, 0.3)' : '0 3px 12px rgba(52, 168, 83, 0.25)',
                        flexShrink: 0,
                        width: isMobile ? '100%' : 'auto',
                        minHeight: isMobile ? '44px' : undefined,
                        boxSizing: 'border-box',
                        touchAction: 'manipulation',
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

              {(() => {
                const isGroupActive = Boolean(selectedRecipient?.is_group);
                const currentActiveChannel = isGroupActive
                  ? (groupChannels.find(c => c.id === activeChannelId) || groupChannels.find(c => c.is_default) || groupChannels[0])
                  : null;
                const isThreadsMode = isGroupActive
                  ? ((channelViewModeOverrides[currentActiveChannel?.id || '']) 
                      ? channelViewModeOverrides[currentActiveChannel?.id || ''] === 'threads' 
                      : currentActiveChannel?.channel_type === 'threads')
                  : oneOnOneMode === 'threads';

                if (isThreadsMode) {
                  if (activeRootTopics.length === 0) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', gap: '14px', padding: '40px 20px', textAlign: 'center' }}>
                        <div style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '16px',
                          background: '#f0fdf4',
                          border: '1.5px solid #bbf7d0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#16a34a'
                        }}>
                          <Sparkles size={28} />
                        </div>
                        <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                          {isGroupActive ? `Noch keine Themen in #${currentActiveChannel?.name || 'Kanal'}` : 'Noch keine strukturierten Themen'}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '340px', lineHeight: 1.45 }}>
                          {isGroupActive ? (
                            (!isStudent || currentActiveChannel?.allow_student_topics
                              ? 'Eröffne das erste Thema mit Betreff und starte die Diskussion für deine Gruppe!'
                              : 'Sobald deine Lehrkraft ein Thema eröffnet, kannst du hier direkt antworten und mit Emojis reagieren.')
                          ) : (
                            'Eröffne ein Thema mit Betreff (z. B. Kaufempfehlungen, Übestrategien oder Notenfragen), um wichtige Absprachen übersichtlich im Thread festzuhalten.'
                          )}
                        </div>

                        {/* Goldstandard Empty State Action Button */}
                        {(!isGroupActive || !isStudent || currentActiveChannel?.allow_student_topics) && (
                          <button
                            type="button"
                            onClick={() => setIsTopicComposerOpen(true)}
                            aria-label="Erstes Thema eröffnen"
                            style={{
                              marginTop: '6px',
                              padding: '9px 18px',
                              borderRadius: '12px',
                              background: '#16a34a',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '0.82rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                              transition: 'all 0.15s ease',
                              touchAction: 'manipulation'
                            }}
                            className="hover-scale"
                          >
                            <Plus size={15} strokeWidth={2.8} />
                            <span>Erstes Thema eröffnen</span>
                          </button>
                        )}
                      </div>
                    );
                  }

                  const myMembership = isGroupActive ? selectedRecipient.members?.find((mb: any) => mb.user_id === effectiveUid) : null;
                  const groupLastRead = myMembership?.last_read_at ? new Date(myMembership.last_read_at).getTime() : 0;
                  const lastRead = isGroupActive
                    ? (activeChannelId && channelReads.has(activeChannelId) 
                        ? (channelReads.get(activeChannelId) || 0) 
                        : groupLastRead)
                    : 0;

                  return activeRootTopics.map(topic => {
                    const replies = activeThreadMessages.filter(m => m.parent_message_id === topic.id);
                    const isUnread = Boolean(
                      effectiveUid && topic.sender_id !== effectiveUid && (
                        (isGroupActive ? new Date(topic.created_at).getTime() > lastRead : !topic.is_read) ||
                        replies.some(r => r.sender_id !== effectiveUid && (isGroupActive ? new Date(r.created_at).getTime() > lastRead : !r.is_read))
                      )
                    );

                    return (
                      <CampusTopicCard
                        key={topic.id}
                        topic={topic}
                        replies={replies}
                        currentUserId={effectiveUid || user?.id}
                        isStudent={isStudent}
                        canReply={isGroupActive ? (!currentActiveChannel?.is_announcement_only || !isStudent) : true}
                        onSendReply={handleSendTopicReply}
                        onToggleReaction={handleToggleReaction}
                        reactions={messageReactions}
                        resolveUserDisplayName={formatStudentDisplayName}
                        resolveUserAvatar={resolveCampusAvatar}
                        findUserById={findUserById}
                        isMobile={isMobile}
                        isUnread={isUnread}
                        autoFocusReply={Boolean(focusedTopicId && topic.id === focusedTopicId)}
                      />
                    );
                  });
                }

                if (displayedMessages.length === 0) {
                  return (
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
                        {selectedRecipient?.is_group ? `Noch keine Nachrichten in „${selectedRecipient.name}“` : `Noch keine Nachrichten mit ${formatStudentDisplayName(selectedRecipient)}`}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '320px' }}>
                        {selectedRecipient?.is_group ? 'Beginne den Austausch mit dieser Gruppe!' : 'Schreibe eine persönliche Nachricht oder verwalte terminbezogene Shoutbox-Anfragen!'}
                      </div>
                    </div>
                  );
                }

                return displayedMessages.map((msg, idx) => {
                  const isSelf = msg.sender_id === user.id;
                  const isSys = isSystemMessage(msg);

                  if (isSys) {
                    // System messages must NEVER be rendered in the 'all' / 'general' human dialogue stream!
                    if (activeSubTab === 'all' || activeSubTab === 'general') {
                      return null;
                    }

                    const currentOccTab = activeOccurrenceTabs.find(t => t.id === activeSubTab || (t.allIds && t.allIds.includes(activeSubTab)) || t.date === activeSubTab);
                    const laterSysMsg = displayedMessages.slice(idx + 1).find(m => isSystemMessage(m));
                    const isSuperseded = Boolean(laterSysMsg);

                    // Find matching occurrence even in 'all' view
                    const matchedOcc = currentOccTab?.occurrence || (studentOccurrences || []).find(o => 
                      (msg.occurrence_id && String(o.id) === String(msg.occurrence_id)) || 
                      (extractOccurrenceDateFromMessage(msg) && o.date === extractOccurrenceDateFromMessage(msg))
                    );

                    return (
                      <AppleSystemNotificationCard 
                        key={msg.id || `sys-${idx}`} 
                        msg={msg} 
                        selectedRecipient={selectedRecipient}
                        onSendMessage={onSendMessage}
                        isSuperseded={isSuperseded}
                        currentOcc={matchedOcc}
                      />
                    );
                  }

                  const msgDate = new Date(msg.created_at);
                  const prevMsg = idx > 0 ? displayedMessages[idx - 1] : null;
                  const prevMsgDate = prevMsg ? new Date(prevMsg.created_at) : null;
                  
                  const isNewDay = !prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString();
                  const isContinuation = prevMsg && !isNewDay && prevMsg.sender_id === msg.sender_id && (msgDate.getTime() - prevMsgDate.getTime() < 5 * 60 * 1000);

                  // Date label formatting
                  const todayObj = new Date();
                  const yesterdayObj = new Date();
                  yesterdayObj.setDate(todayObj.getDate() - 1);
                  let dateLabel = '';
                  if (msgDate.toDateString() === todayObj.toDateString()) {
                    dateLabel = 'Heute';
                  } else if (msgDate.toDateString() === yesterdayObj.toDateString()) {
                    dateLabel = 'Gestern';
                  } else {
                    dateLabel = msgDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
                  }

                  const timeStr = msgDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

                  // Group Chat: resolve individual sender information
                  const senderUser = selectedRecipient?.is_group
                    ? (allKnownUsersMap.get(msg.sender_id) || { id: msg.sender_id, first_name: 'Mitglied', last_name: '', role: 'student' })
                    : selectedRecipient;

                  const isSenderTeacher = (senderUser?.role || '').toLowerCase() === 'teacher' ||
                    (Array.isArray(senderUser?.roles) && senderUser.roles.includes('teacher'));

                  return (
                    <React.Fragment key={msg.id || `msg-${idx}`}>
                      {/* Natural Date Separator Badge */}
                      {isNewDay && (
                        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '14px 0 8px 0' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: '#64748b',
                            background: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            padding: '3px 12px',
                            borderRadius: '100px',
                            letterSpacing: '0.01em',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                          }}>
                            {dateLabel}
                          </span>
                        </div>
                      )}

                      {/* Natural Message Bubble Row */}
                      <div 
                        style={{
                          display: 'flex',
                          alignItems: 'flex-end',
                          gap: '8px',
                          width: '100%',
                          justifyContent: isSelf ? 'flex-end' : 'flex-start',
                          marginTop: isContinuation ? '3px' : '10px'
                        }}
                      >
                        {/* Avatar on the left for incoming messages (only on initial message of cluster) */}
                        {!isSelf && (
                          !isContinuation ? (
                            <img
                              src={resolveCampusAvatar(senderUser)}
                              alt=""
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '1.5px solid white',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                                flexShrink: 0,
                                marginBottom: '2px'
                              }}
                            />
                          ) : (
                            <div style={{ width: '32px', flexShrink: 0 }} />
                          )
                        )}

                        {/* Chat Bubble with natural sizing, sender name, and inline metadata */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', maxWidth: isMobile ? '80%' : '68%' }}>
                          {/* Sender Name & Role Badges above incoming bubble */}
                          {!isSelf && (!isContinuation || (msg.sender_role === 'parent' && prevMsg?.sender_role !== 'parent')) && (
                            <div style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: isSenderTeacher ? '#15803d' : (msg.sender_role === 'parent' ? '#1d4ed8' : '#475569'),
                              marginBottom: '3px',
                              marginLeft: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span>{formatStudentDisplayName(senderUser)}</span>
                              {isSenderTeacher && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '1px 6px',
                                  borderRadius: '6px',
                                  background: '#f0fdf4',
                                  border: '1px solid #bbf7d0',
                                  color: '#15803d',
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  lineHeight: 1
                                }}>
                                  <GraduationCap size={10} color="#15803d" strokeWidth={2.4} />
                                  <span>Lehrkraft</span>
                                </span>
                              )}
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
                            </div>
                          )}

                          {/* Appointment context tag pill if in 'all' view */}
                          {(activeSubTab === 'all' || activeSubTab === 'general') && (() => {
                            const msgCtx = getMessageOccurrenceContext(msg);
                            if (!msgCtx || isContinuation) return null;
                            return (
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.66rem',
                                fontWeight: 750,
                                color: '#15803d',
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                borderRadius: '100px',
                                padding: '2px 9px',
                                marginBottom: '4px',
                                alignSelf: isSelf ? 'flex-end' : 'flex-start',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                              }}>
                                <Calendar size={10} color="#15803d" />
                                <span>{msgCtx.label}</span>
                              </div>
                            );
                          })()}

                          <div 
                            style={{
                              padding: '11px 16px 8px 16px',
                              borderRadius: isSelf 
                                ? (isContinuation ? '18px 6px 6px 18px' : '18px 18px 4px 18px')
                                : (isContinuation ? '6px 18px 18px 6px' : '18px 18px 18px 4px'),
                              background: isSelf ? 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)' : '#ffffff',
                              color: isSelf ? '#ffffff' : '#0f172a',
                              boxShadow: isSelf ? '0 2px 8px rgba(21, 128, 61, 0.22)' : '0 2px 6px rgba(0,0,0,0.04)',
                              border: isSelf ? 'none' : '1px solid #e2e8f0',
                              fontSize: '0.95rem',
                              lineHeight: '1.45',
                              wordBreak: 'break-word',
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            <div>{cleanChatMessageContent(msg.content)}</div>

                            {/* Time, Read Status & Report Flag inside the bubble */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 650,
                              color: isSelf ? 'rgba(255, 255, 255, 0.85)' : '#64748b',
                              marginTop: '6px',
                              lineHeight: 1
                            }}>
                              <span>{timeStr}</span>
                              {isSelf && (
                                <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                                  <CheckCheck size={14} color="#ffffff" style={{ opacity: msg.is_read ? 1 : 0.75 }} />
                                </div>
                              )}
                              {Boolean(selectedRecipient?.is_group) && !isSelf && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInitiateReport(msg);
                                  }}
                                  title="Nachricht vertraulich melden"
                                  aria-label="Nachricht vertraulich melden"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '2px',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    marginLeft: '4px'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                                >
                                  <Flag size={11} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                });
              })()}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer with Quick Replies or Topic Composer */}
            {(() => {
              const currentActiveChannel = groupChannels.find(c => c.id === activeChannelId) || groupChannels.find(c => c.is_default);
              const isGroupActive = Boolean(selectedRecipient?.is_group);
              const isThreadsMode = isGroupActive
                ? ((channelViewModeOverrides[currentActiveChannel?.id || '']) 
                    ? channelViewModeOverrides[currentActiveChannel?.id || ''] === 'threads' 
                    : currentActiveChannel?.channel_type === 'threads')
                : oneOnOneMode === 'threads';
              const isChannelAnnouncementOnly = isGroupActive && (
                currentActiveChannel?.is_announcement_only ||
                (!currentActiveChannel && selectedRecipient?.admin_only_messaging)
              );

              if (isThreadsMode) {
                return (
                  <CampusTopicComposer
                    channelName={isGroupActive ? (currentActiveChannel?.name || 'allgemein') : (selectedRecipient?.first_name || 'Direkt')}
                    recipientDisplayName={isGroupActive ? undefined : formatStudentDisplayName(selectedRecipient)}
                    isGroup={isGroupActive}
                    canCreateTopic={isGroupActive ? (!isStudent || Boolean(currentActiveChannel?.allow_student_topics)) : true}
                    onPublishTopic={handlePublishTopic}
                    isMobile={isMobile}
                    isOpen={isTopicComposerOpen}
                    onOpenChange={setIsTopicComposerOpen}
                  />
                );
              }

              if (isStudent && isChannelAnnouncementOnly) {
                return (
                  <div style={{
                    padding: '14px 20px',
                    borderTop: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#64748b',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Lock size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
                      <span>Dies ist ein Ankündigungskanal. Nur die Lehrkraft kann freie Nachrichten verfassen.</span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await sendDirectQuickMessage('Gesehen & notiert');
                        await handleAcknowledgeAndMarkAsRead(selectedRecipient);
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '100px',
                        background: '#ffffff',
                        border: '1px solid #bbf7d0',
                        color: '#15803d',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 3px rgba(52, 168, 83, 0.08)',
                        whiteSpace: 'nowrap',
                        touchAction: 'manipulation'
                      }}
                      className="hover-scale"
                    >
                      <CheckCheck size={14} color="#15803d" strokeWidth={2.4} />
                      <span>Gesehen &amp; notiert</span>
                    </button>
                  </div>
                );
              }
              return null;
            })() || (isStudent && (user?.parent_allow_chat === false || (typeof window !== 'undefined' && (localStorage.getItem('campus_allow_chat') === 'false' || localStorage.getItem(`groovelab_parent_allow_chat_${user?.id}`) === 'false'))) && (typeof window !== 'undefined' && sessionStorage.getItem('groovelab_parent_unlocked_global') !== 'true') ? (
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
              <div style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc', padding: isMobile ? '8px 12px max(12px, env(safe-area-inset-bottom)) 12px' : '12px 24px' }}>
                {/* Quick Replies Pill Bar: Vetted Micro-Chips Suite (100% Harmonized & Monochrome) */}
                {(() => {
                  const isUserTeacher = user?.role?.toLowerCase() === 'teacher' || user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'secretary';
                  const vettedQuickChips = isUserTeacher ? [
                    { icon: CheckCheck, label: 'Gesehen & notiert', text: 'Gesehen und notiert, vielen Dank für die Rückmeldung!' },
                    { icon: Music, label: 'Noten & Instrument dabei?', text: 'Bitte an das Notenheft und das Instrument für den Unterricht denken.' },
                    { icon: Clock, label: '5 Min. später vor Ort', text: 'Ich bin gleich da, verzögert sich um ca. 5 Minuten.' },
                    { icon: Sparkles, label: 'Keine Sorge, alles gut!', text: 'Keine Sorge, alles in bester Ordnung!' }
                  ] : [
                    { icon: CheckCheck, label: 'Gesehen & danke!', text: 'Gesehen und vielen Dank für die Information!' },
                    { icon: Clock, label: 'Bin ca. 5 Min. später da', text: 'Ich verspäte mich leider um ca. 5 Minuten, bin aber gleich da!' },
                    { icon: Music, label: 'Noten & Instrument dabei', text: 'Notenheft und Instrument sind eingepackt, alles bereit!' },
                    { icon: HeartHandshake, label: 'Danke für das Verständnis!', text: 'Vielen Dank für das Verständnis und die Geduld!' }
                  ];

                  return (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      overflowX: 'auto',
                      paddingBottom: '8px',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }}>
                      {vettedQuickChips.map((chip, idx) => (
                        <button
                          key={`chip-${idx}`}
                          type="button"
                          onClick={async () => {
                            if (chip.label.includes('Gesehen')) {
                              await sendDirectQuickMessage(chip.text);
                              await handleAcknowledgeAndMarkAsRead(selectedRecipient);
                              setTypedMessage('');
                            } else {
                              setTypedMessage(chip.text);
                            }
                          }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '100px',
                            background: '#ffffff',
                            border: '1px solid #bbf7d0',
                            color: '#15803d',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(52, 168, 83, 0.08)',
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            minHeight: isMobile ? '38px' : '32px',
                            touchAction: 'manipulation',
                            transition: 'all 0.15s ease'
                          }}
                          className="hover-scale"
                        >
                          <chip.icon size={13} strokeWidth={2.4} color="#15803d" style={{ flexShrink: 0 }} />
                          <span>{chip.label}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}

                {/* 🌙 Geschützte Ruhezeit & Feierabend */}
                {(() => {
                  if (isRecipientInQuietHours && isStudent) {
                    const teacherName = formatTeacherFullName(selectedRecipient);
                    return (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '7px 12px',
                        marginBottom: '6px',
                        fontSize: '0.74rem',
                        color: '#475569',
                        fontWeight: 600,
                        width: '100%',
                        boxSizing: 'border-box'
                      }}>
                        <Moon size={14} color="#64748b" style={{ flexShrink: 0 }} />
                        <span>🌙 {teacherName} hat Feierabend • Deine Nachricht wird zugestellt und am nächsten Schultag beantwortet.</span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* 🛡️ Institutional Child Protection & Four-Eyes Banner (§ 8a SGB VIII / BKiSchG) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '6px 12px',
                  marginBottom: '6px',
                  fontSize: '0.71rem',
                  color: '#166534',
                  fontWeight: 650,
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  <ShieldCheck size={14} color="#16a34a" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, lineHeight: 1.35 }}>
                    <strong>Didaktischer Schul-Chat:</strong> Nur für Unterrichtszwecke • Für Erziehungsberechtigte transparent einsehbar.
                  </span>
                </div>

                {/* 🚨 Pre-Flight Respect Guard Warning & Crisis Intervention Card */}
                {respectWarning && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    background: respectWarning.isCrisis ? '#fef2f2' : '#fffbeb',
                    border: `1.5px solid ${respectWarning.isCrisis ? '#fca5a5' : '#fcd34d'}`,
                    borderRadius: '14px',
                    padding: '10px 14px',
                    marginBottom: '8px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: respectWarning.isCrisis ? '#991b1b' : '#92400e', fontWeight: 800, fontSize: '0.80rem' }}>
                      <AlertTriangle size={16} color={respectWarning.isCrisis ? '#dc2626' : '#d97706'} style={{ flexShrink: 0 }} />
                      <span>{respectWarning.isCrisis ? 'Wichtiger Hinweis & Hilfeangebot' : 'Respektvoller Umgang im Schul-Chat'}</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: respectWarning.isCrisis ? '#7f1d1d' : '#78350f', lineHeight: 1.4, fontWeight: 550 }}>
                      {respectWarning.reason}
                    </div>
                    {respectWarning.isCrisis && (
                      <div style={{
                        background: '#ffffff',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '0.72rem',
                        color: '#991b1b',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '2px'
                      }}>
                        <span>Kostenlose & anonyme Nummer gegen Kummer:</span>
                        <a href="tel:116111" style={{ color: '#b91c1c', textDecoration: 'underline', fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={12} color="#dc2626" style={{ flexShrink: 0 }} />
                          <span>116 111</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Apple HIG In-Field Send Composer */}
                <form onSubmit={handleSend} style={{ display: 'flex', width: '100%', position: 'relative', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    placeholder="Deine Nachricht..."
                    value={typedMessage}
                    onChange={e => {
                      setTypedMessage(e.target.value);
                      if (respectWarning) setRespectWarning(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '11px 48px 11px 18px',
                      minHeight: '44px',
                      borderRadius: '100px',
                      border: '1.5px solid #e2e8f0',
                      background: '#ffffff',
                      fontSize: '0.90rem',
                      outline: 'none',
                      fontWeight: 550,
                      color: '#0f172a',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#15803d';
                      e.target.style.boxShadow = '0 0 0 3px rgba(21, 128, 61, 0.15)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!typedMessage.trim()}
                    aria-label="Nachricht senden"
                    style={{
                      position: 'absolute',
                      right: '5px',
                      border: 'none',
                      background: !typedMessage.trim() ? '#f1f5f9' : 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
                      color: !typedMessage.trim() ? '#94a3b8' : '#ffffff',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      minWidth: '36px',
                      minHeight: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: !typedMessage.trim() ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: !typedMessage.trim() ? 'none' : '0 2px 6px rgba(21, 128, 61, 0.25)',
                      flexShrink: 0,
                      touchAction: 'manipulation'
                    }}
                    className={typedMessage.trim() ? 'hover-scale' : ''}
                  >
                    <Send size={16} strokeWidth={2.4} />
                  </button>
                </form>
              </div>
            ))}
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
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CampusGroovelabText campusColor="#ffffff" groovelabColor="#fde047" /> Nachrichten & Shoutbox ({assignedStudents.length})
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                    DSGVO-konforme Direktnachrichten &amp; termingekoppelte Abstimmungen
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
                      onClick={() => {
                        setSelectedRecipient(partner);
                        const uid = effectiveUid || user?.id || '';
                        if (uid && partner?.id) {
                          saveLocalDirectRead(uid, partner.id, Date.now());
                          const unreads = (campusMessages || [])
                            .filter(m => !m.group_id && m.sender_id === partner.id && m.recipient_id === uid)
                            .map(m => m.id);
                          if (unreads.length > 0) {
                            saveLocalReadMsgIds(uid, unreads);
                          }
                          if (onMarkAsRead) {
                            onMarkAsRead(partner.id);
                          }
                        }
                      }}
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
          role="dialog"
          aria-modal="true"
          aria-label="Eltern Master-PIN Eingabe"
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
            padding: '16px',
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
              padding: '28px 20px max(24px, env(safe-area-inset-bottom)) 20px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              boxSizing: 'border-box'
            }}
          >
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '18px',
              background: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Lock size={26} />
            </div>

            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                Eltern Master-PIN
              </h3>
              <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748b', lineHeight: 1.4, fontWeight: 500 }}>
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
              margin: '6px 0'
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
              marginTop: '4px'
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
                      minHeight: '50px',
                      borderRadius: '16px',
                      border: '1.5px solid #f1f5f9',
                      background: isClear || isBack ? '#f8fafc' : '#ffffff',
                      color: isClear ? '#ef4444' : isBack ? '#64748b' : '#0f172a',
                      fontSize: isBack ? '1.1rem' : '1.25rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
                      transition: 'all 0.12s ease',
                      touchAction: 'manipulation'
                    }}
                    className="hover-scale"
                  >
                    {key}
                  </button>
                );
              })}
            </div>

            {/* Biometric Passkey Unlock (Face ID / Touch ID) */}
            {isWebAuthnSupported() && (
              <button
                type="button"
                disabled={isVerifyingPin}
                onClick={handleBiometricUnlock}
                style={{
                  marginTop: '6px',
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  border: '1px solid #bae6fd',
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  color: '#0284c7',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: isVerifyingPin ? 'not-allowed' : 'pointer',
                  opacity: isVerifyingPin ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale"
              >
                <Fingerprint size={20} />
                <span>{isVerifyingPin ? 'Wird geprüft...' : 'Mit Face ID / Touch ID entsperren'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setShowParentPinModal(false);
              }}
              style={{
                marginTop: '6px',
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '100px',
                background: '#f1f5f9',
                color: '#64748b',
                border: 'none',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                touchAction: 'manipulation'
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* 🚀 Modal: Gruppe erstellen Wizard */}
      <CampusCreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        assignedStudents={assignedStudents}
        currentUserId={effectiveUid || user?.id || ''}
        onGroupCreated={(newGroup) => {
          fetchCampusGroups();
          if (newGroup) {
            setSelectedRecipient({ ...newGroup, is_group: true });
            setActiveMainTab('groups');
          }
        }}
      />

      {/* 📢 Modal: Kanal erstellen Wizard (Microsoft Teams-Style) */}
      <CampusCreateChannelModal
        isOpen={showCreateChannelModal}
        onClose={() => setShowCreateChannelModal(false)}
        groupId={selectedRecipient?.id || ''}
        groupName={selectedRecipient?.name || 'Gruppen-Chat'}
        onChannelCreated={(newChan) => {
          if (selectedRecipient?.id) {
            fetchGroupChannels(selectedRecipient.id);
          }
          if (newChan?.id) {
            setActiveChannelId(newChan.id);
          }
        }}
      />

      {/* ℹ️ Modal: Gruppen-Details & Mitgliederliste */}
      {showGroupInfoModal && selectedRecipient?.is_group && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Gruppen-Details"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={() => setShowGroupInfoModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '28px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Banner */}
            <div style={{
              padding: '24px',
              background: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)',
              color: '#ffffff',
              borderRadius: '28px 28px 0 0',
              position: 'relative'
            }}>
              <button
                type="button"
                onClick={() => setShowGroupInfoModal(false)}
                aria-label="Schließen"
                style={{
                  position: 'absolute',
                  top: '18px',
                  right: '18px',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backdropFilter: 'blur(4px)'
                }}
              >
                ✕
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '18px',
                  background: '#ffffff',
                  color: selectedRecipient.color || selectedRecipient.color_accent || '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                  flexShrink: 0
                }}>
                  {React.createElement(getGroupIconComponent(selectedRecipient.icon || selectedRecipient.avatar_icon), { size: 30, strokeWidth: 2.3 })}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>
                    {selectedRecipient.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      backdropFilter: 'blur(4px)'
                    }}>
                      Gruppe • {groupMembersDetails.length} Mitglieder
                    </span>
                    {selectedRecipient.admin_only_messaging && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backdropFilter: 'blur(4px)'
                      }}>
                        <Lock size={10} color="#ffffff" />
                        Ankündigungskanal
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {selectedRecipient.description && (
                <div style={{
                  marginTop: '16px',
                  fontSize: '0.84rem',
                  color: 'rgba(255, 255, 255, 0.9)',
                  lineHeight: 1.45,
                  padding: '10px 14px',
                  background: 'rgba(0, 0, 0, 0.12)',
                  borderRadius: '12px'
                }}>
                  {selectedRecipient.description}
                </div>
              )}
            </div>

            {/* Member List */}
            <div style={{ padding: '20px 24px', flex: 1 }}>
              <div style={{
                fontSize: '0.78rem',
                fontWeight: 900,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '12px'
              }}>
                Mitglieder ({groupMembersDetails.length})
              </div>

              {groupMembersLoading ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.85rem' }}>
                  Mitglieder laden...
                </div>
              ) : groupMembersDetails.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.85rem' }}>
                  Keine Mitgliederinformationen gefunden.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {groupMembersDetails.map((m: any) => {
                    const isGroupAdmin = m.member_role === 'admin' || m.id === selectedRecipient.creator_id;
                    const isSelfMember = m.id === user?.id;

                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '14px',
                          background: '#f8fafc',
                          border: '1px solid #f1f5f9'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <img
                            src={resolveCampusAvatar(m)}
                            alt=""
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '1.5px solid #e2e8f0',
                              flexShrink: 0
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              fontSize: '0.88rem',
                              fontWeight: 800,
                              color: '#0f172a',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {formatStudentDisplayName(m)}
                              </span>
                              {isSelfMember && (
                                <span style={{
                                  fontSize: '0.68rem',
                                  color: '#64748b',
                                  fontWeight: 600
                                }}>
                                  (Du)
                                </span>
                              )}
                            </div>
                            {m.instrument && (
                              <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                                {m.instrument}
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          {isGroupAdmin ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 9px',
                              borderRadius: '100px',
                              background: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              color: '#15803d',
                              fontSize: '0.70rem',
                              fontWeight: 800
                            }}>
                              <GraduationCap size={11} color="#15803d" />
                              <span>Gruppenleitung</span>
                            </span>
                          ) : (
                            <span style={{
                              padding: '3px 9px',
                              borderRadius: '100px',
                              background: '#f1f5f9',
                              color: '#64748b',
                              fontSize: '0.70rem',
                              fontWeight: 700
                            }}>
                              Mitglied
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Notice */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #f1f5f9',
              background: '#fafbfc',
              borderRadius: '0 0 28px 28px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.72rem',
              color: '#64748b',
              fontWeight: 600
            }}>
              <ShieldCheck size={14} color="#15803d" style={{ flexShrink: 0 }} />
              <span>Didaktischer Schul-Chat: Nur für Unterrichtszwecke • Für Erziehungsberechtigte transparent einsehbar.</span>
            </div>
          </div>
        </div>
      )}

      {/* 🚩 2-Stufen Melde-Modal für Gruppen-Chats (F49) */}
      {reportingMessage && (
        <div 
          onClick={() => setReportingMessage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '380px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444'
              }}>
                <Flag size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 850, fontSize: '0.98rem', color: '#0f172a' }}>Nachricht melden</div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Vertraulich an deine Lehrkraft</div>
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '10px 12px',
              fontSize: '0.78rem',
              color: '#334155',
              fontStyle: 'italic',
              lineHeight: 1.4,
              maxHeight: '70px',
              overflowY: 'auto'
            }}>
              „{String(reportingMessage.content || '').slice(0, 140)}“
            </div>

            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
              Bitte wähle den Grund aus. Deine Lehrkraft wird diesen Abschnitt vertraulich überprüfen:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleConfirmReport('Beleidigung / Unhöflich')}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#b91c1c',
                  fontWeight: 750,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                🚨 Beleidigung oder unhöflich
              </button>

              <button
                type="button"
                onClick={() => handleConfirmReport('Streit / Spam')}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid #fed7aa',
                  background: '#fff7ed',
                  color: '#c2410c',
                  fontWeight: 750,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                ⚠️ Streit oder Spam
              </button>

              <button
                type="button"
                onClick={() => setReportingMessage(null)}
                style={{
                  padding: '9px 14px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#64748b',
                  fontWeight: 650,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔔 Feedback Toast */}
      {reportToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1300,
          background: '#0f172a',
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: '100px',
          fontSize: '0.82rem',
          fontWeight: 700,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCheck size={16} color="#34a853" />
          <span>{reportToast}</span>
        </div>
      )}

    </div>
  );
}

export default CampusDirectMessages;

