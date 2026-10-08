import React from 'react';
import { Calendar, Clock, DoorClosed, MessageSquare, Check, X } from 'lucide-react';
import { formatGermanDate, formatGermanWeekday } from '../../../utils/formatters';
import { formatTeacherFullName } from '../../../utils/nameHelper';

export interface QrLessonAppointmentCardProps {
  occurrence?: any;
  lesson?: any;
  teacherName?: string;
  subjectName?: string;
  roomName?: string;
  isToday?: boolean;
  hasMessages?: boolean;
  onOpenDecision?: () => void;
  onOpenChat?: () => void;
  // 🏛️ 0,1% Goldstandard: Listen- & Absage-Governance
  onCancelRequest?: () => void;
  isCancelPending?: boolean;
  onConfirmCancel?: () => void;
  onDismissCancel?: () => void;
  onUndoCancel?: () => void;
  needsAcknowledge?: boolean;
  onAcknowledge?: () => void;
}

/**
 * 🏛️ Campus-Groovelab QR Lesson Appointment Card
 * 0.1% Enterprise Goldstandard / Autarker Satellit
 * 1:1 Design- & Ergonomie-Parität mit dem Termine-Board (CampusEventsBoard)
 * Bounded Context: Student Campus Schedule & Rescheduling Governance
 * Standards: OWASP ASVS Level 3 / BFSG 2025 / WCAG 2.2 AA / Zero Color-Clash Doktrin
 */
export const QrLessonAppointmentCard: React.FC<QrLessonAppointmentCardProps> = ({
  occurrence: occ,
  lesson,
  teacherName: passedTeacherName,
  subjectName: passedSubjectName,
  roomName: passedRoomName,
  isToday = false,
  hasMessages = false,
  onOpenDecision,
  onOpenChat,
  onCancelRequest,
  isCancelPending = false,
  onConfirmCancel,
  onDismissCancel,
  onUndoCancel,
  needsAcknowledge = false,
  onAcknowledge
}) => {
  // Resolve effective date & times
  const effectiveDateStr = occ?.date || lesson?.date || (isToday ? new Date().toISOString().substring(0, 10) : '');
  const startTime = (occ?.start_time || lesson?.start_time || lesson?.time_slot || '').substring(0, 5);
  const duration = occ?.duration || lesson?.duration || 30;

  // Resolve Names & Hierarchy (0,1% Goldstandard SSOT)
  const teacherObj = occ?.teacher || lesson?.teacher || (lesson?.schedule && lesson?.schedule.teacher) || (occ?.schedule && occ?.schedule.teacher);
  const resolvedTeacherName = passedTeacherName || 
    (teacherObj ? formatTeacherFullName(teacherObj) : '') ||
    (occ?.teacher_name || lesson?.teacher_name || 'Lehrkraft');

  const resolvedSubject = passedSubjectName || 
    occ?.instrument || occ?.subject || 
    lesson?.instrument || lesson?.subject || '';

  const resolvedRoom = passedRoomName || 
    occ?.room_override_name || occ?.room_name || occ?.room?.name || occ?.schedule?.room?.name || 
    lesson?.room_name || lesson?.room?.name || lesson?.schedule?.room?.name || '';

  // Status checks (Identisch mit CampusEventsBoard)
  const isCanceled = Boolean(
    ['cancelled', 'teacher_ausfall', 'canceled_by_student', 'canceled_by_teacher_ausfall'].includes(occ?.status) ||
    lesson?.isCancelled ||
    occ?.is_cancelled
  );

  const isConfirmedOcc = Boolean(
    occ?.student_acknowledged === true || 
    occ?.status === 'rescheduled_confirmed'
  );

  const isTimeShifted = Boolean(
    (occ?.original_start_time && occ?.start_time && occ.original_start_time.substring(0, 5) !== occ.start_time.substring(0, 5)) ||
    (occ?.schedule?.time_slot && occ?.start_time && occ.schedule.time_slot.substring(0, 5) !== occ.start_time.substring(0, 5))
  );
  const isDateShifted = Boolean(occ?.original_date && occ.original_date !== occ.date);
  const isRoomShifted = Boolean(occ?.room_override_id || occ?.room_override_name);

  const isRescheduled = Boolean(
    occ?.status === 'pending_reschedule' || 
    occ?.status === 'rescheduled' || 
    occ?.status === 'rescheduled_confirmed' ||
    lesson?.isRescheduled ||
    isTimeShifted || 
    isDateShifted || 
    isRoomShifted
  );

  const isPendingProposal = Boolean(isRescheduled && !isConfirmedOcc);

  const isPendingReview = Boolean(
    (occ?.schedule?.status === 'ready_for_admin_review' || lesson?.schedule?.status === 'ready_for_admin_review') && !resolvedRoom
  );

  // Dynamic styling matching CampusEventsBoard 0.1% Goldstandard
  let textColor = '#1e293b';
  let subColor = '#64748b';
  let dateBlockBg = '#f1f5f9';
  let rowBg = '#ffffff';
  let rowBorder = '1px solid #e2e8f0';
  let dateBlockBorder = '1px solid rgba(0, 0, 0, 0.06)';

  if (isCanceled) {
    textColor = '#991b1b';
    subColor = '#dc2626';
    dateBlockBg = '#fee2e2';
    rowBg = 'repeating-linear-gradient(-45deg, #fef2f2 0px, #fef2f2 8px, #ffffff 8px, #ffffff 16px)';
    rowBorder = '1.5px solid #fca5a5';
    dateBlockBorder = '1.5px solid #fca5a5';
  } else if (isRescheduled) {
    if (isConfirmedOcc) {
      // 🏛️ 0,1% Goldstandard: Wenn bestätigt, reinweiße Campus-Karte mit feinem durchgezogenem GrooveLab-Gelb-Rand (Outline-Stil)
      textColor = '#0f172a';
      subColor = '#64748b';
      dateBlockBg = '#f8fafc';
      dateBlockBorder = '1px solid rgba(0, 0, 0, 0.05)';
      rowBg = '#ffffff';
      rowBorder = '1.5px solid #eab308';
    } else {
      // Handlungsbedarf (Schüler-Entscheidung ausstehend): Amber Call-to-Action Raster
      textColor = '#854d0e';
      subColor = '#d97706';
      dateBlockBg = '#fef3c7';
      rowBg = 'repeating-linear-gradient(-45deg, #fefce8 0px, #fefce8 8px, #ffffff 8px, #ffffff 16px)';
      rowBorder = '2px dashed #eab308';
      dateBlockBorder = '1.5px dashed #eab308';
    }
  }

  const isInteractive = Boolean(isPendingProposal && onOpenDecision);

  return (
    <div 
      onClick={() => {
        if (isInteractive && onOpenDecision) {
          onOpenDecision();
        }
      }}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={isPendingProposal ? `Terminvorschlag für ${resolvedTeacherName} prüfen` : undefined}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && isInteractive && onOpenDecision) {
          e.preventDefault();
          onOpenDecision();
        }
      }}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px',
        borderRadius: '14px',
        background: rowBg,
        border: rowBorder,
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
        transition: 'all 0.2s ease',
        gap: '12px',
        boxSizing: 'border-box',
        cursor: isInteractive ? 'pointer' : 'default',
        width: '100%',
        maxWidth: '100%'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
        {/* Ergonomic Date Block (48x48px for glanceability on music stands and smartphones) */}
        {effectiveDateStr ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: dateBlockBg,
            borderRadius: '12px',
            padding: '3px',
            width: '48px',
            height: '48px',
            border: dateBlockBorder,
            flexShrink: 0
          }}>
            <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: subColor, letterSpacing: '0.04em' }}>
              {formatGermanWeekday(effectiveDateStr)}
            </span>
            <span style={{ fontSize: '17px', fontWeight: 900, color: textColor, marginTop: '-1px', lineHeight: 1 }}>
              {effectiveDateStr.substring(8, 10)}
            </span>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: dateBlockBg,
            borderRadius: '12px',
            width: '48px',
            height: '48px',
            border: dateBlockBorder,
            flexShrink: 0
          }}>
            <Calendar size={20} color={subColor} />
          </div>
        )}

        {/* Details (0.1% Goldstandard 3-Tier Hierarchy: Name -> Subject/Room -> Time) */}
        <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {/* Row 1: Primary Entity Name (Full Width, 100% Legibility) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexWrap: 'wrap' }}>
            <span style={{ 
              fontSize: '15px', 
              fontWeight: 800, 
              color: textColor, 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              lineHeight: 1.25
            }}>
              {resolvedTeacherName}
            </span>
            {isRescheduled && (
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                background: isConfirmedOcc ? '#fefce8' : '#fefce8',
                color: '#b45309',
                border: isConfirmedOcc ? '1px solid #eab308' : '1.5px dashed #eab308',
                padding: '1px 6px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                flexShrink: 0
              }}>
                {isConfirmedOcc && <Check size={10} strokeWidth={2.8} />}
                <span>{isConfirmedOcc ? 'Bestätigt' : 'Vorschlag'}</span>
              </span>
            )}
            {isCanceled && (
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                background: '#fee2e2',
                color: '#991b1b',
                border: '1.5px solid #ef4444',
                padding: '1px 6px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                flexShrink: 0
              }}>
                Entfällt
              </span>
            )}
            {isPendingReview && (
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                background: '#fffbeb',
                color: '#b45309',
                border: '1px solid #fef3c7',
                padding: '1px 6px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                flexShrink: 0
              }}>
                ⏳ In Prüfung
              </span>
            )}
          </div>

          {/* Row 2: Didactic Context (Subject Badge) & Room */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            {resolvedSubject && (
              <span style={{ 
                fontSize: '12px', 
                fontWeight: 800, 
                color: isCanceled ? subColor : '#15803d',
                background: isCanceled ? '#f1f5f9' : 'rgba(52, 168, 83, 0.08)',
                border: `1px solid ${isCanceled ? '#e2e8f0' : 'rgba(52, 168, 83, 0.25)'}`,
                padding: '1px 7px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                lineHeight: '16px'
              }}>
                {resolvedSubject}
              </span>
            )}

            {resolvedRoom && resolvedRoom !== 'Raum' && (
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#64748b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}>
                <DoorClosed size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
                {resolvedRoom}
              </span>
            )}
          </div>

          {/* Row 3: Time & Duration */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.80rem', color: subColor, fontWeight: 700, flexWrap: 'wrap' }}>
            {isRescheduled && occ?.original_date && occ.original_date !== occ.date && (
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isConfirmedOcc ? '#64748b' : '#b45309' }}>
                  <Calendar size={13} /> (Statt {formatGermanDate(occ.original_date)})
                </span>
                <span>•</span>
              </>
            )}
            {startTime && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Clock size={13} /> {startTime} Uhr
              </span>
            )}
            {startTime && duration && <span>•</span>}
            {duration ? <span>{duration} Min</span> : null}
          </div>
        </div>
      </div>

      {/* Right Status / Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {/* Bestätigung ausstehend (Acknowledge) */}
        {needsAcknowledge && onAcknowledge && !isPendingProposal && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAcknowledge();
            }}
            style={{
              background: '#34a853',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              boxShadow: 'none'
            }}
            title="Änderung als gelesen markieren"
            aria-label="Änderung als gelesen markieren"
          >
            <Check size={13} strokeWidth={2.5} /> Gelesen
          </button>
        )}

        {/* 1:1 Shoutbox Icon */}
        {onOpenChat && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenChat();
            }}
            title="1:1 Shoutbox öffnen"
            aria-label="1:1 Shoutbox öffnen"
            style={{
              border: hasMessages ? '1px solid #fde047' : '1px solid #f1f5f9',
              background: hasMessages ? '#fefce8' : '#f8fafc',
              width: '38px',
              height: '38px',
              padding: '0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: hasMessages ? '#ca8a04' : '#64748b',
              transition: 'all 0.2s',
              borderRadius: '11px',
              flexShrink: 0,
              boxShadow: hasMessages ? '0 1px 4px rgba(202, 138, 4, 0.15)' : 'none'
            }}
          >
            <MessageSquare 
              size={17} 
              color={hasMessages ? '#ca8a04' : '#64748b'}
              fill={hasMessages ? '#eab308' : 'none'} 
            />
          </button>
        )}

        {/* Prüfen Button für Schüler bei vorgeschlagener Terminverschiebung */}
        {isPendingProposal && onOpenDecision && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDecision();
            }}
            title="Terminvorschlag prüfen (Bestätigen oder Ablehnen)"
            aria-label="Terminvorschlag prüfen"
            style={{
              background: '#fef3c7',
              color: '#b45309',
              border: 'none',
              padding: '0 10px',
              height: '38px',
              borderRadius: '11px',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              flexShrink: 0,
              boxShadow: 'none'
            }}
          >
            <Calendar size={14} color="#b45309" strokeWidth={2.4} />
            <span>Prüfen</span>
          </button>
        )}

        {/* Reaktivieren Button für vom Schüler abgesagte Termine */}
        {isCanceled && occ?.status === 'canceled_by_student' && onUndoCancel && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUndoCancel();
            }}
            style={{
              background: '#ffffff',
              color: '#dc2626',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '5px 9px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              boxShadow: 'none'
            }}
            title="Absage rückgängig machen"
            aria-label="Terminabsage rückgängig machen"
          >
            Reaktivieren
          </button>
        )}

        {/* Absagen Actions wenn nicht storniert und kein offener Vorschlag */}
        {!isCanceled && !isPendingProposal && onCancelRequest && (
          isCancelPending ? (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirmCancel?.();
                }}
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '5px 9px',
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: 'none'
                }}
                title="Termin verbindlich absagen"
                aria-label="Terminabsage verbindlich bestätigen"
              >
                Ja, absagen
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismissCancel?.();
                }}
                style={{
                  background: '#e2e8f0',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '5px 9px',
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
                title="Absage abbrechen"
                aria-label="Absage abbrechen"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancelRequest();
              }}
              style={{
                background: '#f8fafc',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '5px 9px',
                fontSize: '0.72rem',
                fontWeight: 750,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
              title="Unterrichtstermin absagen"
              aria-label="Unterrichtstermin absagen"
            >
              <X size={12} /> Absagen
            </button>
          )
        )}
      </div>
    </div>
  );
};
