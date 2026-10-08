import React from 'react';
import { 
  CheckCheck, 
  GraduationCap, 
  ShieldCheck, 
  Calendar, 
  Flag,
  Pin,
  MessageSquare
} from 'lucide-react';
import { CampusDynamicAvatar } from '../CampusDirectMessages';
import { CompactAppointmentEventCard } from './CompactAppointmentEventCard';
import { cleanChatMessageContent } from '../../utils/chatRespectGuard';
import { formatStudentDisplayName, formatTeacherFullName } from '../../utils/nameHelper';

/**
 * 🛡️ Helper to determine if a message is an automated/system event
 */
export const isChatMessageSystem = (msg: any): boolean => {
  if (!msg) return false;
  if (msg.is_system || msg.message_type === 'reschedule_notification' || msg.message_type === 'cancellation_reset' || msg.message_type === 'system') return true;
  const content = String(msg.content || '').trim();
  const lower = content.toLowerCase();

  return (
    lower.includes('termin reaktiviert') ||
    lower.includes('reaktiviert') ||
    lower.includes('termin abgesagt') ||
    lower.includes('fällt aus') ||
    lower.includes('abgesagt') ||
    lower.includes('storniert') ||
    lower.includes('wurde abgesagt') ||
    lower.includes('termin wurde verschoben') ||
    lower.includes('termin wurde auf den regulären') ||
    lower.includes('termin zurückgesetzt') ||
    lower.includes('stamm-termin zurückgesetzt') ||
    lower.includes('ausfall wurde zurückgenommen') ||
    lower.includes('ausfall für diesen termin wurde zurückgenommen') ||
    content.includes('❌') ||
    content.includes('🔄') ||
    lower.includes('unterrichtstermin bestätigt') ||
    lower.includes('termin bestätigt') ||
    lower.includes('terminbestätigung') ||
    lower.includes('verschiebung abgelehnt') ||
    lower.includes('bitte bestätige den neuen termin') ||
    lower.includes('bitte bestätige, dass du dies gesehen hast') ||
    (content.includes('->') && (lower.includes('uhr') || lower.includes('termin')))
  );
};

export interface CampusUnifiedChatMessageProps {
  msg: any;
  prevMsg?: any | null;
  currentUserId: string;
  currentUserRole?: string;
  senderUser?: any;
  isGroup?: boolean;
  isMobile?: boolean;
  onSendMessage?: (recipientId: string, content: string) => Promise<any>;
  onNavigateToSchedule?: (dateStr?: string) => void;
  onInitiateReport?: (msg: any) => void;
  customGradient?: { bg: string; text: string };
  pedagogicalBanner?: React.ReactNode;
  currentOcc?: any;
  isSuperseded?: boolean;
  appointmentContextLabel?: string | null;
  replyCount?: number;
  onOpenTopicThread?: (topicId: string) => void;
}

/**
 * 🏛️ CampusUnifiedChatMessage
 * 0.1% WhatsApp Goldstandard Chat Bubble Component (SSOT)
 * Standardizes avatar, sender name, badges, bubble geometry, time format and read receipts across the entire platform.
 */
export const CampusUnifiedChatMessage: React.FC<CampusUnifiedChatMessageProps> = ({
  msg,
  prevMsg,
  currentUserId,
  currentUserRole,
  senderUser,
  isGroup = false,
  isMobile = false,
  onSendMessage,
  onNavigateToSchedule,
  onInitiateReport,
  customGradient,
  pedagogicalBanner,
  currentOcc,
  isSuperseded = false,
  appointmentContextLabel,
  replyCount,
  onOpenTopicThread
}) => {
  const isSelf = msg.sender_id === currentUserId;
  const isSys = isChatMessageSystem(msg);
  const isPrevSys = prevMsg ? isChatMessageSystem(prevMsg) : false;

  const msgDate = new Date(msg.created_at);
  const prevMsgDate = prevMsg ? new Date(prevMsg.created_at) : null;

  const isNewDay = !prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString();
  const isContinuation = Boolean(
    prevMsg &&
    !isNewDay &&
    !isSys &&
    !isPrevSys &&
    prevMsg.sender_id === msg.sender_id &&
    (msgDate.getTime() - prevMsgDate.getTime() < 5 * 60 * 1000)
  );

  // Natural Date Separator formatting
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

  // 1. System Notification Event Pill
  if (isSys) {
    return (
      <React.Fragment>
        {pedagogicalBanner}
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
        <CompactAppointmentEventCard
          msg={msg}
          selectedRecipient={senderUser}
          onSendMessage={onSendMessage}
          isSuperseded={isSuperseded}
          currentOcc={currentOcc}
          onNavigateToSchedule={onNavigateToSchedule}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          isSender={isSelf}
        />
      </React.Fragment>
    );
  }

  // 2. Regular Chat Message
  const timeStr = msgDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  const role = (senderUser?.role || '').toLowerCase();
  const roles = Array.isArray(senderUser?.roles) ? senderUser.roles.map((r: any) => String(r).toLowerCase()) : [];
  const isSenderTeacher = role === 'teacher' || roles.includes('teacher');
  const isParentSender = msg.sender_role === 'parent';

  // Resolved display name for sender
  const resolvedSenderName = isSenderTeacher
    ? formatTeacherFullName(senderUser?.first_name || '', senderUser?.last_name || '') || formatStudentDisplayName(senderUser)
    : formatStudentDisplayName(senderUser);

  // Content sanitization & fail-closed masking
  const rawContent = String(msg.content || '');
  const cleanContent = rawContent.startsWith('enc:')
    ? '[Verschlüsselte Nachricht]'
    : cleanChatMessageContent(rawContent);

  // 🛡️ 0.1% Goldstandard: Topic & Subject extraction
  const fallbackTopicMatch = rawContent.match(/^📌\s*\[(.*?)\]/);
  const topicSubject = msg.subject || (fallbackTopicMatch ? fallbackTopicMatch[1] : null);
  const isTopicMessage = Boolean(topicSubject || msg.message_type === 'topic');
  const displayContent = cleanContent.replace(/^📌\s*\[(.*?)\]\s*/, '');

  return (
    <React.Fragment>
      {pedagogicalBanner}

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
            <CampusDynamicAvatar
              user={{ ...senderUser, sender_role: msg.sender_role }}
              size={32}
              style={{ marginBottom: '2px' }}
              customGradient={customGradient}
            />
          ) : (
            <div style={{ width: '32px', flexShrink: 0 }} />
          )
        )}

        {/* Chat Bubble Column */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: isSelf ? 'flex-end' : 'flex-start',
            maxWidth: isMobile ? '82%' : '68%'
          }}
        >
          {/* Sender Name & Role Badges above incoming bubble */}
          {!isSelf && (!isContinuation || (isParentSender && prevMsg?.sender_role !== 'parent')) && (
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: isSenderTeacher ? '#15803d' : (isParentSender ? '#1d4ed8' : '#475569'),
                marginBottom: '3px',
                marginLeft: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{resolvedSenderName}</span>
              {isSenderTeacher && (
                <span
                  style={{
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
                  }}
                >
                  <GraduationCap size={10} color="#15803d" strokeWidth={2.4} />
                  <span>Lehrkraft</span>
                </span>
              )}
              {isParentSender && (
                <span
                  style={{
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
                  }}
                >
                  <ShieldCheck size={11} color="#1d4ed8" strokeWidth={2.5} />
                  <span>Eltern</span>
                </span>
              )}
            </div>
          )}

          {/* Optional Parent Sender Badge for outgoing messages */}
          {isSelf && isParentSender && (!isContinuation || prevMsg?.sender_role !== 'parent') && (
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#1d4ed8',
                marginBottom: '3px',
                marginRight: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span
                style={{
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
                }}
              >
                <ShieldCheck size={11} color="#1d4ed8" strokeWidth={2.5} />
                <span>Eltern</span>
              </span>
            </div>
          )}

          {/* Appointment context tag pill if provided */}
          {appointmentContextLabel && !isContinuation && (
            <div
              style={{
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
              }}
            >
              <Calendar size={10} color="#15803d" />
              <span>{appointmentContextLabel}</span>
            </div>
          )}

          {/* Chat Bubble with 100% WhatsApp geometry standard */}
          <div
            style={{
              padding: '11px 16px 8px 16px',
              borderRadius: isSelf
                ? (isContinuation ? '18px 6px 6px 18px' : '18px 18px 4px 18px')
                : (isContinuation ? '6px 18px 18px 6px' : '18px 18px 18px 4px'),
              background: isSelf
                ? 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)'
                : '#ffffff',
              color: isSelf ? '#ffffff' : '#0f172a',
              boxShadow: isSelf
                ? '0 2px 8px rgba(21, 128, 61, 0.22)'
                : '0 2px 6px rgba(0,0,0,0.04)',
              border: isSelf ? 'none' : '1px solid #e2e8f0',
              fontSize: '0.95rem',
              lineHeight: '1.45',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap'
            }}
          >
            {isTopicMessage && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                  color: isSelf ? '#bbf7d0' : '#15803d',
                  marginBottom: '4px',
                  textTransform: 'uppercase'
                }}
              >
                <Pin size={11} strokeWidth={2.4} />
                <span>Thema{topicSubject ? `: ${topicSubject}` : ''}</span>
              </div>
            )}
            <div>{displayContent}</div>

            {/* Optional Topic Reply Count Pill */}
            {Boolean(replyCount && replyCount > 0) && (
              <div style={{ marginTop: '8px', marginBottom: '2px' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTopicThread?.(msg.id);
                  }}
                  aria-label={`${replyCount} Antworten im Thema ansehen`}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    background: isSelf ? 'rgba(255, 255, 255, 0.2)' : '#f0fdf4',
                    border: isSelf ? '1px solid rgba(255, 255, 255, 0.35)' : '1px solid #bbf7d0',
                    color: isSelf ? '#ffffff' : '#15803d',
                    fontSize: '0.74rem',
                    fontWeight: 750,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: 'none'
                  }}
                >
                  <MessageSquare size={12} strokeWidth={2.4} />
                  <span>{replyCount} {replyCount === 1 ? 'Antwort' : 'Antworten'} • In Themen ansehen →</span>
                </button>
              </div>
            )}

            {/* Time & Read Status metadata inside the bubble */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '4px',
                fontSize: '0.72rem',
                fontWeight: 650,
                color: isSelf ? 'rgba(255, 255, 255, 0.85)' : '#64748b',
                marginTop: '6px',
                lineHeight: 1
              }}
            >
              <span>{timeStr}</span>
              {isSelf && (
                <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <CheckCheck size={14} color="#ffffff" style={{ opacity: msg.is_read ? 1 : 0.75 }} />
                </div>
              )}
              {isGroup && !isSelf && onInitiateReport && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInitiateReport(msg);
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
};

export default CampusUnifiedChatMessage;
